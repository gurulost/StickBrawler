import type { DualInputSnapshot, PlayerInputSnapshot, PlayerSlot } from "../hooks/use-player-controls";
import { CONTROL_ACTIONS, Controls } from "../input/controls";
import type { DualPlayerIntentFrame, PlayerIntentFrame } from "../input/intentTypes";

export type CombatTrainingFighter = "any" | "hero" | "villain";
export type CombatTrainingPresetId =
  | "run_forward"
  | "jump_arc"
  | "guard_hold"
  | "parry_cut"
  | "dodge_right"
  | "hero_jab_1"
  | "hero_tilt_side"
  | "hero_launcher"
  | "hero_air_forward"
  | "vill_guard_break_big";

export interface CombatTrainingStep {
  frames: number;
  label: string;
  inputs?: Partial<PlayerInputSnapshot>;
  intent?: PlayerIntentFrame;
}

export interface CombatTrainingPreset {
  id: CombatTrainingPresetId;
  label: string;
  description: string;
  fighter: CombatTrainingFighter;
  steps: CombatTrainingStep[];
}

export interface CombatTrainingRun {
  id: number;
  presetId: string;
  label: string;
  description: string;
  fighter: CombatTrainingFighter;
  slot: PlayerSlot;
  steps: CombatTrainingStep[];
  stepIndex: number;
  frameInStep: number;
  frameNumber: number;
  totalFrames: number;
}

export interface CombatTrainingFrameSample {
  presetId: string;
  label: string;
  description: string;
  fighter: CombatTrainingFighter;
  slot: PlayerSlot;
  stepLabel: string;
  frameNumber: number;
  totalFrames: number;
  remainingFrames: number;
  inputs: PlayerInputSnapshot;
  intent?: PlayerIntentFrame;
}

interface CombatTrainingRunInput {
  slot: PlayerSlot;
  label: string;
  description: string;
  fighter: CombatTrainingFighter;
  presetId: string;
  steps: CombatTrainingStep[];
}

const step = (
  frames: number,
  label: string,
  inputs: Partial<PlayerInputSnapshot> = {},
  intent?: PlayerIntentFrame,
): CombatTrainingStep => ({
  frames,
  label,
  inputs,
  intent,
});

const toSnapshot = (inputs: Partial<PlayerInputSnapshot> = {}): PlayerInputSnapshot =>
  CONTROL_ACTIONS.reduce((state, control) => {
    state[control] = !!inputs[control];
    return state;
  }, {} as PlayerInputSnapshot);

const baseIntent = (
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
  options: {
    airborne?: boolean;
    heavy?: boolean;
    charged?: boolean;
    direction?: PlayerIntentFrame["direction"];
  } = {},
): PlayerIntentFrame => {
  const heavy = options.heavy ?? false;
  const charged = options.charged ?? heavy;
  return {
    ...baseIntent(options.direction ?? "neutral"),
    attack: {
      kind: "attack",
      dir,
      airborne: options.airborne ?? false,
      press: {
        heldMs: charged ? 320 : heavy ? 240 : 90,
        tapped: !heavy && !charged,
        heavy,
        charged,
        flickedDir: undefined,
        justPressed: true,
      },
    },
  };
};

const defendIntent = (
  mode: "guard" | "roll" | "parry",
  options: { dir?: PlayerIntentFrame["direction"]; direction?: PlayerIntentFrame["direction"] } = {},
): PlayerIntentFrame => ({
  ...baseIntent(options.direction ?? options.dir ?? "neutral"),
  defend: [
    {
      kind: "defend",
      mode,
      dir: options.dir,
      press: {
        heldMs: mode === "guard" ? 260 : 80,
        tapped: mode !== "guard",
        heavy: false,
        charged: false,
        flickedDir: undefined,
        justPressed: true,
      },
    },
  ],
});

const createRun = (input: CombatTrainingRunInput, runId: number): CombatTrainingRun => ({
  id: runId,
  presetId: input.presetId,
  label: input.label,
  description: input.description,
  fighter: input.fighter,
  slot: input.slot,
  steps: input.steps.map((entry) => ({
    ...entry,
    frames: Math.max(1, Math.floor(entry.frames)),
    inputs: { ...(entry.inputs ?? {}) },
  })),
  stepIndex: 0,
  frameInStep: 0,
  frameNumber: 0,
  totalFrames: input.steps.reduce((total, entry) => total + Math.max(1, Math.floor(entry.frames)), 0),
});

export const COMBAT_TRAINING_PRESETS: Record<CombatTrainingPresetId, CombatTrainingPreset> = {
  run_forward: {
    id: "run_forward",
    label: "Run Forward",
    description: "Hold lateral movement long enough to read the locomotion silhouette cleanly.",
    fighter: "any",
    steps: [
      step(16, "run", { [Controls.rightward]: true }),
      step(8, "release"),
    ],
  },
  jump_arc: {
    id: "jump_arc",
    label: "Jump Arc",
    description: "Jump, rise, fall, and land on a deterministic cadence.",
    fighter: "any",
    steps: [
      step(2, "jump start", { [Controls.jump]: true }),
      step(34, "arc"),
    ],
  },
  guard_hold: {
    id: "guard_hold",
    label: "Guard Hold",
    description: "Hold the compact defensive shell without extra directional drift.",
    fighter: "any",
    steps: [
      step(18, "guard", { [Controls.defend]: true }, defendIntent("guard")),
      step(8, "release"),
    ],
  },
  parry_cut: {
    id: "parry_cut",
    label: "Parry Cut",
    description: "Single defend tap for the parry timing and cut reaction.",
    fighter: "any",
    steps: [
      step(1, "parry tap", { [Controls.defend]: true }, defendIntent("parry")),
      step(22, "recover"),
    ],
  },
  dodge_right: {
    id: "dodge_right",
    label: "Dodge Right",
    description: "Scripted right roll for dodge and invuln timing checks.",
    fighter: "any",
    steps: [
      step(
        4,
        "dodge",
        { [Controls.defend]: true, [Controls.rightward]: true },
        defendIntent("roll", { dir: "right", direction: "right" }),
      ),
      step(20, "recover"),
    ],
  },
  hero_jab_1: {
    id: "hero_jab_1",
    label: "Hero Jab",
    description: "Neutral light attack through the live intent analyzer.",
    fighter: "hero",
    steps: [
      step(2, "jab input", { [Controls.attack]: true }, attackIntent("neutral")),
      step(22, "recover"),
    ],
  },
  hero_tilt_side: {
    id: "hero_tilt_side",
    label: "Hero Side Tilt",
    description: "Forward-leaning tilt through the real movement and attack path.",
    fighter: "hero",
    steps: [
      step(
        2,
        "tilt input",
        { [Controls.rightward]: true, [Controls.attack]: true },
        attackIntent("forward", { direction: "right" }),
      ),
      step(28, "recover"),
    ],
  },
  hero_launcher: {
    id: "hero_launcher",
    label: "Hero Launcher",
    description: "Up-directed launcher via the fixed action-direction route.",
    fighter: "hero",
    steps: [
      step(
        2,
        "launcher input",
        { [Controls.forward]: true, [Controls.attack]: true },
        attackIntent("up", { direction: "forward" }),
      ),
      step(38, "recover"),
    ],
  },
  hero_air_forward: {
    id: "hero_air_forward",
    label: "Hero Air Forward",
    description: "Jump first, then fire the forward aerial on a fixed airborne frame.",
    fighter: "hero",
    steps: [
      step(2, "jump start", { [Controls.jump]: true }),
      step(6, "rise"),
      step(
        2,
        "air attack",
        { [Controls.rightward]: true, [Controls.attack]: true },
        attackIntent("forward", { airborne: true, direction: "right" }),
      ),
      step(30, "fall / land"),
    ],
  },
  vill_guard_break_big: {
    id: "vill_guard_break_big",
    label: "Vill Guard Break",
    description: "Held heavy forward strike to force the big guard-break startup.",
    fighter: "villain",
    steps: [
      step(
        16,
        "heavy charge",
        { [Controls.rightward]: true, [Controls.attack]: true },
        attackIntent("forward", { heavy: true, direction: "right" }),
      ),
      step(38, "recover"),
    ],
  },
};

export const COMBAT_TRAINING_PRESET_ORDER = [
  "run_forward",
  "jump_arc",
  "guard_hold",
  "parry_cut",
  "dodge_right",
  "hero_jab_1",
  "hero_tilt_side",
  "hero_launcher",
  "hero_air_forward",
  "vill_guard_break_big",
] as const satisfies readonly CombatTrainingPresetId[];

export const createCombatTrainingRunFromPreset = (
  presetId: CombatTrainingPresetId,
  slot: PlayerSlot,
  runId: number,
): CombatTrainingRun => {
  const preset = COMBAT_TRAINING_PRESETS[presetId];
  return createRun(
    {
      slot,
      label: preset.label,
      description: preset.description,
      fighter: preset.fighter,
      presetId,
      steps: preset.steps,
    },
    runId,
  );
};

export const createCombatTrainingRunFromSequence = (
  input: {
    slot: PlayerSlot;
    label: string;
    description?: string;
    fighter?: CombatTrainingFighter;
    presetId?: string;
    steps: CombatTrainingStep[];
  },
  runId: number,
): CombatTrainingRun =>
  createRun(
    {
      slot: input.slot,
      label: input.label,
      description: input.description ?? "Custom debug input sequence.",
      fighter: input.fighter ?? "any",
      presetId: input.presetId ?? "custom_sequence",
      steps: input.steps,
    },
    runId,
  );

export const consumeCombatTrainingRunFrame = (
  run: CombatTrainingRun,
): { sample: CombatTrainingFrameSample; nextRun: CombatTrainingRun | null } => {
  const activeStep = run.steps[run.stepIndex];
  const frameNumber = run.frameNumber + 1;
  const sample: CombatTrainingFrameSample = {
    presetId: run.presetId,
    label: run.label,
    description: run.description,
    fighter: run.fighter,
    slot: run.slot,
    stepLabel: activeStep.label,
    frameNumber,
    totalFrames: run.totalFrames,
    remainingFrames: Math.max(0, run.totalFrames - frameNumber),
    inputs: toSnapshot(activeStep.inputs),
    intent: activeStep.intent,
  };
  const nextFrameInStep = run.frameInStep + 1;
  if (nextFrameInStep < activeStep.frames) {
    return {
      sample,
      nextRun: {
        ...run,
        frameInStep: nextFrameInStep,
        frameNumber,
      },
    };
  }
  const nextStepIndex = run.stepIndex + 1;
  if (nextStepIndex >= run.steps.length) {
    return { sample, nextRun: null };
  }
  return {
    sample,
    nextRun: {
      ...run,
      stepIndex: nextStepIndex,
      frameInStep: 0,
      frameNumber,
    },
  };
};

export const injectCombatTrainingFrame = (
  base: DualInputSnapshot,
  sample: CombatTrainingFrameSample | null,
): DualInputSnapshot => {
  if (!sample) return base;
  return {
    ...base,
    [sample.slot]: sample.inputs,
  };
};

export const injectCombatTrainingIntentFrame = (
  base: DualPlayerIntentFrame,
  sample: CombatTrainingFrameSample | null,
): DualPlayerIntentFrame => {
  if (!sample?.intent) return base;
  return {
    ...base,
    [sample.slot]: sample.intent,
  };
};

export const describeCombatTrainingRun = (run: CombatTrainingRun | null) => {
  if (!run) return null;
  const stepInfo = run.steps[run.stepIndex];
  return {
    id: run.id,
    presetId: run.presetId,
    label: run.label,
    description: run.description,
    fighter: run.fighter,
    slot: run.slot,
    stepLabel: stepInfo?.label ?? "complete",
    frameNumber: run.frameNumber,
    totalFrames: run.totalFrames,
    remainingFrames: Math.max(0, run.totalFrames - run.frameNumber),
  };
};

export const matchesCombatTrainingFighter = (
  fighter: CombatTrainingFighter,
  fighterId: string,
) => {
  if (fighter === "any") return true;
  if (fighter === "hero") return fighterId === "stick_hero";
  return fighterId === "stick_villain";
};
