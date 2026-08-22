// ============================================================================
// UAV Aeroacoustics, Rotor Noise Signature & Acoustic Detection Modeling
// Mathematical Modeling: Ffowcs Williams–Hawkings (FW-H), Blade Passing Frequency (BPF),
// Atmospheric Absorption (ISO 9613-1), Directivity & Ground Microphone Array Detection
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  Radio,
  Mic,
  Activity,
  Sliders,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Layers,
  ArrowRight,
  TrendingUp,
  Compass,
  Cpu,
  Target,
  Zap,
  Navigation,
  Wind,
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

export type UAVPropulsionType = 'quadcopter_electric' | 'fixed_wing_electric' | 'gasoline_piston_engine' | 'turbojet_micro';
export type AmbientNoiseType = 'rural_quiet' | 'suburban_field' | 'urban_traffic' | 'industrial_zone';

export interface AeroacousticPreset {
  id: UAVPropulsionType;
  name: string;
  categoryLabel: string;
  propellerBladesCount: number;
  propellerRpm: number;
  rotorDiameterM: number;
  enginePowerHp: number;
  cruiseSpeedMs: number;
  baseSourceSPLdB: number; // At 1 meter
  description: string;
}

export const ACOUSTIC_PRESETS: AeroacousticPreset[] = [
  {
    id: 'quadcopter_electric',
    name: 'Квадрокоптер / Мультиротор (4 электромотора, 10-15" пропеллеры)',
    categoryLabel: 'Электрический мультиротор',
    propellerBladesCount: 2,
    propellerRpm: 6200,
    rotorDiameterM: 0.38,
    enginePowerHp: 1.8,
    cruiseSpeedMs: 14,
    baseSourceSPLdB: 84.5,
    description: 'Высокочастотный тональный шум на гармониках BPF (200–800 Гц) + шум обтекания кромок лопастей.',
  },
  {
    id: 'fixed_wing_electric',
    name: 'Самолетный БПЛА с Электромотором (Складной толкающий винт)',
    categoryLabel: 'Электрический планер',
    propellerBladesCount: 2,
    propellerRpm: 4800,
    rotorDiameterM: 0.45,
    enginePowerHp: 2.5,
    cruiseSpeedMs: 26,
    baseSourceSPLdB: 78.0,
    description: 'Низкая акустическая заметность благодаря экранированию винта крылом и низким оборотам.',
  },
  {
    id: 'gasoline_piston_engine',
    name: 'БПЛА с ДВС / Поршневым двигателем (2-тактный оппозит с глушителем)',
    categoryLabel: 'ДВС большой дальности (MALE)',
    propellerBladesCount: 3,
    propellerRpm: 5800,
    rotorDiameterM: 0.72,
    enginePowerHp: 28.0,
    cruiseSpeedMs: 38,
    baseSourceSPLdB: 104.0,
    description: 'Мощные низкочастотные пульсации выхлопа ДВС (50–300 Гц) со слабым атмосферным затуханием.',
  },
  {
    id: 'turbojet_micro',
    name: 'Турбореактивный БПЛА-Мишень / Барражирующий боеприпас',
    categoryLabel: 'Микро-ТРД (Micro-Turbojet)',
    propellerBladesCount: 1, // Jet noise dominant
    propellerRpm: 95000,
    rotorDiameterM: 0.12,
    enginePowerHp: 65.0,
    cruiseSpeedMs: 110,
    baseSourceSPLdB: 118.0,
    description: 'Высокоэнергетический струйный шум истечения реактивных газов (Lighthill 8th power law: W ~ V_jet^8).',
  },
];

export const AMBIENT_NOISE_LEVELS: Record<AmbientNoiseType, { name: string; ambientSplDba: number }> = {
  rural_quiet: { name: 'Тихая сельская местность / Лес ночью', ambientSplDba: 30 },
  suburban_field: { name: 'Пригород / Поле с умеренным ветром', ambientSplDba: 42 },
  urban_traffic: { name: 'Городская застройка / Автотрасса', ambientSplDba: 55 },
  industrial_zone: { name: 'Промзона / Шумный производственный сектор', ambientSplDba: 68 },
};

export const UAVAeroacousticsModule: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [ambientType, setAmbientType] = useState<AmbientNoiseType>('suburban_field');

  // Acoustic & Flight Parameters
  const [flightAltitudeM, setFlightAltitudeM] = useState<number>(150); // 20 to 1200 m
  const [propellerRpm, setPropellerRpm] = useState<number>(6200); // 1500 to 12000 RPM
  const [propellerBladesCount, setPropellerBladesCount] = useState<number>(2); // 2, 3, 4, 5 blades
  const [rotorDiameterM, setRotorDiameterM] = useState<number>(0.38); // m
  const [airTemperatureC, setAirTemperatureC] = useState<number>(20); // -20 to +40 C
  const [relativeHumidityPercent, setRelativeHumidityPercent] = useState<number>(60); // 10 to 90%
  const [useSerratedTrailingEdge, setUseSerratedTrailingEdge] = useState<boolean>(false); // Chevron / Serration -3.5 dB
  const [arrayDetectionSnrThresholdDb, setArrayDetectionSnrThresholdDb] = useState<number>(3.0); // SNR threshold for detection

  const currentPreset = ACOUSTIC_PRESETS[selectedPresetIdx];

  // Handle Preset Selection
  const handleSelectPreset = (idx: number) => {
    setSelectedPresetIdx(idx);
    const p = ACOUSTIC_PRESETS[idx];
    setPropellerRpm(p.propellerRpm);
    setPropellerBladesCount(p.propellerBladesCount);
    setRotorDiameterM(p.rotorDiameterM);
  };

  // Mathematical Modeling of FW-H Aeroacoustics, Atmospheric Attenuation (ISO 9613-1) & SNR Detection
  const acousticsAnalysis = useMemo(() => {
    // 1. Blade Tip Speed & Tip Mach Number
    const tipRadius = rotorDiameterM / 2;
    const omegaRadS = (propellerRpm * 2 * Math.PI) / 60;
    const tipSpeedMs = omegaRadS * tipRadius;
    const speedOfSoundMs = 331.3 * Math.sqrt(1 + airTemperatureC / 273.15);
    const tipMachNumber = tipSpeedMs / speedOfSoundMs;

    // 2. Fundamental Blade Passing Frequency (BPF): f_BPF = (B * RPM) / 60
    const bpfFundamentalHz = Math.round((propellerBladesCount * propellerRpm) / 60);

    // 3. Base Source Sound Power Level at 1m (Gutman / FW-H Loading + Thickness Noise)
    let sourceSPL_1m = currentPreset.baseSourceSPLdB;
    // Mach scaling: thickness noise scales with M_tip^4 to M_tip^6
    const machCorrectionDb = 20 * Math.log10(Math.max(0.2, tipMachNumber / 0.45));
    sourceSPL_1m += machCorrectionDb;

    if (useSerratedTrailingEdge) {
      sourceSPL_1m -= 3.5; // Serrated acoustic treatment
    }

    // 4. ISO 9613-1 Atmospheric Absorption Coefficient alpha(f) in dB/km
    // Approx for BPF range (~200 - 1000 Hz) at given Temp & Humidity
    const alphaDbPerKm = (1.5 + (bpfFundamentalHz / 500) * 2.8) * (100 / Math.max(20, relativeHumidityPercent));
    const alphaDbPerM = alphaDbPerKm / 1000;

    // 5. Sound Pressure Level (SPL) vs Ground Distance R
    const groundDistancesM = [20, 50, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000];
    const splDistanceCurve: {
      slantRangeM: number;
      groundDistM: number;
      splDba: number;
      ambientDba: number;
      isDetected: boolean;
    }[] = [];

    const ambientSplDba = AMBIENT_NOISE_LEVELS[ambientType].ambientSplDba;
    let maxAcousticDetectionRangeM = 0;

    groundDistancesM.forEach((gDist) => {
      const slantRangeM = Math.sqrt(gDist * gDist + flightAltitudeM * flightAltitudeM);
      // Spherical spreading: 20 * log10(R) + atmospheric absorption: alpha * R
      const geometricLossDb = 20 * Math.log10(slantRangeM);
      const atmosphericLossDb = alphaDbPerM * slantRangeM;
      // Directivity factor (rotor downward dipole radiation): ~ +3 dB below disk
      const directivityGainDb = 2.5;

      const receivedSplDba = Math.max(10, sourceSPL_1m - geometricLossDb - atmosphericLossDb + directivityGainDb);
      const snrDb = receivedSplDba - ambientSplDba;
      const isDetected = snrDb >= arrayDetectionSnrThresholdDb;

      if (isDetected && gDist > maxAcousticDetectionRangeM) {
        maxAcousticDetectionRangeM = gDist;
      }

      splDistanceCurve.push({
        slantRangeM: Math.round(slantRangeM),
        groundDistM: gDist,
        splDba: Math.round(receivedSplDba * 10) / 10,
        ambientDba: ambientSplDba,
        isDetected,
      });
    });

    // 6. Direct Ground SPL directly under the drone (Nadir point, groundDist = 0)
    const nadirSlantRangeM = flightAltitudeM;
    const nadirReceivedSPL = sourceSPL_1m - 20 * Math.log10(nadirSlantRangeM) - alphaDbPerM * nadirSlantRangeM + 2.5;
    const nadirAudibleToHuman = nadirReceivedSPL >= ambientSplDba;

    // 7. Harmonic Frequency Spectrum (FW-H BPF Harmonics 1x, 2x, 3x, 4x + Broadband)
    const frequencySpectrumData: {
      harmonicName: string;
      frequencyHz: number;
      splDb: number;
    }[] = [
      { harmonicName: '1x BPF (Фундаментальная)', frequencyHz: bpfFundamentalHz, splDb: Math.round(sourceSPL_1m - 4) },
      { harmonicName: '2x BPF (2-я гармоника)', frequencyHz: bpfFundamentalHz * 2, splDb: Math.round(sourceSPL_1m - 9) },
      { harmonicName: '3x BPF (3-я гармоника)', frequencyHz: bpfFundamentalHz * 3, splDb: Math.round(sourceSPL_1m - 15) },
      { harmonicName: '4x BPF (4-я гармоника)', frequencyHz: bpfFundamentalHz * 4, splDb: Math.round(sourceSPL_1m - 21) },
      { harmonicName: 'Broadband (Широкополосный шум)', frequencyHz: 2500, splDb: Math.round(sourceSPL_1m - 18) },
    ];

    return {
      tipSpeedMs: Math.round(tipSpeedMs * 10) / 10,
      tipMachNumber: Math.round(tipMachNumber * 1000) / 1000,
      speedOfSoundMs: Math.round(speedOfSoundMs * 10) / 10,
      bpfFundamentalHz,
      sourceSPL_1m: Math.round(sourceSPL_1m * 10) / 10,
      nadirReceivedSPL: Math.round(nadirReceivedSPL * 10) / 10,
      nadirAudibleToHuman,
      maxAcousticDetectionRangeM,
      ambientSplDba,
      splDistanceCurve,
      frequencySpectrumData,
    };
  }, [
    currentPreset,
    ambientType,
    flightAltitudeM,
    propellerRpm,
    propellerBladesCount,
    rotorDiameterM,
    airTemperatureC,
    relativeHumidityPercent,
    useSerratedTrailingEdge,
    arrayDetectionSnrThresholdDb,
  ]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950 border border-rose-800/60 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden text-slate-100 font-mono">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-500 via-amber-600 to-red-500 text-slate-950 shadow-lg shadow-rose-500/20 border border-rose-400/40">
                <Volume2 className="w-6 h-6 font-black" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <span>Аэроакустическая Заметность БПЛА & FW-H Шумовой След</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-rose-950 text-rose-300 border border-rose-700">
                    Aeroacoustics P0
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Уравнение Фоукса Вильямса — Хокингса (FW-H), частоты следования лопастей (BPF), затухание ISO 9613-1 и дальность обнаружения микрофонными решетками
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stealth Status Badge */}
          <div className="flex items-center gap-2">
            <div
              className={`px-4 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                !acousticsAnalysis.nadirAudibleToHuman
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/60'
                  : 'bg-rose-950/90 text-rose-300 border-rose-600/60'
              }`}
            >
              {!acousticsAnalysis.nadirAudibleToHuman ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              <span>
                {!acousticsAnalysis.nadirAudibleToHuman ? 'АКУСТИЧЕСКИ СКРЫТ' : 'СЛЫШЕН НА ЗЕМЛЕ'}
              </span>
              <span className="text-[10px] opacity-80">
                (SPL на грунте: {acousticsAnalysis.nadirReceivedSPL} дБА при фоне {acousticsAnalysis.ambientSplDba} дБА)
              </span>
            </div>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {ACOUSTIC_PRESETS.map((p, idx) => (
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
            <span>Шум у Источника (1м)</span>
            <Volume2 className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">
            {acousticsAnalysis.sourceSPL_1m} <span className="text-xs text-slate-400">дБА</span>
          </div>
          <div className="text-[10px] text-slate-500">FW-H акустическая мощность</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Шум в Надире (Грунт)</span>
            <Mic className="w-4 h-4 text-amber-400" />
          </div>
          <div className={`text-2xl font-black ${
            acousticsAnalysis.nadirAudibleToHuman ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {acousticsAnalysis.nadirReceivedSPL} <span className="text-xs text-slate-400">дБА</span>
          </div>
          <div className="text-[10px] text-slate-500">Высота {flightAltitudeM} м</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Частота BPF (1x)</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {acousticsAnalysis.bpfFundamentalHz} <span className="text-xs text-slate-400">Гц</span>
          </div>
          <div className="text-[10px] text-slate-500">f_BPF = B × RPM / 60</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Число Маха Лопасти</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">
            {acousticsAnalysis.tipMachNumber} <span className="text-xs text-slate-400">M</span>
          </div>
          <div className="text-[10px] text-slate-500">V_tip = {acousticsAnalysis.tipSpeedMs} м/с</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Дальность Засечки</span>
            <Radio className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            {acousticsAnalysis.maxAcousticDetectionRangeM} <span className="text-xs text-slate-400">м</span>
          </div>
          <div className="text-[10px] text-slate-500">По микрофонной решетке</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Фоновый Шум (Среда)</span>
            <Wind className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">
            {acousticsAnalysis.ambientSplDba} <span className="text-xs text-slate-400">дБА</span>
          </div>
          <div className="text-[10px] text-slate-500">{AMBIENT_NOISE_LEVELS[ambientType].name.split('/')[0]}</div>
        </div>
      </div>

      {/* Main Workspace: 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs text-slate-300">
        {/* Left Column: Aeroacoustic Configuration & Atmosphere */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-rose-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              Параметры Пропеллера & Среды
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

          {/* Ambient Background Noise Selector */}
          <div className="space-y-2">
            <span className="text-slate-400 font-bold block text-[11px] text-rose-300">
              Фоновый акустический шум местности:
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {(Object.keys(AMBIENT_NOISE_LEVELS) as AmbientNoiseType[]).map((ambKey) => {
                const amb = AMBIENT_NOISE_LEVELS[ambKey];
                return (
                  <button
                    key={ambKey}
                    type="button"
                    onClick={() => setAmbientType(ambKey)}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                      ambientType === ambKey
                        ? 'bg-rose-950/80 border-rose-400 text-white font-bold'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{amb.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-rose-300 border border-slate-800">
                      {amb.ambientSplDba} дБА
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sliders: Altitude, RPM, Blades, Diameter */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Высота полета (Altitude H):</span>
                <span className="text-rose-400 font-bold">{flightAltitudeM} м</span>
              </div>
              <input
                type="range"
                min={20}
                max={1000}
                step={20}
                value={flightAltitudeM}
                onChange={(e) => setFlightAltitudeM(parseInt(e.target.value, 10))}
                className="w-full accent-rose-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Обороты винта (RPM):</span>
                <span className="text-cyan-400 font-bold">{propellerRpm} об/мин</span>
              </div>
              <input
                type="range"
                min={1500}
                max={10000}
                step={100}
                value={propellerRpm}
                onChange={(e) => setPropellerRpm(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Число лопастей пропеллера (B):</span>
                <span className="text-amber-400 font-bold">{propellerBladesCount} лопасти</span>
              </div>
              <input
                type="range"
                min={2}
                max={5}
                step={1}
                value={propellerBladesCount}
                onChange={(e) => setPropellerBladesCount(parseInt(e.target.value, 10))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Диаметр винта (Diameter D):</span>
                <span className="text-purple-400 font-bold">{rotorDiameterM.toFixed(2)} м ({(rotorDiameterM * 39.37).toFixed(1)}")</span>
              </div>
              <input
                type="range"
                min={0.15}
                max={1.2}
                step={0.02}
                value={rotorDiameterM}
                onChange={(e) => setRotorDiameterM(parseFloat(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>

            {/* Stealth Mod Toggle */}
            <div className="pt-2 border-t border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-[11px] text-emerald-300 font-bold">
                <input
                  type="checkbox"
                  checked={useSerratedTrailingEdge}
                  onChange={(e) => setUseSerratedTrailingEdge(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <span>Пилообразная задняя кромка лопастей (-3.5 дБ)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Graphs - SPL vs Distance & Harmonic BPF Spectrum */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart 1: Sound Pressure Level vs Ground Range */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-rose-400" />
                  <span>Профиль Затухания Звука (SPL, дБА vs Дистанция на Грунте)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Показывает сферическое рассеяние звука и атмосферное поглощение по ISO 9613-1 относительно фона местности.
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-xl bg-rose-950 text-rose-300 border border-rose-800">
                Высота: {flightAltitudeM} м
              </span>
            </div>

            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={acousticsAnalysis.splDistanceCurve} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="groundDistM" stroke="#64748b" label={{ value: 'Горизонтальная дистанция (м)', position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }} />
                  <YAxis domain={[10, 100]} stroke="#94a3b8" label={{ value: 'Уровень звука (дБА)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="splDba"
                    name="Уровень шума БПЛА (дБА)"
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="ambientDba"
                    name="Фоновый шум местности (дБА)"
                    stroke="#38bdf8"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Harmonic BPF Spectrum Bar Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>Спектр Гармоник Шлепания Лопастей (BPF Harmonic Spectrum)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Акустическая сигнатура на основной частоте {acousticsAnalysis.bpfFundamentalHz} Гц и высших гармониках, распознаваемая акустическими детекторами.
                </p>
              </div>
            </div>

            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={acousticsAnalysis.frequencySpectrumData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="harmonicName" stroke="#64748b" />
                  <YAxis stroke="#94a3b8" label={{ value: 'Уровень мощности (дБ)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem' }}
                    formatter={(val: any) => [`${val} дБ`, 'SPL']}
                  />
                  <Bar
                    dataKey="splDb"
                    name="Уровень SPL гармоники (дБ)"
                    fill="#06b6d4"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
