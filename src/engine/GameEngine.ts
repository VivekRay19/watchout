import * as THREE from 'three';
import {
  BuildingType,
  PlacedBuilding,
  CombatLogEntry,
  GameSettings,
  RoadNode,
  RoadSegment,
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
  public economy: EconomyManager;

  // Game state
  public buildings: PlacedBuilding[] = [];
  public buildingMeshes: Map<string, THREE.Group> = new Map();
  public techTree: TechNode[] = JSON.parse(JSON.stringify(INITIAL_TECH_TREE));
  public combatLogs: CombatLogEntry[] = [];
  public selectedBuilding: PlacedBuilding | null = null;
  public simSpeed: number = 1.0; // 0 = pause, 1 = normal, 2 = fast, 4 = ultra
  public gameTimeSeconds: number = 0;

  // Settings
  public settings: GameSettings = {
    musicVolume: 0.5,
    sfxVolume: 0.7,
    ambienceVolume: 0.4,
    graphicsQuality: 'HIGH',
    shadowsEnabled: true,
    timeOfDay: 14.0,
    dayCycleSpeed: 0.2,
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
    this.terrain = new TerrainGenerator(600, 600, 160);
    this.world = new WorldManager(canvas, this.terrain);
    this.vegetation = new VegetationSystem(this.terrain, 2400);
    this.buildingRenderer = new BuildingRenderer();
    this.placement = new PlacementSystem(this.terrain, this.vegetation);
    this.roadSystem = new RoadSystem(this.terrain);
    this.trafficSystem = new TrafficSystem(this.roadSystem);
    this.airTraffic = new AirTrafficSystem(this.buildingRenderer);
    this.particleSystem = new ParticleSystem();
    this.defenseSystem = new DefenseSystem(this.buildingRenderer, this.particleSystem);
    this.threatSystem = new ThreatSystem(this.particleSystem);
    this.enemyFaction = new EnemyFaction(this.terrain);
    this.economy = new EconomyManager();
    this.missionSystem = new MissionSystem(this.airTraffic, this.enemyFaction, this.economy);

    // Assemble Three.js scene hierarchy
    this.world.scene.add(this.terrain.mesh);
    this.world.scene.add(this.terrain.waterMesh);
    this.world.scene.add(this.vegetation.group);
    this.world.scene.add(this.roadSystem.group);
    this.world.scene.add(this.trafficSystem.group);
    this.world.scene.add(this.airTraffic.group);
    this.world.scene.add(this.particleSystem.group);
    this.world.scene.add(this.defenseSystem.group);
    this.world.scene.add(this.threatSystem.group);
    this.world.scene.add(this.enemyFaction.group);
    this.world.scene.add(this.placement.group);

    this.placement.setRoadSystem(this.roadSystem);

    this.initEventListeners();
    this.loadOrSetupStarterCity();
    this.startLoop();
  }

  private initEventListeners() {
    this.canvas.addEventListener('click', (e) => {
      // Audio unlock on user interaction
      soundManager.init();

      if (e.button !== 0) return;

      // If active building tool is selected, try to place
      if (this.placement.activeBuildingType) {
        if (this.placement.activeBuildingType.startsWith('road_')) {
          this.handleRoadPlacement();
        } else {
          this.handleBuildingPlacement();
        }
        return;
      }

      // Otherwise inspect clicked building
      this.handleBuildingClick();
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (this.placement.roadStartNode) {
        this.placement.cancelRoadDrawing();
        this.log('INFO', 'Road drawing chain finished.');
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
        }
        this.onStateUpdate?.();
      }
    });
  }

  private loadOrSetupStarterCity() {
    const saved = SaveLoadManager.load();
    if (saved && saved.buildings && saved.buildings.length > 0) {
      // Restore save
      this.economy.state = saved.economy;
      this.techTree = saved.techTree;
      this.settings = saved.settings;

      // Restore road nodes & segments
      saved.roadNodes.forEach((n) => this.roadSystem.nodes.set(n.id, n));
      saved.roadSegments.forEach((s) => {
        const n1 = this.roadSystem.nodes.get(s.startNodeId);
        const n2 = this.roadSystem.nodes.get(s.endNodeId);
        if (n1 && n2) {
          this.roadSystem.addSegment(n1, n2, s.type);
        }
      });

      // Restore buildings
      saved.buildings.forEach((b) => this.instantiateBuildingMesh(b));
      this.buildings = saved.buildings;

      this.log('SUCCESS', `Game successfully restored from saved checkpoint.`);
    } else {
      // Build starter town
      this.setupStarterCity();
    }

    this.defenseSystem.updateRadarCoverageRings(this.buildings);
  }

  private setupStarterCity() {
    // 1. Starter central road avenue
    const n1 = this.roadSystem.addNode(-24, 0);
    const n2 = this.roadSystem.addNode(0, 0);
    const n3 = this.roadSystem.addNode(24, 0);
    const n4 = this.roadSystem.addNode(0, -24);
    const n5 = this.roadSystem.addNode(0, 24);

    this.roadSystem.addSegment(n1, n2, 'road_two_lane');
    this.roadSystem.addSegment(n2, n3, 'road_two_lane');
    this.roadSystem.addSegment(n2, n4, 'road_two_lane');
    this.roadSystem.addSegment(n2, n5, 'road_two_lane');

    // 2. Starter Buildings
    const starterList: { type: BuildingType; x: number; z: number }[] = [
      { type: 'res_low', x: -12, z: 12 },
      { type: 'res_low', x: 12, z: 12 },
      { type: 'com_retail', x: 12, z: -12 },
      { type: 'util_solar', x: -12, z: -12 },
      { type: 'def_radar', x: -28, z: -28 },
      { type: 'def_sam_battery', x: -20, z: -20 },
    ];

    starterList.forEach((item) => {
      const def = BUILDING_DEFS[item.type];
      const building: PlacedBuilding = {
        id: `bld_init_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
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
      };
      this.vegetation.clearVegetationAround(item.x, item.z, 14);
      this.instantiateBuildingMesh(building);
      this.buildings.push(building);
    });

    this.log('INFO', 'Welcome to WATCH OUT! Commander, your central regional sector is established.');
    this.log('ALERT', 'Satellite reconnaissance reports hostile military build-up in Sector Charlie.');
  }

  private handleBuildingPlacement() {
    if (!this.placement.isValid || !this.placement.activeBuildingType) return;
    const def = BUILDING_DEFS[this.placement.activeBuildingType];

    if (!this.economy.deductFunds(def.cost)) {
      this.log('WARNING', `Insufficient Treasury! Need $${def.cost.toLocaleString()}`);
      return;
    }

    const building = this.placement.placeBuilding();
    if (!building) return;

    this.instantiateBuildingMesh(building);
    this.buildings.push(building);

    // If military airbase, register with air traffic system
    if (building.type === 'mil_airbase') {
      this.airTraffic.registerAirbase(building.id, building.x, this.terrain.getHeight(building.x, building.z), building.z, building.rotation);
      this.log('SUCCESS', `Joint Tactical Airbase commissioned! Multirole stealth fighter squadron active.`);
    }

    this.defenseSystem.updateRadarCoverageRings(this.buildings);
    this.log('INFO', `Constructed ${def.name} at coordinates [${building.x}, ${building.z}].`);

    this.onStateUpdate?.();
  }

  private handleRoadPlacement() {
    if (!this.placement.activeBuildingType || !this.placement.activeBuildingType.startsWith('road_')) return;
    const roadType = this.placement.activeBuildingType as any;

    // Step 1: Anchor start node
    if (!this.placement.roadStartNode) {
      if (this.placement.snappedNode) {
        this.placement.roadStartNode = this.placement.snappedNode;
      } else {
        const startNode = this.roadSystem.addNode(this.placement.gridPos.x, this.placement.gridPos.z);
        this.placement.roadStartNode = startNode;
      }
      soundManager.playClick();
      this.log('INFO', 'Road anchor established. Click destination point to construct road segment.');
      this.onStateUpdate?.();
      return;
    }

    // Step 2: Connect to destination node
    const startNode = this.placement.roadStartNode;
    let endNode: RoadNode;

    if (this.placement.snappedNode) {
      if (this.placement.snappedNode.id === startNode.id) return; // Cannot connect to self
      endNode = this.placement.snappedNode;
    } else {
      endNode = this.roadSystem.addNode(this.placement.gridPos.x, this.placement.gridPos.z);
    }

    const dist = Math.hypot(endNode.x - startNode.x, endNode.z - startNode.z);
    if (dist < 2.0) return; // Prevent zero-length road segments

    const cost = this.placement.roadCostEstimate || 50;
    if (!this.economy.deductFunds(cost)) {
      this.log('WARNING', `Insufficient Treasury! Road construction requires $${cost.toLocaleString()}`);
      return;
    }

    this.roadSystem.addSegment(startNode, endNode, roadType);
    this.vegetation.clearVegetationAround((startNode.x + endNode.x) / 2, (startNode.z + endNode.z) / 2, dist / 2 + 3);
    this.vegetation.clearVegetationAround(endNode.x, endNode.z, 6);
    soundManager.playPlace();
    this.log('SUCCESS', `Constructed ${roadType === 'road_highway' ? 'Highway' : 'Avenue'} segment ($${cost}).`);

    // Chain continuation: next road segment starts from this end node
    this.placement.roadStartNode = endNode;
    this.onStateUpdate?.();
  }

  private handleBuildingClick() {
    this.world.raycaster.setFromCamera(this.world.mousePos, this.world.camera);
    const meshes: THREE.Object3D[] = [];
    this.buildingMeshes.forEach((g) => meshes.push(g));

    const intersects = this.world.raycaster.intersectObjects(meshes, true);
    if (intersects.length > 0) {
      // Find top group
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !this.buildingMeshes.has(obj.name) && obj.parent) {
        obj = obj.parent;
      }
      if (obj && this.buildingMeshes.has(obj.name)) {
        const found = this.buildings.find((b) => b.id === obj!.name);
        if (found) {
          this.selectedBuilding = found;
          soundManager.playClick();
          this.onStateUpdate?.();
          return;
        }
      }
    }

    this.selectedBuilding = null;
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

    this.buildings = this.buildings.filter((b) => b.id !== buildingId);
    if (this.selectedBuilding?.id === buildingId) {
      this.selectedBuilding = null;
    }

    // Refund 40% of building cost
    const refund = Math.round(BUILDING_DEFS[building.type].cost * 0.4);
    this.economy.addFunds(refund);

    soundManager.playDemolish();
    this.defenseSystem.updateRadarCoverageRings(this.buildings);
    this.log('INFO', `Demolished ${BUILDING_DEFS[building.type].name}. Salvaged +$${refund}`);

    this.onStateUpdate?.();
  }

  public repairBuilding(buildingId: string) {
    const building = this.buildings.find((b) => b.id === buildingId);
    if (!building) return;

    const repairCost = Math.round((1 - building.health / building.maxHealth) * BUILDING_DEFS[building.type].cost * 0.5);
    if (repairCost > 0 && !this.economy.deductFunds(repairCost)) {
      this.log('WARNING', `Insufficient Funds for repairs: Need $${repairCost}`);
      return;
    }

    building.health = building.maxHealth;
    building.damageFire = false;
    soundManager.playPlace();
    this.log('SUCCESS', `Repaired ${BUILDING_DEFS[building.type].name} to full operational condition.`);
    this.onStateUpdate?.();
  }

  public log(type: CombatLogEntry['type'], message: string) {
    const entry: CombatLogEntry = {
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
    };
    this.combatLogs.unshift(entry);
    if (this.combatLogs.length > 50) this.combatLogs.pop();
    this.onStateUpdate?.();
  }

  // Master Game Loop
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

      // 2. Terrain & Water
      this.terrain.update(timestamp * 0.001);

      // 3. Placement Preview
      const point = this.world.getTerrainIntersection();
      this.placement.updateCursor(point, this.buildings, this.economy.state.treasury);

      // 4. Building Animations (Rotating Radars)
      this.buildingRenderer.animatedRadars.forEach((r) => {
        r.rotation.y += delta * 1.5;
      });
      this.buildingRenderer.updateNightLighting(this.world.isNight);
      this.roadSystem.updateNightLighting(this.world.isNight);

      // 5. Enemy Compound Animation
      this.enemyFaction.update(delta);

      if (!isPaused) {
        this.gameTimeSeconds += simDelta;

        // 6. Traffic & Aircraft
        this.trafficSystem.update(simDelta, this.world.isNight);
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
          (threatId) => this.threatSystem.removeThreat(threatId),
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
              this.particleSystem.spawnExplosion(b.x, this.terrain.getHeight(b.x, b.z) + 2, b.z, 30);
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
              this.log('SUCCESS', `TECHNOLOGY DISCOVERY: [${t.name}] research completed! ${t.perkDescription}`);
            }
          }
        });

        // 11. Economic Simulation Clock (ticks every 1.5 seconds)
        this.simAccumulator += simDelta;
        if (this.simAccumulator >= 1.5) {
          this.economy.tick(this.buildings, this.techTree, this.simAccumulator);
          this.simAccumulator = 0;
          this.onStateUpdate?.();
        }
      }

      // 12. Particles & Render
      this.particleSystem.update(delta);
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
      this.log('SUCCESS', 'Game state saved to local storage.');
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
