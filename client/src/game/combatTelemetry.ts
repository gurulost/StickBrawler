import type { HitResolution } from "../combat";

export type TelemetrySource = "player" | "cpu";
export type TelemetrySlot = "player1" | "player2" | "cpu";

export type CombatTelemetryEvent =
  | {
      type: "hit";
      source: TelemetrySource;
      slot: TelemetrySlot;
      hit: HitResolution;
      comboCount: number;
      timestamp: number;
    }
  | {
      type: "tech";
      source: TelemetrySource;
      slot: TelemetrySlot;
      result: "success" | "fail";
      landingLag: number;
      timestamp: number;
    };

const buffer: CombatTelemetryEvent[] = [];
const MAX_BUFFER = 256;

export function recordTelemetry(entry: CombatTelemetryEvent) {
  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) {
    buffer.shift();
  }
}

export function drainTelemetry(): CombatTelemetryEvent[] {
  return buffer.splice(0, buffer.length);
}

export function peekTelemetry() {
  return [...buffer];
}
