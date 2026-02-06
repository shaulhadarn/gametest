import { GameState } from '@/core/GameState';
import { Random } from '@/core/Random';
import { Player } from '@/models/Player';
import { AIEvaluator } from './AIEvaluator';
import { AIPersonality, getPersonality } from './AIPersonality';

export class AIController {
  private rng: Random;
  private evaluator: AIEvaluator;

  constructor(rng: Random) {
    this.rng = rng;
    this.evaluator = new AIEvaluator();
  }

  processTurn(state: GameState, playerId: string): void {
    const player = state.players[playerId];
    if (!player || !player.alive) return;

    const personality = getPersonality(player.raceId);

    this.manageResearch(state, player, personality);
    this.manageColonies(state, player, personality);
    this.manageFleets(state, player, personality);
    this.manageDiplomacy(state, player, personality);
  }

  private manageResearch(state: GameState, player: Player, personality: AIPersonality): void {
    if (player.currentResearchId) return;

    // Pick best available tech based on personality
    const available = Object.values(state.technologies).filter(tech => {
      if (player.knownTechIds.includes(tech.id)) return false;
      return tech.prerequisiteIds.every(pid => player.knownTechIds.includes(pid));
    });

    if (available.length === 0) return;

    // Score techs
    const scored = available.map(tech => ({
      tech,
      score: this.evaluator.scoreTech(state, player, tech, personality),
    })).sort((a, b) => b.score - a.score);

    // Pick from top 3 with some randomness
    const pickIdx = this.rng.nextInt(0, Math.min(2, scored.length - 1));
    player.currentResearchId = scored[pickIdx].tech.id;
    player.researchPool = 0;
  }

  private manageColonies(state: GameState, player: Player, personality: AIPersonality): void {
    for (const colonyId of player.colonyIds) {
      const colony = state.colonies[colonyId];
      if (!colony) continue;

      const pop = Math.floor(colony.population);
      const planet = state.planets[colony.planetId];
      if (!planet) continue;

      // Simple worker allocation based on personality and needs
      let farmers = Math.max(1, Math.ceil(pop * 0.3));
      let scientists = Math.floor(pop * personality.technophilia * 0.3);
      let workers = pop - farmers - scientists;

      if (workers < 0) {
        scientists += workers;
        workers = 0;
      }
      if (scientists < 0) scientists = 0;

      colony.farmers = farmers;
      colony.workers = Math.max(0, workers);
      colony.scientists = Math.max(0, scientists);

      // Queue buildings if nothing building
      if (colony.buildQueue.length === 0) {
        this.queueBuilding(state, colony, personality);
      }
    }
  }

  private queueBuilding(state: GameState, colony: any, personality: AIPersonality): void {
    const builtSet = new Set(colony.buildings);

    // Priority list based on personality
    const priorities = [
      { id: 'factory', cost: 60, condition: !builtSet.has('factory') },
      { id: 'farm', cost: 40, condition: !builtSet.has('farm') && colony.population > 3 },
      { id: 'lab', cost: 80, condition: !builtSet.has('lab') && personality.technophilia > 0.5 },
      { id: 'market', cost: 50, condition: !builtSet.has('market') },
      { id: 'automated_factory', cost: 150, condition: builtSet.has('factory') && !builtSet.has('automated_factory') },
    ];

    for (const item of priorities) {
      if (item.condition) {
        colony.buildQueue.push({
          id: `build_${Date.now().toString(36)}`,
          name: item.id.replace('_', ' '),
          type: 'building',
          referenceId: item.id,
          cost: item.cost,
          progress: 0,
        });
        return;
      }
    }
  }

  private manageFleets(state: GameState, player: Player, personality: AIPersonality): void {
    // Simple fleet management - expand or attack
    for (const fleetId of player.fleetIds) {
      const fleet = state.fleets[fleetId];
      if (!fleet || fleet.destinationStarId) continue;

      // If at war, try to attack enemy
      if (personality.aggressiveness > 0.5) {
        const enemyStars = Object.values(state.stars).filter(
          s => s.ownerId && s.ownerId !== player.id
        );
        if (enemyStars.length > 0 && fleet.shipIds.length >= 3) {
          const target = this.rng.pick(enemyStars);
          // Simple: move to adjacent star toward target
          const star = state.stars[fleet.currentStarId];
          if (star) {
            const neighbor = star.warpLanes.find(wl => {
              const ws = state.stars[wl];
              return ws && ws.ownerId && ws.ownerId !== player.id;
            });
            if (neighbor) {
              fleet.destinationStarId = neighbor;
              fleet.movementProgress = 0;
            }
          }
        }
      }
    }
  }

  private manageDiplomacy(state: GameState, player: Player, personality: AIPersonality): void {
    // Handle pending proposals
    for (const rel of state.diplomacy) {
      const isPlayer1 = rel.player1Id === player.id;
      const isPlayer2 = rel.player2Id === player.id;
      if (!isPlayer1 && !isPlayer2) continue;

      for (const proposal of rel.pendingProposals) {
        if (proposal.toPlayerId !== player.id) continue;

        // Accept based on personality and reputation
        const acceptChance = (personality.diplomacyOpenness + rel.reputation / 100) / 2;
        if (this.rng.chance(Math.max(0.1, acceptChance))) {
          // Accept (simplified - would call DiplomacyService)
          rel.pendingProposals = rel.pendingProposals.filter(p => p !== proposal);
        }
      }
    }
  }
}
