import type { HitResolution } from "../combat";

export type TelemetrySource = "player" | "cpu";

export interface HitTelemetry {
  source: TelemetrySource;
  hit: HitResolution;
  comboCount: number;
  timestamp: number;
}

const buffer: HitTelemetry[] = [];
const MAX_BUFFER = 256;

export function recordTelemetry(entry: HitTelemetry) {
  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) {
    buffer.shift();
  }
}

export function drainTelemetry(): HitTelemetry[] {
  return buffer.splice(0, buffer.length);
}

export function peekTelemetry() {
  return [...buffer];
}
