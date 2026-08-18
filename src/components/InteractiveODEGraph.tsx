import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MousePointerClick,
  Sparkles,
  Layers,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Grid,
  Download,
  Maximize2,
  Minimize2,
  X,
  Compass,
  Sliders,
  Check,
} from 'lucide-react';
import { ODESolution, SolverEngine, CauchyCondition } from '../types';
import { SolvingSpinner } from './SolvingSpinner';

export interface CustomTrajectoryPoint {
  id: string;
  x: number;
  y: number;
  color: string;
}

interface InteractiveODEGraphProps {
  solution: ODESolution | null;
  isSolving?: boolean;
  engine?: SolverEngine;
  currentRequestText?: string;
  attempt?: number;
  maxAttempts?: number;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
  onOpenInDesktopGraph?: () => void;
  onClose?: () => void;
  isExpanded?: boolean;
  initialCauchy?: CauchyCondition | null;
}

const COLOR_PALETTE = [
  '#f43f5e', // rose
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#ec4899', // pink
  '#3b82f6', // blue
  '#eab308', // yellow
  '#14b8a6', // teal
  '#a855f7', // purple
];

export const InteractiveODEGraph: React.FC<InteractiveODEGraphProps> = ({
  solution,
  isSolving = false,
  engine = 'ai',
  currentRequestText,
  attempt = 1,
  maxAttempts = 3,
  onCancel,
  title,
  subtitle,
  onOpenInDesktopGraph,
  onClose,
  isExpanded = false,
  initialCauchy,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Viewport state
  const [xRange, setXRange] = useState<[number, number]>([-5, 5]);
  const [yRange, setYRange] = useState<[number, number]>([-5, 5]);
  const [gridDensity, setGridDensity] = useState<number>(20);
  const [showVectorField, setShowVectorField] = useState<boolean>(true);
  const [showFamilyCurves, setShowFamilyCurves] = useState<boolean>(true);
  const [customPoints, setCustomPoints] = useState<CustomTrajectoryPoint[]>([]);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number; slope: number | null } | null>(null);

  // Manual Initial Condition Input state
  const [inputX0, setInputX0] = useState<string>('0');
  const [inputY0, setInputY0] = useState<string>('1');
  const [showPointControls, setShowPointControls] = useState<boolean>(true);

  // Update domains if solution specifies custom bounds
  useEffect(() => {
    if (solution?.plotConfig?.xDomain && solution?.plotConfig?.yDomain) {
      setXRange([solution.plotConfig.xDomain[0], solution.plotConfig.xDomain[1]]);
      setYRange([solution.plotConfig.yDomain[0], solution.plotConfig.yDomain[1]]);
    }
  }, [solution]);

  // If initial Cauchy exists, pre-seed input
  useEffect(() => {
    if (initialCauchy) {
      setInputX0(initialCauchy.x0 || '0');
      setInputY0(initialCauchy.y0 || '1');
    }
  }, [initialCauchy]);

  // Compile derivative evaluator function
  const evaluateDerivative = useCallback(
    (x: number, y: number): number => {
      if (!solution?.plotConfig?.derivativeJs) {
        return y - x;
      }
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function('x', 'y', 'Math', solution.plotConfig.derivativeJs);
        const val = fn(x, y, Math);
        if (Number.isNaN(val) || !Number.isFinite(val)) return 0;
        return Math.max(-50, Math.min(50, val));
      } catch {
        return 0;
      }
    },
    [solution]
  );

  // Compile solution curve function (x, c) => y
  const evaluateSolutionCurve = useCallback(
    (x: number, c: number): number | null => {
      if (!solution?.plotConfig?.solutionCurveJs) return null;
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function('x', 'c', 'Math', solution.plotConfig.solutionCurveJs);
        const val = fn(x, c, Math);
        if (Number.isNaN(val) || !Number.isFinite(val)) return null;
        return val;
      } catch {
        return null;
      }
    },
    [solution]
  );

  // Compile particular curve function (x) => y
  const evaluateParticularCurve = useCallback(
    (x: number): number | null => {
      if (!solution?.plotConfig?.particularCurveJs) return null;
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function('x', 'Math', solution.plotConfig.particularCurveJs);
        const val = fn(x, Math);
        if (Number.isNaN(val) || !Number.isFinite(val)) return null;
        return val;
      } catch {
        return null;
      }
    },
    [solution]
  );

  // RK4 numerical integrator for tracing custom curves from a point (x0, y0)
  const integrateRK4 = useCallback(
    (
      x0: number,
      y0: number,
      direction: 1 | -1,
      maxSteps: number = 350,
      h: number = 0.025
    ): { x: number; y: number }[] => {
      const points: { x: number; y: number }[] = [{ x: x0, y: y0 }];
      let cx = x0;
      let cy = y0;

      for (let i = 0; i < maxSteps; i++) {
        const step = direction * h;
        const k1 = evaluateDerivative(cx, cy);
        const k2 = evaluateDerivative(cx + step / 2, cy + (step * k1) / 2);
        const k3 = evaluateDerivative(cx + step / 2, cy + (step * k2) / 2);
        const k4 = evaluateDerivative(cx + step, cy + step * k3);

        const ny = cy + (step / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
        const nx = cx + step;

        if (
          Number.isNaN(ny) ||
          !Number.isFinite(ny) ||
          nx < xRange[0] - 4 ||
          nx > xRange[1] + 4 ||
          ny < yRange[0] - 8 ||
          ny > yRange[1] + 8
        ) {
          break;
        }

        points.push({ x: nx, y: ny });
        cx = nx;
        cy = ny;
      }

      return points;
    },
    [evaluateDerivative, xRange, yRange]
  );

  // Helper to add custom trajectory point
  const addTrajectoryPoint = (x: number, y: number) => {
    const color = COLOR_PALETTE[customPoints.length % COLOR_PALETTE.length];
    const newPt: CustomTrajectoryPoint = {
      id: 'pt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      color,
    };
    setCustomPoints((prev) => [...prev, newPt]);
  };

  const handleAddManualPoint = (e: React.FormEvent) => {
    e.preventDefault();
    const x = parseFloat(inputX0);
    const y = parseFloat(inputY0);
    if (!isNaN(x) && !isNaN(y)) {
      addTrajectoryPoint(x, y);
    }
  };

  const handleAddBundleX0 = (xVal: number = 0) => {
    const [yMin, yMax] = yRange;
    const count = 7;
    const step = (yMax - yMin) * 0.8 / (count - 1);
    const startY = yMin + (yMax - yMin) * 0.1;
    const newPts: CustomTrajectoryPoint[] = [];

    for (let i = 0; i < count; i++) {
      const y = Number((startY + i * step).toFixed(2));
      newPts.push({
        id: 'bundle_x_' + Date.now() + '_' + i,
        x: xVal,
        y,
        color: COLOR_PALETTE[(customPoints.length + i) % COLOR_PALETTE.length],
      });
    }
    setCustomPoints((prev) => [...prev, ...newPts]);
  };

  const handleAddBundleY0 = (yVal: number = 0) => {
    const [xMin, xMax] = xRange;
    const count = 7;
    const step = (xMax - xMin) * 0.8 / (count - 1);
    const startX = xMin + (xMax - xMin) * 0.1;
    const newPts: CustomTrajectoryPoint[] = [];

    for (let i = 0; i < count; i++) {
      const x = Number((startX + i * step).toFixed(2));
      newPts.push({
        id: 'bundle_y_' + Date.now() + '_' + i,
        x,
        y: yVal,
        color: COLOR_PALETTE[(customPoints.length + i) % COLOR_PALETTE.length],
      });
    }
    setCustomPoints((prev) => [...prev, ...newPts]);
  };

  const handleRemovePoint = (id: string) => {
    setCustomPoints((prev) => prev.filter((p) => p.id !== id));
  };

  // Main Canvas Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Coordinate conversions
    const [xMin, xMax] = xRange;
    const [yMin, yMax] = yRange;

    const toScreenX = (x: number) => ((x - xMin) / (xMax - xMin)) * width;
    const toScreenY = (y: number) => height - ((y - yMin) / (yMax - yMin)) * height;

    // Clear background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Draw Grid Lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#1e293b';
    ctx.font = '10px monospace';
    ctx.fillStyle = '#64748b';

    const xStep = xMax - xMin <= 10 ? 1 : 2;
    const yStep = yMax - yMin <= 10 ? 1 : 2;

    const startX = Math.ceil(xMin / xStep) * xStep;
    for (let x = startX; x <= xMax; x += xStep) {
      const sx = toScreenX(x);
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
      ctx.stroke();
      ctx.fillText(x.toFixed(0), sx + 3, height - 6);
    }

    const startY = Math.ceil(yMin / yStep) * yStep;
    for (let y = startY; y <= yMax; y += yStep) {
      const sy = toScreenY(y);
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
      ctx.stroke();
      if (Math.abs(y) > 0.001) {
        ctx.fillText(y.toFixed(0), 4, sy - 3);
      }
    }

    // Draw Main Axes (X=0, Y=0)
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#475569';

    // X Axis
    if (yMin <= 0 && yMax >= 0) {
      const sy0 = toScreenY(0);
      ctx.beginPath();
      ctx.moveTo(0, sy0);
      ctx.lineTo(width, sy0);
      ctx.stroke();
    }

    // Y Axis
    if (xMin <= 0 && xMax >= 0) {
      const sx0 = toScreenX(0);
      ctx.beginPath();
      ctx.moveTo(sx0, 0);
      ctx.lineTo(sx0, height);
      ctx.stroke();
    }

    // 1. Draw Direction Field (Slope Field)
    if (showVectorField && solution) {
      const numCols = gridDensity;
      const numRows = gridDensity;
      const dx = (xMax - xMin) / numCols;
      const dy = (yMax - yMin) / numRows;
      const segLength = Math.min(width, height) / (gridDensity * 1.8);

      for (let i = 0; i <= numCols; i++) {
        const x = xMin + (i + 0.5) * dx;
        for (let j = 0; j <= numRows; j++) {
          const y = yMin + (j + 0.5) * dy;
          const slope = evaluateDerivative(x, y);

          const angle = Math.atan(slope);
          const sx = toScreenX(x);
          const sy = toScreenY(y);

          const halfL = segLength / 2;
          const x1 = sx - halfL * Math.cos(angle);
          const y1 = sy + halfL * Math.sin(angle); // canvas Y is inverted
          const x2 = sx + halfL * Math.cos(angle);
          const y2 = sy - halfL * Math.sin(angle);

          // Color based on slope intensity
          const t = Math.atan(Math.abs(slope)) / (Math.PI / 2);
          ctx.strokeStyle = `rgba(${Math.floor(56 + t * 180)}, ${Math.floor(189 - t * 80)}, ${Math.floor(248)}, 0.45)`;
          ctx.lineWidth = 1.2;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          // Small point marker
          ctx.fillStyle = `rgba(56, 189, 248, 0.7)`;
          ctx.beginPath();
          ctx.arc(x2, y2, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 2. Draw Family of Solution Curves (Analytical C constants)
    if (showFamilyCurves && solution?.plotConfig?.solutionCurveJs) {
      const constants = [-3, -2, -1, -0.5, 0, 0.5, 1, 2, 3];
      const samples = 200;

      constants.forEach((c) => {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = c === 0 ? 'rgba(168, 85, 247, 0.75)' : 'rgba(99, 102, 241, 0.45)';
        ctx.beginPath();

        let hasStarted = false;
        for (let i = 0; i <= samples; i++) {
          const x = xMin + (i / samples) * (xMax - xMin);
          const y = evaluateSolutionCurve(x, c);

          if (y !== null && y >= yMin - 10 && y <= yMax + 10) {
            const sx = toScreenX(x);
            const sy = toScreenY(y);
            if (!hasStarted) {
              ctx.moveTo(sx, sy);
              hasStarted = true;
            } else {
              ctx.lineTo(sx, sy);
            }
          } else {
            hasStarted = false;
          }
        }
        ctx.stroke();
      });
    }

    // 3. Draw Particular Solution Curve (Cauchy)
    if (solution?.plotConfig?.particularCurveJs) {
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = '#10b981'; // vibrant emerald
      ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';
      ctx.shadowBlur = 10;
      ctx.beginPath();

      const samples = 300;
      let hasStarted = false;
      for (let i = 0; i <= samples; i++) {
        const x = xMin + (i / samples) * (xMax - xMin);
        const y = evaluateParticularCurve(x);

        if (y !== null && y >= yMin - 20 && y <= yMax + 20) {
          const sx = toScreenX(x);
          const sy = toScreenY(y);
          if (!hasStarted) {
            ctx.moveTo(sx, sy);
            hasStarted = true;
          } else {
            ctx.lineTo(sx, sy);
          }
        } else {
          hasStarted = false;
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // reset
    }

    // 4. Draw Custom User Trajectories (via RK4) from initial conditions
    if (customPoints.length > 0 && solution) {
      customPoints.forEach((pt) => {
        const forward = integrateRK4(pt.x, pt.y, 1);
        const backward = integrateRK4(pt.x, pt.y, -1);

        ctx.lineWidth = 2.2;
        ctx.strokeStyle = pt.color;
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 5;
        ctx.beginPath();

        // backward path
        for (let i = backward.length - 1; i >= 0; i--) {
          const sx = toScreenX(backward[i].x);
          const sy = toScreenY(backward[i].y);
          if (i === backward.length - 1) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }

        // forward path
        for (let i = 0; i < forward.length; i++) {
          const sx = toScreenX(forward[i].x);
          const sy = toScreenY(forward[i].y);
          ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw start circle marker
        const sx0 = toScreenX(pt.x);
        const sy0 = toScreenY(pt.y);

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sx0, sy0, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = pt.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Small label near marker
        ctx.font = '10px monospace';
        ctx.fillStyle = pt.color;
        ctx.fillText(`(${pt.x}, ${pt.y})`, sx0 + 6, sy0 - 4);
      });
    }
  }, [
    solution,
    xRange,
    yRange,
    gridDensity,
    showVectorField,
    showFamilyCurves,
    customPoints,
    evaluateDerivative,
    evaluateSolutionCurve,
    evaluateParticularCurve,
    integrateRK4,
  ]);

  // Handle ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 50 && height > 50) {
          canvas.width = Math.floor(width);
          canvas.height = Math.floor(height);
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Handle Canvas Click to drop custom trajectory
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !solution) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const [xMin, xMax] = xRange;
    const [yMin, yMax] = yRange;

    const mathX = xMin + (px / canvas.width) * (xMax - xMin);
    const mathY = yMin + ((canvas.height - py) / canvas.height) * (yMax - yMin);

    addTrajectoryPoint(mathX, mathY);
  };

  // Handle Canvas Mouse Move for coordinate tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const [xMin, xMax] = xRange;
    const [yMin, yMax] = yRange;

    const mathX = xMin + (px / canvas.width) * (xMax - xMin);
    const mathY = yMin + ((canvas.height - py) / canvas.height) * (yMax - yMin);

    const slope = solution ? evaluateDerivative(mathX, mathY) : null;
    setHoverCoords({ x: mathX, y: mathY, slope });
  };

  const handleZoom = (factor: number) => {
    setXRange(([min, max]) => [min * factor, max * factor]);
    setYRange(([min, max]) => [min * factor, max * factor]);
  };

  const handleResetZoom = () => {
    setXRange([-5, 5]);
    setYRange([-5, 5]);
  };

  const handleDownloadSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `ode_integral_curves_${Date.now()}.png`;
    link.href = url;
    link.click();
  };

  return (
    <div className="flex flex-col h-full gap-2.5 text-slate-200">
      {/* Header if modal / expanded */}
      {(title || onClose || onOpenInDesktopGraph) && (
        <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800 shrink-0">
          <div>
            {title && <h3 className="text-sm font-bold text-white flex items-center gap-2">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 font-mono">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2">
            {onOpenInDesktopGraph && (
              <button
                onClick={onOpenInDesktopGraph}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Перенести в главное окно графиков"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Открыть в главном окне</span>
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Toolbar: View Toggles & Zoom */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/90 p-2.5 rounded-xl border border-slate-800 text-xs shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setShowVectorField(!showVectorField)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              showVectorField
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-500 hover:text-slate-300 bg-slate-900 border border-slate-800'
            }`}
          >
            {showVectorField ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Поле касательных</span>
          </button>

          <button
            onClick={() => setShowFamilyCurves(!showFamilyCurves)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              showFamilyCurves
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-500 hover:text-slate-300 bg-slate-900 border border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Семейство (C)</span>
          </button>

          <button
            onClick={() => setShowPointControls(!showPointControls)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              showPointControls
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-500 hover:text-slate-300 bg-slate-900 border border-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Начальные условия ({customPoints.length})</span>
          </button>
        </div>

        {/* Zoom Controls & Hover Info */}
        <div className="flex items-center gap-2">
          {hoverCoords && (
            <div className="hidden md:flex items-center gap-2 font-mono text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              <span>x: {hoverCoords.x.toFixed(2)}</span>
              <span>y: {hoverCoords.y.toFixed(2)}</span>
              {hoverCoords.slope !== null && (
                <span className="text-cyan-400">y': {hoverCoords.slope.toFixed(2)}</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => handleZoom(0.75)}
              className="p-1 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 transition-colors cursor-pointer"
              title="Приблизить"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleZoom(1.33)}
              className="p-1 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 transition-colors cursor-pointer"
              title="Отдалить"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 transition-colors cursor-pointer"
              title="Сбросить масштаб"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDownloadSnapshot}
              className="p-1 text-slate-400 hover:text-cyan-300 rounded hover:bg-slate-800 transition-colors cursor-pointer"
              title="Скачать изображение графика (PNG)"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Trajectories & Initial Condition Controls Panel */}
      {showPointControls && (
        <div className="flex flex-col gap-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs shrink-0 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Manual Point Input */}
            <form onSubmit={handleAddManualPoint} className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <MousePointerClick className="w-3.5 h-3.5 text-cyan-400" />
                <span>Начальная точка:</span>
              </span>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-mono text-[11px]">x₀=</span>
                <input
                  type="text"
                  value={inputX0}
                  onChange={(e) => setInputX0(e.target.value)}
                  placeholder="0"
                  className="w-14 bg-slate-900 px-2 py-1 rounded border border-slate-700 text-xs font-mono text-cyan-300 outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-mono text-[11px]">y₀=</span>
                <input
                  type="text"
                  value={inputY0}
                  onChange={(e) => setInputY0(e.target.value)}
                  placeholder="1"
                  className="w-14 bg-slate-900 px-2 py-1 rounded border border-slate-700 text-xs font-mono text-cyan-300 outline-none focus:border-cyan-500"
                />
              </div>
              <button
                type="submit"
                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded font-bold text-xs flex items-center gap-1 transition-all shadow active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Построить линию</span>
              </button>
            </form>

            {/* Bundle Generators & Clear */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-500">Пучки:</span>
              <button
                type="button"
                onClick={() => handleAddBundleX0(0)}
                className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 rounded border border-slate-800 text-[11px] font-mono transition-colors cursor-pointer"
                title="Построить серию траекторий вдоль оси x = 0"
              >
                + Пучок x=0
              </button>
              <button
                type="button"
                onClick={() => handleAddBundleY0(0)}
                className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 rounded border border-slate-800 text-[11px] font-mono transition-colors cursor-pointer"
                title="Построить серию траекторий вдоль оси y = 0"
              >
                + Пучок y=0
              </button>

              {customPoints.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCustomPoints([])}
                  className="px-2 py-0.5 text-rose-400 hover:bg-rose-950/50 rounded border border-rose-900/60 text-[11px] flex items-center gap-1 transition-colors cursor-pointer ml-1"
                  title="Удалить все построенные траектории"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Очистить ({customPoints.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Points Badges List */}
          {customPoints.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap max-h-16 overflow-y-auto pt-1 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-500">Построенные траектории:</span>
              {customPoints.map((pt) => (
                <div
                  key={pt.id}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 border text-[11px] font-mono shadow-sm"
                  style={{ borderColor: pt.color + '60' }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: pt.color }}
                  />
                  <span className="text-slate-200">({pt.x}, {pt.y})</span>
                  <button
                    onClick={() => handleRemovePoint(pt.id)}
                    className="text-slate-500 hover:text-rose-400 p-0.5 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full min-h-[300px] rounded-xl overflow-hidden border border-slate-800 bg-[#090d16] shadow-inner cursor-crosshair group"
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverCoords(null)}
          className="w-full h-full block"
        />

        {/* Loading Overlay with Cancel Button */}
        {isSolving && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-20 flex items-center justify-center p-4">
            <SolvingSpinner
              engine={engine}
              currentRequestText={currentRequestText || 'Генерация поля направлений и фазового портрета...'}
              attempt={attempt}
              maxAttempts={maxAttempts}
              onCancel={onCancel}
            />
          </div>
        )}

        {/* Floating Interactive Help Pill */}
        <div className="absolute bottom-2.5 left-2.5 pointer-events-none bg-slate-950/85 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5 shadow">
          <MousePointerClick className="w-3.5 h-3.5 text-cyan-400" />
          <span>Кликните в любую точку поля для пуска интегральной линии (RK4)</span>
        </div>

        {/* Floating Legend */}
        <div className="absolute top-2.5 right-2.5 pointer-events-none bg-slate-950/85 backdrop-blur p-2.5 rounded-lg border border-slate-800 text-[10px] flex flex-col gap-1 text-slate-300 shadow">
          {solution?.plotConfig?.particularCurveJs && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-emerald-500 rounded-full" />
              <span>Частное решение (Коши)</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-indigo-500 rounded-full" />
            <span>Семейство кривых C</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-cyan-400 rounded-full" />
            <span>Поле касательных dy/dx</span>
          </div>
          {customPoints.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-rose-400 rounded-full" />
              <span>Линии начальных условий ({customPoints.length})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
