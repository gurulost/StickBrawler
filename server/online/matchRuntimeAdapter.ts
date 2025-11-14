import { ServerMatchRuntime } from "../matchRuntime";
import type { OnlineMatchSnapshot, RuntimeKeyboardState, FighterSnapshot } from "@shared/match/types";
import { createEmptyInputs, type DualInputState } from "../../client/src/game/matchRuntime";

/**
 * MatchRuntimeServerAdapter bridges the existing ServerMatchRuntime with the online multiplayer API.
 * It provides applyInputs() and toOnlineSnapshot() methods expected by MatchCoordinator.
 *
 * TODO: This is a minimal implementation for compilation. Full online multiplayer will require:
 * - Proper frame buffering and timing
 * - Input validation and sanitization
 * - Deterministic delta time handling
 * - Resync/rollback support
 */
export class MatchRuntimeServerAdapter {
  private readonly runtime: ServerMatchRuntime;
  private currentFrame = 0;
  private readonly playerInputsQueue = new Map<number, RuntimeKeyboardState<string>>();
  private readonly opponentInputsQueue = new Map<number, RuntimeKeyboardState<string>>();
  private lastPlayerInputs: RuntimeKeyboardState<string>;
  private lastOpponentInputs: RuntimeKeyboardState<string>;
  private readonly profileToSlot = new Map<string, 'host' | 'guest'>();
  
  constructor(seed?: number) {
    // TODO: Use seed to initialize deterministic runtime
    this.runtime = new ServerMatchRuntime();
    this.lastPlayerInputs = this.createEmptyInputState();
    this.lastOpponentInputs = this.createEmptyInputState();
  }
  
  /**
   * Registers a player profile to a slot (host or guest).
   * Must be called before applyInputs for each player.
   * Can be called multiple times (e.g., on reconnection) to update registration.
   */
  registerPlayer(profileId: string, slot: 'host' | 'guest'): void {
    this.profileToSlot.set(profileId, slot);
  }
  
  /**
   * Unregisters a player profile (e.g., on disconnect).
   * Subsequent inputs from this profileId will be dropped until re-registered.
   */
  unregisterPlayer(profileId: string): void {
    this.profileToSlot.delete(profileId);
  }
  
  /**
   * Applies inputs from a specific player for a specific frame.
   * Queues inputs until both players have submitted for the frame, then advances.
   */
  applyInputs(profileId: string, inputs: RuntimeKeyboardState<string>, frame: number): void {
    const slot = this.profileToSlot.get(profileId);
    
    if (!slot) {
      console.warn(`[MatchRuntimeAdapter] Unknown profileId: ${profileId}, ignoring inputs`);
      return;
    }
    
    if (slot === 'host') {
      this.playerInputsQueue.set(frame, inputs);
      this.lastPlayerInputs = inputs;
    } else {
      this.opponentInputsQueue.set(frame, inputs);
      this.lastOpponentInputs = inputs;
    }
    
    // Advance runtime if we have inputs from both players
    if (this.playerInputsQueue.has(frame) && this.opponentInputsQueue.has(frame)) {
      this.advanceToFrame(frame);
    }
  }
  
  /**
   * Generates an OnlineMatchSnapshot for the current frame.
   * This snapshot is broadcast to all players in the match.
   */
  toOnlineSnapshot(frame: number): OnlineMatchSnapshot<string> {
    const state = this.runtime.getState();
    
    return {
      frame,
      playerState: this.characterStateToSnapshot(state.player),
      opponentState: this.characterStateToSnapshot(state.cpu),
      inputs: {
        player: {
          frame,
          inputs: this.lastPlayerInputs,
        },
        opponent: {
          frame,
          inputs: this.lastOpponentInputs,
        },
      },
      phase: this.gamePhaseToMatchPhase(state.gamePhase),
    };
  }
  
  private gamePhaseToMatchPhase(gamePhase: any): "menu" | "fighting" | "round_end" | "match_end" {
    // Map GamePhase (with 'lobby') to MatchPhase (without 'lobby')
    if (gamePhase === "lobby") return "menu";
    return gamePhase as "menu" | "fighting" | "round_end" | "match_end";
  }
  
  /**
   * Resets the match runtime to initial state with a new seed.
   */
  reset(seed?: number): void {
    // TODO: Use seed to reinitialize deterministic runtime
    this.runtime.reset();
    this.currentFrame = 0;
    this.playerInputsQueue.clear();
    this.opponentInputsQueue.clear();
    this.lastPlayerInputs = this.createEmptyInputState();
    this.lastOpponentInputs = this.createEmptyInputState();
  }
  
  /**
   * Gets the current match state (for debugging/testing).
   */
  getState() {
    return this.runtime.getState();
  }
  
  private advanceToFrame(frame: number): void {
    const playerInputs = this.playerInputsQueue.get(frame) ?? this.lastPlayerInputs;
    const opponentInputs = this.opponentInputsQueue.get(frame) ?? this.lastOpponentInputs;
    
    // Fixed delta time for deterministic simulation (60 FPS)
    const delta = 1 / 60;
    
    // Convert RuntimeKeyboardState<string> to DualInputState
    const dualInputs: DualInputState = {
      player1: playerInputs as any, // TODO: Proper type conversion
      player2: opponentInputs as any,
    };
    
    this.runtime.update({
      delta,
      inputs: dualInputs,
      gamePhase: "fighting",
    });
    
    this.currentFrame = frame;
    
    // Clean up old inputs to prevent memory leak
    this.playerInputsQueue.delete(frame - 10);
    this.opponentInputsQueue.delete(frame - 10);
  }
  
  private characterStateToSnapshot(state: any): FighterSnapshot {
    return {
      health: state.health,
      position: state.position,
      velocity: state.velocity,
      direction: state.direction,
      isJumping: state.isJumping,
      isAttacking: state.isAttacking,
      isBlocking: state.isBlocking,
      isDodging: state.isDodging,
      isGrabbing: state.isGrabbing,
      isTaunting: state.isTaunting,
      isAirAttacking: state.isAirAttacking,
      airJumpsLeft: state.airJumpsLeft,
      guardMeter: state.guardMeter,
      staminaMeter: state.staminaMeter,
      specialMeter: state.specialMeter,
      attackCooldown: state.attackCooldown,
      dodgeCooldown: state.dodgeCooldown,
      grabCooldown: state.grabCooldown,
      moveCooldown: state.moveCooldown,
      comboCount: state.comboCount,
      comboTimer: state.comboTimer,
      lastMoveType: state.lastMoveType,
    };
  }
  
  private createEmptyInputState(): RuntimeKeyboardState<string> {
    return {
      jump: false,
      forward: false,
      backward: false,
      leftward: false,
      rightward: false,
      attack1: false,
      attack2: false,
      shield: false,
      special: false,
      dodge: false,
      airAttack: false,
      taunt: false,
      grab: false,
    };
  }
}
