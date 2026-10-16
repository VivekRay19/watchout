import * as THREE from 'three';
import { Threat, PlacedBuilding, CombatLogEntry } from '../types/game';
import { ParticleSystem } from './ParticleSystem';
import { soundManager } from '../audio/SoundManager';

export class ThreatSystem {
  public group: THREE.Group;
  public activeThreats: Threat[] = [];
  private threatMeshes: Map<string, THREE.Group> = new Map();
  private particles: ParticleSystem;
  private lastSpawnTime = performance.now();
  private spawnInterval = 48000;
  private enemyBasePos = { x: -210, z: -200 };

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
    let interval = this.spawnInterval;
    if (threatLevel === 'ELEVATED') interval = 42000;
    if (threatLevel === 'HIGH') interval = 34000;
    if (threatLevel === 'CRITICAL') interval = 28000;

    if (now - this.lastSpawnTime > interval) {
      this.lastSpawnTime = now;
      this.spawnThreatWave(buildings, onLog);
    }

    for (let i = this.activeThreats.length - 1; i >= 0; i--) {
      const t = this.activeThreats[i];
      const mesh = this.threatMeshes.get(t.id);

      if (t.state === 'INTERCEPTED') {
        this.removeThreat(t.id);
        continue;
      }

      const dx = t.targetX - t.x;
      const dz = t.targetZ - t.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 4.0 || t.y <= 1.5) {
        t.state = 'IMPACTED';
        this.particles.spawnExplosion(t.x, Math.max(2, t.y), t.z, 60);
        soundManager.playExplosion();
        soundManager.playSiren();

        if (t.targetBuildingId) {
          const damage = t.type === 'cruise_missile' ? 320 : 180;
          onBuildingDamaged(t.targetBuildingId, damage);
        }

        onLog({
          id: `log_${Date.now()}_${Math.random()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'DANGER',
          message: `IMPACT ALERT: Hostile ${t.name} struck city sector!`,
        });

        this.removeThreat(t.id);
        continue;
      }

      const angle = Math.atan2(dx, dz);
      t.heading = angle;
      const step = t.speed * delta;
      t.x += Math.sin(angle) * step;
      t.z += Math.cos(angle) * step;
      t.y = Math.max(4.5, t.y - delta * 0.45);

      if (mesh) {
        mesh.position.set(t.x, t.y, t.z);
        mesh.rotation.y = angle;
      }

      this.particles.spawnSmokePuff(t.x, t.y, t.z, 0xf87171);
    }
  }

  public spawnScriptedTrainingThreat(buildings: PlacedBuilding[], onLog: (entry: CombatLogEntry) => void): Threat {
    // Target near the defense compound or city center so SAM batteries have a clear shot
    const samBuilding = buildings.find((b) => b.type === 'def_sam_battery' || b.type === 'def_radar');
    const targetX = samBuilding ? samBuilding.x - 16 : 24;
    const targetZ = samBuilding ? samBuilding.z : -8;
    const targetBuildingId = samBuilding?.id || buildings[0]?.id;

    const threatId = `threat_drill_${Date.now()}`;
    const originX = targetX - 95;
    const originZ = targetZ - 75;
    const altitude = 16;

    const threat: Threat = {
      id: threatId,
      name: 'Recon Target Drone',
      type: 'drone_recon',
      x: originX,
      y: altitude,
      z: originZ,
      targetX,
      targetZ,
      targetBuildingId,
      speed: 14,
      health: 100,
      maxHealth: 100,
      detected: false,
      state: 'UNDETECTED',
      altitude,
      heading: Math.atan2(targetX - originX, targetZ - originZ),
      interceptorsInFlight: 0,
    };

    const mesh = this.createThreatMesh('drone_recon');
    mesh.position.set(threat.x, threat.y, threat.z);
    mesh.rotation.y = threat.heading;

    this.group.add(mesh);
    this.threatMeshes.set(threatId, mesh);
    this.activeThreats.push(threat);

    onLog({
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'ALERT',
      message: `AIR DEFENSE DRILL: Hostile target drone inbound! Radar and SAM batteries engaging.`,
    });

    return threat;
  }

  public spawnThreatWave(buildings: PlacedBuilding[], onLog: (entry: CombatLogEntry) => void) {
    const roll = Math.random();
    let type: Threat['type'] = 'drone_recon';
    let speed = 15;
    let altitude = 16;
    let name = 'Recon Drone';

    if (roll > 0.5 && roll <= 0.85) {
      type = 'cruise_missile';
      speed = 24;
      altitude = 12;
      name = 'Cruise Missile';
    } else if (roll > 0.85) {
      type = 'stealth_bomber';
      speed = 19;
      altitude = 22;
      name = 'Strike Bomber';
    }

    let targetX = 16;
    let targetZ = -8;
    let targetBuildingId: string | undefined;

    if (buildings.length > 0) {
      const defBld = buildings.find((b) => b.type === 'def_radar' || b.type === 'com_skyscraper');
      const targetBuilding = defBld || buildings[Math.floor(Math.random() * buildings.length)];
      targetX = targetBuilding.x;
      targetZ = targetBuilding.z;
      targetBuildingId = targetBuilding.id;
    }

    const threatId = `threat_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const originX = targetX - 135 + (Math.random() - 0.5) * 30;
    const originZ = targetZ - 115 + (Math.random() - 0.5) * 30;

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
      state: 'UNDETECTED',
      altitude,
      heading: Math.atan2(targetX - originX, targetZ - originZ),
      interceptorsInFlight: 0,
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
      message: `AIRSPACE ALERT: Hostile ${name} approaching from northwest sector!`,
    });
  }

  private createThreatMesh(type: Threat['type']): THREE.Group {
    const group = new THREE.Group();

    // Subtle red target marker ring so player can easily spot aerial threats
    const markerGeo = new THREE.RingGeometry(1.8, 2.3, 24);
    markerGeo.rotateX(-Math.PI / 2);
    const marker = new THREE.Mesh(
      markerGeo,
      new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
    );
    marker.position.y = -0.4;
    group.add(marker);

    if (type === 'cruise_missile') {
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 3.8, 10),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 })
      );
      body.rotateX(Math.PI / 2);
      group.add(body);

      const wings = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.08, 0.75),
        new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 })
      );
      group.add(wings);

      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.95, 10),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      tip.rotateX(-Math.PI / 2);
      tip.position.z = 2.35;
      group.add(tip);
    } else {
      const deltaGeo = new THREE.ConeGeometry(1.9, 3.6, 3);
      deltaGeo.rotateX(Math.PI / 2);
      const deltaMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45 });
      const drone = new THREE.Mesh(deltaGeo, deltaMat);
      drone.scale.set(1.4, 0.3, 1.0);
      group.add(drone);

      const nose = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      nose.position.set(0, 0.15, 1.3);
      group.add(nose);
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
