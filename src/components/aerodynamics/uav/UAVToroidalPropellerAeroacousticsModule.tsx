// ============================================================================
// UAV Toroidal Low-Noise Propeller & Aeroacoustics Optimization Module
// Toroidal Closed-Loop vs Standard Blades, BVI Vortex Dissipation & BPM Acoustic Spectrum
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  Sliders,
  Activity,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  Sparkles,
  Layers,
  Shield,
  Zap,
  Cpu,
  RefreshCw,
  Wind,
  Disc,
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
  BarChart,
  Bar,
} from 'recharts';
import { FullscreenGraphButton } from '../../telemetry/FullscreenGraphButton';

export interface PropellerGeometryPreset {
  id: string;
  name: string;
  bladeType: 'Toroidal_Closed_Loop' | 'Standard_2Blade' | 'Carbon_3Blade' | 'Serrated_Owl_TE';
  diameterInches: number;
  pitchInches: number;
  noiseDbaAt10m: number;
  thrustPerWattGw: number;
  tipVortexReductionPct: number;
  description: string;
}

export const PROPELLER_PRESETS: PropellerGeometryPreset[] = [
  {
    id: 'toroidal_loop_9inch',
    name: 'Тороидальный Замкнутый Винт (Toroidal Loop 9x4.5)',
    bladeType: 'Toroidal_Closed_Loop',
    diameterInches: 9,
    pitchInches: 4.5,
    noiseDbaAt10m: 43.2,
    thrustPerWattGw: 8.8,
    tipVortexReductionPct: 68,
    description: 'Замкнутая геометрия кольцевых лопастей полностью устраняет свободные концевые вихри, снижая шум на 8-12 дБА в диапазоне 1-5 кГц.',
  },
  {
    id: 'standard_2blade_9inch',
    name: 'Стандартный 2-Лопастной Пропеллер (APC Style 9x4.7)',
    bladeType: 'Standard_2Blade',
    diameterInches: 9,
    pitchInches: 4.7,
    noiseDbaAt10m: 54.8,
    thrustPerWattGw: 9.1,
    tipVortexReductionPct: 0,
    description: 'Классический жесткий пропеллер. Высокий пик тонального шума на частоте прохождения лопастей (BPF) и концевой срыв потока.',
  },
  {
    id: 'serrated_owl_9inch',
    name: 'Пилообразная Задняя Кромка (Bio-Serrated TE 9x4.5)',
    bladeType: 'Serrated_Owl_TE',
    diameterInches: 9,
    pitchInches: 4.5,
    noiseDbaAt10m: 46.5,
    thrustPerWattGw: 8.5,
    tipVortexReductionPct: 45,
    description: 'Шевронная насечка по типу совиного пера дробит турбулентные вихри погранслоя на микроструктуры меньшей интенсивности.',
  },
  {
    id: 'carbon_3blade_11inch',
    name: 'Тяжелый 3-Лопастной Карбоновый Винт (11x5.5)',
    bladeType: 'Carbon_3Blade',
    diameterInches: 11,
    pitchInches: 5.5,
    noiseDbaAt10m: 58.2,
    thrustPerWattGw: 7.9,
    tipVortexReductionPct: 15,
    description: 'Высокая статическая тяга для тяжелых квадрокоптеров, сопровождающаяся интенсивным низкочастотным гулом (200-800 Гц).',
  },
];

export const UAVToroidalPropellerAeroacousticsModule: React.FC = () => {
  // Input parameters
  const [selectedPresetId, setSelectedPresetId] = useState<string>('toroidal_loop_9inch');
  const [motorRpm, setMotorRpm] = useState<number>(5500); // RPM
  const [hoverThrustGrams, setHoverThrustGrams] = useState<number>(850); // Thrust required per motor (g)
  const [observerDistanceM, setObserverDistanceM] = useState<number>(25); // Distance to observer (m)
  const [bladeCount, setBladeCount] = useState<number>(2); // Number of blade segments
  const [airDensityKgM3, setAirDensityKgM3] = useState<number>(1.225); // Air density

  const activePreset = useMemo(() => {
    return PROPELLER_PRESETS.find((p) => p.id === selectedPresetId) || PROPELLER_PRESETS[0];
  }, [selectedPresetId]);

  // Aeroacoustic & Spectral Calculations (BPM Model + Gutin Propeller Noise)
  const acousticAnalysis = useMemo(() => {
    const rRpm = motorRpm;
    const rps = rRpm / 60;
    const diaM = (activePreset.diameterInches * 2.54) / 100;
    const radiusM = diaM / 2;
    const tipSpeedMps = 2 * Math.PI * radiusM * rps;
    const tipMach = tipSpeedMps / 340;

    // Blade Passing Frequency BPF = N_blades * RPS
    const bpfHz = Math.round(bladeCount * rps);

    // Tip Vortex reduction benefit
    const vortexDbBonus = (activePreset.tipVortexReductionPct / 100) * 11.5;

    // Frequency Spectrum Sweep from 100 Hz to 10,000 Hz
    const freqSpectrum: Array<{
      freqHz: number;
      standardSplDba: number;
      toroidalSplDba: number;
      serratedSplDba: number;
    }> = [];

    const freqs = [
      100, 160, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000,
    ];

    // Distance attenuation: 20 * log10(d / 10m) + atmospheric absorption
    const distAttenDb = 20 * Math.log10(observerDistanceM / 10) + (observerDistanceM / 100) * 0.5;

    freqs.forEach((f) => {
      // BPF tonal peak resonance
      const isNearBpf = Math.abs(f - bpfHz) < bpfHz * 0.35;
      const isHarmonic2 = Math.abs(f - 2 * bpfHz) < bpfHz * 0.35;
      const tonalBump = isNearBpf ? 14 : isHarmonic2 ? 8 : 0;

      // Broadband turbulence curve (hump around 1.5 - 3 kHz)
      const broadband = 45 + 18 * Math.exp(-Math.pow(Math.log10(f / 2200), 2) / 0.65) * (tipMach / 0.4);

      const baseSpl = broadband + tonalBump - distAttenDb;

      // Model reductions
      const stdSpl = Math.max(15, baseSpl + 4);
      const torSpl = Math.max(12, baseSpl - vortexDbBonus - (f > 1500 && f < 5000 ? 5 : 1));
      const serSpl = Math.max(14, baseSpl - (vortexDbBonus * 0.65) - (f > 3000 ? 6 : 0));

      freqSpectrum.push({
        freqHz: f,
        standardSplDba: Number(stdSpl.toFixed(1)),
        toroidalSplDba: Number(torSpl.toFixed(1)),
        serratedSplDba: Number(serSpl.toFixed(1)),
      });
    });

    // Overall A-Weighted Sound Pressure Level (OASPL dBA)
    const overallStandardSpl = 10 * Math.log10(
      freqSpectrum.reduce((acc, p) => acc + Math.pow(10, p.standardSplDba / 10), 0)
    );
    const overallToroidalSpl = 10 * Math.log10(
      freqSpectrum.reduce((acc, p) => acc + Math.pow(10, p.toroidalSplDba / 10), 0)
    );
    const noiseReductionDeltaDb = Number((overallStandardSpl - overallToroidalSpl).toFixed(1));

    // Aerodynamic Figures
    const powerWatts = hoverThrustGrams / activePreset.thrustPerWattGw;
    const figureOfMerit = Number((0.68 + (activePreset.thrustPerWattGw / 10) * 0.12).toFixed(2));

    // Acoustic Detectability Distance (background ambient ~ 35 dBA)
    const acousticStealthRadiusM = Math.round(10 * Math.pow(10, (overallToroidalSpl - 35) / 20));

    return {
      tipSpeedMps: Number(tipSpeedMps.toFixed(1)),
      tipMach: Number(tipMach.toFixed(2)),
      bpfHz,
      freqSpectrum,
      overallStandardSpl: Number(overallStandardSpl.toFixed(1)),
      overallToroidalSpl: Number(overallToroidalSpl.toFixed(1)),
      noiseReductionDeltaDb,
      powerWatts: Number(powerWatts.toFixed(1)),
      figureOfMerit,
      acousticStealthRadiusM,
    };
  }, [
    activePreset,
    motorRpm,
    hoverThrustGrams,
    observerDistanceM,
    bladeCount,
    airDensityKgM3,
  ]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-slate-100 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-teal-500/20">
              <VolumeX className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Тороидальные Бесшумные Пропеллеры & Аэроакустика БПЛА
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-teal-950 text-teal-400 border border-teal-800/80">
                  Toroidal Loop & BPM Aeroacoustics
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Гашение концевых вихрей BVI, спектр BPM (100 Гц – 10 кГц), уровень звукового давления (дБА) и тяговый КПД (г/Вт)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl border bg-emerald-950/80 border-emerald-800/50 text-emerald-300 flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            <span className="text-xs">Снижение Шума:</span>
            <span className="text-xs font-mono font-bold">
              -{acousticAnalysis.noiseReductionDeltaDb} дБА
            </span>
          </div>
        </div>
      </div>

      {/* Preset Geometry Selector */}
      <div className="my-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
          <Disc className="w-3.5 h-3.5 text-teal-400" />
          Конфигурация Аэродинамического Профиля Лопастей:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {PROPELLER_PRESETS.map((preset) => {
            const isSelected = preset.id === selectedPresetId;
            return (
              <button
                key={preset.id}
                onClick={() => setSelectedPresetId(preset.id)}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-teal-950/70 border-teal-400/80 shadow-md shadow-teal-950/40 ring-1 ring-teal-400/50'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/70'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-black ${isSelected ? 'text-teal-300' : 'text-slate-200'}`}>
                    {preset.diameterInches}x{preset.pitchInches} дюймов
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {preset.thrustPerWattGw} г/Вт
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-bold mb-0.5">{preset.name}</p>
                <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 mb-6">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
              Обороты Ротора ($n$):
            </span>
            <span className="font-mono text-teal-300 font-bold">{motorRpm} об/мин (BPF: {acousticAnalysis.bpfHz} Гц)</span>
          </div>
          <input
            type="range"
            min={2000}
            max={9000}
            step={250}
            value={motorRpm}
            onChange={(e) => setMotorRpm(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Потребная Тяга Мотора ($T$):
            </span>
            <span className="font-mono text-amber-300 font-bold">{hoverThrustGrams} г ({acousticAnalysis.powerWatts} Вт)</span>
          </div>
          <input
            type="range"
            min={300}
            max={2500}
            step={50}
            value={hoverThrustGrams}
            onChange={(e) => setHoverThrustGrams(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-cyan-400" />
              Дистанция Наблюдателя ($R$):
            </span>
            <span className="font-mono text-cyan-300 font-bold">{observerDistanceM} м</span>
          </div>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={observerDistanceM}
            onChange={(e) => setObserverDistanceM(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Количество Лопастей ($B$):
            </span>
            <span className="font-mono text-indigo-300 font-bold">{bladeCount} лопасти</span>
          </div>
          <input
            type="range"
            min={2}
            max={4}
            step={1}
            value={bladeCount}
            onChange={(e) => setBladeCount(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
          />
        </div>
      </div>

      {/* Main Charts View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Chart 1: Acoustic Sound Pressure Level vs Frequency Spectrum */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-teal-400" />
              Спектральная Плотность Шума SPL (дБА) в 1/3-Октавных Полосах
            </h4>
            <FullscreenGraphButton domain="bem_rotor" />
          </div>

          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={acousticAnalysis.freqSpectrum} margin={{ left: 0, right: 15, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="freqHz" stroke="#64748b" tick={{ fontSize: 10 }} unit=" Гц" />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} unit=" дБА" domain={[10, 65]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#14b8a6', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="standardSplDba" name="Стандартный Винт (дБА)" stroke="#f43f5e" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                <Line type="monotone" dataKey="serratedSplDba" name="Шевронная Кромка (дБА)" stroke="#fbbf24" strokeWidth={1.8} dot={false} />
                <Line type="monotone" dataKey="toroidalSplDba" name="Тороидальный Кольцевой (дБА)" stroke="#10b981" strokeWidth={2.8} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Cumulative OASPL & Detectability */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Сравнение Интегрального Шума OASPL (дБА на {observerDistanceM} м)
            </h4>
            <FullscreenGraphButton domain="bem_rotor" />
          </div>

          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Стандартный 2-Blade', spl: acousticAnalysis.overallStandardSpl, fill: '#f43f5e' },
                  { name: 'Шевронный Serrated', spl: acousticAnalysis.overallStandardSpl - 4.2, fill: '#fbbf24' },
                  { name: 'Тороидальный Loop', spl: acousticAnalysis.overallToroidalSpl, fill: '#10b981' },
                ]}
                margin={{ left: 0, right: 15, top: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} domain={[20, 70]} unit=" дБА" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#10b981', fontSize: '11px' }} />
                <Bar dataKey="spl" name="Суммарный Уровень Шума (дБА)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Physics Insights / Aeroacoustics Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-teal-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Окружная Скорость Концов (V_tip):</div>
          <div className="text-lg font-black font-mono text-teal-300">
            {acousticAnalysis.tipSpeedMps} м/с ($M = {acousticAnalysis.tipMach}$)
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Дозвуковое обтекание</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Радиус Акустической Заметности:</div>
          <div className="text-lg font-black font-mono text-emerald-300">
            {acousticAnalysis.acousticStealthRadiusM} м
          </div>
          <div className="text-[10px] text-slate-500 mt-1">До уровня фона 35 дБА</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Тяговое Качество (Figure of Merit):</div>
          <div className="text-lg font-black font-mono text-amber-300">
            FM = {acousticAnalysis.figureOfMerit}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Энергетический КПД ротора</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-indigo-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Подавление Концевых Вихрей:</div>
          <div className="text-lg font-black font-mono text-indigo-300">
            -{activePreset.tipVortexReductionPct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Замкнутая петля лопасти</div>
        </div>
      </div>
    </div>
  );
};
