// ============================================================================
// UAV Coaxial & Tiltrotor Dynamics, Rotor Aerodynamic Interference & Gyro Precession Module
// Upper/Lower Rotor Wake Contraction, Gyroscopic Cross-Coupling & Conversion Corridor
// ============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  RotateCw,
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

export interface RotorcraftPreset {
  id: string;
  name: string;
  rotorType: 'coaxial' | 'tiltrotor' | 'intermeshing';
  rotorDiameterM: number;
  dualRotorSpacingM: number; // For coaxial/intermeshing
  grossWeightKg: number;
  hoverRPM: number;
  bladeCount: number;
  bladeChordM: number;
  tiltAngleDeg: number;
  description: string;
}

export const ROTORCRAFT_PRESETS: RotorcraftPreset[] = [
  {
    id: 'coaxial_heavy_lift_ka',
    name: 'Тяжелый Соосный БПЛА (Ка-тип, 2x несущих винта, 120кг)',
    rotorType: 'coaxial',
    rotorDiameterM: 3.6,
    dualRotorSpacingM: 0.45,
    grossWeightKg: 120,
    hoverRPM: 980,
    bladeCount: 3,
    bladeChordM: 0.14,
    tiltAngleDeg: 0,
    description: 'Соосная двухвинтовая схема с взаимной компенсацией реактивных моментов и компактным габаритом.',
  },
  {
    id: 'tiltrotor_v22_scale_uav',
    name: 'БПЛА-Конвертоплан с Поворотными Гондолами (Размах 3.8м, 65кг)',
    rotorType: 'tiltrotor',
    rotorDiameterM: 1.8,
    dualRotorSpacingM: 2.8,
    grossWeightKg: 65,
    hoverRPM: 1450,
    bladeCount: 3,
    bladeChordM: 0.12,
    tiltAngleDeg: 0,
    description: 'Поворотные винты на концах крыла для вертикального взлета и скоростного самолетного полета (до 360 км/ч).',
  },
  {
    id: 'intermeshing_kaman_synchropter',
    name: 'Синхроптер с Перекрещивающимися Винтами (Synchropter 45кг)',
    rotorType: 'intermeshing',
    rotorDiameterM: 2.4,
    dualRotorSpacingM: 0.35,
    grossWeightKg: 45,
    hoverRPM: 1200,
    bladeCount: 2,
    bladeChordM: 0.11,
    tiltAngleDeg: 0,
    description: 'Схема с перекрещивающимися несущими винтами под углом 12° и высочайшим КПД висения (Figure of Merit > 0.78).',
  },
];

export const UAVCoaxialTiltrotorDynamicsModule: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [collectivePitchDeg, setCollectivePitchDeg] = useState<number>(8.5); // 0 to 18 deg
  const [differentialYawPitchDeg, setDifferentialYawPitchDeg] = useState<number>(1.2); // -4 to +4 deg for coaxial yaw
  const [nacelleTiltDeg, setNacelleTiltDeg] = useState<number>(0); // 0 (hover) to 90 (airplane cruise)
  const [flightAirspeedMs, setFlightAirspeedMs] = useState<number>(15); // 0 to 80 m/s
  const [yawRateRadS, setYawRateRadS] = useState<number>(0.5); // rad/s for gyro precession calculation

  // Simulation & Animation
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [animAngle, setAnimAngle] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const preset = ROTORCRAFT_PRESETS[selectedPresetIdx];

  // Mathematical Coaxial Rotor Aerodynamics & Gyro Calculations
  const calculations = useMemo(() => {
    const rhoAir = 1.225;
    const g = 9.81;
    const rotorRadius = preset.rotorDiameterM / 2;
    const diskAreaA = Math.PI * Math.pow(rotorRadius, 2);
    const radPerSec = (preset.hoverRPM * 2 * Math.PI) / 60;
    const tipSpeed = radPerSec * rotorRadius;

    // Solidty sigma = (B * c) / (pi * R)
    const solidity = (preset.bladeCount * preset.bladeChordM) / (Math.PI * rotorRadius);

    // Aerodynamic Interference Factor in Coaxial Systems:
    // Upper rotor wake contracts and accelerates inflow to lower rotor.
    // Lower rotor effective induced velocity is increased by ~1.35x.
    const spacingRatio = preset.dualRotorSpacingM / preset.rotorDiameterM;
    const upperInterferenceFactor = 1.0;
    const lowerInterferenceFactor = 1.0 + 0.38 * Math.exp(-spacingRatio * 4.5);

    // Blade element lift and thrust calculation
    const clSlope = 5.7; // 2D lift curve slope
    const effectiveUpperPitchRad = ((collectivePitchDeg + differentialYawPitchDeg / 2) * Math.PI) / 180;
    const effectiveLowerPitchRad = ((collectivePitchDeg - differentialYawPitchDeg / 2) * Math.PI) / 180;

    // Ideal thrust per rotor
    const thrustUpperN = 0.5 * rhoAir * diskAreaA * Math.pow(tipSpeed, 2) * (solidity * clSlope * effectiveUpperPitchRad / 6) * upperInterferenceFactor;
    const thrustLowerN = 0.5 * rhoAir * diskAreaA * Math.pow(tipSpeed, 2) * (solidity * clSlope * effectiveLowerPitchRad / 6) * (1 / lowerInterferenceFactor);
    const totalThrustN = thrustUpperN + thrustLowerN;

    // Hover Figure of Merit (FM):
    // P_ideal = T^(3/2) / sqrt(2 * rho * A_eff)
    const idealHoverPowerW = Math.pow(totalThrustN, 1.5) / Math.sqrt(2 * rhoAir * (diskAreaA * 1.7));
    const profileDragCd0 = 0.014;
    const profilePowerUpperW = (solidity * profileDragCd0 * rhoAir * diskAreaA * Math.pow(tipSpeed, 3)) / 8;
    const profilePowerLowerW = profilePowerUpperW;
    const totalShaftPowerW = (idealHoverPowerW * 1.18) + profilePowerUpperW + profilePowerLowerW;
    const figureOfMerit = Math.min(0.85, Math.max(0.4, idealHoverPowerW / totalShaftPowerW));

    // Gyroscopic Precession Cross-Coupling Torque:
    // M_gyro = I_zz * omega x Omega_pitch_yaw
    // Rotor polar moment of inertia I_zz ~ 0.5 * m_blades * R^2
    const singleBladeMass = 0.4 * preset.bladeChordM * rotorRadius * 15; // kg
    const rotorInertiaIzz = preset.bladeCount * (1/3) * singleBladeMass * Math.pow(rotorRadius, 2);
    // In coaxial, upper and lower rotate in opposite directions, canceling gross gyro torque!
    const residualGyroTorqueNm = (thrustUpperN !== thrustLowerN) 
      ? Math.abs(rotorInertiaIzz * radPerSec * yawRateRadS * ((thrustUpperN - thrustLowerN) / totalThrustN))
      : 0;

    // Tiltrotor Conversion Corridor: Nacelle Angle Transition vs Airspeed
    // Minimum safe airspeed for a given nacelle angle to prevent wing stall
    const wingAreaM2 = 2.2;
    const wingCLmax = 1.35;
    const stallSpeedAtTiltMs = Math.sqrt((2 * preset.grossWeightKg * g * Math.sin((nacelleTiltDeg * Math.PI) / 180)) / (rhoAir * wingAreaM2 * wingCLmax));
    const isInsideCorridor = flightAirspeedMs >= (nacelleTiltDeg > 30 ? stallSpeedAtTiltMs * 0.9 : 0);

    // Tilt angle sweep data for chart
    const transitionCorridor = [];
    for (let angle = 0; angle <= 90; angle += 10) {
      const rad = (angle * Math.PI) / 180;
      const vMin = Math.sqrt((2 * preset.grossWeightKg * g * Math.sin(rad)) / (rhoAir * wingAreaM2 * wingCLmax));
      const vMax = 35 + angle * 0.45;
      transitionCorridor.push({
        tiltAngle: angle,
        vMinKnots: parseFloat((vMin * 1.944).toFixed(1)),
        vMaxKnots: parseFloat((vMax * 1.944).toFixed(1)),
        thrustFraction: parseFloat((Math.cos(rad) * 100).toFixed(0)),
      });
    }

    return {
      tipSpeed,
      solidity,
      thrustUpperN,
      thrustLowerN,
      totalThrustN,
      thrustToWeightRatio: totalThrustN / (preset.grossWeightKg * g),
      figureOfMerit,
      totalShaftPowerW,
      residualGyroTorqueNm,
      stallSpeedAtTiltMs,
      isInsideCorridor,
      transitionCorridor,
    };
  }, [preset, collectivePitchDeg, differentialYawPitchDeg, nacelleTiltDeg, flightAirspeedMs, yawRateRadS]);

  // Animation Loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setAnimAngle((prev) => (prev + 12) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // 2D Coaxial / Tiltrotor Animated Rotor Flow Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Deep Tech Background
    ctx.fillStyle = '#060e1a';
    ctx.fillRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2 + 10;

    // Draw Rotor Wake Streamlines (Downwash)
    const wakeColor = 'rgba(56, 189, 248, 0.25)';
    ctx.strokeStyle = wakeColor;
    ctx.lineWidth = 1.5;
    for (let x = -80; x <= 80; x += 20) {
      ctx.beginPath();
      ctx.moveTo(centerX + x, centerY - 40);
      ctx.bezierCurveTo(
        centerX + x * 0.85, centerY + 20,
        centerX + x * 0.7, centerY + 70,
        centerX + x * 0.6, centerY + 130
      );
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(centerX, centerY);

    if (preset.rotorType === 'coaxial') {
      // Mast Shaft
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-6, -60, 12, 100);

      // Upper Rotor Hub & Blades (Spinning CCW)
      const radUpper = (animAngle * Math.PI) / 180;
      const upperBladeSpan = 130;
      const upperBladeX = Math.cos(radUpper) * upperBladeSpan;
      const upperBladeThickness = Math.abs(Math.sin(radUpper)) * 8 + 4;

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(0, -50, Math.abs(upperBladeX), upperBladeThickness, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lower Rotor Hub & Blades (Spinning CW)
      const radLower = ((-animAngle * 1.05) * Math.PI) / 180;
      const lowerBladeSpan = 130;
      const lowerBladeX = Math.cos(radLower) * lowerBladeSpan;
      const lowerBladeThickness = Math.abs(Math.sin(radLower)) * 8 + 4;

      ctx.fillStyle = '#2dd4bf';
      ctx.beginPath();
      ctx.ellipse(0, -10, Math.abs(lowerBladeX), lowerBladeThickness, 0, 0, Math.PI * 2);
      ctx.fill();

      // Swashplates
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-14, -35, 28, 6);
      ctx.fillRect(-14, 5, 28, 6);

      // Fuselage Body
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 50, 32, 45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (preset.rotorType === 'tiltrotor') {
      // Wings & Fuselage
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-120, 20, 240, 14);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-20, 0, 40, 80);

      // Left & Right Nacelles with Tilt
      const nacelleRad = (nacelleTiltDeg * Math.PI) / 180;

      // Left Nacelle
      ctx.save();
      ctx.translate(-110, 25);
      ctx.rotate(-nacelleRad);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-10, -25, 20, 50);

      // Rotor disc
      ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.beginPath();
      ctx.ellipse(0, -25, 45, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Right Nacelle
      ctx.save();
      ctx.translate(110, 25);
      ctx.rotate(-nacelleRad);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-10, -25, 20, 50);

      // Rotor disc
      ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.beginPath();
      ctx.ellipse(0, -25, 45, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Intermeshing Synchropter
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-16, -20, 32, 60);

      // Left Tilted Mast (12 deg)
      ctx.save();
      ctx.translate(-12, -10);
      ctx.rotate(-0.21);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(0, -30, 95, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Right Tilted Mast (12 deg)
      ctx.save();
      ctx.translate(12, -10);
      ctx.rotate(0.21);
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.ellipse(0, -30, 95, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    // HUD Text
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px monospace';
    ctx.fillText(`THRUST: ${calculations.totalThrustN.toFixed(0)} N (T/W = ${calculations.thrustToWeightRatio.toFixed(2)}) | POWER: ${(calculations.totalShaftPowerW / 1000).toFixed(1)} kW`, 14, 22);
    ctx.fillText(`FIGURE OF MERIT (FM): ${(calculations.figureOfMerit * 100).toFixed(0)}% | TIP SPEED: ${calculations.tipSpeed.toFixed(0)} m/s (M ${(calculations.tipSpeed / 340).toFixed(2)})`, 14, 38);
    ctx.fillStyle = calculations.isInsideCorridor ? '#34d399' : '#ef4444';
    ctx.fillText(`NACELLE TILT: ${nacelleTiltDeg}° | GYRO RESIDUAL TORQUE: ${calculations.residualGyroTorqueNm.toFixed(2)} N·m (${calculations.residualGyroTorqueNm < 1.0 ? 'GYRO BALANCED' : 'CROSS-COUPLED'})`, 14, 54);
  }, [animAngle, preset, nacelleTiltDeg, calculations]);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-sky-900/50 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-sky-500/20 to-teal-500/20 rounded-2xl border border-sky-500/40 text-sky-400">
              <RotateCw className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Соосные Винты, Конвертопланы & Гироскопическая Прецессия БПЛА</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  Coaxial & Tiltrotor Dynamics
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Аэродинамическая интерференция соосных винтов, скос потока (inflow contraction), взаимное гашение гиромоментов и коридор конверсии.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Пауза' : 'Пуск'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCollectivePitchDeg(8.5);
                setDifferentialYawPitchDeg(0);
                setNacelleTiltDeg(0);
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
          {ROTORCRAFT_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedPresetIdx(idx);
                setNacelleTiltDeg(p.tiltAngleDeg);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer text-xs flex flex-col justify-between gap-1.5 ${
                selectedPresetIdx === idx
                  ? 'bg-gradient-to-br from-sky-950/90 to-slate-900 border-sky-400 text-white shadow-lg ring-1 ring-sky-400/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <div className="font-bold text-sky-300 flex items-center justify-between">
                <span>{p.name.split('(')[0]}</span>
                {selectedPresetIdx === idx && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />}
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
            <span>Полная Тяга Винтов</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">
            {calculations.totalThrustN.toFixed(0)} <span className="text-xs text-slate-400">Н</span>
          </div>
          <div className="text-[10px] text-slate-500">T/W: {calculations.thrustToWeightRatio.toFixed(2)}</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>КПД Висения (FM)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {(calculations.figureOfMerit * 100).toFixed(0)} <span className="text-xs text-slate-400">%</span>
          </div>
          <div className="text-[10px] text-slate-500">Figure of Merit</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Потребная Мощность</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {(calculations.totalShaftPowerW / 1000).toFixed(1)} <span className="text-xs text-slate-400">кВт</span>
          </div>
          <div className="text-[10px] text-slate-500">На валу редуктора</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Гиро-Момент Прецессии</span>
            <Shield className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {calculations.residualGyroTorqueNm.toFixed(2)} <span className="text-xs text-slate-400">Н·м</span>
          </div>
          <div className="text-[10px] text-slate-500">{calculations.residualGyroTorqueNm < 0.5 ? 'Скомпенсирован' : 'Перекрестная связь'}</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Окружная Скорость Концов</span>
            <Gauge className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            {calculations.tipSpeed.toFixed(0)} <span className="text-xs text-slate-400">м/с</span>
          </div>
          <div className="text-[10px] text-slate-500">M = {(calculations.tipSpeed / 340).toFixed(2)}</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Угол Гондол (Tilt)</span>
            <RotateCw className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-black text-violet-400">
            {nacelleTiltDeg}°
          </div>
          <div className="text-[10px] text-slate-500">{nacelleTiltDeg === 0 ? 'Вертолет' : nacelleTiltDeg === 90 ? 'Самолет' : 'Конверсия'}</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-sky-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>Параметры Управления Винтами & Гондолами</span>
            </h3>

            {/* Collective Pitch */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Общий Шаг Винтов (Collective Pitch)</span>
                <span className="text-sky-300 font-bold">{collectivePitchDeg.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="16.0"
                step="0.5"
                value={collectivePitchDeg}
                onChange={(e) => setCollectivePitchDeg(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>

            {/* Differential Pitch */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Дифференциальный Шаг (Курс Yaw в Сооснике)</span>
                <span className="text-teal-300 font-bold">{differentialYawPitchDeg.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="-3.0"
                max="3.0"
                step="0.2"
                value={differentialYawPitchDeg}
                onChange={(e) => setDifferentialYawPitchDeg(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
            </div>

            {/* Nacelle Tilt */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Угол Поворота Гондол Конвертоплана</span>
                <span className="text-amber-300 font-bold">{nacelleTiltDeg}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="5"
                value={nacelleTiltDeg}
                onChange={(e) => setNacelleTiltDeg(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Airspeed */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Путевая Скорость Полета V</span>
                <span className="text-indigo-300 font-bold">{flightAirspeedMs} м/с</span>
              </div>
              <input
                type="range"
                min="0"
                max="75"
                step="1"
                value={flightAirspeedMs}
                onChange={(e) => setFlightAirspeedMs(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
            </div>

            {/* Yaw Rate */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Угловая Скорость Рыскания (Yaw Rate)</span>
                <span className="text-violet-300 font-bold">{yawRateRadS.toFixed(2)} рад/с</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.1"
                value={yawRateRadS}
                onChange={(e) => setYawRateRadS(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-400"
              />
            </div>
          </div>
        </div>

        {/* Right 2D Animated Flow & Transition Corridor Chart (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Animated 2D Viewport */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-sky-300 flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-sky-400" />
                <span>2D-Визуализация Скоса Потока & Поворота Гондол</span>
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                Aerodynamic Rotor Wake
              </span>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-sky-900/40 aspect-[16/9] w-full bg-slate-950">
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Conversion Corridor Chart */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-teal-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-400" />
                <span>Коридор Конверсии Конвертоплана: Безопасные Скорости (узлы)</span>
              </h3>
              <FullscreenGraphButton
                domain="uav_guidance"
                title="Коридор конверсии и аэродинамика соосных несущих винтов БПЛА"
              />
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calculations.transitionCorridor}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="tiltAngle" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Угол поворота гондол (°)', position: 'insideBottom', offset: -5 }} />
                  <YAxis stroke="#38bdf8" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="vMinKnots" name="V_min (сваливание крыла, узлы)" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="vMaxKnots" name="V_max (флаттер гондолы, узлы)" stroke="#38bdf8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
