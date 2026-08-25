// ============================================================================
// General Aviation & Biplanes ("Кукурузник" / An-2 / STOL Aerodynamics)
// Mathematical Modeling: Biplane Interference (Prandtl-Munk Theory), Slot Flaps,
// STOL Performance, Low-Speed Stall Margin & Agricultural Spray Aerodynamics
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Plane,
  Wind,
  Layers,
  Compass,
  Activity,
  Sliders,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Shield,
  TrendingUp,
  Zap,
  Leaf,
  Navigation,
  Fuel,
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
import { FullscreenGraphButton } from '../../telemetry/FullscreenGraphButton';

export type RunwaySurfaceType = 'asphalt' | 'dry_grass' | 'wet_grass' | 'soft_dirt_mud' | 'snow_packed';

export const RUNWAY_SURFACES: Record<RunwaySurfaceType, { name: string; frictionCoeff: number; maxRecommendedWeightKg: number }> = {
  asphalt: { name: 'Бетон / Асфальт (Идеальное покрытие)', frictionCoeff: 0.03, maxRecommendedWeightKg: 5500 },
  dry_grass: { name: 'Сухой плотный грунт / Трава (Типовой аэродром)', frictionCoeff: 0.06, maxRecommendedWeightKg: 5500 },
  wet_grass: { name: 'Влажный грунт / Мокрая трава', frictionCoeff: 0.10, maxRecommendedWeightKg: 5200 },
  soft_dirt_mud: { name: 'Размокшая пашня / Мягкий грунт (Весенняя распутица)', frictionCoeff: 0.18, maxRecommendedWeightKg: 4700 },
  snow_packed: { name: 'Укатанный снег (Лыжное шасси)', frictionCoeff: 0.05, maxRecommendedWeightKg: 5200 },
};

export const BiplaneAn2Module: React.FC = () => {
  // Flight & Aircraft Parameters
  const [takeoffWeightKg, setTakeoffWeightKg] = useState<number>(4700); // 3500 to 5500 kg (An-2 max MTOW 5500 kg)
  const [enginePowerHp, setEnginePowerHp] = useState<number>(1000); // Shvetsov ASh-62IR radial engine (1000 hp)
  const [runwaySurface, setRunwaySurface] = useState<RunwaySurfaceType>('dry_grass');
  const [headwindSpeedMs, setHeadwindSpeedMs] = useState<number>(3); // 0 to 15 m/s headwind
  const [flapsSettingDeg, setFlapsSettingDeg] = useState<number>(30); // 0, 15, 30, 40 deg (droop ailerons + flaps)
  const [slatsDeployed, setSlatsDeployed] = useState<boolean>(true); // Handley-Page automatic leading edge slats
  const [biplaneGapRatio, setBiplaneGapRatio] = useState<number>(0.92); // Gap/Chord ratio (h/b ~ 0.9 - 1.1)
  const [agriculturalPayloadKg, setAgriculturalPayloadKg] = useState<number>(1200); // Chemical hopper payload

  // An-2 Constants
  const wingAreaTotalM2 = 71.52; // Upper (43.55 m2) + Lower (27.97 m2)
  const upperWingSpanM = 18.17;
  const lowerWingSpanM = 14.23;
  const airDensityRho = 1.225;

  // Aerodynamic & Flight Calculations
  const calculations = useMemo(() => {
    // 1. Biplane Munk Factor (sigma) for Induced Drag
    const munkInterferenceSigma = Math.max(0.15, (1 - 0.55 * biplaneGapRatio) / (1 + 0.8 * biplaneGapRatio));
    const biplaneInducedDragFactor = (1 + munkInterferenceSigma) / 2;

    // 2. Maximum Lift Coefficient (CLmax)
    let clMax = 1.6; // Base clean biplane
    if (flapsSettingDeg === 15) clMax += 0.45;
    if (flapsSettingDeg >= 30) clMax += 0.85;
    if (flapsSettingDeg >= 40) clMax += 1.05;
    if (slatsDeployed) clMax += 0.4; // Automatic slats delay stall to alpha = 28-30 deg!

    // 3. Stall Speed (Vs0)
    const weightNewtons = takeoffWeightKg * 9.81;
    const vs0Ms = Math.sqrt((2 * weightNewtons) / (airDensityRho * wingAreaTotalM2 * clMax));
    const vs0Kmh = vs0Ms * 3.6;

    // 4. Takeoff Ground Roll Distance (S_to)
    const groundFrictionMu = RUNWAY_SURFACES[runwaySurface].frictionCoeff;
    const staticThrustN = enginePowerHp * 22; // ~22 N per hp for large 3.6m 4-blade AV-2 propeller
    const avgThrustN = staticThrustN * 0.85;
    const frictionForceN = groundFrictionMu * weightNewtons;
    const effectiveThrustN = Math.max(2000, avgThrustN - frictionForceN);

    const vLiftOffMs = Math.max(10, (vs0Ms * 1.15) - headwindSpeedMs);
    const avgAccelMs2 = effectiveThrustN / takeoffWeightKg;
    const takeoffGroundRollM = (vLiftOffMs * vLiftOffMs) / (2 * avgAccelMs2);
    const landingGroundRollM = takeoffGroundRollM * 0.75;

    // 5. Parachuting / Deep Stall descent rate at alpha = 35 deg
    const parachutingSinkRateMs = Math.sqrt((2 * weightNewtons) / (airDensityRho * wingAreaTotalM2 * 1.85));

    // 6. Lift vs Angle of Attack Curve
    const liftCurveData: { alphaDeg: number; clBiplane: number; clMonoplaneRef: number }[] = [];
    for (let a = -4; a <= 36; a += 2) {
      let cl = 0;
      if (a < 16) {
        cl = 0.35 + a * 0.085;
      } else if (a <= (slatsDeployed ? 30 : 20)) {
        cl = (slatsDeployed ? 0.35 + 16 * 0.085 + (a - 16) * 0.055 : 0.35 + 16 * 0.085 - (a - 16) * 0.04);
      } else {
        cl = Math.max(0.9, 2.2 - (a - 30) * 0.04);
      }
      if (flapsSettingDeg > 0) {
        cl += (flapsSettingDeg / 40) * 0.7;
      }

      let clMono = a < 16 ? 0.3 + a * 0.09 : Math.max(0.4, 0.3 + 16 * 0.09 - (a - 16) * 0.09);
      liftCurveData.push({
        alphaDeg: a,
        clBiplane: Math.round(cl * 100) / 100,
        clMonoplaneRef: Math.round(clMono * 100) / 100,
      });
    }

    // 7. Ground Roll vs Takeoff Weight
    const weightRollCurve: { weightKg: number; groundRollM: number }[] = [];
    for (let w = 3500; w <= 5500; w += 250) {
      const wN = w * 9.81;
      const vsMs = Math.sqrt((2 * wN) / (airDensityRho * wingAreaTotalM2 * clMax));
      const vLoMs = Math.max(8, (vsMs * 1.15) - headwindSpeedMs);
      const accMs2 = Math.max(0.5, (avgThrustN - groundFrictionMu * wN) / w);
      const rollM = (vLoMs * vLoMs) / (2 * accMs2);
      weightRollCurve.push({
        weightKg: w,
        groundRollM: Math.round(rollM),
      });
    }

    return {
      munkInterferenceSigma: Math.round(munkInterferenceSigma * 1000) / 1000,
      biplaneInducedDragFactor: Math.round(biplaneInducedDragFactor * 1000) / 1000,
      clMax: Math.round(clMax * 100) / 100,
      vs0Kmh: Math.round(vs0Kmh * 10) / 10,
      vs0Ms: Math.round(vs0Ms * 10) / 10,
      takeoffGroundRollM: Math.round(takeoffGroundRollM),
      landingGroundRollM: Math.round(landingGroundRollM),
      parachutingSinkRateMs: Math.round(parachutingSinkRateMs * 10) / 10,
      staticThrustKgf: Math.round(staticThrustN / 9.81),
      liftCurveData,
      weightRollCurve,
    };
  }, [
    takeoffWeightKg,
    enginePowerHp,
    runwaySurface,
    headwindSpeedMs,
    flapsSettingDeg,
    slatsDeployed,
    biplaneGapRatio,
  ]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 border border-amber-800/60 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden text-slate-100 font-mono">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 via-yellow-600 to-amber-700 text-slate-950 shadow-lg shadow-amber-500/20 border border-amber-400/40">
                <Plane className="w-6 h-6 font-black" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <span>Малая Авиация / «Кукурузник» (Ан-2 & Бипланы STOL)</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700">
                    STOL & Biplane
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Аэродинамика бипланной коробки (теория Прандтля — Мюнка), автоматические предкрылки, безаварийное парашютирование и взлет с неподготовленных грунтовых полос
                </p>
              </div>
            </div>
          </div>

          {/* Key Safety Badge */}
          <div className="px-4 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 bg-emerald-950/90 text-emerald-300 border-emerald-600/60">
            <Shield className="w-4 h-4 text-emerald-400" />
            <div>
              <div>УСТОЙЧИВ К ШТОПОРУ</div>
              <div className="text-[10px] opacity-80 font-normal">
                Парашютирование при углу атаки &gt; 30° (Vy ≈ {calculations.parachutingSinkRateMs} м/с)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Скорость Сваливания (Vs0)</span>
            <Wind className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {calculations.vs0Kmh} <span className="text-xs text-slate-400">км/ч</span>
          </div>
          <div className="text-[10px] text-slate-500">{calculations.vs0Ms} м/с (Сверхмалая скорость)</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Длина Разбега (S разбег)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {calculations.takeoffGroundRollM} <span className="text-xs text-slate-400">м</span>
          </div>
          <div className="text-[10px] text-slate-500">Покрытие: {RUNWAY_SURFACES[runwaySurface].name.split('(')[0]}</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Длина Пробега (S пробег)</span>
            <Navigation className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            {calculations.landingGroundRollM} <span className="text-xs text-slate-400">м</span>
          </div>
          <div className="text-[10px] text-slate-500">Торможение на грунте</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Макс. CL,max Крыла</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {calculations.clMax}
          </div>
          <div className="text-[10px] text-slate-500">Закрылки {flapsSettingDeg}° + Предкрылки</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Интерференция Мюнка (sigma)</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">
            {calculations.munkInterferenceSigma}
          </div>
          <div className="text-[10px] text-slate-500">Фактор CDi: {calculations.biplaneInducedDragFactor}</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Тяга ВМГ на Стопе</span>
            <Zap className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">
            {calculations.staticThrustKgf} <span className="text-xs text-slate-400">кгс</span>
          </div>
          <div className="text-[10px] text-slate-500">Винт АВ-2 (Диаметр 3.6 м)</div>
        </div>
      </div>

      {/* Control Panel & Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs text-slate-300">
        {/* Left Column: Sliders & Controls */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-amber-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              Конфигурация Ан-2 & Полоса
            </span>
            <button
              type="button"
              onClick={() => {
                setTakeoffWeightKg(4700);
                setFlapsSettingDeg(30);
                setSlatsDeployed(true);
                setHeadwindSpeedMs(3);
                setRunwaySurface('dry_grass');
              }}
              className="text-[10px] text-slate-500 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Сброс
            </button>
          </div>

          {/* Runway Surface Selection */}
          <div className="space-y-2">
            <span className="text-slate-400 font-bold block text-[11px] text-amber-300">
              Состояние взлетно-посадочной полосы:
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {(Object.keys(RUNWAY_SURFACES) as RunwaySurfaceType[]).map((rKey) => {
                const r = RUNWAY_SURFACES[rKey];
                return (
                  <button
                    key={rKey}
                    type="button"
                    onClick={() => setRunwaySurface(rKey)}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                      runwaySurface === rKey
                        ? 'bg-amber-950/80 border-amber-400 text-white font-bold'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{r.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-slate-800">
                      μ = {r.frictionCoeff}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Взлетная масса (M взлет):</span>
                <span className="text-amber-400 font-bold">{takeoffWeightKg} кг</span>
              </div>
              <input
                type="range"
                min={3300}
                max={5500}
                step={50}
                value={takeoffWeightKg}
                onChange={(e) => setTakeoffWeightKg(parseInt(e.target.value, 10))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Выпуск закрылков (дельта закр):</span>
                <span className="text-cyan-400 font-bold">{flapsSettingDeg}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                step={5}
                value={flapsSettingDeg}
                onChange={(e) => setFlapsSettingDeg(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Встречный ветер (W вет):</span>
                <span className="text-teal-400 font-bold">{headwindSpeedMs} м/с ({(headwindSpeedMs * 3.6).toFixed(0)} км/ч)</span>
              </div>
              <input
                type="range"
                min={0}
                max={15}
                step={1}
                value={headwindSpeedMs}
                onChange={(e) => setHeadwindSpeedMs(parseInt(e.target.value, 10))}
                className="w-full accent-teal-400 cursor-pointer"
              />
            </div>

            {/* Slat toggle */}
            <div className="pt-2 border-t border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-[11px] text-emerald-300 font-bold">
                <input
                  type="checkbox"
                  checked={slatsDeployed}
                  onChange={(e) => setSlatsDeployed(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <span>Автоматические предкрылки Хэндли-Пейджа (Задержка срыва до 30°)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Graphs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart 1: Lift Coefficient vs Alpha with Parachuting Region */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span>Поляра Подъемной Силы (CL vs Alpha) & Бессрывной Режим</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Сравнение бипланной коробки Ан-2 со сплошной предкрылочной механизацией против классического моноплана.
                </p>
              </div>
            </div>

            <div className="relative h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calculations.liftCurveData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="alphaDeg" stroke="#64748b" label={{ value: 'Угол атаки alpha (°)', position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }} />
                  <YAxis domain={[-0.5, 3.2]} stroke="#94a3b8" label={{ value: 'Коэффициент CL', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="clBiplane"
                    name="Ан-2 (Биплан + Предкрылки)"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="clMonoplaneRef"
                    name="Обычный моноплан (Срыв при 16°)"
                    stroke="#64748b"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <FullscreenGraphButton
                domain="3d_aero_studio"
                label="Во весь экран"
                subLabel="Поляра Ан-2"
              />
            </div>
          </div>

          {/* Chart 2: Takeoff Ground Roll vs Weight */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Длина Разбега (S разбег) в Зависимости от Взлетного Веса</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Показывает сохранение взлетных качеств STOL даже при максимальной загрузке химикатами / пассажирами.
                </p>
              </div>
            </div>

            <div className="relative h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={calculations.weightRollCurve} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="weightKg" stroke="#64748b" label={{ value: 'Масса (кг)', position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }} />
                  <YAxis domain={[50, 300]} stroke="#94a3b8" label={{ value: 'Длина разбега (м)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem' }}
                    formatter={(val: any) => [`${val} м`, 'Разбег']}
                  />
                  <Area
                    type="monotone"
                    dataKey="groundRollM"
                    name="Длина разбега (м)"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.25}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <FullscreenGraphButton
                domain="3d_aero_studio"
                label="Во весь экран"
                subLabel="Разбег STOL"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
