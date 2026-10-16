import React from 'react';
import { CombatLogEntry } from '../types/game';
import { ScrollText } from 'lucide-react';

interface CombatLogProps {
  logs: CombatLogEntry[];
}

export const CombatLog: React.FC<CombatLogProps> = ({ logs }) => {
  const getTypeStyle = (type: CombatLogEntry['type']) => {
    switch (type) {
      case 'SUCCESS':
        return 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30';
      case 'DANGER':
        return 'text-rose-300 bg-rose-500/15 border-rose-500/30';
      case 'ALERT':
        return 'text-amber-300 bg-amber-500/15 border-amber-500/30';
      case 'WARNING':
        return 'text-yellow-300 bg-yellow-500/15 border-yellow-500/30';
      case 'INFO':
      default:
        return 'text-slate-200 bg-slate-800/60 border-white/10';
    }
  };

  return (
    <div className="fixed top-20 right-5 z-20 w-80 max-w-[90vw] select-none pointer-events-auto animate-fade-in">
      <div className="bg-[#101c2e]/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="px-4 py-2.5 bg-white/5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <ScrollText className="w-4 h-4 text-sky-400" />
            <span>Defense & Event Log</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-medium">
            {logs.length}
          </span>
        </div>

        <div className="p-3 space-y-2 max-h-64 overflow-y-auto text-xs">
          {logs.length === 0 ? (
            <div className="text-slate-400 text-center py-3">
              All sectors peaceful. No alerts recorded.
            </div>
          ) : (
            logs.slice(0, 15).map((log) => (
              <div
                key={log.id}
                className={`p-2.5 rounded-xl border leading-snug ${getTypeStyle(log.type)}`}
              >
                <div className="flex items-center justify-between text-[10px] opacity-75 mb-0.5">
                  <span className="font-semibold">{log.type}</span>
                  <span>{log.timestamp}</span>
                </div>
                <div>{log.message}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
