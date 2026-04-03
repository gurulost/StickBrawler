import { create } from 'zustand';
import { useCustomization } from './useCustomization';
import type { CoinAwardPayload } from './useCustomization';
import { DEFAULT_ARENA_ID, ARENA_THEMES } from '../../game/arenas';
import {
  DEFAULT_CPU_FIGHTER_ID,
  DEFAULT_PLAYER_FIGHTER_ID,
} from "../../combat/fighterRoster";
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
import { useControls } from "./useControls";
import { useTrainingMode } from "./useTrainingMode";
import {
  DEFAULT_CPU_CONFIG,
  type CpuConfig,
  type CpuDifficulty,
  type CpuStyle,
} from "../../game/cpuBrain";
import {
  calculateArcadeMatchScore,
  createArcadeRun,
  getArcadeEncounter,
  getNextArcadeEncounter,
  type ArcadeEncounter,
  type ArcadeRunState,
} from "../../game/arcadeRun";

export type GamePhase = 'menu' | 'lobby' | 'training' | 'fighting' | 'round_end' | 'match_end';
export type MatchMode = "single" | "local" | "online";
export type SessionMode = "versus" | "training" | "arcade";
export type Character = FighterId;
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
  cpuConfig: CpuConfig;
};

type SlotState = Record<PlayerSlot, SlotAssignment>;

interface FightingState {
  gamePhase: GamePhase;
  matchMode: MatchMode;
  sessionMode: SessionMode;
  slots: SlotState;
  arcadeRun?: ArcadeRunState;
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
  startTraining: () => void;
  startArcade: () => void;
  beginMatch: () => void;
  continueArcade: () => void;
  resetRound: () => void;
  restartMatch: () => void;
  returnToMenu: () => void;

  setMatchMode: (mode: MatchMode) => void;
  setArenaId: (arenaId: string) => void;
  setSlotType: (slot: PlayerSlot, type: "human" | "cpu") => void;
  setSlotFighter: (slot: PlayerSlot, fighter: FighterId) => void;
  setSlotCpuStyle: (slot: PlayerSlot, style: CpuStyle) => void;
  setSlotCpuDifficulty: (slot: PlayerSlot, difficulty: CpuDifficulty) => void;
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
const TRAINING_POSITION_PLAYER: [number, number, number] = [-1.35, 0, 0];
const TRAINING_POSITION_CPU: [number, number, number] = [1.35, 0, 0];
const DEFAULT_ROUND_TIME = 60; // 60 seconds per round
const ROUNDS_TO_WIN = 2;

export const isLiveCombatPhase = (phase: GamePhase) =>
  phase === "fighting" || phase === "training";

export const isCombatScenePhase = (phase: GamePhase) =>
  isLiveCombatPhase(phase) || phase === "round_end" || phase === "match_end";

const normalizeMatchMode = (mode: MatchMode): MatchMode =>
  !ONLINE_MULTIPLAYER_ENABLED && mode === "online" ? "local" : mode;

const cloneCpuConfig = (config: Partial<CpuConfig> = {}): CpuConfig => ({
  ...DEFAULT_CPU_CONFIG,
  ...config,
});

const createDefaultSlots = (mode: MatchMode): SlotState => {
  const normalizedMode = normalizeMatchMode(mode);
  return ({
  player1: {
    type: "human",
    ready: false,
    label: "Player 1",
    fighterId: DEFAULT_PLAYER_FIGHTER_ID,
    cpuConfig: cloneCpuConfig(),
  },
  player2: {
    type: normalizedMode === "single" ? "cpu" : "human",
    ready: normalizedMode === "single",
    label: normalizedMode === "single" ? "CPU" : "Player 2",
    fighterId: normalizedMode === "single" ? DEFAULT_CPU_FIGHTER_ID : DEFAULT_PLAYER_FIGHTER_ID,
    cpuConfig: cloneCpuConfig(),
  },
});
};

const createArcadeSlots = (
  playerFighter: FighterId,
  encounter: ArcadeEncounter,
): SlotState => ({
  player1: {
    type: "human",
    ready: false,
    label: "Player 1",
    fighterId: playerFighter,
    cpuConfig: cloneCpuConfig(),
  },
  player2: {
    type: "cpu",
    ready: true,
    label: encounter.label,
    fighterId: encounter.fighterId,
    cpuConfig: cloneCpuConfig(encounter.cpuConfig),
  },
});

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

const resetTrainingSessionState = () => {
  useTrainingMode.getState().resetSession();
  useControls.getState().clearCombatTraining();
  useControls.getState().resetCombatPlayback();
};

const startTrainingSessionState = (fighterId: FighterId) => {
  useTrainingMode.getState().startSession(fighterId);
  useControls.getState().clearCombatTraining();
  useControls.getState().resetCombatPlayback();
};

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

const awardArcadeClearCoins = (
  encounter: ArcadeEncounter,
  flawless: boolean,
  finalClear: boolean,
) => {
  const amount = encounter.clearCoins + (flawless ? 20 : 0) + (finalClear ? 120 : 0);
  awardCoinsSafe({
    amount,
    reason: finalClear ? "arcade_run_clear" : "arcade_fight_clear",
    metadata: {
      encounterId: encounter.id,
      encounterLabel: encounter.label,
      flawless,
      finalClear,
      amount,
    },
  });
};

const createDefaultCharacterState = (
  position: [number, number, number],
  direction: 1 | -1,
  fighterId: FighterId = DEFAULT_PLAYER_FIGHTER_ID,
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

type EncounterLayout = "versus" | "training";

const createEncounterCharacters = (
  playerFighter: FighterId,
  cpuFighter: FighterId,
  layout: EncounterLayout = "versus",
) => {
  const playerPosition =
    layout === "training" ? TRAINING_POSITION_PLAYER : DEFAULT_POSITION_PLAYER;
  const cpuPosition =
    layout === "training" ? TRAINING_POSITION_CPU : DEFAULT_POSITION_CPU;
  return {
    player: createDefaultCharacterState(playerPosition, 1, playerFighter),
    cpu: createDefaultCharacterState(cpuPosition, -1, cpuFighter),
  };
};

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

const resolveArcadeMatchState = (
  state: FightingState,
  nextPlayer: CharacterState,
  nextRoundTime: number,
  playerRoundsWon: number,
  cpuRoundsWon: number,
) => {
  if (state.sessionMode !== "arcade" || !state.arcadeRun) return {};
  const encounter = getArcadeEncounter(state.arcadeRun);
  if (!encounter) return {};

  const playerWon = playerRoundsWon > cpuRoundsWon;
  if (!playerWon) {
    return {
      arcadeRun: {
        ...state.arcadeRun,
        status: "lost" as const,
        lastResult: "lost" as const,
        lastMatchScore: 0,
      },
    };
  }

  const alreadyCleared = state.arcadeRun.clearedEncounterIds.includes(encounter.id);
  const clearedEncounterIds = alreadyCleared
    ? state.arcadeRun.clearedEncounterIds
    : [...state.arcadeRun.clearedEncounterIds, encounter.id];
  const finalClear = clearedEncounterIds.length >= state.arcadeRun.encounters.length;
  const matchScore =
    calculateArcadeMatchScore({
      encounter,
      encounterIndex: state.arcadeRun.currentEncounterIndex,
      cpuRoundsWon,
      playerHealth: nextPlayer.health,
      roundTimeRemaining: nextRoundTime,
    }) + (finalClear ? 1500 : 0);
  const flawless = cpuRoundsWon === 0;
  awardArcadeClearCoins(encounter, flawless, finalClear);

  return {
    currentGameScore: state.currentGameScore + matchScore,
    arcadeRun: {
      ...state.arcadeRun,
      status: finalClear ? ("won" as const) : ("between_fights" as const),
      clearedEncounterIds,
      flawlessMatches: state.arcadeRun.flawlessMatches + (flawless ? 1 : 0),
      lastMatchScore: matchScore,
      lastResult: "won" as const,
    },
  };
};

export const useFighting = create<FightingState>((set, get) => ({
  gamePhase: 'menu',
  matchMode: "single",
  sessionMode: "versus",
  slots: createDefaultSlots("single"),
  arcadeRun: undefined,
  paused: false,
  player: createEncounterCharacters(DEFAULT_PLAYER_FIGHTER_ID, DEFAULT_CPU_FIGHTER_ID, "versus").player,
  cpu: createEncounterCharacters(DEFAULT_PLAYER_FIGHTER_ID, DEFAULT_CPU_FIGHTER_ID, "versus").cpu,
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

    if (state.gamePhase === "fighting" && nextState.gamePhase === "match_end") {
      Object.assign(
        nextState,
        resolveArcadeMatchState(
          state,
          nextPlayer,
          nextRoundTime,
          nextState.playerScore ?? state.playerScore,
          nextState.cpuScore ?? state.cpuScore,
        ),
      );
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
    resetTrainingSessionState();
    const targetMode = normalizeMatchMode(mode ?? state.matchMode);
    const slots = createDefaultSlots(targetMode);
    const encounter = createEncounterCharacters(
      slots.player1.fighterId,
      slots.player2.fighterId,
      "versus",
    );
    return {
      gamePhase: 'lobby',
      matchMode: targetMode,
      sessionMode: "versus",
      arcadeRun: undefined,
      paused: false,
      playerScore: 0,
      cpuScore: 0,
      playerEvents: [],
      cpuEvents: [],
      playerStatus: undefined,
      cpuStatus: undefined,
      player: encounter.player,
      cpu: encounter.cpu,
      roundTime: DEFAULT_ROUND_TIME,
      currentGameScore: 0,
      slots,
    };
  }),

  startTraining: () => set((state) => {
    useCombatDebug.getState().clearHistory();
    const playerFighter = state.slots.player1.fighterId;
    const cpuFighter = state.slots.player2.fighterId ?? DEFAULT_CPU_FIGHTER_ID;
    startTrainingSessionState(playerFighter);
    const encounter = createEncounterCharacters(
      playerFighter,
      cpuFighter,
      "training",
    );
    return {
      gamePhase: "training",
      matchMode: "single",
      sessionMode: "training",
      arcadeRun: undefined,
      paused: false,
      playerScore: 0,
      cpuScore: 0,
      playerEvents: [],
      cpuEvents: [],
      playerStatus: undefined,
      cpuStatus: undefined,
      runtimeResetNonce: state.runtimeResetNonce + 1,
      slots: {
        player1: {
          type: "human",
          ready: true,
          label: "Player 1",
          fighterId: playerFighter,
          cpuConfig: cloneCpuConfig(state.slots.player1.cpuConfig),
        },
        player2: {
          type: "cpu",
          ready: true,
          label: "Training Dummy",
          fighterId: cpuFighter,
          cpuConfig: cloneCpuConfig(state.slots.player2.cpuConfig),
        },
      },
      player: encounter.player,
      cpu: encounter.cpu,
      roundTime: DEFAULT_ROUND_TIME,
      currentGameScore: 0,
    };
  }),

  startArcade: () => set((state) => {
    useCombatDebug.getState().clearHistory();
    resetTrainingSessionState();
    const playerFighter = state.slots.player1.fighterId;
    const arcadeRun = createArcadeRun(playerFighter);
    const encounter = getArcadeEncounter(arcadeRun);
    if (!encounter) return state;
    const slots = createArcadeSlots(playerFighter, encounter);
    const fight = createEncounterCharacters(playerFighter, encounter.fighterId, "versus");
    return {
      gamePhase: "lobby",
      matchMode: "single",
      sessionMode: "arcade",
      arcadeRun,
      paused: false,
      playerScore: 0,
      cpuScore: 0,
      playerEvents: [],
      cpuEvents: [],
      playerStatus: undefined,
      cpuStatus: undefined,
      player: fight.player,
      cpu: fight.cpu,
      roundTime: DEFAULT_ROUND_TIME,
      currentGameScore: 0,
      arenaId: encounter.arenaId,
      slots,
    };
  }),

  beginMatch: () => set((state) => {
    if (state.gamePhase !== 'lobby') return state;
    const playerReady = state.slots.player1.ready;
    const opponentReady = state.slots.player2.type === "cpu" ? true : state.slots.player2.ready;
    if (!playerReady || !opponentReady) return state;
    useCombatDebug.getState().clearHistory();
    resetTrainingSessionState();
    const playerFighter = state.slots.player1.fighterId;
    const arcadeEncounter =
      state.sessionMode === "arcade" ? getArcadeEncounter(state.arcadeRun) : undefined;
    const opponentFighter = arcadeEncounter?.fighterId ?? state.slots.player2.fighterId;
    const encounter = createEncounterCharacters(
      playerFighter,
      opponentFighter,
      "versus",
    );
    const nextSlots =
      state.sessionMode === "arcade" && arcadeEncounter
        ? createArcadeSlots(playerFighter, arcadeEncounter)
        : {
            player1: { ...state.slots.player1, ready: false },
            player2: {
              ...state.slots.player2,
              ready: state.slots.player2.type === "cpu",
              label: state.slots.player2.type === "human" ? "Player 2" : "CPU",
            },
          };
    return {
      gamePhase: 'fighting',
      paused: false,
      playerEvents: [],
      cpuEvents: [],
      playerStatus: undefined,
      cpuStatus: undefined,
      runtimeResetNonce: state.runtimeResetNonce + 1,
      player: encounter.player,
      cpu: encounter.cpu,
      roundTime: DEFAULT_ROUND_TIME,
      arenaId: arcadeEncounter?.arenaId ?? state.arenaId,
      arcadeRun:
        state.sessionMode === "arcade" && state.arcadeRun
          ? {
              ...state.arcadeRun,
              selectedFighterId: playerFighter,
              status: "in_progress",
              lastResult: undefined,
              lastMatchScore: 0,
            }
          : state.arcadeRun,
      slots: nextSlots,
    };
  }),

  continueArcade: () => set((state) => {
    if (state.sessionMode !== "arcade" || !state.arcadeRun) return state;
    if (state.gamePhase !== "match_end" || state.arcadeRun.status !== "between_fights") {
      return state;
    }
    const nextEncounter = getNextArcadeEncounter(state.arcadeRun);
    if (!nextEncounter) return state;
    const nextArcadeRun = {
      ...state.arcadeRun,
      currentEncounterIndex: state.arcadeRun.currentEncounterIndex + 1,
      status: "in_progress" as const,
      lastResult: undefined,
      lastMatchScore: 0,
    };
    const playerFighter = state.slots.player1.fighterId;
    const fight = createEncounterCharacters(playerFighter, nextEncounter.fighterId, "versus");
    return {
      gamePhase: "fighting",
      paused: false,
      playerScore: 0,
      cpuScore: 0,
      playerEvents: [],
      cpuEvents: [],
      playerStatus: undefined,
      cpuStatus: undefined,
      runtimeResetNonce: state.runtimeResetNonce + 1,
      player: fight.player,
      cpu: fight.cpu,
      roundTime: DEFAULT_ROUND_TIME,
      arenaId: nextEncounter.arenaId,
      arcadeRun: nextArcadeRun,
      slots: createArcadeSlots(playerFighter, nextEncounter),
    };
  }),
  
  resetRound: () => set((state) => {
    useCombatDebug.getState().clearHistory();
    const layout = state.gamePhase === "training" ? "training" : "versus";
    const encounter = createEncounterCharacters(
      state.slots.player1.fighterId,
      state.slots.player2.fighterId,
      layout,
    );
    return {
      gamePhase: state.gamePhase === "training" ? "training" : "fighting",
      paused: false,
      playerEvents: [],
      cpuEvents: [],
      playerStatus: undefined,
      cpuStatus: undefined,
      runtimeResetNonce: state.runtimeResetNonce + 1,
      player: encounter.player,
      cpu: encounter.cpu,
      roundTime: DEFAULT_ROUND_TIME,
    };
  }),

  restartMatch: () => set((state) => {
    useCombatDebug.getState().clearHistory();
    if (state.sessionMode === "arcade") {
      resetTrainingSessionState();
      const playerFighter = state.slots.player1.fighterId;
      const arcadeRun = createArcadeRun(playerFighter);
      const encounter = getArcadeEncounter(arcadeRun);
      if (!encounter) return state;
      const fight = createEncounterCharacters(playerFighter, encounter.fighterId, "versus");
      return {
        gamePhase: "fighting",
        matchMode: "single",
        sessionMode: "arcade",
        arcadeRun: {
          ...arcadeRun,
          status: "in_progress",
        },
        paused: false,
        playerScore: 0,
        cpuScore: 0,
        playerEvents: [],
        cpuEvents: [],
        playerStatus: undefined,
        cpuStatus: undefined,
        runtimeResetNonce: state.runtimeResetNonce + 1,
        player: fight.player,
        cpu: fight.cpu,
        roundTime: DEFAULT_ROUND_TIME,
        currentGameScore: 0,
        arenaId: encounter.arenaId,
        slots: createArcadeSlots(playerFighter, encounter),
      };
    }
    const layout = state.gamePhase === "training" ? "training" : "versus";
    const encounter = createEncounterCharacters(
      state.slots.player1.fighterId,
      state.slots.player2.fighterId,
      layout,
    );
    return {
      gamePhase: state.gamePhase === "training" ? "training" : "fighting",
      paused: false,
      playerScore: 0,
      cpuScore: 0,
      playerEvents: [],
      cpuEvents: [],
      playerStatus: undefined,
      cpuStatus: undefined,
      runtimeResetNonce: state.runtimeResetNonce + 1,
      player: encounter.player,
      cpu: encounter.cpu,
      roundTime: DEFAULT_ROUND_TIME,
    };
  }),
  
  returnToMenu: () => set((state) => {
    useCombatDebug.getState().clearHistory();
    resetTrainingSessionState();
    return {
      gamePhase: 'menu',
      sessionMode: 'versus',
      arcadeRun: undefined,
      paused: false,
      playerScore: 0,
      cpuScore: 0,
      playerEvents: [],
      cpuEvents: [],
      playerStatus: undefined,
      cpuStatus: undefined,
      currentGameScore: 0,
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
    if (state.sessionMode === "arcade" && slot === "player2") {
      return state;
    }
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
          fighterId: state.slots.player2.fighterId,
          cpuConfig: cloneCpuConfig(state.slots.player2.cpuConfig),
        },
      },
    };
  }),
  setSlotFighter: (slot, fighter) =>
    set((state) => ({
      arcadeRun:
        state.sessionMode === "arcade" && state.arcadeRun && slot === "player1"
          ? {
              ...state.arcadeRun,
              selectedFighterId: fighter,
            }
          : state.arcadeRun,
      slots: {
        ...state.slots,
        [slot]: {
          ...state.slots[slot],
          fighterId: fighter,
        },
      },
    })),
  setSlotCpuStyle: (slot, style) =>
    set((state) => ({
      slots: {
        ...state.slots,
        [slot]: {
          ...state.slots[slot],
          cpuConfig: cloneCpuConfig({
            ...state.slots[slot].cpuConfig,
            style,
          }),
        },
      },
    })),
  setSlotCpuDifficulty: (slot, difficulty) =>
    set((state) => ({
      slots: {
        ...state.slots,
        [slot]: {
          ...state.slots[slot],
          cpuConfig: cloneCpuConfig({
            ...state.slots[slot].cpuConfig,
            difficulty,
          }),
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
    set((state) => (isLiveCombatPhase(state.gamePhase) ? { paused: true } : state)),
  resumeGame: () =>
    set((state) => (state.paused ? { paused: false } : state)),
  togglePause: () =>
    set((state) =>
      isLiveCombatPhase(state.gamePhase)
        ? {
            paused: !state.paused,
          }
        : state,
    ),


  // Score calculation and submission
  calculateFinalScore: () => {
    const state = get();
    if (state.sessionMode === "arcade") {
      return Math.max(0, state.currentGameScore);
    }
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
