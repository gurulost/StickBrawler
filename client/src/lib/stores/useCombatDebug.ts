import { create } from "zustand";
import type { CombatEvent } from "../../game/combatPresentation";
import type { CharacterState } from "./useFighting";

export interface CombatDebugRecord {
  id: number;
  capturedAt: number;
  roundTimeRemaining: number;
  maxRoundTime: number;
  player: CharacterState;
  cpu: CharacterState;
  events: CombatEvent[];
  playerEvents: CombatEvent[];
  cpuEvents: CombatEvent[];
}

interface CombatDebugState {
  history: CombatDebugRecord[];
  pendingEvents: CombatEvent[];
  reviewFrameId: number | null;
  maxHistoryFrames: number;
  nextRecordId: number;
  pushPendingEvents: (events: CombatEvent[]) => void;
  recordFrame: (input: {
    player: CharacterState;
    cpu: CharacterState;
    playerEvents: CombatEvent[];
    cpuEvents: CombatEvent[];
    roundTimeRemaining: number;
    maxRoundTime: number;
    capturedAt?: number;
  }) => void;
  setReviewFrameId: (id: number | null) => void;
  stepReviewFrame: (delta: number) => void;
  clearReviewFrame: () => void;
  clearHistory: () => void;
}

const MAX_HISTORY_FRAMES = 60 * 10;

const cloneCharacterState = (state: CharacterState): CharacterState => ({
  ...state,
  position: [...state.position] as [number, number, number],
  velocity: [...state.velocity] as [number, number, number],
});

const cloneEvents = (events: CombatEvent[]) => events.map((event) => ({ ...event }));

const nowMs = () =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

export const useCombatDebug = create<CombatDebugState>((set, get) => ({
  history: [],
  pendingEvents: [],
  reviewFrameId: null,
  maxHistoryFrames: MAX_HISTORY_FRAMES,
  nextRecordId: 1,
  pushPendingEvents: (events) =>
    set({
      pendingEvents: cloneEvents(events),
    }),
  recordFrame: ({
    player,
    cpu,
    playerEvents,
    cpuEvents,
    roundTimeRemaining,
    maxRoundTime,
    capturedAt,
  }) =>
    set((state) => {
      const record: CombatDebugRecord = {
        id: state.nextRecordId,
        capturedAt: capturedAt ?? nowMs(),
        roundTimeRemaining,
        maxRoundTime,
        player: cloneCharacterState(player),
        cpu: cloneCharacterState(cpu),
        events: cloneEvents(state.pendingEvents),
        playerEvents: cloneEvents(playerEvents),
        cpuEvents: cloneEvents(cpuEvents),
      };
      const overflow = Math.max(0, state.history.length + 1 - state.maxHistoryFrames);
      const history = overflow > 0 ? [...state.history.slice(overflow), record] : [...state.history, record];
      const reviewFrameId =
        state.reviewFrameId !== null && !history.some((entry) => entry.id === state.reviewFrameId)
          ? history[0]?.id ?? null
          : state.reviewFrameId;
      return {
        history,
        pendingEvents: [],
        reviewFrameId,
        nextRecordId: state.nextRecordId + 1,
      };
    }),
  setReviewFrameId: (id) => set({ reviewFrameId: id }),
  stepReviewFrame: (delta) =>
    set((state) => {
      if (!state.history.length) {
        return { reviewFrameId: null };
      }
      const currentIndex =
        state.reviewFrameId === null
          ? state.history.length - 1
          : Math.max(
              0,
              state.history.findIndex((entry) => entry.id === state.reviewFrameId),
            );
      const nextIndex = Math.max(
        0,
        Math.min(state.history.length - 1, currentIndex + Math.trunc(delta)),
      );
      return {
        reviewFrameId: state.history[nextIndex]?.id ?? null,
      };
    }),
  clearReviewFrame: () => set({ reviewFrameId: null }),
  clearHistory: () =>
    set({
      history: [],
      pendingEvents: [],
      reviewFrameId: null,
      nextRecordId: 1,
    }),
}));

export const resolveCombatDebugReviewRecord = (
  history: CombatDebugRecord[],
  reviewFrameId: number | null,
) => {
  if (!history.length) return undefined;
  if (reviewFrameId === null) return undefined;
  return history.find((entry) => entry.id === reviewFrameId);
};
