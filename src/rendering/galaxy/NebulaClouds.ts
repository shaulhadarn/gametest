import * as THREE from 'three';
import nebulaVert from '@/rendering/shaders/nebula.vert';
import nebulaFrag from '@/rendering/shaders/nebula.frag';

interface NebulaPreset {
  color1: THREE.Color;
  color2: THREE.Color;
  opacity: number;
  scale: number;
}

const NEBULA_PRESETS: NebulaPreset[] = [
  // Pillars of Creation - blue/purple
  { color1: new THREE.Color(0.25, 0.08, 0.55), color2: new THREE.Color(0.12, 0.18, 0.65), opacity: 0.14, scale: 1.2 },
  // Emission nebula - red/magenta
  { color1: new THREE.Color(0.55, 0.05, 0.15), color2: new THREE.Color(0.7, 0.12, 0.35), opacity: 0.11, scale: 1.0 },
  // Reflection nebula - teal/cyan
  { color1: new THREE.Color(0.06, 0.35, 0.45), color2: new THREE.Color(0.1, 0.5, 0.55), opacity: 0.10, scale: 1.1 },
  // Planetary nebula - green/yellow
  { color1: new THREE.Color(0.12, 0.45, 0.15), color2: new THREE.Color(0.45, 0.55, 0.08), opacity: 0.08, scale: 0.7 },
  // Dark nebula - deep blue/indigo
  { color1: new THREE.Color(0.06, 0.04, 0.25), color2: new THREE.Color(0.15, 0.08, 0.45), opacity: 0.18, scale: 1.5 },
  // Warm glow - orange/amber
  { color1: new THREE.Color(0.6, 0.22, 0.06), color2: new THREE.Color(0.55, 0.35, 0.08), opacity: 0.09, scale: 0.9 },
  // Ice nebula - white-blue
  { color1: new THREE.Color(0.2, 0.25, 0.55), color2: new THREE.Color(0.35, 0.4, 0.65), opacity: 0.07, scale: 1.3 },
  // Rose nebula - pink/salmon
  { color1: new THREE.Color(0.5, 0.1, 0.25), color2: new THREE.Color(0.45, 0.2, 0.45), opacity: 0.10, scale: 0.8 },
  // Supernova remnant - hot white/blue
  { color1: new THREE.Color(0.3, 0.35, 0.7), color2: new THREE.Color(0.5, 0.5, 0.8), opacity: 0.06, scale: 0.6 },
  // Crimson veil - deep red
  { color1: new THREE.Color(0.5, 0.03, 0.08), color2: new THREE.Color(0.35, 0.08, 0.2), opacity: 0.12, scale: 1.1 },
  // Emerald mist - green
  { color1: new THREE.Color(0.05, 0.3, 0.12), color2: new THREE.Color(0.08, 0.45, 0.2), opacity: 0.08, scale: 0.9 },
  // Golden haze - warm gold
  { color1: new THREE.Color(0.5, 0.35, 0.05), color2: new THREE.Color(0.6, 0.4, 0.1), opacity: 0.07, scale: 0.8 },
];

export class NebulaClouds {
  private scene: THREE.Scene;
  private meshes: THREE.Mesh[] = [];
  private materials: THREE.ShaderMaterial[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  build(count: number = 12, galaxyRadius: number = 300): void {
    this.clear();

    // Main nebula clouds scattered around galaxy
    for (let i = 0; i < count; i++) {
      const preset = NEBULA_PRESETS[i % NEBULA_PRESETS.length];
      const size = (120 + Math.random() * 250) * preset.scale;
      this.createCloud(preset, size, galaxyRadius, i, count);
    }

    // Large background nebulae (very faint, very large, behind everything)
    const bgCount = Math.max(1, Math.floor(4 * (count / 12)));
    for (let i = 0; i < bgCount; i++) {
      const preset = NEBULA_PRESETS[(i * 3 + 2) % NEBULA_PRESETS.length];
      const size = (350 + Math.random() * 300) * preset.scale;
      const angle = (i / bgCount) * Math.PI * 2 + 0.5;
      const r = galaxyRadius * (0.4 + Math.random() * 0.4);

      const geometry = new THREE.PlaneGeometry(size, size);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: Math.random() * 100 },
          uColor: { value: preset.color1.clone().multiplyScalar(0.6) },
          uColor2: { value: preset.color2.clone().multiplyScalar(0.6) },
          uOpacity: { value: preset.opacity * 0.35 },
          uDetail: { value: 0.7 },
        },
        vertexShader: nebulaVert,
        fragmentShader: nebulaFrag,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        Math.cos(angle) * r,
        (Math.random() - 0.5) * 25,
        Math.sin(angle) * r,
      );
      mesh.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
      mesh.rotation.z = Math.random() * Math.PI * 2;

      this.meshes.push(mesh);
      this.materials.push(material);
      this.scene.add(mesh);
    }

    // Small bright knots (dense star-forming regions)
    const knotCount = Math.max(1, Math.floor(8 * (count / 12)));
    for (let i = 0; i < knotCount; i++) {
      const preset = NEBULA_PRESETS[(i * 2 + 1) % NEBULA_PRESETS.length];
      const size = (30 + Math.random() * 60) * preset.scale;
      const angle = Math.random() * Math.PI * 2;
      const r = galaxyRadius * (0.1 + Math.random() * 0.7);

      const geometry = new THREE.PlaneGeometry(size, size);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: Math.random() * 100 },
          uColor: { value: preset.color1.clone() },
          uColor2: { value: preset.color2.clone() },
          uOpacity: { value: preset.opacity * 1.5 },
          uDetail: { value: 1.5 },
        },
        vertexShader: nebulaVert,
        fragmentShader: nebulaFrag,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        Math.cos(angle) * r,
        (Math.random() - 0.5) * 8,
        Math.sin(angle) * r,
      );
      mesh.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
      mesh.rotation.z = Math.random() * Math.PI * 2;

      this.meshes.push(mesh);
      this.materials.push(material);
      this.scene.add(mesh);
    }
  }

  private createCloud(preset: NebulaPreset, size: number, galaxyRadius: number, index: number, total: number): void {
    const geometry = new THREE.PlaneGeometry(size, size);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: Math.random() * 100 },
        uColor: { value: preset.color1.clone() },
        uColor2: { value: preset.color2.clone() },
        uOpacity: { value: preset.opacity * (0.8 + Math.random() * 0.4) },
        uDetail: { value: 1.0 },
      },
      vertexShader: nebulaVert,
      fragmentShader: nebulaFrag,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);

    const angle = (index / total) * Math.PI * 2 + Math.random() * 0.8;
    const r = galaxyRadius * (0.15 + Math.random() * 0.65);
    mesh.position.set(
      Math.cos(angle) * r,
      (Math.random() - 0.5) * 15,
      Math.sin(angle) * r,
    );

    mesh.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    mesh.rotation.z = Math.random() * Math.PI * 2;

    this.meshes.push(mesh);
    this.materials.push(material);
    this.scene.add(mesh);
  }

  update(deltaTime: number): void {
    for (const mat of this.materials) {
      mat.uniforms.uTime.value += deltaTime;
    }
  }

  setVisible(visible: boolean): void {
    for (const mesh of this.meshes) mesh.visible = visible;
  }

  clear(): void {
    for (const mesh of this.meshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.meshes = [];
    this.materials = [];
  }
}
