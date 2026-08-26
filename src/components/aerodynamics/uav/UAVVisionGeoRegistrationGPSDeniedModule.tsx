// ============================================================================
// UAV Vision-Based Geo-Registration & GPS-Denied Satellite Map Matching Module
// Deep Feature Orthophoto Matching (SuperPoint/SuperGlue), EKF INS Drift Suppression & CEP
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Eye,
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
  Compass,
  Navigation,
  Globe,
  Camera,
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

export interface GeoMatchingTerrainPreset {
  id: string;
  name: string;
  terrainType: 'Urban_Dense' | 'Forest_Canopy' | 'Desert_Dunes' | 'Agricultural_Fields';
  flightAltitudeM: number;
  groundSampleDistanceCm: number;
  orthoResolutionM: number;
  insDriftRateMPerMin: number;
  description: string;
}

export const GEO_TERRAIN_PRESETS: GeoMatchingTerrainPreset[] = [
  {
    id: 'urban_dense_recon',
    name: 'Плотная Городская Застройка (Urban High-Rise)',
    terrainType: 'Urban_Dense',
    flightAltitudeM: 400,
    groundSampleDistanceCm: 4.5,
    orthoResolutionM: 0.25,
    insDriftRateMPerMin: 12.0,
    description: 'Множество четких геометрических ориентиров (углы зданий, перекрестки дорог). Высочайшая точность привязки с субпиксельным разрешением.',
  },
  {
    id: 'forest_canopy_recon',
    name: 'Густой Лесной Массив и Рельеф (Forest Canopy)',
    terrainType: 'Forest_Canopy',
    flightAltitudeM: 800,
    groundSampleDistanceCm: 9.0,
    orthoResolutionM: 0.5,
    insDriftRateMPerMin: 15.0,
    description: 'Однородная текстура растительности. Привязка осуществляется по изгибам рек, просекам ЛЭП и характерным формам рельефа DEM.',
  },
  {
    id: 'agricultural_fields',
    name: 'Сельскохозяйственные Угодья и Дороги (Fields & Road Grid)',
    terrainType: 'Agricultural_Fields',
    flightAltitudeM: 1200,
    groundSampleDistanceCm: 14.0,
    orthoResolutionM: 1.0,
    insDriftRateMPerMin: 18.0,
    description: 'Сезонные изменения пашни и цвета полей. Использование инвариантных признаков градиентов границ и дорожной сети.',
  },
  {
    id: 'desert_arid_plains',
    name: 'Пустыня и Песчаные Барханы (Arid Low-Texture)',
    terrainType: 'Desert_Dunes',
    flightAltitudeM: 600,
    groundSampleDistanceCm: 7.0,
    orthoResolutionM: 0.5,
    insDriftRateMPerMin: 20.0,
    description: 'Малоконтрастный рельеф. Высокий риск ложных сопоставлений из-за динамики перемещения песчаных дюн.',
  },
];

export const UAVVisionGeoRegistrationGPSDeniedModule: React.FC = () => {
  // Scenario and simulation controls
  const [selectedPresetId, setSelectedPresetId] = useState<string>('urban_dense_recon');
  const [flightAltitudeM, setFlightAltitudeM] = useState<number>(500); // UAV altitude (m)
  const [matchingRateHz, setMatchingRateHz] = useState<number>(2.0); // Map matching fix frequency (Hz)
  const [featureMatcher, setFeatureMatcher] = useState<'SuperGlue_Deep' | 'SIFT_ORB' | 'NCC_Template'>('SuperGlue_Deep');
  const [insGrade, setInsGrade] = useState<'MEMS_Tactical' | 'MEMS_Commercial' | 'FOG_HighEnd'>('MEMS_Tactical');
  const [cloudShadowCoverPct, setCloudShadowCoverPct] = useState<number>(15); // Cloud shadows obscuring ground

  const activePreset = useMemo(() => {
    return GEO_TERRAIN_PRESETS.find((p) => p.id === selectedPresetId) || GEO_TERRAIN_PRESETS[0];
  }, [selectedPresetId]);

  // Mission Profile (30 minutes of flight under full GPS Jamming)
  const navigationAnalysis = useMemo(() => {
    // INS drift model (m/min)
    let baseInsDrift = 15.0;
    if (insGrade === 'FOG_HighEnd') baseInsDrift = 2.5;
    else if (insGrade === 'MEMS_Commercial') baseInsDrift = 35.0;

    // Feature matcher confidence factor
    let matcherAccuracyFactor = 1.0;
    if (featureMatcher === 'SuperGlue_Deep') matcherAccuracyFactor = 0.35;
    else if (featureMatcher === 'NCC_Template') matcherAccuracyFactor = 1.8;

    // Cloud shadow degradation
    const cloudDegradation = 1 + (cloudShadowCoverPct / 100) * 0.8;

    // 30-minute time sweep (every 1 minute)
    const timeSweep: Array<{
      timeMin: number;
      pureInsErrorM: number;
      visionGeoFusedCepM: number;
      keypointsMatchedCount: number;
      confidencePct: number;
    }> = [];

    // GSD (Ground Sample Distance) calculation
    const cameraFocalMm = 24;
    const sensorPixelSizeUm = 3.5;
    const currentGsdCm = ((flightAltitudeM * sensorPixelSizeUm) / (cameraFocalMm * 1000)) * 100;

    const baseMatchedPoints = featureMatcher === 'SuperGlue_Deep' ? 420 : featureMatcher === 'SIFT_ORB' ? 260 : 110;

    for (let t = 0; t <= 30; t += 1) {
      // Pure INS error grows linearly/quadratically with time
      const insErr = baseInsDrift * t * (1 + 0.03 * t);

      // Vision-corrected error (bounded by EKF and visual GSD)
      const visualFixError = Math.max(
        0.8,
        (currentGsdCm / 100) * 8.5 * matcherAccuracyFactor * cloudDegradation
      );

      // With periodic visual updates every (1 / matchingRateHz) seconds
      const driftBetweenFixes = (baseInsDrift / 60) * (1 / matchingRateHz);
      const fusedCep = t === 0 ? 0.5 : Number((visualFixError + driftBetweenFixes * 1.5).toFixed(2));

      const matchedPts = Math.round(
        baseMatchedPoints * (1 - cloudShadowCoverPct / 140) * (1 + (Math.sin(t * 0.5) * 0.15))
      );

      const confidence = Math.min(
        99,
        Math.max(40, Math.round((100 - (cloudShadowCoverPct * 0.6)) * (featureMatcher === 'SuperGlue_Deep' ? 1.0 : 0.85)))
      );

      timeSweep.push({
        timeMin: t,
        pureInsErrorM: Number(insErr.toFixed(1)),
        visionGeoFusedCepM: fusedCep,
        keypointsMatchedCount: matchedPts,
        confidencePct: confidence,
      });
    }

    const currentFinalPoint = timeSweep[timeSweep.length - 1];
    const driftSuppressionRatio = Number((currentFinalPoint.pureInsErrorM / currentFinalPoint.visionGeoFusedCepM).toFixed(0));

    return {
      timeSweep,
      currentGsdCm: Number(currentGsdCm.toFixed(1)),
      finalInsErrorM: currentFinalPoint.pureInsErrorM,
      finalFusedCepM: currentFinalPoint.visionGeoFusedCepM,
      driftSuppressionRatio,
      avgMatchedPoints: Math.round(timeSweep.reduce((acc, p) => acc + p.keypointsMatchedCount, 0) / timeSweep.length),
    };
  }, [
    flightAltitudeM,
    matchingRateHz,
    featureMatcher,
    insGrade,
    cloudShadowCoverPct,
  ]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-slate-100 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-500 text-white shadow-lg shadow-yellow-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Оптическая Геопривязка БПЛА в Условиях РЭБ (GPS-Denied)
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-amber-950 text-amber-400 border border-amber-800/80">
                  SuperGlue Orthophoto Matching
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Сопоставление снимков с ортофотопланом, компенсация дрейфа БИНС (ИНС) и удержание кругового вероятного отклонения (КВО &lt; 1.5м)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl border bg-emerald-950/80 border-emerald-800/50 text-emerald-300 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="text-xs">Точность КВО (CEP):</span>
            <span className="text-xs font-mono font-bold">
              ±{navigationAnalysis.finalFusedCepM} м
            </span>
          </div>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="my-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-amber-400" />
          Характер Подстилающей Поверхности & Рельефа:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {GEO_TERRAIN_PRESETS.map((preset) => {
            const isSelected = preset.id === selectedPresetId;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  setSelectedPresetId(preset.id);
                  setFlightAltitudeM(preset.flightAltitudeM);
                }}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-950/70 border-amber-400/80 shadow-md shadow-amber-950/40 ring-1 ring-amber-400/50'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/70'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-black ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                    H = {preset.flightAltitudeM} м
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    GSD {preset.groundSampleDistanceCm} см
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
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              Алгоритм Матчинга:
            </span>
            <span className="font-mono text-amber-300 font-bold">{featureMatcher}</span>
          </div>
          <select
            value={featureMatcher}
            onChange={(e) => setFeatureMatcher(e.target.value as any)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
          >
            <option value="SuperGlue_Deep">SuperPoint + SuperGlue (Нейросетевой)</option>
            <option value="SIFT_ORB">SIFT / ORB Scale-Invariant</option>
            <option value="NCC_Template">NCC Нормированная Корреляция</option>
          </select>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              Класс Точности БИНС (ИНС):
            </span>
            <span className="font-mono text-cyan-300 font-bold">{insGrade}</span>
          </div>
          <select
            value={insGrade}
            onChange={(e) => setInsGrade(e.target.value as any)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
          >
            <option value="MEMS_Tactical">Тактический MEMS (15 м/мин дрейф)</option>
            <option value="FOG_HighEnd">Волоконно-Оптический ВОГ / FOG (2.5 м/мин)</option>
            <option value="MEMS_Commercial">Коммерческий IMU (35 м/мин)</option>
          </select>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Частота Оптической Коррекции (f_fix):
            </span>
            <span className="font-mono text-emerald-300 font-bold">{matchingRateHz} Гц</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={10}
            step={0.5}
            value={matchingRateHz}
            onChange={(e) => setMatchingRateHz(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-rose-400" />
              Тени и Облачность:
            </span>
            <span className="font-mono text-rose-300 font-bold">{cloudShadowCoverPct}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={70}
            step={5}
            value={cloudShadowCoverPct}
            onChange={(e) => setCloudShadowCoverPct(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
          />
        </div>
      </div>

      {/* Main Charts View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Chart 1: Navigation Position Error Growth (INS vs Vision-Aided) */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              Накопление Ошибки Координат: ИНС Без GPS (м) vs Оптическая Геопривязка
            </h4>
            <FullscreenGraphButton domain="uav_guidance" />
          </div>

          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={navigationAnalysis.timeSweep} margin={{ left: 0, right: 15, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timeMin" stroke="#64748b" tick={{ fontSize: 10 }} unit=" мин" />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} unit=" м" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#f59e0b', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="pureInsErrorM" name="Дрейф Автономной ИНС (м)" stroke="#f43f5e" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                <Line type="monotone" dataKey="visionGeoFusedCepM" name="КВО с Оптической Привязкой (м)" stroke="#10b981" strokeWidth={2.8} dot={false} />
                <ReferenceLine y={2.0} stroke="#06b6d4" strokeDasharray="2 2" label={{ value: 'Порог точного наведения (2.0м)', fill: '#06b6d4', fontSize: 9 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Matched Keypoints & Matching Confidence */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              Количество Валидных Точек Матчинга & Доверительная Вероятность (%)
            </h4>
            <FullscreenGraphButton domain="uav_guidance" />
          </div>

          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={navigationAnalysis.timeSweep} margin={{ left: 0, right: 15, top: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="geoMatchGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timeMin" stroke="#64748b" tick={{ fontSize: 10 }} unit=" мин" />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#f59e0b', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="keypointsMatchedCount" name="Совпавшие Точки (SuperGlue)" stroke="#f59e0b" fill="url(#geoMatchGradient)" strokeWidth={2.2} />
                <Line type="monotone" dataKey="confidencePct" name="Уверенность Фиксации (%)" stroke="#38bdf8" strokeWidth={1.8} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Physics Insights / Geo-Registration Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Подавление Дрейфа ИНС:</div>
          <div className="text-lg font-black font-mono text-amber-300">
            В {navigationAnalysis.driftSuppressionRatio} раз
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Ограничение накопления ошибки</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Разрешение На Снимке (GSD):</div>
          <div className="text-lg font-black font-mono text-emerald-300">
            {navigationAnalysis.currentGsdCm} см/пикс
          </div>
          <div className="text-[10px] text-slate-500 mt-1">На высоте {flightAltitudeM} м</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Среднее Число Точек Связи:</div>
          <div className="text-lg font-black font-mono text-cyan-300">
            {navigationAnalysis.avgMatchedPoints} точек/кадр
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Минимум для EKF: 30 точек</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-rose-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Дрейф ИНС За 30 Мин (Без Оптики):</div>
          <div className="text-lg font-black font-mono text-rose-300">
            {navigationAnalysis.finalInsErrorM} м
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Полный уход от маршрута</div>
        </div>
      </div>
    </div>
  );
};
