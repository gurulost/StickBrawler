import { z } from "zod";
import { storage } from "./storage";

const telemetrySourceSchema = z.enum(["player", "cpu"]);
const telemetrySlotSchema = z.enum(["player1", "player2", "cpu"]);

export const hitTelemetrySchema = z.object({
  type: z.literal("hit"),
  source: z.enum(["player", "cpu"]),
  slot: z.enum(["player1", "player2", "cpu"]),
  comboCount: z.number().int().nonnegative(),
  timestamp: z.number().nonnegative(),
  hit: z.object({
    moveId: z.string(),
    hitboxId: z.string(),
    damage: z.number(),
    guardDamage: z.number(),
    knockbackVector: z.tuple([z.number(), z.number(), z.number()]),
    hitLag: z.number(),
    causesTrip: z.boolean(),
    isCounterHit: z.boolean(),
    launchAngleDeg: z.number(),
    attackerAction: z.string(),
    defenderAction: z.string(),
  }),
});

export const techTelemetrySchema = z.object({
  type: z.literal("tech"),
  source: telemetrySourceSchema,
  slot: telemetrySlotSchema,
  result: z.enum(["success", "fail"]),
  landingLag: z.number().nonnegative(),
  timestamp: z.number().nonnegative(),
});

export const inputTelemetrySchema = z.object({
  type: z.literal("input"),
  source: telemetrySourceSchema,
  slot: telemetrySlotSchema,
  direction: z.enum(["neutral", "forward", "back", "left", "right", "up", "down"]),
  attackStrength: z.enum(["light", "medium", "heavy", "power"]).optional(),
  attackAltitude: z.enum(["ground", "air"]).optional(),
  specialSlot: z.enum(["neutral", "forward", "back", "up", "down"]).optional(),
  specialAltitude: z.enum(["ground", "air"]).optional(),
  defendModes: z.array(z.string()),
  moveId: z.string().optional(),
  grounded: z.boolean(),
  timestamp: z.number().nonnegative(),
});

export const combatTelemetrySchema = z.discriminatedUnion("type", [
  hitTelemetrySchema,
  techTelemetrySchema,
  inputTelemetrySchema,
]);

export type CombatTelemetryEntry = z.infer<typeof combatTelemetrySchema>;

const buffer: CombatTelemetryEntry[] = [];
const MAX_ENTRIES = 1024;
const FLUSH_INTERVAL_MS = 30000; // Flush to database every 30 seconds

export function storeTelemetry(entries: CombatTelemetryEntry[]) {
  for (const entry of entries) {
    buffer.push(entry);
    if (buffer.length > MAX_ENTRIES) {
      buffer.shift();
    }
  }
}

export function drainTelemetryBuffer() {
  const copy = buffer.splice(0, buffer.length);
  return copy;
}

export function peekTelemetryBuffer() {
  return [...buffer];
}

export function summarizeTelemetry() {
  const snapshot = peekTelemetryBuffer();
  const init = () => ({
    hits: 0,
    totalDamage: 0,
    maxCombo: 0,
    lastTimestamp: 0,
  });
  const summary: Record<"player1" | "player2" | "cpu", ReturnType<typeof init>> = {
    player1: init(),
    player2: init(),
    cpu: init(),
  };
  for (const entry of snapshot) {
    if (entry.type !== "hit") continue;
    const target = summary[entry.slot];
    if (!target) continue;
    target.hits += 1;
    target.totalDamage += entry.hit.damage;
    target.maxCombo = Math.max(target.maxCombo, entry.comboCount);
    target.lastTimestamp = Math.max(target.lastTimestamp, entry.timestamp);
  }
  return summary;
}

let consecutiveFlushFailures = 0;
const MAX_FLUSH_RETRIES = 3;

async function flushTelemetryToDatabase() {
  const entries = drainTelemetryBuffer();
  if (entries.length === 0) return;

  try {
    await storage.saveTelemetryBatch(
      entries.map(entry => ({
        slot: entry.slot,
        timestamp: entry.timestamp,
        comboCount: entry.type === "hit" ? entry.comboCount : 0,
        data: entry,
      }))
    );
    consecutiveFlushFailures = 0;
  } catch (error) {
    consecutiveFlushFailures++;
    console.error(`[telemetry] Failed to flush ${entries.length} entries to database (failure ${consecutiveFlushFailures}/${MAX_FLUSH_RETRIES}):`, error);
    
    // Only re-add entries if we haven't exceeded retry limit
    // This prevents infinite loops when DB is down
    if (consecutiveFlushFailures < MAX_FLUSH_RETRIES) {
      for (const entry of entries) {
        storeTelemetry([entry]);
      }
    } else {
      console.error(`[telemetry] Dropping ${entries.length} entries after ${MAX_FLUSH_RETRIES} consecutive failures`);
    }
  }
}

// Start periodic flush without pinning the Node process in tests.
const telemetryFlushInterval = setInterval(flushTelemetryToDatabase, FLUSH_INTERVAL_MS);
telemetryFlushInterval.unref?.();
