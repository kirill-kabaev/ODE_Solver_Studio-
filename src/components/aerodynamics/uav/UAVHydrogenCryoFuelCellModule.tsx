import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Droplets,
  Zap,
  Gauge,
  Thermometer,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Activity,
  BatteryCharging,
  Wind,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Flame,
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
  AreaChart,
  Area,
} from 'recharts';

export const UAVHydrogenCryoFuelCellModule: React.FC = () => {
  // LH2 Cryo-Tank Parameters
  const [tankVolume_L, setTankVolume_L] = useState<number>(45); // Liters of LH2
  const [mliLayers, setMliLayers] = useState<number>(40); // Multi-Layer Insulation count
  const [tankPressure_bar, setTankPressure_bar] = useState<number>(1.8); // 1.2 to 4.0 bar
  const [ambientTemp_C, setAmbientTemp_C] = useState<number>(-15); // Stratospheric temp

  // Fuel Cell Stack Parameters
  const [cellCount, setCellCount] = useState<number>(180); // Number of PEM cells in stack
  const [activeArea_cm2, setActiveArea_cm2] = useState<number>(200); // cm^2 per cell
  const [currentDensity_A_cm2, setCurrentDensity_A_cm2] = useState<number>(0.65); // A/cm^2
  const [stackTemp_C, setStackTemp_C] = useState<number>(68); // 60-80°C optimal
  const [airStoichiometry, setAirStoichiometry] = useState<number>(2.0); // Lambda_air

  // Mission & Aircraft Load
  const [motorPowerRequired_kW, setMotorPowerRequired_kW] = useState<number>(5.5); // Baseline cruise power
  const [avionicsPower_W, setAvionicsPower_W] = useState<number>(350); // Sensor payload
  const [hybridBatterySoC_pct, setHybridBatterySoC_pct] = useState<number>(85);

  // Runtime Simulation
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simHours, setSimHours] = useState<number>(0);
  const [fuelRemaining_kg, setFuelRemaining_kg] = useState<number>(3.15); // LH2 density ~70.8 kg/m^3 -> 45L = ~3.18 kg

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  // Reset
  const resetSim = () => {
    const initLH2_kg = (tankVolume_L * 0.0708); // kg
    setFuelRemaining_kg(initLH2_kg);
    setSimHours(0);
  };

  useEffect(() => {
    resetSim();
  }, [tankVolume_L]);

  // Electrochemical PEMFC Physics
  const fcPhysics = useMemo(() => {
    const T_kelvin = stackTemp_C + 273.15;
    const F = 96485; // Faraday constant C/mol
    const R = 8.314; // J/(mol K)

    // 1. Nernst potential E_0
    const E_nernst = 1.229 - 0.85e-3 * (T_kelvin - 298.15); // ~1.19 V

    // 2. Activation losses (Tafel)
    const i_0 = 1e-4; // exchange current density A/cm^2
    const alpha = 0.5;
    const i = Math.max(0.01, currentDensity_A_cm2);
    const eta_act = (R * T_kelvin / (alpha * F)) * Math.log(i / i_0);

    // 3. Ohmic losses (membrane ASR ~ 0.15 Ohm*cm^2)
    const R_mem = 0.14;
    const eta_ohmic = i * R_mem;

    // 4. Concentration losses
    const i_limit = 1.8; // limiting current density A/cm^2
    const eta_conc = - (R * T_kelvin / (2 * F)) * Math.log(Math.max(0.01, 1 - i / i_limit));

    // Single cell voltage
    const v_cell = Math.max(0.3, E_nernst - eta_act - eta_ohmic - eta_conc);
    const stackVoltage_V = v_cell * cellCount;
    const totalCurrent_A = i * activeArea_cm2;
    const stackGrossPower_kW = (stackVoltage_V * totalCurrent_A) / 1000;

    // Hydrogen consumption rate: m_dot = (I * N_cells) / (2 * F) * M_H2 (M_H2 = 2.016 g/mol)
    const h2_consumption_g_s = (totalCurrent_A * cellCount * 2.016) / (2 * F);
    const h2_consumption_kg_h = (h2_consumption_g_s * 3600) / 1000;

    // Efficiency based on LHV (120 MJ/kg) -> V_cell / 1.25V
    const efficiency_LHV_pct = (v_cell / 1.253) * 100;

    // Water produced: 9 grams H2O per 1 gram H2
    const water_produced_L_h = h2_consumption_kg_h * 9.0;

    // Cryogenic Boil-off rate (BOR) based on MLI layers
    const heatLeak_W = (180 / mliLayers) * (tankVolume_L / 45); // W
    // Latent heat of vaporization of LH2 = 446 kJ/kg
    const boilOff_kg_h = (heatLeak_W * 3600) / 446000;

    // Total H2 drain rate (fuel cell + unrecovered boiloff)
    const netH2Drain_kg_h = h2_consumption_kg_h + Math.max(0, boilOff_kg_h - h2_consumption_kg_h);

    // Max flight endurance (hours)
    const maxEnduranceHours = fuelRemaining_kg / Math.max(0.01, netH2Drain_kg_h);

    return {
      v_cell: v_cell.toFixed(3),
      stackVoltage_V: stackVoltage_V.toFixed(1),
      totalCurrent_A: totalCurrent_A.toFixed(1),
      stackGrossPower_kW: stackGrossPower_kW.toFixed(2),
      h2_consumption_kg_h: h2_consumption_kg_h.toFixed(3),
      efficiency_LHV_pct: efficiency_LHV_pct.toFixed(1),
      water_produced_L_h: water_produced_L_h.toFixed(2),
      heatLeak_W: heatLeak_W.toFixed(1),
      boilOff_kg_h: boilOff_kg_h.toFixed(4),
      netH2Drain_kg_h: netH2Drain_kg_h.toFixed(3),
      maxEnduranceHours: maxEnduranceHours.toFixed(1),
    };
  }, [stackTemp_C, cellCount, activeArea_cm2, currentDensity_A_cm2, mliLayers, tankVolume_L, fuelRemaining_kg]);

  // Simulation Loop
  useEffect(() => {
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      if (isPlaying) {
        // Fast time scale: 1 real second = 0.5 sim hours
        const simDtHours = dt * 0.5;
        setSimHours((h) => h + simDtHours);

        const drainKg = parseFloat(fcPhysics.netH2Drain_kg_h) * simDtHours;
        setFuelRemaining_kg((prev) => Math.max(0, prev - drainKg));
      }

      drawFuelCellDiagram();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, fcPhysics]);

  // Canvas Schematic of Cryo-Tank, PEM Stack & Propulsion
  const drawFuelCellDiagram = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#050c1a';
    ctx.fillRect(0, 0, w, h);

    // 1. Cryo Tank on the left (x: 40, y: 70, w: 140, h: 180)
    const tankX = 40;
    const tankY = 60;
    const tankW = 140;
    const tankH = 180;

    // Tank outer vacuum shell
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(tankX, tankY, tankW, tankH, 20);
    ctx.stroke();

    // MLI Foil Layers (Gold/Amber)
    ctx.strokeStyle = '#f59e0b55';
    ctx.lineWidth = 1;
    for (let i = 4; i < 14; i += 3) {
      ctx.strokeRect(tankX + i, tankY + i, tankW - i * 2, tankH - i * 2);
    }

    // Liquid Hydrogen Level (Cold cyan)
    const initKg = tankVolume_L * 0.0708;
    const fillRatio = Math.max(0, Math.min(1, fuelRemaining_kg / initKg));
    const liquidH = (tankH - 30) * fillRatio;

    const liquidGrad = ctx.createLinearGradient(0, tankY + tankH - 15 - liquidH, 0, tankY + tankH - 15);
    liquidGrad.addColorStop(0, '#06b6d488');
    liquidGrad.addColorStop(1, '#0284c7cc');

    ctx.fillStyle = liquidGrad;
    ctx.beginPath();
    ctx.roundRect(tankX + 15, tankY + tankH - 15 - liquidH, tankW - 30, liquidH, [0, 0, 10, 10]);
    ctx.fill();

    // Boil-off gas bubbles in cryogenic liquid
    if (fillRatio > 0.05) {
      ctx.fillStyle = '#e0f2fe';
      for (let b = 0; b < 6; b++) {
        const bx = tankX + 25 + (b * 18) % (tankW - 50);
        const by = tankY + tankH - 25 - ((simHours * 80 + b * 25) % Math.max(10, liquidH));
        ctx.beginPath();
        ctx.arc(bx, by, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Tank labels
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('LH₂ Крио-Бак (20 K)', tankX + 12, tankY + 25);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`${fuelRemaining_kg.toFixed(2)} кг (${(fillRatio * 100).toFixed(0)}%)`, tankX + 28, tankY + 42);

    // 2. Hydrogen Pipe to PEM Stack
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(tankX + tankW, tankY + tankH / 2);
    ctx.lineTo(tankX + tankW + 60, tankY + tankH / 2);
    ctx.stroke();

    // H2 flow pulse dots
    const pulseOffset = (simHours * 40) % 20;
    ctx.fillStyle = '#e0f2fe';
    for (let p = 0; p < 3; p++) {
      ctx.beginPath();
      ctx.arc(tankX + tankW + 10 + p * 20 + pulseOffset, tankY + tankH / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. PEM Fuel Cell Stack (x: 250, y: 50, w: 170, h: 200)
    const stackX = 250;
    const stackY = 50;
    const stackW = 170;
    const stackH = 200;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(stackX, stackY, stackW, stackH);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.strokeRect(stackX, stackY, stackW, stackH);

    // Bipolar Plates striping inside stack
    for (let s = 10; s < stackW - 10; s += 12) {
      ctx.strokeStyle = s % 24 === 10 ? '#3b82f644' : '#ef444444';
      ctx.beginPath();
      ctx.moveTo(stackX + s, stackY + 15);
      ctx.lineTo(stackX + s, stackY + stackH - 15);
      ctx.stroke();
    }

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('PEM Топливный Стек', stackX + 16, stackY + 30);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '10px monospace';
    ctx.fillText(`${fcPhysics.v_cell} В/ячейка`, stackX + 45, stackY + 50);
    ctx.fillText(`${fcPhysics.stackVoltage_V} В | ${fcPhysics.totalCurrent_A} А`, stackX + 25, stackY + 70);
    ctx.fillText(`Мощность: ${fcPhysics.stackGrossPower_kW} кВт`, stackX + 15, stackY + 90);
    ctx.fillText(`КПД (LHV): ${fcPhysics.efficiency_LHV_pct}%`, stackX + 25, stackY + 110);

    // Water exhaust from bottom of stack
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(stackX + stackW / 2, stackY + stackH);
    ctx.lineTo(stackX + stackW / 2, stackY + stackH + 35);
    ctx.stroke();
    ctx.fillStyle = '#60a5fa';
    ctx.font = '10px monospace';
    ctx.fillText(`H₂O Конденсат: ${fcPhysics.water_produced_L_h} л/ч`, stackX + stackW / 2 - 50, stackY + stackH + 48);

    // 4. DC Bus Line to Electric Motor / Propeller
    const motorX = 490;
    const motorY = 150;

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(stackX + stackW, stackY + 70);
    ctx.lineTo(motorX, motorY);
    ctx.stroke();

    // Motor Hub
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(motorX + 30, motorY, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Spinning Propeller
    const propAngle = simHours * 150;
    ctx.save();
    ctx.translate(motorX + 30, motorY);
    ctx.rotate(propAngle);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -55);
    ctx.lineTo(0, 55);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('Тяговый Электродвигатель', motorX - 10, motorY + 45);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`Нагрузка: ${motorPowerRequired_kW} кВт`, motorX, motorY + 62);
  };

  // Polarization Curve Data (V vs Current Density)
  const polarizationData = useMemo(() => {
    const data = [];
    const T_k = stackTemp_C + 273.15;
    const F = 96485;
    const R = 8.314;
    const E_nernst = 1.229 - 0.85e-3 * (T_k - 298.15);

    for (let i = 0.05; i <= 1.6; i += 0.05) {
      const eta_act = (R * T_k / (0.5 * F)) * Math.log(i / 1e-4);
      const eta_ohmic = i * 0.14;
      const eta_conc = - (R * T_k / (2 * F)) * Math.log(Math.max(0.01, 1 - i / 1.8));

      const v = Math.max(0.2, E_nernst - eta_act - eta_ohmic - eta_conc);
      const p_density_W_cm2 = v * i;

      data.push({
        i_density: parseFloat(i.toFixed(2)),
        cell_V: parseFloat(v.toFixed(3)),
        power_density_W_cm2: parseFloat(p_density_W_cm2.toFixed(3)),
      });
    }
    return data;
  }, [stackTemp_C]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-gradient-to-r from-cyan-950/80 via-slate-900 to-blue-950/80 border border-cyan-800/40 rounded-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-cyan-500/20 border border-cyan-400/30 rounded-xl text-cyan-400 shadow-lg shadow-cyan-950/50">
            <Droplets className="w-7 h-7 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Криогенная Водородная Энергоустановка БПЛА (LH₂ Cryo-Fuel Cell 120h)
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full">
                Сверхдлительный Полет 72–120 часов
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl">
              Моделирование криогенного бака с жидким водородом ($LH_2$, 20 K), термодинамики кипения (Boil-Off Rate),
              поляризационной кривой мембранного топливного элемента (PEMFC) и баланса выработки чистой воды.
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
            onClick={resetSim}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Schematic & Sliders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Schematic Canvas */}
        <div className="lg:col-span-7 flex flex-col gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" /> Термодинамическая Схема: LH₂ Бак → PEMFC Стек → Тяговый Мотор
            </span>
            <span className="text-xs font-mono text-cyan-300 font-bold">
              Полетное Время: {simHours.toFixed(1)} ч / Макс: {fcPhysics.maxEnduranceHours} ч
            </span>
          </div>

          <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
            <canvas ref={canvasRef} width={640} height={320} className="w-full h-auto block" />
          </div>

          {/* Motor Power Demand Slider */}
          <div className="flex items-center gap-4 pt-2">
            <span className="text-xs text-slate-400 whitespace-nowrap font-medium flex items-center gap-1">
              Потребная Тяговая Мощность (кВт):
            </span>
            <input
              type="range"
              min={1.5}
              max={15.0}
              step={0.5}
              value={motorPowerRequired_kW}
              onChange={(e) => setMotorPowerRequired_kW(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <span className="text-xs font-mono text-cyan-300 font-bold w-12 text-right">{motorPowerRequired_kW} кВт</span>
          </div>
        </div>

        {/* Parameters & Configuration */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" /> Параметры Крио-Бака и PEMFC
            </h3>

            {/* Tank Volume */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Объем Крио-Бака LH₂ (Литры)</span>
                <span className="font-mono text-cyan-400 font-bold">{tankVolume_L} л ({(tankVolume_L * 0.0708).toFixed(2)} кг)</span>
              </div>
              <input
                type="range"
                min={15}
                max={120}
                step={5}
                value={tankVolume_L}
                onChange={(e) => setTankVolume_L(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* MLI Layers */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Слои Экранно-Вакуумной Изоляции (ЭВТИ / MLI)</span>
                <span className="font-mono text-amber-400 font-bold">{mliLayers} слоев</span>
              </div>
              <input
                type="range"
                min={15}
                max={80}
                step={5}
                value={mliLayers}
                onChange={(e) => setMliLayers(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Current Density */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Плотность Тока Ячеек (i)</span>
                <span className="font-mono text-emerald-400 font-bold">{currentDensity_A_cm2} А/см²</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={1.4}
                step={0.05}
                value={currentDensity_A_cm2}
                onChange={(e) => setCurrentDensity_A_cm2(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

            {/* Stack Temp */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Рабочая Температура Стека</span>
                <span className="font-mono text-rose-400 font-bold">+{stackTemp_C}°C</span>
              </div>
              <input
                type="range"
                min={50}
                max={85}
                step={1}
                value={stackTemp_C}
                onChange={(e) => setStackTemp_C(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
              />
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Предельная Автономность</div>
              <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">{fcPhysics.maxEnduranceHours} ч</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Расход Водорода</div>
              <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">{fcPhysics.h2_consumption_kg_h} кг/ч</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Теплоприток в Бак</div>
              <div className="text-lg font-black text-amber-400 font-mono mt-0.5">{fcPhysics.heatLeak_W} Вт</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Генерация Воды (Конденсат)</div>
              <div className="text-lg font-black text-blue-400 font-mono mt-0.5">{fcPhysics.water_produced_L_h} л/ч</div>
            </div>
          </div>
        </div>
      </div>

      {/* Polarization & Power Density Curve Recharts */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Вольт-Амперная Поляризационная Кривая PEMFC и Удельная Мощность
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Рабочая точка: {currentDensity_A_cm2} А/см² @ {fcPhysics.v_cell} В
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={polarizationData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="i_density" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Плотность Тока (А/см²)', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Напряжение Ячейки (В) / Мощность (Вт/см²)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="cell_V" stroke="#38bdf8" strokeWidth={2.5} name="Напряжение Ячейки V_cell (В)" />
              <Line type="monotone" dataKey="power_density_W_cm2" stroke="#10b981" strokeWidth={2} name="Удельная Мощность (Вт/см²)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
