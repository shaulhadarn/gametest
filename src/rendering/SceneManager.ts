// SceneManager.ts - Three.js scene, renderer, camera, and post-processing setup
// Updated: Added setAntiAliasing() method that recreates the WebGL renderer with new AA setting, constructor now accepts antialias param

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export const BLOOM_LAYER = 1;

export class SceneManager {
  renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  readonly css2DRenderer: CSS2DRenderer;
  bloomPass: UnrealBloomPass;

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, antialias = true) {
    this.canvas = canvas;

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000008);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      5000
    );
    this.camera.position.set(0, 300, 300);
    this.camera.lookAt(0, 0, 0);

    // Post-processing
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8,  // strength
      0.35, // radius
      0.85  // threshold
    );
    this.composer.addPass(this.bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    // CSS2D Renderer for labels
    this.css2DRenderer = new CSS2DRenderer();
    this.css2DRenderer.setSize(window.innerWidth, window.innerHeight);
    this.css2DRenderer.domElement.style.position = 'absolute';
    this.css2DRenderer.domElement.style.top = '0';
    this.css2DRenderer.domElement.style.left = '0';
    this.css2DRenderer.domElement.style.pointerEvents = 'none';
    this.css2DRenderer.domElement.style.zIndex = '5';
    canvas.parentElement!.appendChild(this.css2DRenderer.domElement);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x222233, 0.5);
    this.scene.add(ambientLight);

    // Handle resize
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.css2DRenderer.setSize(w, h);
    this.bloomPass.resolution.set(w, h);
  }

  setBloomForGalaxy(): void {
    this.bloomPass.strength = 1.0;
    this.bloomPass.radius = 0.4;
    this.bloomPass.threshold = 0.8;
  }

  setBloomForSystem(): void {
    this.bloomPass.strength = 0.4;
    this.bloomPass.radius = 0.2;
    this.bloomPass.threshold = 0.92;
  }

  setPixelRatio(limit: number): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, limit));
    this.onResize();
  }

  setBloomEnabled(enabled: boolean): void {
    this.bloomPass.enabled = enabled;
  }

  setAntiAliasing(enabled: boolean): void {
    const oldBloomEnabled = this.bloomPass.enabled;
    const oldBloomStrength = this.bloomPass.strength;
    const oldBloomRadius = this.bloomPass.radius;
    const oldBloomThreshold = this.bloomPass.threshold;
    const oldPixelRatio = this.renderer.getPixelRatio();

    this.renderer.dispose();
    this.composer.dispose();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: enabled,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(oldPixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      oldBloomStrength,
      oldBloomRadius,
      oldBloomThreshold
    );
    this.bloomPass.enabled = oldBloomEnabled;
    this.composer.addPass(this.bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  render(): void {
    this.composer.render();
    this.css2DRenderer.render(this.scene, this.camera);
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.dispose();
    this.composer.dispose();
  }
}
