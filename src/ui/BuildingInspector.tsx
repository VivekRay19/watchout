import React from 'react';
import { PlacedBuilding } from '../types/game';
import { BUILDING_DEFS } from '../data/buildingDefs';
import { GameEngine } from '../engine/GameEngine';
import {
  Wrench,
  Trash2,
  X,
  Zap,
  Droplets,
  Layers,
  Users,
  Briefcase,
  Crosshair,
  Shield,
  Eye,
  HardHat,
} from 'lucide-react';
import { soundManager } from '../audio/SoundManager';

interface BuildingInspectorProps {
  building: PlacedBuilding;
  engine: GameEngine;
  onClose: () => void;
}

export const BuildingInspector: React.FC<BuildingInspectorProps> = ({
  building,
  engine,
  onClose,
}) => {
  const def = BUILDING_DEFS[building.type];
  const healthPercent = Math.round((building.health / building.maxHealth) * 100);
  const isDamaged = building.health < building.maxHealth;
  const repairCost = Math.round((1 - building.health / building.maxHealth) * def.cost * 0.5);
  const salvageValue = Math.round(def.cost * 0.5);
  const constructionPct = Math.round((building.constructionProgress ?? 1) * 100);

  const isAirDefense = building.type === 'def_sam_battery' || building.type === 'def_ciws';
  const isRadar = building.type === 'def_radar';

  const handleRepair = () => {
    engine.repairBuilding(building.id);
  };

  const handleDemolish = () => {
    engine.demolishBuilding(building.id);
    onClose();
  };

  const handleFocus = () => {
    soundManager.playClick();
    engine.world.focusOn(building.x, building.z, 55);
  };

  return (
    <div className="fixed bottom-24 right-5 z-20 w-80 bg-[#101c2e]/95 backdrop-blur-md rounded-2xl border border-white/15 shadow-2xl p-4 text-xs select-none pointer-events-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/10">
        <div>
          <span className="text-[10px] font-mono text-sky-400 uppercase tracking-wider font-semibold">
            {def.category}
          </span>
          <h2 className="font-display font-bold text-white text-sm">{def.name}</h2>
          <span className="text-[10px] font-mono text-slate-400">
            Sector Grid: [{building.x}, {building.z}] • Variant #{(building.variant ?? 0) + 1}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleFocus}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-sky-300 border border-white/10 transition-colors"
            title="Focus Camera on Structure"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border border-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Staged Construction Progress */}
      {building.isConstructing && (
        <div className="my-3 bg-amber-500/15 border border-amber-400/30 rounded-xl p-2.5 space-y-1.5 font-mono">
          <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold">
            <span className="flex items-center gap-1.5">
              <HardHat className="w-3.5 h-3.5" />
              UNDER CONSTRUCTION
            </span>
            <span>{constructionPct}%</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-150"
              style={{ width: `${constructionPct}%` }}
            />
          </div>
          <div className="text-[10px] text-amber-200/80">
            {constructionPct < 35
              ? 'Stage 1: Laying concrete foundation...'
              : constructionPct < 75
              ? 'Stage 2: Erecting structural frame...'
              : 'Stage 3: Installing exterior details & utilities...'}
          </div>
        </div>
      )}

      {/* Health & Status */}
      <div className="my-3 space-y-2 font-mono">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-300 flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-400" />
            Structural Integrity:
          </span>
          <span
            className={`font-bold ${
              healthPercent > 70
                ? 'text-emerald-400'
                : healthPercent > 30
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {Math.round(building.health)}/{building.maxHealth} ({healthPercent}%)
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              healthPercent > 70
                ? 'bg-emerald-500'
                : healthPercent > 30
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
            style={{ width: `${healthPercent}%` }}
          />
        </div>

        {/* Utilities Check */}
        <div className="grid grid-cols-2 gap-2 pt-1 text-[10px]">
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-lg border border-white/10">
            <Zap className={`w-3 h-3 ${building.powered ? 'text-amber-400' : 'text-slate-500'}`} />
            <span className={building.powered ? 'text-slate-200' : 'text-rose-400 font-bold'}>
              {building.powered ? 'Powered' : 'No Power!'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-lg border border-white/10">
            <Droplets
              className={`w-3 h-3 ${building.watered ? 'text-sky-400' : 'text-slate-500'}`}
            />
            <span className={building.watered ? 'text-slate-200' : 'text-rose-400 font-bold'}>
              {building.watered ? 'Water Grid' : 'No Water!'}
            </span>
          </div>
        </div>
      </div>

      {/* Specific Contextual Telemetry */}
      {isAirDefense && (
        <div className="bg-rose-950/30 rounded-xl p-2.5 border border-rose-500/30 space-y-1.5 font-mono text-[11px] mb-3">
          <div className="flex items-center justify-between text-rose-300 font-bold">
            <span className="flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-rose-400" /> DEFENSE STATUS:
            </span>
            <span className="px-1.5 py-0.5 rounded bg-rose-900/50 text-rose-200 text-[10px]">
              {building.defenseStatus || 'READY'}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>Interceptors Ready:</span>
            <span className="font-bold text-white">
              {building.ammo ?? 4}/{building.maxAmmo ?? 4}
            </span>
          </div>
          {building.isReloading && (
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[10px] text-amber-400">
                <span>REARMING CANISTERS...</span>
                <span>{Math.round(((building.reloadProgress || 0) / 8) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500"
                  style={{
                    width: `${Math.min(100, ((building.reloadProgress || 0) / 8) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
          {building.assignedTargetId && (
            <div className="text-[10px] text-sky-300 pt-0.5">
              Assigned Track: <strong className="text-white">{building.assignedTargetId}</strong>
            </div>
          )}
        </div>
      )}

      {isRadar && (
        <div className="bg-sky-950/30 rounded-xl p-2.5 border border-sky-500/30 space-y-1.5 font-mono text-[11px] mb-3">
          <div className="flex items-center justify-between text-sky-300 font-bold">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-sky-400" /> RADAR COVERAGE:
            </span>
            <span>{def.radarRadius} m</span>
          </div>
          <div className="text-[10px] text-slate-300">
            Geodesic radome scanner actively monitoring coastal and high-altitude sectors.
          </div>
        </div>
      )}

      {/* General Stats Breakdown */}
      <div className="bg-slate-900/70 rounded-xl p-2.5 border border-white/10 space-y-1.5 font-mono text-[11px] mb-3">
        {def.populationCapacity && (
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1 text-slate-400">
              <Users className="w-3 h-3 text-sky-400" /> Housing Capacity:
            </span>
            <span>{def.populationCapacity} Citizens</span>
          </div>
        )}
        {def.jobsCapacity && (
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1 text-slate-400">
              <Briefcase className="w-3 h-3 text-emerald-400" /> Jobs Available:
            </span>
            <span>{def.jobsCapacity} Workers</span>
          </div>
        )}
        {def.productionType && (
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400">Manufacturing:</span>
            <span className="text-emerald-400 font-bold uppercase">
              {def.productionType} (+{def.productionRate}/tick)
            </span>
          </div>
        )}
        <div className="flex items-center justify-between text-slate-400 text-[10px] pt-1 border-t border-white/10">
          <span>Operating Expense:</span>
          <span className="text-rose-300">-${def.maintenance}/hr</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        {isDamaged && (
          <button
            onClick={handleRepair}
            className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-xl transition-colors font-mono"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>{building.isRepairing ? 'REPAIRING...' : `REPAIR ($${repairCost})`}</span>
          </button>
        )}
        <button
          onClick={handleDemolish}
          className="flex-1 flex items-center justify-center gap-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 py-2 rounded-xl transition-colors font-mono"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>DEMOLISH (+${salvageValue})</span>
        </button>
      </div>
    </div>
  );
};
