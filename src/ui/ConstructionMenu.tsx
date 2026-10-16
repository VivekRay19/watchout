import React, { useState } from 'react';
import { BuildingType } from '../types/game';
import { BUILDING_DEFS } from '../data/buildingDefs';
import { GameEngine } from '../engine/GameEngine';
import {
  Home,
  Store,
  Factory,
  Shield,
  RotateCw,
  X,
  Lock,
  Crosshair,
  FlaskConical,
  Radar,
  ScrollText,
} from 'lucide-react';
import { soundManager } from '../audio/SoundManager';

interface ConstructionMenuProps {
  engine: GameEngine;
  onOpenMilitary: () => void;
  onOpenResearch: () => void;
  onToggleLogs: () => void;
}

type ToolbarTab = 'roads' | 'residential' | 'commercial' | 'industry' | 'defense';

const RoadIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M7 20L10 4H14L17 20H7Z" fill="currentColor" fillOpacity="0.9" />
    <path d="M12 6V9M12 11.5V14.5M12 17V19" stroke="#101c2e" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const ConstructionMenu: React.FC<ConstructionMenuProps> = ({
  engine,
  onOpenMilitary,
  onOpenResearch,
  onToggleLogs,
}) => {
  const [activeTab, setActiveTab] = useState<ToolbarTab>('roads');
  const [trayOpen, setTrayOpen] = useState<boolean>(false);
  const activeBuildingType = engine.placement.activeBuildingType;
  const treasury = engine.economy.state.treasury;

  const tabs: { id: ToolbarTab; label: string; icon: React.ReactNode }[] = [
    { id: 'roads', label: 'Roads', icon: <RoadIcon className="w-6 h-6" /> },
    { id: 'residential', label: 'Residential', icon: <Home className="w-6 h-6" /> },
    { id: 'commercial', label: 'Commercial', icon: <Store className="w-6 h-6" /> },
    { id: 'industry', label: 'Industry', icon: <Factory className="w-6 h-6" /> },
    { id: 'defense', label: 'Defense', icon: <Shield className="w-6 h-6" /> },
  ];

  const getTabBuildings = (tab: ToolbarTab) => {
    const all = Object.values(BUILDING_DEFS);
    switch (tab) {
      case 'roads':
        return all.filter((b) => b.category === 'roads');
      case 'residential':
        return all.filter((b) => b.category === 'residential');
      case 'commercial':
        return all.filter((b) => b.category === 'commercial' || b.category === 'services');
      case 'industry':
        return all.filter((b) => b.category === 'industrial' || b.category === 'utilities');
      case 'defense':
        return all.filter(
          (b) => b.category === 'defense' || b.category === 'military' || b.category === 'research'
        );
    }
  };

  const handleTabClick = (tab: ToolbarTab) => {
    soundManager.playClick();
    if (tab === 'roads') {
      if (activeTab === 'roads' && activeBuildingType?.startsWith('road_')) {
        engine.placement.selectBuilding(null);
        setTrayOpen(false);
      } else {
        setActiveTab('roads');
        setTrayOpen(true);
        engine.placement.selectBuilding('road_two_lane');
      }
      engine.onStateUpdate?.();
      return;
    }

    if (activeTab === tab && trayOpen) {
      setTrayOpen(false);
    } else {
      setActiveTab(tab);
      setTrayOpen(true);
    }
  };

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

  const currentBuildings = getTabBuildings(activeTab);

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2.5 select-none pointer-events-auto">
      {/* Compact Active Placement Helper Pill */}
      {activeBuildingType && (
        <div className="bg-[#101c2e]/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-sky-400/40 shadow-xl flex items-center gap-3 animate-fade-in text-xs text-white">
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          <span className="font-semibold">
            {BUILDING_DEFS[activeBuildingType].name}
          </span>
          {activeBuildingType.startsWith('road_') && (
            <span className="text-sky-300 text-[11px] bg-sky-500/15 px-2 py-0.5 rounded-lg border border-sky-400/25">
              {engine.placement.roadStartNode
                ? `Click destination ($${engine.placement.roadCostEstimate || 50})`
                : 'Click start point on map or existing road'}
            </span>
          )}
          {!activeBuildingType.startsWith('road_') && (
            <button
              onClick={handleRotate}
              className="flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-colors text-[11px]"
              title="Rotate (R)"
            >
              <RotateCw className="w-3.5 h-3.5 text-sky-300" />
              <span>Rotate (R)</span>
            </button>
          )}
          <button
            onClick={handleCancelPlacement}
            className="flex items-center gap-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 px-2.5 py-1 rounded-lg transition-colors text-[11px]"
            title="Cancel (ESC)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Done</span>
          </button>
        </div>
      )}

      {/* Expandable Category Selection Tray */}
      {trayOpen && (
        <div className="bg-[#101c2e]/92 backdrop-blur-md p-2.5 rounded-2xl border border-white/10 shadow-2xl max-w-[92vw] overflow-x-auto animate-fade-in">
          <div className="flex items-center gap-2">
            {currentBuildings.map((def) => {
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
                  className={`flex flex-col text-left px-3 py-2 rounded-xl border transition-all min-w-[140px] max-w-[165px] relative ${
                    isSelected
                      ? 'bg-sky-500/25 border-sky-400 text-white shadow-md'
                      : isTechLocked
                      ? 'bg-slate-900/40 border-white/5 opacity-50 cursor-not-allowed'
                      : canAfford
                      ? 'bg-slate-900/60 hover:bg-slate-800/80 border-white/10 text-slate-100'
                      : 'bg-slate-900/40 border-white/5 opacity-60'
                  }`}
                >
                  {isTechLocked && (
                    <div className="absolute inset-0 bg-[#101c2e]/85 rounded-xl flex items-center justify-center gap-1 text-[11px] text-amber-300 font-medium z-10">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Locked</span>
                    </div>
                  )}
                  <div className="font-semibold text-xs text-white truncate">
                    {def.name}
                  </div>
                  <div className="flex items-center justify-between text-[11px] mt-1">
                    <span className={`font-bold ${canAfford ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ${def.cost.toLocaleString()}
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      {def.width}x{def.depth}
                    </span>
                  </div>
                </button>
              );
            })}

            {/* On-demand Tactical Actions inside the Defense Tab */}
            {activeTab === 'defense' && (
              <>
                <div className="h-10 w-px bg-white/10 mx-1 shrink-0" />
                <button
                  onClick={() => {
                    const threat = engine.triggerAirDefenseDrill();
                    engine.world.focusOn(threat.targetX, threat.targetZ, 120);
                  }}
                  className="flex flex-col justify-center px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 min-w-[130px] text-left transition-colors shrink-0"
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-amber-300">
                    <Radar className="w-3.5 h-3.5" />
                    <span>Test Air Defense</span>
                  </div>
                  <span className="text-[10px] text-amber-200/80 mt-0.5">
                    Spawn Target Drone
                  </span>
                </button>

                <button
                  onClick={() => {
                    soundManager.playClick();
                    onOpenMilitary();
                  }}
                  className="flex flex-col justify-center px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 min-w-[125px] text-left transition-colors shrink-0"
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-rose-300">
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Strike Missions</span>
                  </div>
                  <span className="text-[10px] text-rose-200/80 mt-0.5">
                    Offensive Operations
                  </span>
                </button>

                <button
                  onClick={() => {
                    soundManager.playClick();
                    onOpenResearch();
                  }}
                  className="flex flex-col justify-center px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 min-w-[115px] text-left transition-colors shrink-0"
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-sky-300">
                    <FlaskConical className="w-3.5 h-3.5" />
                    <span>Tech Tree</span>
                  </div>
                  <span className="text-[10px] text-sky-200/80 mt-0.5">
                    Upgrades & Perks
                  </span>
                </button>

                <button
                  onClick={() => {
                    soundManager.playClick();
                    onToggleLogs();
                  }}
                  className="flex flex-col justify-center px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-white/10 text-slate-200 min-w-[105px] text-left transition-colors shrink-0"
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                    <ScrollText className="w-3.5 h-3.5 text-sky-400" />
                    <span>Combat Log</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Toggle Events
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Bottom Construction Dock (Matches Reference Image 5-Button Toolbar) */}
      <div className="bg-[#101c2e]/92 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-2">
        {tabs.map((tab) => {
          const isActive =
            activeTab === tab.id &&
            (trayOpen || (tab.id === 'roads' && activeBuildingType?.startsWith('road_')));
          const isDefaultHighlighted = tab.id === 'roads' && !trayOpen && activeTab === 'roads';
          const highlighted = isActive || isDefaultHighlighted;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`w-24 py-2.5 px-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${
                highlighted
                  ? 'bg-[#1a3353] border-2 border-[#38bdf8] text-white shadow-[0_0_16px_rgba(56,189,248,0.3)]'
                  : 'border-2 border-transparent text-slate-200 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span className="text-xs font-medium tracking-wide">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
