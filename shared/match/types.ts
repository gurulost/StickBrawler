export type MatchPhase = "menu" | "fighting" | "round_end" | "match_end";
export type MatchMode = "single" | "local" | "online";

export interface FighterSnapshot {
  health: number;
  position: [number, number, number];
  velocity: [number, number, number];
  direction: 1 | -1;
  isJumping: boolean;
  isAttacking: boolean;
  isBlocking: boolean;
  isDodging: boolean;
  isGrabbing: boolean;
  isTaunting: boolean;
  isAirAttacking: boolean;
  airJumpsLeft: number;
  guardMeter: number;
  staminaMeter: number;
  specialMeter: number;
  attackCooldown: number;
  dodgeCooldown: number;
  grabCooldown: number;
  moveCooldown: number;
  comboCount: number;
  comboTimer: number;
  lastMoveType: string;
}

export type RuntimeKeyboardState<TControl extends string> = Record<TControl, boolean>;

export interface RuntimeFramePayload<TControl extends string> {
  delta: number;
  inputs: {
    player1: RuntimeKeyboardState<TControl>;
    player2: RuntimeKeyboardState<TControl>;
  };
  player: FighterSnapshot;
  cpu: FighterSnapshot;
  gamePhase: MatchPhase;
}

export interface OnlineInputFrame<TControl extends string> {
  frame: number;
  inputs: RuntimeKeyboardState<TControl>;
}

export interface OnlineMatchSnapshot<TControl extends string> {
  frame: number;
  playerState: FighterSnapshot;
  opponentState: FighterSnapshot;
  inputs: {
    player: OnlineInputFrame<TControl>;
    opponent: OnlineInputFrame<TControl>;
  };
  phase: MatchPhase;
}

export interface RuntimeAudioActions {
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

export interface RuntimeActions {
  movePlayer: (x: number, y: number, z: number) => void;
  moveCPU: (x: number, y: number, z: number) => void;
  updatePlayerVelocity: (vx: number, vy: number, vz: number) => void;
  updateCPUVelocity: (vx: number, vy: number, vz: number) => void;
  setPlayerDirection: (dir: 1 | -1) => void;
  setCPUDirection: (dir: 1 | -1) => void;
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
  usePlayerAirJump: () => boolean | void;
  setCPUDodging: (dodging: boolean) => void;
  setCPUGrabbing: (grabbing: boolean) => void;
  setCPUAirAttacking: (airAttacking: boolean) => void;
  resetCPUAirJumps: () => void;
  useCPUAirJump: () => boolean | void;
  damagePlayer: (amount: number) => void;
  damageCPU: (amount: number) => void;
  updateRoundTime: (delta: number) => void;
  updatePlayerCooldowns: (delta: number) => void;
  updateCPUCooldowns: (delta: number) => void;
  updatePlayerMeters: (payload: { guard: number; stamina: number; special: number }) => void;
  updateCPUMeters: (payload: { guard: number; stamina: number; special: number }) => void;
  updatePlayerGuardBreak: () => void;
  updateCPUGuardBreak: () => void;
}

export type MatchActorSlot = "player1" | "player2" | "cpu";

export interface MatchTelemetryEntry {
  slot: MatchActorSlot;
  source: "player" | "cpu";
  comboCount: number;
  timestamp: number;
  hit: {
    moveId: string;
    hitboxId: string;
    damage: number;
    guardDamage: number;
    knockbackVector: [number, number, number];
    hitLag: number;
    causesTrip: boolean;
    isCounterHit: boolean;
    launchAngleDeg: number;
    attackerAction: string;
    defenderAction: string;
  };
}

export interface OnlineMatchDescriptor {
  id: string;
  createdAt: string;
  hostProfileId: string;
  guestProfileId?: string;
  seed: number;
  mode: MatchMode;
  maxPlayers: number;
}

export type OnlineMatchMessage<TControl extends string> =
  | { type: "join"; matchId: string; profileId: string }
  | { type: "state"; snapshot: OnlineMatchSnapshot<TControl> }
  | { type: "inputs"; frame: number; inputs: RuntimeKeyboardState<TControl> }
  | { type: "resync"; snapshot: OnlineMatchSnapshot<TControl> }
  | { type: "leave"; reason?: string };
