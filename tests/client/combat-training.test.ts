import test from "node:test";
import assert from "node:assert/strict";

import type { DualInputSnapshot, PlayerInputSnapshot } from "../../client/src/hooks/use-player-controls";
import { Controls } from "../../client/src/input/controls";
import {
  resolveActionIntentDirection,
  resolveMovementIntentDirection,
} from "../../client/src/input/intentDirection";
import {
  consumeCombatTrainingRunFrame,
  createCombatTrainingRunFromPreset,
  injectCombatTrainingFrame,
  injectCombatTrainingIntentFrame,
} from "../../client/src/lib/combatTraining";
import { useControls } from "../../client/src/lib/stores/useControls";

const createSnapshot = (
  inputs: Partial<PlayerInputSnapshot> = {},
): PlayerInputSnapshot =>
  Object.values(Controls).reduce((state, control) => {
    state[control] = !!inputs[control];
    return state;
  }, {} as PlayerInputSnapshot);

const createDualSnapshot = (): DualInputSnapshot => ({
  player1: createSnapshot(),
  player2: createSnapshot(),
});

test.afterEach(() => {
  useControls.setState({
    combatTrainingTargetSlot: "player1",
    combatTrainingActiveRun: null,
    combatTrainingNextRunId: 1,
  });
});

test("action direction routing preserves forward/back and vertical slice inputs", () => {
  assert.equal(
    resolveMovementIntentDirection(createSnapshot({ [Controls.rightward]: true })),
    "right",
  );
  assert.equal(
    resolveActionIntentDirection(createSnapshot({ [Controls.rightward]: true }), 1),
    "forward",
  );
  assert.equal(
    resolveActionIntentDirection(createSnapshot({ [Controls.leftward]: true }), 1),
    "back",
  );
  assert.equal(
    resolveActionIntentDirection(createSnapshot({ [Controls.rightward]: true }), -1),
    "back",
  );
  assert.equal(
    resolveActionIntentDirection(createSnapshot({ [Controls.forward]: true }), 1),
    "up",
  );
  assert.equal(
    resolveActionIntentDirection(createSnapshot({ [Controls.backward]: true }), 1),
    "down",
  );
});

test("combat training presets emit deterministic frame scripts and slot-only input injection", () => {
  const run = createCombatTrainingRunFromPreset("vill_guard_break_big", "player2", 7);
  const first = consumeCombatTrainingRunFrame(run);
  const second = consumeCombatTrainingRunFrame(first.nextRun!);
  const third = consumeCombatTrainingRunFrame(second.nextRun!);

  assert.equal(first.sample.slot, "player2");
  assert.equal(first.sample.stepLabel, "heavy charge");
  assert.equal(first.sample.inputs[Controls.rightward], true);
  assert.equal(first.sample.inputs[Controls.attack], true);
  assert.equal(first.sample.intent?.attack?.dir, "forward");
  assert.equal(first.sample.intent?.attack?.press.heavy, true);
  assert.equal(second.sample.stepLabel, "heavy charge");
  assert.equal(third.sample.stepLabel, "heavy charge");

  const injected = injectCombatTrainingFrame(createDualSnapshot(), first.sample);
  const injectedIntent = injectCombatTrainingIntentFrame(
    {
      player1: {
        attack: undefined,
        special: undefined,
        defend: [],
        jump: undefined,
        dash: undefined,
        direction: "neutral",
      },
      player2: {
        attack: undefined,
        special: undefined,
        defend: [],
        jump: undefined,
        dash: undefined,
        direction: "neutral",
      },
    },
    first.sample,
  );
  assert.equal(injected.player1[Controls.attack], false);
  assert.equal(injected.player2[Controls.attack], true);
  assert.equal(injected.player2[Controls.rightward], true);
  assert.equal(injectedIntent.player2.attack?.press.heavy, true);
});

test("combat training store queues presets through the selected slot", () => {
  const store = useControls.getState();
  store.setCombatTrainingTargetSlot("player2");
  store.queueCombatTrainingPreset("hero_jab_1");

  const sample = useControls.getState().consumeCombatTrainingFrame();

  assert.equal(sample?.slot, "player2");
  assert.equal(sample?.label, "Hero Jab");
  assert.equal(sample?.inputs[Controls.attack], true);
});
