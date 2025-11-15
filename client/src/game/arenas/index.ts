  export type ArenaTheme = {
    id: string;
    name: string;
    description: string;
    style: 'open' | 'contained'; // Kept from HEAD

    // --- New flat properties (from incoming) ---
    floorGradient: [string, string];
    skyGradient: [string, string];
    platformColor: string;
    pillarColor: string;
    accentLeft: string;
    accentRight: string;
    ambientColor: string;
    fillLight: {
      color: string;
      intensity: number;
      position: [number, number, number];
    };
    rimLight: {
      color: string;
      intensity: number;
      position: [number, number, number];
    };

    // --- Old nested properties (from HEAD, for backward compatibility) ---
    colors: {
      skyTop: string;
      skyBottom: string;
      floorTop: string;
      floorBottom: string;
      floorBase: string;
      platform: string;
      platformSupport: string;
      wallLeft: string;
      wallRight: string;
      decorEmissive1: string;
      decorEmissive2: string;
      decorBase1: string;
      decorBase2: string;
      gridColor1: string;
      gridColor2: string;
    };
    lighting: {
      hemisphereTop: string;
      hemisphereBottom: string;
      hemisphereIntensity: number;
      directionalIntensity: number;
      pointLight1Color: string;
      pointLight1Intensity: number;
      pointLight2Color: string;
      pointLight2Intensity: number;
    };
  };

  export const ARENA_THEMES: Record<string, ArenaTheme> = {
    sunsetBloom: {
      id: "sunsetBloom",
      name: "Sunset Bloom",
      description:
        "Pastel floor, ink gradients, and glowing arches inspired by dusk skies.",
      style: "open",
      // New props
      floorGradient: ["#fef6fb", "#f0f7ff"],
      skyGradient: ["#d2efff", "#fef6ff"],
      platformColor: "#fee2f8",
      pillarColor: "#f0abfc",
      accentLeft: "#f0abfc",
      accentRight: "#bae6fd",
      ambientColor: "#f5f3ff",
      fillLight: { color: "#fcd34d", intensity: 0.7, position: [-10, 8, 6] },
      rimLight: { color: "#c4b5fd", intensity: 0.45, position: [8, 10, -6] },
      // Old props (for compatibility, from HEAD 'sunset')
      colors: {
        skyTop: "#d2efff",
        skyBottom: "#fef6ff",
        floorTop: "#fef6fb",
        floorBottom: "#f0f7ff",
        floorBase: "#fff9f2",
        platform: "#fee2f8",
        platformSupport: "#f0abfc",
        wallLeft: "#fde68a",
        wallRight: "#8B4513",
        decorEmissive1: "#f0abfc",
        decorEmissive2: "#bae6fd",
        decorBase1: "#fef3ff",
        decorBase2: "#ecfeff",
        gridColor1: "#f9a8d4",
        gridColor2: "#bae6fd",
      },
      lighting: {
        hemisphereTop: "#f5f3ff",
        hemisphereBottom: "#f0fdf4",
        hemisphereIntensity: 0.8,
        directionalIntensity: 0.75,
        pointLight1Color: "#fcd34d",
        pointLight1Intensity: 0.7,
        pointLight2Color: "#c4b5fd",
        pointLight2Intensity: 0.5,
      },
    },

    auroraFlux: {
      id: "auroraFlux",
      name: "Aurora Flux",
      description:
        "Cool cyan floor with crystalline pylons under a night-sky gradient.",
      style: "open",
      // New props
      floorGradient: ["#edf8ff", "#c3e1ff"],
      skyGradient: ["#1e3a8a", "#0f172a"],
      platformColor: "#dbeafe",
      pillarColor: "#93c5fd",
      accentLeft: "#a5b4fc",
      accentRight: "#34d399",
      ambientColor: "#dbeafe",
      fillLight: { color: "#34d399", intensity: 0.75, position: [-12, 6, 4] },
      rimLight: { color: "#38bdf8", intensity: 0.55, position: [10, 9, -5] },
      // Old props (for compatibility, from HEAD 'aurora' & new values)
      colors: {
        skyTop: "#1e3a8a", // Use new sky
        skyBottom: "#0f172a", // Use new sky
        floorTop: "#edf8ff", // Use new floor
        floorBottom: "#c3e1ff", // Use new floor
        floorBase: "#f0f9ff", // from HEAD
        platform: "#dbeafe",
        platformSupport: "#93c5fd", // Translated
        wallLeft: "#a5f3fc", // from HEAD
        wallRight: "#67e8f9", // from HEAD
        decorEmissive1: "#a5b4fc", // Translated
        decorEmissive2: "#34d399", // Translated
        decorBase1: "#e0f2fe", // from HEAD
        decorBase2: "#e0e7ff", // from HEAD
        gridColor1: "#7dd3fc", // from HEAD
        gridColor2: "#a78bfa", // from HEAD
      },
      lighting: {
        hemisphereTop: "#dbeafe", // Translated
        hemisphereBottom: "#ecfeff", // from HEAD
        hemisphereIntensity: 0.85, // from HEAD
        directionalIntensity: 0.8, // from HEAD
        pointLight1Color: "#34d399", // Translated
        pointLight1Intensity: 0.75, // Translated
        pointLight2Color: "#38bdf8", // Translated
        pointLight2Intensity: 0.55, // Translated
      },
    },

    containment: {
      id: "containment",
      name: "Containment Arena",
      description: "Energy-shielded battleground with no fall KOs",
      style: "contained",
      // New props (Translated from old)
      floorGradient: ["#fcfcff", "#f2f6fb"],
      skyGradient: ["#eaf2ff", "#f8fbff"],
      platformColor: "#e9eef6",
      pillarColor: "#c7d4e6", // Mapped from wallLeft
      accentLeft: "#d0e2ff", // Mapped from decorEmissive1
      accentRight: "#c7d3e5", // Mapped from decorEmissive2
      ambientColor: "#eef4ff", // Mapped from hemisphereTop
      fillLight: { color: "#bcd3ff", intensity: 0.5, position: [-10, 8, -10] }, // Mapped from pointLight1
      rimLight: { color: "#c7d4e6", intensity: 0.4, position: [8, 10, -6] }, // Mapped from pointLight2
      // Old props (from HEAD)
      colors: {
        skyTop: "#eaf2ff",
        skyBottom: "#f8fbff",
        floorTop: "#fcfcff",
        floorBottom: "#f2f6fb",
        floorBase: "#f8fafc",
        platform: "#e9eef6",
        platformSupport: "#e9eef6",
        wallLeft: "#c7d4e6",
        wallRight: "#aebed3",
        decorEmissive1: "#d0e2ff",
        decorEmissive2: "#c7d3e5",
        decorBase1: "#b9d4ff",
        decorBase2: "#e8edf5",
        gridColor1: "#9fb3c8",
        gridColor2: "#dee5ef",
      },
      lighting: {
        hemisphereTop: "#eef4ff",
        hemisphereBottom: "#f0f4f7",
        hemisphereIntensity: 0.9,
        directionalIntensity: 0.95,
        pointLight1Color: "#bcd3ff",
        pointLight1Intensity: 0.5,
        pointLight2Color: "#c7d4e6",
        pointLight2Intensity: 0.4,
      },
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