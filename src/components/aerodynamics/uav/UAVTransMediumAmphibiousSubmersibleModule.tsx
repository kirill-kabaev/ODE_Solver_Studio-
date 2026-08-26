import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Waves,
  Plane,
  Compass,
  RotateCcw,
  Sliders,
  Play,
  Pause,
  Activity,
  Zap,
  Layers,
  Wind,
  Shield,
  Gauge,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Anchor,
  Droplets,
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
import { MathText } from '../../MathView';

export type FlightMediumType = 'air_flight' | 'water_entry' | 'underwater_cruise' | 'surfacing_leap';

export const UAVTransMediumAmphibiousSubmersibleModule: React.FC = () => {
  // Operational State
  const [currentMedium, setCurrentMedium] = useState<FlightMediumType>('underwater_cruise');
  const [depth_m, setDepth_m] = useState<number>(3.5); // 0 to 25 m
  const [underwaterSpeed_kts, setUnderwaterSpeed_kts] = useState<number>(4.2); // 0 to 12 knots
  const [propPitchMode, setPropPitchMode] = useState<'air_mode' | 'water_mode'>('water_mode');
  const [ballastFill_pct, setBallastFill_pct] = useState<number>(65); // 0 to 100%
  const [hasSupercavitationNose, setHasSupercavitationNose] = useState<boolean>(true);

  // Animation State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Hydrodynamic & Aerodynamic Physics
  const hydro = useMemo(() => {
    const rhoAir = 1.225;
    const rhoWater = 1025; // Seawater kg/m^3
    const droneVolume_m3 = 0.0078; // 7.8 liters displacement
    const dryMass_kg = 7.2;

    // Ballast water mass
    const maxBallastMass_kg = 1.6;
    const currentBallastMass_kg = (ballastFill_pct / 100) * maxBallastMass_kg;
    const totalMass_kg = dryMass_kg + currentBallastMass_kg;

    // Buoyancy force (Archimedes)
    const buoyancyForce_N = rhoWater * 9.81 * droneVolume_m3;
    const netVerticalBuoyancy_N = buoyancyForce_N - (totalMass_kg * 9.81);

    // Hydrostatic Pressure at depth
    const hydrostaticPressure_kPa = (101.3 + (rhoWater * 9.81 * depth_m) / 1000);

    // Underwater Drag: Speed in m/s
    const vWater_ms = underwaterSpeed_kts * 0.514444;
    const frontalArea_m2 = 0.024;
    let cdWater = 0.18; // Streamlined torpedo-fuselage

    // Supercavitation cavitation number: sigma = (P_inf - P_vap) / (0.5 * rho * V^2)
    const pInf = hydrostaticPressure_kPa * 1000;
    const pVapor = 2340; // Pa
    const dynPress = 0.5 * rhoWater * (vWater_ms ** 2);
    const cavitationNumber = dynPress > 0 ? (pInf - pVapor) / dynPress : 999;

    if (hasSupercavitationNose && vWater_ms > 3.0) {
      cdWater *= 0.35; // Skin friction bypassed by vapor bubble sheath
    }

    const hydroDrag_N = 0.5 * rhoWater * (vWater_ms ** 2) * frontalArea_m2 * cdWater;
    const hydroThrustRequired_N = hydroDrag_N;

    // Variable Pitch Propeller RPM and Torque in water vs air
    const propRPM = propPitchMode === 'water_mode' ? 850 : 6400;
    const propTorque_Nm = propPitchMode === 'water_mode' ? 2.8 : 0.45;
    const motorPower_W = (propTorque_Nm * (propRPM * 2 * Math.PI)) / 60;

    // Water Entry Impact (Slamming pressure) at 12 m/s dive
    const vEntry_ms = 12.0;
    const slammingPressure_MPa = (0.5 * 3.14 * rhoWater * (vEntry_ms ** 2)) / 1e6;

    return {
      totalMass_kg: totalMass_kg.toFixed(2),
      buoyancyForce_N: buoyancyForce_N.toFixed(1),
      netVerticalBuoyancy_N: netVerticalBuoyancy_N.toFixed(1),
      hydrostaticPressure_kPa: hydrostaticPressure_kPa.toFixed(1),
      cavitationNumber: cavitationNumber < 50 ? cavitationNumber.toFixed(2) : '> 50',
      hydroDrag_N: hydroDrag_N.toFixed(1),
      motorPower_W: motorPower_W.toFixed(0),
      slammingPressure_MPa: slammingPressure_MPa.toFixed(2),
      propRPM,
      isBuoyant: netVerticalBuoyancy_N > 0,
      isSupercavitating: hasSupercavitationNose && cavitationNumber < 1.2,
    };
  }, [depth_m, underwaterSpeed_kts, propPitchMode, ballastFill_pct, hasSupercavitationNose]);

  // Depth vs Pressure & Drag Chart
  const depthChartData = useMemo(() => {
    const list = [];
    for (let d = 0; d <= 25; d += 2.5) {
      const p = 101.3 + (1025 * 9.81 * d) / 1000;
      const drag = 0.5 * 1025 * ((3 * 0.5144) ** 2) * 0.024 * (hasSupercavitationNose ? 0.065 : 0.18);
      list.push({
        depth: d,
        pressure_kPa: Number(p.toFixed(1)),
        hullStress_MPa: Number((p * 0.08).toFixed(2)),
      });
    }
    return list;
  }, [hasSupercavitationNose]);

  // Visual Animation (Air-Water Trans-Medium view)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let t = 0;

    const render = () => {
      t += 0.04;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Waterline Y position
      const waterLineY = h * 0.38;

      // 1. Sky Area (Top)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, waterLineY);
      skyGrad.addColorStop(0, '#090d16');
      skyGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, waterLineY);

      // 2. Ocean Water Area (Bottom)
      const waterGrad = ctx.createLinearGradient(0, waterLineY, 0, h);
      waterGrad.addColorStop(0, '#0369a1');
      waterGrad.addColorStop(0.3, '#0c4a6e');
      waterGrad.addColorStop(1, '#022c43');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, waterLineY, w, h - waterLineY);

      // Animated Water Surface Waves
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, waterLineY);
      for (let x = 0; x <= w; x += 10) {
        const waveY = waterLineY + Math.sin(x * 0.03 + t * 3) * 3.5;
        ctx.lineTo(x, waveY);
      }
      ctx.stroke();

      // Drone Position & Swimming
      const droneX = (w * 0.45) + Math.sin(t * 0.8) * 15;
      const droneY = waterLineY + 30 + (depth_m * 6) + Math.sin(t * 1.5) * 4;

      // Draw Trans-Medium Drone (Submersible Airframe)
      ctx.save();
      ctx.translate(droneX, droneY);

      // Supercavitation bubble sheath (if active)
      if (hydro.isSupercavitating) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 65, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Torpedo-Wing Body
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.ellipse(0, 0, 48, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Supercavitation Cavitator Disk at Nose
      if (hasSupercavitationNose) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-50, -4, 4, 8);
      }

      // Foldable Hydro/Aero Wings
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, -12);
      ctx.lineTo(25, -34);
      ctx.lineTo(35, -30);
      ctx.lineTo(15, -12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-10, 12);
      ctx.lineTo(25, 34);
      ctx.lineTo(35, 30);
      ctx.lineTo(15, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Rear Variable Pitch Propeller
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.8)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(49, 0, 4, 18 + Math.sin(t * 12) * 2, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();

      // Underwater Streamlines & Bubbles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      for (let i = 0; i < 8; i++) {
        const bx = (droneX + 50 + ((t * 60 + i * 40) % 200));
        const by = droneY + Math.sin(bx * 0.05 + i) * 12;
        if (by > waterLineY + 5) {
          ctx.beginPath();
          ctx.arc(bx, by, 1.5 + (i % 3), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animFrame);
  }, [depth_m, hydro.isSupercavitating, hasSupercavitationNose]);

  return (
    <div className="space-y-5 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/30 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
            <Waves className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Транссредовые БПЛА-Амфибии & Суперкавитация (Trans-Medium Flying Submersible)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Фича #100
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Моделирование скачка плотности воздух-вода (&rho;_water / &rho;_air &approx; 816), расчет гидродинамического сопротивления, суперкавитационной каверны и винтов переменного шага.
            </p>
          </div>
        </div>

        {/* Medium Selector Mode */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => {
              setCurrentMedium('air_flight');
              setPropPitchMode('air_mode');
              setDepth_m(0);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              currentMedium === 'air_flight'
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Полет в воздухе
          </button>
          <button
            type="button"
            onClick={() => {
              setCurrentMedium('underwater_cruise');
              setPropPitchMode('water_mode');
              setDepth_m(4.0);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              currentMedium === 'underwater_cruise'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Подводный ход
          </button>
        </div>
      </div>

      {/* Main Grid: Visual Animation Canvas & Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start font-mono">
        {/* Left Visual Canvas (7 cols) */}
        <div className="lg:col-span-7 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-cyan-300 font-bold">
              <Droplets className="w-4 h-4 text-cyan-400" />
              <span>Динамический Транссредовый Разрез «Воздух — Поверхность — Глубина»</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Глубина: {depth_m} м | Скорость: {underwaterSpeed_kts} узлов
            </span>
          </div>

          <div className="w-full h-72 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 relative">
            <canvas ref={canvasRef} width={640} height={300} className="w-full h-full object-cover" />
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-sans space-y-1">
            <div className="font-bold text-cyan-300 font-mono">📐 Формула числа кавитации и гидростатического давления:</div>
            <MathText text="\sigma = \frac{P_\infty - P_v}{\frac{1}{2}\rho_{\text{water}} V^2}, \quad P_{\text{total}} = P_{\text{atm}} + \rho g h, \quad F_{\text{net}} = \rho_{\text{water}} g V_{\text{disp}} - m_{\text{total}} g" />
          </div>
        </div>

        {/* Right Sliders & Controls (5 cols) */}
        <div className="lg:col-span-5 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Параметры Погружения</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
              TRANS-MEDIUM 2026
            </span>
          </div>

          {/* Depth Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Глубина погружения:</span>
              <span className="text-cyan-400 font-bold">{depth_m} м</span>
            </div>
            <input
              type="range"
              min={0}
              max={25}
              step={0.5}
              value={depth_m}
              onChange={(e) => setDepth_m(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Underwater Speed Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Подводная скорость:</span>
              <span className="text-emerald-400 font-bold">{underwaterSpeed_kts} узлов</span>
            </div>
            <input
              type="range"
              min={0}
              max={12}
              step={0.5}
              value={underwaterSpeed_kts}
              onChange={(e) => setUnderwaterSpeed_kts(parseFloat(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>

          {/* Ballast Fill Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Заполнение балластной цистерны:</span>
              <span className="text-amber-400 font-bold">{ballastFill_pct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={ballastFill_pct}
              onChange={(e) => setBallastFill_pct(parseInt(e.target.value, 10))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Supercavitation Nose Cone Toggle */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-300">Суперкавитационный носовой кавитатор:</div>
            <button
              type="button"
              onClick={() => setHasSupercavitationNose(!hasSupercavitationNose)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                hasSupercavitationNose
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              {hasSupercavitationNose ? 'АКТИВЕН (-65% C_D)' : 'ОБЫЧНЫЙ ОБТЕКАТЕЛЬ'}
            </button>
          </div>
        </div>
      </div>

      {/* Numerical Metrics Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400">Сила Архимеда (F_b):</span>
          <div className="text-sm font-bold text-cyan-300">{hydro.buoyancyForce_N} Н</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400">Плавучесть (F_net):</span>
          <div className={`text-sm font-bold ${hydro.isBuoyant ? 'text-emerald-400' : 'text-amber-400'}`}>
            {hydro.netVerticalBuoyancy_N} Н
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400">Гидростатич. давление:</span>
          <div className="text-sm font-bold text-white">{hydro.hydrostaticPressure_kPa} кПа</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400">Число кавитации (&sigma;):</span>
          <div className="text-sm font-bold text-amber-400">{hydro.cavitationNumber}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400">Гидродинамич. тяга:</span>
          <div className="text-sm font-bold text-cyan-400">{hydro.hydroDrag_N} Н</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400">Удар при приводнении:</span>
          <div className="text-sm font-bold text-emerald-400">{hydro.slammingPressure_MPa} МПа</div>
        </div>
      </div>

      {/* Depth Profile Chart */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-cyan-300 font-bold">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span>Профиль Гидростатического Давления [кПа] и Напряжения в Корпусе [МПа] от Глубины [м]</span>
          </div>
          <span className="text-[11px] text-slate-400">Титаново-композитный гермокорпус (1.8 МПа предел)</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={depthChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="depth" stroke="#64748b" fontSize={10} unit="m" />
              <YAxis yAxisId="left" stroke="#38bdf8" fontSize={10} unit="kPa" />
              <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={10} unit="MPa" />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line yAxisId="left" type="monotone" dataKey="pressure_kPa" stroke="#38bdf8" strokeWidth={2} name="Давление P (кПа)" dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="hullStress_MPa" stroke="#f59e0b" strokeWidth={2} name="Напряжение гермокорпуса (МПа)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
