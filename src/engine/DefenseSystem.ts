import * as THREE from 'three';
import { PlacedBuilding, Threat, InterceptorMissile, CombatLogEntry } from '../types/game';
import { BUILDING_DEFS } from '../data/buildingDefs';
import { BuildingRenderer } from './BuildingRenderer';
import { ParticleSystem } from './ParticleSystem';
import { soundManager } from '../audio/SoundManager';

export class DefenseSystem {
  public group: THREE.Group;
  private renderer: BuildingRenderer;
  private particles: ParticleSystem;

  public activeMissiles: InterceptorMissile[] = [];
  private missileMeshes: Map<string, THREE.Group> = new Map();
  private coverageRings: THREE.Mesh[] = [];
  private lastFireTimes: Map<string, number> = new Map();

  constructor(renderer: BuildingRenderer, particles: ParticleSystem) {
    this.renderer = renderer;
    this.particles = particles;
    this.group = new THREE.Group();
  }

  public updateRadarCoverageRings(buildings: PlacedBuilding[]) {
    // Clean old rings
    this.coverageRings.forEach((r) => this.group.remove(r));
    this.coverageRings = [];

    buildings.forEach((b) => {
      if (!b.active || !b.powered) return;
      const def = BUILDING_DEFS[b.type];

      const range = def.radarRadius || def.defenseRange;
      if (!range) return;

      const isRadar = !!def.radarRadius;
      const ringGeo = new THREE.RingGeometry(range - 1.5, range, 48);
      ringGeo.rotateX(-Math.PI / 2);

      const color = isRadar ? 0x06b6d4 : 0x10b981; // Cyan for radar, Emerald for SAM
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      });

      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(b.x, 0.4, b.z);
      this.group.add(ringMesh);
      this.coverageRings.push(ringMesh);
    });
  }

  public processDefense(
    buildings: PlacedBuilding[],
    threats: Threat[],
    now: number,
    onLog: (entry: CombatLogEntry) => void
  ) {
    // 1. Radar Detection
    const radars = buildings.filter((b) => b.type === 'def_radar' && b.active && b.powered);

    threats.forEach((threat) => {
      if (!threat.detected) {
        for (const r of radars) {
          const dist = Math.hypot(threat.x - r.x, threat.z - r.z);
          const range = BUILDING_DEFS[r.type].radarRadius || 180;
          if (dist <= range) {
            threat.detected = true;
            soundManager.playRadarPing();
            onLog({
              id: `log_${Date.now()}_${Math.random()}`,
              timestamp: new Date().toLocaleTimeString(),
              type: 'ALERT',
              message: `Early Warning: Radar acquired hostile [${threat.name.toUpperCase()}] vector range ${Math.round(dist)}km!`,
            });
            break;
          }
        }
      }
    });

    // 2. Air-Defense SAM & CIWS Interception
    const samBatteries = buildings.filter(
      (b) => (b.type === 'def_sam_battery' || b.type === 'def_ciws') && b.active && b.powered
    );

    samBatteries.forEach((sam) => {
      const def = BUILDING_DEFS[sam.type];
      const maxRange = def.defenseRange || 140;
      const fireInterval = (def.fireRate || 2.5) * 1000;
      const lastFire = this.lastFireTimes.get(sam.id) || 0;

      if (now - lastFire < fireInterval) return;

      // Find closest detected threat in range
      let bestThreat: Threat | null = null;
      let bestDist = maxRange;

      threats.forEach((t) => {
        if (!t.detected) return;
        const dist = Math.hypot(t.x - sam.x, t.z - sam.z);
        if (dist <= bestDist) {
          bestThreat = t;
          bestDist = dist;
        }
      });

      if (bestThreat) {
        const target: Threat = bestThreat;
        // Orient SAM Turret in 3D
        const launcher = this.renderer.samLaunchers.find((l) => l.id === sam.id);
        if (launcher) {
          const angle = Math.atan2(target.x - sam.x, target.z - sam.z);
          launcher.base.rotation.y = angle;
        }

        // Fire interceptor missile
        this.lastFireTimes.set(sam.id, now);
        this.launchInterceptor(sam, target);

        if (sam.type === 'def_ciws') {
          soundManager.playCiwsFire();
        } else {
          soundManager.playMissileLaunch();
        }

        onLog({
          id: `log_${Date.now()}_${Math.random()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'INFO',
          message: `${def.name} engaged hostile threat [${target.name}] at ${Math.round(bestDist)}m`,
        });
      }
    });
  }

  private launchInterceptor(sam: PlacedBuilding, target: Threat) {
    const missileId = `msl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const missile: InterceptorMissile = {
      id: missileId,
      originX: sam.x,
      originY: 2.2,
      originZ: sam.z,
      x: sam.x,
      y: 2.2,
      z: sam.z,
      targetThreatId: target.id,
      speed: 48, // fast hypersonic rocket
      lifeTime: 0,
    };

    // 3D missile mesh
    const mesh = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 1.4, 6),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
    );
    body.rotateX(Math.PI / 2);
    mesh.add(body);

    mesh.position.set(missile.x, missile.y, missile.z);
    this.group.add(mesh);
    this.missileMeshes.set(missileId, mesh);
    this.activeMissiles.push(missile);
  }

  public update(
    delta: number,
    threats: Threat[],
    onThreatDestroyed: (threatId: string) => void,
    onLog: (entry: CombatLogEntry) => void
  ) {
    // Pulse coverage rings gently
    const pulse = 0.35 + Math.sin(Date.now() * 0.003) * 0.1;
    this.coverageRings.forEach((r) => {
      (r.material as THREE.MeshBasicMaterial).opacity = pulse;
    });

    // Update active interceptor missiles
    for (let i = this.activeMissiles.length - 1; i >= 0; i--) {
      const m = this.activeMissiles[i];
      m.lifeTime += delta;

      const mesh = this.missileMeshes.get(m.id);
      const target = threats.find((t) => t.id === m.targetThreatId);

      if (!target || m.lifeTime > 6.0) {
        // Lost target or timed out
        if (mesh) this.group.remove(mesh);
        this.missileMeshes.delete(m.id);
        this.activeMissiles.splice(i, 1);
        continue;
      }

      // Homing guidance toward target
      const dx = target.x - m.x;
      const dy = target.y - m.y;
      const dz = target.z - m.z;
      const dist = Math.hypot(dx, dy, dz);

      if (dist < 3.0) {
        // Intercept impact!
        this.particles.spawnExplosion(target.x, target.y, target.z, 60);
        soundManager.playExplosion();

        onThreatDestroyed(target.id);
        onLog({
          id: `log_${Date.now()}_${Math.random()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'SUCCESS',
          message: `TARGET SPLASH: Interceptor destroyed hostile [${target.name.toUpperCase()}] in mid-air!`,
        });

        if (mesh) this.group.remove(mesh);
        this.missileMeshes.delete(m.id);
        this.activeMissiles.splice(i, 1);
      } else {
        const step = m.speed * delta;
        m.x += (dx / dist) * step;
        m.y += (dy / dist) * step;
        m.z += (dz / dist) * step;

        if (mesh) {
          mesh.position.set(m.x, m.y, m.z);
          mesh.lookAt(target.x, target.y, target.z);
        }

        // Smoke trail
        this.particles.spawnMissileTrail(m.x, m.y, m.z);
      }
    }
  }
}
