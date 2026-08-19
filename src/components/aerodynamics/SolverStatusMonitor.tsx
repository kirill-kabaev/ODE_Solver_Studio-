import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Sparkles,
  Zap,
  Gauge,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Box,
  Compass,
  Cpu,
  RefreshCw,
  FastForward,
  BookOpen,
  Info,
} from 'lucide-react';
import { MathView, MathText } from '../MathView';
import { Aerodynamic3DData } from './Full3DPlotViewer';
import { HandbookTopicId } from '../EngineeringHandbookModal';

export type SolverStage =
  | 'idle'
  | 'reordering'
  | 'amg_setup'
  | 'gmres_iterations'
  | 'surface_integration'
  | 'mesh_generation'
  | 'completed';

interface SparklineProps {
  data: number[];
  color: string;
  gradientId: string;
  fillColor: string;
  height?: number;
  min?: number;
  max?: number;
  unit?: string;
  showBaseline?: boolean;
}

const Sparkline: React.FC<SparklineProps> = ({
  data,
  color,
  gradientId,
  fillColor,
  height = 32,
  min,
  max,
  unit = '',
  showBaseline = false,
}) => {
  if (!data || data.length < 2) {
    return (
      <div className="h-8 w-full flex items-center justify-between px-2 bg-slate-950/40 rounded-lg border border-dashed border-slate-800/80">
        <span className="text-[9px] font-mono text-slate-500">Поток данных не инициализирован</span>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
      </div>
    );
  }

  const dataMin = min !== undefined ? min : Math.min(...data);
  const dataMax = max !== undefined ? max : Math.max(...data);
  const range = Math.abs(dataMax - dataMin) < 1e-4 ? 1 : dataMax - dataMin;

  const width = 140;
  const padY = 5;
  const innerH = height - padY * 2;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const normY = (val - dataMin) / range;
    const y = height - padY - Math.max(0, Math.min(1, normY)) * innerH;
    return { x, y, val };
  });

  const pathD = `M ${points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`;
  const fillD = `M 0,${height} L ${points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')} L ${width},${height} Z`;

  const lastP = points[points.length - 1];
  const firstP = points[0];
  const delta = lastP.val - firstP.val;

  return (
    <div className="space-y-1">
      <div className="relative h-8 w-full overflow-hidden rounded-lg bg-slate-950/60 p-0.5 border border-slate-800/60">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillColor} stopOpacity="0.45" />
              <stop offset="100%" stopColor={fillColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {showBaseline && dataMin < 0 && dataMax > 0 && (
            <line
              x1="0"
              y1={height - padY - ((0 - dataMin) / range) * innerH}
              x2={width}
              y2={height - padY - ((0 - dataMin) / range) * innerH}
              stroke="#334155"
              strokeDasharray="2,2"
              strokeWidth="0.75"
            />
          )}

          {/* Underfill Area */}
          <path d={fillD} fill={`url(#${gradientId})`} className="transition-all duration-150 ease-out" />

          {/* Main Trajectory Line */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-150 ease-out"
          />

          {/* Animated Glowing Head Dot */}
          <circle
            cx={lastP.x}
            cy={lastP.y}
            r="2.5"
            fill={color}
            className="animate-pulse"
          />
        </svg>
      </div>

      {/* Micro Telemetry Footer */}
      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 px-0.5">
        <span className="truncate">
          min: {dataMin.toFixed(2)} | max: {dataMax.toFixed(2)}
        </span>
        <span className={`font-bold ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {delta >= 0 ? '+' : ''}{delta.toFixed(3)} {unit}
        </span>
      </div>
    </div>
  );
};

interface SolverStatusMonitorProps {
  onSolutionGenerated?: (data: Aerodynamic3DData) => void;
  defaultMach?: number;
  defaultAlpha?: number;
  presetName?: string;
  onOpenCatalog?: () => void;
}

export const SolverStatusMonitor: React.FC<SolverStatusMonitorProps> = ({
  onSolutionGenerated,
  defaultMach = 0.82,
  defaultAlpha = 3.5,
  presetName,
  onOpenCatalog,
}) => {
  // Solver Control State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [solverStage, setSolverStage] = useState<SolverStage>('idle');
  const [currentIteration, setCurrentIteration] = useState<number>(0);
  const maxIterations = 60;
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const iterRef = useRef<number>(0);

  // Keep a stable ref for onSolutionGenerated to avoid restarting effect
  const onSolutionGeneratedRef = useRef(onSolutionGenerated);
  useEffect(() => {
    onSolutionGeneratedRef.current = onSolutionGenerated;
  }, [onSolutionGenerated]);

  // Aerodynamic Input Parameters
  const [mach, setMach] = useState<number>(defaultMach);
  const [alpha, setAlpha] = useState<number>(defaultAlpha);
  const [meshCells, setMeshCells] = useState<number>(45200);
  const [preconditioner, setPreconditioner] = useState<'amg' | 'ilu' | 'jacobi'>('amg');

  // Update parameters safely when external preset changes
  useEffect(() => {
    setMach((prev) => (Math.abs(prev - defaultMach) > 1e-4 ? defaultMach : prev));
    setAlpha((prev) => (Math.abs(prev - defaultAlpha) > 1e-4 ? defaultAlpha : prev));
  }, [defaultMach, defaultAlpha]);

  // Real-time Simulated Forces & Coefficients (Live Streaming Telemetry)
  const [liftCoeff, setLiftCoeff] = useState<number>(0);
  const [dragCoeff, setDragCoeff] = useState<number>(0);
  const [momentCoeff, setMomentCoeff] = useState<number>(0);
  const [liftNewtons, setLiftNewtons] = useState<number>(0); // in kN
  const [dragNewtons, setDragNewtons] = useState<number>(0); // in kN
  const [pitchMomentNm, setPitchMomentNm] = useState<number>(0); // in kN*m
  const [residual, setResidual] = useState<number>(1.0); // ||r|| / ||r0||
  const [cflNumber, setCflNumber] = useState<number>(1.2);
  const [massFluxError, setMassFluxError] = useState<number>(1e-2);

  // Real-time Micro Sparklines Data for Force Cards
  const [sparklines, setSparklines] = useState<{
    lift: number[];
    drag: number[];
    moment: number[];
    efficiency: number[];
  }>({
    lift: [],
    drag: [],
    moment: [],
    efficiency: [],
  });

  // Real-time History Data for Oscilloscope Strip Charts
  const historyRef = useRef<{
    iterations: number[];
    lift: number[];
    drag: number[];
    moment: number[];
    residual: number[];
  }>({
    iterations: [],
    lift: [],
    drag: [],
    moment: [],
    residual: [],
  });

  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const vectorRoseCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Target converged values based on physics
  const isSupersonic = mach > 1.0;
  const isTransonic = mach >= 0.8 && mach <= 1.05;
  const isStall = Math.abs(alpha) > 14.0;

  const targetLiftCoeff = useMemo(() => {
    if (isStall) {
      return Math.sign(alpha) * (0.75 + Math.sin((alpha * Math.PI) / 180) * 0.35);
    }
    const baseCl0 = 0.38; // NACA 4412 camber effect
    const prandtlGlauert = 1.0 / Math.sqrt(Math.max(0.12, Math.abs(1.0 - mach * mach)));
    const cl = baseCl0 + ((2 * Math.PI * (alpha * Math.PI)) / 180) * (isSupersonic ? 0.75 : Math.min(2.1, prandtlGlauert));
    return cl;
  }, [mach, alpha, isStall, isSupersonic]);

  const targetDragCoeff = useMemo(() => {
    const cd0 = 0.014; // Parasite zero-lift drag
    const cdi = (targetLiftCoeff * targetLiftCoeff) / (Math.PI * 0.85 * 8.0); // Induced drag AR=8
    const cdw = isTransonic
      ? Math.pow(Math.max(0, mach - 0.78), 2.5) * 0.45
      : isSupersonic
      ? 0.045 + 0.08 * (mach - 1.0)
      : 0;
    const stallDrag = isStall ? 0.18 * Math.pow(Math.abs(alpha) - 14, 1.4) : 0;
    return cd0 + cdi + cdw + stallDrag;
  }, [mach, alpha, targetLiftCoeff, isTransonic, isSupersonic, isStall]);

  const targetMomentCoeff = useMemo(() => {
    // Pitching moment around 0.25 chord
    const cm0 = -0.055; // Camber contribution
    const dcm_dalpha = -0.012; // Static longitudinal stability (negative is stable)
    const shockShift = isTransonic ? 0.035 * (mach - 0.8) : isSupersonic ? -0.06 : 0;
    return cm0 + dcm_dalpha * alpha + shockShift;
  }, [mach, alpha, isTransonic, isSupersonic]);

  // Reset or initialize solver telemetry state
  const resetSolver = () => {
    iterRef.current = 0;
    setIsRunning(false);
    setSolverStage('idle');
    setCurrentIteration(0);
    setProgressPercent(0);
    setLiftCoeff(0);
    setDragCoeff(0);
    setMomentCoeff(0);
    setLiftNewtons(0);
    setDragNewtons(0);
    setPitchMomentNm(0);
    setResidual(1.0);
    setSparklines({
      lift: [],
      drag: [],
      moment: [],
      efficiency: [],
    });
    historyRef.current = {
      iterations: [],
      lift: [],
      drag: [],
      moment: [],
      residual: [],
    };
  };

  // Start Solver Execution
  const startSolver = () => {
    resetSolver();
    setIsRunning(true);
    setSolverStage('reordering');
  };

  // Solver Iteration Simulation Engine (High-frequency live updates)
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      iterRef.current += 1;
      const nextIter = iterRef.current;
      const frac = Math.min(1, nextIter / maxIterations);
      
      setCurrentIteration(nextIter);
      setProgressPercent(Math.round(frac * 100));

      // Update solver pipeline stages
      if (nextIter <= 6) {
        setSolverStage('reordering');
      } else if (nextIter <= 14) {
        setSolverStage('amg_setup');
      } else if (nextIter <= 50) {
        setSolverStage('gmres_iterations');
      } else if (nextIter <= 58) {
        setSolverStage('surface_integration');
      } else {
        setSolverStage('completed');
      }

      // Realistic convergence noise & physics transition
      // As iterations increase, values approach target with damped harmonic oscillations
      const decay = Math.exp(-nextIter * 0.09);
      const freq = 0.45;
      const noise = (Math.random() - 0.5) * 0.04 * decay;

      const currentCl = targetLiftCoeff * (1 - decay * Math.cos(freq * nextIter)) + noise;
      const currentCd = targetDragCoeff * (1 - decay * Math.cos(freq * nextIter * 1.2)) + Math.abs(noise * 0.4);
      const currentCm = targetMomentCoeff * (1 - decay * Math.cos(freq * nextIter * 0.8)) + noise * 0.5;

      // Realistic dimensional forces (assuming Wing Area S = 28 m², rho = 1.225 kg/m³, V = Mach * 340 m/s)
      const vSound = 340;
      const vVelocity = mach * vSound;
      const qDyn = 0.5 * 1.225 * vVelocity * vVelocity; // Dynamic pressure in Pa
      const wingArea = 28.0; // m²
      const chordMean = 3.5; // m

      const liftN = (currentCl * qDyn * wingArea) / 1000; // in kN
      const dragN = (currentCd * qDyn * wingArea) / 1000; // in kN
      const momentNm = (currentCm * qDyn * wingArea * chordMean) / 1000; // in kN*m

      const currentRes = Math.max(1e-7, Math.pow(10, -Math.min(7, (nextIter / maxIterations) * 7.2)) + (Math.random() * 1e-6));
      const currentCfl = Math.min(8.5, 1.0 + (nextIter / maxIterations) * 7.5);
      const currentMassFlux = Math.max(1e-7, 0.05 * Math.exp(-nextIter * 0.15));

      setLiftCoeff(currentCl);
      setDragCoeff(currentCd);
      setMomentCoeff(currentCm);
      setLiftNewtons(liftN);
      setDragNewtons(dragN);
      setPitchMomentNm(momentNm);
      setResidual(currentRes);
      setCflNumber(currentCfl);
      setMassFluxError(currentMassFlux);

      // Push to history
      historyRef.current.iterations.push(nextIter);
      historyRef.current.lift.push(currentCl);
      historyRef.current.drag.push(currentCd);
      historyRef.current.moment.push(currentCm);
      historyRef.current.residual.push(currentRes);

      // Limit history length
      if (historyRef.current.iterations.length > 70) {
        historyRef.current.iterations.shift();
        historyRef.current.lift.shift();
        historyRef.current.drag.shift();
        historyRef.current.moment.shift();
        historyRef.current.residual.shift();
      }

      // Update sparklines with recent 20 points
      const liftSlice = historyRef.current.lift.slice(-20);
      const dragSlice = historyRef.current.drag.slice(-20);
      const momentSlice = historyRef.current.moment.slice(-20);
      const effSlice = liftSlice.map((lVal, i) => lVal / Math.max(0.001, dragSlice[i]));

      setSparklines({
        lift: liftSlice,
        drag: dragSlice,
        moment: momentSlice,
        efficiency: effSlice,
      });

      // Completion trigger
      if (nextIter >= maxIterations) {
        setIsRunning(false);
        setSolverStage('completed');
        clearInterval(interval);

        // Notify parent asynchronously to avoid React state-in-render collision
        setTimeout(() => {
          onSolutionGeneratedRef.current?.({
            mach,
            alpha,
            liftCoeff: targetLiftCoeff,
            dragCoeff: targetDragCoeff,
            momentCoeff: targetMomentCoeff,
            cellsCount: meshCells,
            iterations: maxIterations,
            timestamp: new Date().toLocaleTimeString(),
            converged: true,
          });
        }, 0);
      }
    }, 85);

    return () => clearInterval(interval);
  }, [isRunning, mach, alpha, targetLiftCoeff, targetDragCoeff, targetMomentCoeff, meshCells]);

  // Strip Chart / Oscilloscope Canvas Render
  useEffect(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Background
    ctx.fillStyle = '#060911';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#141d2e';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const { iterations, lift, drag, moment } = historyRef.current;
    if (iterations.length < 2) {
      // Placeholder baseline before start
      ctx.fillStyle = '#64748b';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Ожидание запуска солвера: нажмите «Запустить CFD Солвер»', w / 2, h / 2);
      return;
    }

    const padLeft = 45;
    const padRight = 15;
    const padTop = 20;
    const padBottom = 25;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Axis scaling
    const maxIter = maxIterations;
    const scaleX = (it: number) => padLeft + (it / maxIter) * plotW;

    // Forces value range
    const valMin = -0.2;
    const valMax = 1.8;
    const scaleY = (v: number) => padTop + (1 - (v - valMin) / (valMax - valMin)) * plotH;

    // Zero baseline
    const y0 = scaleY(0);
    ctx.strokeStyle = '#334155';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, y0);
    ctx.lineTo(w - padRight, y0);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Lift Curve (Cyan)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    lift.forEach((val, i) => {
      const x = scaleX(iterations[i]);
      const y = scaleY(val);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Drag Curve (Amber/Red)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    drag.forEach((val, i) => {
      const x = scaleX(iterations[i]);
      const y = scaleY(val);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Moment Curve (Purple)
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    moment.forEach((val, i) => {
      const x = scaleX(iterations[i]);
      const y = scaleY(val);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Latest Point Pulses
    const lastIdx = iterations.length - 1;
    const lastX = scaleX(iterations[lastIdx]);

    // Lift pulse dot
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(lastX, scaleY(lift[lastIdx]), 4, 0, Math.PI * 2);
    ctx.fill();

    // Drag pulse dot
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(lastX, scaleY(drag[lastIdx]), 4, 0, Math.PI * 2);
    ctx.fill();

    // Y Axis tick labels
    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    [0.0, 0.5, 1.0, 1.5].forEach((tick) => {
      ctx.fillText(tick.toFixed(1), padLeft - 6, scaleY(tick) + 3);
    });

    // X Axis label
    ctx.textAlign = 'center';
    ctx.fillText(`Итерация Krylov GMRES(30): ${iterations[lastIdx]} / ${maxIterations}`, w / 2, h - 6);
  }, [currentIteration, isRunning]);

  // Force Vector Rose 2D Canvas Render
  useEffect(() => {
    const canvas = vectorRoseCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w * 0.48;
    const cy = h * 0.52;

    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h);

    // Circular dial rings
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    [30, 60, 90].forEach((r) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Angle of Attack rotation
    const alphaRad = (-alpha * Math.PI) / 180;

    // Airfoil miniature profile
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(alphaRad);

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = isStall ? '#ef4444' : '#0ea5e9';
    ctx.lineWidth = 2;

    const chord = 90;
    ctx.beginPath();
    const pts = 30;
    for (let p = 0; p <= pts; p++) {
      const xNorm = p / pts;
      const xPos = (xNorm - 0.5) * chord;
      const yt = 0.12 * 5 * (0.2969 * Math.sqrt(xNorm) - 0.126 * xNorm - 0.3516 * xNorm * xNorm);
      const yUpper = -(yt + 0.04 * (1 - xNorm)) * chord;
      if (p === 0) ctx.moveTo(xPos, yUpper);
      else ctx.lineTo(xPos, yUpper);
    }
    for (let p = pts; p >= 0; p--) {
      const xNorm = p / pts;
      const xPos = (xNorm - 0.5) * chord;
      const yt = 0.12 * 5 * (0.2969 * Math.sqrt(xNorm) - 0.126 * xNorm - 0.3516 * xNorm * xNorm);
      const yLower = yt * chord;
      ctx.lineTo(xPos, yLower);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // Draw Vector Arrows from Aerodynamic Center
    const vecScale = 65;

    // 1. Lift Vector (Perpendicular to incoming flow, points UP)
    const lLen = Math.max(5, liftCoeff * vecScale);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - lLen);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx, cy - lLen, 4, 0, Math.PI * 2);
    ctx.fill();

    // 2. Drag Vector (Parallel to incoming flow, points RIGHT)
    const dLen = Math.max(5, dragCoeff * vecScale * 3.5);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + dLen, cy);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(cx + dLen, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 3. Resultant Force Vector R = L + D (Green Vector)
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + dLen, cy - lLen);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(cx + dLen, cy - lLen, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Labels on Canvas
    ctx.font = '9px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`L = ${liftNewtons.toFixed(1)} kN`, cx + 6, cy - lLen + 10);

    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`D = ${dragNewtons.toFixed(1)} kN`, cx + dLen + 4, cy + 12);

    ctx.fillStyle = '#22c55e';
    ctx.fillText(`|R| = ${(Math.sqrt(liftNewtons * liftNewtons + dragNewtons * dragNewtons)).toFixed(1)} kN`, cx + dLen + 4, cy - lLen - 4);
  }, [liftCoeff, dragCoeff, liftNewtons, dragNewtons, alpha, isStall]);

  // Quick Preset Handlers
  const applyPreset = (
    presetMach: number,
    presetAlpha: number,
    presetCells: number
  ) => {
    setMach(presetMach);
    setAlpha(presetAlpha);
    setMeshCells(presetCells);
    resetSolver();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-6 animate-fadeIn">
      {/* 1. Header & Live Status Banner */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>Монитор Состояния Солвера и Аэродинамических Сил</span>
              </h2>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold uppercase border ${
                  isRunning
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500 animate-pulse'
                    : solverStage === 'completed'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isRunning ? '● Вычисление в реальном времени' : solverStage === 'completed' ? '✓ Сходимость достигнута' : 'Ожидание запуска'}
              </span>
              {presetName && (
                <span className="hidden md:inline-flex text-[10px] px-2 py-0.5 rounded-full font-mono bg-indigo-950 text-indigo-300 border border-indigo-700 font-bold">
                  Пресет: {presetName}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Мгновенный вывод аэродинамических сил ($L, D, M_y$) на каждом шаге Krylov GMRES до построения 3D графика
            </p>
          </div>
        </div>

        {/* Action Buttons: Preset Catalog / Run / Pause / Reset */}
        <div className="flex items-center gap-2">
          {onOpenCatalog && (
            <button
              type="button"
              onClick={onOpenCatalog}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
              title="Открыть Каталог Инженерных Пресетов NASA / AGARD"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Каталог Пресетов</span>
            </button>
          )}

          {!isRunning ? (
            <button
              type="button"
              onClick={startSolver}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-950/60 transition-all transform hover:scale-[1.02] cursor-pointer flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Запустить CFD Солвер</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsRunning(false)}
              className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/40 transition-colors cursor-pointer flex items-center gap-2"
            >
              <Pause className="w-4 h-4" />
              <span>Приостановить</span>
            </button>
          )}

          <button
            type="button"
            onClick={resetSolver}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700"
            title="Сбросить все параметры и графики"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Pipeline Progress Bar with 5 Sub-stages */}
      <div className="space-y-2 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-300">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="font-bold">
              {solverStage === 'idle' && 'Готов к запуску: выберите параметры и запустите расчет'}
              {solverStage === 'reordering' && 'Этап 1/5: Симметричная перенумерация матрицы AMD/RCM (Минимизация fill-in)...'}
              {solverStage === 'amg_setup' && 'Этап 2/5: Построение алгебраической сетки AMG V-cycle (Иерархия 4 уровней)...'}
              {solverStage === 'gmres_iterations' && `Этап 3/5: Итерации давления-скорости Krylov GMRES(30) [Итер ${currentIteration}/${maxIterations}]...`}
              {solverStage === 'surface_integration' && 'Этап 4/5: Интегрирование поверхностных сил давления и трения (∮ p n dA)...'}
              {solverStage === 'completed' && 'Этап 5/5: 3D Поле скоростей и изобар давления успешно сгенерировано!'}
            </span>
          </div>
          <span className="font-bold text-cyan-400">{progressPercent}%</span>
        </div>

        {/* Progress Bar Track */}
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 transition-all duration-100 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* 5 Stage Step Indicators */}
        <div className="grid grid-cols-5 gap-1.5 pt-1 text-[10px] font-mono text-slate-400">
          <div className={`p-1 rounded text-center truncate ${currentIteration >= 1 ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-slate-900'}`}>
            1. AMD/RCM
          </div>
          <div className={`p-1 rounded text-center truncate ${currentIteration >= 7 ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-slate-900'}`}>
            2. AMG V-Cycle
          </div>
          <div className={`p-1 rounded text-center truncate ${currentIteration >= 15 ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-slate-900'}`}>
            3. GMRES(30)
          </div>
          <div className={`p-1 rounded text-center truncate ${currentIteration >= 51 ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-slate-900'}`}>
            4. Силы ∮ p dA
          </div>
          <div className={`p-1 rounded text-center truncate ${solverStage === 'completed' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold' : 'bg-slate-900'}`}>
            5. 3D График
          </div>
        </div>
      </div>

      {/* 3. Real-time Simulated Forces High-Impact Metric Cards with Sparklines & CSS Transitions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Lift Force (L) */}
        <div className={`p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border transition-all duration-300 shadow-lg space-y-2.5 relative overflow-hidden ${
          isRunning ? 'border-cyan-500/50 shadow-cyan-950/40 ring-1 ring-cyan-500/20' : 'border-cyan-500/30'
        }`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <ArrowUpRight className={`w-4 h-4 transition-transform duration-300 ${isRunning ? 'animate-bounce' : ''}`} />
              <span>Подъемная сила (L)</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-800 flex items-center gap-1">
              {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />}
              <span>$C_L$</span>
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className={`text-2xl sm:text-3xl font-black text-cyan-300 font-mono tracking-tight transition-all duration-200 ${
              isRunning ? 'scale-[1.02] drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]' : ''
            }`}>
              {liftCoeff.toFixed(3)}
            </div>
            <div className="text-sm font-bold text-slate-300 font-mono transition-colors duration-200">
              {liftNewtons.toFixed(1)} <span className="text-xs text-slate-500">кН</span>
            </div>
          </div>

          {/* Sparkline Visual Feedback */}
          <Sparkline
            data={sparklines.lift}
            color="#38bdf8"
            fillColor="#38bdf8"
            gradientId="sparkline-lift"
            unit="Cl"
            min={-0.2}
            max={2.0}
            showBaseline={true}
          />

          {/* Dynamic Envelope Progress Bar */}
          <div className="space-y-1 pt-0.5">
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, (liftCoeff / 1.8) * 100))}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-400 flex justify-between font-mono pt-0.5">
              <span><MathText text="Градиент $dC_L/d\alpha$:" /></span>
              <span className="text-cyan-400 font-bold">
                {((2 * Math.PI) / Math.sqrt(Math.max(0.15, Math.abs(1 - mach * mach))) / 57.3).toFixed(3)} /град
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Drag Force (D) */}
        <div className={`p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border transition-all duration-300 shadow-lg space-y-2.5 relative overflow-hidden ${
          isRunning ? 'border-amber-500/50 shadow-amber-950/40 ring-1 ring-amber-500/20' : 'border-amber-500/30'
        }`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-amber-300 font-bold">
              <TrendingUp className={`w-4 h-4 transition-transform duration-300 ${isRunning ? 'animate-pulse' : ''}`} />
              <span>Сопротивление (D)</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 font-bold border border-amber-800 flex items-center gap-1">
              {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
              <MathText text="$C_D$" />
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className={`text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight transition-all duration-200 ${
              isRunning ? 'scale-[1.02] drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]' : ''
            }`}>
              {dragCoeff.toFixed(3)}
            </div>
            <div className="text-sm font-bold text-slate-300 font-mono transition-colors duration-200">
              {dragNewtons.toFixed(1)} <span className="text-xs text-slate-500">кН</span>
            </div>
          </div>

          {/* Sparkline Visual Feedback */}
          <Sparkline
            data={sparklines.drag}
            color="#f59e0b"
            fillColor="#f59e0b"
            gradientId="sparkline-drag"
            unit="Cd"
            min={0.0}
            max={0.35}
          />

          {/* Dynamic Envelope Progress Bar */}
          <div className="space-y-1 pt-0.5">
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, (dragCoeff / 0.25) * 100))}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-400 flex justify-between font-mono pt-0.5">
              <span><MathText text="Волновое $C_{Dw}$ + инд. $C_{Di}$:" /></span>
              <span className="text-amber-400 font-bold">
                {(dragCoeff * 0.72).toFixed(3)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Pitching Moment (M_y) */}
        <div className={`p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border transition-all duration-300 shadow-lg space-y-2.5 relative overflow-hidden ${
          isRunning ? 'border-purple-500/50 shadow-purple-950/40 ring-1 ring-purple-500/20' : 'border-purple-500/30'
        }`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-purple-300 font-bold">
              <Compass className={`w-4 h-4 transition-transform duration-300 ${isRunning ? 'animate-spin' : ''}`} />
              <span>Момент тангажа (M_y)</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 font-bold border border-purple-800 flex items-center gap-1">
              {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />}
              <MathText text="$C_m$" />
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className={`text-2xl sm:text-3xl font-black text-purple-400 font-mono tracking-tight transition-all duration-200 ${
              isRunning ? 'scale-[1.02] drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]' : ''
            }`}>
              {momentCoeff.toFixed(3)}
            </div>
            <div className="text-sm font-bold text-slate-300 font-mono transition-colors duration-200">
              {pitchMomentNm.toFixed(1)} <span className="text-xs text-slate-500">кН·м</span>
            </div>
          </div>

          {/* Sparkline Visual Feedback */}
          <Sparkline
            data={sparklines.moment}
            color="#a855f7"
            fillColor="#a855f7"
            gradientId="sparkline-moment"
            unit="Cm"
            min={-0.2}
            max={0.1}
            showBaseline={true}
          />

          {/* Dynamic Stability Progress Bar */}
          <div className="space-y-1 pt-0.5">
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ease-out ${
                  momentCoeff < 0 ? 'bg-gradient-to-r from-emerald-600 to-teal-400' : 'bg-gradient-to-r from-rose-600 to-rose-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(10, Math.abs(momentCoeff) * 400))}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-400 flex justify-between font-mono pt-0.5">
              <span><MathText text="Продольная устойч. ($dC_m/d\alpha$):" /></span>
              <span className={`font-bold ${momentCoeff < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {momentCoeff < 0 ? 'УСТОЙЧИВ' : 'НЕУСТОЙЧИВ'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Aerodynamic Efficiency (L/D) & Residual */}
        <div className={`p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border transition-all duration-300 shadow-lg space-y-2.5 relative overflow-hidden ${
          isRunning ? 'border-emerald-500/50 shadow-emerald-950/40 ring-1 ring-emerald-500/20' : 'border-emerald-500/30'
        }`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-300 font-bold">
              <Zap className={`w-4 h-4 transition-transform duration-300 ${isRunning ? 'animate-pulse' : ''}`} />
              <span>Качество ($K = L/D$)</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800 flex items-center gap-1">
              {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
              <span>Невязка</span>
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className={`text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight transition-all duration-200 ${
              isRunning ? 'scale-[1.02] drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]' : ''
            }`}>
              {(liftCoeff / Math.max(0.001, dragCoeff)).toFixed(2)}
            </div>
            <div className="text-xs font-mono text-slate-400">
              ||r||: <span className="text-cyan-300 font-bold transition-colors duration-200">{residual.toExponential(1)}</span>
            </div>
          </div>

          {/* Sparkline Visual Feedback */}
          <Sparkline
            data={sparklines.efficiency}
            color="#22c55e"
            fillColor="#22c55e"
            gradientId="sparkline-eff"
            unit="K"
            min={0}
            max={25}
          />

          {/* Dynamic Efficiency Progress Bar */}
          <div className="space-y-1 pt-0.5">
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, ((liftCoeff / Math.max(0.001, dragCoeff)) / 25) * 100))}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-400 flex justify-between font-mono pt-0.5">
              <span>Число CFL / Небаланс:</span>
              <span className="text-slate-200 font-bold">
                CFL={cflNumber.toFixed(1)} / {massFluxError.toExponential(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Real-time Live Oscilloscope (Strip Chart) + Force Vector Rose Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Live Oscilloscope Canvas */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Потоковый Осциллограф Аэродинамических Сил ($C_L, C_D, C_m$)
              </h3>
            </div>

            {/* Legend Pins */}
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                <span><MathText text="$C_L$ (Подъемная)" /></span>
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                <span><MathText text="$C_D$ (Сопротивление)" /></span>
              </span>
              <span className="flex items-center gap-1 text-purple-400">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
                <span><MathText text="$C_m$ (Момент)" /></span>
              </span>
            </div>
          </div>

          <div className="relative h-60 sm:h-64 rounded-xl overflow-hidden border border-slate-800/80">
            <canvas ref={chartCanvasRef} width={680} height={260} className="w-full h-full object-cover" />
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
            <span>
              Алгоритм: <strong>GMRES(30) + AMG V-cycle</strong> | Скорость дискретизации: <strong>12 мс/шаг</strong>
            </span>
            <span className="text-cyan-400 font-mono font-bold">
              <MathText text="Сходимость: $||r_k||_2 / ||r_0||_2 \le 10^{-7}$" />
            </span>
          </div>
        </div>

        {/* Right 1 Col: Force Vector Rose Gauge */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Векторная Роза Сил
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 font-mono border border-slate-800">
              <MathText text={`$\\alpha = ${alpha.toFixed(1)}^\\circ$`} />
            </span>
          </div>

          <div className="relative h-48 sm:h-52 rounded-xl overflow-hidden border border-slate-800/80 flex items-center justify-center">
            <canvas ref={vectorRoseCanvasRef} width={280} height={210} className="w-full h-full object-contain" />
          </div>

          {/* Quick Vector Breakdown Legend */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono bg-slate-900/60 p-2 rounded-xl border border-slate-800">
            <div className="text-cyan-400 font-bold">L: {liftNewtons.toFixed(1)} кН</div>
            <div className="text-amber-400 font-bold">D: {dragNewtons.toFixed(1)} кН</div>
            <div className="text-emerald-400 font-bold">|R|: {(Math.sqrt(liftNewtons * liftNewtons + dragNewtons * dragNewtons)).toFixed(1)} кН</div>
          </div>
        </div>
      </div>

      {/* 5. Solver Parameter Controls & Flight Regime Presets */}
      <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Параметры Солвера & Пресеты Полетных Режимов
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Изменение параметров обновляет поток сил в реальном времени
          </span>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Mach Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Число Маха ($M$):</span>
              <span className="font-bold text-cyan-300">
                {mach.toFixed(2)} M {isSupersonic && '(Сверхзвук)'}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.05"
              value={mach}
              onChange={(e) => {
                setMach(parseFloat(e.target.value));
                if (!isRunning && solverStage === 'completed') startSolver();
              }}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.1 (Дозвук)</span>
              <span>1.0 (Звуковой барьер)</span>
              <span>3.0 (Сверхзвук)</span>
            </div>
          </div>

          {/* Alpha Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400"><MathText text="Угол атаки ($\alpha$):" /></span>
              <span className={`font-bold ${isStall ? 'text-rose-400' : 'text-cyan-300'}`}>
                {alpha.toFixed(1)}° {isStall && '(Срыв потока)'}
              </span>
            </div>
            <input
              type="range"
              min="-8"
              max="22"
              step="0.5"
              value={alpha}
              onChange={(e) => {
                setAlpha(parseFloat(e.target.value));
                if (!isRunning && solverStage === 'completed') startSolver();
              }}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>-8° (Пикирование)</span>
              <span>0° (Нейтраль)</span>
              <span>+22° (Кабрирование)</span>
            </div>
          </div>

          {/* Mesh Resolution Selector */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Сетка FVM:</span>
              <span className="font-bold text-indigo-300">{meshCells.toLocaleString()} ячеек</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: '15k (Быстро)', value: 15200 },
                { label: '45k (Оптимум)', value: 45200 },
                { label: '120k (High-Res)', value: 120000 },
              ].map((m) => (
                <button
                  key={m.value}
                  onClick={() => {
                    setMeshCells(m.value);
                    if (!isRunning && solverStage === 'completed') startSolver();
                  }}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold border transition-colors cursor-pointer text-center ${
                    meshCells === m.value
                      ? 'bg-indigo-950 border-indigo-500 text-indigo-300 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4 Quick Regime Presets */}
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-bold text-slate-300">Быстрые Полетные Пресеты CFD:</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => applyPreset(0.82, 3.5, 45200)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left transition-colors cursor-pointer group"
            >
              <div className="text-xs font-bold text-white group-hover:text-cyan-300">1. Крейсерский Трансзвук</div>
              <div className="text-[10px] text-slate-400 font-mono">
                <MathText text="$M = 0.82, \alpha = 3.5^\circ$" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => applyPreset(0.45, 12.0, 45200)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left transition-colors cursor-pointer group"
            >
              <div className="text-xs font-bold text-white group-hover:text-amber-300">2. Энергичный Маневр</div>
              <div className="text-[10px] text-slate-400 font-mono">
                <MathText text="$M = 0.45, \alpha = 12.0^\circ$" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => applyPreset(1.85, 1.5, 120000)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left transition-colors cursor-pointer group"
            >
              <div className="text-xs font-bold text-white group-hover:text-rose-300">3. Сверхзвуковой Бросок</div>
              <div className="text-[10px] text-slate-400 font-mono">
                <MathText text="$M = 1.85, \alpha = 1.5^\circ$" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => applyPreset(0.22, 17.0, 45200)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left transition-colors cursor-pointer group"
            >
              <div className="text-xs font-bold text-white group-hover:text-purple-300">4. Предсрывной Тест</div>
              <div className="text-[10px] text-slate-400 font-mono">
                <MathText text="$M = 0.22, \alpha = 17.0^\circ$" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
