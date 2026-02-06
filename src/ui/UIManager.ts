import { EventBus } from '@/core/EventBus';
import { GameState } from '@/core/GameState';
import { ViewMode } from '@/models/types';
import './styles/main.css';

export type ScreenComponent = {
  show(container: HTMLElement): void;
  hide(): void;
  update?(state: GameState): void;
  dispose?(): void;
};

export class UIManager {
  private overlay: HTMLElement;
  private eventBus: EventBus;
  private screens = new Map<ViewMode, ScreenComponent>();
  private activeScreens = new Set<ViewMode>();
  private persistentComponents: ScreenComponent[] = [];
  private overlayComponent: ScreenComponent | null = null;

  constructor(eventBus: EventBus) {
    this.overlay = document.getElementById('ui-overlay')!;
    this.eventBus = eventBus;

  }

  registerScreen(mode: ViewMode, screen: ScreenComponent): void {
    this.screens.set(mode, screen);
  }

  registerPersistent(component: ScreenComponent): void {
    this.persistentComponents.push(component);
    component.show(this.overlay);
  }

  showScreen(mode: ViewMode): void {
    // Hide all non-persistent screens
    for (const [activeMode, screen] of this.screens) {
      if (this.activeScreens.has(activeMode)) {
        screen.hide();
      }
    }
    this.activeScreens.clear();

    // Show requested screen
    const screen = this.screens.get(mode);
    if (screen) {
      screen.show(this.overlay);
      this.activeScreens.add(mode);
    }
  }

  hideScreen(mode: ViewMode): void {
    const screen = this.screens.get(mode);
    if (screen) {
      screen.hide();
      this.activeScreens.delete(mode);
    }
  }

  hideAllScreens(): void {
    for (const [mode, screen] of this.screens) {
      if (this.activeScreens.has(mode)) {
        screen.hide();
      }
    }
    this.activeScreens.clear();
  }

  updateAll(state: GameState): void {
    for (const comp of this.persistentComponents) {
      comp.update?.(state);
    }
    for (const mode of this.activeScreens) {
      const screen = this.screens.get(mode);
      screen?.update?.(state);
    }
  }

  showOverlay(component: ScreenComponent): void {
    if (this.overlayComponent) {
      this.overlayComponent.hide();
    }
    this.overlayComponent = component;
    component.show(this.overlay);
  }

  hideOverlay(): void {
    if (this.overlayComponent) {
      this.overlayComponent.hide();
      this.overlayComponent = null;
    }
  }

  isOverlayActive(): boolean {
    return this.overlayComponent !== null;
  }

  getOverlay(): HTMLElement {
    return this.overlay;
  }

  dispose(): void {
    for (const screen of this.screens.values()) {
      screen.dispose?.();
    }
    for (const comp of this.persistentComponents) {
      comp.dispose?.();
    }
  }
}
