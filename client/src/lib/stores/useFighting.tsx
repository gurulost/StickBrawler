import { create } from 'zustand';
import { COMBO_WINDOW, COMBO_MULTIPLIER } from '../../game/Physics';
import { useControls } from './useControls';
import { clamp } from '../clamp';
import { useCustomization } from './useCustomization';
import type { CoinAwardPayload } from './useCustomization';

export type GamePhase = 'menu' | 'lobby' | 'fighting' | 'round_end' | 'match_end';
export type MatchMode = "single" | "local";
export type Character = 'stick_hero' | 'stick_villain';

export interface CharacterState {
  health: number;
  position: [number, number, number]; // [x, y, z]
  direction: 1 | -1; // 1 for right, -1 for left
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
  
  velocity: [number, number, number];
}

export type PlayerSlot = "player1" | "player2";

export type SlotAssignment = {
  type: "human" | "cpu";
  ready: boolean;
  label: string;
};

type SlotState = Record<PlayerSlot, SlotAssignment>;

interface FightingState {
  gamePhase: GamePhase;
  matchMode: MatchMode;
  slots: SlotState;
  paused: boolean;
  player: CharacterState;
  cpu: CharacterState;
  playerScore: number;
  cpuScore: number;
  playerStatus?: "guard_break";
  cpuStatus?: "guard_break";
  roundTime: number;
  maxRoundTime: number;
  currentGameScore: number; // Total score for current game session
  
  // High score tracking
  submitScore: (finalScore: number) => Promise<void>;
  calculateFinalScore: () => number;

  // Actions
  startGame: (mode?: MatchMode) => void;
  beginMatch: () => void;
  endRound: (winner: 'player' | 'cpu' | 'timeout') => void;
  resetRound: () => void;
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
  setSlotType: (slot: PlayerSlot, type: "human" | "cpu") => void;
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

const createDefaultSlots = (mode: MatchMode): SlotState => ({
  player1: { type: "human", ready: false, label: "Player 1" },
  player2: {
    type: mode === "local" ? "human" : "cpu",
    ready: mode !== "local",
    label: mode === "local" ? "Player 2" : "CPU",
  },
});

const roundToHundredth = (value: number) => Math.round(value * 100) / 100;

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

const createDefaultCharacterState = (position: [number, number, number], direction: 1 | -1): CharacterState => ({
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
  
  velocity: [0, 0, 0],
});

export const useFighting = create<FightingState>((set, get) => ({
  gamePhase: 'menu',
  matchMode: "single",
  slots: createDefaultSlots("single"),
  paused: false,
  player: createDefaultCharacterState(DEFAULT_POSITION_PLAYER, 1),
  cpu: createDefaultCharacterState(DEFAULT_POSITION_CPU, -1),
  playerScore: 0,
  cpuScore: 0,
  playerStatus: undefined,
  cpuStatus: undefined,
  roundTime: DEFAULT_ROUND_TIME,
  maxRoundTime: DEFAULT_ROUND_TIME,
  currentGameScore: 0,
  
  startGame: (mode) => set((state) => {
    const targetMode = mode ?? state.matchMode;
    return {
      gamePhase: 'lobby',
      matchMode: targetMode,
      paused: false,
      playerScore: 0,
      cpuScore: 0,
      player: createDefaultCharacterState(DEFAULT_POSITION_PLAYER, 1),
      cpu: createDefaultCharacterState(DEFAULT_POSITION_CPU, -1),
      roundTime: DEFAULT_ROUND_TIME,
      slots: createDefaultSlots(targetMode),
    };
  }),

  beginMatch: () => set((state) => {
    if (state.gamePhase !== 'lobby') return state;
    const playerReady = state.slots.player1.ready;
    const opponentReady = state.slots.player2.type === "cpu" ? true : state.slots.player2.ready;
    if (!playerReady || !opponentReady) return state;
    return {
      gamePhase: 'fighting',
      paused: false,
      player: createDefaultCharacterState(DEFAULT_POSITION_PLAYER, 1),
      cpu: createDefaultCharacterState(DEFAULT_POSITION_CPU, -1),
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
      gamePhase: 'round_end',
      paused: false,
      playerScore,
      cpuScore
    };
  }),
  
  resetRound: () => set(() => ({
    gamePhase: 'fighting',
    paused: false,
    player: createDefaultCharacterState(DEFAULT_POSITION_PLAYER, 1),
    cpu: createDefaultCharacterState(DEFAULT_POSITION_CPU, -1),
    roundTime: DEFAULT_ROUND_TIME,
  })),
  
  returnToMenu: () => set((state) => ({
    gamePhase: 'menu',
    paused: false,
    playerScore: 0,
    cpuScore: 0,
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
    // Only set cooldown when starting an attack and no cooldown is active
    if (isAttacking && !state.player.isAttacking && state.player.attackCooldown === 0) {
      return {
        player: {
          ...state.player,
          isAttacking,
          attackCooldown: 500 // 500ms cooldown in milliseconds
        }
      };
    }
    
    // Just update attacking state without changing cooldown
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
    // If player is blocking, reduce damage by 80%
    let actualDamage = state.player.isBlocking ? amount * 0.2 : amount;
    
    // If player is dodging, reduce damage by 95%
    if (state.player.isDodging) {
      actualDamage = amount * 0.05;
    }
    
    // If CPU has a combo going, apply combo multiplier with reasonable cap
    if (state.cpu.comboCount > 0) {
      // Cap combo multiplier at 2.5x (maximum 7-8 hit combos)
      const comboMultiplier = Math.min(2.5, 1 + (state.cpu.comboCount * 0.15));
      actualDamage = actualDamage * comboMultiplier;
    }
    
    const newHealth = Math.max(0, state.player.health - actualDamage);
    
    // Update CPU's combo counter
    let updatedCPU = {...state.cpu};
    
    // If this is another hit within the combo window, increment combo counter
    if (state.cpu.comboTimer > 0) {
      updatedCPU.comboCount = Math.min(10, state.cpu.comboCount + 1); // Cap combo at 10 hits
      updatedCPU.comboTimer = COMBO_WINDOW; // Reset combo timer
    } else {
      // Start a new combo
      updatedCPU.comboCount = 1;
      updatedCPU.comboTimer = COMBO_WINDOW;
    }
    
    // Reset player's combo when taking damage (combo breaker)
    let updatedPlayer = {
      ...state.player,
      health: newHealth,
      comboCount: 0,
      comboTimer: 0
    };
    
    // If health is 0, end the round
    if (newHealth === 0 && state.gamePhase === 'fighting') {
      awardRoundResolutionCoins('cpu', 'ko', {
        playerHealth: newHealth,
        cpuHealth: state.cpu.health,
      });
      return {
        player: updatedPlayer,
        cpu: updatedCPU,
        gamePhase: 'round_end',
        cpuScore: state.cpuScore + 1
      };
    }
    
    return {
      player: updatedPlayer,
      cpu: updatedCPU
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
    // Only set cooldown when starting an attack and no cooldown is active
    if (isAttacking && !state.cpu.isAttacking && state.cpu.attackCooldown === 0) {
      return {
        cpu: {
          ...state.cpu,
          isAttacking,
          attackCooldown: 500 // 500ms cooldown in milliseconds
        }
      };
    }
    
    // Just update attacking state without changing cooldown
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
    // If CPU is blocking, reduce damage by 80%
    let actualDamage = state.cpu.isBlocking ? amount * 0.2 : amount;
    
    // If CPU is dodging, reduce damage by 95%
    if (state.cpu.isDodging) {
      actualDamage = amount * 0.05;
    }
    
    // If player has a combo going, apply combo multiplier with reasonable cap
    if (state.player.comboCount > 0) {
      // Cap combo multiplier at 2.5x (maximum 7-8 hit combos)
      const comboMultiplier = Math.min(2.5, 1 + (state.player.comboCount * 0.15));
      actualDamage = actualDamage * comboMultiplier;
    }
    
    // Apply the damage
    const newHealth = Math.max(0, state.cpu.health - actualDamage);
    const comboDepthBeforeHit =
      state.player.comboTimer > 0 ? Math.max(1, state.player.comboCount) : 0;
    const deliveredKO = newHealth === 0 && state.gamePhase === 'fighting';
    awardDamageCoins({
      damage: actualDamage,
      comboDepth: comboDepthBeforeHit,
      finisher: deliveredKO,
      playerHealth: state.player.health,
    });
    if (deliveredKO) {
      awardRoundResolutionCoins('player', 'ko', {
        playerHealth: state.player.health,
        cpuHealth: newHealth,
      });
    }
    
    // Update player's combo counter
    let updatedPlayer = {...state.player};
    
    // If this is another hit within the combo window, increment combo counter
    if (state.player.comboTimer > 0) {
      updatedPlayer.comboCount = Math.min(10, state.player.comboCount + 1); // Cap combo at 10 hits
      updatedPlayer.comboTimer = COMBO_WINDOW; // Reset combo timer
    } else {
      // Start a new combo
      updatedPlayer.comboCount = 1;
      updatedPlayer.comboTimer = COMBO_WINDOW;
    }
    
    // Reset CPU's combo when taking damage (combo breaker)
    let updatedCPU = {
      ...state.cpu,
      health: newHealth,
      comboCount: 0,
      comboTimer: 0
    };
    
    // If health is 0, end the round
    if (newHealth === 0 && state.gamePhase === 'fighting') {
      return {
        cpu: updatedCPU,
        player: updatedPlayer,
        gamePhase: 'round_end',
        playerScore: state.playerScore + 1
      };
    }
    
    return {
      cpu: updatedCPU,
      player: updatedPlayer
    };
  }),
  
  // New Player Action Methods
  setPlayerDodging: (isDodging) => set((state) => {
    // Start dodge cooldown when beginning to dodge
    let newCooldown = state.player.dodgeCooldown;
    if (isDodging && !state.player.isDodging) {
      newCooldown = 20; // Dodge has longer cooldown than attacks
    }
    
    return {
      player: {
        ...state.player,
        isDodging,
        dodgeCooldown: newCooldown
      }
    };
  }),

  setPlayerGrabbing: (isGrabbing) => set((state) => {
    // Start grab cooldown when beginning to grab
    let newCooldown = state.player.grabCooldown;
    if (isGrabbing && !state.player.isGrabbing) {
      newCooldown = 30; // Grab has longer cooldown
    }
    
    return {
      player: {
        ...state.player,
        isGrabbing,
        grabCooldown: newCooldown
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
    if (isAirAttacking && !state.player.isJumping) {
      // Can't air attack if not in the air
      return {}; // No change
    }
    
    // Air attacks have a separate state from ground attacks
    let newCooldown = state.player.attackCooldown;
    if (isAirAttacking && !state.player.isAirAttacking) {
      newCooldown = 15; // Air attacks have longer cooldown
    }
    
    return {
      player: {
        ...state.player,
        isAirAttacking,
        attackCooldown: newCooldown
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
    // Start dodge cooldown when beginning to dodge
    let newCooldown = state.cpu.dodgeCooldown;
    if (isDodging && !state.cpu.isDodging) {
      newCooldown = 20; // Dodge has longer cooldown than attacks
    }
    
    return {
      cpu: {
        ...state.cpu,
        isDodging,
        dodgeCooldown: newCooldown
      }
    };
  }),

  setCPUGrabbing: (isGrabbing) => set((state) => {
    let newCooldown = state.cpu.grabCooldown;
    if (isGrabbing && !state.cpu.isGrabbing) {
      newCooldown = 30;
    }
    return {
      cpu: {
        ...state.cpu,
        isGrabbing,
        grabCooldown: newCooldown,
      },
    };
  }),

  setCPUAirAttacking: (isAirAttacking) => set((state) => {
    if (isAirAttacking && !state.cpu.isJumping) {
      // Can't air attack if not in the air
      return {}; // No change
    }
    
    // Air attacks have a separate state from ground attacks
    let newCooldown = state.cpu.attackCooldown;
    if (isAirAttacking && !state.cpu.isAirAttacking) {
      newCooldown = 15; // Air attacks have longer cooldown
    }
    
    return {
      cpu: {
        ...state.cpu,
        isAirAttacking,
        attackCooldown: newCooldown
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
        gamePhase: 'round_end',
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
  setSlotType: (slot, type) => set((state) => {
    if (slot === "player1") {
      return {
        slots: {
          ...state.slots,
          player1: { ...state.slots.player1, type: "human", label: "Player 1" },
        },
      };
    }
    const nextMode = type === "human" ? "local" : "single";
    return {
      matchMode: nextMode,
      slots: {
        ...state.slots,
        player2: {
          type,
          ready: type === "cpu",
          label: type === "human" ? "Player 2" : "CPU",
        },
      },
    };
  }),
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
