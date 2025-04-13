import { create } from 'zustand';

// Define color themes for characters
export const colorThemes = {
  blue: {
    primary: '#2980b9',
    secondary: '#3498db',
    tertiary: '#1abc9c',
    emissive: '#4aa3df'
  },
  red: {
    primary: '#c0392b',
    secondary: '#e74c3c',
    tertiary: '#e67e22',
    emissive: '#ff6b6b'
  },
  green: {
    primary: '#27ae60',
    secondary: '#2ecc71',
    tertiary: '#16a085',
    emissive: '#55efc4'
  },
  purple: {
    primary: '#8e44ad',
    secondary: '#9b59b6',
    tertiary: '#6c3483',
    emissive: '#a29bfe'
  },
  orange: {
    primary: '#d35400',
    secondary: '#e67e22',
    tertiary: '#f39c12',
    emissive: '#ffa502'
  },
  pink: {
    primary: '#e84393',
    secondary: '#fd79a8',
    tertiary: '#ff7675',
    emissive: '#ff9ff3'
  },
  black: {
    primary: '#2c3e50',
    secondary: '#34495e',
    tertiary: '#212121',
    emissive: '#636e72'
  },
  white: {
    primary: '#ecf0f1',
    secondary: '#bdc3c7',
    tertiary: '#7f8c8d',
    emissive: '#dfe6e9'
  }
};

// Define stick figure style variations
export const figureStyles = {
  normal: {
    headSize: 0.25,
    bodyLength: 0.8,
    limbThickness: 0.08,
    shoulderWidth: 0.4,
    metalness: 0.1,
    roughness: 0.7,
    bodyScale: 1.0
  },
  bulky: {
    headSize: 0.3,
    bodyLength: 0.7,
    limbThickness: 0.12,
    shoulderWidth: 0.6,
    metalness: 0.2,
    roughness: 0.8,
    bodyScale: 1.2
  },
  slim: {
    headSize: 0.22,
    bodyLength: 0.9,
    limbThickness: 0.06,
    shoulderWidth: 0.3,
    metalness: 0.05,
    roughness: 0.6,
    bodyScale: 0.9
  },
  cartoonish: {
    headSize: 0.35,
    bodyLength: 0.6,
    limbThickness: 0.09,
    shoulderWidth: 0.5,
    metalness: 0.3,
    roughness: 0.5,
    bodyScale: 1.1
  },
  robot: {
    headSize: 0.28,
    bodyLength: 0.75,
    limbThickness: 0.1,
    shoulderWidth: 0.45,
    metalness: 0.8,
    roughness: 0.2,
    bodyScale: 1.05
  }
};

// Define accessories that can be added to the characters
export const accessories = {
  none: {
    name: 'None',
    geometry: null
  },
  hat: {
    name: 'Hat',
    geometry: {
      type: 'cone',
      args: [0.15, 0.3, 16],
      position: [0, 0.3, 0]
    }
  },
  glasses: {
    name: 'Glasses',
    geometry: {
      type: 'torusGeometry',
      args: [0.08, 0.02, 12, 24],
      rotation: [0, 0, 0],
      position: [0, 0.05, 0.2]
    }
  },
  cape: {
    name: 'Cape',
    geometry: {
      type: 'planeGeometry',
      args: [0.4, 0.8],
      position: [0, -0.4, -0.2],
      rotation: [0.2, 0, 0]
    }
  },
  sword: {
    name: 'Sword',
    geometry: {
      type: 'boxGeometry',
      args: [0.05, 0.6, 0.05],
      position: [0.4, 0.2, 0],
      rotation: [0, 0, Math.PI / 4]
    }
  },
  shield: {
    name: 'Shield',
    geometry: {
      type: 'circleGeometry',
      args: [0.2, 16],
      position: [-0.3, 0.2, 0.1],
      rotation: [0, 0.3, 0]
    }
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

// Type definitions for our customization options
export type ColorTheme = keyof typeof colorThemes;
export type FigureStyle = keyof typeof figureStyles;
export type Accessory = keyof typeof accessories;
export type AnimationStyle = keyof typeof animationStyles;

// Interface for all customization options
export interface CustomizationOptions {
  playerColorTheme: ColorTheme;
  playerFigureStyle: FigureStyle;
  playerAccessory: Accessory;
  playerAccessoryColor: string;
  playerAnimationStyle: string;
  
  cpuColorTheme: ColorTheme;
  cpuFigureStyle: FigureStyle;
  cpuAccessory: Accessory;
  cpuAccessoryColor: string;
  cpuAnimationStyle: string;
}

// Zustand store interface with customization options and actions
interface CustomizationState extends CustomizationOptions {
  // Actions to update customization options
  setPlayerColorTheme: (theme: ColorTheme) => void;
  setPlayerFigureStyle: (style: FigureStyle) => void;
  setPlayerAccessory: (accessory: Accessory, color?: string) => void;
  setPlayerAnimationStyle: (style: string) => void;
  
  setCPUColorTheme: (theme: ColorTheme) => void;
  setCPUFigureStyle: (style: FigureStyle) => void;
  setCPUAccessory: (accessory: Accessory, color?: string) => void;
  setCPUAnimationStyle: (style: string) => void;
  
  // Helper functions to get computed values
  getPlayerColors: () => typeof colorThemes[ColorTheme];
  getPlayerStyle: () => typeof figureStyles[FigureStyle];
  getPlayerAccessory: () => any;
  
  getCPUColors: () => typeof colorThemes[ColorTheme];
  getCPUStyle: () => typeof figureStyles[FigureStyle];
  getCPUAccessory: () => any;
  
  // Reset customizations
  resetCustomizations: () => void;
}

// Default customization settings
const DEFAULT_CUSTOMIZATION: CustomizationOptions = {
  playerColorTheme: 'blue',
  playerFigureStyle: 'normal',
  playerAccessory: 'none',
  playerAccessoryColor: '#ffffff',
  playerAnimationStyle: 'normal',
  
  cpuColorTheme: 'red',
  cpuFigureStyle: 'normal',
  cpuAccessory: 'none',
  cpuAccessoryColor: '#ffffff',
  cpuAnimationStyle: 'normal'
};

// Create the Zustand store
export const useCustomization = create<CustomizationState>((set, get) => ({
  // Initial state
  ...DEFAULT_CUSTOMIZATION,
  
  // Actions for player customization
  setPlayerColorTheme: (theme) => set({ playerColorTheme: theme }),
  setPlayerFigureStyle: (style) => set({ playerFigureStyle: style }),
  setPlayerAccessory: (accessory, color = '#ffffff') => set({ 
    playerAccessory: accessory,
    playerAccessoryColor: color 
  }),
  setPlayerAnimationStyle: (style) => set({ playerAnimationStyle: style }),
  
  // Actions for CPU customization
  setCPUColorTheme: (theme) => set({ cpuColorTheme: theme }),
  setCPUFigureStyle: (style) => set({ cpuFigureStyle: style }),
  setCPUAccessory: (accessory, color = '#ffffff') => set({ 
    cpuAccessory: accessory,
    cpuAccessoryColor: color 
  }),
  setCPUAnimationStyle: (style) => set({ cpuAnimationStyle: style }),
  
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
  
  // Reset to default customizations
  resetCustomizations: () => set(DEFAULT_CUSTOMIZATION)
}));