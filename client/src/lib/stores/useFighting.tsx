import { create } from 'zustand';

export type GamePhase = 'menu' | 'fighting' | 'round_end' | 'match_end';
export type Character = 'stick_hero' | 'stick_villain';

export interface CharacterState {
  health: number;
  position: [number, number, number]; // [x, y, z]
  direction: 1 | -1; // 1 for right, -1 for left
  isJumping: boolean;
  isAttacking: boolean;
  isBlocking: boolean;
  isDodging: boolean;     // New dodge mechanic
  isGrabbing: boolean;    // New grab mechanic
  isTaunting: boolean;    // Taunt animation
  isAirAttacking: boolean; // Aerial attack
  airJumpsLeft: number;   // Double/triple jump capability (Smash Bros style)
  attackCooldown: number;
  dodgeCooldown: number;  // Cooldown for dodge
  grabCooldown: number;   // Cooldown for grab
  velocity: [number, number, number];
}

interface FightingState {
  gamePhase: GamePhase;
  player: CharacterState;
  cpu: CharacterState;
  playerScore: number;
  cpuScore: number;
  roundTime: number;
  maxRoundTime: number;
  
  // Actions
  startGame: () => void;
  endRound: (winner: 'player' | 'cpu' | 'timeout') => void;
  resetRound: () => void;
  returnToMenu: () => void;
  
  // Character actions
  movePlayer: (x: number, y: number, z: number) => void;
  updatePlayerVelocity: (vx: number, vy: number, vz: number) => void;
  setPlayerDirection: (direction: 1 | -1) => void;
  setPlayerJumping: (isJumping: boolean) => void;
  setPlayerAttacking: (isAttacking: boolean) => void;
  setPlayerBlocking: (isBlocking: boolean) => void;
  setPlayerDodging: (isDodging: boolean) => void;        // New dodge action
  setPlayerGrabbing: (isGrabbing: boolean) => void;      // New grab action
  setPlayerTaunting: (isTaunting: boolean) => void;      // New taunt action
  setPlayerAirAttacking: (isAirAttacking: boolean) => void; // New air attack
  resetPlayerAirJumps: () => void;                       // Reset air jumps when landing
  usePlayerAirJump: () => boolean;                       // Use an air jump, returns success
  damagePlayer: (amount: number) => void;
  updatePlayerCooldowns: (delta: number) => void;
  
  // CPU actions
  moveCPU: (x: number, y: number, z: number) => void;
  updateCPUVelocity: (vx: number, vy: number, vz: number) => void;
  setCPUDirection: (direction: 1 | -1) => void;
  setCPUJumping: (isJumping: boolean) => void;
  setCPUAttacking: (isAttacking: boolean) => void;
  setCPUBlocking: (isBlocking: boolean) => void;
  setCPUDodging: (isDodging: boolean) => void;           // New dodge action
  setCPUGrabbing: (isGrabbing: boolean) => void;         // New grab action
  setCPUTaunting: (isTaunting: boolean) => void;         // New taunt action
  setCPUAirAttacking: (isAirAttacking: boolean) => void; // New air attack
  resetCPUAirJumps: () => void;                          // Reset air jumps when landing
  useCPUAirJump: () => boolean;                          // Use an air jump, returns success
  damageCPU: (amount: number) => void;
  updateCPUCooldowns: (delta: number) => void;
  
  // Game time
  updateRoundTime: (delta: number) => void;
}

const DEFAULT_HEALTH = 100;
const DEFAULT_POSITION_PLAYER: [number, number, number] = [-2, 0, 0];
const DEFAULT_POSITION_CPU: [number, number, number] = [2, 0, 0];
const DEFAULT_ROUND_TIME = 60; // 60 seconds per round

const createDefaultCharacterState = (position: [number, number, number], direction: 1 | -1): CharacterState => ({
  health: DEFAULT_HEALTH,
  position,
  direction,
  isJumping: false,
  isAttacking: false,
  isBlocking: false,
  isDodging: false,
  isGrabbing: false,
  isTaunting: false,
  isAirAttacking: false,
  airJumpsLeft: 2, // Allow 2 additional jumps (triple jump total - Smash Bros style)
  attackCooldown: 0,
  dodgeCooldown: 0,
  grabCooldown: 0,
  velocity: [0, 0, 0],
});

export const useFighting = create<FightingState>((set) => ({
  gamePhase: 'menu',
  player: createDefaultCharacterState(DEFAULT_POSITION_PLAYER, 1),
  cpu: createDefaultCharacterState(DEFAULT_POSITION_CPU, -1),
  playerScore: 0,
  cpuScore: 0,
  roundTime: DEFAULT_ROUND_TIME,
  maxRoundTime: DEFAULT_ROUND_TIME,
  
  startGame: () => set(() => ({
    gamePhase: 'fighting',
    player: createDefaultCharacterState(DEFAULT_POSITION_PLAYER, 1),
    cpu: createDefaultCharacterState(DEFAULT_POSITION_CPU, -1),
    roundTime: DEFAULT_ROUND_TIME,
  })),
  
  endRound: (winner) => set((state) => {
    let playerScore = state.playerScore;
    let cpuScore = state.cpuScore;
    
    if (winner === 'player') {
      playerScore += 1;
    } else if (winner === 'cpu') {
      cpuScore += 1;
    }
    
    return {
      gamePhase: 'round_end',
      playerScore,
      cpuScore
    };
  }),
  
  resetRound: () => set(() => ({
    gamePhase: 'fighting',
    player: createDefaultCharacterState(DEFAULT_POSITION_PLAYER, 1),
    cpu: createDefaultCharacterState(DEFAULT_POSITION_CPU, -1),
    roundTime: DEFAULT_ROUND_TIME,
  })),
  
  returnToMenu: () => set(() => ({
    gamePhase: 'menu',
    playerScore: 0,
    cpuScore: 0,
  })),
  
  // Player actions
  movePlayer: (x, y, z) => set((state) => ({
    player: {
      ...state.player,
      position: [x, y, z]
    }
  })),
  
  updatePlayerVelocity: (vx, vy, vz) => set((state) => ({
    player: {
      ...state.player,
      velocity: [vx, vy, vz]
    }
  })),
  
  setPlayerDirection: (direction) => set((state) => ({
    player: {
      ...state.player,
      direction
    }
  })),
  
  setPlayerJumping: (isJumping) => set((state) => ({
    player: {
      ...state.player,
      isJumping
    }
  })),
  
  setPlayerAttacking: (isAttacking) => set((state) => {
    // When starting an attack, set a cooldown, but when ending the attack keep the cooldown
    // This way player can't spam attacks too quickly, but can still attack after cooldown
    let newCooldown = state.player.attackCooldown;
    
    if (isAttacking && !state.player.isAttacking) {
      // Only set a cooldown when first starting an attack
      newCooldown = 10; // Reduced cooldown so player can attack more frequently
      console.log("Setting new player attack cooldown:", newCooldown);
    }
    
    return {
      player: {
        ...state.player,
        isAttacking,
        attackCooldown: newCooldown
      }
    };
  }),
  
  setPlayerBlocking: (isBlocking) => set((state) => ({
    player: {
      ...state.player,
      isBlocking
    }
  })),
  
  damagePlayer: (amount) => set((state) => {
    // If player is blocking, reduce damage by 80%
    const actualDamage = state.player.isBlocking ? amount * 0.2 : amount;
    const newHealth = Math.max(0, state.player.health - actualDamage);
    
    // If health is 0, end the round
    if (newHealth === 0 && state.gamePhase === 'fighting') {
      return {
        player: {
          ...state.player,
          health: newHealth
        },
        gamePhase: 'round_end',
        cpuScore: state.cpuScore + 1
      };
    }
    
    return {
      player: {
        ...state.player,
        health: newHealth
      }
    };
  }),
  
  // CPU actions
  moveCPU: (x, y, z) => set((state) => ({
    cpu: {
      ...state.cpu,
      position: [x, y, z]
    }
  })),
  
  updateCPUVelocity: (vx, vy, vz) => set((state) => ({
    cpu: {
      ...state.cpu,
      velocity: [vx, vy, vz]
    }
  })),
  
  setCPUDirection: (direction) => set((state) => ({
    cpu: {
      ...state.cpu,
      direction
    }
  })),
  
  setCPUJumping: (isJumping) => set((state) => ({
    cpu: {
      ...state.cpu,
      isJumping
    }
  })),
  
  setCPUAttacking: (isAttacking) => set((state) => {
    // When starting an attack, set a cooldown, but when ending the attack keep the cooldown
    let newCooldown = state.cpu.attackCooldown;
    
    if (isAttacking && !state.cpu.isAttacking) {
      // Only set a cooldown when first starting an attack
      newCooldown = 10; // Reduced cooldown for faster attacks
    }
    
    return {
      cpu: {
        ...state.cpu,
        isAttacking,
        attackCooldown: newCooldown
      }
    };
  }),
  
  setCPUBlocking: (isBlocking) => set((state) => ({
    cpu: {
      ...state.cpu,
      isBlocking
    }
  })),
  
  damageCPU: (amount) => set((state) => {
    // If CPU is blocking, reduce damage by 80%
    const actualDamage = state.cpu.isBlocking ? amount * 0.2 : amount;
    const newHealth = Math.max(0, state.cpu.health - actualDamage);
    
    // If health is 0, end the round
    if (newHealth === 0 && state.gamePhase === 'fighting') {
      return {
        cpu: {
          ...state.cpu,
          health: newHealth
        },
        gamePhase: 'round_end',
        playerScore: state.playerScore + 1
      };
    }
    
    return {
      cpu: {
        ...state.cpu,
        health: newHealth
      }
    };
  }),
  
  // New Player Action Methods
  setPlayerDodging: (isDodging) => set((state) => {
    // Start dodge cooldown when beginning to dodge
    let newCooldown = state.player.dodgeCooldown;
    if (isDodging && !state.player.isDodging) {
      newCooldown = 20; // Dodge has longer cooldown than attacks
      console.log("Player DODGE - starting cooldown:", newCooldown);
    }
    
    return {
      player: {
        ...state.player,
        isDodging,
        dodgeCooldown: newCooldown
      }
    };
  }),

  setPlayerGrabbing: (isGrabbing) => set((state) => {
    // Start grab cooldown when beginning to grab
    let newCooldown = state.player.grabCooldown;
    if (isGrabbing && !state.player.isGrabbing) {
      newCooldown = 30; // Grab has longer cooldown
      console.log("Player GRAB - starting cooldown:", newCooldown);
    }
    
    return {
      player: {
        ...state.player,
        isGrabbing,
        grabCooldown: newCooldown
      }
    };
  }),

  setPlayerTaunting: (isTaunting) => set((state) => ({
    player: {
      ...state.player,
      isTaunting
    }
  })),

  setPlayerAirAttacking: (isAirAttacking) => set((state) => {
    if (isAirAttacking && !state.player.isJumping) {
      // Can't air attack if not in the air
      return {}; // No change
    }
    
    // Air attacks have a separate state from ground attacks
    let newCooldown = state.player.attackCooldown;
    if (isAirAttacking && !state.player.isAirAttacking) {
      newCooldown = 15; // Air attacks have longer cooldown
      console.log("Player AIR ATTACK - starting cooldown:", newCooldown);
    }
    
    return {
      player: {
        ...state.player,
        isAirAttacking,
        attackCooldown: newCooldown
      }
    };
  }),

  resetPlayerAirJumps: () => set((state) => ({
    player: {
      ...state.player,
      airJumpsLeft: 2 // Reset to 2 air jumps
    }
  })),

  usePlayerAirJump: () => {
    let jumpSuccess = false;
    
    set((state) => {
      if (state.player.airJumpsLeft <= 0) {
        // No air jumps left
        console.log("Player has no air jumps left!");
        return state; // No changes to state
      }
      
      console.log("Player using air jump! Jumps remaining:", state.player.airJumpsLeft - 1);
      jumpSuccess = true;
      
      return {
        player: {
          ...state.player,
          airJumpsLeft: state.player.airJumpsLeft - 1
        }
      };
    });
    
    return jumpSuccess; // Return success flag
  },

  // New CPU Action Methods
  setCPUDodging: (isDodging) => set((state) => {
    // Start dodge cooldown when beginning to dodge
    let newCooldown = state.cpu.dodgeCooldown;
    if (isDodging && !state.cpu.isDodging) {
      newCooldown = 20; // Dodge has longer cooldown than attacks
    }
    
    return {
      cpu: {
        ...state.cpu,
        isDodging,
        dodgeCooldown: newCooldown
      }
    };
  }),

  setCPUGrabbing: (isGrabbing) => set((state) => {
    // Start grab cooldown when beginning to grab
    let newCooldown = state.cpu.grabCooldown;
    if (isGrabbing && !state.cpu.isGrabbing) {
      newCooldown = 30; // Grab has longer cooldown
    }
    
    return {
      cpu: {
        ...state.cpu,
        isGrabbing,
        grabCooldown: newCooldown
      }
    };
  }),

  setCPUTaunting: (isTaunting) => set((state) => ({
    cpu: {
      ...state.cpu,
      isTaunting
    }
  })),

  setCPUAirAttacking: (isAirAttacking) => set((state) => {
    if (isAirAttacking && !state.cpu.isJumping) {
      // Can't air attack if not in the air
      return {}; // No change
    }
    
    // Air attacks have a separate state from ground attacks
    let newCooldown = state.cpu.attackCooldown;
    if (isAirAttacking && !state.cpu.isAirAttacking) {
      newCooldown = 15; // Air attacks have longer cooldown
    }
    
    return {
      cpu: {
        ...state.cpu,
        isAirAttacking,
        attackCooldown: newCooldown
      }
    };
  }),

  resetCPUAirJumps: () => set((state) => ({
    cpu: {
      ...state.cpu,
      airJumpsLeft: 2 // Reset to 2 air jumps
    }
  })),

  useCPUAirJump: () => {
    let jumpSuccess = false;
    
    set((state) => {
      if (state.cpu.airJumpsLeft <= 0) {
        // No air jumps left
        return state; // No changes to state
      }
      
      jumpSuccess = true;
      return {
        cpu: {
          ...state.cpu,
          airJumpsLeft: state.cpu.airJumpsLeft - 1
        }
      };
    });
    
    return jumpSuccess; // Return success flag
  },

  // Update player cooldowns
  updatePlayerCooldowns: (delta) => set((state) => {
    // Update all cooldowns
    const newAttackCooldown = state.player.attackCooldown > 0 
      ? Math.max(0, state.player.attackCooldown - 1) 
      : 0;
      
    const newDodgeCooldown = state.player.dodgeCooldown > 0
      ? Math.max(0, state.player.dodgeCooldown - 1)
      : 0;
      
    const newGrabCooldown = state.player.grabCooldown > 0
      ? Math.max(0, state.player.grabCooldown - 1)
      : 0;
    
    // Debug output for cooldowns
    if (state.player.attackCooldown > 0) {
      console.log("Reducing player attack cooldown from", state.player.attackCooldown);
    }
    
    return {
      player: {
        ...state.player,
        attackCooldown: newAttackCooldown,
        dodgeCooldown: newDodgeCooldown,
        grabCooldown: newGrabCooldown
      }
    };
  }),
  
  // Update CPU cooldowns
  updateCPUCooldowns: (delta) => set((state) => {
    // Update all cooldowns
    const newAttackCooldown = state.cpu.attackCooldown > 0 
      ? Math.max(0, state.cpu.attackCooldown - 1) 
      : 0;
      
    const newDodgeCooldown = state.cpu.dodgeCooldown > 0
      ? Math.max(0, state.cpu.dodgeCooldown - 1)
      : 0;
      
    const newGrabCooldown = state.cpu.grabCooldown > 0
      ? Math.max(0, state.cpu.grabCooldown - 1)
      : 0;
    
    return {
      cpu: {
        ...state.cpu,
        attackCooldown: newAttackCooldown,
        dodgeCooldown: newDodgeCooldown,
        grabCooldown: newGrabCooldown
      }
    };
  }),
  
  // Game time
  updateRoundTime: (delta) => set((state) => {
    const newTime = Math.max(0, state.roundTime - delta);
    
    // If time is up, end the round
    if (newTime === 0 && state.gamePhase === 'fighting') {
      // Determine winner based on health
      let winner: 'player' | 'cpu' | 'timeout' = 'timeout';
      if (state.player.health > state.cpu.health) {
        winner = 'player';
      } else if (state.cpu.health > state.player.health) {
        winner = 'cpu';
      }
      
      return {
        roundTime: newTime,
        gamePhase: 'round_end',
        playerScore: winner === 'player' ? state.playerScore + 1 : state.playerScore,
        cpuScore: winner === 'cpu' ? state.cpuScore + 1 : state.cpuScore
      };
    }
    
    return {
      roundTime: newTime
    };
  })
}));
