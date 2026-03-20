import type { CharacterState } from "../lib/stores/useFighting";
import type { FighterCombatState, HitResolution } from "../combat";
import { clamp } from "../lib/clamp";

export const DEFAULT_GUARD_METER = 80;
export const DEFAULT_STAMINA_METER = 100;
export const DEFAULT_SPECIAL_METER = 0;

export interface DirectionalInfluence {
  horizontal?: number;
  vertical?: number;
}

const HORIZONTAL_DI_STRENGTH = 0.35;
const VERTICAL_DI_STRENGTH = 0.25;

export function toCombatState(character: CharacterState): FighterCombatState {
  return {
    action: character.action ??
      (character.isAttacking
        ? "attack"
        : character.isBlocking
          ? "blockstun"
          : character.isJumping
            ? "jump"
            : character.isDodging
              ? "dodge"
              : "idle"),
    facing: character.direction,
    fighterId: character.fighterId,
    moveId: character.moveId,
    moveFrame: character.moveFrame,
    hitstunFrames: character.hitstunFrames ?? 0,
    blockstunFrames: character.blockstunFrames ?? 0,
    guardMeter: character.guardMeter ?? DEFAULT_GUARD_METER,
    staminaMeter: character.staminaMeter ?? DEFAULT_STAMINA_METER,
    specialMeter: character.specialMeter ?? DEFAULT_SPECIAL_METER,
    comboCounter: character.comboCount,
    juggleDecay: 0,
    position: character.position,
    velocity: character.velocity,
    inAir: character.inAir ?? (character.position[1] > 0.15 || character.isJumping),
  };
}

export function applyKnockbackToVelocity(
  target: CharacterState,
  hit: HitResolution,
  influence?: DirectionalInfluence,
): [number, number, number] {
  const damping = 0.65;
  const [vx, vy, vz] = target.velocity;
  const diHorizontal = clamp(influence?.horizontal ?? 0, -1, 1);
  const diVertical = clamp(influence?.vertical ?? 0, -1, 1);
  const knockbackX =
    hit.knockbackVector[0] -
    Math.sign(hit.knockbackVector[0] || 1) *
      Math.abs(hit.knockbackVector[0]) *
      diHorizontal *
      HORIZONTAL_DI_STRENGTH;
  const knockbackY =
    hit.knockbackVector[1] +
    Math.abs(hit.knockbackVector[1]) *
      diVertical *
      VERTICAL_DI_STRENGTH;
  return [
    vx * damping + knockbackX,
    vy * damping + knockbackY,
    vz * damping + hit.knockbackVector[2],
  ];
}

export function comboScale(comboCount: number) {
  return 1 + Math.min(comboCount * 0.08, 0.75);
}
