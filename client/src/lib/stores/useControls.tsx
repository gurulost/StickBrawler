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
  dodge = 'dodge',     // New dodge mechanic
  airAttack = 'airAttack', // New aerial attack
  taunt = 'taunt',     // Fun taunt move
  grab = 'grab',       // Grab opponent (like Smash Bros)
}

type ControlsState = {
  debugMode: boolean;
  toggleDebugMode: () => void;
}

export const useControls = create<ControlsState>((set) => ({
  debugMode: false,
  toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
}));
