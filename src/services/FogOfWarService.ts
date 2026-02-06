// FogOfWarService.ts - Manages fog of war visibility state and exploration logic
// Created: Tracks explored/visible stars per player, initializes home star + neighbors
// Provides methods to reveal stars when fleets arrive or scouts explore

import { Star } from '@/models/Star';
import { EventBus } from '@/core/EventBus';

export class FogOfWarService {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Initialize fog of war for a player: mark home star and its direct
   * warp-lane neighbors as explored.
   */
  initializeForPlayer(
    stars: Record<string, Star>,
    playerId: string,
    homeStarId: string
  ): void {
    const homeStar = stars[homeStarId];
    if (!homeStar) return;

    // Reveal home star
    homeStar.explored[playerId] = true;

    // Reveal direct neighbors (1 hop away)
    for (const neighborId of homeStar.warpLanes) {
      const neighbor = stars[neighborId];
      if (neighbor) {
        neighbor.explored[playerId] = true;
      }
    }

    // Reveal neighbors of neighbors (2 hops away)
    for (const neighborId of homeStar.warpLanes) {
      const neighbor = stars[neighborId];
      if (!neighbor) continue;
      for (const secondHopId of neighbor.warpLanes) {
        const secondHop = stars[secondHopId];
        if (secondHop) {
          secondHop.explored[playerId] = true;
        }
      }
    }
  }

  /**
   * Reveal a star and its immediate neighbors when a fleet arrives.
   */
  revealStar(
    stars: Record<string, Star>,
    playerId: string,
    starId: string
  ): string[] {
    const revealed: string[] = [];
    const star = stars[starId];
    if (!star) return revealed;

    // Reveal the star itself
    if (!star.explored[playerId]) {
      star.explored[playerId] = true;
      revealed.push(starId);
    }

    // Reveal direct neighbors
    for (const neighborId of star.warpLanes) {
      const neighbor = stars[neighborId];
      if (neighbor && !neighbor.explored[playerId]) {
        neighbor.explored[playerId] = true;
        revealed.push(neighborId);
      }
    }

    return revealed;
  }

  /**
   * Check if a star is explored by a given player.
   */
  isExplored(star: Star, playerId: string): boolean {
    return star.explored[playerId] === true;
  }

  /**
   * Get all explored star IDs for a player.
   */
  getExploredStarIds(stars: Record<string, Star>, playerId: string): Set<string> {
    const explored = new Set<string>();
    for (const star of Object.values(stars)) {
      if (star.explored[playerId]) {
        explored.add(star.id);
      }
    }
    return explored;
  }

  /**
   * Check if a warp lane connection should be visible (both ends explored).
   */
  isConnectionVisible(
    stars: Record<string, Star>,
    playerId: string,
    starIdA: string,
    starIdB: string
  ): boolean {
    const starA = stars[starIdA];
    const starB = stars[starIdB];
    if (!starA || !starB) return false;
    return starA.explored[playerId] === true && starB.explored[playerId] === true;
  }
}
