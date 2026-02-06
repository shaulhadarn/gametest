import { PlanetType, PlanetSize, MineralLevel, SpecialResource } from './types';

export interface Planet {
  id: string;
  starId: string;
  name: string;
  type: PlanetType;
  size: PlanetSize;
  minerals: MineralLevel;
  habitability: number; // 0-100
  specialResource: SpecialResource;
  colonyId: string | null;
  orbitIndex: number; // 0-based orbit position
  moonCount: number;
}
