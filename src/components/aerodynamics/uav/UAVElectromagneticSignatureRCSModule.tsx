// ============================================================================
// UAV Radar Cross Section (RCS / ЭПР) & Stealth Electromagnetic Signature Studio
// Physical Optics (PO), RAM Absorber Coating, Radar Equation & Detection Range
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Radio,
  Shield,
  Eye,
  Activity,
  Zap,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Layers,
  Crosshair,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { FullscreenGraphButton } from '../../telemetry/FullscreenGraphButton';

export type DroneStealthArchType = 'quadcopter_fpv' | 'classic_airplane_uav' | 'flying_wing_stealth' | 'faceted_stealth_cruiser';
export type RadarBandType = 'L_band_1ghz' | 'S_band_3ghz' | 'X_band_10ghz' | 'Ka_band_35ghz';

export interface ThreatRadarSystem {
  id: string;
  name: string;
  type: string;
  frequencyGhz: number;
  txPowerKw: number;
  antennaGainDb: number;
  minRxSensDbm: number;
  nominalDetectionRangeKm: number; // against 1 m^2 RCS
}

export const THREAT_RADARS: ThreatRadarSystem[] = [
  {
    id: 'anti_drone_cram_ka',
    name: 'Тактический C-UAS Радар (Ka-диапазон 35 ГГц)',
    type: 'Ближняя ПВО / РЛС защиты объектов',
    frequencyGhz: 35.0,
    txPowerKw: 0.1,
    antennaGainDb: 38,
    minRxSensDbm: -110,
    nominalDetectionRangeKm: 8.0,
  },
  {
    id: 'pantsir_sam_xband',
    name: 'РЛС Обнаружения & Сопровождения ЗРК (X-диапазон 10 ГГц)',
    type: 'Зенитный ракетно-пушечный комплекс',
    frequencyGhz: 10.0,
    txPowerKw: 25.0,
    antennaGainDb: 42,
    minRxSensDbm: -115,
    nominalDetectionRangeKm: 36.0,
  },
  {
    id: 'surveillance_sband',
    name: 'Обзорная РЛС ПВО 3D (S-диапазон 3 ГГц)',
    type: 'Радиотехнические войска ПВО',
    frequencyGhz: 3.0,
    txPowerKw: 150.0,
    antennaGainDb: 35,
    minRxSensDbm: -118,
    nominalDetectionRangeKm: 180.0,
  },
  {
    id: 'fighter_radar_xband',
    name: 'БРЛС Истребителя с АФАР (X-диапазон 9.5 ГГц)',
    type: 'Бортовой радар перехватчика',
    frequencyGhz: 9.5,
    txPowerKw: 15.0,
    antennaGainDb: 36,
    minRxSensDbm: -112,
    nominalDetectionRangeKm: 120.0,
  },
];

export const UAVElectromagneticSignatureRCSModule: React.FC = () => {
  const [airframe, setAirframe] = useState<DroneStealthArchType>('flying_wing_stealth');
  const [selectedRadarIdx, setSelectedRadarIdx] = useState<number>(1);
  const [hasRamCoating, setHasRamCoating] = useState<boolean>(true);
  const [ramThicknessMm, setRamThicknessMm] = useState<number>(1.8);
  const [leadingEdgeSweepDeg, setLeadingEdgeSweepDeg] = useState<number>(45);
  const [propellerMaterial, setPropellerMaterial] = useState<'carbon_fiber' | 'nylon_plastic' | 'shrouded_internal'>('nylon_plastic');

  const currentRadar = THREAT_RADARS[selectedRadarIdx];

  // Base RCS Characteristics of Airframe Geometry
  const airframeMeta = useMemo(() => {
    switch (airframe) {
      case 'quadcopter_fpv':
        return {
          name: 'Квадрокоптер FPV / 4 мотора',
          noseRcsM2: 0.04,
          beamRcsM2: 0.08,
          tailRcsM2: 0.05,
          desc: 'Открытые металлические моторы и карбоновые лучи создают устойчивые вторичные отражатели.',
        };
      case 'classic_airplane_uav':
        return {
          name: 'Классический самолетный БПЛА с килем',
          noseRcsM2: 0.35,
          beamRcsM2: 1.45,
          tailRcsM2: 0.65,
          desc: 'Прямые углы между крылом, фюзеляжем и вертикальным килем образуют уголковые отражатели.',
        };
      case 'flying_wing_stealth':
        return {
          name: 'Малозаметное Летающее Крыло (Flying Wing)',
          noseRcsM2: 0.008,
          beamRcsM2: 0.045,
          tailRcsM2: 0.015,
          desc: 'Отсутствие вертикального оперения, параллельные стреловидные кромки, сглаженный центроплан.',
        };
      case 'faceted_stealth_cruiser':
        return {
          name: 'Граненый Stealth-крейсер (S-образный канал)',
          noseRcsM2: 0.0015,
          beamRcsM2: 0.018,
          tailRcsM2: 0.005,
          desc: 'Максимальная оптимизация геометрии: экранированное сопло, V-образный киль, S-образный воздухозаборник.',
        };
    }
  }, [airframe]);

  // RAM Coating attenuation (dB) as a function of radar frequency & thickness
  const ramAttenuationDb = useMemo(() => {
    if (!hasRamCoating) return 0;
    // Resonant Salisbury screen absorption peak around target frequency
    const freq = currentRadar.frequencyGhz;
    const baseAtten = Math.min(22, (ramThicknessMm * 4.5) * (freq / 10));
    return baseAtten;
  }, [hasRamCoating, ramThicknessMm, currentRadar]);

  // Propeller scattering contribution
  const propRcsPenalty = useMemo(() => {
    switch (propellerMaterial) {
      case 'carbon_fiber':
        return 1.4; // conductive reflection
      case 'nylon_plastic':
        return 1.05; // dielectric semi-transparent
      case 'shrouded_internal':
        return 0.95; // shielded inside duct
    }
  }, [propellerMaterial]);

  // RCS and Radar Range Calculations
  const calculations = useMemo(() => {
    const ramLinearFactor = Math.pow(10, -ramAttenuationDb / 10);
    const sweepFactor = Math.cos((leadingEdgeSweepDeg * Math.PI) / 180);

    const calcEffectiveRcs = (baseRcs: number) => {
      return Math.max(0.0001, baseRcs * ramLinearFactor * propRcsPenalty * (0.5 + 0.5 * sweepFactor));
    };

    const noseRcs = calcEffectiveRcs(airframeMeta.noseRcsM2);
    const beamRcs = calcEffectiveRcs(airframeMeta.beamRcsM2);
    const tailRcs = calcEffectiveRcs(airframeMeta.tailRcsM2);
    const meanRcs = (noseRcs * 2 + beamRcs + tailRcs) / 4;

    const rcsDbsm = 10 * Math.log10(meanRcs);

    // Radar Equation Range: R_det = R_0 * (sigma / sigma_0)^(1/4)
    const nominalR0 = currentRadar.nominalDetectionRangeKm; // for 1.0 m^2
    const noseRangeKm = nominalR0 * Math.pow(noseRcs / 1.0, 0.25);
    const beamRangeKm = nominalR0 * Math.pow(beamRcs / 1.0, 0.25);
    const tailRangeKm = nominalR0 * Math.pow(tailRcs / 1.0, 0.25);
    const meanRangeKm = nominalR0 * Math.pow(meanRcs / 1.0, 0.25);

    // Radar Horizon at 150m flight altitude against ground radar at 15m mast:
    // D_horiz = 3.57 * (sqrt(h1) + sqrt(h2)) = 3.57 * (sqrt(15) + sqrt(150)) = 57.5 km
    const radarHorizonKm = 3.57 * (Math.sqrt(15) + Math.sqrt(150));
    const effectiveDetectionRangeKm = Math.min(radarHorizonKm, meanRangeKm);

    return {
      noseRcs,
      beamRcs,
      tailRcs,
      meanRcs,
      rcsDbsm,
      noseRangeKm,
      beamRangeKm,
      tailRangeKm,
      meanRangeKm,
      effectiveDetectionRangeKm,
      radarHorizonKm,
    };
  }, [airframeMeta, ramAttenuationDb, propRcsPenalty, leadingEdgeSweepDeg, currentRadar]);

  // Polar Diagram Data (360 degrees in 15 deg steps)
  const polarDiagramData = useMemo(() => {
    const data = [];
    for (let angle = 0; angle < 360; angle += 15) {
      const rad = (angle * Math.PI) / 180;
      // Front is 0 deg, Right is 90, Back is 180, Left is 270
      const isNose = Math.abs(Math.sin(rad)) < 0.35 && Math.cos(rad) > 0;
      const isBeam = Math.abs(Math.cos(rad)) < 0.35;
      const isTail = Math.abs(Math.sin(rad)) < 0.35 && Math.cos(rad) < 0;

      let rcs = calculations.noseRcs;
      if (isBeam) {
        rcs = calculations.beamRcs;
      } else if (isTail) {
        rcs = calculations.tailRcs;
      } else {
        // transition
        const sinPart = Math.abs(Math.sin(rad));
        rcs = calculations.noseRcs * (1 - sinPart) + calculations.beamRcs * sinPart;
      }

      // Add angular lobe ripples
      const lobeRipple = 1.0 + 0.25 * Math.sin(angle * 8 * (Math.PI / 180));
      const finalRcs = rcs * lobeRipple;
      const rcsDb = parseFloat((10 * Math.log10(Math.max(0.0001, finalRcs))).toFixed(1));

      data.push({
        angle: `${angle}°`,
        rcsDb: rcsDb + 40, // offset for visual scale in polar chart
        realRcsDb: rcsDb,
        rcsM2: parseFloat(finalRcs.toFixed(4)),
      });
    }
    return data;
  }, [calculations]);

  // Threat Detection Distance Comparison
  const radarComparisonData = useMemo(() => {
    return THREAT_RADARS.map((radar) => {
      const detRangeKm = radar.nominalDetectionRangeKm * Math.pow(calculations.meanRcs / 1.0, 0.25);
      const standardRangeKm = radar.nominalDetectionRangeKm;
      return {
        name: radar.name.split('(')[0],
        stealthRange: parseFloat(detRangeKm.toFixed(1)),
        standardRange: parseFloat(standardRangeKm.toFixed(1)),
      };
    });
  }, [calculations.meanRcs]);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Header Card */}
      <div className="bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-purple-900/50 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-500/40 text-purple-400">
              <Radio className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>ЭПР БПЛА & Малозаметность (Stealth RCS Studio)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Physical Optics & RAM Absorbers
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Моделирование эффективной поверхности рассеяния (ЭПР), радиопоглощающих покрытий и зон обнаружения РЛС ПВО.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Средняя ЭПР (RCS)</span>
            <Crosshair className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">
            {calculations.meanRcs.toFixed(4)} <span className="text-xs text-slate-400">м²</span>
          </div>
          <div className="text-[10px] text-slate-500">{calculations.rcsDbsm.toFixed(1)} dBsm</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Носовая ЭПР</span>
            <Eye className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {calculations.noseRcs.toFixed(4)} <span className="text-xs text-slate-400">м²</span>
          </div>
          <div className="text-[10px] text-slate-500">Лобовой ракурс (&plusmn;30&deg;)</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Дальность Захвата</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">
            {calculations.effectiveDetectionRangeKm.toFixed(1)} <span className="text-xs text-slate-400">км</span>
          </div>
          <div className="text-[10px] text-slate-500">Против {currentRadar.name.split('(')[0]}</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Поглощение RAM</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            -{ramAttenuationDb.toFixed(1)} <span className="text-xs text-slate-400">дБ</span>
          </div>
          <div className="text-[10px] text-slate-500">
            {hasRamCoating ? `Толщина ${ramThicknessMm} мм` : 'Без покрытия'}
          </div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Снижение Дальности</span>
            <TrendingDown className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            {( (1 - calculations.meanRangeKm / currentRadar.nominalDetectionRangeKm) * 100 ).toFixed(0)}%
          </div>
          <div className="text-[10px] text-slate-500">Относительно 1 м² цели</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Радиодиапазон</span>
            <Radio className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-2xl font-black text-pink-400">
            {currentRadar.frequencyGhz} <span className="text-xs text-slate-400">ГГц</span>
          </div>
          <div className="text-[10px] text-slate-500">{currentRadar.type.split('/')[0]}</div>
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Airframe Stealth Geometry */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>Геометрическая Конфигурация Планера</span>
            </h3>

            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'quadcopter_fpv', name: 'Квадрокоптер FPV (Открытая рама)' },
                { id: 'classic_airplane_uav', name: 'Классический БПЛА с килем (Орлан)' },
                { id: 'flying_wing_stealth', name: 'Малозаметное Летающее Крыло (ZALA)' },
                { id: 'faceted_stealth_cruiser', name: 'Граненый Stealth-крейсер (Охотник)' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAirframe(item.id as DroneStealthArchType)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer text-xs flex flex-col gap-1 ${
                    airframe === item.id
                      ? 'bg-gradient-to-r from-purple-950/90 to-slate-900 border-purple-400 text-white shadow-lg ring-1 ring-purple-400/40'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="font-bold text-purple-300 flex items-center justify-between">
                    <span>{item.name}</span>
                    {airframe === item.id && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 italic pt-1">{airframeMeta.desc}</p>
          </div>

          {/* Stealth Materials & Edge Alignment */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Радиопоглощающие Покрытия (RAM) & Кромки</span>
            </h3>

            {/* RAM Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div>
                <div className="text-xs font-bold text-slate-200">Ферритовое RAM Покрытие</div>
                <div className="text-[10px] text-slate-400">Поглощение электромагнитной волны в слое диэлектрика</div>
              </div>
              <button
                type="button"
                onClick={() => setHasRamCoating(!hasRamCoating)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  hasRamCoating ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform transform ${
                  hasRamCoating ? 'translate-x-7' : 'translate-x-1'
                } top-1 absolute`} />
              </button>
            </div>

            {/* RAM Thickness */}
            {hasRamCoating && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Толщина Слоя RAM Покрытия</span>
                  <span className="text-emerald-300 font-bold">{ramThicknessMm.toFixed(1)} мм</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.1"
                  value={ramThicknessMm}
                  onChange={(e) => setRamThicknessMm(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
              </div>
            )}

            {/* Leading Edge Sweep */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Стреловидность Передней Кромки Крыла</span>
                <span className="text-purple-300 font-bold">{leadingEdgeSweepDeg}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="65"
                step="5"
                value={leadingEdgeSweepDeg}
                onChange={(e) => setLeadingEdgeSweepDeg(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
              <div className="text-[10px] text-slate-500">
                Наклон кромки перенаправляет зеркальный блик волны вбок от РЛС.
              </div>
            </div>

            {/* Propeller Material */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Материал & Компоновка Винтов</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'carbon_fiber', label: 'Карбон' },
                  { id: 'nylon_plastic', label: 'Нейлон' },
                  { id: 'shrouded_internal', label: 'В туннеле' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPropellerMaterial(p.id as any)}
                    className={`py-2 px-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer text-center ${
                      propellerMaterial === p.id
                        ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Threat Radar Selector */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-rose-400" />
              <span>Целевая РЛС Противника</span>
            </h3>

            <div className="grid grid-cols-1 gap-2">
              {THREAT_RADARS.map((radar, idx) => (
                <button
                  key={radar.id}
                  type="button"
                  onClick={() => setSelectedRadarIdx(idx)}
                  className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer text-xs flex items-center justify-between ${
                    selectedRadarIdx === idx
                      ? 'bg-rose-950/80 border-rose-400 text-white shadow-lg ring-1 ring-rose-400/40'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="font-bold text-rose-300">{radar.name}</div>
                    <div className="text-[10px] text-slate-400">{radar.type} | f = {radar.frequencyGhz} ГГц</div>
                  </div>
                  {selectedRadarIdx === idx && <CheckCircle2 className="w-4 h-4 text-rose-400 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Polar Diagram & Detection Distance Charts (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Circular Polar RCS Diagram */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2">
                <Radio className="w-4 h-4 text-purple-400" />
                <span>Круговая Диаграмма Обратного Рассеяния ЭПР $\sigma(\theta)$ (дБсм)</span>
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-purple-300 border border-slate-700">
                0° = Нос | 180° = Хвост
              </span>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={polarDiagramData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="angle" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 50]} stroke="#64748b" tick={{ fontSize: 9 }} />
                  <Radar name="ЭПР диаграмма (дБсм)" dataKey="rcsDb" stroke="#c084fc" fill="#a855f7" fillOpacity={0.4} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-around text-center text-xs font-mono text-slate-400 pt-1">
              <div>
                <span className="text-slate-500">Нос (0°): </span>
                <span className="text-cyan-300 font-bold">{calculations.noseRcs.toFixed(4)} м²</span>
              </div>
              <div>
                <span className="text-slate-500">Борт (90°): </span>
                <span className="text-purple-300 font-bold">{calculations.beamRcs.toFixed(4)} м²</span>
              </div>
              <div>
                <span className="text-slate-500">Хвост (180°): </span>
                <span className="text-rose-300 font-bold">{calculations.tailRcs.toFixed(4)} м²</span>
              </div>
            </div>
          </div>

          {/* Comparison Detection Ranges */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-teal-300 flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-teal-400" />
                <span>Дальность Обнаружения (км) против РЛС: Stealth vs Стандарт 1 м²</span>
              </h3>
            </div>

            <div className="space-y-3 pt-2">
              {radarComparisonData.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">{item.name}</span>
                    <span className="text-emerald-400 font-bold">{item.stealthRange} км <span className="text-slate-500 text-[10px] font-normal">(вместо {item.standardRange} км)</span></span>
                  </div>
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${(item.stealthRange / item.standardRange) * 100}%` }}
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
