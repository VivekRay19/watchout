import * as THREE from 'three';
import { BuildingType, PlacedBuilding, RoadNode } from '../types/game';
import { BUILDING_DEFS } from '../data/buildingDefs';
import { TerrainGenerator } from './TerrainGenerator';
import { VegetationSystem } from './VegetationSystem';
import { RoadSystem } from './RoadSystem';
import { soundManager } from '../audio/SoundManager';

export class PlacementSystem {
  public group: THREE.Group;
  public activeBuildingType: BuildingType | null = null;
  public rotation: number = 0; // 0, PI/2, PI, 3PI/2
  public cursorMesh: THREE.Group | null = null;
  public isValid: boolean = false;
  public gridPos: { x: number; z: number; y: number } = { x: 0, z: 0, y: 0 };

  // Two-Point Interactive Road Placement
  public roadStartNode: RoadNode | null = null;
  public snappedNode: RoadNode | null = null;
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
      color: 0x10b981,
      transparent: true,
      opacity: 0.55,
      wireframe: false,
    });

    this.invalidMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.55,
      wireframe: false,
    });

    // Snapping indicator ring (Cyan glowing target)
    const ringGeo = new THREE.RingGeometry(1.8, 2.5, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.85,
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
      // Roads use the two-point road preview
      return;
    }

    const def = BUILDING_DEFS[type];
    const w = def.width * 4;
    const d = def.depth * 4;

    const group = new THREE.Group();

    // Footprint bounding box
    const boxGeo = new THREE.BoxGeometry(w, 2, d);
    const box = new THREE.Mesh(boxGeo, this.validMat);
    box.position.y = 1;
    group.add(box);

    // Direction indicator arrow
    const arrowGeo = new THREE.ConeGeometry(0.8, 1.6, 3);
    arrowGeo.rotateX(-Math.PI / 2);
    const arrow = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    arrow.position.set(0, 2.2, d / 2 - 0.5);
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

    // Snap to 4-unit grid
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

    // Check validity
    let valid = true;

    // Cost check
    if (playerCash < def.cost) valid = false;

    // Terrain check
    const isWater = this.terrain.isWater(snapX, snapZ);
    if (this.activeBuildingType === 'mil_naval_dock') {
      const nearShore = this.terrain.isNearShoreline(snapX, snapZ);
      if (!nearShore) valid = false;
    } else {
      if (isWater) valid = false;
    }

    // Collision check with existing buildings
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

    // Check for magnetic endpoint snapping
    const snap = this.roadSystem.findSnapNode(point.x, point.z, 7.5);
    this.snappedNode = snap;

    let targetX = snap ? snap.x : Math.round(point.x / 4) * 4;
    let targetZ = snap ? snap.z : Math.round(point.z / 4) * 4;
    let targetY = snap ? snap.elevation : this.terrain.getHeight(targetX, targetZ);

    this.gridPos = { x: targetX, z: targetZ, y: targetY };

    // Update snap indicator
    if (snap) {
      this.snapIndicator.visible = true;
      this.snapIndicator.position.set(snap.x, snap.elevation + 0.12, snap.z);
    } else {
      this.snapIndicator.visible = false;
    }

    // If start node is selected, render dynamic continuous road preview
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

        const width = this.activeBuildingType === 'road_highway' ? 5.2 : 3.6;
        const angle = Math.atan2(dx, dz);

        const previewGeo = new THREE.BoxGeometry(width, 0.18, length);
        const previewMat = this.isValid ? this.validMat : this.invalidMat;
        const previewMesh = new THREE.Mesh(previewGeo, previewMat);

        const midX = (sx + targetX) / 2;
        const midZ = (sz + targetZ) / 2;
        const midY = (sy + targetY) / 2 + 0.08;

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
      // Just hovering before picking start node
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

    // Clear trees around building footprint
    const clearRadius = Math.max(def.width, def.depth) * 2.5;
    this.vegetation.clearVegetationAround(this.gridPos.x, this.gridPos.z, clearRadius);

    soundManager.playPlace();
    return building;
  }
}
