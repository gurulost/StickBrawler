import test from "node:test";
import assert from "node:assert/strict";

import {
  CAMERA_MAX_DEPTH,
  CAMERA_MIN_DEPTH,
  COMBAT_PLANE_BAND,
  boundPlaneVelocity,
  constrainToCombatPlane,
  resolveCombatCameraRig,
  resolveCombatPlaneDashVelocity,
  resolveCombatPlaneDistance,
  scaleCombatPlaneDepthSpeed,
} from "../../client/src/game/combatReadability";

test("combat plane helpers compress depth motion and spring toward center", () => {
  const [dashX, dashZ] = resolveCombatPlaneDashVelocity(0, 1, 10);

  assert.equal(dashX, 0);
  assert.equal(dashZ, scaleCombatPlaneDepthSpeed(10));
  assert.ok(resolveCombatPlaneDistance(3, 1.4) < Math.hypot(3, 1.4));
  assert.ok(constrainToCombatPlane(1.2, 1 / 60) <= COMBAT_PLANE_BAND);
  assert.ok(Math.abs(boundPlaneVelocity(4, 0.2)) < 1);
});

test("combat camera rig stays centered on the combat lane even with visible z drift", () => {
  const closeRig = resolveCombatCameraRig([-2, 0, 0.34], [2, 0, -0.34]);
  const wideRig = resolveCombatCameraRig([-4.5, 0, 0], [4.5, 0, 0]);

  assert.ok(closeRig.position[2] >= CAMERA_MIN_DEPTH);
  assert.ok(closeRig.position[2] <= CAMERA_MAX_DEPTH);
  assert.ok(closeRig.position[2] < 5, "close exchanges should keep the camera tight on the fighters");
  assert.ok(closeRig.position[1] < 4.5, "the read frame should not float too high above grounded combat");
  assert.ok(Math.abs(closeRig.target[2]) < 0.12);
  assert.ok(wideRig.position[2] > closeRig.position[2]);
  assert.ok(wideRig.position[2] < 6.5, "wide spacing should still stay closer than the legacy frame");
  assert.ok(Math.abs(wideRig.target[2]) < 0.01);
});
