import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Zap,
  Cpu,
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  HelpCircle,
  X,
  Sparkles,
  RefreshCw,
  Sliders,
  Layers,
  Gauge,
  Monitor,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Flame,
  Info,
} from 'lucide-react';
import {
  getHighPerformanceWebGpuDevice,
  runWebGpuParallelBenchmark,
  startContinuousGpuCompute,
  detectExactRendererDetails,
  HardwareGpuStatus,
  ParallelComputeResult,
  ContinuousComputeStats,
  ExactRendererDetails,
} from '../utils/gpuHardwareEnforcer';
import { detectHighPerformanceGPU, GPUInfo } from '../utils/gpuSolver';

export const NvidiaHardwareEnforcerBar: React.FC = () => {
  const [gpuStatus, setGpuStatus] = useState<HardwareGpuStatus | null>(null);
  const [gpuInfo, setGpuInfo] = useState<GPUInfo | null>(null);
  const [exactRenderer, setExactRenderer] = useState<ExactRendererDetails | null>(null);
  const [isInstructionOpen, setIsInstructionOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'taskmanager' | 'windows' | 'nvidia' | 'flags'>('taskmanager');
  const [isBenchmarkRunning, setIsBenchmarkRunning] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<ParallelComputeResult | null>(null);
  const [fps, setFps] = useState<number>(60);

  // Continuous GPU compute stream state
  const [isContinuousActive, setIsContinuousActive] = useState<boolean>(false);
  const [computeIntensity, setComputeIntensity] = useState<number>(0.75); // 75% load by default
  const [continuousStats, setContinuousStats] = useState<ContinuousComputeStats | null>(null);
  const stopContinuousRef = useRef<(() => void) | null>(null);

  // Measure Real FPS
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const measureFps = () => {
      frameCountRef.current++;
      const now = performance.now();
      if (now - lastTimeRef.current >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current)));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      rafRef.current = requestAnimationFrame(measureFps);
    };

    rafRef.current = requestAnimationFrame(measureFps);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Initialize GPU hardware detection
  const refreshGpuStatus = useCallback(async () => {
    try {
      const { status } = await getHighPerformanceWebGpuDevice();
      setGpuStatus(status);
      const info = detectHighPerformanceGPU();
      setGpuInfo(info);
      const exact = detectExactRendererDetails();
      setExactRenderer(exact);
    } catch (err) {
      console.warn('Failed to detect GPU status:', err);
    }
  }, []);

  useEffect(() => {
    refreshGpuStatus();
  }, [refreshGpuStatus]);

  // Toggle Continuous Heavy GPU Compute Loop
  const toggleContinuousCompute = () => {
    if (isContinuousActive) {
      if (stopContinuousRef.current) {
        stopContinuousRef.current();
        stopContinuousRef.current = null;
      }
      setIsContinuousActive(false);
      setContinuousStats(null);
    } else {
      setIsContinuousActive(true);
      const stopFn = startContinuousGpuCompute(computeIntensity, (stats) => {
        setContinuousStats(stats);
      });
      stopContinuousRef.current = stopFn;
    }
  };

  // Cleanup continuous compute on unmount
  useEffect(() => {
    return () => {
      if (stopContinuousRef.current) {
        stopContinuousRef.current();
      }
    };
  }, []);

  const handleRunBenchmark = async () => {
    setIsBenchmarkRunning(true);
    try {
      const result = await runWebGpuParallelBenchmark(1048576);
      setBenchmarkResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsBenchmarkRunning(false);
    }
  };

  const isNvidiaDetected =
    exactRenderer?.isNvidia ||
    gpuStatus?.vendor === 'NVIDIA' ||
    gpuInfo?.vendor === 'NVIDIA' ||
    gpuInfo?.hasCuda ||
    gpuInfo?.detectedBrowserGpu?.toLowerCase().includes('nvidia') ||
    gpuInfo?.detectedBrowserGpu?.toLowerCase().includes('rtx') ||
    gpuInfo?.detectedBrowserGpu?.toLowerCase().includes('geforce');

  return (
    <>
      {/* Top Banner / Acceleration Toolbar */}
      <div className="w-full bg-slate-950/90 border border-slate-800/90 rounded-2xl p-3 sm:p-4 backdrop-blur-md shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs font-mono">
        {/* Left: Active GPU Identification */}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl flex items-center justify-center ${
            isNvidiaDetected
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-950/50'
              : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
          }`}>
            <Zap className="w-5 h-5 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-sm text-white flex items-center gap-1.5">
                {isNvidiaDetected ? (
                  <span className="text-emerald-400">NVIDIA CUDA High-Performance</span>
                ) : (
                  <span className="text-amber-300">Аппаратный GPU-Ускоритель</span>
                )}
              </span>

              <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] text-cyan-300 font-bold">
                {gpuStatus?.activeEngine || 'WebGPU Compute (WGSL)'}
              </span>

              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                fps >= 55
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                  : 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
              }`}>
                {fps} FPS
              </span>

              {isContinuousActive && (
                <span className="px-2 py-0.5 rounded-full bg-rose-950/90 text-rose-300 border border-rose-600/70 text-[10px] font-bold animate-pulse flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-400" />
                  CUDA LOAD ACTIVE
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400 mt-0.5 max-w-xl truncate" title={exactRenderer?.unmaskedRenderer || gpuInfo?.detectedBrowserGpu}>
              {exactRenderer?.unmaskedRenderer || gpuInfo?.detectedBrowserGpu || gpuStatus?.adapterName || 'Аппаратный контекст WebGPU / WebGL2 с приоритетом дискретного процессора'}
            </p>
          </div>
        </div>

        {/* Right: Quick Benchmark Trigger, Continuous CUDA Load & Guide Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          {/* Continuous GPU Load Streamer Toggle */}
          <button
            type="button"
            onClick={toggleContinuousCompute}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shadow-sm active:scale-95 border ${
              isContinuousActive
                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/60 shadow-lg shadow-rose-950/50'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700'
            }`}
            title="Запустить непрерывную параллельную нагрузку CUDA ядер на GPU (для проверки нагрузки в Диспетчере задач)"
          >
            {isContinuousActive ? (
              <>
                <Pause className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                <span>Остановить CUDA поток</span>
              </>
            ) : (
              <>
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Нагрузить GPU (Тест)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleRunBenchmark}
            disabled={isBenchmarkRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 border border-cyan-500/40 font-bold transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            title="Запустить параллельный вычислительный стресс-тест на 1 048 576 потоков на GPU"
          >
            {isBenchmarkRunning ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            ) : (
              <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
            )}
            <span>{isBenchmarkRunning ? 'Тестирование...' : 'Стресс-тест 1M'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsInstructionOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-bold transition-all cursor-pointer shadow-sm active:scale-95"
            title="Инструкция: почему в Диспетчере задач может быть 0% и как настроить графики Compute/CUDA"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Почему 0% в Диспетчере?</span>
          </button>
        </div>
      </div>

      {/* Active Continuous CUDA Load Monitor Bar */}
      {isContinuousActive && continuousStats && (
        <div className="bg-slate-950/95 border border-rose-500/50 rounded-2xl p-3.5 shadow-2xl animate-fadeIn flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-rose-300">Непрерывная нагрузка GPU активна:</span>
                <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-200 border border-rose-700/60 font-black text-xs">
                  {continuousStats.liveGflops.toFixed(1)} GFLOPS
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-700 text-[11px]">
                  {(continuousStats.threadsPerSecond / 1e6).toFixed(2)} Млн потоков/сек
                </span>
                <span className="text-slate-400 text-[11px]">
                  (Время: {continuousStats.elapsedSec}с, Пассов: {continuousStats.totalPasses.toLocaleString()})
                </span>
              </div>
              <p className="text-emerald-400 text-[11px] mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Откройте Диспетчер задач $\rightarrow$ <strong>Производительность</strong> $\rightarrow$ <strong>Графический процессор 1 (NVIDIA)</strong> $\rightarrow$ переключите график на <strong>Compute_0</strong> или <strong>3D</strong>.</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Интенсивность:</span>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={computeIntensity}
                onChange={(e) => setComputeIntensity(parseFloat(e.target.value))}
                className="w-24 accent-rose-500 cursor-pointer"
                title={`${Math.round(computeIntensity * 100)}% мощности шейдеров`}
              />
              <span className="text-rose-300 font-bold text-[11px] w-8">{Math.round(computeIntensity * 100)}%</span>
            </div>

            <button
              type="button"
              onClick={toggleContinuousCompute}
              className="px-2.5 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700 text-[11px] font-bold cursor-pointer transition-colors"
            >
              Стоп
            </button>
          </div>
        </div>
      )}

      {/* Benchmark Result Card if available */}
      {benchmarkResult && (
        <div className="bg-slate-950/90 border border-emerald-500/40 rounded-2xl p-4 animate-fadeIn shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-emerald-400">Результат GPU Вычислений:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-black text-xs">
                  {benchmarkResult.gflops.toFixed(1)} GFLOPS
                </span>
              </div>
              <p className="text-slate-300 text-[11px] mt-0.5">
                Выполнено {benchmarkResult.threadsExecuted.toLocaleString()} параллельных математических потоков за{' '}
                <strong className="text-cyan-400">{benchmarkResult.elapsedMs.toFixed(2)} мс</strong> ({benchmarkResult.engineUsed}).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setBenchmarkResult(null)}
            className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal: Comprehensive Diagnostics & Task Manager Setup Guide */}
      {isInstructionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Диагностика GPU и почему Диспетчер Задач показывает 0%
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Полное руководство по графикам Compute/CUDA и принудительному назначению NVIDIA
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsInstructionOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs inside Modal */}
            <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-800 bg-slate-950/40 overflow-x-auto text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveTab('taskmanager')}
                className={`px-3 py-2 border-b-2 font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'taskmanager'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                1. Графики в Диспетчере задач (Compute vs 3D)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('windows')}
                className={`px-3 py-2 border-b-2 font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'windows'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                2. Настройки Windows
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('nvidia')}
                className={`px-3 py-2 border-b-2 font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'nvidia'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                3. Панель NVIDIA
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('flags')}
                className={`px-3 py-2 border-b-2 font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'flags'
                    ? 'border-purple-400 text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                4. Флаги браузера
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto text-xs text-slate-300 font-mono leading-relaxed">
              {/* Tab 1: Task Manager Explanation */}
              {activeTab === 'taskmanager' && (
                <div className="space-y-4">
                  <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      <span>Главная причина: график Диспетчера задач настроен на «3D», а не «Compute»</span>
                    </div>
                    <p className="text-slate-300 text-xs">
                      Вычисления WebGPU, WGSL и математические матричные шейдеры браузера выполняются на вычислительных блоках GPU (<strong>Compute Core / CUDA</strong>), а не на блоке растеризации геометрии (3D).
                    </p>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                    <h4 className="text-white font-bold text-sm">Как увидеть реальную нагрузку NVIDIA в Диспетчере задач:</h4>
                    <ol className="list-decimal list-inside space-y-2 pl-1 text-slate-300 text-xs">
                      <li>Нажмите <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">Ctrl + Shift + Esc</kbd>, чтобы открыть Диспетчер задач.</li>
                      <li>Перейдите на вкладку <strong>«Производительность»</strong> $\rightarrow$ выберите <strong>«Графический процессор 1 (NVIDIA)»</strong>.</li>
                      <li>
                        По умолчанию там отображаются 4 графика: <em>«3D»</em>, <em>«Копирование»</em>, <em>«Video Decode»</em>, <em>«Video Processing»</em>.
                      </li>
                      <li>
                        <strong className="text-emerald-400">Кликните на маленькую стрелочку</strong> над графиком <em>«3D»</em> (или <em>«Копирование»</em>) и в выпадающем списке переключите его на <strong className="text-cyan-300">«Compute_0»</strong>, <strong className="text-cyan-300">«Compute_1»</strong> или <strong className="text-cyan-300">«Cuda»</strong>.
                      </li>
                      <li>
                        Включите кнопку <strong>«Нагрузить GPU (Тест)»</strong> в панели сверху — и вы сразу увидите скачок графика до 30–80%!
                      </li>
                    </ol>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
                    <span className="text-slate-400 font-bold block text-xs">Текущий видеоадаптер, распознанный браузером:</span>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300 break-all text-[11px]">
                      {exactRenderer?.unmaskedRenderer || 'Определение...'}
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                      <span>Версия: <strong className="text-white">{exactRenderer?.glVersion}</strong></span>
                      <span>Max Texture: <strong className="text-white">{exactRenderer?.maxTextureSize}px</strong></span>
                      <span>Статус NVIDIA: <strong className={exactRenderer?.isNvidia ? 'text-emerald-400' : 'text-amber-400'}>{exactRenderer?.isNvidia ? 'Да (NVIDIA)' : 'Требуется переключение в Windows'}</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Windows Graphics Settings */}
              {activeTab === 'windows' && (
                <div className="space-y-4">
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                      <Monitor className="w-4 h-4" />
                      <span>Принудительное назначение в параметрах Windows</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-2 pl-2 text-slate-300 text-xs">
                      <li>Нажмите комбинацию клавиш <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">Win + I</kbd> (Параметры Windows).</li>
                      <li>Перейдите в раздел: <strong>Система → Дисплей → Графика</strong> (в Windows 10: <em>Настройки графики</em>).</li>
                      <li>В списке приложений найдите ваш браузер (<strong>Google Chrome</strong> / <strong>Microsoft Edge</strong> / <strong>Yandex Browser</strong>).</li>
                      <li>Нажмите на браузер → кнопка <strong>Параметры</strong>.</li>
                      <li>Выберите пункт <strong>«Высокая производительность»</strong> (под ним будет указана ваша видеокарта NVIDIA GeForce / RTX).</li>
                      <li>Нажмите <strong>Сохранить</strong> и полностью перезапустите браузер.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Tab 3: NVIDIA Control Panel */}
              {activeTab === 'nvidia' && (
                <div className="space-y-4">
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <Zap className="w-4 h-4" />
                      <span>Панель управления NVIDIA (NVIDIA Control Panel)</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-2 pl-2 text-slate-300 text-xs">
                      <li>Нажмите правой кнопкой мыши на пустом месте Рабочего стола → <strong>Панель управления NVIDIA</strong>.</li>
                      <li>В левом меню выберите <strong>«Управление параметрами 3D»</strong>.</li>
                      <li>Перейдите на вкладку <strong>«Программные настройки»</strong>.</li>
                      <li>В выпадающем списке выберите <em>Google Chrome</em> (или нажмите «Добавить» и укажите <code>chrome.exe</code>).</li>
                      <li>В пункте «Предпочтительный графический процессор» выберите: <strong>«Высокопроизводительный процессор NVIDIA»</strong>.</li>
                      <li>В списке параметров ниже найдите <strong>«Режим управления электропитанием»</strong> и переключите на <strong>«Предпочтителен режим максимальной производительности»</strong>.</li>
                      <li>Нажмите кнопку <strong>Применить</strong> в правом нижнем углу.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Tab 4: Browser Flags */}
              {activeTab === 'flags' && (
                <div className="space-y-4">
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                      <Sparkles className="w-4 h-4" />
                      <span>Флаги браузера для максимального WebGPU и ANGLE ускорения</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Вставьте следующие адреса в адресную строку браузера и переключите в положение <strong>Enabled</strong> или выберите <strong>D3D11/D3D12</strong>:
                    </p>
                    <div className="space-y-2 text-[11px]">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <code className="text-cyan-300">chrome://flags/#enable-unsafe-webgpu</code>
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold">Enabled</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <code className="text-cyan-300">chrome://flags/#use-angle</code>
                        <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px] font-bold">D3D11 / D3D12</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <code className="text-cyan-300">chrome://flags/#ignore-gpu-blocklist</code>
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold">Enabled</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>WebGPU & WebGL2 Hardware Allocation: High-Performance</span>
              </div>

              <button
                type="button"
                onClick={() => setIsInstructionOpen(false)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-lg shadow-emerald-950/60"
              >
                Понятно, закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
