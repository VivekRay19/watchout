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
  public bridgePillarMat: THREE.MeshStandardMaterial;
  public bridgeRailingMat: THREE.MeshStandardMaterial;
  public streetLights: THREE.Mesh[] = [];

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

    // Soft slate-grey asphalt (clean, readable, non-noisy)
    this.asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x56616f,
      roughness: 0.82,
      metalness: 0.04,
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
      color: 0xdfe5ec,
      roughness: 0.72,
      metalness: 0.02,
    });

    // Concrete bridge piers
    this.bridgePillarMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.7,
      metalness: 0.08,
    });

    this.bridgeRailingMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.55,
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

      let t = ((x - n1.x) * dx + (z - n1.z) * dz) / lenSq;
      // Keep away from immediate endpoints (handled by findSnapNode)
      if (t <= 0.12 || t >= 0.88) return;

      const projX = n1.x + t * dx;
      const projZ = n1.z + t * dz;
      const dist = Math.hypot(x - projX, z - projZ);

      if (dist < minDist) {
        minDist = dist;
        // Snap projected point to 2-unit subgrid for clean orthogonal alignments
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

    // If very close to n1 or n2, just return that endpoint
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
    const elevation = isWater ? Math.max(this.terrain.plateauHeight + 0.12, this.terrain.waterLevel + 1.72) : rawY + 0.06;

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

    // Find all existing segments that intersect (startNode -> endNode)
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

    // Sort crossings from startNode to endNode
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

    this.renderSegment(segment, startNode, endNode);
    return segment;
  }

  private refreshNodeAndNeighbors(node: RoadNode) {
    this.updateJunctionPatch(node);
    // Re-render all segments attached to this node so their trim lengths match the junction
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
    // Remove previous mesh if re-rendering
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
    const width = segment.type === 'road_highway' ? 4.4 : 3.4;
    const curbWidth = 0.55;

    // Trim curbs & lane markings back from multi-road intersections so they never cut across junctions
    const trimStart = n1.connectedTo.length >= 2 ? 2.15 : 0.2;
    const trimEnd = n2.connectedTo.length >= 2 ? 2.15 : 0.2;
    const trimmedLen = Math.max(0.5, fullLength - trimStart - trimEnd);
    const zShift = (trimStart - trimEnd) / 2;

    // 1. Main Asphalt Road Deck
    const roadGeo = new THREE.BoxGeometry(width, 0.14, Math.max(0.5, fullLength - 0.4));
    const roadMesh = new THREE.Mesh(roadGeo, this.asphaltMat);
    roadMesh.receiveShadow = true;
    segGroup.add(roadMesh);

    // 2. Crisp Dashed White Center Lines (stopped cleanly before intersections)
    if (trimmedLen > 1.5) {
      const dashSpacing = 2.6;
      const dashLen = 1.25;
      const numDashes = Math.floor(trimmedLen / dashSpacing);
      const startZ = -trimmedLen / 2 + dashSpacing * 0.5 + zShift;

      for (let d = 0; d < numDashes; d++) {
        const dashZ = startZ + d * dashSpacing;
        const dashGeo = new THREE.PlaneGeometry(0.14, dashLen);
        dashGeo.rotateX(-Math.PI / 2);
        const dashMesh = new THREE.Mesh(dashGeo, this.whiteLineMat);
        dashMesh.position.set(0, 0.078, dashZ);
        segGroup.add(dashMesh);
      }

      // Subtle side lane edge lines on highways/bridges
      if (segment.type === 'road_highway' || isBridge) {
        const edgeGeo = new THREE.PlaneGeometry(0.1, trimmedLen);
        edgeGeo.rotateX(-Math.PI / 2);
        const leftEdge = new THREE.Mesh(edgeGeo, this.whiteLineMat);
        leftEdge.position.set(-width / 2 + 0.25, 0.076, zShift);
        const rightEdge = new THREE.Mesh(edgeGeo, this.whiteLineMat);
        rightEdge.position.set(width / 2 - 0.25, 0.076, zShift);
        segGroup.add(leftEdge, rightEdge);
      }
    }

    // 3. Raised Light-Grey Concrete Sidewalks / Curbs (trimmed cleanly at intersections)
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
    }

    // 4. Bridge Deck Parapets & Concrete Piers over Water
    if (isBridge) {
      // Concrete bridge deck under-girder
      const girderGeo = new THREE.BoxGeometry(width + curbWidth * 2, 0.45, fullLength);
      const girder = new THREE.Mesh(girderGeo, this.bridgePillarMat);
      girder.position.y = -0.25;
      girder.castShadow = true;
      girder.receiveShadow = true;
      segGroup.add(girder);

      // Clean white/light-grey safety parapets
      const railGeo = new THREE.BoxGeometry(0.22, 0.65, trimmedLen);
      const railL = new THREE.Mesh(railGeo, this.bridgeRailingMat);
      railL.position.set(-width / 2 - curbWidth + 0.12, 0.42, zShift);
      railL.castShadow = true;
      const railR = new THREE.Mesh(railGeo, this.bridgeRailingMat);
      railR.position.set(width / 2 + curbWidth - 0.12, 0.42, zShift);
      railR.castShadow = true;
      segGroup.add(railL, railR);

      // Sturdy concrete bridge piers extending into the water (like the reference image)
      const pillarCount = Math.max(1, Math.floor(fullLength / 11));
      for (let p = 1; p <= pillarCount; p++) {
        const t = p / (pillarCount + 1) - 0.5;
        const pierZ = t * fullLength;
        const worldX = midX + Math.sin(angle) * pierZ;
        const worldZ = midZ + Math.cos(angle) * pierZ;
        if (this.terrain.getHeight(worldX, worldZ) < this.terrain.plateauHeight - 0.3) {
          const pierGroup = new THREE.Group();
          pierGroup.position.set(0, 0, pierZ);

          // Twin concrete columns + crossbeam cap
          const cap = new THREE.Mesh(new THREE.BoxGeometry(width + 0.8, 0.5, 1.4), this.bridgePillarMat);
          cap.position.y = -0.65;
          pierGroup.add(cap);

          for (const side of [-1, 1]) {
            const col = new THREE.Mesh(new THREE.BoxGeometry(1.1, 5.5, 1.3), this.bridgePillarMat);
            col.position.set(side * (width * 0.34), -3.2, 0);
            col.castShadow = true;
            pierGroup.add(col);
          }

          segGroup.add(pierGroup);
        }
      }
    }

    // 5. Neat Streetlights along avenues and bridges
    if (fullLength >= 10) {
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
      const poleGeo = new THREE.CylinderGeometry(0.05, 0.07, 2.6, 6);
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(width / 2 + 0.32, 1.3, 0);

      const armGeo = new THREE.BoxGeometry(0.65, 0.05, 0.05);
      const arm = new THREE.Mesh(armGeo, poleMat);
      arm.position.set(width / 2 + 0.02, 2.6, 0);

      const lampGeo = new THREE.SphereGeometry(0.14, 8, 8);
      const lamp = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      lamp.position.set(width / 2 - 0.25, 2.52, 0);

      segGroup.add(pole, arm, lamp);
      this.streetLights.push(lamp);
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

  // Generate clean connected intersection geometry with crosswalks and corner sidewalks
  public updateJunctionPatch(node: RoadNode) {
    const oldPatch = this.junctionMeshes.get(node.id);
    if (oldPatch) {
      this.group.remove(oldPatch);
      this.junctionMeshes.delete(node.id);
    }

    if (node.connectedTo.length === 0) return;

    const junctionGroup = new THREE.Group();
    junctionGroup.position.set(node.x, node.elevation, node.z);

    if (node.connectedTo.length === 1) {
      // Clean rounded dead-end cap
      const capGeo = new THREE.CylinderGeometry(1.7, 1.7, 0.14, 16);
      const capMesh = new THREE.Mesh(capGeo, this.asphaltMat);
      capMesh.receiveShadow = true;
      junctionGroup.add(capMesh);
    } else {
      // Multi-road intersection (2-way corner, 3-way T-junction, or 4-way crossroads)
      const radius = 2.25;

      // 1. Unified flat asphalt intersection hub (exact same height as road segments)
      const capGeo = new THREE.CylinderGeometry(radius + 0.15, radius + 0.15, 0.142, 24);
      const capMesh = new THREE.Mesh(capGeo, this.asphaltMat);
      capMesh.receiveShadow = true;
      junctionGroup.add(capMesh);

      // Collect outgoing road angles in [0, 2*PI)
      const armAngles: number[] = [];
      node.connectedTo.forEach((otherId) => {
        const other = this.nodes.get(otherId);
        if (!other) return;
        const a = Math.atan2(other.x - node.x, other.z - node.z);
        armAngles.push(a);

        // 2. Add crisp white zebra crosswalks on each road arm (if >= 3-way intersection)
        if (node.connectedTo.length >= 3) {
          const cwGroup = new THREE.Group();
          cwGroup.rotation.y = a;
          const stripeCount = 5;
          for (let s = 0; s < stripeCount; s++) {
            const sx = (s - (stripeCount - 1) / 2) * 0.56;
            const stripeGeo = new THREE.PlaneGeometry(0.26, 0.95);
            stripeGeo.rotateX(-Math.PI / 2);
            const stripe = new THREE.Mesh(stripeGeo, this.whiteLineMat);
            stripe.position.set(sx, 0.08, radius + 0.15);
            cwGroup.add(stripe);
          }
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
    }

    this.group.add(junctionGroup);
    this.junctionMeshes.set(node.id, junctionGroup);
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

  public updateNightLighting(isNight: boolean) {
    this.streetLights.forEach((lamp) => {
      (lamp.material as THREE.MeshBasicMaterial).color.setHex(isNight ? 0xfef08a : 0xf8fafc);
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
