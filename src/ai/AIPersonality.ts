// AIPersonality.ts - AI behavior profiles mapped to race identities
// Updated: Replaced placeholder race_1-race_7 IDs with actual race IDs (vekthari, solari, draath, krellax, nethari, ashenn, gorathi)

export interface AIPersonality {
  name: string;
  aggressiveness: number;    // 0-1
  expansionism: number;      // 0-1
  technophilia: number;      // 0-1
  diplomacyOpenness: number; // 0-1
  economyFocus: number;      // 0-1
}

const PERSONALITIES: Record<string, AIPersonality> = {
  warmonger: {
    name: 'Warmonger',
    aggressiveness: 0.9,
    expansionism: 0.7,
    technophilia: 0.3,
    diplomacyOpenness: 0.1,
    economyFocus: 0.4,
  },
  diplomat: {
    name: 'Diplomat',
    aggressiveness: 0.2,
    expansionism: 0.5,
    technophilia: 0.5,
    diplomacyOpenness: 0.9,
    economyFocus: 0.6,
  },
  scientist: {
    name: 'Scientist',
    aggressiveness: 0.2,
    expansionism: 0.4,
    technophilia: 0.9,
    diplomacyOpenness: 0.6,
    economyFocus: 0.5,
  },
  balanced: {
    name: 'Balanced',
    aggressiveness: 0.5,
    expansionism: 0.5,
    technophilia: 0.5,
    diplomacyOpenness: 0.5,
    economyFocus: 0.5,
  },
  expansionist: {
    name: 'Expansionist',
    aggressiveness: 0.5,
    expansionism: 0.9,
    technophilia: 0.4,
    diplomacyOpenness: 0.3,
    economyFocus: 0.7,
  },
};

const RACE_PERSONALITY: Record<string, string> = {
  humans: 'balanced',
  vekthari: 'warmonger',
  solari: 'scientist',
  draath: 'diplomat',
  krellax: 'expansionist',
  nethari: 'balanced',
  ashenn: 'scientist',
  gorathi: 'expansionist',
};

export function getPersonality(raceId: string): AIPersonality {
  const key = RACE_PERSONALITY[raceId] || 'balanced';
  return PERSONALITIES[key] || PERSONALITIES.balanced;
}

export function getAllPersonalities(): Record<string, AIPersonality> {
  return PERSONALITIES;
}
