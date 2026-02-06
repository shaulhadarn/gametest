attribute float size;
attribute float twinkleSpeed;
attribute float twinklePhase;

uniform float uTime;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = color;

  // Twinkle effect
  float twinkle = 0.7 + 0.3 * sin(uTime * twinkleSpeed + twinklePhase);
  vAlpha = twinkle;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * (300.0 / -mvPosition.z);
  gl_PointSize = clamp(gl_PointSize, 0.5, 4.0);
  gl_Position = projectionMatrix * mvPosition;
}
