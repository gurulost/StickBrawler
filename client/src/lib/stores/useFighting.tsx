import { create } from 'zustand';
import { COMBO_WINDOW, COMBO_MULTIPLIER } from '../../game/Physics';
import { useControls } from './useControls';
import { clamp } from '../clamp';
import { useCustomization } from './useCustomization';
import type { CoinAwardPayload } from './useCustomization';
import { DEFAULT_ARENA_ID, ARENA_THEMES } from '../../game/arenas';
import type { FighterId } from "../../combat/moveTable";
import type { FighterActionState } from "../../combat/types";
import type {
  CombatEvent,
  FighterPresentationSnapshot,
  PresentationMovePhase,
  RuntimeFrameSnapshot,
} from "../../game/combatPresentation";

export type GamePhase = 'menu' | 'lobby' | 'fighting' | 'round_end' | 'match_end';
export type MatchMode = "single" | "local" | "online";
export type Character = 'stick_hero' | 'stick_villain';
export type PlayerSlot = "player1" | "player2";
export interface CharacterState {
  health: number;
  position: [number, number, number]; // [x, y, z]
  direction: 1 | -1; // 1 for right, -1 for left
  fighterId: FighterId;
  grounded?: boolean;
  inAir?: boolean;
  action?: FighterActionState;
  moveId?: string;
  moveInstanceId?: number;
  moveFrame?: number;
  movePhase?: PresentationMovePhase;
  hitLagFrames?: number;
  hitstunFrames?: number;
  blockstunFrames?: number;
  canAct?: boolean;
  invulnerable?: boolean;
  armored?: boolean;
  isJumping: boolean;
  isAttacking: boolean;
  isBlocking: boolean;
  isDodging: boolean;     // New dodge mechanic
  isGrabbing: boolean;    // New grab mechanic
  isTaunting: boolean;    // Taunt animation
  isAirAttacking: boolean; // Aerial attack
  airJumpsLeft: number;   // Double/triple jump capability (Smash Bros style)
  guardMeter: number;
  staminaMeter: number;
  specialMeter: number;
  
  // Cooldowns
  attackCooldown: number;
  dodgeCooldown: number;  // Cooldown for dodge
  grabCooldown: number;   // Cooldown for grab
  moveCooldown: number;   // Small cooldown between moves
  
  // Combo system
  comboCount: number;     // Current combo counter
  comboTimer: number;     // Time remaining in combo window
  lastMoveType: string;   // Last move performed (to prevent same-move spam)
  lastStartedMoveId?: string;
  lastHitMoveId?: string;
  justStartedMove?: boolean;
  justLanded?: boolean;
  justHit?: boolean;
  justBlocked?: boolean;
  justParried?: boolean;
  justGuardBroke?: boolean;
  
  velocity: [number, number, number];
}


export type SlotAssignment = {
  type: "human" | "cpu";
  ready: boolean;
  label: string;
  fighterId: FighterId;
};

type SlotState = Record<PlayerSlot, SlotAssignment>;

interface FightingState {
  gamePhase: GamePhase;
  matchMode: MatchMode;
  slots: SlotState;
  paused: boolean;
  player: CharacterState;
  cpu: CharacterState;
  playerEvents: CombatEvent[];
  cpuEvents: CombatEvent[];
  playerScore: number;
  cpuScore: number;
  playerStatus?: "guard_break";
  cpuStatus?: "guard_break";
  roundTime: number;
  maxRoundTime: number;
  currentGameScore: number; // Total score for current game session
  arenaId: string;
  
  // High score tracking
  submitScore: (finalScore: number) => Promise<void>;
  calculateFinalScore: () => number;
  applyRuntimeFrame: (frame: RuntimeFrameSnapshot) => void;
  applyCombatEvents: (events: CombatEvent[]) => void;

  // Actions
  startGame: (mode?: MatchMode) => void;
  beginMatch: () => void;
  endRound: (winner: 'player' | 'cpu' | 'timeout') => void;
  resetRound: () => void;
  restartMatch: () => void;
  returnToMenu: () => void;
  
  // Character actions
  movePlayer: (x: number, y: number, z: number) => void;
  updatePlayerVelocity: (vx: number, vy: number, vz: number) => void;
  setPlayerDirection: (direction: 1 | -1) => void;
  setPlayerJumping: (isJumping: boolean) => void;
  setPlayerAttacking: (isAttacking: boolean) => void;
  setPlayerBlocking: (isBlocking: boolean) => void;
  setPlayerDodging: (isDodging: boolean) => void;        // New dodge action
  setPlayerGrabbing: (isGrabbing: boolean) => void;      // New grab action
  setPlayerTaunting: (isTaunting: boolean) => void;      // New taunt action
  setPlayerAirAttacking: (isAirAttacking: boolean) => void; // New air attack
  resetPlayerAirJumps: () => void;                       // Reset air jumps when landing
  usePlayerAirJump: () => boolean;                       // Use an air jump, returns success
  damagePlayer: (amount: number) => void;
  updatePlayerCooldowns: (delta: number) => void;
  updatePlayerMeters: (meters: Partial<{ guard: number; stamina: number; special: number }>) => void;
  updatePlayerGuardBreak: () => void;
  
  // CPU actions
  moveCPU: (x: number, y: number, z: number) => void;
  updateCPUVelocity: (vx: number, vy: number, vz: number) => void;
  setCPUDirection: (direction: 1 | -1) => void;
  setCPUJumping: (isJumping: boolean) => void;
  setCPUAttacking: (isAttacking: boolean) => void;
  setCPUBlocking: (isBlocking: boolean) => void;
  setCPUDodging: (isDodging: boolean) => void;           // New dodge action
  setCPUGrabbing: (isGrabbing: boolean) => void;         // New grab action
  setCPUAirAttacking: (isAirAttacking: boolean) => void; // New air attack
  resetCPUAirJumps: () => void;                          // Reset air jumps when landing
  useCPUAirJump: () => boolean;                          // Use an air jump, returns success
  damageCPU: (amount: number) => void;
  updateCPUCooldowns: (delta: number) => void;
  updateCPUMeters: (meters: Partial<{ guard: number; stamina: number; special: number }>) => void;
  updateCPUGuardBreak: () => void;
  
  // Game time
  updateRoundTime: (delta: number) => void;
  setMatchMode: (mode: MatchMode) => void;
  setArenaId: (arenaId: string) => void;
  setSlotType: (slot: PlayerSlot, type: "human" | "cpu") => void;
  setSlotFighter: (slot: PlayerSlot, fighter: FighterId) => void;
  setSlotReady: (slot: PlayerSlot, ready: boolean) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  togglePause: () => void;
  
}

const DEFAULT_HEALTH = 100;
const DEFAULT_GUARD = 80;
const DEFAULT_STAMINA = 100;
const DEFAULT_SPECIAL = 0;
const MAX_SPECIAL = 100;
const GUARD_BREAK_THRESHOLD = 5;
const DEFAULT_POSITION_PLAYER: [number, number, number] = [-2, 0, 0];
const DEFAULT_POSITION_CPU: [number, number, number] = [2, 0, 0];
const DEFAULT_ROUND_TIME = 60; // 60 seconds per round
const ROUNDS_TO_WIN = 2;

const createDefaultSlots = (mode: MatchMode): SlotState => ({
  player1: { type: "human", ready: false, label: "Player 1", fighterId: "stick_hero" },
  player2: {
    type: mode === "single" ? "cpu" : "human",
    ready: mode === "single",
    label: mode === "single" ? "CPU" : mode === "local" ? "Player 2" : "Remote",
    fighterId: mode === "single" ? "stick_villain" : "stick_hero",
  },
});

const roundToHundredth = (value: number) => Math.round(value * 100) / 100;

const resolveRoundPhase = (playerScore: number, cpuScore: number): GamePhase =>
  playerScore >= ROUNDS_TO_WIN || cpuScore >= ROUNDS_TO_WIN ? 'match_end' : 'round_end';

const getCoinStore = () => useCustomization.getState();

const awardCoinsSafe = (payload: CoinAwardPayload) => {
  const store = getCoinStore();
  if (!store?.earnCoins) return;
  try {
    store.earnCoins(payload);
  } catch (error) {
    console.warn('[economy] Failed to award coins', error);
  }
};

type RoundContext = 'ko' | 'timeout';

const awardRoundResolutionCoins = (
  winner: 'player' | 'cpu' | 'timeout',
  context: RoundContext,
  snapshot: { playerHealth: number; cpuHealth: number },
) => {
  let amount = 0;
  if (winner === 'player') {
    amount = 40;
  } else if (winner === 'cpu') {
    amount = 15;
  } else {
    amount = 25;
  }
  if (winner === 'player') {
    const damageTaken = DEFAULT_HEALTH - snapshot.playerHealth;
    if (damageTaken < 10) {
      amount += 25;
    }
  }
  if (amount <= 0) return;
  awardCoinsSafe({
    amount,
    reason:
      winner === 'player'
        ? `round_win_${context}`
        : winner === 'cpu'
          ? `round_loss_${context}`
          : 'round_timeout',
    metadata: {
      context,
      winner,
      playerHealth: roundToHundredth(snapshot.playerHealth),
      cpuHealth: roundToHundredth(snapshot.cpuHealth),
    },
  });
};

type DamageCoinContext = {
  damage: number;
  comboDepth: number;
  finisher: boolean;
  playerHealth: number;
};

const awardDamageCoins = ({
  damage,
  comboDepth,
  finisher,
  playerHealth,
}: DamageCoinContext) => {
  if (damage <= 0) return;
  const base = Math.max(1, Math.floor(damage * 1.1));
  const comboBonus = comboDepth >= 2 ? (comboDepth - 1) * 2 : 0;
  const finisherBonus = finisher ? 35 + Math.round(playerHealth * 0.4) : 0;
  const total = base + comboBonus + finisherBonus;
  if (total <= 0) return;
  awardCoinsSafe({
    amount: total,
    reason: finisher ? 'ko' : 'hit',
    metadata: {
      damage: roundToHundredth(damage),
      comboDepth,
      finisher,
      playerHealth: roundToHundredth(playerHealth),
      total,
    },
  });
};

const createDefaultCharacterState = (
  position: [number, number, number],
  direction: 1 | -1,
  fighterId: FighterId = "stick_hero",
): CharacterState => ({
  health: DEFAULT_HEALTH,
  position,
  direction,
  fighterId,
  grounded: true,
  inAir: false,
  action: 'idle',
  moveId: undefined,
  moveInstanceId: undefined,
  moveFrame: 0,
  movePhase: 'none',
  hitLagFrames: 0,
  hitstunFrames: 0,
  blockstunFrames: 0,
  canAct: true,
  invulnerable: false,
  armored: false,
  isJumping: false,
  isAttacking: false,
  isBlocking: false,
  isDodging: false,
  isGrabbing: false,
  isTaunting: false,
  isAirAttacking: false,
  airJumpsLeft: 2, // Allow 2 additional jumps (triple jump total - Smash Bros style)
  guardMeter: DEFAULT_GUARD,
  staminaMeter: DEFAULT_STAMINA,
  specialMeter: DEFAULT_SPECIAL,
  
  // Cooldowns
  attackCooldown: 0,
  dodgeCooldown: 0,
  grabCooldown: 0,
  moveCooldown: 0,  // Small cooldown between moves
  
  // Combo system
  comboCount: 0,
  comboTimer: 0,
  lastMoveType: '',
  lastStartedMoveId: undefined,
  lastHitMoveId: undefined,
  justStartedMove: false,
  justLanded: false,
  justHit: false,
  justBlocked: false,
  justParried: false,
  justGuardBroke: false,
  
  velocity: [0, 0, 0],
});

const toCharacterState = (
  snapshot: FighterPresentationSnapshot,
  previous: CharacterState,
): CharacterState => ({
  ...previous,
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
  canAct: snapshot.canAct,
  invulnerable: snapshot.invulnerable,
  armored: snapshot.armored,
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
  isAttacking: snapshot.action === 'attack',
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
    previous.lastMoveType,
  lastStartedMoveId: snapshot.lastStartedMoveId,
  lastHitMoveId: snapshot.lastConfirmedMoveId,
  justStartedMove: Boolean(snapshot.justStartedMove),
  justLanded: Boolean(snapshot.justLanded),
  justHit: Boolean(snapshot.justHit),
  justBlocked: Boolean(snapshot.justBlocked),
  justParried: Boolean(snapshot.justParried),
  justGuardBroke: Boolean(snapshot.justGuardBroke),
});

const filterSlotEvents = (events: CombatEvent[], slot: "player" | "cpu") =>
  events.filter((event) => {
    if ("slot" in event) {
      return event.slot === slot;
    }
    return event.attacker === slot || event.defender === slot;
  });

export const useFighting = create<FightingState>((set, get) => ({
  gamePhase: 'menu',
  matchMode: "single",
  slots: createDefaultSlots("single"),
  paused: false,
  player: createDefaultCharacterState(DEFAULT_POSITION_PLAYER, 1, "stick_hero"),
  cpu: createDefaultCharacterState(DEFAULT_POSITION_CPU, -1, "stick_villain"),
  playerEvents: [],
  cpuEvents: [],
  playerScore: 0,
  cpuScore: 0,
  playerStatus: undefined,
  cpuStatus: undefined,
  roundTime: DEFAULT_ROUND_TIME,
  maxRoundTime: DEFAULT_ROUND_TIME,
  currentGameScore: 0,
  arenaId: DEFAULT_ARENA_ID,
  applyRuntimeFrame: (frame) => set((state) => {
    const nextPlayer = toCharacterState(frame.player, state.player);
    const nextCPU = toCharacterState(frame.cpu, state.cpu);
    const nextState: Partial<FightingState> = {
      player: nextPlayer,
      cpu: nextCPU,
    };

    if (state.gamePhase === 'fighting') {
      if (state.cpu.health > 0 && nextCPU.health <= 0) {
        const playerScore = state.playerScore + 1;
        awardRoundResolutionCoins('player', 'ko', {
          playerHealth: nextPlayer.health,
          cpuHealth: nextCPU.health,
        });
        nextState.playerScore = playerScore;
        nextState.gamePhase = resolveRoundPhase(playerScore, state.cpuScore);
      } else if (state.player.health > 0 && nextPlayer.health <= 0) {
        const cpuScore = state.cpuScore + 1;
        awardRoundResolutionCoins('cpu', 'ko', {
          playerHealth: nextPlayer.health,
          cpuHealth: nextCPU.health,
        });
        nextState.cpuScore = cpuScore;
        nextState.gamePhase = resolveRoundPhase(state.playerScore, cpuScore);
      }
    }

    return nextState;
  }),
  applyCombatEvents: (events) => set((state) => {
    const playerEvents = filterSlotEvents(events, "player");
    const cpuEvents = filterSlotEvents(events, "cpu");

    events.forEach((event) => {
      if (event.type !== "hit" || event.blocked || event.attacker !== "player") return;
      const comboDepth = state.player.comboCount > 0 ? Math.max(1, state.player.comboCount) : 0;
      const predictedCpuHealth = Math.max(0, state.cpu.health - event.damage);
      awardDamageCoins({
        damage: event.damage,
        comboDepth,
        finisher: predictedCpuHealth <= 0 && state.gamePhase === 'fighting',
        playerHealth: state.player.health,
      });
    });

    return {
      playerEvents,
      cpuEvents,
    };
  }),
  
  startGame: (mode) => set((state) => {
    const targetMode = mode ?? state.matchMode;
    const slots = createDefaultSlots(targetMode);
    return {
      gamePhase: 'lobby',
      matchMode: targetMode,
      paused: false,
      playerScore: 0,
      cpuScore: 0,
      playerEvents: [],
      cpuEvents: [],
      player: createDefaultCharacterState(DEFAULT_POSITION_PLAYER, 1, slots.player1.fighterId),
      cpu: createDefaultCharacterState(DEFAULT_POSITION_CPU, -1, slots.player2.fighterId),
      roundTime: DEFAULT_ROUND_TIME,
      slots,
    };
  }),

  beginMatch: () => set((state) => {
    if (state.gamePhase !== 'lobby') return state;
    const playerReady = state.slots.player1.ready;
    const opponentReady = state.slots.player2.type === "cpu" ? true : state.slots.player2.ready;
    if (!playerReady || !opponentReady) return state;
    const playerFighter = state.slots.player1.fighterId;
    const opponentFighter = state.slots.player2.fighterId;
    return {
      gamePhase: 'fighting',
      paused: false,
      playerEvents: [],
      cpuEvents: [],
      player: createDefaultCharacterState(DEFAULT_POSITION_PLAYER, 1, playerFighter),
      cpu: createDefaultCharacterState(DEFAULT_POSITION_CPU, -1, opponentFighter),
      roundTime: DEFAULT_ROUND_TIME,
      slots: {
        player1: { ...state.slots.player1, ready: false },
        player2: {
          ...state.slots.player2,
          ready: state.slots.player2.type === "cpu",
          label: state.slots.player2.type === "human" ? "Player 2" : "CPU",
        },
      },
    };
  }),
  
  endRound: (winner) => set((state) => {
    let playerScore = state.playerScore;
    let cpuScore = state.cpuScore;
    
    if (winner === 'player') {
      playerScore += 1;
    } else if (winner === 'cpu') {
      cpuScore += 1;
    }
    
    return {
      gamePhase: resolveRoundPhase(playerScore, cpuScore),
      paused: false,
      playerScore,
      cpuScore
    };
  }),
  
  resetRound: () => set((state) => ({
    gamePhase: 'fighting',
    paused: false,
    playerEvents: [],
    cpuEvents: [],
    player: createDefaultCharacterState(DEFAULT_POSITION_PLAYER, 1, state.slots.player1.fighterId),
    cpu: createDefaultCharacterState(DEFAULT_POSITION_CPU, -1, state.slots.player2.fighterId),
    roundTime: DEFAULT_ROUND_TIME,
  })),

  restartMatch: () => set((state) => ({
    gamePhase: 'fighting',
    paused: false,
    playerScore: 0,
    cpuScore: 0,
    playerEvents: [],
    cpuEvents: [],
    player: createDefaultCharacterState(DEFAULT_POSITION_PLAYER, 1, state.slots.player1.fighterId),
    cpu: createDefaultCharacterState(DEFAULT_POSITION_CPU, -1, state.slots.player2.fighterId),
    roundTime: DEFAULT_ROUND_TIME,
  })),
  
  returnToMenu: () => set((state) => ({
    gamePhase: 'menu',
    paused: false,
    playerScore: 0,
    cpuScore: 0,
    playerEvents: [],
    cpuEvents: [],
    slots: createDefaultSlots(state.matchMode),
  })),
  
  // Player actions
  movePlayer: (x, y, z) => set((state) => ({
    player: {
      ...state.player,
      position: [x, y, z]
    }
  })),
  
  updatePlayerVelocity: (vx, vy, vz) => set((state) => ({
    player: {
      ...state.player,
      velocity: [vx, vy, vz]
    }
  })),
  
  setPlayerDirection: (direction) => set((state) => ({
    player: {
      ...state.player,
      direction
    }
  })),
  
  setPlayerJumping: (isJumping) => set((state) => ({
    player: {
      ...state.player,
      isJumping
    }
  })),
  
  setPlayerAttacking: (isAttacking) => set((state) => {
    return {
      player: {
        ...state.player,
        isAttacking
      }
    };
  }),
  
  setPlayerBlocking: (isBlocking) => set((state) => ({
    player: {
      ...state.player,
      isBlocking
    }
  })),
  
  damagePlayer: (amount) => set((state) => {
    const newHealth = Math.max(0, state.player.health - amount);
    const updatedPlayer = {
      ...state.player,
      health: newHealth,
    };

    if (newHealth === 0 && state.gamePhase === 'fighting') {
      const cpuScore = state.cpuScore + 1;
      awardRoundResolutionCoins('cpu', 'ko', {
        playerHealth: newHealth,
        cpuHealth: state.cpu.health,
      });
      return {
        player: updatedPlayer,
        gamePhase: resolveRoundPhase(state.playerScore, cpuScore),
        cpuScore
      };
    }

    return {
      player: updatedPlayer
    };
  }),
  
  // CPU actions
  moveCPU: (x, y, z) => set((state) => ({
    cpu: {
      ...state.cpu,
      position: [x, y, z]
    }
  })),
  
  updateCPUVelocity: (vx, vy, vz) => set((state) => ({
    cpu: {
      ...state.cpu,
      velocity: [vx, vy, vz]
    }
  })),
  
  setCPUDirection: (direction) => set((state) => ({
    cpu: {
      ...state.cpu,
      direction
    }
  })),
  
  setCPUJumping: (isJumping) => set((state) => ({
    cpu: {
      ...state.cpu,
      isJumping
    }
  })),
  
  setCPUAttacking: (isAttacking) => set((state) => {
    return {
      cpu: {
        ...state.cpu,
        isAttacking
      }
    };
  }),
  
  setCPUBlocking: (isBlocking) => set((state) => ({
    cpu: {
      ...state.cpu,
      isBlocking
    }
  })),
  
  damageCPU: (amount) => set((state) => {
    const newHealth = Math.max(0, state.cpu.health - amount);
    const deliveredKO = newHealth === 0 && state.gamePhase === 'fighting';
    if (deliveredKO) {
      awardRoundResolutionCoins('player', 'ko', {
        playerHealth: state.player.health,
        cpuHealth: newHealth,
      });
    }

    const updatedCPU = {
      ...state.cpu,
      health: newHealth,
    };

    if (newHealth === 0 && state.gamePhase === 'fighting') {
      const playerScore = state.playerScore + 1;
      return {
        cpu: updatedCPU,
        gamePhase: resolveRoundPhase(playerScore, state.cpuScore),
        playerScore
      };
    }

    return {
      cpu: updatedCPU
    };
  }),
  
  // New Player Action Methods
  setPlayerDodging: (isDodging) => set((state) => {
    return {
      player: {
        ...state.player,
        isDodging
      }
    };
  }),

  setPlayerGrabbing: (isGrabbing) => set((state) => {
    return {
      player: {
        ...state.player,
        isGrabbing
      }
    };
  }),

  setPlayerTaunting: (isTaunting) => set((state) => ({
    player: {
      ...state.player,
      isTaunting
    }
  })),

  setPlayerAirAttacking: (isAirAttacking) => set((state) => {
    return {
      player: {
        ...state.player,
        isAirAttacking
      }
    };
  }),

  resetPlayerAirJumps: () => set((state) => ({
    player: {
      ...state.player,
      airJumpsLeft: 2 // Reset to 2 air jumps
    }
  })),

  usePlayerAirJump: () => {
    let jumpSuccess = false;
    
    set((state) => {
      if (state.player.airJumpsLeft <= 0) {
        return state; // No changes to state
      }

      jumpSuccess = true;
      
      return {
        player: {
          ...state.player,
          airJumpsLeft: state.player.airJumpsLeft - 1
        }
      };
    });
    
    return jumpSuccess; // Return success flag
  },

  // New CPU Action Methods
  setCPUDodging: (isDodging) => set((state) => {
    return {
      cpu: {
        ...state.cpu,
        isDodging
      }
    };
  }),

  setCPUGrabbing: (isGrabbing) => set((state) => {
    return {
      cpu: {
        ...state.cpu,
        isGrabbing,
      },
    };
  }),

  setCPUAirAttacking: (isAirAttacking) => set((state) => {
    return {
      cpu: {
        ...state.cpu,
        isAirAttacking
      }
    };
  }),

  resetCPUAirJumps: () => set((state) => ({
    cpu: {
      ...state.cpu,
      airJumpsLeft: 2 // Reset to 2 air jumps
    }
  })),

  useCPUAirJump: () => {
    let jumpSuccess = false;
    
    set((state) => {
      if (state.cpu.airJumpsLeft <= 0) {
        // No air jumps left
        return state; // No changes to state
      }
      
      jumpSuccess = true;
      return {
        cpu: {
          ...state.cpu,
          airJumpsLeft: state.cpu.airJumpsLeft - 1
        }
      };
    });
    
    return jumpSuccess; // Return success flag
  },

  // Update player cooldowns
  updatePlayerCooldowns: (delta) => set((state) => {
    // Convert delta from seconds to milliseconds
    const deltaMs = delta * 1000;
    
    // Update all cooldowns using time-based calculation
    const newAttackCooldown = state.player.attackCooldown > 0 
      ? Math.max(0, state.player.attackCooldown - deltaMs) 
      : 0;
      
    const newDodgeCooldown = state.player.dodgeCooldown > 0
      ? Math.max(0, state.player.dodgeCooldown - deltaMs)
      : 0;
      
    const newGrabCooldown = state.player.grabCooldown > 0
      ? Math.max(0, state.player.grabCooldown - deltaMs)
      : 0;
      
    const newMoveCooldown = state.player.moveCooldown > 0
      ? Math.max(0, state.player.moveCooldown - deltaMs)
      : 0;
    
    // Update combo timer and reset combo if timeout
    let newComboTimer = state.player.comboTimer > 0
      ? Math.max(0, state.player.comboTimer - deltaMs)
      : 0;
    
    let newComboCount = state.player.comboCount;
    
    // If combo timer expired, reset combo
    if (state.player.comboTimer > 0 && newComboTimer === 0 && state.player.comboCount > 0) {
      if (useControls.getState().debugMode) {
        console.log("Player combo reset - timeout!");
      }
      newComboCount = 0;
    }
    
    return {
      player: {
        ...state.player,
        attackCooldown: newAttackCooldown,
        dodgeCooldown: newDodgeCooldown,
        grabCooldown: newGrabCooldown,
        moveCooldown: newMoveCooldown,
        comboTimer: newComboTimer,
        comboCount: newComboCount
      }
    };
  }),
  
  updatePlayerMeters: (meters) => set((state) => {
    const nextGuard = meters.guard !== undefined ? clamp(meters.guard, 0, DEFAULT_GUARD) : state.player.guardMeter;
    const guardBroken = nextGuard <= GUARD_BREAK_THRESHOLD;
    return {
      player: {
        ...state.player,
        guardMeter: nextGuard,
        staminaMeter: meters.stamina !== undefined ? clamp(meters.stamina, 0, DEFAULT_STAMINA) : state.player.staminaMeter,
        specialMeter: meters.special !== undefined ? clamp(meters.special, 0, MAX_SPECIAL) : state.player.specialMeter,
        isBlocking: guardBroken ? false : state.player.isBlocking,
        isDodging: guardBroken ? false : state.player.isDodging,
      },
      playerStatus: guardBroken ? "guard_break" : state.playerStatus,
    };
  }),
  
  updatePlayerGuardBreak: () => set((state) => ({
    player: {
      ...state.player,
      guardMeter: 0,
      isBlocking: false,
      isDodging: false,
    },
    playerStatus: "guard_break",
  })),
  
  // Update CPU cooldowns
  updateCPUCooldowns: (delta) => set((state) => {
    // Convert delta from seconds to milliseconds
    const deltaMs = delta * 1000;
    
    // Update all cooldowns using time-based calculation
    const newAttackCooldown = state.cpu.attackCooldown > 0 
      ? Math.max(0, state.cpu.attackCooldown - deltaMs) 
      : 0;
      
    const newDodgeCooldown = state.cpu.dodgeCooldown > 0
      ? Math.max(0, state.cpu.dodgeCooldown - deltaMs)
      : 0;
      
    const newGrabCooldown = state.cpu.grabCooldown > 0
      ? Math.max(0, state.cpu.grabCooldown - deltaMs)
      : 0;
      
    const newMoveCooldown = state.cpu.moveCooldown > 0
      ? Math.max(0, state.cpu.moveCooldown - deltaMs)
      : 0;
    
    // Update combo timer and reset combo if timeout
    let newComboTimer = state.cpu.comboTimer > 0
      ? Math.max(0, state.cpu.comboTimer - deltaMs)
      : 0;
    
    let newComboCount = state.cpu.comboCount;
    
    // If combo timer expired, reset combo
    if (state.cpu.comboTimer > 0 && newComboTimer === 0 && state.cpu.comboCount > 0) {
      if (useControls.getState().debugMode) {
        console.log("CPU combo reset - timeout!");
      }
      newComboCount = 0;
    }
    
    return {
      cpu: {
        ...state.cpu,
        attackCooldown: newAttackCooldown,
        dodgeCooldown: newDodgeCooldown,
        grabCooldown: newGrabCooldown,
        moveCooldown: newMoveCooldown,
        comboTimer: newComboTimer,
        comboCount: newComboCount
      }
    };
  }),
  
  updateCPUMeters: (meters) => set((state) => {
    const nextGuard = meters.guard !== undefined ? clamp(meters.guard, 0, DEFAULT_GUARD) : state.cpu.guardMeter;
    const guardBroken = nextGuard <= GUARD_BREAK_THRESHOLD;
    return {
      cpu: {
        ...state.cpu,
        guardMeter: nextGuard,
        staminaMeter: meters.stamina !== undefined ? clamp(meters.stamina, 0, DEFAULT_STAMINA) : state.cpu.staminaMeter,
        specialMeter: meters.special !== undefined ? clamp(meters.special, 0, MAX_SPECIAL) : state.cpu.specialMeter,
        isBlocking: guardBroken ? false : state.cpu.isBlocking,
        isDodging: guardBroken ? false : state.cpu.isDodging,
      },
      cpuStatus: guardBroken ? "guard_break" : state.cpuStatus,
    };
  }),
  
  updateCPUGuardBreak: () => set((state) => ({
    cpu: {
      ...state.cpu,
      guardMeter: 0,
      isBlocking: false,
      isDodging: false,
    },
    cpuStatus: "guard_break",
  })),
  
  // Game time
  updateRoundTime: (delta) => set((state) => {
    const newTime = Math.max(0, state.roundTime - delta);
    
    // If time is up, end the round
    if (newTime === 0 && state.gamePhase === 'fighting') {
      // Determine winner based on health
      let winner: 'player' | 'cpu' | 'timeout' = 'timeout';
      if (state.player.health > state.cpu.health) {
        winner = 'player';
      } else if (state.cpu.health > state.player.health) {
        winner = 'cpu';
      }
      awardRoundResolutionCoins(winner, 'timeout', {
        playerHealth: state.player.health,
        cpuHealth: state.cpu.health,
      });
      
      return {
        roundTime: newTime,
        gamePhase: resolveRoundPhase(
          winner === 'player' ? state.playerScore + 1 : state.playerScore,
          winner === 'cpu' ? state.cpuScore + 1 : state.cpuScore,
        ),
        paused: false,
        playerScore: winner === 'player' ? state.playerScore + 1 : state.playerScore,
        cpuScore: winner === 'cpu' ? state.cpuScore + 1 : state.cpuScore
      };
    }
    
    return {
      roundTime: newTime
    };
  }),
  setMatchMode: (mode) => set((state) => ({
    matchMode: mode,
    slots: state.gamePhase === 'lobby' ? createDefaultSlots(mode) : state.slots,
  })),
  setArenaId: (arenaId) =>
    set(() => ({
      arenaId: ARENA_THEMES[arenaId] ? arenaId : DEFAULT_ARENA_ID,
    })),
  setSlotType: (slot, type) => set((state) => {
    if (slot === "player1") {
      return {
        slots: {
          ...state.slots,
          player1: { ...state.slots.player1, type: "human", label: "Player 1" },
        },
      };
    }
    const nextMode: MatchMode = type === "human" ? (state.matchMode === "online" ? "online" : "local") : "single";
    return {
      matchMode: nextMode,
      slots: {
        ...state.slots,
        player2: {
          type,
          ready: type === "cpu",
          label: type === "human" ? (nextMode === "online" ? "Remote" : "Player 2") : "CPU",
          fighterId: type === "cpu" ? "stick_villain" : state.slots.player2.fighterId,
        },
      },
    };
  }),
  setSlotFighter: (slot, fighter) =>
    set((state) => ({
      slots: {
        ...state.slots,
        [slot]: {
          ...state.slots[slot],
          fighterId: fighter,
        },
      },
    })),
  setSlotReady: (slot, ready) => set((state) => {
    const current = state.slots[slot];
    if (current.type === "cpu" && slot === "player2") {
      return state;
    }
    return {
      slots: {
        ...state.slots,
        [slot]: {
          ...current,
          ready,
        },
      },
    };
  }),
  pauseGame: () =>
    set((state) => (state.gamePhase === 'fighting' ? { paused: true } : state)),
  resumeGame: () =>
    set((state) => (state.paused ? { paused: false } : state)),
  togglePause: () =>
    set((state) =>
      state.gamePhase === 'fighting'
        ? {
            paused: !state.paused,
          }
        : state,
    ),


  // Score calculation and submission
  calculateFinalScore: () => {
    const state = get();
    let score = 0;
    
    // Base score from rounds won
    score += state.playerScore * 1000;
    
    // Bonus for winning quickly (time remaining)
    if (state.playerScore > state.cpuScore) {
      score += state.roundTime * 10;
    }
    
    // Bonus for player health remaining
    score += state.player.health * 5;
    
    // Combo bonus
    score += state.player.comboCount * 50;
    
    return Math.max(0, score);
  },

  submitScore: async (finalScore: number) => {
    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          score: finalScore,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit score');
      }
      
      const result = await response.json();
    } catch (error) {
      console.error('Error submitting score:', error);
    }
  }
}));
