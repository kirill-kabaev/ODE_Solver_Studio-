import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Fan,
  Wind,
  Compass,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Activity,
  Gauge,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
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

export const UAVCoaxialDuctedFanVectoredThrustModule: React.FC = () => {
  // Ducted Fan Parameters
  const [ductDiameter_m, setDuctDiameter_m] = useState<number>(0.45); // 45 cm duct
  const [rotorRpm, setRotorRpm] = useState<number>(6200); // RPM of upper/lower rotors
  const [lipRadius_pct, setLipRadius_pct] = useState<number>(12); // % of duct radius (lip suction curvature)
  const [diffuserAngle_deg, setDiffuserAngle_deg] = useState<number>(6); // Expansion angle of lower diffuser
  const [vaneDeflectionDeg, setVaneDeflectionDeg] = useState<number>(15); // Thrust vectoring vanes (-25..+25 deg)
  const [groundHeight_m, setGroundHeight_m] = useState<number>(1.2); // Proximity to floor (Ground Effect)
  const [crosswind_mps, setCrosswind_mps] = useState<number>(4.0); // Side wind gust

  // Sim Runtime
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  // Aerodynamics & Thrust Physics
  const aero = useMemo(() => {
    const rho = 1.225; // kg/m^3
    const R = ductDiameter_m / 2;
    const A_disk = Math.PI * R * R;

    // Tip speed
    const omega = (rotorRpm * 2 * Math.PI) / 60;
    const v_tip = omega * R;

    // Open rotor baseline thrust (Momentum theory + BEM approx)
    const Ct = 0.0075;
    const T_open = Ct * rho * A_disk * Math.pow(v_tip, 2);

    // Ducted Fan Duct Augmentation Factor (Lip Suction + Diffuser)
    // Duct lip generates suction: T_duct / T_rotor ~ 1.25 to 1.55 depending on lip radius & diffuser
    const lipEffect = 1.0 + (lipRadius_pct / 100) * 1.8;
    const diffuserEffect = 1.0 + (diffuserAngle_deg / 15) * 0.25;
    const ductAugmentationFactor = Math.min(1.65, 0.95 * lipEffect * diffuserEffect);

    // Ground Effect multiplier: IGE (In-Ground Effect) when h < 2*D
    const h_ratio = groundHeight_m / ductDiameter_m;
    let groundEffectFactor = 1.0;
    if (h_ratio < 2.0) {
      groundEffectFactor = 1.0 + 0.35 / (Math.pow(Math.max(0.2, h_ratio), 1.2));
      groundEffectFactor = Math.min(1.45, groundEffectFactor);
    }

    // Total Axial Thrust
    const totalThrust_N = T_open * ductAugmentationFactor * groundEffectFactor;
    const ductLipThrust_N = totalThrust_N * (1 - 1 / ductAugmentationFactor);
    const rotorThrust_N = totalThrust_N - ductLipThrust_N;

    // Thrust Vectoring components (Vane deflection delta)
    const deltaRad = (vaneDeflectionDeg * Math.PI) / 180;
    const vaneEfficiency = 0.85; // turning vane momentum loss
    const thrust_Z_N = totalThrust_N * Math.cos(deltaRad);
    const thrust_X_N = totalThrust_N * Math.sin(deltaRad) * vaneEfficiency;

    // Induced velocity in slipstream
    const v_induced = Math.sqrt(Math.max(0, totalThrust_N / (2 * rho * A_disk)));

    // Power required & Figure of Merit (FM)
    const P_ideal_W = totalThrust_N * v_induced;
    const P_actual_kW = (P_ideal_W / 0.72) / 1000;
    const figureOfMerit = 0.76 * (ductAugmentationFactor / 1.3);

    return {
      v_tip_mps: v_tip.toFixed(1),
      totalThrust_N: totalThrust_N.toFixed(1),
      totalThrust_kg: (totalThrust_N / 9.81).toFixed(2),
      rotorThrust_N: rotorThrust_N.toFixed(1),
      ductLipThrust_N: ductLipThrust_N.toFixed(1),
      thrust_X_N: thrust_X_N.toFixed(1),
      thrust_Z_N: thrust_Z_N.toFixed(1),
      v_induced_mps: v_induced.toFixed(1),
      P_actual_kW: P_actual_kW.toFixed(2),
      figureOfMerit: Math.min(0.92, figureOfMerit).toFixed(2),
      groundEffectFactor: groundEffectFactor.toFixed(2),
      ductAugmentationRatio: ductAugmentationFactor.toFixed(2),
    };
  }, [ductDiameter_m, rotorRpm, lipRadius_pct, diffuserAngle_deg, vaneDeflectionDeg, groundHeight_m]);

  // Main Loop
  useEffect(() => {
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      if (isPlaying) {
        setSimTime((t) => t + dt);
      }

      drawDuctedFanSimulation();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, aero, vaneDeflectionDeg, groundHeight_m]);

  // 2D Flow Streamlines & Ducted Shroud Canvas
  const drawDuctedFanSimulation = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.fillStyle = '#060d1b';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = 130;
    const ductR = 85;
    const ductH = 110;

    // Ground line
    const groundY = cy + ductH / 2 + groundHeight_m * 90;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, groundY, w, h - groundY);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();

    // Streamlines / Wake with vectored angle
    const deltaRad = (vaneDeflectionDeg * Math.PI) / 180;
    const particleCount = 28;

    for (let i = 0; i < particleCount; i++) {
      const offsetNorm = (i / (particleCount - 1) - 0.5) * 1.6;
      const startX = cx + offsetNorm * ductR * 1.5;
      const startY = cy - 90;

      const tAnim = (simTime * 3.5 + i * 0.15) % 1;

      // Inflow streamline to duct throat
      ctx.strokeStyle = '#38bdf844';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(startX, startY);

      const throatX = cx + offsetNorm * (ductR - 15);
      const throatY = cy;
      ctx.quadraticCurveTo(startX * 0.3 + throatX * 0.7, startY * 0.4 + throatY * 0.6, throatX, throatY);

      // Deflected exhaust jet
      const exhaustLen = 140;
      const exhaustEndX = throatX + Math.sin(deltaRad) * exhaustLen;
      const exhaustEndY = Math.min(groundY, throatY + Math.cos(deltaRad) * exhaustLen);
      ctx.lineTo(exhaustEndX, exhaustEndY);

      // Ground outwash if hitting ground
      if (exhaustEndY >= groundY) {
        const outwashDir = offsetNorm >= 0 ? 1 : -1;
        ctx.lineTo(exhaustEndX + outwashDir * 90, groundY - 4);
      }
      ctx.stroke();

      // Flow particle dot
      const px = throatX + Math.sin(deltaRad) * (exhaustLen * tAnim);
      const py = throatY + Math.cos(deltaRad) * (exhaustLen * tAnim);
      if (py < groundY) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Duct Lip Aerodynamic Shroud Profile (Left & Right cross-sections)
    const drawShroudAirfoil = (side: 1 | -1) => {
      const xBase = cx + side * ductR;
      ctx.fillStyle = '#1e3a8a';
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      // Rounded lip leading edge
      const lipR = (lipRadius_pct / 100) * 35;
      ctx.arc(xBase + side * 4, cy - ductH / 2 + 10, lipR, side === 1 ? Math.PI : 0, side === 1 ? 0 : Math.PI, false);

      // Inner wall (throat to diffuser)
      ctx.lineTo(xBase - side * 4, cy + ductH / 2);

      // Diffuser flare
      const diffFlare = (diffuserAngle_deg / 15) * 16;
      ctx.lineTo(xBase + side * (12 + diffFlare), cy + ductH / 2);
      ctx.lineTo(xBase + side * 16, cy - ductH / 2 + 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Suction zone glow on lip (negative pressure peak)
      ctx.fillStyle = '#f59e0b88';
      ctx.beginPath();
      ctx.arc(xBase + side * 4, cy - ductH / 2 + 10, lipR + 4, 0, Math.PI * 2);
      ctx.fill();
    };

    drawShroudAirfoil(1);
    drawShroudAirfoil(-1);

    // Centerbody / Hub
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 18, 38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Contra-Rotating Rotors (Upper & Lower)
    const upperBladeAngle = simTime * 35;
    const lowerBladeAngle = -simTime * 35;

    // Upper Rotor
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - (ductR - 10) * Math.cos(upperBladeAngle), cy - 18);
    ctx.lineTo(cx + (ductR - 10) * Math.cos(upperBladeAngle), cy - 18);
    ctx.stroke();

    // Lower Rotor
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - (ductR - 10) * Math.cos(lowerBladeAngle), cy + 12);
    ctx.lineTo(cx + (ductR - 10) * Math.cos(lowerBladeAngle), cy + 12);
    ctx.stroke();

    // Thrust Vectoring Vanes at bottom (Deflected by vaneDeflectionDeg)
    const vaneCount = 3;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3.5;

    for (let v = 0; v < vaneCount; v++) {
      const vx = cx + (v - 1) * 35;
      const vy = cy + ductH / 2 - 8;
      const vLen = 30;

      ctx.beginPath();
      ctx.moveTo(vx, vy);
      ctx.lineTo(vx + Math.sin(deltaRad) * vLen, vy + Math.cos(deltaRad) * vLen);
      ctx.stroke();
    }

    // Thrust Vector Arrow overlay
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy + ductH / 2 + 35);
    ctx.lineTo(cx + Math.sin(deltaRad) * 60, cy + ductH / 2 + 35 + Math.cos(deltaRad) * 60);
    ctx.stroke();
  };

  // Chart data: Thrust Augmentation vs RPM & Ground Effect
  const rpmChartData = useMemo(() => {
    const data = [];
    const rho = 1.225;
    const R = ductDiameter_m / 2;
    const A_disk = Math.PI * R * R;
    const lipEffect = 1.0 + (lipRadius_pct / 100) * 1.8;
    const aug = Math.min(1.65, 0.95 * lipEffect);

    for (let rpm = 2000; rpm <= 9000; rpm += 500) {
      const v_tip = (rpm * 2 * Math.PI * R) / 60;
      const t_open = 0.0075 * rho * A_disk * Math.pow(v_tip, 2);
      const t_ducted = t_open * aug;

      data.push({
        rpm,
        ducted_thrust_N: parseFloat(t_ducted.toFixed(1)),
        open_rotor_thrust_N: parseFloat(t_open.toFixed(1)),
        lip_suction_gain_N: parseFloat((t_ducted - t_open).toFixed(1)),
      });
    }
    return data;
  }, [ductDiameter_m, lipRadius_pct]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-gradient-to-r from-blue-950/80 via-slate-900 to-cyan-950/80 border border-blue-800/40 rounded-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-500/20 border border-blue-400/30 rounded-xl text-blue-400 shadow-lg shadow-blue-950/50">
            <Fan className="w-7 h-7 text-cyan-400 animate-spin" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Соосный Импеллер с Управляемым Вектором Тяги (Coaxial Ducted Fan VTOL)
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full">
                Кольцевой Насадок + Подсасывающая Сила Губы
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl">
              Аэродинамика замкнутого канала, эффект подсоса передней кромки (Lip Suction Force),
              увеличение тяги на 45–60%, отклоняемые рули вектора тяги и эффект экрана земли (IGE).
            </p>
          </div>
        </div>

        {/* Controls */}
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
              setRotorRpm(6200);
              setVaneDeflectionDeg(0);
              setGroundHeight_m(1.2);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Schematic Canvas */}
        <div className="lg:col-span-7 flex flex-col gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Wind className="w-4 h-4 text-cyan-400" /> Линии Тока & Векторизованная Струя Импеллера
            </span>
            <span className="text-xs font-mono text-amber-300 font-bold">
              Тяга Fz: {aero.thrust_Z_N} Н | Боковая Fx: {aero.thrust_X_N} Н
            </span>
          </div>

          <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
            <canvas ref={canvasRef} width={640} height={340} className="w-full h-auto block" />
          </div>

          {/* Vane Angle Slider */}
          <div className="flex items-center gap-4 pt-2">
            <span className="text-xs text-slate-400 whitespace-nowrap font-medium flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-emerald-400" /> Угол Отклонения Вектора Тяги (°):
            </span>
            <input
              type="range"
              min={-25}
              max={25}
              step={1}
              value={vaneDeflectionDeg}
              onChange={(e) => setVaneDeflectionDeg(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <span className="text-xs font-mono text-emerald-300 font-bold w-12 text-right">{vaneDeflectionDeg}°</span>
          </div>
        </div>

        {/* Parameters & Badges */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" /> Геометрия Кольца и Режим Вращения
            </h3>

            {/* RPM */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Частота Вращения Винтов (RPM)</span>
                <span className="font-mono text-cyan-400 font-bold">{rotorRpm} об/мин</span>
              </div>
              <input
                type="range"
                min={2000}
                max={9000}
                step={200}
                value={rotorRpm}
                onChange={(e) => setRotorRpm(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Lip Radius */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Радиус Закругления Губы Насадка (% R)</span>
                <span className="font-mono text-amber-400 font-bold">{lipRadius_pct}%</span>
              </div>
              <input
                type="range"
                min={4}
                max={22}
                step={1}
                value={lipRadius_pct}
                onChange={(e) => setLipRadius_pct(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Ground Height */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Высота над Поверхностью (Экран)</span>
                <span className="font-mono text-emerald-400 font-bold">{groundHeight_m} м</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={3.0}
                step={0.1}
                value={groundHeight_m}
                onChange={(e) => setGroundHeight_m(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Суммарная Тяга</div>
              <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">{aero.totalThrust_N} Н ({aero.totalThrust_kg} кгс)</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Подсос Губы (Lip Suction)</div>
              <div className="text-lg font-black text-amber-400 font-mono mt-0.5">+{aero.ductLipThrust_N} Н</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Коэффициент Прироста</div>
              <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">x{aero.ductAugmentationRatio}</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Figure of Merit (FM)</div>
              <div className="text-lg font-black text-purple-400 font-mono mt-0.5">{aero.figureOfMerit}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Graph Recharts */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" /> Сравнение Тяги: Кольцевой Импеллер против Открытого Несущего Винта
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Прирост за счет кольца: +{aero.ductLipThrust_N} Н ({((parseFloat(aero.ductLipThrust_N) / parseFloat(aero.rotorThrust_N)) * 100).toFixed(0)}%)
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rpmChartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="rpm" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Обороты (об/мин)', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Тяга (Н)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="ducted_thrust_N" stroke="#38bdf8" strokeWidth={3} name="Тяга Кольцевого Импеллера (Н)" />
              <Line type="monotone" dataKey="open_rotor_thrust_N" stroke="#94a3b8" strokeDasharray="3 3" name="Открытый Винт аналогичного D (Н)" />
              <Line type="monotone" dataKey="lip_suction_gain_N" stroke="#f59e0b" strokeWidth={2} name="Аэродинамический Подсос Губы (Н)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
