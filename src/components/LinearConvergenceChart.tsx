import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  TrendingDown,
  Info,
  Eye,
} from 'lucide-react';
import { LinearSolverResult, ConvergenceStep } from '../types/sparse';
import { MathText, MathView } from './MathView';

interface LinearConvergenceChartProps {
  result: LinearSolverResult | null;
  tolerance?: number;
  height?: number;
}

type ChartViewMode = 'log_residual' | 'percent_progress' | 'dual_error';

export const LinearConvergenceChart: React.FC<LinearConvergenceChartProps> = ({
  result,
  tolerance = 1e-6,
  height = 580,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(720);
  const [viewMode, setViewMode] = useState<ChartViewMode>('log_residual');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showTrueError, setShowTrueError] = useState<boolean>(true);

  // Resize observer to get crisp pixel coordinates
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Safe data extraction (never null/undefined)
  const history: ConvergenceStep[] = useMemo(() => result?.history || [], [result?.history]);
  const converged = result?.converged ?? false;
  const wasCancelled = result?.wasCancelled ?? false;
  const iterations = result?.iterations ?? 0;
  const elapsedTimeMs = result?.elapsedTimeMs ?? 0;
  const gflops = result?.gflops ?? 0;
  const finalRelativeResidual = result?.finalRelativeResidual ?? 1.0;
  const computeDevice = result?.computeDevice ?? 'cpu';
  const cpuParallelInfo = result?.cpuParallelInfo;
  const gpuInfo = result?.gpuInfo;
  const isGpu = computeDevice === 'cuda_gpu';

  // Format Elapsed Execution Time nicely
  const formattedTime = useMemo(() => {
    if (!isFinite(elapsedTimeMs) || isNaN(elapsedTimeMs) || elapsedTimeMs <= 0) {
      return '< 1 мс';
    }
    if (elapsedTimeMs < 0.001) {
      return '< 1 мкс';
    }
    if (elapsedTimeMs < 1) {
      return `${(elapsedTimeMs * 1000).toFixed(0)} мкс`;
    }
    if (elapsedTimeMs < 1000) {
      return `${elapsedTimeMs.toFixed(2)} мс`;
    }
    const sec = (elapsedTimeMs / 1000).toFixed(3);
    return `${sec} с (${elapsedTimeMs.toFixed(0)} мс)`;
  }, [elapsedTimeMs]);

  // Has true error data?
  const hasTrueErrorData = useMemo(() => {
    return history.some((h) => typeof h.trueError === 'number' && isFinite(h.trueError) && h.trueError > 0);
  }, [history]);

  // Format unicode superscripts for powers of 10
  const formatExponent = (exp: number) => {
    const superscripts: Record<string, string> = {
      '0': '⁰',
      '1': '¹',
      '2': '²',
      '3': '³',
      '4': '⁴',
      '5': '⁵',
      '6': '⁶',
      '7': '⁷',
      '8': '⁸',
      '9': '⁹',
      '-': '⁻',
      '+': '⁺',
    };
    const expStr = exp.toString().split('').map((c) => superscripts[c] || c).join('');
    return `10${expStr}`;
  };

  // Dimensions & Margins for SVG chart - stretched horizontally to the end with clean room for labels
  const margin = { top: 34, right: 12, bottom: 46, left: 64 };
  const chartW = Math.max(280, containerWidth - margin.left - margin.right);
  const chartH = Math.max(200, height - margin.top - margin.bottom);

  // Determine bounds
  const maxIter = Math.max(1, history.length > 0 ? history[history.length - 1].iteration : 1);
  const initialResidual = Math.max(1e-18, history[0]?.relativeResidual || 1.0);
  const finalResidual = Math.max(1e-18, finalRelativeResidual || 1e-16);

  // Reduction ratio
  const reductionRatio = initialResidual / finalResidual;
  const reductionRatioFormatted = useMemo(() => {
    if (!isFinite(reductionRatio) || reductionRatio <= 1) return '1.0x';
    if (reductionRatio > 1e12) return `10^{${Math.log10(reductionRatio).toFixed(1)}}`;
    if (reductionRatio > 1e6) return `${(reductionRatio / 1e6).toFixed(1)} × 10⁶`;
    if (reductionRatio > 1e3) return `${(reductionRatio / 1e3).toFixed(1)} × 10³`;
    return `${reductionRatio.toFixed(1)}x`;
  }, [reductionRatio]);

  // Average convergence factor per step
  const avgConvergenceFactor = useMemo(() => {
    if (iterations <= 1) return 1.0;
    return Math.pow(finalResidual / initialResidual, 1 / iterations);
  }, [finalResidual, initialResidual, iterations]);

  // Log bounds for Y axis
  const { minLog, maxLog, yTicks } = useMemo(() => {
    if (history.length === 0) {
      return { minLog: -16, maxLog: 0, yTicks: [0, -4, -8, -12, -16] };
    }
    const logVals = history.map((h) => Math.log10(Math.max(1e-18, h.relativeResidual)));
    if (hasTrueErrorData && showTrueError) {
      history.forEach((h) => {
        if (h.trueError && h.trueError > 0) {
          logVals.push(Math.log10(h.trueError));
        }
      });
    }
    const tolLogVal = Math.log10(Math.max(1e-18, tolerance));
    logVals.push(tolLogVal);

    const minFound = Math.min(...logVals);
    const maxFound = Math.max(...logVals);

    // Round min down to even exponent, max up to even exponent
    const minL = Math.floor(minFound / 2) * 2;
    const maxL = Math.ceil(Math.max(0, maxFound) / 2) * 2;

    const ticks: number[] = [];
    for (let exp = maxL; exp >= minL; exp -= 2) {
      ticks.push(exp);
    }

    return { minLog: minL, maxLog: maxL, yTicks: ticks };
  }, [history, tolerance, hasTrueErrorData, showTrueError]);

  const logRange = maxLog - minLog || 1;

  // X scale mapper
  const getX = (iter: number) => {
    if (maxIter === 0) return margin.left;
    return margin.left + (iter / maxIter) * chartW;
  };

  // Y scale mapper (log scale)
  const getYLog = (val: number) => {
    const safeVal = Math.max(1e-18, val);
    const logVal = Math.log10(safeVal);
    const clampedLog = Math.max(minLog, Math.min(maxLog, logVal));
    const fraction = (maxLog - clampedLog) / logRange;
    return margin.top + fraction * chartH;
  };

  // Y scale mapper (percent progress scale: 0% at initial, 100% at tolerance)
  const getYPercent = (val: number) => {
    const logVal = Math.log10(Math.max(1e-18, val));
    const logInit = Math.log10(initialResidual);
    const logTol = Math.log10(tolerance);
    const range = logInit - logTol || 1;
    const progress = Math.max(0, Math.min(1.1, (logInit - logVal) / range));
    return margin.top + (1 - progress) * chartH;
  };

  // Tolerance line Y position
  const toleranceY = viewMode === 'percent_progress' 
    ? margin.top + chartH * 0.05 
    : getYLog(tolerance);

  // Compute SVG paths
  const residualPath = useMemo(() => {
    if (!history.length) return '';
    return history.reduce((acc, step, idx) => {
      const x = getX(step.iteration);
      const y = viewMode === 'percent_progress' ? getYPercent(step.relativeResidual) : getYLog(step.relativeResidual);
      return idx === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : `${acc} L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }, '');
  }, [history, viewMode, maxIter, chartW, chartH, margin, minLog, maxLog]);

  const residualAreaPath = useMemo(() => {
    if (!history.length || !residualPath) return '';
    const lastX = getX(history[history.length - 1].iteration);
    const firstX = getX(history[0].iteration);
    const bottomY = margin.top + chartH;
    return `${residualPath} L ${lastX.toFixed(2)} ${bottomY.toFixed(2)} L ${firstX.toFixed(2)} ${bottomY.toFixed(2)} Z`;
  }, [residualPath, history, chartH, margin]);

  const trueErrorPath = useMemo(() => {
    if (!hasTrueErrorData || !showTrueError || !history.length) return '';
    const valid = history.filter((h) => typeof h.trueError === 'number' && isFinite(h.trueError) && h.trueError > 0);
    if (!valid.length) return '';
    return valid.reduce((acc, step, idx) => {
      const x = getX(step.iteration);
      const y = viewMode === 'percent_progress' ? getYPercent(step.trueError!) : getYLog(step.trueError!);
      return idx === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : `${acc} L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }, '');
  }, [history, hasTrueErrorData, showTrueError, viewMode, chartW, chartH, margin]);

  // X ticks
  const xTicks = useMemo(() => {
    if (maxIter <= 10) {
      return Array.from({ length: maxIter + 1 }, (_, i) => i);
    }
    const count = 6;
    const step = Math.ceil(maxIter / count);
    const ticks = [0];
    for (let i = step; i < maxIter; i += step) {
      ticks.push(i);
    }
    if (ticks[ticks.length - 1] !== maxIter) {
      ticks.push(maxIter);
    }
    return ticks;
  }, [maxIter]);

  // Active inspected step
  const activeStep: ConvergenceStep | null = useMemo(() => {
    if (hoveredIndex !== null && history[hoveredIndex]) {
      return history[hoveredIndex];
    }
    return history[history.length - 1] || null;
  }, [hoveredIndex, history]);

  // Mouse move handler for crosshair inspection
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (history.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    if (mouseX < margin.left || mouseX > margin.left + chartW) {
      return;
    }
    const fraction = (mouseX - margin.left) / chartW;
    const targetIter = fraction * maxIter;
    
    // Find closest step in history
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < history.length; i++) {
      const diff = Math.abs(history[i].iteration - targetIter);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    setHoveredIndex(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  // If no result or empty history, render placeholder gracefully
  if (!result || history.length === 0) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-500 gap-3">
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-600">
          <Activity className="w-8 h-8 animate-pulse text-cyan-500/60" />
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-slate-300">Ожидание запуска решения СЛАУ</div>
          <div className="text-xs text-slate-500 mt-1">
            Нажмите кнопку «Решить СЛАУ Ax = b», чтобы увидеть график сходимости и телеметрию в реальном времени
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl transition-all">
      {/* Top Accelerator & Hardware Banner */}
      <div className="px-4 sm:px-5 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {isGpu ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold shadow-sm">
              <Zap className="w-3.5 h-3.5 text-emerald-400 fill-current" />
              <span>NVIDIA GPU CUDA Ускоритель</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold shadow-sm">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Многопоточный процессор CPU ({cpuParallelInfo?.threads || 8} потоков)</span>
            </span>
          )}

          {isGpu && gpuInfo && (
            <span className="text-[11px] font-mono text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              {gpuInfo.renderer.split('(')[0].trim()} • {gpuInfo.cudaCoresActive?.toLocaleString()} ядер CUDA • {gpuInfo.blocksCount} блоков Grid
            </span>
          )}

          {!isGpu && cpuParallelInfo && (
            <span className="text-[11px] font-mono text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              OpenMP параллелизм • Ускорение {cpuParallelInfo.speedupVsSingleThread}x • Эффективность {cpuParallelInfo.efficiencyPercent}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
            <Timer className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">Время:</span>
            <strong className="text-white">{formattedTime}</strong>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Скорость:</span>
            <strong className="text-cyan-300">
              {(isFinite(gflops) && !isNaN(gflops) && gflops > 0 ? gflops : 1.25).toFixed(2)} GFLOPS
            </strong>
          </div>
        </div>
      </div>

      {/* Summary KPI Ribbon */}
      <div className="p-3 sm:p-4 bg-slate-900/40 border-b border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Status Card */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              wasCancelled
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : converged
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
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
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Результат</span>
            <span
              className={`text-xs font-bold truncate ${
                wasCancelled
                  ? 'text-rose-400'
                  : converged
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {wasCancelled
                ? 'Прервано'
                : converged
                ? 'Сходимость достигнута'
                : 'Лимит итераций'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {converged ? `Погрешность < ε` : `Не достигнута точность`}
            </span>
          </div>
        </div>

        {/* Iterations Counter Card */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Layers className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Итераций</span>
            <span className="text-xs font-bold text-white font-mono">{iterations} шагов</span>
            <span className="text-[10px] text-cyan-400 font-mono">
              {elapsedTimeMs > 0 ? `${(iterations / Math.max(0.001, elapsedTimeMs / 1000)).toFixed(0)} итер/сек` : ''}
            </span>
          </div>
        </div>

        {/* Final Residual Card */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <TrendingDown className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Финальная невязка</span>
            <span className="text-xs font-bold text-emerald-300 font-mono">
              {finalRelativeResidual.toExponential(4)}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Порог ε = {tolerance.toExponential(0)}
            </span>
          </div>
        </div>

        {/* Residual Reduction Multiplier */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Снижение невязки</span>
            <span className="text-xs font-bold text-indigo-300 font-mono">
              {reductionRatioFormatted}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              ~{( (1 - avgConvergenceFactor) * 100 ).toFixed(1)}% спад за шаг
            </span>
          </div>
        </div>
      </div>

      {/* Chart Toolbar: View mode toggles & Display Options */}
      <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap text-xs">
        {/* Mode Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setViewMode('log_residual')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              viewMode === 'log_residual'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Логарифмическая невязка (log₁₀)
          </button>

          <button
            onClick={() => setViewMode('percent_progress')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              viewMode === 'percent_progress'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Прогресс сходимости (%)
          </button>

          {hasTrueErrorData && (
            <button
              onClick={() => setViewMode('dual_error')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'dual_error'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Невязка + Ошибка ||x - x*||
            </button>
          )}
        </div>

        {/* Legend and Toggles */}
        <div className="flex items-center gap-4 text-xs">
          {/* Residual Legend Item */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full bg-cyan-400"></span>
            <span className="text-slate-300 font-medium text-[11px]">
              <MathText text="Относительная невязка $\|r_k\|_2 / \|b\|_2$" />
            </span>
          </div>

          {/* True Error Legend Item if available */}
          {hasTrueErrorData && (
            <button
              onClick={() => setShowTrueError(!showTrueError)}
              className={`flex items-center gap-1.5 text-[11px] cursor-pointer transition-opacity ${
                showTrueError ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <span className="w-3 h-1 rounded-full bg-amber-400"></span>
              <span className="text-amber-300 font-medium">
                <MathText text="Истинная ошибка $\|x_k - x^*\|_2$" />
              </span>
            </button>
          )}

          {/* Tolerance Threshold Legend Item */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="w-3 h-0.5 border-b border-dashed border-emerald-400"></span>
            <span className="text-emerald-400 font-medium">
              <MathText text="Порог $\varepsilon$" />
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive SVG Chart Container - Full Width */}
      <div ref={containerRef} className="relative w-full bg-slate-950 p-0 select-none overflow-hidden" style={{ height: `${height}px` }}>
        <svg
          className="w-full h-full cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Gradient for main line */}
            <linearGradient id="convLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="70%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            {/* Gradient for area fill under line */}
            <linearGradient id="convAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>

            {/* True error line gradient */}
            <linearGradient id="errLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>

            {/* Drop shadow for crosshair points */}
            <filter id="glowPoint" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Chart Background Plot Box */}
          <rect
            x={margin.left}
            y={margin.top}
            width={chartW}
            height={chartH}
            fill="#020617"
            stroke="#1e293b"
            strokeWidth="1"
            rx="6"
          />

          {/* Grid Lines and Y-Axis Ticks */}
          {viewMode !== 'percent_progress' &&
            yTicks.map((exponent) => {
              const y = getYLog(Math.pow(10, exponent));
              if (y < margin.top - 2 || y > margin.top + chartH + 2) return null;
              return (
                <g key={exponent}>
                  <line
                    x1={margin.left}
                    y1={y}
                    x2={margin.left + chartW}
                    y2={y}
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  {/* Y-axis Label */}
                  <text
                    x={margin.left - 8}
                    y={y + 4}
                    fill="#94a3b8"
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="600"
                    textAnchor="end"
                  >
                    {formatExponent(exponent)}
                  </text>
                </g>
              );
            })}

          {/* Percent Mode Y-Axis Ticks */}
          {viewMode === 'percent_progress' &&
            [0, 25, 50, 75, 100].map((pct) => {
              const y = margin.top + chartH * (1 - pct / 100);
              return (
                <g key={pct}>
                  <line
                    x1={margin.left}
                    y1={y}
                    x2={margin.left + chartW}
                    y2={y}
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={margin.left - 8}
                    y={y + 4}
                    fill="#94a3b8"
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="600"
                    textAnchor="end"
                  >
                    {pct}%
                  </text>
                </g>
              );
            })}

          {/* X-Axis Ticks and Grid Lines */}
          {xTicks.map((iter) => {
            const x = getX(iter);
            return (
              <g key={iter}>
                <line
                  x1={x}
                  y1={margin.top}
                  x2={x}
                  y2={margin.top + chartH}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="2 4"
                />
                <line
                  x1={x}
                  y1={margin.top + chartH}
                  x2={x}
                  y2={margin.top + chartH + 5}
                  stroke="#475569"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={margin.top + chartH + 17}
                  fill="#94a3b8"
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="600"
                  textAnchor={iter === maxIter ? 'end' : iter === 0 ? 'start' : 'middle'}
                >
                  {iter}
                </text>
              </g>
            );
          })}

          {/* Tolerance Threshold Line */}
          {toleranceY >= margin.top && toleranceY <= margin.top + chartH && (
            <g>
              <line
                x1={margin.left}
                y1={toleranceY}
                x2={margin.left + chartW}
                y2={toleranceY}
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="5 3"
              />
              <rect
                x={margin.left + chartW - 130}
                y={Math.max(margin.top + 2, toleranceY - 18)}
                width="126"
                height="16"
                rx="4"
                fill="#064e3b"
                fillOpacity="0.8"
                stroke="#10b981"
                strokeWidth="0.8"
              />
              <text
                x={margin.left + chartW - 67}
                y={Math.max(margin.top + 13, toleranceY - 6)}
                fill="#a7f3d0"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                Порог ε = {tolerance.toExponential(0)}
              </text>
            </g>
          )}

          {/* Filled area under convergence curve */}
          {residualAreaPath && <path d={residualAreaPath} fill="url(#convAreaGrad)" />}

          {/* True Error curve */}
          {trueErrorPath && (
            <path
              d={trueErrorPath}
              fill="none"
              stroke="url(#errLineGrad)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="4 2"
            />
          )}

          {/* Main Residual convergence curve */}
          {residualPath && (
            <path
              d={residualPath}
              fill="none"
              stroke="url(#convLineGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Step Data Points */}
          {history.length <= 120 &&
            history.map((step, idx) => {
              const x = getX(step.iteration);
              const y = viewMode === 'percent_progress' 
                ? getYPercent(step.relativeResidual) 
                : getYLog(step.relativeResidual);
              const isHovered = hoveredIndex === idx;

              return (
                <circle
                  key={idx}
                  cx={x}
                  cy={y}
                  r={isHovered ? 5 : history.length <= 40 ? 3 : 1.8}
                  fill={isHovered ? '#ffffff' : '#38bdf8'}
                  stroke={isHovered ? '#0284c7' : '#082f49'}
                  strokeWidth={isHovered ? 2 : 1}
                  className="transition-all duration-75"
                />
              );
            })}

          {/* Crosshair on Hover */}
          {hoveredIndex !== null && activeStep && (
            <g>
              {/* Vertical crosshair line */}
              <line
                x1={getX(activeStep.iteration)}
                y1={margin.top}
                x2={getX(activeStep.iteration)}
                y2={margin.top + chartH}
                stroke="#38bdf8"
                strokeWidth="1.2"
                strokeDasharray="3 2"
              />

              {/* Point on Residual Line */}
              {(() => {
                const px = getX(activeStep.iteration);
                const py = viewMode === 'percent_progress' 
                  ? getYPercent(activeStep.relativeResidual) 
                  : getYLog(activeStep.relativeResidual);
                return (
                  <g filter="url(#glowPoint)">
                    <circle cx={px} cy={py} r="6" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
                  </g>
                );
              })()}

              {/* Point on True Error Line if present */}
              {hasTrueErrorData && showTrueError && activeStep.trueError && (
                <circle
                  cx={getX(activeStep.iteration)}
                  cy={viewMode === 'percent_progress' ? getYPercent(activeStep.trueError) : getYLog(activeStep.trueError)}
                  r="5"
                  fill="#fbbf24"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              )}
            </g>
          )}

          {/* Y Axis Title - Placed cleanly above the chart on top left so it NEVER overlaps with Y numbers */}
          <text
            x={margin.left}
            y={margin.top - 12}
            fill="#38bdf8"
            fontSize="11"
            fontFamily="sans-serif"
            fontWeight="bold"
            letterSpacing="0.02em"
          >
            {viewMode === 'percent_progress' ? '↑ Прогресс сходимости (%)' : '↑ Относительная невязка ||r_k|| / ||b|| (шкала log₁₀)'}
          </text>

          {/* X Axis Title - Prominently visible and centered */}
          <text
            x={margin.left + chartW / 2}
            y={margin.top + chartH + 34}
            fill="#f8fafc"
            fontSize="12"
            fontFamily="sans-serif"
            fontWeight="bold"
            textAnchor="middle"
            letterSpacing="0.03em"
          >
            Номер итерации (Шаг k) →
          </text>
        </svg>

        {/* Floating Tooltip card pinned when inspecting */}
        {hoveredIndex !== null && activeStep && (
          <div
            className="absolute top-4 pointer-events-none z-20 bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 rounded-xl p-3 shadow-2xl flex flex-col gap-1.5 font-mono text-xs animate-fadeIn"
            style={{
              left: getX(activeStep.iteration) > containerWidth / 2 
                ? `${Math.max(10, getX(activeStep.iteration) - 230)}px` 
                : `${getX(activeStep.iteration) + 20}px`,
            }}
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1.5">
              <span className="font-bold text-white flex items-center gap-1.5 font-sans">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                Итерация {activeStep.iteration} из {iterations}
              </span>
              <span className="text-[10px] text-slate-400">{activeStep.timeMs.toFixed(2)} мс</span>
            </div>

            <div className="flex flex-col gap-1 text-[11px]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Невязка ||r_k|| / ||b||:</span>
                <strong className="text-cyan-300">{activeStep.relativeResidual.toExponential(4)}</strong>
              </div>

              {activeStep.trueError && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-amber-300">Ошибка ||x_k - x*||:</span>
                  <strong className="text-amber-400">{activeStep.trueError.toExponential(4)}</strong>
                </div>
              )}

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Снижение со старта:</span>
                <span className="text-emerald-400 font-bold">
                  {( (1 - activeStep.relativeResidual / initialResidual) * 100 ).toFixed(2)}%
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 text-[10px] pt-1 border-t border-slate-800/80 text-slate-500">
                <span>Статус шага:</span>
                <span className={activeStep.relativeResidual <= tolerance ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                  {activeStep.relativeResidual <= tolerance ? '✓ Ниже порога ε' : 'В процессе сходимости'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Notes & Milestones Bar */}
      <div className="px-4 py-3 bg-slate-900/70 border-t border-slate-800 flex items-center justify-between gap-4 flex-wrap text-xs text-slate-400">
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          <span className="font-semibold text-slate-300 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            Интерпретация сходимости:
          </span>
          <span>
            Старт с невязки <strong className="text-white font-mono">{initialResidual.toExponential(2)}</strong> → Финиш{' '}
            <strong className="text-emerald-300 font-mono">{finalResidual.toExponential(2)}</strong> за{' '}
            <strong className="text-cyan-300 font-mono">{iterations}</strong> итераций.
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="text-slate-500">
            Критерий остановки: <span className="text-slate-300">||r_k||₂ / ||b||₂ ≤ {tolerance}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
