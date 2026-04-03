export enum CpuAction {
  IDLE,
  CHASE,
  RETREAT,
  ATTACK,
  BLOCK,
  JUMP,
  AIR_ATTACK,
  DODGE,
  GRAB,
  TAUNT,
}

export enum CpuStyle {
  BEGINNER = "beginner",
  RUSHDOWN = "rushdown",
  TRICKSTER = "trickster",
  ZONER = "zoner",
}

export enum CpuDifficulty {
  EASY = "easy",
  NORMAL = "normal",
  HARD = "hard",
  BRUTAL = "brutal",
}

export interface CpuConfig {
  style: CpuStyle;
  difficulty: CpuDifficulty;
}

export const DEFAULT_CPU_CONFIG: CpuConfig = {
  style: CpuStyle.BEGINNER,
  difficulty: CpuDifficulty.NORMAL,
};

export const CPU_STYLE_OPTIONS: Array<{
  value: CpuStyle;
  label: string;
  summary: string;
}> = [
  {
    value: CpuStyle.BEGINNER,
    label: "Beginner",
    summary: "Obvious, forgiving pressure that leaves room to learn core verbs.",
  },
  {
    value: CpuStyle.RUSHDOWN,
    label: "Rushdown",
    summary: "Closes space fast, keeps you blocking, and favors close-range strings.",
  },
  {
    value: CpuStyle.TRICKSTER,
    label: "Trickster",
    summary: "Baits swings, looks for parries, and punishes predictable pressure.",
  },
  {
    value: CpuStyle.ZONER,
    label: "Zoner",
    summary: "Plays at range, resets spacing, and leans on specials to control pace.",
  },
];

export const CPU_DIFFICULTY_OPTIONS: Array<{
  value: CpuDifficulty;
  label: string;
  summary: string;
}> = [
  {
    value: CpuDifficulty.EASY,
    label: "Easy",
    summary: "Slow reactions, clear openings, and frequent mistakes.",
  },
  {
    value: CpuDifficulty.NORMAL,
    label: "Normal",
    summary: "Competent pressure and defense without tight punishes every time.",
  },
  {
    value: CpuDifficulty.HARD,
    label: "Hard",
    summary: "Sharper reactions, cleaner confirms, and stronger punish windows.",
  },
  {
    value: CpuDifficulty.BRUTAL,
    label: "Brutal",
    summary: "Fast reads, disciplined pressure, and real counterplay demands.",
  },
];

interface CpuBrainOptions extends Partial<CpuConfig> {
  rng?: () => number;
}

export interface CpuControlFrame
  extends Record<
      | "jump"
      | "forward"
      | "backward"
      | "leftward"
      | "rightward"
      | "dropThrough"
      | "shield"
      | "parry"
      | "attack1"
      | "attack2"
      | "special"
      | "airAttack"
      | "dodge"
      | "grab",
      boolean
    > {}

interface StyleTuning {
  idealRange: number;
  heavyRange: number;
  grabRange: number;
  specialMinRange: number;
  specialMaxRange: number;
  attackCadence: number;
  attackBias: number;
  specialBias: number;
  blockBias: number;
  chaseBias: number;
  retreatBias: number;
  dodgeBias: number;
  grabBias: number;
  jumpBias: number;
  airBias: number;
  punishBias: number;
  baitBias: number;
  tauntBias: number;
  counterBias: number;
}

interface DifficultyTuning {
  reactionFrames: [number, number];
  attackCadenceMultiplier: number;
  defenseBonus: number;
  punishBonus: number;
  specialBonus: number;
  parryChance: number;
  errorRate: number;
  guardFloor: number;
  punishMemoryFrames: number;
}

type DistanceBand = "close" | "mid" | "far";

type DecisionContext = {
  distance: number;
  band: DistanceBand;
  playerAttacking: boolean;
  punishWindow: boolean;
  lowGuard: boolean;
};

type CpuTickState = {
  position: [number, number, number];
  isJumping: boolean;
  attackCooldown: number;
  dodgeCooldown: number;
  guardMeter: number;
};

type PlayerTickState = {
  position: [number, number, number];
  isAttacking: boolean;
};

const ACTION_DURATION_FACTORS: Record<CpuAction, number> = {
  [CpuAction.IDLE]: 0.7,
  [CpuAction.CHASE]: 1,
  [CpuAction.RETREAT]: 0.9,
  [CpuAction.ATTACK]: 0.55,
  [CpuAction.BLOCK]: 0.75,
  [CpuAction.JUMP]: 0.55,
  [CpuAction.AIR_ATTACK]: 0.5,
  [CpuAction.DODGE]: 0.45,
  [CpuAction.GRAB]: 0.5,
  [CpuAction.TAUNT]: 0.45,
};

const STYLE_TUNINGS: Record<CpuStyle, StyleTuning> = {
  [CpuStyle.BEGINNER]: {
    idealRange: 1.35,
    heavyRange: 0.95,
    grabRange: 1.05,
    specialMinRange: 1.55,
    specialMaxRange: 2.1,
    attackCadence: 1.95,
    attackBias: 0.36,
    specialBias: 0.12,
    blockBias: 0.42,
    chaseBias: 0.72,
    retreatBias: 0.32,
    dodgeBias: 0.12,
    grabBias: 0.08,
    jumpBias: 0.12,
    airBias: 0.06,
    punishBias: 0.18,
    baitBias: 0.05,
    tauntBias: 0.08,
    counterBias: 0,
  },
  [CpuStyle.RUSHDOWN]: {
    idealRange: 1.1,
    heavyRange: 0.9,
    grabRange: 1.18,
    specialMinRange: 1.35,
    specialMaxRange: 2.15,
    attackCadence: 1.15,
    attackBias: 0.8,
    specialBias: 0.24,
    blockBias: 0.16,
    chaseBias: 0.95,
    retreatBias: 0.14,
    dodgeBias: 0.18,
    grabBias: 0.24,
    jumpBias: 0.12,
    airBias: 0.14,
    punishBias: 0.52,
    baitBias: 0.04,
    tauntBias: 0.02,
    counterBias: 0.02,
  },
  [CpuStyle.TRICKSTER]: {
    idealRange: 1.45,
    heavyRange: 0.85,
    grabRange: 1.16,
    specialMinRange: 1.25,
    specialMaxRange: 2.25,
    attackCadence: 1.5,
    attackBias: 0.42,
    specialBias: 0.32,
    blockBias: 0.38,
    chaseBias: 0.55,
    retreatBias: 0.54,
    dodgeBias: 0.34,
    grabBias: 0.18,
    jumpBias: 0.18,
    airBias: 0.12,
    punishBias: 0.72,
    baitBias: 0.46,
    tauntBias: 0.08,
    counterBias: 0.24,
  },
  [CpuStyle.ZONER]: {
    idealRange: 1.95,
    heavyRange: 0.82,
    grabRange: 1,
    specialMinRange: 1.45,
    specialMaxRange: 2.8,
    attackCadence: 1.85,
    attackBias: 0.28,
    specialBias: 0.62,
    blockBias: 0.3,
    chaseBias: 0.4,
    retreatBias: 0.72,
    dodgeBias: 0.28,
    grabBias: 0.08,
    jumpBias: 0.24,
    airBias: 0.24,
    punishBias: 0.34,
    baitBias: 0.18,
    tauntBias: 0.06,
    counterBias: 0.06,
  },
};

const DIFFICULTY_TUNINGS: Record<CpuDifficulty, DifficultyTuning> = {
  [CpuDifficulty.EASY]: {
    reactionFrames: [30, 42],
    attackCadenceMultiplier: 1.28,
    defenseBonus: 0.04,
    punishBonus: 0.06,
    specialBonus: 0.03,
    parryChance: 0,
    errorRate: 0.32,
    guardFloor: 18,
    punishMemoryFrames: 18,
  },
  [CpuDifficulty.NORMAL]: {
    reactionFrames: [22, 32],
    attackCadenceMultiplier: 1,
    defenseBonus: 0.14,
    punishBonus: 0.15,
    specialBonus: 0.08,
    parryChance: 0.04,
    errorRate: 0.18,
    guardFloor: 14,
    punishMemoryFrames: 24,
  },
  [CpuDifficulty.HARD]: {
    reactionFrames: [16, 24],
    attackCadenceMultiplier: 0.82,
    defenseBonus: 0.28,
    punishBonus: 0.3,
    specialBonus: 0.16,
    parryChance: 0.12,
    errorRate: 0.1,
    guardFloor: 10,
    punishMemoryFrames: 32,
  },
  [CpuDifficulty.BRUTAL]: {
    reactionFrames: [10, 16],
    attackCadenceMultiplier: 0.66,
    defenseBonus: 0.4,
    punishBonus: 0.45,
    specialBonus: 0.24,
    parryChance: 0.22,
    errorRate: 0.04,
    guardFloor: 8,
    punishMemoryFrames: 42,
  },
};

export class CpuBrain {
  private action: CpuAction = CpuAction.IDLE;
  private actionTimer = 0;
  private attackRhythm = 0;
  private config: CpuConfig;
  private readonly rng: () => number;
  private playerAttackMemory = 0;
  private sidestepDirection: -1 | 1 = 1;

  constructor({
    style = DEFAULT_CPU_CONFIG.style,
    difficulty = DEFAULT_CPU_CONFIG.difficulty,
    rng,
  }: CpuBrainOptions = {}) {
    this.config = { style, difficulty };
    this.rng = rng ?? Math.random;
  }

  setConfig(config: CpuConfig) {
    if (
      this.config.style === config.style &&
      this.config.difficulty === config.difficulty
    ) {
      return;
    }
    this.config = { ...config };
    this.action = CpuAction.IDLE;
    this.actionTimer = 0;
    this.attackRhythm = 0;
    this.playerAttackMemory = 0;
  }

  tick(
    cpuState: CpuTickState,
    playerState: PlayerTickState,
    delta: number,
  ): CpuControlFrame {
    const controls = createEmptyControlFrame();
    const [cpuX, cpuY, cpuZ] = cpuState.position;
    const [playerX, playerY, playerZ] = playerState.position;
    const dx = playerX - cpuX;
    const dz = playerZ - cpuZ;
    const planarDistance = Math.hypot(dx, dz);
    const style = STYLE_TUNINGS[this.config.style];
    const difficulty = DIFFICULTY_TUNINGS[this.config.difficulty];
    const frameDelta = delta * 60;

    this.actionTimer -= frameDelta;
    this.attackRhythm -= delta;
    this.playerAttackMemory = playerState.isAttacking
      ? difficulty.punishMemoryFrames
      : Math.max(0, this.playerAttackMemory - frameDelta);

    const context: DecisionContext = {
      distance: planarDistance,
      band: resolveDistanceBand(planarDistance, style.idealRange),
      playerAttacking: playerState.isAttacking,
      punishWindow: !playerState.isAttacking && this.playerAttackMemory > 0,
      lowGuard: cpuState.guardMeter < difficulty.guardFloor,
    };

    if (this.actionTimer <= 0) {
      this.decideAction(context, style, difficulty);
    }

    if (
      this.action !== CpuAction.ATTACK &&
      !context.playerAttacking &&
      !context.lowGuard &&
      this.attackRhythm <= 0 &&
      planarDistance <= style.idealRange + 0.12 &&
      this.rollChance(style.attackBias * 0.45 + difficulty.punishBonus * 0.2)
    ) {
      this.setAction(CpuAction.ATTACK, difficulty);
    }

    switch (this.action) {
      case CpuAction.CHASE:
        this.applySpacingMovement(controls, dx, dz, planarDistance, style.idealRange);
        break;
      case CpuAction.RETREAT:
        this.applyRetreatMovement(controls, dx, dz);
        break;
      case CpuAction.ATTACK:
        if (cpuState.attackCooldown > 0) {
          this.applySpacingMovement(controls, dx, dz, planarDistance, style.idealRange);
          break;
        }
        if (this.shouldUseSpecial(planarDistance, style, difficulty)) {
          controls.special = true;
          this.attackRhythm = style.attackCadence * difficulty.attackCadenceMultiplier;
          break;
        }
        if (
          context.punishWindow &&
          planarDistance <= style.grabRange &&
          this.rollChance(style.grabBias + difficulty.punishBonus * 0.35)
        ) {
          controls.grab = true;
          this.attackRhythm = style.attackCadence * difficulty.attackCadenceMultiplier;
          break;
        }
        if (planarDistance <= style.heavyRange) {
          controls.attack2 = true;
        } else if (planarDistance <= style.idealRange + 0.18) {
          controls.attack1 = true;
        } else {
          this.applySpacingMovement(controls, dx, dz, planarDistance, style.idealRange);
        }
        if (controls.attack1 || controls.attack2) {
          this.attackRhythm = style.attackCadence * difficulty.attackCadenceMultiplier;
        }
        break;
      case CpuAction.BLOCK:
        controls.shield = cpuState.guardMeter > 0;
        controls.parry =
          controls.shield &&
          context.playerAttacking &&
          this.rollChance(difficulty.parryChance + style.counterBias);
        break;
      case CpuAction.JUMP:
        controls.jump = !cpuState.isJumping;
        if (cpuY > playerY + 1 && cpuState.isJumping) {
          controls.dropThrough = true;
        }
        if (cpuState.isJumping) {
          this.applySpacingMovement(controls, dx, dz, planarDistance, style.idealRange);
        }
        break;
      case CpuAction.AIR_ATTACK:
        if (!cpuState.isJumping) {
          controls.jump = true;
        } else if (cpuState.attackCooldown <= 0) {
          controls.airAttack = true;
          this.attackRhythm = style.attackCadence * difficulty.attackCadenceMultiplier;
        } else {
          this.applySpacingMovement(controls, dx, dz, planarDistance, style.idealRange);
        }
        break;
      case CpuAction.DODGE:
        if (cpuState.dodgeCooldown <= 0) {
          controls.dodge = true;
          this.applyEvasiveDirection(controls, dx, dz);
        } else {
          this.applyRetreatMovement(controls, dx, dz);
        }
        break;
      case CpuAction.GRAB:
        if (planarDistance <= style.grabRange && cpuState.attackCooldown <= 0) {
          controls.grab = true;
          this.attackRhythm = style.attackCadence * difficulty.attackCadenceMultiplier;
        } else {
          this.applySpacingMovement(controls, dx, dz, planarDistance, style.idealRange);
        }
        break;
      case CpuAction.TAUNT:
      case CpuAction.IDLE:
      default:
        this.applyHoldPattern(controls, dx, dz, planarDistance, style.idealRange);
        break;
    }

    return controls;
  }

  private decideAction(
    context: DecisionContext,
    style: StyleTuning,
    difficulty: DifficultyTuning,
  ) {
    const weights = new Map<CpuAction, number>();
    const add = (action: CpuAction, weight: number) => {
      if (weight <= 0) return;
      weights.set(action, (weights.get(action) ?? 0) + weight);
    };

    if (context.playerAttacking) {
      add(CpuAction.BLOCK, style.blockBias + difficulty.defenseBonus);
      add(CpuAction.DODGE, style.dodgeBias + difficulty.defenseBonus * 0.75);
      add(CpuAction.RETREAT, style.retreatBias + 0.18);
      add(CpuAction.JUMP, style.jumpBias * 0.35);
    }

    if (context.punishWindow) {
      add(CpuAction.ATTACK, style.punishBias + difficulty.punishBonus);
      add(CpuAction.GRAB, style.grabBias + difficulty.punishBonus * 0.35);
    }

    if (context.lowGuard) {
      add(CpuAction.RETREAT, 0.45);
      add(CpuAction.DODGE, style.dodgeBias + 0.18);
      add(CpuAction.BLOCK, style.blockBias * 0.55);
    }

    switch (context.band) {
      case "close":
        add(CpuAction.ATTACK, style.attackBias * 1.1);
        add(CpuAction.GRAB, style.grabBias);
        add(CpuAction.RETREAT, style.retreatBias * 0.8);
        add(CpuAction.DODGE, style.dodgeBias * 0.5);
        break;
      case "mid":
        add(CpuAction.ATTACK, style.attackBias);
        add(CpuAction.CHASE, style.chaseBias);
        add(CpuAction.JUMP, style.jumpBias * 0.6);
        add(CpuAction.BLOCK, style.baitBias * 0.35);
        break;
      case "far":
        add(CpuAction.CHASE, style.chaseBias * 1.15);
        add(CpuAction.JUMP, style.jumpBias);
        add(CpuAction.AIR_ATTACK, style.airBias);
        add(CpuAction.ATTACK, style.specialBias + difficulty.specialBonus * 0.4);
        add(CpuAction.TAUNT, style.tauntBias);
        break;
    }

    if (!context.playerAttacking && context.band === "mid") {
      add(CpuAction.BLOCK, style.baitBias * 0.3);
      add(CpuAction.DODGE, style.baitBias * 0.2);
    }

    if (this.attackRhythm > 0) {
      add(CpuAction.CHASE, 0.28);
      add(CpuAction.RETREAT, 0.18);
    }

    const action = this.rollChance(difficulty.errorRate)
      ? this.degradeAction(context)
      : this.pickWeightedAction(weights);
    this.setAction(action, difficulty);
  }

  private pickWeightedAction(weights: Map<CpuAction, number>) {
    const entries = Array.from(weights.entries()).filter((entry) => entry[1] > 0);
    if (!entries.length) {
      return CpuAction.CHASE;
    }
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let threshold = this.rng() * total;
    for (const [action, weight] of entries) {
      threshold -= weight;
      if (threshold <= 0) return action;
    }
    return entries[entries.length - 1]?.[0] ?? CpuAction.CHASE;
  }

  private degradeAction(context: DecisionContext) {
    if (context.playerAttacking) {
      return context.band === "close" ? CpuAction.RETREAT : CpuAction.BLOCK;
    }
    if (context.band === "far") {
      return this.rollChance(0.5) ? CpuAction.TAUNT : CpuAction.JUMP;
    }
    return this.rollChance(0.6) ? CpuAction.CHASE : CpuAction.IDLE;
  }

  private setAction(action: CpuAction, difficulty: DifficultyTuning) {
    this.action = action;
    this.actionTimer = this.rollFrames(
      difficulty.reactionFrames,
      ACTION_DURATION_FACTORS[action],
    );
    if (
      action === CpuAction.CHASE ||
      action === CpuAction.RETREAT ||
      action === CpuAction.TAUNT
    ) {
      this.sidestepDirection = this.rollChance(0.5) ? 1 : -1;
    }
  }

  private rollFrames([min, max]: [number, number], factor: number) {
    const scaledMin = Math.max(1, Math.round(min * factor));
    const scaledMax = Math.max(scaledMin, Math.round(max * factor));
    return scaledMin + this.rng() * (scaledMax - scaledMin);
  }

  private rollChance(probability: number) {
    return this.rng() < clamp(probability, 0, 0.95);
  }

  private shouldUseSpecial(
    distance: number,
    style: StyleTuning,
    difficulty: DifficultyTuning,
  ) {
    if (distance < style.specialMinRange || distance > style.specialMaxRange) {
      return false;
    }
    return this.rollChance(style.specialBias + difficulty.specialBonus);
  }

  private applySpacingMovement(
    controls: CpuControlFrame,
    dx: number,
    dz: number,
    distance: number,
    targetDistance: number,
  ) {
    if (distance > targetDistance + 0.18) {
      this.applyApproachMovement(controls, dx, dz);
      return;
    }
    if (distance < targetDistance - 0.18) {
      this.applyRetreatMovement(controls, dx, dz);
      return;
    }
    if (this.sidestepDirection > 0) {
      controls.backward = Math.abs(dz) < 0.4 ? true : dz < 0;
    } else {
      controls.forward = Math.abs(dz) < 0.4 ? true : dz > 0;
    }
    if (Math.abs(dx) > 0.2) {
      controls.leftward = dx < 0;
      controls.rightward = dx > 0;
    }
  }

  private applyApproachMovement(
    controls: CpuControlFrame,
    dx: number,
    dz: number,
  ) {
    if (Math.abs(dx) > 0.12) {
      controls.leftward = dx < 0;
      controls.rightward = dx > 0;
    }
    if (Math.abs(dz) > 0.14) {
      controls.forward = dz < 0;
      controls.backward = dz > 0;
    }
  }

  private applyRetreatMovement(
    controls: CpuControlFrame,
    dx: number,
    dz: number,
  ) {
    controls.leftward = dx > 0;
    controls.rightward = dx < 0;
    controls.forward = dz > 0;
    controls.backward = dz < 0;
  }

  private applyEvasiveDirection(
    controls: CpuControlFrame,
    dx: number,
    dz: number,
  ) {
    if (Math.abs(dx) >= Math.abs(dz)) {
      controls.leftward = dx > 0;
      controls.rightward = dx < 0;
      return;
    }
    controls.forward = dz > 0;
    controls.backward = dz < 0;
  }

  private applyHoldPattern(
    controls: CpuControlFrame,
    dx: number,
    dz: number,
    distance: number,
    targetDistance: number,
  ) {
    if (distance > targetDistance + 0.35) {
      this.applyApproachMovement(controls, dx, dz);
      return;
    }
    if (distance < targetDistance - 0.25) {
      this.applyRetreatMovement(controls, dx, dz);
    }
  }
}

const resolveDistanceBand = (distance: number, idealRange: number): DistanceBand => {
  if (distance < idealRange * 0.8) return "close";
  if (distance > idealRange * 1.35) return "far";
  return "mid";
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const createEmptyControlFrame = (): CpuControlFrame => ({
  jump: false,
  forward: false,
  backward: false,
  leftward: false,
  rightward: false,
  dropThrough: false,
  shield: false,
  parry: false,
  attack1: false,
  attack2: false,
  special: false,
  airAttack: false,
  dodge: false,
  grab: false,
});
