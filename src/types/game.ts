// WATCH OUT - Core Type Definitions

export type BuildingCategory =
  | 'roads'
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'utilities'
  | 'services'
  | 'defense'
  | 'military'
  | 'research';

export type BuildingType =
  // Roads
  | 'road_two_lane'
  | 'road_highway'
  | 'road_bridge'
  // Residential
  | 'res_low'
  | 'res_suburb'
  | 'res_high'
  // Commercial
  | 'com_retail'
  | 'com_mall'
  | 'com_skyscraper'
  // Industrial
  | 'ind_factory'
  | 'ind_warehouse'
  | 'ind_heavy'
  // Utilities
  | 'util_solar'
  | 'util_power_plant'
  | 'util_water_pump'
  // Services
  | 'serv_hospital'
  | 'serv_police'
  | 'serv_fire'
  // Defense
  | 'def_radar'
  | 'def_sam_battery'
  | 'def_ciws'
  | 'def_bunker'
  // Military
  | 'mil_hq'
  | 'mil_barracks'
  | 'mil_airbase'
  | 'mil_naval_dock'
  // Research
  | 'res_lab';

export interface BuildingDef {
  id: BuildingType;
  name: string;
  category: BuildingCategory;
  cost: number;
  maintenance: number;
  width: number; // grid size (e.g. 1, 2, 4)
  depth: number;
  powerDemand: number; // negative for generation, positive for consumption
  waterDemand: number; // negative for supply, positive for consumption
  description: string;
  maxHealth: number;
  // Specific capabilities
  populationCapacity?: number;
  jobsCapacity?: number;
  productionType?: 'steel' | 'concrete' | 'electronics' | 'supplies';
  productionRate?: number;
  radarRadius?: number; // for radar / SAM
  defenseRange?: number;
  interceptChance?: number;
  fireRate?: number;
  requiredTech?: string;
  serviceRadius?: number;
}

export interface PlacedBuilding {
  id: string;
  type: BuildingType;
  x: number;
  z: number;
  rotation: number; // 0, 90, 180, 270 in radians (0, PI/2, PI, 3PI/2)
  width: number;
  depth: number;
  health: number;
  maxHealth: number;
  powered: boolean;
  watered: boolean;
  active: boolean;
  level: number;
  lastRepaired?: number;
  damageFire?: boolean;
}

export interface RoadNode {
  id: string;
  x: number;
  z: number;
  elevation: number;
  connectedTo: string[]; // IDs of connected nodes
}

export interface RoadSegment {
  id: string;
  startNodeId: string;
  endNodeId: string;
  type: 'road_two_lane' | 'road_highway' | 'road_bridge';
}

export interface EconomyState {
  treasury: number;
  hourlyTax: number;
  hourlyExpenses: number;
  netIncome: number;
  population: number;
  maxHousing: number;
  jobsAvailable: number;
  jobsFilled: number;
  employmentRate: number;
  approvalRating: number; // 0-100%
  // Resources
  steel: number;
  concrete: number;
  electronics: number;
  militarySupplies: number;
  // Power & Water
  powerGenerated: number;
  powerConsumed: number;
  waterSupplied: number;
  waterConsumed: number;
  // Military
  militaryReadiness: number; // 0-100%
  threatLevel: 'MINIMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
}

export interface Threat {
  id: string;
  name: string;
  type: 'drone_recon' | 'drone_swarm' | 'cruise_missile' | 'stealth_bomber' | 'hypersonic';
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetZ: number;
  targetBuildingId?: string;
  speed: number;
  health: number;
  maxHealth: number;
  detected: boolean;
  altitude: number;
  heading: number;
}

export interface InterceptorMissile {
  id: string;
  originX: number;
  originY: number;
  originZ: number;
  x: number;
  y: number;
  z: number;
  targetThreatId: string;
  speed: number;
  lifeTime: number;
}

export type MissionStatus = 'READY' | 'PREPARING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface MilitaryMission {
  id: string;
  name: string;
  description: string;
  targetName: string;
  targetX: number;
  targetZ: number;
  requiredAirbase: boolean;
  requiredSupplies: number;
  cost: number;
  durationSeconds: number;
  riskPercent: number;
  rewardCash: number;
  rewardSupplies: number;
  status: MissionStatus;
  progressPercent: number;
  elapsedTime: number;
  assignedFighters: number;
}

export interface TechNode {
  id: string;
  name: string;
  branch: 'civil' | 'industry' | 'defense' | 'offense';
  description: string;
  cost: number;
  researchTimeSeconds: number;
  prerequisites: string[];
  unlocked: boolean;
  researching: boolean;
  progress: number;
  perkDescription: string;
}

export interface CombatLogEntry {
  id: string;
  timestamp: string;
  type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS' | 'DANGER';
  message: string;
}

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  ambienceVolume: number;
  graphicsQuality: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';
  shadowsEnabled: boolean;
  timeOfDay: number; // 0 to 24 hours
  dayCycleSpeed: number; // multiplier
}
