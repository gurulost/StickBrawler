import type { FighterActionState, MovePhase } from "../combat/types";
import type { FighterId } from "../combat/moveTable";

export type FighterRuntimeSlot = "player" | "cpu";
export type PresentationMovePhase = MovePhase | "none";

export interface FighterPresentationSnapshot {
  slot: FighterRuntimeSlot;
  fighterId: FighterId;
  health: number;
  position: [number, number, number];
  velocity: [number, number, number];
  facing: 1 | -1;
  grounded: boolean;
  inAir: boolean;
  action: FighterActionState;
  moveId?: string;
  moveInstanceId?: number;
  moveFrame: number;
  movePhase: PresentationMovePhase;
  hitLagFrames: number;
  hitstunFrames: number;
  blockstunFrames: number;
  landingLagFrames: number;
  invulnerable: boolean;
  armored: boolean;
  canAct: boolean;
  guardBroken: boolean;
  guardMeter: number;
  staminaMeter: number;
  specialMeter: number;
  comboCounter: number;
  comboTimer: number;
  attackCooldown: number;
  dodgeCooldown: number;
  grabCooldown: number;
  moveCooldown: number;
  isBlocking: boolean;
  isDodging: boolean;
  isGrabbing: boolean;
  isTaunting: boolean;
  isAirAttacking: boolean;
  airJumpsLeft: number;
  lastStartedMoveId?: string;
  lastConfirmedMoveId?: string;
  justStartedMove?: boolean;
  justLanded?: boolean;
  justHit?: boolean;
  justBlocked?: boolean;
  justParried?: boolean;
  justGuardBroke?: boolean;
}

export type CombatEvent =
  | {
      id: number;
      type: "moveStart";
      slot: FighterRuntimeSlot;
      moveId: string;
      moveInstanceId: number;
    }
  | {
      id: number;
      type: "moveEnd";
      slot: FighterRuntimeSlot;
      moveId: string;
      moveInstanceId?: number;
      reason: "complete" | "cancel" | "interrupted";
    }
  | {
      id: number;
      type: "hit";
      attacker: FighterRuntimeSlot;
      defender: FighterRuntimeSlot;
      moveId: string;
      moveInstanceId?: number;
      hitboxId: string;
      blocked: boolean;
      damage: number;
      impact: number;
    }
  | {
      id: number;
      type: "land";
      slot: FighterRuntimeSlot;
      intensity: number;
    }
  | {
      id: number;
      type: "guardBreak";
      slot: FighterRuntimeSlot;
    }
  | {
      id: number;
      type: "tech";
      slot: FighterRuntimeSlot;
      result: "success" | "fail";
    };

export interface RuntimeFrameSnapshot {
  player: FighterPresentationSnapshot;
  cpu: FighterPresentationSnapshot;
  roundTimeRemaining: number;
  maxRoundTime: number;
}
