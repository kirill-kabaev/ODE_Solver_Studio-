import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Eye,
  BarChart3,
  CircleDot,
  Info,
  Sparkles,
} from 'lucide-react';
import { SparseMatrixCSR, GershgorinDisk } from '../types/sparse';
import { computeGershgorinDisks } from '../utils/matrixMarket';

interface SparseMatrixVisualizerProps {
  matrix: SparseMatrixCSR;
  height?: number;
}

export const SparseMatrixVisualizer: React.FC<SparseMatrixVisualizerProps> = ({
  matrix,
  height = 460,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // View modes
  const [viewTab, setViewTab] = useState<'spy' | 'profile' | 'gershgorin'>('spy');

  // Zoom & Pan state
  const [scale, setScale] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Hover inspection
  const [hoverInfo, setHoverInfo] = useState<{
    row: number;
    col: number;
    val?: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Color scheme
  const [colorMode, setColorMode] = useState<'cyan' | 'heatmap' | 'sign'>('cyan');

  // Compute Gershgorin Disks
  const gershgorinDisks = useMemo<GershgorinDisk[]>(() => {
    return computeGershgorinDisks(matrix, 60);
  }, [matrix]);

  // Compute Row Non-zero profile
  const rowProfile = useMemo<number[]>(() => {
    const counts: number[] = [];
    const step = Math.max(1, Math.floor(matrix.rows / 100));
    for (let r = 0; r < matrix.rows; r += step) {
      counts.push(matrix.rowPtr[r + 1] - matrix.rowPtr[r]);
    }
    return counts;
  }, [matrix]);

  // Reset zoom & pan on matrix change
  useEffect(() => {
    setScale(1.0);
    setPanOffset({ x: 0, y: 0 });
    setHoverInfo(null);
  }, [matrix.name, matrix.rows]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || viewTab !== 'spy') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;

    canvas.width = width * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, canvasHeight);

    const size = Math.min(width, canvasHeight) - 40;
    const originX = (width - size) / 2 + panOffset.x;
    const originY = (canvasHeight - size) / 2 + panOffset.y;

    // Draw Matrix boundary box
    ctx.save();
    ctx.translate(originX, originY);
    ctx.scale(scale, scale);

    // Matrix Box
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1 / scale;
    ctx.strokeRect(0, 0, size, size);

    // Subtle grid lines (quarters)
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(size * 0.25, 0); ctx.lineTo(size * 0.25, size);
    ctx.moveTo(size * 0.5, 0); ctx.lineTo(size * 0.5, size);
    ctx.moveTo(size * 0.75, 0); ctx.lineTo(size * 0.75, size);
    ctx.moveTo(0, size * 0.25); ctx.lineTo(size, size * 0.25);
    ctx.moveTo(0, size * 0.5); ctx.lineTo(size, size * 0.5);
    ctx.moveTo(0, size * 0.75); ctx.lineTo(size, size * 0.75);
    ctx.stroke();

    // Main Diagonal dashed line
    ctx.strokeStyle = '#38bdf844';
    ctx.setLineDash([4 / scale, 4 / scale]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, size);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Non-Zero Elements (Spy Plot)
    const n = matrix.rows;
    const m = matrix.cols;
    const pointSize = Math.max(1, (size / n) * 0.95);

    for (let r = 0; r < n; r++) {
      const py = (r / n) * size;
      const start = matrix.rowPtr[r];
      const end = matrix.rowPtr[r + 1];

      for (let k = start; k < end; k++) {
        const c = matrix.colInd[k];
        const v = matrix.values[k];
        const px = (c / m) * size;

        if (colorMode === 'sign') {
          if (r === c) {
            ctx.fillStyle = '#38bdf8'; // Diagonal: Cyan
          } else if (v > 0) {
            ctx.fillStyle = '#4ade80'; // Positive: Green
          } else {
            ctx.fillStyle = '#f87171'; // Negative: Red
          }
        } else if (colorMode === 'heatmap') {
          const absV = Math.abs(v);
          const norm = Math.min(1.0, Math.log10(1 + absV) / 2.5);
          ctx.fillStyle = `hsl(${260 - norm * 240}, 90%, ${45 + norm * 25}%)`;
        } else {
          // Default Vibrant Cyan/Indigo
          if (r === c) {
            ctx.fillStyle = '#22d3ee';
          } else {
            ctx.fillStyle = '#818cf8';
          }
        }

        ctx.fillRect(px, py, pointSize, pointSize);
      }
    }

    ctx.restore();
  }, [matrix, scale, panOffset, colorMode, viewTab]);

  // Mouse Wheel Zoom (only if Ctrl/Cmd is held, otherwise allowing standard page scroll)
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      setScale((prev) => Math.min(30, Math.max(0.6, prev * zoomFactor)));
    }
  };

  // Mouse Drag / Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }

    // Hit-testing for tooltip
    const rect = canvas.getBoundingClientRect();
    const width = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;
    const size = Math.min(width, canvasHeight) - 40;
    const originX = (width - size) / 2 + panOffset.x;
    const originY = (canvasHeight - size) / 2 + panOffset.y;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const relX = (mouseX - originX) / (size * scale);
    const relY = (mouseY - originY) / (size * scale);

    if (relX >= 0 && relX <= 1 && relY >= 0 && relY <= 1) {
      const row = Math.floor(relY * matrix.rows);
      const col = Math.floor(relX * matrix.cols);

      // Find exact value if exists
      let val: number | undefined = undefined;
      const start = matrix.rowPtr[row];
      const end = matrix.rowPtr[row + 1];
      for (let k = start; k < end; k++) {
        if (matrix.colInd[k] === col) {
          val = matrix.values[k];
          break;
        }
      }

      setHoverInfo({
        row,
        col,
        val,
        screenX: mouseX,
        screenY: mouseY,
      });
    } else {
      setHoverInfo(null);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl relative select-none"
    >
      {/* Top Header & Visualizer Controls */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between gap-3 flex-wrap">
        {/* Left: Matrix Title & Size Badge */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">{matrix.name}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-mono">
                {matrix.rows} × {matrix.cols}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                nnz: {matrix.nnz.toLocaleString()} ({matrix.density?.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Center: Tabs (Spy Plot / Profile / Gershgorin) */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setViewTab('spy')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewTab === 'spy'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Spy Plot</span>
          </button>

          <button
            type="button"
            onClick={() => setViewTab('profile')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewTab === 'profile'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Профиль строк</span>
          </button>

          <button
            type="button"
            onClick={() => setViewTab('gershgorin')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewTab === 'gershgorin'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>Круги Гершгорина</span>
          </button>
        </div>

        {/* Right: Zoom & Color Controls (if Spy tab active) */}
        {viewTab === 'spy' && (
          <div className="flex items-center gap-2">
            {/* Color Scheme */}
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => setColorMode('cyan')}
                className={`px-2 py-0.5 rounded ${colorMode === 'cyan' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Cyan
              </button>
              <button
                onClick={() => setColorMode('sign')}
                className={`px-2 py-0.5 rounded ${colorMode === 'sign' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                +/- Знак
              </button>
              <button
                onClick={() => setColorMode('heatmap')}
                className={`px-2 py-0.5 rounded ${colorMode === 'heatmap' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Тепло
              </button>
            </div>

            {/* Zoom In/Out */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setScale((s) => Math.min(30, s * 1.3))}
                className="p-1 text-slate-400 hover:text-cyan-400 rounded hover:bg-slate-800"
                title="Увеличить (Колесико мыши вверх)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setScale((s) => Math.max(0.6, s / 1.3))}
                className="p-1 text-slate-400 hover:text-cyan-400 rounded hover:bg-slate-800"
                title="Уменьшить (Колесико мыши вниз)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setScale(1.0); setPanOffset({ x: 0, y: 0 }); }}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                title="Сбросить масштаб и положение"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-slate-400 font-mono px-1">
                {(scale * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Canvas / Chart Container */}
      <div
        className="relative w-full overflow-hidden cursor-crosshair"
        style={{ height: `${height}px` }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {viewTab === 'spy' && (
          <>
            <canvas
              ref={canvasRef}
              className="w-full h-full block"
            />

            {/* Interactive Coordinate Tooltip */}
            {hoverInfo && (
              <div
                className="absolute z-20 pointer-events-none p-2 rounded-lg bg-slate-900/95 border border-cyan-500/50 shadow-2xl text-xs backdrop-blur-md transform -translate-x-1/2 -translate-y-full mb-2"
                style={{ left: hoverInfo.screenX, top: hoverInfo.screenY }}
              >
                <div className="flex items-center gap-2 font-mono text-cyan-300">
                  <span className="font-bold">
                    A[{hoverInfo.row + 1}, {hoverInfo.col + 1}]
                  </span>
                  {hoverInfo.row === hoverInfo.col && (
                    <span className="px-1 py-0.2 rounded text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-800">
                      ДИАГОНАЛЬ
                    </span>
                  )}
                </div>
                <div className="text-slate-300 text-[11px] mt-0.5">
                  {hoverInfo.val !== undefined ? (
                    <span className="text-emerald-400 font-mono font-bold">
                      Значение: {hoverInfo.val}
                    </span>
                  ) : (
                    <span className="text-slate-500">0 (Ненулевой элемент отсутствует)</span>
                  )}
                </div>
                <div className="text-slate-400 text-[10px] mt-0.5">
                  Ненулевых в строке #{hoverInfo.row + 1}: {matrix.rowPtr[hoverInfo.row + 1] - matrix.rowPtr[hoverInfo.row]}
                </div>
              </div>
            )}
          </>
        )}

        {/* Tab 2: Row Profile Distribution Histogram */}
        {viewTab === 'profile' && (
          <div className="w-full h-full p-6 flex flex-col justify-between bg-slate-950">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Распределение плотности ненулевых элементов ($nnz$) по строкам матрицы</span>
              <span className="font-mono text-cyan-400">
                Макс в строке: {Math.max(...rowProfile)} | Среднее: {(matrix.nnz / matrix.rows).toFixed(1)}
              </span>
            </div>
            <div className="flex-1 flex items-end gap-1 border-b border-l border-slate-800 p-2">
              {rowProfile.map((cnt, idx) => {
                const maxC = Math.max(...rowProfile) || 1;
                const hPercent = (cnt / maxC) * 100;
                return (
                  <div
                    key={idx}
                    className="flex-1 bg-gradient-to-t from-cyan-600 to-indigo-500 rounded-t-sm hover:brightness-125 transition-all relative group"
                    style={{ height: `${Math.max(4, hPercent)}%` }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-[9px] text-white rounded pointer-events-none whitespace-nowrap z-10 font-mono">
                      nnz: {cnt}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
              <span>Строка 1</span>
              <span>Строка {matrix.rows / 2}</span>
              <span>Строка {matrix.rows}</span>
            </div>
          </div>
        )}

        {/* Tab 3: Gershgorin Disks Spectral Complex Plane */}
        {viewTab === 'gershgorin' && (
          <div className="w-full h-full p-4 flex flex-col bg-slate-950 overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5">
                <CircleDot className="w-3.5 h-3.5 text-emerald-400" />
                Спектральные круги Гершгорина на комплексной плоскости ℂ (локализация собственных значений λ)
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                {matrix.isDiagonallyDominant ? '✓ Диагональное преобладание (Обратима)' : 'Общий спектр'}
              </span>
            </div>

            {/* SVG Complex Plane for Gershgorin Disks */}
            <div className="flex-1 relative flex items-center justify-center">
              <svg className="w-full h-full max-h-[360px]" viewBox="-50 -50 100 100">
                {/* Axes */}
                <line x1="-48" y1="0" x2="48" y2="0" stroke="#334155" strokeWidth="0.5" />
                <line x1="0" y1="-48" x2="0" y2="48" stroke="#334155" strokeWidth="0.5" />
                {/* Imaginary & Real labels */}
                <text x="42" y="-2" fill="#64748b" fontSize="3" fontStyle="italic">Re(λ)</text>
                <text x="2" y="-44" fill="#64748b" fontSize="3" fontStyle="italic">Im(λ)</text>

                {/* Disks */}
                {(() => {
                  const maxExtent = Math.max(
                    ...gershgorinDisks.map((d) => Math.abs(d.centerReal) + d.radius),
                    1.0
                  );
                  const scaleG = 40 / maxExtent;

                  return gershgorinDisks.map((d, i) => {
                    const cx = d.centerReal * scaleG;
                    const cy = 0;
                    const r = Math.max(0.8, d.radius * scaleG);

                    return (
                      <g key={i} className="hover:opacity-100 transition-opacity">
                        <circle
                          cx={cx}
                          cy={cy}
                          r={r}
                          fill="rgba(16, 185, 129, 0.08)"
                          stroke="rgba(52, 211, 153, 0.4)"
                          strokeWidth="0.4"
                        />
                        <circle cx={cx} cy={cy} r="0.6" fill="#38bdf8" />
                      </g>
                    );
                  });
                })()}
              </svg>
            </div>
            <div className="text-center text-[10px] text-slate-500 font-mono mt-1">
              Каждый диск: |z - a_ii| ≤ Σ |a_ij|. Все собственные значения лежат внутри объединения кругов Гершгорина.
            </div>
          </div>
        )}
      </div>

      {/* Bottom Matrix Metrics Bar */}
      <div className="px-4 py-2.5 bg-slate-900/60 border-t border-slate-800 text-xs flex items-center justify-between gap-4 flex-wrap text-slate-300">
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span>
            Симметрия: <strong className={matrix.isSymmetric ? 'text-emerald-400' : 'text-amber-400'}>{matrix.isSymmetric ? 'Да (Symmetric)' : 'Нет (General)'}</strong>
          </span>
          <span>
            Ширина ленты: <strong className="text-cyan-400">{matrix.bandwidth || 0}</strong>
          </span>
          <span>
            Диаг. преобладание: <strong className={matrix.isDiagonallyDominant ? 'text-emerald-400' : 'text-slate-400'}>{matrix.isDiagonallyDominant ? 'Да' : 'Нет'}</strong>
          </span>
        </div>

        <div className="text-[11px] text-slate-400">
          Удерживайте левую кнопку мыши для панорамирования • Колесико для масштаба
        </div>
      </div>
    </div>
  );
};
