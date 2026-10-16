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
  public vehicles: Vehicle[] = [];
  private maxVehicles = 36;
  // Bright, cohesive vehicle colors matching reference image (coral red, taxi yellow, sky blue, white, orange, green)
  private carColors = [0xef4444, 0xfacc15, 0x3b82f6, 0xf8fafc, 0xf97316, 0x22c55e];

  constructor(roadSystem: RoadSystem) {
    this.roadSystem = roadSystem;
    this.group = new THREE.Group();
  }

  public seedTraffic(count = 22) {
    for (let i = 0; i < count; i++) {
      this.trySpawnVehicle(0.15 + ((i * 0.19) % 0.7));
    }
    this.update(0.01, false);
  }

  public update(delta: number, isNight: boolean) {
    if (this.vehicles.length < this.maxVehicles && Math.random() < 0.08) {
      this.trySpawnVehicle();
    }

    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      const n1 = v.currentNode;
      const n2 = v.targetNode;

      const dx = n2.x - n1.x;
      const dz = n2.z - n1.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.1) {
        this.advanceVehicle(v);
        continue;
      }

      v.progress += (v.speed * delta) / dist;

      if (v.progress >= 1.0) {
        this.advanceVehicle(v);
      } else {
        const angle = Math.atan2(dx, dz);
        // Right-hand lane offset so cars drive neatly on their side of the dashed centerline
        const laneOffset = 0.72;
        const rightX = -Math.cos(angle) * laneOffset;
        const rightZ = Math.sin(angle) * laneOffset;

        const x = THREE.MathUtils.lerp(n1.x, n2.x, v.progress) + rightX;
        const y = THREE.MathUtils.lerp(n1.elevation, n2.elevation, v.progress) + 0.1;
        const z = THREE.MathUtils.lerp(n1.z, n2.z, v.progress) + rightZ;

        v.mesh.position.set(x, y, z);
        v.mesh.rotation.y = angle;
      }

      v.headlights.forEach((h) => {
        (h.material as THREE.MeshBasicMaterial).color.setHex(isNight ? 0xfffae6 : 0xf8fafc);
      });
      v.taillights.forEach((t) => {
        (t.material as THREE.MeshBasicMaterial).color.setHex(isNight ? 0xef4444 : 0xdc2626);
      });
    }
  }

  private advanceVehicle(v: Vehicle) {
    const prevNodeId = v.currentNode.id;
    v.progress = 0;
    v.currentNode = v.targetNode;

    const nextIds = v.targetNode.connectedTo;
    if (nextIds.length === 0) {
      this.group.remove(v.mesh);
      const idx = this.vehicles.indexOf(v);
      if (idx !== -1) this.vehicles.splice(idx, 1);
      return;
    }

    // Prefer continuing forward rather than immediately U-turning if other roads exist
    const forwardIds = nextIds.length > 1 ? nextIds.filter((id) => id !== prevNodeId) : nextIds;
    const nextId = forwardIds[Math.floor(Math.random() * forwardIds.length)];
    const nextNode = this.roadSystem.nodes.get(nextId);
    if (!nextNode) {
      this.group.remove(v.mesh);
      const idx = this.vehicles.indexOf(v);
      if (idx !== -1) this.vehicles.splice(idx, 1);
      return;
    }
    v.targetNode = nextNode;
  }

  private trySpawnVehicle(initialProgress = 0) {
    const node = this.roadSystem.getRandomNode();
    if (!node || node.connectedTo.length === 0) return;

    const targetId = node.connectedTo[Math.floor(Math.random() * node.connectedTo.length)];
    const targetNode = this.roadSystem.nodes.get(targetId);
    if (!targetNode) return;

    const mesh = new THREE.Group();
    const isTruck = Math.random() < 0.22;
    const color = this.carColors[Math.floor(Math.random() * this.carColors.length)];

    if (isTruck) {
      // Cute Low-Poly Delivery Truck
      const cab = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.75, 0.9),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })
      );
      cab.position.set(0, 0.42, 0.7);
      cab.castShadow = true;
      mesh.add(cab);

      const cargo = new THREE.Mesh(
        new THREE.BoxGeometry(0.98, 0.95, 1.8),
        new THREE.MeshStandardMaterial({ color, roughness: 0.55 })
      );
      cargo.position.set(0, 0.52, -0.55);
      cargo.castShadow = true;
      mesh.add(cargo);
    } else {
      // Cute Low-Poly Sedan
      const bodyGeo = new THREE.BoxGeometry(0.88, 0.42, 1.75);
      const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.1 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.24;
      body.castShadow = true;
      mesh.add(body);

      const cabinGeo = new THREE.BoxGeometry(0.76, 0.34, 0.92);
      const cabinMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.25, metalness: 0.2 });
      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.set(0, 0.54, -0.1);
      mesh.add(cabin);
    }

    const hMat = new THREE.MeshBasicMaterial({ color: 0xfffae6 });
    const hGeo = new THREE.BoxGeometry(0.18, 0.12, 0.04);
    const hl1 = new THREE.Mesh(hGeo, hMat);
    hl1.position.set(-0.28, 0.26, isTruck ? 1.16 : 0.89);
    const hl2 = new THREE.Mesh(hGeo, hMat);
    hl2.position.set(0.28, 0.26, isTruck ? 1.16 : 0.89);
    mesh.add(hl1, hl2);

    const tMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tl1 = new THREE.Mesh(hGeo, tMat);
    tl1.position.set(-0.28, 0.26, isTruck ? -1.46 : -0.89);
    const tl2 = new THREE.Mesh(hGeo, tMat);
    tl2.position.set(0.28, 0.26, isTruck ? -1.46 : -0.89);
    mesh.add(tl1, tl2);

    mesh.position.set(node.x, node.elevation + 0.1, node.z);
    this.group.add(mesh);

    this.vehicles.push({
      mesh,
      currentNode: node,
      targetNode,
      progress: initialProgress,
      speed: 5.5 + Math.random() * 3.5,
      headlights: [hl1, hl2],
      taillights: [tl1, tl2],
    });
  }
}
