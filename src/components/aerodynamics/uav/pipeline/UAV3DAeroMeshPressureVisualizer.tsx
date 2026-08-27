import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Wind,
  Activity,
  Download,
  Info,
  Camera,
  Play,
  Pause,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Grid,
  Move,
  Compass,
  Crosshair,
  ChevronRight,
  Disc,
  Split,
  CircleDot,
  FileCode,
  CheckCircle2
} from 'lucide-react';
import { DigitalTwinBusState } from './UAVDigitalTwinHub';

interface UAV3DAeroMeshPressureVisualizerProps {
  busState: DigitalTwinBusState;
}

export type ScalarFieldType = 'cp' | 'stall_separation' | 'cl_circulation' | 'shear_stress' | 'mach_local';
export type ColorMapName = 'turbo' | 'coolwarm' | 'jet' | 'viridis' | 'plasma';
export type ViewPreset = 'iso' | 'top' | 'side' | 'front' | 'chase';

interface Particle3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  rakeIdx: number;
}

interface MeshQuad {
  p1: [number, number, number];
  p2: [number, number, number];
  p3: [number, number, number];
  p4: [number, number, number];
  normal: [number, number, number];
  center: [number, number, number];
  cp: number;
  isStalled: boolean;
  cl: number;
  shear: number;
  isUpper: boolean;
  isControlSurface?: boolean;
}

export const UAV3DAeroMeshPressureVisualizer: React.FC<UAV3DAeroMeshPressureVisualizerProps> = ({
  busState,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Simulation & View State
  const [alphaDeg, setAlphaDeg] = useState<number>(4.5); // Angle of attack
  const [betaDeg, setBetaDeg] = useState<number>(0.0); // Side-slip angle
  const [elevonDeflectionDeg, setElevonDeflectionDeg] = useState<number>(0.0); // Control surface deflection
  const [airspeedMs, setAirspeedMs] = useState<number>(22.0); // Free stream velocity (m/s)
  const [scalarField, setScalarField] = useState<ScalarFieldType>('cp');
  const [colorMap, setColorMap] = useState<ColorMapName>('turbo');

  // Camera Orientation & Navigation
  const [rotX, setRotX] = useState<number>(25); // degrees
  const [rotY, setRotY] = useState<number>(-35); // degrees
  const [zoom, setZoom] = useState<number>(1.0);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const dragButtonRef = useRef<number>(0);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Visual Overlay Toggles
  const [showWireframe, setShowWireframe] = useState<boolean>(true);
  const [showShading, setShowShading] = useState<boolean>(true);
  const [showStreamlines, setShowStreamlines] = useState<boolean>(true);
  const [showTipVortices, setShowTipVortices] = useState<boolean>(true);
  const [showPressureVectors, setShowPressureVectors] = useState<boolean>(false);
  const [showStallSeparationLine, setShowStallSeparationLine] = useState<boolean>(true);
  const [showAerodynamicVectors, setShowAerodynamicVectors] = useState<boolean>(true);
  const [isFlowAnimated, setIsFlowAnimated] = useState<boolean>(true);
  const [activeSectionSpan, setActiveSectionSpan] = useState<number>(0.5); // Section inspector at y/(b/2)

  // Particles / Streamlines
  const particlesRef = useRef<Particle3D[]>([]);
  const animFrameIdRef = useRef<number | null>(null);

  // Set Preset View
  const handleSetViewPreset = (preset: ViewPreset) => {
    if (preset === 'iso') {
      setRotX(25);
      setRotY(-35);
    } else if (preset === 'top') {
      setRotX(90);
      setRotY(0);
    } else if (preset === 'side') {
      setRotX(0);
      setRotY(-90);
    } else if (preset === 'front') {
      setRotX(0);
      setRotY(0);
    } else if (preset === 'chase') {
      setRotX(15);
      setRotY(-160);
    }
    setPanX(0);
    setPanY(0);
  };

  // Color Mapping Helper
  const getColor = useCallback((val: number, min: number, max: number, map: ColorMapName): string => {
    const t = Math.max(0, Math.min(1, (val - min) / (max - min || 1e-6)));

    if (map === 'turbo') {
      // Approximate Turbo Colormap (Deep blue -> cyan -> green -> yellow -> red)
      const r = Math.sin(t * Math.PI * 1.5 - 0.5) * 127 + 128;
      const g = Math.sin(t * Math.PI * 2.0 - 1.0) * 127 + 128;
      const b = Math.cos(t * Math.PI * 1.8) * 127 + 128;
      return `rgb(${Math.max(0, Math.min(255, Math.round(r)))}, ${Math.max(0, Math.min(255, Math.round(g)))}, ${Math.max(0, Math.min(255, Math.round(b)))})`;
    } else if (map === 'coolwarm') {
      // Blue (-Cp / suction) to Red (+Cp / compression)
      const r = Math.round(255 * t);
      const b = Math.round(255 * (1 - t));
      const g = Math.round(220 * (1 - Math.abs(t - 0.5) * 2));
      return `rgb(${r}, ${g}, ${b})`;
    } else if (map === 'jet') {
      const fourVal = 4 * t;
      const r = Math.min(fourVal - 1.5, -fourVal + 4.5);
      const g = Math.min(fourVal - 0.5, -fourVal + 3.5);
      const b = Math.min(fourVal + 0.5, -fourVal + 2.5);
      return `rgb(${Math.max(0, Math.min(255, Math.round(r * 255)))}, ${Math.max(0, Math.min(255, Math.round(g * 255)))}, ${Math.max(0, Math.min(255, Math.round(b * 255)))})`;
    } else if (map === 'plasma') {
      const r = Math.round(13 + 240 * t);
      const g = Math.round(8 + 180 * Math.sin(t * Math.PI));
      const b = Math.round(135 * (1 - t) + 20 * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Viridis
      const r = Math.round(68 + (253 - 68) * t);
      const g = Math.round(1 + (231 - 1) * Math.sin(t * Math.PI * 0.9));
      const b = Math.round(84 + (37 - 84) * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }, []);

  // Compute Aerodynamic Parameters for active state
  const aeroAnalysis = useMemo(() => {
    const b = busState.wingspan_m;
    const c_root = busState.chordRoot_m;
    const c_tip = busState.chordTip_m;
    const sweep = (busState.sweep_deg * Math.PI) / 180;
    const ar = busState.aspectRatio;
    const alphaRad = (alphaDeg * Math.PI) / 180;
    const elevonRad = (elevonDeflectionDeg * Math.PI) / 180;

    // Stall critical angle and 3D lift curve slope
    const a0 = 2 * Math.PI; // 2D slope
    const a_3d = a0 / (1 + a0 / (Math.PI * ar * 0.85)); // Helmbold 3D slope
    const alpha_0L = -1.5 * (Math.PI / 180); // MH60 zero lift angle
    const alpha_stall_deg = 13.5 - Math.min(5, (busState.totalMass_kg / 10)); // Effective stall angle
    const isPostStall = alphaDeg > alpha_stall_deg;

    // Global Coefficients
    let CL: number;
    let stallFraction = 0;

    if (alphaDeg <= alpha_stall_deg) {
      CL = a_3d * (alphaRad - alpha_0L) + 0.35 * Math.sin(elevonRad);
      stallFraction = Math.max(0, (alphaDeg - 7) / (alpha_stall_deg - 7 + 1e-4) * 0.3);
    } else {
      const cl_max = a_3d * ((alpha_stall_deg * Math.PI) / 180 - alpha_0L);
      const stallOvershoot = alphaDeg - alpha_stall_deg;
      CL = Math.max(0.2, cl_max * Math.exp(-stallOvershoot * 0.12) + 0.15 * Math.sin(elevonRad));
      stallFraction = Math.min(1.0, 0.3 + stallOvershoot * 0.08);
    }

    const CD0 = 0.022 + (busState.totalMass_kg > 8 ? 0.005 : 0);
    const CDi = (CL * CL) / (Math.PI * ar * 0.88);
    const CD_sep = isPostStall ? (alphaDeg - alpha_stall_deg) * 0.035 : 0;
    const CD = CD0 + CDi + CD_sep;
    const LD = CL / Math.max(0.001, CD);

    // Aerodynamic Forces in Newtons
    const q_inf = 0.5 * 1.225 * airspeedMs * airspeedMs;
    const S = busState.wingArea_m2;
    const Lift_N = CL * q_inf * S;
    const Drag_N = CD * q_inf * S;

    // Center of Pressure location
    const x_cp_mac = 0.25 + (0.28 - 0.25) * (1 - CL / 1.2) - (elevonDeflectionDeg * 0.004);

    return {
      b,
      c_root,
      c_tip,
      sweep,
      ar,
      CL,
      CD,
      LD,
      Lift_N,
      Drag_N,
      alpha_stall_deg,
      isPostStall,
      stallFraction,
      q_inf,
      x_cp_mac,
    };
  }, [busState, alphaDeg, elevonDeflectionDeg, airspeedMs]);

  // Generate 3D Wing Polygonal Mesh with Upper & Lower Surface Panels
  const meshQuads = useMemo<MeshQuad[]>(() => {
    const quads: MeshQuad[] = [];
    const spanSteps = 24; // Half-span subdivisions
    const chordSteps = 20; // Chordwise subdivisions
    const b_half = aeroAnalysis.b / 2;
    const sweep = aeroAnalysis.sweep;
    const c_root = aeroAnalysis.c_root;
    const c_tip = aeroAnalysis.c_tip;
    const alphaRad = (alphaDeg * Math.PI) / 180;
    const elevonRad = (elevonDeflectionDeg * Math.PI) / 180;

    // Scale to viewport coordinate system (meters to 3D world units)
    const scale = 220 / Math.max(1.5, aeroAnalysis.b);

    // Generate Airfoil coordinates (MH60 reflexed / cambered approximation)
    const getAirfoilZ = (x_norm: number, isUpper: boolean): number => {
      // Thickness distribution t/c = 10%
      const t = 0.10;
      const yt = 5 * t * (0.2969 * Math.sqrt(x_norm) - 0.1260 * x_norm - 0.3516 * x_norm ** 2 + 0.2843 * x_norm ** 3 - 0.1015 * x_norm ** 4);
      // Camber line with reflex at TE for flying wing stability
      const yc = 0.025 * Math.sin(Math.PI * Math.sqrt(x_norm)) - 0.015 * Math.sin(Math.PI * x_norm * 2);
      return isUpper ? (yc + yt) : (yc - yt);
    };

    // Helper to generate a wing half (isRight: true = +y, false = -y)
    const buildWingHalf = (isRight: boolean) => {
      const signY = isRight ? 1 : -1;

      for (let j = 0; j < spanSteps; j++) {
        const eta1 = j / spanSteps;
        const eta2 = (j + 1) / spanSteps;

        const y1 = eta1 * b_half;
        const y2 = eta2 * b_half;

        const chord1 = c_root + (c_tip - c_root) * eta1;
        const chord2 = c_root + (c_tip - c_root) * eta2;

        const x_le1 = y1 * Math.tan(sweep);
        const x_le2 = y2 * Math.tan(sweep);

        // Twist / Washout (-2.5 deg at tip)
        const twist1 = -2.5 * eta1 * (Math.PI / 180);
        const twist2 = -2.5 * eta2 * (Math.PI / 180);

        // Local induced angle of attack
        const alpha_eff1 = alphaRad + twist1;
        const alpha_eff2 = alphaRad + twist2;

        // Local stall boundary calculation x_sep/c
        const stall_crit_rad = (aeroAnalysis.alpha_stall_deg * Math.PI) / 180;
        const localSep1 = alpha_eff1 > stall_crit_rad ? Math.max(0.1, 1.0 - (alpha_eff1 - stall_crit_rad) * 4) : Math.max(0.5, 1.0 - Math.max(0, alpha_eff1 - 0.1) * 1.5);

        for (let i = 0; i < chordSteps; i++) {
          const x_norm1 = i / chordSteps;
          const x_norm2 = (i + 1) / chordSteps;

          const isControlSurface = x_norm1 >= 0.75 && eta1 >= 0.35 && eta1 <= 0.95;

          // Upper Surface
          {
            const z_norm1 = getAirfoilZ(x_norm1, true);
            const z_norm2 = getAirfoilZ(x_norm2, true);

            // Deflection for control surfaces (hinge at x=0.75)
            let rotHinge1 = 0;
            let rotHinge2 = 0;
            if (isControlSurface) {
              rotHinge1 = elevonRad * (x_norm1 - 0.75) / 0.25;
              rotHinge2 = elevonRad * (x_norm2 - 0.75) / 0.25;
            }

            const p1: [number, number, number] = [
              (x_le1 + x_norm1 * chord1) * scale,
              signY * y1 * scale,
              (z_norm1 * chord1 + (isControlSurface ? -rotHinge1 * chord1 * 0.2 : 0)) * scale,
            ];
            const p2: [number, number, number] = [
              (x_le1 + x_norm2 * chord1) * scale,
              signY * y1 * scale,
              (z_norm2 * chord1 + (isControlSurface ? -rotHinge2 * chord1 * 0.2 : 0)) * scale,
            ];
            const p3: [number, number, number] = [
              (x_le2 + x_norm2 * chord2) * scale,
              signY * y2 * scale,
              (z_norm2 * chord2 + (isControlSurface ? -rotHinge2 * chord2 * 0.2 : 0)) * scale,
            ];
            const p4: [number, number, number] = [
              (x_le2 + x_norm1 * chord2) * scale,
              signY * y2 * scale,
              (z_norm1 * chord2 + (isControlSurface ? -rotHinge1 * chord2 * 0.2 : 0)) * scale,
            ];

            const cx = (p1[0] + p2[0] + p3[0] + p4[0]) / 4;
            const cy = (p1[1] + p2[1] + p3[1] + p4[1]) / 4;
            const cz = (p1[2] + p2[2] + p3[2] + p4[2]) / 4;

            // Compute local Cp on upper surface (Suction peak near LE)
            const x_mid = (x_norm1 + x_norm2) / 2;
            const isStalled = x_mid > localSep1;
            let cp: number;
            if (isStalled) {
              cp = -0.3 + 0.15 * Math.random(); // Pressure plateau in separated flow
            } else {
              // Suction peak: Cp min = -1.0 - 4.5 * sin(alpha) / sqrt(x_mid + 0.02)
              const suctionFactor = Math.max(0.1, (alpha_eff1 * 180 / Math.PI));
              cp = 0.5 - (0.8 + 0.25 * suctionFactor) / Math.sqrt(x_mid + 0.04) * (1 - x_mid);
            }

            quads.push({
              p1,
              p2,
              p3,
              p4,
              normal: [0, 0, 1],
              center: [cx, cy, cz],
              cp,
              isStalled,
              cl: aeroAnalysis.CL * Math.sqrt(Math.max(0, 1 - (eta1 ** 2))),
              shear: isStalled ? 0.05 : 1.0 - x_mid,
              isUpper: true,
              isControlSurface,
            });
          }

          // Lower Surface (Compression)
          {
            const z_norm1 = getAirfoilZ(x_norm1, false);
            const z_norm2 = getAirfoilZ(x_norm2, false);

            let rotHinge1 = 0;
            let rotHinge2 = 0;
            if (isControlSurface) {
              rotHinge1 = elevonRad * (x_norm1 - 0.75) / 0.25;
              rotHinge2 = elevonRad * (x_norm2 - 0.75) / 0.25;
            }

            const p1: [number, number, number] = [
              (x_le1 + x_norm1 * chord1) * scale,
              signY * y1 * scale,
              (z_norm1 * chord1 + (isControlSurface ? -rotHinge1 * chord1 * 0.2 : 0)) * scale,
            ];
            const p2: [number, number, number] = [
              (x_le2 + x_norm1 * chord2) * scale,
              signY * y2 * scale,
              (z_norm1 * chord2 + (isControlSurface ? -rotHinge1 * chord2 * 0.2 : 0)) * scale,
            ];
            const p3: [number, number, number] = [
              (x_le2 + x_norm2 * chord2) * scale,
              signY * y2 * scale,
              (z_norm2 * chord2 + (isControlSurface ? -rotHinge2 * chord2 * 0.2 : 0)) * scale,
            ];
            const p4: [number, number, number] = [
              (x_le1 + x_norm2 * chord1) * scale,
              signY * y1 * scale,
              (z_norm2 * chord1 + (isControlSurface ? -rotHinge2 * chord1 * 0.2 : 0)) * scale,
            ];

            const cx = (p1[0] + p2[0] + p3[0] + p4[0]) / 4;
            const cy = (p1[1] + p2[1] + p3[1] + p4[1]) / 4;
            const cz = (p1[2] + p2[2] + p3[2] + p4[2]) / 4;

            const x_mid = (x_norm1 + x_norm2) / 2;
            const cp = 0.8 * Math.cos(alphaRad) * (1 - x_mid) + 0.15;

            quads.push({
              p1,
              p2,
              p3,
              p4,
              normal: [0, 0, -1],
              center: [cx, cy, cz],
              cp,
              isStalled: false,
              cl: 0.1,
              shear: 0.8,
              isUpper: false,
              isControlSurface,
            });
          }
        }

        // Winglets / Vertical Fin at tip
        if (j === spanSteps - 1) {
          const finHeight = c_tip * 0.7 * scale;
          const tipX = (x_le2) * scale;
          const tipY = signY * b_half * scale;

          const fin_p1: [number, number, number] = [tipX, tipY, 0];
          const fin_p2: [number, number, number] = [tipX + c_tip * scale * 0.8, tipY, 0];
          const fin_p3: [number, number, number] = [tipX + c_tip * scale * 0.5, tipY, finHeight];
          const fin_p4: [number, number, number] = [tipX + c_tip * scale * 0.1, tipY, finHeight];

          quads.push({
            p1: fin_p1,
            p2: fin_p2,
            p3: fin_p3,
            p4: fin_p4,
            normal: [0, signY, 0],
            center: [tipX + c_tip * scale * 0.4, tipY, finHeight / 2],
            cp: -0.2,
            isStalled: false,
            cl: 0.2,
            shear: 0.5,
            isUpper: true,
          });
        }
      }
    };

    buildWingHalf(true); // Right wing
    buildWingHalf(false); // Left wing

    return quads;
  }, [busState, aeroAnalysis, alphaDeg, elevonDeflectionDeg]);

  // Initialize Particles for Streamlines and Smoke Rake
  useEffect(() => {
    const particles: Particle3D[] = [];
    const rakePoints = 28;
    const b_half = aeroAnalysis.b / 2;
    const scale = 220 / Math.max(1.5, aeroAnalysis.b);

    for (let i = 0; i < 90; i++) {
      const rakeIdx = i % rakePoints;
      const spanNorm = (rakeIdx / (rakePoints - 1) - 0.5) * 2; // -1 to +1
      const y = spanNorm * (b_half * 0.95) * scale;
      const x = -180 + (Math.random() * 40);
      const z = (Math.random() - 0.5) * 25 + 10;

      particles.push({
        x,
        y,
        z,
        vx: 4.5,
        vy: 0,
        vz: 0,
        life: Math.random() * 60,
        maxLife: 80 + Math.random() * 40,
        rakeIdx,
      });
    }
    particlesRef.current = particles;
  }, [aeroAnalysis.b]);

  // Main 3D Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2 + panX;
      const cy = height / 2 + panY;

      // Clear Canvas Background (Dark Engineering Navy)
      ctx.fillStyle = '#060d1a';
      ctx.fillRect(0, 0, width, height);

      // Draw Horizon / Coordinate Grid in background
      ctx.strokeStyle = 'rgba(30, 58, 95, 0.3)';
      ctx.lineWidth = 1;
      const gridSpacing = 40 * zoom;
      ctx.beginPath();
      for (let x = (cx % gridSpacing); x < width; x += gridSpacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = (cy % gridSpacing); y < height; y += gridSpacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Transform 3D Points to 2D Screen Space
      const radX = (rotX * Math.PI) / 180;
      const radY = (rotY * Math.PI) / 180;
      const cosX = Math.cos(radX);
      const sinX = Math.sin(radX);
      const cosY = Math.cos(radY);
      const sinY = Math.sin(radY);

      const project = (p: [number, number, number]): [number, number, number] => {
        // Rotate around Y axis (yaw/heading)
        const x1 = p[0] * cosY + p[1] * sinY;
        const y1 = -p[0] * sinY + p[1] * cosY;
        const z1 = p[2];

        // Rotate around X axis (pitch/elevation)
        const x2 = x1;
        const y2 = y1 * cosX - z1 * sinX;
        const z2 = y1 * sinX + z1 * cosX;

        // Perspective projection
        const dist = 650;
        const fov = dist / (dist + y2);
        const screenX = cx + x2 * fov * zoom;
        const screenY = cy - z2 * fov * zoom;

        return [screenX, screenY, y2]; // y2 is depth for z-sorting
      };

      // 1. Sort mesh panels from back to front (Painter's algorithm)
      const sortedQuads = [...meshQuads].map((q) => {
        const proj1 = project(q.p1);
        const proj2 = project(q.p2);
        const proj3 = project(q.p3);
        const proj4 = project(q.p4);
        const avgDepth = (proj1[2] + proj2[2] + proj3[2] + proj4[2]) / 4;
        return {
          ...q,
          proj1,
          proj2,
          proj3,
          proj4,
          avgDepth,
        };
      });

      sortedQuads.sort((a, b) => b.avgDepth - a.avgDepth);

      // 2. Render Polygons & Heatmap Colors
      sortedQuads.forEach((q) => {
        let fillColor: string;

        if (scalarField === 'cp') {
          fillColor = getColor(q.cp, -2.5, 1.0, colorMap);
        } else if (scalarField === 'stall_separation') {
          fillColor = q.isStalled ? 'rgba(239, 68, 68, 0.85)' : 'rgba(16, 185, 129, 0.75)';
        } else if (scalarField === 'cl_circulation') {
          fillColor = getColor(q.cl, 0, 1.4, colorMap);
        } else {
          fillColor = getColor(q.shear, 0, 1.0, colorMap);
        }

        // Shading intensity based on normal vector
        let shade = 1.0;
        if (showShading) {
          shade = q.isUpper ? 0.95 : 0.65;
          if (q.isControlSurface) shade *= 1.15;
        }

        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.moveTo(q.proj1[0], q.proj1[1]);
        ctx.lineTo(q.proj2[0], q.proj2[1]);
        ctx.lineTo(q.proj3[0], q.proj3[1]);
        ctx.lineTo(q.proj4[0], q.proj4[1]);
        ctx.closePath();
        ctx.fill();

        if (showWireframe) {
          ctx.strokeStyle = q.isControlSurface
            ? 'rgba(251, 191, 36, 0.8)'
            : q.isStalled && showStallSeparationLine
            ? 'rgba(239, 68, 68, 0.7)'
            : 'rgba(15, 23, 42, 0.4)';
          ctx.lineWidth = q.isControlSurface ? 1.5 : 0.6;
          ctx.stroke();
        }
      });

      // 3. Render Animated 3D Flow Particles / Streamlines
      if (showStreamlines && particlesRef.current.length > 0) {
        ctx.lineWidth = 1.5;

        particlesRef.current.forEach((p) => {
          if (isFlowAnimated) {
            // Particle dynamics around swept wing
            const localSweepEffect = (Math.abs(p.y) / 100) * 0.6;
            p.x += p.vx;
            p.y += p.vy;

            // Flow acceleration and upward deflection over suction peak
            if (p.x > -20 && p.x < 120) {
              const alphaFactor = (alphaDeg * Math.PI) / 180;
              p.z += Math.sin(alphaFactor) * 1.8 + Math.sin(p.x * 0.08) * 0.8;
              p.vx = 5.2 + Math.cos(p.x * 0.05);

              // Unsteady vortex turbulence if stalled
              if (aeroAnalysis.isPostStall && p.x > 30) {
                p.vz = (Math.random() - 0.5) * 3.5;
                p.vy = (Math.random() - 0.5) * 2.0;
                p.z += p.vz;
              }
            } else if (p.x >= 120) {
              // Downwash in the wake
              p.z -= 0.6 + (aeroAnalysis.CL * 0.8);
            }

            p.life++;
            if (p.life > p.maxLife || p.x > 300) {
              // Respawn upstream
              const b_half = aeroAnalysis.b / 2;
              const scale = 220 / Math.max(1.5, aeroAnalysis.b);
              const rakeNorm = (p.rakeIdx / 27 - 0.5) * 2;
              p.x = -180;
              p.y = rakeNorm * (b_half * 0.95) * scale;
              p.z = (Math.random() - 0.5) * 20 + 8;
              p.vx = 4.5;
              p.vy = 0;
              p.vz = 0;
              p.life = 0;
            }
          }

          const projP = project([p.x, p.y, p.z]);
          const alphaFade = Math.sin((p.life / p.maxLife) * Math.PI);

          ctx.fillStyle = aeroAnalysis.isPostStall && p.x > 20
            ? `rgba(244, 63, 94, ${alphaFade * 0.85})`
            : `rgba(56, 189, 248, ${alphaFade * 0.8})`;

          ctx.beginPath();
          ctx.arc(projP[0], projP[1], 1.8 * zoom, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 4. Render Wingtip Helical Vortex Cores
      if (showTipVortices) {
        const b_half = aeroAnalysis.b / 2;
        const scale = 220 / Math.max(1.5, aeroAnalysis.b);
        const tipY_right = b_half * scale;
        const tipY_left = -b_half * scale;
        const tipX = (b_half * Math.tan(aeroAnalysis.sweep) + aeroAnalysis.c_tip) * scale;

        const drawVortexTrail = (tipY: number, isRight: boolean) => {
          const pointsCount = 45;
          const vortexRadius = Math.min(25, 4 + aeroAnalysis.CL * 14);
          const coreColor = isRight ? 'rgba(168, 85, 247, 0.7)' : 'rgba(236, 72, 153, 0.7)';

          ctx.strokeStyle = coreColor;
          ctx.lineWidth = 1.8;
          ctx.beginPath();

          for (let k = 0; k < pointsCount; k++) {
            const dx = k * 6;
            const theta = (k * 0.6) + (isFlowAnimated ? (Date.now() * 0.015) : 0);
            const radius = vortexRadius * (1 + k * 0.03);
            const sign = isRight ? 1 : -1;

            const vx = tipX + dx;
            const vy = tipY + Math.sin(theta) * radius * sign;
            const vz = Math.cos(theta) * radius - (k * 0.4 * aeroAnalysis.CL);

            const projV = project([vx, vy, vz]);
            if (k === 0) ctx.moveTo(projV[0], projV[1]);
            else ctx.lineTo(projV[0], projV[1]);
          }
          ctx.stroke();
        };

        drawVortexTrail(tipY_right, true);
        drawVortexTrail(tipY_left, false);
      }

      // 5. Render Center of Pressure & Total Aerodynamic Lift/Drag Vectors
      if (showAerodynamicVectors) {
        const scale = 220 / Math.max(1.5, aeroAnalysis.b);
        const cp_x = (aeroAnalysis.c_root * aeroAnalysis.x_cp_mac) * scale;
        const cp_y = 0;
        const cp_z = 10;

        const projCP = project([cp_x, cp_y, cp_z]);

        // Lift Vector (Cyan / Emerald)
        const liftLen = Math.min(120, Math.max(20, aeroAnalysis.Lift_N * 1.5)) * zoom;
        const projLiftEnd = project([cp_x, cp_y, cp_z + liftLen / zoom]);

        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(projCP[0], projCP[1]);
        ctx.lineTo(projLiftEnd[0], projLiftEnd[1]);
        ctx.stroke();

        // Drag Vector (Rose / Red)
        const dragLen = Math.min(90, Math.max(15, aeroAnalysis.Drag_N * 4.0)) * zoom;
        const projDragEnd = project([cp_x + dragLen / zoom, cp_y, cp_z]);

        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(projCP[0], projCP[1]);
        ctx.lineTo(projDragEnd[0], projDragEnd[1]);
        ctx.stroke();

        // Center of Pressure marker
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(projCP[0], projCP[1], 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Vector Labels
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`L = ${aeroAnalysis.Lift_N.toFixed(1)} N`, projLiftEnd[0] + 6, projLiftEnd[1]);

        ctx.fillStyle = '#f43f5e';
        ctx.fillText(`D = ${aeroAnalysis.Drag_N.toFixed(1)} N`, projDragEnd[0] + 6, projDragEnd[1] + 12);
      }

      // Compass / Axes in Corner
      const compassOrigin: [number, number, number] = [cx - width / 2 + 50, cy - height / 2 + 50, 0];
      const axisLen = 30;
      const x_ax = project([axisLen, 0, 0]);
      const y_ax = project([0, axisLen, 0]);
      const z_ax = project([0, 0, axisLen]);

      ctx.lineWidth = 2;
      // X Axis (Red)
      ctx.strokeStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(compassOrigin[0], compassOrigin[1]);
      ctx.lineTo(compassOrigin[0] + (x_ax[0] - cx), compassOrigin[1] + (x_ax[1] - cy));
      ctx.stroke();

      // Y Axis (Green)
      ctx.strokeStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(compassOrigin[0], compassOrigin[1]);
      ctx.lineTo(compassOrigin[0] + (y_ax[0] - cx), compassOrigin[1] + (y_ax[1] - cy));
      ctx.stroke();

      // Z Axis (Blue)
      ctx.strokeStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(compassOrigin[0], compassOrigin[1]);
      ctx.lineTo(compassOrigin[0] + (z_ax[0] - cx), compassOrigin[1] + (z_ax[1] - cy));
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [
    meshQuads,
    rotX,
    rotY,
    zoom,
    panX,
    panY,
    scalarField,
    colorMap,
    showWireframe,
    showShading,
    showStreamlines,
    showTipVortices,
    showAerodynamicVectors,
    showStallSeparationLine,
    isFlowAnimated,
    getColor,
    aeroAnalysis,
    alphaDeg,
  ]);

  // Mouse / Drag Handlers for 3D Navigation
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragButtonRef.current = e.button;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    if (dragButtonRef.current === 0) {
      // Left click = Rotate
      setRotY((prev) => prev + dx * 0.6);
      setRotX((prev) => Math.max(-85, Math.min(85, prev - dy * 0.6)));
    } else if (dragButtonRef.current === 2 || dragButtonRef.current === 1) {
      // Right/Middle click = Pan
      setPanX((prev) => prev + dx);
      setPanY((prev) => prev + dy);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.max(0.3, Math.min(4.0, prev * zoomFactor)));
  };

  // Export Screenshot
  const handleDownloadScreenshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = `Aero_3D_Mesh_${busState.airfoil.name}_a${alphaDeg}.png`;
    link.click();
  };

  // Export Mesh OBJ
  const handleDownloadOBJ = () => {
    let objText = `# 3D UAV Aero Mesh - AeroDesign Studio Pro\n# Airfoil: ${busState.airfoil.name}\n# Alpha: ${alphaDeg} deg\n\n`;
    let vertexCount = 1;

    meshQuads.forEach((q) => {
      objText += `v ${q.p1[0].toFixed(3)} ${q.p1[1].toFixed(3)} ${q.p1[2].toFixed(3)}\n`;
      objText += `v ${q.p2[0].toFixed(3)} ${q.p2[1].toFixed(3)} ${q.p2[2].toFixed(3)}\n`;
      objText += `v ${q.p3[0].toFixed(3)} ${q.p3[1].toFixed(3)} ${q.p3[2].toFixed(3)}\n`;
      objText += `v ${q.p4[0].toFixed(3)} ${q.p4[1].toFixed(3)} ${q.p4[2].toFixed(3)}\n`;
      objText += `f ${vertexCount} ${vertexCount + 1} ${vertexCount + 2} ${vertexCount + 3}\n\n`;
      vertexCount += 4;
    });

    const blob = new Blob([objText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `UAV_Aero_Mesh_${busState.airfoil.name}.obj`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/90 border border-sky-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-md space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-sky-500/20 to-teal-500/20 border border-sky-500/40 rounded-xl text-sky-400">
            <Box className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                3D Аэродинамическая Визуализация Давления и Срыва Потока
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/30">
                CFD PANEL MESH & VORTEX
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Интерактивная 3D полигональная сетка крыла, эпюра давлений $C_p$, динамический срыв пограничного слоя и вихревые жгуты
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadScreenshot}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all font-mono"
            title="Сохранить снимок PNG"
          >
            <Camera className="w-3.5 h-3.5 text-sky-400" />
            Снимок
          </button>
          <button
            onClick={handleDownloadOBJ}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-xs text-white font-medium flex items-center gap-1.5 transition-all shadow-lg font-mono"
          >
            <Download className="w-3.5 h-3.5" />
            Экспорт 3D OBJ
          </button>
        </div>
      </div>

      {/* Main 3D Viewport + Side Telemetry Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left 3D Canvas Area (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          {/* Preset Camera Views & Quick Layers Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs font-mono">
            {/* View presets */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 mr-1">ВИД:</span>
              <button
                onClick={() => handleSetViewPreset('iso')}
                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
              >
                ISO
              </button>
              <button
                onClick={() => handleSetViewPreset('top')}
                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
              >
                Сверху
              </button>
              <button
                onClick={() => handleSetViewPreset('side')}
                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
              >
                Сбоку
              </button>
              <button
                onClick={() => handleSetViewPreset('front')}
                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
              >
                Спереди
              </button>
              <button
                onClick={() => handleSetViewPreset('chase')}
                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
              >
                Хвост
              </button>
            </div>

            {/* Quick Layer Toggles */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowWireframe(!showWireframe)}
                className={`px-2 py-1 rounded flex items-center gap-1 border ${
                  showWireframe ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                <Grid className="w-3 h-3" />
                Сетка
              </button>
              <button
                onClick={() => setShowStreamlines(!showStreamlines)}
                className={`px-2 py-1 rounded flex items-center gap-1 border ${
                  showStreamlines ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                <Wind className="w-3 h-3" />
                Линии тока
              </button>
              <button
                onClick={() => setShowTipVortices(!showTipVortices)}
                className={`px-2 py-1 rounded flex items-center gap-1 border ${
                  showTipVortices ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                <Disc className="w-3 h-3" />
                Концевые вихри
              </button>
              <button
                onClick={() => setIsFlowAnimated(!isFlowAnimated)}
                className={`p-1 rounded border ${
                  isFlowAnimated ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
                title={isFlowAnimated ? 'Пауза потока' : 'Запуск потока'}
              >
                {isFlowAnimated ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* 3D Canvas Viewport */}
          <div className="relative w-full h-[460px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner cursor-grab active:cursor-grabbing">
            <canvas
              ref={canvasRef}
              width={900}
              height={460}
              className="w-full h-full block"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onContextMenu={(e) => e.preventDefault()}
              onWheel={handleWheel}
            />

            {/* In-Canvas HUD Overlay */}
            <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 text-xs font-mono space-y-1 shadow-lg pointer-events-none">
              <div className="flex items-center gap-2 text-sky-300 font-bold">
                <Compass className="w-3.5 h-3.5" />
                Угол атаки &alpha;: {alphaDeg.toFixed(1)}&deg;
              </div>
              <div className="text-[11px] text-slate-300">
                Качество L/D: <b className="text-emerald-400">{aeroAnalysis.LD.toFixed(1)}</b> | C_L: <b>{aeroAnalysis.CL.toFixed(3)}</b> | C_D: <b>{aeroAnalysis.CD.toFixed(4)}</b>
              </div>
              <div className="text-[10px] text-slate-400">
                Подъемная сила: <span className="text-emerald-300 font-bold">{aeroAnalysis.Lift_N.toFixed(1)} Н</span> ({((aeroAnalysis.Lift_N / 9.81) / busState.totalMass_kg * 100).toFixed(0)}% веса)
              </div>
            </div>

            {/* Stall Warning Banner if alpha > stall */}
            {aeroAnalysis.isPostStall && (
              <div className="absolute top-3 right-3 bg-rose-950/90 border border-rose-500/50 backdrop-blur-md px-3.5 py-2 rounded-xl text-xs font-mono text-rose-300 flex items-center gap-2 animate-pulse shadow-lg">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <div>
                  <div className="font-bold text-white">КРИТИЧЕСКИЙ СРЫВ ПОТОКА!</div>
                  <div className="text-[10px] text-rose-300">
                    &alpha; = {alphaDeg.toFixed(1)}&deg; &gt; &alpha;_stall ({aeroAnalysis.alpha_stall_deg.toFixed(1)}&deg;)
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Legend Scale for Cp */}
            <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 text-[10px] font-mono shadow-lg">
              <span className="text-slate-400 block mb-1 font-bold">
                {scalarField === 'cp' ? 'Коэффициент давления (Cp):' : 'Поле распределения:'}
              </span>
              <div className="w-44 h-3 rounded bg-gradient-to-r from-blue-600 via-cyan-400 via-yellow-400 to-red-600 border border-slate-700" />
              <div className="flex justify-between text-slate-400 mt-1">
                <span>-2.5 (Разрежение)</span>
                <span>0.0</span>
                <span>+1.0 (Торможение)</span>
              </div>
            </div>

            {/* Zoom / Pan Help */}
            <div className="absolute bottom-3 right-3 text-[10px] font-mono text-slate-500 pointer-events-none bg-slate-950/60 px-2 py-1 rounded">
              ЛКМ: Вращение | ПКМ: Панорамирование | Колесо: Масштаб
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Controls & Section Analysis (1 col) */}
        <div className="space-y-4">
          {/* Aerodynamic Angle of Attack & Flight Controls */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-xs font-mono">
            <span className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              Параметры Набегающего Потока
            </span>

            {/* Alpha slider */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Угол атаки (&alpha;):</span>
                <span className={`font-bold ${alphaDeg > aeroAnalysis.alpha_stall_deg ? 'text-rose-400' : 'text-sky-300'}`}>
                  {alphaDeg.toFixed(1)}&deg;
                </span>
              </div>
              <input
                type="range"
                min={-4.0}
                max={22.0}
                step={0.5}
                value={alphaDeg}
                onChange={(e) => setAlphaDeg(parseFloat(e.target.value))}
                className="w-full accent-sky-400"
              />
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>-4&deg;</span>
                <span className="text-amber-400">Срыв: {aeroAnalysis.alpha_stall_deg.toFixed(1)}&deg;</span>
                <span>+22&deg;</span>
              </div>
            </div>

            {/* Elevon Deflection slider */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Отклонение элевонов (&delta;_e):</span>
                <span className="text-amber-300 font-bold">{elevonDeflectionDeg.toFixed(1)}&deg;</span>
              </div>
              <input
                type="range"
                min={-20.0}
                max={20.0}
                step={1.0}
                value={elevonDeflectionDeg}
                onChange={(e) => setElevonDeflectionDeg(parseFloat(e.target.value))}
                className="w-full accent-amber-400"
              />
            </div>

            {/* Airspeed slider */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Скорость потока (V_inf):</span>
                <span className="text-teal-300 font-bold">{airspeedMs.toFixed(0)} м/с ({(airspeedMs * 3.6).toFixed(0)} км/ч)</span>
              </div>
              <input
                type="range"
                min={10.0}
                max={50.0}
                step={1.0}
                value={airspeedMs}
                onChange={(e) => setAirspeedMs(parseFloat(e.target.value))}
                className="w-full accent-teal-400"
              />
            </div>
          </div>

          {/* Scalar Field Selection */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 text-xs font-mono">
            <span className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Поле Распределения
            </span>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="radio"
                  name="field"
                  checked={scalarField === 'cp'}
                  onChange={() => setScalarField('cp')}
                  className="accent-sky-400"
                />
                <span>Эпюра давлений (C_p Surface)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="radio"
                  name="field"
                  checked={scalarField === 'stall_separation'}
                  onChange={() => setScalarField('stall_separation')}
                  className="accent-rose-400"
                />
                <span>Зоны срыва пограничного слоя</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="radio"
                  name="field"
                  checked={scalarField === 'cl_circulation'}
                  onChange={() => setScalarField('cl_circulation')}
                  className="accent-teal-400"
                />
                <span>Циркуляция и подъемная сила &Gamma;(y)</span>
              </label>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">ПАЛИТРА:</span>
              <select
                value={colorMap}
                onChange={(e) => setColorMap(e.target.value as ColorMapName)}
                className="bg-slate-900 border border-slate-700 text-xs rounded px-2 py-0.5 text-slate-200"
              >
                <option value="turbo">Turbo (Aero CFD)</option>
                <option value="coolwarm">Cool-Warm (Cp Suction)</option>
                <option value="jet">Jet Classical</option>
                <option value="plasma">Plasma</option>
                <option value="viridis">Viridis</option>
              </select>
            </div>
          </div>

          {/* Realtime 2D Chordwise Section Cp Plot */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-teal-400" />
                Срез Cp(x/c)
              </span>
              <span className="text-[10px] text-teal-300">y = {(activeSectionSpan * 100).toFixed(0)}%</span>
            </div>

            {/* Mini SVG Plot of Cp chordwise */}
            <div className="w-full h-24 bg-slate-900/90 rounded-lg p-1 relative border border-slate-800">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 60">
                {/* Zero line */}
                <line x1="5" y1="35" x2="95" y2="35" stroke="#334155" strokeWidth="0.8" strokeDasharray="2,2" />
                {/* Upper Surface Cp (Suction - goes UP in aeronautics convention) */}
                <path
                  d={`M 5,35 Q 15,${Math.max(5, 35 - alphaDeg * 2.8)} 50,30 T 95,36`}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.8"
                />
                {/* Lower Surface Cp (Compression) */}
                <path
                  d="M 5,35 Q 25,44 60,40 T 95,36"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                />
              </svg>
              <div className="absolute top-1 left-2 text-[8px] text-sky-400">-Cp (Разрежение)</div>
              <div className="absolute bottom-1 left-2 text-[8px] text-rose-400">+Cp (Подпор)</div>
              <div className="absolute bottom-1 right-2 text-[8px] text-slate-500">x/c &rarr;</div>
            </div>

            <div className="text-[10px] text-slate-400 leading-tight">
              Пик разрежения смещается к носку при росте &alpha;, вызывая градиент неблагоприятного давления.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
