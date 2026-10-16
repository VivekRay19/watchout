import * as THREE from 'three';

export class TerrainGenerator {
  public mesh: THREE.Mesh;
  public waterMesh: THREE.Mesh;
  public foamGroup: THREE.Group;
  public width: number;
  public depth: number;
  public waterLevel = 0.0;
  public plateauHeight = 1.6;
  private waterBasePositions: Float32Array;

  constructor(width = 600, depth = 600, segments = 220) {
    this.width = width;
    this.depth = depth;
    this.foamGroup = new THREE.Group();

    const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const posAttr = geometry.attributes.position;
    const vertexCount = posAttr.count;

    // 1. Sculpt elevation across all vertices
    for (let i = 0; i < vertexCount; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const y = this.getHeight(x, z);
      posAttr.setY(i, y);
    }

    geometry.computeVertexNormals();
    const normAttr = geometry.attributes.normal;

    // 2. Natural, rich isometric palette with grass, soil, sand, cliff rock, and subtle AO
    const colors = new Float32Array(vertexCount * 3);
    const colorDeepSeaBed = new THREE.Color(0x0b4f6c);
    const colorShallowBed = new THREE.Color(0x2299b8);
    const colorWetSand = new THREE.Color(0xdcc286);
    const colorGoldenSand = new THREE.Color(0xf4df9e);
    const colorWarmSoil = new THREE.Color(0x9fb85c);
    const colorLushGrass = new THREE.Color(0x63c132);
    const colorSpringGrass = new THREE.Color(0x7ed957);
    const colorMeadowSun = new THREE.Color(0x8be060);
    const colorHillFoliage = new THREE.Color(0x4a9e2b);
    const colorAlpineRidge = new THREE.Color(0x3b8124);
    const colorRockWarm = new THREE.Color(0x9e9589);
    const colorRockSlate = new THREE.Color(0x757069);

    for (let i = 0; i < vertexCount; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      const ny = normAttr.getY(i);
      const slope = 1.0 - Math.max(0, Math.min(1, ny));

      const c = new THREE.Color();

      // Gentle large-scale organic color variation (avoids flat uniform green)
      const organicPatch =
        Math.sin(x * 0.028 + z * 0.015) * 0.35 +
        Math.cos(x * 0.018 - z * 0.032) * 0.35 +
        Math.sin((x + z) * 0.06) * 0.15 +
        0.5;
      const clampedPatch = Math.max(0, Math.min(1, organicPatch));

      if (y < this.waterLevel - 0.15) {
        // Underwater bed transitions from shallow turquoise to deep sea bed
        const depthT = Math.min(1, Math.abs(y - this.waterLevel) / 3.0);
        c.lerpColors(colorShallowBed, colorDeepSeaBed, depthT);
      } else if (y < this.waterLevel + 0.52) {
        // Wet shoreline sand to golden beach sand
        const sandT = Math.max(0, Math.min(1, (y - (this.waterLevel - 0.15)) / 0.67));
        c.lerpColors(colorWetSand, colorGoldenSand, sandT);
      } else if (y < this.waterLevel + 1.38) {
        // Golden sand -> warm coastal soil -> lush grass
        const blendT = Math.max(0, Math.min(1, (y - (this.waterLevel + 0.52)) / 0.86));
        const baseGrass = new THREE.Color().lerpColors(colorLushGrass, colorSpringGrass, clampedPatch * 0.65);
        if (blendT < 0.45) {
          c.lerpColors(colorGoldenSand, colorWarmSoil, blendT / 0.45);
        } else {
          c.lerpColors(colorWarmSoil, baseGrass, (blendT - 0.45) / 0.55);
        }
        // Riverbank/coastal rocky outcrops on steeper banks
        if (slope > 0.14) {
          c.lerp(colorRockWarm, Math.min(0.75, (slope - 0.14) * 3.2));
        }
      } else if (y <= 2.45) {
        // Main peninsula & east bank plateau with subtle sun-dappled meadow & soil variation
        const meadow = new THREE.Color().lerpColors(colorLushGrass, colorMeadowSun, clampedPatch * 0.68);
        // Subtle developed turf tint inside the main city grid
        const inDevelopedGrid = x > -52 && x < 44 && z > -38 && z < 36;
        if (inDevelopedGrid) {
          meadow.lerp(colorSpringGrass, 0.25);
        }
        c.copy(meadow);
        if (slope > 0.12) {
          c.lerp(colorWarmSoil, Math.min(0.5, (slope - 0.12) * 2.5));
        }
      } else {
        // Rolling hills, foothills, and sculpted mountain ridges
        const hillT = Math.min(1, (y - 2.45) / 14.0);
        const upland = new THREE.Color().lerpColors(colorLushGrass, colorHillFoliage, Math.min(1, hillT * 1.2));
        if (hillT > 0.55) {
          upland.lerp(colorAlpineRidge, (hillT - 0.55) / 0.45);
        }

        if (slope > 0.13) {
          const rockT = Math.min(1, (slope - 0.13) / 0.26);
          const rockCol = new THREE.Color().lerpColors(colorRockWarm, colorRockSlate, Math.min(1, slope * 1.6));
          c.lerpColors(upland, rockCol, rockT);
        } else {
          c.copy(upland);
        }
      }

      // Subtle terrain ambient occlusion in concave valleys and slope bases
      const aoFactor = 1.0 - Math.min(0.14, slope * 0.28);
      colors[i * 3] = c.r * aoFactor;
      colors[i * 3 + 1] = c.g * aoFactor;
      colors[i * 3 + 2] = c.b * aoFactor;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.84,
      metalness: 0.02,
      flatShading: false,
    });

    this.mesh = new THREE.Mesh(geometry, terrainMaterial);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;

    // 3. Living Water Surface with depth-tinted vertex colors & animated ripples
    const waterSegs = 96;
    const waterGeo = new THREE.PlaneGeometry(width, depth, waterSegs, waterSegs);
    waterGeo.rotateX(-Math.PI / 2);

    const wPos = waterGeo.attributes.position;
    this.waterBasePositions = new Float32Array(wPos.array.length);
    this.waterBasePositions.set(wPos.array);

    const wColors = new Float32Array(wPos.count * 3);
    const colFoamShallow = new THREE.Color(0x5ce1e6); // Bright turquoise shallows
    const colMidWater = new THREE.Color(0x1da1f2); // Vibrant cerulean river
    const colDeepWater = new THREE.Color(0x0c6ebd); // Rich deep bay azure

    for (let i = 0; i < wPos.count; i++) {
      const wx = wPos.getX(i);
      const wz = wPos.getZ(i);
      const terrainH = this.getHeight(wx, wz);
      const waterDepth = Math.max(0, this.waterLevel - terrainH);

      const wc = new THREE.Color();
      if (waterDepth < 0.9) {
        wc.lerpColors(colFoamShallow, colMidWater, waterDepth / 0.9);
      } else {
        wc.lerpColors(colMidWater, colDeepWater, Math.min(1, (waterDepth - 0.9) / 2.4));
      }
      wColors[i * 3] = wc.r;
      wColors[i * 3 + 1] = wc.g;
      wColors[i * 3 + 2] = wc.b;
    }
    waterGeo.setAttribute('color', new THREE.BufferAttribute(wColors, 3));

    const waterMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.14,
      metalness: 0.22,
      transparent: true,
      opacity: 0.86,
    });

    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.y = this.waterLevel;
    this.waterMesh.receiveShadow = true;

    this.buildShorelineDetails();
  }

  private buildShorelineDetails() {
    // Subtle white shoreline foam rings around the two coastal lighthouse islets
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xf0f9ff,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
    });

    const islets = [
      { x: 76, z: 20, r: 6.4 },
      { x: 72, z: 42, r: 5.8 },
    ];

    islets.forEach((isl) => {
      const ringGeo = new THREE.RingGeometry(isl.r - 0.55, isl.r + 0.35, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ring = new THREE.Mesh(ringGeo, foamMat);
      ring.position.set(isl.x, this.waterLevel + 0.04, isl.z);
      this.foamGroup.add(ring);
    });
  }

  private smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  // Carefully sculpted terrain:
  // - Flat buildable city blocks so roads & buildings sit flush without floating
  // - Gentle rolling hills & mountain ridges along the northern/western backdrop
  // - Winding river channel separating the main city from the military airbase & defense sector
  // - Southern harbor bay + two rocky coastal lighthouse islets in the right bay
  public getHeight(x: number, z: number): number {
    // Subtle natural micro-relief outside the immediate road grid
    const inRoadGrid =
      (x >= -52 && x <= 46 && z >= -38 && z <= 36) ||
      (x >= 78 && x <= 116 && z >= -42 && z <= 14);
    const microRelief = inRoadGrid
      ? 0
      : (Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.14 + Math.sin((x - z) * 0.03) * 0.08);

    let h = this.plateauHeight + microRelief;

    // 1. Eastern River Channel & Bay (flows from northern hills between x ≈ 51 and x ≈ 73 into the southeast bay)
    const riverPathX = 62 + Math.sin(z * 0.016) * 3.0;
    const distRiver = Math.abs(x - riverPathX);
    const riverHalfWidth = z > 10 ? 11.5 + (z - 10) * 0.22 : 9.8;

    if (distRiver < riverHalfWidth + 4.8) {
      const bankT = this.smoothstep(riverHalfWidth - 2.0, riverHalfWidth + 4.8, distRiver);
      const riverBed = -2.8;
      h = THREE.MathUtils.lerp(riverBed, h, bankT);
    }

    // 2. Southern / Southeast Coastal Bay & Harbor
    // Curves around the southern harbor (z > 45 on the left/center, opening into a wider bay on the right x > 48)
    const rightBayOffset = x > 48 ? Math.min(34, (x - 48) * 0.72) : 0;
    const coastLineZ = 46 - rightBayOffset + Math.sin(x * 0.035) * 2.2;
    if (z > coastLineZ - 5.2) {
      const coastT = this.smoothstep(coastLineZ - 5.2, coastLineZ + 6.5, z);
      const seaBed = -3.2;
      h = THREE.MathUtils.lerp(h, seaBed, coastT);
    }

    // 3. Two Rocky Coastal Islets in the Right Bay for the Lighthouses (matching reference screenshot!)
    const distIslet1 = Math.hypot(x - 76, z - 20);
    if (distIslet1 < 8.5) {
      const islT = 1.0 - this.smoothstep(2.8, 8.5, distIslet1);
      h = Math.max(h, THREE.MathUtils.lerp(-2.2, 2.25, islT));
    }

    const distIslet2 = Math.hypot(x - 72, z - 42);
    if (distIslet2 < 8.0) {
      const islT = 1.0 - this.smoothstep(2.5, 8.0, distIslet2);
      h = Math.max(h, THREE.MathUtils.lerp(-2.4, 2.1, islT));
    }

    // 4. Sculpted Northern & Western Rolling Hills & Foothills
    let hillHeight = 0;
    if (z < -56) {
      const northT = this.smoothstep(-56, -115, z);
      const foothillT = this.smoothstep(-44, -64, z) * 0.85;
      const ridgeWave =
        Math.sin(x * 0.038) * 2.8 +
        Math.cos(x * 0.068 + z * 0.048) * 1.8 +
        Math.sin(x * 0.11 - z * 0.08) * 0.7 +
        5.8;
      hillHeight += northT * ridgeWave + foothillT * (0.9 + Math.sin(x * 0.06) * 0.4);
    }

    if (x < -68 && z < 36) {
      const westT = this.smoothstep(-68, -122, x) * this.smoothstep(40, 14, z);
      const ridgeWave =
        Math.cos(z * 0.042) * 2.5 +
        Math.sin(x * 0.062 - z * 0.05) * 1.6 +
        5.2;
      hillHeight += westT * ridgeWave;
    }

    // Keep river channel carved cleanly through the northern hills
    if (distRiver < riverHalfWidth + 6.5) {
      const riverClear = this.smoothstep(riverHalfWidth - 1.5, riverHalfWidth + 6.5, distRiver);
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

  public gradeRoadCorridor(points: { x: number; y: number; z: number }[], roadWidth = 4.2, shoulderWidth = 3.5) {
    if (!this.mesh || !points || points.length < 2) return;
    const posAttr = this.mesh.geometry.attributes.position as THREE.BufferAttribute;
    const vertexCount = posAttr.count;
    let modified = false;

    const totalInfluenceDist = roadWidth * 0.5 + shoulderWidth;
    const innerRoadHalf = roadWidth * 0.5;

    for (let i = 0; i < vertexCount; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);

      // Find closest segment in points
      let minDistSq = Infinity;
      let targetElevation = vy;

      for (let s = 0; s < points.length - 1; s++) {
        const p1 = points[s];
        const p2 = points[s + 1];
        const segDx = p2.x - p1.x;
        const segDz = p2.z - p1.z;
        const segLenSq = segDx * segDx + segDz * segDz;
        if (segLenSq < 0.0001) continue;

        const t = Math.max(0, Math.min(1, ((vx - p1.x) * segDx + (vz - p1.z) * segDz) / segLenSq));
        const projX = p1.x + t * segDx;
        const projZ = p1.z + t * segDz;
        const distSq = (vx - projX) * (vx - projX) + (vz - projZ) * (vz - projZ);

        if (distSq < minDistSq) {
          minDistSq = distSq;
          targetElevation = p1.y + t * (p2.y - p1.y);
        }
      }

      const dist = Math.sqrt(minDistSq);
      if (dist <= totalInfluenceDist) {
        // Cut or fill elevation
        let blendFactor = 1.0;
        if (dist > innerRoadHalf) {
          // Smooth Hermite shoulder transition to natural terrain
          const st = (dist - innerRoadHalf) / Math.max(0.1, shoulderWidth);
          blendFactor = 1.0 - (st * st * (3.0 - 2.0 * st));
        }

        // Road deck is positioned at targetElevation, so terrain bed is carved to targetElevation - 0.06
        const roadBedY = targetElevation - 0.06;
        const newY = vy * (1.0 - blendFactor) + roadBedY * blendFactor;

        // Apply only if meaningful difference to avoid vertex churn
        if (Math.abs(newY - vy) > 0.01) {
          posAttr.setY(i, newY);
          modified = true;
        }
      }
    }

    if (modified) {
      posAttr.needsUpdate = true;
      this.mesh.geometry.computeVertexNormals();
    }
  }

  public update(time: number) {
    if (!this.waterMesh) return;

    // Gentle vertical tide breath + subtle per-vertex wave ripples
    this.waterMesh.position.y = this.waterLevel + Math.sin(time * 1.1) * 0.025;

    const wPos = this.waterMesh.geometry.attributes.position as THREE.BufferAttribute;
    const base = this.waterBasePositions;
    const count = wPos.count;

    for (let i = 0; i < count; i++) {
      const bx = base[i * 3];
      const bz = base[i * 3 + 2];
      const wave =
        Math.sin(bx * 0.09 + time * 1.8) * 0.045 +
        Math.cos(bz * 0.08 - time * 1.4) * 0.04;
      wPos.setY(i, wave);
    }
    wPos.needsUpdate = true;

    // Subtle shoreline foam pulse
    this.foamGroup.children.forEach((child, idx) => {
      const s = 1.0 + Math.sin(time * 2.0 + idx * 1.5) * 0.035;
      child.scale.set(s, 1, s);
    });
  }
}
