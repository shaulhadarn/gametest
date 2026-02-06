export interface Player {
  id: string;
  name: string;
  raceId: string;
  isAI: boolean;
  color: number; // hex color
  credits: number;
  researchPool: number;
  currentResearchId: string | null;
  knownTechIds: string[];
  colonyIds: string[];
  fleetIds: string[];
  homeStarId: string;
  score: number;
  alive: boolean;
}
