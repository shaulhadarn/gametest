import { GameState } from '@/core/GameState';
import { ShipDesign, ShipComponent } from '@/models/Ship';
import { HullSize } from '@/models/types';
import { HULL_SIZES } from '@/core/Constants';
import { generateId } from '@/core/IdGenerator';

const DEFAULT_COMPONENTS: ShipComponent[] = [
  // Weapons
  { id: 'comp_weapon_laser', name: 'Laser', type: 'weapon', space: 1, cost: 5, techLevel: 1, stats: { damage: 2, accuracy: 70 } },
  { id: 'comp_weapon_gatling', name: 'Gatling Laser', type: 'weapon', space: 2, cost: 10, techLevel: 2, stats: { damage: 4, accuracy: 65 } },
  { id: 'comp_weapon_fusion', name: 'Fusion Beam', type: 'weapon', space: 3, cost: 20, techLevel: 3, stats: { damage: 8, accuracy: 75 } },
  { id: 'comp_weapon_plasma', name: 'Plasma Cannon', type: 'weapon', space: 5, cost: 35, techLevel: 4, stats: { damage: 15, accuracy: 70 } },
  { id: 'comp_weapon_stellar', name: 'Stellar Converter', type: 'weapon', space: 10, cost: 80, techLevel: 5, stats: { damage: 30, accuracy: 80 } },

  // Shields
  { id: 'comp_shield_1', name: 'Deflector I', type: 'shield', space: 1, cost: 5, techLevel: 1, stats: { shieldHP: 3 } },
  { id: 'comp_shield_2', name: 'Shield II', type: 'shield', space: 2, cost: 10, techLevel: 2, stats: { shieldHP: 8 } },
  { id: 'comp_shield_5', name: 'Shield V', type: 'shield', space: 4, cost: 25, techLevel: 4, stats: { shieldHP: 20 } },
  { id: 'comp_shield_max', name: 'Quantum Barrier', type: 'shield', space: 6, cost: 50, techLevel: 5, stats: { shieldHP: 40 } },

  // Armor
  { id: 'comp_armor_titanium', name: 'Titanium Armor', type: 'armor', space: 1, cost: 3, techLevel: 0, stats: { armorHP: 3 } },
  { id: 'comp_armor_duralloy', name: 'Duralloy Armor', type: 'armor', space: 2, cost: 8, techLevel: 2, stats: { armorHP: 8 } },
  { id: 'comp_armor_neutronium', name: 'Neutronium Armor', type: 'armor', space: 4, cost: 20, techLevel: 4, stats: { armorHP: 20 } },

  // Engines
  { id: 'comp_engine_1', name: 'Nuclear Drive', type: 'engine', space: 2, cost: 5, techLevel: 1, stats: { speed: 1, initiative: 0 } },
  { id: 'comp_engine_2', name: 'Fusion Drive', type: 'engine', space: 2, cost: 10, techLevel: 2, stats: { speed: 2, initiative: 1 } },
  { id: 'comp_engine_3', name: 'Ion Drive', type: 'engine', space: 3, cost: 20, techLevel: 3, stats: { speed: 3, initiative: 2 } },
  { id: 'comp_engine_4', name: 'Antimatter Drive', type: 'engine', space: 3, cost: 35, techLevel: 4, stats: { speed: 4, initiative: 3 } },
  { id: 'comp_engine_max', name: 'Hyperspace Drive', type: 'engine', space: 4, cost: 60, techLevel: 5, stats: { speed: 6, initiative: 5 } },

  // Computers
  { id: 'comp_computer_1', name: 'Mark I Computer', type: 'computer', space: 1, cost: 5, techLevel: 1, stats: { accuracy_bonus: 10 } },
  { id: 'comp_computer_2', name: 'Mark II Computer', type: 'computer', space: 1, cost: 10, techLevel: 2, stats: { accuracy_bonus: 20 } },
  { id: 'comp_computer_3', name: 'Mark III Computer', type: 'computer', space: 1, cost: 20, techLevel: 3, stats: { accuracy_bonus: 30 } },
  { id: 'comp_computer_4', name: 'Mark IV Computer', type: 'computer', space: 2, cost: 35, techLevel: 4, stats: { accuracy_bonus: 40 } },
  { id: 'comp_computer_max', name: 'Quantum Computer', type: 'computer', space: 2, cost: 60, techLevel: 5, stats: { accuracy_bonus: 60 } },
];

export class ShipDesignService {
  private components: Map<string, ShipComponent> = new Map();

  constructor() {
    for (const comp of DEFAULT_COMPONENTS) {
      this.components.set(comp.id, comp);
    }
  }

  getComponent(id: string): ShipComponent | undefined {
    return this.components.get(id);
  }

  getAvailableComponents(state: GameState, playerId: string, type?: string): ShipComponent[] {
    const player = state.players[playerId];
    if (!player) return [];

    return Array.from(this.components.values()).filter(comp => {
      if (type && comp.type !== type) return false;
      // Check if player has the tech for this component
      if (comp.techLevel === 0) return true; // Basic tech always available
      // Check if any known tech unlocks this component
      for (const techId of player.knownTechIds) {
        const tech = state.technologies[techId];
        if (tech && tech.unlocks.includes(comp.id)) return true;
      }
      return false;
    });
  }

  createDesign(
    playerId: string,
    name: string,
    hullSize: HullSize,
    weaponIds: string[],
    shieldId: string | null,
    armorId: string | null,
    engineId: string | null,
    computerId: string | null,
    specialIds: string[] = [],
  ): ShipDesign | null {
    const hull = HULL_SIZES[hullSize];
    let usedSpace = 0;
    let totalCost = hull.cost;
    let attack = 0;
    let defense = 0;
    let speed = 1;
    let initiative = 0;

    // Weapons
    for (const wid of weaponIds) {
      const comp = this.components.get(wid);
      if (!comp) return null;
      usedSpace += comp.space;
      totalCost += comp.cost;
      attack += comp.stats.damage || 0;
    }

    // Shield
    if (shieldId) {
      const comp = this.components.get(shieldId);
      if (!comp) return null;
      usedSpace += comp.space;
      totalCost += comp.cost;
      defense += comp.stats.shieldHP || 0;
    }

    // Armor
    if (armorId) {
      const comp = this.components.get(armorId);
      if (!comp) return null;
      usedSpace += comp.space;
      totalCost += comp.cost;
      defense += comp.stats.armorHP || 0;
    }

    // Engine
    if (engineId) {
      const comp = this.components.get(engineId);
      if (!comp) return null;
      usedSpace += comp.space;
      totalCost += comp.cost;
      speed = comp.stats.speed || 1;
      initiative = comp.stats.initiative || 0;
    }

    // Computer
    if (computerId) {
      const comp = this.components.get(computerId);
      if (!comp) return null;
      usedSpace += comp.space;
      totalCost += comp.cost;
    }

    if (usedSpace > hull.space) return null; // Over capacity

    const design: ShipDesign = {
      id: generateId('design'),
      playerId,
      name,
      hullSize,
      weaponIds,
      shieldId,
      armorId,
      engineId,
      computerId,
      specialIds,
      totalSpace: hull.space,
      usedSpace,
      cost: totalCost,
      attack,
      defense,
      hp: hull.hp,
      speed,
      initiative,
    };

    return design;
  }

  createDefaultDesigns(state: GameState, playerId: string): void {
    // Scout
    const scout = this.createDesign(playerId, 'Scout', HullSize.FIGHTER,
      ['comp_weapon_laser'], null, null, 'comp_engine_1', null);
    if (scout) {
      state.shipDesigns[scout.id] = scout;
    }

    // Fighter
    const fighter = this.createDesign(playerId, 'Fighter', HullSize.FIGHTER,
      ['comp_weapon_laser', 'comp_weapon_laser'], null, 'comp_armor_titanium', 'comp_engine_1', null);
    if (fighter) {
      state.shipDesigns[fighter.id] = fighter;
    }

    // Colony Ship (special - no weapons needed)
    const colonyShip = this.createDesign(playerId, 'Colony Ship', HullSize.DESTROYER,
      [], null, null, 'comp_engine_1', null);
    if (colonyShip) {
      state.shipDesigns[colonyShip.id] = colonyShip;
    }
  }
}
