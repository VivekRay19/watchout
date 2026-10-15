import * as THREE from 'three';
import { TerrainGenerator } from './TerrainGenerator';

export class VegetationSystem {
  public group: THREE.Group;
  private pineMesh: THREE.InstancedMesh;
  private oakMesh: THREE.InstancedMesh;
  private rockMesh: THREE.InstancedMesh;

  private treePositions: { x: number; y: number; z: number; type: 'pine' | 'oak' | 'rock'; index: number }[] = [];
  private dummy = new THREE.Object3D();

  constructor(terrain: TerrainGenerator, count = 2200) {
    this.group = new THREE.Group();

    // 1. Pine Tree (Conifer)
    const pineGeo = this.createPineGeometry();
    const pineMat = new THREE.MeshStandardMaterial({
      color: 0x244f26,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });
    this.pineMesh = new THREE.InstancedMesh(pineGeo, pineMat, Math.floor(count * 0.55));
    this.pineMesh.castShadow = true;
    this.pineMesh.receiveShadow = true;

    // 2. Oak Tree (Deciduous)
    const oakGeo = this.createOakGeometry();
    const oakMat = new THREE.MeshStandardMaterial({
      color: 0x48752c,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    });
    this.oakMesh = new THREE.InstancedMesh(oakGeo, oakMat, Math.floor(count * 0.35));
    this.oakMesh.castShadow = true;
    this.oakMesh.receiveShadow = true;

    // 3. Rocks
    const rockGeo = new THREE.DodecahedronGeometry(1.2, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x61666d,
      roughness: 0.95,
      metalness: 0.1,
      flatShading: true,
    });
    this.rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, Math.floor(count * 0.1));
    this.rockMesh.castShadow = true;
    this.rockMesh.receiveShadow = true;

    this.group.add(this.pineMesh);
    this.group.add(this.oakMesh);
    this.group.add(this.rockMesh);

    this.populate(terrain);
  }

  private createPineGeometry(): THREE.BufferGeometry {
    // Merge trunk + 3 cone layers
    const trunk = new THREE.CylinderGeometry(0.2, 0.35, 1.6, 5);
    trunk.translate(0, 0.8, 0);

    const c1 = new THREE.ConeGeometry(1.8, 2.2, 6);
    c1.translate(0, 2.2, 0);

    const c2 = new THREE.ConeGeometry(1.4, 1.8, 6);
    c2.translate(0, 3.2, 0);

    const c3 = new THREE.ConeGeometry(0.9, 1.4, 6);
    c3.translate(0, 4.0, 0);

    // Merge geometries
    const geometries = [trunk, c1, c2, c3];
    return this.mergeGeometries(geometries);
  }

  private createOakGeometry(): THREE.BufferGeometry {
    const trunk = new THREE.CylinderGeometry(0.3, 0.45, 2.0, 6);
    trunk.translate(0, 1.0, 0);

    const foliage = new THREE.DodecahedronGeometry(2.1, 1);
    foliage.translate(0, 3.2, 0);

    return this.mergeGeometries([trunk, foliage]);
  }

  private mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
    // Simple custom buffer merger
    let totalVerts = 0;
    geos.forEach(g => {
      totalVerts += g.attributes.position.count;
    });

    const pos = new Float32Array(totalVerts * 3);
    const norm = new Float32Array(totalVerts * 3);
    let offset = 0;

    geos.forEach(g => {
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
    let rockIdx = 0;

    // Seeded random walk / scatter
    const range = 260;
    for (let i = 0; i < 4000; i++) {
      const x = (Math.random() - 0.5) * range * 2;
      const z = (Math.random() - 0.5) * range * 2;
      const distFromOrigin = Math.sqrt(x * x + z * z);

      // Keep starting city center (-30..30, -30..30) clear for initial player construction
      if (distFromOrigin < 42) continue;

      const y = terrain.getHeight(x, z);
      // Skip water and steep mountain peaks
      if (y < terrain.waterLevel + 1.2 || y > 35) continue;

      // Group trees into lush forest clusters using Perlin-like pseudo noise
      const forestNoise = Math.sin(x * 0.04) * Math.cos(z * 0.04) + Math.sin(x * 0.08 + z * 0.08);
      if (forestNoise < -0.2) continue;

      const scale = 0.75 + Math.random() * 0.6;
      this.dummy.position.set(x, y, z);
      this.dummy.rotation.y = Math.random() * Math.PI * 2;
      this.dummy.scale.set(scale, scale * (0.9 + Math.random() * 0.3), scale);
      this.dummy.updateMatrix();

      // Higher elevations prefer pines, lower elevations prefer oaks
      const pinePreference = y > 8 ? 0.75 : 0.45;
      const roll = Math.random();

      if (roll < pinePreference && pineIdx < this.pineMesh.count) {
        this.pineMesh.setMatrixAt(pineIdx, this.dummy.matrix);
        this.treePositions.push({ x, y, z, type: 'pine', index: pineIdx });
        pineIdx++;
      } else if (oakIdx < this.oakMesh.count) {
        this.oakMesh.setMatrixAt(oakIdx, this.dummy.matrix);
        this.treePositions.push({ x, y, z, type: 'oak', index: oakIdx });
        oakIdx++;
      } else if (rockIdx < this.rockMesh.count) {
        this.rockMesh.setMatrixAt(rockIdx, this.dummy.matrix);
        this.treePositions.push({ x, y, z, type: 'rock', index: rockIdx });
        rockIdx++;
      }
    }

    this.pineMesh.instanceMatrix.needsUpdate = true;
    this.oakMesh.instanceMatrix.needsUpdate = true;
    this.rockMesh.instanceMatrix.needsUpdate = true;
  }

  public clearVegetationAround(cx: number, cz: number, radius: number) {
    let pineModified = false;
    let oakModified = false;
    let rockModified = false;

    // Scale down trees inside the radius to 0 to remove them cleanly
    const zeroScale = new THREE.Matrix4().makeScale(0, 0, 0);

    for (let i = 0; i < this.treePositions.length; i++) {
      const item = this.treePositions[i];
      const dx = item.x - cx;
      const dz = item.z - cz;
      if (dx * dx + dz * dz < radius * radius) {
        if (item.type === 'pine') {
          this.pineMesh.setMatrixAt(item.index, zeroScale);
          pineModified = true;
        } else if (item.type === 'oak') {
          this.oakMesh.setMatrixAt(item.index, zeroScale);
          oakModified = true;
        } else if (item.type === 'rock') {
          this.rockMesh.setMatrixAt(item.index, zeroScale);
          rockModified = true;
        }
      }
    }

    if (pineModified) this.pineMesh.instanceMatrix.needsUpdate = true;
    if (oakModified) this.oakMesh.instanceMatrix.needsUpdate = true;
    if (rockModified) this.rockMesh.instanceMatrix.needsUpdate = true;
  }
}
