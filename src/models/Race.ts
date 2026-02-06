export interface RaceTrait {
  id: string;
  name: string;
  description: string;
  effects: Record<string, number>;
}

export interface Race {
  id: string;
  name: string;
  description: string;
  homeworld: string; // planet type
  traits: RaceTrait[];
  defaultPersonality: string; // AI personality id
  portraitIndex: number;
}
