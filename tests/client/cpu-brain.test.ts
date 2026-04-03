import test from "node:test";
import assert from "node:assert/strict";

import {
  CpuBrain,
  CpuDifficulty,
  CpuStyle,
} from "../../client/src/game/cpuBrain";

const createQueuedRng = (...values: number[]) => {
  let index = 0;
  return () => {
    const value = values[Math.min(index, values.length - 1)] ?? 0.5;
    index += 1;
    return value;
  };
};

const createCpuState = () => ({
  position: [0, 0, 0] as [number, number, number],
  isJumping: false,
  attackCooldown: 0,
  dodgeCooldown: 0,
  guardMeter: 80,
});

test("trickster brutal CPU can parry obvious pressure", () => {
  const brain = new CpuBrain({
    style: CpuStyle.TRICKSTER,
    difficulty: CpuDifficulty.BRUTAL,
    rng: createQueuedRng(0.99, 0.1, 0.1),
  });

  const controls = brain.tick(
    createCpuState(),
    {
      position: [0.8, 0, 0],
      isAttacking: true,
    },
    0.5,
  );

  assert.equal(controls.shield, true);
  assert.equal(controls.parry, true);
});

test("beginner easy CPU blocks instead of parrying in the same spot", () => {
  const brain = new CpuBrain({
    style: CpuStyle.BEGINNER,
    difficulty: CpuDifficulty.EASY,
    rng: createQueuedRng(0.99, 0.1, 0.1),
  });

  const controls = brain.tick(
    createCpuState(),
    {
      position: [0.8, 0, 0],
      isAttacking: true,
    },
    0.5,
  );

  assert.equal(controls.shield, true);
  assert.equal(controls.parry, false);
});

test("zoner CPU prefers a special at long range when the lane is open", () => {
  const brain = new CpuBrain({
    style: CpuStyle.ZONER,
    difficulty: CpuDifficulty.NORMAL,
    rng: createQueuedRng(0.99, 0.7, 0.2),
  });

  const controls = brain.tick(
    createCpuState(),
    {
      position: [2.8, 0, 0],
      isAttacking: false,
    },
    0.5,
  );

  assert.equal(controls.special, true);
  assert.equal(controls.attack1, false);
  assert.equal(controls.attack2, false);
});
