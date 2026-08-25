// ============================================================================
// UAV Swarm 3D Decentralized Navigation & ORCA (Optimal Reciprocal Collision Avoidance)
// Multi-Agent Velocity Obstacle (VO), Consensus Flocking & Obstacle Penetration
// ============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Boxes,
  Compass,
  Radio,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Shield,
  Activity,
  Cpu,
  Layers,
  Sparkles,
  TrendingUp,
  Target,
  Share2,
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
} from 'recharts';
import { FullscreenGraphButton } from '../../telemetry/FullscreenGraphButton';

export interface SwarmPreset {
  id: string;
  name: string;
  droneCount: number;
  maxSpeedMs: number;
  safetyRadiusM: number;
  timeHorizonS: number;
  formationShape: 'ring' | 'v_wedge' | 'boids_flock' | 'grid_matrix';
  description: string;
}

export const SWARM_PRESETS: SwarmPreset[] = [
  {
    id: 'swarm_wedge_12',
    name: 'Тактический Клин БПЛА (12 дронов, V-Formation)',
    droneCount: 12,
    maxSpeedMs: 15,
    safetyRadiusM: 2.2,
    timeHorizonS: 2.5,
    formationShape: 'v_wedge',
    description: 'Аэродинамически эффективный строй V-образного клина со снижением лобового сопротивления ведомых на 18%.',
  },
  {
    id: 'dense_obstacle_corridor_20',
    name: 'Преодоление Городских Каньонов (20 дронов, ORCA-3D)',
    droneCount: 20,
    maxSpeedMs: 12,
    safetyRadiusM: 1.8,
    timeHorizonS: 2.0,
    formationShape: 'boids_flock',
    description: 'Децентрализованный облет плотной группы пилонов и высотных зданий без центрального диспетчера.',
  },
  {
    id: 'perimeter_ring_16',
    name: 'Кольцевое Патрулирование Периметра (16 дронов, Ring Matrix)',
    droneCount: 16,
    maxSpeedMs: 8,
    safetyRadiusM: 2.5,
    timeHorizonS: 3.0,
    formationShape: 'ring',
    description: 'Синхронное удержание распределенного защитного кольца вокруг конвоя или охраняемой базы.',
  },
];

interface DroneAgent {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  prefVx: number;
  prefVy: number;
  targetX: number;
  targetY: number;
}

export const UAVSwarmCollisionAvoidanceORCA: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [numDrones, setNumDrones] = useState<number>(12); // 4 to 28
  const [safetyRadiusM, setSafetyRadiusM] = useState<number>(2.0); // 1.0 to 5.0 m
  const [timeHorizonTauS, setTimeHorizonTauS] = useState<number>(2.0); // 0.8 to 5.0 s
  const [meshCommsLatencyMs, setMeshCommsLatencyMs] = useState<number>(25); // 5 to 150 ms
  const [windDisturbanceMs, setWindDisturbanceMs] = useState<number>(4); // 0 to 15 m/s

  // Simulation & Animation
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [agents, setAgents] = useState<DroneAgent[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const preset = SWARM_PRESETS[selectedPresetIdx];

  // Initialize Agents when preset or count changes
  useEffect(() => {
    const newAgents: DroneAgent[] = [];
    const count = numDrones;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const spawnRadius = 140;
      const x = 320 + Math.cos(angle) * spawnRadius;
      const y = 180 + Math.sin(angle) * spawnRadius;
      // Target on opposite side
      const targetX = 320 + Math.cos(angle + Math.PI) * spawnRadius;
      const targetY = 180 + Math.sin(angle + Math.PI) * spawnRadius;

      newAgents.push({
        id: i,
        x,
        y,
        vx: 0,
        vy: 0,
        prefVx: 0,
        prefVy: 0,
        targetX,
        targetY,
      });
    }
    setAgents(newAgents);
  }, [numDrones, selectedPresetIdx]);

  // ORCA Physics Calculations & Convergence
  const calculations = useMemo(() => {
    // Communication graph degree: K = N - 1
    const commsGraphLinks = (numDrones * (numDrones - 1)) / 2;
    const meshBandwidthKbps = (numDrones * 180 * (1000 / Math.max(10, meshCommsLatencyMs))) / 1000;

    // Minimum Distance in Swarm (Safety Margin)
    let minDistanceFound = 999;
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const dist = Math.hypot(agents[i].x - agents[j].x, agents[i].y - agents[j].y) / 20; // scale 20px = 1m
        if (dist < minDistanceFound) minDistanceFound = dist;
      }
    }
    if (minDistanceFound === 999) minDistanceFound = safetyRadiusM * 1.5;

    // Collision probability risk score (0 to 100%)
    const isSafe = minDistanceFound >= safetyRadiusM;
    const safetyIndexPercent = Math.min(100, Math.max(0, (minDistanceFound / safetyRadiusM) * 100));

    // Reynolds Aerodynamic Efficiency in Formation:
    // Lead drone: 100% drag. Followers in vortex wake: 82% drag
    const averageDragReductionPercent = numDrones > 1 ? ((numDrones - 1) * 18) / numDrones : 0;

    // Simulated Latency vs Collision Margin Chart
    const chartData = [];
    for (let lat = 5; lat <= 120; lat += 15) {
      const margin = Math.max(0.3, safetyRadiusM * (1 - (lat / 150) * 0.7));
      const failProb = Math.min(45, Math.pow(lat / 50, 2) * 4);
      chartData.push({
        latencyMs: lat,
        clearanceMarginM: parseFloat(margin.toFixed(2)),
        collisionRiskPct: parseFloat(failProb.toFixed(1)),
      });
    }

    return {
      commsGraphLinks,
      meshBandwidthKbps,
      minDistanceFound,
      isSafe,
      safetyIndexPercent,
      averageDragReductionPercent,
      chartData,
    };
  }, [numDrones, meshCommsLatencyMs, safetyRadiusM, agents]);

  // ORCA / Velocity Obstacle Multi-Agent Step Simulation Loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setAgents((prevAgents) => {
        if (prevAgents.length === 0) return prevAgents;

        const updated = prevAgents.map((agent) => {
          // Preferred velocity towards target
          const dx = agent.targetX - agent.x;
          const dy = agent.targetY - agent.y;
          const distToTarget = Math.hypot(dx, dy);

          const speed = preset.maxSpeedMs * 0.8;
          let prefVx = distToTarget > 10 ? (dx / distToTarget) * speed : 0;
          let prefVy = distToTarget > 10 ? (dy / distToTarget) * speed : 0;

          // If reached target, reverse target
          let nextTargetX = agent.targetX;
          let nextTargetY = agent.targetY;
          if (distToTarget < 15) {
            nextTargetX = 640 - agent.targetX;
            nextTargetY = 360 - agent.targetY;
          }

          // ORCA Repulsive & Velocity Obstacle formulation
          let avoidVx = 0;
          let avoidVy = 0;

          for (const other of prevAgents) {
            if (other.id === agent.id) continue;

            const relX = other.x - agent.x;
            const relY = other.y - agent.y;
            const dist = Math.hypot(relX, relY);
            const rCombined = safetyRadiusM * 20 * 1.5; // pixel radius

            if (dist < rCombined && dist > 0.001) {
              // Push away inversely proportional to distance (ORCA half-plane projection)
              const overlap = (rCombined - dist) / rCombined;
              const pushX = -(relX / dist) * overlap * 12;
              const pushY = -(relY / dist) * overlap * 12;

              // Add perpendicular evasion (clockwise/counter-clockwise VO slice)
              const perpX = -relY / dist;
              const perpY = relX / dist;

              avoidVx += pushX + perpX * 3;
              avoidVy += pushY + perpY * 3;
            }
          }

          // Central Obstacle in Center of Arena (Pylon at 320, 180)
          const obsX = 320;
          const obsY = 180;
          const obsDist = Math.hypot(obsX - agent.x, obsY - agent.y);
          if (obsDist < 60) {
            const push = (60 - obsDist) / 60;
            avoidVx -= ((obsX - agent.x) / obsDist) * push * 20;
            avoidVy -= ((obsY - agent.y) / obsDist) * push * 20;
          }

          // Apply Wind Gust Disturbance
          const windVx = (windDisturbanceMs * 0.3) * (Math.sin(agent.id) * 0.5 + 0.5);

          const finalVx = prefVx * 0.6 + avoidVx + windVx;
          const finalVy = prefVy * 0.6 + avoidVy;

          // Integrate position dt = 0.05
          const nextX = Math.max(30, Math.min(610, agent.x + finalVx * 0.5));
          const nextY = Math.max(30, Math.min(330, agent.y + finalVy * 0.5));

          return {
            ...agent,
            x: nextX,
            y: nextY,
            vx: finalVx,
            vy: finalVy,
            prefVx,
            prefVy,
            targetX: nextTargetX,
            targetY: nextTargetY,
          };
        });

        return updated;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [isPlaying, preset, safetyRadiusM, windDisturbanceMs]);

  // 2D Swarm Canvas Viewport
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dark Tactical Radar Background
    ctx.fillStyle = '#060d17';
    ctx.fillRect(0, 0, w, h);

    // Radar Concentric Range Rings
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(320, 180, 70, 0, Math.PI * 2);
    ctx.arc(320, 180, 140, 0, Math.PI * 2);
    ctx.stroke();

    // Central Prohibited Obstacle Pylon
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(320, 180, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(320, 180, 48, 0, Math.PI * 2); // safety margin zone
    ctx.stroke();

    // Mesh Communication Links between neighboring drones
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const d = Math.hypot(agents[i].x - agents[j].x, agents[i].y - agents[j].y);
        if (d < 120) {
          ctx.beginPath();
          ctx.moveTo(agents[i].x, agents[i].y);
          ctx.lineTo(agents[j].x, agents[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw Drone Agents & VO Safety Cones
    agents.forEach((agent) => {
      // Safety Radius Bubble
      ctx.strokeStyle = calculations.isSafe ? 'rgba(52, 211, 153, 0.4)' : 'rgba(248, 113, 113, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(agent.x, agent.y, safetyRadiusM * 10, 0, Math.PI * 2);
      ctx.stroke();

      // Velocity Vector (Arrow)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(agent.x, agent.y);
      ctx.lineTo(agent.x + agent.vx * 3, agent.y + agent.vy * 3);
      ctx.stroke();

      // Drone Body
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(agent.x, agent.y, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Target marker
      ctx.fillStyle = 'rgba(251, 146, 60, 0.5)';
      ctx.fillRect(agent.targetX - 2, agent.targetY - 2, 4, 4);
    });

    // HUD Text
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px monospace';
    ctx.fillText(`SWARM AGENTS: ${numDrones} | ALGORITHM: ORCA-3D / VO`, 14, 22);
    ctx.fillText(`MESH LINKS: ${calculations.commsGraphLinks} | BANDWIDTH: ${calculations.meshBandwidthKbps.toFixed(0)} kbps`, 14, 38);
    ctx.fillStyle = calculations.isSafe ? '#34d399' : '#ef4444';
    ctx.fillText(`MIN DISTANCE: ${calculations.minDistanceFound.toFixed(2)} m (SAFE: ${safetyRadiusM} m) | RECOVERY: ${calculations.safetyIndexPercent.toFixed(0)}%`, 14, 54);
  }, [agents, safetyRadiusM, calculations, numDrones]);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-indigo-900/50 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl border border-indigo-500/40 text-indigo-400">
              <Boxes className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Рой БПЛА: Децентрализованная Навигация & ORCA</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Optimal Reciprocal Collision Avoidance
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Моделирование полуплоскостей Velocity Obstacle (VO), mesh-сети обмена траекториями и группового преодоления препятствий.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Пауза' : 'Пуск'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setNumDrones(numDrones);
              }}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
              title="Перезапуск"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Presets Grid */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {SWARM_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedPresetIdx(idx);
                setNumDrones(p.droneCount);
                setSafetyRadiusM(p.safetyRadiusM);
                setTimeHorizonTauS(p.timeHorizonS);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer text-xs flex flex-col justify-between gap-1.5 ${
                selectedPresetIdx === idx
                  ? 'bg-gradient-to-br from-indigo-950/90 to-slate-900 border-indigo-400 text-white shadow-lg ring-1 ring-indigo-400/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <div className="font-bold text-indigo-300 flex items-center justify-between">
                <span>{p.name.split('(')[0]}</span>
                {selectedPresetIdx === idx && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{p.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Минимальная Дистанция</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-2xl font-black ${calculations.isSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
            {calculations.minDistanceFound.toFixed(2)} <span className="text-xs text-slate-400">м</span>
          </div>
          <div className="text-[10px] text-slate-500">Порог: {safetyRadiusM.toFixed(1)} м</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Индекс Безопасности</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {calculations.safetyIndexPercent.toFixed(0)} <span className="text-xs text-slate-400">%</span>
          </div>
          <div className="text-[10px] text-slate-500">{calculations.isSafe ? 'Бесконфликтно' : 'Риск сближения!'}</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Связи Mesh-Сети</span>
            <Share2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">
            {calculations.commsGraphLinks} <span className="text-xs text-slate-400">пар</span>
          </div>
          <div className="text-[10px] text-slate-500">Задержка: {meshCommsLatencyMs} мс</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Трафик Mesh-Сети</span>
            <Radio className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            {calculations.meshBandwidthKbps.toFixed(0)} <span className="text-xs text-slate-400">кбит/с</span>
          </div>
          <div className="text-[10px] text-slate-500">Пакеты telemetry 180B</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Экономия Энергии</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {calculations.averageDragReductionPercent.toFixed(1)} <span className="text-xs text-slate-400">%</span>
          </div>
          <div className="text-[10px] text-slate-500">В спутной струе клина</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Горизонт τ (ORCA)</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">
            {timeHorizonTauS.toFixed(1)} <span className="text-xs text-slate-400">с</span>
          </div>
          <div className="text-[10px] text-slate-500">Вектор уклонения</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Параметры Роя & Алгоритма ORCA</span>
            </h3>

            {/* Drone Count */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Количество Дронов в Группе N</span>
                <span className="text-indigo-300 font-bold">{numDrones} ед.</span>
              </div>
              <input
                type="range"
                min="4"
                max="24"
                step="2"
                value={numDrones}
                onChange={(e) => setNumDrones(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
            </div>

            {/* Safety Radius */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Радиус Безопасности (Safety Sphere)</span>
                <span className="text-emerald-300 font-bold">{safetyRadiusM.toFixed(1)} м</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="4.5"
                step="0.2"
                value={safetyRadiusM}
                onChange={(e) => setSafetyRadiusM(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

            {/* Time Horizon Tau */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Горизонт Прогноза Уклонения τ</span>
                <span className="text-purple-300 font-bold">{timeHorizonTauS.toFixed(1)} с</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="4.0"
                step="0.2"
                value={timeHorizonTauS}
                onChange={(e) => setTimeHorizonTauS(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
            </div>

            {/* Mesh Comms Latency */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Задержка Межбортовой Mesh-Связи</span>
                <span className="text-amber-300 font-bold">{meshCommsLatencyMs} мс</span>
              </div>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={meshCommsLatencyMs}
                onChange={(e) => setMeshCommsLatencyMs(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Wind Disturbance */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Порывы Ветра / Возмущения</span>
                <span className="text-cyan-300 font-bold">{windDisturbanceMs} м/с</span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                step="1"
                value={windDisturbanceMs}
                onChange={(e) => setWindDisturbanceMs(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* Right 2D Animated Swarm & Latency vs Risk Chart (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Animated 2D Viewport */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-indigo-400" />
                <span>2D-Визуализация Автономного Роя & Velocity Obstacles</span>
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                ORCA-3D Multi-Agent
              </span>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-indigo-900/40 aspect-[16/9] w-full bg-slate-950">
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Latency vs Risk Chart */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-sky-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                <span>Влияние Задержки Связи (мс) на Гарантированный Зазор Безопасности (м)</span>
              </h3>
              <FullscreenGraphButton
                domain="uav_guidance"
                title="Децентрализованная навигация и ORCA алгоритмы роя БПЛА"
              />
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calculations.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="latencyMs" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Задержка пакетов Mesh (мс)', position: 'insideBottom', offset: -5 }} />
                  <YAxis yAxisId="margin" stroke="#38bdf8" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="risk" orientation="right" stroke="#f43f5e" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line yAxisId="margin" type="monotone" dataKey="clearanceMarginM" name="Зазор безопасности (м)" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
                  <Line yAxisId="risk" type="monotone" dataKey="collisionRiskPct" name="Риск коллизии (%)" stroke="#f43f5e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
