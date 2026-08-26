// ============================================================================
// UAV Avionics EMC & Antenna Co-Site Interference Module
// RF Coupling Matrix (S21), GNSS Desensitization, Intermodulation Products & CFRP Shielding
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Radio,
  Wifi,
  Sliders,
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Sparkles,
  Layers,
  Shield,
  Zap,
  Cpu,
  EyeOff,
  Signal,
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
  ReferenceLine,
} from 'recharts';
import { FullscreenGraphButton } from '../../telemetry/FullscreenGraphButton';

export interface UAVPlatformEMCPreset {
  id: string;
  name: string;
  airframeMaterial: 'CFRP' | 'Fiberglass' | 'Foam_EPO' | 'Aluminum';
  vtxFreqGhz: number;
  vtxPowerMw: number;
  c2FreqMhz: number;
  c2PowerMw: number;
  antennaSeparationCm: number;
  hasSawFilter: boolean;
  description: string;
}

export const PLATFORM_EMC_PRESETS: UAVPlatformEMCPreset[] = [
  {
    id: 'fpv_long_range_7inch',
    name: 'Long-Range FPV (7-дюймовая Карбоновая Рама)',
    airframeMaterial: 'CFRP',
    vtxFreqGhz: 5.8,
    vtxPowerMw: 2500,
    c2FreqMhz: 868,
    c2PowerMw: 1000,
    antennaSeparationCm: 14,
    hasSawFilter: false,
    description: 'Высокая плотность монтажа. Риск десенситизации GNSS из-за близкого расположения VTX и карбонового переотражения.',
  },
  {
    id: 'fixed_wing_recon_3m',
    name: 'Разведывательное Летающее Крыло (3м Размах)',
    airframeMaterial: 'CFRP',
    vtxFreqGhz: 1.28,
    vtxPowerMw: 1500,
    c2FreqMhz: 915,
    c2PowerMw: 500,
    antennaSeparationCm: 120,
    hasSawFilter: true,
    description: 'Разнос антенн по законцовкам крыла. Использование ПАВ-фильтров гарантирует стабильный GPS RTK Fix.',
  },
  {
    id: 'heavy_survey_hexacopter',
    name: 'Геодезический Гексакоптер с LiDAR & RTK',
    airframeMaterial: 'CFRP',
    vtxFreqGhz: 5.8,
    vtxPowerMw: 800,
    c2FreqMhz: 2400,
    c2PowerMw: 250,
    antennaSeparationCm: 45,
    hasSawFilter: true,
    description: 'Высокоточная навигация RTK. Вынос антенны GNSS на мачту 15 см для снижения наводок от силовых ESC регуляторов.',
  },
  {
    id: 'tactical_loitering_drone',
    name: 'Тактический Барражирующий Дрон (Стеклопластик)',
    airframeMaterial: 'Fiberglass',
    vtxFreqGhz: 1.24,
    vtxPowerMw: 4000,
    c2FreqMhz: 868,
    c2PowerMw: 2000,
    antennaSeparationCm: 35,
    hasSawFilter: false,
    description: 'Мощный видеопередатчик 1.2 ГГц создает 2-ю гармонику вблизи 2.4 ГГц и шумы в полосе L2 GPS.',
  },
];

export const UAVAvionicsEMCAntennaCoSiteModule: React.FC = () => {
  // Input parameters
  const [selectedPresetId, setSelectedPresetId] = useState<string>('fpv_long_range_7inch');
  const [antennaSeparationCm, setAntennaSeparationCm] = useState<number>(25); // Separation (cm)
  const [vtxPowerMw, setVtxPowerMw] = useState<number>(2000); // Video TX Power (mW)
  const [hasSawFilter, setHasSawFilter] = useState<boolean>(true); // Bandpass filter installed
  const [isCrossPolarized, setIsCrossPolarized] = useState<boolean>(true); // Orthogonal V/H polarization
  const [cfrpShieldingLayers, setCfrpShieldingLayers] = useState<number>(2); // Carbon ground planes

  const activePreset = useMemo(() => {
    return PLATFORM_EMC_PRESETS.find((p) => p.id === selectedPresetId) || PLATFORM_EMC_PRESETS[0];
  }, [selectedPresetId]);

  // Calculations for Coupling Matrix, Isolation (dB) and GNSS Desensitization
  const emcAnalysis = useMemo(() => {
    // Distance sweep from 5cm to 150cm
    const distanceSweep: Array<{
      distCm: number;
      isolation58GhzDb: number;
      isolation12GhzDb: number;
      isolation868MhzDb: number;
      gnssNoiseFloorDbm: number;
      carrierToNoiseDbHz: number;
    }> = [];

    // Shielding attenuation from carbon / material
    const materialShieldDb = activePreset.airframeMaterial === 'CFRP' ? cfrpShieldingLayers * 6.5 : 2.0;
    const polarLossDb = isCrossPolarized ? 18.0 : 0.0;
    const filterLossDb = hasSawFilter ? 32.0 : 0.0;

    // VTX Power in dBm
    const vtxPowerDbm = 10 * Math.log10(vtxPowerMw);

    for (let d = 5; d <= 150; d += 5) {
      const distM = d / 100;

      // Free-space path loss & near-field coupling S21
      // S21 = 20 log10(lambda / (4 * pi * d)) - Shielding - Polarization
      const lambda58 = 0.3 / 5.8;
      const lambda12 = 0.3 / 1.2;
      const lambda868 = 0.3 / 0.868;

      const s21_58 = Math.min(-12, 20 * Math.log10(lambda58 / (4 * Math.PI * distM)) - materialShieldDb - polarLossDb);
      const s21_12 = Math.min(-10, 20 * Math.log10(lambda12 / (4 * Math.PI * distM)) - materialShieldDb - polarLossDb);
      const s21_868 = Math.min(-8, 20 * Math.log10(lambda868 / (4 * Math.PI * distM)) - materialShieldDb - polarLossDb);

      // Noise floor calculation for GNSS L1 (1575.42 MHz)
      // Base thermal noise floor = -174 dBm/Hz -> across 2 MHz GNSS band = -111 dBm
      const baseGnssNoiseDbm = -111;

      // Out-of-band broadband noise leakage from VTX into GPS band (typically -75 dBc/MHz)
      const vtxNoiseLeakDbm = vtxPowerDbm - 75 + s21_58 - filterLossDb;
      const effectiveGnssNoiseDbm = 10 * Math.log10(Math.pow(10, baseGnssNoiseDbm / 10) + Math.pow(10, vtxNoiseLeakDbm / 10));

      // Carrier to noise density C/N0 for a typical GPS satellite signal (-130 dBm input)
      const gpsSignalDbm = -130;
      const cN0 = Math.max(18, Math.min(52, gpsSignalDbm - effectiveGnssNoiseDbm + 10 * Math.log10(2e6) - 58));

      distanceSweep.push({
        distCm: d,
        isolation58GhzDb: Number(Math.abs(s21_58).toFixed(1)),
        isolation12GhzDb: Number(Math.abs(s21_12).toFixed(1)),
        isolation868MhzDb: Number(Math.abs(s21_868).toFixed(1)),
        gnssNoiseFloorDbm: Number(effectiveGnssNoiseDbm.toFixed(1)),
        carrierToNoiseDbHz: Number(cN0.toFixed(1)),
      });
    }

    // Current Operating Point Evaluation
    const currentPoint = distanceSweep.find((p) => p.distCm === antennaSeparationCm) || distanceSweep[4];
    const isGpsDegraded = currentPoint.carrierToNoiseDbHz < 38;
    const isGpsLost = currentPoint.carrierToNoiseDbHz < 28;

    let emcStatus = 'Норма (Все системы стабильны)';
    if (isGpsLost) {
      emcStatus = 'Критический срыв захвата GNSS (Lock Loss)';
    } else if (isGpsDegraded) {
      emcStatus = 'Десенситизация GNSS (Снижение точности RTK/HDOP)';
    }

    return {
      distanceSweep,
      currentPoint,
      vtxPowerDbm: Number(vtxPowerDbm.toFixed(1)),
      emcStatus,
      isGpsDegraded,
      isGpsLost,
      isolationAtCurrent: currentPoint.isolation58GhzDb,
    };
  }, [
    activePreset,
    antennaSeparationCm,
    vtxPowerMw,
    hasSawFilter,
    isCrossPolarized,
    cfrpShieldingLayers,
  ]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-slate-100 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                ЭМС Бортовой Авионики & Взаимная Развязка Антенн БПЛА
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-400 border border-indigo-800/80">
                  Co-Site EMC Matrix
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Развязка $S_{21}$ (дБ), десенситизация навигации GNSS L1/L2, ПАВ-фильтрация и экранирование карбоновым фюзеляжем
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
            emcAnalysis.isGpsLost
              ? 'bg-rose-950/80 border-rose-800/50 text-rose-300'
              : emcAnalysis.isGpsDegraded
              ? 'bg-amber-950/80 border-amber-800/50 text-amber-300'
              : 'bg-emerald-950/80 border-emerald-800/50 text-emerald-300'
          }`}>
            <Signal className="w-4 h-4" />
            <span className="text-xs">Статус ЭМС:</span>
            <span className="text-xs font-mono font-bold">
              {emcAnalysis.emcStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="my-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          Конфигурация Платформы и Компоновки БПЛА:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {PLATFORM_EMC_PRESETS.map((preset) => {
            const isSelected = preset.id === selectedPresetId;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  setSelectedPresetId(preset.id);
                  setAntennaSeparationCm(preset.antennaSeparationCm);
                  setVtxPowerMw(preset.vtxPowerMw);
                  setHasSawFilter(preset.hasSawFilter);
                }}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-950/70 border-indigo-400/80 shadow-md shadow-indigo-950/40 ring-1 ring-indigo-400/50'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/70'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-black ${isSelected ? 'text-indigo-300' : 'text-slate-200'}`}>
                    VTX {preset.vtxFreqGhz} ГГц
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {preset.antennaSeparationCm} см
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
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              Разнос Антенн (d):
            </span>
            <span className="font-mono text-indigo-300 font-bold">{antennaSeparationCm} см</span>
          </div>
          <input
            type="range"
            min={5}
            max={150}
            step={5}
            value={antennaSeparationCm}
            onChange={(e) => setAntennaSeparationCm(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              Мощность VTX (Pt):
            </span>
            <span className="font-mono text-rose-300 font-bold">{vtxPowerMw} мВт ({emcAnalysis.vtxPowerDbm} дБм)</span>
          </div>
          <input
            type="range"
            min={200}
            max={5000}
            step={200}
            value={vtxPowerMw}
            onChange={(e) => setVtxPowerMw(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Слои Карбона (CFRP):
            </span>
            <span className="font-mono text-cyan-300 font-bold">{cfrpShieldingLayers} слоя (-{(cfrpShieldingLayers * 6.5).toFixed(0)} дБ)</span>
          </div>
          <input
            type="range"
            min={0}
            max={4}
            step={1}
            value={cfrpShieldingLayers}
            onChange={(e) => setCfrpShieldingLayers(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        <div className="flex flex-col justify-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={hasSawFilter}
              onChange={(e) => setHasSawFilter(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0 cursor-pointer"
            />
            <span>Узкополосный ПАВ-фильтр (-32 дБ)</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isCrossPolarized}
              onChange={(e) => setIsCrossPolarized(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0 cursor-pointer"
            />
            <span>Ортогональная поляризация V/H (-18 дБ)</span>
          </label>
        </div>
      </div>

      {/* Main Charts View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Chart 1: Isolation S21 vs Distance */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              Взаимная Развязка Антенн S21 (дБ) vs Удаление d (см)
            </h4>
            <FullscreenGraphButton domain="uav_guidance" />
          </div>

          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={emcAnalysis.distanceSweep} margin={{ left: 0, right: 15, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="distCm" stroke="#64748b" tick={{ fontSize: 10 }} unit=" см" />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} unit=" дБ" domain={[20, 90]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#6366f1', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="isolation58GhzDb" name="Развязка 5.8 ГГц (дБ)" stroke="#818cf8" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="isolation12GhzDb" name="Развязка 1.2 ГГц (дБ)" stroke="#f43f5e" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                <Line type="monotone" dataKey="isolation868MhzDb" name="Развязка 868 МГц (дБ)" stroke="#38bdf8" strokeWidth={1.8} dot={false} />
                <ReferenceLine x={antennaSeparationCm} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Текущий монтаж', fill: '#10b981', fontSize: 10 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: GPS C/N0 Carrier to Noise Ratio */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              Отношение Сигнал/Шум GNSS C/N0 (дБ-Гц) & Риск Срыва RTK
            </h4>
            <FullscreenGraphButton domain="uav_guidance" />
          </div>

          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={emcAnalysis.distanceSweep} margin={{ left: 0, right: 15, top: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gpsCn0Gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="distCm" stroke="#64748b" tick={{ fontSize: 10 }} unit=" см" />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} unit=" дБ-Гц" domain={[20, 55]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#10b981', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="carrierToNoiseDbHz" name="GNSS C/N0 (дБ-Гц)" stroke="#10b981" fill="url(#gpsCn0Gradient)" strokeWidth={2.5} />
                <ReferenceLine y={38} stroke="#fbbf24" strokeDasharray="3 3" label={{ value: 'Порог деградации RTK (38 дБ-Гц)', fill: '#fbbf24', fontSize: 9 }} />
                <ReferenceLine y={28} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Порог срыва захвата (28 дБ-Гц)', fill: '#f43f5e', fontSize: 9 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Physics Insights / EMC Matrix Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-indigo-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Развязка на Текущей Дистанции:</div>
          <div className="text-lg font-black font-mono text-indigo-300">
            {emcAnalysis.isolationAtCurrent} дБ
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Рекомендуемый минимум: 45 дБ</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-teal-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Уровень Сигнал/Шум $C/N_0$:</div>
          <div className="text-lg font-black font-mono text-teal-300">
            {emcAnalysis.currentPoint.carrierToNoiseDbHz} дБ-Гц
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {emcAnalysis.currentPoint.carrierToNoiseDbHz >= 42 ? 'Отличный 3D RTK Fix' : 'Шумовое подавление'}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-rose-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Шумовой Пьедестал GNSS:</div>
          <div className="text-lg font-black font-mono text-rose-300">
            {emcAnalysis.currentPoint.gnssNoiseFloorDbm} дБм
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Тепловой фон: -111 дБм</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Эффективность Экранирования:</div>
          <div className="text-lg font-black font-mono text-emerald-300">
            {hasSawFilter && isCrossPolarized ? 'Максимальная (High-Grade)' : 'Базовая'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">ПАВ + Поляризация + Карбон</div>
        </div>
      </div>
    </div>
  );
};
