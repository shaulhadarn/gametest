import * as THREE from 'three';
import { EventBus } from '@/core/EventBus';
import { GameState } from '@/core/GameState';
import { Planet } from '@/models/Planet';
import { STAR_COLORS } from '@/core/Constants';
import { BLOOM_LAYER } from '@/rendering/SceneManager';
import sunVert from '@/rendering/shaders/sun.vert';
import sunFrag from '@/rendering/shaders/sun.frag';
import planetVert from '@/rendering/shaders/planet.vert';
import planetFrag from '@/rendering/shaders/planet.frag';
import atmosphereVert from '@/rendering/shaders/atmosphere.vert';
import atmosphereFrag from '@/rendering/shaders/atmosphere.frag';
import sunCoronaVert from '@/rendering/shaders/sunCorona.vert';
import sunCoronaFrag from '@/rendering/shaders/sunCorona.frag';

const PLANET_PALETTES: Record<string, { c1: THREE.Color; c2: THREE.Color; c3: THREE.Color; hasOcean: boolean; hasClouds: boolean }> = {
  TERRAN: { c1: new THREE.Color(0x2266aa), c2: new THREE.Color(0x44aa44), c3: new THREE.Color(0x886633), hasOcean: true, hasClouds: true },
  OCEAN: { c1: new THREE.Color(0x1144cc), c2: new THREE.Color(0x2266dd), c3: new THREE.Color(0x113366), hasOcean: true, hasClouds: true },
  ARID: { c1: new THREE.Color(0xcc8844), c2: new THREE.Color(0xaa6622), c3: new THREE.Color(0xddaa66), hasOcean: false, hasClouds: false },
  TUNDRA: { c1: new THREE.Color(0xaabbcc), c2: new THREE.Color(0xddeeff), c3: new THREE.Color(0x667788), hasOcean: false, hasClouds: true },
  DESERT: { c1: new THREE.Color(0xddaa55), c2: new THREE.Color(0xcc8833), c3: new THREE.Color(0xeebb77), hasOcean: false, hasClouds: false },
  JUNGLE: { c1: new THREE.Color(0x228833), c2: new THREE.Color(0x115522), c3: new THREE.Color(0x44aa55), hasOcean: true, hasClouds: true },
  VOLCANIC: { c1: new THREE.Color(0xaa3311), c2: new THREE.Color(0xff6622), c3: new THREE.Color(0x331100), hasOcean: false, hasClouds: false },
  BARREN: { c1: new THREE.Color(0x666666), c2: new THREE.Color(0x888888), c3: new THREE.Color(0x444444), hasOcean: false, hasClouds: false },
  TOXIC: { c1: new THREE.Color(0x88aa22), c2: new THREE.Color(0x667711), c3: new THREE.Color(0xaacc44), hasOcean: false, hasClouds: true },
  GAS_GIANT: { c1: new THREE.Color(0xcc9955), c2: new THREE.Color(0xaa7733), c3: new THREE.Color(0xeebb88), hasOcean: false, hasClouds: true },
};

const ATMO_COLORS: Record<string, number> = {
  TERRAN: 0x4488ff, OCEAN: 0x4466ff, JUNGLE: 0x44ff88, TOXIC: 0x88ff44, GAS_GIANT: 0xffaa44,
};

interface FlightPlanetData {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  atmosphere: THREE.Mesh | null;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
  planetSize: number;
  ringMesh: THREE.Mesh | null;
}

export class FlightRenderer {
  private scene: THREE.Scene;
  private eventBus: EventBus;
  private objects: THREE.Object3D[] = [];
  private planetData: FlightPlanetData[] = [];
  private shipGroup: THREE.Group | null = null;
  private sunMaterial: THREE.ShaderMaterial | null = null;
  private coronaMaterial: THREE.ShaderMaterial | null = null;
  private coronaMesh: THREE.Mesh | null = null;
  private engineGlow: THREE.PointLight | null = null;
  private exhaustCones: THREE.Mesh[] = [];
  private engineGlowMeshes: THREE.Mesh[] = [];
  private dustParticles: THREE.Points | null = null;
  private bgStars: THREE.Points | null = null;
  private speedDust: THREE.Points | null = null;
  private time = 0;
  private active = false;

  // Ship state
  shipPosition = new THREE.Vector3(0, 5, 60);
  shipRotation = new THREE.Euler(0, Math.PI, 0);
  shipVelocity = new THREE.Vector3();
  private shipQuaternion = new THREE.Quaternion();

  constructor(scene: THREE.Scene, eventBus: EventBus) {
    this.scene = scene;
    this.eventBus = eventBus;
  }

  build(starId: string, state: GameState): void {
    this.clear();
    this.active = true;

    const star = state.stars[starId];
    if (!star) return;

    // Build star system environment
    const sunColor = new THREE.Color(STAR_COLORS[star.type]);
    this.buildSun(sunColor);
    this.buildSunCorona(sunColor);

    // Planets
    const planets = star.planetIds.map(pid => state.planets[pid]).filter(Boolean);
    for (let i = 0; i < planets.length; i++) {
      this.buildPlanet(planets[i], i);
    }

    // Background starfield (large sphere of stars)
    this.buildStarfield();

    // Local space dust
    const maxOrbit = 25 + planets.length * 18 + 40;
    this.buildSpaceDust(maxOrbit);

    // Speed dust (particles that streak past when moving fast)
    this.buildSpeedDust();

    // Build the player's ship
    this.buildShip();

    // Position ship near first planet
    if (planets.length > 0) {
      this.shipPosition.set(35, 5, 15);
    }
  }

  private buildSun(color: THREE.Color): void {
    const sunGeom = new THREE.SphereGeometry(8, 32, 32);
    this.sunMaterial = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: color }, uTime: { value: 0 } },
      vertexShader: sunVert,
      fragmentShader: sunFrag,
      toneMapped: false,
    });
    const sunMesh = new THREE.Mesh(sunGeom, this.sunMaterial);
    sunMesh.layers.enable(BLOOM_LAYER);
    this.scene.add(sunMesh);
    this.objects.push(sunMesh);

    // Sun glow
    const glowGeom = new THREE.SphereGeometry(14, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.15, side: THREE.BackSide, toneMapped: false,
    });
    const glowMesh = new THREE.Mesh(glowGeom, glowMat);
    glowMesh.layers.enable(BLOOM_LAYER);
    this.scene.add(glowMesh);
    this.objects.push(glowMesh);

    // Sun light
    const sunLight = new THREE.PointLight(color.getHex(), 2, 300);
    this.scene.add(sunLight);
    this.objects.push(sunLight);
  }

  private buildSunCorona(color: THREE.Color): void {
    const coronaGeom = new THREE.PlaneGeometry(60, 60);
    this.coronaMaterial = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: color.clone() }, uTime: { value: 0 } },
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
    const palette = PLANET_PALETTES[planet.type] || PLANET_PALETTES.BARREN;
    const seed = this.hashString(planet.id);

    // Orbit ring
    const orbitGeom = new THREE.RingGeometry(orbitRadius - 0.08, orbitRadius + 0.08, 128);
    const orbitMat = new THREE.MeshBasicMaterial({
      color: 0x334455, transparent: true, opacity: 0.2, side: THREE.DoubleSide,
    });
    const orbitRing = new THREE.Mesh(orbitGeom, orbitMat);
    orbitRing.rotation.x = -Math.PI / 2;
    this.scene.add(orbitRing);
    this.objects.push(orbitRing);

    // Planet
    const planetGeom = new THREE.SphereGeometry(planetSize, 48, 32);
    const planetMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor1: { value: palette.c1.clone() },
        uColor2: { value: palette.c2.clone() },
        uColor3: { value: palette.c3.clone() },
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
    const angle = (seed * 137.508) % (Math.PI * 2);
    planetMesh.position.set(Math.cos(angle) * orbitRadius, 0, Math.sin(angle) * orbitRadius);
    planetMesh.rotation.z = (seed - 0.5) * 0.4;
    this.scene.add(planetMesh);
    this.objects.push(planetMesh);

    const orbitSpeed = 0.015 / Math.sqrt(orbitRadius / 25);

    // Atmosphere
    let atmosphere: THREE.Mesh | null = null;
    const atmoColor = ATMO_COLORS[planet.type];
    if (atmoColor && planet.habitability > 20) {
      const atmoGeom = new THREE.SphereGeometry(planetSize * 1.15, 32, 24);
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
      atmosphere = new THREE.Mesh(atmoGeom, atmoMat);
      atmosphere.position.copy(planetMesh.position);
      this.scene.add(atmosphere);
      this.objects.push(atmosphere);
    }

    // Rings for gas giants
    let ringMesh: THREE.Mesh | null = null;
    if (planet.type === 'GAS_GIANT') {
      const innerR = planetSize * 1.4;
      const outerR = planetSize * 2.4;
      const ringGeom = new THREE.RingGeometry(innerR, outerR, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.8 + seed * 0.1, 0.7 + seed * 0.1, 0.5 + seed * 0.15),
        transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false,
      });
      ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.position.copy(planetMesh.position);
      ringMesh.rotation.x = -Math.PI / 2 + (seed - 0.5) * 0.3;
      this.scene.add(ringMesh);
      this.objects.push(ringMesh);
    }

    this.planetData.push({
      mesh: planetMesh, material: planetMat, atmosphere, ringMesh,
      orbitRadius, orbitAngle: angle, orbitSpeed, planetSize,
    });
  }

  private buildStarfield(): void {
    const count = 15000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distributed on a large sphere
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = 800 + Math.random() * 1200;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Color variety
      const t = Math.random();
      if (t < 0.5) {
        colors[i * 3] = 0.9; colors[i * 3 + 1] = 0.92; colors[i * 3 + 2] = 1.0;
      } else if (t < 0.75) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 0.8;
      } else if (t < 0.9) {
        colors[i * 3] = 0.7; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 1.0;
      } else {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 1.0;
      }

      sizes[i] = 0.5 + Math.random() * 2.5;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 1.2, transparent: true, opacity: 0.85,
      sizeAttenuation: true, vertexColors: true, depthWrite: false,
    });

    this.bgStars = new THREE.Points(geom, mat);
    this.scene.add(this.bgStars);
    this.objects.push(this.bgStars);
  }

  private buildSpaceDust(radius: number): void {
    const count = 600;
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
      size: 0.2, transparent: true, opacity: 0.5,
      sizeAttenuation: true, depthWrite: false, vertexColors: true,
    });

    this.dustParticles = new THREE.Points(geom, mat);
    this.scene.add(this.dustParticles);
    this.objects.push(this.dustParticles);
  }

  private buildSpeedDust(): void {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
      colors[i * 3] = 0.6; colors[i * 3 + 1] = 0.7; colors[i * 3 + 2] = 1.0;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.12, transparent: true, opacity: 0,
      sizeAttenuation: true, depthWrite: false, vertexColors: true,
    });

    this.speedDust = new THREE.Points(geom, mat);
    this.scene.add(this.speedDust);
    this.objects.push(this.speedDust);
  }

  private buildShip(): void {
    this.shipGroup = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x3a4555, metalness: 0.85, roughness: 0.25,
    });
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x2a3545, metalness: 0.9, roughness: 0.2,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x556677, metalness: 0.7, roughness: 0.35,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x1a2030, metalness: 0.95, roughness: 0.15,
    });

    // === Main fuselage - tapered nose to wide mid to narrow tail ===
    // Nose cone (sharp, elongated)
    const noseGeom = new THREE.ConeGeometry(0.35, 2.4, 6);
    noseGeom.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeom, bodyMat);
    nose.position.set(0, 0, -2.8);
    this.shipGroup.add(nose);

    // Forward fuselage (widens from nose)
    const fwdShape = new THREE.Shape();
    fwdShape.moveTo(-0.5, -0.18);
    fwdShape.lineTo(0.5, -0.18);
    fwdShape.lineTo(0.55, 0.05);
    fwdShape.lineTo(0.35, 0.25);
    fwdShape.lineTo(-0.35, 0.25);
    fwdShape.lineTo(-0.55, 0.05);
    fwdShape.closePath();
    const fwdGeom = new THREE.ExtrudeGeometry(fwdShape, { depth: 2.0, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 });
    const fwdHull = new THREE.Mesh(fwdGeom, bodyMat);
    fwdHull.position.set(0, 0, -1.6);
    this.shipGroup.add(fwdHull);

    // Mid fuselage (widest section)
    const midShape = new THREE.Shape();
    midShape.moveTo(-0.65, -0.2);
    midShape.lineTo(0.65, -0.2);
    midShape.lineTo(0.7, 0.05);
    midShape.lineTo(0.45, 0.3);
    midShape.lineTo(-0.45, 0.3);
    midShape.lineTo(-0.7, 0.05);
    midShape.closePath();
    const midGeom = new THREE.ExtrudeGeometry(midShape, { depth: 1.6, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
    const midHull = new THREE.Mesh(midGeom, bodyMat);
    midHull.position.set(0, 0, 0.4);
    this.shipGroup.add(midHull);

    // Rear fuselage (narrows to engines)
    const rearShape = new THREE.Shape();
    rearShape.moveTo(-0.55, -0.18);
    rearShape.lineTo(0.55, -0.18);
    rearShape.lineTo(0.5, 0.08);
    rearShape.lineTo(0.3, 0.22);
    rearShape.lineTo(-0.3, 0.22);
    rearShape.lineTo(-0.5, 0.08);
    rearShape.closePath();
    const rearGeom = new THREE.ExtrudeGeometry(rearShape, { depth: 1.2, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
    const rearHull = new THREE.Mesh(rearGeom, panelMat);
    rearHull.position.set(0, 0, 2.0);
    this.shipGroup.add(rearHull);

    // === Canopy (elongated cockpit bubble) ===
    const canopyGeom = new THREE.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    canopyGeom.scale(1.0, 0.8, 2.0);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x66bbee, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.65,
      envMapIntensity: 2.0,
    });
    const canopy = new THREE.Mesh(canopyGeom, canopyMat);
    canopy.position.set(0, 0.28, -1.2);
    this.shipGroup.add(canopy);

    // Canopy frame strips
    for (const zOff of [-0.3, 0, 0.3]) {
      const frameGeom = new THREE.BoxGeometry(0.56, 0.03, 0.025);
      const frame = new THREE.Mesh(frameGeom, darkMat);
      frame.position.set(0, 0.42, -1.2 + zOff);
      this.shipGroup.add(frame);
    }

    // === Main delta wings (swept) ===
    for (const side of [-1, 1]) {
      // Wing panel (swept triangle using shape)
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.lineTo(2.8 * side, -0.4);
      wingShape.lineTo(2.4 * side, -0.4);
      wingShape.lineTo(1.8 * side, 0.3);
      wingShape.lineTo(0, 1.0);
      wingShape.closePath();
      const wingGeom = new THREE.ExtrudeGeometry(wingShape, { depth: 0.06, bevelEnabled: false });
      const wing = new THREE.Mesh(wingGeom, panelMat);
      wing.rotation.x = Math.PI / 2;
      wing.position.set(0, -0.05, -0.2);
      this.shipGroup.add(wing);

      // Wing stripe (accent line)
      const stripeGeom = new THREE.BoxGeometry(1.6, 0.015, 0.08);
      const stripe = new THREE.Mesh(stripeGeom, accentMat);
      stripe.position.set(1.0 * side, -0.03, 0.3);
      stripe.rotation.y = -0.15 * side;
      this.shipGroup.add(stripe);

      // Wingtip detail
      const tipGeom = new THREE.BoxGeometry(0.15, 0.1, 0.4);
      const tip = new THREE.Mesh(tipGeom, accentMat);
      tip.position.set(2.65 * side, -0.05, 0.05);
      this.shipGroup.add(tip);

      // Wingtip nav light
      const navLightGeom = new THREE.SphereGeometry(0.04, 6, 4);
      const navLightMat = new THREE.MeshBasicMaterial({
        color: side < 0 ? 0xff2244 : 0x22ff44, toneMapped: false,
      });
      const navLight = new THREE.Mesh(navLightGeom, navLightMat);
      navLight.position.set(2.7 * side, -0.03, 0.15);
      navLight.layers.enable(BLOOM_LAYER);
      this.shipGroup.add(navLight);
    }

    // === Tail fins (vertical stabilizers) ===
    for (const side of [-1, 1]) {
      const finShape = new THREE.Shape();
      finShape.moveTo(0, 0);
      finShape.lineTo(0, 1.0);
      finShape.lineTo(0.4, 0.7);
      finShape.lineTo(0.5, 0);
      finShape.closePath();
      const finGeom = new THREE.ExtrudeGeometry(finShape, { depth: 0.04, bevelEnabled: false });
      const fin = new THREE.Mesh(finGeom, panelMat);
      fin.position.set(0.5 * side, 0.15, 2.4);
      fin.rotation.y = 0.15 * side;
      this.shipGroup.add(fin);
    }

    // === Horizontal stabilizers (small rear wings) ===
    for (const side of [-1, 1]) {
      const stabGeom = new THREE.BoxGeometry(1.2, 0.04, 0.5);
      const stab = new THREE.Mesh(stabGeom, panelMat);
      stab.position.set(0.6 * side, 0.0, 2.8);
      stab.rotation.z = 0.05 * side;
      this.shipGroup.add(stab);
    }

    // === Engine nacelles (twin) ===
    for (const xOff of [-0.5, 0.5]) {
      // Nacelle body
      const nacGeom = new THREE.CylinderGeometry(0.18, 0.22, 1.6, 10);
      nacGeom.rotateX(Math.PI / 2);
      const nacelle = new THREE.Mesh(nacGeom, darkMat);
      nacelle.position.set(xOff, -0.08, 2.6);
      this.shipGroup.add(nacelle);

      // Intake ring
      const intakeGeom = new THREE.TorusGeometry(0.2, 0.03, 6, 12);
      intakeGeom.rotateX(Math.PI / 2);
      const intake = new THREE.Mesh(intakeGeom, accentMat);
      intake.position.set(xOff, -0.08, 1.8);
      this.shipGroup.add(intake);

      // Nozzle (flared exhaust)
      const nozzleGeom = new THREE.CylinderGeometry(0.15, 0.26, 0.4, 10);
      nozzleGeom.rotateX(Math.PI / 2);
      const nozzle = new THREE.Mesh(nozzleGeom, darkMat);
      nozzle.position.set(xOff, -0.08, 3.55);
      this.shipGroup.add(nozzle);

      // Inner nozzle glow
      const glowGeom = new THREE.CylinderGeometry(0.13, 0.08, 0.3, 10);
      glowGeom.rotateX(Math.PI / 2);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x4499ff, transparent: true, opacity: 0.9, toneMapped: false,
      });
      const glow = new THREE.Mesh(glowGeom, glowMat);
      glow.position.set(xOff, -0.08, 3.7);
      glow.layers.enable(BLOOM_LAYER);
      this.shipGroup.add(glow);

      // Exhaust cone (faint, extends behind)
      const exhGeom = new THREE.ConeGeometry(0.2, 1.5, 8);
      exhGeom.rotateX(-Math.PI / 2);
      const exhMat = new THREE.MeshBasicMaterial({
        color: 0x3366cc, transparent: true, opacity: 0.25, toneMapped: false,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const exhaust = new THREE.Mesh(exhGeom, exhMat);
      exhaust.position.set(xOff, -0.08, 4.5);
      exhaust.layers.enable(BLOOM_LAYER);
      this.shipGroup.add(exhaust);
      this.exhaustCones.push(exhaust);
      this.engineGlowMeshes.push(glow);
    }

    // === Panel lines / surface detail ===
    // Dorsal spine ridge
    const spineGeom = new THREE.BoxGeometry(0.06, 0.08, 3.0);
    const spine = new THREE.Mesh(spineGeom, accentMat);
    spine.position.set(0, 0.28, 0.5);
    this.shipGroup.add(spine);

    // Ventral plate
    const ventralGeom = new THREE.BoxGeometry(0.8, 0.03, 2.0);
    const ventral = new THREE.Mesh(ventralGeom, darkMat);
    ventral.position.set(0, -0.2, 0.5);
    this.shipGroup.add(ventral);

    // === Engine point light ===
    this.engineGlow = new THREE.PointLight(0x4499ff, 2, 20);
    this.engineGlow.position.set(0, -0.05, 4.0);
    this.shipGroup.add(this.engineGlow);

    // === Lighting for the ship ===
    const shipLight = new THREE.DirectionalLight(0xffffff, 0.6);
    shipLight.position.set(2, 4, -3);
    this.shipGroup.add(shipLight);

    const fillLight = new THREE.DirectionalLight(0x334466, 0.3);
    fillLight.position.set(-2, -1, 1);
    this.shipGroup.add(fillLight);

    this.shipGroup.position.copy(this.shipPosition);
    this.scene.add(this.shipGroup);
    this.objects.push(this.shipGroup);
  }

  update(camera: THREE.Camera, deltaTime: number): void {
    if (!this.active) return;
    this.time += deltaTime;

    // Sun shader
    if (this.sunMaterial) this.sunMaterial.uniforms.uTime.value = this.time;
    if (this.coronaMesh && this.coronaMaterial) {
      this.coronaMesh.quaternion.copy(camera.quaternion);
      this.coronaMaterial.uniforms.uTime.value = this.time;
    }

    // Planet orbits
    for (const pd of this.planetData) {
      pd.orbitAngle += deltaTime * pd.orbitSpeed;
      const x = Math.cos(pd.orbitAngle) * pd.orbitRadius;
      const z = Math.sin(pd.orbitAngle) * pd.orbitRadius;
      pd.mesh.position.set(x, 0, z);
      pd.material.uniforms.uTime.value = this.time;
      pd.material.uniforms.uSpinAngle.value += deltaTime * 0.05;
      if (pd.atmosphere) pd.atmosphere.position.set(x, 0, z);
      if (pd.ringMesh) pd.ringMesh.position.set(x, 0, z);
    }

    // Update ship mesh
    if (this.shipGroup) {
      this.shipGroup.position.copy(this.shipPosition);
      this.shipQuaternion.setFromEuler(this.shipRotation);
      this.shipGroup.quaternion.copy(this.shipQuaternion);
    }

    // Engine glow intensity based on speed
    if (this.engineGlow) {
      const speed = this.shipVelocity.length();
      this.engineGlow.intensity = 1.5 + speed * 0.4;
      this.engineGlow.distance = 20 + speed * 0.5;

      // Animate exhaust cones
      for (const cone of this.exhaustCones) {
        const scale = 0.5 + Math.min(speed * 0.08, 2.5);
        cone.scale.set(scale * 0.7, scale * 0.7, scale);
        const mat = cone.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.min(0.5, 0.1 + speed * 0.02);
      }

      // Pulsate engine glow meshes
      for (const glowMesh of this.engineGlowMeshes) {
        const mat = glowMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.7 + Math.sin(this.time * 8) * 0.15 + Math.min(speed * 0.01, 0.15);
      }
    }

    // Speed dust - visible and moving relative to ship when fast
    if (this.speedDust) {
      const speed = this.shipVelocity.length();
      const mat = this.speedDust.material as THREE.PointsMaterial;
      mat.opacity = Math.min(0.6, speed * 0.03);
      this.speedDust.position.copy(this.shipPosition);
      this.speedDust.quaternion.copy(this.shipQuaternion);
    }

    // Background stars follow camera loosely
    if (this.bgStars) {
      this.bgStars.position.copy(camera.position);
    }
  }

  getShipGroup(): THREE.Group | null {
    return this.shipGroup;
  }

  isActive(): boolean {
    return this.active;
  }

  clear(): void {
    for (const obj of this.objects) {
      this.scene.remove(obj);
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => m.dispose());
      } else if (obj instanceof THREE.Points) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      } else if (obj instanceof THREE.Group) {
        obj.traverse(child => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(m => m.dispose());
          }
        });
      }
    }
    this.objects = [];
    this.planetData = [];
    this.shipGroup = null;
    this.sunMaterial = null;
    this.coronaMaterial = null;
    this.coronaMesh = null;
    this.engineGlow = null;
    this.exhaustCones = [];
    this.engineGlowMeshes = [];
    this.dustParticles = null;
    this.bgStars = null;
    this.speedDust = null;
    this.active = false;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) / 2147483647;
  }
}
