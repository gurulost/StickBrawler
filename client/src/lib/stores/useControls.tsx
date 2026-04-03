import { create } from 'zustand';
import type { PlayerSlot } from "../../hooks/use-player-controls";
import {
  consumeCombatTrainingRunFrame,
  createCombatTrainingRunFromPreset,
  createCombatTrainingRunFromSequence,
  type CombatTrainingFighter,
  type CombatTrainingFrameSample,
  type CombatTrainingPresetId,
  type CombatTrainingRun,
  type CombatTrainingStep,
} from "../combatTraining";

export { Controls } from "../../input/controls";

const COMBAT_PRIMER_STORAGE_KEY = "stickbrawler.combat-primer-dismissed";

const readCombatPrimerDismissed = () => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(COMBAT_PRIMER_STORAGE_KEY) === "1";
};

const writeCombatPrimerDismissed = (dismissed: boolean) => {
  if (typeof window === "undefined") return;
  if (dismissed) {
    window.localStorage.setItem(COMBAT_PRIMER_STORAGE_KEY, "1");
    return;
  }
  window.localStorage.removeItem(COMBAT_PRIMER_STORAGE_KEY);
};

type ControlsState = {
  debugMode: boolean;
  toggleDebugMode: () => void;
  combatDebugFocus: "auto" | "player" | "cpu";
  setCombatDebugFocus: (focus: "auto" | "player" | "cpu") => void;
  combatDebugShowHurtboxes: boolean;
  toggleCombatDebugShowHurtboxes: () => void;
  combatDebugShowHitboxes: boolean;
  toggleCombatDebugShowHitboxes: () => void;
  combatDebugShowSockets: boolean;
  toggleCombatDebugShowSockets: () => void;
  combatDebugShowActiveHitbox: boolean;
  toggleCombatDebugShowActiveHitbox: () => void;
  combatDebugShowFrameData: boolean;
  toggleCombatDebugShowFrameData: () => void;
  combatDebugShowPhaseData: boolean;
  toggleCombatDebugShowPhaseData: () => void;
  combatDebugShowInstanceData: boolean;
  toggleCombatDebugShowInstanceData: () => void;
  combatPlaybackPaused: boolean;
  setCombatPlaybackPaused: (paused: boolean) => void;
  toggleCombatPlaybackPaused: () => void;
  combatPlaybackRate: 1 | 0.25;
  setCombatPlaybackRate: (rate: 1 | 0.25) => void;
  queuedCombatFrameSteps: number;
  queueCombatFrameStep: (frames?: number) => void;
  consumeCombatFrameSteps: () => number;
  resetCombatPlayback: () => void;
  combatTrainingTargetSlot: PlayerSlot;
  setCombatTrainingTargetSlot: (slot: PlayerSlot) => void;
  combatTrainingActiveRun: CombatTrainingRun | null;
  combatTrainingNextRunId: number;
  queueCombatTrainingPreset: (presetId: CombatTrainingPresetId, slot?: PlayerSlot) => void;
  queueCombatTrainingSequence: (input: {
    label: string;
    description?: string;
    slot?: PlayerSlot;
    fighter?: CombatTrainingFighter;
    presetId?: string;
    steps: CombatTrainingStep[];
  }) => void;
  consumeCombatTrainingFrame: () => CombatTrainingFrameSample | null;
  clearCombatTraining: () => void;
  lowGraphicsMode: boolean;
  toggleLowGraphicsMode: () => void;
  showSilhouetteDebug: boolean;
  toggleSilhouetteDebug: () => void;
  inkQuality: InkQualitySetting;
  cycleInkQuality: () => void;
  combatPrimerDismissed: boolean;
  dismissCombatPrimer: () => void;
  restoreCombatPrimer: () => void;
  networkMode: "offline" | "online";
  setNetworkMode: (mode: "offline" | "online") => void;
  onlineLatency: number;
  setOnlineLatency: (latency: number) => void;
}

export type InkQualitySetting = "cinematic" | "balanced" | "performance";

export const useControls = create<ControlsState>((set, get) => ({
  debugMode: false,
  toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
  combatDebugFocus: "auto",
  setCombatDebugFocus: (focus) => set({ combatDebugFocus: focus }),
  combatDebugShowHurtboxes: true,
  toggleCombatDebugShowHurtboxes: () =>
    set((state) => ({ combatDebugShowHurtboxes: !state.combatDebugShowHurtboxes })),
  combatDebugShowHitboxes: true,
  toggleCombatDebugShowHitboxes: () =>
    set((state) => ({ combatDebugShowHitboxes: !state.combatDebugShowHitboxes })),
  combatDebugShowSockets: true,
  toggleCombatDebugShowSockets: () =>
    set((state) => ({ combatDebugShowSockets: !state.combatDebugShowSockets })),
  combatDebugShowActiveHitbox: true,
  toggleCombatDebugShowActiveHitbox: () =>
    set((state) => ({ combatDebugShowActiveHitbox: !state.combatDebugShowActiveHitbox })),
  combatDebugShowFrameData: true,
  toggleCombatDebugShowFrameData: () =>
    set((state) => ({ combatDebugShowFrameData: !state.combatDebugShowFrameData })),
  combatDebugShowPhaseData: true,
  toggleCombatDebugShowPhaseData: () =>
    set((state) => ({ combatDebugShowPhaseData: !state.combatDebugShowPhaseData })),
  combatDebugShowInstanceData: true,
  toggleCombatDebugShowInstanceData: () =>
    set((state) => ({ combatDebugShowInstanceData: !state.combatDebugShowInstanceData })),
  combatPlaybackPaused: false,
  setCombatPlaybackPaused: (paused) => set({ combatPlaybackPaused: paused }),
  toggleCombatPlaybackPaused: () =>
    set((state) => ({ combatPlaybackPaused: !state.combatPlaybackPaused })),
  combatPlaybackRate: 1,
  setCombatPlaybackRate: (rate) => set({ combatPlaybackRate: rate }),
  queuedCombatFrameSteps: 0,
  queueCombatFrameStep: (frames = 1) =>
    set((state) => ({
      queuedCombatFrameSteps: state.queuedCombatFrameSteps + Math.max(1, Math.floor(frames)),
    })),
  consumeCombatFrameSteps: () => {
    const queued = get().queuedCombatFrameSteps;
    if (queued > 0) {
      set({ queuedCombatFrameSteps: 0 });
    }
    return queued;
  },
  resetCombatPlayback: () =>
    set({
      combatPlaybackPaused: false,
      combatPlaybackRate: 1,
      queuedCombatFrameSteps: 0,
    }),
  combatTrainingTargetSlot: "player1",
  setCombatTrainingTargetSlot: (slot) => set({ combatTrainingTargetSlot: slot }),
  combatTrainingActiveRun: null,
  combatTrainingNextRunId: 1,
  queueCombatTrainingPreset: (presetId, slot) =>
    set((state) => ({
      combatTrainingActiveRun: createCombatTrainingRunFromPreset(
        presetId,
        slot ?? state.combatTrainingTargetSlot,
        state.combatTrainingNextRunId,
      ),
      combatTrainingNextRunId: state.combatTrainingNextRunId + 1,
    })),
  queueCombatTrainingSequence: (input) =>
    set((state) => ({
      combatTrainingActiveRun: createCombatTrainingRunFromSequence(
        {
          ...input,
          slot: input.slot ?? state.combatTrainingTargetSlot,
        },
        state.combatTrainingNextRunId,
      ),
      combatTrainingNextRunId: state.combatTrainingNextRunId + 1,
    })),
  consumeCombatTrainingFrame: () => {
    const activeRun = get().combatTrainingActiveRun;
    if (!activeRun) return null;
    const { sample, nextRun } = consumeCombatTrainingRunFrame(activeRun);
    set({ combatTrainingActiveRun: nextRun });
    return sample;
  },
  clearCombatTraining: () => set({ combatTrainingActiveRun: null }),
  lowGraphicsMode: false,
  toggleLowGraphicsMode: () => set((state) => ({ lowGraphicsMode: !state.lowGraphicsMode })),
  showSilhouetteDebug: false,
  toggleSilhouetteDebug: () => set((state) => ({ showSilhouetteDebug: !state.showSilhouetteDebug })),
  inkQuality: "cinematic",
  cycleInkQuality: () =>
    set((state) => {
      const order: InkQualitySetting[] = ["cinematic", "balanced", "performance"];
      const nextIndex = (order.indexOf(state.inkQuality) + 1) % order.length;
      return { inkQuality: order[nextIndex] };
    }),
  combatPrimerDismissed: readCombatPrimerDismissed(),
  dismissCombatPrimer: () => {
    writeCombatPrimerDismissed(true);
    set({ combatPrimerDismissed: true });
  },
  restoreCombatPrimer: () => {
    writeCombatPrimerDismissed(false);
    set({ combatPrimerDismissed: false });
  },
  networkMode: "offline",
  setNetworkMode: (mode) => set({ networkMode: mode }),
  onlineLatency: 0,
  setOnlineLatency: (latency) => set({ onlineLatency: latency }),
}));
