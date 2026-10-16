import { Threat, PlacedBuilding, CombatLogEntry } from '../types/game';

export interface ThreatWaveRecipe {
  name: string;
  count: number;
  threatType: 'drone_recon' | 'drone_swarm' | 'cruise_missile' | 'stealth_bomber' | 'hypersonic';
  speed: number;
  health: number;
  altitude: number;
}

export class DifficultyDirector {
  public waveIndex: number = 0;
  public totalInterceptions: number = 0;
  public totalImpacts: number = 0;
  public threatHistory: { waveIndex: number; name: string; intercepted: number; impacted: number }[] = [];

  // Determine wave composition based on population, readiness, defense infrastructure, and player combat history
  public composeNextWave(
    population: number,
    militaryReadiness: number,
    buildings: PlacedBuilding[]
  ): ThreatWaveRecipe {
    this.waveIndex++;

    const samCount = buildings.filter((b) => b.type === 'def_sam_battery' && b.active && b.powered).length;
    const ciwsCount = buildings.filter((b) => b.type === 'def_ciws' && b.active && b.powered).length;
    const airbaseCount = buildings.filter((b) => b.type === 'mil_airbase' && b.active && b.powered).length;

    // Difficulty score based on city progression & defensive density
    const defenseScore = samCount * 25 + ciwsCount * 15 + airbaseCount * 30 + militaryReadiness * 0.4;

    if (this.waveIndex <= 2 && defenseScore < 50) {
      return {
        name: 'Tactical Recon Probe',
        count: 1,
        threatType: 'drone_recon',
        speed: 13,
        health: 80,
        altitude: 16,
      };
    } else if (this.waveIndex <= 5 && defenseScore < 90) {
      return {
        name: 'Coordinated Drone Incursion',
        count: Math.min(3, 1 + Math.floor(population / 3000)),
        threatType: 'drone_swarm',
        speed: 15,
        health: 110,
        altitude: 18,
      };
    } else if (this.waveIndex <= 9 && defenseScore < 140) {
      return {
        name: 'Low-Altitude Cruise Missile Strike',
        count: 2,
        threatType: 'cruise_missile',
        speed: 22,
        health: 160,
        altitude: 12,
      };
    } else if (this.waveIndex <= 14 && defenseScore < 200) {
      return {
        name: 'Stealth Bomber Penetration Run',
        count: 1,
        threatType: 'stealth_bomber',
        speed: 26,
        health: 320,
        altitude: 28,
      };
    } else {
      return {
        name: 'Hypersonic Glide Infiltration',
        count: 2,
        threatType: 'hypersonic',
        speed: 34,
        health: 450,
        altitude: 32,
      };
    }
  }

  public recordInterception() {
    this.totalInterceptions++;
  }

  public recordImpact() {
    this.totalImpacts++;
  }
}
