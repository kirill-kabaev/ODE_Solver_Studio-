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
  Search,
  RotateCcw,
  FileCode,
  Layers,
  Filter,
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

type MainModalTab = 'catalog' | 'generator' | 'upload';
type SortKey = 'size' | 'nnz' | 'density' | 'name';
type SortOrder = 'desc' | 'asc';
type SizePreset = 'all' | 'small' | 'medium' | 'large' | 'huge' | 'extreme';

export const SuiteSparseCatalogModal: React.FC<SuiteSparseCatalogModalProps> = ({
  onLoadMatrix,
  onClose,
}) => {
  // Main Navigation Tabs inside Modal
  const [activeTab, setActiveTab] = useState<MainModalTab>('catalog');

  // Loaded/cached matrices tracking state
  const [loadedMatrixIds, setLoadedMatrixIds] = useState<Set<string>>(
    () => new Set(['hb_can_24'])
  );

  // Search query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sorting State
  const [sortKey, setSortKey] = useState<SortKey>('size');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc'); // Default: от большей к меньшей

  // Matrix Size Range filter
  const [maxSizeLimit, setMaxSizeLimit] = useState<number>(Infinity);
  const [minSizeLimit, setMinSizeLimit] = useState<number>(1);
  const [sizePreset, setSizePreset] = useState<SizePreset>('all');

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

  // Counts by size category for badge labels
  const sizeCategoryCounts = useMemo(() => {
    return {
      all: SUITE_SPARSE_CATALOG.length,
      small: SUITE_SPARSE_CATALOG.filter((m) => m.rows <= 1000).length,
      medium: SUITE_SPARSE_CATALOG.filter((m) => m.rows > 1000 && m.rows <= 10000).length,
      large: SUITE_SPARSE_CATALOG.filter((m) => m.rows > 10000 && m.rows <= 100000).length,
      huge: SUITE_SPARSE_CATALOG.filter((m) => m.rows > 100000 && m.rows <= 1000000).length,
      extreme: SUITE_SPARSE_CATALOG.filter((m) => m.rows > 1000000).length,
    };
  }, []);

  // Handle Preset Size Switching
  const handleSizePreset = (preset: SizePreset) => {
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
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesGroup = m.group.toLowerCase().includes(q);
        const matchesKind = m.kind.toLowerCase().includes(q);
        const matchesDesc = m.description.toLowerCase().includes(q);
        if (!matchesName && !matchesGroup && !matchesKind && !matchesDesc) {
          return false;
        }
      }

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
    searchQuery,
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
      setUploadError(`Ошибка загрузки матрицы: ${err?.message || err}`);
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
  const handleFileUpload = (file: File) => {
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
        setUploadError(`Ошибка парсинга Matrix Market (.mtx): ${err?.message || err}`);
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setUploadError('Ошибка чтения файла с диска');
      setIsUploading(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-4 text-slate-100">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & MAIN TABS NAVIGATION                                      */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-800 pb-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'catalog'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Каталог SuiteSparse ({SUITE_SPARSE_CATALOG.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('generator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'generator'
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Синтетический Генератор СЛАУ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'upload'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Загрузить .mtx файл</span>
          </button>
        </div>

        {/* External Link info */}
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
      </div>

      {uploadError && (
        <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs flex items-center justify-between gap-2">
          <span>{uploadError}</span>
          <button
            onClick={() => setUploadError(null)}
            className="text-rose-400 hover:text-white font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: SUITESPARSE CATALOG BROWSER                                        */}
      {/* ========================================================================= */}
      {activeTab === 'catalog' && (
        <div className="flex flex-col gap-4">
          {/* Dedicated Toolbar: Size Ranges, Search, Filters, Sorting */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col gap-3.5 shadow-lg">
            {/* Primary Filter Row: "Диапазон размера N:" Tabs */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Диапазон размера N:</span>
                </span>

                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleSizePreset('all')}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer font-medium transition-all ${
                      sizePreset === 'all'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Все ({sizeCategoryCounts.all})
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSizePreset('small')}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer font-medium transition-all ${
                      sizePreset === 'small'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    &lt; 1K ({sizeCategoryCounts.small})
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSizePreset('medium')}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer font-medium transition-all ${
                      sizePreset === 'medium'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    1K–10K ({sizeCategoryCounts.medium})
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSizePreset('large')}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer font-medium transition-all ${
                      sizePreset === 'large'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    10K–100K ({sizeCategoryCounts.large})
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSizePreset('huge')}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer font-medium transition-all ${
                      sizePreset === 'huge'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    100K–1M ({sizeCategoryCounts.huge})
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSizePreset('extreme')}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer font-medium transition-all ${
                      sizePreset === 'extreme'
                        ? 'bg-purple-500 text-slate-950 font-bold shadow'
                        : 'text-purple-300 hover:text-white'
                    }`}
                  >
                    &gt; 1M Экстремальные ({sizeCategoryCounts.extreme})
                  </button>
                </div>
              </div>

              {/* Slider for fine adjustment */}
              <div className="flex items-center gap-2 flex-1 max-w-xs min-w-[180px]">
                <Sliders className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <input
                  type="range"
                  min="24"
                  max="42000000"
                  step="10000"
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
                <span className="font-mono text-cyan-300 font-bold whitespace-nowrap text-[11px] min-w-[85px] text-right">
                  {maxSizeLimit === Infinity || maxSizeLimit >= 42000000
                    ? '≤ 41.2M+'
                    : `≤ ${maxSizeLimit.toLocaleString()}`}
                </span>
              </div>
            </div>

            {/* Second Row: Search + Group + Kind + Symmetry */}
            <div className="pt-2.5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по названию / группе..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 placeholder:text-slate-500"
                />
              </div>

              {/* Group Filter */}
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="all">Все группы TAMU ({availableGroups.length})</option>
                {availableGroups.map((g) => (
                  <option key={g} value={g}>
                    {g} ({SUITE_SPARSE_CATALOG.filter((m) => m.group === g).length})
                  </option>
                ))}
              </select>

              {/* Kind Filter */}
              <select
                value={selectedKind}
                onChange={(e) => setSelectedKind(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="all">Все прикладные области</option>
                {availableKinds.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>

              {/* Symmetry Filter */}
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSymmetryFilter('all')}
                  className={`flex-1 py-1 rounded-lg transition-colors cursor-pointer text-center ${
                    symmetryFilter === 'all'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Все
                </button>
                <button
                  type="button"
                  onClick={() => setSymmetryFilter('symmetric')}
                  className={`flex-1 py-1 rounded-lg transition-colors cursor-pointer text-center ${
                    symmetryFilter === 'symmetric'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  SPD
                </button>
                <button
                  type="button"
                  onClick={() => setSymmetryFilter('nonsymmetric')}
                  className={`flex-1 py-1 rounded-lg transition-colors cursor-pointer text-center ${
                    symmetryFilter === 'nonsymmetric'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Несимм.
                </button>
              </div>
            </div>

            {/* Third Row: Sort Buttons + Found Counter */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3 flex-wrap text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Сортировка:</span>
                </span>

                <div className="inline-flex rounded-xl bg-slate-900 p-0.5 border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSortKey('size');
                      setSortOrder('desc');
                    }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      sortKey === 'size' && sortOrder === 'desc'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <ArrowDownWideNarrow className="w-3 h-3" />
                    <span>Размер N (↓)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSortKey('size');
                      setSortOrder('asc');
                    }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      sortKey === 'size' && sortOrder === 'asc'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ArrowUpNarrowWide className="w-3 h-3" />
                    <span>N (↑)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleSortToggle('nnz')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    sortKey === 'nnz'
                      ? 'bg-indigo-500 text-white font-bold border-indigo-400 shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                  }`}
                >
                  <Boxes className="w-3 h-3" />
                  <span>NNZ {sortKey === 'nnz' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSortToggle('density')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    sortKey === 'density'
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                  }`}
                >
                  <span>Плотность % {sortKey === 'density' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSortToggle('name')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    sortKey === 'name'
                      ? 'bg-slate-200 text-slate-950 font-bold border-white shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                  }`}
                >
                  <span>Имя {sortKey === 'name' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}</span>
                </button>
              </div>

              <div className="text-slate-400 font-mono text-xs flex items-center gap-2">
                <span>
                  Найдено матриц: <strong className="text-cyan-300 font-bold">{processedMatrices.length}</strong> из {SUITE_SPARSE_CATALOG.length}
                </span>

                {(selectedGroup !== 'all' || selectedKind !== 'all' || symmetryFilter !== 'all' || searchQuery.trim() || sizePreset !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      handleSizePreset('all');
                      setSelectedGroup('all');
                      setSelectedKind('all');
                      setSymmetryFilter('all');
                      setSearchQuery('');
                    }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-200 flex items-center gap-1 font-medium bg-slate-900 px-2 py-0.5 rounded-lg border border-cyan-500/30 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Сбросить фильтры</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MATRIX CARDS GRID WITH ALWAYS-VISIBLE LOAD BUTTONS                        */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[520px] overflow-y-auto pr-1">
            {processedMatrices.length === 0 ? (
              <div className="col-span-full py-12 px-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center justify-center gap-3 text-center">
                <Database className="w-10 h-10 text-slate-500" />
                <div className="text-sm font-bold text-slate-200">
                  В выбранном диапазоне размера N ({sizePreset}) нет матриц с текущими фильтрами
                </div>
                <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                  Попробуйте сбросить фильтры по группе TAMU и физической области или переключить диапазон размера
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGroup('all');
                      setSelectedKind('all');
                      setSymmetryFilter('all');
                      setSearchQuery('');
                    }}
                    className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold cursor-pointer transition-all shadow-md hover:bg-cyan-400"
                  >
                    Показать все матрицы в диапазоне {sizePreset}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSizePreset('all');
                      setSelectedGroup('all');
                      setSelectedKind('all');
                      setSymmetryFilter('all');
                      setSearchQuery('');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-all"
                  >
                    Показать весь каталог SuiteSparse
                  </button>
                </div>
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
                      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center z-20 gap-2 text-cyan-300 text-xs font-semibold">
                        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                        <span>Построение CSR структуры и буферов...</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      {/* Header: Name, TAMU link, status tag, dimensions */}
                      <div className="flex items-start justify-between gap-2">
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
                                <span>Загружено в память</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 border border-slate-700/80 text-[10px] font-medium">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>Доступно в каталоге</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold shrink-0 ${
                            meta.rows > 1000000
                              ? 'bg-purple-950/90 text-purple-300 border border-purple-800'
                              : meta.rows > 10000
                              ? 'bg-blue-950/90 text-blue-300 border border-blue-800'
                              : meta.rows > 1000
                              ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-800'
                              : 'bg-slate-950 text-slate-300 border border-slate-800'
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

                    <div className="mt-auto flex flex-col gap-2.5 pt-2 border-t border-slate-800/80">
                      {/* Meta details: NNZ, Density, Symmetry, Solver recommendation */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono flex-wrap gap-1">
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
                          <span className="px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 text-[10px] font-semibold">
                            🎯 {meta.isSymmetric ? (meta.rows > 1000 ? 'PCG-SSOR' : 'PCG-Jacobi') : 'BiCGSTAB'}
                          </span>
                        </div>
                      </div>

                      {/* Prominent, guaranteed ALWAYS-VISIBLE Load Button */}
                      <button
                        type="button"
                        onClick={() => handleLoadMatrix(meta)}
                        disabled={isLoading}
                        className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98] ${
                          isLoaded
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                            : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/20'
                        }`}
                      >
                        {isLoaded ? (
                          <>
                            <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                            <span>Загрузить в СЛАУ</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 text-slate-950" />
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SYNTHETIC PARAMETRIC MATRIX GENERATOR                              */}
      {/* ========================================================================= */}
      {activeTab === 'generator' && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Генератор кастомных физических матриц любого размера
              </h4>
              <p className="text-xs text-slate-400">
                Синтез разреженных систем СЛАУ <MathText text="$Ax = b$" /> для уравнений математической физики (до <MathText text="$N = 50\,000$" />)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end pt-2">
            {/* Family Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Тип математической задачи:</label>
              <select
                value={customGenFamily}
                onChange={(e) => setCustomGenFamily(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
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
            </div>

            {/* Size Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Размерность системы <MathText text="$N$" />:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="50000"
                  step="100"
                  value={customGenSize}
                  onChange={(e) => setCustomGenSize(Math.max(10, Math.min(50000, Number(e.target.value))))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500 font-bold"
                />
                <span className="text-xs text-slate-400 font-mono">строк</span>
              </div>
            </div>

            {/* Generate Button */}
            <button
              type="button"
              onClick={handleGenerateCustom}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>Сгенерировать и загрузить в СЛАУ</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MATRIX MARKET FILE UPLOAD                                          */}
      {/* ========================================================================= */}
      {activeTab === 'upload' && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center gap-4 text-center shadow-xl">
          <div className="p-4 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <FileCode className="w-8 h-8" />
          </div>

          <div>
            <h4 className="text-base font-bold text-white">Импорт матрицы из файла Matrix Market (.mtx)</h4>
            <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
              Загрузите разреженную матрицу в стандартном текстовом формате NIST / Texas A&M Matrix Market Coordinate Format.
            </p>
          </div>

          <label className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs cursor-pointer transition-all shadow-lg shadow-cyan-500/20">
            <Upload className="w-4 h-4" />
            <span>{isUploading ? 'Парсинг матрицы...' : 'Выбрать .mtx файл с компьютера'}</span>
            <input
              type="file"
              accept=".mtx,.txt"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
              }}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>
      )}
    </div>
  );
};
