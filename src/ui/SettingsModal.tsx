import React, { useState } from 'react';
import { GameEngine } from '../engine/GameEngine';
import {
  Settings,
  X,
  Volume2,
  Sun,
  Monitor,
  Save,
  Download,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { soundManager } from '../audio/SoundManager';
import { SaveLoadManager } from '../simulation/SaveLoadManager';

interface SettingsModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ engine, onClose }) => {
  const [sfxVol, setSfxVol] = useState(soundManager.getSfxVolume());
  const [ambienceVol, setAmbienceVol] = useState(soundManager.getAmbienceVolume());
  const [quality, setQuality] = useState(engine.settings.graphicsQuality);
  const [timeOfDay, setTimeOfDay] = useState(engine.world.timeOfDay);

  const handleSfxChange = (val: number) => {
    setSfxVol(val);
    soundManager.setSfxVolume(val);
    soundManager.playClick();
    engine.settings.sfxVolume = val;
  };

  const handleAmbienceChange = (val: number) => {
    setAmbienceVol(val);
    soundManager.setAmbienceVolume(val);
    engine.settings.ambienceVolume = val;
  };

  const handleQualityChange = (q: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA') => {
    setQuality(q);
    engine.settings.graphicsQuality = q;
    soundManager.playClick();

    if (q === 'LOW') {
      engine.world.renderer.shadowMap.enabled = false;
      engine.world.sunLight.castShadow = false;
    } else {
      engine.world.renderer.shadowMap.enabled = true;
      engine.world.sunLight.castShadow = true;
    }
  };

  const handleTimeChange = (t: number) => {
    setTimeOfDay(t);
    engine.world.timeOfDay = t;
    engine.settings.timeOfDay = t;
  };

  const handleExportSave = () => {
    soundManager.playClick();
    const json = SaveLoadManager.exportSaveJSON(
      engine.buildings,
      Array.from(engine.roadSystem.nodes.values()),
      Array.from(engine.roadSystem.segments.values()),
      engine.economy.state,
      engine.techTree,
      engine.settings
    );

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `watchout_save_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    engine.log('SUCCESS', 'Game save exported to JSON file.');
  };

  const handleNewGame = () => {
    if (confirm('Start a new game? Any unsaved progress will be cleared.')) {
      SaveLoadManager.clearSave();
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm select-none pointer-events-auto animate-fade-in">
      <div className="bg-slate-950/95 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-800 text-slate-200">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-slate-100 text-base">
                SYSTEM SETTINGS & ENVIRONMENT (v2.1.0)
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                Audio • Graphics Presets • Day/Night • Game Persistence
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

        {/* Settings Body */}
        <div className="p-5 space-y-5 text-xs font-mono">
          {/* Audio Controls */}
          <div className="space-y-3">
            <h3 className="font-display font-semibold text-slate-200 text-xs flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              PROCEDURAL AUDIO & SOUND FX
            </h3>
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 space-y-2.5">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Sound Effects (SAM Launch, Sirens, Explosions):</span>
                  <span>{Math.round(sfxVol * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={sfxVol}
                  onChange={(e) => handleSfxChange(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Ambient Wind & City Noise:</span>
                  <span>{Math.round(ambienceVol * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={ambienceVol}
                  onChange={(e) => handleAmbienceChange(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Time of Day Slider */}
          <div className="space-y-3">
            <h3 className="font-display font-semibold text-slate-200 text-xs flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              SOLAR POSITION & DAY / NIGHT CLOCK
            </h3>
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Time of Day:</span>
                <span className="font-bold text-amber-300">
                  {Math.floor(timeOfDay).toString().padStart(2, '0')}:
                  {Math.floor((timeOfDay - Math.floor(timeOfDay)) * 60)
                    .toString()
                    .padStart(2, '0')}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="0.25"
                value={timeOfDay}
                onChange={(e) => handleTimeChange(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>00:00 (Midnight)</span>
                <span>06:00 (Sunrise)</span>
                <span>12:00 (Noon)</span>
                <span>18:00 (Dusk)</span>
                <span>24:00</span>
              </div>
            </div>
          </div>

          {/* Graphics Presets */}
          <div className="space-y-3">
            <h3 className="font-display font-semibold text-slate-200 text-xs flex items-center gap-2">
              <Monitor className="w-4 h-4 text-blue-400" />
              GRAPHICS QUALITY PRESET
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH', 'ULTRA'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => handleQualityChange(lvl)}
                  className={`py-2 rounded-xl border text-center transition-all ${
                    quality === lvl
                      ? 'bg-cyan-600 border-cyan-400 text-white font-bold shadow-md shadow-cyan-600/30'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Game Persistence */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="font-display font-semibold text-slate-200 text-xs flex items-center gap-2">
              <Save className="w-4 h-4 text-emerald-400" />
              CHECKPOINTS & SAVE DATA
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  engine.saveGame();
                  soundManager.playClick();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold py-2 rounded-xl transition-colors font-mono"
              >
                <Save className="w-3.5 h-3.5" />
                <span>SAVE CHECKPOINT</span>
              </button>
              <button
                onClick={handleExportSave}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-3 rounded-xl border border-slate-700 transition-colors"
                title="Export Save to JSON File"
              >
                <Download className="w-3.5 h-3.5" />
                <span>EXPORT</span>
              </button>
              <button
                onClick={handleNewGame}
                className="flex items-center gap-1.5 bg-red-950/80 hover:bg-red-900 text-red-300 py-2 px-3 rounded-xl border border-red-800/80 transition-colors"
                title="Reset Region and Start Fresh"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESET</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
