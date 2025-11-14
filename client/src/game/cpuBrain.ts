import { PlayerInputState } from "./combatBridge";
import { useControls } from "../lib/stores/useControls";

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
  RUSHDOWN,
  BALANCED,
  ZONER,
}

interface CpuBrainOptions {
  style?: CpuStyle;
  rng?: () => number;
}

export interface CpuControlFrame
  extends PlayerInputState,
    Record<
      "jump" | "forward" | "backward" | "leftward" | "rightward" | "dropThrough" | "shield",
      boolean
    > {}

export class CpuBrain {
  private action: CpuAction = CpuAction.IDLE;
  private actionTimer = 0;
  private attackRhythm = 0;
  private readonly style: CpuStyle;
  private readonly rng: () => number;
  private wasAirborne = false;
  private lastPlayerKnockback = 0;

  constructor({ style = CpuStyle.BALANCED, rng }: CpuBrainOptions = {}) {
    this.style = style;
    this.rng = rng ?? Math.random;
  }

  tick(
    cpuState: {
      position: [number, number, number];
      isJumping: boolean;
      attackCooldown: number;
      dodgeCooldown: number;
      guardMeter: number;
    },
    playerState: { position: [number, number, number]; isAttacking: boolean },
    delta: number,
  ): CpuControlFrame {
    const controls: CpuControlFrame = {
      jump: false,
      forward: false,
      backward: false,
      leftward: false,
      rightward: false,
      dropThrough: false,
      attack1: false,
      attack2: false,
      special: false,
      airAttack: false,
      dodge: false,
      grab: false,
      shield: false,
    };

    const [cpuX, cpuY, cpuZ] = cpuState.position;
    const [playerX, playerY, playerZ] = playerState.position;
    const dx = playerX - cpuX;
    const dz = playerZ - cpuZ;
    const planarDistance = Math.hypot(dx, dz);
    const tuning = STYLE_TUNINGS[this.style];

    this.actionTimer -= delta * 60;
    this.attackRhythm -= delta;
    if (this.actionTimer <= 0) {
      this.decideAction(planarDistance, playerState.isAttacking, cpuState.guardMeter, tuning);
    }
    if (this.attackRhythm <= 0 && planarDistance < tuning.targetRange + 0.25) {
      this.action = CpuAction.ATTACK;
      this.attackRhythm = tuning.attackCadence;
      this.actionTimer = 18;
    }

    const chase = () => {
      if (Math.abs(dx) > 0.15) {
        controls.leftward = dx < 0;
        controls.rightward = dx > 0;
      }
      if (Math.abs(dz) > 0.15) {
        controls.forward = dz < 0;
        controls.backward = dz > 0;
      }
    };

    switch (this.action) {
      case CpuAction.CHASE:
        chase();
        break;
      case CpuAction.RETREAT:
        controls.leftward = dx > 0;
        controls.rightward = dx < 0;
        controls.forward = dz > 0;
        controls.backward = dz < 0;
        break;
      case CpuAction.ATTACK: {
        const preferSpecial =
          planarDistance > 1.2 &&
          planarDistance < 2.4 &&
          tuning.specialAggro > this.rng();
        if (preferSpecial) {
          controls.special = cpuState.attackCooldown <= 0;
        } else if (planarDistance < 1.1) {
          controls.attack2 = cpuState.attackCooldown <= 0;
        } else if (planarDistance < 1.9) {
          controls.attack1 = cpuState.attackCooldown <= 0;
        } else {
          chase();
        }
        break;
      }
      case CpuAction.BLOCK:
        controls.shield = cpuState.guardMeter > 10;
        break;
      case CpuAction.JUMP:
        controls.jump = !cpuState.isJumping;
        if (cpuY > playerY + 1 && cpuState.isJumping) {
          controls.dropThrough = true;
        }
        break;
      case CpuAction.AIR_ATTACK:
        if (cpuState.isJumping) {
          controls.airAttack = true;
        }
        break;
      case CpuAction.DODGE:
        if (cpuState.dodgeCooldown <= 0) {
          controls.dodge = true;
          controls.leftward = this.rng() > 0.5;
          controls.rightward = !controls.leftward;
        }
        break;
      case CpuAction.GRAB:
        controls.grab = planarDistance < 1.35;
        break;
      case CpuAction.TAUNT:
      case CpuAction.IDLE:
      default:
        chase();
        break;
    }
    this.wasAirborne = cpuState.isJumping;

    return controls;
  }

  private decideAction(
    distance: number,
    playerAttacking: boolean,
    guardMeter: number,
    tuning: StyleTuning,
  ) {
    const rand = this.rng();
    if (playerAttacking && rand < tuning.blockBias) {
      this.action = CpuAction.BLOCK;
      this.actionTimer = 25;
      return;
    }

    if (distance < tuning.targetRange * 0.75) {
      if (rand < tuning.attackAggro) {
        this.action = CpuAction.ATTACK;
        this.actionTimer = 18;
      } else if (rand < tuning.attackAggro + tuning.dodgeBias) {
        this.action = CpuAction.DODGE;
        this.actionTimer = 12;
      } else if (rand < tuning.attackAggro + tuning.dodgeBias + tuning.grabBias) {
        this.action = CpuAction.GRAB;
        this.actionTimer = 12;
      } else {
        this.action = CpuAction.RETREAT;
        this.actionTimer = 18;
      }
      return;
    }

    if (distance > tuning.targetRange * 1.4) {
      if (rand < tuning.chaseBias) {
        this.action = CpuAction.CHASE;
        this.actionTimer = 32;
      } else if (rand < tuning.chaseBias + tuning.airBias) {
        this.action = CpuAction.JUMP;
        this.actionTimer = 12;
      } else if (rand < tuning.chaseBias + tuning.airBias * 1.5) {
        this.action = CpuAction.AIR_ATTACK;
        this.actionTimer = 16;
      } else {
        this.action = CpuAction.TAUNT;
        this.actionTimer = 12;
      }
      return;
    }

    if (guardMeter < 15 && rand < tuning.dodgeBias + 0.15) {
      this.action = CpuAction.DODGE;
      this.actionTimer = 14;
      return;
    }

    if (rand < tuning.attackAggro) {
      this.action = CpuAction.ATTACK;
      this.actionTimer = 20;
    } else if (rand < tuning.attackAggro + tuning.blockBias) {
      this.action = CpuAction.BLOCK;
      this.actionTimer = 20;
    } else if (rand < tuning.attackAggro + tuning.blockBias + tuning.airBias) {
      this.action = CpuAction.JUMP;
      this.actionTimer = 12;
    } else {
      this.action = CpuAction.CHASE;
      this.actionTimer = 25;
    }
  }
}

interface StyleTuning {
  targetRange: number;
  attackAggro: number;
  blockBias: number;
  chaseBias: number;
  dodgeBias: number;
  grabBias: number;
  airBias: number;
  specialAggro: number;
  attackCadence: number;
}

const STYLE_TUNINGS: Record<CpuStyle, StyleTuning> = {
  [CpuStyle.RUSHDOWN]: {
    targetRange: 1.1,
    attackAggro: 0.65,
    blockBias: 0.15,
    chaseBias: 0.8,
    dodgeBias: 0.15,
    grabBias: 0.18,
    airBias: 0.2,
    specialAggro: 0.35,
    attackCadence: 1.1,
  },
  [CpuStyle.BALANCED]: {
    targetRange: 1.4,
    attackAggro: 0.45,
    blockBias: 0.25,
    chaseBias: 0.65,
    dodgeBias: 0.2,
    grabBias: 0.12,
    airBias: 0.2,
    specialAggro: 0.25,
    attackCadence: 1.6,
  },
  [CpuStyle.ZONER]: {
    targetRange: 1.9,
    attackAggro: 0.3,
    blockBias: 0.35,
    chaseBias: 0.45,
    dodgeBias: 0.25,
    grabBias: 0.08,
    airBias: 0.3,
    specialAggro: 0.5,
    attackCadence: 2.0,
  },
};
