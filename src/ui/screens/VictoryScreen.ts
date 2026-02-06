import { EventBus } from '@/core/EventBus';
import { GameState } from '@/core/GameState';
import { ScreenComponent } from '@/ui/UIManager';

export class VictoryScreen implements ScreenComponent {
  private element: HTMLElement | null = null;
  private eventBus: EventBus;
  private state: GameState | null = null;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  show(container: HTMLElement): void {
    this.element = document.createElement('div');
    this.element.className = 'victory-screen fade-in';
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

    const players = Object.values(this.state.players)
      .sort((a, b) => b.score - a.score);

    const winner = players[0];
    const isPlayerWin = winner?.id === this.state.currentPlayerId;

    this.element.innerHTML = `
      <div class="${isPlayerWin ? 'victory-title' : 'victory-title defeat-title'}">
        ${isPlayerWin ? 'Victory!' : 'Defeat'}
      </div>
      <div style="font-family:var(--font-mono);font-size:16px;color:var(--color-text);margin-bottom:32px;">
        ${isPlayerWin ? 'Your civilization stands supreme!' : `${winner?.name || 'Unknown'} has won the game.`}
      </div>
      <div style="font-family:var(--font-mono);color:var(--color-text-dim);margin-bottom:8px;">Turn ${this.state.turn}</div>

      <div class="panel" style="width:400px;margin-bottom:24px;">
        <div class="panel-header">Final Standings</div>
        ${players.map((p, i) => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;${i === 0 ? 'color:var(--color-gold);' : ''}">
            <div>
              <span style="color:var(--color-text-dim);">#${i + 1}</span>
              <span style="color:#${p.color.toString(16).padStart(6, '0')}">${p.name}</span>
            </div>
            <div>${p.score} pts</div>
          </div>
        `).join('')}
      </div>

      <div style="display:flex;gap:12px;">
        <button class="btn btn-primary" id="btn-new-game">New Game</button>
        <button class="btn" id="btn-main-menu">Main Menu</button>
      </div>
    `;

    this.element.querySelector('#btn-new-game')?.addEventListener('click', () => {
      this.eventBus.emit('view:newGame', {});
    });

    this.element.querySelector('#btn-main-menu')?.addEventListener('click', () => {
      this.eventBus.emit('view:mainMenu', {});
    });
  }
}
