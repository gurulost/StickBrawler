import { MatchRuntime, createEmptyInputs, type DualInputState } from "../client/src/game/matchRuntime";
import type { CharacterState, GamePhase } from "../client/src/lib/stores/useFighting";
import type { HitTelemetry } from "../client/src/game/combatTelemetry";

const DEFAULT_HEALTH = 100;
const DEFAULT_GUARD = 80;
const DEFAULT_STAMINA = 100;
const DEFAULT_SPECIAL = 0;
const DEFAULT_POSITION_PLAYER: [number, number, number] = [-2, 0, 0];
const DEFAULT_POSITION_CPU: [number, number, number] = [2, 0, 0];

function createDefaultCharacterState(position: [number, number, number], direction: 1 | -1): CharacterState {
  return {
    health: DEFAULT_HEALTH,
    position,
    direction,
    isJumping: false,
    isAttacking: false,
    isBlocking: false,
    isDodging: false,
    isGrabbing: false,
    isTaunting: false,
    isAirAttacking: false,
    airJumpsLeft: 2,
    guardMeter: DEFAULT_GUARD,
    staminaMeter: DEFAULT_STAMINA,
    specialMeter: DEFAULT_SPECIAL,
    attackCooldown: 0,
    dodgeCooldown: 0,
    grabCooldown: 0,
    moveCooldown: 0,
    comboCount: 0,
    comboTimer: 0,
    lastMoveType: "",
    velocity: [0, 0, 0],
  };
}

const noopAudio = {
  playHit: () => {},
  playPunch: () => {},
  playKick: () => {},
  playSpecial: () => {},
  playBlock: () => {},
  playJump: () => {},
  playLand: () => {},
  playDodge: () => {},
  playGrab: () => {},
  playThrow: () => {},
  playTaunt: () => {},
};

export class ServerMatchRuntime {
  private readonly runtime: MatchRuntime;
  private player: CharacterState = createDefaultCharacterState(DEFAULT_POSITION_PLAYER, 1);
  private cpu: CharacterState = createDefaultCharacterState(DEFAULT_POSITION_CPU, -1);
  private gamePhase: GamePhase = "fighting";
  private telemetryBuffer: HitTelemetry[] = [];
  private inputs: DualInputState = createEmptyInputs();

  constructor() {
    this.runtime = new MatchRuntime(
      {
        fighting: this.createFightingActions(),
        audio: noopAudio,
        getDebugMode: () => false,
        getMatchMode: () => "single",
        sendTelemetry: (entries) => {
          this.telemetryBuffer.push(...entries);
        },
      },
      { player: this.player, cpu: this.cpu },
    );
  }

  update(frame: {
    delta: number;
    inputs?: DualInputState;
    gamePhase?: GamePhase;
  }) {
    if (frame.gamePhase) {
      this.gamePhase = frame.gamePhase;
    }
    if (frame.inputs) {
      this.inputs = frame.inputs;
    }
    this.runtime.update({
      delta: frame.delta,
      inputs: this.inputs,
      player: this.player,
      cpu: this.cpu,
      gamePhase: this.gamePhase,
    });
  }

  reset() {
    this.player = createDefaultCharacterState(DEFAULT_POSITION_PLAYER, 1);
    this.cpu = createDefaultCharacterState(DEFAULT_POSITION_CPU, -1);
    this.runtime.reset({ player: this.player, cpu: this.cpu });
  }

  drainTelemetry() {
    const copy = [...this.telemetryBuffer];
    this.telemetryBuffer.length = 0;
    return copy;
  }

  snapshot() {
    return {
      player: this.player,
      cpu: this.cpu,
      phase: this.gamePhase,
    };
  }

  private createFightingActions() {
    return {
      movePlayer: (x: number, y: number, z: number) => {
        this.player.position = [x, y, z];
      },
      moveCPU: (x: number, y: number, z: number) => {
        this.cpu.position = [x, y, z];
      },
      updatePlayerVelocity: (vx: number, vy: number, vz: number) => {
        this.player.velocity = [vx, vy, vz];
      },
      updateCPUVelocity: (vx: number, vy: number, vz: number) => {
        this.cpu.velocity = [vx, vy, vz];
      },
      setPlayerDirection: (dir: 1 | -1) => {
        this.player.direction = dir;
      },
      setCPUDirection: (dir: 1 | -1) => {
        this.cpu.direction = dir;
      },
      setPlayerJumping: (jumping: boolean) => {
        this.player.isJumping = jumping;
      },
      setCPUJumping: (jumping: boolean) => {
        this.cpu.isJumping = jumping;
      },
      setPlayerAttacking: (attacking: boolean) => {
        this.player.isAttacking = attacking;
      },
      setCPUAttacking: (attacking: boolean) => {
        this.cpu.isAttacking = attacking;
      },
      setPlayerBlocking: (blocking: boolean) => {
        this.player.isBlocking = blocking;
      },
      setCPUBlocking: (blocking: boolean) => {
        this.cpu.isBlocking = blocking;
      },
      setPlayerDodging: (dodging: boolean) => {
        this.player.isDodging = dodging;
      },
      setPlayerGrabbing: (grabbing: boolean) => {
        this.player.isGrabbing = grabbing;
      },
      setPlayerTaunting: (taunting: boolean) => {
        this.player.isTaunting = taunting;
      },
      setPlayerAirAttacking: (airAttacking: boolean) => {
        this.player.isAirAttacking = airAttacking;
      },
      resetPlayerAirJumps: () => {
        this.player.airJumpsLeft = 2;
      },
      usePlayerAirJump: () => {
        if (this.player.airJumpsLeft > 0) {
          this.player.airJumpsLeft -= 1;
          return true;
        }
        return false;
      },
      setCPUDodging: (dodging: boolean) => {
        this.cpu.isDodging = dodging;
      },
      setCPUGrabbing: (grabbing: boolean) => {
        this.cpu.isGrabbing = grabbing;
      },
      setCPUAirAttacking: (airAttacking: boolean) => {
        this.cpu.isAirAttacking = airAttacking;
      },
      resetCPUAirJumps: () => {
        this.cpu.airJumpsLeft = 2;
      },
      useCPUAirJump: () => {
        if (this.cpu.airJumpsLeft > 0) {
          this.cpu.airJumpsLeft -= 1;
          return true;
        }
        return false;
      },
      damagePlayer: (amount: number) => {
        this.player.health = Math.max(0, this.player.health - amount);
      },
      damageCPU: (amount: number) => {
        this.cpu.health = Math.max(0, this.cpu.health - amount);
      },
      updateRoundTime: () => {},
      updatePlayerCooldowns: (delta: number) => {
        this.player.attackCooldown = Math.max(0, this.player.attackCooldown - delta * 1000);
      },
      updateCPUCooldowns: (delta: number) => {
        this.cpu.attackCooldown = Math.max(0, this.cpu.attackCooldown - delta * 1000);
      },
      updatePlayerMeters: (payload: { guard: number; stamina: number; special: number }) => {
        this.player.guardMeter = payload.guard;
        this.player.staminaMeter = payload.stamina;
        this.player.specialMeter = payload.special;
      },
      updateCPUMeters: (payload: { guard: number; stamina: number; special: number }) => {
        this.cpu.guardMeter = payload.guard;
        this.cpu.staminaMeter = payload.stamina;
        this.cpu.specialMeter = payload.special;
      },
      updatePlayerGuardBreak: () => {},
      updateCPUGuardBreak: () => {},
    };
  }
}
