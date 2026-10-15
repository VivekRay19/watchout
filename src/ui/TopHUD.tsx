import React, { useState } from 'react';
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
  ChevronDown,
  ChevronUp,
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
  const [showDetails, setShowDetails] = useState(false);
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
      {/* Primary Top Bar */}
      <div className="bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2 flex items-center justify-between text-xs pointer-events-auto shadow-2xl">
        {/* Left: Branding & Simulation Clock */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-black text-white text-sm tracking-wider shadow-lg shadow-cyan-500/25">
              W
            </div>
            <div>
              <div className="font-display font-bold text-slate-100 tracking-wider text-sm flex items-center gap-1.5">
                WATCH OUT
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                  v1.2.0
                </span>
              </div>
              <div className="text-[9px] text-slate-400 font-mono tracking-wider">
                BUILD • DEFEND • STRIKE
              </div>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Simulation Time & Speed Controls */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800">
            <span className="font-mono text-slate-300 font-semibold text-xs">
              {formatTime(engine.world.timeOfDay)}
            </span>
            <div className="flex items-center gap-0.5 ml-1">
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
            </div>
          </div>
        </div>

        {/* Center: Essential Primary Telemetry */}
        <div className="flex items-center gap-3">
          {/* Treasury */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1 rounded-lg border border-slate-800">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono font-bold text-slate-100 text-xs">
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

          {/* Population */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono font-bold text-slate-100">
              {eco.population.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              /{eco.maxHousing}
            </span>
          </div>

          {/* Compact Threat Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono font-bold text-[11px] ${threatColor}`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>THREAT: {eco.threatLevel}</span>
          </div>

          {/* Toggle Secondary Details Drawer */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-800 text-[10px] font-mono transition-colors"
            title="Toggle Detailed City Telemetry"
          >
            <span>STATS</span>
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Right: Operational Modals & Utilities */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundManager.playClick();
              onOpenResearch();
            }}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 px-2.5 py-1 rounded-lg border border-slate-800 hover:border-cyan-800/80 transition-all font-mono"
            title="Open Technology Research Tree"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span className="hidden md:inline">RESEARCH</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onOpenMilitary();
            }}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-red-400 hover:text-red-300 px-2.5 py-1 rounded-lg border border-slate-800 hover:border-red-800/80 transition-all font-mono"
            title="Open Military Command & Missions"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span className="hidden md:inline">MILITARY OPS</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              engine.saveGame();
            }}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition-colors"
            title="Save Game"
          >
            <Save className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              engine.world.resetCamera();
            }}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition-colors"
            title="Reset Camera View (R / Home)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onOpenSettings();
            }}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition-colors"
            title="Settings & Audio"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable Secondary Telemetry Drawer (Progressive Disclosure) */}
      {showDetails && (
        <div className="bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-6 py-2 flex items-center justify-center gap-5 text-xs pointer-events-auto shadow-xl animate-fade-in font-mono">
          {/* Approval Rating */}
          <div className="flex items-center gap-1.5 text-slate-300">
            <Smile className="w-3.5 h-3.5 text-amber-400" />
            <span>Approval: <strong className="text-white">{eco.approvalRating}%</strong></span>
          </div>

          <div className="h-3 w-px bg-slate-800" />

          {/* Power Grid */}
          <div
            className={`flex items-center gap-1.5 ${
              isPowerDeficit ? 'text-red-400 font-bold animate-pulse' : 'text-slate-300'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isPowerDeficit ? 'text-red-400' : 'text-amber-400'}`} />
            <span>
              Power: <strong>{eco.powerConsumed}/{eco.powerGenerated}</strong> MW
            </span>
          </div>

          <div className="h-3 w-px bg-slate-800" />

          {/* Water Grid */}
          <div
            className={`flex items-center gap-1.5 ${
              isWaterDeficit ? 'text-red-400 font-bold animate-pulse' : 'text-slate-300'
            }`}
          >
            <Droplets className={`w-3.5 h-3.5 ${isWaterDeficit ? 'text-red-400' : 'text-cyan-400'}`} />
            <span>
              Water: <strong>{eco.waterConsumed}/{eco.waterSupplied}</strong> m³/h
            </span>
          </div>

          <div className="h-3 w-px bg-slate-800" />

          {/* Supplies */}
          <div className="flex items-center gap-1.5 text-slate-300">
            <Package className="w-3.5 h-3.5 text-lime-400" />
            <span>Supplies: <strong className="text-white">{Math.floor(eco.militarySupplies)}</strong></span>
          </div>

          <div className="h-3 w-px bg-slate-800" />

          {/* Military Readiness */}
          <div className="flex items-center gap-1.5 text-slate-300">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Readiness: <strong className="text-white">{eco.militaryReadiness}%</strong></span>
          </div>
        </div>
      )}
    </header>
  );
};
