import { z } from "zod";

export const hitTelemetrySchema = z.object({
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

const buffer: z.infer<typeof hitTelemetrySchema>[] = [];
const MAX_ENTRIES = 1024;

export function storeTelemetry(entries: z.infer<typeof hitTelemetrySchema>[]) {
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
    const target = summary[entry.slot];
    if (!target) continue;
    target.hits += 1;
    target.totalDamage += entry.hit.damage;
    target.maxCombo = Math.max(target.maxCombo, entry.comboCount);
    target.lastTimestamp = Math.max(target.lastTimestamp, entry.timestamp);
  }
  return summary;
}
