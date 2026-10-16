import * as THREE from 'three';
import { BuildingRenderer } from './BuildingRenderer';
import { soundManager } from '../audio/SoundManager';

export interface AircraftUnit {
  id: string;
  baseId: string;
  mesh: THREE.Group;
  state: 'PARKED' | 'TAXIING' | 'TAKEOFF_RUN' | 'CLIMBING' | 'CRUISING' | 'MISSION_FLIGHT' | 'LANDING';
  airbaseX: number;
  airbaseY: number;
  airbaseZ: number;
  airbaseRotation: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  progress: number;
  speed: number;
  altitude: number;
  heading: number;
  missionId?: string;
}

export class AirTrafficSystem {
  public group: THREE.Group;
  private renderer: BuildingRenderer;
  public aircraft: AircraftUnit[] = [];

  constructor(renderer: BuildingRenderer) {
    this.renderer = renderer;
    this.group = new THREE.Group();
  }

  public registerAirbase(baseId: string, x: number, y: number, z: number, rotation: number) {
    // Spawn 2 fighters per airbase: 1 parked on runway apron, 1 flying combat air patrol overhead
    for (let i = 0; i < 2; i++) {
      const jetMesh = this.renderer.createFighterJetMesh();
      const unitId = `jet_${baseId}_${i}`;

      const isPatrolJet = i === 1;
      const unit: AircraftUnit = {
        id: unitId,
        baseId,
        mesh: jetMesh,
        state: isPatrolJet ? 'CRUISING' : 'PARKED',
        airbaseX: x,
        airbaseY: y,
        airbaseZ: z,
        airbaseRotation: rotation,
        targetX: x,
        targetY: y + 26,
        targetZ: z,
        progress: 0,
        speed: 16,
        altitude: isPatrolJet ? 24 : 0.35,
        heading: isPatrolJet ? 0.8 : rotation,
      };

      if (isPatrolJet) {
        const orbitRadius = 42;
        jetMesh.position.set(
          x + Math.cos(unit.heading) * orbitRadius,
          24,
          z + Math.sin(unit.heading) * orbitRadius
        );
        jetMesh.rotation.y = -unit.heading + Math.PI / 2;
        jetMesh.rotation.z = -0.22;
      } else {
        // Parked on the runway threshold ready for scramble
        jetMesh.position.set(x - 6, y + 0.38, z + 3.2);
        jetMesh.rotation.y = rotation + Math.PI / 2;
      }

      this.group.add(jetMesh);
      this.aircraft.push(unit);
    }
  }

  public unregisterAirbase(baseId: string) {
    for (let i = this.aircraft.length - 1; i >= 0; i--) {
      if (this.aircraft[i].baseId === baseId) {
        this.group.remove(this.aircraft[i].mesh);
        this.aircraft.splice(i, 1);
      }
    }
  }

  public launchMission(missionId: string, targetX: number, targetZ: number): boolean {
    const available = this.aircraft.find((a) => a.state === 'PARKED' || a.state === 'CRUISING');
    if (!available) return false;

    available.missionId = missionId;
    available.targetX = targetX;
    available.targetY = 26;
    available.targetZ = targetZ;

    if (available.state === 'PARKED') {
      available.state = 'TAXIING';
      available.progress = 0;
      soundManager.playJetRoar();
    } else {
      available.state = 'MISSION_FLIGHT';
    }

    return true;
  }

  public update(delta: number) {
    for (let i = 0; i < this.aircraft.length; i++) {
      const jet = this.aircraft[i];

      switch (jet.state) {
        case 'PARKED':
          // Periodic routine combat air patrol scramble
          if (Math.random() < 0.002) {
            jet.state = 'TAXIING';
            jet.progress = 0;
            soundManager.playJetRoar();
          }
          break;

        case 'TAXIING':
          jet.progress += delta * 0.55;
          if (jet.progress >= 1.0) {
            jet.state = 'TAKEOFF_RUN';
            jet.progress = 0;
            jet.mesh.position.set(jet.airbaseX - 9, jet.airbaseY + 0.35, jet.airbaseZ + 3.2);
            jet.mesh.rotation.y = jet.airbaseRotation + Math.PI / 2;
          }
          break;

        case 'TAKEOFF_RUN': {
          jet.progress += delta * 1.25;
          const runDist = jet.progress * 18;
          jet.mesh.position.x = jet.airbaseX - 9 + runDist;

          if (jet.progress >= 1.0) {
            jet.state = 'CLIMBING';
            jet.progress = 0;
          }
          break;
        }

        case 'CLIMBING':
          jet.progress += delta * 0.4;
          jet.mesh.position.y = jet.airbaseY + 0.35 + jet.progress * 24;
          jet.mesh.position.x += delta * 22;
          jet.mesh.rotation.z = -0.28;

          if (jet.progress >= 1.0) {
            jet.mesh.rotation.z = 0;
            if (jet.missionId) {
              jet.state = 'MISSION_FLIGHT';
            } else {
              jet.state = 'CRUISING';
            }
          }
          break;

        case 'CRUISING': {
          // Fly scenic banking patrol circles around the airbase and coastline
          jet.heading += delta * 0.32;
          const orbitRadius = 46;
          jet.mesh.position.x = jet.airbaseX + Math.cos(jet.heading) * orbitRadius;
          jet.mesh.position.z = jet.airbaseZ + Math.sin(jet.heading) * orbitRadius;
          jet.mesh.position.y = 24 + Math.sin(jet.heading * 2) * 1.8;
          jet.mesh.rotation.y = -jet.heading + Math.PI / 2;
          jet.mesh.rotation.z = -0.22;

          if (Math.random() < 0.0005) {
            jet.state = 'LANDING';
            jet.progress = 0;
          }
          break;
        }

        case 'MISSION_FLIGHT': {
          const dx = jet.targetX - jet.mesh.position.x;
          const dz = jet.targetZ - jet.mesh.position.z;
          const dist = Math.hypot(dx, dz);

          const targetAngle = Math.atan2(dx, dz);
          jet.mesh.rotation.y = targetAngle;
          jet.mesh.rotation.z = 0;

          if (dist > 5) {
            const step = delta * 32;
            jet.mesh.position.x += Math.sin(targetAngle) * step;
            jet.mesh.position.z += Math.cos(targetAngle) * step;
          } else {
            soundManager.playExplosion();
            jet.state = 'LANDING';
            jet.progress = 0;
          }
          break;
        }

        case 'LANDING': {
          const lx = jet.airbaseX - jet.mesh.position.x;
          const lz = jet.airbaseZ + 3.2 - jet.mesh.position.z;
          const lDist = Math.hypot(lx, lz);

          if (lDist > 4) {
            const lAngle = Math.atan2(lx, lz);
            jet.mesh.rotation.y = lAngle;
            jet.mesh.position.x += Math.sin(lAngle) * delta * 20;
            jet.mesh.position.z += Math.cos(lAngle) * delta * 20;
            jet.mesh.position.y = Math.max(jet.airbaseY + 0.38, jet.mesh.position.y - delta * 5);
          } else {
            jet.state = 'PARKED';
            jet.missionId = undefined;
            jet.mesh.position.set(jet.airbaseX - 6, jet.airbaseY + 0.38, jet.airbaseZ + 3.2);
            jet.mesh.rotation.set(0, jet.airbaseRotation + Math.PI / 2, 0);
          }
          break;
        }
      }
    }
  }

  public getReadiness(): number {
    if (this.aircraft.length === 0) return 0;
    const ready = this.aircraft.filter((a) => a.state === 'PARKED' || a.state === 'CRUISING').length;
    return Math.round((ready / this.aircraft.length) * 100);
  }
}
