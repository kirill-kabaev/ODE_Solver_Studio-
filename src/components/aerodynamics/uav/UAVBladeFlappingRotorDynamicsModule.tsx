// ============================================================================
// UAV Blade Flapping & Rotor-Arm Downwash Aero Interference Module
// Harmonic Flapping Dynamics, Advance Ratio \mu, H-Force Drag & Arm Wake Penalty
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Wind,
  RotateCw,
  Sliders,
  Activity,
  Zap,
  Shield,
  Layers,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Sparkles,
  Compass,
  ArrowRight,
  Maximize2,
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
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from 'recharts';
import { FullscreenGraphButton } from '../../telemetry/FullscreenGraphButton';

export interface ArmProfileDef {
  id: string;
  name: string;
  cdDrag: number;
  wakeLossMultiplier: number;
  description: string;
}

export const ARM_PROFILES: ArmProfileDef[] = [
  { id: 'round_tube', name: 'Круглая карбоновая трубка (Ø 25–30 мм)', cdDrag: 1.15, wakeLossMultiplier: 1.0, description: 'Стандартная рама, сильный отрыв потока в струе винта' },
  { id: 'square_tube', name: 'Квадратный профиль / Лучевой брус', cdDrag: 1.95, wakeLossMultiplier: 1.45, description: 'Максимальное сопротивление скосу потока, потеря тяги до 9%' },
  { id: 'teardrop_aero', name: 'Каплевидный аэродинамический профиль', cdDrag: 0.22, wakeLossMultiplier: 0.28, description: 'Снижение затенения и паразитного сопротивления струи на 72%' },
  { id: 'faired_winglet', name: 'Интегрированный лучевой обтекатель (NACA 0020)', cdDrag: 0.12, wakeLossMultiplier: 0.18, description: 'Оптимизирован для скоростных FPV и VTOL дронов' },
];

export const UAVBladeFlappingRotorDynamicsModule: React.FC = () => {
  // Input parameters
  const [forwardSpeedKmh, setForwardSpeedKmh] = useState<number>(75); // Forward flight speed (km/h)
  const [rotorRpm, setRotorRpm] = useState<number>(6200); // RPM
  const [propDiameterInch, setPropDiameterInch] = useState<number>(10); // Prop diameter (inches)
  const [bladePitchInch, setBladePitchInch] = useState<number>(5.0); // Prop pitch (inches)
  const [bladeHingeOffsetPct, setBladeHingeOffsetPct] = useState<number>(3.5); // Virtual flapping hinge e/R (%)
  const [bladeLockNumber, setBladeLockNumber] = useState<number>(6.8); // Lock number gamma (aerodynamic vs inertial)
  const [selectedArmProfileId, setSelectedArmProfileId] = useState<string>('round_tube');
  const [armClearanceMm, setArmClearanceMm] = useState<number>(22); // Distance from blade to arm (mm)
  const [altitudeM, setAltitudeM] = useState<number>(150);

  // Air density ISA
  const airDensity = useMemo(() => {
    const rho0 = 1.225;
    return +(rho0 * Math.exp(-altitudeM / 8500)).toFixed(4);
  }, [altitudeM]);

  // Selected arm geometry
  const activeArm = useMemo(() => {
    return ARM_PROFILES.find((a) => a.id === selectedArmProfileId) || ARM_PROFILES[0];
  }, [selectedArmProfileId]);

  // Kinematic & Dynamic parameters
  const rotorDynamics = useMemo(() => {
    const vInfMs = forwardSpeedKmh / 3.6;
    const radiusM = (propDiameterInch * 0.0254) / 2;
    const omegaRadS = (rotorRpm * 2 * Math.PI) / 60;
    const tipSpeedMs = omegaRadS * radiusM;
    const advanceRatioMu = +(vInfMs / tipSpeedMs).toFixed(3); // \mu = V / (\Omega R)

    // Tip Mach number (advancing tip)
    const speedOfSound = 340.3;
    const advancingTipMach = +((tipSpeedMs + vInfMs) / speedOfSound).toFixed(3);

    // Harmonic Flapping coefficients
    // beta(psi) = a0 - a1*cos(psi) - b1*sin(psi)
    // a0: coning angle (deg)
    // a1: longitudinal flapping angle (backward tilt due to forward flight)
    // b1: lateral flapping angle
    const theta0 = (Math.atan(bladePitchInch / (Math.PI * propDiameterInch)) * 180) / Math.PI; // collective pitch deg
    const coningA0Deg = +(0.8 + (bladeLockNumber / 8) * (theta0 / 12)).toFixed(2);
    const longitudinalA1Deg = +((2 * advanceRatioMu * (theta0 / 10) * (bladeLockNumber / 7)).toFixed(2));
    const lateralB1Deg = +(0.35 * longitudinalA1Deg).toFixed(2);

    // Rotor in-plane H-force (N) per rotor (drag in direction of flight)
    // H = 0.5 * rho * (Omega R)^2 * A * [ (sigma*Cd0/8)*mu + (sigma*a/8)*(mu*theta0/...) ]
    const rotorDiskArea = Math.PI * Math.pow(radiusM, 2);
    const nominalThrustN = +(0.5 * airDensity * Math.pow(tipSpeedMs, 2) * rotorDiskArea * 0.012).toFixed(2);
    const hForceDragN = +(nominalThrustN * advanceRatioMu * 0.18 + (advanceRatioMu * 2.8)).toFixed(2);

    // Rotor Pitch-up Moment due to asymmetry
    const pitchUpMomentNm = +(hForceDragN * radiusM * 0.65).toFixed(3);

    // Arm Downwash Wake Impingement Loss
    // Base induced downwash velocity v_i = sqrt(T / (2 rho A))
    const inducedDownwashMs = Math.sqrt(nominalThrustN / (2 * airDensity * rotorDiskArea));
    const armAreaM2 = 0.025 * radiusM; // typical arm area exposed to slipstream
    const armDragN = +(0.5 * airDensity * Math.pow(inducedDownwashMs * 1.8, 2) * activeArm.cdDrag * armAreaM2).toFixed(2);
    const thrustLossPct = +((armDragN / nominalThrustN) * 100 * activeArm.wakeLossMultiplier * Math.max(0.6, 30 / armClearanceMm)).toFixed(2);

    return {
      vInfMs: +vInfMs.toFixed(1),
      radiusM: +radiusM.toFixed(3),
      tipSpeedMs: +tipSpeedMs.toFixed(1),
      advanceRatioMu,
      advancingTipMach,
      coningA0Deg,
      longitudinalA1Deg,
      lateralB1Deg,
      nominalThrustN,
      hForceDragN,
      pitchUpMomentNm,
      inducedDownwashMs: +inducedDownwashMs.toFixed(1),
      armDragN,
      thrustLossPct,
      isTransonicTip: advancingTipMach > 0.75,
      isHighFlappingTilt: longitudinalA1Deg > 4.0,
    };
  }, [forwardSpeedKmh, rotorRpm, propDiameterInch, bladePitchInch, bladeLockNumber, airDensity, activeArm, armClearanceMm]);

  // Generate 360-degree Azimuth Flapping and Dynamic Pressure Curve
  const azimuthData = useMemo(() => {
    const data = [];
    for (let psi = 0; psi <= 360; psi += 15) {
      const psiRad = (psi * Math.PI) / 180;
      // beta(psi) = a0 - a1*cos(psi) - b1*sin(psi)
      const betaDeg =
        rotorDynamics.coningA0Deg -
        rotorDynamics.longitudinalA1Deg * Math.cos(psiRad) -
        rotorDynamics.lateralB1Deg * Math.sin(psiRad);

      // Local relative dynamic pressure at 75% radius
      // V_rel = Omega*r + V_inf*sin(psi)
      const r75 = rotorDynamics.radiusM * 0.75;
      const omega = (rotorRpm * 2 * Math.PI) / 60;
      const vLocal = omega * r75 + (forwardSpeedKmh / 3.6) * Math.sin(psiRad);
      const qLocalKPa = (0.5 * airDensity * Math.pow(vLocal, 2)) / 1000;

      data.push({
        psi,
        psiLabel: `${psi}°`,
        betaDeg: +betaDeg.toFixed(2),
        qLocalKPa: +qLocalKPa.toFixed(2),
        vLocalMs: +vLocal.toFixed(1),
      });
    }
    return data;
  }, [rotorDynamics, rotorRpm, forwardSpeedKmh, airDensity]);

  return (
    <div className="bg-slate-900 border border-teal-800/50 rounded-2xl p-6 shadow-2xl space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-teal-800/40 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md text-xs font-black tracking-wider bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 uppercase shadow-md">
              Нестационарная Аэродинамика
            </span>
            <span className="text-xs text-teal-400 font-mono flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5" /> Blade Flapping & Rotor-Arm Downwash
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            <Wind className="w-6 h-6 text-teal-400" />
            Маховое Движение Лопастей & Аэродинамика Лучей Рамы БПЛА
          </h2>
          <p className="text-slate-400 text-sm max-w-3xl mt-1">
            Анализ скоса потока, коэффициента опережения $\mu$, паразитной H-силы торможения, кабрирующего момента автопилота и интерференционных потерь тяги винта от затенения лучами рамы.
          </p>
        </div>

        {/* Arm Profile Quick Select */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-2 rounded-xl border border-teal-900/50">
          <Shield className="w-4 h-4 text-teal-400" />
          <select
            value={selectedArmProfileId}
            onChange={(e) => setSelectedArmProfileId(e.target.value)}
            className="bg-slate-900 text-teal-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-teal-700/60 focus:outline-none focus:ring-1 focus:ring-teal-400"
          >
            {ARM_PROFILES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl border border-teal-900/50 bg-slate-950/60 text-teal-300">
          <div className="text-xs uppercase font-bold text-slate-400">Коэфф. Опережения ($\mu$)</div>
          <div className="text-2xl font-black mt-1 font-mono text-cyan-300">{rotorDynamics.advanceRatioMu}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            $V_\infty / (\Omega R)$ (Скорость: {forwardSpeedKmh} км/ч)
          </div>
        </div>

        <div className={`p-4 rounded-xl border backdrop-blur-md transition-all ${
          rotorDynamics.isTransonicTip
            ? 'bg-rose-950/40 border-rose-500/60 text-rose-300'
            : 'bg-slate-950/60 border-teal-900/50 text-teal-300'
        }`}>
          <div className="text-xs uppercase font-bold text-slate-400 flex items-center justify-between">
            <span>Мах Кончика Лопасти</span>
            {rotorDynamics.isTransonicTip && <AlertTriangle className="w-4 h-4 text-rose-400" />}
          </div>
          <div className="text-2xl font-black mt-1 font-mono">M = {rotorDynamics.advancingTipMach}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Наступающая лопасть ($\psi = 90^\circ$)
          </div>
        </div>

        <div className="p-4 rounded-xl border border-teal-900/50 bg-slate-950/60 text-teal-300">
          <div className="text-xs uppercase font-bold text-slate-400">Маховый Угол Тангажа ($a_1$)</div>
          <div className="text-2xl font-black mt-1 font-mono text-amber-300">{rotorDynamics.longitudinalA1Deg}°</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Наклон конуса назад (Кабрирование)
          </div>
        </div>

        <div className={`p-4 rounded-xl border backdrop-blur-md transition-all ${
          rotorDynamics.thrustLossPct > 5.0
            ? 'bg-amber-950/40 border-amber-500/60 text-amber-300'
            : 'bg-slate-950/60 border-teal-900/50 text-emerald-300'
        }`}>
          <div className="text-xs uppercase font-bold text-slate-400 flex items-center justify-between">
            <span>Потеря Тяги от Луча</span>
            <TrendingDown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black mt-1 font-mono">-{rotorDynamics.thrustLossPct}%</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Торможение струи: {rotorDynamics.armDragN} Н
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-950/70 p-4 rounded-xl border border-teal-900/40 space-y-3.5">
            <h3 className="text-sm font-bold text-teal-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Параметры Полета & Геометрия Винтомоторной Группы
            </h3>

            {/* Forward Speed */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Поступательная Скорость ($V_\infty$)</span>
                <span className="font-mono text-cyan-300 font-bold">{forwardSpeedKmh} км/ч ({rotorDynamics.vInfMs} м/с)</span>
              </div>
              <input
                type="range"
                min={0}
                max={160}
                step={2}
                value={forwardSpeedKmh}
                onChange={(e) => setForwardSpeedKmh(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
            </div>

            {/* Rotor RPM */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Обороты Винта (RPM)</span>
                <span className="font-mono text-teal-300 font-bold">{rotorRpm} об/мин</span>
              </div>
              <input
                type="range"
                min={2000}
                max={15000}
                step={200}
                value={rotorRpm}
                onChange={(e) => setRotorRpm(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
            </div>

            {/* Propeller Diameter & Pitch */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Диаметр (D)</span>
                  <span className="font-mono text-indigo-300">{propDiameterInch}"</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={28}
                  step={0.5}
                  value={propDiameterInch}
                  onChange={(e) => setPropDiameterInch(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Шаг (Pitch)</span>
                  <span className="font-mono text-indigo-300">{bladePitchInch}"</span>
                </div>
                <input
                  type="range"
                  min={2.5}
                  max={14}
                  step={0.5}
                  value={bladePitchInch}
                  onChange={(e) => setBladePitchInch(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
              </div>
            </div>

            {/* Arm Clearance & Lock Number */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Зазор до Луча</span>
                  <span className="font-mono text-emerald-300">{armClearanceMm} мм</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={60}
                  step={2}
                  value={armClearanceMm}
                  onChange={(e) => setArmClearanceMm(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Число Локка ($\gamma$)</span>
                  <span className="font-mono text-emerald-300">{bladeLockNumber}</span>
                </div>
                <input
                  type="range"
                  min={3.0}
                  max={12.0}
                  step={0.2}
                  value={bladeLockNumber}
                  onChange={(e) => setBladeLockNumber(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
              </div>
            </div>
          </div>

          {/* Theoretical Summary Box */}
          <div className="bg-teal-950/30 p-3.5 rounded-xl border border-teal-900/60 text-xs space-y-2">
            <div className="font-bold text-teal-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Физика Махового Движения Лопасти
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              На наступающей лопасти (азимут 90°) скорость набегающего потока возрастает, вызывая рост подъемной силы и взмах лопасти вверх. Это наклоняет конус вращения назад на угол a₁, порождая кабрирующий момент и паразитную силу торможения H.
            </p>
          </div>
        </div>

        {/* Right: Charts */}
        <div className="lg:col-span-7 space-y-4">
          {/* Azimuth Flapping Angle & Local Speed Graph */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-teal-900/40">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-teal-400" />
                Маховый Угол Взмаха Лопасти β(ψ) и Скоростной Напор q(ψ)
              </h4>
              <FullscreenGraphButton domain="bem_rotor" />
            </div>

            <div className="h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={azimuthData} margin={{ left: -15, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="psiLabel" stroke="#64748b" tick={{ fontSize: 9 }} />
                  <YAxis yAxisId="left" stroke="#38bdf8" tick={{ fontSize: 9 }} unit="°" />
                  <YAxis yAxisId="right" orientation="right" stroke="#34d399" tick={{ fontSize: 9 }} unit=" кПа" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#0d9488', fontSize: '11px' }} />
                  <Line yAxisId="left" type="monotone" dataKey="betaDeg" name="Угол взмаха β (°)" stroke="#38bdf8" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="qLocalKPa" name="Скор. напор (кПа)" stroke="#34d399" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rotor Arm Cross Section Comparison */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {ARM_PROFILES.map((arm) => (
              <button
                key={arm.id}
                type="button"
                onClick={() => setSelectedArmProfileId(arm.id)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  selectedArmProfileId === arm.id
                    ? 'bg-teal-950/80 border-teal-400 text-teal-200 shadow-md ring-1 ring-teal-400'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <div className="font-bold text-[11px] line-clamp-1">{arm.name}</div>
                <div className="font-mono text-cyan-400 text-[10px] mt-1">$C_D = {arm.cdDrag}$</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
