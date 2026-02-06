import { Galaxy } from '@/models/Galaxy';
import { Star } from '@/models/Star';
import { Planet } from '@/models/Planet';
import { Colony } from '@/models/Colony';
import { Player } from '@/models/Player';
import { Fleet } from '@/models/Fleet';
import { Ship, ShipDesign } from '@/models/Ship';
import { Technology } from '@/models/Technology';
import { DiplomacyState } from '@/models/DiplomacyState';

export interface GameConfig {
  galaxySize: 'small' | 'medium' | 'large' | 'huge';
  galaxyShape: 'spiral' | 'elliptical' | 'ring';
  numPlayers: number;
  difficulty: 'easy' | 'normal' | 'hard' | 'impossible';
  seed: number;
  playerRaceId: string;
  playerName: string;
}

export interface GameState {
  config: GameConfig;
  turn: number;
  currentPlayerId: string;
  galaxy: Galaxy;
  stars: Record<string, Star>;
  planets: Record<string, Planet>;
  colonies: Record<string, Colony>;
  players: Record<string, Player>;
  fleets: Record<string, Fleet>;
  ships: Record<string, Ship>;
  shipDesigns: Record<string, ShipDesign>;
  technologies: Record<string, Technology>;
  diplomacy: DiplomacyState[];
  rngState: number;
}

export function createEmptyGameState(config: GameConfig): GameState {
  return {
    config,
    turn: 1,
    currentPlayerId: '',
    galaxy: { id: '', starIds: [], width: 0, height: 0 },
    stars: {},
    planets: {},
    colonies: {},
    players: {},
    fleets: {},
    ships: {},
    shipDesigns: {},
    technologies: {},
    diplomacy: [],
    rngState: config.seed,
  };
}
