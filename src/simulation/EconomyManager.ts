import { PlacedBuilding, EconomyState, TechNode } from '../types/game';
import { BUILDING_DEFS } from '../data/buildingDefs';
import { UtilityGrid } from './UtilityGrid';

export class EconomyManager {
  public state: EconomyState;

  constructor() {
    this.state = {
      treasury: 50000,
      hourlyTax: 2450,
      hourlyExpenses: 450,
      netIncome: 2000,
      population: 1240,
      maxHousing: 1480,
      jobsAvailable: 960,
      jobsFilled: 868,
      employmentRate: 92,
      approvalRating: 92,
      steel: 180,
      concrete: 240,
      electronics: 85,
      militarySupplies: 65,
      powerGenerated: 185,
      powerConsumed: 158,
      waterSupplied: 160,
      waterConsumed: 147,
      militaryReadiness: 88,
      threatLevel: 'MINIMAL',
    };
  }

  public tick(buildings: PlacedBuilding[], techTree: TechNode[], deltaSeconds: number) {
    // 1. Calculate Utilities
    const util = UtilityGrid.calculate(buildings);
    this.state.powerGenerated = Math.max(100, util.powerGenerated);
    this.state.powerConsumed = Math.max(40, util.powerConsumed);
    this.state.waterSupplied = Math.max(100, util.waterSupplied);
    this.state.waterConsumed = Math.max(40, util.waterConsumed);

    const hasUrbanPlanning = techTree.find((t) => t.id === 'urban_planning' && t.unlocked);
    const housingBonus = hasUrbanPlanning ? 1.2 : 1.0;

    const hasAutoLogistics = techTree.find((t) => t.id === 'automated_logistics' && t.unlocked);
    const prodBonus = hasAutoLogistics ? 1.35 : 1.0;

    let maxHousing = 0;
    let jobsCapacity = 0;
    let totalExpenses = 0;
    let activeRadars = 0;
    let activeSams = 0;
    let activeAirbases = 0;
    let damagedCount = 0;

    buildings.forEach((b) => {
      if (b.health < b.maxHealth) damagedCount++;
      const def = BUILDING_DEFS[b.type];
      totalExpenses += def.maintenance;

      if (!b.active || b.health <= 0) return;

      if (def.populationCapacity) {
        maxHousing += Math.round(def.populationCapacity * housingBonus);
      }
      if (def.jobsCapacity) {
        jobsCapacity += def.jobsCapacity;
      }

      if (b.powered && def.productionType && def.productionRate) {
        const prod = (def.productionRate * prodBonus * deltaSeconds) / 10;
        if (def.productionType === 'steel') this.state.steel += prod;
        if (def.productionType === 'concrete') this.state.concrete += prod;
        if (def.productionType === 'electronics') this.state.electronics += prod;
        if (def.productionType === 'supplies') this.state.militarySupplies += prod;
      }

      if (b.type === 'def_radar' && b.powered) activeRadars++;
      if (b.type === 'def_sam_battery' && b.powered) activeSams++;
      if (b.type === 'mil_airbase' && b.powered) activeAirbases++;
      if (b.type === 'mil_barracks' && b.powered) this.state.militarySupplies += 0.5 * deltaSeconds;
    });

    this.state.maxHousing = Math.max(1240, maxHousing);
    this.state.jobsAvailable = Math.max(600, jobsCapacity);

    // 3. Population Growth Model
    if (this.state.population < this.state.maxHousing) {
      const growthRate = (this.state.approvalRating / 100) * 2.5 * deltaSeconds;
      this.state.population = Math.min(this.state.maxHousing, Math.round(this.state.population + growthRate));
    } else if (this.state.population > this.state.maxHousing) {
      this.state.population = Math.max(0, Math.round(this.state.population - 2 * deltaSeconds));
    }

    // 4. Employment & Jobs
    this.state.jobsFilled = Math.min(this.state.jobsAvailable, Math.round(this.state.population * 0.75));
    this.state.employmentRate =
      this.state.jobsAvailable > 0
        ? Math.min(100, Math.round((this.state.jobsFilled / Math.max(1, this.state.population * 0.75)) * 100))
        : 100;

    // 5. Taxation & Revenue
    const citizenTax = Math.round(this.state.population * 1.15);
    const commercialTax = Math.round(this.state.jobsFilled * 1.25);
    this.state.hourlyTax = citizenTax + commercialTax;
    this.state.hourlyExpenses = totalExpenses;
    this.state.netIncome = this.state.hourlyTax - this.state.hourlyExpenses;

    this.state.treasury += (this.state.netIncome * deltaSeconds) / 12;

    // 6. Citizen Approval Rating
    let happiness = 92;
    if (util.powerSurplus < 0) happiness -= 25;
    if (util.waterSurplus < 0) happiness -= 20;
    if (damagedCount > 0) happiness -= Math.min(30, damagedCount * 8);
    if (this.state.employmentRate < 60) happiness -= 15;
    this.state.approvalRating = Math.max(10, Math.min(100, happiness));

    // 7. Military Readiness
    let readiness = 35;
    readiness += activeRadars * 18;
    readiness += activeSams * 20;
    readiness += activeAirbases * 25;
    if (this.state.militarySupplies > 20) readiness += 10;
    this.state.militaryReadiness = Math.min(100, readiness);

    // 8. Threat Level
    if (this.state.population > 2200) {
      this.state.threatLevel = 'CRITICAL';
    } else if (this.state.population > 1600) {
      this.state.threatLevel = 'HIGH';
    } else if (this.state.population > 1350) {
      this.state.threatLevel = 'ELEVATED';
    } else {
      this.state.threatLevel = 'MINIMAL';
    }
  }

  public deductFunds(amount: number): boolean {
    if (this.state.treasury >= amount) {
      this.state.treasury -= amount;
      return true;
    }
    return false;
  }

  public addFunds(amount: number) {
    this.state.treasury += amount;
  }

  public addSupplies(amount: number) {
    this.state.militarySupplies += amount;
  }
}
