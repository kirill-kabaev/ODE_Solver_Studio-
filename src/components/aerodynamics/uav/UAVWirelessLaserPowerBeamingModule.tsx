import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Zap,
  Radio,
  Sun,
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
  Target,
  Thermometer,
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

export const UAVWirelessLaserPowerBeamingModule: React.FC = () => {
  // Laser Transmitter Parameters
  const [laserPower_kW, setLaserPower_kW] = useState<number>(12); // Ground laser power (5 to 30 kW)
  const [laserWavelength_nm, setLaserWavelength_nm] = useState<number>(1070); // Fiber laser NIR (1070 nm)
  const [beamWaist_mm, setBeamWaist_mm] = useState<number>(120); // Beam diameter at transmitter aperture
  const [uavDistance_m, setUavDistance_m] = useState<number>(650); // Slant range (100 to 2500 m)
  const [atmTurbulence_Cn2, setAtmTurbulence_Cn2] = useState<number>(1.5e-14); // Refractive index structure parameter
  const [pointingJitter_urad, setPointingJitter_urad] = useState<number>(8.5); // FSM tracking jitter (micro-radians)
  const [pvArrayArea_m2, setPvArrayArea_m2] = useState<number>(0.35); // GaAs array receiver area
  const [pvCellTemp_C, setPvCellTemp_C] = useState<number>(45); // Receiver cell temperature

  // Sim Runtime
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  // Optical & Photovoltaic Physics
  const physics = useMemo(() => {
    const lambda_m = laserWavelength_nm * 1e-9;
    const w0_m = (beamWaist_mm / 2) * 1e-3;

    // Rayleigh Range & Diffraction spot size
    const z_R = (Math.PI * Math.pow(w0_m, 2)) / lambda_m;
    const w_diffraction = w0_m * Math.sqrt(1 + Math.pow(uavDistance_m / z_R, 2));

    // Atmospheric Turbulence Beam Broadening (Rytov approximation)
    const k = (2 * Math.PI) / lambda_m;
    const w_turb = Math.sqrt(4.38 * Math.pow(k, 0.2) * atmTurbulence_Cn2 * Math.pow(uavDistance_m, 1.8));

    // Total beam spot radius at receiver plane
    const totalBeamRadius_m = Math.sqrt(Math.pow(w_diffraction, 2) + Math.pow(w_turb, 2));
    const beamArea_m2 = Math.PI * Math.pow(totalBeamRadius_m, 2);

    // Atmospheric Transmission (Beer-Lambert law, alpha ~ 0.08 / km)
    const atmExtinction = Math.exp(-0.00008 * uavDistance_m);

    // Pointing / Jitter collection efficiency
    const jitterDisplacement_m = (pointingJitter_urad * 1e-6) * uavDistance_m;
    const interceptionRatio = Math.min(0.98, (pvArrayArea_m2 / Math.max(pvArrayArea_m2, beamArea_m2)) * Math.exp(-Math.pow(jitterDisplacement_m / totalBeamRadius_m, 2)));

    // Optical power received on PV panel
    const pReceived_optical_kW = laserPower_kW * atmExtinction * interceptionRatio;

    // Monochromatic GaAs PV Cell Conversion Efficiency (at 1070nm ~ 50%, degraded by temp: -0.15%/degC)
    const basePvEff = 0.52;
    const tempPenalty = (pvCellTemp_C - 25) * 0.0015;
    const actualPvEff = Math.max(0.35, basePvEff - tempPenalty);

    // Generated Net Electric Power
    const pElectric_kW = pReceived_optical_kW * actualPvEff;
    const pElectric_W = pElectric_kW * 1000;

    // Waste thermal load requiring heat pipe cooling
    const wasteHeat_kW = pReceived_optical_kW * (1 - actualPvEff);

    // UAV Hover / Flight Power consumption (assume 1.8 kW for multirotor/glider)
    const uavRequiredPower_kW = 1.8;
    const netPowerSurplus_kW = pElectric_kW - uavRequiredPower_kW;

    return {
      totalSpotDiameter_cm: (totalBeamRadius_m * 2 * 100).toFixed(1),
      atmTransmission_pct: (atmExtinction * 100).toFixed(1),
      interceptionEfficiency_pct: (interceptionRatio * 100).toFixed(1),
      pReceived_optical_kW: pReceived_optical_kW.toFixed(2),
      actualPvEff_pct: (actualPvEff * 100).toFixed(1),
      pElectric_kW: pElectric_kW.toFixed(2),
      pElectric_W: pElectric_W.toFixed(0),
      wasteHeat_kW: wasteHeat_kW.toFixed(2),
      netPowerSurplus_kW: netPowerSurplus_kW.toFixed(2),
      isRecharging: netPowerSurplus_kW > 0,
    };
  }, [laserPower_kW, laserWavelength_nm, beamWaist_mm, uavDistance_m, atmTurbulence_Cn2, pointingJitter_urad, pvArrayArea_m2, pvCellTemp_C]);

  // Main Animation
  useEffect(() => {
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      if (isPlaying) {
        setSimTime((t) => t + dt);
      }

      drawLaserPowerBeamingCanvas();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, physics, uavDistance_m, pointingJitter_urad]);

  // Canvas
  const drawLaserPowerBeamingCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Night sky background
    ctx.fillStyle = '#050a17';
    ctx.fillRect(0, 0, w, h);

    // Ground Station (Transmitter) on bottom-left
    const txX = 60;
    const txY = h - 45;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(txX - 25, txY, 50, 35);
    ctx.strokeStyle = '#475569';
    ctx.strokeRect(txX - 25, txY, 50, 35);

    // Laser Turret / Telescope dome
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(txX, txY, 18, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

    // UAV Target on top-right (Slant Range perspective)
    const targetX = w - 85;
    const targetY = 70;

    // Beam pointing with simulated jitter
    const jitterX = (Math.sin(simTime * 14) + Math.cos(simTime * 23)) * (pointingJitter_urad * 0.4);
    const jitterY = (Math.cos(simTime * 17) + Math.sin(simTime * 29)) * (pointingJitter_urad * 0.4);

    const hitX = targetX + jitterX;
    const hitY = targetY + 12 + jitterY;

    // Laser Beam (High energy NIR glow: Cyan / Gold core)
    const beamGrad = ctx.createLinearGradient(txX, txY, hitX, hitY);
    beamGrad.addColorStop(0, '#38bdf8ff');
    beamGrad.addColorStop(0.5, '#f59e0bcc');
    beamGrad.addColorStop(1, '#ef4444ee');

    ctx.strokeStyle = beamGrad;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(txX, txY);
    ctx.lineTo(hitX, hitY);
    ctx.stroke();

    // Atmospheric turbulence scintillation ripples around beam
    for (let r = 0; r < 5; r++) {
      const frac = 0.2 + r * 0.15;
      const rx = txX + (hitX - txX) * frac;
      const ry = txY + (hitY - txY) * frac;
      const noise = Math.sin(simTime * 20 + r * 3) * 6;

      ctx.fillStyle = '#38bdf833';
      ctx.beginPath();
      ctx.arc(rx + noise, ry - noise, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // UAV Drawing
    ctx.save();
    ctx.translate(targetX, targetY);

    // Quadrotor frame / Fuselage
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(-40, -10, 80, 20);
    ctx.fillRect(-40, -10, 80, 20);

    // Rotors
    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(-55, -12);
    ctx.lineTo(-25, -12);
    ctx.moveTo(25, -12);
    ctx.lineTo(55, -12);
    ctx.stroke();

    // Bottom GaAs Photovoltaic Array (Target Receptor)
    ctx.fillStyle = '#1e3a8a';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.fillRect(-30, 10, 60, 8);
    ctx.strokeRect(-30, 10, 60, 8);

    // Laser Spot on Receiver (Glowing disc)
    ctx.fillStyle = '#f59e0baa';
    ctx.beginPath();
    ctx.arc(jitterX, 14 + jitterY, 12, 0, Math.PI * 2);
    ctx.fill();

    // Target crosshair
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 14, 18, 0, Math.PI * 2);
    ctx.moveTo(-24, 14);
    ctx.lineTo(24, 14);
    ctx.moveTo(0, -10);
    ctx.lineTo(0, 38);
    ctx.stroke();

    ctx.restore();
  };

  // Range Performance Chart
  const rangeChartData = useMemo(() => {
    const data = [];
    const lambda_m = laserWavelength_nm * 1e-9;
    const w0_m = (beamWaist_mm / 2) * 1e-3;
    const z_R = (Math.PI * Math.pow(w0_m, 2)) / lambda_m;

    for (let r = 100; r <= 2000; r += 100) {
      const w_diff = w0_m * Math.sqrt(1 + Math.pow(r / z_R, 2));
      const w_turb = Math.sqrt(4.38 * Math.pow((2 * Math.PI) / lambda_m, 0.2) * atmTurbulence_Cn2 * Math.pow(r, 1.8));
      const totalR = Math.sqrt(Math.pow(w_diff, 2) + Math.pow(w_turb, 2));
      const area = Math.PI * Math.pow(totalR, 2);

      const atmLoss = Math.exp(-0.00008 * r);
      const intercept = Math.min(0.98, (pvArrayArea_m2 / Math.max(pvArrayArea_m2, area)));
      const pElec = laserPower_kW * atmLoss * intercept * 0.50;

      data.push({
        distance_m: r,
        electric_kW: parseFloat(pElec.toFixed(2)),
        spot_diameter_cm: parseFloat((totalR * 200).toFixed(1)),
        hover_threshold_kW: 1.8,
      });
    }
    return data;
  }, [laserPower_kW, laserWavelength_nm, beamWaist_mm, atmTurbulence_Cn2, pvArrayArea_m2]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-gradient-to-r from-amber-950/80 via-slate-900 to-yellow-950/80 border border-amber-800/40 rounded-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-500/20 border border-amber-400/30 rounded-xl text-amber-400 shadow-lg shadow-amber-950/50">
            <Zap className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Беспроводная Лазерная Передача Энергии (Laser Power Beaming UAV Recharging)
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full">
                Волоконный Лазер 1070 нм + GaAs Матрица КПД 52%
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl">
              Непрерывное беспосадочное электропитание БПЛА на дистанциях до 2.5 км: оптическая дифракция Гауссова пучка, атмосферная турбулентность $C_n^2$, суб-микрорадианное слежение FSM и охлаждение фотоэлементов.
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
              setLaserPower_kW(12);
              setUavDistance_m(650);
              setPointingJitter_urad(8.5);
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
              <Target className="w-4 h-4 text-amber-400" /> Наведение Лазерного Луча & GaAs Приемник БПЛА
            </span>
            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${physics.isRecharging ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'}`}>
              {physics.isRecharging ? '⚡ ИЗБЫТОК: ПОДЗАРЯДКА АКБ' : '⚠️ ДЕФИЦИТ ЭНЕРГИИ'}
            </span>
          </div>

          <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
            <canvas ref={canvasRef} width={640} height={340} className="w-full h-auto block" />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Пятно пучка на дроне: {physics.totalSpotDiameter_cm} см | Пропускание атмосферы: {physics.atmTransmission_pct}%</span>
            <span className="font-mono text-amber-400 font-bold">КПД GaAs: {physics.actualPvEff_pct}%</span>
          </div>
        </div>

        {/* Parameters */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" /> Параметры Лазерного Канала
            </h3>

            {/* Laser Power */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Оптическая Мощность Лазера (кВт)</span>
                <span className="font-mono text-amber-400 font-bold">{laserPower_kW} кВт</span>
              </div>
              <input
                type="range"
                min={2}
                max={25}
                step={1}
                value={laserPower_kW}
                onChange={(e) => setLaserPower_kW(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Distance */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Наклонная Дальность до БПЛА (м)</span>
                <span className="font-mono text-cyan-400 font-bold">{uavDistance_m} м</span>
              </div>
              <input
                type="range"
                min={100}
                max={2000}
                step={50}
                value={uavDistance_m}
                onChange={(e) => setUavDistance_m(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Pointing Jitter */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Дрожание Наведения ОПУ (мкрад)</span>
                <span className="font-mono text-emerald-400 font-bold">{pointingJitter_urad} мкрад</span>
              </div>
              <input
                type="range"
                min={2}
                max={30}
                step={1}
                value={pointingJitter_urad}
                onChange={(e) => setPointingJitter_urad(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

            {/* PV Cell Temp */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Температура Фотоэлементов (°C)</span>
                <span className="font-mono text-purple-400 font-bold">{pvCellTemp_C} °C</span>
              </div>
              <input
                type="range"
                min={25}
                max={85}
                step={5}
                value={pvCellTemp_C}
                onChange={(e) => setPvCellTemp_C(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Выработанная Электроэнергия</div>
              <div className="text-lg font-black text-amber-400 font-mono mt-0.5">{physics.pElectric_kW} кВт ({physics.pElectric_W} Вт)</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Баланс Тяги Полета</div>
              <div className={`text-lg font-black font-mono mt-0.5 ${physics.isRecharging ? 'text-emerald-400' : 'text-red-400'}`}>
                {physics.netPowerSurplus_kW > '0' ? `+${physics.netPowerSurplus_kW}` : physics.netPowerSurplus_kW} кВт
              </div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Диаметр Пятна Пучка</div>
              <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">{physics.totalSpotDiameter_cm} см</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Сброс Тепла (Waste Heat)</div>
              <div className="text-lg font-black text-purple-400 font-mono mt-0.5">{physics.wasteHeat_kW} кВт</div>
            </div>
          </div>
        </div>
      </div>

      {/* Range Chart */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" /> Мощность Электропитания vs Дистанция до Наземной Станции
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Порог висения дрона (1.8 кВт) обеспечивается на дистанциях до 1200 м
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rangeChartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="distance_m" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Дальность (м)', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Электрическая Мощность (кВт)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="electric_kW" stroke="#f59e0b" strokeWidth={3} name="Генерируемая Мощность (кВт)" />
              <Line type="monotone" dataKey="hover_threshold_kW" stroke="#ef4444" strokeDasharray="4 4" strokeWidth={2} name="Потребление Моторов (1.8 кВт)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
