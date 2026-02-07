import { EventBus } from '@/core/EventBus';
import { GameState } from '@/core/GameState';
import { ScreenComponent } from '@/ui/UIManager';
import { DiplomacyStatus } from '@/models/types';
import { DiplomacyService } from '@/services/DiplomacyService';
import { DiplomacyMessage } from '@/models/DiplomacyState';
import { getRaceData } from '@/models/RaceData';

export class DiplomacyScreen implements ScreenComponent {
  private element: HTMLElement | null = null;
  private eventBus: EventBus;
  private state: GameState | null = null;
  private selectedPlayerId: string | null = null;
  private diplomacyService: DiplomacyService;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.diplomacyService = new DiplomacyService();
  }

  show(container: HTMLElement): void {
    this.element = document.createElement('div');
    this.element.className = 'council-screen fade-in';
    container.appendChild(this.element);
    this.render();
  }

  hide(): void {
    this.element?.remove();
    this.element = null;
    this.selectedPlayerId = null;
  }

  update(state: GameState): void {
    this.state = state;
    if (this.element) this.render();
  }

  private render(): void {
    if (!this.element || !this.state) return;

    const currentPlayer = this.state.players[this.state.currentPlayerId];
    if (!currentPlayer) return;

    const contactedIds = this.diplomacyService.getContactedPlayers(this.state, currentPlayer.id);
    const contactedPlayers = contactedIds
      .map(id => this.state!.players[id])
      .filter(p => p && p.alive);
    const unknownCount = Object.values(this.state.players)
      .filter(p => p.id !== currentPlayer.id && p.alive && !contactedIds.includes(p.id)).length;

    // Auto-select first player if none selected
    if (!this.selectedPlayerId && contactedPlayers.length > 0) {
      this.selectedPlayerId = contactedPlayers[0].id;
    }

    const selectedPlayer = this.selectedPlayerId ? this.state.players[this.selectedPlayerId] : null;
    const selectedRel = selectedPlayer
      ? this.diplomacyService.getRelation(this.state, currentPlayer.id, selectedPlayer.id)
      : null;
    const selectedRace = selectedPlayer ? getRaceData(selectedPlayer.raceId) : null;

    this.element.innerHTML = `
      <div class="council-header">
        <div class="council-title-wrap">
          <h2 class="council-title">Universal Council</h2>
          <span class="council-subtitle">
            ${contactedPlayers.length} civilization${contactedPlayers.length !== 1 ? 's' : ''} known${unknownCount > 0 ? ` | ${unknownCount} undiscovered` : ''}
          </span>
        </div>
        <button class="btn" id="btn-close-council">Close</button>
      </div>

      <div class="council-body">
        <div class="council-sidebar">
          <div class="council-sidebar-label">Known Civilizations</div>
          <div class="council-civ-list">
            ${contactedPlayers.length > 0 ? contactedPlayers.map(player => {
              const rel = this.diplomacyService.getRelation(this.state!, currentPlayer.id, player.id);
              const raceData = getRaceData(player.raceId);
              const status = rel?.status || DiplomacyStatus.UNKNOWN;
              const reputation = rel?.reputation || 0;
              const isSelected = player.id === this.selectedPlayerId;
              const statusClass = this.getStatusClass(status);
              const color = raceData?.visuals.primaryColor || '#' + player.color.toString(16).padStart(6, '0');
              const proposals = rel?.pendingProposals.filter(p => p.toPlayerId === currentPlayer.id) || [];

              return `
                <div class="council-civ-card ${isSelected ? 'council-civ-selected' : ''}" data-select-civ="${player.id}">
                  <div class="council-civ-emblem" style="color:${color}">${raceData?.visuals.emblemIcon || '?'}</div>
                  <div class="council-civ-info">
                    <div class="council-civ-name" style="color:${color}">${raceData?.race.name || player.name}</div>
                    <div class="council-civ-status">
                      <span class="status-badge ${statusClass}">${status.replace(/_/g, ' ')}</span>
                      ${proposals.length > 0 ? '<span class="council-notification-dot"></span>' : ''}
                    </div>
                  </div>
                  <div class="council-civ-rep" style="color:${reputation >= 0 ? '#44cc66' : '#ff4444'}">${reputation > 0 ? '+' : ''}${reputation}</div>
                </div>
              `;
            }).join('') : `
              <div class="council-empty">
                <div class="council-empty-icon">&#127760;</div>
                <div class="council-empty-text">No civilizations discovered yet.</div>
                <div class="council-empty-hint">Send fleets to explore the galaxy and make first contact.</div>
              </div>
            `}

            ${unknownCount > 0 ? `
              <div class="council-unknown-hint">
                <span class="council-unknown-icon">?</span>
                <span>${unknownCount} undiscovered civilization${unknownCount !== 1 ? 's' : ''} remain</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="council-detail">
          ${selectedPlayer && selectedRel && selectedRace ? this.renderDetail(selectedPlayer, selectedRel, selectedRace, currentPlayer) : `
            <div class="council-detail-empty">
              <div style="font-size:48px;margin-bottom:16px;">&#128752;</div>
              <div style="color:var(--color-text-dim);">Select a civilization to begin diplomatic relations</div>
            </div>
          `}
        </div>
      </div>
    `;

    this.wireEvents(currentPlayer);
  }

  private renderDetail(player: any, rel: any, raceData: any, currentPlayer: any): string {
    const status = rel.status;
    const statusClass = this.getStatusClass(status);
    const reputation = rel.reputation;
    const color = raceData.visuals.primaryColor;
    const proposals = rel.pendingProposals.filter((p: any) => p.toPlayerId === currentPlayer.id);
    const messages = rel.messages.slice(-6); // Last 6 messages

    return `
      <div class="council-detail-header">
        <div class="council-detail-emblem" style="color:${color}">${raceData.visuals.emblemIcon}</div>
        <div class="council-detail-title">
          <h3 class="council-detail-name" style="color:${color}">${raceData.race.name}</h3>
          <div class="council-detail-leader">${this.getLeaderName(player, raceData)}</div>
        </div>
        <div class="council-detail-status-wrap">
          <span class="status-badge ${statusClass}">${status.replace(/_/g, ' ')}</span>
          <div class="council-rep-meter">
            <div class="council-rep-bar">
              <div class="council-rep-fill" style="width:${Math.abs(reputation)}%;background:${reputation >= 0 ? '#44cc66' : '#ff4444'};${reputation < 0 ? 'right:50%;left:auto;' : 'left:50%;'}"></div>
              <div class="council-rep-center"></div>
            </div>
            <div class="council-rep-value" style="color:${reputation >= 0 ? '#44cc66' : '#ff4444'}">${reputation > 0 ? '+' : ''}${reputation}</div>
          </div>
        </div>
      </div>

      <div class="council-detail-stats">
        <div class="council-stat">
          <span class="council-stat-label">Colonies</span>
          <span class="council-stat-value">${player.colonyIds.length}</span>
        </div>
        <div class="council-stat">
          <span class="council-stat-label">Fleets</span>
          <span class="council-stat-value">${player.fleetIds.length}</span>
        </div>
        <div class="council-stat">
          <span class="council-stat-label">Contact</span>
          <span class="council-stat-value">Turn ${rel.contactTurn || '?'}</span>
        </div>
        <div class="council-stat">
          <span class="council-stat-label">Treaties</span>
          <span class="council-stat-value">${rel.treaties.length}</span>
        </div>
      </div>

      ${proposals.length > 0 ? `
        <div class="council-proposals">
          <div class="council-section-title">Pending Proposals</div>
          ${proposals.map((p: any) => `
            <div class="council-proposal">
              <span class="council-proposal-type">${p.type.replace(/_/g, ' ')}</span>
              <div class="council-proposal-actions">
                <button class="btn btn-primary" style="padding:6px 12px;font-size:11px;" data-accept="${player.id}" data-type="${p.type}">Accept</button>
                <button class="btn btn-danger" style="padding:6px 12px;font-size:11px;" data-reject="${player.id}" data-type="${p.type}">Reject</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="council-messages">
        <div class="council-section-title">Communications Log</div>
        <div class="council-message-list">
          ${messages.length > 0 ? messages.map((msg: DiplomacyMessage) => {
            const isFromPlayer = msg.fromPlayerId === currentPlayer.id;
            return `
              <div class="council-msg ${isFromPlayer ? 'council-msg-sent' : 'council-msg-received'}">
                <div class="council-msg-header">
                  <span class="council-msg-sender">${isFromPlayer ? 'You' : raceData.race.name}</span>
                  <span class="council-msg-turn">Turn ${msg.turn}</span>
                </div>
                <div class="council-msg-text">${msg.text}</div>
                ${msg.responseText && !isFromPlayer ? '' : ''}
                ${msg.responseText && isFromPlayer ? `
                  <div class="council-msg council-msg-received council-msg-response">
                    <div class="council-msg-text">${msg.responseText}</div>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('') : `
            <div class="council-msg-empty">No communications yet. Open a channel below.</div>
          `}
        </div>
      </div>

      <div class="council-actions">
        <div class="council-section-title">Actions</div>
        <div class="council-action-grid">
          <div class="council-action-group">
            <div class="council-action-label">Communicate</div>
            <div class="council-action-buttons">
              <button class="btn" data-msg-type="greeting" title="Send a friendly greeting (+2 rep)">Greet</button>
              <button class="btn" data-msg-type="praise" title="Praise their civilization (+5 rep)">Praise</button>
              <button class="btn" data-msg-type="threat" title="Threaten them (-10 rep)">Threaten</button>
              <button class="btn" data-msg-type="insult" title="Insult their civilization (-15 rep)">Insult</button>
            </div>
          </div>

          <div class="council-action-group">
            <div class="council-action-label">Trade</div>
            <div class="council-action-buttons">
              <button class="btn" data-msg-type="offer_tribute" title="Send 20 credits as tribute (+8 rep)">Offer Tribute</button>
              <button class="btn" data-msg-type="demand_tribute" title="Demand credits (requires 20+ rep)">Demand Tribute</button>
            </div>
          </div>

          <div class="council-action-group">
            <div class="council-action-label">Treaties</div>
            <div class="council-action-buttons">
              ${status !== DiplomacyStatus.WAR ? `
                ${status === DiplomacyStatus.NEUTRAL ? `
                  <button class="btn" data-propose-nap="${player.id}">Non-Aggression Pact</button>
                ` : ''}
                ${status === DiplomacyStatus.NON_AGGRESSION ? `
                  <button class="btn" data-propose-trade="${player.id}">Trade Agreement</button>
                ` : ''}
                ${status === DiplomacyStatus.TRADE ? `
                  <button class="btn" data-propose-alliance="${player.id}">Alliance</button>
                ` : ''}
                <button class="btn btn-danger" data-declare-war="${player.id}">Declare War</button>
              ` : `
                <button class="btn" data-propose-peace="${player.id}">Propose Peace</button>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private wireEvents(currentPlayer: any): void {
    if (!this.element) return;

    this.element.querySelector('#btn-close-council')?.addEventListener('click', () => {
      this.eventBus.emit('view:galaxy', {});
    });

    // Civ selection
    this.element.querySelectorAll('[data-select-civ]').forEach(el => {
      el.addEventListener('click', () => {
        this.selectedPlayerId = (el as HTMLElement).dataset.selectCiv!;
        this.render();
      });
    });

    // Messages
    this.element.querySelectorAll('[data-msg-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this.state || !this.selectedPlayerId) return;
        const type = (btn as HTMLElement).dataset.msgType as DiplomacyMessage['type'];
        this.diplomacyService.sendMessage(this.state, currentPlayer.id, this.selectedPlayerId, type);
        this.render();
      });
    });

    // War declaration
    this.element.querySelectorAll('[data-declare-war]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = (btn as HTMLElement).dataset.declareWar!;
        this.diplomacyService.declareWar(this.state!, currentPlayer.id, targetId);
        this.eventBus.emit('diplomacy:war', { player1Id: currentPlayer.id, player2Id: targetId });
        this.render();
      });
    });

    // Peace
    this.element.querySelectorAll('[data-propose-peace]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = (btn as HTMLElement).dataset.proposePeace!;
        this.diplomacyService.proposePeace(this.state!, currentPlayer.id, targetId);
        this.render();
      });
    });

    // Treaty proposals
    this.wireProposalButton('propose-nap', 'non_aggression', currentPlayer.id);
    this.wireProposalButton('propose-trade', 'trade', currentPlayer.id);
    this.wireProposalButton('propose-alliance', 'alliance', currentPlayer.id);

    // Accept/reject proposals
    this.element.querySelectorAll('[data-accept]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = (btn as HTMLElement).dataset.accept!;
        const type = (btn as HTMLElement).dataset.type!;
        const rel = this.diplomacyService.getRelation(this.state!, currentPlayer.id, targetId);
        if (rel) {
          const proposal = rel.pendingProposals.find(
            p => p.toPlayerId === currentPlayer.id && p.type === type
          );
          if (proposal) {
            this.diplomacyService.acceptProposal(this.state!, proposal);
            this.render();
          }
        }
      });
    });

    this.element.querySelectorAll('[data-reject]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = (btn as HTMLElement).dataset.reject!;
        const type = (btn as HTMLElement).dataset.type!;
        const rel = this.diplomacyService.getRelation(this.state!, currentPlayer.id, targetId);
        if (rel) {
          const proposal = rel.pendingProposals.find(
            p => p.toPlayerId === currentPlayer.id && p.type === type
          );
          if (proposal) {
            this.diplomacyService.rejectProposal(this.state!, proposal);
            this.render();
          }
        }
      });
    });
  }

  private wireProposalButton(dataAttr: string, type: string, fromId: string): void {
    this.element?.querySelectorAll(`[data-${dataAttr}]`).forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = (btn as HTMLElement).dataset[this.camelCase(dataAttr)]!;
        this.diplomacyService.proposeTreaty(this.state!, fromId, targetId, type as any);
        this.render();
      });
    });
  }

  private camelCase(str: string): string {
    return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  }

  private getStatusClass(status: DiplomacyStatus): string {
    switch (status) {
      case DiplomacyStatus.WAR: return 'war';
      case DiplomacyStatus.ALLIANCE: return 'alliance';
      case DiplomacyStatus.TRADE: return 'trade';
      case DiplomacyStatus.UNKNOWN: return 'unknown';
      default: return 'peace';
    }
  }

  private getLeaderName(player: any, raceData: any): string {
    if (raceData?.leaders?.length > 0) {
      const leader = raceData.leaders[0];
      return `${leader.title} ${leader.name}`;
    }
    return player.name;
  }
}
