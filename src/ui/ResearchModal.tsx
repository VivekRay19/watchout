import React, { useState } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { TechNode } from '../types/game';
import {
  FlaskConical,
  X,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
  Layers,
  Factory,
  Shield,
  Plane,
} from 'lucide-react';
import { soundManager } from '../audio/SoundManager';

interface ResearchModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const ResearchModal: React.FC<ResearchModalProps> = ({ engine, onClose }) => {
  const [selectedBranch, setSelectedBranch] = useState<'all' | 'civil' | 'industry' | 'defense' | 'offense'>('all');
  const techTree = engine.techTree;
  const treasury = engine.economy.state.treasury;

  const branches = [
    { id: 'all', name: 'All Branches', icon: <Layers className="w-4 h-4" /> },
    { id: 'civil', name: 'Civil & Zoning', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'industry', name: 'Industrial Logistics', icon: <Factory className="w-4 h-4" /> },
    { id: 'defense', name: 'Air Defense & Radar', icon: <Shield className="w-4 h-4" /> },
    { id: 'offense', name: 'Air & Naval Strike', icon: <Plane className="w-4 h-4" /> },
  ];

  const filteredTech = selectedBranch === 'all'
    ? techTree
    : techTree.filter((t) => t.branch === selectedBranch);

  const handleStartResearch = (tech: TechNode) => {
    if (tech.unlocked || tech.researching) return;
    if (treasury < tech.cost) return;

    // Check prerequisites
    const unmet = tech.prerequisites.some(
      (pre) => !techTree.some((t) => t.id === pre && t.unlocked)
    );
    if (unmet) return;

    if (engine.economy.deductFunds(tech.cost)) {
      tech.researching = true;
      tech.progress = 0;
      soundManager.playClick();
      engine.log('INFO', `COMMENCED RESEARCH: [${tech.name}]. ETA: ${tech.researchTimeSeconds}s`);
      engine.onStateUpdate?.();
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm select-none pointer-events-auto animate-fade-in">
      <div className="bg-slate-950/95 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-800/80 text-cyan-400">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-slate-100 text-base flex items-center gap-2">
                NATIONAL RESEARCH & TECHNOLOGY LAB
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                Scientific Advancement • Urban Infrastructure • Defense Innovation
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Branch Filter Tabs */}
        <div className="px-5 py-2.5 bg-slate-900/30 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => {
                soundManager.playClick();
                setSelectedBranch(b.id as typeof selectedBranch);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                selectedBranch === b.id
                  ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {b.icon}
              <span>{b.name}</span>
            </button>
          ))}
        </div>

        {/* Tech Grid */}
        <div className="p-5 overflow-y-auto space-y-3">
          {filteredTech.map((tech) => {
            const hasPrereqs = !tech.prerequisites.some(
              (pre) => !techTree.some((t) => t.id === pre && t.unlocked)
            );
            const canAfford = treasury >= tech.cost;
            const canStart = !tech.unlocked && !tech.researching && hasPrereqs && canAfford;

            return (
              <div
                key={tech.id}
                className={`rounded-xl p-4 border transition-all ${
                  tech.unlocked
                    ? 'bg-slate-900/30 border-emerald-900/40'
                    : tech.researching
                    ? 'bg-cyan-950/20 border-cyan-800/60 ring-1 ring-cyan-500/30'
                    : hasPrereqs
                    ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-900/30 border-slate-850 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-slate-100 text-sm">
                        {tech.name}
                      </h3>
                      {tech.unlocked && (
                        <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3" /> UNLOCKED
                        </span>
                      )}
                      {tech.researching && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 animate-pulse">
                          RESEARCH IN PROGRESS
                        </span>
                      )}
                      {!hasPrereqs && (
                        <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                          <Lock className="w-3 h-3" /> PREREQUISITES REQUIRED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {tech.description}
                    </p>
                    <div className="text-[11px] font-mono text-cyan-300 font-semibold pt-1">
                      Perk: {tech.perkDescription}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {!tech.unlocked && (
                      <div className="font-mono text-xs">
                        <span className={`font-bold block ${canAfford ? 'text-emerald-400' : 'text-red-400'}`}>
                          ${tech.cost.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {tech.researchTimeSeconds}s
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar if researching */}
                {tech.researching && (
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400">
                      <span>LAB SYNTHESIS & TESTING...</span>
                      <span>{Math.round(tech.progress)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                        style={{ width: `${tech.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Action button */}
                {!tech.unlocked && !tech.researching && (
                  <div className="flex justify-end mt-3">
                    <button
                      disabled={!canStart}
                      onClick={() => handleStartResearch(tech)}
                      className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                        canStart
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/30'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                      <span>
                        {!hasPrereqs
                          ? 'PREREQUISITES LOCKED'
                          : !canAfford
                          ? 'INSUFFICIENT FUNDS'
                          : 'COMMENCE RESEARCH'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
