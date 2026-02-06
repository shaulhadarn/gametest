import { GameState } from '@/core/GameState';
import { Player } from '@/models/Player';
import { Technology } from '@/models/Technology';
import { TechCategory } from '@/models/types';
import { AIPersonality } from './AIPersonality';

export class AIEvaluator {
  scoreTech(state: GameState, player: Player, tech: Technology, personality: AIPersonality): number {
    let score = 10;

    // Category preference based on personality
    const catWeights: Record<string, number> = {
      [TechCategory.WEAPONS]: personality.aggressiveness,
      [TechCategory.FORCE_FIELDS]: personality.aggressiveness * 0.8,
      [TechCategory.PROPULSION]: personality.expansionism * 0.8,
      [TechCategory.PLANETOLOGY]: personality.expansionism * 0.6 + personality.economyFocus * 0.4,
      [TechCategory.CONSTRUCTION]: personality.economyFocus,
      [TechCategory.COMPUTERS]: personality.technophilia,
    };

    score *= 1 + (catWeights[tech.category] || 0.5);

    // Prefer lower cost (faster to research)
    score *= 1 / (1 + tech.researchCost / 500);

    // Prefer techs that unlock things
    if (tech.unlocks.length > 0) score *= 1.3;

    // Prefer lower level techs (build foundational first)
    score *= 1 / tech.level;

    return score;
  }

  scoreColonySite(state: GameState, player: Player, planetId: string): number {
    const planet = state.planets[planetId];
    if (!planet || planet.colonyId) return -1;

    let score = 0;
    score += planet.habitability;
    score += planet.size * 10;
    score += planet.minerals * 8;

    if (planet.specialResource !== 'NONE') score += 30;

    // Distance penalty (approximate via connected stars)
    const star = state.stars[planet.starId];
    if (star) {
      const isNearOwned = star.warpLanes.some(wl => {
        const ws = state.stars[wl];
        return ws && ws.ownerId === player.id;
      });
      if (isNearOwned) score += 20;
    }

    return score;
  }

  scoreMilitaryStrength(state: GameState, playerId: string): number {
    const player = state.players[playerId];
    if (!player) return 0;

    let strength = 0;
    for (const fleetId of player.fleetIds) {
      const fleet = state.fleets[fleetId];
      if (!fleet) continue;
      for (const shipId of fleet.shipIds) {
        const ship = state.ships[shipId];
        if (!ship) continue;
        const design = state.shipDesigns[ship.designId];
        if (design) {
          strength += design.attack + design.defense + design.hp;
        }
      }
    }
    return strength;
  }

  scoreEconomicStrength(state: GameState, playerId: string): number {
    const player = state.players[playerId];
    if (!player) return 0;

    let strength = player.credits;
    for (const colonyId of player.colonyIds) {
      const colony = state.colonies[colonyId];
      if (colony) {
        strength += colony.productionOutput * 5;
        strength += colony.population * 10;
      }
    }
    return strength;
  }
}
