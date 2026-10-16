import { PlacedBuilding, EconomyState, TechNode } from '../types/game';
import { BUILDING_DEFS } from '../data/buildingDefs';
import { UtilityGrid } from './UtilityGrid';
import { LoanManager } from './LoanManager';

export class EconomyManager {
  public state: EconomyState;
  public loanManager: LoanManager;

  constructor() {
    this.loanManager = new LoanManager();
    this.state = {
      treasury: 25680,
      hourlyTax: 3120,
      hourlyExpenses: 640,
      netIncome: 2480,
      population: 4320,
      maxHousing: 4950,
      jobsAvailable: 3420,
      jobsFilled: 3180,
      employmentRate: 93,
      approvalRating: 92,
      steel: 220,
      concrete: 290,
      electronics: 110,
      militarySupplies: 85,
      powerGenerated: 380,
      powerConsumed: 296,
      waterSupplied: 320,
      waterConsumed: 294,
      militaryReadiness: 92,
      threatLevel: 'MINIMAL',
      residentialDemand: 68,
      commercialDemand: 54,
      industrialDemand: 48,
      pollutionLevel: 16,
      trafficCongestion: 18,
    };
  }

  public tick(
    buildings: PlacedBuilding[],
    techTree: TechNode[],
    deltaSeconds: number,
    liveTrafficCongestion = 18
  ) {
    // 1. Calculate Utilities
    const util = UtilityGrid.calculate(buildings);
    this.state.powerGenerated = Math.max(120, util.powerGenerated);
    this.state.powerConsumed = Math.max(40, util.powerConsumed);
    this.state.waterSupplied = Math.max(120, util.waterSupplied);
    this.state.waterConsumed = Math.max(40, util.waterConsumed);

    const hasUrbanPlanning = techTree.find((t) => t.id === 'urban_planning' && t.unlocked);
    const housingBonus = hasUrbanPlanning ? 1.2 : 1.0;

    const hasAutoLogistics = techTree.find((t) => t.id === 'automated_logistics' && t.unlocked);
    const prodBonus = hasAutoLogistics ? 1.35 : 1.0;

    let maxHousing = 0;
    let jobsCapacity = 0;
    let commercialJobs = 0;
    let industrialJobs = 0;
    let totalExpenses = 0;
    let activeRadars = 0;
    let activeSams = 0;
    let activeAirbases = 0;
    let damagedCount = 0;
    let pollutionPoints = 0;
    let parkPoints = 0;
    let hospitalCount = 0;

    buildings.forEach((b) => {
      if (b.health < b.maxHealth) damagedCount++;
      const def = BUILDING_DEFS[b.type];
      totalExpenses += def.maintenance;

      // Buildings under construction or destroyed do not contribute capacity/output yet
      if (!b.active || b.health <= 0 || b.isConstructing) return;

      const healthFactor = Math.max(0.25, b.health / b.maxHealth);
      const utilityFactor = b.powered && b.watered ? 1.0 : b.powered || b.watered ? 0.6 : 0.25;
      const efficiency = healthFactor * utilityFactor;

      if (def.populationCapacity) {
        maxHousing += Math.round(def.populationCapacity * housingBonus * efficiency);
      }
      if (def.jobsCapacity) {
        const effJobs = Math.round(def.jobsCapacity * efficiency);
        jobsCapacity += effJobs;
        if (def.category === 'commercial') commercialJobs += effJobs;
        if (def.category === 'industrial') industrialJobs += effJobs;
      }

      if (b.type === 'ind_factory' || b.type === 'util_power_plant') {
        pollutionPoints += 9;
      } else if (b.type === 'ind_warehouse') {
        pollutionPoints += 4;
      } else if (b.type === 'def_bunker') {
        parkPoints += 12;
      } else if (b.type === 'serv_hospital') {
        hospitalCount++;
      }

      if (b.powered && def.productionType && def.productionRate) {
        const prod = (def.productionRate * prodBonus * efficiency * deltaSeconds) / 10;
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

    this.state.maxHousing = Math.max(4400, maxHousing * 3);
    this.state.jobsAvailable = Math.max(2600, jobsCapacity * 3);
    this.state.pollutionLevel = Math.max(4, Math.min(100, pollutionPoints - parkPoints + 8));
    this.state.trafficCongestion = liveTrafficCongestion;

    // 2. Zone Demands (Residential / Commercial / Industrial)
    const housingRatio = this.state.population / Math.max(1, this.state.maxHousing);
    this.state.residentialDemand = Math.round(
      Math.max(15, Math.min(95, housingRatio * 75 + (this.state.approvalRating - 65) * 0.6))
    );
    this.state.commercialDemand = Math.round(
      Math.max(15, Math.min(95, 85 - (commercialJobs * 3) / Math.max(1, this.state.population * 0.015)))
    );
    this.state.industrialDemand = Math.round(
      Math.max(15, Math.min(95, 80 - (industrialJobs * 3) / Math.max(1, this.state.population * 0.015)))
    );

    // 3. Population Growth Model
    if (this.state.population < this.state.maxHousing) {
      const growthRate = (this.state.approvalRating / 100) * 3.2 * deltaSeconds;
      this.state.population = Math.min(
        this.state.maxHousing,
        Math.round(this.state.population + growthRate)
      );
    } else if (this.state.population > this.state.maxHousing) {
      this.state.population = Math.max(0, Math.round(this.state.population - 2 * deltaSeconds));
    }

    // 4. Employment & Jobs
    this.state.jobsFilled = Math.min(
      this.state.jobsAvailable,
      Math.round(this.state.population * 0.74)
    );
    this.state.employmentRate =
      this.state.jobsAvailable > 0
        ? Math.min(
            100,
            Math.round((this.state.jobsFilled / Math.max(1, this.state.population * 0.74)) * 100)
          )
        : 100;

    // 5. Taxation & Revenue (impacted by congestion & approval)
    const congestionPenalty = this.state.trafficCongestion > 65 ? 0.88 : 1.0;
    const citizenTax = Math.round(this.state.population * 0.42 * congestionPenalty);
    const commercialTax = Math.round(this.state.jobsFilled * 0.44 * congestionPenalty);
    this.state.hourlyTax = citizenTax + commercialTax;
    const debtService = this.loanManager.getTotalHourlyDebtService();
    this.state.hourlyExpenses = totalExpenses + debtService;
    this.state.netIncome = this.state.hourlyTax - this.state.hourlyExpenses;

    // Process loan repayment deductions
    this.loanManager.processRepayments(deltaSeconds, this.state.treasury);

    this.state.treasury += (this.state.netIncome * deltaSeconds) / 12;

    // 6. Citizen Approval Rating
    let happiness = 90 + Math.min(8, hospitalCount * 3) + Math.min(6, Math.floor(parkPoints / 6));
    if (util.powerSurplus < 0) happiness -= 22;
    if (util.waterSurplus < 0) happiness -= 18;
    if (damagedCount > 0) happiness -= Math.min(28, damagedCount * 7);
    if (this.state.pollutionLevel > 45) happiness -= Math.round((this.state.pollutionLevel - 45) * 0.35);
    if (this.state.trafficCongestion > 60) happiness -= 8;
    if (this.state.employmentRate < 60) happiness -= 14;
    this.state.approvalRating = Math.max(10, Math.min(100, happiness));

    // 7. Military Readiness
    let readiness = 35;
    readiness += activeRadars * 18;
    readiness += activeSams * 20;
    readiness += activeAirbases * 25;
    if (this.state.militarySupplies > 20) readiness += 10;
    this.state.militaryReadiness = Math.min(100, readiness);

    // 8. Threat Level
    if (this.state.population > 6200) {
      this.state.threatLevel = 'CRITICAL';
    } else if (this.state.population > 5200) {
      this.state.threatLevel = 'HIGH';
    } else if (this.state.population > 4600) {
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
