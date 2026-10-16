import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { Compass, Radar } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';

interface MinimapProps {
  engine: GameEngine;
}

export const Minimap: React.FC<MinimapProps> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;

    const renderMinimap = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // 1. Deep Azure Water Background
      ctx.fillStyle = '#1b82c8';
      ctx.fillRect(0, 0, w, h);

      // Map world coordinates [-130..130, -100..100] -> [0..w, 0..h]
      const toMapX = (wx: number) => ((wx + 130) / 260) * w;
      const toMapY = (wz: number) => ((wz + 100) / 200) * h;

      // 2. Draw Green Peninsula & East Bank Landmasses
      ctx.fillStyle = '#5eb84d';
      ctx.beginPath();
      ctx.roundRect(toMapX(-125), toMapY(-95), toMapX(48) - toMapX(-125), toMapY(48) - toMapY(-95), 8);
      ctx.fill();

      // Northern Hills Shading
      ctx.fillStyle = '#47983b';
      ctx.beginPath();
      ctx.arc(toMapX(-65), toMapY(-68), 22, 0, Math.PI * 2);
      ctx.arc(toMapX(-10), toMapY(-75), 18, 0, Math.PI * 2);
      ctx.fill();

      // East Bank Landmass
      ctx.fillStyle = '#5eb84d';
      ctx.beginPath();
      ctx.roundRect(toMapX(74), toMapY(-95), toMapX(128) - toMapX(74), toMapY(25) - toMapY(-95), 6);
      ctx.fill();

      // Two Coastal Lighthouse Islets
      ctx.fillStyle = '#d4c391';
      ctx.beginPath();
      ctx.arc(toMapX(76), toMapY(20), 4, 0, Math.PI * 2);
      ctx.arc(toMapX(72), toMapY(42), 4.5, 0, Math.PI * 2);
      ctx.fill();

      // 3. Draw Connected Road Segments
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.6;
      engine.roadSystem.segments.forEach((seg) => {
        const n1 = engine.roadSystem.nodes.get(seg.startNodeId);
        const n2 = engine.roadSystem.nodes.get(seg.endNodeId);
        if (!n1 || !n2) return;
        ctx.beginPath();
        ctx.moveTo(toMapX(n1.x), toMapY(n1.z));
        ctx.lineTo(toMapX(n2.x), toMapY(n2.z));
        ctx.stroke();
      });

      // 4. Draw Placed Buildings
      for (const b of engine.buildings) {
        if (b.type.startsWith('res_')) ctx.fillStyle = '#f8fafc';
        else if (b.type.startsWith('com_')) ctx.fillStyle = '#38bdf8';
        else if (b.type.startsWith('ind_') || b.type.startsWith('util_')) ctx.fillStyle = '#facc15';
        else if (b.type.startsWith('def_') || b.type.startsWith('mil_')) ctx.fillStyle = '#34d399';
        else ctx.fillStyle = '#e2e8f0';

        const bx = toMapX(b.x);
        const by = toMapY(b.z);
        ctx.fillRect(bx - 2, by - 2, 4, 4);
      }

      // 5. Draw Naval Vessels
      ctx.fillStyle = '#fb923c';
      for (const v of engine.animationSystem.vessels) {
        ctx.fillRect(toMapX(v.x) - 2, toMapY(v.z) - 3, 4, 6);
      }

      // 6. Draw Active Threats (pulsing red dots)
      ctx.fillStyle = '#ef4444';
      for (const t of engine.threatSystem.activeThreats) {
        ctx.beginPath();
        ctx.arc(toMapX(t.x), toMapY(t.z), 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 7. Camera Target Reticle Box
      const camX = toMapX(engine.world.target.x);
      const camY = toMapY(engine.world.target.z);
      const boxW = Math.max(18, Math.min(64, (engine.world.distance / 215) * 44));
      const boxH = boxW * 0.72;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(camX - boxW / 2, camY - boxH / 2, boxW, boxH);

      animId = requestAnimationFrame(renderMinimap);
    };

    animId = requestAnimationFrame(renderMinimap);
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  const handleMapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;

    const worldX = nx * 260 - 130;
    const worldZ = ny * 200 - 100;
    soundManager.playClick();
    engine.world.focusOn(worldX, worldZ, engine.world.distance);
  };

  return (
    <div className="fixed top-16 right-5 z-20 flex flex-col items-end gap-2 select-none pointer-events-auto">
      {/* Compact Minimap Frame */}
      <div className="w-40 h-28 rounded-2xl bg-[#101c2e]/90 backdrop-blur-md p-1.5 border border-white/15 shadow-2xl overflow-hidden">
        <canvas
          ref={canvasRef}
          width={160}
          height={112}
          onClick={handleMapClick}
          className="w-full h-full rounded-xl cursor-pointer block"
          title="Click anywhere on the minimap to move camera"
        />
      </div>

      {/* Quick Map Overlay & Camera Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => {
            soundManager.playClick();
            engine.defenseSystem.showCoverageOverlay = !engine.defenseSystem.showCoverageOverlay;
            engine.onStateUpdate?.();
          }}
          className={`p-2 rounded-xl border backdrop-blur-md shadow-lg transition-colors ${
            engine.defenseSystem.showCoverageOverlay
              ? 'bg-sky-500/30 border-sky-400 text-sky-300'
              : 'bg-[#101c2e]/90 border-white/10 text-slate-300 hover:text-white'
          }`}
          title="Toggle Radar & Air-Defense Coverage Rings"
        >
          <Radar className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            soundManager.playClick();
            engine.world.resetCamera();
          }}
          className="p-2 rounded-xl bg-[#101c2e]/90 hover:bg-[#192b44] border border-white/10 text-slate-300 hover:text-white backdrop-blur-md shadow-lg transition-colors"
          title="Reset Isometric Camera View"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
