import React, { useState } from 'react';
import {
  X,
  Compass,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sliders,
  Sparkles,
  Plane,
  RotateCcw,
  Zap,
  Layers,
  Scale,
  Gauge,
  Rocket,
  ShieldCheck,
  AlertTriangle,
  Play,
  FileCheck,
} from 'lucide-react';
import { MathView } from '../MathView';

export interface AircraftDesignPresetResult {
  name: string;
  category: 'uav' | 'civil' | 'supersonic' | 'space';
  mission: string;
  mtowKg: number;
  payloadKg: number;
  spanM: number;
  rootChordM: number;
  tipChordM: number;
  sweepDeg: number;
  dihedralDeg: number;
  airfoil: string;
  thrustN: number;
  cruiseSpeedKmh: number;
  cruiseAltitudeM: number;
  wingAreaM2: number;
  aspectRatio: number;
  taperRatio: number;
  macM: number;
  cgPercentMac: number;
  staticMarginPct: number;
  calculatedClCruise: number;
  calculatedCdCruise: number;
  calculatedLdMax: number;
  stallSpeedKmh: number;
  flightTimeMinutes: number;
}

interface AircraftDesignWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDesign?: (result: AircraftDesignPresetResult) => void;
}

interface MissionTemplate {
  id: string;
  title: string;
  category: 'uav' | 'civil' | 'supersonic' | 'space';
  icon: any;
  desc: string;
  defaultMtow: number;
  defaultPayload: number;
  defaultSpan: number;
  defaultRootChord: number;
  defaultTipChord: number;
  defaultSweep: number;
  defaultDihedral: number;
  defaultAirfoil: string;
  defaultThrustN: number;
  defaultSpeedKmh: number;
  defaultAltM: number;
}

const MISSION_TEMPLATES: MissionTemplate[] = [
  {
    id: 'fpv_recon',
    title: 'FPV БПЛА-Разведчик Длинного Радиуса',
    category: 'uav',
    icon: Compass,
    desc: 'Компактное крыло для продолжительного полета с камерой и LiDAR (время полета > 90 мин).',
    defaultMtow: 3.5,
    defaultPayload: 0.8,
    defaultSpan: 1.8,
    defaultRootChord: 0.28,
    defaultTipChord: 0.16,
    defaultSweep: 6,
    defaultDihedral: 2,
    defaultAirfoil: 'Clark-Y',
    defaultThrustN: 22,
    defaultSpeedKmh: 75,
    defaultAltM: 800,
  },
  {
    id: 'heavy_cargo_uav',
    title: 'Тяжелый Транспортный БПЛА (VTOL / STOL)',
    category: 'uav',
    icon: Layers,
    desc: 'Двухмоторный аппарат для доставки грузов массой до 15 кг на неподготовленные площадки.',
    defaultMtow: 45.0,
    defaultPayload: 15.0,
    defaultSpan: 3.6,
    defaultRootChord: 0.55,
    defaultTipChord: 0.35,
    defaultSweep: 2,
    defaultDihedral: 3.5,
    defaultAirfoil: 'Selig S1223',
    defaultThrustN: 280,
    defaultSpeedKmh: 110,
    defaultAltM: 1500,
  },
  {
    id: 'stol_utility',
    title: 'Многоцелевой Самолет КВП (Аналог Ан-2)',
    category: 'civil',
    icon: Plane,
    desc: 'Надежный биплан / подкосный моноплан с развитой механизацией для взлета с коротких полос.',
    defaultMtow: 5200,
    defaultPayload: 1400,
    defaultSpan: 18.2,
    defaultRootChord: 2.4,
    defaultTipChord: 2.4,
    defaultSweep: 0,
    defaultDihedral: 3,
    defaultAirfoil: 'NACA 4412',
    defaultThrustN: 14500,
    defaultSpeedKmh: 185,
    defaultAltM: 2500,
  },
  {
    id: 'regional_jet',
    title: 'Региональный Магистральный Лайнер (SSJ / E190)',
    category: 'civil',
    icon: Gauge,
    desc: 'Экономичный двухдвигательный лайнер с умеренной стреловидностью и винглетами.',
    defaultMtow: 46000,
    defaultPayload: 12500,
    defaultSpan: 28.0,
    defaultRootChord: 4.8,
    defaultTipChord: 1.4,
    defaultSweep: 25,
    defaultDihedral: 5,
    defaultAirfoil: 'Whitcomb Supercritical',
    defaultThrustN: 154000,
    defaultSpeedKmh: 830,
    defaultAltM: 10600,
  },
  {
    id: 'supersonic_interceptor',
    title: 'Сверхзвуковой Перехватчик / Истребитель',
    category: 'supersonic',
    icon: Rocket,
    desc: 'Стреловидное крыло малого удлинения с тонким симметричным профилем для полетов на M = 2.0+.',
    defaultMtow: 24000,
    defaultPayload: 6000,
    defaultSpan: 14.5,
    defaultRootChord: 6.2,
    defaultTipChord: 1.2,
    defaultSweep: 48,
    defaultDihedral: -2.5,
    defaultAirfoil: 'Biconvex Supersonic 4%',
    defaultThrustN: 240000,
    defaultSpeedKmh: 2150,
    defaultAltM: 14000,
  },
];

export const AircraftDesignWizardModal: React.FC<AircraftDesignWizardProps> = ({
  isOpen,
  onClose,
  onApplyDesign,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('fpv_recon');

  // Step 2: Weight & Performance inputs
  const [mtowKg, setMtowKg] = useState<number>(3.5);
  const [payloadKg, setPayloadKg] = useState<number>(0.8);
  const [cruiseSpeedKmh, setCruiseSpeedKmh] = useState<number>(75);
  const [cruiseAltitudeM, setCruiseAltitudeM] = useState<number>(800);

  // Step 3: Wing Geometry inputs
  const [spanM, setSpanM] = useState<number>(1.8);
  const [rootChordM, setRootChordM] = useState<number>(0.28);
  const [tipChordM, setTipChordM] = useState<number>(0.16);
  const [sweepDeg, setSweepDeg] = useState<number>(6);
  const [dihedralDeg, setDihedralDeg] = useState<number>(2);
  const [selectedAirfoil, setSelectedAirfoil] = useState<string>('Clark-Y');

  // Step 4: Propulsion & Balance
  const [thrustN, setThrustN] = useState<number>(22);
  const [batteryFuelMassKg, setBatteryFuelMassKg] = useState<number>(1.1);
  const [cgPositionPercentMac, setCgPositionPercentMac] = useState<number>(25);

  if (!isOpen) return null;

  const handleSelectTemplate = (tpl: MissionTemplate) => {
    setSelectedTemplateId(tpl.id);
    setMtowKg(tpl.defaultMtow);
    setPayloadKg(tpl.defaultPayload);
    setCruiseSpeedKmh(tpl.defaultSpeedKmh);
    setCruiseAltitudeM(tpl.defaultAltM);
    setSpanM(tpl.defaultSpan);
    setRootChordM(tpl.defaultRootChord);
    setTipChordM(tpl.defaultTipChord);
    setSweepDeg(tpl.defaultSweep);
    setDihedralDeg(tpl.defaultDihedral);
    setSelectedAirfoil(tpl.defaultAirfoil);
    setThrustN(tpl.defaultThrustN);
    setBatteryFuelMassKg(tpl.defaultMtow * 0.3);
  };

  // Aerodynamic synthesis calculations
  const calculateSynthesis = (): AircraftDesignPresetResult => {
    const tpl = MISSION_TEMPLATES.find((t) => t.id === selectedTemplateId) || MISSION_TEMPLATES[0];

    // Wing area trapezoid S = b * (c_root + c_tip) / 2
    const wingAreaM2 = (spanM * (rootChordM + tipChordM)) / 2;
    const aspectRatio = (spanM * spanM) / Math.max(0.001, wingAreaM2);
    const taperRatio = tipChordM / Math.max(0.001, rootChordM);

    // Mean Aerodynamic Chord (MAC): c_mac = 2/3 * c_root * (1 + lambda + lambda^2) / (1 + lambda)
    const lam = taperRatio;
    const macM = (2 / 3) * rootChordM * ((1 + lam + lam * lam) / Math.max(0.01, 1 + lam));

    // Neutral point approximation (approx 32% - 35% of MAC for trapezoidal wing with sweep)
    const sweepCorrection = (sweepDeg / 45) * 0.04;
    const neutralPointPercent = 33 + sweepCorrection * 100;
    const staticMarginPct = neutralPointPercent - cgPositionPercentMac;

    // Cruise dynamic pressure q = 0.5 * rho * V^2
    const rhoSeaLevel = 1.225;
    // Rho at cruise alt: approx exponential decay
    const rhoAlt = rhoSeaLevel * Math.exp(-cruiseAltitudeM / 8500);
    const speedMps = cruiseSpeedKmh / 3.6;
    const qCruise = 0.5 * rhoAlt * speedMps * speedMps;

    // Required lift L = W = m * g
    const g = 9.80665;
    const weightN = mtowKg * g;
    const calculatedClCruise = weightN / Math.max(0.1, qCruise * wingAreaM2);

    // Profile drag C_D0 approximation
    let cd0 = 0.022;
    if (selectedAirfoil.includes('Supersonic')) cd0 = 0.015;
    if (selectedAirfoil.includes('S1223')) cd0 = 0.035;

    // Oswald efficiency factor e = 1 / (1.05 + 0.007 * pi * AR)
    const oswaldE = Math.min(0.95, Math.max(0.65, 1.78 * (1 - 0.045 * Math.pow(aspectRatio, 0.68)) - 0.64));
    const kInduced = 1 / (Math.PI * aspectRatio * oswaldE);
    const calculatedCdCruise = cd0 + kInduced * (calculatedClCruise * calculatedClCruise);

    // Aerodynamic efficiency (L/D) max
    const calculatedLdMax = 1 / (2 * Math.sqrt(cd0 * kInduced));

    // Stall speed V_stall = sqrt(2*W / (rho0 * S * CLmax))
    let clMax = 1.4;
    if (selectedAirfoil.includes('S1223')) clMax = 2.1;
    if (selectedAirfoil.includes('NACA 4412')) clMax = 1.6;
    if (selectedAirfoil.includes('Supersonic')) clMax = 1.1;

    const vStallMps = Math.sqrt((2 * weightN) / (rhoSeaLevel * wingAreaM2 * clMax));
    const stallSpeedKmh = vStallMps * 3.6;

    // Estimated flight endurance
    let flightTimeMinutes = 60;
    if (tpl.category === 'uav') {
      const powerCruiseWatts = (weightN / Math.max(4, calculatedLdMax)) * speedMps;
      const batteryEnergyWh = (batteryFuelMassKg / mtowKg) * 180 * mtowKg; // 180 Wh/kg Li-Ion
      flightTimeMinutes = (batteryEnergyWh / Math.max(10, powerCruiseWatts)) * 60 * 0.85;
    } else if (tpl.category === 'civil') {
      flightTimeMinutes = (batteryFuelMassKg / 2500) * 180;
    } else {
      flightTimeMinutes = (batteryFuelMassKg / 3500) * 90;
    }

    return {
      name: `${tpl.title} (${spanM.toFixed(1)}м, ${mtowKg}кг)`,
      category: tpl.category,
      mission: tpl.title,
      mtowKg,
      payloadKg,
      spanM,
      rootChordM,
      tipChordM,
      sweepDeg,
      dihedralDeg,
      airfoil: selectedAirfoil,
      thrustN,
      cruiseSpeedKmh,
      cruiseAltitudeM,
      wingAreaM2,
      aspectRatio,
      taperRatio,
      macM,
      cgPercentMac: cgPositionPercentMac,
      staticMarginPct,
      calculatedClCruise,
      calculatedCdCruise,
      calculatedLdMax,
      stallSpeedKmh,
      flightTimeMinutes: Math.max(5, flightTimeMinutes),
    };
  };

  const synthesisResult = calculateSynthesis();

  const handleFinishAndApply = () => {
    if (onApplyDesign) {
      onApplyDesign(synthesisResult);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn font-mono">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-indigo-500/40 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-b border-indigo-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-md shadow-indigo-950/50">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Мастер Проектирования Летательных Аппаратов</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Шаг {currentStep} из 5
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Интерактивный синтез аэродинамической компоновки, расчет поляр и проверка центровки
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Indicator */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950 border-b border-slate-800 overflow-x-auto text-xs">
          {[
            { step: 1, label: '1. Назначение & Миссия' },
            { step: 2, label: '2. Масса & Скорость' },
            { step: 3, label: '3. Геометрия Крыла' },
            { step: 4, label: '4. ВМГ & Центровка' },
            { step: 5, label: '5. Итоговая Сводка' },
          ].map((item) => (
            <button
              key={item.step}
              type="button"
              onClick={() => setCurrentStep(item.step)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                currentStep === item.step
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 font-bold'
                  : currentStep > item.step
                  ? 'text-emerald-400 font-semibold'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  currentStep === item.step
                    ? 'bg-indigo-500 text-white'
                    : currentStep > item.step
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {currentStep > item.step ? '✓' : item.step}
              </div>
              <span className="font-sans text-xs">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Wizard Main Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* STEP 1: MISSION & TEMPLATE */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-xs text-slate-300 font-sans">
                Выберите целевую миссию и класс летательного аппарата. Мастер предварительно сконфигурирует базовые параметры:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {MISSION_TEMPLATES.map((tpl) => {
                  const Icon = tpl.icon;
                  const isSelected = selectedTemplateId === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-lg shadow-indigo-950/60'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 font-bold text-sm text-indigo-300">
                            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                              <Icon className="w-4 h-4" />
                            </div>
                            <span>{tpl.title}</span>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-400 font-sans leading-relaxed">{tpl.desc}</p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-800/80 flex justify-between text-[11px] font-mono text-slate-400">
                        <span>Размах: {tpl.defaultSpan} м</span>
                        <span>MTOW: {tpl.defaultMtow} кг</span>
                        <span>V_cr: {tpl.defaultSpeedKmh} км/ч</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: MASS & PERFORMANCE */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                  <span className="text-xs font-bold text-indigo-300 block border-b border-slate-800 pb-2">
                    Массовые Параметры
                  </span>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Максимальная взлетная масса (MTOW):</span>
                      <strong className="text-indigo-400 font-mono">{mtowKg} кг</strong>
                    </div>
                    <input
                      type="number"
                      min="0.1"
                      step="0.5"
                      value={mtowKg}
                      onChange={(e) => setMtowKg(Math.max(0.1, Number(e.target.value)))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Масса полезной нагрузки (Payload):</span>
                      <strong className="text-indigo-400 font-mono">{payloadKg} кг ({((payloadKg / Math.max(0.1, mtowKg)) * 100).toFixed(1)}% MTOW)</strong>
                    </div>
                    <input
                      type="number"
                      min="0.0"
                      step="0.2"
                      value={payloadKg}
                      onChange={(e) => setPayloadKg(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                  <span className="text-xs font-bold text-indigo-300 block border-b border-slate-800 pb-2">
                    Летно-Технические Требования
                  </span>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Крейсерская скорость полета:</span>
                      <strong className="text-indigo-400 font-mono">{cruiseSpeedKmh} км/ч ({(cruiseSpeedKmh / 3.6).toFixed(1)} м/с)</strong>
                    </div>
                    <input
                      type="number"
                      min="10"
                      step="5"
                      value={cruiseSpeedKmh}
                      onChange={(e) => setCruiseSpeedKmh(Math.max(10, Number(e.target.value)))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Крейсерская высота полета:</span>
                      <strong className="text-indigo-400 font-mono">{cruiseAltitudeM} м</strong>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={cruiseAltitudeM}
                      onChange={(e) => setCruiseAltitudeM(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: WING GEOMETRY & AIRFOIL */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3.5">
                  <span className="text-xs font-bold text-indigo-300 block border-b border-slate-800 pb-2">
                    Геометрия Крыла в Плане
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-300">Размах крыла $b$ (м):</label>
                      <input
                        type="number"
                        min="0.3"
                        step="0.1"
                        value={spanM}
                        onChange={(e) => setSpanM(Math.max(0.2, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-300">Корневая хорда c_root (м):</label>
                      <input
                        type="number"
                        min="0.05"
                        step="0.05"
                        value={rootChordM}
                        onChange={(e) => setRootChordM(Math.max(0.05, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-300">Концевая хорда c_tip (м):</label>
                      <input
                        type="number"
                        min="0.02"
                        step="0.02"
                        value={tipChordM}
                        onChange={(e) => setTipChordM(Math.max(0.02, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-300">Стреловидность $\chi$ (град):</label>
                      <input
                        type="number"
                        min="-15"
                        max="65"
                        step="1"
                        value={sweepDeg}
                        onChange={(e) => setSweepDeg(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300">Поперечное V крыла (град):</label>
                    <input
                      type="range"
                      min="-5"
                      max="10"
                      step="0.5"
                      value={dihedralDeg}
                      onChange={(e) => setDihedralDeg(Number(e.target.value))}
                      className="w-full accent-indigo-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>-5° (Отрицательное V)</span>
                      <span>0°</span>
                      <span>+10° (Высокая устойчивость по крену)</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3.5">
                  <span className="text-xs font-bold text-indigo-300 block border-b border-slate-800 pb-2">
                    Выбор Аэродинамического Профиля
                  </span>

                  <div className="space-y-2">
                    {[
                      { name: 'Clark-Y', desc: 'Универсальный профиль с плоской нижней гранью (легкая постройка, высокий Clmax)' },
                      { name: 'NACA 4412', desc: 'Классический несущий профиль авиации общего назначения' },
                      { name: 'Selig S1223', desc: 'Сверхнесущий профиль для КВП (STOL) и БПЛА с тяжелой полезной нагрузкой' },
                      { name: 'Whitcomb Supercritical', desc: 'Сверхкритический профиль для околозвуковых пассажирских лайнеров' },
                      { name: 'Biconvex Supersonic 4%', desc: 'Тонкий двояковыпуклый профиль для сверхзвуковых скоростей (M > 1.5)' },
                    ].map((af) => (
                      <div
                        key={af.name}
                        onClick={() => setSelectedAirfoil(af.name)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer text-xs ${
                          selectedAirfoil === af.name
                            ? 'bg-indigo-500/20 border-indigo-500 text-white font-semibold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <strong className="text-indigo-300 font-mono">{af.name}</strong>
                          {selectedAirfoil === af.name && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <p className="text-[11px] font-sans text-slate-400 mt-0.5">{af.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PROPULSION & CG BALANCE */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                  <span className="text-xs font-bold text-indigo-300 block border-b border-slate-800 pb-2">
                    Силовая Установка (ВМГ / Двигатели)
                  </span>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Статическая тяга двигателя ($T$):</span>
                      <strong className="text-indigo-400 font-mono">{thrustN} Н ({((thrustN / 9.81)).toFixed(1)} кгс)</strong>
                    </div>
                    <input
                      type="number"
                      min="1"
                      step="5"
                      value={thrustN}
                      onChange={(e) => setThrustN(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Запас топлива / АКБ (m_fuel):</span>
                      <strong className="text-indigo-400 font-mono">{batteryFuelMassKg} кг ({((batteryFuelMassKg / Math.max(0.1, mtowKg)) * 100).toFixed(1)}% MTOW)</strong>
                    </div>
                    <input
                      type="number"
                      min="0.1"
                      step="0.2"
                      value={batteryFuelMassKg}
                      onChange={(e) => setBatteryFuelMassKg(Math.max(0.1, Number(e.target.value)))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                  <span className="text-xs font-bold text-indigo-300 block border-b border-slate-800 pb-2">
                    Центровка и Положение ЦТ (X_CG)
                  </span>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Положение Центра Тяжести:</span>
                      <strong className="text-emerald-400 font-mono">{cgPositionPercentMac}% САХ</strong>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="40"
                      step="1"
                      value={cgPositionPercentMac}
                      onChange={(e) => setCgPositionPercentMac(Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>15% (Передняя)</span>
                      <span>25% (Оптимум)</span>
                      <span>40% (Задняя опасная)</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-sans text-slate-300 space-y-1">
                    <div className="text-[11px] text-slate-400">Прогнозируемый запас статической устойчивости:</div>
                    <div className="text-emerald-400 font-bold font-mono text-sm">
                      SM = +{synthesisResult.staticMarginPct.toFixed(1)}% САХ (Безопасный полет)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: FINAL SYNTHESIS & REVIEW */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-950 to-slate-900 border border-indigo-500/40 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Синтезированная Модель:</span>
                    <span className="text-indigo-300">{synthesisResult.name}</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    Профиль: {synthesisResult.airfoil} • Площадь: {synthesisResult.wingAreaM2.toFixed(3)} м² • Удлинение: {synthesisResult.aspectRatio.toFixed(2)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleFinishAndApply}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/60 cursor-pointer transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Применить в Студию & 3D CFD</span>
                </button>
              </div>

              {/* Grid of synthesized parameters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400">Потребный $C_L$ на крейсере:</span>
                  <div className="text-base font-bold text-cyan-300 font-mono">
                    {synthesisResult.calculatedClCruise.toFixed(3)}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400">Коэфф. сопротивления $C_D$:</span>
                  <div className="text-base font-bold text-indigo-300 font-mono">
                    {synthesisResult.calculatedCdCruise.toFixed(4)}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400">Макс. качество K_max:</span>
                  <div className="text-base font-bold text-emerald-300 font-mono">
                    {synthesisResult.calculatedLdMax.toFixed(1)} ед.
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400">Скорость сваливания:</span>
                  <div className="text-base font-bold text-rose-300 font-mono">
                    {synthesisResult.stallSpeedKmh.toFixed(1)} км/ч
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400">Длина хорды САХ (b_MAC):</span>
                  <div className="text-base font-bold text-slate-200 font-mono">
                    {synthesisResult.macM.toFixed(3)} м
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400">Сужение крыла ($\eta$):</span>
                  <div className="text-base font-bold text-slate-200 font-mono">
                    {synthesisResult.taperRatio.toFixed(2)}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400">Запас устойчивости $SM$:</span>
                  <div className="text-base font-bold text-emerald-300 font-mono">
                    +{synthesisResult.staticMarginPct.toFixed(1)}%
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400">Оценочное время полета:</span>
                  <div className="text-base font-bold text-amber-300 font-mono">
                    ≈ {synthesisResult.flightTimeMinutes.toFixed(0)} мин
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Bottom Navigation Buttons */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-t border-slate-800 text-xs">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            className="px-3.5 py-1.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Назад</span>
          </button>

          <div className="text-[11px] text-slate-500 font-sans">
            Шаг {currentStep} из 5
          </div>

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1))}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-950/50"
            >
              <span>Далее</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinishAndApply}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Завершить & Применить</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
