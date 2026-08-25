// ============================================================================
// UAV High-Energy Laser Defense & Directed Energy Thermal Ablation Module
// Anti-Drone HEL/DEW, Gaussian Spot Irradiance, Atmospheric Extinction & Ablation Time
// ============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Zap,
  Shield,
  Sun,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Gauge,
  Layers,
  TrendingUp,
  Activity,
  Flame,
  Target,
  Sparkles,
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

export interface LaserThreatPreset {
  id: string;
  name: string;
  threatType: string;
  laserPowerKW: number;
  laserWavelengthUm: number;
  beamDirectorApertureM: number;
  targetRangeM: number;
  skinMaterial: 'carbon_fiber' | 'aluminum_alloy' | 'dielectric_reflective';
  skinThicknessMm: number;
  description: string;
}

export const LASER_PRESETS: LaserThreatPreset[] = [
  {
    id: 'anti_drone_c_uas_laser',
    name: 'Тактический C-UAS Волоконный Лазер (30 кВт, 1.064 мкм, 1.5 км)',
    threatType: 'Мобильный наземный боевой лазер ПВО ближнего радиуса',
    laserPowerKW: 30,
    laserWavelengthUm: 1.064,
    beamDirectorApertureM: 0.30,
    targetRangeM: 1500,
    skinMaterial: 'carbon_fiber',
    skinThicknessMm: 2.0,
    description: 'Оптико-электронный перехватчик с непрерывным волоконным лазером для термического разрушения планера и поджога батарей/моторов.',
  },
  {
    id: 'heavy_naval_dew_system',
    name: 'Корабельная Лазерная Установка ПВО (100 кВт, 3.2 км)',
    threatType: 'Тяжелый лазерный комплекс ПРО/ПВО морского базирования',
    laserPowerKW: 100,
    laserWavelengthUm: 1.064,
    beamDirectorApertureM: 0.50,
    targetRangeM: 3200,
    skinMaterial: 'aluminum_alloy',
    skinThicknessMm: 3.5,
    description: 'Мегаваттный/100 кВт пучок для мгновенного прожога силовых элементов крыла и подрыва боевой части дрона.',
  },
  {
    id: 'optical_dazzler_sensor_kill',
    name: 'Лазерный Ослепитель Оптико-Электронных Систем (Dazzler 2 кВт)',
    threatType: 'Лазер функционального поражения матриц камер и LiDAR',
    laserPowerKW: 2.0,
    laserWavelengthUm: 0.532, // Green 532nm
    beamDirectorApertureM: 0.15,
    targetRangeM: 800,
    skinMaterial: 'dielectric_reflective',
    skinThicknessMm: 1.0,
    description: 'Точечное выжигание CMOS/CCD сенсоров камер дрона и оптических головок самонаведения без сквозного прожога корпуса.',
  },
];

export const UAVLaserDirectedEnergyDefenseModule: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [rangeM, setRangeM] = useState<number>(1500); // 200 to 5000 m
  const [atmosphereVisibilityKm, setAtmosphereVisibilityKm] = useState<number>(15); // 2 to 30 km (Fog vs Clear)
  const [droneRollRateDegS, setDroneRollRateDegS] = useState<number>(0); // 0 to 360 deg/s protective spin
  const [hasReflectiveCoating, setHasReflectiveCoating] = useState<boolean>(false); // Dielectric mirror coating R > 98%
  const [skinThicknessMm, setSkinThicknessMm] = useState<number>(2.0); // 0.5 to 6.0 mm

  // Simulation State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTick, setSimTick] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const preset = LASER_PRESETS[selectedPresetIdx];

  // Mathematical Physics of High-Energy Laser Propagation & Thermal Ablation
  const calculations = useMemo(() => {
    const wavelengthM = preset.laserWavelengthUm * 1e-6;
    const powerW = preset.laserPowerKW * 1e3;

    // 1. Diffraction-Limited Gaussian Spot Size & Beam Quality (M^2 = 1.3):
    // w_spot = (4 * lambda * R) / (pi * D_aperture) * M^2
    const mSquared = 1.35;
    const diffractionSpotDiameterM = (4 * wavelengthM * rangeM * mSquared) / (Math.PI * preset.beamDirectorApertureM);
    // Add atmospheric jitter / turbulence beam wander (~15 microrad)
    const turbulenceJitterM = rangeM * 18e-6;
    const effectiveSpotDiameterM = Math.max(0.012, diffractionSpotDiameterM + turbulenceJitterM);
    const spotAreaCm2 = (Math.PI * Math.pow((effectiveSpotDiameterM * 100) / 2, 2));

    // 2. Atmospheric Extinction (Beer-Lambert Law):
    // gamma_ext approx 3.91 / Visibility_km
    const gammaExtPerM = (3.91 / (atmosphereVisibilityKm * 1000));
    const atmosphericTransmission = Math.exp(-gammaExtPerM * rangeM);
    const powerAtTargetW = powerW * atmosphericTransmission;

    // 3. Surface Absorption & Material Thermal Properties:
    // Carbon Fiber: alpha ~ 0.85, rho*Cp*dT + dH_vap ~ 28 kJ/cm^3
    // Aluminum: alpha ~ 0.12 (unpolished) / 0.05, rho*Cp*dT + dH_melt ~ 31 kJ/cm^3
    // Dielectric Reflective: alpha ~ 0.02 (reflects 98%)
    let absorptivity = 0.82;
    let volumetricEnthalpyJPerCm3 = 28000; // J/cm^3

    if (hasReflectiveCoating) {
      absorptivity = 0.03; // Reflective mirror protection
    } else if (preset.skinMaterial === 'aluminum_alloy') {
      absorptivity = 0.22;
      volumetricEnthalpyJPerCm3 = 31000;
    } else if (preset.skinMaterial === 'carbon_fiber') {
      absorptivity = 0.86;
      volumetricEnthalpyJPerCm3 = 26000;
    }

    const absorbedPowerW = powerAtTargetW * absorptivity;
    const spotIrradianceWPerCm2 = powerAtTargetW / spotAreaCm2;
    const absorbedIrradianceWPerCm2 = absorbedPowerW / spotAreaCm2;

    // 4. Burn-Through Time Calculation:
    // With Drone Roll Maneuver: Roll spreads spot over circumference => effective irradiance reduced by (spot / (2 * pi * r_drone))
    const droneRadiusCm = 15; // 15 cm body radius
    const rollDilutionFactor = droneRollRateDegS > 20 
      ? Math.min(1.0, (effectiveSpotDiameterM * 100) / (2 * Math.PI * droneRadiusCm * (droneRollRateDegS / 360)))
      : 1.0;

    const effectiveAbsorbedFluxWPerCm2 = absorbedIrradianceWPerCm2 * rollDilutionFactor;
    // t_burn = (Volumetric Enthalpy * Thickness_cm) / (Flux - Convective Cooling)
    const convectiveCoolingWPerCm2 = 15; // High-speed airflow cooling
    const netFluxWPerCm2 = Math.max(1, effectiveAbsorbedFluxWPerCm2 - convectiveCoolingWPerCm2);
    const thicknessCm = skinThicknessMm / 10;
    const burnThroughTimeSec = (volumetricEnthalpyJPerCm3 * thicknessCm) / netFluxWPerCm2;

    // Range vs Burn Time Sweep Data for Chart
    const rangeSweepData = [];
    for (let r = 500; r <= 4500; r += 250) {
      const spotD = Math.max(0.01, (4 * wavelengthM * r * mSquared) / (Math.PI * preset.beamDirectorApertureM) + r * 18e-6);
      const sArea = Math.PI * Math.pow((spotD * 100) / 2, 2);
      const trans = Math.exp(-gammaExtPerM * r);
      const pTgt = powerW * trans;
      const flux = (pTgt * absorptivity * rollDilutionFactor) / sArea;
      const tBurn = Math.min(60, (volumetricEnthalpyJPerCm3 * thicknessCm) / Math.max(1, flux - convectiveCoolingWPerCm2));
      rangeSweepData.push({
        rangeM: r,
        burnThroughTimeSec: parseFloat(tBurn.toFixed(2)),
        spotDiameterMm: parseFloat((spotD * 1000).toFixed(1)),
      });
    }

    return {
      effectiveSpotDiameterM,
      spotAreaCm2,
      atmosphericTransmission,
      powerAtTargetW,
      absorbedPowerW,
      spotIrradianceWPerCm2,
      burnThroughTimeSec,
      absorptivity,
      rangeSweepData,
    };
  }, [preset, rangeM, atmosphereVisibilityKm, droneRollRateDegS, hasReflectiveCoating, skinThicknessMm]);

  // Animation Timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSimTick((prev) => (prev + 1) % 500);
    }, 40);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // 2D High-Energy Laser Beam & Target Interaction Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dark Night Battlefield Background
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    // Grid Lines
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
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

    // Laser Turret at Left Bottom
    const turretX = 60;
    const turretY = h - 60;

    // Target Drone at Top Right
    const droneX = w - 100;
    const droneY = 100 + Math.sin(simTick * 0.06) * 15;

    // Turret Mount
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(turretX, turretY, 24, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

    // Laser Director Barrel
    const aimAngle = Math.atan2(droneY - turretY, droneX - turretX);
    ctx.save();
    ctx.translate(turretX, turretY);
    ctx.rotate(aimAngle);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, -6, 28, 12);
    ctx.strokeRect(0, -6, 28, 12);
    ctx.restore();

    // High Energy Laser Beam (Glow + Core)
    if (isPlaying) {
      const beamGlow = ctx.createLinearGradient(turretX, turretY, droneX, droneY);
      beamGlow.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
      beamGlow.addColorStop(1, 'rgba(249, 115, 22, 0.4)');

      // Wide Glow
      ctx.strokeStyle = beamGlow;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(turretX + Math.cos(aimAngle) * 28, turretY + Math.sin(aimAngle) * 28);
      ctx.lineTo(droneX, droneY);
      ctx.stroke();

      // Sharp Core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(turretX + Math.cos(aimAngle) * 28, turretY + Math.sin(aimAngle) * 28);
      ctx.lineTo(droneX, droneY);
      ctx.stroke();

      // Plasma Spark & Thermal Bloom at Impact Spot
      const sparkRadius = Math.random() * 8 + 6;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(droneX, droneY, sparkRadius, 0, Math.PI * 2);
      ctx.fill();

      // Flying thermal spall sparks
      ctx.fillStyle = '#f97316';
      for (let s = 0; s < 8; s++) {
        const sx = droneX + (Math.random() - 0.5) * 25;
        const sy = droneY + (Math.random() - 0.5) * 25;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.random() * 2 + 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Target UAV
    ctx.save();
    ctx.translate(droneX, droneY);
    const rollAngle = (simTick * droneRollRateDegS * Math.PI) / 180;
    ctx.rotate(rollAngle * 0.05);

    // Drone Wings & Fuselage
    ctx.fillStyle = hasReflectiveCoating ? '#38bdf8' : '#334155';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;

    // Wing
    ctx.beginPath();
    ctx.moveTo(-35, 6);
    ctx.lineTo(35, 6);
    ctx.lineTo(25, -6);
    ctx.lineTo(-25, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Fuselage
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Thermal damage spot on skin
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(4, 0, (calculations.effectiveSpotDiameterM * 100) / 2 + 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // HUD Text
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px monospace';
    ctx.fillText(`УГРОЗА: ${preset.threatType.toUpperCase()} | МОЩНОСТЬ: ${preset.laserPowerKW} кВт | ДИСТАНЦИЯ: ${rangeM} м`, 14, 22);
    ctx.fillStyle = calculations.burnThroughTimeSec < 2.0 ? '#ef4444' : '#34d399';
    ctx.fillText(`ВРЕМЯ ПРОЖОГА ОБШИВКИ (BURN-THROUGH): ${calculations.burnThroughTimeSec.toFixed(2)} с | ПЯТНО: ${(calculations.effectiveSpotDiameterM * 1000).toFixed(1)} мм`, 14, 38);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`ПОТОК ЭНЕРГИИ: ${calculations.spotIrradianceWPerCm2.toFixed(1)} Вт/см² | ВРАЩЕНИЕ БПЛА: ${droneRollRateDegS}°/с | ЗЕРКАЛЬНОЕ ПОКРЫТИЕ: ${hasReflectiveCoating ? 'АКТИВНО (R=98%)' : 'НЕТ'}`, 14, 54);
  }, [simTick, rangeM, droneRollRateDegS, hasReflectiveCoating, isPlaying, calculations, preset]);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-rose-900/50 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-rose-500/20 to-orange-500/20 rounded-2xl border border-rose-500/40 text-rose-400">
              <Zap className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Лазерная Защита БПЛА & Тепловая Абляция (HEL / DEW)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  High-Energy Laser Defense
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Моделирование лазерного поражения ПВО (30–100 кВт), плотность мощности гауссова пучка, время сквозного прожога углепластика/алюминия и методы защиты (вращение корпуса, зеркальные покрытия).
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
                setRangeM(1500);
                setAtmosphereVisibilityKm(15);
                setDroneRollRateDegS(0);
                setHasReflectiveCoating(false);
                setSkinThicknessMm(2.0);
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
          {LASER_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedPresetIdx(idx);
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
            <span>Время Прожога Стенки</span>
            <Flame className={`w-4 h-4 ${calculations.burnThroughTimeSec < 2.0 ? 'text-rose-400' : 'text-emerald-400'}`} />
          </div>
          <div className={`text-2xl font-black ${calculations.burnThroughTimeSec < 2.0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {calculations.burnThroughTimeSec > 50 ? '> 50' : calculations.burnThroughTimeSec.toFixed(2)} <span className="text-xs text-slate-400">с</span>
          </div>
          <div className="text-[10px] text-slate-500">{calculations.burnThroughTimeSec < 2.0 ? 'Критический прожог' : 'Устойчивая защита'}</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Диаметр Пятна Фокуса</span>
            <Target className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {(calculations.effectiveSpotDiameterM * 1000).toFixed(1)} <span className="text-xs text-slate-400">мм</span>
          </div>
          <div className="text-[10px] text-slate-500">Дифракция + турбулентность</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Плотность Мощности</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {calculations.spotIrradianceWPerCm2.toFixed(0)} <span className="text-xs text-slate-400">Вт/см²</span>
          </div>
          <div className="text-[10px] text-slate-500">Мощность у цели: {(calculations.powerAtTargetW / 1000).toFixed(1)} кВт</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Пропускание Воздуха</span>
            <Sun className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            {(calculations.atmosphericTransmission * 100).toFixed(1)} <span className="text-xs text-slate-400">%</span>
          </div>
          <div className="text-[10px] text-slate-500">Видимость: {atmosphereVisibilityKm} км</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Коэфф. Поглощения alpha</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {(calculations.absorptivity * 100).toFixed(0)} <span className="text-xs text-slate-400">%</span>
          </div>
          <div className="text-[10px] text-slate-500">{hasReflectiveCoating ? 'Зеркальное диэлектрик' : preset.skinMaterial}</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Вращение Корпуса</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {droneRollRateDegS} <span className="text-xs text-slate-400">°/с</span>
          </div>
          <div className="text-[10px] text-slate-500">Рассеяние пятна тепла</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-rose-400" />
              <span>Параметры Лазера & Защиты БПЛА</span>
            </h3>

            {/* Target Range */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Дистанция до Лазерной Установки R</span>
                <span className="text-rose-300 font-bold">{rangeM} м ({(rangeM / 1000).toFixed(2)} км)</span>
              </div>
              <input
                type="range"
                min="300"
                max="4500"
                step="50"
                value={rangeM}
                onChange={(e) => setRangeM(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
              />
            </div>

            {/* Atmosphere Visibility */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Метеорологическая Видимость (Атмосфера)</span>
                <span className="text-teal-300 font-bold">{atmosphereVisibilityKm} км</span>
              </div>
              <input
                type="range"
                min="2"
                max="30"
                step="1"
                value={atmosphereVisibilityKm}
                onChange={(e) => setAtmosphereVisibilityKm(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
            </div>

            {/* Drone Roll Spin Countermeasure */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Скорость Вращения Дрона Вокруг Оси (Roll Rate)</span>
                <span className="text-emerald-300 font-bold">{droneRollRateDegS}°/с</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="15"
                value={droneRollRateDegS}
                onChange={(e) => setDroneRollRateDegS(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

            {/* Skin Thickness */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Толщина Силовой Обшивки Планера</span>
                <span className="text-amber-300 font-bold">{skinThicknessMm.toFixed(1)} мм</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.2"
                value={skinThicknessMm}
                onChange={(e) => setSkinThicknessMm(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Toggle Reflective Coating */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setHasReflectiveCoating(!hasReflectiveCoating)}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                  hasReflectiveCoating
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                    : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>{hasReflectiveCoating ? '✓ Зеркальное Диэлектрическое Покрытие Активно (R > 98%)' : 'Нанести Зеркальное Термозащитное Покрытие (R > 98%)'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 2D Animated Canvas & Burn Time Chart (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Animated 2D Viewport */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-400" />
                <span>2D-Модель Лазерного Пучка & Термической Абляции</span>
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-rose-300 border border-slate-700">
                HEL DEW Propagation
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

          {/* Range vs Burn Through Time Chart */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-orange-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-400" />
                <span>Время Прожога Обшивки (сек) от Дистанции (м)</span>
              </h3>
              <FullscreenGraphButton
                domain="uav_guidance"
                title="Зависимость времени термического разрушения планера БПЛА от дистанции и пятна фокуса лазера"
              />
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calculations.rangeSweepData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="rangeM" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Дистанция до лазера (м)', position: 'insideBottom', offset: -5 }} />
                  <YAxis stroke="#f97316" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="burnThroughTimeSec" name="Время сквозного прожога (с)" stroke="#f97316" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="spotDiameterMm" name="Диаметр пятна (мм)" stroke="#38bdf8" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
