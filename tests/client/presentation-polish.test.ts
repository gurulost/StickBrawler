import test from "node:test";
import assert from "node:assert/strict";

import { coreMoves } from "../../client/src/combat/moves";
import {
  BASE_POSE,
  PRESENTATION_CLIP_IDS,
  resolveSlicePresentationId,
  resolveSlicePresentationProfile,
  resolvePresentationMoveId,
  samplePoseForState,
} from "../../client/src/game/stickfigure/movePresentation";
import { ARENA_THEMES, getArenaTheme } from "../../client/src/game/arenas";
import { resolveCombatDebugData } from "../../client/src/game/combatDebug";
import type { CharacterState } from "../../client/src/lib/stores/useFighting";

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

const createDebugCharacterState = (moveId?: string, moveFrame = 0): CharacterState => ({
  health: 100,
  position: [0, 0, 0],
  direction: 1,
  fighterId: "stick_hero",
  grounded: true,
  inAir: false,
  action: moveId ? "attack" : "idle",
  moveId,
  moveInstanceId: 1,
  moveFrame,
  movePhase: "active",
  hitLagFrames: 0,
  hitstunFrames: 0,
  blockstunFrames: 0,
  landingLagFrames: 0,
  canAct: !moveId,
  invulnerable: false,
  armored: false,
  guardBroken: false,
  isJumping: false,
  isAttacking: Boolean(moveId),
  isBlocking: false,
  isDodging: false,
  isGrabbing: false,
  isTaunting: false,
  isAirAttacking: false,
  airJumpsLeft: 2,
  guardMeter: 80,
  staminaMeter: 100,
  specialMeter: 0,
  attackCooldown: 0,
  dodgeCooldown: 0,
  grabCooldown: 0,
  moveCooldown: 0,
  comboCount: 0,
  comboTimer: 0,
  lastMoveType: "",
  velocity: [0, 0, 0],
});

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

test("vertical slice states resolve to explicit presentation profiles", () => {
  assert.equal(
    resolveSlicePresentationId(
      {
        velocity: [0.8, 0, 0],
      },
      undefined,
      false,
    ),
    "run",
  );
  assert.equal(
    resolveSlicePresentationId(
      {
        velocity: [0, 2.4, 0],
        inAir: true,
      },
      undefined,
      false,
    ),
    "jump",
  );
  assert.equal(
    resolveSlicePresentationId(
      {
        velocity: [0, -2.2, 0],
        inAir: true,
      },
      undefined,
      false,
    ),
    "fall",
  );
  assert.equal(
    resolveSlicePresentationId(
      {
        velocity: [0, 0, 0],
        moveId: "hero_launcher",
      },
      coreMoves.hero_launcher,
      false,
    ),
    "hero_launcher",
  );
  assert.equal(
    resolveSlicePresentationId(
      {
        velocity: [0, 0, 0],
        isBlocking: true,
      },
      undefined,
      true,
    ),
    "parry",
  );

  const jabProfile = resolveSlicePresentationProfile(
    {
      velocity: [0, 0, 0],
      moveId: "hero_jab_1",
    },
    coreMoves.hero_jab_1,
    false,
  );
  const landProfile = resolveSlicePresentationProfile(
    {
      velocity: [0, -0.4, 0],
      landingLagFrames: 8,
    },
    undefined,
    false,
  );

  assert.deepEqual(jabProfile.trailSockets, ["torso", "rightHand"]);
  assert.equal(jabProfile.hurtSocket, "torso");
  assert.deepEqual(landProfile.landingSockets, ["leftFoot", "rightFoot"]);
});

test("landing and blockstun now sample authored reaction poses instead of generic idle", () => {
  const landingPose = samplePoseForState(
    {
      velocity: [0, -1.2, 0],
      landingLagFrames: 10,
    },
    undefined,
    0,
  );
  const blockPose = samplePoseForState(
    {
      velocity: [0, 0, 0],
      blockstunFrames: 9,
    },
    undefined,
    0,
  );

  assert.notDeepEqual(landingPose, BASE_POSE);
  assert.notDeepEqual(blockPose, BASE_POSE);
  assert.ok(landingPose.lineWeight > BASE_POSE.lineWeight);
  assert.ok(blockPose.lineWeight > BASE_POSE.lineWeight);
});

test("signature slice motion language exaggerates compression, release, and rebound", () => {
  const jabWindup = samplePoseForState(
    {
      velocity: [0, 0, 0],
      moveId: "hero_jab_1",
      moveFrame: Math.floor(coreMoves.hero_jab_1.totalFrames * 0.18),
    },
    coreMoves.hero_jab_1.totalFrames,
    0,
  );
  const jabRelease = samplePoseForState(
    {
      velocity: [0, 0, 0],
      moveId: "hero_jab_1",
      moveFrame: Math.floor(coreMoves.hero_jab_1.totalFrames * 0.38),
    },
    coreMoves.hero_jab_1.totalFrames,
    0,
  );
  const landingImpact = samplePoseForState(
    {
      velocity: [0, -1.2, 0],
      justLanded: true,
    },
    undefined,
    0,
  );
  const landingRecovery = samplePoseForState(
    {
      velocity: [0, -0.4, 0],
      landingLagFrames: 6,
    },
    undefined,
    0,
  );
  const parryCut = samplePoseForState(
    {
      velocity: [0, 0, 0],
      moveId: "parry",
      moveFrame: 4,
    },
    20,
    0,
  );

  assert.ok(jabWindup.bodyScale[1] < 0.85, "jab windup should visibly compress before release");
  assert.ok(jabRelease.bodyScale[1] > 1.05, "jab contact should rebound upward into the strike");
  assert.ok(jabRelease.smear > 0.9, "jab contact should reserve smear for the release beat");
  assert.ok(jabRelease.lineWeight > jabWindup.lineWeight, "impact line weight should spike above the windup");
  assert.ok(landingImpact.bodyScale[1] < 0.85, "landing should hit a deep compression on contact");
  assert.ok(landingRecovery.rootOffset[1] > 0, "landing should rebound upward after the impact");
  assert.ok(landingRecovery.bodyScale[1] > landingImpact.bodyScale[1], "landing rebound should open back up after compression");
  assert.ok(parryCut.bodyRotation[2] < -0.18, "parry should read as a sharp cut instead of a static guard");
  assert.ok(parryCut.lineWeight > 1.4, "parry cut should visibly thicken the ink line");
});

test("defensive and locomotion poses stay compact and directional", () => {
  const blockPose = samplePoseForState(
    {
      velocity: [0, 0, 0],
      isBlocking: true,
    },
    undefined,
    0,
  );
  const runPose = samplePoseForState(
    {
      velocity: [4.8, 0, 0],
    },
    undefined,
    0.35,
  );
  const jumpPose = samplePoseForState(
    {
      velocity: [0, 2.4, 0],
      inAir: true,
    },
    undefined,
    0,
  );
  const fallPose = samplePoseForState(
    {
      velocity: [0, -2.2, 0],
      inAir: true,
    },
    undefined,
    0.4,
  );

  assert.equal(blockPose.attackStyle, null, "sustained block should no longer borrow the parry attack pose");
  assert.ok(blockPose.bodyScale[1] < 0.95, "block should stay compact and braced");
  assert.ok(blockPose.leftArm.rotation[0] > 0.8 && blockPose.rightArm.rotation[0] > 0.8);
  assert.ok(runPose.bodyRotation[2] !== 0, "run should use torso rotation instead of only limb cycling");
  assert.ok(runPose.trailIntensity > 0.1, "run should carry a directional ink streak at pace");
  assert.ok(jumpPose.torsoLean < 0, "jump should coil upward with a lifted silhouette");
  assert.ok(fallPose.torsoLean > 0.2, "fall should read as a committed downward drop");
});

test("debug timeline data exposes active hitboxes for the tuned slice", () => {
  const jabData = resolveCombatDebugData(createDebugCharacterState("hero_jab_1", 6));
  const guardBreakData = resolveCombatDebugData(createDebugCharacterState("vill_guard_break_big", 24));

  assert.deepEqual(jabData.activeHitboxes, ["hero-jab"]);
  assert.ok(jabData.segments.some((segment) => segment.lane === "phase" && segment.label === "Active"));
  assert.deepEqual(guardBreakData.activeHitboxes, ["vill-smash"]);
  assert.ok(guardBreakData.segments.some((segment) => segment.lane === "phase" && segment.label === "Recovery"));
});

test("arena themes carry distinct stage-specific readability tuning", () => {
  const sunset = ARENA_THEMES.sunsetBloom.openPresentation;
  const aurora = ARENA_THEMES.auroraFlux.openPresentation;
  const containment = ARENA_THEMES.containment.containedPresentation;

  assert.ok(sunset, "sunsetBloom should expose open-arena tuning");
  assert.ok(aurora, "auroraFlux should expose open-arena tuning");
  assert.ok(containment, "containment should expose contained-arena tuning");

  assert.equal(sunset?.laneWidth, 2.22);
  assert.equal(aurora?.laneWidth, 2.08);
  assert.equal(sunset?.decorationCount, 2);
  assert.equal(aurora?.decorationCount, 2);
  assert.equal(containment?.wallTransmission, 0.86);
  assert.equal(containment?.spawnPadGlow, 0.16);

  assert.notEqual(sunset?.laneWidth, aurora?.laneWidth);
  assert.notEqual(sunset?.decorationOpacity, aurora?.decorationOpacity);
  assert.ok((sunset?.laneOpacity ?? 0) > (sunset?.gridOpacity ?? 0));
  assert.ok((aurora?.laneOpacity ?? 0) > (aurora?.gridOpacity ?? 0));
  assert.ok((containment?.wallOpacity ?? 1) < 0.3);
});

test("arena theme lookup still falls back to the default configured arena", () => {
  assert.equal(getArenaTheme("missing-theme").id, "sunsetBloom");
  assert.equal(getArenaTheme(undefined).id, "sunsetBloom");
});
