import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Feather,
  Bug,
  Activity,
  Wind,
  Zap,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Layers,
  Compass,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface InsectPreset {
  id: string;
  name: string;
  wingspan_mm: number;
  chord_mm: number;
  mass_mg: number; // milligrams
  flapFreq_Hz: number;
  strokeAmplitude_deg: number;
  pitchAmplitude_deg: number;
  strokePlaneAngle_deg: number;
  clapAndFling: boolean;
  desc: string;
}

const INSECT_PRESETS: InsectPreset[] = [
  {
    id: 'bumblebee',
    name: 'Шмель (Bombus Biomimetic MAV)',
    wingspan_mm: 32,
    chord_mm: 8.5,
    mass_mg: 180,
    flapFreq_Hz: 155,
    strokeAmplitude_deg: 120,
    pitchAmplitude_deg: 45,
    strokePlaneAngle_deg: 10,
    clapAndFling: false,
    desc: 'Высокая подъемная сила за счет устойчивого присоединенного вихря передней кромки (LEV).',
  },
  {
    id: 'hawkmoth',
    name: 'Бражник (Manduca Sexta Bio-MAV)',
    wingspan_mm: 98,
    chord_mm: 19,
    mass_mg: 1650,
    flapFreq_Hz: 26,
    strokeAmplitude_deg: 105,
    pitchAmplitude_deg: 52,
    strokePlaneAngle_deg: 15,
    clapAndFling: false,
    desc: 'Низкая частота взмахов, высокое аэродинамическое качество $L/D$ и зависание в турбулентности.',
  },
  {
    id: 'robobee',
    name: 'Пьезо-Микроробот (RoboBee Harvard Micro-MAV)',
    wingspan_mm: 28,
    chord_mm: 6.0,
    mass_mg: 90,
    flapFreq_Hz: 120,
    strokeAmplitude_deg: 110,
    pitchAmplitude_deg: 40,
    strokePlaneAngle_deg: 5,
    clapAndFling: true,
    desc: 'Пьезоэлектрический привод bimorph, механизм Weis-Fogh clap-and-fling для прироста тяги +35%.',
  },
];

export const UAVBioInsectFlappingLEVStudioModule: React.FC = () => {
  // Config state
  const [selectedPreset, setSelectedPreset] = useState<string>('bumblebee');
  const [wingspan_mm, setWingspanMm] = useState<number>(32);
  const [chord_mm, setChordMm] = useState<number>(8.5);
  const [mass_mg, setMassMg] = useState<number>(180);
  const [flapFreq_Hz, setFlapFreqHz] = useState<number>(155);
  const [strokeAmplitude_deg, setStrokeAmplitudeDeg] = useState<number>(120);
  const [pitchAmplitude_deg, setPitchAmplitudeDeg] = useState<number>(45);
  const [clapAndFling, setClapAndFling] = useState<boolean>(false);
  const [airDensity_kgm3, setAirDensity] = useState<number>(1.225);

  // Animation & simulation state
  const [isSimRunning, setIsSimRunning] = useState<boolean>(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simTimeRef = useRef<number>(0);

  // Apply preset
  const handleApplyPreset = (presetId: string) => {
    const p = INSECT_PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    setSelectedPreset(presetId);
    setWingspanMm(p.wingspan_mm);
    setChordMm(p.chord_mm);
    setMassMg(p.mass_mg);
    setFlapFreqHz(p.flapFreq_Hz);
    setStrokeAmplitudeDeg(p.strokeAmplitude_deg);
    setPitchAmplitudeDeg(p.pitchAmplitude_deg);
    setClapAndFling(p.clapAndFling);
  };

  // Aerodynamics & Unsteady vortex calculations
  const aeroMetrics = useMemo(() => {
    const R_wing_m = wingspan_mm / 2000;
    const c_mean_m = chord_mm / 1000;
    const mass_kg = mass_mg / 1e6;
    const weight_N = mass_kg * 9.80665;

    // Wing tip velocity & Reynolds number
    const strokeRad = (strokeAmplitude_deg * Math.PI) / 180;
    const U_tip_avg = 2 * strokeRad * flapFreq_Hz * R_wing_m; // average wing tip speed (m/s)
    const nu_air = 1.5e-5; // kinematic viscosity (m^2/s)
    const Re = (U_tip_avg * c_mean_m) / nu_air;

    // Mean lift calculation via quasi-steady blade-element + LEV enhancement
    // Cl_lev can reach 1.8 to 2.4 due to delayed stall and bound vortex
    const baseCl = 1.65;
    const levBonus = clapAndFling ? 1.35 : 1.15;
    const Cl_effective = baseCl * levBonus;

    const wingArea_m2 = 2 * (R_wing_m * c_mean_m); // both wings
    const meanDynamicPress = 0.5 * airDensity_kgm3 * Math.pow(U_tip_avg * 0.7, 2);
    const meanLift_N = Cl_effective * meanDynamicPress * wingArea_m2;

    // Thrust-to-weight ratio (Lift/Weight)
    const liftToWeightRatio = meanLift_N / Math.max(1e-6, weight_N);

    // Mechanical power required
    const Cd = 0.8 + 1.2 * Math.sin((pitchAmplitude_deg * Math.PI) / 180);
    const aeroPower_mW =
      (0.5 * airDensity_kgm3 * Cd * wingArea_m2 * Math.pow(U_tip_avg, 3)) * 1000;

    // Strouhal number St = 2 * f * h / U_inf (for forward flight, or stroke based)
    const Strouhal = (2 * flapFreq_Hz * c_mean_m) / Math.max(0.1, U_tip_avg);

    return {
      weight_N,
      U_tip_avg,
      Re,
      Cl_effective,
      meanLift_N,
      liftToWeightRatio,
      aeroPower_mW,
      Strouhal,
    };
  }, [
    wingspan_mm,
    chord_mm,
    mass_mg,
    flapFreq_Hz,
    strokeAmplitude_deg,
    pitchAmplitude_deg,
    clapAndFling,
    airDensity_kgm3,
  ]);

  // Phase diagram data over one complete flapping cycle (0..360 deg)
  const cyclePhaseData = useMemo(() => {
    const data = [];
    const strokeRad = (strokeAmplitude_deg * Math.PI) / 180;
    const pitchRad = (pitchAmplitude_deg * Math.PI) / 180;

    for (let phase = 0; phase <= 360; phase += 10) {
      const phi_t = (phase * Math.PI) / 180;
      // Positional stroke angle
      const strokePos_deg = strokeAmplitude_deg * Math.cos(phi_t);
      // Pitch rotation (delayed by ~90 deg for optimal LEV formation)
      const pitchAngle_deg = pitchAmplitude_deg * Math.sin(phi_t + 0.3);
      // Instantaneous lift coefficient with Wagner effect & LEV burst
      const isDownstroke = phase >= 0 && phase <= 180;
      const levFactor = isDownstroke ? 1.8 * Math.sin(phi_t) : 0.8 * Math.sin(phi_t);
      const instantLift_mN =
        Math.max(
          0,
          aeroMetrics.meanLift_N * 1000 * (1 + levFactor * Math.cos(pitchRad))
        );

      data.push({
        phase_deg: phase,
        stroke_pos_deg: Number(strokePos_deg.toFixed(1)),
        pitch_angle_deg: Number(pitchAngle_deg.toFixed(1)),
        instant_lift_mN: Number(instantLift_mN.toFixed(2)),
      });
    }
    return data;
  }, [strokeAmplitude_deg, pitchAmplitude_deg, aeroMetrics]);

  // Canvas LEV Vortex Simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      simTimeRef.current += 0.08;
      const t = simTimeRef.current;

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      // Dark background
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, w, h);

      // Flapping phase
      const cycleTime = t * (flapFreq_Hz / 15);
      const strokeAngle = Math.sin(cycleTime) * ((strokeAmplitude_deg * Math.PI) / 360);
      const pitchAngle = Math.cos(cycleTime + 0.3) * ((pitchAmplitude_deg * Math.PI) / 180);

      // Wing profile rendering
      const wingLength = 120;
      const chordPx = 45;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(strokeAngle);

      // Wing cross section / Airfoil with LEV formation
      ctx.save();
      ctx.rotate(pitchAngle);

      // Airfoil body
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, chordPx, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Leading Edge Vortex (LEV) dynamic swirling vortex
      const levX = -chordPx * 0.55;
      const levY = -18 - Math.sin(cycleTime) * 6;
      const levRadius = 14 + Math.sin(cycleTime * 2) * 4;

      const levGrad = ctx.createRadialGradient(levX, levY, 2, levX, levY, levRadius);
      levGrad.addColorStop(0, 'rgba(239, 68, 68, 0.9)');
      levGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.5)');
      levGrad.addColorStop(1, 'rgba(234, 179, 8, 0)');

      ctx.fillStyle = levGrad;
      ctx.beginPath();
      ctx.arc(levX, levY, levRadius, 0, Math.PI * 2);
      ctx.fill();

      // Swirling streamlines around LEV
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      for (let s = 0; s < 3; s++) {
        ctx.beginPath();
        ctx.arc(levX, levY, 6 + s * 4, t * 5 + s, t * 5 + s + Math.PI * 1.4);
        ctx.stroke();
      }

      // Trailing edge wake vortex (TEV)
      const tevX = chordPx * 0.65;
      const tevY = 12 + Math.cos(cycleTime) * 5;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.beginPath();
      ctx.arc(tevX, tevY, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Lift Vector Arrow
      const liftMag = Math.max(10, aeroMetrics.liftToWeightRatio * 35);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -liftMag);
      ctx.stroke();

      // Arrowhead
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(0, -liftMag - 8);
      ctx.lineTo(-6, -liftMag);
      ctx.lineTo(6, -liftMag);
      ctx.closePath();
      ctx.fill();

      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#10b981';
      ctx.fillText(`Lift F_L = ${(aeroMetrics.meanLift_N * 1000).toFixed(1)} mN`, 12, -liftMag / 2);

      ctx.restore();

      // HUD overlay
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.fillRect(15, 15, 230, 90);
      ctx.strokeStyle = '#38bdf8';
      ctx.strokeRect(15, 15, 230, 90);

      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('BIOMORPHIC MAV LEV VORTEX HUD', 25, 32);
      ctx.font = '10px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Частота f: ${flapFreq_Hz} Гц (Tip: ${aeroMetrics.U_tip_avg.toFixed(1)} м/с)`, 25, 48);
      ctx.fillText(`Число Рейнольдса Re: ${aeroMetrics.Re.toFixed(0)}`, 25, 64);
      ctx.fillText(`Тяговооруженность (L/W): x${aeroMetrics.liftToWeightRatio.toFixed(2)}`, 25, 80);
      ctx.fillText(`Мощность привода: ${aeroMetrics.aeroPower_mW.toFixed(1)} мВт`, 25, 96);

      if (isSimRunning) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [
    isSimRunning,
    flapFreq_Hz,
    strokeAmplitude_deg,
    pitchAmplitude_deg,
    aeroMetrics,
  ]);

  return (
    <div className="w-full bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 p-4 md:p-6 shadow-2xl font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-rose-500/20 border border-purple-500/40 text-purple-400 shadow-inner">
            <Bug className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-950/80 border border-purple-500/40 text-purple-300">
                #104 Bio-Insect MAV & LEV Vortex
              </span>
              <h2 className="text-xl font-black text-white tracking-tight font-mono">
                Биоморфные Микро-БПЛА & Нестационарный Вихрь LEV
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Аэродинамика машущего полета насекомых при ультранизких числах Рейнольдса ($Re \sim 10^2 \dots 10^4$), вихри передней кромки LEV и эффект Weis-Fogh.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSimRunning(!isSimRunning)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isSimRunning
                ? 'bg-purple-500 text-slate-950 hover:bg-purple-400'
                : 'bg-slate-800 text-purple-400 hover:bg-slate-700 border border-purple-500/30'
            }`}
          >
            {isSimRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isSimRunning ? 'Пауза Маха' : 'Запуск Маха'}</span>
          </button>
        </div>
      </div>

      {/* Presets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {INSECT_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => handleApplyPreset(p.id)}
            className={`p-3 rounded-xl text-left transition-all border cursor-pointer ${
              selectedPreset === p.id
                ? 'bg-purple-950/40 border-purple-500 text-purple-200 shadow-md ring-1 ring-purple-500/40'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
              <span className="font-mono">{p.name}</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono">
                {p.flapFreq_Hz} Гц
              </span>
            </div>
            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
              {p.desc}
            </p>
          </button>
        ))}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Подъемная сила</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono mt-1">
            {(aeroMetrics.meanLift_N * 1000).toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-400">мН</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Вес: {(aeroMetrics.weight_N * 1000).toFixed(1)} мН
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Тяговооруженность</span>
            <Zap className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-black text-purple-400 font-mono mt-1">
            x{aeroMetrics.liftToWeightRatio.toFixed(2)}
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5">
            {aeroMetrics.liftToWeightRatio >= 1.0 ? '✓ Зависание возможно' : '⚠ Недостаток тяги'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Число Рейнольдса Re</span>
            <Wind className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-xl font-black text-white font-mono mt-1">
            {aeroMetrics.Re.toFixed(0)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Ультранизкое ламинарное
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Скорость кончика</span>
            <Compass className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400 font-mono mt-1">
            {aeroMetrics.U_tip_avg.toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-400">м/с</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            ({(aeroMetrics.U_tip_avg * 3.6).toFixed(1)} км/ч)
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Мощность привода</span>
            <Zap className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-black text-rose-400 font-mono mt-1">
            {aeroMetrics.aeroPower_mW.toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-400">мВт</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Пьезоактюатор bimorph
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>C_L с учетом LEV</span>
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-black text-cyan-400 font-mono mt-1">
            {aeroMetrics.Cl_effective.toFixed(2)}
          </div>
          <div className="text-[10px] text-cyan-400 mt-0.5">
            +{( (aeroMetrics.Cl_effective / 1.1 - 1) * 100).toFixed(0)}% сверх срыва
          </div>
        </div>
      </div>

      {/* Dynamic Flapping & LEV Canvas */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-400" />
            2D CFD Визуализация Присоединенного Вихря LEV (Leading Edge Vortex):
          </span>
          <span className="text-[10px] font-mono text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/40">
            Частота: {flapFreq_Hz} Гц | Размах: {wingspan_mm} мм
          </span>
        </div>

        <div className="relative w-full h-[360px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={720}
            height={360}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Sliders & Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Sliders className="w-4 h-4 text-purple-400" />
            Геометрия & Масса Крыла
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-400 mb-1 font-mono">
                <span>Размах крыльев (Wingspan):</span>
                <span className="text-purple-300 font-bold">{wingspan_mm} мм</span>
              </div>
              <input
                type="range"
                min={10}
                max={120}
                step={1}
                value={wingspan_mm}
                onChange={(e) => setWingspanMm(parseInt(e.target.value))}
                className="w-full accent-purple-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1 font-mono">
                <span>Средняя хорда (Chord):</span>
                <span className="text-purple-300 font-bold">{chord_mm} мм</span>
              </div>
              <input
                type="range"
                min={3}
                max={30}
                step={0.5}
                value={chord_mm}
                onChange={(e) => setChordMm(parseFloat(e.target.value))}
                className="w-full accent-purple-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1 font-mono">
                <span>Полная масса робота / насекомого:</span>
                <span className="text-purple-300 font-bold">{mass_mg} мг</span>
              </div>
              <input
                type="range"
                min={30}
                max={2500}
                step={10}
                value={mass_mg}
                onChange={(e) => setMassMg(parseInt(e.target.value))}
                className="w-full accent-purple-400"
              />
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-pink-400" />
            Кинематика Взмаха & Вращения
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-400 mb-1 font-mono">
                <span>Частота взмахов (Flapping Frequency):</span>
                <span className="text-pink-300 font-bold">{flapFreq_Hz} Гц</span>
              </div>
              <input
                type="range"
                min={15}
                max={300}
                step={5}
                value={flapFreq_Hz}
                onChange={(e) => setFlapFreqHz(parseInt(e.target.value))}
                className="w-full accent-pink-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1 font-mono">
                <span>Амплитуда взмаха (&Phi;):</span>
                <span className="text-pink-300 font-bold">{strokeAmplitude_deg}&deg;</span>
              </div>
              <input
                type="range"
                min={60}
                max={160}
                step={5}
                value={strokeAmplitude_deg}
                onChange={(e) => setStrokeAmplitudeDeg(parseInt(e.target.value))}
                className="w-full accent-pink-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1 font-mono">
                <span>Амплитуда закручивания тангажа (&alpha;):</span>
                <span className="text-pink-300 font-bold">{pitchAmplitude_deg}&deg;</span>
              </div>
              <input
                type="range"
                min={20}
                max={70}
                step={2}
                value={pitchAmplitude_deg}
                onChange={(e) => setPitchAmplitudeDeg(parseInt(e.target.value))}
                className="w-full accent-pink-400"
              />
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Нестационарные Эффекты (LEV / Weis-Fogh)
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono">
              <span className="text-slate-300">Механизм «Хлопок-Рывок» (Clap-and-Fling):</span>
              <button
                type="button"
                onClick={() => setClapAndFling(!clapAndFling)}
                className={`px-3 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                  clapAndFling
                    ? 'bg-cyan-500 text-slate-950 font-black'
                    : 'bg-slate-800 border border-slate-700 text-slate-400'
                }`}
              >
                {clapAndFling ? 'ВКЛ (+35% Тяги)' : 'ВЫКЛ'}
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-cyan-500/30 text-[11px] text-slate-300 font-mono space-y-1">
              <div className="flex justify-between">
                <span>Уравнение вихря LEV:</span>
                <span className="text-cyan-400 font-bold">&Gamma; = &frac12; U_tip &middot; c</span>
              </div>
              <div className="flex justify-between">
                <span>Эффект Вагнера (Wagner delay):</span>
                <span className="text-purple-300 font-bold">Устойчив (&Phi; &gt; 90&deg;)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Flapping Cycle Phase Chart */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            Фазовая Диаграмма Махового Цикла (0&deg; .. 360&deg;):
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Downstroke (0&deg;..180&deg;) &rarr; Upstroke (180&deg;..360&deg;)
          </span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cyclePhaseData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis
                dataKey="phase_deg"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                label={{ value: 'Фазовый угол цикла (&deg;)', position: 'insideBottomRight', offset: -5, fill: '#64748b', fontSize: 10 }}
              />
              <YAxis
                yAxisId="left"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                label={{ value: 'Угол положения (&deg;)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                label={{ value: 'Мгновенная тяга F_L (мН)', angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="stroke_pos_deg"
                name="Положение взмаха (&deg;)"
                stroke="#c084fc"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pitch_angle_deg"
                name="Угол закрутки (&deg;)"
                stroke="#f472b6"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="instant_lift_mN"
                name="Мгновенная тяга LEV (мН)"
                stroke="#34d399"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
