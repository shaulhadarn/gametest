import { DiplomacyStatus } from './types';

export interface Treaty {
  type: 'non_aggression' | 'trade' | 'alliance' | 'research';
  startTurn: number;
}

export interface DiplomacyState {
  player1Id: string;
  player2Id: string;
  status: DiplomacyStatus;
  reputation: number; // -100 to 100
  treaties: Treaty[];
  lastContactTurn: number;
  pendingProposals: DiplomacyProposal[];
}

export interface DiplomacyProposal {
  fromPlayerId: string;
  toPlayerId: string;
  type: 'non_aggression' | 'trade' | 'alliance' | 'peace' | 'war';
  turn: number;
}
