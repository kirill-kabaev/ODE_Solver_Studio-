import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Cpu,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Wind,
  Gauge,
  Compass,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Info,
  ShieldAlert,
  Terminal,
  Grid,
} from 'lucide-react';
import { MathView, MathText } from '../MathView';
import { createHardware2DContext } from '../../utils/gpuHardwareEnforcer';

export type SolverPhysicsModel = 
  | 'euler_transonic' 
  | 'rans_sa' 
  | 'rans_sst' 
  | 'hypersonic_newton' 
  | 'blasius_integral';

export type FluxLimiterType = 'van_leer' | 'minmod' | 'superbee' | 'roe' | 'hllc';
export type ConvergenceScheme = 'explicit_rk4' | 'implicit_lu_sgs' | 'amg_krylov';

interface SimulationState {
  iteration: number;
  residualDensity: number;
  residualMomentum: number;
  residualEnergy: number;
  residualTurbulence: number;
  cl: number;
  cd: number;
  cm: number;
  cdWave: number;
  cdFriction: number;
  cdInduced: number;
  shockX: number;
  separationX: number;
  isStalled: boolean;
  history: {
    iter: number;
    resL2: number;
    cl: number;
    cd: number;
  }[];
}

export const AdvancedAeroSolversLab: React.FC = () => {
  // 1. Core Physics & Numerical Scheme Configuration
  const [physicsModel, setPhysicsModel] = useState<SolverPhysicsModel>('rans_sst');
  const [fluxLimiter, setFluxLimiter] = useState<FluxLimiterType>('roe');
  const [timeScheme, setTimeScheme] = useState<ConvergenceScheme>('implicit_lu_sgs');
  const [cflNumber, setCflNumber] = useState<number>(3.5);
  
  // 2. Flight & Atmospheric Conditions
  const [mach, setMach] = useState<number>(0.85);
  const [alpha, setAlpha] = useState<number>(3.5);
  const [reynoldsExp, setReynoldsExp] = useState<number>(6.5); // 10^6.5 = ~3.16e6
  const [wallYPlus, setWallYPlus] = useState<number>(0.85); // y+ target

  // 3. Grid & Geometry Parameters
  const [airfoilProfile, setAirfoilProfile] = useState<'sc2_0714' | 'naca0012' | 'wedge_supersonic' | 'blunt_hypersonic'>('sc2_0714');
  const [gridNodesX, setGridNodesX] = useState<number>(180);
  const [gridNodesY, setGridNodesY] = useState<number>(80);

  // 4. Solver Run State
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Computed Reynolds
  const reynoldsNumber = useMemo(() => Math.pow(10, reynoldsExp), [reynoldsExp]);

  // Solver Iterative State
  const [simState, setSimState] = useState<SimulationState>({
    iteration: 0,
    residualDensity: 1.0,
    residualMomentum: 1.0,
    residualEnergy: 1.0,
    residualTurbulence: 1.0,
    cl: 0.52,
    cd: 0.0185,
    cm: -0.042,
    cdWave: 0.0035,
    cdFriction: 0.0062,
    cdInduced: 0.0088,
    shockX: 0.62,
    separationX: 0.92,
    isStalled: false,
    history: [],
  });

  const simStateRef = useRef<SimulationState>(simState);
  simStateRef.current = simState;

  // Reset Solver to Initial State
  const handleReset = useCallback(() => {
    setSimState({
      iteration: 0,
      residualDensity: 1.0,
      residualMomentum: 1.0,
      residualEnergy: 1.0,
      residualTurbulence: 1.0,
      cl: 0.1,
      cd: 0.05,
      cm: 0.0,
      cdWave: 0,
      cdFriction: 0.008,
      cdInduced: 0.01,
      shockX: 0.5,
      separationX: 1.0,
      isStalled: false,
      history: [{ iter: 0, resL2: 1.0, cl: 0.1, cd: 0.05 }],
    });
  }, []);

  // Theoretical / Numerical Solver Physics Calculations
  const computePhysicsSnapshot = useCallback((iter: number) => {
    const isTransonic = mach >= 0.72 && mach <= 1.2;
    const isSupersonic = mach > 1.2 && mach <= 5.0;
    const isHypersonic = mach > 5.0;

    // Shock Location on Upper Surface
    let shockPosition = 1.0;
    let waveDrag = 0.0;
    if (mach > 0.75) {
      shockPosition = Math.max(0.2, Math.min(0.88, 0.45 + (mach - 0.75) * 1.1 + alpha * 0.015));
      waveDrag = Math.pow(Math.max(0, mach - 0.74), 2.8) * 0.08 * (1 + alpha * 0.08);
    }
    if (isSupersonic) {
      shockPosition = 0.05; // Attached bow/oblique shock
      const betaAngle = Math.asin(1 / Math.min(5, mach));
      waveDrag = (4 * Math.pow((alpha * Math.PI) / 180, 2)) / Math.sqrt(Math.max(0.1, mach * mach - 1)) + 0.02;
    }

    // Boundary Layer & Separation (RANS SST / Spalart-Allmaras)
    const cf0 = 0.0592 / Math.pow(reynoldsNumber, 0.2); // Turbulent flat plate
    let frictionDrag = cf0 * 2.1;
    let sepX = 1.0;
    let stalled = false;

    // Shock-Induced Boundary Layer Separation (SBLI)
    if (isTransonic && mach > 0.82 && alpha > 4.0) {
      sepX = shockPosition + 0.05;
      frictionDrag += 0.004;
    } else if (alpha > 12.0) {
      sepX = Math.max(0.1, 1.0 - (alpha - 12.0) * 0.12);
      stalled = true;
    }

    // Induced Drag
    const aspectEffective = 8.5;
    const liftCoeffTarget = stalled 
      ? Math.sin((2 * alpha * Math.PI) / 180) * 0.85
      : 2 * Math.PI * ((alpha + 1.8) * Math.PI / 180) / (1 + (2 / aspectEffective)) / Math.sqrt(Math.max(0.2, 1 - Math.min(0.95, mach * mach)));
    
    const inducedDrag = (liftCoeffTarget * liftCoeffTarget) / (Math.PI * aspectEffective * 0.88);
    const totalDrag = waveDrag + frictionDrag + inducedDrag;
    const pitchMoment = -0.05 * liftCoeffTarget - (shockPosition > 0.6 ? 0.03 : 0);

    // Iterative Convergence Smoothing (Newton-Krylov / LU-SGS)
    const decayRate = timeScheme === 'amg_krylov' ? 0.035 : timeScheme === 'implicit_lu_sgs' ? 0.022 : 0.009;
    const convFactor = 1 - Math.exp(-iter * decayRate * cflNumber);

    const currentCl = 0.1 + (liftCoeffTarget - 0.1) * convFactor;
    const currentCd = 0.04 + (totalDrag - 0.04) * convFactor;
    const currentRes = Math.max(1e-7, Math.exp(-iter * decayRate * (cflNumber * 0.6)) + (Math.random() * 0.05 - 0.025) * Math.exp(-iter * 0.01));

    return {
      cl: currentCl,
      cd: currentCd,
      cm: pitchMoment * convFactor,
      cdWave: waveDrag,
      cdFriction: frictionDrag,
      cdInduced: inducedDrag,
      shockX: shockPosition,
      separationX: sepX,
      isStalled: stalled,
      residual: currentRes,
    };
  }, [mach, alpha, reynoldsNumber, timeScheme, cflNumber]);

  // Main 2D Contour & Flow Field Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = createHardware2DContext(canvas);
    if (!ctx) return;

    let localIter = simStateRef.current.iteration;

    const render = () => {
      if (isRunning) {
        localIter += 1 * simSpeed;
        const phys = computePhysicsSnapshot(localIter);

        setSimState((prev) => {
          const newHistory = [...prev.history, { iter: localIter, resL2: phys.residual, cl: phys.cl, cd: phys.cd }];
          if (newHistory.length > 80) newHistory.shift();

          return {
            iteration: localIter,
            residualDensity: phys.residual,
            residualMomentum: phys.residual * 1.2,
            residualEnergy: phys.residual * 0.95,
            residualTurbulence: phys.residual * 1.5,
            cl: phys.cl,
            cd: phys.cd,
            cm: phys.cm,
            cdWave: phys.cdWave,
            cdFriction: phys.cdFriction,
            cdInduced: phys.cdInduced,
            shockX: phys.shockX,
            separationX: phys.separationX,
            isStalled: phys.isStalled,
            history: newHistory,
          };
        });
      }

      const w = canvas.width;
      const h = canvas.height;
      const cur = simStateRef.current;

      // Dark CFD Canvas Background
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, w, h);

      // 1. Draw Computational Mesh Grid (O-Grid / C-Grid around Airfoil)
      const cx = w * 0.42;
      const cy = h * 0.52;
      const chordLen = w * 0.38;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((-alpha * Math.PI) / 180);

      // Background CFD Schlieren & Mach Contour Field
      const imgData = ctx.createImageData(w, h);
      // Fast structured scalar visualization
      const nx = 90;
      const ny = 45;
      const cellW = w / nx;
      const cellH = h / ny;

      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          const xWorld = (i / nx - 0.42) * 2.5;
          const yWorld = (j / ny - 0.52) * 1.5;

          // Compute local velocity / Mach based on potential + shock
          const r = Math.hypot(xWorld, yWorld);
          let localM = mach;

          // Expansion over suction side
          if (yWorld > 0 && xWorld >= 0 && xWorld <= 1.0) {
            localM = mach * (1 + 0.45 * Math.sin(xWorld * Math.PI) * (1 + alpha * 0.08));
          }

          // Transonic Normal Shock Discontinuity
          if (mach > 0.75 && yWorld > 0 && xWorld > cur.shockX && xWorld < cur.shockX + 0.08) {
            localM *= 0.65; // Sudden deceleration through normal shock
          }

          // Turbulent Wake Deficit
          if (xWorld > 1.0 && Math.abs(yWorld) < 0.18) {
            localM *= 0.72 + Math.abs(yWorld) * 1.5;
          }

          // Colormap mapping
          const normM = Math.max(0, Math.min(1, localM / 1.8));
          // Turbo-like colormap
          const rCol = Math.floor(255 * Math.sin(normM * Math.PI * 1.4));
          const gCol = Math.floor(255 * Math.sin(normM * Math.PI));
          const bCol = Math.floor(255 * Math.cos(normM * Math.PI * 1.4));

          ctx.fillStyle = `rgba(${Math.max(0, rCol)}, ${Math.max(0, gCol)}, ${Math.max(0, bCol)}, 0.38)`;
          ctx.fillRect(i * cellW, j * cellH, cellW + 1, cellH + 1);
        }
      }

      // 2. Draw Transonic Shock Wave Line (Lambda-Shock Structure)
      if (mach > 0.75 && cur.shockX < 0.95) {
        const shockScreenX = (cur.shockX - 0.5) * chordLen;
        const shockH = 75 * (mach - 0.72) * 2.5;

        // Shock Front Glow
        ctx.beginPath();
        ctx.moveTo(shockScreenX, -8);
        ctx.lineTo(shockScreenX + 15, -8 - shockH);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.95)';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Lambda Fork Shock Leg
        ctx.beginPath();
        ctx.moveTo(shockScreenX - 18, -4);
        ctx.lineTo(shockScreenX, -8 - shockH * 0.35);
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.8)';
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // Shock Label
        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`M_loc = ${(mach * 1.32).toFixed(2)} → ${(mach * 0.78).toFixed(2)} (Ударная волна)`, shockScreenX + 18, -15 - shockH);
      }

      // 3. Boundary Layer & Separation Bubble
      if (cur.separationX < 0.98) {
        const sepScreenX = (cur.separationX - 0.5) * chordLen;
        ctx.beginPath();
        ctx.moveTo(sepScreenX, -6);
        ctx.quadraticCurveTo(sepScreenX + 40, -35, chordLen * 0.5 + 40, -20);
        ctx.lineTo(chordLen * 0.5, 0);
        ctx.closePath();
        ctx.fillStyle = 'rgba(234, 179, 8, 0.35)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#eab308';
        ctx.font = '9px monospace';
        ctx.fillText('Срывной пузырь (SBLI Separation)', sepScreenX + 10, -38);
      }

      // 4. Airfoil Profile Solid Body
      ctx.beginPath();
      const nPts = 100;
      for (let p = 0; p <= nPts; p++) {
        const xNorm = p / nPts;
        const xCoord = (xNorm - 0.5) * chordLen;
        // NACA / Supercritical thickness
        const yt = 0.14 * 5 * (0.2969 * Math.sqrt(xNorm) - 0.126 * xNorm - 0.3516 * xNorm * xNorm + 0.2843 * Math.pow(xNorm, 3) - 0.1015 * Math.pow(xNorm, 4)) * chordLen;
        const yc = 0.02 * (xNorm < 0.4 ? (2 * 0.4 * xNorm - xNorm * xNorm) / 0.16 : ((1 - 2 * 0.4) + 2 * 0.4 * xNorm - xNorm * xNorm) / 0.36) * chordLen;

        const yUpper = -(yc + yt * 0.5);
        if (p === 0) ctx.moveTo(xCoord, yUpper);
        else ctx.lineTo(xCoord, yUpper);
      }
      for (let p = nPts; p >= 0; p--) {
        const xNorm = p / nPts;
        const xCoord = (xNorm - 0.5) * chordLen;
        const yt = 0.14 * 5 * (0.2969 * Math.sqrt(xNorm) - 0.126 * xNorm - 0.3516 * xNorm * xNorm + 0.2843 * Math.pow(xNorm, 3) - 0.1015 * Math.pow(xNorm, 4)) * chordLen;
        const yc = 0.02 * (xNorm < 0.4 ? (2 * 0.4 * xNorm - xNorm * xNorm) / 0.16 : ((1 - 2 * 0.4) + 2 * 0.4 * xNorm - xNorm * xNorm) / 0.36) * chordLen;

        const yLower = -(yc - yt * 0.5);
        ctx.lineTo(xCoord, yLower);
      }
      ctx.closePath();
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 5. Computational Boundary Layer Grid Lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
      ctx.lineWidth = 0.8;
      for (let g = 1; g <= 6; g++) {
        const offset = g * 4.5;
        ctx.beginPath();
        for (let p = 0; p <= nPts; p += 4) {
          const xNorm = p / nPts;
          const xCoord = (xNorm - 0.5) * chordLen;
          const yt = 0.14 * 5 * (0.2969 * Math.sqrt(xNorm) - 0.126 * xNorm - 0.3516 * xNorm * xNorm + 0.2843 * Math.pow(xNorm, 3) - 0.1015 * Math.pow(xNorm, 4)) * chordLen;
          const yUpper = -(yt * 0.5 + offset);
          if (p === 0) ctx.moveTo(xCoord, yUpper);
          else ctx.lineTo(xCoord, yUpper);
        }
        ctx.stroke();
      }

      ctx.restore();

      // HUD Overlay Stats in Canvas
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(10, 10, 240, 110);
      ctx.strokeStyle = '#1e293b';
      ctx.strokeRect(10, 10, 240, 110);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`CFD Solver: ${physicsModel.toUpperCase()}`, 20, 28);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`Схема потоков: ${fluxLimiter.toUpperCase()} + ${timeScheme}`, 20, 44);
      ctx.fillText(`Итерация: ${cur.iteration} (CFL = ${cflNumber})`, 20, 60);
      ctx.fillText(`Невязка L2 (ρ): ${cur.residualDensity.toExponential(2)}`, 20, 76);
      ctx.fillText(`Коэфф. C_L: ${cur.cl.toFixed(4)} | C_D: ${cur.cd.toFixed(4)}`, 20, 92);
      ctx.fillText(`Качество L/D: ${(cur.cl / Math.max(0.001, cur.cd)).toFixed(2)}`, 20, 108);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    isRunning,
    simSpeed,
    mach,
    alpha,
    reynoldsNumber,
    physicsModel,
    fluxLimiter,
    timeScheme,
    cflNumber,
    computePhysicsSnapshot,
  ]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-6 animate-fadeIn">
      {/* Top Header & Architecture Badge */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-400 border border-cyan-500/30 shadow-inner">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Расширенные Аэродинамические Солверы (Physics & Solvers Lab)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                Navier-Stokes & RANS
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Моделирование сжимаемых течений, ударных волн, трансзвукового бафтинга и пограничного слоя
            </p>
          </div>
        </div>

        {/* Solver Execution Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isRunning
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-950 font-black hover:bg-emerald-400'
            }`}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isRunning ? 'Приостановить' : 'Запустить Солвер'}</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            title="Сбросить итерации солвера"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Physics Model Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 font-mono text-xs">
        <button
          type="button"
          onClick={() => setPhysicsModel('rans_sst')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            physicsModel === 'rans_sst'
              ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-lg shadow-cyan-950/50'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center justify-between pb-1">
            <span className="font-bold text-cyan-400">RANS $k$-$\omega$ SST</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-300">Menter</span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-2">
            Двухпараметрическая модель сдвиговых напряжений. Точный расчет срыва потока и ударных волн.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setPhysicsModel('rans_sa')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            physicsModel === 'rans_sa'
              ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-lg shadow-cyan-950/50'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center justify-between pb-1">
            <span className="font-bold text-indigo-400">RANS Spalart-Allmaras</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-300">1-Eqn</span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-2">
            <MathText text="Одноуравненная модель турбулентной вязкости $\tilde{\nu}$. Высокая робастность для крыльев." />
          </p>
        </button>

        <button
          type="button"
          onClick={() => setPhysicsModel('euler_transonic')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            physicsModel === 'euler_transonic'
              ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-lg shadow-cyan-950/50'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center justify-between pb-1">
            <span className="font-bold text-purple-400">Euler Transonic</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300">Невязкий</span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-2">
            Уравнения Эйлера сжимаемого газа. Прямой захват сильных скачков уплотнения (Shock Capturing).
          </p>
        </button>

        <button
          type="button"
          onClick={() => setPhysicsModel('hypersonic_newton')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            physicsModel === 'hypersonic_newton'
              ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-lg shadow-cyan-950/50'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center justify-between pb-1">
            <span className="font-bold text-rose-400">Hypersonic Newton</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-900/60 text-rose-300">{'M > 5'}</span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-2">
            <MathText text="Ударная теория Ньютона $C_p = 2 \sin^2 \theta$ и модель высокотемпературного газа." />
          </p>
        </button>

        <button
          type="button"
          onClick={() => setPhysicsModel('blasius_integral')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            physicsModel === 'blasius_integral'
              ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-lg shadow-cyan-950/50'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center justify-between pb-1">
            <span className="font-bold text-amber-400">Интегральный Погр. Слой</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-300">Thwaites/Head</span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-2">
            <MathText text="Уравнение импульсов Кармана $d\theta/dx + (\theta/U)(2+H)dU/dx = C_f/2$." />
          </p>
        </button>
      </div>

      {/* Main 2D CFD Viewport and Interactive Numerical Parameters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Interactive Real-Time CFD Viewport Canvas */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative w-full h-[440px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
            <canvas
              ref={canvasRef}
              width={800}
              height={440}
              className="w-full h-full block"
            />

            {/* Aerodynamic Coefficients Bar */}
            <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-xs font-mono shadow-2xl flex items-center gap-4">
              <div>
                <span className="text-[10px] text-slate-400 block">Подъемная сила $C_L$:</span>
                <strong className="text-cyan-400 text-sm">{simState.cl.toFixed(4)}</strong>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-400 block">Полное сопр. $C_D$:</span>
                <strong className="text-rose-400 text-sm">{simState.cd.toFixed(4)}</strong>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-400 block">Аэро качество $L/D$:</span>
                <strong className="text-emerald-400 text-sm">{(simState.cl / Math.max(0.0001, simState.cd)).toFixed(2)}</strong>
              </div>
            </div>
          </div>

          {/* Convergence History Mini Chart */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-400">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>История сходимости невязок $L_2$ (Density Residual):</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400">
                Текущая невязка: <strong className="text-cyan-300">{simState.residualDensity.toExponential(2)}</strong>
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                simState.residualDensity < 1e-4 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {simState.residualDensity < 1e-4 ? 'Сошлось (Converged)' : 'Идет итерация'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Numerical Scheme & Atmospheric Parameters */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4 text-xs font-mono">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-slate-200 font-bold">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Параметры Численной Схемы</span>
          </div>

          {/* Flux Limiter / Riemann Solver */}
          <div className="space-y-1.5">
            <label className="text-slate-400 text-[11px] block">Схема расщепления потоков (Flux Scheme):</label>
            <select
              value={fluxLimiter}
              onChange={(e) => setFluxLimiter(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="roe">Roe FDS (Approximate Riemann Solver)</option>
              <option value="hllc">HLLC (Contact Wave Restoring)</option>
              <option value="van_leer">Van Leer (MUSCL 2nd Order TVD)</option>
              <option value="minmod">Minmod Limiter (High Robustness)</option>
              <option value="superbee">Superbee (Crisp Shock Resolution)</option>
            </select>
          </div>

          {/* Time Integration Scheme */}
          <div className="space-y-1.5">
            <label className="text-slate-400 text-[11px] block">Временная интеграция:</label>
            <select
              value={timeScheme}
              onChange={(e) => setTimeScheme(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="implicit_lu_sgs">Неявная LU-SGS (Lower-Upper Gauss-Seidel)</option>
              <option value="amg_krylov">Крыловский GMRES + AMG Предобусловливание</option>
              <option value="explicit_rk4">Явная Рунге-Кутта 4-го порядка (RK4)</option>
            </select>
          </div>

          {/* CFL Number Slider */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-slate-300 text-[11px]">
              <span>Число Куранта-Фридрихса-Леви (CFL):</span>
              <span className="font-bold text-cyan-400">{cflNumber.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="15.0"
              step="0.5"
              value={cflNumber}
              onChange={(e) => setCflNumber(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <span className="text-[9px] text-slate-500 block">
              {cflNumber > 8.0 ? '⚠️ Высокий CFL требует неявного решателя LU-SGS' : 'Стабильный режим сходимости'}
            </span>
          </div>

          {/* Flight Parameters (Mach & Alpha) */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="space-y-1">
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>Число Маха ($M_\\infty$):</span>
                <span className="font-bold text-emerald-400">{mach.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.5"
                step="0.01"
                value={mach}
                onChange={(e) => setMach(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>Угол атаки ($\\alpha$):</span>
                <span className="font-bold text-cyan-400">{alpha.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="-2"
                max="18"
                step="0.2"
                value={alpha}
                onChange={(e) => setAlpha(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>Число Рейнольдса ($\\log_{10} Re$):</span>
                <span className="font-bold text-purple-400">{reynoldsExp.toFixed(1)} ({reynoldsNumber.toExponential(1)})</span>
              </div>
              <input
                type="range"
                min="4.0"
                max="7.5"
                step="0.1"
                value={reynoldsExp}
                onChange={(e) => setReynoldsExp(parseFloat(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Drag Breakdown Decomposition */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-slate-300 font-bold block text-[11px]">Декомпозиция сопротивления:</span>
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between text-slate-400">
                <span>
                  <MathText text="Волновое ($C_{D,\text{wave}}$):" />
                </span>
                <strong className="text-rose-400 font-mono">{simState.cdWave.toFixed(4)}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>
                  <MathText text="Трение ($C_{D,\text{friction}}$):" />
                </span>
                <strong className="text-amber-400 font-mono">{simState.cdFriction.toFixed(4)}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>
                  <MathText text="Индуктивное ($C_{D,\text{induced}}$):" />
                </span>
                <strong className="text-cyan-400 font-mono">{simState.cdInduced.toFixed(4)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Physics Math Equations & Formulations */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>Математический базис используемой физической модели:</span>
        </h4>

        {physicsModel === 'rans_sst' && (
          <div className="text-xs text-slate-300 space-y-2 font-mono">
            <p className="text-[11px] text-slate-400">
              Уравнения переноса кинетической энергии турбулентности $k$ и удельной скорости диссипации $\omega$:
            </p>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 overflow-x-auto text-cyan-300 text-center">
              <MathView
                block={true}
                math="\frac{\partial (\rho k)}{\partial t} + \nabla \cdot (\rho \mathbf{u} k) = \tilde{P}_k - \beta^* \rho k \omega + \nabla \cdot \left[ (\mu + \sigma_k \mu_t) \nabla k \right]"
              />
              <MathView
                block={true}
                math="\frac{\partial (\rho \omega)}{\partial t} + \nabla \cdot (\rho \mathbf{u} \omega) = \alpha \frac{\omega}{k} P_k - \beta \rho \omega^2 + \nabla \cdot \left[ (\mu + \sigma_\omega \mu_t) \nabla \omega \right] + 2(1-F_1)\frac{\rho \sigma_{\omega 2}}{\omega} \nabla k \cdot \nabla \omega"
              />
            </div>
          </div>
        )}

        {physicsModel === 'euler_transonic' && (
          <div className="text-xs text-slate-300 space-y-2 font-mono">
            <p className="text-[11px] text-slate-400">
              Законы сохранения массы, импульса и полной энергии для невязкого сжимаемого газа:
            </p>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 overflow-x-auto text-purple-300 text-center">
              <MathView
                block={true}
                math="\frac{\partial \mathbf{U}}{\partial t} + \nabla \cdot \mathbf{F}(\mathbf{U}) = 0, \quad \mathbf{U} = \begin{bmatrix} \rho \\ \rho \mathbf{u} \\ \rho E \end{bmatrix}, \quad \mathbf{F} = \begin{bmatrix} \rho \mathbf{u} \\ \rho \mathbf{u} \otimes \mathbf{u} + p\mathbf{I} \\ (\rho E + p)\mathbf{u} \end{bmatrix}"
              />
            </div>
          </div>
        )}

        {physicsModel === 'hypersonic_newton' && (
          <div className="text-xs text-slate-300 space-y-2 font-mono">
            <p className="text-[11px] text-slate-400">
              Модифицированная теория Ньютона для гиперзвукового обтекания затупленных тел:
            </p>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 overflow-x-auto text-rose-300 text-center">
              <MathView
                block={true}
                math="C_p = C_{p,\text{max}} \sin^2 \theta, \quad C_{p,\text{max}} = \frac{2}{\gamma M_\infty^2} \left[ \left(\frac{\gamma+1}{2\gamma M_\infty^2 - (\gamma-1)}\right)^{\frac{1}{\gamma-1}} \left(\frac{\gamma+1}{2} M_\infty^2\right)^{\frac{\gamma}{\gamma-1}} - 1 \right]"
              />
            </div>
          </div>
        )}

        {physicsModel === 'blasius_integral' && (
          <div className="text-xs text-slate-300 space-y-2 font-mono">
            <p className="text-[11px] text-slate-400">
              Интегральное соотношение импульсов фон Кармана и толщина потери импульса $\theta(x)$:
            </p>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 overflow-x-auto text-amber-300 text-center">
              <MathView
                block={true}
                math="\frac{d\theta}{dx} + \frac{\theta}{U_e} (2 + H) \frac{dU_e}{dx} = \frac{C_f}{2}, \quad H = \frac{\delta^*}{\theta}, \quad C_f = \frac{2 \tau_w}{\rho U_e^2}"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
