// FlightUI.ts - Third-person flight controls and camera for exploring star systems
// Updated: Fixed mobile pinch zoom by binding touch to document instead of canvas,
// so second finger is captured even when landing on HUD overlay
// Canvas drag steers ship, smooth finger transitions between steer and pinch

import * as THREE from 'three';
import { EventBus } from '@/core/EventBus';
import { GameState } from '@/core/GameState';
import { ScreenComponent } from '@/ui/UIManager';
import { FlightRenderer } from '@/rendering/flight/FlightRenderer';
import { FlightCameraController, CameraInput } from '@/camera/FlightCameraController';
import { CameraConfig } from '@/camera/CameraConfig';

const SHIP_SPEED = 60;
const SHIP_BOOST_MULTIPLIER = 3.0;
const SHIP_TURN_SPEED = 2.2;
const SHIP_PITCH_SPEED = 2.0;
const SHIP_ROLL_SPEED = 3.0;
const SHIP_MANUAL_ROLL_SPEED = 3.5;
const SHIP_DRAG = 3.0; // per-second exponential decay factor
const TOUCH_DEAD_ZONE = 2;

export class FlightUI implements ScreenComponent {
  private element: HTMLElement | null = null;
  private eventBus: EventBus;
  private state: GameState | null = null;
  private flightRenderer: FlightRenderer;
  private camera: THREE.PerspectiveCamera;
  private currentStarId: string | null = null;

  // AAA Camera controller
  private cameraController: FlightCameraController | null = null;

  // Input state
  private keys = new Set<string>();
  private mouseX = 0;
  private mouseY = 0;
  private isPointerLocked = false;
  private isBoosting = false;

  // Touch state - steering joystick (left zone for ship control)
  private touchJoystickId: number | null = null;
  private touchJoystickStart = { x: 0, y: 0 };
  private touchJoystickDelta = { x: 0, y: 0 };
  private touchThrottleActive = false;
  private touchBoostActive = false;

  // Touch state - camera orbit (right zone / canvas)
  private touchCameraId: number | null = null;
  private touchCameraLastPos = { x: 0, y: 0 };
  private touchPinchDist: number | null = null;
  private isPinching = false;

  // Accumulated camera input per frame (unified output)
  private frameOrbitX = 0;
  private frameOrbitY = 0;
  private frameZoomDelta = 0;

  private isMobile = false;

  // Pre-allocated quaternion for ship (zero GC)
  private shipQuat = new THREE.Quaternion();

  // Bound handlers
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private onMouseMove: (e: MouseEvent) => void;
  private onClick: (e: MouseEvent) => void;
  private onPointerLockChange: () => void;
  private onTouchStartHandler: (e: TouchEvent) => void;
  private onTouchMoveHandler: (e: TouchEvent) => void;
  private onTouchEndHandler: (e: TouchEvent) => void;
  private onCanvasTouchStart: (e: TouchEvent) => void;
  private onCanvasTouchMove: (e: TouchEvent) => void;
  private onCanvasTouchEnd: (e: TouchEvent) => void;
  private onWheel: (e: WheelEvent) => void;
  private onVisibilityChange: () => void;

  constructor(eventBus: EventBus, flightRenderer: FlightRenderer, camera: THREE.PerspectiveCamera) {
    this.eventBus = eventBus;
    this.flightRenderer = flightRenderer;
    this.camera = camera;

    this.onKeyDown = this.handleKeyDown.bind(this);
    this.onKeyUp = this.handleKeyUp.bind(this);
    this.onMouseMove = this.handleMouseMove.bind(this);
    this.onClick = this.handleClick.bind(this);
    this.onPointerLockChange = this.handlePointerLockChange.bind(this);
    this.onTouchStartHandler = this.handleTouchStart.bind(this);
    this.onTouchMoveHandler = this.handleTouchMove.bind(this);
    this.onTouchEndHandler = this.handleTouchEnd.bind(this);
    this.onCanvasTouchStart = this.handleCanvasTouchStart.bind(this);
    this.onCanvasTouchMove = this.handleCanvasTouchMove.bind(this);
    this.onCanvasTouchEnd = this.handleCanvasTouchEnd.bind(this);
    this.onWheel = this.handleWheel.bind(this);
    this.onVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  setStarId(starId: string): void {
    this.currentStarId = starId;
  }

  show(container: HTMLElement): void {
    this.isMobile = window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window;

    // Create camera controller
    this.cameraController = new FlightCameraController(this.camera, this.isMobile);
    this.cameraController.activate(this.flightRenderer.getScene());

    // Hide resource bar during flight
    const resourceBar = document.querySelector('.resource-bar') as HTMLElement | null;
    if (resourceBar) resourceBar.style.display = 'none';
    const turnBtn = document.querySelector('.turn-button-container') as HTMLElement | null;
    if (turnBtn) turnBtn.style.display = 'none';

    this.element = document.createElement('div');
    this.element.className = 'flight-ui fade-in';
    this.element.innerHTML = `
      <div class="flight-hud">
        <div class="flight-hud-top">
          <button class="btn flight-exit-btn" id="btn-exit-flight">EXIT</button>
          <div class="flight-hud-top-center">
            <div class="flight-heading-bar" id="flight-heading">
              <span class="flight-heading-value" id="flight-heading-val">000</span>
            </div>
          </div>
          <div class="flight-speed-display">
            <span class="flight-speed-label">VELOCITY</span>
            <span class="flight-speed-value" id="flight-speed">0</span>
            <span class="flight-speed-unit">m/s</span>
          </div>
        </div>

        <!-- Crosshair -->
        <div class="flight-crosshair">
          <div class="flight-crosshair-inner"></div>
          <div class="flight-crosshair-line flight-crosshair-top"></div>
          <div class="flight-crosshair-line flight-crosshair-bottom"></div>
          <div class="flight-crosshair-line flight-crosshair-left"></div>
          <div class="flight-crosshair-line flight-crosshair-right"></div>
          <div class="flight-crosshair-dot"></div>
        </div>

        <!-- Left HUD panel: throttle & boost -->
        <div class="flight-hud-left">
          <div class="flight-throttle-gauge">
            <div class="flight-gauge-label">THR</div>
            <div class="flight-gauge-bar-bg">
              <div class="flight-gauge-bar-fill" id="flight-throttle-fill"></div>
            </div>
            <div class="flight-gauge-value" id="flight-throttle-pct">0%</div>
          </div>
          <div class="flight-boost-indicator" id="flight-boost-indicator">
            <span class="flight-boost-label">BOOST</span>
          </div>
        </div>

        <!-- Right HUD panel: altitude & distance to nearest body -->
        <div class="flight-hud-right">
          <div class="flight-info-row">
            <span class="flight-info-label">ALT</span>
            <span class="flight-info-value" id="flight-alt">0</span>
          </div>
          <div class="flight-info-row">
            <span class="flight-info-label">DIST</span>
            <span class="flight-info-value" id="flight-dist">---</span>
          </div>
          <div class="flight-info-row">
            <span class="flight-info-label">ROLL</span>
            <span class="flight-info-value" id="flight-roll">0</span>
          </div>
        </div>

        <!-- Bottom controls -->
        <div class="flight-controls-hint" id="flight-controls-hint">
          <div class="flight-hint-desktop">WASD Move | Mouse Steer | Q/E Roll | Shift Boost | Space Up | Ctrl Down | Scroll Zoom | Click to lock cursor</div>
          <div class="flight-hint-mobile">
            <div class="flight-touch-zone flight-touch-left" id="flight-touch-left">
              <div class="flight-touch-joystick-ring"></div>
              <div class="flight-touch-label">STEER</div>
            </div>
            <div class="flight-touch-buttons">
              <button class="flight-touch-btn flight-touch-throttle" id="flight-touch-throttle">THRUST</button>
              <button class="flight-touch-btn flight-touch-boost" id="flight-touch-boost">BOOST</button>
            </div>
          </div>
        </div>
      </div>
    `;
    container.appendChild(this.element);

    // Set touch-action: none on canvas and overlay to prevent browser gestures
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (canvas) {
      canvas.style.touchAction = 'none';
    }
    this.element.style.touchAction = 'none';

    // Wire events
    this.element.querySelector('#btn-exit-flight')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.exitFlight();
    });

    // Touch controls - steering joystick
    const touchLeft = this.element.querySelector('#flight-touch-left') as HTMLElement | null;
    if (touchLeft) {
      touchLeft.addEventListener('touchstart', this.onTouchStartHandler, { passive: false });
      touchLeft.addEventListener('touchmove', this.onTouchMoveHandler, { passive: false });
      touchLeft.addEventListener('touchend', this.onTouchEndHandler, { passive: false });
    }

    const throttleBtn = this.element.querySelector('#flight-touch-throttle') as HTMLElement | null;
    if (throttleBtn) {
      throttleBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.touchThrottleActive = true; }, { passive: false });
      throttleBtn.addEventListener('touchend', () => { this.touchThrottleActive = false; });
    }

    const boostBtn = this.element.querySelector('#flight-touch-boost') as HTMLElement | null;
    if (boostBtn) {
      boostBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.touchBoostActive = true; }, { passive: false });
      boostBtn.addEventListener('touchend', () => { this.touchBoostActive = false; });
    }

    // Document-level touch for steering + pinch zoom (captures both fingers even on overlay)
    document.addEventListener('touchstart', this.onCanvasTouchStart, { passive: false });
    document.addEventListener('touchmove', this.onCanvasTouchMove, { passive: false });
    document.addEventListener('touchend', this.onCanvasTouchEnd, { passive: false });

    // Keyboard/mouse
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('click', this.onClick);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    window.addEventListener('wheel', this.onWheel, { passive: false });
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  hide(): void {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    // Deactivate camera controller
    if (this.cameraController) {
      this.cameraController.deactivate();
      this.cameraController = null;
    }

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('click', this.onClick);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    window.removeEventListener('wheel', this.onWheel);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    document.removeEventListener('touchstart', this.onCanvasTouchStart);
    document.removeEventListener('touchmove', this.onCanvasTouchMove);
    document.removeEventListener('touchend', this.onCanvasTouchEnd);

    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (canvas) {
      canvas.style.touchAction = '';
    }

    // Restore resource bar
    const resourceBar = document.querySelector('.resource-bar') as HTMLElement | null;
    if (resourceBar) resourceBar.style.display = '';
    const turnBtn = document.querySelector('.turn-button-container') as HTMLElement | null;
    if (turnBtn) turnBtn.style.display = '';

    this.keys.clear();
    this.element?.remove();
    this.element = null;
  }

  update(state: GameState): void {
    this.state = state;
  }

  updateFlight(deltaTime: number): void {
    this.updateShipMovement(deltaTime);
    this.updateCameraController(deltaTime);
    this.updateHUD();
  }

  private updateShipMovement(dt: number): void {
    const renderer = this.flightRenderer;
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);
    const up = new THREE.Vector3(0, 1, 0);

    const quat = new THREE.Quaternion().setFromEuler(renderer.shipRotation);
    forward.applyQuaternion(quat);
    right.applyQuaternion(quat);
    up.applyQuaternion(quat);

    this.isBoosting = this.keys.has('shift') || this.touchBoostActive;
    const boost = this.isBoosting ? SHIP_BOOST_MULTIPLIER : 1;
    const speed = SHIP_SPEED * boost;

    // Steering from mouse (pointer lock) or touch joystick
    let steerX = 0;
    let steerY = 0;

    if (this.isPointerLocked || (this.isMobile && (Math.abs(this.mouseX) > 0.01 || Math.abs(this.mouseY) > 0.01))) {
      steerX = this.mouseX * 0.003;
      steerY = this.mouseY * 0.003;
      // Smooth mouse decay (frame-independent)
      const mouseDecay = Math.pow(0.1, dt);
      this.mouseX *= mouseDecay;
      this.mouseY *= mouseDecay;
    } else if (this.touchJoystickId !== null) {
      steerX = this.touchJoystickDelta.x * 0.04;
      steerY = this.touchJoystickDelta.y * 0.04;
    }

    // Apply yaw and pitch
    renderer.shipRotation.y -= steerX * SHIP_TURN_SPEED * dt;
    renderer.shipRotation.x += steerY * SHIP_PITCH_SPEED * dt;

    // Manual roll with Q/E
    let manualRoll = 0;
    if (this.keys.has('q')) manualRoll = 1;
    if (this.keys.has('e')) manualRoll = -1;

    if (manualRoll !== 0) {
      renderer.shipRotation.z += manualRoll * SHIP_MANUAL_ROLL_SPEED * dt;
    } else {
      const targetRoll = -steerX * 0.8;
      const rollLerp = 1 - Math.pow(0.05, dt);
      renderer.shipRotation.z += (targetRoll - renderer.shipRotation.z) * SHIP_ROLL_SPEED * rollLerp;
    }

    // Thrust
    const isThrusting = this.keys.has('w') || this.keys.has('arrowup') || this.touchThrottleActive;
    const isBraking = this.keys.has('s') || this.keys.has('arrowdown');

    if (isThrusting) {
      renderer.shipVelocity.addScaledVector(forward, speed * dt);
    }
    if (isBraking) {
      renderer.shipVelocity.addScaledVector(forward, -speed * 0.6 * dt);
    }

    // Strafe
    if (this.keys.has('a') || this.keys.has('arrowleft')) {
      renderer.shipVelocity.addScaledVector(right, -speed * 0.5 * dt);
    }
    if (this.keys.has('d') || this.keys.has('arrowright')) {
      renderer.shipVelocity.addScaledVector(right, speed * 0.5 * dt);
    }

    // Vertical
    if (this.keys.has(' ')) {
      renderer.shipVelocity.addScaledVector(up, speed * 0.5 * dt);
    }
    if (this.keys.has('control')) {
      renderer.shipVelocity.addScaledVector(up, -speed * 0.5 * dt);
    }

    // Frame-rate independent drag
    const dragFactor = Math.exp(-SHIP_DRAG * dt);
    renderer.shipVelocity.multiplyScalar(dragFactor);

    // Apply velocity
    renderer.shipPosition.addScaledVector(renderer.shipVelocity, dt);
  }

  private updateCameraController(dt: number): void {
    if (!this.cameraController) return;

    const renderer = this.flightRenderer;
    this.shipQuat.setFromEuler(renderer.shipRotation);

    // Build unified camera input from accumulated frame deltas
    const input: CameraInput = {
      orbitDeltaX: this.frameOrbitX,
      orbitDeltaY: this.frameOrbitY,
      zoomDelta: this.frameZoomDelta,
      isBoosting: this.isBoosting,
    };

    // Update camera controller
    this.cameraController.update(
      renderer.shipPosition,
      this.shipQuat,
      renderer.shipVelocity,
      input,
      dt,
    );

    // Reset accumulated input for next frame
    this.frameOrbitX = 0;
    this.frameOrbitY = 0;
    this.frameZoomDelta = 0;
  }

  private updateHUD(): void {
    if (!this.element) return;
    const renderer = this.flightRenderer;
    const vel = renderer.shipVelocity.length();
    const speed = Math.floor(vel * 10);

    // Speed
    const speedEl = this.element.querySelector('#flight-speed');
    if (speedEl) speedEl.textContent = String(speed);

    // Throttle gauge
    const isThrusting = this.keys.has('w') || this.keys.has('arrowup') || this.touchThrottleActive;
    const throttlePct = isThrusting ? (this.isBoosting ? 100 : 65) : 0;
    const fillEl = this.element.querySelector('#flight-throttle-fill') as HTMLElement | null;
    if (fillEl) fillEl.style.height = `${throttlePct}%`;
    const pctEl = this.element.querySelector('#flight-throttle-pct');
    if (pctEl) pctEl.textContent = `${throttlePct}%`;

    // Boost indicator
    const boostEl = this.element.querySelector('#flight-boost-indicator') as HTMLElement | null;
    if (boostEl) {
      boostEl.classList.toggle('active', this.isBoosting);
    }

    // Altitude (Y position)
    const altEl = this.element.querySelector('#flight-alt');
    if (altEl) altEl.textContent = Math.floor(Math.abs(renderer.shipPosition.y)).toString();

    // Distance to origin (sun)
    const distEl = this.element.querySelector('#flight-dist');
    if (distEl) {
      const dist = Math.floor(renderer.shipPosition.length());
      distEl.textContent = dist.toString();
    }

    // Roll angle
    const rollEl = this.element.querySelector('#flight-roll');
    if (rollEl) {
      const rollDeg = Math.floor(THREE.MathUtils.radToDeg(renderer.shipRotation.z) % 360);
      rollEl.textContent = `${rollDeg}°`;
    }

    // Heading (yaw)
    const headingEl = this.element.querySelector('#flight-heading-val');
    if (headingEl) {
      let heading = Math.floor(THREE.MathUtils.radToDeg(-renderer.shipRotation.y) % 360);
      if (heading < 0) heading += 360;
      headingEl.textContent = String(heading).padStart(3, '0');
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.key.toLowerCase());
    if (e.key === 'Escape') {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      } else {
        this.exitFlight();
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key.toLowerCase());
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.isPointerLocked) {
      // Accumulate mouse movement as orbit input (raw pixels)
      this.frameOrbitX += e.movementX;
      this.frameOrbitY += e.movementY;
      // Also accumulate for ship steering
      this.mouseX += e.movementX;
      this.mouseY += e.movementY;
    }
  }

  private handleClick(_e: MouseEvent): void {
    if (!this.isPointerLocked && this.element && !this.isMobile) {
      const canvas = document.querySelector('canvas');
      if (canvas) canvas.requestPointerLock();
    }
  }

  private handlePointerLockChange(): void {
    this.isPointerLocked = !!document.pointerLockElement;
    if (!this.isPointerLocked) {
      this.mouseX = 0;
      this.mouseY = 0;
    }
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    this.frameZoomDelta += Math.sign(e.deltaY);
  }

  private handleVisibilityChange(): void {
    // Reset accumulated input on tab resume to prevent huge delta spikes
    if (!document.hidden) {
      this.mouseX = 0;
      this.mouseY = 0;
      this.frameOrbitX = 0;
      this.frameOrbitY = 0;
      this.frameZoomDelta = 0;
    }
  }

  // Touch controls - steering joystick (left zone)
  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (this.touchJoystickId === null && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      this.touchJoystickId = touch.identifier;
      this.touchJoystickStart = { x: touch.clientX, y: touch.clientY };
      this.touchJoystickDelta = { x: 0, y: 0 };
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.touchJoystickId) {
        const dx = touch.clientX - this.touchJoystickStart.x;
        const dy = touch.clientY - this.touchJoystickStart.y;
        const maxDist = 50;
        this.touchJoystickDelta = {
          x: THREE.MathUtils.clamp(dx / maxDist, -1, 1),
          y: THREE.MathUtils.clamp(dy / maxDist, -1, 1),
        };
      }
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.touchJoystickId) {
        this.touchJoystickId = null;
        this.touchJoystickDelta = { x: 0, y: 0 };
      }
    }
  }

  // Document touch - ship steering (single finger) and pinch zoom (two fingers)
  private handleCanvasTouchStart(e: TouchEvent): void {
    // Skip if touching interactive UI buttons (but allow pinch even on HUD)
    const target = e.target as HTMLElement;
    if (e.touches.length < 2 && target?.closest('.flight-exit-btn, .flight-touch-zone, .flight-touch-buttons, .flight-touch-btn')) return;

    if (e.touches.length >= 2) {
      // Two fingers: start pinch zoom
      this.isPinching = true;
      this.touchCameraId = null;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.touchPinchDist = Math.sqrt(dx * dx + dy * dy);
    } else if (e.touches.length === 1 && this.touchCameraId === null && !this.isPinching) {
      // Single finger: start steering / camera orbit
      const touch = e.touches[0];
      this.touchCameraId = touch.identifier;
      this.touchCameraLastPos = { x: touch.clientX, y: touch.clientY };
    }
  }

  private handleCanvasTouchMove(e: TouchEvent): void {
    e.preventDefault();

    if (e.touches.length >= 2 && this.touchPinchDist !== null) {
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      const pinchDelta = newDist - this.touchPinchDist;
      this.frameZoomDelta -= pinchDelta * CameraConfig.PINCH_ZOOM_SPEED;
      this.touchPinchDist = newDist;
    } else if (e.touches.length === 1 && this.touchCameraId !== null && !this.isPinching) {
      // Single finger drag: steer ship + orbit camera
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.touchCameraId) {
          const dx = touch.clientX - this.touchCameraLastPos.x;
          const dy = touch.clientY - this.touchCameraLastPos.y;
          if (Math.abs(dx) > TOUCH_DEAD_ZONE || Math.abs(dy) > TOUCH_DEAD_ZONE) {
            this.frameOrbitX += dx;
            this.frameOrbitY += dy;
            // Also feed ship steering so dragging changes direction
            this.mouseX += dx * 0.8;
            this.mouseY += dy * 0.8;
          }
          this.touchCameraLastPos = { x: touch.clientX, y: touch.clientY };
        }
      }
    }
  }

  private handleCanvasTouchEnd(e: TouchEvent): void {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.touchCameraId) {
        this.touchCameraId = null;
      }
    }
    if (e.touches.length < 2) {
      this.touchPinchDist = null;
      this.isPinching = false;
      // If one finger remains after pinch, pick it up for steering
      if (e.touches.length === 1) {
        const remaining = e.touches[0];
        this.touchCameraId = remaining.identifier;
        this.touchCameraLastPos = { x: remaining.clientX, y: remaining.clientY };
      }
    }
  }

  private exitFlight(): void {
    if (this.currentStarId) {
      this.eventBus.emit('view:system', { starId: this.currentStarId });
    } else {
      this.eventBus.emit('view:galaxy', {});
    }
  }
}
