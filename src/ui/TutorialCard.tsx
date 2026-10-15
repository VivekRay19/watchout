import React, { useEffect, useState } from 'react';
import { GameEngine } from '../engine/GameEngine';
import {
  Compass,
  Navigation,
  Home,
  Zap,
  Radar,
  ShieldAlert,
  Crosshair,
  CheckCircle2,
  X,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { soundManager } from '../audio/SoundManager';

interface TutorialCardProps {
  engine: GameEngine;
  onOpenMilitary?: () => void;
}

export type TutorialStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; // 8 = finished

const TUTORIAL_STORAGE_KEY = 'watchout_tutorial_step';

export const TutorialCard: React.FC<TutorialCardProps> = ({ engine, onOpenMilitary }) => {
  const [currentStep, setCurrentStep] = useState<TutorialStep>(() => {
    const saved = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    return saved ? (parseInt(saved, 10) as TutorialStep) : 1;
  });
  const [isDismissed, setIsDismissed] = useState(false);
  const [trainingThreatSpawned, setTrainingThreatSpawned] = useState(false);

  // Auto-advance detection based on real game state
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDismissed || currentStep >= 8) return;

      if (currentStep === 2) {
        // Step 2: Build a road segment
        if (engine.roadSystem.segments.size > 4) {
          advanceStep();
        }
      } else if (currentStep === 3) {
        // Step 3: Build residential or commercial
        const hasRes = engine.buildings.some((b) => b.type.startsWith('res_') || b.type.startsWith('com_'));
        if (hasRes && engine.buildings.length > 5) {
          advanceStep();
        }
      } else if (currentStep === 4) {
        // Step 4: Build power or water
        const hasUtil = engine.buildings.some((b) => b.type.startsWith('util_'));
        if (hasUtil && engine.economy.state.powerGenerated > 25) {
          advanceStep();
        }
      } else if (currentStep === 5) {
        // Step 5: Build radar and SAM battery
        const hasRadar = engine.buildings.some((b) => b.type === 'def_radar');
        const hasSam = engine.buildings.some((b) => b.type === 'def_sam_battery');
        if (hasRadar && hasSam) {
          advanceStep();
        }
      } else if (currentStep === 6) {
        // Step 6: Spawn training threat once
        if (!trainingThreatSpawned) {
          setTrainingThreatSpawned(true);
          engine.threatSystem.spawnScriptedTrainingThreat(
            engine.buildings,
            (entry) => engine.log(entry.type, entry.message)
          );
        }
        // Advance when threat is intercepted
        if (
          trainingThreatSpawned &&
          engine.threatSystem.activeThreats.length === 0 &&
          engine.combatLogs.some((l) => l.type === 'SUCCESS')
        ) {
          advanceStep();
        }
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [currentStep, isDismissed, trainingThreatSpawned, engine]);

  const advanceStep = () => {
    setCurrentStep((prev) => {
      const next = (Math.min(8, prev + 1)) as TutorialStep;
      localStorage.setItem(TUTORIAL_STORAGE_KEY, next.toString());
      soundManager.playMissionSuccess();
      return next;
    });
  };

  const handleSkip = () => {
    soundManager.playClick();
    setCurrentStep(8);
    localStorage.setItem(TUTORIAL_STORAGE_KEY, '8');
    setIsDismissed(true);
  };

  const handleResetTutorial = () => {
    soundManager.playClick();
    setCurrentStep(1);
    setTrainingThreatSpawned(false);
    setIsDismissed(false);
    localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
  };

  if (isDismissed || currentStep >= 8) {
    return (
      <button
        onClick={handleResetTutorial}
        className="fixed top-14 left-4 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-slate-400 hover:text-cyan-400 border border-slate-800 text-[10px] font-mono transition-all"
        title="Replay Field Commander Tutorial"
      >
        <RotateCcw className="w-3 h-3" />
        <span>REPLAY TUTORIAL</span>
      </button>
    );
  }

  const stepsInfo = (({
    1: {
      title: 'STEP 1: SURVEY THE SECTOR',
      icon: <Compass className="w-4 h-4 text-cyan-400" />,
      desc: 'Use W, A, S, D or Arrow keys to pan the camera across the valley. Rotate camera view with Right-Click + Drag, and zoom with Mouse Scroll Wheel.',
      action: 'Pan & orbit the camera to get familiar with your region.',
      buttonText: 'I UNDERSTAND — NEXT STEP',
    },
    2: {
      title: 'STEP 2: ROAD NETWORK CONSTRUCTION',
      icon: <Navigation className="w-4 h-4 text-cyan-400" />,
      desc: 'Select "Roads & Bridges" from the bottom dock. Click on an existing road to snap a start node, move your cursor along the terrain, and click to commit the connection.',
      action: 'Construct a new connected road segment.',
      buttonText: null,
    },
    3: {
      title: 'STEP 3: CITIZEN ZONING & HOUSING',
      icon: <Home className="w-4 h-4 text-cyan-400" />,
      desc: 'Cities require citizens to generate tax revenue. Select "Residential" from the bottom menu and place Suburban Homes near your road network. Press R to rotate the preview.',
      action: 'Construct Suburban Homes or Townhouses.',
      buttonText: null,
    },
    4: {
      title: 'STEP 4: ENERGY & WATER UTILITIES',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
      desc: 'Buildings require electric power and clean water to remain operational. Under "Utilities", place a Photovoltaic Solar Farm to supply clean energy.',
      action: 'Construct a Solar Farm or Power Plant.',
      buttonText: null,
    },
    5: {
      title: 'STEP 5: AIR DEFENSE NETWORK',
      icon: <Radar className="w-4 h-4 text-cyan-400" />,
      desc: 'Hostile forces in Sector Charlie launch drone incursions. Open "Air Defense" and construct an Early Warning Radar and a Patriot SAM Battery.',
      action: 'Construct an Early Warning Radar and a SAM Battery.',
      buttonText: null,
    },
    6: {
      title: 'STEP 6: LIVE INTERCEPTION DRILL',
      icon: <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />,
      desc: 'A training target drone has been launched from the western sector. Watch your radar station acquire the track, while your SAM battery aims and launches an interceptor missile!',
      action: 'Observe automated threat tracking and missile interception.',
      buttonText: null,
    },
    7: {
      title: 'STEP 7: OFFENSIVE OPERATIONS',
      icon: <Crosshair className="w-4 h-4 text-red-400" />,
      desc: 'Build a Joint Tactical Airbase to deploy 5th-gen stealth fighters. Open "MILITARY OPS" from the top bar to launch reconnaissance flights and airstrikes against enemy depots.',
      action: 'Click "Open Military Ops" to review strike missions.',
      buttonText: 'OPEN MILITARY OPS & FINISH',
    },
  } as Record<number, { title: string; icon: React.ReactNode; desc: string; action: string; buttonText: string | null }>)[currentStep]) || {
    title: 'FIELD OPERATIONS READY',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    desc: 'You have mastered city construction, utilities, and tactical air defense.',
    action: 'Continue building and defending your sector!',
    buttonText: null,
  };

  return (
    <div className="fixed top-14 left-4 z-20 w-84 max-w-[90vw] bg-slate-950/95 backdrop-blur-md rounded-2xl border border-cyan-500/40 shadow-2xl p-3.5 text-xs font-mono select-none pointer-events-auto animate-fade-in">
      {/* Step Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {stepsInfo.icon}
          <div>
            <span className="text-[10px] text-cyan-400 font-bold block">
              FIELD COMMANDER ONBOARDING ({currentStep}/7)
            </span>
            <span className="font-display font-bold text-slate-100 text-xs">
              {stepsInfo.title}
            </span>
          </div>
        </div>
        <button
          onClick={handleSkip}
          className="text-slate-400 hover:text-white p-1"
          title="Skip Tutorial"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Step Description */}
      <div className="my-2.5 space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
        <p>{stepsInfo.desc}</p>
        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-[10px] text-cyan-300 flex items-start gap-1.5 font-sans">
          <span className="text-cyan-400 font-bold font-mono">OBJECTIVE:</span>
          <span>{stepsInfo.action}</span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mb-2.5">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
          style={{ width: `${(currentStep / 7) * 100}%` }}
        />
      </div>

      {/* Action / Next Button (if applicable) */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={handleSkip}
          className="text-[10px] text-slate-500 hover:text-slate-300"
        >
          Skip Tutorial
        </button>

        {stepsInfo.buttonText && (
          <button
            onClick={() => {
              if (currentStep === 7) {
                onOpenMilitary?.();
                advanceStep();
              } else {
                advanceStep();
              }
            }}
            className="flex items-center gap-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-xl transition-all shadow-md shadow-cyan-600/30"
          >
            <span>{stepsInfo.buttonText}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
