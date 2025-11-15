export type ArenaTheme = {
  id: string;
  name: string;
  description: string;
  floorGradient: [string, string];
  skyGradient: [string, string];
  platformColor: string;
  pillarColor: string;
  accentLeft: string;
  accentRight: string;
  ambientColor: string;
  fillLight: { color: string; intensity: number; position: [number, number, number] };
  rimLight: { color: string; intensity: number; position: [number, number, number] };
};

export const ARENA_THEMES: Record<string, ArenaTheme> = {
  sunsetBloom: {
    id: "sunsetBloom",
    name: "Sunset Bloom",
    description: "Pastel floor, ink gradients, and glowing arches inspired by dusk skies.",
    floorGradient: ["#fef6fb", "#f0f7ff"],
    skyGradient: ["#d2efff", "#fef6ff"],
    platformColor: "#fee2f8",
    pillarColor: "#f0abfc",
    accentLeft: "#f0abfc",
    accentRight: "#bae6fd",
    ambientColor: "#f5f3ff",
    fillLight: { color: "#fcd34d", intensity: 0.7, position: [-10, 8, 6] },
    rimLight: { color: "#c4b5fd", intensity: 0.45, position: [8, 10, -6] },
  },
  auroraFlux: {
    id: "auroraFlux",
    name: "Aurora Flux",
    description: "Cool cyan floor with crystalline pylons under a night-sky gradient.",
    floorGradient: ["#edf8ff", "#c3e1ff"],
    skyGradient: ["#1e3a8a", "#0f172a"],
    platformColor: "#dbeafe",
    pillarColor: "#93c5fd",
    accentLeft: "#a5b4fc",
    accentRight: "#34d399",
    ambientColor: "#dbeafe",
    fillLight: { color: "#34d399", intensity: 0.75, position: [-12, 6, 4] },
    rimLight: { color: "#38bdf8", intensity: 0.55, position: [10, 9, -5] },
  },
};

export const DEFAULT_ARENA_ID = "sunsetBloom";

export const ARENA_OPTIONS = Object.values(ARENA_THEMES).map((theme) => ({
  id: theme.id,
  name: theme.name,
  description: theme.description,
}));

export function getArenaTheme(id?: string): ArenaTheme {
  if (id && ARENA_THEMES[id]) {
    return ARENA_THEMES[id];
  }
  return ARENA_THEMES[DEFAULT_ARENA_ID];
}
