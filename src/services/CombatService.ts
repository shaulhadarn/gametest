import { GameState } from '@/core/GameState';
import { Random } from '@/core/Random';
import { Fleet } from '@/models/Fleet';
import { Ship, ShipDesign } from '@/models/Ship';
import { COMBAT_MAX_ROUNDS } from '@/core/Constants';

export interface CombatResult {
  winnerId: string;
  loserId: string;
  starId: string;
  winnerLosses: string[]; // ship IDs destroyed
  loserLosses: string[]; // ship IDs destroyed
  rounds: number;
}

interface CombatShip {
  ship: Ship;
  design: ShipDesign;
  hp: number;
  shields: number;
}

export class CombatService {
  private rng: Random;

  constructor(rng: Random) {
    this.rng = rng;
  }

  detectCombats(state: GameState): { fleet1Id: string; fleet2Id: string; starId: string }[] {
    const combats: { fleet1Id: string; fleet2Id: string; starId: string }[] = [];
    const fleetsBystar = new Map<string, Fleet[]>();

    // Group fleets by star (only stationary fleets)
    for (const fleet of Object.values(state.fleets)) {
      if (fleet.destinationStarId) continue; // In transit
      if (fleet.shipIds.length === 0) continue;

      const list = fleetsBystar.get(fleet.currentStarId) || [];
      list.push(fleet);
      fleetsBystar.set(fleet.currentStarId, list);
    }

    // Check each star for hostile fleets
    for (const [starId, fleets] of fleetsBystar) {
      for (let i = 0; i < fleets.length; i++) {
        for (let j = i + 1; j < fleets.length; j++) {
          if (fleets[i].playerId !== fleets[j].playerId) {
            // Check if at war
            const atWar = this.areAtWar(state, fleets[i].playerId, fleets[j].playerId);
            if (atWar) {
              combats.push({
                fleet1Id: fleets[i].id,
                fleet2Id: fleets[j].id,
                starId,
              });
            }
          }
        }
      }
    }

    return combats;
  }

  private areAtWar(state: GameState, p1: string, p2: string): boolean {
    const diplo = state.diplomacy.find(
      d => (d.player1Id === p1 && d.player2Id === p2) ||
           (d.player1Id === p2 && d.player2Id === p1)
    );
    return diplo?.status === 'WAR';
  }

  autoResolve(state: GameState, fleet1Id: string, fleet2Id: string): CombatResult | null {
    const fleet1 = state.fleets[fleet1Id];
    const fleet2 = state.fleets[fleet2Id];
    if (!fleet1 || !fleet2) return null;

    const ships1 = this.getFleetCombatShips(state, fleet1);
    const ships2 = this.getFleetCombatShips(state, fleet2);

    if (ships1.length === 0 || ships2.length === 0) return null;

    let round = 0;
    const destroyed1: string[] = [];
    const destroyed2: string[] = [];

    while (ships1.length > 0 && ships2.length > 0 && round < COMBAT_MAX_ROUNDS) {
      round++;

      // Sort by initiative
      const allShips = [
        ...ships1.map(s => ({ ...s, side: 1 as const })),
        ...ships2.map(s => ({ ...s, side: 2 as const })),
      ].sort((a, b) => b.design.initiative - a.design.initiative);

      for (const attacker of allShips) {
        const targets = attacker.side === 1 ? ships2 : ships1;
        if (targets.length === 0) break;

        // Pick random target
        const targetIdx = this.rng.nextInt(0, targets.length - 1);
        const target = targets[targetIdx];

        // Calculate damage
        const damage = attacker.design.attack * (0.5 + this.rng.next());

        // Apply to shields first
        if (target.shields > 0) {
          const shieldDamage = Math.min(damage, target.shields);
          target.shields -= shieldDamage;
          const remainder = damage - shieldDamage;
          if (remainder > 0) {
            target.hp -= remainder;
          }
        } else {
          target.hp -= damage;
        }

        // Check death
        if (target.hp <= 0) {
          targets.splice(targetIdx, 1);
          if (attacker.side === 1) {
            destroyed2.push(target.ship.id);
          } else {
            destroyed1.push(target.ship.id);
          }
        }
      }
    }

    // Determine winner
    const winnerId = ships1.length > 0 ? fleet1.playerId : fleet2.playerId;
    const loserId = winnerId === fleet1.playerId ? fleet2.playerId : fleet1.playerId;

    // Apply results to state
    this.applyCombatResults(state, fleet1, fleet2, destroyed1, destroyed2);

    return {
      winnerId,
      loserId,
      starId: fleet1.currentStarId,
      winnerLosses: winnerId === fleet1.playerId ? destroyed1 : destroyed2,
      loserLosses: winnerId === fleet1.playerId ? destroyed2 : destroyed1,
      rounds: round,
    };
  }

  private getFleetCombatShips(state: GameState, fleet: Fleet): CombatShip[] {
    return fleet.shipIds
      .map(sid => {
        const ship = state.ships[sid];
        if (!ship) return null;
        const design = state.shipDesigns[ship.designId];
        if (!design) return null;
        return {
          ship,
          design,
          hp: ship.currentHP,
          shields: design.defense,
        };
      })
      .filter((s): s is CombatShip => s !== null);
  }

  private applyCombatResults(
    state: GameState,
    fleet1: Fleet,
    fleet2: Fleet,
    destroyed1: string[],
    destroyed2: string[],
  ): void {
    // Remove destroyed ships
    for (const sid of [...destroyed1, ...destroyed2]) {
      const ship = state.ships[sid];
      if (!ship) continue;

      // Remove from fleet
      const fleet = state.fleets[ship.fleetId || ''];
      if (fleet) {
        fleet.shipIds = fleet.shipIds.filter(id => id !== sid);
      }

      delete state.ships[sid];
    }

    // Update surviving ships' HP
    const updateFleetShips = (fleet: Fleet) => {
      for (const sid of fleet.shipIds) {
        const ship = state.ships[sid];
        if (ship) {
          // Ship survived, keep current HP
        }
      }
    };
    updateFleetShips(fleet1);
    updateFleetShips(fleet2);

    // Remove empty fleets
    for (const fleet of [fleet1, fleet2]) {
      if (fleet.shipIds.length === 0) {
        const player = state.players[fleet.playerId];
        if (player) {
          player.fleetIds = player.fleetIds.filter(id => id !== fleet.id);
        }
        delete state.fleets[fleet.id];
      }
    }

    // Check if a player lost all colonies and fleets
    for (const player of Object.values(state.players)) {
      if (!player.alive) continue;
      if (player.colonyIds.length === 0 && player.fleetIds.length === 0) {
        player.alive = false;
      }
    }
  }

  getPowerRating(state: GameState, fleetId: string): number {
    const fleet = state.fleets[fleetId];
    if (!fleet) return 0;

    let power = 0;
    for (const sid of fleet.shipIds) {
      const ship = state.ships[sid];
      if (!ship) continue;
      const design = state.shipDesigns[ship.designId];
      if (!design) continue;
      power += design.attack + design.defense + design.hp;
    }
    return power;
  }
}
