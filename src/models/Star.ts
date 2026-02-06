import { StarType, Vec3 } from './types';

export interface Star {
  id: string;
  name: string;
  position: Vec3;
  type: StarType;
  planetIds: string[];
  ownerId: string | null;
  warpLanes: string[]; // IDs of connected stars
  explored: Record<string, boolean>; // playerId -> explored
}
