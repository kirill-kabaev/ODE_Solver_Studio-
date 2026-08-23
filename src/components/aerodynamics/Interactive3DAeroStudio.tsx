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
  SunMedium,
  Grid,
  Move,
  Compass,
  Activity,
  Download,
  Info,
  Wind,
  Scissors,
  Flame,
  Play,
  Pause,
  Columns,
  Crosshair,
  Camera,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Disc,
} from 'lucide-react';
import { MathView, MathText } from '../MathView';
import { createHardware2DContext } from '../../utils/gpuHardwareEnforcer';
import { VirtualJoystick, JoystickMode, JoystickValue } from '../telemetry/VirtualJoystick';
import { UniversalCockpitHUDModal } from '../telemetry/UniversalCockpitHUDModal';
import { FullscreenGraphButton } from '../telemetry/FullscreenGraphButton';

export type VisualStudioMode = 'cut_plane' | 'vortex_q' | 'smoke_stream' | 'probe' | 'comparator';
export type SlicingAxis = 'X' | 'Y' | 'Z';
export type ScalarFieldType = 'cp' | 'velocity' | 'mach' | 'vorticity' | 'tke';
export type ColorMapType = 'turbo' | 'coolwarm' | 'viridis' | 'jet' | 'plasma' | 'schlieren';

export interface Interactive3DAeroStudioProps {
  initialMach?: number;
  initialAlpha?: number;
}

interface Particle3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  rakeId: number;
}

export const Interactive3DAeroStudio: React.FC<Interactive3DAeroStudioProps> = ({
  initialMach = 0.82,
  initialAlpha = 4.2,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const compareCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active Visual Mode
  const [activeMode, setActiveMode] = useState<VisualStudioMode>('cut_plane');

  // Aerodynamic Parameters
  const [mach, setMach] = useState<number>(initialMach);
  const [alpha, setAlpha] = useState<number>(initialAlpha);
  const [wingType, setWingType] = useState<'transonic_swept' | 'delta_vortex' | 'high_aspect_glider' | 'winglet_blended'>('transonic_swept');

  // Comparator Configuration B parameters
  const [compWingType, setCompWingType] = useState<'transonic_swept' | 'delta_vortex' | 'high_aspect_glider' | 'winglet_blended'>('winglet_blended');
  const [compAlpha, setCompAlpha] = useState<number>(initialAlpha);

  // 1. Cut-Plane Settings
  const [sliceAxis, setSliceAxis] = useState<SlicingAxis>('Y');
  const [slicePosition, setSlicePosition] = useState<number>(0.45); // Normalized [-1, 1] or [0, 1]
  const [showMultiPlanes, setShowMultiPlanes] = useState<boolean>(false);
  const [showVectorsOnPlane, setShowVectorsOnPlane] = useState<boolean>(true);
  const [showIsoContours, setShowIsoContours] = useState<boolean>(true);

  // 2. Q-Criterion & Vortex Settings
  const [qThreshold, setQThreshold] = useState<number>(0.55); // 0.1 to 1.5
  const [vortexCoreOpacity, setVortexCoreOpacity] = useState<number>(0.85);
  const [showWakeRollup, setShowWakeRollup] = useState<boolean>(true);
  const [vortexColorMode, setVortexColorMode] = useState<'vorticity' | 'pressure' | 'helicity'>('vorticity');

  // 3. Smoke & Streamlines Settings
  const [isSmokeActive, setIsSmokeActive] = useState<boolean>(true);
  const [smokeRakePos, setSmokeRakePos] = useState<{ x: number; y: number; z: number }>({ x: -140, y: 0, z: 0 });
  const [smokeParticleCount, setSmokeParticleCount] = useState<number>(180);
  const [smokeSpeed, setSmokeSpeed] = useState<number>(1.2);
  const [smokeDispersion, setSmokeDispersion] = useState<number>(0.25);
  const [smokeColorMode, setSmokeColorMode] = useState<'velocity' | 'pressure' | 'particle_id'>('velocity');

  // 4. Probe Inspector Settings
  const [isProbeActive, setIsProbeActive] = useState<boolean>(true);
  const [probePos, setProbePos] = useState<{ x: number; y: number; z: number }>({ x: 10, y: 8, z: 45 });
  const [probeResults, setProbeResults] = useState<{
    cp: number;
    velMag: number;
    machLoc: number;
    vorticity: number;
    tauW: number;
    blDelta: number;
    status: string;
  }>({
    cp: -1.24,
    velMag: 1.18,
    machLoc: 0.97,
    vorticity: 42.5,
    tauW: 18.2,
    blDelta: 4.8,
    status: 'Сверхкритическое ускорение (Suction Peak)',
  });

  // General 3D Viewport Controls
  const rotXRef = useRef<number>(24);
  const rotYRef = useRef<number>(-38);
  const zoomRef = useRef<number>(1.1);
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef<boolean>(false);
  const isPanningRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [colorMap, setColorMap] = useState<ColorMapType>('turbo');
  const [activeScalar, setActiveScalar] = useState<ScalarFieldType>('cp');
  const [showWireframe, setShowWireframe] = useState<boolean>(true);
  const [showSurface, setShowSurface] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [showVirtualJoystick, setShowVirtualJoystick] = useState<boolean>(false);
  const [isCockpitOpen, setIsCockpitOpen] = useState<boolean>(false);
  const [joystickMode, setJoystickMode] = useState<JoystickMode>('camera_orbit');
  const autoRotateRef = useRef<boolean>(autoRotate);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  const handleJoystickChange = useCallback(
    (val: JoystickValue) => {
      if (!val.active && val.distance === 0) return;
      setAutoRotate(false);
      if (joystickMode === 'camera_orbit') {
        rotYRef.current = (rotYRef.current + val.x * 2.8) % 360;
        rotXRef.current = Math.max(-85, Math.min(85, rotXRef.current - val.y * 2.8));
      } else if (joystickMode === 'aero_flow') {
        setAlpha((prev) => parseFloat(Math.max(-4, Math.min(22, prev + val.y * 0.15)).toFixed(2)));
        setMach((prev) => parseFloat(Math.max(0.1, Math.min(2.5, prev + val.x * 0.01)).toFixed(3)));
      } else if (joystickMode === 'target_guidance') {
        panRef.current.x += val.x * 4;
        panRef.current.y -= val.y * 4;
      }
    },
    [joystickMode]
  );

  // Particle System Ref for 60fps smoke advection
  const particlesRef = useRef<Particle3D[]>([]);

  // Initialize Particle Emitters
  useEffect(() => {
    const particles: Particle3D[] = [];
    const count = smokeParticleCount;
    for (let i = 0; i < count; i++) {
      const rakeIdx = i % 15;
      const rakeSpan = (rakeIdx / 14 - 0.5) * 260;
      particles.push({
        x: -160 + (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * 15,
        z: rakeSpan,
        vx: 2.2,
        vy: 0,
        vz: 0,
        life: Math.random() * 120,
        maxLife: 100 + Math.random() * 40,
        rakeId: rakeIdx,
      });
    }
    particlesRef.current = particles;
  }, [smokeParticleCount]);

  // Mouse / Touch Interaction for 3D Camera
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2 || e.shiftKey) {
      isPanningRef.current = true;
    } else {
      isDraggingRef.current = true;
    }
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setAutoRotate(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      rotYRef.current = (rotYRef.current + dx * 0.45) % 360;
      rotXRef.current = Math.max(-85, Math.min(85, rotXRef.current + dy * 0.45));
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    } else if (isPanningRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      panRef.current.x += dx * 0.8;
      panRef.current.y += dy * 0.8;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    } else if (activeMode === 'probe') {
      // Interactive 3D probe hover
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const normX = (mouseX / rect.width - 0.5) * 2;
      const normY = (mouseY / rect.height - 0.5) * 2;

      // Update probe position in 3D coordinate space
      const probedX = normX * 120;
      const probedZ = normY * 160;
      const chordFrac = Math.max(0, Math.min(1, (probedX + 60) / 120));
      const spanFrac = Math.abs(probedZ) / 160;

      const baseCp = -2.2 * Math.exp(-chordFrac * 3.5) * (1 - chordFrac) + (mach > 0.75 && chordFrac > 0.45 ? 0.95 : -0.15);
      const velLocal = Math.sqrt(Math.max(0.1, 1 - baseCp));
      const machLoc = velLocal * mach;
      const vorticityVal = 20 * (1 - chordFrac) + 85 * Math.pow(spanFrac, 3);
      const tauWVal = Math.max(0, 24 * (1 - chordFrac * 0.95) - (alpha > 12 && chordFrac > 0.6 ? 20 : 0));
      const blDeltaVal = 1.2 + 8.5 * Math.pow(chordFrac, 0.8);

      let statusMsg = 'Ламинарное / Присоединенное обтекание';
      if (tauWVal < 1.5) statusMsg = '⚠️ Зона вероятного срыва потока / Турбулентный след';
      else if (machLoc > 1.0) statusMsg = '⚡ Местная сверхзвуковая зона (Wave Drag)';
      else if (chordFrac < 0.15) statusMsg = '⭐ Пик разрежения передней кромки (Suction Peak)';

      setProbePos({ x: Math.round(probedX), y: 8, z: Math.round(probedZ) });
      setProbeResults({
        cp: parseFloat(baseCp.toFixed(3)),
        velMag: parseFloat(velLocal.toFixed(3)),
        machLoc: parseFloat(machLoc.toFixed(3)),
        vorticity: parseFloat(vorticityVal.toFixed(1)),
        tauW: parseFloat(tauWVal.toFixed(1)),
        blDelta: parseFloat(blDeltaVal.toFixed(2)),
        status: statusMsg,
      });
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    zoomRef.current = Math.max(0.4, Math.min(3.2, zoomRef.current - e.deltaY * 0.0012));
  };

  // Camera Presets
  const setCameraPreset = (preset: 'iso' | 'top' | 'front' | 'side' | 'wingtip') => {
    setAutoRotate(false);
    panRef.current = { x: 0, y: 0 };
    switch (preset) {
      case 'iso':
        rotXRef.current = 24;
        rotYRef.current = -38;
        zoomRef.current = 1.1;
        break;
      case 'top':
        rotXRef.current = 89;
        rotYRef.current = 0;
        zoomRef.current = 1.2;
        break;
      case 'front':
        rotXRef.current = 0;
        rotYRef.current = -90;
        zoomRef.current = 1.25;
        break;
      case 'side':
        rotXRef.current = 0;
        rotYRef.current = 0;
        zoomRef.current = 1.35;
        break;
      case 'wingtip':
        rotXRef.current = 15;
        rotYRef.current = -125;
        zoomRef.current = 1.5;
        break;
    }
  };

  // Colormap Color Evaluator
  const getColormapRGB = useCallback((val: number, cmap: ColorMapType): [number, number, number] => {
    const t = Math.max(0, Math.min(1, val));
    if (cmap === 'turbo') {
      const r = Math.sin(t * Math.PI * 1.5) * 255;
      const g = Math.sin(t * Math.PI) * 255;
      const b = Math.cos(t * Math.PI * 1.5) * 255;
      return [
        Math.max(0, Math.min(255, Math.floor(r > 0 ? r : 30))),
        Math.max(0, Math.min(255, Math.floor(g > 0 ? g : 20))),
        Math.max(0, Math.min(255, Math.floor(b > 0 ? b : 180))),
      ];
    } else if (cmap === 'coolwarm') {
      // Diverging Blue -> White -> Red
      const r = Math.floor(Math.min(255, t * 2 * 255));
      const g = Math.floor(255 - Math.abs(t - 0.5) * 2 * 200);
      const b = Math.floor(Math.min(255, (1 - t) * 2 * 255));
      return [r, g, b];
    } else if (cmap === 'viridis') {
      const r = Math.floor(68 + 185 * Math.pow(t, 2));
      const g = Math.floor(1 + 230 * t);
      const b = Math.floor(84 + 150 * (1 - t));
      return [r, g, b];
    } else if (cmap === 'schlieren') {
      const lum = Math.floor(t * 255);
      return [lum, lum, lum];
    } else {
      // Jet
      const r = Math.floor(Math.max(0, Math.min(255, 255 * (1.5 - Math.abs(4 * t - 3)))));
      const g = Math.floor(Math.max(0, Math.min(255, 255 * (1.5 - Math.abs(4 * t - 2)))));
      const b = Math.floor(Math.max(0, Math.min(255, 255 * (1.5 - Math.abs(4 * t - 1)))));
      return [r, g, b];
    }
  }, []);

  // Main 3D Canvas Rendering Loop (Hardware Accelerated)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = createHardware2DContext(canvas);
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const renderScene = () => {
      time += 0.025;
      if (autoRotateRef.current && !isDraggingRef.current) {
        rotYRef.current = (rotYRef.current + 0.3) % 360;
      }

      const w = canvas.width;
      const h = canvas.height;
      const cx = w * 0.5 + panRef.current.x;
      const cy = h * 0.52 + panRef.current.y;

      // Dark Futuristic Background
      ctx.fillStyle = '#060911';
      ctx.fillRect(0, 0, w, h);

      // Coordinate System 3D Projection Matrix
      const radX = (rotXRef.current * Math.PI) / 180;
      const radY = (rotYRef.current * Math.PI) / 180;
      const alphaRad = (alpha * Math.PI) / 180;

      const project3D = (x: number, y: number, z: number): [number, number, number] => {
        // Pitch with alpha
        const cosA = Math.cos(alphaRad);
        const sinA = Math.sin(alphaRad);
        const xA = x * cosA - y * sinA;
        const yA = x * sinA + y * cosA;
        const zA = z;

        // Yaw Y
        const cosY = Math.cos(radY);
        const sinY = Math.sin(radY);
        const x1 = xA * cosY + zA * sinY;
        const y1 = yA;
        const z1 = -xA * sinY + zA * cosY;

        // Pitch X
        const cosX = Math.cos(radX);
        const sinX = Math.sin(radX);
        const x2 = x1;
        const y2 = y1 * cosX - z1 * sinX;
        const z2 = y1 * sinX + z1 * cosX;

        // Perspective Camera
        const distance = 460;
        const scale = (distance / (distance + z2)) * zoomRef.current;
        const screenX = cx + x2 * scale;
        const screenY = cy - y2 * scale;

        return [screenX, screenY, z2];
      };

      // 1. Draw 3D Ground Spatial Grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      const gridSize = 240;
      const gridStep = 48;
      const groundY = -110;

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

      // 2. Generate 3D Wing Geometry According to Type
      let semiSpan = 180;
      let rootChord = 140;
      let tipChord = 65;
      let sweepAngle = (28 * Math.PI) / 180;
      let dihedralAngle = (3.5 * Math.PI) / 180;
      let hasWinglet = wingType === 'winglet_blended';

      if (wingType === 'delta_vortex') {
        semiSpan = 130;
        rootChord = 190;
        tipChord = 15;
        sweepAngle = (55 * Math.PI) / 180;
        dihedralAngle = 0;
      } else if (wingType === 'high_aspect_glider') {
        semiSpan = 250;
        rootChord = 90;
        tipChord = 35;
        sweepAngle = (6 * Math.PI) / 180;
        dihedralAngle = (5 * Math.PI) / 180;
      }

      const spanSteps = 16;
      const chordSteps = 20;

      interface RenderPolygon {
        pts: [number, number, number][];
        avgZ: number;
        color: string;
        strokeColor: string;
        isPlane?: boolean;
      }

      const renderList: RenderPolygon[] = [];

      // Wing Surfaces Generation
      if (showSurface) {
        for (let side = -1; side <= 1; side += 2) {
          for (let s = 0; s < spanSteps; s++) {
            const eta0 = s / spanSteps;
            const eta1 = (s + 1) / spanSteps;

            const z0 = side * eta0 * semiSpan;
            const z1 = side * eta1 * semiSpan;

            const xLE0 = Math.tan(sweepAngle) * Math.abs(z0);
            const xLE1 = Math.tan(sweepAngle) * Math.abs(z1);

            const yD0 = Math.tan(dihedralAngle) * Math.abs(z0);
            const yD1 = Math.tan(dihedralAngle) * Math.abs(z1);

            const chord0 = rootChord - (rootChord - tipChord) * eta0;
            const chord1 = rootChord - (rootChord - tipChord) * eta1;

            for (let c = 0; c < chordSteps; c++) {
              const xi0 = c / chordSteps;
              const xi1 = (c + 1) / chordSteps;

              // NACA airfoil thickness
              const getThick = (xi: number) =>
                0.12 * 5 * (0.2969 * Math.sqrt(xi) - 0.126 * xi - 0.3516 * xi * xi + 0.2843 * Math.pow(xi, 3) - 0.1015 * Math.pow(xi, 4));

              const yt0 = getThick(xi0);
              const yt1 = getThick(xi1);

              // Upper Quad
              const p1 = project3D(xLE0 + xi0 * chord0 - rootChord * 0.35, yD0 + yt0 * chord0, z0);
              const p2 = project3D(xLE1 + xi0 * chord1 - rootChord * 0.35, yD1 + yt0 * chord1, z1);
              const p3 = project3D(xLE1 + xi1 * chord1 - rootChord * 0.35, yD1 + yt1 * chord1, z1);
              const p4 = project3D(xLE0 + xi1 * chord0 - rootChord * 0.35, yD0 + yt1 * chord0, z0);

              const avgZ = (p1[2] + p2[2] + p3[2] + p4[2]) / 4;

              // Calculate scalar value for colormap
              let scalarNormalized = 0.5;
              if (activeScalar === 'cp') {
                const cp = -2.0 * Math.exp(-xi0 * 3.5) * (1 - xi0) + (mach > 0.8 && xi0 > 0.45 ? 0.9 : -0.15);
                scalarNormalized = (cp + 2.5) / 3.5; // [-2.5, 1.0] -> [0, 1]
              } else if (activeScalar === 'mach') {
                const localMach = mach * (1.35 * Math.exp(-xi0 * 2.0) + 0.85);
                scalarNormalized = localMach / 1.6;
              } else if (activeScalar === 'velocity') {
                const vel = 1.3 * Math.exp(-xi0 * 2.5) + 0.7;
                scalarNormalized = vel / 1.8;
              } else {
                scalarNormalized = Math.abs(Math.sin(xi0 * Math.PI));
              }

              const [r, g, b] = getColormapRGB(scalarNormalized, colorMap);

              renderList.push({
                pts: [p1, p2, p3, p4],
                avgZ,
                color: `rgba(${r}, ${g}, ${b}, 0.85)`,
                strokeColor: showWireframe ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              });
            }
          }

          // Blended Winglet if enabled
          if (hasWinglet) {
            const zTip = side * semiSpan;
            const xTipLE = Math.tan(sweepAngle) * semiSpan - rootChord * 0.35;
            const wingletHeight = 35;

            const w1 = project3D(xTipLE, 0, zTip);
            const w2 = project3D(xTipLE + tipChord * 0.3, wingletHeight, zTip + side * 8);
            const w3 = project3D(xTipLE + tipChord * 0.9, wingletHeight * 0.85, zTip + side * 10);
            const w4 = project3D(xTipLE + tipChord, 0, zTip);

            renderList.push({
              pts: [w1, w2, w3, w4],
              avgZ: (w1[2] + w2[2] + w3[2] + w4[2]) / 4,
              color: 'rgba(56, 189, 248, 0.85)',
              strokeColor: 'rgba(255, 255, 255, 0.4)',
            });
          }
        }
      }

      // 3. Dynamic Cut-Plane Rendering (Interactive Slice)
      if (activeMode === 'cut_plane') {
        const sliceXRange = [-140, 160];
        const sliceYRange = [-50, 60];
        const sliceZRange = [-semiSpan * 1.15, semiSpan * 1.15];

        const slicePlanesToDraw: SlicingAxis[] = showMultiPlanes ? ['X', 'Y', 'Z'] : [sliceAxis];

        for (const axis of slicePlanesToDraw) {
          const planeResU = 14;
          const planeResV = 14;

          for (let u = 0; u < planeResU; u++) {
            for (let v = 0; v < planeResV; v++) {
              const u0 = u / planeResU;
              const u1 = (u + 1) / planeResU;
              const v0 = v / planeResV;
              const v1 = (v + 1) / planeResV;

              let p3d1: [number, number, number],
                p3d2: [number, number, number],
                p3d3: [number, number, number],
                p3d4: [number, number, number];

              let sampleX = 0, sampleY = 0, sampleZ = 0;

              if (axis === 'Y') {
                // Spanwise Cut-Plane Y=const or Z=const
                const curZ = slicePosition * semiSpan;
                sampleZ = curZ;
                sampleX = sliceXRange[0] + u0 * (sliceXRange[1] - sliceXRange[0]);
                sampleY = sliceYRange[0] + v0 * (sliceYRange[1] - sliceYRange[0]);

                const x0 = sliceXRange[0] + u0 * (sliceXRange[1] - sliceXRange[0]);
                const x1 = sliceXRange[0] + u1 * (sliceXRange[1] - sliceXRange[0]);
                const y0 = sliceYRange[0] + v0 * (sliceYRange[1] - sliceYRange[0]);
                const y1 = sliceYRange[0] + v1 * (sliceYRange[1] - sliceYRange[0]);

                p3d1 = project3D(x0, y0, curZ);
                p3d2 = project3D(x1, y0, curZ);
                p3d3 = project3D(x1, y1, curZ);
                p3d4 = project3D(x0, y1, curZ);
              } else if (axis === 'X') {
                // Chordwise Cross-Section Plane X=const
                const curX = sliceXRange[0] + slicePosition * (sliceXRange[1] - sliceXRange[0]);
                sampleX = curX;
                sampleY = sliceYRange[0] + u0 * (sliceYRange[1] - sliceYRange[0]);
                sampleZ = sliceZRange[0] + v0 * (sliceZRange[1] - sliceZRange[0]);

                const y0 = sliceYRange[0] + u0 * (sliceYRange[1] - sliceYRange[0]);
                const y1 = sliceYRange[0] + u1 * (sliceYRange[1] - sliceYRange[0]);
                const z0 = sliceZRange[0] + v0 * (sliceZRange[1] - sliceZRange[0]);
                const z1 = sliceZRange[0] + v1 * (sliceZRange[1] - sliceZRange[0]);

                p3d1 = project3D(curX, y0, z0);
                p3d2 = project3D(curX, y1, z0);
                p3d3 = project3D(curX, y1, z1);
                p3d4 = project3D(curX, y0, z1);
              } else {
                // Horizontal Plane Z=const or Y=const
                const curY = sliceYRange[0] + slicePosition * (sliceYRange[1] - sliceYRange[0]);
                sampleY = curY;
                sampleX = sliceXRange[0] + u0 * (sliceXRange[1] - sliceXRange[0]);
                sampleZ = sliceZRange[0] + v0 * (sliceZRange[1] - sliceZRange[0]);

                const x0 = sliceXRange[0] + u0 * (sliceXRange[1] - sliceXRange[0]);
                const x1 = sliceXRange[0] + u1 * (sliceXRange[1] - sliceXRange[0]);
                const z0 = sliceZRange[0] + v0 * (sliceZRange[1] - sliceZRange[0]);
                const z1 = sliceZRange[0] + v1 * (sliceZRange[1] - sliceZRange[0]);

                p3d1 = project3D(x0, curY, z0);
                p3d2 = project3D(x1, curY, z0);
                p3d3 = project3D(x1, curY, z1);
                p3d4 = project3D(x0, curY, z1);
              }

              // Flow field physics formula on cut-plane
              const distFromLE = Math.hypot(sampleX + 30, sampleY - 5);
              const rNorm = Math.max(0.1, distFromLE / 80);
              const wakeEffect = sampleX > 40 ? Math.exp(-Math.pow(sampleY / 15, 2)) * 0.4 : 0;
              const scalarVal = Math.max(0, Math.min(1, 0.85 / rNorm - wakeEffect + (mach > 0.8 ? 0.2 : 0)));

              const [r, g, b] = getColormapRGB(scalarVal, colorMap);
              const avgZ = (p3d1[2] + p3d2[2] + p3d3[2] + p3d4[2]) / 4;

              renderList.push({
                pts: [p3d1, p3d2, p3d3, p3d4],
                avgZ: avgZ + 0.1, // slight bias
                color: `rgba(${r}, ${g}, ${b}, 0.72)`,
                strokeColor: showIsoContours ? `rgba(${r}, ${g}, ${b}, 0.9)` : 'rgba(255, 255, 255, 0.08)',
                isPlane: true,
              });
            }
          }
        }
      }

      // Sort all 3D Polygons by Painter's Algorithm Depth (Back to Front)
      renderList.sort((a, b) => b.avgZ - a.avgZ);

      // Draw all 3D Sorted Polygons
      for (const poly of renderList) {
        ctx.beginPath();
        ctx.moveTo(poly.pts[0][0], poly.pts[0][1]);
        for (let i = 1; i < poly.pts.length; i++) {
          ctx.lineTo(poly.pts[i][0], poly.pts[i][1]);
        }
        ctx.closePath();
        ctx.fillStyle = poly.color;
        ctx.fill();

        if (poly.strokeColor !== 'transparent') {
          ctx.strokeStyle = poly.strokeColor;
          ctx.lineWidth = poly.isPlane ? 1.2 : 0.8;
          ctx.stroke();
        }
      }

      // 4. Q-Criterion & 3D Volumetric Vortex Core Tubes
      if (activeMode === 'vortex_q' || showWakeRollup) {
        for (let side = -1; side <= 1; side += 2) {
          const zTip = side * semiSpan;
          const xTip = Math.tan(sweepAngle) * semiSpan - rootChord * 0.35 + tipChord * 0.8;
          const yTip = Math.tan(dihedralAngle) * semiSpan;

          // Spiral Vortex Core Rollup Points
          const vortexSteps = 28;
          const corePoints: [number, number, number][] = [];

          for (let k = 0; k < vortexSteps; k++) {
            const xi = k / vortexSteps;
            const xWake = xTip + xi * 220;
            // Helical radius and swirl angle
            const coreRadius = (4 + xi * 16) * (qThreshold / 0.55);
            const swirlTheta = xi * 14 + time * 2;
            const yWake = yTip + (alpha * 0.8) * xi + Math.sin(swirlTheta) * coreRadius;
            const zWake = zTip - side * (xi * 18) + Math.cos(swirlTheta) * coreRadius;

            corePoints.push(project3D(xWake, yWake, zWake));
          }

          // Draw Volumetric Swirling Glow
          ctx.beginPath();
          ctx.moveTo(corePoints[0][0], corePoints[0][1]);
          for (let k = 1; k < corePoints.length; k++) {
            ctx.lineTo(corePoints[k][0], corePoints[k][1]);
          }
          ctx.strokeStyle = `rgba(168, 85, 247, ${vortexCoreOpacity})`;
          ctx.lineWidth = 4 * zoomRef.current;
          ctx.lineCap = 'round';
          ctx.stroke();

          // Outer Q-Iso Surface Shimmer
          ctx.beginPath();
          ctx.moveTo(corePoints[0][0], corePoints[0][1]);
          for (let k = 1; k < corePoints.length; k++) {
            ctx.lineTo(corePoints[k][0], corePoints[k][1]);
          }
          ctx.strokeStyle = `rgba(56, 189, 248, ${vortexCoreOpacity * 0.4})`;
          ctx.lineWidth = 14 * zoomRef.current;
          ctx.stroke();
        }
      }

      // 5. Smoke Generator & 3D Particle Advection
      if (activeMode === 'smoke_stream' && isSmokeActive) {
        const particles = particlesRef.current;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];

          // 3D Velocity Field Advection
          const distToWing = Math.hypot(p.x, p.z);
          const upwash = p.x < 0 ? Math.sin((p.x / 100) * Math.PI) * (alpha * 0.25) : -Math.sin((p.x / 100) * Math.PI) * (alpha * 0.35);

          // Vortex swirl effect near wingtips
          const tipDistL = Math.hypot(p.y, p.z - semiSpan);
          const tipDistR = Math.hypot(p.y, p.z + semiSpan);
          let swirlY = 0;
          let swirlZ = 0;

          if (tipDistL < 60 && p.x > 0) {
            swirlY = -Math.sin(time * 4) * (alpha * 0.4);
            swirlZ = -Math.cos(time * 4) * (alpha * 0.4);
          } else if (tipDistR < 60 && p.x > 0) {
            swirlY = Math.sin(time * 4) * (alpha * 0.4);
            swirlZ = Math.cos(time * 4) * (alpha * 0.4);
          }

          p.x += (p.vx * smokeSpeed) * 1.8;
          p.y += (upwash + swirlY) * 0.15;
          p.z += swirlZ * 0.15;
          p.life++;

          // Reset particle at smoke rake
          if (p.x > 260 || p.life > p.maxLife) {
            p.x = smokeRakePos.x + (Math.random() - 0.5) * 15;
            p.y = smokeRakePos.y + (Math.random() - 0.5) * 10;
            const rakeSpan = (p.rakeId / 14 - 0.5) * 260;
            p.z = rakeSpan + (Math.random() - 0.5) * 5;
            p.life = 0;
          }

          // Project particle to screen
          const [px, py, pz] = project3D(p.x, p.y, p.z);
          const alphaFade = Math.sin((p.life / p.maxLife) * Math.PI);

          ctx.beginPath();
          ctx.arc(px, py, Math.max(1, 2.5 * zoomRef.current), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(244, 244, 245, ${alphaFade * 0.75})`;
          ctx.fill();

          // Tail streakline
          const [tailX, tailY] = project3D(p.x - 12 * smokeSpeed, p.y, p.z);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(tailX, tailY);
          ctx.strokeStyle = `rgba(56, 189, 248, ${alphaFade * 0.45})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }

      // 6. Interactive 3D Probe Reticle Marker
      if (activeMode === 'probe' && isProbeActive) {
        const [prbX, prbY] = project3D(probePos.x, probePos.y, probePos.z);

        // Pulsing Reticle Ring
        const pulse = 10 + Math.sin(time * 6) * 4;
        ctx.beginPath();
        ctx.arc(prbX, prbY, pulse, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(prbX - pulse - 6, prbY);
        ctx.lineTo(prbX + pulse + 6, prbY);
        ctx.moveTo(prbX, prbY - pulse - 6);
        ctx.lineTo(prbX, prbY + pulse + 6);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 3D Normal Vector Arrow
        const [arrowHeadX, arrowHeadY] = project3D(probePos.x, probePos.y + 35, probePos.z);
        ctx.beginPath();
        ctx.moveTo(prbX, prbY);
        ctx.lineTo(arrowHeadX, arrowHeadY);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      animId = requestAnimationFrame(renderScene);
    };

    animId = requestAnimationFrame(renderScene);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [
    alpha,
    mach,
    wingType,
    activeMode,
    sliceAxis,
    slicePosition,
    showMultiPlanes,
    showIsoContours,
    qThreshold,
    vortexCoreOpacity,
    showWakeRollup,
    isSmokeActive,
    smokeSpeed,
    smokeRakePos,
    isProbeActive,
    probePos,
    colorMap,
    activeScalar,
    showWireframe,
    showSurface,
    getColormapRGB,
  ]);

  // Export Screenshot Feature
  const handleExportScreenshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `3d_aero_${activeMode}_M${mach}_A${alpha}.png`;
    a.click();
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Top Visual Mode Navigation Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          <button
            type="button"
            onClick={() => setActiveMode('cut_plane')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeMode === 'cut_plane'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-950/60 font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>1. Динамический 3D-Срез ($X, Y, Z$)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('vortex_q')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeMode === 'vortex_q'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-950/60 font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Disc className="w-4 h-4" />
            <span>2. Q-Критерий & Вихри</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('smoke_stream')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeMode === 'smoke_stream'
                ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-lg shadow-emerald-950/60 font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Wind className="w-4 h-4" />
            <span>3. Аэродинамический Дым</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('probe')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeMode === 'probe'
                ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-950/60 font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Crosshair className="w-4 h-4" />
            <span>4. Инспектор-Зонд (Probe)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('comparator')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeMode === 'comparator'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-950/60 font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Columns className="w-4 h-4" />
            <span>5. Side-by-Side Сравнение</span>
          </button>
        </div>

        {/* Quick Screenshot Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportScreenshot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-bold text-xs transition-all cursor-pointer shrink-0"
            title="Экспортировать снимок 3D визуализации высокого разрешения"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>Снимок 3D</span>
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Viewport + Control Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Left: 3D Canvas Viewport Area */}
        <div className="lg:col-span-3 space-y-3">
          <div className="relative w-full h-[540px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <canvas
              ref={canvasRef}
              width={1000}
              height={540}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onWheel={handleWheel}
              onContextMenu={(e) => e.preventDefault()}
              className="w-full h-full cursor-grab active:cursor-grabbing block"
            />

            {/* Viewport Overlay Controls (Camera Presets & Toggles) */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 text-xs font-mono">
              <span className="text-slate-400 px-1 text-[10px] font-bold">Ракурс:</span>
              <button
                type="button"
                onClick={() => setCameraPreset('iso')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-[10px]"
              >
                3D Изометрия
              </button>
              <button
                type="button"
                onClick={() => setCameraPreset('top')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px]"
              >
                Сверху (План)
              </button>
              <button
                type="button"
                onClick={() => setCameraPreset('front')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px]"
              >
                Спереди
              </button>
              <button
                type="button"
                onClick={() => setCameraPreset('wingtip')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 text-[10px]"
              >
                Законцовка
              </button>
              <button
                type="button"
                onClick={() => setAutoRotate(!autoRotate)}
                className={`p-1 rounded text-xs ${autoRotate ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}
                title="Автоматическое вращение 3D сцены"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Colormap Legend Bar at Bottom Left */}
            <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-md p-2 rounded-xl border border-slate-800 text-xs font-mono flex flex-col gap-1 shadow-lg">
              <div className="flex items-center justify-between text-[10px] text-slate-300 font-bold">
                <span>{activeScalar === 'cp' ? 'Коэффициент давления Cp' : activeScalar === 'mach' ? 'Число Маха M_loc' : 'Скорость V/V_inf'}</span>
                <span className="text-cyan-400 font-black">{activeScalar === 'cp' ? '-2.5 ... +1.0' : activeScalar === 'mach' ? '0.0 ... 1.6' : '0.0 ... 1.8'}</span>
              </div>
              <div
                className="w-48 h-3 rounded-full border border-slate-700 shadow-inner"
                style={{
                  background:
                    colorMap === 'coolwarm'
                      ? 'linear-gradient(to right, #3b82f6, #ffffff, #ef4444)'
                      : colorMap === 'viridis'
                      ? 'linear-gradient(to right, #440154, #21908d, #fde725)'
                      : 'linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)',
                }}
              />
              <div className="flex items-center justify-between text-[9px] text-slate-400">
                <span>Разрежение / Разгон</span>
                <span>Торможение / Удар</span>
              </div>
            </div>

            {/* Probe HUD Box at Top Right when in Probe Mode */}
            {activeMode === 'probe' && (
              <div className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-rose-500/50 shadow-2xl text-xs font-mono space-y-2 max-w-xs animate-fadeIn">
                <div className="flex items-center gap-2 text-rose-400 font-bold">
                  <Crosshair className="w-4 h-4" />
                  <span>3D Зонд-Инспектор</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">Давление Cp:</span>
                    <strong className="text-emerald-400 font-black text-xs">{probeResults.cp}</strong>
                  </div>
                  <div className="bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">Мах M_loc:</span>
                    <strong className="text-cyan-300 font-black text-xs">{probeResults.machLoc}</strong>
                  </div>
                  <div className="bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">Завихренность ω:</span>
                    <strong className="text-purple-300 font-black text-xs">{probeResults.vorticity} 1/с</strong>
                  </div>
                  <div className="bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">Трение τ_w:</span>
                    <strong className="text-amber-300 font-black text-xs">{probeResults.tauW} Па</strong>
                  </div>
                </div>
                <p className="text-[10px] text-slate-300 bg-rose-950/40 p-1.5 rounded-lg border border-rose-900/60">
                  {probeResults.status}
                </p>
                <span className="text-[9px] text-slate-500 block">
                  Координаты: X={probePos.x} | Y={probePos.y} | Z={probePos.z}
                </span>
              </div>
            )}

            {/* Interactive On-Canvas Virtual Joystick Overlay */}
            {showVirtualJoystick && (
              <div className="absolute bottom-14 right-3 z-30 animate-slideUp">
                <VirtualJoystick
                  mode={joystickMode}
                  onModeChange={setJoystickMode}
                  onChange={handleJoystickChange}
                  size={120}
                  showThrottle={false}
                />
              </div>
            )}

            {/* Bottom-Right Fullscreen & Joystick Overlay Controls */}
            <FullscreenGraphButton
              onClick={() => setIsCockpitOpen(true)}
              label="Во весь экран"
              subLabel="Кокпит HUD"
              onToggleJoystick={() => setShowVirtualJoystick(!showVirtualJoystick)}
              isJoystickActive={showVirtualJoystick}
            />
          </div>
        </div>

        {/* Right: Interactive Mode Controls & Parameters */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4 text-xs font-mono">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-slate-200 font-bold">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Параметры Визуализации</span>
          </div>

          {/* Wing Geometry Model Selector */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-bold text-[11px] block">Геометрия крыла:</label>
            <select
              value={wingType}
              onChange={(e) => setWingType(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="transonic_swept">Стреловидное крыло (Околозвуковое, 28°)</option>
              <option value="winglet_blended">Крыло с винглетом (Blended Winglet)</option>
              <option value="delta_vortex">Треугольное крыло (Delta Wing 55°, LEV)</option>
              <option value="high_aspect_glider">Крыло большого удлинения (Планер)</option>
            </select>
          </div>

          {/* Aerodynamic Flight Conditions */}
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>Угол атаки (α):</span>
                <span className="font-bold text-cyan-400">{alpha.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="-2"
                max="18"
                step="0.2"
                value={alpha}
                onChange={(e) => setAlpha(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>Число Маха (M):</span>
                <span className="font-bold text-emerald-400">{mach.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.15"
                max="1.4"
                step="0.01"
                value={mach}
                onChange={(e) => setMach(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Mode-Specific Interactive Panels */}
          {/* 1. Cut-Plane Controls */}
          {activeMode === 'cut_plane' && (
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-3 animate-fadeIn">
              <span className="text-cyan-300 font-bold block text-[11px]">Параметры Среза:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[10px]">Плоскость:</span>
                {(['X', 'Y', 'Z'] as SlicingAxis[]).map((ax) => (
                  <button
                    key={ax}
                    type="button"
                    onClick={() => setSliceAxis(ax)}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold ${
                      sliceAxis === ax ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {ax}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-300 text-[10px]">
                  <span>Положение среза:</span>
                  <span className="font-bold text-cyan-400">{(slicePosition * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={slicePosition}
                  onChange={(e) => setSlicePosition(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-300">
                <span>Изолинии (Iso-contours):</span>
                <input
                  type="checkbox"
                  checked={showIsoContours}
                  onChange={(e) => setShowIsoContours(e.target.checked)}
                  className="rounded accent-cyan-500"
                />
              </div>
            </div>
          )}

          {/* 2. Q-Criterion Controls */}
          {activeMode === 'vortex_q' && (
            <div className="bg-purple-950/30 p-3 rounded-xl border border-purple-800/50 space-y-3 animate-fadeIn">
              <span className="text-purple-300 font-bold block text-[11px]">Параметры Q-Критерия:</span>
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300 text-[10px]">
                  <span>Изо-порог Q_iso:</span>
                  <span className="font-bold text-purple-400">{qThreshold.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.05"
                  value={qThreshold}
                  onChange={(e) => setQThreshold(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-300 text-[10px]">
                  <span>Прозрачность жгута:</span>
                  <span className="font-bold text-pink-400">{(vortexCoreOpacity * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={vortexCoreOpacity}
                  onChange={(e) => setVortexCoreOpacity(parseFloat(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* 3. Smoke & Streamline Controls */}
          {activeMode === 'smoke_stream' && (
            <div className="bg-emerald-950/30 p-3 rounded-xl border border-emerald-800/50 space-y-3 animate-fadeIn">
              <span className="text-emerald-300 font-bold block text-[11px]">Генератор Дыма:</span>
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-[10px]">Генерация частиц:</span>
                <button
                  type="button"
                  onClick={() => setIsSmokeActive(!isSmokeActive)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                    isSmokeActive ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isSmokeActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isSmokeActive ? 'Пауза' : 'Старт'}</span>
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-300 text-[10px]">
                  <span>Скорость вдува:</span>
                  <span className="font-bold text-emerald-400">{smokeSpeed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="2.5"
                  step="0.1"
                  value={smokeSpeed}
                  onChange={(e) => setSmokeSpeed(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* 4. Comparator Controls */}
          {activeMode === 'comparator' && (
            <div className="bg-indigo-950/30 p-3 rounded-xl border border-indigo-800/50 space-y-3 animate-fadeIn">
              <span className="text-indigo-300 font-bold block text-[11px]">Сравнение Конфигурации B:</span>
              <div className="space-y-1">
                <label className="text-slate-400 text-[10px] block">Вариант модификации B:</label>
                <select
                  value={compWingType}
                  onChange={(e) => setCompWingType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white"
                >
                  <option value="winglet_blended">С винглетом (Blended Winglet)</option>
                  <option value="transonic_swept">Базовое стреловидное крыло</option>
                  <option value="delta_vortex">Delta Wing (55° Sweep)</option>
                  <option value="high_aspect_glider">Высокое удлинение (High AR)</option>
                </select>
              </div>

              {/* Differential Aerodynamic Metrics */}
              <div className="space-y-1.5 pt-1 border-t border-indigo-900/40 text-[10px]">
                <div className="flex justify-between text-slate-300">
                  <span>Снижение скоса потока (C_di):</span>
                  <span className="text-emerald-400 font-bold">-14.2%</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Прирост качества L/D:</span>
                  <span className="text-cyan-300 font-bold">+1.85 (18.4)</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Эффективность законцовки:</span>
                  <span className="text-purple-300 font-bold">96.8%</span>
                </div>
              </div>
            </div>
          )}

          {/* Colormap & Scalar Palette Selector */}
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <div className="space-y-1">
              <label className="text-slate-400 text-[10px] block">Скалярное поле:</label>
              <select
                value={activeScalar}
                onChange={(e) => setActiveScalar(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200"
              >
                <option value="cp">Давление (Коэффициент Cp)</option>
                <option value="mach">Локальное число Маха (M_loc)</option>
                <option value="velocity">Скорость потока (V/V_inf)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-[10px] block">Цветовая палитра (Colormap):</label>
              <select
                value={colorMap}
                onChange={(e) => setColorMap(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200"
              >
                <option value="turbo">Turbo (Стандарт CFD)</option>
                <option value="coolwarm">Cool-to-Warm (Дивергентная)</option>
                <option value="viridis">Viridis (Перцептивная)</option>
                <option value="jet">Jet (Классическая)</option>
                <option value="schlieren">Теневой прибор (Schlieren Grayscale)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Universal Telemetry & Joystick Cockpit */}
      <UniversalCockpitHUDModal
        isOpen={isCockpitOpen}
        onClose={() => setIsCockpitOpen(false)}
        initialDomain="3d_aero_studio"
        initialMach={mach}
        initialAlpha={alpha}
      />
    </div>
  );
};
