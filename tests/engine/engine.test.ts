import test from "node:test";
import assert from "node:assert/strict";

import { GameEngine } from "@engine/engine";
import { createInitialState } from "@engine/state";
import type { SystemContext } from "@engine/types";

test("engine processes queued commands within a fixed step", () => {
  const engine = new GameEngine(createInitialState(123));
  let processed = 0;

  engine.registerSystem((ctx: SystemContext) => {
    processed += ctx.commands.length;
    ctx.commands.forEach((command) => {
      ctx.emit({
        type: "processed",
        payload: command.payload,
        frame: ctx.state.frame,
        timestamp: ctx.state.timeMs,
      });
    });
  });

  engine.enqueueCommand({
    type: "move",
    payload: { dx: 1 },
    issuedAt: Date.now(),
  });

  engine.step();

  assert.equal(processed, 1);
  const events = engine.drainEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "processed");
});
