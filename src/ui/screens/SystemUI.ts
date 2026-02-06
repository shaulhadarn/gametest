import { EventBus } from '@/core/EventBus';
import { GameState } from '@/core/GameState';
import { Planet } from '@/models/Planet';
import { Colony } from '@/models/Colony';
import { ScreenComponent } from '@/ui/UIManager';

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

const PLANET_TYPE_DESCRIPTIONS: Record<string, string> = {
  TERRAN: 'A temperate world with diverse biomes and abundant water.',
  OCEAN: 'A water world with vast oceans spanning the entire surface.',
  ARID: 'A dry world with sparse vegetation and limited water.',
  TUNDRA: 'A frozen world with icy plains and harsh conditions.',
  DESERT: 'A scorching world of endless sand dunes and heat.',
  JUNGLE: 'A lush world covered in dense tropical vegetation.',
  VOLCANIC: 'A hellish world of lava flows and seismic activity.',
  BARREN: 'A lifeless rock with no atmosphere or resources.',
  TOXIC: 'A poisonous world with corrosive atmosphere.',
  GAS_GIANT: 'A massive gas world — unsuitable for colonization.',
};

export class SystemUI implements ScreenComponent {
  private element: HTMLElement | null = null;
  private eventBus: EventBus;
  private state: GameState | null = null;
  private currentStarId: string | null = null;
  private previewAnimId: number | null = null;
  private previewTime = 0;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;

    this.eventBus.on('planet:selected', ({ planetId }) => {
      this.showPlanetDetail(planetId);
    });

    this.eventBus.on('planet:deselected', () => {
      this.hidePlanetDetail();
    });
  }

  setStarId(starId: string): void {
    this.currentStarId = starId;
  }

  show(container: HTMLElement): void {
    this.element = document.createElement('div');
    this.element.id = 'system-ui';
    this.element.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
    this.element.innerHTML = `
      <div class="system-nav">
        <button class="btn" id="btn-back-galaxy">Back to Galaxy</button>
        <span class="system-title" id="system-title"></span>
      </div>
    `;
    container.appendChild(this.element);

    this.element.querySelector('#btn-back-galaxy')?.addEventListener('click', () => {
      this.eventBus.emit('view:galaxy', {});
    });

    this.updateTitle();
  }

  hide(): void {
    this.stopPreviewAnimation();
    this.element?.remove();
    this.element = null;
  }

  update(state: GameState): void {
    this.state = state;
    this.updateTitle();
  }

  private updateTitle(): void {
    if (!this.element || !this.state || !this.currentStarId) return;
    const star = this.state.stars[this.currentStarId];
    if (star) {
      const titleEl = this.element.querySelector('#system-title');
      if (titleEl) titleEl.textContent = `${star.name} System`;
    }
  }

  private showPlanetDetail(planetId: string): void {
    if (!this.element || !this.state) return;

    const planet = this.state.planets[planetId];
    if (!planet) return;

    this.hidePlanetDetail();

    const colony = planet.colonyId ? this.state.colonies[planet.colonyId] : null;
    const currentPlayerId = this.state.currentPlayerId;
    const canColonize = !planet.colonyId && planet.habitability > 0 && planet.type !== 'GAS_GIANT';
    const isOwnColony = colony && colony.playerId === currentPlayerId;
    const typeDesc = PLANET_TYPE_DESCRIPTIONS[planet.type] || '';

    const panel = document.createElement('div');
    panel.className = 'planet-detail-panel panel slide-up';
    panel.innerHTML = `
      <div class="planet-detail-header">
        <div class="planet-preview-wrapper">
          <canvas class="planet-preview-canvas" id="planet-preview" width="120" height="120"></canvas>
        </div>
        <div class="planet-detail-title">
          <div class="planet-detail-name">${planet.name}</div>
          <div class="planet-detail-type">${planet.type.replace('_', ' ')}</div>
          ${planet.moonCount > 0 ? `
            <div class="moon-dots">
              <span class="moon-dots-label">Moons: ${planet.moonCount}</span>
              <span class="moon-dots-icons">${this.renderMoonDots(planet.moonCount)}</span>
            </div>
          ` : ''}
        </div>
      </div>
      <div class="planet-detail-desc">${typeDesc}</div>
      <div class="planet-detail-stats">
        <div class="planet-stat">
          <span class="planet-stat-label">Size</span>
          <div class="stat-bar">
            <div class="stat-bar-fill" style="width:${planet.size * 20}%;background:var(--color-accent);"></div>
          </div>
          <span class="planet-stat-value">${this.getSizeLabel(planet.size)}</span>
        </div>
        <div class="planet-stat">
          <span class="planet-stat-label">Minerals</span>
          <div class="planet-stat-stars">${this.renderStars(planet.minerals)}</div>
        </div>
        <div class="planet-stat">
          <span class="planet-stat-label">Habitability</span>
          <div class="stat-bar">
            <div class="stat-bar-fill" style="width:${planet.habitability}%;background:${this.getHabitColor(planet.habitability)};"></div>
          </div>
          <span class="planet-stat-value ${this.getHabitClass(planet.habitability)}">${planet.habitability}%</span>
        </div>
        ${planet.specialResource !== 'NONE' ? `
          <div class="planet-stat">
            <span class="planet-stat-label">Special</span>
            <span class="planet-stat-value special">${this.getSpecialIcon(planet.specialResource)} ${planet.specialResource.replace(/_/g, ' ')}</span>
          </div>
        ` : ''}
      </div>
      ${colony ? this.renderColonyInfo(colony, isOwnColony) : ''}
      <div class="planet-detail-actions">
        ${canColonize ? `<button class="btn btn-primary" id="btn-colonize">Colonize</button>` : ''}
        ${isOwnColony ? `<button class="btn btn-primary" id="btn-manage-colony">Manage Colony</button>` : ''}
        ${colony && !isOwnColony ? `<div class="planet-detail-foreign">Foreign colony</div>` : ''}
        ${!canColonize && !colony ? `<div class="planet-detail-uncolonizable">Cannot colonize</div>` : ''}
      </div>
    `;

    this.element.appendChild(panel);

    // Start animated planet preview
    this.startPreviewAnimation(planet);

    // Wire colonize button
    const colonizeBtn = panel.querySelector('#btn-colonize');
    colonizeBtn?.addEventListener('click', () => {
      this.eventBus.emit('colony:requestFound', { planetId });
    });

    // Wire manage colony button
    const manageBtn = panel.querySelector('#btn-manage-colony');
    manageBtn?.addEventListener('click', () => {
      if (colony) {
        this.eventBus.emit('view:colony', { colonyId: colony.id });
      }
    });
  }

  private startPreviewAnimation(planet: Planet): void {
    this.stopPreviewAnimation();
    this.previewTime = 0;

    const canvas = this.element?.querySelector('#planet-preview') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = PLANET_TYPE_COLORS[planet.type] || PLANET_TYPE_COLORS.BARREN;
    const seed = this.hashString(planet.id);

    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      this.previewTime += dt;

      this.drawAnimatedPlanetPreview(ctx, planet, colors, seed);

      this.previewAnimId = requestAnimationFrame(animate);
    };

    this.previewAnimId = requestAnimationFrame(animate);
  }

  private stopPreviewAnimation(): void {
    if (this.previewAnimId !== null) {
      cancelAnimationFrame(this.previewAnimId);
      this.previewAnimId = null;
    }
  }

  private drawAnimatedPlanetPreview(
    ctx: CanvasRenderingContext2D,
    planet: Planet,
    colors: { c1: string; c2: string; c3: string; ocean: boolean },
    seed: number,
  ): void {
    const cx = 60, cy = 60, r = 50;
    const t = this.previewTime;

    ctx.clearRect(0, 0, 120, 120);

    // Rotating terminator: light source slowly orbits
    const lightAngle = t * 0.3;
    const lightX = Math.cos(lightAngle);
    const lightY = Math.sin(lightAngle) * 0.3;

    // Planet body gradient (shifts with light)
    const gradCx = cx + lightX * 15;
    const gradCy = cy + lightY * 15;
    const grad = ctx.createRadialGradient(gradCx - 10, gradCy - 10, 0, cx, cy, r);
    grad.addColorStop(0, colors.c2);
    grad.addColorStop(0.5, colors.c1);
    grad.addColorStop(1, this.darken(colors.c1, 0.3));

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Noise-like terrain bands (slowly shift to simulate rotation)
    ctx.globalCompositeOperation = 'overlay';
    const bandShift = t * 3;
    for (let i = 0; i < 8; i++) {
      const bandY = cy - r + ((seed * (i + 1) * 137.5 + bandShift) % (r * 2));
      const bandH = 4 + (seed * (i + 3) * 17.3 % 8);
      ctx.beginPath();
      ctx.ellipse(cx, bandY, r * 0.9, bandH, 0, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? colors.c3 : colors.c2;
      ctx.globalAlpha = 0.15;
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';

    // Ocean sheen for ocean planets (shimmering)
    if (colors.ocean) {
      const shimmer = 0.1 + Math.sin(t * 1.5) * 0.05;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      const oceanGrad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
      oceanGrad.addColorStop(0, `rgba(100, 180, 255, ${shimmer})`);
      oceanGrad.addColorStop(0.5, `rgba(100, 180, 255, ${shimmer * 0.4})`);
      oceanGrad.addColorStop(1, `rgba(100, 180, 255, ${shimmer})`);
      ctx.fillStyle = oceanGrad;
      ctx.fill();
    }

    // Rotating terminator shadow
    const shadowAngle = lightAngle + Math.PI;
    const shadowX = Math.cos(shadowAngle);
    const shadowGrad = ctx.createLinearGradient(
      cx + shadowX * r * -1, cy,
      cx + shadowX * r, cy,
    );
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
    shadowGrad.addColorStop(0.55, 'rgba(0,0,0,0)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = shadowGrad;
    ctx.fill();

    // Atmosphere rim glow (pulsing slightly)
    const rimPulse = planet.habitability > 20 ? (0.15 + Math.sin(t * 0.8) * 0.05) : 0.03;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
    const rimGrad = ctx.createRadialGradient(cx, cy, r - 2, cx, cy, r + 6);
    rimGrad.addColorStop(0, 'rgba(100, 160, 255, 0)');
    rimGrad.addColorStop(0.5, `rgba(100, 160, 255, ${rimPulse})`);
    rimGrad.addColorStop(1, 'rgba(100, 160, 255, 0)');
    ctx.fillStyle = rimGrad;
    ctx.fill();

    // Clip to circle for clean edge
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  private renderColonyInfo(colony: Colony, isOwn: boolean | null): string {
    if (!isOwn) {
      const owner = this.state?.players[colony.playerId];
      return `
        <div class="colony-info-section">
          <div class="colony-info-header">Colony — ${owner?.name || 'Unknown'}</div>
        </div>
      `;
    }

    const popPercent = (colony.population / colony.maxPopulation * 100).toFixed(0);
    return `
      <div class="colony-info-section">
        <div class="colony-info-header">Colony — ${colony.name}</div>
        <div class="colony-pop-bar-row">
          <span class="planet-stat-label">Pop</span>
          <div class="stat-bar stat-bar-wide">
            <div class="stat-bar-fill" style="width:${popPercent}%;background:var(--color-accent);"></div>
          </div>
          <span>${Math.floor(colony.population)}/${colony.maxPopulation}</span>
        </div>
        <div class="colony-info-grid">
          <span class="output-icon output-food">F</span><span>${colony.foodOutput.toFixed(1)}</span>
          <span class="output-icon output-prod">P</span><span>${colony.productionOutput.toFixed(1)}</span>
          <span class="output-icon output-research">R</span><span>${colony.researchOutput.toFixed(1)}</span>
          <span class="output-icon output-credits">C</span><span>${colony.creditsOutput.toFixed(1)}</span>
        </div>
      </div>
    `;
  }

  private renderMoonDots(count: number): string {
    let dots = '';
    for (let i = 0; i < count; i++) {
      dots += '<span class="moon-dot"></span>';
    }
    return dots;
  }

  private renderStars(minerals: number): string {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += `<span class="mineral-star ${i <= minerals ? 'active' : ''}">\u2605</span>`;
    }
    return stars;
  }

  private getSizeLabel(size: number): string {
    const labels = ['', 'Tiny', 'Small', 'Medium', 'Large', 'Huge'];
    return labels[size] || `${size}`;
  }

  private getSpecialIcon(res: string): string {
    const icons: Record<string, string> = {
      GOLD_DEPOSITS: '\u2726',
      GEM_DEPOSITS: '\u2666',
      ANCIENT_ARTIFACTS: '\u2756',
      NATIVE_LIFE: '\u2618',
    };
    return icons[res] || '\u2022';
  }

  private getHabitColor(hab: number): string {
    if (hab >= 70) return 'var(--color-success)';
    if (hab >= 40) return 'var(--color-warning)';
    return 'var(--color-danger)';
  }

  private getHabitClass(hab: number): string {
    if (hab >= 70) return 'hab-high';
    if (hab >= 40) return 'hab-mid';
    return 'hab-low';
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

  private hidePlanetDetail(): void {
    this.stopPreviewAnimation();
    if (!this.element) return;
    const panel = this.element.querySelector('.planet-detail-panel');
    panel?.remove();
  }
}
