import { GameState } from '@/core/GameState';
import { Player } from '@/models/Player';
import { Technology, TechEffect } from '@/models/Technology';
import { TechCategory } from '@/models/types';

const DEFAULT_TECH_TREE: Technology[] = [
  // CONSTRUCTION
  { id: 'tech_improved_factory', name: 'Improved Factories', category: TechCategory.CONSTRUCTION, level: 1, researchCost: 80, description: 'Increases production output.', effects: [{ type: 'production_bonus', value: 0.1 }], prerequisiteIds: [], unlocks: ['factory'] },
  { id: 'tech_automated_factory', name: 'Automated Factories', category: TechCategory.CONSTRUCTION, level: 2, researchCost: 200, description: 'Advanced factory automation.', effects: [{ type: 'production_bonus', value: 0.2 }], prerequisiteIds: ['tech_improved_factory'], unlocks: ['automated_factory'] },
  { id: 'tech_adv_construction', name: 'Advanced Construction', category: TechCategory.CONSTRUCTION, level: 3, researchCost: 400, description: 'Reduces building costs.', effects: [{ type: 'build_cost_reduction', value: 0.15 }], prerequisiteIds: ['tech_automated_factory'], unlocks: [] },
  { id: 'tech_nano_assembly', name: 'Nano Assembly', category: TechCategory.CONSTRUCTION, level: 4, researchCost: 800, description: 'Molecular-level construction.', effects: [{ type: 'production_bonus', value: 0.3 }], prerequisiteIds: ['tech_adv_construction'], unlocks: [] },
  { id: 'tech_matter_replication', name: 'Matter Replication', category: TechCategory.CONSTRUCTION, level: 5, researchCost: 1500, description: 'Replicate any material.', effects: [{ type: 'production_bonus', value: 0.5 }], prerequisiteIds: ['tech_nano_assembly'], unlocks: [] },

  // FORCE_FIELDS
  { id: 'tech_deflector_shield', name: 'Deflector Shields', category: TechCategory.FORCE_FIELDS, level: 1, researchCost: 100, description: 'Basic ship shields.', effects: [], prerequisiteIds: [], unlocks: ['comp_shield_1'] },
  { id: 'tech_class2_shield', name: 'Class II Shields', category: TechCategory.FORCE_FIELDS, level: 2, researchCost: 250, description: 'Improved shields.', effects: [], prerequisiteIds: ['tech_deflector_shield'], unlocks: ['comp_shield_2'] },
  { id: 'tech_planetary_shield', name: 'Planetary Shield', category: TechCategory.FORCE_FIELDS, level: 3, researchCost: 500, description: 'Protect colonies from bombardment.', effects: [], prerequisiteIds: ['tech_class2_shield'], unlocks: ['planetary_shield'] },
  { id: 'tech_class5_shield', name: 'Class V Shields', category: TechCategory.FORCE_FIELDS, level: 4, researchCost: 900, description: 'Advanced shields.', effects: [], prerequisiteIds: ['tech_planetary_shield'], unlocks: ['comp_shield_5'] },
  { id: 'tech_quantum_barrier', name: 'Quantum Barrier', category: TechCategory.FORCE_FIELDS, level: 5, researchCost: 1600, description: 'Ultimate shield technology.', effects: [], prerequisiteIds: ['tech_class5_shield'], unlocks: ['comp_shield_max'] },

  // PLANETOLOGY
  { id: 'tech_eco_restoration', name: 'Eco Restoration', category: TechCategory.PLANETOLOGY, level: 1, researchCost: 60, description: 'Improve planet habitability.', effects: [{ type: 'habitability_bonus', value: 10 }], prerequisiteIds: [], unlocks: ['terraformer'] },
  { id: 'tech_soil_enrichment', name: 'Soil Enrichment', category: TechCategory.PLANETOLOGY, level: 2, researchCost: 150, description: 'Better farming output.', effects: [{ type: 'food_bonus', value: 0.2 }], prerequisiteIds: ['tech_eco_restoration'], unlocks: ['hydroponic_farm'] },
  { id: 'tech_advanced_cloning', name: 'Advanced Cloning', category: TechCategory.PLANETOLOGY, level: 3, researchCost: 350, description: 'Faster population growth.', effects: [{ type: 'growth_bonus', value: 0.5 }], prerequisiteIds: ['tech_soil_enrichment'], unlocks: ['cloning_center'] },
  { id: 'tech_terraforming', name: 'Terraforming', category: TechCategory.PLANETOLOGY, level: 4, researchCost: 700, description: 'Transform planets to Terran type.', effects: [{ type: 'habitability_bonus', value: 25 }], prerequisiteIds: ['tech_advanced_cloning'], unlocks: [] },
  { id: 'tech_gaia_transform', name: 'Gaia Transformation', category: TechCategory.PLANETOLOGY, level: 5, researchCost: 1400, description: 'Perfect world creation.', effects: [{ type: 'habitability_bonus', value: 50 }], prerequisiteIds: ['tech_terraforming'], unlocks: [] },

  // PROPULSION
  { id: 'tech_hydrogen_fuel', name: 'Hydrogen Fuel Cells', category: TechCategory.PROPULSION, level: 1, researchCost: 80, description: 'Basic ship engines.', effects: [], prerequisiteIds: [], unlocks: ['comp_engine_1'] },
  { id: 'tech_fusion_drive', name: 'Fusion Drive', category: TechCategory.PROPULSION, level: 2, researchCost: 200, description: 'Faster ship movement.', effects: [{ type: 'speed_bonus', value: 1 }], prerequisiteIds: ['tech_hydrogen_fuel'], unlocks: ['comp_engine_2'] },
  { id: 'tech_ion_drive', name: 'Ion Drive', category: TechCategory.PROPULSION, level: 3, researchCost: 400, description: 'Efficient long-range engines.', effects: [{ type: 'speed_bonus', value: 1 }], prerequisiteIds: ['tech_fusion_drive'], unlocks: ['comp_engine_3'] },
  { id: 'tech_antimatter_drive', name: 'Antimatter Drive', category: TechCategory.PROPULSION, level: 4, researchCost: 800, description: 'Very fast engines.', effects: [{ type: 'speed_bonus', value: 1 }], prerequisiteIds: ['tech_ion_drive'], unlocks: ['comp_engine_4'] },
  { id: 'tech_hyperspace', name: 'Hyperspace Drive', category: TechCategory.PROPULSION, level: 5, researchCost: 1500, description: 'Fastest possible travel.', effects: [{ type: 'speed_bonus', value: 2 }], prerequisiteIds: ['tech_antimatter_drive'], unlocks: ['comp_engine_max'] },

  // COMPUTERS
  { id: 'tech_battle_computer', name: 'Battle Computer', category: TechCategory.COMPUTERS, level: 1, researchCost: 80, description: 'Basic targeting system.', effects: [], prerequisiteIds: [], unlocks: ['comp_computer_1'] },
  { id: 'tech_battle_scanner', name: 'Battle Scanner', category: TechCategory.COMPUTERS, level: 2, researchCost: 200, description: 'Improved scanning range.', effects: [{ type: 'scan_range', value: 1 }], prerequisiteIds: ['tech_battle_computer'], unlocks: ['comp_computer_2'] },
  { id: 'tech_electronic_computer', name: 'Electronic Computer', category: TechCategory.COMPUTERS, level: 3, researchCost: 400, description: 'Advanced targeting.', effects: [], prerequisiteIds: ['tech_battle_scanner'], unlocks: ['comp_computer_3'] },
  { id: 'tech_positronic_computer', name: 'Positronic Computer', category: TechCategory.COMPUTERS, level: 4, researchCost: 800, description: 'Superior processing power.', effects: [{ type: 'research_bonus', value: 0.2 }], prerequisiteIds: ['tech_electronic_computer'], unlocks: ['comp_computer_4'] },
  { id: 'tech_quantum_computer', name: 'Quantum Computer', category: TechCategory.COMPUTERS, level: 5, researchCost: 1600, description: 'Ultimate computer technology.', effects: [{ type: 'research_bonus', value: 0.3 }], prerequisiteIds: ['tech_positronic_computer'], unlocks: ['comp_computer_max'] },

  // WEAPONS
  { id: 'tech_laser', name: 'Laser Weapons', category: TechCategory.WEAPONS, level: 1, researchCost: 80, description: 'Basic energy weapon.', effects: [], prerequisiteIds: [], unlocks: ['comp_weapon_laser'] },
  { id: 'tech_gatling_laser', name: 'Gatling Laser', category: TechCategory.WEAPONS, level: 2, researchCost: 200, description: 'Rapid-fire laser.', effects: [], prerequisiteIds: ['tech_laser'], unlocks: ['comp_weapon_gatling'] },
  { id: 'tech_fusion_beam', name: 'Fusion Beam', category: TechCategory.WEAPONS, level: 3, researchCost: 400, description: 'Powerful beam weapon.', effects: [], prerequisiteIds: ['tech_gatling_laser'], unlocks: ['comp_weapon_fusion'] },
  { id: 'tech_plasma_cannon', name: 'Plasma Cannon', category: TechCategory.WEAPONS, level: 4, researchCost: 800, description: 'Devastating plasma weapon.', effects: [], prerequisiteIds: ['tech_fusion_beam'], unlocks: ['comp_weapon_plasma'] },
  { id: 'tech_stellar_converter', name: 'Stellar Converter', category: TechCategory.WEAPONS, level: 5, researchCost: 1800, description: 'Planet-destroying weapon.', effects: [], prerequisiteIds: ['tech_plasma_cannon'], unlocks: ['comp_weapon_stellar'] },
];

export class ResearchService {
  loadTechTree(state: GameState): void {
    for (const tech of DEFAULT_TECH_TREE) {
      state.technologies[tech.id] = { ...tech };
    }
  }

  processPlayer(state: GameState, player: Player): string | null {
    if (!player.currentResearchId) return null;

    const tech = state.technologies[player.currentResearchId];
    if (!tech) return null;

    // Accumulate research from colonies
    let totalResearch = 0;
    for (const colonyId of player.colonyIds) {
      const colony = state.colonies[colonyId];
      if (colony) {
        totalResearch += colony.researchOutput;
      }
    }

    player.researchPool += totalResearch;

    if (player.researchPool >= tech.researchCost) {
      // Research complete
      player.researchPool -= tech.researchCost;
      player.knownTechIds.push(tech.id);
      const completedId = player.currentResearchId;
      player.currentResearchId = null;
      return completedId;
    }

    return null;
  }

  canResearch(state: GameState, playerId: string, techId: string): boolean {
    const player = state.players[playerId];
    const tech = state.technologies[techId];
    if (!player || !tech) return false;

    // Already researched
    if (player.knownTechIds.includes(techId)) return false;

    // Prerequisites met
    for (const prereq of tech.prerequisiteIds) {
      if (!player.knownTechIds.includes(prereq)) return false;
    }

    return true;
  }

  getAvailableTechs(state: GameState, playerId: string): Technology[] {
    const player = state.players[playerId];
    if (!player) return [];

    return Object.values(state.technologies).filter(tech =>
      this.canResearch(state, playerId, tech.id)
    );
  }

  selectResearch(state: GameState, playerId: string, techId: string): boolean {
    if (!this.canResearch(state, playerId, techId)) return false;
    const player = state.players[playerId];
    player.currentResearchId = techId;
    player.researchPool = 0;
    return true;
  }

  getResearchProgress(state: GameState, playerId: string): { current: number; required: number; techId: string | null } {
    const player = state.players[playerId];
    if (!player || !player.currentResearchId) {
      return { current: 0, required: 0, techId: null };
    }
    const tech = state.technologies[player.currentResearchId];
    return {
      current: player.researchPool,
      required: tech?.researchCost || 0,
      techId: player.currentResearchId,
    };
  }
}
