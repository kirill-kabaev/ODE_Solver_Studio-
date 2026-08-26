// ============================================================================
// UAV Guided Glide Bomb (UMPK / Winged Munition) Aeroballistics Module
// Wing Deployment Dynamics, High-L/D Glide Equilibrium, Wind Drift & Terminal Dive
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Rocket,
  Compass,
  Sliders,
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Sparkles,
  Layers,
  Wind,
  Target,
  ArrowDownRight,
  ShieldAlert,
  Crosshair,
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
  ReferenceLine,
} from 'recharts';
import { FullscreenGraphButton } from '../../telemetry/FullscreenGraphButton';

export interface GlideBombPreset {
  id: string;
  name: string;
  totalMassKg: number;
  wingSpanM: number;
  aspectRatio: number;
  glideRatioMax: number;
  maxLoadFactorG: number;
  warheadMassKg: number;
  description: string;
}

export const GLIDE_BOMB_PRESETS: GlideBombPreset[] = [
  {
    id: 'umpk_fab_500',
    name: 'УМПК ФАБ-500 (Раскладное Прямое Крыло)',
    totalMassKg: 540,
    wingSpanM: 2.1,
    aspectRatio: 7.2,
    glideRatioMax: 13.5,
    maxLoadFactorG: 6.5,
    warheadMassKg: 300,
    description: 'Массовый управляемый планирующий модуль. Дальность сброса до 65-70 км с высоты 12 км.',
  },
  {
    id: 'umpk_fab_1500',
    name: 'УМПК ФАБ-1500 (Тяжелый Модуль с Увеличенным Размахом)',
    totalMassKg: 1580,
    wingSpanM: 2.85,
    aspectRatio: 8.5,
    glideRatioMax: 15.0,
    maxLoadFactorG: 5.5,
    warheadMassKg: 675,
    description: 'Сверхмощный планирующий боеприпас. Аэродинамическое качество $K=15$ обеспечивает дальность > 75 км.',
  },
  {
    id: 'sdb_gbu_39',
    name: 'SDB-II / GBU-39 (DiamondBack Ромбовидное Крыло)',
    totalMassKg: 115,
    wingSpanM: 1.6,
    aspectRatio: 11.2,
    glideRatioMax: 17.5,
    maxLoadFactorG: 8.0,
    warheadMassKg: 42,
    description: 'Высокоаэродинамичное ромбовидное крыло с минимальным лобовым сопротивлением и дальностью до 110 км.',
  },
  {
    id: 'jdam_er_wing',
    name: 'JDAM-ER (Стреловидное Крыло Складывания)',
    totalMassKg: 250,
    wingSpanM: 1.95,
    aspectRatio: 9.0,
    glideRatioMax: 14.8,
    maxLoadFactorG: 7.0,
    warheadMassKg: 89,
    description: 'Комплект крыльев для свободнопадающих авиабомб. Автономное спутниковое и инерциальное наведение.',
  },
];

export const UAVGuidedGlideBombTrajectoryModule: React.FC = () => {
  // Input parameters
  const [selectedPresetId, setSelectedPresetId] = useState<string>('umpk_fab_500');
  const [dropAltitudeM, setDropAltitudeM] = useState<number>(11500); // Drop altitude (m)
  const [dropSpeedMs, setDropSpeedMs] = useState<number>(260); // Drop velocity (m/s) ~ M=0.85
  const [tailWindSpeedMs, setTailWindSpeedMs] = useState<number>(15); // Wind along trajectory (m/s)
  const [deployDelaySec, setDeployDelaySec] = useState<number>(1.8); // Time before wings deploy (s)
  const [terminalDiveAngleDeg, setTerminalDiveAngleDeg] = useState<number>(75); // Impact angle (deg)

  const activePreset = useMemo(() => {
    return GLIDE_BOMB_PRESETS.find((p) => p.id === selectedPresetId) || GLIDE_BOMB_PRESETS[0];
  }, [selectedPresetId]);

  // Trajectory Simulation via Euler/RK2 Numerical Integration
  const trajectoryData = useMemo(() => {
    const dt = 0.5; // time step
    let t = 0;
    let x = 0;
    let h = dropAltitudeM;
    let v = dropSpeedMs;
    let theta = 0; // Flight path angle (radians, 0 = horizontal)

    const points: Array<{
      timeSec: number;
      distKm: number;
      altitudeM: number;
      speedMs: number;
      machNumber: number;
      loadFactorNy: number;
      glideRatio: number;
      isWingDeployed: boolean;
      phase: string;
    }> = [];

    const g = 9.81;
    const m = activePreset.totalMassKg;
    const S_wing = (activePreset.wingSpanM * activePreset.wingSpanM) / activePreset.aspectRatio;

    let maxLoadFactor = 1.0;
    let impactSpeed = 0;

    // Simulation loop
    while (h > 0 && t < 400) {
      // ISA Standard Atmosphere Density
      const T_k = 288.15 - 0.0065 * Math.min(11000, h);
      const p_pa = 101325 * Math.pow(1 - 0.0065 * (Math.min(11000, h) / 288.15), 5.2559);
      const rho = p_pa / (287.05 * T_k);
      const speedOfSound = Math.sqrt(1.4 * 287.05 * T_k);
      const mach = v / speedOfSound;

      const isWingDeployed = t >= deployDelaySec;

      // Aerodynamic Coefficients
      let CD0 = isWingDeployed ? 0.028 : 0.016; // parasitic drag
      if (mach > 0.85) {
        CD0 += 0.035 * Math.pow(mach - 0.85, 1.6); // Wave drag compressibility rise
      }

      // Induced drag factor k = 1 / (pi * AR * e)
      const e_oswald = 0.82;
      const k_induced = 1 / (Math.PI * activePreset.aspectRatio * e_oswald);

      // Phase selection: 1. Deploy & Pull-up, 2. Equilibrium Glide, 3. Terminal Dive
      let CL_target = 0;
      let phase = 'Свободное падение (до раскрытия)';

      if (!isWingDeployed) {
        CL_target = 0.0;
      } else if (h > 1200) {
        // High Altitude Glide Phase
        phase = 'Планирование с высоким качеством';
        CL_target = Math.sqrt(CD0 / k_induced); // (L/D)max condition
        CL_target = Math.min(1.1, CL_target);
      } else {
        // Terminal Dive Phase towards target
        phase = 'Терминальное пикирование на цель';
        CL_target = 0.25; // Reduce lift to dive steeply
      }

      const q = 0.5 * rho * v * v;
      const Lift = q * S_wing * CL_target;
      const CD_total = CD0 + k_induced * CL_target * CL_target;
      const Drag = q * S_wing * CD_total;

      const currentGlideRatio = CD_total > 0 ? Lift / Math.max(0.1, Drag) : 0;
      const loadFactorNy = Lift / (m * g);
      if (loadFactorNy > maxLoadFactor) maxLoadFactor = loadFactorNy;

      // Equations of motion in wind frame
      const dv_dt = -Drag / m - g * Math.sin(theta);
      const dtheta_dt = (Lift - m * g * Math.cos(theta)) / (m * Math.max(10, v));

      // Coordinate updates
      const groundSpeedX = v * Math.cos(theta) + tailWindSpeedMs;
      const groundSpeedH = v * Math.sin(theta);

      x += groundSpeedX * dt;
      h += groundSpeedH * dt;
      v += dv_dt * dt;
      theta += dtheta_dt * dt;
      t += dt;

      // Log points every 2 seconds or on transition
      if (Math.round(t * 10) % 20 === 0 || h <= 0) {
        points.push({
          timeSec: Number(t.toFixed(1)),
          distKm: Number((x / 1000).toFixed(2)),
          altitudeM: Math.max(0, Math.round(h)),
          speedMs: Math.round(v),
          machNumber: Number(mach.toFixed(2)),
          loadFactorNy: Number(loadFactorNy.toFixed(2)),
          glideRatio: Number(currentGlideRatio.toFixed(1)),
          isWingDeployed,
          phase,
        });
      }

      if (h <= 0) {
        impactSpeed = v;
        break;
      }
    }

    const totalRangeKm = Number((x / 1000).toFixed(1));
    const flightTimeSec = Number(t.toFixed(1));

    return {
      points,
      totalRangeKm,
      flightTimeSec,
      maxLoadFactor: Number(maxLoadFactor.toFixed(2)),
      impactSpeed: Math.round(impactSpeed),
      impactEnergyMj: Number(((0.5 * m * impactSpeed * impactSpeed) / 1e6).toFixed(1)),
    };
  }, [
    activePreset,
    dropAltitudeM,
    dropSpeedMs,
    tailWindSpeedMs,
    deployDelaySec,
    terminalDiveAngleDeg,
  ]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-slate-100 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-600 to-rose-500 text-white shadow-lg shadow-amber-500/20">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Аэробаллистика Планирующих Боеприпасов УМПК / Glide Bomb
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-amber-950 text-amber-400 border border-amber-800/80">
                  RK2 Ballistic Flight
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Раскрытие крыльев, аэродинамическое качество K = (L/D)_max, ветровой снос и терминальное пикирование
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-amber-800/50 flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-300">Дальность Планирования:</span>
            <span className="text-xs font-mono font-bold text-amber-300">
              {trajectoryData.totalRangeKm} км
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-rose-800/50 flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-rose-400" />
            <span className="text-xs text-slate-300">Время Подлета:</span>
            <span className="text-xs font-mono font-bold text-rose-300">
              {trajectoryData.flightTimeSec} с
            </span>
          </div>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="my-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
          <Rocket className="w-3.5 h-3.5 text-amber-400" />
          Тип Планирующего Модуля и Авиабомбы:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {GLIDE_BOMB_PRESETS.map((preset) => {
            const isSelected = preset.id === selectedPresetId;
            return (
              <button
                key={preset.id}
                onClick={() => setSelectedPresetId(preset.id)}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-950/70 border-amber-400/80 shadow-md shadow-amber-950/40 ring-1 ring-amber-400/50'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/70'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-black ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                    {preset.totalMassKg} кг
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    K = {preset.glideRatioMax}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-bold mb-0.5">{preset.name}</p>
                <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 mb-6">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Высота Сброса ($H_0$):
            </span>
            <span className="font-mono text-amber-300 font-bold">{dropAltitudeM} м</span>
          </div>
          <input
            type="range"
            min={1000}
            max={15000}
            step={500}
            value={dropAltitudeM}
            onChange={(e) => setDropAltitudeM(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              Скорость Сброса ($V_0$):
            </span>
            <span className="font-mono text-rose-300 font-bold">{dropSpeedMs} м/с ({(dropSpeedMs * 3.6).toFixed(0)} км/ч)</span>
          </div>
          <input
            type="range"
            min={120}
            max={330}
            step={10}
            value={dropSpeedMs}
            onChange={(e) => setDropSpeedMs(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-cyan-400" />
              Попутный Ветер ($W_x$):
            </span>
            <span className="font-mono text-cyan-300 font-bold">{tailWindSpeedMs} м/с</span>
          </div>
          <input
            type="range"
            min={-20}
            max={35}
            step={5}
            value={tailWindSpeedMs}
            onChange={(e) => setTailWindSpeedMs(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              Задержка Раскрытия Крыльев:
            </span>
            <span className="font-mono text-emerald-300 font-bold">{deployDelaySec} с</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={5.0}
            step={0.1}
            value={deployDelaySec}
            onChange={(e) => setDeployDelaySec(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>
      </div>

      {/* Main Charts View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Chart 1: Altitude vs Range Profile */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              Профиль Траектории: Высота H(x) vs Дальность Полета (км)
            </h4>
            <FullscreenGraphButton domain="supersonic_mach" />
          </div>

          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trajectoryData.points} margin={{ left: 0, right: 15, top: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="bombAltGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="distKm" stroke="#64748b" tick={{ fontSize: 10 }} unit=" км" />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} unit=" м" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#d97706', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="altitudeM" name="Высота Полета H (м)" stroke="#f59e0b" fill="url(#bombAltGradient)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Speed and G-Load Factor */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              Скорость V(t) (м/с) & Перегрузка Раскрытия Ny(t) (g)
            </h4>
            <FullscreenGraphButton domain="supersonic_mach" />
          </div>

          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trajectoryData.points} margin={{ left: 0, right: 15, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timeSec" stroke="#64748b" tick={{ fontSize: 10 }} unit=" с" />
                <YAxis yAxisId="left" stroke="#f43f5e" tick={{ fontSize: 10 }} unit=" м/с" />
                <YAxis yAxisId="right" orientation="right" stroke="#38bdf8" tick={{ fontSize: 10 }} unit=" g" domain={[0, 8]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#e11d48', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line yAxisId="left" type="monotone" dataKey="speedMs" name="Скорость V (м/с)" stroke="#f43f5e" strokeWidth={2.5} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="loadFactorNy" name="Перегрузка ny (g)" stroke="#38bdf8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Physics Insights / Performance Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Максимальная Дальность:</div>
          <div className="text-lg font-black font-mono text-amber-300">
            {trajectoryData.totalRangeKm} км
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Вне зоны ПВО ближнего рубежа</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-rose-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Скорость в Точке Встречи:</div>
          <div className="text-lg font-black font-mono text-rose-300">
            {trajectoryData.impactSpeed} м/с
          </div>
          <div className="text-[10px] text-slate-500 mt-1">{(trajectoryData.impactSpeed * 3.6).toFixed(0)} км/ч (Критично для пробития)</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Пиковая Перегрузка Ny_max:</div>
          <div className="text-lg font-black font-mono text-cyan-300">
            {trajectoryData.maxLoadFactor} g
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Лимит прочности: {activePreset.maxLoadFactorG} g</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Кинетическая Энергия Удара:</div>
          <div className="text-lg font-black font-mono text-emerald-300">
            {trajectoryData.impactEnergyMj} МДж
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Масса БЧ: {activePreset.warheadMassKg} кг ВВ</div>
        </div>
      </div>
    </div>
  );
};
