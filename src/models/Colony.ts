export interface BuildQueueItem {
  id: string;
  name: string;
  type: 'building' | 'ship';
  referenceId: string; // buildingId or shipDesignId
  cost: number;
  progress: number;
}

export interface Colony {
  id: string;
  planetId: string;
  playerId: string;
  name: string;
  population: number;
  maxPopulation: number;
  farmers: number;
  workers: number;
  scientists: number;
  buildings: string[]; // building type IDs
  buildQueue: BuildQueueItem[];
  morale: number; // 0-100
  foodOutput: number;
  productionOutput: number;
  researchOutput: number;
  creditsOutput: number;
}
