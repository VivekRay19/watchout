import * as THREE from 'three';
import { PlacedBuilding } from '../types/game';
import { BUILDING_DEFS } from '../data/buildingDefs';

export class BuildingRenderer {
  private materials: { [key: string]: THREE.Material } = {};
  public animatedRadars: THREE.Object3D[] = [];
  public samLaunchers: { id: string; base: THREE.Object3D; pitchMount: THREE.Object3D }[] = [];

  constructor() {
    this.initMaterials();
  }

  private initMaterials() {
    // Clean, bright pastel & low-poly architectural palette (matching reference image)
    this.materials.wallWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.65, metalness: 0.04 });
    this.materials.wallCream = new THREE.MeshStandardMaterial({ color: 0xfbf4e4, roughness: 0.68, metalness: 0.04 });
    this.materials.wallPastelBlue = new THREE.MeshStandardMaterial({ color: 0xdceefb, roughness: 0.65, metalness: 0.04 });
    this.materials.wallPastelYellow = new THREE.MeshStandardMaterial({ color: 0xfef0b8, roughness: 0.68, metalness: 0.04 });
    this.materials.wallPastelPeach = new THREE.MeshStandardMaterial({ color: 0xfde2cf, roughness: 0.68, metalness: 0.04 });
    this.materials.concrete = new THREE.MeshStandardMaterial({ color: 0xdce3ea, roughness: 0.75, metalness: 0.04 });
    this.materials.darkConcrete = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.78, metalness: 0.06 });
    this.materials.lightConcrete = new THREE.MeshStandardMaterial({ color: 0xeef2f6, roughness: 0.7, metalness: 0.04 });

    // Vibrant cohesive roofs & accents
    this.materials.roofCoral = new THREE.MeshStandardMaterial({ color: 0xe35644, roughness: 0.62, metalness: 0.05 });
    this.materials.roofBlue = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.62, metalness: 0.05 });
    this.materials.roofOrange = new THREE.MeshStandardMaterial({ color: 0xf28b30, roughness: 0.62, metalness: 0.05 });
    this.materials.roofSlate = new THREE.MeshStandardMaterial({ color: 0x526277, roughness: 0.65, metalness: 0.08 });
    this.materials.roofYellow = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6, metalness: 0.05 });

    // Clean sky-blue windows & office curtain walls
    this.materials.glass = new THREE.MeshStandardMaterial({
      color: 0x3b8eea,
      roughness: 0.2,
      metalness: 0.35,
    });
    this.materials.glassLight = new THREE.MeshStandardMaterial({
      color: 0x74bcf7,
      roughness: 0.22,
      metalness: 0.25,
    });
    this.materials.glassNight = new THREE.MeshStandardMaterial({
      color: 0x67b7f7,
      emissive: 0xfef08a,
      emissiveIntensity: 0.0,
      roughness: 0.25,
    });

    // Ground pads & landscaping
    this.materials.lawnGreen = new THREE.MeshStandardMaterial({ color: 0x7fd146, roughness: 0.8, metalness: 0.02 });
    this.materials.treeGreen = new THREE.MeshStandardMaterial({ color: 0x5eb329, roughness: 0.75, flatShading: true });
    this.materials.treeLime = new THREE.MeshStandardMaterial({ color: 0x84d442, roughness: 0.75, flatShading: true });
    this.materials.treeBlossom = new THREE.MeshStandardMaterial({ color: 0xf48fb1, roughness: 0.72, flatShading: true });
    this.materials.trunkBrown = new THREE.MeshStandardMaterial({ color: 0x7c5338, roughness: 0.85 });
    this.materials.fenceLight = new THREE.MeshStandardMaterial({ color: 0xe6dec8, roughness: 0.75 });
    this.materials.waterCyan = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.15, metalness: 0.1 });

    // Industrial, Harbor & Military
    this.materials.solarBlue = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.25, metalness: 0.5 });
    this.materials.metalIndustrial = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.45, metalness: 0.4 });
    this.materials.metalDark = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.4 });
    this.materials.militaryGreen = new THREE.MeshStandardMaterial({ color: 0x556b3d, roughness: 0.68, metalness: 0.12 });
    this.materials.militaryCamo = new THREE.MeshStandardMaterial({ color: 0x657d4b, roughness: 0.65, metalness: 0.12 });
    this.materials.militaryPad = new THREE.MeshStandardMaterial({ color: 0xd8d2c5, roughness: 0.78, metalness: 0.04 });
    this.materials.radarTowerTan = new THREE.MeshStandardMaterial({ color: 0x9e9789, roughness: 0.7, metalness: 0.15 });
    this.materials.radarDish = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.1 });
    this.materials.asphalt = new THREE.MeshStandardMaterial({ color: 0x56616f, roughness: 0.82, metalness: 0.04 });
    this.materials.markingYellow = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    this.materials.markingWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.materials.redCross = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    // Shipping container colors
    this.materials.contRed = new THREE.MeshStandardMaterial({ color: 0xe54848, roughness: 0.6 });
    this.materials.contBlue = new THREE.MeshStandardMaterial({ color: 0x2b7de9, roughness: 0.6 });
    this.materials.contYellow = new THREE.MeshStandardMaterial({ color: 0xf5b82e, roughness: 0.6 });
    this.materials.contOrange = new THREE.MeshStandardMaterial({ color: 0xf27830, roughness: 0.6 });
  }

  public updateNightLighting(isNight: boolean) {
    if (this.materials.glassNight instanceof THREE.MeshStandardMaterial) {
      this.materials.glassNight.emissiveIntensity = isNight ? 0.85 : 0.0;
    }
  }

  public createBuildingMesh(building: PlacedBuilding): THREE.Group {
    const group = new THREE.Group();
    group.name = building.id;

    const def = BUILDING_DEFS[building.type];
    const width = def.width * 4;
    const depth = def.depth * 4;
    const variant = Math.abs(Math.round(building.x * 7 + building.z * 13));

    // Special case for central fountain park block if tagged
    if (building.id.includes('park')) {
      this.buildCityPark(group, width, depth);
      this.enableShadows(group);
      return group;
    }

    switch (building.type) {
      // --- RESIDENTIAL ---
      case 'res_low':
        this.buildSuburbanHouses(group, width, depth, variant);
        break;
      case 'res_suburb':
        this.buildTownhouses(group, width, depth, variant);
        break;
      case 'res_high':
        this.buildHighRiseCondos(group, width, depth, variant);
        break;

      // --- COMMERCIAL ---
      case 'com_retail':
        this.buildRetailPlaza(group, width, depth, variant);
        break;
      case 'com_mall':
        this.buildShoppingMall(group, width, depth, variant);
        break;
      case 'com_skyscraper':
        this.buildCorporateSkyscraper(group, width, depth, variant);
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
        this.buildCityPark(group, width, depth);
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
        const box = new THREE.Mesh(new THREE.BoxGeometry(width, 4, depth), this.materials.wallWhite);
        box.position.y = 2;
        group.add(box);
        break;
    }

    this.enableShadows(group);
    return group;
  }

  private enableShadows(group: THREE.Group) {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  private addMiniTree(group: THREE.Group, x: number, z: number, scale = 0.75, blossom = false) {
    const tGroup = new THREE.Group();
    tGroup.position.set(x, 0.1, z);
    tGroup.scale.set(scale, scale, scale);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.1, 6), this.materials.trunkBrown);
    trunk.position.y = 0.55;
    tGroup.add(trunk);

    const mat = blossom ? this.materials.treeBlossom : this.materials.treeGreen;
    const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 1), mat);
    canopy.position.y = 1.65;
    tGroup.add(canopy);

    group.add(tGroup);
  }

  private addPitchedRoof(group: THREE.Group, x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material) {
    // Crisp 4-sided hipped/pitched roof
    const cone = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.74, h, 4), mat);
    cone.rotation.y = Math.PI / 4;
    cone.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
    cone.position.set(x, y + h / 2, z);
    group.add(cone);
  }

  // --- 1. COZY PASTEL SUBURBAN HOMES (Matching Reference Neighborhoods) ---
  private buildSuburbanHouses(group: THREE.Group, w: number, d: number, variant: number) {
    // Neat green lawn plot
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.14, d * 0.94), this.materials.lawnGreen);
    lawn.position.y = 0.07;
    group.add(lawn);

    // Subtle backyard fence along back edge
    const fenceBack = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 0.45, 0.12), this.materials.fenceLight);
    fenceBack.position.set(0, 0.3, -d * 0.43);
    group.add(fenceBack);

    const wallMats = [
      this.materials.wallCream,
      this.materials.wallWhite,
      this.materials.wallPastelBlue,
      this.materials.wallPastelYellow,
    ];
    const roofMats = [
      this.materials.roofCoral,
      this.materials.roofBlue,
      this.materials.roofOrange,
      this.materials.roofSlate,
    ];

    const houseW = w * 0.56;
    const houseD = d * 0.52;
    const houseH = 2.2 + (variant % 2) * 0.45;
    const wallMat = wallMats[variant % wallMats.length];
    const roofMat = roofMats[variant % roofMats.length];

    // Main House Body
    const house = new THREE.Mesh(new THREE.BoxGeometry(houseW, houseH, houseD), wallMat);
    house.position.set(-w * 0.08, houseH / 2 + 0.14, 0.2);
    group.add(house);

    // Side Wing / Garage
    const wingW = w * 0.28;
    const wingD = d * 0.4;
    const wingH = 1.65;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(wingW, wingH, wingD), wallMat);
    wing.position.set(w * 0.24, wingH / 2 + 0.14, 0.4);
    group.add(wing);

    // Pitched Roofs
    this.addPitchedRoof(group, -w * 0.08, houseH + 0.14, 0.2, houseW * 1.12, 1.45, houseD * 1.12, roofMat);
    this.addPitchedRoof(group, w * 0.24, wingH + 0.14, 0.4, wingW * 1.12, 0.95, wingD * 1.12, roofMat);

    // White Chimney
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.3, 0.42), this.materials.wallWhite);
    chimney.position.set(-w * 0.22, houseH + 0.85, -0.3);
    group.add(chimney);

    // Clean Driveway
    const drive = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, d * 0.35), this.materials.concrete);
    drive.position.set(w * 0.24, 0.08, d * 0.28);
    group.add(drive);

    // Simple Windows
    for (const wx of [-0.9, 0.9]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.08), this.materials.glassNight);
      win.position.set(-w * 0.08 + wx, 1.35, 0.2 + houseD / 2);
      group.add(win);
    }

    // Yard Trees
    this.addMiniTree(group, -w * 0.34, -d * 0.28, 0.72);
    this.addMiniTree(group, w * 0.32, -d * 0.26, 0.62, variant % 3 === 0);
  }

  // --- 2. PASTEL MID-RISE APARTMENTS (Clean White/Cream/Light-Blue Blocks) ---
  private buildTownhouses(group: THREE.Group, w: number, d: number, variant: number) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.16, d * 0.94), this.materials.concrete);
    pad.position.y = 0.08;
    group.add(pad);

    const wallColors = [this.materials.wallWhite, this.materials.wallCream, this.materials.wallPastelBlue];
    const accentColors = [this.materials.roofBlue, this.materials.roofCoral, this.materials.roofOrange];

    const h = 7.2 + (variant % 3) * 1.4;
    const bldW = w * 0.74;
    const bldD = d * 0.68;

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(bldW, h, bldD),
      wallColors[variant % wallColors.length]
    );
    body.position.set(0, h / 2 + 0.16, 0);
    group.add(body);

    // Clean Roof Parapet & Coloured Roof Top
    const roofCap = new THREE.Mesh(
      new THREE.BoxGeometry(bldW * 0.92, 0.35, bldD * 0.92),
      accentColors[variant % accentColors.length]
    );
    roofCap.position.set(0, h + 0.2, 0);
    group.add(roofCap);

    // Clean Window Grid (Front & Back + Sides)
    const floors = Math.floor(h / 1.7);
    for (let f = 0; f < floors; f++) {
      const fy = 1.3 + f * 1.6;
      const winBandF = new THREE.Mesh(
        new THREE.BoxGeometry(bldW * 0.78, 0.75, bldD + 0.08),
        this.materials.glassNight
      );
      winBandF.position.set(0, fy, 0);
      group.add(winBandF);
    }

    this.addMiniTree(group, -w * 0.36, d * 0.32, 0.75);
    this.addMiniTree(group, w * 0.36, -d * 0.32, 0.75);
  }

  // --- 3. MODERN APARTMENT TOWERS ---
  private buildHighRiseCondos(group: THREE.Group, w: number, d: number, variant: number) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.2, d * 0.94), this.materials.concrete);
    pad.position.y = 0.1;
    group.add(pad);

    // Courtyard Pool
    const pool = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.24, 2.2), this.materials.waterCyan);
    pool.position.set(w * 0.22, 0.12, d * 0.22);
    group.add(pool);

    const h1 = 13.5 + (variant % 2) * 2.0;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(w * 0.52, h1, d * 0.52), this.materials.wallWhite);
    tower.position.set(-w * 0.14, h1 / 2 + 0.2, -d * 0.1);
    group.add(tower);

    // Clean horizontal sky-blue window bands
    for (let y = 1.8; y < h1 - 0.8; y += 1.7) {
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.52 + 0.08, 0.85, d * 0.42),
        this.materials.glassLight
      );
      band.position.set(-w * 0.14, y, -d * 0.1);
      group.add(band);

      const band2 = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.42, 0.85, d * 0.52 + 0.08),
        this.materials.glassLight
      );
      band2.position.set(-w * 0.14, y, -d * 0.1);
      group.add(band2);
    }

    // Pastel Blue Roof Crown
    const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.44, 0.6, d * 0.44), this.materials.roofBlue);
    crown.position.set(-w * 0.14, h1 + 0.5, -d * 0.1);
    group.add(crown);

    this.addMiniTree(group, w * 0.3, -d * 0.28, 0.85, true);
    this.addMiniTree(group, -w * 0.34, d * 0.3, 0.8);
  }

  // --- 4. COLORFUL RETAIL SHOPS & PLAZAS ---
  private buildRetailPlaza(group: THREE.Group, w: number, d: number, variant: number) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.16, d * 0.94), this.materials.concrete);
    pad.position.y = 0.08;
    group.add(pad);

    const accentMats = [this.materials.roofCoral, this.materials.roofBlue, this.materials.roofOrange];
    const accent = accentMats[variant % accentMats.length];

    // Main Crisp Storefront Building
    const h = 3.6;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, h, d * 0.68), this.materials.wallWhite);
    body.position.set(0, h / 2 + 0.16, -0.3);
    group.add(body);

    // Colorful Top Facade Band (like the red/yellow/blue shops in the reference image)
    const topBand = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.95, d * 0.7), accent);
    topBand.position.set(0, h - 0.3, -0.3);
    group.add(topBand);

    // Large Glass Storefront Windows
    const storefront = new THREE.Mesh(new THREE.BoxGeometry(w * 0.68, 1.8, d * 0.7 + 0.06), this.materials.glassLight);
    storefront.position.set(0, 1.3, -0.3);
    group.add(storefront);

    // Entrance Awning
    const awning = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.22, 1.1), accent);
    awning.position.set(0, 2.2, d * 0.34 + 0.15);
    group.add(awning);

    this.addMiniTree(group, -w * 0.36, d * 0.34, 0.7, true);
    this.addMiniTree(group, w * 0.36, d * 0.34, 0.7);
  }

  // --- 5. COLORFUL SHOPPING CENTER (Red, Yellow & White Commercial Complex) ---
  private buildShoppingMall(group: THREE.Group, w: number, d: number, _variant: number) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.18, d * 0.95), this.materials.concrete);
    pad.position.y = 0.09;
    group.add(pad);

    // Main White Commercial Block
    const main = new THREE.Mesh(new THREE.BoxGeometry(w * 0.76, 5.2, d * 0.68), this.materials.wallWhite);
    main.position.set(-0.4, 2.7, -0.4);
    group.add(main);

    // Coral-Red Corner Store Wing (matching the bright red/yellow/blue store in center-right of reference)
    const redWing = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, 5.8, d * 0.42), this.materials.roofCoral);
    redWing.position.set(-w * 0.22, 3.0, d * 0.14);
    group.add(redWing);

    // Sunny Yellow Facade Panel
    const yellowPanel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.38, 3.4, d * 0.4), this.materials.roofYellow);
    yellowPanel.position.set(w * 0.18, 2.2, d * 0.16);
    group.add(yellowPanel);

    // Blue Glass Upper Windows
    const glassBand = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 1.6, d * 0.52), this.materials.glass);
    glassBand.position.set(-0.4, 3.8, -0.4);
    group.add(glassBand);

    this.addMiniTree(group, w * 0.38, d * 0.36, 0.8, true);
    this.addMiniTree(group, -w * 0.38, -d * 0.36, 0.8);
  }

  // --- CENTRAL CITY PARK WITH FOUNTAIN & CHERRY BLOSSOMS (Matches Center of Reference Image) ---
  private buildCityPark(group: THREE.Group, w: number, d: number) {
    // Lush green park turf
    const turf = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.18, d * 0.96), this.materials.lawnGreen);
    turf.position.y = 0.09;
    group.add(turf);

    // Clean paved cross walking paths
    const path1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.2, 2.0), this.materials.concrete);
    path1.position.y = 0.1;
    const path2 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, d * 0.94), this.materials.concrete);
    path2.position.y = 0.1;
    group.add(path1, path2);

    // Circular Central Plaza & Water Fountain
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.22, 24), this.materials.concrete);
    plaza.position.y = 0.11;
    group.add(plaza);

    const basinRim = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.3, 0.45, 20), this.materials.wallWhite);
    basinRim.position.y = 0.3;
    group.add(basinRim);

    const waterPool = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, 0.48, 20), this.materials.waterCyan);
    waterPool.position.y = 0.32;
    group.add(waterPool);

    const tier = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.5, 0.9, 16), this.materials.wallWhite);
    tier.position.y = 0.65;
    const spout = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 12), this.materials.waterCyan);
    spout.position.y = 1.25;
    group.add(tier, spout);

    // Surrounding Pink Cherry Blossom & Green Round Trees
    const corners = [
      { x: -w * 0.3, z: -d * 0.3, pink: true },
      { x: w * 0.3, z: -d * 0.3, pink: false },
      { x: -w * 0.3, z: d * 0.3, pink: false },
      { x: w * 0.3, z: d * 0.3, pink: true },
      { x: -w * 0.36, z: 0.18 * d, pink: true },
      { x: w * 0.22, z: -0.36 * d, pink: true },
    ];
    corners.forEach((c) => this.addMiniTree(group, c.x, c.z, 0.95, c.pink));
  }

  // --- 6. SLEEK AZURE GLASS OFFICE TOWER (Matches Blue Towers in Reference Image) ---
  private buildCorporateSkyscraper(group: THREE.Group, w: number, d: number, variant: number) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.2, d * 0.94), this.materials.concrete);
    pad.position.y = 0.1;
    group.add(pad);

    const h = 15.5 + (variant % 3) * 2.2;
    const tw = w * 0.68;
    const td = d * 0.68;

    // Azure Blue Glass Core
    const glassCore = new THREE.Mesh(new THREE.BoxGeometry(tw, h, td), this.materials.glass);
    glassCore.position.y = h / 2 + 0.2;
    group.add(glassCore);

    // Crisp White Corner Columns
    const colGeo = new THREE.BoxGeometry(0.55, h + 0.4, 0.55);
    for (const cx of [-1, 1]) {
      for (const cz of [-1, 1]) {
        const col = new THREE.Mesh(colGeo, this.materials.wallWhite);
        col.position.set(cx * (tw / 2), h / 2 + 0.2, cz * (td / 2));
        group.add(col);
      }
    }

    // Crisp White Horizontal Mullion Bands
    for (let y = 2.2; y <= h; y += 2.2) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(tw + 0.16, 0.22, td + 0.16), this.materials.wallWhite);
      band.position.y = y;
      group.add(band);
    }

    // White Architectural Roof Crown
    const crown = new THREE.Mesh(new THREE.BoxGeometry(tw * 0.82, 1.1, td * 0.82), this.materials.wallWhite);
    crown.position.y = h + 0.7;
    group.add(crown);
  }

  // --- 7. INDUSTRIAL FACTORY WITH RED-WHITE STRIPED SMOKESTACK (Matches Left Side of Reference) ---
  private buildFactory(group: THREE.Group, w: number, d: number) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.18, d * 0.96), this.materials.concrete);
    pad.position.y = 0.09;
    group.add(pad);

    // Main Clean Cream/Grey Factory Building with Orange Accent Band
    const hall = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, 3.8, d * 0.68), this.materials.wallCream);
    hall.position.set(w * 0.12, 2.0, 0);
    group.add(hall);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.65, 0.35, d * 0.72), this.materials.roofOrange);
    roof.position.set(w * 0.12, 3.95, 0);
    group.add(roof);

    // Cylindrical Storage Tanks
    for (const tz of [-1.6, 1.6]) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 3.6, 16), this.materials.lightConcrete);
      tank.position.set(-w * 0.28, 1.9, tz);
      group.add(tank);
    }

    // Iconic Tall Red-and-White Striped Smokestack
    const stackX = -w * 0.28;
    const stackZ = -0.1;
    const stripeHeights = 5;
    for (let s = 0; s < stripeHeights; s++) {
      const rBottom = 0.85 - s * 0.06;
      const rTop = 0.85 - (s + 1) * 0.06;
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(rTop, rBottom, 2.1, 14),
        s % 2 === 0 ? this.materials.roofCoral : this.materials.wallWhite
      );
      seg.position.set(stackX, 1.2 + s * 2.1, stackZ);
      group.add(seg);
    }
  }

  // --- 8. LOGISTICS WAREHOUSE & SHIPPING CONTAINERS ---
  private buildWarehouse(group: THREE.Group, w: number, d: number) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.18, d * 0.96), this.materials.concrete);
    pad.position.y = 0.09;
    group.add(pad);

    const warehouse = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 4.0, d * 0.56), this.materials.lightConcrete);
    warehouse.position.set(0, 2.1, -d * 0.12);
    group.add(warehouse);

    // Blue Roof Trim
    const trim = new THREE.Mesh(new THREE.BoxGeometry(w * 0.74, 0.4, d * 0.58), this.materials.roofBlue);
    trim.position.set(0, 4.2, -d * 0.12);
    group.add(trim);

    // Loading Bays
    for (let i = -1; i <= 1; i++) {
      const bay = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.1), this.materials.metalDark);
      bay.position.set(i * 2.4, 1.2, -d * 0.12 + d * 0.28);
      group.add(bay);
    }

    // Colorful Stacked Shipping Containers in Yard
    const contGeo = new THREE.BoxGeometry(2.2, 1.1, 1.0);
    const c1 = new THREE.Mesh(contGeo, this.materials.contRed);
    c1.position.set(-w * 0.26, 0.7, d * 0.3);
    const c2 = new THREE.Mesh(contGeo, this.materials.contBlue);
    c2.position.set(-w * 0.26, 1.8, d * 0.3);
    const c3 = new THREE.Mesh(contGeo, this.materials.contYellow);
    c3.position.set(w * 0.22, 0.7, d * 0.3);
    group.add(c1, c2, c3);
  }

  // --- 9. AEROSPACE & ELECTRONICS PLANT ---
  private buildAerospacePlant(group: THREE.Group, w: number, d: number) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.18, d * 0.96), this.materials.concrete);
    pad.position.y = 0.09;
    group.add(pad);

    const plant = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 4.4, d * 0.68), this.materials.wallWhite);
    plant.position.set(-w * 0.06, 2.3, 0);
    group.add(plant);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.38, d * 0.7), this.materials.roofBlue);
    roof.position.set(-w * 0.06, 4.55, 0);
    group.add(roof);

    const sphereGeo = new THREE.SphereGeometry(1.6, 16, 16);
    const s1 = new THREE.Mesh(sphereGeo, this.materials.wallWhite);
    s1.position.set(w * 0.32, 1.7, -d * 0.2);
    const s2 = new THREE.Mesh(sphereGeo, this.materials.wallWhite);
    s2.position.set(w * 0.32, 1.7, d * 0.2);
    group.add(s1, s2);
  }

  // --- 10. UTILITIES ---
  private buildSolarFarm(group: THREE.Group, w: number, d: number) {
    const ground = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.16, d * 0.94), this.materials.lawnGreen);
    ground.position.y = 0.08;
    group.add(ground);

    const panelGeo = new THREE.BoxGeometry(2.1, 0.1, 1.4);
    for (let r = -1; r <= 1; r += 2) {
      for (let c = -1; c <= 1; c += 2) {
        const panel = new THREE.Mesh(panelGeo, this.materials.solarBlue);
        panel.position.set(c * 1.8, 0.95, r * 1.6);
        panel.rotation.x = -0.4;
        group.add(panel);

        const support = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9), this.materials.wallWhite);
        support.position.set(c * 1.8, 0.5, r * 1.6);
        group.add(support);
      }
    }
  }

  private buildPowerPlant(group: THREE.Group, w: number, d: number) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.2, d * 0.94), this.materials.concrete);
    base.position.y = 0.1;
    group.add(base);

    const hall = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 4.5, d * 0.5), this.materials.wallWhite);
    hall.position.set(0, 2.35, d * 0.15);
    group.add(hall);

    const coolingGeo = new THREE.CylinderGeometry(2.1, 3.1, 8.5, 18);
    const ct1 = new THREE.Mesh(coolingGeo, this.materials.lightConcrete);
    ct1.position.set(-w * 0.24, 4.35, -d * 0.18);
    const ct2 = new THREE.Mesh(coolingGeo, this.materials.lightConcrete);
    ct2.position.set(w * 0.24, 4.35, -d * 0.18);
    group.add(ct1, ct2);
  }

  private buildWaterPump(group: THREE.Group, w: number, d: number) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.18, d * 0.94), this.materials.concrete);
    pad.position.y = 0.09;
    group.add(pad);

    const main = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 2.8, d * 0.72), this.materials.wallWhite);
    main.position.set(-w * 0.18, 1.5, 0);
    group.add(main);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.48, 0.3, d * 0.75), this.materials.roofBlue);
    roof.position.set(-w * 0.18, 2.95, 0);
    group.add(roof);

    // Clean Circular Water Filtration Basin
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.9, 16), this.materials.waterCyan);
    basin.position.set(w * 0.2, 0.55, 0);
    group.add(basin);
  }

  // --- 11. SERVICES (Hospital with Helipad matching Far-Right of Reference Image) ---
  private buildHospital(group: THREE.Group, w: number, d: number) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.18, d * 0.94), this.materials.concrete);
    pad.position.y = 0.09;
    group.add(pad);

    const h = 6.2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, h, d * 0.72), this.materials.wallWhite);
    body.position.set(0, h / 2 + 0.18, 0);
    group.add(body);

    // Turquoise Glass Curtain Facade
    const glassFacade = new THREE.Mesh(new THREE.BoxGeometry(w * 0.52, h * 0.78, d * 0.74), this.materials.glassLight);
    glassFacade.position.set(0, h * 0.45, 0);
    group.add(glassFacade);

    // Rooftop Helipad Circle (Blue circle with white 'H')
    const padCircle = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.15, 24), this.materials.roofBlue);
    padCircle.position.set(0, h + 0.25, 0);
    group.add(padCircle);

    const hLeft = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 1.8), this.materials.markingWhite);
    hLeft.position.set(-0.6, h + 0.35, 0);
    const hRight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 1.8), this.materials.markingWhite);
    hRight.position.set(0.6, h + 0.35, 0);
    const hMid = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.35), this.materials.markingWhite);
    hMid.position.set(0, h + 0.35, 0);
    group.add(hLeft, hRight, hMid);

    // Red Cross Emblem on Front
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.32, 0.1), this.materials.redCross);
    c1.position.set(-w * 0.26, h - 0.9, d * 0.37);
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.1, 0.1), this.materials.redCross);
    c2.position.set(-w * 0.26, h - 0.9, d * 0.37);
    group.add(c1, c2);
  }

  private buildPoliceStation(group: THREE.Group, w: number, d: number) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.18, d * 0.94), this.materials.concrete);
    pad.position.y = 0.09;
    group.add(pad);

    const main = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 3.8, d * 0.72), this.materials.wallWhite);
    main.position.y = 2.0;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.45, d * 0.74), this.materials.roofBlue);
    roof.position.y = 4.0;
    group.add(main, roof);
  }

  private buildFireStation(group: THREE.Group, w: number, d: number) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.18, d * 0.94), this.materials.concrete);
    pad.position.y = 0.09;
    group.add(pad);

    const main = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 3.8, d * 0.72), this.materials.roofCoral);
    main.position.y = 2.0;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.35, d * 0.74), this.materials.wallWhite);
    roof.position.y = 4.0;
    group.add(main, roof);
  }

  // --- 12. MILITARY & AIR DEFENSE (Matches the White Radome Tower & Olive Compound in Reference Image) ---
  private buildRadarStation(group: THREE.Group, w: number, d: number, _id: string) {
    // Clean Paved Military Pad with Low Perimeter Fence
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.2, d * 0.96), this.materials.militaryPad);
    pad.position.y = 0.1;
    group.add(pad);

    // Tapered Concrete/Truss Support Tower (matching the radar tower on the right of the reference image)
    const towerBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 2.1, 6.2, 6),
      this.materials.radarTowerTan
    );
    towerBase.position.set(0, 3.2, -0.4);
    group.add(towerBase);

    // Upper Platform Ring
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75, 1.5, 0.45, 12),
      this.materials.darkConcrete
    );
    platform.position.set(0, 6.3, -0.4);
    group.add(platform);

    // Iconic Large White Spherical Radome ("Golf Ball" Dome)
    const radome = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.35, 2),
      this.materials.radarDish
    );
    radome.position.set(0, 8.3, -0.4);
    group.add(radome);

    // Rotating Secondary Radar Scanner Bar (visibly sweeps the sky)
    const rotator = new THREE.Group();
    rotator.position.set(0, 6.65, -0.4);
    const scannerBar = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.32, 0.45),
      this.materials.wallWhite
    );
    scannerBar.position.set(0, 0, 1.5);
    rotator.add(scannerBar);
    group.add(rotator);
    this.animatedRadars.push(rotator);

    // Olive-Green Military Command Truck Parked at Base
    const truck = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.95, 2.4), this.materials.militaryGreen);
    truck.position.set(w * 0.24, 0.65, d * 0.24);
    group.add(truck);
  }

  // 2. Patriot SAM Air-Defense Battery (Rotating 360° Azimuth & Pitch-Elevating Quad Canisters)
  private buildSamBattery(group: THREE.Group, w: number, d: number, id: string) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.2, d * 0.96), this.materials.militaryPad);
    pad.position.y = 0.1;
    group.add(pad);

    // Olive-Green Tactical Launcher Chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.9, d * 0.78), this.materials.militaryGreen);
    chassis.position.y = 0.55;
    group.add(chassis);

    const cab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.66, 1.2, 1.8), this.materials.militaryCamo);
    cab.position.set(0, 1.15, -d * 0.24);
    group.add(cab);

    // Traversing Turret Base (Azimuth Rotation around Y)
    const turretBase = new THREE.Group();
    turretBase.position.set(0, 1.0, d * 0.08);

    const turntable = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 0.35, 14), this.materials.metalDark);
    turntable.position.y = 0.18;
    turretBase.add(turntable);

    // Elevating Pitch Mount (Elevation Rotation around X)
    const pitchMount = new THREE.Group();
    pitchMount.position.set(0, 0.65, 0);

    const cradle = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.28, 3.6), this.materials.militaryGreen);
    pitchMount.add(cradle);

    // Quad Missile Canister Tubes
    const tubeGeo = new THREE.BoxGeometry(0.78, 0.78, 3.9);
    const tubeOffsets = [
      { x: -0.5, y: 0.5 },
      { x: 0.5, y: 0.5 },
      { x: -0.5, y: -0.32 },
      { x: 0.5, y: -0.32 },
    ];

    tubeOffsets.forEach((off) => {
      const tube = new THREE.Mesh(tubeGeo, this.materials.militaryCamo);
      tube.position.set(off.x, off.y + 0.28, 0);
      pitchMount.add(tube);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.08), this.materials.wallWhite);
      cap.position.set(off.x, off.y + 0.28, 1.96);
      pitchMount.add(cap);
    });

    pitchMount.rotation.x = -Math.PI / 4.2;
    turretBase.add(pitchMount);
    group.add(turretBase);

    this.samLaunchers.push({ id, base: turretBase, pitchMount });
  }

  private buildCiws(group: THREE.Group, w: number, d: number) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.2, d * 0.92), this.materials.militaryPad);
    pad.position.y = 0.1;
    group.add(pad);

    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.2, 1.5, 12), this.materials.concrete);
    stand.position.y = 0.85;
    group.add(stand);

    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 16), this.materials.radarDish);
    dome.position.set(0, 2.15, 0);
    group.add(dome);

    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.2, 8), this.materials.metalDark);
    gun.rotateX(Math.PI / 2.5);
    gun.position.set(0, 1.95, 0.95);
    group.add(gun);
  }

  private buildMilitaryHq(group: THREE.Group, w: number, d: number) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.22, d * 0.96), this.materials.militaryPad);
    pad.position.y = 0.11;
    group.add(pad);

    const main = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 4.2, d * 0.68), this.materials.wallWhite);
    main.position.y = 2.2;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.74, 0.45, d * 0.7), this.materials.militaryGreen);
    roof.position.y = 4.45;
    group.add(main, roof);

    const radome = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 16), this.materials.radarDish);
    radome.position.set(-w * 0.2, 5.5, -d * 0.15);
    group.add(radome);
  }

  private buildMilitaryBarracks(group: THREE.Group, w: number, d: number) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.2, d * 0.96), this.materials.militaryPad);
    pad.position.y = 0.1;
    group.add(pad);

    for (const i of [-1, 1]) {
      const barracks = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 2.4, d * 0.32), this.materials.militaryGreen);
      barracks.position.set(0, 1.3, i * d * 0.24);
      group.add(barracks);
    }
  }

  private buildAirbase(group: THREE.Group, w: number, d: number) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.2, d * 0.96), this.materials.militaryPad);
    pad.position.y = 0.1;
    group.add(pad);

    const runway = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.24, d * 0.52), this.materials.asphalt);
    runway.position.set(0, 0.14, -d * 0.14);
    group.add(runway);

    for (let x = -w * 0.38; x <= w * 0.38; x += 4.0) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.3), this.materials.markingWhite);
      stripe.rotateX(-Math.PI / 2);
      stripe.position.set(x, 0.28, -d * 0.14);
      group.add(stripe);
    }

    // Clean Hangars
    for (const hx of [-w * 0.26, w * 0.26]) {
      const hangar = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.8, 4.2), this.materials.lightConcrete);
      hangar.position.set(hx, 1.5, d * 0.25);
      const hRoof = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.35, 4.4), this.materials.militaryGreen);
      hRoof.position.set(hx, 2.95, d * 0.25);
      group.add(hangar, hRoof);
    }

    // Control Tower
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 6.5, 8), this.materials.wallWhite);
    tower.position.set(0, 3.3, d * 0.3);
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.2, 1.4, 8), this.materials.glass);
    cab.position.set(0, 7.0, d * 0.3);
    group.add(tower, cab);

    const fighter = this.createFighterJetMesh();
    fighter.scale.set(0.75, 0.75, 0.75);
    fighter.position.set(-w * 0.06, 0.35, d * 0.22);
    group.add(fighter);
  }

  // --- 13. HARBOR PIER, CRANE, CONTAINERS & YACHT (Matches Bottom-Left of Reference Image) ---
  private buildNavalDock(group: THREE.Group, w: number, d: number) {
    // Concrete Waterfront Quay
    const quay = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 1.4, d * 0.55), this.materials.concrete);
    quay.position.set(0, 0.1, -d * 0.22);
    group.add(quay);

    // Twin Piers Extending into the Water
    for (const px of [-w * 0.26, w * 0.24]) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.6, d * 0.55), this.materials.lightConcrete);
      pier.position.set(px, 0.35, d * 0.24);
      group.add(pier);
    }

    // Colorful Stacked Shipping Containers on the Quay
    const cGeo = new THREE.BoxGeometry(2.4, 1.15, 1.15);
    const colors = [this.materials.contRed, this.materials.contBlue, this.materials.contYellow, this.materials.contOrange];
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(cGeo, colors[i % colors.length]);
      c.position.set(-w * 0.22 + (i % 2) * 2.6, 0.9 + Math.floor(i / 2) * 1.15, -d * 0.22);
      group.add(c);
    }

    // Red Harbor Gantry Crane (matching the red crane in the bottom-left of reference image!)
    const craneGroup = new THREE.Group();
    craneGroup.position.set(w * 0.22, 0.8, -d * 0.15);
    for (const lx of [-1.1, 1.1]) {
      for (const lz of [-0.9, 0.9]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 4.8, 0.28), this.materials.roofCoral);
        leg.position.set(lx, 2.4, lz);
        craneGroup.add(leg);
      }
    }
    const boom = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.45, 5.5), this.materials.roofCoral);
    boom.position.set(0, 4.9, 0.8);
    craneGroup.add(boom);
    group.add(craneGroup);

    // Sleek White Yacht / Patrol Vessel Moored Alongside
    const boat = this.createCorvetteMesh();
    boat.position.set(-w * 0.42, -0.7, d * 0.25);
    group.add(boat);
  }

  private buildResearchLab(group: THREE.Group, w: number, d: number) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.2, d * 0.94), this.materials.concrete);
    pad.position.y = 0.1;
    group.add(pad);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.38, w * 0.4, 2.4, 16), this.materials.wallWhite);
    base.position.y = 1.3;
    group.add(base);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(w * 0.3, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      this.materials.glassLight
    );
    dome.position.set(0, 2.5, 0);
    group.add(dome);
  }

  // --- UNIT MESH HELPERS ---
  public createFighterJetMesh(): THREE.Group {
    const jet = new THREE.Group();

    const bodyGeo = new THREE.ConeGeometry(0.6, 4.2, 6);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, this.materials.lightConcrete);
    jet.add(body);

    const wings = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 1.8), this.materials.lightConcrete);
    wings.position.set(0, 0, -0.35);
    jet.add(wings);

    const finGeo = new THREE.BoxGeometry(0.08, 0.95, 0.85);
    for (const fx of [-0.55, 0.55]) {
      const fin = new THREE.Mesh(finGeo, this.materials.roofBlue);
      fin.position.set(fx, 0.48, -1.4);
      jet.add(fin);
    }

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 1.1), this.materials.glass);
    canopy.position.set(0, 0.32, 0.4);
    jet.add(canopy);

    return jet;
  }

  public createCorvetteMesh(): THREE.Group {
    const ship = new THREE.Group();

    // Crisp White Hull with Blue Stripe (matching the harbor yacht/patrol vessel in reference)
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 6.8), this.materials.wallWhite);
    hull.position.y = 0.55;
    ship.add(hull);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.22, 6.84), this.materials.roofBlue);
    stripe.position.y = 0.78;
    ship.add(stripe);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.95, 3.2), this.materials.wallWhite);
    cabin.position.set(0, 1.4, -0.2);
    ship.add(cabin);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 0.8), this.materials.glass);
    windshield.position.set(0, 1.5, 1.25);
    ship.add(windshield);

    return ship;
  }
}
