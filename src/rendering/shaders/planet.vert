varying vec3 vNormal;
varying vec3 vWorldNormal;
varying vec3 vViewPosition;
varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
