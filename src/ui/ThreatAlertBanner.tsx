import React from 'react';
import { Threat } from '../types/game';
import { AlertOctagon, ShieldAlert, Crosshair, Eye, CheckCircle2 } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';

interface ThreatAlertBannerProps {
  threats: Threat[];
  onFocusThreat?: (threat: Threat) => void;
}

export const ThreatAlertBanner: React.FC<ThreatAlertBannerProps> = ({ threats, onFocusThreat }) => {
  const activeDetected = threats.filter(
    (t) => t.detected && t.state !== 'IMPACTED'
  );

  if (activeDetected.length === 0) return null;

  const primary = activeDetected[0];
  const isEngaged = primary.state === 'ENGAGED' || primary.interceptorsInFlight > 0;
  const isSplash = primary.state === 'INTERCEPTED';

  const handleFocus = () => {
    soundManager.playClick();
    onFocusThreat?.(primary);
  };

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-auto select-none flex flex-col items-center gap-1 animate-fade-in font-mono">
      <div
        className={`px-4 py-2 rounded-2xl border-2 shadow-2xl flex items-center gap-3.5 backdrop-blur-md ${
          isSplash
            ? 'bg-emerald-950/90 border-emerald-500 shadow-emerald-500/30'
            : isEngaged
            ? 'bg-amber-950/90 border-amber-500 shadow-amber-500/30'
            : 'bg-red-950/90 border-red-500 shadow-red-500/40 animate-pulse'
        }`}
      >
        {isSplash ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        ) : isEngaged ? (
          <Crosshair className="w-5 h-5 text-amber-400 animate-spin" />
        ) : (
          <AlertOctagon className="w-5 h-5 text-red-400 animate-bounce" />
        )}

        <div>
          <div className="font-display font-black text-xs flex items-center gap-2">
            <span
              className={
                isSplash ? 'text-emerald-200' : isEngaged ? 'text-amber-200' : 'text-red-200'
              }
            >
              {isSplash
                ? 'TARGET SPLASH — HOSTILE CONTACT NEUTRALIZED'
                : isEngaged
                ? `INTERCEPTOR LAUNCHED — ENGAGING ${primary.name.toUpperCase()}`
                : `AIR DEFENSE ALERT — INCOMING ${primary.name.toUpperCase()}`}
            </span>
            {activeDetected.length > 1 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-900 text-red-200">
                +{activeDetected.length - 1} MORE
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-300">
            {isSplash
              ? 'Mid-air kinetic kill confirmed by Early Warning Radar.'
              : isEngaged
              ? 'Patriot SAM missile in terminal homing flight.'
              : `Vector: Altitude ${Math.round(primary.altitude)}m • Target: Regional City Sector`}
          </div>
        </div>

        {/* Quick Focus Button */}
        <button
          onClick={handleFocus}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 text-[10px] font-bold transition-colors ml-2"
        >
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>FOCUS</span>
        </button>
      </div>
    </div>
  );
};
