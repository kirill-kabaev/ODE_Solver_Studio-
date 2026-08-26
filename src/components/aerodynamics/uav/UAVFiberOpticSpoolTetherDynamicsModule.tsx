// ============================================================================
// UAV Fiber-Optic Spool Guided FPV Drone & Tether Dynamics Module
// Micro-Fiber Deployment (10-20 km), Aerodynamic Filament Drag, Spool Tension & 100% EW Immunity
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Cable,
  Zap,
  Sliders,
  Activity,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  Sparkles,
  Layers,
  Shield,
  Wind,
  Gauge,
  Radio,
  Compass,
  ArrowDownRight,
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
  ReferenceLine,
} from 'recharts';
import { FullscreenGraphButton } from '../../telemetry/FullscreenGraphButton';

export interface FiberSpoolPreset {
  id: string;
  name: string;
  totalLengthKm: number;
  fiberDiameterUm: number; // 250 um standard or 125 um ultra-thin
  linearWeightGPerKm: number; // g/km (approx 35-70 g/km)
  tensileStrengthN: number; // Breaking tension ~ 15-40 N
  opticalLossDbPerKm: number; // 0.2-0.35 dB/km @ 1550nm
  maxDeploySpeedMps: number;
  description: string;
}

export const FIBER_SPOOL_PRESETS: FiberSpoolPreset[] = [
  {
    id: 'tactical_10km_standard',
    name: 'Тактическая Катушка 10 км (Standard 250 мкм)',
    totalLengthKm: 10,
    fiberDiameterUm: 250,
    linearWeightGPerKm: 65,
    tensileStrengthN: 28,
    opticalLossDbPerKm: 0.22,
    maxDeploySpeedMps: 45,
    description: 'Усиленный акрилатный буфер для устойчивости к механическим зацепам за ветки и осколки. Масса катушки ~650 г.',
  },
  {
    id: 'ultralight_15km_spool',
    name: 'Облегченная Катушка 15 км (Ultra-Thin 125 мкм)',
    totalLengthKm: 15,
    fiberDiameterUm: 125,
    linearWeightGPerKm: 32,
    tensileStrengthN: 16,
    opticalLossDbPerKm: 0.20,
    maxDeploySpeedMps: 55,
    description: 'Минимальное аэродинамическое сопротивление нити. Позволяет нести боевую часть повышенной массы до 2.5 кг.',
  },
  {
    id: 'long_range_20km_spool',
    name: 'Дальнобойная Катушка 20 км (Long-Range 200 мкм)',
    totalLengthKm: 20,
    fiberDiameterUm: 200,
    linearWeightGPerKm: 48,
    tensileStrengthN: 24,
    opticalLossDbPerKm: 0.21,
    maxDeploySpeedMps: 40,
    description: 'Оптимизирована для глубоких ударов на 15-20 км в тыл при полном радиомолчании и отсутствии излучения.',
  },
];

export const UAVFiberOpticSpoolTetherDynamicsModule: React.FC = () => {
  // Simulation Controls
  const [selectedPresetId, setSelectedPresetId] = useState<string>('tactical_10km_standard');
  const [flightDistanceKm, setFlightDistanceKm] = useState<number>(6.5); // Current payout distance (km)
  const [flightSpeedKmh, setFlightSpeedKmh] = useState<number>(95); // Drone airspeed (km/h)
  const [flightAltitudeM, setFlightAltitudeM] = useState<number>(45); // Flight altitude AGL (m)
  const [crosswindSpeedMps, setCrosswindSpeedMps] = useState<number>(6.0); // Crosswind (m/s)
  const [spoolBrakingTorqueMnM, setSpoolBrakingTorqueMnM] = useState<number>(1.2); // Spool back-tension (mN*m)

  const activePreset = useMemo(() => {
    return FIBER_SPOOL_PRESETS.find((p) => p.id === selectedPresetId) || FIBER_SPOOL_PRESETS[0];
  }, [selectedPresetId]);

  // Cable Dynamics & Optical Budget Model
  const spoolAnalysis = useMemo(() => {
    const flightSpeedMps = flightSpeedKmh / 3.6;
    const deployedKm = Math.min(flightDistanceKm, activePreset.totalLengthKm);
    const deployedM = deployedKm * 1000;

    // Remaining spool mass
    const remainingKm = Math.max(0, activePreset.totalLengthKm - deployedKm);
    const initialSpoolMassKg = (activePreset.totalLengthKm * activePreset.linearWeightGPerKm) / 1000;
    const remainingSpoolMassKg = (remainingKm * activePreset.linearWeightGPerKm) / 1000;

    // Aerodynamic Drag on suspended micro-filament:
    // dF_drag = 0.5 * rho * V^2 * d_fiber * C_d * L_suspended
    // Only a fraction of deployed fiber is airborne (catenary curve behind drone, rest rests on ground)
    const airDensity = 1.225;
    const fiberDiameterM = activePreset.fiberDiameterUm * 1e-6;
    const suspendedLengthM = Math.min(deployedM, flightAltitudeM * 4.5 + flightSpeedMps * 8);

    // Crossflow drag coefficient for thin cylinder in laminar/transitional flow
    const reynoldsFilament = (airDensity * flightSpeedMps * fiberDiameterM) / 1.8e-5;
    const cdFilament = Math.max(1.1, 1.4 - 0.1 * Math.log10(Math.max(1, reynoldsFilament)));

    const aerodynamicDragN = 0.5 * airDensity * Math.pow(flightSpeedMps, 2) * (suspendedLengthM * fiberDiameterM) * cdFilament;
    const crosswindDragN = 0.5 * airDensity * Math.pow(crosswindSpeedMps, 2) * (suspendedLengthM * fiberDiameterM) * 1.3;

    // Payout spool tension: Inertial unspooling + brake torque + aerodynamic drag
    const spoolRadiusM = 0.035; // 35mm inner bobbin radius
    const unspoolingFrictionN = (spoolBrakingTorqueMnM * 1e-3) / spoolRadiusM;
    const totalTensionN = Number((unspoolingFrictionN + aerodynamicDragN * 0.45 + crosswindDragN * 0.35).toFixed(2));

    // Tension safety margin
    const safetyMarginRatio = Number((activePreset.tensileStrengthN / Math.max(0.1, totalTensionN)).toFixed(1));
    const isSnagRisk = totalTensionN > activePreset.tensileStrengthN * 0.75;

    // Optical link budget:
    // Total attenuation = Loss_fiber * L + Splicing_loss (0.2 dB) + Connector (0.5 dB)
    const opticalAttenuationDb = Number((deployedKm * activePreset.opticalLossDbPerKm + 0.7).toFixed(2));
    // SFP+ 10G optical budget ~ 14 dB (Transmitter 0 dBm, Receiver sensitivity -14 dBm)
    const opticalMarginDb = Number((14.0 - opticalAttenuationDb).toFixed(1));

    // Trajectory profile sweep (0 to deployedKm)
    const trajectorySweep: Array<{
      distKm: number;
      fiberTensionN: number;
      opticalLossDb: number;
      airborneFilamentM: number;
      bandwidthGbps: number;
    }> = [];

    const numPoints = 20;
    for (let i = 0; i <= numPoints; i++) {
      const d = (deployedKm / numPoints) * i;
      const dM = d * 1000;
      const suspM = Math.min(dM, flightAltitudeM * 4.5 + flightSpeedMps * 8);
      const aeroDrag = 0.5 * airDensity * Math.pow(flightSpeedMps, 2) * (suspM * fiberDiameterM) * cdFilament;
      const tN = unspoolingFrictionN + aeroDrag * 0.45 + (crosswindDragN * 0.35 * (d / Math.max(1, deployedKm)));
      const optLoss = d * activePreset.opticalLossDbPerKm + 0.7;

      trajectorySweep.push({
        distKm: Number(d.toFixed(2)),
        fiberTensionN: Number(tN.toFixed(2)),
        opticalLossDb: Number(optLoss.toFixed(2)),
        airborneFilamentM: Math.round(suspM),
        bandwidthGbps: 10, // Full 10 Gbps uncompressed digital 4K video + telemetry
      });
    }

    return {
      flightSpeedMps: Number(flightSpeedMps.toFixed(1)),
      deployedKm,
      deployedM: Math.round(deployedM),
      remainingKm: Number(remainingKm.toFixed(2)),
      initialSpoolMassKg: Number(initialSpoolMassKg.toFixed(2)),
      remainingSpoolMassKg: Number(remainingSpoolMassKg.toFixed(2)),
      suspendedLengthM: Math.round(suspendedLengthM),
      aerodynamicDragN: Number(aerodynamicDragN.toFixed(2)),
      totalTensionN,
      safetyMarginRatio,
      isSnagRisk,
      opticalAttenuationDb,
      opticalMarginDb,
      trajectorySweep,
    };
  }, [
    activePreset,
    flightDistanceKm,
    flightSpeedKmh,
    flightAltitudeM,
    crosswindSpeedMps,
    spoolBrakingTorqueMnM,
  ]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-slate-100 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-500 text-white shadow-lg shadow-cyan-500/20">
              <Cable className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                FPV БПЛА на Оптоволокне & Динамика Размотки Катушки
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800/80">
                  Fiber-Optic Guided FPV (100% EW Immunity)
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Моделирование натяжения нити в полете, аэродинамического трения подвешенного волокна, оптического бюджета потерь (дБ) и 0 мс задержки 4K
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl border bg-emerald-950/80 border-emerald-800/50 text-emerald-300 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="text-xs">Иммунитет к РЭБ:</span>
            <span className="text-xs font-mono font-bold">100% (Радиомолчание)</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl border bg-indigo-950/80 border-indigo-800/50 text-indigo-300 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span className="text-xs">Задержка Видео:</span>
            <span className="text-xs font-mono font-bold">&lt; 0.1 мс (10 Gbps)</span>
          </div>
        </div>
      </div>

      {/* Preset Geometry Selector */}
      <div className="my-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          Тип Оптического Микроволокна & Катушки БПЛА:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {FIBER_SPOOL_PRESETS.map((preset) => {
            const isSelected = preset.id === selectedPresetId;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  setSelectedPresetId(preset.id);
                  if (flightDistanceKm > preset.totalLengthKm) {
                    setFlightDistanceKm(preset.totalLengthKm * 0.7);
                  }
                }}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-950/70 border-cyan-400/80 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-400/50'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/70'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-black ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                    {preset.totalLengthKm} км ({preset.fiberDiameterUm} мкм)
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {preset.tensileStrengthN} Н разрыв
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

      {/* Control Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 mb-6">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              Дальность Полета (L_deploy):
            </span>
            <span className="font-mono text-cyan-300 font-bold">{flightDistanceKm} км / {activePreset.totalLengthKm} км</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={activePreset.totalLengthKm}
            step={0.5}
            value={flightDistanceKm}
            onChange={(e) => setFlightDistanceKm(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              Скорость Полета БПЛА (V):
            </span>
            <span className="font-mono text-amber-300 font-bold">{flightSpeedKmh} км/ч ({spoolAnalysis.flightSpeedMps} м/с)</span>
          </div>
          <input
            type="range"
            min={30}
            max={150}
            step={5}
            value={flightSpeedKmh}
            onChange={(e) => setFlightSpeedKmh(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
              Высота Полета (H_AGL):
            </span>
            <span className="font-mono text-emerald-300 font-bold">{flightAltitudeM} м</span>
          </div>
          <input
            type="range"
            min={10}
            max={200}
            step={5}
            value={flightAltitudeM}
            onChange={(e) => setFlightAltitudeM(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-rose-400" />
              Боковой Ветер ($W_z$):
            </span>
            <span className="font-mono text-rose-300 font-bold">{crosswindSpeedMps} м/с</span>
          </div>
          <input
            type="range"
            min={0}
            max={15}
            step={0.5}
            value={crosswindSpeedMps}
            onChange={(e) => setCrosswindSpeedMps(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
          />
        </div>
      </div>

      {/* Main Charts View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Chart 1: Fiber Tension vs Payout Distance */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Натяжение Нити в Полете T (Н) vs Дальность Размотки (км)
            </h4>
            <FullscreenGraphButton domain="uav_guidance" />
          </div>

          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spoolAnalysis.trajectorySweep} margin={{ left: 0, right: 15, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="distKm" stroke="#64748b" tick={{ fontSize: 10 }} unit=" км" />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} unit=" Н" domain={[0, Math.ceil(activePreset.tensileStrengthN * 1.15)]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#06b6d4', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="fiberTensionN" name="Натяжение Нити (Н)" stroke="#06b6d4" strokeWidth={2.6} dot={false} />
                <ReferenceLine y={activePreset.tensileStrengthN} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: `Предел прочности (${activePreset.tensileStrengthN} Н)`, fill: '#f43f5e', fontSize: 9 }} />
                <ReferenceLine y={activePreset.tensileStrengthN * 0.75} stroke="#fbbf24" strokeDasharray="2 2" label={{ value: 'Порог риска зацепа', fill: '#fbbf24', fontSize: 9 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Optical Attenuation & Link Margin */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Оптическое Затухание Линии (дБ) & Длина Нити в Воздухе (м)
            </h4>
            <FullscreenGraphButton domain="uav_guidance" />
          </div>

          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spoolAnalysis.trajectorySweep} margin={{ left: 0, right: 15, top: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="fiberLossGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="distKm" stroke="#64748b" tick={{ fontSize: 10 }} unit=" км" />
                <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fontSize: 10 }} unit=" дБ" domain={[0, 10]} />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fontSize: 10 }} unit=" м" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#6366f1', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area yAxisId="left" type="monotone" dataKey="opticalLossDb" name="Оптические Потери (дБ)" stroke="#6366f1" fill="url(#fiberLossGradient)" strokeWidth={2.2} />
                <Line yAxisId="right" type="monotone" dataKey="airborneFilamentM" name="Подвешенная Нить (м)" stroke="#10b981" strokeWidth={1.8} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Physics Insights / Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Текущее Натяжение Нити:</div>
          <div className={`text-lg font-black font-mono ${spoolAnalysis.isSnagRisk ? 'text-rose-400' : 'text-cyan-300'}`}>
            {spoolAnalysis.totalTensionN} Н
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Запас прочности: {spoolAnalysis.safetyMarginRatio}x</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-indigo-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Оптический Бюджет SFP+:</div>
          <div className="text-lg font-black font-mono text-indigo-300">
            Запас +{spoolAnalysis.opticalMarginDb} дБ
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Потери: {spoolAnalysis.opticalAttenuationDb} дБ на {spoolAnalysis.deployedKm} км</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Остаток Нити на Катушке:</div>
          <div className="text-lg font-black font-mono text-emerald-300">
            {spoolAnalysis.remainingKm} км
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Масса дрона снизилась на {(spoolAnalysis.initialSpoolMassKg - spoolAnalysis.remainingSpoolMassKg).toFixed(2)} кг</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Аэродинамическое Трение Нити:</div>
          <div className="text-lg font-black font-mono text-amber-300">
            {spoolAnalysis.aerodynamicDragN} Н
          </div>
          <div className="text-[10px] text-slate-500 mt-1">На {spoolAnalysis.suspendedLengthM} м подвеса в воздухе</div>
        </div>
      </div>
    </div>
  );
};
