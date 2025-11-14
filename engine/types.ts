export interface BaseGameState {
  seed: number;
  frame: number;
  timeMs: number;
}

export interface GameCommand<TPayload = unknown> {
  type: string;
  payload: TPayload;
  issuedAt: number;
}

export interface GameEvent<TPayload = unknown> {
  type: string;
  payload: TPayload;
  frame: number;
  timestamp: number;
}

export interface SystemContext<TState extends BaseGameState = BaseGameState> {
  state: TState;
  commands: GameCommand[];
  deltaMs: number;
  emit: (event: GameEvent) => void;
  scheduleCommand: (command: GameCommand) => void;
}

export type SystemHandler<TState extends BaseGameState = BaseGameState> = (
  context: SystemContext<TState>,
) => void;
