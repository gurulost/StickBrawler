import { GameEngine, createInitialState, type GameCommand, type SystemContext } from "../../../engine/index";
import { CpuBrain, CpuStyle, type CpuControlFrame } from "./cpuBrain";
import {
  applyGravity,
  PLAYER_SPEED,
  JUMP_FORCE,
  applyHorizontalFriction,
  resolveCapsuleBounds,
  computeHitLagSeconds,
  applyHitLagTimer,
  ATTACK_RANGE,
  getPlatformHeight,
  CPU_SPEED,
  GROUND_ACCELERATION,
  AIR_ACCELERATION,
  GROUND_DECELERATION,
  AIR_DECELERATION,
  moveTowards,
  COYOTE_TIME,
  JUMP_BUFFER,
  INPUT_BUFFER,
  INITIAL_DASH_MULTIPLIER,
  INITIAL_DASH_COOLDOWN,
  INITIAL_DASH_TURN_LOCK,
  SHORT_HOP_WINDOW,
  SHORT_HOP_FORCE_SCALE,
} from "./Physics";
import {
  CombatStateMachine,
  coreMoves,
  resolveHits,
  type FighterCombatState,
  type MoveDefinition,
} from "../combat";
import {
  applyKnockbackToVelocity,
  comboScale,
  selectMoveFromInputs,
  toCombatState,
  type PlayerInputState,
  type DirectionalInfluence,
} from "./combatBridge";
import type { CharacterState, GamePhase, MatchMode } from "../lib/stores/useFighting";
import { Controls } from "../lib/stores/useControls";
import { recordTelemetry, drainTelemetry, type HitTelemetry } from "./combatTelemetry";
import { DeterministicRandom } from "./prng";

interface FightingActions {
  movePlayer: (x: number, y: number, z: number) => void;
  moveCPU: (x: number, y: number, z: number) => void;
  updatePlayerVelocity: (vx: number, vy: number, vz: number) => void;
  updateCPUVelocity: (vx: number, vy: number, vz: number) => void;
  setPlayerDirection: (direction: 1 | -1) => void;
  setCPUDirection: (direction: 1 | -1) => void;
  setPlayerJumping: (jumping: boolean) => void;
  setCPUJumping: (jumping: boolean) => void;
  setPlayerAttacking: (attacking: boolean) => void;
  setCPUAttacking: (attacking: boolean) => void;
  setPlayerBlocking: (blocking: boolean) => void;
  setCPUBlocking: (blocking: boolean) => void;
  setPlayerDodging: (dodging: boolean) => void;
  setPlayerGrabbing: (grabbing: boolean) => void;
  setPlayerTaunting: (taunting: boolean) => void;
  setPlayerAirAttacking: (airAttacking: boolean) => void;
  resetPlayerAirJumps: () => void;
  usePlayerAirJump?: () => void;
  setCPUDodging: (dodging: boolean) => void;
  setCPUGrabbing: (grabbing: boolean) => void;
  setCPUAirAttacking: (airAttacking: boolean) => void;
  resetCPUAirJumps: () => void;
  useCPUAirJump?: () => void;
  damagePlayer: (amount: number) => void;
  damageCPU: (amount: number) => void;
  updateRoundTime: (time: number) => void;
  updatePlayerCooldowns: (delta: number) => void;
  updateCPUCooldowns: (delta: number) => void;
  updatePlayerMeters: (meters: Partial<{ guard: number; stamina: number; special: number }>) => void;
  updateCPUMeters: (meters: Partial<{ guard: number; stamina: number; special: number }>) => void;
  updatePlayerGuardBreak: () => void;
  updateCPUGuardBreak: () => void;
}

interface AudioActions {
  playHit: (intensity?: number) => void;
  playPunch: () => void;
  playKick: () => void;
  playSpecial: () => void;
  playBlock: () => void;
  playJump: () => void;
  playLand: () => void;
  playDodge: () => void;
  playGrab: () => void;
  playThrow: () => void;
  playTaunt: () => void;
}

interface MatchRuntimeDeps {
  fighting: FightingActions;
  audio: AudioActions;
  getDebugMode: () => boolean;
  getMatchMode: () => MatchMode;
  getArenaStyle: () => 'open' | 'contained';
  sendTelemetry?: (entries: HitTelemetry[]) => void;
  onImpact?: (intensity: number) => void;
}

type ControlSnapshot = Record<Controls, boolean>;

export interface DualInputState {
  player1: ControlSnapshot;
  player2: ControlSnapshot;
}

const CONTROL_NAMES = Object.values(Controls);

const createControlSnapshot = (): ControlSnapshot =>
  CONTROL_NAMES.reduce(
    (state, name) => {
      state[name] = false;
      return state;
    },
    {} as ControlSnapshot,
  );

export const createEmptyInputs = (): DualInputState => ({
  player1: createControlSnapshot(),
  player2: createControlSnapshot(),
});

interface FramePayload {
  delta: number;
  inputs: DualInputState;
  player: CharacterState;
  cpu: CharacterState;
  gamePhase: GamePhase;
}

const PLAYER_MOVE_ORDER: Array<keyof PlayerInputState> = [
  "special",
  "attack2",
  "attack1",
  "airAttack",
  "grab",
];
const DEFAULT_GUARD_VALUE = 80;
const GUARD_BREAK_THRESHOLD = 5;
const GUARD_BREAK_RECOVERY_RATIO = 0.35;
const DODGE_DURATION = 0.3;
const GRAB_RESOLVE_DELAY = 0.4;
const TAUNT_DURATION = 1.2;
const GUARD_BREAK_STUN = 1.05;
const DODGE_INVULN_DURATION = 0.18;
const DODGE_TRAVEL_DURATION = 0.12;
const DODGE_RECOVERY_DURATION = 0.1;
const DODGE_BASE_STAMINA_COST = 20;
const DODGE_CHAIN_COST = 5;
const DODGE_CHAIN_WINDOW = 3;
const DODGE_STAMINA_REGEN_DELAY = 0.6;
const CHIP_DAMAGE_RATIO = 0.12;
const MIN_CHIP_DAMAGE = 1;
const BLOCK_PUSH_SCALE = 0.06;
const BLOCK_PUSH_MAX = 5;
const GUARD_REGEN_RATE = 12;
const GUARD_REGEN_DELAY = 0.75;
const GUARD_HOLD_DRAIN = 12;
const STAMINA_FLOOR_RESET = Number.NEGATIVE_INFINITY;

interface ActionTimers {
  dodge: number;
  dodgeInvuln: number;
  dodgeTravelPhase: number;
  dodgeRecoveryPhase: number;
  grab: number;
  grabPending: boolean;
  taunt: number;
  tauntActive: boolean;
  guardBreak: number;
  landingLag: number;
  coyote: number;
  jumpBuffer: number;
  inputBuffer: number;
  dashCooldown: number;
  turnLock: number;
  shortHopWindow: number;
  horizontalHeld: boolean;
  guardRegenDelay: number;
  dodgeChainTimer: number;
  dodgeChainCount: number;
  staminaRegenDelay: number;
  staminaFloor: number;
}

const createActionTimers = (): ActionTimers => ({
  dodge: 0,
  dodgeInvuln: 0,
  dodgeTravelPhase: 0,
  dodgeRecoveryPhase: 0,
  grab: 0,
  grabPending: false,
  taunt: 0,
  tauntActive: false,
  guardBreak: 0,
  landingLag: 0,
  coyote: 0,
  jumpBuffer: 0,
  inputBuffer: 0,
  dashCooldown: 0,
  turnLock: 0,
  shortHopWindow: 0,
  horizontalHeld: false,
  guardRegenDelay: 0,
  dodgeChainTimer: 0,
  dodgeChainCount: 0,
  staminaRegenDelay: 0,
  staminaFloor: STAMINA_FLOOR_RESET,
});

/**
 * MatchRuntime manages the deterministic game state for a single fight.
 * 
 * **Determinism Policy:**
 * - Gameplay-affecting randomness uses DeterministicRandom (seeded PRNG)
 * - Visual-only effects (animations, particles) may use Math.random()
 * - This ensures replays and netcode remain synchronized while preserving visual variety
 */
export class MatchRuntime {
  private readonly engine: GameEngine;
  private readonly playerMachine = new CombatStateMachine();
  private readonly cpuMachine = new CombatStateMachine();
  private playerCombatState: FighterCombatState;
  private cpuCombatState: FighterCombatState;
  private readonly playerHitRegistry = new Set<string>();
  private readonly cpuHitRegistry = new Set<string>();
  private playerPrevMoveId?: string;
  private cpuPrevMoveId?: string;
  private playerHitLag = 0;
  private cpuHitLag = 0;
  private readonly cpuBrain = new CpuBrain({ style: CpuStyle.BALANCED });
  private playerTimers: ActionTimers = createActionTimers();
  private cpuTimers: ActionTimers = createActionTimers();
  private previousInputs: DualInputState = createEmptyInputs();
  
  /** Deterministic RNG for gameplay decisions (air jumps, etc.) - seeded per match */
  private readonly rng: DeterministicRandom;

  constructor(private readonly deps: MatchRuntimeDeps, snapshot: { player: CharacterState; cpu: CharacterState }) {
    this.playerCombatState = toCombatState(snapshot.player);
    this.cpuCombatState = toCombatState(snapshot.cpu);
    
    // Create deterministic seed from match start positions
    const seed = this.createMatchSeed(snapshot);
    this.rng = new DeterministicRandom(seed);
    
    // Initialize engine with deterministic seed
    this.engine = new GameEngine(createInitialState(seed));
    this.engine.registerSystem(this.handleSystem);
  }
  
  /**
   * Creates a deterministic seed from initial match state
   * Provides consistent RNG behavior for local CPU opponents
   * 
   * **Current Scope:** Position-based seeding for local play consistency
   * **Future Work (if replay/netcode added):**
   * - Include full state (z-position, velocities, meters, timers)
   * - Serialize/deserialize RNG state with snapshots
   * - Add regression tests for deterministic rebuilds
   */
  private createMatchSeed(snapshot: { player: CharacterState; cpu: CharacterState }): number {
    const p = snapshot.player.position;
    const c = snapshot.cpu.position;
    // Hash initial positions to create reproducible seed
    let hash = 0;
    hash = ((hash << 5) - hash) + Math.floor(p[0] * 1000);
    hash = ((hash << 5) - hash) + Math.floor(p[1] * 1000);
    hash = ((hash << 5) - hash) + Math.floor(c[0] * 1000);
    hash = ((hash << 5) - hash) + Math.floor(c[1] * 1000);
    return hash & hash; // Convert to 32-bit integer
  }

  update(payload: FramePayload) {
    if (payload.gamePhase !== "fighting") return;
    const command: GameCommand<FramePayload> = {
      type: "match/frame",
      payload,
      issuedAt: performance.now(),
    };
    this.engine.enqueueCommand(command);
    this.engine.step(payload.delta * 1000);
    this.flushTelemetry();
  }

  reset(snapshot: { player: CharacterState; cpu: CharacterState }) {
    this.playerCombatState = toCombatState(snapshot.player);
    this.cpuCombatState = toCombatState(snapshot.cpu);
    this.playerHitRegistry.clear();
    this.cpuHitRegistry.clear();
    this.playerPrevMoveId = undefined;
    this.cpuPrevMoveId = undefined;
    this.playerHitLag = 0;
    this.cpuHitLag = 0;
    this.playerTimers = createActionTimers();
    this.cpuTimers = createActionTimers();
    this.previousInputs = createEmptyInputs();
    
    // Reset RNG with new deterministic seed for match consistency
    const seed = this.createMatchSeed(snapshot);
    this.rng.reset(seed);
  }

  private handleSystem = (context: SystemContext) => {
    if (!context.commands.length) return;
    for (const command of context.commands) {
      if (command.type !== "match/frame") continue;
      this.processFrame(command.payload as FramePayload);
    }
  };

  private processFrame(payload: FramePayload) {
    const { fighting, audio, getDebugMode, getMatchMode } = this.deps;
    const { delta, inputs, player, cpu } = payload;
    const matchMode = getMatchMode();
    const isLocalMultiplayer = matchMode === "local";
    const opponentSlot = isLocalMultiplayer ? "player2" : "cpu";
    const opponentSource = isLocalMultiplayer ? "player" : "cpu";
    const playerControls = inputs.player1;
    const opponentControls = inputs.player2;

    this.playerHitLag = applyHitLagTimer(this.playerHitLag, delta);
    this.cpuHitLag = applyHitLagTimer(this.cpuHitLag, delta);
    const playerInHitLag = this.playerHitLag > 0;
    const cpuInHitLag = this.cpuHitLag > 0;

    const {
      jump,
      forward,
      backward,
      leftward,
      rightward,
      attack1,
      attack2,
      shield,
      special,
      dodge,
      airAttack,
      grab,
      taunt,
    } = playerControls;
    const prevPlayerControls = this.previousInputs.player1;
    const jumpPressed = !!jump && !prevPlayerControls.jump;
    const jumpReleased = !!prevPlayerControls.jump && !jump;
    const horizontalIntent =
      !!leftward || !!rightward || !!forward || !!backward;
    const prevHorizontalIntent =
      !!prevPlayerControls.leftward ||
      !!prevPlayerControls.rightward ||
      !!prevPlayerControls.forward ||
      !!prevPlayerControls.backward;
    const justPressedHorizontal = horizontalIntent && !prevHorizontalIntent;

    const cpuControlState = isLocalMultiplayer
      ? snapshotToControlFrame(opponentControls)
      : this.cpuBrain.tick(
          {
            position: cpu.position,
            isJumping: cpu.isJumping,
            attackCooldown: cpu.attackCooldown,
            dodgeCooldown: cpu.dodgeCooldown,
            guardMeter: this.cpuCombatState.guardMeter,
          },
          {
            position: player.position,
            isAttacking: player.isAttacking,
          },
          delta,
        );

    const playerInputs: PlayerInputState = {
      attack1,
      attack2,
      special,
      airAttack,
      grab,
      dodge,
    };
    if (playerInHitLag) {
      playerInputs.attack1 = false;
      playerInputs.attack2 = false;
      playerInputs.special = false;
      playerInputs.airAttack = false;
      playerInputs.grab = false;
    }

    const applyGuardDamageToPlayer = (amount: number) => {
      if (amount <= 0) return;
      const current = this.playerCombatState.guardMeter;
      const next = Math.max(0, current - amount);
      const guardBroken = current > GUARD_BREAK_THRESHOLD && next <= GUARD_BREAK_THRESHOLD;
      this.playerCombatState.guardMeter = guardBroken
        ? DEFAULT_GUARD_VALUE * GUARD_BREAK_RECOVERY_RATIO
        : next;
      if (guardBroken) {
          fighting.setPlayerBlocking(false);
          fighting.setPlayerDodging(false);
          fighting.setPlayerAttacking(false);
          fighting.damagePlayer(5);
          fighting.updatePlayerVelocity(
            player.velocity[0] - player.direction * 0.35,
            Math.max(player.velocity[1], 0.2),
            player.velocity[2],
          );
          this.playerTimers.guardBreak = GUARD_BREAK_STUN;
        fighting.updatePlayerGuardBreak();
          audio.playHit();
          this.deps.onImpact?.(0.6);
        }
        this.playerTimers.guardRegenDelay = GUARD_REGEN_DELAY;
      };

    const applyGuardDamageToCpu = (amount: number) => {
      if (amount <= 0) return;
      const current = this.cpuCombatState.guardMeter;
      const next = Math.max(0, current - amount);
      const guardBroken = current > GUARD_BREAK_THRESHOLD && next <= GUARD_BREAK_THRESHOLD;
      this.cpuCombatState.guardMeter = guardBroken
        ? DEFAULT_GUARD_VALUE * GUARD_BREAK_RECOVERY_RATIO
        : next;
      if (guardBroken) {
          fighting.setCPUBlocking(false);
          fighting.setCPUDodging(false);
          fighting.setCPUAttacking(false);
          fighting.damageCPU(5);
          fighting.updateCPUVelocity(
            cpu.velocity[0] + cpu.direction * 0.35,
            Math.max(cpu.velocity[1], 0.2),
            cpu.velocity[2],
          );
          this.cpuTimers.guardBreak = GUARD_BREAK_STUN;
        fighting.updateCPUGuardBreak();
          audio.playHit();
          this.deps.onImpact?.(0.6);
        }
        this.cpuTimers.guardRegenDelay = GUARD_REGEN_DELAY;
      };

    const playerIsAirborne = player.position[1] > 0.15 || player.isJumping;
    const cpuIsAirborne = cpu.position[1] > 0.15 || cpu.isJumping;
    const playerDirectionalInfluence = deriveDirectionalInfluence(playerControls, playerIsAirborne);
    const cpuDirectionalInfluence = deriveDirectionalInfluence(cpuControlState, cpuIsAirborne);
    this.advancePlayerTimers(delta, player, cpu);
    this.advanceCpuTimers(delta, player, cpu);

    const requestedMove = selectMoveFromInputs(
      playerInputs,
      PLAYER_MOVE_ORDER,
      coreMoves,
      playerIsAirborne,
    );

    const machineInputs = {
      ...playerInputs,
      ...(requestedMove ? { [requestedMove.id]: true } : {}),
    };

    const cpuStateSnapshot: FighterCombatState = {
      ...this.cpuCombatState,
      position: cpu.position,
      velocity: cpu.velocity,
      inAir: cpu.position[1] > 0.15 || cpu.isJumping,
      facing: cpu.direction,
    };

    const updatedCombatState = this.playerMachine.update({
      state: {
        ...this.playerCombatState,
        position: player.position,
        velocity: player.velocity,
        inAir: playerIsAirborne,
        facing: player.direction,
      },
      opponent: cpuStateSnapshot,
      inputs: machineInputs,
      delta: (playerInHitLag ? 0 : delta) * 60,
      availableMoves: coreMoves,
    });

    if (updatedCombatState.moveId !== this.playerPrevMoveId) {
      this.playerHitRegistry.clear();
      if (updatedCombatState.moveId) {
        playMoveStartAudio(coreMoves[updatedCombatState.moveId], {
          playPunch: audio.playPunch,
          playKick: audio.playKick,
          playSpecial: audio.playSpecial,
        });
      }
      this.playerPrevMoveId = updatedCombatState.moveId;
    }

    this.playerCombatState = updatedCombatState;
    const playerAction = updatedCombatState.action;
    fighting.setPlayerAttacking(playerAction === "attack");
    fighting.setPlayerDodging(playerAction === "dodge");
    fighting.setPlayerAirAttacking(updatedCombatState.inAir && playerAction === "attack");

    if (updatedCombatState.moveId) {
      const moveDef = coreMoves[updatedCombatState.moveId];
      const hits = resolveHits({
        attacker: updatedCombatState,
        defender: cpuStateSnapshot,
        move: moveDef,
        scaledDamage: comboScale(player.comboCount),
      });

      const newHits = hits.filter((hit) => !this.playerHitRegistry.has(`${hit.moveId}:${hit.hitboxId}`));

      if (newHits.length) {
        let maxDamage = 0;
        newHits.forEach((hit) => {
          if (cpu.isDodging && this.cpuTimers.dodgeInvuln > 0) {
            return;
          }
          const blocking = cpu.isBlocking;
          const baseDamage = Math.round(hit.damage);
          maxDamage = Math.max(maxDamage, baseDamage);
          if (blocking) {
            const chip = Math.max(
              MIN_CHIP_DAMAGE,
              Math.round(baseDamage * CHIP_DAMAGE_RATIO),
            );
            fighting.damageCPU(chip);
            applyGuardDamageToCpu(hit.guardDamage);
            this.cpuTimers.guardRegenDelay = GUARD_REGEN_DELAY;
          } else {
            fighting.damageCPU(baseDamage);
          }
          let [vx, vy, vz] = applyKnockbackToVelocity(cpu, hit, cpuDirectionalInfluence);
          if (blocking) {
            const push =
              Math.min(
                BLOCK_PUSH_MAX,
                baseDamage * BLOCK_PUSH_SCALE + (hit.weight ?? 0),
              ) || 0;
            if (push > 0) {
              const dx = cpu.position[0] - player.position[0];
              const dz = cpu.position[2] - player.position[2];
              const len = Math.hypot(dx, dz) || 1;
              vx += (dx / len) * push;
              vz += (dz / len) * push;
            }
          }
          fighting.updateCPUVelocity(vx, vy, vz);
          fighting.setCPUDirection(hit.knockbackVector[0] < 0 ? -1 : 1);
          this.playerHitRegistry.add(`${hit.moveId}:${hit.hitboxId}`);
          recordTelemetry({
            source: "player",
            slot: "player1",
            hit,
            timestamp: performance.now(),
            comboCount: player.comboCount,
          });
          this.playerHitLag = Math.max(this.playerHitLag, computeHitLagSeconds(hit.hitLag));
          this.cpuHitLag = Math.max(this.cpuHitLag, computeHitLagSeconds(hit.hitLag));
        });
        const intensity = Math.min(1.5, maxDamage / 8);
        audio.playHit(intensity);
        this.deps.onImpact?.(intensity);
      }
    } else {
      this.playerHitRegistry.clear();
    }

    const cpuInputs: PlayerInputState = {
      attack1: cpuControlState.attack1,
      attack2: cpuControlState.attack2,
      special: cpuControlState.special,
      airAttack: cpuControlState.airAttack,
      dodge: cpuControlState.dodge,
      grab: cpuControlState.grab,
    };
    const cpuRequestedMove = selectMoveFromInputs(
      { ...cpuInputs, grab: false },
      PLAYER_MOVE_ORDER,
      coreMoves,
      cpuIsAirborne,
    );
    const cpuMachineInputs = {
      ...cpuInputs,
      ...(cpuRequestedMove ? { [cpuRequestedMove.id]: true } : {}),
    };
    const cpuUpdatedState = this.cpuMachine.update({
      state: {
        ...this.cpuCombatState,
        position: cpu.position,
        velocity: cpu.velocity,
        inAir: cpuIsAirborne,
        facing: cpu.direction,
      },
      opponent: this.playerCombatState,
      inputs: cpuMachineInputs,
      delta: (cpuInHitLag ? 0 : delta) * 60,
      availableMoves: coreMoves,
    });
    if (cpuUpdatedState.moveId !== this.cpuPrevMoveId) {
      this.cpuHitRegistry.clear();
      if (cpuUpdatedState.moveId) {
        playMoveStartAudio(coreMoves[cpuUpdatedState.moveId], {
          playPunch: audio.playPunch,
          playKick: audio.playKick,
          playSpecial: audio.playSpecial,
        });
      }
      this.cpuPrevMoveId = cpuUpdatedState.moveId;
    }
    this.cpuCombatState = cpuUpdatedState;
    const cpuAction = cpuUpdatedState.action;
    fighting.setCPUAttacking(cpuAction === "attack");
    fighting.setCPUDodging(cpuAction === "dodge");
    fighting.setCPUAirAttacking(cpuUpdatedState.inAir && cpuAction === "attack");
    const cpuBlocking = cpuControlState.shield && this.cpuCombatState.guardMeter > 0;
    fighting.setCPUBlocking(cpuBlocking);
    if (cpuBlocking) {
      this.cpuCombatState.guardMeter = Math.max(
        0,
        this.cpuCombatState.guardMeter - GUARD_HOLD_DRAIN * delta,
      );
      this.cpuTimers.guardRegenDelay = GUARD_REGEN_DELAY;
    }
    if (cpuUpdatedState.moveId) {
      const moveDef = coreMoves[cpuUpdatedState.moveId];
      const hits = resolveHits({
        attacker: cpuUpdatedState,
        defender: this.playerCombatState,
        move: moveDef,
        scaledDamage: comboScale(cpu.comboCount),
      });
      const cpuNewHits = hits.filter((hit) => !this.cpuHitRegistry.has(`${hit.moveId}:${hit.hitboxId}`));
      if (cpuNewHits.length) {
        let maxDamage = 0;
        cpuNewHits.forEach((hit) => {
          if (player.isDodging && this.playerTimers.dodgeInvuln > 0) {
            return;
          }
          const blocking = player.isBlocking;
          const baseDamage = Math.round(hit.damage);
          maxDamage = Math.max(maxDamage, baseDamage);
          if (blocking) {
            const chip = Math.max(
              MIN_CHIP_DAMAGE,
              Math.round(baseDamage * CHIP_DAMAGE_RATIO),
            );
            fighting.damagePlayer(chip);
            applyGuardDamageToPlayer(hit.guardDamage);
            this.playerTimers.guardRegenDelay = GUARD_REGEN_DELAY;
            audio.playBlock();
          } else {
            fighting.damagePlayer(baseDamage);
          }
          let [vx, vy, vz] = applyKnockbackToVelocity(player, hit, playerDirectionalInfluence);
          if (blocking) {
            const push =
              Math.min(
                BLOCK_PUSH_MAX,
                baseDamage * BLOCK_PUSH_SCALE + (hit.weight ?? 0),
              ) || 0;
            if (push > 0) {
              const dx = player.position[0] - cpu.position[0];
              const dz = player.position[2] - cpu.position[2];
              const len = Math.hypot(dx, dz) || 1;
              vx += (dx / len) * push;
              vz += (dz / len) * push;
            }
          }
          fighting.updatePlayerVelocity(vx, vy, vz);
          fighting.setPlayerDirection(hit.knockbackVector[0] < 0 ? -1 : 1);
          this.cpuHitRegistry.add(`${hit.moveId}:${hit.hitboxId}`);
          recordTelemetry({
            source: opponentSource,
            slot: opponentSlot,
            hit,
            timestamp: performance.now(),
            comboCount: cpu.comboCount,
          });
          this.playerHitLag = Math.max(this.playerHitLag, computeHitLagSeconds(hit.hitLag));
          this.cpuHitLag = Math.max(this.cpuHitLag, computeHitLagSeconds(hit.hitLag));
        });
        const intensity = Math.min(1.5, maxDamage / 8);
        audio.playHit(intensity);
        this.deps.onImpact?.(intensity);
      }
    } else {
      this.cpuHitRegistry.clear();
    }

    const cpuDx = player.position[0] - cpu.position[0];
    const cpuDz = player.position[2] - cpu.position[2];
    const planarDistance = Math.hypot(cpuDx, cpuDz);

    if (
      cpuControlState.grab &&
      cpu.grabCooldown <= 0 &&
      planarDistance < 1.4 &&
      this.cpuTimers.grab <= 0
    ) {
      fighting.setCPUGrabbing(true);
      audio.playGrab();
      this.cpuTimers.grab = GRAB_RESOLVE_DELAY;
      this.cpuTimers.grabPending = true;
    }

    this.updateCpuMovement(cpuControlState, player, cpu, delta, cpuInHitLag, audio);
    this.updatePlayerMovement(
      {
        jump,
        jumpPressed,
        jumpReleased,
        justPressedHorizontal,
        forward,
        backward,
        leftward,
        rightward,
        shield,
        dodge,
        grab,
        taunt,
        airAttack,
      },
      player,
      cpu,
      delta,
      playerInHitLag,
      audio,
    );

    fighting.updateRoundTime(delta);
    fighting.updatePlayerCooldowns(delta);
    fighting.updateCPUCooldowns(delta);
    fighting.updatePlayerMeters({
      guard: this.playerCombatState.guardMeter,
      stamina: this.playerCombatState.staminaMeter,
      special: this.playerCombatState.specialMeter,
    });
    fighting.updateCPUMeters({
      guard: this.cpuCombatState.guardMeter,
      stamina: this.cpuCombatState.staminaMeter,
      special: this.cpuCombatState.specialMeter,
    });
    this.previousInputs.player1 = { ...playerControls };
    this.previousInputs.player2 = { ...opponentControls };
  }

  private updateCpuMovement(
    controlState: ReturnType<CpuBrain["tick"]>,
    player: CharacterState,
    cpu: CharacterState,
    delta: number,
    cpuInHitLag: boolean,
    audio: AudioActions,
  ) {
    const { fighting } = this.deps;
    const cpuStunned =
      this.cpuTimers.guardBreak > 0 || this.cpuTimers.landingLag > 0;
    const cpuCanAct =
      !cpuStunned &&
      !cpu.isAttacking &&
      !cpu.isBlocking &&
      !cpu.isDodging &&
      !cpu.isGrabbing &&
      !cpu.isTaunting &&
      !cpu.isAirAttacking;
    const cpuControlScale = cpuInHitLag ? 0 : 1;

    let cpuVX = cpu.velocity[0];
    let cpuVY = cpu.velocity[1];
    let cpuVZ = cpu.velocity[2];
    let cpuDirection = cpu.direction;
    this.cpuTimers.dashCooldown = Math.max(0, this.cpuTimers.dashCooldown - delta);
    this.cpuTimers.turnLock = Math.max(0, this.cpuTimers.turnLock - delta);
    const cpuPlatformHeight = getPlatformHeight(cpu.position[0], cpu.position[2]);
    const cpuHorizontalIntent =
      controlState.leftward ||
      controlState.rightward ||
      controlState.forward ||
      controlState.backward;
    const cpuJustPressedHorizontal =
      cpuHorizontalIntent && !this.cpuTimers.horizontalHeld;
    this.cpuTimers.horizontalHeld = cpuHorizontalIntent;
    const cpuGrounded = cpu.position[1] <= cpuPlatformHeight + 0.02;
    if (
      cpuHorizontalIntent &&
      cpuJustPressedHorizontal &&
      cpuGrounded &&
      cpuCanAct &&
      this.cpuTimers.dashCooldown <= 0
    ) {
      const dirX = (controlState.rightward ? 1 : 0) - (controlState.leftward ? 1 : 0);
      const dirZ = (controlState.backward ? 1 : 0) - (controlState.forward ? 1 : 0);
      const magnitude = Math.hypot(dirX, dirZ) || 1;
      cpuVX = (dirX / magnitude) * CPU_SPEED * INITIAL_DASH_MULTIPLIER;
      cpuVZ = (dirZ / magnitude) * CPU_SPEED * INITIAL_DASH_MULTIPLIER;
      this.cpuTimers.dashCooldown = INITIAL_DASH_COOLDOWN;
      this.cpuTimers.turnLock = INITIAL_DASH_TURN_LOCK;
    }

    if (cpuControlScale > 0 && (cpuCanAct || cpu.isJumping)) {
      const accelBase = cpu.isJumping ? AIR_ACCELERATION : GROUND_ACCELERATION;
      const accelPenalty = this.cpuTimers.turnLock > 0 ? 0.55 : 1;
      const accel = accelBase * accelPenalty * delta;
      const decel = (cpu.isJumping ? AIR_DECELERATION : GROUND_DECELERATION) * delta;
      const maxSpeed = (cpu.isJumping ? CPU_SPEED * 0.85 : CPU_SPEED) * cpuControlScale;

      let targetVX = 0;
      if (controlState.leftward) {
        targetVX = -maxSpeed;
        cpuDirection = -1;
      } else if (controlState.rightward) {
        targetVX = maxSpeed;
        cpuDirection = 1;
      }
      cpuVX = moveTowards(cpuVX, targetVX, targetVX === 0 ? decel : accel);
      cpuVX = Math.max(-maxSpeed, Math.min(maxSpeed, cpuVX));

      let targetVZ = 0;
      if (controlState.forward) {
        targetVZ = -maxSpeed;
      } else if (controlState.backward) {
        targetVZ = maxSpeed;
      }
      cpuVZ = moveTowards(cpuVZ, targetVZ, targetVZ === 0 ? decel : accel);
      cpuVZ = Math.max(-maxSpeed, Math.min(maxSpeed, cpuVZ));
    }

    if (controlState.jump && !cpu.isJumping && cpu.position[1] <= 0.01 && cpuCanAct) {
      cpuVY = JUMP_FORCE;
      fighting.setCPUJumping(true);
    } else if (controlState.jump && cpu.isJumping && cpu.airJumpsLeft > 0 && this.rng.nextBool(0.15)) {
      cpuVY = JUMP_FORCE * 0.9;
      fighting.useCPUAirJump?.();
    }

    if (controlState.shield && cpuCanAct && this.cpuCombatState.guardMeter > 0) {
      fighting.setCPUBlocking(true);
      this.cpuCombatState.guardMeter = Math.max(0, this.cpuCombatState.guardMeter - 12 * delta);
    } else if (cpu.isBlocking) {
      fighting.setCPUBlocking(false);
    }

    if (controlState.dodge && cpuCanAct && cpu.dodgeCooldown <= 0) {
      const chainCost =
        DODGE_BASE_STAMINA_COST +
        Math.max(0, this.cpuTimers.dodgeChainCount) * DODGE_CHAIN_COST;
      if (this.cpuCombatState.staminaMeter >= chainCost) {
        fighting.setCPUDodging(true);
        const dirX = (controlState.rightward ? 1 : 0) - (controlState.leftward ? 1 : 0);
        const dirZ = (controlState.backward ? 1 : 0) - (controlState.forward ? 1 : 0);
        const magnitude = Math.hypot(dirX, dirZ);
        const dodgeSpeed = CPU_SPEED * 2;
        if (magnitude === 0) {
          cpuVX = cpuDirection * dodgeSpeed;
        } else {
          cpuVX = (dirX / magnitude) * dodgeSpeed;
          cpuVZ = (dirZ / magnitude) * dodgeSpeed;
        }
        this.cpuTimers.dodgeInvuln = DODGE_INVULN_DURATION;
        this.cpuTimers.dodgeTravelPhase = DODGE_TRAVEL_DURATION;
        this.cpuTimers.dodgeRecoveryPhase = DODGE_RECOVERY_DURATION;
        this.cpuTimers.dodge = DODGE_INVULN_DURATION + DODGE_TRAVEL_DURATION + DODGE_RECOVERY_DURATION;
        this.cpuTimers.dodgeChainTimer = DODGE_CHAIN_WINDOW;
        this.cpuTimers.dodgeChainCount = Math.min(this.cpuTimers.dodgeChainCount + 1, 4);
        this.cpuTimers.staminaRegenDelay = DODGE_STAMINA_REGEN_DELAY;
        this.cpuCombatState.staminaMeter = Math.max(
          0,
          this.cpuCombatState.staminaMeter - chainCost,
        );
        this.cpuTimers.staminaFloor = this.cpuCombatState.staminaMeter;
      }
    }

    const cpuDrop =
      controlState.dropThrough &&
      cpu.position[1] > 0.5 &&
      cpu.position[1] > player.position[1];
    const cpuHeightAbovePlatform = Math.max(0, cpu.position[1] - cpuPlatformHeight);
    const cpuFastFallEligible =
      cpu.isJumping &&
      cpuHeightAbovePlatform > 0.45 &&
      (cpuVY < 0 || cpu.velocity[1] <= 0);
    const cpuFastFall = cpuFastFallEligible && controlState.backward;
    const [cpuNewY, cpuNewVY] = applyGravity(
      cpu.position[1],
      cpuVY,
      cpu.position[0],
      cpu.position[2],
      cpuDrop,
      cpuFastFall,
      delta,
    );

    const cpuOnGround = cpuNewY <= getPlatformHeight(cpu.position[0], cpu.position[2]) + 0.01;
    if (cpuOnGround && cpu.isJumping) {
      fighting.setCPUJumping(false);
      fighting.resetCPUAirJumps();
      audio.playLand();
      this.applyLandingLag("cpu");
    }

    const useCircularBounds = this.deps.getArenaStyle() === 'contained';
    const cpuBounds = resolveCapsuleBounds(
      [
        cpu.position[0] + cpuVX * delta,
        cpuNewY,
        cpu.position[2] + cpuVZ * delta,
      ],
      [cpuVX, cpuNewVY, cpuVZ],
      undefined,
      useCircularBounds,
    );
    const [boundedX, boundedY, boundedZ] = cpuBounds.position;
    const [boundedVX, boundedVY, boundedVZ] = cpuBounds.velocity;

    fighting.moveCPU(boundedX, boundedY, boundedZ);
    fighting.updateCPUVelocity(boundedVX, boundedVY, boundedVZ);
    fighting.setCPUDirection(cpuDirection);
  }

  private updatePlayerMovement(
    input: {
      jump: boolean;
      jumpPressed: boolean;
      jumpReleased: boolean;
      justPressedHorizontal: boolean;
      forward: boolean;
      backward: boolean;
      leftward: boolean;
      rightward: boolean;
      shield: boolean;
      dodge: boolean;
      grab: boolean;
      taunt: boolean;
      airAttack: boolean;
    },
    player: CharacterState,
    cpu: CharacterState,
    delta: number,
    playerInHitLag: boolean,
    audio: AudioActions,
  ) {
    const { fighting, getDebugMode } = this.deps;
    const playerStunned =
      this.playerTimers.guardBreak > 0 || this.playerTimers.landingLag > 0;
    const canAct =
      !playerStunned &&
      !player.isAttacking &&
      !player.isBlocking &&
      !player.isDodging &&
      !player.isGrabbing &&
      !player.isTaunting &&
      !player.isAirAttacking;

    const [playerX, playerY, playerZ] = player.position;
    let newVX = player.velocity[0];
    let newVY = player.velocity[1];
    let newVZ = player.velocity[2];
    let newDirection = player.direction;
    const platformHeight = getPlatformHeight(playerX, playerZ);
    const groundedNow = playerY <= platformHeight + 0.02;
    const horizontalIntent =
      input.leftward || input.rightward || input.forward || input.backward;

    this.playerTimers.dashCooldown = Math.max(0, this.playerTimers.dashCooldown - delta);
    this.playerTimers.turnLock = Math.max(0, this.playerTimers.turnLock - delta);
    this.playerTimers.shortHopWindow = Math.max(0, this.playerTimers.shortHopWindow - delta);

    this.playerTimers.jumpBuffer = Math.max(0, this.playerTimers.jumpBuffer - delta);
    this.playerTimers.inputBuffer = Math.max(0, this.playerTimers.inputBuffer - delta);
    if (groundedNow) {
      this.playerTimers.coyote = COYOTE_TIME;
    } else {
      this.playerTimers.coyote = Math.max(0, this.playerTimers.coyote - delta);
    }
    if (input.jumpPressed) {
      this.playerTimers.jumpBuffer = JUMP_BUFFER;
      this.playerTimers.inputBuffer = INPUT_BUFFER;
    }
    const justPressedHorizontal = input.justPressedHorizontal;
    if (!horizontalIntent) {
      this.playerTimers.horizontalHeld = false;
    }
    const dashEligible =
      horizontalIntent &&
      justPressedHorizontal &&
      groundedNow &&
      canAct &&
      this.playerTimers.dashCooldown <= 0;
    if (dashEligible) {
      const dirX = (input.rightward ? 1 : 0) - (input.leftward ? 1 : 0);
      const dirZ = (input.backward ? 1 : 0) - (input.forward ? 1 : 0);
      const magnitude = Math.hypot(dirX, dirZ) || 1;
      newVX = (dirX / magnitude) * PLAYER_SPEED * INITIAL_DASH_MULTIPLIER;
      newVZ = (dirZ / magnitude) * PLAYER_SPEED * INITIAL_DASH_MULTIPLIER;
      this.playerTimers.dashCooldown = INITIAL_DASH_COOLDOWN;
      this.playerTimers.turnLock = INITIAL_DASH_TURN_LOCK;
    }
    this.playerTimers.horizontalHeld = horizontalIntent;

    const controlScale = playerInHitLag ? 0 : 1;
    if (canAct || player.isJumping) {
      const accelBase = player.isJumping ? AIR_ACCELERATION : GROUND_ACCELERATION;
      const accelPenalty = this.playerTimers.turnLock > 0 ? 0.55 : 1;
      const accel = accelBase * accelPenalty * delta;
      const decel = (player.isJumping ? AIR_DECELERATION : GROUND_DECELERATION) * delta;
      const maxSpeed = (player.isJumping ? PLAYER_SPEED * 0.85 : PLAYER_SPEED) * controlScale;

      let targetVX = 0;
      if (input.leftward) {
        targetVX = -maxSpeed;
        newDirection = -1;
      } else if (input.rightward) {
        targetVX = maxSpeed;
        newDirection = 1;
      }
      newVX = moveTowards(newVX, targetVX, targetVX === 0 ? decel : accel);
      newVX = Math.max(-maxSpeed, Math.min(maxSpeed, newVX));

      let targetVZ = 0;
      if (input.forward) {
        targetVZ = -maxSpeed;
      } else if (input.backward) {
        targetVZ = maxSpeed;
      }
      newVZ = moveTowards(newVZ, targetVZ, targetVZ === 0 ? decel : accel);
      newVZ = Math.max(-maxSpeed, Math.min(maxSpeed, newVZ));
    }

    const jumpBuffered = this.playerTimers.jumpBuffer > 0;
    const canUseCoyote = groundedNow || this.playerTimers.coyote > 0;
    if ((input.jumpPressed || jumpBuffered) && !player.isJumping && canUseCoyote && canAct) {
      newVY = JUMP_FORCE;
      fighting.setPlayerJumping(true);
      audio.playJump();
      fighting.resetPlayerAirJumps();
      this.playerTimers.jumpBuffer = 0;
      this.playerTimers.coyote = 0;
      this.playerTimers.shortHopWindow = SHORT_HOP_WINDOW;
    } else if (input.jumpPressed && player.isJumping && player.airJumpsLeft > 0 && canAct) {
      newVY = JUMP_FORCE * 0.9;
      if (fighting.usePlayerAirJump?.()) {
        audio.playJump();
      }
    }
    if (input.jumpReleased && this.playerTimers.shortHopWindow > 0 && newVY > 0) {
      newVY *= SHORT_HOP_FORCE_SCALE;
      this.playerTimers.shortHopWindow = 0;
    }

    const dropThrough =
      input.backward && platformHeight > 0 && Math.abs(playerY - platformHeight) < 0.1;
    const heightAbovePlatform = Math.max(0, playerY - platformHeight);
    const fastFallEligible =
      player.isJumping &&
      heightAbovePlatform > 0.45 &&
      (newVY < 0 || player.velocity[1] <= 0);
    const fastFallActive = fastFallEligible && input.backward;
    const [newY, gravityVY] = applyGravity(
      playerY,
      newVY,
      playerX,
      playerZ,
      dropThrough,
      fastFallActive,
      delta,
    );
    newVY = gravityVY;

    if (
      player.isJumping &&
      (Math.abs(newY - platformHeight) < 0.1 || newY <= 0.01)
    ) {
      fighting.setPlayerJumping(false);
      fighting.resetPlayerAirJumps();
      audio.playLand();
      this.applyLandingLag("player");
      if (getDebugMode()) {
        console.log("Player landed on platform at height:", platformHeight);
      }
    }

    if (!player.isJumping && canAct) {
      if (
        input.grab &&
        player.grabCooldown <= 0 &&
        this.playerTimers.grab <= 0
      ) {
        if (getDebugMode()) {
          console.log("Player GRAB");
        }
        fighting.setPlayerGrabbing(true);
        audio.playGrab();
        this.playerTimers.grab = GRAB_RESOLVE_DELAY;
        this.playerTimers.grabPending = true;
      } else if (input.taunt && !player.isTaunting && this.playerTimers.taunt <= 0) {
        fighting.setPlayerTaunting(true);
        audio.playTaunt();
        this.playerTimers.taunt = TAUNT_DURATION;
        this.playerTimers.tauntActive = true;
      }
    }

    if (input.shield && canAct && this.playerCombatState.guardMeter > 0) {
      if (!player.isBlocking) {
        audio.playBlock();
      }
      fighting.setPlayerBlocking(true);
      this.playerCombatState.guardMeter = Math.max(
        0,
        this.playerCombatState.guardMeter - GUARD_HOLD_DRAIN * delta,
      );
      this.playerTimers.guardRegenDelay = GUARD_REGEN_DELAY;
    } else if (player.isBlocking) {
      fighting.setPlayerBlocking(false);
    }

    if (input.dodge && canAct && player.dodgeCooldown <= 0) {
      const chainCost =
        DODGE_BASE_STAMINA_COST +
        Math.max(0, this.playerTimers.dodgeChainCount) * DODGE_CHAIN_COST;
      if (this.playerCombatState.staminaMeter >= chainCost) {
        if (getDebugMode()) {
          console.log("Player DODGE");
        }
        fighting.setPlayerDodging(true);
        audio.playDodge();
        const dirX = (input.rightward ? 1 : 0) - (input.leftward ? 1 : 0);
        const dirZ = (input.backward ? 1 : 0) - (input.forward ? 1 : 0);
        const magnitude = Math.hypot(dirX, dirZ);
        const dodgeSpeed = PLAYER_SPEED * 2;
        if (magnitude === 0) {
          newVX = player.direction * dodgeSpeed;
        } else {
          newVX = (dirX / magnitude) * dodgeSpeed;
          newVZ = (dirZ / magnitude) * dodgeSpeed;
        }
        this.playerTimers.dodgeInvuln = DODGE_INVULN_DURATION;
        this.playerTimers.dodgeTravelPhase = DODGE_TRAVEL_DURATION;
        this.playerTimers.dodgeRecoveryPhase = DODGE_RECOVERY_DURATION;
        this.playerTimers.dodge = DODGE_INVULN_DURATION + DODGE_TRAVEL_DURATION + DODGE_RECOVERY_DURATION;
        this.playerTimers.dodgeChainTimer = DODGE_CHAIN_WINDOW;
        this.playerTimers.dodgeChainCount = Math.min(this.playerTimers.dodgeChainCount + 1, 4);
        this.playerTimers.staminaRegenDelay = DODGE_STAMINA_REGEN_DELAY;
        this.playerCombatState.staminaMeter = Math.max(
          0,
          this.playerCombatState.staminaMeter - chainCost,
        );
        this.playerTimers.staminaFloor = this.playerCombatState.staminaMeter;
      }
    }

    newVX = applyHorizontalFriction(newVX, player.isJumping, delta);
    newVZ = applyHorizontalFriction(newVZ, player.isJumping, delta);

    const proposedX = playerX + newVX * delta;
    const proposedZ = playerZ + newVZ * delta;
    const useCircularBounds = this.deps.getArenaStyle() === 'contained';
    const bounds = resolveCapsuleBounds([proposedX, newY, proposedZ], [newVX, newVY, newVZ], undefined, useCircularBounds);
    const [boundedX, boundedY, boundedZ] = bounds.position;
    const [boundedVX, boundedVY, boundedVZ] = bounds.velocity;

    fighting.movePlayer(boundedX, boundedY, boundedZ);
    fighting.updatePlayerVelocity(boundedVX, boundedVY, boundedVZ);
    fighting.setPlayerDirection(newDirection);
  }

  private flushTelemetry() {
    const telemetry = drainTelemetry();
    if (!telemetry.length) return;
    if (this.deps.sendTelemetry) {
      this.deps.sendTelemetry(telemetry);
    }
  }

  private advancePlayerTimers(delta: number, player: CharacterState, cpu: CharacterState) {
    const { fighting, audio } = this.deps;

    const wasTraveling = this.playerTimers.dodgeTravelPhase > 0;
    if (this.playerTimers.dodgeInvuln > 0) {
      this.playerTimers.dodgeInvuln = Math.max(0, this.playerTimers.dodgeInvuln - delta);
    }
    if (this.playerTimers.dodgeTravelPhase > 0) {
      this.playerTimers.dodgeTravelPhase = Math.max(0, this.playerTimers.dodgeTravelPhase - delta);
      if (wasTraveling && this.playerTimers.dodgeTravelPhase === 0 && player.isDodging) {
        fighting.setPlayerDodging(false);
      }
    } else if (this.playerTimers.dodgeInvuln <= 0 && player.isDodging) {
      fighting.setPlayerDodging(false);
    }
    if (this.playerTimers.dodgeRecoveryPhase > 0) {
      this.playerTimers.dodgeRecoveryPhase = Math.max(0, this.playerTimers.dodgeRecoveryPhase - delta);
    }
    if (this.playerTimers.dodgeChainTimer > 0) {
      this.playerTimers.dodgeChainTimer = Math.max(0, this.playerTimers.dodgeChainTimer - delta);
      if (this.playerTimers.dodgeChainTimer === 0) {
        this.playerTimers.dodgeChainCount = 0;
      }
    }

    if (this.playerTimers.landingLag > 0) {
      this.playerTimers.landingLag = Math.max(0, this.playerTimers.landingLag - delta);
    }

    if (this.playerTimers.grab > 0) {
      this.playerTimers.grab = Math.max(0, this.playerTimers.grab - delta);
    } else if (this.playerTimers.grabPending) {
      this.playerTimers.grabPending = false;
      fighting.setPlayerGrabbing(false);
      const distanceToCpu = Math.abs(player.position[0] - cpu.position[0]);
      if (distanceToCpu < ATTACK_RANGE * 0.6) {
        fighting.damageCPU(20);
        audio.playThrow();
        fighting.updateCPUVelocity(
          cpu.velocity[0] + player.direction * 0.4,
          Math.max(cpu.velocity[1], 0.4),
          cpu.velocity[2],
        );
        fighting.setCPUJumping(true);
      }
    }

    if (this.playerTimers.taunt > 0) {
      this.playerTimers.taunt = Math.max(0, this.playerTimers.taunt - delta);
      if (this.playerTimers.taunt === 0 && this.playerTimers.tauntActive) {
        this.playerTimers.tauntActive = false;
        fighting.setPlayerTaunting(false);
      }
    }

    if (this.playerTimers.guardBreak > 0) {
      this.playerTimers.guardBreak = Math.max(0, this.playerTimers.guardBreak - delta);
    }

    if (this.playerTimers.staminaRegenDelay > 0) {
      this.playerTimers.staminaRegenDelay = Math.max(0, this.playerTimers.staminaRegenDelay - delta);
      this.playerTimers.staminaFloor =
        this.playerTimers.staminaFloor === STAMINA_FLOOR_RESET
          ? this.playerCombatState.staminaMeter
          : Math.min(this.playerTimers.staminaFloor, this.playerCombatState.staminaMeter);
      this.playerCombatState.staminaMeter = Math.min(
        this.playerCombatState.staminaMeter,
        this.playerTimers.staminaFloor,
      );
    } else if (this.playerTimers.staminaFloor !== STAMINA_FLOOR_RESET) {
      this.playerTimers.staminaFloor = STAMINA_FLOOR_RESET;
    }

    if (this.playerTimers.guardRegenDelay > 0) {
      this.playerTimers.guardRegenDelay = Math.max(0, this.playerTimers.guardRegenDelay - delta);
    } else if (!player.isBlocking && this.playerCombatState.guardMeter < DEFAULT_GUARD_VALUE) {
      this.playerCombatState.guardMeter = Math.min(
        DEFAULT_GUARD_VALUE,
        this.playerCombatState.guardMeter + GUARD_REGEN_RATE * delta,
      );
    }
  }

  private advanceCpuTimers(delta: number, player: CharacterState, cpu: CharacterState) {
    const { fighting, audio } = this.deps;

    const cpuWasTraveling = this.cpuTimers.dodgeTravelPhase > 0;
    if (this.cpuTimers.dodgeInvuln > 0) {
      this.cpuTimers.dodgeInvuln = Math.max(0, this.cpuTimers.dodgeInvuln - delta);
    }
    if (this.cpuTimers.dodgeTravelPhase > 0) {
      this.cpuTimers.dodgeTravelPhase = Math.max(0, this.cpuTimers.dodgeTravelPhase - delta);
      if (cpuWasTraveling && this.cpuTimers.dodgeTravelPhase === 0 && cpu.isDodging) {
        fighting.setCPUDodging(false);
      }
    } else if (this.cpuTimers.dodgeInvuln <= 0 && cpu.isDodging) {
      fighting.setCPUDodging(false);
    }
    if (this.cpuTimers.dodgeRecoveryPhase > 0) {
      this.cpuTimers.dodgeRecoveryPhase = Math.max(0, this.cpuTimers.dodgeRecoveryPhase - delta);
    }
    if (this.cpuTimers.dodgeChainTimer > 0) {
      this.cpuTimers.dodgeChainTimer = Math.max(0, this.cpuTimers.dodgeChainTimer - delta);
      if (this.cpuTimers.dodgeChainTimer === 0) {
        this.cpuTimers.dodgeChainCount = 0;
      }
    }

    if (this.cpuTimers.landingLag > 0) {
      this.cpuTimers.landingLag = Math.max(0, this.cpuTimers.landingLag - delta);
    }

    if (this.cpuTimers.grab > 0) {
      this.cpuTimers.grab = Math.max(0, this.cpuTimers.grab - delta);
    } else if (this.cpuTimers.grabPending) {
      this.cpuTimers.grabPending = false;
      fighting.setCPUGrabbing(false);
      const distanceToPlayer = Math.abs(player.position[0] - cpu.position[0]);
      if (distanceToPlayer < ATTACK_RANGE * 0.6) {
        fighting.damagePlayer(8);
        fighting.updatePlayerVelocity(
          player.velocity[0] + cpu.direction * 0.4,
          Math.max(player.velocity[1], 0.3),
          player.velocity[2],
        );
        audio.playThrow();
      }
    }

    if (this.cpuTimers.taunt > 0) {
      this.cpuTimers.taunt = Math.max(0, this.cpuTimers.taunt - delta);
      if (this.cpuTimers.taunt === 0 && this.cpuTimers.tauntActive) {
        this.cpuTimers.tauntActive = false;
      }
    }

    if (this.cpuTimers.guardBreak > 0) {
      this.cpuTimers.guardBreak = Math.max(0, this.cpuTimers.guardBreak - delta);
    }

    if (this.cpuTimers.staminaRegenDelay > 0) {
      this.cpuTimers.staminaRegenDelay = Math.max(0, this.cpuTimers.staminaRegenDelay - delta);
      this.cpuTimers.staminaFloor =
        this.cpuTimers.staminaFloor === STAMINA_FLOOR_RESET
          ? this.cpuCombatState.staminaMeter
          : Math.min(this.cpuTimers.staminaFloor, this.cpuCombatState.staminaMeter);
      this.cpuCombatState.staminaMeter = Math.min(
        this.cpuCombatState.staminaMeter,
        this.cpuTimers.staminaFloor,
      );
    } else if (this.cpuTimers.staminaFloor !== STAMINA_FLOOR_RESET) {
      this.cpuTimers.staminaFloor = STAMINA_FLOOR_RESET;
    }

    if (this.cpuTimers.guardRegenDelay > 0) {
      this.cpuTimers.guardRegenDelay = Math.max(0, this.cpuTimers.guardRegenDelay - delta);
    } else if (!cpu.isBlocking && this.cpuCombatState.guardMeter < DEFAULT_GUARD_VALUE) {
      this.cpuCombatState.guardMeter = Math.min(
        DEFAULT_GUARD_VALUE,
        this.cpuCombatState.guardMeter + GUARD_REGEN_RATE * delta,
      );
    }
  }

  private applyLandingLag(target: "player" | "cpu") {
    const combatState =
      target === "player" ? this.playerCombatState : this.cpuCombatState;
    const timers = target === "player" ? this.playerTimers : this.cpuTimers;
    const moveId = combatState.moveId;
    if (!moveId) return;
    const moveDef = coreMoves[moveId];
    if (!moveDef?.landingLagFrames) return;
    const frame = combatState.moveFrame ?? 0;
    if (moveDef.autoCancelWindow && this.frameWithinWindow(frame, moveDef.autoCancelWindow)) {
      return;
    }
    timers.landingLag = moveDef.landingLagFrames / 60;
  }

  private frameWithinWindow(frame: number, window: { start: number; end: number }) {
    return frame >= window.start && frame <= window.end;
  }
}

type InfluenceSnapshot = Partial<Record<"leftward" | "rightward" | "jump" | "backward", boolean>>;

function snapshotToControlFrame(snapshot?: ControlSnapshot): CpuControlFrame {
  const base: CpuControlFrame = {
    jump: false,
    forward: false,
    backward: false,
    leftward: false,
    rightward: false,
    dropThrough: false,
    attack1: false,
    attack2: false,
    special: false,
    airAttack: false,
    dodge: false,
    grab: false,
    shield: false,
  };
  if (!snapshot) return base;
  base.jump = !!snapshot.jump;
  base.forward = !!snapshot.forward;
  base.backward = !!snapshot.backward;
  base.leftward = !!snapshot.leftward;
  base.rightward = !!snapshot.rightward;
  base.attack1 = !!snapshot.attack1;
  base.attack2 = !!snapshot.attack2;
  base.special = !!snapshot.special;
  base.airAttack = !!snapshot.airAttack;
  base.dodge = !!snapshot.dodge;
  base.grab = !!snapshot.grab;
  base.shield = !!snapshot.shield;
  base.dropThrough = !!snapshot.backward && !!snapshot.jump;
  return base;
}

function deriveDirectionalInfluence(
  input: InfluenceSnapshot,
  airborne: boolean,
): DirectionalInfluence {
  if (!airborne) {
    return { horizontal: 0, vertical: 0 };
  }
  const horizontal = input.leftward ? -1 : input.rightward ? 1 : 0;
  const vertical = input.jump ? 1 : input.backward ? -1 : 0;
  return { horizontal, vertical };
}

function playMoveStartAudio(
  move: MoveDefinition,
  audio: {
    playPunch: () => void;
    playKick: () => void;
    playSpecial: () => void;
  },
) {
  switch (move.category) {
    case "light":
      audio.playPunch();
      break;
    case "medium":
    case "heavy":
    case "grab":
      audio.playKick();
      break;
    case "special":
    case "aerial":
    default:
      audio.playSpecial();
      break;
  }
}
