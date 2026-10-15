import * as THREE from 'three';
import { RoadSystem } from './RoadSystem';
import { RoadNode } from '../types/game';

interface Vehicle {
  mesh: THREE.Group;
  currentNode: RoadNode;
  targetNode: RoadNode;
  progress: number;
  speed: number;
  headlights: THREE.Mesh[];
  taillights: THREE.Mesh[];
}

export class TrafficSystem {
  public group: THREE.Group;
  private roadSystem: RoadSystem;
  private vehicles: Vehicle[] = [];
  private maxVehicles = 25;
  private carColors = [0xef4444, 0x3b82f6, 0xe2e8f0, 0x1f2937, 0xf59e0b, 0x10b981];

  constructor(roadSystem: RoadSystem) {
    this.roadSystem = roadSystem;
    this.group = new THREE.Group();
  }

  public update(delta: number, isNight: boolean) {
    // If not enough vehicles and road network has at least 2 connected nodes, spawn
    if (this.vehicles.length < this.maxVehicles && Math.random() < 0.05) {
      this.trySpawnVehicle();
    }

    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      const n1 = v.currentNode;
      const n2 = v.targetNode;

      const dist = Math.hypot(n2.x - n1.x, n2.z - n1.z);
      if (dist < 0.1) {
        this.advanceVehicle(v);
        continue;
      }

      v.progress += (v.speed * delta) / dist;

      if (v.progress >= 1.0) {
        this.advanceVehicle(v);
      } else {
        const x = THREE.MathUtils.lerp(n1.x, n2.x, v.progress);
        const y = THREE.MathUtils.lerp(n1.elevation, n2.elevation, v.progress) + 0.15;
        const z = THREE.MathUtils.lerp(n1.z, n2.z, v.progress);

        v.mesh.position.set(x, y, z);
        const angle = Math.atan2(n2.x - n1.x, n2.z - n1.z);
        v.mesh.rotation.y = angle;
      }

      // Headlight brightness at night
      v.headlights.forEach((h) => {
        (h.material as THREE.MeshBasicMaterial).color.setHex(isNight ? 0xfffae6 : 0x475569);
      });
      v.taillights.forEach((t) => {
        (t.material as THREE.MeshBasicMaterial).color.setHex(isNight ? 0xef4444 : 0x7f1d1d);
      });
    }
  }

  private advanceVehicle(v: Vehicle) {
    v.progress = 0;
    v.currentNode = v.targetNode;

    const nextIds = v.targetNode.connectedTo;
    if (nextIds.length === 0) {
      // Dead end, despawn
      this.group.remove(v.mesh);
      const idx = this.vehicles.indexOf(v);
      if (idx !== -1) this.vehicles.splice(idx, 1);
      return;
    }

    // Pick a random connected node
    const nextId = nextIds[Math.floor(Math.random() * nextIds.length)];
    const nextNode = this.roadSystem.nodes.get(nextId);
    if (!nextNode) {
      this.group.remove(v.mesh);
      const idx = this.vehicles.indexOf(v);
      if (idx !== -1) this.vehicles.splice(idx, 1);
      return;
    }
    v.targetNode = nextNode;
  }

  private trySpawnVehicle() {
    const node = this.roadSystem.getRandomNode();
    if (!node || node.connectedTo.length === 0) return;

    const targetId = node.connectedTo[Math.floor(Math.random() * node.connectedTo.length)];
    const targetNode = this.roadSystem.nodes.get(targetId);
    if (!targetNode) return;

    const mesh = new THREE.Group();
    const color = this.carColors[Math.floor(Math.random() * this.carColors.length)];

    // Car Body
    const bodyGeo = new THREE.BoxGeometry(0.9, 0.45, 1.8);
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.25;
    body.castShadow = true;
    mesh.add(body);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(0.75, 0.35, 0.9);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.2, metalness: 0.8 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 0.55, -0.15);
    mesh.add(cabin);

    // Headlights
    const hMat = new THREE.MeshBasicMaterial({ color: 0xfffae6 });
    const hGeo = new THREE.PlaneGeometry(0.18, 0.12);
    hGeo.rotateX(Math.PI / 2);
    const hl1 = new THREE.Mesh(hGeo, hMat);
    hl1.position.set(-0.3, 0.25, 0.91);
    const hl2 = new THREE.Mesh(hGeo, hMat);
    hl2.position.set(0.3, 0.25, 0.91);
    mesh.add(hl1, hl2);

    // Taillights
    const tMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tl1 = new THREE.Mesh(hGeo, tMat);
    tl1.position.set(-0.3, 0.25, -0.91);
    const tl2 = new THREE.Mesh(hGeo, tMat);
    tl2.position.set(0.3, 0.25, -0.91);
    mesh.add(tl1, tl2);

    mesh.position.set(node.x, node.elevation + 0.15, node.z);
    this.group.add(mesh);

    this.vehicles.push({
      mesh,
      currentNode: node,
      targetNode,
      progress: 0,
      speed: 6.0 + Math.random() * 4.0,
      headlights: [hl1, hl2],
      taillights: [tl1, tl2],
    });
  }
}
