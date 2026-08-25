// ============================================================================
// Propeller / Rotor Performance Polars & Advance Ratio (J) Sweep Component
// Plots eta(J), CT(J), CP(J), T(V_inf), and P(V_inf) across the flight envelope.
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { RotorBEMResults } from './bemTypes';
import { FullscreenGraphButton } from '../../telemetry/FullscreenGraphButton';

interface PerformanceCurvesCanvasProps {
  results: RotorBEMResults;
}

export const PerformanceCurvesCanvas: React.FC<PerformanceCurvesCanvasProps> = ({ results }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [curveMode, setCurveMode] = useState<'coeffs_efficiency' | 'thrust_power_speed'>('coeffs_efficiency');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, w, h);

    const padLeft = 60;
    const padRight = 35;
    const padTop = 30;
    const padBottom = 35;

    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Grid
    ctx.strokeStyle = '#121a2c';
    ctx.lineWidth = 1;
    for (let x = padLeft; x <= w - padRight; x += plotW / 10) {
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, h - padBottom);
      ctx.stroke();
    }
    for (let y = padTop; y <= h - padBottom; y += plotH / 5) {
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();
    }

    const sweep = results.advanceRatioSweep;
    if (!sweep || sweep.length < 2) return;

    const maxJ = Math.max(1.2, ...sweep.map((p) => p.J));
    const scaleX = (j: number) => padLeft + (j / maxJ) * plotW;

    if (curveMode === 'coeffs_efficiency') {
      // 1. Efficiency eta(J) on 0..1 scale (Emerald)
      const scaleYEta = (eta: number) => padTop + (1 - Math.max(0, Math.min(1, eta))) * plotH;

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      sweep.forEach((pt, i) => {
        const x = scaleX(pt.J);
        const y = scaleYEta(pt.efficiency);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // 2. Thrust Coefficient CT(J) (Cyan)
      const maxCT = Math.max(0.15, ...sweep.map((p) => p.CT)) * 1.2;
      const scaleYCT = (ct: number) => padTop + (1 - Math.max(0, ct) / maxCT) * plotH;

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      sweep.forEach((pt, i) => {
        const x = scaleX(pt.J);
        const y = scaleYCT(pt.CT);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // 3. Power Coefficient CP(J) (Amber Dashed)
      const maxCP = Math.max(0.1, ...sweep.map((p) => p.CP)) * 1.2;
      const scaleYCP = (cp: number) => padTop + (1 - Math.max(0, cp) / maxCP) * plotH;

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.0;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      sweep.forEach((pt, i) => {
        const x = scaleX(pt.J);
        const y = scaleYCP(pt.CP);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Current Operating Point Marker
      const curJ = results.advanceRatio_J;
      if (curJ <= maxJ) {
        const curX = scaleX(curJ);
        const curY = scaleYEta(results.propulsiveEfficiency);

        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(curX, padTop);
        ctx.lineTo(curX, h - padBottom);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(curX, curY, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ec4899';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`Текущая точка: J=${curJ.toFixed(2)}, η=${(results.propulsiveEfficiency * 100).toFixed(0)}%`, curX + 8, curY - 8);
      }

      // Axis Ticks
      ctx.fillStyle = '#10b981';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      [0, 0.25, 0.5, 0.75, 1.0].forEach((eta) => {
        ctx.fillText(`${(eta * 100).toFixed(0)}%`, padLeft - 6, scaleYEta(eta) + 3);
      });

      // Legends
      ctx.textAlign = 'left';
      ctx.fillStyle = '#10b981';
      ctx.fillText('— Пропульсивный КПД η(J)', padLeft + 15, padTop + 14);

      ctx.fillStyle = '#38bdf8';
      ctx.fillText('— Коэффициент тяги C_T(J)', padLeft + 200, padTop + 14);

      ctx.fillStyle = '#f59e0b';
      ctx.fillText('--- Коэффициент мощности C_P(J)', padLeft + 390, padTop + 14);
    } else {
      // Plot Thrust T(N) & Power P(kW)
      const maxThrust = Math.max(10, ...sweep.map((p) => p.thrustNewtons)) * 1.15;
      const maxPower = Math.max(100, ...sweep.map((p) => p.powerWatts)) * 1.15;

      const scaleYT = (t: number) => padTop + (1 - Math.max(0, t) / maxThrust) * plotH;
      const scaleYP = (p: number) => padTop + (1 - Math.max(0, p) / maxPower) * plotH;

      // Thrust Curve (Cyan)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      sweep.forEach((pt, i) => {
        const x = scaleX(pt.J);
        const y = scaleYT(pt.thrustNewtons);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Power Curve (Rose)
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      sweep.forEach((pt, i) => {
        const x = scaleX(pt.J);
        const y = scaleYP(pt.powerWatts);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.fillStyle = '#06b6d4';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      [0, maxThrust * 0.5, maxThrust].forEach((t) => {
        ctx.fillText(`${t.toFixed(0)} Н`, padLeft - 6, scaleYT(t) + 3);
      });

      ctx.textAlign = 'left';
      ctx.fillStyle = '#06b6d4';
      ctx.fillText('— Тяга винта T(J) [Н]', padLeft + 15, padTop + 14);

      ctx.fillStyle = '#f43f5e';
      ctx.fillText(`— Потребная мощность P(J) [макс. ${(maxPower / 1000).toFixed(1)} кВт]`, padLeft + 200, padTop + 14);
    }

    // X-axis ticks
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    [0.0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4].forEach((j) => {
      if (j <= maxJ) {
        ctx.fillText(j.toFixed(1), scaleX(j), h - padBottom + 16);
      }
    });
    ctx.fillText('Относительная поступь винта J = V_inf / (n · D)', padLeft + plotW / 2, h - 4);
  }, [results, curveMode]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-white">
            Поляры Характеристик Винта (Аэродинамическая Сетка $J$)
          </h3>
          <p className="text-[11px] text-slate-400">
            Зависимость пропульсивного КПД $\eta$, коэффициентов тяги $C_T$ и мощности $C_P$ от поступи $J$
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurveMode('coeffs_efficiency')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              curveMode === 'coeffs_efficiency'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            КПД $\eta(J)$ & $C_T, C_P$
          </button>

          <button
            type="button"
            onClick={() => setCurveMode('thrust_power_speed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              curveMode === 'thrust_power_speed'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Тяга $T(J)$ & Мощность $P(J)$
          </button>
        </div>
      </div>

      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
        <canvas
          ref={canvasRef}
          width={900}
          height={260}
          className="w-full h-56 sm:h-64 object-cover block"
        />
        <FullscreenGraphButton
          domain="bem_rotor"
          label="Во весь экран"
          subLabel="Поляры J"
        />
      </div>
    </div>
  );
};
