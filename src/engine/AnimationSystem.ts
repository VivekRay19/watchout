import * as THREE from 'three';
import { PlacedBuilding } from '../types/game';
import { BuildingRenderer } from './BuildingRenderer';
import { TerrainGenerator } from './TerrainGenerator';
import { ParticleSystem } from './ParticleSystem';
import { VegetationSystem } from './VegetationSystem';
import { RoadSystem } from './RoadSystem';

interface NavalVessel {
  id: string;
  mesh: THREE.Group;
  wakeLeft: THREE.Mesh;
  wakeRight: THREE.Mesh;
  x: number;
  z: number;
  speed: number;
  direction: 1 | -1;
}

export class AnimationSystem {
  public group: THREE.Group;
  private buildingRenderer: BuildingRenderer;
  private terrain: TerrainGenerator;
  private particleSystem: ParticleSystem;
  private vegetation: VegetationSystem;
  private roadSystem: RoadSystem;

  public vessels: NavalVessel[] = [];
  private simTime = 0;
  private smokeTimer = 0;
  private leafTimer = 0;

  constructor(
    buildingRenderer: BuildingRenderer,
    terrain: TerrainGenerator,
    particleSystem: ParticleSystem,
    vegetation: VegetationSystem,
    roadSystem: RoadSystem
  ) {
    this.buildingRenderer = buildingRenderer;
    this.terrain = terrain;
    this.particleSystem = particleSystem;
    this.vegetation = vegetation;
    this.roadSystem = roadSystem;
    this.group = new THREE.Group();

    this.initCoastalLighthouses();
    this.initNavalTraffic();
  }

  private initCoastalLighthouses() {
    // Two rocky coastal islets on the right bay matching the reference image
    const isletCoords = [
      { x: 76, z: 20 },
      { x: 72, z: 42 },
    ];

    for (const pos of isletCoords) {
      const lh = this.buildingRenderer.createLighthouseMesh();
      const y = Math.max(this.terrain.waterLevel + 0.35, this.terrain.getHeight(pos.x, pos.z));
      lh.position.set(pos.x, y, pos.z);
      this.group.add(lh);
    }
  }

  private initNavalTraffic() {
    // 1. Primary Container Cargo Ship sailing down the river channel (visible near bridge in reference)
    const cargoShip = this.buildingRenderer.createCargoShipMesh();
    const wakeMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });

    const wakeGeo = new THREE.PlaneGeometry(1.1, 10.5);
    wakeGeo.rotateX(-Math.PI / 2);

    const wakeL = new THREE.Mesh(wakeGeo, wakeMat);
    wakeL.position.set(-2.1, 0.08, -7.2);
    wakeL.rotation.y = 0.22;
    cargoShip.add(wakeL);

    const wakeR = new THREE.Mesh(wakeGeo, wakeMat);
    wakeR.position.set(2.1, 0.08, -7.2);
    wakeR.rotation.y = -0.22;
    cargoShip.add(wakeR);

    cargoShip.position.set(62.0, this.terrain.waterLevel, 12);
    this.group.add(cargoShip);

    this.vessels.push({
      id: 'vessel_cargo_main',
      mesh: cargoShip,
      wakeLeft: wakeL,
      wakeRight: wakeR,
      x: 62.0,
      z: 12,
      speed: 2.8,
      direction: 1,
    });

    // 2. Secondary Coastal Supply Vessel in the southern outer bay channel
    const supplyShip = this.buildingRenderer.createCargoShipMesh();
    supplyShip.scale.setScalar(0.68);
    const sWakeL = new THREE.Mesh(wakeGeo, wakeMat);
    sWakeL.position.set(-2.0, 0.08, -7.0);
    sWakeL.rotation.y = 0.22;
    supplyShip.add(sWakeL);

    const sWakeR = new THREE.Mesh(wakeGeo, wakeMat);
    sWakeR.position.set(2.0, 0.08, -7.0);
    sWakeR.rotation.y = -0.22;
    supplyShip.add(sWakeR);

    supplyShip.position.set(54.0, this.terrain.waterLevel, 56);
    supplyShip.rotation.y = Math.PI;
    this.group.add(supplyShip);

    this.vessels.push({
      id: 'vessel_supply_2',
      mesh: supplyShip,
      wakeLeft: sWakeL,
      wakeRight: sWakeR,
      x: 54.0,
      z: 56,
      speed: 2.2,
      direction: -1,
    });
  }

  public update(
    simDelta: number,
    buildings: PlacedBuilding[],
    _buildingMeshes: Map<string, THREE.Group>,
    nightFactor: number
  ) {
    // 1. Update lighting on buildings and roads
    this.buildingRenderer.updateNightLighting(nightFactor);
    this.roadSystem.updateNightLighting(nightFactor);

    // When simulation is paused, freeze all simulation-driven animations
    if (simDelta <= 0) return;

    this.simTime += simDelta;

    // 2. Update Vegetation Wind Sway & Traffic Signals
    this.vegetation.update(this.simTime, false);
    this.roadSystem.updateTrafficSignals(this.simTime);

    // 3. Update Coastal Lighthouse Beacons
    for (const beam of this.buildingRenderer.lighthouseBeams) {
      beam.rotation.y += simDelta * 1.35;
    }

    // 4. Update Naval Vessels & Water Wakes within open bay waters
    for (const v of this.vessels) {
      v.z += v.speed * v.direction * simDelta;
      const minZ = v.id === 'vessel_cargo_main' ? 2 : 48;
      const maxZ = 92;
      if (v.direction === 1 && v.z > maxZ) {
        v.direction = -1;
      } else if (v.direction === -1 && v.z < minZ) {
        v.direction = 1;
      }

      const waveBob = Math.sin(this.simTime * 2.1 + v.x) * 0.06;
      const waveRoll = Math.cos(this.simTime * 1.6 + v.z * 0.1) * 0.025;
      v.mesh.position.set(v.x, this.terrain.waterLevel + waveBob, v.z);
      v.mesh.rotation.y = v.direction === 1 ? 0 : Math.PI;
      v.mesh.rotation.z = waveRoll;

      const wakeScale = 0.92 + Math.sin(this.simTime * 5.0) * 0.12;
      v.wakeLeft.scale.set(wakeScale, 1, 1 + Math.cos(this.simTime * 4.0) * 0.08);
      v.wakeRight.scale.set(wakeScale, 1, 1 + Math.sin(this.simTime * 4.0) * 0.08);
    }

    // 5. Lookup map for building state so animations strictly reflect operational status
    const buildingMap = new Map<string, PlacedBuilding>();
    for (const b of buildings) {
      buildingMap.set(b.id, b);

      // Staged construction progression (0 -> 1 over ~3.2s)
      if (b.isConstructing) {
        b.constructionProgress = Math.min(1, (b.constructionProgress ?? 0) + simDelta * 0.32);
        if (Math.random() < 0.25) {
          const y = this.terrain.getHeight(b.x, b.z);
          this.particleSystem.spawnSmokePuff(b.x, y + 0.8, b.z, 0xd6d3d1);
        }
        if (b.constructionProgress >= 1) {
          b.isConstructing = false;
          b.constructionProgress = 1;
        }
      }

      // Staged repair progression
      if (b.isRepairing) {
        b.repairProgress = Math.min(1, (b.repairProgress ?? 0) + simDelta * 0.35);
        b.health = Math.min(b.maxHealth, b.health + b.maxHealth * simDelta * 0.35);
        if (b.repairProgress >= 1 || b.health >= b.maxHealth) {
          b.health = b.maxHealth;
          b.isRepairing = false;
          b.repairProgress = 1;
          b.damageFire = false;
        }
      }

      this.buildingRenderer.updateBuildingStage(b);
    }

    // 6. Event-Driven Building Sub-Component Animations (ONLY when active, powered, and constructed)
    for (const r of this.buildingRenderer.animatedRadars) {
      const b = buildingMap.get(r.id);
      if (b && b.active && b.powered && !b.isConstructing && b.health > 0) {
        r.object.rotation.y += simDelta * 1.5;
      }
    }

    for (const fan of this.buildingRenderer.animatedFans) {
      const b = buildingMap.get(fan.id);
      if (b && b.active && b.powered && !b.isConstructing && b.health > 0) {
        fan.object.rotation.y += simDelta * 4.5;
      }
    }

    for (const crane of this.buildingRenderer.animatedCranes) {
      const b = buildingMap.get(crane.id);
      if (b && b.active && b.powered && !b.isConstructing && b.health > 0) {
        crane.object.rotation.y =
          crane.baseAngle + Math.sin(this.simTime * crane.speed) * 0.65;
      }
    }

    for (const ftn of this.buildingRenderer.fountainSprays) {
      const pulse = 0.88 + Math.sin(this.simTime * 6.0) * 0.16;
      ftn.scale.set(1, pulse, 1);
    }

    // 7. Periodic Industrial Smoke, Cooling Steam, & Damaged Building Fire/Smoke
    this.smokeTimer += simDelta;
    if (this.smokeTimer >= 0.32) {
      this.smokeTimer = 0;

      for (const emitter of this.buildingRenderer.smokeStacks) {
        const b = buildingMap.get(emitter.id);
        if (b && b.active && b.powered && !b.isConstructing && b.health > 0) {
          const baseY = this.terrain.getHeight(b.x, b.z);
          this.particleSystem.spawnSmokePuff(
            b.x + emitter.localPos.x,
            baseY + emitter.localPos.y,
            b.z + emitter.localPos.z,
            emitter.kind === 'steam' ? 0xf8fafc : 0xcbd5e1
          );
        }
      }

      // Damaged buildings emit dark smoke
      for (const b of buildings) {
        if (b.damageFire || b.health < b.maxHealth * 0.8) {
          const baseY = this.terrain.getHeight(b.x, b.z);
          this.particleSystem.spawnSmokePuff(b.x, baseY + 2.4, b.z, 0x475569);
        }
      }
    }

    // 8. Occasional Gentle Falling Cherry Blossom Petals / Leaves in Central Park
    this.leafTimer += simDelta;
    if (this.leafTimer >= 0.9) {
      this.leafTimer = 0;
      const park = buildings.find((b) => b.type === 'def_bunker' && !b.isConstructing);
      if (park) {
        const baseY = this.terrain.getHeight(park.x, park.z);
        this.particleSystem.spawnSmokePuff(
          park.x + (Math.random() - 0.5) * 6,
          baseY + 2.2,
          park.z + (Math.random() - 0.5) * 6,
          0xf9a8d4
        );
      }
    }
  }
}
