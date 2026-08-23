import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Compass,
  Sliders,
  RotateCcw,
  Maximize2,
  Minimize2,
  X,
  Play,
  Pause,
  Activity,
  Gauge,
  Wind,
  Layers,
  Sparkles,
  Zap,
  Flame,
  Radio,
  Crosshair,
  Camera,
  Download,
  Info,
  ChevronRight,
  Shield,
  Eye,
  EyeOff,
  Move,
  Plane,
  Boxes,
  HelpCircle,
} from 'lucide-react';
import { VirtualJoystick, JoystickMode, JoystickValue } from './VirtualJoystick';
import { MathText, MathView } from '../MathView';
import { createHardware2DContext } from '../../utils/gpuHardwareEnforcer';

export type CockpitSystemDomain =
  | '3d_aero_studio'
  | 'cfd_wind_tunnel'
  | 'flight_6dof'
  | 'flutter_fsi'
  | 'uav_guidance'
  | 'uav_swarm'
  | 'uav_terrain'
  | 'supersonic_mach'
  | 'space_reentry'
  | 'math_3d_field';

interface UniversalCockpitHUDModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDomain?: CockpitSystemDomain;
  initialMach?: number;
  initialAlpha?: number;
}

export const UniversalCockpitHUDModal: React.FC<UniversalCockpitHUDModalProps> = ({
  isOpen,
  onClose,
  initialDomain = '3d_aero_studio',
  initialMach = 0.82,
  initialAlpha = 4.5,
}) => {
  const [activeDomain, setActiveDomain] = useState<CockpitSystemDomain>(initialDomain);

  // Synchronize when initial domain changes
  useEffect(() => {
    if (initialDomain) setActiveDomain(initialDomain);
  }, [initialDomain]);

  // Master Aerodynamic & Flight Parameters (Regulators)
  const [mach, setMach] = useState<number>(initialMach);
  const [alpha, setAlpha] = useState<number>(initialAlpha);
  const [beta, setBeta] = useState<number>(0.0);
  const [altitude, setAltitude] = useState<number>(10500); // meters
  const [throttle, setThrottle] = useState<number>(80); // %

  // Control Surface Deflections
  const [elevator, setElevator] = useState<number>(0.0); // deg
  const [aileron, setAileron] = useState<number>(0.0); // deg
  const [rudder, setRudder] = useState<number>(0.0); // deg
  const [flaps, setFlaps] = useState<number>(0.0); // deg

  // Geometry Regulators
  const [sweepAngle, setSweepAngle] = useState<number>(28); // deg
  const [aspectRatio, setAspectRatio] = useState<number>(9.2);
  const [taperRatio, setTaperRatio] = useState<number>(0.35);

  // Visualization Switches
  const [showStreamlines, setShowStreamlines] = useState<boolean>(true);
  const [showPressureIso, setShowPressureIso] = useState<boolean>(true);
  const [showShockWaves, setShowShockWaves] = useState<boolean>(true);
  const [showVortices, setShowVortices] = useState<boolean>(true);
  const [showVectors, setShowVectors] = useState<boolean>(false);
  const [showWireframe, setShowWireframe] = useState<boolean>(true);
  const [colorMap, setColorMap] = useState<'turbo' | 'viridis' | 'inferno' | 'coolwarm'>('turbo');

  // Simulation Running State
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1.0);

  // Joystick & Camera Viewport State
  const [joystickMode, setJoystickMode] = useState<JoystickMode>('camera_orbit');
  const [activeCameraView, setActiveCameraView] = useState<'orbit' | 'cockpit' | 'top' | 'side' | 'front'>('orbit');

  const rotXRef = useRef<number>(20);
  const rotYRef = useRef<number>(-35);
  const zoomRef = useRef<number>(1.0);
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef<boolean>(false);
  const isPanningRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse Probe State
  const [probeData, setProbeData] = useState<{
    active: boolean;
    x: number;
    y: number;
    cp: number;
    machLoc: number;
    velMag: number;
    pressureKPa: number;
  }>({
    active: false,
    x: 0,
    y: 0,
    cp: -0.85,
    machLoc: 0.88,
    velMag: 265,
    pressureKPa: 24.2,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Derived Physical Telemetry Computations
  const telemetry = useMemo(() => {
    // Atmosphere Model at Altitude (US Standard Atmosphere approx)
    const hKm = altitude / 1000;
    const tempK = Math.max(216.65, 288.15 - 6.5 * hKm);
    const pressurePa = 101325 * Math.pow(tempK / 288.15, 5.256);
    const density = pressurePa / (287.05 * tempK);
    const speedOfSound = Math.sqrt(1.4 * 287.05 * tempK);
    const trueAirspeed = mach * speedOfSound; // m/s
    const dynamicPressureQ = 0.5 * density * trueAirspeed * trueAirspeed; // Pa

    // Prandtl-Glauert & Transonic corrections
    const pgFactor = mach < 0.95 ? 1 / Math.sqrt(Math.max(0.01, 1 - mach * mach)) : 1.8;
    const alphaRad = (alpha * Math.PI) / 180;

    // Lift & Drag Coefficients
    let cl = (2 * Math.PI * alphaRad + (flaps * 0.025)) * (pgFactor * 0.85);
    if (alpha > 14) {
      // Stall behavior
      cl = cl * Math.exp(-(alpha - 14) * 0.15);
    }

    const cd0 = 0.018 + (sweepAngle > 30 ? -0.003 : 0.002);
    const kInduced = 1 / (Math.PI * 0.85 * aspectRatio);
    let cdWave = 0;
    if (mach > 0.80) {
      cdWave = 0.08 * Math.pow(Math.max(0, mach - 0.80), 2.2);
    }
    const cd = cd0 + kInduced * cl * cl + cdWave;
    const ldRatio = cd > 0.0001 ? cl / cd : 0;
    const cm = -0.08 - 0.25 * cl + (elevator * -0.018);

    // Forces & Acceleration
    const wingArea = 120.0; // m^2
    const liftForceN = cl * dynamicPressureQ * wingArea;
    const dragForceN = cd * dynamicPressureQ * wingArea;
    const thrustMaxN = 220000; // N
    const currentThrustN = (throttle / 100) * thrustMaxN;
    const massKg = 65000; // kg
    const loadFactorG = Math.max(0, liftForceN / (massKg * 9.81));
    const totalTempK = tempK * (1 + 0.2 * mach * mach);

    return {
      mach: parseFloat(mach.toFixed(3)),
      alpha: parseFloat(alpha.toFixed(2)),
      beta: parseFloat(beta.toFixed(2)),
      airspeedKmh: Math.round(trueAirspeed * 3.6),
      airspeedMs: Math.round(trueAirspeed),
      altitudeM: Math.round(altitude),
      dynamicPressureKPa: parseFloat((dynamicPressureQ / 1000).toFixed(2)),
      cl: parseFloat(cl.toFixed(3)),
      cd: parseFloat(cd.toFixed(4)),
      ldRatio: parseFloat(ldRatio.toFixed(2)),
      cm: parseFloat(cm.toFixed(3)),
      liftKN: parseFloat((liftForceN / 1000).toFixed(1)),
      dragKN: parseFloat((dragForceN / 1000).toFixed(1)),
      thrustKN: parseFloat((currentThrustN / 1000).toFixed(1)),
      loadFactorG: parseFloat(loadFactorG.toFixed(2)),
      totalTempC: Math.round(totalTempK - 273.15),
      staticPressureKPa: parseFloat((pressurePa / 1000).toFixed(2)),
      densityKgM3: parseFloat(density.toFixed(3)),
      reynoldsMil: parseFloat(((density * trueAirspeed * 4.2) / 1.789e-5 / 1e6).toFixed(1)),
    };
  }, [mach, alpha, beta, altitude, throttle, flaps, elevator, sweepAngle, aspectRatio]);

  // Handle Joystick Input
  const handleJoystickChange = useCallback(
    (val: JoystickValue) => {
      if (!val.active && val.distance === 0) return;

      if (joystickMode === 'camera_orbit') {
        rotYRef.current = (rotYRef.current + val.x * 2.5) % 360;
        rotXRef.current = Math.max(-85, Math.min(85, rotXRef.current - val.y * 2.5));
      } else if (joystickMode === 'flight_yoke') {
        // Y controls elevator / pitch, X controls aileron / roll
        setElevator((prev) => parseFloat(Math.max(-25, Math.min(25, prev - val.y * 0.6)).toFixed(1)));
        setAileron((prev) => parseFloat(Math.max(-25, Math.min(25, prev + val.x * 0.6)).toFixed(1)));
      } else if (joystickMode === 'aero_flow') {
        // Y controls Alpha, X controls Mach
        setAlpha((prev) => parseFloat(Math.max(-5, Math.min(25, prev + val.y * 0.2)).toFixed(2)));
        setMach((prev) => parseFloat(Math.max(0.1, Math.min(3.5, prev + val.x * 0.015)).toFixed(3)));
      } else if (joystickMode === 'drone_vector') {
        // Y controls altitude / climb rate, X controls yaw / beta
        setAltitude((prev) => Math.max(100, Math.min(25000, prev + Math.round(val.y * 45))));
        setBeta((prev) => parseFloat(Math.max(-15, Math.min(15, prev + val.x * 0.3)).toFixed(1)));
      }
    },
    [joystickMode]
  );

  // Mouse Orbit, Pan & Zoom Handlers on Canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2 || e.shiftKey) {
      isPanningRef.current = true;
    } else {
      isDraggingRef.current = true;
    }
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      rotYRef.current = (rotYRef.current + dx * 0.5) % 360;
      rotXRef.current = Math.max(-85, Math.min(85, rotXRef.current + dy * 0.5));
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    } else if (isPanningRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      panRef.current.x += dx;
      panRef.current.y += dy;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }

    // Crosshair Probe on Hover
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const normX = (mouseX / rect.width - 0.5) * 2;
    const normY = (mouseY / rect.height - 0.5) * 2;

    const chordFrac = Math.max(0, Math.min(1, normX * 0.5 + 0.5));
    const localCp = -2.2 * Math.exp(-chordFrac * 3.2) * (1 - chordFrac) + (mach > 0.8 && chordFrac > 0.4 ? 0.85 : -0.15);
    const localMach = Math.max(0.1, mach * Math.sqrt(Math.max(0.05, 1 - localCp)));

    setProbeData({
      active: true,
      x: Math.round(mouseX),
      y: Math.round(mouseY),
      cp: parseFloat(localCp.toFixed(3)),
      machLoc: parseFloat(localMach.toFixed(3)),
      velMag: Math.round(localMach * 310),
      pressureKPa: parseFloat((telemetry.staticPressureKPa * (1 + 0.5 * 1.4 * mach * mach * localCp)).toFixed(2)),
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * -0.0015;
    zoomRef.current = Math.max(0.3, Math.min(4.0, zoomRef.current + zoomDelta));
  };

  // Camera presets
  const applyCameraPreset = (view: 'orbit' | 'cockpit' | 'top' | 'side' | 'front') => {
    setActiveCameraView(view);
    panRef.current = { x: 0, y: 0 };
    if (view === 'orbit') {
      rotXRef.current = 22;
      rotYRef.current = -38;
      zoomRef.current = 1.0;
    } else if (view === 'top') {
      rotXRef.current = 90;
      rotYRef.current = 0;
      zoomRef.current = 1.1;
    } else if (view === 'side') {
      rotXRef.current = 0;
      rotYRef.current = -90;
      zoomRef.current = 1.2;
    } else if (view === 'front') {
      rotXRef.current = 0;
      rotYRef.current = 0;
      zoomRef.current = 1.3;
    } else if (view === 'cockpit') {
      rotXRef.current = 8;
      rotYRef.current = 0;
      zoomRef.current = 2.4;
      panRef.current = { x: 0, y: 120 };
    }
  };

  // Animation Loop on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;
    const ctx = createHardware2DContext(canvas);
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.03 * simSpeed;
      const width = canvas.width;
      const height = canvas.height;

      // Dark Aero Cockpit Background Grid
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, width, height);

      // Radial HUD background vignette
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width * 0.6);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.06)');
      gradient.addColorStop(1, 'rgba(3, 7, 18, 0.95)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Coordinate axes & 3D transformation
      ctx.save();
      ctx.translate(width / 2 + panRef.current.x, height / 2 + panRef.current.y);
      ctx.scale(zoomRef.current, zoomRef.current);

      const radX = (rotXRef.current * Math.PI) / 180;
      const radY = (rotYRef.current * Math.PI) / 180;

      // Project 3D coordinate to 2D screen
      const project3D = (x: number, y: number, z: number) => {
        // Rotate around Y
        const cosY = Math.cos(radY);
        const sinY = Math.sin(radY);
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;

        // Rotate around X
        const cosX = Math.cos(radX);
        const sinX = Math.sin(radX);
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        // Perspective
        const fov = 700;
        const scale = fov / (fov + z2);
        return {
          x: x1 * scale,
          y: -y2 * scale,
          depth: z2,
          scale,
        };
      };

      // 1. Grid Floor
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.lineWidth = 1;
      const gridSize = 350;
      const gridStep = 50;
      for (let gx = -gridSize; gx <= gridSize; gx += gridStep) {
        const p1 = project3D(gx, -120, -gridSize);
        const p2 = project3D(gx, -120, gridSize);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      for (let gz = -gridSize; gz <= gridSize; gz += gridStep) {
        const p1 = project3D(-gridSize, -120, gz);
        const p2 = project3D(gridSize, -120, gz);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      // 2. Render Wing Model
      const halfSpan = 220;
      const rootChord = 140;
      const tipChord = rootChord * taperRatio;
      const sweepRad = (sweepAngle * Math.PI) / 180;
      const tipSweepX = halfSpan * Math.tan(sweepRad);
      const alphaRad = (alpha * Math.PI) / 180;

      // Wing Vertices
      const wingLeftRootLE = { x: 0, y: 0, z: 0 };
      const wingLeftTipLE = { x: tipSweepX, y: 0, z: -halfSpan };
      const wingLeftTipTE = { x: tipSweepX + tipChord, y: 0, z: -halfSpan };
      const wingLeftRootTE = { x: rootChord, y: 0, z: 0 };

      const wingRightTipLE = { x: tipSweepX, y: 0, z: halfSpan };
      const wingRightTipTE = { x: tipSweepX + tipChord, y: 0, z: halfSpan };

      // Apply Alpha Pitch Tilt
      const rotatePitch = (pt: { x: number; y: number; z: number }) => {
        const cosA = Math.cos(alphaRad);
        const sinA = Math.sin(alphaRad);
        return {
          x: pt.x * cosA - pt.y * sinA - rootChord * 0.25,
          y: pt.x * sinA + pt.y * cosA,
          z: pt.z,
        };
      };

      const pLeftRootLE = project3D(...Object.values(rotatePitch(wingLeftRootLE)) as [number, number, number]);
      const pLeftTipLE = project3D(...Object.values(rotatePitch(wingLeftTipLE)) as [number, number, number]);
      const pLeftTipTE = project3D(...Object.values(rotatePitch(wingLeftTipTE)) as [number, number, number]);
      const pLeftRootTE = project3D(...Object.values(rotatePitch(wingLeftRootTE)) as [number, number, number]);

      const pRightTipLE = project3D(...Object.values(rotatePitch(wingRightTipLE)) as [number, number, number]);
      const pRightTipTE = project3D(...Object.values(rotatePitch(wingRightTipTE)) as [number, number, number]);

      // Draw Wing Surfaces with Pressure Contours
      if (showPressureIso) {
        // Left Wing Surface
        const gradL = ctx.createLinearGradient(pLeftRootLE.x, pLeftRootLE.y, pLeftTipTE.x, pLeftTipTE.y);
        gradL.addColorStop(0, mach > 0.85 ? 'rgba(244, 63, 94, 0.45)' : 'rgba(6, 182, 212, 0.55)');
        gradL.addColorStop(0.5, 'rgba(99, 102, 241, 0.45)');
        gradL.addColorStop(1, 'rgba(16, 185, 129, 0.35)');

        ctx.fillStyle = gradL;
        ctx.beginPath();
        ctx.moveTo(pLeftRootLE.x, pLeftRootLE.y);
        ctx.lineTo(pLeftTipLE.x, pLeftTipLE.y);
        ctx.lineTo(pLeftTipTE.x, pLeftTipTE.y);
        ctx.lineTo(pLeftRootTE.x, pLeftRootTE.y);
        ctx.closePath();
        ctx.fill();

        // Right Wing Surface
        const gradR = ctx.createLinearGradient(pLeftRootLE.x, pLeftRootLE.y, pRightTipTE.x, pRightTipTE.y);
        gradR.addColorStop(0, mach > 0.85 ? 'rgba(244, 63, 94, 0.45)' : 'rgba(6, 182, 212, 0.55)');
        gradR.addColorStop(0.5, 'rgba(99, 102, 241, 0.45)');
        gradR.addColorStop(1, 'rgba(16, 185, 129, 0.35)');

        ctx.fillStyle = gradR;
        ctx.beginPath();
        ctx.moveTo(pLeftRootLE.x, pLeftRootLE.y);
        ctx.lineTo(pRightTipLE.x, pRightTipLE.y);
        ctx.lineTo(pRightTipTE.x, pRightTipTE.y);
        ctx.lineTo(pLeftRootTE.x, pLeftRootTE.y);
        ctx.closePath();
        ctx.fill();
      }

      // Wireframe Edges & Ribs
      if (showWireframe) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8;
        // Left outline
        ctx.beginPath();
        ctx.moveTo(pLeftRootLE.x, pLeftRootLE.y);
        ctx.lineTo(pLeftTipLE.x, pLeftTipLE.y);
        ctx.lineTo(pLeftTipTE.x, pLeftTipTE.y);
        ctx.lineTo(pLeftRootTE.x, pLeftRootTE.y);
        ctx.closePath();
        ctx.stroke();

        // Right outline
        ctx.beginPath();
        ctx.moveTo(pLeftRootLE.x, pLeftRootLE.y);
        ctx.lineTo(pRightTipLE.x, pRightTipLE.y);
        ctx.lineTo(pRightTipTE.x, pRightTipTE.y);
        ctx.lineTo(pLeftRootTE.x, pLeftRootTE.y);
        ctx.closePath();
        ctx.stroke();

        // Intermediate Ribs
        for (let r = 1; r < 5; r++) {
          const frac = r / 5;
          const ribLE_Z = -halfSpan * frac;
          const ribLE_X = tipSweepX * frac;
          const ribChord = rootChord * (1 - frac) + tipChord * frac;

          const ribP1 = project3D(...Object.values(rotatePitch({ x: ribLE_X, y: 0, z: ribLE_Z })) as [number, number, number]);
          const ribP2 = project3D(...Object.values(rotatePitch({ x: ribLE_X + ribChord, y: 0, z: ribLE_Z })) as [number, number, number]);

          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.beginPath();
          ctx.moveTo(ribP1.x, ribP1.y);
          ctx.lineTo(ribP2.x, ribP2.y);
          ctx.stroke();

          // Symmetrical Right Rib
          const ribRP1 = project3D(...Object.values(rotatePitch({ x: ribLE_X, y: 0, z: -ribLE_Z })) as [number, number, number]);
          const ribRP2 = project3D(...Object.values(rotatePitch({ x: ribLE_X + ribChord, y: 0, z: -ribLE_Z })) as [number, number, number]);

          ctx.beginPath();
          ctx.moveTo(ribRP1.x, ribRP1.y);
          ctx.lineTo(ribRP2.x, ribRP2.y);
          ctx.stroke();
        }
      }

      // 3. Shock Waves (if transonic or supersonic)
      if (showShockWaves && mach >= 0.82) {
        const shockX = tipSweepX * 0.45 + rootChord * 0.4;
        const pShock1 = project3D(...Object.values(rotatePitch({ x: shockX, y: 35, z: -halfSpan * 0.85 })) as [number, number, number]);
        const pShock2 = project3D(...Object.values(rotatePitch({ x: shockX, y: 35, z: halfSpan * 0.85 })) as [number, number, number]);

        ctx.strokeStyle = 'rgba(244, 63, 94, 0.85)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(pShock1.x, pShock1.y);
        ctx.lineTo(pShock2.x, pShock2.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 4. Streamlines & Particles
      if (showStreamlines) {
        const lineCount = 14;
        for (let i = 0; i < lineCount; i++) {
          const zSpan = (i / (lineCount - 1) - 0.5) * halfSpan * 1.8;
          const flowSpeed = 220 * mach;
          const startX = -200;
          const endX = 260;

          ctx.strokeStyle = `hsla(${(i * 25 + time * 60) % 360}, 80%, 65%, 0.65)`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();

          for (let stepX = startX; stepX <= endX; stepX += 20) {
            const progress = (stepX - startX) / (endX - startX);
            const waveY = Math.sin(progress * 6 - time * 4) * 8 + (stepX > 0 && stepX < rootChord ? 18 : 0);
            const pt = project3D(stepX, waveY, zSpan);
            if (stepX === startX) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
        }
      }

      // 5. Wingtip Vortices (Rollup spirals)
      if (showVortices) {
        const leftTipSpiral = rotatePitch({ x: tipSweepX + tipChord, y: 0, z: -halfSpan });
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.85)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (let a = 0; a < 25; a++) {
          const radius = a * 1.2;
          const angle = a * 0.8 + time * 5;
          const vortexPt = project3D(
            leftTipSpiral.x + a * 10,
            leftTipSpiral.y + Math.sin(angle) * radius,
            leftTipSpiral.z + Math.cos(angle) * radius
          );
          if (a === 0) ctx.moveTo(vortexPt.x, vortexPt.y);
          else ctx.lineTo(vortexPt.x, vortexPt.y);
        }
        ctx.stroke();
      }

      ctx.restore();

      // Artificial Horizon & PFD HUD Elements
      ctx.save();
      // Pitch ladder in center
      const centerX = width / 2;
      const centerY = height / 2;
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 1.5;

      // Crosshair center pip
      ctx.strokeRect(centerX - 8, centerY - 8, 16, 16);
      ctx.beginPath();
      ctx.moveTo(centerX - 24, centerY);
      ctx.lineTo(centerX - 8, centerY);
      ctx.moveTo(centerX + 8, centerY);
      ctx.lineTo(centerX + 24, centerY);
      ctx.moveTo(centerX, centerY - 24);
      ctx.lineTo(centerX, centerY - 8);
      ctx.moveTo(centerX, centerY + 8);
      ctx.lineTo(centerX, centerY + 24);
      ctx.stroke();

      ctx.restore();

      if (isRunning) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [
    isOpen,
    isRunning,
    simSpeed,
    mach,
    alpha,
    sweepAngle,
    taperRatio,
    showPressureIso,
    showWireframe,
    showShockWaves,
    showStreamlines,
    showVortices,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/98 text-slate-100 font-mono backdrop-blur-xl animate-fadeIn select-none overflow-hidden">
      {/* ========================================================================= */}
      {/* COCKPIT HEADER BAR                                                        */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-cyan-500/40 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-300">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-base font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400">
                ПОЛНОЭКРАННЫЙ КОКПИТ ТЕЛЕМЕТРИИ & РЕГУЛЯТОРОВ
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                LIVE HUD 60 FPS
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Интерактивная навигация: Мышь (Orbit/Pan/Zoom) + Виртуальный Джойстик + Полная матрица характеристик
            </p>
          </div>
        </div>

        {/* Domain Switcher */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {[
            { id: '3d_aero_studio', label: '3D Крыло' },
            { id: 'cfd_wind_tunnel', label: 'CFD Труба' },
            { id: 'flight_6dof', label: '6-DoF Полет' },
            { id: 'uav_guidance', label: 'GNC Наведение' },
            { id: 'uav_swarm', label: 'Рой БПЛА' },
            { id: 'supersonic_mach', label: 'Сверхзвук' },
          ].map((dom) => (
            <button
              key={dom.id}
              type="button"
              onClick={() => setActiveDomain(dom.id as CockpitSystemDomain)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeDomain === dom.id
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {dom.label}
            </button>
          ))}
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isRunning
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Пауза' : 'Пуск'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              rotXRef.current = 20;
              rotYRef.current = -35;
              zoomRef.current = 1.0;
              panRef.current = { x: 0, y: 0 };
              setMach(0.82);
              setAlpha(4.5);
              setThrottle(80);
              setElevator(0);
              setAileron(0);
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Сброс всех параметров"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/40 transition-colors cursor-pointer"
            title="Закрыть экран (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN 3-PANEL COCKPIT BODY                                                 */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* ======================================================================= */}
        {/* LEFT COLUMN: MASTER PARAMETERS & REGULATORS                             */}
        {/* ======================================================================= */}
        <div className="w-full lg:w-80 bg-slate-900/80 border-r border-slate-800 flex flex-col overflow-y-auto p-3 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <Sliders className="w-3.5 h-3.5" />
              <span>Главные Регуляторы</span>
            </div>
            <span className="text-[10px] text-slate-500">Master Sliders</span>
          </div>

          {/* 1. Primary Flow Sliders */}
          <div className="space-y-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 font-bold">Число Маха ($M_\infty$):</span>
                <strong className="text-cyan-300 font-black">{mach} M</strong>
              </div>
              <input
                type="range"
                min="0.10"
                max="3.50"
                step="0.01"
                value={mach}
                onChange={(e) => setMach(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
                <span>0.1 (Дозвук)</span>
                <span>0.85 (Трансзвук)</span>
                <span>3.5 (Сверхзвук)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 font-bold">Угол атаки ($\alpha$):</span>
                <strong className="text-indigo-300 font-black">{alpha}°</strong>
              </div>
              <input
                type="range"
                min="-6.0"
                max="26.0"
                step="0.1"
                value={alpha}
                onChange={(e) => setAlpha(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
              <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
                <span>-6°</span>
                <span>0°</span>
                <span>14° (Срыв)</span>
                <span>26°</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 font-bold">Высота ($H$):</span>
                <strong className="text-emerald-300 font-black">{(altitude / 1000).toFixed(1)} км</strong>
              </div>
              <input
                type="range"
                min="0"
                max="22000"
                step="250"
                value={altitude}
                onChange={(e) => setAltitude(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>
          </div>

          {/* 2. Control Surfaces Regulators (Flight Yoke Sliders) */}
          <div className="space-y-2.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
              Рули и Механизация Крыла
            </span>

            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-slate-400">Руль высоты ($\delta_e$):</span>
                <strong className="text-slate-200">{elevator}°</strong>
              </div>
              <input
                type="range"
                min="-25"
                max="25"
                step="0.5"
                value={elevator}
                onChange={(e) => setElevator(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-slate-400">Элероны ($\delta_a$):</span>
                <strong className="text-slate-200">{aileron}°</strong>
              </div>
              <input
                type="range"
                min="-25"
                max="25"
                step="0.5"
                value={aileron}
                onChange={(e) => setAileron(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-slate-400">Закрылки / Flaps:</span>
                <strong className="text-teal-300">{flaps}°</strong>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="5"
                value={flaps}
                onChange={(e) => setFlaps(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
            </div>
          </div>

          {/* 3. Geometry Regulators */}
          <div className="space-y-2.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
              Геометрия Крыла / САПР
            </span>

            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-slate-400">Стреловидность ($\Lambda$):</span>
                <strong className="text-slate-200">{sweepAngle}°</strong>
              </div>
              <input
                type="range"
                min="0"
                max="65"
                step="1"
                value={sweepAngle}
                onChange={(e) => setSweepAngle(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-slate-400">Удлинение ($AR$):</span>
                <strong className="text-slate-200">{aspectRatio}</strong>
              </div>
              <input
                type="range"
                min="2.0"
                max="18.0"
                step="0.2"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>
          </div>

          {/* 4. Visualization Toggles */}
          <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider block mb-1">
              Физические Слои & Оверлеи
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPressureIso}
                  onChange={(e) => setShowPressureIso(e.target.checked)}
                  className="rounded accent-cyan-400"
                />
                <span>Изолинии $C_p$</span>
              </label>

              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showStreamlines}
                  onChange={(e) => setShowStreamlines(e.target.checked)}
                  className="rounded accent-cyan-400"
                />
                <span>Линии тока</span>
              </label>

              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showShockWaves}
                  onChange={(e) => setShowShockWaves(e.target.checked)}
                  className="rounded accent-rose-400"
                />
                <span>Скачки Маха</span>
              </label>

              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showVortices}
                  onChange={(e) => setShowVortices(e.target.checked)}
                  className="rounded accent-amber-400"
                />
                <span>Вихри на законцовках</span>
              </label>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* CENTER COLUMN: INTERACTIVE 3D/2D CANVAS + ON-SCREEN HUD CONTROLS        */}
        {/* ======================================================================= */}
        <div className="flex-1 relative flex flex-col min-h-[420px] bg-slate-950">
          {/* Top Camera View Buttons Toolbar */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-2 py-1.5 rounded-xl border border-slate-800 shadow-xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Вид:</span>
            {[
              { id: 'orbit', label: '3D Орбита' },
              { id: 'top', label: 'Сверху' },
              { id: 'side', label: 'Сбоку' },
              { id: 'front', label: 'Спереди' },
              { id: 'cockpit', label: 'Кокпит' },
            ].map((cam) => (
              <button
                key={cam.id}
                type="button"
                onClick={() => applyCameraPreset(cam.id as any)}
                className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  activeCameraView === cam.id
                    ? 'bg-cyan-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cam.label}
              </button>
            ))}
          </div>

          {/* Top-Right Mouse / Camera Help Tooltip */}
          <div className="absolute top-3 right-3 z-10 hidden sm:flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] text-slate-300">
            <span className="text-cyan-400 font-bold">🖱️ Мышь:</span>
            <span>ЛКМ: Вращение</span>
            <span>|</span>
            <span>Shift/ПКМ: Сдвиг</span>
            <span>|</span>
            <span>Колесико: Зум</span>
          </div>

          {/* Main Interactive Canvas Element */}
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            className="w-full h-full object-cover cursor-grab active:cursor-grabbing flex-1"
          />

          {/* Hover Probe Tooltip (HUD Crosshair Indicator) */}
          {probeData.active && (
            <div
              style={{
                left: Math.min(window.innerWidth - 240, probeData.x + 15),
                top: Math.max(10, probeData.y - 80),
              }}
              className="pointer-events-none absolute z-20 bg-slate-950/90 border border-cyan-400/80 rounded-xl p-2 text-[11px] shadow-2xl backdrop-blur-md min-w-[190px]"
            >
              <div className="flex items-center justify-between text-cyan-300 font-bold border-b border-slate-800 pb-1 mb-1">
                <span>🎯 ЗОНД ДАВЛЕНИЯ</span>
                <span>$C_p$: {probeData.cp}</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300">
                <div>Местный Мах:</div>
                <div className="text-right font-bold text-amber-300">{probeData.machLoc} M</div>
                <div>Скорость:</div>
                <div className="text-right font-bold text-emerald-300">{probeData.velMag} м/с</div>
                <div>Давление:</div>
                <div className="text-right font-bold text-indigo-300">{probeData.pressureKPa} кПа</div>
              </div>
            </div>
          )}

          {/* Bottom Floating Virtual Joystick Dock */}
          <div className="absolute bottom-4 left-4 z-20">
            <VirtualJoystick
              mode={joystickMode}
              onModeChange={setJoystickMode}
              onChange={handleJoystickChange}
              throttle={throttle}
              onThrottleChange={setThrottle}
              size={135}
              showThrottle={true}
            />
          </div>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: REALTIME TELEMETRY MATRIX & NUMERICAL MONITOR             */}
        {/* ======================================================================= */}
        <div className="w-full lg:w-84 bg-slate-900/80 border-l border-slate-800 flex flex-col overflow-y-auto p-3 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5" />
              <span>Матрица Характеристик</span>
            </div>
            <span className="text-[10px] text-slate-500">Live Telemetry</span>
          </div>

          {/* Key Flight Metrics Cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Подъемная сила $C_L$</span>
              <strong className="text-lg font-black text-cyan-300">{telemetry.cl}</strong>
              <div className="text-[9px] text-slate-500 mt-0.5">{telemetry.liftKN} кН</div>
            </div>

            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Сопротивление $C_D$</span>
              <strong className="text-lg font-black text-rose-300">{telemetry.cd}</strong>
              <div className="text-[9px] text-slate-500 mt-0.5">{telemetry.dragKN} кН</div>
            </div>

            <div className="bg-slate-950/80 p-2 rounded-xl border border-cyan-500/30">
              <span className="text-[10px] text-cyan-400 font-bold block">Качество $K = L/D$</span>
              <strong className="text-xl font-black text-emerald-400">{telemetry.ldRatio}</strong>
              <div className="text-[9px] text-emerald-500/80 mt-0.5">Аэродинамич. КПД</div>
            </div>

            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Перегрузка $N_z$</span>
              <strong className="text-xl font-black text-amber-300">{telemetry.loadFactorG} G</strong>
              <div className="text-[9px] text-slate-500 mt-0.5">Лимит: 4.5 G</div>
            </div>
          </div>

          {/* Detailed Atmosphere & Physics Table */}
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1.5 text-xs">
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">
              Физические Параметры Потока
            </span>

            <div className="flex justify-between py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Скорость $V_\infty$:</span>
              <strong className="text-slate-200">
                {telemetry.airspeedKmh} км/ч ({telemetry.airspeedMs} м/с)
              </strong>
            </div>

            <div className="flex justify-between py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Динамич. напор $q$:</span>
              <strong className="text-cyan-300">{telemetry.dynamicPressureKPa} кПа</strong>
            </div>

            <div className="flex justify-between py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Статич. давление $p$:</span>
              <strong className="text-slate-200">{telemetry.staticPressureKPa} кПа</strong>
            </div>

            <div className="flex justify-between py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Плотность воздуха $\rho$:</span>
              <strong className="text-slate-200">{telemetry.densityKgM3} кг/м³</strong>
            </div>

            <div className="flex justify-between py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Число Рейнольдса $Re$:</span>
              <strong className="text-indigo-300">{telemetry.reynoldsMil} × 10⁶</strong>
            </div>

            <div className="flex justify-between py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Торможение $T_0$:</span>
              <strong className="text-rose-300">+{telemetry.totalTempC} °C</strong>
            </div>

            <div className="flex justify-between py-0.5">
              <span className="text-slate-400">Тяга силовой установки:</span>
              <strong className="text-teal-300">{telemetry.thrustKN} кН ({throttle}%)</strong>
            </div>
          </div>

          {/* Quick Guidance / System Help Box */}
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-indigo-900/40 text-[11px] text-slate-300 space-y-1">
            <div className="flex items-center gap-1 text-indigo-400 font-bold">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Быстрые Режимы Джойстика</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Переключайте режимы на джойстике внизу слева для плавного управления вращением камеры (3D Orbit),
              рулями высоты/элеронами (Штурвал) или углом атаки и числом Маха (Поток).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
