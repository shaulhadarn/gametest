import type { GraphicsSettings } from '@/services/SettingsService';

export interface GameEvents {
  // Galaxy / Navigation
  'star:selected': { starId: string };
  'star:deselected': {};
  'star:doubleClicked': { starId: string };
  'planet:selected': { planetId: string };
  'planet:deselected': {};
  'planet:doubleClicked': { planetId: string };
  'fleet:selected': { fleetId: string };
  'fleet:deselected': {};

  // View transitions
  'view:galaxy': {};
  'view:system': { starId: string };
  'view:colony': { colonyId: string };
  'view:research': {};
  'view:shipDesign': {};
  'view:fleet': { fleetId?: string };
  'view:diplomacy': { playerId?: string };
  'view:combat': { combatId: string };
  'view:mainMenu': {};
  'view:newGame': {};
  'view:loreIntro': {};
  'view:settings': {};

  // Lore
  'loreIntro:complete': {};

  // Turn
  'turn:end': {};
  'turn:processing': { phase: string };
  'turn:complete': { turn: number };

  // Colony
  'colony:requestFound': { planetId: string };
  'colony:founded': { colonyId: string; planetId: string };
  'colony:updated': { colonyId: string };
  'colony:buildComplete': { colonyId: string; itemName: string };

  // Research
  'research:selected': { techId: string };
  'research:complete': { techId: string; playerId: string };

  // Ship
  'ship:designed': { designId: string };
  'ship:built': { shipId: string; colonyId: string };
  'ship:destroyed': { shipId: string };

  // Fleet
  'fleet:moved': { fleetId: string; starId: string };
  'fleet:arrived': { fleetId: string; starId: string };
  'fleet:merged': { fleetId: string };

  // Combat
  'combat:started': { combatId: string; starId: string };
  'combat:ended': { combatId: string; winnerId: string };

  // Diplomacy
  'diplomacy:proposal': { fromId: string; toId: string; type: string };
  'diplomacy:war': { player1Id: string; player2Id: string };
  'diplomacy:peace': { player1Id: string; player2Id: string };

  // Victory
  'victory:achieved': { playerId: string; type: string };

  // Save/Load
  'game:saved': { slot: string };
  'game:loaded': { slot: string };
  'game:newGame': { config: unknown };

  // UI
  'ui:tooltip': { text: string; x: number; y: number } | null;
  'ui:modal': { title: string; content: string; actions: unknown[] } | null;
  'ui:toast': { message: string; icon: string; color: string };

  // Settings
  'settings:graphicsChanged': { graphics: GraphicsSettings };

  // Galaxy generation
  'galaxy:generated': {};
  'galaxy:ready': {};
}

type EventCallback<T> = (data: T) => void;

export class EventBus {
  private listeners = new Map<string, Set<EventCallback<unknown>>>();

  on<K extends keyof GameEvents>(event: K, callback: EventCallback<GameEvents[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(callback as EventCallback<unknown>);

    // Return unsubscribe function
    return () => {
      set.delete(callback as EventCallback<unknown>);
    };
  }

  off<K extends keyof GameEvents>(event: K, callback: EventCallback<GameEvents[K]>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback as EventCallback<unknown>);
    }
  }

  emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const callback of set) {
        try {
          callback(data);
        } catch (e) {
          console.error(`EventBus error in handler for '${event}':`, e);
        }
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
