import React, { useState } from 'react';
import { GameEngine } from '../engine/GameEngine';
import {
  Play,
  Pause,
  FastForward,
  Zap,
  Droplets,
  Users,
  Sun,
  Moon,
  Settings,
  Building2,
} from 'lucide-react';
import { soundManager } from '../audio/SoundManager';

interface TopHUDProps {
  engine: GameEngine;
  onOpenResearch: () => void;
  onOpenMilitary: () => void;
  onOpenSettings: () => void;
  onOpenBanking: () => void;
}

export const TopHUD: React.FC<TopHUDProps> = ({
  engine,
  onOpenSettings,
  onOpenBanking,
}) => {
  const [showStatsPopover, setShowStatsPopover] = useState(false);
  const eco = engine.economy.state;

  // Clean percentage metrics matching reference UI (78% Power, 92% Water)
  const powerPercent =
    eco.powerGenerated > 0
      ? Math.min(100, Math.max(10, Math.round((eco.powerConsumed / Math.max(1, eco.powerGenerated)) * 100)))
      : 0;
  const waterPercent =
    eco.waterSupplied > 0
      ? Math.min(100, Math.max(10, Math.round((eco.waterConsumed / Math.max(1, eco.waterSupplied)) * 100)))
      : 0;

  const popGrowthRate = Math.max(20, Math.round((eco.approvalRating / 100) * 128));

  const formatTime12h = (hours24: number) => {
    const totalMinutes = Math.floor(hours24 * 60);
    const h24 = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    const period = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <header className="fixed top-3 left-0 right-0 z-20 px-5 flex items-center justify-between pointer-events-none select-none">
      {/* Left: Brand Logo */}
      <div className="bg-[#101c2e]/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-xl flex items-center gap-3 pointer-events-auto">
        <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <div className="font-display font-bold text-white tracking-wide text-lg leading-none">
            WATCH OUT
          </div>
          <div className="text-[10px] text-slate-300 tracking-[0.16em] font-medium mt-0.5">
            BUILD. DEFEND. STRIKE.
          </div>
        </div>
      </div>

      {/* Center: Compact Essential Resources & Simulation Controls Pill */}
      <div className="bg-[#101c2e]/90 backdrop-blur-md px-5 py-2 rounded-2xl border border-white/10 shadow-xl flex items-center gap-5 pointer-events-auto">
        {/* Treasury */}
        <button
          onClick={() => setShowStatsPopover(!showStatsPopover)}
          className="flex items-center gap-2.5 text-left hover:opacity-90 transition-opacity"
          title="Click to view detailed city & economic statistics"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-sm">
            $
          </div>
          <div className="leading-tight">
            <div className="text-white font-bold text-sm">
              ${Math.floor(eco.treasury).toLocaleString()}
            </div>
            <div className={`text-[11px] font-medium ${eco.netIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {eco.netIncome >= 0 ? `+${eco.netIncome.toLocaleString()}` : eco.netIncome.toLocaleString()} / hr
            </div>
          </div>
        </button>

        <div className="h-7 w-px bg-white/10" />

        {/* Population */}
        <button
          onClick={() => setShowStatsPopover(!showStatsPopover)}
          className="flex items-center gap-2.5 text-left hover:opacity-90 transition-opacity"
          title="Population & Growth"
        >
          <Users className="w-5 h-5 text-slate-300" />
          <div className="leading-tight">
            <div className="text-white font-bold text-sm">
              {eco.population.toLocaleString()}
            </div>
            <div className="text-[11px] font-medium text-emerald-400">
              +{popGrowthRate} / hr
            </div>
          </div>
        </button>

        <div className="h-7 w-px bg-white/10" />

        {/* Power */}
        <div className="flex items-center gap-1.5" title={`Power Grid: ${eco.powerConsumed} / ${eco.powerGenerated} MW`}>
          <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="text-white font-bold text-sm">{powerPercent}%</span>
        </div>

        <div className="h-7 w-px bg-white/10" />

        {/* Water */}
        <div className="flex items-center gap-1.5" title={`Water Supply: ${eco.waterConsumed} / ${eco.waterSupplied} m³/h`}>
          <Droplets className="w-4 h-4 text-sky-400 fill-sky-400" />
          <span className="text-white font-bold text-sm">{waterPercent}%</span>
        </div>

        <div className="h-7 w-px bg-white/10 hidden md:block" />

        {/* Date & Time */}
        <div className="hidden md:flex items-center gap-2.5">
          {engine.world.isNight ? (
            <Moon className="w-5 h-5 text-sky-300" />
          ) : (
            <Sun className="w-5 h-5 text-amber-400" />
          )}
          <div className="leading-tight">
            <div className="text-slate-200 font-medium text-xs">Apr 23, 2024</div>
            <div className="text-slate-300 text-[11px]">{formatTime12h(engine.world.timeOfDay)}</div>
          </div>
        </div>

        {/* Simulation Speed Controls */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => {
              engine.simSpeed = 0;
              soundManager.playClick();
              engine.onStateUpdate?.();
            }}
            className={`p-1.5 rounded-lg transition-all ${
              engine.simSpeed === 0
                ? 'bg-sky-500/30 border border-sky-400 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Pause"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
          </button>
          <button
            onClick={() => {
              engine.simSpeed = 1;
              soundManager.playClick();
              engine.onStateUpdate?.();
            }}
            className={`p-1.5 rounded-lg transition-all ${
              engine.simSpeed === 1
                ? 'bg-sky-500/30 border border-sky-400 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Normal Speed"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
          </button>
          <button
            onClick={() => {
              engine.simSpeed = 2;
              soundManager.playClick();
              engine.onStateUpdate?.();
            }}
            className={`p-1.5 rounded-lg transition-all ${
              engine.simSpeed === 2
                ? 'bg-sky-500/30 border border-sky-400 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Fast Speed"
          >
            <FastForward className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      </div>

      {/* Right: Compact Banking & Settings Button */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          onClick={() => {
            soundManager.playClick();
            onOpenBanking();
          }}
          className="bg-[#101c2e]/90 backdrop-blur-md hover:bg-[#192b44] text-emerald-400 hover:text-white px-3 py-2 rounded-xl border border-white/10 shadow-xl transition-colors flex items-center gap-1.5 text-xs font-bold"
          title="Municipal Bank & Loans"
        >
          <span className="w-5 h-5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs">$</span>
          <span>Loans</span>
        </button>

        <button
          onClick={() => {
            soundManager.playClick();
            onOpenSettings();
          }}
          className="bg-[#101c2e]/90 backdrop-blur-md hover:bg-[#192b44] text-slate-200 hover:text-white p-2.5 rounded-xl border border-white/10 shadow-xl transition-colors"
          title="Settings & Game Controls"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* On-Demand Statistics Popover (Hidden until user clicks treasury/population) */}
      {showStatsPopover && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-[#101c2e]/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl px-5 py-3 flex items-center gap-5 text-xs text-slate-200 pointer-events-auto animate-fade-in">
          <div>
            <span className="text-slate-400 block text-[11px]">Housing</span>
            <span className="font-bold text-white">{eco.population} / {eco.maxHousing}</span>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div>
            <span className="text-slate-400 block text-[11px]">Approval</span>
            <span className="font-bold text-emerald-400">{eco.approvalRating}%</span>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div>
            <span className="text-slate-400 block text-[11px]">Zone Demand (R/C/I)</span>
            <span className="font-bold text-sky-300">
              {eco.residentialDemand ?? 65}% / {eco.commercialDemand ?? 50}% / {eco.industrialDemand ?? 45}%
            </span>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div>
            <span className="text-slate-400 block text-[11px]">Traffic / Pollution</span>
            <span className="font-bold text-amber-300">
              {eco.trafficCongestion ?? 18}% / {eco.pollutionLevel ?? 16}%
            </span>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div>
            <span className="text-slate-400 block text-[11px]">Defense Readiness</span>
            <span className="font-bold text-sky-400">{eco.militaryReadiness}%</span>
          </div>
        </div>
      )}
    </header>
  );
};
