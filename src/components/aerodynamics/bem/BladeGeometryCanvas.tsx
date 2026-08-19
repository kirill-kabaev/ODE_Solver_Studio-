// ============================================================================
// Blade Geometry & Lofting Visualizer (2D Planform & Cross-Section Canvas)
// Displays chord distribution c(r), twist distribution theta(r), and airfoil geometry.
// ============================================================================

import React, { useEffect, useRef } from 'react';
import { RotorGeometryConfig } from './bemTypes';
import { AIRFOIL_POLARS } from './bemSolver';

interface BladeGeometryCanvasProps {
  config: RotorGeometryConfig;
}

export const BladeGeometryCanvas: React.FC<BladeGeometryCanvasProps> = ({ config }) => {
  const planformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const airfoilCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const polar = AIRFOIL_POLARS[config.airfoilType] || AIRFOIL_POLARS.Clark_Y;

  // Draw 2D Blade Planform (Chords & Twist along Radius)
  useEffect(() => {
    const canvas = planformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dark Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    const padLeft = 45;
    const padRight = 30;
    const padTop = 25;
    const padBottom = 30;

    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Grid
    ctx.strokeStyle = '#151d2f';
    ctx.lineWidth = 1;
    for (let x = padLeft; x <= w - padRight; x += plotW / 8) {
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, h - padBottom);
      ctx.stroke();
    }
    for (let y = padTop; y <= h - padBottom; y += plotH / 4) {
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();
    }

    const R = config.diameterMeters / 2;
    const rHub = config.hubRadiusMeters;
    const cRoot = config.rootChordMeters;
    const cTip = config.tipChordMeters;
    const maxChord = Math.max(cRoot, cTip) * 1.3;

    const scaleX = (r: number) => padLeft + ((r - rHub) / (R - rHub)) * plotW;
    const scaleYChord = (c: number) => padTop + plotH * 0.45 - (c / maxChord) * (plotH * 0.4);
    const scaleYTwist = (deg: number) => padTop + plotH - (deg / 45) * (plotH * 0.45);

    // 1. Draw Blade Planform Shape (Top View Outline)
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.0;
    ctx.beginPath();

    const numPts = 30;
    // Leading Edge
    for (let i = 0; i <= numPts; i++) {
      const eta = i / numPts;
      const r = rHub + eta * (R - rHub);
      const c = cRoot + (cTip - cRoot) * Math.pow(eta, 0.85);
      const x = scaleX(r);
      const yLE = padTop + plotH * 0.25 - (c * 0.35 / maxChord) * (plotH * 0.4);
      if (i === 0) ctx.moveTo(x, yLE);
      else ctx.lineTo(x, yLE);
    }
    // Trailing Edge (backwards)
    for (let i = numPts; i >= 0; i--) {
      const eta = i / numPts;
      const r = rHub + eta * (R - rHub);
      const c = cRoot + (cTip - cRoot) * Math.pow(eta, 0.85);
      const x = scaleX(r);
      const yTE = padTop + plotH * 0.25 + (c * 0.65 / maxChord) * (plotH * 0.4);
      ctx.lineTo(x, yTE);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Draw Twist Distribution theta(r) Curve (Amber Line)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= numPts; i++) {
      const eta = i / numPts;
      const r = rHub + eta * (R - rHub);
      const twist = config.rootTwistDeg + (config.tipTwistDeg - config.rootTwistDeg) * eta;
      const x = scaleX(r);
      const y = scaleYTwist(twist);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Legend & Axis Labels
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('— Хорда лопасти c(r) [м]', padLeft + 10, padTop + 14);

    ctx.fillStyle = '#f59e0b';
    ctx.fillText('— Крутка сечения θ(r) [°]', padLeft + 160, padTop + 14);

    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    [0.2, 0.4, 0.6, 0.8, 1.0].forEach((eta) => {
      const r = rHub + eta * (R - rHub);
      ctx.fillText(`r/R=${eta.toFixed(1)}`, scaleX(r), h - padBottom + 16);
    });
  }, [config]);

  // Draw 2D Airfoil Cross-Section (NACA/Clark-Y)
  useEffect(() => {
    const canvas = airfoilCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    const padLeft = 35;
    const padRight = 35;
    const padTop = 20;
    const padBottom = 25;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    const scaleX = (x: number) => padLeft + x * plotW;
    const scaleY = (y: number) => padTop + plotH * 0.5 - y * plotH * 1.6;

    // Centerline Chord
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop + plotH * 0.5);
    ctx.lineTo(w - padRight, padTop + plotH * 0.5);
    ctx.stroke();
    ctx.setLineDash([]);

    // Parametric 4-digit / Cambered Airfoil Coordinate Generator
    const numPts = 60;
    const upper: { x: number; y: number }[] = [];
    const lower: { x: number; y: number }[] = [];

    const t = polar.thicknessRatio;
    const m = polar.cl0 > 0.4 ? 0.04 : 0.02; // max camber
    const p = 0.4; // location of max camber

    for (let i = 0; i <= numPts; i++) {
      const x = i / numPts;
      // Thickness distribution
      const yt =
        5 *
        t *
        (0.2969 * Math.sqrt(Math.max(0, x)) -
          0.126 * x -
          0.3516 * x * x +
          0.2843 * Math.pow(x, 3) -
          0.1015 * Math.pow(x, 4));

      // Mean camber line
      let yc = 0;
      let dyc_dx = 0;
      if (x < p) {
        yc = (m / (p * p)) * (2 * p * x - x * x);
        dyc_dx = ((2 * m) / (p * p)) * (p - x);
      } else {
        yc = (m / Math.pow(1 - p, 2)) * (1 - 2 * p + 2 * p * x - x * x);
        dyc_dx = ((2 * m) / Math.pow(1 - p, 2)) * (p - x);
      }

      const theta = Math.atan(dyc_dx);
      upper.push({ x: x - yt * Math.sin(theta), y: yc + yt * Math.cos(theta) });
      lower.push({ x: x + yt * Math.sin(theta), y: yc - yt * Math.cos(theta) });
    }

    // Fill Airfoil Solid
    ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    upper.forEach((pt, i) => {
      const sx = scaleX(pt.x);
      const sy = scaleY(pt.y);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    for (let i = lower.length - 1; i >= 0; i--) {
      const pt = lower[i];
      ctx.lineTo(scaleX(pt.x), scaleY(pt.y));
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${polar.name} (t/c = ${(polar.thicknessRatio * 100).toFixed(1)}%)`, padLeft, padTop + 14);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.fillText(`Cl_max = ${polar.clMax.toFixed(2)} | α_stall = ${polar.alphaStallDeg}°`, padLeft, padTop + 28);
  }, [polar]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Planform & Twist Distribution Canvas */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white">Геометрия Лопасти в Плане (Planform & Twist)</span>
          <span className="text-[10px] font-mono text-cyan-400">
            Хорда: {(config.rootChordMeters * 1000).toFixed(0)}→{(config.tipChordMeters * 1000).toFixed(0)} мм
          </span>
        </div>
        <canvas
          ref={planformCanvasRef}
          width={450}
          height={200}
          className="w-full h-44 rounded-xl block object-cover"
        />
      </div>

      {/* Aerodynamic Airfoil Profile Cross-Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white">Аэродинамический Профиль Лопасти</span>
          <span className="text-[10px] font-mono text-purple-400">
            {config.airfoilType}
          </span>
        </div>
        <canvas
          ref={airfoilCanvasRef}
          width={450}
          height={200}
          className="w-full h-44 rounded-xl block object-cover"
        />
      </div>
    </div>
  );
};
