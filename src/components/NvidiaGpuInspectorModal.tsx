import React, { useState } from 'react';
import {
  X,
  Zap,
  Activity,
  Cpu,
  Server,
  Layers,
  Gauge,
  CheckCircle2,
  HardDrive,
  Flame,
  BarChart3,
  Sparkles,
  RefreshCw,
  Info,
  ShieldCheck,
  Play
} from 'lucide-react';
import { DetectedGpuDevice, NvidiaGpuSpec, KNOWN_NVIDIA_GPUS, runRealGpuBenchmark } from '../utils/gpuDetector';

interface NvidiaGpuInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  detectedGpus: DetectedGpuDevice[];
  selectedGpuId: string;
  onSelectGpu: (id: string) => void;
  onRescanGpus: () => Promise<void>;
  isScanning: boolean;
}

export const NvidiaGpuInspectorModal: React.FC<NvidiaGpuInspectorModalProps> = ({
  isOpen,
  onClose,
  detectedGpus,
  selectedGpuId,
  onSelectGpu,
  onRescanGpus,
  isScanning,
}) => {
  const [activeTab, setActiveTab] = useState<'detected' | 'catalog' | 'benchmark' | 'guide'>('detected');
  const [benchmarkGflops, setBenchmarkGflops] = useState<number | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState<boolean>(false);
  const [benchmarkMatrixSize, setBenchmarkMatrixSize] = useState<number>(512);

  if (!isOpen) return null;

  const currentDevice =
    detectedGpus.find((g) => g.id === selectedGpuId || g.matchedSpec.id === selectedGpuId) ||
    detectedGpus[0];
  const spec: NvidiaGpuSpec = currentDevice?.matchedSpec || KNOWN_NVIDIA_GPUS[0];

  const handleRunBenchmark = async () => {
    setIsBenchmarking(true);
    try {
      const resultGflops = await runRealGpuBenchmark(benchmarkMatrixSize);
      setBenchmarkGflops(resultGflops);
    } catch (e) {
      console.error(e);
    } finally {
      setIsBenchmarking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div
        id="nvidia-gpu-inspector-modal"
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 font-mono">
                  Аппаратный инспектор GPU NVIDIA & Расчет ядер и GFLOPS
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  CUDA / WebGPU
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Распознанные графические процессоры на вашем ПК, детальная раскладка ядер (CUDA, SM, Tensor, RT) и флопсов
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-slate-800 bg-slate-950/30 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('detected')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'detected'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Обнаруженные на ПК ({detectedGpus.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('benchmark')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'benchmark'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Тест реальных GFLOPS</span>
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'catalog'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>База всех моделей NVIDIA ({KNOWN_NVIDIA_GPUS.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>Инструкция по настройке</span>
          </button>

          <div className="ml-auto">
            <button
              onClick={() => onRescanGpus()}
              disabled={isScanning}
              className="px-3 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Сканирование...' : 'Пересканировать ПК'}</span>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6 text-slate-300 text-xs leading-relaxed">
          {/* TAB 1: Detected Devices */}
          {activeTab === 'detected' && (
            <div className="flex flex-col gap-5">
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-slate-100 text-sm">
                    Аппаратное сканирование оборудования завершено
                  </span>
                  <p className="text-slate-400 text-xs">
                    Браузер распознал адаптер через расширение WebGL Unmasked Hardware Context и WebGPU. Ниже
                    представлена полная архитектурная раскладка ядер и теоретических/эффективных флопсов для вашей видеокарты.
                  </p>
                </div>
              </div>

              {/* Detected GPU Cards List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {detectedGpus.map((dev) => {
                  const isSelected = dev.id === selectedGpuId || dev.matchedSpec.id === selectedGpuId;
                  const devSpec = dev.matchedSpec;
                  return (
                    <div
                      key={dev.id}
                      onClick={() => onSelectGpu(dev.matchedSpec.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'bg-slate-950 border-emerald-500 shadow-lg shadow-emerald-500/10'
                          : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-100 font-mono">
                              {devSpec.name}
                            </span>
                            {isSelected && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                ВЫБРАНО
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                            {devSpec.architecture} • {dev.webGlVersion}
                          </span>
                        </div>
                        <div className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-300">
                          {devSpec.vramGB} GB {devSpec.vramType}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                        <div>
                          <span className="text-slate-500 block text-[10px]">CUDA Ядра:</span>
                          <span className="font-bold text-emerald-400">{devSpec.cudaCores.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">FP32 TFLOPS:</span>
                          <span className="font-bold text-cyan-400">{devSpec.fp32TFlops} TF</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">ПСП (Bandwidth):</span>
                          <span className="font-bold text-amber-400">{devSpec.bandwidthGBs} GB/s</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detailed Breakdown for the currently selected GPU */}
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-bold text-slate-100 font-mono text-sm">
                      Полная спецификация ядер и производительности: {spec.name}
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    TDP: <strong className="text-slate-200">{spec.tdpWatts} W</strong>
                  </span>
                </div>

                {/* Core Architecture Grid: "сколько ядер куда" */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                    Распределение и конфигурация вычислительных ядер ("Сколько ядер куда"):
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* CUDA Cores */}
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1">
                      <span className="text-slate-400 text-[10px]">CUDA Ядра (FP32 Shaders)</span>
                      <span className="text-lg font-bold text-emerald-400 font-mono">
                        {spec.cudaCores.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Потоковые процессоры
                      </span>
                    </div>

                    {/* SM Blocks */}
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1">
                      <span className="text-slate-400 text-[10px]">SM Мультипроцессоры</span>
                      <span className="text-lg font-bold text-cyan-400 font-mono">
                        {spec.smCount} SM
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {spec.coresPerSm} ядер на 1 SM
                      </span>
                    </div>

                    {/* Tensor Cores */}
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1">
                      <span className="text-slate-400 text-[10px]">Tensor Cores (AI/Matrix)</span>
                      <span className="text-lg font-bold text-purple-400 font-mono">
                        {spec.tensorCores > 0 ? `${spec.tensorCores} ядер` : '—'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {spec.tensorGen || 'Матричные блоки'}
                      </span>
                    </div>

                    {/* RT Cores */}
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1">
                      <span className="text-slate-400 text-[10px]">RT Cores (Ray Tracing)</span>
                      <span className="text-lg font-bold text-amber-400 font-mono">
                        {spec.rtCores > 0 ? `${spec.rtCores} ядер` : '—'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {spec.rtGen || 'Трассировка лучей'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* GFLOPS & Compute Throughput Breakdown */}
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                    Теоретическая и эффективная производительность (Флопсы):
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex flex-col gap-0.5">
                      <span className="text-slate-400 text-[10px]">FP32 Single Precision</span>
                      <span className="text-base font-bold text-cyan-300 font-mono">
                        {spec.fp32TFlops} TFLOPS
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {(spec.fp32TFlops * 1000).toFixed(0)} GFLOPS
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex flex-col gap-0.5">
                      <span className="text-slate-400 text-[10px]">FP64 Double Precision</span>
                      <span className="text-base font-bold text-emerald-300 font-mono">
                        {spec.fp64GFlops >= 1000 ? `${(spec.fp64GFlops / 1000).toFixed(2)} TFLOPS` : `${spec.fp64GFlops} GFLOPS`}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Научные СЛАУ Float64
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/90 border border-purple-500/30 flex flex-col gap-0.5">
                      <span className="text-slate-400 text-[10px]">Tensor Dense Compute</span>
                      <span className="text-base font-bold text-purple-300 font-mono">
                        {spec.tensorTFlops > 0 ? `${spec.tensorTFlops} TFLOPS` : '—'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        FP16/FP8 Матрицы
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 flex flex-col gap-0.5">
                      <span className="text-slate-400 text-[10px]">CSR SpMV Peak GFLOPS</span>
                      <span className="text-base font-bold text-amber-300 font-mono">
                        {spec.spmvEffectiveGFlops} GFLOPS
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Разреженные матрицы
                      </span>
                    </div>
                  </div>
                </div>

                {/* VRAM & Clocks */}
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                    Память VRAM, шина и тактовые частоты:
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[11px]">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Объем VRAM:</span>
                      <span className="text-slate-200 font-bold">{spec.vramGB} GB {spec.vramType}</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Разрядность шины:</span>
                      <span className="text-slate-200 font-bold">{spec.busWidthBits}-bit Memory Bus</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Пропускная способность:</span>
                      <span className="text-cyan-300 font-bold">{spec.bandwidthGBs} GB/s</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Частоты (Base / Boost):</span>
                      <span className="text-slate-200 font-bold">{spec.baseClockMHz} / {spec.boostClockMHz} MHz</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Real-time GPU Micro-Benchmark */}
          {activeTab === 'benchmark' && (
            <div className="flex flex-col gap-5">
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-start gap-3">
                <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-slate-100 text-sm">
                    Тестирование реальной производительности GPU в браузере
                  </span>
                  <p className="text-slate-400 text-xs">
                    Бенчмарк запускает высоконагруженные фрагментные и вычислительные шейдеры на графическом чипе вашего
                    компьютера, замеряя реальный достигнутый GFLOPS (миллиардов операций с плавающей запятой в секунду).
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">Размерность матрицы шейдера:</span>
                    <select
                      value={benchmarkMatrixSize}
                      onChange={(e) => setBenchmarkMatrixSize(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                    >
                      <option value={256}>256 × 256 (Легкий стресс-тест)</option>
                      <option value={512}>512 × 512 (Стандартный бенчмарк)</option>
                      <option value={1024}>1024 × 1024 (Тяжелый параллельный тест)</option>
                    </select>
                  </div>

                  <button
                    onClick={handleRunBenchmark}
                    disabled={isBenchmarking}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {isBenchmarking ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Вычисление шейдеров на GPU...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>Запустить тест на моем GPU ({spec.name})</span>
                      </>
                    )}
                  </button>
                </div>

                {benchmarkGflops !== null && (
                  <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between flex-wrap gap-4 animate-fade-in">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <Gauge className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block">Измеренный реальный GFLOPS:</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-emerald-300 font-mono">
                            {benchmarkGflops.toFixed(1)} GFLOPS
                          </span>
                          <span className="text-xs text-emerald-400 font-mono">
                            (~{(benchmarkGflops / 1000).toFixed(3)} TFLOPS)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-xs font-mono text-slate-400">
                      <div>Целевой адаптер: <strong className="text-slate-200">{spec.name}</strong></div>
                      <div>Параллельные шейдерные потоки: <strong className="text-cyan-300">{spec.cudaCores.toLocaleString()} ядер</strong></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Full Catalog of all NVIDIA GPUs */}
          {activeTab === 'catalog' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Выберите любую модель NVIDIA для изучения её ядер, пропускной способности и GFLOPS:
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                {KNOWN_NVIDIA_GPUS.map((gpu) => {
                  const isCurrent = gpu.id === spec.id;
                  return (
                    <div
                      key={gpu.id}
                      onClick={() => onSelectGpu(gpu.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        isCurrent
                          ? 'bg-slate-950 border-emerald-500 shadow-md shadow-emerald-500/10'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-100 font-mono">{gpu.name}</span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          {gpu.cudaCores.toLocaleString()} CUDA
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                        <span>{gpu.architecture}</span>
                        <span>{gpu.fp32TFlops} TFLOPS | {gpu.bandwidthGBs} GB/s</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: Windows / Linux / macOS Setup Guide */}
          {activeTab === 'guide' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">
                    Как гарантировать запуск на дискретной видеокарте NVIDIA
                  </h4>
                  <p className="text-slate-400 text-xs mt-1">
                    В ноутбуках и ПК с двумя видеокартами (Intel UHD + NVIDIA RTX) браузер по умолчанию может экономить
                    энергию на встроенной графике.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 font-sans text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1.5">
                  <span className="font-bold text-slate-200">1. Панель управления NVIDIA (NVIDIA Control Panel):</span>
                  <p className="text-slate-400">
                    Откройте <em>Панель управления NVIDIA</em> → <em>Управление параметрами 3D</em> → Вкладка <em>Программные настройки</em> → Выберите ваш браузер (Chrome / Edge / Firefox) → Установите <strong>«Высокопроизводительный процессор NVIDIA»</strong>.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1.5">
                  <span className="font-bold text-slate-200">2. Настройки графики Windows 10/11:</span>
                  <p className="text-slate-400">
                    Параметры Windows → <em>Дисплей</em> → <em>Графика</em> → Добавить приложение (Chrome/Edge) → <em>Параметры</em> → Выбрать <strong>«Высокая производительность (NVIDIA GeForce RTX)»</strong>.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1.5">
                  <span className="font-bold text-slate-200">3. Аппаратное ускорение браузера:</span>
                  <p className="text-slate-400">
                    Убедитесь, что в настройках браузера включен флаг: <code>chrome://settings/system</code> → <em>«Использовать аппаратное ускорение (при наличии)»</em>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span>Текущий выбор:</span>
            <strong className="text-emerald-400">{spec.name}</strong>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            Применить и закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
