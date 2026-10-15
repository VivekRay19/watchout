import React, { useRef, useEffect, useState } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { BUILDING_DEFS } from '../data/buildingDefs';
import { soundManager } from '../audio/SoundManager';
import { ChevronDown, ChevronUp, Radar } from 'lucide-react';

interface StrategicMinimapProps {
  engine: GameEngine;
}

export const StrategicMinimap: React.FC<StrategicMinimapProps> = ({ engine }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const worldSize = 500;
  const canvasSize = 170;

  const worldToCanvas = (x: number, z: number) => {
    const cx = ((x + 250) / worldSize) * canvasSize;
    const cy = ((z + 250) / worldSize) * canvasSize;
    return { cx, cy };
  };

  const canvasToWorld = (cx: number, cy: number) => {
    const x = (cx / canvasSize) * worldSize - 250;
    const z = (cy / canvasSize) * worldSize - 250;
    return { x, z };
  };

  useEffect(() => {
    if (!isExpanded) return;
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Dark tactical radar background
      ctx.fillStyle = '#060c18';
      ctx.fillRect(0, 0, canvasSize, canvasSize);

      // Radar concentric range circles
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(canvasSize / 2, canvasSize / 2, 38, 0, Math.PI * 2);
      ctx.arc(canvasSize / 2, canvasSize / 2, 72, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(canvasSize / 2, 0);
      ctx.lineTo(canvasSize / 2, canvasSize);
      ctx.moveTo(0, canvasSize / 2);
      ctx.lineTo(canvasSize, canvasSize / 2);
      ctx.stroke();

      // 1. River channel
      ctx.strokeStyle = '#1e3a5f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let z = -250; z <= 250; z += 20) {
        const rx = Math.sin(z * 0.012) * 55 + z * 0.32;
        const p = worldToCanvas(rx, z);
        if (z === -250) ctx.moveTo(p.cx, p.cy);
        else ctx.lineTo(p.cx, p.cy);
      }
      ctx.stroke();

      // 2. Hostile Sector Charlie (Northwest)
      const enemyPos = worldToCanvas(engine.enemyFaction.basePos.x, engine.enemyFaction.basePos.z);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(enemyPos.cx, enemyPos.cy, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fca5a5';
      ctx.font = '8px monospace';
      ctx.fillText('SECTOR CHARLIE', enemyPos.cx - 24, enemyPos.cy - 10);

      // 3. Radar & SAM Coverage rings
      engine.buildings.forEach((b) => {
        if (!b.active || !b.powered) return;
        const def = BUILDING_DEFS[b.type];
        const range = def.radarRadius || def.defenseRange;
        if (!range) return;

        const p = worldToCanvas(b.x, b.z);
        const radiusCanvas = (range / worldSize) * canvasSize;

        ctx.strokeStyle = def.radarRadius ? 'rgba(6, 182, 212, 0.35)' : 'rgba(16, 185, 129, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, radiusCanvas, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 4. Roads
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      engine.roadSystem.segments.forEach((seg) => {
        const n1 = engine.roadSystem.nodes.get(seg.startNodeId);
        const n2 = engine.roadSystem.nodes.get(seg.endNodeId);
        if (n1 && n2) {
          const p1 = worldToCanvas(n1.x, n1.z);
          const p2 = worldToCanvas(n2.x, n2.z);
          ctx.beginPath();
          ctx.moveTo(p1.cx, p1.cy);
          ctx.lineTo(p2.cx, p2.cy);
          ctx.stroke();
        }
      });

      // 5. Friendly City Buildings
      engine.buildings.forEach((b) => {
        const p = worldToCanvas(b.x, b.z);
        ctx.fillStyle = b.health < b.maxHealth ? '#f59e0b' : '#38bdf8';
        ctx.fillRect(p.cx - 1.5, p.cy - 1.5, 3, 3);
      });

      // 6. Detected Enemy Threats (Flashing Red Blips)
      engine.threatSystem.activeThreats.forEach((t) => {
        if (!t.detected || t.state === 'INTERCEPTED' || t.state === 'IMPACTED') return;
        const p = worldToCanvas(t.x, t.z);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.cx, p.cy);
        ctx.lineTo(p.cx + Math.sin(t.heading) * 6, p.cy + Math.cos(t.heading) * 6);
        ctx.stroke();
      });

      // 7. Camera Viewport & Focus Point
      const cam = worldToCanvas(engine.world.target.x, engine.world.target.z);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cam.cx - 4.5, cam.cy - 4.5, 9, 9);

      // Radar sweep beam animation
      const now = Date.now() * 0.002;
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(canvasSize / 2, canvasSize / 2);
      ctx.lineTo(
        canvasSize / 2 + Math.cos(now) * (canvasSize / 2),
        canvasSize / 2 + Math.sin(now) * (canvasSize / 2)
      );
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [engine, isExpanded]);

  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    // Check if clicked near an active threat
    let clickedThreat = false;
    engine.threatSystem.activeThreats.forEach((t) => {
      if (!t.detected) return;
      const p = worldToCanvas(t.x, t.z);
      if (Math.hypot(p.cx - cx, p.cy - cy) < 8) {
        engine.world.focusOn(t.x, t.z, 35);
        clickedThreat = true;
      }
    });

    if (!clickedThreat) {
      const { x, z } = canvasToWorld(cx, cy);
      engine.world.focusOn(x, z, engine.world.distance);
    }

    soundManager.playClick();
    engine.onStateUpdate?.();
  };

  return (
    <div className="fixed top-14 right-4 z-20 select-none pointer-events-auto flex flex-col items-end">
      <div className="bg-slate-950/90 backdrop-blur-md rounded-2xl border border-slate-800/90 shadow-2xl overflow-hidden">
        {/* Toggle Header */}
        <div
          onClick={() => {
            soundManager.playClick();
            setIsExpanded(!isExpanded);
          }}
          className="flex items-center justify-between gap-3 px-3 py-2 cursor-pointer hover:bg-slate-900/60 transition-colors border-b border-slate-800/60"
        >
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 font-bold">
            <Radar className="w-3.5 h-3.5" />
            STRATEGIC RADAR OVERVIEW
          </span>
          <button className="text-slate-400 hover:text-white p-0.5">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Collapsible Canvas Map */}
        {isExpanded && (
          <div className="p-2 animate-fade-in">
            <canvas
              ref={canvasRef}
              width={canvasSize}
              height={canvasSize}
              onClick={handleMinimapClick}
              className="rounded-xl border border-slate-800/80 cursor-crosshair shadow-inner block"
            />
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mt-1.5 px-1">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" /> City
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Defense
              </span>
              <span className="flex items-center gap-1 text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> Enemy
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
