import * as THREE from 'three';
import { BuildingType, PlacedBuilding } from '../types/game';
import { BUILDING_DEFS } from '../data/buildingDefs';

export class BuildingRenderer {
  // Shared materials for optimal performance & batching
  private materials: { [key: string]: THREE.Material } = {};
  public animatedRadars: THREE.Object3D[] = [];
  public samLaunchers: { id: string; base: THREE.Object3D; pitchMount: THREE.Object3D }[] = [];

  constructor() {
    this.initMaterials();
  }

  private initMaterials() {
    // Structural materials
    this.materials.concrete = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.8, metalness: 0.1 });
    this.materials.darkConcrete = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.85, metalness: 0.15 });
    this.materials.brickRed = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.75, metalness: 0.05 });
    this.materials.roofDark = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6, metalness: 0.2 });
    this.materials.roofTerracotta = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.7, metalness: 0.1 });
    this.materials.glass = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, metalness: 0.8, transparent: true, opacity: 0.85 });
    this.materials.glassNight = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.8, roughness: 0.3 });
    this.materials.solarBlue = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.2, metalness: 0.85 });
    this.materials.metalIndustrial = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.7 });
    this.materials.militaryGreen = new THREE.MeshStandardMaterial({ color: 0x3f4d38, roughness: 0.7, metalness: 0.2 });
    this.materials.militaryCamo = new THREE.MeshStandardMaterial({ color: 0x475542, roughness: 0.65, metalness: 0.3 });
    this.materials.radarDish = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.8 });
    this.materials.asphalt = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, metalness: 0.05 });
    this.materials.markingYellow = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    this.materials.markingWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.materials.redCross = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    this.materials.neonCyan = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 1.0 });
  }

  public updateNightLighting(isNight: boolean) {
    if (this.materials.glassNight instanceof THREE.MeshStandardMaterial) {
      this.materials.glassNight.emissiveIntensity = isNight ? 1.0 : 0.05;
    }
  }

  public createBuildingMesh(building: PlacedBuilding): THREE.Group {
    const group = new THREE.Group();
    group.name = building.id;

    const def = BUILDING_DEFS[building.type];
    const width = def.width * 4; // 4 world units per grid cell
    const depth = def.depth * 4;

    switch (building.type) {
      // --- RESIDENTIAL ---
      case 'res_low':
        this.buildSuburbanHouses(group, width, depth);
        break;
      case 'res_suburb':
        this.buildTownhouses(group, width, depth);
        break;
      case 'res_high':
        this.buildHighRiseCondos(group, width, depth);
        break;

      // --- COMMERCIAL ---
      case 'com_retail':
        this.buildRetailPlaza(group, width, depth);
        break;
      case 'com_mall':
        this.buildShoppingMall(group, width, depth);
        break;
      case 'com_skyscraper':
        this.buildCorporateSkyscraper(group, width, depth);
        break;

      // --- INDUSTRIAL ---
      case 'ind_factory':
        this.buildFactory(group, width, depth);
        break;
      case 'ind_warehouse':
        this.buildWarehouse(group, width, depth);
        break;
      case 'ind_heavy':
        this.buildAerospacePlant(group, width, depth);
        break;

      // --- UTILITIES ---
      case 'util_solar':
        this.buildSolarFarm(group, width, depth);
        break;
      case 'util_power_plant':
        this.buildPowerPlant(group, width, depth);
        break;
      case 'util_water_pump':
        this.buildWaterPump(group, width, depth);
        break;

      // --- SERVICES ---
      case 'serv_hospital':
        this.buildHospital(group, width, depth);
        break;
      case 'serv_police':
        this.buildPoliceStation(group, width, depth);
        break;
      case 'serv_fire':
        this.buildFireStation(group, width, depth);
        break;

      // --- DEFENSE ---
      case 'def_radar':
        this.buildRadarStation(group, width, depth, building.id);
        break;
      case 'def_sam_battery':
        this.buildSamBattery(group, width, depth, building.id);
        break;
      case 'def_ciws':
        this.buildCiws(group, width, depth);
        break;
      case 'def_bunker':
        this.buildSubterraneanBunker(group, width, depth);
        break;

      // --- MILITARY ---
      case 'mil_hq':
        this.buildMilitaryHq(group, width, depth);
        break;
      case 'mil_barracks':
        this.buildMilitaryBarracks(group, width, depth);
        break;
      case 'mil_airbase':
        this.buildAirbase(group, width, depth);
        break;
      case 'mil_naval_dock':
        this.buildNavalDock(group, width, depth);
        break;

      // --- RESEARCH ---
      case 'res_lab':
        this.buildResearchLab(group, width, depth);
        break;

      default:
        // Generic fallback box
        const boxGeo = new THREE.BoxGeometry(width, 4, depth);
        const box = new THREE.Mesh(boxGeo, this.materials.concrete);
        box.position.y = 2;
        box.castShadow = true;
        group.add(box);
        break;
    }

    // Shadow flags for all children
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return group;
  }

  // --- RESIDENTIAL BUILDERS ---
  private buildSuburbanHouses(group: THREE.Group, w: number, d: number) {
    // Base foundation
    const ground = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.2, d * 0.95), this.materials.darkConcrete);
    ground.position.y = 0.1;
    group.add(ground);

    // Two small suburban family houses
    const offsets = [
      { x: -w * 0.22, z: 0 },
      { x: w * 0.22, z: 0 },
    ];

    offsets.forEach((off, i) => {
      const houseWidth = w * 0.4;
      const houseDepth = d * 0.7;
      const houseHeight = 2.4;

      const walls = new THREE.Mesh(new THREE.BoxGeometry(houseWidth, houseHeight, houseDepth), this.materials.concrete);
      walls.position.set(off.x, houseHeight / 2 + 0.2, off.z);
      group.add(walls);

      // Pitched roof
      const roofGeo = new THREE.ConeGeometry(houseWidth * 0.75, 1.4, 4);
      roofGeo.rotateY(Math.PI / 4);
      const roof = new THREE.Mesh(roofGeo, i === 0 ? this.materials.roofTerracotta : this.materials.roofDark);
      roof.position.set(off.x, houseHeight + 0.9, off.z);
      group.add(roof);

      // Lit Windows
      const winGeo = new THREE.PlaneGeometry(0.8, 0.8);
      const win = new THREE.Mesh(winGeo, this.materials.glassNight);
      win.position.set(off.x, houseHeight * 0.6 + 0.2, off.z + houseDepth / 2 + 0.02);
      group.add(win);
    });
  }

  private buildTownhouses(group: THREE.Group, w: number, d: number) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.2, d * 0.95), this.materials.darkConcrete);
    base.position.y = 0.1;
    group.add(base);

    const units = 3;
    const unitWidth = (w * 0.88) / units;
    for (let i = 0; i < units; i++) {
      const h = 4.2 + (i % 2) * 0.5;
      const x = -w * 0.44 + unitWidth * (i + 0.5);
      const block = new THREE.Mesh(new THREE.BoxGeometry(unitWidth * 0.92, h, d * 0.8), this.materials.concrete);
      block.position.set(x, h / 2 + 0.2, 0);
      group.add(block);

      // Roof terrace
      const roofRailing = new THREE.Mesh(new THREE.BoxGeometry(unitWidth * 0.9, 0.4, d * 0.78), this.materials.roofDark);
      roofRailing.position.set(x, h + 0.4, 0);
      group.add(roofRailing);

      // Windows
      const win = new THREE.Mesh(new THREE.PlaneGeometry(unitWidth * 0.6, 1.0), this.materials.glassNight);
      win.position.set(x, h * 0.6, d * 0.4 + 0.02);
      group.add(win);
    }
  }

  private buildHighRiseCondos(group: THREE.Group, w: number, d: number) {
    // Twin tower luxury complex
    const h1 = 14.0;
    const h2 = 18.5;

    // Podium
    const podium = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 2.0, d * 0.95), this.materials.darkConcrete);
    podium.position.y = 1.0;
    group.add(podium);

    // Tower 1
    const tower1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, h1, d * 0.7), this.materials.glass);
    tower1.position.set(-w * 0.24, h1 / 2 + 2.0, 0);
    group.add(tower1);

    // Tower 2
    const tower2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, h2, d * 0.7), this.materials.concrete);
    tower2.position.set(w * 0.24, h2 / 2 + 2.0, 0);
    group.add(tower2);

    // Window bands on tower 2
    for (let y = 3; y < h2; y += 2.2) {
      const band = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.38, 0.9), this.materials.glassNight);
      band.position.set(w * 0.24, y + 2.0, d * 0.35 + 0.02);
      group.add(band);
    }

    // Rooftop HVAC units
    const hvac = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 2.0), this.materials.metalIndustrial);
    hvac.position.set(w * 0.24, h2 + 2.6, 0);
    group.add(hvac);
  }

  // --- COMMERCIAL BUILDERS ---
  private buildRetailPlaza(group: THREE.Group, w: number, d: number) {
    const main = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 3.2, d * 0.8), this.materials.concrete);
    main.position.y = 1.6;
    group.add(main);

    // Glass frontage
    const glassFront = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.85, 2.0), this.materials.glassNight);
    glassFront.position.set(0, 1.3, d * 0.4 + 0.02);
    group.add(glassFront);

    // Storefront canopy
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 0.2, 1.2), this.materials.metalIndustrial);
    canopy.position.set(0, 2.4, d * 0.4 + 0.6);
    group.add(canopy);

    // Glowing Neon Brand Logo
    const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.6, 0.1), this.materials.neonCyan);
    sign.position.set(0, 2.8, d * 0.4 + 0.05);
    group.add(sign);
  }

  private buildShoppingMall(group: THREE.Group, w: number, d: number) {
    const main = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 4.5, d * 0.92), this.materials.darkConcrete);
    main.position.y = 2.25;
    group.add(main);

    // Glass atrium dome
    const domeGeo = new THREE.SphereGeometry(w * 0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeo, this.materials.glass);
    dome.position.set(0, 4.5, 0);
    group.add(dome);

    // Entrance portico
    const portico = new THREE.Mesh(new THREE.BoxGeometry(4.0, 3.0, 1.5), this.materials.concrete);
    portico.position.set(0, 1.5, d * 0.46 + 0.75);
    group.add(portico);
  }

  private buildCorporateSkyscraper(group: THREE.Group, w: number, d: number) {
    const h = 26.0;
    // Tapered sleek modern office tower
    const tower = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, h, d * 0.82), this.materials.glass);
    tower.position.y = h / 2;
    group.add(tower);

    // Corner structural pillars
    const pillarMat = this.materials.darkConcrete;
    const pGeo = new THREE.BoxGeometry(0.8, h, 0.8);
    const p1 = new THREE.Mesh(pGeo, pillarMat);
    p1.position.set(-w * 0.41, h / 2, -d * 0.41);
    const p2 = new THREE.Mesh(pGeo, pillarMat);
    p2.position.set(w * 0.41, h / 2, -d * 0.41);
    const p3 = new THREE.Mesh(pGeo, pillarMat);
    p3.position.set(-w * 0.41, h / 2, d * 0.41);
    const p4 = new THREE.Mesh(pGeo, pillarMat);
    p4.position.set(w * 0.41, h / 2, d * 0.41);
    group.add(p1, p2, p3, p4);

    // Rooftop Helipad
    const heliPad = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.32, w * 0.32, 0.3, 16), this.materials.asphalt);
    heliPad.position.set(0, h + 0.15, 0);
    group.add(heliPad);

    // Rooftop Communication Spire / Beacon
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.25, 6.0, 6), this.materials.metalIndustrial);
    spire.position.set(0, h + 3.2, 0);
    group.add(spire);

    // Warning Red Beacon at the tip
    const redLight = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    redLight.position.set(0, h + 6.2, 0);
    group.add(redLight);
  }

  // --- INDUSTRIAL BUILDERS ---
  private buildFactory(group: THREE.Group, w: number, d: number) {
    // Sawtooth / gabled industrial manufacturing building
    const main = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 3.5, d * 0.75), this.materials.metalIndustrial);
    main.position.y = 1.75;
    group.add(main);

    // Twin Smoking Chimney Stacks
    const chimneyGeo = new THREE.CylinderGeometry(0.6, 0.9, 7.5, 8);
    const c1 = new THREE.Mesh(chimneyGeo, this.materials.brickRed);
    c1.position.set(-w * 0.3, 3.75, -d * 0.25);
    const c2 = new THREE.Mesh(chimneyGeo, this.materials.brickRed);
    c2.position.set(-w * 0.15, 3.75, -d * 0.25);
    group.add(c1, c2);

    // Storage tanks
    const tankGeo = new THREE.CylinderGeometry(1.2, 1.2, 3.0, 10);
    const tank = new THREE.Mesh(tankGeo, this.materials.darkConcrete);
    tank.position.set(w * 0.25, 1.5, d * 0.2);
    group.add(tank);
  }

  private buildWarehouse(group: THREE.Group, w: number, d: number) {
    const warehouse = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 3.8, d * 0.9), this.materials.darkConcrete);
    warehouse.position.y = 1.9;
    group.add(warehouse);

    // Loading dock roller doors
    for (let i = -1; i <= 1; i++) {
      const door = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.2), this.materials.roofDark);
      door.position.set(i * 2.8, 1.1, d * 0.45 + 0.02);
      group.add(door);
    }
  }

  private buildAerospacePlant(group: THREE.Group, w: number, d: number) {
    // High-tech fabrication complex with cleanroom filtration domes
    const base = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 4.0, d * 0.92), this.materials.concrete);
    base.position.y = 2.0;
    group.add(base);

    // Spherical cryogenic fuel/gas tanks
    const sphereGeo = new THREE.SphereGeometry(1.8, 12, 12);
    const s1 = new THREE.Mesh(sphereGeo, this.materials.metalIndustrial);
    s1.position.set(-w * 0.3, 2.0, -d * 0.28);
    const s2 = new THREE.Mesh(sphereGeo, this.materials.metalIndustrial);
    s2.position.set(-w * 0.05, 2.0, -d * 0.28);
    group.add(s1, s2);

    // Clean-room air scrubber tower
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 7.0, 12), this.materials.metalIndustrial);
    tower.position.set(w * 0.28, 3.5, 0);
    group.add(tower);
  }

  // --- UTILITY BUILDERS ---
  private buildSolarFarm(group: THREE.Group, w: number, d: number) {
    const ground = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.1, d * 0.95), this.materials.darkConcrete);
    ground.position.y = 0.05;
    group.add(ground);

    // Rows of tilted blue photovoltaic panels
    const panelGeo = new THREE.BoxGeometry(1.8, 0.08, 1.2);
    const panelMat = this.materials.solarBlue;

    for (let row = -1; row <= 1; row++) {
      for (let col = -1; col <= 1; col++) {
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.set(col * 2.4, 0.8, row * 2.2);
        panel.rotation.x = -0.45; // Angled toward the sun
        group.add(panel);

        // Mounting stand
        const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8), this.materials.metalIndustrial);
        stand.position.set(col * 2.4, 0.4, row * 2.2);
        group.add(stand);
      }
    }
  }

  private buildPowerPlant(group: THREE.Group, w: number, d: number) {
    // Massive base
    const base = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 2.5, d * 0.95), this.materials.darkConcrete);
    base.position.y = 1.25;
    group.add(base);

    // Hyperbolic cooling towers
    const coolingGeo = new THREE.CylinderGeometry(2.4, 3.8, 10.0, 16, 1, true);
    const tower1 = new THREE.Mesh(coolingGeo, this.materials.concrete);
    tower1.position.set(-w * 0.25, 6.25, 0);
    const tower2 = new THREE.Mesh(coolingGeo, this.materials.concrete);
    tower2.position.set(w * 0.25, 6.25, 0);
    group.add(tower1, tower2);

    // Transformer substation
    const sub = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.8, 3.0), this.materials.metalIndustrial);
    sub.position.set(0, 3.4, d * 0.28);
    group.add(sub);
  }

  private buildWaterPump(group: THREE.Group, w: number, d: number) {
    const main = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 2.5, d * 0.85), this.materials.concrete);
    main.position.y = 1.25;
    group.add(main);

    // Intake pipeline tubes
    const pipeGeo = new THREE.CylinderGeometry(0.5, 0.5, 4.0, 8);
    pipeGeo.rotateX(Math.PI / 2);
    const pipe1 = new THREE.Mesh(pipeGeo, this.materials.metalIndustrial);
    pipe1.position.set(-1.2, 0.6, d * 0.45 + 1.5);
    const pipe2 = new THREE.Mesh(pipeGeo, this.materials.metalIndustrial);
    pipe2.position.set(1.2, 0.6, d * 0.45 + 1.5);
    group.add(pipe1, pipe2);
  }

  // --- SERVICE BUILDERS ---
  private buildHospital(group: THREE.Group, w: number, d: number) {
    // Cross-shaped hospital building
    const block1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 5.0, d * 0.45), this.materials.concrete);
    block1.position.y = 2.5;
    const block2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 5.0, d * 0.85), this.materials.concrete);
    block2.position.y = 2.5;
    group.add(block1, block2);

    // Rooftop emergency helipad
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 0.2, d * 0.4), this.materials.asphalt);
    pad.position.set(0, 5.1, 0);
    group.add(pad);

    // Red Cross emblem
    const cross1 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 0.6), this.materials.redCross);
    cross1.position.set(0, 5.22, 0);
    const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 2.0), this.materials.redCross);
    cross2.position.set(0, 5.22, 0);
    group.add(cross1, cross2);
  }

  private buildPoliceStation(group: THREE.Group, w: number, d: number) {
    const main = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 3.5, d * 0.88), this.materials.darkConcrete);
    main.position.y = 1.75;
    group.add(main);

    // Radio antenna
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 6.0), this.materials.metalIndustrial);
    mast.position.set(w * 0.3, 6.5, -d * 0.3);
    group.add(mast);

    // Blue emergency beacon
    const blueLight = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({ color: 0x3b82f6 }));
    blueLight.position.set(0, 3.8, d * 0.4);
    group.add(blueLight);
  }

  private buildFireStation(group: THREE.Group, w: number, d: number) {
    const main = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 3.6, d * 0.88), this.materials.brickRed);
    main.position.y = 1.8;
    group.add(main);

    // Fire engine garage bays
    for (let i = -1; i <= 1; i += 2) {
      const bay = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), this.materials.roofDark);
      bay.position.set(i * 1.8, 1.2, d * 0.44 + 0.02);
      group.add(bay);
    }
  }

  // --- DEFENSE BUILDERS ---
  private buildRadarStation(group: THREE.Group, w: number, d: number, id: string) {
    // Concrete radar bunker base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.42, w * 0.46, 2.0, 16), this.materials.darkConcrete);
    base.position.y = 1.0;
    group.add(base);

    // Motorized Rotating Scanner Assembly
    const rotator = new THREE.Group();
    rotator.position.set(0, 2.0, 0);

    // Parabolic antenna dish
    const dishGeo = new THREE.CylinderGeometry(2.4, 0.4, 0.8, 16, 1, true);
    dishGeo.rotateX(Math.PI / 2.8);
    const dish = new THREE.Mesh(dishGeo, this.materials.radarDish);
    dish.position.set(0, 1.4, 0);
    rotator.add(dish);

    const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.8), this.materials.neonCyan);
    emitter.position.set(0, 1.4, 0.8);
    rotator.add(emitter);

    group.add(rotator);
    this.animatedRadars.push(rotator);
  }

  private buildSamBattery(group: THREE.Group, w: number, d: number, id: string) {
    // Armored tracked/fixed turntable base
    const base = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 1.2, d * 0.85), this.materials.militaryGreen);
    base.position.y = 0.6;
    group.add(base);

    // Azimuth Traversing Turret Base
    const turretBase = new THREE.Group();
    turretBase.position.set(0, 1.2, 0);

    // Pitch elevation mount
    const pitchMount = new THREE.Group();
    pitchMount.position.set(0, 0.6, 0);

    // Quadruple missile launch canister tubes
    const tubeGeo = new THREE.CylinderGeometry(0.3, 0.3, 3.8, 8);
    tubeGeo.rotateX(Math.PI / 2);

    const offsets = [
      { x: -0.45, y: -0.45 },
      { x: 0.45, y: -0.45 },
      { x: -0.45, y: 0.45 },
      { x: 0.45, y: 0.45 },
    ];

    offsets.forEach(off => {
      const tube = new THREE.Mesh(tubeGeo, this.materials.darkConcrete);
      tube.position.set(off.x, off.y, 0);
      pitchMount.add(tube);
    });

    // Default angle: 40 degrees upward elevation
    pitchMount.rotation.x = -Math.PI / 4.5;
    turretBase.add(pitchMount);
    group.add(turretBase);

    this.samLaunchers.push({ id, base: turretBase, pitchMount });
  }

  private buildCiws(group: THREE.Group, w: number, d: number) {
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.3, 1.6, 12), this.materials.darkConcrete);
    stand.position.y = 0.8;
    group.add(stand);

    // White radome dome
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 12), this.materials.radarDish);
    dome.position.set(0, 2.2, 0);
    group.add(dome);

    // 20mm Gatling barrels
    const barrels = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.2), this.materials.metalIndustrial);
    barrels.rotateX(Math.PI / 2.6);
    barrels.position.set(0.6, 2.0, 0.8);
    group.add(barrels);
  }

  private buildSubterraneanBunker(group: THREE.Group, w: number, d: number) {
    // Earth-bermed concrete blast shelter
    const mound = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.35, w * 0.48, 1.8, 16), this.materials.darkConcrete);
    mound.position.y = 0.9;
    group.add(mound);

    // Heavy hydraulic blast doors
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 0.4), this.materials.metalIndustrial);
    door.position.set(0, 0.7, d * 0.42);
    door.rotation.x = -0.3;
    group.add(door);

    // Periscope observation cupola
    const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.8), this.materials.roofDark);
    cupola.position.set(0, 2.0, 0);
    group.add(cupola);
  }

  // --- MILITARY BUILDERS ---
  private buildMilitaryHq(group: THREE.Group, w: number, d: number) {
    // Pentagon / fortified command citadel
    const main = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.42, w * 0.46, 3.8, 6), this.materials.darkConcrete);
    main.position.y = 1.9;
    group.add(main);

    // Satellite Comm Dish array
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 0.3, 0.6, 12, 1, true), this.materials.radarDish);
    dish.rotateX(Math.PI / 3);
    dish.position.set(-2.0, 4.4, -1.5);
    group.add(dish);

    // National flag mast
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 6.0), this.materials.metalIndustrial);
    mast.position.set(0, 4.9, 2.0);
    group.add(mast);
  }

  private buildMilitaryBarracks(group: THREE.Group, w: number, d: number) {
    // Two long garrison barracks blocks
    for (let i = -1; i <= 1; i += 2) {
      const barracks = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 2.4, d * 0.35), this.materials.militaryCamo);
      barracks.position.set(0, 1.2, i * d * 0.25);
      group.add(barracks);
    }
    // Armory depot
    const armory = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.8, 3.0), this.materials.darkConcrete);
    armory.position.set(0, 0.9, 0);
    group.add(armory);
  }

  private buildAirbase(group: THREE.Group, w: number, d: number) {
    // Concrete Runway surface
    const runway = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.2, d * 0.6), this.materials.asphalt);
    runway.position.set(0, 0.1, -d * 0.1);
    group.add(runway);

    // Centerline markings
    for (let x = -w * 0.42; x < w * 0.42; x += 3.5) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.3), this.materials.markingWhite);
      stripe.rotateX(-Math.PI / 2);
      stripe.position.set(x, 0.22, -d * 0.1);
      group.add(stripe);
    }

    // Hangars along the apron
    const hangarGeo = new THREE.CylinderGeometry(2.2, 2.2, 5.0, 12, 1, false, 0, Math.PI);
    hangarGeo.rotateZ(Math.PI / 2);
    const h1 = new THREE.Mesh(hangarGeo, this.materials.metalIndustrial);
    h1.position.set(-w * 0.25, 0, d * 0.32);
    const h2 = new THREE.Mesh(hangarGeo, this.materials.metalIndustrial);
    h2.position.set(w * 0.25, 0, d * 0.32);
    group.add(h1, h2);

    // Control Tower
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 7.0, 8), this.materials.concrete);
    tower.position.set(0, 3.5, d * 0.35);
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.2, 1.5, 8), this.materials.glass);
    cab.position.set(0, 7.5, d * 0.35);
    group.add(tower, cab);

    // Static Parked Stealth Fighter Jet on Apron
    const fighter = this.createFighterJetMesh();
    fighter.scale.set(0.65, 0.65, 0.65);
    fighter.position.set(-w * 0.05, 0.3, d * 0.3);
    group.add(fighter);
  }

  private buildNavalDock(group: THREE.Group, w: number, d: number) {
    // Concrete pier jutting into water
    const pier = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 1.0, d * 0.95), this.materials.darkConcrete);
    pier.position.set(0, 0.5, 0);
    group.add(pier);

    // Mooring bollards
    for (let z = -d * 0.4; z <= d * 0.4; z += 3.0) {
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.5), this.materials.roofDark);
      bollard.position.set(w * 0.33, 1.1, z);
      group.add(bollard);
    }

    // Docked Guided Missile Corvette Warship floating beside pier
    const warship = this.createCorvetteMesh();
    warship.position.set(w * 0.42, 0.2, 0);
    group.add(warship);
  }

  private buildResearchLab(group: THREE.Group, w: number, d: number) {
    // Geodesic science dome + quantum research spire
    const base = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.42, w * 0.45, 1.6, 16), this.materials.concrete);
    base.position.y = 0.8;
    group.add(base);

    const dome = new THREE.Mesh(new THREE.SphereGeometry(w * 0.3, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), this.materials.glass);
    dome.position.set(0, 1.6, 0);
    group.add(dome);

    // Particle collider ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(w * 0.38, 0.2, 8, 24), this.materials.neonCyan);
    ring.rotateX(Math.PI / 2);
    ring.position.set(0, 2.2, 0);
    group.add(ring);
  }

  // --- UNIT MESH HELPERS ---
  public createFighterJetMesh(): THREE.Group {
    const jet = new THREE.Group();

    // Fuselage
    const bodyGeo = new THREE.ConeGeometry(0.6, 4.0, 6);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, this.materials.militaryCamo);
    jet.add(body);

    // Delta wings
    const wingGeo = new THREE.BoxGeometry(3.6, 0.08, 1.8);
    const wings = new THREE.Mesh(wingGeo, this.materials.militaryCamo);
    wings.position.set(0, 0, -0.4);
    jet.add(wings);

    // Twin Canted Vertical Stabilizers
    const finGeo = new THREE.BoxGeometry(0.06, 0.9, 0.8);
    const fin1 = new THREE.Mesh(finGeo, this.materials.militaryCamo);
    fin1.position.set(-0.6, 0.45, -1.4);
    fin1.rotation.z = -0.3;
    const fin2 = new THREE.Mesh(finGeo, this.materials.militaryCamo);
    fin2.position.set(0.6, 0.45, -1.4);
    fin2.rotation.z = 0.3;
    jet.add(fin1, fin2);

    // Glass Canopy
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 1.0), this.materials.glass);
    canopy.position.set(0, 0.3, 0.4);
    jet.add(canopy);

    // Engine Afterburner Nozzles (Glowing orange)
    const afterburner = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
    afterburner.rotateX(Math.PI / 2);
    afterburner.position.set(0, 0, -2.0);
    jet.add(afterburner);

    return jet;
  }

  public createCorvetteMesh(): THREE.Group {
    const ship = new THREE.Group();

    // Stealth Warship Hull
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 8.5), this.materials.darkConcrete);
    hull.position.y = 0.6;
    ship.add(hull);

    // Superstructure bridge
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 3.2), this.materials.concrete);
    bridge.position.set(0, 1.8, 0.5);
    ship.add(bridge);

    // Naval 76mm Gun Turret at bow
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.4, 8), this.materials.metalIndustrial);
    gun.position.set(0, 1.4, 3.0);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2), this.materials.metalIndustrial);
    barrel.rotateX(Math.PI / 2.3);
    barrel.position.set(0, 1.6, 3.6);
    ship.add(gun, barrel);

    return ship;
  }
}
