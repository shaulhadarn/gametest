// LoreIntroScreen.ts - Cinematic story crawl shown between New Game setup and Galaxy view
// Created: Star Wars-style scrolling text with race-specific lore, particle background, and skip functionality

import { EventBus } from '@/core/EventBus';
import { GameState } from '@/core/GameState';
import { ScreenComponent } from '@/ui/UIManager';
import { getRaceData } from '@/models/RaceData';

const GENERAL_PROLOGUE = `In the year 3847, the Galactic Accord — the fragile alliance that had held a hundred civilizations together — shattered without warning.

The warp network, the lifeline connecting star systems across thousands of light-years, collapsed in a cascade of failures that no one could explain. Entire sectors went dark. Trade routes dissolved. Communication ceased.

Billions were stranded. Worlds that had depended on interstellar commerce for food, medicine, and technology were left to fend for themselves. Wars erupted over dwindling resources. Governments fell. Species that had coexisted for centuries turned on one another.

This era became known as the Black Times.

Now, decades later, the first warp lanes are slowly reopening. Fragments of the old network flicker back to life, connecting isolated pockets of civilization once more. But the galaxy that emerges from the darkness is not the one that fell.

New powers have risen from the ashes. Old alliances are forgotten. And the cause of the Collapse remains a mystery — one that some believe holds the key to preventing it from happening again.`;

export class LoreIntroScreen implements ScreenComponent {
  private element: HTMLElement | null = null;
  private eventBus: EventBus;
  private state: GameState | null = null;
  private animFrame = 0;
  private startTime = 0;
  private done = false;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  show(container: HTMLElement): void {
    this.done = false;
    this.startTime = performance.now();

    const raceId = this.state?.config?.playerRaceId || 'humans';
    const raceData = getRaceData(raceId);

    const raceParagraph = raceData
      ? `\n\nYou lead the ${raceData.race.name}.\n\n${raceData.lore}\n\nFrom your homeworld of ${raceData.homeworldName}, you look out into the fractured galaxy — and see opportunity.`
      : '';

    const fullText = GENERAL_PROLOGUE + raceParagraph + '\n\nThe stars await, Commander.';

    this.element = document.createElement('div');
    this.element.className = 'lore-intro-screen';
    this.element.innerHTML = `
      <canvas class="lore-intro-canvas" id="lore-canvas"></canvas>
      <div class="lore-intro-content">
        <div class="lore-intro-crawl-container">
          <div class="lore-intro-crawl" id="lore-crawl">
            <div class="lore-intro-title">BLACK TIMES</div>
            <div class="lore-intro-divider"></div>
            ${fullText.split('\n\n').map(p => `<p class="lore-intro-paragraph">${p.trim()}</p>`).join('')}
            <div class="lore-intro-divider"></div>
          </div>
        </div>
      </div>
      <div class="lore-intro-controls">
        <div class="lore-intro-skip" id="lore-skip">Press <span class="lore-key-hint">SPACE</span> or click to continue</div>
      </div>
    `;
    container.appendChild(this.element);

    // Setup starfield canvas
    this.canvas = this.element.querySelector('#lore-canvas') as HTMLCanvasElement;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx = this.canvas.getContext('2d');

    // Init star particles
    this.particles = [];
    for (let i = 0; i < 300; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: 0,
        vy: -Math.random() * 0.15 - 0.05,
        size: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.7 + 0.1,
      });
    }

    // Skip handlers
    this.element.addEventListener('click', this.handleSkip);
    document.addEventListener('keydown', this.handleKeySkip);

    this.animate();
  }

  hide(): void {
    this.done = true;
    cancelAnimationFrame(this.animFrame);
    document.removeEventListener('keydown', this.handleKeySkip);
    this.element?.removeEventListener('click', this.handleSkip);
    this.element?.remove();
    this.element = null;
    this.canvas = null;
    this.ctx = null;
  }

  update(state: GameState): void {
    this.state = state;
  }

  private handleSkip = (): void => {
    if (!this.done) {
      this.finish();
    }
  };

  private handleKeySkip = (e: KeyboardEvent): void => {
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
      e.preventDefault();
      this.handleSkip();
    }
  };

  private animate = (): void => {
    if (this.done || !this.ctx || !this.canvas) return;
    this.animFrame = requestAnimationFrame(this.animate);

    const elapsed = performance.now() - this.startTime;

    // Draw starfield
    this.ctx.fillStyle = 'rgba(2, 3, 10, 1)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (const p of this.particles) {
      p.y += p.vy;
      if (p.y < 0) {
        p.y = this.canvas.height;
        p.x = Math.random() * this.canvas.width;
      }

      const twinkle = 0.6 + 0.4 * Math.sin(elapsed * 0.001 + p.x * 0.02);
      this.ctx.globalAlpha = p.alpha * twinkle;
      this.ctx.fillStyle = '#aabbdd';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Subtle nebula glow
    this.ctx.globalAlpha = 0.04;
    const grad = this.ctx.createRadialGradient(
      this.canvas.width * 0.5, this.canvas.height * 0.4, 0,
      this.canvas.width * 0.5, this.canvas.height * 0.4, this.canvas.width * 0.5
    );
    grad.addColorStop(0, '#1a2244');
    grad.addColorStop(0.5, '#0a1122');
    grad.addColorStop(1, 'transparent');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalAlpha = 1;

    // Fade in skip hint after 2 seconds
    const skipEl = this.element?.querySelector('#lore-skip') as HTMLElement;
    if (skipEl) {
      const skipAlpha = Math.min(1, Math.max(0, (elapsed - 2000) / 1000));
      skipEl.style.opacity = skipAlpha.toString();
    }
  };

  private finish(): void {
    this.done = true;
    cancelAnimationFrame(this.animFrame);
    document.removeEventListener('keydown', this.handleKeySkip);

    if (this.element) {
      this.element.style.transition = 'opacity 0.8s ease';
      this.element.style.opacity = '0';
      setTimeout(() => {
        this.eventBus.emit('loreIntro:complete', {});
      }, 800);
    }
  }
}
