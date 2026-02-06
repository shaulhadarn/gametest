attribute float lineDistance;
varying float vLineDistance;

void main() {
  vLineDistance = lineDistance;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
