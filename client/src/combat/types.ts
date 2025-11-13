export type MoveCategory =
  | "light"
  | "medium"
  | "heavy"
  | "special"
  | "grab"
  | "aerial";

export type MovePhase = "startup" | "active" | "recovery";

export interface FrameWindow {
  start: number; // inclusive frame index
  end: number; // inclusive frame index
}

export interface HitboxDefinition {
  id: string;
  frames: FrameWindow;
  radius: number;
  offset: [number, number, number];
  height: number;
  priority: number;
  damage: number;
  knockback: Knockback;
  guard: "high" | "mid" | "low" | "throw";
  hitLag: number;
  launchAngleDeg: number;
  causesTrip?: boolean;
  ignoresArmor?: boolean;
}

export interface HurtboxDefinition {
  id: string;
  radius: number;
  height: number;
  offset: [number, number, number];
  priority: number;
}

export interface Knockback {
  base: number;
  scaling: number;
  weightMultiplier?: number;
  gravityMultiplier?: number;
}

export interface ResourceCost {
  stamina?: number;
  guard?: number;
  specialMeter?: number;
}

export interface MoveBranch {
  to: string;
  window: FrameWindow;
  condition?: "onHit" | "onBlock" | "onWhiff";
}

export interface MoveDefinition {
  id: string;
  name: string;
  category: MoveCategory;
  totalFrames: number;
  windows: Record<MovePhase, FrameWindow>;
  hitboxes: HitboxDefinition[];
  hurtboxes?: HurtboxDefinition[];
  cancelBranches?: MoveBranch[];
  meterCost?: ResourceCost;
  meterGain?: ResourceCost;
  armorFrames?: FrameWindow[];
  invulnerableFrames?: FrameWindow[];
  aerialOnly?: boolean;
  groundedOnly?: boolean;
  autoTurn?: boolean;
}

export type FighterActionState =
  | "idle"
  | "walk"
  | "dash"
  | "jump"
  | "fall"
  | "attack"
  | "hitstun"
  | "blockstun"
  | "grabbed"
  | "landing"
  | "dodge"
  | "tech";

export interface FighterCombatState {
  action: FighterActionState;
  facing: 1 | -1;
  moveId?: string;
  moveFrame?: number;
  hitstunFrames: number;
  blockstunFrames: number;
  guardMeter: number;
  staminaMeter: number;
  specialMeter: number;
  comboCounter: number;
  juggleDecay: number;
  position: [number, number, number];
  velocity: [number, number, number];
  inAir: boolean;
}

export interface MoveContext {
  readonly delta: number;
  readonly inputs: Record<string, boolean>;
  readonly availableMoves: Record<string, MoveDefinition>;
  readonly state: FighterCombatState;
  readonly opponent: FighterCombatState;
}

export interface HitResolution {
  moveId: string;
  hitboxId: string;
  damage: number;
  knockbackVector: [number, number, number];
  hitLag: number;
  causesTrip: boolean;
  guardDamage: number;
  isCounterHit: boolean;
  launchAngleDeg: number;
  attackerAction: FighterActionState;
  defenderAction: FighterActionState;
}
