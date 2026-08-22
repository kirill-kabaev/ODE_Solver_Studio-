// ============================================================================
// UAV Autonomous Guidance, Proportional Navigation (PN/APN) & Optical Target Tracking Studio
// Mathematical Modeling of Homing Laws, Gimbal LOS Rate, Kalman State Prediction & Wind Vector Triangle
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Crosshair,
  Target,
  Navigation,
  Compass,
  Zap,
  Activity,
  Sliders,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Camera,
  Layers,
  ArrowRight,
  TrendingUp,
  Cpu,
  Shield,
  Wind,
  Video,
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
} from 'recharts';

export type GuidanceLawType = 'pure_pn' | 'augmented_pn' | 'pure_pursuit' | 'lead_pursuit';
export type TargetScenarioType = 'stationary_recon' | 'linear_convoy' | 'zigzag_evasion' | 'anti_drone_intercept';

export interface TargetScenario {
  id: TargetScenarioType;
  name: string;
  targetSpeedKmh: number;
  evasionManeuver: boolean;
  evasionPeriodSec: number;
  evasionAccelG: number;
  initialDistanceM: number;
  initialBearingDeg: number;
  description: string;
}

export const TARGET_SCENARIOS: TargetScenario[] = [
  {
    id: 'stationary_recon',
    name: 'Стационарная Цель (Наблюдение / Точечный Заход)',
    targetSpeedKmh: 0,
    evasionManeuver: false,
    evasionPeriodSec: 0,
    evasionAccelG: 0,
    initialDistanceM: 1200,
    initialBearingDeg: 30,
    description: 'Неподвижный объект (позиция, опорный пункт, укрытие). Заход на цель по оптимальной баллистической кривой.',
  },
  {
    id: 'linear_convoy',
    name: 'Движущийся Автотранспорт (60 км/ч, Прямолинейно)',
    targetSpeedKmh: 60,
    evasionManeuver: false,
    evasionPeriodSec: 0,
    evasionAccelG: 0,
    initialDistanceM: 1500,
    initialBearingDeg: 45,
    description: 'Машина движется с постоянной скоростью. Пропорциональная навигация рассчитывает точку упреждения.',
  },
  {
    id: 'zigzag_evasion',
    name: 'Маневрирующая Цель (Зигзаг / Змейка 2.5G)',
    targetSpeedKmh: 75,
    evasionManeuver: true,
    evasionPeriodSec: 4.0,
    evasionAccelG: 2.5,
    initialDistanceM: 1400,
    initialBearingDeg: 25,
    description: 'Интенсивное противозенитное маневрирование цели с резкой сменой курса. Требует алгоритм APN.',
  },
  {
    id: 'anti_drone_intercept',
    name: 'Воздушный Перехват (Дрон-Перехватчик vs БПЛА 120 км/ч)',
    targetSpeedKmh: 120,
    evasionManeuver: true,
    evasionPeriodSec: 6.0,
    evasionAccelG: 3.5,
    initialDistanceM: 2000,
    initialBearingDeg: 15,
    description: 'Динамичный воздушный бой на встречно-пересекающихся курсах. Высокие требования к располагаемой перегрузке.',
  },
];

export const UAVGuidanceTrackingModule: React.FC = () => {
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState<number>(1);
  const [guidanceLaw, setGuidanceLaw] = useState<GuidanceLawType>('augmented_pn');
  
  // Navigation Gain & Autopilot Constraints
  const [navRatioN, setNavRatioN] = useState<number>(3.5); // Navigation constant N (typically 3 to 5)
  const [uavSpeedMs, setUavSpeedMs] = useState<number>(38); // 38 m/s = 137 km/h
  const [maxLateralAccelG, setMaxLateralAccelG] = useState<number>(6.0); // Limit G-load
  
  // Vision & Tracking Parameters
  const [cameraFps, setCameraFps] = useState<number>(60); // 30, 60, 120 fps
  const [trackingLatencyMs, setTrackingLatencyMs] = useState<number>(45); // Video pipeline & NN detector delay
  const [useKalmanPredictor, setUseKalmanPredictor] = useState<boolean>(true);
  const [gimbalSlewRateDps, setGimbalSlewRateDps] = useState<number>(120); // deg/sec

  // Environment
  const [windSpeedMs, setWindSpeedMs] = useState<number>(5.0);
  const [windAngleDeg, setWindAngleDeg] = useState<number>(90); // Crosswind

  const scenario = TARGET_SCENARIOS[selectedScenarioIdx];

  // Comprehensive Guidance & Trajectory Simulation (Runge-Kutta / Euler Numerical Integration)
  const simResults = useMemo(() => {
    const dt = 0.05; // 50ms simulation step
    const maxSimTimeSec = 45;

    // Initial UAV Position & Velocity
    let uavX = 0;
    let uavY = 0;
    let uavHeadingRad = 0; // Starts pointing east (X-axis)

    // Initial Target Position & Velocity
    const targetDist = scenario.initialDistanceM;
    const targetBearingRad = (scenario.initialBearingDeg * Math.PI) / 180;
    let targetX = targetDist * Math.cos(targetBearingRad);
    let targetY = targetDist * Math.sin(targetBearingRad);

    const targetSpeedMs = scenario.targetSpeedKmh / 3.6;
    let targetHeadingRad = Math.PI * 0.75; // Moving roughly north-west

    // Wind vector
    const windAngleRad = (windAngleDeg * Math.PI) / 180;
    const windVx = windSpeedMs * Math.cos(windAngleRad);
    const windVy = windSpeedMs * Math.sin(windAngleRad);

    const trajectoryData: {
      timeSec: number;
      uavX: number;
      uavY: number;
      targetX: number;
      targetY: number;
      losAngleDeg: number;
      losRateDps: number;
      commandedAccelG: number;
      rangeToGoM: number;
      closingVelocityMs: number;
      gimbalErrorDeg: number;
    }[] = [];

    let prevLosAngleRad = Math.atan2(targetY - uavY, targetX - uavX);
    let timeToImpactSec = maxSimTimeSec;
    let finalMissDistanceM = targetDist;
    let peakAccelG = 0;
    let isIntercepted = false;

    // State buffer for simulating vision tracking latency
    const visionBuffer: { time: number; x: number; y: number }[] = [];
    const latencySec = trackingLatencyMs / 1000;

    for (let t = 0; t <= maxSimTimeSec; t += dt) {
      // 1. Current Relative Geometry
      const dx = targetX - uavX;
      const dy = targetY - uavY;
      const rangeToGo = Math.sqrt(dx * dx + dy * dy);

      if (rangeToGo < finalMissDistanceM) {
        finalMissDistanceM = rangeToGo;
      }

      // Check intercept condition (hit radius <= 1.5m)
      if (rangeToGo <= 1.5 && !isIntercepted) {
        timeToImpactSec = t;
        isIntercepted = true;
      }

      if (isIntercepted || rangeToGo > targetDist * 2.5) {
        break;
      }

      // 2. Line of Sight (LOS) Angle and Rotation Rate
      const currentLosAngleRad = Math.atan2(dy, dx);
      let losRateRadSec = (currentLosAngleRad - prevLosAngleRad) / dt;
      // Handle 2pi wrap-around
      if (losRateRadSec > Math.PI / dt) losRateRadSec -= (2 * Math.PI) / dt;
      if (losRateRadSec < -Math.PI / dt) losRateRadSec += (2 * Math.PI) / dt;
      prevLosAngleRad = currentLosAngleRad;

      // 3. Target Motion Dynamics (with potential Evasive Maneuver)
      let targetAx = 0;
      let targetAy = 0;
      if (scenario.evasionManeuver && scenario.evasionPeriodSec > 0) {
        const evasionOmega = (2 * Math.PI) / scenario.evasionPeriodSec;
        const latAccel = scenario.evasionAccelG * 9.81 * Math.sin(evasionOmega * t);
        targetAx = -latAccel * Math.sin(targetHeadingRad);
        targetAy = latAccel * Math.cos(targetHeadingRad);
        targetHeadingRad += (latAccel / Math.max(1, targetSpeedMs)) * dt;
      }

      const targetVx = targetSpeedMs * Math.cos(targetHeadingRad);
      const targetVy = targetSpeedMs * Math.sin(targetHeadingRad);

      // Vision tracking with delay buffer & Kalman compensation
      visionBuffer.push({ time: t, x: targetX, y: targetY });
      while (visionBuffer.length > 0 && visionBuffer[0].time < t - latencySec) {
        visionBuffer.shift();
      }
      const delayedMeasurement = visionBuffer[0] || { x: targetX, y: targetY };
      
      let estimatedTargetX = delayedMeasurement.x;
      let estimatedTargetY = delayedMeasurement.y;
      if (useKalmanPredictor) {
        // Forward predict latency compensation: x_pred = x_del + v_est * tau + 0.5 * a_est * tau^2
        estimatedTargetX += targetVx * latencySec + 0.5 * targetAx * latencySec * latencySec;
        estimatedTargetY += targetVy * latencySec + 0.5 * targetAy * latencySec * latencySec;
      }

      // 4. UAV Velocity & Closing Velocity V_c
      const uavVx = uavSpeedMs * Math.cos(uavHeadingRad) + windVx;
      const uavVy = uavSpeedMs * Math.sin(uavHeadingRad) + windVy;
      const relVx = targetVx - uavVx;
      const relVy = targetVy - uavVy;
      
      // Closing speed: Vc = -d(Range)/dt = -(dx*relVx + dy*relVy)/R
      const closingVelocityMs = -(dx * relVx + dy * relVy) / Math.max(0.1, rangeToGo);

      // 5. Guidance Law Acceleration Command
      let commandedLateralAccelMps2 = 0;
      const N = navRatioN;

      switch (guidanceLaw) {
        case 'pure_pn':
          // Classical PN: a_n = N * V_c * d(lambda)/dt
          commandedLateralAccelMps2 = N * closingVelocityMs * losRateRadSec;
          break;

        case 'augmented_pn':
          // APN: a_n = N * V_c * d(lambda)/dt + (N/2) * a_T_normal
          const targetAccelNormal = -targetAx * Math.sin(currentLosAngleRad) + targetAy * Math.cos(currentLosAngleRad);
          commandedLateralAccelMps2 = N * closingVelocityMs * losRateRadSec + (N / 2) * targetAccelNormal;
          break;

        case 'pure_pursuit':
          // Heading directly towards target: a_n = V_m * (los_angle - heading) * K
          const angleErrorPP = currentLosAngleRad - uavHeadingRad;
          commandedLateralAccelMps2 = uavSpeedMs * angleErrorPP * 2.5;
          break;

        case 'lead_pursuit':
          // Lead angle pursuit
          const leadAngle = Math.asin(Math.max(-0.9, Math.min(0.9, (targetSpeedMs / uavSpeedMs) * Math.sin(targetHeadingRad - currentLosAngleRad))));
          const angleErrorLP = (currentLosAngleRad + leadAngle) - uavHeadingRad;
          commandedLateralAccelMps2 = uavSpeedMs * angleErrorLP * 3.0;
          break;
      }

      // 6. G-Load Limiter Envelope
      const maxAccelMps2 = maxLateralAccelG * 9.81;
      const clampedAccelMps2 = Math.max(-maxAccelMps2, Math.min(maxAccelMps2, commandedLateralAccelMps2));
      const commandedAccelG = clampedAccelMps2 / 9.81;
      if (Math.abs(commandedAccelG) > peakAccelG) {
        peakAccelG = Math.abs(commandedAccelG);
      }

      // 7. Update UAV Heading & Position
      const yawRateRadSec = clampedAccelMps2 / uavSpeedMs;
      uavHeadingRad += yawRateRadSec * dt;
      uavX += uavVx * dt;
      uavY += uavVy * dt;

      // Update Target Position
      targetX += targetVx * dt;
      targetY += targetVy * dt;

      // Gimbal tracking error
      const gimbalErrorDeg = Math.abs((currentLosAngleRad - uavHeadingRad) * (180 / Math.PI));

      // Record telemetry every 0.2s for smooth plotting
      if (Math.round(t * 100) % 20 === 0) {
        trajectoryData.push({
          timeSec: Math.round(t * 10) / 10,
          uavX: Math.round(uavX),
          uavY: Math.round(uavY),
          targetX: Math.round(targetX),
          targetY: Math.round(targetY),
          losAngleDeg: Math.round(((currentLosAngleRad * 180) / Math.PI) * 10) / 10,
          losRateDps: Math.round(((losRateRadSec * 180) / Math.PI) * 100) / 100,
          commandedAccelG: Math.round(commandedAccelG * 100) / 100,
          rangeToGoM: Math.round(rangeToGo * 10) / 10,
          closingVelocityMs: Math.round(closingVelocityMs * 10) / 10,
          gimbalErrorDeg: Math.round(gimbalErrorDeg * 10) / 10,
        });
      }
    }

    const hitAccuracyCategory = finalMissDistanceM <= 0.8 ? 'Прямое Попадание (Bullseye)' : finalMissDistanceM <= 2.5 ? 'Уверенное Поражение' : 'Промах / Срыв Захвата';

    return {
      trajectoryData,
      timeToImpactSec: Math.round(timeToImpactSec * 10) / 10,
      finalMissDistanceM: Math.round(finalMissDistanceM * 100) / 100,
      peakAccelG: Math.round(peakAccelG * 10) / 10,
      isIntercepted,
      hitAccuracyCategory,
    };
  }, [scenario, guidanceLaw, navRatioN, uavSpeedMs, maxLateralAccelG, cameraFps, trackingLatencyMs, useKalmanPredictor, windSpeedMs, windAngleDeg]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950 border border-rose-800/60 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden text-slate-100 font-mono">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-500 via-red-600 to-amber-500 text-white shadow-lg shadow-rose-500/20 border border-rose-400/40">
                <Crosshair className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <span>Самонаведение БПЛА & Оптический Автозахват (Pro-Nav & AI Homing)</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-rose-950 text-rose-300 border border-rose-700">
                    Guidance P0
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Моделирование законов наведения PN / APN, угловой скорости линии визирования (LOS Rate), компенсации задержки оптического трекера и ветра
                </p>
              </div>
            </div>
          </div>

          {/* Quick Intercept Pill */}
          <div className="flex items-center gap-2">
            <div className={`px-4 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
              simResults.finalMissDistanceM <= 1.5
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/60'
                : simResults.finalMissDistanceM <= 3.5
                ? 'bg-amber-950/90 text-amber-300 border-amber-600/60'
                : 'bg-rose-950/90 text-rose-300 border-rose-600/60'
            }`}>
              <Target className="w-4 h-4" />
              <span>Промах: {simResults.finalMissDistanceM.toFixed(2)} м</span>
              <span className="text-[10px] opacity-75">
                ({simResults.hitAccuracyCategory})
              </span>
            </div>
          </div>
        </div>

        {/* Target Scenarios Carousel */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {TARGET_SCENARIOS.map((sc, idx) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => setSelectedScenarioIdx(idx)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer text-xs flex flex-col justify-between gap-1.5 ${
                selectedScenarioIdx === idx
                  ? 'bg-gradient-to-br from-rose-950/90 to-slate-900 border-rose-400 text-white shadow-lg shadow-rose-950/50 ring-1 ring-rose-400/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <div className="font-bold text-rose-300 flex items-center justify-between">
                <span>{sc.name.split('(')[0]}</span>
                {selectedScenarioIdx === idx && <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {sc.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* KPI Telemetry Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Время Перехвата (T_go)</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {simResults.timeToImpactSec.toFixed(1)} <span className="text-xs text-slate-400">сек</span>
          </div>
          <div className="text-[10px] text-slate-500">До точки встречи</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Пиковая Перегрузка ny</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {simResults.peakAccelG.toFixed(1)} <span className="text-xs text-slate-400">G</span>
          </div>
          <div className="text-[10px] text-slate-500">Лимит: {maxLateralAccelG} G</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Скорость Сближения Vc</span>
            <TrendingUp className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">
            {(uavSpeedMs + (scenario.targetSpeedKmh / 3.6)).toFixed(0)} <span className="text-xs text-slate-400">м/с</span>
          </div>
          <div className="text-[10px] text-slate-500">{((uavSpeedMs + (scenario.targetSpeedKmh / 3.6)) * 3.6).toFixed(0)} км/ч</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Задержка Нейротрекера</span>
            <Camera className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">
            {trackingLatencyMs} <span className="text-xs text-slate-400">мс</span>
          </div>
          <div className="text-[10px] text-slate-500">{cameraFps} FPS Камера</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Калмановский Предиктор</span>
            <Cpu className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            {useKalmanPredictor ? 'АКТИВЕН' : 'ВЫКЛ'}
          </div>
          <div className="text-[10px] text-slate-500">Компенсация задержки (лаг)</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Снос Ветром</span>
            <Wind className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {windSpeedMs} <span className="text-xs text-slate-400">м/с</span>
          </div>
          <div className="text-[10px] text-slate-500">Боковой ветер {windAngleDeg}°</div>
        </div>
      </div>

      {/* Main Workspace: 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs text-slate-300">
        {/* Left Column: Guidance Laws & Autopilot Limits Configurator */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-rose-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              Закон Наведения & Автопилот
            </span>
            <button
              type="button"
              onClick={() => {
                setGuidanceLaw('augmented_pn');
                setNavRatioN(3.5);
                setUavSpeedMs(38);
                setMaxLateralAccelG(6.0);
                setTrackingLatencyMs(45);
                setUseKalmanPredictor(true);
                setWindSpeedMs(5.0);
              }}
              className="text-[10px] text-slate-500 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Сброс
            </button>
          </div>

          {/* Guidance Law Selector */}
          <div className="space-y-2">
            <label className="text-slate-400 font-bold block text-[11px] text-rose-300">
              1. Метод Самонаведения (Guidance Law):
            </label>
            <div className="space-y-1.5">
              {[
                { id: 'augmented_pn', label: 'Augmented PN (APN)', sub: 'Учет ускорения цели (a_n = N*Vc*λ̇ + N/2*aT)' },
                { id: 'pure_pn', label: 'Classical Pro-Nav (PN)', sub: 'Пропорциональная навигация (a_n = N*Vc*λ̇)' },
                { id: 'lead_pursuit', label: 'Lead Pursuit (Упреждение)', sub: 'Оптический захват с постоянным углом упреждения' },
                { id: 'pure_pursuit', label: 'Pure Pursuit (В хвост)', sub: 'Прямой вектор на цель (высокие перегрузки в конце)' },
              ].map((law) => (
                <button
                  key={law.id}
                  type="button"
                  onClick={() => setGuidanceLaw(law.id as GuidanceLawType)}
                  className={`w-full p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    guidanceLaw === law.id
                      ? 'bg-rose-950/80 border-rose-400 text-white font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs">{law.label}</div>
                  <div className="text-[10px] text-slate-500">{law.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Nav Ratio & Limits */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Коэффициент наведения (N):</span>
                <span className="text-rose-400 font-bold">{navRatioN.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={2.0}
                max={5.5}
                step={0.1}
                value={navRatioN}
                onChange={(e) => setNavRatioN(parseFloat(e.target.value))}
                className="w-full accent-rose-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Скорость БПЛА:</span>
                <span className="text-white font-bold">{uavSpeedMs} м/с ({(uavSpeedMs * 3.6).toFixed(0)} км/ч)</span>
              </div>
              <input
                type="range"
                min={18}
                max={75}
                step={1}
                value={uavSpeedMs}
                onChange={(e) => setUavSpeedMs(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Лимит располагаемой перегрузки (n_max):</span>
                <span className="text-amber-400 font-bold">{maxLateralAccelG} G</span>
              </div>
              <input
                type="range"
                min={2.0}
                max={15.0}
                step={0.5}
                value={maxLateralAccelG}
                onChange={(e) => setMaxLateralAccelG(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Vision Sensor & Latency */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-slate-400 font-bold block text-[11px] text-purple-300">
              2. Оптико-Электронный Трекер (AI Camera):
            </span>
            <div>
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>Задержка видеопотока & детектора:</span>
                <span className="text-purple-300 font-bold">{trackingLatencyMs} мс</span>
              </div>
              <input
                type="range"
                min={10}
                max={150}
                step={5}
                value={trackingLatencyMs}
                onChange={(e) => setTrackingLatencyMs(parseInt(e.target.value, 10))}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>

            <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
              <span className="text-teal-300 font-bold flex items-center gap-1.5">
                <Cpu className="w-4 h-4" />
                Калмановская Экстраполяция Траектории
              </span>
              <input
                type="checkbox"
                checked={useKalmanPredictor}
                onChange={(e) => setUseKalmanPredictor(e.target.checked)}
                className="accent-teal-400 w-4 h-4 cursor-pointer"
              />
            </label>
          </div>

          {/* Wind Conditions */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-slate-400 font-bold block text-[11px] text-emerald-300">
              3. Ветровые Возмущения:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500">Скорость ветра ({windSpeedMs} м/с):</span>
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={windSpeedMs}
                  onChange={(e) => setWindSpeedMs(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500">Направление ветра ({windAngleDeg}°):</span>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={15}
                  value={windAngleDeg}
                  onChange={(e) => setWindAngleDeg(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 2D Intercept Trajectory & G-Load Dynamics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart 1: 2D Interception Trajectory (UAV vs Target) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-rose-400" />
                  <span>2D Траектория Сближения: БПЛА vs Цель (Плоскость X-Y)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Красная линия: траектория БПЛА. Зеленая линия: движение цели. Точка схождения — точка перехвата.
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-xl bg-rose-950 text-rose-300 border border-rose-800">
                Закон: {guidanceLaw.toUpperCase()} (N = {navRatioN})
              </span>
            </div>

            <div className="h-72 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={simResults.trajectoryData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="uavX"
                    type="number"
                    stroke="#64748b"
                    label={{ value: 'Координата X (м)', position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    label={{ value: 'Координата Y (м)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem' }}
                    formatter={(value: any, name: string) => {
                      if (name === 'uavY') return [`${value} м`, 'Y Позиция БПЛА'];
                      if (name === 'targetY') return [`${value} м`, 'Y Позиция Цели'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="uavY"
                    name="Траектория БПЛА (Y, м)"
                    stroke="#f43f5e"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="targetY"
                    name="Траектория Цели (Y, м)"
                    stroke="#34d399"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Commanded G-Load & Line-of-Sight Rate Over Time */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span>Потребная Перегрузка ny (G) & Скорость Вращения Линии Визирования dλ/dt</span>
                </h3>
                <p className="text-xs text-slate-400">
                  В идеальной пропорциональной навигации dλ/dt → 0, что гарантирует выход на цель без срыва в штопор.
                </p>
              </div>
            </div>

            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={simResults.trajectoryData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="timeSec" stroke="#64748b" label={{ value: 'Время полета (сек)', position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }} />
                  <YAxis stroke="#94a3b8" label={{ value: 'Перегрузка ny (G)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="commandedAccelG"
                    name="Командная перегрузка ny (G)"
                    stroke="#fbbf24"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="losRateDps"
                    name="Угловая скорость визирования dλ/dt (°/с)"
                    stroke="#a855f7"
                    strokeWidth={2}
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
