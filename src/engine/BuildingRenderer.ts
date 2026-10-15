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
    // Structural architectural materials
    this.materials.concrete = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.75, metalness: 0.1 });
    this.materials.darkConcrete = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85, metalness: 0.15 });
    this.materials.lightConcrete = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, roughness: 0.7, metalness: 0.05 });
    this.materials.brickRed = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.78, metalness: 0.05 });
    this.materials.brickTan = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8, metalness: 0.05 });
    this.materials.roofDark = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.25 });
    this.materials.roofTerracotta = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.75, metalness: 0.1 });

    // Glass & Lighting
    this.materials.glass = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.15,
      metalness: 0.85,
      transparent: true,
      opacity: 0.88,
    });
    this.materials.glassNight = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfef08a,
      emissiveIntensity: 0.85,
      roughness: 0.3,
    });

    // Industrial & Military
    this.materials.solarBlue = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.2, metalness: 0.85 });
    this.materials.metalIndustrial = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.45, metalness: 0.7 });
    this.materials.metalDark = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5, metalness: 0.8 });
    this.materials.militaryGreen = new THREE.MeshStandardMaterial({ color: 0x364831, roughness: 0.7, metalness: 0.25 });
    this.materials.militaryCamo = new THREE.MeshStandardMaterial({ color: 0x475542, roughness: 0.65, metalness: 0.3 });
    this.materials.radarDish = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.8 });
    this.materials.asphalt = new THREE.MeshStandardMaterial({ color: 0x1e242d, roughness: 0.9, metalness: 0.08 });
    this.materials.markingYellow = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    this.materials.markingWhite = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    this.materials.redCross = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    this.materials.neonCyan = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 1.0 });
  }

  public updateNightLighting(isNight: boolean) {
    if (this.materials.glassNight instanceof THREE.MeshStandardMaterial) {
      this.materials.glassNight.emissiveIntensity = isNight ? 1.0 : 0.04;
    }
  }

  public createBuildingMesh(building: PlacedBuilding): THREE.Group {
    const group = new THREE.Group();
    group.name = building.id;

    const def = BUILDING_DEFS[building.type];
    const width = def.width * 4;
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
        const boxGeo = new THREE.BoxGeometry(width, 4, depth);
        const box = new THREE.Mesh(boxGeo, this.materials.concrete);
        box.position.y = 2;
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

  // --- DETAILED RESIDENTIAL BUILDERS ---
  private buildSuburbanHouses(group: THREE.Group, w: number, d: number) {
    // Concrete foundation & driveway
    const foundation = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.2, d * 0.95), this.materials.darkConcrete);
    foundation.position.y = 0.1;
    group.add(foundation);

    const offsets = [
      { x: -w * 0.24, z: 0 },
      { x: w * 0.24, z: 0 },
    ];

    offsets.forEach((off, i) => {
      const houseW = w * 0.42;
      const houseD = d * 0.72;
      const houseH = 2.6;

      // Multi-story facade with horizontal siding details
      const walls = new THREE.Mesh(new THREE.BoxGeometry(houseW, houseH, houseD), i === 0 ? this.materials.lightConcrete : this.materials.brickTan);
      walls.position.set(off.x, houseH / 2 + 0.2, off.z);
      group.add(walls);

      // Pitched Gabled Roof with overhanging eaves
      const roofW = houseW * 1.08;
      const roofD = houseD * 1.06;
      const roofGeo = new THREE.ConeGeometry(roofW * 0.7, 1.5, 4);
      roofGeo.rotateY(Math.PI / 4);
      const roof = new THREE.Mesh(roofGeo, i === 0 ? this.materials.roofTerracotta : this.materials.roofDark);
      roof.position.set(off.x, houseH + 0.95, off.z);
      group.add(roof);

      // Brick Chimney
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.5), this.materials.brickRed);
      chimney.position.set(off.x + houseW * 0.28, houseH + 1.2, off.z - houseD * 0.2);
      group.add(chimney);

      // Front Porch & Entrance
      const porch = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 1.0), this.materials.concrete);
      porch.position.set(off.x, 0.25, off.z + houseD / 2 + 0.5);
      const door = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.6), this.materials.roofDark);
      door.position.set(off.x, 1.0, off.z + houseD / 2 + 0.02);
      group.add(porch, door);

      // Windows with mullions and warm night illumination
      for (let wx = -0.3; wx <= 0.3; wx += 0.6) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.9), this.materials.glassNight);
        win.position.set(off.x + wx * houseW * 0.6, 1.5, off.z + houseD / 2 + 0.02);
        group.add(win);
      }
    });
  }

  private buildTownhouses(group: THREE.Group, w: number, d: number) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.2, d * 0.96), this.materials.darkConcrete);
    base.position.y = 0.1;
    group.add(base);

    const units = 3;
    const unitW = (w * 0.9) / units;

    for (let i = 0; i < units; i++) {
      const h = 5.2 + (i % 2) * 0.6;
      const x = -w * 0.45 + unitW * (i + 0.5);
      const townhouse = new THREE.Mesh(new THREE.BoxGeometry(unitW * 0.92, h, d * 0.8), this.materials.brickRed);
      townhouse.position.set(x, h / 2 + 0.2, 0);
      group.add(townhouse);

      // Cornice Parapet
      const cornice = new THREE.Mesh(new THREE.BoxGeometry(unitW * 0.96, 0.4, d * 0.84), this.materials.lightConcrete);
      cornice.position.set(x, h + 0.4, 0);
      group.add(cornice);

      // Bay Window Projection on facade
      const bayWin = new THREE.Mesh(new THREE.BoxGeometry(unitW * 0.65, 2.2, 0.4), this.materials.lightConcrete);
      bayWin.position.set(x, 2.8, d * 0.4 + 0.2);
      group.add(bayWin);

      // Lit Windows
      const win = new THREE.Mesh(new THREE.PlaneGeometry(unitW * 0.55, 1.8), this.materials.glassNight);
      win.position.set(x, 2.8, d * 0.4 + 0.42);
      group.add(win);

      // Ground Entry Stoop & Door
      const stoop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.8), this.materials.concrete);
      stoop.position.set(x, 0.5, d * 0.4 + 0.4);
      group.add(stoop);
    }
  }

  private buildHighRiseCondos(group: THREE.Group, w: number, d: number) {
    const h1 = 18.0;
    const h2 = 24.5;

    // Podium Plaza
    const podium = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 2.5, d * 0.96), this.materials.darkConcrete);
    podium.position.y = 1.25;
    group.add(podium);

    // Tower 1 (Glass & Balconies)
    const tower1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.44, h1, d * 0.72), this.materials.glass);
    tower1.position.set(-w * 0.24, h1 / 2 + 2.5, 0);
    group.add(tower1);

    // Tower 2 (Contemporary Luxury Tower)
    const tower2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.44, h2, d * 0.72), this.materials.concrete);
    tower2.position.set(w * 0.24, h2 / 2 + 2.5, 0);
    group.add(tower2);

    // Recessed horizontal window bands on Tower 2
    for (let y = 3; y < h2; y += 2.4) {
      const band = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.4, 1.2), this.materials.glassNight);
      band.position.set(w * 0.24, y + 2.5, d * 0.36 + 0.02);
      group.add(band);

      // Balcony projection
      const balcony = new THREE.Mesh(new THREE.BoxGeometry(w * 0.38, 0.15, 0.6), this.materials.darkConcrete);
      balcony.position.set(w * 0.24, y + 1.8, d * 0.36 + 0.3);
      group.add(balcony);
    }

    // Rooftop HVAC & Elevator Penthouse
    const penthouse = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.8, 3.0), this.materials.metalIndustrial);
    penthouse.position.set(w * 0.24, h2 + 3.4, 0);
    group.add(penthouse);
  }

  // --- COMMERCIAL BUILDERS ---
  private buildRetailPlaza(group: THREE.Group, w: number, d: number) {
    const main = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 3.6, d * 0.85), this.materials.concrete);
    main.position.y = 1.8;
    group.add(main);

    // Glass frontage with store bays
    const glassFront = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.88, 2.4), this.materials.glassNight);
    glassFront.position.set(0, 1.6, d * 0.425 + 0.02);
    group.add(glassFront);

    // Cantilevered pedestrian entrance canopy
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.25, 1.6), this.materials.roofDark);
    canopy.position.set(0, 2.9, d * 0.425 + 0.8);
    group.add(canopy);

    // Illuminated Neon Facade Signboard
    const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.7, 0.12), this.materials.neonCyan);
    sign.position.set(0, 3.4, d * 0.425 + 0.06);
    group.add(sign);

    // Rooftop AC chiller units
    const ac = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 1.6), this.materials.metalIndustrial);
    ac.position.set(-w * 0.25, 4.1, 0);
    group.add(ac);
  }

  private buildShoppingMall(group: THREE.Group, w: number, d: number) {
    const main = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 5.2, d * 0.94), this.materials.lightConcrete);
    main.position.y = 2.6;
    group.add(main);

    // Glass Skylight Atrium Dome
    const domeGeo = new THREE.SphereGeometry(w * 0.28, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeo, this.materials.glass);
    dome.position.set(0, 5.2, 0);
    group.add(dome);

    // Grand Entrance Archway
    const arch = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.8, 1.8), this.materials.darkConcrete);
    arch.position.set(0, 1.9, d * 0.47 + 0.9);
    group.add(arch);
  }

  private buildCorporateSkyscraper(group: THREE.Group, w: number, d: number) {
    const h = 32.0;

    // Tapered Landmark Tower
    const tower = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, h, d * 0.85), this.materials.glass);
    tower.position.y = h / 2;
    group.add(tower);

    // Structural Cross-Bracing Columns (Contemporary Architectural Silhouette)
    const colGeo = new THREE.BoxGeometry(0.9, h, 0.9);
    for (let cx = -1; cx <= 1; cx += 2) {
      for (let cz = -1; cz <= 1; cz += 2) {
        const col = new THREE.Mesh(colGeo, this.materials.darkConcrete);
        col.position.set(cx * (w * 0.425), h / 2, cz * (d * 0.425));
        group.add(col);
      }
    }

    // Illuminated Rooftop Helipad
    const heliPad = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.35, w * 0.35, 0.35, 20), this.materials.asphalt);
    heliPad.position.set(0, h + 0.18, 0);
    group.add(heliPad);

    // Helipad 'H' Marking
    const hMark1 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 2.2), this.materials.markingYellow);
    hMark1.rotateX(-Math.PI / 2);
    hMark1.position.set(-0.6, h + 0.36, 0);
    const hMark2 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 2.2), this.materials.markingYellow);
    hMark2.rotateX(-Math.PI / 2);
    hMark2.position.set(0.6, h + 0.36, 0);
    const hBar = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.4), this.materials.markingYellow);
    hBar.rotateX(-Math.PI / 2);
    hBar.position.set(0, h + 0.36, 0);
    group.add(hMark1, hMark2, hBar);

    // Communications Mast & Red Warning Beacon
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.3, 7.5, 8), this.materials.metalIndustrial);
    spire.position.set(0, h + 4.0, 0);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    beacon.position.set(0, h + 7.8, 0);
    group.add(spire, beacon);
  }

  // --- INDUSTRIAL BUILDERS ---
  private buildFactory(group: THREE.Group, w: number, d: number) {
    // Industrial Clerestory Factory Hall
    const hall = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 4.2, d * 0.78), this.materials.metalIndustrial);
    hall.position.y = 2.1;
    group.add(hall);

    // Sawtooth roof ridge
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.65, 1.8, 4), this.materials.roofDark);
    roof.rotateY(Math.PI / 4);
    roof.position.set(0, 5.0, 0);
    group.add(roof);

    // Twin Brick Smoke Stacks
    const chimneyGeo = new THREE.CylinderGeometry(0.7, 1.1, 9.0, 10);
    const c1 = new THREE.Mesh(chimneyGeo, this.materials.brickRed);
    c1.position.set(-w * 0.32, 4.5, -d * 0.28);
    const c2 = new THREE.Mesh(chimneyGeo, this.materials.brickRed);
    c2.position.set(-w * 0.16, 4.5, -d * 0.28);
    group.add(c1, c2);

    // External Storage Silos & Pipe Conduits
    const silo = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 4.0, 12), this.materials.lightConcrete);
    silo.position.set(w * 0.28, 2.0, d * 0.2);
    group.add(silo);
  }

  private buildWarehouse(group: THREE.Group, w: number, d: number) {
    const warehouse = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 4.2, d * 0.92), this.materials.darkConcrete);
    warehouse.position.y = 2.1;
    group.add(warehouse);

    // Roll-up logistics docking bays
    for (let i = -1; i <= 1; i++) {
      const dock = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.5), this.materials.metalDark);
      dock.position.set(i * 3.0, 1.25, d * 0.46 + 0.02);
      group.add(dock);
    }
  }

  private buildAerospacePlant(group: THREE.Group, w: number, d: number) {
    const plant = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 4.6, d * 0.92), this.materials.lightConcrete);
    plant.position.y = 2.3;
    group.add(plant);

    // Spherical cryogenic fuel tanks
    const sphereGeo = new THREE.SphereGeometry(2.1, 16, 16);
    const s1 = new THREE.Mesh(sphereGeo, this.materials.metalIndustrial);
    s1.position.set(-w * 0.32, 2.3, -d * 0.28);
    const s2 = new THREE.Mesh(sphereGeo, this.materials.metalIndustrial);
    s2.position.set(-w * 0.04, 2.3, -d * 0.28);
    group.add(s1, s2);

    // Air scrubber filtration tower
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 8.5, 12), this.materials.metalIndustrial);
    tower.position.set(w * 0.3, 4.25, 0);
    group.add(tower);
  }

  // --- UTILITY BUILDERS ---
  private buildSolarFarm(group: THREE.Group, w: number, d: number) {
    const ground = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.12, d * 0.96), this.materials.darkConcrete);
    ground.position.y = 0.06;
    group.add(ground);

    const panelGeo = new THREE.BoxGeometry(2.0, 0.08, 1.3);
    for (let r = -1; r <= 1; r++) {
      for (let c = -1; c <= 1; c++) {
        const panel = new THREE.Mesh(panelGeo, this.materials.solarBlue);
        panel.position.set(c * 2.5, 0.9, r * 2.4);
        panel.rotation.x = -0.45; // Angled toward sun
        group.add(panel);

        const support = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9), this.materials.metalIndustrial);
        support.position.set(c * 2.5, 0.45, r * 2.4);
        group.add(support);
      }
    }
  }

  private buildPowerPlant(group: THREE.Group, w: number, d: number) {
    // Reinforced Reactor Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 3.0, d * 0.96), this.materials.darkConcrete);
    base.position.y = 1.5;
    group.add(base);

    // Hyperbolic Cooling Towers
    const coolingGeo = new THREE.CylinderGeometry(2.6, 4.2, 11.5, 18, 1, true);
    const ct1 = new THREE.Mesh(coolingGeo, this.materials.lightConcrete);
    ct1.position.set(-w * 0.26, 7.25, 0);
    const ct2 = new THREE.Mesh(coolingGeo, this.materials.lightConcrete);
    ct2.position.set(w * 0.26, 7.25, 0);
    group.add(ct1, ct2);

    // Generator Turbine Hall
    const hall = new THREE.Mesh(new THREE.BoxGeometry(5.0, 2.4, 3.5), this.materials.metalIndustrial);
    hall.position.set(0, 4.2, d * 0.28);
    group.add(hall);
  }

  private buildWaterPump(group: THREE.Group, w: number, d: number) {
    const main = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 2.8, d * 0.88), this.materials.concrete);
    main.position.y = 1.4;
    group.add(main);

    // Deep intake piping conduits extending down
    const pipeGeo = new THREE.CylinderGeometry(0.6, 0.6, 4.5, 10);
    pipeGeo.rotateX(Math.PI / 2.2);
    const pipe1 = new THREE.Mesh(pipeGeo, this.materials.metalIndustrial);
    pipe1.position.set(-1.4, 0.7, d * 0.46 + 1.8);
    const pipe2 = new THREE.Mesh(pipeGeo, this.materials.metalIndustrial);
    pipe2.position.set(1.4, 0.7, d * 0.46 + 1.8);
    group.add(pipe1, pipe2);
  }

  // --- SERVICE BUILDERS ---
  private buildHospital(group: THREE.Group, w: number, d: number) {
    const mainWing = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 5.5, d * 0.48), this.materials.lightConcrete);
    mainWing.position.y = 2.75;
    const crossWing = new THREE.Mesh(new THREE.BoxGeometry(w * 0.48, 5.5, d * 0.88), this.materials.lightConcrete);
    crossWing.position.y = 2.75;
    group.add(mainWing, crossWing);

    // Rooftop emergency trauma helipad
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, 0.22, d * 0.42), this.materials.asphalt);
    pad.position.set(0, 5.6, 0);
    group.add(pad);

    // Red Cross emblem
    const cross1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 0.7), this.materials.redCross);
    cross1.position.set(0, 5.72, 0);
    const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 2.2), this.materials.redCross);
    cross2.position.set(0, 5.72, 0);
    group.add(cross1, cross2);
  }

  private buildPoliceStation(group: THREE.Group, w: number, d: number) {
    const main = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 3.8, d * 0.9), this.materials.darkConcrete);
    main.position.y = 1.9;
    group.add(main);

    // Communications antenna tower
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 7.0), this.materials.metalIndustrial);
    mast.position.set(w * 0.32, 7.3, -d * 0.32);
    group.add(mast);

    // Blue beacon
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshBasicMaterial({ color: 0x3b82f6 }));
    beacon.position.set(0, 4.1, d * 0.42);
    group.add(beacon);
  }

  private buildFireStation(group: THREE.Group, w: number, d: number) {
    const main = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 3.8, d * 0.9), this.materials.brickRed);
    main.position.y = 1.9;
    group.add(main);

    // Garage bay doors for emergency engines
    for (let i = -1; i <= 1; i += 2) {
      const bay = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.6), this.materials.metalDark);
      bay.position.set(i * 1.9, 1.3, d * 0.45 + 0.02);
      group.add(bay);
    }
  }

  // --- OVERHAULED MILITARY DEFENSE ASSETS (Phase 2.5) ---

  // 1. Phased-Array Early Warning Radar
  private buildRadarStation(group: THREE.Group, w: number, d: number, id: string) {
    // Fortified octagonal concrete radar foundation
    const foundation = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.44, w * 0.48, 2.2, 8), this.materials.darkConcrete);
    foundation.position.y = 1.1;
    group.add(foundation);

    // Generator & Electronic Equipment Shelter
    const shelter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 1.8), this.materials.militaryGreen);
    shelter.position.set(w * 0.22, 1.0, w * 0.22);
    group.add(shelter);

    // Structural steel gantry tower
    const gantry = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 2.5, 6), this.materials.metalIndustrial);
    gantry.position.set(0, 3.3, 0);
    group.add(gantry);

    // Motorized Rotating Scanner Turret
    const rotator = new THREE.Group();
    rotator.position.set(0, 4.5, 0);

    // Realistic Large Parabolic Lattice Radar Antenna
    const dishGeo = new THREE.CylinderGeometry(3.6, 0.6, 1.2, 24, 1, true);
    dishGeo.rotateX(Math.PI / 2.6);
    const dish = new THREE.Mesh(dishGeo, this.materials.radarDish);
    dish.position.set(0, 1.8, 0);
    rotator.add(dish);

    // Antenna feed horn & cyan glowing phased-array emitter
    const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4), this.materials.metalIndustrial);
    feed.position.set(0, 1.8, 1.2);
    const emitter = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), this.materials.neonCyan);
    emitter.position.set(0, 1.8, 2.3);
    rotator.add(feed, emitter);

    // Top rotating beacon light
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
    beacon.position.set(0, 3.8, 0);
    rotator.add(beacon);

    group.add(rotator);
    this.animatedRadars.push(rotator);
  }

  // 2. Heavy Patriot SAM Missile Air-Defense Battery
  private buildSamBattery(group: THREE.Group, w: number, d: number, id: string) {
    // Heavy 8-wheel Tactical Launcher Chassis (HEMTT style)
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 1.0, d * 0.88), this.materials.militaryGreen);
    chassis.position.y = 0.5;
    group.add(chassis);

    // Outrigger Hydraulic Ground Stabilizers
    for (let cx = -1; cx <= 1; cx += 2) {
      for (let cz = -1; cz <= 1; cz += 2) {
        const outrigger = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), this.materials.metalDark);
        outrigger.position.set(cx * (w * 0.44), 0.2, cz * (d * 0.44));
        group.add(outrigger);
      }
    }

    // Cab / Command cockpit
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 1.8), this.materials.militaryGreen);
    cab.position.set(0, 1.2, -d * 0.26);
    group.add(cab);

    // Traversing Turret Base (Azimuth Rotation around Y)
    const turretBase = new THREE.Group();
    turretBase.position.set(0, 1.0, d * 0.08);

    const turntable = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.4, 16), this.materials.metalDark);
    turntable.position.y = 0.2;
    turretBase.add(turntable);

    // Elevating Pitch Mount (Elevation Rotation around X)
    const pitchMount = new THREE.Group();
    pitchMount.position.set(0, 0.7, 0);

    // Armored Launcher Cradle Rack
    const cradle = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 4.4), this.materials.militaryGreen);
    cradle.position.set(0, 0, 0);
    pitchMount.add(cradle);

    // Quadruple Interceptor Missile Canister Tubes
    const tubeGeo = new THREE.BoxGeometry(0.85, 0.85, 4.8);
    const tubeMat = this.materials.darkConcrete;

    const tubeOffsets = [
      { x: -0.55, y: 0.55 },
      { x: 0.55, y: 0.55 },
      { x: -0.55, y: -0.35 },
      { x: 0.55, y: -0.35 },
    ];

    tubeOffsets.forEach((off) => {
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      tube.position.set(off.x, off.y + 0.3, 0);
      pitchMount.add(tube);

      // White stenciled missile front hatch
      const hatch = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), this.materials.markingWhite);
      hatch.position.set(off.x, off.y + 0.3, 2.41);
      pitchMount.add(hatch);
    });

    // Default resting elevation angle: 42 degrees
    pitchMount.rotation.x = -Math.PI / 4.2;
    turretBase.add(pitchMount);
    group.add(turretBase);

    this.samLaunchers.push({ id, base: turretBase, pitchMount });
  }

  // 3. Phalanx CIWS Point-Defense Gatling Cannon
  private buildCiws(group: THREE.Group, w: number, d: number) {
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 1.8, 12), this.materials.darkConcrete);
    stand.position.y = 0.9;
    group.add(stand);

    // Marine-grade white radome dome
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 16), this.materials.radarDish);
    dome.position.set(0, 2.4, 0);
    group.add(dome);

    // 20mm 6-barrel Gatling Cannon
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.6, 8), this.materials.metalIndustrial);
    gun.rotateX(Math.PI / 2.5);
    gun.position.set(0.7, 2.2, 1.0);
    group.add(gun);
  }

  // 4. Subterranean Blast-Hardened Bunker
  private buildSubterraneanBunker(group: THREE.Group, w: number, d: number) {
    const mound = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.38, w * 0.5, 2.0, 18), this.materials.darkConcrete);
    mound.position.y = 1.0;
    group.add(mound);

    // Reinforced Steel Blast Doors
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.6, 0.4), this.materials.metalDark);
    door.position.set(0, 0.8, d * 0.44);
    door.rotation.x = -0.3;
    group.add(door);
  }

  // 5. National Strategic Command Center (HQ)
  private buildMilitaryHq(group: THREE.Group, w: number, d: number) {
    const citadel = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.44, w * 0.48, 4.2, 6), this.materials.darkConcrete);
    citadel.position.y = 2.1;
    group.add(citadel);

    // Satellite Telemetry Uplink Dishes
    const dish1 = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 0.4, 0.7, 14, 1, true), this.materials.radarDish);
    dish1.rotateX(Math.PI / 3);
    dish1.position.set(-2.2, 4.8, -1.8);
    group.add(dish1);

    // Flagpole with national insignia
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 7.0), this.materials.metalIndustrial);
    mast.position.set(0, 5.5, 2.2);
    group.add(mast);
  }

  private buildMilitaryBarracks(group: THREE.Group, w: number, d: number) {
    for (let i = -1; i <= 1; i += 2) {
      const barracks = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 2.6, d * 0.36), this.materials.militaryCamo);
      barracks.position.set(0, 1.3, i * d * 0.26);
      group.add(barracks);
    }
    const armory = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.0, 3.2), this.materials.darkConcrete);
    armory.position.set(0, 1.0, 0);
    group.add(armory);
  }

  // 6. Tactical Airbase Runway & Hangars
  private buildAirbase(group: THREE.Group, w: number, d: number) {
    // Concrete Runway Surface
    const runway = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.22, d * 0.65), this.materials.asphalt);
    runway.position.set(0, 0.11, -d * 0.1);
    group.add(runway);

    // Piano-key threshold stripes at runway threshold
    for (let y = -d * 0.25; y <= d * 0.25; y += 1.2) {
      const bar1 = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.5), this.materials.markingWhite);
      bar1.rotateX(-Math.PI / 2);
      bar1.position.set(-w * 0.44, 0.24, y - d * 0.1);
      const bar2 = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.5), this.materials.markingWhite);
      bar2.rotateX(-Math.PI / 2);
      bar2.position.set(w * 0.44, 0.24, y - d * 0.1);
      group.add(bar1, bar2);
    }

    // Runway centerline markings
    for (let x = -w * 0.38; x <= w * 0.38; x += 4.0) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.35), this.materials.markingWhite);
      stripe.rotateX(-Math.PI / 2);
      stripe.position.set(x, 0.24, -d * 0.1);
      group.add(stripe);
    }

    // Reinforced Hardened Aircraft Shelters (HAS)
    const hangarGeo = new THREE.CylinderGeometry(2.4, 2.4, 6.0, 14, 1, false, 0, Math.PI);
    hangarGeo.rotateZ(Math.PI / 2);
    const h1 = new THREE.Mesh(hangarGeo, this.materials.darkConcrete);
    h1.position.set(-w * 0.26, 0, d * 0.32);
    const h2 = new THREE.Mesh(hangarGeo, this.materials.darkConcrete);
    h2.position.set(w * 0.26, 0, d * 0.32);
    group.add(h1, h2);

    // Air Traffic Control Tower with glass cab
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, 8.0, 8), this.materials.lightConcrete);
    tower.position.set(0, 4.0, d * 0.36);
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.4, 1.8, 8), this.materials.glass);
    cab.position.set(0, 8.5, d * 0.36);
    group.add(tower, cab);

    // Parked 5th-Gen Stealth Multirole Fighter
    const fighter = this.createFighterJetMesh();
    fighter.scale.set(0.7, 0.7, 0.7);
    fighter.position.set(-w * 0.05, 0.35, d * 0.3);
    group.add(fighter);
  }

  private buildNavalDock(group: THREE.Group, w: number, d: number) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 1.2, d * 0.96), this.materials.darkConcrete);
    pier.position.set(0, 0.6, 0);
    group.add(pier);

    // Mooring bollards
    for (let z = -d * 0.42; z <= d * 0.42; z += 3.2) {
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.55), this.materials.metalDark);
      bollard.position.set(w * 0.34, 1.3, z);
      group.add(bollard);
    }

    // Dockside Cargo Crane
    const crane = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.0, 1.2), this.materials.brickTan);
    crane.position.set(-w * 0.25, 3.1, -d * 0.2);
    const jib = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.4, 0.4), this.materials.brickTan);
    jib.position.set(-w * 0.25 + 1.5, 5.6, -d * 0.2);
    group.add(crane, jib);

    // Docked Guided Missile Corvette Warship floating beside pier
    const warship = this.createCorvetteMesh();
    warship.position.set(w * 0.44, 0.25, 0);
    group.add(warship);
  }

  private buildResearchLab(group: THREE.Group, w: number, d: number) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.44, w * 0.48, 1.8, 16), this.materials.lightConcrete);
    base.position.y = 0.9;
    group.add(base);

    // Geodesic Quantum Science Dome
    const dome = new THREE.Mesh(new THREE.SphereGeometry(w * 0.32, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2), this.materials.glass);
    dome.position.set(0, 1.8, 0);
    group.add(dome);

    // Particle Collider Accelerating Torus
    const ring = new THREE.Mesh(new THREE.TorusGeometry(w * 0.4, 0.22, 10, 30), this.materials.neonCyan);
    ring.rotateX(Math.PI / 2);
    ring.position.set(0, 2.4, 0);
    group.add(ring);
  }

  // --- UNIT MESH HELPERS ---
  public createFighterJetMesh(): THREE.Group {
    const jet = new THREE.Group();

    // Stealth Chined Fuselage
    const bodyGeo = new THREE.ConeGeometry(0.65, 4.4, 6);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, this.materials.militaryCamo);
    jet.add(body);

    // Delta-Canted Wings
    const wingGeo = new THREE.BoxGeometry(3.8, 0.08, 2.0);
    const wings = new THREE.Mesh(wingGeo, this.materials.militaryCamo);
    wings.position.set(0, 0, -0.4);
    jet.add(wings);

    // Twin Canted Vertical Stabilizers (Rudders)
    const finGeo = new THREE.BoxGeometry(0.08, 1.1, 0.9);
    const fin1 = new THREE.Mesh(finGeo, this.materials.militaryCamo);
    fin1.position.set(-0.65, 0.55, -1.5);
    fin1.rotation.z = -0.32;
    const fin2 = new THREE.Mesh(finGeo, this.materials.militaryCamo);
    fin2.position.set(0.65, 0.55, -1.5);
    fin2.rotation.z = 0.32;
    jet.add(fin1, fin2);

    // Tinted Stealth Canopy
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 1.2), this.materials.glass);
    canopy.position.set(0, 0.35, 0.45);
    jet.add(canopy);

    // Twin Turbofan Afterburner Exhaust Nozzles
    for (let x = -0.28; x <= 0.28; x += 0.56) {
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.4, 8), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
      nozzle.rotateX(Math.PI / 2);
      nozzle.position.set(x, 0, -2.2);
      jet.add(nozzle);
    }

    return jet;
  }

  public createCorvetteMesh(): THREE.Group {
    const ship = new THREE.Group();

    // Stealth Warship Hull with raked bow
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.5, 9.2), this.materials.darkConcrete);
    hull.position.y = 0.65;
    ship.add(hull);

    // Stealth superstructure
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 3.6), this.materials.concrete);
    bridge.position.set(0, 2.0, 0.6);
    ship.add(bridge);

    // 76mm Rapid-Fire Naval Gun Turret at bow
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.45, 10), this.materials.metalIndustrial);
    gun.position.set(0, 1.5, 3.4);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.4), this.materials.metalIndustrial);
    barrel.rotateX(Math.PI / 2.3);
    barrel.position.set(0, 1.7, 4.0);
    ship.add(gun, barrel);

    return ship;
  }
}
