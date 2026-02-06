import * as THREE from 'three';
import { StarRenderer } from './StarRenderer';
import { StarFieldBackground } from './StarFieldBackground';
import { NebulaClouds } from './NebulaClouds';
import { ConnectionLines } from './ConnectionLines';
import { FleetIconRenderer } from './FleetIconRenderer';
import { GalaxyDustPlane } from './GalaxyDustPlane';
import { Star } from '@/models/Star';
import { Fleet } from '@/models/Fleet';
import { Player } from '@/models/Player';
import { EventBus } from '@/core/EventBus';

export class GalaxyRenderer {
  private scene: THREE.Scene;
  private eventBus: EventBus;

  readonly starRenderer: StarRenderer;
  readonly background: StarFieldBackground;
  readonly nebulaClouds: NebulaClouds;
  readonly connectionLines: ConnectionLines;
  readonly fleetIcons: FleetIconRenderer;
  readonly galaxyDust: GalaxyDustPlane;

  constructor(scene: THREE.Scene, eventBus: EventBus) {
    this.scene = scene;
    this.eventBus = eventBus;

    this.starRenderer = new StarRenderer(scene);
    this.background = new StarFieldBackground(scene);
    this.nebulaClouds = new NebulaClouds(scene);
    this.connectionLines = new ConnectionLines(scene);
    this.fleetIcons = new FleetIconRenderer(scene);
    this.galaxyDust = new GalaxyDustPlane(scene);
  }

  build(stars: Record<string, Star>, galaxyRadius: number, homeStarId?: string, particleDensity: number = 1.0, exploredStarIds?: Set<string>): void {
    this.starRenderer.build(stars, homeStarId);
    this.background.build(Math.floor(25000 * particleDensity), galaxyRadius * 4);
    this.nebulaClouds.build(Math.max(2, Math.floor(12 * particleDensity)), galaxyRadius);
    this.connectionLines.build(stars, exploredStarIds);
    this.galaxyDust.build(galaxyRadius);

    // Apply fog of war if explored stars are provided
    if (exploredStarIds) {
      this.starRenderer.applyFogOfWar(exploredStarIds);
    }
  }

  update(camera: THREE.Camera, deltaTime: number): void {
    this.starRenderer.update(camera, deltaTime);
    this.nebulaClouds.update(deltaTime);
    this.connectionLines.update(deltaTime);
    this.background.update(deltaTime);
    this.galaxyDust.update(deltaTime);
    this.fleetIcons.update(camera, deltaTime);
  }

  updateFleets(fleets: Record<string, Fleet>, stars: Record<string, Star>, players: Record<string, Player>): void {
    this.fleetIcons.build(fleets, stars, players);
  }

  setVisible(visible: boolean): void {
    this.starRenderer.setVisible(visible);
    this.background.setVisible(visible);
    this.nebulaClouds.setVisible(visible);
    this.connectionLines.setVisible(visible);
    this.galaxyDust.setVisible(visible);
    this.fleetIcons.setVisible(visible);
  }

  clear(): void {
    this.starRenderer.clear();
    this.background.clear();
    this.nebulaClouds.clear();
    this.connectionLines.clear();
    this.galaxyDust.clear();
    this.fleetIcons.clear();
  }
}
