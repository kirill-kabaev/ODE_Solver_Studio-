// ============================================================================
// UAV Anti-Radiation Seeker & SEAD Air Defense Suppression Module
// Passive RF Interferometry, Monopulse Angle-of-Arrival (AoA), TDoA Triangulation & ECCM
// ============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Radio,
  Crosshair,
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
  Target,
  Wifi,
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

export interface SeekerPreset {
  id: string;
  name: string;
  targetRadarType: string;
  radarFreqGHz: number;
  radarPeakPowerKW: number;
  antennaBaselineM: number; // Baseline between interferometer antennas
  missileSpeedMs: number;
  seekerSensitivityDBm: number;
  description: string;
}

export const SEEKER_PRESETS: SeekerPreset[] = [
  {
    id: 'anti_sam_radar_homing',
    name: 'ПРР-БПЛА против РЛС ЗРК (Patriot/С-400, X-Band 9.2 ГГц, 150 кВт)',
    targetRadarType: 'РЛС Подсвета и Наведения ЗРК (X-Band)',
    radarFreqGHz: 9.2,
    radarPeakPowerKW: 150,
    antennaBaselineM: 0.18,
    missileSpeedMs: 280,
    seekerSensitivityDBm: -95,
    description: 'Интерферометрическая 4-элементная фазовая ГСН с мгновенным пеленгованием и запоминанием точки излучения при радиомолчании.',
  },
  {
    id: 'early_warning_surveillance_kill',
    name: 'Охотник за РЛС РЛО / ДРЛО (S-Band 3.1 ГГц, 400 кВт, 180 км)',
    targetRadarType: 'Обзорный Радар Раннего Обнаружения (S-Band)',
    radarFreqGHz: 3.1,
    radarPeakPowerKW: 400,
    antennaBaselineM: 0.35,
    missileSpeedMs: 190,
    seekerSensitivityDBm: -105,
    description: 'Сверхширокополосная пеленгационная решетка для вскрытия и поражения дежурных обзорных радиолокаторов на дальностях до 180 км.',
  },
  {
    id: 'counter_battery_mortar_radar',
    name: 'Барражирующий Дрон-Охотник на Контрбатарейные РЛС (Ku-Band 16 ГГц)',
    targetRadarType: 'Контрбатарейная РЛС разведки позиций (Ku-Band)',
    radarFreqGHz: 16.0,
    radarPeakPowerKW: 25,
    antennaBaselineM: 0.12,
    missileSpeedMs: 85,
    seekerSensitivityDBm: -88,
    description: 'Компактная фазовая микрополосковая антенна для высокоточного пикирования на малогабаритные контрбатарейные радары.',
  },
];

export const UAVMIMOAntiRadiationSeekerModule: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [rangeToRadarKm, setRangeToRadarKm] = useState<number>(35); // 1 to 120 km
  const [radarBearingDeg, setRadarBearingDeg] = useState<number>(14); // -45 to +45 deg off-boresight
  const [isRadarEmitting, setIsRadarEmitting] = useState<boolean>(true); // Active emission vs Shut-off / Blink decoy
  const [radarBlinkPeriodSec, setRadarBlinkPeriodSec] = useState<number>(4.0); // Radar blinking ECCM
  const [seekerPhaseNoiseDeg, setSeekerPhaseNoiseDeg] = useState<number>(2.5); // Interferometer phase error

  // Simulation & Animation
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTick, setSimTick] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const preset = SEEKER_PRESETS[selectedPresetIdx];

  // Mathematical Passive RF Interferometer & Friis Transmission Computations
  const calculations = useMemo(() => {
    const c = 3e8; // speed of light (m/s)
    const wavelengthM = c / (preset.radarFreqGHz * 1e9);

    // Free-Space One-Way Path Loss (Passive Seeker intercepts direct radar transmission):
    // Pr = (Pt * Gt * Gr * lambda^2) / ((4 * pi * R)^2)
    const radarGainDbi = 36; // Radar high-gain mainlobe
    const seekerGainDbi = 8;  // Broad-coverage seeker antenna
    const rangeM = Math.max(100, rangeToRadarKm * 1000);
    const pathLossDb = 20 * Math.log10((4 * Math.PI * rangeM) / wavelengthM);

    const ptDbm = 10 * Math.log10(preset.radarPeakPowerKW * 1e3 * 1e3); // kW to mW to dBm
    const receivedPowerDbm = isRadarEmitting 
      ? ptDbm + radarGainDbi + seekerGainDbi - pathLossDb
      : -130; // Noise floor when radar shuts down

    const isSignalDetected = receivedPowerDbm >= preset.seekerSensitivityDBm;
    const signalToNoiseDb = Math.max(0, receivedPowerDbm - preset.seekerSensitivityDBm);

    // Phase Interferometry Angle-of-Arrival (AoA):
    // Phase difference Delta_phi = (2 * pi * d / lambda) * sin(theta)
    const trueAngleRad = (radarBearingDeg * Math.PI) / 180;
    const theoreticalPhaseDiffDeg = ((2 * Math.PI * preset.antennaBaselineM) / wavelengthM) * Math.sin(trueAngleRad) * (180 / Math.PI);
    
    // Measured AoA with phase noise and SNR weighting
    const angleNoiseDeg = (seekerPhaseNoiseDeg / Math.max(1, Math.sqrt(signalToNoiseDb + 1))) * (Math.random() - 0.5) * 2;
    const measuredBearingDeg = isSignalDetected 
      ? radarBearingDeg + angleNoiseDeg
      : radarBearingDeg; // Locked onto INS memory track if radar shut down

    // Circular Error Probable (CEP) at Terminal Impact:
    // If radar continues emitting: CEP < 1.2m (RF home)
    // If radar shuts down at 20km: INS memory drift CEP ~ 0.05% of range
    const terminalCepMeters = isSignalDetected 
      ? Math.max(0.4, 0.8 + (rangeToRadarKm / 80) * 1.5)
      : Math.max(2.5, 0.0006 * rangeM);

    // Time to Impact
    const timeToImpactSec = rangeM / preset.missileSpeedMs;

    // Range sweep data for chart (Received Power dBm vs Distance)
    const rangeSweepData = [];
    for (let r = 100; r >= 2; r -= 5) {
      const rm = r * 1000;
      const pl = 20 * Math.log10((4 * Math.PI * rm) / wavelengthM);
      const prx = ptDbm + radarGainDbi + seekerGainDbi - pl;
      rangeSweepData.push({
        rangeKm: r,
        receivedPowerDbm: parseFloat(prx.toFixed(1)),
        sensitivityThreshold: preset.seekerSensitivityDBm,
        snrDb: parseFloat(Math.max(0, prx - preset.seekerSensitivityDBm).toFixed(1)),
      });
    }

    return {
      wavelengthM,
      receivedPowerDbm,
      isSignalDetected,
      signalToNoiseDb,
      theoreticalPhaseDiffDeg,
      measuredBearingDeg,
      terminalCepMeters,
      timeToImpactSec,
      rangeSweepData,
    };
  }, [preset, rangeToRadarKm, radarBearingDeg, isRadarEmitting, seekerPhaseNoiseDeg]);

  // Simulation Clock Tick (Radar Blinking ECCM mode)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSimTick((prev) => (prev + 1) % 500);
    }, 40);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // 2D RF Phase Interferometer & Terminal Tracking Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Radar Screen Dark Slate Background
    ctx.fillStyle = '#040d1a';
    ctx.fillRect(0, 0, w, h);

    // Polar Grid Reticle
    const cx = w / 2;
    const cy = h / 2 + 10;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    for (let r = 40; r <= 160; r += 40) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Crosshair axes
    ctx.beginPath();
    ctx.moveTo(cx, cy - 160);
    ctx.lineTo(cx, cy + 160);
    ctx.moveTo(cx - 180, cy);
    ctx.lineTo(cx + 180, cy);
    ctx.stroke();

    // Radar Target Position on Scope
    const bearingRad = ((calculations.measuredBearingDeg - 90) * Math.PI) / 180;
    const radarDistPix = Math.min(150, (rangeToRadarKm / 100) * 140 + 20);
    const rx = cx + Math.cos(bearingRad) * radarDistPix;
    const ry = cy + Math.sin(bearingRad) * radarDistPix;

    // Emitting Radar Wave Pulses
    if (isRadarEmitting) {
      const pulsePhase = (simTick * 4) % 60;
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rx, ry, pulsePhase, 0, Math.PI * 2);
      ctx.stroke();

      // Radar Icon
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(rx, ry, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Memory Track Marker (Dotted square)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx - 8, ry - 8, 16, 16);
      ctx.fillStyle = '#f59e0b';
      ctx.font = '10px monospace';
      ctx.fillText('INS MEMORY TRACK', rx + 12, ry + 4);
    }

    // Seeker UAV at Center with 4-Element Interferometer Baselines
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();

    // Interferometer Antenna Elements
    const dPix = 16;
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(cx - dPix - 2, cy - 2, 4, 4); // Ant 1
    ctx.fillRect(cx + dPix - 2, cy - 2, 4, 4); // Ant 2
    ctx.fillRect(cx - 2, cy - dPix - 2, 4, 4); // Ant 3
    ctx.fillRect(cx - 2, cy + dPix - 2, 4, 4); // Ant 4

    // Bearing Strobe Line (Angle of Arrival line)
    ctx.strokeStyle = calculations.isSignalDetected ? '#22d3ee' : '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(rx, ry);
    ctx.stroke();
    ctx.setLineDash([]);

    // Seeker Lock Box on Target
    if (calculations.isSignalDetected) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx - 12, ry - 12, 24, 24);
      // Lead angle brackets
      ctx.beginPath();
      ctx.moveTo(rx - 16, ry);
      ctx.lineTo(rx + 16, ry);
      ctx.moveTo(rx, ry - 16);
      ctx.lineTo(rx, ry + 16);
      ctx.stroke();
    }

    // HUD Status
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px monospace';
    ctx.fillText(`TARGET: ${preset.targetRadarType.toUpperCase()}`, 14, 22);
    ctx.fillText(`FREQ: ${preset.radarFreqGHz} GHz (lambda = ${(calculations.wavelengthM * 100).toFixed(1)} cm) | RANGE: ${rangeToRadarKm} km | BEARING: ${calculations.measuredBearingDeg.toFixed(1)}°`, 14, 38);
    ctx.fillStyle = calculations.isSignalDetected ? '#34d399' : '#f59e0b';
    ctx.fillText(`SEEKER: ${calculations.isSignalDetected ? `RF HOMING LOCK (Prx = ${calculations.receivedPowerDbm.toFixed(1)} dBm, SNR = ${calculations.signalToNoiseDb.toFixed(1)} dB)` : 'RADAR OFF - INS TERMINAL DRIFT MEMORY'} | CEP: ±${calculations.terminalCepMeters.toFixed(1)} m`, 14, 54);
  }, [simTick, rangeToRadarKm, isRadarEmitting, calculations, preset]);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-cyan-900/50 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl border border-cyan-500/40 text-cyan-400">
              <Crosshair className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Противорадиолокационная ГСН БПЛА & Прорыв ПВО (SEAD)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Anti-Radiation Seeker & ECCM
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Пассивная фазовая интерферометрия (MIMO AoA), пеленгация источников РЛС ЗРК, память точки наведения при радиомолчании и расчет КВО (CEP).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Пауза' : 'Пуск'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRangeToRadarKm(35);
                setRadarBearingDeg(14);
                setIsRadarEmitting(true);
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
          {SEEKER_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedPresetIdx(idx);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer text-xs flex flex-col justify-between gap-1.5 ${
                selectedPresetIdx === idx
                  ? 'bg-gradient-to-br from-cyan-950/90 to-slate-900 border-cyan-400 text-white shadow-lg ring-1 ring-cyan-400/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <div className="font-bold text-cyan-300 flex items-center justify-between">
                <span>{p.name.split('(')[0]}</span>
                {selectedPresetIdx === idx && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
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
            <span>Мощность Сигнала ГСН</span>
            <Wifi className="w-4 h-4 text-cyan-400" />
          </div>
          <div className={`text-2xl font-black ${calculations.isSignalDetected ? 'text-cyan-400' : 'text-slate-500'}`}>
            {calculations.receivedPowerDbm.toFixed(1)} <span className="text-xs text-slate-400">dBm</span>
          </div>
          <div className="text-[10px] text-slate-500">SNR: {calculations.signalToNoiseDb.toFixed(1)} dB</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Точность Пеленга (AoA)</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {calculations.measuredBearingDeg.toFixed(1)}°
          </div>
          <div className="text-[10px] text-slate-500">Фазовая интерферометрия</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>КВО Поражения (CEP)</span>
            <Crosshair className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            ±{calculations.terminalCepMeters.toFixed(1)} <span className="text-xs text-slate-400">м</span>
          </div>
          <div className="text-[10px] text-slate-500">{isRadarEmitting ? 'Прямое RF-наведение' : 'ИНС память цели'}</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Время Подлета</span>
            <Gauge className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {calculations.timeToImpactSec.toFixed(0)} <span className="text-xs text-slate-400">с</span>
          </div>
          <div className="text-[10px] text-slate-500">Скорость: {preset.missileSpeedMs} м/с</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Длина Волны РЛС lambda</span>
            <Radio className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            {(calculations.wavelengthM * 100).toFixed(1)} <span className="text-xs text-slate-400">см</span>
          </div>
          <div className="text-[10px] text-slate-500">{preset.radarFreqGHz} ГГц</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Режим Излучения</span>
            <Activity className="w-4 h-4 text-rose-400" />
          </div>
          <div className={`text-xl font-black ${isRadarEmitting ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isRadarEmitting ? 'ИЗЛУЧЕНИЕ' : 'МОЛЧАНИЕ (ECCM)'}
          </div>
          <div className="text-[10px] text-slate-500">{isRadarEmitting ? 'Непрерывный захват' : 'Память ИНС активна'}</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Параметры Перехвата & РЭП Противника</span>
            </h3>

            {/* Range to Radar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Дистанция до РЛС ЗРК R</span>
                <span className="text-cyan-300 font-bold">{rangeToRadarKm} км</span>
              </div>
              <input
                type="range"
                min="2"
                max="100"
                step="1"
                value={rangeToRadarKm}
                onChange={(e) => setRangeToRadarKm(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Radar Bearing */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Пеленг РЛС от Осевой Линии БПЛА</span>
                <span className="text-teal-300 font-bold">{radarBearingDeg}°</span>
              </div>
              <input
                type="range"
                min="-45"
                max="45"
                step="1"
                value={radarBearingDeg}
                onChange={(e) => setRadarBearingDeg(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
            </div>

            {/* Phase Noise */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Фазовая Нестабильность Интерферометра</span>
                <span className="text-amber-300 font-bold">{seekerPhaseNoiseDeg.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="8.0"
                step="0.5"
                value={seekerPhaseNoiseDeg}
                onChange={(e) => setSeekerPhaseNoiseDeg(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Toggle Radar Emission (Simulate ECCM Radar Turn-Off) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsRadarEmitting(!isRadarEmitting)}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                  isRadarEmitting
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>{isRadarEmitting ? 'Выключить РЛС ЗРК (Включить режим радиомолчания ECCM)' : 'Включить Излучение РЛС'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 2D Animated Scope & Range vs Power Chart (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Animated 2D Viewport */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                <span>2D-Индикатор Пеленгации & Фазовой Интерферометрии</span>
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                MIMO Interferometry Scope
              </span>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-cyan-900/40 aspect-[16/9] w-full bg-slate-950">
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Range vs Received Signal Strength Chart */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-teal-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-400" />
                <span>Уровень Сигнала на Входе ГСН (dBm) от Дальности (км)</span>
              </h3>
              <FullscreenGraphButton
                domain="uav_guidance"
                title="Уравнение радиолинии пассивной ГСН и порог чувствительности пеленгатора"
              />
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calculations.rangeSweepData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="rangeKm" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Дальность до РЛС (км)', position: 'insideBottom', offset: -5 }} />
                  <YAxis stroke="#38bdf8" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="receivedPowerDbm" name="Мощность на входе (dBm)" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="sensitivityThreshold" name="Порог чувствительности (-95 dBm)" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
