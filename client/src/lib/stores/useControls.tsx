import { create } from 'zustand';

export enum Controls {
  forward = 'forward',
  backward = 'backward',
  leftward = 'leftward',
  rightward = 'rightward',
  punch = 'punch',
  kick = 'kick',
  block = 'block',
  special = 'special',
}

type ControlsState = {
  debugMode: boolean;
  toggleDebugMode: () => void;
}

export const useControls = create<ControlsState>((set) => ({
  debugMode: false,
  toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
}));
