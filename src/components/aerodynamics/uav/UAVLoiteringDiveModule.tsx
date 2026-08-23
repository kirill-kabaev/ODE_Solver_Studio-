// ============================================================================
// UAV Loitering Munition Terminal Dive & Aeroelastic Dynamics Simulator
// High-Speed Steep Dive Ballistics, Windmilling Drag, Wing Aeroelasticity & CEP
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Crosshair,
  Target,
  Wind,
  Shield,
  Activity,
  Sliders,
  Sparkles,
  Layers,
  TrendingDown,
  Gauge,
  Cpu,
  AlertTriangle,
  RotateCcw,
  Zap,
  Info,
  FastForward,
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
  BarChart,
  Bar,
} from 'recharts';

export type MunitionPreset = 'lancet_class' | 'switchblade600' | 'fpv_kamikaze' | 'harpy_heavy';
export type PropellerMode = 'powered_dive' | 'windmilling_brake' | 'folded_stopped';

export const UAVLoiteringDiveModule: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<MunitionPreset>('lancet_class');

  // Parameters
  const [loiterAltitudeM, setLoiterAltitudeM] = useState<number>(1200);
  const [targetDistanceM, setTargetDistanceM] = useState<number>(3500);
  const [diveAngleDeg, setDiveAngleDeg] = useState<number>(65); // 30° to 85°
  const [munitionMassKg, setMunitionMassKg] = useState<number>(12.0); // 12 kg Lancet class
  const [wingSpanM, setWingSpanM] = useState<number>(1.65);
  const [wingChordM, setWingChordM] = useState<number>(0.22);
  const [warheadMassKg, setWarheadMassKg] = useState<number>(3.5);
  const [crosswindMs, setCrosswindMs] = useState<number>(6.0); // 6 m/s wind
  const [targetSpeedKmh, setTargetSpeedKmh] = useState<number>(30); // 30 km/h moving target
  const [propellerMode, setPropellerMode] = useState<PropellerMode>('powered_dive');
  const [wingStiffnessGpa, setWingStiffnessGpa] = useState<number>(70); // Carbon fiber / composite stiffness (GPa)
  const [seekerFps, setSeekerFps] = useState<number>(60); // 60 FPS seeker camera
  const [servoLatencyMs, setServoLatencyMs] = useState<number>(25); // 25 ms servo actuation lag

  // Apply Presets
  const applyPreset = (preset: MunitionPreset) => {
    setSelectedPreset(preset);
    if (preset === 'lancet_class') {
      setLoiterAltitudeM(1200);
      setTargetDistanceM(3500);
      setDiveAngleDeg(65);
      setMunitionMassKg(12.0);
      setWingSpanM(1.65);
      setWingChordM(0.22);
      setWarheadMassKg(3.5);
      setPropellerMode('powered_dive');
      setWingStiffnessGpa(75);
    } else if (preset === 'switchblade600') {
      setLoiterAltitudeM(1500);
      setTargetDistanceM(4500);
      setDiveAngleDeg(75);
      setMunitionMassKg(15.0);
      setWingSpanM(1.4);
      setWingChordM(0.25);
      setWarheadMassKg(5.0);
      setPropellerMode('powered_dive');
      setWingStiffnessGpa(85);
    } else if (preset === 'fpv_kamikaze') {
      setLoiterAltitudeM(400);
      setTargetDistanceM(1200);
      setDiveAngleDeg(55);
      setMunitionMassKg(2.8);
      setWingSpanM(0.35);
      setWingChordM(0.35);
      setWarheadMassKg(1.5);
      setPropellerMode('powered_dive');
      setWingStiffnessGpa(50);
    } else if (preset === 'harpy_heavy') {
      setLoiterAltitudeM(2500);
      setTargetDistanceM(7000);
      setDiveAngleDeg(80);
      setMunitionMassKg(135.0);
      setWingSpanM(2.1);
      setWingChordM(0.85);
      setWarheadMassKg(32.0);
      setPropellerMode('powered_dive');
      setWingStiffnessGpa(90);
    }
  };

  // Trajectory and Ballistics Simulation Calculation
  const simulation = useMemo(() => {
    const rho0 = 1.225;
    const g = 9.81;
    const wingAreaM2 = wingSpanM * wingChordM * 2; // Tandem / Double X-wing has 2 wing pairs
    const cd0 = 0.028; // Zero-lift drag coefficient
    const ar = (wingSpanM ** 2) / (wingAreaM2 / 2); // Aspect ratio
    const oswaldE = 0.82;

    // Propeller Drag / Thrust calculation
    let propThrustOrDragN = 0;
    const propDiameterM = 0.32;
    const propDiscAreaM2 = (Math.PI * propDiameterM ** 2) / 4;

    // Time-stepping RK2 simulation of dive trajectory
    const dt = 0.05; // 50ms time step
    const gammaRad = (diveAngleDeg * Math.PI) / 180;
    
    // Initial state
    let t = 0;
    let x = 0;
    let z = loiterAltitudeM;
    let v = 35.0; // Initial entry speed ~126 km/h
    let maxG = 1.0;
    let maxQ = 0;
    let maxDeflectionMm = 0;

    const trajectoryPoints = [];
    let isTerminated = false;

    while (z > 0 && t < 45 && !isTerminated) {
      const rho = rho0 * Math.exp(-z / 8500);
      const q = 0.5 * rho * v ** 2; // Dynamic pressure Pa
      if (q > maxQ) maxQ = q;

      // Aerodynamic forces
      const cl = (munitionMassKg * g * Math.cos(gammaRad)) / Math.max(1, q * wingAreaM2);
      const cdInduced = (cl ** 2) / (Math.PI * ar * oswaldE);
      const cdTotal = cd0 + cdInduced;
      const dragN = cdTotal * q * wingAreaM2;

      // Propeller effect
      if (propellerMode === 'powered_dive') {
        propThrustOrDragN = 45.0 * (1.0 - (v / 100)); // Electric motor pushing
      } else if (propellerMode === 'windmilling_brake') {
        // Windmilling drag CD ~ 0.55
        propThrustOrDragN = -0.55 * q * propDiscAreaM2;
      } else {
        propThrustOrDragN = 0; // Folded prop
      }

      // Along-path acceleration: m * dv/dt = m*g*sin(gamma) - Drag + PropForce
      const dv_dt = g * Math.sin(gammaRad) - (dragN / munitionMassKg) + (propThrustOrDragN / munitionMassKg);
      v = Math.max(15, v + dv_dt * dt);

      // Terminal Pro-Nav correction load (overload required to hit moving/offset target)
      const targetOffsetDist = Math.abs(x - (targetDistanceM - (loiterAltitudeM - z) / Math.tan(gammaRad)));
      const requiredCorrectionAcc = Math.min(65.0, (targetOffsetDist * 0.8) + (crosswindMs * 2.2));
      const currentG = Math.sqrt(1 + (requiredCorrectionAcc / g) ** 2);
      if (currentG > maxG) maxG = currentG;

      // Aeroelastic wingtip bending deflection: delta = (L * b^3) / (8 * E * I)
      const wingLiftPerHalfWingN = (munitionMassKg * g * currentG) / 4;
      const rootThicknessM = wingChordM * 0.12;
      const I_area = (wingChordM * rootThicknessM ** 3) / 12; // Moment of inertia
      const E_pa = wingStiffnessGpa * 1e9;
      const tipDeflectionM = (wingLiftPerHalfWingN * ((wingSpanM / 2) ** 3)) / (3 * E_pa * I_area);
      const tipDeflectionMm = tipDeflectionM * 1000;
      if (tipDeflectionMm > maxDeflectionMm) maxDeflectionMm = tipDeflectionMm;

      // Position update
      const dx = v * Math.cos(gammaRad) * dt;
      const dz = v * Math.sin(gammaRad) * dt;

      x += dx;
      z = Math.max(0, z - dz);
      t += dt;

      // Sample every 0.25s for chart
      if (Math.round(t * 100) % 25 === 0 || z === 0) {
        trajectoryPoints.push({
          timeSec: parseFloat(t.toFixed(2)),
          altitudeM: Math.round(z),
          distanceM: Math.round(x),
          velocityKmh: Math.round(v * 3.6),
          velocityMs: parseFloat(v.toFixed(1)),
          dynamicPressureKpa: parseFloat((q / 1000).toFixed(2)),
          gLoad: parseFloat(currentG.toFixed(2)),
          wingDeflectionMm: parseFloat(tipDeflectionMm.toFixed(1)),
        });
      }

      if (z <= 0) isTerminated = true;
    }

    const impactSpeedKmh = Math.round(v * 3.6);
    const impactSpeedMs = parseFloat(v.toFixed(1));
    const totalDiveTimeSec = parseFloat(t.toFixed(1));
    const kineticEnergyKj = parseFloat((0.5 * munitionMassKg * v ** 2 / 1000).toFixed(1));

    // CEP (Circular Error Probable) Calculation
    // CEP = f(SeekerFPS, ServoLag, WindGust, ImpactSpeed, TargetSpeed)
    const seekerDelayDist = (1 / seekerFps) * (targetSpeedKmh / 3.6);
    const servoDelayDist = (servoLatencyMs / 1000) * (targetSpeedKmh / 3.6);
    const windDriftDist = (crosswindMs * 0.08) * (150 / Math.max(50, impactSpeedKmh));
    const baseCepM = Math.max(0.2, (seekerDelayDist + servoDelayDist + windDriftDist) * 1.8);
    const cepRadiusM = parseFloat(baseCepM.toFixed(2));

    // Flutter Margin
    const flutterCriticalSpeedKmh = Math.round(280 * Math.sqrt(wingStiffnessGpa / 60));
    const flutterSafetyMarginPercent = Math.round(((flutterCriticalSpeedKmh - impactSpeedKmh) / flutterCriticalSpeedKmh) * 100);

    return {
      trajectoryPoints,
      impactSpeedKmh,
      impactSpeedMs,
      totalDiveTimeSec,
      kineticEnergyKj,
      maxG: parseFloat(maxG.toFixed(1)),
      maxQ: parseFloat((maxQ / 1000).toFixed(1)),
      maxDeflectionMm: parseFloat(maxDeflectionMm.toFixed(1)),
      cepRadiusM,
      flutterCriticalSpeedKmh,
      flutterSafetyMarginPercent,
    };
  }, [
    loiterAltitudeM,
    targetDistanceM,
    diveAngleDeg,
    munitionMassKg,
    wingSpanM,
    wingChordM,
    crosswindMs,
    targetSpeedKmh,
    propellerMode,
    wingStiffnessGpa,
    seekerFps,
    servoLatencyMs,
  ]);

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-rose-950/90 via-slate-900 to-amber-950/80 border border-rose-500/40 shadow-2xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400">
              <Crosshair className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Аэродинамика Пикирования & Баллистика Барражирующих Боеприпасов</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Terminal Dive & Flutter
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Моделирование крутого пикирования (30°–85°), авторотации винта, перегрузок наведения и аэроупругого изгиба крыла
              </p>
            </div>
          </div>
        </div>

        {/* Quick Munition Preset Selector */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
          {[
            { id: 'lancet_class', label: 'Ланцет-3 (Double X-Wing 12 кг)' },
            { id: 'switchblade600', label: 'Switchblade-600 (Tandem Wing 15 кг)' },
            { id: 'fpv_kamikaze', label: 'FPV Ударный Дрон (2.8 кг)' },
            { id: 'harpy_heavy', label: 'Harpy / Harop ПРР (135 кг)' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id as MunitionPreset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedPreset === p.id
                  ? 'bg-rose-500 text-white font-black shadow-lg ring-1 ring-rose-400'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Sliders className="w-4 h-4 text-rose-400" />
              <span>Параметры Пикирования & Баллистики</span>
            </h3>

            {/* Dive Angle Slider */}
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Угол пикирования (gamma):</span>
                <span className="text-rose-400 font-bold">{diveAngleDeg}° ({diveAngleDeg > 70 ? 'Отвесный удар' : 'Пологое пикирование'})</span>
              </div>
              <input
                type="range"
                min={30}
                max={85}
                step={1}
                value={diveAngleDeg}
                onChange={(e) => setDiveAngleDeg(parseInt(e.target.value))}
                className="w-full accent-rose-400 cursor-pointer"
              />
            </div>

            {/* Loiter Altitude */}
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Высота ввода в пикирование (H0):</span>
                <span className="text-cyan-400 font-bold">{loiterAltitudeM} м</span>
              </div>
              <input
                type="range"
                min={200}
                max={4000}
                step={50}
                value={loiterAltitudeM}
                onChange={(e) => setLoiterAltitudeM(parseInt(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Target Distance */}
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Горизонтальная дистанция до цели (X0):</span>
                <span className="text-amber-400 font-bold">{(targetDistanceM / 1000).toFixed(1)} км</span>
              </div>
              <input
                type="range"
                min={500}
                max={10000}
                step={100}
                value={targetDistanceM}
                onChange={(e) => setTargetDistanceM(parseInt(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Propeller Mode Selector */}
            <div className="space-y-1.5 text-xs text-slate-300">
              <label className="text-slate-400 block">Режим силовой установки в пикировании:</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'powered_dive', label: 'Тяга Мотора' },
                  { id: 'windmilling_brake', label: 'Авторотация' },
                  { id: 'folded_stopped', label: 'Сложен/Выкл' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPropellerMode(mode.id as PropellerMode)}
                    className={`p-2 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer ${
                      propellerMode === mode.id
                        ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-md ring-1 ring-rose-400/50'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Crosswind & Moving Target */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1 text-xs text-slate-300">
                <span className="text-slate-400 text-[10px] block">Боковой ветер:</span>
                <input
                  type="number"
                  min={0}
                  max={25}
                  value={crosswindMs}
                  onChange={(e) => setCrosswindMs(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-cyan-300 font-bold"
                />
                <span className="text-[10px] text-slate-500">м/с</span>
              </div>

              <div className="space-y-1 text-xs text-slate-300">
                <span className="text-slate-400 text-[10px] block">Скорость цели:</span>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={targetSpeedKmh}
                  onChange={(e) => setTargetSpeedKmh(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-amber-300 font-bold"
                />
                <span className="text-[10px] text-slate-500">км/ч</span>
              </div>
            </div>

            {/* Wing Stiffness & Avionics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 text-xs text-slate-300">
                <span className="text-slate-400 text-[10px] block">Жесткость крыла (E):</span>
                <input
                  type="number"
                  min={20}
                  max={150}
                  value={wingStiffnessGpa}
                  onChange={(e) => setWingStiffnessGpa(parseInt(e.target.value) || 50)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-purple-300 font-bold"
                />
                <span className="text-[10px] text-slate-500">ГПа (Углепластик)</span>
              </div>

              <div className="space-y-1 text-xs text-slate-300">
                <span className="text-slate-400 text-[10px] block">Задержка сервопривода:</span>
                <input
                  type="number"
                  min={5}
                  max={80}
                  value={servoLatencyMs}
                  onChange={(e) => setServoLatencyMs(parseInt(e.target.value) || 20)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-rose-300 font-bold"
                />
                <span className="text-[10px] text-slate-500">мс</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column Visuals & Charts (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Real-time Trajectory Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-400" />
                <span>Профиль Траектории Пикирования (Высота H vs Дистанция X)</span>
              </h3>
              <span className="text-xs text-slate-400">Время падения: {simulation.totalDiveTimeSec} с</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={simulation.trajectoryPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="distanceM" stroke="#64748b" tick={{ fontSize: 11 }} unit=" м" />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit=" м" />
                  <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }} />
                  <Line type="monotone" dataKey="altitudeM" name="Высота (м)" stroke="#f43f5e" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Скорость удара:</span>
                <span className="text-rose-400 font-black text-base">{simulation.impactSpeedKmh} км/ч</span>
                <span className="text-[10px] text-slate-400 block">({simulation.impactSpeedMs} м/с)</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Точность КВО (CEP):</span>
                <span className="text-emerald-400 font-black text-base">{simulation.cepRadiusM} м</span>
                <span className="text-[10px] text-slate-400 block">Радиус попадания</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Макс. перегрузка:</span>
                <span className="text-amber-400 font-black text-base">{simulation.maxG} G</span>
                <span className="text-[10px] text-slate-400 block">На маневре цели</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Кинетическая энергия:</span>
                <span className="text-cyan-400 font-black text-base">{simulation.kineticEnergyKj} кДж</span>
                <span className="text-[10px] text-slate-400 block">При встрече с броней</span>
              </div>
            </div>
          </div>

          {/* Aeroelasticity & Flutter Analysis Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-purple-400 font-bold">
                <Cpu className="w-4 h-4" />
                <span>АЭРОУПРУГИЙ ИЗГИБ КРЫЛА & ЗАПАС ПО ФЛАТТЕРУ:</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  simulation.flutterSafetyMarginPercent > 20
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                Запас по флаттеру: +{simulation.flutterSafetyMarginPercent}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Изгиб законцовки крыла:</span>
                <span className="text-purple-300 font-bold text-sm">{simulation.maxDeflectionMm} мм</span>
                <p className="text-[10px] text-slate-400 mt-1">Деформация консоли под скоростным напором q = {simulation.maxQ} кПа</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Критическая скорость флаттера:</span>
                <span className="text-cyan-300 font-bold text-sm">{simulation.flutterCriticalSpeedKmh} км/ч</span>
                <p className="text-[10px] text-slate-400 mt-1">Скорость изгибно-крутильной неустойчивости консолей</p>
              </div>
            </div>

            <p className="text-slate-400 leading-relaxed text-[11px]">
              Формула динамики пикирования: <strong>m · dv/dt = -D(V) + mg · sin(γ) - T_windmilling</strong>. При крутых углах &gt;65° скорость возрастает до 250–340 км/ч, резко повышая кинетическую пробиваемость кумулятивной боевой части даже по динамической защите бронетехники.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
