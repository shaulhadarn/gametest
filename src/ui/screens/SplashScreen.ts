import { EventBus } from '@/core/EventBus';
import { GameState } from '@/core/GameState';
import { ScreenComponent } from '@/ui/UIManager';

export class SplashScreen implements ScreenComponent {
  private element: HTMLElement | null = null;
  private eventBus: EventBus;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrame = 0;
  private startTime = 0;
  private particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }[] = [];
  private skippable = false;
  private done = false;
  private DURATION = 3500; // ms total

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  show(container: HTMLElement): void {
    this.done = false;
    this.startTime = performance.now();

    this.element = document.createElement('div');
    this.element.className = 'splash-screen';
    this.element.innerHTML = `
      <canvas id="splash-canvas"></canvas>
      <div class="splash-content">
        <div class="splash-title" id="splash-title"></div>
        <div class="splash-subtitle" id="splash-subtitle">A 4X Space Strategy</div>
        <div class="splash-loader">
          <div class="splash-loader-track">
            <div class="splash-loader-fill" id="splash-loader-fill"></div>
          </div>
          <div class="splash-loader-text" id="splash-loader-text">Initializing...</div>
        </div>
        <div class="splash-skip" id="splash-skip">Click anywhere to skip</div>
      </div>
    `;
    container.appendChild(this.element);

    // Setup particle canvas
    this.canvas = this.element.querySelector('#splash-canvas') as HTMLCanvasElement;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx = this.canvas.getContext('2d');

    // Init particles
    this.particles = [];
    for (let i = 0; i < 200; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.6 + 0.1,
        color: Math.random() > 0.8 ? '#6688cc' : Math.random() > 0.5 ? '#8899bb' : '#aabbdd',
      });
    }

    // Skip handler
    this.element.addEventListener('click', () => {
      if (this.skippable && !this.done) {
        this.finish();
      }
    });

    this.animate();
  }

  private animate = (): void => {
    if (this.done || !this.ctx || !this.canvas || !this.element) return;
    this.animFrame = requestAnimationFrame(this.animate);

    const elapsed = performance.now() - this.startTime;
    const progress = Math.min(elapsed / this.DURATION, 1);

    // Clear
    this.ctx.fillStyle = 'rgba(2, 4, 12, 1)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw particles
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;

      // Twinkle
      const twinkle = 0.5 + 0.5 * Math.sin(elapsed * 0.002 + p.x * 0.01);
      this.ctx.globalAlpha = p.alpha * twinkle * Math.min(progress * 3, 1);
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Draw central glow
    this.ctx.globalAlpha = 0.08 * Math.min(progress * 2, 1);
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 0,
      this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.4
    );
    gradient.addColorStop(0, '#1a3366');
    gradient.addColorStop(0.5, '#0a1833');
    gradient.addColorStop(1, 'transparent');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.globalAlpha = 1;

    // Title reveal - letter by letter
    const titleText = 'BLACK TIMES';
    const titleEl = this.element.querySelector('#splash-title') as HTMLElement;
    if (titleEl) {
      const lettersToShow = Math.floor(Math.min(progress / 0.4, 1) * titleText.length);
      let html = '';
      for (let i = 0; i < titleText.length; i++) {
        const char = titleText[i];
        if (i < lettersToShow) {
          const isRecent = i === lettersToShow - 1 && progress < 0.4;
          html += `<span class="splash-letter ${isRecent ? 'splash-letter-flash' : ''}">${char}</span>`;
        } else {
          html += `<span class="splash-letter splash-letter-hidden">${char}</span>`;
        }
      }
      titleEl.innerHTML = html;
    }

    // Subtitle fade in
    const subtitleEl = this.element.querySelector('#splash-subtitle') as HTMLElement;
    if (subtitleEl) {
      const subtitleAlpha = Math.max(0, (progress - 0.35) / 0.2);
      subtitleEl.style.opacity = Math.min(subtitleAlpha, 1).toString();
    }

    // Loader progress
    const loaderFill = this.element.querySelector('#splash-loader-fill') as HTMLElement;
    const loaderText = this.element.querySelector('#splash-loader-text') as HTMLElement;
    if (loaderFill) {
      const loaderProgress = Math.max(0, (progress - 0.3) / 0.65);
      loaderFill.style.width = `${Math.min(loaderProgress * 100, 100)}%`;
    }
    if (loaderText) {
      if (progress < 0.4) loaderText.textContent = 'Initializing star charts...';
      else if (progress < 0.6) loaderText.textContent = 'Mapping warp lanes...';
      else if (progress < 0.8) loaderText.textContent = 'Scanning nebulae...';
      else loaderText.textContent = 'Ready';
    }

    // Skip text
    if (progress > 0.3) {
      this.skippable = true;
      const skipEl = this.element.querySelector('#splash-skip') as HTMLElement;
      if (skipEl) skipEl.style.opacity = '1';
    }

    // Auto-finish
    if (progress >= 1 && !this.done) {
      this.finish();
    }
  };

  private finish(): void {
    this.done = true;
    cancelAnimationFrame(this.animFrame);

    // Fade out
    if (this.element) {
      this.element.style.transition = 'opacity 0.6s ease';
      this.element.style.opacity = '0';
      setTimeout(() => {
        this.eventBus.emit('view:mainMenu', {});
      }, 600);
    }
  }

  hide(): void {
    this.done = true;
    cancelAnimationFrame(this.animFrame);
    this.element?.remove();
    this.element = null;
    this.canvas = null;
    this.ctx = null;
  }

  update(_state: GameState): void {}
}
