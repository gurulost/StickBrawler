import { ARENA_HALF_DEPTH, ARENA_HALF_WIDTH, moveTowards } from "./Physics";

export const COMBAT_PLANE_Z = 0;
export const COMBAT_PLANE_BAND = 0.38;
export const COMBAT_PLANE_SPRING = 14.5;
export const COMBAT_PLANE_DRIFT_SPEED_SCALE = 0.38;
export const COMBAT_PLANE_DISTANCE_WEIGHT = 0.32;
export const COMBAT_PLANE_PUSH_DEPTH_SCALE = 0.28;

export const CAMERA_TRACK_SMOOTHING = 6.1;
export const CAMERA_LOOK_HEIGHT_BASE = 1.78;
export const CAMERA_MIN_HEIGHT = 4.15;
export const CAMERA_MAX_HEIGHT = 6.35;
export const CAMERA_MIN_DEPTH = 5.05;
export const CAMERA_MAX_DEPTH = 7.45;
export const CAMERA_X_TRACK_LIMIT = ARENA_HALF_WIDTH * 0.42;
export const CAMERA_TARGET_Z_LIMIT = COMBAT_PLANE_BAND * 0.72;
export const CAMERA_POSITION_Z_LIMIT = COMBAT_PLANE_BAND * 1.18;

const CAMERA_SPREAD_Z_WEIGHT = 0.28;
const CAMERA_VERTICAL_SPREAD_WEIGHT = 0.48;
const CAMERA_MIDPOINT_DEPTH_TRACK = 0.22;
const CAMERA_DEPTH_DRIFT_WEIGHT = 0.18;

const clampValue = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export function constrainToCombatPlane(z: number, delta: number) {
  const towardPlane = moveTowards(z, COMBAT_PLANE_Z, COMBAT_PLANE_SPRING * delta);
  return clampValue(towardPlane, -COMBAT_PLANE_BAND, COMBAT_PLANE_BAND);
}

export function boundPlaneVelocity(vz: number, z: number) {
  if (Math.abs(z) >= COMBAT_PLANE_BAND) {
    return 0;
  }
  return vz * 0.16;
}

export function scaleCombatPlaneDepthSpeed(speed: number) {
  return speed * COMBAT_PLANE_DRIFT_SPEED_SCALE;
}

export function resolveCombatPlaneDashVelocity(
  dirX: number,
  dirZ: number,
  speed: number,
): [number, number] {
  if (dirX === 0 && dirZ === 0) {
    return [0, 0];
  }
  const magnitude = Math.hypot(dirX, dirZ) || 1;
  return [
    (dirX / magnitude) * speed,
    (dirZ / magnitude) * scaleCombatPlaneDepthSpeed(speed),
  ];
}

export function resolveCombatPlaneDistance(dx: number, dz: number) {
  return Math.hypot(dx, dz * COMBAT_PLANE_DISTANCE_WEIGHT);
}

export function resolveCombatPlanePush(dx: number, dz: number, push: number): [number, number] {
  if (push <= 0) {
    return [0, 0];
  }
  const magnitude = Math.hypot(dx, dz) || 1;
  return [
    (dx / magnitude) * push,
    (dz / magnitude) * push * COMBAT_PLANE_PUSH_DEPTH_SCALE,
  ];
}

export interface CombatCameraRig {
  position: [number, number, number];
  target: [number, number, number];
}

export function resolveCombatCameraRig(
  playerPosition: [number, number, number],
  cpuPosition: [number, number, number],
): CombatCameraRig {
  const midpointX = (playerPosition[0] + cpuPosition[0]) / 2;
  const midpointZ = (playerPosition[2] + cpuPosition[2]) / 2;
  const maxHeight = Math.max(playerPosition[1], cpuPosition[1]);
  const horizontalSpread = resolveCombatPlaneDistance(
    playerPosition[0] - cpuPosition[0],
    playerPosition[2] - cpuPosition[2],
  );
  const verticalSpread = Math.abs(playerPosition[1] - cpuPosition[1]);
  const combinedSpread =
    horizontalSpread + verticalSpread * CAMERA_VERTICAL_SPREAD_WEIGHT;
  const depthDrift = Math.max(Math.abs(playerPosition[2]), Math.abs(cpuPosition[2]));
  const trackedMidpointZ = midpointZ * CAMERA_MIDPOINT_DEPTH_TRACK;

  return {
    position: [
      clampValue(midpointX * 0.46, -CAMERA_X_TRACK_LIMIT, CAMERA_X_TRACK_LIMIT),
      clampValue(
        CAMERA_MIN_HEIGHT + combinedSpread * 0.17 + maxHeight * 0.14,
        CAMERA_MIN_HEIGHT,
        CAMERA_MAX_HEIGHT,
      ),
      clampValue(
        CAMERA_MIN_DEPTH +
          combinedSpread * 0.31 +
          depthDrift * CAMERA_DEPTH_DRIFT_WEIGHT +
          trackedMidpointZ,
        CAMERA_MIN_DEPTH - CAMERA_POSITION_Z_LIMIT,
        CAMERA_MAX_DEPTH + CAMERA_POSITION_Z_LIMIT,
      ),
    ],
    target: [
      clampValue(midpointX, -CAMERA_X_TRACK_LIMIT, CAMERA_X_TRACK_LIMIT),
      clampValue(
        CAMERA_LOOK_HEIGHT_BASE + maxHeight * 0.34,
        CAMERA_LOOK_HEIGHT_BASE,
        5.65,
      ),
      clampValue(
        midpointZ * CAMERA_SPREAD_Z_WEIGHT,
        -CAMERA_TARGET_Z_LIMIT,
        CAMERA_TARGET_Z_LIMIT,
      ),
    ],
  };
}
