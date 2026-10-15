import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  public group: THREE.Group;
  private particles: Particle[] = [];
  private points: THREE.Points;
  private maxParticles = 1200;
  private geo: THREE.BufferGeometry;
  private posArray: Float32Array;
  private colorArray: Float32Array;
  private sizeArray: Float32Array;

  constructor() {
    this.group = new THREE.Group();

    this.geo = new THREE.BufferGeometry();
    this.posArray = new Float32Array(this.maxParticles * 3);
    this.colorArray = new Float32Array(this.maxParticles * 3);
    this.sizeArray = new Float32Array(this.maxParticles);

    this.geo.setAttribute('position', new THREE.BufferAttribute(this.posArray, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.colorArray, 3));
    this.geo.setAttribute('size', new THREE.BufferAttribute(this.sizeArray, 1));

    // Custom circular particle canvas texture
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.5, 'rgba(255,200,100,0.8)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);

    const mat = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geo, mat);
    this.group.add(this.points);
  }

  public spawnExplosion(x: number, y: number, z: number, count = 45) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const speed = 4.0 + Math.random() * 8.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      const vx = Math.cos(phi) * Math.cos(theta) * speed;
      const vy = Math.abs(Math.sin(phi)) * speed + 2.0;
      const vz = Math.cos(phi) * Math.sin(theta) * speed;

      // Orange/red/yellow fiery sparks
      const isSmoke = Math.random() < 0.3;
      const color = isSmoke
        ? new THREE.Color(0x333333)
        : new THREE.Color(Math.random() < 0.5 ? 0xff4500 : 0xffd700);

      this.particles.push({
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(vx, vy, vz),
        color,
        size: isSmoke ? 3.0 : 1.8,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.8,
      });
    }
  }

  public spawnSmokePuff(x: number, y: number, z: number, color = 0x9ca3af) {
    if (this.particles.length >= this.maxParticles) return;

    this.particles.push({
      position: new THREE.Vector3(x + (Math.random() - 0.5) * 0.4, y, z + (Math.random() - 0.5) * 0.4),
      velocity: new THREE.Vector3((Math.random() - 0.5) * 0.5, 1.2 + Math.random() * 0.8, (Math.random() - 0.5) * 0.5),
      color: new THREE.Color(color),
      size: 1.6 + Math.random() * 1.2,
      life: 0,
      maxLife: 1.2 + Math.random() * 0.6,
    });
  }

  public spawnMissileTrail(x: number, y: number, z: number) {
    if (this.particles.length >= this.maxParticles) return;

    this.particles.push({
      position: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2),
      color: new THREE.Color(0xfef08a),
      size: 1.2,
      life: 0,
      maxLife: 0.5,
    });
  }

  public update(delta: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.position.addScaledVector(p.velocity, delta);
      // Drag & gravity
      p.velocity.y -= delta * 1.5;
      p.velocity.x *= 0.98;
      p.velocity.z *= 0.98;
    }

    // Update buffer attributes
    let idx = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const alpha = 1 - p.life / p.maxLife;

      this.posArray[idx * 3] = p.position.x;
      this.posArray[idx * 3 + 1] = p.position.y;
      this.posArray[idx * 3 + 2] = p.position.z;

      this.colorArray[idx * 3] = p.color.r * alpha;
      this.colorArray[idx * 3 + 1] = p.color.g * alpha;
      this.colorArray[idx * 3 + 2] = p.color.b * alpha;

      this.sizeArray[idx] = p.size * (1 + (1 - alpha) * 0.8);
      idx++;
    }

    // Zero out unused
    for (let i = idx; i < this.maxParticles; i++) {
      this.posArray[i * 3 + 1] = -9999;
      this.sizeArray[i] = 0;
    }

    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true;
  }
}
