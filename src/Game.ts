import * as THREE from 'three';
import { EventBus } from '@/core/EventBus';
import { GameState, GameConfig, createEmptyGameState } from '@/core/GameState';
import { Random } from '@/core/Random';
import { GALAXY_SIZES, PLAYER_COLORS } from '@/core/Constants';
import { ViewMode, PlanetType } from '@/models/types';

// Services
import { GalaxyGenerator } from '@/services/GalaxyGenerator';
import { PlanetGenerator } from '@/services/PlanetGenerator';
import { TurnProcessor } from '@/services/TurnProcessor';
import { ColonyService } from '@/services/ColonyService';
import { ResourceService } from '@/services/ResourceService';
import { ResearchService } from '@/services/ResearchService';
import { FleetService } from '@/services/FleetService';
import { CombatService } from '@/services/CombatService';
import { ShipDesignService } from '@/services/ShipDesignService';
import { ShipBuildService } from '@/services/ShipBuildService';
import { DiplomacyService } from '@/services/DiplomacyService';
import { VictoryService } from '@/services/VictoryService';
import { SaveManager } from '@/core/SaveManager';
import { SettingsService } from '@/services/SettingsService';
import { FogOfWarService } from '@/services/FogOfWarService';

// Rendering
import { SceneManager } from '@/rendering/SceneManager';
import { CameraController } from '@/rendering/CameraController';
import { RenderLoop } from '@/rendering/RenderLoop';
import { GalaxyRenderer } from '@/rendering/galaxy/GalaxyRenderer';
import { SystemRenderer } from '@/rendering/system/SystemRenderer';

// UI
import { UIManager } from '@/ui/UIManager';
import { ResourceBar } from '@/ui/components/ResourceBar';
import { TurnButton } from '@/ui/components/TurnButton';
import { GalaxyMapUI } from '@/ui/screens/GalaxyMapUI';
import { MainMenu } from '@/ui/screens/MainMenu';
import { NewGameSetup } from '@/ui/screens/NewGameSetup';
import { ColonyScreen } from '@/ui/screens/ColonyScreen';
import { ResearchScreen } from '@/ui/screens/ResearchScreen';
import { ShipDesignScreen } from '@/ui/screens/ShipDesignScreen';
import { DiplomacyScreen } from '@/ui/screens/DiplomacyScreen';
import { VictoryScreen } from '@/ui/screens/VictoryScreen';
import { SplashScreen } from '@/ui/screens/SplashScreen';
import { SystemUI } from '@/ui/screens/SystemUI';
import { LoreIntroScreen } from '@/ui/screens/LoreIntroScreen';
import { ToastManager } from '@/ui/components/ToastManager';
import { SettingsScreen } from '@/ui/screens/SettingsScreen';
import { HamburgerButton } from '@/ui/components/HamburgerButton';

// Input
import { InputManager } from '@/input/InputManager';
import { Raycaster } from '@/input/Raycaster';
import { HotkeyManager } from '@/input/HotkeyManager';

// AI
import { AIController } from '@/ai/AIController';

// Data
import { generateId } from '@/core/IdGenerator';
import { Player } from '@/models/Player';
import { getAllRaceIds, getRaceData, getRandomLeader } from '@/models/RaceData';

export class Game {
  readonly eventBus: EventBus;
  state!: GameState;

  // Core
  private rng!: Random;

  // Services
  private galaxyGenerator!: GalaxyGenerator;
  private planetGenerator!: PlanetGenerator;
  private turnProcessor!: TurnProcessor;
  private colonyService!: ColonyService;
  private resourceService!: ResourceService;
  private researchService!: ResearchService;
  private fleetService!: FleetService;
  private combatService!: CombatService;
  private shipDesignService!: ShipDesignService;
  private shipBuildService!: ShipBuildService;
  private diplomacyService!: DiplomacyService;
  private victoryService!: VictoryService;
  private saveManager!: SaveManager;
  private aiController!: AIController;
  private settingsService!: SettingsService;
  private fogOfWarService!: FogOfWarService;
  private settingsScreen!: SettingsScreen;

  // Rendering
  private sceneManager!: SceneManager;
  private cameraController!: CameraController;
  private renderLoop!: RenderLoop;
  private galaxyRenderer!: GalaxyRenderer;
  private systemRenderer!: SystemRenderer;

  // UI
  private uiManager!: UIManager;

  // Input
  private inputManager!: InputManager;
  private raycaster!: Raycaster;
  private hotkeyManager!: HotkeyManager;

  // UI screens
  private systemUI!: SystemUI;

  // View state
  private currentView: ViewMode = ViewMode.MAIN_MENU;
  private selectedStarId: string | null = null;
  private savedGalaxyCameraState: { target: THREE.Vector3; spherical: THREE.Spherical } | null = null;
  private isFirstGalaxyEntry = true;

  constructor() {
    this.eventBus = new EventBus();
  }

  async init(): Promise<void> {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

    // Settings (initialized early so graphics prefs are available for renderer)
    this.settingsService = new SettingsService(this.eventBus);

    // Scene
    const initialGraphics = this.settingsService.getGraphics();
    this.sceneManager = new SceneManager(canvas, initialGraphics.antiAliasing);
    this.cameraController = new CameraController(this.sceneManager.camera, canvas);
    this.renderLoop = new RenderLoop();

    // Renderers
    this.galaxyRenderer = new GalaxyRenderer(this.sceneManager.scene, this.eventBus);
    this.systemRenderer = new SystemRenderer(this.sceneManager.scene, this.eventBus);

    // Input
    this.inputManager = new InputManager(canvas, this.eventBus);
    this.raycaster = new Raycaster(
      this.sceneManager.camera, canvas, this.eventBus, this.inputManager
    );
    this.raycaster.setStarRenderer(this.galaxyRenderer.starRenderer);
    this.raycaster.setSystemRenderer(this.systemRenderer);
    this.hotkeyManager = new HotkeyManager(this.eventBus);

    // Services (initialized later with RNG)
    this.saveManager = new SaveManager();

    // UI
    this.uiManager = new UIManager(this.eventBus);
    this.setupUI();

    // Events
    this.setupEvents();

    // Render loop
    this.renderLoop.addCallback((dt) => {
      this.cameraController.update(dt);
      if (this.currentView === ViewMode.GALAXY) {
        this.galaxyRenderer.update(this.sceneManager.camera, dt);
      } else if (this.currentView === ViewMode.SYSTEM) {
        this.systemRenderer.update(this.sceneManager.camera, dt);
      }
      this.sceneManager.render();
    });
    this.renderLoop.start();

    // Apply initial graphics settings
    const graphics = this.settingsService.getGraphics();
    this.sceneManager.setBloomEnabled(graphics.bloomEnabled);
    this.sceneManager.setPixelRatio(graphics.pixelRatioLimit);
    this.systemRenderer.setParticleDensity(graphics.particleDensity);

    // Show splash screen
    this.showView(ViewMode.SPLASH);
  }

  private setupUI(): void {
    const resourceBar = new ResourceBar(this.eventBus);
    const turnButton = new TurnButton(this.eventBus);
    const galaxyMapUI = new GalaxyMapUI(this.eventBus);
    const mainMenu = new MainMenu(this.eventBus);
    const newGameSetup = new NewGameSetup(this.eventBus);
    const colonyScreen = new ColonyScreen(this.eventBus);
    const researchScreen = new ResearchScreen(this.eventBus);
    const shipDesignScreen = new ShipDesignScreen(this.eventBus);
    const diplomacyScreen = new DiplomacyScreen(this.eventBus);
    const victoryScreen = new VictoryScreen(this.eventBus);
    const splashScreen = new SplashScreen(this.eventBus);
    const loreIntroScreen = new LoreIntroScreen(this.eventBus);
    this.systemUI = new SystemUI(this.eventBus);

    this.uiManager.registerScreen(ViewMode.SPLASH, splashScreen);
    this.uiManager.registerScreen(ViewMode.SYSTEM, this.systemUI);
    this.uiManager.registerScreen(ViewMode.MAIN_MENU, mainMenu);
    this.uiManager.registerScreen(ViewMode.NEW_GAME, newGameSetup);
    this.uiManager.registerScreen(ViewMode.LORE_INTRO, loreIntroScreen);
    this.uiManager.registerScreen(ViewMode.GALAXY, galaxyMapUI);
    this.uiManager.registerScreen(ViewMode.COLONY, colonyScreen);
    this.uiManager.registerScreen(ViewMode.RESEARCH, researchScreen);
    this.uiManager.registerScreen(ViewMode.SHIP_DESIGN, shipDesignScreen);
    this.uiManager.registerScreen(ViewMode.DIPLOMACY, diplomacyScreen);
    this.uiManager.registerScreen(ViewMode.VICTORY, victoryScreen);

    // Settings screen (overlay, not a ViewMode screen)
    this.settingsScreen = new SettingsScreen(this.eventBus, this.settingsService, this.hotkeyManager);

    // Persistent components only shown during gameplay
    this.uiManager.registerPersistent(resourceBar);
    this.uiManager.registerPersistent(turnButton);
    this.uiManager.registerPersistent(new ToastManager(this.eventBus));
    this.uiManager.registerPersistent(new HamburgerButton(this.eventBus));
  }

  private setupEvents(): void {
    this.eventBus.on('view:mainMenu', () => this.showView(ViewMode.MAIN_MENU));
    this.eventBus.on('view:newGame', () => this.showView(ViewMode.NEW_GAME));
    this.eventBus.on('view:loreIntro', () => this.showView(ViewMode.LORE_INTRO));
    this.eventBus.on('loreIntro:complete', () => this.showView(ViewMode.GALAXY));
    this.eventBus.on('view:galaxy', () => this.showView(ViewMode.GALAXY));
    this.eventBus.on('view:system', ({ starId }) => {
      this.selectedStarId = starId;
      this.showView(ViewMode.SYSTEM);
    });
    this.eventBus.on('view:colony', ({ colonyId }) => {
      this.showView(ViewMode.COLONY);
    });
    this.eventBus.on('view:research', () => this.showView(ViewMode.RESEARCH));
    this.eventBus.on('view:shipDesign', () => this.showView(ViewMode.SHIP_DESIGN));
    this.eventBus.on('view:diplomacy', () => this.showView(ViewMode.DIPLOMACY));

    // Settings overlay toggle
    this.eventBus.on('view:settings', () => {
      if (this.uiManager.isOverlayActive()) {
        this.uiManager.hideOverlay();
      } else {
        this.uiManager.showOverlay(this.settingsScreen);
      }
    });

    // Apply graphics settings changes
    this.eventBus.on('settings:graphicsChanged', ({ graphics }) => {
      this.sceneManager.setBloomEnabled(graphics.bloomEnabled);
      this.sceneManager.setPixelRatio(graphics.pixelRatioLimit);
      this.sceneManager.setAntiAliasing(graphics.antiAliasing);
      this.systemRenderer.setParticleDensity(graphics.particleDensity);
    });

    this.eventBus.on('game:newGame', ({ config }) => {
      this.startNewGame(config as GameConfig);
    });

    this.eventBus.on('game:loaded', ({ slot }) => {
      const saved = this.saveManager.load(slot);
      if (saved) {
        this.state = saved;
        this.rng = new Random(this.state.rngState);
        this.initServices();
        this.fogOfWarService = new FogOfWarService(this.eventBus);
        this.isFirstGalaxyEntry = false; // Don't zoom on load
        this.buildGalaxyView();
        this.showView(ViewMode.GALAXY);
        this.eventBus.emit('ui:toast', { message: 'Game loaded', icon: '\u{1F4C2}', color: '#44cc66' });
      } else {
        this.eventBus.emit('ui:toast', { message: 'No save found', icon: '\u26A0', color: '#ffaa33' });
      }
    });

    this.eventBus.on('game:saved', ({ slot }) => {
      this.state.rngState = this.rng.getState();
      this.saveManager.save(slot, this.state);
      this.eventBus.emit('ui:toast', { message: 'Game saved', icon: '\u{1F4BE}', color: '#44cc66' });
    });

    this.eventBus.on('turn:end', () => this.processTurn());

    this.eventBus.on('star:selected', ({ starId }) => {
      this.selectedStarId = starId;
      this.galaxyRenderer.starRenderer.selectStar(starId, this.state.stars);
      // Animate camera to star
      const star = this.state.stars[starId];
      if (star) {
        this.cameraController.animateTo(
          new THREE.Vector3(star.position.x, star.position.y, star.position.z),
          150
        );
      }
    });

    this.eventBus.on('star:deselected', () => {
      this.selectedStarId = null;
      this.galaxyRenderer.starRenderer.deselectStar();
    });

    this.eventBus.on('star:doubleClicked', ({ starId }) => {
      this.eventBus.emit('view:system', { starId });
    });

    this.eventBus.on('planet:selected', ({ planetId }) => {
      this.systemRenderer.selectPlanet(planetId);
    });

    this.eventBus.on('planet:deselected', () => {
      this.systemRenderer.deselectPlanet();
    });

    this.eventBus.on('planet:doubleClicked', ({ planetId }) => {
      const planet = this.state.planets[planetId];
      if (planet?.colonyId) {
        const colony = this.state.colonies[planet.colonyId];
        if (colony && colony.playerId === this.state.currentPlayerId) {
          this.eventBus.emit('view:colony', { colonyId: colony.id });
        }
      }
    });

    // Colony founding from system view
    this.eventBus.on('colony:requestFound', ({ planetId }) => {
      if (!planetId || !this.state) return;
      const planet = this.state.planets[planetId];
      if (!planet || planet.colonyId) return;

      const star = this.state.stars[planet.starId];
      const name = star ? `${star.name} ${this.getRomanNumeral(planet.orbitIndex + 1)}` : `Colony ${planet.id}`;
      this.colonyService.foundColony(this.state, planetId, this.state.currentPlayerId, name);

      // Refresh system view
      if (this.currentView === ViewMode.SYSTEM && this.selectedStarId) {
        this.systemRenderer.build(this.selectedStarId, this.state);
      }
      this.uiManager.updateAll(this.state);
    });

    this.eventBus.on('fleet:arrived', ({ fleetId, starId }) => {
      // Reveal fog of war when a fleet arrives at a star
      const fleet = this.state.fleets[fleetId];
      if (fleet && fleet.playerId === this.state.currentPlayerId && this.fogOfWarService) {
        const revealed = this.fogOfWarService.revealStar(
          this.state.stars, fleet.playerId, starId
        );
        if (revealed.length > 0) {
          // Update star renderer with newly revealed stars
          this.galaxyRenderer.starRenderer.revealStars(revealed, this.state.stars);
          // Rebuild connection lines to include new explored connections
          const exploredStarIds = this.fogOfWarService.getExploredStarIds(
            this.state.stars, fleet.playerId
          );
          this.galaxyRenderer.connectionLines.build(this.state.stars, exploredStarIds);
        }
      }
    });

    this.eventBus.on('victory:achieved', ({ playerId, type }) => {
      this.showView(ViewMode.VICTORY);
    });
  }

  private startNewGame(config: GameConfig): void {
    this.rng = new Random(config.seed);
    this.state = createEmptyGameState(config);

    this.initServices();

    // Generate galaxy
    this.galaxyGenerator = new GalaxyGenerator(this.rng);
    const { galaxy, stars } = this.galaxyGenerator.generate(config.galaxySize, config.galaxyShape as any);
    this.state.galaxy = galaxy;
    this.state.stars = stars;

    // Generate planets
    this.planetGenerator = new PlanetGenerator(this.rng);
    for (const star of Object.values(this.state.stars)) {
      const planets = this.planetGenerator.generate(star);
      for (const planet of planets) {
        this.state.planets[planet.id] = planet;
        star.planetIds.push(planet.id);
      }
    }

    // Create players
    this.createPlayers(config);

    // Initialize fog of war
    this.fogOfWarService = new FogOfWarService(this.eventBus);
    const humanPlayer = Object.values(this.state.players).find(p => !p.isAI);
    if (humanPlayer) {
      this.fogOfWarService.initializeForPlayer(
        this.state.stars,
        humanPlayer.id,
        humanPlayer.homeStarId
      );
    }
    this.isFirstGalaxyEntry = true;

    // Load tech tree
    this.researchService.loadTechTree(this.state);

    // Build galaxy view
    this.buildGalaxyView();

    // Update UI
    this.uiManager.updateAll(this.state);

    // Show lore intro before galaxy
    this.showView(ViewMode.LORE_INTRO);

    this.eventBus.emit('galaxy:generated', {});
  }

  private initServices(): void {
    this.colonyService = new ColonyService();
    this.resourceService = new ResourceService();
    this.researchService = new ResearchService();
    this.fleetService = new FleetService();
    this.combatService = new CombatService(this.rng);
    this.shipDesignService = new ShipDesignService();
    this.shipBuildService = new ShipBuildService();
    this.diplomacyService = new DiplomacyService();
    this.victoryService = new VictoryService();
    this.aiController = new AIController(this.rng);
    this.turnProcessor = new TurnProcessor(
      this.eventBus,
      this.colonyService,
      this.resourceService,
      this.researchService,
      this.fleetService,
      this.combatService,
      this.diplomacyService,
      this.victoryService,
      this.aiController,
    );
  }

  private createPlayers(config: GameConfig): void {
    const starIds = [...this.state.galaxy.starIds];
    this.rng.shuffle(starIds);

    // Human player
    const humanId = generateId('player');
    const humanHomeStar = starIds.shift()!;
    const humanPlayer: Player = {
      id: humanId,
      name: config.playerName,
      raceId: config.playerRaceId,
      isAI: false,
      color: PLAYER_COLORS[0],
      credits: 50,
      researchPool: 0,
      currentResearchId: null,
      knownTechIds: [],
      colonyIds: [],
      fleetIds: [],
      homeStarId: humanHomeStar,
      score: 0,
      alive: true,
    };
    this.state.players[humanId] = humanPlayer;
    this.state.currentPlayerId = humanId;

    // Found home colony for human
    this.foundHomeColony(humanPlayer, humanHomeStar);

    // AI players — pick from available races (excluding the human's chosen race)
    const availableRaceIds = getAllRaceIds().filter(id => id !== config.playerRaceId);
    this.rng.shuffle(availableRaceIds);

    for (let i = 1; i < config.numPlayers; i++) {
      const aiId = generateId('player');
      const aiHomeStar = starIds.shift();
      if (!aiHomeStar) break;

      const aiRaceId = availableRaceIds[(i - 1) % availableRaceIds.length];
      const aiRaceData = getRaceData(aiRaceId);
      const aiLeader = getRandomLeader(aiRaceId, this.rng);
      const aiName = aiRaceData ? aiRaceData.race.name : `AI Player ${i}`;

      const aiPlayer: Player = {
        id: aiId,
        name: aiName,
        raceId: aiRaceId,
        isAI: true,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length],
        credits: 50,
        researchPool: 0,
        currentResearchId: null,
        knownTechIds: [],
        colonyIds: [],
        fleetIds: [],
        homeStarId: aiHomeStar,
        score: 0,
        alive: true,
      };
      this.state.players[aiId] = aiPlayer;
      this.foundHomeColony(aiPlayer, aiHomeStar);
    }

    // Initialize diplomacy between all player pairs
    const playerIds = Object.keys(this.state.players);
    for (let i = 0; i < playerIds.length; i++) {
      for (let j = i + 1; j < playerIds.length; j++) {
        this.diplomacyService.initRelation(this.state, playerIds[i], playerIds[j]);
      }
    }
  }

  private foundHomeColony(player: Player, starId: string): void {
    const star = this.state.stars[starId];
    star.ownerId = player.id;
    star.explored[player.id] = true;

    // Find best planet (or create a Terran one)
    let bestPlanet = star.planetIds
      .map(pid => this.state.planets[pid])
      .find(p => p && p.type === PlanetType.TERRAN);

    if (!bestPlanet) {
      // Pick best habitable planet
      bestPlanet = star.planetIds
        .map(pid => this.state.planets[pid])
        .filter(p => p && p.habitability > 40)
        .sort((a, b) => b.habitability - a.habitability)[0];
    }

    if (!bestPlanet && star.planetIds.length > 0) {
      // Force first planet to be terran
      bestPlanet = this.state.planets[star.planetIds[0]];
      bestPlanet.type = PlanetType.TERRAN;
      bestPlanet.habitability = 80;
      bestPlanet.size = 3;
    }

    if (bestPlanet) {
      this.colonyService.foundColony(this.state, bestPlanet.id, player.id, star.name + ' Prime');
    }
  }

  private buildGalaxyView(): void {
    this.galaxyRenderer.clear();
    const radius = GALAXY_SIZES[this.state.config.galaxySize].radius;
    const humanPlayer = Object.values(this.state.players).find(p => !p.isAI);
    const homeStarId = humanPlayer?.homeStarId;
    const density = this.settingsService.getGraphics().particleDensity;

    // Get explored stars for fog of war
    const exploredStarIds = humanPlayer && this.fogOfWarService
      ? this.fogOfWarService.getExploredStarIds(this.state.stars, humanPlayer.id)
      : undefined;

    this.galaxyRenderer.build(this.state.stars, radius, homeStarId, density, exploredStarIds);
    this.galaxyRenderer.updateFleets(this.state.fleets, this.state.stars, this.state.players);
    this.raycaster.setStarRenderer(this.galaxyRenderer.starRenderer);
  }

  private async processTurn(): Promise<void> {
    this.eventBus.emit('turn:processing', { phase: 'start' });

    await this.turnProcessor.processTurn(this.state);

    this.state.turn++;

    // Refresh fleets and fog of war without rebuilding the entire galaxy
    this.galaxyRenderer.updateFleets(this.state.fleets, this.state.stars, this.state.players);

    // Update fog of war visibility for newly explored stars
    const humanPlayer = Object.values(this.state.players).find(p => !p.isAI);
    if (humanPlayer && this.fogOfWarService) {
      const exploredStarIds = this.fogOfWarService.getExploredStarIds(
        this.state.stars, humanPlayer.id
      );
      this.galaxyRenderer.starRenderer.applyFogOfWar(exploredStarIds);
      this.galaxyRenderer.connectionLines.build(this.state.stars, exploredStarIds);
    }

    this.uiManager.updateAll(this.state);

    // Auto-save
    this.state.rngState = this.rng.getState();
    this.saveManager.save('auto', this.state);

    this.eventBus.emit('turn:complete', { turn: this.state.turn });
  }

  private showView(mode: ViewMode): void {
    this.currentView = mode;

    if (mode === ViewMode.SYSTEM && this.selectedStarId) {
      // Entering system view: hide galaxy, build system, reposition camera
      this.galaxyRenderer.setVisible(false);
      this.systemRenderer.build(this.selectedStarId, this.state);
      this.systemUI.setStarId(this.selectedStarId);
      this.savedGalaxyCameraState = this.cameraController.saveState();
      this.cameraController.setSystemView();
      this.sceneManager.setBloomForSystem();
    } else if (mode === ViewMode.GALAXY) {
      // Returning to galaxy view: clear system, show galaxy, restore camera
      this.systemRenderer.clear();
      this.galaxyRenderer.setVisible(true);
      this.sceneManager.setBloomForGalaxy();

      // On first galaxy entry, zoom camera to home star
      if (this.isFirstGalaxyEntry && this.state) {
        this.isFirstGalaxyEntry = false;
        const humanPlayer = Object.values(this.state.players).find(p => !p.isAI);
        if (humanPlayer) {
          const homeStar = this.state.stars[humanPlayer.homeStarId];
          if (homeStar) {
            this.cameraController.animateTo(
              new THREE.Vector3(homeStar.position.x, homeStar.position.y, homeStar.position.z),
              80
            );
          }
        }
      } else if (this.savedGalaxyCameraState) {
        this.cameraController.restoreState(this.savedGalaxyCameraState);
        this.savedGalaxyCameraState = null;
      }
    }

    this.uiManager.showScreen(mode);
    if (this.state) {
      this.uiManager.updateAll(this.state);
    }
  }

  private getRomanNumeral(n: number): string {
    const numerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    return numerals[n] || `${n}`;
  }
}
