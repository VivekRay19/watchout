import { MilitaryMission, CombatLogEntry, PlacedBuilding } from '../types/game';
import { AirTrafficSystem } from './AirTrafficSystem';
import { EnemyFaction } from './EnemyFaction';
import { EconomyManager } from '../simulation/EconomyManager';
import { soundManager } from '../audio/SoundManager';

export const DEFAULT_MISSIONS: MilitaryMission[] = [
  {
    id: 'mis_recon',
    name: 'Operation Hawkeye — Recon Flight',
    description: 'High-altitude tactical drone reconnaissance over Hostile Sector Charlie to survey enemy air defense installations.',
    targetName: 'Enemy Radar Post',
    targetX: -210,
    targetZ: -190,
    requiredAirbase: true,
    requiredSupplies: 10,
    cost: 500,
    durationSeconds: 15,
    riskPercent: 12,
    rewardCash: 1200,
    rewardSupplies: 25,
    status: 'READY',
    progressPercent: 0,
    elapsedTime: 0,
    assignedFighters: 1,
  },
  {
    id: 'mis_strike_depot',
    name: 'Operation Hammer — Supply Depot Strike',
    description: 'Precision stealth fighter airstrike against the hostile forward ammunition and fuel storage facility.',
    targetName: 'Enemy Munitions Depot',
    targetX: -225,
    targetZ: -205,
    requiredAirbase: true,
    requiredSupplies: 25,
    cost: 1400,
    durationSeconds: 22,
    riskPercent: 28,
    rewardCash: 3500,
    rewardSupplies: 60,
    status: 'READY',
    progressPercent: 0,
    elapsedTime: 0,
    assignedFighters: 2,
  },
  {
    id: 'mis_naval_interdiction',
    name: 'Operation Trident — Maritime Interdiction',
    description: 'Deploy naval corvettes to intercept a hostile blockade runner transporting heavy weapons along the eastern coastline.',
    targetName: 'Hostile Corvette Incursion',
    targetX: 180,
    targetZ: 120,
    requiredAirbase: false,
    requiredSupplies: 20,
    cost: 1200,
    durationSeconds: 25,
    riskPercent: 20,
    rewardCash: 4200,
    rewardSupplies: 40,
    status: 'READY',
    progressPercent: 0,
    elapsedTime: 0,
    assignedFighters: 1,
  },
  {
    id: 'mis_citadel_assault',
    name: 'Operation Iron Wrath — Citadel Assault',
    description: 'Major combined-arms strike to neutralize the Hostile Forward Command Center and shatter enemy offensive capability.',
    targetName: 'Hostile Command Citadel',
    targetX: -210,
    targetZ: -200,
    requiredAirbase: true,
    requiredSupplies: 50,
    cost: 3200,
    durationSeconds: 35,
    riskPercent: 40,
    rewardCash: 8500,
    rewardSupplies: 120,
    status: 'READY',
    progressPercent: 0,
    elapsedTime: 0,
    assignedFighters: 2,
  },
];

export class MissionSystem {
  public missions: MilitaryMission[] = [...DEFAULT_MISSIONS];
  private airTraffic: AirTrafficSystem;
  private enemyFaction: EnemyFaction;
  private economy: EconomyManager;

  constructor(airTraffic: AirTrafficSystem, enemyFaction: EnemyFaction, economy: EconomyManager) {
    this.airTraffic = airTraffic;
    this.enemyFaction = enemyFaction;
    this.economy = economy;
  }

  public launchMission(
    missionId: string,
    buildings: PlacedBuilding[],
    onLog: (entry: CombatLogEntry) => void
  ): boolean {
    const mission = this.missions.find((m) => m.id === missionId);
    if (!mission || mission.status !== 'READY') return false;

    // Check prerequisites
    const hasAirbase = buildings.some((b) => b.type === 'mil_airbase' && b.active && b.powered);
    const hasNavalDock = buildings.some((b) => b.type === 'mil_naval_dock' && b.active && b.powered);

    if (mission.requiredAirbase && !hasAirbase) {
      onLog({
        id: `log_${Date.now()}_${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'WARNING',
        message: `Mission Aborted: Operational Joint Tactical Airbase required for ${mission.name}!`,
      });
      return false;
    }

    if (mission.id === 'mis_naval_interdiction' && !hasNavalDock) {
      onLog({
        id: `log_${Date.now()}_${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'WARNING',
        message: `Mission Aborted: Operational Naval Deepwater Berth required for naval interdiction!`,
      });
      return false;
    }

    if (this.economy.state.treasury < mission.cost) {
      onLog({
        id: `log_${Date.now()}_${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'WARNING',
        message: `Insufficient Funds: Mission costs $${mission.cost.toLocaleString()}`,
      });
      return false;
    }

    if (this.economy.state.militarySupplies < mission.requiredSupplies) {
      onLog({
        id: `log_${Date.now()}_${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'WARNING',
        message: `Insufficient Supplies: Requires ${mission.requiredSupplies} military supply crates!`,
      });
      return false;
    }

    // Deduct cost and supplies
    this.economy.deductFunds(mission.cost);
    this.economy.state.militarySupplies -= mission.requiredSupplies;

    // Launch visible aircraft flight
    if (mission.requiredAirbase) {
      this.airTraffic.launchMission(mission.id, mission.targetX, mission.targetZ);
    }

    mission.status = 'IN_PROGRESS';
    mission.progressPercent = 0;
    mission.elapsedTime = 0;

    onLog({
      id: `log_${Date.now()}_${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'INFO',
      message: `OPERATION LAUNCHED: [${mission.name}] units deployed toward target vector!`,
    });

    return true;
  }

  public update(delta: number, onLog: (entry: CombatLogEntry) => void) {
    this.missions.forEach((m) => {
      if (m.status === 'IN_PROGRESS') {
        m.elapsedTime += delta;
        m.progressPercent = Math.min(100, Math.round((m.elapsedTime / m.durationSeconds) * 100));

        if (m.elapsedTime >= m.durationSeconds) {
          // Resolve outcome based on risk
          const roll = Math.random() * 100;
          if (roll > m.riskPercent) {
            // SUCCESS
            m.status = 'COMPLETED';
            this.economy.addFunds(m.rewardCash);
            this.economy.addSupplies(m.rewardSupplies);
            this.enemyFaction.takeDamage(m.id === 'mis_citadel_assault' ? 1200 : 450);

            soundManager.playMissionSuccess();
            onLog({
              id: `log_${Date.now()}_${Math.random()}`,
              timestamp: new Date().toLocaleTimeString(),
              type: 'SUCCESS',
              message: `MISSION ACCOMPLISHED: [${m.name}] succeeded! Bounties: +$${m.rewardCash.toLocaleString()} & +${m.rewardSupplies} Supplies!`,
            });
          } else {
            // FAILED / TAKEN FLAK
            m.status = 'FAILED';
            soundManager.playMissionFail();
            onLog({
              id: `log_${Date.now()}_${Math.random()}`,
              timestamp: new Date().toLocaleTimeString(),
              type: 'DANGER',
              message: `MISSION FAILED: [${m.name}] met heavy enemy anti-air flak and was forced to withdraw!`,
            });
          }

          // Reset mission to ready after 18 seconds cool-down
          setTimeout(() => {
            m.status = 'READY';
            m.progressPercent = 0;
            m.elapsedTime = 0;
          }, 18000);
        }
      }
    });
  }
}
