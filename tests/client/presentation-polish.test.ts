import test from "node:test";
import assert from "node:assert/strict";

import { coreMoves } from "../../client/src/combat/moves";
import {
  BASE_POSE,
  PRESENTATION_CLIP_IDS,
  resolvePresentationMoveId,
  samplePoseForState,
} from "../../client/src/game/stickfigure/movePresentation";
import { ARENA_THEMES, getArenaTheme } from "../../client/src/game/arenas";

const BESPOKE_MOVE_IDS = [
  "hero_sweep",
  "hero_neutral_proj",
  "hero_dash_strike",
  "hero_rising_recovery",
  "hero_counter_light",
  "vill_jab_triple",
  "vill_low_stab",
  "vill_dive_explosion",
  "vill_poison_orb",
  "vill_teleport_recover",
  "vill_trap",
] as const;

test("expanded authored move set resolves to bespoke presentation clips", () => {
  for (const moveId of BESPOKE_MOVE_IDS) {
    const move = coreMoves[moveId];
    assert.equal(resolvePresentationMoveId(moveId), moveId);
    assert.equal(PRESENTATION_CLIP_IDS.has(moveId), true);

    const pose = samplePoseForState(
      {
        velocity: [0, 0, 0],
        moveId,
        moveFrame: Math.floor(move.totalFrames * 0.5),
      },
      move.totalFrames,
      0,
    );

    assert.notDeepEqual(
      pose,
      BASE_POSE,
      `expected ${moveId} to sample a bespoke authored pose instead of the base pose`,
    );
    assert.notEqual(
      pose.attackStyle,
      null,
      `expected ${moveId} to expose authored attack styling in presentation`,
    );
    assert.ok(
      pose.lineWeight > BASE_POSE.lineWeight,
      `expected ${moveId} to thicken line weight on its contact beat`,
    );
  }
});

test("legacy aliases still route into the richer authored clips", () => {
  assert.equal(resolvePresentationMoveId("lightJab"), "hero_jab_1");
  assert.equal(resolvePresentationMoveId("lightJab2"), "vill_jab_triple");
  assert.equal(resolvePresentationMoveId("launcher"), "hero_launcher");
  assert.equal(resolvePresentationMoveId("guardBreak"), "vill_guard_break_big");
  assert.equal(resolvePresentationMoveId("parryCounter"), "hero_counter_light");
});

test("arena themes carry distinct stage-specific readability tuning", () => {
  const sunset = ARENA_THEMES.sunsetBloom.openPresentation;
  const aurora = ARENA_THEMES.auroraFlux.openPresentation;
  const containment = ARENA_THEMES.containment.containedPresentation;

  assert.ok(sunset, "sunsetBloom should expose open-arena tuning");
  assert.ok(aurora, "auroraFlux should expose open-arena tuning");
  assert.ok(containment, "containment should expose contained-arena tuning");

  assert.equal(sunset?.laneWidth, 3.45);
  assert.equal(aurora?.laneWidth, 2.9);
  assert.equal(sunset?.decorationCount, 4);
  assert.equal(aurora?.decorationCount, 3);
  assert.equal(containment?.wallTransmission, 0.68);
  assert.equal(containment?.spawnPadGlow, 0.28);

  assert.notEqual(sunset?.laneWidth, aurora?.laneWidth);
  assert.notEqual(sunset?.decorationOpacity, aurora?.decorationOpacity);
});

test("arena theme lookup still falls back to the default configured arena", () => {
  assert.equal(getArenaTheme("missing-theme").id, "sunsetBloom");
  assert.equal(getArenaTheme(undefined).id, "sunsetBloom");
});
