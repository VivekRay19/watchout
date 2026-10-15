import React, { useState } from 'react';
import { BuildingCategory, BuildingType } from '../types/game';
import { BUILDING_DEFS } from '../data/buildingDefs';
import { GameEngine } from '../engine/GameEngine';
import {
  Navigation,
  Home,
  Building2,
  Factory,
  Zap,
  ShieldCheck,
  Radar,
  Crosshair,
  FlaskConical,
  RotateCw,
  X,
  Lock,
} from 'lucide-react';
import { soundManager } from '../audio/SoundManager';

interface ConstructionMenuProps {
  engine: GameEngine;
}

export const ConstructionMenu: React.FC<ConstructionMenuProps> = ({ engine }) => {
  const [activeCategory, setActiveCategory] = useState<BuildingCategory | null>(null);
  const activeBuildingType = engine.placement.activeBuildingType;
  const treasury = engine.economy.state.treasury;

  const categories: { id: BuildingCategory; name: string; icon: React.ReactNode }[] = [
    { id: 'roads', name: 'Roads & Bridges', icon: <Navigation className="w-4 h-4" /> },
    { id: 'residential', name: 'Residential', icon: <Home className="w-4 h-4" /> },
    { id: 'commercial', name: 'Commercial', icon: <Building2 className="w-4 h-4" /> },
    { id: 'industrial', name: 'Industrial', icon: <Factory className="w-4 h-4" /> },
    { id: 'utilities', name: 'Utilities', icon: <Zap className="w-4 h-4" /> },
    { id: 'services', name: 'Services', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'defense', name: 'Air Defense', icon: <Radar className="w-4 h-4" /> },
    { id: 'military', name: 'Military Base', icon: <Crosshair className="w-4 h-4" /> },
    { id: 'research', name: 'Research', icon: <FlaskConical className="w-4 h-4" /> },
  ];

  const categoryBuildings = activeCategory
    ? Object.values(BUILDING_DEFS).filter((b) => b.category === activeCategory)
    : [];

  const handleSelectBuilding = (type: BuildingType) => {
    soundManager.playClick();
    if (activeBuildingType === type) {
      engine.placement.selectBuilding(null);
    } else {
      engine.placement.selectBuilding(type);
    }
    engine.onStateUpdate?.();
  };

  const handleCancelPlacement = () => {
    soundManager.playClick();
    engine.placement.selectBuilding(null);
    engine.onStateUpdate?.();
  };

  const handleRotate = () => {
    soundManager.playClick();
    engine.placement.rotate();
  };

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 select-none pointer-events-auto">
      {/* Active Placement Controls Floating Bar */}
      {activeBuildingType && (
        <div className="bg-slate-900/95 backdrop-blur-md px-4 py-2 rounded-xl border border-cyan-500/50 shadow-2xl flex items-center gap-4 animate-fade-in text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-mono text-cyan-300 font-bold">
              {activeBuildingType.startsWith('road_') ? 'ROAD TOOL:' : 'PLACING:'} {BUILDING_DEFS[activeBuildingType].name.toUpperCase()}
            </span>
            {activeBuildingType.startsWith('road_') && (
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-semibold">
                {engine.placement.roadStartNode ? 'Step 2: Click Destination' : 'Step 1: Click Start Point'}
              </span>
            )}
            {activeBuildingType.startsWith('road_') && engine.placement.roadCostEstimate > 0 && (
              <span className="font-mono text-[11px] text-emerald-400 font-bold">
                Est: ${engine.placement.roadCostEstimate.toLocaleString()}
              </span>
            )}
          </div>
          <div className="h-4 w-px bg-slate-800" />
          {!activeBuildingType.startsWith('road_') && (
            <button
              onClick={handleRotate}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-lg border border-slate-700 transition-colors font-mono"
              title="Rotate Building (Key: R)"
            >
              <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>ROTATE (R)</span>
            </button>
          )}
          <button
            onClick={handleCancelPlacement}
            className="flex items-center gap-1 bg-red-950/80 hover:bg-red-900 text-red-300 px-3 py-1 rounded-lg border border-red-800/80 transition-colors font-mono"
            title="Cancel Placement (Key: ESC)"
          >
            <X className="w-3.5 h-3.5" />
            <span>CANCEL (ESC)</span>
          </button>
        </div>
      )}

      {/* Buildings Drawer (if category selected) */}
      {activeCategory && (
        <div className="bg-slate-950/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800/90 shadow-2xl max-w-4xl w-auto overflow-x-auto">
          <div className="flex items-center gap-3">
            {categoryBuildings.map((def) => {
              const isSelected = activeBuildingType === def.id;
              const canAfford = treasury >= def.cost;
              const isTechLocked =
                def.requiredTech &&
                !engine.techTree.some((t) => t.id === def.requiredTech && t.unlocked);

              return (
                <button
                  key={def.id}
                  disabled={!!isTechLocked}
                  onClick={() => handleSelectBuilding(def.id)}
                  className={`flex flex-col text-left p-2.5 rounded-xl border transition-all min-w-[170px] max-w-[200px] relative ${
                    isSelected
                      ? 'bg-cyan-950/80 border-cyan-400 ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-500/20'
                      : isTechLocked
                      ? 'bg-slate-900/40 border-slate-800/50 opacity-50 cursor-not-allowed'
                      : canAfford
                      ? 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-900/40 border-slate-850 opacity-60'
                  }`}
                >
                  {isTechLocked && (
                    <div className="absolute inset-0 bg-slate-950/80 rounded-xl backdrop-blur-[1px] flex flex-col items-center justify-center p-2 text-center z-10">
                      <Lock className="w-4 h-4 text-amber-400 mb-1" />
                      <span className="text-[10px] font-mono text-amber-300 font-semibold">
                        Requires Tech
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {def.requiredTech}
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="font-display font-semibold text-slate-100 text-xs truncate">
                      {def.name}
                    </span>
                    <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-800 text-slate-300">
                      {def.width}x{def.depth}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight mb-2 h-7">
                    {def.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono mt-auto pt-1.5 border-t border-slate-800/80">
                    <span className={`font-bold ${canAfford ? 'text-emerald-400' : 'text-red-400'}`}>
                      ${def.cost.toLocaleString()}
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      -${def.maintenance}/hr
                    </span>
                  </div>

                  {/* Power & Water Demand badge */}
                  {(def.powerDemand !== 0 || def.waterDemand !== 0) && (
                    <div className="flex items-center gap-2 mt-1 text-[9px] font-mono text-slate-400">
                      {def.powerDemand !== 0 && (
                        <span className={def.powerDemand < 0 ? 'text-amber-400' : 'text-slate-400'}>
                          ⚡{def.powerDemand < 0 ? `+${Math.abs(def.powerDemand)}` : `-${def.powerDemand}`}MW
                        </span>
                      )}
                      {def.waterDemand !== 0 && (
                        <span className={def.waterDemand < 0 ? 'text-cyan-400' : 'text-slate-400'}>
                          💧{def.waterDemand < 0 ? `+${Math.abs(def.waterDemand)}` : `-${def.waterDemand}`}m³
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Bottom Category Ribbon */}
      <div className="bg-slate-950/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800/90 shadow-2xl flex items-center gap-1">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                soundManager.playClick();
                setActiveCategory(isActive ? null : cat.id);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold shadow-lg shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {cat.icon}
              <span className="hidden sm:inline">{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
