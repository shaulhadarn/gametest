// ConnectionLines.ts - Renders warp lane connections between stars in galaxy view
// Updated: Added fog of war support - only shows connections between explored stars

import * as THREE from 'three';
import { Star } from '@/models/Star';
import warpLaneVert from '@/rendering/shaders/warpLane.vert';
import warpLaneFrag from '@/rendering/shaders/warpLane.frag';

export class ConnectionLines {
  private scene: THREE.Scene;
  private lineSegments: THREE.LineSegments | null = null;
  private material: THREE.ShaderMaterial | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  build(stars: Record<string, Star>, exploredStarIds?: Set<string>): void {
    this.clear();

    const positions: number[] = [];
    const distances: number[] = [];
    const addedEdges = new Set<string>();

    for (const star of Object.values(stars)) {
      // Skip connections from unexplored stars when fog of war is active
      if (exploredStarIds && !exploredStarIds.has(star.id)) continue;

      for (const laneId of star.warpLanes) {
        // Skip connections to unexplored stars when fog of war is active
        if (exploredStarIds && !exploredStarIds.has(laneId)) continue;

        const edgeKey = [star.id, laneId].sort().join('-');
        if (addedEdges.has(edgeKey)) continue;
        addedEdges.add(edgeKey);

        const other = stars[laneId];
        if (!other) continue;

        const dx = other.position.x - star.position.x;
        const dy = other.position.y - star.position.y;
        const dz = other.position.z - star.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Start vertex
        positions.push(star.position.x, star.position.y, star.position.z);
        distances.push(0);

        // End vertex
        positions.push(other.position.x, other.position.y, other.position.z);
        distances.push(dist);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('lineDistance', new THREE.Float32BufferAttribute(distances, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0.25, 0.45, 0.8) },
        uTime: { value: 0 },
        uOpacity: { value: 0.3 },
      },
      vertexShader: warpLaneVert,
      fragmentShader: warpLaneFrag,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.lineSegments = new THREE.LineSegments(geometry, this.material);
    this.scene.add(this.lineSegments);
  }

  update(deltaTime: number): void {
    if (this.material) {
      this.material.uniforms.uTime.value += deltaTime;
    }
  }

  setVisible(visible: boolean): void {
    if (this.lineSegments) this.lineSegments.visible = visible;
  }

  clear(): void {
    if (this.lineSegments) {
      this.scene.remove(this.lineSegments);
      this.lineSegments.geometry.dispose();
      this.material?.dispose();
      this.lineSegments = null;
      this.material = null;
    }
  }
}
