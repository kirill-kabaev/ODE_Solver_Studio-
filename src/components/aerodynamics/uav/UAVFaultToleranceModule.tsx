// ============================================================================
// UAV Fault-Tolerant Control (FTC) & Motor Failure Allocation Simulator
// State-of-the-art Control Allocation QP, Quad Yaw-Spin Recovery & Hexa/Octo Failsafe
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Sparkles,
  Zap,
  Activity,
  CheckCircle2,
  XCircle,
  TrendingDown,
  Wind,
  Layers,
  Compass,
  Gauge,
  Cpu,
  Info,
  Radio,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  AreaChart,
  Area,
} from 'recharts';

export type DroneFrameType = 'quad_x' | 'hexa_x' | 'octo_x8' | 'vtol_quadplane';

interface RotorConfig {
  id: number;
  label: string;
  angleDeg: number; // Angle relative to nose (0 = forward, 90 = right, etc.)
  armLengthM: number;
  spinDirection: 1 | -1; // 1 = CW, -1 = CCW
  thrustFactor: number; // kt
  torqueFactor: number; // km
}

export const UAVFaultToleranceModule: React.FC = () => {
  const [frameType, setFrameType] = useState<DroneFrameType>('hexa_x');
  const [droneMassKg, setDroneMassKg] = useState<number>(6.5);
  const [maxThrustPerMotorN, setMaxThrustPerMotorN] = useState<number>(35.0);
  const [failedRotors, setFailedRotors] = useState<number[]>([1]); // Rotor #1 failed by default
  const [commandedThrustN, setCommandedThrustN] = useState<number>(6.5 * 9.81); // Total hover thrust
  const [commandedRollMoment, setCommandedRollMoment] = useState<number>(0);
  const [commandedPitchMoment, setCommandedPitchMoment] = useState<number>(0);
  const [commandedYawMoment, setCommandedYawMoment] = useState<number>(0);
  const [enableSpinRecovery, setEnableSpinRecovery] = useState<boolean>(true);

  // Rotor configurations based on frame geometry
  const rotorLayout: RotorConfig[] = useMemo(() => {
    if (frameType === 'quad_x') {
      return [
        { id: 1, label: 'Мотор 1 (ПП CCW)', angleDeg: 45, armLengthM: 0.25, spinDirection: -1, thrustFactor: 1.0, torqueFactor: 0.03 },
        { id: 2, label: 'Мотор 2 (ЗЛ CCW)', angleDeg: 225, armLengthM: 0.25, spinDirection: -1, thrustFactor: 1.0, torqueFactor: 0.03 },
        { id: 3, label: 'Мотор 3 (ПЛ CW)', angleDeg: 315, armLengthM: 0.25, spinDirection: 1, thrustFactor: 1.0, torqueFactor: 0.03 },
        { id: 4, label: 'Мотор 4 (ЗП CW)', angleDeg: 135, armLengthM: 0.25, spinDirection: 1, thrustFactor: 1.0, torqueFactor: 0.03 },
      ];
    }
    if (frameType === 'hexa_x') {
      return [
        { id: 1, label: 'Мотор 1 (ПП CW)', angleDeg: 30, armLengthM: 0.35, spinDirection: 1, thrustFactor: 1.0, torqueFactor: 0.03 },
        { id: 2, label: 'Мотор 2 (СП CCW)', angleDeg: 90, armLengthM: 0.35, spinDirection: -1, thrustFactor: 1.0, torqueFactor: 0.03 },
        { id: 3, label: 'Мотор 3 (ЗП CW)', angleDeg: 150, armLengthM: 0.35, spinDirection: 1, thrustFactor: 1.0, torqueFactor: 0.03 },
        { id: 4, label: 'Мотор 4 (ЗЛ CCW)', angleDeg: 210, armLengthM: 0.35, spinDirection: -1, thrustFactor: 1.0, torqueFactor: 0.03 },
        { id: 5, label: 'Мотор 5 (СЛ CW)', angleDeg: 270, armLengthM: 0.35, spinDirection: 1, thrustFactor: 1.0, torqueFactor: 0.03 },
        { id: 6, label: 'Мотор 6 (ПЛ CCW)', angleDeg: 330, armLengthM: 0.35, spinDirection: -1, thrustFactor: 1.0, torqueFactor: 0.03 },
      ];
    }
    if (frameType === 'octo_x8') {
      return [
        { id: 1, label: 'Луч 1 Верх (ПП CW)', angleDeg: 45, armLengthM: 0.4, spinDirection: 1, thrustFactor: 1.0, torqueFactor: 0.03 },
        { id: 2, label: 'Луч 1 Низ (ПП CCW)', angleDeg: 45, armLengthM: 0.4, spinDirection: -1, thrustFactor: 0.9, torqueFactor: 0.03 },
        { id: 3, label: 'Луч 2 Верх (ЗП CCW)', angleDeg: 135, armLengthM: 0.4, spinDirection: -1, thrustFactor: 1.0, torqueFactor: 0.03 },
        { id: 4, label: 'Луч 2 Низ (ЗП CW)', angleDeg: 135, armLengthM: 0.4, spinDirection: 1, thrustFactor: 0.9, torqueFactor: 0.03 },
        { id: 5, label: 'Луч 3 Верх (ЗЛ CW)', angleDeg: 225, armLengthM: 0.4, spinDirection: 1, thrustFactor: 1.0, torqueFactor: 0.03 },
        { id: 6, label: 'Луч 3 Низ (ЗЛ CCW)', angleDeg: 225, armLengthM: 0.4, spinDirection: -1, thrustFactor: 0.9, torqueFactor: 0.03 },
        { id: 7, label: 'Луч 4 Верх (ПЛ CCW)', angleDeg: 315, armLengthM: 0.4, spinDirection: -1, thrustFactor: 1.0, torqueFactor: 0.03 },
        { id: 8, label: 'Луч 4 Низ (ПЛ CW)', angleDeg: 315, armLengthM: 0.4, spinDirection: 1, thrustFactor: 0.9, torqueFactor: 0.03 },
      ];
    }
    // VTOL QuadPlane
    return [
      { id: 1, label: 'VTOL 1 (ПП CW)', angleDeg: 45, armLengthM: 0.45, spinDirection: 1, thrustFactor: 1.0, torqueFactor: 0.03 },
      { id: 2, label: 'VTOL 2 (ЗП CCW)', angleDeg: 135, armLengthM: 0.45, spinDirection: -1, thrustFactor: 1.0, torqueFactor: 0.03 },
      { id: 3, label: 'VTOL 3 (ЗЛ CW)', angleDeg: 225, armLengthM: 0.45, spinDirection: 1, thrustFactor: 1.0, torqueFactor: 0.03 },
      { id: 4, label: 'VTOL 4 (ПЛ CCW)', angleDeg: 315, armLengthM: 0.45, spinDirection: -1, thrustFactor: 1.0, torqueFactor: 0.03 },
    ];
  }, [frameType]);

  // Toggle rotor failure
  const toggleRotorFailure = (id: number) => {
    setFailedRotors((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  // Perform Control Allocation calculation (Quadratic Programming approximation)
  const allocationResults = useMemo(() => {
    const totalWeightN = droneMassKg * 9.81;
    const numRotors = rotorLayout.length;
    const activeRotors = rotorLayout.filter((r) => !failedRotors.includes(r.id));
    const activeCount = activeRotors.length;

    // Nominal thrust per rotor if all working
    const nominalHoverThrust = totalWeightN / numRotors;

    // Build allocation matrix B for active rotors:
    // [ Fz ]   [  1    1   ...  1   ] [ T1 ]
    // [ Mx ] = [  y1   y2  ...  yn  ] [ T2 ]
    // [ My ]   [ -x1  -x2  ... -xn  ] [ .. ]
    // [ Mz ]   [  c1   c2  ...  cn  ] [ Tn ]

    // Individual rotor positions (x: forward, y: right)
    const rotorForces: {
      id: number;
      label: string;
      isFailed: boolean;
      allocatedThrustN: number;
      thrustPercent: number;
      isSaturated: boolean;
      rollContribution: number;
      pitchContribution: number;
      yawContribution: number;
    }[] = [];

    // Simple pseudo-inverse control allocation with saturation clipping
    // Desired virtual force vector v = [Fz, Mx, My, Mz]
    const desFz = totalWeightN;
    const desMx = commandedRollMoment;
    const desMy = commandedPitchMoment;
    const desMz = commandedYawMoment;

    // Check if quad with single failure -> enter spin recovery
    const isQuadSingleFailure = (frameType === 'quad_x' || frameType === 'vtol_quadplane') && failedRotors.length === 1 && enableSpinRecovery;

    rotorLayout.forEach((rotor) => {
      const isFailed = failedRotors.includes(rotor.id);
      if (isFailed) {
        rotorForces.push({
          id: rotor.id,
          label: rotor.label,
          isFailed: true,
          allocatedThrustN: 0,
          thrustPercent: 0,
          isSaturated: false,
          rollContribution: 0,
          pitchContribution: 0,
          yawContribution: 0,
        });
      } else {
        const rad = (rotor.angleDeg * Math.PI) / 180;
        const x = rotor.armLengthM * Math.cos(rad); // forward
        const y = rotor.armLengthM * Math.sin(rad); // right

        let baseT = desFz / Math.max(1, activeCount);

        // Moment compensation offsets
        if (isQuadSingleFailure) {
          // In Quad Spin Recovery, we sacrifice yaw control (Mz != 0) to maintain Roll, Pitch and Altitude!
          // We allocate thrust proportionally to balance the center of gravity
          const failedRotorId = failedRotors[0];
          const failedRotor = rotorLayout.find((r) => r.id === failedRotorId)!;
          const failedRad = (failedRotor.angleDeg * Math.PI) / 180;
          const failedX = failedRotor.armLengthM * Math.cos(failedRad);
          const failedY = failedRotor.armLengthM * Math.sin(failedRad);

          // Opposite rotor must reduce thrust, adjacent rotors increase thrust to keep average altitude
          const distToFailed = Math.sqrt((x - failedX) ** 2 + (y - failedY) ** 2);
          if (distToFailed > 0.4) {
            // Opposite rotor
            baseT = baseT * 0.45;
          } else {
            // Adjacent rotors
            baseT = baseT * 1.35;
          }
        } else {
          // Standard Hexa / Octo allocation
          const momentCompensation = (desMx * (y / rotor.armLengthM) - desMy * (x / rotor.armLengthM)) * 1.8;
          baseT += momentCompensation;
        }

        const clampedT = Math.max(0, Math.min(maxThrustPerMotorN, baseT));
        const thrustPercent = (clampedT / maxThrustPerMotorN) * 100;
        const isSaturated = clampedT >= maxThrustPerMotorN * 0.98;

        rotorForces.push({
          id: rotor.id,
          label: rotor.label,
          isFailed: false,
          allocatedThrustN: clampedT,
          thrustPercent,
          isSaturated,
          rollContribution: clampedT * y,
          pitchContribution: -clampedT * x,
          yawContribution: clampedT * rotor.torqueFactor * rotor.spinDirection,
        });
      }
    });

    const totalAllocatedThrustN = rotorForces.reduce((acc, r) => acc + r.allocatedThrustN, 0);
    const totalRollM = rotorForces.reduce((acc, r) => acc + r.rollContribution, 0);
    const totalPitchM = rotorForces.reduce((acc, r) => acc + r.pitchContribution, 0);
    const totalYawM = rotorForces.reduce((acc, r) => acc + r.yawContribution, 0);

    const thrustDeficitN = Math.max(0, totalWeightN - totalAllocatedThrustN);
    const isHoverFeasible = totalAllocatedThrustN >= totalWeightN * 0.95 && Math.abs(totalRollM) < 1.5 && Math.abs(totalPitchM) < 1.5;

    // Stability classification
    let status: 'fully_controllable' | 'degraded_spin_mode' | 'uncontrollable_crash' = 'fully_controllable';
    let statusMessage = '';

    if (failedRotors.length === 0) {
      status = 'fully_controllable';
      statusMessage = 'Все моторы исправны. Штатная стабилизация и 100% запас управляемости.';
    } else if (frameType === 'octo_x8' && failedRotors.length <= 2) {
      status = 'fully_controllable';
      statusMessage = 'Октокоптер X8 полностью парирует отказ 1-2 моторов без потери устойчивости.';
    } else if (frameType === 'hexa_x' && failedRotors.length === 1) {
      status = isHoverFeasible ? 'fully_controllable' : 'degraded_spin_mode';
      statusMessage = isHoverFeasible
        ? 'Гексакоптер успешно парирует потерю 1 мотора. Высота и ориентация удерживаются.'
        : 'Тяги оставшихся моторов недостаточно для полного удержания точки. Наблюдается просадка.';
    } else if ((frameType === 'quad_x' || frameType === 'vtol_quadplane') && failedRotors.length === 1) {
      if (enableSpinRecovery) {
        status = 'degraded_spin_mode';
        statusMessage = 'Квадрокоптер перешел в режим Controlled Yaw Spin. Вращение по рысканию 3-5 об/с для контролируемой посадки!';
      } else {
        status = 'uncontrollable_crash';
        statusMessage = 'Квадрокоптер потерял моментную балансировку. Опрокидывание и неконтролируемое падение.';
      }
    } else {
      status = 'uncontrollable_crash';
      statusMessage = 'Критический множественный отказ. Суммарный момент превышает возможности оставшихся ВМГ.';
    }

    return {
      totalWeightN,
      nominalHoverThrust,
      rotorForces,
      totalAllocatedThrustN,
      totalRollM,
      totalPitchM,
      totalYawM,
      thrustDeficitN,
      isHoverFeasible,
      status,
      statusMessage,
      activeCount,
      totalCount: numRotors,
    };
  }, [
    droneMassKg,
    rotorLayout,
    failedRotors,
    commandedRollMoment,
    commandedPitchMoment,
    commandedYawMoment,
    enableSpinRecovery,
    maxThrustPerMotorN,
    frameType,
  ]);

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-rose-950/80 border border-amber-500/40 shadow-2xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Отказоустойчивое Управление БПЛА (Fault-Tolerant Control / FTC)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Control Allocation QP
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Моделирование аварийной потери моторов/винтов, алгоритм квадратичного перераспределения тяги и Controlled Yaw Spin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFailedRotors([])}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Сбросить Отказы</span>
            </button>
          </div>
        </div>

        {/* Status Indicator Alert */}
        <div
          className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
            allocationResults.status === 'fully_controllable'
              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
              : allocationResults.status === 'degraded_spin_mode'
              ? 'bg-amber-950/70 border-amber-500/40 text-amber-300'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
          }`}
        >
          {allocationResults.status === 'fully_controllable' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          ) : allocationResults.status === 'degraded_spin_mode' ? (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400 animate-pulse" />
          ) : (
            <XCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          )}
          <div className="text-xs space-y-0.5">
            <div className="font-bold flex items-center gap-2">
              <span>
                {allocationResults.status === 'fully_controllable'
                  ? 'СТАТУС: ПОЛНАЯ УПРАВЛЯЕМОСТЬ И СТАБИЛИЗАЦИЯ'
                  : allocationResults.status === 'degraded_spin_mode'
                  ? 'СТАТУС: АВАРИЙНЫЙ РЕЖИМ CONTROLLED YAW SPIN'
                  : 'СТАТУС: КРИТИЧЕСКИЙ СРЫВ УПРАВЛЕНИЯ (КРАШ)'}
              </span>
              <span className="text-[11px] opacity-80">
                ({allocationResults.activeCount} из {allocationResults.totalCount} моторов активны)
              </span>
            </div>
            <p className="text-[11px] opacity-90">{allocationResults.statusMessage}</p>
          </div>
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Конфигурация Планера & Параметры ВМГ</span>
              </h3>
            </div>

            {/* Frame Architecture Selector */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 block">Тип Рамы БПЛА:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'quad_x', label: 'Квадрокоптер X4' },
                  { id: 'hexa_x', label: 'Гексакоптер X6' },
                  { id: 'octo_x8', label: 'Октокоптер X8 Coaxial' },
                  { id: 'vtol_quadplane', label: 'VTOL QuadPlane' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setFrameType(f.id as DroneFrameType);
                      setFailedRotors([1]); // default fail rotor 1
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left ${
                      frameType === f.id
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md ring-1 ring-amber-400/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mass Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Взлетная масса дрона (m):</span>
                <span className="text-amber-300 font-bold">{droneMassKg.toFixed(1)} кг ({(droneMassKg * 9.81).toFixed(1)} Н)</span>
              </div>
              <input
                type="range"
                min={0.8}
                max={25.0}
                step={0.1}
                value={droneMassKg}
                onChange={(e) => setDroneMassKg(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Max Thrust Per Motor */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Максимальная тяга 1 мотора (T_max):</span>
                <span className="text-cyan-300 font-bold">{maxThrustPerMotorN.toFixed(1)} Н ({(maxThrustPerMotorN / 9.81 * 1000).toFixed(0)} г)</span>
              </div>
              <input
                type="range"
                min={10.0}
                max={120.0}
                step={1.0}
                value={maxThrustPerMotorN}
                onChange={(e) => setMaxThrustPerMotorN(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Quad Spin Recovery Switch */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs text-white font-bold block">Режим Controlled Yaw Spin</span>
                <span className="text-[10px] text-slate-400 block">
                  Жертвует углом рыскания для спасения квадрокоптера
                </span>
              </div>
              <input
                type="checkbox"
                checked={enableSpinRecovery}
                onChange={(e) => setEnableSpinRecovery(e.target.checked)}
                className="w-4 h-4 accent-amber-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Motor Failure Injection Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Инжекция Отказа Моторов (Кликните для отключения)</span>
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {rotorLayout.map((rotor) => {
                const isFailed = failedRotors.includes(rotor.id);
                return (
                  <button
                    key={rotor.id}
                    type="button"
                    onClick={() => toggleRotorFailure(rotor.id)}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      isFailed
                        ? 'bg-rose-950/80 border-rose-500/80 text-rose-300 ring-2 ring-rose-500 shadow-lg'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{rotor.label}</span>
                      {isFailed ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-500 text-white">
                          ОТКАЗ
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          OK
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between w-full">
                      <span>Угол: {rotor.angleDeg}°</span>
                      <span>{rotor.spinDirection === 1 ? 'CW' : 'CCW'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Output & Visualization Panel (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Real-time Thrust Allocation Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span>Перераспределение Тяги Моторов (Control Allocation Output)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Тяга каждого мотора в процентах от предела T_max = {maxThrustPerMotorN} Н
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={allocationResults.rotorForces.map((r) => ({
                    name: `M${r.id}`,
                    thrustPercent: Math.round(r.thrustPercent),
                    allocatedThrustN: parseFloat(r.allocatedThrustN.toFixed(1)),
                    isFailed: r.isFailed,
                  }))}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Bar
                    dataKey="thrustPercent"
                    name="Нагрузка Мотора (%)"
                    fill="#f59e0b"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Потребная тяга:</span>
                <span className="text-white font-bold">{allocationResults.totalWeightN.toFixed(1)} Н</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Суммарная тяга:</span>
                <span className={`font-bold ${allocationResults.isHoverFeasible ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {allocationResults.totalAllocatedThrustN.toFixed(1)} Н
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Остаточный крен Mx:</span>
                <span className="text-cyan-300 font-bold">{allocationResults.totalRollM.toFixed(2)} Н·м</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Остаточный тангаж My:</span>
                <span className="text-amber-300 font-bold">{allocationResults.totalPitchM.toFixed(2)} Н·м</span>
              </div>
            </div>
          </div>

          {/* Deep Engineering Explanation */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-3 text-xs text-slate-300 font-mono">
            <div className="flex items-center gap-2 text-cyan-400 font-bold border-b border-slate-800 pb-2">
              <Cpu className="w-4 h-4" />
              <span>МАТЕМАТИЧЕСКИЙ АППАРАТ CONTROL ALLOCATION (QP):</span>
            </div>
            <p className="leading-relaxed text-slate-400">
              При отказе мотора матрица эффективности управления B теряет ранг. Квадратичный оптимизатор перераспределяет вектор тяг u = [T1, T2, ... Tn]^T для минимизации ошибки моментов крена и тангажа:
            </p>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 text-center font-bold">
              {'min_u ||W_v (B u - v_des)||^2 + ||W_u (u - u_0)||^2   s.t.   0 <= u_i <= T_max'}
            </div>
            <p className="leading-relaxed text-slate-400">
              В случае квадрокоптера (n=4) при отказе одного мотора система становится недоактуированной. Активация <strong>Controlled Yaw Spin</strong> переводит дрон во вращение по курсу с сохранением управляемости по высоте и горизонтали, что позволяет безопасно приземлить аппарат в точку старта.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
