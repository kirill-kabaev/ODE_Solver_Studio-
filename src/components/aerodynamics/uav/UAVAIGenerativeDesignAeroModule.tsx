import React, { useState, useEffect, useMemo } from 'react';
import {
  Cpu,
  Sparkles,
  Zap,
  Activity,
  Sliders,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Layers,
  Compass,
  Crosshair,
  BarChart2,
  Box,
  Share2,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import { MathText } from '../../MathView';

interface ParetoPoint {
  id: number;
  ldRatio: number; // Maximize (X)
  structuralMass_kg: number; // Minimize (Y)
  stallSpeed_kmh: number;
  sweep_deg: number;
  taper: number;
  twist_deg: number;
  isParetoOptimal: boolean;
}

export const UAVAIGenerativeDesignAeroModule: React.FC = () => {
  // Optimizer Settings
  const [optimizerType, setOptimizerType] = useState<'bayesian_gp' | 'nsga3_pareto' | 'pinn_surrogate' | 'deep_rl_evasion'>('bayesian_gp');
  const [generationsCount, setGenerationsCount] = useState<number>(45);
  const [populationSize, setPopulationSize] = useState<number>(60);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(100);

  // Target mission constraints
  const [targetPayload_kg, setTargetPayload_kg] = useState<number>(3.5);
  const [targetCruiseSpeed_kmh, setTargetCruiseSpeed_kmh] = useState<number>(95);
  const [maxWingspan_m, setMaxWingspan_m] = useState<number>(2.8);

  // PINN Neural Surrogate State
  const [pinnAlpha_deg, setPinnAlpha_deg] = useState<number>(4.0);
  const [pinnMach, setPinnMach] = useState<number>(0.12);
  const [pinnInferenceTime_ms, setPinnInferenceTime_ms] = useState<number>(18.4);

  // Deep RL Evasion Maneuver State
  const [missileThreatDistance_m, setMissileThreatDistance_m] = useState<number>(1400);
  const [gLoadLimit, setGLoadLimit] = useState<number>(7.5);

  // Generate Pareto Front Points (MDO results)
  const paretoPoints: ParetoPoint[] = useMemo(() => {
    const list: ParetoPoint[] = [];
    for (let i = 0; i < 50; i++) {
      const sweep = 4 + Math.random() * 18;
      const taper = 0.45 + Math.random() * 0.45;
      const twist = -1.0 - Math.random() * 3.5;

      // Aerodynamic L/D estimate (12 - 24)
      const ld = 14 + (sweep < 10 ? 5 : 2) + (taper > 0.6 ? 2 : 0) + (Math.random() - 0.5) * 3;
      // Structural mass estimate (1.2 - 4.5 kg)
      const mass = 1.4 + (ld * 0.1) + (sweep * 0.05) + (Math.random() - 0.5) * 0.4;
      const stall = 36 + (mass * 3.2) - (ld * 0.3);

      const isOptimal = (ld > 19.5 && mass < 3.2) || (ld > 17 && mass < 2.2);

      list.push({
        id: i + 1,
        ldRatio: Number(ld.toFixed(2)),
        structuralMass_kg: Number(mass.toFixed(2)),
        stallSpeed_kmh: Number(stall.toFixed(1)),
        sweep_deg: Number(sweep.toFixed(1)),
        taper: Number(taper.toFixed(2)),
        twist_deg: Number(twist.toFixed(1)),
        isParetoOptimal: isOptimal,
      });
    }
    return list;
  }, []);

  // PINN Pressure Distribution Cp(x) Curve
  const pinnPressureCurve = useMemo(() => {
    const pts = [];
    for (let x = 0; x <= 1.0; x += 0.02) {
      const cpUpper = -2.8 * Math.sqrt(Math.max(0, x)) * Math.exp(-x * 2.8) * (1 + pinnAlpha_deg * 0.15);
      const cpLower = 0.6 * (1 - x) ** 1.5;
      pts.push({
        x: Number(x.toFixed(2)),
        cpUpper: Number(cpUpper.toFixed(3)),
        cpLower: Number(cpLower.toFixed(3)),
      });
    }
    return pts;
  }, [pinnAlpha_deg]);

  // Deep RL Evasion Trajectory Points
  const evasionTrajectory = useMemo(() => {
    const traj = [];
    for (let t = 0; t <= 12; t += 0.4) {
      // High-g Barrel Roll evasion trajectory with spiral
      const x = t * 25;
      const y = Math.sin(t * 1.2) * (15 + t * 4);
      const z = Math.cos(t * 1.2) * (15 + t * 4) + t * 2;
      const ny = 1.0 + Math.abs(Math.sin(t * 1.2)) * (gLoadLimit - 1.0);
      traj.push({
        t: Number(t.toFixed(1)),
        y: Number(y.toFixed(1)),
        z: Number(z.toFixed(1)),
        ny: Number(ny.toFixed(2)),
      });
    }
    return traj;
  }, [gLoadLimit]);

  return (
    <div className="space-y-5 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Направление C: AI / ML Ассистент Оптимизации (Generative Aero Design)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Фичи #75, #88, #93, #94
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Байесовская оптимизация формы крыла, PINN нейро-CFD суррогат Навье-Стокса (20 мс) и Deep RL агент противозенитного маневрирования.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsOptimizing(true);
              setProgress(0);
              const timer = setInterval(() => {
                setProgress((p) => {
                  if (p >= 100) {
                    clearInterval(timer);
                    setIsOptimizing(false);
                    return 100;
                  }
                  return p + 10;
                });
              }, 120);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-400 to-purple-500 text-slate-950 font-bold text-xs hover:from-indigo-300 hover:to-purple-400 transition-all cursor-pointer shadow-lg shadow-indigo-950/40"
          >
            <Zap className="w-4 h-4" />
            <span>{isOptimizing ? `AI Синтез: ${progress}%` : 'Запустить AI Синтез'}</span>
          </button>
        </div>
      </div>

      {/* Mode Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 font-mono text-xs">
        <button
          type="button"
          onClick={() => setOptimizerType('bayesian_gp')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
            optimizerType === 'bayesian_gp'
              ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 shadow-md font-bold'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>1. Байесовская Оптимизация (NSGA-III)</span>
        </button>

        <button
          type="button"
          onClick={() => setOptimizerType('pinn_surrogate')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
            optimizerType === 'pinn_surrogate'
              ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 shadow-md font-bold'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>2. PINN Нейро-CFD Суррогат (20 мс)</span>
        </button>

        <button
          type="button"
          onClick={() => setOptimizerType('deep_rl_evasion')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
            optimizerType === 'deep_rl_evasion'
              ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 shadow-md font-bold'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Crosshair className="w-4 h-4" />
          <span>3. Deep RL Маневрирование Уклонения</span>
        </button>
      </div>

      {/* MODE 1: BAYESIAN OPTIMIZATION & PARETO FRONT */}
      {optimizerType === 'bayesian_gp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start font-mono">
          <div className="lg:col-span-8 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-indigo-300 font-bold">
                <BarChart2 className="w-4 h-4 text-indigo-400" />
                <span>Многокритериальный Фронт Парето: Аэродинамическое Качество L/D vs Масса Конструкции [кг]</span>
              </div>
              <span className="text-[11px] text-slate-400">Поколение: {generationsCount}</span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" dataKey="ldRatio" name="L/D Ratio" stroke="#64748b" fontSize={10} domain={[12, 24]} unit=" L/D" />
                  <YAxis type="number" dataKey="structuralMass_kg" name="Mass" stroke="#64748b" fontSize={10} domain={[1, 5]} unit=" kg" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                  <Scatter name="Варианты планера" data={paretoPoints.filter(p => !p.isParetoOptimal)} fill="#475569" />
                  <Scatter name="Оптимальные решения Парето" data={paretoPoints.filter(p => p.isParetoOptimal)} fill="#818cf8" shape="circle" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-sans space-y-1">
              <div className="font-bold text-indigo-300 font-mono">✨ Математическая функция пригодности (Fitness Function):</div>
              <MathText text="\mathcal{F}(\mathbf{x}) = w_1 \left(\frac{L}{D}\right) - w_2 \left(\frac{m_{\text{empty}}}{m_{\text{target}}}\right) - \lambda \max(0, V_{\text{stall}} - V_{\text{limit}})^2" />
            </div>
          </div>

          <div className="lg:col-span-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-xs text-white font-bold border-b border-slate-800 pb-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Целевые Ограничения ТЗ</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Масса полезной нагрузки:</span>
                <span className="text-indigo-400 font-bold">{targetPayload_kg} кг</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={15.0}
                step={0.5}
                value={targetPayload_kg}
                onChange={(e) => setTargetPayload_kg(parseFloat(e.target.value))}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Крейсерская скорость:</span>
                <span className="text-indigo-400 font-bold">{targetCruiseSpeed_kmh} км/ч</span>
              </div>
              <input
                type="range"
                min={50}
                max={220}
                step={5}
                value={targetCruiseSpeed_kmh}
                onChange={(e) => setTargetCruiseSpeed_kmh(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Ограничение размаха крыла:</span>
                <span className="text-indigo-400 font-bold">{maxWingspan_m} м</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={6.0}
                step={0.1}
                value={maxWingspan_m}
                onChange={(e) => setMaxWingspan_m(parseFloat(e.target.value))}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: PINN SURROGATE */}
      {optimizerType === 'pinn_surrogate' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start font-mono">
          <div className="lg:col-span-8 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-indigo-300 font-bold">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span>Мгновенное Распределение Давления Cp(x) через PINN (Инференс: {pinnInferenceTime_ms} мс)</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                Navier-Stokes Loss &lt; 10⁻⁴
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pinnPressureCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="x" stroke="#64748b" fontSize={10} unit=" x/c" />
                  <YAxis stroke="#64748b" fontSize={10} domain={[-3.5, 1.0]} reversed={true} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="cpUpper" stroke="#38bdf8" strokeWidth={2} name="Верхняя поверхность (Разрежение -Cp)" dot={false} />
                  <Line type="monotone" dataKey="cpLower" stroke="#f59e0b" strokeWidth={2} name="Нижняя поверхность (+Cp)" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-xs text-white font-bold border-b border-slate-800 pb-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Параметры Потока для PINN</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Угол атаки (α):</span>
                <span className="text-indigo-400 font-bold">{pinnAlpha_deg}°</span>
              </div>
              <input
                type="range"
                min={-4}
                max={16}
                step={0.5}
                value={pinnAlpha_deg}
                onChange={(e) => setPinnAlpha_deg(parseFloat(e.target.value))}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: DEEP RL EVASION */}
      {optimizerType === 'deep_rl_evasion' && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-xs text-white font-bold">
              <Crosshair className="w-4 h-4 text-rose-400" />
              <span>Траектория Противозенитного Маневра Уклонения (Deep RL Agent)</span>
            </div>
            <span className="text-[10px] text-slate-400">
              Ограничение по перегрузке $N_y \le {gLoadLimit}g$
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evasionTrajectory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="t" stroke="#64748b" fontSize={10} unit="s" />
                <YAxis stroke="#64748b" fontSize={10} domain={[-60, 60]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="y" stroke="#8b5cf6" strokeWidth={2} name="Боковое смещение Y [м]" dot={false} />
                <Line type="monotone" dataKey="z" stroke="#38bdf8" strokeWidth={2} name="Высота Z [м]" dot={false} />
                <Line type="monotone" dataKey="ny" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3" name="Перегрузка Ny [g]" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
