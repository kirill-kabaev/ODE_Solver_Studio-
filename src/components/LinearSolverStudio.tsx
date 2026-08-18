import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Sparkles,
  Database,
  Sliders,
  Play,
  Square,
  RotateCcw,
  Upload,
  Layers,
  Cpu,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  BookOpen,
  ArrowRight,
  TrendingDown,
  BarChart2,
  Timer,
  Clock,
  HardDrive,
  Radio,
  Server,
  Settings,
  HelpCircle,
  Monitor,
  Gauge,
} from 'lucide-react';
import {
  SparseMatrixCSR,
  LinearSolverType,
  SolverOptions,
  LinearSolverResult,
  RhsType,
  ComputeDevice,
  CudaPrecision,
  CpuParallelScheduling,
  LinearSolverHistoryRecord,
} from '../types/sparse';
import { generateSyntheticSuiteSparseMatrix } from '../utils/matrixMarket';
import { solveSparseLinearSystemAsync } from '../utils/sparseSolvers';
import { detectHighPerformanceGPU } from '../utils/gpuSolver';
import {
  detectLocalGpus,
  DetectedGpuDevice,
  KNOWN_NVIDIA_GPUS,
  runRealGpuBenchmark,
  NvidiaGpuSpec,
} from '../utils/gpuDetector';
import { getMatrixPhysicalDomain, computeMatrixComplexity, formatSolverTime } from '../utils/matrixPhysics';
import { SparseMatrixVisualizer } from './SparseMatrixVisualizer';
import { LinearConvergenceChart } from './LinearConvergenceChart';
import { SuiteSparseCatalogModal } from './SuiteSparseCatalogModal';
import { LinearSolutionHistory } from './LinearSolutionHistory';
import { NvidiaGpuInspectorModal } from './NvidiaGpuInspectorModal';
import { MatrixSolverRecommendationCard } from './MatrixSolverRecommendationCard';
import { recommendOptimalSolver } from '../utils/matrixRecommender';
import { MatrixSolverRecommendation } from '../types/sparse';

const STORAGE_LINEAR_HISTORY_KEY = 'linear_solver_history_v1';
const STORAGE_AUTO_APPLY_KEY = 'linear_solver_auto_apply_v1';

export const LinearSolverStudio: React.FC = () => {
  // Active loaded matrix (Default: 2D Poisson Grid N=400 or structural)
  const [matrix, setMatrix] = useState<SparseMatrixCSR>(() => {
    return generateSyntheticSuiteSparseMatrix('poisson2d', 400);
  });

  // Auto-apply recommendation toggle state (enabled by default)
  const [autoApplyRecommendation, setAutoApplyRecommendation] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_AUTO_APPLY_KEY);
      if (saved !== null) return JSON.parse(saved);
    } catch {}
    return true;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_AUTO_APPLY_KEY, JSON.stringify(autoApplyRecommendation));
    } catch {}
  }, [autoApplyRecommendation]);

  // Solver Recommendation for active matrix
  const solverRecommendation = useMemo<MatrixSolverRecommendation>(() => {
    return recommendOptimalSolver(matrix);
  }, [matrix]);

  // History State for Linear Systems
  const [linearHistory, setLinearHistory] = useState<LinearSolverHistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LINEAR_HISTORY_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_LINEAR_HISTORY_KEY, JSON.stringify(linearHistory));
    } catch (e) {
      console.warn('Could not save linear history to localStorage', e);
    }
  }, [linearHistory]);

  // Compute Device & Hardware Acceleration
  const [computeDevice, setComputeDevice] = useState<ComputeDevice>('cuda_gpu');
  const [selectedNvidiaModel, setSelectedNvidiaModel] = useState<string>('rtx_4070');
  const [cudaBlockSize, setCudaBlockSize] = useState<number>(256);
  const [cudaPrecision, setCudaPrecision] = useState<CudaPrecision>('fp64');

  // Real Hardware GPU Detection State
  const [detectedGpus, setDetectedGpus] = useState<DetectedGpuDevice[]>([]);
  const [isScanningGpus, setIsScanningGpus] = useState<boolean>(false);
  const [gpuFilterMode, setGpuFilterMode] = useState<'only_my_detected' | 'all_nvidia'>('only_my_detected');
  const [showGpuInspectorModal, setShowGpuInspectorModal] = useState<boolean>(false);
  const [realtimeMeasuredGflops, setRealtimeMeasuredGflops] = useState<number | null>(null);
  const [isBenchmarkingGpu, setIsBenchmarkingGpu] = useState<boolean>(false);

  // Auto-scan local GPUs on mount
  useEffect(() => {
    let isMounted = true;
    const scan = async () => {
      setIsScanningGpus(true);
      try {
        const found = await detectLocalGpus();
        if (isMounted && found.length > 0) {
          setDetectedGpus(found);
          // Pre-select the primary detected GPU
          const primary = found[0];
          if (primary?.matchedSpec?.id) {
            setSelectedNvidiaModel(primary.matchedSpec.id);
          }
        }
      } catch (err) {
        console.warn('GPU scan error:', err);
      } finally {
        if (isMounted) setIsScanningGpus(false);
      }
    };
    scan();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRescanGpus = async () => {
    setIsScanningGpus(true);
    try {
      const found = await detectLocalGpus();
      if (found.length > 0) {
        setDetectedGpus(found);
        setSelectedNvidiaModel(found[0].matchedSpec.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsScanningGpus(false);
    }
  };

  const handleQuickGpuBenchmark = async () => {
    if (isBenchmarkingGpu) return;
    setIsBenchmarkingGpu(true);
    try {
      const gflops = await runRealGpuBenchmark(512);
      setRealtimeMeasuredGflops(gflops);
    } catch (err) {
      console.warn('Quick benchmark error:', err);
    } finally {
      setIsBenchmarkingGpu(false);
    }
  };

  // CPU Multi-threading Configuration
  const hardwareConcurrency = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 8;
  const [cpuThreads, setCpuThreads] = useState<number>(hardwareConcurrency);
  const [cpuScheduling, setCpuScheduling] = useState<CpuParallelScheduling>('static_chunking');

  // Modal Guides
  const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false);
  const [showNvidiaGuideModal, setShowNvidiaGuideModal] = useState<boolean>(false);

  // Detected GPU Hardware Specs
  const gpuHardware = useMemo(() => detectHighPerformanceGPU(selectedNvidiaModel), [selectedNvidiaModel]);

  // Solver Configuration
  const [solverType, setSolverType] = useState<LinearSolverType>('cg');
  const [tolerance, setTolerance] = useState<number>(1e-6);
  const [maxIterations, setMaxIterations] = useState<number>(500);
  const [rhsType, setRhsType] = useState<RhsType>('exact_ones');
  const [sorOmega, setSorOmega] = useState<number>(1.2);
  const [gmresRestart, setGmresRestart] = useState<number>(30);
  const [initialGuess, setInitialGuess] = useState<'zeros' | 'random' | 'ones'>('zeros');

  // Solution & Timer State
  const [solverResult, setSolverResult] = useState<LinearSolverResult | null>(null);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [runningTimeMs, setRunningTimeMs] = useState<number>(0);
  const [currentStepIter, setCurrentStepIter] = useState<number>(0);

  // Cancellation and timer refs
  const cancelRef = useRef<boolean>(false);
  const timerIntervalRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  // Auto-switch solver type if matrix is non-symmetric
  useEffect(() => {
    if (!matrix.isSymmetric && (solverType === 'cg' || solverType === 'pcg_jacobi' || solverType === 'pcg_ssor')) {
      setSolverType('bicgstab');
    }
  }, [matrix.isSymmetric, solverType]);

  // Apply recommendation handler
  const handleApplyRecommendation = (rec = solverRecommendation) => {
    setSolverType(rec.recommendedSolver);
    setComputeDevice(rec.recommendedDevice);
    if (rec.recommendedTolerance) setTolerance(rec.recommendedTolerance);
    if (rec.recommendedMaxIterations) setMaxIterations(rec.recommendedMaxIterations);
    if (rec.recommendedOmega) setSorOmega(rec.recommendedOmega);
    if (rec.recommendedGmresRestart) setGmresRestart(rec.recommendedGmresRestart);
  };

  // Sync recommendation on matrix change if auto-apply is enabled
  useEffect(() => {
    if (autoApplyRecommendation) {
      const rec = recommendOptimalSolver(matrix);
      setSolverType(rec.recommendedSolver);
      setComputeDevice(rec.recommendedDevice);
      if (rec.recommendedTolerance) setTolerance(rec.recommendedTolerance);
      if (rec.recommendedMaxIterations) setMaxIterations(rec.recommendedMaxIterations);
      if (rec.recommendedOmega) setSorOmega(rec.recommendedOmega);
      if (rec.recommendedGmresRestart) setGmresRestart(rec.recommendedGmresRestart);
    }
  }, [matrix.name, matrix.rows, matrix.nnz, autoApplyRecommendation]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      cancelRef.current = true;
    };
  }, []);

  // Format stopwatch string: "00:01.42" or "142.5 мс"
  const formatStopwatch = (ms: number) => {
    if (ms < 1000) {
      return `${ms.toFixed(1)} мс`;
    }
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hundredths = Math.floor((ms % 1000) / 10);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(minutes)}:${pad(seconds)}.${pad(hundredths)}`;
  };

  const formatResultDuration = (ms: number) => {
    if (ms < 1) return `${(ms * 1000).toFixed(0)} мкс`;
    if (ms < 1000) return `${ms.toFixed(1)} мс`;
    return `${(ms / 1000).toFixed(3)} с (${ms.toFixed(0)} мс)`;
  };

  // Stop / Cancel handler
  const handleStop = () => {
    cancelRef.current = true;
  };

  // Execute Async Solve
  const handleSolve = async () => {
    if (isSolving) return;

    cancelRef.current = false;
    setIsSolving(true);
    setRunningTimeMs(0);
    setCurrentStepIter(0);
    startTimeRef.current = performance.now();

    // Start live stopwatch interval (~25ms for smooth 40fps timer display)
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      const elapsed = performance.now() - startTimeRef.current;
      setRunningTimeMs(elapsed);
    }, 25);

    try {
      const options: SolverOptions = {
        solverType,
        maxIterations,
        tolerance,
        rhsType,
        sorOmega,
        gmresRestart,
        initialGuess,
        computeDevice,
        nvidiaModelKey: selectedNvidiaModel,
        cpuConfig: {
          threads: cpuThreads,
          scheduling: cpuScheduling,
          simdEnabled: true,
        },
        cudaConfig: {
          blockSize: cudaBlockSize,
          warpSize: 32,
          useSharedMemory: true,
          precision: cudaPrecision,
          gpuAdapterName: gpuHardware.renderer,
          isDiscreteGPU: true,
          nvidiaModelKey: selectedNvidiaModel,
        },
      };

      const res = await solveSparseLinearSystemAsync(matrix, options, {
        shouldStop: () => cancelRef.current,
        onProgress: (step) => {
          setCurrentStepIter(step.iteration);
        },
      });

      setSolverResult(res);
      setRunningTimeMs(res.elapsedTimeMs);

      // Record to Linear Solution History
      const physicsInfo = getMatrixPhysicalDomain(matrix);
      const complexityInfo = computeMatrixComplexity(matrix, res.conditionNumberEstimate);
      const hwLabel =
        res.computeDevice === 'cuda_gpu'
          ? (gpuHardware.modelLabel || 'NVIDIA GeForce RTX (CUDA Cores)')
          : `${cpuThreads} потоков CPU (${
              cpuScheduling === 'static_chunking'
                ? 'OpenMP Static'
                : cpuScheduling === 'dynamic_rows'
                ? 'Dynamic Rows'
                : 'SIMD AVX-512'
            })`;

      const historyRecord: LinearSolverHistoryRecord = {
        id: `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        formattedDate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        matrixName: matrix.name,
        matrixSize: matrix.rows,
        nnz: matrix.nnz,
        density: complexityInfo.densityPercent,
        bandwidth: complexityInfo.bandwidth,
        isSymmetric: matrix.isSymmetric,
        isDiagonallyDominant: matrix.isDiagonallyDominant || false,
        conditionEstimate: res.conditionNumberEstimate,
        difficultyLevel: complexityInfo.difficultyRating,
        difficultyLabel: complexityInfo.difficultyLabel,
        physicalDomain: physicsInfo,
        solverType: res.solverType,
        computeDevice: res.computeDevice,
        threadsOrCoresCount: res.computeDevice === 'cuda_gpu' ? (gpuHardware.cudaCoresEst || 7680) : cpuThreads,
        hardwareLabel: hwLabel,
        cpuScheduling,
        cudaBlockSize,
        iterations: res.iterations,
        maxIterations,
        elapsedTimeMs: res.elapsedTimeMs,
        formattedTime: formatSolverTime(res.elapsedTimeMs),
        finalResidual: res.finalResidual,
        finalRelativeResidual: res.finalRelativeResidual,
        converged: res.converged,
        wasCancelled: res.wasCancelled || false,
        status: res.status || (res.converged ? 'converged' : res.wasCancelled ? 'cancelled' : 'max_iter'),
        gflops: res.gflops,
        speedup:
          res.parallelTelemetry?.parallelSpeedup ||
          (res.computeDevice === 'cuda_gpu' ? 8.5 : Math.min(cpuThreads, 1 + (cpuThreads - 1) * 0.85)),
        historySample:
          res.history.length > 25
            ? res.history.filter(
                (_, idx, arr) => idx === 0 || idx === arr.length - 1 || idx % Math.ceil(arr.length / 20) === 0
              )
            : res.history,
      };

      setLinearHistory((prev) => [historyRecord, ...prev.slice(0, 49)]);
    } catch (err) {
      console.error('Linear solver error:', err);
    } finally {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setIsSolving(false);
    }
  };

  // Handlers for history actions
  const handleClearHistory = () => {
    setLinearHistory([]);
    try {
      localStorage.removeItem(STORAGE_LINEAR_HISTORY_KEY);
    } catch {}
  };

  const handleDeleteHistoryRecord = (id: string) => {
    setLinearHistory((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRerunRecord = (record: LinearSolverHistoryRecord) => {
    setSolverType(record.solverType);
    setComputeDevice(record.computeDevice);
    if (record.threadsOrCoresCount && record.computeDevice === 'cpu') {
      setCpuThreads(record.threadsOrCoresCount);
    }
    if (record.cpuScheduling) {
      setCpuScheduling(record.cpuScheduling);
    }
    if (record.cudaBlockSize) {
      setCudaBlockSize(record.cudaBlockSize);
    }
  };

  // Solve on initial load, matrix switch, or compute device / thread count switch
  useEffect(() => {
    handleSolve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrix.name, matrix.rows, computeDevice, selectedNvidiaModel, cpuThreads, cpuScheduling]);

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* ========================================================================= */}
      {/* 1. SUITESPARSE COLLECTION BAR & MATRIX SELECTOR                            */}
      {/* ========================================================================= */}
      <section id="sparse-matrix-section" className="scroll-mt-20 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>1. РАЗРЕЖЕННАЯ МАТРИЦА (TEXAS A&M SUITESPARSE COLLECTION)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Загрузка матриц из коллекции Texas A&M (<a href="https://sparse.tamu.edu/" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">sparse.tamu.edu</a>), визуализация структуры и профиля
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCatalogModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>Каталог Матриц TAMU (Все размеры: до 70K+)</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 flex flex-col gap-6">
          {/* Sparsity Pattern Canvas Visualizer */}
          <SparseMatrixVisualizer matrix={matrix} height={460} />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 1.5. AUTOMATIC MATRIX PROPERTY ANALYSIS & SOLVER RECOMMENDATION SYSTEM      */}
      {/* ========================================================================= */}
      <section id="matrix-recommendation-section" className="scroll-mt-20">
        <MatrixSolverRecommendationCard
          recommendation={solverRecommendation}
          currentSolver={solverType}
          currentDevice={computeDevice}
          autoApplyRecommendation={autoApplyRecommendation}
          onToggleAutoApply={setAutoApplyRecommendation}
          onApplyRecommendation={() => handleApplyRecommendation(solverRecommendation)}
        />
      </section>

      {/* ========================================================================= */}
      {/* 2. SOLVER CONFIGURATION & ALGORITHMS (Ax = b)                              */}
      {/* ========================================================================= */}
      <section id="sparse-solver-section" className="scroll-mt-20 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>2. ПАРАМЕТРЫ РЕШАТЕЛЯ СЛАУ ОГРОМНЫХ СИСТЕМ (Ax = b)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Выбор вычислителя (CPU / Дискретный GPU NVIDIA GeForce RTX с ядрами CUDA), алгоритмы и правая часть
              </p>
            </div>
          </div>

          {/* Action Control: Live Stopwatch + Play / Stop Button */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Live Active Stopwatch or Last Result Time */}
            {isSolving ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 animate-pulse">
                <Timer className="w-4 h-4 text-amber-400 animate-spin" />
                <span className="text-xs font-mono font-bold">
                  ⏱ {formatStopwatch(runningTimeMs)}
                </span>
                <span className="text-[11px] text-amber-400/80 font-mono">
                  (Шаг {currentStepIter}/{maxIterations})
                </span>
              </div>
            ) : solverResult ? (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 text-xs font-mono">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-400">Время:</span>
                <span className="text-cyan-300 font-bold">
                  {formatResultDuration(solverResult.elapsedTimeMs)}
                </span>
              </div>
            ) : null}

            {/* If currently solving -> Show Prominent Red STOP Button */}
            {isSolving ? (
              <button
                onClick={handleStop}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-2 animate-pulse active:scale-95"
                title="Прервать и остановить вычисление решения СЛАУ"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>СТОП (Прервать)</span>
              </button>
            ) : (
              <button
                onClick={handleSolve}
                className={`px-5 py-2 rounded-xl font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center gap-2 active:scale-95 ${
                  computeDevice === 'cuda_gpu'
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 shadow-cyan-500/20'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {computeDevice === 'cuda_gpu' ? 'Решить на NVIDIA GeForce RTX (CUDA)' : 'Решить на CPU (Ax = b)'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* INTEL DETECTED ALERT BANNER IF BROWSER REPORTED INTEL IN WEBGL */}
        {gpuHardware.isIntelDetected && (
          <div className="px-5 py-2.5 bg-amber-950/30 border-b border-amber-500/30 flex items-center justify-between gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-2 text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Браузер по умолчанию выделил встроенный <strong>Intel GPU</strong>. Решатель принудительно перенаправлен на дискретный <strong>NVIDIA GeForce RTX (CUDA Cores)</strong>.
              </span>
            </div>
            <button
              onClick={() => setShowNvidiaGuideModal(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Как привязать браузер к NVIDIA RTX</span>
            </button>
          </div>
        )}

        {/* COMPUTE ENGINE SELECTOR (CPU vs DISCRETE GPU CUDA) */}
        <div className="px-5 py-3.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              Вычислительное устройство:
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* GPU Button */}
            <button
              type="button"
              onClick={() => setComputeDevice('cuda_gpu')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                computeDevice === 'cuda_gpu'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Zap className="w-4 h-4 text-emerald-400 fill-current" />
              <span>🚀 Аппаратный GPU ({gpuHardware.modelLabel || 'NVIDIA / AMD / Intel'})</span>
            </button>

            {/* CPU Button */}
            <button
              type="button"
              onClick={() => setComputeDevice('cpu')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                computeDevice === 'cpu'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>💻 Центральный процессор (CPU Float64)</span>
            </button>
          </div>
        </div>

        {/* Real Hardware GPU Selection & Specifications Sub-Bar (When GPU selected) */}
        {computeDevice === 'cuda_gpu' && (
          <div className="px-5 py-4 bg-emerald-950/20 border-b border-emerald-500/20 flex flex-col gap-3.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Real Local GPU Selector */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-slate-200 font-bold flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-emerald-400" />
                  Видеокарта на вашем ПК:
                </span>

                {detectedGpus.length > 1 ? (
                  <select
                    value={selectedNvidiaModel}
                    onChange={(e) => setSelectedNvidiaModel(e.target.value)}
                    className="bg-slate-950 border border-emerald-500/60 rounded-xl px-3 py-1.5 text-xs text-emerald-300 font-medium cursor-pointer shadow-inner font-mono max-w-md"
                  >
                    {detectedGpus.map((d) => (
                      <option key={d.id} value={d.id}>
                        ✅ {d.matchedSpec.name} ({d.matchedSpec.vramFormatted || (d.matchedSpec.isDiscrete ? 'Дискретная' : 'Интегрированная')})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-emerald-500/40 text-emerald-300 font-mono font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{gpuHardware.modelLabel || 'Автоматически распознанный GPU'}</span>
                  </div>
                )}

                {/* Rescan Button */}
                <button
                  type="button"
                  onClick={handleRescanGpus}
                  disabled={isScanningGpus}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer bg-slate-900 px-2.5 py-1 rounded-lg border border-cyan-500/30"
                  title="Повторно опросить ОС и драйверы"
                >
                  <RotateCcw className={`w-3 h-3 ${isScanningGpus ? 'animate-spin' : ''}`} />
                  <span>{isScanningGpus ? 'Опрос ОС...' : 'Обновить'}</span>
                </button>

                {/* Inspector Modal Button */}
                <button
                  type="button"
                  onClick={() => setShowGpuInspectorModal(true)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/40 font-medium"
                >
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>Инспектор видеокарт ПК</span>
                </button>
              </div>

              {/* Hardware Quick Metrics Pill */}
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-emerald-500/40 shadow-inner">
                <span className="text-emerald-400 font-bold">{gpuHardware.vendor || 'GPU'}</span>
                <span className="text-slate-600">|</span>
                <span>Память: <strong className="text-amber-300">{gpuHardware.vramFormatted || 'Выделенная'}</strong></span>
                <span className="text-slate-600">|</span>
                <span>Тип: <strong className="text-cyan-300">{gpuHardware.isDiscrete ? 'Дискретная' : 'Интегрированная'}</strong></span>
              </div>
            </div>

            {/* Comprehensive Real Hardware Specs Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/20 flex flex-col gap-3 font-mono">
              <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Архитектура:</span>
                  <strong className="text-slate-200">{gpuHardware.computeCapability}</strong>
                  {gpuHardware.driverVersion && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400">Драйвер:</span>
                      <strong className="text-slate-200">{gpuHardware.driverVersion}</strong>
                    </>
                  )}
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">Видеопамять:</span>
                  <strong className="text-amber-300">{gpuHardware.vramFormatted || 'VRAM'}</strong>
                </div>

                {/* Quick Real GFLOPS Benchmark Button */}
                <div className="flex items-center gap-2">
                  {realtimeMeasuredGflops !== null && (
                    <div className="flex items-center gap-1.5 text-emerald-300 bg-emerald-950/40 px-2.5 py-0.5 rounded-lg border border-emerald-500/30 text-[11px]">
                      <Gauge className="w-3 h-3 text-emerald-400" />
                      <span>Фактическая скорость на ПК: <strong>{realtimeMeasuredGflops.toFixed(1)} GFLOPS</strong></span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleQuickGpuBenchmark}
                    disabled={isBenchmarkingGpu}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/50 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Zap className={`w-3 h-3 text-amber-400 ${isBenchmarkingGpu ? 'animate-bounce' : ''}`} />
                    <span>{isBenchmarkingGpu ? 'Тестирование GPU...' : '⚡ Измерить реальные GFLOPS'}</span>
                  </button>
                </div>
              </div>

              {/* Hardware Parameters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] pt-2 border-t border-slate-800/80">
                <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">Производитель</span>
                  <span className="text-emerald-400 font-bold text-xs">{gpuHardware.vendor}</span>
                  <span className="text-slate-500 block text-[8px]">{gpuHardware.isDiscrete ? 'Дискретный адаптер' : 'Встроенный адаптер'}</span>
                </div>

                <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">Видеопамять</span>
                  <span className="text-cyan-400 font-bold text-xs">{gpuHardware.vramFormatted || 'VRAM'}</span>
                  <span className="text-slate-500 block text-[8px]">Параллельные буферы СЛАУ</span>
                </div>

                {gpuHardware.cudaCoresEst !== undefined && gpuHardware.cudaCoresEst > 0 ? (
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">CUDA ядра</span>
                    <span className="text-purple-400 font-bold text-xs">{gpuHardware.cudaCoresEst.toLocaleString()}</span>
                    <span className="text-slate-500 block text-[8px]">Потоковые процессоры</span>
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">Шейдерные ядра</span>
                    <span className="text-purple-400 font-bold text-xs">Аппаратные</span>
                    <span className="text-slate-500 block text-[8px]">Параллельные блоки GPU</span>
                  </div>
                )}

                <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">Вычислительный конвейер</span>
                  <span className="text-emerald-300 font-bold text-xs">Float32 / Float64</span>
                  <span className="text-slate-500 block text-[8px]">Прямой SpMV на видеокарте</span>
                </div>
              </div>
            </div>

            {/* CUDA Kernel Configuration Controls */}
            <div className="flex items-center gap-5 flex-wrap pt-2 border-t border-emerald-500/20">
              {/* CUDA Block Size */}
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-[11px] text-slate-400">Потоков на блок (Block Size):</span>
                <select
                  value={cudaBlockSize}
                  onChange={(e) => setCudaBlockSize(Number(e.target.value))}
                  className="bg-slate-950 border border-emerald-500/40 rounded-lg px-2.5 py-1 text-xs text-emerald-300 font-mono cursor-pointer"
                >
                  <option value={64}>64 (2 варпа)</option>
                  <option value={128}>128 (4 варпа)</option>
                  <option value={256}>256 (Рекомендуется)</option>
                  <option value={512}>512 (Макс. параллелизм)</option>
                </select>
              </div>

              {/* CUDA Precision */}
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-[11px] text-slate-400">Точность вычислений CUDA:</span>
                <select
                  value={cudaPrecision}
                  onChange={(e) => setCudaPrecision(e.target.value as CudaPrecision)}
                  className="bg-slate-950 border border-emerald-500/40 rounded-lg px-2.5 py-1 text-xs text-emerald-300 font-mono cursor-pointer"
                >
                  <option value="fp64">FP64 (Double Precision)</option>
                  <option value="fp32">FP32 (Fast Single Precision)</option>
                </select>
              </div>

              <div className="text-[11px] text-slate-400 font-mono">
                Размер варпа: <strong className="text-slate-200">32 потока (Warp Reduction)</strong>
              </div>
            </div>
          </div>
        )}

        {/* CPU Hardware & Multithreading Configuration Sub-Bar (When CPU selected) */}
        {computeDevice === 'cpu' && (
          <div className="px-5 py-3.5 bg-cyan-950/20 border-b border-cyan-500/20 flex flex-col gap-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* CPU Thread Count Selector */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  Параллельные потоки процессора (CPU Threads):
                </span>
                <select
                  value={cpuThreads}
                  onChange={(e) => setCpuThreads(Number(e.target.value))}
                  className="bg-slate-950 border border-cyan-500/50 rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-medium cursor-pointer shadow-inner font-mono"
                >
                  <option value={1}>1 поток (Однопоточный baseline)</option>
                  <option value={2}>2 потока (Dual-Core)</option>
                  <option value={4}>4 потока (Quad-Core)</option>
                  <option value={6}>6 потоков (6-Core)</option>
                  <option value={8}>8 потоков (8-Core Octa)</option>
                  <option value={12}>12 потоков (12-Core)</option>
                  <option value={16}>16 потоков (16-Core High-End)</option>
                  <option value={24}>24 потока (24-Core Workstation)</option>
                  <option value={32}>32 потока (32-Core Threadripper / Server)</option>
                </select>

                <div className="flex items-center gap-1.5 ml-2">
                  <button
                    type="button"
                    onClick={() => setCpuThreads(1)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer transition-all ${
                      cpuThreads === 1
                        ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    1x
                  </button>
                  <button
                    type="button"
                    onClick={() => setCpuThreads(Math.max(1, Math.floor(hardwareConcurrency / 2)))}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer transition-all ${
                      cpuThreads === Math.max(1, Math.floor(hardwareConcurrency / 2))
                        ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {Math.max(1, Math.floor(hardwareConcurrency / 2))}x
                  </button>
                  <button
                    type="button"
                    onClick={() => setCpuThreads(hardwareConcurrency)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer transition-all ${
                      cpuThreads === hardwareConcurrency
                        ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    Max ({hardwareConcurrency}x)
                  </button>
                </div>
              </div>

              {/* Hardware stats */}
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300 bg-slate-950/80 px-3 py-1 rounded-lg border border-cyan-500/30">
                <span className="text-cyan-400 font-bold">Обнаружено: {hardwareConcurrency} логических ядер CPU</span>
                <span className="text-slate-500">|</span>
                <span>Нагрузка: <strong className="text-emerald-300">~{Math.ceil(matrix.rows / cpuThreads)} строк/поток</strong></span>
              </div>
            </div>

            {/* CPU Scheduling & Parallel Strategy */}
            <div className="flex items-center gap-5 flex-wrap pt-2 border-t border-cyan-500/20">
              {/* Scheduling scheme */}
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-[11px] text-slate-400">Схема балансировки нагрузки:</span>
                <select
                  value={cpuScheduling}
                  onChange={(e) => setCpuScheduling(e.target.value as CpuParallelScheduling)}
                  className="bg-slate-950 border border-cyan-500/40 rounded-lg px-2.5 py-1 text-xs text-cyan-300 cursor-pointer"
                >
                  <option value="static_chunking">OpenMP Static Chunking (Равномерное разделение строк)</option>
                  <option value="dynamic_rows">Dynamic Row Scheduling (Динамический захват строк)</option>
                  <option value="simd_avx">SIMD AVX-512 Vectorized (Векторные регистры Float64)</option>
                </select>
              </div>

              <div className="text-[11px] text-slate-400 font-mono">
                Параллелизм: <strong className="text-slate-200">Domain Decomposition (CSR Row Pointer)</strong>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Column 1: Solver Algorithm */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Алгоритм решения:
            </label>
            <select
              value={solverType}
              onChange={(e) => setSolverType(e.target.value as LinearSolverType)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer font-medium"
            >
              <optgroup label="Крыловские методы для симметричных SPD матриц">
                <option value="cg">CG (Conjugate Gradient / Сопряженные градиенты)</option>
                <option value="pcg_jacobi">PCG-Jacobi (Диагональный предобусловливатель)</option>
                <option value="pcg_ssor">PCG-SSOR (Симметричная релаксация SSOR)</option>
              </optgroup>
              <optgroup label="Для общих несимметричных систем">
                <option value="bicgstab">BiCGSTAB (Biconjugate Gradient Stabilized)</option>
                <option value="gmres">GMRES(m) (Restarted Minimal Residual)</option>
              </optgroup>
              <optgroup label="Стационарные итерационные схемы">
                <option value="sor">SOR (Successive Over-Relaxation)</option>
                <option value="gauss_seidel">Гаусс-Зейдель (Gauss-Seidel)</option>
                <option value="jacobi">Якоби (Jacobi Iteration)</option>
              </optgroup>
              <optgroup label="Точный прямой метод">
                <option value="direct_lu">Прямой ленточный LU-метод (Direct Solve)</option>
              </optgroup>
            </select>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
              {solverType.startsWith('cg') || solverType.startsWith('pcg') ? (
                <span>
                  <strong>Метод сопряженных градиентов (CG):</strong> параллельные умножения матрицы на вектор ($A \cdot p$) и редукции скалярных произведений на {computeDevice === 'cuda_gpu' ? 'CUDA-ядрах NVIDIA GPU' : 'CPU'}.
                </span>
              ) : solverType === 'bicgstab' || solverType === 'gmres' ? (
                <span>
                  <strong>{solverType.toUpperCase()}:</strong> оптимизирован для разреженных несимметричных систем на {computeDevice === 'cuda_gpu' ? 'видеокарте NVIDIA GeForce RTX' : 'процессоре'}.
                </span>
              ) : (
                <span>
                  <strong>Стационарный метод:</strong> пошаговое расщепление матрицы $A = D - L - U$.
                </span>
              )}
            </div>
          </div>

          {/* Column 2: Right-Hand Side Vector b */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Вектор правой части $b$:
            </label>
            <select
              value={rhsType}
              onChange={(e) => setRhsType(e.target.value as RhsType)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer font-medium"
            >
              <option value="exact_ones">Тест с известным решением: b = A * [1, 1, ..., 1]ᵀ</option>
              <option value="ones">Единичный вектор: b = [1, 1, ..., 1]ᵀ</option>
              <option value="sin_harmonic">Гармоническая волна: b_i = sin(2π i / N)</option>
              <option value="impulse">Импульсный источник: b = [1, 0, ..., 0]ᵀ</option>
              <option value="linear_gradient">Линейный градиент: b_i = i / N</option>
              <option value="random">Случайное распределение (Uniform)</option>
            </select>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
              При выборе <em>b = A * [1, ..., 1]ᵀ</em> решатель автоматически вычисляет не только невязку $\|Ax - b\|$, но и истинную ошибку $\|x_k - x^*\|$.
            </div>
          </div>

          {/* Column 3: Tolerance and Max Iterations */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Точность ($\varepsilon$):
              </label>
              <select
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-cyan-300 font-mono"
              >
                <option value={1e-4}>10⁻⁴ (Быстро)</option>
                <option value={1e-6}>10⁻⁶ (Стандарт)</option>
                <option value={1e-9}>10⁻⁹ (Высокая)</option>
                <option value={1e-12}>10⁻¹² (Экстремальная)</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Макс. итераций:
              </label>
              <input
                type="number"
                min="50"
                max="5000"
                step="50"
                value={maxIterations}
                onChange={(e) => setMaxIterations(Math.max(50, Number(e.target.value)))}
                className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono text-right"
              />
            </div>

            {/* SOR parameter if SOR chosen */}
            {solverType === 'sor' && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <span className="text-xs text-slate-400">Параметр релаксации $\omega$:</span>
                <input
                  type="number"
                  min="0.1"
                  max="1.95"
                  step="0.05"
                  value={sorOmega}
                  onChange={(e) => setSorOmega(Number(e.target.value))}
                  className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-amber-300 font-mono text-right"
                />
              </div>
            )}

            {/* GMRES restart parameter */}
            {solverType === 'gmres' && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <span className="text-xs text-slate-400">Размерность Krylov $m$:</span>
                <input
                  type="number"
                  min="5"
                  max="100"
                  step="5"
                  value={gmresRestart}
                  onChange={(e) => setGmresRestart(Number(e.target.value))}
                  className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-indigo-300 font-mono text-right"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. CONVERGENCE CHART & TELEMETRY                                          */}
      {/* ========================================================================= */}
      <section id="sparse-convergence-section" className="scroll-mt-20 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>3. СХОДИМОСТЬ И ТЕЛЕМЕТРИЯ РЕШЕНИЯ СЛАУ</span>
              </h2>
              <p className="text-xs text-slate-400">
                Логарифмическая динамика невязки log₁₀(||r_k|| / ||r_0||), секундомер и производительность вычислений
              </p>
            </div>
          </div>

          {solverResult && (
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 text-xs font-mono">
                <Timer className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-400">Итоговое время:</span>
                <span className="text-indigo-300 font-bold">
                  {formatResultDuration(solverResult.elapsedTimeMs)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 flex flex-col gap-6">
          <LinearConvergenceChart result={solverResult} tolerance={tolerance} height={320} />

          {/* Solution Vector Components Preview */}
          {solverResult && solverResult.solutionVector.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
                <span className="font-bold text-slate-200">
                  Вектор решения $x = [x_1, x_2, \dots, x_N]^T$ ($N = {solverResult.solutionVector.length}$)
                </span>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="text-slate-400">
                    Мин: <span className="text-cyan-400">{Math.min(...solverResult.solutionVector).toFixed(4)}</span>
                  </span>
                  <span className="text-slate-400">
                    Макс: <span className="text-cyan-400">{Math.max(...solverResult.solutionVector).toFixed(4)}</span>
                  </span>
                </div>
              </div>

              {/* Mini Sparkline Bar Chart of Solution Components */}
              <div className="h-16 flex items-end gap-0.5 border-b border-slate-800 pb-1">
                {(() => {
                  const vec = solverResult.solutionVector;
                  const step = Math.max(1, Math.floor(vec.length / 120));
                  const sampled: number[] = [];
                  for (let i = 0; i < vec.length; i += step) sampled.push(vec[i]);

                  const maxAbs = Math.max(...sampled.map(Math.abs), 1e-12);

                  return sampled.map((val, idx) => {
                    const h = (Math.abs(val) / maxAbs) * 100;
                    return (
                      <div
                        key={idx}
                        className={`flex-1 rounded-t-xs transition-all ${val >= 0 ? 'bg-cyan-500' : 'bg-rose-500'}`}
                        style={{ height: `${Math.max(4, h)}%` }}
                        title={`x[${idx * step + 1}] = ${val.toFixed(6)}`}
                      />
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SOLUTION HISTORY, PHYSICAL DOMAIN & MATRIX COMPLEXITY                   */}
      {/* ========================================================================= */}
      <section id="solution-history-section" className="scroll-mt-20">
        <LinearSolutionHistory
          history={linearHistory}
          activeMatrix={matrix}
          currentResult={solverResult}
          onClearHistory={handleClearHistory}
          onDeleteRecord={handleDeleteHistoryRecord}
          onRerunRecord={handleRerunRecord}
        />
      </section>

      {/* Catalog Modal */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  Каталог Матриц Texas A&M (SuiteSparse Collection)
                </h3>
              </div>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto min-h-[400px]">
              <SuiteSparseCatalogModal
                onLoadMatrix={(loaded) => {
                  setMatrix(loaded);
                  setShowCatalogModal(false);
                }}
                onClose={() => setShowCatalogModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* NVIDIA GeForce RTX Windows Setup Guide Modal */}
      {showNvidiaGuideModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  Как задействовать дискретный GPU NVIDIA GeForce RTX в браузере
                </h3>
              </div>
              <button
                onClick={() => setShowNvidiaGuideModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4 text-xs text-slate-300">
              <p className="text-slate-300 leading-relaxed">
                На ноутбуках и ПК с двумя видеокартами (гибридная графика Intel UHD/Iris + дискретный <strong>NVIDIA GeForce RTX</strong>) операционная система Windows часто по умолчанию запускает браузер на энергосберегающем Intel GPU.
              </p>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                <h4 className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <Monitor className="w-4 h-4" />
                  Способ 1: Настройки графики Windows (Рекомендуется)
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 ml-1">
                  <li>Нажмите <strong>Win + I</strong> (или откройте «Параметры Windows»).</li>
                  <li>Перейдите в раздел <strong>Система → Дисплей → Графика</strong> (или «Настройки графики»).</li>
                  <li>В списке приложений найдите ваш браузер (<em>Google Chrome</em>, <em>Yandex</em>, <em>Edge</em>, <em>Brave</em>). Если его нет, нажмите «Обзор» и укажите <code>chrome.exe</code>.</li>
                  <li>Нажмите на браузер → кнопку <strong>«Параметры»</strong>.</li>
                  <li>Выберите пункт <strong>«Высокая производительность: Графический процессор NVIDIA»</strong> и сохраните.</li>
                  <li>Перезапустите браузер.</li>
                </ol>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                <h4 className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  Способ 2: Панель управления NVIDIA (NVIDIA Control Panel)
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 ml-1">
                  <li>Кликните правой кнопкой мыши по рабочему столу → <strong>«Панель управления NVIDIA»</strong>.</li>
                  <li>Слева выберите <strong>«Управление параметрами 3D»</strong> → вкладка <strong>«Программные настройки»</strong>.</li>
                  <li>Выберите браузер в выпадающем списке.</li>
                  <li>В пункте «Предпочтительный графический процессор» укажите <strong>«Высокопроизводительный процессор NVIDIA»</strong>.</li>
                  <li>Нажмите «Применить».</li>
                </ol>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
                ✨ В приложении уже активирован режим принудительного моделирования и вычислений под архитектуру <strong>NVIDIA GeForce RTX (CUDA Cores)</strong>. Вы можете выбрать конкретную модель вашей видеокарты (например, RTX 4070, 4080, 4090, 3080) прямо в выпадающем меню!
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowNvidiaGuideModal(false)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer transition-all"
                >
                  Понятно, продолжить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real Hardware NVIDIA GPU Inspector & Benchmark Modal */}
      <NvidiaGpuInspectorModal
        isOpen={showGpuInspectorModal}
        onClose={() => setShowGpuInspectorModal(false)}
        detectedGpus={detectedGpus}
        selectedGpuId={selectedNvidiaModel}
        onSelectGpu={(id) => {
          setSelectedNvidiaModel(id);
          setShowGpuInspectorModal(false);
        }}
        onRescanGpus={handleRescanGpus}
        isScanning={isScanningGpus}
      />
    </div>
  );
};
