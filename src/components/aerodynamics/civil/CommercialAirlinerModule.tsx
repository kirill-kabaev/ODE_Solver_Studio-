// ============================================================================
// Commercial Airliners & Transonic Cruise Aerodynamics
// Mathematical Modeling: Supercritical Airfoils, Transonic Drag Rise & Mach Divergence (M_div),
// Wing Sweep Cosine Law, Breguet Range Equation & ETOPS 180/240 Performance
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Plane,
  Wind,
  Compass,
  Activity,
  Sliders,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Shield,
  TrendingUp,
  Zap,
  Gauge,
  Fuel,
  Navigation,
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
import { FullscreenGraphButton } from '../../telemetry/FullscreenGraphButton';

export type AirlinerType = 'narrow_body_a320' | 'wide_body_b787' | 'long_range_a350' | 'regional_ssj';

export interface AirlinerPreset {
  id: AirlinerType;
  name: string;
  categoryLabel: string;
  mtowKg: number;
  wingAreaM2: number;
  wingSpanM: number;
  wingSweepDeg: number;
  cruiseMach: number;
  cruiseAltitudeM: number;
  tsfcKgPerKNPerHr: number;
  baseLoverD: number;
  description: string;
}

export const AIRLINER_PRESETS: AirlinerPreset[] = [
  {
    id: 'narrow_body_a320',
    name: 'Airbus A320neo / Boeing 737 MAX (Узкофюзеляжный)',
    categoryLabel: 'Среднемагистральный (3 000 – 6 500 км)',
    mtowKg: 79000,
    wingAreaM2: 122.6,
    wingSpanM: 35.8,
    wingSweepDeg: 25.0,
    cruiseMach: 0.78,
    cruiseAltitudeM: 10600,
    tsfcKgPerKNPerHr: 0.52,
    baseLoverD: 17.5,
    description: 'Оптимизирован для коротких и средних маршрутов с максимальной топливной эффективностью при M = 0.78.',
  },
  {
    id: 'wide_body_b787',
    name: 'Boeing 787-9 Dreamliner (Композитное крыло)',
    categoryLabel: 'Дальнемагистральный (14 000 км)',
    mtowKg: 254000,
    wingAreaM2: 377.0,
    wingSpanM: 60.1,
    wingSweepDeg: 32.2,
    cruiseMach: 0.85,
    cruiseAltitudeM: 12200,
    tsfcKgPerKNPerHr: 0.47,
    baseLoverD: 20.8,
    description: 'Высокое удлинение крыла AR = 9.6, скошенные законцовки Raked Wingtips и сверхкритический профиль.',
  },
  {
    id: 'long_range_a350',
    name: 'Airbus A350-900 XWB (Сверхдальний лайнер)',
    categoryLabel: 'Флагманский дальнемагистральный',
    mtowKg: 280000,
    wingAreaM2: 442.0,
    wingSpanM: 64.75,
    wingSweepDeg: 31.9,
    cruiseMach: 0.85,
    cruiseAltitudeM: 12500,
    tsfcKgPerKNPerHr: 0.46,
    baseLoverD: 21.2,
    description: 'Адаптивное изменение кривизны крыла в полете (Adaptive Droop Nose & Flap Tab) для минимизации волнового сопротивления.',
  },
  {
    id: 'regional_ssj',
    name: 'SJ-100 / Embraer E195-E2 (Региональный лайнер)',
    categoryLabel: 'Региональный (100 мест)',
    mtowKg: 49450,
    wingAreaM2: 83.8,
    wingSpanM: 27.8,
    wingSweepDeg: 23.0,
    cruiseMach: 0.76,
    cruiseAltitudeM: 10000,
    tsfcKgPerKNPerHr: 0.55,
    baseLoverD: 16.8,
    description: 'Сверхкритическое крыло ЦАГИ 3-го поколения с уменьшенной стреловидностью для отличных ВПХ на коротких ВПП.',
  },
];

export const CommercialAirlinerModule: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(1);
  const [cruiseMach, setCruiseMach] = useState<number>(0.85);
  const [cruiseAltitudeM, setCruiseAltitudeM] = useState<number>(11500);
  const [payloadKg, setPayloadKg] = useState<number>(28000);
  const [fuelKg, setFuelKg] = useState<number>(65000);
  const [wingSweepDeg, setWingSweepDeg] = useState<number>(32.2);
  const [useSupercriticalProfile, setUseSupercriticalProfile] = useState<boolean>(true);

  const currentPreset = AIRLINER_PRESETS[selectedPresetIdx];

  const handleSelectPreset = (idx: number) => {
    setSelectedPresetIdx(idx);
    const p = AIRLINER_PRESETS[idx];
    setCruiseMach(p.cruiseMach);
    setCruiseAltitudeM(p.cruiseAltitudeM);
    setWingSweepDeg(p.wingSweepDeg);
  };

  // Calculations: Transonic Drag Rise, Korn Equation, Breguet Range & ETOPS
  const calculations = useMemo(() => {
    const sweepRad = (wingSweepDeg * Math.PI) / 180;
    const cosSweep = Math.cos(sweepRad);

    const kappaA = useSupercriticalProfile ? 0.955 : 0.88;
    const thicknessToChordRatio = 0.11;
    const designCl = 0.52;
    const machDivergenceMdiv = (kappaA / Math.sqrt(cosSweep)) - 0.1 * designCl - thicknessToChordRatio;

    let cdWave = 0;
    if (cruiseMach > machDivergenceMdiv) {
      const deltaM = cruiseMach - machDivergenceMdiv;
      cdWave = 20 * Math.pow(deltaM, 3.5);
    }

    const cd0 = 0.0155;
    const aspectratio = (currentPreset.wingSpanM * currentPreset.wingSpanM) / currentPreset.wingAreaM2;
    const oswaldEfficiencyE = 0.86;
    const cdInduced = (designCl * designCl) / (Math.PI * aspectratio * oswaldEfficiencyE);
    const cdTotal = cd0 + cdInduced + cdWave;

    const currentLoverD = designCl / cdTotal;

    const tempK = Math.max(216.65, 288.15 - 0.0065 * cruiseAltitudeM);
    const speedOfSoundMs = Math.sqrt(1.4 * 287.05 * tempK);
    const trueAirspeedMs = cruiseMach * speedOfSoundMs;
    const trueAirspeedKmh = trueAirspeedMs * 3.6;

    const emptyWeightKg = currentPreset.mtowKg * 0.52;
    const initialWeightKg = emptyWeightKg + payloadKg + fuelKg;
    const finalWeightKg = emptyWeightKg + payloadKg + (fuelKg * 0.06);
    const massRatio = initialWeightKg / finalWeightKg;

    const tsfcSI = (currentPreset.tsfcKgPerKNPerHr / 3600) * (9.81 / 1000);
    const rangeMeters = (trueAirspeedMs / (tsfcSI * 9.81)) * currentLoverD * Math.log(massRatio);
    const rangeKm = rangeMeters / 1000;

    const dragRiseCurveData: { mach: number; cdTotal: number; loverD: number; isBuffetOn: boolean }[] = [];
    for (let m = 0.65; m <= 0.93; m += 0.02) {
      let wave = 0;
      if (m > machDivergenceMdiv) {
        wave = 20 * Math.pow(m - machDivergenceMdiv, 3.5);
      }
      const totalCd = cd0 + cdInduced + wave;
      const ld = designCl / totalCd;
      dragRiseCurveData.push({
        mach: Math.round(m * 100) / 100,
        cdTotal: Math.round(totalCd * 10000) / 10000,
        loverD: Math.round(ld * 10) / 10,
        isBuffetOn: m > machDivergenceMdiv + 0.04,
      });
    }

    return {
      machDivergenceMdiv: Math.round(machDivergenceMdiv * 1000) / 1000,
      currentLoverD: Math.round(currentLoverD * 10) / 10,
      cdTotal: Math.round(cdTotal * 10000) / 10000,
      cdWave: Math.round(cdWave * 10000) / 10000,
      trueAirspeedKmh: Math.round(trueAirspeedKmh),
      trueAirspeedMs: Math.round(trueAirspeedMs),
      rangeKm: Math.round(rangeKm),
      aspectratio: Math.round(aspectratio * 10) / 10,
      initialWeightKg: Math.round(initialWeightKg),
      dragRiseCurveData,
    };
  }, [
    currentPreset,
    cruiseMach,
    cruiseAltitudeM,
    payloadKg,
    fuelKg,
    wingSweepDeg,
    useSupercriticalProfile,
  ]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950 border border-sky-800/60 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden text-slate-100 font-mono">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-600 text-slate-950 shadow-lg shadow-sky-500/20 border border-sky-400/40">
                <Plane className="w-6 h-6 font-black" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <span>Магистральные Лайнеры & Трансзвуковой Крейсерский Полет</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-sky-950 text-sky-300 border border-sky-700">
                    Transonic Airliners
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Сверхкритические профили крыла, число Маха дивергенции (M_div), стреловидность крыла, формула дальности Бреге и нормы ETOPS
                </p>
              </div>
            </div>
          </div>

          {/* Cruise Mach Badge */}
          <div className="flex items-center gap-2">
            <div
              className={`px-4 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                cruiseMach <= calculations.machDivergenceMdiv
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/60'
                  : 'bg-amber-950/90 text-amber-300 border-amber-600/60'
              }`}
            >
              <Gauge className="w-4 h-4" />
              <div>
                <div>
                  {cruiseMach <= calculations.machDivergenceMdiv ? 'ЭКОНОМИЧНЫЙ КРЕЙСЕР' : 'ВОЛНОВОЙ КРИЗИС / ШОК'}
                </div>
                <div className="text-[10px] opacity-80 font-normal">
                  M = {cruiseMach} (Мах дивергенции M_div = {calculations.machDivergenceMdiv})
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {AIRLINER_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(idx)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer text-xs flex flex-col justify-between gap-1.5 ${
                selectedPresetIdx === idx
                  ? 'bg-gradient-to-br from-sky-950/90 to-slate-900 border-sky-400 text-white shadow-lg shadow-sky-950/50 ring-1 ring-sky-400/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <div className="font-bold text-sky-300 flex items-center justify-between">
                <span>{p.name.split('(')[0]}</span>
                {selectedPresetIdx === idx && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {p.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Аэродин. Качество (K = L/D)</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">
            {calculations.currentLoverD}
          </div>
          <div className="text-[10px] text-slate-500">Сверхкритическое крыло</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Дальность Бреге (R)</span>
            <Navigation className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {calculations.rangeKm} <span className="text-xs text-slate-400">км</span>
          </div>
          <div className="text-[10px] text-slate-500">Топливо: {(fuelKg / 1000).toFixed(1)} т</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Истинная Скорость (VTAS)</span>
            <Wind className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {calculations.trueAirspeedKmh} <span className="text-xs text-slate-400">км/ч</span>
          </div>
          <div className="text-[10px] text-slate-500">{calculations.trueAirspeedMs} м/с на FL{(cruiseAltitudeM * 0.0328084).toFixed(0)}</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Мах Дивергенции (M_div)</span>
            <Gauge className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">
            {calculations.machDivergenceMdiv} <span className="text-xs text-slate-400">M</span>
          </div>
          <div className="text-[10px] text-slate-500">По формуле Корна</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Волновое Сопротивление</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {calculations.cdWave} <span className="text-xs text-slate-400">(CDw)</span>
          </div>
          <div className="text-[10px] text-slate-500">Суммарный CD = {calculations.cdTotal}</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Взлетная Масса (TOW)</span>
            <Fuel className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            {(calculations.initialWeightKg / 1000).toFixed(1)} <span className="text-xs text-slate-400">т</span>
          </div>
          <div className="text-[10px] text-slate-500">Макс MTOW {(currentPreset.mtowKg / 1000).toFixed(0)} т</div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs text-slate-300">
        {/* Left Column: Sliders */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-sky-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              Параметры Полета & Крыла
            </span>
            <button
              type="button"
              onClick={() => handleSelectPreset(selectedPresetIdx)}
              className="text-[10px] text-slate-500 hover:text-sky-400 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Сброс
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Крейсерское число Маха (M):</span>
                <span className="text-sky-400 font-bold">{cruiseMach.toFixed(2)} M</span>
              </div>
              <input
                type="range"
                min={0.70}
                max={0.92}
                step={0.01}
                value={cruiseMach}
                onChange={(e) => setCruiseMach(parseFloat(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Высота эшелона (H):</span>
                <span className="text-cyan-400 font-bold">{cruiseAltitudeM} м (FL{(cruiseAltitudeM * 0.0328084).toFixed(0)})</span>
              </div>
              <input
                type="range"
                min={8000}
                max={13500}
                step={200}
                value={cruiseAltitudeM}
                onChange={(e) => setCruiseAltitudeM(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Стреловидность крыла (chi):</span>
                <span className="text-teal-400 font-bold">{wingSweepDeg}°</span>
              </div>
              <input
                type="range"
                min={18}
                max={38}
                step={0.5}
                value={wingSweepDeg}
                onChange={(e) => setWingSweepDeg(parseFloat(e.target.value))}
                className="w-full accent-teal-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Заправка топливом (Керосин):</span>
                <span className="text-emerald-400 font-bold">{(fuelKg / 1000).toFixed(1)} тонн</span>
              </div>
              <input
                type="range"
                min={5000}
                max={currentPreset.mtowKg * 0.45}
                step={1000}
                value={fuelKg}
                onChange={(e) => setFuelKg(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            {/* Supercritical airfoil toggle */}
            <div className="pt-2 border-t border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-[11px] text-sky-300 font-bold">
                <input
                  type="checkbox"
                  checked={useSupercriticalProfile}
                  onChange={(e) => setUseSupercriticalProfile(e.target.checked)}
                  className="rounded border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                />
                <span>Сверхкритический профиль крыла (NASA SC-2)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Graphs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart 1: Transonic Drag Rise vs Mach */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-400" />
                  <span>Волновой Кризис & Рост Сопротивления (CD vs Mach)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Показывает точку дивергенции M_div и лавинообразный рост волнового сопротивления от замыкающего скачка уплотнения.
                </p>
              </div>
            </div>

            <div className="relative h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calculations.dragRiseCurveData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="mach" stroke="#64748b" label={{ value: 'Число Маха (M)', position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }} />
                  <YAxis domain={[0.01, 0.08]} stroke="#94a3b8" label={{ value: 'Коэффициент CD', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="cdTotal"
                    name="Коэффициент лобового сопротивления CD"
                    stroke="#38bdf8"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <FullscreenGraphButton
                domain="3d_aero_studio"
                label="Во весь экран"
                subLabel="Кризис M"
              />
            </div>
          </div>

          {/* Chart 2: Aerodynamic Efficiency K = L/D vs Mach */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Аэродинамическое Качество (K = L/D vs Mach)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Оптимальный диапазон крейсерского полета лайнера для минимизации километрового расхода топлива.
                </p>
              </div>
            </div>

            <div className="relative h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={calculations.dragRiseCurveData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="mach" stroke="#64748b" label={{ value: 'Число Маха (M)', position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }} />
                  <YAxis domain={[5, 24]} stroke="#94a3b8" label={{ value: 'Качество L/D', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="loverD"
                    name="Аэродинамическое качество L/D"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <FullscreenGraphButton
                domain="3d_aero_studio"
                label="Во весь экран"
                subLabel="Качество L/D"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
