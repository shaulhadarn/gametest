// SystemRenderer.ts - Renders detailed solar system view with planets, moons, and effects
// Updated: Added planet name labels that position below planets regardless of size
// Labels account for planet radius and gas giant rings to ensure readability
// Uses CSS2D objects for crisp text rendering with proper shadows and styling

import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { EventBus } from '@/core/EventBus';
import { GameState } from '@/core/GameState';
import { Planet } from '@/models/Planet';
import { STAR_COLORS } from '@/core/Constants';
import { BLOOM_LAYER } from '@/rendering/SceneManager';
import sunVert from '@/rendering/shaders/sun.vert';
import sunFrag from '@/rendering/shaders/sun.frag';
import atmosphereVert from '@/rendering/shaders/atmosphere.vert';
import atmosphereFrag from '@/rendering/shaders/atmosphere.frag';
import planetVert from '@/rendering/shaders/planet.vert';
import planetFrag from '@/rendering/shaders/planet.frag';
import sunCoronaVert from '@/rendering/shaders/sunCorona.vert';
import sunCoronaFrag from '@/rendering/shaders/sunCorona.frag';

interface PlanetColorPalette {
  color1: THREE.Color;
  color2: THREE.Color;
  color3: THREE.Color;
  hasOcean: boolean;
  hasClouds: boolean;
}

const PLANET_PALETTES: Record<string, PlanetColorPalette> = {
  TERRAN: { color1: new THREE.Color(0x2266aa), color2: new THREE.Color(0x44aa44), color3: new THREE.Color(0x886633), hasOcean: true, hasClouds: true },
  OCEAN: { color1: new THREE.Color(0x1144cc), color2: new THREE.Color(0x2266dd), color3: new THREE.Color(0x113366), hasOcean: true, hasClouds: true },
  ARID: { color1: new THREE.Color(0xcc8844), color2: new THREE.Color(0xaa6622), color3: new THREE.Color(0xddaa66), hasOcean: false, hasClouds: false },
  TUNDRA: { color1: new THREE.Color(0xaabbcc), color2: new THREE.Color(0xddeeff), color3: new THREE.Color(0x667788), hasOcean: false, hasClouds: true },
  DESERT: { color1: new THREE.Color(0xddaa55), color2: new THREE.Color(0xcc8833), color3: new THREE.Color(0xeebb77), hasOcean: false, hasClouds: false },
  JUNGLE: { color1: new THREE.Color(0x228833), color2: new THREE.Color(0x115522), color3: new THREE.Color(0x44aa55), hasOcean: true, hasClouds: true },
  VOLCANIC: { color1: new THREE.Color(0xaa3311), color2: new THREE.Color(0xff6622), color3: new THREE.Color(0x331100), hasOcean: false, hasClouds: false },
  BARREN: { color1: new THREE.Color(0x666666), color2: new THREE.Color(0x888888), color3: new THREE.Color(0x444444), hasOcean: false, hasClouds: false },
  TOXIC: { color1: new THREE.Color(0x88aa22), color2: new THREE.Color(0x667711), color3: new THREE.Color(0xaacc44), hasOcean: false, hasClouds: true },
  GAS_GIANT: { color1: new THREE.Color(0xcc9955), color2: new THREE.Color(0xaa7733), color3: new THREE.Color(0xeebb88), hasOcean: false, hasClouds: true },
};

const ATMOSPHERE_COLORS: Record<string, number> = {
  TERRAN: 0x4488ff,
  OCEAN: 0x4466ff,
  JUNGLE: 0x44ff88,
  TOXIC: 0x88ff44,
  GAS_GIANT: 0xffaa44,
};

interface PlanetOrbitData {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  atmosphereMesh: THREE.Mesh | null;
  colonyIndicator: THREE.Mesh | null;
  ringMesh: THREE.Mesh | null;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
  spinSpeed: number;
  planetId: string;
  planetSize: number;
}

interface MoonData {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number;
  orbitOffset: number;
  planetData: PlanetOrbitData;
}

export class SystemRenderer {
  private scene: THREE.Scene;
  private eventBus: EventBus;
  private objects: THREE.Object3D[] = [];
  private planetOrbits: PlanetOrbitData[] = [];
  private moonDataList: MoonData[] = [];
  private planetLabels: CSS2DObject[] = [];
  private sunMaterial: THREE.ShaderMaterial | null = null;
  private coronaMaterial: THREE.ShaderMaterial | null = null;
  private coronaMesh: THREE.Mesh | null = null;
  private asteroidBelt: THREE.InstancedMesh | null = null;
  private dustPoints: THREE.Points | null = null;
  private time = 0;
  private active = false;
  private density = 1.0;
  private selectionRing: THREE.Mesh | null = null;
  private selectedPlanetId: string | null = null;

  constructor(scene: THREE.Scene, eventBus: EventBus) {
    this.scene = scene;
    this.eventBus = eventBus;
  }

  setParticleDensity(density: number): void {
    this.density = density;
  }

  build(starId: string, state: GameState): void {
    this.clear();
    this.active = true;

    const star = state.stars[starId];
    if (!star) return;

    // Sun
    const sunColor = new THREE.Color(STAR_COLORS[star.type]);
    const sunGeom = new THREE.SphereGeometry(8, 32, 32);
    this.sunMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: sunColor },
        uTime: { value: 0 },
      },
      vertexShader: sunVert,
      fragmentShader: sunFrag,
      toneMapped: false,
    });
    const sunMesh = new THREE.Mesh(sunGeom, this.sunMaterial);
    sunMesh.layers.enable(BLOOM_LAYER);
    this.scene.add(sunMesh);
    this.objects.push(sunMesh);

    // Sun glow
    const glowGeom = new THREE.SphereGeometry(12, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: sunColor,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide,
      toneMapped: false,
    });
    const glowMesh = new THREE.Mesh(glowGeom, glowMat);
    glowMesh.layers.enable(BLOOM_LAYER);
    this.scene.add(glowMesh);
    this.objects.push(glowMesh);

    // Sun corona rays
    this.buildSunCorona(sunColor);

    // Sun light
    const sunLight = new THREE.PointLight(STAR_COLORS[star.type], 2, 200);
    this.scene.add(sunLight);
    this.objects.push(sunLight);

    // Planets
    const planets = star.planetIds.map(pid => state.planets[pid]).filter(Boolean);
    for (let i = 0; i < planets.length; i++) {
      this.buildPlanet(planets[i], i);
    }

    // Asteroid belt (placed between middle orbits)
    const beltRadius = 25 + Math.floor(planets.length / 2) * 18 + 9;
    this.buildAsteroidBelt(beltRadius);

    // Space dust scattered throughout system
    const maxOrbit = 25 + planets.length * 18 + 20;
    this.buildSpaceDust(maxOrbit);

    // Build selection ring (reused for any planet)
    this.buildSelectionRing();
  }

  private buildSunCorona(color: THREE.Color): void {
    const coronaGeom = new THREE.PlaneGeometry(60, 60);
    this.coronaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: color.clone() },
        uTime: { value: 0 },
      },
      vertexShader: sunCoronaVert,
      fragmentShader: sunCoronaFrag,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.coronaMesh = new THREE.Mesh(coronaGeom, this.coronaMaterial);
    this.coronaMesh.layers.enable(BLOOM_LAYER);
    this.scene.add(this.coronaMesh);
    this.objects.push(this.coronaMesh);
  }

  private buildPlanet(planet: Planet, orbitIndex: number): void {
    const orbitRadius = 25 + orbitIndex * 18;
    const planetSize = 1 + planet.size * 0.8;

    // Orbit ring
    const orbitGeom = new THREE.RingGeometry(orbitRadius - 0.1, orbitRadius + 0.1, 64);
    const orbitMat = new THREE.MeshBasicMaterial({
      color: 0x334455,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const orbitRing = new THREE.Mesh(orbitGeom, orbitMat);
    orbitRing.rotation.x = -Math.PI / 2;
    this.scene.add(orbitRing);
    this.objects.push(orbitRing);

    // Planet with procedural shader
    const palette = PLANET_PALETTES[planet.type] || PLANET_PALETTES.BARREN;
    const seed = this.hashString(planet.id);
    const planetGeom = new THREE.SphereGeometry(planetSize, 32, 24);
    const planetMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor1: { value: palette.color1.clone() },
        uColor2: { value: palette.color2.clone() },
        uColor3: { value: palette.color3.clone() },
        uHasOcean: { value: palette.hasOcean ? 1.0 : 0.0 },
        uHasClouds: { value: palette.hasClouds ? 1.0 : 0.0 },
        uTime: { value: 0.0 },
        uSeed: { value: seed },
        uSpinAngle: { value: 0.0 },
      },
      vertexShader: planetVert,
      fragmentShader: planetFrag,
    });

    const planetMesh = new THREE.Mesh(planetGeom, planetMat);

    // Position along orbit (deterministic)
    const angle = (seed * 137.508) % (Math.PI * 2);
    planetMesh.position.set(
      Math.cos(angle) * orbitRadius,
      0,
      Math.sin(angle) * orbitRadius,
    );
    planetMesh.userData.planetId = planet.id;
    planetMesh.userData.isPlanet = true;
    planetMesh.userData.orbitRadius = orbitRadius;
    planetMesh.userData.orbitAngle = angle;

    // Slight axial tilt
    planetMesh.rotation.z = (seed - 0.5) * 0.4;

    this.scene.add(planetMesh);
    this.objects.push(planetMesh);

    // Orbit speed (Kepler-ish: slower for outer planets)
    const orbitSpeed = 0.015 / Math.sqrt(orbitRadius / 25);

    // Self-rotation speed: varies by planet type and seed
    // Gas giants spin fast, small rocky planets spin slower, with seed-based variation
    const baseSpin = planet.type === 'GAS_GIANT' ? 0.15 : 0.03 + (1 / (planetSize + 0.5)) * 0.06;
    const spinSpeed = baseSpin + (seed - 0.5) * 0.04;

    // Atmosphere (for habitable planets)
    let atmosphereMesh: THREE.Mesh | null = null;
    const atmoColor = ATMOSPHERE_COLORS[planet.type];
    if (atmoColor && planet.habitability > 20) {
      const atmoGeom = new THREE.SphereGeometry(planetSize * 1.15, 24, 16);
      const atmoMat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(atmoColor) },
          uIntensity: { value: planet.habitability / 100 },
        },
        vertexShader: atmosphereVert,
        fragmentShader: atmosphereFrag,
        transparent: true,
        side: THREE.FrontSide,
        depthWrite: false,
      });
      atmosphereMesh = new THREE.Mesh(atmoGeom, atmoMat);
      atmosphereMesh.position.copy(planetMesh.position);
      this.scene.add(atmosphereMesh);
      this.objects.push(atmosphereMesh);
    }

    // Colony indicator
    let colonyIndicator: THREE.Mesh | null = null;
    if (planet.colonyId) {
      const indicatorGeom = new THREE.RingGeometry(planetSize + 0.5, planetSize + 0.8, 16);
      const indicatorMat = new THREE.MeshBasicMaterial({
        color: 0x44ff44,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      colonyIndicator = new THREE.Mesh(indicatorGeom, indicatorMat);
      colonyIndicator.position.set(planetMesh.position.x, -0.3, planetMesh.position.z);
      colonyIndicator.rotation.x = -Math.PI / 2;
      this.scene.add(colonyIndicator);
      this.objects.push(colonyIndicator);
    }

    // Gas giant rings
    let ringMesh: THREE.Mesh | null = null;
    if (planet.type === 'GAS_GIANT') {
      ringMesh = this.buildPlanetRings(planetMesh.position, planetSize, seed);
    }

    const orbitData: PlanetOrbitData = {
      mesh: planetMesh,
      material: planetMat,
      atmosphereMesh,
      colonyIndicator,
      ringMesh,
      orbitRadius,
      orbitAngle: angle,
      orbitSpeed,
      spinSpeed,
      planetId: planet.id,
      planetSize,
    };

    this.planetOrbits.push(orbitData);

    // Planet label - positioned below planet regardless of size
    const labelDiv = document.createElement('div');
    labelDiv.className = 'planet-label';
    labelDiv.textContent = planet.name;
    labelDiv.style.cssText = `
      color: #ffffff;
      font-size: 11px;
      font-family: 'Segoe UI', sans-serif;
      font-weight: 500;
      text-shadow: 0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6);
      pointer-events: none;
      white-space: nowrap;
      opacity: 0.9;
      transform: translateY(-8px);
    `;

    const label = new CSS2DObject(labelDiv);
    // Position label below the planet, accounting for planet size and any rings
    const labelOffset = planetSize + (planet.type === 'GAS_GIANT' ? planetSize * 1.5 : planetSize * 0.5) + 2;
    label.position.set(
      planetMesh.position.x,
      planetMesh.position.y - labelOffset,
      planetMesh.position.z
    );
    this.planetLabels.push(label);
    this.scene.add(label);

    // Moons
    if (planet.moonCount > 0) {
      this.buildMoons(planet, orbitData, planetSize, seed);
    }
  }

  private buildPlanetRings(position: THREE.Vector3, planetSize: number, seed: number): THREE.Mesh {
    const innerR = planetSize * 1.4;
    const outerR = planetSize * 2.4;
    const ringGeom = new THREE.RingGeometry(innerR, outerR, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.8 + seed * 0.1, 0.7 + seed * 0.1, 0.5 + seed * 0.15),
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.position.copy(position);
    ringMesh.rotation.x = -Math.PI / 2 + (seed - 0.5) * 0.3;
    this.scene.add(ringMesh);
    this.objects.push(ringMesh);
    return ringMesh;
  }

  private buildMoons(planet: Planet, parentData: PlanetOrbitData, planetSize: number, baseSeed: number): void {
    const moonGeom = new THREE.SphereGeometry(1, 12, 8);

    for (let i = 0; i < planet.moonCount; i++) {
      const moonRadius = 0.2 + (baseSeed * (i + 1) * 0.13 % 0.2);
      const grayVal = 0.4 + (baseSeed * (i + 1) * 0.17 % 0.3);

      const moonMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(grayVal * 0.8, grayVal * 0.8, grayVal * 0.75),
      });

      const moonMesh = new THREE.Mesh(moonGeom, moonMat);
      moonMesh.scale.setScalar(moonRadius);

      const orbitRadius = planetSize * 2.0 + i * 0.6;
      const orbitSpeed = 0.5 + i * 0.2;
      const orbitOffset = (baseSeed * (i + 7) * 2.39) % (Math.PI * 2);

      const px = parentData.mesh.position.x;
      const py = parentData.mesh.position.y;
      const pz = parentData.mesh.position.z;

      moonMesh.position.set(
        px + Math.cos(orbitOffset) * orbitRadius,
        py + Math.sin(orbitOffset * 0.3) * 0.2,
        pz + Math.sin(orbitOffset) * orbitRadius,
      );

      this.scene.add(moonMesh);
      this.objects.push(moonMesh);

      this.moonDataList.push({
        mesh: moonMesh,
        orbitRadius,
        orbitSpeed,
        orbitOffset,
        planetData: parentData,
      });
    }
  }

  private buildAsteroidBelt(orbitRadius: number): void {
    const count = Math.floor(300 * this.density);
    const geom = new THREE.IcosahedronGeometry(0.12, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: false });
    this.asteroidBelt = new THREE.InstancedMesh(geom, mat, count);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.sin(i * 3.7) * 0.15;
      const r = orbitRadius + Math.sin(i * 7.3) * 3;
      const y = Math.sin(i * 13.1) * 0.75;

      dummy.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
      dummy.scale.set(
        0.4 + Math.abs(Math.sin(i * 5.3)) * 1.2,
        0.3 + Math.abs(Math.sin(i * 7.7)) * 0.8,
        0.4 + Math.abs(Math.sin(i * 11.1)) * 1.0,
      );
      dummy.rotation.set(i * 1.1, i * 2.3, i * 0.7);
      dummy.updateMatrix();
      this.asteroidBelt.setMatrixAt(i, dummy.matrix);

      const brightness = 0.3 + Math.abs(Math.sin(i * 4.7)) * 0.35;
      color.setRGB(brightness * 0.9, brightness * 0.85, brightness * 0.7);
      this.asteroidBelt.setColorAt(i, color);
    }

    this.asteroidBelt.instanceMatrix.needsUpdate = true;
    if (this.asteroidBelt.instanceColor) this.asteroidBelt.instanceColor.needsUpdate = true;
    this.scene.add(this.asteroidBelt);
    this.objects.push(this.asteroidBelt);
  }

  private buildSpaceDust(radius: number): void {
    const count = Math.floor(400 * this.density);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = 5 + Math.random() * radius;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 30;

      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * r;

      const brightness = 0.2 + Math.random() * 0.3;
      colors[i * 3] = brightness * 0.8;
      colors[i * 3 + 1] = brightness * 0.9;
      colors[i * 3 + 2] = brightness;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.15,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
      depthWrite: false,
      vertexColors: true,
    });

    this.dustPoints = new THREE.Points(geom, mat);
    this.scene.add(this.dustPoints);
    this.objects.push(this.dustPoints);
  }

  private buildSelectionRing(): void {
    const ringGeom = new THREE.RingGeometry(2.5, 3.0, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x44bbff,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.selectionRing = new THREE.Mesh(ringGeom, ringMat);
    this.selectionRing.rotation.x = -Math.PI / 2;
    this.selectionRing.visible = false;
    this.scene.add(this.selectionRing);
    this.objects.push(this.selectionRing);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash) / 2147483647;
  }

  selectPlanet(planetId: string): void {
    this.selectedPlanetId = planetId;
    const orbit = this.planetOrbits.find(o => o.planetId === planetId);
    if (orbit && this.selectionRing) {
      const planetSize = (orbit.mesh.geometry as THREE.SphereGeometry).parameters.radius;
      this.selectionRing.position.set(orbit.mesh.position.x, -0.3, orbit.mesh.position.z);
      this.selectionRing.scale.setScalar(planetSize * 0.8);
      this.selectionRing.visible = true;
    }
  }

  deselectPlanet(): void {
    this.selectedPlanetId = null;
    if (this.selectionRing) {
      this.selectionRing.visible = false;
    }
  }

  getPlanetMeshes(): THREE.Mesh[] {
    return this.planetOrbits.map(o => o.mesh);
  }

  isActive(): boolean {
    return this.active;
  }

  update(camera: THREE.Camera, deltaTime: number): void {
    if (!this.active) return;
    this.time += deltaTime;

    // Sun shader
    if (this.sunMaterial) {
      this.sunMaterial.uniforms.uTime.value = this.time;
    }

    // Corona billboard toward camera
    if (this.coronaMesh && this.coronaMaterial) {
      this.coronaMesh.quaternion.copy(camera.quaternion);
      this.coronaMaterial.uniforms.uTime.value = this.time;
    }

    // Orbital motion + planet self-rotation
    for (const orbit of this.planetOrbits) {
      orbit.orbitAngle += deltaTime * orbit.orbitSpeed;

      const x = Math.cos(orbit.orbitAngle) * orbit.orbitRadius;
      const z = Math.sin(orbit.orbitAngle) * orbit.orbitRadius;

      orbit.mesh.position.set(x, 0, z);
      orbit.material.uniforms.uTime.value = this.time;
      orbit.material.uniforms.uSpinAngle.value += deltaTime * orbit.spinSpeed;

      if (orbit.atmosphereMesh) {
        orbit.atmosphereMesh.position.set(x, 0, z);
      }
      if (orbit.colonyIndicator) {
        orbit.colonyIndicator.position.set(x, -0.3, z);
      }
      if (orbit.ringMesh) {
        orbit.ringMesh.position.set(x, 0, z);
      }
    }

    // Update planet label positions to follow planets during orbital motion
    for (let i = 0; i < this.planetOrbits.length && i < this.planetLabels.length; i++) {
      const orbit = this.planetOrbits[i];
      const label = this.planetLabels[i];
      
      // Label offset based on stored planet size and ring presence
      const planetSize: number = orbit.planetSize;
      const hasRings = orbit.ringMesh !== null;
      const labelOffset = planetSize + (hasRings ? planetSize * 1.5 : planetSize * 0.5) + 2;
      
      // Position label below planet, accounting for size and rings
      label.position.set(
        orbit.mesh.position.x,
        orbit.mesh.position.y - labelOffset,
        orbit.mesh.position.z
      );
    }

    // Moon orbits with sun-facing brightness
    for (const moon of this.moonDataList) {
      const px = moon.planetData.mesh.position.x;
      const py = moon.planetData.mesh.position.y;
      const pz = moon.planetData.mesh.position.z;

      const angle = moon.orbitOffset + this.time * moon.orbitSpeed;
      const mx = px + Math.cos(angle) * moon.orbitRadius;
      const my = py + Math.sin(angle * 0.3) * 0.2;
      const mz = pz + Math.sin(angle) * moon.orbitRadius;
      moon.mesh.position.set(mx, my, mz);

      // Sun-facing brightness (sun at origin)
      const dist = Math.sqrt(mx * mx + my * my + mz * mz);
      const parentDist = Math.sqrt(px * px + pz * pz);
      const sunDot = dist > 0 && parentDist > 0
        ? -(mx * px + mz * pz) / (dist * parentDist + 0.001)
        : 0;
      const brightness = 0.5 + Math.max(0, sunDot) * 0.5;
      const baseMat = moon.mesh.material as THREE.MeshBasicMaterial;
      const base = baseMat.userData.baseGray ?? (baseMat.userData.baseGray = baseMat.color.r);
      baseMat.color.setRGB(base * brightness, base * brightness, base * brightness * 0.95);
    }

    // Selection ring tracks orbiting planet
    if (this.selectionRing && this.selectionRing.visible && this.selectedPlanetId) {
      const orbit = this.planetOrbits.find(o => o.planetId === this.selectedPlanetId);
      if (orbit) {
        this.selectionRing.position.set(orbit.mesh.position.x, -0.3, orbit.mesh.position.z);
      }
      const pulse = 0.5 + Math.sin(this.time * 3.0) * 0.3;
      (this.selectionRing.material as THREE.MeshBasicMaterial).opacity = pulse;
      this.selectionRing.rotation.z = this.time * 0.4;
    }

    // Asteroid belt slow rotation
    if (this.asteroidBelt) {
      this.asteroidBelt.rotation.y += deltaTime * 0.003;
    }

    // Space dust slow drift
    if (this.dustPoints) {
      this.dustPoints.rotation.y += deltaTime * 0.001;
    }
  }

  clear(): void {
    for (const obj of this.objects) {
      this.scene.remove(obj);
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      } else if (obj instanceof THREE.Points) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    }
    this.objects = [];
    this.planetOrbits = [];
    this.moonDataList = [];
    
    // Clear planet labels
    for (const label of this.planetLabels) {
      this.scene.remove(label);
    }
    this.planetLabels = [];
    
    this.sunMaterial = null;
    this.coronaMaterial = null;
    this.coronaMesh = null;
    this.asteroidBelt = null;
    this.dustPoints = null;
    this.selectionRing = null;
    this.selectedPlanetId = null;
    this.active = false;
  }
}
