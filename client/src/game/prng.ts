/**
 * Deterministic PRNG (Mulberry32) for gameplay-affecting randomness
 * Ensures replays and multiplayer remain synchronized
 * 
 * Visual-only effects (particles, dust) can still use Math.random()
 */

export class DeterministicRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /**
   * Returns a deterministic random number between 0 and 1
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a deterministic random integer between min (inclusive) and max (exclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * Returns a deterministic random boolean with given probability
   */
  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Get current seed state for debugging
   */
  getState(): number {
    return this.state;
  }

  /**
   * Reset to a specific seed
   */
  reset(seed: number): void {
    this.state = seed;
  }
}

/**
 * Create a deterministic RNG from match ID and frame
 */
export function createMatchRNG(matchId: string, frame: number): DeterministicRandom {
  // Simple hash of matchId + frame for seed
  let hash = frame;
  for (let i = 0; i < matchId.length; i++) {
    hash = ((hash << 5) - hash) + matchId.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return new DeterministicRandom(hash);
}
