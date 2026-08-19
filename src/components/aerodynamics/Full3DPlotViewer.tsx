import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  RotateCcw,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Layers,
  Sparkles,
  Zap,
  Sliders,
  SunMedium,
  Grid,
  Move,
  Compass,
  Activity,
  Download,
  Info,
} from 'lucide-react';
import { MathView, MathText } from '../MathView';
import { HandbookTopicId } from '../EngineeringHandbookModal';

export interface Aerodynamic3DData {
  mach: number;
  alpha: number;
  liftCoeff: number;
  dragCoeff: number;
  momentCoeff: number;
  cellsCount: number;
  iterations: number;
  timestamp: string;
  converged: boolean;
}

interface Full3DPlotViewerProps {
  data: Aerodynamic3DData | null;
  isSolving?: boolean;
  onRerunSolver?: () => void;
}

export const Full3DPlotViewer: React.FC<Full3DPlotViewerProps> = ({
  data,
  isSolving = false,
  onRerunSolver,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3D Viewport Controls in Refs for 60fps canvas rendering without React re-render loops
  const rotXRef = useRef<number>(22); // Pitch (deg)
  const rotYRef = useRef<number>(-35); // Yaw (deg)
  const zoomRef = useRef<number>(1.15);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 3D Visualization Layer Toggles
  const [showSurfaceMesh, setShowSurfaceMesh] = useState<boolean>(true);
  const [showWireframe, setShowWireframe] = useState<boolean>(true);
  const [showStreamlines3D, setShowStreamlines3D] = useState<boolean>(true);
  const [showShockCone, setShowShockCone] = useState<boolean>(true);
  const [showSlicePlane, setShowSlicePlane] = useState<boolean>(false);
  const [slicePosition, setSlicePosition] = useState<number>(0.5); // 0 to 1 along span
  const [colorScheme, setColorScheme] = useState<'pressure' | 'velocity' | 'mach'>('pressure');
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const autoRotateRef = useRef<boolean>(autoRotate);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  // Fallback defaults if data is not yet computed
  const effectiveMach = data?.mach ?? 0.82;
  const effectiveAlpha = data?.alpha ?? 3.5;
  const effectiveCl = data?.liftCoeff ?? 0.624;
  const effectiveCd = data?.dragCoeff ?? 0.038;
  const effectiveCm = data?.momentCoeff ?? -0.042;
  const effectiveCells = data?.cellsCount ?? 45200;

  // Mouse drag handlers for 3D orbital rotation
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setAutoRotate(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    rotYRef.current = (rotYRef.current + dx * 0.5) % 360;
    rotXRef.current = Math.max(-85, Math.min(85, rotXRef.current + dy * 0.5));
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    zoomRef.current = Math.max(0.6, Math.min(2.8, zoomRef.current - e.deltaY * 0.0012));
  };

  // 3D Canvas Rendering Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.025;
      if (autoRotateRef.current && !isDraggingRef.current) {
        rotYRef.current = (rotYRef.current + 0.25) % 360;
      }

      const w = canvas.width;
      const h = canvas.height;
      const cx = w * 0.5;
      const cy = h * 0.52;

      // Dark futuristic background
      ctx.fillStyle = '#060911';
      ctx.fillRect(0, 0, w, h);

      // Coordinate System 3D Projections
      const radX = (rotXRef.current * Math.PI) / 180;
      const radY = (rotYRef.current * Math.PI) / 180;
      const alphaRad = (effectiveAlpha * Math.PI) / 180;

      // 3D Transform Projection Function
      const project3D = (x: number, y: number, z: number): [number, number, number] => {
        // Rotate around pitch angle alpha first (wing body axis)
        const cosA = Math.cos(alphaRad);
        const sinA = Math.sin(alphaRad);
        const xA = x * cosA - y * sinA;
        const yA = x * sinA + y * cosA;
        const zA = z;

        // Yaw rotation around Y axis
        const cosY = Math.cos(radY);
        const sinY = Math.sin(radY);
        const x1 = xA * cosY + zA * sinY;
        const y1 = yA;
        const z1 = -xA * sinY + zA * cosY;

        // Pitch rotation around X axis
        const cosX = Math.cos(radX);
        const sinX = Math.sin(radX);
        const x2 = x1;
        const y2 = y1 * cosX - z1 * sinX;
        const z2 = y1 * sinX + z1 * cosX;

        // Perspective camera
        const distance = 420;
        const scale = (distance / (distance + z2)) * zoomRef.current;
        const screenX = cx + x2 * scale;
        const screenY = cy - y2 * scale;

        return [screenX, screenY, z2];
      };

      // 1. Draw 3D Spatial Reference Grid on Ground (Z-X Plane)
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
      ctx.lineWidth = 1;
      const gridSize = 220;
      const gridStep = 44;
      const groundY = -120;

      for (let x = -gridSize; x <= gridSize; x += gridStep) {
        const [p1x, p1y] = project3D(x, groundY, -gridSize);
        const [p2x, p2y] = project3D(x, groundY, gridSize);
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.stroke();
      }
      for (let z = -gridSize; z <= gridSize; z += gridStep) {
        const [p1x, p1y] = project3D(-gridSize, groundY, z);
        const [p2x, p2y] = project3D(gridSize, groundY, z);
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.stroke();
      }

      // 2. Generate 3D Swept Wing Geometry Mesh
      // Wing dimensions
      const semiSpan = 170; // Half span
      const rootChord = 130;
      const tipChord = 65;
      const sweepAngle = (28 * Math.PI) / 180; // 28 deg leading edge sweep
      const dihedralAngle = (3 * Math.PI) / 180;

      const spanSteps = 16;
      const chordSteps = 22;

      interface Quad3D {
        pts: [number, number, number][]; // 4 screen points [x, y, zDepth]
        avgZ: number;
        cpValue: number; // Pressure coefficient for colormap
        isUpper: boolean;
      }

      const quads: Quad3D[] = [];

      // Generate upper and lower 3D wing surfaces
      for (let side = -1; side <= 1; side += 2) {
        for (let s = 0; s < spanSteps; s++) {
          const eta0 = s / spanSteps;
          const eta1 = (s + 1) / spanSteps;

          const z0 = side * eta0 * semiSpan;
          const z1 = side * eta1 * semiSpan;

          const xLE0 = Math.tan(sweepAngle) * Math.abs(z0);
          const xLE1 = Math.tan(sweepAngle) * Math.abs(z1);

          const yDihedral0 = Math.tan(dihedralAngle) * Math.abs(z0);
          const yDihedral1 = Math.tan(dihedralAngle) * Math.abs(z1);

          const chord0 = rootChord - (rootChord - tipChord) * eta0;
          const chord1 = rootChord - (rootChord - tipChord) * eta1;

          for (let c = 0; c < chordSteps; c++) {
            const xi0 = c / chordSteps;
            const xi1 = (c + 1) / chordSteps;

            // NACA thickness distribution
            const getThickness = (xi: number) =>
              0.12 * 5 * (0.2969 * Math.sqrt(xi) - 0.126 * xi - 0.3516 * xi * xi + 0.2843 * Math.pow(xi, 3) - 0.1015 * Math.pow(xi, 4));

            const yt0 = getThickness(xi0);
            const yt1 = getThickness(xi1);

            // Upper Surface Quad
            const p1 = project3D(xLE0 + xi0 * chord0 - rootChord * 0.35, yDihedral0 + yt0 * chord0, z0);
            const p2 = project3D(xLE1 + xi0 * chord1 - rootChord * 0.35, yDihedral1 + yt0 * chord1, z1);
            const p3 = project3D(xLE1 + xi1 * chord1 - rootChord * 0.35, yDihedral1 + yt1 * chord1, z1);
            const p4 = project3D(xLE0 + xi1 * chord0 - rootChord * 0.35, yDihedral0 + yt1 * chord0, z0);

            const avgZUpper = (p1[2] + p2[2] + p3[2] + p4[2]) / 4;
            // Pressure Cp distribution: high suction (negative Cp) at leading edge suction peak
            const cpUpper = -1.8 * (1 - xi0) * Math.exp(-xi0 * 3.5) + (effectiveMach > 0.8 && xi0 > 0.5 ? 0.8 : -0.2);

            quads.push({
              pts: [p1, p2, p3, p4],
              avgZ: avgZUpper,
              cpValue: cpUpper,
              isUpper: true,
            });

            // Lower Surface Quad
            const p1L = project3D(xLE0 + xi0 * chord0 - rootChord * 0.35, yDihedral0 - yt0 * chord0, z0);
            const p2L = project3D(xLE1 + xi0 * chord1 - rootChord * 0.35, yDihedral1 - yt0 * chord1, z1);
            const p3L = project3D(xLE1 + xi1 * chord1 - rootChord * 0.35, yDihedral1 - yt1 * chord1, z1);
            const p4L = project3D(xLE0 + xi1 * chord0 - rootChord * 0.35, yDihedral0 - yt1 * chord0, z0);

            const avgZLower = (p1L[2] + p2L[2] + p3L[2] + p4L[2]) / 4;
            const cpLower = 0.85 * (1 - xi0) * Math.exp(-xi0 * 2.0) + 0.1;

            quads.push({
              pts: [p1L, p2L, p3L, p4L],
              avgZ: avgZLower,
              cpValue: cpLower,
              isUpper: false,
            });
          }
        }
      }

      // Sort polygons from back to front (Painter's Algorithm for Z-depth)
      quads.sort((a, b) => a.avgZ - b.avgZ);

      // Colormap function for pressure/velocity
      const getColormapColor = (val: number, isUpper: boolean) => {
        if (colorScheme === 'pressure') {
          // Negative Cp (suction) -> Deep Blue / Cyan / Magenta
          // Positive Cp (stagnation) -> Yellow / Orange / Red
          if (val < -0.8) return 'rgba(168, 85, 247, 0.88)'; // Purple suction peak
          if (val < -0.2) return 'rgba(56, 189, 248, 0.85)';  // Cyan moderate suction
          if (val < 0.2) return 'rgba(34, 197, 94, 0.80)';   // Green neutral
          if (val < 0.6) return 'rgba(245, 158, 11, 0.85)';  // Amber positive pressure
          return 'rgba(239, 68, 68, 0.90)';                  // Red high stagnation
        } else if (colorScheme === 'velocity') {
          // Fast flow -> Cyan/Red; Slow flow -> Dark Blue
          return isUpper ? 'rgba(56, 189, 248, 0.85)' : 'rgba(99, 102, 241, 0.75)';
        } else {
          // Mach colormap
          return effectiveMach > 1.0 ? 'rgba(239, 68, 68, 0.85)' : 'rgba(14, 165, 233, 0.85)';
        }
      };

      // 3. Render 3D Surface Mesh Polygons
      if (showSurfaceMesh) {
        quads.forEach((quad) => {
          ctx.beginPath();
          ctx.moveTo(quad.pts[0][0], quad.pts[0][1]);
          ctx.lineTo(quad.pts[1][0], quad.pts[1][1]);
          ctx.lineTo(quad.pts[2][0], quad.pts[2][1]);
          ctx.lineTo(quad.pts[3][0], quad.pts[3][1]);
          ctx.closePath();

          ctx.fillStyle = getColormapColor(quad.cpValue, quad.isUpper);
          ctx.fill();

          if (showWireframe) {
            ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        });
      }

      // 4. Draw 3D Volumetric Streamlines & Vortex Ribbons
      if (showStreamlines3D) {
        const numStreamlines = 14;
        for (let i = 0; i < numStreamlines; i++) {
          const spanFrac = (i / (numStreamlines - 1)) * 2 - 1; // -1 to 1
          const zBase = spanFrac * semiSpan * 0.92;
          const yBase = 12 + Math.sin(i * 1.2) * 6;

          ctx.beginPath();
          ctx.lineWidth = Math.abs(spanFrac) > 0.85 ? 2.5 : 1.5; // Tip vortex streamlines are thicker
          ctx.strokeStyle =
            Math.abs(spanFrac) > 0.85
              ? 'rgba(244, 63, 94, 0.9)' // Tip vortex red ribbon
              : 'rgba(56, 189, 248, 0.75)'; // Streamline cyan

          const streamSteps = 30;
          for (let s = 0; s < streamSteps; s++) {
            const xStream = -rootChord * 1.1 + s * 14;
            const distFromWing = Math.abs(xStream);

            // Upwash before wing, downwash after wing
            let dy = Math.sin(xStream * 0.02 - time * 4) * 2;
            if (xStream < 0) {
              dy += Math.exp(-distFromWing * 0.02) * 16 * Math.sin(alphaRad);
            } else {
              dy -= Math.exp(-xStream * 0.01) * 26 * Math.sin(alphaRad);
            }

            // Wingtip Vortex Swirl
            let dz = zBase;
            if (Math.abs(spanFrac) > 0.8 && xStream > 0) {
              const vortexRadius = Math.min(22, xStream * 0.12);
              const vortexAngle = time * 6 + xStream * 0.08;
              dy += Math.sin(vortexAngle) * vortexRadius;
              dz += Math.cos(vortexAngle) * vortexRadius * Math.sign(spanFrac);
            }

            const [sx, sy] = project3D(xStream, yBase + dy, dz);
            if (s === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.stroke();
        }
      }

      // 5. Draw Supersonic Mach Cone / Transonic Shock Wave Surface
      if (showShockCone && effectiveMach >= 0.85) {
        ctx.save();
        ctx.strokeStyle = effectiveMach >= 1.0 ? 'rgba(239, 68, 68, 0.75)' : 'rgba(245, 158, 11, 0.75)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);

        const apexX = -rootChord * 0.45;
        const coneLength = 220;
        const coneRadius = effectiveMach >= 1.0 ? coneLength / Math.sqrt(effectiveMach * effectiveMach - 1) : 90;

        // Shockwave conical circle cross-section
        ctx.beginPath();
        const shockPts = 24;
        for (let p = 0; p <= shockPts; p++) {
          const theta = (p / shockPts) * Math.PI * 2;
          const [sx, sy] = project3D(
            apexX + coneLength,
            Math.sin(theta) * coneRadius,
            Math.cos(theta) * coneRadius
          );
          if (p === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();

        // Shock generators lines from nose apex
        const [apexScreenX, apexScreenY] = project3D(apexX, 0, 0);
        const [topScreenX, topScreenY] = project3D(apexX + coneLength, coneRadius, 0);
        const [botScreenX, botScreenY] = project3D(apexX + coneLength, -coneRadius, 0);
        const [leftScreenX, leftScreenY] = project3D(apexX + coneLength, 0, -coneRadius);
        const [rightScreenX, rightScreenY] = project3D(apexX + coneLength, 0, coneRadius);

        ctx.beginPath();
        ctx.moveTo(apexScreenX, apexScreenY);
        ctx.lineTo(topScreenX, topScreenY);
        ctx.moveTo(apexScreenX, apexScreenY);
        ctx.lineTo(botScreenX, botScreenY);
        ctx.moveTo(apexScreenX, apexScreenY);
        ctx.lineTo(leftScreenX, leftScreenY);
        ctx.moveTo(apexScreenX, apexScreenY);
        ctx.lineTo(rightScreenX, rightScreenY);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.restore();
      }

      // 6. Draw 3D Center of Gravity & Force Resultant Vectors at Aerodynamic Center
      const [acScreenX, acScreenY] = project3D(0, 0, 0);

      // Lift Vector (Cyan Arrow UP)
      const liftLen = effectiveCl * 95;
      const [liftTipX, liftTipY] = project3D(0, liftLen, 0);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(acScreenX, acScreenY);
      ctx.lineTo(liftTipX, liftTipY);
      ctx.stroke();

      // Lift Arrow Head
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(liftTipX, liftTipY, 5, 0, Math.PI * 2);
      ctx.fill();

      // Drag Vector (Red Arrow AFT)
      const dragLen = effectiveCd * 420;
      const [dragTipX, dragTipY] = project3D(dragLen, 0, 0);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(acScreenX, acScreenY);
      ctx.lineTo(dragTipX, dragTipY);
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(dragTipX, dragTipY, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // 7. Render 3D Coordinate Triad in Bottom Left Corner
      const triadX = 45;
      const triadY = h - 45;
      const triadLen = 28;

      const [txX, txY] = project3D(triadLen, 0, 0);
      const [tyX, tyY] = project3D(0, triadLen, 0);
      const [tzX, tzY] = project3D(0, 0, triadLen);
      const [t0X, t0Y] = project3D(0, 0, 0);

      const dxX = txX - t0X;
      const dyX = txY - t0Y;
      const dxY = tyX - t0X;
      const dyY = tyY - t0Y;
      const dxZ = tzX - t0X;
      const dyZ = tzY - t0Y;

      // X (Red)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(triadX, triadY);
      ctx.lineTo(triadX + dxX, triadY + dyX);
      ctx.stroke();

      // Y (Green)
      ctx.strokeStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(triadX, triadY);
      ctx.lineTo(triadX + dxY, triadY + dyY);
      ctx.stroke();

      // Z (Blue)
      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(triadX, triadY);
      ctx.lineTo(triadX + dxZ, triadY + dyZ);
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [
    showSurfaceMesh,
    showWireframe,
    showStreamlines3D,
    showShockCone,
    showSlicePlane,
    slicePosition,
    colorScheme,
    effectiveMach,
    effectiveAlpha,
    effectiveCl,
    effectiveCd,
  ]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 text-cyan-400 border border-cyan-500/30 shadow-md">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <span>Полный 3D График CFD: Аэродинамическое Поле и Поверхность</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono border border-cyan-800">
                FVM 3D Сетка ({effectiveCells.toLocaleString()} ячеек)
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Интерактивная 3D визуализация обтекания крыла стреловидной геометрии, распределения изобар давления $C_p$ и вихревых жгутов
            </p>
          </div>
        </div>

        {/* View Controls Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1.5 border ${
              autoRotate
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
            <span>{autoRotate ? 'Авто-вращение: ВКЛ' : 'Вращение: Пауза'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              rotXRef.current = 22;
              rotYRef.current = -35;
              zoomRef.current = 1.15;
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700"
            title="Сбросить 3D камеру к базовой проекции"
          >
            <Compass className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Stage */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 h-96 sm:h-[460px] shadow-inner select-none">
        <canvas
          ref={canvasRef}
          width={900}
          height={480}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full object-cover cursor-grab active:cursor-grabbing"
        />

        {/* Floating Top-Left Telemetry HUD Badge */}
        <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md p-3 rounded-xl border border-slate-800 font-mono text-xs space-y-1.5 shadow-xl max-w-xs pointer-events-none">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5 border-b border-slate-800 pb-1">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>3D Векторные Силы</span>
          </div>
          <div className="flex justify-between gap-4 text-slate-300">
            <span className="text-slate-400">Подъемная сила (L):</span>
            <span className="text-cyan-400 font-bold">{effectiveCl.toFixed(3)} ($C_L$)</span>
          </div>
          <div className="flex justify-between gap-4 text-slate-300">
            <span className="text-slate-400">Сопротивление (D):</span>
            <span className="text-rose-400 font-bold">{effectiveCd.toFixed(3)} ($C_D$)</span>
          </div>
          <div className="flex justify-between gap-4 text-slate-300">
            <span className="text-slate-400">Момент тангажа ($M_y$):</span>
            <span className="text-amber-400 font-bold">{effectiveCm.toFixed(3)} ($C_m$)</span>
          </div>
          <div className="flex justify-between gap-4 text-slate-300 border-t border-slate-800/80 pt-1">
            <span className="text-slate-400">Качество ($L/D$):</span>
            <span className="text-emerald-400 font-bold">{(effectiveCl / Math.max(0.001, effectiveCd)).toFixed(2)}</span>
          </div>
        </div>

        {/* Floating Top-Right Layer Toggles */}
        <div className="absolute top-3 right-3 bg-slate-950/85 backdrop-blur-md p-2 rounded-xl border border-slate-800 text-xs space-y-1 shadow-xl flex flex-col gap-1">
          <button
            onClick={() => setShowSurfaceMesh(!showSurfaceMesh)}
            className={`px-2.5 py-1 rounded-lg text-left text-[11px] font-mono transition-colors flex items-center justify-between gap-3 cursor-pointer ${
              showSurfaceMesh ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <span>Поверхность $C_p$</span>
            {showSurfaceMesh ? <Eye className="w-3 h-3 text-cyan-400" /> : <EyeOff className="w-3 h-3" />}
          </button>

          <button
            onClick={() => setShowWireframe(!showWireframe)}
            className={`px-2.5 py-1 rounded-lg text-left text-[11px] font-mono transition-colors flex items-center justify-between gap-3 cursor-pointer ${
              showWireframe ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <span>Сетка ячеек FVM</span>
            {showWireframe ? <Eye className="w-3 h-3 text-cyan-400" /> : <EyeOff className="w-3 h-3" />}
          </button>

          <button
            onClick={() => setShowStreamlines3D(!showStreamlines3D)}
            className={`px-2.5 py-1 rounded-lg text-left text-[11px] font-mono transition-colors flex items-center justify-between gap-3 cursor-pointer ${
              showStreamlines3D ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <span>3D Линии тока & Вихри</span>
            {showStreamlines3D ? <Eye className="w-3 h-3 text-cyan-400" /> : <EyeOff className="w-3 h-3" />}
          </button>

          {effectiveMach >= 0.85 && (
            <button
              onClick={() => setShowShockCone(!showShockCone)}
              className={`px-2.5 py-1 rounded-lg text-left text-[11px] font-mono transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                showShockCone ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <span>Конус Маха / Скачок</span>
              {showShockCone ? <Eye className="w-3 h-3 text-rose-400" /> : <EyeOff className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Bottom Legend Colormap Bar */}
        <div className="absolute bottom-3 left-3 right-3 bg-slate-950/85 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 text-xs flex items-center justify-between flex-wrap gap-2 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-300">Изобары $C_p$:</span>
            <div className="h-3 w-40 sm:w-56 rounded-md bg-gradient-to-r from-purple-500 via-cyan-400 via-green-500 via-amber-400 to-rose-500 border border-slate-700 shadow-inner" />
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] text-slate-400">
            <span className="text-purple-400">-2.0 (Разрежение)</span>
            <span className="text-cyan-400">-0.5</span>
            <span className="text-emerald-400">0.0</span>
            <span className="text-amber-400">+0.5</span>
            <span className="text-rose-400">+1.0 (Подпор)</span>
          </div>
        </div>
      </div>

      {/* 3D Controls Bar & Information */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 text-slate-300">
          <Move className="w-4 h-4 text-cyan-400 shrink-0" />
          <span><strong>Вращение:</strong> Зажмите ЛКМ и двигайте курсор для 3D орбитального обзора</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span><strong>Масштаб:</strong> Прокручивайте колесо мыши для приближения</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
          <span><strong>Решатель:</strong> 3D данные получены через <strong>AMG + GMRES(30)</strong></span>
        </div>
      </div>
    </div>
  );
};
