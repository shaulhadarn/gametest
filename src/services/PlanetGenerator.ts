import { Random } from '@/core/Random';
import { generateId } from '@/core/IdGenerator';
import { Star } from '@/models/Star';
import { Planet } from '@/models/Planet';
import { StarType, PlanetType, PlanetSize, MineralLevel, SpecialResource } from '@/models/types';
import { MIN_PLANETS_PER_STAR, MAX_PLANETS_PER_STAR } from '@/core/Constants';

const PLANET_TYPE_WEIGHTS: Record<StarType, { type: PlanetType; weight: number }[]> = {
  [StarType.YELLOW]: [
    { type: PlanetType.TERRAN, weight: 25 },
    { type: PlanetType.OCEAN, weight: 15 },
    { type: PlanetType.ARID, weight: 10 },
    { type: PlanetType.TUNDRA, weight: 10 },
    { type: PlanetType.DESERT, weight: 10 },
    { type: PlanetType.JUNGLE, weight: 10 },
    { type: PlanetType.GAS_GIANT, weight: 10 },
    { type: PlanetType.BARREN, weight: 5 },
    { type: PlanetType.VOLCANIC, weight: 3 },
    { type: PlanetType.TOXIC, weight: 2 },
  ],
  [StarType.ORANGE]: [
    { type: PlanetType.TERRAN, weight: 15 },
    { type: PlanetType.OCEAN, weight: 10 },
    { type: PlanetType.ARID, weight: 15 },
    { type: PlanetType.TUNDRA, weight: 15 },
    { type: PlanetType.DESERT, weight: 10 },
    { type: PlanetType.GAS_GIANT, weight: 15 },
    { type: PlanetType.BARREN, weight: 10 },
    { type: PlanetType.JUNGLE, weight: 5 },
    { type: PlanetType.VOLCANIC, weight: 3 },
    { type: PlanetType.TOXIC, weight: 2 },
  ],
  [StarType.RED_DWARF]: [
    { type: PlanetType.TUNDRA, weight: 20 },
    { type: PlanetType.BARREN, weight: 20 },
    { type: PlanetType.ARID, weight: 15 },
    { type: PlanetType.TERRAN, weight: 5 },
    { type: PlanetType.DESERT, weight: 10 },
    { type: PlanetType.TOXIC, weight: 10 },
    { type: PlanetType.VOLCANIC, weight: 5 },
    { type: PlanetType.GAS_GIANT, weight: 10 },
    { type: PlanetType.OCEAN, weight: 3 },
    { type: PlanetType.JUNGLE, weight: 2 },
  ],
  [StarType.WHITE]: [
    { type: PlanetType.TERRAN, weight: 15 },
    { type: PlanetType.OCEAN, weight: 15 },
    { type: PlanetType.DESERT, weight: 15 },
    { type: PlanetType.BARREN, weight: 10 },
    { type: PlanetType.GAS_GIANT, weight: 15 },
    { type: PlanetType.ARID, weight: 10 },
    { type: PlanetType.JUNGLE, weight: 8 },
    { type: PlanetType.TUNDRA, weight: 5 },
    { type: PlanetType.VOLCANIC, weight: 5 },
    { type: PlanetType.TOXIC, weight: 2 },
  ],
  [StarType.BLUE_GIANT]: [
    { type: PlanetType.GAS_GIANT, weight: 30 },
    { type: PlanetType.BARREN, weight: 20 },
    { type: PlanetType.VOLCANIC, weight: 15 },
    { type: PlanetType.TOXIC, weight: 15 },
    { type: PlanetType.DESERT, weight: 10 },
    { type: PlanetType.TERRAN, weight: 2 },
    { type: PlanetType.OCEAN, weight: 2 },
    { type: PlanetType.ARID, weight: 2 },
    { type: PlanetType.TUNDRA, weight: 2 },
    { type: PlanetType.JUNGLE, weight: 2 },
  ],
  [StarType.RED_GIANT]: [
    { type: PlanetType.GAS_GIANT, weight: 25 },
    { type: PlanetType.BARREN, weight: 20 },
    { type: PlanetType.VOLCANIC, weight: 15 },
    { type: PlanetType.DESERT, weight: 15 },
    { type: PlanetType.TOXIC, weight: 10 },
    { type: PlanetType.ARID, weight: 5 },
    { type: PlanetType.TUNDRA, weight: 5 },
    { type: PlanetType.TERRAN, weight: 2 },
    { type: PlanetType.OCEAN, weight: 2 },
    { type: PlanetType.JUNGLE, weight: 1 },
  ],
  [StarType.NEUTRON]: [
    { type: PlanetType.BARREN, weight: 35 },
    { type: PlanetType.TOXIC, weight: 25 },
    { type: PlanetType.VOLCANIC, weight: 20 },
    { type: PlanetType.DESERT, weight: 10 },
    { type: PlanetType.TUNDRA, weight: 5 },
    { type: PlanetType.GAS_GIANT, weight: 3 },
    { type: PlanetType.TERRAN, weight: 1 },
    { type: PlanetType.OCEAN, weight: 0 },
    { type: PlanetType.ARID, weight: 1 },
    { type: PlanetType.JUNGLE, weight: 0 },
  ],
};

const HABITABILITY_BASE: Record<PlanetType, number> = {
  [PlanetType.TERRAN]: 80,
  [PlanetType.OCEAN]: 60,
  [PlanetType.JUNGLE]: 55,
  [PlanetType.ARID]: 40,
  [PlanetType.TUNDRA]: 35,
  [PlanetType.DESERT]: 30,
  [PlanetType.VOLCANIC]: 15,
  [PlanetType.BARREN]: 10,
  [PlanetType.TOXIC]: 5,
  [PlanetType.GAS_GIANT]: 0,
};

export class PlanetGenerator {
  private rng: Random;

  constructor(rng: Random) {
    this.rng = rng;
  }

  generate(star: Star): Planet[] {
    const count = this.rng.nextInt(MIN_PLANETS_PER_STAR, MAX_PLANETS_PER_STAR);
    const planets: Planet[] = [];
    const typeWeights = PLANET_TYPE_WEIGHTS[star.type];
    const weights = typeWeights.map(t => t.weight);
    const types = typeWeights.map(t => t.type);

    for (let i = 0; i < count; i++) {
      const typeIdx = this.rng.weightedPick(weights);
      const type = types[typeIdx];
      const size = this.rng.nextInt(1, 5) as PlanetSize;
      const minerals = this.rng.nextInt(1, 5) as MineralLevel;

      let habitability = HABITABILITY_BASE[type];
      habitability += this.rng.nextInt(-15, 15);
      habitability = Math.max(0, Math.min(100, habitability));

      let special = SpecialResource.NONE;
      if (this.rng.chance(0.1)) {
        const specials = [
          SpecialResource.GOLD_DEPOSITS,
          SpecialResource.GEM_DEPOSITS,
          SpecialResource.ANCIENT_ARTIFACTS,
          SpecialResource.NATIVE_LIFE,
        ];
        special = this.rng.pick(specials);
      }

      // Generate moon count based on planet type and size
      let moonCount: number;
      if (type === PlanetType.GAS_GIANT) {
        moonCount = this.rng.nextInt(1, 6);
      } else if (size >= 4) {
        moonCount = this.rng.nextInt(0, 3);
      } else if (size === 3) {
        moonCount = this.rng.nextInt(0, 2);
      } else {
        moonCount = this.rng.nextInt(0, 1);
      }

      const planet: Planet = {
        id: generateId('planet'),
        starId: star.id,
        name: `${star.name} ${this.romanNumeral(i + 1)}`,
        type,
        size,
        minerals,
        habitability,
        specialResource: special,
        colonyId: null,
        orbitIndex: i,
        moonCount,
      };
      planets.push(planet);
    }

    return planets;
  }

  private romanNumeral(n: number): string {
    const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
    return numerals[n - 1] || n.toString();
  }
}
