import type { FighterId } from "./moveTable";

export interface FighterRosterEntry {
  id: FighterId;
  label: string;
  title: string;
  archetype: string;
  summary: string;
  signature: string;
}

export const DEFAULT_PLAYER_FIGHTER_ID: FighterId = "stick_hero";
export const DEFAULT_CPU_FIGHTER_ID: FighterId = "stick_villain";

export const FIGHTER_ROSTER: readonly FighterRosterEntry[] = [
  {
    id: "stick_hero",
    label: "Hero",
    title: "Fundamentalist",
    archetype: "Balanced",
    summary: "Reliable grounded confirms, clear spacing, and the cleanest all-rounder kit.",
    signature: "Launcher into forward air pressure.",
  },
  {
    id: "stick_villain",
    label: "Villain",
    title: "Dirty Pressure",
    archetype: "Trickster",
    summary: "Baits, trap pressure, and ugly guard-break threats that punish autopilot defense.",
    signature: "Trap setups into crushing guard breaks.",
  },
  {
    id: "stick_kite",
    label: "Kite",
    title: "Sky Dancer",
    archetype: "Aerial",
    summary: "Launch-heavy air routes, sharp fall angles, and recovery tools that keep scrambles alive.",
    signature: "Sky Hook juggles into drifting aerial cuts.",
  },
  {
    id: "stick_anvil",
    label: "Anvil",
    title: "Wall Breaker",
    archetype: "Heavy",
    summary: "Slow, punishing bruiser pressure with armored-feeling swings, bulldoze entries, and brutal corner carry.",
    signature: "Bulldoze into Hammer Fall knockback.",
  },
] as const;

export const FIGHTER_OPTIONS = FIGHTER_ROSTER.map((fighter) => ({
  value: fighter.id,
  label: fighter.label,
}));

export const getFighterDefinition = (fighterId?: FighterId): FighterRosterEntry =>
  FIGHTER_ROSTER.find((fighter) => fighter.id === fighterId) ?? FIGHTER_ROSTER[0];
