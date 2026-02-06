import { EventBus } from '@/core/EventBus';
import { ScreenComponent } from '@/ui/UIManager';
import { GameState } from '@/core/GameState';

export class TurnButton implements ScreenComponent {
  private element: HTMLElement | null = null;
  private eventBus: EventBus;
  private processing = false;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;

    this.eventBus.on('turn:processing', () => {
      this.processing = true;
      this.updateButton();
    });

    this.eventBus.on('turn:complete', () => {
      this.processing = false;
      this.updateButton();
    });
  }

  show(container: HTMLElement): void {
    this.element = document.createElement('div');
    this.element.className = 'turn-button';
    this.element.innerHTML = `
      <button class="btn btn-primary" id="end-turn-btn">End Turn</button>
    `;
    container.appendChild(this.element);

    const btn = this.element.querySelector('#end-turn-btn')!;
    btn.addEventListener('click', () => {
      if (!this.processing) {
        this.eventBus.emit('turn:end', {});
      }
    });
  }

  hide(): void {
    this.element?.remove();
    this.element = null;
  }

  update(state: GameState): void {
    // Could update button text based on game state
  }

  private updateButton(): void {
    const btn = this.element?.querySelector('#end-turn-btn') as HTMLButtonElement;
    if (!btn) return;

    if (this.processing) {
      btn.textContent = 'Processing...';
      btn.disabled = true;
      btn.classList.add('pulse');
    } else {
      btn.textContent = 'End Turn';
      btn.disabled = false;
      btn.classList.remove('pulse');
    }
  }
}
