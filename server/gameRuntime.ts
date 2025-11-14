import {
  GameEngine,
  type GameCommand,
  type GameEvent,
  createInitialState,
} from "@engine/index";
import type { GamePhase } from "../client/src/lib/stores/useFighting";
import { ServerMatchRuntime } from "./matchRuntime";
import type { DualInputState } from "../client/src/game/matchRuntime";

export class MatchRuntime {
  private readonly engine: GameEngine;
  private readonly match = new ServerMatchRuntime();

  constructor(seed = Date.now()) {
    this.engine = new GameEngine(createInitialState(seed));
    this.engine.registerSystem((context) => {
      for (const command of context.commands) {
        if (command.type !== "match/frame") continue;
        const payload = command.payload as {
          delta: number;
          inputs?: DualInputState;
          phase?: GamePhase;
        };
        this.match.update({
          delta: payload.delta,
          inputs: payload.inputs,
          gamePhase: payload.phase,
        });
      }
    });
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
    return {
      engine: this.engine.snapshot(),
      match: this.match.snapshot(),
    };
  }
}
