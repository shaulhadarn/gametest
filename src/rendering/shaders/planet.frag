uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uHasOcean;
uniform float uHasClouds;
uniform float uTime;
uniform float uSeed;
uniform float uSpinAngle;

varying vec3 vNormal;
varying vec3 vWorldNormal;
varying vec3 vViewPosition;
varying vec2 vUv;
varying vec3 vWorldPosition;

// Simplex-style noise using permutation
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

float fbm(vec3 p, float seed) {
  vec3 sp = p + seed * 17.31;
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 5; i++) {
    value += amplitude * snoise(sp * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

void main() {
  // Rotate world normal around Y axis by spin angle for surface rotation
  float cosA = cos(uSpinAngle);
  float sinA = sin(uSpinAngle);
  vec3 rotatedNormal = vec3(
    vWorldNormal.x * cosA + vWorldNormal.z * sinA,
    vWorldNormal.y,
    -vWorldNormal.x * sinA + vWorldNormal.z * cosA
  );

  // Use rotated normal as base coordinates for noise (sphere mapping)
  vec3 noiseCoord = rotatedNormal * 2.5;

  // Terrain noise
  float terrain = fbm(noiseCoord, uSeed);
  float terrain2 = fbm(noiseCoord * 1.5, uSeed + 5.0);

  // Mix terrain colors
  float t = terrain * 0.5 + 0.5;
  vec3 landColor = mix(uColor1, uColor2, smoothstep(0.3, 0.7, t));
  landColor = mix(landColor, uColor3, smoothstep(0.6, 0.9, terrain2 * 0.5 + 0.5));

  vec3 finalColor = landColor;

  // Ocean
  if (uHasOcean > 0.5) {
    float oceanMask = smoothstep(-0.05, 0.05, -terrain);
    vec3 oceanColor = uColor1 * 0.8;
    // Slight specular-like shimmer on ocean
    float oceanDetail = snoise(noiseCoord * 8.0 + uTime * 0.1) * 0.1;
    oceanColor += oceanDetail;
    finalColor = mix(finalColor, oceanColor, oceanMask);
  }

  // Simple directional lighting (sun is at origin in system view)
  vec3 lightDir = normalize(-vWorldPosition);
  float NdotL = max(dot(vWorldNormal, lightDir), 0.0);
  float ambient = 0.08;
  float diffuse = NdotL * 0.9;

  finalColor *= (ambient + diffuse);

  // Clouds
  if (uHasClouds > 0.5) {
    float slowTime = uTime * 0.02;
    float clouds = fbm(noiseCoord * 3.0 + vec3(slowTime, 0.0, slowTime * 0.5), uSeed + 10.0);
    float cloudMask = smoothstep(0.0, 0.4, clouds);
    vec3 cloudColor = vec3(1.0) * (ambient + diffuse * 1.1);
    finalColor = mix(finalColor, cloudColor, cloudMask * 0.4);
  }

  // Fresnel rim glow for atmosphere
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = 1.0 - abs(dot(viewDir, vNormal));
  fresnel = pow(fresnel, 3.0);
  vec3 rimColor = mix(uColor1, vec3(0.5, 0.7, 1.0), 0.5);
  finalColor += rimColor * fresnel * 0.3;

  gl_FragColor = vec4(finalColor, 1.0);
}
