import { create } from 'zustand';

export enum Controls {
  // Movement controls
  jump = "jump",
  forward = "forward",
  backward = "backward",
  leftward = "leftward",
  rightward = "rightward",

  // Core verbs
  attack = "attack",
  special = "special",
  defend = "defend",
}

type ControlsState = {
  debugMode: boolean;
  toggleDebugMode: () => void;
  lowGraphicsMode: boolean;
  toggleLowGraphicsMode: () => void;
  showSilhouetteDebug: boolean;
  toggleSilhouetteDebug: () => void;
  inkQuality: InkQualitySetting;
  cycleInkQuality: () => void;
  networkMode: "offline" | "online";
  setNetworkMode: (mode: "offline" | "online") => void;
  onlineLatency: number;
  setOnlineLatency: (latency: number) => void;
}

export type InkQualitySetting = "cinematic" | "balanced" | "performance";

export const useControls = create<ControlsState>((set) => ({
  debugMode: false,
  toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
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
  networkMode: "offline",
  setNetworkMode: (mode) => set({ networkMode: mode }),
  onlineLatency: 0,
  setOnlineLatency: (latency) => set({ onlineLatency: latency }),
}));
