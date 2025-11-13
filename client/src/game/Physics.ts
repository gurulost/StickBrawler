// Constants for physics calculations
export const GRAVITY = 0.008; // Further reduced for even slower/smoother jumping
export const JUMP_FORCE = 0.3; // Decreased for more controlled jumping with lower height
export const PLAYER_SPEED = 0.06; // Increased for better movement across larger arena
export const CPU_SPEED = 0.05; // Increased to match player in larger arena
export const DRAG = 0.92; // Increased drag for smoother movement
export const FLOOR_Y = 0;
export const ARENA_WIDTH = 30; // Further increased for an even larger play area
export const ARENA_HALF_WIDTH = ARENA_WIDTH / 2;
export const ARENA_DEPTH = 18; // Increased depth for z-axis movement
export const ARENA_HALF_DEPTH = ARENA_DEPTH / 2;

// Player bounding box dimensions
export const PLAYER_WIDTH = 0.5;
export const PLAYER_HEIGHT = 1.8;
export const CAPSULE_RADIUS = PLAYER_WIDTH * 0.5;

export const FLOOR_FRICTION = 0.82;
export const AIR_FRICTION = 0.97;
export const WALL_BOUNCE_RESTITUTION = 0.35;
export const HIT_LAG_DECAY = 0.9;

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
// Spread more evenly throughout the larger 3D space
/**
 * Generate the default set of combat platforms.
 * Symmetry is used so that left/right and front/back placements can be
 * described compactly.
 */
export function generateDefaultPlatforms(): Platform[] {
  const platforms: Platform[] = [];

  // Central floating platform
  platforms.push({ x1: -3, x2: 3, z1: -4, z2: 0, y: 4 });

  // Base platforms which will be mirrored to create symmetric pairs
  const bases: Platform[] = [
    { x1: -12, x2: -9, z1: -6, z2: -3, y: 2 },
    { x1: -7, x2: -4, z1: 2, z2: 5, y: 3 },
    { x1: -14, x2: -11, z1: 5, z2: 8, y: 5 },
  ];

  for (const b of bases) {
    // Original placement
    platforms.push({ ...b });

    // Mirrored counterpart across both axes
    platforms.push({
      x1: -b.x2,
      x2: -b.x1,
      z1: -b.z2,
      z2: -b.z1,
      y: b.y,
    });
  }

  // Central high platform
  platforms.push({ x1: -2, x2: 2, z1: -2, z2: 2, y: 7 });

  return platforms;
}

// Define platforms in the arena using the generator
export const PLATFORMS: Platform[] = generateDefaultPlatforms();

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
export function applyGravity(
  y: number,
  velocityY: number,
  x: number = 0,
  z: number = 0,
  dropThrough: boolean = false,
  delta: number = 1,
  capsuleRadius: number = CAPSULE_RADIUS,
): [number, number] {
  // Apply gravity to the velocity scaled by delta
  const newVelocityY = velocityY - GRAVITY * delta;

  // Calculate new position scaled by delta
  const newY = y + newVelocityY * delta;
  
  // Find the height of the platform at the current x,z position
  const platformHeight = getPlatformHeight(x, z);
  
  // If the player is pressing down (dropThrough = true), let them drop through platforms
  if (dropThrough && y === platformHeight && platformHeight > FLOOR_Y) {
    // If we're on a platform and want to drop through, add a small push down
    return [y - 0.1, newVelocityY - 0.01]; // Push through the platform
  }
  // Check if on a platform or the ground 
  else if (newY <= platformHeight && y > platformHeight - capsuleRadius - 0.1) {
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
export function applyDrag(velocity: number, delta: number = 1): number {
  // Linearly scale drag effect by delta
  const dragFactor = 1 - (1 - DRAG) * delta;
  return velocity * dragFactor;
}

export function applyHorizontalFriction(
  velocity: number,
  inAir: boolean,
  delta: number,
): number {
  const friction = inAir ? AIR_FRICTION : FLOOR_FRICTION;
  const factor = 1 - (1 - friction) * delta;
  return velocity * factor;
}

export function resolveCapsuleBounds(
  position: [number, number, number],
  velocity: [number, number, number],
  capsuleRadius: number = CAPSULE_RADIUS,
): {
  position: [number, number, number];
  velocity: [number, number, number];
} {
  let [x, y, z] = position;
  let [vx, vy, vz] = velocity;

  const minX = -ARENA_HALF_WIDTH + capsuleRadius;
  const maxX = ARENA_HALF_WIDTH - capsuleRadius;
  if (x < minX) {
    x = minX;
    vx = Math.abs(vx) * WALL_BOUNCE_RESTITUTION;
  } else if (x > maxX) {
    x = maxX;
    vx = -Math.abs(vx) * WALL_BOUNCE_RESTITUTION;
  }

  const minZ = -ARENA_HALF_DEPTH + capsuleRadius;
  const maxZ = ARENA_HALF_DEPTH - capsuleRadius;
  if (z < minZ) {
    z = minZ;
    vz = Math.abs(vz) * WALL_BOUNCE_RESTITUTION;
  } else if (z > maxZ) {
    z = maxZ;
    vz = -Math.abs(vz) * WALL_BOUNCE_RESTITUTION;
  }

  return {
    position: [x, y, z],
    velocity: [vx, vy, vz],
  };
}

export function computeHitLagSeconds(hitLagFrames: number): number {
  return hitLagFrames / 60;
}

export function applyHitLagTimer(timer: number, delta: number): number {
  if (timer <= 0) return 0;
  return Math.max(0, timer - delta * HIT_LAG_DECAY);
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
