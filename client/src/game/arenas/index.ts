export type ArenaTheme = {
  id: string;
  name: string;
  description: string;
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
  style: 'open' | 'contained';  // 'open' allows fall KOs, 'contained' has energy shield
};

export const ARENA_THEMES: Record<string, ArenaTheme> = {
  sunset: {
    id: 'sunset',
    name: 'Sunset Bloom',
    description: 'Pastel paradise with platforms and open edges',
    colors: {
      skyTop: '#d2efff',
      skyBottom: '#fef6ff',
      floorTop: '#fef6fb',
      floorBottom: '#f0f7ff',
      floorBase: '#fff9f2',
      platform: '#fee2f8',
      platformSupport: '#f0abfc',
      wallLeft: '#fde68a',
      wallRight: '#8B4513',
      decorEmissive1: '#f0abfc',
      decorEmissive2: '#bae6fd',
      decorBase1: '#fef3ff',
      decorBase2: '#ecfeff',
      gridColor1: '#f9a8d4',
      gridColor2: '#bae6fd',
    },
    lighting: {
      hemisphereTop: '#f5f3ff',
      hemisphereBottom: '#f0fdf4',
      hemisphereIntensity: 0.8,
      directionalIntensity: 0.75,
      pointLight1Color: '#fcd34d',
      pointLight1Intensity: 0.7,
      pointLight2Color: '#c4b5fd',
      pointLight2Intensity: 0.5,
    },
    style: 'open',
  },
  
  aurora: {
    id: 'aurora',
    name: 'Aurora Flux',
    description: 'Crystalline pylons with cool, electric lighting',
    colors: {
      skyTop: '#e0e7ff',
      skyBottom: '#f0f9ff',
      floorTop: '#eff6ff',
      floorBottom: '#f0fdfa',
      floorBase: '#f0f9ff',
      platform: '#dbeafe',
      platformSupport: '#7dd3fc',
      wallLeft: '#a5f3fc',
      wallRight: '#67e8f9',
      decorEmissive1: '#22d3ee',
      decorEmissive2: '#818cf8',
      decorBase1: '#e0f2fe',
      decorBase2: '#e0e7ff',
      gridColor1: '#7dd3fc',
      gridColor2: '#a78bfa',
    },
    lighting: {
      hemisphereTop: '#e0e7ff',
      hemisphereBottom: '#ecfeff',
      hemisphereIntensity: 0.85,
      directionalIntensity: 0.8,
      pointLight1Color: '#22d3ee',
      pointLight1Intensity: 0.65,
      pointLight2Color: '#818cf8',
      pointLight2Intensity: 0.55,
    },
    style: 'open',
  },
  
  containment: {
    id: 'containment',
    name: 'Containment Arena',
    description: 'Energy-shielded battleground with no fall KOs',
    colors: {
      skyTop: '#eaf2ff',
      skyBottom: '#f8fbff',
      floorTop: '#fcfcff',
      floorBottom: '#f2f6fb',
      floorBase: '#f8fafc',
      platform: '#e9eef6',
      platformSupport: '#e9eef6',
      wallLeft: '#c7d4e6',
      wallRight: '#aebed3',
      decorEmissive1: '#d0e2ff',
      decorEmissive2: '#c7d3e5',
      decorBase1: '#b9d4ff',
      decorBase2: '#e8edf5',
      gridColor1: '#9fb3c8',
      gridColor2: '#dee5ef',
    },
    lighting: {
      hemisphereTop: '#eef4ff',
      hemisphereBottom: '#f0f4f7',
      hemisphereIntensity: 0.9,
      directionalIntensity: 0.95,
      pointLight1Color: '#bcd3ff',
      pointLight1Intensity: 0.5,
      pointLight2Color: '#c7d4e6',
      pointLight2Intensity: 0.4,
    },
    style: 'contained',
  },
};

export const DEFAULT_ARENA = 'sunset';
