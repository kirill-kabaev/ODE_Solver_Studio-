// ============================================================================
// Space Launch Vehicles & Re-entry Aerothermodynamics
// Mathematical Modeling: Max-Q Dynamic Pressure Profile, Transonic Fairing Buffeting,
// Blunt Body Theory (Allen–Eggers), Hypersonic Re-entry Aerothermal Heating & Grid Fins
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Rocket,
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
  AreaChart,
  Area,
} from 'recharts';

export type SpaceVehicleType = 'heavy_launch_falcon' | 'superheavy_starship' | 'reentry_capsule_soyuz' | 'shuttle_spaceplane';

export interface SpaceVehiclePreset {
  id: SpaceVehicleType;
  name: string;
  categoryLabel: string;
  liftoffMassTons: number;
  fairingDiameterM: number;
  maxQTargetKPa: number;
  reentrySpeedKms: number;
  noseRadiusM: number;
  bluntBodyStagHeatMWm2: number;
  description: string;
}

export const SPACE_PRESETS: SpaceVehiclePreset[] = [
  {
    id: 'heavy_launch_falcon',
    name: 'Ракета-Носитель Falcon 9 / Союз-2 (Двухступенчатая РН)',
    categoryLabel: 'Ракета-носитель среднего/тяжелого класса',
    liftoffMassTons: 549,
    fairingDiameterM: 5.2,
    maxQTargetKPa: 34.5,
    reentrySpeedKms: 2.2,
    noseRadiusM: 1.2,
    bluntBodyStagHeatMWm2: 1.8,
    description: 'Аэродинамический профиль выведения через Max-Q (T+75с, 12 км) и стабилизация первой ступени решетчатыми рулями (Grid Fins).',
  },
  {
    id: 'superheavy_starship',
    name: 'Starship / Super Heavy (Сверхтяжелая многоразовая система)',
    categoryLabel: 'Сверхтяжелая РН (5000 тонн)',
    liftoffMassTons: 5000,
    fairingDiameterM: 9.0,
    maxQTargetKPa: 42.0,
    reentrySpeedKms: 7.8,
    noseRadiusM: 4.5,
    bluntBodyStagHeatMWm2: 6.5,
    description: 'Управляемый спуск "Belly Flop" с углом атаки 70°, теплозащитные плитки PICA-X и реактивное гашение скорости у земли.',
  },
  {
    id: 'reentry_capsule_soyuz',
    name: 'Спускаемый Аппарат «Союз» / Crew Dragon (Капсула)',
    categoryLabel: 'Пилотируемая возвращаемая капсула',
    liftoffMassTons: 3.1,
    fairingDiameterM: 2.2,
    maxQTargetKPa: 0.0,
    reentrySpeedKms: 7.85,
    noseRadiusM: 2.2,
    bluntBodyStagHeatMWm2: 4.2,
    description: 'Аэродинамический спуск с балансировочным качеством L/D ≈ 0.25–0.3 для снижения перегрузок экипажа до 3.5–4.5 g.',
  },
  {
    id: 'shuttle_spaceplane',
    name: 'Орбитальный Корабль «Буран» / Space Shuttle (Крылатый челнок)',
    categoryLabel: 'Многоразовый космоплан',
    liftoffMassTons: 105,
    fairingDiameterM: 8.5,
    maxQTargetKPa: 0.0,
    reentrySpeedKms: 7.7,
    noseRadiusM: 1.5,
    bluntBodyStagHeatMWm2: 3.4,
    description: 'Гиперзвуковое планирование на угле атаки alpha = 40° с отводом 90% энергии в спутную ударную волну (теория затупленного тела).',
  },
];

export const SpaceLaunchAerodynamicsModule: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [liftoffThrustTons, setLiftoffThrustTons] = useState<number>(760);
  const [throttleAtMaxQPercent, setThrottleAtMaxQPercent] = useState<number>(72);
  const [fairingConeHalfAngleDeg, setFairingConeHalfAngleDeg] = useState<number>(15);
  const [reentryNoseRadiusM, setReentryNoseRadiusM] = useState<number>(1.2);
  const [entryVelocityKms, setEntryVelocityKms] = useState<number>(7.8);

  const currentPreset = SPACE_PRESETS[selectedPresetIdx];

  const handleSelectPreset = (idx: number) => {
    setSelectedPresetIdx(idx);
    const p = SPACE_PRESETS[idx];
    setReentryNoseRadiusM(p.noseRadiusM);
    setEntryVelocityKms(p.reentrySpeedKms);
  };

  // Trajectory, Dynamic Pressure Q(t) & Fay-Riddell Stagnation Heat Transfer
  const calculations = useMemo(() => {
    const ascentTrajectoryData: {
      timeSec: number;
      altitudeKm: number;
      velocityMs: number;
      machNumber: number;
      dynPressureKPa: number;
      aeroDragForceKN: number;
    }[] = [];

    let maxDynPressureKPa = 0;
    let maxQTimeSec = 0;
    let maxQAltitudeKm = 0;

    for (let t = 0; t <= 160; t += 5) {
      const altKm = (0.5 * 1.4 * t * t) / 1000;
      const velMs = 12 * t + 0.3 * t * t;
      const airDensityRho = 1.225 * Math.exp(-altKm / 7.2);
      const speedOfSound = 340 * Math.sqrt(Math.max(0.65, 1 - (0.0065 * Math.min(11, altKm) * 1000) / 288));
      const mach = velMs / speedOfSound;

      let dynPKPa = (0.5 * airDensityRho * velMs * velMs) / 1000;
      if (t >= 60 && t <= 90) {
        dynPKPa *= throttleAtMaxQPercent / 100;
      }

      const fairingAreaM2 = (Math.PI * currentPreset.fairingDiameterM * currentPreset.fairingDiameterM) / 4;
      const cdRocket = mach < 0.9 ? 0.28 : mach < 1.3 ? 0.52 : 0.34;
      const dragKN = (dynPKPa * 1000 * fairingAreaM2 * cdRocket) / 1000;

      if (dynPKPa > maxDynPressureKPa) {
        maxDynPressureKPa = dynPKPa;
        maxQTimeSec = t;
        maxQAltitudeKm = altKm;
      }

      ascentTrajectoryData.push({
        timeSec: t,
        altitudeKm: Math.round(altKm * 10) / 10,
        velocityMs: Math.round(velMs),
        machNumber: Math.round(mach * 10) / 10,
        dynPressureKPa: Math.round(dynPKPa * 10) / 10,
        aeroDragForceKN: Math.round(dragKN),
      });
    }

    const rhoReentryPeak = 1.225 * Math.exp(-65 / 7.2);
    const vEntryMs = entryVelocityKms * 1000;
    const bluntBodyHeatFluxMWm2 = (1.83e-4 / Math.sqrt(Math.max(0.1, reentryNoseRadiusM))) * Math.sqrt(rhoReentryPeak / 1.225) * Math.pow(vEntryMs / 1000, 3) * 8.5;
    const sharpNoseHeatFluxMWm2 = bluntBodyHeatFluxMWm2 * Math.sqrt(reentryNoseRadiusM / 0.05);

    const shockLayerPlasmaTempK = Math.min(12000, 250 + 0.12 * Math.pow(entryVelocityKms * 1000, 1.4));

    const noseRadiusCurve: { radiusM: number; heatFluxMW: number; sharpRefMW: number }[] = [];
    for (let r = 0.2; r <= 5.0; r += 0.3) {
      const qFlux = (1.83e-4 / Math.sqrt(r)) * Math.sqrt(rhoReentryPeak / 1.225) * Math.pow(vEntryMs / 1000, 3) * 8.5;
      noseRadiusCurve.push({
        radiusM: Math.round(r * 10) / 10,
        heatFluxMW: Math.round(qFlux * 10) / 10,
        sharpRefMW: Math.round(sharpNoseHeatFluxMWm2 * 10) / 10,
      });
    }

    return {
      maxDynPressureKPa: Math.round(maxDynPressureKPa * 10) / 10,
      maxQTimeSec,
      maxQAltitudeKm: Math.round(maxQAltitudeKm * 10) / 10,
      bluntBodyHeatFluxMWm2: Math.round(bluntBodyHeatFluxMWm2 * 10) / 10,
      sharpNoseHeatFluxMWm2: Math.round(sharpNoseHeatFluxMWm2 * 10) / 10,
      shockLayerPlasmaTempK: Math.round(shockLayerPlasmaTempK),
      heatReductionPercent: Math.round(((sharpNoseHeatFluxMWm2 - bluntBodyHeatFluxMWm2) / sharpNoseHeatFluxMWm2) * 100),
      ascentTrajectoryData,
      noseRadiusCurve,
    };
  }, [
    currentPreset,
    throttleAtMaxQPercent,
    fairingConeHalfAngleDeg,
    reentryNoseRadiusM,
    entryVelocityKms,
  ]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-indigo-800/60 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden text-slate-100 font-mono">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 text-white shadow-lg shadow-indigo-500/20 border border-indigo-400/40">
                <Rocket className="w-6 h-6 font-black" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <span>Ракеты-Носители & Космическая Аэротермодинамика</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700">
                    Space & Re-entry
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Зона максимального скоростного напора (Max-Q), трансзвуковой баффет обтекателя, теория затупленного тела Аллена — Эггерса и вход в плотные слои атмосферы
                </p>
              </div>
            </div>
          </div>

          {/* Max-Q Status Badge */}
          <div className="flex items-center gap-2">
            <div className="px-4 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 bg-indigo-950/90 text-indigo-300 border-indigo-600/60">
              <Gauge className="w-4 h-4 text-indigo-400" />
              <div>
                <div>MAX-Q: {calculations.maxDynPressureKPa} кПа</div>
                <div className="text-[10px] opacity-80 font-normal">
                  Момент T+{calculations.maxQTimeSec}с на высоте {calculations.maxQAltitudeKm} км
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {SPACE_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(idx)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer text-xs flex flex-col justify-between gap-1.5 ${
                selectedPresetIdx === idx
                  ? 'bg-gradient-to-br from-indigo-950/90 to-slate-900 border-indigo-400 text-white shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-400/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <div className="font-bold text-indigo-300 flex items-center justify-between">
                <span>{p.name.split('(')[0]}</span>
                {selectedPresetIdx === idx && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
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
            <span>Макс. Напор (Max-Q)</span>
            <Gauge className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {calculations.maxDynPressureKPa} <span className="text-xs text-slate-400">кПа</span>
          </div>
          <div className="text-[10px] text-slate-500">Дросселирование: {throttleAtMaxQPercent}%</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Тепловой Поток (q_stag)</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">
            {calculations.bluntBodyHeatFluxMWm2} <span className="text-xs text-slate-400">МВт/м²</span>
          </div>
          <div className="text-[10px] text-slate-500">Затупление Rn = {reentryNoseRadiusM} м</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Температура Плазмы</span>
            <Thermometer className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            ~{calculations.shockLayerPlasmaTempK} <span className="text-xs text-slate-400">K</span>
          </div>
          <div className="text-[10px] text-slate-500">Ударная ионизация / Blackout</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Снижение Нагрева</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            -{calculations.heatReductionPercent}%
          </div>
          <div className="text-[10px] text-slate-500">Теория Аллена — Эггерса</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Скорость Входа (V входа)</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {entryVelocityKms} <span className="text-xs text-slate-400">км/с</span>
          </div>
          <div className="text-[10px] text-slate-500">Mach {((entryVelocityKms * 1000) / 300).toFixed(0)}</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Диаметр Обтекателя</span>
            <Layers className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            {currentPreset.fairingDiameterM} <span className="text-xs text-slate-400">м</span>
          </div>
          <div className="text-[10px] text-slate-500">Мидель {((Math.PI * currentPreset.fairingDiameterM * currentPreset.fairingDiameterM) / 4).toFixed(1)} м²</div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs text-slate-300">
        {/* Left Column: Controls */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              Параметры Выведения & Спуска
            </span>
            <button
              type="button"
              onClick={() => handleSelectPreset(selectedPresetIdx)}
              className="text-[10px] text-slate-500 hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Сброс
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Дросселирование РН на участке Max-Q:</span>
                <span className="text-indigo-400 font-bold">{throttleAtMaxQPercent}% тяги</span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                step={2}
                value={throttleAtMaxQPercent}
                onChange={(e) => setThrottleAtMaxQPercent(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Радиус затупления носка (Rn):</span>
                <span className="text-rose-400 font-bold">{reentryNoseRadiusM} м</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={5.0}
                step={0.1}
                value={reentryNoseRadiusM}
                onChange={(e) => setReentryNoseRadiusM(parseFloat(e.target.value))}
                className="w-full accent-rose-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Скорость входа в атмосферу (V входа):</span>
                <span className="text-cyan-400 font-bold">{entryVelocityKms} км/с ({((entryVelocityKms * 1000) / 340).toFixed(0)} M)</span>
              </div>
              <input
                type="range"
                min={2.0}
                max={11.2}
                step={0.2}
                value={entryVelocityKms}
                onChange={(e) => setEntryVelocityKms(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-[11px]">
              <span className="text-indigo-300 font-bold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                Плазменный экран связи (Radio Blackout):
              </span>
              <p className="text-slate-400 leading-relaxed">
                На высотах 85–40 км при V &gt; 5 км/с электронная плотность плазмы превышает критическую частоту радиоволн, блокируя связь и телеметрию на 4–6 минут.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Graphs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart 1: Dynamic Pressure Q(t) Profile */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  <span>Профиль Динамического Напора (Q vs Время Выведения t)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Пик Max-Q на стыке роста скорости ракеты и экспоненциального падения плотности воздуха rho(h).
                </p>
              </div>
            </div>

            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calculations.ascentTrajectoryData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="timeSec" stroke="#64748b" label={{ value: 'Время полета (с)', position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 45]} stroke="#94a3b8" label={{ value: 'Напор Q (кПа)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="dynPressureKPa"
                    name="Динамический напор Q (кПа)"
                    stroke="#818cf8"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Fay-Riddell Heat Flux vs Nose Radius */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <span>Тепловой Поток в Носке (q_stag vs Радиус Затупления Rn)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Иллюстрация закона Аллена — Эггерса: увеличение затупления снижает тепловую нагрузку на теплозащиту.
                </p>
              </div>
            </div>

            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={calculations.noseRadiusCurve} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="radiusM" stroke="#64748b" label={{ value: 'Радиус затупления Rn (м)', position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 15]} stroke="#94a3b8" label={{ value: 'Тепловой поток (МВт/м²)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="heatFluxMW"
                    name="Тепловой поток затупленного тела (МВт/м²)"
                    stroke="#f43f5e"
                    fill="#f43f5e"
                    fillOpacity={0.25}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
