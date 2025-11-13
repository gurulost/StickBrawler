import {
  GameEngine,
  type GameCommand,
  type GameEvent,
  createInitialState,
} from "@engine/index";

export class MatchRuntime {
  private readonly engine: GameEngine;

  constructor(seed = Date.now()) {
    this.engine = new GameEngine(createInitialState(seed));
  }

  enqueue(command: GameCommand) {
    this.engine.enqueueCommand(command);
  }

  /**
   * Drives the internal fixed-step loop. Returns events emitted during this update.
   */
  tick(elapsedMs?: number): GameEvent[] {
    this.engine.update(elapsedMs);
    return this.engine.drainEvents();
  }

  snapshot() {
    return this.engine.snapshot();
  }
}
