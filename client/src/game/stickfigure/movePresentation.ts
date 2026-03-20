import { coreMoves } from "../../combat/moves";
import type { CombatSocketId, MoveDefinition } from "../../combat/types";
import type { CharacterState } from "../../lib/stores/useFighting";

export type PresentationAttackStyle =
  | "punch"
  | "kick"
  | "special"
  | "air_attack"
  | "grab"
  | "dodge"
  | null;

export type PlantedFoot = "left" | "right" | null;

export interface LimbPresentation {
  rotation: [number, number, number];
  reach: number;
}

export interface SampledStickPose {
  lean: number;
  torsoLean: number;
  headLean: number;
  rootOffset: [number, number, number];
  bodyRotation: [number, number, number];
  bodyScale: [number, number, number];
  leftArm: LimbPresentation;
  rightArm: LimbPresentation;
  leftLeg: LimbPresentation;
  rightLeg: LimbPresentation;
  plantedFoot: PlantedFoot;
  attackStyle: PresentationAttackStyle;
  animationPhase: number;
  emphasis: number;
  smear: number;
  trailIntensity: number;
  lineWeight: number;
}

export interface PoseSampleState {
  velocity: [number, number, number];
  moveId?: string;
  moveFrame?: number;
  justLanded?: boolean;
  hitstunFrames?: number;
  blockstunFrames?: number;
  landingLagFrames?: number;
  isDodging?: boolean;
  isBlocking?: boolean;
  inAir?: boolean;
}

type PoseKeyframe = {
  at: number;
  pose: Partial<SampledStickPose>;
};

const limb = (
  rotation: [number, number, number],
  reach = 0,
): LimbPresentation => ({ rotation, reach });

export const BASE_POSE: SampledStickPose = {
  lean: 0,
  torsoLean: 0,
  headLean: 0,
  rootOffset: [0, 0, 0],
  bodyRotation: [0, 0, 0],
  bodyScale: [1, 1, 1],
  leftArm: limb([0.2, 0.05, 0.45]),
  rightArm: limb([-0.12, -0.04, -0.42]),
  leftLeg: limb([-0.16, 0, 0.08]),
  rightLeg: limb([0.22, 0, -0.08]),
  plantedFoot: "left",
  attackStyle: null,
  animationPhase: 0,
  emphasis: 0,
  smear: 0,
  trailIntensity: 0,
  lineWeight: 1,
};

const pose = (overrides: Partial<SampledStickPose>): SampledStickPose => ({
  ...BASE_POSE,
  ...overrides,
  leftArm: overrides.leftArm ?? BASE_POSE.leftArm,
  rightArm: overrides.rightArm ?? BASE_POSE.rightArm,
  leftLeg: overrides.leftLeg ?? BASE_POSE.leftLeg,
  rightLeg: overrides.rightLeg ?? BASE_POSE.rightLeg,
});

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const lerpVec3 = (
  from: [number, number, number],
  to: [number, number, number],
  t: number,
): [number, number, number] => [
  lerp(from[0], to[0], t),
  lerp(from[1], to[1], t),
  lerp(from[2], to[2], t),
];

const lerpLimb = (from: LimbPresentation, to: LimbPresentation, t: number): LimbPresentation => ({
  rotation: lerpVec3(from.rotation, to.rotation, t),
  reach: lerp(from.reach, to.reach, t),
});

const lerpPose = (
  from: SampledStickPose,
  to: SampledStickPose,
  t: number,
): SampledStickPose => ({
  lean: lerp(from.lean, to.lean, t),
  torsoLean: lerp(from.torsoLean, to.torsoLean, t),
  headLean: lerp(from.headLean, to.headLean, t),
  rootOffset: lerpVec3(from.rootOffset, to.rootOffset, t),
  bodyRotation: lerpVec3(from.bodyRotation, to.bodyRotation, t),
  bodyScale: lerpVec3(from.bodyScale, to.bodyScale, t),
  leftArm: lerpLimb(from.leftArm, to.leftArm, t),
  rightArm: lerpLimb(from.rightArm, to.rightArm, t),
  leftLeg: lerpLimb(from.leftLeg, to.leftLeg, t),
  rightLeg: lerpLimb(from.rightLeg, to.rightLeg, t),
  plantedFoot: t < 0.5 ? from.plantedFoot : to.plantedFoot,
  attackStyle: t < 0.5 ? from.attackStyle : to.attackStyle,
  animationPhase: lerp(from.animationPhase, to.animationPhase, t),
  emphasis: lerp(from.emphasis, to.emphasis, t),
  smear: lerp(from.smear, to.smear, t),
  trailIntensity: lerp(from.trailIntensity, to.trailIntensity, t),
  lineWeight: lerp(from.lineWeight, to.lineWeight, t),
});

export const sampleClip = (frames: PoseKeyframe[], progress: number): SampledStickPose => {
  const clamped = Math.max(0, Math.min(1, progress));
  if (clamped <= frames[0].at) {
    return pose(frames[0].pose);
  }
  for (let index = 0; index < frames.length - 1; index += 1) {
    const current = frames[index];
    const next = frames[index + 1];
    if (clamped >= current.at && clamped <= next.at) {
      const span = next.at - current.at || 1;
      return lerpPose(
        pose(current.pose),
        pose(next.pose),
        (clamped - current.at) / span,
      );
    }
  }
  return pose(frames[frames.length - 1].pose);
};

const MOVE_ALIASES: Record<string, string> = {
  lightJab: "hero_jab_1",
  lightJab2: "vill_jab_triple",
  launcher: "hero_launcher",
  guardBreak: "vill_guard_break_big",
  parryCounter: "hero_counter_light",
  hero_jab_1: "hero_jab_1",
  vill_jab_triple: "vill_jab_triple",
  hero_tilt_side: "hero_tilt_side",
  hero_sweep: "hero_sweep",
  vill_low_stab: "vill_low_stab",
  hero_launcher: "hero_launcher",
  hero_smash_side: "hero_smash_side",
  vill_guard_break_big: "vill_guard_break_big",
  hero_air_neutral: "hero_air_neutral",
  hero_air_forward: "hero_air_forward",
  hero_air_down_spike: "hero_air_down_spike",
  diveKick: "hero_air_down_spike",
  hero_neutral_proj: "hero_neutral_proj",
  vill_dive_explosion: "vill_dive_explosion",
  hero_dash_strike: "hero_dash_strike",
  vill_sidestep_strike: "vill_sidestep_strike",
  hero_rising_recovery: "hero_rising_recovery",
  hero_counter_light: "hero_counter_light",
  vill_poison_orb: "vill_poison_orb",
  vill_teleport_recover: "vill_teleport_recover",
  vill_trap: "vill_trap",
  parry: "parry",
  dodge: "dodge",
};

const MOVE_CLIPS: Record<string, PoseKeyframe[]> = {
  hero_jab_1: [
    { at: 0, pose: { lean: -0.14, torsoLean: -0.2, rootOffset: [-0.04, -0.02, 0], bodyScale: [1.04, 0.9, 1], bodyRotation: [0, 0, 0.04], rightArm: limb([-0.52, 0.06, -0.96]), leftArm: limb([0.24, 0.04, 0.54]), leftLeg: limb([-0.24, 0, 0.08]), rightLeg: limb([0.26, 0, -0.14]), plantedFoot: "left", lineWeight: 1.1 } },
    { at: 0.18, pose: { lean: -0.28, torsoLean: -0.36, headLean: 0.04, rootOffset: [-0.1, -0.06, 0], bodyScale: [1.08, 0.8, 1], bodyRotation: [0, 0, 0.18], rightArm: limb([-0.94, 0.08, -1.36]), leftArm: limb([0.44, 0.06, 0.84]), leftLeg: limb([-0.32, 0, 0.1]), rightLeg: limb([0.46, 0, -0.24]), plantedFoot: "left", lineWeight: 1.18 } },
    { at: 0.34, pose: { lean: 0.24, torsoLean: 0.3, headLean: -0.08, rootOffset: [0.14, 0.04, 0], bodyScale: [0.96, 1.1, 1], bodyRotation: [0, 0, -0.18], rightArm: limb([0.18, 0.02, -1.94], 0.42), leftArm: limb([-0.08, 0, 0.14]), leftLeg: limb([0.02, 0, 0.02]), rightLeg: limb([-0.1, 0, -0.04]), emphasis: 1, attackStyle: "punch", smear: 0.98, trailIntensity: 0.72, animationPhase: 0.4, lineWeight: 1.56 } },
    { at: 0.52, pose: { lean: 0.1, torsoLean: 0.12, rootOffset: [0.05, 0.01, 0], bodyRotation: [0, 0, -0.08], rightArm: limb([0.22, 0, -1.22], 0.18), leftArm: limb([0.04, 0.02, 0.28]), attackStyle: "punch", animationPhase: 0.62, emphasis: 0.34, smear: 0.12, trailIntensity: 0.16, lineWeight: 1.2 } },
    { at: 1, pose: BASE_POSE },
  ],
  vill_jab_triple: [
    { at: 0, pose: { lean: -0.12, torsoLean: -0.14, rootOffset: [-0.04, 0, 0], leftArm: limb([0.18, 0.04, 0.54]), rightArm: limb([-0.34, 0.06, -0.92]), rightLeg: limb([0.24, 0, -0.12]), plantedFoot: "left", lineWeight: 1.08 } },
    { at: 0.22, pose: { lean: 0.06, torsoLean: 0.12, rootOffset: [0.03, 0, 0], rightArm: limb([0.16, 0, -1.26], 0.16), leftArm: limb([0.04, 0, 0.3]), attackStyle: "punch", animationPhase: 0.24, emphasis: 0.46, smear: 0.42, trailIntensity: 0.28, lineWeight: 1.18 } },
    { at: 0.52, pose: { lean: -0.08, torsoLean: -0.1, rootOffset: [-0.02, 0, 0], rightArm: limb([-0.22, 0.04, -1.02]), leftArm: limb([0.1, 0.02, 0.46]), attackStyle: "punch", animationPhase: 0.52, emphasis: 0.54, smear: 0.5, trailIntensity: 0.34, lineWeight: 1.22 } },
    { at: 0.76, pose: { lean: 0.12, torsoLean: 0.16, rootOffset: [0.05, 0, 0], bodyRotation: [0, 0, -0.06], rightArm: limb([0.14, 0, -1.56], 0.22), leftArm: limb([0.02, 0, 0.18]), attackStyle: "punch", animationPhase: 0.78, emphasis: 0.78, smear: 0.86, trailIntensity: 0.48, lineWeight: 1.34 } },
    { at: 1, pose: BASE_POSE },
  ],
  hero_tilt_side: [
    { at: 0, pose: { lean: -0.26, torsoLean: -0.34, rootOffset: [-0.08, -0.01, 0], bodyScale: [1.06, 0.9, 1], bodyRotation: [0, 0, 0.12], rightArm: limb([-0.92, 0.16, -1.32]), leftArm: limb([0.36, 0.06, 0.72]), rightLeg: limb([0.42, 0, -0.22]), leftLeg: limb([-0.24, 0, 0.1]), plantedFoot: "left", lineWeight: 1.16 } },
    { at: 0.22, pose: { lean: -0.38, torsoLean: -0.48, headLean: 0.06, rootOffset: [-0.16, -0.06, 0], bodyScale: [1.1, 0.78, 1], bodyRotation: [0, 0, 0.28], rightArm: limb([-1.16, 0.18, -1.68]), leftArm: limb([0.54, 0.08, 0.98]), rightLeg: limb([0.56, 0, -0.28]), leftLeg: limb([-0.32, 0, 0.12]), plantedFoot: "left", lineWeight: 1.24 } },
    { at: 0.42, pose: { lean: 0.34, torsoLean: 0.3, headLean: -0.1, rootOffset: [0.12, 0.04, 0], bodyRotation: [0, 0, -0.24], bodyScale: [0.96, 1.12, 1], rightArm: limb([0.1, 0.02, -1.94], 0.46), leftArm: limb([-0.08, 0, 0.12]), rightLeg: limb([-0.2, 0, 0.12]), leftLeg: limb([0.06, 0, 0]), attackStyle: "special", animationPhase: 0.42, emphasis: 1, smear: 0.98, trailIntensity: 0.84, lineWeight: 1.56 } },
    { at: 0.62, pose: { lean: 0.14, torsoLean: 0.14, rootOffset: [0.04, 0.01, 0], bodyRotation: [0, 0, -0.1], rightArm: limb([0.22, 0, -1.38], 0.22), leftArm: limb([0.02, 0, 0.22]), attackStyle: "special", animationPhase: 0.64, emphasis: 0.4, smear: 0.14, trailIntensity: 0.2, lineWeight: 1.24 } },
    { at: 1, pose: BASE_POSE },
  ],
  hero_sweep: [
    { at: 0, pose: { lean: -0.24, torsoLean: -0.28, bodyScale: [1.04, 0.9, 1], leftArm: limb([0.32, 0.04, 0.9]), rightArm: limb([-0.28, -0.02, -0.68]), leftLeg: limb([-0.4, 0, 0.16]), rightLeg: limb([0.24, 0, -0.2]), plantedFoot: "left", lineWeight: 1.16 } },
    { at: 0.46, pose: { lean: 0.1, torsoLean: 0.12, bodyRotation: [0, 0, 0.1], leftArm: limb([0.18, 0.02, 0.36]), rightArm: limb([0.06, 0, -0.34]), leftLeg: limb([-0.08, 0, 0.04]), rightLeg: limb([0.88, 0, -0.84], 0.28), plantedFoot: "left", attackStyle: "kick", animationPhase: 0.5, emphasis: 0.88, smear: 0.94, trailIntensity: 0.62, lineWeight: 1.42 } },
    { at: 0.78, pose: { lean: 0.04, torsoLean: 0.06, bodyRotation: [0, 0, 0.04], rightLeg: limb([0.38, 0, -0.38], 0.1), attackStyle: "kick", animationPhase: 0.8, emphasis: 0.34, lineWeight: 1.18 } },
    { at: 1, pose: BASE_POSE },
  ],
  vill_low_stab: [
    { at: 0, pose: { lean: -0.2, torsoLean: -0.26, bodyScale: [1.02, 0.92, 1], leftArm: limb([0.18, 0.04, 0.7]), rightArm: limb([-0.5, 0.08, -1.08]), leftLeg: limb([-0.32, 0, 0.14]), rightLeg: limb([0.38, 0, -0.22]), plantedFoot: "left", lineWeight: 1.14 } },
    { at: 0.48, pose: { lean: 0.14, torsoLean: 0.12, rootOffset: [0.06, -0.04, 0], bodyRotation: [0, 0, -0.08], leftArm: limb([0.04, 0, 0.24]), rightArm: limb([0.08, 0, -1.74], 0.26), leftLeg: limb([-0.08, 0, 0.02]), rightLeg: limb([0.04, 0, -0.06]), attackStyle: "special", animationPhase: 0.5, emphasis: 0.84, smear: 0.88, trailIntensity: 0.58, lineWeight: 1.36 } },
    { at: 0.8, pose: { lean: 0.04, torsoLean: 0.02, rootOffset: [0.02, -0.02, 0], rightArm: limb([0.12, 0, -1.18], 0.1), attackStyle: "special", animationPhase: 0.82, emphasis: 0.32, lineWeight: 1.16 } },
    { at: 1, pose: BASE_POSE },
  ],
  hero_launcher: [
    { at: 0, pose: { lean: -0.28, torsoLean: -0.4, bodyScale: [1.08, 0.86, 1], rootOffset: [-0.06, -0.06, 0], bodyRotation: [0, 0, 0.1], leftArm: limb([0.34, 0.08, 0.9]), rightArm: limb([-0.7, 0.12, -1.18]), leftLeg: limb([-0.58, 0, 0.24]), rightLeg: limb([0.68, 0, -0.24]), plantedFoot: "left", lineWeight: 1.24 } },
    { at: 0.2, pose: { lean: -0.34, torsoLean: -0.5, headLean: 0.08, bodyScale: [1.1, 0.76, 1], rootOffset: [-0.08, -0.1, 0], bodyRotation: [0, 0, 0.22], leftArm: limb([0.46, 0.1, 1.12]), rightArm: limb([-0.88, 0.16, -1.42]), leftLeg: limb([-0.66, 0, 0.28]), rightLeg: limb([0.8, 0, -0.28]), plantedFoot: "left", lineWeight: 1.28 } },
    { at: 0.4, pose: { lean: 0.18, torsoLean: 0.26, headLean: -0.08, bodyScale: [0.94, 1.24, 1], rootOffset: [0.04, 0.26, 0], bodyRotation: [0, 0, 0.32], leftArm: limb([1.12, 0.18, 1.42], 0.28), rightArm: limb([0.74, 0.04, -1.72], 0.36), leftLeg: limb([-0.04, 0, 0]), rightLeg: limb([0.12, 0, -0.04]), attackStyle: "special", animationPhase: 0.4, emphasis: 1, smear: 0.9, trailIntensity: 0.86, lineWeight: 1.56 } },
    { at: 0.62, pose: { lean: 0.12, torsoLean: 0.12, rootOffset: [0.01, 0.14, 0], bodyRotation: [0, 0, 0.14], rightArm: limb([0.36, 0, -1.22], 0.16), leftArm: limb([0.48, 0.08, 0.72]), attackStyle: "special", animationPhase: 0.64, emphasis: 0.4, smear: 0.12, trailIntensity: 0.24, lineWeight: 1.22 } },
    { at: 1, pose: BASE_POSE },
  ],
  hero_smash_side: [
    { at: 0, pose: { lean: -0.22, torsoLean: -0.3, bodyScale: [1.08, 0.88, 1], rightArm: limb([-0.9, 0.12, -1.24]), leftArm: limb([0.36, 0.08, 0.86]), leftLeg: limb([-0.36, 0, 0.16]), rightLeg: limb([0.52, 0, -0.2]), plantedFoot: "left", lineWeight: 1.22 } },
    { at: 0.58, pose: { lean: 0.28, torsoLean: 0.24, bodyScale: [0.98, 1.12, 1], rightArm: limb([0.12, 0, -1.84], 0.46), leftArm: limb([-0.06, 0, 0.18]), leftLeg: limb([-0.1, 0, 0.02]), rightLeg: limb([0.12, 0, -0.04]), attackStyle: "special", animationPhase: 0.58, emphasis: 1, smear: 1, trailIntensity: 0.76, lineWeight: 1.48 } },
    { at: 0.82, pose: { lean: 0.1, torsoLean: 0.08, bodyRotation: [0, 0, -0.06], rightArm: limb([0.2, 0, -1.4], 0.24), attackStyle: "special", animationPhase: 0.82, emphasis: 0.42, lineWeight: 1.22 } },
    { at: 1, pose: BASE_POSE },
  ],
  hero_air_neutral: [
    { at: 0, pose: { lean: 0, torsoLean: -0.02, rootOffset: [0, 0.08, 0], leftArm: limb([-0.08, 0.04, 0.98]), rightArm: limb([0.08, -0.04, -0.98]), leftLeg: limb([0.26, 0, 0.48]), rightLeg: limb([-0.26, 0, -0.48]), attackStyle: "air_attack", lineWeight: 1.12 } },
    { at: 0.5, pose: { lean: 0.04, torsoLean: 0.06, leftArm: limb([0.24, 0.04, 1.28], 0.12), rightArm: limb([0.22, -0.04, -1.28], 0.12), leftLeg: limb([0.08, 0, 0.22]), rightLeg: limb([-0.08, 0, -0.22]), attackStyle: "air_attack", animationPhase: 0.52, emphasis: 0.72, smear: 0.64, trailIntensity: 0.5, lineWeight: 1.28 } },
    { at: 1, pose: { ...BASE_POSE, rootOffset: [0, 0.06, 0], attackStyle: "air_attack" } },
  ],
  hero_air_forward: [
    { at: 0, pose: { lean: -0.18, torsoLean: -0.24, rootOffset: [0, 0.14, 0], bodyScale: [1.04, 0.92, 1], bodyRotation: [0, 0, 0.06], rightArm: limb([-0.62, 0.1, -1.3]), leftArm: limb([0.28, 0.04, 0.9]), leftLeg: limb([0.28, 0, 0.46]), rightLeg: limb([-0.46, 0, -0.58]), attackStyle: "air_attack", lineWeight: 1.2 } },
    { at: 0.18, pose: { lean: -0.3, torsoLean: -0.36, headLean: 0.06, rootOffset: [0.02, 0.16, 0], bodyScale: [1.08, 0.84, 1], bodyRotation: [0, 0, 0.18], rightArm: limb([-0.86, 0.12, -1.58]), leftArm: limb([0.46, 0.06, 1.02]), leftLeg: limb([0.42, 0, 0.38]), rightLeg: limb([-0.62, 0, -0.72]), attackStyle: "air_attack", lineWeight: 1.26 } },
    { at: 0.38, pose: { lean: 0.3, torsoLean: 0.26, headLean: -0.1, rootOffset: [0.12, 0.04, 0], bodyScale: [0.96, 1.1, 1], bodyRotation: [0, 0, -0.18], rightArm: limb([0.16, 0.02, -1.98], 0.42), leftArm: limb([-0.1, 0, 0.08]), leftLeg: limb([0.04, 0, 0.02]), rightLeg: limb([-0.12, 0, -0.08]), attackStyle: "special", animationPhase: 0.38, emphasis: 1, smear: 1, trailIntensity: 0.88, lineWeight: 1.54 } },
    { at: 0.62, pose: { lean: 0.12, torsoLean: 0.1, rootOffset: [0.05, 0.04, 0], bodyRotation: [0, 0, -0.08], rightArm: limb([0.24, 0, -1.32], 0.18), leftArm: limb([0.04, 0, 0.2]), attackStyle: "air_attack", animationPhase: 0.64, emphasis: 0.34, smear: 0.14, trailIntensity: 0.18, lineWeight: 1.22 } },
    { at: 1, pose: { ...BASE_POSE, rootOffset: [0, 0.06, 0] } },
  ],
  hero_air_down_spike: [
    { at: 0, pose: { lean: -0.04, torsoLean: -0.2, rootOffset: [0, 0.12, 0], bodyScale: [1.02, 0.94, 1], leftArm: limb([-0.18, 0.06, 0.84]), rightArm: limb([0.18, -0.06, -0.84]), leftLeg: limb([0.36, 0, 0.68]), rightLeg: limb([-0.34, 0, -0.68]), attackStyle: "air_attack", lineWeight: 1.16 } },
    { at: 0.48, pose: { lean: 0, torsoLean: 0.18, rootOffset: [0, -0.04, 0], bodyRotation: [0, 0, 0.08], leftArm: limb([0.28, 0.02, 0.3]), rightArm: limb([0.32, -0.02, -0.32]), leftLeg: limb([1.18, 0, 0.12], 0.22), rightLeg: limb([1.04, 0, -0.12], 0.2), attackStyle: "air_attack", animationPhase: 0.48, emphasis: 0.96, smear: 1, trailIntensity: 0.72, lineWeight: 1.46 } },
    { at: 0.78, pose: { lean: 0.02, torsoLean: 0.08, bodyRotation: [0, 0, 0.04], leftLeg: limb([0.72, 0, 0.12], 0.12), rightLeg: limb([0.66, 0, -0.12], 0.1), attackStyle: "air_attack", animationPhase: 0.8, emphasis: 0.38, lineWeight: 1.2 } },
    { at: 1, pose: { ...BASE_POSE, rootOffset: [0, 0.06, 0] } },
  ],
  hero_neutral_proj: [
    { at: 0, pose: { lean: -0.14, torsoLean: -0.18, bodyScale: [1.03, 0.92, 1], leftArm: limb([0.22, 0.04, 0.74]), rightArm: limb([-0.2, -0.04, -0.74]), leftLeg: limb([-0.18, 0, 0.08]), rightLeg: limb([0.28, 0, -0.1]), plantedFoot: "left", lineWeight: 1.12 } },
    { at: 0.44, pose: { lean: 0.04, torsoLean: 0.08, bodyScale: [0.98, 1.06, 1], rootOffset: [0.03, 0.02, 0], leftArm: limb([0.62, 0.04, 1.14], 0.14), rightArm: limb([0.56, -0.04, -1.14], 0.14), attackStyle: "special", animationPhase: 0.48, emphasis: 0.82, smear: 0.74, trailIntensity: 0.64, lineWeight: 1.34 } },
    { at: 0.74, pose: { lean: 0.02, torsoLean: 0.04, leftArm: limb([0.28, 0.02, 0.72], 0.06), rightArm: limb([0.24, -0.02, -0.72], 0.06), attackStyle: "special", animationPhase: 0.78, emphasis: 0.34, lineWeight: 1.18 } },
    { at: 1, pose: BASE_POSE },
  ],
  hero_dash_strike: [
    { at: 0, pose: { lean: -0.22, torsoLean: -0.24, rootOffset: [-0.08, 0, 0], bodyRotation: [0, 0, -0.08], leftArm: limb([0.18, 0.04, 0.58]), rightArm: limb([-0.62, 0.08, -1.2]), leftLeg: limb([-0.18, 0, 0.08]), rightLeg: limb([0.54, 0, -0.28]), plantedFoot: "left", lineWeight: 1.18 } },
    { at: 0.4, pose: { lean: 0.26, torsoLean: 0.2, rootOffset: [0.16, 0, 0], bodyRotation: [0, 0, -0.14], rightArm: limb([0.04, 0, -1.82], 0.34), leftArm: limb([0.02, 0, 0.2]), leftLeg: limb([-0.06, 0, 0.02]), rightLeg: limb([0.1, 0, -0.06]), plantedFoot: "right", attackStyle: "special", animationPhase: 0.42, emphasis: 0.94, smear: 0.96, trailIntensity: 0.8, lineWeight: 1.46 } },
    { at: 0.78, pose: { lean: 0.08, torsoLean: 0.06, rootOffset: [0.06, 0, 0], rightArm: limb([0.18, 0, -1.26], 0.16), attackStyle: "special", animationPhase: 0.8, emphasis: 0.36, lineWeight: 1.2 } },
    { at: 1, pose: BASE_POSE },
  ],
  hero_rising_recovery: [
    { at: 0, pose: { lean: -0.12, torsoLean: -0.26, bodyScale: [1.04, 0.88, 1], rootOffset: [0, -0.04, 0], leftArm: limb([0.24, 0.06, 0.84]), rightArm: limb([-0.36, 0.04, -0.92]), leftLeg: limb([-0.5, 0, 0.14]), rightLeg: limb([0.54, 0, -0.14]), lineWeight: 1.18 } },
    { at: 0.38, pose: { lean: 0.02, torsoLean: 0.16, bodyScale: [0.96, 1.1, 1], rootOffset: [0, 0.18, 0], bodyRotation: [0, 0, 0.16], leftArm: limb([0.82, 0.08, 1.18], 0.16), rightArm: limb([0.78, 0, -1.5], 0.26), leftLeg: limb([0.02, 0, 0.04]), rightLeg: limb([0.12, 0, -0.04]), attackStyle: "special", animationPhase: 0.42, emphasis: 0.92, smear: 0.9, trailIntensity: 0.7, lineWeight: 1.42 } },
    { at: 0.72, pose: { lean: 0.04, torsoLean: 0.08, rootOffset: [0, 0.14, 0], rightArm: limb([0.34, 0, -1.02], 0.08), attackStyle: "special", animationPhase: 0.74, emphasis: 0.34, lineWeight: 1.18 } },
    { at: 1, pose: { ...BASE_POSE, rootOffset: [0, 0.08, 0] } },
  ],
  hero_counter_light: [
    { at: 0, pose: { lean: -0.08, torsoLean: -0.14, bodyScale: [0.98, 0.96, 1], leftArm: limb([0.4, 0.04, 0.92]), rightArm: limb([-0.42, -0.04, -0.92]), leftLeg: limb([-0.18, 0, 0.08]), rightLeg: limb([0.18, 0, -0.08]), attackStyle: "grab", lineWeight: 1.1 } },
    { at: 0.32, pose: { lean: 0, torsoLean: 0.02, bodyScale: [0.94, 1.04, 1], leftArm: limb([0.62, 0.02, 1.1], 0.08), rightArm: limb([0.68, -0.02, -1.2], 0.1), attackStyle: "grab", animationPhase: 0.34, emphasis: 0.58, smear: 0.34, lineWeight: 1.24 } },
    { at: 0.58, pose: { lean: 0.1, torsoLean: 0.12, bodyRotation: [0, 0, -0.08], rightArm: limb([0.1, 0, -1.52], 0.24), leftArm: limb([-0.04, 0, 0.22]), attackStyle: "special", animationPhase: 0.6, emphasis: 0.86, smear: 0.88, trailIntensity: 0.54, lineWeight: 1.34 } },
    { at: 1, pose: BASE_POSE },
  ],
  vill_guard_break_big: [
    { at: 0, pose: { lean: -0.38, torsoLean: -0.46, rootOffset: [-0.12, -0.04, 0], bodyScale: [1.14, 0.82, 1], bodyRotation: [0, 0, 0.08], rightArm: limb([-1.28, 0.14, -1.64]), leftArm: limb([0.62, 0.08, 1.22]), leftLeg: limb([-0.42, 0, 0.2]), rightLeg: limb([0.84, 0, -0.34]), plantedFoot: "left", attackStyle: "special", lineWeight: 1.3 } },
    { at: 0.22, pose: { lean: -0.5, torsoLean: -0.62, headLean: 0.08, rootOffset: [-0.2, -0.1, 0], bodyScale: [1.18, 0.7, 1], bodyRotation: [0, 0, 0.28], rightArm: limb([-1.46, 0.16, -1.94]), leftArm: limb([0.82, 0.12, 1.42]), leftLeg: limb([-0.54, 0, 0.24]), rightLeg: limb([1.02, 0, -0.42]), plantedFoot: "left", attackStyle: "special", lineWeight: 1.38 } },
    { at: 0.46, pose: { lean: 0.44, torsoLean: 0.4, headLean: -0.1, rootOffset: [0.18, 0.06, 0], bodyScale: [0.94, 1.2, 1], bodyRotation: [0, 0, -0.24], rightArm: limb([0.06, 0, -2.16], 0.62), leftArm: limb([-0.18, 0, -0.04]), rightLeg: limb([-0.04, 0, 0.02]), attackStyle: "special", animationPhase: 0.46, emphasis: 1, smear: 1, trailIntensity: 0.96, lineWeight: 1.62 } },
    { at: 0.7, pose: { lean: 0.14, torsoLean: 0.12, rootOffset: [0.06, 0.02, 0], bodyRotation: [0, 0, -0.12], rightArm: limb([0.18, 0, -1.5], 0.28), leftArm: limb([0.08, 0.02, 0.18]), attackStyle: "special", animationPhase: 0.72, emphasis: 0.42, smear: 0.16, trailIntensity: 0.24, lineWeight: 1.26 } },
    { at: 1, pose: BASE_POSE },
  ],
  vill_poison_orb: [
    { at: 0, pose: { lean: -0.1, torsoLean: -0.16, bodyScale: [1.02, 0.94, 1], leftArm: limb([0.24, 0.04, 0.62]), rightArm: limb([-0.28, -0.04, -0.76]), leftLeg: limb([-0.16, 0, 0.06]), rightLeg: limb([0.24, 0, -0.08]), lineWeight: 1.1 } },
    { at: 0.42, pose: { lean: 0.04, torsoLean: 0.08, bodyScale: [0.98, 1.06, 1], rootOffset: [0.02, 0.03, 0], leftArm: limb([0.22, 0.02, 0.44]), rightArm: limb([0.48, -0.04, -1.08], 0.18), attackStyle: "special", animationPhase: 0.44, emphasis: 0.76, smear: 0.62, trailIntensity: 0.68, lineWeight: 1.3 } },
    { at: 0.78, pose: { lean: 0.02, torsoLean: 0.04, rightArm: limb([0.18, -0.02, -0.74], 0.08), attackStyle: "special", animationPhase: 0.8, emphasis: 0.3, lineWeight: 1.16 } },
    { at: 1, pose: BASE_POSE },
  ],
  vill_sidestep_strike: [
    { at: 0, pose: { lean: -0.14, torsoLean: -0.18, rootOffset: [-0.06, 0, 0], bodyRotation: [0, 0, -0.08], rightArm: limb([-0.46, 0.08, -1.18]), leftArm: limb([0.22, 0.04, 0.64]), leftLeg: limb([-0.18, 0, 0.08]), rightLeg: limb([0.42, 0, -0.18]), attackStyle: "dodge", lineWeight: 1.12 } },
    { at: 0.38, pose: { lean: 0.18, torsoLean: 0.14, rootOffset: [0.08, 0, 0], bodyRotation: [0, 0, 0.12], rightArm: limb([0.12, 0, -1.62], 0.28), leftArm: limb([0.04, 0, 0.24]), rightLeg: limb([0.08, 0, -0.06]), attackStyle: "special", animationPhase: 0.42, emphasis: 0.82, smear: 0.88, trailIntensity: 0.66, lineWeight: 1.34 } },
    { at: 0.74, pose: { lean: 0.04, torsoLean: 0.04, rootOffset: [0.03, 0, 0], rightArm: limb([0.22, 0, -1.12], 0.12), attackStyle: "special", animationPhase: 0.76, emphasis: 0.32, lineWeight: 1.16 } },
    { at: 1, pose: BASE_POSE },
  ],
  vill_dive_explosion: [
    { at: 0, pose: { lean: -0.06, torsoLean: -0.22, rootOffset: [0, 0.12, 0], bodyScale: [1.04, 0.92, 1], leftArm: limb([-0.24, 0.06, 0.92]), rightArm: limb([0.18, -0.06, -0.92]), leftLeg: limb([0.42, 0, 0.82]), rightLeg: limb([-0.38, 0, -0.82]), attackStyle: "air_attack", lineWeight: 1.18 } },
    { at: 0.46, pose: { lean: 0.02, torsoLean: 0.2, rootOffset: [0, -0.06, 0], bodyScale: [0.96, 1.04, 1], bodyRotation: [0, 0, 0.12], leftArm: limb([0.42, 0.02, 0.22]), rightArm: limb([0.46, -0.02, -0.22]), leftLeg: limb([1.08, 0, 0.28], 0.16), rightLeg: limb([0.94, 0, -0.28], 0.16), attackStyle: "special", animationPhase: 0.48, emphasis: 1, smear: 1, trailIntensity: 0.82, lineWeight: 1.5 } },
    { at: 0.8, pose: { lean: 0.04, torsoLean: 0.08, leftLeg: limb([0.58, 0, 0.18], 0.08), rightLeg: limb([0.54, 0, -0.18], 0.08), attackStyle: "air_attack", animationPhase: 0.82, emphasis: 0.34, lineWeight: 1.22 } },
    { at: 1, pose: { ...BASE_POSE, rootOffset: [0, 0.05, 0] } },
  ],
  vill_teleport_recover: [
    { at: 0, pose: { lean: -0.1, torsoLean: -0.18, bodyScale: [0.96, 0.92, 1], rootOffset: [0, -0.06, 0], leftArm: limb([0.16, 0.04, 0.74]), rightArm: limb([-0.24, -0.04, -0.74]), leftLeg: limb([-0.32, 0, 0.1]), rightLeg: limb([0.38, 0, -0.1]), lineWeight: 1.1 } },
    { at: 0.28, pose: { lean: 0, torsoLean: 0.04, bodyScale: [0.82, 1.14, 1], rootOffset: [0, 0.08, 0], leftArm: limb([0.58, 0.06, 0.96], 0.08), rightArm: limb([0.54, -0.06, -1.04], 0.1), attackStyle: "special", animationPhase: 0.3, emphasis: 0.72, smear: 0.78, trailIntensity: 0.76, lineWeight: 1.34 } },
    { at: 0.62, pose: { lean: 0.04, torsoLean: 0.16, bodyScale: [0.94, 1.08, 1], rootOffset: [0, 0.18, 0], bodyRotation: [0, 0, 0.14], leftArm: limb([0.74, 0.08, 1.1], 0.14), rightArm: limb([0.62, 0, -1.34], 0.2), attackStyle: "special", animationPhase: 0.64, emphasis: 0.94, smear: 0.9, trailIntensity: 0.82, lineWeight: 1.44 } },
    { at: 1, pose: { ...BASE_POSE, rootOffset: [0, 0.08, 0] } },
  ],
  vill_trap: [
    { at: 0, pose: { lean: -0.22, torsoLean: -0.24, bodyScale: [1.04, 0.9, 1], leftArm: limb([0.3, 0.04, 0.86]), rightArm: limb([-0.18, -0.02, -0.54]), leftLeg: limb([-0.38, 0, 0.14]), rightLeg: limb([0.26, 0, -0.16]), lineWeight: 1.14 } },
    { at: 0.4, pose: { lean: 0.02, torsoLean: 0.04, rootOffset: [0.04, -0.06, 0], leftArm: limb([0.18, 0.02, 0.32]), rightArm: limb([0.32, 0, -0.98], 0.16), leftLeg: limb([-0.08, 0, 0.04]), rightLeg: limb([0.08, 0, -0.04]), attackStyle: "special", animationPhase: 0.42, emphasis: 0.7, smear: 0.56, trailIntensity: 0.52, lineWeight: 1.26 } },
    { at: 0.72, pose: { lean: 0.06, torsoLean: 0.08, rootOffset: [0.03, -0.02, 0], rightArm: limb([0.18, 0, -0.66], 0.08), attackStyle: "special", animationPhase: 0.74, emphasis: 0.28, lineWeight: 1.14 } },
    { at: 1, pose: BASE_POSE },
  ],
  block: [
    { at: 0, pose: { lean: -0.18, torsoLean: -0.24, headLean: 0.04, rootOffset: [-0.04, 0, 0], bodyScale: [1.04, 0.9, 1], leftArm: limb([1, 0.04, 1.12], 0.08), rightArm: limb([0.98, -0.04, -1.12], 0.08), leftLeg: limb([-0.3, 0, 0.1]), rightLeg: limb([0.38, 0, -0.12]), lineWeight: 1.22, emphasis: 0.34 } },
    { at: 0.38, pose: { lean: -0.06, torsoLean: 0.02, rootOffset: [0.01, 0, 0], bodyScale: [0.96, 1.02, 1], leftArm: limb([0.54, 0.02, 0.72], 0.04), rightArm: limb([0.58, -0.02, -0.72], 0.04), lineWeight: 1.14, emphasis: 0.16 } },
    { at: 1, pose: { ...BASE_POSE, lean: -0.02, torsoLean: 0 } },
  ],
  parry: [
    { at: 0, pose: { lean: -0.2, torsoLean: -0.28, headLean: 0.04, bodyScale: [1.02, 0.88, 1], rootOffset: [-0.03, -0.01, 0], leftArm: limb([0.7, 0.04, 1.02], 0.08), rightArm: limb([0.68, -0.04, -1.02], 0.08), leftLeg: limb([-0.24, 0, 0.1]), rightLeg: limb([0.3, 0, -0.1]), attackStyle: "grab", lineWeight: 1.18 } },
    { at: 0.14, pose: { lean: -0.04, torsoLean: 0.16, headLean: -0.06, bodyScale: [0.88, 1.16, 1], rootOffset: [0.02, 0.03, 0], bodyRotation: [0, 0, -0.26], leftArm: limb([1.18, 0.02, 1.4], 0.16), rightArm: limb([1.2, -0.02, -1.4], 0.16), attackStyle: "grab", animationPhase: 0.18, emphasis: 1, smear: 0.28, trailIntensity: 0.46, lineWeight: 1.52 } },
    { at: 0.34, pose: { lean: 0.02, torsoLean: 0.08, bodyRotation: [0, 0, -0.12], leftArm: limb([0.48, 0.02, 0.6]), rightArm: limb([0.54, -0.02, -0.6]), attackStyle: "grab", animationPhase: 0.38, emphasis: 0.34, smear: 0.06, trailIntensity: 0.08, lineWeight: 1.18 } },
    { at: 1, pose: BASE_POSE },
  ],
  dodge: [
    { at: 0, pose: { lean: -0.28, torsoLean: -0.34, rootOffset: [-0.14, -0.02, 0], bodyScale: [1.06, 0.86, 1], bodyRotation: [0, 0, 0.1], leftArm: limb([0.5, 0.04, 1.04]), rightArm: limb([-0.46, -0.04, -1.04]), leftLeg: limb([0.44, 0, 0.6]), rightLeg: limb([0.24, 0, -0.32]), attackStyle: "dodge", lineWeight: 1.2 } },
    { at: 0.24, pose: { lean: -0.12, torsoLean: -0.04, rootOffset: [0.08, -0.01, 0], bodyScale: [0.84, 1, 1], bodyRotation: [0, 0, -0.2], leftArm: limb([0.12, 0, 0.2]), rightArm: limb([0.1, 0, -0.2]), leftLeg: limb([0.02, 0, 0.02]), rightLeg: limb([-0.04, 0, -0.02]), attackStyle: "dodge", animationPhase: 0.26, emphasis: 0.58, smear: 0.18, trailIntensity: 0.94, lineWeight: 1.34 } },
    { at: 0.56, pose: { lean: 0.04, torsoLean: 0.1, rootOffset: [0.2, 0.01, 0], bodyScale: [0.92, 1.04, 1], bodyRotation: [0, 0, -0.08], leftArm: limb([0.04, 0, 0.12]), rightArm: limb([0.04, 0, -0.12]), attackStyle: "dodge", animationPhase: 0.58, emphasis: 0.34, smear: 0.04, trailIntensity: 0.28, lineWeight: 1.16 } },
    { at: 0.78, pose: { lean: 0.02, torsoLean: 0.02, rootOffset: [0.08, 0, 0], attackStyle: "dodge", animationPhase: 0.8, emphasis: 0.14, lineWeight: 1.08 } },
    { at: 1, pose: BASE_POSE },
  ],
  landing: [
    { at: 0, pose: { lean: 0, torsoLean: 0.34, headLean: -0.06, rootOffset: [0, -0.08, 0], bodyScale: [1.1, 0.76, 1], bodyRotation: [0, 0, 0.04], leftArm: limb([0.24, 0.04, 0.68]), rightArm: limb([0.24, -0.04, -0.68]), leftLeg: limb([-0.62, 0, 0.12]), rightLeg: limb([-0.62, 0, -0.12]), lineWeight: 1.34, emphasis: 0.78, smear: 0.08, trailIntensity: 0.18 } },
    { at: 0.26, pose: { lean: 0.06, torsoLean: 0.12, headLean: 0.02, rootOffset: [0, 0.06, 0], bodyScale: [0.96, 1.12, 1], bodyRotation: [0, 0, -0.04], leftArm: limb([0.06, 0.02, 0.22]), rightArm: limb([0.06, -0.02, -0.22]), leftLeg: limb([-0.16, 0, 0.04]), rightLeg: limb([-0.1, 0, -0.04]), lineWeight: 1.2, emphasis: 0.32 } },
    { at: 0.6, pose: { lean: 0.02, torsoLean: 0.04, rootOffset: [0, 0.01, 0], bodyScale: [0.99, 1.02, 1], leftArm: limb([0.08, 0.02, 0.26]), rightArm: limb([0.08, -0.02, -0.26]), leftLeg: limb([-0.18, 0, 0.04]), rightLeg: limb([-0.12, 0, -0.04]), lineWeight: 1.1, emphasis: 0.14 } },
    { at: 1, pose: BASE_POSE },
  ],
  hitstun: [
    { at: 0, pose: { lean: -0.3, torsoLean: -0.36, headLean: 0.06, rootOffset: [-0.1, 0.06, 0], bodyRotation: [0, 0, -0.24], bodyScale: [1.06, 0.9, 1], leftArm: limb([1.02, 0.08, 1.38]), rightArm: limb([1.18, -0.08, -1.38]), leftLeg: limb([0.7, 0, 0.32]), rightLeg: limb([0.48, 0, -0.28]), lineWeight: 1.3 } },
    { at: 0.28, pose: { lean: -0.18, torsoLean: -0.2, rootOffset: [-0.06, 0.03, 0], bodyRotation: [0, 0, -0.14], bodyScale: [1.02, 0.96, 1], leftArm: limb([0.62, 0.06, 0.82]), rightArm: limb([0.76, -0.06, -0.82]), lineWeight: 1.22 } },
    { at: 0.62, pose: { lean: -0.08, torsoLean: -0.1, rootOffset: [-0.03, 0.01, 0], bodyRotation: [0, 0, -0.08], leftArm: limb([0.38, 0.04, 0.52]), rightArm: limb([0.48, -0.04, -0.52]), lineWeight: 1.14 } },
    { at: 1, pose: { ...BASE_POSE, lean: -0.04, torsoLean: -0.06 } },
  ],
  blockstun: [
    { at: 0, pose: { lean: -0.22, torsoLean: -0.3, headLean: 0.04, rootOffset: [-0.06, -0.01, 0], bodyScale: [1.04, 0.86, 1], leftArm: limb([0.98, 0.04, 1.12], 0.08), rightArm: limb([0.96, -0.04, -1.12], 0.08), leftLeg: limb([-0.34, 0, 0.1]), rightLeg: limb([0.4, 0, -0.12]), lineWeight: 1.26, emphasis: 0.46 } },
    { at: 0.3, pose: { lean: -0.1, torsoLean: -0.06, rootOffset: [-0.01, 0, 0], bodyScale: [0.98, 0.98, 1], leftArm: limb([0.66, 0.02, 0.82], 0.06), rightArm: limb([0.7, -0.02, -0.82], 0.06), lineWeight: 1.18, emphasis: 0.22 } },
    { at: 0.58, pose: { lean: -0.04, torsoLean: 0.02, rootOffset: [0.01, 0, 0], bodyScale: [0.96, 1.02, 1], leftArm: limb([0.4, 0.02, 0.52]), rightArm: limb([0.44, -0.02, -0.52]), lineWeight: 1.12, emphasis: 0.12 } },
    { at: 1, pose: { ...BASE_POSE, lean: -0.02, torsoLean: 0 } },
  ],
};

export const PRESENTATION_CLIP_IDS = new Set<string>(Object.keys(MOVE_CLIPS));

export const resolvePresentationMoveId = (moveId?: string): string | undefined =>
  moveId ? MOVE_ALIASES[moveId] ?? moveId : undefined;

const sampleIdlePose = (time: number): SampledStickPose => {
  const breath = Math.sin(time * 1.4);
  const settle = Math.sin(time * 0.7 + 0.8);
  const sway = breath * 0.08;
  const compression = Math.max(0, -breath);
  const release = Math.max(0, breath);
  return {
    ...BASE_POSE,
    lean: sway,
    torsoLean: sway * 1.1,
    headLean: -sway * 0.2 + settle * 0.03,
    rootOffset: [sway * 0.03, release * 0.01 - compression * 0.03, 0],
    bodyScale: [1.02 + compression * 0.04, 0.98 - compression * 0.1 + release * 0.04, 1],
    bodyRotation: [0, 0, sway * 0.16],
    leftArm: limb([0.22 + sway * 0.22 - compression * 0.04, 0.03, 0.48 + sway * 0.24]),
    rightArm: limb([-0.16 - sway * 0.2 + compression * 0.04, -0.03, -0.48 - sway * 0.24]),
    leftLeg: limb([-0.2 + release * 0.04, 0, 0.08]),
    rightLeg: limb([0.24 - release * 0.04, 0, -0.08]),
    plantedFoot: "left",
    emphasis: release * 0.12,
    lineWeight: 1.04 + release * 0.06,
  };
};

const sampleRunPose = (time: number, speedRatio: number): SampledStickPose => {
  const cycle = time * (4 + speedRatio * 5);
  const stride = Math.sin(cycle);
  const counterStride = Math.sin(cycle + Math.PI);
  const drive = Math.sin(cycle + Math.PI / 2);
  const compression = Math.max(0, -drive);
  const release = Math.max(0, drive);
  const lean = 0.18 + speedRatio * 0.18 + release * 0.04;
  return {
    ...BASE_POSE,
    lean,
    torsoLean: lean * 1.08,
    headLean: -lean * 0.24 + stride * 0.04,
    rootOffset: [stride * 0.05, release * 0.02 - compression * 0.06, 0],
    bodyRotation: [0, 0, -stride * 0.08],
    bodyScale: [1.02 + compression * 0.04, 0.96 - compression * 0.08 + release * 0.1, 1],
    leftArm: limb([-0.24 + counterStride * 0.62, 0.04, 0.76 + counterStride * 0.26]),
    rightArm: limb([0.08 + stride * 0.66, -0.04, -0.76 - stride * 0.26]),
    leftLeg: limb([-0.18 + stride * 0.88, 0, 0.12], Math.max(0, stride * 0.14)),
    rightLeg: limb([-0.06 + counterStride * 0.88, 0, -0.12], Math.max(0, counterStride * 0.14)),
    plantedFoot: stride > 0 ? "right" : "left",
    emphasis: Math.min(1, speedRatio * 0.72 + release * 0.22),
    trailIntensity: Math.max(0, speedRatio - 0.2) * (0.5 + release * 0.5),
    lineWeight: 1.08 + speedRatio * 0.14 + release * 0.08,
  };
};

const sampleAirPose = (snapshot: PoseSampleState, time: number): SampledStickPose => {
  const vy = snapshot.velocity[1];
  const drift = Math.sin(time * 2.2) * 0.06;
  if (vy >= 0) {
    return {
      ...BASE_POSE,
      lean: -0.1 + drift * 0.2,
      torsoLean: -0.24,
      headLean: 0.04,
      rootOffset: [drift * 0.02, 0.14, 0],
      bodyScale: [1.04, 0.9, 1],
      bodyRotation: [0, 0, drift * 0.1],
      leftArm: limb([-0.42, 0.06, 0.98]),
      rightArm: limb([-0.38, -0.06, -0.98]),
      leftLeg: limb([0.86, 0, 0.34]),
      rightLeg: limb([0.74, 0, -0.34]),
      attackStyle: null,
      emphasis: 0.18,
      lineWeight: 1.16,
    };
  }
  return {
    ...BASE_POSE,
    lean: drift * 0.36,
    torsoLean: 0.28,
    headLean: -0.04,
    rootOffset: [drift * 0.02, 0, 0],
    bodyScale: [0.96, 1.08, 1],
    bodyRotation: [0, 0, -drift * 0.12],
    leftArm: limb([0.42, 0.04, 0.48]),
    rightArm: limb([0.36, -0.04, -0.48]),
    leftLeg: limb([0.98, 0, 0.2]),
    rightLeg: limb([0.92, 0, -0.2]),
    lineWeight: 1.18,
  };
};

export const samplePoseForState = (
  snapshot: PoseSampleState,
  moveTotalFrames: number | undefined,
  time: number,
): SampledStickPose => {
  const horizontalSpeed = Math.hypot(snapshot.velocity[0], snapshot.velocity[2]);
  const speedRatio = Math.max(0, Math.min(1, horizontalSpeed / 6));
  const moveId = resolvePresentationMoveId(snapshot.moveId);

  if (snapshot.hitstunFrames && snapshot.hitstunFrames > 0) {
    const phase = Math.min(1, 1 - snapshot.hitstunFrames / (snapshot.hitstunFrames + 16));
    return sampleClip(MOVE_CLIPS.hitstun, phase);
  }

  if (snapshot.blockstunFrames && snapshot.blockstunFrames > 0) {
    const phase = Math.min(1, 1 - snapshot.blockstunFrames / (snapshot.blockstunFrames + 10));
    return sampleClip(MOVE_CLIPS.blockstun, phase);
  }

  if (snapshot.justLanded || (snapshot.landingLagFrames ?? 0) > 0) {
    const landingFrames = Math.max(0, snapshot.landingLagFrames ?? 0);
    const phase =
      landingFrames > 0
        ? Math.min(1, 1 - landingFrames / (landingFrames + 10))
        : 0.04;
    return sampleClip(MOVE_CLIPS.landing, phase);
  }

  if (moveId && MOVE_CLIPS[moveId] && moveTotalFrames) {
    const totalFrames = Math.max(1, moveTotalFrames);
    return sampleClip(MOVE_CLIPS[moveId], (snapshot.moveFrame ?? 0) / totalFrames);
  }

  if (snapshot.isDodging) {
    return sampleClip(MOVE_CLIPS.dodge, Math.min(1, (snapshot.moveFrame ?? 0) / 20));
  }

  if (snapshot.isBlocking) {
    return sampleClip(MOVE_CLIPS.block, 0.12);
  }

  if (snapshot.inAir) {
    return sampleAirPose(snapshot, time);
  }

  if (speedRatio > 0.16) {
    return sampleRunPose(time, speedRatio);
  }

  return sampleIdlePose(time);
};

export const sampleStickFigurePose = (
  snapshot: CharacterState,
  time: number,
): SampledStickPose => {
  const moveDef = snapshot.moveId ? coreMoves[snapshot.moveId] : undefined;
  return samplePoseForState(snapshot, moveDef?.totalFrames, time);
};

export type SlicePresentationId =
  | "idle"
  | "run"
  | "jump"
  | "fall"
  | "land"
  | "dodge"
  | "block"
  | "parry"
  | "hitstun"
  | "hero_jab_1"
  | "hero_tilt_side"
  | "hero_launcher"
  | "hero_air_forward"
  | "vill_guard_break_big";

export interface SlicePresentationProfile {
  id: SlicePresentationId;
  trailSockets: CombatSocketId[];
  guardSockets: CombatSocketId[];
  landingSockets: CombatSocketId[];
  hurtSocket: CombatSocketId;
  trailWidth: number;
  trailHeight: number;
  trailOpacity: number;
  contactWidth: number;
  contactHeight: number;
  contactRotation: number;
  blockRotation: number;
  parryRotation: number;
}

const BASE_SLICE_PROFILE: SlicePresentationProfile = {
  id: "idle",
  trailSockets: ["torso", "rightHand"],
  guardSockets: ["leftHand", "rightHand"],
  landingSockets: ["leftFoot", "rightFoot"],
  hurtSocket: "torso",
  trailWidth: 0.42,
  trailHeight: 0.16,
  trailOpacity: 0.2,
  contactWidth: 0.26,
  contactHeight: 0.14,
  contactRotation: 0.18,
  blockRotation: -0.28,
  parryRotation: 0.56,
};

const SLICE_PROFILES: Record<SlicePresentationId, SlicePresentationProfile> = {
  idle: {
    ...BASE_SLICE_PROFILE,
    id: "idle",
    trailSockets: ["torso", "rightHand"],
    hurtSocket: "torso",
    trailWidth: 0.32,
    trailHeight: 0.1,
    trailOpacity: 0.12,
    contactWidth: 0.24,
    contactHeight: 0.12,
  },
  run: {
    ...BASE_SLICE_PROFILE,
    id: "run",
    trailSockets: ["torso", "rightFoot"],
    hurtSocket: "torso",
    trailWidth: 0.48,
    trailHeight: 0.14,
    trailOpacity: 0.18,
    contactWidth: 0.28,
    contactHeight: 0.12,
  },
  jump: {
    ...BASE_SLICE_PROFILE,
    id: "jump",
    trailSockets: ["torso", "rightFoot"],
    hurtSocket: "torso",
    trailWidth: 0.34,
    trailHeight: 0.12,
    trailOpacity: 0.14,
    contactWidth: 0.24,
    contactHeight: 0.12,
  },
  fall: {
    ...BASE_SLICE_PROFILE,
    id: "fall",
    trailSockets: ["torso", "leftFoot"],
    hurtSocket: "torso",
    trailWidth: 0.34,
    trailHeight: 0.12,
    trailOpacity: 0.14,
    contactWidth: 0.24,
    contactHeight: 0.12,
  },
  land: {
    ...BASE_SLICE_PROFILE,
    id: "land",
    trailSockets: ["leftFoot", "rightFoot"],
    hurtSocket: "torso",
    trailWidth: 0.44,
    trailHeight: 0.16,
    trailOpacity: 0.18,
    contactWidth: 0.3,
    contactHeight: 0.16,
  },
  dodge: {
    ...BASE_SLICE_PROFILE,
    id: "dodge",
    trailSockets: ["torso", "rightFoot"],
    hurtSocket: "torso",
    trailWidth: 0.54,
    trailHeight: 0.18,
    trailOpacity: 0.24,
    contactWidth: 0.28,
    contactHeight: 0.14,
    contactRotation: 0.34,
  },
  block: {
    ...BASE_SLICE_PROFILE,
    id: "block",
    trailSockets: ["leftHand", "rightHand"],
    hurtSocket: "torso",
    trailWidth: 0.38,
    trailHeight: 0.14,
    trailOpacity: 0.16,
    contactWidth: 0.3,
    contactHeight: 0.12,
    blockRotation: -0.36,
  },
  parry: {
    ...BASE_SLICE_PROFILE,
    id: "parry",
    trailSockets: ["leftHand", "rightHand"],
    hurtSocket: "torso",
    trailWidth: 0.4,
    trailHeight: 0.16,
    trailOpacity: 0.18,
    contactWidth: 0.24,
    contactHeight: 0.3,
    parryRotation: 0.7,
  },
  hitstun: {
    ...BASE_SLICE_PROFILE,
    id: "hitstun",
    trailSockets: ["torso", "head"],
    hurtSocket: "head",
    trailWidth: 0.36,
    trailHeight: 0.14,
    trailOpacity: 0.16,
    contactWidth: 0.34,
    contactHeight: 0.18,
    contactRotation: 0.46,
  },
  hero_jab_1: {
    ...BASE_SLICE_PROFILE,
    id: "hero_jab_1",
    trailSockets: ["torso", "rightHand"],
    hurtSocket: "torso",
    trailWidth: 0.48,
    trailHeight: 0.16,
    trailOpacity: 0.22,
    contactWidth: 0.24,
    contactHeight: 0.12,
    contactRotation: 0.16,
  },
  hero_tilt_side: {
    ...BASE_SLICE_PROFILE,
    id: "hero_tilt_side",
    trailSockets: ["torso", "rightHand"],
    hurtSocket: "torso",
    trailWidth: 0.62,
    trailHeight: 0.18,
    trailOpacity: 0.24,
    contactWidth: 0.3,
    contactHeight: 0.14,
    contactRotation: 0.2,
  },
  hero_launcher: {
    ...BASE_SLICE_PROFILE,
    id: "hero_launcher",
    trailSockets: ["rightHand", "head"],
    hurtSocket: "head",
    trailWidth: 0.58,
    trailHeight: 0.2,
    trailOpacity: 0.24,
    contactWidth: 0.28,
    contactHeight: 0.2,
    contactRotation: 0.34,
  },
  hero_air_forward: {
    ...BASE_SLICE_PROFILE,
    id: "hero_air_forward",
    trailSockets: ["torso", "rightHand"],
    hurtSocket: "torso",
    trailWidth: 0.58,
    trailHeight: 0.2,
    trailOpacity: 0.24,
    contactWidth: 0.28,
    contactHeight: 0.16,
    contactRotation: 0.2,
  },
  vill_guard_break_big: {
    ...BASE_SLICE_PROFILE,
    id: "vill_guard_break_big",
    trailSockets: ["torso", "rightHand"],
    hurtSocket: "torso",
    trailWidth: 0.72,
    trailHeight: 0.24,
    trailOpacity: 0.28,
    contactWidth: 0.36,
    contactHeight: 0.2,
    contactRotation: 0.24,
    blockRotation: -0.42,
  },
};

const SLICE_MOVE_IDS = new Set<SlicePresentationId>([
  "hero_jab_1",
  "hero_tilt_side",
  "hero_launcher",
  "hero_air_forward",
  "vill_guard_break_big",
]);

export const resolveSlicePresentationId = (
  snapshot: Pick<
    PoseSampleState,
    | "velocity"
    | "moveId"
    | "justLanded"
    | "hitstunFrames"
    | "blockstunFrames"
    | "landingLagFrames"
    | "isDodging"
    | "isBlocking"
    | "inAir"
  >,
  move?: MoveDefinition,
  justParried = false,
): SlicePresentationId => {
  const moveId = resolvePresentationMoveId(move?.id ?? snapshot.moveId);
  if (moveId && SLICE_MOVE_IDS.has(moveId as SlicePresentationId)) {
    return moveId as SlicePresentationId;
  }
  if ((snapshot.hitstunFrames ?? 0) > 0) {
    return "hitstun";
  }
  if (justParried || moveId === "parry") {
    return "parry";
  }
  if (snapshot.isDodging || moveId === "dodge") {
    return "dodge";
  }
  if ((snapshot.blockstunFrames ?? 0) > 0 || snapshot.isBlocking) {
    return "block";
  }
  if (snapshot.justLanded || (snapshot.landingLagFrames ?? 0) > 0) {
    return "land";
  }
  if (snapshot.inAir) {
    return snapshot.velocity[1] >= 0 ? "jump" : "fall";
  }
  return Math.hypot(snapshot.velocity[0], snapshot.velocity[2]) > 0.16 ? "run" : "idle";
};

export const resolveSlicePresentationProfile = (
  snapshot: Pick<
    PoseSampleState,
    | "velocity"
    | "moveId"
    | "justLanded"
    | "hitstunFrames"
    | "blockstunFrames"
    | "landingLagFrames"
    | "isDodging"
    | "isBlocking"
    | "inAir"
  >,
  move?: MoveDefinition,
  justParried = false,
): SlicePresentationProfile =>
  SLICE_PROFILES[resolveSlicePresentationId(snapshot, move, justParried)];
