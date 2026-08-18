import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
  SkipBack,
  Layers,
  Sparkles,
  Download,
  Eye,
  EyeOff,
  Compass,
  Sliders,
  Flame,
  Activity,
  Box,
  Maximize2,
  Minimize2,
  RefreshCw,
  SunMedium,
  Grid,
  Move,
  Hand,
  Crosshair,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Focus,
} from 'lucide-react';
import { ODESolution, SolverEngine, Field3DConfig } from '../types';
import { SolvingSpinner } from './SolvingSpinner';

interface Interactive3DHeatmapGraphProps {
  solution: ODESolution | null;
  isSolving?: boolean;
  engine?: SolverEngine;
  currentRequestText?: string;
  attempt?: number;
  maxAttempts?: number;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  isExpanded?: boolean;
}

type ViewSubMode = 'heatmap' | 'surface3d' | 'phase3d' | 'split';
type ColorMapName = 'inferno' | 'turbo' | 'viridis' | 'plasma' | 'coolwarm' | 'cyberpunk';

const DEFAULT_3D_CONFIG: Field3DConfig = {
  scalarFieldJs:
    'const r2 = x*x + y*y + z*z; const tEff = Math.max(0.1, t); return (10 / Math.pow(tEff, 1.5)) * Math.exp(-r2 / (4 * 0.8 * tEff));',
  vectorField3DJs: {
    dx: '-0.5 * x / (t + 0.1)',
    dy: '-0.5 * y / (t + 0.1)',
    dz: '-0.5 * z / (t + 0.1)',
  },
  colorMap: 'inferno',
  xDomain: [-5, 5],
  yDomain: [-5, 5],
  zDomain: [-5, 5],
  tDomain: [0.1, 5],
  sliceZ: 0,
  timeDefault: 0.8,
  fieldType: 'scalar_heatmap',
  unitLabel: 'Температура / Потенциал u(x,y,z)',
};

// Color map lookups
function getColorMapRgb(val: number, map: ColorMapName): [number, number, number] {
  const t = Math.max(0, Math.min(1, val));

  if (map === 'inferno') {
    // 0: black -> purple -> orange -> yellow: 1
    if (t < 0.25) {
      const k = t / 0.25;
      return [Math.floor(10 + k * 70), Math.floor(5 + k * 10), Math.floor(30 + k * 80)];
    } else if (t < 0.5) {
      const k = (t - 0.25) / 0.25;
      return [Math.floor(80 + k * 120), Math.floor(15 + k * 35), Math.floor(110 - k * 30)];
    } else if (t < 0.75) {
      const k = (t - 0.5) / 0.25;
      return [Math.floor(200 + k * 50), Math.floor(50 + k * 110), Math.floor(80 - k * 60)];
    } else {
      const k = (t - 0.75) / 0.25;
      return [Math.floor(250 + k * 5), Math.floor(160 + k * 95), Math.floor(20 + k * 200)];
    }
  }

  if (map === 'turbo') {
    // rainbow spectral: blue -> cyan -> green -> yellow -> red
    const r = Math.sin(t * Math.PI - Math.PI / 2) * 0.5 + 0.5;
    const g = Math.sin(t * Math.PI) * 0.9;
    const b = Math.cos(t * Math.PI / 2);
    return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
  }

  if (map === 'coolwarm') {
    // blue -> white -> red
    if (t < 0.5) {
      const k = t / 0.5;
      return [Math.floor(60 + k * 180), Math.floor(90 + k * 150), Math.floor(240 + k * 15)];
    } else {
      const k = (t - 0.5) / 0.5;
      return [Math.floor(240 + k * 15), Math.floor(240 - k * 180), Math.floor(240 - k * 180)];
    }
  }

  if (map === 'plasma') {
    // blue -> violet -> orange -> yellow
    const r = Math.min(255, Math.floor(13 + t * (240 - 13) + Math.sin(t * Math.PI) * 50));
    const g = Math.min(255, Math.floor(8 + Math.pow(t, 2) * 230));
    const b = Math.min(255, Math.floor(135 + (1 - t) * 100 - t * 100));
    return [r, g, b];
  }

  if (map === 'cyberpunk') {
    // dark indigo -> neon pink -> cyan -> bright white
    if (t < 0.5) {
      const k = t / 0.5;
      return [Math.floor(20 + k * 220), Math.floor(10 + k * 20), Math.floor(80 + k * 140)];
    } else {
      const k = (t - 0.5) / 0.5;
      return [Math.floor(240 - k * 180), Math.floor(30 + k * 220), Math.floor(220 + k * 35)];
    }
  }

  // default viridis: dark purple -> blue -> teal -> yellow
  const r = Math.floor(Math.max(0, Math.min(255, 68 + t * (253 - 68) - Math.sin(t * Math.PI) * 40)));
  const g = Math.floor(Math.max(0, Math.min(255, 1 + t * (231 - 1))));
  const b = Math.floor(Math.max(0, Math.min(255, 84 + (1 - t) * (150 - 84))));
  return [r, g, b];
}

export const Interactive3DHeatmapGraph: React.FC<Interactive3DHeatmapGraphProps> = ({
  solution,
  isSolving = false,
  engine = 'cpu',
  currentRequestText,
  attempt = 1,
  maxAttempts = 3,
  onCancel,
  title,
  subtitle,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Mode Selection
  const [viewMode, setViewMode] = useState<ViewSubMode>('heatmap');
  const [colorMap, setColorMap] = useState<ColorMapName>('inferno');

  // Heatmap slice & animation parameters
  const [sliceZ, setSliceZ] = useState<number>(0);
  const [timeT, setTimeT] = useState<number>(0.8);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showContours, setShowContours] = useState<boolean>(true);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showProbe, setShowProbe] = useState<boolean>(true);
  const [probeData, setProbeData] = useState<{ x: number; y: number; z: number; val: number; gradX: number; gradY: number } | null>(null);

  // Playback speed multiplier (0.125x to 2x)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [customMaxT, setCustomMaxT] = useState<number | null>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Interaction tool mode
  const [interactionMode, setInteractionMode] = useState<'rotate' | 'pan' | 'probe'>('rotate');

  // Zoom & Pan state
  const [zoom2D, setZoom2D] = useState<number>(1);
  const [pan2DX, setPan2DX] = useState<number>(0);
  const [pan2DY, setPan2DY] = useState<number>(0);

  // 3D Orbit Camera controls & 3D Pan
  const [rotX, setRotX] = useState<number>(30); // elevation in degrees
  const [rotY, setRotY] = useState<number>(45); // azimuth in degrees
  const [zoom3D, setZoom3D] = useState<number>(1);
  const [pan3DX, setPan3DX] = useState<number>(0);
  const [pan3DY, setPan3DY] = useState<number>(0);

  const isDraggingRef = useRef<boolean>(false);
  const dragButtonRef = useRef<number>(0);
  const lastMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reset tool mode when viewMode changes
  useEffect(() => {
    if (viewMode === 'heatmap') {
      setInteractionMode('probe');
    } else {
      setInteractionMode('rotate');
    }
  }, [viewMode]);

  // Fullscreen handler
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  // Fullscreen change listener & ESC key
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
      if (e.key === 'f' || e.key === 'F') {
        // Toggle on F if not focused in an input
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
        toggleFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, toggleFullscreen]);

  // Zoom & Pan Handlers
  const handleZoomIn = () => {
    if (viewMode === 'heatmap') {
      setZoom2D((prev) => Math.min(10, +(prev * 1.25).toFixed(2)));
    } else {
      setZoom3D((prev) => Math.min(8, +(prev * 1.25).toFixed(2)));
    }
  };

  const handleZoomOut = () => {
    if (viewMode === 'heatmap') {
      setZoom2D((prev) => Math.max(0.2, +(prev / 1.25).toFixed(2)));
    } else {
      setZoom3D((prev) => Math.max(0.2, +(prev / 1.25).toFixed(2)));
    }
  };

  const handleResetZoom = () => {
    setZoom2D(1);
    setZoom3D(1);
    setPan2DX(0);
    setPan2DY(0);
    setPan3DX(0);
    setPan3DY(0);
  };

  const handleResetAll = () => {
    setZoom2D(1);
    setZoom3D(1);
    setPan2DX(0);
    setPan2DY(0);
    setPan3DX(0);
    setPan3DY(0);
    setRotX(30);
    setRotY(45);
    setSliceZ(0);
    setTimeT(fieldConfig.timeDefault ?? 0.8);
  };

  const handlePanStep = (direction: 'up' | 'down' | 'left' | 'right') => {
    const baseSpanX = (fieldConfig.xDomain?.[1] ?? 5) - (fieldConfig.xDomain?.[0] ?? -5);
    const baseSpanY = (fieldConfig.yDomain?.[1] ?? 5) - (fieldConfig.yDomain?.[0] ?? -5);
    const curSpanX = baseSpanX / zoom2D;
    const curSpanY = baseSpanY / zoom2D;

    if (viewMode === 'heatmap') {
      if (direction === 'up') setPan2DY((p) => p + curSpanY * 0.15);
      if (direction === 'down') setPan2DY((p) => p - curSpanY * 0.15);
      if (direction === 'left') setPan2DX((p) => p - curSpanX * 0.15);
      if (direction === 'right') setPan2DX((p) => p + curSpanX * 0.15);
    } else {
      if (direction === 'up') setPan3DY((p) => p - 30);
      if (direction === 'down') setPan3DY((p) => p + 30);
      if (direction === 'left') setPan3DX((p) => p - 30);
      if (direction === 'right') setPan3DX((p) => p + 30);
    }
  };

  // Memoized 3D config to prevent reference instability
  const fieldConfig: Field3DConfig = useMemo(() => {
    return solution?.field3DConfig || DEFAULT_3D_CONFIG;
  }, [solution?.field3DConfig]);

  // Track last solution to ONLY initialize on genuine solution change
  const lastSolutionRef = useRef<string>('');

  useEffect(() => {
    const currentKey = solution
      ? `${solution.equationNormalizedLatex || ''}__${solution.generalSolutionPlain || ''}`
      : 'default';

    if (lastSolutionRef.current !== currentKey) {
      lastSolutionRef.current = currentKey;
      if (fieldConfig.colorMap) {
        setColorMap(fieldConfig.colorMap);
      }
      if (fieldConfig.sliceZ !== undefined) {
        setSliceZ(fieldConfig.sliceZ);
      }
      if (fieldConfig.timeDefault !== undefined) {
        setTimeT(fieldConfig.timeDefault);
      }
      setIsPlaying(false);
    }
  }, [solution, fieldConfig]);

  // Compile evaluator functions safely when expression strings change
  const evalScalarRef = useRef<(x: number, y: number, z: number, t: number) => number>((x, y, z, t) => 0);
  const evalVectorRef = useRef<{
    dx: (x: number, y: number, z: number, t: number) => number;
    dy: (x: number, y: number, z: number, t: number) => number;
    dz: (x: number, y: number, z: number, t: number) => number;
  }>({
    dx: () => 0,
    dy: () => 0,
    dz: () => 0,
  });

  useEffect(() => {
    try {
      // Build safe scalar field function
      const body = fieldConfig.scalarFieldJs.includes('return')
        ? fieldConfig.scalarFieldJs
        : `return ${fieldConfig.scalarFieldJs};`;
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      evalScalarRef.current = new Function('x', 'y', 'z', 't', body) as any;
    } catch (err) {
      console.warn('Failed to compile 3D scalar field JS:', err);
      evalScalarRef.current = (x, y, z) => Math.exp(-0.2 * (x * x + y * y + z * z));
    }

    if (fieldConfig.vectorField3DJs) {
      try {
        const dxBody = fieldConfig.vectorField3DJs.dx.includes('return')
          ? fieldConfig.vectorField3DJs.dx
          : `return ${fieldConfig.vectorField3DJs.dx};`;
        const dyBody = fieldConfig.vectorField3DJs.dy.includes('return')
          ? fieldConfig.vectorField3DJs.dy
          : `return ${fieldConfig.vectorField3DJs.dy};`;
        const dzBody = fieldConfig.vectorField3DJs.dz.includes('return')
          ? fieldConfig.vectorField3DJs.dz
          : `return ${fieldConfig.vectorField3DJs.dz};`;

        evalVectorRef.current = {
          // eslint-disable-next-line @typescript-eslint/no-implied-eval
          dx: new Function('x', 'y', 'z', 't', dxBody) as any,
          // eslint-disable-next-line @typescript-eslint/no-implied-eval
          dy: new Function('x', 'y', 'z', 't', dyBody) as any,
          // eslint-disable-next-line @typescript-eslint/no-implied-eval
          dz: new Function('x', 'y', 'z', 't', dzBody) as any,
        };
      } catch (err) {
        console.warn('Failed to compile 3D vector field JS:', err);
      }
    }
  }, [fieldConfig.scalarFieldJs, fieldConfig.vectorField3DJs]);

  // Smooth Animation Loop for Time T
  const effectiveMinT = fieldConfig.tDomain ? fieldConfig.tDomain[0] : 0.1;
  const effectiveMaxT = customMaxT ?? (fieldConfig.tDomain ? fieldConfig.tDomain[1] : 5);

  useEffect(() => {
    if (!isPlaying) return;

    const minT = effectiveMinT;
    const maxT = effectiveMaxT;
    const tSpan = Math.max(0.1, maxT - minT);
    // Complete 1 loop in approx 8 seconds at 1x speed
    const step = (tSpan / 240) * playbackSpeed;

    const interval = setInterval(() => {
      setTimeT((prev) => {
        const next = prev + step;
        if (next >= maxT) {
          return minT;
        }
        return next;
      });
    }, 33);

    return () => clearInterval(interval);
  }, [isPlaying, effectiveMinT, effectiveMaxT, playbackSpeed]);

  // Main Render Routine on Canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width;
    const height = rect.height;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#060b13';
    ctx.fillRect(0, 0, width, height);

    // Base coordinate domains
    const baseSpanX = (fieldConfig.xDomain?.[1] ?? 5) - (fieldConfig.xDomain?.[0] ?? -5);
    const baseSpanY = (fieldConfig.yDomain?.[1] ?? 5) - (fieldConfig.yDomain?.[0] ?? -5);
    const baseMidX = ((fieldConfig.xDomain?.[0] ?? -5) + (fieldConfig.xDomain?.[1] ?? 5)) / 2;
    const baseMidY = ((fieldConfig.yDomain?.[0] ?? -5) + (fieldConfig.yDomain?.[1] ?? 5)) / 2;

    const curMidX = baseMidX + pan2DX;
    const curMidY = baseMidY + pan2DY;
    const curSpanX = baseSpanX / zoom2D;
    const curSpanY = baseSpanY / zoom2D;

    const xDom: [number, number] = [curMidX - curSpanX / 2, curMidX + curSpanX / 2];
    const yDom: [number, number] = [curMidY - curSpanY / 2, curMidY + curSpanY / 2];
    const zDom: [number, number] = fieldConfig.zDomain || [-5, 5];

    if (viewMode === 'heatmap') {
      // -------------------------------------------------------------
      // 1. 2D/3D SLICE HEATMAP RENDERER (Fast Grid Sampling & ImageData)
      // -------------------------------------------------------------
      const padLeft = 60;
      const padBottom = 45;
      const padTop = 35;
      const padRight = 105; // room for colorbar

      const plotW = width - padLeft - padRight;
      const plotH = height - padTop - padBottom;

      if (plotW <= 10 || plotH <= 10) {
        ctx.restore();
        return;
      }

      // Sample grid resolution
      const gridResX = 90;
      const gridResY = 90;
      const cellW = plotW / gridResX;
      const cellH = plotH / gridResY;

      // Sample field and find dynamic min / max
      const fieldGrid: number[][] = [];
      let minVal = Infinity;
      let maxVal = -Infinity;

      for (let j = 0; j < gridResY; j++) {
        fieldGrid[j] = [];
        const yVal = yDom[1] - (j / (gridResY - 1)) * (yDom[1] - yDom[0]);
        for (let i = 0; i < gridResX; i++) {
          const xVal = xDom[0] + (i / (gridResX - 1)) * (xDom[1] - xDom[0]);
          let v = 0;
          try {
            v = evalScalarRef.current(xVal, yVal, sliceZ, timeT);
          } catch {
            v = 0;
          }
          if (isNaN(v) || !isFinite(v)) v = 0;
          fieldGrid[j][i] = v;
          if (v < minVal) minVal = v;
          if (v > maxVal) maxVal = v;
        }
      }

      if (maxVal === minVal) {
        maxVal = minVal + 1;
      }

      // Draw Heatmap Cells
      for (let j = 0; j < gridResY; j++) {
        for (let i = 0; i < gridResX; i++) {
          const val = fieldGrid[j][i];
          const norm = (val - minVal) / (maxVal - minVal);
          const [r, g, b] = getColorMapRgb(norm, colorMap);

          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(padLeft + i * cellW, padTop + j * cellH, cellW + 0.6, cellH + 0.6);
        }
      }

      // Optional Contour Lines (Isotherms / Equipotentials)
      if (showContours) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = 1;
        const numLevels = 8;
        for (let l = 1; l < numLevels; l++) {
          const levelVal = minVal + (l / numLevels) * (maxVal - minVal);
          // Marching squares approximation:
          for (let j = 0; j < gridResY - 1; j += 2) {
            for (let i = 0; i < gridResX - 1; i += 2) {
              const v0 = fieldGrid[j][i];
              const v1 = fieldGrid[j][i + 1];
              const v2 = fieldGrid[j + 1][i];
              if ((v0 - levelVal) * (v1 - levelVal) < 0 || (v0 - levelVal) * (v2 - levelVal) < 0) {
                const px = padLeft + (i + 0.5) * cellW;
                const py = padTop + (j + 0.5) * cellH;
                ctx.beginPath();
                ctx.arc(px, py, 1.2, 0, Math.PI * 2);
                ctx.stroke();
              }
            }
          }
        }
      }

      // Optional Vector Flow / Gradient Arrows
      if (showVectors) {
        const stepX = Math.floor(gridResX / 14);
        const stepY = Math.floor(gridResY / 14);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.2;

        for (let j = 4; j < gridResY; j += stepY) {
          const yVal = yDom[1] - (j / (gridResY - 1)) * (yDom[1] - yDom[0]);
          for (let i = 4; i < gridResX; i += stepX) {
            const xVal = xDom[0] + (i / (gridResX - 1)) * (xDom[1] - xDom[0]);
            let vx = 0;
            let vy = 0;
            if (evalVectorRef.current.dx) {
              try {
                vx = evalVectorRef.current.dx(xVal, yVal, sliceZ, timeT);
                vy = evalVectorRef.current.dy(xVal, yVal, sliceZ, timeT);
              } catch {
                vx = 0;
                vy = 0;
              }
            } else {
              // Numerical gradient of scalar field
              const eps = 0.05;
              vx = -(evalScalarRef.current(xVal + eps, yVal, sliceZ, timeT) - evalScalarRef.current(xVal - eps, yVal, sliceZ, timeT)) / (2 * eps);
              vy = -(evalScalarRef.current(xVal, yVal + eps, sliceZ, timeT) - evalScalarRef.current(xVal, yVal - eps, sliceZ, timeT)) / (2 * eps);
            }

            const mag = Math.sqrt(vx * vx + vy * vy);
            if (mag > 0.001) {
              const maxArrowLen = 14;
              const len = Math.min(maxArrowLen, Math.max(5, mag * 6));
              const angle = Math.atan2(-vy, vx);
              const cx = padLeft + (i + 0.5) * cellW;
              const cy = padTop + (j + 0.5) * cellH;

              const ex = cx + Math.cos(angle) * len;
              const ey = cy + Math.sin(angle) * len;

              ctx.beginPath();
              ctx.moveTo(cx, cy);
              ctx.lineTo(ex, ey);
              ctx.stroke();

              // Arrowhead
              const headLen = 4;
              ctx.beginPath();
              ctx.moveTo(ex, ey);
              ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
              ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
              ctx.closePath();
              ctx.fill();
            }
          }
        }
      }

      // Draw Axes, Borders & Ticks
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(padLeft, padTop, plotW, plotH);

      // X-Ticks
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      for (let step = 0; step <= 6; step++) {
        const frac = step / 6;
        const xPos = padLeft + frac * plotW;
        const xVal = xDom[0] + frac * (xDom[1] - xDom[0]);
        ctx.beginPath();
        ctx.moveTo(xPos, padTop + plotH);
        ctx.lineTo(xPos, padTop + plotH + 5);
        ctx.stroke();
        ctx.fillText(xVal.toFixed(1), xPos, padTop + plotH + 18);
      }
      ctx.fillText('X координата [пространство]', padLeft + plotW / 2, padTop + plotH + 34);

      // Y-Ticks
      ctx.textAlign = 'right';
      for (let step = 0; step <= 6; step++) {
        const frac = step / 6;
        const yPos = padTop + frac * plotH;
        const yVal = yDom[1] - frac * (yDom[1] - yDom[0]);
        ctx.beginPath();
        ctx.moveTo(padLeft - 5, yPos);
        ctx.lineTo(padLeft, yPos);
        ctx.stroke();
        ctx.fillText(yVal.toFixed(1), padLeft - 8, yPos + 4);
      }

      // Colorbar on right
      const barX = width - padRight + 20;
      const barY = padTop;
      const barW = 16;
      const barH = plotH;

      for (let p = 0; p < barH; p++) {
        const norm = 1 - p / barH;
        const [r, g, b] = getColorMapRgb(norm, colorMap);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(barX, barY + p, barW, 1.2);
      }
      ctx.strokeStyle = '#475569';
      ctx.strokeRect(barX, barY, barW, barH);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px font-mono, monospace';
      ctx.fillText(maxVal.toFixed(2), barX + barW + 6, barY + 10);
      ctx.fillText(((maxVal + minVal) / 2).toFixed(2), barX + barW + 6, barY + barH / 2 + 4);
      ctx.fillText(minVal.toFixed(2), barX + barW + 6, barY + barH);

      // Top info label
      ctx.fillStyle = '#38bdf8';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        `Срез Z = ${sliceZ.toFixed(2)} | t = ${timeT.toFixed(2)} с | Масштаб ${(zoom2D * 100).toFixed(0)}% | ${fieldConfig.unitLabel || 'u(x,y,z)'}`,
        padLeft,
        padTop - 12
      );
    } else {
      // -------------------------------------------------------------
      // 2. 3D ORBIT SURFACE / 3D PHASE TRAJECTORIES (Isometric Projection)
      // -------------------------------------------------------------
      const cx = width / 2 + pan3DX;
      const cy = height / 2 + 20 + pan3DY;

      const radX = (rotX * Math.PI) / 180;
      const radY = (rotY * Math.PI) / 180;

      const cosX = Math.cos(radX);
      const sinX = Math.sin(radX);
      const cosY = Math.cos(radY);
      const sinY = Math.sin(radY);

      const scale = Math.min(width, height) * 0.055 * zoom3D;

      const project3D = (x: number, y: number, z: number): [number, number] => {
        // Rotate around Y (Azimuth)
        const x1 = x * cosY - y * sinY;
        const y1 = x * sinY + y * cosY;
        const z1 = z;

        // Rotate around X (Elevation)
        const x2 = x1;
        const y2 = y1 * cosX - z1 * sinX;
        const z2 = y1 * sinX + z1 * cosX;

        return [cx + x2 * scale, cy - z2 * scale];
      };

      // Draw 3D Bounding Box & Axes
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
      ctx.lineWidth = 1;

      const xMin = xDom[0], xMax = xDom[1];
      const yMin = yDom[0], yMax = yDom[1];
      const zMin = zDom[0], zMax = zDom[1];

      // Draw floor grid
      const gridN = 8;
      for (let i = 0; i <= gridN; i++) {
        const gx = xMin + (i / gridN) * (xMax - xMin);
        const [p1x, p1y] = project3D(gx, yMin, zMin);
        const [p2x, p2y] = project3D(gx, yMax, zMin);
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.stroke();

        const gy = yMin + (i / gridN) * (yMax - yMin);
        const [p3x, p3y] = project3D(xMin, gy, zMin);
        const [p4x, p4y] = project3D(xMax, gy, zMin);
        ctx.beginPath();
        ctx.moveTo(p3x, p3y);
        ctx.lineTo(p4x, p4y);
        ctx.stroke();
      }

      // Draw 3D Coordinates Axes (X = Red, Y = Green, Z = Blue)
      const [oX, oY] = project3D(0, 0, 0);
      const [axX, axY] = project3D(xMax * 0.8, 0, 0);
      const [ayX, ayY] = project3D(0, yMax * 0.8, 0);
      const [azX, azY] = project3D(0, 0, zMax * 0.8);

      ctx.lineWidth = 2;
      // X Axis
      ctx.strokeStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(oX, oY);
      ctx.lineTo(axX, axY);
      ctx.stroke();

      // Y Axis
      ctx.strokeStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(oX, oY);
      ctx.lineTo(ayX, ayY);
      ctx.stroke();

      // Z Axis
      ctx.strokeStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(oX, oY);
      ctx.lineTo(azX, azY);
      ctx.stroke();

      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#ef4444';
      ctx.fillText('+X', axX + 5, axY);
      ctx.fillStyle = '#22c55e';
      ctx.fillText('+Y', ayX + 5, ayY);
      ctx.fillStyle = '#3b82f6';
      ctx.fillText('+Z', azX + 5, azY);

      if (viewMode === 'phase3d' && fieldConfig.vectorField3DJs) {
        // -------------------------------------------------------------
        // Draw 3D Phase Space / Orbital Trajectory (Lorenz, Rossler, Kepler Gravity, etc.)
        // RK4 Integration in 3D
        // -------------------------------------------------------------
        const isKeplerGravity =
          fieldConfig.unitLabel?.includes('Гравитац') ||
          fieldConfig.unitLabel?.includes('Кеплер');

        if (isKeplerGravity) {
          // 3D Orbital dynamic integration for Kepler Two-Body Problem
          const dt = 0.02;
          const steps = 1200;
          let rx = 3.0;
          let ry = 0.0;
          let rz = 0.5;
          let vx = 0.0;
          let vy = 1.9;
          let vz = 0.3;
          const GM = 12.0;

          const orbitPts: [number, number, number][] = [];

          for (let s = 0; s < steps; s++) {
            orbitPts.push([rx, ry, rz]);

            const accel = (x: number, y: number, z: number) => {
              const dist3 = Math.pow(x * x + y * y + z * z + 0.1, 1.5);
              return [(-GM * x) / dist3, (-GM * y) / dist3, (-GM * z) / dist3];
            };

            // RK4 for (r, v)
            const [a1x, a1y, a1z] = accel(rx, ry, rz);
            const [a2x, a2y, a2z] = accel(rx + 0.5 * dt * vx, ry + 0.5 * dt * vy, rz + 0.5 * dt * vz);
            const [a3x, a3y, a3z] = accel(rx + 0.5 * dt * (vx + 0.5 * dt * a1x), ry + 0.5 * dt * (vy + 0.5 * dt * a1y), rz + 0.5 * dt * (vz + 0.5 * dt * a1z));
            const [a4x, a4y, a4z] = accel(rx + dt * (vx + dt * a2x), ry + dt * (vy + dt * a2y), rz + dt * (vz + dt * a2z));

            rx += dt * vx + (dt * dt / 6) * (a1x + a2x + a3x);
            ry += dt * vy + (dt * dt / 6) * (a1y + a2y + a3y);
            rz += dt * vz + (dt * dt / 6) * (a1z + a2z + a3z);

            vx += (dt / 6) * (a1x + 2 * a2x + 2 * a3x + a4x);
            vy += (dt / 6) * (a1y + 2 * a2y + 2 * a3y + a4y);
            vz += (dt / 6) * (a1z + 2 * a2z + 2 * a3z + a4z);
          }

          // Draw Central Attractor Mass (Sun)
          const [sunX, sunY] = project3D(0, 0, 0);
          const sunGrad = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 14);
          sunGrad.addColorStop(0, '#fef08a');
          sunGrad.addColorStop(0.5, '#f59e0b');
          sunGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
          ctx.fillStyle = sunGrad;
          ctx.beginPath();
          ctx.arc(sunX, sunY, 14, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(sunX, sunY, 5, 0, Math.PI * 2);
          ctx.fill();

          // Render Orbital Ellipse
          ctx.lineWidth = 2.2;
          for (let k = 0; k < orbitPts.length - 1; k++) {
            const norm = (k % 300) / 300;
            const [r, g, b] = getColorMapRgb(norm, colorMap);
            ctx.strokeStyle = `rgb(${r},${g},${b})`;

            const [sx1, sy1] = project3D(orbitPts[k][0], orbitPts[k][1], orbitPts[k][2]);
            const [sx2, sy2] = project3D(orbitPts[k + 1][0], orbitPts[k + 1][1], orbitPts[k + 1][2]);

            ctx.beginPath();
            ctx.moveTo(sx1, sy1);
            ctx.lineTo(sx2, sy2);
            ctx.stroke();
          }

          // Current Planet Position based on timeT
          const planetIdx = Math.floor((timeT * 60) % orbitPts.length);
          const currPt = orbitPts[planetIdx] || orbitPts[0];
          const [plX, plY] = project3D(currPt[0], currPt[1], currPt[2]);

          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(plX, plY, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          // Standard 3D vector field RK4 integration (Lorenz, Rossler, etc.)
          const dt = 0.01;
          const steps = 3200;
          let px = fieldConfig.xDomain ? (fieldConfig.xDomain[0] + fieldConfig.xDomain[1]) / 2 + 1 : 1;
          let py = fieldConfig.yDomain ? (fieldConfig.yDomain[0] + fieldConfig.yDomain[1]) / 2 + 1 : 1;
          let pz = fieldConfig.zDomain ? (fieldConfig.zDomain[0] + fieldConfig.zDomain[1]) / 2 + 1 : 20;

          if (fieldConfig.unitLabel?.includes('Рёсслер') || fieldConfig.unitLabel?.includes('Rossler')) {
            px = 0.1;
            py = 0.0;
            pz = 0.0;
          }

          const pts: [number, number, number][] = [];

          for (let s = 0; s < steps; s++) {
            pts.push([px, py, pz]);

            const f = (x: number, y: number, z: number) => {
              return [
                evalVectorRef.current.dx(x, y, z, timeT),
                evalVectorRef.current.dy(x, y, z, timeT),
                evalVectorRef.current.dz(x, y, z, timeT),
              ];
            };

            const [k1x, k1y, k1z] = f(px, py, pz);
            const [k2x, k2y, k2z] = f(px + 0.5 * dt * k1x, py + 0.5 * dt * k1y, pz + 0.5 * dt * k1z);
            const [k3x, k3y, k3z] = f(px + 0.5 * dt * k2x, py + 0.5 * dt * k2y, pz + 0.5 * dt * k2z);
            const [k4x, k4y, k4z] = f(px + dt * k3x, py + dt * k3y, pz + dt * k3z);

            px += (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
            py += (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
            pz += (dt / 6) * (k1z + 2 * k2z + 2 * k3z + k4z);
          }

          // Render 3D ribbon trajectory
          ctx.lineWidth = 1.6;
          for (let k = 0; k < pts.length - 1; k++) {
            const norm = k / pts.length;
            const [r, g, b] = getColorMapRgb(norm, colorMap);
            ctx.strokeStyle = `rgb(${r},${g},${b})`;

            const [sx1, sy1] = project3D(pts[k][0], pts[k][1], pts[k][2]);
            const [sx2, sy2] = project3D(pts[k + 1][0], pts[k + 1][1], pts[k + 1][2]);

            ctx.beginPath();
            ctx.moveTo(sx1, sy1);
            ctx.lineTo(sx2, sy2);
            ctx.stroke();
          }
        }
      } else {
        // -------------------------------------------------------------
        // Draw 3D Surface Mesh u(x,y)
        // -------------------------------------------------------------
        const sRes = 28;
        for (let j = 0; j < sRes; j++) {
          const y1 = yMin + (j / sRes) * (yMax - yMin);
          const y2 = yMin + ((j + 1) / sRes) * (yMax - yMin);

          for (let i = 0; i < sRes; i++) {
            const x1 = xMin + (i / sRes) * (xMax - xMin);
            const x2 = xMin + ((i + 1) / sRes) * (xMax - xMin);

            const z11 = evalScalarRef.current(x1, y1, sliceZ, timeT);
            const z12 = evalScalarRef.current(x1, y2, sliceZ, timeT);
            const z21 = evalScalarRef.current(x2, y1, sliceZ, timeT);
            const z22 = evalScalarRef.current(x2, y2, sliceZ, timeT);

            const [p11x, p11y] = project3D(x1, y1, z11);
            const [p12x, p12y] = project3D(x1, y2, z12);
            const [p22x, p22y] = project3D(x2, y2, z22);
            const [p21x, p21y] = project3D(x2, y1, z21);

            const avgZ = (z11 + z12 + z21 + z22) / 4;
            const norm = Math.max(0, Math.min(1, (avgZ - zMin) / (zMax - zMin || 1)));
            const [r, g, b] = getColorMapRgb(norm, colorMap);

            ctx.fillStyle = `rgba(${r},${g},${b}, 0.85)`;
            ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
            ctx.lineWidth = 0.5;

            ctx.beginPath();
            ctx.moveTo(p11x, p11y);
            ctx.lineTo(p12x, p12y);
            ctx.lineTo(p22x, p22y);
            ctx.lineTo(p21x, p21y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        }
      }

      // 3D Controls hint
      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        `3D Ракурс: RotX ${rotX.toFixed(0)}° RotY ${rotY.toFixed(0)}° | Масштаб ${(zoom3D * 100).toFixed(0)}% | ЛКМ - Вращение/Сдвиг, Колесико - Зум`,
        20,
        height - 16
      );
    }

    ctx.restore();
  }, [
    viewMode,
    colorMap,
    sliceZ,
    timeT,
    showContours,
    showVectors,
    rotX,
    rotY,
    zoom3D,
    pan3DX,
    pan3DY,
    zoom2D,
    pan2DX,
    pan2DY,
    fieldConfig,
  ]);

  // Redraw on dependencies
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Window Resize
  useEffect(() => {
    const handleResize = () => renderCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderCanvas]);

  // Mouse Interaction for 3D Camera Rotation, Pan, and Heatmap Probe
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragButtonRef.current = e.button;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const isShift = e.shiftKey;
    const isPanMode = interactionMode === 'pan' || isShift || dragButtonRef.current === 1 || dragButtonRef.current === 2;

    if (isDraggingRef.current) {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;

      if (viewMode === 'heatmap') {
        if (isPanMode) {
          const rect = canvasRef.current?.getBoundingClientRect();
          const plotW = (rect?.width || 600) - 165;
          const plotH = (rect?.height || 400) - 80;
          const baseSpanX = (fieldConfig.xDomain?.[1] ?? 5) - (fieldConfig.xDomain?.[0] ?? -5);
          const baseSpanY = (fieldConfig.yDomain?.[1] ?? 5) - (fieldConfig.yDomain?.[0] ?? -5);
          const curSpanX = baseSpanX / zoom2D;
          const curSpanY = baseSpanY / zoom2D;

          setPan2DX((prev) => prev - (dx / Math.max(10, plotW)) * curSpanX);
          setPan2DY((prev) => prev + (dy / Math.max(10, plotH)) * curSpanY);
        }
      } else {
        if (isPanMode) {
          setPan3DX((prev) => prev + dx);
          setPan3DY((prev) => prev + dy);
        } else {
          setRotY((prev) => prev + dx * 0.5);
          setRotX((prev) => Math.max(-85, Math.min(85, prev + dy * 0.5)));
        }
      }
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }

    // Heatmap Probe Calculation
    if (viewMode === 'heatmap' && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const padLeft = 60;
      const padBottom = 45;
      const padTop = 35;
      const padRight = 105;
      const plotW = rect.width - padLeft - padRight;
      const plotH = rect.height - padTop - padBottom;

      if (mx >= padLeft && mx <= padLeft + plotW && my >= padTop && my <= padTop + plotH) {
        const baseSpanX = (fieldConfig.xDomain?.[1] ?? 5) - (fieldConfig.xDomain?.[0] ?? -5);
        const baseSpanY = (fieldConfig.yDomain?.[1] ?? 5) - (fieldConfig.yDomain?.[0] ?? -5);
        const baseMidX = ((fieldConfig.xDomain?.[0] ?? -5) + (fieldConfig.xDomain?.[1] ?? 5)) / 2;
        const baseMidY = ((fieldConfig.yDomain?.[0] ?? -5) + (fieldConfig.yDomain?.[1] ?? 5)) / 2;

        const curMidX = baseMidX + pan2DX;
        const curMidY = baseMidY + pan2DY;
        const curSpanX = baseSpanX / zoom2D;
        const curSpanY = baseSpanY / zoom2D;

        const xDom: [number, number] = [curMidX - curSpanX / 2, curMidX + curSpanX / 2];
        const yDom: [number, number] = [curMidY - curSpanY / 2, curMidY + curSpanY / 2];

        const fracX = (mx - padLeft) / plotW;
        const fracY = (my - padTop) / plotH;
        const px = xDom[0] + fracX * (xDom[1] - xDom[0]);
        const py = yDom[1] - fracY * (yDom[1] - yDom[0]);

        try {
          const val = evalScalarRef.current(px, py, sliceZ, timeT);
          const eps = 0.05;
          const gx = (evalScalarRef.current(px + eps, py, sliceZ, timeT) - evalScalarRef.current(px - eps, py, sliceZ, timeT)) / (2 * eps);
          const gy = (evalScalarRef.current(px, py + eps, sliceZ, timeT) - evalScalarRef.current(px, py - eps, sliceZ, timeT)) / (2 * eps);
          setProbeData({ x: px, y: py, z: sliceZ, val, gradX: gx, gradY: gy });
        } catch {
          setProbeData(null);
        }
      } else {
        setProbeData(null);
      }
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1.15 : 0.87;
      if (viewMode === 'heatmap') {
        setZoom2D((prev) => Math.max(0.2, Math.min(10, +(prev * delta).toFixed(2))));
      } else {
        setZoom3D((prev) => Math.max(0.2, Math.min(8, +(prev * delta).toFixed(2))));
      }
    }
  };

  const handleDownloadImage = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `3d_ode_heatmap_${Date.now()}.png`;
    a.click();
  };

  const activeZoom = viewMode === 'heatmap' ? zoom2D : zoom3D;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-slate-950 text-slate-200 overflow-hidden shadow-2xl transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen rounded-none border-0 m-0'
          : 'h-full w-full rounded-2xl border border-slate-800 relative'
      }`}
    >
      {/* 3D Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/80 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
              <span>{title || '3D Тепловая Карта и Фазовое Пространство'}</span>
              <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-mono text-[10px] border border-orange-500/30">
                3D PDE
              </span>
              {isFullscreen && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] border border-emerald-500/30 font-semibold">
                  FULLSCREEN (Esc для выхода)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {subtitle || 'Интерактивный срез распределения u(x,y,z,t) и градиентов поля'}
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('heatmap')}
            className={`px-2.5 py-1 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'heatmap'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Тепловая Карта</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('surface3d')}
            className={`px-2.5 py-1 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'surface3d'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Поверхность</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('phase3d')}
            className={`px-2.5 py-1 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'phase3d'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>3D Фазовый Аттрактор</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* ColorMap Picker */}
          <select
            value={colorMap}
            onChange={(e) => setColorMap(e.target.value as ColorMapName)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="inferno">🔥 Inferno (Тепло/Пламя)</option>
            <option value="turbo">🌈 Turbo (Спектральная)</option>
            <option value="viridis">🌿 Viridis (Физическая)</option>
            <option value="plasma">⚡ Plasma (Плазма)</option>
            <option value="coolwarm">❄️🔥 Coolwarm (Холод/Тепло)</option>
            <option value="cyberpunk">🌌 Cyberpunk (Неон)</option>
          </select>

          {/* Reset View & Camera */}
          <button
            type="button"
            onClick={handleResetAll}
            title="Сбросить масштабирование, положение и камеру"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Download PNG */}
          <button
            type="button"
            onClick={handleDownloadImage}
            title="Скачать снимок PNG"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Выйти из полноэкранного режима (Esc)' : 'Развернуть на весь экран (F)'}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
              isFullscreen
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="text-[11px] hidden sm:inline">{isFullscreen ? 'Свернуть' : 'Во весь экран'}</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Stage */}
      <div className="relative flex-1 min-h-[380px] w-full bg-slate-950 overflow-hidden select-none">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className={`w-full h-full block ${
            interactionMode === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
          }`}
        />

        {/* Solving Overlay */}
        {isSolving && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-20">
            <SolvingSpinner
              engine={engine}
              attempt={attempt}
              maxAttempts={maxAttempts}
              currentRequestText={currentRequestText}
              onCancel={onCancel}
            />
          </div>
        )}

        {/* Real-time Interactive Probe Panel */}
        {probeData && (
          <div className="absolute top-3 left-3 bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 rounded-xl px-3 py-2 text-[11px] text-slate-200 shadow-2xl font-mono pointer-events-none flex flex-col gap-1 z-10">
            <div className="text-cyan-400 font-semibold flex items-center gap-1">
              <SunMedium className="w-3.5 h-3.5 text-cyan-400" />
              <span>Зонд поля (Probe)</span>
            </div>
            <div>
              Координаты: <span className="text-slate-100">({probeData.x.toFixed(2)}, {probeData.y.toFixed(2)}, {probeData.z.toFixed(2)})</span>
            </div>
            <div>
              Значение u: <span className="text-amber-400 font-bold">{probeData.val.toFixed(4)}</span>
            </div>
            <div>
              Градиент ∇u: <span className="text-emerald-400">({probeData.gradX.toFixed(3)}, {probeData.gradY.toFixed(3)})</span>
            </div>
          </div>
        )}

        {/* Floating Navigation & Scaling HUD Overlay (Top-Right / Bottom-Right) */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10 items-end pointer-events-auto">
          {/* Main Controls Card */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800/90 rounded-2xl p-2 shadow-2xl flex flex-col gap-2.5 text-xs">
            {/* Tool Mode Selector */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-xl border border-slate-800">
              {viewMode === 'heatmap' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setInteractionMode('probe')}
                    className={`px-2 py-1 rounded-lg flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
                      interactionMode === 'probe'
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Режим исследования значений и градиентов (Зонд)"
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>Зонд</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInteractionMode('pan')}
                    className={`px-2 py-1 rounded-lg flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
                      interactionMode === 'pan'
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Режим перемещения и панорамирования (Сдвиг)"
                  >
                    <Hand className="w-3 h-3" />
                    <span>Сдвиг</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setInteractionMode('rotate')}
                    className={`px-2 py-1 rounded-lg flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
                      interactionMode === 'rotate'
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Режим вращения камеры в 3D пространстве"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Вращение</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInteractionMode('pan')}
                    className={`px-2 py-1 rounded-lg flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
                      interactionMode === 'pan'
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Режим параллельного переноса (Сдвиг)"
                  >
                    <Hand className="w-3 h-3" />
                    <span>Сдвиг</span>
                  </button>
                </>
              )}
            </div>

            {/* Zoom Controls & Readout */}
            <div className="flex items-center justify-between gap-1.5 bg-slate-950/70 px-1.5 py-1 rounded-xl border border-slate-800/80">
              <button
                type="button"
                onClick={handleZoomOut}
                title="Уменьшить масштаб (Zoom Out)"
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                title="Сбросить масштаб на 100%"
                className="px-2 py-0.5 rounded font-mono font-bold text-[11px] text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {(activeZoom * 100).toFixed(0)}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                title="Увеличить масштаб (Zoom In)"
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Directional Navigation Pad (D-Pad) */}
            <div className="flex flex-col items-center gap-1 pt-1 border-t border-slate-800/60">
              <span className="text-[10px] text-slate-400 font-mono">Навигация / Сдвиг</span>
              <div className="grid grid-cols-3 gap-1 w-24">
                <div />
                <button
                  type="button"
                  onClick={() => handlePanStep('up')}
                  title="Сдвиг вверх"
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <div />

                <button
                  type="button"
                  onClick={() => handlePanStep('left')}
                  title="Сдвиг влево"
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="Центрировать вид"
                  className="p-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Focus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handlePanStep('right')}
                  title="Сдвиг вправо"
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <ArrowRight className="w-3 h-3" />
                </button>

                <div />
                <button
                  type="button"
                  onClick={() => handlePanStep('down')}
                  title="Сдвиг вниз"
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
                <div />
              </div>
            </div>

            {/* Quick Fullscreen button on HUD */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-full py-1 px-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-[11px] font-medium mt-0.5"
            >
              {isFullscreen ? <Minimize2 className="w-3 h-3 text-cyan-400" /> : <Maximize2 className="w-3 h-3 text-cyan-400" />}
              <span>{isFullscreen ? 'Свернуть' : 'Полный экран'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Physics Parameters & Interactive Sliders */}
      <div className="flex flex-col gap-2.5 px-4 py-3 bg-slate-900/95 border-t border-slate-800/90 text-xs shrink-0">
        {/* Row 1: Time Dynamics Controls (Full width, clearly structured) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
          {/* Playback Controls & Speed */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium cursor-pointer shadow-sm ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold'
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold'
              }`}
              title={isPlaying ? 'Остановить анимацию' : 'Запустить динамику по времени'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Пауза' : 'Пуск'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const minT = fieldConfig.tDomain ? fieldConfig.tDomain[0] : 0.1;
                setTimeT(minT);
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="Сбросить время в начальное положение t0"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            {/* Playback speed selector */}
            <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5 ml-1">
              {[
                { val: 0.125, label: '0.125x' },
                { val: 0.25, label: '0.25x' },
                { val: 0.5, label: '0.5x' },
                { val: 1, label: '1x' },
                { val: 2, label: '2x' },
              ].map((spd) => (
                <button
                  key={spd.val}
                  type="button"
                  onClick={() => setPlaybackSpeed(spd.val)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                    playbackSpeed === spd.val
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={`Скорость воспроизведения ${spd.label}`}
                >
                  {spd.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Slider & Readout */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <span className="text-slate-400 font-mono font-semibold shrink-0">Время t:</span>
            <input
              type="range"
              min={effectiveMinT}
              max={effectiveMaxT}
              step={(effectiveMaxT - effectiveMinT) / 250}
              value={timeT}
              onChange={(e) => setTimeT(parseFloat(e.target.value))}
              className="flex-1 accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <span className="font-mono text-emerald-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-emerald-500/30 text-center min-w-[64px] shrink-0">
              {timeT.toFixed(2)} с
            </span>
          </div>

          {/* Max Time t_max Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 shrink-0">
            <span className="text-[11px] text-slate-400">Предел max:</span>
            <select
              value={effectiveMaxT}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setCustomMaxT(val);
              }}
              className="bg-slate-950 text-emerald-300 text-xs font-mono font-semibold px-2 py-0.5 rounded border border-emerald-500/40 focus:outline-none cursor-pointer"
              title="Выбрать максимальный интервал времени моделирования"
            >
              <option value="5">5 с</option>
              <option value="10">10 с</option>
              <option value="30">30 с</option>
              <option value="60">60 с</option>
              <option value="120">120 с</option>
              <option value="300">300 с</option>
            </select>
          </div>
        </div>

        {/* Row 2: Slice Z & Display Overlays */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          {/* Slice Z Slider */}
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <span className="text-slate-400 font-mono shrink-0">Срез по оси Z:</span>
            <input
              type="range"
              min={fieldConfig.zDomain ? fieldConfig.zDomain[0] : -5}
              max={fieldConfig.zDomain ? fieldConfig.zDomain[1] : 5}
              step="0.1"
              value={sliceZ}
              onChange={(e) => setSliceZ(parseFloat(e.target.value))}
              className="flex-1 accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <span className="font-mono text-cyan-300 font-bold bg-slate-950 px-2 py-0.5 rounded border border-cyan-500/30 w-14 text-center shrink-0">
              {sliceZ.toFixed(1)}
            </span>
          </div>

          {/* Heatmap Overlay Toggles */}
          <div className="flex items-center gap-3 shrink-0 bg-slate-950/70 px-3 py-1 rounded-xl border border-slate-800">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none">
              <input
                type="checkbox"
                checked={showContours}
                onChange={(e) => setShowContours(e.target.checked)}
                className="rounded accent-cyan-500 cursor-pointer"
              />
              <span>Изолинии</span>
            </label>

            <div className="w-[1px] h-3.5 bg-slate-800" />

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none">
              <input
                type="checkbox"
                checked={showVectors}
                onChange={(e) => setShowVectors(e.target.checked)}
                className="rounded accent-cyan-500 cursor-pointer"
              />
              <span>Векторы</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

