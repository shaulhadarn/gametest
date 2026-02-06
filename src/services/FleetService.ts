import { GameState } from '@/core/GameState';
import { Fleet } from '@/models/Fleet';

export class FleetService {
  setDestination(state: GameState, fleetId: string, targetStarId: string): boolean {
    const fleet = state.fleets[fleetId];
    if (!fleet) return false;

    const currentStar = state.stars[fleet.currentStarId];
    if (!currentStar) return false;

    // Check if target is reachable via warp lanes
    const path = this.findPath(state, fleet.currentStarId, targetStarId);
    if (!path || path.length === 0) return false;

    fleet.path = path;
    fleet.destinationStarId = path[0]; // Next hop
    fleet.movementProgress = 0;

    return true;
  }

  processFleets(state: GameState): void {
    for (const fleet of Object.values(state.fleets)) {
      if (!fleet.destinationStarId) continue;

      fleet.movementProgress += fleet.speed;

      if (fleet.movementProgress >= 1) {
        // Arrived at next hop
        fleet.currentStarId = fleet.destinationStarId;
        fleet.movementProgress = 0;

        // Mark star as explored
        const player = state.players[fleet.playerId];
        if (player) {
          const star = state.stars[fleet.currentStarId];
          if (star) {
            star.explored[fleet.playerId] = true;
          }
        }

        // Continue to next hop if path has more
        if (fleet.path.length > 0) {
          const currentIdx = fleet.path.indexOf(fleet.currentStarId);
          if (currentIdx >= 0 && currentIdx < fleet.path.length - 1) {
            fleet.destinationStarId = fleet.path[currentIdx + 1];
          } else {
            fleet.destinationStarId = null;
            fleet.path = [];
          }
        } else {
          fleet.destinationStarId = null;
        }
      }
    }
  }

  findPath(state: GameState, fromStarId: string, toStarId: string): string[] | null {
    // BFS pathfinding through warp lanes
    if (fromStarId === toStarId) return [];

    const visited = new Set<string>();
    const queue: { starId: string; path: string[] }[] = [
      { starId: fromStarId, path: [] },
    ];
    visited.add(fromStarId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const star = state.stars[current.starId];
      if (!star) continue;

      for (const neighborId of star.warpLanes) {
        if (visited.has(neighborId)) continue;
        visited.add(neighborId);

        const newPath = [...current.path, neighborId];
        if (neighborId === toStarId) {
          return newPath;
        }
        queue.push({ starId: neighborId, path: newPath });
      }
    }

    return null; // No path found
  }

  mergeFleets(state: GameState, fleetId1: string, fleetId2: string): Fleet | null {
    const f1 = state.fleets[fleetId1];
    const f2 = state.fleets[fleetId2];
    if (!f1 || !f2) return null;
    if (f1.playerId !== f2.playerId) return null;
    if (f1.currentStarId !== f2.currentStarId) return null;

    // Merge f2 into f1
    for (const shipId of f2.shipIds) {
      f1.shipIds.push(shipId);
      const ship = state.ships[shipId];
      if (ship) ship.fleetId = f1.id;
    }

    // Recalculate speed
    f1.speed = Math.min(...f1.shipIds.map(sid => {
      const s = state.ships[sid];
      const d = s ? state.shipDesigns[s.designId] : null;
      return d?.speed || 1;
    }));

    // Remove f2
    const player = state.players[f2.playerId];
    if (player) {
      player.fleetIds = player.fleetIds.filter(id => id !== f2.id);
    }
    delete state.fleets[f2.id];

    return f1;
  }

  splitFleet(state: GameState, fleetId: string, shipIds: string[]): Fleet | null {
    const fleet = state.fleets[fleetId];
    if (!fleet) return null;
    if (shipIds.length === 0 || shipIds.length >= fleet.shipIds.length) return null;

    const newFleet: Fleet = {
      id: `fleet_${Date.now().toString(36)}`,
      playerId: fleet.playerId,
      name: `${fleet.name} (Split)`,
      shipIds: [],
      currentStarId: fleet.currentStarId,
      destinationStarId: null,
      movementProgress: 0,
      speed: 1,
      path: [],
    };

    for (const sid of shipIds) {
      const idx = fleet.shipIds.indexOf(sid);
      if (idx >= 0) {
        fleet.shipIds.splice(idx, 1);
        newFleet.shipIds.push(sid);
        const ship = state.ships[sid];
        if (ship) ship.fleetId = newFleet.id;
      }
    }

    // Recalculate speeds
    const calcSpeed = (f: Fleet) => Math.min(...f.shipIds.map(sid => {
      const s = state.ships[sid];
      const d = s ? state.shipDesigns[s.designId] : null;
      return d?.speed || 1;
    }));

    fleet.speed = fleet.shipIds.length > 0 ? calcSpeed(fleet) : 1;
    newFleet.speed = calcSpeed(newFleet);

    state.fleets[newFleet.id] = newFleet;
    const player = state.players[fleet.playerId];
    if (player) {
      player.fleetIds.push(newFleet.id);
    }

    return newFleet;
  }

  getReachableStars(state: GameState, fleetId: string): string[] {
    const fleet = state.fleets[fleetId];
    if (!fleet) return [];

    const star = state.stars[fleet.currentStarId];
    if (!star) return [];

    return star.warpLanes.filter(id => state.stars[id]);
  }
}
