import { GameState } from '@/core/GameState';
import { VictoryType, TechCategory } from '@/models/types';
import { SCORE_VICTORY_TURN, COUNCIL_VOTE_INTERVAL, COUNCIL_VOTE_THRESHOLD } from '@/core/Constants';

export interface VictoryCheck {
  achieved: boolean;
  playerId: string | null;
  type: VictoryType | null;
}

export class VictoryService {
  checkVictory(state: GameState): VictoryCheck {
    // Conquest victory
    const conquest = this.checkConquest(state);
    if (conquest.achieved) return conquest;

    // Tech victory
    const tech = this.checkTechnological(state);
    if (tech.achieved) return tech;

    // Diplomatic victory (every N turns)
    if (state.turn % COUNCIL_VOTE_INTERVAL === 0 && state.turn > 0) {
      const diplomatic = this.checkDiplomatic(state);
      if (diplomatic.achieved) return diplomatic;
    }

    // Score victory (turn limit)
    if (state.turn >= SCORE_VICTORY_TURN) {
      return this.checkScore(state);
    }

    return { achieved: false, playerId: null, type: null };
  }

  private checkConquest(state: GameState): VictoryCheck {
    const alivePlayers = Object.values(state.players).filter(p => p.alive);
    if (alivePlayers.length === 1) {
      return { achieved: true, playerId: alivePlayers[0].id, type: VictoryType.CONQUEST };
    }
    return { achieved: false, playerId: null, type: null };
  }

  private checkTechnological(state: GameState): VictoryCheck {
    const categories = Object.values(TechCategory);

    for (const player of Object.values(state.players)) {
      if (!player.alive) continue;

      // Check if player has max-level tech in every category
      let allMaxed = true;
      for (const cat of categories) {
        const maxLevelTech = Object.values(state.technologies)
          .filter(t => t.category === cat)
          .sort((a, b) => b.level - a.level)[0];

        if (maxLevelTech && !player.knownTechIds.includes(maxLevelTech.id)) {
          allMaxed = false;
          break;
        }
      }

      if (allMaxed) {
        return { achieved: true, playerId: player.id, type: VictoryType.TECHNOLOGICAL };
      }
    }

    return { achieved: false, playerId: null, type: null };
  }

  private checkDiplomatic(state: GameState): VictoryCheck {
    const alivePlayers = Object.values(state.players).filter(p => p.alive);
    const totalVotes = alivePlayers.length;

    for (const candidate of alivePlayers) {
      let votes = 1; // Self-vote

      for (const other of alivePlayers) {
        if (other.id === candidate.id) continue;

        const rel = state.diplomacy.find(
          d => (d.player1Id === candidate.id && d.player2Id === other.id) ||
               (d.player1Id === other.id && d.player2Id === candidate.id)
        );

        if (rel && rel.reputation >= 50) {
          votes++;
        }
      }

      if (votes / totalVotes >= COUNCIL_VOTE_THRESHOLD) {
        return { achieved: true, playerId: candidate.id, type: VictoryType.DIPLOMATIC };
      }
    }

    return { achieved: false, playerId: null, type: null };
  }

  private checkScore(state: GameState): VictoryCheck {
    // Calculate scores
    for (const player of Object.values(state.players)) {
      player.score = this.calculateScore(state, player.id);
    }

    const winner = Object.values(state.players)
      .filter(p => p.alive)
      .sort((a, b) => b.score - a.score)[0];

    if (winner) {
      return { achieved: true, playerId: winner.id, type: VictoryType.SCORE };
    }

    return { achieved: false, playerId: null, type: null };
  }

  calculateScore(state: GameState, playerId: string): number {
    const player = state.players[playerId];
    if (!player) return 0;

    let score = 0;
    score += player.colonyIds.length * 100;  // Colonies
    score += player.knownTechIds.length * 30; // Technology
    score += player.fleetIds.length * 20;     // Military
    score += Math.floor(player.credits / 10); // Wealth

    // Population
    for (const colonyId of player.colonyIds) {
      const colony = state.colonies[colonyId];
      if (colony) {
        score += Math.floor(colony.population * 10);
      }
    }

    return score;
  }
}
