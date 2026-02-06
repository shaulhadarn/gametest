uniform float uTime;
uniform float uRadius;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
varying vec2 vUv;
varying vec3 vWorldPos;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m * m * m;
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

float fbm(vec2 p) {
  float f = 0.0;
  float w = 0.5;
  for (int i = 0; i < 5; i++) {
    f += w * snoise(p);
    p *= 2.0;
    w *= 0.5;
  }
  return f;
}

void main() {
  vec2 worldUV = vWorldPos.xz / uRadius;
  float distFromCenter = length(worldUV);

  // Polar coordinates
  float angle = atan(worldUV.y, worldUV.x);

  // Two-arm spiral pattern
  float spiral1 = sin(angle * 2.0 - distFromCenter * 9.0 + uTime * 0.015) * 0.5 + 0.5;
  float spiral2 = sin(angle * 2.0 + 3.14159 - distFromCenter * 9.0 + uTime * 0.015) * 0.5 + 0.5;
  float spiralMax = max(spiral1, spiral2);

  // Tertiary arm (weaker)
  float spiral3 = sin(angle * 3.0 - distFromCenter * 6.0 - uTime * 0.01) * 0.5 + 0.5;

  // Noise layers for organic variation
  float n1 = snoise(worldUV * 3.0 + uTime * 0.004) * 0.5 + 0.5;
  float n2 = snoise(worldUV * 7.0 - uTime * 0.003) * 0.5 + 0.5;
  float n3 = fbm(worldUV * 2.0 + vec2(n1 * 0.3, n2 * 0.2));
  n3 = n3 * 0.5 + 0.5;

  // Radial density: bright core, fading at edges
  float coreBright = exp(-distFromCenter * distFromCenter * 6.0) * 0.6;
  float radialFade = 1.0 - smoothstep(0.25, 1.0, distFromCenter);

  // Combine spiral + noise
  float armDensity = spiralMax * 0.5 + spiral3 * 0.15 + n1 * 0.2 + n2 * 0.15;
  armDensity *= radialFade;
  armDensity = pow(armDensity, 1.3);

  float totalDensity = armDensity + coreBright;

  // Color blending: different regions get different hues
  vec3 armColor = mix(uColor1, uColor2, spiralMax);
  armColor = mix(armColor, uColor3, spiral3 * 0.4);
  // Core is warmer
  vec3 coreColor = mix(uColor4, uColor2, 0.3);
  vec3 color = mix(armColor, coreColor, coreBright / (totalDensity + 0.001));

  // Bright filaments along spiral edges
  float edge = abs(spiral1 - 0.5) * 2.0;
  float filament = pow(1.0 - edge, 8.0) * radialFade * n3;
  color += vec3(0.15, 0.1, 0.25) * filament;

  // Fine dust detail
  float dust = snoise(worldUV * 15.0 + uTime * 0.002) * 0.5 + 0.5;
  color *= (0.85 + dust * 0.15);

  color *= totalDensity;

  float alpha = totalDensity * 0.18 * radialFade;
  // Boost core alpha
  alpha += coreBright * 0.1;

  gl_FragColor = vec4(color, alpha);
}
