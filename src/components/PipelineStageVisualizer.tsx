import React from 'react';
import { PipelineStageTelemetry } from '../types/sparse';
import { Shuffle, Layers, Gauge, CheckCircle2, ArrowRight, Zap, Network } from 'lucide-react';
import { MathText } from './MathView';

interface PipelineStageVisualizerProps {
  telemetry?: PipelineStageTelemetry;
}

export const PipelineStageVisualizer: React.FC<PipelineStageVisualizerProps> = ({ telemetry }) => {
  if (!telemetry) return null;

  const { ordering, preconditioner, krylovIteration, totalPipelineTimeMs } = telemetry;

  return (
    <div className="bg-slate-900/95 border border-cyan-500/30 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 relative overflow-hidden backdrop-blur-md">
      {/* Decorative gradient glow */}
      <div className="absolute top-0 right-0 w-96 h-40 bg-cyan-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-300">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <span>Индустриальный 3-х стадийный конвейер решения СЛАУ</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-mono">
                {totalPipelineTimeMs.toFixed(2)} мс всего
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              <MathText text="$\\text{METIS/AMD (перенумерация)} \\longrightarrow \\text{ILU/AMG (предобусловливание)} \\longrightarrow \\text{GMRES / BiCGSTAB}$" />
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-lg">
          <CheckCircle2 className="w-4 h-4" />
          <span>Сквозная оптимизация памяти & кэша</span>
        </div>
      </div>

      {/* 3 Interactive Pipeline Cards in Sequence */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 relative">
        {/* Stage 1: Ordering */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between hover:border-cyan-500/40 transition-all">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider uppercase text-cyan-400 flex items-center gap-1.5">
                <Shuffle className="w-3.5 h-3.5" />
                Стадия 1: Графовая Перенумерация
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {ordering.timeMs.toFixed(2)} мс
              </span>
            </div>
            <div className="font-semibold text-sm text-slate-200">{ordering.method}</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Минимизирует ширину ленты $\beta(A)$ и устраняет fill-in факторизации, группируя сильно связанные узлы графа в кэше L1/L2.
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Сжатие полосы:</span>
            <span className="font-mono text-cyan-300 font-bold">
              {ordering.originalBandwidth} ➔ {ordering.permutedBandwidth} (-{ordering.bandwidthReductionPercent}%)
            </span>
          </div>
        </div>

        {/* Stage 2: Preconditioning */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between hover:border-indigo-500/40 transition-all">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Стадия 2: Предобусловливатель
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {preconditioner.setupTimeMs.toFixed(2)} мс
              </span>
            </div>
            <div className="font-semibold text-sm text-slate-200">{preconditioner.method}</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {preconditioner.coarseLevelsCount
                ? `Построена иерархия из ${preconditioner.coarseLevelsCount} сеточных уровней для мгновенного гашения длинноволновых мод ошибки.`
                : 'Построена неполная LU-факторизация без заполнения, сжимающая спектральное число обусловленности.'}
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Сжатие спектра $\kappa(M^{-1}A)$:</span>
            <span className="font-mono text-indigo-300 font-bold">
              ~{preconditioner.spectralConditioningFactor.toFixed(1)}x улучшение
            </span>
          </div>
        </div>

        {/* Stage 3: Krylov Iteration */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between hover:border-emerald-500/40 transition-all">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5" />
                Стадия 3: Крыловский Солвер
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {krylovIteration.timeMs.toFixed(2)} мс
              </span>
            </div>
            <div className="font-semibold text-sm text-slate-200">{krylovIteration.solver}</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Итерационная минимизация невязки в пространстве Крылова с предсказуемой монотонной скоростью $q \approx {krylovIteration.rateOfConvergence.toFixed(3)}$.
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Итераций / среднее время:</span>
            <span className="font-mono text-emerald-300 font-bold">
              {krylovIteration.iterations} итер. ({krylovIteration.avgTimePerIterMs.toFixed(2)} мс/ит)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
