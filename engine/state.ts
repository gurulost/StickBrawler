import type { BaseGameState } from "./types";

export interface EngineState extends BaseGameState {}

export function createInitialState(seed = Date.now()): EngineState {
  return {
    seed,
    frame: 0,
    timeMs: 0,
  };
}
