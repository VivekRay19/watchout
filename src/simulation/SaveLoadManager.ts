import { PlacedBuilding, EconomyState, TechNode, GameSettings, RoadNode, RoadSegment } from '../types/game';
import { ActiveLoan } from './LoanManager';

export interface GameSaveData {
  version: string;
  timestamp: number;
  buildings: PlacedBuilding[];
  roadNodes: RoadNode[];
  roadSegments: RoadSegment[];
  economy: EconomyState;
  techTree: TechNode[];
  settings: GameSettings;
  loans?: ActiveLoan[];
  creditScore?: number;
}

const SAVE_KEY = 'watchout_game_save_v2_2';

export class SaveLoadManager {
  public static save(
    buildings: PlacedBuilding[],
    roadNodes: RoadNode[],
    roadSegments: RoadSegment[],
    economy: EconomyState,
    techTree: TechNode[],
    settings: GameSettings,
    loans?: ActiveLoan[],
    creditScore?: number
  ): boolean {
    try {
      const data: GameSaveData = {
        version: '2.2.0',
        timestamp: Date.now(),
        buildings,
        roadNodes,
        roadSegments,
        economy,
        techTree,
        settings,
        loans,
        creditScore,
      };

      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Failed to save game:', e);
      return false;
    }
  }

  public static load(): GameSaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as GameSaveData;
      if (!data || data.version !== '2.2.0') return null;
      return data;
    } catch (e) {
      console.error('Failed to load game:', e);
      return null;
    }
  }

  public static hasSave(): boolean {
    return !!localStorage.getItem(SAVE_KEY);
  }

  public static clearSave() {
    localStorage.removeItem(SAVE_KEY);
  }

  public static exportSaveJSON(
    buildings: PlacedBuilding[],
    roadNodes: RoadNode[],
    roadSegments: RoadSegment[],
    economy: EconomyState,
    techTree: TechNode[],
    settings: GameSettings
  ): string {
    const data: GameSaveData = {
      version: '2.1.0',
      timestamp: Date.now(),
      buildings,
      roadNodes,
      roadSegments,
      economy,
      techTree,
      settings,
    };
    return JSON.stringify(data, null, 2);
  }
}
