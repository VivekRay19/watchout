import * as THREE from 'three';
import { RoadSystem } from './RoadSystem';
import { RoadNode } from '../types/game';

export type VehicleCategory = 'sedan' | 'taxi' | 'van' | 'cargo_truck' | 'bus' | 'military_truck';

export interface Vehicle {
  id: string;
  category: VehicleCategory;
  mesh: THREE.Group;
  currentNode: RoadNode;
  targetNode: RoadNode;
  route: RoadNode[];
  progress: number;
  baseSpeed: number;
  currentSpeed: number;
  heading: number;
  length: number;
  headlights: THREE.Mesh[];
  taillights: THREE.Mesh[];
  wheels: THREE.Mesh[];
}

export class TrafficSystem {
  public group: THREE.Group;
  private roadSystem: RoadSystem;
  public vehicles: Vehicle[] = [];
  private maxVehicles = 40;
  public congestionLevel: number = 14;

  // Bright, cohesive vehicle colors matching reference image
  private sedanColors = [0xef4444, 0x3b82f6, 0xf8fafc, 0x22c55e, 0xf97316, 0x06b6d4];
  private wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

  constructor(roadSystem: RoadSystem) {
    this.roadSystem = roadSystem;
    this.group = new THREE.Group();
  }

  public seedTraffic(count = 26) {
    for (let i = 0; i < count; i++) {
      this.trySpawnVehicle(0.1 + ((i * 0.17) % 0.78));
    }
    this.update(0.016, 0);
  }

  // Shortest-path route finding across connected road graph
  private findRoute(start: RoadNode, goal: RoadNode): RoadNode[] {
    if (start.id === goal.id) return [];
    const queue: RoadNode[][] = [[start]];
    const visited = new Set<string>([start.id]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const last = path[path.length - 1];
      if (last.id === goal.id) {
        return path.slice(1);
      }
      if (path.length > 14) continue;

      for (const nextId of last.connectedTo) {
        if (!visited.has(nextId)) {
          visited.add(nextId);
          const nextNode = this.roadSystem.nodes.get(nextId);
          if (nextNode) {
            queue.push([...path, nextNode]);
          }
        }
      }
    }
    return [];
  }

  public update(delta: number, nightFactor: number) {
    if (this.vehicles.length < this.maxVehicles && Math.random() < 0.12) {
      this.trySpawnVehicle();
    }

    let stoppedOrSlowCount = 0;

    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      const n1 = v.currentNode;
      const n2 = v.targetNode;

      // Validate that the segment still exists
      if (!this.roadSystem.nodes.has(n1.id) || !this.roadSystem.nodes.has(n2.id)) {
        this.despawnVehicle(i);
        continue;
      }

      const dx = n2.x - n1.x;
      const dz = n2.z - n1.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.1) {
        this.advanceVehicle(v, i);
        continue;
      }

      // Road-type speed multiplier
      const seg = this.roadSystem.getSegmentBetween(n1.id, n2.id);
      const roadSpeedMult =
        seg?.type === 'road_highway' || seg?.type === 'road_bridge' ? 1.28 : 1.0;
      let desiredSpeed = v.baseSpeed * roadSpeedMult;

      // 1. Check traffic signal at upcoming intersection
      const distToEnd = (1 - v.progress) * dist;
      if (distToEnd < 4.5 && distToEnd > 1.8) {
        if (!this.roadSystem.canProceedThroughIntersection(n1, n2)) {
          desiredSpeed = 0;
        }
      }

      // 2. Maintain safe following distance behind any vehicle ahead on the same lane
      const minGap = v.length + 1.8;
      for (let j = 0; j < this.vehicles.length; j++) {
        if (i === j) continue;
        const other = this.vehicles[j];
        if (other.currentNode.id === n1.id && other.targetNode.id === n2.id) {
          if (other.progress > v.progress) {
            const gapMeters = (other.progress - v.progress) * dist;
            if (gapMeters < minGap) {
              desiredSpeed = 0;
              break;
            } else if (gapMeters < minGap + 2.5) {
              desiredSpeed = Math.min(desiredSpeed, other.currentSpeed * 0.85);
            }
          }
        }
      }

      // Smooth acceleration / braking
      v.currentSpeed = THREE.MathUtils.lerp(v.currentSpeed, desiredSpeed, Math.min(1, delta * 9));
      if (v.currentSpeed < v.baseSpeed * 0.35) {
        stoppedOrSlowCount++;
      }

      v.progress += (v.currentSpeed * delta) / dist;

      // Spin wheels proportional to speed
      v.wheels.forEach((w) => {
        w.rotation.x += v.currentSpeed * delta * 2.4;
      });

      if (v.progress >= 1.0) {
        this.advanceVehicle(v, i);
      } else {
        const targetAngle = Math.atan2(dx, dz);
        // Smooth cornering rotation
        let angleDiff = targetAngle - v.heading;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        v.heading += angleDiff * Math.min(1, delta * 14);

        // Right-hand lane offset
        const laneOffset = seg?.type === 'road_highway' || seg?.type === 'road_bridge' ? 0.92 : 0.74;
        const rightX = -Math.cos(targetAngle) * laneOffset;
        const rightZ = Math.sin(targetAngle) * laneOffset;

        const x = THREE.MathUtils.lerp(n1.x, n2.x, v.progress) + rightX;
        const y = THREE.MathUtils.lerp(n1.elevation, n2.elevation, v.progress) + 0.09;
        const z = THREE.MathUtils.lerp(n1.z, n2.z, v.progress) + rightZ;

        v.mesh.position.set(x, y, z);
        v.mesh.rotation.y = v.heading;

        // Align pitch with bridge/hill slope
        const dy = n2.elevation - n1.elevation;
        v.mesh.rotation.x = -Math.atan2(dy, dist);
      }

      const isNight = nightFactor > 0.45;
      const isBraking = v.currentSpeed < 0.8;
      v.headlights.forEach((h) => {
        (h.material as THREE.MeshBasicMaterial).color.setHex(isNight ? 0xfffae6 : 0xf8fafc);
      });
      v.taillights.forEach((t) => {
        (t.material as THREE.MeshBasicMaterial).color.setHex(
          isBraking || isNight ? 0xff2222 : 0xb91c1c
        );
      });
    }

    // Update live traffic congestion metric (0..100)
    const ratio = this.vehicles.length > 0 ? stoppedOrSlowCount / this.vehicles.length : 0;
    this.congestionLevel = Math.round(
      THREE.MathUtils.clamp(8 + ratio * 65 + (this.vehicles.length / this.maxVehicles) * 18, 5, 95)
    );
  }

  private despawnVehicle(index: number) {
    const v = this.vehicles[index];
    if (v) {
      this.group.remove(v.mesh);
      this.vehicles.splice(index, 1);
    }
  }

  private advanceVehicle(v: Vehicle, index: number) {
    const prevNodeId = v.currentNode.id;
    v.progress = 0;
    v.currentNode = v.targetNode;

    // Follow planned route if available
    if (v.route.length > 0) {
      const nextRouteNode = v.route.shift()!;
      if (
        this.roadSystem.nodes.has(nextRouteNode.id) &&
        v.currentNode.connectedTo.includes(nextRouteNode.id)
      ) {
        v.targetNode = nextRouteNode;
        return;
      }
      v.route = [];
    }

    // Pick a new destination node across the city and compute a fresh route
    const randomGoal = this.roadSystem.getRandomNode();
    if (randomGoal && randomGoal.id !== v.currentNode.id) {
      const newRoute = this.findRoute(v.currentNode, randomGoal);
      if (newRoute.length > 0) {
        v.targetNode = newRoute.shift()!;
        v.route = newRoute;
        return;
      }
    }

    // Fallback to immediate connected neighbor
    const nextIds = v.currentNode.connectedTo;
    if (nextIds.length === 0) {
      this.despawnVehicle(index);
      return;
    }

    const forwardIds = nextIds.length > 1 ? nextIds.filter((id) => id !== prevNodeId) : nextIds;
    const nextId = forwardIds[Math.floor(Math.random() * forwardIds.length)];
    const nextNode = this.roadSystem.nodes.get(nextId);
    if (!nextNode) {
      this.despawnVehicle(index);
      return;
    }
    v.targetNode = nextNode;
  }

  private addWheels(mesh: THREE.Group, halfWidth: number, zPositions: number[]): THREE.Mesh[] {
    const wheels: THREE.Mesh[] = [];
    const wheelGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.12, 8);
    wheelGeo.rotateZ(Math.PI / 2);
    for (const wz of zPositions) {
      for (const side of [-1, 1]) {
        const w = new THREE.Mesh(wheelGeo, this.wheelMat);
        w.position.set(side * halfWidth, 0.16, wz);
        mesh.add(w);
        wheels.push(w);
      }
    }
    return wheels;
  }

  private trySpawnVehicle(initialProgress = 0) {
    const startNode = this.roadSystem.getRandomNode();
    if (!startNode || startNode.connectedTo.length === 0) return;

    const goalNode = this.roadSystem.getRandomNode();
    let route = goalNode ? this.findRoute(startNode, goalNode) : [];
    let targetNode: RoadNode | undefined;

    if (route.length > 0) {
      targetNode = route.shift();
    } else {
      const targetId =
        startNode.connectedTo[Math.floor(Math.random() * startNode.connectedTo.length)];
      targetNode = this.roadSystem.nodes.get(targetId);
    }
    if (!targetNode) return;

    // Avoid spawning directly on top of another vehicle on the same segment
    const segDist = Math.hypot(targetNode.x - startNode.x, targetNode.z - startNode.z);
    for (const existing of this.vehicles) {
      if (existing.currentNode.id === startNode.id && existing.targetNode.id === targetNode.id) {
        if (Math.abs(existing.progress - initialProgress) * segDist < 3.5) {
          return;
        }
      }
    }

    const roll = Math.random();
    let category: VehicleCategory = 'sedan';
    if (roll < 0.18) category = 'taxi';
    else if (roll < 0.34) category = 'van';
    else if (roll < 0.5) category = 'cargo_truck';
    else if (roll < 0.62) category = 'bus';
    else if (roll < 0.72) category = 'military_truck';

    const mesh = new THREE.Group();
    let length = 1.8;
    let baseSpeed = 6.2 + Math.random() * 2.2;
    let frontZ = 0.89;
    let rearZ = -0.89;
    let wheels: THREE.Mesh[] = [];

    if (category === 'cargo_truck') {
      length = 2.7;
      baseSpeed = 5.2 + Math.random() * 1.4;
      frontZ = 1.18;
      rearZ = -1.46;

      const cab = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.76, 0.88),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.48 })
      );
      cab.position.set(0, 0.44, 0.72);
      cab.castShadow = true;
      mesh.add(cab);

      const cargoColor = Math.random() < 0.5 ? 0xf97316 : 0xfacc15;
      const cargo = new THREE.Mesh(
        new THREE.BoxGeometry(0.98, 0.96, 1.82),
        new THREE.MeshStandardMaterial({ color: cargoColor, roughness: 0.55 })
      );
      cargo.position.set(0, 0.54, -0.55);
      cargo.castShadow = true;
      mesh.add(cargo);

      wheels = this.addWheels(mesh, 0.46, [-1.05, -0.35, 0.72]);
    } else if (category === 'bus') {
      length = 3.1;
      baseSpeed = 5.0 + Math.random() * 1.2;
      frontZ = 1.48;
      rearZ = -1.48;

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.98, 0.86, 2.95),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.45 })
      );
      body.position.y = 0.5;
      body.castShadow = true;
      mesh.add(body);

      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.08, 2.85),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })
      );
      roof.position.y = 0.96;
      mesh.add(roof);

      const windowBand = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.28, 2.65),
        new THREE.MeshStandardMaterial({ color: 0xbae6fd, roughness: 0.2, metalness: 0.2 })
      );
      windowBand.position.y = 0.62;
      mesh.add(windowBand);

      wheels = this.addWheels(mesh, 0.48, [-0.95, 0.95]);
    } else if (category === 'military_truck') {
      length = 2.5;
      baseSpeed = 5.4 + Math.random() * 1.4;
      frontZ = 1.12;
      rearZ = -1.32;

      const oliveMat = new THREE.MeshStandardMaterial({ color: 0x4d5d3b, roughness: 0.72 });
      const tarpMat = new THREE.MeshStandardMaterial({ color: 0x65744a, roughness: 0.8 });

      const cab = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.72, 0.85), oliveMat);
      cab.position.set(0, 0.44, 0.68);
      cab.castShadow = true;
      mesh.add(cab);

      const bed = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.86, 1.65), tarpMat);
      bed.position.set(0, 0.52, -0.48);
      bed.castShadow = true;
      mesh.add(bed);

      wheels = this.addWheels(mesh, 0.46, [-0.92, -0.25, 0.68]);
    } else if (category === 'van') {
      length = 2.05;
      baseSpeed = 5.9 + Math.random() * 1.8;
      frontZ = 0.98;
      rearZ = -0.98;

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.72, 1.95),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.48 })
      );
      body.position.y = 0.44;
      body.castShadow = true;
      mesh.add(body);

      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.14, 1.85),
        new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.4 })
      );
      stripe.position.y = 0.42;
      mesh.add(stripe);

      wheels = this.addWheels(mesh, 0.44, [-0.62, 0.62]);
    } else {
      // Sedan or Yellow Taxi
      const color =
        category === 'taxi'
          ? 0xfacc15
          : this.sedanColors[Math.floor(Math.random() * this.sedanColors.length)];

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.88, 0.38, 1.75),
        new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.1 })
      );
      body.position.y = 0.26;
      body.castShadow = true;
      mesh.add(body);

      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(0.76, 0.32, 0.92),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.22, metalness: 0.2 })
      );
      cabin.position.set(0, 0.54, -0.08);
      mesh.add(cabin);

      if (category === 'taxi') {
        const sign = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.1, 0.14),
          new THREE.MeshBasicMaterial({ color: 0xfef08a })
        );
        sign.position.set(0, 0.74, -0.05);
        mesh.add(sign);
      }

      wheels = this.addWheels(mesh, 0.43, [-0.55, 0.55]);
    }

    const hMat = new THREE.MeshBasicMaterial({ color: 0xfffae6 });
    const hGeo = new THREE.BoxGeometry(0.18, 0.12, 0.04);
    const hl1 = new THREE.Mesh(hGeo, hMat);
    hl1.position.set(-0.28, 0.28, frontZ);
    const hl2 = new THREE.Mesh(hGeo, hMat);
    hl2.position.set(0.28, 0.28, frontZ);
    mesh.add(hl1, hl2);

    const tMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tl1 = new THREE.Mesh(hGeo, tMat);
    tl1.position.set(-0.28, 0.28, rearZ);
    const tl2 = new THREE.Mesh(hGeo, tMat);
    tl2.position.set(0.28, 0.28, rearZ);
    mesh.add(tl1, tl2);

    const initialAngle = Math.atan2(targetNode.x - startNode.x, targetNode.z - startNode.z);
    mesh.position.set(startNode.x, startNode.elevation + 0.09, startNode.z);
    mesh.rotation.y = initialAngle;
    this.group.add(mesh);

    this.vehicles.push({
      id: `veh_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      category,
      mesh,
      currentNode: startNode,
      targetNode,
      route,
      progress: initialProgress,
      baseSpeed,
      currentSpeed: baseSpeed,
      heading: initialAngle,
      length,
      headlights: [hl1, hl2],
      taillights: [tl1, tl2],
      wheels,
    });
  }
}
