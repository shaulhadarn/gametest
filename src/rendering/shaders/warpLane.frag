uniform vec3 uColor;
uniform float uTime;
uniform float uOpacity;
varying float vLineDistance;

void main() {
  // Animated flowing energy pattern
  float flow = sin(vLineDistance * 0.5 - uTime * 3.0) * 0.5 + 0.5;
  float flow2 = sin(vLineDistance * 1.2 - uTime * 2.0 + 1.5) * 0.5 + 0.5;
  float pattern = flow * 0.6 + flow2 * 0.4;
  pattern = smoothstep(0.2, 0.8, pattern);

  // Subtle pulse
  float pulse = 0.7 + sin(uTime * 1.2) * 0.15;

  // Bright nodes at regular intervals
  float node = exp(-pow(mod(vLineDistance, 20.0) - 10.0, 2.0) * 0.05);

  float alpha = (pattern * 0.7 + node * 0.3) * uOpacity * pulse;

  vec3 color = uColor * (0.7 + pattern * 0.5 + node * 0.3);

  gl_FragColor = vec4(color, alpha);
}
