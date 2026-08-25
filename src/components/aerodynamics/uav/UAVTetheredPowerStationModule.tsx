// ============================================================================
// UAV Tethered Power Station & Catenary Cable Aerodynamics Module
// High-Voltage DC Line Losses, Cable Drag, Catenary Sag & Winch Auto-Tensioning
// ============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Zap,
  Cable,
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
  Cpu,
  BatteryCharging,
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

export interface TetherPreset {
  id: string;
  name: string;
  droneHoverPowerW: number;
  tetherVoltageV: number;
  cableLinearMassGpm: number; // grams per meter
  cableCrossSectionMm2: number;
  maxAltitudeM: number;
  description: string;
}

export const TETHER_PRESETS: TetherPreset[] = [
  {
    id: 'heavy_octo_surveillance_1000v',
    name: 'Тяжелый Октокоптер Наблюдения (1000V HVDC, 100-250м)',
    droneHoverPowerW: 4200,
    tetherVoltageV: 800,
    cableLinearMassGpm: 32,
    cableCrossSectionMm2: 0.75,
    maxAltitudeM: 200,
    description: 'Комплекс круглосуточного оптико-радиоэлектронного мониторинга на высоте до 200 м с легким кевларовым кабелем.',
  },
  {
    id: 'tactical_quad_400v',
    name: 'Тактический Квадрокоптер РЭБ/Ретранслятор (400V DC, 60-120м)',
    droneHoverPowerW: 1800,
    tetherVoltageV: 400,
    cableLinearMassGpm: 24,
    cableCrossSectionMm2: 0.5,
    maxAltitudeM: 120,
    description: 'Мобильный ретранслятор связи и постановщик радиопомех с наземной станцией питания в автомобильном кунге.',
  },
  {
    id: 'heavy_payload_firefighting_600v',
    name: 'Пожарный Высотный Дрон со Шлангом (600V DC, 50-100м)',
    droneHoverPowerW: 6500,
    tetherVoltageV: 600,
    cableLinearMassGpm: 55,
    cableCrossSectionMm2: 1.5,
    maxAltitudeM: 80,
    description: 'Удержание дрона для подачи огнетушащих веществ или тяжелых прожекторов на высотные здания.',
  },
];

export const UAVTetheredPowerStationModule: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [hoverAltitudeM, setHoverAltitudeM] = useState<number>(100); // 20 to 250 m
  const [windSpeedMs, setWindSpeedMs] = useState<number>(8); // 0 to 25 m/s
  const [tetherTensionLimitN, setTetherTensionLimitN] = useState<number>(120); // 40 to 300 N
  const [groundSupplyVoltageV, setGroundSupplyVoltageV] = useState<number>(800); // 200 to 1200 V
  const [onboardConverterEfficiency, setOnboardConverterEfficiency] = useState<number>(93); // 85 to 98 %
  const [copperResistivityOhmMm2PerM] = useState<number>(0.0175); // Cu at 20C

  // Simulation & Animation
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTick, setSimTick] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const preset = TETHER_PRESETS[selectedPresetIdx];

  // Mathematical Catenary & Electrical Calculations
  const calculations = useMemo(() => {
    const g = 9.81;
    const rhoAir = 1.225;

    // Cable mass & weight
    const totalCableLengthM = hoverAltitudeM * 1.05; // slack factor
    const totalCableMassKg = (totalCableLengthM * preset.cableLinearMassGpm) / 1000;
    const cableGravityForceN = totalCableMassKg * g;

    // Aerodynamic Wind Drag on Tether (Cylinder crossflow integral)
    // Cd for smooth cylinder ~ 1.1, cable diameter ~ 5mm
    const cableDiameterM = 0.005;
    const cableAreaM2 = totalCableLengthM * cableDiameterM;
    const tetherWindDragN = 0.5 * rhoAir * Math.pow(windSpeedMs, 2) * 1.1 * cableAreaM2;

    // Catenary horizontal sag due to wind and tension
    // Sag delta_x approx = (q_wind * L^2) / (8 * T)
    const effectiveTensionN = Math.max(15, tetherTensionLimitN);
    const horizontalDriftM = (tetherWindDragN * hoverAltitudeM) / (2 * effectiveTensionN);

    // Onboard Power Required
    const droneNetPowerW = preset.droneHoverPowerW + (cableGravityForceN + effectiveTensionN) * 2.5; // added thrust required to lift cable & fight tension

    // Total Electrical Loop Resistance: R = 2 * (rho * L / A)
    const loopResistanceOhms = 2 * (copperResistivityOhmMm2PerM * totalCableLengthM) / preset.cableCrossSectionMm2;

    // Current in Tether: P_drone = (V_ground - I * R) * I * eta
    // Quadratic equation: eta * R * I^2 - eta * V_ground * I + P_drone = 0
    const eta = onboardConverterEfficiency / 100;
    const aCoeff = eta * loopResistanceOhms;
    const bCoeff = -eta * groundSupplyVoltageV;
    const cCoeff = droneNetPowerW;

    const discriminant = bCoeff * bCoeff - 4 * aCoeff * cCoeff;
    let tetherCurrentA = 0;
    let voltageDropV = 0;
    let cableHeatLossW = 0;
    let droneReceivedVoltageV = 0;
    let isVoltageCollapse = false;

    if (discriminant >= 0) {
      // Lower current solution
      tetherCurrentA = (-bCoeff - Math.sqrt(discriminant)) / (2 * aCoeff);
      voltageDropV = tetherCurrentA * loopResistanceOhms;
      droneReceivedVoltageV = groundSupplyVoltageV - voltageDropV;
      cableHeatLossW = Math.pow(tetherCurrentA, 2) * loopResistanceOhms;
    } else {
      isVoltageCollapse = true;
      tetherCurrentA = groundSupplyVoltageV / (2 * loopResistanceOhms); // max power transfer point
      voltageDropV = groundSupplyVoltageV / 2;
      droneReceivedVoltageV = groundSupplyVoltageV / 2;
      cableHeatLossW = Math.pow(tetherCurrentA, 2) * loopResistanceOhms;
    }

    const groundTotalPowerW = droneNetPowerW / eta + cableHeatLossW;
    const electricalEfficiencyPercent = (droneNetPowerW / groundTotalPowerW) * 100;

    // Total tension at drone anchor point
    const topAnchorTensionN = Math.sqrt(Math.pow(effectiveTensionN, 2) + Math.pow(cableGravityForceN + tetherWindDragN, 2));

    // Tension vs Altitude Profile
    const profile = [];
    for (let alt = 20; alt <= 220; alt += 20) {
      const len = alt * 1.05;
      const cMass = (len * preset.cableLinearMassGpm) / 1000;
      const cGrav = cMass * g;
      const cArea = len * cableDiameterM;
      const cDrag = 0.5 * rhoAir * Math.pow(windSpeedMs, 2) * 1.1 * cArea;
      const rLoop = 2 * (copperResistivityOhmMm2PerM * len) / preset.cableCrossSectionMm2;
      const iEst = preset.droneHoverPowerW / (groundSupplyVoltageV * eta);
      const pLoss = Math.pow(iEst, 2) * rLoop;

      profile.push({
        altitudeM: alt,
        tetherMassKg: parseFloat(cMass.toFixed(2)),
        windDragN: parseFloat(cDrag.toFixed(1)),
        cableLossW: parseFloat(pLoss.toFixed(0)),
        topTensionN: parseFloat(Math.sqrt(Math.pow(effectiveTensionN, 2) + Math.pow(cGrav + cDrag, 2)).toFixed(1)),
      });
    }

    return {
      totalCableLengthM,
      totalCableMassKg,
      cableGravityForceN,
      tetherWindDragN,
      horizontalDriftM,
      droneNetPowerW,
      loopResistanceOhms,
      tetherCurrentA,
      voltageDropV,
      droneReceivedVoltageV,
      cableHeatLossW,
      groundTotalPowerW,
      electricalEfficiencyPercent,
      topAnchorTensionN,
      isVoltageCollapse,
      profile,
    };
  }, [preset, hoverAltitudeM, windSpeedMs, tetherTensionLimitN, groundSupplyVoltageV, onboardConverterEfficiency, copperResistivityOhmMm2PerM]);

  // Animation Loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSimTick((prev) => (prev + 1) % 500);
    }, 40);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // 2D Dynamic Canvas of Tether Catenary under Wind & Drone Hover
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Ground line & Ground power station
    const groundY = h - 40;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();

    // Ground Station Winch Box
    const groundX = 100;
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(groundX - 25, groundY - 24, 50, 24);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(groundX, groundY - 12, 8, 0, Math.PI * 2);
    ctx.fill();

    // Drone position (top right, drifting with wind)
    const altitudeScale = (h - 100) / 220;
    const droneY = groundY - hoverAltitudeM * altitudeScale;
    const windDisplacementPixels = calculations.horizontalDriftM * 2.2;
    const droneX = groundX + windDisplacementPixels + Math.sin(simTick * 0.08) * 3;
    const droneCurrentY = droneY + Math.cos(simTick * 0.08) * 2;

    // Draw Catenary Cable Curve with points
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(groundX, groundY - 24);

    const segments = 30;
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      // Parabolic / Catenary sag interpolation
      const sagX = (droneX - groundX) * t + Math.sin(t * Math.PI) * (windSpeedMs * 1.5);
      const sagY = (droneCurrentY - (groundY - 24)) * t + Math.sin(t * Math.PI) * (calculations.totalCableMassKg * 1.2);
      ctx.lineTo(groundX + sagX, groundY - 24 + sagY);
    }
    ctx.stroke();

    // Sparks / Current pulses traveling up the tether
    const pulseOffset = (simTick * 3) % segments;
    const pt = pulseOffset / segments;
    const px = groundX + (droneX - groundX) * pt + Math.sin(pt * Math.PI) * (windSpeedMs * 1.5);
    const py = groundY - 24 + (droneCurrentY - (groundY - 24)) * pt + Math.sin(pt * Math.PI) * (calculations.totalCableMassKg * 1.2);

    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Multirotor Drone
    ctx.save();
    ctx.translate(droneX, droneCurrentY);
    const droneTiltRad = (windSpeedMs * 0.8 * Math.PI) / 180;
    ctx.rotate(-droneTiltRad); // tilt into the wind

    // Arms & Center
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-28, -4, 56, 8);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-12, -8, 24, 16);

    // Rotors spin blur
    const rotorSpin = (simTick * 0.8) % Math.PI;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 2;
    // Left Rotor
    ctx.beginPath();
    ctx.ellipse(-28, -8, 16 * Math.abs(Math.cos(rotorSpin)) + 4, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Right Rotor
    ctx.beginPath();
    ctx.ellipse(28, -8, 16 * Math.abs(Math.sin(rotorSpin)) + 4, 3, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // HUD overlays
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px monospace';
    ctx.fillText(`ALTITUDE: ${hoverAltitudeM} m | WIND: ${windSpeedMs} m/s`, 14, 22);
    ctx.fillText(`HVDC SUPPLY: ${groundSupplyVoltageV} V -> DRONE: ${calculations.droneReceivedVoltageV.toFixed(0)} V (DROP: ${calculations.voltageDropV.toFixed(0)} V)`, 14, 38);
    ctx.fillStyle = calculations.isVoltageCollapse ? '#ef4444' : '#34d399';
    ctx.fillText(`CURRENT: ${calculations.tetherCurrentA.toFixed(1)} A | CABLE LOSS: ${calculations.cableHeatLossW.toFixed(0)} W | ANCHOR TENSION: ${calculations.topAnchorTensionN.toFixed(1)} N`, 14, 54);
  }, [simTick, hoverAltitudeM, windSpeedMs, groundSupplyVoltageV, calculations]);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-sky-900/50 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-sky-500/20 to-blue-500/20 rounded-2xl border border-sky-500/40 text-sky-400">
              <Cable className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Привязной БПЛА: Линия Питания HVDC & Аэродинамика Кабеля</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  Tethered Power & Catenary Sag
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Моделирование высоковольтной передачи мощности (400–1000В), провисания цепной линии, ветрового сноса и натяжения лебедки.
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
              onClick={() => setSimTick(0)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
              title="Сброс"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Presets Grid */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {TETHER_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedPresetIdx(idx);
                setGroundSupplyVoltageV(p.tetherVoltageV);
                setHoverAltitudeM(Math.min(hoverAltitudeM, p.maxAltitudeM));
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
            <span>Напряжение на Борту</span>
            <Zap className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">
            {calculations.droneReceivedVoltageV.toFixed(0)} <span className="text-xs text-slate-400">В</span>
          </div>
          <div className="text-[10px] text-slate-500">Падение: &minus;{calculations.voltageDropV.toFixed(0)} В</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Ток в Кабеле</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {calculations.tetherCurrentA.toFixed(1)} <span className="text-xs text-slate-400">А</span>
          </div>
          <div className="text-[10px] text-slate-500">Шлейф R: {calculations.loopResistanceOhms.toFixed(1)} Ом</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Потери в Кабеле I²R</span>
            <BatteryCharging className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-black text-orange-400">
            {(calculations.cableHeatLossW / 1000).toFixed(2)} <span className="text-xs text-slate-400">кВт</span>
          </div>
          <div className="text-[10px] text-slate-500">КПД линии: {calculations.electricalEfficiencyPercent.toFixed(1)}%</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Натяжение в Узле Дрона</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {calculations.topAnchorTensionN.toFixed(1)} <span className="text-xs text-slate-400">Н</span>
          </div>
          <div className="text-[10px] text-slate-500">Вес кабеля: {calculations.cableGravityForceN.toFixed(1)} Н</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Ветровой Снос Кабеля</span>
            <Wind className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {calculations.horizontalDriftM.toFixed(1)} <span className="text-xs text-slate-400">м</span>
          </div>
          <div className="text-[10px] text-slate-500">Лобовое сопротивление: {calculations.tetherWindDragN.toFixed(1)} Н</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Суммарная Мощность</span>
            <Gauge className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {(calculations.groundTotalPowerW / 1000).toFixed(2)} <span className="text-xs text-slate-400">кВт</span>
          </div>
          <div className="text-[10px] text-slate-500">Масса кабеля: {calculations.totalCableMassKg.toFixed(1)} кг</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-sky-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>Параметры Высоты, Ветра и Напряжения</span>
            </h3>

            {/* Hover Altitude */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Высота Зависания Дрона H</span>
                <span className="text-sky-300 font-bold">{hoverAltitudeM} м</span>
              </div>
              <input
                type="range"
                min="20"
                max={preset.maxAltitudeM}
                step="5"
                value={hoverAltitudeM}
                onChange={(e) => setHoverAltitudeM(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>

            {/* Wind Speed */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Скорость Ветра на Высоте</span>
                <span className="text-cyan-300 font-bold">{windSpeedMs} м/с</span>
              </div>
              <input
                type="range"
                min="0"
                max="22"
                step="1"
                value={windSpeedMs}
                onChange={(e) => setWindSpeedMs(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Ground Voltage */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Напряжение Наземного Источника HVDC</span>
                <span className="text-amber-300 font-bold">{groundSupplyVoltageV} В</span>
              </div>
              <input
                type="range"
                min="300"
                max="1000"
                step="50"
                value={groundSupplyVoltageV}
                onChange={(e) => setGroundSupplyVoltageV(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Winch Tension Control */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Уставка Натяжения Лебедки (Tension Limit)</span>
                <span className="text-emerald-300 font-bold">{tetherTensionLimitN} Н</span>
              </div>
              <input
                type="range"
                min="30"
                max="250"
                step="10"
                value={tetherTensionLimitN}
                onChange={(e) => setTetherTensionLimitN(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

            {/* Converter Efficiency */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">КПД Бортового Step-Down DC/DC</span>
                <span className="text-indigo-300 font-bold">{onboardConverterEfficiency}%</span>
              </div>
              <input
                type="range"
                min="85"
                max="97"
                step="1"
                value={onboardConverterEfficiency}
                onChange={(e) => setOnboardConverterEfficiency(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* Right 2D Animated View & Altitude Profile Chart (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Animated 2D Viewport */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-sky-300 flex items-center gap-2">
                <Cable className="w-4 h-4 text-sky-400" />
                <span>2D-Визуализация Провисания Кабеля (Цепная Линия)</span>
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                Catenary Aero Elasticity
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

          {/* Profile Chart */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span>Зависимость Натяжения Тpoca (Н) & Потерь Тепла (Вт) от Высоты H</span>
              </h3>
              <FullscreenGraphButton
                domain="uav_guidance"
                title="Аэродинамика и электротехника привязных БПЛА"
              />
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calculations.profile}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="altitudeM" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Высота H (м)', position: 'insideBottom', offset: -5 }} />
                  <YAxis yAxisId="tension" stroke="#38bdf8" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="loss" orientation="right" stroke="#f97316" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line yAxisId="tension" type="monotone" dataKey="topTensionN" name="Натяжение тросa (Н)" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
                  <Line yAxisId="loss" type="monotone" dataKey="cableLossW" name="Тепловые потери (Вт)" stroke="#f97316" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
