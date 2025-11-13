import { clamp } from "../lib/clamp";
import type {
  FighterCombatState,
  MoveContext,
  MoveDefinition,
  MovePhase,
} from "./types";

const FRAME_EPSILON = 0.0001;
const STAMINA_REGEN = 0.9;
const GUARD_REGEN = 0.7;
const SPECIAL_REGEN = 0.35;

export interface StateMachineConfig {
  guardMeterMax: number;
  staminaMax: number;
  specialMax: number;
}

const defaultConfig: StateMachineConfig = {
  guardMeterMax: 100,
  staminaMax: 100,
  specialMax: 100,
};

export class CombatStateMachine {
  private readonly config: StateMachineConfig;

  constructor(config: Partial<StateMachineConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  update(ctx: MoveContext): FighterCombatState {
    let nextState = structuredClone(ctx.state);

    if (nextState.hitstunFrames > 0) {
      nextState.hitstunFrames -= ctx.delta;
      nextState.action = "hitstun";
      nextState = this.passiveRegen(nextState, ctx);
      return this.applyMeters(nextState);
    }

    if (ctx.inputs.dodge && nextState.guardMeter > 10) {
      nextState = this.enterDodge(nextState);
      return this.applyMeters(nextState);
    }

    if (nextState.moveId) {
      nextState = this.advanceMoveFrame(nextState, ctx);
      nextState = this.passiveRegen(nextState, ctx);
      return this.applyMeters(nextState);
    }

    const requestedMove = this.findMoveToStart(ctx);
    if (requestedMove) {
      nextState = this.startMove(nextState, requestedMove);
      return this.applyMeters(nextState);
    }

    nextState.action = nextState.inAir ? "fall" : "idle";
    nextState = this.passiveRegen(nextState, ctx);
    return this.applyMeters(nextState);
  }

  private enterDodge(state: FighterCombatState): FighterCombatState {
    return {
      ...state,
      action: "dodge",
      moveId: "dodge",
      moveFrame: 0,
      guardMeter: Math.max(0, state.guardMeter - 12),
    };
  }

  private startMove(
    state: FighterCombatState,
    move: MoveDefinition,
  ): FighterCombatState {
    const staminaCost = move.meterCost?.stamina ?? 0;
    const guardCost = move.meterCost?.guard ?? 0;
    const specialCost = move.meterCost?.specialMeter ?? 0;
    if (
      state.staminaMeter < staminaCost ||
      state.guardMeter < guardCost ||
      state.specialMeter < specialCost
    ) {
      return state;
    }

    return {
      ...state,
      action: "attack",
      moveId: move.id,
      moveFrame: FRAME_EPSILON,
      staminaMeter: state.staminaMeter - staminaCost,
      guardMeter: state.guardMeter - guardCost,
      specialMeter: state.specialMeter - specialCost,
    };
  }

  private advanceMoveFrame(
    state: FighterCombatState,
    ctx: MoveContext,
  ): FighterCombatState {
    if (!state.moveId) return state;
    const move = ctx.availableMoves[state.moveId];
    if (!move) {
      return { ...state, moveId: undefined, moveFrame: undefined, action: "idle" };
    }

    const updatedFrame = (state.moveFrame ?? 0) + ctx.delta;
    let nextState = { ...state, moveFrame: updatedFrame };

    if (updatedFrame >= move.totalFrames) {
      nextState.moveId = undefined;
      nextState.moveFrame = undefined;
      nextState.action = move.aerialOnly ? "fall" : "landing";
    }

    const branch = move.cancelBranches?.find((b) => {
      if (ctx.inputs[b.to]) return this.frameInWindow(updatedFrame, b.window);
      if (b.condition === "onHit" && ctx.inputs["confirm-hit"]) {
        return this.frameInWindow(updatedFrame, b.window);
      }
      return false;
    });

    if (branch) {
      nextState.moveId = branch.to;
      nextState.moveFrame = FRAME_EPSILON;
      nextState.action = "attack";
    }

    return nextState;
  }

  private findMoveToStart(ctx: MoveContext): MoveDefinition | undefined {
    const moveEntries = Object.entries(ctx.availableMoves);
    for (const [id, move] of moveEntries) {
      if (!ctx.inputs[id]) continue;
      if (move.groundedOnly && ctx.state.inAir) continue;
      if (move.aerialOnly && !ctx.state.inAir) continue;
      if (move.meterCost?.stamina && ctx.state.staminaMeter < move.meterCost.stamina) continue;
      if (move.meterCost?.guard && ctx.state.guardMeter < move.meterCost.guard) continue;
      if (move.meterCost?.specialMeter && ctx.state.specialMeter < move.meterCost.specialMeter) continue;
      return move;
    }
    return undefined;
  }

  private applyMeters(state: FighterCombatState): FighterCombatState {
    return {
      ...state,
      guardMeter: clamp(state.guardMeter, 0, this.config.guardMeterMax),
      staminaMeter: clamp(state.staminaMeter, 0, this.config.staminaMax),
      specialMeter: clamp(state.specialMeter, 0, this.config.specialMax),
    };
  }

  private passiveRegen(state: FighterCombatState, ctx: MoveContext) {
    const airbornePenalty = state.inAir ? 0.5 : 1;
    return {
      ...state,
      staminaMeter: state.staminaMeter + STAMINA_REGEN * ctx.delta * airbornePenalty,
      guardMeter:
        state.action === "blockstun"
          ? state.guardMeter
          : state.guardMeter + GUARD_REGEN * ctx.delta,
      specialMeter:
        state.specialMeter + SPECIAL_REGEN * ctx.delta * (state.action === "attack" ? 0.8 : 1),
    };
  }

  private frameInWindow(frame: number, window: { start: number; end: number }) {
    return frame >= window.start && frame <= window.end;
  }
}
