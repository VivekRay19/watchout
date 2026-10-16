import * as THREE from 'three';

export class TerrainGenerator {
  public mesh: THREE.Mesh;
  public waterMesh: THREE.Mesh;
  private width: number;
  private depth: number;
  private segments: number;
  public waterLevel: number = 0.0;
  public plateauHeight: number = 1.6;

  constructor(width = 600, depth = 600, segments = 200) {
    this.width = width;
    this.depth = depth;
    this.segments = segments;

    const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const vertexCount = positions.count;

    // First pass: Compute smooth, sculpted elevations
    for (let i = 0; i < vertexCount; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const h = this.getHeight(x, z);
      positions.setY(i, h);
    }

    geometry.computeVertexNormals();
    const normals = geometry.attributes.normal;
    const colors = new Float32Array(vertexCount * 3);

    // Bright, cohesive isometric city-builder palette (matching reference image)
    const colorDeepBed = new THREE.Color(0x1678d2);       // Deep azure water bed
    const colorShallowWater = new THREE.Color(0x4fc3f7);  // Bright turquoise shallows
    const colorSand = new THREE.Color(0xf4df9d);          // Warm golden beach sand
    const colorSandLight = new THREE.Color(0xf7e7b4);     // Dry upper beach sand
    const colorLushGrass = new THREE.Color(0x82cc45);     // Vibrant spring meadow green
    const colorBrightGrass = new THREE.Color(0x8ed650);   // Sunlit lawn green
    const colorHillGrass = new THREE.Color(0x71bd3b);     // Upland hill green
    const colorRockLight = new THREE.Color(0xb8b0a4);     // Sculpted light warm-grey rock
    const colorRockMid = new THREE.Color(0x9b9388);       // Faceted cliff stone

    for (let i = 0; i < vertexCount; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const h = positions.getY(i);
      const ny = normals.getY(i);
      const slope = 1.0 - Math.max(0, Math.min(1, ny));

      const c = new THREE.Color();

      if (h < this.waterLevel - 0.15) {
        // Underwater bed -> creates turquoise shallow glow near beaches
        const depthT = Math.max(0, Math.min(1, (h - (this.waterLevel - 3.5)) / 3.35));
        c.lerpColors(colorDeepBed, colorShallowWater, depthT);
      } else if (h < this.waterLevel + 0.85) {
        // Creamy sandy shoreline
        const sandT = Math.max(0, Math.min(1, (h - (this.waterLevel - 0.15)) / 1.0));
        c.lerpColors(colorSand, colorSandLight, sandT);
      } else if (h < 2.6) {
        // Main buildable plateau & riverbanks
        const grassBlend = Math.max(0, Math.min(1, (h - (this.waterLevel + 0.85)) / 0.55));
        // Gentle spatial variation across the meadow (no harsh noise)
        const sunPatch = Math.sin(x * 0.025) * Math.cos(z * 0.025) * 0.5 + 0.5;
        const meadow = new THREE.Color().lerpColors(colorLushGrass, colorBrightGrass, sunPatch * 0.55);
        c.lerpColors(colorSandLight, meadow, grassBlend);
      } else {
        // Elevated hills and sculpted rocky cliffs
        const hillT = Math.min(1, (h - 2.6) / 14.0);
        const upland = new THREE.Color().lerpColors(colorLushGrass, colorHillGrass, hillT);

        if (slope > 0.16) {
          const rockT = Math.min(1, (slope - 0.16) / 0.28);
          const rockCol = new THREE.Color().lerpColors(colorRockLight, colorRockMid, Math.min(1, slope * 1.5));
          c.lerpColors(upland, rockCol, rockT);
        } else {
          c.copy(upland);
        }
      }

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.82,
      metalness: 0.02,
      flatShading: false,
    });

    this.mesh = new THREE.Mesh(geometry, terrainMaterial);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;

    // Bright, clean azure water surface
    const waterGeo = new THREE.PlaneGeometry(width, depth, 64, 64);
    waterGeo.rotateX(-Math.PI / 2);

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2094f3,
      roughness: 0.18,
      metalness: 0.15,
      transparent: true,
      opacity: 0.84,
    });

    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.y = this.waterLevel;
    this.waterMesh.receiveShadow = true;
  }

  private smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  // Carefully sculpted terrain:
  // - Smooth, flat central peninsula for crisp roads & city blocks
  // - Southern coastal harbor bay (bottom-left / front in isometric view)
  // - Meandering eastern river channel crossed by bridges
  // - Sculpted rocky hills along the northern & far-western perimeter
  public getHeight(x: number, z: number): number {
    // Base flat buildable elevation
    let h = this.plateauHeight;

    // 1. Eastern River Channel (clean azure channel between x ≈ 51 and x ≈ 73)
    const riverPathX = 62 + Math.sin(z * 0.015) * 2.5;
    const distRiver = Math.abs(x - riverPathX);
    const riverHalfWidth = 9.5;

    if (distRiver < riverHalfWidth + 4.5) {
      const bankT = this.smoothstep(riverHalfWidth - 2.0, riverHalfWidth + 4.5, distRiver);
      const riverBed = -2.6;
      h = THREE.MathUtils.lerp(riverBed, h, bankT);
    }

    // 2. Southern / Front Coastal Bay & Harbor (shoreline around z ≈ 43..48)
    const coastLineZ = 46 + Math.sin(x * 0.03) * 2.0;
    if (z > coastLineZ - 5.0) {
      const coastT = this.smoothstep(coastLineZ - 5.0, coastLineZ + 6.0, z);
      const seaBed = -3.2;
      h = THREE.MathUtils.lerp(h, seaBed, coastT);
    }

    // 3. Sculpted Northern & Western Hills (framing the city like the reference image)
    let hillHeight = 0;
    if (z < -60) {
      const northT = this.smoothstep(-60, -110, z);
      const ridgeWave =
        Math.sin(x * 0.04) * 2.4 +
        Math.cos(x * 0.07 + z * 0.05) * 1.5 +
        5.2;
      hillHeight += northT * ridgeWave;
    }

    if (x < -72 && z < 32) {
      const westT = this.smoothstep(-72, -120, x) * this.smoothstep(36, 16, z);
      const ridgeWave =
        Math.cos(z * 0.04) * 2.2 +
        Math.sin(x * 0.06 - z * 0.05) * 1.4 +
        4.8;
      hillHeight += westT * ridgeWave;
    }

    // Keep river channel carved even through the northern hills
    if (distRiver < riverHalfWidth + 6.0) {
      const riverClear = this.smoothstep(riverHalfWidth - 1.5, riverHalfWidth + 6.0, distRiver);
      hillHeight *= riverClear;
    }

    // Flatten the Hostile Sector Charlie compound plateau in the far northwest (-210, -200)
    const distEnemy = Math.hypot(x - -210, z - -200);
    if (distEnemy < 55) {
      const flatEnemy = this.smoothstep(32, 55, distEnemy);
      hillHeight = THREE.MathUtils.lerp(3.4, hillHeight, flatEnemy);
    }

    return h + hillHeight;
  }

  public isWater(x: number, z: number): boolean {
    return this.getHeight(x, z) <= this.waterLevel + 0.25;
  }

  public isNearShoreline(x: number, z: number): boolean {
    const h = this.getHeight(x, z);
    return h >= this.waterLevel - 1.2 && h <= this.plateauHeight + 0.5;
  }

  public update(time: number) {
    if (this.waterMesh) {
      this.waterMesh.position.y = this.waterLevel + Math.sin(time * 1.2) * 0.04;
    }
  }
}
