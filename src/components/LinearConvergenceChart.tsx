import React, { useMemo } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Zap,
  Clock,
  Gauge,
  Database,
  ArrowDownRight,
  Square,
  Timer,
  Cpu,
  Server,
  Layers,
  Sparkles,
  Share2,
} from 'lucide-react';
import { LinearSolverResult } from '../types/sparse';

interface LinearConvergenceChartProps {
  result: LinearSolverResult | null;
  tolerance?: number;
  height?: number;
}

export const LinearConvergenceChart: React.FC<LinearConvergenceChartProps> = ({
  result,
  tolerance = 1e-6,
  height = 320,
}) => {
  if (!result || result.history.length === 0) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-500 gap-2">
        <Activity className="w-8 h-8 text-slate-700 animate-pulse" />
        <span className="text-xs">Нажмите «Решить СЛАУ Ax = b» для запуска итерационного процесса</span>
      </div>
    );
  }

  const {
    history,
    converged,
    wasCancelled,
    iterations,
    elapsedTimeMs,
    gflops,
    finalRelativeResidual,
    exactError,
    computeDevice,
    cpuParallelInfo,
    gpuInfo,
    parallelTelemetry,
    notes,
  } = result;

  const isGpu = computeDevice === 'cuda_gpu';

  // Format Elapsed Execution Time
  const formattedTime = useMemo(() => {
    if (elapsedTimeMs < 1) {
      return `${(elapsedTimeMs * 1000).toFixed(0)} мкс`;
    }
    if (elapsedTimeMs < 1000) {
      return `${elapsedTimeMs.toFixed(1)} мс`;
    }
    const sec = (elapsedTimeMs / 1000).toFixed(3);
    return `${sec} с (${elapsedTimeMs.toFixed(0)} мс)`;
  }, [elapsedTimeMs]);

  // Prepare logarithmic data points for SVG chart
  const chartPoints = useMemo(() => {
    if (!history.length) return [];
    const maxIter = Math.max(1, history[history.length - 1].iteration);
    
    // Find min and max log residuals
    const logVals = history.map((h) => {
      const rel = Math.max(1e-18, h.relativeResidual);
      return Math.log10(rel);
    });

    const maxLog = Math.max(0.5, Math.max(...logVals));
    const minLog = Math.min(-16, Math.min(...logVals));
    const logRange = maxLog - minLog || 1;

    return history.map((h, idx) => {
      const xPercent = (h.iteration / maxIter) * 100;
      const yPercent = ((maxLog - logVals[idx]) / logRange) * 100;
      return {
        x: xPercent,
        y: yPercent,
        iter: h.iteration,
        relRes: h.relativeResidual,
        logVal: logVals[idx],
        trueErr: h.trueError,
        timeMs: h.timeMs,
      };
    });
  }, [history]);

  const svgPath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    return chartPoints.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');
  }, [chartPoints]);

  const tolLog = Math.log10(tolerance);
  const maxLog = Math.max(0.5, ...chartPoints.map((p) => p.logVal));
  const minLog = Math.min(-16, ...chartPoints.map((p) => p.logVal));
  const tolYPercent = ((maxLog - tolLog) / (maxLog - minLog)) * 100;

  return (
    <div className="flex flex-col bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Top Compute Engine & Hardware Accelerator Badge Bar */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {isGpu ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-semibold">
              <Zap className="w-3.5 h-3.5 text-emerald-400 fill-current" />
              <span>Дискретный GPU NVIDIA GeForce RTX (Параллелизм ядер CUDA)</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-semibold">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Многопоточный процессор CPU ({cpuParallelInfo?.threads || 8} параллельных потоков OpenMP)</span>
            </span>
          )}

          {isGpu && gpuInfo && (
            <span className="text-[11px] font-mono text-slate-400">
              | {gpuInfo.renderer.split('(')[0]} ({gpuInfo.cudaCoresActive?.toLocaleString()} CUDA ядер, {gpuInfo.blocksCount} блоков Grid)
            </span>
          )}

          {!isGpu && cpuParallelInfo && (
            <span className="text-[11px] font-mono text-slate-400">
              | Декомпозиция строк ({cpuParallelInfo.threads} потоков, Ускорение {cpuParallelInfo.speedupVsSingleThread}x)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono">
          {isGpu && gpuInfo && (
            <>
              <span className="text-slate-400">
                VRAM: <strong className="text-cyan-300">{gpuInfo.memoryBandwidthGBs} GB/s</strong>
              </span>
              {gpuInfo.speedupVsCpu && gpuInfo.speedupVsCpu > 1 && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  +{gpuInfo.speedupVsCpu}x ускорение CUDA
                </span>
              )}
            </>
          )}

          {!isGpu && cpuParallelInfo && (
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
              Эффективность CPU: {cpuParallelInfo.efficiencyPercent}%
            </span>
          )}
        </div>
      </div>

      {/* Top Telemetry Stats Grid */}
      <div className="p-4 bg-slate-900/80 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Status */}
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5">
          <div
            className={`p-2 rounded-lg ${
              wasCancelled
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                : converged
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}
          >
            {wasCancelled ? (
              <Square className="w-4 h-4 fill-current" />
            ) : converged ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">Статус</div>
            <div
              className={`text-xs font-bold ${
                wasCancelled
                  ? 'text-rose-400'
                  : converged
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {wasCancelled
                ? 'Прервано пользователем'
                : converged
                ? 'Сходимость достигнута'
                : 'Превышен лимит'}
            </div>
          </div>
        </div>

        {/* Iterations */}
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">Итераций</div>
            <div className="text-xs font-bold text-white font-mono">{iterations} шагов</div>
          </div>
        </div>

        {/* Time / Stopwatch Result */}
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Timer className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">Время выполнения</div>
            <div className="text-xs font-bold text-indigo-300 font-mono">
              {formattedTime}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              {gflops.toFixed(2)} GFLOPS
            </div>
          </div>
        </div>

        {/* Final Residual */}
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <ArrowDownRight className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">Относ. невязка</div>
            <div className="text-xs font-bold text-cyan-300 font-mono">
              {finalRelativeResidual.toExponential(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Notes / Execution Details Banner */}
      {notes && notes.length > 0 && (
        <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/80 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {notes.map((note, idx) => (
            <span
              key={idx}
              className={`font-mono text-[11px] ${
                note.includes('ОСТАНОВЛЕН')
                  ? 'text-rose-400 font-bold'
                  : note.includes('УСПЕШНО')
                  ? 'text-emerald-400'
                  : note.includes('GPU') || note.includes('CUDA')
                  ? 'text-emerald-300'
                  : 'text-slate-400'
              }`}
            >
              • {note}
            </span>
          ))}
        </div>
      )}

      {/* SVG Log Residual Chart Body */}
      <div className="relative p-4 select-none" style={{ height: `${height}px` }}>
        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid horizontal logarithmic lines */}
          {[-2, -4, -6, -8, -10, -12, -14].map((exponent) => {
            if (exponent > maxLog || exponent < minLog) return null;
            const yPos = ((maxLog - exponent) / (maxLog - minLog)) * 100;
            return (
              <g key={exponent}>
                <line
                  x1="0"
                  y1={yPos}
                  x2="100"
                  y2={yPos}
                  stroke="#334155"
                  strokeWidth="0.5"
                  strokeDasharray="2 2"
                />
                <text
                  x="2"
                  y={Math.max(4, yPos - 1.5)}
                  fill="#64748b"
                  fontSize="3"
                  fontFamily="monospace"
                >
                  10^{exponent}
                </text>
              </g>
            );
          })}

          {/* Target Tolerance Threshold Line */}
          {tolYPercent >= 0 && tolYPercent <= 100 && (
            <g>
              <line
                x1="0"
                y1={tolYPercent}
                x2="100"
                y2={tolYPercent}
                stroke="#10b981"
                strokeWidth="0.8"
                strokeDasharray="3 2"
              />
              <text
                x="98"
                y={Math.max(4, tolYPercent - 2)}
                fill="#10b981"
                fontSize="3"
                fontFamily="monospace"
                textAnchor="end"
              >
                Порог точности ε = {tolerance.toExponential(0)}
              </text>
            </g>
          )}

          {/* Convergence Area Fill & Line */}
          {svgPath && (
            <>
              <path
                d={`${svgPath} L 100 100 L 0 100 Z`}
                fill="url(#areaGrad)"
              />
              <path
                d={svgPath}
                fill="none"
                stroke="url(#lineGrad)"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Data Points */}
          {chartPoints.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r="0.9"
              className="fill-cyan-300 hover:fill-white cursor-pointer transition-all"
            >
              <title>
                Итерация: {pt.iter}
                Относительная невязка: {pt.relRes.toExponential(3)}
                Время: {pt.timeMs.toFixed(1)} мс
              </title>
            </circle>
          ))}
        </svg>

        {/* Bottom Chart Footer / Axis Description */}
        <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between text-[10px] text-slate-500 font-mono pointer-events-none">
          <span>Итерация 0</span>
          <span>Логарифмическая шкала невязки log₁₀(||r_k|| / ||r_0||)</span>
          <span>Итерация {iterations}</span>
        </div>
      </div>
    </div>
  );
};
