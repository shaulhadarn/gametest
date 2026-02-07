// CameraRig.ts - Pivot/arm/camera hierarchy for AAA third-person camera
// Created: Scene graph hierarchy with pivot (follows ship), arm (orbit rotation), camera (positioned at arm length)

import * as THREE from 'three';
import { CameraConfig } from './CameraConfig';

/**
 * Scene graph:
 *   cameraPivot (Object3D)          ← follows ship position + vertical offset
 *     └── cameraArm (Object3D)      ← rotated by yaw/pitch input (YXZ order)
 *         └── camera (PerspectiveCamera) ← positioned at arm length on local +Z
 */
export class CameraRig {
  readonly pivot: THREE.Object3D;
  readonly arm: THREE.Object3D;
  readonly camera: THREE.PerspectiveCamera;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;

    this.pivot = new THREE.Object3D();
    this.pivot.name = 'cameraPivot';

    this.arm = new THREE.Object3D();
    this.arm.name = 'cameraArm';
    this.arm.rotation.order = 'YXZ';

    this.pivot.add(this.arm);
    this.arm.add(this.camera);

    // Detach camera from any previous parent
    if (this.camera.parent && this.camera.parent !== this.arm) {
      this.camera.removeFromParent();
      this.arm.add(this.camera);
    }

    // Set initial arm rotation
    this.arm.rotation.set(CameraConfig.DEFAULT_PITCH, CameraConfig.DEFAULT_YAW, 0);

    // Set initial camera position on arm
    this.camera.position.set(
      CameraConfig.SHOULDER_OFFSET_X,
      CameraConfig.SHOULDER_OFFSET_Y,
      CameraConfig.DEFAULT_ARM_LENGTH
    );

    // Reset camera rotation (arm controls orientation)
    this.camera.rotation.set(0, 0, 0);
  }

  /**
   * Add the rig to a scene. Call once after construction.
   */
  addToScene(scene: THREE.Scene): void {
    scene.add(this.pivot);
  }

  /**
   * Remove the rig from the scene. Call on cleanup.
   */
  removeFromScene(): void {
    this.pivot.removeFromParent();
  }

  /**
   * Update the camera's local Z position (arm length) and shoulder offset.
   */
  setArmLength(length: number): void {
    this.camera.position.z = length;
  }

  /**
   * Update shoulder offset.
   */
  setShoulderOffset(x: number, y: number): void {
    this.camera.position.x = x;
    this.camera.position.y = y;
  }

  /**
   * Get the camera's world position (pre-allocated, no GC).
   */
  getCameraWorldPosition(out: THREE.Vector3): THREE.Vector3 {
    this.camera.getWorldPosition(out);
    return out;
  }

  /**
   * Get the pivot's world position.
   */
  getPivotWorldPosition(out: THREE.Vector3): THREE.Vector3 {
    this.pivot.getWorldPosition(out);
    return out;
  }
}
