import React, { useEffect, useState } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { ChevronRight } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';

interface TutorialCardProps {
  engine: GameEngine;
  onOpenMilitary?: () => void;
}

export type TutorialStep = 1 | 2 | 3 | 4 | 5 | 6; // 6 = finished

const TUTORIAL_STORAGE_KEY = 'watchout_tutorial_v2';

export const TutorialCard: React.FC<TutorialCardProps> = ({ engine, onOpenMilitary }) => {
  const [currentStep, setCurrentStep] = useState<TutorialStep>(() => {
    const saved = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    return saved ? (parseInt(saved, 10) as TutorialStep) : 1;
  });
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
        const hasNewDef = engine.buildings.filter(
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
      title: 'Build your first road',
      desc: 'Select the Roads tool and draw a road to connect this area.',
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
      title: 'Expand your neighborhood',
      desc: 'Choose Residential or Commercial and place a building along a road.',
      onAction: () => {
        soundManager.playClick();
        advanceStep();
      },
    },
    3: {
      title: 'Strengthen air defense',
      desc: 'Open Defense to add a Radar Tower or SAM Battery to protect the city.',
      onAction: () => {
        soundManager.playClick();
        advanceStep();
      },
    },
    4: {
      title: 'Test air-defense interception',
      desc: 'Click the arrow to launch a target drone and watch your SAM battery intercept it.',
      onAction: () => {
        soundManager.playClick();
        if (!drillTriggered) {
          setDrillTriggered(true);
          const threat = engine.triggerAirDefenseDrill();
          engine.world.focusOn(threat.targetX, threat.targetZ, 120);
        } else {
          advanceStep();
        }
      },
    },
    5: {
      title: 'Launch a strike mission',
      desc: 'Open Defense and launch a reconnaissance flight from your airbase.',
      onAction: () => {
        soundManager.playClick();
        onOpenMilitary?.();
        advanceStep();
      },
    },
  };

  const step = steps[currentStep] || steps[1];

  return (
    <div className="fixed bottom-5 left-5 z-20 bg-[#101c2e]/92 backdrop-blur-md rounded-2xl p-3.5 pr-4 border border-white/10 shadow-2xl flex items-center gap-3.5 w-[355px] max-w-[90vw] select-none pointer-events-auto animate-fade-in">
      {/* Friendly Construction Engineer Avatar with Yellow Hard Hat */}
      <div className="w-12 h-12 rounded-xl bg-sky-500/15 border border-sky-400/25 flex items-center justify-center shrink-0 overflow-hidden">
        <svg viewBox="0 0 64 64" className="w-11 h-11">
          {/* Shoulders / Orange Safety Vest */}
          <path d="M12 60 C12 46 52 46 52 60 Z" fill="#f97316" />
          <path d="M24 48 L28 60 L36 60 L40 48 Z" fill="#fef08a" />
          {/* Neck & Face */}
          <rect x="27" y="38" width="10" height="8" rx="3" fill="#f6c492" />
          <circle cx="32" cy="30" r="11" fill="#fbd3a7" />
          {/* Eyes & Warm Smile */}
          <circle cx="28" cy="29" r="1.5" fill="#1e293b" />
          <circle cx="36" cy="29" r="1.5" fill="#1e293b" />
          <path d="M28 34 Q32 37 36 34" stroke="#1e293b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          {/* Yellow Hard Hat */}
          <path d="M19 24 C19 13 45 13 45 24 Z" fill="#facc15" />
          <rect x="16" y="22" width="32" height="4" rx="2" fill="#eab308" />
          <rect x="29" y="13" width="6" height="9" rx="1.5" fill="#fef08a" />
        </svg>
      </div>

      {/* Text Content */}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white text-sm leading-snug truncate">
          {step.title}
        </div>
        <p className="text-xs text-slate-300 leading-snug mt-0.5 line-clamp-2">
          {step.desc}
        </p>
      </div>

      {/* Action / Next Arrow Button */}
      <button
        onClick={step.onAction}
        className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white shrink-0 transition-colors"
        title="Continue"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
