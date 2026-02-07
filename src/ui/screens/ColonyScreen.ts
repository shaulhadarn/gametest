// ColonyScreen.ts - Colony management screen with planet info, workers, buildings, and build queue
// Updated: Fixed sluggish build menu animation — replaced fade-in with GPU-accelerated scale+fade, added backdrop overlay

import { EventBus } from '@/core/EventBus';
import { GameState } from '@/core/GameState';
import { ScreenComponent } from '@/ui/UIManager';
import { Colony } from '@/models/Colony';
import { Planet } from '@/models/Planet';
import {
  BASE_POPULATION_GROWTH,
  BUILDING_MAINTENANCE_MULTIPLIER,
} from '@/core/Constants';

const PLANET_TYPE_COLORS: Record<string, { c1: string; c2: string; c3: string; ocean: boolean }> = {
  TERRAN: { c1: '#2266aa', c2: '#44aa44', c3: '#886633', ocean: true },
  OCEAN: { c1: '#1144cc', c2: '#2266dd', c3: '#113366', ocean: true },
  ARID: { c1: '#cc8844', c2: '#aa6622', c3: '#ddaa66', ocean: false },
  TUNDRA: { c1: '#aabbcc', c2: '#ddeeff', c3: '#667788', ocean: false },
  DESERT: { c1: '#ddaa55', c2: '#cc8833', c3: '#eebb77', ocean: false },
  JUNGLE: { c1: '#228833', c2: '#115522', c3: '#44aa55', ocean: true },
  VOLCANIC: { c1: '#aa3311', c2: '#ff6622', c3: '#331100', ocean: false },
  BARREN: { c1: '#666666', c2: '#888888', c3: '#444444', ocean: false },
  TOXIC: { c1: '#88aa22', c2: '#667711', c3: '#aacc44', ocean: false },
  GAS_GIANT: { c1: '#cc9955', c2: '#aa7733', c3: '#eebb88', ocean: false },
};

const SPECIAL_RESOURCE_LABELS: Record<string, { name: string; color: string; desc: string }> = {
  GOLD_DEPOSITS: { name: 'Gold Deposits', color: '#ffd700', desc: '+50% Credits' },
  GEM_DEPOSITS: { name: 'Gem Deposits', color: '#ff44ff', desc: '+100% Credits' },
  ANCIENT_ARTIFACTS: { name: 'Ancient Artifacts', color: '#44bbff', desc: '+3 Research' },
  NATIVE_LIFE: { name: 'Native Life', color: '#44cc66', desc: 'Unique species' },
  SPLINTER_COLONY: { name: 'Splinter Colony', color: '#ffaa33', desc: 'Ruins found' },
};

interface BuildingDef {
  name: string;
  cost: number;
  desc: string;
  effect: string;
  effectColor: string;
}

const BUILDING_INFO: Record<string, BuildingDef> = {
  factory: { name: 'Factory', cost: 60, desc: 'Industrial manufacturing plant for colony construction.', effect: '+5 Production', effectColor: '#ff8844' },
  farm: { name: 'Farm', cost: 40, desc: 'Agricultural facility to feed the colony population.', effect: '+3 Food', effectColor: '#44cc66' },
  lab: { name: 'Research Lab', cost: 80, desc: 'Scientific laboratory for advancing technology.', effect: '+3 Research', effectColor: '#4488ff' },
  market: { name: 'Marketplace', cost: 50, desc: 'Commercial hub for boosting colony trade revenue.', effect: '+5 Credits', effectColor: '#ffd700' },
  automated_factory: { name: 'Automated Factory', cost: 150, desc: 'Advanced robotic assembly lines that amplify production.', effect: '+30% Production', effectColor: '#ff8844' },
  hydroponic_farm: { name: 'Hydroponic Farm', cost: 120, desc: 'Soilless growing systems for maximum food efficiency.', effect: '+25% Food', effectColor: '#44cc66' },
  research_lab: { name: 'Advanced Lab', cost: 200, desc: 'Cutting-edge research complex with quantum computing.', effect: '+30% Research', effectColor: '#4488ff' },
  trade_hub: { name: 'Trade Hub', cost: 180, desc: 'Interstellar trading post attracting merchants.', effect: '+50% Credits', effectColor: '#ffd700' },
  planetary_shield: { name: 'Planetary Shield', cost: 300, desc: 'Energy barrier protecting colony from orbital bombardment.', effect: 'Bombardment Shield', effectColor: '#44bbff' },
  cloning_center: { name: 'Cloning Center', cost: 250, desc: 'Genetic replication facility accelerating population growth.', effect: '+50% Pop Growth', effectColor: '#cc66ff' },
};

export class ColonyScreen implements ScreenComponent {
  private element: HTMLElement | null = null;
  private eventBus: EventBus;
  private state: GameState | null = null;
  private colonyId: string | null = null;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;

    this.eventBus.on('view:colony', ({ colonyId }) => {
      this.colonyId = colonyId;
    });
  }

  show(container: HTMLElement): void {
    this.element = document.createElement('div');
    this.element.className = 'colony-screen fade-in';
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

    if (!this.colonyId) {
      const player = this.state.players[this.state.currentPlayerId];
      this.colonyId = player?.colonyIds[0] || null;
    }

    if (!this.colonyId) {
      this.element.innerHTML = '<div style="text-align:center;padding:40px;color:var(--color-text-dim)">No colonies</div>';
      return;
    }

    const colony = this.state.colonies[this.colonyId];
    if (!colony) return;

    const planet = this.state.planets[colony.planetId];
    const star = planet ? this.state.stars[planet.starId] : null;
    const player = this.state.players[this.state.currentPlayerId];
    const pop = Math.floor(colony.population);
    const popPercent = (colony.population / colony.maxPopulation * 100).toFixed(0);
    const maintenance = colony.buildings.length * BUILDING_MAINTENANCE_MULTIPLIER;
    const colonyIndex = player ? player.colonyIds.indexOf(this.colonyId) + 1 : 0;
    const colonyTotal = player ? player.colonyIds.length : 0;

    // Food surplus / growth calc
    const foodSurplus = colony.foodOutput - colony.population;
    let growthRate = 0;
    let turnsToMax = -1;
    if (foodSurplus > 0 && colony.population < colony.maxPopulation) {
      growthRate = BASE_POPULATION_GROWTH * (1 + foodSurplus / 10);
      if (colony.buildings.includes('cloning_center')) growthRate *= 1.5;
      const remaining = colony.maxPopulation - colony.population;
      turnsToMax = Math.ceil(remaining / growthRate);
    }

    // Colony net income
    const netIncome = colony.creditsOutput - maintenance;

    this.element.innerHTML = `
      <div class="colony-header">
        <div class="colony-header-left">
          <h2>${colony.name}</h2>
          <div class="colony-header-sub">
            <span class="colony-morale-badge ${this.getMoraleClass(colony.morale)}">Morale: ${colony.morale}%</span>
            <span class="colony-index-badge">${colonyIndex} of ${colonyTotal}</span>
            ${star ? `<button class="btn colony-system-btn" id="btn-view-system" title="View Star System">${star.name} &#8594;</button>` : ''}
          </div>
        </div>
        <div class="colony-header-right">
          <button class="btn" id="btn-prev-colony">&lt; Prev</button>
          <button class="btn" id="btn-next-colony">Next &gt;</button>
          <button class="btn" id="btn-close-colony" style="margin-left:16px">Close</button>
        </div>
      </div>

      <div class="colony-grid">
        <div class="colony-sidebar-left">
          <div class="panel">
            <div class="panel-header">Planet</div>
            <div class="colony-planet-preview-wrap">
              <canvas class="planet-preview-canvas" id="colony-planet-preview" width="120" height="120"></canvas>
            </div>
            <div class="colony-planet-name">${planet?.name || 'Unknown'}</div>
            <div class="colony-planet-type">${planet?.type.replace('_', ' ') || '?'}</div>
            ${planet && planet.moonCount > 0 ? `<div class="colony-planet-moons">Moons: ${planet.moonCount}</div>` : ''}
            ${this.renderSpecialResource(planet)}
            <div class="colony-planet-stats">
              <div class="colony-planet-stat">
                <span>Size</span>
                <span>${this.getSizeLabel(planet?.size || 0)}</span>
              </div>
              <div class="colony-planet-stat">
                <span>Minerals</span>
                <span>${this.renderStars(planet?.minerals || 0)}</span>
              </div>
              <div class="colony-planet-stat">
                <span>Habitability</span>
                <span style="color:${this.getHabColor(planet?.habitability || 0)}">${planet?.habitability || 0}%</span>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-header">Population</div>
            <div class="colony-pop-bar-row">
              <div class="stat-bar stat-bar-wide">
                <div class="stat-bar-fill" style="width:${popPercent}%;background:var(--color-accent);"></div>
              </div>
              <span class="colony-pop-count">${pop} / ${colony.maxPopulation}</span>
            </div>
            <div class="colony-growth-info">
              ${this.renderGrowthInfo(foodSurplus, growthRate, turnsToMax, colony)}
            </div>
          </div>

          <div class="panel">
            <div class="panel-header">Economy</div>
            <div class="colony-economy-grid">
              <span>Income</span>
              <span class="colony-econ-value" style="color:#44cc66">+${colony.creditsOutput.toFixed(1)}</span>
              <span>Maintenance</span>
              <span class="colony-econ-value" style="color:#ff4444">-${maintenance.toFixed(1)}</span>
              <span>Net</span>
              <span class="colony-econ-value" style="color:${netIncome >= 0 ? '#44cc66' : '#ff4444'}">${netIncome >= 0 ? '+' : ''}${netIncome.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div class="colony-center">
          <div class="panel">
            <div class="panel-header">Worker Allocation</div>
            <div class="worker-allocation">
              <div class="worker-row">
                <label class="worker-label worker-label-food">Farmers</label>
                <input type="range" id="slider-farmers" min="0" max="${pop}" value="${colony.farmers}" />
                <span class="worker-count" id="count-farmers">${colony.farmers}</span>
              </div>
              <div class="worker-row">
                <label class="worker-label worker-label-prod">Workers</label>
                <input type="range" id="slider-workers" min="0" max="${pop}" value="${colony.workers}" />
                <span class="worker-count" id="count-workers">${colony.workers}</span>
              </div>
              <div class="worker-row">
                <label class="worker-label worker-label-research">Scientists</label>
                <input type="range" id="slider-scientists" min="0" max="${pop}" value="${colony.scientists}" />
                <span class="worker-count" id="count-scientists">${colony.scientists}</span>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-header">Output</div>
            <div class="output-grid">
              <div class="output-row">
                <span class="output-icon output-food">F</span>
                <span class="output-label">Food</span>
                <div class="stat-bar stat-bar-wide">
                  <div class="stat-bar-fill" style="width:${Math.min(100, colony.foodOutput * 5)}%;background:#44cc66;"></div>
                </div>
                <span class="output-value">${colony.foodOutput.toFixed(1)}</span>
              </div>
              <div class="output-row">
                <span class="output-icon output-prod">P</span>
                <span class="output-label">Production</span>
                <div class="stat-bar stat-bar-wide">
                  <div class="stat-bar-fill" style="width:${Math.min(100, colony.productionOutput * 5)}%;background:#ff8844;"></div>
                </div>
                <span class="output-value">${colony.productionOutput.toFixed(1)}</span>
              </div>
              <div class="output-row">
                <span class="output-icon output-research">R</span>
                <span class="output-label">Research</span>
                <div class="stat-bar stat-bar-wide">
                  <div class="stat-bar-fill" style="width:${Math.min(100, colony.researchOutput * 5)}%;background:#4488ff;"></div>
                </div>
                <span class="output-value">${colony.researchOutput.toFixed(1)}</span>
              </div>
              <div class="output-row">
                <span class="output-icon output-credits">C</span>
                <span class="output-label">Credits</span>
                <div class="stat-bar stat-bar-wide">
                  <div class="stat-bar-fill" style="width:${Math.min(100, colony.creditsOutput * 5)}%;background:#ffd700;"></div>
                </div>
                <span class="output-value">${colony.creditsOutput.toFixed(1)}</span>
              </div>
            </div>
            ${this.renderFoodBalance(foodSurplus)}
          </div>
        </div>

        <div class="colony-sidebar-right">
          <div class="panel">
            <div class="panel-header">Buildings (${colony.buildings.length})</div>
            <div class="building-list">
              ${colony.buildings.length > 0
                ? colony.buildings.map(b => this.renderBuildingCard(b)).join('')
                : '<div style="color:var(--color-text-dim);padding:8px;">No buildings constructed</div>'
              }
            </div>
            ${maintenance > 0 ? `
              <div class="building-maintenance">
                Maintenance: <span class="building-maintenance-cost">${maintenance} credits/turn</span>
              </div>
            ` : ''}
          </div>

          <div class="panel">
            <div class="panel-header">Build Queue${colony.buildQueue.length > 0 ? ` (${this.getTotalQueueTurns(colony)})` : ''}</div>
            <div class="build-queue">
              ${colony.buildQueue.length > 0
                ? colony.buildQueue.map((item, i) => this.renderQueueItem(item, i, colony, i === 0)).join('')
                : '<div style="color:var(--color-text-dim);padding:8px;">Queue empty</div>'
              }
            </div>
            <div class="colony-build-actions">
              <button class="btn btn-primary" id="btn-add-building">Add Building</button>
              <button class="btn" id="btn-add-ship">Build Ship</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Draw planet preview
    if (planet) {
      this.drawPlanetPreview(planet);
    }

    this.wireEvents(colony, planet);
  }

  private wireEvents(colony: Colony, planet: Planet | undefined): void {
    if (!this.element) return;

    this.element.querySelector('#btn-close-colony')?.addEventListener('click', () => {
      this.eventBus.emit('view:galaxy', {});
    });

    this.element.querySelector('#btn-prev-colony')?.addEventListener('click', () => {
      this.cycleColony(-1);
    });

    this.element.querySelector('#btn-next-colony')?.addEventListener('click', () => {
      this.cycleColony(1);
    });

    // View system button
    this.element.querySelector('#btn-view-system')?.addEventListener('click', () => {
      if (planet?.starId) {
        this.eventBus.emit('view:system', { starId: planet.starId });
      }
    });

    // Worker sliders
    const setupSlider = (id: string, field: 'farmers' | 'workers' | 'scientists') => {
      const slider = this.element?.querySelector(`#slider-${id}`) as HTMLInputElement;
      if (!slider) return;
      slider.addEventListener('input', () => {
        const val = parseInt(slider.value);
        this.updateWorkers(colony, field, val);
        this.render();
      });
    };
    setupSlider('farmers', 'farmers');
    setupSlider('workers', 'workers');
    setupSlider('scientists', 'scientists');

    // Build queue remove buttons
    this.element.querySelectorAll('.build-queue-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.queueIdx || '0');
        colony.buildQueue.splice(idx, 1);
        this.render();
      });
    });

    // Build queue move up/down
    this.element.querySelectorAll('.build-queue-up').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.queueIdx || '0');
        if (idx > 0) {
          [colony.buildQueue[idx - 1], colony.buildQueue[idx]] =
            [colony.buildQueue[idx], colony.buildQueue[idx - 1]];
          this.render();
        }
      });
    });

    this.element.querySelectorAll('.build-queue-down').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.queueIdx || '0');
        if (idx < colony.buildQueue.length - 1) {
          [colony.buildQueue[idx], colony.buildQueue[idx + 1]] =
            [colony.buildQueue[idx + 1], colony.buildQueue[idx]];
          this.render();
        }
      });
    });

    // Rush build buttons
    this.element.querySelectorAll('.build-queue-rush').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.queueIdx || '0');
        const item = colony.buildQueue[idx];
        if (!item || !this.state) return;
        const player = this.state.players[this.state.currentPlayerId];
        if (!player) return;
        const remaining = item.cost - item.progress;
        const rushCost = Math.ceil(remaining * 2);
        if (player.credits < rushCost) return;
        player.credits -= rushCost;
        item.progress = item.cost;
        this.render();
      });
    });

    // Add building button
    this.element.querySelector('#btn-add-building')?.addEventListener('click', () => {
      this.showBuildMenu(colony);
    });

    // Add ship button
    this.element.querySelector('#btn-add-ship')?.addEventListener('click', () => {
      this.showShipBuildMenu(colony);
    });
  }

  private renderSpecialResource(planet: Planet | undefined): string {
    if (!planet || !planet.specialResource || planet.specialResource === 'NONE') return '';
    const info = SPECIAL_RESOURCE_LABELS[planet.specialResource];
    if (!info) return '';
    return `
      <div class="colony-special-resource" style="border-color:${info.color}40">
        <span class="colony-special-icon" style="color:${info.color}">&#9830;</span>
        <div class="colony-special-text">
          <span class="colony-special-name" style="color:${info.color}">${info.name}</span>
          <span class="colony-special-desc">${info.desc}</span>
        </div>
      </div>
    `;
  }

  private renderGrowthInfo(foodSurplus: number, growthRate: number, turnsToMax: number, colony: Colony): string {
    if (colony.population >= colony.maxPopulation) {
      return '<div class="colony-growth-line colony-growth-max">Population at maximum</div>';
    }

    if (foodSurplus > 0) {
      return `
        <div class="colony-growth-line colony-growth-positive">
          +${growthRate.toFixed(3)}/turn
          ${turnsToMax > 0 ? `<span class="colony-growth-eta">(max in ~${turnsToMax} turns)</span>` : ''}
        </div>
      `;
    }

    if (foodSurplus < -1) {
      return `
        <div class="colony-growth-line colony-growth-negative">
          Starving! Food deficit: ${foodSurplus.toFixed(1)}
        </div>
      `;
    }

    return '<div class="colony-growth-line colony-growth-stagnant">Growth stagnant (need food surplus)</div>';
  }

  private renderFoodBalance(foodSurplus: number): string {
    const isPositive = foodSurplus >= 0;
    const color = isPositive ? '#44cc66' : '#ff4444';
    const label = isPositive ? 'Surplus' : 'Deficit';
    return `
      <div class="colony-food-balance" style="border-color:${color}40">
        <span class="colony-food-balance-label">Food ${label}</span>
        <span class="colony-food-balance-value" style="color:${color}">${isPositive ? '+' : ''}${foodSurplus.toFixed(1)}</span>
      </div>
    `;
  }

  private getTotalQueueTurns(colony: Colony): string {
    if (colony.productionOutput <= 0) return 'stalled';
    let totalCost = 0;
    for (const item of colony.buildQueue) {
      totalCost += item.cost - item.progress;
    }
    const turns = Math.ceil(totalCost / colony.productionOutput);
    return `~${turns} turns`;
  }

  private renderBuildingCard(buildingId: string): string {
    const info = BUILDING_INFO[buildingId];
    if (!info) {
      return `<div class="building-card"><div class="building-card-name">${buildingId.replace(/_/g, ' ')}</div></div>`;
    }
    return `
      <div class="building-card building-card-built">
        <div class="building-card-header">
          <span class="building-card-name">${info.name}</span>
          <span class="building-effect-badge" style="color:${info.effectColor}">${info.effect}</span>
        </div>
        <div class="building-card-desc">${info.desc}</div>
      </div>
    `;
  }

  private renderQueueItem(item: { name: string; progress: number; cost: number; referenceId: string; type: string }, index: number, colony: Colony, isFirst: boolean): string {
    const info = BUILDING_INFO[item.referenceId];
    const progressPct = (item.progress / item.cost * 100).toFixed(0);
    const remaining = item.cost - item.progress;
    const prodPerTurn = colony.productionOutput;
    const turnsLeft = prodPerTurn > 0 ? Math.ceil(remaining / prodPerTurn) : -1;
    const turnsStr = isFirst
      ? (turnsLeft > 0 ? `${turnsLeft} turn${turnsLeft > 1 ? 's' : ''}` : (turnsLeft === 0 ? 'Done!' : 'Stalled'))
      : 'Queued';
    const isShip = item.type === 'ship';
    const queueLen = colony.buildQueue.length;

    // Rush cost: 2 credits per remaining production
    const rushCost = Math.ceil(remaining * 2);
    const player = this.state?.players[this.state.currentPlayerId];
    const canRush = player && player.credits >= rushCost && remaining > 0;

    return `
      <div class="build-queue-item">
        <div class="build-queue-item-info">
          <div class="build-queue-item-header">
            <span class="build-queue-item-name">${isShip ? '\u{1F680} ' : ''}${item.name}</span>
            <span class="build-queue-turns ${turnsLeft <= 0 && isFirst ? 'build-queue-stalled' : ''}">${turnsStr}</span>
          </div>
          ${info ? `<span class="build-queue-effect" style="color:${info.effectColor}">${info.effect}</span>` : ''}
          ${isShip ? `<span class="build-queue-effect" style="color:#aaddff">Ship</span>` : ''}
          <div class="build-progress">
            <div class="build-progress-fill" style="width:${progressPct}%"></div>
          </div>
          <div class="build-queue-item-cost">${Math.floor(item.progress)} / ${item.cost} production</div>
          <button class="btn build-queue-rush ${canRush ? '' : 'btn-disabled'}" data-queue-idx="${index}" ${canRush ? '' : 'disabled'}>Buy ${rushCost} cr</button>
        </div>
        <div class="build-queue-item-controls">
          ${index > 0 ? `<button class="btn build-queue-up" data-queue-idx="${index}" title="Move up">&#9650;</button>` : ''}
          ${index < queueLen - 1 ? `<button class="btn build-queue-down" data-queue-idx="${index}" title="Move down">&#9660;</button>` : ''}
          <button class="btn btn-danger build-queue-remove" data-queue-idx="${index}" title="Remove">&#10005;</button>
        </div>
      </div>
    `;
  }

  private drawPlanetPreview(planet: Planet): void {
    const canvas = this.element?.querySelector('#colony-planet-preview') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = 60, cy = 60, r = 50;
    const colors = PLANET_TYPE_COLORS[planet.type] || PLANET_TYPE_COLORS.BARREN;

    ctx.clearRect(0, 0, 120, 120);

    const grad = ctx.createRadialGradient(cx - 15, cy - 15, 0, cx, cy, r);
    grad.addColorStop(0, colors.c2);
    grad.addColorStop(0.5, colors.c1);
    grad.addColorStop(1, this.darken(colors.c1, 0.3));

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Terrain bands
    const seed = this.hashString(planet.id);
    ctx.globalCompositeOperation = 'overlay';
    for (let i = 0; i < 8; i++) {
      const bandY = cy - r + ((seed * (i + 1) * 137.5) % (r * 2));
      const bandH = 4 + (seed * (i + 3) * 17.3 % 8);
      ctx.beginPath();
      ctx.ellipse(cx, bandY, r * 0.9, bandH, 0, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? colors.c3 : colors.c2;
      ctx.globalAlpha = 0.15;
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';

    if (colors.ocean) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      const oceanGrad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
      oceanGrad.addColorStop(0, 'rgba(100, 180, 255, 0.15)');
      oceanGrad.addColorStop(0.5, 'rgba(100, 180, 255, 0.05)');
      oceanGrad.addColorStop(1, 'rgba(100, 180, 255, 0.15)');
      ctx.fillStyle = oceanGrad;
      ctx.fill();
    }

    const shadowGrad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
    shadowGrad.addColorStop(0.6, 'rgba(0,0,0,0)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = shadowGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
    const rimGrad = ctx.createRadialGradient(cx, cy, r - 2, cx, cy, r + 6);
    rimGrad.addColorStop(0, 'rgba(100, 160, 255, 0)');
    rimGrad.addColorStop(0.5, `rgba(100, 160, 255, ${planet.habitability > 20 ? 0.2 : 0.05})`);
    rimGrad.addColorStop(1, 'rgba(100, 160, 255, 0)');
    ctx.fillStyle = rimGrad;
    ctx.fill();

    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  private updateWorkers(colony: Colony, field: string, value: number): void {
    const pop = Math.floor(colony.population);

    if (field === 'farmers') {
      colony.farmers = Math.min(value, pop);
      colony.workers = Math.min(colony.workers, pop - colony.farmers);
      colony.scientists = pop - colony.farmers - colony.workers;
    } else if (field === 'workers') {
      colony.workers = Math.min(value, pop - colony.farmers);
      colony.scientists = pop - colony.farmers - colony.workers;
    } else {
      colony.scientists = Math.min(value, pop - colony.farmers);
      colony.workers = pop - colony.farmers - colony.scientists;
    }

    colony.scientists = Math.max(0, colony.scientists);
    colony.workers = Math.max(0, colony.workers);
  }

  private cycleColony(dir: number): void {
    if (!this.state) return;
    const player = this.state.players[this.state.currentPlayerId];
    if (!player || player.colonyIds.length === 0) return;

    const idx = player.colonyIds.indexOf(this.colonyId || '');
    const newIdx = (idx + dir + player.colonyIds.length) % player.colonyIds.length;
    this.colonyId = player.colonyIds[newIdx];
    this.render();
  }

  private showBuildMenu(colony: Colony): void {
    const builtSet = new Set(colony.buildings);
    const queuedSet = new Set(colony.buildQueue.map(q => q.referenceId));
    const available = Object.entries(BUILDING_INFO)
      .filter(([id]) => !builtSet.has(id) && !queuedSet.has(id));

    const prodPerTurn = colony.productionOutput;

    const backdrop = document.createElement('div');
    backdrop.className = 'build-menu-backdrop';

    const menu = document.createElement('div');
    menu.className = 'panel build-menu-overlay';
    menu.innerHTML = `
      <div class="panel-header">Select Building</div>
      <div class="build-menu-list">
        ${available.map(([id, info]) => {
          const estTurns = prodPerTurn > 0 ? Math.ceil(info.cost / prodPerTurn) : -1;
          const turnsStr = estTurns > 0 ? `~${estTurns} turns` : 'No production';
          return `
            <div class="building-card building-card-selectable" data-build-id="${id}" data-build-cost="${info.cost}">
              <div class="building-card-header">
                <span class="building-card-name">${info.name}</span>
                <span class="building-effect-badge" style="color:${info.effectColor}">${info.effect}</span>
              </div>
              <div class="building-card-desc">${info.desc}</div>
              <div class="building-card-footer">
                <span class="building-card-cost">${info.cost} production</span>
                <span class="building-card-est">${turnsStr}</span>
              </div>
            </div>
          `;
        }).join('')}
        ${available.length === 0 ? '<div style="color:var(--color-text-dim);padding:8px;">All buildings constructed or queued</div>' : ''}
      </div>
      <button class="btn" id="btn-cancel-build" style="width:100%;margin-top:8px;">Cancel</button>
    `;

    const closeBuildMenu = () => {
      backdrop.remove();
      menu.remove();
    };

    this.element?.appendChild(backdrop);
    this.element?.appendChild(menu);

    backdrop.addEventListener('click', closeBuildMenu);

    menu.querySelectorAll('.building-card-selectable').forEach(card => {
      card.addEventListener('click', () => {
        const el = card as HTMLElement;
        const id = el.dataset.buildId!;
        const cost = parseInt(el.dataset.buildCost!);
        const info = BUILDING_INFO[id];
        colony.buildQueue.push({
          id: `build_${Date.now().toString(36)}`,
          name: info?.name || id,
          type: 'building',
          referenceId: id,
          cost,
          progress: 0,
        });
        closeBuildMenu();
        this.render();
      });
    });

    menu.querySelector('#btn-cancel-build')?.addEventListener('click', closeBuildMenu);
  }

  private showShipBuildMenu(colony: Colony): void {
    if (!this.state) return;
    const player = this.state.players[this.state.currentPlayerId];
    if (!player) return;

    const designs = Object.values(this.state.shipDesigns)
      .filter(d => d.playerId === player.id);

    const prodPerTurn = colony.productionOutput;

    const backdrop = document.createElement('div');
    backdrop.className = 'build-menu-backdrop';

    const menu = document.createElement('div');
    menu.className = 'panel build-menu-overlay';
    menu.innerHTML = `
      <div class="panel-header">Build Ship</div>
      <div class="build-menu-list">
        ${designs.map(design => {
          const estTurns = prodPerTurn > 0 ? Math.ceil(design.cost / prodPerTurn) : -1;
          const turnsStr = estTurns > 0 ? `~${estTurns} turns` : 'No production';
          return `
            <div class="building-card building-card-selectable" data-design-id="${design.id}" data-design-cost="${design.cost}">
              <div class="building-card-header">
                <span class="building-card-name">${design.name}</span>
                <span class="building-effect-badge" style="color:#aaddff">${design.hullSize}</span>
              </div>
              <div class="colony-ship-stats">
                <span class="colony-ship-stat">ATK ${design.attack}</span>
                <span class="colony-ship-stat">DEF ${design.defense}</span>
                <span class="colony-ship-stat">HP ${design.hp}</span>
                <span class="colony-ship-stat">SPD ${design.speed}</span>
              </div>
              <div class="building-card-footer">
                <span class="building-card-cost">${design.cost} production</span>
                <span class="building-card-est">${turnsStr}</span>
              </div>
            </div>
          `;
        }).join('')}
        ${designs.length === 0 ? '<div style="color:var(--color-text-dim);padding:8px;">No ship designs available. Create designs in the Ship Designer.</div>' : ''}
      </div>
      <button class="btn" id="btn-cancel-build" style="width:100%;margin-top:8px;">Cancel</button>
    `;

    const closeBuildMenu = () => {
      backdrop.remove();
      menu.remove();
    };

    this.element?.appendChild(backdrop);
    this.element?.appendChild(menu);

    backdrop.addEventListener('click', closeBuildMenu);

    menu.querySelectorAll('.building-card-selectable').forEach(card => {
      card.addEventListener('click', () => {
        const el = card as HTMLElement;
        const designId = el.dataset.designId!;
        const cost = parseInt(el.dataset.designCost!);
        const design = this.state!.shipDesigns[designId];
        colony.buildQueue.push({
          id: `build_${Date.now().toString(36)}`,
          name: design?.name || 'Ship',
          type: 'ship',
          referenceId: designId,
          cost,
          progress: 0,
        });
        closeBuildMenu();
        this.render();
      });
    });

    menu.querySelector('#btn-cancel-build')?.addEventListener('click', closeBuildMenu);
  }

  private renderStars(minerals: number): string {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += `<span style="color:${i <= minerals ? 'var(--color-gold)' : 'var(--color-text-dim)'}">\u2605</span>`;
    }
    return stars;
  }

  private getSizeLabel(size: number): string {
    const labels = ['', 'Tiny', 'Small', 'Medium', 'Large', 'Huge'];
    return labels[size] || `${size}`;
  }

  private getMoraleClass(morale: number): string {
    if (morale >= 70) return 'morale-high';
    if (morale >= 40) return 'morale-mid';
    return 'morale-low';
  }

  private getHabColor(hab: number): string {
    if (hab >= 60) return '#44cc66';
    if (hab >= 30) return '#ffaa33';
    return '#ff4444';
  }

  private darken(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, ((num >> 16) & 0xff) * (1 - amount));
    const g = Math.max(0, ((num >> 8) & 0xff) * (1 - amount));
    const b = Math.max(0, (num & 0xff) * (1 - amount));
    return `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash) / 2147483647;
  }
}
