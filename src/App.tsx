import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './engine/GameEngine';
import { TopHUD } from './ui/TopHUD';
import { ConstructionMenu } from './ui/ConstructionMenu';
import { StrategicMinimap } from './ui/StrategicMinimap';
import { CombatLog } from './ui/CombatLog';
import { ThreatAlertBanner } from './ui/ThreatAlertBanner';
import { BuildingInspector } from './ui/BuildingInspector';
import { MilitaryPanel } from './ui/MilitaryPanel';
import { ResearchModal } from './ui/ResearchModal';
import { SettingsModal } from './ui/SettingsModal';
import { TutorialCard } from './ui/TutorialCard';
import { HelpCircle, X } from 'lucide-react';
import { soundManager } from './audio/SoundManager';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Trigger UI re-renders on game state changes
  const [, setTick] = useState(0);

  // Modals state
  const [showMilitary, setShowMilitary] = useState(false);
  const [showResearch, setShowResearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;

    engine.onStateUpdate = () => {
      setTick((t) => t + 1);
    };

    return () => {
      engine.destroy();
    };
  }, []);

  const engine = engineRef.current;

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-slate-950 font-sans">
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-default outline-none"
        tabIndex={0}
      />

      {engine && (
        <>
          {/* Top Telemetry & Controls HUD */}
          <TopHUD
            engine={engine}
            onOpenResearch={() => setShowResearch(true)}
            onOpenMilitary={() => setShowMilitary(true)}
            onOpenSettings={() => setShowSettings(true)}
          />

          {/* Guided Onboarding Tutorial Card (Step-by-step progressive disclosure) */}
          <TutorialCard engine={engine} onOpenMilitary={() => setShowMilitary(true)} />

          {/* Incoming Threat Warning Banner */}
          <ThreatAlertBanner
            threats={engine.threatSystem.activeThreats}
            onFocusThreat={(threat) => engine.world.focusOn(threat.x, threat.z, 35)}
          />

          {/* Strategic Radar Minimap */}
          <StrategicMinimap engine={engine} />

          {/* Tactical Combat Event Log */}
          <CombatLog logs={engine.combatLogs} />

          {/* Building Inspector Modal (if building selected) */}
          {engine.selectedBuilding && (
            <BuildingInspector
              building={engine.selectedBuilding}
              engine={engine}
              onClose={() => {
                engine.selectedBuilding = null;
                engine.onStateUpdate?.();
              }}
            />
          )}

          {/* Bottom Construction Drawer */}
          <ConstructionMenu engine={engine} />

          {/* Military Operations Modal */}
          {showMilitary && (
            <MilitaryPanel engine={engine} onClose={() => setShowMilitary(false)} />
          )}

          {/* Research & Technology Modal */}
          {showResearch && (
            <ResearchModal engine={engine} onClose={() => setShowResearch(false)} />
          )}

          {/* Settings Modal */}
          {showSettings && (
            <SettingsModal engine={engine} onClose={() => setShowSettings(false)} />
          )}

          {/* Quick Controls & Field Manual Helper Button */}
          <button
            onClick={() => {
              soundManager.playClick();
              setShowHelp(!showHelp);
            }}
            className="fixed bottom-3 right-4 z-20 p-2.5 bg-slate-950/90 hover:bg-slate-900 text-cyan-400 hover:text-cyan-300 rounded-2xl border border-slate-800 shadow-2xl transition-all"
            title="Field Manual & Controls"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* Quick Controls Card */}
          {showHelp && (
            <div className="fixed bottom-14 right-4 z-20 w-80 bg-slate-950/95 backdrop-blur-md rounded-2xl border border-slate-800/90 shadow-2xl p-4 text-xs font-mono select-none animate-fade-in">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span className="font-display font-bold text-slate-100 flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  FIELD MANUAL & TACTICAL CONTROLS
                </span>
                <button
                  onClick={() => setShowHelp(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-300 leading-snug">
                <div className="flex justify-between">
                  <span className="text-slate-500">Camera Pan:</span>
                  <span className="text-cyan-300 font-bold">W, A, S, D / Arrows</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Orbit / Tilt:</span>
                  <span className="text-cyan-300 font-bold">Right-Click + Drag</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Zoom In/Out:</span>
                  <span className="text-cyan-300 font-bold">Mouse Scroll Wheel</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rotate Building:</span>
                  <span className="text-cyan-300 font-bold">R Key</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cancel / Deselect:</span>
                  <span className="text-cyan-300 font-bold">ESC Key</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Inspect Structure:</span>
                  <span className="text-cyan-300 font-bold">Left-Click on 3D Model</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Minimap Teleport:</span>
                  <span className="text-cyan-300 font-bold">Click Radar Minimap</span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                Tip: Build Early Warning Radars & Patriot SAM batteries to safeguard your industrial base against enemy airstrikes!
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
