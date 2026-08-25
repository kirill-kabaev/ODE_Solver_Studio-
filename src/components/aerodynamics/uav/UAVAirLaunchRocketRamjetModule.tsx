import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Rocket,
  Flame,
  Gauge,
  Sliders,
  Activity,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Wind,
  Shield,
  Layers,
  Sparkles,
  ArrowUpRight,
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

type FlightStage = 'carrier_drop' | 'rocket_boost' | 'ramjet_transition' | 'ramjet_cruise' | 'target_intercept';

export const UAVAirLaunchRocketRamjetModule: React.FC = () => {
  // Flight Configuration
  const [dropAltitudeKm, setDropAltitudeKm] = useState<number>(12.0); // km
  const [dropMach, setDropMach] = useState<number>(0.85); // Carrier speed
  const [boosterThrustKn, setBoosterThrustKn] = useState<number>(65); // kN
  const [boosterBurnTimeS, setBoosterBurnTimeS] = useState<number>(5.5); // s
  const [ramjetTargetMach, setRamjetTargetMach] = useState<number>(3.8); // Mach
  const [cruiseAltitudeKm, setCruiseAltitudeKm] = useState<number>(22.0); // km
  const [uavDryMassKg, setUavDryMassKg] = useState<number>(380); // kg
  const [fuelMassKg, setFuelMassKg] = useState<number>(240); // kg

  // Simulation State
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);
  const [currentStage, setCurrentStage] = useState<FlightStage>('carrier_drop');
  const [currentMach, setCurrentMach] = useState<number>(0.85);
  const [currentAltitude, setCurrentAltitude] = useState<number>(12.0);
  const [currentDistance, setCurrentDistance] = useState<number>(0); // km
  const [currentPitchDeg, setCurrentPitchDeg] = useState<number>(-5); // deg
  const [currentThrustKn, setCurrentThrustKn] = useState<number>(0);
  const [inletShockStatus, setInletShockStatus] = useState<string>('Закрыт (РДТТ)');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Atmospheric Model (ISA)
  const getAtmosphere = (altKm: number) => {
    const h = Math.min(30, Math.max(0, altKm));
    const T0 = 288.15;
    const p0 = 101325;
    let T = T0 - 6.5 * h;
    let p = p0 * Math.pow(1 - (0.0065 * h * 1000) / T0, 5.2561);
    if (h > 11.0) {
      T = 216.65;
      p = 22632 * Math.exp(-9.80665 * 0.0289644 * (h - 11) * 1000 / (8.3144598 * 216.65));
    }
    const rho = p / (287.05 * T);
    const soundSpeed = Math.sqrt(1.4 * 287.05 * T);
    return { T, p, rho, soundSpeed };
  };

  // Dynamics Stepping Loop
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSimTime((t) => {
        const dt = 0.05;
        const newT = t + dt;

        // State Machine
        if (newT < 1.2) {
          // Drop & ignite delay
          setCurrentStage('carrier_drop');
          setCurrentMach(dropMach);
          setCurrentAltitude((alt) => Math.max(0, alt - 0.008));
          setCurrentPitchDeg(-4);
          setCurrentThrustKn(0);
          setInletShockStatus('Сброс с пилона носителя');
        } else if (newT < 1.2 + boosterBurnTimeS) {
          // Rocket Boost Phase
          setCurrentStage('rocket_boost');
          const boostFrac = (newT - 1.2) / boosterBurnTimeS;
          const targetBoostMach = 2.4;
          setCurrentMach(dropMach + (targetBoostMach - dropMach) * Math.sin((boostFrac * Math.PI) / 2));
          setCurrentAltitude((alt) => Math.min(cruiseAltitudeKm, alt + 0.065));
          setCurrentPitchDeg(18);
          setCurrentThrustKn(boosterThrustKn);
          setInletShockStatus('РДТТ тяга / Вход закрыт заглушкой');
        } else if (newT < 1.2 + boosterBurnTimeS + 2.0) {
          // Ramjet Transition (Inlet Unporting & Ignition)
          setCurrentStage('ramjet_transition');
          setCurrentMach((m) => Math.min(ramjetTargetMach, m + 0.03));
          setCurrentAltitude((alt) => Math.min(cruiseAltitudeKm, alt + 0.04));
          setCurrentPitchDeg(8);
          setCurrentThrustKn(boosterThrustKn * 0.45);
          setInletShockStatus('Сброс сопла РДТТ / Запуск ПВРД');
        } else {
          // Ramjet Hypersonic/Supersonic Cruise
          setCurrentStage('ramjet_cruise');
          setCurrentMach((m) => {
            const diff = ramjetTargetMach - m;
            return m + diff * 0.05;
          });
          setCurrentAltitude((alt) => {
            const diff = cruiseAltitudeKm - alt;
            return alt + diff * 0.04;
          });
          setCurrentPitchDeg(2.5);
          const atmos = getAtmosphere(currentAltitude);
          const qDyn = 0.5 * atmos.rho * Math.pow(currentMach * atmos.soundSpeed, 2);
          const ramjetThrust = (qDyn * 0.08) / 1000;
          setCurrentThrustKn(Math.min(45, Math.max(12, ramjetThrust)));
          setInletShockStatus('ПВРД запущен (Система скачков сжатия стабильна)');
        }

        // Advance ground distance
        const { soundSpeed } = getAtmosphere(currentAltitude);
        const velocityMs = currentMach * soundSpeed;
        setCurrentDistance((d) => d + (velocityMs * dt) / 1000);

        return newT;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isRunning, dropMach, boosterBurnTimeS, boosterThrustKn, ramjetTargetMach, cruiseAltitudeKm, currentAltitude, currentMach]);

  // Derived Thermodynamics & Aerodynamics
  const atmos = getAtmosphere(currentAltitude);
  const currentSpeedMs = currentMach * atmos.soundSpeed;
  const dynamicPressureKpa = (0.5 * atmos.rho * Math.pow(currentSpeedMs, 2)) / 1000;
  const stagnationTempK = atmos.T * (1 + 0.2 * Math.pow(currentMach, 2));
  const stagnationTempC = stagnationTempK - 273.15;
  const totalHeatFluxKwM2 = 0.15 * Math.sqrt(atmos.rho) * Math.pow(currentSpeedMs / 1000, 3) * 1000;

  // Reset Simulation
  const handleReset = () => {
    setSimTime(0);
    setCurrentMach(dropMach);
    setCurrentAltitude(dropAltitudeKm);
    setCurrentDistance(0);
    setCurrentPitchDeg(-5);
    setCurrentThrustKn(0);
    setCurrentStage('carrier_drop');
  };

  // Canvas Visualization: Supersonic Shockwaves & Engine Flow
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Sky / Stratosphere Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (currentAltitude > 18) {
      skyGrad.addColorStop(0, '#020617');
      skyGrad.addColorStop(1, '#0b132b');
    } else {
      skyGrad.addColorStop(0, '#071330');
      skyGrad.addColorStop(1, '#1e293b');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Flow Streamlines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.lineWidth = 1;
    for (let y = 20; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // UAV Centered
    const centerX = 230;
    const centerY = 145;
    const pitchRad = (currentPitchDeg * Math.PI) / 180;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(pitchRad);

    // Oblique Shockwaves (if Mach > 1)
    if (currentMach > 1.0) {
      const machAngle = Math.asin(1 / Math.min(10, currentMach));
      const shockLen = 220;

      // Nose Oblique Shockwave (Orange/Red)
      ctx.strokeStyle = currentMach > 3.0 ? 'rgba(244, 63, 94, 0.8)' : 'rgba(251, 146, 60, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      // Upper shock
      ctx.moveTo(110, 0);
      ctx.lineTo(110 - shockLen * Math.cos(machAngle), -shockLen * Math.sin(machAngle));
      // Lower shock
      ctx.moveTo(110, 0);
      ctx.lineTo(110 - shockLen * Math.cos(machAngle), shockLen * Math.sin(machAngle));
      ctx.stroke();

      // Inlet Shock Cone
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, 15);
      ctx.lineTo(40 - 90 * Math.cos(machAngle), 15 + 90 * Math.sin(machAngle));
      ctx.stroke();
    }

    // UAV Missile/Drone Fuselage (Waverider / Ramjet Body)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(110, 0); // Sharp nose
    ctx.lineTo(30, -14); // Upper fuselage
    ctx.lineTo(-90, -12); // Engine nacelle upper
    ctx.lineTo(-90, 12); // Engine nozzle
    ctx.lineTo(20, 14); // Ventral inlet ramp
    ctx.lineTo(40, 6); // Chin scoop
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Delta / Clipped Wings
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(-10, -12);
    ctx.lineTo(-80, -55);
    ctx.lineTo(-88, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Ventral Ramjet Inlet Diffuser (Glowing if Ramjet Active)
    if (currentStage === 'ramjet_cruise' || currentStage === 'ramjet_transition') {
      const inletGrad = ctx.createLinearGradient(20, 10, -50, 10);
      inletGrad.addColorStop(0, '#38bdf8');
      inletGrad.addColorStop(0.5, '#f59e0b');
      inletGrad.addColorStop(1, '#ef4444');
      ctx.fillStyle = inletGrad;
      ctx.fillRect(-50, 2, 65, 8);
    }

    // Rocket / Ramjet Exhaust Plume
    if (currentThrustKn > 0) {
      const plumeLen = currentStage === 'rocket_boost' ? 120 : 85;
      const plumeGrad = ctx.createLinearGradient(-90, 0, -90 - plumeLen, 0);
      if (currentStage === 'rocket_boost') {
        // High temp solid rocket flame
        plumeGrad.addColorStop(0, '#ffffff');
        plumeGrad.addColorStop(0.2, '#fef08a');
        plumeGrad.addColorStop(0.5, '#f97316');
        plumeGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      } else {
        // Blue/Orange shock diamond supersonic ramjet plume
        plumeGrad.addColorStop(0, '#38bdf8');
        plumeGrad.addColorStop(0.3, '#f97316');
        plumeGrad.addColorStop(0.7, '#fb7185');
        plumeGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
      }

      ctx.fillStyle = plumeGrad;
      ctx.beginPath();
      ctx.moveTo(-90, -10);
      ctx.lineTo(-90 - plumeLen, 0);
      ctx.lineTo(-90, 10);
      ctx.closePath();
      ctx.fill();

      // Shock Diamonds inside plume
      for (let i = 1; i <= 4; i++) {
        const dx = -90 - i * 18;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(dx, 0, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    // Top Right HUD
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(w - 240, 10, 230, 95);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(w - 240, 10, 230, 95);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('ТЕЛЕМЕТРИЯ СКОРОСТНОГО БПЛА:', w - 230, 26);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '10px monospace';
    ctx.fillText(`Число Маха: M = ${currentMach.toFixed(2)} (${currentSpeedMs.toFixed(0)} м/с)`, w - 230, 42);
    ctx.fillText(`Высота полета: ${currentAltitude.toFixed(2)} км`, w - 230, 56);
    ctx.fillText(`Динамич. напор q: ${dynamicPressureKpa.toFixed(1)} кПа`, w - 230, 70);
    ctx.fillText(`Темп-ра торможения T0: +${stagnationTempC.toFixed(0)} °C`, w - 230, 84);
    ctx.fillText(`Тяга ДУ: ${currentThrustKn.toFixed(1)} кН`, w - 230, 98);
  }, [
    currentMach,
    currentPitchDeg,
    currentAltitude,
    currentSpeedMs,
    dynamicPressureKpa,
    stagnationTempC,
    currentThrustKn,
    currentStage,
  ]);

  // Profile Data for Simulation Charts
  const trajectoryChartData = useMemo(() => {
    const pts = [];
    let t_sec = 0;
    let m = dropMach;
    let alt = dropAltitudeKm;

    while (t_sec <= 25) {
      if (t_sec < 1.2) {
        m = dropMach;
        alt = Math.max(0, alt - 0.05);
      } else if (t_sec < 1.2 + boosterBurnTimeS) {
        const frac = (t_sec - 1.2) / boosterBurnTimeS;
        m = dropMach + (2.4 - dropMach) * frac;
        alt += 0.8;
      } else {
        m = Math.min(ramjetTargetMach, m + 0.15);
        alt = Math.min(cruiseAltitudeKm, alt + 0.4);
      }

      const { soundSpeed, T } = getAtmosphere(alt);
      const t0_c = T * (1 + 0.2 * m * m) - 273.15;

      pts.push({
        time: `${t_sec.toFixed(0)}с`,
        Mach: parseFloat(m.toFixed(2)),
        AltitudeKm: parseFloat(alt.toFixed(1)),
        StagnationTempC: parseFloat(t0_c.toFixed(0)),
      });

      t_sec += 1.5;
    }
    return pts;
  }, [dropMach, dropAltitudeKm, boosterBurnTimeS, ramjetTargetMach, cruiseAltitudeKm]);

  return (
    <div className="space-y-6 text-slate-100 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-950 via-red-950 to-slate-900 border border-orange-500/30 p-6 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/30 ring-1 ring-white/20">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Воздушный Старт & Интегральный Ракетно-Прямоточный Двигатель (ИРПД)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 font-mono">
                  Air-Launch & Ramjet M=4.5
                </span>
              </h2>
              <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl">
                Моделирование отделения БПЛА от самолета-носителя, твердотопливного разгона (РДТТ), открытия
                воздухозаборника, запуска прямоточного контура (ПВРД), скачков уплотнения и аэротермодинамического
                нагрева (T₀ более +750 °C).
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 bg-slate-900/80 border border-orange-500/30 px-4 py-2 rounded-xl backdrop-blur-md">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Текущий Режим</div>
              <div className="text-sm font-black text-orange-400 uppercase">
                {currentStage === 'carrier_drop' && '1. Сброс с Носителя'}
                {currentStage === 'rocket_boost' && '2. Разгон РДТТ'}
                {currentStage === 'ramjet_transition' && '3. Запуск ПВРД'}
                {currentStage === 'ramjet_cruise' && '4. Маршевый Полет M>3'}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Пройденная Дистанция</div>
              <div className="text-base font-black text-emerald-400">{currentDistance.toFixed(1)} км</div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Grid: Canvas Stage & Sliders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Canvas Visualization (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-bold text-slate-200">
                Газодинамика Входного Диффузора, Скачки Уплотнения & Струя ДУ
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isRunning
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                }`}
              >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isRunning ? 'Пауза' : 'Пуск'}</span>
              </button>
              <button
                onClick={handleReset}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Сброс на начальный сброс"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-orange-900/40 bg-slate-950 flex items-center justify-center">
            <canvas ref={canvasRef} width={580} height={300} className="w-full h-auto max-h-[340px] block" />
          </div>

          {/* Engine Status Grid */}
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Состояние Воздухозаборника</div>
              <div className="text-xs font-black text-orange-300 mt-0.5 line-clamp-1">{inletShockStatus}</div>
              <div className="text-[9px] text-slate-400 mt-1">
                {currentMach >= 1.8 ? '✓ Сверхзвуковое сжатие' : 'Дозвуковой сброс'}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Температура Обшивки T0</div>
              <div className={`text-sm font-black mt-0.5 ${stagnationTempC > 600 ? 'text-rose-400' : 'text-amber-400'}`}>
                +{stagnationTempC.toFixed(0)} °C ({stagnationTempK.toFixed(0)} K)
              </div>
              <div className="text-[9px] text-slate-400 mt-1">Тепловой поток: {totalHeatFluxKwM2.toFixed(0)} кВт/м²</div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Удельный Импульс Isp</div>
              <div className="text-sm font-black text-emerald-400 mt-0.5">
                {currentStage === 'rocket_boost' ? '265 с (РДТТ)' : currentStage === 'ramjet_cruise' ? '1250 с (ПВРД)' : '0 с'}
              </div>
              <div className="text-[9px] text-slate-400 mt-1">Экономия топлива: {currentStage === 'ramjet_cruise' ? '4.7x' : '1.0x'}</div>
            </div>
          </div>
        </div>

        {/* Right: Flight Parameters Sliders (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-bold text-white">Параметры Старта & Силовой Установки</h3>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Drop Altitude */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Высота сброса с носителя (H_drop):</span>
                <span className="font-mono text-orange-400 font-bold">{dropAltitudeKm.toFixed(1)} км</span>
              </div>
              <input
                type="range"
                min={8.0}
                max={15.0}
                step={0.5}
                value={dropAltitudeKm}
                onChange={(e) => setDropAltitudeKm(parseFloat(e.target.value))}
                className="w-full accent-orange-400 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Booster Thrust */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Тяга стартового ускорителя РДТТ:</span>
                <span className="font-mono text-red-400 font-bold">{boosterThrustKn} кН</span>
              </div>
              <input
                type="range"
                min={30}
                max={120}
                step={5}
                value={boosterThrustKn}
                onChange={(e) => setBoosterThrustKn(parseInt(e.target.value, 10))}
                className="w-full accent-red-400 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Booster Burn Time */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Время работы РДТТ разгона:</span>
                <span className="font-mono text-amber-400 font-bold">{boosterBurnTimeS.toFixed(1)} с</span>
              </div>
              <input
                type="range"
                min={3.0}
                max={8.0}
                step={0.5}
                value={boosterBurnTimeS}
                onChange={(e) => setBoosterBurnTimeS(parseFloat(e.target.value))}
                className="w-full accent-amber-400 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Ramjet Target Mach */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Целевое число Маха ПВРД (M_cruise):</span>
                <span className="font-mono text-cyan-400 font-bold">M = {ramjetTargetMach.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={2.8}
                max={5.0}
                step={0.1}
                value={ramjetTargetMach}
                onChange={(e) => setRamjetTargetMach(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Cruise Altitude */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Эшелон маршевого полета:</span>
                <span className="font-mono text-emerald-400 font-bold">{cruiseAltitudeKm.toFixed(1)} км</span>
              </div>
              <input
                type="range"
                min={16.0}
                max={28.0}
                step={1.0}
                value={cruiseAltitudeKm}
                onChange={(e) => setCruiseAltitudeKm(parseFloat(e.target.value))}
                className="w-full accent-emerald-400 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <div className="p-3 bg-orange-950/40 border border-orange-800/50 rounded-xl text-[11px] text-orange-200/90 leading-relaxed">
            <span className="font-bold text-orange-300">🚀 Преимущество ИРПД:</span> Интеграция твердотопливного
            заряда внутри камеры сгорания прямоточного двигателя позволяет избавиться от массивных внешних ступеней.
            После разгона до $M \ge 2.2$ сопло РДТТ отстреливается, и двигатель работает как прямоточный воздушно-реактивный.
          </div>
        </div>
      </div>

      {/* Chart: Altitude & Mach Profile vs Flight Time */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-bold text-white">
              Траекторный Профиль Полета: Скорость Маха, Высота & Нагрев Обшивки
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">H_drop: {dropAltitudeKm} км → H_cruise: {cruiseAltitudeKm} км</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trajectoryChartData}>
              <defs>
                <linearGradient id="colorMach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Area
                type="monotone"
                dataKey="Mach"
                name="Число Маха (M)"
                stroke="#f97316"
                fillOpacity={1}
                fill="url(#colorMach)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="AltitudeKm"
                name="Высота (км)"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="StagnationTempC"
                name="Температура торможения (°C)"
                stroke="#f43f5e"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
