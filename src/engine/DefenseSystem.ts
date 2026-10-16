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
  private trackingLinesGroup: THREE.Group;
  private lastFireTimes: Map<string, number> = new Map();
  public showCoverageOverlay: boolean = false;

  // Diagnostic visuals
  public debugGroup: THREE.Group;
  public showDebug: boolean = false;

  constructor(renderer: BuildingRenderer, particles: ParticleSystem) {
    this.renderer = renderer;
    this.particles = particles;
    this.group = new THREE.Group();
    this.trackingLinesGroup = new THREE.Group();
    this.debugGroup = new THREE.Group();
    this.group.add(this.trackingLinesGroup);
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
      const ringGeo = new THREE.RingGeometry(range - 1.2, range, 64);
      ringGeo.rotateX(-Math.PI / 2);

      const color = isRadar ? 0x38bdf8 : 0x22c55e;
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.0, // Hidden during peaceful city building to eliminate visual noise
        side: THREE.DoubleSide,
      });

      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(b.x, 1.75, b.z);
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
    // 1. Radar & Fire-Control Detection Processing
    const sensors = buildings.filter(
      (b) => (b.type === 'def_radar' || b.type === 'def_sam_battery') && b.active && b.powered
    );

    threats.forEach((threat) => {
      if (threat.state === 'UNDETECTED') {
        for (const s of sensors) {
          const dist = Math.hypot(threat.x - s.x, threat.z - s.z);
          const range = s.type === 'def_radar' ? (BUILDING_DEFS[s.type].radarRadius || 210) : 155;
          if (dist <= range) {
            threat.detected = true;
            threat.state = 'DETECTED';
            soundManager.playRadarPing();
            onLog({
              id: `log_${Date.now()}_${Math.random()}`,
              timestamp: new Date().toLocaleTimeString(),
              type: 'ALERT',
              message: `RADAR CONTACT: Early Warning Radar detected [${threat.name}] at range ${Math.round(dist)}m!`,
            });
            break;
          }
        }
      }
    });

    // Clear and rebuild subtle active tracking lock lines
    while (this.trackingLinesGroup.children.length > 0) {
      this.trackingLinesGroup.remove(this.trackingLinesGroup.children[0]);
    }

    // 2. Air-Defense SAM & CIWS Target Tracking & Interceptor Launch
    const defenses = buildings.filter(
      (b) => (b.type === 'def_sam_battery' || b.type === 'def_ciws') && b.active
    );

    defenses.forEach((sam) => {
      const def = BUILDING_DEFS[sam.type];

      if (sam.ammo === undefined) {
        sam.maxAmmo = sam.type === 'def_ciws' ? 600 : 4;
        sam.ammo = sam.maxAmmo;
        sam.defenseStatus = 'IDLE';
      }

      if (!sam.powered) {
        sam.defenseStatus = 'UNPOWERED';
        return;
      }

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
            message: `${def.name} reload complete. Launcher canisters ready.`,
          });
        }
        return;
      }

      if (sam.ammo <= 0) {
        sam.isReloading = true;
        sam.reloadProgress = 0;
        sam.defenseStatus = 'RELOADING';
        return;
      }

      const maxChannels = sam.type === 'def_ciws' ? 1 : 4;
      sam.trackingChannels = maxChannels;

      const maxRange = (def.defenseRange || 140) + 30;
      const fireInterval = (def.fireRate || 2.2) * 1000;
      const lastFire = this.lastFireTimes.get(sam.id) || 0;

      // Find up to maxChannels valid targets within range
      const validThreats: { threat: Threat; dist: number }[] = [];
      threats.forEach((t) => {
        if (!t.detected || t.state === 'INTERCEPTED' || t.state === 'IMPACTED') return;
        const dist = Math.hypot(t.x - sam.x, t.z - sam.z);
        if (dist <= maxRange) {
          validThreats.push({ threat: t, dist });
        }
      });

      validThreats.sort((a, b) => a.dist - b.dist);
      const activeTargets = validThreats.slice(0, maxChannels);

      const launcher = this.renderer.samLaunchers.find((l) => l.id === sam.id);

      if (activeTargets.length > 0) {
        sam.assignedTargetIds = activeTargets.map((at) => at.threat.id);
        sam.assignedTargetId = activeTargets[0].threat.id;
        sam.defenseStatus = 'TRACKING';

        activeTargets.forEach(({ threat: target }) => {
          if (target.state === 'DETECTED') {
            target.state = 'TRACKED';
          }

          // Draw clean target lock line while tracking/engaging
          const lockPoints = [
            new THREE.Vector3(sam.x, 3.2, sam.z),
            new THREE.Vector3(target.x, target.y, target.z),
          ];
          const lockGeo = new THREE.BufferGeometry().setFromPoints(lockPoints);
          const lockMat = new THREE.LineBasicMaterial({
            color: sam.type === 'def_ciws' ? 0xf87171 : 0x38bdf8,
            transparent: true,
            opacity: 0.45,
          });
          this.trackingLinesGroup.add(new THREE.Line(lockGeo, lockMat));
        });

        // Rotate 3D Turret toward the primary (closest) target
        const primaryTarget = activeTargets[0].threat;
        if (launcher) {
          const dx = primaryTarget.x - sam.x;
          const dz = primaryTarget.z - sam.z;
          const dy = primaryTarget.y - 3.2;
          const hDist = Math.max(1, Math.hypot(dx, dz));

          const worldAngle = Math.atan2(dx, dz);
          launcher.base.rotation.y = worldAngle - sam.rotation;

          const pitchAngle = Math.atan2(dy, hDist);
          launcher.pitchMount.rotation.x = -pitchAngle;
        }

        // Fire interceptor against highest-priority target with available engagement envelope
        if (now - lastFire >= fireInterval) {
          const engangable = activeTargets.find((at) => at.threat.interceptorsInFlight < 2);
          if (engangable) {
            const target = engangable.threat;
            this.lastFireTimes.set(sam.id, now);
            sam.ammo -= 1;
            sam.defenseStatus = 'FIRING';
            target.state = 'ENGAGED';
            target.interceptorsInFlight += 1;

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
              message: `${def.name} [CH-${activeTargets.indexOf(engangable) + 1}/${maxChannels}] launched interceptor at [${target.name}] (Range: ${Math.round(engangable.dist)}m)`,
            });
          }
        }
      } else {
        sam.assignedTargetId = undefined;
        sam.assignedTargetIds = [];
        sam.defenseStatus = 'IDLE';

        if (launcher) {
          launcher.pitchMount.rotation.x = -Math.PI / 4.2;
        }
      }
    });

    if (this.showDebug) this.updateDebugVisuals(buildings, threats);
  }

  private launchInterceptor(sam: PlacedBuilding, target: Threat) {
    const missileId = `msl_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const startX = sam.x;
    const startY = 3.5;
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
      speed: sam.type === 'def_ciws' ? 75 : 58,
      lifeTime: 0,
      maxLifeTime: 7.0,
    };

    // High-visibility 3D Interceptor Missile Mesh
    const mesh = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(0.22, 0.22, 2.4, 8);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    mesh.add(body);

    const noseGeo = new THREE.ConeGeometry(0.22, 0.8, 8);
    noseGeo.rotateX(-Math.PI / 2);
    const noseMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.z = 1.6;
    mesh.add(nose);

    const finGeo = new THREE.BoxGeometry(0.9, 0.06, 0.5);
    const fin1 = new THREE.Mesh(finGeo, bodyMat);
    fin1.position.z = -0.9;
    const fin2 = new THREE.Mesh(finGeo, bodyMat);
    fin2.position.z = -0.9;
    fin2.rotation.z = Math.PI / 2;
    mesh.add(fin1, fin2);

    const plume = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 1.1, 8),
      new THREE.MeshBasicMaterial({ color: 0xf97316 })
    );
    plume.rotateX(Math.PI / 2);
    plume.position.z = -1.75;
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
    // Only show radar coverage rings when an active threat is detected or when explicitly inspecting defense
    const hasActiveThreat = threats.some((t) => t.detected && t.state !== 'INTERCEPTED' && t.state !== 'IMPACTED');
    const targetOpacity = hasActiveThreat || this.showCoverageOverlay ? 0.28 : 0.0;

    this.coverageRings.forEach((r) => {
      const mat = r.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, delta * 5);
    });

    for (let i = this.activeMissiles.length - 1; i >= 0; i--) {
      const m = this.activeMissiles[i];
      m.lifeTime += delta;

      const mesh = this.missileMeshes.get(m.id);
      const target = threats.find((t) => t.id === m.targetThreatId);

      if (!target || target.state === 'INTERCEPTED' || target.state === 'IMPACTED' || m.lifeTime > m.maxLifeTime) {
        if (mesh) this.group.remove(mesh);
        this.missileMeshes.delete(m.id);
        this.activeMissiles.splice(i, 1);
        continue;
      }

      m.prevX = m.x;
      m.prevY = m.y;
      m.prevZ = m.z;

      const dx = target.x - m.x;
      const dy = target.y - m.y;
      const dz = target.z - m.z;
      const dist = Math.hypot(dx, dy, dz);

      const step = m.speed * delta;

      // Swept-segment collision check
      if (dist <= step + 4.2) {
        target.state = 'INTERCEPTED';
        this.particles.spawnExplosion(target.x, target.y, target.z, 55);
        soundManager.playExplosion();

        onThreatDestroyed(target.id);
        onLog({
          id: `log_${Date.now()}_${Math.random()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'SUCCESS',
          message: `TARGET INTERCEPTED: Air defense destroyed [${target.name}] in mid-air!`,
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

        this.particles.spawnMissileTrail(m.x, m.y, m.z);
      }
    }
  }

  public setDebugVisible(visible: boolean) {
    this.showDebug = visible;
    this.debugGroup.visible = visible;
  }

  private updateDebugVisuals(buildings: PlacedBuilding[], threats: Threat[]) {
    while (this.debugGroup.children.length > 0) {
      this.debugGroup.remove(this.debugGroup.children[0]);
    }
    if (!this.showDebug) return;

    buildings.forEach((b) => {
      if ((b.type === 'def_sam_battery' || b.type === 'def_ciws') && b.assignedTargetId) {
        const target = threats.find((t) => t.id === b.assignedTargetId);
        if (target) {
          const points = [
            new THREE.Vector3(b.x, 3.0, b.z),
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
