// Constants for physics calculations
export const GRAVITY = 0.015; // Reduced for smoother jumping
export const JUMP_FORCE = 0.6; // Decreased for more controlled jumping
export const PLAYER_SPEED = 0.06; // Increased for better movement across larger arena
export const CPU_SPEED = 0.05; // Increased to match player in larger arena
export const DRAG = 0.92; // Increased drag for smoother movement
export const FLOOR_Y = 0;
export const ARENA_WIDTH = 24; // Dramatically increased for much bigger play area
export const ARENA_HALF_WIDTH = ARENA_WIDTH / 2;
export const ARENA_DEPTH = 14; // Depth of the arena for z-axis movement
export const ARENA_HALF_DEPTH = ARENA_DEPTH / 2;

// Player bounding box dimensions
export const PLAYER_WIDTH = 0.5;
export const PLAYER_HEIGHT = 1.8;

// Attack parameters (drastically reduced damage per hit)
export const PUNCH_DAMAGE = 3; // Reduced from 10
export const KICK_DAMAGE = 5;  // Reduced from 15
export const SPECIAL_DAMAGE = 8; // Reduced from 25
export const ATTACK_RANGE = 1.5; // Kept the same for consistent hit detection

// Combo system constants
export const COMBO_WINDOW = 800; // Time window in ms to chain attacks for combos
export const COMBO_MULTIPLIER = 1.2; // Damage multiplier for each hit in a combo

/**
 * Applies gravity to a vertical position and velocity
 */
export function applyGravity(y: number, velocityY: number): [number, number] {
  // Apply gravity to the velocity
  const newVelocityY = velocityY - GRAVITY;
  
  // Calculate new position
  const newY = y + newVelocityY;
  
  // Check if on ground
  if (newY <= FLOOR_Y) {
    return [FLOOR_Y, 0]; // Reset velocity when on ground
  }
  
  return [newY, newVelocityY];
}

/**
 * Checks if character is within arena boundaries on X-axis and adjusts position if needed
 */
export function stayInArena(x: number): number {
  if (x < -ARENA_HALF_WIDTH) {
    return -ARENA_HALF_WIDTH;
  }
  if (x > ARENA_HALF_WIDTH) {
    return ARENA_HALF_WIDTH;
  }
  return x;
}

/**
 * Checks if character is within arena boundaries on Z-axis and adjusts position if needed
 */
export function stayInArenaZ(z: number): number {
  if (z < -ARENA_HALF_DEPTH) {
    return -ARENA_HALF_DEPTH;
  }
  if (z > ARENA_HALF_DEPTH) {
    return ARENA_HALF_DEPTH;
  }
  return z;
}

/**
 * Apply drag to velocity to slow down over time
 */
export function applyDrag(velocity: number): number {
  return velocity * DRAG;
}

/**
 * Checks if two characters are colliding (simple AABB collision in 3D)
 */
export function checkCollision(
  pos1: [number, number, number], 
  pos2: [number, number, number]
): boolean {
  const [x1, y1, z1] = pos1;
  const [x2, y2, z2] = pos2;
  
  // Check x-axis overlap
  const xOverlap = 
    Math.abs(x1 - x2) < PLAYER_WIDTH;
  
  // Check y-axis overlap
  const yOverlap = 
    Math.abs(y1 - y2) < PLAYER_HEIGHT;
    
  // Check z-axis overlap - Now considering z-axis for full 3D collision
  const zOverlap = 
    Math.abs(z1 - z2) < PLAYER_WIDTH;
  
  // Return true only if all three axes overlap
  return xOverlap && yOverlap && zOverlap;
}

/**
 * Checks if an attack hits based on positions and facing direction in 3D
 */
export function checkAttackHit(
  attackerPos: [number, number, number],
  attackerDirection: 1 | -1,
  targetPos: [number, number, number]
): boolean {
  const [attackerX, attackerY, attackerZ] = attackerPos;
  const [targetX, targetY, targetZ] = targetPos;
  
  // Check that the attacker is facing the target (x-axis)
  const isFacingTarget = 
    (attackerDirection === 1 && attackerX < targetX) ||
    (attackerDirection === -1 && attackerX > targetX);
  
  // Check if target is within attack range on x-axis
  const inRangeX = Math.abs(attackerX - targetX) < ATTACK_RANGE;
  
  // Check if heights are roughly similar (characters can't be too far above/below)
  const similarHeight = Math.abs(attackerY - targetY) < PLAYER_HEIGHT * 0.5;
  
  // Check if target is within attack range on z-axis
  const inRangeZ = Math.abs(attackerZ - targetZ) < ATTACK_RANGE;
  
  // Calculate an actual 3D distance for more realistic attack range
  const distance3D = Math.sqrt(
    Math.pow(attackerX - targetX, 2) + 
    Math.pow(attackerZ - targetZ, 2)
  );
  const inRange3D = distance3D < ATTACK_RANGE;
  
  // Return true if attacker is facing target, they're at similar height,
  // and the 3D distance is within attack range
  return isFacingTarget && similarHeight && inRange3D;
}
