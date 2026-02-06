import * as THREE from 'three';
import { EventBus } from '@/core/EventBus';
import { InputManager } from './InputManager';
import { StarRenderer } from '@/rendering/galaxy/StarRenderer';
import { SystemRenderer } from '@/rendering/system/SystemRenderer';

export class Raycaster {
  private raycaster = new THREE.Raycaster();
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private eventBus: EventBus;
  private inputManager: InputManager;
  private starRenderer: StarRenderer | null = null;
  private systemRenderer: SystemRenderer | null = null;
  private onClickBound: (e: MouseEvent) => void;
  private onDblClickBound: (e: MouseEvent) => void;

  constructor(
    camera: THREE.PerspectiveCamera,
    canvas: HTMLCanvasElement,
    eventBus: EventBus,
    inputManager: InputManager,
  ) {
    this.camera = camera;
    this.canvas = canvas;
    this.eventBus = eventBus;
    this.inputManager = inputManager;

    this.onClickBound = this.onClick.bind(this);
    this.onDblClickBound = this.onDblClick.bind(this);
    canvas.addEventListener('click', this.onClickBound);
    canvas.addEventListener('dblclick', this.onDblClickBound);
  }

  setStarRenderer(renderer: StarRenderer): void {
    this.starRenderer = renderer;
  }

  setSystemRenderer(renderer: SystemRenderer): void {
    this.systemRenderer = renderer;
  }

  private onClick(e: MouseEvent): void {
    if (e.button !== 0) return;

    // If system view is active, try planet picking first
    if (this.systemRenderer?.isActive()) {
      const planetId = this.pickPlanet();
      if (planetId) {
        this.eventBus.emit('planet:selected', { planetId });
        return;
      }
      this.eventBus.emit('planet:deselected', {});
      return;
    }

    // Galaxy view: star picking
    const starId = this.pickStar();
    if (starId) {
      this.eventBus.emit('star:selected', { starId });
    } else {
      this.eventBus.emit('star:deselected', {});
    }
  }

  private onDblClick(e: MouseEvent): void {
    if (e.button !== 0) return;

    // In system view, double-click planet opens colony
    if (this.systemRenderer?.isActive()) {
      const planetId = this.pickPlanet();
      if (planetId) {
        this.eventBus.emit('planet:doubleClicked', { planetId });
      }
      return;
    }

    // Galaxy view: double-click star enters system
    const starId = this.pickStar();
    if (starId) {
      this.eventBus.emit('star:doubleClicked', { starId });
    }
  }

  private pickStar(): string | null {
    if (!this.starRenderer) return null;

    const mouse = this.inputManager.getNormalizedMouse();
    this.raycaster.setFromCamera(new THREE.Vector2(mouse.x, mouse.y), this.camera);

    const starMesh = this.starRenderer.getStarMesh();
    if (!starMesh) return null;

    const intersects = this.raycaster.intersectObject(starMesh);
    if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
      return this.starRenderer.getStarIdByInstanceIndex(intersects[0].instanceId) || null;
    }

    return null;
  }

  private pickPlanet(): string | null {
    if (!this.systemRenderer) return null;

    const meshes = this.systemRenderer.getPlanetMeshes();
    if (meshes.length === 0) return null;

    const mouse = this.inputManager.getNormalizedMouse();
    this.raycaster.setFromCamera(new THREE.Vector2(mouse.x, mouse.y), this.camera);

    const intersects = this.raycaster.intersectObjects(meshes);
    if (intersects.length > 0) {
      return intersects[0].object.userData.planetId || null;
    }

    return null;
  }

  dispose(): void {
    this.canvas.removeEventListener('click', this.onClickBound);
    this.canvas.removeEventListener('dblclick', this.onDblClickBound);
  }
}
