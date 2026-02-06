uniform vec3 uColor;
uniform float uIntensity;
uniform float uTime;
varying vec2 vUv;

void main() {
  vec2 center = vUv - 0.5;
  float dist = length(center) * 2.0;

  // Circular mask
  float mask = 1.0 - smoothstep(0.7, 1.0, dist);

  // Core glow - very tight and intense white-hot center
  float core = exp(-dist * dist * 18.0) * uIntensity * 1.4;

  // Inner halo - bright colored ring
  float halo = exp(-dist * dist * 5.0) * uIntensity * 0.55;

  // Outer halo - soft and wide
  float outer = exp(-dist * dist * 1.8) * uIntensity * 0.22;

  // Far outer corona (faint atmospheric glow)
  float corona = exp(-dist * dist * 0.5) * uIntensity * 0.08;

  // 4-point diffraction spikes
  float angle = atan(center.y, center.x);
  float spikes4 = pow(abs(cos(angle * 2.0)), 36.0);
  float spikeGlow = spikes4 * exp(-dist * 1.8) * uIntensity * 0.3;

  // 6-point secondary spikes (fainter, rotated)
  float spikes6 = pow(abs(cos(angle * 3.0 + 0.52)), 44.0);
  float spike6Glow = spikes6 * exp(-dist * 2.5) * uIntensity * 0.12;

  // Subtle shimmer/scintillation - gentle pulsing
  float shimmer = 1.0 + sin(uTime * 2.5 + dist * 10.0) * 0.06;
  float shimmer2 = 1.0 + sin(uTime * 1.7 - angle * 3.0) * 0.03;
  float pulse = 1.0 + sin(uTime * 0.8) * 0.05;

  float totalGlow = (core + halo + outer + corona + spikeGlow + spike6Glow) * shimmer * shimmer2 * pulse * mask;

  // Chromatic shift: white-hot core, colored halo, cooler corona
  vec3 coreColor = vec3(1.0, 0.97, 0.95); // Near-white hot center
  vec3 haloColor = uColor * 1.2 + vec3(0.08, 0.04, -0.02);
  vec3 coronaColor = uColor * 0.6 + vec3(0.02, 0.02, 0.06);
  vec3 finalColor = mix(coronaColor, mix(haloColor, coreColor, smoothstep(0.25, 0.0, dist)), smoothstep(0.5, 0.0, dist)) * totalGlow;

  gl_FragColor = vec4(finalColor, totalGlow);
}
