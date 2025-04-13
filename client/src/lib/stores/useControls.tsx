import { create } from 'zustand';

export enum Controls {
  // Movement controls
  jump = 'jump',        // Now W key
  backward = 'backward', // S key
  leftward = 'leftward', // A key
  rightward = 'rightward', // D key
  
  // Combat controls (separated from movement)
  attack1 = 'attack1', // A key - quick attack
  attack2 = 'attack2', // D key - strong attack
  shield = 'shield',   // S key - block/defend
  special = 'special', // Space - special move
  
  // Advanced techniques
  dodge = 'dodge',     // Shift - dodge mechanic
  airAttack = 'airAttack', // E key - aerial attack
  taunt = 'taunt',     // T key - fun taunt move
  grab = 'grab',       // G key - grab opponent
}

type ControlsState = {
  debugMode: boolean;
  toggleDebugMode: () => void;
}

export const useControls = create<ControlsState>((set) => ({
  debugMode: false,
  toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
}));
