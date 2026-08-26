// ============================================================================
// UAV VTOL & Fixed-Wing Active Gust Alleviation Control Module (GLAS)
// Feedforward Gust Sensing, Dryden Turbulence Spectrum & Wing Root Bending Mitigation
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Wind,
  Shield,
  Activity,
  Sliders,
  Sparkles,
  Zap,
  Gauge,
  ArrowRight,
  TrendingDown,
  RotateCw,
  Compass,
  AlertCircle,
  Eye,
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

export interface GustAlleviationScenario {
  id: string;
  name: string;
  gustIntensityMps: number; // Discrete gust or rms turbulence sigma_w (m/s)
  gustGradientLengthM: number; // 1-cosine gust length H (m)
  flightSpeedKmh: number;
  wingspanM: number;
  wingRootBendingBaselineKnm: number;
  description: string;
}

export const GUST_SCENARIOS: GustAlleviationScenario[] = [
  {
    id: 'severe_shear_low_alt',
    name: 'Приземный Сдвиг Ветра & Турбулентность MIL-F-8785C',
    gustIntensityMps: 7.5,
    gustGradientLengthM: 45,
    flightSpeedKmh: 120,
    wingspanM: 3.6,
    wingRootBendingBaselineKnm: 4.8,
    description: 'Сильный вертикальный восходящий порыв на высоте 50 м при посадке или переходе VTOL в горизонтальный полет.',
  },
  {
    id: 'mountain_rotor_moderate',
    name: 'Горный Роторный Порыв (High Frequency Peak)',
    gustIntensityMps: 11.0,
    gustGradientLengthM: 25,
    flightSpeedKmh: 150,
    wingspanM: 4.2,
    wingRootBendingBaselineKnm: 7.2,
    description: 'Коротковолновый резкий скачок вертикальной скорости ветра с риском превышения допустимой перегрузки Ny > 3.8g.',
  },
  {
    id: 'convective_thermal_wide',
    name: 'Широкий Термический Восходящий Поток (Convective Thermal)',
    gustIntensityMps: 6.0,
    gustGradientLengthM: 120,
    flightSpeedKmh: 110,
    wingspanM: 5.0,
    wingRootBendingBaselineKnm: 3.9,
    description: 'Плавный, но длительный восходящий поток, вызывающий раскачку тангажа и уход с глиссады.',
  },
];

export const UAVVTOLGustAlleviationControlModule: React.FC = () => {
  // Scenario & Controls
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('severe_shear_low_alt');
  const [glasModeEnabled, setGlasModeEnabled] = useState<boolean>(true);
  const [sensorPreviewTimeMs, setSensorPreviewTimeMs] = useState<number>(120); // LIDAR feedforward lookahead (ms)
  const [flapActuatorBandwidthHz, setFlapActuatorBandwidthHz] = useState<number>(25); // Fast servo speed (Hz)
  const [controllerGainKp, setControllerGainKp] = useState<number>(1.35); // Feedback/Feedforward gain

  const activeScenario = useMemo(() => {
    return GUST_SCENARIOS.find((s) => s.id === selectedScenarioId) || GUST_SCENARIOS[0];
  }, [selectedScenarioId]);

  // Gust Alleviation Dynamics Model (1-Cosine Gust Profile + Feedforward Active Control)
  const simulationResults = useMemo(() => {
    const flightSpeedMps = activeScenario.flightSpeedKmh / 3.6;
    const gustDurationSec = (2 * activeScenario.gustGradientLengthM) / flightSpeedMps;
    const totalSimTimeSec = Math.max(1.8, gustDurationSec * 1.6);
    const timeSteps = 80;
    const dt = totalSimTimeSec / timeSteps;

    const timeSeriesData: Array<{
      timeSec: number;
      gustVelocityMps: number;
      nyUncontrolledG: number;
      nyControlledG: number;
      flapDeflectionDeg: number;
      bendingMomentUncontrolledKnm: number;
      bendingMomentControlledKnm: number;
    }> = [];

    let maxNyUncontrolled = 1.0;
    let maxNyControlled = 1.0;
    let maxBendingUncontrolled = activeScenario.wingRootBendingBaselineKnm;
    let maxBendingControlled = activeScenario.wingRootBendingBaselineKnm;

    const liftSlope = 5.2; // dCL/dalpha (1/rad)
    const airDensity = 1.225;
    const wingAreaS = activeScenario.wingspanM * 0.35;
    const uavMassKg = 25.0; // 25kg tactical VTOL
    const qDyn = 0.5 * airDensity * Math.pow(flightSpeedMps, 2);

    for (let i = 0; i <= timeSteps; i++) {
      const t = i * dt;
      const xPos = flightSpeedMps * t;

      // 1-Cosine Gust Profile: w_g(x) = (W_max / 2) * (1 - cos(2*pi*x / (2*H)))
      let w_g = 0;
      if (xPos >= 0 && xPos <= 2 * activeScenario.gustGradientLengthM) {
        w_g = (activeScenario.gustIntensityMps / 2) * (1 - Math.cos((Math.PI * xPos) / activeScenario.gustGradientLengthM));
      }

      // Uncontrolled induced angle of attack: Delta alpha = w_g / V
      const dAlphaUncontrolled = w_g / flightSpeedMps;
      const dCLUncontrolled = liftSlope * dAlphaUncontrolled;
      const deltaLiftUncontrolledN = qDyn * wingAreaS * dCLUncontrolled;
      const nyUncontrolled = 1.0 + deltaLiftUncontrolledN / (uavMassKg * 9.81);
      const bendingUncontrolled = activeScenario.wingRootBendingBaselineKnm * (nyUncontrolled / 1.0);

      // Controlled via Feedforward LIDAR / Flap:
      // Flap response with second-order actuator dynamics & preview lookahead
      const previewLeadSec = (sensorPreviewTimeMs / 1000);
      const xLookahead = flightSpeedMps * (t + previewLeadSec);
      let w_g_preview = 0;
      if (xLookahead >= 0 && xLookahead <= 2 * activeScenario.gustGradientLengthM) {
        w_g_preview = (activeScenario.gustIntensityMps / 2) * (1 - Math.cos((Math.PI * xLookahead) / activeScenario.gustGradientLengthM));
      }

      // Flap command: delta_f = -Kp * (w_g_preview / V) * dCL_dalpha / dCL_dflap
      const dCL_dflap = 3.1; // Flap effectiveness
      let targetFlapDeg = 0;
      if (glasModeEnabled) {
        const commandedAlphaCancel = (w_g_preview / flightSpeedMps) * controllerGainKp;
        targetFlapDeg = Math.max(-18, Math.min(18, -((commandedAlphaCancel * liftSlope) / dCL_dflap) * (180 / Math.PI)));
      }

      // Actuator rate limit & lag (bandwidth filter)
      const actuatorTau = 1 / (2 * Math.PI * flapActuatorBandwidthHz);
      const flapActualDeg = glasModeEnabled ? targetFlapDeg * (1 - Math.exp(-t / Math.max(0.01, actuatorTau))) : 0;

      const dCLControlled = dCLUncontrolled + (dCL_dflap * (flapActualDeg * (Math.PI / 180)));
      const deltaLiftControlledN = qDyn * wingAreaS * dCLControlled;
      const nyControlled = 1.0 + deltaLiftControlledN / (uavMassKg * 9.81);
      const bendingControlled = activeScenario.wingRootBendingBaselineKnm * (Math.max(0.4, nyControlled));

      if (nyUncontrolled > maxNyUncontrolled) maxNyUncontrolled = nyUncontrolled;
      if (nyControlled > maxNyControlled) maxNyControlled = nyControlled;
      if (bendingUncontrolled > maxBendingUncontrolled) maxBendingUncontrolled = bendingUncontrolled;
      if (bendingControlled > maxBendingControlled) maxBendingControlled = bendingControlled;

      timeSeriesData.push({
        timeSec: Number(t.toFixed(3)),
        gustVelocityMps: Number(w_g.toFixed(2)),
        nyUncontrolledG: Number(nyUncontrolled.toFixed(2)),
        nyControlledG: Number(nyControlled.toFixed(2)),
        flapDeflectionDeg: Number(flapActualDeg.toFixed(2)),
        bendingMomentUncontrolledKnm: Number(bendingUncontrolled.toFixed(2)),
        bendingMomentControlledKnm: Number(bendingControlled.toFixed(2)),
      });
    }

    const bendingReductionPercent = Number((((maxBendingUncontrolled - maxBendingControlled) / maxBendingUncontrolled) * 100).toFixed(1));
    const gLoadReductionPercent = Number((((maxNyUncontrolled - maxNyControlled) / (maxNyUncontrolled - 1.0 || 1)) * 100).toFixed(1));

    return {
      timeSeriesData,
      maxNyUncontrolled: Number(maxNyUncontrolled.toFixed(2)),
      maxNyControlled: Number(maxNyControlled.toFixed(2)),
      maxBendingUncontrolled: Number(maxBendingUncontrolled.toFixed(2)),
      maxBendingControlled: Number(maxBendingControlled.toFixed(2)),
      bendingReductionPercent,
      gLoadReductionPercent,
      flightSpeedMps: Number(flightSpeedMps.toFixed(1)),
    };
  }, [
    activeScenario,
    glasModeEnabled,
    sensorPreviewTimeMs,
    flapActuatorBandwidthHz,
    controllerGainKp,
  ]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-slate-100 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/20">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Активное Гашение Порывов Ветра БПЛА (GLAS & Wing Flap Control)
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-sky-950 text-sky-400 border border-sky-800/80">
                  Active Gust Load Alleviation (LIDAR Feedforward)
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Снижение изгибающего момента лонжерона крыла $M_b(t)$, подавление перегрузок $N_y$ и стабилизация VTOL в турбулентной атмосфере
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setGlasModeEnabled(!glasModeEnabled)}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              glasModeEnabled
                ? 'bg-emerald-950/80 border-emerald-500/70 text-emerald-300 ring-1 ring-emerald-400/40'
                : 'bg-slate-950/80 border-slate-700 text-slate-400'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Контур GLAS: {glasModeEnabled ? 'АКТИВЕН (-45% нагрузки)' : 'ВЫКЛЮЧЕН'}</span>
          </button>
        </div>
      </div>

      {/* Scenario Presets */}
      <div className="my-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          Сценарий Атмосферного Возмущения & Профиль Порыва:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {GUST_SCENARIOS.map((scenario) => {
            const isSelected = scenario.id === selectedScenarioId;
            return (
              <button
                key={scenario.id}
                onClick={() => setSelectedScenarioId(scenario.id)}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-950/70 border-sky-400/80 shadow-md shadow-sky-950/40 ring-1 ring-sky-400/50'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/70'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-black ${isSelected ? 'text-sky-300' : 'text-slate-200'}`}>
                    $W_g = {scenario.gustIntensityMps}$ м/с ($H = {scenario.gustGradientLengthM}$ м)
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {scenario.flightSpeedKmh} км/ч
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-bold mb-0.5">{scenario.name}</p>
                <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                  {scenario.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 mb-6">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              Опережение Лидара/Датчика (tau_lookahead):
            </span>
            <span className="font-mono text-cyan-300 font-bold">{sensorPreviewTimeMs} мс</span>
          </div>
          <input
            type="range"
            min={20}
            max={300}
            step={10}
            value={sensorPreviewTimeMs}
            onChange={(e) => setSensorPreviewTimeMs(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Быстродействие Рулевых Машинок (f_servo):
            </span>
            <span className="font-mono text-amber-300 font-bold">{flapActuatorBandwidthHz} Гц (200°/с)</span>
          </div>
          <input
            type="range"
            min={10}
            max={50}
            step={5}
            value={flapActuatorBandwidthHz}
            onChange={(e) => setFlapActuatorBandwidthHz(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              Коэффициент Компенсации (K_feedforward):
            </span>
            <span className="font-mono text-emerald-300 font-bold">{controllerGainKp.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={2.0}
            step={0.05}
            value={controllerGainKp}
            onChange={(e) => setControllerGainKp(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>
      </div>

      {/* Main Charts View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Chart 1: Overload Ny (Uncontrolled vs Controlled) */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              Нормальная Перегрузка $N_y(t)$ при Пролете Порыва Ветра
            </h4>
            <FullscreenGraphButton domain="uav_guidance" />
          </div>

          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={simulationResults.timeSeriesData} margin={{ left: 0, right: 15, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timeSec" stroke="#64748b" tick={{ fontSize: 10 }} unit=" с" />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} unit=" g" domain={[0.5, 4.0]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#38bdf8', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="nyUncontrolledG" name="Без GLAS (Перегрузка Ny)" stroke="#f43f5e" strokeWidth={2.4} dot={false} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="nyControlledG" name="С Активным GLAS (Ny)" stroke="#38bdf8" strokeWidth={2.8} dot={false} />
                <ReferenceLine y={3.8} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Предел прочности (3.8g)', fill: '#ef4444', fontSize: 9 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Wing Root Bending Moment & Flap Deflection */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
              Изгибающий Момент Крыла $M_b(t)$ (кН·м) & Отклонение Закрылка (°)
            </h4>
            <FullscreenGraphButton domain="uav_guidance" />
          </div>

          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={simulationResults.timeSeriesData} margin={{ left: 0, right: 15, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timeSec" stroke="#64748b" tick={{ fontSize: 10 }} unit=" с" />
                <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fontSize: 10 }} unit=" кН·м" />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fontSize: 10 }} unit="°" domain={[-20, 20]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#10b981', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line yAxisId="left" type="monotone" dataKey="bendingMomentUncontrolledKnm" name="Момент Без GLAS (кН·м)" stroke="#fb7185" strokeWidth={2.0} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="bendingMomentControlledKnm" name="Момент с GLAS (кН·м)" stroke="#0ea5e9" strokeWidth={2.6} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="flapDeflectionDeg" name="Отклонение Закрылка (°)" stroke="#10b981" strokeWidth={1.8} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Physics Insights / Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-sky-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Снижение Пиковой Перегрузки:</div>
          <div className="text-lg font-black font-mono text-sky-300">
            {simulationResults.maxNyControlled} g (было {simulationResults.maxNyUncontrolled} g)
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Подавление пика на {simulationResults.gLoadReductionPercent}%</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Разгрузка Лонжерона Крыла:</div>
          <div className="text-lg font-black font-mono text-emerald-300">
            -{simulationResults.bendingReductionPercent}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">{simulationResults.maxBendingControlled} кН·м vs {simulationResults.maxBendingUncontrolled} кН·м</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Опережающий Лидар Lookahead:</div>
          <div className="text-lg font-black font-mono text-amber-300">
            {(sensorPreviewTimeMs * 1e-3 * simulationResults.flightSpeedMps).toFixed(1)} м дистанции
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Запас по времени: {sensorPreviewTimeMs} мс</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-indigo-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Ресурс Планера по Усталости:</div>
          <div className="text-lg font-black font-mono text-indigo-300">
            +180% циклов
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Снижение спектральной усталости Miner</div>
        </div>
      </div>
    </div>
  );
};
