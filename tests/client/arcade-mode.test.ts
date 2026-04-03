import test from "node:test";
import assert from "node:assert/strict";

import type { RuntimeFrameSnapshot } from "../../client/src/game/combatPresentation";
import { useFighting } from "../../client/src/lib/stores/useFighting";

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

const winCurrentMatch = () => {
  const store = useFighting;
  const firstKo = createRuntimeFrame();
  firstKo.cpu.health = 0;
  store.getState().applyRuntimeFrame(firstKo);
  assert.equal(store.getState().gamePhase, "round_end");
  store.getState().resetRound();

  const secondKo = createRuntimeFrame();
  secondKo.cpu.health = 0;
  store.getState().applyRuntimeFrame(secondKo);
  assert.equal(store.getState().gamePhase, "match_end");
};

const loseCurrentMatch = () => {
  const store = useFighting;
  const firstKo = createRuntimeFrame();
  firstKo.player.health = 0;
  store.getState().applyRuntimeFrame(firstKo);
  assert.equal(store.getState().gamePhase, "round_end");
  store.getState().resetRound();

  const secondKo = createRuntimeFrame();
  secondKo.player.health = 0;
  store.getState().applyRuntimeFrame(secondKo);
  assert.equal(store.getState().gamePhase, "match_end");
};

test.afterEach(() => {
  useFighting.getState().returnToMenu();
});

test("startArcade seeds a curated ladder in the lobby", () => {
  const store = useFighting;
  store.getState().returnToMenu();
  store.getState().startArcade();

  const state = store.getState();
  assert.equal(state.gamePhase, "lobby");
  assert.equal(state.sessionMode, "arcade");
  assert.equal(state.arcadeRun?.encounters.length, 5);
  assert.equal(
    state.arcadeRun?.encounters.some((encounter) => encounter.fighterId === "stick_anvil"),
    true,
  );
  assert.equal(state.slots.player2.type, "cpu");
  assert.equal(state.slots.player2.label, state.arcadeRun?.encounters[0]?.label);
  assert.equal(state.arenaId, state.arcadeRun?.encounters[0]?.arenaId);
});

test("arcade match clears advance into the next curated encounter", () => {
  const store = useFighting;
  store.getState().returnToMenu();
  store.getState().startArcade();
  store.getState().setSlotReady("player1", true);
  store.getState().beginMatch();

  winCurrentMatch();

  let state = store.getState();
  assert.equal(state.arcadeRun?.status, "between_fights");
  assert.equal(state.arcadeRun?.clearedEncounterIds.length, 1);
  assert.ok(state.currentGameScore > 0);

  const nextEncounter = state.arcadeRun?.encounters[1];
  store.getState().continueArcade();
  state = store.getState();

  assert.equal(state.gamePhase, "fighting");
  assert.equal(state.arcadeRun?.currentEncounterIndex, 1);
  assert.equal(state.arcadeRun?.status, "in_progress");
  assert.equal(state.playerScore, 0);
  assert.equal(state.cpuScore, 0);
  assert.equal(state.slots.player2.label, nextEncounter?.label);
  assert.equal(state.arenaId, nextEncounter?.arenaId);
});

test("arcade run loss ends the gauntlet but preserves the run score already earned", () => {
  const store = useFighting;
  store.getState().returnToMenu();
  store.getState().startArcade();
  store.getState().setSlotReady("player1", true);
  store.getState().beginMatch();

  winCurrentMatch();
  const scoreAfterFirstClear = store.getState().currentGameScore;
  store.getState().continueArcade();
  loseCurrentMatch();

  const state = store.getState();
  assert.equal(state.arcadeRun?.status, "lost");
  assert.equal(state.currentGameScore, scoreAfterFirstClear);
  assert.equal(state.calculateFinalScore(), scoreAfterFirstClear);
});
