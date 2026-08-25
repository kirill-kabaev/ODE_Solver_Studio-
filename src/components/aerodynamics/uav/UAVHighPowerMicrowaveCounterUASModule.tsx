import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Zap,
  Radio,
  ShieldAlert,
  Target,
  Sliders,
  Activity,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Layers,
  Sparkles,
  RefreshCw,
  Cpu,
  Eye,
  Crosshair,
  Gauge,
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
  AreaChart,
  Area,
} from 'recharts';

interface SwarmDrone {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  shielding_dB: number; // front-door / back-door attenuation
  circuitTemp_C: number;
  inducedVoltage_V: number;
  status: 'operational' | 'glitching' | 'fried_burnout' | 'crashed';
  burnoutProgress: number; // 0..100%
  type: 'FPV_Kamikaze' | 'Recon_Hexa' | 'Octocopter_Heavy';
}

export const UAVHighPowerMicrowaveCounterUASModule: React.FC = () => {
  // HPM Transmitter parameters
  const [peakPower_MW, setPeakPower_MW] = useState<number>(50); // MegaWatts
  const [pulseWidth_ns, setPulseWidth_ns] = useState<number>(120); // nanoseconds
  const [prf_Hz, setPrf_Hz] = useState<number>(500); // Pulse Repetition Frequency
  const [frequency_GHz, setFrequency_GHz] = useState<number>(3.5); // S/C band microwave
  const [antennaGain_dBi, setAntennaGain_dBi] = useState<number>(28); // Phased array gain
  const [beamApertureDeg, setBeamApertureDeg] = useState<number>(14); // Beamwidth (deg)
  const [aimAngleDeg, setAimAngleDeg] = useState<number>(15); // Azimuth aim
  const [firingMode, setFiringMode] = useState<'burst' | 'continuous_pulse' | 'standby'>('burst');
  const [isEmitting, setIsEmitting] = useState<boolean>(true);
  const [swarmPreset, setSwarmPreset] = useState<'fpv_saturation' | 'dispersed_recon' | 'heavy_armored'>('fpv_saturation');

  // Simulation loop
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);
  const [pulseCount, setPulseCount] = useState<number>(0);
  const [destroyedCount, setDestroyedCount] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dronesRef = useRef<SwarmDrone[]>([]);
  const animFrameRef = useRef<number>(0);

  // Initialize swarm
  const initSwarm = (preset: typeof swarmPreset) => {
    const drones: SwarmDrone[] = [];
    let count = 18;
    let type: SwarmDrone['type'] = 'FPV_Kamikaze';
    let baseShield = 15; // dB

    if (preset === 'fpv_saturation') {
      count = 24;
      type = 'FPV_Kamikaze';
      baseShield = 10;
    } else if (preset === 'dispersed_recon') {
      count = 12;
      type = 'Recon_Hexa';
      baseShield = 22;
    } else if (preset === 'heavy_armored') {
      count = 8;
      type = 'Octocopter_Heavy';
      baseShield = 32;
    }

    for (let i = 0; i < count; i++) {
      const distance = 140 + Math.random() * 260; // meters from interceptor
      const spreadAngle = (Math.random() - 0.5) * 60; // degrees
      const rad = (spreadAngle * Math.PI) / 180;
      
      drones.push({
        id: i + 1,
        x: distance * Math.cos(rad),
        y: distance * Math.sin(rad),
        vx: -(12 + Math.random() * 10), // advancing towards interceptor (x=0)
        vy: (Math.random() - 0.5) * 6,
        shielding_dB: baseShield + (Math.random() * 6 - 3),
        circuitTemp_C: 25,
        inducedVoltage_V: 0,
        status: 'operational',
        burnoutProgress: 0,
        type,
      });
    }

    dronesRef.current = drones;
    setDestroyedCount(0);
    setSimTime(0);
    setPulseCount(0);
  };

  useEffect(() => {
    initSwarm(swarmPreset);
  }, [swarmPreset]);

  // Derived Microwave Beam calculations
  const physics = useMemo(() => {
    const c = 3e8;
    const wavelength = c / (frequency_GHz * 1e9); // meters
    const gLinear = Math.pow(10, antennaGain_dBi / 10);
    const erp_MW = peakPower_MW * gLinear; // Effective Radiated Power (ERP)

    // Pulse energy: E = P * tau
    const pulseEnergy_J = (peakPower_MW * 1e6) * (pulseWidth_ns * 1e-9);
    const avgPower_kW = (pulseEnergy_J * prf_Hz) / 1000;

    // Field strength at 100m on boresight:
    // S = (P_peak * G) / (4 * pi * R^2)
    // E = sqrt(S * eta_0), eta_0 = 377 Ohm
    const calcFieldAtR = (r_m: number) => {
      if (r_m < 1) r_m = 1;
      const s_W_m2 = (peakPower_MW * 1e6 * gLinear) / (4 * Math.PI * r_m * r_m);
      const e_V_m = Math.sqrt(s_W_m2 * 377);
      return { s_W_m2, e_kV_m: e_V_m / 1000 };
    };

    const fieldAt50m = calcFieldAtR(50);
    const fieldAt150m = calcFieldAtR(150);
    const fieldAt300m = calcFieldAtR(300);

    // Lethal range for standard unshielded CMOS electronics (~5 kV/m breakdown threshold)
    // 5000 V/m = sqrt( (P * G * 377) / (4 * pi * R^2) ) => R_lethal
    const rLethal_m = Math.sqrt((peakPower_MW * 1e6 * gLinear * 377) / (4 * Math.PI * 25e6));

    return {
      wavelength_cm: (wavelength * 100).toFixed(2),
      erp_MW: erp_MW.toFixed(1),
      pulseEnergy_J: pulseEnergy_J.toFixed(2),
      avgPower_kW: avgPower_kW.toFixed(2),
      fieldAt50m_kVm: fieldAt50m.e_kV_m.toFixed(1),
      fieldAt150m_kVm: fieldAt150m.e_kV_m.toFixed(1),
      fieldAt300m_kVm: fieldAt300m.e_kV_m.toFixed(2),
      rLethal_m: rLethal_m.toFixed(0),
    };
  }, [peakPower_MW, pulseWidth_ns, prf_Hz, frequency_GHz, antennaGain_dBi]);

  // Main simulation loop
  useEffect(() => {
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      if (isPlaying) {
        setSimTime((t) => t + dt);
        if (isEmitting) {
          setPulseCount((p) => p + Math.round(prf_Hz * dt));
        }

        const gLinear = Math.pow(10, antennaGain_dBi / 10);
        let currentKilled = 0;

        // Update drones
        dronesRef.current.forEach((drone) => {
          if (drone.status === 'crashed') {
            currentKilled++;
            return;
          }

          // Advance motion
          drone.x += drone.vx * dt;
          drone.y += drone.vy * dt;

          // Boundary bounce or respawn if behind interceptor
          if (drone.x < 10) {
            drone.x = 420;
            drone.y = (Math.random() - 0.5) * 220;
            drone.status = 'operational';
            drone.circuitTemp_C = 25;
            drone.burnoutProgress = 0;
          }

          // Distance and angle to HPM emitter (at 0,0)
          const dist = Math.hypot(drone.x, drone.y);
          const angleDeg = (Math.atan2(drone.y, drone.x) * 180) / Math.PI;
          const deltaAngle = Math.abs(angleDeg - aimAngleDeg);

          // Beam antenna radiation pattern approximation (sinc-like)
          let angleGainFactor = 0.01;
          const halfBeam = beamApertureDeg / 2;
          if (deltaAngle <= halfBeam) {
            angleGainFactor = Math.cos((deltaAngle / halfBeam) * (Math.PI / 2)) ** 2;
          }

          if (isEmitting && dist > 5) {
            // Power density at drone position
            const s_W_m2 = (peakPower_MW * 1e6 * gLinear * angleGainFactor) / (4 * Math.PI * dist * dist);
            const rawE_Field_V_m = Math.sqrt(Math.max(0, s_W_m2 * 377));

            // Backdoor/frontdoor coupling through PCB traces (effective aperture A_e ~ lambda^2 / 4pi)
            const shieldFactor = Math.pow(10, -drone.shielding_dB / 20);
            const internal_E = rawE_Field_V_m * shieldFactor;
            drone.inducedVoltage_V = internal_E * 0.08; // ~8cm PCB trace coupling

            // Thermal & Dielectric breakdown threshold:
            // High voltage spike > 120V causes latchup / gate oxide puncture in 3.3V/5V microcontrollers
            if (drone.inducedVoltage_V > 140) {
              drone.burnoutProgress += dt * 320; // instantaneous destruction
              drone.circuitTemp_C += dt * 180;
            } else if (drone.inducedVoltage_V > 45) {
              drone.burnoutProgress += dt * 65; // glitching / memory upset
              drone.circuitTemp_C += dt * 45;
            } else {
              // Cool down slowly
              drone.circuitTemp_C = Math.max(25, drone.circuitTemp_C - dt * 15);
            }

            // State transitions
            if (drone.burnoutProgress >= 100) {
              drone.status = 'fried_burnout';
              // Falling out of control
              drone.vy += 80 * dt;
              if (drone.y > 220 || drone.y < -220) {
                drone.status = 'crashed';
              }
            } else if (drone.burnoutProgress > 25) {
              drone.status = 'glitching';
              drone.vx += (Math.random() - 0.5) * 8;
              drone.vy += (Math.random() - 0.5) * 14;
            }
          } else {
            drone.inducedVoltage_V = 0;
            drone.circuitTemp_C = Math.max(25, drone.circuitTemp_C - dt * 10);
          }

          if (drone.status === 'fried_burnout' || drone.status === 'crashed') {
            currentKilled++;
          }
        });

        setDestroyedCount(currentKilled);
      }

      // Render on Canvas
      drawSimulation();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, isEmitting, peakPower_MW, prf_Hz, antennaGain_dBi, beamApertureDeg, aimAngleDeg]);

  // Render 2D Canvas Tactical Map
  const drawSimulation = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear background
    ctx.fillStyle = '#050a14';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#0f243a';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Scale factors: Interceptor at (60, h/2), map spans 450m x 300m
    const originX = 60;
    const originY = h / 2;
    const scale = (w - 100) / 450; // pixels per meter

    // Range rings
    [50, 100, 200, 300, 400].forEach((r) => {
      ctx.beginPath();
      ctx.arc(originX, originY, r * scale, 0, Math.PI * 2);
      ctx.strokeStyle = '#1e3a5f88';
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#475569';
      ctx.font = '10px monospace';
      ctx.fillText(`${r}m`, originX + r * scale - 12, originY + 12);
    });

    // Lethal zone contour (5 kV/m radius)
    const lethalR = parseFloat(physics.rLethal_m) * scale;
    ctx.beginPath();
    ctx.arc(originX, originY, lethalR, 0, Math.PI * 2);
    ctx.strokeStyle = '#ef444455';
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw HPM Beam Cone
    if (isEmitting) {
      const aimRad = (aimAngleDeg * Math.PI) / 180;
      const halfBeamRad = ((beamApertureDeg / 2) * Math.PI) / 180;
      const beamLength = 430 * scale;

      const grad = ctx.createRadialGradient(originX, originY, 10, originX, originY, beamLength);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.55)');
      grad.addColorStop(0.3, 'rgba(168, 85, 247, 0.35)');
      grad.addColorStop(0.7, 'rgba(239, 68, 68, 0.20)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0)');

      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.arc(originX, originY, beamLength, aimRad - halfBeamRad, aimRad + halfBeamRad);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Pulsing microwave wavefront ripples
      const tPulse = (simTime * 8) % 1;
      for (let p = 0; p < 4; p++) {
        const rWave = ((tPulse + p * 0.25) % 1) * beamLength;
        ctx.beginPath();
        ctx.arc(originX, originY, rWave, aimRad - halfBeamRad, aimRad + halfBeamRad);
        ctx.strokeStyle = `rgba(147, 197, 253, ${0.8 - rWave / beamLength})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Draw Interceptor / HPM Platform at (originX, originY)
    ctx.save();
    ctx.translate(originX, originY);
    ctx.rotate((aimAngleDeg * Math.PI) / 180);

    // Base body
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-14, -12);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-14, 12);
    ctx.closePath();
    ctx.fill();

    // HPM Dish / Phased Array Face
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(8, -8, 6, 16);
    ctx.restore();

    // Draw Drones
    dronesRef.current.forEach((drone) => {
      const dx = originX + drone.x * scale;
      const dy = originY + drone.y * scale;

      ctx.save();
      ctx.translate(dx, dy);

      if (drone.status === 'fried_burnout' || drone.status === 'crashed') {
        // Exploded / fried sparks
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        // Smoke particles
        ctx.fillStyle = '#64748b99';
        ctx.beginPath();
        ctx.arc(-4, -6, 5, 0, Math.PI * 2);
        ctx.arc(6, -8, 7, 0, Math.PI * 2);
        ctx.fill();

        // Cross
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-6, -6);
        ctx.lineTo(6, 6);
        ctx.moveTo(6, -6);
        ctx.lineTo(-6, 6);
        ctx.stroke();
      } else if (drone.status === 'glitching') {
        // Glitching yellow
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        // Glitch jitter lines
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-10, (Math.random() - 0.5) * 10);
        ctx.lineTo(10, (Math.random() - 0.5) * 10);
        ctx.stroke();
      } else {
        // Operational red/amber swarm enemy
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        // Rotor arms
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-6, -6);
        ctx.lineTo(6, 6);
        ctx.moveTo(6, -6);
        ctx.lineTo(-6, 6);
        ctx.stroke();
      }

      // Induced voltage bar above drone
      if (drone.inducedVoltage_V > 10 && drone.status !== 'crashed') {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-15, -14, 30, 4);
        const voltRatio = Math.min(1, drone.inducedVoltage_V / 160);
        ctx.fillStyle = voltRatio > 0.8 ? '#ef4444' : voltRatio > 0.4 ? '#f59e0b' : '#38bdf8';
        ctx.fillRect(-15, -14, 30 * voltRatio, 4);
      }

      ctx.restore();
    });
  };

  // Chart data: Field Intensity vs Range (Boilerplate comparison for 10MW vs 50MW vs 100MW)
  const rangeFieldData = useMemo(() => {
    const data = [];
    const gLinear = Math.pow(10, antennaGain_dBi / 10);
    for (let r = 20; r <= 400; r += 20) {
      const s_current = (peakPower_MW * 1e6 * gLinear) / (4 * Math.PI * r * r);
      const e_current_kV = Math.sqrt(s_current * 377) / 1000;

      const s_10 = (10 * 1e6 * gLinear) / (4 * Math.PI * r * r);
      const e_10_kV = Math.sqrt(s_10 * 377) / 1000;

      const s_100 = (100 * 1e6 * gLinear) / (4 * Math.PI * r * r);
      const e_100_kV = Math.sqrt(s_100 * 377) / 1000;

      data.push({
        range_m: r,
        current_kV_m: parseFloat(e_current_kV.toFixed(2)),
        ref_10MW_kV_m: parseFloat(e_10_kV.toFixed(2)),
        ref_100MW_kV_m: parseFloat(e_100_kV.toFixed(2)),
        cmos_threshold_kV_m: 5.0, // 5 kV/m standard silicon gate dielectric rupture
        fpga_hardened_kV_m: 25.0, // Faradaic shielded target
      });
    }
    return data;
  }, [peakPower_MW, antennaGain_dBi]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-800/40 rounded-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-purple-500/20 border border-purple-400/30 rounded-xl text-purple-400 shadow-lg shadow-purple-950/50">
            <Zap className="w-7 h-7 animate-pulse text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                ЭМИ/СВЧ Генератор Перехвата Роя (HPM Counter-UAS)
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full">
                50-100 МВт СВЧ-Импульс
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl">
              Моделирование высокомощного микроволнового генератора (Виркатор / Релятивистский Магнетрон) на борту БПЛА-охотника.
              Бесконтактный прожиг полупроводниковых кристаллов (MOSFET/FPGA gate oxide burnout) и срыв роевой атаки FPV дронов.
            </p>
          </div>
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEmitting(!isEmitting)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md ${
              isEmitting
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-400/50 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>{isEmitting ? 'СВЧ ИЗЛУЧЕНИЕ ВКЛ' : 'ИЗЛУЧАТЕЛЬ ВЫКЛ'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => initSwarm(swarmPreset)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preset Swarm Selector */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-900/80 rounded-xl border border-slate-800">
        <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mr-2">
          <Target className="w-4 h-4 text-purple-400" /> Конфигурация Целей Роя:
        </span>
        {[
          { id: 'fpv_saturation', label: '24x FPV Камикадзе (Плотный Рой, 10 dB)', icon: Flame },
          { id: 'dispersed_recon', label: '12x Разведчики-Гексакоптеры (22 dB)', icon: Eye },
          { id: 'heavy_armored', label: '8x Тяжелые Экранированные БПЛА (32 dB)', icon: ShieldAlert },
        ].map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSwarmPreset(p.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              swarmPreset === p.id
                ? 'bg-purple-600 text-white shadow-md ring-1 ring-purple-400'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <p.icon className="w-3.5 h-3.5" />
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {/* Main Grid: Tactical Canvas & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tactical Canvas 2D */}
        <div className="lg:col-span-8 flex flex-col gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Crosshair className="w-4 h-4 text-purple-400" />
              <span>Тактический Радар-План СВЧ Перехвата (450м x 300м)</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-amber-400 font-bold">Импульсов: {pulseCount.toLocaleString()}</span>
              <span className="text-rose-400 font-bold">
                Уничтожено: {destroyedCount} / {dronesRef.current.length} (
                {dronesRef.current.length > 0
                  ? Math.round((destroyedCount / dronesRef.current.length) * 100)
                  : 0}
                %)
              </span>
            </div>
          </div>

          <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
            <canvas ref={canvasRef} width={740} height={380} className="w-full h-auto block" />
            <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded border border-slate-700 text-[10px] text-slate-300 font-mono">
              R_lethal (&gt;5 кВ/м): <span className="text-rose-400 font-bold">{physics.rLethal_m} м</span> |
              Диаграмма: <span className="text-cyan-400 font-bold">{beamApertureDeg}°</span> |
              Наведение: <span className="text-amber-400 font-bold">{aimAngleDeg}°</span>
            </div>
          </div>

          {/* Real-time slider for Emitter Direction */}
          <div className="flex items-center gap-4 pt-2">
            <span className="text-xs text-slate-400 whitespace-nowrap font-medium flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-cyan-400" /> Азимут Наведения АФАР (°):
            </span>
            <input
              type="range"
              min={-45}
              max={45}
              step={1}
              value={aimAngleDeg}
              onChange={(e) => setAimAngleDeg(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <span className="text-xs font-mono text-purple-300 font-bold w-12 text-right">{aimAngleDeg}°</span>
          </div>
        </div>

        {/* Physics & Parameters Panel */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" /> Параметры СВЧ Излучателя
            </h3>

            {/* Peak Power Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Пиковая Мощность (P_peak)</span>
                <span className="font-mono text-amber-400 font-bold">{peakPower_MW} МВт</span>
              </div>
              <input
                type="range"
                min={5}
                max={150}
                step={5}
                value={peakPower_MW}
                onChange={(e) => setPeakPower_MW(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Pulse Width Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Длительность Импульса (τ)</span>
                <span className="font-mono text-purple-400 font-bold">{pulseWidth_ns} нс</span>
              </div>
              <input
                type="range"
                min={20}
                max={500}
                step={10}
                value={pulseWidth_ns}
                onChange={(e) => setPulseWidth_ns(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
            </div>

            {/* PRF Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Частота Повторения (PRF)</span>
                <span className="font-mono text-cyan-400 font-bold">{prf_Hz} Гц</span>
              </div>
              <input
                type="range"
                min={50}
                max={2000}
                step={50}
                value={prf_Hz}
                onChange={(e) => setPrf_Hz(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Antenna Gain Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Коэффициент Усиления АФАР (G)</span>
                <span className="font-mono text-emerald-400 font-bold">{antennaGain_dBi} dBi</span>
              </div>
              <input
                type="range"
                min={18}
                max={36}
                step={1}
                value={antennaGain_dBi}
                onChange={(e) => setAntennaGain_dBi(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

            {/* Beam Aperture */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Ширина Главного Лепестка (θ_3dB)</span>
                <span className="font-mono text-rose-400 font-bold">{beamApertureDeg}°</span>
              </div>
              <input
                type="range"
                min={6}
                max={30}
                step={1}
                value={beamApertureDeg}
                onChange={(e) => setBeamApertureDeg(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
              />
            </div>
          </div>

          {/* Quick Metrics Badge Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Эквивалент ERP</div>
              <div className="text-lg font-black text-amber-400 font-mono mt-0.5">{physics.erp_MW} ГВт</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Энергия Импульса</div>
              <div className="text-lg font-black text-purple-400 font-mono mt-0.5">{physics.pulseEnergy_J} Дж</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Поле на 50 м</div>
              <div className="text-lg font-black text-rose-400 font-mono mt-0.5">{physics.fieldAt50m_kVm} кВ/м</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Поле на 150 м</div>
              <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">{physics.fieldAt150m_kVm} кВ/м</div>
            </div>
          </div>
        </div>
      </div>

      {/* Field Intensity vs Range Recharts Graph */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Напряженность Электромагнитного Поля E (кВ/м) в Зависимости от Дистанции (м)</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Порог пробоя CMOS: 5.0 кВ/м | Экранированный FPGA: 25.0 кВ/м
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rangeFieldData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="range_m"
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                label={{ value: 'Дистанция до цели (м)', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 11 }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                label={{ value: 'E (кВ/м)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="current_kV_m" stroke="#38bdf8" strokeWidth={3} name="Текущее Поле (МВт)" />
              <Line type="monotone" dataKey="ref_10MW_kV_m" stroke="#a855f7" strokeDasharray="3 3" name="Ориентир 10 МВт" />
              <Line type="monotone" dataKey="ref_100MW_kV_m" stroke="#f59e0b" strokeDasharray="3 3" name="Ориентир 100 МВт" />
              <Line type="monotone" dataKey="cmos_threshold_kV_m" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" name="Порог выгорания CMOS (5 кВ/м)" />
              <Line type="monotone" dataKey="fpga_hardened_kV_m" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="Порог экранированного БПЛА (25 кВ/м)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
