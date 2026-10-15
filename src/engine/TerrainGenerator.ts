import * as THREE from 'three';

export class TerrainGenerator {
  public mesh: THREE.Mesh;
  public waterMesh: THREE.Mesh;
  private width: number;
  private depth: number;
  private segments: number;
  public waterLevel: number = -1.8;

  constructor(width = 600, depth = 600, segments = 180) {
    this.width = width;
    this.depth = depth;
    this.segments = segments;

    const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const vertexCount = positions.count;

    // First pass: Calculate elevations
    for (let i = 0; i < vertexCount; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const h = this.getHeight(x, z);
      positions.setY(i, h);
    }

    geometry.computeVertexNormals();
    const normals = geometry.attributes.normal;
    const colors = new Float32Array(vertexCount * 3);

    // Natural PBR color palette
    const colorSand = new THREE.Color(0xd7c49e);      // Golden shore sand
    const colorWetSand = new THREE.Color(0xa89371);   // Wet tide line
    const colorFertileGrass = new THREE.Color(0x385e2b);// Deep lush grass
    const colorMeadowGrass = new THREE.Color(0x4d753b); // Natural highland grass
    const colorDryTurf = new THREE.Color(0x607d47);    // Dry hillside turf
    const colorDarkEarth = new THREE.Color(0x423828);  // Rich loamy soil
    const colorRockDark = new THREE.Color(0x4a4c50);   // Slate cliff rock
    const colorRockLight = new THREE.Color(0x6e7177);  // Weathered granite
    const colorSnow = new THREE.Color(0xe8eef2);       // Alpine snow crest

    // Second pass: Calculate slope-dependent and elevation-dependent realistic coloring
    for (let i = 0; i < vertexCount; i++) {
      const h = positions.getY(i);
      const ny = normals.getY(i); // 1.0 = completely flat, 0.0 = vertical cliff
      const slope = 1.0 - Math.max(0, Math.min(1, ny)); // 0 = flat, 1 = vertical

      const c = new THREE.Color();

      if (h < this.waterLevel + 0.6) {
        // Shoreline / sand
        const t = Math.max(0, Math.min(1, (h - (this.waterLevel - 1.5)) / 2.1));
        c.lerpColors(colorWetSand, colorSand, t);
      } else if (h < 14) {
        // Lowlands & River Valley
        const grassBlend = Math.max(0, Math.min(1, (h - (this.waterLevel + 0.6)) / 6.0));
        const baseGrass = new THREE.Color().lerpColors(colorSand, colorFertileGrass, grassBlend);

        if (slope > 0.35) {
          // Steep riverbank or hillock exposing soil/rock
          const rockBlend = Math.min(1, (slope - 0.35) / 0.35);
          c.lerpColors(baseGrass, colorDarkEarth, rockBlend);
        } else {
          // Lush flat valley with meadow variation
          const meadowBlend = Math.max(0, Math.min(1, (h - 4.0) / 10.0));
          c.lerpColors(baseGrass, colorMeadowGrass, meadowBlend);
        }
      } else if (h < 28) {
        // Rolling Hills and Foothills
        const hillBlend = (h - 14) / 14;
        const uplandColor = new THREE.Color().lerpColors(colorMeadowGrass, colorDryTurf, hillBlend);

        if (slope > 0.28) {
          // Rock exposure on hillsides
          const rockT = Math.min(1, (slope - 0.28) / 0.4);
          c.lerpColors(uplandColor, colorRockDark, rockT);
        } else {
          c.copy(uplandColor);
        }
      } else {
        // High Mountain Ridges
        const alpineBlend = Math.min(1, (h - 28) / 12);
        const cragColor = new THREE.Color().lerpColors(colorRockDark, colorRockLight, alpineBlend);

        if (slope > 0.45) {
          c.copy(colorRockDark);
        } else if (h > 36) {
          // Snow dusted peaks on flatter crests
          const snowT = Math.min(1, (h - 36) / 8);
          c.lerpColors(cragColor, colorSnow, snowT);
        } else {
          c.copy(cragColor);
        }
      }

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Generate procedural micro-noise texture for realistic ground detail
    const groundTexture = this.createProceduralGroundTexture();
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(48, 48);

    const terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: groundTexture,
      roughness: 0.88,
      metalness: 0.04,
      flatShading: false,
    });

    this.mesh = new THREE.Mesh(geometry, terrainMaterial);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;

    // Water Surface with specular sheen
    const waterGeo = new THREE.PlaneGeometry(width, depth, 48, 48);
    waterGeo.rotateX(-Math.PI / 2);

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x124866,
      roughness: 0.12,
      metalness: 0.75,
      transparent: true,
      opacity: 0.85,
    });

    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.y = this.waterLevel;
    this.waterMesh.receiveShadow = true;
  }

  private createProceduralGroundTexture(): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Neutral noise overlay
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, size, size);

      const imgData = ctx.getImageData(0, 0, size, size);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 45;
        const val = Math.max(0, Math.min(255, 128 + noise));
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
        data[i + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    return new THREE.CanvasTexture(canvas);
  }

  // Smooth multi-octave height function with natural river curving
  public getHeight(x: number, z: number): number {
    const distCenter = Math.hypot(x, z);

    // River channel equation: smooth S-curve from southwest to east bay
    const riverCenter = Math.sin(z * 0.012) * 55 + (z * 0.32);
    const distToRiver = Math.abs(x - riverCenter);

    // Eastern coastal bay (x > 150)
    const isBay = x > 150;
    const bayFactor = isBay ? Math.min(1, (x - 150) / 75) : 0;

    // Multi-octave natural rolling terrain
    const oct1 = Math.sin(x * 0.009) * Math.cos(z * 0.011) * 6.5;
    const oct2 = Math.sin(x * 0.022 + 1.4) * Math.sin(z * 0.018) * 3.2;
    const oct3 = Math.cos(x * 0.045) * Math.sin(z * 0.042) * 1.4;
    const oct4 = Math.sin(x * 0.09) * Math.cos(z * 0.09) * 0.6;

    // Distant mountain ranges (North and Far West)
    let mountain = 0;
    if (z < -110) {
      const d = Math.abs(z + 110) / 50;
      mountain += Math.pow(d, 1.7) * (3.5 + Math.sin(x * 0.035) * 2.0);
    }
    if (x < -135) {
      const d = Math.abs(x + 135) / 50;
      mountain += Math.pow(d, 1.7) * (3.5 + Math.cos(z * 0.035) * 2.0);
    }

    let elevation = oct1 + oct2 + oct3 + oct4 + mountain;

    // Carve smooth river bed using hermite smoothstep
    if (distToRiver < 42) {
      const t = distToRiver / 42;
      const smoothFactor = (1 - (t * t * (3 - 2 * t))); // Hermite smoothstep
      const riverDepth = smoothFactor * 8.2;
      elevation -= riverDepth;
    }

    // Carve coastal sea on east
    if (bayFactor > 0) {
      elevation = elevation * (1 - bayFactor) - (bayFactor * 6.5);
    }

    // Flatten central urban development zone for easy building
    if (distCenter < 145 && distToRiver > 32 && !isBay) {
      const blend = Math.max(0, 1 - distCenter / 145);
      elevation = elevation * (1 - blend * 0.78);
    }

    return elevation;
  }

  public isWater(x: number, z: number): boolean {
    return this.getHeight(x, z) <= this.waterLevel + 0.35;
  }

  public isNearShoreline(x: number, z: number): boolean {
    const h = this.getHeight(x, z);
    return h >= this.waterLevel - 0.5 && h <= this.waterLevel + 2.8;
  }

  public update(time: number) {
    if (this.waterMesh) {
      this.waterMesh.position.y = this.waterLevel + Math.sin(time * 1.5) * 0.06;
    }
  }
}
