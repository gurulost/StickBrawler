import test from "node:test";
import assert from "node:assert/strict";

import { resolveTrainingDrillComplete } from "../../client/src/game/trainingDrills";
import { useFighting } from "../../client/src/lib/stores/useFighting";
import { useTrainingMode } from "../../client/src/lib/stores/useTrainingMode";

test.afterEach(() => {
  useTrainingMode.getState().resetSession();
  useFighting.getState().returnToMenu();
});

test("training session store tracks current drill progress and reset cues", () => {
  useTrainingMode.getState().startSession("stick_villain");

  let state = useTrainingMode.getState();
  assert.equal(state.fighterId, "stick_villain");
  assert.equal(state.currentDrillIndex, 0);
  assert.deepEqual(state.completedDrillIds, []);

  useTrainingMode.getState().completeCurrentDrill();
  state = useTrainingMode.getState();
  assert.deepEqual(state.completedDrillIds, ["jab"]);
  assert.equal(state.lastCompletedDrillId, "jab");

  const beforeResetNonce = state.drillResetNonce;
  useTrainingMode.getState().selectDrill("parry");
  state = useTrainingMode.getState();
  assert.equal(state.currentDrillIndex, 2);
  assert.equal(state.drillResetNonce, beforeResetNonce + 1);
});

test("training drill completion stays tied to fighter move identity and defense flags", () => {
  useFighting.getState().returnToMenu();
  useFighting.getState().startTraining();
  const baseline = useFighting.getState().player;

  assert.equal(
    resolveTrainingDrillComplete("jab", "stick_hero", {
      ...baseline,
      fighterId: "stick_hero",
      justStartedMove: true,
      moveId: "hero_jab_1",
    }),
    true,
  );

  assert.equal(
    resolveTrainingDrillComplete("launcher", "stick_villain", {
      ...baseline,
      fighterId: "stick_villain",
      justStartedMove: true,
      moveId: "parryCounter",
    }),
    true,
  );

  assert.equal(
    resolveTrainingDrillComplete("jab", "stick_kite", {
      ...baseline,
      fighterId: "stick_kite",
      justStartedMove: true,
      moveId: "kite_feather_jab",
    }),
    true,
  );

  assert.equal(
    resolveTrainingDrillComplete("launcher", "stick_kite", {
      ...baseline,
      fighterId: "stick_kite",
      justStartedMove: true,
      moveId: "kite_sky_hook",
    }),
    true,
  );

  assert.equal(
    resolveTrainingDrillComplete("jab", "stick_anvil", {
      ...baseline,
      fighterId: "stick_anvil",
      justStartedMove: true,
      moveId: "anvil_club_jab",
    }),
    true,
  );

  assert.equal(
    resolveTrainingDrillComplete("launcher", "stick_anvil", {
      ...baseline,
      fighterId: "stick_anvil",
      justStartedMove: true,
      moveId: "anvil_headbutt_lift",
    }),
    true,
  );

  assert.equal(
    resolveTrainingDrillComplete("parry", "stick_hero", {
      ...baseline,
      justParried: true,
    }),
    true,
  );

  assert.equal(
    resolveTrainingDrillComplete("roll", "stick_hero", {
      ...baseline,
      isDodging: true,
    }),
    true,
  );

  assert.equal(
    resolveTrainingDrillComplete("grab", "stick_hero", {
      ...baseline,
      isGrabbing: true,
    }),
    true,
  );
});
