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
  public windUniforms = {
    uTime: { value: 0 },
    uWindStrength: { value: 0.14 },
  };

  constructor(terrain: TerrainGenerator, count = 2800) {
    this.group = new THREE.Group();

    // 1. Pine Tree (Conifer - Forest Green)
    const pineGeo = this.createPineGeometry();
    const pineMat = this.createWindMaterial(0x2e7d32, 0.78);
    this.pineMesh = new THREE.InstancedMesh(pineGeo, pineMat, Math.floor(count * 0.42));
    this.pineMesh.castShadow = true;
    this.pineMesh.receiveShadow = true;

    // 2. Round Deciduous Tree (Leafy Green)
    const oakGeo = this.createRoundTreeGeometry();
    const oakMat = this.createWindMaterial(0x56b026, 0.75);
    this.oakMesh = new THREE.InstancedMesh(oakGeo, oakMat, Math.floor(count * 0.28));
    this.oakMesh.castShadow = true;
    this.oakMesh.receiveShadow = true;

    // 3. Bright Spring Lime Tree
    const limeMat = this.createWindMaterial(0x82d144, 0.75);
    this.limeMesh = new THREE.InstancedMesh(oakGeo, limeMat, Math.floor(count * 0.16));
    this.limeMesh.castShadow = true;
    this.limeMesh.receiveShadow = true;

    // 4. Pastel Pink Cherry Blossom / Ornamental Tree
    const blossomMat = this.createWindMaterial(0xf48fb1, 0.72);
    this.blossomMesh = new THREE.InstancedMesh(oakGeo, blossomMat, Math.floor(count * 0.05));
    this.blossomMesh.castShadow = true;
    this.blossomMesh.receiveShadow = true;

    // 5. Sculpted Low-Poly Shoreline & Cliff Rocks
    const rockGeo = new THREE.DodecahedronGeometry(1.35, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x9e978d,
      roughness: 0.88,
      metalness: 0.05,
      flatShading: true,
    });
    this.rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, Math.floor(count * 0.09));
    this.rockMesh.castShadow = true;
    this.rockMesh.receiveShadow = true;

    this.group.add(this.pineMesh);
    this.group.add(this.oakMesh);
    this.group.add(this.limeMesh);
    this.group.add(this.blossomMesh);
    this.group.add(this.rockMesh);

    this.populate(terrain);
  }

  private createWindMaterial(colorHex: number, roughness: number): THREE.MeshStandardMaterial {
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness,
      metalness: 0.02,
      flatShading: true,
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.windUniforms.uTime;
      shader.uniforms.uWindStrength = this.windUniforms.uWindStrength;

      shader.vertexShader =
        `
        uniform float uTime;
        uniform float uWindStrength;
        ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float heightFactor = max(0.0, (position.y - 0.8) * 0.32);
        #ifdef USE_INSTANCING
          float phase = instanceMatrix[3][0] * 0.17 + instanceMatrix[3][2] * 0.13;
        #else
          float phase = position.x * 0.2 + position.z * 0.2;
        #endif
        float swayX = sin(uTime * 1.9 + phase) * heightFactor * uWindStrength;
        float swayZ = cos(uTime * 1.45 + phase * 1.3) * heightFactor * (uWindStrength * 0.65);
        transformed.x += swayX;
        transformed.z += swayZ;
        `
      );
    };

    return mat;
  }

  public update(timeSeconds: number, isPaused: boolean) {
    if (!isPaused) {
      this.windUniforms.uTime.value = timeSeconds;
    }
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
      if (y < terrain.waterLevel + 0.45) return;

      // Embed slightly (-0.08) so trees and rocks never appear to float on slopes
      this.dummy.position.set(x, y - 0.08, z);
      this.dummy.rotation.y = ((Math.abs(x * 13 + z * 29)) % 628) / 100;
      this.dummy.scale.set(scale, scale * (0.94 + ((Math.abs(x + z) % 14) * 0.012)), scale);
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
        this.dummy.scale.set(scale * 1.25, scale * 0.78, scale * 1.15);
        this.dummy.updateMatrix();
        this.rockMesh.setMatrixAt(rockIdx, this.dummy.matrix);
        this.treePositions.push({ x, y, z, type: 'rock', index: rockIdx++ });
      }
    };

    let seed = 421337;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    // Curated scenic trees & shoreline rocks framing city blocks, riverbanks, islets, and hills
    const scenicItems: { type: VegType; x: number; z: number; s: number }[] = [
      // Neighborhood garden & block-corner trees
      { type: 'oak', x: -18, z: -30, s: 0.92 },
      { type: 'lime', x: -6, z: -18, s: 0.86 },
      { type: 'oak', x: 6, z: -30, s: 0.9 },
      { type: 'lime', x: 18, z: -18, s: 0.92 },
      { type: 'lime', x: -18, z: -6, s: 0.85 },
      { type: 'oak', x: -6, z: 6, s: 0.92 },
      { type: 'oak', x: -18, z: 16, s: 0.88 },
      { type: 'lime', x: -6, z: 28, s: 0.9 },
      { type: 'oak', x: -30, z: -30, s: 0.92 },
      { type: 'pine', x: -42, z: -18, s: 0.96 },
      { type: 'lime', x: -30, z: 6, s: 0.88 },
      { type: 'oak', x: -42, z: 28, s: 0.92 },
      // West riverbank & beach promenade trees + rocks
      { type: 'oak', x: 48, z: -26, s: 0.95 },
      { type: 'lime', x: 48, z: -18, s: 0.88 },
      { type: 'oak', x: 48, z: -4, s: 0.92 },
      { type: 'lime', x: 48, z: 6, s: 0.86 },
      { type: 'oak', x: 48, z: 20, s: 0.94 },
      { type: 'rock', x: 50, z: -8, s: 0.85 },
      { type: 'rock', x: 50, z: 14, s: 0.9 },
      // East bank military & airbase perimeter pine/oak line
      { type: 'pine', x: 75, z: -30, s: 1.02 },
      { type: 'pine', x: 75, z: -22, s: 0.96 },
      { type: 'oak', x: 75, z: -4, s: 0.94 },
      { type: 'pine', x: 76, z: 6, s: 0.98 },
      { type: 'pine', x: 88, z: 8, s: 1.0 },
      { type: 'pine', x: 94, z: 8, s: 0.95 },
      { type: 'pine', x: 100, z: 8, s: 1.04 },
      // Lighthouse islet 1 (76, 20) & islet 2 (72, 42) rocks and pines
      { type: 'pine', x: 73, z: 18, s: 0.85 },
      { type: 'rock', x: 79, z: 22, s: 0.95 },
      { type: 'rock', x: 74, z: 23, s: 0.85 },
      { type: 'pine', x: 69, z: 40, s: 0.82 },
      { type: 'rock', x: 75, z: 44, s: 0.92 },
      // Northern & Western perimeter groves
      { type: 'pine', x: -55, z: -44, s: 1.12 },
      { type: 'oak', x: -48, z: -46, s: 1.02 },
      { type: 'lime', x: -38, z: -45, s: 0.96 },
      { type: 'pine', x: -26, z: -45, s: 1.08 },
      { type: 'oak', x: -12, z: -45, s: 0.98 },
      { type: 'pine', x: 6, z: -44, s: 1.05 },
      { type: 'oak', x: 20, z: -45, s: 0.96 },
      { type: 'lime', x: 38, z: -44, s: 0.92 },
    ];
    scenicItems.forEach((t) => addInstance(t.type, t.x, t.z, t.s));

    const range = 265;
    for (let i = 0; i < 5200; i++) {
      const x = (rand() - 0.5) * range * 2;
      const z = (rand() - 0.5) * range * 2;

      // Keep central starter city grid (-54..46, -40..38) clear of random procedural trees
      const inCityCore = x > -54 && x < 46 && z > -40 && z < 38;
      // Keep eastern military airbase & defense compound (x: 74..122, z: -48..14) clear
      const inDefenseCore = x > 74 && x < 122 && z > -48 && z < 14;
      // Keep lighthouse centers clear
      const nearLighthouse = Math.hypot(x - 76, z - 20) < 3.5 || Math.hypot(x - 72, z - 42) < 3.5;
      if (inCityCore || inDefenseCore || nearLighthouse) continue;

      const y = terrain.getHeight(x, z);
      if (y < terrain.waterLevel + 0.55 || y > 30) continue;

      const cluster = Math.sin(x * 0.045) * Math.cos(z * 0.045) + Math.sin(x * 0.09 - z * 0.07);
      if (cluster < -0.28) continue;

      const scale = 0.74 + rand() * 0.48;
      const r = rand();

      // Shoreline boulders & rocks
      if (y < terrain.waterLevel + 1.25 && r < 0.28) {
        addInstance('rock', x, z, scale);
        continue;
      }

      // Hills prefer conifers and rocks
      if (y > 2.25) {
        if (r < 0.72) addInstance('pine', x, z, scale * 1.08);
        else if (r < 0.88) addInstance('oak', x, z, scale);
        else addInstance('rock', x, z, scale * 1.15);
      } else {
        // Lowland meadows & riverbanks
        if (r < 0.38) addInstance('oak', x, z, scale);
        else if (r < 0.66) addInstance('lime', x, z, scale * 0.95);
        else if (r < 0.91) addInstance('pine', x, z, scale);
        else if (r < 0.96) addInstance('blossom', x, z, scale * 0.92);
        else addInstance('rock', x, z, scale * 0.85);
      }
    }

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
