// ============================================================================
// UAV Swarm Formation, Cooperative Mesh & Flocking Dynamics (Reynolds Boids + Consensus)
// Mathematical Modeling of Cohesion, Separation, Alignment, Collision Avoidance & Mesh Routing
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Users,
  Network,
  Radio,
  Zap,
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
  Share2,
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
} from 'recharts';

export type SwarmTopology = 'v_formation' | 'grid_matrix' | 'dynamic_flocking' | 'escort_ring';
export type EWMeshThreatLevel = 'none' | 'moderate_jamming' | 'heavy_node_loss';

export interface SwarmMissionPreset {
  id: SwarmTopology;
  name: string;
  categoryLabel: string;
  defaultDroneCount: number;
  desiredSeparationM: number;
  missionRadiusM: number;
  maxSwarmSpeedMs: number;
  description: string;
}

export const SWARM_PRESETS: SwarmMissionPreset[] = [
  {
    id: 'v_formation',
    name: 'Клин / V-Эшелон (Аэродинамический Swarm)',
    categoryLabel: 'Аэродинамический Эшелон с Экономией Энергии',
    defaultDroneCount: 9,
    desiredSeparationM: 35,
    missionRadiusM: 2500,
    maxSwarmSpeedMs: 32,
    description: 'Построение клином: ведомые дроны используют концевые вихри ведущего (Upwash Vortex), снижая расход энергии до 14–18%.',
  },
  {
    id: 'dynamic_flocking',
    name: 'Динамический Рой (Алгоритм Рейнольдса / Boids)',
    categoryLabel: 'Автономный Рой: Когезия, Сепарация, Выравнивание',
    defaultDroneCount: 16,
    desiredSeparationM: 25,
    missionRadiusM: 1800,
    maxSwarmSpeedMs: 24,
    description: 'Самоорганизующийся рой без единой точки отказа (децентрализованный консенсус по вектору скорости и избеганию препятствий).',
  },
  {
    id: 'grid_matrix',
    name: 'Поисковая Сетка / Фронт (Wide-Area Search & Rescue)',
    categoryLabel: 'Площадное Зонирование & Картографирование',
    defaultDroneCount: 12,
    desiredSeparationM: 120,
    missionRadiusM: 3500,
    maxSwarmSpeedMs: 20,
    description: 'Линейное или матричное покрытие большой площади сенсорами с адаптивным перераспределением секторов при выбывании дронов.',
  },
  {
    id: 'escort_ring',
    name: 'Кольцевой Эскорт / Охранение VIP-Объекта (Ring Patrol)',
    categoryLabel: 'Периметральное Барражирование & Эскорт',
    defaultDroneCount: 8,
    desiredSeparationM: 60,
    missionRadiusM: 800,
    maxSwarmSpeedMs: 18,
    description: 'Равномерное орбитальное распределение дронов по окружности с непрерывным перекрытием 360° зон наблюдения.',
  },
];

export const UAVSwarmFlockingModule: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  
  // Swarm & Flocking Parameters
  const [droneCount, setDroneCount] = useState<number>(9);
  const [desiredSeparationM, setDesiredSeparationM] = useState<number>(35);
  const [cohesionWeight, setCohesionWeight] = useState<number>(1.2); // W_coh: Attraction to center of mass
  const [separationWeight, setSeparationWeight] = useState<number>(1.8); // W_sep: Repulsion from close neighbors
  const [alignmentWeight, setAlignmentWeight] = useState<number>(1.0); // W_ali: Matching velocity vectors
  
  // Mesh Communication & Jamming Resilience
  const [meshTxPowerDbm, setMeshTxPowerDbm] = useState<number>(20); // 100 mW Mesh RF
  const [packetLossPercent, setPacketLossPercent] = useState<number>(5); // 0-50%
  const [disabledNodesCount, setDisabledNodesCount] = useState<number>(1); // Number of downed/jammed drones
  const [threatLevel, setThreatLevel] = useState<EWMeshThreatLevel>('none');

  const preset = SWARM_PRESETS[selectedPresetIdx];

  // Handle Preset Selection
  const handleSelectPreset = (idx: number) => {
    setSelectedPresetIdx(idx);
    const p = SWARM_PRESETS[idx];
    setDroneCount(p.defaultDroneCount);
    setDesiredSeparationM(p.desiredSeparationM);
  };

  // Mathematical Simulation of Swarm Formations, Reynolds Boids, and Mesh Connectivity Graph
  const swarmAnalysis = useMemo(() => {
    // 1. Initial 2D Positions & Target Formation Layout
    const drones: {
      id: number;
      x: number;
      y: number;
      vx: number;
      vy: number;
      active: boolean;
      inducedDragReductionPercent: number;
      meshNeighborsCount: number;
    }[] = [];

    const activeDronesCount = Math.max(1, droneCount - disabledNodesCount);

    // Layout generators
    for (let i = 0; i < droneCount; i++) {
      const isActive = i < activeDronesCount;
      let targetX = 0;
      let targetY = 0;
      let aeroDragBenefit = 0;

      if (preset.id === 'v_formation') {
        // V-Formation: Leader at (0, 0), Left wing i odd, Right wing i even
        if (i === 0) {
          targetX = 0;
          targetY = 0;
          aeroDragBenefit = 0; // Leader takes full drag
        } else {
          const side = i % 2 === 1 ? -1 : 1;
          const rank = Math.ceil(i / 2);
          targetX = side * rank * desiredSeparationM;
          targetY = -rank * desiredSeparationM * 1.2;
          aeroDragBenefit = Math.min(18.5, 12 + rank * 1.5); // Upwash energy saving
        }
      } else if (preset.id === 'escort_ring') {
        const angle = (i * 2 * Math.PI) / droneCount;
        const radius = desiredSeparationM * 2.5;
        targetX = radius * Math.cos(angle);
        targetY = radius * Math.sin(angle);
        aeroDragBenefit = 2.0;
      } else if (preset.id === 'grid_matrix') {
        const cols = Math.ceil(Math.sqrt(droneCount));
        const row = Math.floor(i / cols);
        const col = i % cols;
        targetX = (col - cols / 2) * desiredSeparationM;
        targetY = (row - cols / 2) * desiredSeparationM;
        aeroDragBenefit = 1.0;
      } else {
        // Dynamic flocking / pseudo-random cluster
        const angle = (i * 137.5 * Math.PI) / 180; // golden ratio dispersion
        const r = Math.sqrt(i) * desiredSeparationM * 0.9;
        targetX = r * Math.cos(angle);
        targetY = r * Math.sin(angle);
        aeroDragBenefit = 4.5;
      }

      drones.push({
        id: i + 1,
        x: Math.round(targetX),
        y: Math.round(targetY),
        vx: 24, // forward cruise speed
        vy: 0,
        active: isActive,
        inducedDragReductionPercent: isActive ? aeroDragBenefit : 0,
        meshNeighborsCount: 0,
      });
    }

    // 2. Mesh Connectivity Graph & Algebraic Connectivity (Fiedler Eigenvalue Proxy)
    const maxCommRangeM = Math.sqrt(Math.pow(10, (meshTxPowerDbm - 20) / 20)) * 250; // RF range proxy
    let totalMeshLinks = 0;
    let connectedNodes = 0;

    for (let i = 0; i < drones.length; i++) {
      if (!drones[i].active) continue;
      let neighbors = 0;
      for (let j = 0; j < drones.length; j++) {
        if (i === j || !drones[j].active) continue;
        const dist = Math.sqrt(Math.pow(drones[i].x - drones[j].x, 2) + Math.pow(drones[i].y - drones[j].y, 2));
        if (dist <= maxCommRangeM) {
          neighbors++;
          totalMeshLinks++;
        }
      }
      drones[i].meshNeighborsCount = neighbors;
      if (neighbors > 0) connectedNodes++;
    }

    totalMeshLinks = Math.floor(totalMeshLinks / 2); // undirected links
    const averageDegree = activeDronesCount > 0 ? (2 * totalMeshLinks) / activeDronesCount : 0;
    const isMeshFullyConnected = connectedNodes === activeDronesCount && activeDronesCount > 1;

    // 3. Average Drag Reduction across active swarm
    const avgDragReduction = activeDronesCount > 0
      ? drones.filter(d => d.active).reduce((sum, d) => sum + d.inducedDragReductionPercent, 0) / activeDronesCount
      : 0;

    // 4. Convergence & Formation Accuracy metric
    const boidsConvergenceIndex = Math.min(
      100,
      Math.max(20, 100 - packetLossPercent * 0.8 - (disabledNodesCount / droneCount) * 40 + (averageDegree >= 3 ? 10 : -10))
    );

    // 5. Scatter Plot Data for Swarm Positioning
    const scatterData = drones.map(d => ({
      name: `БПЛА #${d.id} ${!d.active ? '(ВЫБЫЛ / ПОДАВЛЕН)' : ''}`,
      x: d.x,
      y: d.y,
      z: d.meshNeighborsCount + 1,
      active: d.active ? 1 : 0,
      dragReduction: d.inducedDragReductionPercent,
      neighbors: d.meshNeighborsCount,
    }));

    // 6. Time-series Convergence Simulation (Reynolds forces vs time)
    const timeSteps = 20;
    const convergenceTimeSeries: {
      timeSec: number;
      formationErrorM: number;
      meshThroughputMbps: number;
      cohesionForce: number;
      separationForce: number;
    }[] = [];

    for (let t = 0; t <= timeSteps; t++) {
      const err = Math.max(0.2, 12 * Math.exp(-0.25 * t) + (packetLossPercent / 100) * 2.5);
      const throughput = Math.max(0.5, (100 - packetLossPercent) * 0.12 * (1 - disabledNodesCount / (droneCount * 1.5)));
      convergenceTimeSeries.push({
        timeSec: t,
        formationErrorM: Math.round(err * 100) / 100,
        meshThroughputMbps: Math.round(throughput * 10) / 10,
        cohesionForce: Math.round(cohesionWeight * (10 / (t + 1)) * 10) / 10,
        separationForce: Math.round(separationWeight * (8 / (t + 1)) * 10) / 10,
      });
    }

    return {
      activeDronesCount,
      totalMeshLinks,
      averageDegree: Math.round(averageDegree * 10) / 10,
      isMeshFullyConnected,
      avgDragReduction: Math.round(avgDragReduction * 10) / 10,
      boidsConvergenceIndex: Math.round(boidsConvergenceIndex),
      maxCommRangeM: Math.round(maxCommRangeM),
      scatterData,
      convergenceTimeSeries,
    };
  }, [preset, droneCount, desiredSeparationM, cohesionWeight, separationWeight, alignmentWeight, meshTxPowerDbm, packetLossPercent, disabledNodesCount]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 border border-teal-800/60 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden text-slate-100 font-mono">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500 via-emerald-600 to-cyan-500 text-slate-950 shadow-lg shadow-teal-500/20 border border-teal-400/40">
                <Users className="w-6 h-6 font-black" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <span>Рой БПЛА: Формации, Boids & Mesh-Сеть (Swarm Flocking)</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-teal-950 text-teal-300 border border-teal-700">
                    Swarm & Mesh P0
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Моделирование алгоритмов Рейнольдса (Когезия, Сепарация, Выравнивание), топологий V-клина, устойчивости Mesh-сети и аэродинамической экономии
                </p>
              </div>
            </div>
          </div>

          {/* Quick Swarm Health Badge */}
          <div className="flex items-center gap-2">
            <div className={`px-4 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
              swarmAnalysis.isMeshFullyConnected
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/60'
                : 'bg-amber-950/90 text-amber-300 border-amber-600/60'
            }`}>
              <Network className="w-4 h-4" />
              <span>Mesh: {swarmAnalysis.isMeshFullyConnected ? 'СВЯЗАН (100%)' : 'ДЕГРАДАЦИЯ СВЯЗИ'}</span>
              <span className="text-[10px] opacity-75">
                (Рейтинг: {swarmAnalysis.boidsConvergenceIndex}%)
              </span>
            </div>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {SWARM_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(idx)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer text-xs flex flex-col justify-between gap-1.5 ${
                selectedPresetIdx === idx
                  ? 'bg-gradient-to-br from-teal-950/90 to-slate-900 border-teal-400 text-white shadow-lg shadow-teal-950/50 ring-1 ring-teal-400/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <div className="font-bold text-teal-300 flex items-center justify-between">
                <span>{p.name.split('(')[0]}</span>
                {selectedPresetIdx === idx && <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />}
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
            <span>Активных Дронов</span>
            <Users className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            {swarmAnalysis.activeDronesCount} <span className="text-xs text-slate-400">/ {droneCount}</span>
          </div>
          <div className="text-[10px] text-slate-500">Потери: {disabledNodesCount} ед.</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Mesh-Связей (Links)</span>
            <Share2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {swarmAnalysis.totalMeshLinks}
          </div>
          <div className="text-[10px] text-slate-500">Ср. связность: {swarmAnalysis.averageDegree} соседей</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Экономия Энергии Роя</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            -{swarmAnalysis.avgDragReduction}%
          </div>
          <div className="text-[10px] text-slate-500">За счет Upwash вихрей</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Индекс Сходимости</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">
            {swarmAnalysis.boidsConvergenceIndex}%
          </div>
          <div className="text-[10px] text-slate-500">Стабильность строя</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Дистанция Эшелона</span>
            <Navigation className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {desiredSeparationM} <span className="text-xs text-slate-400">м</span>
          </div>
          <div className="text-[10px] text-slate-500">Безопасный интервал</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Дальность Mesh-Радио</span>
            <Radio className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">
            {swarmAnalysis.maxCommRangeM} <span className="text-xs text-slate-400">м</span>
          </div>
          <div className="text-[10px] text-slate-500">Мощность {meshTxPowerDbm} dBm</div>
        </div>
      </div>

      {/* Main Workspace: 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs text-slate-300">
        {/* Left Column: Swarm Architecture & Reynolds Flocking Forces */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-teal-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              Параметры Роя & Веса Рейнольдса
            </span>
            <button
              type="button"
              onClick={() => handleSelectPreset(selectedPresetIdx)}
              className="text-[10px] text-slate-500 hover:text-teal-400 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Сброс
            </button>
          </div>

          {/* Size & Separation */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Количество дронов в группе:</span>
                <span className="text-white font-bold">{droneCount} ед.</span>
              </div>
              <input
                type="range"
                min={3}
                max={32}
                step={1}
                value={droneCount}
                onChange={(e) => setDroneCount(parseInt(e.target.value, 10))}
                className="w-full accent-teal-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Желаемая дистанция разделения (d_sep):</span>
                <span className="text-cyan-400 font-bold">{desiredSeparationM} м</span>
              </div>
              <input
                type="range"
                min={10}
                max={200}
                step={5}
                value={desiredSeparationM}
                onChange={(e) => setDesiredSeparationM(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Reynolds Weights */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <span className="text-slate-400 font-bold block text-[11px] text-teal-300">
              Коэффициенты Boids (Правила Стаи):
            </span>

            <div>
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>1. Сепарация (Отталкивание при сближении W_sep):</span>
                <span className="text-rose-400 font-bold">{separationWeight.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={3.0}
                step={0.1}
                value={separationWeight}
                onChange={(e) => setSeparationWeight(parseFloat(e.target.value))}
                className="w-full accent-rose-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>2. Когезия (Стремление к центру группы W_coh):</span>
                <span className="text-emerald-400 font-bold">{cohesionWeight.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={3.0}
                step={0.1}
                value={cohesionWeight}
                onChange={(e) => setCohesionWeight(parseFloat(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>3. Выравнивание (Синхронизация скоростей W_ali):</span>
                <span className="text-sky-400 font-bold">{alignmentWeight.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={3.0}
                step={0.1}
                value={alignmentWeight}
                onChange={(e) => setAlignmentWeight(parseFloat(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Mesh RF & Electronic Warfare Degradation */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <span className="text-slate-400 font-bold block text-[11px] text-amber-300">
              Mesh-Связь & Имитация Потерь Узлов:
            </span>

            <div>
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>Потери дронов / подавленные узлы:</span>
                <span className="text-rose-400 font-bold">{disabledNodesCount} из {droneCount}</span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(0, droneCount - 2)}
                step={1}
                value={disabledNodesCount}
                onChange={(e) => setDisabledNodesCount(parseInt(e.target.value, 10))}
                className="w-full accent-rose-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>Потери пакетов в Mesh (Packet Loss):</span>
                <span className="text-amber-400 font-bold">{packetLossPercent}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={2}
                value={packetLossPercent}
                onChange={(e) => setPacketLossPercent(parseInt(e.target.value, 10))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right Column: 2D Swarm Scatter Spatial Layout & Convergence Graphs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart 1: 2D Spatial Swarm Layout (X-Y Plane) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-teal-400" />
                  <span>2D Карта Расположения Роя & Mesh-Топология (Плоскость X-Y)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Зеленые маркеры: активные дроны в строю. Красные: выбывшие или подавленные узлы.
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-xl bg-teal-950 text-teal-300 border border-teal-800">
                Формация: {preset.name.split('(')[0]}
              </span>
            </div>

            <div className="h-72 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="x"
                    type="number"
                    name="Координата X"
                    unit=" м"
                    stroke="#64748b"
                    label={{ value: 'Поперечное смещение X (м)', position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }}
                  />
                  <YAxis
                    dataKey="y"
                    type="number"
                    name="Координата Y"
                    unit=" м"
                    stroke="#94a3b8"
                    label={{ value: 'Продольное смещение Y (м)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                  />
                  <ZAxis dataKey="z" range={[80, 250]} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem' }}
                    formatter={(val: any, name: string) => [`${val}`, name]}
                  />
                  <Scatter
                    name="Активные БПЛА"
                    data={swarmAnalysis.scatterData.filter(d => d.active === 1)}
                    fill="#2dd4bf"
                  />
                  <Scatter
                    name="Подавленные БПЛА"
                    data={swarmAnalysis.scatterData.filter(d => d.active === 0)}
                    fill="#f43f5e"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Convergence Error & Mesh Throughput Dynamics */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>Динамика Сходимости Строя (Ошибка Позиционирования, м & Mesh Throughput)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Показывает стабилизацию расстояний между дронами во времени после маневра перестроения.
                </p>
              </div>
            </div>

            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={swarmAnalysis.convergenceTimeSeries} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="timeSec" stroke="#64748b" label={{ value: 'Время с начала перестроения (сек)', position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }} />
                  <YAxis stroke="#94a3b8" label={{ value: 'Ошибка строя (м) / Пропускная способность (Мбит/с)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="formationErrorM"
                    name="Ошибка строя (м)"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="meshThroughputMbps"
                    name="Пропускная способность Mesh (Мбит/с)"
                    stroke="#34d399"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="separationForce"
                    name="Сила сепарации"
                    stroke="#f43f5e"
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
