import type { FighterId, MoveKey } from "../combat/moveTable";
import { getMoveTableFor, resolveMoveFromIntent } from "../combat/moveTable";
import type { CombatTrainingFighter, CombatTrainingStep } from "../lib/combatTraining";
import type { CharacterState } from "../lib/stores/useFighting";
import { Controls } from "../input/controls";
import type { PlayerIntentFrame } from "../input/intentTypes";

export type TrainingDrillId = "jab" | "launcher" | "parry" | "roll" | "grab";

export interface TrainingDummySequence {
  label: string;
  description: string;
  fighter: CombatTrainingFighter;
  steps: CombatTrainingStep[];
}

export interface TrainingDrillDefinition {
  id: TrainingDrillId;
  title: string;
  summary: string;
  prompt: string;
  inputHint: string;
  successLabel: string;
  coachingNote: string;
  dummySequence?: TrainingDummySequence;
  autoRepeatDummy?: boolean;
}

const neutralIntent = (
  direction: PlayerIntentFrame["direction"] = "neutral",
): PlayerIntentFrame => ({
  attack: undefined,
  special: undefined,
  defend: [],
  jump: undefined,
  dash: undefined,
  direction,
});

const attackIntent = (
  dir: NonNullable<PlayerIntentFrame["attack"]>["dir"],
  direction: PlayerIntentFrame["direction"] = "neutral",
): PlayerIntentFrame => ({
  ...neutralIntent(direction),
  attack: {
    kind: "attack",
    dir,
    airborne: false,
    press: {
      heldMs: 90,
      tapped: true,
      heavy: false,
      charged: false,
      flickedDir: undefined,
      justPressed: true,
    },
  },
});

const step = (
  frames: number,
  label: string,
  inputs: Partial<Record<Controls, boolean>> = {},
  intent?: PlayerIntentFrame,
): CombatTrainingStep => ({
  frames,
  label,
  inputs,
  intent,
});

const incomingJabSequence: TrainingDummySequence = {
  label: "Dummy Jab",
  description: "Training dummy walks in and throws a jab so you can time the defense.",
  fighter: "stick_villain",
  steps: [
    step(18, "walk in", { [Controls.leftward]: true }),
    step(2, "jab", { [Controls.attack]: true }, attackIntent("neutral")),
    step(24, "recover"),
  ],
};

export const TRAINING_DRILLS: readonly TrainingDrillDefinition[] = [
  {
    id: "jab",
    title: "Jab",
    summary: "Learn the fastest grounded opener.",
    prompt: "Tap Attack once. You are looking for the quick neutral strike, not a hold or charged swing.",
    inputHint: "Tap Attack",
    successLabel: "Jab confirmed",
    coachingNote: "This is your fastest way to start pressure and check spacing.",
  },
  {
    id: "launcher",
    title: "Launcher",
    summary: "Use direction to change the move, not just the spacing.",
    prompt: "Hold Forward and tap Attack to fire the up-directed launcher.",
    inputHint: "Forward + Attack",
    successLabel: "Launcher confirmed",
    coachingNote: "Directional intent is part of the kit. Up attack should feel deliberate, not accidental.",
  },
  {
    id: "parry",
    title: "Parry",
    summary: "Tap Defend on contact instead of sitting in guard.",
    prompt: "Wait for the dummy's jab and tap Defend on impact to land a parry.",
    inputHint: "Tap Defend on contact",
    successLabel: "Parry landed",
    coachingNote: "Tap late. Holding Defend too early becomes guard instead of a parry.",
    dummySequence: incomingJabSequence,
    autoRepeatDummy: true,
  },
  {
    id: "roll",
    title: "Roll",
    summary: "Use defend plus direction to move through pressure.",
    prompt: "As the dummy attacks, hold Defend and lean left or right to roll through the hit.",
    inputHint: "Defend + Left/Right",
    successLabel: "Roll confirmed",
    coachingNote: "A roll is directional defense. If you only tap Defend, you will parry or guard instead.",
    dummySequence: incomingJabSequence,
    autoRepeatDummy: true,
  },
  {
    id: "grab",
    title: "Grab",
    summary: "Turn the attack/defend chord into a stand-off breaker.",
    prompt: "Press Attack and Defend together when you are close enough to grab the dummy.",
    inputHint: "Attack + Defend",
    successLabel: "Grab confirmed",
    coachingNote: "Grab is a chord. Pressing the buttons together should feel distinct from attacking or guarding.",
  },
] as const;

export const TRAINING_DRILL_IDS = TRAINING_DRILLS.map((drill) => drill.id) as readonly TrainingDrillId[];

export const TRAINING_DRILL_BY_ID = Object.fromEntries(
  TRAINING_DRILLS.map((drill) => [drill.id, drill]),
) as Record<TrainingDrillId, TrainingDrillDefinition>;

const resolveExpectedMoveId = (fighterId: FighterId, key: MoveKey) =>
  resolveMoveFromIntent(getMoveTableFor(fighterId), key);

export const resolveTrainingDrillComplete = (
  drillId: TrainingDrillId,
  fighterId: FighterId,
  player: CharacterState,
): boolean => {
  switch (drillId) {
    case "jab": {
      const expectedMoveId = resolveExpectedMoveId(
        fighterId,
        "attack:neutral:light:ground" as MoveKey,
      );
      return Boolean(player.justStartedMove && expectedMoveId && player.moveId === expectedMoveId);
    }
    case "launcher": {
      const expectedMoveId = resolveExpectedMoveId(
        fighterId,
        "attack:up:light:ground" as MoveKey,
      );
      return Boolean(player.justStartedMove && expectedMoveId && player.moveId === expectedMoveId);
    }
    case "parry":
      return Boolean(player.justParried);
    case "roll":
      return Boolean(player.isDodging);
    case "grab":
      return Boolean(player.isGrabbing);
    default:
      return false;
  }
};
