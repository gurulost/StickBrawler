import { coreMoves } from "../../combat/moves";
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
    { at: 0, pose: { lean: -0.08, torsoLean: -0.12, rightArm: limb([-0.42, 0.05, -0.84]), rightLeg: limb([0.18, 0, -0.12]), plantedFoot: "left", lineWeight: 1.08 } },
    { at: 0.32, pose: { lean: 0.12, torsoLean: 0.18, rightArm: limb([0.12, 0, -1.44], 0.26), leftArm: limb([0.06, 0.02, 0.42]), rightLeg: limb([0.08, 0, -0.04]), emphasis: 0.72, attackStyle: "punch", smear: 0.85, trailIntensity: 0.5, animationPhase: 0.38, lineWeight: 1.32 } },
    { at: 0.56, pose: { lean: 0.06, torsoLean: 0.08, rightArm: limb([0.18, 0, -1.12], 0.18), attackStyle: "punch", animationPhase: 0.62, emphasis: 0.4, lineWeight: 1.18 } },
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
    { at: 0, pose: { lean: -0.16, torsoLean: -0.2, rightArm: limb([-0.6, 0.12, -1.12]), leftArm: limb([0.22, 0.04, 0.56]), rightLeg: limb([0.28, 0, -0.14]), plantedFoot: "left", lineWeight: 1.1 } },
    { at: 0.45, pose: { lean: 0.24, torsoLean: 0.22, bodyRotation: [0, 0, -0.1], rightArm: limb([0.1, 0.02, -1.68], 0.34), leftArm: limb([0.08, 0, 0.3]), rightLeg: limb([-0.06, 0, 0.06]), attackStyle: "kick", animationPhase: 0.46, emphasis: 0.86, smear: 0.92, trailIntensity: 0.62, lineWeight: 1.4 } },
    { at: 0.74, pose: { lean: 0.12, torsoLean: 0.12, rightArm: limb([0.2, 0, -1.36], 0.18), attackStyle: "kick", animationPhase: 0.72, emphasis: 0.42, lineWeight: 1.2 } },
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
    { at: 0, pose: { lean: -0.18, torsoLean: -0.28, bodyScale: [1.04, 0.9, 1], leftArm: limb([0.26, 0.06, 0.72]), rightArm: limb([-0.4, 0.08, -0.94]), leftLeg: limb([-0.44, 0, 0.18]), rightLeg: limb([0.5, 0, -0.18]), plantedFoot: "left", lineWeight: 1.18 } },
    { at: 0.42, pose: { lean: 0.08, torsoLean: 0.12, bodyScale: [0.98, 1.08, 1], rootOffset: [0, 0.04, 0], bodyRotation: [0, 0, 0.14], leftArm: limb([0.6, 0.12, 1.12], 0.16), rightArm: limb([0.42, 0.02, -1.48], 0.24), leftLeg: limb([-0.12, 0, 0.04]), rightLeg: limb([0.22, 0, -0.08]), attackStyle: "special", animationPhase: 0.44, emphasis: 0.9, smear: 0.88, trailIntensity: 0.58, lineWeight: 1.36 } },
    { at: 0.74, pose: { lean: 0.04, torsoLean: 0.04, rootOffset: [0, 0.06, 0], rightArm: limb([0.22, 0, -1.02], 0.1), attackStyle: "special", animationPhase: 0.76, emphasis: 0.36, lineWeight: 1.16 } },
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
    { at: 0, pose: { lean: -0.08, torsoLean: -0.12, rootOffset: [0, 0.1, 0], rightArm: limb([-0.44, 0.08, -1.12]), leftArm: limb([0.18, 0.04, 0.74]), leftLeg: limb([0.16, 0, 0.34]), rightLeg: limb([-0.3, 0, -0.42]), attackStyle: "air_attack", lineWeight: 1.14 } },
    { at: 0.42, pose: { lean: 0.18, torsoLean: 0.16, rootOffset: [0.04, 0.08, 0], bodyRotation: [0, 0, -0.06], rightArm: limb([0.18, 0.02, -1.72], 0.34), leftArm: limb([0.04, 0, 0.26]), leftLeg: limb([0.04, 0, 0.12]), rightLeg: limb([-0.08, 0, -0.08]), attackStyle: "air_attack", animationPhase: 0.42, emphasis: 0.82, smear: 0.94, trailIntensity: 0.68, lineWeight: 1.38 } },
    { at: 0.72, pose: { lean: 0.08, torsoLean: 0.06, rightArm: limb([0.2, 0, -1.22], 0.14), attackStyle: "air_attack", animationPhase: 0.74, emphasis: 0.34, lineWeight: 1.18 } },
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
    { at: 0, pose: { lean: -0.28, torsoLean: -0.34, bodyScale: [1.1, 0.86, 1], rightArm: limb([-1, 0.12, -1.36]), leftArm: limb([0.48, 0.08, 1.02]), leftLeg: limb([-0.3, 0, 0.14]), rightLeg: limb([0.64, 0, -0.24]), plantedFoot: "left", attackStyle: "special", lineWeight: 1.24 } },
    { at: 0.62, pose: { lean: 0.32, torsoLean: 0.28, bodyScale: [0.96, 1.16, 1], bodyRotation: [0, 0, -0.12], rightArm: limb([0.08, 0, -1.94], 0.52), leftArm: limb([-0.08, 0, 0.1]), rightLeg: limb([0.04, 0, -0.02]), attackStyle: "special", animationPhase: 0.62, emphasis: 1, smear: 1, trailIntensity: 0.82, lineWeight: 1.52 } },
    { at: 0.86, pose: { lean: 0.1, torsoLean: 0.1, rightArm: limb([0.16, 0, -1.48], 0.28), attackStyle: "special", animationPhase: 0.86, emphasis: 0.42, lineWeight: 1.24 } },
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
  parry: [
    { at: 0, pose: { lean: -0.06, torsoLean: -0.1, leftArm: limb([0.44, 0.04, 0.74]), rightArm: limb([-0.34, -0.04, -0.74]), leftLeg: limb([-0.18, 0, 0.06]), rightLeg: limb([0.18, 0, -0.06]), attackStyle: "grab", lineWeight: 1.1 } },
    { at: 0.36, pose: { lean: 0, torsoLean: 0.06, bodyScale: [0.96, 1.08, 1], leftArm: limb([0.9, 0.02, 1.16], 0.08), rightArm: limb([0.9, -0.02, -1.16], 0.08), attackStyle: "grab", animationPhase: 0.4, emphasis: 0.7, smear: 0.46, lineWeight: 1.28 } },
    { at: 1, pose: BASE_POSE },
  ],
  dodge: [
    { at: 0, pose: { lean: -0.2, torsoLean: -0.22, rootOffset: [-0.08, 0, 0], bodyScale: [1.02, 0.92, 1], leftArm: limb([0.38, 0.04, 0.9]), rightArm: limb([-0.38, -0.04, -0.9]), leftLeg: limb([0.32, 0, 0.46]), rightLeg: limb([0.18, 0, -0.24]), attackStyle: "dodge", lineWeight: 1.16 } },
    { at: 0.5, pose: { lean: 0, torsoLean: 0.04, rootOffset: [0.14, 0, 0], bodyScale: [0.92, 0.98, 1], leftArm: limb([0.12, 0, 0.34]), rightArm: limb([0.12, 0, -0.34]), leftLeg: limb([0.14, 0, 0.12]), rightLeg: limb([-0.04, 0, -0.12]), attackStyle: "dodge", animationPhase: 0.52, emphasis: 0.58, trailIntensity: 0.72, lineWeight: 1.22 } },
    { at: 1, pose: BASE_POSE },
  ],
  landing: [
    { at: 0, pose: { lean: 0, torsoLean: 0.24, bodyScale: [1.06, 0.88, 1], leftArm: limb([0.12, 0.04, 0.48]), rightArm: limb([0.12, -0.04, -0.48]), leftLeg: limb([-0.44, 0, 0.08]), rightLeg: limb([-0.44, 0, -0.08]), lineWeight: 1.26, emphasis: 0.54 } },
    { at: 1, pose: BASE_POSE },
  ],
  hitstun: [
    { at: 0, pose: { lean: -0.18, torsoLean: -0.22, rootOffset: [-0.06, 0.02, 0], bodyRotation: [0, 0, -0.14], leftArm: limb([0.84, 0.08, 1.18]), rightArm: limb([0.96, -0.08, -1.18]), leftLeg: limb([0.54, 0, 0.24]), rightLeg: limb([0.38, 0, -0.2]), lineWeight: 1.22 } },
    { at: 1, pose: { ...BASE_POSE, lean: -0.04, torsoLean: -0.06 } },
  ],
};

export const PRESENTATION_CLIP_IDS = new Set<string>(Object.keys(MOVE_CLIPS));

export const resolvePresentationMoveId = (moveId?: string): string | undefined =>
  moveId ? MOVE_ALIASES[moveId] ?? moveId : undefined;

const sampleIdlePose = (time: number): SampledStickPose => {
  const sway = Math.sin(time * 1.8) * 0.08;
  const headLag = Math.sin(time * 1.2) * 0.04;
  return {
    ...BASE_POSE,
    lean: sway,
    torsoLean: sway * 0.8,
    headLean: headLag,
    leftArm: limb([0.18 + sway * 0.2, 0.03, 0.42 + sway * 0.2]),
    rightArm: limb([-0.12 - sway * 0.15, -0.03, -0.42 - sway * 0.2]),
    leftLeg: limb([-0.16, 0, 0.06]),
    rightLeg: limb([0.22, 0, -0.06]),
    plantedFoot: "left",
    lineWeight: 1.02,
  };
};

const sampleRunPose = (time: number, speedRatio: number): SampledStickPose => {
  const cycle = time * (4 + speedRatio * 5);
  const stride = Math.sin(cycle);
  const counterStride = Math.sin(cycle + Math.PI);
  const lean = 0.16 + speedRatio * 0.12;
  return {
    ...BASE_POSE,
    lean,
    torsoLean: lean * 0.9,
    headLean: -lean * 0.2,
    leftArm: limb([-0.18 + counterStride * 0.48, 0.02, 0.62 + counterStride * 0.18]),
    rightArm: limb([0.04 + stride * 0.52, -0.02, -0.62 - stride * 0.18]),
    leftLeg: limb([-0.1 + stride * 0.68, 0, 0.1], Math.max(0, stride * 0.08)),
    rightLeg: limb([-0.02 + counterStride * 0.68, 0, -0.1], Math.max(0, counterStride * 0.08)),
    plantedFoot: stride > 0 ? "right" : "left",
    emphasis: Math.min(1, speedRatio),
    trailIntensity: Math.max(0, speedRatio - 0.25),
    lineWeight: 1.06 + speedRatio * 0.12,
  };
};

const sampleAirPose = (snapshot: PoseSampleState, time: number): SampledStickPose => {
  const vy = snapshot.velocity[1];
  if (vy >= 0) {
    return {
      ...BASE_POSE,
      lean: 0.04,
      torsoLean: -0.08,
      rootOffset: [0, 0.08, 0],
      leftArm: limb([-0.22, 0.04, 0.64]),
      rightArm: limb([-0.18, -0.04, -0.64]),
      leftLeg: limb([0.5, 0, 0.24]),
      rightLeg: limb([0.42, 0, -0.24]),
      attackStyle: null,
      lineWeight: 1.08,
    };
  }
  const drift = Math.sin(time * 2.2) * 0.06;
  return {
    ...BASE_POSE,
    lean: drift,
    torsoLean: 0.12,
    rootOffset: [0, 0.04, 0],
    leftArm: limb([0.18, 0.04, 0.46]),
    rightArm: limb([0.12, -0.04, -0.46]),
    leftLeg: limb([0.62, 0, 0.18]),
    rightLeg: limb([0.56, 0, -0.18]),
    lineWeight: 1.1,
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

  if (moveId && MOVE_CLIPS[moveId] && moveTotalFrames) {
    const totalFrames = Math.max(1, moveTotalFrames);
    return sampleClip(MOVE_CLIPS[moveId], (snapshot.moveFrame ?? 0) / totalFrames);
  }

  if (snapshot.justLanded) {
    return sampleClip(MOVE_CLIPS.landing, 0.2);
  }

  if (snapshot.hitstunFrames && snapshot.hitstunFrames > 0) {
    const phase = Math.min(1, 1 - snapshot.hitstunFrames / (snapshot.hitstunFrames + 12));
    return sampleClip(MOVE_CLIPS.hitstun, phase);
  }

  if (snapshot.isDodging) {
    return sampleClip(MOVE_CLIPS.dodge, Math.min(1, (snapshot.moveFrame ?? 0) / 20));
  }

  if (snapshot.isBlocking) {
    return sampleClip(MOVE_CLIPS.parry, 0.35);
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
