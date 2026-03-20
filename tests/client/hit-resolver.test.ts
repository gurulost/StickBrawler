import test from "node:test";
import assert from "node:assert/strict";

import { coreMoves, resolveHits, sampleCombatSpatialFrame, type FighterCombatState } from "../../client/src/combat";

const createCombatState = (
  overrides: Partial<FighterCombatState> = {},
): FighterCombatState => ({
  action: "idle",
  facing: 1,
  fighterId: "stick_hero",
  moveId: undefined,
  moveFrame: 0,
  hitstunFrames: 0,
  blockstunFrames: 0,
  guardMeter: 80,
  staminaMeter: 100,
  specialMeter: 0,
  comboCounter: 0,
  juggleDecay: 0,
  position: [0, 0, 0],
  velocity: [0, 0, 0],
  inAir: false,
  ...overrides,
});

test("resolveHits only connects during authored active frames", () => {
  const move = coreMoves.hero_jab_1;
  const defender = createCombatState({
    position: [0.4, 0, 0],
  });

  const startupHits = resolveHits({
    attacker: createCombatState({
      moveId: move.id,
      moveFrame: move.windows.startup.start,
    }),
    defender,
    move,
  });
  assert.equal(startupHits.length, 0);

  const activeHits = resolveHits({
    attacker: createCombatState({
      moveId: move.id,
      moveFrame: move.hitboxes[0].frames.start,
    }),
    defender,
    move,
  });
  assert.equal(activeHits.length, 1);
});

test("resolveHits uses body hurt regions instead of only the defender origin", () => {
  const move = coreMoves.hero_launcher;
  const hitFrame = move.hitboxes[0].frames.start;

  const hits = resolveHits({
    attacker: createCombatState({
      moveId: move.id,
      moveFrame: hitFrame,
      position: [0, 0, 0],
    }),
    defender: createCombatState({
      position: [0.1, 0, 0],
    }),
    move,
  });

  assert.equal(hits.length, 1);
});

test("all authored hitboxes declare explicit socket anchors", () => {
  Object.values(coreMoves).forEach((move) => {
    move.hitboxes.forEach((hitbox) => {
      assert.ok(
        hitbox.socket,
        `move ${move.id} hitbox ${hitbox.id} is missing an explicit socket anchor`,
      );
    });
  });
});

test("combat spatial samples expose authored socket-driven hitboxes", () => {
  const move = coreMoves.hero_air_down_spike;
  const frame = sampleCombatSpatialFrame({
    fighter: createCombatState({
      moveId: move.id,
      moveFrame: move.hitboxes[0].frames.start,
      position: [0, 2, 0],
      inAir: true,
    }),
    move,
  });

  assert.equal(frame.hitboxes.length, 1);
  assert.equal(frame.hitboxes[0]?.socket, "rightFoot");
  assert.equal(frame.hitboxes[0]?.active, true);
  assert.ok(frame.sockets.some((socket) => socket.id === "rightFoot"));
});

test("combat spatial samples inherit rendered root offset and body scale from the authored pose", () => {
  const move = coreMoves.hero_launcher;
  const frame = sampleCombatSpatialFrame({
    fighter: createCombatState({
      moveId: move.id,
      moveFrame: 12,
      position: [0, 0, 0],
    }),
    move,
  });

  const torso = frame.sockets.find((socket) => socket.id === "torso");
  const head = frame.sockets.find((socket) => socket.id === "head");

  assert.ok(torso, "expected torso socket to exist");
  assert.ok(head, "expected head socket to exist");
  assert.ok(
    (torso?.world[1] ?? 0) > 1.2,
    `expected torso height to include authored lift/compression, got ${torso?.world[1] ?? 0}`,
  );
  assert.ok(
    (head?.world[1] ?? 0) > 1.95,
    `expected head height to include authored lift/compression, got ${head?.world[1] ?? 0}`,
  );
});
