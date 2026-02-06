import { EventBus } from '@/core/EventBus';
import { ScreenComponent } from '@/ui/UIManager';

export class MainMenu implements ScreenComponent {
  private element: HTMLElement | null = null;
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  show(container: HTMLElement): void {
    this.element = document.createElement('div');
    this.element.className = 'main-menu fade-in';
    this.element.innerHTML = `
      <div class="main-menu-title">Black Times</div>
      <div class="main-menu-subtitle">4X Space Strategy</div>
      <div class="main-menu-buttons">
        <button class="btn btn-primary" id="btn-new-game">New Game</button>
        <button class="btn" id="btn-load-game">Load Game</button>
        <button class="btn" id="btn-settings">Settings</button>
      </div>
    `;
    container.appendChild(this.element);

    this.element.querySelector('#btn-new-game')?.addEventListener('click', () => {
      this.eventBus.emit('view:newGame', {});
    });

    this.element.querySelector('#btn-load-game')?.addEventListener('click', () => {
      this.eventBus.emit('game:loaded', { slot: 'auto' });
    });

    this.element.querySelector('#btn-settings')?.addEventListener('click', () => {
      this.eventBus.emit('view:settings', {});
    });
  }

  hide(): void {
    this.element?.remove();
    this.element = null;
  }
}
