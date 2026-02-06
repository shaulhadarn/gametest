// GalaxyMapUI.ts - Galaxy map star info panel overlay
// Updated: Added fog of war support - unexplored stars show "???" with exploration hint

import { EventBus } from '@/core/EventBus';
import { GameState } from '@/core/GameState';
import { Star } from '@/models/Star';
import { Planet } from '@/models/Planet';
import { ScreenComponent } from '@/ui/UIManager';

export class GalaxyMapUI implements ScreenComponent {
  private element: HTMLElement | null = null;
  private eventBus: EventBus;
  private state: GameState | null = null;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;

    this.eventBus.on('star:selected', ({ starId }) => {
      this.showStarInfo(starId);
    });

    this.eventBus.on('star:deselected', () => {
      this.hideStarInfo();
    });
  }

  show(container: HTMLElement): void {
    // Galaxy map UI is just the star info panel (resource bar & turn button are persistent)
    this.element = document.createElement('div');
    this.element.id = 'galaxy-map-ui';
    container.appendChild(this.element);
  }

  hide(): void {
    this.element?.remove();
    this.element = null;
  }

  update(state: GameState): void {
    this.state = state;
  }

  private showStarInfo(starId: string): void {
    if (!this.element || !this.state) return;

    const star = this.state.stars[starId];
    if (!star) return;

    // Check fog of war - is this star explored by the current player?
    const isExplored = star.explored[this.state.currentPlayerId] === true;

    // Remove old panel
    const old = this.element.querySelector('.star-info-panel');
    old?.remove();

    const panel = document.createElement('div');
    panel.className = 'star-info-panel panel slide-up';

    if (!isExplored) {
      // Unexplored star - show minimal info
      panel.innerHTML = `
        <div class="panel-header">Unknown System</div>
        <div class="star-name" style="opacity: 0.5;">???</div>
        <div style="color: var(--color-text-dim); font-size: 12px; margin-top: 8px;">
          This system has not been explored yet.<br/>
          Send a fleet to reveal its contents.
        </div>
      `;
      this.element.appendChild(panel);
      return;
    }

    const planets = star.planetIds
      .map(pid => this.state!.planets[pid])
      .filter(Boolean);

    panel.innerHTML = `
      <div class="panel-header">Star System</div>
      <div class="star-name">${star.name}</div>
      <div class="star-type">${star.type.replace('_', ' ')}</div>
      ${star.ownerId ? `<div style="margin-bottom: 8px; color: var(--color-accent);">Owner: ${this.state.players[star.ownerId]?.name || 'Unknown'}</div>` : ''}
      <div style="font-size: 11px; color: var(--color-text-dim); margin-bottom: 6px;">
        Planets (${planets.length})
      </div>
      <ul class="planet-list">
        ${planets.map(p => this.renderPlanetItem(p)).join('')}
      </ul>
      ${planets.length === 0 ? '<div style="color: var(--color-text-dim); font-size: 11px;">No planets in system</div>' : ''}
      <div style="margin-top: 12px;">
        <button class="btn" id="btn-view-system">View System</button>
      </div>
    `;

    this.element.appendChild(panel);

    // Wire up button
    const viewBtn = panel.querySelector('#btn-view-system');
    viewBtn?.addEventListener('click', () => {
      this.eventBus.emit('view:system', { starId });
    });

    // Wire up planet clicks - go to system view
    panel.querySelectorAll('.planet-item').forEach(item => {
      item.addEventListener('click', () => {
        this.eventBus.emit('view:system', { starId });
      });
    });
  }

  private renderPlanetItem(planet: Planet): string {
    const colonyInfo = planet.colonyId
      ? '<span style="color: var(--color-success);">&#9679; Colonized</span>'
      : planet.habitability > 0 && planet.type !== 'GAS_GIANT'
        ? '<span style="color: var(--color-text-dim); font-size: 10px;">Hab: ' + planet.habitability + '%</span>'
        : '<span style="color: var(--color-danger); font-size: 10px;">Uninhabitable</span>';

    return `
      <li class="planet-item" data-planet-id="${planet.id}">
        <div>
          <div>${planet.name}</div>
          <div class="planet-type">${planet.type.replace('_', ' ')} — Size ${planet.size}</div>
        </div>
        <div>${colonyInfo}</div>
      </li>
    `;
  }

  private hideStarInfo(): void {
    if (!this.element) return;
    const panel = this.element.querySelector('.star-info-panel');
    panel?.remove();
  }
}
