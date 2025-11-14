import { create } from 'zustand';

export enum Controls {
  // Movement controls
  jump = 'jump',        // Now W key
  forward = 'forward',  // Up arrow key
  backward = 'backward', // S key and Down arrow
  leftward = 'leftward', // A key and Left arrow
  rightward = 'rightward', // D key and Right arrow
  
  // Combat controls (separated from movement)
  attack1 = 'attack1', // J key - quick attack
  attack2 = 'attack2', // K key - strong attack
  shield = 'shield',   // L key - block/defend
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
  lowGraphicsMode: boolean;
  toggleLowGraphicsMode: () => void;
}

export const useControls = create<ControlsState>((set) => ({
  debugMode: false,
  toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
  lowGraphicsMode: false,
  toggleLowGraphicsMode: () => set((state) => ({ lowGraphicsMode: !state.lowGraphicsMode })),
}));
