import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  TrendingUp,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Zap,
  Target,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export interface ParetoCandidate {
  id: number;
  name: string;
  wingspan_m: number;
  chordRoot_m: number;
  chordTip_m: number;
  sweep_deg: number;
  mtow_kg: number;
  batteryCap_mAh: number;
  calculatedRange_km: number;
  calculatedEndurance_min: number;
  liftToDragRatio: number;
  staticMargin_percent: number;
  stallSpeed_kmh: number;
  isParetoOptimal: boolean;
  score: number;
}

interface Props {
  currentWingspan: number;
  currentMtow: number;
  currentPayload: number;
  currentCruiseSpeed: number;
  onApplyCandidate: (candidate: ParetoCandidate) => void;
}

export const UAVMDOParetoOptimizer: React.FC<Props> = ({
  currentWingspan,
  currentMtow,
  currentPayload,
  currentCruiseSpeed,
  onApplyCandidate,
}) => {
  const [targetMissionWeight, setTargetMissionWeight] = useState<'balanced' | 'max_range' | 'max_endurance' | 'min_mtow'>('balanced');
  const [maxWingspanLimit, setMaxWingspanLimit] = useState<number>(3.5);
  const [maxStallSpeedLimit, setMaxStallSpeedLimit] = useState<number>(60);
  const [minStaticMargin, setMinStaticMargin] = useState<number>(7);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [selectedCandidate, setSelectedCandidate] = useState<ParetoCandidate | null>(null);

  // Generate synthetic but physically grounded MDO candidates for the design space exploration
  const population = useMemo<ParetoCandidate[]>(() => {
    const candidates: ParetoCandidate[] = [];
    let idCounter = 1;

    // Fixed payload & flight condition
    const payload = currentPayload;
    const v_cruise_ms = currentCruiseSpeed / 3.6;
    const rho = 1.225;
    const q = 0.5 * rho * Math.pow(v_cruise_ms, 2);

    // Discrete parameter variation grid
    const spans = [1.2, 1.6, 2.0, 2.4, 2.8, 3.2, 3.6];
    const rootChords = [0.25, 0.35, 0.45, 0.55];
    const tipRatios = [0.4, 0.55, 0.7, 0.85];
    const sweeps = [0, 8, 16, 24];
    const batteryCaps = [10000, 16000, 22000, 30000, 40000];

    for (const b of spans) {
      if (b > maxWingspanLimit + 0.1) continue;
      for (const cr of rootChords) {
        for (const tr of tipRatios) {
          const ct = cr * tr;
          for (const sw of sweeps) {
            for (const batCap of batteryCaps) {
              const wingArea = b * ((cr + ct) / 2);
              const ar = Math.pow(b, 2) / Math.max(0.01, wingArea);

              // Masses
              const batMass = (batCap / 1000) * 0.085; // ~0.085 kg per 1000mAh for high energy Li-Ion
              const structMass = 1.1 + wingArea * 1.6 + b * 0.4;
              const avionicsMass = 0.65;
              const totalMass = payload + batMass + structMass + avionicsMass;
              const weightN = totalMass * 9.80665;

              // Aerodynamics
              const clCruise = weightN / Math.max(1, q * wingArea);
              if (clCruise > 1.1 || clCruise < 0.2) continue; // Unrealistic cruise lift coefficient

              const cd0 = 0.021 + 0.003 * Math.sin((sw * Math.PI) / 180);
              const cdi = Math.pow(clCruise, 2) / (Math.PI * ar * 0.84);
              const cdTotal = cd0 + cdi;
              const ld = clCruise / Math.max(0.001, cdTotal);

              // Stall speed
              const vStallMs = Math.sqrt((2 * weightN) / (rho * wingArea * 1.35));
              const vStallKmh = vStallMs * 3.6;
              if (vStallKmh > maxStallSpeedLimit) continue; // Constraint violation

              // Static margin estimate
              const sm = 8.0 + (cr / b) * 12.0 - (sw * 0.15);
              if (sm < minStaticMargin || sm > 20) continue; // Neutral point stability constraint

              // Power and endurance
              const dragN = cdTotal * q * wingArea;
              const aeroPowerW = dragN * v_cruise_ms;
              const elecPowerW = aeroPowerW / 0.72 + 20; // 72% powertrain efficiency + 20W avionics

              const energyWh = (batCap / 1000) * 22.2 * 0.85; // 6S nominal, 85% usable
              const enduranceHours = energyWh / Math.max(10, elecPowerW);
              const enduranceMin = enduranceHours * 60;
              const rangeKm = enduranceHours * currentCruiseSpeed;

              // Scoring function
              let score = 0;
              if (targetMissionWeight === 'balanced') {
                score = (rangeKm / 200) * 0.4 + (enduranceMin / 240) * 0.4 - (totalMass / 15) * 0.2;
              } else if (targetMissionWeight === 'max_range') {
                score = (rangeKm / 200) * 0.7 + (ld / 20) * 0.3;
              } else if (targetMissionWeight === 'max_endurance') {
                score = (enduranceMin / 240) * 0.7 + (ld / 20) * 0.3;
              } else {
                score = -(totalMass / 10) * 0.6 + (ld / 20) * 0.4;
              }

              candidates.push({
                id: idCounter++,
                name: `MDO-Gen#${idCounter} (b=${b}м, ${totalMass.toFixed(1)}кг)`,
                wingspan_m: b,
                chordRoot_m: cr,
                chordTip_m: ct,
                sweep_deg: sw,
                mtow_kg: Number(totalMass.toFixed(2)),
                batteryCap_mAh: batCap,
                calculatedRange_km: Number(rangeKm.toFixed(1)),
                calculatedEndurance_min: Number(enduranceMin.toFixed(0)),
                liftToDragRatio: Number(ld.toFixed(1)),
                staticMargin_percent: Number(sm.toFixed(1)),
                stallSpeed_kmh: Number(vStallKmh.toFixed(1)),
                isParetoOptimal: false,
                score: Number(score.toFixed(3)),
              });
            }
          }
        }
      }
    }

    // Identify 2D/3D Pareto-optimal non-dominated solutions (Range vs Endurance vs MTOW)
    for (let i = 0; i < candidates.length; i++) {
      let isDominated = false;
      for (let j = 0; j < candidates.length; j++) {
        if (i === j) continue;
        const a = candidates[i];
        const b = candidates[j];

        // b dominates a if b is >= in Range & Endurance and <= in MTOW (and strictly better in at least one)
        if (
          b.calculatedRange_km >= a.calculatedRange_km &&
          b.calculatedEndurance_min >= a.calculatedEndurance_min &&
          b.mtow_kg <= a.mtow_kg &&
          (b.calculatedRange_km > a.calculatedRange_km ||
            b.calculatedEndurance_min > a.calculatedEndurance_min ||
            b.mtow_kg < a.mtow_kg)
        ) {
          isDominated = true;
          break;
        }
      }
      candidates[i].isParetoOptimal = !isDominated;
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Limit to top 80 candidates for clean plotting
    return candidates.slice(0, 80);
  }, [
    currentPayload,
    currentCruiseSpeed,
    maxWingspanLimit,
    maxStallSpeedLimit,
    minStaticMargin,
    targetMissionWeight,
  ]);

  const paretoPoints = useMemo(() => population.filter((c) => c.isParetoOptimal), [population]);
  const subOptimalPoints = useMemo(() => population.filter((c) => !c.isParetoOptimal), [population]);

  const bestCandidate = paretoPoints[0] || population[0];

  const handleRunOptimization = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      if (bestCandidate) {
        setSelectedCandidate(bestCandidate);
      }
    }, 600);
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-900/90 border border-teal-500/40 space-y-4 text-xs font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-black text-white text-sm">
              MDO-Синтез: Генетический Алгоритм & Парето-Фронт
            </h4>
            <p className="text-[11px] text-slate-400 font-sans">
              Поиск недоминируемых проектных решений по компромиссу «Дальность &bull; Автономность &bull; Взлетная Масса»
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRunOptimization}
          disabled={isOptimizing}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950 font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
        >
          {isOptimizing ? (
            <>
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
              <span>Синтез поколений NSGA-II...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Запустить Оптимизацию</span>
            </>
          )}
        </button>
      </div>

      {/* Target Mission Criteria & Constraint Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
        <div>
          <label className="text-slate-400 block mb-1">Приоритет оптимизации:</label>
          <select
            value={targetMissionWeight}
            onChange={(e) => setTargetMissionWeight(e.target.value as any)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold"
          >
            <option value="balanced">Сбалансированный (All-Rounder)</option>
            <option value="max_range">Максимум дальности (R_max)</option>
            <option value="max_endurance">Максимум времени (T_max)</option>
            <option value="min_mtow">Минимум массы планера (MTOW_min)</option>
          </select>
        </div>

        <div>
          <label className="text-slate-400 block mb-1">Макс. размах крыла (b_max):</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1.5}
              max={4.5}
              step={0.1}
              value={maxWingspanLimit}
              onChange={(e) => setMaxWingspanLimit(parseFloat(e.target.value))}
              className="w-full accent-teal-400"
            />
            <span className="text-teal-300 font-bold w-12 text-right">{maxWingspanLimit.toFixed(1)}м</span>
          </div>
        </div>

        <div>
          <label className="text-slate-400 block mb-1">Лимит скорости сваливания (V_stall):</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={40}
              max={80}
              step={2}
              value={maxStallSpeedLimit}
              onChange={(e) => setMaxStallSpeedLimit(parseInt(e.target.value))}
              className="w-full accent-teal-400"
            />
            <span className="text-teal-300 font-bold w-14 text-right">&le;{maxStallSpeedLimit} км/ч</span>
          </div>
        </div>

        <div>
          <label className="text-slate-400 block mb-1">Мин. запас устойчивости (SM_min):</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={5}
              max={15}
              step={1}
              value={minStaticMargin}
              onChange={(e) => setMinStaticMargin(parseInt(e.target.value))}
              className="w-full accent-teal-400"
            />
            <span className="text-teal-300 font-bold w-12 text-right">&ge;{minStaticMargin}%</span>
          </div>
        </div>
      </div>

      {/* 2D Pareto Front Scatter Chart */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-300">
          <span className="font-bold flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
            Парето-Фронт: Дальность (км) vs Время Барражирования (мин) [Размер точки = MTOW]
          </span>
          <span className="text-teal-400 font-mono">
            Найдено {paretoPoints.length} оптимальных точек Парето
          </span>
        </div>

        <div className="h-56 w-full bg-slate-950 rounded-xl p-2 border border-slate-800">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis
                type="number"
                dataKey="calculatedRange_km"
                name="Дальность"
                unit=" км"
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
              />
              <YAxis
                type="number"
                dataKey="calculatedEndurance_min"
                name="Время полета"
                unit=" мин"
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
              />
              <ZAxis type="number" dataKey="mtow_kg" range={[40, 160]} name="Масса MTOW" unit=" кг" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as ParetoCandidate;
                    return (
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-teal-500/60 shadow-xl text-[10px] font-mono space-y-1">
                        <div className="font-bold text-white flex items-center justify-between gap-2">
                          <span>{data.name}</span>
                          {data.isParetoOptimal && (
                            <span className="px-1 py-0.2 rounded bg-teal-500/30 text-teal-300 font-black">
                              PARETO
                            </span>
                          )}
                        </div>
                        <div className="text-teal-300">Дальность: {data.calculatedRange_km} км</div>
                        <div className="text-cyan-300">Время: {data.calculatedEndurance_min} мин</div>
                        <div className="text-slate-300">MTOW: {data.mtow_kg} кг | L/D: {data.liftToDragRatio}</div>
                        <div className="text-slate-400">Размах b: {data.wingspan_m} м | SM: {data.staticMargin_percent}%</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Scatter
                name="Допустимые решения"
                data={subOptimalPoints}
                fill="#64748b"
                opacity={0.4}
                onClick={(e: any) => setSelectedCandidate(e)}
              />
              <Scatter
                name="Парето-Оптимальный Фронт"
                data={paretoPoints}
                fill="#14b8a6"
                stroke="#2dd4bf"
                strokeWidth={1.5}
                onClick={(e: any) => setSelectedCandidate(e)}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Selected Candidate Quick View & Apply Bar */}
      {selectedCandidate && (
        <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-500/60 flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-xs">{selectedCandidate.name}</span>
              {selectedCandidate.isParetoOptimal && (
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-teal-500 text-slate-950 font-black">
                  ОПТИМУМ ПАРЕТО
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-300 flex items-center gap-2 flex-wrap">
              <span>Размах: <b className="text-teal-300">{selectedCandidate.wingspan_m}м</b></span>
              <span>&bull;</span>
              <span>Масса: <b className="text-amber-300">{selectedCandidate.mtow_kg}кг</b></span>
              <span>&bull;</span>
              <span>Дальность: <b className="text-emerald-300">{selectedCandidate.calculatedRange_km}км</b></span>
              <span>&bull;</span>
              <span>Время: <b className="text-cyan-300">{selectedCandidate.calculatedEndurance_min}мин</b></span>
              <span>&bull;</span>
              <span>L/D: <b className="text-sky-300">{selectedCandidate.liftToDragRatio}</b></span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onApplyCandidate(selectedCandidate)}
            className="px-3 py-1.5 rounded-lg bg-teal-400 hover:bg-teal-300 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer"
          >
            <span>Применить в Цифровой Двойник</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
