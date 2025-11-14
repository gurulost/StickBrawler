import type {
  BaseGameState,
  GameCommand,
  GameEvent,
  SystemContext,
  SystemHandler,
} from "./types";

interface EngineOptions {
  stepMs?: number;
}

const DEFAULT_STEP_MS = 1000 / 60;

export class GameEngine<TState extends BaseGameState = BaseGameState> {
  private readonly systems: SystemHandler<TState>[] = [];
  private readonly commandQueue: GameCommand[] = [];
  private readonly eventQueue: GameEvent[] = [];
  private accumulator = 0;

  constructor(
    private readonly state: TState,
    private readonly options: EngineOptions = {},
  ) {}

  registerSystem(handler: SystemHandler<TState>) {
    this.systems.push(handler);
  }

  enqueueCommand(command: GameCommand) {
    this.commandQueue.push(command);
  }

  step(deltaMs = this.stepMs) {
    this.runStep(deltaMs);
  }

  update(elapsedMs?: number) {
    const target = elapsedMs ?? this.stepMs;
    this.accumulator += target;

    while (this.accumulator >= this.stepMs) {
      this.runStep(this.stepMs);
      this.accumulator -= this.stepMs;
    }

    if (this.accumulator > 0) {
      this.runStep(this.accumulator);
      this.accumulator = 0;
    }
  }

  drainEvents() {
    return this.eventQueue.splice(0, this.eventQueue.length);
  }

  snapshot(): TState {
    if (typeof structuredClone === "function") {
      return structuredClone(this.state);
    }
    return JSON.parse(JSON.stringify(this.state)) as TState;
  }

  private runStep(deltaMs: number) {
    this.state.frame += 1;
    this.state.timeMs += deltaMs;

    if (!this.systems.length) {
      this.commandQueue.length = 0;
      return;
    }

    const commands = this.commandQueue.splice(0, this.commandQueue.length);
    const context: SystemContext<TState> = {
      state: this.state,
      commands,
      deltaMs,
      emit: (event) => {
        this.eventQueue.push({
          ...event,
          frame: this.state.frame,
          timestamp: this.state.timeMs,
        });
      },
      scheduleCommand: (command) => {
        this.enqueueCommand(command);
      },
    };

    for (const system of this.systems) {
      system(context);
    }
  }

  private get stepMs() {
    return this.options.stepMs ?? DEFAULT_STEP_MS;
  }
}
