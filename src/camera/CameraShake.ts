// CameraShake.ts - Trauma-based procedural camera shake system
// Created: Adds organic shake using noise functions, with mobile intensity reduction

import { CameraConfig } from './CameraConfig';
import { clamp, noise1D } from './mathUtils';

const TRAUMA_DECAY = 1.5;
const MAX_SHAKE_OFFSET = 0.6;
const MAX_SHAKE_ROTATION = 0.03;
const SHAKE_FREQUENCY = 12.0;

export class CameraShake {
  private trauma = 0;
  private time = 0;
  private isMobile: boolean;

  // Output offsets — read by the controller each frame
  offsetX = 0;
  offsetY = 0;
  offsetRotation = 0;

  constructor(isMobile: boolean) {
    this.isMobile = isMobile;
  }

  /**
   * Add trauma from a game event (0.0 - 1.0).
   */
  addTrauma(amount: number): void {
    this.trauma = clamp(this.trauma + amount, 0, 1);
  }

  /**
   * Update shake offsets. Call once per frame.
   */
  update(dt: number): void {
    this.time += dt;

    // Decay trauma
    this.trauma = Math.max(this.trauma - TRAUMA_DECAY * dt, 0);

    // Quadratic intensity for natural feel
    const shake = this.trauma * this.trauma;
    const mobileMul = this.isMobile ? CameraConfig.MOBILE_SHAKE_MULTIPLIER : 1.0;
    const intensity = shake * mobileMul;

    if (intensity < 0.001) {
      this.offsetX = 0;
      this.offsetY = 0;
      this.offsetRotation = 0;
      return;
    }

    const t = this.time * SHAKE_FREQUENCY;

    this.offsetX = MAX_SHAKE_OFFSET * intensity * noise1D(t, 1.0);
    this.offsetY = MAX_SHAKE_OFFSET * intensity * noise1D(t, 2.0);
    this.offsetRotation = MAX_SHAKE_ROTATION * intensity * noise1D(t, 3.0);
  }

  /**
   * Reset all shake state.
   */
  reset(): void {
    this.trauma = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.offsetRotation = 0;
  }
}
