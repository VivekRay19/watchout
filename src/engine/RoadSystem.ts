import * as THREE from 'three';
import { RoadNode, RoadSegment } from '../types/game';
import { TerrainGenerator } from './TerrainGenerator';

export interface SegmentSnapResult {
  segment: RoadSegment;
  x: number;
  z: number;
  elevation: number;
  dist: number;
}

export interface TrafficSignalVisual {
  nodeId: string;
  nsRed: THREE.Mesh[];
  nsGreen: THREE.Mesh[];
  ewRed: THREE.Mesh[];
  ewGreen: THREE.Mesh[];
  phaseOffset: number;
  nsIsGreen: boolean;
}

export class RoadSystem {
  public group: THREE.Group;
  public nodes: Map<string, RoadNode> = new Map();
  public segments: Map<string, RoadSegment> = new Map();
  private terrain: TerrainGenerator;

  // Clean isometric city-builder road materials (matching reference palette)
  public asphaltMat: THREE.MeshStandardMaterial;
  public lineMat: THREE.MeshBasicMaterial;
  public whiteLineMat: THREE.MeshBasicMaterial;
  public curbMat: THREE.MeshStandardMaterial;
  public grateMat: THREE.MeshStandardMaterial;
  public bridgePillarMat: THREE.MeshStandardMaterial;
  public bridgeRailingMat: THREE.MeshStandardMaterial;
  public streetLights: THREE.Mesh[] = [];
  public trafficSignals: Map<string, TrafficSignalVisual> = new Map();

  private segmentMeshes: Map<string, THREE.Group> = new Map();
  private junctionMeshes: Map<string, THREE.Group> = new Map();

  // Diagnostic visualizer
  public debugGroup: THREE.Group;
  public showDebug: boolean = false;

  constructor(terrain: TerrainGenerator) {
    this.terrain = terrain;
    this.group = new THREE.Group();
    this.debugGroup = new THREE.Group();
    this.group.add(this.debugGroup);

    // Rich charcoal-slate asphalt (matches reference screenshot road contrast)
    this.asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x3e4756,
      roughness: 0.8,
      metalness: 0.05,
    });

    // Warm yellow double-line for highways/bridges
    this.lineMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
    });

    // Crisp white lane markings & crosswalks
    this.whiteLineMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
    });

    // Clean light-grey concrete sidewalks & curbs
    this.curbMat = new THREE.MeshStandardMaterial({
      color: 0xdfe6ee,
      roughness: 0.72,
      metalness: 0.02,
    });

    // Subtle dark storm-drain grates along curbs
    this.grateMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.35,
    });

    // Concrete bridge piers
    this.bridgePillarMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.68,
      metalness: 0.08,
    });

    this.bridgeRailingMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.52,
      metalness: 0.15,
    });
  }

  public findSnapNode(x: number, z: number, tolerance = 5.5): RoadNode | null {
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

  // Find closest point along any existing road segment so T-junctions snap & split cleanly
  public findSnapSegment(x: number, z: number, tolerance = 4.5): SegmentSnapResult | null {
    let best: SegmentSnapResult | null = null;
    let minDist = tolerance;

    this.segments.forEach((seg) => {
      const n1 = this.nodes.get(seg.startNodeId);
      const n2 = this.nodes.get(seg.endNodeId);
      if (!n1 || !n2) return;

      const dx = n2.x - n1.x;
      const dz = n2.z - n1.z;
      const lenSq = dx * dx + dz * dz;
      if (lenSq < 1) return;

      const t = ((x - n1.x) * dx + (z - n1.z) * dz) / lenSq;
      if (t <= 0.12 || t >= 0.88) return;

      const projX = n1.x + t * dx;
      const projZ = n1.z + t * dz;
      const dist = Math.hypot(x - projX, z - projZ);

      if (dist < minDist) {
        minDist = dist;
        const elev = THREE.MathUtils.lerp(n1.elevation, n2.elevation, t);
        best = {
          segment: seg,
          x: Math.round(projX * 2) / 2,
          z: Math.round(projZ * 2) / 2,
          elevation: elev,
          dist,
        };
      }
    });

    return best;
  }

  // Split an existing road segment at (x, z) and return the new shared intersection RoadNode
  public splitSegmentAt(segmentId: string, x: number, z: number): RoadNode | null {
    const seg = this.segments.get(segmentId);
    if (!seg) return null;

    const n1 = this.nodes.get(seg.startNodeId);
    const n2 = this.nodes.get(seg.endNodeId);
    if (!n1 || !n2) return null;

    if (Math.hypot(x - n1.x, z - n1.z) < 3.0) return n1;
    if (Math.hypot(x - n2.x, z - n2.z) < 3.0) return n2;

    const roadType = seg.type;
    this.removeSegment(segmentId);

    const midNode = this.addNode(x, z);
    this.addSegmentInternal(n1, midNode, roadType);
    this.addSegmentInternal(midNode, n2, roadType);
    this.refreshNodeAndNeighbors(n1);
    this.refreshNodeAndNeighbors(midNode);
    this.refreshNodeAndNeighbors(n2);

    return midNode;
  }

  public addNode(x: number, z: number): RoadNode {
    const existing = this.findSnapNode(x, z, 2.5);
    if (existing) return existing;

    const rawY = this.terrain.getHeight(x, z);
    const isWater = this.terrain.isWater(x, z);
    const elevation = isWater
      ? Math.max(this.terrain.plateauHeight + 0.16, this.terrain.waterLevel + 1.85)
      : rawY + 0.06;

    const node: RoadNode = {
      id: `node_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      x,
      z,
      elevation,
      connectedTo: [],
    };

    this.nodes.set(node.id, node);
    this.updateDebugVisuals();
    return node;
  }

  // Adds a road segment and automatically splits any crossed segments to create true 4-way intersections
  public addSegment(
    startNode: RoadNode,
    endNode: RoadNode,
    type: 'road_two_lane' | 'road_highway' | 'road_bridge' = 'road_two_lane'
  ): RoadSegment | null {
    if (startNode.id === endNode.id) return null;

    const dx = endNode.x - startNode.x;
    const dz = endNode.z - startNode.z;
    const hDist = Math.max(0.1, Math.hypot(dx, dz));
    const dy = Math.abs(endNode.elevation - startNode.elevation);
    const slopeGrade = dy / hDist;

    // If slope exceeds 25% (0.25) or crosses water, promote to bridge for structural safety
    const midX = (startNode.x + endNode.x) / 2;
    const midZ = (startNode.z + endNode.z) / 2;
    const crossesWater =
      this.terrain.isWater(midX, midZ) ||
      this.terrain.isWater(startNode.x, startNode.z) ||
      this.terrain.isWater(endNode.x, endNode.z);

    if ((slopeGrade > 0.25 || crossesWater) && type !== 'road_bridge') {
      type = 'road_bridge';
    }

    const crossings: { segId: string; x: number; z: number; distFromStart: number }[] = [];

    this.segments.forEach((seg) => {
      if (
        seg.startNodeId === startNode.id ||
        seg.endNodeId === startNode.id ||
        seg.startNodeId === endNode.id ||
        seg.endNodeId === endNode.id
      ) {
        return;
      }
      const a = this.nodes.get(seg.startNodeId);
      const b = this.nodes.get(seg.endNodeId);
      if (!a || !b) return;

      const hit = this.lineSegmentsIntersect(
        startNode.x,
        startNode.z,
        endNode.x,
        endNode.z,
        a.x,
        a.z,
        b.x,
        b.z
      );
      if (hit) {
        crossings.push({
          segId: seg.id,
          x: hit.x,
          z: hit.z,
          distFromStart: Math.hypot(hit.x - startNode.x, hit.z - startNode.z),
        });
      }
    });

    crossings.sort((c1, c2) => c1.distFromStart - c2.distFromStart);

    let currStart = startNode;
    let lastCreated: RoadSegment | null = null;

    for (const cross of crossings) {
      const splitNode = this.splitSegmentAt(cross.segId, cross.x, cross.z);
      if (splitNode && splitNode.id !== currStart.id) {
        lastCreated = this.addSegmentInternal(currStart, splitNode, type);
        this.refreshNodeAndNeighbors(currStart);
        this.refreshNodeAndNeighbors(splitNode);
        currStart = splitNode;
      }
    }

    if (currStart.id !== endNode.id) {
      lastCreated = this.addSegmentInternal(currStart, endNode, type);
      this.refreshNodeAndNeighbors(currStart);
      this.refreshNodeAndNeighbors(endNode);
    }

    this.updateDebugVisuals();
    return lastCreated;
  }

  private lineSegmentsIntersect(
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    x3: number,
    z3: number,
    x4: number,
    z4: number
  ): { x: number; z: number } | null {
    const denom = (z4 - z3) * (x2 - x1) - (x4 - x3) * (z2 - z1);
    if (Math.abs(denom) < 0.0001) return null;

    const ua = ((x4 - x3) * (z1 - z3) - (z4 - z3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (z1 - z3) - (z2 - z1) * (x1 - x3)) / denom;

    if (ua > 0.05 && ua < 0.95 && ub > 0.05 && ub < 0.95) {
      return {
        x: Math.round((x1 + ua * (x2 - x1)) * 2) / 2,
        z: Math.round((z1 + ua * (z2 - z1)) * 2) / 2,
      };
    }
    return null;
  }

  private addSegmentInternal(
    startNode: RoadNode,
    endNode: RoadNode,
    type: 'road_two_lane' | 'road_highway' | 'road_bridge'
  ): RoadSegment | null {
    if (startNode.id === endNode.id) return null;

    const existingSeg = Array.from(this.segments.values()).find(
      (s) =>
        (s.startNodeId === startNode.id && s.endNodeId === endNode.id) ||
        (s.startNodeId === endNode.id && s.endNodeId === startNode.id)
    );
    if (existingSeg) return existingSeg;

    const segmentId = `seg_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const segment: RoadSegment = {
      id: segmentId,
      startNodeId: startNode.id,
      endNodeId: endNode.id,
      type,
    };

    if (!startNode.connectedTo.includes(endNode.id)) startNode.connectedTo.push(endNode.id);
    if (!endNode.connectedTo.includes(startNode.id)) endNode.connectedTo.push(startNode.id);
    this.segments.set(segmentId, segment);

    // Apply terrain cut-and-fill grading along the road corridor for non-bridges
    if (type !== 'road_bridge') {
      const p1 = { x: startNode.x, y: startNode.elevation, z: startNode.z };
      const p2 = { x: endNode.x, y: endNode.elevation, z: endNode.z };
      const rWidth = type === 'road_highway' ? 4.8 : 3.8;
      this.terrain.gradeRoadCorridor([p1, p2], rWidth, 3.2);
    }

    this.renderSegment(segment, startNode, endNode);
    return segment;
  }

  public getSegmentBetween(nodeAId: string, nodeBId: string): RoadSegment | undefined {
    for (const seg of this.segments.values()) {
      if (
        (seg.startNodeId === nodeAId && seg.endNodeId === nodeBId) ||
        (seg.startNodeId === nodeBId && seg.endNodeId === nodeAId)
      ) {
        return seg;
      }
    }
    return undefined;
  }

  private refreshNodeAndNeighbors(node: RoadNode) {
    this.updateJunctionPatch(node);
    this.segments.forEach((seg) => {
      if (seg.startNodeId === node.id || seg.endNodeId === node.id) {
        const n1 = this.nodes.get(seg.startNodeId);
        const n2 = this.nodes.get(seg.endNodeId);
        if (n1 && n2) {
          this.renderSegment(seg, n1, n2);
        }
      }
    });
  }

  private renderSegment(segment: RoadSegment, n1: RoadNode, n2: RoadNode) {
    const oldMesh = this.segmentMeshes.get(segment.id);
    if (oldMesh) {
      this.group.remove(oldMesh);
      this.segmentMeshes.delete(segment.id);
    }

    const segGroup = new THREE.Group();
    segGroup.name = segment.id;

    const dx = n2.x - n1.x;
    const dz = n2.z - n1.z;
    const fullLength = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);

    const midX = (n1.x + n2.x) / 2;
    const midZ = (n1.z + n2.z) / 2;
    const isWaterCrossing =
      this.terrain.isWater(midX, midZ) ||
      this.terrain.isWater(n1.x, n1.z) ||
      this.terrain.isWater(n2.x, n2.z);

    const isBridge = segment.type === 'road_bridge' || isWaterCrossing;
    const width = segment.type === 'road_highway' || isBridge ? 4.4 : 3.4;
    const curbWidth = 0.56;

    const trimStart = n1.connectedTo.length >= 2 ? 2.2 : 0.2;
    const trimEnd = n2.connectedTo.length >= 2 ? 2.2 : 0.2;
    const trimmedLen = Math.max(0.5, fullLength - trimStart - trimEnd);
    const zShift = (trimStart - trimEnd) / 2;

    // 1. Main Asphalt Road Deck
    const roadGeo = new THREE.BoxGeometry(width, 0.14, Math.max(0.5, fullLength - 0.35));
    const roadMesh = new THREE.Mesh(roadGeo, this.asphaltMat);
    roadMesh.receiveShadow = true;
    segGroup.add(roadMesh);

    // 2. Crisp Lane Markings (stopped cleanly before intersections)
    if (trimmedLen > 1.5) {
      const dashSpacing = 2.55;
      const dashLen = 1.25;
      const numDashes = Math.floor(trimmedLen / dashSpacing);
      const startZ = -trimmedLen / 2 + dashSpacing * 0.5 + zShift;

      if (segment.type === 'road_highway' || isBridge) {
        // Double yellow center line + dashed white outer lane dividers
        const yellowLineGeo = new THREE.PlaneGeometry(0.11, trimmedLen);
        yellowLineGeo.rotateX(-Math.PI / 2);
        const yLeft = new THREE.Mesh(yellowLineGeo, this.lineMat);
        yLeft.position.set(-0.1, 0.078, zShift);
        const yRight = new THREE.Mesh(yellowLineGeo, this.lineMat);
        yRight.position.set(0.1, 0.078, zShift);
        segGroup.add(yLeft, yRight);

        const edgeGeo = new THREE.PlaneGeometry(0.1, trimmedLen);
        edgeGeo.rotateX(-Math.PI / 2);
        const leftEdge = new THREE.Mesh(edgeGeo, this.whiteLineMat);
        leftEdge.position.set(-width / 2 + 0.24, 0.076, zShift);
        const rightEdge = new THREE.Mesh(edgeGeo, this.whiteLineMat);
        rightEdge.position.set(width / 2 - 0.24, 0.076, zShift);
        segGroup.add(leftEdge, rightEdge);
      } else {
        for (let d = 0; d < numDashes; d++) {
          const dashZ = startZ + d * dashSpacing;
          const dashGeo = new THREE.PlaneGeometry(0.14, dashLen);
          dashGeo.rotateX(-Math.PI / 2);
          const dashMesh = new THREE.Mesh(dashGeo, this.whiteLineMat);
          dashMesh.position.set(0, 0.078, dashZ);
          segGroup.add(dashMesh);
        }
      }
    }

    // 3. Raised Concrete Sidewalks / Curbs + Storm Drainage Grates
    if (trimmedLen > 0.6) {
      const curbGeo = new THREE.BoxGeometry(curbWidth, 0.22, trimmedLen);
      const curbL = new THREE.Mesh(curbGeo, this.curbMat);
      curbL.position.set(-width / 2 - curbWidth / 2, 0.04, zShift);
      curbL.receiveShadow = true;
      curbL.castShadow = true;

      const curbR = new THREE.Mesh(curbGeo, this.curbMat);
      curbR.position.set(width / 2 + curbWidth / 2, 0.04, zShift);
      curbR.receiveShadow = true;
      curbR.castShadow = true;

      segGroup.add(curbL, curbR);

      // Storm drainage grates along curb gutter
      if (!isBridge && trimmedLen >= 8) {
        const grateGeo = new THREE.BoxGeometry(0.24, 0.02, 0.65);
        for (const gz of [-trimmedLen * 0.28 + zShift, trimmedLen * 0.28 + zShift]) {
          const grateL = new THREE.Mesh(grateGeo, this.grateMat);
          grateL.position.set(-width / 2 + 0.16, 0.075, gz);
          const grateR = new THREE.Mesh(grateGeo, this.grateMat);
          grateR.position.set(width / 2 - 0.16, 0.075, gz);
          segGroup.add(grateL, grateR);
        }
      }
    }

    // 4. Bridge Deck Parapets, Abutments & Concrete Piers over Water
    if (isBridge) {
      // Concrete bridge deck under-girder
      const girderGeo = new THREE.BoxGeometry(width + curbWidth * 2 + 0.15, 0.5, fullLength);
      const girder = new THREE.Mesh(girderGeo, this.bridgePillarMat);
      girder.position.y = -0.28;
      girder.castShadow = true;
      girder.receiveShadow = true;
      segGroup.add(girder);

      // Safety parapets with vertical post details
      const railGeo = new THREE.BoxGeometry(0.24, 0.68, trimmedLen);
      const railL = new THREE.Mesh(railGeo, this.bridgeRailingMat);
      railL.position.set(-width / 2 - curbWidth + 0.12, 0.44, zShift);
      railL.castShadow = true;
      const railR = new THREE.Mesh(railGeo, this.bridgeRailingMat);
      railR.position.set(width / 2 + curbWidth - 0.12, 0.44, zShift);
      railR.castShadow = true;
      segGroup.add(railL, railR);

      // Bridge abutment blocks at both ends for seamless ground-to-bridge transition
      for (const endZ of [-fullLength / 2 + 0.9, fullLength / 2 - 0.9]) {
        const abut = new THREE.Mesh(
          new THREE.BoxGeometry(width + curbWidth * 2 + 0.6, 1.4, 1.8),
          this.bridgePillarMat
        );
        abut.position.set(0, -0.65, endZ);
        abut.castShadow = true;
        segGroup.add(abut);
      }

      // Sturdy concrete bridge piers extending into the water
      const pillarCount = Math.max(2, Math.floor(fullLength / 9.5));
      for (let p = 1; p <= pillarCount; p++) {
        const t = p / (pillarCount + 1) - 0.5;
        const pierZ = t * fullLength;
        const worldX = midX + Math.sin(angle) * pierZ;
        const worldZ = midZ + Math.cos(angle) * pierZ;
        if (this.terrain.getHeight(worldX, worldZ) < this.terrain.plateauHeight - 0.25) {
          const pierGroup = new THREE.Group();
          pierGroup.position.set(0, 0, pierZ);

          // Crossbeam cap
          const cap = new THREE.Mesh(new THREE.BoxGeometry(width + 1.0, 0.55, 1.5), this.bridgePillarMat);
          cap.position.y = -0.68;
          pierGroup.add(cap);

          for (const side of [-1, 1]) {
            const col = new THREE.Mesh(new THREE.BoxGeometry(1.15, 5.8, 1.35), this.bridgePillarMat);
            col.position.set(side * (width * 0.34), -3.3, 0);
            col.castShadow = true;
            pierGroup.add(col);
          }

          segGroup.add(pierGroup);
        }
      }
    }

    // 5. Neat Streetlights along avenues and bridges
    if (fullLength >= 9) {
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
      const lightCount = fullLength >= 22 ? 2 : 1;
      for (let l = 0; l < lightCount; l++) {
        const lz = lightCount === 1 ? 0 : (l === 0 ? -fullLength * 0.22 : fullLength * 0.22);
        const side = l % 2 === 0 ? 1 : -1;

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.65, 6), poleMat);
        pole.position.set(side * (width / 2 + 0.32), 1.32, lz);

        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.05, 0.05), poleMat);
        arm.position.set(side * (width / 2 + 0.02), 2.62, lz);

        const lamp = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xfef08a })
        );
        lamp.position.set(side * (width / 2 - 0.25), 2.54, lz);

        segGroup.add(pole, arm, lamp);
        this.streetLights.push(lamp);
      }
    }

    // Position and orient segment
    const midY = (n1.elevation + n2.elevation) / 2;
    segGroup.position.set(midX, midY, midZ);
    segGroup.rotation.y = angle;

    const dy = n2.elevation - n1.elevation;
    segGroup.rotation.x = Math.atan2(dy, fullLength);

    this.group.add(segGroup);
    this.segmentMeshes.set(segment.id, segGroup);
  }

  // Generate clean connected intersection geometry with crosswalks, corner sidewalks, and traffic signals
  public updateJunctionPatch(node: RoadNode) {
    const oldPatch = this.junctionMeshes.get(node.id);
    if (oldPatch) {
      this.group.remove(oldPatch);
      this.junctionMeshes.delete(node.id);
    }
    this.trafficSignals.delete(node.id);

    if (node.connectedTo.length === 0) return;

    const junctionGroup = new THREE.Group();
    junctionGroup.position.set(node.x, node.elevation, node.z);

    if (node.connectedTo.length === 1) {
      const capGeo = new THREE.CylinderGeometry(1.75, 1.75, 0.14, 16);
      const capMesh = new THREE.Mesh(capGeo, this.asphaltMat);
      capMesh.receiveShadow = true;
      junctionGroup.add(capMesh);
    } else {
      const radius = 2.3;

      // 1. Unified flat asphalt intersection hub
      const capGeo = new THREE.CylinderGeometry(radius + 0.16, radius + 0.16, 0.142, 24);
      const capMesh = new THREE.Mesh(capGeo, this.asphaltMat);
      capMesh.receiveShadow = true;
      junctionGroup.add(capMesh);

      const armAngles: number[] = [];
      node.connectedTo.forEach((otherId) => {
        const other = this.nodes.get(otherId);
        if (!other) return;
        const a = Math.atan2(other.x - node.x, other.z - node.z);
        armAngles.push(a);

        // 2. Add crisp white zebra crosswalks + stop line on each road arm (if >= 3-way intersection)
        if (node.connectedTo.length >= 3) {
          const cwGroup = new THREE.Group();
          cwGroup.rotation.y = a;
          const stripeCount = 5;
          for (let s = 0; s < stripeCount; s++) {
            const sx = (s - (stripeCount - 1) / 2) * 0.56;
            const stripeGeo = new THREE.PlaneGeometry(0.26, 0.92);
            stripeGeo.rotateX(-Math.PI / 2);
            const stripe = new THREE.Mesh(stripeGeo, this.whiteLineMat);
            stripe.position.set(sx, 0.08, radius + 0.15);
            cwGroup.add(stripe);
          }
          // Stop bar before crosswalk
          const stopBarGeo = new THREE.PlaneGeometry(1.4, 0.16);
          stopBarGeo.rotateX(-Math.PI / 2);
          const stopBar = new THREE.Mesh(stopBarGeo, this.whiteLineMat);
          stopBar.position.set(-0.7, 0.08, radius + 0.85);
          cwGroup.add(stopBar);

          junctionGroup.add(cwGroup);
        }
      });

      // 3. Place sidewalk curb arcs ONLY in the angular gaps between road arms
      const sampleSteps = 36;
      for (let i = 0; i < sampleSteps; i++) {
        const theta = (i / sampleSteps) * Math.PI * 2 - Math.PI;
        let blockedByRoad = false;
        for (const armAngle of armAngles) {
          let diff = Math.abs(theta - armAngle);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff < 0.72) {
            blockedByRoad = true;
            break;
          }
        }
        if (!blockedByRoad) {
          const curbPiece = new THREE.Mesh(
            new THREE.BoxGeometry(0.52, 0.22, 0.48),
            this.curbMat
          );
          const r = radius + 0.02;
          curbPiece.position.set(Math.sin(theta) * r, 0.04, Math.cos(theta) * r);
          curbPiece.rotation.y = theta;
          curbPiece.receiveShadow = true;
          junctionGroup.add(curbPiece);
        }
      }

      // 4. Add animated Traffic Signal Posts at >= 3-way intersections
      if (node.connectedTo.length >= 3) {
        const nsRed: THREE.Mesh[] = [];
        const nsGreen: THREE.Mesh[] = [];
        const ewRed: THREE.Mesh[] = [];
        const ewGreen: THREE.Mesh[] = [];
        const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
        const boxMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });

        const corners = [
          { x: -2.25, z: -2.25, isNS: true },
          { x: 2.25, z: 2.25, isNS: false },
        ];
        for (const c of corners) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.2, 6), postMat);
          post.position.set(c.x, 1.1, c.z);
          junctionGroup.add(post);

          const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.55, 0.24), boxMat);
          head.position.set(c.x, 2.15, c.z);
          junctionGroup.add(head);

          const redBulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0xef4444 })
          );
          redBulb.position.set(c.x, 2.3, c.z);
          const greenBulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0x22c55e })
          );
          greenBulb.position.set(c.x, 2.02, c.z);
          junctionGroup.add(redBulb, greenBulb);

          if (c.isNS) {
            nsRed.push(redBulb);
            nsGreen.push(greenBulb);
          } else {
            ewRed.push(redBulb);
            ewGreen.push(greenBulb);
          }
        }

        this.trafficSignals.set(node.id, {
          nodeId: node.id,
          nsRed,
          nsGreen,
          ewRed,
          ewGreen,
          phaseOffset: Math.abs(node.x * 0.13 + node.z * 0.17) % 10,
          nsIsGreen: true,
        });
      }
    }

    this.group.add(junctionGroup);
    this.junctionMeshes.set(node.id, junctionGroup);
  }

  public updateTrafficSignals(timeSeconds: number) {
    this.trafficSignals.forEach((sig) => {
      const cycle = (timeSeconds + sig.phaseOffset) % 14;
      const nsGreen = cycle < 7;
      sig.nsIsGreen = nsGreen;

      sig.nsGreen.forEach((m) =>
        (m.material as THREE.MeshBasicMaterial).color.setHex(nsGreen ? 0x22c55e : 0x14532d)
      );
      sig.nsRed.forEach((m) =>
        (m.material as THREE.MeshBasicMaterial).color.setHex(!nsGreen ? 0xef4444 : 0x450a0a)
      );
      sig.ewGreen.forEach((m) =>
        (m.material as THREE.MeshBasicMaterial).color.setHex(!nsGreen ? 0x22c55e : 0x14532d)
      );
      sig.ewRed.forEach((m) =>
        (m.material as THREE.MeshBasicMaterial).color.setHex(nsGreen ? 0xef4444 : 0x450a0a)
      );
    });
  }

  public canProceedThroughIntersection(fromNode: RoadNode, intersectionNode: RoadNode): boolean {
    const sig = this.trafficSignals.get(intersectionNode.id);
    if (!sig) return true;
    const dx = Math.abs(intersectionNode.x - fromNode.x);
    const dz = Math.abs(intersectionNode.z - fromNode.z);
    const approachingAlongNS = dz >= dx;
    return approachingAlongNS ? sig.nsIsGreen : !sig.nsIsGreen;
  }

  public removeSegment(segmentId: string) {
    const seg = this.segments.get(segmentId);
    if (!seg) return;

    const oldMesh = this.segmentMeshes.get(segmentId);
    if (oldMesh) {
      this.group.remove(oldMesh);
      this.segmentMeshes.delete(segmentId);
    }

    const n1 = this.nodes.get(seg.startNodeId);
    const n2 = this.nodes.get(seg.endNodeId);
    this.segments.delete(segmentId);

    if (n1) {
      n1.connectedTo = n1.connectedTo.filter((id) => id !== seg.endNodeId);
      this.refreshNodeAndNeighbors(n1);
    }
    if (n2) {
      n2.connectedTo = n2.connectedTo.filter((id) => id !== seg.startNodeId);
      this.refreshNodeAndNeighbors(n2);
    }

    this.updateDebugVisuals();
  }

  public getRandomNode(): RoadNode | null {
    const arr = Array.from(this.nodes.values()).filter((n) => n.connectedTo.length > 0);
    if (arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  public updateNightLighting(nightFactor: number) {
    const dayCol = new THREE.Color(0xf8fafc);
    const nightCol = new THREE.Color(0xfef08a);
    const c = dayCol.lerp(nightCol, nightFactor);
    this.streetLights.forEach((lamp) => {
      (lamp.material as THREE.MeshBasicMaterial).color.copy(c);
    });
  }

  public setDebugVisible(visible: boolean) {
    this.showDebug = visible;
    this.debugGroup.visible = visible;
  }

  private updateDebugVisuals() {
    while (this.debugGroup.children.length > 0) {
      this.debugGroup.remove(this.debugGroup.children[0]);
    }
    if (!this.showDebug) return;

    this.nodes.forEach((n) => {
      const geo = new THREE.SphereGeometry(0.7, 8, 8);
      const isDeadEnd = n.connectedTo.length <= 1;
      const mat = new THREE.MeshBasicMaterial({
        color: isDeadEnd ? 0xf59e0b : 0x38bdf8,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(n.x, n.elevation + 0.5, n.z);
      this.debugGroup.add(mesh);
    });
  }
}
