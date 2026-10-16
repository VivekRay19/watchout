import React, { useEffect, useState } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';

interface TutorialCardProps {
  engine: GameEngine;
  onOpenMilitary?: () => void;
}

export type TutorialStep = 1 | 2 | 3 | 4 | 5 | 6; // 6 = finished

const TUTORIAL_STORAGE_KEY = 'watchout_tutorial_v2_1';

export const TutorialCard: React.FC<TutorialCardProps> = ({ engine, onOpenMilitary }) => {
  const [currentStep, setCurrentStep] = useState<TutorialStep>(() => {
    const saved = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    return saved ? (parseInt(saved, 10) as TutorialStep) : 1;
  });
  const [showTips, setShowTips] = useState(false);
  const [initialRoadsCount] = useState(() => engine.roadSystem.segments.size);
  const [initialBuildingsCount] = useState(() => engine.buildings.length);
  const [drillTriggered, setDrillTriggered] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentStep >= 6) return;

      if (currentStep === 1) {
        if (engine.roadSystem.segments.size > initialRoadsCount) {
          advanceStep();
        }
      } else if (currentStep === 2) {
        if (engine.buildings.length > initialBuildingsCount) {
          advanceStep();
        }
      } else if (currentStep === 3) {
        const hasNewDef =
          engine.buildings.filter(
            (b) => b.type === 'def_sam_battery' || b.type === 'def_radar' || b.type === 'def_ciws'
          ).length > 3;
        if (hasNewDef) {
          advanceStep();
        }
      } else if (currentStep === 4) {
        if (
          drillTriggered &&
          engine.threatSystem.activeThreats.length === 0 &&
          engine.combatLogs.some((l) => l.type === 'SUCCESS')
        ) {
          advanceStep();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentStep, initialRoadsCount, initialBuildingsCount, drillTriggered, engine]);

  const advanceStep = () => {
    setCurrentStep((prev) => {
      const next = Math.min(6, prev + 1) as TutorialStep;
      localStorage.setItem(TUTORIAL_STORAGE_KEY, next.toString());
      return next;
    });
  };

  if (currentStep >= 6) {
    return null;
  }

  const steps: Record<number, { title: string; desc: string; onAction: () => void }> = {
    1: {
      title: 'Getting Started',
      desc: 'Welcome! Build roads to connect zones and grow your city.',
      onAction: () => {
        soundManager.playClick();
        if (!engine.placement.activeBuildingType?.startsWith('road_')) {
          engine.placement.selectBuilding('road_two_lane');
          engine.onStateUpdate?.();
        } else {
          advanceStep();
        }
      },
    },
    2: {
      title: 'Expand Your City',
      desc: 'Choose Residential or Commercial and place a building along a connected road.',
      onAction: () => {
        soundManager.playClick();
        advanceStep();
      },
    },
    3: {
      title: 'Strengthen Air Defense',
      desc: 'Open Defense to place a Radar Tower or SAM Battery to protect the coastline.',
      onAction: () => {
        soundManager.playClick();
        advanceStep();
      },
    },
    4: {
      title: 'Test Air Interception',
      desc: 'Click Next to launch a target drone and watch your SAM battery intercept it.',
      onAction: () => {
        soundManager.playClick();
        if (!drillTriggered) {
          setDrillTriggered(true);
          const threat = engine.triggerAirDefenseDrill();
          engine.world.focusOn(threat.targetX, threat.targetZ, 125);
        } else {
          advanceStep();
        }
      },
    },
    5: {
      title: 'Launch Strike Mission',
      desc: 'Open Military and launch a reconnaissance flight from your airbase.',
      onAction: () => {
        soundManager.playClick();
        onOpenMilitary?.();
        advanceStep();
      },
    },
  };

  const step = steps[currentStep] || steps[1];

  return (
    <div className="fixed top-20 left-5 z-20 bg-[#101c2e]/92 backdrop-blur-md rounded-2xl p-3.5 border border-white/12 shadow-2xl w-[320px] max-w-[88vw] select-none pointer-events-auto animate-fade-in">
      {/* Header Row: Amber ! Icon + Getting Started + Step Counter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-sm">
            !
          </div>
          <span className="font-bold text-white text-sm tracking-tight">{step.title}</span>
        </div>
        <span className="text-xs font-semibold text-slate-300 bg-white/10 px-2 py-0.5 rounded-lg">
          {currentStep - 1}/1
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-200 leading-relaxed mt-2">{step.desc}</p>

      {/* Expandable Tips Drawer */}
      {showTips && (
        <div className="mt-2.5 pt-2.5 border-t border-white/10 text-[11px] text-slate-300 space-y-1.5">
          <div>• Click any road node or road segment to snap T-junctions and crossroads.</div>
          <div>• Keep Power & Water above 70% so factories and radars operate at full speed.</div>
          <div>• Click any building to inspect construction progress, health, or radar range.</div>
        </div>
      )}

      {/* Footer Actions: Show Tips + Next Step */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          onClick={() => {
            soundManager.playClick();
            setShowTips((v) => !v);
          }}
          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/10 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
        >
          <span>Show Tips</span>
          {showTips ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={step.onAction}
          className="flex items-center gap-1 bg-sky-500/25 hover:bg-sky-500/35 border border-sky-400/40 text-sky-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
          title="Next Step"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
