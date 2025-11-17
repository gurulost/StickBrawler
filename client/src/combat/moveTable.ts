import type { Direction, PressStyle } from "../input/intentTypes";

export type FighterId = "stick_hero" | "stick_villain";

export type AttackStrength = "light" | "medium" | "heavy" | "power";
export type Altitude = "ground" | "air";
export type SpecialSlot = "neutral" | "forward" | "back" | "up" | "down";
export type DefendSlot = "guard" | "roll" | "parry" | "grab" | "tech";

export type MoveKey =
  | `attack:${Direction}:${AttackStrength}:${Altitude}`
  | `special:${SpecialSlot}:${Altitude}`
  | `defend:${DefendSlot}`;

export type FighterMoveTable = Partial<Record<MoveKey, string>>;

const mapAttack = (
  dir: Direction,
  strength: AttackStrength,
  altitude: Altitude,
) => `attack:${dir}:${strength}:${altitude}` as MoveKey;

const mapSpecial = (slot: SpecialSlot, altitude: Altitude) =>
  `special:${slot}:${altitude}` as MoveKey;

export const heroMoveTable: FighterMoveTable = {
  [mapAttack("neutral", "light", "ground")]: "hero_jab_1",
  [mapAttack("forward", "light", "ground")]: "hero_tilt_side",
  [mapAttack("back", "light", "ground")]: "hero_tilt_side",
  [mapAttack("up", "light", "ground")]: "hero_launcher",
  [mapAttack("down", "light", "ground")]: "hero_sweep",

  [mapAttack("forward", "heavy", "ground")]: "hero_smash_side",
  [mapAttack("back", "heavy", "ground")]: "hero_smash_side",
  [mapAttack("down", "heavy", "ground")]: "hero_launcher",
  [mapAttack("forward", "power", "ground")]: "hero_smash_side",
  [mapAttack("back", "power", "ground")]: "hero_smash_side",

  [mapAttack("neutral", "light", "air")]: "hero_air_neutral",
  [mapAttack("forward", "light", "air")]: "hero_air_forward",
  [mapAttack("back", "light", "air")]: "hero_air_neutral",
  [mapAttack("down", "light", "air")]: "hero_air_down_spike",
  [mapAttack("up", "light", "air")]: "hero_air_neutral",

  [mapSpecial("neutral", "ground")]: "hero_neutral_proj",
  [mapSpecial("forward", "ground")]: "hero_dash_strike",
  [mapSpecial("back", "ground")]: "hero_counter_light",
  [mapSpecial("up", "ground")]: "hero_rising_recovery",
  [mapSpecial("down", "ground")]: "hero_counter_light",

  [mapSpecial("neutral", "air")]: "hero_air_neutral",
  [mapSpecial("forward", "air")]: "hero_dash_strike",
  [mapSpecial("back", "air")]: "hero_counter_light",
  [mapSpecial("up", "air")]: "hero_rising_recovery",
  [mapSpecial("down", "air")]: "hero_air_down_spike",

  ["defend:parry" as MoveKey]: "parry",
};

export const villainMoveTable: FighterMoveTable = {
  [mapAttack("neutral", "light", "ground")]: "vill_jab_triple",
  [mapAttack("forward", "light", "ground")]: "vill_low_stab",
  [mapAttack("back", "light", "ground")]: "vill_low_stab",
  [mapAttack("up", "light", "ground")]: "parryCounter",
  [mapAttack("down", "light", "ground")]: "vill_low_stab",

  [mapAttack("forward", "heavy", "ground")]: "vill_guard_break_big",
  [mapAttack("back", "heavy", "ground")]: "vill_guard_break_big",
  [mapAttack("down", "heavy", "ground")]: "parryCounter",
  [mapAttack("forward", "power", "ground")]: "vill_guard_break_big",
  [mapAttack("back", "power", "ground")]: "vill_guard_break_big",

  [mapAttack("neutral", "light", "air")]: "diveKick",
  [mapAttack("forward", "light", "air")]: "vill_dive_explosion",
  [mapAttack("back", "light", "air")]: "vill_dive_explosion",
  [mapAttack("down", "light", "air")]: "vill_dive_explosion",
  [mapAttack("up", "light", "air")]: "diveKick",

  [mapSpecial("neutral", "ground")]: "vill_poison_orb",
  [mapSpecial("forward", "ground")]: "vill_sidestep_strike",
  [mapSpecial("back", "ground")]: "vill_trap",
  [mapSpecial("up", "ground")]: "vill_teleport_recover",
  [mapSpecial("down", "ground")]: "vill_trap",

  [mapSpecial("neutral", "air")]: "vill_poison_orb",
  [mapSpecial("forward", "air")]: "vill_sidestep_strike",
  [mapSpecial("back", "air")]: "vill_poison_orb",
  [mapSpecial("up", "air")]: "vill_teleport_recover",
  [mapSpecial("down", "air")]: "vill_dive_explosion",

  ["defend:parry" as MoveKey]: "parry",
  ["defend:roll" as MoveKey]: "dodge",
};

const fighterMoveTables: Record<FighterId, FighterMoveTable> = {
  stick_hero: heroMoveTable,
  stick_villain: villainMoveTable,
};

export function getMoveTableFor(fighterId: FighterId) {
  return fighterMoveTables[fighterId] ?? heroMoveTable;
}

export const pressToStrength = (press: PressStyle): AttackStrength => {
  if (press.charged) return "power";
  if (press.heavy) return "heavy";
  if (press.tapped) return "light";
  return "medium";
};

export const normalizeAttackDirection = (dir: Direction): Direction => {
  if (dir === "left" || dir === "right") {
    return "forward";
  }
  return dir;
};

export const toSpecialSlot = (dir: Direction): SpecialSlot => {
  switch (dir) {
    case "forward":
    case "right":
      return "forward";
    case "back":
    case "left":
      return "back";
    case "up":
      return "up";
    case "down":
      return "down";
    default:
      return "neutral";
  }
};

export const resolveMoveFromIntent = (
  table: FighterMoveTable,
  key: MoveKey,
): string | undefined => table[key];
