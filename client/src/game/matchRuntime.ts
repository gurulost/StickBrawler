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

interface ActionTimers {
  dodge: number;
  grab: number;
  grabPending: boolean;
  taunt: number;
  tauntActive: boolean;
  guardBreak: number;
}

const createActionTimers = (): ActionTimers => ({
  dodge: 0,
  grab: 0,
  grabPending: false,
  taunt: 0,
  tauntActive: false,
  guardBreak: 0,
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
          const blocking = cpu.isBlocking;
          const baseDamage = Math.round(hit.damage);
          maxDamage = Math.max(maxDamage, baseDamage);
          if (blocking) {
            const chip = Math.max(1, Math.round(baseDamage * 0.25));
            fighting.damageCPU(chip);
            applyGuardDamageToCpu(hit.guardDamage);
          } else {
            fighting.damageCPU(baseDamage);
          }
          const [vx, vy, vz] = applyKnockbackToVelocity(cpu, hit, cpuDirectionalInfluence);
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
      this.cpuCombatState.guardMeter = Math.max(0, this.cpuCombatState.guardMeter - 15 * delta);
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
          const blocking = player.isBlocking;
          const baseDamage = Math.round(hit.damage);
          maxDamage = Math.max(maxDamage, baseDamage);
          if (blocking) {
            const chip = Math.max(1, Math.round(baseDamage * 0.25));
            fighting.damagePlayer(chip);
            applyGuardDamageToPlayer(hit.guardDamage);
            audio.playBlock();
          } else {
            fighting.damagePlayer(baseDamage);
          }
          const [vx, vy, vz] = applyKnockbackToVelocity(player, hit, playerDirectionalInfluence);
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
    const cpuStunned = this.cpuTimers.guardBreak > 0;
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

    if (cpuControlScale > 0 && (cpuCanAct || cpu.isJumping)) {
      const accel = (cpu.isJumping ? AIR_ACCELERATION : GROUND_ACCELERATION) * delta;
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
      cpuVY = JUMP_FORCE * 0.8;
      fighting.useCPUAirJump?.();
    }

    if (controlState.shield && cpuCanAct && this.cpuCombatState.guardMeter > 0) {
      fighting.setCPUBlocking(true);
      this.cpuCombatState.guardMeter = Math.max(0, this.cpuCombatState.guardMeter - 12 * delta);
    } else if (cpu.isBlocking) {
      fighting.setCPUBlocking(false);
    }

    if (controlState.dodge && cpuCanAct && cpu.dodgeCooldown <= 0) {
      fighting.setCPUDodging(true);
      cpuVX += cpuDirection * PLAYER_SPEED * 1.5;
      this.cpuTimers.dodge = DODGE_DURATION;
    }

    const cpuDrop =
      controlState.dropThrough &&
      cpu.position[1] > 0.5 &&
      cpu.position[1] > player.position[1];
    const [cpuNewY, cpuNewVY] = applyGravity(
      cpu.position[1],
      cpuVY,
      cpu.position[0],
      cpu.position[2],
      cpuDrop,
      controlState.backward && cpu.isJumping,
      delta,
    );

    const cpuOnGround = cpuNewY <= getPlatformHeight(cpu.position[0], cpu.position[2]) + 0.01;
    if (cpuOnGround && cpu.isJumping) {
      fighting.setCPUJumping(false);
      fighting.resetCPUAirJumps();
      audio.playLand();
    }

    const cpuBounds = resolveCapsuleBounds(
      [
        cpu.position[0] + cpuVX * delta,
        cpuNewY,
        cpu.position[2] + cpuVZ * delta,
      ],
      [cpuVX, cpuNewVY, cpuVZ],
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
    const playerStunned = this.playerTimers.guardBreak > 0;
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

    const controlScale = playerInHitLag ? 0 : 1;
    if (canAct || player.isJumping) {
      const accel = (player.isJumping ? AIR_ACCELERATION : GROUND_ACCELERATION) * delta;
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

    if (input.jump && !player.isJumping && player.position[1] <= 0.01 && canAct) {
      newVY = JUMP_FORCE;
      fighting.setPlayerJumping(true);
      audio.playJump();
      fighting.resetPlayerAirJumps();
    } else if (input.jump && player.isJumping && player.airJumpsLeft > 0 && canAct) {
      newVY = JUMP_FORCE * 0.8;
      if (fighting.usePlayerAirJump?.()) {
        audio.playJump();
      }
    }

    const platformHeight = getPlatformHeight(playerX, playerZ);
    const dropThrough =
      input.backward && platformHeight > 0 && Math.abs(playerY - platformHeight) < 0.1;
    const [newY, gravityVY] = applyGravity(
      playerY,
      newVY,
      playerX,
      playerZ,
      dropThrough,
      input.backward && player.isJumping,
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
      this.playerCombatState.guardMeter = Math.max(0, this.playerCombatState.guardMeter - 15 * delta);
    } else if (player.isBlocking) {
      fighting.setPlayerBlocking(false);
    }

    if (input.dodge && canAct && player.dodgeCooldown <= 0 && this.playerCombatState.staminaMeter > 20) {
      if (getDebugMode()) {
        console.log("Player DODGE");
      }
      fighting.setPlayerDodging(true);
      audio.playDodge();
      if (input.leftward) {
        newVX = -PLAYER_SPEED * 2;
      } else if (input.rightward) {
        newVX = PLAYER_SPEED * 2;
      }
      this.playerTimers.dodge = DODGE_DURATION;
      this.playerCombatState.staminaMeter = Math.max(0, this.playerCombatState.staminaMeter - 25);
    }

    newVX = applyHorizontalFriction(newVX, player.isJumping, delta);
    newVZ = applyHorizontalFriction(newVZ, player.isJumping, delta);

    const proposedX = playerX + newVX * delta;
    const proposedZ = playerZ + newVZ * delta;
    const bounds = resolveCapsuleBounds([proposedX, newY, proposedZ], [newVX, newVY, newVZ]);
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

    if (this.playerTimers.dodge > 0) {
      this.playerTimers.dodge = Math.max(0, this.playerTimers.dodge - delta);
      if (this.playerTimers.dodge === 0 && player.isDodging) {
        fighting.setPlayerDodging(false);
      }
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
  }

  private advanceCpuTimers(delta: number, player: CharacterState, cpu: CharacterState) {
    const { fighting, audio } = this.deps;

    if (this.cpuTimers.dodge > 0) {
      this.cpuTimers.dodge = Math.max(0, this.cpuTimers.dodge - delta);
      if (this.cpuTimers.dodge === 0 && cpu.isDodging) {
        fighting.setCPUDodging(false);
      }
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
