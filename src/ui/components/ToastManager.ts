import { EventBus } from '@/core/EventBus';
import { GameState } from '@/core/GameState';
import { ScreenComponent } from '@/ui/UIManager';

interface ToastData {
  message: string;
  icon: string;
  color: string;
}

export class ToastManager implements ScreenComponent {
  private container: HTMLElement | null = null;
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;

    this.eventBus.on('colony:buildComplete', ({ colonyId, itemName }) => {
      const colonyName = this.getColonyName(colonyId);
      this.showToast({
        message: `${itemName} completed at ${colonyName}`,
        icon: '\u2692',
        color: '#ff8844',
      });
    });

    this.eventBus.on('research:complete', ({ techId }) => {
      const name = techId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      this.showToast({
        message: `Research complete: ${name}`,
        icon: '\u2622',
        color: '#4488ff',
      });
    });

    this.eventBus.on('ui:toast', (data) => {
      this.showToast(data);
    });
  }

  private state: GameState | null = null;

  show(container: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    container.appendChild(this.container);
  }

  hide(): void {
    this.container?.remove();
    this.container = null;
  }

  update(state: GameState): void {
    this.state = state;
  }

  private getColonyName(colonyId: string): string {
    if (this.state) {
      const colony = this.state.colonies[colonyId];
      if (colony) return colony.name;
    }
    return 'Colony';
  }

  private showToast(data: ToastData): void {
    if (!this.container) return;

    const toast = document.createElement('div');
    toast.className = 'toast toast-enter';
    toast.innerHTML = `
      <span class="toast-icon" style="color:${data.color}">${data.icon}</span>
      <span class="toast-message">${data.message}</span>
    `;
    this.container.appendChild(toast);

    // Trigger enter animation on next frame
    requestAnimationFrame(() => {
      toast.classList.remove('toast-enter');
    });

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      toast.classList.add('toast-exit');
      toast.addEventListener('transitionend', () => {
        toast.remove();
      });
      // Fallback removal
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  }
}
