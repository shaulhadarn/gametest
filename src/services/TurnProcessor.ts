import { EventBus } from '@/core/EventBus';
import { GameState } from '@/core/GameState';
import { ColonyService } from './ColonyService';
import { ResourceService } from './ResourceService';
import { ResearchService } from './ResearchService';
import { FleetService } from './FleetService';
import { CombatService } from './CombatService';
import { DiplomacyService } from './DiplomacyService';
import { VictoryService } from './VictoryService';
import { AIController } from '@/ai/AIController';

export class TurnProcessor {
  constructor(
    private eventBus: EventBus,
    private colonyService: ColonyService,
    private resourceService: ResourceService,
    private researchService: ResearchService,
    private fleetService: FleetService,
    private combatService: CombatService,
    private diplomacyService: DiplomacyService,
    private victoryService: VictoryService,
    private aiController: AIController,
  ) {}

  async processTurn(state: GameState): Promise<void> {
    // 1. AI Planning
    this.eventBus.emit('turn:processing', { phase: 'AI Planning' });
    for (const player of Object.values(state.players)) {
      if (player.isAI && player.alive) {
        this.aiController.processTurn(state, player.id);
      }
    }

    // 2. Fleet Movement
    this.eventBus.emit('turn:processing', { phase: 'Fleet Movement' });
    this.fleetService.processFleets(state);

    // 3. Combat
    this.eventBus.emit('turn:processing', { phase: 'Combat' });
    const combats = this.combatService.detectCombats(state);
    for (const combat of combats) {
      const result = this.combatService.autoResolve(state, combat.fleet1Id, combat.fleet2Id);
      if (result) {
        this.eventBus.emit('combat:ended', {
          combatId: `${combat.fleet1Id}_${combat.fleet2Id}`,
          winnerId: result.winnerId,
        });
      }
    }

    // 4. Colony Processing
    this.eventBus.emit('turn:processing', { phase: 'Colonies' });
    for (const colony of Object.values(state.colonies)) {
      const completedName = this.colonyService.processColony(state, colony);
      if (completedName && colony.playerId === state.currentPlayerId) {
        this.eventBus.emit('colony:buildComplete', { colonyId: colony.id, itemName: completedName });
      }
    }

    // 5. Economy
    this.eventBus.emit('turn:processing', { phase: 'Economy' });
    for (const player of Object.values(state.players)) {
      if (player.alive) {
        this.resourceService.processPlayer(state, player);
      }
    }

    // 6. Research
    this.eventBus.emit('turn:processing', { phase: 'Research' });
    for (const player of Object.values(state.players)) {
      if (player.alive) {
        const completedTech = this.researchService.processPlayer(state, player);
        if (completedTech) {
          this.eventBus.emit('research:complete', { techId: completedTech, playerId: player.id });
        }
      }
    }

    // 7. Diplomacy
    this.eventBus.emit('turn:processing', { phase: 'Diplomacy' });
    this.diplomacyService.processTurn(state);

    // 8. Victory Check
    this.eventBus.emit('turn:processing', { phase: 'Victory Check' });
    const victory = this.victoryService.checkVictory(state);
    if (victory.achieved && victory.playerId && victory.type) {
      this.eventBus.emit('victory:achieved', {
        playerId: victory.playerId,
        type: victory.type,
      });
    }
  }
}
