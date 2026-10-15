import React from 'react';
import { GameEngine } from '../engine/GameEngine';
import {
  Crosshair,
  Shield,
  Plane,
  X,
  AlertTriangle,
  Flame,
  Award,
  Clock,
  Compass,
} from 'lucide-react';
import { soundManager } from '../audio/SoundManager';

interface MilitaryPanelProps {
  engine: GameEngine;
  onClose: () => void;
}

export const MilitaryPanel: React.FC<MilitaryPanelProps> = ({ engine, onClose }) => {
  const missions = engine.missionSystem.missions;
  const enemy = engine.enemyFaction;
  const airbaseCount = engine.buildings.filter(
    (b) => b.type === 'mil_airbase' && b.active && b.powered
  ).length;
  const navalDockCount = engine.buildings.filter(
    (b) => b.type === 'mil_naval_dock' && b.active && b.powered
  ).length;
  const squadronReadiness = engine.airTraffic.getReadiness();

  const handleLaunch = (missionId: string) => {
    soundManager.playClick();
    engine.missionSystem.launchMission(
      missionId,
      engine.buildings,
      (entry) => engine.log(entry.type, entry.message)
    );
    engine.onStateUpdate?.();
  };

  const handleFocusEnemy = () => {
    soundManager.playClick();
    engine.world.focusOn(enemy.basePos.x, enemy.basePos.z, 70);
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm select-none pointer-events-auto animate-fade-in">
      <div className="bg-slate-950/95 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-950/80 border border-red-800/80 text-red-400">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-slate-100 text-base flex items-center gap-2">
                NATIONAL STRATEGIC COMMAND & OPERATIONS
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                Offensive Operations • Air Superiority • Hostile Sector Charlie
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

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Top Status Grid: Player Force Readiness vs Enemy Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Friendly Forces Status */}
            <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800 space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between text-cyan-400 font-bold border-b border-slate-800 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4" /> FRIENDLY COMBAT READINESS
                </span>
                <span>{engine.economy.state.militaryReadiness}%</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div>
                  <span className="text-slate-400">Tactical Airbases:</span> {airbaseCount}
                </div>
                <div>
                  <span className="text-slate-400">Naval Docks:</span> {navalDockCount}
                </div>
                <div>
                  <span className="text-slate-400">Squadron Readiness:</span> {squadronReadiness}%
                </div>
                <div>
                  <span className="text-slate-400">Supply Reserves:</span>{' '}
                  {Math.floor(engine.economy.state.militarySupplies)} Cfg
                </div>
              </div>
            </div>

            {/* Enemy Compound Status */}
            <div className="bg-red-950/20 rounded-xl p-3.5 border border-red-900/40 space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between text-red-400 font-bold border-b border-red-900/40 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4" /> HOSTILE SECTOR CHARLIE CITADEL
                </span>
                <button
                  onClick={handleFocusEnemy}
                  className="text-[10px] bg-red-900/40 hover:bg-red-900/80 text-red-200 px-2 py-0.5 rounded border border-red-800 flex items-center gap-1 transition-colors"
                >
                  <Compass className="w-3 h-3" /> Inspect Base
                </button>
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
                  <span>Fortress Integrity:</span>
                  <span className="text-red-400 font-bold">
                    {enemy.baseHealth}/{enemy.maxHealth}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{ width: `${Math.round((enemy.baseHealth / enemy.maxHealth) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-[11px] text-slate-400">
                Enemy Readiness: <span className="text-red-300 font-bold">{enemy.readiness}%</span>{' '}
                • Threat: <span className="text-orange-400">{engine.economy.state.threatLevel}</span>
              </div>
            </div>
          </div>

          {/* Missions List */}
          <div>
            <h3 className="font-display font-semibold text-slate-200 text-sm mb-3 flex items-center gap-2">
              <Plane className="w-4 h-4 text-cyan-400" />
              AVAILABLE STRIKE MISSIONS & OPERATIONS
            </h3>

            <div className="space-y-3">
              {missions.map((mission) => {
                const isRunning = mission.status === 'IN_PROGRESS';
                const canAfford = engine.economy.state.treasury >= mission.cost;
                const hasSupplies =
                  engine.economy.state.militarySupplies >= mission.requiredSupplies;
                const hasAirbase =
                  !mission.requiredAirbase || airbaseCount > 0;
                const hasDock =
                  mission.id !== 'mis_naval_interdiction' || navalDockCount > 0;

                const canLaunch =
                  mission.status === 'READY' &&
                  canAfford &&
                  hasSupplies &&
                  hasAirbase &&
                  hasDock;

                return (
                  <div
                    key={mission.id}
                    className="bg-slate-900/70 rounded-xl p-4 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-display font-bold text-slate-100 text-sm">
                            {mission.name}
                          </h4>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                              mission.status === 'IN_PROGRESS'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                                : mission.status === 'COMPLETED'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {mission.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {mission.description}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono text-emerald-400 font-bold block">
                          +${mission.rewardCash.toLocaleString()}
                        </span>
                        <span className="text-[11px] font-mono text-lime-400 block">
                          +{mission.rewardSupplies} Supplies
                        </span>
                      </div>
                    </div>

                    {/* Mission Telemetry Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                      <div>
                        <span className="text-slate-500 block text-[10px]">TARGET:</span>
                        <span>{mission.targetName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">COST / SUPPLIES:</span>
                        <span>
                          ${mission.cost} / {mission.requiredSupplies} crate
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">DURATION / RISK:</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {mission.durationSeconds}s ({mission.riskPercent}% risk)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">REQUIREMENT:</span>
                        <span
                          className={
                            hasAirbase && hasDock ? 'text-slate-300' : 'text-red-400 font-bold'
                          }
                        >
                          {mission.requiredAirbase ? 'Airbase' : 'Naval Berth'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar (if in progress) */}
                    {isRunning && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between font-mono text-[10px] text-amber-400">
                          <span>UNITS IN FLIGHT — APPROACHING TARGET...</span>
                          <span>{mission.progressPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                            style={{ width: `${mission.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Launch Action */}
                    {!isRunning && (
                      <div className="flex justify-end">
                        <button
                          disabled={!canLaunch}
                          onClick={() => handleLaunch(mission.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                            canLaunch
                              ? 'bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-lg shadow-red-600/30'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Crosshair className="w-4 h-4" />
                          <span>
                            {canLaunch
                              ? 'AUTHORIZE & LAUNCH STRIKE'
                              : !hasAirbase
                              ? 'REQUIRES AIRBASE'
                              : !hasDock
                              ? 'REQUIRES NAVAL BERTH'
                              : !hasSupplies
                              ? 'NEED MORE SUPPLIES'
                              : 'INSUFFICIENT FUNDS'}
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
      </div>
    </div>
  );
};
