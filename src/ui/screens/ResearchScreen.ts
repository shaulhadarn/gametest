import { EventBus } from '@/core/EventBus';
import { GameState } from '@/core/GameState';
import { ScreenComponent } from '@/ui/UIManager';
import { TechCategory } from '@/models/types';
import { Technology } from '@/models/Technology';

export class ResearchScreen implements ScreenComponent {
  private element: HTMLElement | null = null;
  private eventBus: EventBus;
  private state: GameState | null = null;
  private activeCategory: TechCategory = TechCategory.CONSTRUCTION;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  show(container: HTMLElement): void {
    this.element = document.createElement('div');
    this.element.className = 'research-screen fade-in';
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

    const categories = Object.values(TechCategory);
    const techs = Object.values(this.state.technologies).filter(
      t => t.category === this.activeCategory
    ).sort((a, b) => a.level - b.level);

    const currentResearch = player.currentResearchId
      ? this.state.technologies[player.currentResearchId]
      : null;

    this.element.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h2 style="font-family:var(--font-display);color:var(--color-text-bright);font-size:20px;">Research</h2>
        <button class="btn" id="btn-close-research">Close</button>
      </div>

      ${currentResearch ? `
        <div class="panel" style="margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <span style="color:var(--color-warning)">Researching:</span>
              <span style="color:var(--color-text-bright)">${currentResearch.name}</span>
            </div>
            <div style="color:var(--color-text-dim)">
              ${Math.floor(player.researchPool)} / ${currentResearch.researchCost} RP
            </div>
          </div>
          <div class="build-progress" style="margin-top:8px;">
            <div class="build-progress-fill" style="width:${(player.researchPool / currentResearch.researchCost * 100).toFixed(0)}%"></div>
          </div>
        </div>
      ` : `
        <div class="panel" style="margin-bottom:16px;color:var(--color-warning);">
          No research selected — choose a technology below
        </div>
      `}

      <div class="tech-categories">
        ${categories.map(cat => `
          <button class="btn tech-category-btn ${cat === this.activeCategory ? 'active' : ''}"
                  data-category="${cat}">
            ${cat.replace('_', ' ')}
          </button>
        `).join('')}
      </div>

      <div class="tech-grid">
        ${techs.map(tech => this.renderTechCard(tech, player)).join('')}
      </div>
    `;

    // Wire events
    this.element.querySelector('#btn-close-research')?.addEventListener('click', () => {
      this.eventBus.emit('view:galaxy', {});
    });

    this.element.querySelectorAll('.tech-category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeCategory = (btn as HTMLElement).dataset.category as TechCategory;
        this.render();
      });
    });

    this.element.querySelectorAll('.tech-card:not(.researched):not(.locked)').forEach(card => {
      card.addEventListener('click', () => {
        const techId = (card as HTMLElement).dataset.techId;
        if (techId && this.state) {
          const p = this.state.players[this.state.currentPlayerId];
          if (p) {
            p.currentResearchId = techId;
            p.researchPool = 0;
            this.render();
          }
        }
      });
    });
  }

  private renderTechCard(tech: Technology, player: any): string {
    const isResearched = player.knownTechIds.includes(tech.id);
    const isResearching = player.currentResearchId === tech.id;
    const prereqsMet = tech.prerequisiteIds.every((pid: string) => player.knownTechIds.includes(pid));
    const isLocked = !isResearched && !prereqsMet;

    let stateClass = '';
    if (isResearched) stateClass = 'researched';
    else if (isResearching) stateClass = 'researching';
    else if (isLocked) stateClass = 'locked';

    return `
      <div class="tech-card ${stateClass}" data-tech-id="${tech.id}">
        <div class="tech-name">${tech.name}</div>
        <div style="font-size:11px;color:var(--color-text-dim);margin-bottom:4px;">${tech.description}</div>
        <div class="tech-cost">
          ${isResearched ? '✓ Researched' : isResearching ? '⟳ In Progress' : `${tech.researchCost} RP`}
        </div>
        <div style="font-size:10px;color:var(--color-text-dim);margin-top:4px;">Level ${tech.level}</div>
      </div>
    `;
  }
}
