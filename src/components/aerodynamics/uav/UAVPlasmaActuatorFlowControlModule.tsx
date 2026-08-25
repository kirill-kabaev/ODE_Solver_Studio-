import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Zap,
  Wind,
  Shield,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Activity,
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

export const UAVPlasmaActuatorFlowControlModule: React.FC = () => {
  // DBD Plasma Actuator Parameters
  const [plasmaVoltage_kV, setPlasmaVoltage_kV] = useState<number>(14.0); // 5 to 25 kV AC
  const [plasmaFrequency_kHz, setPlasmaFrequency_kHz] = useState<number>(8.5); // 2 to 25 kHz
  const [dutyCycle_pct, setDutyCycle_pct] = useState<number>(60); // Burst mode duty cycle
  const [actuatorLocation_x_c, setActuatorLocation_x_c] = useState<number>(0.05); // x/c = 5% (near leading edge)
  const [angleOfAttack_deg, setAngleOfAttack_deg] = useState<number>(18); // 0 to 28 deg (stall regime)
  const [freestreamVelocity_mps, setFreestreamVelocity_mps] = useState<number>(30); // 10 to 60 m/s
  const [plasmaEnabled, setPlasmaEnabled] = useState<boolean>(true);

  // Runtime
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  // Physics calculation
  const physics = useMemo(() => {
    // EHD Body force: F_ehd ~ V_pp^3.5 * f * duty
    const vNorm = plasmaVoltage_kV / 10;
    const fNorm = plasmaFrequency_kHz / 5;
    const ehdForce_mN_per_m = plasmaEnabled
      ? 18 * Math.pow(vNorm, 3.2) * fNorm * (dutyCycle_pct / 100)
      : 0;

    // Induced wall-jet velocity u_jet ~ sqrt(2 * F_ehd / rho)
    const rho = 1.225;
    const u_jet_mps = plasmaEnabled ? Math.min(12, Math.sqrt((2 * ehdForce_mN_per_m * 1e-3) / (rho * 0.005))) : 0;

    // Boundary layer momentum coefficient C_mu = 2 * F_ehd / (rho * U_inf^2 * c)
    const chord_m = 0.35;
    const q_inf = 0.5 * rho * Math.pow(freestreamVelocity_mps, 2);
    const C_mu = plasmaEnabled ? (ehdForce_mN_per_m * 1e-3) / (q_inf * chord_m) : 0;

    // Baseline unactuated stall angle: 14 deg
    const stallAoA_baseline = 14.0;
    // Delay stall by delta_alpha ~ 6 to 12 deg with plasma EHD
    const deltaStall = plasmaEnabled ? Math.min(11.5, (ehdForce_mN_per_m / 8) * (1 - actuatorLocation_x_c)) : 0;
    const effectiveStallAoA = stallAoA_baseline + deltaStall;

    // Lift & Drag calculation
    const alphaRad = (angleOfAttack_deg * Math.PI) / 180;
    let isSeparated = false;
    let CL = 0;
    let CD = 0;

    if (angleOfAttack_deg <= effectiveStallAoA) {
      // Attached or controlled flow
      CL = 2 * Math.PI * alphaRad * 0.9 + (plasmaEnabled ? 0.25 : 0);
      CD = 0.015 + 0.045 * Math.pow(CL, 2);
      isSeparated = false;
    } else {
      // Stalled / separated flow
      const postStallExcess = angleOfAttack_deg - effectiveStallAoA;
      CL = Math.max(0.3, 2 * Math.PI * ((effectiveStallAoA * Math.PI) / 180) * 0.9 - postStallExcess * 0.06);
      CD = 0.08 + 0.02 * Math.pow(postStallExcess, 1.4);
      isSeparated = true;
    }

    // Power consumption of DBD: P_W = C_diel * V_pp^3.5 * f
    const power_W_per_m = plasmaEnabled ? 0.85 * Math.pow(vNorm, 3.5) * fNorm * (dutyCycle_pct / 100) : 0;

    return {
      ehdForce_mN_per_m: ehdForce_mN_per_m.toFixed(1),
      u_jet_mps: u_jet_mps.toFixed(1),
      C_mu: C_mu.toFixed(4),
      effectiveStallAoA: effectiveStallAoA.toFixed(1),
      CL: CL.toFixed(2),
      CD: CD.toFixed(3),
      L_D: (CL / Math.max(0.001, CD)).toFixed(1),
      power_W_per_m: power_W_per_m.toFixed(1),
      isSeparated,
    };
  }, [plasmaVoltage_kV, plasmaFrequency_kHz, dutyCycle_pct, actuatorLocation_x_c, angleOfAttack_deg, freestreamVelocity_mps, plasmaEnabled]);

  // Animation loop
  useEffect(() => {
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      if (isPlaying) {
        setSimTime((t) => t + dt);
      }

      drawPlasmaSimulation();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, physics, angleOfAttack_deg, plasmaEnabled]);

  // 2D Wing Profile & Streamlines with Plasma Glow
  const drawPlasmaSimulation = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dark canvas
    ctx.fillStyle = '#060d1b';
    ctx.fillRect(0, 0, w, h);

    const cx = w * 0.45;
    const cy = h * 0.52;
    const chordLen = 280;
    const aoaRad = (angleOfAttack_deg * Math.PI) / 180;

    // Streamlines
    const streamCount = 18;
    for (let s = 0; s < streamCount; s++) {
      const yOffset = (s - streamCount / 2) * 16;
      const startX = 20;
      const startY = cy + yOffset;

      ctx.strokeStyle = physics.isSeparated ? '#ef444455' : '#38bdf844';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(startX, startY);

      // Curve around airfoil
      const midX = cx - 30;
      const midY = startY < cy ? cy - 40 - Math.abs(yOffset) * 0.8 : cy + 30 + Math.abs(yOffset) * 0.8;

      let endX = w - 30;
      let endY = startY + Math.sin(aoaRad) * 45;

      if (physics.isSeparated && startY < cy) {
        // Massive recirculation bubble / turbulence on upper surface
        const turbOffset = Math.sin(simTime * 12 + s) * 25;
        endY -= 65 + turbOffset;
        ctx.bezierCurveTo(midX, midY - 30, cx + 80, cy - 80 + turbOffset, endX, endY);
      } else {
        // Smooth reattached flow due to plasma EHD
        ctx.bezierCurveTo(midX, midY, cx + 100, cy - Math.sin(aoaRad) * 20, endX, endY);
      }
      ctx.stroke();

      // Flow animated particles
      const tAnim = (simTime * (freestreamVelocity_mps / 10) + s * 0.12) % 1;
      const pX = startX + (endX - startX) * tAnim;
      const pY = startY + (endY - startY) * tAnim;
      ctx.fillStyle = physics.isSeparated ? '#f87171' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(pX, pY, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Airfoil profile (NACA 0012 tilted by AoA)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-aoaRad);

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(-chordLen / 2, 0); // Leading edge
    ctx.bezierCurveTo(-chordLen / 3, -35, chordLen / 4, -25, chordLen / 2, 0); // Upper surface
    ctx.bezierCurveTo(chordLen / 4, 25, -chordLen / 3, 35, -chordLen / 2, 0); // Lower surface
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // DBD Plasma Actuator Electrodes & Violet Glow
    const actX = -chordLen / 2 + actuatorLocation_x_c * chordLen;
    const actY = -18;

    // Exposed electrode
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(actX - 4, actY - 2, 8, 3);

    // Dielectric layer & Insulated lower electrode
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(actX + 6, actY - 1, 10, 4);

    if (plasmaEnabled) {
      // Violet Plasma Discharge Glow
      const glowR = 14 + Math.sin(simTime * 35) * 3;
      const grad = ctx.createRadialGradient(actX + 4, actY - 4, 1, actX + 4, actY - 4, glowR);
      grad.addColorStop(0, '#c084fc');
      grad.addColorStop(0.5, '#9333ea88');
      grad.addColorStop(1, '#9333ea00');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(actX + 4, actY - 4, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Induced wall jet vector arrow
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(actX + 12, actY - 5);
      ctx.lineTo(actX + 42, actY - 6);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Polar Curve Data (CL vs Alpha with & without plasma)
  const polarData = useMemo(() => {
    const data = [];
    for (let a = 0; a <= 26; a += 2) {
      const aRad = (a * Math.PI) / 180;

      // Baseline (No plasma) - stall at 14 deg
      let cl_base = 0;
      if (a <= 14) cl_base = 2 * Math.PI * aRad * 0.9;
      else cl_base = Math.max(0.35, 2 * Math.PI * ((14 * Math.PI) / 180) * 0.9 - (a - 14) * 0.08);

      // Actuated (With DBD Plasma) - stall delayed to 22 deg
      let cl_plasma = 0;
      if (a <= 22) cl_plasma = 2 * Math.PI * aRad * 0.9 + 0.25;
      else cl_plasma = Math.max(0.45, 2 * Math.PI * ((22 * Math.PI) / 180) * 0.9 - (a - 22) * 0.08);

      data.push({
        aoa: a,
        cl_baseline: parseFloat(cl_base.toFixed(2)),
        cl_plasma: parseFloat(cl_plasma.toFixed(2)),
      });
    }
    return data;
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-800/40 rounded-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-purple-500/20 border border-purple-400/30 rounded-xl text-purple-400 shadow-lg shadow-purple-950/50">
            <Zap className="w-7 h-7 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Плазменное Управление Пограничным Слоем (DBD Plasma Actuator Flow Control)
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full">
                ДБД Актуаторы + Задержка Срыва до 24°
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl">
              Бесщелевое безынерционное управление обтеканием крыла: ионизация воздуха диэлектрическим барьерным разрядом,
              создание электрогидродинамической объемной силы f_EHD, разгон пристенной струи u_jet и подавление срыва потока.
            </p>
          </div>
        </div>

        {/* Master Switch */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPlasmaEnabled(!plasmaEnabled)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              plasmaEnabled
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/50 ring-2 ring-purple-400/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Zap className="w-4 h-4" /> {plasmaEnabled ? '⚡ ПЛАЗМА ВКЛЮЧЕНА' : 'ОТКЛЮЧЕНА'}
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Flow Visualization Canvas */}
        <div className="lg:col-span-7 flex flex-col gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Wind className="w-4 h-4 text-purple-400" /> Обтекание Профиля Крыла & Фиолетовый ДБД Разряд
            </span>
            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${physics.isSeparated ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'}`}>
              {physics.isSeparated ? '⚠️ СРЫВ ПОТОКА (STALL)' : '✅ БЕЗОТРЫВНОЕ ОБТЕКАНИЕ'}
            </span>
          </div>

          <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
            <canvas ref={canvasRef} width={640} height={340} className="w-full h-auto block" />
          </div>

          {/* AoA Slider */}
          <div className="flex items-center gap-4 pt-2">
            <span className="text-xs text-slate-400 whitespace-nowrap font-medium flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-purple-400" /> Угол Атаки Крыла α (°):
            </span>
            <input
              type="range"
              min={0}
              max={26}
              step={1}
              value={angleOfAttack_deg}
              onChange={(e) => setAngleOfAttack_deg(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <span className="text-xs font-mono text-purple-300 font-bold w-12 text-right">{angleOfAttack_deg}°</span>
          </div>
        </div>

        {/* Actuator Parameters */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" /> Параметры Высоковольтного Генератора
            </h3>

            {/* Voltage */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Амплитудное Напряжение Разряда (kV)</span>
                <span className="font-mono text-purple-400 font-bold">{plasmaVoltage_kV} кВ</span>
              </div>
              <input
                type="range"
                min={6}
                max={22}
                step={0.5}
                value={plasmaVoltage_kV}
                onChange={(e) => setPlasmaVoltage_kV(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
            </div>

            {/* Frequency */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Несущая Частота Генератора (kHz)</span>
                <span className="font-mono text-indigo-400 font-bold">{plasmaFrequency_kHz} кГц</span>
              </div>
              <input
                type="range"
                min={2}
                max={20}
                step={0.5}
                value={plasmaFrequency_kHz}
                onChange={(e) => setPlasmaFrequency_kHz(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
            </div>

            {/* Duty Cycle */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Импульсно-Периодический Коэффициент (Duty %)</span>
                <span className="font-mono text-cyan-400 font-bold">{dutyCycle_pct}%</span>
              </div>
              <input
                type="range"
                min={20}
                max={100}
                step={5}
                value={dutyCycle_pct}
                onChange={(e) => setDutyCycle_pct(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>

          {/* Aerodynamic Metrics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Коэфф. Подъемной Силы Cy (CL)</div>
              <div className="text-lg font-black text-purple-400 font-mono mt-0.5">{physics.CL}</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Аэродинамическое Качество K (L/D)</div>
              <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">{physics.L_D}</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Критический Угол Срыва α_stall</div>
              <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">{physics.effectiveStallAoA}°</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Мощность Разряда</div>
              <div className="text-lg font-black text-amber-400 font-mono mt-0.5">{physics.power_W_per_m} Вт/м</div>
            </div>
          </div>
        </div>
      </div>

      {/* Lift Polar Graph */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" /> Аэродинамическая Поляра: Сравнение Коэффициента Подъемной Силы CL(α)
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Плазма отодвигает границу срыва с 14° до {physics.effectiveStallAoA}° без механических отклоняемых закрылков
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={polarData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="aoa" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Угол Атаки α (°)', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Коэффициент CL', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="cl_plasma" stroke="#c084fc" strokeWidth={3} name="С Плазменным ДБД Актуатором (CL)" />
              <Line type="monotone" dataKey="cl_baseline" stroke="#64748b" strokeDasharray="3 3" strokeWidth={2} name="Базовое Крыло без Актуатора" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
