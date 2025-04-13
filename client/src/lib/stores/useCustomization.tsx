import { create } from 'zustand';

// Set of predefined color themes
export const colorThemes = {
  // Default blue theme
  blue: {
    primary: "#3498db",
    secondary: "#2980b9",
    accent: "#1a5276",
    emissive: "#73c0fb"
  },
  // Default red theme (for CPU)
  red: {
    primary: "#e74c3c",
    secondary: "#c0392b",
    accent: "#922b21",
    emissive: "#f1948a"
  },
  // Additional fun themes
  green: {
    primary: "#2ecc71",
    secondary: "#27ae60",
    accent: "#1e8449",
    emissive: "#7dcea0"
  },
  purple: {
    primary: "#9b59b6",
    secondary: "#8e44ad",
    accent: "#6c3483",
    emissive: "#d2b4de"
  },
  orange: {
    primary: "#e67e22",
    secondary: "#d35400",
    accent: "#a04000",
    emissive: "#f5b041"
  },
  yellow: {
    primary: "#f1c40f",
    secondary: "#f39c12",
    accent: "#b7950b",
    emissive: "#f9e79f"
  },
  pink: {
    primary: "#ff69b4",
    secondary: "#ff1493",
    accent: "#c71585",
    emissive: "#ffb6c1"
  },
  teal: {
    primary: "#00ced1",
    secondary: "#008b8b",
    accent: "#005757",
    emissive: "#7fffd4"
  },
  gold: {
    primary: "#ffd700",
    secondary: "#daa520",
    accent: "#b8860b",
    emissive: "#ffec8b"
  },
  silver: {
    primary: "#c0c0c0",
    secondary: "#a9a9a9",
    accent: "#808080",
    emissive: "#f5f5f5"
  },
  neon: {
    primary: "#39ff14",
    secondary: "#00ff00",
    accent: "#00cc00",
    emissive: "#7fff00"
  },
  rainbow: {
    primary: "#ff0000",
    secondary: "#00ff00",
    accent: "#0000ff",
    emissive: "#ffff00"
  }
};

// Set of predefined styles
export const figureStyles = {
  standard: {
    bodyScale: 1.0,
    headSize: 0.3,
    limbThickness: 0.07,
    metalness: 0.1,
    roughness: 0.7
  },
  buff: {
    bodyScale: 1.2,
    headSize: 0.35,
    limbThickness: 0.09,
    metalness: 0.2,
    roughness: 0.6
  },
  slim: {
    bodyScale: 0.9,
    headSize: 0.28,
    limbThickness: 0.06,
    metalness: 0.05,
    roughness: 0.8
  },
  chibi: {
    bodyScale: 0.8,
    headSize: 0.4,
    limbThickness: 0.06,
    metalness: 0.1,
    roughness: 0.7
  },
  robot: {
    bodyScale: 1.1,
    headSize: 0.28,
    limbThickness: 0.08,
    metalness: 0.9,
    roughness: 0.2
  },
  ghost: {
    bodyScale: 1.0,
    headSize: 0.32,
    limbThickness: 0.07,
    metalness: 0.0,
    roughness: 0.3
  }
};

// Additional accessories
export const accessories = {
  none: { name: "None", apply: () => ({}) },
  hat: {
    name: "Hat", 
    apply: (color: string) => ({
      hat: true,
      hatColor: color || "#333333"
    })
  },
  sunglasses: { 
    name: "Sunglasses", 
    apply: (color: string) => ({
      sunglasses: true,
      sunglassesColor: color || "#000000"
    })
  },
  cape: { 
    name: "Cape", 
    apply: (color: string) => ({
      cape: true,
      capeColor: color || "#cc0000"
    })
  },
  sword: { 
    name: "Sword", 
    apply: (color: string) => ({
      sword: true,
      swordColor: color || "#cccccc"
    })
  },
  crown: { 
    name: "Crown", 
    apply: (color: string) => ({
      crown: true,
      crownColor: color || "#ffd700"
    })
  },
  wings: { 
    name: "Wings", 
    apply: (color: string) => ({
      wings: true,
      wingsColor: color || "#ffffff"
    })
  },
  aura: { 
    name: "Aura", 
    apply: (color: string) => ({
      aura: true,
      auraColor: color || "#ffff00"
    })
  }
};

// Animation styles
export const animationStyles = {
  standard: "standard",
  martial_arts: "martial_arts",
  boxer: "boxer",
  ninja: "ninja",
  robot: "robot",
  silly: "silly"
};

// Define the store types
export type ColorTheme = keyof typeof colorThemes;
export type FigureStyle = keyof typeof figureStyles;
export type Accessory = keyof typeof accessories;
export type AnimationStyle = keyof typeof animationStyles;

// Create a type for all customization options
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

// Interface for the customization store
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

// Default customization options
const DEFAULT_CUSTOMIZATION: CustomizationOptions = {
  playerColorTheme: 'blue',
  playerFigureStyle: 'standard',
  playerAccessory: 'none',
  playerAccessoryColor: '#ffffff',
  playerAnimationStyle: 'standard',
  
  cpuColorTheme: 'red',
  cpuFigureStyle: 'standard',
  cpuAccessory: 'none',
  cpuAccessoryColor: '#ffffff',
  cpuAnimationStyle: 'standard'
};

// Create the customization store
export const useCustomization = create<CustomizationState>((set, get) => ({
  ...DEFAULT_CUSTOMIZATION,
  
  // Player customization actions
  setPlayerColorTheme: (theme) => set({ playerColorTheme: theme }),
  setPlayerFigureStyle: (style) => set({ playerFigureStyle: style }),
  setPlayerAccessory: (accessory, color) => set({ 
    playerAccessory: accessory,
    playerAccessoryColor: color || '#ffffff'
  }),
  setPlayerAnimationStyle: (style) => set({ playerAnimationStyle: style }),
  
  // CPU customization actions
  setCPUColorTheme: (theme) => set({ cpuColorTheme: theme }),
  setCPUFigureStyle: (style) => set({ cpuFigureStyle: style }),
  setCPUAccessory: (accessory, color) => set({ 
    cpuAccessory: accessory,
    cpuAccessoryColor: color || '#ffffff'
  }),
  setCPUAnimationStyle: (style) => set({ cpuAnimationStyle: style }),
  
  // Helper functions to get computed values
  getPlayerColors: () => {
    const { playerColorTheme } = get();
    return colorThemes[playerColorTheme];
  },
  getPlayerStyle: () => {
    const { playerFigureStyle } = get();
    return figureStyles[playerFigureStyle];
  },
  getPlayerAccessory: () => {
    const { playerAccessory, playerAccessoryColor } = get();
    return accessories[playerAccessory].apply(playerAccessoryColor);
  },
  
  getCPUColors: () => {
    const { cpuColorTheme } = get();
    return colorThemes[cpuColorTheme];
  },
  getCPUStyle: () => {
    const { cpuFigureStyle } = get();
    return figureStyles[cpuFigureStyle];
  },
  getCPUAccessory: () => {
    const { cpuAccessory, cpuAccessoryColor } = get();
    return accessories[cpuAccessory].apply(cpuAccessoryColor);
  },
  
  // Reset customizations
  resetCustomizations: () => set(DEFAULT_CUSTOMIZATION)
}));