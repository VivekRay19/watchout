import * as THREE from 'three';
import { PlacedBuilding } from '../types/game';
import { BUILDING_DEFS } from '../data/buildingDefs';

export interface BuildingVisualStage {
  mainGroup: THREE.Group;
  scaffoldGroup: THREE.Group;
  damageGroup: THREE.Group;
  unpoweredBadge: THREE.Mesh;
}

export class BuildingRenderer {
  private materials: { [key: string]: THREE.Material } = {};

  // Event-driven animation registries (keyed by buildingId for clean lifecycle & state checks)
  public animatedRadars: { id: string; object: THREE.Object3D }[] = [];
  public animatedFans: { id: string; object: THREE.Object3D }[] = [];
  public animatedCranes: { id: string; object: THREE.Object3D; baseAngle: number; speed: number }[] = [];
  public smokeStacks: { id: string; localPos: THREE.Vector3; kind: 'smoke' | 'steam' }[] = [];
  public fountainSprays: THREE.Object3D[] = [];
  public lighthouseBeams: THREE.Object3D[] = [];
  public samLaunchers: { id: string; base: THREE.Object3D; pitchMount: THREE.Object3D }[] = [];
  public buildingStages: Map<string, BuildingVisualStage> = new Map();

  constructor() {
    this.initMaterials();
  }

  private initMaterials() {
    // Stylized, rich isometric city-builder palette (matching reference image)
    this.materials.wallWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.64, metalness: 0.04 });
    this.materials.wallCream = new THREE.MeshStandardMaterial({ color: 0xfbf2dd, roughness: 0.68, metalness: 0.04 });
    this.materials.wallPastelBlue = new THREE.MeshStandardMaterial({ color: 0xd6ecfb, roughness: 0.65, metalness: 0.04 });
    this.materials.wallPastelYellow = new THREE.MeshStandardMaterial({ color: 0xfce9a8, roughness: 0.68, metalness: 0.04 });
    this.materials.wallTerracotta = new THREE.MeshStandardMaterial({ color: 0xdf7a4e, roughness: 0.66, metalness: 0.04 });
    this.materials.wallSandstone = new THREE.MeshStandardMaterial({ color: 0xe8cfb0, roughness: 0.7, metalness: 0.04 });
    this.materials.wallSage = new THREE.MeshStandardMaterial({ color: 0xd4e9d2, roughness: 0.68, metalness: 0.04 });
    this.materials.wallYellowInd = new THREE.MeshStandardMaterial({ color: 0xf4c44e, roughness: 0.62, metalness: 0.08 });
    this.materials.concrete = new THREE.MeshStandardMaterial({ color: 0xd5dde6, roughness: 0.76, metalness: 0.04 });
    this.materials.darkConcrete = new THREE.MeshStandardMaterial({ color: 0x7c8b9e, roughness: 0.78, metalness: 0.06 });
    this.materials.lightConcrete = new THREE.MeshStandardMaterial({ color: 0xeef2f6, roughness: 0.7, metalness: 0.04 });

    // Cohesive roofs & accents
    this.materials.roofCoral = new THREE.MeshStandardMaterial({ color: 0xd94e3b, roughness: 0.6, metalness: 0.05 });
    this.materials.roofBlue = new THREE.MeshStandardMaterial({ color: 0x3578e5, roughness: 0.6, metalness: 0.05 });
    this.materials.roofOrange = new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.6, metalness: 0.05 });
    this.materials.roofSlate = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.64, metalness: 0.08 });
    this.materials.roofBrown = new THREE.MeshStandardMaterial({ color: 0x7c4d34, roughness: 0.68, metalness: 0.04 });
    this.materials.roofYellow = new THREE.MeshStandardMaterial({ color: 0xf5b82e, roughness: 0.58, metalness: 0.05 });
    this.materials.craneYellow = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.48, metalness: 0.22 });

    // Windows & Night Emissive Glazing
    this.materials.glass = new THREE.MeshStandardMaterial({
      color: 0x2f80ed,
      roughness: 0.18,
      metalness: 0.38,
    });
    this.materials.glassLight = new THREE.MeshStandardMaterial({
      color: 0x68b5f5,
      roughness: 0.22,
      metalness: 0.25,
    });
    this.materials.glassNight = new THREE.MeshStandardMaterial({
      color: 0x5aa9ee,
      emissive: 0xffe082,
      emissiveIntensity: 0.0,
      roughness: 0.25,
    });
    this.materials.signGlow = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.25,
      roughness: 0.3,
    });
    this.materials.runwayLight = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfacc15,
      emissiveIntensity: 0.3,
    });

    // Ground pads & landscaping
    this.materials.lawnGreen = new THREE.MeshStandardMaterial({ color: 0x72c83b, roughness: 0.82, metalness: 0.02 });
    this.materials.treeGreen = new THREE.MeshStandardMaterial({ color: 0x56b026, roughness: 0.75, flatShading: true });
    this.materials.treeLime = new THREE.MeshStandardMaterial({ color: 0x82d144, roughness: 0.75, flatShading: true });
    this.materials.treeBlossom = new THREE.MeshStandardMaterial({ color: 0xf48fb1, roughness: 0.72, flatShading: true });
    this.materials.trunkBrown = new THREE.MeshStandardMaterial({ color: 0x754c32, roughness: 0.85 });
    this.materials.fenceLight = new THREE.MeshStandardMaterial({ color: 0xe2d8c3, roughness: 0.75 });
    this.materials.waterCyan = new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.14, metalness: 0.12 });
    this.materials.waterFoam = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.82 });

    // Industrial, Harbor & Military
    this.materials.solarBlue = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.24, metalness: 0.52 });
    this.materials.metalIndustrial = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.42, metalness: 0.45 });
    this.materials.metalDark = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.4 });
    this.materials.militaryGreen = new THREE.MeshStandardMaterial({ color: 0x4d6338, roughness: 0.66, metalness: 0.14 });
    this.materials.militaryCamo = new THREE.MeshStandardMaterial({ color: 0x5e7644, roughness: 0.64, metalness: 0.14 });
    this.materials.militaryPad = new THREE.MeshStandardMaterial({ color: 0xc8c2b6, roughness: 0.78, metalness: 0.04 });
    this.materials.hangarArch = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.55, metalness: 0.25 });
    this.materials.radarTowerTan = new THREE.MeshStandardMaterial({ color: 0x9c9588, roughness: 0.7, metalness: 0.15 });
    this.materials.radarDish = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32, metalness: 0.1 });
    this.materials.asphalt = new THREE.MeshStandardMaterial({ color: 0x3f4854, roughness: 0.82, metalness: 0.04 });
    this.materials.markingYellow = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    this.materials.markingWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.materials.redCross = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    this.materials.damageChar = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.92 });
    this.materials.beaconBeam = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Shipping container colors
    this.materials.contRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });
    this.materials.contBlue = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.6 });
    this.materials.contYellow = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.6 });
    this.materials.contOrange = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.6 });
    this.materials.contGreen = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 });
  }

  public updateNightLighting(nightFactor: number) {
    if (this.materials.glassNight instanceof THREE.MeshStandardMaterial) {
      this.materials.glassNight.emissiveIntensity = nightFactor * 0.9;
    }
    if (this.materials.signGlow instanceof THREE.MeshStandardMaterial) {
      this.materials.signGlow.emissiveIntensity = 0.2 + nightFactor * 0.75;
    }
    if (this.materials.runwayLight instanceof THREE.MeshStandardMaterial) {
      this.materials.runwayLight.emissiveIntensity = 0.2 + nightFactor * 0.95;
    }
    if (this.materials.beaconBeam instanceof THREE.MeshBasicMaterial) {
      this.materials.beaconBeam.opacity = 0.08 + nightFactor * 0.34;
    }
  }

  public removeBuildingReferences(buildingId: string) {
    this.animatedRadars = this.animatedRadars.filter((r) => r.id !== buildingId);
    this.animatedFans = this.animatedFans.filter((f) => f.id !== buildingId);
    this.animatedCranes = this.animatedCranes.filter((c) => c.id !== buildingId);
    this.smokeStacks = this.smokeStacks.filter((s) => s.id !== buildingId);
    this.samLaunchers = this.samLaunchers.filter((l) => l.id !== buildingId);
    this.buildingStages.delete(buildingId);
  }

  public createBuildingMesh(building: PlacedBuilding): THREE.Group {
    this.removeBuildingReferences(building.id);

    const rootGroup = new THREE.Group();
    rootGroup.name = building.id;

    const mainGroup = new THREE.Group();
    rootGroup.add(mainGroup);

    const def = BUILDING_DEFS[building.type];
    const width = def.width * 4;
    const depth = def.depth * 4;
    const variant =
      building.variant !== undefined
        ? building.variant
        : Math.abs(Math.round(building.x * 7 + building.z * 13));

    if (building.id.includes('park') || building.type === 'def_bunker') {
      this.buildCityPark(mainGroup, width, depth);
    } else {
      switch (building.type) {
        case 'res_low':
          this.buildSuburbanHouses(mainGroup, width, depth, variant);
          break;
        case 'res_suburb':
          this.buildTownhouses(mainGroup, width, depth, variant, building.id);
          break;
        case 'res_high':
          this.buildHighRiseCondos(mainGroup, width, depth, variant, building.id);
          break;
        case 'com_retail':
          this.buildRetailPlaza(mainGroup, width, depth, variant);
          break;
        case 'com_mall':
          this.buildShoppingMall(mainGroup, width, depth, variant, building.id);
          break;
        case 'com_skyscraper':
          this.buildCorporateSkyscraper(mainGroup, width, depth, variant, building.id);
          break;
        case 'ind_factory':
          this.buildFactory(mainGroup, width, depth, building.id);
          break;
        case 'ind_warehouse':
          this.buildWarehouse(mainGroup, width, depth, building.id);
          break;
        case 'ind_heavy':
          this.buildAerospacePlant(mainGroup, width, depth, building.id);
          break;
        case 'util_solar':
          this.buildSolarFarm(mainGroup, width, depth);
          break;
        case 'util_power_plant':
          this.buildPowerPlant(mainGroup, width, depth, building.id);
          break;
        case 'util_water_pump':
          this.buildWaterPump(mainGroup, width, depth);
          break;
        case 'serv_hospital':
          this.buildHospital(mainGroup, width, depth, building.id);
          break;
        case 'serv_police':
          this.buildPoliceStation(mainGroup, width, depth);
          break;
        case 'serv_fire':
          this.buildFireStation(mainGroup, width, depth);
          break;
        case 'def_radar':
          this.buildRadarStation(mainGroup, width, depth, building.id);
          break;
        case 'def_sam_battery':
          this.buildSamBattery(mainGroup, width, depth, building.id, variant);
          break;
        case 'def_ciws':
          this.buildCiws(mainGroup, width, depth, building.id);
          break;
        case 'mil_hq':
          this.buildMilitaryHq(mainGroup, width, depth, building.id);
          break;
        case 'mil_barracks':
          this.buildMilitaryBarracks(mainGroup, width, depth);
          break;
        case 'mil_airbase':
          this.buildAirbase(mainGroup, width, depth, building.id);
          break;
        case 'mil_naval_dock':
          this.buildNavalDock(mainGroup, width, depth, building.id);
          break;
        case 'res_lab':
          this.buildResearchLab(mainGroup, width, depth);
          break;
        default: {
          const box = new THREE.Mesh(new THREE.BoxGeometry(width, 4, depth), this.materials.wallWhite);
          box.position.y = 2;
          mainGroup.add(box);
          break;
        }
      }
    }

    // Staged Construction Scaffolding Group (visible only while building.isConstructing)
    const scaffoldGroup = this.createConstructionScaffold(width, depth);
    scaffoldGroup.visible = !!building.isConstructing;
    rootGroup.add(scaffoldGroup);

    // Damage Overlay Group (visible when building.health < building.maxHealth * 0.85)
    const damageGroup = this.createDamageOverlay(width, depth);
    damageGroup.visible = building.health < building.maxHealth * 0.85;
    rootGroup.add(damageGroup);

    // Unpowered indicator badge (visible when !building.powered && !building.isConstructing)
    const unpoweredBadge = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.65, 0),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    unpoweredBadge.position.set(0, 7.5, 0);
    unpoweredBadge.visible = !building.powered && !building.isConstructing;
    rootGroup.add(unpoweredBadge);

    this.buildingStages.set(building.id, {
      mainGroup,
      scaffoldGroup,
      damageGroup,
      unpoweredBadge,
    });

    this.updateBuildingStage(building);
    this.enableShadows(rootGroup);
    return rootGroup;
  }

  public updateBuildingStage(building: PlacedBuilding) {
    const stage = this.buildingStages.get(building.id);
    if (!stage) return;

    if (building.isConstructing) {
      const p = Math.max(0.05, Math.min(1, building.constructionProgress ?? 0));
      stage.scaffoldGroup.visible = true;
      stage.mainGroup.scale.set(1, p, 1);
    } else {
      stage.scaffoldGroup.visible = false;
      stage.mainGroup.scale.set(1, 1, 1);
    }

    stage.damageGroup.visible = building.health < building.maxHealth * 0.85;
    stage.unpoweredBadge.visible = !building.powered && !building.isConstructing;
  }

  private createConstructionScaffold(w: number, d: number): THREE.Group {
    const g = new THREE.Group();
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.28, d * 0.92), this.materials.concrete);
    slab.position.y = 0.14;
    g.add(slab);

    // Corner scaffolding posts
    const postGeo = new THREE.BoxGeometry(0.18, 4.8, 0.18);
    for (const sx of [-w * 0.38, w * 0.38]) {
      for (const sz of [-d * 0.38, d * 0.38]) {
        const post = new THREE.Mesh(postGeo, this.materials.craneYellow);
        post.position.set(sx, 2.4, sz);
        g.add(post);
      }
    }

    // Mini construction crane mast & jib
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.35, 6.8, 0.35), this.materials.craneYellow);
    mast.position.set(-w * 0.32, 3.4, -d * 0.32);
    const jib = new THREE.Mesh(new THREE.BoxGeometry(w * 0.75, 0.28, 0.28), this.materials.craneYellow);
    jib.position.set(-w * 0.02, 6.7, -d * 0.32);
    g.add(mast, jib);
    return g;
  }

  private createDamageOverlay(w: number, d: number): THREE.Group {
    const g = new THREE.Group();
    const rubble1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 0), this.materials.damageChar);
    rubble1.position.set(-w * 0.2, 0.5, d * 0.22);
    const rubble2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 0), this.materials.damageChar);
    rubble2.position.set(w * 0.22, 0.4, -d * 0.18);
    g.add(rubble1, rubble2);
    return g;
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
    tGroup.position.set(x, 0.08, z);
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

  private addRooftopHvacFan(group: THREE.Group, x: number, y: number, z: number, buildingId: string) {
    const unit = new THREE.Group();
    unit.position.set(x, y, z);

    const housing = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 1.1), this.materials.lightConcrete);
    housing.position.y = 0.22;
    unit.add(housing);

    const ventRing = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.48, 12), this.materials.metalDark);
    ventRing.position.y = 0.24;
    unit.add(ventRing);

    const rotor = new THREE.Group();
    rotor.position.y = 0.49;
    const blade1 = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.04, 0.14), this.materials.wallWhite);
    const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.68), this.materials.wallWhite);
    rotor.add(blade1, blade2);
    unit.add(rotor);

    group.add(unit);
    this.animatedFans.push({ id: buildingId, object: rotor });
  }

  private addIndustrialJibCrane(
    group: THREE.Group,
    x: number,
    y: number,
    z: number,
    height: number,
    boomLen: number,
    buildingId: string,
    baseAngle = 0
  ) {
    const craneBase = new THREE.Group();
    craneBase.position.set(x, y, z);

    // Lattice/tower mast
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.65, height, 0.65), this.materials.craneYellow);
    mast.position.y = height / 2;
    craneBase.add(mast);

    // Rotating top assembly
    const slewingUnit = new THREE.Group();
    slewingUnit.position.y = height;
    slewingUnit.rotation.y = baseAngle;

    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 0.95), this.materials.craneYellow);
    cab.position.set(0, 0.4, 0);
    slewingUnit.add(cab);

    const boom = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, boomLen), this.materials.craneYellow);
    boom.position.set(0, 0.55, boomLen * 0.32);
    slewingUnit.add(boom);

    const counterWeight = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.55, 1.1), this.materials.darkConcrete);
    counterWeight.position.set(0, 0.45, -boomLen * 0.2);
    slewingUnit.add(counterWeight);

    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2), this.materials.metalDark);
    cable.position.set(0, -0.55, boomLen * 0.68);
    slewingUnit.add(cable);

    craneBase.add(slewingUnit);
    group.add(craneBase);

    this.animatedCranes.push({
      id: buildingId,
      object: slewingUnit,
      baseAngle,
      speed: 0.55 + (Math.abs(x + z) % 5) * 0.08,
    });
  }

  private addPitchedRoof(
    group: THREE.Group,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material
  ) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.74, h, 4), mat);
    cone.rotation.y = Math.PI / 4;
    cone.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
    cone.position.set(x, y + h / 2, z);
    group.add(cone);
  }

  // --- 1. VARIED SUBURBAN HOMES (4 Distinct Architectural Variants) ---
  private buildSuburbanHouses(group: THREE.Group, w: number, d: number, variant: number) {
    const v = variant % 4;

    // Ground lawn & curb apron
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.14, d * 0.95), this.materials.lawnGreen);
    lawn.position.y = 0.07;
    group.add(lawn);

    // Backyard wooden fence
    const fenceBack = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 0.42, 0.12), this.materials.fenceLight);
    fenceBack.position.set(0, 0.28, -d * 0.43);
    group.add(fenceBack);

    const wallMats = [
      this.materials.wallCream,
      this.materials.wallPastelYellow,
      this.materials.wallPastelBlue,
      this.materials.wallSandstone,
    ];
    const roofMats = [
      this.materials.roofCoral,
      this.materials.roofSlate,
      this.materials.roofOrange,
      this.materials.roofBrown,
    ];

    const wallMat = wallMats[v];
    const roofMat = roofMats[v];

    const houseW = w * (v === 1 ? 0.52 : 0.58);
    const houseD = d * (v === 2 ? 0.56 : 0.5);
    const houseH = v === 1 ? 2.85 : 2.25;

    const house = new THREE.Mesh(new THREE.BoxGeometry(houseW, houseH, houseD), wallMat);
    house.position.set(-w * 0.08, houseH / 2 + 0.14, 0.15);
    group.add(house);

    // Side Garage / Wing
    const wingW = w * 0.28;
    const wingD = d * 0.42;
    const wingH = 1.75;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(wingW, wingH, wingD), wallMat);
    wing.position.set(w * 0.24, wingH / 2 + 0.14, 0.35);
    group.add(wing);

    // Garage Roll-Up Door
    const garageDoor = new THREE.Mesh(new THREE.BoxGeometry(wingW * 0.72, 1.2, 0.08), this.materials.lightConcrete);
    garageDoor.position.set(w * 0.24, 0.75, 0.35 + wingD / 2 + 0.02);
    group.add(garageDoor);

    // Pitched Roofs + Dormer on Variant 0 & 3
    this.addPitchedRoof(group, -w * 0.08, houseH + 0.14, 0.15, houseW * 1.12, 1.45, houseD * 1.12, roofMat);
    this.addPitchedRoof(group, w * 0.24, wingH + 0.14, 0.35, wingW * 1.12, 0.95, wingD * 1.12, roofMat);

    if (v === 0 || v === 3) {
      const dormer = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 0.9), wallMat);
      dormer.position.set(-w * 0.08, houseH + 0.55, 0.15 + houseD * 0.28);
      group.add(dormer);
    }

    // Front Porch Canopy
    const porch = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.85), roofMat);
    porch.position.set(-w * 0.08, 1.45, 0.15 + houseD / 2 + 0.35);
    group.add(porch);

    // Chimney
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.35, 0.42), this.materials.wallWhite);
    chimney.position.set(-w * 0.22, houseH + 0.85, -0.25);
    group.add(chimney);

    // Driveway + Parked Car on Variants 1 & 2
    const drive = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, d * 0.36), this.materials.concrete);
    drive.position.set(w * 0.24, 0.08, d * 0.28);
    group.add(drive);

    // Windows (illuminate warm yellow at night)
    for (const wx of [-0.95, 0.95]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.08), this.materials.glassNight);
      win.position.set(-w * 0.08 + wx, 1.32, 0.15 + houseD / 2 + 0.02);
      group.add(win);
      if (v === 1) {
        const winTop = win.clone();
        winTop.position.y = 2.25;
        group.add(winTop);
      }
    }

    // Garden shrubs & yard trees
    this.addMiniTree(group, -w * 0.34, -d * 0.28, 0.72);
    this.addMiniTree(group, w * 0.32, -d * 0.26, 0.64, v === 2);
  }

  // --- 2. MID-RISE APARTMENTS (Terracotta, Cream & Slate-Blue Blocks with Balconies & Rooftop Fans) ---
  private buildTownhouses(group: THREE.Group, w: number, d: number, variant: number, id: string) {
    const v = variant % 3;
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.16, d * 0.95), this.materials.concrete);
    pad.position.y = 0.08;
    group.add(pad);

    const wallColors = [this.materials.wallTerracotta, this.materials.wallCream, this.materials.wallWhite];
    const roofColors = [this.materials.roofSlate, this.materials.roofBlue, this.materials.roofOrange];

    const h = 7.4 + v * 1.1;
    const bldW = w * 0.74;
    const bldD = d * 0.68;

    const body = new THREE.Mesh(new THREE.BoxGeometry(bldW, h, bldD), wallColors[v]);
    body.position.set(0, h / 2 + 0.16, 0);
    group.add(body);

    // White Architectural Corner Trim
    for (const cx of [-1, 1]) {
      for (const cz of [-1, 1]) {
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.35, h + 0.1, 0.35), this.materials.wallWhite);
        trim.position.set(cx * (bldW / 2), h / 2 + 0.16, cz * (bldD / 2));
        group.add(trim);
      }
    }

    // Roof Parapet & Coloured Roof Deck
    const roofCap = new THREE.Mesh(new THREE.BoxGeometry(bldW * 0.94, 0.35, bldD * 0.94), roofColors[v]);
    roofCap.position.set(0, h + 0.22, 0);
    group.add(roofCap);

    // Window Grids & Projecting Balconies
    const floors = Math.floor(h / 1.65);
    for (let f = 0; f < floors; f++) {
      const fy = 1.35 + f * 1.55;
      const winBand = new THREE.Mesh(
        new THREE.BoxGeometry(bldW * 0.78, 0.72, bldD + 0.08),
        this.materials.glassNight
      );
      winBand.position.set(0, fy, 0);
      group.add(winBand);

      if (f > 0) {
        for (const bx of [-bldW * 0.24, bldW * 0.24]) {
          const balcony = new THREE.Mesh(
            new THREE.BoxGeometry(1.25, 0.24, bldD + 0.42),
            this.materials.wallWhite
          );
          balcony.position.set(bx, fy - 0.32, 0);
          group.add(balcony);
        }
      }
    }

    // Rotating Rooftop HVAC Fan
    this.addRooftopHvacFan(group, bldW * 0.2, h + 0.38, -bldD * 0.18, id);

    this.addMiniTree(group, -w * 0.36, d * 0.32, 0.76);
    this.addMiniTree(group, w * 0.36, -d * 0.32, 0.72);
  }

  // --- 3. MODERN APARTMENT TOWERS ---
  private buildHighRiseCondos(group: THREE.Group, w: number, d: number, variant: number, id: string) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.2, d * 0.95), this.materials.concrete);
    pad.position.y = 0.1;
    group.add(pad);

    const pool = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.24, 2.2), this.materials.waterCyan);
    pool.position.set(w * 0.22, 0.12, d * 0.22);
    group.add(pool);

    const h1 = 12.8 + (variant % 2) * 1.8;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(w * 0.54, h1, d * 0.54), this.materials.wallWhite);
    tower.position.set(-w * 0.12, h1 / 2 + 0.2, -d * 0.08);
    group.add(tower);

    for (let y = 1.8; y < h1 - 0.8; y += 1.65) {
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.54 + 0.08, 0.82, d * 0.44),
        this.materials.glassNight
      );
      band.position.set(-w * 0.12, y, -d * 0.08);
      group.add(band);

      const band2 = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.44, 0.82, d * 0.54 + 0.08),
        this.materials.glassLight
      );
      band2.position.set(-w * 0.12, y, -d * 0.08);
      group.add(band2);
    }

    const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.46, 0.55, d * 0.46), this.materials.roofBlue);
    crown.position.set(-w * 0.12, h1 + 0.45, -d * 0.08);
    group.add(crown);

    this.addRooftopHvacFan(group, -w * 0.12, h1 + 0.72, -d * 0.08, id);
    this.addMiniTree(group, w * 0.3, -d * 0.28, 0.82);
    this.addMiniTree(group, -w * 0.34, d * 0.3, 0.78);
  }

  // --- 4. COLORFUL RETAIL SHOPS & BISTROS ---
  private buildRetailPlaza(group: THREE.Group, w: number, d: number, variant: number) {
    const v = variant % 3;
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.16, d * 0.95), this.materials.concrete);
    pad.position.y = 0.08;
    group.add(pad);

    const accentMats = [this.materials.roofCoral, this.materials.roofBlue, this.materials.roofOrange];
    const accent = accentMats[v];

    const h = 3.6 + (v === 1 ? 0.8 : 0);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w * 0.76, h, d * 0.64), this.materials.wallWhite);
    body.position.set(0, h / 2 + 0.16, -0.35);
    group.add(body);

    const topBand = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.85, d * 0.66), accent);
    topBand.position.set(0, h - 0.25, -0.35);
    group.add(topBand);

    // Illuminated Rooftop Signboard
    const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, 0.55, 0.18), this.materials.signGlow);
    sign.position.set(0, h + 0.42, d * 0.22);
    group.add(sign);

    // Storefront Glazing
    const storefront = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.66, 1.75, d * 0.66 + 0.06),
      this.materials.glassNight
    );
    storefront.position.set(0, 1.25, -0.35);
    group.add(storefront);

    // Striped Entrance Awning
    const awning = new THREE.Mesh(new THREE.BoxGeometry(w * 0.58, 0.22, 1.15), accent);
    awning.position.set(0, 2.15, d * 0.32);
    group.add(awning);

    // Parking Lot Stripes in Front
    for (const px of [-w * 0.22, 0, w * 0.22]) {
      const pLine = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 1.2), this.materials.markingWhite);
      pLine.position.set(px, 0.17, d * 0.38);
      group.add(pLine);
    }

    this.addMiniTree(group, -w * 0.36, d * 0.34, 0.68);
    this.addMiniTree(group, w * 0.36, d * 0.34, 0.68);
  }

  // --- 5. COMMERCIAL PLAZA & SHOPPING COMPLEX ---
  private buildShoppingMall(group: THREE.Group, w: number, d: number, _variant: number, id: string) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.18, d * 0.95), this.materials.concrete);
    pad.position.y = 0.09;
    group.add(pad);

    const main = new THREE.Mesh(new THREE.BoxGeometry(w * 0.76, 5.2, d * 0.66), this.materials.wallWhite);
    main.position.set(-0.3, 2.7, -0.3);
    group.add(main);

    const redWing = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, 5.8, d * 0.42), this.materials.roofCoral);
    redWing.position.set(-w * 0.2, 3.0, d * 0.14);
    group.add(redWing);

    const yellowPanel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.38, 3.6, d * 0.4), this.materials.roofYellow);
    yellowPanel.position.set(w * 0.18, 2.2, d * 0.16);
    group.add(yellowPanel);

    const glassBand = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 1.65, d * 0.52), this.materials.glassNight);
    glassBand.position.set(-0.3, 3.8, -0.3);
    group.add(glassBand);

    this.addRooftopHvacFan(group, w * 0.12, 5.3, -d * 0.18, id);
    this.addMiniTree(group, w * 0.38, d * 0.36, 0.8);
    this.addMiniTree(group, -w * 0.38, -d * 0.36, 0.8);
  }

  // --- CENTRAL CITY PARK WITH ANIMATED FOUNTAIN & TREES ---
  private buildCityPark(group: THREE.Group, w: number, d: number) {
    const turf = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.18, d * 0.96), this.materials.lawnGreen);
    turf.position.y = 0.09;
    group.add(turf);

    const path1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.2, 2.1), this.materials.concrete);
    path1.position.y = 0.1;
    const path2 = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.2, d * 0.94), this.materials.concrete);
    path2.position.y = 0.1;
    group.add(path1, path2);

    // Park Benches along paths
    for (const bx of [-2.8, 2.8]) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.32, 0.38), this.materials.trunkBrown);
      bench.position.set(bx, 0.32, 1.35);
      group.add(bench);
    }

    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.22, 24), this.materials.concrete);
    plaza.position.y = 0.11;
    group.add(plaza);

    const basinRim = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.45, 0.48, 24), this.materials.wallWhite);
    basinRim.position.y = 0.32;
    group.add(basinRim);

    const waterPool = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.5, 24), this.materials.waterCyan);
    waterPool.position.y = 0.34;
    group.add(waterPool);

    const tier = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.55, 0.95, 16), this.materials.wallWhite);
    tier.position.y = 0.68;
    group.add(tier);

    // Animated Fountain Spray Plume
    const sprayGroup = new THREE.Group();
    sprayGroup.position.y = 1.25;
    const spout = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.1, 12, 1, true), this.materials.waterFoam);
    spout.rotation.x = Math.PI;
    sprayGroup.add(spout);
    group.add(sprayGroup);
    this.fountainSprays.push(sprayGroup);

    const corners = [
      { x: -w * 0.3, z: -d * 0.3, pink: false },
      { x: w * 0.3, z: -d * 0.3, pink: false },
      { x: -w * 0.3, z: d * 0.3, pink: false },
      { x: w * 0.3, z: d * 0.3, pink: true },
      { x: -w * 0.36, z: 0.18 * d, pink: false },
      { x: w * 0.22, z: -0.36 * d, pink: true },
    ];
    corners.forEach((c) => this.addMiniTree(group, c.x, c.z, 0.95, c.pink));
  }

  // --- 6. OFFICE BUILDINGS & TOWERS ---
  private buildCorporateSkyscraper(group: THREE.Group, w: number, d: number, variant: number, id: string) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.2, d * 0.95), this.materials.concrete);
    pad.position.y = 0.1;
    group.add(pad);

    const h = 11.5 + (variant % 3) * 1.8;
    const tw = w * 0.68;
    const td = d * 0.68;

    const glassCore = new THREE.Mesh(new THREE.BoxGeometry(tw, h, td), this.materials.glassNight);
    glassCore.position.y = h / 2 + 0.2;
    group.add(glassCore);

    const colGeo = new THREE.BoxGeometry(0.55, h + 0.4, 0.55);
    for (const cx of [-1, 1]) {
      for (const cz of [-1, 1]) {
        const col = new THREE.Mesh(colGeo, this.materials.wallWhite);
        col.position.set(cx * (tw / 2), h / 2 + 0.2, cz * (td / 2));
        group.add(col);
      }
    }

    for (let y = 2.0; y <= h; y += 2.0) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(tw + 0.16, 0.24, td + 0.16), this.materials.wallWhite);
      band.position.y = y;
      group.add(band);
    }

    const crown = new THREE.Mesh(new THREE.BoxGeometry(tw * 0.82, 0.9, td * 0.82), this.materials.wallWhite);
    crown.position.y = h + 0.6;
    group.add(crown);

    this.addRooftopHvacFan(group, tw * 0.18, h + 1.05, -td * 0.15, id);
  }

  // --- 7. HEAVY INDUSTRIAL FACTORY WITH REFINERY DOMES, TWIN SMOKESTACKS & ROTATING CRANE ---
  private buildFactory(group: THREE.Group, w: number, d: number, id: string) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.18, d * 0.96), this.materials.concrete);
    pad.position.y = 0.09;
    group.add(pad);

    // Main Industrial Processing Hall
    const hall = new THREE.Mesh(new THREE.BoxGeometry(w * 0.56, 3.9, d * 0.62), this.materials.lightConcrete);
    hall.position.set(w * 0.14, 2.05, -0.4);
    group.add(hall);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.58, 0.35, d * 0.65), this.materials.roofSlate);
    roof.position.set(w * 0.14, 4.05, -0.4);
    group.add(roof);

    // Spherical/Dome Refinery Storage Tanks (matching upper-left of reference image!)
    for (const tz of [-2.2, 1.4]) {
      const sphereTank = new THREE.Mesh(new THREE.SphereGeometry(1.65, 16, 14), this.materials.metalIndustrial);
      sphereTank.position.set(-w * 0.26, 1.75, tz);
      group.add(sphereTank);

      const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.35, 0.8, 12), this.materials.darkConcrete);
      collar.position.set(-w * 0.26, 0.5, tz);
      group.add(collar);
    }

    // Twin Red-and-White Striped Smokestacks (releasing rising smoke when operational!)
    const stackPositions = [
      { x: -w * 0.04, z: -d * 0.24 },
      { x: w * 0.16, z: -d * 0.24 },
    ];

    stackPositions.forEach((sp) => {
      const stripeCount = 5;
      for (let s = 0; s < stripeCount; s++) {
        const rBottom = 0.72 - s * 0.05;
        const rTop = 0.72 - (s + 1) * 0.05;
        const seg = new THREE.Mesh(
          new THREE.CylinderGeometry(rTop, rBottom, 1.95, 14),
          s % 2 === 0 ? this.materials.roofCoral : this.materials.wallWhite
        );
        seg.position.set(sp.x, 1.15 + s * 1.95, sp.z);
        group.add(seg);
      }
      this.smokeStacks.push({
        id,
        localPos: new THREE.Vector3(sp.x, 1.15 + stripeCount * 1.95, sp.z),
        kind: 'smoke',
      });
    });

    // Yellow Industrial Jib Crane in Yard
    this.addIndustrialJibCrane(group, w * 0.34, 0.18, d * 0.28, 6.2, 4.6, id, 0.6);
  }

  // --- 8. YELLOW INDUSTRIAL WAREHOUSE & LOGISTICS YARD ---
  private buildWarehouse(group: THREE.Group, w: number, d: number, id: string) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.18, d * 0.96), this.materials.concrete);
    pad.position.y = 0.09;
    group.add(pad);

    // Yellow Industrial Warehouse (matching reference industrial district)
    const warehouse = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.74, 3.8, d * 0.56),
      this.materials.wallYellowInd
    );
    warehouse.position.set(-0.4, 2.0, -d * 0.12);
    group.add(warehouse);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.76, 0.36, d * 0.58), this.materials.roofSlate);
    roof.position.set(-0.4, 3.98, -d * 0.12);
    group.add(roof);

    // Roll-up Loading Bays
    for (let i = -1; i <= 1; i++) {
      const bay = new THREE.Mesh(new THREE.BoxGeometry(1.55, 2.1, 0.12), this.materials.metalDark);
      bay.position.set(-0.4 + i * 2.3, 1.15, -d * 0.12 + d * 0.28);
      group.add(bay);
    }

    // Stacked Containers + Rotating Yard Crane
    const contGeo = new THREE.BoxGeometry(2.2, 1.05, 1.0);
    const c1 = new THREE.Mesh(contGeo, this.materials.contRed);
    c1.position.set(-w * 0.26, 0.68, d * 0.3);
    const c2 = new THREE.Mesh(contGeo, this.materials.contBlue);
    c2.position.set(-w * 0.26, 1.74, d * 0.3);
    group.add(c1, c2);

    this.addIndustrialJibCrane(group, w * 0.32, 0.18, d * 0.26, 5.4, 4.0, id, -0.8);
  }

  // --- 9. AEROSPACE & ELECTRONICS PLANT ---
  private buildAerospacePlant(group: THREE.Group, w: number, d: number, id: string) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.18, d * 0.96), this.materials.concrete);
    pad.position.y = 0.09;
    group.add(pad);

    const plant = new THREE.Mesh(new THREE.BoxGeometry(w * 0.76, 4.4, d * 0.66), this.materials.wallWhite);
    plant.position.set(-w * 0.06, 2.3, 0);
    group.add(plant);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.38, d * 0.68), this.materials.roofBlue);
    roof.position.set(-w * 0.06, 4.55, 0);
    group.add(roof);

    const sphereGeo = new THREE.SphereGeometry(1.55, 16, 16);
    const s1 = new THREE.Mesh(sphereGeo, this.materials.metalIndustrial);
    s1.position.set(w * 0.32, 1.7, -d * 0.2);
    const s2 = new THREE.Mesh(sphereGeo, this.materials.metalIndustrial);
    s2.position.set(w * 0.32, 1.7, d * 0.2);
    group.add(s1, s2);

    this.addRooftopHvacFan(group, -w * 0.18, 4.74, 0, id);
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

  private buildPowerPlant(group: THREE.Group, w: number, d: number, id: string) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.2, d * 0.95), this.materials.concrete);
    base.position.y = 0.1;
    group.add(base);

    const hall = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 4.4, d * 0.48), this.materials.wallWhite);
    hall.position.set(0, 2.3, d * 0.16);
    group.add(hall);

    const coolingGeo = new THREE.CylinderGeometry(2.0, 2.9, 7.8, 18);
    const ct1 = new THREE.Mesh(coolingGeo, this.materials.lightConcrete);
    ct1.position.set(-w * 0.24, 4.0, -d * 0.18);
    const ct2 = new THREE.Mesh(coolingGeo, this.materials.lightConcrete);
    ct2.position.set(w * 0.24, 4.0, -d * 0.18);
    group.add(ct1, ct2);

    this.smokeStacks.push(
      { id, localPos: new THREE.Vector3(-w * 0.24, 8.0, -d * 0.18), kind: 'steam' },
      { id, localPos: new THREE.Vector3(w * 0.24, 8.0, -d * 0.18), kind: 'steam' }
    );
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

    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.9, 16), this.materials.waterCyan);
    basin.position.set(w * 0.2, 0.55, 0);
    group.add(basin);
  }

  // --- 11. SERVICES (Hospital with Helipad & HVAC) ---
  private buildHospital(group: THREE.Group, w: number, d: number, id: string) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.18, d * 0.94), this.materials.concrete);
    pad.position.y = 0.09;
    group.add(pad);

    const h = 6.2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, h, d * 0.72), this.materials.wallWhite);
    body.position.set(0, h / 2 + 0.18, 0);
    group.add(body);

    const glassFacade = new THREE.Mesh(new THREE.BoxGeometry(w * 0.52, h * 0.78, d * 0.74), this.materials.glassNight);
    glassFacade.position.set(0, h * 0.45, 0);
    group.add(glassFacade);

    const padCircle = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.15, 24), this.materials.roofBlue);
    padCircle.position.set(-0.6, h + 0.25, 0);
    group.add(padCircle);

    const hLeft = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 1.6), this.materials.markingWhite);
    hLeft.position.set(-1.15, h + 0.35, 0);
    const hRight = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 1.6), this.materials.markingWhite);
    hRight.position.set(-0.05, h + 0.35, 0);
    const hMid = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.32), this.materials.markingWhite);
    hMid.position.set(-0.6, h + 0.35, 0);
    group.add(hLeft, hRight, hMid);

    const c1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.32, 0.1), this.materials.redCross);
    c1.position.set(-w * 0.26, h - 0.9, d * 0.37);
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.1, 0.1), this.materials.redCross);
    c2.position.set(-w * 0.26, h - 0.9, d * 0.37);
    group.add(c1, c2);

    this.addRooftopHvacFan(group, w * 0.24, h + 0.18, -d * 0.18, id);
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

  // --- 12. MILITARY & AIR DEFENSE (White Geodesic Radome Tower & Mobile SAM Launchers) ---
  private buildRadarStation(group: THREE.Group, w: number, d: number, id: string) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.2, d * 0.96), this.materials.militaryPad);
    pad.position.y = 0.1;
    group.add(pad);

    // Raised Concrete/Truss Pedestal Legs (matching the white radome tower in upper-right of reference)
    for (const lx of [-1.25, 1.25]) {
      for (const lz of [-1.25, 1.25]) {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.38, 4.8, 8),
          this.materials.radarTowerTan
        );
        leg.position.set(lx, 2.5, lz - 0.3);
        group.add(leg);
      }
    }

    const coreShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.2, 4.8, 8),
      this.materials.darkConcrete
    );
    coreShaft.position.set(0, 2.5, -0.3);
    group.add(coreShaft);

    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.55, 3.8),
      this.materials.concrete
    );
    platform.position.set(0, 5.0, -0.3);
    group.add(platform);

    // Iconic Large White Geodesic Spherical Radome
    const radome = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.65, 2),
      this.materials.radarDish
    );
    radome.position.set(0, 7.35, -0.3);
    group.add(radome);

    // Rotating Secondary Phased-Array Scanner Bar
    const rotator = new THREE.Group();
    rotator.position.set(0, 5.45, -0.3);
    const scannerBar = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.32, 0.45),
      this.materials.wallWhite
    );
    scannerBar.position.set(0, 0, 1.8);
    rotator.add(scannerBar);
    group.add(rotator);
    this.animatedRadars.push({ id, object: rotator });

    // Olive-Green Military Radar Command Truck at Base
    const truck = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 2.6), this.materials.militaryGreen);
    truck.position.set(w * 0.24, 0.68, d * 0.24);
    group.add(truck);
  }

  private buildSamBattery(group: THREE.Group, w: number, d: number, id: string, variant = 0) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.2, d * 0.96), this.materials.militaryPad);
    pad.position.y = 0.1;
    group.add(pad);

    // Olive-Green 8x8 Tactical TEL Launcher Truck Chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.92, d * 0.8), this.materials.militaryGreen);
    chassis.position.y = 0.58;
    group.add(chassis);

    // 4 Axles / Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 10);
    wheelGeo.rotateZ(Math.PI / 2);
    for (const wz of [-d * 0.28, -d * 0.1, d * 0.1, d * 0.28]) {
      for (const wx of [-w * 0.36, w * 0.36]) {
        const wheel = new THREE.Mesh(wheelGeo, this.materials.metalDark);
        wheel.position.set(wx, 0.42, wz);
        group.add(wheel);
      }
    }

    const cab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.68, 1.25, 1.85), this.materials.militaryCamo);
    cab.position.set(0, 1.2, -d * 0.25);
    group.add(cab);

    // Traversing Turret Base (Azimuth Rotation around Y)
    const turretBase = new THREE.Group();
    turretBase.position.set(0, 1.05, d * 0.08);

    const turntable = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 0.35, 14), this.materials.metalDark);
    turntable.position.y = 0.18;
    turretBase.add(turntable);

    // Elevating Pitch Mount (Elevation Rotation around X)
    const pitchMount = new THREE.Group();
    pitchMount.position.set(0, 0.65, 0);

    const cradle = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.28, 3.7), this.materials.militaryGreen);
    pitchMount.add(cradle);

    if (variant % 2 === 0) {
      // Quad Angled Patriot SAM Canister Tubes
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
      pitchMount.rotation.x = -Math.PI / 4.0;
    } else {
      // Twin Cylindrical Long-Range S-300/TEL Tubes
      const cylGeo = new THREE.CylinderGeometry(0.56, 0.56, 4.2, 12);
      cylGeo.rotateX(Math.PI / 2);
      for (const tx of [-0.62, 0.62]) {
        const tube = new THREE.Mesh(cylGeo, this.materials.militaryCamo);
        tube.position.set(tx, 0.55, 0);
        pitchMount.add(tube);
      }
      pitchMount.rotation.x = -Math.PI / 3.2;
    }

    turretBase.add(pitchMount);
    group.add(turretBase);

    this.samLaunchers.push({ id, base: turretBase, pitchMount });
  }

  private buildCiws(group: THREE.Group, w: number, d: number, id: string) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.2, d * 0.92), this.materials.militaryPad);
    pad.position.y = 0.1;
    group.add(pad);

    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.2, 1.5, 12), this.materials.concrete);
    stand.position.y = 0.85;
    group.add(stand);

    const turretBase = new THREE.Group();
    turretBase.position.set(0, 1.6, 0);

    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 16), this.materials.radarDish);
    dome.position.set(0, 0.55, 0);
    turretBase.add(dome);

    const pitchMount = new THREE.Group();
    pitchMount.position.set(0, 0.35, 0.4);
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.2, 8), this.materials.metalDark);
    gun.rotateX(Math.PI / 2);
    gun.position.set(0, 0, 0.65);
    pitchMount.add(gun);

    turretBase.add(pitchMount);
    group.add(turretBase);

    this.samLaunchers.push({ id, base: turretBase, pitchMount });
  }

  private buildMilitaryHq(group: THREE.Group, w: number, d: number, id: string) {
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

    this.addRooftopHvacFan(group, w * 0.18, 4.68, d * 0.12, id);
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

  // --- 13. MILITARY AIRBASE (Runway, 3 Arched Hangars, ATC Tower & Lattice Comms Towers) ---
  private buildAirbase(group: THREE.Group, w: number, d: number, id: string) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.2, d * 0.98), this.materials.militaryPad);
    pad.position.y = 0.1;
    group.add(pad);

    // Asphalt Runway with Threshold Piano Keys & Centerline
    const runway = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.24, d * 0.46), this.materials.asphalt);
    runway.position.set(0, 0.14, d * 0.2);
    group.add(runway);

    for (let x = -w * 0.38; x <= w * 0.38; x += 3.6) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.28), this.materials.markingWhite);
      stripe.rotateX(-Math.PI / 2);
      stripe.position.set(x, 0.28, d * 0.2);
      group.add(stripe);
    }

    // Runway Edge Lights (illuminate at night)
    for (let x = -w * 0.42; x <= w * 0.42; x += 4.2) {
      for (const rz of [d * 0.2 - d * 0.21, d * 0.2 + d * 0.21]) {
        const rLight = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), this.materials.runwayLight);
        rLight.position.set(x, 0.3, rz);
        group.add(rLight);
      }
    }

    // 3 Arched Aircraft Hangars along the North Apron (matching upper-right of reference screenshot!)
    for (const hx of [-w * 0.3, -w * 0.04, w * 0.22]) {
      const hGroup = new THREE.Group();
      hGroup.position.set(hx, 0.2, -d * 0.16);

      const hWalls = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.8, 3.8), this.materials.lightConcrete);
      hWalls.position.y = 0.9;
      hGroup.add(hWalls);

      const archGeo = new THREE.CylinderGeometry(2.2, 2.2, 3.9, 14, 1, false, 0, Math.PI);
      archGeo.rotateZ(Math.PI / 2);
      archGeo.rotateY(Math.PI / 2);
      const archRoof = new THREE.Mesh(archGeo, this.materials.hangarArch);
      archRoof.position.y = 1.8;
      hGroup.add(archRoof);

      const door = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.6, 0.12), this.materials.metalDark);
      door.position.set(0, 0.85, 1.9);
      hGroup.add(door);

      group.add(hGroup);
    }

    // Tall White-and-Blue Air Traffic Control Tower with Rotating Radar Dish
    const towerX = w * 0.38;
    const towerZ = -d * 0.08;
    const towerShaft = new THREE.Mesh(new THREE.BoxGeometry(2.1, 7.2, 2.1), this.materials.wallWhite);
    towerShaft.position.set(towerX, 3.7, towerZ);
    const towerCab = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.35, 1.5, 8), this.materials.glassNight);
    towerCab.position.set(towerX, 7.8, towerZ);
    const towerRoof = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.3, 8), this.materials.roofBlue);
    towerRoof.position.set(towerX, 8.65, towerZ);
    group.add(towerShaft, towerCab, towerRoof);

    const atcRadar = new THREE.Group();
    atcRadar.position.set(towerX, 9.0, towerZ);
    const dish = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 0.25), this.materials.wallWhite);
    atcRadar.add(dish);
    group.add(atcRadar);
    this.animatedRadars.push({ id, object: atcRadar });

    // 2 Red-and-White Lattice Radio/Radar Masts Behind the Hangars (matching reference!)
    for (const mx of [-w * 0.18, w * 0.12]) {
      const mastH = 6.8;
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.65, mastH, 4),
        this.materials.roofCoral
      );
      mast.position.set(mx, mastH / 2 + 0.2, -d * 0.42);
      const crossArm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 0.18), this.materials.wallWhite);
      crossArm.position.set(mx, mastH - 0.4, -d * 0.42);
      group.add(mast, crossArm);
    }
  }

  // --- 14. HARBOR PIER, PORT CRANE, CONTAINERS & YACHT ---
  private buildNavalDock(group: THREE.Group, w: number, d: number, id: string) {
    const quay = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 1.4, d * 0.55), this.materials.concrete);
    quay.position.set(0, 0.1, -d * 0.22);
    group.add(quay);

    // Twin Piers Extending into the Bay
    for (const px of [-w * 0.26, w * 0.24]) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.6, d * 0.62), this.materials.lightConcrete);
      pier.position.set(px, 0.35, d * 0.26);
      group.add(pier);
    }

    // Stacked Shipping Containers
    const cGeo = new THREE.BoxGeometry(2.3, 1.1, 1.1);
    const colors = [this.materials.contRed, this.materials.contBlue, this.materials.contYellow, this.materials.contOrange];
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(cGeo, colors[i % colors.length]);
      c.position.set(-w * 0.22 + (i % 2) * 2.5, 0.88 + Math.floor(i / 2) * 1.1, -d * 0.22);
      group.add(c);
    }

    // Animated Red Port Gantry Crane
    const craneGroup = new THREE.Group();
    craneGroup.position.set(-w * 0.24, 0.65, d * 0.08);
    for (const lx of [-1.0, 1.0]) {
      for (const lz of [-0.85, 0.85]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 4.6, 0.28), this.materials.roofCoral);
        leg.position.set(lx, 2.3, lz);
        craneGroup.add(leg);
      }
    }
    const slewingTop = new THREE.Group();
    slewingTop.position.y = 4.65;
    const boom = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.42, 5.4), this.materials.roofCoral);
    boom.position.set(0, 0, 0.8);
    slewingTop.add(boom);
    craneGroup.add(slewingTop);
    group.add(craneGroup);

    this.animatedCranes.push({
      id,
      object: slewingTop,
      baseAngle: 0,
      speed: 0.45,
    });

    // Moored White Luxury Yacht Alongside Pier
    const boat = this.createCorvetteMesh();
    boat.position.set(0.1, -0.68, d * 0.28);
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

  // --- SCENIC & VEHICLE MESH FACTORIES ---

  // Coastal Lighthouse for the Rocky Bay Islets (matching bottom-right of reference screenshot!)
  public createLighthouseMesh(): THREE.Group {
    const lh = new THREE.Group();

    // Keeper's cottage at base
    const cottage = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.7, 2.2), this.materials.wallWhite);
    cottage.position.set(-0.9, 0.9, 0);
    lh.add(cottage);
    this.addPitchedRoof(lh, -0.9, 1.75, 0, 2.9, 1.0, 2.5, this.materials.roofCoral);

    // Striped Red-and-White Lighthouse Tower
    for (let s = 0; s < 5; s++) {
      const rBot = 1.05 - s * 0.08;
      const rTop = 1.05 - (s + 1) * 0.08;
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(rTop, rBot, 1.5, 14),
        s % 2 === 0 ? this.materials.wallWhite : this.materials.roofCoral
      );
      seg.position.set(0.6, 0.8 + s * 1.5, 0);
      lh.add(seg);
    }

    // Gallery Deck & Glass Lantern Room
    const gallery = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.75, 0.28, 14), this.materials.roofCoral);
    gallery.position.set(0.6, 8.3, 0);
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.95, 12), this.materials.runwayLight);
    lantern.position.set(0.6, 8.9, 0);
    const dome = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.75, 12), this.materials.roofCoral);
    dome.position.set(0.6, 9.7, 0);
    lh.add(gallery, lantern, dome);

    // Rotating Beacon Beam
    const beamPivot = new THREE.Group();
    beamPivot.position.set(0.6, 8.9, 0);
    const coneGeo = new THREE.ConeGeometry(1.6, 9.5, 12, 1, true);
    coneGeo.rotateX(Math.PI / 2);
    coneGeo.translate(0, 0, 4.8);
    const beam = new THREE.Mesh(coneGeo, this.materials.beaconBeam);
    beamPivot.add(beam);
    lh.add(beamPivot);
    this.lighthouseBeams.push(beamPivot);

    this.enableShadows(lh);
    return lh;
  }

  // Container Cargo Ship for the River/Bay Shipping Channel (matching right-center of reference screenshot!)
  public createCargoShipMesh(): THREE.Group {
    const ship = new THREE.Group();

    // Red lower hull + Dark Blue upper hull
    const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.95, 14.5), this.materials.roofCoral);
    lowerHull.position.y = 0.45;
    ship.add(lowerHull);

    const upperHull = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.95, 15.2), this.materials.roofSlate);
    upperHull.position.y = 1.25;
    ship.add(upperHull);

    // White Stern Superstructure / Bridge
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.8, 2.6), this.materials.wallWhite);
    bridge.position.set(0, 2.8, -5.2);
    ship.add(bridge);

    const bridgeGlass = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.55, 0.8), this.materials.glassNight);
    bridgeGlass.position.set(0, 3.6, -4.1);
    ship.add(bridgeGlass);

    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 1.4, 10), this.materials.roofOrange);
    funnel.position.set(0, 4.6, -5.6);
    ship.add(funnel);

    // Stacked Colorful Shipping Containers on Deck
    const cGeo = new THREE.BoxGeometry(1.65, 0.95, 2.8);
    const mats = [
      this.materials.contRed,
      this.materials.contBlue,
      this.materials.contYellow,
      this.materials.contOrange,
      this.materials.contGreen,
    ];
    let mIdx = 0;
    for (const cz of [-1.8, 1.4, 4.6]) {
      for (const cx of [-0.95, 0.95]) {
        for (let cy = 0; cy < 2; cy++) {
          const cont = new THREE.Mesh(cGeo, mats[mIdx++ % mats.length]);
          cont.position.set(cx, 2.15 + cy * 0.98, cz);
          ship.add(cont);
        }
      }
    }

    this.enableShadows(ship);
    return ship;
  }

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
