// RaceData.ts - Full race lore, names, descriptions, traits, and leader names for all playable races
// Created: Added comprehensive race identity system with 8 unique races, each with lore, traits, and leaders

import { Race, RaceTrait } from './Race';

export interface RaceLeader {
  name: string;
  title: string;
}

export interface RaceVisuals {
  primaryColor: string;
  secondaryColor: string;
  emblemIcon: string; // Unicode symbol for UI display
}

export interface FullRaceData {
  race: Race;
  leaders: RaceLeader[];
  lore: string;
  playstyleHint: string;
  homeworldName: string;
  visuals: RaceVisuals;
}

// ─── TRAIT DEFINITIONS ───────────────────────────────────────────────

const TRAIT_INDUSTRIOUS: RaceTrait = {
  id: 'industrious',
  name: 'Industrious',
  description: 'Centuries of engineering mastery grant superior production capabilities.',
  effects: { production_bonus: 0.15 },
};

const TRAIT_CREATIVE: RaceTrait = {
  id: 'creative',
  name: 'Creative',
  description: 'Innate curiosity and lateral thinking accelerate scientific breakthroughs.',
  effects: { research_bonus: 0.20 },
};

const TRAIT_CHARISMATIC: RaceTrait = {
  id: 'charismatic',
  name: 'Charismatic',
  description: 'Natural diplomats whose words carry weight across the stars.',
  effects: { diplomacy_bonus: 0.25 },
};

const TRAIT_RESILIENT: RaceTrait = {
  id: 'resilient',
  name: 'Resilient',
  description: 'Evolved to endure the harshest conditions, thriving where others perish.',
  effects: { habitability_bonus: 0.20 },
};

const TRAIT_AGGRESSIVE: RaceTrait = {
  id: 'aggressive',
  name: 'Aggressive',
  description: 'A warrior culture honed over millennia of conflict and conquest.',
  effects: { combat_bonus: 0.20 },
};

const TRAIT_FERTILE: RaceTrait = {
  id: 'fertile',
  name: 'Fertile',
  description: 'Rapid reproduction rates allow swift colonization of new worlds.',
  effects: { population_growth: 0.25 },
};

const TRAIT_MERCANTILE: RaceTrait = {
  id: 'mercantile',
  name: 'Mercantile',
  description: 'Trade flows through their veins — every exchange turns a profit.',
  effects: { credits_bonus: 0.20 },
};

const TRAIT_ADAPTIVE: RaceTrait = {
  id: 'adaptive',
  name: 'Adaptive',
  description: 'Versatile and quick to adjust, gaining moderate bonuses across all fields.',
  effects: { production_bonus: 0.05, research_bonus: 0.05, credits_bonus: 0.05, population_growth: 0.05 },
};

const TRAIT_HIVE_MIND: RaceTrait = {
  id: 'hive_mind',
  name: 'Hive Mind',
  description: 'A collective consciousness that coordinates billions as one organism.',
  effects: { production_bonus: 0.10, morale_bonus: 0.15 },
};

const TRAIT_ANCIENT_KNOWLEDGE: RaceTrait = {
  id: 'ancient_knowledge',
  name: 'Ancient Knowledge',
  description: 'Inheritors of a lost civilization\'s archives, granting early technological insight.',
  effects: { research_bonus: 0.10, starting_tech: 1 },
};

const TRAIT_WARBORN: RaceTrait = {
  id: 'warborn',
  name: 'Warborn',
  description: 'Born in the crucible of endless war, their ships are extensions of their will.',
  effects: { combat_bonus: 0.15, ship_cost_reduction: 0.10 },
};

const TRAIT_EXPANSIONIST: RaceTrait = {
  id: 'expansionist',
  name: 'Expansionist',
  description: 'An insatiable drive to spread across the stars, colonizing at remarkable speed.',
  effects: { colony_cost_reduction: 0.20, population_growth: 0.10 },
};

// ─── RACE DEFINITIONS ────────────────────────────────────────────────

export const RACE_DATA: Record<string, FullRaceData> = {
  humans: {
    race: {
      id: 'humans',
      name: 'Terran Coalition',
      description: 'The remnants of Earth\'s great nations, united under a fragile coalition after the Collapse. Humans are adaptable and resourceful, capable of excelling in any field — though masters of none. Their greatest strength is their tenacity: where other species see extinction, humans see opportunity.',
      homeworld: 'TERRAN',
      traits: [TRAIT_ADAPTIVE, TRAIT_CHARISMATIC],
      defaultPersonality: 'balanced',
      portraitIndex: 0,
    },
    leaders: [
      { name: 'Admiral Helena Voss', title: 'Supreme Commander' },
      { name: 'Director Marcus Chen', title: 'Coalition Director' },
      { name: 'Chancellor Amara Osei', title: 'High Chancellor' },
    ],
    lore: 'When the Galactic Accord shattered in 3847, humanity was scattered across a dozen colony worlds. The warp network\'s collapse severed contact between them for decades. From the ashes of isolation, the Terran Coalition emerged — a desperate alliance of survivors who refused to fade into the dark. Now, as warp lanes slowly reopen, they reach out once more into the void, driven by an ancient human instinct: to explore, to connect, to endure.',
    playstyleHint: 'Balanced — flexible strategy, good at diplomacy and adapting to any situation.',
    homeworldName: 'New Terra',
    visuals: {
      primaryColor: '#4488ff',
      secondaryColor: '#aaccff',
      emblemIcon: '⊕',
    },
  },

  vekthari: {
    race: {
      id: 'vekthari',
      name: 'Vek\'thari Dominion',
      description: 'A proud warrior species from the volcanic world of Ashkar. The Vek\'thari are towering reptilian beings whose culture revolves around honor, combat, and the eternal flame. They believe the Black Times are a crucible — only the strong deserve to survive.',
      homeworld: 'VOLCANIC',
      traits: [TRAIT_AGGRESSIVE, TRAIT_WARBORN],
      defaultPersonality: 'warmonger',
      portraitIndex: 1,
    },
    leaders: [
      { name: 'Warlord Krath\'zul', title: 'Supreme Warlord' },
      { name: 'Commander Vex\'nar', title: 'Fleetmaster' },
      { name: 'Battlequeen Syr\'akh', title: 'Battlequeen' },
    ],
    lore: 'The Vek\'thari evolved in the magma fields of Ashkar, where every day was a battle for survival against predators, volcanic eruptions, and rival clans. When they achieved spaceflight, they carried their warrior ethos to the stars. The Collapse barely slowed them — they had always been self-reliant. Now they see the weakened galaxy as ripe for conquest, a grand arena where the Vek\'thari will prove their supremacy through fire and blade.',
    playstyleHint: 'Military — powerful fleets, cheap ships, aggressive expansion through conquest.',
    homeworldName: 'Ashkar',
    visuals: {
      primaryColor: '#ff4444',
      secondaryColor: '#ff8866',
      emblemIcon: '⚔',
    },
  },

  solari: {
    race: {
      id: 'solari',
      name: 'Solari Collective',
      description: 'Luminous energy beings who evolved near a binary star system. The Solari exist as patterns of living light, inhabiting crystalline bodies they craft for interaction with the physical world. Their pursuit of knowledge is relentless and transcendent.',
      homeworld: 'BARREN',
      traits: [TRAIT_CREATIVE, TRAIT_ANCIENT_KNOWLEDGE],
      defaultPersonality: 'scientist',
      portraitIndex: 2,
    },
    leaders: [
      { name: 'Archon Lumis-7', title: 'Prime Archon' },
      { name: 'Savant Prisma-12', title: 'Chief Savant' },
      { name: 'Oracle Nexis-3', title: 'Grand Oracle' },
    ],
    lore: 'The Solari were among the first species to achieve interstellar travel, their energy forms naturally attuned to the frequencies of warp space. They built the original warp network\'s theoretical framework, and its collapse was a wound to their collective psyche. They believe the Black Times were caused by a fundamental flaw in reality itself — one they are determined to understand and repair. Their crystalline archives hold fragments of knowledge from before the Collapse, making them invaluable allies... or dangerous rivals.',
    playstyleHint: 'Science — fastest research, starts with bonus tech, weak in early military.',
    homeworldName: 'Prismatica',
    visuals: {
      primaryColor: '#44ffff',
      secondaryColor: '#88ffff',
      emblemIcon: '◈',
    },
  },

  draath: {
    race: {
      id: 'draath',
      name: 'Dra\'ath Imperium',
      description: 'An ancient and calculating species of cold-blooded strategists. The Dra\'ath resemble tall, gaunt beings with obsidian skin and silver eyes. They view diplomacy as the highest art form and consider warfare a failure of intellect.',
      homeworld: 'TUNDRA',
      traits: [TRAIT_CHARISMATIC, TRAIT_MERCANTILE],
      defaultPersonality: 'diplomat',
      portraitIndex: 3,
    },
    leaders: [
      { name: 'Emissary Thaal\'vex', title: 'Grand Emissary' },
      { name: 'Arbiter Kael\'dris', title: 'Supreme Arbiter' },
      { name: 'Envoy Mira\'shen', title: 'First Envoy' },
    ],
    lore: 'The Dra\'ath Imperium was once the diplomatic backbone of the Galactic Accord, their emissaries mediating disputes between a hundred species. When the Accord fell, they lost their purpose — and their power. Now they work tirelessly to rebuild the web of treaties and trade agreements that once held civilization together. They know that in the Black Times, a well-placed word is worth more than a thousand warships. But beneath their diplomatic veneer lies a ruthless pragmatism: the Dra\'ath will do whatever it takes to restore order — their order.',
    playstyleHint: 'Diplomacy & Trade — strong economy, excellent relations, wins through alliances and wealth.',
    homeworldName: 'Thaal Prime',
    visuals: {
      primaryColor: '#ffaa00',
      secondaryColor: '#ffdd66',
      emblemIcon: '⚖',
    },
  },

  krellax: {
    race: {
      id: 'krellax',
      name: 'Krellax Swarm',
      description: 'A hive-minded insectoid species that operates as a single vast organism. Individual Krellax drones have limited intelligence, but the Swarm Mind that connects them is one of the most brilliant entities in the galaxy. They expand not out of ambition, but biological imperative.',
      homeworld: 'JUNGLE',
      traits: [TRAIT_HIVE_MIND, TRAIT_FERTILE],
      defaultPersonality: 'expansionist',
      portraitIndex: 4,
    },
    leaders: [
      { name: 'The Overmind', title: 'Swarm Overmind' },
      { name: 'Brood-Queen Xith', title: 'Primary Brood-Queen' },
      { name: 'Synapse-Lord Vrex', title: 'Synapse-Lord' },
    ],
    lore: 'The Krellax do not understand individuality. To them, the galaxy is a garden to be cultivated, and every world a potential nest. The Collapse disrupted the psychic frequencies that connected their far-flung hives, fragmenting the Swarm Mind into isolated clusters. Now, as connections slowly restore, the Overmind awakens with a singular drive: reunify the Swarm. Other species are not enemies — they are simply... not yet part of the whole. The Krellax expand relentlessly, their populations exploding across every viable world, consuming resources with terrifying efficiency.',
    playstyleHint: 'Expansion — fastest population growth, high morale, overwhelms through numbers.',
    homeworldName: 'Nexus Hive',
    visuals: {
      primaryColor: '#44ff44',
      secondaryColor: '#88ff88',
      emblemIcon: '⬡',
    },
  },

  nethari: {
    race: {
      id: 'nethari',
      name: 'Nethari Syndicate',
      description: 'A secretive species of shapeshifters who built their civilization on commerce, espionage, and information brokering. The Nethari can alter their appearance at will, making them the galaxy\'s most effective traders — and spies.',
      homeworld: 'OCEAN',
      traits: [TRAIT_MERCANTILE, TRAIT_ADAPTIVE],
      defaultPersonality: 'balanced',
      portraitIndex: 5,
    },
    leaders: [
      { name: 'Broker Zyn\'tael', title: 'Grand Broker' },
      { name: 'Shadow Kael\'ith', title: 'Shadowmaster' },
      { name: 'Merchant-Prince Vel\'os', title: 'Merchant-Prince' },
    ],
    lore: 'Before the Collapse, the Nethari controlled the galaxy\'s largest trade network, their shapeshifting abilities allowing them to operate seamlessly among any species. When the warp lanes fell, so did their empire of commerce. But the Nethari are nothing if not resourceful. They\'ve spent the Black Times building shadow networks, smuggling routes, and intelligence webs that span the fractured galaxy. Now, as civilization stirs again, the Nethari are positioned to profit from every transaction, every treaty, and every betrayal. Information is currency, and the Nethari are the richest species alive.',
    playstyleHint: 'Economy — highest credit generation, versatile, profits from trade agreements.',
    homeworldName: 'Vel\'thara',
    visuals: {
      primaryColor: '#ff44ff',
      secondaryColor: '#ff88ff',
      emblemIcon: '◉',
    },
  },

  ashenn: {
    race: {
      id: 'ashenn',
      name: 'Ashenn Remnant',
      description: 'The survivors of a once-great civilization that predates the Galactic Accord by millennia. The Ashenn are tall, ethereal beings with pale skin and luminous violet eyes. They carry the weight of a forgotten golden age and seek to reclaim their lost glory.',
      homeworld: 'ARID',
      traits: [TRAIT_ANCIENT_KNOWLEDGE, TRAIT_RESILIENT],
      defaultPersonality: 'scientist',
      portraitIndex: 6,
    },
    leaders: [
      { name: 'Elder Vaelith', title: 'Last Elder' },
      { name: 'Keeper Sorath', title: 'Lorekeeper' },
      { name: 'Warden Ithyra', title: 'Star Warden' },
    ],
    lore: 'Ten thousand years ago, the Ashenn ruled a vast stellar empire. Then came the First Darkness — a catastrophe so complete that it erased their civilization from history. Only fragments survived: scattered colonies, corrupted archives, and a species reduced to a shadow of its former self. The Ashenn have spent millennia slowly rebuilding, their ancient knowledge giving them technological insights that other species can barely comprehend. They see the Black Times as history repeating itself, and they are determined that this time, they will not fall. The Ashenn remember what others have forgotten: the galaxy has ended before.',
    playstyleHint: 'Tech & Survival — starts with advanced knowledge, resilient colonies, strong late-game.',
    homeworldName: 'Aethon',
    visuals: {
      primaryColor: '#aa44ff',
      secondaryColor: '#cc88ff',
      emblemIcon: '✧',
    },
  },

  gorathi: {
    race: {
      id: 'gorathi',
      name: 'Gorathi Foundry',
      description: 'A stocky, silicon-based species that evolved deep within asteroid fields. The Gorathi are master engineers and builders, their bodies naturally resistant to vacuum and radiation. They don\'t colonize worlds — they build them.',
      homeworld: 'BARREN',
      traits: [TRAIT_INDUSTRIOUS, TRAIT_RESILIENT],
      defaultPersonality: 'expansionist',
      portraitIndex: 7,
    },
    leaders: [
      { name: 'Forgemaster Grond', title: 'Supreme Forgemaster' },
      { name: 'Architect Bolvar', title: 'Grand Architect' },
      { name: 'Engineer Thessa', title: 'Chief Engineer' },
    ],
    lore: 'The Gorathi never needed habitable worlds. Born in the cold void between asteroids, they thrive in environments that would kill any carbon-based species. Their civilization is built on industry — massive orbital foundries, planet-sized factories, and engineering projects that reshape entire star systems. The Collapse meant little to a species that builds its own infrastructure from scratch. While others scrambled to survive, the Gorathi simply kept building. Now they extend their foundries across the galaxy, turning barren rocks into productive worlds with mechanical precision. To the Gorathi, the universe is raw material waiting to be shaped.',
    playstyleHint: 'Industry — highest production, can colonize harsh worlds, builds faster than anyone.',
    homeworldName: 'Ironcore',
    visuals: {
      primaryColor: '#ff8844',
      secondaryColor: '#ffaa66',
      emblemIcon: '⚙',
    },
  },
};

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────

export function getRaceData(raceId: string): FullRaceData | null {
  return RACE_DATA[raceId] || null;
}

export function getAllRaceIds(): string[] {
  return Object.keys(RACE_DATA);
}

export function getAllRaces(): FullRaceData[] {
  return Object.values(RACE_DATA);
}

export function getRandomLeader(raceId: string, rng?: { nextInt: (min: number, max: number) => number }): RaceLeader {
  const data = RACE_DATA[raceId];
  if (!data || data.leaders.length === 0) {
    return { name: 'Unknown Leader', title: 'Commander' };
  }
  const index = rng ? rng.nextInt(0, data.leaders.length - 1) : 0;
  return data.leaders[index];
}

export function getRaceName(raceId: string): string {
  const data = RACE_DATA[raceId];
  return data ? data.race.name : 'Unknown Race';
}

export function getRaceEmblem(raceId: string): string {
  const data = RACE_DATA[raceId];
  return data ? data.visuals.emblemIcon : '?';
}
