import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Wind,
  TrendingUp,
  Activity,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Layers,
  Compass,
  Gauge,
  Sparkles,
  CheckCircle2,
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

export const UAVDynamicSoaringWindGradientModule: React.FC = () => {
  // Atmospheric & Aircraft Parameters
  const [surfaceWind_mps, setSurfaceWind_mps] = useState<number>(18); // Surface wind at 0m (m/s)
  const [shearHeight_m, setShearHeight_m] = useState<number>(35); // Boundary layer thickness
  const [shearExponent_alpha, setShearExponent_alpha] = useState<number>(0.28); // Wind profile exponent
  const [wingSpan_m, setWingSpan_m] = useState<number>(3.8); // High aspect ratio glider (Albatross drone)
  const [gliderMass_kg, setGliderMass_kg] = useState<number>(6.5); // Mass
  const [liftToDragMax, setLiftToDragMax] = useState<number>(32); // L/D max of composite airframe
  const [rollBankMax_deg, setRollBankMax_deg] = useState<number>(60); // Bank angle during turns

  // Sim state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simPhase, setSimPhase] = useState<number>(0); // 0 to 2*PI cycle phase

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  // Dynamic Soaring Cycle Physics
  // Rayleigh / Albatross 4-phase energy extraction cycle:
  // 1. Downwind Dive: descending into slow surface air, gaining speed from gravity & tailwind
  // 2. Bottom Turn: high-g turn near sea surface into the headwind
  // 3. Upwind Climb: climbing through wind shear gradient dW/dz -> extracting energy: dE/dt = -m * V * (dW/dz) * sin(gamma)*cos(psi)
  // 4. Top Turn: high altitude turn back downwind with surplus energy!
  const cyclePhysics = useMemo(() => {
    // Current state based on cycle phase phi
    const phi = simPhase % (2 * Math.PI);

    // Altitude z(t) oscillates between 2m (wave crests) and shearHeight_m
    const z_min = 2.5;
    const z_max = shearHeight_m * 1.1;
    const altitude_m = z_min + ((z_max - z_min) / 2) * (1 - Math.cos(phi));

    // Wind speed at altitude W(z) = W0 * (z / z0)^alpha
    const windSpeed_mps = surfaceWind_mps * Math.pow(Math.max(0.1, altitude_m / 10), shearExponent_alpha);
    const windShear_gradient = (surfaceWind_mps * shearExponent_alpha * Math.pow(Math.max(0.1, altitude_m / 10), shearExponent_alpha - 1)) / 10;

    // Heading psi (0 = into wind, PI = downwind)
    const heading_rad = phi;
    const flightPathAngle_gamma_deg = 35 * Math.sin(phi); // Climb (+) or Dive (-)
    const gamma_rad = (flightPathAngle_gamma_deg * Math.PI) / 180;

    // Airspeed Va: Energy harvested per cycle
    // In dynamic soaring, airspeed can exceed 2.5x - 4x of wind speed!
    const baseAirspeed = 24;
    const energyGainFactor = (surfaceWind_mps / 15) * (shearExponent_alpha / 0.25) * (liftToDragMax / 25);
    const airspeed_mps = baseAirspeed + 16 * energyGainFactor * (0.8 + 0.3 * Math.sin(phi - Math.PI / 4));

    // Energy extraction rate: dE/dt = -m * V_a * (dW/dz * z_dot) * cos(heading)
    const z_dot = ((z_max - z_min) / 2) * Math.sin(phi) * 0.8;
    const powerExtracted_Watts = -gliderMass_kg * airspeed_mps * (windShear_gradient * z_dot) * Math.cos(heading_rad);

    // Load factor (G-load) during bottom and top turns
    const gLoad = 1.0 + (rollBankMax_deg / 60) * (2.8 * Math.pow(Math.sin(phi), 2));

    // Net mechanical energy (Specific energy E/mg)
    const specificEnergy_m = altitude_m + Math.pow(airspeed_mps, 2) / (2 * 9.81);

    // Net thrust required for zero battery consumption (100% passive soar)
    const isSelfSustaining = powerExtracted_Watts > (gliderMass_kg * 9.81 * airspeed_mps) / liftToDragMax;

    return {
      altitude_m: altitude_m.toFixed(1),
      windSpeed_mps: windSpeed_mps.toFixed(1),
      windShear_gradient: windShear_gradient.toFixed(3),
      airspeed_mps: airspeed_mps.toFixed(1),
      airspeed_kmh: (airspeed_mps * 3.6).toFixed(0),
      powerExtracted_Watts: powerExtracted_Watts.toFixed(0),
      gLoad: gLoad.toFixed(2),
      specificEnergy_m: specificEnergy_m.toFixed(1),
      isSelfSustaining,
      phaseName:
        phi < Math.PI * 0.5
          ? '1. Downwind Dive (Разгон по ветру вниз)'
          : phi < Math.PI
            ? '2. Bottom Turn (Приводный разворот против ветра)'
            : phi < Math.PI * 1.5
              ? '3. Upwind Climb (Набор высоты в градиенте ветра ⚡)'
              : '4. Top Turn (Верхний разворот с избытком энергии)',
    };
  }, [simPhase, surfaceWind_mps, shearHeight_m, shearExponent_alpha, wingSpan_m, gliderMass_kg, liftToDragMax, rollBankMax_deg]);

  // Animation Loop
  useEffect(() => {
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      if (isPlaying) {
        setSimPhase((p) => (p + dt * 0.85) % (Math.PI * 2));
      }

      drawDynamicSoaringCanvas();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, cyclePhysics, simPhase]);

  // Canvas Drawing
  const drawDynamicSoaringCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dark marine atmosphere background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#040d21');
    bgGrad.addColorStop(0.7, '#082f49');
    bgGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const seaLevelY = h - 35;

    // Sea waves / Water surface
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(0, seaLevelY, w, 35);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 15) {
      const waveY = seaLevelY + Math.sin(x * 0.08 + simPhase * 4) * 4;
      if (x === 0) ctx.moveTo(x, waveY);
      else ctx.lineTo(x, waveY);
    }
    ctx.stroke();

    // Wind Shear Velocity Profile (Vector arrows on left)
    const arrowCount = 7;
    for (let i = 0; i < arrowCount; i++) {
      const frac = i / (arrowCount - 1);
      const arrY = seaLevelY - frac * (h - 90);
      const altNorm = Math.max(0.05, frac);
      const windLen = (surfaceWind_mps * Math.pow(altNorm, shearExponent_alpha) * 3.5);

      ctx.strokeStyle = '#38bdf866';
      ctx.fillStyle = '#38bdf866';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(25, arrY);
      ctx.lineTo(25 + windLen, arrY);
      ctx.stroke();

      // Arrow head
      ctx.beginPath();
      ctx.moveTo(25 + windLen, arrY);
      ctx.lineTo(25 + windLen - 6, arrY - 3);
      ctx.lineTo(25 + windLen - 6, arrY + 3);
      ctx.closePath();
      ctx.fill();
    }

    // Dynamic Soaring Loop Trajectory in 3D-projected space
    const centerLoopX = w * 0.55;
    const radiusX = 140;
    const radiusY = (h - 110) / 2;
    const centerLoopY = seaLevelY - radiusY - 10;

    // Draw full cycle orbit
    ctx.strokeStyle = '#38bdf844';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.1) {
      const lx = centerLoopX + Math.sin(a) * radiusX + Math.cos(a) * 30;
      const ly = centerLoopY - Math.cos(a) * radiusY;
      if (a === 0) ctx.moveTo(lx, ly);
      else ctx.lineTo(lx, ly);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Highlight active energy harvesting sector (Upwind climb - green glow)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let a = Math.PI; a <= Math.PI * 1.55; a += 0.05) {
      const lx = centerLoopX + Math.sin(a) * radiusX + Math.cos(a) * 30;
      const ly = centerLoopY - Math.cos(a) * radiusY;
      if (a === Math.PI) ctx.moveTo(lx, ly);
      else ctx.lineTo(lx, ly);
    }
    ctx.stroke();

    // UAV Glider Current Position
    const curX = centerLoopX + Math.sin(simPhase) * radiusX + Math.cos(simPhase) * 30;
    const curY = centerLoopY - Math.cos(simPhase) * radiusY;

    // Draw Albatross Glider
    ctx.save();
    ctx.translate(curX, curY);

    const bankAngleRad = (Math.sin(simPhase) * rollBankMax_deg * Math.PI) / 180;
    ctx.rotate(bankAngleRad);

    // Fuselage
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // High Aspect Ratio Wings (Albatross)
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-2, -32, 4, 64);

    // Wingtips
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-2, -32, 4, 6);
    ctx.fillRect(-2, 26, 4, 6);

    ctx.restore();

    // Energy extraction pulse particles during climb
    if (simPhase > Math.PI && simPhase < Math.PI * 1.5) {
      ctx.fillStyle = '#34d399';
      for (let p = 0; p < 8; p++) {
        const px = curX - Math.sin(simPhase) * (p * 10);
        const py = curY + Math.cos(simPhase) * (p * 10);
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  // Trajectory Profile Data
  const profileChartData = useMemo(() => {
    const data = [];
    for (let deg = 0; deg <= 360; deg += 15) {
      const rad = (deg * Math.PI) / 180;
      const alt = 2.5 + ((shearHeight_m * 1.1 - 2.5) / 2) * (1 - Math.cos(rad));
      const energyGain = (surfaceWind_mps / 15) * (shearExponent_alpha / 0.25) * (liftToDragMax / 25);
      const v_air = 24 + 16 * energyGain * (0.8 + 0.3 * Math.sin(rad - Math.PI / 4));
      const p_ext = -gliderMass_kg * v_air * Math.sin(rad) * Math.cos(rad) * 8.5;

      data.push({
        phase_deg: deg,
        altitude_m: parseFloat(alt.toFixed(1)),
        airspeed_mps: parseFloat(v_air.toFixed(1)),
        power_W: parseFloat(p_ext.toFixed(0)),
      });
    }
    return data;
  }, [shearHeight_m, surfaceWind_mps, shearExponent_alpha, liftToDragMax, gliderMass_kg]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-gradient-to-r from-sky-950/80 via-slate-900 to-cyan-950/80 border border-sky-800/40 rounded-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-sky-500/20 border border-sky-400/30 rounded-xl text-sky-400 shadow-lg shadow-sky-950/50">
            <Wind className="w-7 h-7 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Динамический Парящий Полет БПЛА (Dynamic Soaring Albatross Trajectory)
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 rounded-full">
                Бестопливный Полет в Градиенте Ветра
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl">
              Сверхдлительное автономное парение без расхода бортовой энергии: извлечение кинетической энергии из атмосферного сдвига ветра (Wind Shear $dU_w/dz$) над морской поверхностью.
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
              setSurfaceWind_mps(18);
              setShearHeight_m(35);
              setSimPhase(0);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Simulation View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Canvas */}
        <div className="lg:col-span-7 flex flex-col gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-400" /> Траектория Парения в Сдвиге Ветра (Rayleigh Cycle)
            </span>
            <span className="text-xs font-mono text-cyan-300 font-bold">
              {cyclePhysics.phaseName}
            </span>
          </div>

          <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
            <canvas ref={canvasRef} width={640} height={340} className="w-full h-auto block" />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Зеленый участок: зона активного отбора энергии ветра | Стрелки слева: эпюра скорости $W(z)$</span>
            <span className="font-mono text-emerald-400 font-bold">
              {cyclePhysics.isSelfSustaining ? '⚡ БАЛАНС ЭНЕРГИИ: ИЗБЫТОК (+)' : '⚠️ ТРЕБУЕТСЯ ДОВОРЯД'}
            </span>
          </div>
        </div>

        {/* Parameters */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" /> Параметры Атмосферы & Планера
            </h3>

            {/* Surface Wind */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Скорость Приводного Ветра W0 (м/с)</span>
                <span className="font-mono text-sky-400 font-bold">{surfaceWind_mps} м/с ({ (surfaceWind_mps * 3.6).toFixed(0) } км/ч)</span>
              </div>
              <input
                type="range"
                min={8}
                max={30}
                step={1}
                value={surfaceWind_mps}
                onChange={(e) => setSurfaceWind_mps(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>

            {/* Shear Height */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Толщина Слоя Сдвига Ветра (м)</span>
                <span className="font-mono text-cyan-400 font-bold">{shearHeight_m} м</span>
              </div>
              <input
                type="range"
                min={15}
                max={80}
                step={5}
                value={shearHeight_m}
                onChange={(e) => setShearHeight_m(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Aerodynamic Quality */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Максимальное Качество Планера (L/D)</span>
                <span className="font-mono text-emerald-400 font-bold">{liftToDragMax}</span>
              </div>
              <input
                type="range"
                min={18}
                max={45}
                step={1}
                value={liftToDragMax}
                onChange={(e) => setLiftToDragMax(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Воздушная Скорость Va</div>
              <div className="text-lg font-black text-sky-400 font-mono mt-0.5">{cyclePhysics.airspeed_mps} м/с ({cyclePhysics.airspeed_kmh} км/ч)</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Мощность Отбора dE/dt</div>
              <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">{cyclePhysics.powerExtracted_Watts} Вт</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Текущая Высота Z</div>
              <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">{cyclePhysics.altitude_m} м</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Перегрузка в Вираже (G)</div>
              <div className="text-lg font-black text-amber-400 font-mono mt-0.5">{cyclePhysics.gLoad} G</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cycle Trajectory Graph */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-400" /> Циклограмма Полета: Высота Z (м) и Извлечение Мощности (Вт) за Период
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            При W0 ≥ 15 м/с БПЛА может парить бесконечно без расхода батарей
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={profileChartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="phase_deg" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Фаза Цикла (°)', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Высота (м) / Мощность (Вт)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="altitude_m" stroke="#38bdf8" strokeWidth={3} name="Высота Полета Z (м)" />
              <Line type="monotone" dataKey="power_W" stroke="#10b981" strokeWidth={2} name="Извлекаемая Мощность Ветра (Вт)" />
              <Line type="monotone" dataKey="airspeed_mps" stroke="#f59e0b" strokeDasharray="3 3" name="Воздушная Скорость (м/с)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
