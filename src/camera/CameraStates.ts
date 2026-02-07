// CameraStates.ts - Camera state definitions and transition manager
// Created: State machine with smooth blending between exploration, combat, boost, and aim states

import { CameraConfig } from './CameraConfig';
import { expDecayLerp, easeInOutCubic, clamp } from './mathUtils';

export interface CameraStateParams {
  armLength: number;
  pitch: number;
  fov: number;
  shoulderOffsetX: number;
  shoulderOffsetY: number;
  verticalOffset: number;
}

export const CAMERA_STATES: Record<string, CameraStateParams> = {
  EXPLORATION: {
    armLength: CameraConfig.DEFAULT_ARM_LENGTH,
    pitch: CameraConfig.DEFAULT_PITCH,
    fov: CameraConfig.DEFAULT_FOV,
    shoulderOffsetX: CameraConfig.SHOULDER_OFFSET_X,
    shoulderOffsetY: CameraConfig.SHOULDER_OFFSET_Y,
    verticalOffset: CameraConfig.VERTICAL_OFFSET,
  },
  BOOST: {
    armLength: CameraConfig.DEFAULT_ARM_LENGTH + 8,
    pitch: CameraConfig.DEFAULT_PITCH + 0.05,
    fov: CameraConfig.SPRINT_FOV,
    shoulderOffsetX: CameraConfig.SHOULDER_OFFSET_X,
    shoulderOffsetY: CameraConfig.SHOULDER_OFFSET_Y,
    verticalOffset: CameraConfig.VERTICAL_OFFSET + 1,
  },
  AIM: {
    armLength: 8.0,
    pitch: 0.09,
    fov: CameraConfig.AIM_FOV,
    shoulderOffsetX: 0.0,
    shoulderOffsetY: 0.0,
    verticalOffset: CameraConfig.VERTICAL_OFFSET - 1,
  },
  CLOSE: {
    armLength: 10.0,
    pitch: 0.17,
    fov: 55,
    shoulderOffsetX: 0.0,
    shoulderOffsetY: 0.0,
    verticalOffset: CameraConfig.VERTICAL_OFFSET - 0.5,
  },
};

export class CameraTransitionManager {
  private sourceParams: CameraStateParams | null = null;
  private targetParams: CameraStateParams;
  private currentParams: CameraStateParams;
  private transitionTimer = 0;
  private transitionDuration = 0;
  private isTransitioning = false;
  currentStateName = 'EXPLORATION';

  constructor() {
    this.targetParams = { ...CAMERA_STATES.EXPLORATION };
    this.currentParams = { ...CAMERA_STATES.EXPLORATION };
  }

  /**
   * Start a transition to a new camera state.
   */
  transition(stateName: string, duration = 0.5): void {
    const newState = CAMERA_STATES[stateName];
    if (!newState) return;
    if (stateName === this.currentStateName && !this.isTransitioning) return;

    this.sourceParams = { ...this.currentParams };
    this.targetParams = { ...newState };
    this.transitionTimer = 0;
    this.transitionDuration = duration;
    this.isTransitioning = true;
    this.currentStateName = stateName;
  }

  /**
   * Update transition blending. Call once per frame.
   */
  update(dt: number): void {
    if (!this.isTransitioning || !this.sourceParams) return;

    this.transitionTimer += dt;
    let t = clamp(this.transitionTimer / this.transitionDuration, 0, 1);
    t = easeInOutCubic(t);

    this.currentParams.armLength = this.sourceParams.armLength + (this.targetParams.armLength - this.sourceParams.armLength) * t;
    this.currentParams.pitch = this.sourceParams.pitch + (this.targetParams.pitch - this.sourceParams.pitch) * t;
    this.currentParams.fov = this.sourceParams.fov + (this.targetParams.fov - this.sourceParams.fov) * t;
    this.currentParams.shoulderOffsetX = this.sourceParams.shoulderOffsetX + (this.targetParams.shoulderOffsetX - this.sourceParams.shoulderOffsetX) * t;
    this.currentParams.shoulderOffsetY = this.sourceParams.shoulderOffsetY + (this.targetParams.shoulderOffsetY - this.sourceParams.shoulderOffsetY) * t;
    this.currentParams.verticalOffset = this.sourceParams.verticalOffset + (this.targetParams.verticalOffset - this.sourceParams.verticalOffset) * t;

    if (t >= 1.0) {
      this.isTransitioning = false;
      this.sourceParams = null;
    }
  }

  /**
   * Get the current blended parameters.
   */
  getParams(): CameraStateParams {
    return this.currentParams;
  }

  /**
   * Check if currently transitioning.
   */
  getIsTransitioning(): boolean {
    return this.isTransitioning;
  }
}
