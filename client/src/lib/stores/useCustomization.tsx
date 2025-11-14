import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Define enhanced color themes with special effects
export const colorThemes = {
  blue: {
    name: 'Ocean Warrior',
    primary: '#2980b9',
    secondary: '#3498db',
    tertiary: '#1abc9c',
    emissive: '#4aa3df',
    glow: '#00d4ff',
    particle: '#87ceeb',
    metalness: 0.3,
    roughness: 0.4,
    specialEffect: 'water'
  },
  red: {
    name: 'Fire Champion',
    primary: '#c0392b',
    secondary: '#e74c3c',
    tertiary: '#e67e22',
    emissive: '#ff6b6b',
    glow: '#ff4444',
    particle: '#ff8c00',
    metalness: 0.2,
    roughness: 0.6,
    specialEffect: 'fire'
  },
  green: {
    name: 'Nature Guardian',
    primary: '#27ae60',
    secondary: '#2ecc71',
    tertiary: '#16a085',
    emissive: '#55efc4',
    glow: '#00ff88',
    particle: '#90ee90',
    metalness: 0.1,
    roughness: 0.7,
    specialEffect: 'nature'
  },
  purple: {
    name: 'Mystic Sorcerer',
    primary: '#8e44ad',
    secondary: '#9b59b6',
    tertiary: '#6c3483',
    emissive: '#a29bfe',
    glow: '#dd88ff',
    particle: '#dda0dd',
    metalness: 0.4,
    roughness: 0.3,
    specialEffect: 'magic'
  },
  orange: {
    name: 'Solar Striker',
    primary: '#d35400',
    secondary: '#e67e22',
    tertiary: '#f39c12',
    emissive: '#ffa502',
    glow: '#ffaa00',
    particle: '#ffd700',
    metalness: 0.6,
    roughness: 0.2,
    specialEffect: 'solar'
  },
  pink: {
    name: 'Sakura Assassin',
    primary: '#e84393',
    secondary: '#fd79a8',
    tertiary: '#ff7675',
    emissive: '#ff9ff3',
    glow: '#ffb3da',
    particle: '#ffb6c1',
    metalness: 0.2,
    roughness: 0.5,
    specialEffect: 'sakura'
  },
  black: {
    name: 'Shadow Hunter',
    primary: '#2c3e50',
    secondary: '#34495e',
    tertiary: '#212121',
    emissive: '#636e72',
    glow: '#555555',
    particle: '#778899',
    metalness: 0.8,
    roughness: 0.1,
    specialEffect: 'shadow'
  },
  white: {
    name: 'Light Paladin',
    primary: '#ecf0f1',
    secondary: '#bdc3c7',
    tertiary: '#7f8c8d',
    emissive: '#dfe6e9',
    glow: '#ffffff',
    particle: '#f0f8ff',
    metalness: 0.1,
    roughness: 0.8,
    specialEffect: 'light'
  },
  rainbow: {
    name: 'Prism Warrior',
    primary: '#ff6b6b',
    secondary: '#4ecdc4',
    tertiary: '#45b7d1',
    emissive: '#96ceb4',
    glow: '#ffeaa7',
    particle: '#fd79a8',
    metalness: 0.5,
    roughness: 0.3,
    specialEffect: 'rainbow'
  },
  cyber: {
    name: 'Cyber Ninja',
    primary: '#00ff88',
    secondary: '#00ccff',
    tertiary: '#ff00ff',
    emissive: '#88ffff',
    glow: '#00ffff',
    particle: '#00ff00',
    metalness: 0.9,
    roughness: 0.1,
    specialEffect: 'cyber'
  }
};

// Define enhanced figure styles with unique characteristics
export const figureStyles = {
  normal: {
    name: 'Balanced Fighter',
    headSize: 0.25,
    bodyLength: 0.8,
    limbThickness: 0.08,
    shoulderWidth: 0.4,
    metalness: 0.1,
    roughness: 0.7,
    bodyScale: 1.0,
    glowIntensity: 0.2,
    particleCount: 5,
    animationMultiplier: 1.0,
    specialGeometry: null,
    outlineWidth: 0.04,
    silhouette: {
      arms: { length: 0.7, base: 1, mid: 0.85, tip: 0.6, curvature: 0.02 },
      legs: { length: 0.85, base: 1.15, mid: 0.95, tip: 0.65, curvature: -0.015 },
    },
  },
  bulky: {
    name: 'Heavy Bruiser',
    headSize: 0.3,
    bodyLength: 0.7,
    limbThickness: 0.12,
    shoulderWidth: 0.6,
    metalness: 0.2,
    roughness: 0.8,
    bodyScale: 1.2,
    glowIntensity: 0.1,
    particleCount: 3,
    animationMultiplier: 0.8,
    specialGeometry: 'angular',
    outlineWidth: 0.06,
    silhouette: {
      arms: { length: 0.65, base: 1.2, mid: 1.0, tip: 0.7, curvature: 0.005 },
      legs: { length: 0.8, base: 1.3, mid: 1.05, tip: 0.75, curvature: -0.02 },
    },
  },
  slim: {
    name: 'Speed Demon',
    headSize: 0.22,
    bodyLength: 0.9,
    limbThickness: 0.06,
    shoulderWidth: 0.3,
    metalness: 0.05,
    roughness: 0.6,
    bodyScale: 0.9,
    glowIntensity: 0.4,
    particleCount: 8,
    animationMultiplier: 1.3,
    specialGeometry: 'streamlined',
    outlineWidth: 0.035,
    silhouette: {
      arms: { length: 0.78, base: 0.85, mid: 0.7, tip: 0.45, curvature: 0.05 },
      legs: { length: 0.92, base: 1.0, mid: 0.8, tip: 0.5, curvature: -0.04 },
    },
  },
  cartoonish: {
    name: 'Bouncy Brawler',
    headSize: 0.35,
    bodyLength: 0.6,
    limbThickness: 0.09,
    shoulderWidth: 0.5,
    metalness: 0.3,
    roughness: 0.5,
    bodyScale: 1.1,
    glowIntensity: 0.6,
    particleCount: 12,
    animationMultiplier: 1.2,
    specialGeometry: 'rounded',
    outlineWidth: 0.05,
    silhouette: {
      arms: { length: 0.68, base: 1.05, mid: 0.9, tip: 0.55, curvature: 0.08 },
      legs: { length: 0.82, base: 1.2, mid: 0.95, tip: 0.6, curvature: -0.03 },
    },
  },
  robot: {
    name: 'Cyber Warrior',
    headSize: 0.28,
    bodyLength: 0.75,
    limbThickness: 0.1,
    shoulderWidth: 0.45,
    metalness: 0.8,
    roughness: 0.2,
    bodyScale: 1.05,
    glowIntensity: 0.8,
    particleCount: 6,
    animationMultiplier: 0.9,
    specialGeometry: 'mechanical',
    outlineWidth: 0.045,
    silhouette: {
      arms: { length: 0.7, base: 1.1, mid: 0.95, tip: 0.6, curvature: 0 },
      legs: { length: 0.84, base: 1.2, mid: 1.0, tip: 0.7, curvature: 0 },
    },
  },
  ethereal: {
    name: 'Ghost Phantom',
    headSize: 0.26,
    bodyLength: 0.85,
    limbThickness: 0.07,
    shoulderWidth: 0.35,
    metalness: 0.0,
    roughness: 0.1,
    bodyScale: 1.0,
    glowIntensity: 1.0,
    particleCount: 15,
    animationMultiplier: 1.1,
    specialGeometry: 'translucent',
    outlineWidth: 0.03,
    silhouette: {
      arms: { length: 0.82, base: 0.9, mid: 0.7, tip: 0.4, curvature: 0.07 },
      legs: { length: 0.95, base: 1.0, mid: 0.7, tip: 0.4, curvature: -0.05 },
    },
  },
  crystal: {
    name: 'Diamond Guardian',
    headSize: 0.27,
    bodyLength: 0.78,
    limbThickness: 0.09,
    shoulderWidth: 0.42,
    metalness: 0.1,
    roughness: 0.0,
    bodyScale: 1.0,
    glowIntensity: 0.9,
    particleCount: 10,
    animationMultiplier: 1.0,
    specialGeometry: 'crystalline',
    outlineWidth: 0.05,
    silhouette: {
      arms: { length: 0.72, base: 1.05, mid: 0.9, tip: 0.55, curvature: 0.01 },
      legs: { length: 0.88, base: 1.15, mid: 0.95, tip: 0.6, curvature: -0.01 },
    },
  }
};

// Define enhanced accessories with special effects
export const accessories = {
  none: {
    name: 'None',
    geometry: null,
    effect: null
  },
  wizard_hat: {
    name: 'Wizard Hat',
    geometry: {
      type: 'cone',
      args: [0.15, 0.4, 16],
      position: [0, 0.35, 0]
    },
    effect: 'sparkles',
    emissive: true,
    animated: true,
    rimColor: '#9966ff',
    shadeBands: 4,
    lineWidth: 0.05,
    outlineColor: '#220066',
    glow: 0.3
  },
  cyber_visor: {
    name: 'Cyber Visor',
    geometry: {
      type: 'boxGeometry',
      args: [0.25, 0.08, 0.15],
      position: [0, 0.1, 0.18]
    },
    effect: 'scan_lines',
    emissive: true,
    animated: true,
    rimColor: '#00ffff',
    shadeBands: 2,
    lineWidth: 0.03,
    outlineColor: '#003333',
    glow: 0.4
  },
  energy_cape: {
    name: 'Energy Cape',
    geometry: {
      type: 'planeGeometry',
      args: [0.5, 1.0],
      position: [0, -0.4, -0.25],
      rotation: [0.3, 0, 0]
    },
    effect: 'flowing_energy',
    emissive: true,
    animated: true,
    rimColor: '#ff00ff',
    shadeBands: 3,
    lineWidth: 0.04,
    outlineColor: '#440044',
    glow: 0.35
  },
  flame_sword: {
    name: 'Flame Sword',
    geometry: {
      type: 'boxGeometry',
      args: [0.06, 0.7, 0.06],
      position: [0.4, 0.2, 0],
      rotation: [0, 0, Math.PI / 4]
    },
    effect: 'fire_trail',
    emissive: true,
    animated: true,
    rimColor: '#ff6600',
    shadeBands: 3,
    lineWidth: 0.04,
    outlineColor: '#330000',
    glow: 0.4
  },
  crystal_shield: {
    name: 'Crystal Shield',
    geometry: {
      type: 'octahedronGeometry',
      args: [0.25, 2],
      position: [-0.35, 0.2, 0.1],
      rotation: [0, 0.3, 0]
    },
    effect: 'crystal_glow',
    emissive: true,
    animated: true,
    rimColor: '#66ffff',
    shadeBands: 4,
    lineWidth: 0.05,
    outlineColor: '#003366',
    glow: 0.45
  },
  ninja_mask: {
    name: 'Ninja Mask',
    geometry: {
      type: 'sphereGeometry',
      args: [0.27, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2],
      position: [0, -0.05, 0]
    },
    effect: 'shadow_aura',
    emissive: false,
    animated: true,
    rimColor: '#333333',
    shadeBands: 2,
    lineWidth: 0.06,
    outlineColor: '#000000',
    glow: 0.05
  },
  halo: {
    name: 'Divine Halo',
    geometry: {
      type: 'torusGeometry',
      args: [0.2, 0.02, 16, 32],
      position: [0, 0.45, 0],
      rotation: [Math.PI / 2, 0, 0]
    },
    effect: 'divine_light',
    emissive: true,
    animated: true,
    rimColor: '#ffff99',
    shadeBands: 4,
    lineWidth: 0.04,
    outlineColor: '#666600',
    glow: 0.5
  },
  demon_horns: {
    name: 'Demon Horns',
    geometry: [
      {
        type: 'coneGeometry',
        args: [0.04, 0.2, 8],
        position: [-0.1, 0.3, 0],
        rotation: [0, 0, -Math.PI / 6]
      },
      {
        type: 'coneGeometry',
        args: [0.04, 0.2, 8],
        position: [0.1, 0.3, 0],
        rotation: [0, 0, Math.PI / 6]
      }
    ],
    effect: 'dark_energy',
    emissive: true,
    animated: true,
    rimColor: '#ff3333',
    shadeBands: 2,
    lineWidth: 0.05,
    outlineColor: '#660000',
    glow: 0.35
  },
  wings: {
    name: 'Angel Wings',
    geometry: [
      {
        type: 'planeGeometry',
        args: [0.3, 0.6],
        position: [-0.25, 0, -0.1],
        rotation: [0, Math.PI / 4, Math.PI / 8]
      },
      {
        type: 'planeGeometry',
        args: [0.3, 0.6],
        position: [0.25, 0, -0.1],
        rotation: [0, -Math.PI / 4, -Math.PI / 8]
      }
    ],
    effect: 'feather_glow',
    emissive: true,
    animated: true,
    rimColor: '#ffffff',
    shadeBands: 4,
    lineWidth: 0.03,
    outlineColor: '#666666',
    glow: 0.4
  },
  crown: {
    name: 'Royal Crown',
    geometry: {
      type: 'cylinderGeometry',
      args: [0.18, 0.15, 0.12, 8],
      position: [0, 0.32, 0]
    },
    effect: 'royal_shimmer',
    emissive: true,
    animated: true,
    rimColor: '#ffcc00',
    shadeBands: 4,
    lineWidth: 0.05,
    outlineColor: '#664400',
    glow: 0.45
  }
};

// Animation style variations
export const animationStyles = {
  normal: {
    attackSpeed: 1.0,
    jumpHeight: 1.0,
    idleIntensity: 1.0
  },
  fast: {
    attackSpeed: 1.5,
    jumpHeight: 1.2,
    idleIntensity: 1.3
  },
  powerful: {
    attackSpeed: 0.8,
    jumpHeight: 1.0,
    idleIntensity: 0.8
  },
  acrobatic: {
    attackSpeed: 1.2,
    jumpHeight: 1.4,
    idleIntensity: 1.1
  },
  robotic: {
    attackSpeed: 0.9,
    jumpHeight: 0.9,
    idleIntensity: 0.5
  }
};

// Ink style presets for procedural rendering
export const inkStyles = {
  classic: {
    name: 'Classic Toon',
    description: 'Balanced cel-shading with clean outlines',
    rimColor: '#ffffff',
    shadeBands: 3,
    lineWidth: 0.04,
    glow: 0,
    outlineColor: '#050505',
  },
  bold: {
    name: 'Bold Lines',
    description: 'Thick outlines with strong contrast',
    rimColor: '#cccccc',
    shadeBands: 2,
    lineWidth: 0.08,
    glow: 0,
    outlineColor: '#000000',
  },
  soft: {
    name: 'Soft Shading',
    description: 'Smooth gradients with subtle highlights',
    rimColor: '#f0f0f0',
    shadeBands: 5,
    lineWidth: 0.02,
    glow: 0.05,
    outlineColor: '#202020',
  },
  neon: {
    name: 'Neon Glow',
    description: 'Bright glow with vibrant rim lighting',
    rimColor: '#00ffff',
    shadeBands: 3,
    lineWidth: 0.05,
    glow: 0.25,
    outlineColor: '#001a1a',
  },
  sketchy: {
    name: 'Sketchy',
    description: 'Hand-drawn aesthetic with rough lines',
    rimColor: '#dddddd',
    shadeBands: 2,
    lineWidth: 0.06,
    glow: 0,
    outlineColor: '#1a1a1a',
  },
  minimal: {
    name: 'Minimal',
    description: 'Clean and simple with thin outlines',
    rimColor: '#ffffff',
    shadeBands: 2,
    lineWidth: 0.01,
    glow: 0,
    outlineColor: '#404040',
  },
  comic: {
    name: 'Comic Book',
    description: 'High contrast with thick black outlines',
    rimColor: '#e0e0e0',
    shadeBands: 2,
    lineWidth: 0.09,
    glow: 0,
    outlineColor: '#000000',
  },
  ethereal: {
    name: 'Ethereal',
    description: 'Soft glow with many shade bands',
    rimColor: '#c8e6ff',
    shadeBands: 5,
    lineWidth: 0.03,
    glow: 0.15,
    outlineColor: '#0a0a14',
  },
};

export type InkStyle = keyof typeof inkStyles;

export interface InkOverrides {
  rimColor?: string;
  shadeBands?: number;
  lineWidth?: number;
  glow?: number;
  outlineColor?: string;
}

export interface InkParams {
  rimColor: string;
  shadeBands: number;
  lineWidth: number;
  glow: number;
  outlineColor: string;
}

export const mergeInkParams = (
  baseStyle: InkStyle,
  overrides?: InkOverrides | null
): InkParams => {
  const base = inkStyles[baseStyle];
  return {
    rimColor: overrides?.rimColor ?? base.rimColor,
    shadeBands: overrides?.shadeBands ?? base.shadeBands,
    lineWidth: overrides?.lineWidth ?? base.lineWidth,
    glow: overrides?.glow ?? base.glow,
    outlineColor: overrides?.outlineColor ?? base.outlineColor,
  };
};

// Type definitions & economy data
export type ColorTheme = keyof typeof colorThemes;
export type FigureStyle = keyof typeof figureStyles;
export type Accessory = keyof typeof accessories;
export type AnimationStyle = keyof typeof animationStyles;

export const colorThemeCosts: Record<ColorTheme, number> = {
  blue: 0,
  red: 0,
  green: 150,
  purple: 150,
  orange: 250,
  pink: 250,
  black: 400,
  white: 400,
  rainbow: 650,
  cyber: 650,
};

export const figureStyleCosts: Record<FigureStyle, number> = {
  normal: 0,
  bulky: 350,
  slim: 350,
  cartoonish: 450,
  robot: 500,
  ethereal: 550,
  crystal: 600,
};

export const accessoryCosts: Record<Accessory, number> = {
  none: 0,
  wizard_hat: 200,
  cyber_visor: 220,
  energy_cape: 320,
  flame_sword: 420,
  crystal_shield: 360,
  ninja_mask: 240,
  halo: 480,
  demon_horns: 330,
  wings: 650,
  crown: 520,
};

export const animationStyleCosts: Record<AnimationStyle, number> = {
  normal: 0,
  fast: 400,
  powerful: 320,
  acrobatic: 420,
  robotic: 300,
};

const DEFAULT_UNLOCKED_COLOR_THEMES: ColorTheme[] = ["blue", "red", "green"];
const DEFAULT_UNLOCKED_FIGURE_STYLES: FigureStyle[] = ["normal"];
const DEFAULT_UNLOCKED_ACCESSORIES: Accessory[] = ["none", "wizard_hat"];
const DEFAULT_UNLOCKED_ANIMATION_STYLES: AnimationStyle[] = ["normal"];
const DEFAULT_COINS = 0;
const MAX_COINS = 999999;

export type CosmeticSlot =
  | "colorTheme"
  | "figureStyle"
  | "accessory"
  | "animationStyle";

type UnlockState = {
  colorThemes: ColorTheme[];
  figureStyles: FigureStyle[];
  accessories: Accessory[];
  animationStyles: AnimationStyle[];
};

const DEFAULT_UNLOCK_STATE: UnlockState = {
  colorThemes: DEFAULT_UNLOCKED_COLOR_THEMES,
  figureStyles: DEFAULT_UNLOCKED_FIGURE_STYLES,
  accessories: DEFAULT_UNLOCKED_ACCESSORIES,
  animationStyles: DEFAULT_UNLOCKED_ANIMATION_STYLES,
};

const createInitialUnlockState = (): UnlockState => ({
  colorThemes: [...DEFAULT_UNLOCK_STATE.colorThemes],
  figureStyles: [...DEFAULT_UNLOCK_STATE.figureStyles],
  accessories: [...DEFAULT_UNLOCK_STATE.accessories],
  animationStyles: [...DEFAULT_UNLOCK_STATE.animationStyles],
});

const clampCoinValue = (value: number) =>
  Math.min(MAX_COINS, Math.max(0, Math.floor(value)));

const appendIfMissing = <T extends string>(collection: T[], value: T): T[] =>
  collection.includes(value) ? collection : [...collection, value];

const normalizeCosmeticId = (
  slot: CosmeticSlot,
  id: string,
): ColorTheme | FigureStyle | Accessory | AnimationStyle | undefined => {
  switch (slot) {
    case "colorTheme":
      return hasOwn(colorThemes, id) ? (id as ColorTheme) : undefined;
    case "figureStyle":
      return hasOwn(figureStyles, id) ? (id as FigureStyle) : undefined;
    case "accessory":
      return hasOwn(accessories, id) ? (id as Accessory) : undefined;
    case "animationStyle":
      return hasOwn(animationStyles, id) ? (id as AnimationStyle) : undefined;
    default:
      return undefined;
  }
};

const MAX_LEDGER_ENTRIES = 12;

const pushLedgerEntry = (entries: CoinLedgerEntry[], entry: CoinLedgerEntry) => {
  const next = [entry, ...entries];
  if (next.length <= MAX_LEDGER_ENTRIES) return next;
  return next.slice(0, MAX_LEDGER_ENTRIES);
};

const COST_TABLES = {
  colorTheme: colorThemeCosts,
  figureStyle: figureStyleCosts,
  accessory: accessoryCosts,
  animationStyle: animationStyleCosts,
} as const;

type CostTableMap = typeof COST_TABLES;

const hasOwn = <T extends Record<string, unknown>>(
  obj: T,
  key: string | number | symbol,
): key is keyof T => Object.prototype.hasOwnProperty.call(obj, key);

const createEconomyProfileId = () =>
  `eco_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

const mergeUnlockLists = <T extends string>(
  slot: CosmeticSlot,
  current: T[],
  incoming: readonly string[],
): T[] => {
  const merged = new Set<string>(current);
  incoming.forEach((id) => {
    const normalized = normalizeCosmeticId(slot, id);
    if (normalized) {
      merged.add(normalized);
    }
  });
  return Array.from(merged) as T[];
};

export interface CoinLedgerEntry {
  direction: "credit" | "debit";
  amount: number;
  reason: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface CoinAwardPayload {
  amount: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface CoinAwardResult {
  amount: number;
  balance: number;
  wasCapped: boolean;
}

export interface CoinDebitResult {
  success: boolean;
  cost?: number;
  balance: number;
  error?: "insufficient_funds" | "invalid_amount";
}

export interface PurchaseResult {
  success: boolean;
  balance: number;
  cost?: number;
  error?:
    | "insufficient_funds"
    | "already_unlocked"
    | "unknown_cosmetic"
    | "invalid_amount";
}

export interface EconomyUnlockSnapshot {
  colorThemes: ColorTheme[];
  figureStyles: FigureStyle[];
  accessories: Accessory[];
  animationStyles: AnimationStyle[];
}

export interface EconomySyncPayload {
  profileId: string;
  coins: number;
  lifetimeCoins: number;
  unlocks: EconomyUnlockSnapshot;
  lastCoinEvent?: CoinLedgerEntry;
}

// Interface for all customization options
export interface CustomizationOptions {
  playerColorTheme: ColorTheme;
  playerFigureStyle: FigureStyle;
  playerAccessory: Accessory;
  playerAccessoryColor: string;
  playerAnimationStyle: string;
  playerInkStyle: InkStyle;
  playerInkOverrides: InkOverrides | null;
  
  cpuColorTheme: ColorTheme;
  cpuFigureStyle: FigureStyle;
  cpuAccessory: Accessory;
  cpuAccessoryColor: string;
  cpuAnimationStyle: string;
  cpuInkStyle: InkStyle;
  cpuInkOverrides: InkOverrides | null;
}

// Saved character profile interface
export interface SavedCharacter {
  id: string;
  name: string;
  colorTheme: ColorTheme;
  figureStyle: FigureStyle;
  accessory: Accessory;
  accessoryColor: string;
  animationStyle: string;
  inkStyle: InkStyle;
  inkOverrides?: InkOverrides | null;
  createdAt: string;
  thumbnail?: string;
}

// Zustand store interface with customization options and actions
interface CustomizationState extends CustomizationOptions {
  economyProfileId: string;
  coins: number;
  lifetimeCoinsEarned: number;
  lastCoinEvent?: CoinLedgerEntry;
  recentCoinEvents: CoinLedgerEntry[];
  unlockedColorThemes: ColorTheme[];
  unlockedFigureStyles: FigureStyle[];
  unlockedAccessories: Accessory[];
  unlockedAnimationStyles: AnimationStyle[];
  lastEconomySyncAt?: string;
  economySyncError?: string;
  favoritePresetIds: string[];
  collectionsTourSeen: boolean;
  
  // Saved characters
  savedCharacters: SavedCharacter[];
  
  // Actions to update customization options
  setPlayerColorTheme: (theme: ColorTheme) => void;
  setPlayerFigureStyle: (style: FigureStyle) => void;
  setPlayerAccessory: (accessory: Accessory, color?: string) => void;
  setPlayerAnimationStyle: (style: string) => void;
  setPlayerInkStyle: (style: InkStyle) => void;
  setPlayerInkOverrides: (overrides: InkOverrides | null) => void;
  
  setCPUColorTheme: (theme: ColorTheme) => void;
  setCPUFigureStyle: (style: FigureStyle) => void;
  setCPUAccessory: (accessory: Accessory, color?: string) => void;
  setCPUAnimationStyle: (style: string) => void;
  setCPUInkStyle: (style: InkStyle) => void;
  setCPUInkOverrides: (overrides: InkOverrides | null) => void;
  
  // Character saving and loading
  saveCharacter: (name: string, isPlayer: boolean) => void;
  loadCharacter: (character: SavedCharacter, isPlayer: boolean) => void;
  deleteCharacter: (id: string) => void;
  addPresetToSaved: (preset: PresetSnapshot, options?: { name?: string; isPlayer?: boolean }) => void;
  
  // Helper functions to get computed values
  getPlayerColors: () => typeof colorThemes[ColorTheme];
  getPlayerStyle: () => typeof figureStyles[FigureStyle];
  getPlayerAccessory: () => any;
  getPlayerInkParams: () => InkParams;
  
  getCPUColors: () => typeof colorThemes[ColorTheme];
  getCPUStyle: () => typeof figureStyles[FigureStyle];
  getCPUAccessory: () => any;
  getCPUInkParams: () => InkParams;
  
  // Reset customizations
  resetCustomizations: () => void;
  
  // Economy actions
  earnCoins: (payload: CoinAwardPayload) => CoinAwardResult;
  spendCoins: (amount: number, reason?: string) => CoinDebitResult;
  purchaseCosmetic: (slot: CosmeticSlot, id: string) => PurchaseResult;
  unlockCosmetic: (slot: CosmeticSlot, id: string) => boolean;
  isCosmeticUnlocked: (slot: CosmeticSlot, id: string) => boolean;
  getCostForCosmetic: (slot: CosmeticSlot, id: string) => number | undefined;
  getEconomySnapshot: () => EconomySyncPayload;
  hydrateEconomySnapshot: (payload: EconomySyncPayload & { updatedAt?: string }) => void;
  setEconomySyncError: (message?: string) => void;
  markEconomySyncComplete: () => void;
  togglePresetFavorite: (presetId: string) => void;
  markCollectionsTourSeen: () => void;
}

interface PresetSnapshot {
  name: string;
  colorTheme: ColorTheme;
  figureStyle: FigureStyle;
  accessory: Accessory;
  accessoryColor: string;
  animationStyle: AnimationStyle;
  inkStyle?: InkStyle;
}

// Default customization settings
const DEFAULT_CUSTOMIZATION: CustomizationOptions = {
  playerColorTheme: 'blue',
  playerFigureStyle: 'normal',
  playerAccessory: 'none',
  playerAccessoryColor: '#ffffff',
  playerAnimationStyle: 'normal',
  playerInkStyle: 'classic',
  playerInkOverrides: null,
  
  cpuColorTheme: 'red',
  cpuFigureStyle: 'normal',
  cpuAccessory: 'none',
  cpuAccessoryColor: '#ffffff',
  cpuAnimationStyle: 'normal',
  cpuInkStyle: 'classic',
  cpuInkOverrides: null,
};

// Create the Zustand store with persistence
export const useCustomization = create<CustomizationState>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_CUSTOMIZATION,
      economyProfileId: createEconomyProfileId(),
      coins: DEFAULT_COINS,
      lifetimeCoinsEarned: 0,
      lastCoinEvent: undefined,
      recentCoinEvents: [],
      lastEconomySyncAt: undefined,
      economySyncError: undefined,
      favoritePresetIds: [],
      collectionsTourSeen: false,
      unlockedColorThemes: [...DEFAULT_UNLOCKED_COLOR_THEMES],
      unlockedFigureStyles: [...DEFAULT_UNLOCKED_FIGURE_STYLES],
      unlockedAccessories: [...DEFAULT_UNLOCKED_ACCESSORIES],
      unlockedAnimationStyles: [...DEFAULT_UNLOCKED_ANIMATION_STYLES],
      savedCharacters: [],
      
      // Actions for player customization
      setPlayerColorTheme: (theme) => set({ playerColorTheme: theme }),
      setPlayerFigureStyle: (style) => set({ playerFigureStyle: style }),
      setPlayerAccessory: (accessory, color = '#ffffff') => set({ 
        playerAccessory: accessory,
        playerAccessoryColor: color 
      }),
      setPlayerAnimationStyle: (style) => set({ playerAnimationStyle: style }),
      setPlayerInkStyle: (style) => set({ playerInkStyle: style }),
      setPlayerInkOverrides: (overrides) => set({ playerInkOverrides: overrides }),
      
      // Actions for CPU customization
      setCPUColorTheme: (theme) => set({ cpuColorTheme: theme }),
      setCPUFigureStyle: (style) => set({ cpuFigureStyle: style }),
      setCPUAccessory: (accessory, color = '#ffffff') => set({ 
        cpuAccessory: accessory,
        cpuAccessoryColor: color 
      }),
      setCPUAnimationStyle: (style) => set({ cpuAnimationStyle: style }),
      setCPUInkStyle: (style) => set({ cpuInkStyle: style }),
      setCPUInkOverrides: (overrides) => set({ cpuInkOverrides: overrides }),
      
      // Character saving and loading
      saveCharacter: (name, isPlayer) => {
        const state = get();
        const newCharacter: SavedCharacter = {
          id: `character_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name,
          colorTheme: isPlayer ? state.playerColorTheme : state.cpuColorTheme,
          figureStyle: isPlayer ? state.playerFigureStyle : state.cpuFigureStyle,
          accessory: isPlayer ? state.playerAccessory : state.cpuAccessory,
          accessoryColor: isPlayer ? state.playerAccessoryColor : state.cpuAccessoryColor,
          animationStyle: isPlayer ? state.playerAnimationStyle : state.cpuAnimationStyle,
          inkStyle: isPlayer ? state.playerInkStyle : state.cpuInkStyle,
          inkOverrides: isPlayer ? state.playerInkOverrides : state.cpuInkOverrides,
          createdAt: new Date().toISOString()
        };
        
        set(state => ({
          savedCharacters: [...state.savedCharacters, newCharacter]
        }));
      },
      
      loadCharacter: (character, isPlayer) => {
        if (isPlayer) {
          set({
            playerColorTheme: character.colorTheme,
            playerFigureStyle: character.figureStyle,
            playerAccessory: character.accessory,
            playerAccessoryColor: character.accessoryColor,
            playerAnimationStyle: character.animationStyle,
            playerInkStyle: character.inkStyle ?? 'classic',
            playerInkOverrides: character.inkOverrides ?? null
          });
        } else {
          set({
            cpuColorTheme: character.colorTheme,
            cpuFigureStyle: character.figureStyle,
            cpuAccessory: character.accessory,
            cpuAccessoryColor: character.accessoryColor,
            cpuAnimationStyle: character.animationStyle,
            cpuInkStyle: character.inkStyle ?? 'classic',
            cpuInkOverrides: character.inkOverrides ?? null
          });
        }
      },
      
      deleteCharacter: (id) => {
        set(state => ({
          savedCharacters: state.savedCharacters.filter(char => char.id !== id)
        }));
      },
      
      // Helper functions to get computed values
      getPlayerColors: () => {
        const state = get();
        return colorThemes[state.playerColorTheme];
      },
      getPlayerStyle: () => {
        const state = get();
        return figureStyles[state.playerFigureStyle];
      },
      getPlayerAccessory: () => {
        const state = get();
        return {
          ...accessories[state.playerAccessory],
          color: state.playerAccessoryColor
        };
      },
      getPlayerInkParams: () => {
        const state = get();
        return mergeInkParams(state.playerInkStyle, state.playerInkOverrides);
      },
      
      getCPUColors: () => {
        const state = get();
        return colorThemes[state.cpuColorTheme];
      },
      getCPUStyle: () => {
        const state = get();
        return figureStyles[state.cpuFigureStyle];
      },
      getCPUAccessory: () => {
        const state = get();
        return {
          ...accessories[state.cpuAccessory],
          color: state.cpuAccessoryColor
        };
      },
      getCPUInkParams: () => {
        const state = get();
        return mergeInkParams(state.cpuInkStyle, state.cpuInkOverrides);
      },

      getEconomySnapshot: () => {
        const state = get();
        return {
          profileId: state.economyProfileId,
          coins: state.coins,
          lifetimeCoins: state.lifetimeCoinsEarned,
          unlocks: {
            colorThemes: state.unlockedColorThemes,
            figureStyles: state.unlockedFigureStyles,
            accessories: state.unlockedAccessories,
            animationStyles: state.unlockedAnimationStyles,
          },
          lastCoinEvent: state.lastCoinEvent,
        } satisfies EconomySyncPayload;
      },

      hydrateEconomySnapshot: (payload) => set((state) => ({
        economyProfileId: payload.profileId || state.economyProfileId,
        coins: payload.coins,
        lifetimeCoinsEarned: Math.max(state.lifetimeCoinsEarned, payload.lifetimeCoins),
        unlockedColorThemes: mergeUnlockLists(
          "colorTheme",
          state.unlockedColorThemes,
          payload.unlocks.colorThemes,
        ),
        unlockedFigureStyles: mergeUnlockLists(
          "figureStyle",
          state.unlockedFigureStyles,
          payload.unlocks.figureStyles,
        ),
        unlockedAccessories: mergeUnlockLists(
          "accessory",
          state.unlockedAccessories,
          payload.unlocks.accessories,
        ),
        unlockedAnimationStyles: mergeUnlockLists(
          "animationStyle",
          state.unlockedAnimationStyles,
          payload.unlocks.animationStyles,
        ),
        lastCoinEvent: payload.lastCoinEvent ?? state.lastCoinEvent,
        lastEconomySyncAt: payload.updatedAt ?? new Date().toISOString(),
        economySyncError: undefined,
      })),

      setEconomySyncError: (message) => set({
        economySyncError: message,
      }),

      markEconomySyncComplete: () => set({
        lastEconomySyncAt: new Date().toISOString(),
        economySyncError: undefined,
      }),
      
      // Reset to default customizations
      resetCustomizations: () => set((state) => ({
        ...state,
        ...DEFAULT_CUSTOMIZATION,
      })),
      
      earnCoins: ({ amount, reason = 'unspecified', metadata }) => {
        const normalized = clampCoinValue(amount ?? 0);
        if (normalized <= 0) {
          return { amount: 0, balance: get().coins, wasCapped: false };
        }
        let credited = 0;
        let balance = get().coins;
        set((state) => {
          const available = MAX_COINS - state.coins;
          credited = Math.min(available, normalized);
          balance = state.coins + credited;
          if (credited <= 0) {
            return {};
          }
          const entry: CoinLedgerEntry = {
            direction: 'credit',
            amount: credited,
            reason,
            timestamp: new Date().toISOString(),
            metadata,
          };
          return {
            coins: balance,
            lifetimeCoinsEarned: state.lifetimeCoinsEarned + credited,
            lastCoinEvent: entry,
            recentCoinEvents: pushLedgerEntry(state.recentCoinEvents ?? [], entry),
          };
        });
        return {
          amount: credited,
          balance,
          wasCapped: credited < normalized,
        };
      },
      
      spendCoins: (amount, reason = 'spend') => {
        const normalized = clampCoinValue(amount ?? 0);
        if (normalized <= 0) {
          return {
            success: false,
            balance: get().coins,
            error: 'invalid_amount',
          };
        }
        let result: CoinDebitResult = {
          success: false,
          balance: get().coins,
          error: 'insufficient_funds',
        };
        set((state) => {
          if (state.coins < normalized) {
            result = {
              success: false,
              balance: state.coins,
              error: 'insufficient_funds',
            };
            return {};
          }
          const nextBalance = state.coins - normalized;
          result = {
            success: true,
            cost: normalized,
            balance: nextBalance,
          };
          const entry: CoinLedgerEntry = {
            direction: 'debit',
            amount: normalized,
            reason,
            timestamp: new Date().toISOString(),
          };
          return {
            coins: nextBalance,
            lastCoinEvent: entry,
            recentCoinEvents: pushLedgerEntry(state.recentCoinEvents ?? [], entry),
          };
        });
        return result;
      },
      
      getCostForCosmetic: (slot, id) => {
        const normalized = normalizeCosmeticId(slot, id);
        if (!normalized) {
          return undefined;
        }
        const table = COST_TABLES[slot] as Record<string, number>;
        return table[normalized] ?? undefined;
      },
      
      isCosmeticUnlocked: (slot, id) => {
        const normalized = normalizeCosmeticId(slot, id);
        if (!normalized) {
          return false;
        }
        const state = get();
        switch (slot) {
          case 'colorTheme':
            return state.unlockedColorThemes.includes(normalized as ColorTheme);
          case 'figureStyle':
            return state.unlockedFigureStyles.includes(normalized as FigureStyle);
          case 'accessory':
            return state.unlockedAccessories.includes(normalized as Accessory);
          case 'animationStyle':
            return state.unlockedAnimationStyles.includes(normalized as AnimationStyle);
          default:
            return false;
        }
      },
      
      unlockCosmetic: (slot, id) => {
        const normalized = normalizeCosmeticId(slot, id);
        if (!normalized) {
          return false;
        }
        let applied = false;
        set((state) => {
          switch (slot) {
            case 'colorTheme': {
              const next = appendIfMissing(state.unlockedColorThemes, normalized as ColorTheme);
              if (next === state.unlockedColorThemes) return {};
              applied = true;
              return { unlockedColorThemes: next };
            }
            case 'figureStyle': {
              const next = appendIfMissing(state.unlockedFigureStyles, normalized as FigureStyle);
              if (next === state.unlockedFigureStyles) return {};
              applied = true;
              return { unlockedFigureStyles: next };
            }
            case 'accessory': {
              const next = appendIfMissing(state.unlockedAccessories, normalized as Accessory);
              if (next === state.unlockedAccessories) return {};
              applied = true;
              return { unlockedAccessories: next };
            }
            case 'animationStyle': {
              const next = appendIfMissing(state.unlockedAnimationStyles, normalized as AnimationStyle);
              if (next === state.unlockedAnimationStyles) return {};
              applied = true;
              return { unlockedAnimationStyles: next };
            }
            default:
              return {};
          }
        });
        return applied;
      },
      
      purchaseCosmetic: (slot, id) => {
        const normalized = normalizeCosmeticId(slot, id);
        if (!normalized) {
          return {
            success: false,
            balance: get().coins,
            error: 'unknown_cosmetic',
          };
        }
        if (get().isCosmeticUnlocked(slot, normalized)) {
          return {
            success: false,
            balance: get().coins,
            error: 'already_unlocked',
          };
        }
        const cost = get().getCostForCosmetic(slot, normalized);
        if (!cost || cost < 0) {
          return {
            success: false,
            balance: get().coins,
            error: 'invalid_amount',
          };
        }
        const spendResult = get().spendCoins(cost, `purchase:${slot}:${normalized}`);
        if (!spendResult.success) {
          return {
            success: false,
            balance: spendResult.balance,
            error: spendResult.error ?? 'insufficient_funds',
          };
        }
        get().unlockCosmetic(slot, normalized);
        return {
          success: true,
          balance: spendResult.balance,
          cost,
        };
      },
      
      addPresetToSaved: (preset, options = {}) => {
        const state = get();
        const newCharacter: SavedCharacter = {
          id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: options.name || preset.name,
          colorTheme: preset.colorTheme,
          figureStyle: preset.figureStyle,
          accessory: preset.accessory,
          accessoryColor: preset.accessoryColor,
          animationStyle: preset.animationStyle,
          inkStyle: preset.inkStyle || 'classic',
          createdAt: new Date().toISOString(),
        };
        
        set({
          savedCharacters: [...state.savedCharacters, newCharacter],
        });
        
        if (options.isPlayer !== undefined) {
          get().loadCharacter(newCharacter, options.isPlayer);
        }
      },
      
      togglePresetFavorite: (presetId) => {
        set((state) => {
          const isFavorite = state.favoritePresetIds.includes(presetId);
          return {
            favoritePresetIds: isFavorite
              ? state.favoritePresetIds.filter(id => id !== presetId)
              : [...state.favoritePresetIds, presetId],
          };
        });
      },
      
      markCollectionsTourSeen: () => {
        set({ collectionsTourSeen: true });
      },
    }),
    {
      name: 'fighter-customization-storage',
      partialize: (state) => ({
        ...state,
        // Don't persist the helper functions
        getPlayerColors: undefined,
        getPlayerStyle: undefined,
        getPlayerAccessory: undefined,
        getCPUColors: undefined,
        getCPUStyle: undefined,
        getCPUAccessory: undefined,
        getEconomySnapshot: undefined,
        earnCoins: undefined,
        spendCoins: undefined,
        purchaseCosmetic: undefined,
        unlockCosmetic: undefined,
        isCosmeticUnlocked: undefined,
        getCostForCosmetic: undefined,
        hydrateEconomySnapshot: undefined,
        setEconomySyncError: undefined,
        markEconomySyncComplete: undefined,
      })
    }
  )
);
