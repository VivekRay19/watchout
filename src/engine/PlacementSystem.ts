import * as THREE from 'three';
import { BuildingType, PlacedBuilding } from '../types/game';
import { BUILDING_DEFS } from '../data/buildingDefs';
import { TerrainGenerator } from './TerrainGenerator';
import { VegetationSystem } from './VegetationSystem';
import { soundManager } from '../audio/SoundManager';

export class PlacementSystem {
  public group: THREE.Group;
  public activeBuildingType: BuildingType | null = null;
  public rotation: number = 0; // 0, PI/2, PI, 3PI/2
  public cursorMesh: THREE.Group | null = null;
  public isValid: boolean = false;
  public gridPos: { x: number; z: number; y: number } = { x: 0, z: 0, y: 0 };

  private terrain: TerrainGenerator;
  private vegetation: VegetationSystem;
  private validMat: THREE.MeshBasicMaterial;
  private invalidMat: THREE.MeshBasicMaterial;

  constructor(terrain: TerrainGenerator, vegetation: VegetationSystem) {
    this.terrain = terrain;
    this.vegetation = vegetation;
    this.group = new THREE.Group();

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
  }

  public selectBuilding(type: BuildingType | null) {
    this.activeBuildingType = type;
    if (this.cursorMesh) {
      this.group.remove(this.cursorMesh);
      this.cursorMesh = null;
    }

    if (!type) return;

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

  public updateCursor(
    intersectionPoint: THREE.Vector3 | null,
    existingBuildings: PlacedBuilding[],
    playerCash: number
  ) {
    if (!this.cursorMesh || !this.activeBuildingType || !intersectionPoint) {
      if (this.cursorMesh) this.cursorMesh.visible = false;
      return;
    }

    this.cursorMesh.visible = true;

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

    // 1. Cost check
    if (playerCash < def.cost) {
      valid = false;
    }

    // 2. Terrain check: Naval dock can ONLY be on shoreline/water. Others must be on dry land
    const isWater = this.terrain.isWater(snapX, snapZ);
    if (this.activeBuildingType === 'mil_naval_dock') {
      const nearShore = this.terrain.isNearShoreline(snapX, snapZ);
      if (!nearShore) valid = false;
    } else if (this.activeBuildingType === 'road_bridge') {
      // Bridges can cross water
    } else {
      if (isWater) valid = false;
    }

    // 3. Collision check with existing buildings
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

    // Apply color to cursor
    this.cursorMesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.BoxGeometry) {
        child.material = valid ? this.validMat : this.invalidMat;
      }
    });
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
