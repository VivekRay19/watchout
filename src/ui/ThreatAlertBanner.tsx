import React from 'react';
import { Threat } from '../types/game';
import { AlertOctagon, ShieldAlert, Crosshair } from 'lucide-react';

interface ThreatAlertBannerProps {
  threats: Threat[];
}

export const ThreatAlertBanner: React.FC<ThreatAlertBannerProps> = ({ threats }) => {
  const detectedThreats = threats.filter((t) => t.detected);
  if (detectedThreats.length === 0) return null;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none flex flex-col items-center gap-1 animate-bounce">
      <div className="bg-red-950/90 backdrop-blur-md px-4 py-2 rounded-2xl border-2 border-red-500 shadow-2xl shadow-red-600/40 flex items-center gap-3">
        <AlertOctagon className="w-5 h-5 text-red-400 animate-pulse" />
        <div>
          <div className="font-display font-black text-red-200 tracking-wider text-xs flex items-center gap-2">
            AIR DEFENSE ALERT: {detectedThreats.length} INCOMING HOSTILE CONTACTS!
          </div>
          <div className="font-mono text-[10px] text-red-300">
            {detectedThreats.map((t) => t.name).join(' • ')} — SAM BATTERIES TRACKING
          </div>
        </div>
        <ShieldAlert className="w-5 h-5 text-red-400 animate-spin" />
      </div>
    </div>
  );
};
