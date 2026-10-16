import * as THREE from 'three';
import { TerrainGenerator } from './TerrainGenerator';

type VegType = 'pine' | 'oak' | 'lime' | 'blossom' | 'rock';

export class VegetationSystem {
  public group: THREE.Group;
  private pineMesh: THREE.InstancedMesh;
  private oakMesh: THREE.InstancedMesh;
  private limeMesh: THREE.InstancedMesh;
  private blossomMesh: THREE.InstancedMesh;
  private rockMesh: THREE.InstancedMesh;

  private treePositions: { x: number; y: number; z: number; type: VegType; index: number }[] = [];
  private dummy = new THREE.Object3D();

  constructor(terrain: TerrainGenerator, count = 2400) {
    this.group = new THREE.Group();

    // 1. Pine Tree (Conifer - Forest Green)
    const pineGeo = this.createPineGeometry();
    const pineMat = new THREE.MeshStandardMaterial({
      color: 0x2e7d32,
      roughness: 0.78,
      metalness: 0.02,
      flatShading: true,
    });
    this.pineMesh = new THREE.InstancedMesh(pineGeo, pineMat, Math.floor(count * 0.42));
    this.pineMesh.castShadow = true;
    this.pineMesh.receiveShadow = true;

    // 2. Round Deciduous Tree (Leafy Green)
    const oakGeo = this.createRoundTreeGeometry();
    const oakMat = new THREE.MeshStandardMaterial({
      color: 0x5eb329,
      roughness: 0.75,
      metalness: 0.02,
      flatShading: true,
    });
    this.oakMesh = new THREE.InstancedMesh(oakGeo, oakMat, Math.floor(count * 0.28));
    this.oakMesh.castShadow = true;
    this.oakMesh.receiveShadow = true;

    // 3. Bright Spring Lime Tree
    const limeMat = new THREE.MeshStandardMaterial({
      color: 0x82d144,
      roughness: 0.75,
      metalness: 0.02,
      flatShading: true,
    });
    this.limeMesh = new THREE.InstancedMesh(oakGeo, limeMat, Math.floor(count * 0.16));
    this.limeMesh.castShadow = true;
    this.limeMesh.receiveShadow = true;

    // 4. Pastel Pink Cherry Blossom Tree
    const blossomMat = new THREE.MeshStandardMaterial({
      color: 0xf48fb1,
      roughness: 0.72,
      metalness: 0.02,
      flatShading: true,
    });
    this.blossomMesh = new THREE.InstancedMesh(oakGeo, blossomMat, Math.floor(count * 0.06));
    this.blossomMesh.castShadow = true;
    this.blossomMesh.receiveShadow = true;

    // 5. Sculpted Low-Poly Rocks
    const rockGeo = new THREE.DodecahedronGeometry(1.3, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0xaba398,
      roughness: 0.88,
      metalness: 0.05,
      flatShading: true,
    });
    this.rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, Math.floor(count * 0.08));
    this.rockMesh.castShadow = true;
    this.rockMesh.receiveShadow = true;

    this.group.add(this.pineMesh);
    this.group.add(this.oakMesh);
    this.group.add(this.limeMesh);
    this.group.add(this.blossomMesh);
    this.group.add(this.rockMesh);

    this.populate(terrain);
  }

  private createPineGeometry(): THREE.BufferGeometry {
    const trunk = new THREE.CylinderGeometry(0.18, 0.28, 1.2, 6);
    trunk.translate(0, 0.6, 0);

    const c1 = new THREE.ConeGeometry(1.45, 2.0, 7);
    c1.translate(0, 2.0, 0);

    const c2 = new THREE.ConeGeometry(1.15, 1.7, 7);
    c2.translate(0, 3.0, 0);

    const c3 = new THREE.ConeGeometry(0.8, 1.4, 7);
    c3.translate(0, 3.85, 0);

    return this.mergeGeometries([trunk, c1, c2, c3]);
  }

  private createRoundTreeGeometry(): THREE.BufferGeometry {
    const trunk = new THREE.CylinderGeometry(0.2, 0.32, 1.5, 6);
    trunk.translate(0, 0.75, 0);

    const mainCanopy = new THREE.IcosahedronGeometry(1.55, 1);
    mainCanopy.translate(0, 2.55, 0);

    const sidePuff1 = new THREE.IcosahedronGeometry(1.05, 1);
    sidePuff1.translate(0.75, 2.2, 0.4);

    const sidePuff2 = new THREE.IcosahedronGeometry(0.95, 1);
    sidePuff2.translate(-0.65, 2.3, -0.45);

    return this.mergeGeometries([trunk, mainCanopy, sidePuff1, sidePuff2]);
  }

  private mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
    const nonIndexedGeos = geos.map((g) => (g.index ? g.toNonIndexed() : g));
    let totalVerts = 0;
    nonIndexedGeos.forEach((g) => {
      totalVerts += g.attributes.position.count;
    });

    const pos = new Float32Array(totalVerts * 3);
    const norm = new Float32Array(totalVerts * 3);
    let offset = 0;

    nonIndexedGeos.forEach((g) => {
      const p = g.attributes.position.array;
      const n = g.attributes.normal.array;
      pos.set(p, offset * 3);
      norm.set(n, offset * 3);
      offset += g.attributes.position.count;
    });

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
    return merged;
  }

  private populate(terrain: TerrainGenerator) {
    let pineIdx = 0;
    let oakIdx = 0;
    let limeIdx = 0;
    let blossomIdx = 0;
    let rockIdx = 0;

    const addInstance = (type: VegType, x: number, z: number, scale: number) => {
      const y = terrain.getHeight(x, z);
      if (y < terrain.waterLevel + 0.55) return;

      this.dummy.position.set(x, y, z);
      this.dummy.rotation.y = ((x * 13 + z * 29) % 628) / 100;
      this.dummy.scale.set(scale, scale * (0.94 + ((Math.abs(x + z) % 12) * 0.01)), scale);
      this.dummy.updateMatrix();

      if (type === 'pine' && pineIdx < this.pineMesh.count) {
        this.pineMesh.setMatrixAt(pineIdx, this.dummy.matrix);
        this.treePositions.push({ x, y, z, type: 'pine', index: pineIdx++ });
      } else if (type === 'oak' && oakIdx < this.oakMesh.count) {
        this.oakMesh.setMatrixAt(oakIdx, this.dummy.matrix);
        this.treePositions.push({ x, y, z, type: 'oak', index: oakIdx++ });
      } else if (type === 'lime' && limeIdx < this.limeMesh.count) {
        this.limeMesh.setMatrixAt(limeIdx, this.dummy.matrix);
        this.treePositions.push({ x, y, z, type: 'lime', index: limeIdx++ });
      } else if (type === 'blossom' && blossomIdx < this.blossomMesh.count) {
        this.blossomMesh.setMatrixAt(blossomIdx, this.dummy.matrix);
        this.treePositions.push({ x, y, z, type: 'blossom', index: blossomIdx++ });
      } else if (type === 'rock' && rockIdx < this.rockMesh.count) {
        this.dummy.scale.set(scale * 1.2, scale * 0.75, scale * 1.1);
        this.dummy.updateMatrix();
        this.rockMesh.setMatrixAt(rockIdx, this.dummy.matrix);
        this.treePositions.push({ x, y, z, type: 'rock', index: rockIdx++ });
      }
    };

    // Deterministic pseudo-random helper for cohesive, organized placement
    let seed = 421337;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    // Curated scenic trees framing the city blocks, parks, riverbanks, and hills
    const scenicTrees: { type: VegType; x: number; z: number; s: number }[] = [
      // Neighborhood garden & block-corner trees
      { type: 'oak', x: -18, z: -30, s: 0.9 },
      { type: 'lime', x: -6, z: -18, s: 0.85 },
      { type: 'blossom', x: 6, z: -30, s: 0.88 },
      { type: 'oak', x: 18, z: -18, s: 0.92 },
      { type: 'lime', x: -18, z: -6, s: 0.85 },
      { type: 'oak', x: -6, z: 6, s: 0.9 },
      { type: 'blossom', x: -18, z: 16, s: 0.86 },
      { type: 'lime', x: -6, z: 28, s: 0.9 },
      { type: 'oak', x: -30, z: -30, s: 0.92 },
      { type: 'pine', x: -42, z: -18, s: 0.95 },
      { type: 'lime', x: -30, z: 6, s: 0.88 },
      { type: 'oak', x: -42, z: 28, s: 0.9 },
      // Riverbank & East bank trees
      { type: 'oak', x: 49, z: -22, s: 0.95 },
      { type: 'blossom', x: 48, z: -4, s: 0.9 },
      { type: 'lime', x: 49, z: 18, s: 0.92 },
      { type: 'pine', x: 78, z: -30, s: 1.0 },
      { type: 'oak', x: 78, z: 4, s: 0.95 },
      { type: 'lime', x: 78, z: 24, s: 0.9 },
      { type: 'pine', x: 102, z: -30, s: 1.05 },
      { type: 'oak', x: 104, z: 26, s: 0.95 },
      // Northern & Western perimeter groves
      { type: 'pine', x: -55, z: -44, s: 1.1 },
      { type: 'oak', x: -48, z: -46, s: 1.0 },
      { type: 'lime', x: -38, z: -45, s: 0.95 },
      { type: 'pine', x: 14, z: -44, s: 1.05 },
      { type: 'oak', x: 24, z: -45, s: 0.95 },
      { type: 'blossom', x: 44, z: -44, s: 0.92 },
    ];
    scenicTrees.forEach((t) => addInstance(t.type, t.x, t.z, t.s));

    const range = 265;
    for (let i = 0; i < 4500; i++) {
      const x = (rand() - 0.5) * range * 2;
      const z = (rand() - 0.5) * range * 2;

      // Keep main central starter city grid (-54..46, -42..38) clear of random trees
      const inCityCore = x > -54 && x < 46 && z > -42 && z < 38;
      // Keep eastern defense compound (-30..24, x: 76..118) clear
      const inDefenseCore = x > 76 && x < 118 && z > -30 && z < 24;
      if (inCityCore || inDefenseCore) continue;

      const y = terrain.getHeight(x, z);
      if (y < terrain.waterLevel + 0.65 || y > 30) continue;

      // Natural grove clustering
      const cluster = Math.sin(x * 0.045) * Math.cos(z * 0.045) + Math.sin(x * 0.09 - z * 0.07);
      if (cluster < -0.25) continue;

      const scale = 0.75 + rand() * 0.45;
      const r = rand();

      // Shoreline boulders & rocks
      if (y < terrain.waterLevel + 1.2 && r < 0.25) {
        addInstance('rock', x, z, scale);
        continue;
      }

      // Hills prefer conifers and rocks
      if (y > 2.3) {
        if (r < 0.72) addInstance('pine', x, z, scale * 1.05);
        else if (r < 0.88) addInstance('oak', x, z, scale);
        else addInstance('rock', x, z, scale * 1.15);
      } else {
        // Lowland meadows & riverbanks
        if (r < 0.36) addInstance('oak', x, z, scale);
        else if (r < 0.64) addInstance('lime', x, z, scale * 0.95);
        else if (r < 0.90) addInstance('pine', x, z, scale);
        else if (r < 0.96) addInstance('blossom', x, z, scale * 0.92);
        else addInstance('rock', x, z, scale * 0.85);
      }
    }

    // Set exact active instance counts so unused instances do not render at (0,0,0)
    this.pineMesh.count = pineIdx;
    this.oakMesh.count = oakIdx;
    this.limeMesh.count = limeIdx;
    this.blossomMesh.count = blossomIdx;
    this.rockMesh.count = rockIdx;

    this.pineMesh.instanceMatrix.needsUpdate = true;
    this.oakMesh.instanceMatrix.needsUpdate = true;
    this.limeMesh.instanceMatrix.needsUpdate = true;
    this.blossomMesh.instanceMatrix.needsUpdate = true;
    this.rockMesh.instanceMatrix.needsUpdate = true;
  }

  public clearRoadCorridor(x1: number, z1: number, x2: number, z2: number, halfWidth = 4.5) {
    const dist = Math.hypot(x2 - x1, z2 - z1);
    const steps = Math.max(2, Math.ceil(dist / 3));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.clearVegetationAround(
        THREE.MathUtils.lerp(x1, x2, t),
        THREE.MathUtils.lerp(z1, z2, t),
        halfWidth
      );
    }
  }

  public clearVegetationAround(cx: number, cz: number, radius: number) {
    let pineMod = false;
    let oakMod = false;
    let limeMod = false;
    let blossomMod = false;
    let rockMod = false;

    const zeroScale = new THREE.Matrix4().makeScale(0, 0, 0);

    for (let i = 0; i < this.treePositions.length; i++) {
      const item = this.treePositions[i];
      const dx = item.x - cx;
      const dz = item.z - cz;
      if (dx * dx + dz * dz < radius * radius) {
        if (item.type === 'pine') {
          this.pineMesh.setMatrixAt(item.index, zeroScale);
          pineMod = true;
        } else if (item.type === 'oak') {
          this.oakMesh.setMatrixAt(item.index, zeroScale);
          oakMod = true;
        } else if (item.type === 'lime') {
          this.limeMesh.setMatrixAt(item.index, zeroScale);
          limeMod = true;
        } else if (item.type === 'blossom') {
          this.blossomMesh.setMatrixAt(item.index, zeroScale);
          blossomMod = true;
        } else if (item.type === 'rock') {
          this.rockMesh.setMatrixAt(item.index, zeroScale);
          rockMod = true;
        }
      }
    }

    if (pineMod) this.pineMesh.instanceMatrix.needsUpdate = true;
    if (oakMod) this.oakMesh.instanceMatrix.needsUpdate = true;
    if (limeMod) this.limeMesh.instanceMatrix.needsUpdate = true;
    if (blossomMod) this.blossomMesh.instanceMatrix.needsUpdate = true;
    if (rockMod) this.rockMesh.instanceMatrix.needsUpdate = true;
  }
}
