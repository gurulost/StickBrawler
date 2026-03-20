import test from "node:test";
import assert from "node:assert/strict";

import { ServerMatchRuntime } from "../../server/matchRuntime";
import { createEmptyInputs } from "../../client/src/game/matchRuntime";

test("server match runtime processes keyboard frames", () => {
  const runtime = new ServerMatchRuntime();
  const initial = runtime.snapshot();
  assert.equal(initial.player.position[0], -2);

  const inputs = createEmptyInputs();
  inputs.player1.rightward = true;

  runtime.update({
    delta: 1 / 60,
    inputs,
    gamePhase: "fighting",
  });

  const after = runtime.snapshot();
  assert.ok(after.player.position[0] > initial.player.position[0]);
});

test("server match runtime applies CPU attack state to CPU, not player", () => {
  const runtime = new ServerMatchRuntime();
  const actions = (runtime as any).createFightingActions();

  actions.setCPUAttacking(true);

  const after = runtime.snapshot();
  assert.equal(after.cpu.isAttacking, true);
  assert.equal(after.player.isAttacking, false);
});
