import { CharacterState } from "../lib/stores/useFighting";
import { 
  applyGravity, 
  stayInArena, 
  stayInArenaZ,
  applyDrag, 
  JUMP_FORCE, 
  CPU_SPEED, 
  checkAttackHit,
  ATTACK_RANGE,
  PUNCH_DAMAGE,
  KICK_DAMAGE,
  SPECIAL_DAMAGE,
  getPlatformHeight,
  isOnPlatform
} from "./Physics";

// CPU difficulty levels
export enum CPUDifficulty {
  EASY,
  MEDIUM,
  HARD
}

// Action states for the CPU with new Smash Bros style actions
export enum CPUAction {
  IDLE,
  CHASE,
  RETREAT,
  ATTACK,
  BLOCK,
  JUMP,
  AIR_ATTACK,    // New Smash Bros style air attack
  AIR_JUMP,      // New Smash Bros style double/triple jump
  DODGE,         // New Smash Bros style dodge
  GRAB,          // New Smash Bros style grab and throw
  TAUNT          // Just for fun
}

export class CPUController {
  private difficulty: CPUDifficulty;
  private currentAction: CPUAction;
  private actionTimer: number;
  private targetDistance: number;
  private attackChance: number;
  private blockChance: number;
  private jumpChance: number;
  
  // New Smash Bros style action chances
  private airAttackChance: number;
  private airJumpChance: number;
  private dodgeChance: number;
  private grabChance: number;
  private tauntChance: number;
  
  constructor(difficulty: CPUDifficulty = CPUDifficulty.MEDIUM) {
    this.difficulty = difficulty;
    this.currentAction = CPUAction.IDLE;
    this.actionTimer = 0;
    
    // Set behavior based on difficulty
    switch (difficulty) {
      case CPUDifficulty.EASY:
        this.targetDistance = 2.0; // Stays further away
        // Basic actions
        this.attackChance = 0.06;  // Doubled from 0.03
        this.blockChance = 0.04;   // Doubled from 0.02
        this.jumpChance = 0.03;    // Increased from 0.02
        
        // Smash Bros style actions (easy CPU rarely uses advanced techniques)
        this.airAttackChance = 0.01;
        this.airJumpChance = 0.01;
        this.dodgeChance = 0.01;
        this.grabChance = 0.01;
        this.tauntChance = 0.005;  // Very rare taunt
        break;
        
      case CPUDifficulty.HARD:
        this.targetDistance = 1.0; // Gets closer to player
        // Basic actions
        this.attackChance = 0.25;  // Doubled from 0.12
        this.blockChance = 0.15;   // Increased from 0.09
        this.jumpChance = 0.10;    // Increased from 0.07
        
        // Smash Bros style actions (hard CPU uses advanced techniques frequently)
        this.airAttackChance = 0.12;
        this.airJumpChance = 0.10;
        this.dodgeChance = 0.15;
        this.grabChance = 0.15;
        this.tauntChance = 0.02;  // Occasional taunting to frustrate player
        break;
        
      default: // MEDIUM
        this.targetDistance = 1.5;
        // Basic actions
        this.attackChance = 0.15;  // Significantly increased from 0.08
        this.blockChance = 0.08;   // Slightly increased from 0.06
        this.jumpChance = 0.05;    // Slightly increased from 0.04
        
        // Smash Bros style actions
        this.airAttackChance = 0.06;
        this.airJumpChance = 0.05;
        this.dodgeChance = 0.08;
        this.grabChance = 0.07;
        this.tauntChance = 0.01;  // Occasional taunt
    }

    // Log the CPU configuration for debugging
    console.log(`CPU controller initialized with difficulty: ${CPUDifficulty[difficulty]}`);
    console.log(`Basic actions - Attack: ${this.attackChance.toFixed(2)}, Block: ${this.blockChance.toFixed(2)}, Jump: ${this.jumpChance.toFixed(2)}`);
    console.log(`Smash Bros actions - Air Attack: ${this.airAttackChance.toFixed(2)}, Air Jump: ${this.airJumpChance.toFixed(2)}, Dodge: ${this.dodgeChance.toFixed(2)}, Grab: ${this.grabChance.toFixed(2)}`);
  }

  private moveTowards(x: number, z: number, playerX: number, playerZ: number) {
    const vx = x < playerX ? CPU_SPEED : -CPU_SPEED;
    const direction: 1 | -1 = x < playerX ? 1 : -1;
    let vz = 0;
    if (z < playerZ) {
      vz = CPU_SPEED * 0.8;
    } else if (z > playerZ) {
      vz = -CPU_SPEED * 0.8;
    }
    return { vx, vz, direction };
  }

  private moveAway(x: number, z: number, playerX: number, playerZ: number) {
    const vx = x < playerX ? -CPU_SPEED : CPU_SPEED;
    const direction: 1 | -1 = x < playerX ? -1 : 1;
    let vz = 0;
    if (z < playerZ) {
      vz = -CPU_SPEED * 0.8;
    } else if (z > playerZ) {
      vz = CPU_SPEED * 0.8;
    }
    return { vx, vz, direction };
  }

  private performAttack(
    attackCooldown: number,
    isAttacking: boolean,
    isBlocking: boolean,
    distance: number,
    onAttack: (v: boolean) => void
  ) {
    if (attackCooldown <= 0 && !isAttacking && !isBlocking) {
      onAttack(true);
      const attackType = Math.random();
      let dur = 400;
      if (attackType < 0.5) {
        console.log("CPU performs a PUNCH");
        dur = 400;
      } else if (attackType < 0.85) {
        console.log("CPU performs a KICK");
        dur = 500;
      } else {
        console.log("CPU performs a SPECIAL ATTACK");
        dur = 600;
      }
      setTimeout(() => {
        onAttack(false);
        if (Math.random() < 0.3 && distance <= ATTACK_RANGE) {
          setTimeout(() => {
            onAttack(true);
            setTimeout(() => onAttack(false), 400);
          }, 200);
        }
      }, dur);
    }
  }
  
  update(
    cpuState: CharacterState,
    playerState: CharacterState,
    onPositionChange: (x: number, y: number, z: number) => void,
    onVelocityChange: (vx: number, vy: number, vz: number) => void,
    onDirectionChange: (direction: 1 | -1) => void,
    onJumpingChange: (isJumping: boolean) => void,
    onAttackingChange: (isAttacking: boolean) => void,
    onBlockingChange: (isBlocking: boolean) => void,
    // New Smash Bros style action handlers
    onDodgingChange?: (isDodging: boolean) => void,
    onGrabbingChange?: (isGrabbing: boolean) => void,
    onTauntingChange?: (isTaunting: boolean) => void,
    onAirAttackingChange?: (isAirAttacking: boolean) => void,
    resetAirJumps?: () => void,
    useAirJump?: () => boolean
  ) {
    // Decrease action timer
    this.actionTimer--;
    
    // Get current state values
    const { position, velocity, direction, isJumping, isAttacking, isBlocking, attackCooldown } = cpuState;
    const [x, y, z] = position;
    const [vx, vy, vz] = velocity;
    
    // Get player position
    const [playerX, playerY, playerZ] = playerState.position;
    
    // Calculate distance to player in 3D space (using x and z coordinates)
    const distanceToPlayer = Math.sqrt(Math.pow(x - playerX, 2) + Math.pow(z - playerZ, 2));
    
    // Decide on a new action if current action is complete
    if (this.actionTimer <= 0 && !isAttacking) {
      this.decideAction(distanceToPlayer, playerState.isAttacking);
    }
    
    // Execute the current action
    let newVX = vx;
    let newVZ = vz; // Add Z-axis velocity for 3D movement
    let newDirection = direction;
    
    switch (this.currentAction) {
      case CPUAction.CHASE: {
        const m = this.moveTowards(x, z, playerX, playerZ);
        newVX = m.vx;
        newVZ = m.vz;
        newDirection = m.direction;
        break;
      }

      case CPUAction.RETREAT: {
        const m = this.moveAway(x, z, playerX, playerZ);
        newVX = m.vx;
        newVZ = m.vz;
        newDirection = m.direction;
        break;
      }
        
      case CPUAction.ATTACK:
        newDirection = x < playerX ? 1 : -1;
        this.performAttack(
          attackCooldown,
          isAttacking,
          isBlocking,
          distanceToPlayer,
          onAttackingChange
        );
        break;
        
      case CPUAction.BLOCK:
        // Face player
        newDirection = x < playerX ? 1 : -1;
        
        // Block
        onBlockingChange(true);
        break;
        
      case CPUAction.JUMP:
        // If on ground, jump
        if (!isJumping && y <= 0.01) {
          onVelocityChange(newVX, JUMP_FORCE, vz);
          onJumpingChange(true);
          this.currentAction = CPUAction.IDLE;
          
          // Reset air jumps when starting a new jump
          if (resetAirJumps) {
            resetAirJumps();
          }
        }
        break;
        
      case CPUAction.AIR_JUMP:
        // Air jump (double/triple jump - Smash Bros style)
        if (isJumping && useAirJump && useAirJump()) {
          // Successful air jump
          console.log("CPU performs an AIR JUMP");
          onVelocityChange(newVX, JUMP_FORCE * 0.8, vz); // Slightly weaker air jump
          this.currentAction = CPUAction.AIR_ATTACK; // Follow up with air attack
          this.actionTimer = 10;
        } else {
          this.currentAction = CPUAction.IDLE;
        }
        break;
        
      case CPUAction.AIR_ATTACK:
        // Air attack (only when in the air)
        if (isJumping && onAirAttackingChange && !cpuState.isAirAttacking && !cpuState.isAttacking) {
          console.log("CPU performs an AIR ATTACK");
          onAirAttackingChange(true);
          
          // Reset air attack after delay
          setTimeout(() => {
            if (onAirAttackingChange) {
              onAirAttackingChange(false);
            }
          }, 500);
        }
        break;
        
      case CPUAction.DODGE:
        // Dodge (Smash Bros style)
        if (onDodgingChange && !cpuState.isDodging && cpuState.dodgeCooldown <= 0) {
          console.log("CPU performs a DODGE");
          onDodgingChange(true);
          
          // Add a burst of movement when dodging to evade attacks
          if (Math.random() < 0.5) {
            newVX = CPU_SPEED * 2 * (Math.random() < 0.5 ? 1 : -1);
          }
          
          // End dodge after short delay
          setTimeout(() => {
            if (onDodgingChange) {
              onDodgingChange(false);
            }
          }, 300);
        }
        break;
        
      case CPUAction.GRAB:
        // Grab attack (Smash Bros style)
        if (onGrabbingChange && !cpuState.isGrabbing && cpuState.grabCooldown <= 0) {
          console.log("CPU performs a GRAB");
          onGrabbingChange(true);
          
          // Face player for grab
          newDirection = x < playerX ? 1 : -1;
          
          // End grab after delay and check if it connected
          setTimeout(() => {
            if (onGrabbingChange) {
              onGrabbingChange(false);
              
              // Check if grab connected (needs additional parameters to handle the throw)
              // This would be handled in the GameManager where the function is called
            }
          }, 400);
        }
        break;
        
      case CPUAction.TAUNT:
        // Taunt (just for fun)
        if (onTauntingChange && !cpuState.isTaunting) {
          console.log("CPU performs a TAUNT");
          onTauntingChange(true);
          
          // End taunt after delay
          setTimeout(() => {
            if (onTauntingChange) {
              onTauntingChange(false);
            }
          }, 1200); // Taunts are longer
          
          this.currentAction = CPUAction.IDLE;
        }
        break;
        
      default: // IDLE
        // Apply drag to both X and Z axes for 3D movement
        newVX = applyDrag(newVX);
        newVZ = applyDrag(newVZ); // Also slow down Z movement when idle
        
        // Reset blocking
        if (isBlocking) {
          onBlockingChange(false);
        }
    }
    
    // Apply direction change if needed
    if (newDirection !== direction) {
      onDirectionChange(newDirection);
    }
    
    // Apply gravity with platform collision detection
    const [newY, newVY] = applyGravity(y, vy, x, z);
    
    // Calculate the new X position, staying within arena bounds
    const newX = stayInArena(x + newVX);
    
    // Calculate the new Z position with 3D boundary checks
    const newZ = stayInArenaZ(z + newVZ);
    
    // Update positions and velocities with 3D movement support
    onPositionChange(newX, newY, newZ);
    onVelocityChange(newVX, newVY, newVZ);
    
    // Update jumping state when landing on a platform or ground
    const platformHeight = getPlatformHeight(newX, newZ);
    if (isJumping && (Math.abs(newY - platformHeight) < 0.1 || newY <= 0.01)) {
      onJumpingChange(false);
      console.log("CPU landed on platform at height:", platformHeight);
    }
    
    // Check if player is attacking and close enough to block
    if (
      playerState.isAttacking && 
      distanceToPlayer < 2.0 && 
      !isAttacking && 
      Math.random() < this.blockChance * 5 // Higher chance to block when player is attacking
    ) {
      this.currentAction = CPUAction.BLOCK;
      this.actionTimer = 30;
      onBlockingChange(true);
    }
  }
  
  private decideAction(distanceToPlayer: number, playerIsAttacking: boolean) {
    // Don't change action if player is attacking and we're blocking
    if (playerIsAttacking && this.currentAction === CPUAction.BLOCK) {
      this.actionTimer = 20;
      return;
    }
    
    // Random action selection based on distance and chances
    const rand = Math.random();
    
    // Log for debugging
    if (Math.random() < 0.05) { // Only log occasionally to avoid console spam
      console.log(`CPU deciding action. Distance: ${distanceToPlayer.toFixed(2)}, Target: ${this.targetDistance}`);
    }
    
    // Within attack range - most likely attack or block
    if (distanceToPlayer <= ATTACK_RANGE * 1.1 && distanceToPlayer >= ATTACK_RANGE * 0.7) {
      // Perfect strike range! CPU should mainly focus on fighting
      // High chance to attack when in perfect range
      if (rand < 0.65) {
        this.currentAction = CPUAction.ATTACK;
        this.actionTimer = 10;
        console.log('CPU decided to ATTACK because in perfect range');
      } 
      // Occasionally block to anticipate player attacks
      else if (rand < 0.75) {
        this.currentAction = CPUAction.BLOCK;
        this.actionTimer = 15 + Math.floor(Math.random() * 15);
        console.log('CPU decided to BLOCK');
      } 
      // Mix in some grabs for variety
      else if (rand < 0.85) {
        this.currentAction = CPUAction.GRAB;
        this.actionTimer = 5;
        console.log('CPU decided to GRAB in perfect range');
      }
      // Sometimes jump to set up air attacks
      else if (rand < 0.95) {
        this.currentAction = CPUAction.JUMP;
        this.actionTimer = 5;
        console.log('CPU decided to JUMP for air attack');
      } 
      // Rarely dodge to avoid predictability
      else {
        this.currentAction = CPUAction.DODGE;
        this.actionTimer = 5;
        console.log('CPU decided to DODGE unpredictably');
      }
    } 
    // Too far from player, primarily focus on closing the distance
    else if (distanceToPlayer > this.targetDistance * 1.2) {
      // Most of the time chase directly
      if (rand < 0.7) {
        this.currentAction = CPUAction.CHASE;
        this.actionTimer = 30 + Math.floor(Math.random() * 30);
        console.log('CPU decided to CHASE');
      }
      // Sometimes jump to traverse platforms or take shortcuts
      else if (rand < 0.9) {
        this.currentAction = CPUAction.JUMP;
        this.actionTimer = 5;
        console.log('CPU decided to JUMP to close distance');
      }
      // Occasionally air jump for vertical navigation
      else if (rand < 0.95) {
        this.currentAction = CPUAction.AIR_JUMP;
        this.actionTimer = 5;
        console.log('CPU decided to AIR JUMP for vertical approach');
      }
      // Rarely taunt when far away
      else {
        this.currentAction = CPUAction.TAUNT;
        this.actionTimer = 5;
        console.log('CPU decided to TAUNT from a safe distance');
      }
    } 
    // Too close to player, need some space
    else if (distanceToPlayer < this.targetDistance * 0.5) {
      // Usually back up
      if (rand < 0.6) {
        this.currentAction = CPUAction.RETREAT;
        this.actionTimer = 15 + Math.floor(Math.random() * 15);
        console.log('CPU decided to RETREAT');
      }
      // Sometimes attack anyway if very close
      else if (rand < 0.8) {
        this.currentAction = CPUAction.ATTACK;
        this.actionTimer = 10;
        console.log('CPU decided to ATTACK despite close range');
      }
      // Dodge away
      else if (rand < 0.9) {
        this.currentAction = CPUAction.DODGE;
        this.actionTimer = 5;
        console.log('CPU decided to DODGE away');
      }
      // Jump out
      else {
        this.currentAction = CPUAction.JUMP;
        this.actionTimer = 5;
        console.log('CPU decided to JUMP away');
      }
    } 
    // Within good range but not perfect - balanced strategy
    else {
      // Strategic approach - attack when reasonable
      if (rand < this.attackChance) {
        this.currentAction = CPUAction.ATTACK;
        this.actionTimer = 10;
        console.log('CPU decided to ATTACK strategically');
      } 
      // Block to stay safe
      else if (rand < this.attackChance + this.blockChance) {
        this.currentAction = CPUAction.BLOCK;
        this.actionTimer = 15 + Math.floor(Math.random() * 15);
        console.log('CPU decided to BLOCK strategically');
      } 
      // Jump for positional advantage
      else if (rand < this.attackChance + this.blockChance + this.jumpChance) {
        this.currentAction = CPUAction.JUMP;
        this.actionTimer = 5;
        console.log('CPU decided to JUMP for position');
      } 
      // Dodge to avoid attacks
      else if (rand < this.attackChance + this.blockChance + this.jumpChance + this.dodgeChance) {
        this.currentAction = CPUAction.DODGE;
        this.actionTimer = 5;
        console.log('CPU decided to DODGE');
      } 
      // Grab when player might be blocking
      else if (rand < this.attackChance + this.blockChance + this.jumpChance + this.dodgeChance + this.grabChance) {
        this.currentAction = CPUAction.GRAB;
        this.actionTimer = 5;
        console.log('CPU decided to GRAB');
      } 
      // Try air attack for surprise
      else if (rand < this.attackChance + this.blockChance + this.jumpChance + this.dodgeChance + this.grabChance + this.airAttackChance) {
        this.currentAction = CPUAction.AIR_ATTACK;
        this.actionTimer = 5;
        console.log('CPU decided to use AIR ATTACK');
      }
      // Chase to optimize position
      else if (rand < this.attackChance + this.blockChance + this.jumpChance + this.dodgeChance + this.grabChance + this.airAttackChance + 0.2) {
        this.currentAction = CPUAction.CHASE;
        this.actionTimer = 20 + Math.floor(Math.random() * 20);
        console.log('CPU decided to CHASE (positioning)');
      } 
      // Taunt rarely
      else if (rand < this.attackChance + this.blockChance + this.jumpChance + this.dodgeChance + this.grabChance + this.airAttackChance + 0.2 + this.tauntChance) {
        this.currentAction = CPUAction.TAUNT;
        this.actionTimer = 5;
        console.log('CPU decided to TAUNT');
      } 
      // Sometimes just pause to reset
      else {
        this.currentAction = CPUAction.IDLE;
        this.actionTimer = 10 + Math.floor(Math.random() * 10);
        console.log('CPU decided to IDLE (strategic pause)');
      }
    }
    
    // Special case: if player is attacking and we're close enough, high chance to block or dodge
    if (playerIsAttacking && distanceToPlayer < ATTACK_RANGE * 1.5) {
      if (this.currentAction !== CPUAction.BLOCK && 
          this.currentAction !== CPUAction.JUMP && 
          this.currentAction !== CPUAction.DODGE) {
        
        // Determine whether to block or dodge
        if (Math.random() < 0.7) {
          this.currentAction = CPUAction.BLOCK;
          this.actionTimer = 20;
          console.log('CPU decided to BLOCK because player is attacking');
        } else {
          this.currentAction = CPUAction.DODGE;
          this.actionTimer = 15;
          console.log('CPU decided to DODGE because player is attacking');
        }
      }
    }
  }
}
