import { GameState } from '@/core/GameState';
import { Ship, ShipDesign } from '@/models/Ship';
import { Colony } from '@/models/Colony';
import { Fleet } from '@/models/Fleet';
import { generateId } from '@/core/IdGenerator';

export class ShipBuildService {
  buildShip(state: GameState, designId: string, colonyId: string): Ship | null {
    const design = state.shipDesigns[designId];
    const colony = state.colonies[colonyId];
    if (!design || !colony) return null;

    const planet = state.planets[colony.planetId];
    if (!planet) return null;

    const ship: Ship = {
      id: generateId('ship'),
      designId,
      playerId: colony.playerId,
      currentHP: design.hp,
      experience: 0,
      fleetId: null,
    };

    state.ships[ship.id] = ship;

    // Add to fleet at this star (or create one)
    const starId = planet.starId;
    let fleet = Object.values(state.fleets).find(
      f => f.playerId === colony.playerId && f.currentStarId === starId && !f.destinationStarId
    );

    if (!fleet) {
      fleet = {
        id: generateId('fleet'),
        playerId: colony.playerId,
        name: `Fleet ${Object.values(state.fleets).filter(f => f.playerId === colony.playerId).length + 1}`,
        shipIds: [],
        currentStarId: starId,
        destinationStarId: null,
        movementProgress: 0,
        speed: design.speed,
        path: [],
      };
      state.fleets[fleet.id] = fleet;
      const player = state.players[colony.playerId];
      if (player) {
        player.fleetIds.push(fleet.id);
      }
    }

    fleet.shipIds.push(ship.id);
    ship.fleetId = fleet.id;

    // Recalculate fleet speed (slowest ship)
    fleet.speed = Math.min(...fleet.shipIds.map(sid => {
      const s = state.ships[sid];
      const d = s ? state.shipDesigns[s.designId] : null;
      return d?.speed || 1;
    }));

    return ship;
  }
}
