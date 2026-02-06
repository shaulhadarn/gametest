uniform vec3 uColor;
uniform float uTime;
varying vec2 vUv;

void main() {
  vec2 center = vUv - 0.5;
  float dist = length(center) * 2.0;
  float angle = atan(center.y, center.x);

  // Soft radial glow
  float radial = exp(-dist * dist * 3.0) * 0.3;

  // Animated corona rays (multiple overlapping frequencies)
  float rays = 0.0;
  rays += pow(abs(cos(angle * 6.0 + uTime * 0.15)), 14.0) * exp(-dist * 1.8) * 0.3;
  rays += pow(abs(cos(angle * 4.0 - uTime * 0.1)), 18.0) * exp(-dist * 1.4) * 0.2;
  rays += pow(abs(cos(angle * 10.0 + uTime * 0.25)), 24.0) * exp(-dist * 2.5) * 0.15;
  rays += pow(abs(cos(angle * 3.0 + uTime * 0.08)), 10.0) * exp(-dist * 1.0) * 0.1;

  // Subtle breathing flicker
  float flicker = 1.0 + sin(uTime * 1.3) * 0.04 + sin(uTime * 2.7 + 1.0) * 0.03;

  float alpha = (radial + rays) * flicker;
  alpha *= smoothstep(1.0, 0.65, dist);

  // Slightly warmer at edges
  vec3 coreColor = uColor * 1.4;
  vec3 edgeColor = uColor * 0.9 + vec3(0.1, 0.05, 0.0);
  vec3 finalColor = mix(coreColor, edgeColor, smoothstep(0.0, 0.6, dist));

  gl_FragColor = vec4(finalColor, alpha);
}
