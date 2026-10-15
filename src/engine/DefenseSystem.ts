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

  // Development-only diagnostic visuals
  public debugGroup: THREE.Group;
  public showDebug: boolean = false;

  constructor(renderer: BuildingRenderer, particles: ParticleSystem) {
    this.renderer = renderer;
    this.particles = particles;
    this.group = new THREE.Group();
    this.debugGroup = new THREE.Group();
    this.group.add(this.debugGroup);
  }

  public updateRadarCoverageRings(buildings: PlacedBuilding[]) {
    this.coverageRings.forEach((r) => this.group.remove(r));
    this.coverageRings = [];

    buildings.forEach((b) => {
      if (!b.active || !b.powered) return;
      const def = BUILDING_DEFS[b.type];

      const range = def.radarRadius || def.defenseRange;
      if (!range) return;

      const isRadar = !!def.radarRadius;
      const ringGeo = new THREE.RingGeometry(range - 1.8, range, 64);
      ringGeo.rotateX(-Math.PI / 2);

      const color = isRadar ? 0x06b6d4 : 0x10b981; // Cyan for radar, Emerald for SAM
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      });

      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(b.x, 0.45, b.z);
      this.group.add(ringMesh);
      this.coverageRings.push(ringMesh);
    });
  }

  public processDefense(
    buildings: PlacedBuilding[],
    threats: Threat[],
    now: number,
    delta: number,
    onLog: (entry: CombatLogEntry) => void
  ) {
    // 1. Radar Detection Processing
    const radars = buildings.filter((b) => b.type === 'def_radar' && b.active && b.powered);

    threats.forEach((threat) => {
      if (threat.state === 'UNDETECTED') {
        for (const r of radars) {
          const dist = Math.hypot(threat.x - r.x, threat.z - r.z);
          const range = BUILDING_DEFS[r.type].radarRadius || 180;
          if (dist <= range) {
            threat.detected = true;
            threat.state = 'DETECTED';
            soundManager.playRadarPing();
            onLog({
              id: `log_${Date.now()}_${Math.random()}`,
              timestamp: new Date().toLocaleTimeString(),
              type: 'ALERT',
              message: `EARLY WARNING: Radar acquired hostile contact [${threat.name.toUpperCase()}] range ${Math.round(dist)}km!`,
            });
            break;
          }
        }
      }
    });

    // 2. Air-Defense SAM & CIWS Target Assignment & Interception
    const defenses = buildings.filter(
      (b) => (b.type === 'def_sam_battery' || b.type === 'def_ciws') && b.active
    );

    defenses.forEach((sam) => {
      const def = BUILDING_DEFS[sam.type];

      // Initialize ammunition if not present
      if (sam.ammo === undefined) {
        sam.maxAmmo = sam.type === 'def_ciws' ? 600 : 4;
        sam.ammo = sam.maxAmmo;
        sam.defenseStatus = 'IDLE';
      }

      // Check power state
      if (!sam.powered) {
        sam.defenseStatus = 'UNPOWERED';
        return;
      }

      // Reloading mechanics
      if (sam.isReloading) {
        sam.reloadProgress = (sam.reloadProgress || 0) + delta;
        sam.defenseStatus = 'RELOADING';
        const reloadDuration = sam.type === 'def_ciws' ? 5.0 : 8.0;

        if (sam.reloadProgress >= reloadDuration) {
          sam.isReloading = false;
          sam.ammo = sam.maxAmmo;
          sam.reloadProgress = 0;
          sam.defenseStatus = 'IDLE';
          onLog({
            id: `log_${Date.now()}_${Math.random()}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'INFO',
            message: `${def.name} reload complete. All missile canisters armed.`,
          });
        }
        return;
      }

      // Check if depleted of ammunition
      if (sam.ammo <= 0) {
        sam.isReloading = true;
        sam.reloadProgress = 0;
        sam.defenseStatus = 'RELOADING';
        return;
      }

      const maxRange = def.defenseRange || 140;
      const fireInterval = (def.fireRate || 2.5) * 1000;
      const lastFire = this.lastFireTimes.get(sam.id) || 0;

      // Find best active detected threat in range
      let bestThreat: Threat | null = null;
      let bestDist = maxRange;

      threats.forEach((t) => {
        if (!t.detected || t.state === 'INTERCEPTED' || t.state === 'IMPACTED') return;
        const dist = Math.hypot(t.x - sam.x, t.z - sam.z);
        if (dist <= bestDist) {
          bestThreat = t;
          bestDist = dist;
        }
      });

      const launcher = this.renderer.samLaunchers.find((l) => l.id === sam.id);

      if (bestThreat) {
        const target: Threat = bestThreat;
        sam.assignedTargetId = target.id;
        sam.defenseStatus = 'TRACKING';
        target.state = 'TRACKED';

        // Accurately Aim Turret in 3D: Azimuth and Elevation
        if (launcher) {
          const dx = target.x - sam.x;
          const dz = target.z - sam.z;
          const dy = target.y - (launcher.pitchMount.position.y + 1.2);
          const hDist = Math.max(1, Math.hypot(dx, dz));

          // Calculate world azimuth and subtract building rotation
          const worldAngle = Math.atan2(dx, dz);
          launcher.base.rotation.y = worldAngle - sam.rotation;

          // Calculate pitch elevation
          const pitchAngle = Math.atan2(dy, hDist);
          launcher.pitchMount.rotation.x = -pitchAngle;
        }

        // Firing decision
        if (now - lastFire >= fireInterval) {
          this.lastFireTimes.set(sam.id, now);
          sam.ammo -= 1;
          sam.defenseStatus = 'FIRING';
          target.state = 'ENGAGED';
          target.interceptorsInFlight += 1;

          this.launchInterceptor(sam, target, launcher);

          if (sam.type === 'def_ciws') {
            soundManager.playCiwsFire();
          } else {
            soundManager.playMissileLaunch();
          }

          onLog({
            id: `log_${Date.now()}_${Math.random()}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'INFO',
            message: `${def.name} launched interceptor on [${target.name}] (Range: ${Math.round(bestDist)}m, Ammo: ${sam.ammo}/${sam.maxAmmo})`,
          });
        }
      } else {
        sam.assignedTargetId = undefined;
        sam.defenseStatus = 'IDLE';

        // Return launcher to resting elevation
        if (launcher) {
          launcher.pitchMount.rotation.x = -Math.PI / 4.2;
        }
      }
    });

    if (this.showDebug) this.updateDebugVisuals(buildings, threats);
  }

  private launchInterceptor(
    sam: PlacedBuilding,
    target: Threat,
    launcher?: { base: THREE.Object3D; pitchMount: THREE.Object3D }
  ) {
    const missileId = `msl_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const startX = sam.x;
    const startY = 2.4;
    const startZ = sam.z;

    const missile: InterceptorMissile = {
      id: missileId,
      originX: startX,
      originY: startY,
      originZ: startZ,
      x: startX,
      y: startY,
      z: startZ,
      prevX: startX,
      prevY: startY,
      prevZ: startZ,
      targetThreatId: target.id,
      speed: sam.type === 'def_ciws' ? 75 : 55, // Fast hypersonic rocket
      lifeTime: 0,
      maxLifeTime: 5.5,
    };

    // Detailed 3D Interceptor Missile Mesh
    const mesh = new THREE.Group();

    // Cylindrical missile airframe
    const bodyGeo = new THREE.CylinderGeometry(0.14, 0.14, 1.8, 8);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.6 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    mesh.add(body);

    // Aerodynamic nose cone (Warhead)
    const noseGeo = new THREE.ConeGeometry(0.14, 0.6, 8);
    noseGeo.rotateX(-Math.PI / 2);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.2 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.z = 1.2;
    mesh.add(nose);

    // Cruciform Tail Guidance Fins
    const finGeo = new THREE.BoxGeometry(0.7, 0.04, 0.4);
    const fin1 = new THREE.Mesh(finGeo, bodyMat);
    fin1.position.z = -0.7;
    const fin2 = new THREE.Mesh(finGeo, bodyMat);
    fin2.position.z = -0.7;
    fin2.rotation.z = Math.PI / 2;
    mesh.add(fin1, fin2);

    // Glowing Rocket Engine Plume
    const plume = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.7, 6),
      new THREE.MeshBasicMaterial({ color: 0xf97316 })
    );
    plume.rotateX(Math.PI / 2);
    plume.position.z = -1.25;
    mesh.add(plume);

    mesh.position.set(startX, startY, startZ);
    mesh.lookAt(target.x, target.y, target.z);

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
    // Pulse radar coverage rings gently
    const pulse = 0.32 + Math.sin(Date.now() * 0.003) * 0.08;
    this.coverageRings.forEach((r) => {
      (r.material as THREE.MeshBasicMaterial).opacity = pulse;
    });

    // Update active interceptor missiles
    for (let i = this.activeMissiles.length - 1; i >= 0; i--) {
      const m = this.activeMissiles[i];
      m.lifeTime += delta;

      const mesh = this.missileMeshes.get(m.id);
      const target = threats.find((t) => t.id === m.targetThreatId);

      // Timeout or target already neutralized
      if (!target || target.state === 'INTERCEPTED' || target.state === 'IMPACTED' || m.lifeTime > m.maxLifeTime) {
        if (mesh) this.group.remove(mesh);
        this.missileMeshes.delete(m.id);
        this.activeMissiles.splice(i, 1);
        continue;
      }

      // Record previous coordinate before step
      m.prevX = m.x;
      m.prevY = m.y;
      m.prevZ = m.z;

      // Proportional Navigation / Lead Pursuit vector
      const dx = target.x - m.x;
      const dy = target.y - m.y;
      const dz = target.z - m.z;
      const dist = Math.hypot(dx, dy, dz);

      const step = m.speed * delta;

      // Swept Segment Collision Detection:
      // Check if distance to target is less than step + impact radius (eliminating tunneling!)
      if (dist <= step + 3.8) {
        // Resolve Interception Hit
        target.state = 'INTERCEPTED';
        this.particles.spawnExplosion(target.x, target.y, target.z, 75);
        soundManager.playExplosion();

        onThreatDestroyed(target.id);
        onLog({
          id: `log_${Date.now()}_${Math.random()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'SUCCESS',
          message: `TARGET SPLASH: Interceptor destroyed hostile contact [${target.name.toUpperCase()}] in mid-air!`,
        });

        if (mesh) this.group.remove(mesh);
        this.missileMeshes.delete(m.id);
        this.activeMissiles.splice(i, 1);
      } else {
        m.x += (dx / dist) * step;
        m.y += (dy / dist) * step;
        m.z += (dz / dist) * step;

        if (mesh) {
          mesh.position.set(m.x, m.y, m.z);
          mesh.lookAt(target.x, target.y, target.z);
        }

        // Exhaust smoke particles
        this.particles.spawnMissileTrail(m.x, m.y, m.z);
      }
    }
  }

  // Combat diagnostic tools
  public setDebugVisible(visible: boolean) {
    this.showDebug = visible;
    this.debugGroup.visible = visible;
  }

  private updateDebugVisuals(buildings: PlacedBuilding[], threats: Threat[]) {
    while (this.debugGroup.children.length > 0) {
      this.debugGroup.remove(this.debugGroup.children[0]);
    }
    if (!this.showDebug) return;

    // Line of sight rays from SAM batteries to tracked targets
    buildings.forEach((b) => {
      if ((b.type === 'def_sam_battery' || b.type === 'def_ciws') && b.assignedTargetId) {
        const target = threats.find((t) => t.id === b.assignedTargetId);
        if (target) {
          const points = [
            new THREE.Vector3(b.x, 2.5, b.z),
            new THREE.Vector3(target.x, target.y, target.z),
          ];
          const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
          const lineMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 });
          const line = new THREE.Line(lineGeo, lineMat);
          this.debugGroup.add(line);
        }
      }
    });
  }
}
