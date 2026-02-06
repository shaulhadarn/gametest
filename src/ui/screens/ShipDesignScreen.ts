import { EventBus } from '@/core/EventBus';
import { GameState } from '@/core/GameState';
import { ScreenComponent } from '@/ui/UIManager';
import { HullSize } from '@/models/types';
import { HULL_SIZES } from '@/core/Constants';

export class ShipDesignScreen implements ScreenComponent {
  private element: HTMLElement | null = null;
  private eventBus: EventBus;
  private state: GameState | null = null;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  show(container: HTMLElement): void {
    this.element = document.createElement('div');
    this.element.className = 'ship-design-screen fade-in';
    container.appendChild(this.element);
    this.render();
  }

  hide(): void {
    this.element?.remove();
    this.element = null;
  }

  update(state: GameState): void {
    this.state = state;
    if (this.element) this.render();
  }

  private render(): void {
    if (!this.element || !this.state) return;

    const player = this.state.players[this.state.currentPlayerId];
    if (!player) return;

    const designs = Object.values(this.state.shipDesigns).filter(
      d => d.playerId === player.id
    );

    this.element.innerHTML = `
      <div class="panel" style="grid-column:1/-1;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h2 style="font-family:var(--font-display);color:var(--color-text-bright);font-size:20px;">Ship Designs</h2>
          <button class="btn" id="btn-close-design">Close</button>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">Existing Designs</div>
        ${designs.length > 0 ? designs.map(d => `
          <div style="padding:8px;margin:4px 0;border:1px solid var(--color-border);border-radius:var(--border-radius);">
            <div style="color:var(--color-text-bright);font-weight:bold;">${d.name}</div>
            <div style="font-size:11px;color:var(--color-text-dim);">
              ${d.hullSize} | ATK: ${d.attack} DEF: ${d.defense} HP: ${d.hp} SPD: ${d.speed}
            </div>
            <div style="font-size:10px;color:var(--color-text-dim);">
              Space: ${d.usedSpace}/${d.totalSpace} | Cost: ${d.cost}
            </div>
          </div>
        `).join('') : '<div style="color:var(--color-text-dim)">No designs yet</div>'}
      </div>

      <div class="panel">
        <div class="panel-header">Hull Types</div>
        ${Object.entries(HULL_SIZES).map(([name, stats]) => `
          <div style="padding:6px;margin:4px 0;border:1px solid var(--color-border);border-radius:var(--border-radius);">
            <div style="color:var(--color-text-bright);">${name}</div>
            <div style="font-size:10px;color:var(--color-text-dim);">
              Space: ${stats.space} | HP: ${stats.hp} | Cost: ${stats.cost}
            </div>
          </div>
        `).join('')}
      </div>

      <div class="panel">
        <div class="panel-header">Quick Design</div>
        <div style="font-size:11px;color:var(--color-text-dim);margin-bottom:8px;">
          Ship design will be expanded in future updates. Default designs are available for building.
        </div>
      </div>
    `;

    this.element.querySelector('#btn-close-design')?.addEventListener('click', () => {
      this.eventBus.emit('view:galaxy', {});
    });
  }
}
