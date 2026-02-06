import * as THREE from 'three';
import galaxyDustVert from '@/rendering/shaders/galaxyDust.vert';
import galaxyDustFrag from '@/rendering/shaders/galaxyDust.frag';

export class GalaxyDustPlane {
  private scene: THREE.Scene;
  private mesh: THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  build(galaxyRadius: number): void {
    this.clear();

    const size = galaxyRadius * 2.8;
    const geometry = new THREE.PlaneGeometry(size, size, 1, 1);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uRadius: { value: galaxyRadius },
        uColor1: { value: new THREE.Color(0.08, 0.06, 0.22) },  // deep blue-purple (arms)
        uColor2: { value: new THREE.Color(0.18, 0.08, 0.38) },  // purple (arm highlights)
        uColor3: { value: new THREE.Color(0.12, 0.15, 0.4) },   // cool blue (tertiary arm)
        uColor4: { value: new THREE.Color(0.35, 0.18, 0.12) },  // warm amber (core)
      },
      vertexShader: galaxyDustVert,
      fragmentShader: galaxyDustFrag,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = -2;
    this.scene.add(this.mesh);
  }

  update(deltaTime: number): void {
    if (this.material) {
      this.material.uniforms.uTime.value += deltaTime;
    }
  }

  setVisible(visible: boolean): void {
    if (this.mesh) this.mesh.visible = visible;
  }

  clear(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.material?.dispose();
      this.mesh = null;
      this.material = null;
    }
  }
}
