import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Feather,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Activity,
  Wind,
  Zap,
  Info,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface BirdProfile {
  name: string;
  wingspan: number; // m
  chord: number; // m
  mass: number; // kg
  flapFreq: number; // Hz
  amplitude: number; // deg
  pitchAmp: number; // deg
  cruiseSpeed: number; // m/s
  desc: string;
}

const BIRD_PRESETS: Record<string, BirdProfile> = {
  falcon: {
    name: 'Сапсан / Сокол (Peregrine Biomimetic)',
    wingspan: 1.1,
    chord: 0.18,
    mass: 0.85,
    flapFreq: 4.8,
    amplitude: 38,
    pitchAmp: 22,
    cruiseSpeed: 18.0,
    desc: 'Высокоскоростной машущий БПЛА разведки с динамическим вихреобразованием LEV.',
  },
  swift: {
    name: 'Черный Стриж (AeroSwift Micro-UAV)',
    wingspan: 0.42,
    chord: 0.07,
    mass: 0.045,
    flapFreq: 8.5,
    amplitude: 45,
    pitchAmp: 28,
    cruiseSpeed: 11.5,
    desc: 'Сверхманевренный микро-БПЛА с низким числом Рейнольдса и механизмом Clap-and-Fling.',
  },
  hummingbird: {
    name: 'Колибри (Nano-Hovercraft Hummingbird)',
    wingspan: 0.16,
    chord: 0.035,
    mass: 0.012,
    flapFreq: 28.0,
    amplitude: 65,
    pitchAmp: 42,
    cruiseSpeed: 0.0,
    desc: 'Нано-БПЛА зависающего типа с симметричным взмахом «восьмерка» и 100% активным обратным ходом.',
  },
  pterosaur: {
    name: 'Птерозавр (Heavy Ornithopter SkyGlider)',
    wingspan: 2.8,
    chord: 0.45,
    mass: 4.2,
    flapFreq: 2.1,
    amplitude: 30,
    pitchAmp: 16,
    cruiseSpeed: 14.0,
    desc: 'Тяжелый планер-орнитоптер дальнего патрулирования с эластичным морфингом законцовок.',
  },
};

export const UAVFlappingWingOrnithopterModule: React.FC = () => {
  // Presets & Parameters
  const [selectedPreset, setSelectedPreset] = useState<string>('falcon');
  const [wingspan, setWingspan] = useState<number>(1.1);
  const [chord, setChord] = useState<number>(0.18);
  const [mass, setMass] = useState<number>(0.85);
  const [flapFreq, setFlapFreq] = useState<number>(4.8);
  const [amplitude, setAmplitude] = useState<number>(38); // degrees
  const [pitchAmp, setPitchAmp] = useState<number>(22); // degrees
  const [airspeed, setAirspeed] = useState<number>(16.0); // m/s
  const [phaseLag, setPhaseLag] = useState<number>(90); // degrees between pitch and flap
  const [wingFlexibility, setWingFlexibility] = useState<number>(0.4); // 0 (rigid) to 1 (hyper-flexible)
  const [windGust, setWindGust] = useState<number>(0);

  // Simulation State
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);
  const [vortexParticles, setVortexParticles] = useState<
    Array<{ x: number; y: number; age: number; strength: number; sign: number }>
  >([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load Preset
  const handlePresetSelect = (key: string) => {
    const p = BIRD_PRESETS[key];
    if (!p) return;
    setSelectedPreset(key);
    setWingspan(p.wingspan);
    setChord(p.chord);
    setMass(p.mass);
    setFlapFreq(p.flapFreq);
    setAmplitude(p.amplitude);
    setPitchAmp(p.pitchAmp);
    setAirspeed(p.cruiseSpeed);
  };

  // Aerodynamic Computations
  const wingArea = wingspan * chord; // S = b * c (approx rectangular / elliptical)
  const aspect_ratio = (wingspan * wingspan) / wingArea;
  const tipSpeed = 2 * Math.PI * flapFreq * (wingspan / 2) * Math.sin((amplitude * Math.PI) / 180);
  
  // Strouhal Number: St = f * A / U_inf
  const peakToPeakAmp = (wingspan * Math.sin((amplitude * Math.PI) / 180));
  const effectiveU = Math.max(0.5, airspeed);
  const strouhal = (flapFreq * peakToPeakAmp) / effectiveU;

  // Strouhal efficiency rating: optimal 0.2 <= St <= 0.4
  const isStrouhalOptimal = strouhal >= 0.2 && strouhal <= 0.45;

  // Instantaneous kinematics at time t
  const omega = 2 * Math.PI * flapFreq;
  const currentFlapAngleDeg = amplitude * Math.sin(omega * simTime);
  const currentPitchAngleDeg = pitchAmp * Math.sin(omega * simTime - (phaseLag * Math.PI) / 180);
  const currentFlapVel = amplitude * (Math.PI / 180) * omega * Math.cos(omega * simTime);

  // Unsteady lift & thrust (Garrick / Theodorsen + LEV dynamic stall augmentation)
  const rho = 1.225;
  const dynamicPressure = 0.5 * rho * (effectiveU * effectiveU);
  
  // Quasi-steady + Wagner effect + LEV lift
  const levMultiplier = 1.0 + 0.6 * Math.abs(Math.sin(omega * simTime)); // LEV leading edge vortex boost
  const instantaneousAoA = currentPitchAngleDeg - (Math.atan2(currentFlapVel * (wingspan * 0.35), effectiveU) * 180) / Math.PI;
  const instantaneousCl = Math.sin((instantaneousAoA * Math.PI) / 90) * 1.8 * levMultiplier;
  const instantaneousCd0 = 0.03 + 0.12 * Math.pow(Math.sin((instantaneousAoA * Math.PI) / 180), 2);
  
  // Induced thrust from reverse Karman vortex shedding:
  const thrustCoeff = 0.8 * Math.pow(strouhal, 1.8) * Math.sin((phaseLag * Math.PI) / 180) * (1 - wingFlexibility * 0.2);
  const instantaneousThrust = thrustCoeff * dynamicPressure * wingArea * Math.max(0, Math.cos(omega * simTime + Math.PI / 4) + 0.5);
  const instantaneousLift = instantaneousCl * dynamicPressure * wingArea + (effectiveU < 1.0 ? mass * 9.81 * 1.1 : 0);
  const meanLift = dynamicPressure * wingArea * 1.15 + (effectiveU < 2 ? mass * 9.81 * (flapFreq / 15) : 0);
  const meanThrust = thrustCoeff * dynamicPressure * wingArea * 0.7;
  const mechanicalPower = (meanThrust * effectiveU) / Math.max(0.1, isStrouhalOptimal ? 0.75 : 0.42) + (mass * 9.81 * flapFreq * 0.08);

  // Power to weight & flight status
  const weight = mass * 9.81;
  const liftToWeightRatio = meanLift / Math.max(0.01, weight);
  const canSustainFlight = liftToWeightRatio >= 0.95;

  // Animation Loop
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSimTime((prev) => prev + 0.016);

      // Spawn shed vortex particles
      if (Math.random() < 0.35) {
        const sign = Math.sin(omega * simTime) > 0 ? 1 : -1;
        setVortexParticles((prev) => [
          ...prev.slice(-40),
          {
            x: 180,
            y: 150 + (currentFlapAngleDeg / amplitude) * 45,
            age: 0,
            strength: 1.0 + Math.abs(currentFlapVel) * 0.5,
            sign,
          },
        ]);
      }

      // Age vortex particles
      setVortexParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + (effectiveU * 3.5 + 4) * 0.3,
            y: p.y + p.sign * Math.sin(p.age * 0.15) * 1.5,
            age: p.age + 1,
            strength: p.strength * 0.96,
          }))
          .filter((p) => p.age < 70 && p.x < 550)
      );
    }, 16);

    return () => clearInterval(interval);
  }, [isRunning, simTime, omega, currentFlapAngleDeg, amplitude, currentFlapVel, effectiveU]);

  // Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;

    // Background Sky / Flow Streamlines
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Flow Streamlines with pulsating velocity
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;
    for (let y = 30; y < h; y += 35) {
      ctx.beginPath();
      for (let x = 0; x < w; x += 15) {
        const wave = Math.sin(x * 0.02 - simTime * 6 + y) * 6;
        const uavDeflection = x > 120 && x < 350 ? Math.exp(-Math.pow((x - 200) / 70, 2)) * currentFlapAngleDeg * 0.3 : 0;
        if (x === 0) ctx.moveTo(x, y + wave + uavDeflection);
        else ctx.lineTo(x, y + wave + uavDeflection);
      }
      ctx.stroke();
    }

    // Draw Vortex Shedding (Reverse Kármán Vortex Street for Thrust)
    vortexParticles.forEach((v) => {
      ctx.beginPath();
      const alpha = Math.max(0, (1 - v.age / 70) * 0.7);
      ctx.fillStyle = v.sign > 0 ? `rgba(244, 63, 94, ${alpha})` : `rgba(59, 130, 246, ${alpha})`;
      ctx.arc(v.x, v.y, Math.max(2, v.age * 0.35 * v.strength), 0, Math.PI * 2);
      ctx.fill();

      // Vortex spin arrow
      ctx.strokeStyle = v.sign > 0 ? `rgba(251, 113, 133, ${alpha * 0.9})` : `rgba(96, 165, 250, ${alpha * 0.9})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(v.x, v.y, Math.max(3, v.age * 0.28), 0, Math.PI * 1.5);
      ctx.stroke();
    });

    // Draw Flapping Wing Ornithopter Model (Front/Side Hybrid View)
    const centerX = 160;
    const centerY = 150;

    // Body Fuselage
    ctx.fillStyle = '#0f766e';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 38, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tail Feather (Elevator & Rudder stabilizer)
    ctx.fillStyle = '#115e59';
    ctx.beginPath();
    ctx.moveTo(centerX - 35, centerY);
    ctx.lineTo(centerX - 75, centerY - 14 + Math.sin(simTime * 4) * 4);
    ctx.lineTo(centerX - 70, centerY + 14 + Math.sin(simTime * 4) * 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Left & Right Wings (Kinematic articulation with flexible aeroelastic deformation)
    const wingLength = 110;
    const flapRad = (currentFlapAngleDeg * Math.PI) / 180;
    const pitchRad = (currentPitchAngleDeg * Math.PI) / 180;
    const flexLag = wingFlexibility * Math.sin(omega * simTime - 0.5) * 18;

    // Upper Wing (Right Wing in visual plane)
    ctx.save();
    ctx.translate(centerX, centerY - 4);
    
    // Draw articulated wing skeleton & membrane
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const jointX = Math.cos(pitchRad) * (wingLength * 0.45);
    const jointY = -Math.sin(flapRad) * (wingLength * 0.45);
    const tipX = Math.cos(pitchRad) * wingLength;
    const tipY = -Math.sin(flapRad) * wingLength + flexLag;

    ctx.quadraticCurveTo(jointX, jointY, tipX, tipY);
    ctx.lineTo(tipX - 25 * Math.cos(pitchRad), tipY + 20);
    ctx.quadraticCurveTo(jointX - 15, jointY + 15, -15, 0);
    ctx.closePath();

    // Wing Membrane gradient
    const wingGrad = ctx.createLinearGradient(0, 0, tipX, tipY);
    wingGrad.addColorStop(0, 'rgba(45, 212, 191, 0.85)');
    wingGrad.addColorStop(0.5, 'rgba(13, 148, 136, 0.7)');
    wingGrad.addColorStop(1, 'rgba(20, 184, 166, 0.4)');
    ctx.fillStyle = wingGrad;
    ctx.fill();
    ctx.strokeStyle = '#5eead4';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Spar & Ribs structural lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(tipX, tipY);
    ctx.moveTo(jointX * 0.5, jointY * 0.5);
    ctx.lineTo(jointX * 0.5 - 12, jointY * 0.5 + 12);
    ctx.moveTo(jointX, jointY);
    ctx.lineTo(jointX - 18, jointY + 16);
    ctx.stroke();

    // Leading Edge Vortex (LEV) dynamic visualization
    if (Math.abs(currentFlapVel) > 1.2) {
      ctx.beginPath();
      ctx.arc(jointX + 10, jointY - 6, 8 + Math.abs(currentFlapVel) * 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
      ctx.fill();
      ctx.strokeStyle = '#fb7185';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#fda4af';
      ctx.font = '9px monospace';
      ctx.fillText('LEV Core', jointX - 10, jointY - 14);
    }

    ctx.restore();

    // Avionics & Payload Pod
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(centerX + 26, centerY - 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.stroke();

    // Force Vectors (Lift & Thrust overlays)
    ctx.save();
    ctx.translate(centerX, centerY);
    
    // Lift vector (Green up)
    const liftVectorLen = Math.min(80, (instantaneousLift / Math.max(1, weight)) * 40);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -liftVectorLen);
    ctx.stroke();
    // Lift arrowhead
    ctx.beginPath();
    ctx.moveTo(-5, -liftVectorLen + 6);
    ctx.lineTo(0, -liftVectorLen);
    ctx.lineTo(5, -liftVectorLen + 6);
    ctx.fillStyle = '#22c55e';
    ctx.fill();

    // Thrust vector (Cyan right)
    const thrustVectorLen = Math.min(70, instantaneousThrust * 12);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(thrustVectorLen, 0);
    ctx.stroke();
    // Thrust arrowhead
    ctx.beginPath();
    ctx.moveTo(thrustVectorLen - 6, -5);
    ctx.lineTo(thrustVectorLen, 0);
    ctx.lineTo(thrustVectorLen - 6, 5);
    ctx.fillStyle = '#06b6d4';
    ctx.fill();

    ctx.restore();

    // Telemetry HUD overlay on canvas
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(10, 10, 210, 85);
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, 210, 85);

    ctx.fillStyle = '#5eead4';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('ТЕКУЩАЯ КИНЕМАТИКА МАХА:', 18, 26);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px monospace';
    ctx.fillText(`Угол взмаха: ${currentFlapAngleDeg.toFixed(1)}°`, 18, 42);
    ctx.fillText(`Угол атаки (Pitch): ${currentPitchAngleDeg.toFixed(1)}°`, 18, 56);
    ctx.fillText(`Мгновенная подъемная F: ${instantaneousLift.toFixed(2)} Н`, 18, 70);
    ctx.fillText(`Мгновенная тяга T: ${instantaneousThrust.toFixed(2)} Н`, 18, 84);

    // Strouhal zone gauge
    ctx.fillStyle = isStrouhalOptimal ? '#22c55e' : '#f59e0b';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`St = ${strouhal.toFixed(3)} [${isStrouhalOptimal ? 'ОПТИМУМ' : 'НЕ ОПТИМАЛЬНО'}]`, w - 210, 26);
  }, [
    simTime,
    currentFlapAngleDeg,
    currentPitchAngleDeg,
    currentFlapVel,
    vortexParticles,
    wingFlexibility,
    omega,
    wingspan,
    chord,
    amplitude,
    pitchAmp,
    instantaneousLift,
    instantaneousThrust,
    strouhal,
    isStrouhalOptimal,
    weight,
    effectiveU,
  ]);

  // Harmonic Phase Profile Data for Charts
  const harmonicChartData = useMemo(() => {
    const pts = [];
    for (let deg = 0; deg <= 360; deg += 10) {
      const rad = (deg * Math.PI) / 180;
      const flapAng = amplitude * Math.sin(rad);
      const pitchAng = pitchAmp * Math.sin(rad - (phaseLag * Math.PI) / 180);
      const flapV = amplitude * (Math.PI / 180) * omega * Math.cos(rad);
      const effAoA = pitchAng - (Math.atan2(flapV * (wingspan * 0.35), effectiveU) * 180) / Math.PI;
      const instL = Math.sin((effAoA * Math.PI) / 90) * dynamicPressure * wingArea * 1.6 + 0.5 * weight;
      const instT = Math.pow(strouhal, 1.5) * dynamicPressure * wingArea * Math.max(0, Math.cos(rad + Math.PI / 4) + 0.4);

      pts.push({
        phase: `${deg}°`,
        FlapAngle: parseFloat(flapAng.toFixed(1)),
        PitchAngle: parseFloat(pitchAng.toFixed(1)),
        LiftForce: parseFloat(Math.max(0, instL).toFixed(2)),
        ThrustForce: parseFloat(Math.max(0, instT * 2).toFixed(2)),
      });
    }
    return pts;
  }, [amplitude, pitchAmp, phaseLag, omega, wingspan, dynamicPressure, wingArea, weight, strouhal, effectiveU]);

  return (
    <div className="space-y-6 text-slate-100 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 border border-teal-500/30 p-6 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/30 ring-1 ring-white/20">
              <Feather className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Биомиметический Орнитоптер & Нестационарное Машущее Крыло
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 font-mono">
                  LEV & Strouhal Bio-UAV
                </span>
              </h2>
              <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl">
                Моделирование динамического срыва потока, вихрей передней кромки (Leading-Edge Vortex, LEV),
                кинематики сочленений крыла, пропульсивного КПД в следе обратной дорожки Кармана и числа Струхаля ($St = f A / U_\infty$).
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 bg-slate-900/80 border border-teal-500/30 px-4 py-2 rounded-xl backdrop-blur-md">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Тяговооруженность / L/W</div>
              <div className={`text-base font-black ${canSustainFlight ? 'text-emerald-400' : 'text-amber-400'}`}>
                {liftToWeightRatio.toFixed(2)}x {canSustainFlight ? '✓ Полет' : '⚠ Недостаток Y'}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Число Струхаля</div>
              <div className={`text-base font-black ${isStrouhalOptimal ? 'text-teal-300' : 'text-amber-400'}`}>
                St = {strouhal.toFixed(3)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Selector Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(BIRD_PRESETS).map(([key, p]) => (
          <button
            key={key}
            onClick={() => handlePresetSelect(key)}
            className={`p-3.5 rounded-xl text-left transition-all border ${
              selectedPreset === key
                ? 'bg-gradient-to-br from-teal-900/60 via-emerald-950/60 to-slate-900 border-teal-400 ring-2 ring-teal-500/30 shadow-lg'
                : 'bg-slate-900/70 border-slate-800 hover:border-teal-700/50 hover:bg-slate-850'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-300">{p.name.split(' (')[0]}</span>
              {selectedPreset === key && <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{p.desc}</p>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-2 pt-2 border-t border-slate-800/80">
              <span>Размах: {p.wingspan}м</span>
              <span>f = {p.flapFreq} Гц</span>
              <span>{p.mass * 1000 >= 1000 ? `${p.mass} кг` : `${p.mass * 1000} г`}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Interactive Stage & Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Canvas Visualization (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-bold text-slate-200">
                2D Аэродинамический След, LEV Вихри и Кинематика Крыла
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isRunning
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                }`}
              >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isRunning ? 'Пауза' : 'Пуск'}</span>
              </button>
              <button
                onClick={() => {
                  setSimTime(0);
                  setVortexParticles([]);
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Сброс времени"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-teal-900/40 bg-slate-950 flex items-center justify-center">
            <canvas ref={canvasRef} width={580} height={300} className="w-full h-auto max-h-[340px] block" />
          </div>

          {/* Strouhal & Flight Physics Diagnosis Box */}
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Эффективность Маха</div>
              <div className="text-sm font-black text-teal-300 mt-0.5">
                {isStrouhalOptimal ? '74-82% (Высокая)' : '35-50% (Низкая)'}
              </div>
              <div className="text-[9px] text-slate-400 mt-1">Оптимум St: 0.20 - 0.40</div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Ср. Механич. Мощность</div>
              <div className="text-sm font-black text-emerald-400 mt-0.5">{mechanicalPower.toFixed(1)} Вт</div>
              <div className="text-[9px] text-slate-400 mt-1">Удельная: {(mechanicalPower / mass).toFixed(1)} Вт/кг</div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Скорость Законцовки</div>
              <div className="text-sm font-black text-sky-400 mt-0.5">{tipSpeed.toFixed(1)} м/с</div>
              <div className="text-[9px] text-slate-400 mt-1">V_tip / V_inf: {(tipSpeed / effectiveU).toFixed(2)}x</div>
            </div>
          </div>
        </div>

        {/* Right: Kinematics & Mechanics Sliders (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold text-white">Параметры Машущего Привода & Кинематики</h3>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Flapping Frequency */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Частота взмахов крыла (f):</span>
                <span className="font-mono text-teal-400 font-bold">{flapFreq.toFixed(1)} Гц</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={32.0}
                step={0.1}
                value={flapFreq}
                onChange={(e) => setFlapFreq(parseFloat(e.target.value))}
                className="w-full accent-teal-400 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Flapping Amplitude */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Амплитуда взмаха (Stroke Amplitude):</span>
                <span className="font-mono text-teal-400 font-bold">±{amplitude}°</span>
              </div>
              <input
                type="range"
                min={15}
                max={75}
                step={1}
                value={amplitude}
                onChange={(e) => setAmplitude(parseInt(e.target.value, 10))}
                className="w-full accent-teal-400 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Pitch Amplitude */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Амплитуда угла тангажа (Pitching Angle):</span>
                <span className="font-mono text-teal-400 font-bold">±{pitchAmp}°</span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                step={1}
                value={pitchAmp}
                onChange={(e) => setPitchAmp(parseInt(e.target.value, 10))}
                className="w-full accent-teal-400 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Phase Lag between Flap and Pitch */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Фазовый сдвиг маха и тангажа (ψ):</span>
                <span className="font-mono text-sky-400 font-bold">{phaseLag}° (Опт: ~90°)</span>
              </div>
              <input
                type="range"
                min={0}
                max={180}
                step={5}
                value={phaseLag}
                onChange={(e) => setPhaseLag(parseInt(e.target.value, 10))}
                className="w-full accent-sky-400 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Airspeed */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Скорость набегающего потока (U∞):</span>
                <span className="font-mono text-amber-400 font-bold">{airspeed.toFixed(1)} м/с</span>
              </div>
              <input
                type="range"
                min={0.0}
                max={30.0}
                step={0.5}
                value={airspeed}
                onChange={(e) => setAirspeed(parseFloat(e.target.value))}
                className="w-full accent-amber-400 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Wing Flexibility */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Аэроупругая гибкость крыла (Flexibility):</span>
                <span className="font-mono text-purple-400 font-bold">{(wingFlexibility * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0.0}
                max={1.0}
                step={0.05}
                value={wingFlexibility}
                onChange={(e) => setWingFlexibility(parseFloat(e.target.value))}
                className="w-full accent-purple-400 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <div className="p-3 bg-teal-950/40 border border-teal-800/50 rounded-xl text-[11px] text-teal-200/90 leading-relaxed">
            <span className="font-bold text-teal-300">💡 Теорема Гаррика и вихрь LEV:</span> При взмахе крыла
            создается присоединенный вихрь передней кромки, генерирующий избыточную подъемную силу без срыва потока до
            углов атаки $35^\circ$ (динамический срыв потока). Фазовый сдвиг $\psi \approx 90^\circ$ преобразует маховую
            энергию в максимальную продольную тягу.
          </div>
        </div>
      </div>

      {/* Graphs Section: Unsteady Forces vs Flap Phase */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Нестационарные Силы & Углы за Период Колебания Крыла (0° - 360°)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Гармонический цикл Т = 1/f = {(1 / flapFreq).toFixed(3)} с</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={harmonicChartData}>
              <defs>
                <linearGradient id="colorLift" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorThrust" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="phase" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Area
                type="monotone"
                dataKey="LiftForce"
                name="Подъемная сила (Н)"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorLift)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="ThrustForce"
                name="Тяга маха (Н)"
                stroke="#06b6d4"
                fillOpacity={1}
                fill="url(#colorThrust)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="FlapAngle"
                name="Угол маха (°)"
                stroke="#a855f7"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="PitchAngle"
                name="Угол тангажа (°)"
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="2 2"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
