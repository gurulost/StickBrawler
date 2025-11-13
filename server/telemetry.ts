import { z } from "zod";

export const hitTelemetrySchema = z.object({
  source: z.enum(["player", "cpu"]),
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
