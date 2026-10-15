import { PlacedBuilding } from '../types/game';
import { BUILDING_DEFS } from '../data/buildingDefs';

export interface UtilityStats {
  powerGenerated: number;
  powerConsumed: number;
  waterSupplied: number;
  waterConsumed: number;
  powerSurplus: number;
  waterSurplus: number;
}

export class UtilityGrid {
  public static calculate(buildings: PlacedBuilding[]): UtilityStats {
    let powerGenerated = 0;
    let powerConsumed = 0;
    let waterSupplied = 0;
    let waterConsumed = 0;

    // First pass: sum up generation and demand
    buildings.forEach((b) => {
      if (!b.active || b.health <= 0) return;
      const def = BUILDING_DEFS[b.type];

      // Negative demand means generation
      if (def.powerDemand < 0) {
        powerGenerated += Math.abs(def.powerDemand);
      } else {
        powerConsumed += def.powerDemand;
      }

      if (def.waterDemand < 0) {
        waterSupplied += Math.abs(def.waterDemand);
      } else {
        waterConsumed += def.waterDemand;
      }
    });

    // Check if grid has power surplus
    const hasEnoughPower = powerGenerated >= powerConsumed;
    const hasEnoughWater = waterSupplied >= waterConsumed;

    // Second pass: apply powered / watered state
    buildings.forEach((b) => {
      if (!b.active || b.health <= 0) {
        b.powered = false;
        b.watered = false;
        return;
      }

      const def = BUILDING_DEFS[b.type];
      b.powered = def.powerDemand <= 0 || hasEnoughPower;
      b.watered = def.waterDemand <= 0 || hasEnoughWater;
    });

    return {
      powerGenerated,
      powerConsumed,
      waterSupplied,
      waterConsumed,
      powerSurplus: powerGenerated - powerConsumed,
      waterSurplus: waterSupplied - waterConsumed,
    };
  }
}
