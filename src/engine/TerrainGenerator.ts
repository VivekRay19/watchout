import * as THREE from 'three';

export class TerrainGenerator {
  public mesh: THREE.Mesh;
  public waterMesh: THREE.Mesh;
  private width: number;
  private depth: number;
  private segments: number;
  public waterLevel: number = -1.8;

  constructor(width = 600, depth = 600, segments = 160) {
    this.width = width;
    this.depth = depth;
    this.segments = segments;

    const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);

    const colorSand = new THREE.Color(0xd2b48c); // Khaki sand
    const colorLush = new THREE.Color(0x3e7a3e); // Deep green
    const colorMeadow = new THREE.Color(0x568249); // Warm grassy meadow
    const colorRock = new THREE.Color(0x6e7175); // Slate rock
    const colorSnow = new THREE.Color(0xdce5eb); // Cold ridge

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const h = this.getHeight(x, z);
      positions.setY(i, h);

      // Color based on height and slope
      const c = new THREE.Color();
      if (h < this.waterLevel + 1.2) {
        c.lerpColors(colorSand, colorLush, Math.max(0, (h - this.waterLevel) / 1.2));
      } else if (h < 12) {
        c.lerpColors(colorLush, colorMeadow, (h - (this.waterLevel + 1.2)) / 10);
      } else if (h < 26) {
        c.lerpColors(colorMeadow, colorRock, (h - 12) / 14);
      } else {
        c.lerpColors(colorRock, colorSnow, Math.min(1, (h - 26) / 10));
      }

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: false,
    });

    this.mesh = new THREE.Mesh(geometry, terrainMaterial);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;

    // Water plane
    const waterGeo = new THREE.PlaneGeometry(width, depth, 40, 40);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1a5276,
      roughness: 0.15,
      metalness: 0.8,
      transparent: true,
      opacity: 0.82,
    });

    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.y = this.waterLevel;
    this.waterMesh.receiveShadow = true;
  }

  // Smooth procedural noise formula for elevation
  public getHeight(x: number, z: number): number {
    // Distance from center
    const distCenter = Math.sqrt(x * x + z * z);

    // River channel cutting diagonally towards the east bay (x > 80)
    // River equation: curved channel from (-180, -280) to (180, 280)
    const riverCenter = Math.sin(z * 0.015) * 45 + (z * 0.35);
    const distToRiver = Math.abs(x - riverCenter);

    // Coastal bay on the far east side (x > 150)
    const isBay = x > 160;
    const bayFactor = isBay ? Math.min(1, (x - 160) / 80) : 0;

    // Rolling gentle hills
    const hill1 = Math.sin(x * 0.012) * Math.cos(z * 0.014) * 5;
    const hill2 = Math.sin(x * 0.03 + 1.2) * Math.sin(z * 0.025) * 3;
    const micro = Math.cos(x * 0.06) * Math.sin(z * 0.06) * 1.2;

    // Mountains at outer edges (north and west borders)
    let mountain = 0;
    if (z < -120) {
      mountain += Math.pow(Math.abs(z + 120) / 45, 1.8) * (2.5 + Math.sin(x * 0.04) * 1.5);
    }
    if (x < -140) {
      mountain += Math.pow(Math.abs(x + 140) / 45, 1.8) * (2.5 + Math.cos(z * 0.04) * 1.5);
    }

    let elevation = hill1 + hill2 + micro + mountain;

    // Carve river channel
    if (distToRiver < 35) {
      const riverDepth = (1 - distToRiver / 35) * 7.5;
      elevation -= riverDepth;
    }

    // Carve coastal sea on east
    if (bayFactor > 0) {
      elevation = elevation * (1 - bayFactor) - (bayFactor * 6.0);
    }

    // Flatten central urban plateau for building
    if (distCenter < 140 && distToRiver > 30 && !isBay) {
      const blend = Math.max(0, 1 - distCenter / 140);
      elevation = elevation * (1 - blend * 0.75);
    }

    return elevation;
  }

  public isWater(x: number, z: number): boolean {
    return this.getHeight(x, z) <= this.waterLevel + 0.3;
  }

  public isNearShoreline(x: number, z: number): boolean {
    const h = this.getHeight(x, z);
    return h >= this.waterLevel - 0.5 && h <= this.waterLevel + 2.5;
  }

  public update(time: number) {
    // Gentle water wave animation
    if (this.waterMesh) {
      this.waterMesh.position.y = this.waterLevel + Math.sin(time * 1.8) * 0.08;
    }
  }
}
