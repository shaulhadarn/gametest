export interface Fleet {
  id: string;
  playerId: string;
  name: string;
  shipIds: string[];
  currentStarId: string;
  destinationStarId: string | null;
  movementProgress: number; // 0 to 1
  speed: number;
  path: string[]; // star IDs for multi-hop routes
}
