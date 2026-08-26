// ============================================================================
// UAV Multi-Drop Munition Bay Aerodynamics & Store Separation Module
// Open Cavity Rossiter Acoustics, Shear Layer Instability, Safe Ejection & Drop Trajectories
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Crosshair,
  Shield,
  Activity,
  Sliders,
  Sparkles,
  Zap,
  Gauge,
  ArrowDownRight,
  TrendingDown,
  Layers,
  Wind,
  Volume2,
  AlertTriangle,
  RotateCcw,
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
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from 'recharts';
import { FullscreenGraphButton } from '../../telemetry/FullscreenGraphButton';

export interface MunitionBayPreset {
  id: string;
  name: string;
  bayLengthM: number; // L
  bayDepthM: number; // D (L/D cavity ratio)
  machNumber: number; // 0.3 - 0.75
  ejectionVelocityMps: number; // 2.5 - 6.5 m/s downward
  munitionMassKg: number;
  submunitionCount: number;
  description: string;
}

export const MUNITION_BAY_PRESETS: MunitionBayPreset[] = [
  {
    id: 'stealth_uav_heavy_glide',
    name: 'Малозаметный Ударный БПЛА (L/D = 5.5, M = 0.65)',
    bayLengthM: 2.2,
    bayDepthM: 0.40,
    machNumber: 0.65,
    ejectionVelocityMps: 4.8,
    munitionMassKg: 45,
    submunitionCount: 2,
    description: 'Глубокий отсек для планирующих корректируемых бомб. Высокий риск резонансных акустических мод Росситера при открытии створок.',
  },
  {
    id: 'rotary_micro_dispenser',
    name: 'Револьверный Барабан Микробоеприпасов (L/D = 3.2, M = 0.35)',
    bayLengthM: 0.95,
    bayDepthM: 0.30,
    machNumber: 0.35,
    ejectionVelocityMps: 3.2,
    munitionMassKg: 3.5,
    submunitionCount: 8,
    description: 'Высокоскоростной серийный сброс кумулятивных или осколочных микро-снарядов с интервалом 150 мс.',
  },
  {
    id: 'recon_drone_sensor_bay',
    name: 'Отсек Сброса Сонарных Буев & Развед-Дронов (L/D = 4.0, M = 0.45)',
    bayLengthM: 1.4,
    bayDepthM: 0.35,
    machNumber: 0.45,
    ejectionVelocityMps: 3.8,
    munitionMassKg: 12,
    submunitionCount: 4,
    description: 'Оптимизированная кромка со спойлером для срыва пограничного слоя и плавного безопасного сброса контейнеров.',
  },
];

export const UAVMunitionBaySeparationAeroModule: React.FC = () => {
  // Scenario & Controls
  const [selectedPresetId, setSelectedPresetId] = useState<string>('stealth_uav_heavy_glide');
  const [spoilerDeflectionDeg, setSpoilerDeflectionDeg] = useState<number>(35); // Cavity leading-edge acoustic spoiler (deg)
  const [ejectionForceN, setEjectionForceN] = useState<number>(1200); // Pneumatic/pyro ejector piston force (N)
  const [pitchRateAtSepDegS, setPitchRateAtSepDegS] = useState<number>(-12); // Nose-down pitch rate (deg/s)
  const [releaseAltitudeM, setReleaseAltitudeM] = useState<number>(3500); // Altitude ASL (m)

  const activePreset = useMemo(() => {
    return MUNITION_BAY_PRESETS.find((p) => p.id === selectedPresetId) || MUNITION_BAY_PRESETS[0];
  }, [selectedPresetId]);

  // Rossiter Acoustic Resonance & Store Separation Trajectory Model
  const separationAnalysis = useMemo(() => {
    const soundSpeed = 340.29 * Math.sqrt((288.15 - 0.0065 * releaseAltitudeM) / 288.15);
    const flightSpeedMps = activePreset.machNumber * soundSpeed;
    const airDensity = 1.225 * Math.pow(1 - (0.0065 * releaseAltitudeM) / 288.15, 4.256);
    const qDyn = 0.5 * airDensity * Math.pow(flightSpeedMps, 2);

    // Rossiter Cavity Acoustic Frequencies (Modes n = 1, 2, 3, 4):
    // f_n = (V / L) * ((n - alpha) / (M + 1/k))
    // Empirical constants: alpha ~ 0.25 (phase delay), k ~ 0.57 (vortex convection ratio)
    const alphaRossiter = 0.25;
    const kRossiter = 0.57;
    const rossiterModes = [1, 2, 3, 4].map((n) => {
      const freqHz = (flightSpeedMps / activePreset.bayLengthM) * ((n - alphaRossiter) / (activePreset.machNumber + 1 / kRossiter));
      // Spoiler attenuation (dB): reduces shear layer acoustic feedback
      const spoilerAttenuationDb = Math.min(18, (spoilerDeflectionDeg / 45) * 16.5);
      const baselineSPL = 145 + 10 * Math.log10(Math.max(1, activePreset.machNumber * 2)) + (n === 2 ? 6 : 0);
      const attenuatedSPL = baselineSPL - spoilerAttenuationDb;
      return {
        mode: `Мода ${n}`,
        frequencyHz: Math.round(freqHz),
        splDb: Number(attenuatedSPL.toFixed(1)),
        splRawDb: Number(baselineSPL.toFixed(1)),
      };
    });

    // Store Separation Trajectory & Clearance Margin
    // Equation of motion for falling store in cavity shear layer:
    // z''(t) = g + F_eject / m_store - F_updraft_suction(z) / m_store
    // theta''(t) = M_aero_pitch(z) / I_yy
    const ejectAcc = ejectionForceN / activePreset.munitionMassKg;
    const simDt = 0.01;
    const totalSimTime = 0.5; // First 500 ms are critical for safe separation
    const trajectoryPoints: Array<{
      timeMs: number;
      verticalClearanceM: number;
      pitchAngleDeg: number;
      safeSeparationBoundaryM: number;
    }> = [];

    let z = 0; // vertical drop (m downwards)
    let vz = activePreset.ejectionVelocityMps;
    let theta = 0; // pitch angle (deg)
    let qTheta = pitchRateAtSepDegS; // pitch rate (deg/s)
    let minMarginToFuselage = 999;

    const numSteps = Math.round(totalSimTime / simDt);
    for (let i = 0; i <= numSteps; i++) {
      const t = i * simDt;
      const timeMs = Math.round(t * 1000);

      // Cavity shear layer suction lift force (pulls store up if ejection is weak)
      // Suction decays exponentially as store moves below bay depth D
      const shearLayerSuction = z < activePreset.bayDepthM * 1.5
        ? qDyn * 0.12 * Math.exp(-z / (activePreset.bayDepthM * 0.8))
        : 0;

      const az = 9.81 + (t < 0.05 ? ejectAcc : 0) - shearLayerSuction / activePreset.munitionMassKg;
      vz += az * simDt;
      z += vz * simDt;

      // Aerodynamic pitch moment in shear layer
      const pitchAeroAcc = z < activePreset.bayDepthM * 1.2 ? -18.0 * activePreset.machNumber : 4.0;
      qTheta += pitchAeroAcc * simDt;
      theta += qTheta * simDt;

      // Store tail clearance margin relative to rear bay lip:
      const storeHalfLength = 0.45;
      const tailClearance = z - storeHalfLength * Math.sin(Math.abs(theta) * (Math.PI / 180));
      if (tailClearance < minMarginToFuselage) {
        minMarginToFuselage = tailClearance;
      }

      trajectoryPoints.push({
        timeMs,
        verticalClearanceM: Number(z.toFixed(3)),
        pitchAngleDeg: Number(theta.toFixed(1)),
        safeSeparationBoundaryM: Number((activePreset.bayDepthM + 0.1).toFixed(2)),
      });
    }

    const isSeparationSafe = minMarginToFuselage > 0.08 && vz > 1.5;

    return {
      soundSpeed: Number(soundSpeed.toFixed(1)),
      flightSpeedMps: Number(flightSpeedMps.toFixed(1)),
      rossiterModes,
      trajectoryPoints,
      minMarginToFuselage: Number((minMarginToFuselage * 100).toFixed(1)), // cm
      isSeparationSafe,
      peakSPLDb: rossiterModes[1]?.splDb || 142,
    };
  }, [
    activePreset,
    spoilerDeflectionDeg,
    ejectionForceN,
    pitchRateAtSepDegS,
    releaseAltitudeM,
  ]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-slate-100 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-600 text-white shadow-lg shadow-rose-500/20">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Аэродинамика Бомбоотсека БПЛА & Безопасное Отделение Суббоеприпасов
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-rose-950 text-rose-400 border border-rose-800/80">
                  Open Cavity Rossiter Acoustics & Store Ejection
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Моделирование акустических резонансов полости Росситера (140-160 дБ), срыва слоя смешения и траектории безопасного сброса
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
            separationAnalysis.isSeparationSafe
              ? 'bg-emerald-950/80 border-emerald-800/60 text-emerald-300'
              : 'bg-rose-950/80 border-rose-800/60 text-rose-300'
          }`}>
            <Shield className="w-4 h-4" />
            <span className="text-xs">Безопасность Отделения:</span>
            <span className="text-xs font-mono font-bold">
              {separationAnalysis.isSeparationSafe ? 'БЕЗОПАСНО (Зазор > 8 см)' : 'ОПАСНОСТЬ СТОЛКНОВЕНИЯ'}
            </span>
          </div>
        </div>
      </div>

      {/* Preset Geometry Selector */}
      <div className="my-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-rose-400" />
          Конфигурация Внутреннего Отсека Вооружения / Диспенсера:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {MUNITION_BAY_PRESETS.map((preset) => {
            const isSelected = preset.id === selectedPresetId;
            return (
              <button
                key={preset.id}
                onClick={() => setSelectedPresetId(preset.id)}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-rose-950/70 border-rose-400/80 shadow-md shadow-rose-950/40 ring-1 ring-rose-400/50'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/70'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-black ${isSelected ? 'text-rose-300' : 'text-slate-200'}`}>
                    L = {preset.bayLengthM} м, M = {preset.machNumber}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {preset.submunitionCount} ед. ({preset.munitionMassKg} кг)
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-bold mb-0.5">{preset.name}</p>
                <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 mb-6">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-cyan-400" />
              Угол Спойлера Полости (delta_spoiler):
            </span>
            <span className="font-mono text-cyan-300 font-bold">{spoilerDeflectionDeg}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={60}
            step={5}
            value={spoilerDeflectionDeg}
            onChange={(e) => setSpoilerDeflectionDeg(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Усилие Выталкивателя (F_eject):
            </span>
            <span className="font-mono text-amber-300 font-bold">{ejectionForceN} Н</span>
          </div>
          <input
            type="range"
            min={400}
            max={3000}
            step={100}
            value={ejectionForceN}
            onChange={(e) => setEjectionForceN(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              Начальный Тангаж при Сбросе (q_theta):
            </span>
            <span className="font-mono text-emerald-300 font-bold">{pitchRateAtSepDegS}°/с (пикирование)</span>
          </div>
          <input
            type="range"
            min={-25}
            max={5}
            step={1}
            value={pitchRateAtSepDegS}
            onChange={(e) => setPitchRateAtSepDegS(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-rose-400" />
              Высота Сброса (H_ASL):
            </span>
            <span className="font-mono text-rose-300 font-bold">{releaseAltitudeM} м</span>
          </div>
          <input
            type="range"
            min={500}
            max={8000}
            step={250}
            value={releaseAltitudeM}
            onChange={(e) => setReleaseAltitudeM(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
          />
        </div>
      </div>

      {/* Main Charts View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Chart 1: Store Separation Clearance Trajectory */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
              Траектория Вертикального Выхода Боеприпаса из Отсека z(t) (м)
            </h4>
            <FullscreenGraphButton domain="uav_guidance" />
          </div>

          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={separationAnalysis.trajectoryPoints} margin={{ left: 0, right: 15, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timeMs" stroke="#64748b" tick={{ fontSize: 10 }} unit=" мс" />
                <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fontSize: 10 }} unit=" м" domain={[0, 2.5]} />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" tick={{ fontSize: 10 }} unit="°" domain={[-30, 10]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#f43f5e', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line yAxisId="left" type="monotone" dataKey="verticalClearanceM" name="Вертикальный Зазор (м)" stroke="#f43f5e" strokeWidth={2.8} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="pitchAngleDeg" name="Угол Тангажа Боеприпаса (°)" stroke="#f59e0b" strokeWidth={1.8} dot={false} />
                <ReferenceLine yAxisId="left" y={activePreset.bayDepthM} stroke="#64748b" strokeDasharray="3 3" label={{ value: `Глубина отсека D (${activePreset.bayDepthM}м)`, fill: '#94a3b8', fontSize: 9 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Rossiter Cavity Acoustic Resonance Modes */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              Акустические Резонансные Моды Росситера (дБ) с Подавлением Спойлером
            </h4>
            <FullscreenGraphButton domain="uav_guidance" />
          </div>

          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={separationAnalysis.rossiterModes} margin={{ left: 0, right: 15, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="mode" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} unit=" дБ" domain={[110, 165]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#f59e0b', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="splRawDb" name="Без Спойлера (Шум дБ)" stroke="#f43f5e" strokeWidth={2.0} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="splDb" name="Со Спойлером (Подавление дБ)" stroke="#10b981" strokeWidth={2.6} />
                <ReferenceLine y={145} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Порог акустической усталости (145 дБ)', fill: '#ef4444', fontSize: 9 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Physics Insights / Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-rose-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Минимальный Зазор до Кромки:</div>
          <div className="text-lg font-black font-mono text-rose-300">
            {separationAnalysis.minMarginToFuselage} см
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Требуемый минимум &gt; 8.0 см</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Пиковый Уровень Шума в Отсеке:</div>
          <div className="text-lg font-black font-mono text-amber-300">
            {separationAnalysis.peakSPLDb} дБ
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Подавление спойлером -{(16.5 * (spoilerDeflectionDeg / 45)).toFixed(1)} дБ</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Скорость Полета при Сбросе:</div>
          <div className="text-lg font-black font-mono text-emerald-300">
            {separationAnalysis.flightSpeedMps} м/с (M = {activePreset.machNumber})
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Скорость звука: {separationAnalysis.soundSpeed} м/с</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-indigo-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Интервал Серийного Сброса:</div>
          <div className="text-lg font-black font-mono text-indigo-300">
            180 мс
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Исключение соударения в воздухе</div>
        </div>
      </div>
    </div>
  );
};
