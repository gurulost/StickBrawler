// Constants for physics calculations
export const GRAVITY = 0.012; // Reduced for smoother jumping
export const JUMP_FORCE = 0.4; // Decreased for more controlled jumping with lower height
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

// Attack parameters (further reduced damage per hit for better balance)
export const PUNCH_DAMAGE = 2; // Reduced from 3
export const KICK_DAMAGE = 3;  // Reduced from 5
export const SPECIAL_DAMAGE = 5; // Reduced from 8
export const ATTACK_RANGE = 1.5; // Kept the same for consistent hit detection

// Combo system constants
export const COMBO_WINDOW = 800; // Time window in ms to chain attacks for combos
export const COMBO_MULTIPLIER = 1.2; // Damage multiplier for each hit in a combo

// Platform system for multi-level combat
export interface Platform {
  x1: number;  // Left edge
  x2: number;  // Right edge
  z1: number;  // Front edge
  z2: number;  // Back edge 
  y: number;   // Height of platform
}

// Define platforms in the arena (coordinates are in world space)
// Now smaller and more strategically placed
export const PLATFORMS: Platform[] = [
  // Main floor platform is implicit at y=0
  
  // Small floating platform in center, higher up for challenging jumps
  {
    x1: -2,
    x2: 2,
    z1: -2,
    z2: 2,
    y: 4
  },
  
  // Small platform to the left side (reduced size)
  {
    x1: -9,
    x2: -6,
    z1: -1,
    z2: 1,
    y: 2
  },
  
  // Small platform to the right side (reduced size)
  {
    x1: 6,
    x2: 9,
    z1: -1,
    z2: 1,
    y: 2
  },
  
  // Tiny stepping platform between left and center
  {
    x1: -5,
    x2: -3,
    z1: -1,
    z2: 1,
    y: 3
  },
  
  // Tiny stepping platform between right and center
  {
    x1: 3,
    x2: 5,
    z1: -1,
    z2: 1,
    y: 3
  },
  
  // Small higher platform on far left
  {
    x1: -10,
    x2: -8,
    z1: 3,
    z2: 5,
    y: 5
  },
  
  // Small higher platform on far right
  {
    x1: 8,
    x2: 10,
    z1: 3,
    z2: 5,
    y: 5
  }
];

/**
 * Check if a point is on a platform
 */
export function isOnPlatform(x: number, y: number, z: number, platformY: number = 0): boolean {
  // First check the main floor (implicit platform at y=0)
  if (Math.abs(y - FLOOR_Y) < 0.1 && y >= 0) {
    return true;
  }
  
  // Then check all other platforms
  for (const platform of PLATFORMS) {
    // Check if within the platform boundaries (with a small margin)
    const onPlatformX = x >= platform.x1 && x <= platform.x2;
    const onPlatformZ = z >= platform.z1 && z <= platform.z2;
    const onPlatformY = Math.abs(y - platform.y) < 0.1 && y >= platform.y;
    
    if (onPlatformX && onPlatformZ && onPlatformY) {
      return true;
    }
  }
  
  return false;
}

/**
 * Find the platform height at a given x,z position
 * Returns the height of the highest platform at this position
 * or FLOOR_Y if no platform exists there
 */
export function getPlatformHeight(x: number, z: number): number {
  let highestY = FLOOR_Y;
  
  for (const platform of PLATFORMS) {
    if (x >= platform.x1 && x <= platform.x2 && 
        z >= platform.z1 && z <= platform.z2 && 
        platform.y > highestY) {
      highestY = platform.y;
    }
  }
  
  return highestY;
}

/**
 * Applies gravity to a vertical position and velocity,
 * with platform collision detection
 */
export function applyGravity(y: number, velocityY: number, x: number = 0, z: number = 0): [number, number] {
  // Apply gravity to the velocity
  const newVelocityY = velocityY - GRAVITY;
  
  // Calculate new position
  const newY = y + newVelocityY;
  
  // Find the height of the platform at the current x,z position
  const platformHeight = getPlatformHeight(x, z);
  
  // Check if on a platform or the ground
  if (newY <= platformHeight && y > platformHeight - 0.5) {
    // We're landing on a platform from above
    return [platformHeight, 0]; // Reset velocity when on platform
  }
  // Check if on main ground
  else if (newY <= FLOOR_Y) {
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
