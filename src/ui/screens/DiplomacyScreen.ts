import { EventBus } from '@/core/EventBus';
import { GameState } from '@/core/GameState';
import { ScreenComponent } from '@/ui/UIManager';
import { DiplomacyStatus } from '@/models/types';

export class DiplomacyScreen implements ScreenComponent {
  private element: HTMLElement | null = null;
  private eventBus: EventBus;
  private state: GameState | null = null;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  show(container: HTMLElement): void {
    this.element = document.createElement('div');
    this.element.className = 'diplomacy-screen fade-in';
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

    const currentPlayer = this.state.players[this.state.currentPlayerId];
    if (!currentPlayer) return;

    const otherPlayers = Object.values(this.state.players).filter(
      p => p.id !== currentPlayer.id && p.alive
    );

    this.element.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h2 style="font-family:var(--font-display);color:var(--color-text-bright);font-size:20px;">Diplomacy</h2>
        <button class="btn" id="btn-close-diplomacy">Close</button>
      </div>

      <div class="diplomacy-grid">
        ${otherPlayers.map(player => {
          const rel = this.state!.diplomacy.find(
            d => (d.player1Id === currentPlayer.id && d.player2Id === player.id) ||
                 (d.player1Id === player.id && d.player2Id === currentPlayer.id)
          );

          const status = rel?.status || DiplomacyStatus.UNKNOWN;
          const reputation = rel?.reputation || 0;
          const statusClass = status === DiplomacyStatus.WAR ? 'war'
            : status === DiplomacyStatus.ALLIANCE ? 'alliance'
            : status === DiplomacyStatus.TRADE ? 'trade'
            : 'peace';

          const proposals = rel?.pendingProposals.filter(p => p.toPlayerId === currentPlayer.id) || [];

          return `
            <div class="diplomacy-card">
              <div class="player-name" style="color:#${player.color.toString(16).padStart(6, '0')}">${player.name}</div>
              <div style="margin-bottom:8px;">
                <span class="status-badge ${statusClass}">${status.replace('_', ' ')}</span>
              </div>
              <div style="font-size:11px;color:var(--color-text-dim);margin-bottom:8px;">
                Reputation: ${reputation > 0 ? '+' : ''}${reputation}
              </div>
              <div style="font-size:11px;margin-bottom:8px;">
                Colonies: ${player.colonyIds.length} | Fleets: ${player.fleetIds.length}
              </div>

              ${proposals.length > 0 ? `
                <div style="margin-bottom:8px;padding:8px;border:1px solid var(--color-warning);border-radius:var(--border-radius);">
                  <div style="color:var(--color-warning);font-size:11px;margin-bottom:4px;">Pending Proposals:</div>
                  ${proposals.map(p => `
                    <div style="display:flex;justify-content:space-between;align-items:center;margin:4px 0;">
                      <span>${p.type.replace('_', ' ')}</span>
                      <div>
                        <button class="btn" style="padding:4px 8px;font-size:10px;" data-accept="${player.id}" data-type="${p.type}">Accept</button>
                        <button class="btn btn-danger" style="padding:4px 8px;font-size:10px;" data-reject="${player.id}" data-type="${p.type}">Reject</button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              <div style="display:flex;gap:4px;flex-wrap:wrap;">
                ${status !== DiplomacyStatus.WAR ? `
                  <button class="btn btn-danger" style="font-size:10px;padding:4px 8px;" data-declare-war="${player.id}">Declare War</button>
                ` : `
                  <button class="btn" style="font-size:10px;padding:4px 8px;" data-propose-peace="${player.id}">Propose Peace</button>
                `}
                ${status === DiplomacyStatus.NEUTRAL ? `
                  <button class="btn" style="font-size:10px;padding:4px 8px;" data-propose-nap="${player.id}">Non-Aggression</button>
                ` : ''}
                ${status === DiplomacyStatus.NON_AGGRESSION ? `
                  <button class="btn" style="font-size:10px;padding:4px 8px;" data-propose-trade="${player.id}">Trade Agreement</button>
                ` : ''}
                ${status === DiplomacyStatus.TRADE ? `
                  <button class="btn" style="font-size:10px;padding:4px 8px;" data-propose-alliance="${player.id}">Alliance</button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Wire events
    this.element.querySelector('#btn-close-diplomacy')?.addEventListener('click', () => {
      this.eventBus.emit('view:galaxy', {});
    });

    this.element.querySelectorAll('[data-declare-war]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = (btn as HTMLElement).dataset.declareWar!;
        this.eventBus.emit('diplomacy:war', { player1Id: currentPlayer.id, player2Id: targetId });
        // Directly update state
        const rel = this.state!.diplomacy.find(
          d => (d.player1Id === currentPlayer.id && d.player2Id === targetId) ||
               (d.player1Id === targetId && d.player2Id === currentPlayer.id)
        );
        if (rel) {
          rel.status = DiplomacyStatus.WAR;
          rel.treaties = [];
          rel.reputation = Math.max(-100, rel.reputation - 40);
        }
        this.render();
      });
    });

    this.element.querySelectorAll('[data-propose-peace]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = (btn as HTMLElement).dataset.proposePeace!;
        const rel = this.findRelation(currentPlayer.id, targetId);
        if (rel) {
          rel.pendingProposals.push({
            fromPlayerId: currentPlayer.id,
            toPlayerId: targetId,
            type: 'peace',
            turn: this.state!.turn,
          });
        }
        this.render();
      });
    });

    // Similar for other proposal types...
    this.wireProposalButton('propose-nap', 'non_aggression', currentPlayer.id);
    this.wireProposalButton('propose-trade', 'trade', currentPlayer.id);
    this.wireProposalButton('propose-alliance', 'alliance', currentPlayer.id);
  }

  private wireProposalButton(dataAttr: string, type: string, fromId: string): void {
    this.element?.querySelectorAll(`[data-${dataAttr}]`).forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = (btn as HTMLElement).dataset[this.camelCase(dataAttr)]!;
        const rel = this.findRelation(fromId, targetId);
        if (rel) {
          rel.pendingProposals.push({
            fromPlayerId: fromId,
            toPlayerId: targetId,
            type: type as any,
            turn: this.state!.turn,
          });
        }
        this.render();
      });
    });
  }

  private camelCase(str: string): string {
    return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  }

  private findRelation(p1: string, p2: string) {
    return this.state?.diplomacy.find(
      d => (d.player1Id === p1 && d.player2Id === p2) ||
           (d.player1Id === p2 && d.player2Id === p1)
    ) || null;
  }
}
