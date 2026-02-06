import { EventBus } from '@/core/EventBus';
import { GameState } from '@/core/GameState';
import { ScreenComponent } from '@/ui/UIManager';

export class ResourceBar implements ScreenComponent {
  private element: HTMLElement | null = null;
  private eventBus: EventBus;
  private state: GameState | null = null;
  private colonyDropdownOpen = false;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  show(container: HTMLElement): void {
    this.element = document.createElement('div');
    this.element.className = 'resource-bar';
    this.render();
    container.appendChild(this.element);

    // Close colony dropdown when clicking outside
    document.addEventListener('click', this.onDocumentClick);
  }

  hide(): void {
    document.removeEventListener('click', this.onDocumentClick);
    this.element?.remove();
    this.element = null;
  }

  private render(): void {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="resource-item">
        <span class="resource-icon" style="color: #ffd700">$</span>
        <span class="resource-value" id="res-credits">0</span>
        <span class="resource-label">Credits</span>
      </div>
      <div class="resource-item">
        <span class="resource-icon" style="color: #44aaff">&#9878;</span>
        <span class="resource-value" id="res-research">0</span>
        <span class="resource-label">Research</span>
      </div>
      <div class="resource-item resource-item-clickable" id="res-colonies-item" title="View colonies">
        <span class="resource-icon" style="color: #44cc66">&#9733;</span>
        <span class="resource-value" id="res-colonies">0</span>
        <span class="resource-label">Colonies &#9662;</span>
        <div class="colony-dropdown" id="colony-dropdown"></div>
      </div>
      <div class="resource-item">
        <span class="resource-icon" style="color: #aaaacc">&#9660;</span>
        <span class="resource-value" id="res-fleets">0</span>
        <span class="resource-label">Fleets</span>
      </div>
      <div style="flex: 1;"></div>
      <div class="resource-bar-actions">
        <button class="resource-bar-btn" id="btn-bar-home" title="Go to Home System (H)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </button>
        <button class="resource-bar-btn" id="btn-bar-save" title="Save Game">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
        </button>
        <button class="resource-bar-btn" id="btn-bar-load" title="Load Game">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            <line x1="12" y1="11" x2="12" y2="17"/>
            <polyline points="9 14 12 11 15 14"/>
          </svg>
        </button>
      </div>
      <div class="resource-item">
        <span class="resource-label">Turn</span>
        <span class="resource-value" id="res-turn">1</span>
      </div>
      <button class="resource-bar-settings" id="btn-bar-settings" title="Settings (Esc)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>
    `;

    this.wireEvents();
  }

  private wireEvents(): void {
    if (!this.element) return;

    this.element.querySelector('#btn-bar-settings')?.addEventListener('click', () => {
      this.eventBus.emit('view:settings', {});
    });

    this.element.querySelector('#btn-bar-home')?.addEventListener('click', () => {
      if (!this.state) return;
      const player = this.state.players[this.state.currentPlayerId];
      if (player?.homeStarId) {
        this.eventBus.emit('view:system', { starId: player.homeStarId });
      }
    });

    this.element.querySelector('#btn-bar-save')?.addEventListener('click', () => {
      this.eventBus.emit('game:saved', { slot: 'manual' });
    });

    this.element.querySelector('#btn-bar-load')?.addEventListener('click', () => {
      this.eventBus.emit('game:loaded', { slot: 'manual' });
    });

    this.element.querySelector('#res-colonies-item')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleColonyDropdown();
    });
  }

  private toggleColonyDropdown(): void {
    this.colonyDropdownOpen = !this.colonyDropdownOpen;
    this.updateColonyDropdown();
  }

  private updateColonyDropdown(): void {
    const dropdown = this.element?.querySelector('#colony-dropdown') as HTMLElement | null;
    if (!dropdown) return;

    if (!this.colonyDropdownOpen || !this.state) {
      dropdown.classList.remove('open');
      dropdown.innerHTML = '';
      return;
    }

    const player = this.state.players[this.state.currentPlayerId];
    if (!player) return;

    const colonies = player.colonyIds
      .map(id => this.state!.colonies[id])
      .filter(Boolean);

    if (colonies.length === 0) {
      dropdown.innerHTML = '<div class="colony-dropdown-empty">No colonies</div>';
    } else {
      dropdown.innerHTML = colonies.map(colony => {
        const planet = this.state!.planets[colony.planetId];
        const star = planet ? this.state!.stars[planet.starId] : null;
        const isHome = star?.id === player.homeStarId;
        return `
          <div class="colony-dropdown-item" data-colony-id="${colony.id}" data-star-id="${planet?.starId || ''}">
            <div class="colony-dropdown-name">
              ${isHome ? '<span class="colony-home-icon">&#8962;</span>' : ''}
              ${colony.name}
            </div>
            <div class="colony-dropdown-info">
              <span>Pop: ${Math.floor(colony.population)}</span>
              <span>${star?.name || ''}</span>
            </div>
          </div>
        `;
      }).join('');

      dropdown.querySelectorAll('.colony-dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const colonyId = (item as HTMLElement).dataset.colonyId!;
          this.colonyDropdownOpen = false;
          this.updateColonyDropdown();
          this.eventBus.emit('view:colony', { colonyId });
        });
      });
    }

    dropdown.classList.add('open');
  }

  private onDocumentClick = (): void => {
    if (this.colonyDropdownOpen) {
      this.colonyDropdownOpen = false;
      this.updateColonyDropdown();
    }
  };

  update(state: GameState): void {
    if (!this.element) return;
    this.state = state;
    const player = state.players[state.currentPlayerId];
    if (!player) return;

    const credits = this.element.querySelector('#res-credits');
    const research = this.element.querySelector('#res-research');
    const colonies = this.element.querySelector('#res-colonies');
    const fleets = this.element.querySelector('#res-fleets');
    const turn = this.element.querySelector('#res-turn');

    if (credits) credits.textContent = Math.floor(player.credits).toString();
    if (research) research.textContent = Math.floor(player.researchPool).toString();
    if (colonies) colonies.textContent = player.colonyIds.length.toString();
    if (fleets) fleets.textContent = player.fleetIds.length.toString();
    if (turn) turn.textContent = state.turn.toString();

    // Update dropdown if open
    if (this.colonyDropdownOpen) {
      this.updateColonyDropdown();
    }
  }
}
