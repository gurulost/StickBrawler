import type { PlayerSlot } from "../hooks/use-player-controls";

export type Direction = "neutral" | "forward" | "back" | "left" | "right" | "up" | "down";

export interface IntentContext {
  grounded: boolean;
  facing: 1 | -1;
  airborne: boolean;
  velocity: [number, number, number];
  allowTech?: boolean;
}

export interface PressStyle {
  heldMs: number;
  tapped: boolean;
  heavy: boolean;
  charged: boolean;
  flickedDir?: Direction;
  justPressed: boolean;
}

export interface AttackIntent {
  kind: "attack";
  dir: Direction;
  airborne: boolean;
  press: PressStyle;
}

export interface SpecialIntent {
  kind: "special";
  dir: Direction;
  airborne: boolean;
  press: PressStyle;
}

export interface DefendIntent {
  kind: "defend";
  mode: "guard" | "roll" | "parry" | "tech" | "grab";
  dir?: Direction;
  press: PressStyle;
}

export interface JumpIntent {
  kind: "jump";
  shortHopCandidate: boolean;
  justPressed: boolean;
}

export interface DashIntent {
  kind: "dash";
  dir: "left" | "right";
}

export interface PlayerIntentFrame {
  attack?: AttackIntent;
  special?: SpecialIntent;
  defend: DefendIntent[];
  jump?: JumpIntent;
  dash?: DashIntent;
  direction: Direction;
}

export type DualPlayerIntentFrame = Record<PlayerSlot, PlayerIntentFrame>;
