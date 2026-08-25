// ============================================================================
// UAV Trans-Medium Submersible Amphibious Drone Module
// Hydro-Aerodynamics, Water Entry Slamming Pressure, Buoyancy & Dual-Medium Propulsion
// ============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Waves,
  Anchor,
  Compass,
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
  Activity,
  Cpu,
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

export interface AmphibiousDronePreset {
  id: string;
  name: string;
  architecture: string;
  dryMassKg: number;
  displacementVolumeLiters: number;
  maxSubmersibleDepthM: number;
  airCruiseSpeedMs: number;
  waterCruiseSpeedKts: number;
  slammingReinforcementBar: number;
  description: string;
}

export const AMPHIBIOUS_PRESETS: AmphibiousDronePreset[] = [
  {
    id: 'trans_medium_quad_sub',
    name: 'Незенкер (Транссредовый Квадрокоптер-Батискаф, 4.5 кг)',
    architecture: '4x Герметичных соосных BLDC мотора с переключением оборотов (Воздух: 8500 об/мин / Вода: 650 об/мин)',
    dryMassKg: 4.5,
    displacementVolumeLiters: 4.8,
    maxSubmersibleDepthM: 25,
    airCruiseSpeedMs: 16,
    waterCruiseSpeedKts: 3.5,
    slammingReinforcementBar: 4.2,
    description: 'Дрон вертикального взлета и посадки, способный нырять под воду для скрытной разведки или минной инспекции и вылетать обратно в воздух.',
  },
  {
    id: 'fixed_wing_cormorant_hydroplane',
    name: 'Баклан (Гидросамолет с подводным планированием, 18 кг)',
    architecture: 'Складывающееся композитное крыло, балластная цистерна и гребной водомет',
    dryMassKg: 18.0,
    displacementVolumeLiters: 22.0,
    maxSubmersibleDepthM: 60,
    airCruiseSpeedMs: 32,
    waterCruiseSpeedKts: 6.0,
    slammingReinforcementBar: 8.5,
    description: 'Дальнобойный БПЛА-гидроплан для мониторинга акваторий, глубоководного гидроакустического зондирования и скрытного всплытия.',
  },
  {
    id: 'loitering_air_torpedo',
    name: 'Летающая Торпеда / Подводный Барражирующий Перехватчик (12 кг)',
    architecture: 'Высокопрочный титановый носовой обтекатель с суперкавитационным кавитатором',
    dryMassKg: 12.0,
    displacementVolumeLiters: 11.5,
    maxSubmersibleDepthM: 40,
    airCruiseSpeedMs: 45,
    waterCruiseSpeedKts: 18.0,
    slammingReinforcementBar: 15.0,
    description: 'Скоростной ударный транссредовый дрон для преодоления ПВО в воздухе и последующего подводного поражения надводных и подводных целей.',
  },
];

export const UAVUnderwaterSubmersibleAmphibiousModule: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [currentMedium, setCurrentMedium] = useState<'air' | 'water_transition' | 'underwater'>('water_transition');
  const [waterEntryAngleDeg, setWaterEntryAngleDeg] = useState<number>(45); // 15 to 90 deg
  const [waterEntrySpeedMs, setWaterEntrySpeedMs] = useState<number>(18); // 5 to 40 m/s
  const [ballastFillPercent, setBallastFillPercent] = useState<number>(65); // 0 to 100%
  const [underwaterDepthM, setUnderwaterDepthM] = useState<number>(8.0); // 0 to 60m

  // Simulation State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTick, setSimTick] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const preset = AMPHIBIOUS_PRESETS[selectedPresetIdx];

  // Mathematical Hydrodynamics, Impact Slamming & Medium Transition
  const calculations = useMemo(() => {
    const rhoAir = 1.225; // kg/m^3
    const rhoWater = 1000; // kg/m^3
    const densityRatio = rhoWater / rhoAir; // ~816.3x

    // 1. Water Entry Slamming Pressure (von Karman / Wagner model):
    // P_slam = 0.5 * rho_w * Cs * (V_entry * sin(theta))^2
    const normalVelocityMs = waterEntrySpeedMs * Math.sin((waterEntryAngleDeg * Math.PI) / 180);
    const slammingCoeffCs = Math.PI; // Approx for blunt wedge / cylinder
    const peakSlammingPressurePa = 0.5 * rhoWater * slammingCoeffCs * Math.pow(normalVelocityMs, 2);
    const peakSlammingPressureBar = peakSlammingPressurePa / 1e5; // Pa to bar
    const isStructuralFailure = peakSlammingPressureBar > preset.slammingReinforcementBar;

    // 2. Buoyancy and Net Vertical Force Underwater (Archimedes):
    // F_buoyancy = rho_water * g * V_displacement
    // Mass_total = DryMass + (BallastVol * rho_water)
    const g = 9.81;
    const maxBallastKg = (preset.displacementVolumeLiters - preset.dryMassKg);
    const currentBallastKg = Math.max(0, maxBallastKg * (ballastFillPercent / 100));
    const totalMassKg = preset.dryMassKg + currentBallastKg;
    const buoyancyForceN = (preset.displacementVolumeLiters / 1000) * rhoWater * g;
    const gravityForceN = totalMassKg * g;
    const netBuoyancyN = buoyancyForceN - gravityForceN; // Positive = Floats up, Negative = Sinks

    // 3. Hydrostatic Pressure at Depth:
    // P_hydro = rho_water * g * depth
    const hydrostaticPressureBar = 1.0 + (rhoWater * g * underwaterDepthM) / 1e5;

    // 4. Propeller Power / RPM Adaptation:
    // P_prop = C_p * rho * n^3 * D^5 => to keep motor torque within limits,
    // RPM in water = RPM in air * (rho_air / rho_water)^(1/3)
    const rpmScalingFactor = Math.pow(rhoAir / rhoWater, 1 / 3); // ~0.107 (10.7% of air RPM)
    const airRpm = 9000;
    const optimalWaterRpm = Math.round(airRpm * rpmScalingFactor);

    // Depth sweep chart data (Hydrostatic Pressure & Buoyancy vs Depth)
    const depthSweepData = [];
    for (let d = 0; d <= preset.maxSubmersibleDepthM; d += 2) {
      const pBar = 1.0 + (rhoWater * g * d) / 1e5;
      depthSweepData.push({
        depthM: d,
        hydrostaticPressureBar: parseFloat(pBar.toFixed(2)),
        limitPressureBar: 1.0 + (rhoWater * g * preset.maxSubmersibleDepthM) / 1e5,
      });
    }

    return {
      densityRatio,
      peakSlammingPressureBar,
      isStructuralFailure,
      totalMassKg,
      buoyancyForceN,
      gravityForceN,
      netBuoyancyN,
      hydrostaticPressureBar,
      optimalWaterRpm,
      depthSweepData,
    };
  }, [preset, waterEntrySpeedMs, waterEntryAngleDeg, ballastFillPercent, underwaterDepthM]);

  // Simulation Timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSimTick((prev) => (prev + 1) % 500);
    }, 40);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // 2D Cross-Medium Canvas (Air, Water Surface, Splash & Submarine Dive)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const waterLevelY = h * 0.42;

    // Sky Background
    const skyGrad = ctx.createLinearGradient(0, 0, 0, waterLevelY);
    skyGrad.addColorStop(0, '#030712');
    skyGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, waterLevelY);

    // Water Background
    const waterGrad = ctx.createLinearGradient(0, waterLevelY, 0, h);
    waterGrad.addColorStop(0, '#082f49');
    waterGrad.addColorStop(0.5, '#0c4a6e');
    waterGrad.addColorStop(1, '#020617');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, waterLevelY, w, h - waterLevelY);

    // Dynamic Waves on Surface
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 10) {
      const waveY = waterLevelY + Math.sin(x * 0.04 + simTick * 0.1) * 4;
      if (x === 0) ctx.moveTo(x, waveY);
      else ctx.lineTo(x, waveY);
    }
    ctx.stroke();

    // Drone Position Simulation
    let droneX = w * 0.48;
    let droneY = waterLevelY;
    let dronePitchRad = (waterEntryAngleDeg * Math.PI) / 180;

    if (currentMedium === 'air') {
      droneY = waterLevelY - 60 + Math.sin(simTick * 0.08) * 8;
      dronePitchRad = -0.1;
    } else if (currentMedium === 'underwater') {
      droneY = waterLevelY + Math.min(120, (underwaterDepthM / preset.maxSubmersibleDepthM) * 110 + 20);
      dronePitchRad = calculations.netBuoyancyN < 0 ? 0.15 : -0.15;
    } else {
      // Transition impact zone
      droneY = waterLevelY;
      // Splash particles
      ctx.fillStyle = 'rgba(224, 242, 254, 0.7)';
      for (let i = 0; i < 14; i++) {
        const px = droneX + (Math.random() - 0.5) * 60;
        const py = waterLevelY - Math.random() * 35;
        ctx.beginPath();
        ctx.arc(px, py, Math.random() * 3.5 + 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Amphibious Drone
    ctx.save();
    ctx.translate(droneX, droneY);
    ctx.rotate(dronePitchRad);

    // Hull Body (Submersible teardrop shape)
    ctx.fillStyle = calculations.isStructuralFailure ? '#ef4444' : '#0284c7';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 36, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cockpit / Sensor Glass
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(18, -2, 6, 0, Math.PI * 2);
    ctx.fill();

    // Sealed Dual-Medium Propellers (Front & Aft)
    const propSpin = simTick * (currentMedium === 'water_transition' || currentMedium === 'underwater' ? 0.3 : 1.2);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    // Front motor arm
    ctx.beginPath();
    ctx.moveTo(18, -12);
    ctx.lineTo(18 + Math.cos(propSpin) * 14, -12);
    ctx.moveTo(-18, -12);
    ctx.lineTo(-18 + Math.cos(propSpin) * 14, -12);
    ctx.stroke();

    ctx.restore();

    // Bubble trail if underwater
    if (currentMedium === 'underwater') {
      ctx.fillStyle = 'rgba(186, 230, 253, 0.5)';
      for (let b = 0; b < 6; b++) {
        const bx = droneX - 30 - b * 15;
        const by = droneY + Math.sin(b + simTick * 0.2) * 5;
        ctx.beginPath();
        ctx.arc(bx, by, (b % 3) + 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // HUD Text
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px monospace';
    ctx.fillText(`РЕЖИМ СРЕДЫ: ${currentMedium.toUpperCase()} | СКОРОСТЬ ВХОДА: ${waterEntrySpeedMs} м/с | УГОЛ: ${waterEntryAngleDeg}°`, 14, 22);
    ctx.fillStyle = calculations.isStructuralFailure ? '#ef4444' : '#34d399';
    ctx.fillText(`УДАРНОЕ ДАВЛЕНИЕ (VON KARMAN SLAMMING): ${calculations.peakSlammingPressureBar.toFixed(1)} БАР ${calculations.isStructuralFailure ? '⚠ ПРЕВЫШЕНИЕ ПРОЧНОСТИ КОРПУСА!' : '✓ КОРПУС В НОРМЕ'}`, 14, 38);
    ctx.fillStyle = '#f0abfc';
    ctx.fillText(`ПЛАВУЧЕСТЬ: ${calculations.netBuoyancyN > 0 ? 'ПОЛОЖИТЕЛЬНАЯ (ВСПЛЫТИЕ)' : 'ОТРИЦАТЕЛЬНАЯ (ПОГРУЖЕНИЕ)'} (${calculations.netBuoyancyN.toFixed(1)} N) | ОБОРОТЫ В ВОДЕ: ${calculations.optimalWaterRpm} RPM`, 14, 54);
  }, [simTick, currentMedium, waterEntrySpeedMs, waterEntryAngleDeg, underwaterDepthM, calculations, preset]);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-sky-900/50 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-sky-500/20 to-teal-500/20 rounded-2xl border border-sky-500/40 text-sky-400">
              <Waves className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Беспилотник-Амфибия & Транссредовая Гидро-Аэродинамика</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  Air-Water Trans-Medium
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Гидроудар при входе в воду (Water Entry Slamming von Karman), баланс плавучести балластных цистерн, гидростатическое сжатие и адаптация оборотов винтов (плотность воды / воздуха ≈ 816x).
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
                setCurrentMedium('water_transition');
                setWaterEntryAngleDeg(45);
                setWaterEntrySpeedMs(18);
                setBallastFillPercent(65);
                setUnderwaterDepthM(8.0);
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
          {AMPHIBIOUS_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedPresetIdx(idx);
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
            <span>Гидроудар Slamming</span>
            <AlertTriangle className={`w-4 h-4 ${calculations.isStructuralFailure ? 'text-rose-400' : 'text-sky-400'}`} />
          </div>
          <div className={`text-2xl font-black ${calculations.isStructuralFailure ? 'text-rose-400' : 'text-sky-400'}`}>
            {calculations.peakSlammingPressureBar.toFixed(1)} <span className="text-xs text-slate-400">бар</span>
          </div>
          <div className="text-[10px] text-slate-500">Предел: {preset.slammingReinforcementBar} бар</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Плавучесть F_net</span>
            <Anchor className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-2xl font-black ${calculations.netBuoyancyN > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {calculations.netBuoyancyN > 0 ? `+${calculations.netBuoyancyN.toFixed(1)}` : calculations.netBuoyancyN.toFixed(1)} <span className="text-xs text-slate-400">N</span>
          </div>
          <div className="text-[10px] text-slate-500">{calculations.netBuoyancyN > 0 ? 'Всплытие' : 'Погружение'}</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Гидростатич. Давление</span>
            <Gauge className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            {calculations.hydrostaticPressureBar.toFixed(2)} <span className="text-xs text-slate-400">бар</span>
          </div>
          <div className="text-[10px] text-slate-500">Глубина: {underwaterDepthM.toFixed(1)} м</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Обороты в Воде (RPM)</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {calculations.optimalWaterRpm} <span className="text-xs text-slate-400">об/м</span>
          </div>
          <div className="text-[10px] text-slate-500">Плотность x816 раз</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Полная Масса</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {calculations.totalMassKg.toFixed(2)} <span className="text-xs text-slate-400">кг</span>
          </div>
          <div className="text-[10px] text-slate-500">Балласт: {ballastFillPercent}%</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Предельная Глубина</span>
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {preset.maxSubmersibleDepthM} <span className="text-xs text-slate-400">м</span>
          </div>
          <div className="text-[10px] text-slate-500">Титановый гермокорпус</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-sky-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>Параметры Погружения & Среды</span>
            </h3>

            {/* Medium Selector */}
            <div className="space-y-1.5">
              <div className="text-xs font-mono text-slate-400">Текущий Режим Среды Полета</div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentMedium('air')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentMedium === 'air'
                      ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Полет в Воздухе
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMedium('water_transition')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentMedium === 'water_transition'
                      ? 'bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 shadow-md font-black'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Вход / Удар
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMedium('underwater')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentMedium === 'underwater'
                      ? 'bg-teal-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Под Водой
                </button>
              </div>
            </div>

            {/* Water Entry Speed */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Скорость входа в воду V_entry</span>
                <span className="text-sky-300 font-bold">{waterEntrySpeedMs} м/с ({(waterEntrySpeedMs * 3.6).toFixed(0)} км/ч)</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                step="1"
                value={waterEntrySpeedMs}
                onChange={(e) => setWaterEntrySpeedMs(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>

            {/* Water Entry Angle */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Угол входа в воду (пикирование)</span>
                <span className="text-teal-300 font-bold">{waterEntryAngleDeg}°</span>
              </div>
              <input
                type="range"
                min="15"
                max="90"
                step="5"
                value={waterEntryAngleDeg}
                onChange={(e) => setWaterEntryAngleDeg(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
            </div>

            {/* Ballast Tank Fill */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Заполнение Балластных Цистерн</span>
                <span className="text-indigo-300 font-bold">{ballastFillPercent}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={ballastFillPercent}
                onChange={(e) => setBallastFillPercent(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
            </div>

            {/* Underwater Depth */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Глубина Подводного Маневрирования</span>
                <span className="text-amber-300 font-bold">{underwaterDepthM.toFixed(1)} м</span>
              </div>
              <input
                type="range"
                min="0"
                max={preset.maxSubmersibleDepthM}
                step="0.5"
                value={underwaterDepthM}
                onChange={(e) => setUnderwaterDepthM(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Right 2D Animated Cross-Medium Canvas & Chart (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Animated 2D Viewport */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-sky-300 flex items-center gap-2">
                <Waves className="w-4 h-4 text-sky-400" />
                <span>2D-Анимация Транссредового Перехода (Воздух ↔ Вода)</span>
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                Water Entry & Hydro-Dynamics
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

          {/* Depth vs Hydrostatic Pressure Chart */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-teal-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-400" />
                <span>Гидростатическое Давление Корпуса (бар) от Глубины (м)</span>
              </h3>
              <FullscreenGraphButton
                domain="uav_guidance"
                title="Зависимость гидростатического давления и предела гермокорпуса БПЛА"
              />
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calculations.depthSweepData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="depthM" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Глубина (м)', position: 'insideBottom', offset: -5 }} />
                  <YAxis stroke="#38bdf8" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="hydrostaticPressureBar" name="Давление на гермокорпус (бар)" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="limitPressureBar" name="Предел прочности (бар)" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
