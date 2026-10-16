import * as THREE from 'three';
import { BuildingRenderer } from './BuildingRenderer';
import { soundManager } from '../audio/SoundManager';

export type FighterClass = 'interceptor' | 'multirole' | 'stealth';

export type FlightStage =
  | 'PARKED'
  | 'TAXIING'
  | 'TAKEOFF'
  | 'CLIMB'
  | 'EN_ROUTE'
  | 'ENGAGING'
  | 'RETURNING'
  | 'APPROACH'
  | 'LANDING';

export interface AircraftUnit {
  id: string;
  baseId: string;
  fighterClass: FighterClass;
  mesh: THREE.Group;
  state: FlightStage;
  airbaseX: number;
  airbaseY: number;
  airbaseZ: number;
  airbaseRotation: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  progress: number;
  speed: number;
  maxSpeed: number;
  altitude: number;
  heading: number;
  pitch: number;
  roll: number;
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
    const fighterClasses: FighterClass[] = ['interceptor', 'multirole', 'stealth'];

    // Spawn 3 fighter aircraft representing the 3 tactical classes
    for (let i = 0; i < 3; i++) {
      const fClass = fighterClasses[i];
      const jetMesh = this.renderer.createFighterJetMesh();
      const unitId = `jet_${baseId}_${fClass}_${i}`;

      // Distinguish colors/accents based on class
      if (fClass === 'stealth') {
        jetMesh.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material) {
            (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
              color: 0x1e293b,
              roughness: 0.4,
              metalness: 0.8,
            });
          }
        });
      } else if (fClass === 'interceptor') {
        jetMesh.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material) {
            (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
              color: 0xe2e8f0,
              roughness: 0.5,
              metalness: 0.1,
            });
          }
        });
      }

      const isPatrolJet = i === 1;
      const unit: AircraftUnit = {
        id: unitId,
        baseId,
        fighterClass: fClass,
        mesh: jetMesh,
        state: isPatrolJet ? 'EN_ROUTE' : 'PARKED',
        airbaseX: x,
        airbaseY: y,
        airbaseZ: z,
        airbaseRotation: rotation,
        targetX: x,
        targetY: y + 26,
        targetZ: z,
        progress: 0,
        speed: fClass === 'interceptor' ? 24 : fClass === 'stealth' ? 28 : 20,
        maxSpeed: fClass === 'interceptor' ? 32 : fClass === 'stealth' ? 36 : 26,
        altitude: isPatrolJet ? 26 : 0.35,
        heading: isPatrolJet ? 0.8 : rotation,
        pitch: 0,
        roll: 0,
      };

      if (isPatrolJet) {
        const orbitRadius = 45;
        jetMesh.position.set(
          x + Math.cos(unit.heading) * orbitRadius,
          26,
          z + Math.sin(unit.heading) * orbitRadius
        );
        jetMesh.rotation.y = -unit.heading + Math.PI / 2;
        jetMesh.rotation.z = -0.22;
      } else {
        // Parked on the runway apron slots
        const slotOffset = (i - 1) * 3.2;
        jetMesh.position.set(x - 6 + slotOffset, y + 0.38, z + 3.2);
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
    const available = this.aircraft.find((a) => a.state === 'PARKED' || a.state === 'EN_ROUTE');
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
      available.state = 'ENGAGING';
    }

    return true;
  }

  public update(delta: number) {
    for (let i = 0; i < this.aircraft.length; i++) {
      const jet = this.aircraft[i];

      switch (jet.state) {
        case 'PARKED':
          // Periodic routine combat air patrol scramble
          if (Math.random() < 0.0015) {
            jet.state = 'TAXIING';
            jet.progress = 0;
            soundManager.playJetRoar();
          }
          break;

        case 'TAXIING':
          jet.progress += delta * 0.45;
          if (jet.progress >= 1.0) {
            jet.state = 'TAKEOFF';
            jet.progress = 0;
            jet.mesh.position.set(jet.airbaseX - 10, jet.airbaseY + 0.35, jet.airbaseZ + 3.2);
            jet.mesh.rotation.y = jet.airbaseRotation + Math.PI / 2;
            jet.mesh.rotation.z = 0;
            jet.mesh.rotation.x = 0;
          }
          break;

        case 'TAKEOFF': {
          jet.progress += delta * 1.1;
          const runDist = jet.progress * 22;
          jet.mesh.position.x = jet.airbaseX - 10 + runDist;

          if (jet.progress >= 1.0) {
            jet.state = 'CLIMB';
            jet.progress = 0;
          }
          break;
        }

        case 'CLIMB':
          jet.progress += delta * 0.35;
          jet.altitude = 0.35 + jet.progress * 26;
          jet.mesh.position.y = jet.airbaseY + jet.altitude;
          jet.mesh.position.x += delta * jet.speed;
          // Pitch up during climb
          jet.mesh.rotation.z = -0.32;

          if (jet.progress >= 1.0) {
            jet.mesh.rotation.z = 0;
            if (jet.missionId) {
              jet.state = 'ENGAGING';
            } else {
              jet.state = 'EN_ROUTE';
            }
          }
          break;

        case 'EN_ROUTE': {
          // Bank-to-turn combat air patrol pattern
          jet.heading += delta * 0.28;
          const orbitRadius = 48;
          jet.mesh.position.x = jet.airbaseX + Math.cos(jet.heading) * orbitRadius;
          jet.mesh.position.z = jet.airbaseZ + Math.sin(jet.heading) * orbitRadius;
          jet.mesh.position.y = 26 + Math.sin(jet.heading * 2) * 1.5;
          jet.mesh.rotation.y = -jet.heading + Math.PI / 2;
          jet.mesh.rotation.z = -0.24; // Inward bank

          if (Math.random() < 0.0004) {
            jet.state = 'RETURNING';
            jet.progress = 0;
          }
          break;
        }

        case 'ENGAGING': {
          const dx = jet.targetX - jet.mesh.position.x;
          const dz = jet.targetZ - jet.mesh.position.z;
          const dist = Math.hypot(dx, dz);
          const targetAngle = Math.atan2(dx, dz);

          jet.mesh.rotation.y = targetAngle;
          jet.mesh.rotation.z = 0;

          if (dist > 6) {
            const step = delta * jet.maxSpeed;
            jet.mesh.position.x += Math.sin(targetAngle) * step;
            jet.mesh.position.z += Math.cos(targetAngle) * step;
          } else {
            soundManager.playExplosion();
            jet.state = 'RETURNING';
            jet.progress = 0;
          }
          break;
        }

        case 'RETURNING': {
          const dx = jet.airbaseX - jet.mesh.position.x;
          const dz = jet.airbaseZ + 3.2 - jet.mesh.position.z;
          const dist = Math.hypot(dx, dz);
          const angle = Math.atan2(dx, dz);

          jet.mesh.rotation.y = angle;
          const step = delta * jet.speed;
          jet.mesh.position.x += Math.sin(angle) * step;
          jet.mesh.position.z += Math.cos(angle) * step;

          if (dist < 45) {
            jet.state = 'APPROACH';
            jet.progress = 0;
          }
          break;
        }

        case 'APPROACH': {
          const dx = jet.airbaseX - jet.mesh.position.x;
          const dz = jet.airbaseZ + 3.2 - jet.mesh.position.z;
          const dist = Math.hypot(dx, dz);
          const angle = Math.atan2(dx, dz);

          jet.mesh.rotation.y = angle;
          jet.mesh.position.x += Math.sin(angle) * delta * 16;
          jet.mesh.position.z += Math.cos(angle) * delta * 16;
          jet.mesh.position.y = Math.max(jet.airbaseY + 4.5, jet.mesh.position.y - delta * 6.5);

          if (dist < 12) {
            jet.state = 'LANDING';
            jet.progress = 0;
          }
          break;
        }

        case 'LANDING': {
          const dx = jet.airbaseX - jet.mesh.position.x;
          const dz = jet.airbaseZ + 3.2 - jet.mesh.position.z;
          const dist = Math.hypot(dx, dz);

          if (dist > 3) {
            const angle = Math.atan2(dx, dz);
            jet.mesh.rotation.y = angle;
            jet.mesh.position.x += Math.sin(angle) * delta * 12;
            jet.mesh.position.z += Math.cos(angle) * delta * 12;
            jet.mesh.position.y = Math.max(jet.airbaseY + 0.38, jet.mesh.position.y - delta * 4);
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
    const ready = this.aircraft.filter((a) => a.state === 'PARKED' || a.state === 'EN_ROUTE').length;
    return Math.round((ready / this.aircraft.length) * 100);
  }
}
