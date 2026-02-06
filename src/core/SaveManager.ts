import { GameState } from './GameState';

const SAVE_PREFIX = 'blacktimes_save_';

export class SaveManager {
  save(slot: string, state: GameState): void {
    try {
      const json = JSON.stringify(state);
      localStorage.setItem(SAVE_PREFIX + slot, json);
    } catch (e) {
      console.error('Failed to save game:', e);
    }
  }

  load(slot: string): GameState | null {
    try {
      const json = localStorage.getItem(SAVE_PREFIX + slot);
      if (!json) return null;
      return JSON.parse(json) as GameState;
    } catch (e) {
      console.error('Failed to load game:', e);
      return null;
    }
  }

  listSlots(): string[] {
    const slots: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(SAVE_PREFIX)) {
        slots.push(key.substring(SAVE_PREFIX.length));
      }
    }
    return slots;
  }

  deleteSlot(slot: string): void {
    localStorage.removeItem(SAVE_PREFIX + slot);
  }

  exportToFile(state: GameState): void {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blacktimes_save_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importFromFile(): Promise<GameState | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) { resolve(null); return; }
        try {
          const text = await file.text();
          resolve(JSON.parse(text) as GameState);
        } catch {
          resolve(null);
        }
      };
      input.click();
    });
  }
}
