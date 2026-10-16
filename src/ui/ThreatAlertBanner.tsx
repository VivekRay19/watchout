import React from 'react';
import { Threat } from '../types/game';
import { ShieldAlert, Crosshair, Eye, CheckCircle2 } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';

interface ThreatAlertBannerProps {
  threats: Threat[];
  onFocusThreat?: (threat: Threat) => void;
}

export const ThreatAlertBanner: React.FC<ThreatAlertBannerProps> = ({ threats, onFocusThreat }) => {
  const activeDetected = threats.filter((t) => t.detected && t.state !== 'IMPACTED');

  if (activeDetected.length === 0) return null;

  const primary = activeDetected[0];
  const isEngaged = primary.state === 'ENGAGED' || primary.interceptorsInFlight > 0;
  const isSplash = primary.state === 'INTERCEPTED';

  const handleFocus = () => {
    soundManager.playClick();
    onFocusThreat?.(primary);
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-auto select-none animate-fade-in">
      <div
        className={`px-4 py-2.5 rounded-2xl border shadow-xl flex items-center gap-3.5 backdrop-blur-md ${
          isSplash
            ? 'bg-emerald-950/90 border-emerald-400/50 text-emerald-100'
            : isEngaged
            ? 'bg-[#101c2e]/95 border-amber-400/50 text-amber-100'
            : 'bg-[#101c2e]/95 border-rose-400/60 text-rose-100'
        }`}
      >
        {isSplash ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        ) : isEngaged ? (
          <Crosshair className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
        ) : (
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
        )}

        <div className="text-xs">
          <div className="font-bold text-white">
            {isSplash
              ? 'Target Intercepted'
              : isEngaged
              ? `Interceptor Engaging ${primary.name}`
              : `Incoming Threat: ${primary.name}`}
          </div>
          <div className="text-[11px] text-slate-300">
            {isSplash
              ? 'Airspace clear.'
              : isEngaged
              ? 'SAM battery tracking and firing.'
              : `Detected by radar • Altitude ${Math.round(primary.altitude)}m`}
          </div>
        </div>

        <button
          onClick={handleFocus}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
        >
          <Eye className="w-3.5 h-3.5 text-sky-400" />
          <span>View</span>
        </button>
      </div>
    </div>
  );
};
