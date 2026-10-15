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
  RotateCw,
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
  const salvageValue = Math.round(def.cost * 0.4);

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
    engine.world.focusOn(building.x, building.z, 45);
  };

  return (
    <div className="fixed top-14 left-4 z-20 w-80 bg-slate-950/95 backdrop-blur-md rounded-2xl border border-slate-800/90 shadow-2xl p-4 text-xs select-none pointer-events-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
            {def.category}
          </span>
          <h2 className="font-display font-bold text-slate-100 text-sm">
            {def.name}
          </h2>
          <span className="text-[10px] font-mono text-slate-400">
            Sector Grid: [{building.x}, {building.z}]
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleFocus}
            className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-800 transition-colors"
            title="Focus Camera on Structure"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Health & Status */}
      <div className="my-3 space-y-2 font-mono">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-400" />
            Structural Integrity:
          </span>
          <span
            className={`font-bold ${
              healthPercent > 70
                ? 'text-emerald-400'
                : healthPercent > 30
                ? 'text-amber-400'
                : 'text-red-400'
            }`}
          >
            {building.health}/{building.maxHealth} ({healthPercent}%)
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              healthPercent > 70
                ? 'bg-emerald-500'
                : healthPercent > 30
                ? 'bg-amber-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${healthPercent}%` }}
          />
        </div>

        {/* Utilities Check */}
        <div className="grid grid-cols-2 gap-2 pt-1 text-[10px]">
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
            <Zap className={`w-3 h-3 ${building.powered ? 'text-amber-400' : 'text-slate-500'}`} />
            <span className={building.powered ? 'text-slate-200' : 'text-red-400 font-bold'}>
              {building.powered ? 'Powered' : 'Blackout!'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
            <Droplets className={`w-3 h-3 ${building.watered ? 'text-cyan-400' : 'text-slate-500'}`} />
            <span className={building.watered ? 'text-slate-200' : 'text-red-400 font-bold'}>
              {building.watered ? 'Water Grid' : 'Dry!'}
            </span>
          </div>
        </div>
      </div>

      {/* Specific Contextual Telemetry */}
      {isAirDefense && (
        <div className="bg-red-950/20 rounded-xl p-2.5 border border-red-900/40 space-y-1.5 font-mono text-[11px] mb-3">
          <div className="flex items-center justify-between text-red-300 font-bold">
            <span className="flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-red-400" /> DEFENSE STATUS:
            </span>
            <span className="px-1.5 py-0.5 rounded bg-red-900/40 text-red-200 text-[10px]">
              {building.defenseStatus || 'READY'}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>Ammunition / Interceptors:</span>
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
                  style={{ width: `${Math.min(100, (((building.reloadProgress || 0) / 8) * 100))}%` }}
                />
              </div>
            </div>
          )}
          {building.assignedTargetId && (
            <div className="text-[10px] text-cyan-300 pt-0.5">
              Assigned Track: <strong className="text-white">{building.assignedTargetId}</strong>
            </div>
          )}
        </div>
      )}

      {isRadar && (
        <div className="bg-cyan-950/20 rounded-xl p-2.5 border border-cyan-900/40 space-y-1.5 font-mono text-[11px] mb-3">
          <div className="flex items-center justify-between text-cyan-300 font-bold">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-cyan-400" /> RADAR COVERAGE:
            </span>
            <span>{def.radarRadius} km</span>
          </div>
          <div className="text-[10px] text-slate-300">
            Phased-array scanner actively monitoring high and low altitude sectors.
          </div>
        </div>
      )}

      {/* General Stats Breakdown */}
      <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-800/80 space-y-1.5 font-mono text-[11px] mb-3">
        {def.populationCapacity && (
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1 text-slate-400">
              <Users className="w-3 h-3 text-blue-400" /> Housing Capacity:
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
            <span className="text-lime-400 font-bold uppercase">
              {def.productionType} (+{def.productionRate}/tick)
            </span>
          </div>
        )}
        <div className="flex items-center justify-between text-slate-400 text-[10px] pt-1 border-t border-slate-800">
          <span>Operating Expense:</span>
          <span className="text-red-300">-${def.maintenance}/hr</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        {isDamaged && (
          <button
            onClick={handleRepair}
            className="flex-1 flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold py-2 rounded-xl transition-colors font-mono"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>REPAIR (${repairCost})</span>
          </button>
        )}
        <button
          onClick={handleDemolish}
          className="flex-1 flex items-center justify-center gap-1.5 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/80 py-2 rounded-xl transition-colors font-mono"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>DEMOLISH (+${salvageValue})</span>
        </button>
      </div>
    </div>
  );
};
