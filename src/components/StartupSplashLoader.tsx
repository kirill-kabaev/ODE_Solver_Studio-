import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Zap,
  Cpu,
  Layers,
  Database,
  Calculator,
  Rocket,
  Activity,
  ArrowRight,
  CheckCircle2,
  Boxes,
  Flame,
  LineChart,
  HardDrive,
  Compass,
  Monitor,
  ShieldCheck,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import { MathText } from './MathView';
import { StudioMainMode } from './AppHeader';

interface StartupSplashLoaderProps {
  onComplete: (selectedMode?: StudioMainMode) => void;
  isReopened?: boolean;
  onClose?: () => void;
}

interface MilestoneStep {
  percentThreshold: number;
  title: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
}

const MILESTONES: MilestoneStep[] = [
  {
    percentThreshold: 15,
    title: 'Инициализация математического ядра',
    detail: 'Загрузка структур CSR/COO, матричных операторов SpMV и числовых форматов Float64...',
    icon: Boxes,
    tag: 'MATH CORE',
  },
  {
    percentThreshold: 35,
    title: 'Детекция аппаратных ускорителей',
    detail: 'Опрос дискретных видеокарт NVIDIA GeForce RTX (CUDA Cores) и многопоточности CPU...',
    icon: Cpu,
    tag: 'HARDWARE ACCEL',
  },
  {
    percentThreshold: 60,
    title: 'Синхронизация каталога Texas A&M SuiteSparse',
    detail: 'Подключение 131+ эталонных разреженных матриц мирового репозитория (до N = 41.2M+)...',
    icon: Database,
    tag: 'SUITESPARSE 41M+',
  },
  {
    percentThreshold: 82,
    title: 'Калибровка 3-х стадийного конвейера',
    detail: 'METIS/AMD (перенумерация) ⟶ ILU/AMG (предобусловливание) ⟶ GMRES/BiCGSTAB (Крылов)...',
    icon: Layers,
    tag: 'PIPELINE READY',
  },
  {
    percentThreshold: 96,
    title: 'Построение 3D движка дифференциальных уравнений',
    detail: 'Инициализация 3D тепловых карт, векторных полей RK4 и символьного ИИ-анализатора...',
    icon: Flame,
    tag: '3D PDE & CAS',
  },
  {
    percentThreshold: 100,
    title: 'Вычислительная платформа полностью готова!',
    detail: 'Все модули синхронизированы. Нажмите «Войти» или выберите режим работы...',
    icon: CheckCircle2,
    tag: 'SYSTEM READY',
  },
];

export const StartupSplashLoader: React.FC<StartupSplashLoaderProps> = ({
  onComplete,
  isReopened = false,
  onClose,
}) => {
  const [progress, setProgress] = useState<number>(isReopened ? 100 : 0);
  const [isCompleted, setIsCompleted] = useState<boolean>(isReopened);
  const [selectedHighlight, setSelectedHighlight] = useState<'sparse' | 'ode' | 'pipeline'>('sparse');
  const [autoEnterCountdown, setAutoEnterCountdown] = useState<number | null>(isReopened ? null : 3);

  // Smooth loading progression loop
  useEffect(() => {
    if (isReopened) return;

    let currentProgress = 0;
    const interval = setInterval(() => {
      // Non-linear realistic progress increments
      const increment =
        currentProgress < 30
          ? Math.random() * 3.5 + 1.5
          : currentProgress < 70
          ? Math.random() * 2.8 + 1.2
          : currentProgress < 95
          ? Math.random() * 3.2 + 1.8
          : 1.5;

      currentProgress += increment;

      if (currentProgress >= 100) {
        currentProgress = 100;
        setProgress(100);
        setIsCompleted(true);
        clearInterval(interval);
      } else {
        setProgress(Math.min(99, Math.round(currentProgress)));
      }
    }, 45);

    return () => clearInterval(interval);
  }, [isReopened]);

  // Current active milestone
  const activeMilestone = useMemo(() => {
    for (let i = 0; i < MILESTONES.length; i++) {
      if (progress <= MILESTONES[i].percentThreshold) {
        return MILESTONES[i];
      }
    }
    return MILESTONES[MILESTONES.length - 1];
  }, [progress]);

  const IconComponent = activeMilestone.icon;

  const handleLaunch = (mode?: StudioMainMode) => {
    onComplete(mode);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-between p-4 sm:p-8 overflow-y-auto select-none">
      {/* Dynamic Background Glow & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(6,182,212,0.15),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_110%,rgba(99,102,241,0.15),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a15_1px,transparent_1px),linear-gradient(to_bottom,#0f172a15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Top Header with Brand & Close (if reopened) */}
      <div className="w-full max-w-6xl flex items-center justify-between z-10 pt-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600 text-slate-950 shadow-xl shadow-cyan-500/20 font-extrabold text-lg">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-wider bg-gradient-to-r from-cyan-300 via-sky-100 to-indigo-300 bg-clip-text text-transparent">
                HIGH-PERFORMANCE COMPUTATIONAL STUDIO
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-bold tracking-widest uppercase">
                v3.0 PRO
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              СЛАУ Сверхбольших Систем ($Ax = b$) & Дифференциальные Уравнения (2D/3D)
            </p>
          </div>
        </div>

        {isReopened && onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Закрыть визитку и вернуться к студии"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Central Interactive Loading Core & Feature Showcase */}
      <div className="w-full max-w-6xl my-auto py-6 flex flex-col items-center gap-8 z-10">
        {/* ========================================================================= */}
        {/* ROTATING QUANTUM LOADER RING & DYNAMIC STATUS                             */}
        {/* ========================================================================= */}
        <div className="flex flex-col items-center text-center gap-5 max-w-2xl w-full">
          {/* Animated Orbital Energy Ring with Percentage Core */}
          <div className="relative flex items-center justify-center w-36 h-36 sm:w-44 sm:h-44">
            {/* Outer Slow Ambient Rotating Dashed Ring */}
            <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-[spin_12s_linear_infinite]" />

            {/* Middle Counter-Rotating Glowing Tech Ring */}
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-cyan-400 border-r-indigo-500 border-b-cyan-500/40 animate-[spin_3s_linear_infinite]" />

            {/* Inner Fast Energy Wave Ring */}
            <div className="absolute inset-5 rounded-full border border-dashed border-sky-400/60 animate-[spin_6s_linear_infinite_reverse]" />

            {/* Ambient Pulsating Glow Core */}
            <div className="absolute inset-8 rounded-full bg-gradient-to-br from-cyan-500/20 via-sky-500/10 to-indigo-500/20 backdrop-blur-md animate-pulse" />

            {/* Center Percentage Display & Milestone Icon */}
            <div className="flex flex-col items-center justify-center z-10">
              <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight bg-gradient-to-r from-white via-cyan-100 to-sky-300 bg-clip-text text-transparent">
                {progress}%
              </span>
              <div className="flex items-center gap-1 mt-0.5 text-cyan-400 text-xs font-mono font-semibold">
                <IconComponent className="w-3.5 h-3.5 animate-bounce" />
                <span className="text-[10px] tracking-wider uppercase">{activeMilestone.tag}</span>
              </div>
            </div>
          </div>

          {/* Dynamic Progress Bar */}
          <div className="w-full flex flex-col gap-2">
            <div className="w-full h-2.5 bg-slate-900/90 rounded-full p-0.5 border border-slate-800/80 overflow-hidden relative shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500 transition-all duration-150 ease-out shadow-[0_0_15px_rgba(6,182,212,0.6)] relative"
                style={{ width: `${progress}%` }}
              >
                {/* Glowing light spark at the leading edge */}
                <div className="absolute right-0 top-0 bottom-0 w-3 bg-white rounded-full shadow-[0_0_10px_#fff]" />
              </div>
            </div>

            {/* Dynamic Step Description */}
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
              <span className="text-cyan-300 font-semibold">{activeMilestone.title}</span>
              <span className="text-slate-500">{progress < 100 ? 'Загрузка...' : 'Готово'}</span>
            </div>
            <p className="text-xs text-slate-400/90 leading-relaxed max-w-xl mx-auto h-9 flex items-center justify-center">
              {activeMilestone.detail}
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BENTO-GRID SHOWCASE TILES: "ВЫБЕРИТЕ РАЗДЕЛ ДЛЯ РАБОТЫ"                   */}
        {/* ========================================================================= */}
        <div className="w-full flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs sm:text-sm font-bold text-slate-300 font-mono flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>НАЖМИТЕ НА ПЛИТКУ ДЛЯ ВХОДА В РАЗДЕЛ:</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">
              3 независимых вычислительных модуля
            </span>
          </div>

          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: ODE Diff Equations */}
            <div
              onClick={() => handleLaunch('ode')}
              className="p-5 rounded-2xl border transition-all flex flex-col justify-between gap-3.5 cursor-pointer relative overflow-hidden group shadow-lg bg-gradient-to-b from-purple-950/40 via-slate-900/90 to-slate-950/90 border-purple-500/40 hover:border-purple-400 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1 active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 group-hover:scale-110 group-hover:bg-purple-500/30 transition-all">
                  <Calculator className="w-6 h-6 text-purple-300" />
                </div>
                <span className="px-2.5 py-1 rounded-md bg-purple-950 text-purple-300 border border-purple-700/80 text-[10px] font-mono font-bold">
                  Символьный CAS + 3D
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors flex items-center justify-between">
                  <span>Решатель ДУ</span>
                  <ArrowRight className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Аналитическое пошаговое решение ОДУ, задача Коши, фазовые портреты с интегратором RK4 и 3D волновые уравнения / уравнения теплопроводности.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Коши • 3D Heatmap</span>
                <span className="px-3 py-1 rounded-lg bg-purple-500/20 group-hover:bg-purple-500 group-hover:text-slate-950 text-purple-300 font-bold transition-colors flex items-center gap-1.5">
                  Войти ⟶
                </span>
              </div>
            </div>

            {/* Card 2: Sparse Linear Systems Ax = b */}
            <div
              onClick={() => handleLaunch('sparse_linear')}
              className="p-5 rounded-2xl border transition-all flex flex-col justify-between gap-3.5 cursor-pointer relative overflow-hidden group shadow-lg bg-gradient-to-b from-cyan-950/40 via-slate-900/90 to-slate-950/90 border-cyan-500/40 hover:border-cyan-400 hover:shadow-xl hover:shadow-cyan-500/20 hover:-translate-y-1 active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 group-hover:scale-110 group-hover:bg-cyan-500/30 transition-all">
                  <Database className="w-6 h-6 text-cyan-300" />
                </div>
                <span className="px-2.5 py-1 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-700/80 text-[10px] font-mono font-bold">
                  N до 41.2M+
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center justify-between">
                  <span>Решатель СЛАУ</span>
                  <ArrowRight className="w-5 h-5 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Решение экстремальных разреженных матриц <MathText text="$Ax = b$" /> из коллекции Texas A&M SuiteSparse в форматах CSR/COO с 3-стадийным GPU CUDA конвейером.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">SuiteSparse • AMD • AMG</span>
                <span className="px-3 py-1 rounded-lg bg-cyan-500/20 group-hover:bg-cyan-500 group-hover:text-slate-950 text-cyan-300 font-bold transition-colors flex items-center gap-1.5">
                  Войти ⟶
                </span>
              </div>
            </div>

            {/* Card 3: Engineering Studio */}
            <div
              onClick={() => handleLaunch('engineering')}
              className="p-5 rounded-2xl border transition-all flex flex-col justify-between gap-3.5 cursor-pointer relative overflow-hidden group shadow-lg bg-gradient-to-b from-indigo-950/40 via-slate-900/90 to-slate-950/90 border-indigo-500/40 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/20 hover:-translate-y-1 active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 group-hover:scale-110 group-hover:bg-indigo-500/30 transition-all">
                  <Rocket className="w-6 h-6 text-indigo-300" />
                </div>
                <span className="px-2.5 py-1 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-700/80 text-[10px] font-mono font-bold">
                  CFD • GNC • EDA
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center justify-between">
                  <span>Инжиниринг</span>
                  <ArrowRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  3D Аэродинамика крыла VLM, аэродинамика воздушных винтов BEM, орбитальная баллистика GNC и схемотехника электрических RLC цепей EDA.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">VLM • BEM • Orbit • RLC</span>
                <span className="px-3 py-1 rounded-lg bg-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-slate-950 text-indigo-300 font-bold transition-colors flex items-center gap-1.5">
                  Войти ⟶
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info & Hardware Telemetry Indicators */}
      <div className="w-full max-w-6xl flex items-center justify-between border-t border-slate-900 pt-3 text-[11px] text-slate-500 font-mono z-10 shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>NVIDIA CUDA & WebGL Активны</span>
          </span>
          <span>•</span>
          <span>Float64 Двойная точность</span>
          <span>•</span>
          <span>Texas A&M SuiteSparse v2024</span>
        </div>

        <div className="flex items-center gap-3">
          <span>Нажмите на любую плитку выше для мгновенного входа в раздел</span>
        </div>
      </div>
    </div>
  );
};
