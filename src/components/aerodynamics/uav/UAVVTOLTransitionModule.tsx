// ============================================================================
// UAV VTOL & Tiltrotor Transition Dynamics, Aerodynamic Corridor & Tilt-Wing Studio
// Mathematical Modeling of QuadPlane, Tiltrotor, Tailsitter, Stall Envelope & Power Curves
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Plane,
  RotateCw,
  Zap,
  Activity,
  Sliders,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Wind,
  Shield,
  Layers,
  ArrowRight,
  TrendingUp,
  Compass,
  Gauge,
  Cpu,
  RefreshCw,
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
  ComposedChart,
} from 'recharts';

export type VTOLArchitecture = 'quadplane' | 'tiltrotor' | 'tailsitter' | 'tiltwing';

export interface VTOLPreset {
  id: VTOLArchitecture;
  name: string;
  categoryLabel: string;
  mtowKg: number;
  wingSpanM: number;
  wingAreaM2: number;
  clMax: number;
  cd0: number;
  oswaldE: number;
  aspectRatio: number;
  maxTiltAngleDeg: number;
  tiltRateDps: number;
  totalHoverThrustN: number;
  pusherThrustN: number;
  cruiseSpeedMs: number;
  description: string;
}

export const VTOL_PRESETS: VTOLPreset[] = [
  {
    id: 'quadplane',
    name: 'QuadPlane (Раздельная ВМГ: 4 подъемных + 1 маршевый)',
    categoryLabel: 'VTOL SLT (Separate Lift & Thrust)',
    mtowKg: 12.5,
    wingSpanM: 2.8,
    wingAreaM2: 0.85,
    clMax: 1.35,
    cd0: 0.032,
    oswaldE: 0.82,
    aspectRatio: 9.2,
    maxTiltAngleDeg: 0,
    tiltRateDps: 0,
    totalHoverThrustN: 245, // 2.0 T/W hover
    pusherThrustN: 45,
    cruiseSpeedMs: 24, // 86 km/h
    description: 'Надежная классическая схема: независимые 4 подъемных мотора для взлета/посадки и 1 маршевый толкающий мотор.',
  },
  {
    id: 'tiltrotor',
    name: 'Tiltrotor (Поворотные мотогондолы 0° ↔ 90°)',
    categoryLabel: 'Конвертоплан с поворотными роторами',
    mtowKg: 18.0,
    wingSpanM: 3.2,
    wingAreaM2: 1.15,
    clMax: 1.45,
    cd0: 0.028,
    oswaldE: 0.85,
    aspectRatio: 8.9,
    maxTiltAngleDeg: 90,
    tiltRateDps: 15,
    totalHoverThrustN: 350,
    pusherThrustN: 350, // All motors tilt
    cruiseSpeedMs: 32, // 115 km/h
    description: 'Высокоэффективная схема: основные двигатели плавно поворачиваются из вертикального положения в горизонтальное.',
  },
  {
    id: 'tiltwing',
    name: 'Tilt-Wing (Поворотное крыло целиком)',
    categoryLabel: 'Конвертоплан с поворотным центропланом',
    mtowKg: 25.0,
    wingSpanM: 3.6,
    wingAreaM2: 1.40,
    clMax: 1.60,
    cd0: 0.035,
    oswaldE: 0.80,
    aspectRatio: 9.25,
    maxTiltAngleDeg: 90,
    tiltRateDps: 12,
    totalHoverThrustN: 490,
    pusherThrustN: 490,
    cruiseSpeedMs: 35,
    description: 'Крыло поворачивается вместе с моторами, устраняя затенение крыла струями винтов на висении.',
  },
  {
    id: 'tailsitter',
    name: 'Tailsitter (Тейлситтер: взлет «на хвосте»)',
    categoryLabel: 'Летающее крыло / Тейлситтер',
    mtowKg: 6.5,
    wingSpanM: 1.8,
    wingAreaM2: 0.58,
    clMax: 1.25,
    cd0: 0.024,
    oswaldE: 0.88,
    aspectRatio: 5.6,
    maxTiltAngleDeg: 90,
    tiltRateDps: 25,
    totalHoverThrustN: 130,
    pusherThrustN: 130,
    cruiseSpeedMs: 28,
    description: 'Аппарат без поворотных механизмов: переход осуществляется поворотом всего фюзеляжа по тангажу на 90°.',
  },
];

export const UAVVTOLTransitionModule: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  
  // Customizable Configuration State
  const [mtowKg, setMtowKg] = useState<number>(12.5);
  const [wingAreaM2, setWingAreaM2] = useState<number>(0.85);
  const [clMax, setClMax] = useState<number>(1.35);
  const [cd0, setCd0] = useState<number>(0.032);
  const [aspectRatio, setAspectRatio] = useState<number>(9.2);
  
  // Transition Parameters
  const [transitionDurationSec, setTransitionDurationSec] = useState<number>(8.0); // Transition time from 0 to V_stall
  const [transitionProfile, setTransitionProfile] = useState<'linear' | 's_curve' | 'fast_thrust'>('s_curve');
  const [airDensityRho, setAirDensityRho] = useState<number>(1.225); // kg/m^3
  const [headwindSpeedMs, setHeadwindSpeedMs] = useState<number>(3.0); // Headwind assist
  const [climbAngleDeg, setClimbAngleDeg] = useState<number>(4.0); // Steady climb during transition

  const currentPreset = VTOL_PRESETS[selectedPresetIdx];

  // Load preset handler
  const handleSelectPreset = (idx: number) => {
    setSelectedPresetIdx(idx);
    const p = VTOL_PRESETS[idx];
    setMtowKg(p.mtowKg);
    setWingAreaM2(p.wingAreaM2);
    setClMax(p.clMax);
    setCd0(p.cd0);
    setAspectRatio(p.aspectRatio);
  };

  // Mathematical Modeling of Transition Dynamics
  const transitionAnalysis = useMemo(() => {
    const weightN = mtowKg * 9.81;
    
    // Pure Aerodynamic Stall Speed (when Lift = Weight): V_stall = sqrt(2 * W / (rho * S * Cl_max))
    const vStallMs = Math.sqrt((2 * weightN) / (airDensityRho * wingAreaM2 * clMax));
    const vSafeTransitionMs = vStallMs * 1.15; // 15% safety margin above stall speed
    const vCruiseTargetMs = currentPreset.cruiseSpeedMs;

    const dt = 0.1;
    const totalSimTime = transitionDurationSec + 4.0; // include some cruise stabilization
    const timeSteps = Math.ceil(totalSimTime / dt);

    const timeSeriesData: {
      timeSec: number;
      airspeedMs: number;
      airspeedKmh: number;
      tiltAngleDeg: number;
      wingLiftN: number;
      verticalThrustN: number;
      horizontalThrustN: number;
      totalVerticalForceN: number;
      aerodynamicDragN: number;
      totalPowerKw: number;
      altitudeM: number;
      loadFactorNz: number;
      isWingBorne: boolean;
    }[] = [];

    let currentAirspeed = headwindSpeedMs; // start with headwind
    let currentAltitude = 30; // 30m hover altitude
    let totalEnergyConsumedJoules = 0;
    let minVerticalSafetyMargin = 1.0;
    let wingBorneAchievedTime = 0;

    for (let i = 0; i <= timeSteps; i++) {
      const t = i * dt;
      const progress = Math.min(1.0, Math.max(0.0, t / transitionDurationSec));

      // 1. Tilt Profile Function
      let normalizedTilt = 0;
      if (transitionProfile === 'linear') {
        normalizedTilt = progress;
      } else if (transitionProfile === 's_curve') {
        // Smooth Sigmoid 3*p^2 - 2*p^3
        normalizedTilt = progress * progress * (3 - 2 * progress);
      } else {
        // fast_thrust: quick initial tilt to generate forward acceleration
        normalizedTilt = Math.pow(progress, 0.75);
      }

      const tiltAngleDeg = normalizedTilt * 90; // 0 deg = pure hover, 90 deg = pure airplane cruise
      const tiltAngleRad = (tiltAngleDeg * Math.PI) / 180;

      // 2. Dynamic Pressure & Wing Aerodynamics
      const qDyn = 0.5 * airDensityRho * currentAirspeed * currentAirspeed;
      // Effective wing angle of attack during transition
      const alphaDeg = 6.0; // design transition AoA
      const clEffective = Math.min(clMax, 0.1 * alphaDeg + 0.3);
      const inducedDragK = 1 / (Math.PI * currentPreset.oswaldE * aspectRatio);
      const cdEffective = cd0 + inducedDragK * clEffective * clEffective;

      const wingLiftN = qDyn * wingAreaM2 * clEffective;
      const aeroDragN = qDyn * wingAreaM2 * cdEffective;

      // 3. Thrust Decomposition based on architecture
      let verticalThrustN = 0;
      let horizontalThrustN = 0;
      let motorPowerKw = 0;

      if (currentPreset.id === 'quadplane') {
        // QuadPlane: lift motors throttle down as wing lift increases
        // required lift shortfall: deficit = max(0, weightN - wingLiftN)
        const liftDeficit = Math.max(0, weightN - wingLiftN);
        verticalThrustN = Math.min(currentPreset.totalHoverThrustN, liftDeficit * 1.05);
        
        // Pusher motor ramps up forward thrust
        horizontalThrustN = progress * currentPreset.pusherThrustN;

        // Hover power (P_hover = T^1.5 / sqrt(2*rho*A)) + Pusher power
        const hoverPowerKw = (Math.pow(verticalThrustN, 1.4) * 0.012);
        const pusherPowerKw = (horizontalThrustN * currentAirspeed) / (0.75 * 1000) + 0.2;
        motorPowerKw = hoverPowerKw + pusherPowerKw;
      } else {
        // Tiltrotor / Tiltwing / Tailsitter
        // Available thrust T tilts from vertical to horizontal: T_z = T * cos(tilt), T_x = T * sin(tilt)
        const requiredTotalThrust = Math.max(
          weightN * (1 - normalizedTilt * 0.85),
          aeroDragN + weightN * Math.sin((climbAngleDeg * Math.PI) / 180)
        );

        verticalThrustN = requiredTotalThrust * Math.cos(tiltAngleRad);
        horizontalThrustN = requiredTotalThrust * Math.sin(tiltAngleRad);

        // Induced power & propulsive power
        const propPower = (requiredTotalThrust * Math.max(10, currentAirspeed)) / (0.8 * 1000) + 0.35;
        motorPowerKw = Math.max(0.4, propPower);
      }

      // 4. Force Equilibrium and Accelerations
      const totalVerticalForceN = wingLiftN + verticalThrustN;
      const verticalLoadFactor = totalVerticalForceN / weightN;
      if (verticalLoadFactor < minVerticalSafetyMargin && t > 0.5) {
        minVerticalSafetyMargin = verticalLoadFactor;
      }

      // Net horizontal acceleration: m * a_x = T_x - D - W*sin(gamma)
      const climbAngleRad = (climbAngleDeg * Math.PI) / 180;
      const netAx = (horizontalThrustN - aeroDragN - weightN * Math.sin(climbAngleRad)) / mtowKg;
      currentAirspeed = Math.max(0.1, currentAirspeed + netAx * dt);

      // Vertical rate of climb
      const vz = (totalVerticalForceN - weightN) / mtowKg * dt * 5 + currentAirspeed * Math.sin(climbAngleRad);
      currentAltitude += Math.max(0, vz * dt);

      // Check if wing is fully supporting the aircraft (Lift >= 95% Weight)
      const isWingBorne = wingLiftN >= 0.95 * weightN;
      if (isWingBorne && wingBorneAchievedTime === 0) {
        wingBorneAchievedTime = t;
      }

      totalEnergyConsumedJoules += motorPowerKw * 1000 * dt;

      // Downsample for chart
      if (i % 2 === 0) {
        timeSeriesData.push({
          timeSec: Math.round(t * 10) / 10,
          airspeedMs: Math.round(currentAirspeed * 10) / 10,
          airspeedKmh: Math.round(currentAirspeed * 3.6 * 10) / 10,
          tiltAngleDeg: Math.round(tiltAngleDeg * 10) / 10,
          wingLiftN: Math.round(wingLiftN),
          verticalThrustN: Math.round(verticalThrustN),
          horizontalThrustN: Math.round(horizontalThrustN),
          totalVerticalForceN: Math.round(totalVerticalForceN),
          aerodynamicDragN: Math.round(aeroDragN * 10) / 10,
          totalPowerKw: Math.round(motorPowerKw * 100) / 100,
          altitudeM: Math.round(currentAltitude * 10) / 10,
          loadFactorNz: Math.round(verticalLoadFactor * 100) / 100,
          isWingBorne,
        });
      }
    }

    const totalEnergyWh = totalEnergyConsumedJoules / 3600;
    const transitionCorridorSafe = minVerticalSafetyMargin >= 0.92;

    return {
      vStallMs: Math.round(vStallMs * 10) / 10,
      vStallKmh: Math.round(vStallMs * 3.6 * 10) / 10,
      vSafeTransitionMs: Math.round(vSafeTransitionMs * 10) / 10,
      vSafeTransitionKmh: Math.round(vSafeTransitionMs * 3.6 * 10) / 10,
      weightN: Math.round(weightN),
      totalEnergyWh: Math.round(totalEnergyWh * 10) / 10,
      wingBorneAchievedTime: Math.round(wingBorneAchievedTime * 10) / 10,
      minVerticalSafetyMargin: Math.round(minVerticalSafetyMargin * 100) / 100,
      transitionCorridorSafe,
      timeSeriesData,
    };
  }, [mtowKg, wingAreaM2, clMax, cd0, aspectRatio, currentPreset, transitionDurationSec, transitionProfile, airDensityRho, headwindSpeedMs, climbAngleDeg]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-indigo-800/60 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden text-slate-100 font-mono">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-600 to-teal-500 text-white shadow-lg shadow-indigo-500/20 border border-indigo-400/40">
                <Plane className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <span>Аэродинамика Переходных Режимов VTOL & Конвертопланов</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700">
                    VTOL Dynamics P0
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Моделирование перехода «Висение ↔ Самолетный полет», коридора сваливания V_stall(θ), балансировки подъемной силы и энергозатрат
                </p>
              </div>
            </div>
          </div>

          {/* Quick Safety Margin Badge */}
          <div className="flex items-center gap-2">
            <div className={`px-4 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
              transitionAnalysis.transitionCorridorSafe
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/60'
                : 'bg-rose-950/90 text-rose-300 border-rose-600/60'
            }`}>
              <Shield className="w-4 h-4" />
              <span>Коридор: {transitionAnalysis.transitionCorridorSafe ? 'БЕЗОПАСЕН' : 'РИСК ПРОСАДКИ'}</span>
              <span className="text-[10px] opacity-75">
                ($n_z \ge {transitionAnalysis.minVerticalSafetyMargin}$)
              </span>
            </div>
          </div>
        </div>

        {/* VTOL Architecture Presets Selector */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {VTOL_PRESETS.map((preset, idx) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(idx)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer text-xs flex flex-col justify-between gap-1.5 ${
                selectedPresetIdx === idx
                  ? 'bg-gradient-to-br from-indigo-950/90 to-slate-900 border-indigo-400 text-white shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-400/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <div className="font-bold text-indigo-300 flex items-center justify-between">
                <span>{preset.name.split('(')[0]}</span>
                {selectedPresetIdx === idx && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {preset.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* KPI Telemetry Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Скорость Сваливания (V_stall)</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {transitionAnalysis.vStallMs} <span className="text-xs text-slate-400">м/с</span>
          </div>
          <div className="text-[10px] text-slate-500">{transitionAnalysis.vStallKmh} км/ч (чистое крыло)</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Безопасный Переход (V_safe)</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {transitionAnalysis.vSafeTransitionMs} <span className="text-xs text-slate-400">м/с</span>
          </div>
          <div className="text-[10px] text-slate-500">1.15 × V_stall (+15% запас)</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Время Перехода (T_wing)</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {transitionAnalysis.wingBorneAchievedTime} <span className="text-xs text-slate-400">сек</span>
          </div>
          <div className="text-[10px] text-slate-500">Момент 95% подхвата крылом</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Расход Энергии (E_trans)</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">
            {transitionAnalysis.totalEnergyWh} <span className="text-xs text-slate-400">Вт·ч</span>
          </div>
          <div className="text-[10px] text-slate-500">На фазу ускорения</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Мин. Перегрузка (n_z,min)</span>
            <TrendingUp className="w-4 h-4 text-teal-400" />
          </div>
          <div className={`text-2xl font-black ${
            transitionAnalysis.minVerticalSafetyMargin >= 0.95 ? 'text-teal-400' : 'text-rose-400'
          }`}>
            {transitionAnalysis.minVerticalSafetyMargin} <span className="text-xs text-slate-400">G</span>
          </div>
          <div className="text-[10px] text-slate-500">Без провала по высоте</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Встречный Ветер (V_w)</span>
            <Wind className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">
            {headwindSpeedMs} <span className="text-xs text-slate-400">м/с</span>
          </div>
          <div className="text-[10px] text-slate-500">Сокращает фазу на {(headwindSpeedMs * 1.8).toFixed(1)} с</div>
        </div>
      </div>

      {/* Main Workspace: 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs text-slate-300">
        {/* Left Column: VTOL Parameters & Transition Profile Controls */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              Параметры Планера & Фазы Перехода
            </span>
            <button
              type="button"
              onClick={() => handleSelectPreset(selectedPresetIdx)}
              className="text-[10px] text-slate-500 hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Сброс
            </button>
          </div>

          {/* Mass & Wing Aerodynamics */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Взлетная масса (MTOW):</span>
                <span className="text-white font-bold">{mtowKg} кг ({transitionAnalysis.weightN} Н)</span>
              </div>
              <input
                type="range"
                min={2.0}
                max={50.0}
                step={0.5}
                value={mtowKg}
                onChange={(e) => setMtowKg(parseFloat(e.target.value))}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Площадь крыла (S):</span>
                <span className="text-cyan-400 font-bold">{wingAreaM2} м² (Удлинение AR: {aspectRatio})</span>
              </div>
              <input
                type="range"
                min={0.3}
                max={3.0}
                step={0.05}
                value={wingAreaM2}
                onChange={(e) => setWingAreaM2(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Макс. коэф. подъемной силы (C_L,max):</span>
                <span className="text-amber-400 font-bold">{clMax.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={2.2}
                step={0.05}
                value={clMax}
                onChange={(e) => setClMax(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Transition Kinematics */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <span className="text-slate-400 font-bold block text-[11px] text-indigo-300">
              Кинематика Перехода & Автопилот:
            </span>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Длительность перехода (T_trans):</span>
                <span className="text-white font-bold">{transitionDurationSec} сек</span>
              </div>
              <input
                type="range"
                min={3.0}
                max={20.0}
                step={0.5}
                value={transitionDurationSec}
                onChange={(e) => setTransitionDurationSec(parseFloat(e.target.value))}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </div>

            {/* Profile Selector */}
            <div>
              <label className="text-slate-400 block text-[10px] mb-1">Закон поворота мотогондол / тяги:</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 's_curve', label: 'S-Кривая (Плавный)' },
                  { id: 'linear', label: 'Линейный' },
                  { id: 'fast_thrust', label: 'Быстрый разгон' },
                ].map((prof) => (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => setTransitionProfile(prof.id as any)}
                    className={`p-1.5 rounded-xl border text-[10px] font-bold text-center cursor-pointer transition-all ${
                      transitionProfile === prof.id
                        ? 'bg-indigo-950 border-indigo-400 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {prof.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Угол набора высоты (γ_climb):</span>
                <span className="text-emerald-400 font-bold">{climbAngleDeg}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={15}
                step={1}
                value={climbAngleDeg}
                onChange={(e) => setClimbAngleDeg(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Встречный ветер (Headwind):</span>
                <span className="text-sky-400 font-bold">{headwindSpeedMs} м/с</span>
              </div>
              <input
                type="range"
                min={0}
                max={15}
                step={0.5}
                value={headwindSpeedMs}
                onChange={(e) => setHeadwindSpeedMs(parseFloat(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Transition Force Balance & Power Curves */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart 1: Force Blending (Wing Lift vs Vertical Thrust vs Weight) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  <span>Баланс Сил в Фазе Перехода (Подъемная Сила Крыла vs Тяга Роторов)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Показывает замещение тяги подъемных винтов аэродинамической подъемной силой крыла по мере разгона аппарата.
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-xl bg-indigo-950 text-indigo-300 border border-indigo-800">
                Вес: {transitionAnalysis.weightN} Н
              </span>
            </div>

            <div className="h-72 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={transitionAnalysis.timeSeriesData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="timeSec" stroke="#64748b" label={{ value: 'Время (сек)', position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }} />
                  <YAxis stroke="#94a3b8" label={{ value: 'Сила (Н)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem' }}
                    formatter={(value: any, name: string) => [`${value} Н`, name]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="wingLiftN"
                    name="Подъемная сила крыла L (Н)"
                    stroke="#38bdf8"
                    fill="#0284c7"
                    fillOpacity={0.4}
                    strokeWidth={2.5}
                  />
                  <Area
                    type="monotone"
                    dataKey="verticalThrustN"
                    name="Вертикальная тяга моторов Tz (Н)"
                    stroke="#f43f5e"
                    fill="#e11d48"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalVerticalForceN"
                    name="Суммарная вертикальная сила L + Tz (Н)"
                    stroke="#34d399"
                    strokeWidth={3}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Speed vs Power Curve & Tilt Angle */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Профиль Скорости (V), Угла Наклона (θ) & Потребляемой Мощности (кВт)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Кривая мощности наглядно демонстрирует падение энергопотребления при переходе в режим экономичного крыльевого полета.
                </p>
              </div>
            </div>

            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={transitionAnalysis.timeSeriesData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="timeSec" stroke="#64748b" label={{ value: 'Время (сек)', position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }} />
                  <YAxis stroke="#94a3b8" label={{ value: 'Скорость (м/с) / Мощность (кВт)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="airspeedMs"
                    name="Воздушная скорость (м/с)"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalPowerKw"
                    name="Мощность СУ (кВт)"
                    stroke="#fbbf24"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="altitudeM"
                    name="Высота полета (м)"
                    stroke="#a855f7"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
