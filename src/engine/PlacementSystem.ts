import * as THREE from 'three';
import { BuildingType, PlacedBuilding, RoadNode } from '../types/game';
import { BUILDING_DEFS } from '../data/buildingDefs';
import { TerrainGenerator } from './TerrainGenerator';
import { VegetationSystem } from './VegetationSystem';
import { RoadSystem, SegmentSnapResult } from './RoadSystem';
import { soundManager } from '../audio/SoundManager';

export class PlacementSystem {
  public group: THREE.Group;
  public activeBuildingType: BuildingType | null = null;
  public rotation: number = 0; // 0, PI/2, PI, 3PI/2
  public cursorMesh: THREE.Group | null = null;
  public isValid: boolean = false;
  public gridPos: { x: number; z: number; y: number } = { x: 0, z: 0, y: 0 };

  // Two-Point Interactive Road Placement & Segment Snapping
  public roadStartNode: RoadNode | null = null;
  public snappedNode: RoadNode | null = null;
  public snappedSegment: SegmentSnapResult | null = null;
  public snapIndicator: THREE.Mesh;
  public roadPreviewGroup: THREE.Group;
  public roadCostEstimate: number = 0;

  private terrain: TerrainGenerator;
  private vegetation: VegetationSystem;
  private roadSystem?: RoadSystem;
  private validMat: THREE.MeshBasicMaterial;
  private invalidMat: THREE.MeshBasicMaterial;

  constructor(terrain: TerrainGenerator, vegetation: VegetationSystem) {
    this.terrain = terrain;
    this.vegetation = vegetation;
    this.group = new THREE.Group();
    this.roadPreviewGroup = new THREE.Group();
    this.group.add(this.roadPreviewGroup);

    this.validMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.5,
      wireframe: false,
    });

    this.invalidMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.5,
      wireframe: false,
    });

    // Clean snap target ring
    const ringGeo = new THREE.RingGeometry(1.5, 2.2, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    this.snapIndicator = new THREE.Mesh(ringGeo, ringMat);
    this.snapIndicator.visible = false;
    this.group.add(this.snapIndicator);
  }

  public setRoadSystem(roads: RoadSystem) {
    this.roadSystem = roads;
  }

  public selectBuilding(type: BuildingType | null) {
    this.activeBuildingType = type;
    this.cancelRoadDrawing();

    if (this.cursorMesh) {
      this.group.remove(this.cursorMesh);
      this.cursorMesh = null;
    }
    this.snapIndicator.visible = false;

    if (!type) return;

    if (type.startsWith('road_')) {
      return;
    }

    const def = BUILDING_DEFS[type];
    const w = def.width * 4;
    const d = def.depth * 4;

    const group = new THREE.Group();

    // Clean footprint pad preview
    const boxGeo = new THREE.BoxGeometry(w, 1.6, d);
    const box = new THREE.Mesh(boxGeo, this.validMat);
    box.position.y = 0.8;
    group.add(box);

    // Subtle range circle preview when placing radar or air defense
    const range = def.radarRadius || def.defenseRange;
    if (range) {
      const rangeGeo = new THREE.RingGeometry(range - 1.2, range, 64);
      rangeGeo.rotateX(-Math.PI / 2);
      const rangeMat = new THREE.MeshBasicMaterial({
        color: def.radarRadius ? 0x38bdf8 : 0x22c55e,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      });
      const rangeRing = new THREE.Mesh(rangeGeo, rangeMat);
      rangeRing.position.y = 0.25;
      group.add(rangeRing);
    }

    // Direction indicator arrow
    const arrowGeo = new THREE.ConeGeometry(0.7, 1.4, 3);
    arrowGeo.rotateX(-Math.PI / 2);
    const arrow = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    arrow.position.set(0, 1.8, d / 2 - 0.5);
    group.add(arrow);

    this.cursorMesh = group;
    this.group.add(group);
  }

  public rotate() {
    this.rotation = (this.rotation + Math.PI / 2) % (Math.PI * 2);
    if (this.cursorMesh) {
      this.cursorMesh.rotation.y = this.rotation;
    }
  }

  public cancelRoadDrawing() {
    this.roadStartNode = null;
    this.snappedNode = null;
    this.snappedSegment = null;
    this.snapIndicator.visible = false;
    this.roadCostEstimate = 0;
    while (this.roadPreviewGroup.children.length > 0) {
      this.roadPreviewGroup.remove(this.roadPreviewGroup.children[0]);
    }
  }

  public updateCursor(
    intersectionPoint: THREE.Vector3 | null,
    existingBuildings: PlacedBuilding[],
    playerCash: number
  ) {
    if (!intersectionPoint || !this.activeBuildingType) {
      if (this.cursorMesh) this.cursorMesh.visible = false;
      this.snapIndicator.visible = false;
      return;
    }

    // 1. ROAD PLACEMENT WORKFLOW
    if (this.activeBuildingType.startsWith('road_')) {
      this.updateRoadCursor(intersectionPoint, playerCash);
      return;
    }

    // 2. STANDARD BUILDING PLACEMENT
    if (!this.cursorMesh) return;
    this.cursorMesh.visible = true;
    this.snapIndicator.visible = false;

    const gridSize = 4;
    const snapX = Math.round(intersectionPoint.x / gridSize) * gridSize;
    const snapZ = Math.round(intersectionPoint.z / gridSize) * gridSize;
    const snapY = this.terrain.getHeight(snapX, snapZ);

    this.gridPos = { x: snapX, z: snapZ, y: snapY };
    this.cursorMesh.position.set(snapX, snapY, snapZ);
    this.cursorMesh.rotation.y = this.rotation;

    const def = BUILDING_DEFS[this.activeBuildingType];
    const w = def.width * 4;
    const d = def.depth * 4;

    let valid = true;

    if (playerCash < def.cost) valid = false;

    const isWater = this.terrain.isWater(snapX, snapZ);
    if (this.activeBuildingType === 'mil_naval_dock') {
      const nearShore = this.terrain.isNearShoreline(snapX, snapZ);
      if (!nearShore) valid = false;
    } else {
      if (isWater) valid = false;
    }

    const halfW = w / 2;
    const halfD = d / 2;
    for (const b of existingBuildings) {
      const bDef = BUILDING_DEFS[b.type];
      const bHalfW = (bDef.width * 4) / 2;
      const bHalfD = (bDef.depth * 4) / 2;

      const overlapX = Math.abs(snapX - b.x) < halfW + bHalfW - 0.5;
      const overlapZ = Math.abs(snapZ - b.z) < halfD + bHalfD - 0.5;
      if (overlapX && overlapZ) {
        valid = false;
        break;
      }
    }

    this.isValid = valid;

    this.cursorMesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.BoxGeometry) {
        child.material = valid ? this.validMat : this.invalidMat;
      }
    });
  }

  private updateRoadCursor(point: THREE.Vector3, playerCash: number) {
    if (!this.roadSystem) return;

    // 1. Check for existing road node snap first, then mid-segment snap
    const nodeSnap = this.roadSystem.findSnapNode(point.x, point.z, 6.0);
    const segSnap = !nodeSnap ? this.roadSystem.findSnapSegment(point.x, point.z, 4.5) : null;

    this.snappedNode = nodeSnap;
    this.snappedSegment = segSnap;

    let targetX: number;
    let targetZ: number;
    let targetY: number;

    if (nodeSnap) {
      targetX = nodeSnap.x;
      targetZ = nodeSnap.z;
      targetY = nodeSnap.elevation;
    } else if (segSnap) {
      targetX = segSnap.x;
      targetZ = segSnap.z;
      targetY = segSnap.elevation;
    } else {
      targetX = Math.round(point.x / 4) * 4;
      targetZ = Math.round(point.z / 4) * 4;

      // Orthogonal assist when drawing from a start node
      if (this.roadStartNode) {
        const adx = Math.abs(targetX - this.roadStartNode.x);
        const adz = Math.abs(targetZ - this.roadStartNode.z);
        if (adx < 4 && adz >= 4) targetX = this.roadStartNode.x;
        if (adz < 4 && adx >= 4) targetZ = this.roadStartNode.z;
      }

      const rawY = this.terrain.getHeight(targetX, targetZ);
      targetY = this.terrain.isWater(targetX, targetZ)
        ? Math.max(this.terrain.plateauHeight + 0.12, this.terrain.waterLevel + 1.72)
        : rawY + 0.06;
    }

    this.gridPos = { x: targetX, z: targetZ, y: targetY };

    // Show clean snap ring indicator at cursor
    this.snapIndicator.visible = true;
    this.snapIndicator.position.set(targetX, targetY + 0.1, targetZ);
    (this.snapIndicator.material as THREE.MeshBasicMaterial).color.setHex(
      nodeSnap || segSnap ? 0x22c55e : 0x38bdf8
    );

    // Clear and rebuild road preview segment
    while (this.roadPreviewGroup.children.length > 0) {
      this.roadPreviewGroup.remove(this.roadPreviewGroup.children[0]);
    }

    if (this.roadStartNode) {
      const sx = this.roadStartNode.x;
      const sz = this.roadStartNode.z;
      const sy = this.roadStartNode.elevation;

      const dx = targetX - sx;
      const dz = targetZ - sz;
      const length = Math.hypot(dx, dz);

      if (length > 2.0) {
        this.roadCostEstimate = Math.max(50, Math.round((length / 10) * 50));
        this.isValid = playerCash >= this.roadCostEstimate;

        const width = this.activeBuildingType === 'road_highway' ? 4.4 : 3.4;
        const angle = Math.atan2(dx, dz);

        const previewGeo = new THREE.BoxGeometry(width, 0.18, length);
        const previewMat = this.isValid ? this.validMat : this.invalidMat;
        const previewMesh = new THREE.Mesh(previewGeo, previewMat);

        const midX = (sx + targetX) / 2;
        const midZ = (sz + targetZ) / 2;
        const midY = (sy + targetY) / 2 + 0.06;

        previewMesh.position.set(midX, midY, midZ);
        previewMesh.rotation.y = angle;

        const dy = targetY - sy;
        previewMesh.rotation.x = Math.atan2(dy, length);

        this.roadPreviewGroup.add(previewMesh);
      } else {
        this.isValid = false;
        this.roadCostEstimate = 0;
      }
    } else {
      this.isValid = true;
      this.roadCostEstimate = 50;
    }
  }

  public placeBuilding(): PlacedBuilding | null {
    if (!this.isValid || !this.activeBuildingType) return null;

    const def = BUILDING_DEFS[this.activeBuildingType];
    const building: PlacedBuilding = {
      id: `bld_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: this.activeBuildingType,
      x: this.gridPos.x,
      z: this.gridPos.z,
      rotation: this.rotation,
      width: def.width,
      depth: def.depth,
      health: def.maxHealth,
      maxHealth: def.maxHealth,
      powered: true,
      watered: true,
      active: true,
      level: 1,
    };

    const clearRadius = Math.max(def.width, def.depth) * 2.4;
    this.vegetation.clearVegetationAround(this.gridPos.x, this.gridPos.z, clearRadius);

    soundManager.playPlace();
    return building;
  }
}
