import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Sliders,
  Database,
  Download,
  Upload,
  Check,
  Globe,
  Tag,
  ExternalLink,
  Layers,
  Sparkles,
  Zap,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Loader2,
  Cpu,
  Boxes,
  HelpCircle,
  FileCode,
} from 'lucide-react';
import { SUITE_SPARSE_CATALOG } from '../data/suiteSparseData';
import { SuiteSparseMeta, SparseMatrixCSR } from '../types/sparse';
import {
  parseMatrixMarket,
  cooToCSR,
  generateSyntheticSuiteSparseMatrix,
  loadSuiteSparseMatrixOnDemand,
} from '../utils/matrixMarket';

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
  // Search query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sorting State
  const [sortKey, setSortKey] = useState<SortKey>('size');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc'); // Default: от большей к меньшей (Size Desc)

  // Matrix Size Range filter (expanded range up to 70,000+)
  const [maxSizeLimit, setMaxSizeLimit] = useState<number>(70000);
  const [minSizeLimit, setMinSizeLimit] = useState<number>(1);
  const [sizePreset, setSizePreset] = useState<'all' | 'small' | 'medium' | 'large' | 'huge'>('all');

  // Group / Kind filter
  const [selectedKind, setSelectedKind] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  // Symmetry filter
  const [symmetryFilter, setSymmetryFilter] = useState<'all' | 'symmetric' | 'nonsymmetric'>('all');

  // On-demand loading state
  const [loadingMatrixId, setLoadingMatrixId] = useState<string | null>(null);

  // Direct TAMU Matrix Name Import state
  const [directMatrixInput, setDirectMatrixInput] = useState<string>('');
  const [directInputError, setDirectInputError] = useState<string | null>(null);

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
  const handleSizePreset = (preset: 'all' | 'small' | 'medium' | 'large' | 'huge') => {
    setSizePreset(preset);
    if (preset === 'all') {
      setMinSizeLimit(1);
      setMaxSizeLimit(70000);
    } else if (preset === 'small') {
      setMinSizeLimit(1);
      setMaxSizeLimit(500);
    } else if (preset === 'medium') {
      setMinSizeLimit(500);
      setMaxSizeLimit(2000);
    } else if (preset === 'large') {
      setMinSizeLimit(2000);
      setMaxSizeLimit(10000);
    } else if (preset === 'huge') {
      setMinSizeLimit(10000);
      setMaxSizeLimit(70000);
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

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = m.name.toLowerCase().includes(q);
        const matchGroup = m.group.toLowerCase().includes(q);
        const matchKind = m.kind.toLowerCase().includes(q);
        const matchDesc = m.description.toLowerCase().includes(q);
        return matchName || matchGroup || matchKind || matchDesc;
      }

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
  const handleSelectMatrixOnDemand = async (meta: SuiteSparseMeta) => {
    try {
      setLoadingMatrixId(meta.id);
      const csr = await loadSuiteSparseMatrixOnDemand(meta);
      onLoadMatrix(csr);
      onClose();
    } catch (err: any) {
      console.error('Error loading matrix on demand:', err);
    } finally {
      setLoadingMatrixId(null);
    }
  };

  // Direct Import from TAMU Name or URL (e.g. "https://sparse.tamu.edu/HB/bcsstk18", "HB/bcsstk18", "Janna/Flan_1565" or "pwtk")
  const handleDirectImport = async (overrideInput?: string) => {
    const rawInput = (overrideInput || directMatrixInput).trim();
    if (!rawInput) return;

    setDirectInputError(null);

    // Clean up input from full Texas A&M URLs, MM paths, and file extensions
    let cleaned = rawInput;
    cleaned = cleaned.replace(/^https?:\/\/sparse\.tamu\.edu\/?/i, '');
    cleaned = cleaned.replace(/^MM\//i, '');
    cleaned = cleaned.replace(/\.tar\.gz$/i, '');
    cleaned = cleaned.replace(/\.mtx$/i, '');
    cleaned = cleaned.replace(/\.txt$/i, '');

    let group = 'HB';
    let name = cleaned;

    if (cleaned.includes('/')) {
      const parts = cleaned.split('/');
      group = parts[0].trim();
      name = parts.slice(1).join('/').trim();
    }

    const lowerName = name.toLowerCase();
    const lowerGroup = group.toLowerCase();

    // 1. Check if matching in existing catalog
    const found = SUITE_SPARSE_CATALOG.find(
      (m) =>
        (m.name.toLowerCase() === lowerName && m.group.toLowerCase() === lowerGroup) ||
        `${m.group}/${m.name}`.toLowerCase() === `${lowerGroup}/${lowerName}` ||
        m.name.toLowerCase() === lowerName ||
        m.id.toLowerCase() === `hb_${lowerName}` ||
        m.id.toLowerCase() === lowerName
    );

    if (found) {
      handleSelectMatrixOnDemand(found);
      return;
    }

    // 2. Otherwise dynamically determine physical domain and characteristics from Texas A&M group
    try {
      setLoadingMatrixId('direct_import');

      // Infer domain kind, symmetry and typical dimensions based on TAMU group
      let inferredKind = 'Structural Problem';
      let isSym = true;
      let isSpd = true;
      let estimatedN = 1200;
      let estimatedNnz = 9600;

      const gUpper = group.toUpperCase();
      if (gUpper === 'DAVIS' || gUpper === 'SANDIA' || gUpper === 'GRUND' || gUpper === 'SCHENK_ISE' || gUpper === 'SCHENK') {
        inferredKind = 'Circuit & Semiconductor';
        isSym = false;
        isSpd = false;
        estimatedN = 2500;
        estimatedNnz = 18000;
      } else if (gUpper === 'SNAP' || gUpper === 'PAJEK' || gUpper === 'NEWMAN') {
        inferredKind = 'Complex Network & Graph';
        isSym = true;
        isSpd = true;
        estimatedN = 3200;
        estimatedNnz = 24000;
      } else if (gUpper === 'BAI' || gUpper === 'DRIVCAV' || gUpper === 'LUCIFORA') {
        inferredKind = 'CFD & Fluid Dynamics';
        isSym = false;
        isSpd = false;
        estimatedN = 2048;
        estimatedNnz = 14500;
      } else if (gUpper === 'JANNA') {
        inferredKind = '3D Geomechanics';
        isSym = true;
        isSpd = true;
        estimatedN = 1565;
        estimatedNnz = 150000;
      } else if (gUpper === 'GHS_INDEF') {
        inferredKind = 'Indefinite Helmholtz / Optimization';
        isSym = true;
        isSpd = false;
        estimatedN = 1800;
        estimatedNnz = 12000;
      } else if (gUpper === 'OBERWOLFACH') {
        inferredKind = 'MEMS Model Order Reduction';
        isSym = true;
        isSpd = true;
        estimatedN = 1693;
        estimatedNnz = 13500;
      } else if (gUpper === 'BOEING' || gUpper === 'WILLIAMS' || gUpper === 'POTHEN' || gUpper === 'SIMON') {
        inferredKind = 'Aerospace Structural FEA';
        isSym = true;
        isSpd = true;
        estimatedN = 3000;
        estimatedNnz = 35000;
      }

      const dynamicMeta: SuiteSparseMeta = {
        id: `tamu_${group.toLowerCase()}_${name.toLowerCase()}`,
        name: name,
        group: group,
        rows: estimatedN,
        cols: estimatedN,
        nnz: estimatedNnz,
        isSymmetric: isSym,
        isSPD: isSpd,
        kind: inferredKind,
        density: (estimatedNnz / (estimatedN * estimatedN)) * 100,
        description: `Матрица ${group}/${name} из репозитория SuiteSparse Matrix Collection (sparse.tamu.edu).`,
        downloadUrl: `https://sparse.tamu.edu/MM/${group}/${name}.tar.gz`,
      };

      const csr = await loadSuiteSparseMatrixOnDemand(dynamicMeta);
      onLoadMatrix(csr);
      onClose();
    } catch (err: any) {
      setDirectInputError(`Ошибка загрузки матрицы: ${err.message}`);
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
            <p className="text-xs text-slate-400">
              Мировой эталонный репозиторий матриц всех размеров (до 70,000+ DoF и 1.6M+ ненулевых элементов).
              Загрузка выполняется по мере потребности (On-Demand).
            </p>
          </div>
        </div>

        {/* Action Buttons: Direct Import & File Upload */}
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

      {/* Direct Search & URL/Name Quick Import Bar */}
      <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-xs text-slate-300 font-medium whitespace-nowrap">
            Прямая загрузка по названию или URL с sparse.tamu.edu:
          </span>
          <input
            type="text"
            value={directMatrixInput}
            onChange={(e) => setDirectMatrixInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleDirectImport()}
            placeholder="Например: https://sparse.tamu.edu/HB/bcsstk18, Janna/Flan_1565, SNAP/amazon0302, nos7..."
            className="flex-1 min-w-[240px] px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
          <button
            onClick={() => handleDirectImport()}
            disabled={!directMatrixInput.trim() || loadingMatrixId !== null}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 shadow-md"
          >
            {loadingMatrixId === 'direct_import' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Загрузить</span>
          </button>
        </div>

        {/* Popular TAMU Matrix Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] border-t border-slate-800/60">
          <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Популярные TAMU:</span>
          {[
            'HB/can_24',
            'HB/bcsstk01',
            'HB/bcsstk18',
            'HB/nos7',
            'HB/pores_1',
            'Bai/rdb2048',
            'Boeing/crystk03',
            'Boeing/pwtk',
            'Davis/circuit5M',
            'Janna/Flan_1565',
            'SNAP/amazon0302',
            'GHS_indef/helm2d03',
            'Sandia/ASIC_320k',
            'Newman/karate',
            'Oberwolfach/gyro',
            'Williams/webbase-1M',
          ].map((chip) => (
            <button
              key={chip}
              onClick={() => {
                setDirectMatrixInput(chip);
                handleDirectImport(chip);
              }}
              className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-cyan-950 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/50 text-[10px] text-slate-300 font-mono transition-colors cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {directInputError && (
        <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-300 text-xs">
          {directInputError}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DEDICATED SORTING & FILTER TOOLBAR                                     */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col gap-4 shadow-lg">
        {/* Row 1: Search, Kind filter, Group filter, Symmetry filter */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по имени (bcsstk...), группе (HB, Sandia, Boeing...), описанию..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Group Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Группа:</span>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">Все группы SuiteSparse</option>
              {availableGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Kind Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Область:</span>
            <select
              value={selectedKind}
              onChange={(e) => setSelectedKind(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer max-w-[200px]"
            >
              <option value="all">Все физические области</option>
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
              className={`px-2 py-1 rounded-lg transition-colors ${
                symmetryFilter === 'all'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setSymmetryFilter('symmetric')}
              className={`px-2 py-1 rounded-lg transition-colors ${
                symmetryFilter === 'symmetric'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              SPD / Симметричные
            </button>
            <button
              onClick={() => setSymmetryFilter('nonsymmetric')}
              className={`px-2 py-1 rounded-lg transition-colors ${
                symmetryFilter === 'nonsymmetric'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Несимметричные
            </button>
          </div>
        </div>

        {/* Row 2: Prominent Sorting Buttons (Requested: Sort from large to small / size / NNZ) */}
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
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                  sortKey === 'size' && sortOrder === 'desc'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Сортировать от наибольшего размера матрицы к наименьшему (N убыв.)"
              >
                <ArrowDownWideNarrow className="w-3.5 h-3.5" />
                <span>Размер $N$ (от большой к малой $\downarrow$)</span>
              </button>

              <button
                onClick={() => {
                  setSortKey('size');
                  setSortOrder('asc');
                }}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg font-medium transition-all ${
                  sortKey === 'size' && sortOrder === 'asc'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Сортировать от наименьшего размера матрицы к наибольшему (N возр.)"
              >
                <ArrowUpNarrowWide className="w-3.5 h-3.5" />
                <span>$N$ ($\uparrow$)</span>
              </button>
            </div>

            {/* Sort by Non-Zero Elements (NNZ) */}
            <div className="inline-flex rounded-xl bg-slate-900 p-0.5 border border-slate-800 text-xs">
              <button
                onClick={() => {
                  setSortKey('nnz');
                  setSortOrder('desc');
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                  sortKey === 'nnz' && sortOrder === 'desc'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Сортировать по количеству ненулевых элементов (NNZ от максимума к минимуму)"
              >
                <Boxes className="w-3.5 h-3.5 text-purple-300" />
                <span>Кол-во NNZ ($\downarrow$)</span>
              </button>

              <button
                onClick={() => {
                  setSortKey('nnz');
                  setSortOrder('asc');
                }}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg font-medium transition-all ${
                  sortKey === 'nnz' && sortOrder === 'asc'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Сортировать по возрастанию количества ненулевых элементов (NNZ)"
              >
                <span>NNZ ($\uparrow$)</span>
              </button>
            </div>

            {/* Sort by Density % */}
            <button
              onClick={() => handleSortToggle('density')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
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
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                sortKey === 'name'
                  ? 'bg-slate-200 text-slate-950 border-white font-bold shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              <span>Имя (A-Z) {sortKey === 'name' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}</span>
            </button>
          </div>

          <div className="text-slate-400 font-mono text-xs">
            Найдено в каталоге: <strong className="text-cyan-300">{processedMatrices.length}</strong> матриц
          </div>
        </div>

        {/* Row 3: Matrix Size Range presets & Slider */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-medium">Диапазон размера:</span>
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[11px]">
              <button
                onClick={() => handleSizePreset('all')}
                className={`px-2 py-1 rounded-lg ${sizePreset === 'all' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Все (до 70K+)
              </button>
              <button
                onClick={() => handleSizePreset('small')}
                className={`px-2 py-1 rounded-lg ${sizePreset === 'small' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Малые (&lt;500)
              </button>
              <button
                onClick={() => handleSizePreset('medium')}
                className={`px-2 py-1 rounded-lg ${sizePreset === 'medium' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Средние (500–2K)
              </button>
              <button
                onClick={() => handleSizePreset('large')}
                className={`px-2 py-1 rounded-lg ${sizePreset === 'large' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Большие (2K–10K)
              </button>
              <button
                onClick={() => handleSizePreset('huge')}
                className={`px-2 py-1 rounded-lg ${sizePreset === 'huge' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Экстремальные (&gt;10K)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <Sliders className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <input
              type="range"
              min="24"
              max="70000"
              step="100"
              value={maxSizeLimit}
              onChange={(e) => {
                setMaxSizeLimit(Number(e.target.value));
                setSizePreset('all');
              }}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <span className="font-mono text-cyan-300 font-bold whitespace-nowrap text-[11px] min-w-[90px]">
              ≤ {maxSizeLimit.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. GRID OF MATRICES (ON-DEMAND LOADING)                                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[460px] overflow-y-auto pr-1">
        {processedMatrices.map((meta) => {
          const isLoading = loadingMatrixId === meta.id;

          return (
            <div
              key={meta.id}
              onClick={() => !isLoading && handleSelectMatrixOnDemand(meta)}
              className="p-4 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 shadow-md hover:shadow-cyan-500/10 cursor-pointer transition-all flex flex-col justify-between gap-3 group relative overflow-hidden"
            >
              {isLoading && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-10 gap-2 text-cyan-300 text-xs font-semibold">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Построение CSR структуры...</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors font-mono truncate">
                      {meta.group}/{meta.name}
                    </span>
                    <a
                      href={`https://sparse.tamu.edu/${meta.group}/${meta.name}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-slate-500 hover:text-cyan-400 p-0.5 rounded transition-colors shrink-0"
                      title="Открыть страницу матрицы на sparse.tamu.edu"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
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
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {meta.description}
                </p>
              </div>

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
            </div>
          );
        })}
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
            Возможность мгновенно синтезировать СЛАУ любой размерности ($N \le 50,000$)
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
            <span className="text-xs text-slate-400">Размер $N$:</span>
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
