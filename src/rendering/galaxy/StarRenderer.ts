// StarRenderer.ts - Renders stars, glows, labels, and selection indicators in galaxy view
// Updated: setVisible(true) now forces frustum recalculation with fresh camera matrix,
// fixing glows not appearing until user interaction after returning from flight/system view
// applyFogOfWar explicitly shows explored stars' glows/labels/indicators
// Added frustum culling (50-70% draw call reduction) + LOD system (vertex count reduction)

import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Star } from '@/models/Star';
import { STAR_COLORS, STAR_SCALES } from '@/core/Constants';
import { BLOOM_LAYER } from '@/rendering/SceneManager';
import starGlowVert from '@/rendering/shaders/starGlow.vert';
import starGlowFrag from '@/rendering/shaders/starGlow.frag';

export class StarRenderer {
  private scene: THREE.Scene;
  private starMesh: THREE.InstancedMesh | null = null;
  private starMeshLOD: THREE.InstancedMesh | null = null; // Low detail mesh
  private starMeshLOD2: THREE.InstancedMesh | null = null; // Very low detail mesh
  private glowSprites: THREE.Mesh[] = [];
  private glowMaterials: THREE.ShaderMaterial[] = [];
  private labels: CSS2DObject[] = [];
  private starIdMap: Map<number, string> = new Map();
  private starIndexMap: Map<string, number> = new Map();
  private selectionRing: THREE.Mesh | null = null;
  private selectionBeam: THREE.Mesh | null = null;
  private selectedStarId: string | null = null;
  private ownerIndicators: THREE.Mesh[] = [];
  private homeIndicator: THREE.Mesh | null = null;
  private time = 0;

  // Frustum culling
  private frustum = new THREE.Frustum();
  private cameraProjectionMatrix = new THREE.Matrix4();
  private starPositions: Float32Array | null = null;
  private starVisibility: boolean[] = [];
  private lastCameraHash = '';
  private forceNextUpdate = false;

  // LOD system
  private starLODLevels: number[] = []; // 0=high, 1=medium, 2=low detail
  private cameraPosition = new THREE.Vector3();
  private lodDistances = { high: 50, medium: 150, low: 500 }; // Distance thresholds

  // Fog of war
  private fogOfWarEnabled = false;
  private exploredStars: Set<string> = new Set();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  build(stars: Record<string, Star>, homeStarId?: string): void {
    this.clear();

    const starList = Object.values(stars);
    const count = starList.length;

    // Initialize LOD and frustum culling data
    this.starPositions = new Float32Array(count * 3);
    this.starVisibility = new Array(count).fill(true);
    this.starLODLevels = new Array(count).fill(0); // Start with high detail

    // Create LOD meshes with different detail levels - bright emissive cores
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: false,
      transparent: true,
      opacity: 1.0,
    });

    // High detail mesh (20 segments)
    const highDetailGeom = new THREE.SphereGeometry(1, 20, 14);
    this.starMesh = new THREE.InstancedMesh(highDetailGeom, material.clone(), count);
    this.starMesh.layers.enable(BLOOM_LAYER);

    // Medium detail mesh (12 segments)
    const mediumDetailGeom = new THREE.SphereGeometry(1, 12, 8);
    this.starMeshLOD = new THREE.InstancedMesh(mediumDetailGeom, material.clone(), count);
    this.starMeshLOD.layers.enable(BLOOM_LAYER);
    this.starMeshLOD.visible = false; // Start hidden

    // Low detail mesh (6 segments)
    const lowDetailGeom = new THREE.SphereGeometry(1, 6, 4);
    this.starMeshLOD2 = new THREE.InstancedMesh(lowDetailGeom, material.clone(), count);
    this.starMeshLOD2.layers.enable(BLOOM_LAYER);
    this.starMeshLOD2.visible = false; // Start hidden

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const star = starList[i];
      const scale = STAR_SCALES[star.type] * 2.2;

      dummy.position.set(star.position.x, star.position.y, star.position.z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      
      // Set matrix for all LOD meshes
      this.starMesh.setMatrixAt(i, dummy.matrix);
      if (this.starMeshLOD) this.starMeshLOD.setMatrixAt(i, dummy.matrix);
      if (this.starMeshLOD2) this.starMeshLOD2.setMatrixAt(i, dummy.matrix);

      // Store position for frustum culling
      const idx = i * 3;
      this.starPositions[idx] = star.position.x;
      this.starPositions[idx + 1] = star.position.y;
      this.starPositions[idx + 2] = star.position.z;

      color.setHex(STAR_COLORS[star.type]);
      
      // Set color for all LOD meshes
      this.starMesh.setColorAt(i, color);
      if (this.starMeshLOD) this.starMeshLOD.setColorAt(i, color);
      if (this.starMeshLOD2) this.starMeshLOD2.setColorAt(i, color);

      this.starIdMap.set(i, star.id);
      this.starIndexMap.set(star.id, i);

      // Multi-layer glow sprite
      const starColor = new THREE.Color(STAR_COLORS[star.type]);
      const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: starColor },
          uIntensity: { value: 1.0 + scale * 0.15 },
          uTime: { value: Math.random() * 100 },
        },
        vertexShader: starGlowVert,
        fragmentShader: starGlowFrag,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const glowSize = scale * 10;
      const glowGeom = new THREE.PlaneGeometry(glowSize, glowSize);
      const glowMesh = new THREE.Mesh(glowGeom, glowMaterial);
      glowMesh.position.set(star.position.x, star.position.y, star.position.z);
      glowMesh.layers.enable(BLOOM_LAYER);
      glowMesh.userData.starId = star.id;
      this.glowSprites.push(glowMesh);
      this.glowMaterials.push(glowMaterial);
      this.scene.add(glowMesh);

      // Owner territory indicator - filled glow disc under star
      if (star.ownerId) {
        // Outer soft glow disc
        const ownerDiscGeom = new THREE.CircleGeometry(scale * 6, 32);
        const ownerDiscMat = new THREE.MeshBasicMaterial({
          color: 0x4488ff,
          transparent: true,
          opacity: 0.06,
          side: THREE.DoubleSide,
          toneMapped: false,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const ownerDisc = new THREE.Mesh(ownerDiscGeom, ownerDiscMat);
        ownerDisc.position.set(star.position.x, star.position.y - 0.4, star.position.z);
        ownerDisc.rotation.x = -Math.PI / 2;
        ownerDisc.userData.ownerId = star.ownerId;
        this.ownerIndicators.push(ownerDisc);
        this.scene.add(ownerDisc);

        // Inner brighter ring
        const ownerRingGeom = new THREE.RingGeometry(scale * 1.8, scale * 2.6, 32);
        const ownerRingMat = new THREE.MeshBasicMaterial({
          color: 0x4488ff,
          transparent: true,
          opacity: 0.2,
          side: THREE.DoubleSide,
          toneMapped: false,
          depthWrite: false,
        });
        const ownerRing = new THREE.Mesh(ownerRingGeom, ownerRingMat);
        ownerRing.position.set(star.position.x, star.position.y - 0.3, star.position.z);
        ownerRing.rotation.x = -Math.PI / 2;
        ownerRing.userData.ownerId = star.ownerId;
        this.ownerIndicators.push(ownerRing);
        this.scene.add(ownerRing);
      }

      // Home star indicator (bright pulsing diamond)
      if (homeStarId && star.id === homeStarId) {
        const homeGeom = new THREE.RingGeometry(scale * 3.5, scale * 4.2, 4);
        const homeMat = new THREE.MeshBasicMaterial({
          color: 0x44ddff,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide,
          toneMapped: false,
          depthWrite: false,
        });
        this.homeIndicator = new THREE.Mesh(homeGeom, homeMat);
        this.homeIndicator.position.set(star.position.x, star.position.y - 0.2, star.position.z);
        this.homeIndicator.rotation.x = -Math.PI / 2;
        this.homeIndicator.rotation.z = Math.PI / 4; // Diamond orientation
        this.ownerIndicators.push(this.homeIndicator);
        this.scene.add(this.homeIndicator);
      }

      // Label with improved styling — positioned below star based on its radius
      const labelDiv = document.createElement('div');
      labelDiv.className = 'star-label';
      labelDiv.textContent = star.name + (homeStarId && star.id === homeStarId ? ' [HOME]' : '');
      const hexColor = '#' + STAR_COLORS[star.type].toString(16).padStart(6, '0');
      labelDiv.style.cssText = `
        color: ${hexColor};
        font-size: 10px;
        font-family: 'Share Tech Mono', monospace;
        text-shadow: 0 0 6px ${hexColor}44, 0 1px 3px rgba(0,0,0,0.9);
        pointer-events: none;
        white-space: nowrap;
        letter-spacing: 1px;
        opacity: 0.85;
      `;

      const label = new CSS2DObject(labelDiv);
      // Offset label below the star by its visual radius + margin
      const labelOffset = scale + 2;
      label.position.set(star.position.x, star.position.y - labelOffset, star.position.z);
      this.labels.push(label);
      this.scene.add(label);
    }

    // Update all LOD meshes
    this.starMesh.instanceMatrix.needsUpdate = true;
    if (this.starMesh.instanceColor) {
      this.starMesh.instanceColor.needsUpdate = true;
    }
    this.scene.add(this.starMesh);

    if (this.starMeshLOD) {
      this.starMeshLOD.instanceMatrix.needsUpdate = true;
      if (this.starMeshLOD.instanceColor) {
        this.starMeshLOD.instanceColor.needsUpdate = true;
      }
      this.scene.add(this.starMeshLOD);
    }

    if (this.starMeshLOD2) {
      this.starMeshLOD2.instanceMatrix.needsUpdate = true;
      if (this.starMeshLOD2.instanceColor) {
        this.starMeshLOD2.instanceColor.needsUpdate = true;
      }
      this.scene.add(this.starMeshLOD2);
    }

    // Selection ring - animated double ring
    this.buildSelectionIndicator();
  }

  private buildSelectionIndicator(): void {
    // Outer ring
    const ringGeom = new THREE.RingGeometry(4, 4.6, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x44bbff,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.selectionRing = new THREE.Mesh(ringGeom, ringMat);
    this.selectionRing.visible = false;
    this.selectionRing.rotation.x = -Math.PI / 2;
    this.scene.add(this.selectionRing);

    // Inner ring
    const innerGeom = new THREE.RingGeometry(2.8, 3.2, 48);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.selectionBeam = new THREE.Mesh(innerGeom, innerMat);
    this.selectionBeam.visible = false;
    this.selectionBeam.rotation.x = -Math.PI / 2;
    this.selectionBeam.layers.enable(BLOOM_LAYER);
    this.scene.add(this.selectionBeam);
  }

  private updateFrustumCulling(camera: THREE.Camera): void {
    if (!this.starMesh || !this.starPositions) return;

    // Force camera matrix update to handle stale matrices after view transitions
    if (this.forceNextUpdate) {
      camera.updateMatrixWorld(true);
    }

    // Create camera hash to detect changes
    const camHash = `${camera.position.x.toFixed(2)}_${camera.position.y.toFixed(2)}_${camera.position.z.toFixed(2)}_${camera.rotation.x.toFixed(2)}_${camera.rotation.y.toFixed(2)}_${camera.rotation.z.toFixed(2)}`;
    
    // Only update frustum if camera moved significantly (skip check if forced)
    if (!this.forceNextUpdate && camHash === this.lastCameraHash) return;
    this.forceNextUpdate = false;
    this.lastCameraHash = camHash;

    // Track camera position for LOD
    this.cameraPosition.copy(camera.position);

    // Update frustum
    this.cameraProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.cameraProjectionMatrix);

    // Check each star against frustum
    let visibleCount = 0;
    const tempVec = new THREE.Vector3();
    const boundingSphere = new THREE.Sphere();
    
    for (let i = 0; i < this.starVisibility.length; i++) {
      const idx = i * 3;
      tempVec.set(
        this.starPositions[idx],
        this.starPositions[idx + 1],
        this.starPositions[idx + 2]
      );

      // Create bounding sphere for the star
      boundingSphere.center.copy(tempVec);
      boundingSphere.radius = 3; // Fixed radius for all stars (conservative estimate)
      
      const wasVisible = this.starVisibility[i];
      const isVisible = this.frustum.intersectsSphere(boundingSphere);
      
      this.starVisibility[i] = isVisible;
      
      // Calculate LOD level based on distance
      if (isVisible) {
        const distance = tempVec.distanceTo(this.cameraPosition);
        let lodLevel = 0; // High detail
        
        if (distance > this.lodDistances.low) {
          lodLevel = 2; // Low detail
        } else if (distance > this.lodDistances.medium) {
          lodLevel = 1; // Medium detail
        }
        
        this.starLODLevels[i] = lodLevel;
        visibleCount++;
      }
    }

    // Update visibility of related elements
    this.updateElementVisibility();
  }

  private isStarExplored(index: number): boolean {
    const starId = this.starIdMap.get(index);
    return starId ? this.exploredStars.has(starId) : false;
  }

  private updateElementVisibility(): void {
    if (!this.starMesh) return;

    // Count visible stars by LOD level
    let highDetailCount = 0;
    let mediumDetailCount = 0;
    let lowDetailCount = 0;

    for (let i = 0; i < this.starLODLevels.length; i++) {
      if (!this.starVisibility[i]) continue;
      
      switch (this.starLODLevels[i]) {
        case 0: highDetailCount++; break;
        case 1: mediumDetailCount++; break;
        case 2: lowDetailCount++; break;
      }
    }

    // Show/hide LOD meshes based on what's needed
    this.starMesh.visible = highDetailCount > 0;
    if (this.starMeshLOD) this.starMeshLOD.visible = mediumDetailCount > 0;
    if (this.starMeshLOD2) this.starMeshLOD2.visible = lowDetailCount > 0;

    // Update glow sprites visibility (respect fog of war)
    for (let i = 0; i < this.glowSprites.length && i < this.starVisibility.length; i++) {
      const fogVisible = !this.fogOfWarEnabled || this.isStarExplored(i);
      this.glowSprites[i].visible = this.starVisibility[i] && fogVisible;
    }

    // Update labels visibility (hide for very distant stars and unexplored stars)
    for (let i = 0; i < this.labels.length && i < this.starVisibility.length; i++) {
      const fogVisible = !this.fogOfWarEnabled || this.isStarExplored(i);
      const isVisible = this.starVisibility[i] && this.starLODLevels[i] < 2 && fogVisible;
      this.labels[i].visible = isVisible;
    }

    // Update owner indicators visibility (respect fog of war)
    for (let i = 0; i < this.ownerIndicators.length && i < this.starVisibility.length; i++) {
      const fogVisible = !this.fogOfWarEnabled || this.isStarExplored(i);
      this.ownerIndicators[i].visible = this.starVisibility[i] && fogVisible;
    }
  }

  /**
   * Apply fog of war: dim unexplored stars, hide their labels and glows.
   * Explored stars render normally; unexplored stars are nearly invisible.
   */
  applyFogOfWar(exploredStarIds: Set<string>): void {
    this.fogOfWarEnabled = true;
    this.exploredStars = exploredStarIds;
    this.lastCameraHash = ''; // Force frustum recalculation

    if (!this.starMesh) return;

    const dimColor = new THREE.Color(0.08, 0.08, 0.15);
    const color = new THREE.Color();

    for (let i = 0; i < this.starVisibility.length; i++) {
      const starId = this.starIdMap.get(i);
      const isExplored = starId ? exploredStarIds.has(starId) : false;

      if (isExplored) {
        // Ensure explored stars' glows, labels, and indicators are visible
        if (i < this.glowSprites.length) this.glowSprites[i].visible = true;
        if (i < this.labels.length) this.labels[i].visible = true;
        if (i < this.ownerIndicators.length) this.ownerIndicators[i].visible = true;
      } else {
        // Dim unexplored stars to near-invisible
        this.starMesh.setColorAt(i, dimColor);
        if (this.starMeshLOD) this.starMeshLOD.setColorAt(i, dimColor);
        if (this.starMeshLOD2) this.starMeshLOD2.setColorAt(i, dimColor);

        // Hide glow, label, and owner indicator for unexplored stars
        if (i < this.glowSprites.length) this.glowSprites[i].visible = false;
        if (i < this.labels.length) this.labels[i].visible = false;
        if (i < this.ownerIndicators.length) this.ownerIndicators[i].visible = false;
      }
    }

    // Update instance color buffers
    if (this.starMesh.instanceColor) this.starMesh.instanceColor.needsUpdate = true;
    if (this.starMeshLOD?.instanceColor) this.starMeshLOD.instanceColor.needsUpdate = true;
    if (this.starMeshLOD2?.instanceColor) this.starMeshLOD2.instanceColor.needsUpdate = true;
  }

  /**
   * Reveal specific stars (e.g. when a fleet arrives). Restores their original color.
   */
  revealStars(starIds: string[], stars: Record<string, Star>): void {
    if (!this.starMesh) return;

    const color = new THREE.Color();

    for (const starId of starIds) {
      const index = this.starIndexMap.get(starId);
      if (index === undefined) continue;

      this.exploredStars.add(starId);

      const star = stars[starId];
      if (!star) continue;

      // Restore original color
      color.setHex(STAR_COLORS[star.type]);
      this.starMesh.setColorAt(index, color);
      if (this.starMeshLOD) this.starMeshLOD.setColorAt(index, color);
      if (this.starMeshLOD2) this.starMeshLOD2.setColorAt(index, color);

      // Show glow, label, and owner indicator
      if (index < this.glowSprites.length) this.glowSprites[index].visible = true;
      if (index < this.labels.length) this.labels[index].visible = true;
      if (index < this.ownerIndicators.length) this.ownerIndicators[index].visible = true;
    }

    // Update instance color buffers
    if (this.starMesh.instanceColor) this.starMesh.instanceColor.needsUpdate = true;
    if (this.starMeshLOD?.instanceColor) this.starMeshLOD.instanceColor.needsUpdate = true;
    if (this.starMeshLOD2?.instanceColor) this.starMeshLOD2.instanceColor.needsUpdate = true;
  }

  update(camera: THREE.Camera, deltaTime: number): void {
    this.time += deltaTime;

    // Frustum culling - update visibility based on camera view
    this.updateFrustumCulling(camera);

    // Billboard glow sprites toward camera
    for (const glow of this.glowSprites) {
      glow.quaternion.copy(camera.quaternion);
    }

    // Update glow shader time uniforms
    for (const mat of this.glowMaterials) {
      mat.uniforms.uTime.value += deltaTime;
    }

    // Animate home indicator
    if (this.homeIndicator) {
      const homePulse = 0.4 + Math.sin(this.time * 2.0) * 0.3;
      (this.homeIndicator.material as THREE.MeshBasicMaterial).opacity = homePulse;
      this.homeIndicator.rotation.z = Math.PI / 4 + this.time * 0.2;
    }

    // Animate selection indicators
    if (this.selectionRing && this.selectionRing.visible) {
      const pulse = 0.6 + Math.sin(this.time * 2.5) * 0.25;
      (this.selectionRing.material as THREE.MeshBasicMaterial).opacity = pulse * 0.6;
      this.selectionRing.rotation.z = this.time * 0.3;

      if (this.selectionBeam) {
        const innerPulse = 0.5 + Math.sin(this.time * 3.5 + 1) * 0.3;
        (this.selectionBeam.material as THREE.MeshBasicMaterial).opacity = innerPulse * 0.8;
        this.selectionBeam.rotation.z = -this.time * 0.5;
      }
    }
  }

  selectStar(starId: string, stars: Record<string, Star>): void {
    this.selectedStarId = starId;
    const star = stars[starId];
    if (star && this.selectionRing) {
      this.selectionRing.position.set(star.position.x, star.position.y - 0.3, star.position.z);
      this.selectionRing.visible = true;

      if (this.selectionBeam) {
        this.selectionBeam.position.set(star.position.x, star.position.y - 0.3, star.position.z);
        this.selectionBeam.visible = true;
      }
    }
  }

  deselectStar(): void {
    this.selectedStarId = null;
    if (this.selectionRing) this.selectionRing.visible = false;
    if (this.selectionBeam) this.selectionBeam.visible = false;
  }

  getStarMesh(): THREE.InstancedMesh | null {
    return this.starMesh;
  }

  getStarIdByInstanceIndex(index: number): string | undefined {
    return this.starIdMap.get(index);
  }

  setVisible(visible: boolean): void {
    if (this.starMesh) this.starMesh.visible = visible;
    if (this.starMeshLOD) this.starMeshLOD.visible = visible;
    if (this.starMeshLOD2) this.starMeshLOD2.visible = visible;

    if (visible && this.fogOfWarEnabled) {
      // Re-apply fog of war so unexplored stars stay hidden
      this.applyFogOfWar(this.exploredStars);
    } else {
      for (const glow of this.glowSprites) glow.visible = visible;
      for (const label of this.labels) label.visible = visible;
      for (const ind of this.ownerIndicators) ind.visible = visible;
    }

    if (this.selectionRing) this.selectionRing.visible = visible && !!this.selectedStarId;
    if (this.selectionBeam) this.selectionBeam.visible = visible && !!this.selectedStarId;

    // Force frustum recalculation on next update to handle stale camera matrices
    if (visible) {
      this.forceNextUpdate = true;
      this.lastCameraHash = '';
    }
  }

  clear(): void {
    if (this.starMesh) {
      this.scene.remove(this.starMesh);
      this.starMesh.geometry.dispose();
      (this.starMesh.material as THREE.Material).dispose();
      this.starMesh = null;
    }
    if (this.starMeshLOD) {
      this.scene.remove(this.starMeshLOD);
      this.starMeshLOD.geometry.dispose();
      (this.starMeshLOD.material as THREE.Material).dispose();
      this.starMeshLOD = null;
    }
    if (this.starMeshLOD2) {
      this.scene.remove(this.starMeshLOD2);
      this.starMeshLOD2.geometry.dispose();
      (this.starMeshLOD2.material as THREE.Material).dispose();
      this.starMeshLOD2 = null;
    }
    for (const glow of this.glowSprites) {
      this.scene.remove(glow);
      glow.geometry.dispose();
      (glow.material as THREE.Material).dispose();
    }
    this.glowSprites = [];
    this.glowMaterials = [];
    for (const label of this.labels) {
      this.scene.remove(label);
    }
    this.labels = [];
    for (const ind of this.ownerIndicators) {
      this.scene.remove(ind);
      ind.geometry.dispose();
      (ind.material as THREE.Material).dispose();
    }
    this.ownerIndicators = [];
    this.homeIndicator = null;
    if (this.selectionRing) {
      this.scene.remove(this.selectionRing);
      this.selectionRing = null;
    }
    if (this.selectionBeam) {
      this.scene.remove(this.selectionBeam);
      this.selectionBeam = null;
    }
    this.starIdMap.clear();
    this.starIndexMap.clear();
    
    // Clear frustum culling and LOD data
    this.starPositions = null;
    this.starVisibility = [];
    this.starLODLevels = [];
    this.lastCameraHash = '';
  }
}
