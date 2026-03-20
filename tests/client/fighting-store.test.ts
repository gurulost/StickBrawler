import test from "node:test";
import assert from "node:assert/strict";

import { useFighting } from "../../client/src/lib/stores/useFighting";
import type { RuntimeFrameSnapshot } from "../../client/src/game/combatPresentation";

test("local match advances to match_end after two round wins", () => {
  const store = useFighting;
  const state = store.getState();

  state.returnToMenu();
  state.setMatchMode("single");
  state.startGame("single");

  store.getState().setSlotReady("player1", true);
  store.getState().beginMatch();

  assert.equal(store.getState().gamePhase, "fighting");

  store.getState().damageCPU(999);
  assert.equal(store.getState().gamePhase, "round_end");
  assert.equal(store.getState().playerScore, 1);

  store.getState().resetRound();
  assert.equal(store.getState().gamePhase, "fighting");

  store.getState().damageCPU(999);
  assert.equal(store.getState().gamePhase, "match_end");
  assert.equal(store.getState().playerScore, 2);

  store.getState().restartMatch();
  assert.equal(store.getState().gamePhase, "fighting");
  assert.equal(store.getState().playerScore, 0);
  assert.equal(store.getState().cpuScore, 0);

  store.getState().returnToMenu();
});

test("runtime frame ingest mirrors authored move state and combat events", () => {
  const store = useFighting;
  store.getState().returnToMenu();
  store.getState().startGame("single");
  store.getState().setSlotReady("player1", true);
  store.getState().beginMatch();

  const frame: RuntimeFrameSnapshot = {
    player: {
      slot: "player",
      fighterId: "stick_hero",
      health: 100,
      position: [-1.2, 0, 0],
      velocity: [0.5, 0, 0],
      facing: 1,
      grounded: true,
      inAir: false,
      action: "attack",
      moveId: "hero_jab_1",
      moveInstanceId: 3,
      moveFrame: 6,
      movePhase: "active",
      hitLagFrames: 0,
      hitstunFrames: 0,
      blockstunFrames: 0,
      invulnerable: false,
      armored: false,
      canAct: false,
      guardMeter: 80,
      staminaMeter: 95,
      specialMeter: 4,
      comboCounter: 2,
      comboTimer: 640,
      attackCooldown: 180,
      dodgeCooldown: 0,
      grabCooldown: 0,
      moveCooldown: 0,
      isBlocking: false,
      isDodging: false,
      isGrabbing: false,
      isTaunting: false,
      isAirAttacking: false,
      airJumpsLeft: 2,
      lastStartedMoveId: "hero_jab_1",
      lastConfirmedMoveId: "hero_jab_1",
      justStartedMove: true,
      justHit: true,
    },
    cpu: {
      slot: "cpu",
      fighterId: "stick_villain",
      health: 92,
      position: [1.2, 0, 0],
      velocity: [0, 0, 0],
      facing: -1,
      grounded: true,
      inAir: false,
      action: "hitstun",
      moveId: undefined,
      moveFrame: 0,
      movePhase: "none",
      hitLagFrames: 4,
      hitstunFrames: 14,
      blockstunFrames: 0,
      invulnerable: false,
      armored: false,
      canAct: false,
      guardMeter: 80,
      staminaMeter: 100,
      specialMeter: 0,
      comboCounter: 0,
      comboTimer: 0,
      attackCooldown: 0,
      dodgeCooldown: 0,
      grabCooldown: 0,
      moveCooldown: 0,
      isBlocking: false,
      isDodging: false,
      isGrabbing: false,
      isTaunting: false,
      isAirAttacking: false,
      airJumpsLeft: 2,
    },
  };

  store.getState().applyCombatEvents([
    {
      id: 1,
      type: "hit",
      attacker: "player",
      defender: "cpu",
      moveId: "hero_jab_1",
      moveInstanceId: 3,
      hitboxId: "hero-jab",
      blocked: false,
      damage: 8,
      impact: 0.9,
    },
  ]);
  store.getState().applyRuntimeFrame(frame);

  const state = store.getState();
  assert.equal(state.player.moveId, "hero_jab_1");
  assert.equal(state.player.movePhase, "active");
  assert.equal(state.player.lastStartedMoveId, "hero_jab_1");
  assert.equal(state.player.justHit, true);
  assert.equal(state.playerEvents.length, 1);
  assert.equal(state.cpu.health, 92);

  store.getState().returnToMenu();
});

test("mirror-store damage helpers no longer apply extra block or dodge reductions", () => {
  const store = useFighting;
  store.getState().returnToMenu();
  store.getState().startGame("single");
  store.getState().setSlotReady("player1", true);
  store.getState().beginMatch();

  store.getState().setCPUBlocking(true);
  store.getState().damageCPU(10);
  assert.equal(store.getState().cpu.health, 90);

  store.getState().setPlayerDodging(true);
  store.getState().damagePlayer(10);
  assert.equal(store.getState().player.health, 90);

  store.getState().returnToMenu();
});

test("combat event mirror keeps tech events on the owning fighter stream", () => {
  const store = useFighting;
  store.getState().returnToMenu();
  store.getState().startGame("single");
  store.getState().setSlotReady("player1", true);
  store.getState().beginMatch();

  store.getState().applyCombatEvents([
    {
      id: 11,
      type: "tech",
      slot: "player",
      result: "success",
    },
    {
      id: 12,
      type: "tech",
      slot: "cpu",
      result: "fail",
    },
  ]);

  assert.deepEqual(
    store.getState().playerEvents.map((event) => event.type),
    ["tech"],
  );
  assert.deepEqual(
    store.getState().cpuEvents.map((event) => event.type),
    ["tech"],
  );

  store.getState().returnToMenu();
});
