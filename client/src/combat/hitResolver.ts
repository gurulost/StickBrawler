import type {
  FighterCombatState,
  HitResolution,
  HitboxDefinition,
  MoveDefinition,
} from "./types";

const KNOCKBACK_SCALE = 0.07;

export interface HitTestInput {
  attacker: FighterCombatState;
  defender: FighterCombatState;
  move: MoveDefinition;
  defenderWeight?: number;
  defenderGravity?: number;
  scaledDamage?: number;
}

export function resolveHits(input: HitTestInput): HitResolution[] {
  if (!input.move.hitboxes.length) return [];

  const results: HitResolution[] = [];
  const damageScale = input.scaledDamage ?? 1;

  for (const hitbox of input.move.hitboxes) {
    if (!isOverlap(hitbox, input.attacker, input.defender)) continue;
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
  hitbox: HitboxDefinition,
  attacker: FighterCombatState,
  defender: FighterCombatState,
): boolean {
  const attackerWorld = worldPosition(attacker.position, hitbox.offset, attacker.facing);
  const defenderWorld = defender.position;
  const dx = attackerWorld[0] - defenderWorld[0];
  const dy = attackerWorld[1] - defenderWorld[1];
  const dz = attackerWorld[2] - defenderWorld[2];
  const horizontalDist = Math.sqrt(dx * dx + dz * dz);
  const verticalOverlap = Math.abs(dy) <= hitbox.height;
  return horizontalDist <= hitbox.radius && verticalOverlap;
}

function worldPosition(
  base: [number, number, number],
  offset: [number, number, number],
  facing: 1 | -1,
): [number, number, number] {
  return [base[0] + offset[0] * facing, base[1] + offset[1], base[2] + offset[2]];
}
