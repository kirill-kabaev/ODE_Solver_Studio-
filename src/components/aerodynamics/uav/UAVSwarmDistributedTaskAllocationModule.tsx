// ============================================================================
// UAV Swarm Distributed Task Allocation & CBBA Consensus Engine
// Consensus-Based Bundle Algorithm (CBBA), Auction Protocol & Target Assignment
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Users,
  Crosshair,
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
  Clock,
  Navigation,
  Compass,
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
  BarChart,
  Bar,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { FullscreenGraphButton } from '../../telemetry/FullscreenGraphButton';

export interface SwarmMissionScenario {
  id: string;
  name: string;
  numDrones: number;
  numTargets: number;
  commsLossProb: number;
  auctionType: 'CBBA' | 'Hungarian' | 'Greedy' | 'DynamicContract';
  description: string;
}

export const SWARM_SCENARIOS: SwarmMissionScenario[] = [
  {
    id: 'suppression_air_defense',
    name: 'Подавление ПВО (SEAD / DEAD Strike)',
    numDrones: 8,
    numTargets: 12,
    commsLossProb: 0.15,
    auctionType: 'CBBA',
    description: 'Группа ударных и ложных целей. Распределение РЛС, ПУ и командных пунктов с приоритетом уничтожения излучающих источников.',
  },
  {
    id: 'recon_area_search',
    name: 'Поисково-Разведывательный Рой (Grid Search & Rescue)',
    numDrones: 6,
    numTargets: 18,
    commsLossProb: 0.05,
    auctionType: 'CBBA',
    description: 'Оптимизация маршрутов патрулирования и обнаружения выживших/техники с минимизацией суммарного расхода энергии.',
  },
  {
    id: 'cooperative_interception',
    name: 'Рой-Перехватчик Крылатых Ракет (High-G Intercept)',
    numDrones: 10,
    numTargets: 8,
    commsLossProb: 0.25,
    auctionType: 'CBBA',
    description: 'Критическое время реакции (<2.5 с). Перехват высокоскоростных воздушных целей с распределением углов атаки.',
  },
  {
    id: 'ew_distributed_jamming',
    name: 'Распределенный РЭБ-Барьер (Distributed Jamming Mesh)',
    numDrones: 5,
    numTargets: 10,
    commsLossProb: 0.35,
    auctionType: 'DynamicContract',
    description: 'Создание адаптивной зоны радиоподавления. Перераспределение частотных каналов при выходе дронов из строя.',
  },
];

export const UAVSwarmDistributedTaskAllocationModule: React.FC = () => {
  // Scenario and control states
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('suppression_air_defense');
  const [numDrones, setNumDrones] = useState<number>(8);
  const [numTargets, setNumTargets] = useState<number>(12);
  const [maxBundleSize, setMaxBundleSize] = useState<number>(3); // Max tasks per drone
  const [commLatencyMs, setCommLatencyMs] = useState<number>(45); // Mesh network latency (ms)
  const [packetLossRate, setPacketLossRate] = useState<number>(15); // Packet loss %
  const [sensorQualityFactor, setSensorQualityFactor] = useState<number>(0.9); // Sensor fidelity

  const activeScenario = useMemo(() => {
    return SWARM_SCENARIOS.find((s) => s.id === selectedScenarioId) || SWARM_SCENARIOS[0];
  }, [selectedScenarioId]);

  // CBBA Algorithm & Convergence Simulation
  const allocationAnalysis = useMemo(() => {
    // 1. Generate Drone and Target Coordinates in a 100x100 km tactical area
    const droneCoordinates: Array<{ id: number; x: number; y: number; batteryPct: number; assignedTargets: number[] }> = [];
    for (let i = 1; i <= numDrones; i++) {
      const angle = (i / numDrones) * 2 * Math.PI;
      const radius = 25 + (i % 3) * 10;
      droneCoordinates.push({
        id: i,
        x: Math.round(50 + radius * Math.cos(angle)),
        y: Math.round(50 + radius * Math.sin(angle)),
        batteryPct: Math.round(75 + (i * 7) % 25),
        assignedTargets: [],
      });
    }

    const targetCoordinates: Array<{ id: number; x: number; y: number; priority: number; value: number }> = [];
    for (let j = 1; j <= numTargets; j++) {
      const tx = Math.round(20 + ((j * 37) % 65));
      const ty = Math.round(20 + ((j * 53) % 65));
      const priority = 1 + (j % 5);
      targetCoordinates.push({
        id: j,
        x: tx,
        y: ty,
        priority,
        value: priority * 100 + ((j * 17) % 50),
      });
    }

    // 2. Simulate CBBA Iterations and Consensus Convergence
    // In CBBA, convergence depends on bundle construction and consensus communication rounds
    const convergenceIterations: Array<{
      iteration: number;
      assignedPct: number;
      conflictCount: number;
      totalRewardScore: number;
      networkLatencyMs: number;
    }> = [];

    const effectiveLatency = commLatencyMs * (1 + packetLossRate / 100);
    const maxIters = 8;
    let conflicts = Math.round(numTargets * 1.5);
    let assigned = 20;
    let baseScore = 0;

    for (let it = 1; it <= maxIters; it++) {
      assigned = Math.min(100, Math.round(30 + (it / maxIters) * 70));
      conflicts = Math.max(0, Math.round(conflicts * 0.45 - (it >= 4 ? 2 : 0)));
      const currentScore = Math.round((assigned / 100) * numTargets * 280 * sensorQualityFactor);

      convergenceIterations.push({
        iteration: it,
        assignedPct: assigned,
        conflictCount: conflicts,
        totalRewardScore: currentScore,
        networkLatencyMs: Number((effectiveLatency * (1 + (conflicts / 10) * 0.2)).toFixed(1)),
      });
      baseScore = currentScore;
    }

    // 3. Drone Workload Distribution
    const droneWorkloads: Array<{
      droneName: string;
      tasksCount: number;
      energyExpenseKwh: number;
      responseLatencyMs: number;
    }> = [];

    let remainingTargets = numTargets;
    for (let i = 1; i <= numDrones; i++) {
      const allocatedTasks = Math.min(maxBundleSize, Math.max(1, Math.round(remainingTargets / (numDrones - i + 1))));
      remainingTargets = Math.max(0, remainingTargets - allocatedTasks);
      const energyExp = Number((0.45 + allocatedTasks * 0.65).toFixed(2));
      const droneLatency = Math.round(effectiveLatency + i * 2.5);

      droneWorkloads.push({
        droneName: `БПЛА-${i}`,
        tasksCount: allocatedTasks,
        energyExpenseKwh: energyExp,
        responseLatencyMs: droneLatency,
      });
    }

    // 4. Global Metrics
    const totalAssignedTasks = droneWorkloads.reduce((acc, d) => acc + d.tasksCount, 0);
    const assignmentEfficiencyPct = Number(((totalAssignedTasks / numTargets) * 100).toFixed(1));
    const consensusTimeSec = Number(((convergenceIterations.length * effectiveLatency) / 1000).toFixed(2));
    const isOptimalConsensus = conflicts === 0 && assignmentEfficiencyPct >= 95;

    return {
      droneCoordinates,
      targetCoordinates,
      convergenceIterations,
      droneWorkloads,
      totalAssignedTasks,
      assignmentEfficiencyPct,
      consensusTimeSec,
      isOptimalConsensus,
      finalRewardScore: baseScore,
    };
  }, [
    numDrones,
    numTargets,
    maxBundleSize,
    commLatencyMs,
    packetLossRate,
    sensorQualityFactor,
  ]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-slate-100 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-lg shadow-cyan-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Распределенное Целераспределение Роя БПЛА & Алгоритм CBBA
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800/80">
                  Consensus-Based Bundle (CBBA)
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Децентрализованный аукционный протокол консенсуса, разрешение конфликтов в Mesh-сети и оптимизация пакета задач
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
            allocationAnalysis.isOptimalConsensus
              ? 'bg-emerald-950/80 border-emerald-800/50 text-emerald-300'
              : 'bg-amber-950/80 border-amber-800/50 text-amber-300'
          }`}>
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs">Сходимость Консенсуса:</span>
            <span className="text-xs font-mono font-bold">
              {allocationAnalysis.isOptimalConsensus ? 'Оптимальный Консенсус' : 'Итеративное Разрешение'}
            </span>
          </div>
        </div>
      </div>

      {/* Scenario Presets */}
      <div className="my-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
          Тактический Сценарий Применения Роя:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {SWARM_SCENARIOS.map((scenario) => {
            const isSelected = scenario.id === selectedScenarioId;
            return (
              <button
                key={scenario.id}
                onClick={() => {
                  setSelectedScenarioId(scenario.id);
                  setNumDrones(scenario.numDrones);
                  setNumTargets(scenario.numTargets);
                  setPacketLossRate(Math.round(scenario.commsLossProb * 100));
                }}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-950/70 border-cyan-400/80 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-400/50'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/70'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-black ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                    {scenario.numDrones} БПЛА → {scenario.numTargets} Целей
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {scenario.auctionType}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-bold mb-0.5">{scenario.name}</p>
                <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                  {scenario.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 mb-6">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              Количество БПЛА в Рое ($N_a$):
            </span>
            <span className="font-mono text-cyan-300 font-bold">{numDrones} ед.</span>
          </div>
          <input
            type="range"
            min={3}
            max={16}
            step={1}
            value={numDrones}
            onChange={(e) => setNumDrones(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5 text-rose-400" />
              Количество Целей/Задач ($N_t$):
            </span>
            <span className="font-mono text-rose-300 font-bold">{numTargets} задач</span>
          </div>
          <input
            type="range"
            min={4}
            max={24}
            step={1}
            value={numTargets}
            onChange={(e) => setNumTargets(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Задержка Mesh-Сети ($\tau$):
            </span>
            <span className="font-mono text-amber-300 font-bold">{commLatencyMs} мс (Потери: {packetLossRate}%)</span>
          </div>
          <input
            type="range"
            min={10}
            max={150}
            step={5}
            value={commLatencyMs}
            onChange={(e) => setCommLatencyMs(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Размер Пакета Задач (L_max):
            </span>
            <span className="font-mono text-emerald-300 font-bold">{maxBundleSize} задач/дрон</span>
          </div>
          <input
            type="range"
            min={1}
            max={6}
            step={1}
            value={maxBundleSize}
            onChange={(e) => setMaxBundleSize(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>
      </div>

      {/* Main Charts View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Chart 1: CBBA Consensus Convergence vs Iteration */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Сходимость Консенсуса CBBA: Задачи (%) и Конфликты Назначений
            </h4>
            <FullscreenGraphButton domain="uav_guidance" />
          </div>

          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={allocationAnalysis.convergenceIterations} margin={{ left: 0, right: 15, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="iteration" stroke="#64748b" tick={{ fontSize: 10 }} unit=" итер." />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#06b6d4', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="assignedPct" name="Назначено Задач (%)" stroke="#06b6d4" strokeWidth={2.5} />
                <Line type="monotone" dataKey="conflictCount" name="Нерешенные Конфликты (шт)" stroke="#f43f5e" strokeWidth={2} strokeDasharray="3 3" />
                <Line type="monotone" dataKey="networkLatencyMs" name="Эфф. Задержка (мс)" stroke="#fbbf24" strokeWidth={1.8} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Drone Task Load Distribution */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Распределение Нагрузки по БПЛА (Задачи & Расход Энергии кВт·ч)
            </h4>
            <FullscreenGraphButton domain="uav_guidance" />
          </div>

          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={allocationAnalysis.droneWorkloads} margin={{ left: 0, right: 15, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="droneName" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#10b981', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="tasksCount" name="Назначено Задач (ед)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="energyExpenseKwh" name="Расход Энергии (кВт·ч)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Physics Insights / Swarm Architecture Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Эффективность Назначения:</div>
          <div className="text-lg font-black font-mono text-cyan-300">
            {allocationAnalysis.assignmentEfficiencyPct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Распределено {allocationAnalysis.totalAssignedTasks} из {numTargets} задач</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Время Достижения Консенсуса:</div>
          <div className="text-lg font-black font-mono text-emerald-300">
            {allocationAnalysis.consensusTimeSec} с
          </div>
          <div className="text-[10px] text-slate-500 mt-1">При задержке Mesh {commLatencyMs} мс</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Интегральный Выигрыш (Score):</div>
          <div className="text-lg font-black font-mono text-amber-300">
            {allocationAnalysis.finalRewardScore} pts
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Максимизация ценности целей</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-blue-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Устойчивость к Потерям Связи:</div>
          <div className="text-lg font-black font-mono text-blue-300">
            {packetLossRate <= 20 ? 'Высокая (Robust Mesh)' : 'Деградированная'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Пакетный дроп: {packetLossRate}%</div>
        </div>
      </div>
    </div>
  );
};
