// ============================================================================
// UAV Bio-Inspired Perching, Wall Clinging & Micro-Spine Gripping Dynamics
// High-AoA Flare Maneuvers, Contact Impact, Surface Friction & Sleep Surveillance
// ============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Feather,
  Anchor,
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
  BatteryCharging,
  TrendingUp,
  Cpu,
  Sparkles,
  Zap,
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

export type PerchingTargetType = 'tree_branch_pipe' | 'vertical_concrete_wall' | 'window_sill_ledge';
export type GripperMechanismType = 'microspine_array' | 'opposed_talon_claw' | 'electrostatic_adhesive';

export interface PerchingPreset {
  id: string;
  name: string;
  targetType: PerchingTargetType;
  gripperMechanism: GripperMechanismType;
  droneMassKg: number;
  approachSpeedMs: number;
  pitchFlareDeg: number;
  contactFrictionCoeff: number;
  description: string;
}

export const PERCHING_PRESETS: PerchingPreset[] = [
  {
    id: 'avian_talon_branch',
    name: 'Птичий Захват на Ветку/Трубу (Opposed Talons)',
    targetType: 'tree_branch_pipe',
    gripperMechanism: 'opposed_talon_claw',
    droneMassKg: 1.2,
    approachSpeedMs: 4.5,
    pitchFlareDeg: 65,
    contactFrictionCoeff: 0.85,
    description: 'Динамический подрыв кабрирования (High-AoA pitch-up) и захват круглого профиля механическими когтями.',
  },
  {
    id: 'wall_clinging_microspine',
    name: 'Фиксация на Вертикальной Стене (Микроиглы / Micro-spines)',
    targetType: 'vertical_concrete_wall',
    gripperMechanism: 'microspine_array',
    droneMassKg: 0.85,
    approachSpeedMs: 3.2,
    pitchFlareDeg: 80,
    contactFrictionCoeff: 1.2,
    description: 'Сцепление с шероховатостью бетона и кирпича сотнями подпружиненных микроигл для скрытого наблюдения.',
  },
  {
    id: 'window_electrostatic',
    name: 'Посадка на Оконный Отлив/Стекло (Электростатическая адгезия)',
    targetType: 'window_sill_ledge',
    gripperMechanism: 'electrostatic_adhesive',
    droneMassKg: 0.5,
    approachSpeedMs: 2.5,
    pitchFlareDeg: 45,
    contactFrictionCoeff: 0.65,
    description: 'Бесшумное прилипание к гладким стеклянным или глазурованным поверхностям под действием высокого напряжения 3.5 кВ.',
  },
];

export const UAVPerchingBioGripperModule: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [approachSpeedMs, setApproachSpeedMs] = useState<number>(4.0); // 1.5 to 8.0 m/s
  const [pitchFlareDeg, setPitchFlareDeg] = useState<number>(65); // 30 to 90 deg
  const [gripperClampingForceN, setGripperClampingForceN] = useState<number>(45); // 10 to 120 N
  const [contactDampingMm, setContactDampingMm] = useState<number>(18); // 5 to 40 mm
  const [activeSurveillanceWatts, setActiveSurveillanceWatts] = useState<number>(6); // 2 to 20 W
  const [hoverFlightPowerWatts, setHoverFlightPowerWatts] = useState<number>(240); // 100 to 600 W

  // Simulation & Animation
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [animProgress, setAnimProgress] = useState<number>(0); // 0 to 1
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const preset = PERCHING_PRESETS[selectedPresetIdx];

  // Mathematical Contact Mechanics & Energy Calculations
  const calculations = useMemo(() => {
    const mass = preset.droneMassKg;
    const g = 9.81;

    // Flare Deceleration Phase (Aerodynamic drag surge at high AoA)
    const flareRad = (pitchFlareDeg * Math.PI) / 180;
    // Aerodynamic high-AoA drag boost Cd ~ 2.0 * sin(alpha)
    const cdFlare = 1.8 * Math.sin(flareRad);
    const speedAtTouchdownMs = Math.max(0.4, approachSpeedMs * Math.cos(flareRad * 0.7));

    // Impact Contact Mechanics (Spring-damper contact stroke)
    // Kinetic energy at impact: E_k = 0.5 * m * v_impact^2
    const impactKineticEnergyJ = 0.5 * mass * Math.pow(speedAtTouchdownMs, 2);
    const strokeM = contactDampingMm / 1000;
    const peakImpactForceN = (2 * impactKineticEnergyJ) / Math.max(0.005, strokeM);
    const peakImpactG = peakImpactForceN / (mass * g);

    // Holding Force Limit: F_hold = mu * F_clamp + F_interlock
    const mu = preset.contactFrictionCoeff;
    const mechanicalInterlockForceN = preset.gripperMechanism === 'microspine_array' ? 35 : 15;
    const maxAllowableShearLoadN = mu * gripperClampingForceN + mechanicalInterlockForceN;
    const droneGravityLoadN = mass * g;

    // Safety Margin of Attachment: Factor of Safety (FoS)
    const attachmentSafetyFactor = maxAllowableShearLoadN / Math.max(1, droneGravityLoadN);
    const isAttachmentSecure = attachmentSafetyFactor >= 1.5 && peakImpactG <= 12;

    // Energy Saving Ratio during Surveillance:
    // Hover: 240W -> Perched Sleep: 6W (97.5% reduction)
    const powerSavedRatioPercent = ((hoverFlightPowerWatts - activeSurveillanceWatts) / hoverFlightPowerWatts) * 100;
    const batteryCapacityWh = 65;
    const hoverEnduranceHours = batteryCapacityWh / hoverFlightPowerWatts;
    const perchedEnduranceHours = batteryCapacityWh / activeSurveillanceWatts;
    const enduranceMultiplier = perchedEnduranceHours / hoverEnduranceHours;

    // Approach Speed vs Impact Peak G-load profile
    const chartData = [];
    for (let spd = 1.5; spd <= 7.5; spd += 0.5) {
      const vTouch = Math.max(0.3, spd * Math.cos(flareRad * 0.7));
      const eKin = 0.5 * mass * Math.pow(vTouch, 2);
      const fImp = (2 * eKin) / Math.max(0.005, strokeM);
      const gImp = fImp / (mass * g);

      chartData.push({
        speedMs: spd,
        impactG: parseFloat(gImp.toFixed(1)),
        kineticEnergyJ: parseFloat(eKin.toFixed(2)),
      });
    }

    return {
      speedAtTouchdownMs,
      impactKineticEnergyJ,
      peakImpactForceN,
      peakImpactG,
      maxAllowableShearLoadN,
      droneGravityLoadN,
      attachmentSafetyFactor,
      isAttachmentSecure,
      powerSavedRatioPercent,
      hoverEnduranceHours,
      perchedEnduranceHours,
      enduranceMultiplier,
      chartData,
    };
  }, [preset, approachSpeedMs, pitchFlareDeg, gripperClampingForceN, contactDampingMm, activeSurveillanceWatts, hoverFlightPowerWatts]);

  // Animation Loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setAnimProgress((prev) => (prev >= 1.0 ? 0 : prev + 0.015));
    }, 40);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // 2D Perching Animation Viewport
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Night / Tactical Sky
    ctx.fillStyle = '#070f1a';
    ctx.fillRect(0, 0, w, h);

    // Target Perch Location
    const perchX = 460;
    const perchY = 140;

    // Draw Perch Surface depending on preset
    if (preset.targetType === 'tree_branch_pipe') {
      // Tree Branch or Pipe
      ctx.fillStyle = '#78350f';
      ctx.fillRect(perchX - 10, perchY - 10, 160, 20);
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 3;
      ctx.strokeRect(perchX - 10, perchY - 10, 160, 20);
    } else if (preset.targetType === 'vertical_concrete_wall') {
      // Vertical Wall
      ctx.fillStyle = '#334155';
      ctx.fillRect(perchX + 15, 20, 40, 300);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.strokeRect(perchX + 15, 20, 40, 300);
    } else {
      // Window sill
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(perchX, perchY, 120, 180);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(perchX + 10, perchY + 10, 80, 100);
    }

    // Drone Trajectory interpolation
    let droneX = 0;
    let droneY = 0;
    let currentPitch = 0;

    if (animProgress <= 0.7) {
      // Approach & Flare Phase
      const t = animProgress / 0.7;
      droneX = 60 + (perchX - 60) * t;
      droneY = 240 + (perchY - 240) * t - Math.sin(t * Math.PI) * 40;
      currentPitch = -t * pitchFlareDeg; // pitching up to decelerate
    } else {
      // Perched Resting Phase
      droneX = perchX;
      droneY = perchY;
      currentPitch = -pitchFlareDeg;
    }

    // Draw Drone with Gripper
    ctx.save();
    ctx.translate(droneX, droneY);
    ctx.rotate((currentPitch * Math.PI) / 180);

    // Quad Body
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-22, -4, 44, 8);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-10, -8, 20, 16);

    // Gripper Claws / Microspines
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(16, 4);
    ctx.lineTo(24, 16);
    ctx.lineTo(32, 12);
    ctx.moveTo(-16, 4);
    ctx.lineTo(-24, 16);
    ctx.lineTo(-32, 12);
    ctx.stroke();

    // Propellers (spinning during flight, stopped during perched sleep)
    if (animProgress <= 0.75) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(-22, -8, 12, 3, 0, 0, Math.PI * 2);
      ctx.ellipse(22, -8, 12, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Stationary props
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-26, -9, 8, 2);
      ctx.fillRect(18, -9, 8, 2);
    }

    ctx.restore();

    // Sleep HUD badge if perched
    if (animProgress > 0.75) {
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('⚡ SURVEILLANCE SLEEP MODE (ACTIVE 6W)', perchX - 120, perchY - 30);
    }

    // HUD Text
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px monospace';
    ctx.fillText(`APPROACH V: ${approachSpeedMs} m/s | PITCH FLARE: ${pitchFlareDeg}°`, 14, 22);
    ctx.fillText(`IMPACT FORCE: ${calculations.peakImpactForceN.toFixed(0)} N (${calculations.peakImpactG.toFixed(1)}G) | CONTACT STROKE: ${contactDampingMm} mm`, 14, 38);
    ctx.fillStyle = calculations.isAttachmentSecure ? '#34d399' : '#ef4444';
    ctx.fillText(`ATTACHMENT FoS: ${calculations.attachmentSafetyFactor.toFixed(2)}x | ENERGY SAVED: ${calculations.powerSavedRatioPercent.toFixed(1)}% (${calculations.enduranceMultiplier.toFixed(0)}x LONGER)`, 14, 54);
  }, [animProgress, pitchFlareDeg, approachSpeedMs, calculations, contactDampingMm, preset]);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-emerald-900/50 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl border border-emerald-500/40 text-emerald-400">
              <Feather className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Биоморфная Посадка БПЛА: Перчинг & Микроигольчатый Захват</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Bio-Inspired Perching & Wall Clinging
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Моделирование маневра кабрирования (High-AoA Flare), упругого демпфирования удара и 98% экономии энергии в режиме затаивания.
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
          {PERCHING_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedPresetIdx(idx);
                setApproachSpeedMs(p.approachSpeedMs);
                setPitchFlareDeg(p.pitchFlareDeg);
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
            <span>Запас Удержания FoS</span>
            <Anchor className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-2xl font-black ${calculations.isAttachmentSecure ? 'text-emerald-400' : 'text-rose-400'}`}>
            {calculations.attachmentSafetyFactor.toFixed(2)}x
          </div>
          <div className="text-[10px] text-slate-500">Усилие: {calculations.maxAllowableShearLoadN.toFixed(0)} Н</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Экономия Энергии</span>
            <BatteryCharging className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            {calculations.powerSavedRatioPercent.toFixed(1)} <span className="text-xs text-slate-400">%</span>
          </div>
          <div className="text-[10px] text-slate-500">{hoverFlightPowerWatts} Вт &rarr; {activeSurveillanceWatts} Вт</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Кратность Автономии</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {calculations.enduranceMultiplier.toFixed(0)}x
          </div>
          <div className="text-[10px] text-slate-500">{calculations.perchedEnduranceHours.toFixed(1)} ч наблюдения</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Пиковая Перегрузка Удара</span>
            <Activity className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-black text-orange-400">
            {calculations.peakImpactG.toFixed(1)} <span className="text-xs text-slate-400">G</span>
          </div>
          <div className="text-[10px] text-slate-500">Ход лап: {contactDampingMm} мм</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Скорость в Точке Касания</span>
            <Gauge className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">
            {calculations.speedAtTouchdownMs.toFixed(1)} <span className="text-xs text-slate-400">м/с</span>
          </div>
          <div className="text-[10px] text-slate-500">Гашение кабрированием</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Энергия Касания</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {calculations.impactKineticEnergyJ.toFixed(2)} <span className="text-xs text-slate-400">Дж</span>
          </div>
          <div className="text-[10px] text-slate-500">Масса: {preset.droneMassKg} кг</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Параметры Захода на Посадку & Захвата</span>
            </h3>

            {/* Approach Speed */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Скорость Подлета V_approach</span>
                <span className="text-emerald-300 font-bold">{approachSpeedMs.toFixed(1)} м/с</span>
              </div>
              <input
                type="range"
                min="1.5"
                max="7.0"
                step="0.5"
                value={approachSpeedMs}
                onChange={(e) => setApproachSpeedMs(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

            {/* Pitch Flare Angle */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Угол Кабрирования (Pitch Flare)</span>
                <span className="text-teal-300 font-bold">{pitchFlareDeg}°</span>
              </div>
              <input
                type="range"
                min="30"
                max="85"
                step="5"
                value={pitchFlareDeg}
                onChange={(e) => setPitchFlareDeg(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
            </div>

            {/* Gripper Clamping Force */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Усилие Сжатия Сервопривода Лап</span>
                <span className="text-amber-300 font-bold">{gripperClampingForceN} Н</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={gripperClampingForceN}
                onChange={(e) => setGripperClampingForceN(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Contact Damping Stroke */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Ход Упругого Демпфера Лап</span>
                <span className="text-indigo-300 font-bold">{contactDampingMm} мм</span>
              </div>
              <input
                type="range"
                min="5"
                max="35"
                step="1"
                value={contactDampingMm}
                onChange={(e) => setContactDampingMm(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
            </div>

            {/* Sleep Mode Power Consumption */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Потребление Сенсоров в Режиме Сна</span>
                <span className="text-sky-300 font-bold">{activeSurveillanceWatts} Вт</span>
              </div>
              <input
                type="range"
                min="2"
                max="15"
                step="1"
                value={activeSurveillanceWatts}
                onChange={(e) => setActiveSurveillanceWatts(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>
          </div>
        </div>

        {/* Right 2D Animated View & Impact Chart (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Animated 2D Viewport */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                <Feather className="w-4 h-4 text-emerald-400" />
                <span>2D-Визуализация Кабрирования & Перчинга на Опору</span>
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700">
                Avian Bio-Mechanics
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

          {/* Impact G-load Chart */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-teal-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-400" />
                <span>Перегрузка Удара G vs Скорость Подлета V (м/с)</span>
              </h3>
              <FullscreenGraphButton
                domain="uav_guidance"
                title="Биоморфный перчинг и контактная динамика БПЛА"
              />
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calculations.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="speedMs" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Скорость подлета (м/с)', position: 'insideBottom', offset: -5 }} />
                  <YAxis yAxisId="g" stroke="#f97316" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="e" orientation="right" stroke="#2dd4bf" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line yAxisId="g" type="monotone" dataKey="impactG" name="Пиковая перегрузка G" stroke="#f97316" strokeWidth={2.5} dot={false} />
                  <Line yAxisId="e" type="monotone" dataKey="kineticEnergyJ" name="Энергия касания (Дж)" stroke="#2dd4bf" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
