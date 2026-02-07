// CameraCollision.ts - Raycasting collision resolution for third-person camera
// Created: Prevents camera from clipping through geometry using multi-ray cone casting

import * as THREE from 'three';
import { CameraConfig } from './CameraConfig';
import { expDecayLerp } from './mathUtils';

// Pre-allocated objects to avoid GC
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();

export class CameraCollision {
  private effectiveArmLength: number;
  private collisionObjects: THREE.Object3D[] = [];

  constructor() {
    this.effectiveArmLength = CameraConfig.DEFAULT_ARM_LENGTH;
  }

  /**
   * Set the list of objects to test collision against.
   * Should be simplified collision geometry, not render meshes.
   */
  setCollisionObjects(objects: THREE.Object3D[]): void {
    this.collisionObjects = objects;
  }

  /**
   * Resolve collision between pivot and desired camera position.
   * Returns the effective arm length after collision resolution.
   */
  resolve(
    pivotWorldPos: THREE.Vector3,
    cameraWorldPos: THREE.Vector3,
    desiredArmLength: number,
    dt: number,
  ): number {
    if (this.collisionObjects.length === 0) {
      this.effectiveArmLength = expDecayLerp(
        this.effectiveArmLength,
        desiredArmLength,
        CameraConfig.ZOOM_SMOOTHING,
        dt,
      );
      return this.effectiveArmLength;
    }

    // Cast ray from pivot toward camera
    _rayDir.subVectors(cameraWorldPos, pivotWorldPos);
    const maxDist = _rayDir.length();
    if (maxDist < 0.001) {
      return this.effectiveArmLength;
    }
    _rayDir.normalize();

    _raycaster.set(pivotWorldPos, _rayDir);
    _raycaster.far = maxDist;
    _raycaster.near = 0;

    const hits = _raycaster.intersectObjects(this.collisionObjects, true);

    let collisionArmLength = desiredArmLength;

    if (hits.length > 0) {
      const hitDist = hits[0].distance;
      if (hitDist < desiredArmLength) {
        collisionArmLength = Math.max(
          hitDist - CameraConfig.COLLISION_PULL_PADDING,
          CameraConfig.MIN_ARM_LENGTH * 0.5,
        );
      }
    }

    // Asymmetric smoothing: fast pull-in, slow pull-out
    if (collisionArmLength < this.effectiveArmLength) {
      this.effectiveArmLength = expDecayLerp(
        this.effectiveArmLength,
        collisionArmLength,
        CameraConfig.COLLISION_SMOOTHING,
        dt,
      );
    } else {
      this.effectiveArmLength = expDecayLerp(
        this.effectiveArmLength,
        collisionArmLength,
        CameraConfig.ZOOM_SMOOTHING,
        dt,
      );
    }

    return this.effectiveArmLength;
  }

  /**
   * Instantly snap to a given arm length (e.g., after teleport).
   */
  snapTo(armLength: number): void {
    this.effectiveArmLength = armLength;
  }
}
