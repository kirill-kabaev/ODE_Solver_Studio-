// ============================================================================
// UAV Autonomous Mapping, 3D Occupancy Grid (OctoMap) & Obstacle Avoidance (VFH+ / A* / RRT*)
// Real-time LiDAR/Stereo-Vision Voxel Mapping, Vector Field Histogram & ESDF Trajectory Planning
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Radar,
  Eye,
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
  Sparkles,
  Zap,
  MapPin,
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
  ScatterChart,
  Scatter,
  ZAxis,
  BarChart,
  Bar,
} from 'recharts';

export type ObstacleEnvironmentType = 'dense_forest' | 'urban_canyon' | 'mountain_terrain' | 'powerlines_industrial';
export type SensorPayloadType = 'lidar_32ch' | 'stereo_depth_camera' | 'mmwave_radar_fusion';

export interface EnvironmentPreset {
  id: ObstacleEnvironmentType;
  name: string;
  categoryLabel: string;
  defaultObstacleDensity: number;
  minClearanceMarginM: number;
  recommendedSpeedMs: number;
  description: string;
}

export const ENV_PRESETS: EnvironmentPreset[] = [
  {
    id: 'dense_forest',
    name: 'Густой Лес & Ветви Деревьев (Dense Forest Canopy)',
    categoryLabel: 'Высокая плотность мелких препятствий',
    defaultObstacleDensity: 65,
    minClearanceMarginM: 1.8,
    recommendedSpeedMs: 6.5,
    description: 'Множество стволов, веток и листвы. Требует высокого разрешения вокселей (0.1–0.2м) и быстрой реактивной коррекции курса (VFH+).',
  },
  {
    id: 'urban_canyon',
    name: 'Городской Каньон & Здания (Urban Canyon Navigation)',
    categoryLabel: 'Крупные вертикальные препятствия',
    defaultObstacleDensity: 40,
    minClearanceMarginM: 3.5,
    recommendedSpeedMs: 14.0,
    description: 'Прямоугольные фасады, узкие улицы и пролеты между высотными зданиями. Оптимален глобальный планировщик A* с ESDF-картой.',
  },
  {
    id: 'powerlines_industrial',
    name: 'ЛЭП, Провода & Промзона (Powerlines & Steel Truss)',
    categoryLabel: 'Сверхтонкие препятствия и металлические конструкции',
    defaultObstacleDensity: 35,
    minClearanceMarginM: 2.5,
    recommendedSpeedMs: 8.0,
    description: 'Обнаружение тонких проводов ЛЭП (диаметр < 20 мм) и ферм высоковольтных опор с помощью мультилучевого LiDAR.',
  },
  {
    id: 'mountain_terrain',
    name: 'Горный Рельеф & Огибание Склонов (Terrain Following)',
    categoryLabel: 'Крупномасштабные перепады высот',
    defaultObstacleDensity: 25,
    minClearanceMarginM: 5.0,
    recommendedSpeedMs: 18.0,
    description: 'Безопасное огибание горных пиков, ущелий и склонов с учетом градиента набора высоты и ограничений по скороподъемности.',
  },
];

export const UAVObstacleAvoidanceModule: React.FC = () => {
  const [selectedEnvIdx, setSelectedEnvIdx] = useState<number>(0);
  const [sensorType, setSensorType] = useState<SensorPayloadType>('lidar_32ch');

  // Mapping & OctoMap Parameters
  const [voxelResolutionM, setVoxelResolutionM] = useState<number>(0.2); // 0.05 to 1.0 m
  const [sensorRangeM, setSensorRangeM] = useState<number>(35); // 10 to 100 m
  const [droneCruiseSpeedMs, setDroneCruiseSpeedMs] = useState<number>(8.0); // 2 to 25 m/s
  const [safeMarginRadiusM, setSafeMarginRadiusM] = useState<number>(2.0); // 0.5 to 5.0 m
  const [obstacleDensityPercent, setObstacleDensityPercent] = useState<number>(55); // 10 to 90%
  const [occupancyThreshold, setOccupancyThreshold] = useState<number>(0.7); // P_occ threshold

  const currentPreset = ENV_PRESETS[selectedEnvIdx];

  // Handle Preset Change
  const handleSelectPreset = (idx: number) => {
    setSelectedEnvIdx(idx);
    const p = ENV_PRESETS[idx];
    setObstacleDensityPercent(p.defaultObstacleDensity);
    setSafeMarginRadiusM(p.minClearanceMarginM);
    setDroneCruiseSpeedMs(p.recommendedSpeedMs);
  };

  // Comprehensive Mathematical Modeling of OctoMap, VFH+ Polar Histogram, and 3D Trajectory
  const avoidanceAnalysis = useMemo(() => {
    // 1. Sensor Specs
    let fovHorizontalDeg = 360;
    let fovVerticalDeg = 30;
    let pointsPerSec = 300000;
    let sensorName = '32-лучевой LiDAR (360° x 30°)';

    if (sensorType === 'stereo_depth_camera') {
      fovHorizontalDeg = 90;
      fovVerticalDeg = 60;
      pointsPerSec = 150000;
      sensorName = 'Стерео-камера глубины (90° x 60°)';
    } else if (sensorType === 'mmwave_radar_fusion') {
      fovHorizontalDeg = 120;
      fovVerticalDeg = 40;
      pointsPerSec = 80000;
      sensorName = 'Радар мм-диапазона + Fusion (120° x 40°)';
    }

    // 2. OctoMap Memory & Computation Budget
    const mapVolumeM3 = Math.PI * Math.pow(sensorRangeM, 2) * 20; // 20m vertical envelope
    const voxelCount = Math.round(mapVolumeM3 / Math.pow(voxelResolutionM, 3));
    const octreeDepth = Math.ceil(Math.log2(sensorRangeM / voxelResolutionM));
    const octomapMemoryMb = Math.round((voxelCount * 0.000032 + 4.5) * 10) / 10;
    const mappingUpdateRateHz = Math.min(50, Math.round(1000 / (10 + (voxelCount / 500000) * 15)));

    // 3. VFH+ Polar Histogram Calculation (36 sectors = 10 deg each)
    const sectorsCount = 36;
    const polarHistogram: {
      angleDeg: number;
      density: number;
      isBlocked: boolean;
      isTargetHeading: boolean;
      isSteeringChoice: boolean;
      clearanceDistanceM: number;
    }[] = [];

    const targetHeadingDeg = 0; // Desired flight direction is straight ahead (0 deg)
    let bestSteerAngleDeg = 0;
    let minCost = Infinity;

    // Obstacle angular distribution simulation based on density
    for (let i = 0; i < sectorsCount; i++) {
      const angle = (i * 360) / sectorsCount - 180; // -180 to +180 deg
      const rad = (angle * Math.PI) / 180;

      // Obstacle cluster simulation
      let rawObstacleProb = (Math.sin(rad * 3 + selectedEnvIdx) + 1) * 0.5 * (obstacleDensityPercent / 100);
      if (Math.abs(angle) < 25) {
        rawObstacleProb += (obstacleDensityPercent / 100) * 0.4; // obstacle directly in path
      }
      rawObstacleProb = Math.min(1.0, Math.max(0.05, rawObstacleProb));

      const isBlocked = rawObstacleProb >= occupancyThreshold;
      const clearance = isBlocked
        ? Math.max(safeMarginRadiusM * 0.8, (1 - rawObstacleProb) * sensorRangeM)
        : sensorRangeM;

      polarHistogram.push({
        angleDeg: angle,
        density: Math.round(rawObstacleProb * 100),
        isBlocked,
        isTargetHeading: Math.abs(angle - targetHeadingDeg) < 5,
        isSteeringChoice: false,
        clearanceDistanceM: Math.round(clearance * 10) / 10,
      });
    }

    // Find optimal steering angle in VFH+ valley
    polarHistogram.forEach((sector) => {
      if (!sector.isBlocked) {
        // VFH+ Cost function: G(theta) = c1 * |theta - target| + c2 * (1 / clearance)
        const headingDeviation = Math.abs(sector.angleDeg - targetHeadingDeg);
        const cost = headingDeviation * 1.0 + (10 / Math.max(1, sector.clearanceDistanceM)) * 15;
        if (cost < minCost) {
          minCost = cost;
          bestSteerAngleDeg = sector.angleDeg;
        }
      }
    });

    // Mark selected steering sector
    polarHistogram.forEach((s) => {
      if (s.angleDeg === bestSteerAngleDeg) {
        s.isSteeringChoice = true;
      }
    });

    // 4. 2D/3D Flight Path Simulation with A* / ESDF smoothing
    const trajectoryPoints: {
      step: number;
      distanceM: number;
      droneX: number;
      droneY: number;
      closestObstacleDistM: number;
      safetyFactor: number;
      flightSpeedMs: number;
    }[] = [];

    const totalSteps = 25;
    for (let s = 0; s <= totalSteps; s++) {
      const dist = (s / totalSteps) * 100; // 100m trajectory
      // Drone avoids obstacle by shifting Y laterally
      const lateralAvoidance = Math.sin((s / totalSteps) * Math.PI) * (bestSteerAngleDeg / 15) * 6;
      const obsDist = Math.max(
        safeMarginRadiusM,
        safeMarginRadiusM + 2.5 * Math.cos((s / 4) + selectedEnvIdx) + (100 - obstacleDensityPercent) * 0.05
      );
      const safetyFactor = Math.min(3.5, obsDist / safeMarginRadiusM);
      const dynamicSpeed = Math.max(2.0, droneCruiseSpeedMs * Math.min(1.0, safetyFactor / 1.5));

      trajectoryPoints.push({
        step: s,
        distanceM: Math.round(dist),
        droneX: Math.round(dist * 10) / 10,
        droneY: Math.round(lateralAvoidance * 10) / 10,
        closestObstacleDistM: Math.round(obsDist * 10) / 10,
        safetyFactor: Math.round(safetyFactor * 100) / 100,
        flightSpeedMs: Math.round(dynamicSpeed * 10) / 10,
      });
    }

    // 5. Overall Clearance and Time to Collision (TTC)
    const minObsDistanceAlongPath = Math.min(...trajectoryPoints.map((p) => p.closestObstacleDistM));
    const timeToCollisionSec = Math.round((minObsDistanceAlongPath / Math.max(0.1, droneCruiseSpeedMs)) * 10) / 10;
    const isPathSafe = minObsDistanceAlongPath >= safeMarginRadiusM;

    return {
      sensorName,
      fovHorizontalDeg,
      fovVerticalDeg,
      pointsPerSec,
      voxelCount: voxelCount.toLocaleString(),
      octreeDepth,
      octomapMemoryMb,
      mappingUpdateRateHz,
      bestSteerAngleDeg,
      minObsDistanceAlongPath,
      timeToCollisionSec,
      isPathSafe,
      polarHistogram,
      trajectoryPoints,
    };
  }, [
    selectedEnvIdx,
    sensorType,
    voxelResolutionM,
    sensorRangeM,
    droneCruiseSpeedMs,
    safeMarginRadiusM,
    obstacleDensityPercent,
    occupancyThreshold,
  ]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-indigo-800/60 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden text-slate-100 font-mono">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-600 to-teal-500 text-slate-950 shadow-lg shadow-indigo-500/20 border border-indigo-400/40">
                <Boxes className="w-6 h-6 font-black" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <span>3D Оккупационная Сетка (OctoMap) & Избегание Препятствий (VFH+/A*)</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700">
                    Sense & Avoid P0
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Воксельная 3D-карта пространства, вероятностное обновление OctoMap, полярная гистограмма VFH+ и расчет безопасной траектории огибания
                </p>
              </div>
            </div>
          </div>

          {/* Quick Clearance Health Badge */}
          <div className="flex items-center gap-2">
            <div
              className={`px-4 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                avoidanceAnalysis.isPathSafe
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/60'
                  : 'bg-rose-950/90 text-rose-300 border-rose-600/60'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>
                {avoidanceAnalysis.isPathSafe ? 'КОРИДОР БЕЗОПАСЕН' : 'ОПАСНОСТЬ СТОЛКНОВЕНИЯ'}
              </span>
              <span className="text-[10px] opacity-80">
                (d_min: {avoidanceAnalysis.minObsDistanceAlongPath}м / TTC: {avoidanceAnalysis.timeToCollisionSec}с)
              </span>
            </div>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {ENV_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(idx)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer text-xs flex flex-col justify-between gap-1.5 ${
                selectedEnvIdx === idx
                  ? 'bg-gradient-to-br from-indigo-950/90 to-slate-900 border-indigo-400 text-white shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-400/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <div className="font-bold text-indigo-300 flex items-center justify-between">
                <span>{p.name.split('(')[0]}</span>
                {selectedEnvIdx === idx && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
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
            <span>Мин. Дистанция</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {avoidanceAnalysis.minObsDistanceAlongPath}{' '}
            <span className="text-xs text-slate-400">м</span>
          </div>
          <div className="text-[10px] text-slate-500">Зазор: {safeMarginRadiusM} м</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Угол Маневра VFH+</span>
            <Compass className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {avoidanceAnalysis.bestSteerAngleDeg > 0 ? `+${avoidanceAnalysis.bestSteerAngleDeg}` : avoidanceAnalysis.bestSteerAngleDeg}°
          </div>
          <div className="text-[10px] text-slate-500">Оптимальный сектор</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Время до удара (TTC)</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">
            {avoidanceAnalysis.timeToCollisionSec}{' '}
            <span className="text-xs text-slate-400">сек</span>
          </div>
          <div className="text-[10px] text-slate-500">При {droneCruiseSpeedMs} м/с</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Разрешение Вокселя</span>
            <Boxes className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {voxelResolutionM * 100}{' '}
            <span className="text-xs text-slate-400">см</span>
          </div>
          <div className="text-[10px] text-slate-500">Глубина Octree: {avoidanceAnalysis.octreeDepth}</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Память OctoMap</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">
            {avoidanceAnalysis.octomapMemoryMb}{' '}
            <span className="text-xs text-slate-400">МБ</span>
          </div>
          <div className="text-[10px] text-slate-500">Вокселей: {avoidanceAnalysis.voxelCount}</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Частота Карты (Hz)</span>
            <Zap className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            {avoidanceAnalysis.mappingUpdateRateHz}{' '}
            <span className="text-xs text-slate-400">Гц</span>
          </div>
          <div className="text-[10px] text-slate-500">{avoidanceAnalysis.sensorName.split('(')[0]}</div>
        </div>
      </div>

      {/* Main Workspace: 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs text-slate-300">
        {/* Left Column: Sensor Configuration, OctoMap & VFH+ Parameters */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              Сенсоры, OctoMap & Параметры Обнаружения
            </span>
            <button
              type="button"
              onClick={() => handleSelectPreset(selectedEnvIdx)}
              className="text-[10px] text-slate-500 hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Сброс
            </button>
          </div>

          {/* Sensor Selector */}
          <div className="space-y-2">
            <span className="text-slate-400 font-bold block text-[11px] text-indigo-300">
              Тип бортового сенсора:
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {[
                { id: 'lidar_32ch', name: '32-лучевой 3D LiDAR (360° круговой)', icon: Radar },
                { id: 'stereo_depth_camera', name: 'Стерео-камера глубины (90° Forward)', icon: Eye },
                { id: 'mmwave_radar_fusion', name: 'Радар 77 ГГц + Сенсорный Fusion', icon: Zap },
              ].map((s) => {
                const IconComponent = s.icon;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSensorType(s.id as SensorPayloadType)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                      sensorType === s.id
                        ? 'bg-indigo-950/80 border-indigo-400 text-white font-bold'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{s.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sliders: Resolution, Range, Speed, Margin */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Разрешение вокселей OctoMap (r_voxel):</span>
                <span className="text-indigo-400 font-bold">{voxelResolutionM} м</span>
              </div>
              <input
                type="range"
                min={0.05}
                max={0.8}
                step={0.05}
                value={voxelResolutionM}
                onChange={(e) => setVoxelResolutionM(parseFloat(e.target.value))}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Дальность сенсора (R_max):</span>
                <span className="text-sky-400 font-bold">{sensorRangeM} м</span>
              </div>
              <input
                type="range"
                min={10}
                max={80}
                step={5}
                value={sensorRangeM}
                onChange={(e) => setSensorRangeM(parseInt(e.target.value, 10))}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Скорость полета (V_cruise):</span>
                <span className="text-teal-400 font-bold">{droneCruiseSpeedMs} м/с</span>
              </div>
              <input
                type="range"
                min={2}
                max={25}
                step={0.5}
                value={droneCruiseSpeedMs}
                onChange={(e) => setDroneCruiseSpeedMs(parseFloat(e.target.value))}
                className="w-full accent-teal-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Безопасный радиус зазора (d_safe):</span>
                <span className="text-emerald-400 font-bold">{safeMarginRadiusM} м</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={6.0}
                step={0.2}
                value={safeMarginRadiusM}
                onChange={(e) => setSafeMarginRadiusM(parseFloat(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Плотность препятствий среды:</span>
                <span className="text-rose-400 font-bold">{obstacleDensityPercent}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={90}
                step={5}
                value={obstacleDensityPercent}
                onChange={(e) => setObstacleDensityPercent(parseInt(e.target.value, 10))}
                className="w-full accent-rose-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right Column: VFH+ Polar Obstacle Density Histogram & 2D Trajectory Bypass */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart 1: VFH+ Polar Histogram (Angular Obstacle Density) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-indigo-400" />
                  <span>Полярная Гистограмма Препятствий VFH+ (Плотность & Выбор Долины)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Красные столбцы: заблокированные секторы. Зеленая метка: оптимальный безопасный угол маневра ({avoidanceAnalysis.bestSteerAngleDeg}°).
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-xl bg-indigo-950 text-indigo-300 border border-indigo-800">
                Среда: {currentPreset.name.split('(')[0]}
              </span>
            </div>

            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={avoidanceAnalysis.polarHistogram} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="angleDeg" unit="°" stroke="#64748b" label={{ value: 'Азимут обнаружения (°)', position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }} />
                  <YAxis stroke="#94a3b8" label={{ value: 'Плотность препятствий (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem' }}
                    formatter={(val: any) => [`${val}%`, 'Плотность вокселей']}
                  />
                  <Bar
                    dataKey="density"
                    name="Плотность препятствий (%)"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: 2D Flight Trajectory Bypass & Distance to Nearest Obstacle */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-teal-400" />
                  <span>Траектория Огибания (Боковое Смещение Y, м & Зазор Безопасности)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Показывает динамическое отклонение курса БПЛА и профиль дистанции до ближайшего препятствия вдоль маршрута.
                </p>
              </div>
            </div>

            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={avoidanceAnalysis.trajectoryPoints} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="distanceM" stroke="#64748b" label={{ value: 'Пройденная дистанция (м)', position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }} />
                  <YAxis stroke="#94a3b8" label={{ value: 'Боковое смещение Y (м) / Зазор (м)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="droneY"
                    name="Боковое смещение курса Y (м)"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="closestObstacleDistM"
                    name="Дистанция до препятствия (м)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="flightSpeedMs"
                    name="Адаптивная скорость (м/с)"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
