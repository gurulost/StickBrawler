import { create } from 'zustand';
import { useCustomization } from './useCustomization';
import type { CoinAwardPayload } from './useCustomization';
import { DEFAULT_ARENA_ID, ARENA_THEMES } from '../../game/arenas';
import type { FighterId } from "../../combat/moveTable";
import type { FighterActionState } from "../../combat/types";
import { ONLINE_MULTIPLAYER_ENABLED } from "@shared/productFlags";
import type {
  CombatEvent,
  FighterPresentationSnapshot,
  PresentationMovePhase,
  RuntimeFrameSnapshot,
} from "../../game/combatPresentation";
import { useCombatDebug } from "./useCombatDebug";

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
  landingLagFrames?: number;
  canAct?: boolean;
  invulnerable?: boolean;
  armored?: boolean;
  guardBroken?: boolean;
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
  runtimeResetNonce: number;
  
  // High score tracking
  submitScore: (finalScore: number) => Promise<void>;
  calculateFinalScore: () => number;
  applyRuntimeFrame: (frame: RuntimeFrameSnapshot) => void;
  applyCombatEvents: (events: CombatEvent[]) => void;

  // Actions
  startGame: (mode?: MatchMode) => void;
  beginMatch: () => void;
  resetRound: () => void;
  restartMatch: () => void;
  returnToMenu: () => void;

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
const DEFAULT_POSITION_PLAYER: [number, number, number] = [-2, 0, 0];
const DEFAULT_POSITION_CPU: [number, number, number] = [2, 0, 0];
const DEFAULT_ROUND_TIME = 60; // 60 seconds per round
const ROUNDS_TO_WIN = 2;

const normalizeMatchMode = (mode: MatchMode): MatchMode =>
  !ONLINE_MULTIPLAYER_ENABLED && mode === "online" ? "local" : mode;

const createDefaultSlots = (mode: MatchMode): SlotState => {
  const normalizedMode = normalizeMatchMode(mode);
  return ({
  player1: { type: "human", ready: false, label: "Player 1", fighterId: "stick_hero" },
  player2: {
    type: normalizedMode === "single" ? "cpu" : "human",
    ready: normalizedMode === "single",
    label: normalizedMode === "single" ? "CPU" : "Player 2",
    fighterId: normalizedMode === "single" ? "stick_villain" : "stick_hero",
  },
});
};

const roundToHundredth = (value: number) => Math.round(value * 100) / 100;

const resolveRoundPhase = (playerScore: number, cpuScore: number): GamePhase =>
  playerScore >= ROUNDS_TO_WIN || cpuScore >= ROUNDS_TO_WIN ? 'match_end' : 'round_end';

const resolveTimeoutWinner = (
  playerHealth: number,
  cpuHealth: number,
): 'player' | 'cpu' | 'timeout' => {
  if (playerHealth > cpuHealth) return "player";
  if (cpuHealth > playerHealth) return "cpu";
  return "timeout";
};

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
  landingLagFrames: 0,
  canAct: true,
  invulnerable: false,
  armored: false,
  guardBroken: false,
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
  runtimeResetNonce: 0,
  applyRuntimeFrame: (frame) => set((state) => {
    const nextPlayer = toCharacterState(frame.player, state.player);
    const nextCPU = toCharacterState(frame.cpu, state.cpu);
    const nextRoundTime = Math.max(0, frame.roundTimeRemaining);
    const nextState: Partial<FightingState> = {
      player: nextPlayer,
      cpu: nextCPU,
      roundTime: nextRoundTime,
      maxRoundTime: frame.maxRoundTime,
      playerStatus: nextPlayer.guardBroken ? "guard_break" : undefined,
      cpuStatus: nextCPU.guardBroken ? "guard_break" : undefined,
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
      } else if (state.roundTime > 0 && nextRoundTime <= 0) {
        const winner = resolveTimeoutWinner(nextPlayer.health, nextCPU.health);
        awardRoundResolutionCoins(winner, 'timeout', {
          playerHealth: nextPlayer.health,
          cpuHealth: nextCPU.health,
        });
        if (winner === "player") {
          const playerScore = state.playerScore + 1;
          nextState.playerScore = playerScore;
          nextState.gamePhase = resolveRoundPhase(playerScore, state.cpuScore);
        } else if (winner === "cpu") {
          const cpuScore = state.cpuScore + 1;
          nextState.cpuScore = cpuScore;
          nextState.gamePhase = resolveRoundPhase(state.playerScore, cpuScore);
        } else {
          nextState.gamePhase = resolveRoundPhase(state.playerScore, state.cpuScore);
        }
      }
    }

    useCombatDebug.getState().recordFrame({
      player: nextPlayer,
      cpu: nextCPU,
      playerEvents: state.playerEvents,
      cpuEvents: state.cpuEvents,
      roundTimeRemaining: nextRoundTime,
      maxRoundTime: frame.maxRoundTime,
    });

    return nextState;
  }),
  applyCombatEvents: (events) => set((state) => {
    const playerEvents = filterSlotEvents(events, "player");
    const cpuEvents = filterSlotEvents(events, "cpu");
    useCombatDebug.getState().pushPendingEvents(events);

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
    useCombatDebug.getState().clearHistory();
    const targetMode = normalizeMatchMode(mode ?? state.matchMode);
    const slots = createDefaultSlots(targetMode);
    return {
      gamePhase: 'lobby',
      matchMode: targetMode,
      paused: false,
      playerScore: 0,
      cpuScore: 0,
      playerEvents: [],
      cpuEvents: [],
      playerStatus: undefined,
      cpuStatus: undefined,
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
    useCombatDebug.getState().clearHistory();
    const playerFighter = state.slots.player1.fighterId;
    const opponentFighter = state.slots.player2.fighterId;
    return {
      gamePhase: 'fighting',
      paused: false,
      playerEvents: [],
      cpuEvents: [],
      playerStatus: undefined,
      cpuStatus: undefined,
      runtimeResetNonce: state.runtimeResetNonce + 1,
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
  
  resetRound: () => set((state) => {
    useCombatDebug.getState().clearHistory();
    return {
      gamePhase: 'fighting',
      paused: false,
      playerEvents: [],
      cpuEvents: [],
      playerStatus: undefined,
      cpuStatus: undefined,
      runtimeResetNonce: state.runtimeResetNonce + 1,
      player: createDefaultCharacterState(DEFAULT_POSITION_PLAYER, 1, state.slots.player1.fighterId),
      cpu: createDefaultCharacterState(DEFAULT_POSITION_CPU, -1, state.slots.player2.fighterId),
      roundTime: DEFAULT_ROUND_TIME,
    };
  }),

  restartMatch: () => set((state) => {
    useCombatDebug.getState().clearHistory();
    return {
      gamePhase: 'fighting',
      paused: false,
      playerScore: 0,
      cpuScore: 0,
      playerEvents: [],
      cpuEvents: [],
      playerStatus: undefined,
      cpuStatus: undefined,
      runtimeResetNonce: state.runtimeResetNonce + 1,
      player: createDefaultCharacterState(DEFAULT_POSITION_PLAYER, 1, state.slots.player1.fighterId),
      cpu: createDefaultCharacterState(DEFAULT_POSITION_CPU, -1, state.slots.player2.fighterId),
      roundTime: DEFAULT_ROUND_TIME,
    };
  }),
  
  returnToMenu: () => set((state) => {
    useCombatDebug.getState().clearHistory();
    return {
      gamePhase: 'menu',
      paused: false,
      playerScore: 0,
      cpuScore: 0,
      playerEvents: [],
      cpuEvents: [],
      playerStatus: undefined,
      cpuStatus: undefined,
      matchMode: normalizeMatchMode(state.matchMode),
      slots: createDefaultSlots(state.matchMode),
    };
  }),
  setMatchMode: (mode) => set((state) => {
    const normalizedMode = normalizeMatchMode(mode);
    return {
      matchMode: normalizedMode,
      slots: state.gamePhase === 'lobby' ? createDefaultSlots(normalizedMode) : state.slots,
    };
  }),
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
    const nextMode: MatchMode = type === "human"
      ? normalizeMatchMode(state.matchMode === "online" ? "online" : "local")
      : "single";
    return {
      matchMode: nextMode,
      slots: {
        ...state.slots,
        player2: {
          type,
          ready: type === "cpu",
          label: type === "human" ? "Player 2" : "CPU",
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
