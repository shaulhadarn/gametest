import { HullSize } from './types';

export interface ShipComponent {
  id: string;
  name: string;
  type: 'weapon' | 'shield' | 'armor' | 'engine' | 'computer' | 'special';
  space: number;
  cost: number;
  techLevel: number;
  stats: Record<string, number>;
}

export interface ShipDesign {
  id: string;
  playerId: string;
  name: string;
  hullSize: HullSize;
  weaponIds: string[];
  shieldId: string | null;
  armorId: string | null;
  engineId: string | null;
  computerId: string | null;
  specialIds: string[];
  totalSpace: number;
  usedSpace: number;
  cost: number;
  attack: number;
  defense: number;
  hp: number;
  speed: number;
  initiative: number;
}

export interface Ship {
  id: string;
  designId: string;
  playerId: string;
  currentHP: number;
  experience: number;
  fleetId: string | null;
}
