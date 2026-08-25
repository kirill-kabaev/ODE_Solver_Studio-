// ============================================================================
// UAV Wing-In-Ground Effect (WIG) Ekranoplan Aerodynamics Module
// Air Cushion Cushioning, Induced Drag Suppression, Pitch Inherent Stability
// & Obstacle Jump Dynamics
// ============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Waves,
  Navigation,
  Activity,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Shield,
  Gauge,
  Layers,
  Wind,
  TrendingUp,
  Anchor,
  Zap,
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

export interface EkranoplanPreset {
  id: string;
  name: string;
  wingspanM: number;
  meanChordM: number;
  grossWeightKg: number;
  cruisingSpeedMs: number;
  cruiseAltitudeRelChord: number; // h/c ratio (e.g. 0.1 to 0.3)
  endplateDepthM: number;
  description: string;
}

export const EKRANOPLAN_PRESETS: EkranoplanPreset[] = [
  {
    id: 'coastal_cargo_wig_50kg',
    name: 'Морской Грузовой Экраноплан БПЛА (Размах 3.2м, 50кг)',
    wingspanM: 3.2,
    meanChordM: 1.2,
    grossWeightKg: 48,
    cruisingSpeedMs: 32,
    cruiseAltitudeRelChord: 0.15,
    endplateDepthM: 0.25,
    description: 'Низколетящий патрульно-грузовой экраноплан типа «липгиш» (Lippisch reverse-delta) с развитыми концевыми шайбами.',
  },
  {
    id: 'amphibious_scout_wig_15kg',
    name: 'Разведывательный Амфибийный БПЛА (Размах 2.0м, 14кг)',
    wingspanM: 2.0,
    meanChordM: 0.8,
    grossWeightKg: 14,
    cruisingSpeedMs: 24,
    cruiseAltitudeRelChord: 0.12,
    endplateDepthM: 0.15,
    description: 'Малозаметный прибрежный гидро-БПЛА для полетов над водной гладью и реками ниже горизонта морских РЛС.',
  },
  {
    id: 'heavy_ekranolyot_hybrid_120kg',
    name: 'Тяжелый Экранолёт БПЛА с Режимом Подскока (120кг)',
    wingspanM: 4.8,
    meanChordM: 1.6,
    grossWeightKg: 120,
    cruisingSpeedMs: 42,
    cruiseAltitudeRelChord: 0.20,
    endplateDepthM: 0.35,
    description: 'Экранолёт с возможностью динамического набора высоты до 150 м («подскок») для преодоления мостов и судов.',
  },
];

export const UAVGroundEffectEkranoplanModule: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [flightHeightM, setFlightHeightM] = useState<number>(0.25); // 0.05 to 2.5 m
  const [flightSpeedMs, setFlightSpeedMs] = useState<number>(30); // 15 to 55 m/s
  const [wingAoADeg, setWingAoADeg] = useState<number>(3.5); // 0 to 10 deg
  const [seaWaveHeightM, setSeaWaveHeightM] = useState<number>(0.3); // 0 to 1.5 m
  const [flapDeflectionDeg, setFlapDeflectionDeg] = useState<number>(10); // 0 to 25 deg

  // Simulation & Animation
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTick, setSimTick] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const preset = EKRANOPLAN_PRESETS[selectedPresetIdx];

  // Mathematical Ground Effect & Aerodynamic Computations
  const calculations = useMemo(() => {
    const rhoAir = 1.225;
    const g = 9.81;
    const wingAreaS = preset.wingspanM * preset.meanChordM;
    const aspectRatio = Math.pow(preset.wingspanM, 2) / wingAreaS;

    // Relative ground clearance: h_bar = h / c
    const hBar = Math.max(0.04, flightHeightM / preset.meanChordM);

    // Wieselsberger / Tani ground effect reduction factor for induced drag:
    // sigma(h/b) = (16 * (h/b)^2) / (1 + 16 * (h/b)^2) approx, or modified for h/c
    const hOverSpan = flightHeightM / preset.wingspanM;
    const inducedDragFactor = Math.min(1.0, (16 * Math.pow(hOverSpan, 2)) / (1 + 16 * Math.pow(hOverSpan, 2) + 0.05));

    // Dynamic Air Cushion Ram-Pressure Lift Increment:
    // Delta_CL_ram = 0.5 * (flap / 10) * (1 / (hBar^0.75))
    const baseCL = 0.35 + 0.08 * wingAoADeg + 0.02 * flapDeflectionDeg;
    const groundEffectLiftMultiplier = 1 + (0.35 / Math.pow(hBar + 0.08, 0.7));
    const effectiveCL = baseCL * groundEffectLiftMultiplier;

    // Induced & Profile Drag
    const baseCD0 = 0.028;
    const oswaldEfficiency = 0.85 + (preset.endplateDepthM / preset.meanChordM) * 0.4;
    const effectiveInducedCD = (Math.pow(effectiveCL, 2) / (Math.PI * aspectRatio * oswaldEfficiency)) * inducedDragFactor;
    const effectiveCD = baseCD0 + effectiveInducedCD;

    // Lift and Drag Forces
    const dynamicPressureQ = 0.5 * rhoAir * Math.pow(flightSpeedMs, 2);
    const totalLiftN = effectiveCL * dynamicPressureQ * wingAreaS;
    const totalDragN = effectiveCD * dynamicPressureQ * wingAreaS;
    const liftToDragRatio = totalLiftN / Math.max(1, totalDragN);

    // Free Flight (out of ground effect) comparison
    const freeFlightCD = baseCD0 + (Math.pow(baseCL, 2) / (Math.PI * aspectRatio * oswaldEfficiency));
    const freeFlightLiftToDrag = baseCL / freeFlightCD;
    const efficiencyBoostPercent = ((liftToDragRatio - freeFlightLiftToDrag) / freeFlightLiftToDrag) * 100;

    // Thrust & Power Required
    const thrustRequiredN = totalDragN;
    const enginePowerRequiredW = thrustRequiredN * flightSpeedMs;

    // Pitch Stability (Aerodynamic Center Shift delta_X_ac)
    // As h decreases, AC shifts backwards, requiring tail down-force
    const acShiftPercentChord = (1 / (hBar + 0.2)) * 3.5;
    const isPitchStable = acShiftPercentChord <= 28;

    // Water Surface Wave Clearance Margin
    const waveClearanceMarginM = flightHeightM - seaWaveHeightM / 2;
    const isWaveCollisionRisk = waveClearanceMarginM < 0.1;

    // Height Sweep Profile for Chart
    const profile = [];
    for (let h = 0.05; h <= 2.2; h += 0.15) {
      const h_b = h / preset.wingspanM;
      const h_c = h / preset.meanChordM;
      const sigma = Math.min(1.0, (16 * Math.pow(h_b, 2)) / (1 + 16 * Math.pow(h_b, 2) + 0.05));
      const cl = baseCL * (1 + 0.35 / Math.pow(h_c + 0.08, 0.7));
      const cdi = (Math.pow(cl, 2) / (Math.PI * aspectRatio * oswaldEfficiency)) * sigma;
      const cd = baseCD0 + cdi;
      const ld = cl / cd;

      profile.push({
        heightM: parseFloat(h.toFixed(2)),
        liftToDrag: parseFloat(ld.toFixed(1)),
        inducedFactor: parseFloat(sigma.toFixed(2)),
        liftForceN: parseFloat((cl * dynamicPressureQ * wingAreaS).toFixed(0)),
      });
    }

    return {
      hBar,
      effectiveCL,
      effectiveCD,
      totalLiftN,
      totalDragN,
      liftToDragRatio,
      freeFlightLiftToDrag,
      efficiencyBoostPercent,
      thrustRequiredN,
      enginePowerRequiredW,
      acShiftPercentChord,
      isPitchStable,
      waveClearanceMarginM,
      isWaveCollisionRisk,
      profile,
    };
  }, [preset, flightHeightM, flightSpeedMs, wingAoADeg, seaWaveHeightM, flapDeflectionDeg]);

  // Animation Tick
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSimTick((prev) => (prev + 1) % 400);
    }, 40);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // 2D Dynamic Sea Wave & Ekranoplan Air Cushion Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dark Maritime Sky
    ctx.fillStyle = '#061325';
    ctx.fillRect(0, 0, w, h);

    // Water Surface with Animated Waves
    const waterBaseY = h - 60;
    ctx.fillStyle = '#0f2b48';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, waterBaseY);

    for (let x = 0; x <= w; x += 10) {
      const waveOffset = Math.sin((x + simTick * 6) * 0.03) * (seaWaveHeightM * 24);
      ctx.lineTo(x, waterBaseY + waveOffset);
    }
    ctx.lineTo(w, h);
    ctx.fill();

    // Wave foam crests
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 10) {
      const waveOffset = Math.sin((x + simTick * 6) * 0.03) * (seaWaveHeightM * 24);
      if (x === 0) ctx.moveTo(x, waterBaseY + waveOffset);
      else ctx.lineTo(x, waterBaseY + waveOffset);
    }
    ctx.stroke();

    // Ekranoplan position
    const droneX = 260;
    const droneAltitudePixels = flightHeightM * 70;
    const droneY = waterBaseY - droneAltitudePixels - 25;

    // Dynamic Air Cushion Ram Glow (between wing and water)
    const airCushionIntensity = Math.min(1.0, 0.15 / calculations.hBar);
    const grad = ctx.createRadialGradient(droneX, droneY + 15, 5, droneX, waterBaseY, 60);
    grad.addColorStop(0, `rgba(56, 189, 248, ${airCushionIntensity * 0.7})`);
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(droneX - 80, droneY, 160, waterBaseY - droneY + 10);

    // Draw Ekranoplan Silhouette
    ctx.save();
    ctx.translate(droneX, droneY);
    ctx.rotate((-wingAoADeg * Math.PI) / 180);

    // Fuselage & Nose
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(70, -2);
    ctx.quadraticCurveTo(0, -18, -60, -8);
    ctx.lineTo(-60, 8);
    ctx.quadraticCurveTo(0, 16, 70, -2);
    ctx.fill();

    // Wing Profile & Flap
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-30, 4, 60, 8);
    // Endplate Skirt
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-30, 12, 60, preset.endplateDepthM * 40);

    // T-Tail (high mounted horizontal stabilizer)
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-55, -34, 10, 28);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-65, -38, 30, 6);

    // Propeller Thrust Stream
    const propSpin = (simTick * 0.9) % Math.PI;
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(65, -2, 3, 18 * Math.abs(Math.cos(propSpin)) + 4, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // HUD Text
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px monospace';
    ctx.fillText(`HEIGHT: ${flightHeightM.toFixed(2)} m (h/c = ${calculations.hBar.toFixed(2)}) | SPEED: ${flightSpeedMs} m/s`, 14, 22);
    ctx.fillText(`AERODYNAMIC L/D: ${calculations.liftToDragRatio.toFixed(1)} (+${calculations.efficiencyBoostPercent.toFixed(0)}% vs Free Air) | THRUST: ${calculations.thrustRequiredN.toFixed(0)} N`, 14, 38);
    ctx.fillStyle = calculations.isWaveCollisionRisk ? '#ef4444' : '#34d399';
    ctx.fillText(`WAVE CLEARANCE: ${calculations.waveClearanceMarginM.toFixed(2)} m | POWER REQ: ${(calculations.enginePowerRequiredW / 1000).toFixed(2)} kW | PITCH AC SHIFT: ${calculations.acShiftPercentChord.toFixed(1)}%`, 14, 54);
  }, [simTick, flightHeightM, flightSpeedMs, wingAoADeg, seaWaveHeightM, calculations, preset]);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-cyan-900/50 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl border border-cyan-500/40 text-cyan-400">
              <Waves className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Экраноплан & WIG-Эффект БПЛА: Динамическая Воздушная Подушка</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Wing-In-Ground Effect (WIG)
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Моделирование резкого падения индуктивного сопротивления, аэродинамического качества $L/D$ до 28+ и устойчивости полета над волнами.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Пауза' : 'Пуск'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSimTick(0)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
              title="Сброс"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Presets Grid */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {EKRANOPLAN_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedPresetIdx(idx);
                setFlightSpeedMs(p.cruisingSpeedMs);
                setFlightHeightM(p.meanChordM * p.cruiseAltitudeRelChord);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer text-xs flex flex-col justify-between gap-1.5 ${
                selectedPresetIdx === idx
                  ? 'bg-gradient-to-br from-cyan-950/90 to-slate-900 border-cyan-400 text-white shadow-lg ring-1 ring-cyan-400/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <div className="font-bold text-cyan-300 flex items-center justify-between">
                <span>{p.name.split('(')[0]}</span>
                {selectedPresetIdx === idx && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
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
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {calculations.liftToDragRatio.toFixed(1)} <span className="text-xs text-slate-400">ед.</span>
          </div>
          <div className="text-[10px] text-slate-500">Вне экрана: {calculations.freeFlightLiftToDrag.toFixed(1)}</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Прирост Эффективности</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            +{calculations.efficiencyBoostPercent.toFixed(0)} <span className="text-xs text-slate-400">%</span>
          </div>
          <div className="text-[10px] text-slate-500">Экономия топлива</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Относительная Высота h/c</span>
            <Gauge className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">
            {calculations.hBar.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500">Экранная зона &lt; 0.25</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Потребная Тяга</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {calculations.thrustRequiredN.toFixed(0)} <span className="text-xs text-slate-400">Н</span>
          </div>
          <div className="text-[10px] text-slate-500">Мощность: {(calculations.enginePowerRequiredW / 1000).toFixed(1)} кВт</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Запас от Волн</span>
            <Waves className="w-4 h-4 text-teal-400" />
          </div>
          <div className={`text-2xl font-black ${calculations.isWaveCollisionRisk ? 'text-rose-400' : 'text-teal-400'}`}>
            {calculations.waveClearanceMarginM.toFixed(2)} <span className="text-xs text-slate-400">м</span>
          </div>
          <div className="text-[10px] text-slate-500">Волна: {seaWaveHeightM.toFixed(1)} м</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Смещение Фокуса (AC)</span>
            <Shield className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {calculations.acShiftPercentChord.toFixed(1)} <span className="text-xs text-slate-400">%c</span>
          </div>
          <div className="text-[10px] text-slate-500">{calculations.isPitchStable ? 'Продольно устойчив' : 'Неустойчив'}</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Параметры Полета над Экраном</span>
            </h3>

            {/* Flight Height */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Высота Полета над Поверхностью h</span>
                <span className="text-cyan-300 font-bold">{flightHeightM.toFixed(2)} м</span>
              </div>
              <input
                type="range"
                min="0.08"
                max="2.0"
                step="0.02"
                value={flightHeightM}
                onChange={(e) => setFlightHeightM(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Flight Speed */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Путевая Скорость V</span>
                <span className="text-sky-300 font-bold">{flightSpeedMs} м/с</span>
              </div>
              <input
                type="range"
                min="18"
                max="50"
                step="1"
                value={flightSpeedMs}
                onChange={(e) => setFlightSpeedMs(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>

            {/* Wing AoA */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Угол Атаки Крыла α</span>
                <span className="text-teal-300 font-bold">{wingAoADeg}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="8"
                step="0.5"
                value={wingAoADeg}
                onChange={(e) => setWingAoADeg(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
            </div>

            {/* Flap Deflection */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Отклонение Закрылка / Щитка (Ram Air Trap)</span>
                <span className="text-amber-300 font-bold">{flapDeflectionDeg}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={flapDeflectionDeg}
                onChange={(e) => setFlapDeflectionDeg(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Sea Wave Height */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Высота Морских Волн (Вздутие поверхности)</span>
                <span className="text-indigo-300 font-bold">{seaWaveHeightM.toFixed(1)} м</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.2"
                step="0.1"
                value={seaWaveHeightM}
                onChange={(e) => setSeaWaveHeightM(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* Right 2D Animated Sea Canvas & Height Profile Chart (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Animated 2D Viewport */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                <Waves className="w-4 h-4 text-cyan-400" />
                <span>2D-Визуализация Экрана & Динамической Воздушной Подушки</span>
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                Ground Effect Ram Pressure
              </span>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-cyan-900/40 aspect-[16/9] w-full bg-slate-950">
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* L/D vs Height Chart */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-sky-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                <span>Зависимость Аэродинамического Качества L/D от Высоты h (м)</span>
              </h3>
              <FullscreenGraphButton
                domain="uav_guidance"
                title="Аэродинамика экранного эффекта и экранопланов БПЛА"
              />
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calculations.profile}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="heightM" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Высота полета h (м)', position: 'insideBottom', offset: -5 }} />
                  <YAxis yAxisId="ld" stroke="#38bdf8" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="lift" orientation="right" stroke="#2dd4bf" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line yAxisId="ld" type="monotone" dataKey="liftToDrag" name="Качество L/D" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
                  <Line yAxisId="lift" type="monotone" dataKey="liftForceN" name="Подъемная сила (Н)" stroke="#2dd4bf" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
