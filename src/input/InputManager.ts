import { EventBus } from '@/core/EventBus';

export interface MouseState {
  x: number;
  y: number;
  normalizedX: number; // -1 to 1
  normalizedY: number; // -1 to 1
  leftDown: boolean;
  rightDown: boolean;
  middleDown: boolean;
}

export class InputManager {
  private canvas: HTMLCanvasElement;
  private eventBus: EventBus;
  private mouse: MouseState = {
    x: 0, y: 0,
    normalizedX: 0, normalizedY: 0,
    leftDown: false, rightDown: false, middleDown: false,
  };
  private clickTimeout: number | null = null;
  private lastClickTime = 0;
  private readonly DOUBLE_CLICK_TIME = 300;

  // Touch state
  private touchStartPos = { x: 0, y: 0 };
  private touchStartTime = 0;
  private lastTapTime = 0;
  private lastTapPos = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement, eventBus: EventBus) {
    this.canvas = canvas;
    this.eventBus = eventBus;

    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('click', this.onClick.bind(this));
    canvas.addEventListener('dblclick', this.onDblClick.bind(this));

    // Touch events
    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
    canvas.addEventListener('touchcancel', this.onTouchCancel.bind(this), { passive: false });
  }

  private onMouseMove(e: MouseEvent): void {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
    this.mouse.normalizedX = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.normalizedY = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) this.mouse.leftDown = true;
    if (e.button === 1) this.mouse.middleDown = true;
    if (e.button === 2) this.mouse.rightDown = true;
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0) this.mouse.leftDown = false;
    if (e.button === 1) this.mouse.middleDown = false;
    if (e.button === 2) this.mouse.rightDown = false;
  }

  private onClick(_e: MouseEvent): void {
    // Handled by raycaster
  }

  private onDblClick(_e: MouseEvent): void {
    // Handled by raycaster
  }

  // --- Touch handling ---

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      this.touchStartPos = { x: t.clientX, y: t.clientY };
      this.touchStartTime = performance.now();
      this.updateMouseFromTouch(t);
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.updateMouseFromTouch(e.touches[0]);
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    if (e.changedTouches.length === 0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - this.touchStartPos.x;
    const dy = t.clientY - this.touchStartPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const elapsed = performance.now() - this.touchStartTime;

    // Tap detection: small movement, short duration
    if (dist < 10 && elapsed < 300) {
      const now = performance.now();
      const tapDx = t.clientX - this.lastTapPos.x;
      const tapDy = t.clientY - this.lastTapPos.y;
      const tapDist = Math.sqrt(tapDx * tapDx + tapDy * tapDy);

      if (now - this.lastTapTime < 400 && tapDist < 20) {
        // Double tap
        this.synthesizeMouseEvent('dblclick', t);
        this.lastTapTime = 0;
      } else {
        // Single tap
        this.synthesizeMouseEvent('click', t);
        this.lastTapTime = now;
        this.lastTapPos = { x: t.clientX, y: t.clientY };
      }
    }
  }

  private onTouchCancel(e: TouchEvent): void {
    e.preventDefault();
  }

  private updateMouseFromTouch(t: Touch): void {
    this.mouse.x = t.clientX;
    this.mouse.y = t.clientY;
    this.mouse.normalizedX = (t.clientX / window.innerWidth) * 2 - 1;
    this.mouse.normalizedY = -(t.clientY / window.innerHeight) * 2 + 1;
  }

  private synthesizeMouseEvent(type: string, t: Touch): void {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: t.clientX,
      clientY: t.clientY,
      button: 0,
    });
    this.canvas.dispatchEvent(event);
  }

  getMouse(): MouseState {
    return this.mouse;
  }

  getNormalizedMouse(): { x: number; y: number } {
    return { x: this.mouse.normalizedX, y: this.mouse.normalizedY };
  }

  dispose(): void {
    this.canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.removeEventListener('mouseup', this.onMouseUp.bind(this));
  }
}
