import { Random } from '@/core/Random';
import { generateId } from '@/core/IdGenerator';
import {
  GALAXY_SIZES,
  STAR_MIN_DISTANCE,
  WARP_LANE_MAX_DISTANCE,
  MAX_WARP_LANES_PER_STAR,
  STAR_TYPE_WEIGHTS,
} from '@/core/Constants';
import { Galaxy } from '@/models/Galaxy';
import { Star } from '@/models/Star';
import { StarType, Vec3, GalaxyShape } from '@/models/types';

const STAR_NAMES = [
  'Sol', 'Alpha Centauri', 'Sirius', 'Vega', 'Altair', 'Rigel', 'Betelgeuse',
  'Polaris', 'Antares', 'Arcturus', 'Capella', 'Deneb', 'Procyon', 'Achernar',
  'Canopus', 'Aldebaran', 'Spica', 'Fomalhaut', 'Regulus', 'Pollux',
  'Castor', 'Bellatrix', 'Mira', 'Rasalhague', 'Algol', 'Thuban', 'Elnath',
  'Alnilam', 'Alnitak', 'Mintaka', 'Saiph', 'Dubhe', 'Merak', 'Phecda',
  'Megrez', 'Alioth', 'Mizar', 'Alkaid', 'Kochab', 'Pherkad', 'Etamin',
  'Rastaban', 'Grumium', 'Albireo', 'Sheliak', 'Sulafat', 'Sadr', 'Gienah',
  'Acrux', 'Gacrux', 'Mimosa', 'Hadar', 'Atria', 'Shaula', 'Sargas',
  'Kaus Australis', 'Nunki', 'Ascella', 'Alhena', 'Tejat', 'Propus',
  'Mebsuta', 'Wasat', 'Alzirr', 'Zubenelgenubi', 'Zubeneschamali',
  'Dschubba', 'Acrab', 'Wei', 'Lesath', 'Sabik', 'Yed Prior', 'Yed Posterior',
  'Cebalrai', 'Marfik', 'Unukalhai', 'Alya', 'Sualocin', 'Rotanev',
  'Enif', 'Scheat', 'Markab', 'Algenib', 'Ankaa', 'Diphda', 'Hamal',
  'Sheratan', 'Mesarthim', 'Menkar', 'Mira Ceti', 'Alcyone', 'Atlas',
  'Electra', 'Maia', 'Merope', 'Taygeta', 'Celaeno', 'Pleione',
  'Vindemiatrix', 'Porrima', 'Auva', 'Zaniah', 'Zavijava', 'Syrma',
  'Khambalia', 'Algorab', 'Kraz', 'Minkar', 'Alchiba',
];

export class GalaxyGenerator {
  private rng: Random;

  constructor(rng: Random) {
    this.rng = rng;
  }

  generate(
    size: keyof typeof GALAXY_SIZES,
    shape: GalaxyShape,
  ): { galaxy: Galaxy; stars: Record<string, Star> } {
    const config = GALAXY_SIZES[size];
    const targetCount = config.stars;
    const radius = config.radius;

    // Generate star positions
    const positions = this.generatePositions(targetCount, radius, shape);

    // Assign star types
    const starTypeEntries = Object.entries(STAR_TYPE_WEIGHTS) as [StarType, number][];
    const typeWeights = starTypeEntries.map(([, w]) => w);
    const typeNames = starTypeEntries.map(([t]) => t);

    // Shuffle names
    const names = [...STAR_NAMES];
    this.rng.shuffle(names);

    // Create stars
    const stars: Record<string, Star> = {};
    const starIds: string[] = [];

    for (let i = 0; i < positions.length; i++) {
      const id = generateId('star');
      const typeIndex = this.rng.weightedPick(typeWeights);
      const star: Star = {
        id,
        name: names[i % names.length] + (i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : ''),
        position: positions[i],
        type: typeNames[typeIndex],
        planetIds: [],
        ownerId: null,
        warpLanes: [],
        explored: {},
      };
      stars[id] = star;
      starIds.push(id);
    }

    // Generate warp lanes using Delaunay-like nearest neighbor approach
    this.generateWarpLanes(stars, starIds);

    const galaxy: Galaxy = {
      id: generateId('galaxy'),
      starIds,
      width: radius * 2,
      height: radius * 2,
    };

    return { galaxy, stars };
  }

  private generatePositions(count: number, radius: number, shape: GalaxyShape): Vec3[] {
    const positions: Vec3[] = [];
    const maxAttempts = count * 50;
    let attempts = 0;

    while (positions.length < count && attempts < maxAttempts) {
      attempts++;
      let pos: Vec3;

      switch (shape) {
        case GalaxyShape.SPIRAL:
          pos = this.spiralPosition(radius);
          break;
        case GalaxyShape.ELLIPTICAL:
          pos = this.ellipticalPosition(radius);
          break;
        case GalaxyShape.RING:
          pos = this.ringPosition(radius);
          break;
        default:
          pos = this.spiralPosition(radius);
      }

      // Check minimum distance
      let valid = true;
      for (const existing of positions) {
        const dx = pos.x - existing.x;
        const dy = pos.y - existing.y;
        const dz = pos.z - existing.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < STAR_MIN_DISTANCE) {
          valid = false;
          break;
        }
      }

      if (valid) {
        positions.push(pos);
      }
    }

    return positions;
  }

  private spiralPosition(radius: number): Vec3 {
    const arm = this.rng.nextInt(0, 1); // 2 spiral arms
    const armAngle = arm * Math.PI;
    const t = this.rng.next(); // 0 to 1 along the arm
    const r = t * radius * 0.9;
    const angle = armAngle + t * Math.PI * 2.5; // ~2.5 full rotations
    const scatter = this.rng.nextGaussian(0, radius * 0.08);
    const scatterAngle = this.rng.nextGaussian(0, 0.3);

    return {
      x: Math.cos(angle + scatterAngle) * r + scatter,
      y: this.rng.nextGaussian(0, radius * 0.02), // thin disk
      z: Math.sin(angle + scatterAngle) * r + scatter,
    };
  }

  private ellipticalPosition(radius: number): Vec3 {
    const r = this.rng.next() * radius * 0.8;
    const theta = this.rng.next() * Math.PI * 2;
    const phi = this.rng.nextGaussian(Math.PI / 2, 0.3);

    return {
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.cos(phi) * 0.3, // flattened
      z: r * Math.sin(phi) * Math.sin(theta),
    };
  }

  private ringPosition(radius: number): Vec3 {
    const angle = this.rng.next() * Math.PI * 2;
    const ringRadius = radius * 0.5 + this.rng.nextGaussian(0, radius * 0.15);

    return {
      x: Math.cos(angle) * ringRadius,
      y: this.rng.nextGaussian(0, radius * 0.02),
      z: Math.sin(angle) * ringRadius,
    };
  }

  private generateWarpLanes(stars: Record<string, Star>, starIds: string[]): void {
    // For each star, connect to nearest neighbors within max distance
    // Using simple nearest-neighbor approach (approximation of Delaunay)
    const positions = starIds.map(id => stars[id].position);

    // Build distance matrix for nearby pairs
    interface Edge {
      i: number;
      j: number;
      dist: number;
    }
    const edges: Edge[] = [];

    for (let i = 0; i < starIds.length; i++) {
      for (let j = i + 1; j < starIds.length; j++) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const dz = positions[i].z - positions[j].z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist <= WARP_LANE_MAX_DISTANCE) {
          edges.push({ i, j, dist });
        }
      }
    }

    // Sort by distance
    edges.sort((a, b) => a.dist - b.dist);

    // Use Kruskal-like approach: add edges shortest first, respecting max connections
    // First pass: ensure connectivity (minimum spanning tree)
    const parent = starIds.map((_, i) => i);
    function find(x: number): number {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    }
    function union(a: number, b: number): boolean {
      const ra = find(a);
      const rb = find(b);
      if (ra === rb) return false;
      parent[ra] = rb;
      return true;
    }

    const connectionCount = new Array(starIds.length).fill(0);
    const addedEdges = new Set<string>();

    // MST pass
    for (const edge of edges) {
      if (union(edge.i, edge.j)) {
        const starA = stars[starIds[edge.i]];
        const starB = stars[starIds[edge.j]];
        starA.warpLanes.push(starB.id);
        starB.warpLanes.push(starA.id);
        connectionCount[edge.i]++;
        connectionCount[edge.j]++;
        addedEdges.add(`${edge.i}-${edge.j}`);
      }
    }

    // Second pass: add more connections for variety (~3 avg per star)
    for (const edge of edges) {
      const key = `${edge.i}-${edge.j}`;
      if (addedEdges.has(key)) continue;
      if (connectionCount[edge.i] >= MAX_WARP_LANES_PER_STAR) continue;
      if (connectionCount[edge.j] >= MAX_WARP_LANES_PER_STAR) continue;

      // Add with some probability (favoring shorter distances)
      const prob = 1 - (edge.dist / WARP_LANE_MAX_DISTANCE);
      if (this.rng.chance(prob * 0.5)) {
        const starA = stars[starIds[edge.i]];
        const starB = stars[starIds[edge.j]];
        starA.warpLanes.push(starB.id);
        starB.warpLanes.push(starA.id);
        connectionCount[edge.i]++;
        connectionCount[edge.j]++;
        addedEdges.add(key);
      }
    }
  }
}
