export type SilhouetteLimbOverride = {
  length?: number;
  base?: number;
  mid?: number;
  tip?: number;
  curvature?: number;
};

export type SilhouetteOverrideSnapshot = {
  arms?: SilhouetteLimbOverride;
  legs?: SilhouetteLimbOverride;
};

export interface FigureStyleOverrideSnapshot {
  headSize?: number;
  bodyLength?: number;
  limbThickness?: number;
  shoulderWidth?: number;
  outlineWidth?: number;
  bodyScale?: number;
  glowIntensity?: number;
  particleCount?: number;
  silhouette?: SilhouetteOverrideSnapshot;
}

export interface InkOverrideSnapshot {
  rimColor?: string;
  shadeBands?: number;
  lineWidth?: number;
  glow?: number;
  outlineColor?: string;
}

export interface FighterLoadoutSnapshot {
  colorTheme: string;
  figureStyle: string;
  figureBlendTargetStyle?: string | null;
  figureBlendAmount?: number;
  figureStyleOverrides?: FigureStyleOverrideSnapshot | null;
  accessory: string;
  accessoryColor: string;
  animationStyle: string;
  inkStyle: string;
  inkOverrides?: InkOverrideSnapshot | null;
}

export interface LoadoutSyncEnvelope {
  player: FighterLoadoutSnapshot;
  opponent: FighterLoadoutSnapshot;
  hash: string;
}

const canonicalize = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalize(entry)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return `{${entries.map(([key, val]) => `${JSON.stringify(key)}:${canonicalize(val)}`).join(",")}}`;
};

const hashString = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
};

export const hashLoadoutSnapshot = (loadout: FighterLoadoutSnapshot): string => {
  return hashString(canonicalize(loadout));
};

export const composeLoadoutHash = (
  player: FighterLoadoutSnapshot,
  opponent: FighterLoadoutSnapshot,
): string => {
  const combined = `${hashLoadoutSnapshot(player)}|${hashLoadoutSnapshot(opponent)}`;
  return hashString(combined);
};
