// Galaxy generation
export const GALAXY_SIZES = {
  small: { stars: 24, radius: 200 },
  medium: { stars: 48, radius: 300 },
  large: { stars: 72, radius: 400 },
  huge: { stars: 108, radius: 500 },
} as const;

export const DEFAULT_GALAXY_SIZE = 'medium' as const;

export const STAR_MIN_DISTANCE = 30;
export const WARP_LANE_MAX_DISTANCE = 120;
export const MAX_WARP_LANES_PER_STAR = 5;

// Star type weights (must sum roughly to 1)
export const STAR_TYPE_WEIGHTS = {
  RED_DWARF: 0.30,
  ORANGE: 0.25,
  YELLOW: 0.20,
  WHITE: 0.10,
  BLUE_GIANT: 0.05,
  RED_GIANT: 0.08,
  NEUTRON: 0.02,
} as const;

// Star visual properties
export const STAR_COLORS: Record<string, number> = {
  RED_DWARF: 0xff4422,
  ORANGE: 0xff8833,
  YELLOW: 0xffee44,
  WHITE: 0xeeeeff,
  BLUE_GIANT: 0x4488ff,
  RED_GIANT: 0xff3311,
  NEUTRON: 0xaaddff,
};

export const STAR_SCALES: Record<string, number> = {
  RED_DWARF: 0.6,
  ORANGE: 0.8,
  YELLOW: 1.0,
  WHITE: 1.1,
  BLUE_GIANT: 1.8,
  RED_GIANT: 1.6,
  NEUTRON: 0.4,
};

// Planet generation
export const MIN_PLANETS_PER_STAR = 1;
export const MAX_PLANETS_PER_STAR = 5;

// Colony
export const BASE_POPULATION_GROWTH = 0.02;
export const BASE_FOOD_PER_FARMER = 2;
export const BASE_PRODUCTION_PER_WORKER = 1;
export const BASE_RESEARCH_PER_SCIENTIST = 1;
export const MAX_POPULATION_BASE = 10;
export const MORALE_NEUTRAL = 50;

// Economy
export const BASE_COLONY_INCOME = 5;
export const SHIP_MAINTENANCE_MULTIPLIER = 0.5;
export const BUILDING_MAINTENANCE_MULTIPLIER = 1;

// Research
export const BASE_RESEARCH_COST = 100;
export const RESEARCH_COST_SCALING = 1.5;

// Ships
export const HULL_SIZES = {
  FIGHTER: { space: 10, cost: 20, hp: 5 },
  DESTROYER: { space: 25, cost: 60, hp: 15 },
  CRUISER: { space: 60, cost: 150, hp: 40 },
  BATTLESHIP: { space: 120, cost: 350, hp: 100 },
} as const;

// Fleet movement
export const BASE_FLEET_SPEED = 1; // warp lanes per turn

// Combat
export const COMBAT_MAX_ROUNDS = 50;
export const COMBAT_GRID_SIZE = 10;

// Diplomacy
export const REPUTATION_DECAY_PER_TURN = 1;
export const REPUTATION_MIN = -100;
export const REPUTATION_MAX = 100;

// Victory
export const SCORE_VICTORY_TURN = 500;
export const COUNCIL_VOTE_INTERVAL = 25;
export const COUNCIL_VOTE_THRESHOLD = 0.667;

// Camera
export const CAMERA_MIN_DISTANCE = 50;
export const CAMERA_MAX_DISTANCE = 800;
export const CAMERA_DEFAULT_DISTANCE = 400;

// Player colors
export const PLAYER_COLORS = [
  0x4488ff, // Blue
  0xff4444, // Red
  0x44ff44, // Green
  0xffaa00, // Orange
  0xff44ff, // Magenta
  0x44ffff, // Cyan
  0xffff44, // Yellow
  0xaa44ff, // Purple
];
