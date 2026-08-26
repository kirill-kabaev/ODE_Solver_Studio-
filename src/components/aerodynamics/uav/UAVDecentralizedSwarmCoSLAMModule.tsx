import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Share2,
  MapPin,
  Compass,
  Cpu,
  Layers,
  Activity,
  Zap,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Radio,
  Eye,
  Shield,
  Target,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface DroneAgent {
  id: number;
  name: string;
  x: number;
  y: number;
  heading_deg: number;
  speed_mps: number;
  battery_pct: number;
  exploredArea_m2: number;
  keyframesCount: number;
  loopClosuresFound: number;
  color: string;
  targetFrontier: { x: number; y: number } | null;
}

export const UAVDecentralizedSwarmCoSLAMModule: React.FC = () => {
  // Swarm configuration
  const [numDrones, setNumDrones] = useState<number>(4);
  const [meshBandwidth_kbps, setMeshBandwidth] = useState<number>(256);
  const [lidarRange_m, setLidarRangeM] = useState<number>(35.0);
  const [explorationStrategy, setExplorationStrategy] = useState<'frontier_entropy' | 'voronoi_partition' | 'random_walk'>('frontier_entropy');
  const [loopClosureThreshold, setLoopClosureThreshold] = useState<number>(0.82);
  const [isSimRunning, setIsSimRunning] = useState<boolean>(true);

  // Exploration progress
  const [totalExploredPct, setTotalExploredPct] = useState<number>(18.5);
  const [totalLoopClosures, setTotalLoopClosures] = useState<number>(12);
  const [meshPacketLossPct, setMeshPacketLossPct] = useState<number>(1.8);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simTimeRef = useRef<number>(0);

  // Agent states
  const [agents, setAgents] = useState<DroneAgent[]>([
    {
      id: 1,
      name: 'UAV-Alpha (Lead Scout)',
      x: 180,
      y: 160,
      heading_deg: 45,
      speed_mps: 4.5,
      battery_pct: 92,
      exploredArea_m2: 1250,
      keyframesCount: 145,
      loopClosuresFound: 4,
      color: '#38bdf8',
      targetFrontier: { x: 380, y: 120 },
    },
    {
      id: 2,
      name: 'UAV-Bravo (LiDAR Cartographer)',
      x: 150,
      y: 220,
      heading_deg: 120,
      speed_mps: 4.2,
      battery_pct: 88,
      exploredArea_m2: 1100,
      keyframesCount: 130,
      loopClosuresFound: 3,
      color: '#34d399',
      targetFrontier: { x: 420, y: 300 },
    },
    {
      id: 3,
      name: 'UAV-Charlie (Tunnel Penetrator)',
      x: 210,
      y: 190,
      heading_deg: 260,
      speed_mps: 3.8,
      battery_pct: 85,
      exploredArea_m2: 980,
      keyframesCount: 115,
      loopClosuresFound: 2,
      color: '#fbbf24',
      targetFrontier: { x: 120, y: 320 },
    },
    {
      id: 4,
      name: 'UAV-Delta (Mesh Relay Node)',
      x: 190,
      y: 240,
      heading_deg: 310,
      speed_mps: 3.5,
      battery_pct: 90,
      exploredArea_m2: 890,
      keyframesCount: 95,
      loopClosuresFound: 3,
      color: '#c084fc',
      targetFrontier: { x: 260, y: 80 },
    },
  ]);

  // Historical exploration timeline
  const [timelineData, setTimelineData] = useState<
    { time_sec: number; explored_pct: number; loop_closures: number; mesh_traffic_kbps: number }[]
  >([
    { time_sec: 0, explored_pct: 0, loop_closures: 0, mesh_traffic_kbps: 45 },
    { time_sec: 10, explored_pct: 5.2, loop_closures: 2, mesh_traffic_kbps: 120 },
    { time_sec: 20, explored_pct: 12.1, loop_closures: 6, mesh_traffic_kbps: 185 },
    { time_sec: 30, explored_pct: 18.5, loop_closures: 12, mesh_traffic_kbps: 215 },
  ]);

  // Sim loop for movement & exploration
  useEffect(() => {
    if (!isSimRunning) return;

    const timer = setInterval(() => {
      simTimeRef.current += 1;
      const t = simTimeRef.current;

      setAgents((prev) =>
        prev.slice(0, numDrones).map((a) => {
          // Move towards target frontier or orbit
          const dest = a.targetFrontier || { x: 300, y: 200 };
          const dx = dest.x - a.x;
          const dy = dest.y - a.y;
          const dist = Math.hypot(dx, dy);
          const targetHeading = (Math.atan2(dy, dx) * 180) / Math.PI;

          let newHeading = a.heading_deg + (targetHeading - a.heading_deg) * 0.1;
          const rad = (newHeading * Math.PI) / 180;
          const step = dist > 20 ? a.speed_mps * 1.2 : 0.5;

          const nx = Math.max(40, Math.min(650, a.x + Math.cos(rad) * step));
          const ny = Math.max(40, Math.min(360, a.y + Math.sin(rad) * step));

          // If reached frontier, assign a new pseudo-random exploration goal
          let newTarget = a.targetFrontier;
          if (dist < 25) {
            newTarget = {
              x: 80 + Math.random() * 540,
              y: 60 + Math.random() * 260,
            };
          }

          return {
            ...a,
            x: nx,
            y: ny,
            heading_deg: newHeading,
            exploredArea_m2: a.exploredArea_m2 + 15,
            keyframesCount: a.keyframesCount + (Math.random() > 0.6 ? 1 : 0),
          };
        })
      );

      setTotalExploredPct((prev) => Math.min(99.4, prev + 0.35 * (numDrones / 4)));
      if (Math.random() > 0.75) {
        setTotalLoopClosures((prev) => prev + 1);
      }

      // Add to timeline
      if (t % 5 === 0) {
        setTimelineData((prev) => [
          ...prev.slice(-15),
          {
            time_sec: t,
            explored_pct: Number(totalExploredPct.toFixed(1)),
            loop_closures: totalLoopClosures,
            mesh_traffic_kbps: Number((140 + numDrones * 25 + Math.random() * 30).toFixed(0)),
          },
        ]);
      }
    }, 150);

    return () => clearInterval(timer);
  }, [isSimRunning, numDrones, totalExploredPct, totalLoopClosures]);

  // Canvas Co-SLAM Occupancy Grid & Pose Graph Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dark Map Background
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    // Occupancy Grid Lines
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 25) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Simulated Obstacles / Urban Rubble / Tunnels
    const obstacles = [
      { x: 120, y: 80, w: 90, h: 40 },
      { x: 260, y: 140, w: 50, h: 120 },
      { x: 450, y: 80, w: 80, h: 70 },
      { x: 380, y: 240, w: 110, h: 45 },
      { x: 140, y: 270, w: 70, h: 50 },
    ];

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    obstacles.forEach((obs) => {
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
    });

    // 1. Draw Explored Areas (Lidar FOV cones & Occupancy coverage)
    agents.slice(0, numDrones).forEach((a) => {
      ctx.save();
      const grad = ctx.createRadialGradient(a.x, a.y, 5, a.x, a.y, lidarRange_m * 2.2);
      grad.addColorStop(0, `${a.color}40`);
      grad.addColorStop(0.6, `${a.color}15`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(a.x, a.y, lidarRange_m * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // LiDAR Rays
      ctx.strokeStyle = `${a.color}50`;
      ctx.lineWidth = 1;
      for (let r = 0; r < 12; r++) {
        const rayAngle = (r * (Math.PI * 2)) / 12 + simTimeRef.current * 0.05;
        const rx = a.x + Math.cos(rayAngle) * (lidarRange_m * 1.8);
        const ry = a.y + Math.sin(rayAngle) * (lidarRange_m * 1.8);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(rx, ry);
        ctx.stroke();
      }
      ctx.restore();
    });

    // 2. Inter-Drone P2P Mesh Communication Links
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    for (let i = 0; i < numDrones; i++) {
      for (let j = i + 1; j < numDrones; j++) {
        const a1 = agents[i];
        const a2 = agents[j];
        if (a1 && a2) {
          ctx.beginPath();
          ctx.moveTo(a1.x, a1.y);
          ctx.lineTo(a2.x, a2.y);
          ctx.stroke();

          // Packet exchange particle
          const packetT = ((simTimeRef.current * 0.1 + i + j) % 1);
          const px = a1.x + (a2.x - a1.x) * packetT;
          const py = a1.y + (a2.y - a1.y) * packetT;
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.setLineDash([]);
    ctx.restore();

    // 3. Draw Drones & Heading Indicators
    agents.slice(0, numDrones).forEach((a) => {
      ctx.save();
      // Target Line
      if (a.targetFrontier) {
        ctx.strokeStyle = `${a.color}80`;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.targetFrontier.x, a.targetFrontier.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Target marker
        ctx.fillStyle = a.color;
        ctx.beginPath();
        ctx.arc(a.targetFrontier.x, a.targetFrontier.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Drone Body
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Drone Heading Arrow
      const hRad = (a.heading_deg * Math.PI) / 180;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(a.x + Math.cos(hRad) * 14, a.y + Math.sin(hRad) * 14);
      ctx.stroke();

      // Drone ID Label
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`UAV-${a.id}`, a.x + 9, a.y - 6);
      ctx.restore();
    });

    // Map HUD Overlay
    ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
    ctx.fillRect(12, 12, 230, 85);
    ctx.strokeStyle = '#0284c7';
    ctx.strokeRect(12, 12, 230, 85);

    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('DECENTRALIZED CO-SLAM HUD', 22, 28);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Зона исследована: ${totalExploredPct.toFixed(1)}%`, 22, 44);
    ctx.fillText(`Замыканий петель (Loop Closures): ${totalLoopClosures}`, 22, 60);
    ctx.fillText(`Mesh трафик: ${meshBandwidth_kbps} kbps (Loss: ${meshPacketLossPct}%)`, 22, 76);
  }, [agents, numDrones, lidarRange_m, totalExploredPct, totalLoopClosures, meshBandwidth_kbps, meshPacketLossPct]);

  return (
    <div className="w-full bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 p-4 md:p-6 shadow-2xl font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 via-sky-500/20 to-blue-500/20 border border-sky-500/40 text-sky-400 shadow-inner">
            <Share2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-sky-950/80 border border-sky-500/40 text-sky-300">
                #103 Swarm Co-SLAM & Exploration
              </span>
              <h2 className="text-xl font-black text-white tracking-tight font-mono">
                Децентрализованный Co-SLAM Роя БПЛА в Зоне РЭБ (GNSS-Denied)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Распределенное картографирование Occupancy Grid, Frontier-based исследование тоннелей и руин, слияние факторных графов поз через P2P Mesh радиоканал.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSimRunning(!isSimRunning)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isSimRunning
                ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                : 'bg-slate-800 text-sky-400 hover:bg-slate-700 border border-sky-500/30'
            }`}
          >
            {isSimRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isSimRunning ? 'Пауза Роя' : 'Запуск Роя'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Охват карты</span>
            <Eye className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-xl font-black text-sky-400 font-mono mt-1">
            {totalExploredPct.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Frontier Coverage
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Агентов в Рое</span>
            <Share2 className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="text-xl font-black text-teal-400 font-mono mt-1">
            {numDrones} UAVs
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            P2P Mesh топология
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Loop Closures</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400 font-mono mt-1">
            {totalLoopClosures}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Порог схожести: {loopClosureThreshold}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Mesh Канал</span>
            <Radio className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-black text-purple-400 font-mono mt-1">
            {meshBandwidth_kbps}{' '}
            <span className="text-xs font-normal text-slate-400">кбит/с</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Потери: {meshPacketLossPct}%
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Дальность LiDAR</span>
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono mt-1">
            {lidarRange_m.toFixed(0)}{' '}
            <span className="text-xs font-normal text-slate-400">м</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            3D Point Cloud 20Hz
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Статус GNSS</span>
            <Shield className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="text-sm font-black text-red-400 font-mono mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> DENIED (РЭБ)
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Автономная VIO/SLAM
          </div>
        </div>
      </div>

      {/* Map & Swarm Canvas */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-sky-400" />
            2D Occupancy Grid Map & Pose Graph Оптимизация Роя:
          </span>
          <span className="text-[10px] font-mono text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-500/40">
            Стратегия: {explorationStrategy}
          </span>
        </div>

        <div className="relative w-full h-[360px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={720}
            height={360}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Settings & Sliders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            Конфигурация Роя Дронов
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-400 mb-1 font-mono">
                <span>Количество БПЛА в группе:</span>
                <span className="text-sky-300 font-bold">{numDrones} ед.</span>
              </div>
              <input
                type="range"
                min={2}
                max={4}
                step={1}
                value={numDrones}
                onChange={(e) => setNumDrones(parseInt(e.target.value))}
                className="w-full accent-sky-400"
              />
            </div>

            <div>
              <label className="text-slate-400 mb-1 block font-mono">Алгоритм распределения целей:</label>
              <select
                value={explorationStrategy}
                onChange={(e) => setExplorationStrategy(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs font-mono focus:border-sky-500 focus:outline-none"
              >
                <option value="frontier_entropy">Frontier Exploration (Максимум Энтропии)</option>
                <option value="voronoi_partition">Диаграмма Вороного (Зонирование)</option>
                <option value="random_walk">Случайное блуждание с репеллерами</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Radio className="w-4 h-4 text-purple-400" />
            Параметры Mesh-Сети & Данных
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-400 mb-1 font-mono">
                <span>Пропускная способность Mesh:</span>
                <span className="text-purple-300 font-bold">{meshBandwidth_kbps} кбит/с</span>
              </div>
              <input
                type="range"
                min={64}
                max={1024}
                step={64}
                value={meshBandwidth_kbps}
                onChange={(e) => setMeshBandwidth(parseInt(e.target.value))}
                className="w-full accent-purple-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1 font-mono">
                <span>Дальность сканирования LiDAR:</span>
                <span className="text-purple-300 font-bold">{lidarRange_m} м</span>
              </div>
              <input
                type="range"
                min={15}
                max={60}
                step={5}
                value={lidarRange_m}
                onChange={(e) => setLidarRangeM(parseFloat(e.target.value))}
                className="w-full accent-purple-400"
              />
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            SLAM Факторный Граф (iSAM2)
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-400 mb-1 font-mono">
                <span>Порог замыкания петель (Cosine):</span>
                <span className="text-amber-300 font-bold">{loopClosureThreshold}</span>
              </div>
              <input
                type="range"
                min={0.6}
                max={0.95}
                step={0.01}
                value={loopClosureThreshold}
                onChange={(e) => setLoopClosureThreshold(parseFloat(e.target.value))}
                className="w-full accent-amber-400"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-amber-500/30 text-[11px] text-slate-300 font-mono space-y-1">
              <div className="flex justify-between">
                <span>Слияние графов поз:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Синхронизировано
                </span>
              </div>
              <div className="flex justify-between">
                <span>Оценка глобального сдвига:</span>
                <span className="text-amber-300 font-bold">&Delta;T = &plusmn;0.08 м</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exploration Timeline Chart */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            Динамика Охвата Территории & Обмена Трафиком Mesh:
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Кривая исследованности vs Время (сек)
          </span>
        </div>

        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis
                dataKey="time_sec"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                label={{ value: 'Время (с)', position: 'insideBottomRight', offset: -5, fill: '#64748b', fontSize: 10 }}
              />
              <YAxis
                yAxisId="left"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                label={{ value: 'Охват (%)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                label={{ value: 'Трафик (кбит/с)', angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="explored_pct"
                name="Исследовано (%)"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="mesh_traffic_kbps"
                name="Mesh Трафик (кбит/с)"
                stroke="#c084fc"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
