/**
 * Seeded PRNG using mulberry32 algorithm.
 * Deterministic results for the same seed.
 */
export class Random {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

  /** Returns a float in [0, 1) */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max] inclusive */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Returns a float in [min, max) */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /** Gaussian distribution using Box-Muller transform */
  nextGaussian(mean: number = 0, stddev: number = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2);
    return z * stddev + mean;
  }

  /** Returns true with given probability [0, 1] */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /** Pick a random element from an array */
  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  /** Shuffle an array in place (Fisher-Yates) */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /** Weighted random selection. Returns index. */
  weightedPick(weights: number[]): number {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.next() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  }

  /** Get current seed state (for serialization) */
  getState(): number {
    return this.state;
  }

  /** Restore seed state */
  setState(state: number): void {
    this.state = state;
  }
}
