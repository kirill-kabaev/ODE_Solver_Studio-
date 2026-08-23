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
  ChevronLeft,
  Shield,
  Eye,
  EyeOff,
  Move,
  Plane,
  Boxes,
  HelpCircle,
  BarChart3,
  Waves,
  Navigation,
  Disc,
} from 'lucide-react';
import { VirtualJoystick, JoystickMode, JoystickValue } from './VirtualJoystick';
import { MathText, MathView } from '../MathView';
import { createHardware2DContext } from '../../utils/gpuHardwareEnforcer';

export type CockpitSystemDomain =
  | '3d_aero_studio'
  | 'cfd_wind_tunnel'
  | 'flight_6dof'
  | 'vlm_3d'
  | 'flutter_fsi'
  | 'cp_distribution'
  | 'supersonic_mach'
  | 'uav_guidance';

interface DomainMeta {
  id: CockpitSystemDomain;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  description: string;
  category: string;
}

export const COCKPIT_DOMAINS: DomainMeta[] = [
  {
    id: '3d_aero_studio',
    label: '3D Аэродинамика Крыла',
    shortLabel: '3D Крыло',
    icon: Boxes,
    description: '3D модель несущей поверхности с линиями тока, изобарами Cp и концевыми вихрями',
    category: 'Аэродинамика',
  },
  {
    id: 'cfd_wind_tunnel',
    label: 'CFD Аэродинамическая Труба',
    shortLabel: 'CFD Труба',
    icon: Wind,
    description: '2D/3D численное моделирование обтекания профиля с отрывом погранслоя и скачками',
    category: 'CFD Моделирование',
  },
  {
    id: 'flight_6dof',
    label: 'Динамика полета 6-DoF & PFD',
    shortLabel: '6-DoF Полет',
    icon: Plane,
    description: 'Пилотажный авиагоризонт PFD, авиадинамические моменты и отклик на штурвал',
    category: 'Динамика Полета',
  },
  {
    id: 'vlm_3d',
    label: 'Вихревая теория VLM (3D)',
    shortLabel: 'VLM Вихри',
    icon: Layers,
    description: 'Дискретизация крыла подковообразными вихрями, скос потока и индуктивное сопротивление',
    category: 'Теория Решёток',
  },
  {
    id: 'flutter_fsi',
    label: 'Аэроупругость & Флаттер (FSI)',
    shortLabel: 'Флаттер FSI',
    icon: Waves,
    description: '2-DoF автоколебания изгиб-кручение, фазовый портрет и критическая скорость флаттера',
    category: 'Аэроупругость',
  },
  {
    id: 'cp_distribution',
    label: 'Эпюра коэффициента давления Cp',
    shortLabel: 'График Cp',
    icon: BarChart3,
    description: 'Хордовое распределение разрежения Cp(x/c), пик на носке и интеграл подъемной силы',
    category: 'Анализ Профилей',
  },
  {
    id: 'supersonic_mach',
    label: 'Сверхзвук & Скачки Уплотнения',
    shortLabel: 'Сверхзвук',
    icon: Zap,
    description: 'Косые и прямые скачки Маха, веер разрежения Прандтля-Майера и конус Маха',
    category: 'Газодинамика',
  },
  {
    id: 'uav_guidance',
    label: 'GNC Наведение & Траектории БПЛА',
    shortLabel: 'GNC Наведение',
    icon: Navigation,
    description: 'Пропорциональная навигация (PN), вектор визирования LOS и кинематика перехвата',
    category: 'Управление БПЛА',
  },
];

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

  // Synchronize when initialDomain changes or modal opens
  useEffect(() => {
    if (initialDomain) {
      setActiveDomain(initialDomain);
    }
  }, [initialDomain, isOpen]);

  // Master Aerodynamic & Flight Parameters (Regulators)
  const [mach, setMach] = useState<number>(initialMach);
  const [alpha, setAlpha] = useState<number>(initialAlpha);
  const [beta, setBeta] = useState<number>(0.0);
  const [altitude, setAltitude] = useState<number>(10500); // meters
  const [throttle, setThrottle] = useState<number>(80); // %
  const [airfoilProfile, setAirfoilProfile] = useState<'naca0012' | 'naca4412' | 'supercritical' | 'diamond'>('naca4412');

  // Control Surface Deflections (6-DoF)
  const [elevator, setElevator] = useState<number>(0.0); // deg
  const [aileron, setAileron] = useState<number>(0.0); // deg
  const [rudder, setRudder] = useState<number>(0.0); // deg
  const [flaps, setFlaps] = useState<number>(0.0); // deg

  // Geometry Regulators
  const [sweepAngle, setSweepAngle] = useState<number>(28); // deg
  const [aspectRatio, setAspectRatio] = useState<number>(9.2);
  const [taperRatio, setTaperRatio] = useState<number>(0.35);

  // Aeroelastic / Flutter Parameters
  const [bendingStiffnessKh, setBendingStiffnessKh] = useState<number>(120); // N/m
  const [torsionStiffnessKa, setTorsionStiffnessKa] = useState<number>(85); // N*m/rad
  const [structuralDamping, setStructuralDamping] = useState<number>(0.025);

  // Supersonic Parameters
  const [wedgeAngle, setWedgeAngle] = useState<number>(12); // deg

  // UAV Guidance Parameters
  const [navConstantN, setNavConstantN] = useState<number>(3.5);

  // Visualization Switches
  const [showStreamlines, setShowStreamlines] = useState<boolean>(true);
  const [showPressureIso, setShowPressureIso] = useState<boolean>(true);
  const [showShockWaves, setShowShockWaves] = useState<boolean>(true);
  const [showVortices, setShowVortices] = useState<boolean>(true);
  const [showVectors, setShowVectors] = useState<boolean>(false);
  const [showWireframe, setShowWireframe] = useState<boolean>(true);

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
    const hKm = altitude / 1000;
    const tempK = Math.max(216.65, 288.15 - 6.5 * hKm);
    const pressurePa = 101325 * Math.pow(tempK / 288.15, 5.256);
    const density = pressurePa / (287.05 * tempK);
    const speedOfSound = Math.sqrt(1.4 * 287.05 * tempK);
    const trueAirspeed = mach * speedOfSound; // m/s
    const dynamicPressureQ = 0.5 * density * trueAirspeed * trueAirspeed; // Pa

    const pgFactor = mach < 0.95 ? 1 / Math.sqrt(Math.max(0.01, 1 - mach * mach)) : 1.8;
    const alphaRad = (alpha * Math.PI) / 180;

    let cl = (2 * Math.PI * alphaRad + flaps * 0.025) * (pgFactor * 0.85);
    if (alpha > 14) {
      cl = cl * Math.exp(-(alpha - 14) * 0.15);
    }

    const cd0 = 0.018 + (sweepAngle > 30 ? -0.003 : 0.002);
    const kInduced = 1 / (Math.PI * 0.85 * aspectRatio);
    let cdWave = 0;
    if (mach > 0.8) {
      cdWave = 0.08 * Math.pow(Math.max(0, mach - 0.8), 2.2);
    }
    const cd = cd0 + kInduced * cl * cl + cdWave;
    const ldRatio = cd > 0.0001 ? cl / cd : 0;
    const cm = -0.08 - 0.25 * cl + elevator * -0.018;

    const wingArea = 120.0; // m^2
    const liftForceN = cl * dynamicPressureQ * wingArea;
    const dragForceN = cd * dynamicPressureQ * wingArea;
    const thrustMaxN = 220000; // N
    const currentThrustN = (throttle / 100) * thrustMaxN;
    const massKg = 65000; // kg
    const loadFactorG = Math.max(0, liftForceN / (massKg * 9.81));
    const totalTempK = tempK * (1 + 0.2 * mach * mach);

    // Flutter Critical Velocity calculation
    const vFlutter = Math.round(
      Math.sqrt((torsionStiffnessKa * 1000) / (density * 1.5)) * (1 + structuralDamping * 2) * 0.85
    );
    const isFlutterDivergent = trueAirspeed >= vFlutter;

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
      vFlutterMs: vFlutter,
      isFlutterDivergent,
    };
  }, [mach, alpha, beta, altitude, throttle, flaps, elevator, sweepAngle, aspectRatio, torsionStiffnessKa, structuralDamping]);

  // Handle Joystick Input
  const handleJoystickChange = useCallback(
    (val: JoystickValue) => {
      if (!val.active && val.distance === 0) return;

      if (joystickMode === 'camera_orbit') {
        rotYRef.current = (rotYRef.current + val.x * 2.5) % 360;
        rotXRef.current = Math.max(-85, Math.min(85, rotXRef.current - val.y * 2.5));
      } else if (joystickMode === 'flight_yoke') {
        setElevator((prev) => parseFloat(Math.max(-25, Math.min(25, prev - val.y * 0.6)).toFixed(1)));
        setAileron((prev) => parseFloat(Math.max(-25, Math.min(25, prev + val.x * 0.6)).toFixed(1)));
      } else if (joystickMode === 'aero_flow') {
        setAlpha((prev) => parseFloat(Math.max(-6, Math.min(26, prev + val.y * 0.25)).toFixed(2)));
        setMach((prev) => parseFloat(Math.max(0.1, Math.min(3.5, prev + val.x * 0.02)).toFixed(3)));
      } else if (joystickMode === 'drone_vector') {
        setAltitude((prev) => Math.max(100, Math.min(25000, prev + Math.round(val.y * 50))));
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

  // Switch to next or previous domain
  const handleNextDomain = () => {
    const idx = COCKPIT_DOMAINS.findIndex((d) => d.id === activeDomain);
    const nextIdx = (idx + 1) % COCKPIT_DOMAINS.length;
    setActiveDomain(COCKPIT_DOMAINS[nextIdx].id);
  };

  const handlePrevDomain = () => {
    const idx = COCKPIT_DOMAINS.findIndex((d) => d.id === activeDomain);
    const prevIdx = (idx - 1 + COCKPIT_DOMAINS.length) % COCKPIT_DOMAINS.length;
    setActiveDomain(COCKPIT_DOMAINS[prevIdx].id);
  };

  // =========================================================================
  // MULTI-DOMAIN RENDERING ENGINE IN CANVAS 2D/3D (GPU ACCELERATED)
  // =========================================================================
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
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width * 0.65);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.08)');
      gradient.addColorStop(1, 'rgba(3, 7, 18, 0.96)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // 3D Matrix Transformation Setup
      const radX = (rotXRef.current * Math.PI) / 180;
      const radY = (rotYRef.current * Math.PI) / 180;
      const project3D = (x: number, y: number, z: number) => {
        const cosY = Math.cos(radY);
        const sinY = Math.sin(radY);
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;

        const cosX = Math.cos(radX);
        const sinX = Math.sin(radX);
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        const fov = 700;
        const scale = fov / (fov + z2);
        return {
          x: x1 * scale,
          y: -y2 * scale,
          depth: z2,
          scale,
        };
      };

      // =====================================================================
      // DOMAIN 1: 3D AERO STUDIO (3D WING & COMPREHENSIVE STREAMLINES)
      // =====================================================================
      if (activeDomain === '3d_aero_studio') {
        ctx.save();
        ctx.translate(width / 2 + panRef.current.x, height / 2 + panRef.current.y);
        ctx.scale(zoomRef.current, zoomRef.current);

        // Floor Grid
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

        // 3D Wing Geometry
        const halfSpan = 220;
        const rootChord = 140;
        const tipChord = rootChord * taperRatio;
        const sweepRad = (sweepAngle * Math.PI) / 180;
        const tipSweepX = halfSpan * Math.tan(sweepRad);
        const alphaRad = (alpha * Math.PI) / 180;

        const rotatePitch = (pt: { x: number; y: number; z: number }) => {
          const cosA = Math.cos(alphaRad);
          const sinA = Math.sin(alphaRad);
          return {
            x: pt.x * cosA - pt.y * sinA - rootChord * 0.25,
            y: pt.x * sinA + pt.y * cosA,
            z: pt.z,
          };
        };

        const pLeftRootLE = project3D(...(Object.values(rotatePitch({ x: 0, y: 0, z: 0 })) as [number, number, number]));
        const pLeftTipLE = project3D(...(Object.values(rotatePitch({ x: tipSweepX, y: 0, z: -halfSpan })) as [number, number, number]));
        const pLeftTipTE = project3D(...(Object.values(rotatePitch({ x: tipSweepX + tipChord, y: 0, z: -halfSpan })) as [number, number, number]));
        const pLeftRootTE = project3D(...(Object.values(rotatePitch({ x: rootChord, y: 0, z: 0 })) as [number, number, number]));

        const pRightTipLE = project3D(...(Object.values(rotatePitch({ x: tipSweepX, y: 0, z: halfSpan })) as [number, number, number]));
        const pRightTipTE = project3D(...(Object.values(rotatePitch({ x: tipSweepX + tipChord, y: 0, z: halfSpan })) as [number, number, number]));

        if (showPressureIso) {
          const gradL = ctx.createLinearGradient(pLeftRootLE.x, pLeftRootLE.y, pLeftTipTE.x, pLeftTipTE.y);
          gradL.addColorStop(0, mach > 0.85 ? 'rgba(244, 63, 94, 0.55)' : 'rgba(6, 182, 212, 0.6)');
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

          const gradR = ctx.createLinearGradient(pLeftRootLE.x, pLeftRootLE.y, pRightTipTE.x, pRightTipTE.y);
          gradR.addColorStop(0, mach > 0.85 ? 'rgba(244, 63, 94, 0.55)' : 'rgba(6, 182, 212, 0.6)');
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

        if (showWireframe) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(pLeftRootLE.x, pLeftRootLE.y);
          ctx.lineTo(pLeftTipLE.x, pLeftTipLE.y);
          ctx.lineTo(pLeftTipTE.x, pLeftTipTE.y);
          ctx.lineTo(pLeftRootTE.x, pLeftRootTE.y);
          ctx.closePath();
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(pLeftRootLE.x, pLeftRootLE.y);
          ctx.lineTo(pRightTipLE.x, pRightTipLE.y);
          ctx.lineTo(pRightTipTE.x, pRightTipTE.y);
          ctx.lineTo(pLeftRootTE.x, pLeftRootTE.y);
          ctx.closePath();
          ctx.stroke();
        }

        if (showShockWaves && mach >= 0.8) {
          const shockX = tipSweepX * 0.45 + rootChord * 0.4;
          const pShock1 = project3D(...(Object.values(rotatePitch({ x: shockX, y: 35, z: -halfSpan * 0.85 })) as [number, number, number]));
          const pShock2 = project3D(...(Object.values(rotatePitch({ x: shockX, y: 35, z: halfSpan * 0.85 })) as [number, number, number]));
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.85)';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 4]);
          ctx.beginPath();
          ctx.moveTo(pShock1.x, pShock1.y);
          ctx.lineTo(pShock2.x, pShock2.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        if (showStreamlines) {
          const lineCount = 14;
          for (let i = 0; i < lineCount; i++) {
            const zSpan = (i / (lineCount - 1) - 0.5) * halfSpan * 1.8;
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
      }

      // =====================================================================
      // DOMAIN 2: CFD WIND TUNNEL 2D/3D SIMULATION
      // =====================================================================
      else if (activeDomain === 'cfd_wind_tunnel') {
        const cx = width / 2 + panRef.current.x;
        const cy = height / 2 + panRef.current.y;
        const scale = 2.4 * zoomRef.current;
        const chordLen = 220 * scale;

        // Draw Wind Tunnel Grid & Flow Particles
        ctx.save();
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Flow Streamlines with Velocity Gradients
        const streamCount = 28;
        const alphaRad = (alpha * Math.PI) / 180;
        for (let s = 0; s < streamCount; s++) {
          const initY = (s / (streamCount - 1)) * height;
          const distFromCenter = initY - cy;

          ctx.beginPath();
          ctx.strokeStyle = `rgba(6, 182, 212, ${0.25 + Math.sin((s + time * 2) * 0.5) * 0.15})`;
          ctx.lineWidth = 1.6;

          for (let px = 0; px <= width; px += 15) {
            const relX = (px - cx) / chordLen;
            let defY = 0;

            // Airfoil displacement field & flow deflection
            if (relX >= -0.6 && relX <= 1.4) {
              const foilInfluence = Math.exp(-Math.pow(distFromCenter / 120, 2));
              const liftUpwash = -Math.sin(alphaRad) * Math.sin((relX + 0.6) * 1.8) * 40;
              const thicknessBump = Math.exp(-Math.pow(relX - 0.25, 2) * 8) * (distFromCenter < 0 ? -35 : 35);
              defY = (liftUpwash + thicknessBump) * foilInfluence;

              // Boundary layer separation wake when alpha > 12
              if (alpha > 12 && relX > 0.4 && distFromCenter < 30 && distFromCenter > -80) {
                defY += Math.sin(relX * 18 - time * 8) * (alpha - 10) * 2.5;
              }
            }

            const py = initY + defY;
            if (px === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }

        // Draw Transonic Shockwave on upper surface if Mach >= 0.8
        if (mach >= 0.8) {
          const shockX = cx + chordLen * 0.15;
          const shockYTop = cy - 140 * scale;
          const shockYBot = cy - 25 * scale;
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.9)';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(shockX - 10, shockYTop);
          ctx.quadraticCurveTo(shockX, cy - 80 * scale, shockX + 5, shockYBot);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Draw Airfoil Profile in Cross-Section
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-alphaRad);

        // NACA airfoil coordinates generator
        ctx.beginPath();
        const pts = 80;
        // Upper surface
        for (let i = 0; i <= pts; i++) {
          const xc = i / pts;
          const yt = 5 * 0.12 * (0.2969 * Math.sqrt(xc) - 0.126 * xc - 0.3516 * xc * xc + 0.2843 * xc * xc * xc - 0.1015 * xc * xc * xc * xc);
          const yc = 0.04 * (xc < 0.4 ? (2 * 0.4 * xc - xc * xc) / 0.16 : ((1 - 2 * 0.4) + 2 * 0.4 * xc - xc * xc) / 0.36);
          const x = (xc - 0.25) * chordLen;
          const y = -(yc + yt) * chordLen;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        // Lower surface
        for (let i = pts; i >= 0; i--) {
          const xc = i / pts;
          const yt = 5 * 0.12 * (0.2969 * Math.sqrt(xc) - 0.126 * xc - 0.3516 * xc * xc + 0.2843 * xc * xc * xc - 0.1015 * xc * xc * xc * xc);
          const yc = 0.04 * (xc < 0.4 ? (2 * 0.4 * xc - xc * xc) / 0.16 : ((1 - 2 * 0.4) + 2 * 0.4 * xc - xc * xc) / 0.36);
          const x = (xc - 0.25) * chordLen;
          const y = -(yc - yt) * chordLen;
          ctx.lineTo(x, y);
        }
        ctx.closePath();

        const foilGrad = ctx.createLinearGradient(-chordLen * 0.25, -50, chordLen * 0.75, 50);
        foilGrad.addColorStop(0, '#0284c7');
        foilGrad.addColorStop(0.5, '#0369a1');
        foilGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = foilGrad;
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.restore();
        ctx.restore();
      }

      // =====================================================================
      // DOMAIN 3: FLIGHT DYNAMICS 6-DOF & PFD GLASS COCKPIT
      // =====================================================================
      else if (activeDomain === 'flight_6dof') {
        const cx = width / 2;
        const cy = height / 2;
        const pitch = alpha * 1.5 - elevator * 0.8;
        const roll = -aileron * 1.8;
        const pitchPx = pitch * 6;

        ctx.save();
        // 1. Sky & Ground Horizon Box
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((roll * Math.PI) / 180);

        // Sky
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-width, -height * 2 + pitchPx, width * 2, height * 2);
        // Ground
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-width, pitchPx, width * 2, height * 2);

        // Horizon Line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-width, pitchPx);
        ctx.lineTo(width, pitchPx);
        ctx.stroke();

        // Pitch Ladder Bars
        for (let deg = -40; deg <= 40; deg += 10) {
          if (deg === 0) continue;
          const barY = pitchPx - deg * 6;
          const barW = Math.abs(deg) === 10 ? 80 : 120;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-barW / 2, barY);
          ctx.lineTo(barW / 2, barY);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'right';
          ctx.fillText(`${deg}`, -barW / 2 - 8, barY + 4);
          ctx.textAlign = 'left';
          ctx.fillText(`${deg}`, barW / 2 + 8, barY + 4);
        }
        ctx.restore();

        // 2. Fixed Aircraft Crosshair Symbol
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx - 70, cy);
        ctx.lineTo(cx - 25, cy);
        ctx.lineTo(cx - 25, cy + 12);
        ctx.moveTo(cx + 25, cy + 12);
        ctx.lineTo(cx + 25, cy);
        ctx.lineTo(cx + 70, cy);
        ctx.moveTo(cx - 6, cy);
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.stroke();

        // 3. Airspeed Tape (Left)
        const tapeLeft = cx - 240;
        ctx.fillStyle = 'rgba(3, 7, 18, 0.85)';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.fillRect(tapeLeft - 50, cy - 140, 90, 280);
        ctx.strokeRect(tapeLeft - 50, cy - 140, 90, 280);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${telemetry.airspeedKmh}`, tapeLeft - 5, cy + 6);
        ctx.font = '10px monospace';
        ctx.fillText('КМ/Ч', tapeLeft - 5, cy + 22);

        // 4. Altitude Tape (Right)
        const tapeRight = cx + 240;
        ctx.fillRect(tapeRight - 40, cy - 140, 90, 280);
        ctx.strokeRect(tapeRight - 40, cy - 140, 90, 280);

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(`${telemetry.altitudeM}`, tapeRight + 5, cy + 6);
        ctx.font = '10px monospace';
        ctx.fillText('МЕТРЫ', tapeRight + 5, cy + 22);

        // 5. Compass Heading Tape (Bottom)
        ctx.fillRect(cx - 140, cy + 160, 280, 50);
        ctx.strokeRect(cx - 140, cy + 160, 280, 50);
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`КУРС HDG 045° | БЕТА β ${beta}°`, cx, cy + 190);

        ctx.restore();
      }

      // =====================================================================
      // DOMAIN 4: VLM 3D (VORTEX LATTICE METHOD & SECTIONAL CIRCULATION)
      // =====================================================================
      else if (activeDomain === 'vlm_3d') {
        ctx.save();
        ctx.translate(width / 2 + panRef.current.x, height / 2 + panRef.current.y);
        ctx.scale(zoomRef.current, zoomRef.current);

        const span = 340;
        const chord = 160;
        const panelsY = 16;
        const panelsX = 6;

        // VLM Horseshoe Vortex Grid
        for (let py = 0; py < panelsY; py++) {
          const y1 = (py / panelsY - 0.5) * span;
          const y2 = ((py + 1) / panelsY - 0.5) * span;
          const circ = Math.sin(((py + 0.5) / panelsY) * Math.PI) * (alpha * 0.15 + 0.2);

          for (let px = 0; px < panelsX; px++) {
            const x1 = (px / panelsX) * chord;
            const x2 = ((px + 1) / panelsX) * chord;

            const pA = project3D(x1, 0, y1);
            const pB = project3D(x1, 0, y2);
            const pC = project3D(x2, 0, y2);
            const pD = project3D(x2, 0, y1);

            ctx.fillStyle = `rgba(99, 102, 241, ${0.15 + circ * 0.6})`;
            ctx.beginPath();
            ctx.moveTo(pA.x, pA.y);
            ctx.lineTo(pB.x, pB.y);
            ctx.lineTo(pC.x, pC.y);
            ctx.lineTo(pD.x, pD.y);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#818cf8';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Bound Vortex Filaments at 1/4 chord
            if (px === 1) {
              const bv1 = project3D(x1 + (x2 - x1) * 0.25, 0, y1);
              const bv2 = project3D(x1 + (x2 - x1) * 0.25, 0, y2);
              ctx.strokeStyle = '#f59e0b';
              ctx.lineWidth = 2.2;
              ctx.beginPath();
              ctx.moveTo(bv1.x, bv1.y);
              ctx.lineTo(bv2.x, bv2.y);
              ctx.stroke();
            }
          }

          // Trailing Wake Vortices behind trailing edge
          const wakeA = project3D(chord, 0, y1);
          const wakeEnd = project3D(chord + 260, Math.sin(time * 3 + py) * 6, y1);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(wakeA.x, wakeA.y);
          ctx.lineTo(wakeEnd.x, wakeEnd.y);
          ctx.stroke();
        }

        ctx.restore();
      }

      // =====================================================================
      // DOMAIN 5: FLUTTER & AEROELASTICITY (FSI 2-DOF)
      // =====================================================================
      else if (activeDomain === 'flutter_fsi') {
        const cx = width / 2;
        const cy = height / 2;
        const vRatio = telemetry.airspeedMs / telemetry.vFlutterMs;
        const isDivergent = telemetry.isFlutterDivergent;

        // Dynamic Flutter Oscillation Math
        const growthRate = (vRatio - 1) * 1.5;
        const envAmp = isDivergent ? Math.min(1.8, 0.7 + Math.sin(time * 2) * 0.5) : Math.max(0.2, 0.8 * Math.exp(-time * structuralDamping * 2));
        const plungeH = Math.sin(time * 6) * 50 * envAmp;
        const pitchA = Math.cos(time * 6 - 0.8) * 16 * envAmp;

        ctx.save();
        // Airfoil with Springs
        ctx.translate(cx - 120, cy);

        // Bending Spring Kh (Vertical)
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let s = -100; s <= plungeH; s += 10) {
          const sx = (s % 20 === 0 ? 10 : -10);
          if (s === -100) ctx.moveTo(sx, s);
          else ctx.lineTo(sx, s);
        }
        ctx.stroke();

        // Airfoil Section Oscillating
        ctx.save();
        ctx.translate(0, plungeH);
        ctx.rotate((pitchA * Math.PI) / 180);

        ctx.fillStyle = isDivergent ? 'rgba(239, 68, 68, 0.75)' : 'rgba(16, 185, 129, 0.75)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 100, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Elastic axis (EA) & Center of Gravity (CG)
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(-15, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(20, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        ctx.restore();

        // Phase Portrait Plot (Right Side)
        const plotCx = cx + 220;
        const plotCy = cy;
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.9)';
        ctx.strokeRect(plotCx - 140, plotCy - 120, 280, 240);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(plotCx - 140, plotCy - 120, 280, 240);

        // Phase trajectory ellipse
        ctx.strokeStyle = isDivergent ? '#ef4444' : '#10b981';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (let t = 0; t < Math.PI * 2; t += 0.1) {
          const px = plotCx + Math.sin(t) * 90 * envAmp;
          const py = plotCy + Math.cos(t) * 70 * envAmp;
          if (t === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('ФАЗОВЫЙ ПОРТРЕТ (h vs ḣ)', plotCx - 120, plotCy - 95);
        ctx.fillStyle = isDivergent ? '#f87171' : '#34d399';
        ctx.fillText(
          isDivergent ? `⚠ ФЛАТТЕР ДИВЕРГЕНЦИЯ (V > ${telemetry.vFlutterMs} м/с)` : `✓ УСТОЙЧИВО (V < ${telemetry.vFlutterMs} м/с)`,
          plotCx - 120,
          plotCy + 105
        );
      }

      // =====================================================================
      // DOMAIN 6: CP PRESSURE DISTRIBUTION
      // =====================================================================
      else if (activeDomain === 'cp_distribution') {
        const cx = width / 2;
        const cy = height / 2;
        const graphW = Math.min(width - 200, 700);
        const graphH = 340;
        const leftX = cx - graphW / 2;
        const topY = cy - graphH / 2;

        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(leftX, topY, graphW, graphH);
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
        ctx.strokeRect(leftX, topY, graphW, graphH);

        // Cp = 0 Reference Line
        const zeroY = topY + graphH * 0.45;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(leftX, zeroY);
        ctx.lineTo(leftX + graphW, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Upper Suction Curve & Lower Pressure Curve
        ctx.beginPath();
        for (let i = 0; i <= 60; i++) {
          const xc = i / 60;
          const cpUpper = -2.6 * Math.exp(-xc * 3.5) * (1 - xc) * (1 + alpha * 0.15) - 0.2;
          const px = leftX + xc * graphW;
          const py = zeroY + cpUpper * 70;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        for (let i = 0; i <= 60; i++) {
          const xc = i / 60;
          const cpLower = 0.9 * Math.exp(-xc * 4.0) * (1 - xc) + 0.1 * (1 - xc);
          const px = leftX + xc * graphW;
          const py = zeroY + cpLower * 70;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Legend & Labels
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 13px monospace';
        ctx.fillText('— Верхняя поверхность (Разрежение -Cp)', leftX + 20, topY + 30);
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('— Нижняя поверхность (Давление +Cp)', leftX + 20, topY + 50);
        ctx.fillStyle = '#10b981';
        ctx.fillText(`Площадь петли ∮ Cp d(x/c) = CL ${telemetry.cl}`, leftX + 20, topY + 75);

        ctx.restore();
      }

      // =====================================================================
      // DOMAIN 7: SUPERSONIC MACH & OBLIQUE SHOCK WAVES
      // =====================================================================
      else if (activeDomain === 'supersonic_mach') {
        const cx = width / 2;
        const cy = height / 2;
        const supMach = Math.max(1.1, mach);
        const muRad = Math.asin(1 / supMach);
        const muDeg = (muRad * 180) / Math.PI;

        ctx.save();
        // Supersonic Wedge Shape
        ctx.fillStyle = '#0369a1';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 80, cy);
        ctx.lineTo(cx + 200, cy - 70);
        ctx.lineTo(cx + 200, cy + 70);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Oblique Shock Waves from Apex
        const betaAngleRad = muRad * 1.35;
        const shockLen = 380;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 14;

        // Top Shock
        ctx.beginPath();
        ctx.moveTo(cx - 80, cy);
        ctx.lineTo(cx - 80 + Math.cos(betaAngleRad) * shockLen, cy - Math.sin(betaAngleRad) * shockLen);
        ctx.stroke();

        // Bottom Shock
        ctx.beginPath();
        ctx.moveTo(cx - 80, cy);
        ctx.lineTo(cx - 80 + Math.cos(betaAngleRad) * shockLen, cy + Math.sin(betaAngleRad) * shockLen);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Supersonic Inflow Particles
        for (let i = 0; i < 20; i++) {
          const py = cy + (i - 10) * 25;
          const px = ((time * 800 + i * 45) % (width + 200)) - 100;
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px monospace';
        ctx.fillText(`СВЕРХЗВУКОВОЙ ПОТОК: M = ${supMach} M`, cx - 220, cy - 140);
        ctx.fillStyle = '#ef4444';
        ctx.fillText(`УГОЛ КОНУСА МАХА μ = ${muDeg.toFixed(1)}°`, cx - 220, cy - 115);

        ctx.restore();
      }

      // =====================================================================
      // DOMAIN 8: UAV GUIDANCE & PROPORTIONAL NAVIGATION (GNC)
      // =====================================================================
      else if (activeDomain === 'uav_guidance') {
        const cx = width / 2;
        const cy = height / 2;

        ctx.save();
        // Target Aircraft
        const targetX = cx + 180 + Math.sin(time * 0.8) * 60;
        const targetY = cy - 120 + Math.cos(time * 0.6) * 40;

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(targetX, targetY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('ЦЕЛЬ', targetX - 14, targetY - 18);

        // Pursuer UAV / Missile
        const pursuerX = cx - 180 + Math.sin(time * 1.2) * 40;
        const pursuerY = cy + 100 - (time * 25) % 180;

        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(pursuerX, pursuerY, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('ПЕРЕХВАТЧИК', pursuerX - 35, pursuerY + 24);

        // Line-of-Sight (LOS) Vector
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.75)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(pursuerX, pursuerY);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Proportional Navigation Acceleration Command Vector
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(pursuerX, pursuerY);
        ctx.lineTo(pursuerX + 45, pursuerY - 35);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('ЗАКОН НАВЕДЕНИЯ: a_n = N · V_c · dλ/dt', cx - 220, cy + 180);

        ctx.restore();
      }

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
    activeDomain,
    mach,
    alpha,
    beta,
    elevator,
    aileron,
    sweepAngle,
    taperRatio,
    showPressureIso,
    showWireframe,
    showShockWaves,
    showStreamlines,
    showVortices,
    telemetry,
    structuralDamping,
  ]);

  if (!isOpen) return null;

  const currentDomainMeta = COCKPIT_DOMAINS.find((d) => d.id === activeDomain) || COCKPIT_DOMAINS[0];
  const IconComponent = currentDomainMeta.icon;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/98 text-slate-100 font-mono backdrop-blur-xl animate-fadeIn select-none overflow-hidden">
      {/* ========================================================================= */}
      {/* COCKPIT TOP HEADER & UNIVERSAL DOMAIN SWITCHER                            */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between px-3 py-2 bg-slate-900/95 border-b border-cyan-500/40 shadow-lg gap-2 shrink-0">
        <div className="flex items-center justify-between md:justify-start gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-300">
              <IconComponent className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs md:text-sm font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400">
                  {currentDomainMeta.label.toUpperCase()}
                </h2>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hidden sm:inline-block">
                  LIVE 60 FPS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-1 max-w-md hidden sm:block">
                {currentDomainMeta.description}
              </p>
            </div>
          </div>

          {/* Mobile Quick Close */}
          <div className="flex md:hidden items-center gap-1">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* DOMAIN SWITCHER (Interactive bar for Desktop & Dropdown for Mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          {/* Quick Prev / Next Domain Arrows */}
          <button
            type="button"
            onClick={handlePrevDomain}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer shrink-0"
            title="Предыдущая анимация"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Desktop Tab Bar */}
          <div className="hidden xl:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {COCKPIT_DOMAINS.map((dom) => {
              const DomIcon = dom.icon;
              return (
                <button
                  key={dom.id}
                  type="button"
                  onClick={() => setActiveDomain(dom.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeDomain === dom.id
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <DomIcon className="w-3 h-3 shrink-0" />
                  <span>{dom.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Tablet & Mobile Dropdown Switcher (Always visible when width < 1280px) */}
          <div className="flex xl:hidden items-center gap-1.5 flex-1">
            <select
              value={activeDomain}
              onChange={(e) => setActiveDomain(e.target.value as CockpitSystemDomain)}
              className="bg-slate-950 text-cyan-300 border border-cyan-500/50 rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer w-full"
            >
              {COCKPIT_DOMAINS.map((dom) => (
                <option key={dom.id} value={dom.id} className="bg-slate-950 text-slate-100">
                  {dom.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleNextDomain}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer shrink-0"
            title="Следующая анимация"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Header Right Actions */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
            title="Сброс положения камеры и параметров"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/40 transition-colors cursor-pointer"
            title="Закрыть экран (Esc)"
          >
            <X className="w-4 h-4" />
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
        <div className="w-full lg:w-80 bg-slate-900/80 border-r border-slate-800 flex flex-col overflow-y-auto p-3 space-y-3 shrink-0">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <Sliders className="w-3.5 h-3.5" />
              <span>Регуляторы: {currentDomainMeta.shortLabel}</span>
            </div>
            <span className="text-[9px] text-slate-500">Live Control</span>
          </div>

          {/* 1. Primary Flow Sliders (Always Relevant) */}
          <div className="space-y-2.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
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
                <span className="text-slate-400 font-bold">Высота полета ($H$):</span>
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

          {/* 2. Dynamic Domain-Specific Regulators */}
          {activeDomain === 'flight_6dof' && (
            <div className="space-y-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                Органы Управления 6-DoF
              </span>
              <div>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-slate-400">Руль высоты (Elevator):</span>
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
                  <span className="text-slate-400">Элероны (Aileron):</span>
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
                  <span className="text-slate-400">Закрылки (Flaps):</span>
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
          )}

          {activeDomain === 'flutter_fsi' && (
            <div className="space-y-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                Параметры Жесткости (FSI)
              </span>
              <div>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-slate-400">Изгибная жесткость ($K_h$):</span>
                  <strong className="text-slate-200">{bendingStiffnessKh} Н/м</strong>
                </div>
                <input
                  type="range"
                  min="40"
                  max="300"
                  step="10"
                  value={bendingStiffnessKh}
                  onChange={(e) => setBendingStiffnessKh(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-slate-400">Крутильная жесткость ($K_\alpha$):</span>
                  <strong className="text-slate-200">{torsionStiffnessKa} Н·м/рад</strong>
                </div>
                <input
                  type="range"
                  min="30"
                  max="200"
                  step="5"
                  value={torsionStiffnessKa}
                  onChange={(e) => setTorsionStiffnessKa(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
                />
              </div>
            </div>
          )}

          {/* 3. Geometry Regulators */}
          <div className="space-y-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
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
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block mb-1">
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
                <span>Вихри</span>
              </label>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* CENTER COLUMN: INTERACTIVE 3D/2D CANVAS + ON-SCREEN HUD CONTROLS        */}
        {/* ======================================================================= */}
        <div className="flex-1 relative flex flex-col min-h-[380px] bg-slate-950 overflow-hidden">
          {/* Top Camera View Buttons Toolbar */}
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-slate-900/85 backdrop-blur-md px-2 py-1 rounded-xl border border-slate-800 shadow-xl">
            <span className="text-[9px] text-slate-400 font-bold uppercase mr-1 hidden sm:inline">Вид:</span>
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
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
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
          <div className="absolute top-2.5 right-2.5 z-10 hidden sm:flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-800 text-[10px] text-slate-300">
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
                left: Math.min(window.innerWidth - 220, probeData.x + 15),
                top: Math.max(10, probeData.y - 80),
              }}
              className="pointer-events-none absolute z-20 bg-slate-950/95 border border-cyan-400/80 rounded-xl p-2 text-[10px] shadow-2xl backdrop-blur-md min-w-[180px]"
            >
              <div className="flex items-center justify-between text-cyan-300 font-bold border-b border-slate-800 pb-0.5 mb-1">
                <span>🎯 ЗОНД ДАВЛЕНИЯ</span>
                <span>$C_p$: {probeData.cp}</span>
              </div>
              <div className="grid grid-cols-2 gap-0.5 text-[9px] text-slate-300">
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
          <div className="absolute bottom-3 left-3 z-20">
            <VirtualJoystick
              mode={joystickMode}
              onModeChange={setJoystickMode}
              onChange={handleJoystickChange}
              throttle={throttle}
              onThrottleChange={setThrottle}
              size={120}
              showThrottle={true}
            />
          </div>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: REALTIME TELEMETRY MATRIX & NUMERICAL MONITOR             */}
        {/* ======================================================================= */}
        <div className="w-full lg:w-80 bg-slate-900/80 border-l border-slate-800 flex flex-col overflow-y-auto p-3 space-y-3 shrink-0">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5" />
              <span>Матрица Характеристик</span>
            </div>
            <span className="text-[9px] text-slate-500">Live Telemetry</span>
          </div>

          {/* Key Flight Metrics Cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Подъемная сила $C_L$</span>
              <strong className="text-base font-black text-cyan-300">{telemetry.cl}</strong>
              <div className="text-[9px] text-slate-500 mt-0.5">{telemetry.liftKN} кН</div>
            </div>

            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Сопротивление $C_D$</span>
              <strong className="text-base font-black text-rose-300">{telemetry.cd}</strong>
              <div className="text-[9px] text-slate-500 mt-0.5">{telemetry.dragKN} кН</div>
            </div>

            <div className="bg-slate-950/80 p-2 rounded-xl border border-cyan-500/30">
              <span className="text-[10px] text-cyan-400 font-bold block">Качество $K = L/D$</span>
              <strong className="text-lg font-black text-emerald-400">{telemetry.ldRatio}</strong>
              <div className="text-[9px] text-emerald-500/80 mt-0.5">Аэродинамич. КПД</div>
            </div>

            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Перегрузка $N_z$</span>
              <strong className="text-lg font-black text-amber-300">{telemetry.loadFactorG} G</strong>
              <div className="text-[9px] text-slate-500 mt-0.5">Лимит: 4.5 G</div>
            </div>
          </div>

          {/* Detailed Atmosphere & Physics Table */}
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1 text-xs">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">
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
              <span className="text-slate-400">Плотность $\rho$:</span>
              <strong className="text-slate-200">{telemetry.densityKgM3} кг/м³</strong>
            </div>

            <div className="flex justify-between py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Число $Re$:</span>
              <strong className="text-indigo-300">{telemetry.reynoldsMil} × 10⁶</strong>
            </div>

            <div className="flex justify-between py-0.5 border-b border-slate-900">
              <span className="text-slate-400">Торможение $T_0$:</span>
              <strong className="text-rose-300">+{telemetry.totalTempC} °C</strong>
            </div>

            <div className="flex justify-between py-0.5">
              <span className="text-slate-400">Крит. скор. флаттера $V_f$:</span>
              <strong className={telemetry.isFlutterDivergent ? 'text-rose-400' : 'text-emerald-400'}>
                {telemetry.vFlutterMs} м/с
              </strong>
            </div>
          </div>

          {/* Quick Guidance / Switcher Hint */}
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-indigo-900/40 text-[10px] text-slate-300 space-y-1">
            <div className="flex items-center gap-1 text-indigo-400 font-bold">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Быстрое Переключение Анимаций</span>
            </div>
            <p className="text-[9px] text-slate-400 leading-relaxed">
              Вы можете мгновенно переключаться между всеми 8 физическими симуляциями (3D крыло, CFD, 6-DoF, VLM, Флаттер, Cp, Сверхзвук, GNC)
              в верхнем меню или кнопками ‹ и › без выхода из полноэкранного режима.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
