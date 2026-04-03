import { create } from "zustand";

import { DEFAULT_PLAYER_FIGHTER_ID } from "../../combat/fighterRoster";
import type { FighterId } from "../../combat/moveTable";
import {
  TRAINING_DRILL_IDS,
  type TrainingDrillId,
} from "../../game/trainingDrills";

interface TrainingModeState {
  sessionId: number;
  fighterId: FighterId;
  currentDrillIndex: number;
  completedDrillIds: TrainingDrillId[];
  advancedMode: boolean;
  drillResetNonce: number;
  completionNonce: number;
  lastCompletedDrillId: TrainingDrillId | null;
  startSession: (fighterId?: FighterId) => void;
  resetSession: () => void;
  selectDrill: (drillId: TrainingDrillId) => void;
  nextDrill: () => void;
  previousDrill: () => void;
  completeCurrentDrill: () => void;
  resetCurrentDrill: () => void;
  toggleAdvancedMode: () => void;
  setAdvancedMode: (enabled: boolean) => void;
}

const DEFAULT_FIGHTER_ID: FighterId = DEFAULT_PLAYER_FIGHTER_ID;

const clampDrillIndex = (index: number) =>
  Math.max(0, Math.min(TRAINING_DRILL_IDS.length - 1, index));

const createDefaultState = () => ({
  fighterId: DEFAULT_FIGHTER_ID,
  currentDrillIndex: 0,
  completedDrillIds: [] as TrainingDrillId[],
  advancedMode: false,
  drillResetNonce: 0,
  completionNonce: 0,
  lastCompletedDrillId: null as TrainingDrillId | null,
});

const resolveCurrentDrillId = (state: TrainingModeState | ReturnType<typeof createDefaultState>) =>
  TRAINING_DRILL_IDS[clampDrillIndex(state.currentDrillIndex)];

export const useTrainingMode = create<TrainingModeState>((set) => ({
  sessionId: 0,
  ...createDefaultState(),
  startSession: (fighterId = DEFAULT_FIGHTER_ID) =>
    set((state) => ({
      sessionId: state.sessionId + 1,
      fighterId,
      currentDrillIndex: 0,
      completedDrillIds: [],
      advancedMode: false,
      drillResetNonce: state.drillResetNonce + 1,
      completionNonce: 0,
      lastCompletedDrillId: null,
    })),
  resetSession: () =>
    set((state) => ({
      ...createDefaultState(),
      sessionId: state.sessionId,
      drillResetNonce: state.drillResetNonce + 1,
    })),
  selectDrill: (drillId) =>
    set((state) => ({
      currentDrillIndex: TRAINING_DRILL_IDS.indexOf(drillId),
      drillResetNonce: state.drillResetNonce + 1,
      lastCompletedDrillId: null,
    })),
  nextDrill: () =>
    set((state) => ({
      currentDrillIndex: clampDrillIndex(state.currentDrillIndex + 1),
      drillResetNonce: state.drillResetNonce + 1,
      lastCompletedDrillId: null,
    })),
  previousDrill: () =>
    set((state) => ({
      currentDrillIndex: clampDrillIndex(state.currentDrillIndex - 1),
      drillResetNonce: state.drillResetNonce + 1,
      lastCompletedDrillId: null,
    })),
  completeCurrentDrill: () =>
    set((state) => {
      const drillId = resolveCurrentDrillId(state);
      if (state.completedDrillIds.includes(drillId)) {
        return state;
      }
      return {
        completedDrillIds: [...state.completedDrillIds, drillId],
        completionNonce: state.completionNonce + 1,
        lastCompletedDrillId: drillId,
      };
    }),
  resetCurrentDrill: () =>
    set((state) => ({
      drillResetNonce: state.drillResetNonce + 1,
      lastCompletedDrillId: null,
    })),
  toggleAdvancedMode: () =>
    set((state) => ({ advancedMode: !state.advancedMode })),
  setAdvancedMode: (enabled) => set({ advancedMode: enabled }),
}));
