uniform vec3 uColor;
uniform float uIntensity;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = 1.0 - abs(dot(viewDir, vNormal));
  fresnel = pow(fresnel, 3.0) * uIntensity;
  gl_FragColor = vec4(uColor * fresnel, fresnel);
}
