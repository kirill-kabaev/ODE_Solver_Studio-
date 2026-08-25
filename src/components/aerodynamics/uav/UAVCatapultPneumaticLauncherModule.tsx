// ============================================================================
// UAV Catapult Launch, Rail Kinematics & Net Arresting Recovery Studio
// Pneumatic Gas Dynamics, Bungee Tension, Peak G-load & Wire Arrestor Physics
// ============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Rocket,
  ArrowUpRight,
  Shield,
  Activity,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Gauge,
  Layers,
  Sparkles,
  TrendingUp,
  Anchor,
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

export type LauncherType = 'pneumatic_piston' | 'bungee_elastic' | 'hydraulic_winch';
export type RecoveryType = 'deep_stall_skid' | 'arrestor_net_system' | 'paraglider_hook';

export interface DroneLaunchPreset {
  id: string;
  name: string;
  takeoffMassKg: number;
  wingAreaM2: number;
  clMaxTakeoff: number;
  stallSpeedMs: number;
  maxAllowableG: number;
  recommendedLauncher: LauncherType;
  description: string;
}

export const DRONE_LAUNCH_PRESETS: DroneLaunchPreset[] = [
  {
    id: 'recon_fixed_wing_15kg',
    name: 'Разведывательный БПЛА 15 кг (типа Орлан-10)',
    takeoffMassKg: 16.5,
    wingAreaM2: 0.85,
    clMaxTakeoff: 1.4,
    stallSpeedMs: 16.0,
    maxAllowableG: 12.0,
    recommendedLauncher: 'pneumatic_piston',
    description: 'Средний планер для продолжительной разведки, требует разгона до 20 м/с на рельсовой направляющей 4-6 м.',
  },
  {
    id: 'kamikaze_cruiser_35kg',
    name: 'Барражирующий Боеприпас 35 кг (типа Герань-2 / Крейсер)',
    takeoffMassKg: 35.0,
    wingAreaM2: 1.6,
    clMaxTakeoff: 1.3,
    stallSpeedMs: 22.0,
    maxAllowableG: 9.0,
    recommendedLauncher: 'pneumatic_piston',
    description: 'Тяжелый аппарат с толкающим ДВС. Требует высокого давления в пневмоцилиндре для надежного отрыва.',
  },
  {
    id: 'light_scout_bungee_4kg',
    name: 'Малый тактический БПЛА 4.5 кг (Bungee Launch)',
    takeoffMassKg: 4.5,
    wingAreaM2: 0.4,
    clMaxTakeoff: 1.5,
    stallSpeedMs: 11.5,
    maxAllowableG: 15.0,
    recommendedLauncher: 'bungee_elastic',
    description: 'Легкий разведчик взлетает с резинового жгута/банджи без применения компрессора высокого давления.',
  },
];

export const UAVCatapultPneumaticLauncherModule: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [launcherType, setLauncherType] = useState<LauncherType>('pneumatic_piston');
  const [recoveryType, setRecoveryType] = useState<RecoveryType>('arrestor_net_system');

  // Catapult Geometry & Mechanics
  const [railLengthM, setRailLengthM] = useState<number>(5.5); // 2.5 to 10m
  const [railElevationAngleDeg, setRailElevationAngleDeg] = useState<number>(14); // 8 to 25 deg

  // Pneumatics parameters
  const [tankPressureBar, setTankPressureBar] = useState<number>(14); // 6 to 30 bar
  const [pistonDiameterMm, setPistonDiameterMm] = useState<number>(75); // 40 to 120 mm
  const [tankVolumeLiters, setTankVolumeLiters] = useState<number>(25);

  // Bungee parameters
  const [bungeeStiffnessK, setBungeeStiffnessK] = useState<number>(450); // N/m
  const [bungeePreStretchM, setBungeePreStretchM] = useState<number>(4.0);

  // Net Recovery parameters
  const [landingApproachSpeedMs, setLandingApproachSpeedMs] = useState<number>(18);
  const [netArrestBrakeStrokeM, setNetArrestBrakeStrokeM] = useState<number>(2.2);

  // Animation state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [animProgress, setAnimProgress] = useState<number>(0); // 0 to 1
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const preset = DRONE_LAUNCH_PRESETS[selectedPresetIdx];

  // Dynamic calculations along the rail (ODE / Work-Energy integration)
  const calculations = useMemo(() => {
    const mass = preset.takeoffMassKg;
    const g = 9.81;
    const angleRad = (railElevationAngleDeg * Math.PI) / 180;
    const gravityResistance = mass * g * Math.sin(angleRad);
    const frictionForce = mass * g * Math.cos(angleRad) * 0.08;

    const steps = 50;
    const dx = railLengthM / steps;
    let currentV = 0;
    let maxG = 0;
    let launchTime = 0;

    const railProfile = [];

    // Piston area
    const pistonAreaM2 = Math.PI * Math.pow(pistonDiameterMm / 2000, 2);

    for (let i = 0; i <= steps; i++) {
      const x = i * dx;

      let thrustForce = 0;
      if (launcherType === 'pneumatic_piston') {
        // Adiabatic expansion: P(x) = P0 * (V0 / (V0 + A*x))^gamma
        const gamma = 1.4; // air adiabatic index
        const initialVolM3 = tankVolumeLiters / 1000;
        const expandedVolM3 = initialVolM3 + pistonAreaM2 * x;
        const currentPressurePa = (tankPressureBar * 1e5) * Math.pow(initialVolM3 / expandedVolM3, gamma);
        thrustForce = currentPressurePa * pistonAreaM2;
      } else if (launcherType === 'bungee_elastic') {
        // Linear elastic Hooke tension: F = k * (delta_x0 - x)
        const remainingStretch = Math.max(0, bungeePreStretchM - x);
        thrustForce = bungeeStiffnessK * remainingStretch;
      } else {
        // Hydraulic Winch constant force
        thrustForce = 4200;
      }

      const netForce = Math.max(0, thrustForce - gravityResistance - frictionForce);
      const accel = netForce / mass;
      const gLoad = accel / g;
      if (gLoad > maxG) maxG = gLoad;

      if (i > 0) {
        // v^2 = v0^2 + 2*a*dx
        currentV = Math.sqrt(Math.max(0, currentV * currentV + 2 * accel * dx));
        const dt = dx / Math.max(0.1, currentV);
        launchTime += dt;
      }

      railProfile.push({
        positionM: parseFloat(x.toFixed(2)),
        velocityMs: parseFloat(currentV.toFixed(1)),
        velocityKmh: parseFloat((currentV * 3.6).toFixed(1)),
        gLoad: parseFloat(gLoad.toFixed(1)),
        thrustForceN: parseFloat(thrustForce.toFixed(0)),
      });
    }

    const endOfRailSpeedMs = currentV;
    const endOfRailSpeedKmh = endOfRailSpeedMs * 3.6;

    // Safety Margin: V_launch / V_stall (standard requires >= 1.20)
    const stallSpeed = preset.stallSpeedMs;
    const launchSafetyRatio = endOfRailSpeedMs / stallSpeed;
    const isLaunchSafe = launchSafetyRatio >= 1.20 && maxG <= preset.maxAllowableG;

    // Net Arresting Recovery Calculations:
    // Kinetic energy: E_k = 0.5 * m * V_app^2
    const kineticEnergyJoules = 0.5 * mass * Math.pow(landingApproachSpeedMs, 2);
    // Average deceleration: a_decel = V^2 / (2 * s_brake)
    const netDecelMs2 = Math.pow(landingApproachSpeedMs, 2) / (2 * Math.max(0.5, netArrestBrakeStrokeM));
    const netGDecel = netDecelMs2 / g;
    const netPeakBrakeForceN = mass * netDecelMs2 * 1.35; // with rope elasticity factor

    return {
      railProfile,
      endOfRailSpeedMs,
      endOfRailSpeedKmh,
      maxG,
      launchTime,
      stallSpeed,
      launchSafetyRatio,
      isLaunchSafe,
      kineticEnergyJoules,
      netDecelMs2,
      netGDecel,
      netPeakBrakeForceN,
    };
  }, [preset, railLengthM, railElevationAngleDeg, launcherType, tankPressureBar, pistonDiameterMm, tankVolumeLiters, bungeeStiffnessK, bungeePreStretchM, landingApproachSpeedMs, netArrestBrakeStrokeM]);

  // Animation Loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setAnimProgress((prev) => (prev >= 1.0 ? 0 : prev + 0.02));
    }, 40);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Canvas 2D Interactive Catapult Rail & Flight Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Background sky & ground
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Ground line
    const groundY = h - 60;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();

    // Catapult Base Stand
    const railStartX = 60;
    const railStartY = groundY - 20;

    const angleRad = (railElevationAngleDeg * Math.PI) / 180;
    const visualRailLen = 220;
    const railEndX = railStartX + visualRailLen * Math.cos(angleRad);
    const railEndY = railStartY - visualRailLen * Math.sin(angleRad);

    // Tripod supports
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(railStartX + 40, groundY);
    ctx.lineTo(railStartX + 60, railStartY - 30);
    ctx.lineTo(railStartX + 80, groundY);
    ctx.stroke();

    // Catapult Rail Truss
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(railStartX, railStartY);
    ctx.lineTo(railEndX, railEndY);
    ctx.stroke();

    // Piston cylinder under rail
    if (launcherType === 'pneumatic_piston') {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(railStartX, railStartY + 6);
      ctx.lineTo(railStartX + visualRailLen * 0.7 * Math.cos(angleRad), railStartY + 6 - visualRailLen * 0.7 * Math.sin(angleRad));
      ctx.stroke();
    }

    // Drone Position calculation during animation
    let droneX = 0;
    let droneY = 0;
    let dronePitch = -railElevationAngleDeg;

    if (animProgress <= 0.45) {
      // Along the rail phase (accelerating)
      const railFrac = Math.pow(animProgress / 0.45, 2); // quadratic accel
      droneX = railStartX + (railEndX - railStartX) * railFrac;
      droneY = railStartY + (railEndY - railStartY) * railFrac - 10;
    } else {
      // Free flight climb-out phase
      const flyFrac = (animProgress - 0.45) / 0.55;
      const flyDist = flyFrac * 300;
      droneX = railEndX + flyDist * Math.cos(angleRad);
      droneY = railEndY - flyDist * Math.sin(angleRad) - Math.sin(flyFrac * Math.PI) * 15;
      dronePitch = -railElevationAngleDeg - flyFrac * 10; // pitch up
    }

    // Draw Drone on rail / in flight
    ctx.save();
    ctx.translate(droneX, droneY);
    ctx.rotate((dronePitch * Math.PI) / 180);

    // Drone Fuselage & Wing
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-18, -4, 36, 8);
    // Nose Cone
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(18, -4);
    ctx.lineTo(26, 0);
    ctx.lineTo(18, 4);
    ctx.fill();

    // Wings
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-6, -18, 12, 36);

    // Pusher prop spin blur
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-18, 0, 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // Thrust plume if along rail
    if (animProgress > 0.05 && animProgress <= 0.5) {
      ctx.fillStyle = 'rgba(249, 115, 22, 0.4)';
      ctx.beginPath();
      ctx.arc(droneX - 25 * Math.cos(angleRad), droneY + 25 * Math.sin(angleRad), 8 + Math.random() * 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // HUD overlays
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px monospace';
    ctx.fillText(`RAIL LENGTH: ${railLengthM} m | ELEVATION: ${railElevationAngleDeg}°`, 14, 22);
    ctx.fillText(`TAKEOFF MASS: ${preset.takeoffMassKg} kg | V_STALL: ${preset.stallSpeedMs} m/s`, 14, 38);
    ctx.fillStyle = calculations.isLaunchSafe ? '#22c55e' : '#ef4444';
    ctx.fillText(`END-OF-RAIL V: ${calculations.endOfRailSpeedMs.toFixed(1)} m/s (${calculations.launchSafetyRatio.toFixed(2)}x V_stall) | G_MAX: ${calculations.maxG.toFixed(1)}G`, 14, 54);
  }, [animProgress, railElevationAngleDeg, railLengthM, preset, calculations, launcherType]);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-amber-900/50 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl border border-amber-500/40 text-amber-400">
              <Rocket className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Пневматическая Катапульта БПЛА & Сеточный Улавливатель</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Gas Dynamics & Arresting Gear
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Моделирование адиабатического расширения в поршне, перегрузок старта n_max и тросовой посадки в сеть.
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
              onClick={() => setAnimProgress(0)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
              title="Сброс"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Presets Grid */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {DRONE_LAUNCH_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedPresetIdx(idx);
                setLauncherType(p.recommendedLauncher);
              }}
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
            <span>Скорость Схода V_launch</span>
            <ArrowUpRight className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {calculations.endOfRailSpeedMs.toFixed(1)} <span className="text-xs text-slate-400">м/с</span>
          </div>
          <div className="text-[10px] text-slate-500">{calculations.endOfRailSpeedKmh.toFixed(0)} км/ч</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Запас по Сваливанию</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-2xl font-black ${calculations.launchSafetyRatio >= 1.2 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {calculations.launchSafetyRatio.toFixed(2)}x
          </div>
          <div className="text-[10px] text-slate-500">
            {calculations.launchSafetyRatio >= 1.2 ? 'Безопасный отрыв' : 'Опасность сваливания!'}
          </div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Пиковая Перегрузка n_x</span>
            <Activity className="w-4 h-4 text-orange-400" />
          </div>
          <div className={`text-2xl font-black ${calculations.maxG <= preset.maxAllowableG ? 'text-orange-400' : 'text-rose-400'}`}>
            {calculations.maxG.toFixed(1)} <span className="text-xs text-slate-400">G</span>
          </div>
          <div className="text-[10px] text-slate-500">Лимит планера: {preset.maxAllowableG}G</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Время Разгона</span>
            <Zap className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">
            {calculations.launchTime.toFixed(2)} <span className="text-xs text-slate-400">с</span>
          </div>
          <div className="text-[10px] text-slate-500">По длине {railLengthM} м</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Торможение в Сеть</span>
            <Anchor className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {calculations.netGDecel.toFixed(1)} <span className="text-xs text-slate-400">G</span>
          </div>
          <div className="text-[10px] text-slate-500">Ход сети: {netArrestBrakeStrokeM} м</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Энергия Улавливания</span>
            <Gauge className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            {(calculations.kineticEnergyJoules / 1000).toFixed(1)} <span className="text-xs text-slate-400">кДж</span>
          </div>
          <div className="text-[10px] text-slate-500">Усилие троса: {(calculations.netPeakBrakeForceN / 1000).toFixed(1)} кН</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Launcher Type Toggle */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <Rocket className="w-4 h-4 text-amber-400" />
              <span>Тип Пусковой Установки</span>
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'pneumatic_piston', label: 'Пневмоцилиндр' },
                { id: 'bungee_elastic', label: 'Резиновый жгут' },
                { id: 'hydraulic_winch', label: 'Гидролебедка' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setLauncherType(t.id as LauncherType)}
                  className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                    launcherType === t.id
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Launcher Rail Parameters */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-sky-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>Геометрия Направляющей Рельсы</span>
            </h3>

            {/* Rail Length */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Рабочая Длина Направляющей L</span>
                <span className="text-sky-300 font-bold">{railLengthM.toFixed(1)} м</span>
              </div>
              <input
                type="range"
                min="2.5"
                max="9.0"
                step="0.5"
                value={railLengthM}
                onChange={(e) => setRailLengthM(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>

            {/* Rail Elevation Angle */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Угол Возвышения Направляющей</span>
                <span className="text-amber-300 font-bold">{railElevationAngleDeg}°</span>
              </div>
              <input
                type="range"
                min="8"
                max="25"
                step="1"
                value={railElevationAngleDeg}
                onChange={(e) => setRailElevationAngleDeg(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Conditional Parameters based on launcher */}
            {launcherType === 'pneumatic_piston' && (
              <>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Давление в Ресивере P₀</span>
                    <span className="text-emerald-300 font-bold">{tankPressureBar} бар</span>
                  </div>
                  <input
                    type="range"
                    min="6"
                    max="30"
                    step="1"
                    value={tankPressureBar}
                    onChange={(e) => setTankPressureBar(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Диаметр Поршня Цилиндра</span>
                    <span className="text-indigo-300 font-bold">{pistonDiameterMm} мм</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="110"
                    step="5"
                    value={pistonDiameterMm}
                    onChange={(e) => setPistonDiameterMm(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                  />
                </div>
              </>
            )}

            {launcherType === 'bungee_elastic' && (
              <>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Жесткость Жгута k</span>
                    <span className="text-emerald-300 font-bold">{bungeeStiffnessK} Н/м</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="1200"
                    step="50"
                    value={bungeeStiffnessK}
                    onChange={(e) => setBungeeStiffnessK(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Предварительная Растяжка</span>
                    <span className="text-indigo-300 font-bold">{bungeePreStretchM.toFixed(1)} м</span>
                  </div>
                  <input
                    type="range"
                    min="2.0"
                    max="6.0"
                    step="0.5"
                    value={bungeePreStretchM}
                    onChange={(e) => setBungeePreStretchM(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right 2D Animation & Kinematics Acceleration Profile (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Animated 2D Viewport */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <Rocket className="w-4 h-4 text-amber-400" />
                <span>Динамическая 2D-Визуализация Разгона по Рельсу</span>
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                Physics Time Step
              </span>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-amber-900/40 aspect-[16/9] w-full bg-slate-950">
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Kinematics Curve (Velocity & G-load along rail) */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-sky-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                <span>Профиль Скорости V(x) и Перегрузки G(x) вдоль Направляющей</span>
              </h3>
              <FullscreenGraphButton
                domain="uav_guidance"
                title="Кинематика катапультного старта БПЛА"
              />
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calculations.railProfile}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="positionM" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Положение на рельсе (м)', position: 'insideBottom', offset: -5 }} />
                  <YAxis yAxisId="vel" stroke="#38bdf8" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="g" orientation="right" stroke="#f97316" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line yAxisId="vel" type="monotone" dataKey="velocityMs" name="Скорость V (м/с)" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
                  <Line yAxisId="g" type="monotone" dataKey="gLoad" name="Перегрузка G" stroke="#f97316" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
