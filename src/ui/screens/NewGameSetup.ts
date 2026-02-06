// NewGameSetup.ts - New game configuration screen with race selection and lore display
// Updated: Added full race selection UI with lore panel, trait badges, playstyle hints, and race-specific visuals

import { EventBus } from '@/core/EventBus';
import { GameConfig } from '@/core/GameState';
import { ScreenComponent } from '@/ui/UIManager';
import { RACE_DATA, getAllRaceIds, getRaceData, FullRaceData } from '@/models/RaceData';

export class NewGameSetup implements ScreenComponent {
  private element: HTMLElement | null = null;
  private eventBus: EventBus;
  private selectedRaceId: string = 'humans';

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  show(container: HTMLElement): void {
    this.selectedRaceId = 'humans';
    this.element = document.createElement('div');
    this.element.className = 'new-game-setup fade-in';
    this.render();
    container.appendChild(this.element);
  }

  hide(): void {
    this.element?.remove();
    this.element = null;
  }

  private render(): void {
    if (!this.element) return;

    const raceIds = getAllRaceIds();
    const selectedRace = getRaceData(this.selectedRaceId);

    this.element.innerHTML = `
      <div class="setup-container-wide">
        <h2 style="font-family:var(--font-display);color:var(--color-text-bright);font-size:22px;margin-bottom:16px;text-align:center;">New Game</h2>

        <div class="setup-two-col">
          <!-- LEFT COLUMN: Game Settings -->
          <div class="setup-left-col">
            <div class="setup-section-title">Game Settings</div>
            <div class="setup-field">
              <label>Commander Name</label>
              <input type="text" id="setup-name" value="Commander" />
            </div>
            <div class="setup-field">
              <label>Galaxy Size</label>
              <select id="setup-size">
                <option value="small">Small (24 stars)</option>
                <option value="medium" selected>Medium (48 stars)</option>
                <option value="large">Large (72 stars)</option>
                <option value="huge">Huge (108 stars)</option>
              </select>
            </div>
            <div class="setup-field">
              <label>Galaxy Shape</label>
              <select id="setup-shape">
                <option value="spiral" selected>Spiral</option>
                <option value="elliptical">Elliptical</option>
                <option value="ring">Ring</option>
              </select>
            </div>
            <div class="setup-field">
              <label>Number of Players</label>
              <select id="setup-players">
                <option value="2">2 Players</option>
                <option value="3">3 Players</option>
                <option value="4" selected>4 Players</option>
                <option value="6">6 Players</option>
                <option value="8">8 Players</option>
              </select>
            </div>
            <div class="setup-field">
              <label>Difficulty</label>
              <select id="setup-difficulty">
                <option value="easy">Easy</option>
                <option value="normal" selected>Normal</option>
                <option value="hard">Hard</option>
                <option value="impossible">Impossible</option>
              </select>
            </div>
          </div>

          <!-- RIGHT COLUMN: Race Selection -->
          <div class="setup-right-col">
            <div class="setup-section-title">Choose Your Species</div>
            <div class="race-selector-grid" id="race-selector-grid">
              ${raceIds.map(id => this.renderRaceCard(id)).join('')}
            </div>

            <!-- Race Detail Panel -->
            ${selectedRace ? this.renderRaceDetail(selectedRace) : ''}
          </div>
        </div>

        <div class="setup-actions" style="margin-top:20px;">
          <button class="btn" id="btn-back">Back</button>
          <button class="btn btn-primary" id="btn-start">Start Game</button>
        </div>
      </div>
    `;

    this.wireEvents();
  }

  private renderRaceCard(raceId: string): string {
    const data = getRaceData(raceId);
    if (!data) return '';
    const isSelected = raceId === this.selectedRaceId;
    const borderColor = isSelected ? data.visuals.primaryColor : 'transparent';
    const bgAlpha = isSelected ? '0.15' : '0.05';

    return `
      <div class="race-card ${isSelected ? 'race-card-selected' : ''}"
           data-race-id="${raceId}"
           style="border-color:${borderColor};background:rgba(255,255,255,${bgAlpha});">
        <div class="race-card-emblem" style="color:${data.visuals.primaryColor};">${data.visuals.emblemIcon}</div>
        <div class="race-card-name" style="color:${isSelected ? data.visuals.primaryColor : 'var(--color-text)'}">${data.race.name}</div>
      </div>
    `;
  }

  private renderRaceDetail(data: FullRaceData): string {
    const traits = data.race.traits;
    const leader = data.leaders[0];

    return `
      <div class="race-detail-panel" style="border-color:${data.visuals.primaryColor}33;">
        <div class="race-detail-header">
          <div class="race-detail-emblem" style="color:${data.visuals.primaryColor};text-shadow:0 0 20px ${data.visuals.primaryColor}66;">${data.visuals.emblemIcon}</div>
          <div>
            <div class="race-detail-name" style="color:${data.visuals.primaryColor};">${data.race.name}</div>
            <div class="race-detail-leader">${leader.title}: ${leader.name}</div>
          </div>
        </div>

        <div class="race-detail-desc">${data.race.description}</div>

        <div class="race-detail-traits">
          <div class="race-detail-label">Racial Traits</div>
          <div class="race-trait-badges">
            ${traits.map(t => `
              <div class="race-trait-badge" title="${t.description}">
                <span class="race-trait-name">${t.name}</span>
                <span class="race-trait-desc">${t.description}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="race-detail-info-row">
          <div class="race-detail-info-item">
            <span class="race-detail-label">Homeworld</span>
            <span class="race-detail-value">${data.homeworldName}</span>
          </div>
          <div class="race-detail-info-item">
            <span class="race-detail-label">World Type</span>
            <span class="race-detail-value">${data.race.homeworld.replace('_', ' ')}</span>
          </div>
        </div>

        <div class="race-detail-playstyle">
          <span class="race-detail-label">Playstyle:</span>
          <span class="race-detail-playstyle-text">${data.playstyleHint}</span>
        </div>

        <div class="race-detail-lore">
          <div class="race-detail-label">History</div>
          <div class="race-detail-lore-text">${data.lore}</div>
        </div>
      </div>
    `;
  }

  private wireEvents(): void {
    if (!this.element) return;

    this.element.querySelector('#btn-back')?.addEventListener('click', () => {
      this.eventBus.emit('view:mainMenu', {});
    });

    this.element.querySelector('#btn-start')?.addEventListener('click', () => {
      const config = this.getConfig();
      this.eventBus.emit('game:newGame', { config });
    });

    this.element.querySelectorAll('.race-card').forEach(card => {
      card.addEventListener('click', () => {
        const raceId = (card as HTMLElement).dataset.raceId;
        if (raceId && raceId !== this.selectedRaceId) {
          this.selectedRaceId = raceId;
          this.render();
        }
      });
    });
  }

  private getConfig(): GameConfig {
    const name = (this.element?.querySelector('#setup-name') as HTMLInputElement)?.value || 'Commander';
    const size = (this.element?.querySelector('#setup-size') as HTMLSelectElement)?.value as GameConfig['galaxySize'];
    const shape = (this.element?.querySelector('#setup-shape') as HTMLSelectElement)?.value as GameConfig['galaxyShape'];
    const numPlayers = parseInt((this.element?.querySelector('#setup-players') as HTMLSelectElement)?.value || '4');
    const difficulty = (this.element?.querySelector('#setup-difficulty') as HTMLSelectElement)?.value as GameConfig['difficulty'];

    return {
      galaxySize: size || 'medium',
      galaxyShape: shape || 'spiral',
      numPlayers,
      difficulty: difficulty || 'normal',
      seed: Math.floor(Math.random() * 2147483647),
      playerRaceId: this.selectedRaceId,
      playerName: name,
    };
  }
}
