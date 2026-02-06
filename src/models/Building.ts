export interface Building {
  id: string;
  name: string;
  description: string;
  cost: number;
  maintenance: number;
  effects: Record<string, number>; // e.g., { food_bonus: 1.25, production_flat: 5 }
  requiredTechId: string | null;
  unique: boolean; // only one per colony
}
