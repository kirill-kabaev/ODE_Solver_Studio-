// ============================================================================
// UAV / Drone Propulsion & Flight Dynamics Studio (VTOL, Quad/Hexa, Fixed-Wing, Coaxial)
// State-of-the-Art UAV Aeromechanics, Energy Matching, Thermal BLDC & Autopilot Limits
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Zap,
  Battery,
  Clock,
  Compass,
  Wind,
  Shield,
  Layers,
  Activity,
  Gauge,
  Sliders,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Cpu,
  Flame,
  Radio,
  FileSpreadsheet,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

export type DroneArchitecture = 'quad_x' | 'hexa_x' | 'octo_coaxial' | 'vtol_tiltrotor' | 'fixed_wing_uav';

export interface UAVSpecs {
  id: string;
  name: string;
  architecture: DroneArchitecture;
  frameDiagonalMm: number;
  dryMassKg: number;
  payloadMassKg: number;
  batteryCells: number; // e.g. 6S = 6
  batteryCapacityMah: number;
  batteryC_Rating: number;
  motorKv: number;
  motorStatorSize: string; // e.g. '2807', '2207', '4014'
  motorInternalResistanceOhms: number;
  motorMaxCurrentAmps: number;
  propellerDiameterInch: number;
  propellerPitchInch: number;
  propellerBlades: number;
  wingAreaM2?: number;
  wingSpanM?: number;
  cruiseAirspeedMs?: number;
  maxWindGustResistanceMs: number;
  telemetryLinkGhz: number;
}

export const UAV_PRESETS: { label: string; specs: UAVSpecs; description: string }[] = [
  {
    label: 'FPV Long-Range 7" (Разведка & Патруль)',
    description: 'Легкий скоростной квадрокоптер 7 дюймов с высокой маневренностью и дальностью полета до 15 км.',
    specs: {
      id: 'fpv_7inch_recon',
      name: 'AeroScout-7 FPV LongRange',
      architecture: 'quad_x',
      frameDiagonalMm: 310,
      dryMassKg: 0.65,
      payloadMassKg: 0.35,
      batteryCells: 6, // 6S Li-Ion 22.2V
      batteryCapacityMah: 4000,
      batteryC_Rating: 30,
      motorKv: 1300,
      motorStatorSize: '2807',
      motorInternalResistanceOhms: 0.048,
      motorMaxCurrentAmps: 45,
      propellerDiameterInch: 7.0,
      propellerPitchInch: 4.0,
      propellerBlades: 3,
      maxWindGustResistanceMs: 14,
      telemetryLinkGhz: 5.8,
    },
  },
  {
    label: 'Тяжелый Гексакоптер (LiDAR / Тепловизор 5 кг)',
    description: 'Шестироторная платформа высокой грузоподъемности для геодезии, мониторинга ЛЭП и картографии.',
    specs: {
      id: 'heavy_hexa_lidar',
      name: 'GeoScan-Hexa 1100',
      architecture: 'hexa_x',
      frameDiagonalMm: 1100,
      dryMassKg: 5.8,
      payloadMassKg: 4.5,
      batteryCells: 12, // 12S LiPo 44.4V
      batteryCapacityMah: 22000,
      batteryC_Rating: 15,
      motorKv: 180,
      motorStatorSize: '6215',
      motorInternalResistanceOhms: 0.032,
      motorMaxCurrentAmps: 60,
      propellerDiameterInch: 22.0,
      propellerPitchInch: 7.2,
      propellerBlades: 2,
      maxWindGustResistanceMs: 16,
      telemetryLinkGhz: 2.4,
    },
  },
  {
    label: 'VTOL Конвертоплан (Tilt-Rotor крыло + 4 винта)',
    description: 'Гибридный беспилотник самолетного типа с вертикальным взлетом/посадкой и дальностью 120+ км.',
    specs: {
      id: 'vtol_tiltrotor_hybrid',
      name: 'SkyMapper VTOL Pro',
      architecture: 'vtol_tiltrotor',
      frameDiagonalMm: 1400,
      dryMassKg: 4.2,
      payloadMassKg: 1.8,
      batteryCells: 6, // 6S Solid-State 22.2V
      batteryCapacityMah: 30000,
      batteryC_Rating: 10,
      motorKv: 380,
      motorStatorSize: '4014',
      motorInternalResistanceOhms: 0.055,
      motorMaxCurrentAmps: 40,
      propellerDiameterInch: 15.0,
      propellerPitchInch: 5.0,
      propellerBlades: 2,
      wingAreaM2: 0.58,
      wingSpanM: 2.1,
      cruiseAirspeedMs: 22,
      maxWindGustResistanceMs: 12,
      telemetryLinkGhz: 0.9,
    },
  },
  {
    label: 'Коаксиальный X8 Октокоптер (Ветроустойчивый)',
    description: '8 соосных моторов на 4 лучах с 100% резервированием при отказе любого одного или двух двигателей.',
    specs: {
      id: 'coaxial_x8_cinelifter',
      name: 'Titan-X8 Heavy Duty',
      architecture: 'octo_coaxial',
      frameDiagonalMm: 850,
      dryMassKg: 4.1,
      payloadMassKg: 3.5,
      batteryCells: 12,
      batteryCapacityMah: 16000,
      batteryC_Rating: 25,
      motorKv: 320,
      motorStatorSize: '5010',
      motorInternalResistanceOhms: 0.038,
      motorMaxCurrentAmps: 50,
      propellerDiameterInch: 16.0,
      propellerPitchInch: 5.5,
      propellerBlades: 3,
      maxWindGustResistanceMs: 20,
      telemetryLinkGhz: 2.4,
    },
  },
];

export const UAVDroneStudioModule: React.FC = () => {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [specs, setSpecs] = useState<UAVSpecs>(UAV_PRESETS[0].specs);

  // Environmental simulation conditions
  const [ambientTempC, setAmbientTempC] = useState<number>(20);
  const [flightAltitudeM, setFlightAltitudeM] = useState<number>(100);
  const [ambientWindMs, setAmbientWindMs] = useState<number>(5);
  const [throttleStickPercent, setThrottleStickPercent] = useState<number>(50);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'flight_envelope' | 'thermal_bldc' | 'wind_dynamics' | 'comparison' | 'bom_export'>('flight_envelope');

  // Load preset
  const handleSelectPreset = (idx: number) => {
    setSelectedPresetIndex(idx);
    setSpecs(UAV_PRESETS[idx].specs);
  };

  // Physical calculations for the drone
  const calculations = useMemo(() => {
    const totalMassKg = specs.dryMassKg + specs.payloadMassKg;
    const gravityG = 9.80665;
    const totalWeightN = totalMassKg * gravityG;

    // Atmospheric density at altitude & temp
    const p0 = 101325;
    const t0 = 288.15;
    const tActualK = 273.15 + ambientTempC;
    const pressurePa = p0 * Math.pow(1 - (0.0065 * flightAltitudeM) / t0, 5.255);
    const airDensityKgM3 = pressurePa / (287.058 * tActualK);

    // Number of rotors based on architecture
    let numRotors = 4;
    let coaxialInterferenceFactor = 1.0;
    if (specs.architecture === 'hexa_x') numRotors = 6;
    if (specs.architecture === 'octo_coaxial') {
      numRotors = 8;
      coaxialInterferenceFactor = 0.88; // 12% loss on lower coaxial rotor
    }
    if (specs.architecture === 'vtol_tiltrotor') numRotors = 4;
    if (specs.architecture === 'fixed_wing_uav') numRotors = 1;

    const nominalVoltage = specs.batteryCells * 3.7;
    const fullVoltage = specs.batteryCells * 4.2;

    // Propeller Geometry & BEM Scaling
    const propRadiusM = (specs.propellerDiameterInch * 0.0254) / 2;
    const propDiskAreaM2 = Math.PI * Math.pow(propRadiusM, 2);
    const totalDiskAreaM2 = propDiskAreaM2 * numRotors * coaxialInterferenceFactor;

    // Hover Thrust Required per motor
    const hoverThrustRequiredPerMotorN = totalWeightN / (numRotors * coaxialInterferenceFactor);
    const hoverThrustRequiredPerMotorG = (hoverThrustRequiredPerMotorN / gravityG) * 1000;

    // Momentum Theory: Ideal Induced Velocity in Hover: v_i = sqrt(T / (2 * rho * A))
    const vInducedHover = Math.sqrt(hoverThrustRequiredPerMotorN / (2 * airDensityKgM3 * propDiskAreaM2));
    const idealHoverPowerWattsPerMotor = hoverThrustRequiredPerMotorN * vInducedHover;
    const figureOfMeritFM = 0.68; // typical high-grade composite drone prop
    const actualAeroPowerWattsPerMotor = idealHoverPowerWattsPerMotor / figureOfMeritFM;

    // Motor Electromechanical Conversion (BLDC)
    const escEfficiency = 0.96;
    const motorMechanicalEfficiency = 0.84;
    const totalElectricalPowerPerMotorWatts = actualAeroPowerWattsPerMotor / (escEfficiency * motorMechanicalEfficiency);
    const totalHoverElectricalPowerWatts = totalElectricalPowerPerMotorWatts * numRotors;

    // Hover Current & Throttle Match
    const hoverCurrentAmps = totalHoverElectricalPowerWatts / nominalVoltage;
    const batteryCapacityAh = specs.batteryCapacityMah / 1000;
    const usableBatteryEnergyWh = batteryCapacityAh * nominalVoltage * 0.85; // 85% depth of discharge safe margin

    // Flight Endurance (Hover)
    const hoverEnduranceHours = usableBatteryEnergyWh / totalHoverElectricalPowerWatts;
    const hoverEnduranceMinutes = hoverEnduranceHours * 60;

    // Maximum Performance (100% Throttle)
    const maxRpmEstimate = specs.motorKv * nominalVoltage * 0.88;
    const ctCoeff = 0.11; // Thrust coefficient
    const cpCoeff = 0.045; // Power coefficient
    const nRevPerSecMax = maxRpmEstimate / 60;
    const maxThrustPerMotorN = ctCoeff * airDensityKgM3 * Math.pow(nRevPerSecMax, 2) * Math.pow(specs.propellerDiameterInch * 0.0254, 4);
    const totalMaxThrustN = maxThrustPerMotorN * numRotors * coaxialInterferenceFactor;
    const totalMaxThrustKg = totalMaxThrustN / gravityG;
    const thrustToWeightRatio = totalMaxThrustN / totalWeightN;

    const maxElectricalPowerWatts = (cpCoeff * airDensityKgM3 * Math.pow(nRevPerSecMax, 3) * Math.pow(specs.propellerDiameterInch * 0.0254, 5) * numRotors) / (escEfficiency * motorMechanicalEfficiency);
    const maxDischargeCurrentAmps = maxElectricalPowerWatts / (specs.batteryCells * 3.5);
    const batteryMaxSafeCurrentAmps = batteryCapacityAh * specs.batteryC_Rating;

    // Throttle for hover
    const hoverThrottlePercent = Math.min(100, Math.max(15, (totalWeightN / totalMaxThrustN) * 100));

    // Motor Thermal Steady-State Simulation
    // P_loss = I^2 * R_m + P_core
    const currentPerMotorHover = hoverCurrentAmps / numRotors;
    const currentPerMotorMax = maxDischargeCurrentAmps / numRotors;
    const copperLossHoverWatts = Math.pow(currentPerMotorHover, 2) * specs.motorInternalResistanceOhms;
    const coreLossHoverWatts = 3.5 + 0.001 * maxRpmEstimate;
    const totalMotorLossHoverWatts = copperLossHoverWatts + coreLossHoverWatts;
    const thermalResistanceMotorC_W = 1.45; // Stator to air thermal resistance
    const motorSteadyTempHoverC = ambientTempC + totalMotorLossHoverWatts * thermalResistanceMotorC_W;

    // Wing Cruise Range (For VTOL / Fixed Wing)
    let fixedWingCruiseEnduranceMin = 0;
    let fixedWingRangeKm = 0;
    if (specs.wingAreaM2 && specs.cruiseAirspeedMs) {
      const clCruise = totalWeightN / (0.5 * airDensityKgM3 * Math.pow(specs.cruiseAirspeedMs, 2) * specs.wingAreaM2);
      const cdCruise = 0.025 + Math.pow(clCruise, 2) / (Math.PI * (Math.pow(specs.wingSpanM || 2, 2) / specs.wingAreaM2) * 0.85);
      const dragCruiseN = 0.5 * airDensityKgM3 * Math.pow(specs.cruiseAirspeedMs, 2) * specs.wingAreaM2 * cdCruise;
      const cruisePropThrustWatts = dragCruiseN * specs.cruiseAirspeedMs;
      const cruiseElectricalPowerWatts = cruisePropThrustWatts / (0.75 * motorMechanicalEfficiency * escEfficiency);
      fixedWingCruiseEnduranceMin = (usableBatteryEnergyWh / cruiseElectricalPowerWatts) * 60;
      fixedWingRangeKm = (fixedWingCruiseEnduranceMin / 60) * (specs.cruiseAirspeedMs * 3.6);
    }

    // Dynamic Speed vs Power curve for chart
    const speedCurveData = [];
    for (let v = 0; v <= 35; v += 2.5) {
      // Parasitic airframe drag: D_p = 0.5 * rho * v^2 * CdA
      const cda = 0.022 * Math.sqrt(totalMassKg);
      const parasiticDragN = 0.5 * airDensityKgM3 * Math.pow(v, 2) * cda;
      // Induced power decreases with forward speed (Glauert formula)
      const vTranslational = Math.max(1.0, v);
      const inducedPowerWatts = (totalWeightN * totalWeightN) / (2 * airDensityKgM3 * totalDiskAreaM2 * vTranslational);
      const profilePowerWatts = (actualAeroPowerWattsPerMotor * numRotors) * (1 + 4.5 * Math.pow(v / (nRevPerSecMax * propRadiusM * 2 * Math.PI), 2));
      const totalAeroPower = inducedPowerWatts * 0.8 + profilePowerWatts + parasiticDragN * v;
      const totalElecPower = totalAeroPower / (escEfficiency * motorMechanicalEfficiency);
      const enduranceMin = (usableBatteryEnergyWh / totalElecPower) * 60;
      const rangeKm = (enduranceMin / 60) * (v * 3.6);

      speedCurveData.push({
        airspeedKmh: Math.round(v * 3.6),
        airspeedMs: v,
        totalPowerWatts: Math.round(totalElecPower),
        enduranceMin: Math.round(enduranceMin * 10) / 10,
        rangeKm: Math.round(rangeKm * 10) / 10,
      });
    }

    // Max Wind Gust Pitch Angle: tan(theta) = F_drag_wind / Weight
    const windDragN = 0.5 * airDensityKgM3 * Math.pow(ambientWindMs, 2) * (0.035 * Math.sqrt(totalMassKg));
    const tiltAngleDeg = (Math.atan2(windDragN, totalWeightN) * 180) / Math.PI;

    return {
      totalMassKg,
      totalWeightN,
      airDensityKgM3,
      numRotors,
      nominalVoltage,
      fullVoltage,
      hoverThrustRequiredPerMotorG,
      hoverThrustRequiredPerMotorN,
      vInducedHover,
      totalHoverElectricalPowerWatts,
      hoverCurrentAmps,
      usableBatteryEnergyWh,
      hoverEnduranceMinutes,
      thrustToWeightRatio,
      totalMaxThrustKg,
      hoverThrottlePercent,
      maxDischargeCurrentAmps,
      batteryMaxSafeCurrentAmps,
      motorSteadyTempHoverC,
      tiltAngleDeg,
      fixedWingCruiseEnduranceMin,
      fixedWingRangeKm,
      speedCurveData,
    };
  }, [specs, ambientTempC, flightAltitudeM, ambientWindMs]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-indigo-800/60 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden text-slate-100">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-400 via-indigo-600 to-purple-600 text-slate-950 shadow-lg shadow-cyan-500/20 border border-cyan-400/40">
                <Radio className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <span>БПЛА & Дроны: Полный Расчет Пропульсии и Летных Режимов</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-700">
                    UAV CAE v3.5
                  </span>
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Аэродинамика несущих винтов, согласование ВМГ (BLDC + ESC + АКБ), время полета и ветроустойчивость
                </p>
              </div>
            </div>
          </div>

          {/* Quick Status Pill */}
          <div className="flex items-center gap-2">
            <div className={`px-3.5 py-2 rounded-2xl border text-xs font-mono font-bold flex items-center gap-2 ${
              calculations.thrustToWeightRatio >= 1.8
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50'
                : calculations.thrustToWeightRatio >= 1.3
                ? 'bg-amber-950/80 text-amber-300 border-amber-600/50'
                : 'bg-rose-950/80 text-rose-300 border-rose-600/50'
            }`}>
              <Shield className="w-4 h-4" />
              <span>TWR: {calculations.thrustToWeightRatio.toFixed(2)}:1</span>
              <span className="text-[10px] opacity-75">
                ({calculations.thrustToWeightRatio >= 1.8 ? 'Высокая тяга' : 'Ограниченная тяга'})
              </span>
            </div>
          </div>
        </div>

        {/* Presets Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {UAV_PRESETS.map((preset, idx) => (
            <button
              key={preset.specs.id}
              type="button"
              onClick={() => handleSelectPreset(idx)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer font-mono text-xs flex flex-col justify-between gap-1.5 ${
                selectedPresetIndex === idx
                  ? 'bg-gradient-to-br from-cyan-950/90 to-indigo-950/90 border-cyan-400 text-white shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-400/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <div className="font-bold text-cyan-300 flex items-center justify-between">
                <span>{preset.label}</span>
                {selectedPresetIndex === idx && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {preset.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Telemetry Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Время Зависания</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {calculations.hoverEnduranceMinutes.toFixed(1)} <span className="text-xs text-slate-400">мин</span>
          </div>
          <div className="text-[10px] text-slate-500">85% DoD разряд АКБ</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Тяговооруженность</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {calculations.thrustToWeightRatio.toFixed(2)} <span className="text-xs text-slate-400">: 1</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Макс. тяга {calculations.totalMaxThrustKg.toFixed(2)} кг
          </div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Газ Зависания</span>
            <Gauge className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {calculations.hoverThrottlePercent.toFixed(0)}%
          </div>
          <div className="text-[10px] text-slate-500">
            {calculations.hoverThrottlePercent <= 50 ? 'Идеальный запас' : 'Высокая нагрузка'}
          </div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Ток Зависания</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {calculations.hoverCurrentAmps.toFixed(1)} <span className="text-xs text-slate-400">А</span>
          </div>
          <div className="text-[10px] text-slate-500">
            {calculations.totalHoverElectricalPowerWatts.toFixed(0)} Вт суммарно
          </div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Темп. Моторов</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">
            +{calculations.motorSteadyTempHoverC.toFixed(0)}°C
          </div>
          <div className="text-[10px] text-slate-500">
            {calculations.motorSteadyTempHoverC < 75 ? 'Нормальный нагрев' : 'Риск перегрева!'}
          </div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Дальность VTOL</span>
            <Compass className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            {specs.architecture === 'vtol_tiltrotor'
              ? `${calculations.fixedWingRangeKm.toFixed(0)} км`
              : `${(calculations.speedCurveData[6]?.rangeKm || 12).toFixed(1)} км`}
          </div>
          <div className="text-[10px] text-slate-500">В крейсерском режиме</div>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="bg-slate-900 p-1.5 rounded-2xl border border-slate-800 flex items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveAnalysisTab('flight_envelope')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeAnalysisTab === 'flight_envelope'
              ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>1. Полетная Огибающая (Скорость vs Мощность vs Дальность)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAnalysisTab('thermal_bldc')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeAnalysisTab === 'thermal_bldc'
              ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>2. Электросиловая ВМГ & Тепловой Баланс BLDC</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAnalysisTab('wind_dynamics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeAnalysisTab === 'wind_dynamics'
              ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Wind className="w-4 h-4" />
          <span>3. Ветроустойчивость & Углы Тангажа</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAnalysisTab('bom_export')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeAnalysisTab === 'bom_export'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>4. Спецификация & Инженерный Отчет</span>
        </button>
      </div>

      {/* Main Analysis Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interactive Hardware Param Editor */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 font-mono text-xs text-slate-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              Параметры БПЛА & Нагрузки
            </span>
            <button
              type="button"
              onClick={() => handleSelectPreset(selectedPresetIndex)}
              className="text-[10px] text-slate-500 hover:text-cyan-400 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Сброс
            </button>
          </div>

          {/* Mass Sliders */}
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Сухая масса планера:</span>
                <span className="text-white font-bold">{specs.dryMassKg.toFixed(2)} кг</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={15}
                step={0.05}
                value={specs.dryMassKg}
                onChange={(e) => setSpecs({ ...specs, dryMassKg: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Полезная нагрузка (Payload):</span>
                <span className="text-amber-300 font-bold">{specs.payloadMassKg.toFixed(2)} кг</span>
              </div>
              <input
                type="range"
                min={0}
                max={12}
                step={0.05}
                value={specs.payloadMassKg}
                onChange={(e) => setSpecs({ ...specs, payloadMassKg: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="text-[10px] text-slate-500 text-right">
                Полная взлетная масса: {(specs.dryMassKg + specs.payloadMassKg).toFixed(2)} кг
              </div>
            </div>
          </div>

          {/* Battery Setup */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-slate-400 font-bold block text-[11px] text-indigo-300">
              Аккумуляторная Батарея (LiPo / Li-Ion)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500">Конфигурация (S):</span>
                <select
                  value={specs.batteryCells}
                  onChange={(e) => setSpecs({ ...specs, batteryCells: parseInt(e.target.value, 10) })}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl p-2 text-white outline-none focus:border-cyan-400"
                >
                  <option value={4}>4S (14.8V)</option>
                  <option value={6}>6S (22.2V)</option>
                  <option value={8}>8S (29.6V)</option>
                  <option value={12}>12S (44.4V)</option>
                  <option value={14}>14S (51.8V)</option>
                </select>
              </div>
              <div>
                <span className="text-[10px] text-slate-500">Емкость (мАч):</span>
                <input
                  type="number"
                  value={specs.batteryCapacityMah}
                  step={500}
                  min={1000}
                  max={60000}
                  onChange={(e) => setSpecs({ ...specs, batteryCapacityMah: parseInt(e.target.value, 10) || 1000 })}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl p-2 text-white outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Propeller & Motor */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-slate-400 font-bold block text-[11px] text-cyan-300">
              Винтомоторная Группа (Винт & BLDC)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500">Диаметр винта (дюйм):</span>
                <input
                  type="number"
                  value={specs.propellerDiameterInch}
                  step={0.5}
                  min={3}
                  max={40}
                  onChange={(e) => setSpecs({ ...specs, propellerDiameterInch: parseFloat(e.target.value) || 5 })}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl p-2 text-white outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500">Мотор KV (об/В):</span>
                <input
                  type="number"
                  value={specs.motorKv}
                  step={50}
                  min={80}
                  max={3500}
                  onChange={(e) => setSpecs({ ...specs, motorKv: parseInt(e.target.value, 10) || 100 })}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl p-2 text-white outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Environment */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-slate-400 font-bold block text-[11px] text-teal-300">
              Условия Окружающей Среды
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500">Высота над морем ({flightAltitudeM} м):</span>
                <input
                  type="range"
                  min={0}
                  max={5000}
                  step={100}
                  value={flightAltitudeM}
                  onChange={(e) => setFlightAltitudeM(parseInt(e.target.value, 10))}
                  className="w-full accent-teal-400 cursor-pointer"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500">Температура ({ambientTempC}°C):</span>
                <input
                  type="range"
                  min={-25}
                  max={50}
                  step={1}
                  value={ambientTempC}
                  onChange={(e) => setAmbientTempC(parseInt(e.target.value, 10))}
                  className="w-full accent-teal-400 cursor-pointer"
                />
              </div>
            </div>
            <div className="text-[10px] text-slate-500">
              Плотность воздуха: <span className="text-teal-300 font-bold">{calculations.airDensityKgM3.toFixed(3)} кг/м³</span>
            </div>
          </div>
        </div>

        {/* Center & Right Column: Interactive Graphs & Results */}
        <div className="lg:col-span-2 space-y-6">
          {activeAnalysisTab === 'flight_envelope' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    <span>Потребная Мощность и Дальность от Скорости Полета</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Кривая мощности БПЛА (Индуцированная + Профильная + Паразитная мощность планера)
                  </p>
                </div>
                <span className="text-xs font-mono px-3 py-1 rounded-xl bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Оптимальная V_cruise: ~45-60 км/ч
                </span>
              </div>

              {/* Chart */}
              <div className="h-72 w-full font-mono text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={calculations.speedCurveData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="airspeedKmh"
                      stroke="#64748b"
                      label={{ value: 'Скорость полета (км/ч)', position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#38bdf8"
                      label={{ value: 'Мощность (Вт)', angle: -90, position: 'insideLeft', fill: '#38bdf8' }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#34d399"
                      label={{ value: 'Время (мин)', angle: 90, position: 'insideRight', fill: '#34d399' }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem' }}
                      formatter={(value: any, name: string) => {
                        if (name === 'totalPowerWatts') return [`${value} Вт`, 'Потребная Мощность'];
                        if (name === 'enduranceMin') return [`${value} мин`, 'Время Полета'];
                        if (name === 'rangeKm') return [`${value} км`, 'Дальность'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="totalPowerWatts"
                      name="Потребная Мощность (Вт)"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="enduranceMin"
                      name="Время Полета (мин)"
                      stroke="#34d399"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="rangeKm"
                      name="Макс. Дальность (км)"
                      stroke="#a855f7"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Insights Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs pt-2 border-t border-slate-800">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-cyan-300 font-bold">Энергетический минимум (Макс. Дальность):</span>
                  <p className="text-slate-400 leading-relaxed">
                    В горизонтальном полете на скорости 45-55 км/ч время полета выше, чем в чистом зависании, за счет обдувки винтов набегающим потоком (Translational Lift).
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-emerald-300 font-bold">Удельная Эффективность (г/Вт):</span>
                  <p className="text-slate-400 leading-relaxed">
                    Эффективность винтов в зависании:{' '}
                    <span className="text-emerald-400 font-bold">
                      {((calculations.totalWeightN / 9.81 * 1000) / calculations.totalHoverElectricalPowerWatts).toFixed(2)} г/Вт
                    </span>. Для длительного полета рекомендуется &gt; 7.0 г/Вт.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeAnalysisTab === 'thermal_bldc' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Flame className="w-4 h-4 text-rose-400" />
                    <span>Электродинамика и Тепловой Баланс Бесколлекторных Моторов (BLDC)</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Расчет активных потерь в меди обмоток $I^2 R$, вихревых токов в статоре и нагрева
                  </p>
                </div>
              </div>

              {/* Thermal Metric Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-slate-400">Ток на мотор в зависании:</span>
                  <div className="text-xl font-bold text-cyan-400">
                    {(calculations.hoverCurrentAmps / calculations.numRotors).toFixed(1)} А
                  </div>
                  <span className="text-[10px] text-slate-500">
                    ESC запас: {Math.round(((calculations.hoverCurrentAmps / calculations.numRotors) / specs.motorMaxCurrentAmps) * 100)}% от макс.
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-slate-400">Ток полного газа (100%):</span>
                  <div className="text-xl font-bold text-amber-400">
                    {(calculations.maxDischargeCurrentAmps / calculations.numRotors).toFixed(1)} А
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Лимит мотора: {specs.motorMaxCurrentAmps} А
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-slate-400">Стационарная Температура:</span>
                  <div className="text-xl font-bold text-rose-400">
                    +{calculations.motorSteadyTempHoverC.toFixed(1)} °C
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Магниты N52H держат до 120°C
                  </span>
                </div>
              </div>

              {/* Motor Specifications Table */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
                <span className="text-cyan-300 font-bold block border-b border-slate-800 pb-1">
                  ЭЛЕКТРОТЕХНИЧЕСКИЙ ПАСПОРТ СИЛОВОЙ УСТАНОВКИ:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-400">
                  <div>
                    <span className="text-slate-500 block">Размер статора:</span>
                    <span className="text-white font-bold">{specs.motorStatorSize}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Сопротивление фазы:</span>
                    <span className="text-white font-bold">{specs.motorInternalResistanceOhms} Ом</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Напряжение батареи:</span>
                    <span className="text-white font-bold">{calculations.nominalVoltage.toFixed(1)} В ({specs.batteryCells}S)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Пиковый C-Rate АКБ:</span>
                    <span className="text-emerald-400 font-bold">{specs.batteryC_Rating}C ({specs.batteryCapacityMah / 1000 * specs.batteryC_Rating}A)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeAnalysisTab === 'wind_dynamics' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Wind className="w-4 h-4 text-teal-400" />
                    <span>Устойчивость к Боковому Ветру и Углы Тангажа</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Расчет балансировочного угла наклона дрона для компенсации аэродинамического сноса
                  </p>
                </div>
              </div>

              {/* Wind Speed Interactive Slider */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 font-mono text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Скорость ветра на эшелоне:</span>
                  <span className="text-teal-300 font-bold">{ambientWindMs} м/с ({(ambientWindMs * 3.6).toFixed(1)} км/ч)</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={25}
                  step={0.5}
                  value={ambientWindMs}
                  onChange={(e) => setAmbientWindMs(parseFloat(e.target.value))}
                  className="w-full accent-teal-400 cursor-pointer"
                />
              </div>

              {/* Pitch Angle Visual Feedback */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-slate-400">Требуемый угол наклона (Tilt Angle):</span>
                  <div className="text-3xl font-black text-teal-400">
                    {calculations.tiltAngleDeg.toFixed(1)}°
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Угол наклона рамы автопилотом для удержания GPS точки при ветре {ambientWindMs} м/с.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-slate-400">Макс. допустимый порыв ветра:</span>
                  <div className="text-3xl font-black text-amber-400">
                    {specs.maxWindGustResistanceMs} м/с
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Превышение этого значения приводит к невозможности удержания горизонта и риску опрокидывания.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeAnalysisTab === 'bom_export' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 font-mono text-xs text-slate-300">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Спецификация (BOM) & Инженерное Заключение</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Сводный расчет для согласования производства и закупки компонентов
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span>1. Архитектура Планера:</span>
                  <span className="text-white font-bold uppercase">{specs.architecture.replace('_', ' ')}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span>2. Силовые Двигатели (BLDC):</span>
                  <span className="text-cyan-300 font-bold">{calculations.numRotors}x {specs.motorStatorSize} ({specs.motorKv} KV)</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span>3. Несущие Пропеллеры:</span>
                  <span className="text-amber-300 font-bold">{calculations.numRotors}x {specs.propellerDiameterInch}"x{specs.propellerPitchInch}" ({specs.propellerBlades} лопасти)</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span>4. Аккумуляторная Батарея:</span>
                  <span className="text-purple-300 font-bold">{specs.batteryCells}S {specs.batteryCapacityMah} мАч ({calculations.usableBatteryEnergyWh.toFixed(1)} Вт·ч)</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span>5. Полетное Время (Зависание):</span>
                  <span className="text-emerald-400 font-black">{calculations.hoverEnduranceMinutes.toFixed(1)} минут</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
