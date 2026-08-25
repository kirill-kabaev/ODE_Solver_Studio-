import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Compass,
  Zap,
  Radio,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Activity,
  Layers,
  MapPin,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Cpu,
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

export const UAVQuantumGravimetricAnomalyNavModule: React.FC = () => {
  // Quantum Sensor States
  const [gravityGradNoise_E, setGravityGradNoise_E] = useState<number>(0.05); // Eötvös noise
  const [magnetometerSens_pT, setMagnetometerSens_pT] = useState<number>(1.2); // pT sensitivity
  const [ewJammedGps, setEwJammedGps] = useState<boolean>(true); // Complete GNSS denial
  const [kalmanParticleCount, setKalmanParticleCount] = useState<number>(400); // Particles in PF matching
  const [flightSpeed_mps, setFlightSpeed_mps] = useState<number>(85); // 85 m/s (~306 km/h)
  const [terrainComplexity, setTerrainComplexity] = useState<'mountainous' | 'volcanic_fault' | 'plains' | 'coastal'>('volcanic_fault');

  // Simulation Runtime
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simStep, setSimStep] = useState<number>(0);
  const [trajectoryHistory, setTrajectoryHistory] = useState<Array<{
    time_s: number;
    true_x: number;
    true_y: number;
    quantum_x: number;
    quantum_y: number;
    ins_drift_x: number;
    ins_drift_y: number;
    pos_error_m: number;
    ins_error_m: number;
    gravity_anom_mGal: number;
    mag_anom_nT: number;
  }>>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  // Mathematical terrain/gravity & magnetic potential function
  const getAnomaliesAtPos = (x: number, y: number) => {
    // Spatial wavelengths for gravity and magnetic maps
    const scale1 = 0.0004;
    const scale2 = 0.0012;

    let grav = 45 * Math.sin(x * scale1) * Math.cos(y * scale1) + 20 * Math.sin(x * scale2 + y * scale2);
    let mag = 180 * Math.cos(x * scale1 * 1.3) * Math.sin(y * scale1 * 0.9) + 75 * Math.cos(y * scale2 * 1.5);

    if (terrainComplexity === 'volcanic_fault') {
      grav += 35 * Math.sin((x - y) * 0.002);
      mag += 120 * Math.cos((x + y) * 0.0018);
    } else if (terrainComplexity === 'mountainous') {
      grav += 60 * Math.sin(x * 0.0008) * Math.cos(y * 0.0008);
      mag += 90 * Math.sin(y * 0.001);
    }

    return { grav_mGal: grav, mag_nT: mag };
  };

  // Step simulation
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setSimStep((s) => {
        const nextStep = s + 1;
        const dt = 1.0; // 1 second
        const t = nextStep * dt;

        // UAV flight trajectory: wavy path across 15 km
        const true_x = t * flightSpeed_mps;
        const true_y = 1200 * Math.sin(t * 0.035) + 400 * Math.cos(t * 0.015);

        // Standard pure INS drift without GPS (quadratic error growth ~ 0.5 * b * t^2)
        const ins_bias = 0.04;
        const ins_drift_x = true_x + ins_bias * Math.pow(t, 1.6);
        const ins_drift_y = true_y + 0.5 * ins_bias * Math.pow(t, 1.7);
        const ins_err = Math.sqrt(Math.pow(ins_drift_x - true_x, 2) + Math.pow(ins_drift_y - true_y, 2));

        // Quantum Gravimetric/Magnetic anomaly matching fix (bounded by quantum noise ~ < 1.5m)
        const { grav_mGal, mag_nT } = getAnomaliesAtPos(true_x, true_y);
        const noiseEffect = (gravityGradNoise_E * 12 + (magnetometerSens_pT / 100) * 8) / (kalmanParticleCount / 200);
        const q_noise_x = (Math.sin(t * 0.4) + Math.random() * 0.4 - 0.2) * (1.2 + noiseEffect);
        const q_noise_y = (Math.cos(t * 0.4) + Math.random() * 0.4 - 0.2) * (1.2 + noiseEffect);

        const quantum_x = true_x + q_noise_x;
        const quantum_y = true_y + q_noise_y;
        const q_err = Math.sqrt(Math.pow(q_noise_x, 2) + Math.pow(q_noise_y, 2));

        setTrajectoryHistory((prev) => {
          const updated = [
            ...prev,
            {
              time_s: t,
              true_x,
              true_y,
              quantum_x,
              quantum_y,
              ins_drift_x,
              ins_drift_y,
              pos_error_m: parseFloat(q_err.toFixed(2)),
              ins_error_m: parseFloat(ins_err.toFixed(1)),
              gravity_anom_mGal: parseFloat(grav_mGal.toFixed(1)),
              mag_anom_nT: parseFloat(mag_nT.toFixed(1)),
            },
          ];
          return updated.slice(-40);
        });

        return nextStep;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isPlaying, flightSpeed_mps, gravityGradNoise_E, magnetometerSens_pT, kalmanParticleCount, terrainComplexity]);

  // Canvas drawing: 2D Anomaly Heatmap & Real-Time Tracking
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Render geophysical contour background
    const imgData = ctx.createImageData(w, h);
    const lastPoint = trajectoryHistory[trajectoryHistory.length - 1];
    const originX = lastPoint ? lastPoint.true_x - 3000 : 0;
    const originY = lastPoint ? lastPoint.true_y - 1200 : 0;

    for (let py = 0; py < h; py += 4) {
      for (let px = 0; px < w; px += 4) {
        const worldX = originX + (px / w) * 6000;
        const worldY = originY + (py / h) * 2400;
        const { grav_mGal, mag_nT } = getAnomaliesAtPos(worldX, worldY);

        const normVal = Math.sin(grav_mGal * 0.08) * 0.5 + Math.cos(mag_nT * 0.02) * 0.5;
        const r = Math.floor(18 + Math.max(0, normVal * 60));
        const g = Math.floor(28 + Math.max(0, (1 - Math.abs(normVal)) * 50));
        const b = Math.floor(55 + Math.max(0, -normVal * 70));

        for (let dy = 0; dy < 4; dy++) {
          for (let dx = 0; dx < 4; dx++) {
            const idx = ((py + dy) * w + (px + dx)) * 4;
            if (idx < imgData.data.length) {
              imgData.data[idx] = r;
              imgData.data[idx + 1] = g;
              imgData.data[idx + 2] = b;
              imgData.data[idx + 3] = 255;
            }
          }
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Iso-gravity contour lines
    ctx.strokeStyle = '#38bdf822';
    ctx.lineWidth = 1;
    for (let c = 0; c < 5; c++) {
      ctx.beginPath();
      ctx.arc(w / 2 + Math.sin(c) * 80, h / 2 + Math.cos(c) * 40, 50 + c * 35, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Trajectory paths
    if (trajectoryHistory.length > 1) {
      // 1. Pure INS Drift path (Red dashed)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      trajectoryHistory.forEach((pt, i) => {
        const scrX = ((pt.ins_drift_x - originX) / 6000) * w;
        const scrY = ((pt.ins_drift_y - originY) / 2400) * h;
        if (i === 0) ctx.moveTo(scrX, scrY);
        else ctx.lineTo(scrX, scrY);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Quantum Gravimetric/Magnetic Filtered Fixes (Emerald / Cyan dots)
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      trajectoryHistory.forEach((pt, i) => {
        const scrX = ((pt.quantum_x - originX) / 6000) * w;
        const scrY = ((pt.quantum_y - originY) / 2400) * h;
        if (i === 0) ctx.moveTo(scrX, scrY);
        else ctx.lineTo(scrX, scrY);
      });
      ctx.stroke();

      // Draw particle filter swarm around current position
      const cur = trajectoryHistory[trajectoryHistory.length - 1];
      const curScrX = ((cur.quantum_x - originX) / 6000) * w;
      const curScrY = ((cur.quantum_y - originY) / 2400) * h;

      ctx.fillStyle = '#6ee7b744';
      for (let p = 0; p < 24; p++) {
        const angle = Math.random() * Math.PI * 2;
        const rDist = Math.random() * 18;
        ctx.beginPath();
        ctx.arc(curScrX + Math.cos(angle) * rDist, curScrY + Math.sin(angle) * rDist, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // UAV icon at current true pos
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(curScrX, curScrY, 5, 0, Math.PI * 2);
      ctx.fill();

      // Pulse ring
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(curScrX, curScrY, 14, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [trajectoryHistory]);

  const latest = trajectoryHistory[trajectoryHistory.length - 1] || {
    pos_error_m: 0.85,
    ins_error_m: 142.5,
    gravity_anom_mGal: 34.2,
    mag_anom_nT: -58.4,
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-800/40 rounded-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-400 shadow-lg shadow-emerald-950/50">
            <Compass className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Квантовая Гравиметрическая & Магнитная Навигация (GNSS-Denied Quantum Nav)
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full">
                Атомная Интерферометрия ⁸⁷Rb + OPM
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl">
              Скрытная автономная навигация в условиях тотального подавления GPS/ГЛОНАСС:
              сопоставление гравиметрических аномалий Δg (в мГал) и геомагнитного тензора ΔB (в нТл) с цифровой геофизической картой.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setSimStep(0);
              setTrajectoryHistory([]);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map & Visual Canvas */}
        <div className="lg:col-span-7 flex flex-col gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" /> Геофизическая Карта & Сопоставление Траектории (TRN Swarm)
            </span>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Квант-TRN: {latest.pos_error_m} м
              </span>
              <span className="flex items-center gap-1 text-red-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Дрейф ИНС: {latest.ins_error_m} м
              </span>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
            <canvas ref={canvasRef} width={640} height={340} className="w-full h-auto block" />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Зеленый: Квантовая привязка к изолиниям гравитации | Красный пунктир: Накопление ошибки автономной ИНС</span>
            <span className="font-mono text-cyan-300">GNSS Состояние: 🔴 ПОДАВЛЕН (РЕБ 100%)</span>
          </div>
        </div>

        {/* Sensor Parameters */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" /> Параметры Квантовых Датчиков
            </h3>

            {/* Gravity Gradient Noise */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Шум Квантового Гравиметра (Этвеш, E)</span>
                <span className="font-mono text-emerald-400 font-bold">{gravityGradNoise_E} E</span>
              </div>
              <input
                type="range"
                min={0.01}
                max={0.2}
                step={0.01}
                value={gravityGradNoise_E}
                onChange={(e) => setGravityGradNoise_E(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

            {/* Magnetometer Sensitivity */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Чувствительность OPM Магнитометра (пТл)</span>
                <span className="font-mono text-cyan-400 font-bold">{magnetometerSens_pT} пТл</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={5.0}
                step={0.2}
                value={magnetometerSens_pT}
                onChange={(e) => setMagnetometerSens_pT(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Terrain Type */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-300">Тип Геологического Рельефа</span>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {(['volcanic_fault', 'mountainous', 'plains', 'coastal'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTerrainComplexity(t)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      terrainComplexity === t
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {t === 'volcanic_fault' && 'Вулканический Разлом'}
                    {t === 'mountainous' && 'Горный Массив'}
                    {t === 'plains' && 'Равнинный Осадочный'}
                    {t === 'coastal' && 'Шельф / Побережье'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Real-time Measurements */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Гравитационная Аномалия Δg</div>
              <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">{latest.gravity_anom_mGal} мГал</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Магнитная Аномалия ΔB</div>
              <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">{latest.mag_anom_nT} нТл</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Погрешность Позиции (Квант)</div>
              <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">±{latest.pos_error_m} м</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Накопленная Ошибка ИНС</div>
              <div className="text-lg font-black text-red-400 font-mono mt-0.5">+{latest.ins_error_m} м</div>
            </div>
          </div>
        </div>
      </div>

      {/* Trajectory Drift Plot */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Сравнение Точности Позиционирования: Квантовый TRN против Дрейфа ИНС без Спутников
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Квантовая привязка удерживает погрешность в пределах 1.5 м на всей дальности
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trajectoryHistory} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time_s" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Время полета (с)', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Погрешность Координат (м)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="pos_error_m" stroke="#10b981" strokeWidth={3} name="Квантовая Гравиметрическая Привязка (м)" />
              <Line type="monotone" dataKey="ins_error_m" stroke="#ef4444" strokeDasharray="4 4" strokeWidth={2} name="Автономная Инерциальная Система ИНС (м)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
