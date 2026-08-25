// ============================================================================
// UAV Morphing Wing, Variable Sweep & Aeroelastic Flutter Stability Module
// Dynamic Camber Variation, Span/Sweep Adaptation, Flutter Margin & Flight Envelope
// ============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Layers,
  Activity,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Shield,
  Gauge,
  Wind,
  TrendingUp,
  Zap,
  Sparkles,
  Compass,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { FullscreenGraphButton } from '../../telemetry/FullscreenGraphButton';

export interface MorphingPreset {
  id: string;
  name: string;
  baselineSpanM: number;
  rootChordM: number;
  massKg: number;
  maxSweepDeg: number;
  flutterSpeedLimitMs: number;
  actuatorType: string;
  description: string;
}

export const MORPHING_PRESETS: MorphingPreset[] = [
  {
    id: 'variable_sweep_strike_uav',
    name: 'БПЛА с Изменяемой Стреловидностью Крыла (0°–45°, 65кг)',
    baselineSpanM: 3.4,
    rootChordM: 0.9,
    massKg: 65,
    maxSweepDeg: 45,
    flutterSpeedLimitMs: 95,
    actuatorType: 'Электрогидромеханический винтовой привод',
    description: 'Адаптивное крыло для переключения между длительным барражированием (прямое крыло) и скоростным прорывом ПВО (стреловидность 45°).',
  },
  {
    id: 'compliant_camber_scout',
    name: 'Бесшарнирное Адаптивное Крыло Непрерывной Кривизны (22кг)',
    baselineSpanM: 2.6,
    rootChordM: 0.6,
    massKg: 22,
    maxSweepDeg: 25,
    flutterSpeedLimitMs: 70,
    actuatorType: 'Пьезоэлектрические & SMA (с памятью формы) актуаторы',
    description: 'Бесщелевая непрерывная деформация задней кромки (Compliant Mechanism) для подавления вихрей и ламинарного обтекания.',
  },
  {
    id: 'telescopic_span_loiter_uav',
    name: 'Телескопическое Крыло с Переменным Размахом (85кг)',
    baselineSpanM: 4.2,
    rootChordM: 1.0,
    massKg: 85,
    maxSweepDeg: 30,
    flutterSpeedLimitMs: 110,
    actuatorType: 'Шарико-винтовая пара с сервоприводом постоянного тока',
    description: 'Телескопическое выдвижение консолей крыла для увеличения удлинения $\\lambda$ в 1.8 раза в режиме экономного крейсерского полета.',
  },
];

export const UAVMorphingWingAeroelasticModule: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [wingSweepDeg, setWingSweepDeg] = useState<number>(15); // 0 to 45 deg
  const [spanExtensionPct, setSpanExtensionPct] = useState<number>(20); // 0 to 50 %
  const [camberMorphDeg, setCamberMorphDeg] = useState<number>(4); // -2 to 12 deg
  const [flightSpeedMs, setFlightSpeedMs] = useState<number>(45); // 20 to 100 m/s
  const [flightAltitudeM, setFlightAltitudeM] = useState<number>(2000); // 100 to 8000 m

  // Simulation & Animation
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [animPhase, setAnimPhase] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const preset = MORPHING_PRESETS[selectedPresetIdx];

  // Mathematical Aeroelastic & Morphing Aerodynamic Computations
  const calculations = useMemo(() => {
    // Standard atmosphere density at altitude
    const rho0 = 1.225;
    const rho = rho0 * Math.exp(-flightAltitudeM / 8500);

    // Geometry adaptation
    const currentSpanM = preset.baselineSpanM * (1 + spanExtensionPct / 100);
    const sweepRad = (wingSweepDeg * Math.PI) / 180;
    const effectiveAspectR = Math.pow(currentSpanM, 2) / (currentSpanM * preset.rootChordM * 0.85);

    // Lift and Drag Polars with Morphing Parameters
    // Sweep effect: CL_alpha decreases with cos(sweep), CD0 decreases at high speeds
    const clAlphaBase = 2 * Math.PI / (1 + 2 / effectiveAspectR);
    const clAlphaEffective = clAlphaBase * Math.cos(sweepRad);
    const zeroLiftAoA = -camberMorphDeg * 0.8; // camber increases effective lift at 0 AoA
    const operatingAoA = 4.0; // deg
    const effectiveCL = Math.max(0.1, (clAlphaEffective * (operatingAoA - zeroLiftAoA) * Math.PI) / 180);

    // Drag: Induced Drag + Profile Drag (compliant camber reduces profile drag by ~18%)
    const oswaldE = 0.88 * Math.cos(sweepRad * 0.5);
    const cdInduced = Math.pow(effectiveCL, 2) / (Math.PI * effectiveAspectR * oswaldE);
    const baseCd0 = 0.022 * Math.cos(sweepRad);
    const effectiveCD = baseCd0 + cdInduced;
    const liftToDragRatio = effectiveCL / effectiveCD;

    // Aeroelastic Flutter & Torsional Divergence Margin
    // Flutter Speed V_flutter ~ V_ref * sqrt(taper) * cos(sweep) * (1 / sqrt(spanExtension))
    const flutterSpeedMs = preset.flutterSpeedLimitMs * (1 / Math.sqrt(1 + spanExtensionPct / 100)) * (1 + 0.35 * Math.sin(sweepRad));
    const flutterSafetyMargin = (flutterSpeedMs - flightSpeedMs) / flutterSpeedMs;
    const isFlutterUnstable = flightSpeedMs >= flutterSpeedMs * 0.95;

    // Dynamic Pressure & Aeroelastic Wing Tip Deflection
    const qDyn = 0.5 * rho * Math.pow(flightSpeedMs, 2);
    const tipBendingDeflectionMm = (qDyn * Math.pow(currentSpanM / 2, 3) * effectiveCL) / 450000;

    // Actuator Power for In-Flight Morphing
    const morphingActuatorPowerW = 45 + Math.abs(wingSweepDeg * 2.8) + (spanExtensionPct * 3.5) + (qDyn * 0.08);

    // Speed Sweep Profile for Chart
    const speedProfile = [];
    for (let v = 20; v <= 110; v += 10) {
      const q = 0.5 * rho * Math.pow(v, 2);
      const dragN = effectiveCD * q * (currentSpanM * preset.rootChordM * 0.85);
      const pwrReq = dragN * v;
      speedProfile.push({
        speedMs: v,
        dragN: parseFloat(dragN.toFixed(1)),
        powerKw: parseFloat((pwrReq / 1000).toFixed(2)),
        flutterThreshold: parseFloat(flutterSpeedMs.toFixed(1)),
      });
    }

    return {
      currentSpanM,
      effectiveAspectR,
      effectiveCL,
      effectiveCD,
      liftToDragRatio,
      flutterSpeedMs,
      flutterSafetyMargin,
      isFlutterUnstable,
      tipBendingDeflectionMm,
      morphingActuatorPowerW,
      speedProfile,
    };
  }, [preset, wingSweepDeg, spanExtensionPct, camberMorphDeg, flightSpeedMs, flightAltitudeM]);

  // Animation Loop for Wing Flex and Airflow
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setAnimPhase((prev) => (prev + 1) % 360);
    }, 40);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // 2D Morphing Wing Top-Down & Aeroelastic Flex Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dark Carbon Fiber Aero Grid
    ctx.fillStyle = '#060c18';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const centerX = w / 2;
    const centerY = h / 2 + 30;

    // Draw Morphing Wings (Top View)
    ctx.save();
    ctx.translate(centerX, centerY);

    // Fuselage
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 90, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Left and Right Morphing Wing Planform
    const halfSpanPixels = (calculations.currentSpanM / 4.5) * 200;
    const sweepRad = (wingSweepDeg * Math.PI) / 180;
    const sweepOffsetX = Math.sin(sweepRad) * halfSpanPixels * 0.7;

    // Dynamic aeroelastic flutter tip vibration
    const flutterVib = calculations.isFlutterUnstable ? Math.sin(animPhase * 0.8) * 12 : Math.sin(animPhase * 0.1) * 2;

    // Stress Color: Cyan to Amber to Red if near flutter
    const wingColor = calculations.isFlutterUnstable ? '#ef4444' : calculations.flutterSafetyMargin < 0.2 ? '#f59e0b' : '#38bdf8';

    // Left Wing
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = wingColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-16, -15);
    ctx.lineTo(-halfSpanPixels, sweepOffsetX - 5 + flutterVib);
    ctx.lineTo(-halfSpanPixels, sweepOffsetX + 25 + flutterVib);
    ctx.lineTo(-16, 45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Wing
    ctx.beginPath();
    ctx.moveTo(16, -15);
    ctx.lineTo(halfSpanPixels, sweepOffsetX - 5 - flutterVib);
    ctx.lineTo(halfSpanPixels, sweepOffsetX + 25 - flutterVib);
    ctx.lineTo(16, 45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Morphing Trailing Edge Actuator Nodes (Compliant Camber)
    ctx.fillStyle = '#10b981';
    for (let i = 1; i <= 4; i++) {
      const frac = i / 5;
      const lx = -16 - (halfSpanPixels - 16) * frac;
      const ly = 45 + (sweepOffsetX + 25 - 45) * frac;
      ctx.beginPath();
      ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
      ctx.fill();

      const rx = 16 + (halfSpanPixels - 16) * frac;
      const ry = 45 + (sweepOffsetX + 25 - 45) * frac;
      ctx.beginPath();
      ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // HUD Text
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px monospace';
    ctx.fillText(`SWEEP: ${wingSweepDeg}° | SPAN: ${calculations.currentSpanM.toFixed(2)} m (AR: ${calculations.effectiveAspectR.toFixed(1)})`, 14, 22);
    ctx.fillText(`SPEED: ${flightSpeedMs} m/s | FLUTTER LIMIT: ${calculations.flutterSpeedMs.toFixed(1)} m/s`, 14, 38);
    ctx.fillStyle = calculations.isFlutterUnstable ? '#ef4444' : '#34d399';
    ctx.fillText(`AEROELASTIC MARGIN: ${(calculations.flutterSafetyMargin * 100).toFixed(0)}% | L/D: ${calculations.liftToDragRatio.toFixed(1)} | ACTUATOR: ${calculations.morphingActuatorPowerW.toFixed(0)} W`, 14, 54);
  }, [animPhase, wingSweepDeg, spanExtensionPct, calculations, preset]);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-indigo-900/50 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 rounded-2xl border border-indigo-500/40 text-indigo-400">
              <Layers className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Морфинг Крыла, Изменяемая Стреловидность & Флаттер БПЛА</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Morphing Wing Aeroelasticity
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Динамическая адаптация геометрии в полете: переход между режимами барражирования ($L/D &gt; 22$) и скоростного прорыва, граница дивергенции и флаттера.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Пауза' : 'Пуск'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setWingSweepDeg(0);
                setSpanExtensionPct(0);
                setCamberMorphDeg(4);
              }}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
              title="Базовая форма"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Presets Grid */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {MORPHING_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedPresetIdx(idx);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer text-xs flex flex-col justify-between gap-1.5 ${
                selectedPresetIdx === idx
                  ? 'bg-gradient-to-br from-indigo-950/90 to-slate-900 border-indigo-400 text-white shadow-lg ring-1 ring-indigo-400/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <div className="font-bold text-indigo-300 flex items-center justify-between">
                <span>{p.name.split('(')[0]}</span>
                {selectedPresetIdx === idx && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{p.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Аэродинамическое L/D</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {calculations.liftToDragRatio.toFixed(1)} <span className="text-xs text-slate-400">ед.</span>
          </div>
          <div className="text-[10px] text-slate-500">CL/CD полярная точка</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Запас по Флаттеру</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-2xl font-black ${calculations.isFlutterUnstable ? 'text-rose-400' : 'text-emerald-400'}`}>
            {(calculations.flutterSafetyMargin * 100).toFixed(0)} <span className="text-xs text-slate-400">%</span>
          </div>
          <div className="text-[10px] text-slate-500">Порог: {calculations.flutterSpeedMs.toFixed(0)} м/с</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Текущий Размах</span>
            <Sliders className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {calculations.currentSpanM.toFixed(2)} <span className="text-xs text-slate-400">м</span>
          </div>
          <div className="text-[10px] text-slate-500">Удлинение AR: {calculations.effectiveAspectR.toFixed(1)}</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Мощность Морфинга</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {calculations.morphingActuatorPowerW.toFixed(0)} <span className="text-xs text-slate-400">Вт</span>
          </div>
          <div className="text-[10px] text-slate-500">Привод актуаторов</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Прогиб Конца Крыла</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">
            {calculations.tipBendingDeflectionMm.toFixed(0)} <span className="text-xs text-slate-400">мм</span>
          </div>
          <div className="text-[10px] text-slate-500">Упругая деформация</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Скорость Полета V</span>
            <Gauge className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-black text-violet-400">
            {flightSpeedMs} <span className="text-xs text-slate-400">м/с</span>
          </div>
          <div className="text-[10px] text-slate-500">{(flightSpeedMs * 3.6).toFixed(0)} км/ч</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Параметры Геометрии & Морфинга</span>
            </h3>

            {/* Wing Sweep */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Угол Стреловидности Крыла χ</span>
                <span className="text-indigo-300 font-bold">{wingSweepDeg}°</span>
              </div>
              <input
                type="range"
                min="0"
                max={preset.maxSweepDeg}
                step="1"
                value={wingSweepDeg}
                onChange={(e) => setWingSweepDeg(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
            </div>

            {/* Span Extension */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Телескопическое Удлинение Размаха</span>
                <span className="text-cyan-300 font-bold">+{spanExtensionPct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="5"
                value={spanExtensionPct}
                onChange={(e) => setSpanExtensionPct(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Camber Morphing */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Бесшарнирная Кривизна Профиля (Camber)</span>
                <span className="text-teal-300 font-bold">{camberMorphDeg}°</span>
              </div>
              <input
                type="range"
                min="-2"
                max="10"
                step="1"
                value={camberMorphDeg}
                onChange={(e) => setCamberMorphDeg(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
            </div>

            {/* Flight Speed */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Скорость Полета БПЛА V</span>
                <span className="text-amber-300 font-bold">{flightSpeedMs} м/с</span>
              </div>
              <input
                type="range"
                min="25"
                max="105"
                step="2"
                value={flightSpeedMs}
                onChange={(e) => setFlightSpeedMs(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Flight Altitude */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Высота Полета H</span>
                <span className="text-violet-300 font-bold">{flightAltitudeM} м</span>
              </div>
              <input
                type="range"
                min="200"
                max="6000"
                step="200"
                value={flightAltitudeM}
                onChange={(e) => setFlightAltitudeM(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-400"
              />
            </div>
          </div>
        </div>

        {/* Right 2D Animated Top-Down Wing & Drag/Power vs Speed Chart (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Animated 2D Viewport */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>2D-Визуализация Морфинга Крыла & Упругого Флаттера</span>
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                Aeroelastic Planform View
              </span>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-indigo-900/40 aspect-[16/9] w-full bg-slate-950">
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Speed vs Drag & Power Chart */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>Потребная Мощность (кВт) и Сопротивление (Н) от Скорости</span>
              </h3>
              <FullscreenGraphButton
                domain="uav_guidance"
                title="Аэроупругость и сопротивление адаптивного морфинг-крыла БПЛА"
              />
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calculations.speedProfile}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="speedMs" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Скорость полета V (м/с)', position: 'insideBottom', offset: -5 }} />
                  <YAxis yAxisId="pwr" stroke="#38bdf8" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="drg" orientation="right" stroke="#a855f7" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line yAxisId="pwr" type="monotone" dataKey="powerKw" name="Потребная мощность (кВт)" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
                  <Line yAxisId="drg" type="monotone" dataKey="dragN" name="Полное сопротивление (Н)" stroke="#a855f7" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
