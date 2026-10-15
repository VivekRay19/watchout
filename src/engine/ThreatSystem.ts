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
  private spawnInterval = 38000; // spawn enemy incursion every ~38s
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
    if (threatLevel === 'ELEVATED') interval = 30000;
    if (threatLevel === 'HIGH') interval = 22000;
    if (threatLevel === 'CRITICAL') interval = 16000;

    if (now - this.lastSpawnTime > interval) {
      this.lastSpawnTime = now;
      this.spawnThreatWave(buildings, onLog);
    }

    // Move active threats
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

      if (dist < 4.0 || t.y <= 0) {
        // Threat reached target - IMPACT!
        t.state = 'IMPACTED';
        this.particles.spawnExplosion(t.x, Math.max(1, t.y), t.z, 85);
        soundManager.playExplosion();
        soundManager.playSiren();

        if (t.targetBuildingId) {
          const damage = t.type === 'cruise_missile' ? 380 : 200;
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
      t.y = Math.max(2.5, t.y - delta * 1.2);

      if (mesh) {
        mesh.position.set(t.x, t.y, t.z);
        mesh.rotation.y = angle;
      }

      // Engine smoke/fire trail
      this.particles.spawnSmokePuff(t.x, t.y, t.z, 0xef4444);
    }
  }

  // Scripted training encounter for Step 6 of the onboarding tutorial
  public spawnScriptedTrainingThreat(buildings: PlacedBuilding[], onLog: (entry: CombatLogEntry) => void): Threat {
    let targetX = 0;
    let targetZ = 0;
    let targetBuildingId: string | undefined;

    if (buildings.length > 0) {
      const b = buildings[0];
      targetX = b.x;
      targetZ = b.z;
      targetBuildingId = b.id;
    }

    const threatId = `threat_tutorial_${Date.now()}`;
    const originX = -110;
    const originZ = -100;
    const altitude = 14;

    const threat: Threat = {
      id: threatId,
      name: 'Training Drone (Target Drone)',
      type: 'drone_recon',
      x: originX,
      y: altitude,
      z: originZ,
      targetX,
      targetZ,
      targetBuildingId,
      speed: 12, // Slow, predictable target for tutorial demonstration
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
      message: `TRAINING EXERCISE: Simulated hostile recon drone inbound from Sector West. Observe radar detection & SAM interception!`,
    });

    return threat;
  }

  private spawnThreatWave(buildings: PlacedBuilding[], onLog: (entry: CombatLogEntry) => void) {
    const roll = Math.random();
    let type: Threat['type'] = 'drone_recon';
    let speed = 15;
    let altitude = 16;
    let name = 'Hostile Shahed Recon Drone';

    if (roll > 0.45 && roll <= 0.8) {
      type = 'cruise_missile';
      speed = 34;
      altitude = 8;
      name = 'Kalibr Low-Altitude Cruise Missile';
    } else if (roll > 0.8) {
      type = 'stealth_bomber';
      speed = 22;
      altitude = 28;
      name = 'Tu-160 Heavy Strike Incursion';
    }

    let targetX = 0;
    let targetZ = 0;
    let targetBuildingId: string | undefined;

    if (buildings.length > 0) {
      const highValue = buildings.find(
        (b) => b.type === 'util_power_plant' || b.type === 'mil_hq' || b.type === 'ind_factory'
      );
      const targetBuilding = highValue || buildings[Math.floor(Math.random() * buildings.length)];
      targetX = targetBuilding.x;
      targetZ = targetBuilding.z;
      targetBuildingId = targetBuilding.id;
    }

    const threatId = `threat_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const originX = this.enemyBasePos.x + (Math.random() - 0.5) * 45;
    const originZ = this.enemyBasePos.z + (Math.random() - 0.5) * 45;

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
      message: `INTRUSION ALERT: Unknown hostile contact launched from Sector Charlie!`,
    });
  }

  private createThreatMesh(type: Threat['type']): THREE.Group {
    const group = new THREE.Group();

    if (type === 'cruise_missile') {
      // Cylindrical cruise missile body
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 3.8, 10),
        new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.35, metalness: 0.6 })
      );
      body.rotateX(Math.PI / 2);
      group.add(body);

      // Folding wings
      const wings = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.06, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.5 })
      );
      group.add(wings);

      // Warhead radome
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.24, 0.9, 10),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      tip.rotateX(-Math.PI / 2);
      tip.position.z = 2.35;
      group.add(tip);

      // Rocket engine glow
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.8, 8),
        new THREE.MeshBasicMaterial({ color: 0xf97316 })
      );
      flame.rotateX(Math.PI / 2);
      flame.position.z = -2.3;
      group.add(flame);
    } else {
      // Delta-wing stealth drone
      const deltaGeo = new THREE.ConeGeometry(1.8, 3.6, 3);
      deltaGeo.rotateX(Math.PI / 2);
      const deltaMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.5 });
      const drone = new THREE.Mesh(deltaGeo, deltaMat);
      drone.scale.set(1.5, 0.28, 1.0);
      group.add(drone);

      // Glowing red sensor eye
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
      );
      eye.position.set(0, 0.16, 1.4);
      group.add(eye);

      // Pusher propeller engine
      const prop = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.08, 0.04),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      prop.position.set(0, 0, -1.8);
      group.add(prop);
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
