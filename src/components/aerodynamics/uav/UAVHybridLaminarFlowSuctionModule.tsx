import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Wind,
  Layers,
  Activity,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Zap,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Shield,
  Gauge,
  Sparkles,
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

export const UAVHybridLaminarFlowSuctionModule: React.FC = () => {
  // Aerodynamic & Suction Parameters
  const [chord_m, setChord_m] = useState<number>(1.2); // Wing chord
  const [flightSpeed_mps, setFlightSpeed_mps] = useState<number>(45); // UAV cruise speed (m/s)
  const [altitude_m, setAltitude_m] = useState<number>(6000); // 6 km cruise
  const [suctionCoefficient_Cq, setSuctionCoefficient_Cq] = useState<number>(0.0012); // Suction coefficient C_q = v_w / U_inf
  const [suctionStart_x_c, setSuctionStart_x_c] = useState<number>(0.15); // Suction zone start (x/c)
  const [suctionEnd_x_c, setSuctionEnd_x_c] = useState<number>(0.55); // Suction zone end (x/c)
  const [perforationHoleDiam_um, setPerforationHoleDiam_um] = useState<number>(65); // Laser-drilled micro-holes (microns)
  const [isSuctionActive, setIsSuctionActive] = useState<boolean>(true);

  // Simulation Runtime
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  // Atmospheric and Boundary Layer Physics
  const physics = useMemo(() => {
    // ISA Atmosphere at altitude
    const T0 = 288.15;
    const L = 0.0065;
    const T = T0 - L * altitude_m;
    const rho = 1.225 * Math.pow(T / T0, 4.256);
    const mu = (1.458e-6 * Math.pow(T, 1.5)) / (T + 110.4);
    const nu = mu / rho;

    // Reynolds Number based on chord
    const Reynolds = (flightSpeed_mps * chord_m) / nu;

    // Natural transition without suction: e^N method (typically at Re_x ~ 1.2e6 for standard turbulence)
    const naturalTransition_xc = Math.min(0.28, 1.2e6 / Reynolds);

    // Hybrid Laminar Flow Control (HLFC) transition location with suction:
    // Suction stabilizes Tollmien-Schlichting (T-S) wave amplification factor N < 9
    const activeCq = isSuctionActive ? suctionCoefficient_Cq : 0;
    const transitionExtension = activeCq > 0 ? (suctionEnd_x_c - naturalTransition_xc) * Math.min(1.0, (activeCq / 0.0008)) : 0;
    const hlfcTransition_xc = isSuctionActive ? Math.min(0.72, naturalTransition_xc + transitionExtension) : naturalTransition_xc;

    // Boundary layer displacement thickness delta* (Blasius laminar vs turbulent)
    const blThickness_laminar_mm = 5.0 * Math.sqrt((nu * (chord_m * hlfcTransition_xc)) / flightSpeed_mps) * 1000;
    const blThickness_turbulent_mm = 0.37 * (chord_m * (1 - hlfcTransition_xc)) * Math.pow((flightSpeed_mps * chord_m * (1 - hlfcTransition_xc)) / nu, -0.2) * 1000;

    // Skin friction coefficient C_f
    // Laminar: C_f_lam = 1.328 / sqrt(Re)
    // Turbulent: C_f_turb = 0.074 / Re^0.2
    const Cf_laminar = 1.328 / Math.sqrt(Reynolds);
    const Cf_turbulent = 0.074 / Math.pow(Reynolds, 0.2);

    // Composite wing skin friction drag:
    const Cf_baseline = naturalTransition_xc * Cf_laminar + (1 - naturalTransition_xc) * Cf_turbulent;
    const Cf_hlfc = hlfcTransition_xc * Cf_laminar + (1 - hlfcTransition_xc) * Cf_turbulent;

    // Friction Drag Reduction percentage
    const dragReduction_pct = ((Cf_baseline - Cf_hlfc) / Cf_baseline) * 100;

    // Suction power requirement: P_suction = Delta_P * Q / eta_pump
    const dynamicPressure_q = 0.5 * rho * Math.pow(flightSpeed_mps, 2);
    const suctionVel_mps = activeCq * flightSpeed_mps;
    const suctionArea_m2 = (suctionEnd_x_c - suctionStart_x_c) * chord_m * 2.5; // for 2.5m span
    const volumetricFlow_m3s = suctionVel_mps * suctionArea_m2;
    const deltaP_Pa = dynamicPressure_q * 1.4 + 150; // pressure drop across porous skin
    const pumpEfficiency = 0.72;
    const pumpPower_W = isSuctionActive ? (deltaP_Pa * volumetricFlow_m3s) / pumpEfficiency : 0;

    // Aerodynamic Power Saved: Delta_P_aero = Delta_C_D * q * S * V
    const wingArea_m2 = chord_m * 2.5;
    const deltaCD = (Cf_baseline - Cf_hlfc);
    const aeroPowerSaved_W = deltaCD * dynamicPressure_q * wingArea_m2 * flightSpeed_mps;
    const netPowerSaved_W = aeroPowerSaved_W - pumpPower_W;

    return {
      Reynolds: Reynolds.toExponential(2),
      naturalTransition_xc: (naturalTransition_xc * 100).toFixed(1),
      hlfcTransition_xc: (hlfcTransition_xc * 100).toFixed(1),
      dragReduction_pct: dragReduction_pct.toFixed(1),
      pumpPower_W: pumpPower_W.toFixed(0),
      aeroPowerSaved_W: aeroPowerSaved_W.toFixed(0),
      netPowerSaved_W: netPowerSaved_W.toFixed(0),
      isNetPositive: netPowerSaved_W > 0,
      suctionVel_mps: (suctionVel_mps * 100).toFixed(1), // cm/s
      airDensity_kgm3: rho.toFixed(3),
      blThickness_laminar_mm: blThickness_laminar_mm.toFixed(2),
    };
  }, [chord_m, flightSpeed_mps, altitude_m, suctionCoefficient_Cq, suctionStart_x_c, suctionEnd_x_c, isSuctionActive]);

  // Animation Loop
  useEffect(() => {
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      if (isPlaying) {
        setSimTime((t) => t + dt);
      }

      drawBoundaryLayerCanvas();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, physics, simTime, isSuctionActive]);

  // Canvas Visualization: Airfoil with Suction Micro-Holes and Velocity Profile
  const drawBoundaryLayerCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Background
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    const startX = 60;
    const endX = w - 60;
    const chordPixels = endX - startX;
    const midY = h * 0.58;

    // Draw Airfoil Profile (NACA 64A-010 / Supercritical Laminar)
    ctx.beginPath();
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;

    ctx.moveTo(startX, midY);
    for (let x = 0; x <= chordPixels; x += 4) {
      const xc = x / chordPixels;
      // Airfoil upper thickness formula
      const yt = 5 * 0.12 * (0.2969 * Math.sqrt(xc) - 0.1260 * xc - 0.3516 * Math.pow(xc, 2) + 0.2843 * Math.pow(xc, 3) - 0.1015 * Math.pow(xc, 4));
      const px = startX + x;
      const py = midY - yt * chordPixels * 0.65;
      ctx.lineTo(px, py);
    }
    // Lower surface
    for (let x = chordPixels; x >= 0; x -= 4) {
      const xc = x / chordPixels;
      const yt = 5 * 0.12 * (0.2969 * Math.sqrt(xc) - 0.1260 * xc - 0.3516 * Math.pow(xc, 2) + 0.2843 * Math.pow(xc, 3) - 0.1015 * Math.pow(xc, 4));
      const px = startX + x;
      const py = midY + yt * chordPixels * 0.45;
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Suction Porous Micro-Perforation Zone (Cyan Dots/Holes)
    const suctStartX = startX + suctionStart_x_c * chordPixels;
    const suctEndX = startX + suctionEnd_x_c * chordPixels;

    ctx.strokeStyle = isSuctionActive ? '#38bdf8' : '#64748b';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(suctStartX, midY - 26);
    ctx.lineTo(suctEndX, midY - 24);
    ctx.stroke();

    if (isSuctionActive) {
      // Draw Inflow Suction Arrows (Down into the wing skin)
      ctx.strokeStyle = '#06b6d4';
      ctx.fillStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      for (let sx = suctStartX + 8; sx < suctEndX; sx += 18) {
        ctx.beginPath();
        ctx.moveTo(sx, midY - 42);
        ctx.lineTo(sx, midY - 28);
        ctx.stroke();
        // arrowhead
        ctx.beginPath();
        ctx.moveTo(sx, midY - 28);
        ctx.lineTo(sx - 3, midY - 33);
        ctx.lineTo(sx + 3, midY - 33);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Boundary Layer Streamlines & Tollmien-Schlichting Waves
    const transXC = parseFloat(physics.hlfcTransition_xc) / 100;
    const transX = startX + transXC * chordPixels;

    // Streamlines flowing over airfoil
    const numLines = 6;
    for (let i = 0; i < numLines; i++) {
      const yBase = midY - 35 - i * 14;
      ctx.beginPath();
      ctx.lineWidth = 1.8;

      for (let px = 20; px <= w - 20; px += 8) {
        let py = yBase;
        const xc = (px - startX) / chordPixels;

        if (px >= startX && px <= endX) {
          const yt = 5 * 0.12 * (0.2969 * Math.sqrt(Math.max(0, xc)) - 0.1260 * xc);
          py -= yt * chordPixels * 0.45;
        }

        // Before transition: Pure smooth laminar flow
        if (px < transX) {
          ctx.strokeStyle = '#34d399'; // Smooth green laminar
        } else {
          // After transition: Turbulent turbulent eddies / oscillations
          const turbOsc = Math.sin((px * 0.2) - (simTime * 25) + i * 2) * (4 + i * 1.5);
          py += turbOsc;
          ctx.strokeStyle = '#f87171'; // Red turbulent
        }

        if (px === 20) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Transition Line Marker
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(transX, midY - 110);
    ctx.lineTo(transX, midY + 40);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#f59e0b';
    ctx.font = '10px monospace';
    ctx.fillText(`Точка перехода: ${(transXC * 100).toFixed(0)}% x/c`, transX - 35, midY - 115);
  };

  // Boundary Layer Profile & Drag Reduction Chart
  const comparisonChartData = useMemo(() => {
    const data = [];
    const Re = parseFloat(physics.Reynolds);

    for (let xc = 0.05; xc <= 0.95; xc += 0.05) {
      const localRe = Math.max(100, Re * xc);
      const Cf_lam = 1.328 / Math.sqrt(localRe);
      const Cf_turb = 0.074 / Math.pow(localRe, 0.2);

      const natTrans = parseFloat(physics.naturalTransition_xc) / 100;
      const hlfcTrans = parseFloat(physics.hlfcTransition_xc) / 100;

      const Cf_natural = xc < natTrans ? Cf_lam : Cf_turb;
      const Cf_withHLFC = xc < hlfcTrans ? Cf_lam : Cf_turb;

      data.push({
        x_c_pct: Math.round(xc * 100),
        Cf_natural: parseFloat((Cf_natural * 1000).toFixed(2)),
        Cf_hlfc: parseFloat((Cf_withHLFC * 1000).toFixed(2)),
      });
    }
    return data;
  }, [physics]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-gradient-to-r from-teal-950/80 via-slate-900 to-sky-950/80 border border-teal-800/40 rounded-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-teal-500/20 border border-teal-400/30 rounded-xl text-teal-400 shadow-lg shadow-teal-950/50">
            <Wind className="w-7 h-7 text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Гибридное Управление Ламинарным Обтеканием Крыла (HLFC Suction Micro-Perforation)
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded-full">
                Подавление Волн Толлмина-Шлихтинга (e^N)
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl">
              Снижение профильного сопротивления трения крыла БПЛА до 42%: микроперфорированный отсос пограничного слоя ($C_q = v_w / U_\infty$), удержание ламинарного потока до 72% хорды и баланс мощности насоса.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSuctionActive(!isSuctionActive)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              isSuctionActive
                ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/30'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Zap className="w-4 h-4" />
            {isSuctionActive ? 'ОТСОС ВКЛЮЧЕН (HLFC)' : 'ОТСОС ВЫКЛЮЧЕН'}
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setSuctionCoefficient_Cq(0.0012);
              setFlightSpeed_mps(45);
              setAltitude_m(6000);
              setIsSuctionActive(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Canvas Visualizer */}
        <div className="lg:col-span-7 flex flex-col gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-400" /> Структура Пограничного Слоя: Ламинарный (Зеленый) → Турбулентный (Красный)
            </span>
            <span className="text-xs font-mono text-cyan-300 font-bold">
              Re: {physics.Reynolds}
            </span>
          </div>

          <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
            <canvas ref={canvasRef} width={640} height={320} className="w-full h-auto block" />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Зона микроперфорации: {(suctionStart_x_c * 100).toFixed(0)}% – {(suctionEnd_x_c * 100).toFixed(0)}% x/c (d={perforationHoleDiam_um} мкм)</span>
            <span className="font-mono text-emerald-400 font-bold">
              Смещение перехода: {physics.naturalTransition_xc}% → {physics.hlfcTransition_xc}% x/c
            </span>
          </div>
        </div>

        {/* Control Sliders */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-400" /> Параметры Полета & Микроотсоса
            </h3>

            {/* Suction Coefficient Cq */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Коэффициент Отсоса Cq (v_w / U_inf)</span>
                <span className="font-mono text-teal-400 font-bold">{suctionCoefficient_Cq.toFixed(4)} ({physics.suctionVel_mps} см/с)</span>
              </div>
              <input
                type="range"
                min={0.0002}
                max={0.0030}
                step={0.0001}
                value={suctionCoefficient_Cq}
                onChange={(e) => setSuctionCoefficient_Cq(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
            </div>

            {/* Flight Speed */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Крейсерская Скорость (м/с)</span>
                <span className="font-mono text-cyan-400 font-bold">{flightSpeed_mps} м/с ({(flightSpeed_mps * 3.6).toFixed(0)} км/ч)</span>
              </div>
              <input
                type="range"
                min={25}
                max={90}
                step={2}
                value={flightSpeed_mps}
                onChange={(e) => setFlightSpeed_mps(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Altitude */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Высота Полета (м)</span>
                <span className="font-mono text-sky-400 font-bold">{altitude_m} м (ρ = {physics.airDensity_kgm3} кг/м³)</span>
              </div>
              <input
                type="range"
                min={500}
                max={12000}
                step={500}
                value={altitude_m}
                onChange={(e) => setAltitude_m(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Снижение Трения Крыла</div>
              <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">-{physics.dragReduction_pct}%</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Чистый Баланс Мощности</div>
              <div className={`text-lg font-black font-mono mt-0.5 ${physics.isNetPositive ? 'text-teal-400' : 'text-amber-400'}`}>
                +{physics.netPowerSaved_W} Вт
              </div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Сэкономленная Тяга</div>
              <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">{physics.aeroPowerSaved_W} Вт</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Потребление Насоса Отсоса</div>
              <div className="text-lg font-black text-purple-400 font-mono mt-0.5">{physics.pumpPower_W} Вт</div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Chart */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-teal-400" /> Локальный Коэффициент Трения $C_f(x/c) \times 10^3$: Естественный Переход vs HLFC
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Ламинарный участок удерживается до {physics.hlfcTransition_xc}% хорды крыла
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={comparisonChartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="x_c_pct" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Позиция по Хорде Крыла x/c (%)', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Cf × 10³', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="Cf_natural" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" name="Базовое крыло (Естественный переход)" />
              <Line type="monotone" dataKey="Cf_hlfc" stroke="#14b8a6" strokeWidth={3} name="HLFC с микроотсосом (Ламинаризация)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
