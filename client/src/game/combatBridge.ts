import type { CharacterState } from "../lib/stores/useFighting";
import type { FighterCombatState, MoveDefinition, HitResolution } from "../combat";
import { clamp } from "../lib/clamp";

export const DEFAULT_GUARD_METER = 80;
export const DEFAULT_STAMINA_METER = 100;
export const DEFAULT_SPECIAL_METER = 0;

export const ATTACK_INPUT_TO_MOVE: Record<string, string> = {
  attack1: "lightJab",
  attack2: "guardBreak",
  special: "launcher",
  airAttack: "diveKick",
  grab: "parry",
};

export type PlayerInputState = {
  attack1?: boolean;
  attack2?: boolean;
  special?: boolean;
  airAttack?: boolean;
  dodge?: boolean;
  grab?: boolean;
};

export interface DirectionalInfluence {
  horizontal?: number;
  vertical?: number;
}

const HORIZONTAL_DI_STRENGTH = 0.35;
const VERTICAL_DI_STRENGTH = 0.25;

export function toCombatState(character: CharacterState): FighterCombatState {
  return {
    action: character.isAttacking
      ? "attack"
      : character.isBlocking
        ? "blockstun"
        : character.isJumping
          ? "jump"
          : character.isDodging
            ? "dodge"
            : "idle",
    facing: character.direction,
    moveId: undefined,
    moveFrame: undefined,
    hitstunFrames: 0,
    blockstunFrames: 0,
    guardMeter: DEFAULT_GUARD_METER,
    staminaMeter: DEFAULT_STAMINA_METER,
    specialMeter: DEFAULT_SPECIAL_METER,
    comboCounter: character.comboCount,
    juggleDecay: 0,
    position: character.position,
    velocity: character.velocity,
    inAir: character.position[1] > 0.15 || character.isJumping,
  };
}

export function selectMoveFromInputs(
  inputs: PlayerInputState,
  preferredOrder: Array<keyof PlayerInputState>,
  moveLibrary: Record<string, MoveDefinition>,
  isAirborne: boolean,
): MoveDefinition | undefined {
  for (const key of preferredOrder) {
    if (!inputs[key]) continue;
    const moveId = ATTACK_INPUT_TO_MOVE[key as string];
    if (!moveId) continue;
    const def = moveLibrary[moveId];
    if (!def) continue;
    if (def.aerialOnly && !isAirborne) continue;
    if (def.groundedOnly && isAirborne) continue;
    return def;
  }
  return undefined;
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
