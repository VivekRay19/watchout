import * as THREE from 'three';
import { BuildingRenderer } from './BuildingRenderer';
import { soundManager } from '../audio/SoundManager';

export interface AircraftUnit {
  id: string;
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
    // Spawn 2 fighters per airbase
    for (let i = 0; i < 2; i++) {
      const jetMesh = this.renderer.createFighterJetMesh();
      const unitId = `jet_${baseId}_${i}`;

      const unit: AircraftUnit = {
        id: unitId,
        mesh: jetMesh,
        state: 'PARKED',
        airbaseX: x,
        airbaseY: y,
        airbaseZ: z,
        airbaseRotation: rotation,
        targetX: x,
        targetY: y + 30,
        targetZ: z,
        progress: 0,
        speed: 16,
        altitude: 0.3,
        heading: rotation,
      };

      // Parked position on airbase apron
      const offsetX = i === 0 ? -4 : 4;
      const offsetZ = 3;
      jetMesh.position.set(x + offsetX, y + 0.3, z + offsetZ);
      jetMesh.rotation.y = rotation;
      this.group.add(jetMesh);
      this.aircraft.push(unit);
    }
  }

  public launchMission(missionId: string, targetX: number, targetZ: number): boolean {
    // Find an available parked or cruising fighter
    const available = this.aircraft.find((a) => a.state === 'PARKED' || a.state === 'CRUISING');
    if (!available) return false;

    available.missionId = missionId;
    available.targetX = targetX;
    available.targetY = 28;
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
          // 5% chance every few seconds to run a routine combat air patrol
          if (Math.random() < 0.0008) {
            jet.state = 'TAXIING';
            jet.progress = 0;
            soundManager.playJetRoar();
          }
          break;

        case 'TAXIING':
          // Taxi from apron to runway threshold
          jet.progress += delta * 0.4;
          if (jet.progress >= 1.0) {
            jet.state = 'TAKEOFF_RUN';
            jet.progress = 0;
            jet.mesh.position.set(jet.airbaseX - 10, jet.airbaseY + 0.25, jet.airbaseZ);
            jet.mesh.rotation.y = jet.airbaseRotation + Math.PI / 2;
          }
          break;

        case 'TAKEOFF_RUN':
          // Accelerate down the runway
          jet.progress += delta * 1.2;
          const runDist = jet.progress * 22;
          jet.mesh.position.x = jet.airbaseX - 10 + runDist;

          if (jet.progress >= 1.0) {
            jet.state = 'CLIMBING';
            jet.progress = 0;
          }
          break;

        case 'CLIMBING':
          // Pitch up, gain speed and altitude
          jet.progress += delta * 0.35;
          jet.mesh.position.y = jet.airbaseY + 0.25 + jet.progress * 28;
          jet.mesh.position.x += delta * 25;
          jet.mesh.rotation.z = -0.3; // nose pitch up

          if (jet.progress >= 1.0) {
            jet.mesh.rotation.z = 0;
            if (jet.missionId) {
              jet.state = 'MISSION_FLIGHT';
            } else {
              jet.state = 'CRUISING';
            }
          }
          break;

        case 'CRUISING':
          // Fly wide scenic banking circles around the city
          jet.heading += delta * 0.25;
          const orbitRadius = 90;
          jet.mesh.position.x = jet.airbaseX + Math.cos(jet.heading) * orbitRadius;
          jet.mesh.position.z = jet.airbaseZ + Math.sin(jet.heading) * orbitRadius;
          jet.mesh.position.y = 26 + Math.sin(jet.heading * 2) * 2;
          jet.mesh.rotation.y = -jet.heading + Math.PI / 2;
          jet.mesh.rotation.z = -0.2; // banking roll

          // After some time, return to base
          if (Math.random() < 0.0005) {
            jet.state = 'LANDING';
            jet.progress = 0;
          }
          break;

        case 'MISSION_FLIGHT':
          // Fly straight towards target coordinates
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
            // Reached mission objective! Bombard / strike, then return to base
            soundManager.playExplosion();
            jet.state = 'LANDING';
            jet.progress = 0;
          }
          break;

        case 'LANDING':
          // Descend onto runway approach glide slope
          const lx = jet.airbaseX - jet.mesh.position.x;
          const lz = jet.airbaseZ - jet.mesh.position.z;
          const lDist = Math.hypot(lx, lz);

          if (lDist > 4) {
            const lAngle = Math.atan2(lx, lz);
            jet.mesh.rotation.y = lAngle;
            jet.mesh.position.x += Math.sin(lAngle) * delta * 20;
            jet.mesh.position.z += Math.cos(lAngle) * delta * 20;
            jet.mesh.position.y = Math.max(jet.airbaseY + 0.3, jet.mesh.position.y - delta * 5);
          } else {
            // Touchdown and reset to parked
            jet.state = 'PARKED';
            jet.missionId = undefined;
            jet.mesh.position.set(jet.airbaseX - 4, jet.airbaseY + 0.3, jet.airbaseZ + 3);
            jet.mesh.rotation.set(0, jet.airbaseRotation, 0);
          }
          break;
      }
    }
  }

  public getReadiness(): number {
    if (this.aircraft.length === 0) return 0;
    const ready = this.aircraft.filter((a) => a.state === 'PARKED' || a.state === 'CRUISING').length;
    return Math.round((ready / this.aircraft.length) * 100);
  }
}
