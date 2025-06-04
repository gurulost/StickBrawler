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
    specialGeometry: null
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
    specialGeometry: 'angular'
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
    specialGeometry: 'streamlined'
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
    specialGeometry: 'rounded'
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
    specialGeometry: 'mechanical'
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
    specialGeometry: 'translucent'
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
    specialGeometry: 'crystalline'
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
    animated: true
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
    animated: true
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
    animated: true
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
    animated: true
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
    animated: true
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
    animated: true
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
    animated: true
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
    animated: true
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
    animated: true
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
    animated: true
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

// Saved character profile interface
export interface SavedCharacter {
  id: string;
  name: string;
  colorTheme: ColorTheme;
  figureStyle: FigureStyle;
  accessory: Accessory;
  accessoryColor: string;
  animationStyle: string;
  createdAt: string;
  thumbnail?: string;
}

// Zustand store interface with customization options and actions
interface CustomizationState extends CustomizationOptions {
  // Saved characters
  savedCharacters: SavedCharacter[];
  
  // Actions to update customization options
  setPlayerColorTheme: (theme: ColorTheme) => void;
  setPlayerFigureStyle: (style: FigureStyle) => void;
  setPlayerAccessory: (accessory: Accessory, color?: string) => void;
  setPlayerAnimationStyle: (style: string) => void;
  
  setCPUColorTheme: (theme: ColorTheme) => void;
  setCPUFigureStyle: (style: FigureStyle) => void;
  setCPUAccessory: (accessory: Accessory, color?: string) => void;
  setCPUAnimationStyle: (style: string) => void;
  
  // Character saving and loading
  saveCharacter: (name: string, isPlayer: boolean) => void;
  loadCharacter: (character: SavedCharacter, isPlayer: boolean) => void;
  deleteCharacter: (id: string) => void;
  
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

// Create the Zustand store with persistence
export const useCustomization = create<CustomizationState>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_CUSTOMIZATION,
      savedCharacters: [],
      
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
            playerAnimationStyle: character.animationStyle
          });
        } else {
          set({
            cpuColorTheme: character.colorTheme,
            cpuFigureStyle: character.figureStyle,
            cpuAccessory: character.accessory,
            cpuAccessoryColor: character.accessoryColor,
            cpuAnimationStyle: character.animationStyle
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
      resetCustomizations: () => set({
        ...DEFAULT_CUSTOMIZATION,
        savedCharacters: get().savedCharacters // Keep saved characters
      })
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
        getCPUAccessory: undefined
      })
    }
  )
);