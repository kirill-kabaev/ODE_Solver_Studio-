import React, { useRef, useEffect } from 'react';
import { Maximize2 } from 'lucide-react';
import { ODESolution } from '../types';

interface MiniSolutionGraphProps {
  solution: ODESolution;
  width?: number;
  height?: number;
  className?: string;
  onClick?: () => void;
}

export const MiniSolutionGraph: React.FC<MiniSolutionGraphProps> = ({
  solution,
  width = 240,
  height = 140,
  className = '',
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    const xMin = solution.plotConfig?.xDomain?.[0] ?? -4;
    const xMax = solution.plotConfig?.xDomain?.[1] ?? 4;
    const yMin = solution.plotConfig?.yDomain?.[0] ?? -4;
    const yMax = solution.plotConfig?.yDomain?.[1] ?? 4;

    const toCanvasX = (x: number) => ((x - xMin) / (xMax - xMin)) * width;
    const toCanvasY = (y: number) => height - ((y - yMin) / (yMax - yMin)) * height;

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    for (let x = Math.ceil(xMin); x <= xMax; x += 2) {
      const cx = toCanvasX(x);
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, height);
    }
    for (let y = Math.ceil(yMin); y <= yMax; y += 2) {
      const cy = toCanvasY(y);
      ctx.moveTo(0, cy);
      ctx.lineTo(width, cy);
    }
    ctx.stroke();

    // Axes
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const cx0 = toCanvasX(0);
    const cy0 = toCanvasY(0);
    if (cx0 >= 0 && cx0 <= width) {
      ctx.moveTo(cx0, 0);
      ctx.lineTo(cx0, height);
    }
    if (cy0 >= 0 && cy0 <= height) {
      ctx.moveTo(0, cy0);
      ctx.lineTo(width, cy0);
    }
    ctx.stroke();

    // Direction Field Slopes (small grid)
    if (solution.plotConfig?.derivativeJs) {
      try {
        const slopeFn = new Function('x', 'y', solution.plotConfig.derivativeJs);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = 1;

        const stepX = (xMax - xMin) / 12;
        const stepY = (yMax - yMin) / 8;

        for (let x = xMin + stepX / 2; x < xMax; x += stepX) {
          for (let y = yMin + stepY / 2; y < yMax; y += stepY) {
            try {
              const dy = slopeFn(x, y);
              if (isNaN(dy) || !isFinite(dy)) continue;

              const angle = Math.atan(dy);
              const segLen = 6;
              const cx = toCanvasX(x);
              const cy = toCanvasY(y);

              const dx = (segLen / 2) * Math.cos(angle);
              const dyCanvas = -(segLen / 2) * Math.sin(angle);

              ctx.beginPath();
              ctx.moveTo(cx - dx, cy - dyCanvas);
              ctx.lineTo(cx + dx, cy + dyCanvas);
              ctx.stroke();
            } catch {}
          }
        }
      } catch {}
    }

    // Family of General Solution Curves
    if (solution.plotConfig?.solutionCurveJs) {
      try {
        const solFn = new Function('x', 'c', solution.plotConfig.solutionCurveJs);
        const cValues = [-3, -1.5, 0, 1.5, 3];

        ctx.lineWidth = 1.2;
        cValues.forEach((c) => {
          ctx.strokeStyle =
            c === 0
              ? 'rgba(56, 189, 248, 0.7)'
              : 'rgba(99, 102, 241, 0.4)';

          ctx.beginPath();
          let started = false;
          const steps = 80;
          for (let i = 0; i <= steps; i++) {
            const x = xMin + (i / steps) * (xMax - xMin);
            try {
              const y = solFn(x, c);
              if (isNaN(y) || !isFinite(y) || y < yMin - 5 || y > yMax + 5) {
                started = false;
                continue;
              }
              const cx = toCanvasX(x);
              const cy = toCanvasY(y);
              if (!started) {
                ctx.moveTo(cx, cy);
                started = true;
              } else {
                ctx.lineTo(cx, cy);
              }
            } catch {
              started = false;
            }
          }
          ctx.stroke();
        });
      } catch {}
    }

    // Particular Cauchy Curve (highlighted emerald)
    if (solution.plotConfig?.particularCurveJs) {
      try {
        const partFn = new Function('x', solution.plotConfig.particularCurveJs);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.2;
        ctx.beginPath();

        let started = false;
        const steps = 100;
        for (let i = 0; i <= steps; i++) {
          const x = xMin + (i / steps) * (xMax - xMin);
          try {
            const y = partFn(x);
            if (isNaN(y) || !isFinite(y) || y < yMin - 10 || y > yMax + 10) {
              started = false;
              continue;
            }
            const cx = toCanvasX(x);
            const cy = toCanvasY(y);
            if (!started) {
              ctx.moveTo(cx, cy);
              started = true;
            } else {
              ctx.lineTo(cx, cy);
            }
          } catch {
            started = false;
          }
        }
        ctx.stroke();
      } catch {}
    }
  }, [solution, width, height]);

  return (
    <div
      onClick={onClick}
      className={`relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 group ${
        onClick ? 'cursor-pointer hover:border-cyan-500/80 hover:shadow-lg hover:shadow-cyan-950/30' : ''
      } ${className}`}
      title={onClick ? 'Нажмите для открытия интерактивного графика на всё окно' : undefined}
    >
      <canvas
        ref={canvasRef}
        style={{ width: `${width}px`, height: `${height}px` }}
        className="block w-full h-full"
      />
      <div className="absolute bottom-1 right-1.5 px-1.5 py-0.5 bg-slate-900/80 rounded text-[9px] font-mono text-cyan-400 border border-slate-800">
        xy-plane
      </div>

      {onClick && (
        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 backdrop-blur-[2px] text-cyan-300 font-semibold text-xs">
          <Maximize2 className="w-4 h-4" />
          <span>Развернуть график</span>
        </div>
      )}
    </div>
  );
};
