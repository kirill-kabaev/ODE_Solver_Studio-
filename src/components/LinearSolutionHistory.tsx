import React, { useState, useMemo } from 'react';
import {
  History,
  Trash2,
  Download,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Cpu,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Info,
  BookOpen,
  ArrowRight,
  TrendingDown,
  Scale,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sliders,
  Database,
  BarChart3,
} from 'lucide-react';
import {
  LinearSolverHistoryRecord,
  SparseMatrixCSR,
  LinearSolverResult,
  PhysicalDomainInfo,
  MatrixComplexityMetrics,
} from '../types/sparse';
import { getMatrixPhysicalDomain, computeMatrixComplexity, formatSolverTime } from '../utils/matrixPhysics';
import { MathView, MathText } from './MathView';

interface LinearSolutionHistoryProps {
  history: LinearSolverHistoryRecord[];
  activeMatrix: SparseMatrixCSR;
  currentResult: LinearSolverResult | null;
  onClearHistory: () => void;
  onDeleteRecord: (id: string) => void;
  onRerunRecord?: (record: LinearSolverHistoryRecord) => void;
}

export const LinearSolutionHistory: React.FC<LinearSolutionHistoryProps> = ({
  history,
  activeMatrix,
  currentResult,
  onClearHistory,
  onDeleteRecord,
  onRerunRecord,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterDevice, setFilterDevice] = useState<'all' | 'cuda_gpu' | 'cpu'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'converged' | 'cancelled'>('all');
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<LinearSolverHistoryRecord | null>(null);
  const [compareRecordA, setCompareRecordA] = useState<LinearSolverHistoryRecord | null>(null);
  const [compareRecordB, setCompareRecordB] = useState<LinearSolverHistoryRecord | null>(null);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [isPhysicsCardExpanded, setIsPhysicsCardExpanded] = useState<boolean>(true);

  // Active matrix physics and complexity info
  const activePhysics = useMemo<PhysicalDomainInfo>(() => {
    return getMatrixPhysicalDomain(activeMatrix);
  }, [activeMatrix]);

  const activeComplexity = useMemo<MatrixComplexityMetrics>(() => {
    return computeMatrixComplexity(activeMatrix, currentResult?.conditionNumberEstimate);
  }, [activeMatrix, currentResult]);

  // Filtered history records
  const filteredHistory = useMemo(() => {
    return history.filter((rec) => {
      if (filterDevice !== 'all' && rec.computeDevice !== filterDevice) return false;
      if (filterStatus === 'converged' && !rec.converged) return false;
      if (filterStatus === 'cancelled' && !rec.wasCancelled) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = rec.matrixName.toLowerCase().includes(q);
        const matchesDomain = rec.physicalDomain.title.toLowerCase().includes(q);
        const matchesSolver = rec.solverType.toLowerCase().includes(q);
        const matchesDevice = rec.hardwareLabel.toLowerCase().includes(q);
        if (!matchesName && !matchesDomain && !matchesSolver && !matchesDevice) return false;
      }
      return true;
    });
  }, [history, filterDevice, filterStatus, searchQuery]);

  // Aggregate statistics
  const stats = useMemo(() => {
    if (history.length === 0) {
      return { total: 0, convergedCount: 0, avgTimeMs: 0, fastestTimeMs: 0, maxSpeedup: 1 };
    }
    const total = history.length;
    const convergedCount = history.filter((h) => h.converged).length;
    const avgTimeMs = history.reduce((acc, h) => acc + h.elapsedTimeMs, 0) / total;
    const fastestTimeMs = Math.min(...history.map((h) => h.elapsedTimeMs));
    const maxSpeedup = Math.max(...history.map((h) => h.speedup || 1));
    return { total, convergedCount, avgTimeMs, fastestTimeMs, maxSpeedup };
  }, [history]);

  // Export history to JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `linear_solver_history_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export history to CSV
  const handleExportCSV = () => {
    if (history.length === 0) return;
    const headers = [
      'Дата',
      'Матрица',
      'Размерность_N',
      'Ненулевых_NNZ',
      'Физическая_Проблематика',
      'Решатель',
      'Устройство',
      'Потоки_или_Ядра',
      'Итерации',
      'Время_мс',
      'Финальная_Невязка',
      'Сходимость',
      'GFLOPS',
      'Ускорение',
    ];

    const rows = history.map((r) => [
      `"${r.formattedDate}"`,
      `"${r.matrixName.replace(/"/g, '""')}"`,
      r.matrixSize,
      r.nnz,
      `"${r.physicalDomain.title.replace(/"/g, '""')}"`,
      r.solverType.toUpperCase(),
      r.computeDevice === 'cuda_gpu' ? 'GPU_CUDA' : 'CPU',
      `"${r.hardwareLabel.replace(/"/g, '""')}"`,
      r.iterations,
      r.elapsedTimeMs.toFixed(2),
      r.finalRelativeResidual.toExponential(4),
      r.converged ? 'Да' : r.wasCancelled ? 'Прервано' : 'Нет',
      r.gflops.toFixed(2),
      r.speedup.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `linear_solver_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ========================================================================= */}
      {/* 1. PHYSICAL PROBLEM CONTEXT & MATRIX COMPLEXITY CARD                       */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden backdrop-blur-md">
        <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  ФИЗИЧЕСКАЯ ПРОБЛЕМАТИКА И СВОЙСТВА СИСТЕМЫ ({activeMatrix.name})
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {activePhysics.field}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Физико-математический смысл системы Ax = b, дифференциальный оператор и оценка вычислительной сложности
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsPhysicsCardExpanded(!isPhysicsCardExpanded)}
            className="p-1.5 rounded-lg bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer"
            title={isPhysicsCardExpanded ? 'Свернуть физическое описание' : 'Развернуть физическое описание'}
          >
            {isPhysicsCardExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {isPhysicsCardExpanded && (
          <div className="p-4 sm:p-6 flex flex-col gap-5">
            {/* Governing PDE Formula & Physical Meaning */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left 2 Cols: Physical Problem Description */}
              <div className="lg:col-span-2 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    {activePhysics.title}
                  </span>
                </div>

                {/* Mathematical Equation Box */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col gap-1.5 font-mono text-xs">
                  <span className="text-[11px] text-slate-400">Определяющее уравнение / Закон сохранения:</span>
                  <div className="text-sm font-semibold text-emerald-300 overflow-x-auto py-1">
                    <MathView math={activePhysics.governingEquation} block className="text-sm text-emerald-300" />
                  </div>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-slate-200">Физическая суть:</strong> <MathText text={activePhysics.description} />
                </div>

                <div className="text-xs text-slate-400 leading-relaxed">
                  <strong className="text-slate-300">Структурная интерпретация:</strong> <MathText text={activePhysics.physicalSignificance} />
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-300 flex items-start gap-2">
                  <span className="font-semibold text-indigo-300 shrink-0">Применение в инженерии:</span>
                  <span><MathText text={activePhysics.practicalApplication} /></span>
                </div>
              </div>

              {/* Right Col: Complexity & Difficulty Indicator */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col gap-3 justify-between">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-indigo-400" />
                    Оценка сложности СЛАУ
                  </span>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                        activeComplexity.difficultyRating === 'easy'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : activeComplexity.difficultyRating === 'medium'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : activeComplexity.difficultyRating === 'hard'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      {activeComplexity.difficultyLabel}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 leading-relaxed pt-1">
                    <MathText text={activeComplexity.difficultyExplanation} />
                  </div>
                </div>

                {/* Quick metrics */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800/60 flex flex-col">
                    <span className="text-[10px] text-slate-500">Память CSR (RAM):</span>
                    <span className="text-cyan-300 font-bold">{activeComplexity.formattedMemory}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800/60 flex flex-col">
                    <span className="text-[10px] text-slate-500">Ширина ленты:</span>
                    <span className="text-indigo-300 font-bold">{activeComplexity.bandwidth}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Compact Size & Complexity Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Card 1: Matrix Dimension */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Размерность ($N \times N$)
                </span>
                <span className="text-lg font-bold text-white font-mono">
                  {activeMatrix.rows.toLocaleString()} × {activeMatrix.cols.toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {activeMatrix.rows.toLocaleString()} неизвестных
                </span>
              </div>

              {/* Card 2: NNZ & Density */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  Ненулевые (NNZ)
                </span>
                <span className="text-lg font-bold text-emerald-300 font-mono">
                  {activeMatrix.nnz.toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Плотность: <strong className="text-emerald-400">{activeComplexity.densityPercent.toFixed(3)}%</strong>
                </span>
              </div>

              {/* Card 3: Row Connectivity */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-indigo-400" />
                  Связей на узел
                </span>
                <span className="text-lg font-bold text-indigo-300 font-mono">
                  ~{activeComplexity.avgNnzPerRow.toFixed(1)} связей
                </span>
                <span className="text-[11px] text-slate-400">
                  {activeMatrix.isSymmetric ? 'Симметричные ребра' : 'Направленные потоки'}
                </span>
              </div>

              {/* Card 4: Symmetry & Diag Dominance */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  Симметрия и диагональ
                </span>
                <span className="text-xs font-bold text-white pt-1">
                  {activeMatrix.isSymmetric ? 'Симметричная SPD (A = Aᵀ)' : 'Несимметричная (A ≠ Aᵀ)'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {activeMatrix.isDiagonallyDominant ? 'Строго диагонально доминирует' : 'Без диагонального доминирования'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. SOLUTION HISTORY & BENCHMARK LOG                                        */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden backdrop-blur-md">
        <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  3. ИСТОРИЯ РЕШЕНИЙ И БЕНЧМАРК СЛАУ
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {history.length} {history.length === 1 ? 'запись' : history.length < 5 ? 'записи' : 'записей'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Сохранение всех вычислений со статистикой итераций, временем выполнения, свойствами матрицы и физикой задачи
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            {history.length >= 2 && (
              <button
                onClick={() => {
                  setCompareRecordA(history[0]);
                  setCompareRecordB(history[1]);
                  setShowCompareModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Scale className="w-3.5 h-3.5 text-indigo-400" />
                <span>Сравнить 2 запуска</span>
              </button>
            )}

            {history.length > 0 && (
              <>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Экспортировать историю в CSV таблицу"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={handleExportJSON}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Экспортировать историю в JSON"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>JSON</span>
                </button>
                <button
                  onClick={onClearHistory}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Очистить историю всех запусков"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Очистить</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-5 py-3 bg-slate-950/40 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по матрице, физической задаче, решателю..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Device & Status Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Device selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setFilterDevice('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                  filterDevice === 'all' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Все
              </button>
              <button
                type="button"
                onClick={() => setFilterDevice('cuda_gpu')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                  filterDevice === 'cuda_gpu' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>NVIDIA CUDA</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterDevice('cpu')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                  filterDevice === 'cpu' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Cpu className="w-3 h-3" />
                <span>CPU Threads</span>
              </button>
            </div>

            {/* Status selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                  filterStatus === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Все статусы
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('converged')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold text-emerald-400 cursor-pointer transition-colors ${
                  filterStatus === 'converged' ? 'bg-emerald-500/20 border border-emerald-500/40' : 'hover:text-emerald-300'
                }`}
              >
                Сошлись
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('cancelled')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-400 cursor-pointer transition-colors ${
                  filterStatus === 'cancelled' ? 'bg-rose-500/20 border border-rose-500/40' : 'hover:text-rose-300'
                }`}
              >
                Прерваны
              </button>
            </div>
          </div>
        </div>

        {/* History Records List */}
        <div className="p-4 sm:p-6 flex flex-col gap-3">
          {history.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center flex flex-col items-center justify-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">История решений пуста</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto pt-1">
                  Нажмите кнопку <strong>«Решить»</strong> в панели решателя выше, чтобы запустить вычисление СЛАУ. Каждый запуск (на CPU или NVIDIA GPU) будет автоматически сохранен здесь с полным профилем и физикой задачи.
                </p>
              </div>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
              По вашему фильтру ничего не найдено. Попробуйте сбросить поисковый запрос или фильтр устройств.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filteredHistory.map((rec) => {
                const isSelected = selectedRecordForDetail?.id === rec.id;
                return (
                  <div
                    key={rec.id}
                    className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                      isSelected
                        ? 'bg-slate-950 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                        : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    {/* Main Row Content */}
                    <div className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
                      {/* Matrix & Physical Context */}
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className={`p-2 rounded-xl shrink-0 mt-0.5 border ${
                            rec.computeDevice === 'cuda_gpu'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          }`}
                        >
                          {rec.computeDevice === 'cuda_gpu' ? (
                            <Zap className="w-4 h-4 fill-current" />
                          ) : (
                            <Cpu className="w-4 h-4" />
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm">
                              {rec.matrixName}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-900 text-cyan-300 border border-slate-800">
                              {rec.physicalDomain.field}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {rec.formattedDate}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-slate-400 text-xs flex-wrap font-mono">
                            <span>
                              Размер: <strong className="text-slate-200">{rec.matrixSize}×{rec.matrixSize}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              NNZ: <strong className="text-slate-200">{rec.nnz.toLocaleString()}</strong> ({rec.density.toFixed(2)}%)
                            </span>
                            <span>•</span>
                            <span>
                              {rec.isSymmetric ? 'SPD' : 'Несимм.'}
                            </span>
                            <span>•</span>
                            <span className="text-indigo-300 font-sans">
                              {rec.physicalDomain.title}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Solver Specs & Speed */}
                      <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-between lg:justify-end">
                        {/* Device Badge */}
                        <div className="flex flex-col items-start lg:items-end">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                            Устройство и алгоритм
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-white">
                              {rec.solverType.toUpperCase()}
                            </span>
                            <span className="text-slate-500">на</span>
                            <span
                              className={`font-semibold text-xs ${
                                rec.computeDevice === 'cuda_gpu' ? 'text-emerald-400' : 'text-cyan-400'
                              }`}
                            >
                              {rec.computeDevice === 'cuda_gpu' ? 'NVIDIA RTX (CUDA)' : `${rec.threadsOrCoresCount} потоков CPU`}
                            </span>
                          </div>
                        </div>

                        {/* Iterations & Residual */}
                        <div className="flex flex-col items-start lg:items-end font-mono">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                            Итерации / Невязка
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">
                              {rec.iterations} итер.
                            </span>
                            <span className="text-slate-500 text-[10px]">
                              (||r|| = {rec.finalRelativeResidual.toExponential(2)})
                            </span>
                          </div>
                        </div>

                        {/* Timing & Speedup */}
                        <div className="flex flex-col items-start lg:items-end font-mono">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                            Время решения
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-emerald-300 text-sm">
                              {rec.formattedTime}
                            </span>
                            {rec.speedup > 1.2 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                {rec.speedup.toFixed(1)}x
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status pill */}
                        <div>
                          {rec.converged ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-semibold text-[11px] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Сошлось</span>
                            </span>
                          ) : rec.wasCancelled ? (
                            <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 font-semibold text-[11px] flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              <span>Прервано</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold text-[11px] flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              <span>Лимит итер.</span>
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 ml-1">
                          <button
                            onClick={() => setSelectedRecordForDetail(isSelected ? null : rec)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
                            title={isSelected ? 'Скрыть детали' : 'Просмотреть невязку и физику'}
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteRecord(rec.id)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer"
                            title="Удалить эту запись"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Expand Box if Selected */}
                    {isSelected && (
                      <div className="p-4 bg-slate-950 border-t border-slate-800/80 flex flex-col gap-4 text-xs animate-fadeIn">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Physical context details */}
                          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 flex flex-col gap-2">
                            <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5" />
                              Физическое моделирование: {rec.physicalDomain.title}
                            </span>
                            <div className="p-2 rounded bg-slate-950 border border-slate-800 overflow-x-auto">
                              <MathView math={rec.physicalDomain.governingEquation} block className="text-xs text-emerald-300" />
                            </div>
                            <div className="text-slate-300 text-[11px] leading-relaxed">
                              <MathText text={rec.physicalDomain.description} />
                            </div>
                            <div className="text-[11px] text-slate-400">
                              <strong className="text-slate-300">Применение:</strong> <MathText text={rec.physicalDomain.practicalApplication} />
                            </div>
                          </div>

                          {/* Computational telemetry */}
                          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 flex flex-col gap-2 font-mono">
                            <span className="font-bold text-indigo-300 font-sans flex items-center gap-1.5">
                              <Activity className="w-3.5 h-3.5" />
                              Телеметрия вычислений и параллелизма
                            </span>
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                                <span className="text-slate-500">Устройство:</span>
                                <div className="text-white font-bold">{rec.hardwareLabel}</div>
                              </div>
                              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                                <span className="text-slate-500">Производительность:</span>
                                <div className="text-cyan-300 font-bold">{rec.gflops.toFixed(2)} GFLOPS</div>
                              </div>
                              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                                <span className="text-slate-500">Финальная невязка:</span>
                                <div className="text-emerald-300 font-bold">{rec.finalRelativeResidual.toExponential(4)}</div>
                              </div>
                              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                                <span className="text-slate-500">Ускорение (Speedup):</span>
                                <div className="text-indigo-300 font-bold">{rec.speedup.toFixed(2)}x</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Residual Convergence Sparkline */}
                        {rec.historySample && rec.historySample.length > 0 && (
                          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 flex flex-col gap-2">
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span className="font-semibold text-slate-200">
                                <MathText text="График сходимости относительной невязки $\|r_k\|_2 / \|b\|_2$" /> (Шагов: {rec.historySample.length})
                              </span>
                              <span className="font-mono text-emerald-400">
                                Старт: {rec.historySample[0].relativeResidual.toExponential(2)} → Финиш: {rec.finalRelativeResidual.toExponential(2)}
                              </span>
                            </div>

                            {/* Mini convergence bar graph */}
                            <div className="h-16 flex items-end gap-1 border-b border-slate-800 pb-1">
                              {(() => {
                                const sample = rec.historySample;
                                const firstLog = Math.log10(Math.max(1e-16, sample[0].relativeResidual));
                                const lastLog = Math.log10(Math.max(1e-16, rec.finalRelativeResidual));
                                const range = Math.max(1, firstLog - lastLog);

                                return sample.map((step, idx) => {
                                  const curLog = Math.log10(Math.max(1e-16, step.relativeResidual));
                                  // higher height = smaller residual / better convergence
                                  const fraction = Math.min(1, Math.max(0.05, (firstLog - curLog) / range));
                                  const h = fraction * 100;
                                  return (
                                    <div
                                      key={idx}
                                      className="flex-1 bg-gradient-to-t from-cyan-600 to-emerald-400 rounded-t-xs hover:opacity-80 transition-all"
                                      style={{ height: `${Math.max(6, h)}%` }}
                                      title={`Итерация ${step.iteration}: невязка = ${step.relativeResidual.toExponential(4)}`}
                                    />
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SIDE-BY-SIDE COMPARATOR MODAL                                           */}
      {/* ========================================================================= */}
      {showCompareModal && compareRecordA && compareRecordB && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Сравнение двух запусков решения СЛАУ
                </h3>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-6 text-xs">
              {/* Selectors for Run A and Run B */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-cyan-400">Запуск A (Базовый):</label>
                  <select
                    value={compareRecordA.id}
                    onChange={(e) => {
                      const found = history.find((h) => h.id === e.target.value);
                      if (found) setCompareRecordA(found);
                    }}
                    className="bg-slate-950 border border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {history.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.matrixName} | {h.solverType.toUpperCase()} ({h.hardwareLabel}) — {h.formattedTime}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-emerald-400">Запуск B (Для сравнения):</label>
                  <select
                    value={compareRecordB.id}
                    onChange={(e) => {
                      const found = history.find((h) => h.id === e.target.value);
                      if (found) setCompareRecordB(found);
                    }}
                    className="bg-slate-950 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {history.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.matrixName} | {h.solverType.toUpperCase()} ({h.hardwareLabel}) — {h.formattedTime}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Comparison Summary Banner */}
              {(() => {
                const ratio = compareRecordA.elapsedTimeMs / Math.max(0.001, compareRecordB.elapsedTimeMs);
                const isBFaster = ratio > 1;
                return (
                  <div
                    className={`p-4 rounded-xl border flex items-center justify-between gap-4 flex-wrap ${
                      isBFaster
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                        : 'bg-cyan-950/30 border-cyan-500/40 text-cyan-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Flame className="w-5 h-5" />
                      <div>
                        <div className="font-bold text-sm">
                          {isBFaster
                            ? `Запуск B быстрее в ${ratio.toFixed(2)}x раз!`
                            : `Запуск A быстрее в ${(1 / ratio).toFixed(2)}x раз!`}
                        </div>
                        <div className="text-xs opacity-80">
                          {compareRecordA.hardwareLabel} ({compareRecordA.formattedTime}) vs {compareRecordB.hardwareLabel} ({compareRecordB.formattedTime})
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Comparison Metrics Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400">
                      <th className="p-3">Параметр сравнения</th>
                      <th className="p-3 text-cyan-300">Запуск A</th>
                      <th className="p-3 text-emerald-300">Запуск B</th>
                      <th className="p-3 text-white">Разница</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono">
                    <tr className="bg-slate-900/60">
                      <td className="p-3 text-slate-400 font-sans">Матрица и задача</td>
                      <td className="p-3 text-white">{compareRecordA.matrixName}</td>
                      <td className="p-3 text-white">{compareRecordB.matrixName}</td>
                      <td className="p-3 text-slate-500 font-sans">—</td>
                    </tr>
                    <tr className="bg-slate-900/30">
                      <td className="p-3 text-slate-400 font-sans">Вычислитель</td>
                      <td className="p-3 text-cyan-300">{compareRecordA.hardwareLabel}</td>
                      <td className="p-3 text-emerald-300">{compareRecordB.hardwareLabel}</td>
                      <td className="p-3 text-slate-400 font-sans">
                        {compareRecordA.computeDevice !== compareRecordB.computeDevice ? 'CPU vs GPU' : 'Одна платформа'}
                      </td>
                    </tr>
                    <tr className="bg-slate-900/60">
                      <td className="p-3 text-slate-400 font-sans">Время решения</td>
                      <td className="p-3 font-bold text-cyan-300">{compareRecordA.formattedTime}</td>
                      <td className="p-3 font-bold text-emerald-300">{compareRecordB.formattedTime}</td>
                      <td className="p-3 font-bold text-indigo-300">
                        {(compareRecordA.elapsedTimeMs / Math.max(0.001, compareRecordB.elapsedTimeMs)).toFixed(2)}x разница
                      </td>
                    </tr>
                    <tr className="bg-slate-900/30">
                      <td className="p-3 text-slate-400 font-sans">Итераций выполнено</td>
                      <td className="p-3 text-white">{compareRecordA.iterations}</td>
                      <td className="p-3 text-white">{compareRecordB.iterations}</td>
                      <td className="p-3 text-slate-300">
                        {compareRecordB.iterations - compareRecordA.iterations > 0 ? `+${compareRecordB.iterations - compareRecordA.iterations}` : compareRecordB.iterations - compareRecordA.iterations}
                      </td>
                    </tr>
                    <tr className="bg-slate-900/60">
                      <td className="p-3 text-slate-400 font-sans">Финальная невязка</td>
                      <td className="p-3 text-slate-300">{compareRecordA.finalRelativeResidual.toExponential(3)}</td>
                      <td className="p-3 text-slate-300">{compareRecordB.finalRelativeResidual.toExponential(3)}</td>
                      <td className="p-3 text-emerald-400 font-sans">
                        {compareRecordA.converged && compareRecordB.converged ? 'Оба сошлись' : 'Разная сходимость'}
                      </td>
                    </tr>
                    <tr className="bg-slate-900/30">
                      <td className="p-3 text-slate-400 font-sans">Производительность (GFLOPS)</td>
                      <td className="p-3 text-cyan-300">{compareRecordA.gflops.toFixed(1)} GFLOPS</td>
                      <td className="p-3 text-emerald-300">{compareRecordB.gflops.toFixed(1)} GFLOPS</td>
                      <td className="p-3 text-indigo-300">
                        {(compareRecordB.gflops - compareRecordA.gflops > 0 ? `+${(compareRecordB.gflops - compareRecordA.gflops).toFixed(1)}` : (compareRecordB.gflops - compareRecordA.gflops).toFixed(1))} GFLOPS
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer transition-all"
                >
                  Закрыть сравнение
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
