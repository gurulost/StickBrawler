import test from "node:test";
import assert from "node:assert/strict";

import { useFighting } from "../../client/src/lib/stores/useFighting";
import type { RuntimeFrameSnapshot } from "../../client/src/game/combatPresentation";

const createRuntimeFrame = (): RuntimeFrameSnapshot => ({
  player: {
    slot: "player",
    fighterId: "stick_hero",
    health: 100,
    position: [-1.2, 0, 0],
    velocity: [0, 0, 0],
    facing: 1,
    grounded: true,
    inAir: false,
    action: "idle",
    moveId: undefined,
    moveInstanceId: undefined,
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
  cpu: {
    slot: "cpu",
    fighterId: "stick_villain",
    health: 100,
    position: [1.2, 0, 0],
    velocity: [0, 0, 0],
    facing: -1,
    grounded: true,
    inAir: false,
    action: "idle",
    moveId: undefined,
    moveInstanceId: undefined,
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
  roundTimeRemaining: 60,
  maxRoundTime: 60,
});

test("local match advances to match_end from runtime KO snapshots", () => {
  const store = useFighting;
  const state = store.getState();

  state.returnToMenu();
  state.setMatchMode("single");
  state.startGame("single");
  store.getState().setSlotReady("player1", true);
  store.getState().beginMatch();

  const firstKo = createRuntimeFrame();
  firstKo.cpu.health = 0;
  store.getState().applyRuntimeFrame(firstKo);
  assert.equal(store.getState().gamePhase, "round_end");
  assert.equal(store.getState().playerScore, 1);

  store.getState().resetRound();
  assert.equal(store.getState().gamePhase, "fighting");

  const secondKo = createRuntimeFrame();
  secondKo.cpu.health = 0;
  store.getState().applyRuntimeFrame(secondKo);
  assert.equal(store.getState().gamePhase, "match_end");
  assert.equal(store.getState().playerScore, 2);

  store.getState().restartMatch();
  assert.equal(store.getState().gamePhase, "fighting");
  assert.equal(store.getState().playerScore, 0);
  assert.equal(store.getState().cpuScore, 0);

  store.getState().returnToMenu();
});

test("online match requests normalize to local play when the feature is disabled", () => {
  const store = useFighting;
  store.getState().returnToMenu();

  store.getState().setMatchMode("online");
  assert.equal(store.getState().matchMode, "local");

  store.getState().startGame("online");
  assert.equal(store.getState().matchMode, "local");
  assert.equal(store.getState().slots.player2.type, "human");
  assert.equal(store.getState().slots.player2.label, "Player 2");

  store.getState().returnToMenu();
  store.getState().setMatchMode("single");
});

test("resetRound increments the runtime reset nonce while keeping the match active", () => {
  const store = useFighting;
  store.getState().returnToMenu();
  store.getState().startGame("single");
  store.getState().setSlotReady("player1", true);
  store.getState().beginMatch();

  const beforeReset = store.getState().runtimeResetNonce;
  store.getState().applyRuntimeFrame(createRuntimeFrame());
  store.getState().resetRound();

  const state = store.getState();
  assert.equal(state.gamePhase, "fighting");
  assert.equal(state.runtimeResetNonce, beforeReset + 1);
  assert.deepEqual(state.player.position, [-2, 0, 0]);
  assert.deepEqual(state.cpu.position, [2, 0, 0]);

  store.getState().returnToMenu();
});

test("runtime frame ingest mirrors authored move state and combat events", () => {
  const store = useFighting;
  store.getState().returnToMenu();
  store.getState().startGame("single");
  store.getState().setSlotReady("player1", true);
  store.getState().beginMatch();

  const frame = createRuntimeFrame();
  frame.player = {
    ...frame.player,
    velocity: [0.5, 0, 0],
    action: "attack",
    moveId: "hero_jab_1",
    moveInstanceId: 3,
    moveFrame: 6,
    movePhase: "active",
    staminaMeter: 95,
    specialMeter: 4,
    comboCounter: 2,
    comboTimer: 640,
    attackCooldown: 180,
    lastStartedMoveId: "hero_jab_1",
    lastConfirmedMoveId: "hero_jab_1",
    justStartedMove: true,
    justHit: true,
  };
  frame.cpu = {
    ...frame.cpu,
    health: 92,
    action: "hitstun",
    hitLagFrames: 4,
    hitstunFrames: 14,
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

test("guard break HUD status is mirrored from runtime snapshots", () => {
  const store = useFighting;
  store.getState().returnToMenu();
  store.getState().startGame("single");
  store.getState().setSlotReady("player1", true);
  store.getState().beginMatch();

  const broken = createRuntimeFrame();
  broken.player.guardBroken = true;
  broken.player.guardMeter = 28;
  broken.player.canAct = false;
  broken.player.justGuardBroke = true;
  store.getState().applyRuntimeFrame(broken);

  assert.equal(store.getState().playerStatus, "guard_break");
  assert.equal(store.getState().player.guardBroken, true);

  const recovered = createRuntimeFrame();
  recovered.player.guardBroken = false;
  recovered.player.guardMeter = 64;
  recovered.player.canAct = true;
  store.getState().applyRuntimeFrame(recovered);

  assert.equal(store.getState().playerStatus, undefined);
  assert.equal(store.getState().player.guardBroken, false);

  store.getState().returnToMenu();
});

test("timeout round resolution is driven by runtime snapshot time, not store-side ticking", () => {
  const store = useFighting;
  store.getState().returnToMenu();
  store.getState().startGame("single");
  store.getState().setSlotReady("player1", true);
  store.getState().beginMatch();

  const timeoutFrame = createRuntimeFrame();
  timeoutFrame.roundTimeRemaining = 0;
  timeoutFrame.player.health = 72;
  timeoutFrame.cpu.health = 41;

  store.getState().applyRuntimeFrame(timeoutFrame);

  assert.equal(store.getState().roundTime, 0);
  assert.equal(store.getState().gamePhase, "round_end");
  assert.equal(store.getState().playerScore, 1);

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
