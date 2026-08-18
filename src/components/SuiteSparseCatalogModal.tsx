import React, { useState, useMemo } from 'react';
import {
  Sliders,
  Database,
  Download,
  Upload,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Sparkles,
  Zap,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ArrowUpDown,
  Loader2,
  Boxes,
} from 'lucide-react';
import { SUITE_SPARSE_CATALOG } from '../data/suiteSparseData';
import { SuiteSparseMeta, SparseMatrixCSR } from '../types/sparse';
import {
  parseMatrixMarket,
  cooToCSR,
  generateSyntheticSuiteSparseMatrix,
  loadSuiteSparseMatrixOnDemand,
} from '../utils/matrixMarket';
import { MathText } from './MathView';

interface SuiteSparseCatalogModalProps {
  onLoadMatrix: (matrix: SparseMatrixCSR) => void;
  onClose: () => void;
}

type SortKey = 'size' | 'nnz' | 'density' | 'name';
type SortOrder = 'desc' | 'asc';

export const SuiteSparseCatalogModal: React.FC<SuiteSparseCatalogModalProps> = ({
  onLoadMatrix,
  onClose,
}) => {
  // Loaded/cached matrices tracking state
  const [loadedMatrixIds, setLoadedMatrixIds] = useState<Set<string>>(
    () => new Set(['hb_can_24'])
  );

  // Sorting State
  const [sortKey, setSortKey] = useState<SortKey>('size');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc'); // Default: от большей к меньшей (Size Desc)

  // Matrix Size Range filter (full spectrum without 70,000 limitation)
  const [maxSizeLimit, setMaxSizeLimit] = useState<number>(Infinity);
  const [minSizeLimit, setMinSizeLimit] = useState<number>(1);
  const [sizePreset, setSizePreset] = useState<
    'all' | 'small' | 'medium' | 'large' | 'huge' | 'extreme'
  >('all');

  // Group / Kind filter
  const [selectedKind, setSelectedKind] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  // Symmetry filter
  const [symmetryFilter, setSymmetryFilter] = useState<'all' | 'symmetric' | 'nonsymmetric'>('all');

  // On-demand loading state
  const [loadingMatrixId, setLoadingMatrixId] = useState<string | null>(null);

  // Synthetic Matrix Generator state
  const [customGenFamily, setCustomGenFamily] = useState<
    | 'poisson2d'
    | 'poisson3d'
    | 'structural_beam'
    | 'circuit_transistor'
    | 'power_grid'
    | 'convection_diffusion'
    | 'graph_laplacian'
    | 'wathen_fem'
    | 'banded_toeplitz'
    | 'acoustic_helmholtz'
    | 'quantum_hamiltonian'
    | 'optimization_kkt'
    | 'geomechanics_3d'
  >('poisson2d');
  const [customGenSize, setCustomGenSize] = useState<number>(1000);

  // Custom File Upload state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Extract unique kinds & groups for filters
  const availableKinds = useMemo(() => {
    const set = new Set<string>();
    SUITE_SPARSE_CATALOG.forEach((m) => set.add(m.kind));
    return Array.from(set).sort();
  }, []);

  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    SUITE_SPARSE_CATALOG.forEach((m) => set.add(m.group));
    return Array.from(set).sort();
  }, []);

  // Handle Preset Size Switching
  const handleSizePreset = (
    preset: 'all' | 'small' | 'medium' | 'large' | 'huge' | 'extreme'
  ) => {
    setSizePreset(preset);
    if (preset === 'all') {
      setMinSizeLimit(1);
      setMaxSizeLimit(Infinity);
    } else if (preset === 'small') {
      setMinSizeLimit(1);
      setMaxSizeLimit(1000);
    } else if (preset === 'medium') {
      setMinSizeLimit(1000);
      setMaxSizeLimit(10000);
    } else if (preset === 'large') {
      setMinSizeLimit(10000);
      setMaxSizeLimit(100000);
    } else if (preset === 'huge') {
      setMinSizeLimit(100000);
      setMaxSizeLimit(1000000);
    } else if (preset === 'extreme') {
      setMinSizeLimit(1000000);
      setMaxSizeLimit(Infinity);
    }
  };

  // Toggle or switch sorting
  const handleSortToggle = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortOrder('desc'); // Default new sort key to desc
    }
  };

  // Filtered & Sorted Matrices
  const processedMatrices = useMemo(() => {
    const filtered = SUITE_SPARSE_CATALOG.filter((m) => {
      // Size filter
      if (m.rows > maxSizeLimit || m.rows < minSizeLimit) return false;

      // Symmetry filter
      if (symmetryFilter === 'symmetric' && !m.isSymmetric) return false;
      if (symmetryFilter === 'nonsymmetric' && m.isSymmetric) return false;

      // Kind filter
      if (selectedKind !== 'all' && m.kind !== selectedKind) return false;

      // Group filter
      if (selectedGroup !== 'all' && m.group !== selectedGroup) return false;

      return true;
    });

    // Sorting
    return filtered.sort((a, b) => {
      let comp = 0;
      if (sortKey === 'size') {
        comp = a.rows - b.rows;
      } else if (sortKey === 'nnz') {
        comp = a.nnz - b.nnz;
      } else if (sortKey === 'density') {
        comp = a.density - b.density;
      } else if (sortKey === 'name') {
        comp = `${a.group}/${a.name}`.localeCompare(`${b.group}/${b.name}`);
      }

      return sortOrder === 'desc' ? -comp : comp;
    });
  }, [
    maxSizeLimit,
    minSizeLimit,
    selectedKind,
    selectedGroup,
    symmetryFilter,
    sortKey,
    sortOrder,
  ]);

  // Load a chosen matrix from catalog on demand
  const handleLoadMatrix = async (meta: SuiteSparseMeta) => {
    try {
      setLoadingMatrixId(meta.id);
      const csr = await loadSuiteSparseMatrixOnDemand(meta);
      setLoadedMatrixIds((prev) => new Set(prev).add(meta.id));
      onLoadMatrix(csr);
      onClose();
    } catch (err: any) {
      setUploadError(`Ошибка загрузки матрицы: ${err.message}`);
    } finally {
      setLoadingMatrixId(null);
    }
  };

  // Generate and load custom synthetic matrix
  const handleGenerateCustom = () => {
    const csr = generateSyntheticSuiteSparseMatrix(customGenFamily, customGenSize);
    onLoadMatrix(csr);
    onClose();
  };

  // Handle local .mtx file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const coo = parseMatrixMarket(text, file.name.replace(/\.[^/.]+$/, ''));
        const csr = cooToCSR(coo, file.name.replace(/\.[^/.]+$/, ''));
        onLoadMatrix(csr);
        onClose();
      } catch (err: any) {
        setUploadError(`Ошибка парсинга Matrix Market: ${err.message}`);
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setUploadError('Ошибка чтения файла');
      setIsUploading(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-5 text-slate-100">
      {/* Top Banner / Collection Info & Quick Actions */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/70 via-slate-900 to-indigo-950/70 border border-cyan-500/30 flex items-center justify-between gap-4 flex-wrap shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Коллекция Разреженных Матриц Texas A&M (SuiteSparse Collection)</span>
              <a
                href="https://sparse.tamu.edu/"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-200 flex items-center gap-1 font-mono transition-colors"
                title="Открыть официальный сайт sparse.tamu.edu"
              >
                <span>sparse.tamu.edu</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </h3>
            <div className="text-xs text-slate-400">
              <MathText text="Мировой эталонный репозиторий матриц полного спектра (от $N = 24$ до $N = 41\,291\,594$ и $\text{NNZ} \ge 1.15\times 10^9$). Без ограничений по размерности." />
            </div>
          </div>
        </div>

        {/* Action Buttons: Direct File Upload */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-cyan-300 cursor-pointer transition-all shadow-md">
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Загрузить свой .mtx файл</span>
            <input
              type="file"
              accept=".mtx,.txt,.tar.gz"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 rounded-xl bg-rose-950 border border-rose-500 text-rose-200 text-xs">
          {uploadError}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DEDICATED SORTING & FILTER TOOLBAR                                     */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col gap-4 shadow-lg">
        {/* Row 1: Kind filter, Group filter, Symmetry filter */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Group Filter */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
            <span className="text-xs text-slate-400 whitespace-nowrap">Группа TAMU:</span>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">Все группы SuiteSparse (HB, Sandia, Boeing, Janna, SNAP, Oberwolfach...)</option>
              {availableGroups.map((g) => (
                <option key={g} value={g}>
                  {g} ({SUITE_SPARSE_CATALOG.filter((m) => m.group === g).length} матриц)
                </option>
              ))}
            </select>
          </div>

          {/* Kind Filter */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
            <span className="text-xs text-slate-400 whitespace-nowrap">Физическая область:</span>
            <select
              value={selectedKind}
              onChange={(e) => setSelectedKind(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">Все прикладные области</option>
              {availableKinds.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          {/* Symmetry Filter */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setSymmetryFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                symmetryFilter === 'all'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Все матрицы
            </button>
            <button
              onClick={() => setSymmetryFilter('symmetric')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                symmetryFilter === 'symmetric'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Симметричные (SPD)
            </button>
            <button
              onClick={() => setSymmetryFilter('nonsymmetric')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                symmetryFilter === 'nonsymmetric'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Несимметричные
            </button>
          </div>
        </div>

        {/* Row 2: Prominent Sorting Buttons */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
              <span>Сортировка каталога:</span>
            </span>

            {/* Sort by Size (N x M) */}
            <div className="inline-flex rounded-xl bg-slate-900 p-0.5 border border-slate-800 text-xs">
              <button
                onClick={() => {
                  setSortKey('size');
                  setSortOrder('desc');
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  sortKey === 'size' && sortOrder === 'desc'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Сортировать от наибольшего размера матрицы к наименьшему (N убыв.)"
              >
                <ArrowDownWideNarrow className="w-3.5 h-3.5" />
                <span>Размер N (убыв. ↓)</span>
              </button>

              <button
                onClick={() => {
                  setSortKey('size');
                  setSortOrder('asc');
                }}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  sortKey === 'size' && sortOrder === 'asc'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Сортировать от наименьшего размера матрицы к наибольшему (N возр.)"
              >
                <ArrowUpNarrowWide className="w-3.5 h-3.5" />
                <span>N (возр. ↑)</span>
              </button>
            </div>

            {/* Sort by Non-Zero Elements (NNZ) */}
            <div className="inline-flex rounded-xl bg-slate-900 p-0.5 border border-slate-800 text-xs">
              <button
                onClick={() => {
                  setSortKey('nnz');
                  setSortOrder('desc');
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  sortKey === 'nnz' && sortOrder === 'desc'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Сортировать по количеству ненулевых элементов (NNZ от максимума к минимуму)"
              >
                <Boxes className="w-3.5 h-3.5 text-purple-300" />
                <span>Кол-во NNZ (↓)</span>
              </button>

              <button
                onClick={() => {
                  setSortKey('nnz');
                  setSortOrder('asc');
                }}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  sortKey === 'nnz' && sortOrder === 'asc'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Сортировать по возрастанию количества ненулевых элементов (NNZ)"
              >
                <span>NNZ (↑)</span>
              </button>
            </div>

            {/* Sort by Density % */}
            <button
              onClick={() => handleSortToggle('density')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                sortKey === 'density'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              <span>Плотность % {sortKey === 'density' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}</span>
            </button>

            {/* Sort by Name */}
            <button
              onClick={() => handleSortToggle('name')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                sortKey === 'name'
                  ? 'bg-slate-200 text-slate-950 border-white font-bold shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              <span>Имя (A-Z) {sortKey === 'name' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}</span>
            </button>
          </div>

          <div className="text-slate-400 font-mono text-xs">
            Матриц в каталоге: <strong className="text-cyan-300">{processedMatrices.length}</strong>
          </div>
        </div>

        {/* Row 3: Matrix Size Range presets & Slider */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-medium">Диапазон размера N:</span>
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[11px] flex-wrap">
              <button
                onClick={() => handleSizePreset('all')}
                className={`px-2 py-1 rounded-lg cursor-pointer transition-colors ${sizePreset === 'all' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Все (до 41M+)
              </button>
              <button
                onClick={() => handleSizePreset('small')}
                className={`px-2 py-1 rounded-lg cursor-pointer transition-colors ${sizePreset === 'small' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                &lt; 1K
              </button>
              <button
                onClick={() => handleSizePreset('medium')}
                className={`px-2 py-1 rounded-lg cursor-pointer transition-colors ${sizePreset === 'medium' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                1K–10K
              </button>
              <button
                onClick={() => handleSizePreset('large')}
                className={`px-2 py-1 rounded-lg cursor-pointer transition-colors ${sizePreset === 'large' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                10K–100K
              </button>
              <button
                onClick={() => handleSizePreset('huge')}
                className={`px-2 py-1 rounded-lg cursor-pointer transition-colors ${sizePreset === 'huge' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                100K–1M
              </button>
              <button
                onClick={() => handleSizePreset('extreme')}
                className={`px-2 py-1 rounded-lg cursor-pointer transition-colors ${sizePreset === 'extreme' ? 'bg-purple-500 text-slate-950 font-bold' : 'text-purple-300 hover:text-white'}`}
              >
                &gt; 1M (Экстремальные)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <Sliders className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <input
              type="range"
              min="24"
              max="42000000"
              step="5000"
              value={maxSizeLimit === Infinity ? 42000000 : maxSizeLimit}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMinSizeLimit(1);
                if (val >= 42000000) {
                  setMaxSizeLimit(Infinity);
                  setSizePreset('all');
                } else {
                  setMaxSizeLimit(val);
                  setSizePreset('all');
                }
              }}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <span className="font-mono text-cyan-300 font-bold whitespace-nowrap text-[11px] min-w-[95px]">
              {maxSizeLimit === Infinity || maxSizeLimit >= 42000000
                ? '≤ ∞ (Все)'
                : `≤ ${maxSizeLimit.toLocaleString()}`}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. GRID OF MATRICES (STATUS & LOAD BUTTONS)                               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[480px] overflow-y-auto pr-1">
        {processedMatrices.length === 0 ? (
          <div className="col-span-full py-12 px-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center gap-3 text-center">
            <Database className="w-8 h-8 text-slate-500" />
            <div className="text-sm font-semibold text-slate-300">
              Нет матриц в выбранном диапазоне размера N
            </div>
            <p className="text-xs text-slate-500 max-w-sm">
              Попробуйте выбрать другой диапазон размера (например, «Все») или сбросить фильтры
            </p>
            <button
              onClick={() => {
                handleSizePreset('all');
                setSelectedKind('all');
                setSelectedGroup('all');
                setSymmetryFilter('all');
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <span>Показать все матрицы (до 41M+)</span>
            </button>
          </div>
        ) : (
          processedMatrices.map((meta) => {
            const isLoading = loadingMatrixId === meta.id;
            const isLoaded = loadedMatrixIds.has(meta.id);

            return (
              <div
                key={meta.id}
                className={`p-4 rounded-xl bg-slate-900/90 border transition-all flex flex-col justify-between gap-3 group relative overflow-hidden shadow-md ${
                  isLoaded
                    ? 'border-emerald-500/50 bg-slate-900/95 shadow-emerald-500/5'
                    : 'border-slate-800 hover:border-cyan-500/40'
                }`}
              >
                {isLoading && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center z-10 gap-2 text-cyan-300 text-xs font-semibold">
                    <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                    <span>Построение CSR структуры...</span>
                  </div>
                )}

                <div>
                  {/* Header: Name, TAMU link, status tag, dimensions */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors font-mono truncate">
                          {meta.group}/{meta.name}
                        </span>
                        <a
                          href={`https://sparse.tamu.edu/${meta.group}/${meta.name}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-500 hover:text-cyan-400 p-0.5 rounded transition-colors shrink-0"
                          title="Открыть страницу матрицы на sparse.tamu.edu"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Loaded or Not loaded status badge */}
                      <div>
                        {isLoaded ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Загружено в кэш</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 border border-slate-700/80 text-[10px] font-medium">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>Не загружено</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold shrink-0 ${
                        meta.rows > 10000
                          ? 'bg-purple-950/80 text-purple-300 border border-purple-800/80'
                          : meta.rows > 2000
                          ? 'bg-blue-950/80 text-blue-300 border border-blue-800/80'
                          : 'bg-slate-950 text-cyan-400 border border-slate-800'
                      }`}
                    >
                      {meta.rows.toLocaleString()} × {meta.cols.toLocaleString()}
                    </span>
                  </div>

                  {/* Description with proper LaTeX / math formatting */}
                  <div className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    <MathText text={meta.description} />
                  </div>
                </div>

                <div className="mt-auto flex flex-col gap-2">
                  {/* Meta details: NNZ, Density, Symmetry, Solver recommendation */}
                  <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono flex-wrap gap-1">
                    <span className="flex items-center gap-1">
                      <span className="text-slate-500">NNZ:</span>
                      <strong className="text-slate-200">{meta.nnz.toLocaleString()}</strong>
                      <span className="text-[10px] text-slate-500">({meta.density.toFixed(2)}%)</span>
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          meta.isSymmetric
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-800/50'
                        }`}
                      >
                        {meta.isSymmetric ? 'SPD' : 'Non-Sym'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 text-[10px] font-semibold" title="Рекомендуемый оптимальный решатель">
                        🎯 {meta.isSymmetric ? (meta.rows > 1000 ? 'PCG-SSOR' : 'PCG-Jacobi') : (meta.kind.toLowerCase().includes('circuit') || meta.kind.toLowerCase().includes('cfd') ? 'GMRES(30)' : 'BiCGSTAB')}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] text-slate-300 truncate max-w-[100px]">
                        {meta.kind}
                      </span>
                    </div>
                  </div>

                  {/* Explicit Load / Select Button - always prominent and clearly stating "Загрузить" */}
                  <button
                    onClick={() => handleLoadMatrix(meta)}
                    disabled={isLoading}
                    className={`w-full py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50 ${
                      isLoaded
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/20'
                    }`}
                  >
                    {isLoaded ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                        <span>Загрузить в СЛАУ</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 text-slate-950" />
                        <span>Загрузить</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. CUSTOM PARAMETRIC MATRIX GENERATOR (ANY SCALE)                         */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col gap-3 shadow-md">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Генератор кастомных физических матриц любого размера
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">
            Синтез СЛАУ <MathText text="$Ax = b$" /> любой размерности (<MathText text="$N \le 50\,000$" />)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          {/* Family Selection */}
          <select
            value={customGenFamily}
            onChange={(e) => setCustomGenFamily(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="poisson2d">2D Сетка Пуассона (5-точечный шаблон)</option>
            <option value="poisson3d">3D Куб Пуассона (7-точечный шаблон)</option>
            <option value="structural_beam">Балка упругости 4-го порядка</option>
            <option value="circuit_transistor">SPICE Схема (Несимметричная)</option>
            <option value="power_grid">IEEE Энергосеть (Power Flow)</option>
            <option value="convection_diffusion">Конвекция-Диффузия (CFD)</option>
            <option value="wathen_fem">Wathen Матрица МКЭ</option>
            <option value="graph_laplacian">Лапласиан Сложной Сети (SNAP)</option>
            <option value="acoustic_helmholtz">Волновое Уравнение Гельмгольца</option>
            <option value="quantum_hamiltonian">Квантовая Решетка (Гамильтониан)</option>
            <option value="optimization_kkt">KKT Седловая Система (Оптимизация)</option>
            <option value="geomechanics_3d">3D Пороупругость (Геомеханика)</option>
            <option value="banded_toeplitz">Ленточная Теплицева матрица</option>
          </select>

          {/* Size Input */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 whitespace-nowrap">
              Размер <MathText text="$N$" />:
            </span>
            <input
              type="number"
              min="10"
              max="50000"
              step="100"
              value={customGenSize}
              onChange={(e) => setCustomGenSize(Math.max(10, Number(e.target.value)))}
              className="w-28 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
            />
            <span className="text-[11px] text-slate-500 font-mono">строк</span>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateCustom}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Zap className="w-4 h-4" />
            <span>Сгенерировать и загрузить в СЛАУ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
