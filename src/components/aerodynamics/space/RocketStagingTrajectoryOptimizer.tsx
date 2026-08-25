import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Rocket,
  Flame,
  Globe,
  Zap,
  Activity,
  Sliders,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Layers,
  Sparkles,
  Info,
  Maximize2,
  TrendingUp,
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
} from 'recharts';

export interface StageConfig {
  name: string;
  propellantMassTon: number;
  dryMassTon: number;
  ispSec: number;
  thrustKn: number;
  burnTimeSec: number;
}

export type RocketPreset = 'heavy_orbital' | 'light_smallsat' | 'reusable_twostage' | 'moon_superheavy';

interface RocketPresetData {
  id: RocketPreset;
  name: string;
  category: string;
  payloadMassTon: number;
  targetOrbitKm: number;
  stages: StageConfig[];
  description: string;
}

const ROCKET_PRESETS: Record<RocketPreset, RocketPresetData> = {
  heavy_orbital: {
    id: 'heavy_orbital',
    name: 'Тяжелый РН (3-ступенчатый)',
    category: 'Геостационарные и межпланетные миссии',
    payloadMassTon: 22.5,
    targetOrbitKm: 250,
    stages: [
      { name: '1-я Ступень (Бустер)', propellantMassTon: 420.0, dryMassTon: 28.0, ispSec: 310, thrustKn: 7600, burnTimeSec: 165 },
      { name: '2-я Ступень (Центральная)', propellantMassTon: 110.0, dryMassTon: 9.5, ispSec: 348, thrustKn: 980, burnTimeSec: 360 },
      { name: '3-я Ступень (Разгонный блок)', propellantMassTon: 18.0, dryMassTon: 2.2, ispSec: 450, thrustKn: 120, burnTimeSec: 640 },
    ],
    description: 'Классическая компоновка с кислородно-керосиновой первой ступенью и водородно-кислородным разгонным блоком.',
  },
  light_smallsat: {
    id: 'light_smallsat',
    name: 'Легкий РН для Кубсатов (2 ступени)',
    category: 'Оперативный вывод микроспутников',
    payloadMassTon: 0.35,
    targetOrbitKm: 400,
    stages: [
      { name: '1-я Ступень', propellantMassTon: 12.5, dryMassTon: 1.2, ispSec: 285, thrustKn: 220, burnTimeSec: 155 },
      { name: '2-я Ступень', propellantMassTon: 2.4, dryMassTon: 0.32, ispSec: 325, thrustKn: 24, burnTimeSec: 310 },
    ],
    description: 'Электронасосная подача топлива, композитные углепластиковые баки, быстрый цикл подготовки к пуску.',
  },
  reusable_twostage: {
    id: 'reusable_twostage',
    name: 'Частично Многоразовый РН (2 ступени)',
    category: 'Возвратная первая ступень',
    payloadMassTon: 15.6,
    targetOrbitKm: 300,
    stages: [
      { name: '1-я Ступень (Возвратная)', propellantMassTon: 395.0, dryMassTon: 26.0, ispSec: 312, thrustKn: 7400, burnTimeSec: 162 },
      { name: '2-я Ступень (Орбитальная)', propellantMassTon: 92.0, dryMassTon: 4.5, ispSec: 348, thrustKn: 934, burnTimeSec: 340 },
    ],
    description: 'Оставляет 8% топлива первой ступени на тормозной и посадочный импульсы Boostback/Entry/Landing Burn.',
  },
  moon_superheavy: {
    id: 'moon_superheavy',
    name: 'Сверхтяжелый Лунный РН (3 ступени)',
    category: 'Пилотируемые лунные и марсианские программы',
    payloadMassTon: 95.0,
    targetOrbitKm: 185,
    stages: [
      { name: '1-я Ступень', propellantMassTon: 2100.0, dryMassTon: 135.0, ispSec: 327, thrustKn: 34000, burnTimeSec: 168 },
      { name: '2-я Ступень', propellantMassTon: 460.0, dryMassTon: 38.0, ispSec: 421, thrustKn: 4500, burnTimeSec: 380 },
      { name: '3-я Ступень (TLI)', propellantMassTon: 110.0, dryMassTon: 12.0, ispSec: 453, thrustKn: 1000, burnTimeSec: 475 },
    ],
    description: 'Колоссальная стартовая масса более 2800 тонн. Способен вывести полезную нагрузку на траекторию отлета к Луне TLI.',
  },
};

export const RocketStagingTrajectoryOptimizer: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<RocketPreset>('heavy_orbital');
  const preset = ROCKET_PRESETS[selectedPreset];

  const [payloadMass, setPayloadMass] = useState<number>(preset.payloadMassTon);
  const [stages, setStages] = useState<StageConfig[]>(preset.stages);
  const [targetOrbitKm, setTargetOrbitKm] = useState<number>(preset.targetOrbitKm);
  const [activeTab, setActiveTab] = useState<'trajectory_plot' | 'delta_v_budget' | 'staging_canvas'>('trajectory_plot');

  // Trajectory 2D Earth Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync state on preset switch
  const handlePresetSelect = (id: RocketPreset) => {
    setSelectedPreset(id);
    const p = ROCKET_PRESETS[id];
    setPayloadMass(p.payloadMassTon);
    setStages(p.stages);
    setTargetOrbitKm(p.targetOrbitKm);
  };

  // 1. Multi-Stage Tsiolkovsky Delta-V Calculator
  const stagingBudget = useMemo(() => {
    const g0 = 9.80665;
    let currentMass = payloadMass;
    const stageDetails = [];

    // Calculate from last stage to first stage
    for (let i = stages.length - 1; i >= 0; i--) {
      const st = stages[i];
      const mFinal = currentMass + st.dryMassTon;
      const mInitial = mFinal + st.propellantMassTon;
      const massRatio = mInitial / mFinal;
      const deltaV = st.ispSec * g0 * Math.log(massRatio); // m/s
      const structuralCoeff = st.dryMassTon / (st.dryMassTon + st.propellantMassTon);

      stageDetails.unshift({
        stageNum: i + 1,
        name: st.name,
        mInitialTon: mInitial,
        mFinalTon: mFinal,
        propellantTon: st.propellantMassTon,
        dryTon: st.dryMassTon,
        massRatio: massRatio,
        deltaVMps: deltaV,
        deltaVKms: deltaV / 1000,
        ispSec: st.ispSec,
        structuralCoeff: structuralCoeff,
        thrustKn: st.thrustKn,
        burnTimeSec: st.burnTimeSec,
        initialTWR: st.thrustKn / (mInitial * 9.81),
      });

      currentMass = mInitial;
    }

    const totalLiftOffMassTon = currentMass;
    const totalDeltaVKms = stageDetails.reduce((sum, s) => sum + s.deltaVKms, 0);

    // Required Delta-V for Target Orbit (Orbital speed + Gravity loss + Drag loss + Steering loss)
    const earthRadiusKm = 6371;
    const muEarth = 398600.4418; // km^3/s^2
    const vOrbitKms = Math.sqrt(muEarth / (earthRadiusKm + targetOrbitKm));
    const gravityLossKms = 1.35;
    const dragLossKms = 0.18;
    const steeringLossKms = 0.22;
    const totalRequiredDeltaVKms = vOrbitKms + gravityLossKms + dragLossKms + steeringLossKms;

    const deltaVMarginKms = totalDeltaVKms - totalRequiredDeltaVKms;
    const payloadFractionPct = (payloadMass / totalLiftOffMassTon) * 100;

    return {
      totalLiftOffMassTon,
      totalDeltaVKms,
      totalRequiredDeltaVKms,
      deltaVMarginKms,
      payloadFractionPct,
      stageDetails,
      vOrbitKms,
      isOrbitAchieved: deltaVMarginKms >= 0,
    };
  }, [payloadMass, stages, targetOrbitKm]);

  // 2. Numerical Ascent Trajectory Integration (Gravity Turn Simulation)
  const trajectoryData = useMemo(() => {
    const dt = 1.0; // 1 second steps
    const totalTime = 800; // seconds
    const g0 = 9.80665;
    const Re = 6371000; // Earth radius m
    const rho0 = 1.225; // kg/m^3
    const H = 7200; // scale height m

    let t = 0;
    let h = 0; // altitude m
    let v = 0; // velocity m/s
    let gamma = Math.PI / 2; // flight path angle (90 deg = vertical launch)
    let downrange = 0; // m

    const points = [];
    let currentStageIdx = 0;
    let timeInStage = 0;

    let stageRemainingProp = stages.map((s) => s.propellantMassTon * 1000);
    let stageDryMass = stages.map((s) => s.dryMassTon * 1000);
    const payloadKg = payloadMass * 1000;

    let maxQPa = 0;
    let maxQTime = 0;
    let maxQAltKm = 0;

    for (let step = 0; step < totalTime; step++) {
      t = step * dt;

      // Calculate total vehicle mass at current time
      let currentTotalMass = payloadKg;
      for (let s = currentStageIdx; s < stages.length; s++) {
        currentTotalMass += stageDryMass[s] + stageRemainingProp[s];
      }

      // Check current stage burning status
      let thrust = 0;
      let mDot = 0;
      let isp = 300;

      if (currentStageIdx < stages.length) {
        const curStage = stages[currentStageIdx];
        isp = curStage.ispSec;
        const totalProp = curStage.propellantMassTon * 1000;
        mDot = totalProp / Math.max(1, curStage.burnTimeSec);

        if (stageRemainingProp[currentStageIdx] > 0) {
          thrust = curStage.thrustKn * 1000; // N
          stageRemainingProp[currentStageIdx] = Math.max(0, stageRemainingProp[currentStageIdx] - mDot * dt);
        } else {
          // Stage burnt out, separate to next stage
          currentStageIdx++;
        }
      }

      // Atmospheric model
      const rho = rho0 * Math.exp(-h / H);
      const dynamicPressure = 0.5 * rho * v * v;
      if (dynamicPressure > maxQPa) {
        maxQPa = dynamicPressure;
        maxQTime = t;
        maxQAltKm = h / 1000;
      }

      // Aerodynamic Drag (Cd * A approx 1.8 m^2)
      const drag = dynamicPressure * 1.8 * 0.35;

      // Local gravity
      const r = Re + h;
      const g = g0 * Math.pow(Re / r, 2);

      // Pitch-over gravity turn maneuver (initiates at 1.5 km altitude)
      if (h > 1500 && gamma > 0.05) {
        const turnRate = (0.0015 * Math.cos(gamma)) / Math.max(1, v / 100);
        gamma -= turnRate * dt;
      }

      // Equations of Motion
      // dv/dt = (T - D)/m - g*sin(gamma)
      const dv_dt = (thrust - drag) / Math.max(10, currentTotalMass) - g * Math.sin(gamma);
      // dgamma/dt = (g/v)*(v^2/(r*g) - 1)*cos(gamma)
      const dgamma_dt = v > 10 ? ((v / r - g / v) * Math.cos(gamma)) : 0;
      // dh/dt = v * sin(gamma)
      const dh_dt = v * Math.sin(gamma);
      // dx/dt = (Re/r) * v * cos(gamma)
      const dx_dt = (Re / r) * v * Math.cos(gamma);

      v = Math.max(0, v + dv_dt * dt);
      gamma = Math.max(0, gamma + dgamma_dt * dt);
      h += dh_dt * dt;
      downrange += dx_dt * dt;

      const altKm = h / 1000;
      const vKms = v / 1000;
      const qKPa = dynamicPressure / 1000;
      const gForce = (thrust / (currentTotalMass * 9.81));

      if (step % 5 === 0) {
        points.push({
          timeSec: t,
          altKm: parseFloat(altKm.toFixed(1)),
          velocityKms: parseFloat(vKms.toFixed(2)),
          downrangeKm: parseFloat((downrange / 1000).toFixed(1)),
          dynamicPressureKPa: parseFloat(qKPa.toFixed(1)),
          gForce: parseFloat(gForce.toFixed(2)),
          flightAngleDeg: parseFloat(((gamma * 180) / Math.PI).toFixed(1)),
          massTon: parseFloat((currentTotalMass / 1000).toFixed(1)),
        });
      }

      // Stop once target altitude and orbital velocity reached
      if (altKm >= targetOrbitKm && vKms >= stagingBudget.vOrbitKms * 0.98) {
        break;
      }
    }

    return {
      points,
      maxQ: {
        pressureKPa: (maxQPa / 1000).toFixed(1),
        timeSec: maxQTime,
        altKm: maxQAltKm.toFixed(1),
      },
    };
  }, [payloadMass, stages, targetOrbitKm, stagingBudget]);

  // 3. Render 2D Earth & Orbit Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let animT = 0;

    const render = () => {
      animT += 0.01;
      const w = canvas.width;
      const h = canvas.height;

      // Dark cosmos background
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, w, h);

      // Starfield
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let s = 0; s < 30; s++) {
        const sx = (s * 41) % w;
        const sy = (s * 73) % h;
        ctx.fillRect(sx, sy, 1, 1);
      }

      const earthCenterX = w * 0.5;
      const earthCenterY = h * 1.6;
      const earthRadius = h * 1.1;

      // Earth Globe
      const earthGrad = ctx.createRadialGradient(earthCenterX, earthCenterY - earthRadius * 0.8, 10, earthCenterX, earthCenterY, earthRadius);
      earthGrad.addColorStop(0, '#1e3a8a');
      earthGrad.addColorStop(0.7, '#0f172a');
      earthGrad.addColorStop(1, '#020617');

      ctx.fillStyle = earthGrad;
      ctx.beginPath();
      ctx.arc(earthCenterX, earthCenterY, earthRadius, 0, Math.PI * 2);
      ctx.fill();

      // Atmospheric Halo Glow
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(earthCenterX, earthCenterY, earthRadius + 4, 0, Math.PI * 2);
      ctx.stroke();

      // Target Orbit Ellipse Arc
      const targetOrbitRadius = earthRadius + (targetOrbitKm / 400) * 60;
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(earthCenterX, earthCenterY, targetOrbitRadius, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ascent Trajectory Path
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      const launchX = earthCenterX - 80;
      const launchY = earthCenterY - earthRadius;
      ctx.moveTo(launchX, launchY);

      trajectoryData.points.forEach((p, idx) => {
        const px = launchX + (p.downrangeKm / 1200) * 220;
        const py = launchY - (p.altKm / targetOrbitKm) * ((targetOrbitKm / 400) * 60);
        ctx.lineTo(px, py);
      });
      ctx.stroke();

      // Rocket Marker
      const lastPoint = trajectoryData.points[trajectoryData.points.length - 1];
      if (lastPoint) {
        const rx = launchX + (lastPoint.downrangeKm / 1200) * 220;
        const ry = launchY - (lastPoint.altKm / targetOrbitKm) * ((targetOrbitKm / 400) * 60);

        ctx.fillStyle = '#eab308';
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(rx, ry, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Exhaust plume
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 8, ry + 4);
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [trajectoryData, targetOrbitKm]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Preset Selection */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-purple-500/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Многоступенчатая Ракетодинамика & Оптимизатор Δv
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-purple-950 text-purple-300 border border-purple-700">
                  Циолковский САПР
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Оптимизация массовых долей ступеней (Метод Лагранжа), гравитационный разворот (Gravity Turn) и расчет Max-Q.
              </p>
            </div>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800">
          {(Object.keys(ROCKET_PRESETS) as RocketPreset[]).map((key) => {
            const p = ROCKET_PRESETS[key];
            const isSelected = selectedPreset === key;
            return (
              <button
                key={key}
                onClick={() => handlePresetSelect(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {p.name.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stages Parameter Setup (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                <Sliders className="w-4 h-4 text-purple-400" /> Параметры Полезной Нагрузки и Орбиты
              </span>
              <button
                onClick={() => handlePresetSelect(selectedPreset)}
                className="text-[11px] font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Сброс
              </button>
            </div>

            {/* Payload Mass Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Масса полезной нагрузки (m_pl):</span>
                <span className="font-mono font-bold text-purple-300">{payloadMass} тонн</span>
              </div>
              <input
                type="range"
                min="0.1"
                max={selectedPreset === 'moon_superheavy' ? '150' : '35'}
                step="0.5"
                value={payloadMass}
                onChange={(e) => setPayloadMass(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            {/* Target Orbit Altitude Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Высота опорной орбиты (НОО):</span>
                <span className="font-mono font-bold text-cyan-300">{targetOrbitKm} км</span>
              </div>
              <input
                type="range"
                min="160"
                max="800"
                step="20"
                value={targetOrbitKm}
                onChange={(e) => setTargetOrbitKm(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>

          {/* Stages Breakdown Cards */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl">
            <span className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider border-b border-slate-800 pb-2">
              <Layers className="w-4 h-4 text-indigo-400" /> Ступени Ракеты-Носителя ({stages.length})
            </span>

            {stagingBudget.stageDetails.map((st, idx) => (
              <div key={st.stageNum} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white font-mono">
                    <span className="w-5 h-5 rounded-full bg-purple-950 text-purple-300 border border-purple-700 flex items-center justify-center text-[10px]">
                      {st.stageNum}
                    </span>
                    {st.name}
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    +{st.deltaVKms.toFixed(2)} км/с
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-400">
                  <div>Топливо: <span className="text-slate-200">{st.propellantTon}т</span></div>
                  <div>Сухая масса: <span className="text-slate-200">{st.dryTon}т</span></div>
                  <div>Уд. импульс Isp: <span className="text-amber-300">{st.ispSec}с</span></div>
                  <div>Стартовый T/W: <span className="text-cyan-300">{st.initialTWR.toFixed(2)}</span></div>
                  <div>Время работы: <span className="text-slate-200">{st.burnTimeSec}с</span></div>
                  <div>Тяга: <span className="text-purple-300">{(st.thrustKn / 1000).toFixed(1)} МН</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Graphs & 2D Orbit Visualizer (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Summary Metric Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 uppercase">Стартовая масса (M0)</div>
              <div className="text-base font-bold text-purple-300 font-mono">
                {stagingBudget.totalLiftOffMassTon.toFixed(1)} т
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 uppercase">Общий ресурс Δv</div>
              <div className="text-base font-bold text-emerald-300 font-mono">
                {stagingBudget.totalDeltaVKms.toFixed(2)} км/с
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 uppercase">Требуемый Δv орбиты</div>
              <div className="text-base font-bold text-cyan-300 font-mono">
                {stagingBudget.totalRequiredDeltaVKms.toFixed(2)} км/с
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 uppercase">Орбитальный Запас</div>
              <div className={`text-base font-bold font-mono ${stagingBudget.deltaVMarginKms >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stagingBudget.deltaVMarginKms >= 0 ? `+${stagingBudget.deltaVMarginKms.toFixed(2)}` : stagingBudget.deltaVMarginKms.toFixed(2)} км/с
              </div>
            </div>
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex gap-2">
              {[
                { id: 'trajectory_plot', label: 'Траектория & Max-Q (t)', icon: TrendingUp },
                { id: 'staging_canvas', label: 'Орбита 2D Визуализатор', icon: Globe },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-purple-950 border-purple-500 text-purple-300 shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="text-xs font-mono text-slate-400">
              Max-Q: <strong className="text-amber-300">{trajectoryData.maxQ.pressureKPa} кПа</strong> (на {trajectoryData.maxQ.timeSec}с)
            </div>
          </div>

          {/* Tab 1: Trajectory Ascent Graph */}
          {activeTab === 'trajectory_plot' && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trajectoryData.points} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="timeSec" stroke="#94a3b8" unit="s" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis yAxisId="left" stroke="#38bdf8" unit="km" tick={{ fontSize: 11, fill: '#38bdf8' }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#eab308" unit="km/s" tick={{ fontSize: 11, fill: '#eab308' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="altKm" stroke="#38bdf8" strokeWidth={2.5} name="Высота H (км)" dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="velocityKms" stroke="#eab308" strokeWidth={2} name="Скорость V (км/с)" dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey="dynamicPressureKPa" stroke="#f43f5e" strokeWidth={1.5} name="Динамич. напор q (кПа)" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 leading-relaxed font-mono">
                💡 <strong className="text-white">Критерий Max-Q (Максимальный аэродинамический напор):</strong> В точке t = {trajectoryData.maxQ.timeSec} с ракета испытывает пиковые изгибающие и сжимающие нагрузки q = {trajectoryData.maxQ.pressureKPa} кПа при преодолении плотных слоев атмосферы на высоте H = {trajectoryData.maxQ.altKm} км.
              </div>
            </div>
          )}

          {/* Tab 2: 2D Earth Canvas */}
          {activeTab === 'staging_canvas' && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 h-72 sm:h-80">
                <canvas ref={canvasRef} width={580} height={320} className="w-full h-full object-cover" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
