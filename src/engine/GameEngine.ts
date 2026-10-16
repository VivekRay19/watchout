import * as THREE from 'three';
import {
  BuildingType,
  PlacedBuilding,
  CombatLogEntry,
  GameSettings,
  RoadNode,
  TechNode,
} from '../types/game';
import { BUILDING_DEFS } from '../data/buildingDefs';
import { TerrainGenerator } from './TerrainGenerator';
import { VegetationSystem } from './VegetationSystem';
import { WorldManager } from './WorldManager';
import { BuildingRenderer } from './BuildingRenderer';
import { PlacementSystem } from './PlacementSystem';
import { RoadSystem } from './RoadSystem';
import { TrafficSystem } from './TrafficSystem';
import { AirTrafficSystem } from './AirTrafficSystem';
import { DefenseSystem } from './DefenseSystem';
import { ThreatSystem } from './ThreatSystem';
import { EnemyFaction } from './EnemyFaction';
import { MissionSystem } from './MissionSystem';
import { ParticleSystem } from './ParticleSystem';
import { AnimationSystem } from './AnimationSystem';
import { EconomyManager } from '../simulation/EconomyManager';
import { INITIAL_TECH_TREE } from '../simulation/TechTree';
import { SaveLoadManager } from '../simulation/SaveLoadManager';
import { soundManager } from '../audio/SoundManager';

export class GameEngine {
  public canvas: HTMLCanvasElement;
  public terrain: TerrainGenerator;
  public vegetation: VegetationSystem;
  public world: WorldManager;
  public buildingRenderer: BuildingRenderer;
  public placement: PlacementSystem;
  public roadSystem: RoadSystem;
  public trafficSystem: TrafficSystem;
  public airTraffic: AirTrafficSystem;
  public defenseSystem: DefenseSystem;
  public threatSystem: ThreatSystem;
  public enemyFaction: EnemyFaction;
  public missionSystem: MissionSystem;
  public particleSystem: ParticleSystem;
  public animationSystem: AnimationSystem;
  public economy: EconomyManager;

  // Game state
  public buildings: PlacedBuilding[] = [];
  public buildingMeshes: Map<string, THREE.Group> = new Map();
  public techTree: TechNode[] = JSON.parse(JSON.stringify(INITIAL_TECH_TREE));
  public combatLogs: CombatLogEntry[] = [];
  public selectedBuilding: PlacedBuilding | null = null;
  public simSpeed: number = 1.0; // 0 = pause, 1 = normal, 2 = fast
  public gameTimeSeconds: number = 0;

  // Settings
  public settings: GameSettings = {
    musicVolume: 0.5,
    sfxVolume: 0.7,
    ambienceVolume: 0.35,
    graphicsQuality: 'HIGH',
    shadowsEnabled: true,
    timeOfDay: 10.4,
    dayCycleSpeed: 0.015,
  };

  // Animation & loop
  private animationFrameId: number | null = null;
  private lastTime = 0;
  private simAccumulator = 0;
  private isDestroyed = false;

  // Callbacks
  public onStateUpdate?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // 1. Core World Systems
    this.terrain = new TerrainGenerator(600, 600, 200);
    this.world = new WorldManager(canvas, this.terrain);
    this.vegetation = new VegetationSystem(this.terrain, 2600);
    this.buildingRenderer = new BuildingRenderer();
    this.placement = new PlacementSystem(this.terrain, this.vegetation);
    this.roadSystem = new RoadSystem(this.terrain);
    this.trafficSystem = new TrafficSystem(this.roadSystem);
    this.airTraffic = new AirTrafficSystem(this.buildingRenderer);
    this.particleSystem = new ParticleSystem();
    this.animationSystem = new AnimationSystem(
      this.buildingRenderer,
      this.terrain,
      this.particleSystem,
      this.vegetation,
      this.roadSystem
    );
    this.defenseSystem = new DefenseSystem(this.buildingRenderer, this.particleSystem);
    this.threatSystem = new ThreatSystem(this.particleSystem);
    this.enemyFaction = new EnemyFaction(this.terrain);
    this.economy = new EconomyManager();
    this.missionSystem = new MissionSystem(this.airTraffic, this.enemyFaction, this.economy);

    // Assemble Three.js scene hierarchy
    this.world.scene.add(this.terrain.mesh);
    this.world.scene.add(this.terrain.waterMesh);
    this.world.scene.add(this.terrain.foamGroup);
    this.world.scene.add(this.vegetation.group);
    this.world.scene.add(this.roadSystem.group);
    this.world.scene.add(this.trafficSystem.group);
    this.world.scene.add(this.airTraffic.group);
    this.world.scene.add(this.animationSystem.group);
    this.world.scene.add(this.particleSystem.group);
    this.world.scene.add(this.defenseSystem.group);
    this.world.scene.add(this.threatSystem.group);
    this.world.scene.add(this.enemyFaction.group);
    this.world.scene.add(this.placement.group);

    this.placement.setRoadSystem(this.roadSystem);

    this.initEventListeners();
    this.loadOrSetupStarterCity();
    this.world.update(0.016, false);
    this.animationSystem.update(0.016, this.buildings, this.buildingMeshes, this.world.nightFactor);
    this.world.renderer.render(this.world.scene, this.world.camera);
    (window as unknown as { __watchoutEngine?: GameEngine }).__watchoutEngine = this;
    this.startLoop();
  }

  private initEventListeners() {
    this.canvas.addEventListener('click', (e) => {
      soundManager.init();

      if (e.button !== 0) return;
      if (this.world.wasDragging) return;

      if (this.placement.activeBuildingType) {
        if (this.placement.activeBuildingType.startsWith('road_')) {
          this.handleRoadPlacement();
        } else {
          this.handleBuildingPlacement();
        }
        return;
      }

      this.handleBuildingClick();
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (this.placement.roadStartNode) {
        this.placement.cancelRoadDrawing();
      } else if (this.placement.activeBuildingType) {
        this.placement.selectBuilding(null);
      }
      this.onStateUpdate?.();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        if (this.placement.activeBuildingType) {
          this.placement.rotate();
        }
      }
      if (e.key === 'Escape') {
        if (this.placement.roadStartNode) {
          this.placement.cancelRoadDrawing();
        } else {
          this.placement.selectBuilding(null);
          this.selectedBuilding = null;
          this.defenseSystem.showCoverageOverlay = false;
        }
        this.onStateUpdate?.();
      }
    });
  }

  private loadOrSetupStarterCity() {
    const saved = SaveLoadManager.load();
    if (saved && saved.buildings && saved.buildings.length > 0) {
      this.economy.state = saved.economy;
      this.techTree = saved.techTree;
      this.settings = saved.settings;

      saved.roadNodes.forEach((n) => this.roadSystem.nodes.set(n.id, n));
      saved.roadSegments.forEach((s) => {
        const n1 = this.roadSystem.nodes.get(s.startNodeId);
        const n2 = this.roadSystem.nodes.get(s.endNodeId);
        if (n1 && n2) {
          this.roadSystem.addSegment(n1, n2, s.type);
        }
      });

      saved.buildings.forEach((b) => {
        this.instantiateBuildingMesh(b);
        if (b.type === 'mil_airbase') {
          this.airTraffic.registerAirbase(
            b.id,
            b.x,
            this.terrain.getHeight(b.x, b.z),
            b.z,
            b.rotation
          );
        }
      });
      this.buildings = saved.buildings;

      this.log('SUCCESS', 'Restored saved city checkpoint.');
    } else {
      this.setupStarterCity();
    }

    this.trafficSystem.seedTraffic(28);
    this.defenseSystem.updateRadarCoverageRings(this.buildings);
  }

  private setupStarterCity() {
    // 1. Build a crisp, connected city block grid and river/coastal highway bridges
    const xCols = [-48, -24, 0, 24, 44];
    const zRows = [-36, -12, 12, 34];
    const gridNodes: Record<string, RoadNode> = {};

    for (const x of xCols) {
      for (const z of zRows) {
        gridNodes[`${x}_${z}`] = this.roadSystem.addNode(x, z);
      }
    }

    const connectRoad = (
      n1: RoadNode,
      n2: RoadNode,
      type: 'road_two_lane' | 'road_highway' | 'road_bridge'
    ) => {
      this.vegetation.clearRoadCorridor(n1.x, n1.z, n2.x, n2.z, 4.5);
      this.roadSystem.addSegment(n1, n2, type);
    };

    // Horizontal Avenues
    for (const z of zRows) {
      for (let i = 0; i < xCols.length - 1; i++) {
        const n1 = gridNodes[`${xCols[i]}_${z}`];
        const n2 = gridNodes[`${xCols[i + 1]}_${z}`];
        const isMainAve = z === 34 || z === -12;
        connectRoad(n1, n2, isMainAve ? 'road_highway' : 'road_two_lane');
      }
    }

    // Vertical Streets
    for (const x of xCols) {
      for (let j = 0; j < zRows.length - 1; j++) {
        const n1 = gridNodes[`${x}_${zRows[j]}`];
        const n2 = gridNodes[`${x}_${zRows[j + 1]}`];
        connectRoad(n1, n2, x === 0 ? 'road_highway' : 'road_two_lane');
      }
    }

    // Eastern Airbase & Defense District across the River Channel (connected by multi-pier bridges)
    const eastN1 = this.roadSystem.addNode(82, -36);
    const eastN2 = this.roadSystem.addNode(82, -12);
    const eastN3 = this.roadSystem.addNode(82, 12);

    // Main Central River Highway Bridge + Northern Bridge
    connectRoad(gridNodes['44_-12'], eastN2, 'road_bridge');
    connectRoad(gridNodes['44_-36'], eastN1, 'road_bridge');
    // East Bank Avenue
    connectRoad(eastN1, eastN2, 'road_two_lane');
    connectRoad(eastN2, eastN3, 'road_two_lane');

    // 2. Starter Buildings (Matching reference layout: Industrial NW, Central Park & City, Harbor S, Airbase & Radar NE)
    const starterList: {
      id?: string;
      type: BuildingType;
      x: number;
      z: number;
      variant?: number;
    }[] = [
      // Central Park with Tiered Fountain & Cherry Blossoms
      { id: 'bld_init_park', type: 'def_bunker', x: 12, z: 0, variant: 0 },

      // Top-Left Industrial Refinery & Factory Complex (with Spherical Gas Holders, Striped Smokestacks & Yellow Cranes)
      { type: 'ind_factory', x: -36, z: -24, variant: 0 },
      { type: 'ind_warehouse', x: -36, z: -2, variant: 1 },
      { type: 'util_power_plant', x: -58, z: -24, variant: 0 },
      { type: 'ind_factory', x: -58, z: -4, variant: 1 },

      // Cozy Pastel Suburban Homes (4 distinct architectural variants across blocks)
      { type: 'res_low', x: -16, z: -26, variant: 0 },
      { type: 'res_low', x: -8, z: -20, variant: 1 },
      { type: 'res_low', x: 8, z: -26, variant: 2 },
      { type: 'res_low', x: 16, z: -20, variant: 3 },
      { type: 'res_low', x: -16, z: 20, variant: 1 },
      { type: 'res_low', x: -8, z: 26, variant: 2 },
      { type: 'res_low', x: -38, z: 20, variant: 0 },
      { type: 'res_low', x: -30, z: 26, variant: 3 },
      { type: 'res_low', x: 8, z: 20, variant: 0 },
      { type: 'res_low', x: 16, z: 26, variant: 1 },

      // Mid-Rise Pastel Apartments with Balconies & Rotating Rooftop Fans
      { type: 'res_suburb', x: -14, z: -2, variant: 0 },
      { type: 'res_suburb', x: -14, z: 7, variant: 1 },
      { type: 'res_suburb', x: 34, z: 22, variant: 2 },

      // Commercial Shops, Shopping Plaza & Sleek Blue Glass Office Towers
      { type: 'com_retail', x: 12, z: -44, variant: 0 },
      { type: 'com_retail', x: 24, z: -44, variant: 1 },
      { type: 'com_retail', x: -12, z: -44, variant: 2 },
      { type: 'com_mall', x: 34, z: 0, variant: 0 },
      { type: 'com_skyscraper', x: 34, z: -24, variant: 0 },

      // City Hospital with Helipad & Water Treatment Plant
      { type: 'serv_hospital', x: -12, z: 42, variant: 0 },
      { type: 'util_water_pump', x: 34, z: -44, variant: 0 },

      // Southern Harbor Port with Gantry Crane, Containers & Yacht
      { type: 'mil_naval_dock', x: 14, z: 42, variant: 0 },

      // East Bank Military Airbase & Air-Defense Compound (Top-Right across the River)
      { type: 'mil_airbase', x: 96, z: -28, variant: 0 },
      { type: 'def_radar', x: 96, z: -6, variant: 0 },
      { type: 'def_sam_battery', x: 94, z: 6, variant: 0 },
      { type: 'def_sam_battery', x: 106, z: -6, variant: 1 },
      { type: 'mil_barracks', x: 94, z: 18, variant: 0 },
    ];

    starterList.forEach((item, idx) => {
      const def = BUILDING_DEFS[item.type];
      const building: PlacedBuilding = {
        id: item.id || `bld_init_${idx}`,
        type: item.type,
        x: item.x,
        z: item.z,
        rotation: 0,
        width: def.width,
        depth: def.depth,
        health: def.maxHealth,
        maxHealth: def.maxHealth,
        powered: true,
        watered: true,
        active: true,
        level: 1,
        variant: item.variant ?? idx % 4,
        isConstructing: false,
        constructionProgress: 1,
      };
      this.vegetation.clearVegetationAround(item.x, item.z, item.type === 'res_low' ? 3.8 : 7.2);
      this.instantiateBuildingMesh(building);
      this.buildings.push(building);

      if (building.type === 'mil_airbase') {
        this.airTraffic.registerAirbase(
          building.id,
          building.x,
          this.terrain.getHeight(building.x, building.z),
          building.z,
          building.rotation
        );
      }
    });

    // Initial economy state matching reference HUD ($25,680, +2,480/hr, 4,320, +120/hr, 78% power, 92% water)
    this.economy.tick(this.buildings, this.techTree, 0.1, 18);
    this.economy.state.treasury = 25680;
    this.economy.state.population = 4320;
    this.economy.state.netIncome = 2480;
    this.economy.state.powerGenerated = 380;
    this.economy.state.powerConsumed = 296;
    this.economy.state.waterSupplied = 320;
    this.economy.state.waterConsumed = 294;
    this.economy.state.approvalRating = 94;

    this.log('INFO', 'Welcome to WATCH OUT! Expand your city blocks and protect the coastline.');
  }

  public triggerAirDefenseDrill() {
    soundManager.init();
    const threat = this.threatSystem.spawnScriptedTrainingThreat(this.buildings, (entry) =>
      this.log(entry.type, entry.message)
    );
    this.defenseSystem.showCoverageOverlay = true;
    this.onStateUpdate?.();
    return threat;
  }

  private handleBuildingPlacement() {
    if (!this.placement.isValid || !this.placement.activeBuildingType) return;
    const def = BUILDING_DEFS[this.placement.activeBuildingType];

    if (!this.economy.deductFunds(def.cost)) {
      this.log('WARNING', `Insufficient funds! Need $${def.cost.toLocaleString()}`);
      return;
    }

    const building = this.placement.placeBuilding();
    if (!building) return;

    this.instantiateBuildingMesh(building);
    this.buildings.push(building);

    // Spawn brief construction placement dust effect
    const y = this.terrain.getHeight(building.x, building.z);
    for (let i = 0; i < 6; i++) {
      this.particleSystem.spawnSmokePuff(
        building.x + (Math.random() - 0.5) * 3,
        y + 0.5,
        building.z + (Math.random() - 0.5) * 3,
        0xe2e8f0
      );
    }

    if (building.type === 'mil_airbase') {
      this.airTraffic.registerAirbase(
        building.id,
        building.x,
        this.terrain.getHeight(building.x, building.z),
        building.z,
        building.rotation
      );
      this.log('SUCCESS', 'Tactical Airbase operational! Fighter squadron deployed.');
    }

    this.defenseSystem.updateRadarCoverageRings(this.buildings);
    this.log('INFO', `Constructing ${def.name}...`);

    this.onStateUpdate?.();
  }

  private resolveCurrentRoadTargetNode(): RoadNode {
    if (this.placement.snappedNode) {
      return this.placement.snappedNode;
    }
    if (this.placement.snappedSegment) {
      const split = this.roadSystem.splitSegmentAt(
        this.placement.snappedSegment.segment.id,
        this.placement.snappedSegment.x,
        this.placement.snappedSegment.z
      );
      if (split) return split;
    }
    return this.roadSystem.addNode(this.placement.gridPos.x, this.placement.gridPos.z);
  }

  private handleRoadPlacement() {
    if (!this.placement.activeBuildingType || !this.placement.activeBuildingType.startsWith('road_')) return;
    const roadType = this.placement.activeBuildingType as
      | 'road_two_lane'
      | 'road_highway'
      | 'road_bridge';

    if (!this.placement.roadStartNode) {
      this.placement.roadStartNode = this.resolveCurrentRoadTargetNode();
      soundManager.playClick();
      this.onStateUpdate?.();
      return;
    }

    const startNode = this.placement.roadStartNode;
    const endNode = this.resolveCurrentRoadTargetNode();
    if (endNode.id === startNode.id) return;

    const dist = Math.hypot(endNode.x - startNode.x, endNode.z - startNode.z);
    if (dist < 2.0) return;

    const cost = this.placement.roadCostEstimate || 50;
    if (!this.economy.deductFunds(cost)) {
      this.log('WARNING', `Insufficient funds! Road requires $${cost.toLocaleString()}`);
      return;
    }

    this.roadSystem.addSegment(startNode, endNode, roadType);
    this.vegetation.clearVegetationAround(
      (startNode.x + endNode.x) / 2,
      (startNode.z + endNode.z) / 2,
      dist / 2 + 3
    );
    this.vegetation.clearVegetationAround(endNode.x, endNode.z, 6);
    soundManager.playPlace();
    this.log('SUCCESS', `Connected road segment ($${cost}).`);

    this.placement.roadStartNode = endNode;
    this.onStateUpdate?.();
  }

  private handleBuildingClick() {
    this.world.raycaster.setFromCamera(this.world.mousePos, this.world.camera);
    const meshes: THREE.Object3D[] = [];
    this.buildingMeshes.forEach((g) => meshes.push(g));

    const intersects = this.world.raycaster.intersectObjects(meshes, true);
    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !this.buildingMeshes.has(obj.name) && obj.parent) {
        obj = obj.parent;
      }
      if (obj && this.buildingMeshes.has(obj.name)) {
        const found = this.buildings.find((b) => b.id === obj!.name);
        if (found) {
          this.selectedBuilding = found;
          this.defenseSystem.showCoverageOverlay =
            found.type === 'def_radar' ||
            found.type === 'def_sam_battery' ||
            found.type === 'def_ciws';
          soundManager.playClick();
          this.onStateUpdate?.();
          return;
        }
      }
    }

    this.selectedBuilding = null;
    this.defenseSystem.showCoverageOverlay = false;
    this.onStateUpdate?.();
  }

  private instantiateBuildingMesh(building: PlacedBuilding) {
    const group = this.buildingRenderer.createBuildingMesh(building);
    const y = this.terrain.getHeight(building.x, building.z);
    group.position.set(building.x, y, building.z);
    group.rotation.y = building.rotation;

    this.world.scene.add(group);
    this.buildingMeshes.set(building.id, group);
  }

  public demolishBuilding(buildingId: string) {
    const building = this.buildings.find((b) => b.id === buildingId);
    if (!building) return;

    const mesh = this.buildingMeshes.get(buildingId);
    if (mesh) {
      this.world.scene.remove(mesh);
      this.buildingMeshes.delete(buildingId);
    }

    this.buildingRenderer.removeBuildingReferences(buildingId);
    if (building.type === 'mil_airbase') {
      this.airTraffic.unregisterAirbase(buildingId);
    }

    this.buildings = this.buildings.filter((b) => b.id !== buildingId);
    if (this.selectedBuilding?.id === buildingId) {
      this.selectedBuilding = null;
    }

    const refund = Math.round(BUILDING_DEFS[building.type].cost * 0.5);
    this.economy.addFunds(refund);

    soundManager.playDemolish();
    this.defenseSystem.updateRadarCoverageRings(this.buildings);
    this.log('INFO', `Demolished ${BUILDING_DEFS[building.type].name} (+$${refund}).`);

    this.onStateUpdate?.();
  }

  public repairBuilding(buildingId: string) {
    const building = this.buildings.find((b) => b.id === buildingId);
    if (!building) return;

    const repairCost = Math.round(
      (1 - building.health / building.maxHealth) * BUILDING_DEFS[building.type].cost * 0.5
    );
    if (repairCost > 0 && !this.economy.deductFunds(repairCost)) {
      this.log('WARNING', `Insufficient funds for repair ($${repairCost}).`);
      return;
    }

    building.isRepairing = true;
    building.repairProgress = 0.25;
    building.health = Math.min(building.maxHealth, building.health + building.maxHealth * 0.35);
    building.damageFire = false;
    soundManager.playPlace();
    this.log('SUCCESS', `Repairing ${BUILDING_DEFS[building.type].name}...`);
    this.onStateUpdate?.();
  }

  public log(type: CombatLogEntry['type'], message: string) {
    const entry: CombatLogEntry = {
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      type,
      message,
    };
    this.combatLogs.unshift(entry);
    if (this.combatLogs.length > 50) this.combatLogs.pop();
    this.onStateUpdate?.();
  }

  private startLoop() {
    const loop = (timestamp: number) => {
      if (this.isDestroyed) return;

      if (!this.lastTime) this.lastTime = timestamp;
      const rawDelta = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;
      const delta = Math.min(rawDelta, 0.1);

      this.world.handleResize();

      const isPaused = this.simSpeed === 0;
      const simDelta = delta * this.simSpeed;

      // 1. World & Camera
      this.world.update(delta, isPaused);

      // 2. Terrain & Water (paused when simulation is paused)
      if (!isPaused) {
        this.terrain.update(this.gameTimeSeconds);
      }

      // 3. Placement Preview
      const point = this.world.getTerrainIntersection();
      this.placement.updateCursor(point, this.buildings, this.economy.state.treasury);

      // 4. Event-Driven World, Building, Naval, & Construction Animations
      this.animationSystem.update(
        simDelta,
        this.buildings,
        this.buildingMeshes,
        this.world.nightFactor
      );

      // 5. Enemy Compound Animation
      if (!isPaused) {
        this.enemyFaction.update(simDelta);
        this.gameTimeSeconds += simDelta;

        // 6. Traffic & Aircraft
        this.trafficSystem.update(simDelta, this.world.nightFactor);
        this.airTraffic.update(simDelta);

        // 7. Defensive Radar & Missiles
        this.defenseSystem.processDefense(
          this.buildings,
          this.threatSystem.activeThreats,
          timestamp,
          simDelta,
          (logEntry) => this.log(logEntry.type, logEntry.message)
        );
        this.defenseSystem.update(
          simDelta,
          this.threatSystem.activeThreats,
          (threatId) => {
            this.threatSystem.removeThreat(threatId);
            this.economy.addFunds(250);
          },
          (logEntry) => this.log(logEntry.type, logEntry.message)
        );

        // 8. Enemy Threats
        this.threatSystem.update(
          timestamp,
          simDelta,
          this.buildings,
          this.economy.state.threatLevel,
          (buildingId, dmg) => {
            const b = this.buildings.find((item) => item.id === buildingId);
            if (b) {
              b.health = Math.max(0, b.health - dmg);
              b.damageFire = true;
              this.particleSystem.spawnExplosion(
                b.x,
                this.terrain.getHeight(b.x, b.z) + 2,
                b.z,
                30
              );
            }
          },
          (logEntry) => this.log(logEntry.type, logEntry.message)
        );

        // 9. Offensive Missions
        this.missionSystem.update(simDelta, (logEntry) => this.log(logEntry.type, logEntry.message));

        // 10. Research Progression
        this.techTree.forEach((t) => {
          if (t.researching && !t.unlocked) {
            t.progress += (simDelta / t.researchTimeSeconds) * 100;
            if (t.progress >= 100) {
              t.progress = 100;
              t.unlocked = true;
              t.researching = false;
              soundManager.playMissionSuccess();
              this.log('SUCCESS', `Research Complete: ${t.name} (${t.perkDescription})`);
            }
          }
        });

        // 11. Economic Simulation Clock
        this.simAccumulator += simDelta;
        if (this.simAccumulator >= 1.2) {
          this.economy.tick(
            this.buildings,
            this.techTree,
            this.simAccumulator,
            this.trafficSystem.congestionLevel
          );
          this.simAccumulator = 0;
          this.onStateUpdate?.();
        }
      }

      // 12. Particles & Render
      if (!isPaused) {
        this.particleSystem.update(simDelta);
      }
      this.world.renderer.render(this.world.scene, this.world.camera);

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public saveGame(): boolean {
    const success = SaveLoadManager.save(
      this.buildings,
      Array.from(this.roadSystem.nodes.values()),
      Array.from(this.roadSystem.segments.values()),
      this.economy.state,
      this.techTree,
      this.settings
    );
    if (success) {
      this.log('SUCCESS', 'Game state saved.');
    }
    return success;
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
