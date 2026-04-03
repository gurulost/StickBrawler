import type { Direction, PressStyle } from "../input/intentTypes";

export type FighterId = "stick_hero" | "stick_villain" | "stick_kite" | "stick_anvil";

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

export const kiteMoveTable: FighterMoveTable = {
  [mapAttack("neutral", "light", "ground")]: "kite_feather_jab",
  [mapAttack("forward", "light", "ground")]: "kite_wing_slice",
  [mapAttack("back", "light", "ground")]: "kite_wing_slice",
  [mapAttack("up", "light", "ground")]: "kite_sky_hook",
  [mapAttack("down", "light", "ground")]: "kite_slide_kick",

  [mapAttack("forward", "heavy", "ground")]: "kite_tail_whip",
  [mapAttack("back", "heavy", "ground")]: "kite_tail_whip",
  [mapAttack("down", "heavy", "ground")]: "kite_sky_hook",
  [mapAttack("forward", "power", "ground")]: "kite_tail_whip",
  [mapAttack("back", "power", "ground")]: "kite_tail_whip",

  [mapAttack("neutral", "light", "air")]: "kite_air_swirl",
  [mapAttack("forward", "light", "air")]: "kite_air_flick",
  [mapAttack("back", "light", "air")]: "kite_air_swirl",
  [mapAttack("down", "light", "air")]: "kite_dive_screw",
  [mapAttack("up", "light", "air")]: "kite_air_swirl",

  [mapSpecial("neutral", "ground")]: "kite_gale_pulse",
  [mapSpecial("forward", "ground")]: "kite_drift_break",
  [mapSpecial("back", "ground")]: "kite_crosswind_feint",
  [mapSpecial("up", "ground")]: "kite_updraft_rise",
  [mapSpecial("down", "ground")]: "kite_crosswind_feint",

  [mapSpecial("neutral", "air")]: "kite_gale_pulse",
  [mapSpecial("forward", "air")]: "kite_drift_break",
  [mapSpecial("back", "air")]: "kite_air_swirl",
  [mapSpecial("up", "air")]: "kite_updraft_rise",
  [mapSpecial("down", "air")]: "kite_dive_screw",

  ["defend:parry" as MoveKey]: "parry",
  ["defend:roll" as MoveKey]: "dodge",
};

export const anvilMoveTable: FighterMoveTable = {
  [mapAttack("neutral", "light", "ground")]: "anvil_club_jab",
  [mapAttack("forward", "light", "ground")]: "anvil_shoulder_check",
  [mapAttack("back", "light", "ground")]: "anvil_shoulder_check",
  [mapAttack("up", "light", "ground")]: "anvil_headbutt_lift",
  [mapAttack("down", "light", "ground")]: "anvil_ankle_stamp",

  [mapAttack("forward", "heavy", "ground")]: "anvil_hammer_fall",
  [mapAttack("back", "heavy", "ground")]: "anvil_hammer_fall",
  [mapAttack("down", "heavy", "ground")]: "anvil_headbutt_lift",
  [mapAttack("forward", "power", "ground")]: "anvil_hammer_fall",
  [mapAttack("back", "power", "ground")]: "anvil_hammer_fall",

  [mapAttack("neutral", "light", "air")]: "anvil_body_press",
  [mapAttack("forward", "light", "air")]: "anvil_air_lariat",
  [mapAttack("back", "light", "air")]: "anvil_body_press",
  [mapAttack("down", "light", "air")]: "anvil_elbow_drop",
  [mapAttack("up", "light", "air")]: "anvil_body_press",

  [mapSpecial("neutral", "ground")]: "anvil_iron_bellow",
  [mapSpecial("forward", "ground")]: "anvil_bulldoze",
  [mapSpecial("back", "ground")]: "anvil_brace_counter",
  [mapSpecial("up", "ground")]: "anvil_rising_crash",
  [mapSpecial("down", "ground")]: "anvil_quake_slam",

  [mapSpecial("neutral", "air")]: "anvil_body_press",
  [mapSpecial("forward", "air")]: "anvil_air_lariat",
  [mapSpecial("back", "air")]: "anvil_brace_counter",
  [mapSpecial("up", "air")]: "anvil_rising_crash",
  [mapSpecial("down", "air")]: "anvil_elbow_drop",

  ["defend:parry" as MoveKey]: "parry",
  ["defend:roll" as MoveKey]: "dodge",
};

const fighterMoveTables: Record<FighterId, FighterMoveTable> = {
  stick_hero: heroMoveTable,
  stick_villain: villainMoveTable,
  stick_kite: kiteMoveTable,
  stick_anvil: anvilMoveTable,
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
