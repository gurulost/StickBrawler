import { CharacterState } from "../lib/stores/useFighting";
import { applyGravity, stayInArena, applyDrag, JUMP_FORCE, CPU_SPEED, checkAttackHit } from "./Physics";

// CPU difficulty levels
export enum CPUDifficulty {
  EASY,
  MEDIUM,
  HARD
}

// Action states for the CPU
export enum CPUAction {
  IDLE,
  CHASE,
  RETREAT,
  ATTACK,
  BLOCK,
  JUMP
}

export class CPUController {
  private difficulty: CPUDifficulty;
  private currentAction: CPUAction;
  private actionTimer: number;
  private targetDistance: number;
  private attackChance: number;
  private blockChance: number;
  private jumpChance: number;
  
  constructor(difficulty: CPUDifficulty = CPUDifficulty.MEDIUM) {
    this.difficulty = difficulty;
    this.currentAction = CPUAction.IDLE;
    this.actionTimer = 0;
    
    // Set behavior based on difficulty
    switch (difficulty) {
      case CPUDifficulty.EASY:
        this.targetDistance = 2.0; // Stays further away
        this.attackChance = 0.02;  // Attacks less frequently
        this.blockChance = 0.01;   // Blocks less frequently
        this.jumpChance = 0.01;    // Jumps less frequently
        break;
      case CPUDifficulty.HARD:
        this.targetDistance = 1.0; // Gets closer to player
        this.attackChance = 0.05;  // Attacks more frequently
        this.blockChance = 0.04;   // Blocks more frequently
        this.jumpChance = 0.03;    // Jumps more frequently
        break;
      default: // MEDIUM
        this.targetDistance = 1.5;
        this.attackChance = 0.03;
        this.blockChance = 0.02;
        this.jumpChance = 0.02;
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
    onBlockingChange: (isBlocking: boolean) => void
  ) {
    // Decrease action timer
    this.actionTimer--;
    
    // Get current state values
    const { position, velocity, direction, isJumping, isAttacking, isBlocking, attackCooldown } = cpuState;
    const [x, y, z] = position;
    const [vx, vy, vz] = velocity;
    
    // Get player position
    const [playerX, playerY, playerZ] = playerState.position;
    
    // Calculate distance to player
    const distanceToPlayer = Math.abs(x - playerX);
    
    // Decide on a new action if current action is complete
    if (this.actionTimer <= 0 && !isAttacking) {
      this.decideAction(distanceToPlayer, playerState.isAttacking);
    }
    
    // Execute the current action
    let newVX = vx;
    let newDirection = direction;
    
    switch (this.currentAction) {
      case CPUAction.CHASE:
        // Move toward player
        if (x < playerX) {
          newVX = CPU_SPEED;
          newDirection = 1;
        } else {
          newVX = -CPU_SPEED;
          newDirection = -1;
        }
        break;
        
      case CPUAction.RETREAT:
        // Move away from player
        if (x < playerX) {
          newVX = -CPU_SPEED;
          newDirection = -1;
        } else {
          newVX = CPU_SPEED;
          newDirection = 1;
        }
        break;
        
      case CPUAction.ATTACK:
        // Face player
        newDirection = x < playerX ? 1 : -1;
        
        // Attack if not on cooldown
        if (attackCooldown <= 0 && !isAttacking && !isBlocking) {
          onAttackingChange(true);
          
          // Reset attack after delay
          setTimeout(() => {
            onAttackingChange(false);
          }, 400);
        }
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
        }
        break;
        
      default: // IDLE
        // Apply drag
        newVX = applyDrag(newVX);
        
        // Reset blocking
        if (isBlocking) {
          onBlockingChange(false);
        }
    }
    
    // Apply direction change if needed
    if (newDirection !== direction) {
      onDirectionChange(newDirection);
    }
    
    // Apply gravity
    const [newY, newVY] = applyGravity(y, vy);
    
    // Calculate the new X position, staying within arena bounds
    const newX = stayInArena(x + newVX);
    
    // Update positions and velocities
    onPositionChange(newX, newY, z);
    onVelocityChange(newVX, newVY, vz);
    
    // Update jumping state
    if (isJumping && newY <= 0.01) {
      onJumpingChange(false);
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
    
    if (distanceToPlayer > this.targetDistance * 1.5) {
      // Too far from player, chase
      this.currentAction = CPUAction.CHASE;
      this.actionTimer = 30 + Math.floor(Math.random() * 30);
    } else if (distanceToPlayer < this.targetDistance * 0.5) {
      // Too close to player, retreat
      this.currentAction = CPUAction.RETREAT;
      this.actionTimer = 20 + Math.floor(Math.random() * 20);
    } else if (rand < this.attackChance) {
      // Attack
      this.currentAction = CPUAction.ATTACK;
      this.actionTimer = 10;
    } else if (rand < this.attackChance + this.blockChance) {
      // Block
      this.currentAction = CPUAction.BLOCK;
      this.actionTimer = 15 + Math.floor(Math.random() * 15);
    } else if (rand < this.attackChance + this.blockChance + this.jumpChance) {
      // Jump
      this.currentAction = CPUAction.JUMP;
      this.actionTimer = 5;
    } else {
      // Idle
      this.currentAction = CPUAction.IDLE;
      this.actionTimer = 10 + Math.floor(Math.random() * 10);
    }
  }
}
