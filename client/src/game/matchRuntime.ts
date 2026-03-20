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
  AIR_SPEED_MULTIPLIER,
  AIR_TURN_LOCK_PENALTY,
  AIR_STRAFE_IMPULSE,
  COMBO_WINDOW,
} from "./Physics";
import {
  CombatStateMachine,
  coreMoves,
  resolveHits,
  type FighterCombatState,
  type MoveDefinition,
} from "../combat";
import { applyKnockbackToVelocity, comboScale, toCombatState, type DirectionalInfluence } from "./combatBridge";
import type { CharacterState, GamePhase, MatchMode } from "../lib/stores/useFighting";
import { Controls } from "../lib/stores/useControls";
import type {
  CombatEvent,
  FighterPresentationSnapshot,
  FighterRuntimeSlot,
  RuntimeFrameSnapshot,
} from "./combatPresentation";
import {
  recordTelemetry,
  drainTelemetry,
  type CombatTelemetryEvent,
  type TelemetrySlot,
  type TelemetrySource,
} from "./combatTelemetry";
import { DeterministicRandom } from "./prng";
import type {
  DualPlayerIntentFrame,
  PlayerIntentFrame,
  Direction,
  PressStyle,
  DefendIntent,
} from "../input/intentTypes";
import {
  getMoveTableFor,
  resolveMoveFromIntent,
  pressToStrength,
  normalizeAttackDirection,
  toSpecialSlot,
  type MoveKey,
  type FighterMoveTable,
} from "../combat/moveTable";
import type { PlayerSlot } from "../hooks/use-player-controls";
import { useInputDebug } from "../lib/stores/useInputDebug";
import {
  boundPlaneVelocity,
  constrainToCombatPlane,
  resolveCombatPlaneDashVelocity,
  resolveCombatPlaneDistance,
  resolveCombatPlanePush,
  scaleCombatPlaneDepthSpeed,
} from "./combatReadability";

interface FightingActions {
  applyRuntimeFrame: (frame: RuntimeFrameSnapshot) => void;
  applyCombatEvents: (events: CombatEvent[]) => void;
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
  sendTelemetry?: (entries: CombatTelemetryEvent[]) => void;
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
  intents?: DualPlayerIntentFrame;
  gamePhase: GamePhase;
}

const DEFAULT_GUARD_VALUE = 80;
const DEFAULT_ROUND_TIME = 60;
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
const TECH_INPUT_WINDOW = 0.16;
const TECH_FAIL_GRACE = 0.06;
const TECH_SUCCESS_IFRAMES = 0.12;
const TECH_ROLL_DISTANCE = 1.2;
const HARD_KNOCKDOWN_LAG = 0.5;
const HITSTUN_BASE_FRAMES = 9;
const BLOCKSTUN_BASE_FRAMES = 7;
const INPUT_TELEMETRY_MIN_INTERVAL_MS = 1000;

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
  techWindow: number;
  techPending: boolean;
  techDirection: number;
  techInvuln: number;
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
  techWindow: 0,
  techPending: false,
  techDirection: 0,
  techInvuln: 0,
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

type ConfirmFlags = {
  hit: boolean;
  block: boolean;
  whiff: boolean;
};

const createConfirmFlags = (): ConfirmFlags => ({
  hit: false,
  block: false,
  whiff: false,
});

type DefendResolution = {
  guard: boolean;
  parry: boolean;
  roll: boolean;
  rollDir?: Direction;
  grab: boolean;
  tech: boolean;
};

const resolveDefendResolution = (
  snapshot: ControlSnapshot,
  frame?: PlayerIntentFrame,
): DefendResolution => {
  const intents = frame?.defend ?? [];
  const state: DefendResolution = {
    guard: false,
    parry: false,
    roll: false,
    rollDir: undefined,
    grab: false,
    tech: false,
  };
  for (const intent of intents) {
    switch (intent.mode) {
      case "guard":
        state.guard = true;
        break;
      case "parry":
        state.guard = true;
        state.parry = true;
        break;
      case "roll":
        state.roll = true;
        state.rollDir = intent.dir;
        break;
      case "grab":
        state.grab = true;
        break;
      case "tech":
        state.tech = true;
        break;
      default:
        break;
    }
  }
  return state;
};

const resolveIntentMoveId = (
  frame: PlayerIntentFrame | undefined,
  table: FighterMoveTable,
): string | undefined => {
  if (!frame) return undefined;
  if (frame.attack) {
    const dir = normalizeAttackDirection(frame.attack.dir);
    const strength = pressToStrength(frame.attack.press);
    const altitude = frame.attack.airborne ? "air" : "ground";
    const key = `attack:${dir}:${strength}:${altitude}` as MoveKey;
    const move = resolveMoveFromIntent(table, key);
    if (move) return move;
  }
  if (frame.special) {
    const slot = toSpecialSlot(frame.special.dir);
    const altitude = frame.special.airborne ? "air" : "ground";
    const key = `special:${slot}:${altitude}` as MoveKey;
    const move = resolveMoveFromIntent(table, key);
    if (move) return move;
  }
  const defendIntent = frame.defend?.find((intent) => intent.mode === "parry");
  if (defendIntent) {
    const key = `defend:${defendIntent.mode}` as MoveKey;
    const move = resolveMoveFromIntent(table, key);
    if (move) return move;
  }
  return undefined;
};

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
  private playerState: CharacterState;
  private cpuState: CharacterState;
  private playerCombatState: FighterCombatState;
  private cpuCombatState: FighterCombatState;
  private readonly playerHitRegistry = new Set<string>();
  private readonly cpuHitRegistry = new Set<string>();
  private playerPrevMoveId?: string;
  private cpuPrevMoveId?: string;
  private playerMoveInstanceId?: number;
  private cpuMoveInstanceId?: number;
  private playerMoveCounter = 0;
  private cpuMoveCounter = 0;
  private playerLastConfirmedMoveId?: string;
  private cpuLastConfirmedMoveId?: string;
  private playerMoveHadConfirm = false;
  private cpuMoveHadConfirm = false;
  private playerConfirmFlags: ConfirmFlags = createConfirmFlags();
  private cpuConfirmFlags: ConfirmFlags = createConfirmFlags();
  private playerHitLag = 0;
  private cpuHitLag = 0;
  private roundTimeRemaining = DEFAULT_ROUND_TIME;
  private maxRoundTime = DEFAULT_ROUND_TIME;
  private readonly cpuBrain = new CpuBrain({ style: CpuStyle.BALANCED });
  private playerTimers: ActionTimers = createActionTimers();
  private cpuTimers: ActionTimers = createActionTimers();
  private previousInputs: DualInputState = createEmptyInputs();
  private inputTelemetryState: Record<
    TelemetrySlot,
    { signature: string; timestamp: number }
  > = {
    player1: { signature: "", timestamp: Number.NEGATIVE_INFINITY },
    player2: { signature: "", timestamp: Number.NEGATIVE_INFINITY },
    cpu: { signature: "", timestamp: Number.NEGATIVE_INFINITY },
  };
  private eventId = 0;
  
  /** Deterministic RNG for gameplay decisions (air jumps, etc.) - seeded per match */
  private readonly rng: DeterministicRandom;

  constructor(private readonly deps: MatchRuntimeDeps, snapshot: { player: CharacterState; cpu: CharacterState }) {
    this.playerState = structuredClone(snapshot.player);
    this.cpuState = structuredClone(snapshot.cpu);
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
    this.playerState = structuredClone(snapshot.player);
    this.cpuState = structuredClone(snapshot.cpu);
    this.playerCombatState = toCombatState(snapshot.player);
    this.cpuCombatState = toCombatState(snapshot.cpu);
    this.playerHitRegistry.clear();
    this.cpuHitRegistry.clear();
    this.playerPrevMoveId = undefined;
    this.cpuPrevMoveId = undefined;
    this.playerMoveInstanceId = undefined;
    this.cpuMoveInstanceId = undefined;
    this.playerMoveCounter = 0;
    this.cpuMoveCounter = 0;
    this.playerLastConfirmedMoveId = undefined;
    this.cpuLastConfirmedMoveId = undefined;
    this.playerMoveHadConfirm = false;
    this.cpuMoveHadConfirm = false;
    this.playerConfirmFlags = createConfirmFlags();
    this.cpuConfirmFlags = createConfirmFlags();
    this.playerHitLag = 0;
    this.cpuHitLag = 0;
    this.roundTimeRemaining = DEFAULT_ROUND_TIME;
    this.maxRoundTime = DEFAULT_ROUND_TIME;
    this.playerTimers = createActionTimers();
    this.cpuTimers = createActionTimers();
    this.previousInputs = createEmptyInputs();
    this.inputTelemetryState = {
      player1: { signature: "", timestamp: Number.NEGATIVE_INFINITY },
      player2: { signature: "", timestamp: Number.NEGATIVE_INFINITY },
      cpu: { signature: "", timestamp: Number.NEGATIVE_INFINITY },
    };
    this.eventId = 0;
    
    // Reset RNG with new deterministic seed for match consistency
    const seed = this.createMatchSeed(snapshot);
    this.rng.reset(seed);
  }

  private setPosition(target: CharacterState, x: number, y: number, z: number) {
    target.position = [x, y, z];
  }

  private setVelocity(target: CharacterState, vx: number, vy: number, vz: number) {
    target.velocity = [vx, vy, vz];
  }

  private setDirection(target: CharacterState, direction: 1 | -1) {
    target.direction = direction;
  }

  private setJumpingState(target: CharacterState, jumping: boolean) {
    target.isJumping = jumping;
  }

  private setAttackingState(target: CharacterState, attacking: boolean) {
    if (attacking && !target.isAttacking && target.attackCooldown === 0) {
      target.attackCooldown = Math.max(target.attackCooldown, 500);
    }
    target.isAttacking = attacking;
  }

  private setBlockingState(target: CharacterState, blocking: boolean) {
    target.isBlocking = blocking;
  }

  private setDodgingState(target: CharacterState, dodging: boolean) {
    if (dodging && !target.isDodging) {
      target.dodgeCooldown = Math.max(target.dodgeCooldown, 20);
    }
    target.isDodging = dodging;
  }

  private setGrabbingState(target: CharacterState, grabbing: boolean) {
    if (grabbing && !target.isGrabbing) {
      target.grabCooldown = Math.max(target.grabCooldown, 30);
    }
    target.isGrabbing = grabbing;
  }

  private setTauntingState(target: CharacterState, taunting: boolean) {
    target.isTaunting = taunting;
  }

  private setAirAttackingState(target: CharacterState, airAttacking: boolean) {
    target.isAirAttacking = airAttacking;
    if (airAttacking && !target.isJumping) {
      target.isJumping = true;
    }
  }

  private resetAirJumps(target: CharacterState) {
    target.airJumpsLeft = 2;
  }

  private consumeAirJump(target: CharacterState) {
    if (target.airJumpsLeft <= 0) return false;
    target.airJumpsLeft -= 1;
    return true;
  }

  private handleSystem = (context: SystemContext) => {
    if (!context.commands.length) return;
    for (const command of context.commands) {
      if (command.type !== "match/frame") continue;
      this.processFrame(command.payload as FramePayload);
    }
  };

  private processFrame(payload: FramePayload) {
    const { audio, getDebugMode, getMatchMode } = this.deps;
    const { delta, inputs } = payload;
    const previousPlayer = this.playerState;
    const previousCpu = this.cpuState;
    const player = structuredClone(previousPlayer);
    const cpu = structuredClone(previousCpu);
    const events: CombatEvent[] = [];
    let playerGuardBreakThisFrame = false;
    let cpuGuardBreakThisFrame = false;
    const intentFrame = payload.intents;
    const playerIntentFrame = intentFrame?.player1;
    const rawOpponentIntentFrame = intentFrame?.player2;
    const matchMode = getMatchMode();
    const isLocalMultiplayer = matchMode === "local";
    const useCircularBounds = this.deps.getArenaStyle() === "contained";
    const opponentSlot = isLocalMultiplayer ? "player2" : "cpu";
    const opponentSource = isLocalMultiplayer ? "player" : "cpu";
    const playerControls = inputs.player1;
    const opponentControls = inputs.player2;
    const playerDefendState = resolveDefendResolution(playerControls, playerIntentFrame);
    const localOpponentDefendState = resolveDefendResolution(opponentControls, rawOpponentIntentFrame);
    const playerMoveTable = getMoveTableFor(player.fighterId);
    const cpuMoveTable = getMoveTableFor(cpu.fighterId);

    this.playerHitLag = applyHitLagTimer(this.playerHitLag, delta);
    this.cpuHitLag = applyHitLagTimer(this.cpuHitLag, delta);
    const playerInHitLag = this.playerHitLag > 0;
    const cpuInHitLag = this.cpuHitLag > 0;

    let jump = !!playerControls.jump;
    let forward = !!playerControls.forward;
    let backward = !!playerControls.backward;
    let leftward = !!playerControls.leftward;
    let rightward = !!playerControls.rightward;
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
    const guardActive = playerDefendState.guard || playerDefendState.parry;
    const dodgeActive = playerDefendState.roll;
    const grabActive = playerDefendState.grab;
    const taunt = false; // taunt no longer mapped to a verb; keep placeholder for future emotes
    const intentTech = playerDefendState.tech;
    const techPressed =
      intentTech ||
      (!!playerControls.attack && !prevPlayerControls.attack);

    const cpuControlState = isLocalMultiplayer
      ? snapshotToControlFrame(opponentControls, rawOpponentIntentFrame, localOpponentDefendState)
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
    const cpuDefendState = isLocalMultiplayer
      ? localOpponentDefendState
      : deriveCpuDefendState(cpuControlState);
    const cpuTechIntent = cpuDefendState.tech;
    const cpuTechPressed =
      cpuTechIntent || !!cpuControlState.dodge || !!cpuControlState.shield;

    const pushEvent = (event: any) => {
      events.push({ id: ++this.eventId, ...event } as CombatEvent);
    };

    const advanceComboState = (attacker: CharacterState, defender: CharacterState) => {
      if (attacker.comboTimer > 0) {
        attacker.comboCount = Math.min(10, attacker.comboCount + 1);
      } else {
        attacker.comboCount = 1;
      }
      attacker.comboTimer = COMBO_WINDOW;
      defender.comboCount = 0;
      defender.comboTimer = 0;
    };

    const applyResolvedDamage = (
      target: CharacterState,
      attacker: CharacterState,
      amount: number,
    ) => {
      if (amount <= 0) return;
      target.health = Math.max(0, target.health - amount);
      advanceComboState(attacker, target);
    };

    const updateCooldowns = (target: CharacterState, frameDelta: number) => {
      const deltaMs = frameDelta * 1000;
      target.attackCooldown = Math.max(0, target.attackCooldown - deltaMs);
      target.dodgeCooldown = Math.max(0, target.dodgeCooldown - deltaMs);
      target.grabCooldown = Math.max(0, target.grabCooldown - deltaMs);
      target.moveCooldown = Math.max(0, target.moveCooldown - deltaMs);
      target.comboTimer = Math.max(0, target.comboTimer - deltaMs);
      if (target.comboTimer === 0) {
        target.comboCount = 0;
      }
    };
    this.roundTimeRemaining = Math.max(0, this.roundTimeRemaining - delta);

    const applyGuardDamageToPlayer = (amount: number) => {
      if (amount <= 0) return;
      const current = this.playerCombatState.guardMeter;
      const next = Math.max(0, current - amount);
      const guardBroken = current > GUARD_BREAK_THRESHOLD && next <= GUARD_BREAK_THRESHOLD;
      this.playerCombatState.guardMeter = guardBroken
        ? DEFAULT_GUARD_VALUE * GUARD_BREAK_RECOVERY_RATIO
        : next;
      if (guardBroken) {
          this.setBlockingState(player, false);
          this.setDodgingState(player, false);
          this.setAttackingState(player, false);
          applyResolvedDamage(player, cpu, 5);
          this.playerCombatState.action = "hitstun";
          this.playerCombatState.hitstunFrames = Math.max(
            this.playerCombatState.hitstunFrames,
            GUARD_BREAK_STUN * 60,
          );
          this.playerCombatState.moveId = undefined;
          this.playerCombatState.moveFrame = 0;
          this.setVelocity(
            player,
            player.velocity[0] - player.direction * 0.35,
            Math.max(player.velocity[1], 0.2),
            player.velocity[2],
          );
          this.playerTimers.guardBreak = GUARD_BREAK_STUN;
          playerGuardBreakThisFrame = true;
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
          this.setBlockingState(cpu, false);
          this.setDodgingState(cpu, false);
          this.setAttackingState(cpu, false);
          applyResolvedDamage(cpu, player, 5);
          this.cpuCombatState.action = "hitstun";
          this.cpuCombatState.hitstunFrames = Math.max(
            this.cpuCombatState.hitstunFrames,
            GUARD_BREAK_STUN * 60,
          );
          this.cpuCombatState.moveId = undefined;
          this.cpuCombatState.moveFrame = 0;
          this.setVelocity(
            cpu,
            cpu.velocity[0] + cpu.direction * 0.35,
            Math.max(cpu.velocity[1], 0.2),
            cpu.velocity[2],
          );
          this.cpuTimers.guardBreak = GUARD_BREAK_STUN;
          cpuGuardBreakThisFrame = true;
          audio.playHit();
          this.deps.onImpact?.(0.6);
        }
        this.cpuTimers.guardRegenDelay = GUARD_REGEN_DELAY;
      };

    const playerIsAirborne = player.position[1] > 0.15 || player.isJumping;
    const cpuIsAirborne = cpu.position[1] > 0.15 || cpu.isJumping;
    const cpuIntentFrame = isLocalMultiplayer
      ? rawOpponentIntentFrame
      : buildCpuIntentFrame(cpuControlState, cpuIsAirborne);
    const playerDirectionalInfluence = deriveDirectionalInfluence(playerControls, playerIsAirborne);
    const cpuDirectionalInfluence = deriveDirectionalInfluence(cpuControlState, cpuIsAirborne);
    this.advancePlayerTimers(delta, player, cpu, applyResolvedDamage);
    this.advanceCpuTimers(delta, player, cpu, applyResolvedDamage);

    const intentMoveId = resolveIntentMoveId(playerIntentFrame, playerMoveTable);
    const requestedMove = intentMoveId ? coreMoves[intentMoveId] : undefined;

    const machineInputs: Record<string, boolean> = requestedMove ? { [requestedMove.id]: true } : {};
    machineInputs["confirm-hit"] = this.playerConfirmFlags.hit;
    machineInputs["confirm-block"] = this.playerConfirmFlags.block;
    machineInputs["confirm-whiff"] = this.playerConfirmFlags.whiff;
    this.playerConfirmFlags = createConfirmFlags();
    if (playerDefendState.roll) {
      machineInputs.dodge = true;
    }
    const playerMoveLabel = intentMoveId ?? this.playerCombatState.moveId;
    this.updateInputDebugOverlay(
      "player1",
      playerIntentFrame,
      playerDefendState,
      playerMoveLabel,
      !playerIsAirborne,
    );
    this.recordInputTelemetry(
      "player1",
      "player",
      playerIntentFrame,
      playerDefendState,
      playerMoveLabel,
      !playerIsAirborne,
    );

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
      if (this.playerPrevMoveId) {
        pushEvent({
          type: "moveEnd",
          slot: "player",
          moveId: this.playerPrevMoveId,
          moveInstanceId: this.playerMoveInstanceId,
          reason: updatedCombatState.moveId ? "cancel" : "complete",
        });
        if (!this.playerMoveHadConfirm) {
          this.playerConfirmFlags.whiff = true;
        }
      }
      this.playerHitRegistry.clear();
      if (updatedCombatState.moveId) {
        const moveDef = coreMoves[updatedCombatState.moveId];
        this.playerMoveCounter += 1;
        this.playerMoveInstanceId = this.playerMoveCounter;
        this.playerMoveHadConfirm = false;
        player.lastStartedMoveId = updatedCombatState.moveId;
        pushEvent({
          type: "moveStart",
          slot: "player",
          moveId: updatedCombatState.moveId,
          moveInstanceId: this.playerMoveInstanceId,
        });
        if (moveDef) {
          playMoveStartAudio(moveDef, {
            playPunch: audio.playPunch,
            playKick: audio.playKick,
            playSpecial: audio.playSpecial,
          });
        }
      } else {
        this.playerMoveInstanceId = undefined;
      }
      this.playerPrevMoveId = updatedCombatState.moveId;
    }

    this.playerCombatState = updatedCombatState;
    const playerAction = updatedCombatState.action;
    this.setAttackingState(player, playerAction === "attack");
    this.setDodgingState(player, playerAction === "dodge");
    this.setAirAttackingState(player, updatedCombatState.inAir && playerAction === "attack");

    if (updatedCombatState.moveId) {
      const moveDef = coreMoves[updatedCombatState.moveId];
      if (moveDef) {
        const defenderMove = cpuStateSnapshot.moveId ? coreMoves[cpuStateSnapshot.moveId] : undefined;
        const hits = resolveHits({
          attacker: updatedCombatState,
          defender: cpuStateSnapshot,
          move: moveDef,
          defenderMove,
          scaledDamage: comboScale(player.comboCount),
        });

        const newHits = hits.filter((hit) =>
          !this.playerHitRegistry.has(`${this.playerMoveInstanceId ?? 0}:${hit.hitboxId}`),
        );

        if (newHits.length) {
          let maxDamage = 0;
          newHits.forEach((hit) => {
            const defenderInvulnerable = isCombatInvulnerable(
              this.cpuCombatState,
              defenderMove,
              this.cpuTimers,
            );
            if (defenderInvulnerable) {
              return;
            }
            const defenderArmored = isCombatArmored(this.cpuCombatState, defenderMove);
            const blocking = cpu.isBlocking;
            const baseDamage = Math.round(hit.damage);
            maxDamage = Math.max(maxDamage, baseDamage);
            this.playerMoveHadConfirm = true;
            this.playerLastConfirmedMoveId = hit.moveId;
            if (blocking) {
              const chip = Math.max(
                MIN_CHIP_DAMAGE,
                Math.round(baseDamage * CHIP_DAMAGE_RATIO),
              );
              applyResolvedDamage(cpu, player, chip);
              applyGuardDamageToCpu(hit.guardDamage);
              this.cpuTimers.guardRegenDelay = GUARD_REGEN_DELAY;
              audio.playBlock();
              this.playerConfirmFlags.block = true;
              this.cpuCombatState.blockstunFrames = Math.max(
                this.cpuCombatState.blockstunFrames,
                computeBlockstunFrames(hit),
              );
              this.cpuCombatState.action = "blockstun";
              this.cpuCombatState.moveId = undefined;
              this.cpuCombatState.moveFrame = 0;
            } else {
              applyResolvedDamage(cpu, player, baseDamage);
              if (hit.causesTrip) {
                this.scheduleTrip("cpu", hit.knockbackVector[0]);
              }
              this.playerConfirmFlags.hit = true;
              if (!defenderArmored || moveDef.hitboxes.find((entry) => entry.id === hit.hitboxId)?.ignoresArmor) {
                this.cpuCombatState.hitstunFrames = Math.max(
                  this.cpuCombatState.hitstunFrames,
                  computeHitstunFrames(hit),
                );
                this.cpuCombatState.action = "hitstun";
                this.cpuCombatState.moveId = undefined;
                this.cpuCombatState.moveFrame = 0;
              }
            }
            let [vx, vy, vz] = applyKnockbackToVelocity(cpu, hit, cpuDirectionalInfluence);
            if (blocking) {
              const push =
                Math.min(
                  BLOCK_PUSH_MAX,
                  baseDamage * BLOCK_PUSH_SCALE + Math.hypot(...hit.knockbackVector),
                ) || 0;
              if (push > 0) {
                const dx = cpu.position[0] - player.position[0];
                const dz = cpu.position[2] - player.position[2];
                const [pushX, pushZ] = resolveCombatPlanePush(dx, dz, push);
                vx += pushX;
                vz += pushZ;
              }
            }
            this.setVelocity(cpu, vx, vy, vz);
            this.setDirection(cpu, hit.knockbackVector[0] < 0 ? -1 : 1);
            this.playerHitRegistry.add(`${this.playerMoveInstanceId ?? 0}:${hit.hitboxId}`);
            pushEvent({
              type: "hit",
              attacker: "player",
              defender: "cpu",
              moveId: hit.moveId,
              moveInstanceId: this.playerMoveInstanceId,
              hitboxId: hit.hitboxId,
              blocked: blocking,
              damage: blocking
                ? Math.max(MIN_CHIP_DAMAGE, Math.round(baseDamage * CHIP_DAMAGE_RATIO))
                : baseDamage,
              impact: Math.min(1.5, baseDamage / 8),
            });
            recordTelemetry({
              type: "hit",
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
      }
    } else {
      this.playerHitRegistry.clear();
    }

    const cpuIntentMoveId = resolveIntentMoveId(cpuIntentFrame, cpuMoveTable);
    const cpuRequestedMove = cpuIntentMoveId ? coreMoves[cpuIntentMoveId] : undefined;
    const cpuMachineInputs: Record<string, boolean> = cpuRequestedMove ? { [cpuRequestedMove.id]: true } : {};
    cpuMachineInputs["confirm-hit"] = this.cpuConfirmFlags.hit;
    cpuMachineInputs["confirm-block"] = this.cpuConfirmFlags.block;
    cpuMachineInputs["confirm-whiff"] = this.cpuConfirmFlags.whiff;
    this.cpuConfirmFlags = createConfirmFlags();
    const cpuRollActive = cpuDefendState.roll;
    if (cpuRollActive) {
      cpuMachineInputs.dodge = true;
    }
    const opponentMoveLabel = cpuIntentMoveId ?? this.cpuCombatState.moveId;
    if (isLocalMultiplayer) {
      this.updateInputDebugOverlay(
        "player2",
        cpuIntentFrame,
        cpuDefendState,
        opponentMoveLabel,
        !cpuIsAirborne,
      );
    } else {
      useInputDebug.getState().clearSlot("player2");
    }
    this.recordInputTelemetry(
      isLocalMultiplayer ? "player2" : "cpu",
      isLocalMultiplayer ? "player" : "cpu",
      cpuIntentFrame,
      cpuDefendState,
      opponentMoveLabel,
      !cpuIsAirborne,
    );
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
      if (this.cpuPrevMoveId) {
        pushEvent({
          type: "moveEnd",
          slot: "cpu",
          moveId: this.cpuPrevMoveId,
          moveInstanceId: this.cpuMoveInstanceId,
          reason: cpuUpdatedState.moveId ? "cancel" : "complete",
        });
        if (!this.cpuMoveHadConfirm) {
          this.cpuConfirmFlags.whiff = true;
        }
      }
      this.cpuHitRegistry.clear();
      if (cpuUpdatedState.moveId) {
        const moveDef = coreMoves[cpuUpdatedState.moveId];
        this.cpuMoveCounter += 1;
        this.cpuMoveInstanceId = this.cpuMoveCounter;
        this.cpuMoveHadConfirm = false;
        cpu.lastStartedMoveId = cpuUpdatedState.moveId;
        pushEvent({
          type: "moveStart",
          slot: "cpu",
          moveId: cpuUpdatedState.moveId,
          moveInstanceId: this.cpuMoveInstanceId,
        });
        if (moveDef) {
          playMoveStartAudio(moveDef, {
            playPunch: audio.playPunch,
            playKick: audio.playKick,
            playSpecial: audio.playSpecial,
          });
        }
      } else {
        this.cpuMoveInstanceId = undefined;
      }
      this.cpuPrevMoveId = cpuUpdatedState.moveId;
    }
    this.cpuCombatState = cpuUpdatedState;
    const cpuAction = cpuUpdatedState.action;
    this.setAttackingState(cpu, cpuAction === "attack");
    this.setDodgingState(cpu, cpuAction === "dodge");
    this.setAirAttackingState(cpu, cpuUpdatedState.inAir && cpuAction === "attack");
    const cpuBlocking = cpuControlState.shield && this.cpuCombatState.guardMeter > 0;
    this.setBlockingState(cpu, cpuBlocking);
    if (cpuBlocking) {
      this.cpuCombatState.guardMeter = Math.max(
        0,
        this.cpuCombatState.guardMeter - GUARD_HOLD_DRAIN * delta,
      );
      this.cpuTimers.guardRegenDelay = GUARD_REGEN_DELAY;
    }
    if (cpuUpdatedState.moveId) {
      const moveDef = coreMoves[cpuUpdatedState.moveId];
      if (moveDef) {
        const defenderMove = this.playerCombatState.moveId
          ? coreMoves[this.playerCombatState.moveId]
          : undefined;
        const hits = resolveHits({
          attacker: cpuUpdatedState,
          defender: this.playerCombatState,
          move: moveDef,
          defenderMove,
          scaledDamage: comboScale(cpu.comboCount),
        });
        const cpuNewHits = hits.filter((hit) =>
          !this.cpuHitRegistry.has(`${this.cpuMoveInstanceId ?? 0}:${hit.hitboxId}`),
        );
        if (cpuNewHits.length) {
          let maxDamage = 0;
          cpuNewHits.forEach((hit) => {
            const defenderInvulnerable = isCombatInvulnerable(
              this.playerCombatState,
              defenderMove,
              this.playerTimers,
            );
            if (defenderInvulnerable) {
              return;
            }
            const defenderArmored = isCombatArmored(this.playerCombatState, defenderMove);
            const blocking = player.isBlocking;
            const baseDamage = Math.round(hit.damage);
            maxDamage = Math.max(maxDamage, baseDamage);
            this.cpuMoveHadConfirm = true;
            this.cpuLastConfirmedMoveId = hit.moveId;
            if (blocking) {
              const chip = Math.max(
                MIN_CHIP_DAMAGE,
                Math.round(baseDamage * CHIP_DAMAGE_RATIO),
              );
              applyResolvedDamage(player, cpu, chip);
              applyGuardDamageToPlayer(hit.guardDamage);
              this.playerTimers.guardRegenDelay = GUARD_REGEN_DELAY;
              audio.playBlock();
              this.cpuConfirmFlags.block = true;
              this.playerCombatState.blockstunFrames = Math.max(
                this.playerCombatState.blockstunFrames,
                computeBlockstunFrames(hit),
              );
              this.playerCombatState.action = "blockstun";
              this.playerCombatState.moveId = undefined;
              this.playerCombatState.moveFrame = 0;
            } else {
              applyResolvedDamage(player, cpu, baseDamage);
              if (hit.causesTrip) {
                this.scheduleTrip("player", hit.knockbackVector[0]);
              }
              this.cpuConfirmFlags.hit = true;
              if (!defenderArmored || moveDef.hitboxes.find((entry) => entry.id === hit.hitboxId)?.ignoresArmor) {
                this.playerCombatState.hitstunFrames = Math.max(
                  this.playerCombatState.hitstunFrames,
                  computeHitstunFrames(hit),
                );
                this.playerCombatState.action = "hitstun";
                this.playerCombatState.moveId = undefined;
                this.playerCombatState.moveFrame = 0;
              }
            }
            let [vx, vy, vz] = applyKnockbackToVelocity(player, hit, playerDirectionalInfluence);
            if (blocking) {
              const push =
                Math.min(
                  BLOCK_PUSH_MAX,
                  baseDamage * BLOCK_PUSH_SCALE + Math.hypot(...hit.knockbackVector),
                ) || 0;
              if (push > 0) {
                const dx = player.position[0] - cpu.position[0];
                const dz = player.position[2] - cpu.position[2];
                const [pushX, pushZ] = resolveCombatPlanePush(dx, dz, push);
                vx += pushX;
                vz += pushZ;
              }
            }
            this.setVelocity(player, vx, vy, vz);
            this.setDirection(player, hit.knockbackVector[0] < 0 ? -1 : 1);
            this.cpuHitRegistry.add(`${this.cpuMoveInstanceId ?? 0}:${hit.hitboxId}`);
            pushEvent({
              type: "hit",
              attacker: "cpu",
              defender: "player",
              moveId: hit.moveId,
              moveInstanceId: this.cpuMoveInstanceId,
              hitboxId: hit.hitboxId,
              blocked: blocking,
              damage: blocking
                ? Math.max(MIN_CHIP_DAMAGE, Math.round(baseDamage * CHIP_DAMAGE_RATIO))
                : baseDamage,
              impact: Math.min(1.5, baseDamage / 8),
            });
            recordTelemetry({
              type: "hit",
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
      }
    } else {
      this.cpuHitRegistry.clear();
    }

    const cpuDx = player.position[0] - cpu.position[0];
    const cpuDz = player.position[2] - cpu.position[2];
    const planarDistance = resolveCombatPlaneDistance(cpuDx, cpuDz);

    if (
      cpuControlState.grab &&
      cpu.grabCooldown <= 0 &&
      planarDistance < 1.4 &&
      this.cpuTimers.grab <= 0
    ) {
      this.setGrabbingState(cpu, true);
      audio.playGrab();
      this.cpuTimers.grab = GRAB_RESOLVE_DELAY;
      this.cpuTimers.grabPending = true;
    }

    this.updateCpuMovement(
      cpuControlState,
      player,
      cpu,
      delta,
      cpuInHitLag,
      audio,
      cpuTechPressed,
      useCircularBounds,
      pushEvent,
    );
    this.updatePlayerMovement(
      {
        jump,
        jumpPressed,
        jumpReleased,
        justPressedHorizontal,
        techPressed,
        forward,
        backward,
        leftward,
        rightward,
        shield: guardActive,
        dodge: dodgeActive,
        grab: grabActive,
        taunt,
      },
      player,
      cpu,
      delta,
      playerInHitLag,
      audio,
      useCircularBounds,
      pushEvent,
    );

    updateCooldowns(player, delta);
    updateCooldowns(cpu, delta);
    const playerJustLanded = previousPlayer.isJumping && !player.isJumping;
    const cpuJustLanded = previousCpu.isJumping && !cpu.isJumping;
    if (playerJustLanded) {
      pushEvent({
        type: "land",
        slot: "player",
        intensity: Math.min(1, Math.abs(previousPlayer.velocity[1]) + Math.hypot(previousPlayer.velocity[0], previousPlayer.velocity[2]) * 0.3),
      });
    }
    if (cpuJustLanded) {
      pushEvent({
        type: "land",
        slot: "cpu",
        intensity: Math.min(1, Math.abs(previousCpu.velocity[1]) + Math.hypot(previousCpu.velocity[0], previousCpu.velocity[2]) * 0.3),
      });
    }
    if (playerGuardBreakThisFrame) {
      pushEvent({ type: "guardBreak", slot: "player" });
    }
    if (cpuGuardBreakThisFrame) {
      pushEvent({ type: "guardBreak", slot: "cpu" });
    }
    this.playerCombatState.comboCounter = player.comboCount;
    this.cpuCombatState.comboCounter = cpu.comboCount;
    this.playerState = player;
    this.cpuState = cpu;
    this.deps.fighting.applyCombatEvents(events);
    this.deps.fighting.applyRuntimeFrame({
      player: this.createPresentationSnapshot("player", player, this.playerCombatState, {
        hitLag: this.playerHitLag,
        timers: this.playerTimers,
        moveInstanceId: this.playerMoveInstanceId,
        lastConfirmedMoveId: this.playerLastConfirmedMoveId,
        justStartedMove: Boolean(events.find((event) => event.type === "moveStart" && event.slot === "player")),
        justLanded: playerJustLanded,
        justHit: Boolean(events.find((event) => event.type === "hit" && event.attacker === "player" && !event.blocked)),
        justBlocked: Boolean(events.find((event) => event.type === "hit" && event.attacker === "cpu" && event.blocked)),
        justGuardBroke: playerGuardBreakThisFrame,
      }),
      cpu: this.createPresentationSnapshot("cpu", cpu, this.cpuCombatState, {
        hitLag: this.cpuHitLag,
        timers: this.cpuTimers,
        moveInstanceId: this.cpuMoveInstanceId,
        lastConfirmedMoveId: this.cpuLastConfirmedMoveId,
        justStartedMove: Boolean(events.find((event) => event.type === "moveStart" && event.slot === "cpu")),
        justLanded: cpuJustLanded,
        justHit: Boolean(events.find((event) => event.type === "hit" && event.attacker === "cpu" && !event.blocked)),
        justBlocked: Boolean(events.find((event) => event.type === "hit" && event.attacker === "player" && event.blocked)),
        justGuardBroke: cpuGuardBreakThisFrame,
      }),
      roundTimeRemaining: this.roundTimeRemaining,
      maxRoundTime: this.maxRoundTime,
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
    techPressed: boolean,
    useCircularBounds: boolean,
    pushEvent: (event: any) => void,
  ) {
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
    const cpuGroundedNow = cpu.position[1] <= cpuPlatformHeight + 0.02;
    if (
      cpuHorizontalIntent &&
      cpuJustPressedHorizontal &&
      cpuGroundedNow &&
      cpuCanAct &&
      this.cpuTimers.dashCooldown <= 0
    ) {
      const dirX = (controlState.rightward ? 1 : 0) - (controlState.leftward ? 1 : 0);
      const dirZ = (controlState.backward ? 1 : 0) - (controlState.forward ? 1 : 0);
      [cpuVX, cpuVZ] = resolveCombatPlaneDashVelocity(
        dirX,
        dirZ,
        CPU_SPEED * INITIAL_DASH_MULTIPLIER,
      );
      this.cpuTimers.dashCooldown = INITIAL_DASH_COOLDOWN;
      this.cpuTimers.turnLock = INITIAL_DASH_TURN_LOCK;
    }

    if (cpuControlScale > 0 && (cpuCanAct || cpu.isJumping)) {
      const accelBase = cpu.isJumping ? AIR_ACCELERATION : GROUND_ACCELERATION;
      const turnPenalty =
        this.cpuTimers.turnLock > 0
          ? cpu.isJumping
            ? AIR_TURN_LOCK_PENALTY
            : 0.55
          : 1;
      const accel = accelBase * turnPenalty * delta;
      const decel = (cpu.isJumping ? AIR_DECELERATION : GROUND_DECELERATION) * delta;
      const maxSpeed =
        (cpu.isJumping ? CPU_SPEED * AIR_SPEED_MULTIPLIER : CPU_SPEED) * cpuControlScale;

      let targetVX = 0;
      if (controlState.leftward) {
        targetVX = -maxSpeed;
        cpuDirection = -1;
      } else if (controlState.rightward) {
        targetVX = maxSpeed;
        cpuDirection = 1;
      }
      cpuVX = moveTowards(cpuVX, targetVX, targetVX === 0 ? decel : accel);
      if (cpu.isJumping && !controlState.leftward && !controlState.rightward) {
        cpuVX *= 0.9;
      }
      cpuVX = Math.max(-maxSpeed, Math.min(maxSpeed, cpuVX));

      let targetVZ = 0;
      if (controlState.forward) {
        targetVZ = -scaleCombatPlaneDepthSpeed(maxSpeed);
      } else if (controlState.backward) {
        targetVZ = scaleCombatPlaneDepthSpeed(maxSpeed);
      }
      cpuVZ = moveTowards(cpuVZ, targetVZ, targetVZ === 0 ? decel : accel);
      if (cpu.isJumping && !controlState.forward && !controlState.backward) {
        cpuVZ *= 0.9;
      }
      cpuVZ = Math.max(-maxSpeed, Math.min(maxSpeed, cpuVZ));

      if (cpu.isJumping && cpuJustPressedHorizontal) {
        if (controlState.leftward) {
          cpuVX -= AIR_STRAFE_IMPULSE;
        } else if (controlState.rightward) {
          cpuVX += AIR_STRAFE_IMPULSE;
        }
        if (controlState.forward) {
          cpuVZ -= scaleCombatPlaneDepthSpeed(AIR_STRAFE_IMPULSE);
        } else if (controlState.backward) {
          cpuVZ += scaleCombatPlaneDepthSpeed(AIR_STRAFE_IMPULSE);
        }
      }
    }

    if (controlState.jump && !cpu.isJumping && cpu.position[1] <= 0.01 && cpuCanAct) {
      cpuVY = JUMP_FORCE;
      this.setJumpingState(cpu, true);
    } else if (controlState.jump && cpu.isJumping && cpu.airJumpsLeft > 0 && this.rng.nextBool(0.15)) {
      cpuVY = JUMP_FORCE * 0.9;
      this.consumeAirJump(cpu);
    }

    if (controlState.shield && cpuCanAct && this.cpuCombatState.guardMeter > 0) {
      this.setBlockingState(cpu, true);
      this.cpuCombatState.guardMeter = Math.max(0, this.cpuCombatState.guardMeter - 12 * delta);
    } else if (cpu.isBlocking) {
      this.setBlockingState(cpu, false);
    }

    if (controlState.dodge && cpuCanAct && cpu.dodgeCooldown <= 0) {
      const chainCost =
        DODGE_BASE_STAMINA_COST +
        Math.max(0, this.cpuTimers.dodgeChainCount) * DODGE_CHAIN_COST;
      if (this.cpuCombatState.staminaMeter >= chainCost) {
        this.setDodgingState(cpu, true);
        const dirX = (controlState.rightward ? 1 : 0) - (controlState.leftward ? 1 : 0);
        const dirZ = (controlState.backward ? 1 : 0) - (controlState.forward ? 1 : 0);
        const dodgeSpeed = CPU_SPEED * 2;
        if (dirX === 0 && dirZ === 0) {
          cpuVX = cpuDirection * dodgeSpeed;
        } else {
          [cpuVX, cpuVZ] = resolveCombatPlaneDashVelocity(dirX, dirZ, dodgeSpeed);
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
    const cpuLandedThisFrame = cpuOnGround && cpu.isJumping;
    if (cpuLandedThisFrame) {
      this.setJumpingState(cpu, false);
      this.resetAirJumps(cpu);
      audio.playLand();
      this.applyLandingLag("cpu");
    }

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
    let [boundedX, boundedY, boundedZ] = cpuBounds.position;
    let [boundedVX, boundedVY, boundedVZ] = cpuBounds.velocity;
    boundedZ = constrainToCombatPlane(boundedZ, delta);
    boundedVZ = boundPlaneVelocity(boundedVZ, boundedZ);
    const cpuGrounded = boundedY <= getPlatformHeight(boundedX, boundedZ) + 0.02;
    if (cpuGrounded || this.cpuTimers.techPending) {
      const techOutcome = this.resolveTechLandingOutcome(
        "cpu",
        {
          grounded: cpuGrounded,
          techPressed,
          leftward: controlState.leftward,
          rightward: controlState.rightward,
        },
        [boundedX, boundedY, boundedZ],
        [boundedVX, boundedVY, boundedVZ],
        useCircularBounds,
      );
      [boundedX, boundedY, boundedZ] = techOutcome.position;
      [boundedVX, boundedVY, boundedVZ] = techOutcome.velocity;
      if (techOutcome.result) {
        pushEvent({ type: "tech", slot: "cpu", result: techOutcome.result });
      }
    }

    this.setPosition(cpu, boundedX, boundedY, boundedZ);
    this.setVelocity(cpu, boundedVX, boundedVY, boundedVZ);
    this.setDirection(cpu, cpuDirection);
  }

  private updatePlayerMovement(
    input: {
      jump: boolean;
      jumpPressed: boolean;
      jumpReleased: boolean;
      justPressedHorizontal: boolean;
      techPressed: boolean;
      forward: boolean;
      backward: boolean;
      leftward: boolean;
      rightward: boolean;
      shield: boolean;
      dodge: boolean;
      grab: boolean;
      taunt: boolean;
    },
    player: CharacterState,
    cpu: CharacterState,
    delta: number,
    playerInHitLag: boolean,
    audio: AudioActions,
    useCircularBounds: boolean,
    pushEvent: (event: any) => void,
  ) {
    const { getDebugMode } = this.deps;
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
      [newVX, newVZ] = resolveCombatPlaneDashVelocity(
        dirX,
        dirZ,
        PLAYER_SPEED * INITIAL_DASH_MULTIPLIER,
      );
      this.playerTimers.dashCooldown = INITIAL_DASH_COOLDOWN;
      this.playerTimers.turnLock = INITIAL_DASH_TURN_LOCK;
    }
    this.playerTimers.horizontalHeld = horizontalIntent;

    const controlScale = playerInHitLag ? 0 : 1;
    if (canAct || player.isJumping) {
      const accelBase = player.isJumping ? AIR_ACCELERATION : GROUND_ACCELERATION;
      const turnPenalty =
        this.playerTimers.turnLock > 0
          ? player.isJumping
            ? AIR_TURN_LOCK_PENALTY
            : 0.55
          : 1;
      const accel = accelBase * turnPenalty * delta;
      const decel = (player.isJumping ? AIR_DECELERATION : GROUND_DECELERATION) * delta;
      const maxSpeed =
        (player.isJumping ? PLAYER_SPEED * AIR_SPEED_MULTIPLIER : PLAYER_SPEED) * controlScale;

      let targetVX = 0;
      if (input.leftward) {
        targetVX = -maxSpeed;
        newDirection = -1;
      } else if (input.rightward) {
        targetVX = maxSpeed;
        newDirection = 1;
      }
      newVX = moveTowards(newVX, targetVX, targetVX === 0 ? decel : accel);
      if (player.isJumping && !input.leftward && !input.rightward) {
        newVX *= 0.9;
      }
      newVX = Math.max(-maxSpeed, Math.min(maxSpeed, newVX));

      let targetVZ = 0;
      if (input.forward) {
        targetVZ = -scaleCombatPlaneDepthSpeed(maxSpeed);
      } else if (input.backward) {
        targetVZ = scaleCombatPlaneDepthSpeed(maxSpeed);
      }
      newVZ = moveTowards(newVZ, targetVZ, targetVZ === 0 ? decel : accel);
      if (player.isJumping && !input.forward && !input.backward) {
        newVZ *= 0.9;
      }
      newVZ = Math.max(-maxSpeed, Math.min(maxSpeed, newVZ));

      if (player.isJumping && input.justPressedHorizontal) {
        if (input.leftward) {
          newVX -= AIR_STRAFE_IMPULSE;
        } else if (input.rightward) {
          newVX += AIR_STRAFE_IMPULSE;
        }
        if (input.forward) {
          newVZ -= scaleCombatPlaneDepthSpeed(AIR_STRAFE_IMPULSE);
        } else if (input.backward) {
          newVZ += scaleCombatPlaneDepthSpeed(AIR_STRAFE_IMPULSE);
        }
      }
    }

    const jumpBuffered = this.playerTimers.jumpBuffer > 0;
    const canUseCoyote = groundedNow || this.playerTimers.coyote > 0;
    if ((input.jumpPressed || jumpBuffered) && !player.isJumping && canUseCoyote && canAct) {
      newVY = JUMP_FORCE;
      this.setJumpingState(player, true);
      audio.playJump();
      this.resetAirJumps(player);
      this.playerTimers.jumpBuffer = 0;
      this.playerTimers.coyote = 0;
      this.playerTimers.shortHopWindow = SHORT_HOP_WINDOW;
    } else if (input.jumpPressed && player.isJumping && player.airJumpsLeft > 0 && canAct) {
      newVY = JUMP_FORCE * 0.9;
      if (this.consumeAirJump(player)) {
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

    const landedThisFrame =
      player.isJumping &&
      (Math.abs(newY - platformHeight) < 0.1 || newY <= 0.01);
    if (landedThisFrame) {
      this.setJumpingState(player, false);
      this.resetAirJumps(player);
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
        this.setGrabbingState(player, true);
        audio.playGrab();
        this.playerTimers.grab = GRAB_RESOLVE_DELAY;
        this.playerTimers.grabPending = true;
      } else if (input.taunt && !player.isTaunting && this.playerTimers.taunt <= 0) {
        this.setTauntingState(player, true);
        audio.playTaunt();
        this.playerTimers.taunt = TAUNT_DURATION;
        this.playerTimers.tauntActive = true;
      }
    }

    if (input.shield && canAct && this.playerCombatState.guardMeter > 0) {
      if (!player.isBlocking) {
        audio.playBlock();
      }
      this.setBlockingState(player, true);
      this.playerCombatState.guardMeter = Math.max(
        0,
        this.playerCombatState.guardMeter - GUARD_HOLD_DRAIN * delta,
      );
      this.playerTimers.guardRegenDelay = GUARD_REGEN_DELAY;
    } else if (player.isBlocking) {
      this.setBlockingState(player, false);
    }

    if (input.dodge && canAct && player.dodgeCooldown <= 0) {
      const chainCost =
        DODGE_BASE_STAMINA_COST +
        Math.max(0, this.playerTimers.dodgeChainCount) * DODGE_CHAIN_COST;
      if (this.playerCombatState.staminaMeter >= chainCost) {
        if (getDebugMode()) {
          console.log("Player DODGE");
        }
        this.setDodgingState(player, true);
        audio.playDodge();
        const dirX = (input.rightward ? 1 : 0) - (input.leftward ? 1 : 0);
        const dirZ = (input.backward ? 1 : 0) - (input.forward ? 1 : 0);
        const dodgeSpeed = PLAYER_SPEED * 2;
        if (dirX === 0 && dirZ === 0) {
          newVX = player.direction * dodgeSpeed;
        } else {
          [newVX, newVZ] = resolveCombatPlaneDashVelocity(dirX, dirZ, dodgeSpeed);
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
    const bounds = resolveCapsuleBounds([proposedX, newY, proposedZ], [newVX, newVY, newVZ], undefined, useCircularBounds);
    let [boundedX, boundedY, boundedZ] = bounds.position;
    let [boundedVX, boundedVY, boundedVZ] = bounds.velocity;
    boundedZ = constrainToCombatPlane(boundedZ, delta);
    boundedVZ = boundPlaneVelocity(boundedVZ, boundedZ);
    const groundedAfterMove =
      boundedY <= getPlatformHeight(boundedX, boundedZ) + 0.02;
    if (groundedAfterMove || this.playerTimers.techPending) {
      const techOutcome = this.resolveTechLandingOutcome(
        "player",
        {
          grounded: groundedAfterMove,
          techPressed: input.techPressed,
          leftward: input.leftward,
          rightward: input.rightward,
        },
        [boundedX, boundedY, boundedZ],
        [boundedVX, boundedVY, boundedVZ],
        useCircularBounds,
      );
      [boundedX, boundedY, boundedZ] = techOutcome.position;
      [boundedVX, boundedVY, boundedVZ] = techOutcome.velocity;
      if (techOutcome.result) {
        pushEvent({ type: "tech", slot: "player", result: techOutcome.result });
      }
    }

    this.setPosition(player, boundedX, boundedY, boundedZ);
    this.setVelocity(player, boundedVX, boundedVY, boundedVZ);
    this.setDirection(player, newDirection);
  }

  private createPresentationSnapshot(
    slot: FighterRuntimeSlot,
    state: CharacterState,
    combatState: FighterCombatState,
    meta: {
      hitLag: number;
      timers: ActionTimers;
      moveInstanceId?: number;
      lastConfirmedMoveId?: string;
      justStartedMove: boolean;
      justLanded: boolean;
      justHit: boolean;
      justBlocked: boolean;
      justGuardBroke: boolean;
    },
  ): FighterPresentationSnapshot {
    const move = combatState.moveId ? coreMoves[combatState.moveId] : undefined;
    const grounded = state.position[1] <= getPlatformHeight(state.position[0], state.position[2]) + 0.02;
    const inAir = !grounded || state.isJumping;
    const moveFrame = combatState.moveFrame ?? 0;
    const hitLagFrames = Math.max(0, Math.round(meta.hitLag * 60));
    const invulnerable = isCombatInvulnerable(combatState, move, meta.timers);
    const armored = isCombatArmored(combatState, move);
    const hardLocked =
      meta.timers.guardBreak > 0 ||
      meta.timers.landingLag > 0 ||
      combatState.hitstunFrames > 0 ||
      combatState.blockstunFrames > 0 ||
      hitLagFrames > 0;

    return {
      slot,
      fighterId: state.fighterId,
      health: state.health,
      position: state.position,
      velocity: state.velocity,
      facing: state.direction,
      grounded,
      inAir,
      action: combatState.action,
      moveId: combatState.moveId,
      moveInstanceId: meta.moveInstanceId,
      moveFrame,
      movePhase: derivePresentationMovePhase(move, moveFrame),
      hitLagFrames,
      hitstunFrames: Math.max(0, Math.ceil(combatState.hitstunFrames)),
      blockstunFrames: Math.max(0, Math.ceil(combatState.blockstunFrames)),
      landingLagFrames: Math.max(0, Math.ceil(meta.timers.landingLag * 60)),
      invulnerable,
      armored,
      canAct: !hardLocked && !state.isGrabbing && !state.isTaunting,
      guardBroken: meta.timers.guardBreak > 0,
      guardMeter: combatState.guardMeter,
      staminaMeter: combatState.staminaMeter,
      specialMeter: combatState.specialMeter,
      comboCounter: state.comboCount,
      comboTimer: state.comboTimer,
      attackCooldown: state.attackCooldown,
      dodgeCooldown: state.dodgeCooldown,
      grabCooldown: state.grabCooldown,
      moveCooldown: state.moveCooldown,
      isBlocking: state.isBlocking,
      isDodging: state.isDodging,
      isGrabbing: state.isGrabbing,
      isTaunting: state.isTaunting,
      isAirAttacking: state.isAirAttacking,
      airJumpsLeft: state.airJumpsLeft,
      lastStartedMoveId: state.lastStartedMoveId ?? combatState.moveId,
      lastConfirmedMoveId: meta.lastConfirmedMoveId,
      justStartedMove: meta.justStartedMove,
      justLanded: meta.justLanded,
      justHit: meta.justHit,
      justBlocked: meta.justBlocked,
      justParried: meta.justBlocked && state.lastStartedMoveId === "parry",
      justGuardBroke: meta.justGuardBroke,
    };
  }

  private flushTelemetry() {
    const telemetry = drainTelemetry();
    if (!telemetry.length) return;
    if (this.deps.sendTelemetry) {
      this.deps.sendTelemetry(telemetry);
    }
  }

  private advancePlayerTimers(
    delta: number,
    player: CharacterState,
    cpu: CharacterState,
    applyDamage: (
      target: CharacterState,
      attacker: CharacterState,
      amount: number,
    ) => void,
  ) {
    const { audio } = this.deps;

    const wasTraveling = this.playerTimers.dodgeTravelPhase > 0;
    if (this.playerTimers.dodgeInvuln > 0) {
      this.playerTimers.dodgeInvuln = Math.max(0, this.playerTimers.dodgeInvuln - delta);
    }
    if (this.playerTimers.dodgeTravelPhase > 0) {
      this.playerTimers.dodgeTravelPhase = Math.max(0, this.playerTimers.dodgeTravelPhase - delta);
      if (wasTraveling && this.playerTimers.dodgeTravelPhase === 0 && player.isDodging) {
        this.setDodgingState(player, false);
      }
    } else if (this.playerTimers.dodgeInvuln <= 0 && player.isDodging) {
      this.setDodgingState(player, false);
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
    if (this.playerTimers.techInvuln > 0) {
      this.playerTimers.techInvuln = Math.max(0, this.playerTimers.techInvuln - delta);
    }
    if (this.playerTimers.techWindow !== 0) {
      this.playerTimers.techWindow = Math.max(
        -TECH_FAIL_GRACE,
        this.playerTimers.techWindow - delta,
      );
    }

    if (this.playerTimers.grab > 0) {
      this.playerTimers.grab = Math.max(0, this.playerTimers.grab - delta);
    } else if (this.playerTimers.grabPending) {
      this.playerTimers.grabPending = false;
      this.setGrabbingState(player, false);
      const distanceToCpu = Math.abs(player.position[0] - cpu.position[0]);
      if (distanceToCpu < ATTACK_RANGE * 0.6) {
        applyDamage(cpu, player, 20);
        audio.playThrow();
        this.setVelocity(
          cpu,
          cpu.velocity[0] + player.direction * 0.4,
          Math.max(cpu.velocity[1], 0.4),
          cpu.velocity[2],
        );
        this.setJumpingState(cpu, true);
      }
    }

    if (this.playerTimers.taunt > 0) {
      this.playerTimers.taunt = Math.max(0, this.playerTimers.taunt - delta);
      if (this.playerTimers.taunt === 0 && this.playerTimers.tauntActive) {
        this.playerTimers.tauntActive = false;
        this.setTauntingState(player, false);
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

  private advanceCpuTimers(
    delta: number,
    player: CharacterState,
    cpu: CharacterState,
    applyDamage: (
      target: CharacterState,
      attacker: CharacterState,
      amount: number,
    ) => void,
  ) {
    const { audio } = this.deps;

    const cpuWasTraveling = this.cpuTimers.dodgeTravelPhase > 0;
    if (this.cpuTimers.dodgeInvuln > 0) {
      this.cpuTimers.dodgeInvuln = Math.max(0, this.cpuTimers.dodgeInvuln - delta);
    }
    if (this.cpuTimers.dodgeTravelPhase > 0) {
      this.cpuTimers.dodgeTravelPhase = Math.max(0, this.cpuTimers.dodgeTravelPhase - delta);
      if (cpuWasTraveling && this.cpuTimers.dodgeTravelPhase === 0 && cpu.isDodging) {
        this.setDodgingState(cpu, false);
      }
    } else if (this.cpuTimers.dodgeInvuln <= 0 && cpu.isDodging) {
      this.setDodgingState(cpu, false);
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
    if (this.cpuTimers.techInvuln > 0) {
      this.cpuTimers.techInvuln = Math.max(0, this.cpuTimers.techInvuln - delta);
    }
    if (this.cpuTimers.techWindow !== 0) {
      this.cpuTimers.techWindow = Math.max(
        -TECH_FAIL_GRACE,
        this.cpuTimers.techWindow - delta,
      );
    }

    if (this.cpuTimers.grab > 0) {
      this.cpuTimers.grab = Math.max(0, this.cpuTimers.grab - delta);
    } else if (this.cpuTimers.grabPending) {
      this.cpuTimers.grabPending = false;
      this.setGrabbingState(cpu, false);
      const distanceToPlayer = Math.abs(player.position[0] - cpu.position[0]);
      if (distanceToPlayer < ATTACK_RANGE * 0.6) {
        applyDamage(player, cpu, 8);
        this.setVelocity(
          player,
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

  private resolveTechLandingOutcome(
    target: "player" | "cpu",
    context: {
      grounded: boolean;
      techPressed: boolean;
      leftward: boolean;
      rightward: boolean;
    },
    position: [number, number, number],
    velocity: [number, number, number],
    useCircularBounds: boolean,
  ): {
    position: [number, number, number];
    velocity: [number, number, number];
    result?: "success" | "fail";
  } {
    const timers = target === "player" ? this.playerTimers : this.cpuTimers;
    const combatState = target === "player" ? this.playerCombatState : this.cpuCombatState;
    if (!timers.techPending || !context.grounded) {
      return { position, velocity };
    }
    const withinWindow = timers.techWindow > -TECH_FAIL_GRACE;
    if (context.techPressed && withinWindow) {
      const preferredDir =
        context.leftward ? -1 : context.rightward ? 1 : timers.techDirection;
      const rollOffset = preferredDir * TECH_ROLL_DISTANCE;
      const candidate: [number, number, number] = [
        position[0] + rollOffset,
        position[1],
        position[2],
      ];
      const adjusted = resolveCapsuleBounds(
        candidate,
        velocity,
        undefined,
        useCircularBounds,
      );
      timers.techPending = false;
      timers.techWindow = 0;
      timers.landingLag = 0;
      timers.techInvuln = TECH_SUCCESS_IFRAMES;
      combatState.action = "tech";
      combatState.moveId = undefined;
      combatState.moveFrame = 0;
      this.recordTechTelemetry(target, "success", 0);
      return { ...adjusted, result: "success" };
    }
    if (timers.techWindow <= 0) {
      timers.techPending = false;
      timers.techWindow = 0;
      timers.landingLag = Math.max(timers.landingLag, HARD_KNOCKDOWN_LAG);
      combatState.action = "hitstun";
      this.recordTechTelemetry(target, "fail", timers.landingLag);
      return { position, velocity, result: "fail" };
    }
    return { position, velocity };
  }

  private scheduleTrip(target: "player" | "cpu", knockbackX: number) {
    const timers = target === "player" ? this.playerTimers : this.cpuTimers;
    timers.techWindow = TECH_INPUT_WINDOW;
    timers.techPending = true;
    timers.techDirection = Math.sign(knockbackX || 0);
  }

  private recordTechTelemetry(
    target: "player" | "cpu",
    result: "success" | "fail",
    landingLag: number,
  ) {
    const slot =
      target === "player"
        ? "player1"
        : this.deps.getMatchMode() === "local"
          ? "player2"
          : "cpu";
    recordTelemetry({
      type: "tech",
      source: target,
      slot,
      result,
      landingLag,
      timestamp: performance.now(),
    });
  }

  private updateInputDebugOverlay(
    slot: PlayerSlot,
    frame: PlayerIntentFrame | undefined,
    defend: DefendResolution,
    moveId: string | undefined,
    grounded: boolean,
  ) {
    const store = useInputDebug.getState();
    if (!frame) {
      store.updateSlot(slot, null);
      return;
    }
    const defendModes = summarizeDefendModes(defend);
    store.updateSlot(slot, {
      direction: frame.direction,
      grounded,
      attack: frame.attack
        ? {
            dir: frame.attack.dir,
            strength: pressToStrength(frame.attack.press),
            altitude: frame.attack.airborne ? "air" : "ground",
          }
        : undefined,
      special: frame.special
        ? {
            slot: toSpecialSlot(frame.special.dir),
            altitude: frame.special.airborne ? "air" : "ground",
          }
        : undefined,
      defendModes,
      moveId,
    });
  }

  private recordInputTelemetry(
    slot: TelemetrySlot,
    source: TelemetrySource,
    frame: PlayerIntentFrame | undefined,
    defend: DefendResolution,
    moveId: string | undefined,
    grounded: boolean,
  ) {
    if (!this.deps.getDebugMode()) return;
    const defendModes = summarizeDefendModes(defend);
    const attackStrength = frame?.attack ? pressToStrength(frame.attack.press) : undefined;
    const attackAltitude = frame?.attack ? (frame.attack.airborne ? "air" : "ground") : undefined;
    const specialSlot = frame?.special ? toSpecialSlot(frame.special.dir) : undefined;
    const specialAltitude = frame?.special ? (frame.special.airborne ? "air" : "ground") : undefined;
    const timestamp = performance.now();
    const signature = [
      frame?.direction ?? "neutral",
      attackStrength ?? "none",
      attackAltitude ?? "none",
      specialSlot ?? "none",
      specialAltitude ?? "none",
      defendModes.join(",") || "none",
      moveId ?? "none",
      grounded ? "ground" : "air",
    ].join("|");
    const previous = this.inputTelemetryState[slot];
    if (signature === previous.signature) {
      return;
    }
    if (timestamp - previous.timestamp < INPUT_TELEMETRY_MIN_INTERVAL_MS) {
      return;
    }
    this.inputTelemetryState[slot] = { signature, timestamp };
    recordTelemetry({
      type: "input",
      source,
      slot,
      direction: frame?.direction ?? "neutral",
      attackStrength,
      attackAltitude,
      specialSlot,
      specialAltitude,
      defendModes,
      moveId,
      grounded,
      timestamp,
    });
  }

}

type InfluenceSnapshot = Partial<Record<"leftward" | "rightward" | "jump" | "backward", boolean>>;

function derivePresentationMovePhase(
  move: MoveDefinition | undefined,
  frame: number,
): FighterPresentationSnapshot["movePhase"] {
  if (!move) return "none";
  if (frame >= move.windows.startup.start && frame <= move.windows.startup.end) {
    return "startup";
  }
  if (frame >= move.windows.active.start && frame <= move.windows.active.end) {
    return "active";
  }
  if (frame >= move.windows.recovery.start && frame <= move.windows.recovery.end) {
    return "recovery";
  }
  return "none";
}

function frameWithinWindow(frame: number | undefined, window?: { start: number; end: number }) {
  if (frame === undefined || !window) return false;
  return frame >= window.start && frame <= window.end;
}

function isCombatInvulnerable(
  state: FighterCombatState,
  move: MoveDefinition | undefined,
  timers: ActionTimers,
) {
  if (timers.dodgeInvuln > 0 || timers.techInvuln > 0) return true;
  return Boolean(move?.invulnerableFrames?.some((window) => frameWithinWindow(state.moveFrame, window)));
}

function isCombatArmored(state: FighterCombatState, move: MoveDefinition | undefined) {
  return Boolean(move?.armorFrames?.some((window) => frameWithinWindow(state.moveFrame, window)));
}

function computeHitstunFrames(hit: { damage: number; knockbackVector: [number, number, number] }) {
  return Math.round(
    HITSTUN_BASE_FRAMES +
      hit.damage * 1.35 +
      Math.hypot(...hit.knockbackVector) * 12,
  );
}

function computeBlockstunFrames(hit: { guardDamage: number; hitLag: number }) {
  return Math.round(BLOCKSTUN_BASE_FRAMES + hit.guardDamage * 0.35 + hit.hitLag * 0.5);
}

function snapshotToControlFrame(
  snapshot?: ControlSnapshot,
  intentFrame?: PlayerIntentFrame,
  defend?: DefendResolution,
): CpuControlFrame {
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
  if (intentFrame?.attack) {
    const heavy = intentFrame.attack.press.heavy || intentFrame.attack.press.charged;
    base.attack2 = heavy;
    base.attack1 = !heavy;
    base.airAttack = intentFrame.attack.airborne;
  } else {
    base.attack1 = !!snapshot.attack;
    base.attack2 = false;
    base.airAttack = false;
  }
  base.special = intentFrame?.special ? true : !!snapshot.special;
  base.dodge = defend?.roll ?? false;
  base.grab = defend?.grab ?? false;
  base.shield = defend?.guard || defend?.parry || false;
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

function summarizeDefendModes(defend: DefendResolution): string[] {
  const modes: string[] = [];
  if (defend.guard) modes.push("guard");
  if (defend.parry) modes.push("parry");
  if (defend.roll) modes.push(defend.rollDir ? `roll:${defend.rollDir}` : "roll");
  if (defend.grab) modes.push("grab");
  if (defend.tech) modes.push("tech");
  return modes;
}

function buildCpuIntentFrame(controlState: CpuControlFrame, airborne: boolean): PlayerIntentFrame {
  const direction: Direction = controlState.leftward
    ? "left"
    : controlState.rightward
      ? "right"
      : controlState.backward
        ? "back"
        : controlState.forward
          ? "forward"
          : "neutral";
  const attackPress: PressStyle = {
    heldMs: controlState.attack2 ? 320 : 90,
    tapped: !controlState.attack2,
    heavy: !!controlState.attack2,
    charged: !!controlState.attack2,
    flickedDir: undefined,
    justPressed: true,
  };
  const attackIntent = controlState.attack1 || controlState.attack2 || controlState.airAttack
    ? {
        kind: "attack" as const,
        dir: direction,
        airborne: controlState.airAttack || airborne,
        press: attackPress,
      }
    : undefined;
  const specialIntent = controlState.special
    ? {
        kind: "special" as const,
        dir: direction,
        airborne,
        press: {
          heldMs: 90,
          tapped: true,
          heavy: false,
          charged: false,
          flickedDir: undefined,
          justPressed: true,
        } as PressStyle,
      }
    : undefined;
  return {
    attack: attackIntent,
    special: specialIntent,
    defend: [],
    jump: controlState.jump
      ? { kind: "jump", shortHopCandidate: false, justPressed: true }
      : undefined,
    dash: undefined,
    direction,
  };
}

function deriveCpuDefendState(controlState: CpuControlFrame): DefendResolution {
  let rollDir: Direction | undefined;
  if (controlState.leftward) rollDir = "left";
  else if (controlState.rightward) rollDir = "right";
  else if (controlState.backward) rollDir = "back";
  return {
    guard: !!controlState.shield,
    parry: false,
    roll: !!controlState.dodge,
    rollDir: controlState.dodge ? rollDir : undefined,
    grab: !!controlState.grab,
    tech: false,
  };
}
