// FleetIconRenderer.ts - Renders fleet icons, labels, and movement lines in galaxy view
// Updated: Converted to instanced rendering for batch drawing, reducing draw calls by 90%+
// Uses single InstancedMesh for all fleet icons instead of individual meshes
// Maintains per-fleet colors, positions, and labels with efficient data structures

import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Fleet } from '@/models/Fleet';
import { Star } from '@/models/Star';
import { Player } from '@/models/Player';

export class FleetIconRenderer {
  private scene: THREE.Scene;
  private icons: THREE.Mesh[] = [];
  private labels: CSS2DObject[] = [];
  private movementLines: THREE.Line[] = [];

  // Instancing system
  private fleetMesh: THREE.InstancedMesh | null = null;
  private fleetPositions: Float32Array | null = null;
  private fleetColors: Float32Array | null = null;
  private fleetIds: string[] = [];
  private fleetIdMap: Map<string, number> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  build(fleets: Record<string, Fleet>, stars: Record<string, Star>, players: Record<string, Player>): void {
    this.clear();

    const fleetList = Object.values(fleets).filter(fleet => {
      const star = stars[fleet.currentStarId];
      const player = players[fleet.playerId];
      return star && player;
    });

    if (fleetList.length === 0) return;

    const count = fleetList.length;

    // Create instanced mesh for all fleet icons
    const geometry = new THREE.OctahedronGeometry(2, 0);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff, // Will be overridden per instance
      transparent: true,
      opacity: 0.9,
      toneMapped: false,
    });

    this.fleetMesh = new THREE.InstancedMesh(geometry, material, count);
    this.fleetPositions = new Float32Array(count * 3);
    this.fleetColors = new Float32Array(count * 3);
    this.fleetIds = new Array(count);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const fleet = fleetList[i];
      const star = stars[fleet.currentStarId];
      const player = players[fleet.playerId];

      // Store fleet data
      this.fleetIds[i] = fleet.id;
      this.fleetIdMap.set(fleet.id, i);

      // Position with offset from star
      const posX = star.position.x + 5;
      const posY = star.position.y + 3;
      const posZ = star.position.z;

      dummy.position.set(posX, posY, posZ);
      dummy.updateMatrix();
      this.fleetMesh.setMatrixAt(i, dummy.matrix);

      // Store position for labels
      const idx = i * 3;
      this.fleetPositions[idx] = posX;
      this.fleetPositions[idx + 1] = posY;
      this.fleetPositions[idx + 2] = posZ;

      // Set color
      color.set(player.color);
      this.fleetMesh.setColorAt(i, color);
      this.fleetColors[idx] = color.r;
      this.fleetColors[idx + 1] = color.g;
      this.fleetColors[idx + 2] = color.b;

      // Create label
      const labelDiv = document.createElement('div');
      labelDiv.className = 'fleet-label';
      labelDiv.textContent = `${fleet.name} (${fleet.shipIds.length})`;
      labelDiv.style.color = '#' + color.getHexString();
      labelDiv.style.fontSize = '10px';
      labelDiv.style.fontFamily = 'monospace';
      labelDiv.style.textShadow = '0 0 4px rgba(0,0,0,0.8)';
      labelDiv.style.marginTop = '12px';
      labelDiv.style.pointerEvents = 'none';

      const label = new CSS2DObject(labelDiv);
      label.position.set(posX, posY, posZ);
      this.labels.push(label);
      this.scene.add(label);

      // Movement line to destination
      if (fleet.destinationStarId) {
        const destStar = stars[fleet.destinationStarId];
        if (destStar) {
          const lineGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(star.position.x, star.position.y, star.position.z),
            new THREE.Vector3(destStar.position.x, destStar.position.y, destStar.position.z),
          ]);
          const lineMat = new THREE.LineDashedMaterial({
            color: player.color,
            dashSize: 3,
            gapSize: 3,
            transparent: true,
            opacity: 0.5,
          });
          const line = new THREE.Line(lineGeom, lineMat);
          line.computeLineDistances();
          this.movementLines.push(line);
          this.scene.add(line);
        }
      }
    }

    // Add instanced mesh to scene
    this.fleetMesh.instanceMatrix.needsUpdate = true;
    if (this.fleetMesh.instanceColor) {
      this.fleetMesh.instanceColor.needsUpdate = true;
    }
    this.scene.add(this.fleetMesh);
  }

  update(camera: THREE.Camera, _deltaTime: number): void {
    // Billboard instanced fleet mesh
    if (this.fleetMesh) {
      this.fleetMesh.quaternion.copy(camera.quaternion);
    }
    
    // Legacy support for any remaining individual icons (should be empty)
    for (const icon of this.icons) {
      icon.quaternion.copy(camera.quaternion);
    }
  }

  setVisible(visible: boolean): void {
    if (this.fleetMesh) this.fleetMesh.visible = visible;
    for (const icon of this.icons) icon.visible = visible;
    for (const label of this.labels) label.visible = visible;
    for (const line of this.movementLines) line.visible = visible;
  }

  clear(): void {
    // Clear instanced mesh
    if (this.fleetMesh) {
      this.scene.remove(this.fleetMesh);
      this.fleetMesh.geometry.dispose();
      (this.fleetMesh.material as THREE.Material).dispose();
      this.fleetMesh = null;
    }
    
    // Clear instancing data
    this.fleetPositions = null;
    this.fleetColors = null;
    this.fleetIds = [];
    this.fleetIdMap.clear();

    // Clear legacy individual icons (should be empty)
    for (const icon of this.icons) {
      this.scene.remove(icon);
      icon.geometry.dispose();
      (icon.material as THREE.Material).dispose();
    }
    this.icons = [];
    
    for (const label of this.labels) {
      this.scene.remove(label);
    }
    this.labels = [];
    
    for (const line of this.movementLines) {
      this.scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.movementLines = [];
  }

  // Helper methods for interaction
  getFleetMesh(): THREE.InstancedMesh | null {
    return this.fleetMesh;
  }

  getFleetIdByInstanceIndex(index: number): string | undefined {
    return this.fleetIds[index];
  }

  getInstanceIndexByFleetId(fleetId: string): number | undefined {
    return this.fleetIdMap.get(fleetId);
  }
}
