import { create } from "zustand";
import type { PlayerSlot } from "../../hooks/use-player-controls";
import type { Direction } from "../../input/intentTypes";
import type { AttackStrength, Altitude, SpecialSlot } from "../../combat/moveTable";

export interface DebugEntry {
  direction: Direction;
  grounded: boolean;
  attack?: {
    dir: Direction;
    strength: AttackStrength;
    altitude: Altitude;
  };
  special?: {
    slot: SpecialSlot;
    altitude: Altitude;
  };
  defendModes: string[];
  moveId?: string;
}

interface InputDebugState {
  slots: Record<PlayerSlot, DebugEntry | null>;
  updateSlot: (slot: PlayerSlot, entry: DebugEntry | null) => void;
  clearSlot: (slot: PlayerSlot) => void;
}

export const useInputDebug = create<InputDebugState>((set) => ({
  slots: {
    player1: null,
    player2: null,
  },
  updateSlot: (slot, entry) =>
    set((state) => ({
      slots: {
        ...state.slots,
        [slot]: entry,
      },
    })),
  clearSlot: (slot) =>
    set((state) => ({
      slots: {
        ...state.slots,
        [slot]: null,
      },
    })),
}));
