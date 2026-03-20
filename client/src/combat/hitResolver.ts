import type {
  CombatSocketId,
  FighterCombatState,
  HitResolution,
  HitboxDefinition,
  HurtboxDefinition,
  MoveDefinition,
} from "./types";
import { BASE_POSE, samplePoseForState, type SampledStickPose } from "../game/stickfigure/movePresentation";
import { Euler, Vector3 } from "three";

const KNOCKBACK_SCALE = 0.07;
export const DEFAULT_FIGHTER_HURTBOXES: HurtboxDefinition[] = [
  { id: "head", radius: 0.22, height: 0.28, offset: [0, 1.72, 0], priority: 4 },
  { id: "torso", radius: 0.34, height: 0.52, offset: [0, 1.08, 0], priority: 3 },
  { id: "lead-arm", radius: 0.2, height: 0.32, offset: [0.44, 1.02, 0], priority: 2 },
  { id: "rear-arm", radius: 0.2, height: 0.32, offset: [-0.44, 1.02, 0], priority: 2 },
  { id: "lead-leg", radius: 0.22, height: 0.42, offset: [0.2, 0.44, 0], priority: 1 },
  { id: "rear-leg", radius: 0.22, height: 0.42, offset: [-0.2, 0.44, 0], priority: 1 },
];
const SHOULDER_X = 0.44;
const ARM_ROOT_Y = 1.27;
const ARM_LENGTH = 0.78;
const HIP_X = 0.22;
const HIP_ROOT_Y = 0.58;
const LEG_LENGTH = 0.94;
const HEAD_LOCAL: [number, number, number] = [0, 1.76, 0];
const TORSO_LOCAL: [number, number, number] = [0, 1.08, 0];
const SOCKET_RESIDUAL_BLEND = 0.42;

type RigSocketMap = Record<CombatSocketId | "leftShoulder" | "rightShoulder" | "leftHip" | "rightHip", [number, number, number]>;

export type CombatHurtRegion = Omit<HurtboxDefinition, "offset"> & {
  offset: [number, number, number];
  world: [number, number, number];
};

export interface CombatSocketSample {
  id: CombatSocketId;
  world: [number, number, number];
}

export interface CombatHitboxSample {
  id: string;
  socket: CombatSocketId;
  world: [number, number, number];
  radius: number;
  height: number;
  frames: { start: number; end: number };
  damage: number;
  knockback: HitboxDefinition["knockback"];
  guard: HitboxDefinition["guard"];
  hitLag: number;
  launchAngleDeg: number;
  causesTrip?: boolean;
  active: boolean;
}

export interface CombatSpatialFrame {
  sockets: CombatSocketSample[];
  hurtboxes: CombatHurtRegion[];
  hitboxes: CombatHitboxSample[];
}

const NEUTRAL_RIG_SOCKETS = computeRigSockets(BASE_POSE);

export interface HitTestInput {
  attacker: FighterCombatState;
  defender: FighterCombatState;
  move: MoveDefinition;
  defenderMove?: MoveDefinition;
  defenderHurtboxes?: HurtboxDefinition[];
  defenderWeight?: number;
  defenderGravity?: number;
  scaledDamage?: number;
}

export function sampleCombatSpatialFrame(input: {
  fighter: FighterCombatState;
  move?: MoveDefinition;
  hurtboxes?: HurtboxDefinition[];
  time?: number;
}): CombatSpatialFrame {
  const sampledPose = samplePoseForState(
    {
      velocity: input.fighter.velocity,
      moveId: input.move?.id ?? input.fighter.moveId,
      moveFrame: input.fighter.moveFrame,
      hitstunFrames: input.fighter.hitstunFrames,
      blockstunFrames: input.fighter.blockstunFrames,
      landingLagFrames: (input.fighter as { landingLagFrames?: number }).landingLagFrames,
      isDodging: input.fighter.action === "dodge",
      isBlocking: input.fighter.action === "blockstun",
      inAir: input.fighter.inAir,
    },
    input.move?.totalFrames,
    input.time ?? 0,
  );
  const sockets = computeRigSockets(sampledPose);
  const hurtboxes = buildHurtRegions(input.fighter, sockets, input.hurtboxes);
  const hitboxes = (input.move?.hitboxes ?? []).map((hitbox) => {
    const socket = resolveHitboxSocket(hitbox, sockets);
    return {
      id: hitbox.id,
      socket,
      world: buildHitboxWorldPosition(hitbox, input.fighter, sockets),
      radius: hitbox.radius,
      height: hitbox.height,
      frames: hitbox.frames,
      damage: hitbox.damage,
      knockback: hitbox.knockback,
      guard: hitbox.guard,
      hitLag: hitbox.hitLag,
      launchAngleDeg: hitbox.launchAngleDeg,
      causesTrip: hitbox.causesTrip,
      active: frameInWindow(input.fighter.moveFrame ?? 0, hitbox.frames),
    } satisfies CombatHitboxSample;
  });

  return {
    sockets: (["head", "torso", "leftHand", "rightHand", "leftFoot", "rightFoot"] as const).map((id) => ({
      id,
      world: worldPosition(input.fighter.position, sockets[id], input.fighter.facing),
    })),
    hurtboxes,
    hitboxes,
  };
}

export function resolveHits(input: HitTestInput): HitResolution[] {
  if (!input.move.hitboxes.length) return [];

  const results: HitResolution[] = [];
  const damageScale = input.scaledDamage ?? 1;
  const activeFrame = input.attacker.moveFrame ?? 0;
  const attackerFrame = sampleCombatSpatialFrame({
    fighter: input.attacker,
    move: input.move,
  });
  const defenderFrame = sampleCombatSpatialFrame({
    fighter: input.defender,
    move: input.defenderMove,
    hurtboxes: input.defenderHurtboxes ?? input.defenderMove?.hurtboxes,
  });

  for (const hitbox of attackerFrame.hitboxes) {
    if (!hitbox.active || !frameInWindow(activeFrame, hitbox.frames)) continue;
    if (!isOverlap(hitbox, hitbox.world, defenderFrame.hurtboxes)) continue;
    const damage = hitbox.damage * damageScale;
    const knockbackMagnitude =
      (hitbox.knockback.base +
        hitbox.knockback.scaling * damage +
        (hitbox.knockback.weightMultiplier ?? 1) * (input.defenderWeight ?? 1)) *
      KNOCKBACK_SCALE;
    const radians = (hitbox.launchAngleDeg * Math.PI) / 180;

    const dir = input.attacker.facing;
    const vector: [number, number, number] = [
      Math.cos(radians) * knockbackMagnitude * dir,
      Math.sin(radians) * knockbackMagnitude,
      0,
    ];

    results.push({
      moveId: input.move.id,
      hitboxId: hitbox.id,
      damage,
      knockbackVector: vector,
      hitLag: hitbox.hitLag,
      causesTrip: Boolean(hitbox.causesTrip),
      guardDamage: hitbox.guard === "throw" ? damage : damage * 0.3,
      isCounterHit: input.defender.action === "attack",
      launchAngleDeg: hitbox.launchAngleDeg,
      attackerAction: input.attacker.action,
      defenderAction: input.defender.action,
    });
  }

  return results;
}

function isOverlap(
  hitbox: Pick<HitboxDefinition, "radius" | "height">,
  hitboxWorld: [number, number, number],
  defenderHurtboxes: CombatHurtRegion[],
): boolean {
  return defenderHurtboxes.some((hurtbox) => {
    const dx = hitboxWorld[0] - hurtbox.world[0];
    const dy = hitboxWorld[1] - hurtbox.world[1];
    const dz = hitboxWorld[2] - hurtbox.world[2];
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);
    const verticalOverlap = Math.abs(dy) <= hitbox.height + hurtbox.height;
    return horizontalDist <= hitbox.radius + hurtbox.radius && verticalOverlap;
  });
}

function buildHitboxWorldPosition(
  hitbox: HitboxDefinition,
  attacker: FighterCombatState,
  sockets: RigSocketMap,
): [number, number, number] {
  const anchorId = resolveHitboxSocket(hitbox, sockets);
  const anchor = sockets[anchorId];
  const neutralAnchor = NEUTRAL_RIG_SOCKETS[anchorId];
  const residual = scaleVec3(subtractVec3(hitbox.offset, neutralAnchor), SOCKET_RESIDUAL_BLEND);
  return worldPosition(attacker.position, addVec3(anchor, residual), attacker.facing);
}

function buildHurtRegions(
  defender: FighterCombatState,
  sockets: RigSocketMap,
  overrides?: HurtboxDefinition[],
): CombatHurtRegion[] {
  if (overrides?.length) {
    return overrides.map((hurtbox) => ({
      ...hurtbox,
      world: worldPosition(defender.position, hurtbox.offset, defender.facing),
    }));
  }

  const leftArmMid = midpoint(sockets.leftShoulder, sockets.leftHand);
  const rightArmMid = midpoint(sockets.rightShoulder, sockets.rightHand);
  const leftLegMid = midpoint(sockets.leftHip, sockets.leftFoot);
  const rightLegMid = midpoint(sockets.rightHip, sockets.rightFoot);
  const [leadArm, rearArm] = classifyLeadRear(defender.facing, leftArmMid, rightArmMid);
  const [leadLeg, rearLeg] = classifyLeadRear(defender.facing, leftLegMid, rightLegMid);

  return DEFAULT_FIGHTER_HURTBOXES.map((definition) => {
    const local =
      definition.id === "head"
        ? sockets.head
        : definition.id === "torso"
          ? sockets.torso
          : definition.id === "lead-arm"
            ? leadArm
            : definition.id === "rear-arm"
              ? rearArm
              : definition.id === "lead-leg"
                ? leadLeg
                : rearLeg;

    return {
      ...definition,
      offset: local,
      world: worldPosition(defender.position, local, defender.facing),
    };
  });
}

function selectClosestSocket(
  target: [number, number, number],
  sockets: RigSocketMap,
): CombatSocketId {
  const candidates: CombatSocketId[] = ["head", "torso", "leftHand", "rightHand", "leftFoot", "rightFoot"];
  let best = candidates[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  candidates.forEach((candidate) => {
    const distance = distanceSq(target, sockets[candidate]);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  });

  return best;
}

function resolveHitboxSocket(
  hitbox: HitboxDefinition,
  sockets: RigSocketMap,
): CombatSocketId {
  return hitbox.socket ?? selectClosestSocket(hitbox.offset, sockets);
}

function computeRigSockets(pose: SampledStickPose): RigSocketMap {
  const bodyEuler = new Euler(...pose.bodyRotation);
  const transformPoint = (point: [number, number, number]) =>
    addVec3(applyBody(scaleVec3Components(point, pose.bodyScale), bodyEuler), pose.rootOffset);
  const leftShoulder = transformPoint([SHOULDER_X, ARM_ROOT_Y, 0]);
  const rightShoulder = transformPoint([-SHOULDER_X, ARM_ROOT_Y, 0]);
  const leftHip = transformPoint([HIP_X, HIP_ROOT_Y, 0]);
  const rightHip = transformPoint([-HIP_X, HIP_ROOT_Y, 0]);
  const leftHand = transformPoint(
    addVec3([SHOULDER_X, ARM_ROOT_Y, 0], rotateLocal([0, -ARM_LENGTH, pose.leftArm.reach], pose.leftArm.rotation)),
  );
  const rightHand = transformPoint(
    addVec3([-SHOULDER_X, ARM_ROOT_Y, 0], rotateLocal([0, -ARM_LENGTH, pose.rightArm.reach], pose.rightArm.rotation)),
  );
  const leftFoot = transformPoint(
    addVec3([HIP_X, HIP_ROOT_Y, 0], rotateLocal([0, -LEG_LENGTH, pose.leftLeg.reach], pose.leftLeg.rotation)),
  );
  const rightFoot = transformPoint(
    addVec3([-HIP_X, HIP_ROOT_Y, 0], rotateLocal([0, -LEG_LENGTH, pose.rightLeg.reach], pose.rightLeg.rotation)),
  );

  return {
    head: transformPoint(HEAD_LOCAL),
    torso: transformPoint(TORSO_LOCAL),
    leftShoulder,
    rightShoulder,
    leftHip,
    rightHip,
    leftHand,
    rightHand,
    leftFoot,
    rightFoot,
  };
}

function worldPosition(
  base: [number, number, number],
  offset: [number, number, number],
  facing: 1 | -1,
): [number, number, number] {
  return [base[0] + offset[0] * facing, base[1] + offset[1], base[2] + offset[2]];
}

function frameInWindow(frame: number, window: { start: number; end: number }) {
  return frame >= window.start && frame <= window.end;
}

function rotateLocal(
  point: [number, number, number],
  rotation: [number, number, number],
): [number, number, number] {
  const vector = new Vector3(...point).applyEuler(new Euler(...rotation));
  return [vector.x, vector.y, vector.z];
}

function applyBody(
  point: [number, number, number],
  bodyEuler: Euler,
): [number, number, number] {
  const vector = new Vector3(...point).applyEuler(bodyEuler);
  return [vector.x, vector.y, vector.z];
}

function addVec3(
  a: [number, number, number],
  b: [number, number, number],
): [number, number, number] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subtractVec3(
  a: [number, number, number],
  b: [number, number, number],
): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scaleVec3(
  vector: [number, number, number],
  scalar: number,
): [number, number, number] {
  return [vector[0] * scalar, vector[1] * scalar, vector[2] * scalar];
}

function scaleVec3Components(
  vector: [number, number, number],
  scale: [number, number, number],
): [number, number, number] {
  return [vector[0] * scale[0], vector[1] * scale[1], vector[2] * scale[2]];
}

function midpoint(
  a: [number, number, number],
  b: [number, number, number],
): [number, number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

function distanceSq(
  a: [number, number, number],
  b: [number, number, number],
) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

function classifyLeadRear(
  facing: 1 | -1,
  first: [number, number, number],
  second: [number, number, number],
): [[number, number, number], [number, number, number]] {
  return first[0] * facing >= second[0] * facing ? [first, second] : [second, first];
}
