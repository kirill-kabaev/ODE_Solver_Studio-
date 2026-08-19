import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Zap,
  Cpu,
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Play,
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
} from 'lucide-react';
import {
  getHighPerformanceWebGpuDevice,
  runWebGpuParallelBenchmark,
  HardwareGpuStatus,
  ParallelComputeResult,
} from '../utils/gpuHardwareEnforcer';
import { detectHighPerformanceGPU, GPUInfo } from '../utils/gpuSolver';

export const NvidiaHardwareEnforcerBar: React.FC = () => {
  const [gpuStatus, setGpuStatus] = useState<HardwareGpuStatus | null>(null);
  const [gpuInfo, setGpuInfo] = useState<GPUInfo | null>(null);
  const [isInstructionOpen, setIsInstructionOpen] = useState(false);
  const [isBenchmarkRunning, setIsBenchmarkRunning] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<ParallelComputeResult | null>(null);
  const [fps, setFps] = useState<number>(60);
  const [isHovered, setIsHovered] = useState(false);

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
    } catch (err) {
      console.warn('Failed to detect GPU status:', err);
    }
  }, []);

  useEffect(() => {
    refreshGpuStatus();
  }, [refreshGpuStatus]);

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
            </div>

            <p className="text-[11px] text-slate-400 mt-0.5 max-w-xl truncate">
              {gpuInfo?.detectedBrowserGpu || gpuStatus?.adapterName || 'Аппаратный контекст WebGPU / WebGL2 с приоритетом дискретного процессора'}
            </p>
          </div>
        </div>

        {/* Right: Quick Benchmark Trigger & Guide Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
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
            <span>{isBenchmarkRunning ? 'Тестирование...' : 'Стресс-тест 1M GPU'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsInstructionOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-bold transition-all cursor-pointer shadow-sm active:scale-95"
            title="Инструкция: как принудительно заставить браузер и Windows использовать только NVIDIA"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>Форсировать NVIDIA</span>
          </button>
        </div>
      </div>

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

      {/* Modal: Full Step-by-Step Guide on How to Enforce NVIDIA in Windows & Browser */}
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
                    Принудительное переключение на дискретную видеокарту NVIDIA
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Пошаговая инструкция для устранения задержек и включения 100% мощности CUDA / WebGPU
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsInstructionOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto text-xs text-slate-300 font-mono leading-relaxed">
              {/* Note on why integrated GPU throttles */}
              <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-4 flex items-start gap-3 text-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <strong className="block text-amber-300 font-bold">
                    Почему по умолчанию браузер может запускаться на интегрированной видеокарте (Intel/AMD)?
                  </strong>
                  <p className="text-slate-300 text-[11px]">
                    В ноутбуках и ПК с двумя видеокартами Windows и браузер (Chrome / Edge / Yandex) в целях энергосбережения по умолчанию запускают вкладки на слабом встроенном чипе Intel HD/UHD. Для 3D CFD, VLM и BEM инжиниринга необходимо принудительно назначить дискретную видеокарту NVIDIA.
                  </p>
                </div>
              </div>

              {/* Step 1 */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-slate-950 text-xs font-black">
                    1
                  </span>
                  <span>Настройка графики Windows (Самый надежный способ)</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 pl-2 text-slate-300 text-xs">
                  <li>Нажмите комбинацию клавиш <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">Win + I</kbd> (Параметры Windows).</li>
                  <li>Перейдите в раздел: <strong>Система → Дисплей → Графика</strong> (в Windows 10: <em>Настройки графики</em>).</li>
                  <li>В списке приложений найдите ваш браузер (<strong>Google Chrome</strong> / <strong>Microsoft Edge</strong> / <strong>Yandex Browser</strong>).</li>
                  <li>Нажмите на браузер → кнопка <strong>Параметры</strong>.</li>
                  <li>Выберите пункт <strong>«Высокая производительность»</strong> (под ним будет указана ваша видеокарта NVIDIA GeForce / RTX).</li>
                  <li>Нажмите <strong>Сохранить</strong> и полностью перезапустите браузер.</li>
                </ol>
              </div>

              {/* Step 2 */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500 text-slate-950 text-xs font-black">
                    2
                  </span>
                  <span>Панель управления NVIDIA (NVIDIA Control Panel)</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 pl-2 text-slate-300 text-xs">
                  <li>Нажмите правой кнопкой мыши на пустом месте Рабочего стола → <strong>Панель управления NVIDIA</strong>.</li>
                  <li>В левом меню выберите <strong>«Управление параметрами 3D»</strong>.</li>
                  <li>Перейдите на вкладку <strong>«Программные настройки»</strong>.</li>
                  <li>В выпадающем списке выберите <em>Google Chrome</em> (или нажмите «Добавить» и укажите <code>chrome.exe</code>).</li>
                  <li>В пункте «Предпочтительный графический процессор» выберите: <strong>«Высокопроизводительный процессор NVIDIA»</strong>.</li>
                  <li>В списке параметров ниже найдите <strong>«Режим управления электропитанием»</strong> и переключите на <strong>«Предпочтителен режим максимальной производительности»</strong>.</li>
                  <li>Нажмите кнопку <strong>Применить</strong> в правом нижнем углу.</li>
                </ol>
              </div>

              {/* Step 3 */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500 text-slate-950 text-xs font-black">
                    3
                  </span>
                  <span>Флаги браузера для максимального WebGPU и CUDA ускорения</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Вставьте следующие адреса в адресную строку браузера и переключите в положение <strong>Enabled</strong>:
                </p>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <code className="text-cyan-300">chrome://flags/#enable-unsafe-webgpu</code>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <code className="text-cyan-300">chrome://flags/#ignore-gpu-blocklist</code>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold">Enabled</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>WebGPU и WebGL2 контексты настроены на high-performance</span>
              </div>

              <button
                type="button"
                onClick={() => setIsInstructionOpen(false)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-lg shadow-emerald-950/60"
              >
                Понятно, готово
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
