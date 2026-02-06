uniform float uTime;
uniform vec3 uColor;
uniform vec3 uColor2;
uniform float uOpacity;
uniform float uDetail;
varying vec2 vUv;

// Simplex-style noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p, int octaves) {
  float f = 0.0;
  float w = 0.5;
  for (int i = 0; i < 7; i++) {
    if (i >= octaves) break;
    f += w * snoise(p);
    p *= 2.0;
    w *= 0.5;
  }
  return f;
}

void main() {
  vec2 uv = vUv * 3.0;
  float t = uTime * 0.008;

  // Multi-layered noise for rich structure
  float n1 = fbm(uv + t, 5);
  float n2 = fbm(uv * 1.5 - t * 0.7 + 3.7, 4);
  float n3 = fbm(uv * 0.5 + t * 0.3 + vec2(n1 * 0.3, n2 * 0.3), 6);

  // Domain warping for organic shapes
  float warped = fbm(uv + vec2(n1 * 0.4, n2 * 0.4) + t * 0.5, 5);

  n1 = (n1 + 1.0) * 0.5;
  n2 = (n2 + 1.0) * 0.5;
  n3 = (n3 + 1.0) * 0.5;
  warped = (warped + 1.0) * 0.5;

  // Combine with non-linear blending
  float density = pow(n1, 1.5) * 0.4 + pow(warped, 2.0) * 0.4 + pow(n3, 2.5) * 0.2;

  // Color gradient between primary and secondary
  vec3 color = mix(uColor2, uColor, pow(n2, 0.8));
  // Bright edges where density transitions
  float edge = abs(n1 - n2) * 2.0;
  color += vec3(0.15, 0.1, 0.2) * edge * density;

  color *= density * 2.0;

  float alpha = density * uOpacity;

  // Smooth circular fade
  vec2 center = vUv - 0.5;
  float edgeFade = 1.0 - smoothstep(0.25, 0.5, length(center));
  alpha *= edgeFade;

  gl_FragColor = vec4(color, alpha);
}
