// mathUtils.ts - Frame-rate independent smoothing utilities and math helpers
// Created: expDecayLerp, clamp, simplex noise for camera system

import * as THREE from 'three';

/**
 * Frame-rate independent exponential decay smoothing.
 * @param current - Current value
 * @param target  - Target value
 * @param speed   - Convergence speed (higher = faster, 1-20 typical)
 * @param dt      - Delta time in seconds
 */
export function expDecayLerp(current: number, target: number, speed: number, dt: number): number {
  return target + (current - target) * Math.exp(-speed * dt);
}

// Pre-allocated output vector — reuse to avoid GC
const _vec3Out = new THREE.Vector3();

/**
 * Frame-rate independent Vector3 smoothing (mutates `out`).
 */
export function expDecayLerpVec3(
  out: THREE.Vector3,
  current: THREE.Vector3,
  target: THREE.Vector3,
  speed: number,
  dt: number,
): THREE.Vector3 {
  const factor = Math.exp(-speed * dt);
  out.x = target.x + (current.x - target.x) * factor;
  out.y = target.y + (current.y - target.y) * factor;
  out.z = target.z + (current.z - target.z) * factor;
  return out;
}

/**
 * Convenience: smooth a Vector3 in-place toward target.
 */
export function smoothVec3(current: THREE.Vector3, target: THREE.Vector3, speed: number, dt: number): void {
  const factor = Math.exp(-speed * dt);
  current.x = target.x + (current.x - target.x) * factor;
  current.y = target.y + (current.y - target.y) * factor;
  current.z = target.z + (current.z - target.z) * factor;
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * Ease in-out cubic for smooth transitions.
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// --- Simple noise for camera shake (no dependency needed) ---
// Based on a simple hash-based value noise with smooth interpolation

function hashNoise(x: number): number {
  const n = Math.sin(x * 127.1 + x * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f); // smoothstep
  return hashNoise(i) * (1 - u) + hashNoise(i + 1) * u;
}

/**
 * Simple 1D noise function for camera shake. Returns 0-1 range.
 * Use different seeds for different axes.
 */
export function noise1D(time: number, seed: number): number {
  return smoothNoise(time + seed * 100) * 2 - 1; // returns -1 to 1
}
