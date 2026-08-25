import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Shield,
  Flame,
  Activity,
  Sliders,
  RotateCcw,
  Zap,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  RefreshCw,
  Info,
  Radio,
  TrendingDown,
} from 'lucide-react';

export interface TPSLayer {
  name: string;
  thickMm: number;
  k_W_mK: number; // Thermal conductivity
  density_kg_m3: number;
  cp_J_kgK: number;
  maxTempC: number;
}

export const HypersonicHeatShieldStudio: React.FC = () => {
  // Re-entry trajectory inputs
  const [entryVelocityKmS, setEntryVelocityKmS] = useState<number>(7.8); // 7.8 km/s (LEO) to 11.2 km/s (Moon)
  const [entryAngleDeg, setEntryAngleDeg] = useState<number>(5.5); // 1.5 to 8.0 deg (Flight path angle gamma)
  const [noseRadiusM, setNoseRadiusM] = useState<number>(1.8); // Blunt nose radius Rn (0.5 to 3.5 m)
  const [capsuleMassKg, setCapsuleMassKg] = useState<number>(5500); // 1000 to 10000 kg
  const [tpsType, setTpsType] = useState<'pica_x' | 'carbon_carbon' | 'silica_tiles'>('pica_x');
  const [heatShieldThickMm, setHeatShieldThickMm] = useState<number>(50); // 20 to 120 mm

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // TPS Thermal Properties
  const tpsConfig = useMemo(() => {
    if (tpsType === 'pica_x') {
      return {
        name: 'PICA-X (Фенол-Углеродная Абляционная Матрица)',
        k_W_mK: 0.08,
        density_kg_m3: 270,
        cp_J_kgK: 1600,
        maxTempC: 2800,
        ablationHeatMJ_kg: 32.0,
      };
    } else if (tpsType === 'carbon_carbon') {
      return {
        name: 'RCC Углерод-Углерод (Многоразовый Спейс Шаттл)',
        k_W_mK: 4.5,
        density_kg_m3: 1600,
        cp_J_kgK: 1200,
        maxTempC: 1900,
        ablationHeatMJ_kg: 15.0,
      };
    } else {
      return {
        name: 'LI-900 Кварцевая Керамическая Плитка (Буран/Шаттл)',
        k_W_mK: 0.048,
        density_kg_m3: 144,
        cp_J_kgK: 1250,
        maxTempC: 1450,
        ablationHeatMJ_kg: 8.0,
      };
    }
  }, [tpsType]);

  // Dynamic Re-entry Trajectory Integration (Allen-Eggers & Fay-Riddell)
  const trajectoryResults = useMemo(() => {
    const g0 = 9.80665;
    const Cd = 1.35; // Blunt capsule drag coefficient
    const S_ref = Math.PI * Math.pow(noseRadiusM, 2);
    const m = capsuleMassKg;
    const v0 = entryVelocityKmS * 1000;
    const gamma0 = (entryAngleDeg * Math.PI) / 180;

    const dt = 0.5;
    const totalTime = 400; // seconds

    let t = 0;
    let h = 120000; // start at 120 km
    let v = v0;
    let gamma = gamma0;

    const timePoints: number[] = [];
    const altKmPoints: number[] = [];
    const velocityKmSPoints: number[] = [];
    const gLoadPoints: number[] = [];
    const heatFluxMW_m2Points: number[] = [];
    const surfaceTempCPoints: number[] = [];
    const plasmaDensityPoints: number[] = [];

    let peakHeatFluxMW_m2 = 0;
    let peakHeatTimeSec = 0;
    let peakHeatAltKm = 0;
    let maxGLoad = 0;
    let totalHeatMJ_m2 = 0;
    let maxSurfaceTempC = 0;

    while (h > 5000 && t < totalTime) {
      // Atmospheric density exponential model
      const H_scale = 7200; // scale height meters
      const rho0 = 1.225;
      const rho = rho0 * Math.exp(-h / H_scale);

      // Aerodynamic Drag & G-load
      const q_dyn = 0.5 * rho * v * v;
      const dragN = q_dyn * Cd * S_ref;
      const decelM_s2 = dragN / m;
      const gLoad = decelM_s2 / g0;

      // Fay-Riddell Stagnation Heat Flux (Convective)
      // q_dot = (1.83e-4 / sqrt(Rn)) * sqrt(rho / rho0) * (v / 1000)^3 [MW/m2]
      const K_fr = 1.7415e-4;
      const q_stag_MW_m2 = (K_fr / Math.sqrt(Math.max(0.2, noseRadiusM))) * Math.sqrt(rho / rho0) * Math.pow(v / 1000, 3.15);

      // Radiative equilibrium surface temperature: q_dot = eps * sigma_SB * T^4
      const eps = 0.88;
      const sigma_SB = 5.670374e-8;
      const T_surf_K = Math.pow((q_stag_MW_m2 * 1e6) / (eps * sigma_SB), 0.25);
      const T_surf_C = T_surf_K - 273.15;

      // Plasma frequency & blackout (ionization)
      // Electron number density approx n_e ~ rho * v^3
      const plasmaFreqGHz = Math.min(25, 0.001 * Math.sqrt(rho * Math.pow(v, 3.2)));

      if (q_stag_MW_m2 > peakHeatFluxMW_m2) {
        peakHeatFluxMW_m2 = q_stag_MW_m2;
        peakHeatTimeSec = t;
        peakHeatAltKm = h / 1000;
      }
      if (gLoad > maxGLoad) maxGLoad = gLoad;
      if (T_surf_C > maxSurfaceTempC) maxSurfaceTempC = T_surf_C;

      totalHeatMJ_m2 += q_stag_MW_m2 * dt;

      timePoints.push(t);
      altKmPoints.push(h / 1000);
      velocityKmSPoints.push(v / 1000);
      gLoadPoints.push(gLoad);
      heatFluxMW_m2Points.push(q_stag_MW_m2);
      surfaceTempCPoints.push(T_surf_C);
      plasmaDensityPoints.push(plasmaFreqGHz);

      // Step Equations of Motion (Euler)
      const dh = -v * Math.sin(gamma) * dt;
      const dv = -decelM_s2 * dt + g0 * Math.sin(gamma) * dt;
      const dgamma = ((g0 - (v * v) / (6371000 + h)) * Math.cos(gamma) * dt) / v;

      h += dh;
      v = Math.max(50, v + dv);
      gamma += dgamma;
      t += dt;
    }

    // 1D Fourier Thermal Conduction through TPS Thickness
    const tpsThickM = heatShieldThickMm * 1e-3;
    const alpha = tpsConfig.k_W_mK / (tpsConfig.density_kg_m3 * tpsConfig.cp_J_kgK); // thermal diffusivity
    // Internal backface temperature estimate: T_inner = T0 + DeltaT_cond
    const tau_diff = (tpsThickM * tpsThickM) / (2 * alpha);
    const innerHullTempC = Math.min(350, 25 + (maxSurfaceTempC - 25) * Math.exp(-Math.sqrt(totalTime / Math.max(1, tau_diff))));
    const isInnerStructureSafe = innerHullTempC <= 175; // Standard aerospace limit +175 C

    // Estimated Ablation Mass Loss
    const ablationMassLossKg = (totalHeatMJ_m2 * 1e6 * S_ref) / (tpsConfig.ablationHeatMJ_kg * 1e6);

    return {
      peakHeatFluxMW_m2,
      peakHeatTimeSec,
      peakHeatAltKm,
      maxGLoad,
      totalHeatMJ_m2,
      maxSurfaceTempC,
      innerHullTempC,
      isInnerStructureSafe,
      ablationMassLossKg,
      timePoints,
      altKmPoints,
      velocityKmSPoints,
      gLoadPoints,
      heatFluxMW_m2Points,
      surfaceTempCPoints,
      plasmaDensityPoints,
    };
  }, [entryVelocityKmS, entryAngleDeg, noseRadiusM, capsuleMassKg, tpsConfig, heatShieldThickMm]);

  // 2D Capsule Shockwave & Thermal Gradient Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Background Sky/Space
    ctx.fillStyle = '#060911';
    ctx.fillRect(0, 0, width, height);

    const centerX = width * 0.58;
    const centerY = height * 0.5;

    // Glowing Hypersonic Shock Wave & Plasma Sheath
    const shockDist = 38;
    const shockGradient = ctx.createRadialGradient(
      centerX - shockDist - 15,
      centerY,
      5,
      centerX - shockDist,
      centerY,
      120
    );
    shockGradient.addColorStop(0, 'rgba(249, 115, 22, 0.85)');
    shockGradient.addColorStop(0.4, 'rgba(239, 68, 68, 0.45)');
    shockGradient.addColorStop(0.8, 'rgba(168, 85, 247, 0.2)');
    shockGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = shockGradient;
    ctx.beginPath();
    ctx.arc(centerX - shockDist, centerY, 130, Math.PI * 0.5, Math.PI * 1.5, false);
    ctx.fill();

    // Draw Detached Bow Shock Curve
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX - shockDist, centerY, 110, Math.PI * 0.55, Math.PI * 1.45, false);
    ctx.stroke();

    // Heat Shield (Front Blunt Spherical Segment)
    const shieldRadius = 95;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, shieldRadius, Math.PI * 0.65, Math.PI * 1.35, false);
    ctx.stroke();

    // Capsule Conical Afterbody
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, shieldRadius, Math.PI * 0.65, Math.PI * 1.35, false);
    ctx.lineTo(centerX + 110, centerY - 35);
    ctx.lineTo(centerX + 110, centerY + 35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Internal Pressure Hull (Cockpit Cabin)
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX + 25, centerY, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hot Air Plasma Flow Streamlines
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.6)';
    ctx.lineWidth = 1.5;
    for (let dy = -70; dy <= 70; dy += 25) {
      ctx.beginPath();
      ctx.moveTo(20, centerY + dy * 0.6);
      ctx.quadraticCurveTo(centerX - shockDist - 10, centerY + dy * 0.8, centerX + 120, centerY + dy * 1.4);
      ctx.stroke();
    }

    // HUD Text
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`T_front = ${trajectoryResults.maxSurfaceTempC.toFixed(0)} °C`, centerX - 110, centerY - 80);
    ctx.fillText(`T_cabin = ${trajectoryResults.innerHullTempC.toFixed(0)} °C`, centerX + 40, centerY + 5);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText(`Пик теплового потока: q_max = ${trajectoryResults.peakHeatFluxMW_m2.toFixed(2)} МВт/м²`, 15, 25);
    ctx.fillText(`Макс. перегрузка торможения: n_x = ${trajectoryResults.maxGLoad.toFixed(1)} g`, 15, 42);
    ctx.fillText(`Потеря массы аблятора: Δm = ${trajectoryResults.ablationMassLossKg.toFixed(1)} кг`, 15, 59);
  }, [trajectoryResults]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-orange-950/40 to-slate-900 border border-orange-500/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/40">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Аэротермодинамика Входа в Атмосферу & Теплозащитные Экраны (ТЗК)
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-orange-950 text-orange-300 border border-orange-700">
                  Fay-Riddell & Allen-Eggers Blunt Body
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Численное моделирование конвективного теплового потока q_stag, температурного градиента в плитках ТЗК, абляции и плазменного блэкаута.
              </p>
            </div>
          </div>
        </div>

        {/* Hull Safety Badge */}
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold border ${
            trajectoryResults.isInnerStructureSafe
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
          }`}
        >
          {trajectoryResults.isInnerStructureSafe ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>
            {trajectoryResults.isInnerStructureSafe ? 'КОРПУС ЗАЩИЩЕН (T < 175°C)' : 'ОПАСНОСТЬ: ТЕПЛОВОЙ ПРОБОЙ КОРПУСА!'}
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* TPS Material Selector */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl">
            <span className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider border-b border-slate-800 pb-2">
              <Layers className="w-4 h-4 text-orange-400" /> Материал Теплозащитного Экрана
            </span>

            <div className="grid grid-cols-1 gap-1.5">
              {[
                { id: 'pica_x', label: 'PICA-X (Фенол-Углеродная Абляция)', desc: 'Dragon / Stardust (до 2800°C, низкая масса)' },
                { id: 'carbon_carbon', label: 'RCC Углерод-Углерод', desc: 'Space Shuttle носок и кромки крыла (до 1900°C)' },
                { id: 'silica_tiles', label: 'LI-900 Кварцевые Плитки', desc: 'Буран / Шаттл теплоизоляция днища (до 1450°C)' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTpsType(t.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    tpsType === t.id
                      ? 'bg-orange-950/80 border-orange-500 text-orange-200 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold font-mono">{t.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Re-entry Trajectory Sliders */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5 shadow-xl">
            <span className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider border-b border-slate-800 pb-2">
              <Sliders className="w-4 h-4 text-cyan-400" /> Параметры Входа в Атмосферу
            </span>

            {/* Entry Velocity */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Начальная скорость входа (v₀):</span>
                <strong className="font-mono text-cyan-300">{entryVelocityKmS.toFixed(1)} км/с</strong>
              </div>
              <input
                type="range"
                min="7.5"
                max="11.5"
                step="0.1"
                value={entryVelocityKmS}
                onChange={(e) => setEntryVelocityKmS(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <p className="text-[10px] text-slate-500">7.8 км/с (НОО/МКС) → 11.2 км/с (Лунная траектория возврата)</p>
            </div>

            {/* Entry Angle */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Угол наклона траектории (γ₀):</span>
                <strong className="font-mono text-amber-300">-{entryAngleDeg.toFixed(1)}°</strong>
              </div>
              <input
                type="range"
                min="2.0"
                max="8.5"
                step="0.1"
                value={entryAngleDeg}
                onChange={(e) => setEntryAngleDeg(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Nose Radius */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Радиус затупления носка (R_N):</span>
                <strong className="font-mono text-purple-300">{noseRadiusM.toFixed(2)} м</strong>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.5"
                step="0.1"
                value={noseRadiusM}
                onChange={(e) => setNoseRadiusM(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            {/* TPS Thickness */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Толщина теплозащиты (δ):</span>
                <strong className="font-mono text-emerald-300">{heatShieldThickMm} мм</strong>
              </div>
              <input
                type="range"
                min="20"
                max="120"
                step="5"
                value={heatShieldThickMm}
                onChange={(e) => setHeatShieldThickMm(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Right Canvas & Telemetry HUD (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex justify-between items-center text-xs font-mono text-slate-400 flex-wrap gap-2">
              <span className="text-orange-400 font-bold flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" /> 2D Ударная Волна & Плазменный Слой Вокруг Капсулы
              </span>
              <span className="text-slate-400 text-[11px]">
                Пик нагрева на высоте: <strong>H = {trajectoryResults.peakHeatAltKm.toFixed(1)} км</strong>
              </span>
            </div>

            {/* Canvas */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 h-72 sm:h-80 flex items-center justify-center">
              <canvas ref={canvasRef} width={680} height={320} className="w-full h-full object-contain" />
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono">Макс. Тепловой Поток</span>
                <div className="text-sm font-bold font-mono text-rose-400">
                  {trajectoryResults.peakHeatFluxMW_m2.toFixed(2)} МВт/м²
                </div>
                <span className="text-[10px] text-slate-400">{(trajectoryResults.peakHeatFluxMW_m2 * 100).toFixed(0)} Вт/см²</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono">Температура Экрана</span>
                <div className="text-sm font-bold font-mono text-amber-300">
                  {trajectoryResults.maxSurfaceTempC.toFixed(0)} °C
                </div>
                <span className="text-[10px] text-slate-400">Фронтальная поверхность</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono">Температура Кабины</span>
                <div
                  className={`text-sm font-bold font-mono ${
                    trajectoryResults.isInnerStructureSafe ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {trajectoryResults.innerHullTempC.toFixed(0)} °C
                </div>
                <span className="text-[10px] text-slate-400">Предел: +175 °C</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono">Пиковая Перегрузка</span>
                <div className="text-sm font-bold font-mono text-purple-300">
                  +{trajectoryResults.maxGLoad.toFixed(1)} g
                </div>
                <span className="text-[10px] text-slate-400">Торможение капсулы</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
