import * as THREE from 'three';
import { EventBus } from '@/core/EventBus';
import { GameState } from '@/core/GameState';
import { ScreenComponent } from '@/ui/UIManager';
import { FlightRenderer } from '@/rendering/flight/FlightRenderer';

const SHIP_SPEED = 30;
const SHIP_BOOST_MULTIPLIER = 3.0;
const SHIP_TURN_SPEED = 2.2;
const SHIP_PITCH_SPEED = 2.0;
const SHIP_ROLL_SPEED = 3.0;
const SHIP_MANUAL_ROLL_SPEED = 3.5;
const SHIP_DRAG = 3.0; // per-second exponential decay factor
const CAMERA_DISTANCE = 9;
const CAMERA_HEIGHT = 3.2;
const CAMERA_LERP = 0.08;
const CAMERA_FOV_BASE = 60;
const CAMERA_FOV_BOOST = 80;
const CAMERA_FOV_LERP = 0.04;

export class FlightUI implements ScreenComponent {
  private element: HTMLElement | null = null;
  private eventBus: EventBus;
  private state: GameState | null = null;
  private flightRenderer: FlightRenderer;
  private camera: THREE.PerspectiveCamera;
  private currentStarId: string | null = null;

  // Input state
  private keys = new Set<string>();
  private mouseX = 0;
  private mouseY = 0;
  private isPointerLocked = false;
  private isBoosting = false;

  // Touch state
  private touchJoystickId: number | null = null;
  private touchJoystickStart = { x: 0, y: 0 };
  private touchJoystickDelta = { x: 0, y: 0 };
  private touchThrottleActive = false;
  private touchBoostActive = false;

  // Camera smooth follow
  private cameraTarget = new THREE.Vector3();
  private cameraLookTarget = new THREE.Vector3();

  // Bound handlers
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private onMouseMove: (e: MouseEvent) => void;
  private onClick: (e: MouseEvent) => void;
  private onPointerLockChange: () => void;
  private onTouchStartHandler: (e: TouchEvent) => void;
  private onTouchMoveHandler: (e: TouchEvent) => void;
  private onTouchEndHandler: (e: TouchEvent) => void;

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
  }

  setStarId(starId: string): void {
    this.currentStarId = starId;
  }

  show(container: HTMLElement): void {
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
          <div class="flight-hint-desktop">WASD Move | Mouse Steer | Q/E Roll | Shift Boost | Space Up | Ctrl Down | Click to lock cursor</div>
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

    // Wire events
    this.element.querySelector('#btn-exit-flight')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.exitFlight();
    });

    // Touch controls
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

    // Keyboard/mouse
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('click', this.onClick);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);

    // Initialize camera behind ship
    const pos = this.flightRenderer.shipPosition;
    this.camera.position.set(pos.x, pos.y + CAMERA_HEIGHT, pos.z + CAMERA_DISTANCE);
    this.camera.lookAt(pos);
    this.cameraTarget.copy(this.camera.position);
    this.cameraLookTarget.copy(pos);
  }

  hide(): void {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('click', this.onClick);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);

    this.keys.clear();
    this.element?.remove();
    this.element = null;
  }

  update(state: GameState): void {
    this.state = state;
  }

  updateFlight(deltaTime: number): void {
    this.updateShipMovement(deltaTime);
    this.updateCamera(deltaTime);
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

    // Steering from mouse (pointer lock) or touch
    let steerX = 0;
    let steerY = 0;

    if (this.isPointerLocked) {
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

    // Apply yaw and pitch (no pitch clamp - full free flight with loops)
    renderer.shipRotation.y -= steerX * SHIP_TURN_SPEED * dt;
    renderer.shipRotation.x -= steerY * SHIP_PITCH_SPEED * dt;

    // Manual roll with Q/E
    let manualRoll = 0;
    if (this.keys.has('q')) manualRoll = 1;
    if (this.keys.has('e')) manualRoll = -1;

    if (manualRoll !== 0) {
      renderer.shipRotation.z += manualRoll * SHIP_MANUAL_ROLL_SPEED * dt;
    } else {
      // Auto-roll into turns (only when not manually rolling)
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

    // Frame-rate independent drag: v *= e^(-drag * dt)
    const dragFactor = Math.exp(-SHIP_DRAG * dt);
    renderer.shipVelocity.multiplyScalar(dragFactor);

    // Apply velocity
    renderer.shipPosition.addScaledVector(renderer.shipVelocity, dt);
  }

  private updateCamera(dt: number): void {
    const renderer = this.flightRenderer;
    const quat = new THREE.Quaternion().setFromEuler(renderer.shipRotation);
    const speed = renderer.shipVelocity.length();

    // Dynamic camera distance: pulls back slightly at high speed
    const dynamicDist = CAMERA_DISTANCE + Math.min(speed * 0.08, 4);
    const dynamicHeight = CAMERA_HEIGHT + Math.min(speed * 0.02, 1);

    // Camera position: behind and above the ship
    const cameraOffset = new THREE.Vector3(0, dynamicHeight, dynamicDist);
    cameraOffset.applyQuaternion(quat);
    const desiredCameraPos = renderer.shipPosition.clone().add(cameraOffset);

    // Look target: further ahead at high speed for forward-leaning feel
    const lookDist = 15 + Math.min(speed * 0.3, 15);
    const lookOffset = new THREE.Vector3(0, 0.3, -lookDist);
    lookOffset.applyQuaternion(quat);
    const desiredLookAt = renderer.shipPosition.clone().add(lookOffset);

    // Smooth follow (frame-rate independent)
    const lerpFactor = 1 - Math.pow(1 - CAMERA_LERP, dt * 60);
    this.cameraTarget.lerp(desiredCameraPos, lerpFactor);
    this.cameraLookTarget.lerp(desiredLookAt, lerpFactor);

    this.camera.position.copy(this.cameraTarget);
    this.camera.lookAt(this.cameraLookTarget);

    // Dynamic FOV: widens when boosting for speed sensation
    const targetFov = this.isBoosting ? CAMERA_FOV_BOOST : CAMERA_FOV_BASE;
    const fovLerp = 1 - Math.pow(1 - CAMERA_FOV_LERP, dt * 60);
    this.camera.fov += (targetFov - this.camera.fov) * fovLerp;
    this.camera.updateProjectionMatrix();
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
      this.mouseX += e.movementX;
      this.mouseY += e.movementY;
    }
  }

  private handleClick(_e: MouseEvent): void {
    if (!this.isPointerLocked && this.element) {
      const canvas = document.querySelector('canvas');
      if (canvas) canvas.requestPointerLock();
    }
  }

  private handlePointerLockChange(): void {
    this.isPointerLocked = !!document.pointerLockElement;
  }

  // Touch controls
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

  private exitFlight(): void {
    if (this.currentStarId) {
      this.eventBus.emit('view:system', { starId: this.currentStarId });
    } else {
      this.eventBus.emit('view:galaxy', {});
    }
  }
}
