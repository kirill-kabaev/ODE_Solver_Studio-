// ============================================================================
// Radial Distribution Charts Component (Spanwise Blade Loadings)
// Plots dT/dr, dQ/dr, Cl(r), Alpha(r), Induction factors a(r), and Prandtl losses F(r).
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { RotorBEMResults } from './bemTypes';
import { FullscreenGraphButton } from '../../telemetry/FullscreenGraphButton';

interface RadialPlotsCanvasProps {
  results: RotorBEMResults;
}

export const RadialPlotsCanvas: React.FC<RadialPlotsCanvasProps> = ({ results }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activePlot, setActivePlot] = useState<'thrust_torque' | 'aero_cl_alpha' | 'induction_loss'>('thrust_torque');
  const [hoverStation, setHoverStation] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dark background
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, w, h);

    const padLeft = 60;
    const padRight = 35;
    const padTop = 30;
    const padBottom = 35;

    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Draw Grid
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

    const elements = results.elements;
    if (!elements || elements.length < 2) return;

    const scaleX = (rNorm: number) => padLeft + rNorm * plotW;

    if (activePlot === 'thrust_torque') {
      // Plot 1: dT/dr (N/m) on primary axis, dQ/dr (N*m/m) on secondary
      const maxThrust = Math.max(10, ...elements.map((e) => e.dThrust_dr)) * 1.15;
      const maxTorque = Math.max(0.1, ...elements.map((e) => e.dTorque_dr)) * 1.15;

      const scaleYThrust = (v: number) => padTop + (1 - v / maxThrust) * plotH;
      const scaleYTorque = (v: number) => padTop + (1 - v / maxTorque) * plotH;

      // Draw Thrust Curve (Cyan)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      elements.forEach((e, i) => {
        const x = scaleX(e.rNormalized);
        const y = scaleYThrust(e.dThrust_dr);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Data Points
      elements.forEach((e) => {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(scaleX(e.rNormalized), scaleYThrust(e.dThrust_dr), 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Torque Curve (Rose)
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      elements.forEach((e, i) => {
        const x = scaleX(e.rNormalized);
        const y = scaleYTorque(e.dTorque_dr);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Axis Ticks
      ctx.fillStyle = '#38bdf8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      [0, maxThrust * 0.5, maxThrust].forEach((v) => {
        ctx.fillText(`${v.toFixed(0)} Н/м`, padLeft - 6, scaleYThrust(v) + 3);
      });

      // Legends
      ctx.textAlign = 'left';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('— Погонная тяга dT/dr [Н/м]', padLeft + 15, padTop + 14);

      ctx.fillStyle = '#f43f5e';
      ctx.fillText('— Погонный крутящий момент dQ/dr [Н·м/м]', padLeft + 230, padTop + 14);
    } else if (activePlot === 'aero_cl_alpha') {
      // Plot 2: Section Lift Cl & Angle of attack Alpha (deg)
      const maxCl = 1.8;
      const maxAlpha = 20;

      const scaleYCl = (v: number) => padTop + (1 - v / maxCl) * plotH;
      const scaleYAlpha = (v: number) => padTop + (1 - v / maxAlpha) * plotH;

      // Draw Cl (Emerald)
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      elements.forEach((e, i) => {
        const x = scaleX(e.rNormalized);
        const y = scaleYCl(e.cl);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw Alpha (Amber)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      elements.forEach((e, i) => {
        const x = scaleX(e.rNormalized);
        const y = scaleYAlpha(e.angleAttackAlphaDeg);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      [0, 0.8, 1.6].forEach((v) => {
        ctx.fillText(`Cl=${v.toFixed(1)}`, padLeft - 6, scaleYCl(v) + 3);
      });

      ctx.textAlign = 'left';
      ctx.fillStyle = '#10b981';
      ctx.fillText('— Коэффициент подъемной силы сечения c_l(r)', padLeft + 15, padTop + 14);

      ctx.fillStyle = '#f59e0b';
      ctx.fillText('— Угол атаки профиля α(r) [°]', padLeft + 260, padTop + 14);
    } else {
      // Plot 3: Axial induction a, Tangential induction a', and Prandtl loss F
      const scaleY = (v: number) => padTop + (1 - Math.max(0, Math.min(1, v))) * plotH;

      // Draw Prandtl Loss F (Purple)
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      elements.forEach((e, i) => {
        const x = scaleX(e.rNormalized);
        const y = scaleY(e.totalPrandtlLoss_F);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw Axial Induction a (Cyan)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      elements.forEach((e, i) => {
        const x = scaleX(e.rNormalized);
        const y = scaleY(e.axialInduction_a);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw Tangential Induction a' (Rose)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      elements.forEach((e, i) => {
        const x = scaleX(e.rNormalized);
        const y = scaleY(e.angularInduction_aPrime);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      [0.0, 0.25, 0.5, 0.75, 1.0].forEach((v) => {
        ctx.fillText(v.toFixed(2), padLeft - 6, scaleY(v) + 3);
      });

      ctx.textAlign = 'left';
      ctx.fillStyle = '#a855f7';
      ctx.fillText('— Фактор концевых потерь Прандтля F(r)', padLeft + 15, padTop + 14);

      ctx.fillStyle = '#06b6d4';
      ctx.fillText('— Осевая индукция a(r)', padLeft + 240, padTop + 14);

      ctx.fillStyle = '#ec4899';
      ctx.fillText('— Тангенциальная индукция a\'(r)', padLeft + 410, padTop + 14);
    }

    // X-axis ticks
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    [0.0, 0.2, 0.4, 0.6, 0.8, 1.0].forEach((eta) => {
      ctx.fillText(eta === 0 ? '0 (Втулка)' : eta === 1 ? '1.0 (Законцовка)' : eta.toFixed(1), scaleX(eta), h - padBottom + 16);
    });
    ctx.fillText('Относительный радиус лопасти r / R', padLeft + plotW / 2, h - 4);
  }, [results, activePlot]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
      {/* Header & Graph Mode Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-white">
            Радиальное Распределение Аэродинамических Параметров
          </h3>
          <p className="text-[11px] text-slate-400">
            Детализация сил, индуктивных коэффициентов и потерь по сечениям лопасти от втулки до законцовки
          </p>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActivePlot('thrust_torque')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
              activePlot === 'thrust_torque'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Тяга dT & Момент dQ
          </button>

          <button
            type="button"
            onClick={() => setActivePlot('aero_cl_alpha')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
              activePlot === 'aero_cl_alpha'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Коэф. $c_l(r)$ & Угол $\alpha(r)$
          </button>

          <button
            type="button"
            onClick={() => setActivePlot('induction_loss')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
              activePlot === 'induction_loss'
                ? 'bg-purple-500 text-white shadow-md font-black'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Индукция $a, a'$ & Потери $F$
          </button>
        </div>
      </div>

      {/* Main Radial Chart Canvas */}
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
          subLabel="Эпюры BEM"
        />
      </div>

      {/* Summary Station Table / Quick Telemetry */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
          <span className="text-slate-400 block text-[10px]">Макс. Погонная Тяга:</span>
          <span className="text-cyan-400 font-bold text-sm">
            {Math.max(...results.elements.map((e) => e.dThrust_dr)).toFixed(1)} Н/м
          </span>
        </div>

        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
          <span className="text-slate-400 block text-[10px]">Макс. Число Маха M_tip:</span>
          <span className={`font-bold text-sm ${results.tipMachNumber > 0.8 ? 'text-rose-400' : 'text-emerald-400'}`}>
            M = {results.tipMachNumber.toFixed(3)}
          </span>
        </div>

        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
          <span className="text-slate-400 block text-[10px]">Коэффициент Тяги $C_T$:</span>
          <span className="text-purple-400 font-bold text-sm">
            {results.thrustCoeff_CT.toFixed(4)}
          </span>
        </div>

        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
          <span className="text-slate-400 block text-[10px]">КПД / Figure of Merit:</span>
          <span className="text-emerald-400 font-bold text-sm">
            {results.advanceRatio_J > 0.05
              ? `η = ${(results.propulsiveEfficiency * 100).toFixed(1)}%`
              : `FM = ${(results.figureOfMerit_FM * 100).toFixed(1)}%`}
          </span>
        </div>
      </div>
    </div>
  );
};
