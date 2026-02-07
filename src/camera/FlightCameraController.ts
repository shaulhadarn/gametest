// FlightCameraController.ts - Master orchestrator for AAA third-person flight camera
// Created: Owns camera rig, processes unified input, delegates to collision/shake/transitions
// Handles pivot following, orbit (yaw/pitch), zoom, FOV, auto-center, and look-ahead

import * as THREE from 'three';
import { CameraConfig } from './CameraConfig';
import { CameraRig } from './CameraRig';
import { CameraCollision } from './CameraCollision';
import { CameraShake } from './CameraShake';
import { CameraTransitionManager } from './CameraStates';
import { expDecayLerp, smoothVec3, clamp } from './mathUtils';

// Pre-allocated temp objects (zero GC in update loop)
const _targetPivotPos = new THREE.Vector3();
const _pivotWorldPos = new THREE.Vector3();
const _cameraWorldPos = new THREE.Vector3();
const _lookAhead = new THREE.Vector3();
const _shipForward = new THREE.Vector3();

export interface CameraInput {
  orbitDeltaX: number;
  orbitDeltaY: number;
  zoomDelta: number;
  isBoosting: boolean;
}

export class FlightCameraController {
  private rig: CameraRig;
  private collision: CameraCollision;
  private shake: CameraShake;
  private transitions: CameraTransitionManager;

  // Orbit state
  private targetYaw: number;
  private targetPitch: number;
  private currentYaw: number;
  private currentPitch: number;

  // Zoom state
  private targetArmLength: number;
  private currentArmLength: number;

  // FOV
  private currentFov: number;

  // Auto-center timer
  private timeSinceLastInput = 0;

  // Track if active
  private active = false;
  private isMobile = false;

  constructor(camera: THREE.PerspectiveCamera, isMobile: boolean) {
    this.isMobile = isMobile;

    this.rig = new CameraRig(camera);
    this.collision = new CameraCollision();
    this.shake = new CameraShake(isMobile);
    this.transitions = new CameraTransitionManager();

    this.targetYaw = CameraConfig.DEFAULT_YAW;
    this.targetPitch = CameraConfig.DEFAULT_PITCH;
    this.currentYaw = CameraConfig.DEFAULT_YAW;
    this.currentPitch = CameraConfig.DEFAULT_PITCH;

    this.targetArmLength = CameraConfig.DEFAULT_ARM_LENGTH;
    this.currentArmLength = CameraConfig.DEFAULT_ARM_LENGTH;
    this.currentFov = CameraConfig.DEFAULT_FOV;
  }

  /**
   * Add the camera rig to the scene. Call once when entering flight mode.
   */
  activate(scene: THREE.Scene): void {
    this.rig.addToScene(scene);
    this.active = true;
    this.reset();
  }

  /**
   * Remove the rig from the scene. Call when leaving flight mode.
   */
  deactivate(): void {
    this.rig.removeFromScene();
    this.active = false;
  }

  /**
   * Reset all state to defaults.
   */
  reset(): void {
    this.targetYaw = CameraConfig.DEFAULT_YAW;
    this.targetPitch = CameraConfig.DEFAULT_PITCH;
    this.currentYaw = CameraConfig.DEFAULT_YAW;
    this.currentPitch = CameraConfig.DEFAULT_PITCH;
    this.targetArmLength = CameraConfig.DEFAULT_ARM_LENGTH;
    this.currentArmLength = CameraConfig.DEFAULT_ARM_LENGTH;
    this.currentFov = CameraConfig.DEFAULT_FOV;
    this.timeSinceLastInput = 0;
    this.shake.reset();
    this.collision.snapTo(CameraConfig.DEFAULT_ARM_LENGTH);
    this.transitions.transition('EXPLORATION', 0.01);
  }

  /**
   * Set collision objects for the camera to avoid.
   */
  setCollisionObjects(objects: THREE.Object3D[]): void {
    this.collision.setCollisionObjects(objects);
  }

  /**
   * Add trauma for camera shake (0.0 - 1.0).
   */
  addTrauma(amount: number): void {
    this.shake.addTrauma(amount);
  }

  /**
   * Switch camera state (e.g., 'EXPLORATION', 'BOOST', 'AIM', 'CLOSE').
   */
  setState(stateName: string, duration = 0.5): void {
    this.transitions.transition(stateName, duration);
  }

  /**
   * Get the camera rig for direct access if needed.
   */
  getRig(): CameraRig {
    return this.rig;
  }

  /**
   * Main update — call every frame AFTER ship movement, BEFORE render.
   *
   * @param shipPosition  - Ship world position
   * @param shipQuaternion - Ship world rotation as quaternion
   * @param shipVelocity  - Ship velocity vector
   * @param input         - Unified camera input for this frame
   * @param rawDt         - Raw delta time (will be clamped internally)
   */
  update(
    shipPosition: THREE.Vector3,
    shipQuaternion: THREE.Quaternion,
    shipVelocity: THREE.Vector3,
    input: CameraInput,
    rawDt: number,
  ): void {
    if (!this.active) return;

    const dt = Math.min(rawDt, CameraConfig.MAX_DT);

    // --- Update transitions ---
    this.transitions.update(dt);
    const params = this.transitions.getParams();

    // --- Handle state changes based on boost ---
    if (input.isBoosting && this.transitions.currentStateName !== 'BOOST') {
      this.transitions.transition('BOOST', 0.4);
    } else if (!input.isBoosting && this.transitions.currentStateName === 'BOOST') {
      this.transitions.transition('EXPLORATION', 0.6);
    }

    // --- Process orbit input ---
    const hasOrbitInput = Math.abs(input.orbitDeltaX) > 0.001 || Math.abs(input.orbitDeltaY) > 0.001;
    const hasZoomInput = Math.abs(input.zoomDelta) > 0.001;

    if (hasOrbitInput || hasZoomInput) {
      this.timeSinceLastInput = 0;
    } else {
      this.timeSinceLastInput += dt;
    }

    // Accumulate orbit
    const sensX = this.isMobile ? CameraConfig.TOUCH_SENSITIVITY_X : CameraConfig.MOUSE_SENSITIVITY_X;
    const sensY = this.isMobile ? CameraConfig.TOUCH_SENSITIVITY_Y : CameraConfig.MOUSE_SENSITIVITY_Y;

    this.targetYaw -= input.orbitDeltaX * sensX;
    this.targetPitch -= input.orbitDeltaY * sensY;
    this.targetPitch = clamp(this.targetPitch, CameraConfig.MIN_PITCH, CameraConfig.MAX_PITCH);

    // --- Auto-center: slowly return yaw to 0 when no input ---
    if (this.timeSinceLastInput > CameraConfig.AUTO_CENTER_DELAY) {
      this.targetYaw = expDecayLerp(this.targetYaw, 0, CameraConfig.AUTO_CENTER_SPEED, dt);
      this.targetPitch = expDecayLerp(this.targetPitch, params.pitch, CameraConfig.AUTO_CENTER_SPEED * 0.5, dt);
    }

    // --- Smooth orbit ---
    this.currentYaw = expDecayLerp(this.currentYaw, this.targetYaw, CameraConfig.YAW_SMOOTHING, dt);
    this.currentPitch = expDecayLerp(this.currentPitch, this.targetPitch, CameraConfig.PITCH_SMOOTHING, dt);

    // --- Zoom ---
    this.targetArmLength -= input.zoomDelta * CameraConfig.ZOOM_SPEED;
    this.targetArmLength = clamp(this.targetArmLength, CameraConfig.MIN_ARM_LENGTH, CameraConfig.MAX_ARM_LENGTH);

    // Blend target arm length with state arm length
    const stateArmLength = params.armLength;
    const blendedTarget = hasZoomInput || Math.abs(this.targetArmLength - stateArmLength) > 2
      ? this.targetArmLength
      : expDecayLerp(this.targetArmLength, stateArmLength, 2.0, dt);
    this.targetArmLength = blendedTarget;

    this.currentArmLength = expDecayLerp(this.currentArmLength, this.targetArmLength, CameraConfig.ZOOM_SMOOTHING, dt);

    // --- Pivot following ---
    // Target pivot = ship position + vertical offset, rotated by ship orientation
    _targetPivotPos.set(0, params.verticalOffset, 0);
    _targetPivotPos.applyQuaternion(shipQuaternion);
    _targetPivotPos.add(shipPosition);

    // Look-ahead: shift pivot in ship's forward direction based on speed
    const speed = shipVelocity.length();
    _shipForward.set(0, 0, -1).applyQuaternion(shipQuaternion);
    const lookAheadAmount = clamp(speed / 60, 0, 1) * CameraConfig.LOOK_AHEAD_DISTANCE;
    _lookAhead.copy(_shipForward).multiplyScalar(lookAheadAmount);
    _targetPivotPos.add(_lookAhead);

    // Smooth pivot follow
    smoothVec3(this.rig.pivot.position, _targetPivotPos, CameraConfig.PIVOT_FOLLOW_LERP, dt);

    // --- Apply arm rotation (yaw + pitch in ship-relative space) ---
    // The arm rotates relative to the ship's orientation
    // First, set the pivot's quaternion to match the ship
    this.rig.pivot.quaternion.copy(shipQuaternion);

    // Then apply orbit yaw and pitch on top via the arm
    this.rig.arm.rotation.set(this.currentPitch, this.currentYaw, 0);

    // --- Collision resolution ---
    this.rig.getPivotWorldPosition(_pivotWorldPos);
    // Compute where camera would be without collision
    this.rig.setArmLength(this.currentArmLength);
    this.rig.pivot.updateMatrixWorld(true);
    this.rig.getCameraWorldPosition(_cameraWorldPos);

    const effectiveArm = this.collision.resolve(
      _pivotWorldPos,
      _cameraWorldPos,
      this.currentArmLength,
      dt,
    );
    this.rig.setArmLength(effectiveArm);

    // --- Shoulder offset from state ---
    this.rig.setShoulderOffset(params.shoulderOffsetX, params.shoulderOffsetY);

    // --- Camera shake (applied to camera local position, not rig) ---
    this.shake.update(dt);
    this.rig.camera.position.x += this.shake.offsetX;
    this.rig.camera.position.y += this.shake.offsetY;
    this.rig.camera.rotation.z = this.shake.offsetRotation;

    // --- FOV ---
    const targetFov = params.fov;
    this.currentFov = expDecayLerp(this.currentFov, targetFov, CameraConfig.FOV_TRANSITION_SPEED, dt);
    this.rig.camera.fov = this.currentFov;
    this.rig.camera.updateProjectionMatrix();
  }
}
