import * as THREE from 'three';
import starfieldVert from '@/rendering/shaders/starfield.vert';
import starfieldFrag from '@/rendering/shaders/starfield.frag';

export class StarFieldBackground {
  private points: THREE.Points | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private galaxyCorePoints: THREE.Points | null = null;
  private galaxyCoreMaterial: THREE.ShaderMaterial | null = null;

  constructor(private scene: THREE.Scene) {}

  build(count: number = 25000, radius: number = 2000): void {
    this.clear();

    // === Background star sphere ===
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const twinkleSpeeds = new Float32Array(count);
    const twinklePhases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const layer = Math.random();
      const r = radius * (layer < 0.3 ? 0.7 + Math.random() * 0.15
                        : layer < 0.7 ? 0.85 + Math.random() * 0.1
                        : 0.95 + Math.random() * 0.05);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const warmth = Math.random();
      if (warmth < 0.55) {
        const w = 0.85 + Math.random() * 0.15;
        colors[i * 3] = w;
        colors[i * 3 + 1] = w;
        colors[i * 3 + 2] = w + Math.random() * 0.05;
      } else if (warmth < 0.70) {
        colors[i * 3] = 0.95 + Math.random() * 0.05;
        colors[i * 3 + 1] = 0.75 + Math.random() * 0.15;
        colors[i * 3 + 2] = 0.5 + Math.random() * 0.2;
      } else if (warmth < 0.82) {
        colors[i * 3] = 0.55 + Math.random() * 0.15;
        colors[i * 3 + 1] = 0.65 + Math.random() * 0.2;
        colors[i * 3 + 2] = 0.95 + Math.random() * 0.05;
      } else if (warmth < 0.90) {
        colors[i * 3] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 1] = 0.5 + Math.random() * 0.15;
        colors[i * 3 + 2] = 0.45 + Math.random() * 0.1;
      } else if (warmth < 0.96) {
        // Soft purple/violet
        colors[i * 3] = 0.7 + Math.random() * 0.15;
        colors[i * 3 + 1] = 0.5 + Math.random() * 0.15;
        colors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
      } else {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 1.0;
        colors[i * 3 + 2] = 1.0;
      }

      const sizeRoll = Math.random();
      if (sizeRoll < 0.65) {
        sizes[i] = 0.5 + Math.random() * 1.0;
      } else if (sizeRoll < 0.88) {
        sizes[i] = 1.5 + Math.random() * 1.5;
      } else if (sizeRoll < 0.97) {
        sizes[i] = 3.0 + Math.random() * 2.0;
      } else {
        sizes[i] = 5.0 + Math.random() * 2.0; // rare very bright stars
      }

      twinkleSpeeds[i] = 0.5 + Math.random() * 3.0;
      twinklePhases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('twinkleSpeed', new THREE.BufferAttribute(twinkleSpeeds, 1));
    geometry.setAttribute('twinklePhase', new THREE.BufferAttribute(twinklePhases, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: starfieldVert,
      fragmentShader: starfieldFrag,
      transparent: true,
      depthWrite: false,
      vertexColors: true,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.scene.add(this.points);

    // === Galaxy core concentration - dense cluster of faint stars near center ===
    const coreCount = Math.floor(8000 * (count / 25000));
    const coreRadius = radius * 0.25;
    const corePositions = new Float32Array(coreCount * 3);
    const coreColors = new Float32Array(coreCount * 3);
    const coreSizes = new Float32Array(coreCount);
    const coreTwinkleSpeeds = new Float32Array(coreCount);
    const coreTwinklePhases = new Float32Array(coreCount);

    for (let i = 0; i < coreCount; i++) {
      // Gaussian distribution around origin on the galactic plane
      const gaussR = coreRadius * Math.sqrt(-2 * Math.log(Math.random() + 0.001)) * 0.3;
      const theta = Math.random() * Math.PI * 2;
      const heightSpread = (Math.random() - 0.5) * coreRadius * 0.15;

      corePositions[i * 3] = Math.cos(theta) * gaussR;
      corePositions[i * 3 + 1] = heightSpread;
      corePositions[i * 3 + 2] = Math.sin(theta) * gaussR;

      // Warm golden-white core colors
      const warmth = Math.random();
      if (warmth < 0.4) {
        coreColors[i * 3] = 0.95 + Math.random() * 0.05;
        coreColors[i * 3 + 1] = 0.85 + Math.random() * 0.1;
        coreColors[i * 3 + 2] = 0.65 + Math.random() * 0.15;
      } else if (warmth < 0.7) {
        coreColors[i * 3] = 0.9 + Math.random() * 0.1;
        coreColors[i * 3 + 1] = 0.8 + Math.random() * 0.15;
        coreColors[i * 3 + 2] = 0.75 + Math.random() * 0.15;
      } else {
        const w = 0.85 + Math.random() * 0.15;
        coreColors[i * 3] = w;
        coreColors[i * 3 + 1] = w;
        coreColors[i * 3 + 2] = w;
      }

      coreSizes[i] = 0.3 + Math.random() * 1.2;
      coreTwinkleSpeeds[i] = 0.3 + Math.random() * 2.0;
      coreTwinklePhases[i] = Math.random() * Math.PI * 2;
    }

    const coreGeometry = new THREE.BufferGeometry();
    coreGeometry.setAttribute('position', new THREE.BufferAttribute(corePositions, 3));
    coreGeometry.setAttribute('color', new THREE.BufferAttribute(coreColors, 3));
    coreGeometry.setAttribute('size', new THREE.BufferAttribute(coreSizes, 1));
    coreGeometry.setAttribute('twinkleSpeed', new THREE.BufferAttribute(coreTwinkleSpeeds, 1));
    coreGeometry.setAttribute('twinklePhase', new THREE.BufferAttribute(coreTwinklePhases, 1));

    this.galaxyCoreMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: starfieldVert,
      fragmentShader: starfieldFrag,
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
    });

    this.galaxyCorePoints = new THREE.Points(coreGeometry, this.galaxyCoreMaterial);
    this.scene.add(this.galaxyCorePoints);
  }

  update(deltaTime: number): void {
    if (this.material) {
      this.material.uniforms.uTime.value += deltaTime;
    }
    if (this.galaxyCoreMaterial) {
      this.galaxyCoreMaterial.uniforms.uTime.value += deltaTime;
    }
  }

  setVisible(visible: boolean): void {
    if (this.points) this.points.visible = visible;
    if (this.galaxyCorePoints) this.galaxyCorePoints.visible = visible;
  }

  clear(): void {
    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
      this.material?.dispose();
      this.points = null;
      this.material = null;
    }
    if (this.galaxyCorePoints) {
      this.scene.remove(this.galaxyCorePoints);
      this.galaxyCorePoints.geometry.dispose();
      this.galaxyCoreMaterial?.dispose();
      this.galaxyCorePoints = null;
      this.galaxyCoreMaterial = null;
    }
  }
}
