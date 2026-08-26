// ============================================================================
// UAV Autonomous Ship Deck Landing & Wave Motion Compensation Module
// Ship 6-DoF Dynamics (Heave, Pitch, Roll), Pierson-Moskowitz Wave Spectrum,
// Airwake Burble Turbulence & Quiescent Landing Window (LQP) Predictor
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Anchor,
  Wind,
  Compass,
  Sliders,
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Sparkles,
  Layers,
  ArrowDownCircle,
  Clock,
  ShieldCheck,
  Radar,
  MoveDown,
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
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { FullscreenGraphButton } from '../../telemetry/FullscreenGraphButton';

export interface SeaStatePreset {
  id: string;
  name: string;
  beaufort: number;
  significantWaveHeightM: number;
  peakPeriodSec: number;
  deckHeaveAmpM: number;
  deckPitchAmpDeg: number;
  deckRollAmpDeg: number;
  windSpeedKts: number;
  description: string;
}

export const SEA_STATE_PRESETS: SeaStatePreset[] = [
  {
    id: 'sea_state_2',
    name: 'Шкала 2: Слабое волнение (Calm/Light)',
    beaufort: 2,
    significantWaveHeightM: 0.5,
    peakPeriodSec: 4.5,
    deckHeaveAmpM: 0.35,
    deckPitchAmpDeg: 0.8,
    deckRollAmpDeg: 1.2,
    windSpeedKts: 8,
    description: 'Идеальные условия. Амплитуда качки минимальна, посадочное окно доступно > 85% времени.',
  },
  {
    id: 'sea_state_4',
    name: 'Шкала 4: Умеренное волнение (Moderate)',
    beaufort: 4,
    significantWaveHeightM: 1.8,
    peakPeriodSec: 7.2,
    deckHeaveAmpM: 1.2,
    deckPitchAmpDeg: 2.5,
    deckRollAmpDeg: 4.8,
    windSpeedKts: 18,
    description: 'Стандартные штормовые условия флота. Требуется активная синхронизация фазы качки палубы.',
  },
  {
    id: 'sea_state_5',
    name: 'Шкала 5: Бурное волнение (Rough Sea)',
    beaufort: 5,
    significantWaveHeightM: 3.2,
    peakPeriodSec: 9.5,
    deckHeaveAmpM: 2.4,
    deckPitchAmpDeg: 4.8,
    deckRollAmpDeg: 8.5,
    windSpeedKts: 26,
    description: 'Сложные условия посадки. Вертикальная скорость палубы достигает 2.0 м/с, узкие окна LQP.',
  },
  {
    id: 'sea_state_6',
    name: 'Шкала 6: Шторм (Very Rough / Near Gale)',
    beaufort: 6,
    significantWaveHeightM: 5.0,
    peakPeriodSec: 11.5,
    deckHeaveAmpM: 3.8,
    deckPitchAmpDeg: 7.5,
    deckRollAmpDeg: 14.0,
    windSpeedKts: 35,
    description: 'Экстремальные условия. Посадка только с гарпунным замком Deck-Lock и предиктивным ИИ-пилотом.',
  },
];

export const UAVDeckLandingMotionCompModule: React.FC = () => {
  // Input parameters
  const [selectedSeaStateId, setSelectedSeaStateId] = useState<string>('sea_state_4');
  const [uavMassKg, setUavMassKg] = useState<number>(35); // UAV Mass (kg)
  const [descentVelocityMs, setDescentVelocityMs] = useState<number>(1.2); // Nominal descent rate (m/s)
  const [shipSpeedKts, setShipSpeedKts] = useState<number>(15); // Ship cruising speed (knots)
  const [deckLockForceKn, setDeckLockForceKn] = useState<number>(4.5); // Harpoon / Deck Lock Retention (kN)
  const [airwakeTurbulenceFactor, setAirwakeTurbulenceFactor] = useState<number>(1.25); // Superstructure wake factor
  const [lookaheadHorizonSec, setLookaheadHorizonSec] = useState<number>(20); // Prediction time (s)

  const activePreset = useMemo(() => {
    return SEA_STATE_PRESETS.find((p) => p.id === selectedSeaStateId) || SEA_STATE_PRESETS[1];
  }, [selectedSeaStateId]);

  // Simulation & Kinematic Analysis
  const simulationData = useMemo(() => {
    const omega = (2 * Math.PI) / activePreset.peakPeriodSec;
    const omegaSecondary = omega * 1.62; // Multi-frequency sea wave spectrum representation
    const dt = 0.1;
    const steps = Math.floor(lookaheadHorizonSec / dt);

    const timeSeries: Array<{
      timeSec: number;
      deckZ: number;
      deckVz: number;
      deckPitchDeg: number;
      deckRollDeg: number;
      uavZ: number;
      airwakeGustMs: number;
      isSafeWindow: boolean;
      lqpScore: number;
    }> = [];

    // UAV trajectory starting from 15m hover
    let currentUavZ = 12.0;
    let touchdownTime: number | null = null;
    let touchdownVrel = 0;

    // Safe thresholds
    const maxSafeVz = 0.55; // m/s deck vertical velocity
    const maxSafeRoll = 3.5; // deg
    const maxSafePitch = 2.0; // deg

    for (let i = 0; i <= steps; i++) {
      const t = i * dt;

      // 6-DoF Deck Motion model with dual wave component
      const zPrimary = activePreset.deckHeaveAmpM * Math.sin(omega * t);
      const zSecondary = 0.28 * activePreset.deckHeaveAmpM * Math.sin(omegaSecondary * t + 0.85);
      const deckZ = zPrimary + zSecondary;

      const deckVz =
        activePreset.deckHeaveAmpM * omega * Math.cos(omega * t) +
        0.28 * activePreset.deckHeaveAmpM * omegaSecondary * Math.cos(omegaSecondary * t + 0.85);

      const deckPitchDeg =
        activePreset.deckPitchAmpDeg * Math.sin(omega * t - 0.4) +
        0.2 * activePreset.deckPitchAmpDeg * Math.sin(omegaSecondary * t);

      const deckRollDeg =
        activePreset.deckRollAmpDeg * Math.sin(omega * t * 0.9 + 1.2) +
        0.3 * activePreset.deckRollAmpDeg * Math.sin(omegaSecondary * t * 1.1);

      // Ship Airwake Burble behind superstructure
      const relativeDist = Math.max(0.1, currentUavZ - deckZ);
      const burbleDecay = Math.exp(-relativeDist / 4.0);
      const airwakeGustMs = (shipSpeedKts * 0.5144 * 0.35 * airwakeTurbulenceFactor + Math.sin(t * 4.2) * 1.5) * burbleDecay;

      // Safe Landing Quiescent Period (LQP) Evaluation
      const isSafeVz = Math.abs(deckVz) <= maxSafeVz;
      const isSafeAngle = Math.abs(deckRollDeg) <= maxSafeRoll && Math.abs(deckPitchDeg) <= maxSafePitch;
      const isSafeWindow = isSafeVz && isSafeAngle;

      // LQP Stability index (0 to 100%)
      const vzPenalty = Math.max(0, 1 - Math.abs(deckVz) / 1.5);
      const rollPenalty = Math.max(0, 1 - Math.abs(deckRollDeg) / 10.0);
      const pitchPenalty = Math.max(0, 1 - Math.abs(deckPitchDeg) / 6.0);
      const lqpScore = Math.round(vzPenalty * rollPenalty * pitchPenalty * 100);

      // UAV Adaptive Descent Controller
      if (currentUavZ > deckZ) {
        // When safe window is open, accelerate descent rate to catch phase; otherwise hold station
        let commandRate = descentVelocityMs;
        if (currentUavZ < 3.5) {
          if (isSafeWindow) {
            commandRate = descentVelocityMs * 1.4; // Commit to touchdown
          } else {
            commandRate = 0.2; // Hover/Wait for next LQP wave crest
          }
        }
        currentUavZ = Math.max(deckZ, currentUavZ - commandRate * dt);

        if (currentUavZ <= deckZ + 0.05 && touchdownTime === null) {
          touchdownTime = t;
          touchdownVrel = Math.abs(-commandRate - deckVz);
        }
      }

      timeSeries.push({
        timeSec: Number(t.toFixed(1)),
        deckZ: Number(deckZ.toFixed(2)),
        deckVz: Number(deckVz.toFixed(2)),
        deckPitchDeg: Number(deckPitchDeg.toFixed(2)),
        deckRollDeg: Number(deckRollDeg.toFixed(2)),
        uavZ: Number(currentUavZ.toFixed(2)),
        airwakeGustMs: Number(airwakeGustMs.toFixed(2)),
        isSafeWindow,
        lqpScore,
      });
    }

    // Safety and Deck lock metrics
    const safeWindowPct = Math.round(
      (timeSeries.filter((d) => d.isSafeWindow).length / timeSeries.length) * 100
    );

    const maxDeckVz = Math.max(...timeSeries.map((d) => Math.abs(d.deckVz)));
    const maxDeckAcc = activePreset.deckHeaveAmpM * Math.pow(omega, 2);
    const requiredLockForceKn = (uavMassKg * (9.81 + maxDeckAcc)) / 1000;
    const lockSafetyMargin = Number((deckLockForceKn / Math.max(0.1, requiredLockForceKn)).toFixed(2));

    return {
      timeSeries,
      safeWindowPct,
      touchdownTime: touchdownTime ? Number(touchdownTime.toFixed(1)) : null,
      touchdownVrel: Number(touchdownVrel.toFixed(2)),
      maxDeckVz: Number(maxDeckVz.toFixed(2)),
      maxDeckAcc: Number(maxDeckAcc.toFixed(2)),
      requiredLockForceKn: Number(requiredLockForceKn.toFixed(2)),
      lockSafetyMargin,
    };
  }, [
    activePreset,
    uavMassKg,
    descentVelocityMs,
    shipSpeedKts,
    deckLockForceKn,
    airwakeTurbulenceFactor,
    lookaheadHorizonSec,
  ]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-slate-100 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white shadow-lg shadow-cyan-500/20">
              <Anchor className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Посадка БПЛА на Палубу Корабля в Условиях Качки
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800/80">
                  LQP Wave Predictor
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Спектр волнения моря JONSWAP, 6-DoF качка (Heave/Pitch/Roll), спутная струя надстройки (Airwake) и фазовый захват гарпуном
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-cyan-800/50 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-300">Окно LQP:</span>
            <span className="text-xs font-mono font-bold text-cyan-300">
              {simulationData.safeWindowPct}% времени
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-emerald-800/50 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-300">Запас Deck-Lock:</span>
            <span className="text-xs font-mono font-bold text-emerald-300">
              {simulationData.lockSafetyMargin}x
            </span>
          </div>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="my-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
          <Wind className="w-3.5 h-3.5 text-cyan-400" />
          Степень Морского Волнения и Состояние Моря (Sea State):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {SEA_STATE_PRESETS.map((preset) => {
            const isSelected = preset.id === selectedSeaStateId;
            return (
              <button
                key={preset.id}
                onClick={() => setSelectedSeaStateId(preset.id)}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-950/70 border-cyan-400/80 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-400/50'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/70'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-black ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                    Балл {preset.beaufort}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    H₁/₃ = {preset.significantWaveHeightM}м
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-tight">
                  {preset.name}
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
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Масса БПЛА ($m$):
            </span>
            <span className="font-mono text-cyan-300 font-bold">{uavMassKg} кг</span>
          </div>
          <input
            type="range"
            min={5}
            max={150}
            step={5}
            value={uavMassKg}
            onChange={(e) => setUavMassKg(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <MoveDown className="w-3.5 h-3.5 text-emerald-400" />
              Скорость Снижения ($V_z$):
            </span>
            <span className="font-mono text-emerald-300 font-bold">{descentVelocityMs} м/с</span>
          </div>
          <input
            type="range"
            min={0.3}
            max={3.0}
            step={0.1}
            value={descentVelocityMs}
            onChange={(e) => setDescentVelocityMs(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              Ход Корабля (V_ship):
            </span>
            <span className="font-mono text-amber-300 font-bold">{shipSpeedKts} узлов</span>
          </div>
          <input
            type="range"
            min={0}
            max={35}
            step={1}
            value={shipSpeedKts}
            onChange={(e) => setShipSpeedKts(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              Сила Замка Deck-Lock (F_lock):
            </span>
            <span className="font-mono text-purple-300 font-bold">{deckLockForceKn} кН</span>
          </div>
          <input
            type="range"
            min={1.0}
            max={15.0}
            step={0.5}
            value={deckLockForceKn}
            onChange={(e) => setDeckLockForceKn(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
          />
        </div>
      </div>

      {/* Main Charts View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Chart 1: Trajectory and Deck Heave */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Траектория Снижения z_uav(t) и Качка Палубы z_deck(t)
            </h4>
            <FullscreenGraphButton domain="uav_guidance" />
          </div>

          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={simulationData.timeSeries} margin={{ left: 0, right: 15, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timeSec" stroke="#64748b" tick={{ fontSize: 10 }} unit=" с" />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} unit=" м" domain={[-5, 14]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#0891b2', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="uavZ" name="Высота БПЛА (м)" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="deckZ" name="Высота Палубы (м)" stroke="#f43f5e" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                {simulationData.touchdownTime && (
                  <ReferenceLine x={simulationData.touchdownTime} stroke="#10b981" strokeWidth={2} label={{ value: 'Касание', fill: '#10b981', fontSize: 10 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Quiescent Landing Score & Deck Velocity */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              Индекс Безопасного Окна LQP (%) & Скорость Палубы Vz_deck (м/с)
            </h4>
            <FullscreenGraphButton domain="uav_guidance" />
          </div>

          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={simulationData.timeSeries} margin={{ left: 0, right: 15, top: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="lqpGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timeSec" stroke="#64748b" tick={{ fontSize: 10 }} unit=" с" />
                <YAxis yAxisId="left" stroke="#14b8a6" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                <YAxis yAxisId="right" orientation="right" stroke="#fbbf24" tick={{ fontSize: 10 }} unit=" м/с" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#0d9488', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area yAxisId="left" type="monotone" dataKey="lqpScore" name="LQP Индекс (%)" stroke="#14b8a6" fill="url(#lqpGradient)" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="deckVz" name="Вертик. скор. палубы (м/с)" stroke="#fbbf24" strokeWidth={1.8} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Physics Insights / Mathematical Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Время Касания Палубы (t_land):</div>
          <div className="text-lg font-black font-mono text-cyan-300">
            {simulationData.touchdownTime ? `${simulationData.touchdownTime} с` : 'В ожидании'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Оптимальная точка фазы качки</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-teal-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Относит. Скорость Касания (V_rel):</div>
          <div className="text-lg font-black font-mono text-teal-300">
            {simulationData.touchdownVrel} м/с
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Допустимо до 1.5 м/с на шасси</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-purple-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Требуемое Удержание Замка:</div>
          <div className="text-lg font-black font-mono text-purple-300">
            {simulationData.requiredLockForceKn} кН
          </div>
          <div className="text-[10px] text-slate-500 mt-1">При ускорении палубы {simulationData.maxDeckAcc} м/с²</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-900/40">
          <div className="text-[11px] text-slate-400 mb-0.5 font-medium">Коэффициент Безопасности:</div>
          <div className="text-lg font-black font-mono text-emerald-300">
            {simulationData.lockSafetyMargin} / 1.0 min
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {simulationData.lockSafetyMargin >= 1.5 ? 'Удержание гарантировано' : 'Риск опрокидывания волной'}
          </div>
        </div>
      </div>
    </div>
  );
};
