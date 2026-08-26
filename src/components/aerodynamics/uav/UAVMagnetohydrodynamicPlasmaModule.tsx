import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Zap,
  Activity,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Shield,
  Layers,
  TrendingUp,
  Compass,
  CheckCircle2,
  Atom,
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

export const UAVMagnetohydrodynamicPlasmaModule: React.FC = () => {
  // MHD Thruster & Plasma Parameters
  const [magneticField_B_Tesla, setMagneticField_B_Tesla] = useState<number>(1.8); // Magnetic field strength (Tesla)
  const [electricField_E_kVm, setElectricField_E_kVm] = useState<number>(45); // Applied electric field (kV/m)
  const [plasmaConductivity_Sigma, setPlasmaConductivity_Sigma] = useState<number>(24); // Plasma electrical conductivity (S/m)
  const [channelHeight_cm, setChannelHeight_cm] = useState<number>(8); // MHD thruster gap (cm)
  const [channelWidth_cm, setChannelWidth_cm] = useState<number>(15); // MHD thruster width (cm)
  const [channelLength_cm, setChannelLength_cm] = useState<number>(35); // Acceleration channel length (cm)
  const [airDensity_rho, setAirDensity_rho] = useState<number>(1.225); // Air density (kg/m3)
  const [isPlasmaActive, setIsPlasmaActive] = useState<boolean>(true);

  // Sim runtime
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  // Magnetohydrodynamic Lorentz Force Physics
  // F_lorentz = Integral( J x B ) dV
  // Current density: J = sigma * (E - v x B)
  const physics = useMemo(() => {
    const B = isPlasmaActive ? magneticField_B_Tesla : 0;
    const E = isPlasmaActive ? electricField_E_kVm * 1000 : 0; // V/m
    const sigma = isPlasmaActive ? plasmaConductivity_Sigma : 0;

    const h_m = channelHeight_cm * 0.01;
    const w_m = channelWidth_cm * 0.01;
    const l_m = channelLength_cm * 0.01;
    const volume_m3 = h_m * w_m * l_m;
    const channelArea_m2 = h_m * w_m;

    // Inlet velocity v0
    const v0 = 12; // m/s entry flow

    // Current density J = sigma * (E - v0 * B)
    const J_currentDensity = sigma * Math.max(0, E - v0 * B); // A/m2
    const totalCurrent_Amps = J_currentDensity * (w_m * l_m);

    // Lorentz Volume Force f_L = J * B (N/m3)
    const lorentzBodyForce_Npm3 = J_currentDensity * B;

    // Total MHD Thrust F = f_L * Volume (Newtons)
    const totalThrust_N = lorentzBodyForce_Npm3 * volume_m3;

    // Fluid acceleration across channel: a = f_L / rho
    const acceleration_ms2 = lorentzBodyForce_Npm3 / airDensity_rho;

    // Outlet exhaust jet velocity v_exit = sqrt(v0^2 + 2 * a * l)
    const exitVelocity_mps = Math.sqrt(Math.pow(v0, 2) + 2 * acceleration_ms2 * l_m);
    const deltaV = exitVelocity_mps - v0;

    // Electrical Input Power P_elec = E * J * Volume
    const inputElectricalPower_kW = (E * J_currentDensity * volume_m3) / 1000;

    // Jet Kinetic Power P_kin = 0.5 * m_dot * (v_exit^2 - v0^2)
    const massFlow_kgs = airDensity_rho * channelArea_m2 * ((v0 + exitVelocity_mps) / 2);
    const kineticPower_W = 0.5 * massFlow_kgs * (Math.pow(exitVelocity_mps, 2) - Math.pow(v0, 2));

    // Thruster efficiency eta = P_kin / P_elec
    const efficiency_pct = inputElectricalPower_kW > 0 ? (kineticPower_W / (inputElectricalPower_kW * 1000)) * 100 : 0;

    // Thrust-to-Power ratio (N / kW)
    const thrustToPower_NkW = inputElectricalPower_kW > 0 ? totalThrust_N / inputElectricalPower_kW : 0;

    return {
      currentDensity_kAm2: (J_currentDensity / 1000).toFixed(2),
      totalCurrent_Amps: totalCurrent_Amps.toFixed(1),
      lorentzForce_Npm3: (lorentzBodyForce_Npm3 / 1000).toFixed(1),
      totalThrust_N: totalThrust_N.toFixed(2),
      exitVelocity_mps: exitVelocity_mps.toFixed(1),
      exitVelocity_kmh: (exitVelocity_mps * 3.6).toFixed(0),
      deltaV_mps: deltaV.toFixed(1),
      inputPower_kW: inputElectricalPower_kW.toFixed(2),
      kineticPower_W: kineticPower_W.toFixed(0),
      efficiency_pct: efficiency_pct.toFixed(1),
      thrustToPower_NkW: thrustToPower_NkW.toFixed(2),
    };
  }, [magneticField_B_Tesla, electricField_E_kVm, plasmaConductivity_Sigma, channelHeight_cm, channelWidth_cm, channelLength_cm, airDensity_rho, isPlasmaActive]);

  // Animation Loop
  useEffect(() => {
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      if (isPlaying) {
        setSimTime((t) => t + dt);
      }

      drawMHDCanvas();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, physics, simTime, isPlasmaActive]);

  // Canvas Drawing: 2D Cutaway of MHD Acceleration Channel
  const drawMHDCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dark high-voltage laboratory background
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    const channelX = 80;
    const channelW = w - 160;
    const channelY = h * 0.35;
    const channelH = 110;

    // Top Anode Electrode (+ HV)
    ctx.fillStyle = '#b91c1c';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.fillRect(channelX, channelY - 20, channelW, 18);
    ctx.strokeRect(channelX, channelY - 20, channelW, 18);

    ctx.fillStyle = '#fee2e2';
    ctx.font = '10px monospace';
    ctx.fillText(`+ ВЫСОКОВОЛЬТНЫЙ АНОД (+${(electricField_E_kVm * (channelHeight_cm * 0.01)).toFixed(1)} кВ)`, channelX + 20, channelY - 7);

    // Bottom Cathode Electrode (- Ground)
    ctx.fillStyle = '#1e3a8a';
    ctx.strokeStyle = '#3b82f6';
    ctx.fillRect(channelX, channelY + channelH + 2, channelW, 18);
    ctx.strokeRect(channelX, channelY + channelH + 2, channelW, 18);

    ctx.fillStyle = '#dbeafe';
    ctx.fillText('— КАТОД (ЗАЗЕМЛЕНИЕ 0 В)', channelX + 20, channelY + channelH + 15);

    // Lateral Permanent Magnets / Superconducting B-field (Cyan cross-lines indicating B vector perpendicular into page ⊗)
    if (isPlasmaActive) {
      // Draw Plasma Ionization Glow Channel
      const plasmaGrad = ctx.createLinearGradient(channelX, channelY, channelX + channelW, channelY);
      plasmaGrad.addColorStop(0, '#a855f744');
      plasmaGrad.addColorStop(0.5, '#06b6d4aa');
      plasmaGrad.addColorStop(1, '#3b82f6ee');
      ctx.fillStyle = plasmaGrad;
      ctx.fillRect(channelX, channelY, channelW, channelH);

      // Electric Field Lines E (Top to Bottom)
      ctx.strokeStyle = '#f8717144';
      ctx.lineWidth = 1;
      for (let x = channelX + 25; x < channelX + channelW; x += 35) {
        ctx.beginPath();
        ctx.moveTo(x, channelY);
        ctx.lineTo(x, channelY + channelH);
        ctx.stroke();
      }

      // Magnetic Field Indicators B into the screen ⊗
      ctx.fillStyle = '#38bdf888';
      ctx.font = '12px sans-serif';
      for (let x = channelX + 30; x < channelX + channelW; x += 55) {
        for (let y = channelY + 25; y < channelY + channelH - 10; y += 35) {
          ctx.fillText('⊗ B', x, y);
        }
      }

      // Accelerated Ionized Flow Streamlines (Lorentz acceleration to the right)
      const particleCount = 28;
      for (let p = 0; p < particleCount; p++) {
        const pFrac = ((simTime * 2.2 + p * 0.12) % 1.0);
        // Non-linear acceleration: x = x0 + v0*t + 0.5*a*t^2
        const px = channelX - 40 + Math.pow(pFrac, 1.6) * (channelW + 120);
        const py = channelY + 15 + ((p * 23) % (channelH - 30));

        const pRadius = 2.5 + pFrac * 2.0;
        ctx.fillStyle = pFrac > 0.6 ? '#67e8f9' : '#c084fc';
        ctx.beginPath();
        ctx.arc(px, py, pRadius, 0, Math.PI * 2);
        ctx.fill();

        // Speed wake streak
        ctx.strokeStyle = '#38bdf866';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px - 15 * pFrac, py);
        ctx.lineTo(px, py);
        ctx.stroke();
      }
    } else {
      // Inactive dark channel
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(channelX, channelY, channelW, channelH);
      ctx.fillStyle = '#64748b';
      ctx.font = '12px monospace';
      ctx.fillText('МГД ПЛАЗМЕННЫЙ КАНАЛ ОБЕСТОЧЕН', channelX + channelW * 0.28, channelY + channelH * 0.52);
    }

    // Thrust & Lorentz Force Vector Arrow (Pointing Right)
    if (isPlasmaActive) {
      const arrY = channelY + channelH * 0.5;
      const arrStartX = channelX + channelW + 15;
      const arrEndX = arrStartX + Math.min(65, parseFloat(physics.totalThrust_N) * 2.8);

      ctx.strokeStyle = '#22c55e';
      ctx.fillStyle = '#22c55e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(arrStartX, arrY);
      ctx.lineTo(arrEndX, arrY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(arrEndX, arrY);
      ctx.lineTo(arrEndX - 10, arrY - 6);
      ctx.lineTo(arrEndX - 10, arrY + 6);
      ctx.closePath();
      ctx.fill();

      ctx.font = 'bold 11px monospace';
      ctx.fillText(`F_лоренца = ${physics.totalThrust_N} Н`, arrStartX, arrY - 12);
    }
  };

  // Parametric Thrust vs Magnetic Field Chart
  const thrustParamChartData = useMemo(() => {
    const data = [];
    for (let b = 0.5; b <= 4.0; b += 0.5) {
      const sigma = plasmaConductivity_Sigma;
      const E = electricField_E_kVm * 1000;
      const v0 = 12;
      const h_m = channelHeight_cm * 0.01;
      const w_m = channelWidth_cm * 0.01;
      const l_m = channelLength_cm * 0.01;
      const vol = h_m * w_m * l_m;

      const J = sigma * Math.max(0, E - v0 * b);
      const F = J * b * vol;
      const P_kw = (E * J * vol) / 1000;

      data.push({
        magnetic_B: b,
        thrust_N: parseFloat(F.toFixed(2)),
        power_kW: parseFloat(P_kw.toFixed(1)),
      });
    }
    return data;
  }, [plasmaConductivity_Sigma, electricField_E_kVm, channelHeight_cm, channelWidth_cm, channelLength_cm]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-800/40 rounded-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-purple-500/20 border border-purple-400/30 rounded-xl text-purple-400 shadow-lg shadow-purple-950/50">
            <Atom className="w-7 h-7 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Магнитогидродинамический (МГД) Плазменный Двигатель БПЛА (MHD Solid-State Propulsion)
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full">
                Бесшумная Тяга без Подвижных Частей (F = J × B)
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl">
              Прямой электромагнитный разгон ионизированного воздуха силой Лоренца: скрещенные электрические $E$ и магнитные $B$ поля, проводимость плазмы $\sigma$, скорость истечения струи и тяговооруженность.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlasmaActive(!isPlasmaActive)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              isPlasmaActive
                ? 'bg-purple-500 text-slate-950 shadow-lg shadow-purple-500/30'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Zap className="w-4 h-4" />
            {isPlasmaActive ? 'МГД КАНАЛ АКТИВЕН' : 'ОБЕСТОЧЕНО'}
          </button>

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
              setMagneticField_B_Tesla(1.8);
              setElectricField_E_kVm(45);
              setPlasmaConductivity_Sigma(24);
              setIsPlasmaActive(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
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
              <Sparkles className="w-4 h-4 text-purple-400" /> Разгон Плазмы в Скрещенных Полях E × B (Сечение Канала)
            </span>
            <span className="text-xs font-mono text-cyan-300 font-bold">
              Плотность тока J: {physics.currentDensity_kAm2} кА/м²
            </span>
          </div>

          <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
            <canvas ref={canvasRef} width={640} height={320} className="w-full h-auto block" />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Объемная сила Лоренца: {physics.lorentzForce_Npm3} кН/м³ | Вектор B направлен перпендикулярно плоскости</span>
            <span className="font-mono text-emerald-400 font-bold">
              Тяга F: {physics.totalThrust_N} Н
            </span>
          </div>
        </div>

        {/* Sliders */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" /> Электромагнитные Параметры
            </h3>

            {/* Magnetic Field B */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Магнитная Индукция B (Тесла)</span>
                <span className="font-mono text-cyan-400 font-bold">{magneticField_B_Tesla} Тл (NdFeB / HTS)</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={3.5}
                step={0.1}
                value={magneticField_B_Tesla}
                onChange={(e) => setMagneticField_B_Tesla(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Electric Field E */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Напряженность Эл. Поля E (кВ/м)</span>
                <span className="font-mono text-purple-400 font-bold">{electricField_E_kVm} кВ/м</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={electricField_E_kVm}
                onChange={(e) => setElectricField_E_kVm(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
            </div>

            {/* Plasma Conductivity Sigma */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Проводимость Плазмы σ (См/м)</span>
                <span className="font-mono text-emerald-400 font-bold">{plasmaConductivity_Sigma} См/м</span>
              </div>
              <input
                type="range"
                min={5}
                max={60}
                step={1}
                value={plasmaConductivity_Sigma}
                onChange={(e) => setPlasmaConductivity_Sigma(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Суммарная Тяга F_MHD</div>
              <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">{physics.totalThrust_N} Н</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Скорость Истечения Струи</div>
              <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">{physics.exitVelocity_mps} м/с ({physics.exitVelocity_kmh} км/ч)</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Входная Мощность P_el</div>
              <div className="text-lg font-black text-purple-400 font-mono mt-0.5">{physics.inputPower_kW} кВт</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Удельная Тяга (N / кВт)</div>
              <div className="text-lg font-black text-amber-400 font-mono mt-0.5">{physics.thrustToPower_NkW} Н/кВт</div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" /> Зависимость Тяги (Н) и Потребляемой Мощности (кВт) от Магнитного Поля B
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Применение СПИН-магнитов (HTS) позволяет генерировать тягу без механических турбин
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={thrustParamChartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="magnetic_B" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Индукция Магнитного Поля B (Тл)', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Тяга (Н) / Мощность (кВт)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="thrust_N" stroke="#a855f7" strokeWidth={3} name="Тяга Лоренца F (Н)" />
              <Line type="monotone" dataKey="power_kW" stroke="#f59e0b" strokeWidth={2} strokeDasharray="3 3" name="Потребляемая Мощность (кВт)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
