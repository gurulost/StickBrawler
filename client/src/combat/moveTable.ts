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
  [mapAttack("neutral", "light", "ground")]: "lightJab",
  [mapAttack("forward", "light", "ground")]: "lightJab2",
  [mapAttack("back", "light", "ground")]: "lightJab2",
  [mapAttack("up", "light", "ground")]: "launcher",
  [mapAttack("down", "light", "ground")]: "lightJab2",

  [mapAttack("forward", "heavy", "ground")]: "guardBreak",
  [mapAttack("back", "heavy", "ground")]: "guardBreak",
  [mapAttack("down", "heavy", "ground")]: "guardBreak",
  [mapAttack("forward", "power", "ground")]: "guardBreak",
  [mapAttack("back", "power", "ground")]: "guardBreak",

  [mapAttack("neutral", "light", "air")]: "diveKick",
  [mapAttack("forward", "light", "air")]: "diveKick",
  [mapAttack("back", "light", "air")]: "diveKick",
  [mapAttack("down", "light", "air")]: "diveKick",
  [mapAttack("up", "light", "air")]: "launcher",

  [mapSpecial("neutral", "ground")]: "launcher",
  [mapSpecial("forward", "ground")]: "guardBreak",
  [mapSpecial("back", "ground")]: "parryCounter",
  [mapSpecial("up", "ground")]: "launcher",
  [mapSpecial("down", "ground")]: "parry",

  [mapSpecial("neutral", "air")]: "diveKick",
  [mapSpecial("forward", "air")]: "diveKick",
  [mapSpecial("back", "air")]: "parryCounter",
  [mapSpecial("up", "air")]: "launcher",
  [mapSpecial("down", "air")]: "diveKick",

  ["defend:parry" as MoveKey]: "parry",
};

export const villainMoveTable: FighterMoveTable = {
  [mapAttack("neutral", "light", "ground")]: "lightJab",
  [mapAttack("forward", "light", "ground")]: "guardBreak",
  [mapAttack("back", "light", "ground")]: "guardBreak",
  [mapAttack("up", "light", "ground")]: "parryCounter",
  [mapAttack("down", "light", "ground")]: "groundSweep",

  [mapAttack("forward", "heavy", "ground")]: "guardBreak",
  [mapAttack("back", "heavy", "ground")]: "parryCounter",
  [mapAttack("down", "heavy", "ground")]: "parryCounter",
  [mapAttack("forward", "power", "ground")]: "guardBreak",
  [mapAttack("back", "power", "ground")]: "guardBreak",

  [mapAttack("neutral", "light", "air")]: "diveKick",
  [mapAttack("forward", "light", "air")]: "guardBreak",
  [mapAttack("back", "light", "air")]: "guardBreak",
  [mapAttack("down", "light", "air")]: "diveKick",
  [mapAttack("up", "light", "air")]: "launcher",

  [mapSpecial("neutral", "ground")]: "parryCounter",
  [mapSpecial("forward", "ground")]: "guardBreak",
  [mapSpecial("back", "ground")]: "parry",
  [mapSpecial("up", "ground")]: "launcher",
  [mapSpecial("down", "ground")]: "groundSweep",

  [mapSpecial("neutral", "air")]: "diveKick",
  [mapSpecial("forward", "air")]: "guardBreak",
  [mapSpecial("back", "air")]: "parryCounter",
  [mapSpecial("up", "air")]: "launcher",
  [mapSpecial("down", "air")]: "diveKick",

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
