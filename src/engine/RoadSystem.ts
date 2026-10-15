import * as THREE from 'three';
import { RoadNode, RoadSegment } from '../types/game';
import { TerrainGenerator } from './TerrainGenerator';

export class RoadSystem {
  public group: THREE.Group;
  public nodes: Map<string, RoadNode> = new Map();
  public segments: Map<string, RoadSegment> = new Map();
  private terrain: TerrainGenerator;

  // Road geometry materials
  private asphaltMat: THREE.MeshStandardMaterial;
  private lineMat: THREE.MeshBasicMaterial;
  private curbMat: THREE.MeshStandardMaterial;
  private bridgePillarMat: THREE.MeshStandardMaterial;
  public streetLights: THREE.Mesh[] = [];

  constructor(terrain: TerrainGenerator) {
    this.terrain = terrain;
    this.group = new THREE.Group();

    this.asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x1f242d,
      roughness: 0.9,
      metalness: 0.1,
    });

    this.lineMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15, // Yellow divider
    });

    this.curbMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.8,
      metalness: 0.05,
    });

    this.bridgePillarMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.7,
      metalness: 0.2,
    });
  }

  public addNode(x: number, z: number): RoadNode {
    const key = `${Math.round(x)},${Math.round(z)}`;
    const existing = Array.from(this.nodes.values()).find(
      (n) => Math.hypot(n.x - x, n.z - z) < 1.0
    );
    if (existing) return existing;

    const rawY = this.terrain.getHeight(x, z);
    // If water, bridge height minimum 1.5 above water
    const elevation = rawY < this.terrain.waterLevel + 0.5 ? this.terrain.waterLevel + 2.5 : rawY + 0.05;

    const node: RoadNode = {
      id: `node_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      x,
      z,
      elevation,
      connectedTo: [],
    };

    this.nodes.set(node.id, node);
    return node;
  }

  public addSegment(
    startNode: RoadNode,
    endNode: RoadNode,
    type: 'road_two_lane' | 'road_highway' | 'road_bridge' = 'road_two_lane'
  ): RoadSegment | null {
    // Check if segment already exists
    const existingSeg = Array.from(this.segments.values()).find(
      (s) =>
        (s.startNodeId === startNode.id && s.endNodeId === endNode.id) ||
        (s.startNodeId === endNode.id && s.endNodeId === startNode.id)
    );
    if (existingSeg) return null;

    const segmentId = `seg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const segment: RoadSegment = {
      id: segmentId,
      startNodeId: startNode.id,
      endNodeId: endNode.id,
      type,
    };

    startNode.connectedTo.push(endNode.id);
    endNode.connectedTo.push(startNode.id);
    this.segments.set(segmentId, segment);

    this.renderSegment(segment, startNode, endNode);
    return segment;
  }

  private renderSegment(segment: RoadSegment, n1: RoadNode, n2: RoadNode) {
    const segGroup = new THREE.Group();
    segGroup.name = segment.id;

    const dx = n2.x - n1.x;
    const dz = n2.z - n1.z;
    const length = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);

    const isBridge =
      segment.type === 'road_bridge' ||
      this.terrain.isWater((n1.x + n2.x) / 2, (n1.z + n2.z) / 2) ||
      n1.elevation > this.terrain.waterLevel + 2.0 && this.terrain.isWater(n1.x, n1.z);

    const width = segment.type === 'road_highway' ? 4.5 : 3.0;

    // Road surface mesh
    const roadGeo = new THREE.BoxGeometry(width, 0.15, length);
    const roadMesh = new THREE.Mesh(roadGeo, this.asphaltMat);
    roadMesh.castShadow = true;
    roadMesh.receiveShadow = true;

    // Center divider line
    const lineGeo = new THREE.PlaneGeometry(0.18, length * 0.95);
    lineGeo.rotateX(-Math.PI / 2);
    const lineMesh = new THREE.Mesh(lineGeo, this.lineMat);
    lineMesh.position.y = 0.085;
    segGroup.add(lineMesh);

    // Curbs
    const curbGeo = new THREE.BoxGeometry(0.3, 0.22, length);
    const curbL = new THREE.Mesh(curbGeo, this.curbMat);
    curbL.position.x = -width / 2 - 0.15;
    const curbR = new THREE.Mesh(curbGeo, this.curbMat);
    curbR.position.x = width / 2 + 0.15;
    segGroup.add(curbL, curbR);

    // If bridge, add pillars & guardrails
    if (isBridge) {
      const railGeo = new THREE.BoxGeometry(0.15, 0.7, length);
      const railL = new THREE.Mesh(railGeo, this.bridgePillarMat);
      railL.position.set(-width / 2 - 0.2, 0.45, 0);
      const railR = new THREE.Mesh(railGeo, this.bridgePillarMat);
      railR.position.set(width / 2 + 0.2, 0.45, 0);
      segGroup.add(railL, railR);

      // Pillars down into water bed
      const pillarCount = Math.max(1, Math.floor(length / 10));
      for (let p = 1; p <= pillarCount; p++) {
        const t = p / (pillarCount + 1) - 0.5;
        const pillarGeo = new THREE.CylinderGeometry(0.5, 0.7, 8.0, 8);
        const pillar = new THREE.Mesh(pillarGeo, this.bridgePillarMat);
        pillar.position.set(0, -4.0, t * length);
        segGroup.add(pillar);
      }
    }

    segGroup.add(roadMesh);

    // Position and orient segment
    const midX = (n1.x + n2.x) / 2;
    const midY = (n1.elevation + n2.elevation) / 2;
    const midZ = (n1.z + n2.z) / 2;

    segGroup.position.set(midX, midY, midZ);
    segGroup.rotation.y = angle;

    // Pitch slope along segment
    const dy = n2.elevation - n1.elevation;
    segGroup.rotation.x = Math.atan2(dy, length);

    // Streetlights along road
    if (length > 6 && !isBridge) {
      const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 2.5);
      const pole = new THREE.Mesh(poleGeo, this.bridgePillarMat);
      pole.position.set(width / 2 + 0.4, 1.25, 0);

      const lampGeo = new THREE.SphereGeometry(0.18, 6, 6);
      const lamp = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      lamp.position.set(width / 2 + 0.2, 2.5, 0);
      segGroup.add(pole, lamp);
      this.streetLights.push(lamp);
    }

    this.group.add(segGroup);
  }

  public removeSegment(segmentId: string) {
    const seg = this.segments.get(segmentId);
    if (!seg) return;

    const obj = this.group.getObjectByName(segmentId);
    if (obj) this.group.remove(obj);

    const n1 = this.nodes.get(seg.startNodeId);
    const n2 = this.nodes.get(seg.endNodeId);
    if (n1) n1.connectedTo = n1.connectedTo.filter((id) => id !== seg.endNodeId);
    if (n2) n2.connectedTo = n2.connectedTo.filter((id) => id !== seg.startNodeId);

    this.segments.delete(segmentId);
  }

  public getRandomNode(): RoadNode | null {
    const arr = Array.from(this.nodes.values());
    if (arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  public updateNightLighting(isNight: boolean) {
    this.streetLights.forEach((lamp) => {
      (lamp.material as THREE.MeshBasicMaterial).color.setHex(isNight ? 0xfef08a : 0x475569);
    });
  }
}
