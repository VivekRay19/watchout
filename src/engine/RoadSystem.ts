import * as THREE from 'three';
import { RoadNode, RoadSegment } from '../types/game';
import { TerrainGenerator } from './TerrainGenerator';

export class RoadSystem {
  public group: THREE.Group;
  public nodes: Map<string, RoadNode> = new Map();
  public segments: Map<string, RoadSegment> = new Map();
  private terrain: TerrainGenerator;

  // Road geometry materials
  public asphaltMat: THREE.MeshStandardMaterial;
  public lineMat: THREE.MeshBasicMaterial;
  public whiteLineMat: THREE.MeshBasicMaterial;
  public curbMat: THREE.MeshStandardMaterial;
  public bridgePillarMat: THREE.MeshStandardMaterial;
  public bridgeRailingMat: THREE.MeshStandardMaterial;
  public streetLights: THREE.Mesh[] = [];

  // Junction patches to eliminate gaps
  private junctionMeshes: Map<string, THREE.Group> = new Map();

  // Debug visualizer
  public debugGroup: THREE.Group;
  public showDebug: boolean = false;

  constructor(terrain: TerrainGenerator) {
    this.terrain = terrain;
    this.group = new THREE.Group();
    this.debugGroup = new THREE.Group();
    this.group.add(this.debugGroup);

    // Realistic asphalt with fine roughness
    this.asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x22262c,
      roughness: 0.85,
      metalness: 0.08,
    });

    // Yellow center divider markings
    this.lineMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
    });

    // White edge/lane markings
    this.whiteLineMat = new THREE.MeshBasicMaterial({
      color: 0xf1f5f9,
    });

    // Concrete curbs & sidewalks
    this.curbMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.75,
      metalness: 0.05,
    });

    // Structural bridge steel / concrete
    this.bridgePillarMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.65,
      metalness: 0.35,
    });

    this.bridgeRailingMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.45,
      metalness: 0.6,
    });
  }

  public findSnapNode(x: number, z: number, tolerance = 7.0): RoadNode | null {
    let closestNode: RoadNode | null = null;
    let minDist = tolerance;

    this.nodes.forEach((n) => {
      const dist = Math.hypot(n.x - x, n.z - z);
      if (dist < minDist) {
        minDist = dist;
        closestNode = n;
      }
    });

    return closestNode;
  }

  public addNode(x: number, z: number): RoadNode {
    // Check if a node already exists within 2.5 units to prevent duplicate micro-nodes
    const existing = this.findSnapNode(x, z, 2.5);
    if (existing) return existing;

    const rawY = this.terrain.getHeight(x, z);
    const isWater = this.terrain.isWater(x, z);
    const elevation = isWater ? this.terrain.waterLevel + 2.5 : rawY + 0.06;

    const node: RoadNode = {
      id: `node_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      x,
      z,
      elevation,
      connectedTo: [],
    };

    this.nodes.set(node.id, node);
    this.updateDebugVisuals();
    return node;
  }

  public addSegment(
    startNode: RoadNode,
    endNode: RoadNode,
    type: 'road_two_lane' | 'road_highway' | 'road_bridge' = 'road_two_lane'
  ): RoadSegment | null {
    if (startNode.id === endNode.id) return null;

    // Check if segment already exists
    const existingSeg = Array.from(this.segments.values()).find(
      (s) =>
        (s.startNodeId === startNode.id && s.endNodeId === endNode.id) ||
        (s.startNodeId === endNode.id && s.endNodeId === startNode.id)
    );
    if (existingSeg) return null;

    const segmentId = `seg_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const segment: RoadSegment = {
      id: segmentId,
      startNodeId: startNode.id,
      endNodeId: endNode.id,
      type,
    };

    if (!startNode.connectedTo.includes(endNode.id)) startNode.connectedTo.push(endNode.id);
    if (!endNode.connectedTo.includes(startNode.id)) endNode.connectedTo.push(startNode.id);
    this.segments.set(segmentId, segment);

    this.renderSegment(segment, startNode, endNode);
    this.updateJunctionPatch(startNode);
    this.updateJunctionPatch(endNode);
    this.updateDebugVisuals();

    return segment;
  }

  private renderSegment(segment: RoadSegment, n1: RoadNode, n2: RoadNode) {
    const segGroup = new THREE.Group();
    segGroup.name = segment.id;

    const dx = n2.x - n1.x;
    const dz = n2.z - n1.z;
    const length = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);

    const midX = (n1.x + n2.x) / 2;
    const midZ = (n1.z + n2.z) / 2;
    const isWaterCrossing =
      this.terrain.isWater(midX, midZ) ||
      this.terrain.isWater(n1.x, n1.z) ||
      this.terrain.isWater(n2.x, n2.z);

    const isBridge = segment.type === 'road_bridge' || isWaterCrossing;
    const width = segment.type === 'road_highway' ? 5.2 : 3.6;

    // Road surface mesh
    const roadGeo = new THREE.BoxGeometry(width, 0.16, length);
    const roadMesh = new THREE.Mesh(roadGeo, this.asphaltMat);
    roadMesh.castShadow = true;
    roadMesh.receiveShadow = true;
    segGroup.add(roadMesh);

    // Center divider markings (dashed or solid)
    const lineGeo = new THREE.PlaneGeometry(0.18, length * 0.94);
    lineGeo.rotateX(-Math.PI / 2);
    const lineMesh = new THREE.Mesh(lineGeo, this.lineMat);
    lineMesh.position.y = 0.088;
    segGroup.add(lineMesh);

    // Outer white lane border markings
    const borderGeo = new THREE.PlaneGeometry(0.12, length * 0.96);
    borderGeo.rotateX(-Math.PI / 2);
    const leftBorder = new THREE.Mesh(borderGeo, this.whiteLineMat);
    leftBorder.position.set(-width / 2 + 0.28, 0.088, 0);
    const rightBorder = new THREE.Mesh(borderGeo, this.whiteLineMat);
    rightBorder.position.set(width / 2 - 0.28, 0.088, 0);
    segGroup.add(leftBorder, rightBorder);

    // Concrete Curbs & Sidewalks
    const curbWidth = 0.45;
    const curbGeo = new THREE.BoxGeometry(curbWidth, 0.24, length);
    const curbL = new THREE.Mesh(curbGeo, this.curbMat);
    curbL.position.x = -width / 2 - curbWidth / 2;
    curbL.position.y = 0.04;
    const curbR = new THREE.Mesh(curbGeo, this.curbMat);
    curbR.position.x = width / 2 + curbWidth / 2;
    curbR.position.y = 0.04;
    segGroup.add(curbL, curbR);

    // Bridge Structure if crossing water
    if (isBridge) {
      // Steel / concrete safety railings
      const railGeo = new THREE.BoxGeometry(0.18, 0.85, length);
      const railL = new THREE.Mesh(railGeo, this.bridgeRailingMat);
      railL.position.set(-width / 2 - 0.35, 0.52, 0);
      const railR = new THREE.Mesh(railGeo, this.bridgeRailingMat);
      railR.position.set(width / 2 + 0.35, 0.52, 0);
      segGroup.add(railL, railR);

      // Deep foundation bridge piers down into the riverbed
      const pillarCount = Math.max(1, Math.floor(length / 12));
      for (let p = 1; p <= pillarCount; p++) {
        const t = p / (pillarCount + 1) - 0.5;
        const pierZ = t * length;
        const pierGeo = new THREE.BoxGeometry(1.2, 10.0, 1.4);
        const pier = new THREE.Mesh(pierGeo, this.bridgePillarMat);
        pier.position.set(0, -5.0, pierZ);
        segGroup.add(pier);
      }
    } else {
      // Ground streetlights along normal road
      if (length >= 8) {
        const poleGeo = new THREE.CylinderGeometry(0.06, 0.09, 3.2, 6);
        const pole = new THREE.Mesh(poleGeo, this.bridgePillarMat);
        pole.position.set(width / 2 + 0.5, 1.6, 0);

        const armGeo = new THREE.BoxGeometry(0.8, 0.06, 0.06);
        const arm = new THREE.Mesh(armGeo, this.bridgePillarMat);
        arm.position.set(width / 2 + 0.15, 3.2, 0);

        const lampGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const lamp = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0xfef08a }));
        lamp.position.set(width / 2 - 0.2, 3.1, 0);

        segGroup.add(pole, arm, lamp);
        this.streetLights.push(lamp);
      }
    }

    // Position and orient segment
    const midY = (n1.elevation + n2.elevation) / 2;
    segGroup.position.set(midX, midY, midZ);
    segGroup.rotation.y = angle;

    // Pitch slope along segment
    const dy = n2.elevation - n1.elevation;
    segGroup.rotation.x = Math.atan2(dy, length);

    this.group.add(segGroup);
  }

  // Generate seamless intersection junction geometry to eliminate gaps and clipping
  public updateJunctionPatch(node: RoadNode) {
    // Remove old patch if exists
    const oldPatch = this.junctionMeshes.get(node.id);
    if (oldPatch) {
      this.group.remove(oldPatch);
      this.junctionMeshes.delete(node.id);
    }

    // If node has >= 2 connections, it forms an intersection/bend that needs a seamless junction cap
    if (node.connectedTo.length >= 2) {
      const junctionGroup = new THREE.Group();
      junctionGroup.position.set(node.x, node.elevation, node.z);

      const radius = 3.2;
      // Cylindrical asphalt junction cap connecting all converging road angles
      const capGeo = new THREE.CylinderGeometry(radius, radius, 0.165, 24);
      const capMesh = new THREE.Mesh(capGeo, this.asphaltMat);
      capMesh.receiveShadow = true;
      junctionGroup.add(capMesh);

      // Outer junction curb ring
      const ringGeo = new THREE.RingGeometry(radius - 0.05, radius + 0.45, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMesh = new THREE.Mesh(ringGeo, this.curbMat);
      ringMesh.position.y = 0.086;
      junctionGroup.add(ringMesh);

      this.group.add(junctionGroup);
      this.junctionMeshes.set(node.id, junctionGroup);
    }
  }

  public removeSegment(segmentId: string) {
    const seg = this.segments.get(segmentId);
    if (!seg) return;

    const obj = this.group.getObjectByName(segmentId);
    if (obj) this.group.remove(obj);

    const n1 = this.nodes.get(seg.startNodeId);
    const n2 = this.nodes.get(seg.endNodeId);
    if (n1) {
      n1.connectedTo = n1.connectedTo.filter((id) => id !== seg.endNodeId);
      this.updateJunctionPatch(n1);
    }
    if (n2) {
      n2.connectedTo = n2.connectedTo.filter((id) => id !== seg.startNodeId);
      this.updateJunctionPatch(n2);
    }

    this.segments.delete(segmentId);
    this.updateDebugVisuals();
  }

  public getRandomNode(): RoadNode | null {
    const arr = Array.from(this.nodes.values()).filter((n) => n.connectedTo.length > 0);
    if (arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  public updateNightLighting(isNight: boolean) {
    this.streetLights.forEach((lamp) => {
      (lamp.material as THREE.MeshBasicMaterial).color.setHex(isNight ? 0xfef08a : 0x475569);
    });
  }

  // Development-only diagnostic road graph visualizer
  public setDebugVisible(visible: boolean) {
    this.showDebug = visible;
    this.debugGroup.visible = visible;
  }

  private updateDebugVisuals() {
    while (this.debugGroup.children.length > 0) {
      this.debugGroup.remove(this.debugGroup.children[0]);
    }
    if (!this.showDebug) return;

    // Draw node spheres
    this.nodes.forEach((n) => {
      const geo = new THREE.SphereGeometry(0.8, 8, 8);
      const isDeadEnd = n.connectedTo.length <= 1;
      const mat = new THREE.MeshBasicMaterial({
        color: isDeadEnd ? 0xf59e0b : 0x06b6d4,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(n.x, n.elevation + 0.6, n.z);
      this.debugGroup.add(mesh);
    });
  }
}
