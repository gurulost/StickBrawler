import { MatchRuntime, createEmptyInputs, type DualInputState } from "../client/src/game/matchRuntime";
import type { CharacterState, GamePhase } from "../client/src/lib/stores/useFighting";
import type { CombatTelemetryEvent } from "../client/src/game/combatTelemetry";
import type { FighterPresentationSnapshot } from "../client/src/game/combatPresentation";

export { MatchRuntime } from "../client/src/game/matchRuntime";

const DEFAULT_HEALTH = 100;
const DEFAULT_GUARD = 80;
const DEFAULT_STAMINA = 100;
const DEFAULT_SPECIAL = 0;
const DEFAULT_POSITION_PLAYER: [number, number, number] = [-2, 0, 0];
const DEFAULT_POSITION_CPU: [number, number, number] = [2, 0, 0];

function createDefaultCharacterState(
  position: [number, number, number],
  direction: 1 | -1,
  fighterId: "stick_hero" | "stick_villain" = "stick_hero",
): CharacterState {
  return {
    health: DEFAULT_HEALTH,
    position,
    direction,
    fighterId,
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

function mirrorPresentationSnapshot(
  current: CharacterState,
  snapshot: FighterPresentationSnapshot,
): CharacterState {
  return {
    ...current,
    health: snapshot.health,
    position: snapshot.position,
    velocity: snapshot.velocity,
    direction: snapshot.facing,
    fighterId: snapshot.fighterId,
    grounded: snapshot.grounded,
    inAir: snapshot.inAir,
    action: snapshot.action,
    moveId: snapshot.moveId,
    moveInstanceId: snapshot.moveInstanceId,
    moveFrame: snapshot.moveFrame,
    movePhase: snapshot.movePhase,
    hitLagFrames: snapshot.hitLagFrames,
    hitstunFrames: snapshot.hitstunFrames,
    blockstunFrames: snapshot.blockstunFrames,
    landingLagFrames: snapshot.landingLagFrames,
    canAct: snapshot.canAct,
    invulnerable: snapshot.invulnerable,
    armored: snapshot.armored,
    guardBroken: snapshot.guardBroken,
    guardMeter: snapshot.guardMeter,
    staminaMeter: snapshot.staminaMeter,
    specialMeter: snapshot.specialMeter,
    comboCount: snapshot.comboCounter,
    comboTimer: snapshot.comboTimer,
    attackCooldown: snapshot.attackCooldown,
    dodgeCooldown: snapshot.dodgeCooldown,
    grabCooldown: snapshot.grabCooldown,
    moveCooldown: snapshot.moveCooldown,
    isJumping: snapshot.inAir,
    isAttacking: snapshot.action === "attack",
    isBlocking: snapshot.isBlocking,
    isDodging: snapshot.isDodging,
    isGrabbing: snapshot.isGrabbing,
    isTaunting: snapshot.isTaunting,
    isAirAttacking: snapshot.isAirAttacking,
    airJumpsLeft: snapshot.airJumpsLeft,
    lastMoveType:
      snapshot.lastStartedMoveId ??
      snapshot.lastConfirmedMoveId ??
      snapshot.moveId ??
      current.lastMoveType,
    lastStartedMoveId: snapshot.lastStartedMoveId,
    lastHitMoveId: snapshot.lastConfirmedMoveId,
    justStartedMove: Boolean(snapshot.justStartedMove),
    justLanded: Boolean(snapshot.justLanded),
    justHit: Boolean(snapshot.justHit),
    justBlocked: Boolean(snapshot.justBlocked),
    justParried: Boolean(snapshot.justParried),
    justGuardBroke: Boolean(snapshot.justGuardBroke),
  };
}

const noopAudio = {
  playHit: (_intensity?: number) => {},
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
  private player: CharacterState = createDefaultCharacterState(DEFAULT_POSITION_PLAYER, 1, "stick_hero");
  private cpu: CharacterState = createDefaultCharacterState(DEFAULT_POSITION_CPU, -1, "stick_villain");
  private gamePhase: GamePhase = "fighting";
  private roundTimeRemaining = 60;
  private maxRoundTime = 60;
  private telemetryBuffer: CombatTelemetryEvent[] = [];
  private inputs: DualInputState = createEmptyInputs();

  constructor() {
    this.runtime = new MatchRuntime(
      {
        fighting: this.createFightingActions(),
        audio: noopAudio,
        getDebugMode: () => false,
        getMatchMode: () => "single",
        getArenaStyle: () => "open",
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
      gamePhase: this.gamePhase,
    });
  }

  reset() {
    this.player = createDefaultCharacterState(DEFAULT_POSITION_PLAYER, 1, "stick_hero");
    this.cpu = createDefaultCharacterState(DEFAULT_POSITION_CPU, -1, "stick_villain");
    this.roundTimeRemaining = 60;
    this.maxRoundTime = 60;
    this.runtime.reset({ player: this.player, cpu: this.cpu });
  }

  drainTelemetry() {
    const copy = [...this.telemetryBuffer];
    this.telemetryBuffer.length = 0;
    return copy;
  }

  getState() {
    return {
      player: { ...this.player },
      cpu: { ...this.cpu },
      gamePhase: this.gamePhase,
      roundTimeRemaining: this.roundTimeRemaining,
      maxRoundTime: this.maxRoundTime,
    };
  }

  snapshot() {
    return this.getState();
  }

  private createFightingActions() {
    return {
      applyRuntimeFrame: (frame: any) => {
        this.player = mirrorPresentationSnapshot(this.player, frame.player);
        this.cpu = mirrorPresentationSnapshot(this.cpu, frame.cpu);
        this.roundTimeRemaining = frame.roundTimeRemaining;
        this.maxRoundTime = frame.maxRoundTime;
      },
      applyCombatEvents: () => {},
    };
  }
}
