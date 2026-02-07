// CameraConfig.ts - All tunable constants for the AAA third-person camera system
// Created: Full configuration object with distances, angles, sensitivity, smoothing, FOV, and shoulder offset

export const CameraConfig = {
  // --- Distances ---
  DEFAULT_ARM_LENGTH: 18.0,
  MIN_ARM_LENGTH: 6.0,
  MAX_ARM_LENGTH: 80.0,
  COLLISION_PULL_PADDING: 0.3,

  // --- Angles (radians) ---
  MIN_PITCH: -0.52,        // ~-30 degrees
  MAX_PITCH: 1.22,         // ~70 degrees
  DEFAULT_PITCH: 0.26,     // ~15 degrees
  DEFAULT_YAW: 0,

  // --- Sensitivity ---
  MOUSE_SENSITIVITY_X: 0.002,
  MOUSE_SENSITIVITY_Y: 0.002,
  TOUCH_SENSITIVITY_X: 0.004,
  TOUCH_SENSITIVITY_Y: 0.004,
  ZOOM_SPEED: 2.0,
  PINCH_ZOOM_SPEED: 0.04,

  // --- Smoothing (higher = snappier) ---
  PIVOT_FOLLOW_LERP: 8.0,
  YAW_SMOOTHING: 12.0,
  PITCH_SMOOTHING: 12.0,
  ZOOM_SMOOTHING: 8.0,
  COLLISION_SMOOTHING: 20.0,

  // --- Shoulder Offset (0 = centered behind ship) ---
  SHOULDER_OFFSET_X: 0.0,
  SHOULDER_OFFSET_Y: 0.0,

  // --- Vertical Offset (pivot above ship) ---
  VERTICAL_OFFSET: 4.5,

  // --- Look Ahead ---
  LOOK_AHEAD_DISTANCE: 8.0,

  // --- FOV ---
  DEFAULT_FOV: 60,
  SPRINT_FOV: 80,
  AIM_FOV: 45,
  FOV_TRANSITION_SPEED: 4.0,

  // --- Auto-center ---
  AUTO_CENTER_DELAY: 3.0,
  AUTO_CENTER_DELAY_MOBILE: 0.5,
  AUTO_CENTER_SPEED: 1.5,
  AUTO_CENTER_SPEED_MOBILE: 4.0,

  // --- Touch dead zone ---
  TOUCH_DEAD_ZONE: 2,

  // --- Touch inertia ---
  TOUCH_INERTIA_DURATION: 0.3,
  TOUCH_INERTIA_DECAY: 8.0,

  // --- Max delta time clamp (prevents huge jumps on tab resume) ---
  MAX_DT: 0.1,

  // --- Camera shake reduction on mobile ---
  MOBILE_SHAKE_MULTIPLIER: 0.5,
};
