import { GameState } from '@/core/GameState';
import { DiplomacyState, DiplomacyProposal, DiplomacyMessage } from '@/models/DiplomacyState';
import { DiplomacyStatus } from '@/models/types';
import { REPUTATION_DECAY_PER_TURN, REPUTATION_MIN, REPUTATION_MAX } from '@/core/Constants';
import { getRaceData } from '@/models/RaceData';

// Dialogue templates per race personality
const GREETING_TEMPLATES: Record<string, string[]> = {
  warmonger: [
    'Your presence is noted, {name}. Do not test our patience.',
    'We acknowledge your existence. Tread carefully.',
    'The {race} do not greet — we warn. Step wisely.',
  ],
  diplomat: [
    'Welcome, {name}. The {race} extend our hand in friendship.',
    'It is our pleasure to establish relations with your people.',
    'May this meeting herald a new era of cooperation between us.',
  ],
  scientist: [
    'Fascinating. Your species presents intriguing variables, {name}.',
    'We have observed your civilization. There is much to learn from each other.',
    'The {race} welcome contact. Knowledge shared is knowledge multiplied.',
  ],
  balanced: [
    'Greetings, {name}. We hope for peaceful coexistence.',
    'We acknowledge your people. Let us find common ground.',
    'The {race} are open to dialogue. What do you seek?',
  ],
  expansionist: [
    'You are in our path, {name}. We prefer cooperation over conflict.',
    'The {race} grow ever outward. There is room for all — for now.',
    'We note your borders, {name}. Respect ours, and we shall respect yours.',
  ],
};

const RESPONSE_TEMPLATES: Record<string, { positive: string[]; negative: string[] }> = {
  greeting: {
    positive: [
      'We are pleased by your words. Perhaps we can work together.',
      'Your openness is refreshing. Let us build on this.',
    ],
    negative: [
      'Your words are hollow. Prove your sincerity with actions.',
      'We have heard such promises before. Time will tell.',
    ],
  },
  threat: {
    positive: [
      'We do not wish conflict. Let us resolve this peacefully.',
      'Your aggression is noted. We prefer diplomacy over destruction.',
    ],
    negative: [
      'Threaten us again and you will regret it.',
      'Your posturing does not frighten us. Bring your fleets if you dare.',
    ],
  },
  praise: {
    positive: [
      'Your kind words strengthen the bond between our peoples.',
      'We are honored by your recognition. The feeling is mutual.',
    ],
    negative: [
      'Flattery will not sway our decisions. But... we appreciate the gesture.',
      'We accept your praise, though actions speak louder than words.',
    ],
  },
  demand_tribute: {
    positive: [
      'We will consider your request. A small investment in peace, perhaps.',
      'Very well. We transfer the credits as a gesture of goodwill.',
    ],
    negative: [
      'You dare demand tribute from us? This insult will not be forgotten.',
      'We bow to no one. Your demand is rejected.',
    ],
  },
  offer_tribute: {
    positive: [
      'We accept your generous offering. This improves our view of your people.',
      'A wise investment in our relationship. We shall remember this.',
    ],
    negative: [
      'We accept, though credits alone cannot buy our trust.',
      'Your offering is noted. Do not think it erases past grievances.',
    ],
  },
  insult: {
    positive: [
      'We choose not to respond to provocation. Rise above, as we do.',
      'Your words reveal more about you than about us.',
    ],
    negative: [
      'You will pay for this insult! Our patience has limits.',
      'Consider this a declaration of hostility. You have been warned.',
    ],
  },
};

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
      status: DiplomacyStatus.UNKNOWN,
      reputation: 0,
      treaties: [],
      lastContactTurn: 0,
      pendingProposals: [],
      contacted: false,
      contactTurn: 0,
      messages: [],
    });
  }

  getRelation(state: GameState, p1: string, p2: string): DiplomacyState | null {
    return state.diplomacy.find(
      d => (d.player1Id === p1 && d.player2Id === p2) ||
           (d.player1Id === p2 && d.player2Id === p1)
    ) || null;
  }

  makeContact(state: GameState, player1Id: string, player2Id: string): boolean {
    const rel = this.getRelation(state, player1Id, player2Id);
    if (!rel || rel.contacted) return false;

    rel.contacted = true;
    rel.contactTurn = state.turn;
    rel.status = DiplomacyStatus.NEUTRAL;
    rel.lastContactTurn = state.turn;

    // Generate first contact greeting from the other player
    const otherPlayerId = rel.player1Id === player1Id ? rel.player2Id : rel.player1Id;
    const otherPlayer = state.players[otherPlayerId];
    if (otherPlayer) {
      const raceData = getRaceData(otherPlayer.raceId);
      const personality = raceData?.race.defaultPersonality || 'balanced';
      const templates = GREETING_TEMPLATES[personality] || GREETING_TEMPLATES.balanced;
      const template = templates[state.turn % templates.length];
      const text = template
        .replace('{name}', state.players[player1Id]?.name || 'stranger')
        .replace('{race}', raceData?.race.name || 'our people');

      rel.messages.push({
        fromPlayerId: otherPlayerId,
        toPlayerId: player1Id,
        type: 'greeting',
        text,
        turn: state.turn,
      });
    }

    return true;
  }

  sendMessage(state: GameState, fromId: string, toId: string, type: DiplomacyMessage['type']): DiplomacyMessage | null {
    const rel = this.getRelation(state, fromId, toId);
    if (!rel || !rel.contacted) return null;

    const fromPlayer = state.players[fromId];
    const toPlayer = state.players[toId];
    if (!fromPlayer || !toPlayer) return null;

    const toRace = getRaceData(toPlayer.raceId);
    const toPersonality = toRace?.race.defaultPersonality || 'balanced';

    // Generate message text
    const text = this.generateMessageText(type, fromPlayer.name);

    // Generate response based on reputation and personality
    const responseTemplates = RESPONSE_TEMPLATES[type];
    let responseText = '';
    if (responseTemplates) {
      const isPositive = rel.reputation >= 0;
      const pool = isPositive ? responseTemplates.positive : responseTemplates.negative;
      responseText = pool[state.turn % pool.length];
    }

    // Apply reputation effects
    switch (type) {
      case 'greeting':
        rel.reputation = Math.min(REPUTATION_MAX, rel.reputation + 2);
        break;
      case 'praise':
        rel.reputation = Math.min(REPUTATION_MAX, rel.reputation + 5);
        break;
      case 'threat':
        rel.reputation = Math.max(REPUTATION_MIN, rel.reputation - 10);
        break;
      case 'insult':
        rel.reputation = Math.max(REPUTATION_MIN, rel.reputation - 15);
        break;
      case 'demand_tribute': {
        const accepted = rel.reputation > 20 && toPersonality !== 'warmonger';
        if (accepted) {
          const amount = 10 + Math.floor(rel.reputation / 5);
          toPlayer.credits -= amount;
          fromPlayer.credits += amount;
          rel.reputation -= 5;
          responseText = responseTemplates?.positive[state.turn % (responseTemplates.positive.length)] || '';
        } else {
          rel.reputation -= 10;
          responseText = responseTemplates?.negative[state.turn % (responseTemplates.negative.length)] || '';
        }
        break;
      }
      case 'offer_tribute': {
        const amount = Math.min(20, fromPlayer.credits);
        if (amount > 0) {
          fromPlayer.credits -= amount;
          toPlayer.credits += amount;
          rel.reputation = Math.min(REPUTATION_MAX, rel.reputation + 8);
          responseText = responseTemplates?.positive[state.turn % (responseTemplates.positive.length)] || '';
        }
        break;
      }
    }

    rel.lastContactTurn = state.turn;

    const msg: DiplomacyMessage = {
      fromPlayerId: fromId,
      toPlayerId: toId,
      type,
      text,
      responseText,
      turn: state.turn,
    };
    rel.messages.push(msg);
    return msg;
  }

  private generateMessageText(type: DiplomacyMessage['type'], playerName: string): string {
    switch (type) {
      case 'greeting': return `Greetings from ${playerName}. We come in peace.`;
      case 'praise': return `${playerName} commends the achievements of your civilization.`;
      case 'threat': return `${playerName} warns you: do not interfere with our interests, or face consequences.`;
      case 'insult': return `${playerName} has no respect for your pathetic civilization.`;
      case 'demand_tribute': return `${playerName} demands tribute as a sign of your respect.`;
      case 'offer_tribute': return `${playerName} offers tribute as a gesture of goodwill.`;
      case 'farewell': return `${playerName} ends this audience. Until we meet again.`;
      default: return `${playerName} reaches out to your civilization.`;
    }
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

  getContactedPlayers(state: GameState, playerId: string): string[] {
    return state.diplomacy
      .filter(d => d.contacted && (d.player1Id === playerId || d.player2Id === playerId))
      .map(d => d.player1Id === playerId ? d.player2Id : d.player1Id);
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
