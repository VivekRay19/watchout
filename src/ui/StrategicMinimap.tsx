import React, { useRef, useEffect } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { BUILDING_DEFS } from '../data/buildingDefs';
import { soundManager } from '../audio/SoundManager';

interface StrategicMinimapProps {
  engine: GameEngine;
}

export const StrategicMinimap: React.FC<StrategicMinimapProps> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const worldSize = 500; // -250 to +250
  const canvasSize = 180;

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
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear dark tactical radar background
      ctx.fillStyle = '#060c18';
      ctx.fillRect(0, 0, canvasSize, canvasSize);

      // Radar concentric grid rings
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(canvasSize / 2, canvasSize / 2, 40, 0, Math.PI * 2);
      ctx.arc(canvasSize / 2, canvasSize / 2, 75, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(canvasSize / 2, 0);
      ctx.lineTo(canvasSize / 2, canvasSize);
      ctx.moveTo(0, canvasSize / 2);
      ctx.lineTo(canvasSize, canvasSize / 2);
      ctx.stroke();

      // 1. River channel indication
      ctx.strokeStyle = '#1e3a5f';
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let z = -250; z <= 250; z += 20) {
        const rx = Math.sin(z * 0.015) * 45 + z * 0.35;
        const p = worldToCanvas(rx, z);
        if (z === -250) ctx.moveTo(p.cx, p.cy);
        else ctx.lineTo(p.cx, p.cy);
      }
      ctx.stroke();

      // 2. Enemy Sector Charlie (Northwest)
      const enemyPos = worldToCanvas(engine.enemyFaction.basePos.x, engine.enemyFaction.basePos.z);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(enemyPos.cx, enemyPos.cy, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fca5a5';
      ctx.font = '8px monospace';
      ctx.fillText('SECTOR CHARLIE', enemyPos.cx - 24, enemyPos.cy - 12);

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
      ctx.strokeStyle = '#334155';
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

      // 6. Detected Enemy Threats (pulsing red flashing markers)
      engine.threatSystem.activeThreats.forEach((t) => {
        if (!t.detected) return;
        const p = worldToCanvas(t.x, t.z);
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, 3, 0, Math.PI * 2);
        ctx.fill();

        // Direction indicator line
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
      ctx.strokeRect(cam.cx - 5, cam.cy - 5, 10, 10);

      // Radar beam sweep animation
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
  }, [engine]);

  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const { x, z } = canvasToWorld(cx, cy);
    soundManager.playClick();
    engine.world.focusOn(x, z, engine.world.distance);
    engine.onStateUpdate?.();
  };

  return (
    <div className="fixed top-14 right-4 z-20 select-none pointer-events-auto flex flex-col items-end">
      <div className="bg-slate-950/90 backdrop-blur-md p-2 rounded-2xl border border-slate-800/90 shadow-2xl">
        <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 font-bold mb-1.5 px-1">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            STRATEGIC RADAR OVERVIEW
          </span>
          <span className="text-slate-500 text-[9px]">CLICK TO PAN</span>
        </div>
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          onClick={handleMinimapClick}
          className="rounded-xl border border-slate-800/80 cursor-crosshair shadow-inner"
        />
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mt-1 px-1">
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
    </div>
  );
};
