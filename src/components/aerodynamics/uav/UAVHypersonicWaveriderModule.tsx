// ============================================================================
// UAV Hypersonic Waverider & High-Mach Supersonic Cruise Aerodynamics Module
// Shock-Wave Compression Lift, Fay-Riddell Aerothermal Heat Flux & Scramjet Shock-on-Lip
// ============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Flame,
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
  Radio,
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

export interface HypersonicPreset {
  id: string;
  name: string;
  machNumber: number;
  altitudeKm: number;
  noseRadiusMm: number;
  leadingEdgeSweepDeg: number;
  waveriderSpanM: number;
  lengthM: number;
  description: string;
}

export const HYPERSONIC_PRESETS: HypersonicPreset[] = [
  {
    id: 'waverider_hypersonic_glide_uav',
    name: 'Гиперзвуковой Глайдер-Вейврайдер (Mach 6.5, 32 км, Нос 15мм)',
    machNumber: 6.5,
    altitudeKm: 32,
    noseRadiusMm: 15,
    leadingEdgeSweepDeg: 76,
    waveriderSpanM: 2.2,
    lengthM: 4.8,
    description: 'Несущий конический ударный слой (Osculating Cones), высокое аэродинамическое качество L/D > 4.2 на гиперзвуке.',
  },
  {
    id: 'scramjet_cruise_recon_uav',
    name: 'ГПВРД-БПЛА Разведчик (Scramjet Cruise, Mach 5.2, 26 км)',
    machNumber: 5.2,
    altitudeKm: 26,
    noseRadiusMm: 22,
    leadingEdgeSweepDeg: 70,
    waveriderSpanM: 2.8,
    lengthM: 6.2,
    description: 'Интеграция воздухозаборника ГПВРД с геометрией носовой ударной волны (Shock-on-Lip) для максимального сжатия воздуха.',
  },
  {
    id: 'supersonic_dash_strike_uav',
    name: 'Сверхзвуковой Прорывной БПЛА (Supercruise Mach 2.4, 16 км)',
    machNumber: 2.4,
    altitudeKm: 16,
    noseRadiusMm: 45,
    leadingEdgeSweepDeg: 58,
    waveriderSpanM: 4.5,
    lengthM: 8.5,
    description: 'Длительный бесфорсажный сверхзвуковой крейсерский полет с оптимизацией волнового сопротивления по правилу площадей.',
  },
];

export const UAVHypersonicWaveriderModule: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [machNumber, setMachNumber] = useState<number>(6.5); // Mach 2.0 to 9.0
  const [altitudeKm, setAltitudeKm] = useState<number>(30); // 12 to 50 km
  const [noseRadiusMm, setNoseRadiusMm] = useState<number>(18); // 5 to 60 mm
  const [angleOfAttackDeg, setAngleOfAttackDeg] = useState<number>(4.0); // 0 to 14 deg
  const [leadingEdgeSweepDeg, setLeadingEdgeSweepDeg] = useState<number>(75); // 50 to 82 deg

  // Simulation & Animation
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [animTick, setAnimTick] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const preset = HYPERSONIC_PRESETS[selectedPresetIdx];

  // Mathematical Aerodynamics, Aerothermodynamics & Shock Physics
  const calculations = useMemo(() => {
    // US Standard Atmosphere 1976 Model
    const altM = altitudeKm * 1000;
    let T_K = 288.15 - 0.0065 * altM;
    let p_Pa = 101325 * Math.pow(1 - 0.0065 * altM / 288.15, 5.2561);
    if (altitudeKm > 11 && altitudeKm <= 20) {
      T_K = 216.65;
      p_Pa = 22632 * Math.exp(-9.81 * (altM - 11000) / (287.05 * 216.65));
    } else if (altitudeKm > 20 && altitudeKm <= 32) {
      T_K = 216.65 + 0.001 * (altM - 20000);
      p_Pa = 5474.9 * Math.pow(216.65 / T_K, 34.163);
    } else if (altitudeKm > 32) {
      T_K = 228.65 + 0.0028 * (altM - 32000);
      p_Pa = 868.02 * Math.pow(228.65 / T_K, 12.201);
    }

    const rhoAir = p_Pa / (287.05 * T_K);
    const speedOfSound = Math.sqrt(1.4 * 287.05 * T_K);
    const velocityMs = machNumber * speedOfSound;
    const dynamicPressureKPa = (0.5 * rhoAir * Math.pow(velocityMs, 2)) / 1000;

    // Stagnation Temperature (Total Temperature across normal shock):
    // T0 = T_inf * (1 + (gamma-1)/2 * M^2)
    const stagnationTempK = T_K * (1 + 0.2 * Math.pow(machNumber, 2));

    // Fay-Riddell Stagnation Point Convective Heat Flux (W/m^2 & kW/m^2):
    // q_dot = 1.83e-4 * sqrt(rho / R_nose) * V^3
    const rnMeter = Math.max(0.005, noseRadiusMm / 1000);
    const stagnationHeatFluxKWm2 = (1.83e-4 * Math.sqrt(rhoAir / rnMeter) * Math.pow(velocityMs, 3)) / 1000;

    // Oblique Shock Angle beta for Wedge / Waverider:
    // theta = AoA + wedge_half_angle (approx 8 deg)
    const wedgeDeflectionRad = ((8.0 + angleOfAttackDeg) * Math.PI) / 180;
    // Approximated shock angle beta
    const machAngleRad = Math.asin(1 / machNumber);
    const shockAngleRad = machAngleRad + wedgeDeflectionRad * 0.78;
    const shockAngleDeg = (shockAngleRad * 180) / Math.PI;

    // Waverider Shock-Compression Lift-to-Drag Ratio (L/D):
    // Higher sweep & proper shock attachment retains pressure under the lower surface.
    const waveriderAttachmentFactor = Math.cos(Math.abs(shockAngleDeg - (90 - leadingEdgeSweepDeg)) * (Math.PI / 180));
    const idealLiftCoefficient = 0.12 + 0.045 * angleOfAttackDeg * Math.pow(waveriderAttachmentFactor, 1.5);
    const waveDragCoefficient = 0.015 + 0.022 * Math.pow(wedgeDeflectionRad, 2) + (0.012 * (noseRadiusMm / 20));
    const liftToDragRatio = Math.max(1.5, Math.min(6.5, idealLiftCoefficient / waveDragCoefficient));

    // Plasma Sheath Ionization & Telemetry Blackout:
    // Occurs when T0 > 1800K and M > 5.5 at alt > 25km
    const isPlasmaBlackout = stagnationTempK > 1850 && machNumber > 5.2 && altitudeKm > 22;

    // Scramjet Shock-on-Lip Status:
    // In design Mach, oblique shock lands exactly on inlet lip
    const shockOnLipMarginPercent = Math.abs(machNumber - 5.5) * 18;
    const isShockOnLipOptimal = shockOnLipMarginPercent < 15;

    // Mach number sweep data for chart
    const machSweepData = [];
    for (let m = 2.0; m <= 9.0; m += 0.5) {
      const v = m * speedOfSound;
      const t0 = T_K * (1 + 0.2 * Math.pow(m, 2));
      const q = (1.83e-4 * Math.sqrt(rhoAir / rnMeter) * Math.pow(v, 3)) / 1000;
      const ld = Math.max(1.8, 6.2 - m * 0.38);
      machSweepData.push({
        mach: m,
        heatFluxKW: parseFloat(q.toFixed(0)),
        stagnationTempC: parseFloat((t0 - 273.15).toFixed(0)),
        liftToDrag: parseFloat(ld.toFixed(2)),
      });
    }

    return {
      rhoAir,
      velocityMs,
      dynamicPressureKPa,
      stagnationTempK,
      stagnationTempC: stagnationTempK - 273.15,
      stagnationHeatFluxKWm2,
      shockAngleDeg,
      liftToDragRatio,
      isPlasmaBlackout,
      isShockOnLipOptimal,
      shockOnLipMarginPercent,
      machSweepData,
    };
  }, [machNumber, altitudeKm, noseRadiusMm, angleOfAttackDeg, leadingEdgeSweepDeg]);

  // Simulation Animation Loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setAnimTick((prev) => (prev + 1) % 360);
    }, 40);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // 2D Hypersonic Shock Wave & Plasma Sheath Canvas Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Stratosphere / Mesosphere Dark Sky Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#030712');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const noseX = 140;
    const noseY = 180;
    const craftLen = 320;
    const craftHeight = 55;

    // High-Mach Shock Wave (Oblique Bow Shock)
    const shockRad = (calculations.shockAngleDeg * Math.PI) / 180;
    const shockLen = 380;
    const shockTopX = noseX + Math.cos(shockRad) * shockLen;
    const shockTopY = noseY - Math.sin(shockRad) * shockLen;
    const shockBotX = noseX + Math.cos(shockRad) * shockLen;
    const shockBotY = noseY + Math.sin(shockRad) * shockLen;

    // Shock Cone Glow
    ctx.strokeStyle = calculations.stagnationTempC > 1200 ? 'rgba(239, 68, 68, 0.85)' : 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(shockTopX, shockTopY);
    ctx.lineTo(noseX, noseY);
    ctx.lineTo(shockBotX, shockBotY);
    ctx.stroke();

    // Stagnation Point Plasma Glow / Heat Glow
    if (calculations.stagnationTempC > 600) {
      const glowIntensity = Math.min(45, (calculations.stagnationTempC / 2000) * 45);
      const heatGrad = ctx.createRadialGradient(noseX, noseY, 2, noseX, noseY, glowIntensity);
      heatGrad.addColorStop(0, '#ffffff');
      heatGrad.addColorStop(0.3, '#f59e0b');
      heatGrad.addColorStop(0.7, '#ef4444');
      heatGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = heatGrad;
      ctx.beginPath();
      ctx.arc(noseX, noseY, glowIntensity, 0, Math.PI * 2);
      ctx.fill();
    }

    // Waverider Vehicle Contour (Side Profile)
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Blunted nose arc
    const rPix = Math.max(3, noseRadiusMm * 0.4);
    ctx.arc(noseX + rPix, noseY, rPix, Math.PI * 0.5, Math.PI * 1.5);
    // Upper compression surface
    ctx.lineTo(noseX + craftLen, noseY - craftHeight * 0.6);
    // Trailing base
    ctx.lineTo(noseX + craftLen, noseY + craftHeight * 0.8);
    // Lower compression ramp (Waverider ride surface)
    ctx.lineTo(noseX + rPix, noseY + rPix);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Scramjet Lower Cowl Lip
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(noseX + 180, noseY + 12, 60, 18);

    // Streamlines compressed under waverider belly
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const yOffset = 15 + i * 12;
      ctx.beginPath();
      ctx.moveTo(noseX - 80, noseY + yOffset + 20);
      ctx.lineTo(noseX + craftLen + 40, noseY + yOffset);
      ctx.stroke();
    }

    // Plasma Ionization Sheath Particles when Blackout active
    if (calculations.isPlasmaBlackout) {
      ctx.fillStyle = '#a855f7';
      for (let p = 0; p < 24; p++) {
        const px = noseX + ((p * 17 + animTick * 7) % (craftLen + 50));
        const py = noseY - 20 + ((p * 23) % 45);
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // HUD Text
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px monospace';
    ctx.fillText(`FLIGHT MACH: M ${machNumber.toFixed(2)} (${calculations.velocityMs.toFixed(0)} m/s, ${(calculations.velocityMs * 3.6).toFixed(0)} km/h) | ALTITUDE: ${altitudeKm} km`, 14, 22);
    ctx.fillText(`STAGNATION TEMP T0: ${calculations.stagnationTempC.toFixed(0)} °C (${calculations.stagnationTempK.toFixed(0)} K) | HEAT FLUX: ${calculations.stagnationHeatFluxKWm2.toFixed(0)} kW/m²`, 14, 38);
    ctx.fillStyle = calculations.isPlasmaBlackout ? '#ec4899' : '#34d399';
    ctx.fillText(`SHOCK ANGLE beta: ${calculations.shockAngleDeg.toFixed(1)}° | L/D RATIO: ${calculations.liftToDragRatio.toFixed(2)} | TELEMETRY: ${calculations.isPlasmaBlackout ? 'PLASMA BLACKOUT (IONIZED)' : 'CLEAR RF LINK'}`, 14, 54);
  }, [animTick, machNumber, altitudeKm, noseRadiusMm, calculations]);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-rose-900/50 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-rose-500/20 to-amber-500/20 rounded-2xl border border-rose-500/40 text-rose-400">
              <Flame className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Гиперзвуковой Вейврайдер, Scramjet & Тепловые Потоки БПЛА</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  Hypersonic Waverider & Aerothermodynamics
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Сжатие ударного слоя (Waverider Ride), конвективный тепловой поток Фэя-Ридделла ($q \propto V^3$), притупление носка и плазменный блэкаут.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Пауза' : 'Пуск'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMachNumber(6.5);
                setAltitudeKm(30);
                setNoseRadiusMm(18);
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
          {HYPERSONIC_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedPresetIdx(idx);
                setMachNumber(p.machNumber);
                setAltitudeKm(p.altitudeKm);
                setNoseRadiusMm(p.noseRadiusMm);
                setLeadingEdgeSweepDeg(p.leadingEdgeSweepDeg);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer text-xs flex flex-col justify-between gap-1.5 ${
                selectedPresetIdx === idx
                  ? 'bg-gradient-to-br from-rose-950/90 to-slate-900 border-rose-400 text-white shadow-lg ring-1 ring-rose-400/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <div className="font-bold text-rose-300 flex items-center justify-between">
                <span>{p.name.split('(')[0]}</span>
                {selectedPresetIdx === idx && <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />}
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
            <span>Число Маха & Скорость</span>
            <Gauge className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">
            M {machNumber.toFixed(1)}
          </div>
          <div className="text-[10px] text-slate-500">{(calculations.velocityMs * 3.6).toFixed(0)} км/ч ({calculations.velocityMs.toFixed(0)} м/с)</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Температура Торможения T0</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {calculations.stagnationTempC.toFixed(0)} <span className="text-xs text-slate-400">°C</span>
          </div>
          <div className="text-[10px] text-slate-500">{calculations.stagnationTempK.toFixed(0)} K (Носовой кок)</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Тепловой Поток Fay-Riddell</span>
            <Zap className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-black text-orange-400">
            {calculations.stagnationHeatFluxKWm2.toFixed(0)} <span className="text-xs text-slate-400">кВт/м²</span>
          </div>
          <div className="text-[10px] text-slate-500">Конвективный нагрев</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Аэрокачество L/D</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {calculations.liftToDragRatio.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500">Waverider Ride Effect</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Угол Ударной Волны beta</span>
            <Wind className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            {calculations.shockAngleDeg.toFixed(1)}°
          </div>
          <div className="text-[10px] text-slate-500">Косой скачок уплотнения</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Плазменный Блэкаут</span>
            <Radio className="w-4 h-4 text-purple-400" />
          </div>
          <div className={`text-xl font-black ${calculations.isPlasmaBlackout ? 'text-pink-400' : 'text-emerald-400'}`}>
            {calculations.isPlasmaBlackout ? 'ИОНИЗАЦИЯ' : 'НОРМА (RF OK)'}
          </div>
          <div className="text-[10px] text-slate-500">{calculations.isPlasmaBlackout ? 'Затухание радиосигнала' : 'Телеметрия стабильна'}</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-rose-400" />
              <span>Параметры Гиперзвукового Полета & Геометрии</span>
            </h3>

            {/* Mach Number */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Число Маха Полета (Mach)</span>
                <span className="text-rose-300 font-bold">M {machNumber.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="9.0"
                step="0.1"
                value={machNumber}
                onChange={(e) => setMachNumber(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
              />
            </div>

            {/* Altitude */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Высота Полета H (Стратосфера)</span>
                <span className="text-cyan-300 font-bold">{altitudeKm} км</span>
              </div>
              <input
                type="range"
                min="12"
                max="45"
                step="1"
                value={altitudeKm}
                onChange={(e) => setAltitudeKm(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Nose Radius */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Радиус Притупления Носка R_nose</span>
                <span className="text-amber-300 font-bold">{noseRadiusMm} мм</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="1"
                value={noseRadiusMm}
                onChange={(e) => setNoseRadiusMm(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Angle of Attack */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Угол Атаки Вейврайдера (AoA)</span>
                <span className="text-teal-300 font-bold">{angleOfAttackDeg.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="12.0"
                step="0.5"
                value={angleOfAttackDeg}
                onChange={(e) => setAngleOfAttackDeg(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
            </div>

            {/* Leading Edge Sweep */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Стреловидность Передней Кромки χ</span>
                <span className="text-indigo-300 font-bold">{leadingEdgeSweepDeg}°</span>
              </div>
              <input
                type="range"
                min="55"
                max="82"
                step="1"
                value={leadingEdgeSweepDeg}
                onChange={(e) => setLeadingEdgeSweepDeg(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* Right 2D Animated Shock Viewport & Mach vs Heat Flux Chart (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Animated 2D Viewport */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-400" />
                <span>2D-Визуализация Скачка Уплотнения, Нагрева & Плазмы</span>
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-rose-300 border border-slate-700">
                Oblique Shock Wave & TPS
              </span>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-rose-900/40 aspect-[16/9] w-full bg-slate-950">
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Mach Sweep vs Heat Flux & Stagnation Temperature Chart */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span>Тепловой Поток (кВт/м²) & Температура Т0 (°C) от Числа Маха</span>
              </h3>
              <FullscreenGraphButton
                domain="uav_guidance"
                title="Аэротермодинамика гиперзвукового полета и тепловые режимы ТЗП БПЛА"
              />
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calculations.machSweepData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="mach" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Число Маха (M)', position: 'insideBottom', offset: -5 }} />
                  <YAxis yAxisId="left" stroke="#f59e0b" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#ef4444" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line yAxisId="left" type="monotone" dataKey="heatFluxKW" name="Тепловой поток (кВт/м²)" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="stagnationTempC" name="Температура торможения (°C)" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line yAxisId="left" type="monotone" dataKey="liftToDrag" name="L/D (качество x100)" stroke="#10b981" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
