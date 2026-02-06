import { GameState } from '@/core/GameState';
import { Colony, BuildQueueItem } from '@/models/Colony';
import { Planet } from '@/models/Planet';
import { generateId } from '@/core/IdGenerator';
import {
  BASE_FOOD_PER_FARMER,
  BASE_PRODUCTION_PER_WORKER,
  BASE_RESEARCH_PER_SCIENTIST,
  BASE_POPULATION_GROWTH,
  MAX_POPULATION_BASE,
  MORALE_NEUTRAL,
  BASE_COLONY_INCOME,
} from '@/core/Constants';

export class ColonyService {
  foundColony(state: GameState, planetId: string, playerId: string, name: string): Colony {
    const planet = state.planets[planetId];
    const maxPop = Math.floor(MAX_POPULATION_BASE * (planet.size / 3) * (planet.habitability / 100 + 0.2));

    const colony: Colony = {
      id: generateId('colony'),
      planetId,
      playerId,
      name,
      population: 2,
      maxPopulation: Math.max(maxPop, 3),
      farmers: 1,
      workers: 1,
      scientists: 0,
      buildings: [],
      buildQueue: [],
      morale: MORALE_NEUTRAL,
      foodOutput: 0,
      productionOutput: 0,
      researchOutput: 0,
      creditsOutput: 0,
    };

    state.colonies[colony.id] = colony;
    planet.colonyId = colony.id;

    // Update player
    const player = state.players[playerId];
    if (player) {
      player.colonyIds.push(colony.id);
    }

    // Update star ownership
    const star = state.stars[planet.starId];
    if (star && !star.ownerId) {
      star.ownerId = playerId;
    }

    this.calculateOutputs(state, colony);
    return colony;
  }

  calculateOutputs(state: GameState, colony: Colony): void {
    const planet = state.planets[colony.planetId];
    if (!planet) return;

    const habitMod = planet.habitability / 100;
    const mineralMod = planet.minerals / 3; // 1-5 normalized around 1

    colony.foodOutput = colony.farmers * BASE_FOOD_PER_FARMER * (0.5 + habitMod);
    colony.productionOutput = colony.workers * BASE_PRODUCTION_PER_WORKER * mineralMod;
    colony.researchOutput = colony.scientists * BASE_RESEARCH_PER_SCIENTIST;
    colony.creditsOutput = BASE_COLONY_INCOME + colony.population * 0.5;

    // Morale modifier
    const moraleMod = colony.morale / MORALE_NEUTRAL;
    colony.foodOutput *= moraleMod;
    colony.productionOutput *= moraleMod;
    colony.researchOutput *= moraleMod;

    // Building bonuses
    for (const buildingId of colony.buildings) {
      this.applyBuildingBonus(colony, buildingId);
    }

    // Special resource bonuses
    if (planet.specialResource === 'GOLD_DEPOSITS') {
      colony.creditsOutput *= 1.5;
    } else if (planet.specialResource === 'GEM_DEPOSITS') {
      colony.creditsOutput *= 2;
    } else if (planet.specialResource === 'ANCIENT_ARTIFACTS') {
      colony.researchOutput += 3;
    }
  }

  private applyBuildingBonus(colony: Colony, buildingId: string): void {
    // Building effect lookup
    const effects: Record<string, () => void> = {
      'factory': () => { colony.productionOutput += 5; },
      'farm': () => { colony.foodOutput += 3; },
      'lab': () => { colony.researchOutput += 3; },
      'market': () => { colony.creditsOutput += 5; },
      'automated_factory': () => { colony.productionOutput *= 1.3; },
      'hydroponic_farm': () => { colony.foodOutput *= 1.25; },
      'research_lab': () => { colony.researchOutput *= 1.3; },
      'trade_hub': () => { colony.creditsOutput *= 1.5; },
      'planetary_shield': () => { /* defense */ },
      'starbase': () => { /* defense + fleet support */ },
      'terraformer': () => { /* increases habitability over time */ },
      'cloning_center': () => { /* population growth bonus */ },
    };

    effects[buildingId]?.();
  }

  processColony(state: GameState, colony: Colony): string | null {
    this.calculateOutputs(state, colony);

    // Population growth
    const foodSurplus = colony.foodOutput - colony.population;
    if (foodSurplus > 0 && colony.population < colony.maxPopulation) {
      let growthRate = BASE_POPULATION_GROWTH * (1 + foodSurplus / 10);
      if (colony.buildings.includes('cloning_center')) {
        growthRate *= 1.5;
      }
      colony.population = Math.min(
        colony.population + growthRate,
        colony.maxPopulation
      );
    } else if (foodSurplus < -1) {
      // Starvation
      colony.morale = Math.max(0, colony.morale - 5);
      if (foodSurplus < -3) {
        colony.population = Math.max(1, colony.population - 0.1);
      }
    }

    // Morale adjustment
    if (colony.morale < MORALE_NEUTRAL) {
      colony.morale = Math.min(colony.morale + 1, MORALE_NEUTRAL);
    }

    // Process build queue
    let completedName: string | null = null;
    if (colony.buildQueue.length > 0) {
      const item = colony.buildQueue[0];
      item.progress += colony.productionOutput;
      if (item.progress >= item.cost) {
        this.completeBuildItem(state, colony, item);
        completedName = item.name;
        colony.buildQueue.shift();
      }
    }

    return completedName;
  }

  private completeBuildItem(state: GameState, colony: Colony, item: BuildQueueItem): void {
    if (item.type === 'building') {
      colony.buildings.push(item.referenceId);
    } else if (item.type === 'ship') {
      // Ship construction handled by ShipBuildService
      // We just flag that it's ready
    }
  }

  setWorkers(colony: Colony, farmers: number, workers: number, scientists: number): void {
    const total = Math.floor(colony.population);
    const clamped = this.clampWorkers(farmers, workers, scientists, total);
    colony.farmers = clamped.farmers;
    colony.workers = clamped.workers;
    colony.scientists = clamped.scientists;
  }

  private clampWorkers(f: number, w: number, s: number, total: number): { farmers: number; workers: number; scientists: number } {
    f = Math.max(0, Math.min(f, total));
    w = Math.max(0, Math.min(w, total - f));
    s = total - f - w;
    return { farmers: f, workers: w, scientists: Math.max(0, s) };
  }

  addToBuildQueue(colony: Colony, name: string, type: 'building' | 'ship', referenceId: string, cost: number): void {
    colony.buildQueue.push({
      id: generateId('build'),
      name,
      type,
      referenceId,
      cost,
      progress: 0,
    });
  }

  removeFromBuildQueue(colony: Colony, index: number): void {
    if (index >= 0 && index < colony.buildQueue.length) {
      colony.buildQueue.splice(index, 1);
    }
  }
}
