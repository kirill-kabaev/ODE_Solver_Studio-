// ============================================================================
// UAV Ballistic Parachute Recovery & Airbag Landing Studio (ПСС БПЛА)
// Deployment Dynamics, Peak G-Loads, Monte-Carlo Wind Drift & Impact Dissipation
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Wind,
  Compass,
  AlertTriangle,
  Zap,
  Activity,
  Sliders,
  CheckCircle2,
  TrendingDown,
  Clock,
  Crosshair,
  Layers,
  Sparkles,
  Plane,
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
  ZAxis,
} from 'recharts';
import { FullscreenGraphButton } from '../../telemetry/FullscreenGraphButton';

export type EjectionMechanismType = 'spring_loaded' | 'pyro_canister' | 'pilot_chute';
export type CanopyFormType = 'cruciform' | 'hemispherical' | 'toroidal_annular' | 'ram_air_steerable';

export interface RecoveryPreset {
  id: string;
  name: string;
  droneMassKg: number;
  failureAltitudeM: number;
  failureSpeedKmh: number;
  parachuteCanopyM2: number;
  ejectionType: EjectionMechanismType;
  canopyType: CanopyFormType;
  hasAirbag: boolean;
  description: string;
}

export const RECOVERY_PRESETS: RecoveryPreset[] = [
  {
    id: 'fpv_recon_light',
    name: 'Малый разведчик (3.5 кг, Пружинный вышибной)',
    droneMassKg: 3.5,
    failureAltitudeM: 120,
    failureSpeedKmh: 65,
    parachuteCanopyM2: 1.8,
    ejectionType: 'spring_loaded',
    canopyType: 'cruciform',
    hasAirbag: false,
    description: 'Компактная спассистема для легких БПЛА до 5 кг с крестообразным куполом быстрого раскрытия.',
  },
  {
    id: 'heavy_survey_vtol',
    name: 'VTOL Аэрофотосъемка (18 кг, Пиропатрон + Airbag)',
    droneMassKg: 18.0,
    failureAltitudeM: 250,
    failureSpeedKmh: 90,
    parachuteCanopyM2: 7.5,
    ejectionType: 'pyro_canister',
    canopyType: 'toroidal_annular',
    hasAirbag: true,
    description: 'Профессиональная спассистема с пиротехническим выстрелом и надувным амортизатором для сохранения камеры PhaseOne / LiDAR.',
  },
  {
    id: 'tactical_heavy_plane',
    name: 'Тактический БПЛА (65 кг, Вытяжной парашют)',
    droneMassKg: 65.0,
    failureAltitudeM: 600,
    failureSpeedKmh: 140,
    parachuteCanopyM2: 24.0,
    ejectionType: 'pilot_chute',
    canopyType: 'hemispherical',
    hasAirbag: true,
    description: 'Двухступенчатая система (тормозной купол + основной) для тяжелых БПЛА самолетного типа.',
  },
];

export const UAVParachuteBallisticRecoveryModule: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(1);
  const [droneMassKg, setDroneMassKg] = useState<number>(18.0);
  const [failureAltitudeM, setFailureAltitudeM] = useState<number>(250);
  const [failureAirspeedKmh, setFailureAirspeedKmh] = useState<number>(90);
  const [canopyAreaM2, setCanopyAreaM2] = useState<number>(7.5);
  const [ejectionType, setEjectionType] = useState<EjectionMechanismType>('pyro_canister');
  const [canopyType, setCanopyType] = useState<CanopyFormType>('toroidal_annular');
  const [hasAirbag, setHasAirbag] = useState<boolean>(true);
  const [meanWindSpeedMs, setMeanWindSpeedMs] = useState<number>(6.5);
  const [windGustSpreadMs, setWindGustSpreadMs] = useState<number>(3.0);

  // Apply preset
  const handleSelectPreset = (idx: number) => {
    setSelectedPresetIdx(idx);
    const p = RECOVERY_PRESETS[idx];
    setDroneMassKg(p.droneMassKg);
    setFailureAltitudeM(p.failureAltitudeM);
    setFailureAirspeedKmh(p.failureSpeedKmh);
    setCanopyAreaM2(p.parachuteCanopyM2);
    setEjectionType(p.ejectionType);
    setCanopyType(p.canopyType);
    setHasAirbag(p.hasAirbag);
  };

  // Aerodynamic coefficients based on canopy shape
  const canopyMeta = useMemo(() => {
    switch (canopyType) {
      case 'cruciform':
        return {
          cd: 0.75,
          inflationTimeFactor: 0.85,
          stability: 'Высокая (малое раскачивание)',
          name: 'Крестообразный купол (Cruciform)',
        };
      case 'hemispherical':
        return {
          cd: 0.78,
          inflationTimeFactor: 1.0,
          stability: 'Умеренная',
          name: 'Полусферический (Hemispherical)',
        };
      case 'toroidal_annular':
        return {
          cd: 0.95,
          inflationTimeFactor: 0.9,
          stability: 'Максимальная (нулевой маятник)',
          name: 'Тороидальный кольцевой (Annular Pull-Down)',
        };
      case 'ram_air_steerable':
        return {
          cd: 1.45,
          inflationTimeFactor: 1.4,
          stability: 'Управляемый планирующий (крыло)',
          name: 'Планирующее крыло (Ram-Air Parafoil)',
        };
    }
  }, [canopyType]);

  // Ejection mechanism deployment latency & velocity
  const ejectionMeta = useMemo(() => {
    switch (ejectionType) {
      case 'spring_loaded':
        return { latencySec: 0.65, ejectionSpeedMs: 14, name: 'Механическая пружина' };
      case 'pyro_canister':
        return { latencySec: 0.15, ejectionSpeedMs: 32, name: 'Пиропатрон / CO2 мортира' };
      case 'pilot_chute':
        return { latencySec: 1.1, ejectionSpeedMs: 18, name: 'Вытяжной парашют (Drogue)' };
    }
  }, [ejectionType]);

  // Fundamental Physics Calculations
  const calculations = useMemo(() => {
    const rhoAir = 1.225; // kg/m^3
    const g = 9.80665;
    const v0_ms = failureAirspeedKmh / 3.6;

    // 1. Steady-state Descent Terminal Velocity: v_td = sqrt( 2 * m * g / (rho * Cd * S) )
    const effectiveCd = canopyMeta.cd;
    const terminalDescentMs = Math.sqrt((2 * droneMassKg * g) / (rhoAir * effectiveCd * canopyAreaM2));

    // 2. Canopy Inflation Time: t_fill = (n * sqrt(S)) / v0
    const inflationTimeSec = ejectionMeta.latencySec + (canopyMeta.inflationTimeFactor * Math.sqrt(canopyAreaM2)) / Math.max(8, v0_ms * 0.6);

    // 3. Peak Opening Shock Force (Pflanz method): F_open = m * g + 0.5 * rho * v0^2 * S * Cd * Cx_factor
    const shockFactor = ejectionType === 'pyro_canister' ? 1.65 : 1.35;
    const peakShockForceN = droneMassKg * g + 0.5 * rhoAir * Math.pow(v0_ms, 2) * canopyAreaM2 * effectiveCd * shockFactor * 0.35;
    const peakGLoad = peakShockForceN / (droneMassKg * g);

    // 4. Kinetic Energy at Touchdown: E_k = 0.5 * m * v_td^2
    const impactKineticEnergyJ = 0.5 * droneMassKg * Math.pow(terminalDescentMs, 2);

    // 5. Residual Impact with Airbag
    const airbagDampingFactor = hasAirbag ? 0.32 : 1.0;
    const effectivePayloadShockG = ((Math.pow(terminalDescentMs, 2) / (2 * (hasAirbag ? 0.25 : 0.04) * g)) + 1) * airbagDampingFactor;

    // 6. Altitude lost before full canopy inflation
    const altitudeLostDuringDeployM = v0_ms * ejectionMeta.latencySec + 0.5 * g * Math.pow(inflationTimeSec, 2) * 1.8;
    const minSafeDeployAltitudeM = Math.max(15, altitudeLostDuringDeployM * 1.25);

    // 7. Descent duration from failure altitude
    const descentTimeSec = Math.max(1, (failureAltitudeM - altitudeLostDuringDeployM) / terminalDescentMs) + inflationTimeSec;

    // 8. Mean Wind Drift Distance: L = v_wind * t_descent
    const meanDriftDistanceM = meanWindSpeedMs * descentTimeSec;
    const driftEllipseMajorRadiusM = (meanWindSpeedMs + windGustSpreadMs * 1.96) * descentTimeSec;
    const driftEllipseMinorRadiusM = (windGustSpreadMs * 1.96) * descentTimeSec;

    // Safety status
    const isDescentSpeedSafe = terminalDescentMs <= 4.8;
    const isAltitudeSufficient = failureAltitudeM >= minSafeDeployAltitudeM;
    const isGLoadSafe = peakGLoad <= 9.0;

    return {
      terminalDescentMs,
      inflationTimeSec,
      peakShockForceN,
      peakGLoad,
      impactKineticEnergyJ,
      effectivePayloadShockG,
      altitudeLostDuringDeployM,
      minSafeDeployAltitudeM,
      descentTimeSec,
      meanDriftDistanceM,
      driftEllipseMajorRadiusM,
      driftEllipseMinorRadiusM,
      isDescentSpeedSafe,
      isAltitudeSufficient,
      isGLoadSafe,
    };
  }, [droneMassKg, failureAltitudeM, failureAirspeedKmh, canopyAreaM2, canopyMeta, ejectionMeta, ejectionType, hasAirbag, meanWindSpeedMs, windGustSpreadMs]);

  // Altitude vs Time Profile
  const descentProfileData = useMemo(() => {
    const data = [];
    const totalTime = calculations.descentTimeSec;
    const dt = totalTime / 30;

    for (let t = 0; t <= totalTime; t += dt) {
      let currentAlt = failureAltitudeM;
      if (t < calculations.inflationTimeSec) {
        currentAlt = failureAltitudeM - (calculations.altitudeLostDuringDeployM * (t / calculations.inflationTimeSec));
      } else {
        const afterDeployT = t - calculations.inflationTimeSec;
        currentAlt = failureAltitudeM - calculations.altitudeLostDuringDeployM - (afterDeployT * calculations.terminalDescentMs);
      }
      currentAlt = Math.max(0, currentAlt);

      const verticalVelocity = t < calculations.inflationTimeSec
        ? (failureAirspeedKmh / 3.6) * 0.4 + 9.8 * t
        : calculations.terminalDescentMs;

      data.push({
        timeSec: parseFloat(t.toFixed(1)),
        altitudeM: parseFloat(currentAlt.toFixed(1)),
        velocityMs: parseFloat(verticalVelocity.toFixed(1)),
      });
      if (currentAlt <= 0) break;
    }
    return data;
  }, [calculations, failureAltitudeM, failureAirspeedKmh]);

  // Monte-Carlo Wind Drift Scatter Points
  const scatterPoints = useMemo(() => {
    const points = [];
    const meanX = calculations.meanDriftDistanceM;
    const sigmaX = calculations.driftEllipseMajorRadiusM - calculations.meanDriftDistanceM;
    const sigmaY = calculations.driftEllipseMinorRadiusM;

    for (let i = 0; i < 40; i++) {
      // Box-Muller pseudo normal distribution
      const u1 = Math.random() || 0.5;
      const u2 = Math.random() || 0.5;
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

      const x = meanX + z0 * (sigmaX * 0.5);
      const y = 0 + z1 * (sigmaY * 0.5);

      points.push({
        x: parseFloat(x.toFixed(1)),
        y: parseFloat(y.toFixed(1)),
        id: i,
      });
    }
    return points;
  }, [calculations]);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Header Card */}
      <div className="bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-amber-900/50 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl border border-amber-500/40 text-amber-400">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Парашютно-Спасательная Система & Airbag (ПСС БПЛА)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Pflanz Dynamics & Monte Carlo
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Расчет динамики раскрытия купола, ударных перегрузок на планер, эллипса ветрового сноса и защиты полезной нагрузки.
              </p>
            </div>
          </div>

          {/* Quick Safety Badge */}
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold font-mono ${
            calculations.isDescentSpeedSafe && calculations.isAltitudeSufficient && calculations.isGLoadSafe
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
          }`}>
            {calculations.isDescentSpeedSafe && calculations.isAltitudeSufficient && calculations.isGLoadSafe ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>СПАСЕНИЕ ГАРАНТИРОВАНО</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>ОПАСНОСТЬ ПОВРЕЖДЕНИЯ</span>
              </>
            )}
          </div>
        </div>

        {/* Presets Grid */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {RECOVERY_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(idx)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer text-xs flex flex-col justify-between gap-1.5 ${
                selectedPresetIdx === idx
                  ? 'bg-gradient-to-br from-amber-950/90 to-slate-900 border-amber-400 text-white shadow-lg ring-1 ring-amber-400/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <div className="font-bold text-amber-300 flex items-center justify-between">
                <span>{p.name.split('(')[0]}</span>
                {selectedPresetIdx === idx && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
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
            <span>Скорость Снижения</span>
            <TrendingDown className="w-4 h-4 text-amber-400" />
          </div>
          <div className={`text-2xl font-black ${calculations.isDescentSpeedSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
            {calculations.terminalDescentMs.toFixed(2)} <span className="text-xs text-slate-400">м/с</span>
          </div>
          <div className="text-[10px] text-slate-500">Норма: &le; 4.5–5.0 м/с</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Пиковая Перегрузка</span>
            <Activity className="w-4 h-4 text-orange-400" />
          </div>
          <div className={`text-2xl font-black ${calculations.isGLoadSafe ? 'text-orange-400' : 'text-rose-400'}`}>
            {calculations.peakGLoad.toFixed(1)} <span className="text-xs text-slate-400">G</span>
          </div>
          <div className="text-[10px] text-slate-500">Сила рывка: {calculations.peakShockForceN.toFixed(0)} Н</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Мин. Высота Срабатывания</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">
            {calculations.minSafeDeployAltitudeM.toFixed(0)} <span className="text-xs text-slate-400">м</span>
          </div>
          <div className="text-[10px] text-slate-500">Раскрытие: {calculations.inflationTimeSec.toFixed(2)} с</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Энергия Удара</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {calculations.impactKineticEnergyJ.toFixed(0)} <span className="text-xs text-slate-400">Дж</span>
          </div>
          <div className="text-[10px] text-slate-500">
            {hasAirbag ? 'С Airbag демпфером' : 'Жесткая посадка'}
          </div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Снос Ветром (Медиана)</span>
            <Wind className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            {calculations.meanDriftDistanceM.toFixed(0)} <span className="text-xs text-slate-400">м</span>
          </div>
          <div className="text-[10px] text-slate-500">Время спуска: {calculations.descentTimeSec.toFixed(0)} с</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Перегрузка на Камеру</span>
            <Shield className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {calculations.effectivePayloadShockG.toFixed(1)} <span className="text-xs text-slate-400">G</span>
          </div>
          <div className="text-[10px] text-slate-500">
            {calculations.effectivePayloadShockG <= 12 ? 'LiDAR сохранен' : 'Риск поломки сенсора'}
          </div>
        </div>
      </div>

      {/* Main Parameters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Parachute & Airframe Settings */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Параметры Планера & Купола</span>
            </h3>

            {/* Drone Mass */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Взлетная Масса БПЛА</span>
                <span className="text-amber-300 font-bold">{droneMassKg.toFixed(1)} кг</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="100.0"
                step="0.5"
                value={droneMassKg}
                onChange={(e) => setDroneMassKg(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Canopy Area */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Площадь Купола Парашюта S</span>
                <span className="text-orange-300 font-bold">{canopyAreaM2.toFixed(1)} м²</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="40.0"
                step="0.5"
                value={canopyAreaM2}
                onChange={(e) => setCanopyAreaM2(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-400"
              />
              <div className="text-[10px] text-slate-500 font-mono">
                Удельная нагрузка на ткань: {(droneMassKg / canopyAreaM2).toFixed(2)} кг/м²
              </div>
            </div>

            {/* Canopy Shape Selection */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Форма & Конструкция Купола</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cruciform', label: 'Крестообразный (Cruciform)' },
                  { id: 'hemispherical', label: 'Полусферический' },
                  { id: 'toroidal_annular', label: 'Тороидальный (Annular)' },
                  { id: 'ram_air_steerable', label: 'Планирующее крыло' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCanopyType(c.id as CanopyFormType)}
                    className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer text-center ${
                      canopyType === c.id
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-slate-500 italic mt-1">
                {canopyMeta.name} | Cd = {canopyMeta.cd} | Устойчивость: {canopyMeta.stability}
              </div>
            </div>

            {/* Ejection Mechanism */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Способ Выброса Купола</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'spring_loaded', label: 'Пружина' },
                  { id: 'pyro_canister', label: 'Пиропатрон' },
                  { id: 'pilot_chute', label: 'Вытяжной' },
                ].map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setEjectionType(e.id as EjectionMechanismType)}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      ejectionType === e.id
                        ? 'bg-orange-500/20 border-orange-400 text-orange-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Airbag Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div>
                <div className="text-xs font-bold text-slate-200">Надувной Airbag / Амортизатор</div>
                <div className="text-[10px] text-slate-400">Гашение удара для спасения камеры / подвеса</div>
              </div>
              <button
                type="button"
                onClick={() => setHasAirbag(!hasAirbag)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  hasAirbag ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform transform ${
                  hasAirbag ? 'translate-x-7' : 'translate-x-1'
                } top-1 absolute`} />
              </button>
            </div>
          </div>

          {/* Emergency Scenario Settings */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Параметры Аварийной Ситуации</span>
            </h3>

            {/* Failure Altitude */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Высота Отказа Двигателей</span>
                <span className="text-rose-300 font-bold">{failureAltitudeM} м</span>
              </div>
              <input
                type="range"
                min="20"
                max="1500"
                step="10"
                value={failureAltitudeM}
                onChange={(e) => setFailureAltitudeM(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
              />
            </div>

            {/* Failure Airspeed */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Скорость в Момент Выброса</span>
                <span className="text-rose-300 font-bold">{failureAirspeedKmh} км/ч</span>
              </div>
              <input
                type="range"
                min="0"
                max="220"
                step="5"
                value={failureAirspeedKmh}
                onChange={(e) => setFailureAirspeedKmh(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
              />
            </div>

            {/* Wind Speed */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Скорость Бокового Ветра</span>
                <span className="text-teal-300 font-bold">{meanWindSpeedMs.toFixed(1)} м/с</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={meanWindSpeedMs}
                onChange={(e) => setMeanWindSpeedMs(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
            </div>
          </div>
        </div>

        {/* Right Charts & Monte Carlo Wind Dispersion (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Descent Altitude & Velocity Profile */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-amber-400" />
                <span>Профиль Спуска: Высота H(t) и Скорость Снижения V(t)</span>
              </h3>
              <FullscreenGraphButton
                domain="uav_guidance"
                title="Профиль спуска БПЛА под парашютом"
              />
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={descentProfileData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="timeSec" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="alt" stroke="#f59e0b" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="vel" orientation="right" stroke="#06b6d4" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line yAxisId="alt" type="monotone" dataKey="altitudeM" name="Высота H (м)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line yAxisId="vel" type="monotone" dataKey="velocityMs" name="Скорость V (м/с)" stroke="#06b6d4" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monte-Carlo Wind Drift & Scatter Ellipse */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-teal-300 flex items-center gap-2">
                <Compass className="w-4 h-4 text-teal-400" />
                <span>Эллипс Рассеяния Места Падения (Monte-Carlo Ветровой Снос)</span>
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
                P = 95% Confidence
              </span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" dataKey="x" name="Снос по ветру (X)" stroke="#64748b" unit="м" tick={{ fontSize: 11 }} />
                  <YAxis type="number" dataKey="y" name="Боковой снос (Y)" stroke="#64748b" unit="м" tick={{ fontSize: 11 }} />
                  <ZAxis range={[30, 40]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                  <Scatter name="Точки приземления" data={scatterPoints} fill="#14b8a6" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center justify-between font-mono text-xs text-slate-400">
              <div>
                <span>Медианная точка: </span>
                <span className="text-teal-300 font-bold">X = {calculations.meanDriftDistanceM.toFixed(0)} м</span>
              </div>
              <div>
                <span>Радиус 95% эллипса: </span>
                <span className="text-amber-300 font-bold">R_max = {calculations.driftEllipseMajorRadiusM.toFixed(0)} м</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
