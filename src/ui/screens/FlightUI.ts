import * as THREE from 'three';
import { EventBus } from '@/core/EventBus';
import { GameState } from '@/core/GameState';
import { ScreenComponent } from '@/ui/UIManager';
import { FlightRenderer } from '@/rendering/flight/FlightRenderer';

const SHIP_SPEED = 25;
const SHIP_BOOST_MULTIPLIER = 2.5;
const SHIP_TURN_SPEED = 1.8;
const SHIP_PITCH_SPEED = 1.2;
const SHIP_ROLL_SPEED = 2.5;
const SHIP_DRAG = 0.97;
const CAMERA_DISTANCE = 8;
const CAMERA_HEIGHT = 3;
const CAMERA_LERP = 0.05;

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
          <button class="btn flight-exit-btn" id="btn-exit-flight">Exit Flight</button>
          <div class="flight-speed-display">
            <span class="flight-speed-label">SPEED</span>
            <span class="flight-speed-value" id="flight-speed">0</span>
          </div>
        </div>
        <div class="flight-crosshair"></div>
        <div class="flight-controls-hint" id="flight-controls-hint">
          <div class="flight-hint-desktop">Click to control | WASD Move | Mouse Steer | Shift Boost | ESC Exit</div>
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
    const touchLeft = this.element.querySelector('#flight-touch-left');
    if (touchLeft) {
      touchLeft.addEventListener('touchstart', this.onTouchStartHandler, { passive: false });
      touchLeft.addEventListener('touchmove', this.onTouchMoveHandler, { passive: false });
      touchLeft.addEventListener('touchend', this.onTouchEndHandler, { passive: false });
    }

    const throttleBtn = this.element.querySelector('#flight-touch-throttle');
    if (throttleBtn) {
      throttleBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.touchThrottleActive = true; }, { passive: false });
      throttleBtn.addEventListener('touchend', () => { this.touchThrottleActive = false; });
    }

    const boostBtn = this.element.querySelector('#flight-touch-boost');
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

    const boost = (this.isBoosting || this.touchBoostActive) ? SHIP_BOOST_MULTIPLIER : 1;
    const speed = SHIP_SPEED * boost;

    // Steering from mouse (pointer lock) or touch
    let steerX = 0;
    let steerY = 0;

    if (this.isPointerLocked) {
      steerX = this.mouseX * 0.002;
      steerY = this.mouseY * 0.002;
      this.mouseX *= 0.5;
      this.mouseY *= 0.5;
    } else if (this.touchJoystickId !== null) {
      steerX = this.touchJoystickDelta.x * 0.03;
      steerY = this.touchJoystickDelta.y * 0.03;
    }

    // Apply rotation
    renderer.shipRotation.y -= steerX * SHIP_TURN_SPEED * dt;
    renderer.shipRotation.x = THREE.MathUtils.clamp(
      renderer.shipRotation.x - steerY * SHIP_PITCH_SPEED * dt,
      -Math.PI * 0.4,
      Math.PI * 0.4
    );

    // Roll into turns
    const targetRoll = -steerX * 0.6;
    renderer.shipRotation.z += (targetRoll - renderer.shipRotation.z) * SHIP_ROLL_SPEED * dt;

    // Thrust
    const isThrusting = this.keys.has('w') || this.keys.has('arrowup') || this.touchThrottleActive;
    const isBraking = this.keys.has('s') || this.keys.has('arrowdown');

    if (isThrusting) {
      renderer.shipVelocity.addScaledVector(forward, speed * dt);
    }
    if (isBraking) {
      renderer.shipVelocity.addScaledVector(forward, -speed * 0.5 * dt);
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

    // Drag
    renderer.shipVelocity.multiplyScalar(SHIP_DRAG);

    // Apply velocity
    renderer.shipPosition.addScaledVector(renderer.shipVelocity, dt);

    // Boost state
    this.isBoosting = this.keys.has('shift');
  }

  private updateCamera(dt: number): void {
    const renderer = this.flightRenderer;
    const quat = new THREE.Quaternion().setFromEuler(renderer.shipRotation);

    // Camera position: behind and above the ship
    const cameraOffset = new THREE.Vector3(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
    cameraOffset.applyQuaternion(quat);
    const desiredCameraPos = renderer.shipPosition.clone().add(cameraOffset);

    // Look target: in front of the ship
    const lookOffset = new THREE.Vector3(0, 0.5, -15);
    lookOffset.applyQuaternion(quat);
    const desiredLookAt = renderer.shipPosition.clone().add(lookOffset);

    // Smooth follow
    const lerpFactor = 1 - Math.pow(1 - CAMERA_LERP, dt * 60);
    this.cameraTarget.lerp(desiredCameraPos, lerpFactor);
    this.cameraLookTarget.lerp(desiredLookAt, lerpFactor);

    this.camera.position.copy(this.cameraTarget);
    this.camera.lookAt(this.cameraLookTarget);
  }

  private updateHUD(): void {
    const speedEl = this.element?.querySelector('#flight-speed');
    if (speedEl) {
      const speed = Math.floor(this.flightRenderer.shipVelocity.length() * 10);
      speedEl.textContent = String(speed);
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
