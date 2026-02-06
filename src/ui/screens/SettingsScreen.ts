// SettingsScreen.ts - Settings overlay with graphics, audio, game, and controls tabs
// Updated: Added Anti-Aliasing toggle to Graphics tab with "Requires restart" hint

import { EventBus } from '@/core/EventBus';
import { ScreenComponent } from '@/ui/UIManager';
import { SettingsService } from '@/services/SettingsService';
import { HotkeyManager } from '@/input/HotkeyManager';

type Tab = 'graphics' | 'audio' | 'game' | 'controls';

export class SettingsScreen implements ScreenComponent {
  private element: HTMLElement | null = null;
  private eventBus: EventBus;
  private settingsService: SettingsService;
  private hotkeyManager: HotkeyManager;
  private activeTab: Tab = 'graphics';

  constructor(eventBus: EventBus, settingsService: SettingsService, hotkeyManager: HotkeyManager) {
    this.eventBus = eventBus;
    this.settingsService = settingsService;
    this.hotkeyManager = hotkeyManager;
  }

  show(container: HTMLElement): void {
    this.element = document.createElement('div');
    this.element.className = 'settings-overlay fade-in';
    this.render();
    container.appendChild(this.element);
  }

  hide(): void {
    this.element?.remove();
    this.element = null;
  }

  private render(): void {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="settings-panel">
        <div class="settings-header">
          <div class="settings-header-left">
            <span class="settings-title">Settings</span>
            <span class="settings-subtitle">Game Paused</span>
          </div>
          <button class="settings-close btn">&times;</button>
        </div>
        <div class="settings-tabs">
          <button class="settings-tab ${this.activeTab === 'graphics' ? 'active' : ''}" data-tab="graphics">Graphics</button>
          <button class="settings-tab ${this.activeTab === 'audio' ? 'active' : ''}" data-tab="audio">Audio</button>
          <button class="settings-tab ${this.activeTab === 'game' ? 'active' : ''}" data-tab="game">Game</button>
          <button class="settings-tab ${this.activeTab === 'controls' ? 'active' : ''}" data-tab="controls">Controls</button>
        </div>
        <div class="settings-content">
          ${this.renderTab()}
        </div>
        <div class="settings-footer">
          <button class="btn btn-primary settings-resume-btn" id="settings-resume">Resume Game</button>
          <button class="btn btn-danger" id="settings-mainmenu">Main Menu</button>
        </div>
      </div>
    `;

    // Tab buttons
    this.element.querySelectorAll('.settings-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = (btn as HTMLElement).dataset.tab as Tab;
        this.render();
      });
    });

    // Close button
    this.element.querySelector('.settings-close')?.addEventListener('click', () => {
      this.eventBus.emit('view:settings', {});
    });

    // Footer buttons
    this.element.querySelector('#settings-resume')?.addEventListener('click', () => {
      this.eventBus.emit('view:settings', {});
    });
    this.element.querySelector('#settings-mainmenu')?.addEventListener('click', () => {
      this.eventBus.emit('view:settings', {}); // close overlay first
      this.eventBus.emit('view:mainMenu', {});
    });

    // Click backdrop to close
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) {
        this.eventBus.emit('view:settings', {});
      }
    });

    // Wire tab-specific controls
    this.wireTabControls();
  }

  private renderTab(): string {
    switch (this.activeTab) {
      case 'graphics': return this.renderGraphicsTab();
      case 'audio': return this.renderAudioTab();
      case 'game': return this.renderGameTab();
      case 'controls': return this.renderControlsTab();
    }
  }

  private renderGraphicsTab(): string {
    const g = this.settingsService.getGraphics();
    return `
      <div class="settings-row">
        <span class="settings-label">Quality Preset</span>
        <div class="settings-preset-group">
          <button class="btn settings-preset-btn ${g.qualityPreset === 'low' ? 'active' : ''}" data-preset="low">Low</button>
          <button class="btn settings-preset-btn ${g.qualityPreset === 'medium' ? 'active' : ''}" data-preset="medium">Medium</button>
          <button class="btn settings-preset-btn ${g.qualityPreset === 'high' ? 'active' : ''}" data-preset="high">High</button>
        </div>
      </div>
      <div class="settings-row">
        <span class="settings-label">Bloom</span>
        <label class="settings-toggle">
          <input type="checkbox" id="settings-bloom" ${g.bloomEnabled ? 'checked' : ''} />
          <span class="settings-toggle-slider"></span>
        </label>
      </div>
      <div class="settings-row">
        <span class="settings-label">Anti-Aliasing</span>
        <label class="settings-toggle">
          <input type="checkbox" id="settings-antialias" ${g.antiAliasing ? 'checked' : ''} />
          <span class="settings-toggle-slider"></span>
        </label>
        <span class="settings-hint">Requires restart</span>
      </div>
      <div class="settings-row">
        <span class="settings-label">Particle Density</span>
        <input type="range" class="settings-slider" id="settings-density" min="0.1" max="1" step="0.1" value="${g.particleDensity}" />
        <span class="settings-value">${Math.round(g.particleDensity * 100)}%</span>
      </div>
      <div class="settings-row">
        <span class="settings-label">Pixel Ratio Limit</span>
        <select id="settings-pixelratio" class="settings-select">
          <option value="1" ${g.pixelRatioLimit === 1 ? 'selected' : ''}>1x</option>
          <option value="2" ${g.pixelRatioLimit === 2 ? 'selected' : ''}>2x</option>
          <option value="3" ${g.pixelRatioLimit === 3 ? 'selected' : ''}>3x (Native)</option>
        </select>
      </div>
    `;
  }

  private renderAudioTab(): string {
    const a = this.settingsService.getAudio();
    return `
      <div class="settings-notice">Audio not yet implemented</div>
      <div class="settings-row">
        <span class="settings-label">Master Volume</span>
        <input type="range" class="settings-slider" id="settings-master" min="0" max="1" step="0.05" value="${a.masterVolume}" />
        <span class="settings-value">${Math.round(a.masterVolume * 100)}%</span>
      </div>
      <div class="settings-row">
        <span class="settings-label">Music Volume</span>
        <input type="range" class="settings-slider" id="settings-music" min="0" max="1" step="0.05" value="${a.musicVolume}" />
        <span class="settings-value">${Math.round(a.musicVolume * 100)}%</span>
      </div>
      <div class="settings-row">
        <span class="settings-label">SFX Volume</span>
        <input type="range" class="settings-slider" id="settings-sfx" min="0" max="1" step="0.05" value="${a.sfxVolume}" />
        <span class="settings-value">${Math.round(a.sfxVolume * 100)}%</span>
      </div>
    `;
  }

  private renderGameTab(): string {
    const g = this.settingsService.getGame();
    return `
      <div class="settings-row">
        <span class="settings-label">Auto-Save</span>
        <label class="settings-toggle">
          <input type="checkbox" id="settings-autosave" ${g.autoSave ? 'checked' : ''} />
          <span class="settings-toggle-slider"></span>
        </label>
      </div>
      <div class="settings-row">
        <span class="settings-label">Turn Confirmation</span>
        <label class="settings-toggle">
          <input type="checkbox" id="settings-turnconfirm" ${g.turnConfirmation ? 'checked' : ''} />
          <span class="settings-toggle-slider"></span>
        </label>
      </div>
      <div class="settings-row">
        <span class="settings-label">Notification Duration</span>
        <input type="range" class="settings-slider" id="settings-notif-dur" min="1" max="10" step="1" value="${g.notificationDuration}" />
        <span class="settings-value">${g.notificationDuration}s</span>
      </div>
    `;
  }

  private renderControlsTab(): string {
    const bindings = this.hotkeyManager.getBindings();
    const rows = bindings.map(b => {
      const keyDisplay = [
        b.modifiers ? b.modifiers : '',
        b.key,
      ].filter(Boolean).join(' + ');
      return `<div class="hotkey-row"><span class="hotkey-key">${keyDisplay}</span><span class="hotkey-desc">${b.description}</span></div>`;
    }).join('');

    return `
      <div class="hotkey-list">
        ${rows}
      </div>
    `;
  }

  private wireTabControls(): void {
    if (!this.element) return;

    if (this.activeTab === 'graphics') {
      // Preset buttons
      this.element.querySelectorAll('.settings-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const preset = (btn as HTMLElement).dataset.preset as 'low' | 'medium' | 'high';
          this.settingsService.applyPreset(preset);
          this.render();
        });
      });

      // Bloom toggle
      this.element.querySelector('#settings-bloom')?.addEventListener('change', (e) => {
        this.settingsService.updateGraphics({ bloomEnabled: (e.target as HTMLInputElement).checked });
      });

      // Anti-aliasing toggle
      this.element.querySelector('#settings-antialias')?.addEventListener('change', (e) => {
        this.settingsService.updateGraphics({ antiAliasing: (e.target as HTMLInputElement).checked });
      });

      // Density slider
      this.element.querySelector('#settings-density')?.addEventListener('input', (e) => {
        const val = parseFloat((e.target as HTMLInputElement).value);
        this.settingsService.updateGraphics({ particleDensity: val });
        const valueSpan = (e.target as HTMLElement).nextElementSibling;
        if (valueSpan) valueSpan.textContent = `${Math.round(val * 100)}%`;
      });

      // Pixel ratio
      this.element.querySelector('#settings-pixelratio')?.addEventListener('change', (e) => {
        this.settingsService.updateGraphics({ pixelRatioLimit: parseInt((e.target as HTMLSelectElement).value) });
      });
    }

    if (this.activeTab === 'audio') {
      const wireSlider = (id: string, key: keyof ReturnType<SettingsService['getAudio']>) => {
        this.element!.querySelector(`#${id}`)?.addEventListener('input', (e) => {
          const val = parseFloat((e.target as HTMLInputElement).value);
          this.settingsService.updateAudio({ [key]: val });
          const valueSpan = (e.target as HTMLElement).nextElementSibling;
          if (valueSpan) valueSpan.textContent = `${Math.round(val * 100)}%`;
        });
      };
      wireSlider('settings-master', 'masterVolume');
      wireSlider('settings-music', 'musicVolume');
      wireSlider('settings-sfx', 'sfxVolume');
    }

    if (this.activeTab === 'game') {
      this.element.querySelector('#settings-autosave')?.addEventListener('change', (e) => {
        this.settingsService.updateGame({ autoSave: (e.target as HTMLInputElement).checked });
      });
      this.element.querySelector('#settings-turnconfirm')?.addEventListener('change', (e) => {
        this.settingsService.updateGame({ turnConfirmation: (e.target as HTMLInputElement).checked });
      });
      this.element.querySelector('#settings-notif-dur')?.addEventListener('input', (e) => {
        const val = parseInt((e.target as HTMLInputElement).value);
        this.settingsService.updateGame({ notificationDuration: val });
        const valueSpan = (e.target as HTMLElement).nextElementSibling;
        if (valueSpan) valueSpan.textContent = `${val}s`;
      });
    }
  }
}
