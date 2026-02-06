export enum StarType {
  RED_DWARF = 'RED_DWARF',
  ORANGE = 'ORANGE',
  YELLOW = 'YELLOW',
  WHITE = 'WHITE',
  BLUE_GIANT = 'BLUE_GIANT',
  RED_GIANT = 'RED_GIANT',
  NEUTRON = 'NEUTRON',
}

export enum PlanetType {
  TERRAN = 'TERRAN',
  OCEAN = 'OCEAN',
  ARID = 'ARID',
  TUNDRA = 'TUNDRA',
  DESERT = 'DESERT',
  JUNGLE = 'JUNGLE',
  VOLCANIC = 'VOLCANIC',
  BARREN = 'BARREN',
  TOXIC = 'TOXIC',
  GAS_GIANT = 'GAS_GIANT',
}

export enum PlanetSize {
  TINY = 1,
  SMALL = 2,
  MEDIUM = 3,
  LARGE = 4,
  HUGE = 5,
}

export enum MineralLevel {
  ULTRA_POOR = 1,
  POOR = 2,
  AVERAGE = 3,
  RICH = 4,
  ULTRA_RICH = 5,
}

export enum SpecialResource {
  NONE = 'NONE',
  GOLD_DEPOSITS = 'GOLD_DEPOSITS',
  GEM_DEPOSITS = 'GEM_DEPOSITS',
  ANCIENT_ARTIFACTS = 'ANCIENT_ARTIFACTS',
  NATIVE_LIFE = 'NATIVE_LIFE',
  SPLINTER_COLONY = 'SPLINTER_COLONY',
}

export enum TechCategory {
  CONSTRUCTION = 'CONSTRUCTION',
  FORCE_FIELDS = 'FORCE_FIELDS',
  PLANETOLOGY = 'PLANETOLOGY',
  PROPULSION = 'PROPULSION',
  COMPUTERS = 'COMPUTERS',
  WEAPONS = 'WEAPONS',
}

export enum HullSize {
  FIGHTER = 'FIGHTER',
  DESTROYER = 'DESTROYER',
  CRUISER = 'CRUISER',
  BATTLESHIP = 'BATTLESHIP',
}

export enum DiplomacyStatus {
  UNKNOWN = 'UNKNOWN',
  NEUTRAL = 'NEUTRAL',
  NON_AGGRESSION = 'NON_AGGRESSION',
  TRADE = 'TRADE',
  ALLIANCE = 'ALLIANCE',
  WAR = 'WAR',
}

export enum VictoryType {
  CONQUEST = 'CONQUEST',
  DIPLOMATIC = 'DIPLOMATIC',
  TECHNOLOGICAL = 'TECHNOLOGICAL',
  SCORE = 'SCORE',
}

export enum GalaxyShape {
  SPIRAL = 'spiral',
  ELLIPTICAL = 'elliptical',
  RING = 'ring',
}

export enum ViewMode {
  SPLASH = 'splash',
  MAIN_MENU = 'mainMenu',
  NEW_GAME = 'newGame',
  LORE_INTRO = 'loreIntro',
  GALAXY = 'galaxy',
  SYSTEM = 'system',
  COLONY = 'colony',
  RESEARCH = 'research',
  SHIP_DESIGN = 'shipDesign',
  FLEET = 'fleet',
  DIPLOMACY = 'diplomacy',
  COMBAT = 'combat',
  VICTORY = 'victory',
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
