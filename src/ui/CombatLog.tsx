import React, { useState } from 'react';
import { CombatLogEntry } from '../types/game';
import { Terminal, ChevronUp, ChevronDown, Bell } from 'lucide-react';

interface CombatLogProps {
  logs: CombatLogEntry[];
}

export const CombatLog: React.FC<CombatLogProps> = ({ logs }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getTypeStyle = (type: CombatLogEntry['type']) => {
    switch (type) {
      case 'SUCCESS':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40';
      case 'DANGER':
        return 'text-red-400 bg-red-950/40 border-red-800/40 animate-pulse';
      case 'ALERT':
        return 'text-amber-400 bg-amber-950/40 border-amber-800/40';
      case 'WARNING':
        return 'text-yellow-400 bg-yellow-950/30 border-yellow-800/40';
      case 'INFO':
      default:
        return 'text-slate-300 bg-slate-900/60 border-slate-800';
    }
  };

  return (
    <div className="fixed bottom-20 left-4 z-20 w-84 max-w-[92vw] select-none pointer-events-auto flex flex-col items-start font-mono text-xs">
      <div className="bg-slate-950/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl overflow-hidden w-full">
        {/* Toggle Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3 py-2 bg-slate-900/60 hover:bg-slate-900 flex items-center justify-between text-slate-300 transition-colors border-b border-slate-800/60"
        >
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-200">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>TACTICAL COMBAT & EVENT LOG</span>
            {logs.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                {logs.length}
              </span>
            )}
          </div>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>

        {/* Logs Stream */}
        <div
          className={`p-2 space-y-1.5 overflow-y-auto transition-all ${
            isExpanded ? 'max-h-60' : 'max-h-24'
          }`}
        >
          {logs.length === 0 ? (
            <div className="text-slate-500 text-[10px] text-center py-2">
              All tactical sectors quiet. No combat events recorded.
            </div>
          ) : (
            logs.slice(0, isExpanded ? 20 : 3).map((log) => (
              <div
                key={log.id}
                className={`p-1.5 rounded-lg border text-[10px] leading-snug ${getTypeStyle(
                  log.type
                )}`}
              >
                <div className="flex items-center justify-between text-[9px] opacity-70 mb-0.5">
                  <span className="font-bold">[{log.type}]</span>
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
