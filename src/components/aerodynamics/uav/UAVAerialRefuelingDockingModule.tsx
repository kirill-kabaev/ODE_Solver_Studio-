// ============================================================================
// UAV Autonomous Aerial Refueling & Probe-and-Drogue Docking Module
// Bow Wave Aerodynamics, Drogue Basket Turbulence, Visual Servoing & CG Rebalancing
// ============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Fuel,
  Crosshair,
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
  Zap,
  Target,
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

export interface RefuelingPreset {
  id: string;
  name: string;
  receiverMassDryKg: number;
  maxFuelTransferKg: number;
  probeLengthM: number;
  approachSpeedMs: number;
  drogueBasketDiameterM: number;
  transferRateKgMin: number;
  description: string;
}

export const REFUELING_PRESETS: RefuelingPreset[] = [
  {
    id: 'tactical_stealth_uav_dock',
    name: 'Малозаметный Ударно-Разведывательный БПЛА (Сухой вес 450кг, +250кг топлива)',
    receiverMassDryKg: 450,
    maxFuelTransferKg: 250,
    probeLengthM: 1.6,
    approachSpeedMs: 65,
    drogueBasketDiameterM: 0.65,
    transferRateKgMin: 60,
    description: 'Автоматическая стыковка конуса танкера с выдвижной штангой БПЛА в условиях оптического распознавания маркерного кольца.',
  },
  {
    id: 'mule_cargo_uav_dock',
    name: 'Тяжелый Транспортный БПЛА (Сухой вес 1200кг, +800кг топлива)',
    receiverMassDryKg: 1200,
    maxFuelTransferKg: 800,
    probeLengthM: 2.2,
    approachSpeedMs: 80,
    drogueBasketDiameterM: 0.80,
    transferRateKgMin: 150,
    description: 'Высокоскоростная передача топлива под давлением для межконтинентального беспосадочного перелета.',
  },
  {
    id: 'mini_scout_drogue_dock',
    name: 'Легкий Тактический Дозаправляемый БПЛА (Сухой вес 85кг, +40кг топлива)',
    receiverMassDryKg: 85,
    maxFuelTransferKg: 40,
    probeLengthM: 0.9,
    approachSpeedMs: 40,
    drogueBasketDiameterM: 0.45,
    transferRateKgMin: 20,
    description: 'Компактная штанга с магнитным замком-ловителем для автономной дозаправки от самолета-матки.',
  },
];

export const UAVAerialRefuelingDockingModule: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [relativeDistanceM, setRelativeDistanceM] = useState<number>(3.5); // 0 (latched) to 12 m
  const [turbulenceIntensityPct, setTurbulenceIntensityPct] = useState<number>(25); // 0 to 100 %
  const [bowWaveCouplingPct, setBowWaveCouplingPct] = useState<number>(45); // 0 to 100 %
  const [currentFuelLoadedKg, setCurrentFuelLoadedKg] = useState<number>(0); // 0 to maxFuelTransferKg
  const [visionTrackingQualityPct, setVisionTrackingQualityPct] = useState<number>(92); // 50 to 100 %

  // Simulation & Animation
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTick, setSimTick] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const preset = REFUELING_PRESETS[selectedPresetIdx];

  // Mathematical Aerial Refueling, Drogue Turbulence & CG Shift Computations
  const calculations = useMemo(() => {
    // Bow Wave Aerodynamic Repulsion:
    // As probe approaches drogue basket (< 1.5m), the high-pressure stagnation zone
    // ahead of the receiver nose pushes the lightweight drogue basket away (Bow Wave Effect).
    const bowWaveDistFactor = Math.max(0, 1 - relativeDistanceM / 2.0);
    const droguePushDeflectionCm = (bowWaveDistFactor * 14 * (bowWaveCouplingPct / 100));

    // Atmospheric & Tanker Wake Vortex Turbulence perturbation (RMS drogue basket drift)
    const turbulenceRMS_Cm = (turbulenceIntensityPct / 100) * 18;
    const totalDrogueOffsetCm = droguePushDeflectionCm + turbulenceRMS_Cm * 0.7;

    // Contact Status
    const isDocked = relativeDistanceM <= 0.3;
    const isContactZone = relativeDistanceM <= 1.2 && relativeDistanceM > 0.3;
    const dockingToleranceRadiusCm = (preset.drogueBasketDiameterM * 100) / 2;
    const isAlignmentSuccessful = totalDrogueOffsetCm <= dockingToleranceRadiusCm;

    // Fuel Transfer Duration and Mass Flow Rate
    const fuelProgressPct = (currentFuelLoadedKg / preset.maxFuelTransferKg) * 100;
    const timeRemainingSec = isDocked && fuelProgressPct < 100 
      ? ((preset.maxFuelTransferKg - currentFuelLoadedKg) / (preset.transferRateKgMin / 60))
      : 0;

    // Inflight Center of Gravity (CG) Shift during Refueling
    // CG_shift_mm = (m_fuel * x_tank) / (m_dry + m_fuel)
    const fuelTankStationOffsetM = 0.35; // tank is 350mm aft of baseline dry CG
    const totalMassKg = preset.receiverMassDryKg + currentFuelLoadedKg;
    const cgShiftMm = (currentFuelLoadedKg * fuelTankStationOffsetM * 1000) / totalMassKg;

    // Flight Range Extension Added
    const specificAirRangeKmPerKg = 4.2; // km per kg fuel
    const addedRangeKm = currentFuelLoadedKg * specificAirRangeKmPerKg;

    // Approach trajectory profile data for chart
    const trajectoryProfile = [];
    for (let d = 10; d >= 0; d -= 0.5) {
      const bFactor = Math.max(0, 1 - d / 2.0);
      const push = bFactor * 14 * (bowWaveCouplingPct / 100);
      const totalDisp = push + turbulenceRMS_Cm * 0.7;
      trajectoryProfile.push({
        distM: parseFloat(d.toFixed(1)),
        drogueDisplacementCm: parseFloat(totalDisp.toFixed(1)),
        captureRadiusCm: parseFloat(dockingToleranceRadiusCm.toFixed(1)),
        bowPushCm: parseFloat(push.toFixed(1)),
      });
    }

    return {
      droguePushDeflectionCm,
      turbulenceRMS_Cm,
      totalDrogueOffsetCm,
      dockingToleranceRadiusCm,
      isDocked,
      isContactZone,
      isAlignmentSuccessful,
      fuelProgressPct,
      timeRemainingSec,
      totalMassKg,
      cgShiftMm,
      addedRangeKm,
      trajectoryProfile,
    };
  }, [preset, relativeDistanceM, turbulenceIntensityPct, bowWaveCouplingPct, currentFuelLoadedKg]);

  // Simulation Clock Tick (Refueling transfer loop)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSimTick((prev) => (prev + 1) % 400);

      // Auto-transfer fuel if docked
      if (calculations.isDocked && currentFuelLoadedKg < preset.maxFuelTransferKg) {
        setCurrentFuelLoadedKg((prev) => Math.min(preset.maxFuelTransferKg, prev + (preset.transferRateKgMin / 60) * 0.1));
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying, calculations.isDocked, currentFuelLoadedKg, preset]);

  // 2D Refueling Visual Servoing & Drogue/Probe Alignment Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Sky & High-Altitude Horizon
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#0c1b33');
    skyGrad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Speed streaks (wind flow)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const lineY = (i * 45 + simTick * 8) % h;
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(w, lineY);
      ctx.stroke();
    }

    // Tanker Refueling Hose & Drogue Basket (Left side)
    const hoseOriginX = 40;
    const hoseOriginY = 80;
    const drogueBaseX = 220;
    const drogueTurbY = Math.sin(simTick * 0.12) * (calculations.turbulenceRMS_Cm * 1.5) + (calculations.droguePushDeflectionCm * 1.2);
    const drogueBaseY = 160 + drogueTurbY;

    // Catena curve for flexible hose
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(hoseOriginX, hoseOriginY);
    ctx.bezierCurveTo(hoseOriginX + 60, hoseOriginY + 60, drogueBaseX - 60, drogueBaseY - 20, drogueBaseX, drogueBaseY);
    ctx.stroke();

    // Drogue Funnel Basket (Conical Drogue)
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(drogueBaseX - 35, drogueBaseY - 24);
    ctx.lineTo(drogueBaseX, drogueBaseY);
    ctx.lineTo(drogueBaseX - 35, drogueBaseY + 24);
    ctx.closePath();
    ctx.fill();

    // Basket Ring Target
    ctx.strokeStyle = calculations.isAlignmentSuccessful ? '#10b981' : '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(drogueBaseX, drogueBaseY, 6, 22, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Receiver UAV & Nose Probe (Right side)
    // Distance mapped to pixel offset
    const probeTipX = drogueBaseX + relativeDistanceM * 35;
    const probeTipY = 160;

    // Receiver Probe Rod
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(probeTipX, probeTipY);
    ctx.lineTo(probeTipX + 70, probeTipY);
    ctx.stroke();

    // Probe Latching Nozzle Head
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(probeTipX, probeTipY, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Receiver UAV Nose & Canopy
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(probeTipX + 60, probeTipY - 8);
    ctx.lineTo(probeTipX + 220, probeTipY - 35);
    ctx.lineTo(probeTipX + 220, probeTipY + 35);
    ctx.lineTo(probeTipX + 60, probeTipY + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Visual Servoing HUD Target Reticle (Computer Vision Tracking)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(drogueBaseX - 25, drogueBaseY - 25, 50, 50);

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(drogueBaseX - 35, drogueBaseY);
    ctx.lineTo(drogueBaseX + 35, drogueBaseY);
    ctx.moveTo(drogueBaseX, drogueBaseY - 35);
    ctx.lineTo(drogueBaseX, drogueBaseY + 35);
    ctx.stroke();

    // Fuel Flow Animation when Docked
    if (calculations.isDocked) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(drogueBaseX, drogueBaseY);
      ctx.lineTo(probeTipX + 70, probeTipY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // HUD Text
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px monospace';
    ctx.fillText(`PROBE-DROGUE DIST: ${relativeDistanceM.toFixed(2)} m | OFFSET: ${calculations.totalDrogueOffsetCm.toFixed(1)} cm (TOL: ±${calculations.dockingToleranceRadiusCm.toFixed(1)} cm)`, 14, 22);
    ctx.fillText(`BOW WAVE DISPLACEMENT: ${calculations.droguePushDeflectionCm.toFixed(1)} cm | TURBULENCE RMS: ${calculations.turbulenceRMS_Cm.toFixed(1)} cm`, 14, 38);
    ctx.fillStyle = calculations.isDocked ? '#34d399' : calculations.isContactZone ? '#fbbf24' : '#94a3b8';
    ctx.fillText(`STATUS: ${calculations.isDocked ? 'LATCHED & TRANSFERRING FUEL' : calculations.isContactZone ? 'IN CONTACT CONE' : 'APPROACHING TANKER'} | FUEL: ${currentFuelLoadedKg.toFixed(1)} / ${preset.maxFuelTransferKg} kg (+${calculations.addedRangeKm.toFixed(0)} km)`, 14, 54);
  }, [simTick, relativeDistanceM, calculations, currentFuelLoadedKg, preset]);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-emerald-900/50 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl border border-emerald-500/40 text-emerald-400">
              <Fuel className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Автономная Дозаправка в Воздухе & Стыковка БПЛА (AAR)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Autonomous Aerial Refueling
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Аэродинамический эффект головной волны (Bow Wave), турбулентность конуса (Drogue Basket), визуальное наведение и смещение центровки ΔX_CG.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Пауза' : 'Пуск'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRelativeDistanceM(3.5);
                setCurrentFuelLoadedKg(0);
              }}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
              title="Сброс"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Presets Grid */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {REFUELING_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedPresetIdx(idx);
                setCurrentFuelLoadedKg(0);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer text-xs flex flex-col justify-between gap-1.5 ${
                selectedPresetIdx === idx
                  ? 'bg-gradient-to-br from-emerald-950/90 to-slate-900 border-emerald-400 text-white shadow-lg ring-1 ring-emerald-400/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <div className="font-bold text-emerald-300 flex items-center justify-between">
                <span>{p.name.split('(')[0]}</span>
                {selectedPresetIdx === idx && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
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
            <span>Статус Стыковки</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-xl font-black ${calculations.isDocked ? 'text-emerald-400' : calculations.isContactZone ? 'text-amber-400' : 'text-slate-300'}`}>
            {calculations.isDocked ? 'ЗАМКНУТ (LATCH)' : calculations.isContactZone ? 'КОНТАКТ' : 'СБЛИЖЕНИЕ'}
          </div>
          <div className="text-[10px] text-slate-500">Дистанция: {relativeDistanceM.toFixed(2)} м</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Заправлено Топлива</span>
            <Fuel className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {currentFuelLoadedKg.toFixed(0)} <span className="text-xs text-slate-400">/ {preset.maxFuelTransferKg} кг</span>
          </div>
          <div className="text-[10px] text-slate-500">{calculations.fuelProgressPct.toFixed(0)}% емкости</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Прирост Дальности</span>
            <TrendingUp className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            +{calculations.addedRangeKm.toFixed(0)} <span className="text-xs text-slate-400">км</span>
          </div>
          <div className="text-[10px] text-slate-500">Радиус действия</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Смещение Центровки</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            +{calculations.cgShiftMm.toFixed(1)} <span className="text-xs text-slate-400">мм</span>
          </div>
          <div className="text-[10px] text-slate-500">Масса: {calculations.totalMassKg.toFixed(0)} кг</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Снос Конуса (Bow Wave)</span>
            <Wind className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {calculations.droguePushDeflectionCm.toFixed(1)} <span className="text-xs text-slate-400">см</span>
          </div>
          <div className="text-[10px] text-slate-500">Головная волна носа</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Скорость Заправки</span>
            <Zap className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-black text-violet-400">
            {preset.transferRateKgMin} <span className="text-xs text-slate-400">кг/мин</span>
          </div>
          <div className="text-[10px] text-slate-500">Осталось: {calculations.timeRemainingSec.toFixed(0)} с</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Параметры Сближения & Сервоприводов</span>
            </h3>

            {/* Relative Distance */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Дистанция Сближения «Штанга-Конус» D</span>
                <span className="text-emerald-300 font-bold">{relativeDistanceM.toFixed(2)} м</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="8.0"
                step="0.1"
                value={relativeDistanceM}
                onChange={(e) => setRelativeDistanceM(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

            {/* Bow Wave Coupling */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Интенсивность Головной Волны (Bow Wave Effect)</span>
                <span className="text-cyan-300 font-bold">{bowWaveCouplingPct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={bowWaveCouplingPct}
                onChange={(e) => setBowWaveCouplingPct(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Turbulence */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Спутная Турбулентность за Танкером</span>
                <span className="text-amber-300 font-bold">{turbulenceIntensityPct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                step="5"
                value={turbulenceIntensityPct}
                onChange={(e) => setTurbulenceIntensityPct(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Visual Tracking Quality */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Точность Оптического Сервопривода (Vision Servoing)</span>
                <span className="text-indigo-300 font-bold">{visionTrackingQualityPct}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                step="2"
                value={visionTrackingQualityPct}
                onChange={(e) => setVisionTrackingQualityPct(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
            </div>

            {/* Action Quick Dock / Disconnect */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setRelativeDistanceM(0.2)}
                className="flex-1 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer"
              >
                Выполнить Захват (Dock)
              </button>
              <button
                type="button"
                onClick={() => setRelativeDistanceM(4.0)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Расцепка (Disconnect)
              </button>
            </div>
          </div>
        </div>

        {/* Right 2D Animated Docking Viewport & Offset Chart (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Animated 2D Viewport */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-emerald-400" />
                <span>2D-Визуализация Наведения Штанги & Конуса Танкера</span>
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700">
                Visual Servoing Closed-Loop
              </span>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-emerald-900/40 aspect-[16/9] w-full bg-slate-950">
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Approach Distance vs Drogue Displacement Chart */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-teal-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-400" />
                <span>Смещение Конуса (см) от Дистанции Сближения (м)</span>
              </h3>
              <FullscreenGraphButton
                domain="uav_guidance"
                title="Динамика головной волны и точность стыковки при дозаправке БПЛА"
              />
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calculations.trajectoryProfile}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="distM" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Дистанция до конуса (м)', position: 'insideBottom', offset: -5 }} />
                  <YAxis stroke="#38bdf8" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="drogueDisplacementCm" name="Полное смещение конуса (см)" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="captureRadiusCm" name="Радиус ловушки (см)" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="bowPushCm" name="Отжатие волной (см)" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
