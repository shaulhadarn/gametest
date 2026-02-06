// SettingsService.ts - Persistent game settings with quality presets and localStorage
// Updated: Added antiAliasing boolean to GraphicsSettings and all quality presets

import { EventBus } from '@/core/EventBus';

export interface GraphicsSettings {
  qualityPreset: 'low' | 'medium' | 'high';
  bloomEnabled: boolean;
  antiAliasing: boolean;
  particleDensity: number; // 0-1
  pixelRatioLimit: number;
}

export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
}

export interface GameSettings {
  autoSave: boolean;
  turnConfirmation: boolean;
  notificationDuration: number; // seconds
}

interface AllSettings {
  graphics: GraphicsSettings;
  audio: AudioSettings;
  game: GameSettings;
}

const STORAGE_KEY = 'blacktimes_settings';

const QUALITY_PRESETS: Record<string, GraphicsSettings> = {
  low: { qualityPreset: 'low', bloomEnabled: false, antiAliasing: false, particleDensity: 0.3, pixelRatioLimit: 1 },
  medium: { qualityPreset: 'medium', bloomEnabled: true, antiAliasing: true, particleDensity: 0.7, pixelRatioLimit: 2 },
  high: { qualityPreset: 'high', bloomEnabled: true, antiAliasing: true, particleDensity: 1.0, pixelRatioLimit: 2 },
};

function getDefaults(): AllSettings {
  const isMobile = SettingsService.isMobile();
  return {
    graphics: { ...(isMobile ? QUALITY_PRESETS.low : QUALITY_PRESETS.high) },
    audio: { masterVolume: 0.8, musicVolume: 0.6, sfxVolume: 0.8 },
    game: { autoSave: true, turnConfirmation: false, notificationDuration: 4 },
  };
}

export class SettingsService {
  private settings: AllSettings;
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.settings = getDefaults();
    this.load();
  }

  static isMobile(): boolean {
    return 'ontouchstart' in window && window.innerWidth < 1024;
  }

  getGraphics(): GraphicsSettings {
    return { ...this.settings.graphics };
  }

  getAudio(): AudioSettings {
    return { ...this.settings.audio };
  }

  getGame(): GameSettings {
    return { ...this.settings.game };
  }

  updateGraphics(partial: Partial<GraphicsSettings>): void {
    Object.assign(this.settings.graphics, partial);
    if (partial.qualityPreset === undefined) {
      this.settings.graphics.qualityPreset = 'high'; // custom
    }
    this.save();
    this.eventBus.emit('settings:graphicsChanged', { graphics: this.getGraphics() });
  }

  updateAudio(partial: Partial<AudioSettings>): void {
    Object.assign(this.settings.audio, partial);
    this.save();
  }

  updateGame(partial: Partial<GameSettings>): void {
    Object.assign(this.settings.game, partial);
    this.save();
  }

  applyPreset(name: 'low' | 'medium' | 'high'): void {
    const preset = QUALITY_PRESETS[name];
    if (preset) {
      this.settings.graphics = { ...preset };
      this.save();
      this.eventBus.emit('settings:graphicsChanged', { graphics: this.getGraphics() });
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch { /* quota exceeded or private browsing */ }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AllSettings>;
        if (parsed.graphics) Object.assign(this.settings.graphics, parsed.graphics);
        if (parsed.audio) Object.assign(this.settings.audio, parsed.audio);
        if (parsed.game) Object.assign(this.settings.game, parsed.game);
      }
    } catch { /* corrupt data */ }
  }
}
