import { GameState } from '@/core/GameState';
import { Player } from '@/models/Player';
import { SHIP_MAINTENANCE_MULTIPLIER, BUILDING_MAINTENANCE_MULTIPLIER } from '@/core/Constants';

export class ResourceService {
  processPlayer(state: GameState, player: Player): void {
    let income = 0;
    let maintenance = 0;

    // Colony income
    for (const colonyId of player.colonyIds) {
      const colony = state.colonies[colonyId];
      if (colony) {
        income += colony.creditsOutput;
      }
    }

    // Ship maintenance
    for (const fleetId of player.fleetIds) {
      const fleet = state.fleets[fleetId];
      if (fleet) {
        for (const shipId of fleet.shipIds) {
          const ship = state.ships[shipId];
          if (ship) {
            const design = state.shipDesigns[ship.designId];
            if (design) {
              maintenance += design.cost * SHIP_MAINTENANCE_MULTIPLIER * 0.01;
            }
          }
        }
      }
    }

    // Building maintenance
    for (const colonyId of player.colonyIds) {
      const colony = state.colonies[colonyId];
      if (colony) {
        maintenance += colony.buildings.length * BUILDING_MAINTENANCE_MULTIPLIER;
      }
    }

    player.credits += income - maintenance;

    // Handle deficit
    if (player.credits < 0) {
      // Reduce morale in all colonies
      for (const colonyId of player.colonyIds) {
        const colony = state.colonies[colonyId];
        if (colony) {
          colony.morale = Math.max(0, colony.morale - 3);
        }
      }
    }
  }

  getPlayerIncome(state: GameState, playerId: string): { income: number; maintenance: number; net: number } {
    const player = state.players[playerId];
    if (!player) return { income: 0, maintenance: 0, net: 0 };

    let income = 0;
    let maintenance = 0;

    for (const colonyId of player.colonyIds) {
      const colony = state.colonies[colonyId];
      if (colony) {
        income += colony.creditsOutput;
        maintenance += colony.buildings.length * BUILDING_MAINTENANCE_MULTIPLIER;
      }
    }

    for (const fleetId of player.fleetIds) {
      const fleet = state.fleets[fleetId];
      if (fleet) {
        for (const shipId of fleet.shipIds) {
          const ship = state.ships[shipId];
          if (ship) {
            const design = state.shipDesigns[ship.designId];
            if (design) {
              maintenance += design.cost * SHIP_MAINTENANCE_MULTIPLIER * 0.01;
            }
          }
        }
      }
    }

    return { income, maintenance, net: income - maintenance };
  }
}
