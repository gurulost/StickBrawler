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

test("server match runtime keeps sustained depth input inside the combat plane and recenters after release", () => {
  const runtime = new ServerMatchRuntime();
  const inputs = createEmptyInputs();
  inputs.player1.backward = true;

  for (let frame = 0; frame < 180; frame += 1) {
    runtime.update({
      delta: 1 / 60,
      inputs,
      gamePhase: "fighting",
    });
  }

  const drifted = runtime.snapshot();
  assert.ok(
    Math.abs(drifted.player.position[2]) <= 0.39,
    `expected player z drift to stay inside the compressed combat band, got ${drifted.player.position[2]}`,
  );

  const releasedInputs = createEmptyInputs();
  for (let frame = 0; frame < 120; frame += 1) {
    runtime.update({
      delta: 1 / 60,
      inputs: releasedInputs,
      gamePhase: "fighting",
    });
  }

  const recentered = runtime.snapshot();
  assert.ok(
    Math.abs(recentered.player.position[2]) < 0.08,
    `expected player z drift to settle back toward the combat plane, got ${recentered.player.position[2]}`,
  );
});

test("server match runtime mirrors CPU runtime snapshots onto CPU, not player", () => {
  const runtime = new ServerMatchRuntime();
  const actions = (runtime as any).createFightingActions();

  actions.applyRuntimeFrame({
    player: {
      ...runtime.snapshot().player,
      slot: "player",
      fighterId: runtime.snapshot().player.fighterId,
      facing: runtime.snapshot().player.direction,
      grounded: true,
      inAir: false,
      action: "idle",
      moveFrame: 0,
      movePhase: "none",
      hitLagFrames: 0,
      hitstunFrames: 0,
      blockstunFrames: 0,
      landingLagFrames: 0,
      invulnerable: false,
      armored: false,
      canAct: true,
      guardBroken: false,
      comboCounter: runtime.snapshot().player.comboCount,
      airJumpsLeft: runtime.snapshot().player.airJumpsLeft,
    },
    cpu: {
      ...runtime.snapshot().cpu,
      slot: "cpu",
      fighterId: runtime.snapshot().cpu.fighterId,
      facing: runtime.snapshot().cpu.direction,
      grounded: true,
      inAir: false,
      action: "attack",
      moveFrame: 4,
      movePhase: "active",
      hitLagFrames: 0,
      hitstunFrames: 0,
      blockstunFrames: 0,
      landingLagFrames: 0,
      invulnerable: false,
      armored: false,
      canAct: false,
      guardBroken: false,
      comboCounter: runtime.snapshot().cpu.comboCount,
      airJumpsLeft: runtime.snapshot().cpu.airJumpsLeft,
      isAirAttacking: false,
    },
    roundTimeRemaining: 54,
    maxRoundTime: 60,
  });

  const after = runtime.snapshot();
  assert.equal(after.cpu.isAttacking, true);
  assert.equal(after.player.isAttacking, false);
});
