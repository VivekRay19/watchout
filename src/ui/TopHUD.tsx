import React from 'react';
import { GameEngine } from '../engine/GameEngine';
import {
  Play,
  Pause,
  FastForward,
  Zap,
  Droplets,
  DollarSign,
  Users,
  Shield,
  AlertTriangle,
  FlaskConical,
  Crosshair,
  Settings,
  Save,
  RotateCcw,
  Smile,
  Package,
} from 'lucide-react';
import { soundManager } from '../audio/SoundManager';

interface TopHUDProps {
  engine: GameEngine;
  onOpenResearch: () => void;
  onOpenMilitary: () => void;
  onOpenSettings: () => void;
}

export const TopHUD: React.FC<TopHUDProps> = ({
  engine,
  onOpenResearch,
  onOpenMilitary,
  onOpenSettings,
}) => {
  const eco = engine.economy.state;
  const isPowerDeficit = eco.powerConsumed > eco.powerGenerated;
  const isWaterDeficit = eco.waterConsumed > eco.waterSupplied;

  const threatColor = {
    MINIMAL: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    ELEVATED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    CRITICAL: 'bg-red-500/30 text-red-400 border-red-500/60 animate-pulse',
  }[eco.threatLevel];

  const formatTime = (hours24: number) => {
    const h = Math.floor(hours24);
    const m = Math.floor((hours24 - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-20 pointer-events-none select-none">
      {/* Top Telemetry Bar */}
      <div className="bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2 flex items-center justify-between text-xs pointer-events-auto shadow-2xl">
        {/* Left: Branding & Game Time */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-black text-white text-sm tracking-wider shadow-lg shadow-cyan-500/20">
              W
            </div>
            <div>
              <div className="font-display font-bold text-slate-100 tracking-wider text-sm flex items-center gap-1.5">
                WATCH OUT
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                  v1.1.0
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider">
                BUILD • DEFEND • STRIKE
              </div>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Simulation Time & Speed Controls */}
          <div className="flex items-center gap-2 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
            <span className="font-mono text-slate-300 font-medium">
              {formatTime(engine.world.timeOfDay)}
            </span>
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={() => {
                  engine.simSpeed = 0;
                  soundManager.playClick();
                  engine.onStateUpdate?.();
                }}
                className={`p-1 rounded transition-colors ${
                  engine.simSpeed === 0 ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Pause Simulation"
              >
                <Pause className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  engine.simSpeed = 1;
                  soundManager.playClick();
                  engine.onStateUpdate?.();
                }}
                className={`p-1 rounded transition-colors ${
                  engine.simSpeed === 1 ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Normal Speed (1x)"
              >
                <Play className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  engine.simSpeed = 2;
                  soundManager.playClick();
                  engine.onStateUpdate?.();
                }}
                className={`p-1 rounded transition-colors ${
                  engine.simSpeed === 2 ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Fast Speed (2x)"
              >
                <FastForward className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  engine.simSpeed = 4;
                  soundManager.playClick();
                  engine.onStateUpdate?.();
                }}
                className={`px-1 py-0.5 text-[10px] font-mono rounded transition-colors ${
                  engine.simSpeed === 4 ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Ultra Speed (4x)"
              >
                4x
              </button>
            </div>
          </div>
        </div>

        {/* Center: Economic, Resource, and Grid Telemetry */}
        <div className="flex items-center gap-4">
          {/* Treasury */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded border border-slate-800">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <div>
              <span className="font-mono font-bold text-slate-100">
                ${Math.floor(eco.treasury).toLocaleString()}
              </span>
              <span
                className={`ml-1 font-mono text-[10px] ${
                  eco.netIncome >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {eco.netIncome >= 0 ? `+${eco.netIncome}` : eco.netIncome}/hr
              </span>
            </div>
          </div>

          {/* Population & Approval */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded border border-slate-800">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <div>
              <span className="font-mono font-bold text-slate-100">
                {eco.population.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 ml-1 font-mono">
                /{eco.maxHousing}
              </span>
            </div>
            <div className="h-3 w-px bg-slate-800 mx-1" />
            <Smile className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-slate-200">{eco.approvalRating}%</span>
          </div>

          {/* Power Grid */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border ${
              isPowerDeficit
                ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse'
                : 'bg-slate-900/90 border-slate-800 text-slate-200'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isPowerDeficit ? 'text-red-400' : 'text-amber-400'}`} />
            <span className="font-mono font-bold">
              {eco.powerConsumed}/{eco.powerGenerated}
            </span>
            <span className="text-[10px] font-mono text-slate-400">MW</span>
          </div>

          {/* Water Grid */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border ${
              isWaterDeficit
                ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse'
                : 'bg-slate-900/90 border-slate-800 text-slate-200'
            }`}
          >
            <Droplets className={`w-3.5 h-3.5 ${isWaterDeficit ? 'text-red-400' : 'text-cyan-400'}`} />
            <span className="font-mono font-bold">
              {eco.waterConsumed}/{eco.waterSupplied}
            </span>
            <span className="text-[10px] font-mono text-slate-400">m³/h</span>
          </div>

          {/* Military Supplies */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded border border-slate-800">
            <Package className="w-3.5 h-3.5 text-lime-400" />
            <span className="font-mono text-slate-200">{Math.floor(eco.militarySupplies)}</span>
            <span className="text-[10px] text-slate-400">Supplies</span>
          </div>

          {/* Threat Level */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono font-bold text-[11px] ${threatColor}`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>THREAT: {eco.threatLevel}</span>
          </div>

          {/* Military Readiness */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded border border-slate-800">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono font-bold text-slate-200">{eco.militaryReadiness}%</span>
            <span className="text-[10px] text-slate-400">Readiness</span>
          </div>
        </div>

        {/* Right: Operational Modals & Utilities */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundManager.playClick();
              onOpenResearch();
            }}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 px-2.5 py-1 rounded border border-slate-800 hover:border-cyan-800/80 transition-all font-mono"
            title="Open Technology Research Tree"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>RESEARCH</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onOpenMilitary();
            }}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-red-400 hover:text-red-300 px-2.5 py-1 rounded border border-slate-800 hover:border-red-800/80 transition-all font-mono"
            title="Open Military Command & Missions"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>MILITARY OPS</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              engine.saveGame();
            }}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-800 transition-colors"
            title="Save Game"
          >
            <Save className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              engine.world.resetCamera();
            }}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-800 transition-colors"
            title="Reset Camera View (R / Home)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onOpenSettings();
            }}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-800 transition-colors"
            title="Settings & Audio"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
