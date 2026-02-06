import * as THREE from 'three';
import {
  CAMERA_MIN_DISTANCE,
  CAMERA_MAX_DISTANCE,
  CAMERA_DEFAULT_DISTANCE,
} from '@/core/Constants';

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;

  // Orbital params
  private spherical = new THREE.Spherical(
    CAMERA_DEFAULT_DISTANCE,
    Math.PI * 0.35, // phi (elevation)
    0                // theta (rotation)
  );
  private target = new THREE.Vector3(0, 0, 0);

  // Interaction state
  private isDragging = false;
  private isPanning = false;
  private previousMouse = new THREE.Vector2();

  // Touch state
  private touchCount = 0;
  private lastPinchDist = 0;
  private touchPrevCenter = new THREE.Vector2();
  private touchPrevMouse = new THREE.Vector2();

  // Animation
  private animating = false;
  private animTarget = new THREE.Vector3();
  private animSpherical = new THREE.Spherical();
  private animStartTarget = new THREE.Vector3();
  private animStartSpherical = new THREE.Spherical();
  private animProgress = 0;
  private animDuration = 0.5; // seconds

  // Sensitivity
  private rotateSensitivity = 0.005;
  private panSensitivity = 0.5;
  private zoomSensitivity = 0.1;

  constructor(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
    this.camera = camera;
    this.canvas = canvas;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch gestures
    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
    canvas.addEventListener('touchcancel', this.onTouchEnd.bind(this), { passive: false });

    this.updateCamera();
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 2) {
      // Right click - rotate
      this.isDragging = true;
      this.animating = false;
    } else if (e.button === 1) {
      // Middle click - pan
      this.isPanning = true;
      this.animating = false;
    }
    this.previousMouse.set(e.clientX, e.clientY);
  }

  private onMouseMove(e: MouseEvent): void {
    const dx = e.clientX - this.previousMouse.x;
    const dy = e.clientY - this.previousMouse.y;
    this.previousMouse.set(e.clientX, e.clientY);

    if (this.isDragging) {
      this.spherical.theta -= dx * this.rotateSensitivity;
      this.spherical.phi = THREE.MathUtils.clamp(
        this.spherical.phi - dy * this.rotateSensitivity,
        0.1,
        Math.PI * 0.45
      );
      this.updateCamera();
    }

    if (this.isPanning) {
      this.applyPan(dx, dy);
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    this.isDragging = false;
    this.isPanning = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const factor = 1 + Math.sign(e.deltaY) * this.zoomSensitivity;
    this.spherical.radius = THREE.MathUtils.clamp(
      this.spherical.radius * factor,
      CAMERA_MIN_DISTANCE,
      CAMERA_MAX_DISTANCE
    );
    this.animating = false;
    this.updateCamera();
  }

  // --- Touch gestures ---

  private onTouchStart(e: TouchEvent): void {
    this.touchCount = e.touches.length;
    this.animating = false;

    if (e.touches.length === 1) {
      this.touchPrevMouse.set(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      this.lastPinchDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      this.touchPrevCenter.set(
        (a.clientX + b.clientX) / 2,
        (a.clientY + b.clientY) / 2,
      );
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (e.touches.length === 1 && this.touchCount === 1) {
      // 1-finger drag = rotate
      const t = e.touches[0];
      const dx = t.clientX - this.touchPrevMouse.x;
      const dy = t.clientY - this.touchPrevMouse.y;
      this.touchPrevMouse.set(t.clientX, t.clientY);

      this.spherical.theta -= dx * this.rotateSensitivity;
      this.spherical.phi = THREE.MathUtils.clamp(
        this.spherical.phi - dy * this.rotateSensitivity,
        0.1,
        Math.PI * 0.45,
      );
      this.updateCamera();
    } else if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];

      // Pinch zoom
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (this.lastPinchDist > 0) {
        const factor = this.lastPinchDist / dist;
        this.spherical.radius = THREE.MathUtils.clamp(
          this.spherical.radius * factor,
          CAMERA_MIN_DISTANCE,
          CAMERA_MAX_DISTANCE,
        );
      }
      this.lastPinchDist = dist;

      // 2-finger pan
      const cx = (a.clientX + b.clientX) / 2;
      const cy = (a.clientY + b.clientY) / 2;
      const dx = cx - this.touchPrevCenter.x;
      const dy = cy - this.touchPrevCenter.y;
      this.touchPrevCenter.set(cx, cy);
      this.applyPan(dx, dy);
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    this.touchCount = e.touches.length;
    // Handle 2->1 finger transition
    if (e.touches.length === 1) {
      this.touchPrevMouse.set(e.touches[0].clientX, e.touches[0].clientY);
      this.lastPinchDist = 0;
    } else if (e.touches.length === 0) {
      this.lastPinchDist = 0;
    }
  }

  private applyPan(dx: number, dy: number): void {
    const panOffset = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();

    right.setFromMatrixColumn(this.camera.matrixWorld, 0);
    up.setFromMatrixColumn(this.camera.matrixWorld, 1);

    const panScale = this.spherical.radius * this.panSensitivity * 0.002;
    panOffset.addScaledVector(right, -dx * panScale);
    panOffset.addScaledVector(up, dy * panScale);

    this.target.add(panOffset);
    this.updateCamera();
  }

  private updateCamera(): void {
    const pos = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(pos);
    this.camera.lookAt(this.target);
  }

  /** Smoothly animate camera to look at a position */
  animateTo(target: THREE.Vector3, distance?: number): void {
    this.animStartTarget.copy(this.target);
    this.animStartSpherical.copy(this.spherical);

    this.animTarget.copy(target);
    this.animSpherical.copy(this.spherical);
    if (distance !== undefined) {
      this.animSpherical.radius = distance;
    }

    this.animProgress = 0;
    this.animating = true;
  }

  update(deltaTime: number): void {
    if (!this.animating) return;

    this.animProgress += deltaTime / this.animDuration;
    if (this.animProgress >= 1) {
      this.animProgress = 1;
      this.animating = false;
    }

    // Smooth step easing
    const t = this.animProgress * this.animProgress * (3 - 2 * this.animProgress);

    this.target.lerpVectors(this.animStartTarget, this.animTarget, t);
    this.spherical.radius = THREE.MathUtils.lerp(
      this.animStartSpherical.radius,
      this.animSpherical.radius,
      t
    );
    this.spherical.phi = THREE.MathUtils.lerp(
      this.animStartSpherical.phi,
      this.animSpherical.phi,
      t
    );
    this.spherical.theta = THREE.MathUtils.lerp(
      this.animStartSpherical.theta,
      this.animSpherical.theta,
      t
    );

    this.updateCamera();
  }

  /** Save current camera state for later restoration */
  saveState(): { target: THREE.Vector3; spherical: THREE.Spherical } {
    return {
      target: this.target.clone(),
      spherical: this.spherical.clone(),
    };
  }

  /** Restore a previously saved camera state */
  restoreState(state: { target: THREE.Vector3; spherical: THREE.Spherical }): void {
    this.target.copy(state.target);
    this.spherical.copy(state.spherical);
    this.animating = false;
    this.updateCamera();
  }

  /** Set camera to view system at origin */
  setSystemView(): void {
    this.target.set(0, 0, 0);
    this.spherical.set(80, Math.PI * 0.3, 0);
    this.animating = false;
    this.updateCamera();
  }

  getTarget(): THREE.Vector3 {
    return this.target.clone();
  }

  dispose(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.removeEventListener('wheel', this.onWheel.bind(this));
  }
}
