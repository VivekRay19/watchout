import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './engine/GameEngine';
import { TopHUD } from './ui/TopHUD';
import { ConstructionMenu } from './ui/ConstructionMenu';
import { CombatLog } from './ui/CombatLog';
import { ThreatAlertBanner } from './ui/ThreatAlertBanner';
import { BuildingInspector } from './ui/BuildingInspector';
import { MilitaryPanel } from './ui/MilitaryPanel';
import { ResearchModal } from './ui/ResearchModal';
import { SettingsModal } from './ui/SettingsModal';
import { BankingModal } from './ui/BankingModal';
import { TutorialCard } from './ui/TutorialCard';
import { Minimap } from './ui/Minimap';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [, setTick] = useState(0);

  // On-demand panels (hidden until needed)
  const [showMilitary, setShowMilitary] = useState(false);
  const [showResearch, setShowResearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCombatLog, setShowCombatLog] = useState(false);
  const [showBanking, setShowBanking] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;

    engine.onStateUpdate = () => {
      setTick((t) => t + 1);
    };
    setTick((t) => t + 1);

    return () => {
      engine.destroy();
    };
  }, []);

  const engine = engineRef.current;

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#6ec6f5] font-sans">
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-default outline-none"
        tabIndex={0}
      />

      {engine && (
        <>
          {/* Compact Top Bar */}
          <TopHUD
            engine={engine}
            onOpenResearch={() => setShowResearch(true)}
            onOpenMilitary={() => setShowMilitary(true)}
            onOpenSettings={() => setShowSettings(true)}
            onOpenBanking={() => setShowBanking(true)}
          />

          {/* Compact Top-Right Minimap */}
          <Minimap engine={engine} />

          {/* Compact Top-Left Getting Started Tutorial Card */}
          <TutorialCard engine={engine} onOpenMilitary={() => setShowMilitary(true)} />

          {/* Incoming Threat Warning Banner (Only visible during active threat detection) */}
          <ThreatAlertBanner
            threats={engine.threatSystem.activeThreats}
            onFocusThreat={(threat) => engine.world.focusOn(threat.x, threat.z, 95)}
          />

          {/* Combat Event Log (Hidden until toggled via Defense menu) */}
          {showCombatLog && <CombatLog logs={engine.combatLogs} />}

          {/* Building Inspector (Only visible when a building is clicked) */}
          {engine.selectedBuilding && (
            <BuildingInspector
              building={engine.selectedBuilding}
              engine={engine}
              onClose={() => {
                engine.selectedBuilding = null;
                engine.defenseSystem.showCoverageOverlay = false;
                engine.onStateUpdate?.();
              }}
            />
          )}

          {/* Simple Bottom Construction Toolbar */}
          <ConstructionMenu
            engine={engine}
            onOpenMilitary={() => setShowMilitary(true)}
            onOpenResearch={() => setShowResearch(true)}
            onToggleLogs={() => setShowCombatLog((v) => !v)}
          />

          {/* Military Operations Modal (Hidden until needed) */}
          {showMilitary && (
            <MilitaryPanel engine={engine} onClose={() => setShowMilitary(false)} />
          )}

          {/* Research & Technology Modal (Hidden until needed) */}
          {showResearch && (
            <ResearchModal engine={engine} onClose={() => setShowResearch(false)} />
          )}

          {/* Settings Modal (Hidden until needed) */}
          {showSettings && (
            <SettingsModal engine={engine} onClose={() => setShowSettings(false)} />
          )}

          {/* Municipal Banking Modal (Hidden until needed) */}
          {showBanking && (
            <BankingModal engine={engine} onClose={() => setShowBanking(false)} />
          )}
        </>
      )}
    </div>
  );
};
