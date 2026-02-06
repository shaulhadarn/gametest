import { TechCategory } from './types';

export interface TechEffect {
  type: string; // e.g., 'production_bonus', 'unlock_building', 'unlock_component'
  value: number | string;
}

export interface Technology {
  id: string;
  name: string;
  category: TechCategory;
  level: number;
  researchCost: number;
  description: string;
  effects: TechEffect[];
  prerequisiteIds: string[];
  unlocks: string[]; // IDs of things this unlocks (buildings, components, etc.)
}
