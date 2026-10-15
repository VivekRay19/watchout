import * as THREE from 'three';
import { Threat, PlacedBuilding, CombatLogEntry } from '../types/game';
import { ParticleSystem } from './ParticleSystem';
import { soundManager } from '../audio/SoundManager';

export class ThreatSystem {
  public group: THREE.Group;
  public activeThreats: Threat[] = [];
  private threatMeshes: Map<string, THREE.Group> = new Map();
  private particles: ParticleSystem;
  private lastSpawnTime = 0;
  private spawnInterval = 35000; // spawn enemy incursion every ~35s
  private enemyBasePos = { x: -220, z: -200 };

  constructor(particles: ParticleSystem) {
    this.particles = particles;
    this.group = new THREE.Group();
  }

  public update(
    now: number,
    delta: number,
    buildings: PlacedBuilding[],
    threatLevel: 'MINIMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL',
    onBuildingDamaged: (buildingId: string, damage: number) => void,
    onLog: (entry: CombatLogEntry) => void
  ) {
    // Dynamic spawn interval based on threat level
    let interval = this.spawnInterval;
    if (threatLevel === 'ELEVATED') interval = 28000;
    if (threatLevel === 'HIGH') interval = 20000;
    if (threatLevel === 'CRITICAL') interval = 14000;

    if (now - this.lastSpawnTime > interval) {
      this.lastSpawnTime = now;
      this.spawnThreatWave(buildings, onLog);
    }

    // Move active threats
    for (let i = this.activeThreats.length - 1; i >= 0; i--) {
      const t = this.activeThreats[i];
      const mesh = this.threatMeshes.get(t.id);

      const dx = t.targetX - t.x;
      const dz = t.targetZ - t.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 4.0 || t.y <= 0) {
        // Threat reached target or crashed - IMPACT!
        this.particles.spawnExplosion(t.x, t.y, t.z, 75);
        soundManager.playExplosion();
        soundManager.playSiren();

        if (t.targetBuildingId) {
          const damage = t.type === 'cruise_missile' ? 350 : 180;
          onBuildingDamaged(t.targetBuildingId, damage);
        }

        onLog({
          id: `log_${Date.now()}_${Math.random()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'DANGER',
          message: `CRITICAL IMPACT: Enemy ${t.name.toUpperCase()} penetrated defenses and detonated at target coordinates!`,
        });

        this.removeThreat(t.id);
        continue;
      }

      // Step towards target
      const angle = Math.atan2(dx, dz);
      t.heading = angle;
      const step = t.speed * delta;
      t.x += Math.sin(angle) * step;
      t.z += Math.cos(angle) * step;

      // Glide down slightly towards target elevation
      t.y = Math.max(2.0, t.y - delta * 1.5);

      if (mesh) {
        mesh.position.set(t.x, t.y, t.z);
        mesh.rotation.y = angle;
      }

      // Engine trail
      this.particles.spawnSmokePuff(t.x, t.y, t.z, 0xef4444);
    }
  }

  private spawnThreatWave(buildings: PlacedBuilding[], onLog: (entry: CombatLogEntry) => void) {
    // Pick an enemy attack type
    const roll = Math.random();
    let type: Threat['type'] = 'drone_recon';
    let speed = 14;
    let altitude = 16;
    let name = 'Hostile Shahed Recon Drone';

    if (roll > 0.4 && roll <= 0.8) {
      type = 'cruise_missile';
      speed = 32;
      altitude = 8;
      name = 'Kalibr Stealth Cruise Missile';
    } else if (roll > 0.8) {
      type = 'stealth_bomber';
      speed = 22;
      altitude = 28;
      name = 'Tu-160 Heavy Strike Incursion';
    }

    // Pick a high-value player target building or city center
    let targetX = 0;
    let targetZ = 0;
    let targetBuildingId: string | undefined;

    if (buildings.length > 0) {
      // Prioritize power plants, factories, or military HQ
      const highValue = buildings.find(
        (b) => b.type === 'util_power_plant' || b.type === 'mil_hq' || b.type === 'ind_factory'
      );
      const targetBuilding = highValue || buildings[Math.floor(Math.random() * buildings.length)];
      targetX = targetBuilding.x;
      targetZ = targetBuilding.z;
      targetBuildingId = targetBuilding.id;
    }

    const threatId = `threat_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Spawn origin near enemy territory perimeter (-220, -200)
    const originX = this.enemyBasePos.x + (Math.random() - 0.5) * 40;
    const originZ = this.enemyBasePos.z + (Math.random() - 0.5) * 40;

    const threat: Threat = {
      id: threatId,
      name,
      type,
      x: originX,
      y: altitude,
      z: originZ,
      targetX,
      targetZ,
      targetBuildingId,
      speed,
      health: 100,
      maxHealth: 100,
      detected: false,
      altitude,
      heading: Math.atan2(targetX - originX, targetZ - originZ),
    };

    const mesh = this.createThreatMesh(type);
    mesh.position.set(threat.x, threat.y, threat.z);
    mesh.rotation.y = threat.heading;

    this.group.add(mesh);
    this.threatMeshes.set(threatId, mesh);
    this.activeThreats.push(threat);

    onLog({
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'WARNING',
      message: `INTRUSION ALERT: Unknown aerial contact launched from Sector Charlie toward City Zone!`,
    });
  }

  private createThreatMesh(type: Threat['type']): THREE.Group {
    const group = new THREE.Group();

    if (type === 'cruise_missile') {
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 3.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.4 })
      );
      body.rotateX(Math.PI / 2);
      group.add(body);

      // Cruise missile stubby wings
      const wings = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.05, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x374151 })
      );
      group.add(wings);

      // Red warhead tip
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.2, 0.8, 8),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      tip.rotateX(-Math.PI / 2);
      tip.position.z = 2.0;
      group.add(tip);
    } else {
      // Delta-wing stealth drone
      const deltaGeo = new THREE.ConeGeometry(1.6, 3.2, 3);
      deltaGeo.rotateX(Math.PI / 2);
      const deltaMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.3 });
      const drone = new THREE.Mesh(deltaGeo, deltaMat);
      drone.scale.set(1.4, 0.25, 1.0);
      group.add(drone);

      // Glowing red sensor eye
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
      );
      eye.position.set(0, 0.15, 1.2);
      group.add(eye);
    }

    return group;
  }

  public removeThreat(threatId: string) {
    const mesh = this.threatMeshes.get(threatId);
    if (mesh) this.group.remove(mesh);
    this.threatMeshes.delete(threatId);
    this.activeThreats = this.activeThreats.filter((t) => t.id !== threatId);
  }
}
