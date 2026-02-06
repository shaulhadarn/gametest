import { GameState } from '@/core/GameState';
import { DiplomacyState, DiplomacyProposal } from '@/models/DiplomacyState';
import { DiplomacyStatus } from '@/models/types';
import { REPUTATION_DECAY_PER_TURN, REPUTATION_MIN, REPUTATION_MAX } from '@/core/Constants';

export class DiplomacyService {
  initRelation(state: GameState, player1Id: string, player2Id: string): void {
    const existing = state.diplomacy.find(
      d => (d.player1Id === player1Id && d.player2Id === player2Id) ||
           (d.player1Id === player2Id && d.player2Id === player1Id)
    );
    if (existing) return;

    state.diplomacy.push({
      player1Id,
      player2Id,
      status: DiplomacyStatus.NEUTRAL,
      reputation: 0,
      treaties: [],
      lastContactTurn: 0,
      pendingProposals: [],
    });
  }

  getRelation(state: GameState, p1: string, p2: string): DiplomacyState | null {
    return state.diplomacy.find(
      d => (d.player1Id === p1 && d.player2Id === p2) ||
           (d.player1Id === p2 && d.player2Id === p1)
    ) || null;
  }

  declareWar(state: GameState, aggressorId: string, targetId: string): void {
    const rel = this.getRelation(state, aggressorId, targetId);
    if (!rel) return;

    rel.status = DiplomacyStatus.WAR;
    rel.treaties = [];
    rel.reputation = Math.max(REPUTATION_MIN, rel.reputation - 40);
  }

  proposePeace(state: GameState, fromId: string, toId: string): void {
    const rel = this.getRelation(state, fromId, toId);
    if (!rel || rel.status !== DiplomacyStatus.WAR) return;

    rel.pendingProposals.push({
      fromPlayerId: fromId,
      toPlayerId: toId,
      type: 'peace',
      turn: state.turn,
    });
  }

  proposeTreaty(state: GameState, fromId: string, toId: string, type: 'non_aggression' | 'trade' | 'alliance'): void {
    const rel = this.getRelation(state, fromId, toId);
    if (!rel || rel.status === DiplomacyStatus.WAR) return;

    rel.pendingProposals.push({
      fromPlayerId: fromId,
      toPlayerId: toId,
      type,
      turn: state.turn,
    });
  }

  acceptProposal(state: GameState, proposal: DiplomacyProposal): void {
    const rel = this.getRelation(state, proposal.fromPlayerId, proposal.toPlayerId);
    if (!rel) return;

    switch (proposal.type) {
      case 'peace':
        rel.status = DiplomacyStatus.NEUTRAL;
        rel.reputation += 10;
        break;
      case 'non_aggression':
        rel.status = DiplomacyStatus.NON_AGGRESSION;
        rel.treaties.push({ type: 'non_aggression', startTurn: state.turn });
        rel.reputation += 5;
        break;
      case 'trade':
        rel.status = DiplomacyStatus.TRADE;
        rel.treaties.push({ type: 'trade', startTurn: state.turn });
        rel.reputation += 10;
        break;
      case 'alliance':
        rel.status = DiplomacyStatus.ALLIANCE;
        rel.treaties.push({ type: 'alliance', startTurn: state.turn });
        rel.reputation += 20;
        break;
    }

    // Remove proposal
    rel.pendingProposals = rel.pendingProposals.filter(p => p !== proposal);
    rel.reputation = Math.min(REPUTATION_MAX, Math.max(REPUTATION_MIN, rel.reputation));
  }

  rejectProposal(state: GameState, proposal: DiplomacyProposal): void {
    const rel = this.getRelation(state, proposal.fromPlayerId, proposal.toPlayerId);
    if (!rel) return;

    rel.pendingProposals = rel.pendingProposals.filter(p => p !== proposal);
    rel.reputation -= 5;
    rel.reputation = Math.min(REPUTATION_MAX, Math.max(REPUTATION_MIN, rel.reputation));
  }

  processTurn(state: GameState): void {
    for (const rel of state.diplomacy) {
      // Reputation decay toward 0
      if (rel.reputation > 0) {
        rel.reputation = Math.max(0, rel.reputation - REPUTATION_DECAY_PER_TURN);
      } else if (rel.reputation < 0) {
        rel.reputation = Math.min(0, rel.reputation + REPUTATION_DECAY_PER_TURN);
      }

      // Trade income
      if (rel.treaties.some(t => t.type === 'trade')) {
        const p1 = state.players[rel.player1Id];
        const p2 = state.players[rel.player2Id];
        if (p1 && p2) {
          p1.credits += 3;
          p2.credits += 3;
        }
      }

      // Remove stale proposals
      rel.pendingProposals = rel.pendingProposals.filter(
        p => state.turn - p.turn < 5
      );
    }
  }
}
