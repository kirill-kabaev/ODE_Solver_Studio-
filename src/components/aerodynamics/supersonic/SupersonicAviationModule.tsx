// ============================================================================
// Supersonic & Hypersonic Aviation Aerodynamics
// Mathematical Modeling: Oblique & Normal Shock Waves (Rankine-Hugoniot),
// Prandtl-Meyer Expansion Fan, Whitcomb Area Rule, Sonic Boom N-Wave & Stagnation Aeroheating
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Flame,
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
  Thermometer,
  Layers,
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

export type SupersonicVehicleType = 'concorde_civil' | 'mig31_interceptor' | 'sr71_blackbird' | 'hypersonic_glide_waverider';

export interface SupersonicPreset {
  id: SupersonicVehicleType;
  name: string;
  categoryLabel: string;
  cruiseMach: number;
  cruiseAltitudeM: number;
  leadingEdgeSweepDeg: number;
  wedgeHalfAngleDeg: number;
  baseWaveDragCd0: number;
  description: string;
}

export const SUPERSONIC_PRESETS: SupersonicPreset[] = [
  {
    id: 'concorde_civil',
    name: 'Concorde / Ту-144 (Сверхзвуковой Пассажирский Лайнер)',
    categoryLabel: 'Гражданский сверхзвук (Mach 2.04)',
    cruiseMach: 2.04,
    cruiseAltitudeM: 18000,
    leadingEdgeSweepDeg: 55.0,
    wedgeHalfAngleDeg: 5.5,
    baseWaveDragCd0: 0.0185,
    description: 'Оживальное треугольное крыло, опускаемый носовой конус и поддержание сверхзвука без форсажа (Supercruise).',
  },
  {
    id: 'mig31_interceptor',
    name: 'МиГ-31БМ / Foxhound (Тяжелый Перехватчик)',
    categoryLabel: 'Военный сверхзвук (Mach 2.83)',
    cruiseMach: 2.83,
    cruiseAltitudeM: 20500,
    leadingEdgeSweepDeg: 41.0,
    wedgeHalfAngleDeg: 7.0,
    baseWaveDragCd0: 0.024,
    description: 'Стально-титановый планер, способный выдерживать длительный кинетический нагрев при полетах на M > 2.8.',
  },
  {
    id: 'sr71_blackbird',
    name: 'SR-71 Blackbird (Стратегический Разведчик Mach 3.2)',
    categoryLabel: 'Высотный разведчик (Mach 3.2)',
    cruiseMach: 3.2,
    cruiseAltitudeM: 25000,
    leadingEdgeSweepDeg: 60.0,
    wedgeHalfAngleDeg: 4.5,
    baseWaveDragCd0: 0.016,
    description: 'Титановый несущий фюзеляж с наплывами (Chines), подвижные конусы воздухозаборников и нагрев носка до 350°C.',
  },
  {
    id: 'hypersonic_glide_waverider',
    name: 'Waverider / Глайдер Авангард (Гиперзвуковой Планер)',
    categoryLabel: 'Гиперзвук (Mach 5.0 – 8.0+)',
    cruiseMach: 6.0,
    cruiseAltitudeM: 35000,
    leadingEdgeSweepDeg: 76.0,
    wedgeHalfAngleDeg: 8.0,
    baseWaveDragCd0: 0.012,
    description: 'Концепция волнолета (Waverider), скользящего на собственной ударной волне с высоким гиперзвуковым качеством L/D.',
  },
];

export const SupersonicAviationModule: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [flightMach, setFlightMach] = useState<number>(2.04);
  const [flightAltitudeM, setFlightAltitudeM] = useState<number>(18000);
  const [wedgeAngleDeg, setWedgeAngleDeg] = useState<number>(5.5);
  const [useAreaRuleWaisting, setUseAreaRuleWaisting] = useState<boolean>(true);

  const currentPreset = SUPERSONIC_PRESETS[selectedPresetIdx];

  const handleSelectPreset = (idx: number) => {
    setSelectedPresetIdx(idx);
    const p = SUPERSONIC_PRESETS[idx];
    setFlightMach(p.cruiseMach);
    setFlightAltitudeM(p.cruiseAltitudeM);
    setWedgeAngleDeg(p.wedgeHalfAngleDeg);
  };

  // Supersonic Aerodynamics, Oblique Shocks & Aeroheating
  const calculations = useMemo(() => {
    const gamma = 1.4;

    const machAngleDeg = (Math.asin(1 / Math.max(1.001, flightMach)) * 180) / Math.PI;

    const deltaRad = (wedgeAngleDeg * Math.PI) / 180;
    const betaApproxRad = Math.asin(1 / flightMach) + ((gamma + 1) / 4) * deltaRad;
    const betaShockAngleDeg = Math.min(85, (betaApproxRad * 180) / Math.PI);

    const m1n = flightMach * Math.sin(betaApproxRad);
    const pRatioAcrossShock = 1 + ((2 * gamma) / (gamma + 1)) * (m1n * m1n - 1);

    const tempInfK = Math.max(216.65, 288.15 - 0.0065 * Math.min(11000, flightAltitudeM));
    const recoveryFactor = 0.89;
    const stagnationTempK = tempInfK * (1 + ((gamma - 1) / 2) * recoveryFactor * flightMach * flightMach);
    const stagnationTempC = stagnationTempK - 273.15;

    let cdWave = (4 * Math.pow(deltaRad, 2)) / Math.sqrt(Math.max(0.1, flightMach * flightMach - 1));
    if (useAreaRuleWaisting) {
      cdWave *= 0.72;
    }
    const cdFriction = 0.0065 / Math.pow(flightMach, 0.2);
    const cdTotal = cdWave + cdFriction;

    const pAmbPa = 101325 * Math.exp(-flightAltitudeM / 7200);
    const sonicBoomOverpressurePa = Math.max(15, (0.55 * Math.pow(flightMach * flightMach - 1, 0.125) / Math.pow(flightAltitudeM, 0.75)) * pAmbPa * 18);

    const shockMachCurve: { mach: number; shockAngleDeg: number; machConeDeg: number; stagTempC: number }[] = [];
    for (let m = 1.2; m <= 6.0; m += 0.4) {
      const mu = (Math.asin(1 / m) * 180) / Math.PI;
      const bRad = Math.asin(1 / m) + ((gamma + 1) / 4) * deltaRad;
      const bDeg = Math.min(85, (bRad * 180) / Math.PI);
      const tStag = (tempInfK * (1 + ((gamma - 1) / 2) * recoveryFactor * m * m)) - 273.15;
      shockMachCurve.push({
        mach: Math.round(m * 10) / 10,
        shockAngleDeg: Math.round(bDeg * 10) / 10,
        machConeDeg: Math.round(mu * 10) / 10,
        stagTempC: Math.round(tStag),
      });
    }

    return {
      machAngleDeg: Math.round(machAngleDeg * 10) / 10,
      betaShockAngleDeg: Math.round(betaShockAngleDeg * 10) / 10,
      pRatioAcrossShock: Math.round(pRatioAcrossShock * 10) / 10,
      stagnationTempC: Math.round(stagnationTempC),
      stagnationTempK: Math.round(stagnationTempK),
      cdWave: Math.round(cdWave * 10000) / 10000,
      cdTotal: Math.round(cdTotal * 10000) / 10000,
      sonicBoomOverpressurePa: Math.round(sonicBoomOverpressurePa * 10) / 10,
      shockMachCurve,
    };
  }, [
    flightMach,
    flightAltitudeM,
    wedgeAngleDeg,
    useAreaRuleWaisting,
  ]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950 border border-rose-800/60 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden text-slate-100 font-mono">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-500 via-red-600 to-amber-600 text-white shadow-lg shadow-rose-500/20 border border-rose-400/40">
                <Flame className="w-6 h-6 font-black" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <span>Сверхзвуковая & Гиперзвуковая Авиация (Shock Waves & Aeroheating)</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-rose-950 text-rose-300 border border-rose-700">
                    Mach {flightMach} Supersonic
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Косые и прямые скачки уплотнения (Рэнкин — Гюгонио), кинетический нагрев носовой части, звуковой удар и правило площадей Уиткомба
                </p>
              </div>
            </div>
          </div>

          {/* Stagnation Heating Alert Badge & Fullscreen Cockpit HUD */}
          <div className="flex items-center gap-2">
            <div
              className={`px-4 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                calculations.stagnationTempC > 300
                  ? 'bg-rose-950/90 text-rose-300 border-rose-600/60'
                  : 'bg-amber-950/90 text-amber-300 border-amber-600/60'
              }`}
            >
              <Thermometer className="w-4 h-4" />
              <div>
                <div>ТЕМПЕРАТУРА НОСКА: +{calculations.stagnationTempC}°C</div>
                <div className="text-[10px] opacity-80 font-normal">
                  {calculations.stagnationTempC > 300 ? 'Требуется Титан / Углерод-Углерод' : 'Допустимы Дюралевые Сплавы'}
                </div>
              </div>
            </div>

            <FullscreenGraphButton
              domain="supersonic_mach"
              title="Открыть полноэкранную сверхзвуковую газодинамику & HUD"
              className="p-3"
            />
          </div>
        </div>

        {/* Preset Selector */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {SUPERSONIC_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(idx)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer text-xs flex flex-col justify-between gap-1.5 ${
                selectedPresetIdx === idx
                  ? 'bg-gradient-to-br from-rose-950/90 to-slate-900 border-rose-400 text-white shadow-lg shadow-rose-950/50 ring-1 ring-rose-400/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <div className="font-bold text-rose-300 flex items-center justify-between">
                <span>{p.name.split('(')[0]}</span>
                {selectedPresetIdx === idx && <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />}
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
            <span>Угол Скачка (beta)</span>
            <Activity className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">
            {calculations.betaShockAngleDeg}°
          </div>
          <div className="text-[10px] text-slate-500">Конус Маха: {calculations.machAngleDeg}°</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Кинетический Нагрев (T0)</span>
            <Thermometer className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            +{calculations.stagnationTempC} <span className="text-xs text-slate-400">°C</span>
          </div>
          <div className="text-[10px] text-slate-500">{calculations.stagnationTempK} K (Торможение)</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Скачок Давления (P2/P1)</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {calculations.pRatioAcrossShock}x
          </div>
          <div className="text-[10px] text-slate-500">Рэнкин — Гюгонио</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Волновое CD,wave</span>
            <Gauge className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">
            {calculations.cdWave}
          </div>
          <div className="text-[10px] text-slate-500">Суммарный CD = {calculations.cdTotal}</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Звуковой Удар (Delta P)</span>
            <Zap className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            {calculations.sonicBoomOverpressurePa} <span className="text-xs text-slate-400">Па</span>
          </div>
          <div className="text-[10px] text-slate-500">N-волна на грунте</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Высота Полета (H)</span>
            <Wind className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">
            {flightAltitudeM} <span className="text-xs text-slate-400">м</span>
          </div>
          <div className="text-[10px] text-slate-500">Стратосфера</div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs text-slate-300">
        {/* Left Column: Sliders */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-rose-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              Параметры Сверхзвукового Полета
            </span>
            <button
              type="button"
              onClick={() => handleSelectPreset(selectedPresetIdx)}
              className="text-[10px] text-slate-500 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Сброс
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Число Маха полета (M):</span>
                <span className="text-rose-400 font-bold">{flightMach.toFixed(2)} M</span>
              </div>
              <input
                type="range"
                min={1.2}
                max={6.5}
                step={0.1}
                value={flightMach}
                onChange={(e) => setFlightMach(parseFloat(e.target.value))}
                className="w-full accent-rose-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Высота полета (H):</span>
                <span className="text-sky-400 font-bold">{flightAltitudeM} м</span>
              </div>
              <input
                type="range"
                min={10000}
                max={38000}
                step={500}
                value={flightAltitudeM}
                onChange={(e) => setFlightAltitudeM(parseInt(e.target.value, 10))}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Полуклиновый угол носка (theta):</span>
                <span className="text-amber-400 font-bold">{wedgeAngleDeg}°</span>
              </div>
              <input
                type="range"
                min={3}
                max={15}
                step={0.5}
                value={wedgeAngleDeg}
                onChange={(e) => setWedgeAngleDeg(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Area rule toggle */}
            <div className="pt-2 border-t border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-[11px] text-rose-300 font-bold">
                <input
                  type="checkbox"
                  checked={useAreaRuleWaisting}
                  onChange={(e) => setUseAreaRuleWaisting(e.target.checked)}
                  className="rounded border-slate-700 text-rose-500 focus:ring-0 cursor-pointer"
                />
                <span>Правило площадей Уиткомба (Поджатие фюзеляжа -28% Cd_wave)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Graphs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart 1: Shock Wave Angle vs Mach */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-400" />
                  <span>Угол Наклона Скачка Уплотнения (beta vs Mach)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Сравнение реального косого скачка уплотнения с идеализированным конусом Маха mu = arcsin(1/M).
                </p>
              </div>
            </div>

            <div className="relative h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calculations.shockMachCurve} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="mach" stroke="#64748b" label={{ value: 'Число Маха (M)', position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }} />
                  <YAxis domain={[5, 80]} stroke="#94a3b8" label={{ value: 'Угол (°)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="shockAngleDeg"
                    name="Угол косого скачка Beta (°)"
                    stroke="#f43f5e"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="machConeDeg"
                    name="Угол конуса Маха Mu (°)"
                    stroke="#38bdf8"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <FullscreenGraphButton
                domain="supersonic_mach"
                label="Во весь экран"
                subLabel="Скачки"
              />
            </div>
          </div>

          {/* Chart 2: Aerodynamic Heating Temperature vs Mach */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-amber-400" />
                  <span>Кинетический Нагрев в Точке Торможения (T0 vs Mach)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Аэротермический барьер: температура поверхности носка и передних кромок при гиперзвуковых скоростях.
                </p>
              </div>
            </div>

            <div className="relative h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={calculations.shockMachCurve} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="mach" stroke="#64748b" label={{ value: 'Число Маха (M)', position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }} />
                  <YAxis stroke="#94a3b8" label={{ value: 'Температура (°C)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="stagTempC"
                    name="Температура торможения (°C)"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.25}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <FullscreenGraphButton
                domain="supersonic_mach"
                label="Во весь экран"
                subLabel="Нагрев"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
