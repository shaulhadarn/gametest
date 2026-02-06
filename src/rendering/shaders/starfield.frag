varying vec3 vColor;
varying float vAlpha;

void main() {
  // Soft circular point
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center) * 2.0;
  float alpha = 1.0 - smoothstep(0.0, 1.0, dist);
  alpha *= alpha; // sharper falloff

  // Core brightness
  float core = exp(-dist * dist * 4.0);
  vec3 color = vColor * (0.6 + core * 0.6);

  gl_FragColor = vec4(color, alpha * vAlpha * 0.85);
}
