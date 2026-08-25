// ============================================================================
// UAV Solar High-Altitude Pseudo-Satellite (HAPS) & Atmospheric Satellite Module
// 24h/48h Stratospheric Solar-Battery Energy Balance, Low Density Cruise & Station Keeping
// ============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Sun,
  BatteryCharging,
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
  Globe,
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

export interface HAPSPreset {
  id: string;
  name: string;
  wingspanM: number;
  wingAreaM2: number;
  totalMassKg: number;
  solarCellEfficiency: number; // 22 to 32 % (GaAs / Silicon)
  batterySpecificEnergyWhPerKg: number; // 350 to 500 Wh/kg (Li-S, Silicon Anode)
  batteryMassFraction: number; // 0.35 to 0.50
  payloadPowerW: number;
  description: string;
}

export const HAPS_PRESETS: HAPSPreset[] = [
  {
    id: 'zephyr_style_ultralight',
    name: 'Стратосферный Псевдоспутник Сверхлегкого Класса (Размах 25м, 75кг)',
    wingspanM: 25.0,
    wingAreaM2: 32.0,
    totalMassKg: 75,
    solarCellEfficiency: 25,
    batterySpecificEnergyWhPerKg: 420,
    batteryMassFraction: 0.45,
    payloadPowerW: 65,
    description: 'Ультралегкий углепластиковый планер для круглогодичного барражирования на высоте 18–21 км.',
  },
  {
    id: 'heavy_payload_telecom_haps',
    name: 'Телекоммуникационный Псевдоспутник Связи 5G/6G (Размах 38м, 180кг)',
    wingspanM: 38.0,
    wingAreaM2: 58.0,
    totalMassKg: 180,
    solarCellEfficiency: 28,
    batterySpecificEnergyWhPerKg: 460,
    batteryMassFraction: 0.42,
    payloadPowerW: 320,
    description: 'Платформа регионального покрытия связью с активной фазированной антенной решеткой (АФАР).',
  },
  {
    id: 'arctic_surveillance_haps',
    name: 'Полярный Мониторинговый Псевдоспутник (Размах 30м, 110кг)',
    wingspanM: 30.0,
    wingAreaM2: 44.0,
    totalMassKg: 110,
    solarCellEfficiency: 30,
    batterySpecificEnergyWhPerKg: 400,
    batteryMassFraction: 0.48,
    payloadPowerW: 120,
    description: 'Оптимизирован для полетов в высоких широтах в условиях низкого угла возвышения солнца.',
  },
];

export const UAVSolarHAPSAtmosphericSatelliteModule: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [targetAltitudeKm, setTargetAltitudeKm] = useState<number>(19.5); // 16.0 to 22.0 km
  const [latitudeDeg, setLatitudeDeg] = useState<number>(35); // 0 to 75 deg N
  const [seasonDayOfYear, setSeasonDayOfYear] = useState<number>(172); // Summer solstice ~172, Equinox ~80, Winter ~355
  const [stratosphericWindMs, setStratosphericWindMs] = useState<number>(12); // 4 to 30 m/s
  const [solarDegradationPct, setSolarDegradationPct] = useState<number>(5); // 0 to 25 %

  // Simulation & Animation
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simHour, setSimHour] = useState<number>(12); // 0 to 24 hours
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const preset = HAPS_PRESETS[selectedPresetIdx];

  // Mathematical Stratospheric & 24h Day-Night Solar Calculations
  const calculations = useMemo(() => {
    const g = 9.81;

    // US Standard Atmosphere at altitude H (16 to 22 km)
    // T = 216.65 K (isothermal layer), P = P0 * exp(-g*h/(R*T)), rho = P / (R*T)
    const altitudeM = targetAltitudeKm * 1000;
    const p11 = 22632; // Pa at 11 km
    const rhoAir = 0.3639 * Math.exp(-(altitudeM - 11000) / 6340); // approx stratospheric density ~0.088 kg/m3 at 20km

    // Battery System Parameters
    const batteryMassKg = preset.totalMassKg * preset.batteryMassFraction;
    const totalBatteryCapacityWh = batteryMassKg * preset.batterySpecificEnergyWhPerKg;

    // Minimum Power Cruising Speed & Drag
    // V_min_power = sqrt( (2*m*g) / (rho * S * sqrt(3 * pi * AR * e * CD0)) )
    const wingAreaS = preset.wingAreaM2;
    const aspectRatio = Math.pow(preset.wingspanM, 2) / wingAreaS;
    const cd0 = 0.019;
    const oswaldE = 0.92;

    const liftReqN = preset.totalMassKg * g;
    // Cruise at optimal CL for max endurance (CL^1.5 / CD max): CL_opt = sqrt(3 * pi * AR * e * CD0)
    const optimalCL = Math.min(1.4, Math.sqrt(3 * Math.PI * aspectRatio * oswaldE * cd0));
    const cruiseAirspeedMs = Math.sqrt((2 * liftReqN) / (rhoAir * wingAreaS * optimalCL));
    const inducedCD = Math.pow(optimalCL, 2) / (Math.PI * aspectRatio * oswaldE);
    const totalCD = cd0 + inducedCD;
    const totalDragN = totalCD * 0.5 * rhoAir * Math.pow(cruiseAirspeedMs, 2) * wingAreaS;

    // Propulsion Power Required (with 82% propulsive efficiency)
    const propulsiveEfficiency = 0.82;
    const flightMotorPowerW = (totalDragN * cruiseAirspeedMs) / propulsiveEfficiency;
    const totalDronePowerDemandW = flightMotorPowerW + preset.payloadPowerW + 25; // avionics 25W

    // 24-Hour Solar Simulation Profile
    // Solar Declination delta = 23.45 * sin(360/365 * (284 + dayOfYear))
    const declinationRad = (23.45 * Math.sin(((2 * Math.PI) / 365) * (284 + seasonDayOfYear)) * Math.PI) / 180;
    const latRad = (latitudeDeg * Math.PI) / 180;

    let batteryEnergyStateWh = totalBatteryCapacityWh * 0.85; // initial SoC at midnight or 00:00
    const profile24h = [];
    let netDailyEnergyDeficit = false;
    let minSocObservedPct = 100;
    let peakSolarHarvestW = 0;

    for (let h = 0; h < 24; h += 0.5) {
      const hourAngleRad = ((h - 12) * 15 * Math.PI) / 180;
      // Solar elevation sin(alpha)
      const sinSolarElev = Math.sin(latRad) * Math.sin(declinationRad) + Math.cos(latRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
      const solarElevationDeg = Math.asin(Math.max(-1, Math.min(1, sinSolarElev))) * (180 / Math.PI);

      // Stratospheric Extraterrestrial Solar Constant G0 ~ 1361 W/m2
      let solarIrradianceWpm2 = 0;
      if (solarElevationDeg > 0) {
        solarIrradianceWpm2 = 1361 * Math.sin((solarElevationDeg * Math.PI) / 180);
      }

      // Solar Panels Harvest (top surface coverage ~85% of wing)
      const solarAreaM2 = wingAreaS * 0.85;
      const effectivePanelEff = (preset.solarCellEfficiency / 100) * (1 - solarDegradationPct / 100) * 0.95; // MPPT 95%
      const solarHarvestPowerW = solarIrradianceWpm2 * solarAreaM2 * effectivePanelEff;

      if (solarHarvestPowerW > peakSolarHarvestW) peakSolarHarvestW = solarHarvestPowerW;

      // Net Power Flow: P_net = P_solar - P_demand
      const netPowerW = solarHarvestPowerW - totalDronePowerDemandW;
      const deltaEnergyWh = netPowerW * 0.5; // dt = 0.5h
      const chargeEfficiency = 0.93;

      if (deltaEnergyWh > 0) {
        batteryEnergyStateWh = Math.min(totalBatteryCapacityWh, batteryEnergyStateWh + deltaEnergyWh * chargeEfficiency);
      } else {
        batteryEnergyStateWh = Math.max(0, batteryEnergyStateWh + deltaEnergyWh);
      }

      const socPct = (batteryEnergyStateWh / totalBatteryCapacityWh) * 100;
      if (socPct < minSocObservedPct) minSocObservedPct = socPct;

      profile24h.push({
        hour: h,
        solarPowerW: parseFloat(solarHarvestPowerW.toFixed(0)),
        demandPowerW: parseFloat(totalDronePowerDemandW.toFixed(0)),
        batterySocPct: parseFloat(socPct.toFixed(1)),
        solarElevation: parseFloat(solarElevationDeg.toFixed(1)),
      });
    }

    if (minSocObservedPct <= 10) netDailyEnergyDeficit = true;

    // Station-Keeping Turning Radius & Loiter Drift
    const groundSpeedInWindMs = Math.max(1, cruiseAirspeedMs - stratosphericWindMs);
    const isStationKeepingCapable = cruiseAirspeedMs >= stratosphericWindMs * 1.15;

    return {
      rhoAir,
      batteryMassKg,
      totalBatteryCapacityWh,
      cruiseAirspeedMs,
      optimalCL,
      totalDragN,
      flightMotorPowerW,
      totalDronePowerDemandW,
      peakSolarHarvestW,
      minSocObservedPct,
      netDailyEnergyDeficit,
      groundSpeedInWindMs,
      isStationKeepingCapable,
      profile24h,
    };
  }, [preset, targetAltitudeKm, latitudeDeg, seasonDayOfYear, stratosphericWindMs, solarDegradationPct]);

  // Simulation Clock Tick (24h loop)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSimHour((prev) => (prev >= 23.9 ? 0 : prev + 0.1));
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // 2D Stratospheric Sun & HAPS Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Stratosphere Sky gradient based on current sim hour
    const isDay = simHour >= 6 && simHour <= 18;
    const dayProgress = Math.sin(((simHour - 6) / 12) * Math.PI);

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (isDay) {
      bgGrad.addColorStop(0, '#0c1b33');
      bgGrad.addColorStop(0.6, '#034078');
      bgGrad.addColorStop(1, '#1282a2');
    } else {
      bgGrad.addColorStop(0, '#020617');
      bgGrad.addColorStop(1, '#0f172a');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Earth Horizon Curve at 20km Altitude
    ctx.fillStyle = '#064e3b';
    ctx.beginPath();
    ctx.arc(w / 2, h + 900, 1020, 0, Math.PI * 2);
    ctx.fill();

    // Atmosphere Blue Glow Fringe
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(w / 2, h + 900, 1022, Math.PI * 1.35, Math.PI * 1.65);
    ctx.stroke();

    // Draw Stratospheric Sun if day
    if (isDay) {
      const sunX = (simHour / 24) * w;
      const sunY = h * 0.5 - dayProgress * (h * 0.35);

      const sunGrad = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 35);
      sunGrad.addColorStop(0, '#fef08a');
      sunGrad.addColorStop(0.4, 'rgba(250, 204, 21, 0.8)');
      sunGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 35, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Ultralight High-Aspect Ratio HAPS Glider
    const hapsX = w / 2;
    const hapsY = 120 + Math.sin(simHour * 2) * 6;

    ctx.save();
    ctx.translate(hapsX, hapsY);

    // Ultra-high Aspect Ratio Wing (Black solar panel sheen)
    ctx.fillStyle = '#090d16';
    ctx.fillRect(-140, -3, 280, 6);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(-140, -3, 280, 6);

    // Wing dihedral flex (aeroelastic bend)
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(-140, -3);
    ctx.lineTo(-140, -8);
    ctx.lineTo(-136, -3);
    ctx.moveTo(140, -3);
    ctx.lineTo(140, -8);
    ctx.lineTo(136, -3);
    ctx.fill();

    // Twin Pod Propellers
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-45, -5, 12, 10);
    ctx.fillRect(33, -5, 12, 10);

    // Rotating Propeller Blur
    const pSpin = (simHour * 40) % Math.PI;
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(-39, -5, 2, 12 * Math.abs(Math.cos(pSpin)) + 2, 0, 0, Math.PI * 2);
    ctx.ellipse(39, -5, 2, 12 * Math.abs(Math.sin(pSpin)) + 2, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // HUD Text
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px monospace';
    ctx.fillText(`TIME: ${simHour.toFixed(1)}:00 | ALTITUDE: ${targetAltitudeKm} km (rho = ${calculations.rhoAir.toFixed(3)} kg/m³)`, 14, 22);
    ctx.fillText(`AIRSPEED: ${calculations.cruiseAirspeedMs.toFixed(1)} m/s | TOTAL DRONE POWER: ${calculations.totalDronePowerDemandW.toFixed(0)} W`, 14, 38);
    ctx.fillStyle = calculations.netDailyEnergyDeficit ? '#ef4444' : '#34d399';
    ctx.fillText(`BATTERY MIN SoC: ${calculations.minSocObservedPct.toFixed(1)}% (${calculations.netDailyEnergyDeficit ? 'DEFICIT RISK!' : 'PERPETUAL LOOP OK'}) | PEAK SOLAR: ${calculations.peakSolarHarvestW.toFixed(0)} W`, 14, 54);
  }, [simHour, targetAltitudeKm, calculations]);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-amber-900/50 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-2xl border border-amber-500/40 text-amber-400">
              <Sun className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Солнечный Атмосферный Псевдоспутник (HAPS / Стратосферный БПЛА)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Solar Stratospheric HAPS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Суточный баланс энергии день/ночь на высоте 18–21 км, полет в разреженном воздухе (плотность 0.088 кг/м³) и круглогодичная автономность.
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
              onClick={() => setSimHour(12)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
              title="Полдень"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Presets Grid */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {HAPS_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedPresetIdx(idx);
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
            <span>Минимум Заряда (Ночь)</span>
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-2xl font-black ${calculations.minSocObservedPct < 15 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {calculations.minSocObservedPct.toFixed(1)} <span className="text-xs text-slate-400">%</span>
          </div>
          <div className="text-[10px] text-slate-500">{calculations.netDailyEnergyDeficit ? 'Дефицит!' : 'Запас надежен'}</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Пик Генерации Солнца</span>
            <Sun className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {(calculations.peakSolarHarvestW / 1000).toFixed(2)} <span className="text-xs text-slate-400">кВт</span>
          </div>
          <div className="text-[10px] text-slate-500">Площадь: {(preset.wingAreaM2 * 0.85).toFixed(0)} м²</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Потребная Мощность</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">
            {calculations.totalDronePowerDemandW.toFixed(0)} <span className="text-xs text-slate-400">Вт</span>
          </div>
          <div className="text-[10px] text-slate-500">Моторы: {calculations.flightMotorPowerW.toFixed(0)} Вт</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Крейсерская Скорость V</span>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {calculations.cruiseAirspeedMs.toFixed(1)} <span className="text-xs text-slate-400">м/с</span>
          </div>
          <div className="text-[10px] text-slate-500">{(calculations.cruiseAirspeedMs * 3.6).toFixed(0)} км/ч TAS</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Плотность Воздуха ρ</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {calculations.rhoAir.toFixed(3)} <span className="text-xs text-slate-400">кг/м³</span>
          </div>
          <div className="text-[10px] text-slate-500">H = {targetAltitudeKm} км</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Емкость АКБ</span>
            <Zap className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-black text-yellow-400">
            {(calculations.totalBatteryCapacityWh / 1000).toFixed(1)} <span className="text-xs text-slate-400">кВт·ч</span>
          </div>
          <div className="text-[10px] text-slate-500">Масса АКБ: {calculations.batteryMassKg.toFixed(0)} кг</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Параметры Стратосферы & Геолокации</span>
            </h3>

            {/* Target Altitude */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Высота Барражирования (Эшелон HAPS)</span>
                <span className="text-amber-300 font-bold">{targetAltitudeKm.toFixed(1)} км</span>
              </div>
              <input
                type="range"
                min="16.0"
                max="22.0"
                step="0.5"
                value={targetAltitudeKm}
                onChange={(e) => setTargetAltitudeKm(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Latitude */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Географическая Широта (Северная)</span>
                <span className="text-yellow-300 font-bold">{latitudeDeg}° N</span>
              </div>
              <input
                type="range"
                min="0"
                max="70"
                step="5"
                value={latitudeDeg}
                onChange={(e) => setLatitudeDeg(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-400"
              />
            </div>

            {/* Season of Year */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">День Года (172 = Летнее Солнцестояние)</span>
                <span className="text-emerald-300 font-bold">День {seasonDayOfYear}</span>
              </div>
              <input
                type="range"
                min="1"
                max="365"
                step="10"
                value={seasonDayOfYear}
                onChange={(e) => setSeasonDayOfYear(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

            {/* Stratospheric Wind */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Скорость Стратосферного Ветра (Струйное течение)</span>
                <span className="text-cyan-300 font-bold">{stratosphericWindMs} м/с</span>
              </div>
              <input
                type="range"
                min="4"
                max="28"
                step="1"
                value={stratosphericWindMs}
                onChange={(e) => setStratosphericWindMs(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Solar Panel Degradation */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Деградация Фотоэлементов / Пыль / Износ</span>
                <span className="text-rose-300 font-bold">{solarDegradationPct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={solarDegradationPct}
                onChange={(e) => setSolarDegradationPct(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
              />
            </div>
          </div>
        </div>

        {/* Right 2D Animated Stratosphere View & 24h Energy Balance Chart (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Animated 2D Viewport */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <span>2D-Визуализация Стратосферного Полета & Цикла Солнца</span>
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                Stratospheric Day/Night Cycle
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

          {/* 24h Solar vs Demand & Battery SoC Chart */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-yellow-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-yellow-400" />
                <span>24-Часовой Баланс Мощности Солнца (Вт) и Заряда АКБ SoC (%)</span>
              </h3>
              <FullscreenGraphButton
                domain="uav_guidance"
                title="Суточный энергетический баланс стратосферных псевдоспутников HAPS"
              />
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calculations.profile24h}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Время суток (часы)', position: 'insideBottom', offset: -5 }} />
                  <YAxis yAxisId="pwr" stroke="#f59e0b" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="soc" orientation="right" stroke="#34d399" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line yAxisId="pwr" type="monotone" dataKey="solarPowerW" name="Генерация Солнца (Вт)" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                  <Line yAxisId="pwr" type="monotone" dataKey="demandPowerW" name="Потребление (Вт)" stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  <Line yAxisId="soc" type="monotone" dataKey="batterySocPct" name="Заряд АКБ (%)" stroke="#34d399" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
