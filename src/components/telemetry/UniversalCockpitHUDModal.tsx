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
  | 'bem_rotor'
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
    description: '3D модель несущей поверхности с динамическими линиями тока, изобарами Cp, концевыми вихрями и скачками',
    category: 'Аэродинамика',
  },
  {
    id: 'cfd_wind_tunnel',
    label: 'CFD Аэродинамическая Труба',
    shortLabel: 'CFD Труба',
    icon: Wind,
    description: 'Численное моделирование поля обтекания профиля с частицами, вихревым следом и срывом погранслоя',
    category: 'CFD Моделирование',
  },
  {
    id: 'flight_6dof',
    label: 'Динамика полета 6-DoF & PFD',
    shortLabel: '6-DoF Полет',
    icon: Plane,
    description: 'Пилотажный авиагоризонт PFD, аэродинамические моменты и непрерывный динамический отклик на штурвал/джойстик',
    category: 'Динамика Полета',
  },
  {
    id: 'vlm_3d',
    label: 'Вихревая теория VLM (3D)',
    shortLabel: 'VLM Вихри',
    icon: Layers,
    description: 'Дискретизация крыла подковообразными вихрями, циркуляция Г(y), скос потока и индуктивное сопротивление',
    category: 'Теория Решёток',
  },
  {
    id: 'bem_rotor',
    label: 'Винты & Роторы BEM (3D)',
    shortLabel: 'Винты BEM',
    icon: Disc,
    description: '3D динамика вращения воздушного винта/ротора БПЛА, сужающаяся струя спутного следа, тяга dT/dr и крутящий момент',
    category: 'Теория Винта',
  },
  {
    id: 'flutter_fsi',
    label: 'Аэроупругость & Флаттер (FSI)',
    shortLabel: 'Флаттер FSI',
    icon: Waves,
    description: '2-DoF связанные автоколебания изгиб-кручение, фазовый портрет (h, ḣ) и динамическая граница устойчивости V_flutter',
    category: 'Аэроупругость',
  },
  {
    id: 'cp_distribution',
    label: 'Эпюра коэффициента давления Cp',
    shortLabel: 'График Cp',
    icon: BarChart3,
    description: 'Хордовое распределение разрежения Cp(x/c), пик на носке, интегрирование подъемной силы и векторы давления',
    category: 'Анализ Профилей',
  },
  {
    id: 'supersonic_mach',
    label: 'Сверхзвук & Скачки Уплотнения',
    shortLabel: 'Сверхзвук',
    icon: Zap,
    description: 'Косые и прямые скачки Маха, веер разрежения Прандтля-Майера, конус Маха и аэротермический нагрев',
    category: 'Газодинамика',
  },
  {
    id: 'uav_guidance',
    label: 'GNC Наведение & Траектории БПЛА',
    shortLabel: 'GNC Наведение',
    icon: Navigation,
    description: 'Пропорциональная навигация (PN), динамический вектор визирования LOS и кинематика перехвата маневрирующей цели',
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

  // Propeller / Rotor (BEM) Parameters
  const [rotorRpm, setRotorRpm] = useState<number>(4600); // RPM
  const [rotorBlades, setRotorBlades] = useState<number>(3); // 2-6 blades
  const [rotorDiameter, setRotorDiameter] = useState<number>(0.28); // meters (280 mm)
  const [rotorPitchDeg, setRotorPitchDeg] = useState<number>(14); // deg
  const [isDuctedRotor, setIsDuctedRotor] = useState<boolean>(false);
  const [rotorColormap, setRotorColormap] = useState<'thrust' | 'alpha' | 'mach' | 'twist'>('thrust');

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
  const [showVectors, setShowVectors] = useState<boolean>(true);
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

  // Continuous Dynamic Flight Physics States
  const flightStateRef = useRef<{
    pitch: number;
    roll: number;
    yaw: number;
    pRate: number;
    qRate: number;
    rRate: number;
    airspeed: number;
    altitude: number;
    gLoad: number;
    vvi: number;
    heading: number;
    rotorAngle: number;
    plungeH: number;
    pitchA: number;
    plungeVel: number;
    pitchVel: number;
    uavPos: { x: number; y: number };
    targetPos: { x: number; y: number };
    targetVel: { vx: number; vy: number };
    uavTrail: Array<{ x: number; y: number }>;
    targetTrail: Array<{ x: number; y: number }>;
  }>({
    pitch: 4.5,
    roll: 0,
    yaw: 45,
    pRate: 0,
    qRate: 0,
    rRate: 0,
    airspeed: 245,
    altitude: 10500,
    gLoad: 1.0,
    vvi: 0,
    heading: 45,
    rotorAngle: 0,
    plungeH: 0,
    pitchA: 0,
    plungeVel: 0,
    pitchVel: 0,
    uavPos: { x: 120, y: 460 },
    targetPos: { x: 860, y: 180 },
    targetVel: { vx: 2.2, vy: -0.5 },
    uavTrail: [],
    targetTrail: [],
  });

  // Flow Particle Tracing State for Rich Streamlines
  const flowParticlesRef = useRef<
    Array<{ x: number; y: number; z: number; speed: number; life: number; maxLife: number; colorIdx: number }>
  >([]);

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

    // Wing planform reference
    const wingAreaS = (aspectRatio > 0 ? (2 * 12) * (2 * 12) / aspectRatio : 40); // m^2 approx
    const baseCl = (2 * Math.PI * alphaRad * pgFactor) / (1 + (2 * Math.PI) / (Math.PI * aspectRatio * 0.9));
    const cl = Math.max(-1.4, Math.min(1.85, baseCl + (flaps * 0.025)));
    const cdi = (cl * cl) / (Math.PI * aspectRatio * 0.88);
    const cd0 = 0.018 + (mach > 0.82 ? Math.pow(mach - 0.82, 3) * 1.5 : 0);
    const cd = cd0 + cdi;
    const ldRatio = cd > 0 ? cl / cd : 0;

    const liftKN = (cl * dynamicPressureQ * wingAreaS) / 1000;
    const dragKN = (cd * dynamicPressureQ * wingAreaS) / 1000;

    // Flutter boundary speed (Theodorsen / 2-DoF FSI)
    const omegaH = Math.sqrt(Math.max(1, bendingStiffnessKh) / 2.5); // rad/s
    const omegaA = Math.sqrt(Math.max(1, torsionStiffnessKa) / 0.8); // rad/s
    const freqRatio = omegaH / omegaA;
    const vFlutterMs = Math.round(omegaA * 0.8 * Math.sqrt(Math.max(0.2, 1 - freqRatio * 0.4)) * (1 + structuralDamping * 8));
    const isFlutterDivergent = trueAirspeed > vFlutterMs;

    // Rotor BEM Real-time Derived Metrics
    const rotorRps = rotorRpm / 60;
    const rotorRadius = rotorDiameter / 2;
    const diskArea = Math.PI * rotorRadius * rotorRadius;
    const omega = 2 * Math.PI * rotorRps;
    const tipSpeedMs = omega * rotorRadius;
    const tipMach = tipSpeedMs / speedOfSound;
    const advanceRatio_J = trueAirspeed / (rotorRps * rotorDiameter || 0.01);
    
    // Blade element momentum estimate
    const solidity = (rotorBlades * 0.025) / (Math.PI * rotorRadius);
    const pitchRad = (rotorPitchDeg * Math.PI) / 180;
    const ct = Math.max(0.001, (solidity * 5.7 / 2) * (pitchRad / 3 - Math.max(0, advanceRatio_J) / 2));
    const rotorThrustN = ct * density * Math.PI * Math.pow(rotorRadius, 4) * omega * omega * (isDuctedRotor ? 1.28 : 1.0);
    const cp = ct * (advanceRatio_J + Math.sqrt(ct / 2)) * 1.15;
    const rotorPowerW = cp * density * Math.PI * Math.pow(rotorRadius, 5) * Math.pow(omega, 3);
    const rotorTorqueNm = omega > 0 ? rotorPowerW / omega : 0;

    return {
      altitudeM: Math.round(altitude),
      airspeedMs: Math.round(trueAirspeed),
      airspeedKmh: Math.round(trueAirspeed * 3.6),
      machNum: parseFloat(mach.toFixed(3)),
      dynamicPressureKPa: parseFloat((dynamicPressureQ / 1000).toFixed(2)),
      staticPressureKPa: parseFloat((pressurePa / 1000).toFixed(2)),
      densityKgM3: parseFloat(density.toFixed(3)),
      tempC: Math.round(tempK - 273.15),
      totalTempC: Math.round((tempK * (1 + 0.2 * mach * mach)) - 273.15),
      speedOfSoundMs: Math.round(speedOfSound),
      reynoldsMil: parseFloat(((density * trueAirspeed * 3.2) / 1.789e-5 / 1e6).toFixed(2)),
      cl: parseFloat(cl.toFixed(3)),
      cd: parseFloat(cd.toFixed(4)),
      cdi: parseFloat(cdi.toFixed(4)),
      ldRatio: parseFloat(ldRatio.toFixed(2)),
      liftKN: parseFloat(liftKN.toFixed(1)),
      dragKN: parseFloat(dragKN.toFixed(1)),
      loadFactorG: parseFloat((Math.max(0.1, liftKN / 18)).toFixed(2)),
      vFlutterMs,
      isFlutterDivergent,
      // Rotor BEM
      rotorThrustN: parseFloat(rotorThrustN.toFixed(1)),
      rotorThrustKg: parseFloat((rotorThrustN / 9.81).toFixed(2)),
      rotorTorqueNm: parseFloat(rotorTorqueNm.toFixed(3)),
      rotorPowerW: parseFloat(rotorPowerW.toFixed(1)),
      rotorPowerHp: parseFloat((rotorPowerW / 735.5).toFixed(2)),
      tipSpeedMs: parseFloat(tipSpeedMs.toFixed(1)),
      tipMach: parseFloat(tipMach.toFixed(2)),
      advanceRatio_J: parseFloat(advanceRatio_J.toFixed(3)),
      solidity: parseFloat(solidity.toFixed(3)),
      diskArea: parseFloat(diskArea.toFixed(3)),
    };
  }, [altitude, mach, alpha, sweepAngle, aspectRatio, flaps, bendingStiffnessKh, torsionStiffnessKa, structuralDamping, rotorRpm, rotorBlades, rotorDiameter, rotorPitchDeg, isDuctedRotor]);

  // Handle Virtual Joystick inputs
  const handleJoystickChange = useCallback(
    (val: JoystickValue) => {
      if (joystickMode === 'camera_orbit') {
        rotYRef.current = (rotYRef.current + val.x * 3.5) % 360;
        rotXRef.current = Math.max(-85, Math.min(85, rotXRef.current - val.y * 3.5));
      } else if (joystickMode === 'flight_yoke') {
        setElevator((prev) => parseFloat(Math.max(-25, Math.min(25, -val.y * 20)).toFixed(1)));
        setAileron((prev) => parseFloat(Math.max(-25, Math.min(25, val.x * 20)).toFixed(1)));
        setAlpha((prev) => parseFloat(Math.max(-4, Math.min(22, 4.5 - val.y * 10)).toFixed(1)));
      } else if (joystickMode === 'aero_flow') {
        setAlpha((prev) => parseFloat(Math.max(-6, Math.min(26, prev - val.y * 0.4)).toFixed(1)));
        setMach((prev) => parseFloat(Math.max(0.1, Math.min(3.5, prev + val.x * 0.02)).toFixed(3)));
      } else if (joystickMode === 'drone_vector') {
        setAltitude((prev) => Math.max(100, Math.min(25000, prev + Math.round(val.y * 50))));
        setBeta((prev) => parseFloat(Math.max(-15, Math.min(15, prev + val.x * 0.3)).toFixed(1)));
      } else if (joystickMode === 'target_guidance') {
        setBeta((prev) => parseFloat(Math.max(-20, Math.min(20, prev + val.x * 0.5)).toFixed(1)));
        setAlpha((prev) => parseFloat(Math.max(-5, Math.min(25, prev - val.y * 0.5)).toFixed(1)));
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
  // MULTI-DOMAIN RENDERING ENGINE IN CANVAS 2D/3D (GPU ACCELERATED & DYNAMIC)
  // =========================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;
    const ctx = createHardware2DContext(canvas);
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Initialize flow particles if empty
    if (flowParticlesRef.current.length === 0) {
      for (let i = 0; i < 180; i++) {
        flowParticlesRef.current.push({
          x: (Math.random() - 0.5) * 800,
          y: (Math.random() - 0.5) * 200,
          z: (Math.random() - 0.5) * 600,
          speed: 4 + Math.random() * 6,
          life: Math.random() * 100,
          maxLife: 80 + Math.random() * 60,
          colorIdx: Math.floor(Math.random() * 4),
        });
      }
    }

    const render = () => {
      const dt = 0.016 * simSpeed;
      time += 0.03 * simSpeed;

      // Handle HiDPI Dynamic Canvas Resizing
      const containerW = canvas.clientWidth || 1280;
      const containerH = canvas.clientHeight || 720;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.floor(containerW * dpr);
      const targetH = Math.floor(containerH * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const width = targetW;
      const height = targetH;

      // Dark Aero Cockpit Background
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, width, height);

      // Radial HUD background vignette
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width * 0.65);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.09)');
      gradient.addColorStop(0.6, 'rgba(15, 23, 42, 0.92)');
      gradient.addColorStop(1, 'rgba(3, 7, 18, 0.98)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Continuous Physics Integration Step
      const fs = flightStateRef.current;
      fs.rotorAngle = (fs.rotorAngle + (rotorRpm * 2 * Math.PI / 60) * dt) % (Math.PI * 2);

      // 6-DoF aircraft dynamics integration
      const targetRoll = -aileron * 1.8;
      const targetPitch = alpha * 1.4 - elevator * 1.1;
      fs.pRate += (targetRoll - fs.roll) * 8.0 * dt - fs.pRate * 6.0 * dt;
      fs.qRate += (targetPitch - fs.pitch) * 8.0 * dt - fs.qRate * 6.0 * dt;
      fs.roll += fs.pRate * dt;
      fs.pitch += fs.qRate * dt;
      fs.heading = (fs.heading + (fs.roll * 0.05 + rudder * 0.15) * dt * 50) % 360;
      if (fs.heading < 0) fs.heading += 360;

      // 2-DoF Flutter Integration Step (Plunge h & Pitch alpha)
      const vRatio = telemetry.airspeedMs / telemetry.vFlutterMs;
      const omegaA = Math.sqrt(torsionStiffnessKa / 0.8);
      const omegaH = Math.sqrt(bendingStiffnessKh / 2.5);
      if (telemetry.isFlutterDivergent) {
        // Explosive flutter oscillation / Limit Cycle Oscillation
        const flutterFreq = (omegaA + omegaH) * 0.5;
        fs.plungeH = Math.sin(time * flutterFreq) * 55 * Math.min(2.5, 0.6 + (vRatio - 1) * 3);
        fs.pitchA = Math.cos(time * flutterFreq - 0.7) * 18 * Math.min(2.5, 0.6 + (vRatio - 1) * 3);
      } else {
        // Damped natural stable oscillation
        const decay = Math.exp(-time * structuralDamping * 1.5);
        fs.plungeH = Math.sin(time * omegaH) * 25 * decay;
        fs.pitchA = Math.cos(time * omegaA - 0.5) * 8 * decay;
      }

      // UAV PNG Trajectory Dynamics Integration
      const targetSpeed = 160;
      fs.targetPos.x += Math.cos(time * 0.5) * targetSpeed * 0.3 * dt;
      fs.targetPos.y += Math.sin(time * 0.8) * targetSpeed * 0.25 * dt;

      const losDx = fs.targetPos.x - fs.uavPos.x;
      const losDy = fs.targetPos.y - fs.uavPos.y;
      const losDist = Math.hypot(losDx, losDy);
      const losAngle = Math.atan2(losDy, losDx);
      const uavSpeed = 240;
      fs.uavPos.x += Math.cos(losAngle) * uavSpeed * dt;
      fs.uavPos.y += Math.sin(losAngle) * uavSpeed * dt;

      // Maintain Trajectory Trails
      if (Math.random() < 0.35) {
        fs.uavTrail.push({ ...fs.uavPos });
        fs.targetTrail.push({ ...fs.targetPos });
        if (fs.uavTrail.length > 70) fs.uavTrail.shift();
        if (fs.targetTrail.length > 70) fs.targetTrail.shift();
      }

      // Reset UAV intercept loop when close
      if (losDist < 25) {
        fs.uavPos = { x: 120, y: 460 };
        fs.targetPos = { x: 860, y: 180 };
        fs.uavTrail = [];
        fs.targetTrail = [];
      }

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

        const fov = 750;
        const scale = fov / (fov + z2);
        return {
          x: x1 * scale,
          y: -y2 * scale,
          depth: z2,
          scale,
        };
      };

      // =====================================================================
      // DOMAIN 1: 3D AERO STUDIO (3D WING & DYNAMIC STREAMLINE PARTICLES)
      // =====================================================================
      if (activeDomain === '3d_aero_studio') {
        ctx.save();
        ctx.translate(width / 2 + panRef.current.x * dpr, height / 2 + panRef.current.y * dpr);
        ctx.scale(zoomRef.current * dpr, zoomRef.current * dpr);

        // Floor Ground Grid with Aero Depth
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.7)';
        ctx.lineWidth = 1;
        const gridSize = 400;
        const gridStep = 50;
        for (let gx = -gridSize; gx <= gridSize; gx += gridStep) {
          const p1 = project3D(gx, -140, -gridSize);
          const p2 = project3D(gx, -140, gridSize);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
        for (let gz = -gridSize; gz <= gridSize; gz += gridStep) {
          const p1 = project3D(-gridSize, -140, gz);
          const p2 = project3D(gridSize, -140, gz);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }

        // 3D Wing Geometry
        const halfSpan = 240;
        const rootChord = 150;
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
          // Left wing panel
          const gradL = ctx.createLinearGradient(pLeftRootLE.x, pLeftRootLE.y, pLeftTipTE.x, pLeftTipTE.y);
          gradL.addColorStop(0, mach > 0.85 ? 'rgba(244, 63, 94, 0.65)' : 'rgba(6, 182, 212, 0.65)');
          gradL.addColorStop(0.5, 'rgba(99, 102, 241, 0.55)');
          gradL.addColorStop(1, 'rgba(16, 185, 129, 0.45)');

          ctx.fillStyle = gradL;
          ctx.beginPath();
          ctx.moveTo(pLeftRootLE.x, pLeftRootLE.y);
          ctx.lineTo(pLeftTipLE.x, pLeftTipLE.y);
          ctx.lineTo(pLeftTipTE.x, pLeftTipTE.y);
          ctx.lineTo(pLeftRootTE.x, pLeftRootTE.y);
          ctx.closePath();
          ctx.fill();

          // Right wing panel
          const gradR = ctx.createLinearGradient(pLeftRootLE.x, pLeftRootLE.y, pRightTipTE.x, pRightTipTE.y);
          gradR.addColorStop(0, mach > 0.85 ? 'rgba(244, 63, 94, 0.65)' : 'rgba(6, 182, 212, 0.65)');
          gradR.addColorStop(0.5, 'rgba(99, 102, 241, 0.55)');
          gradR.addColorStop(1, 'rgba(16, 185, 129, 0.45)');

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

          // Spanwise Rib Lines
          for (let rib = 1; rib < 6; rib++) {
            const frac = rib / 6;
            const zL = -halfSpan * frac;
            const zR = halfSpan * frac;
            const xLE = tipSweepX * frac;
            const chordLoc = rootChord + (tipChord - rootChord) * frac;

            const pRibLEL = project3D(...(Object.values(rotatePitch({ x: xLE, y: 0, z: zL })) as [number, number, number]));
            const pRibTEL = project3D(...(Object.values(rotatePitch({ x: xLE + chordLoc, y: 0, z: zL })) as [number, number, number]));
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.beginPath();
            ctx.moveTo(pRibLEL.x, pRibLEL.y);
            ctx.lineTo(pRibTEL.x, pRibTEL.y);
            ctx.stroke();

            const pRibLER = project3D(...(Object.values(rotatePitch({ x: xLE, y: 0, z: zR })) as [number, number, number]));
            const pRibTER = project3D(...(Object.values(rotatePitch({ x: xLE + chordLoc, y: 0, z: zR })) as [number, number, number]));
            ctx.beginPath();
            ctx.moveTo(pRibLER.x, pRibLER.y);
            ctx.lineTo(pRibTER.x, pRibTER.y);
            ctx.stroke();
          }
        }

        // Shock Wave Shock Surface if Mach >= 0.80
        if (showShockWaves && mach >= 0.8) {
          const shockX = tipSweepX * 0.45 + rootChord * 0.38;
          const pShock1 = project3D(...(Object.values(rotatePitch({ x: shockX, y: 40, z: -halfSpan * 0.88 })) as [number, number, number]));
          const pShock2 = project3D(...(Object.values(rotatePitch({ x: shockX, y: 40, z: halfSpan * 0.88 })) as [number, number, number]));
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.9)';
          ctx.lineWidth = 3.5;
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 10;
          ctx.setLineDash([10, 5]);
          ctx.beginPath();
          ctx.moveTo(pShock1.x, pShock1.y);
          ctx.lineTo(pShock2.x, pShock2.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.shadowBlur = 0;
        }

        // Live Dynamic Flow Particle Stream
        if (showStreamlines) {
          flowParticlesRef.current.forEach((part) => {
            part.x += part.speed * simSpeed * (1 + mach * 0.5);
            part.life += 1;
            if (part.x > 380 || part.life > part.maxLife) {
              part.x = -320;
              part.y = (Math.random() - 0.5) * 80;
              part.z = (Math.random() - 0.5) * (halfSpan * 2.2);
              part.life = 0;
            }

            // Airfoil upwash deflection
            let py = part.y;
            if (part.x > -50 && part.x < rootChord + 50 && Math.abs(part.z) < halfSpan) {
              py += Math.sin((part.x / rootChord) * Math.PI) * 22;
            }

            const pProj = project3D(part.x, py, part.z);
            const alphaFrac = 1 - part.life / part.maxLife;
            ctx.fillStyle = `rgba(${part.colorIdx === 0 ? '6,182,212' : part.colorIdx === 1 ? '99,102,241' : '56,189,248'}, ${alphaFrac * 0.85})`;
            ctx.beginPath();
            ctx.arc(pProj.x, pProj.y, Math.max(1, 2.5 * pProj.scale), 0, Math.PI * 2);
            ctx.fill();
          });
        }

        // Tip Vortices Shedding in 3D
        if (showVortices) {
          const leftTipSpiral = rotatePitch({ x: tipSweepX + tipChord, y: 0, z: -halfSpan });
          const rightTipSpiral = rotatePitch({ x: tipSweepX + tipChord, y: 0, z: halfSpan });
          ctx.strokeStyle = 'rgba(234, 179, 8, 0.9)';
          ctx.lineWidth = 2.4;

          // Left tip vortex
          ctx.beginPath();
          for (let a = 0; a < 30; a++) {
            const radius = a * 1.4;
            const angle = a * 0.8 + time * 6;
            const vortexPt = project3D(
              leftTipSpiral.x + a * 12,
              leftTipSpiral.y + Math.sin(angle) * radius,
              leftTipSpiral.z + Math.cos(angle) * radius
            );
            if (a === 0) ctx.moveTo(vortexPt.x, vortexPt.y);
            else ctx.lineTo(vortexPt.x, vortexPt.y);
          }
          ctx.stroke();

          // Right tip vortex
          ctx.beginPath();
          for (let a = 0; a < 30; a++) {
            const radius = a * 1.4;
            const angle = a * 0.8 - time * 6;
            const vortexPt = project3D(
              rightTipSpiral.x + a * 12,
              rightTipSpiral.y + Math.sin(angle) * radius,
              rightTipSpiral.z - Math.cos(angle) * radius
            );
            if (a === 0) ctx.moveTo(vortexPt.x, vortexPt.y);
            else ctx.lineTo(vortexPt.x, vortexPt.y);
          }
          ctx.stroke();
        }

        ctx.restore();
      }

      // =====================================================================
      // DOMAIN 2: CFD WIND TUNNEL 2D/3D (FLOW PARTICLES & VORTEX SHEDDING)
      // =====================================================================
      else if (activeDomain === 'cfd_wind_tunnel') {
        const cx = width / 2 + panRef.current.x * dpr;
        const cy = height / 2 + panRef.current.y * dpr;
        const scale = 2.2 * zoomRef.current * dpr;
        const chordLen = 240 * scale;

        ctx.save();
        // Flow tunnel background grid
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 40 * dpr) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += 40 * dpr) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Live 2D Flow Streamlines with Velocity Gradients
        const streamCount = 32;
        const alphaRad = (alpha * Math.PI) / 180;
        for (let s = 0; s < streamCount; s++) {
          const initY = (s / (streamCount - 1)) * height;
          const distFromCenter = (initY - cy) / scale;

          ctx.beginPath();
          const hue = 190 + Math.sin(s * 0.3 + time) * 30;
          ctx.strokeStyle = `hsla(${hue}, 85%, 60%, ${0.35 + Math.sin((s + time * 2) * 0.4) * 0.2})`;
          ctx.lineWidth = 1.8;

          for (let px = 0; px <= width; px += 20 * dpr) {
            const relX = (px - cx) / chordLen;
            let defY = 0;

            if (relX >= -0.7 && relX <= 1.5) {
              const foilInfluence = Math.exp(-Math.pow(distFromCenter / 90, 2));
              const liftUpwash = -Math.sin(alphaRad) * Math.sin((relX + 0.7) * 1.6) * 45 * scale;
              const thicknessBump = Math.exp(-Math.pow(relX - 0.25, 2) * 8) * (distFromCenter < 0 ? -40 : 40) * scale;
              defY = (liftUpwash + thicknessBump) * foilInfluence;

              // Unsteady von Kármán stall vortex shedding when alpha > 12
              if (alpha > 12 && relX > 0.3 && distFromCenter > -60 && distFromCenter < 40) {
                defY += Math.sin(relX * 16 - time * 9 + s) * (alpha - 10) * 3.5 * scale;
              }
            }

            const py = initY + defY;
            if (px === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }

        // Transonic Shockwave on upper surface if Mach >= 0.8
        if (mach >= 0.8) {
          const shockX = cx + chordLen * 0.18;
          const shockYTop = cy - 160 * scale;
          const shockYBot = cy - 25 * scale;
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.95)';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.moveTo(shockX - 12 * scale, shockYTop);
          ctx.quadraticCurveTo(shockX, cy - 90 * scale, shockX + 6 * scale, shockYBot);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // NACA Airfoil Profile in Cross-Section
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-alphaRad);

        ctx.beginPath();
        const pts = 90;
        for (let i = 0; i <= pts; i++) {
          const xc = i / pts;
          const yt = 5 * 0.12 * (0.2969 * Math.sqrt(xc) - 0.126 * xc - 0.3516 * xc * xc + 0.2843 * xc * xc * xc - 0.1015 * xc * xc * xc * xc);
          const yc = 0.04 * (xc < 0.4 ? (2 * 0.4 * xc - xc * xc) / 0.16 : ((1 - 2 * 0.4) + 2 * 0.4 * xc - xc * xc) / 0.36);
          const x = (xc - 0.25) * chordLen;
          const y = -(yc + yt) * chordLen;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        for (let i = pts; i >= 0; i--) {
          const xc = i / pts;
          const yt = 5 * 0.12 * (0.2969 * Math.sqrt(xc) - 0.126 * xc - 0.3516 * xc * xc + 0.2843 * xc * xc * xc - 0.1015 * xc * xc * xc * xc);
          const yc = 0.04 * (xc < 0.4 ? (2 * 0.4 * xc - xc * xc) / 0.16 : ((1 - 2 * 0.4) + 2 * 0.4 * xc - xc * xc) / 0.36);
          const x = (xc - 0.25) * chordLen;
          const y = -(yc - yt) * chordLen;
          ctx.lineTo(x, y);
        }
        ctx.closePath();

        const foilGrad = ctx.createLinearGradient(-chordLen * 0.25, -60, chordLen * 0.75, 60);
        foilGrad.addColorStop(0, '#0284c7');
        foilGrad.addColorStop(0.5, '#0369a1');
        foilGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = foilGrad;
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.8;
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
        const pitch = fs.pitch;
        const roll = fs.roll;
        const pitchPx = pitch * 7 * dpr;

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
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-width, pitchPx);
        ctx.lineTo(width, pitchPx);
        ctx.stroke();

        // Pitch Ladder Bars
        for (let deg = -40; deg <= 40; deg += 10) {
          if (deg === 0) continue;
          const barY = pitchPx - deg * 7 * dpr;
          const barW = Math.abs(deg) === 10 ? 90 * dpr : 140 * dpr;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-barW / 2, barY);
          ctx.lineTo(barW / 2, barY);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${12 * dpr}px monospace`;
          ctx.textAlign = 'right';
          ctx.fillText(`${deg}`, -barW / 2 - 8 * dpr, barY + 4 * dpr);
          ctx.textAlign = 'left';
          ctx.fillText(`${deg}`, barW / 2 + 8 * dpr, barY + 4 * dpr);
        }
        ctx.restore();

        // 2. Fixed Aircraft Crosshair Symbol
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 4 * dpr;
        ctx.beginPath();
        ctx.moveTo(cx - 80 * dpr, cy);
        ctx.lineTo(cx - 30 * dpr, cy);
        ctx.lineTo(cx - 30 * dpr, cy + 14 * dpr);
        ctx.moveTo(cx + 30 * dpr, cy + 14 * dpr);
        ctx.lineTo(cx + 30 * dpr, cy);
        ctx.lineTo(cx + 80 * dpr, cy);
        ctx.moveTo(cx - 8 * dpr, cy);
        ctx.arc(cx, cy, 8 * dpr, 0, Math.PI * 2);
        ctx.stroke();

        // 3. Airspeed Tape (Left)
        const tapeLeft = cx - 260 * dpr;
        ctx.fillStyle = 'rgba(3, 7, 18, 0.88)';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2 * dpr;
        ctx.fillRect(tapeLeft - 60 * dpr, cy - 160 * dpr, 100 * dpr, 320 * dpr);
        ctx.strokeRect(tapeLeft - 60 * dpr, cy - 160 * dpr, 100 * dpr, 320 * dpr);

        ctx.fillStyle = '#38bdf8';
        ctx.font = `bold ${18 * dpr}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`${telemetry.airspeedKmh}`, tapeLeft - 10 * dpr, cy + 6 * dpr);
        ctx.font = `${11 * dpr}px monospace`;
        ctx.fillText('КМ/Ч', tapeLeft - 10 * dpr, cy + 26 * dpr);

        // 4. Altitude Tape (Right)
        const tapeRight = cx + 260 * dpr;
        ctx.fillRect(tapeRight - 40 * dpr, cy - 160 * dpr, 100 * dpr, 320 * dpr);
        ctx.strokeRect(tapeRight - 40 * dpr, cy - 160 * dpr, 100 * dpr, 320 * dpr);

        ctx.fillStyle = '#10b981';
        ctx.font = `bold ${18 * dpr}px monospace`;
        ctx.fillText(`${telemetry.altitudeM}`, tapeRight + 10 * dpr, cy + 6 * dpr);
        ctx.font = `${11 * dpr}px monospace`;
        ctx.fillText('МЕТРЫ', tapeRight + 10 * dpr, cy + 26 * dpr);

        // 5. Compass Heading Tape (Bottom)
        ctx.fillRect(cx - 160 * dpr, cy + 180 * dpr, 320 * dpr, 55 * dpr);
        ctx.strokeRect(cx - 160 * dpr, cy + 180 * dpr, 320 * dpr, 55 * dpr);
        ctx.fillStyle = '#f59e0b';
        ctx.font = `bold ${14 * dpr}px monospace`;
        ctx.fillText(`КУРС HDG ${Math.round(fs.heading).toString().padStart(3, '0')}° | БЕТА β ${beta}°`, cx, cy + 214 * dpr);

        ctx.restore();
      }

      // =====================================================================
      // DOMAIN 4: VLM 3D (VORTEX LATTICE METHOD & TRAILING HORSESHOE WAKE)
      // =====================================================================
      else if (activeDomain === 'vlm_3d') {
        ctx.save();
        ctx.translate(width / 2 + panRef.current.x * dpr, height / 2 + panRef.current.y * dpr);
        ctx.scale(zoomRef.current * dpr, zoomRef.current * dpr);

        const span = 360;
        const chord = 160;
        const panelsY = 16;
        const panelsX = 6;

        for (let py = 0; py < panelsY; py++) {
          const y1 = (py / panelsY - 0.5) * span;
          const y2 = ((py + 1) / panelsY - 0.5) * span;
          const circ = Math.sin(((py + 0.5) / panelsY) * Math.PI) * (alpha * 0.14 + 0.2);

          for (let px = 0; px < panelsX; px++) {
            const x1 = (px / panelsX) * chord;
            const x2 = ((px + 1) / panelsX) * chord;

            const pA = project3D(x1, 0, y1);
            const pB = project3D(x1, 0, y2);
            const pC = project3D(x2, 0, y2);
            const pD = project3D(x2, 0, y1);

            ctx.fillStyle = `rgba(99, 102, 241, ${0.15 + circ * 0.65})`;
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
              ctx.lineWidth = 2.4;
              ctx.beginPath();
              ctx.moveTo(bv1.x, bv1.y);
              ctx.lineTo(bv2.x, bv2.y);
              ctx.stroke();
            }
          }

          // Trailing Wake Vortices streaming downstream
          const wakeA = project3D(chord, 0, y1);
          const wakeEnd = project3D(chord + 280, Math.sin(time * 3 + py) * 8, y1);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(wakeA.x, wakeA.y);
          ctx.lineTo(wakeEnd.x, wakeEnd.y);
          ctx.stroke();
        }

        ctx.restore();
      }

      // =====================================================================
      // DOMAIN 5: BEM ROTOR 3D (PROPELLER, DUCTED FAN & SLIPSTREAM WAKE)
      // =====================================================================
      else if (activeDomain === 'bem_rotor') {
        ctx.save();
        ctx.translate(width / 2 + panRef.current.x * dpr, height / 2 + panRef.current.y * dpr);
        ctx.scale(zoomRef.current * dpr, zoomRef.current * dpr);

        const rR = 180; // visual rotor radius
        const hubR = 35;
        const currentRotAngle = fs.rotorAngle;

        // Ground/Engine Mount Reference
        const mountP1 = project3D(0, -160, 0);
        const mountP2 = project3D(0, -30, 0);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(mountP1.x, mountP1.y);
        ctx.lineTo(mountP2.x, mountP2.y);
        ctx.stroke();

        // Contracted Slipstream Wake Tube (Helical Tip Vortices)
        if (showStreamlines) {
          const wakeSteps = 45;
          for (let b = 0; b < rotorBlades; b++) {
            const bladeBaseAngle = currentRotAngle + (b * (2 * Math.PI / rotorBlades));
            ctx.strokeStyle = `hsla(${(b * 90 + 190) % 360}, 80%, 65%, 0.7)`;
            ctx.lineWidth = 2.2;
            ctx.beginPath();

            for (let st = 0; st <= wakeSteps; st++) {
              const xDownstream = st * 9;
              // Slipstream tube contracts from 1.0 down to 1/sqrt(2) = 0.707
              const contraction = 1.0 - 0.293 * (1 - Math.exp(-st * 0.08));
              const rWake = rR * contraction;
              const angleWake = bladeBaseAngle - st * 0.35;
              const yPos = Math.sin(angleWake) * rWake;
              const zPos = Math.cos(angleWake) * rWake;

              const pt = project3D(xDownstream, yPos, zPos);
              if (st === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            }
            ctx.stroke();
          }
        }

        // Ducted Shroud Ring if enabled
        if (isDuctedRotor) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          for (let deg = 0; deg <= 360; deg += 10) {
            const rad = (deg * Math.PI) / 180;
            const pt = project3D(-15, Math.sin(rad) * (rR + 12), Math.cos(rad) * (rR + 12));
            if (deg === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();

          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let deg = 0; deg <= 360; deg += 10) {
            const rad = (deg * Math.PI) / 180;
            const pt = project3D(35, Math.sin(rad) * (rR + 12), Math.cos(rad) * (rR + 12));
            if (deg === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
        }

        // Rotating Rotor Blades (3D polygon elements with twist and chord)
        for (let b = 0; b < rotorBlades; b++) {
          const bladeAngle = currentRotAngle + (b * (2 * Math.PI / rotorBlades));
          const numSections = 8;

          for (let sec = 0; sec < numSections; sec++) {
            const r1 = hubR + (sec / numSections) * (rR - hubR);
            const r2 = hubR + ((sec + 1) / numSections) * (rR - hubR);
            const twist1 = ((rotorPitchDeg - (sec / numSections) * 12) * Math.PI) / 180;
            const twist2 = ((rotorPitchDeg - ((sec + 1) / numSections) * 12) * Math.PI) / 180;

            const chord1 = 28 * (1 - 0.4 * (sec / numSections));
            const chord2 = 28 * (1 - 0.4 * ((sec + 1) / numSections));

            // 4 Corner points of blade element in 3D
            const p1LE = project3D(-Math.sin(twist1) * chord1 * 0.3, Math.sin(bladeAngle) * r1, Math.cos(bladeAngle) * r1);
            const p1TE = project3D(Math.sin(twist1) * chord1 * 0.7, Math.sin(bladeAngle) * r1 + Math.cos(bladeAngle) * chord1 * 0.2, Math.cos(bladeAngle) * r1 - Math.sin(bladeAngle) * chord1 * 0.2);
            const p2TE = project3D(Math.sin(twist2) * chord2 * 0.7, Math.sin(bladeAngle) * r2 + Math.cos(bladeAngle) * chord2 * 0.2, Math.cos(bladeAngle) * r2 - Math.sin(bladeAngle) * chord2 * 0.2);
            const p2LE = project3D(-Math.sin(twist2) * chord2 * 0.3, Math.sin(bladeAngle) * r2, Math.cos(bladeAngle) * r2);

            // Element Colormap
            let elemColor = 'rgba(6, 182, 212, 0.85)';
            if (rotorColormap === 'thrust') {
              const thrustFrac = Math.sin((sec / numSections) * Math.PI);
              elemColor = `rgba(${Math.round(6 + thrustFrac * 238)}, ${Math.round(182 - thrustFrac * 100)}, ${Math.round(212 - thrustFrac * 150)}, 0.85)`;
            } else if (rotorColormap === 'mach') {
              const localM = (sec / numSections) * telemetry.tipMach;
              elemColor = localM > 0.75 ? 'rgba(244, 63, 94, 0.85)' : 'rgba(16, 185, 129, 0.85)';
            }

            ctx.fillStyle = elemColor;
            ctx.beginPath();
            ctx.moveTo(p1LE.x, p1LE.y);
            ctx.lineTo(p1TE.x, p1TE.y);
            ctx.lineTo(p2TE.x, p2TE.y);
            ctx.lineTo(p2LE.x, p2LE.y);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          // Force Vectors on Blade Tip
          if (showVectors) {
            const tipX = 0;
            const tipY = Math.sin(bladeAngle) * rR;
            const tipZ = Math.cos(bladeAngle) * rR;
            const pTip = project3D(tipX, tipY, tipZ);
            const pThrustVec = project3D(tipX - 60, tipY, tipZ); // Thrust points forward (negative X)

            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2.8;
            ctx.beginPath();
            ctx.moveTo(pTip.x, pTip.y);
            ctx.lineTo(pThrustVec.x, pThrustVec.y);
            ctx.stroke();
          }
        }

        // Central Spinner Hub Dome
        const hubP = project3D(0, 0, 0);
        const hubNose = project3D(-45, 0, 0);
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(hubP.x, hubP.y, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(hubP.x - 22, hubP.y);
        ctx.lineTo(hubNose.x, hubNose.y);
        ctx.lineTo(hubP.x + 22, hubP.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }

      // =====================================================================
      // DOMAIN 6: FLUTTER & AEROELASTICITY (FSI 2-DOF INTEGRATION)
      // =====================================================================
      else if (activeDomain === 'flutter_fsi') {
        const cx = width / 2;
        const cy = height / 2;
        const plungeH = fs.plungeH * dpr;
        const pitchA = fs.pitchA;
        const isDivergent = telemetry.isFlutterDivergent;

        ctx.save();
        // Airfoil with Structural Springs
        ctx.translate(cx - 140 * dpr, cy);

        // Bending Spring Kh (Vertical)
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3 * dpr;
        ctx.beginPath();
        for (let s = -120 * dpr; s <= plungeH; s += 12 * dpr) {
          const sx = s % 24 === 0 ? 12 * dpr : -12 * dpr;
          if (s === -120 * dpr) ctx.moveTo(sx, s);
          else ctx.lineTo(sx, s);
        }
        ctx.stroke();

        // Oscillating Airfoil Section
        ctx.save();
        ctx.translate(0, plungeH);
        ctx.rotate((pitchA * Math.PI) / 180);

        ctx.fillStyle = isDivergent ? 'rgba(239, 68, 68, 0.85)' : 'rgba(16, 185, 129, 0.85)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3 * dpr;
        ctx.beginPath();
        ctx.ellipse(0, 0, 110 * dpr, 24 * dpr, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Elastic axis (EA) & Center of Gravity (CG)
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(-16 * dpr, 0, 6 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(22 * dpr, 0, 6 * dpr, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        ctx.restore();

        // Dynamic Phase Portrait Plot (Right Side)
        const plotCx = cx + 240 * dpr;
        const plotCy = cy;
        const plotW = 300 * dpr;
        const plotH = 260 * dpr;

        ctx.strokeStyle = 'rgba(51, 65, 85, 0.9)';
        ctx.strokeRect(plotCx - plotW / 2, plotCy - plotH / 2, plotW, plotH);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(plotCx - plotW / 2, plotCy - plotH / 2, plotW, plotH);

        // Phase trajectory curve
        ctx.strokeStyle = isDivergent ? '#ef4444' : '#10b981';
        ctx.lineWidth = 2.5 * dpr;
        ctx.beginPath();
        for (let t = 0; t < Math.PI * 2; t += 0.1) {
          const amp = isDivergent ? 1.4 : 0.8;
          const px = plotCx + Math.sin(t) * 100 * amp * dpr;
          const py = plotCy + Math.cos(t) * 80 * amp * dpr;
          if (t === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${13 * dpr}px monospace`;
        ctx.fillText('ФАЗОВЫЙ ПОРТРЕТ (h vs ḣ)', plotCx - 130 * dpr, plotCy - 105 * dpr);
        ctx.fillStyle = isDivergent ? '#f87171' : '#34d399';
        ctx.fillText(
          isDivergent ? `⚠ ФЛАТТЕР ДИВЕРГЕНЦИЯ (V > ${telemetry.vFlutterMs} м/с)` : `✓ УСТОЙЧИВО (V < ${telemetry.vFlutterMs} м/с)`,
          plotCx - 130 * dpr,
          plotCy + 115 * dpr
        );
      }

      // =====================================================================
      // DOMAIN 7: CP PRESSURE DISTRIBUTION
      // =====================================================================
      else if (activeDomain === 'cp_distribution') {
        const cx = width / 2;
        const cy = height / 2;
        const graphW = Math.min(width - 200 * dpr, 750 * dpr);
        const graphH = 360 * dpr;
        const leftX = cx - graphW / 2;
        const topY = cy - graphH / 2;

        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.fillRect(leftX, topY, graphW, graphH);
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.9)';
        ctx.strokeRect(leftX, topY, graphW, graphH);

        // Cp = 0 Reference Line
        const zeroY = topY + graphH * 0.45;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.setLineDash([6, 6]);
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
          const py = zeroY + cpUpper * 75 * dpr;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3.5 * dpr;
        ctx.stroke();

        ctx.beginPath();
        for (let i = 0; i <= 60; i++) {
          const xc = i / 60;
          const cpLower = 0.9 * Math.exp(-xc * 4.0) * (1 - xc) + 0.1 * (1 - xc);
          const px = leftX + xc * graphW;
          const py = zeroY + cpLower * 75 * dpr;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3.5 * dpr;
        ctx.stroke();

        // Legend & Labels
        ctx.fillStyle = '#38bdf8';
        ctx.font = `bold ${14 * dpr}px monospace`;
        ctx.fillText('— Верхняя поверхность (Разрежение -Cp)', leftX + 25 * dpr, topY + 35 * dpr);
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('— Нижняя поверхность (Давление +Cp)', leftX + 25 * dpr, topY + 60 * dpr);
        ctx.fillStyle = '#10b981';
        ctx.fillText(`Площадь петли ∮ Cp d(x/c) = CL ${telemetry.cl}`, leftX + 25 * dpr, topY + 90 * dpr);

        ctx.restore();
      }

      // =====================================================================
      // DOMAIN 8: SUPERSONIC MACH & OBLIQUE SHOCK WAVES
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
        ctx.lineWidth = 3.5 * dpr;
        ctx.beginPath();
        ctx.moveTo(cx - 90 * dpr, cy);
        ctx.lineTo(cx + 220 * dpr, cy - 80 * dpr);
        ctx.lineTo(cx + 220 * dpr, cy + 80 * dpr);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Oblique Shock Waves from Apex
        const betaAngleRad = muRad * 1.35;
        const shockLen = 420 * dpr;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4.5 * dpr;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 16;

        // Top Shock
        ctx.beginPath();
        ctx.moveTo(cx - 90 * dpr, cy);
        ctx.lineTo(cx - 90 * dpr + Math.cos(betaAngleRad) * shockLen, cy - Math.sin(betaAngleRad) * shockLen);
        ctx.stroke();

        // Bottom Shock
        ctx.beginPath();
        ctx.moveTo(cx - 90 * dpr, cy);
        ctx.lineTo(cx - 90 * dpr + Math.cos(betaAngleRad) * shockLen, cy + Math.sin(betaAngleRad) * shockLen);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Dynamic Supersonic Inflow Particles
        for (let i = 0; i < 24; i++) {
          const py = cy + (i - 12) * 28 * dpr;
          const px = ((time * 900 + i * 50) % (width + 200 * dpr)) - 100 * dpr;
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(px, py, 3 * dpr, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${16 * dpr}px monospace`;
        ctx.fillText(`СВЕРХЗВУКОВОЙ ПОТОК: M = ${supMach.toFixed(2)} M`, cx - 240 * dpr, cy - 150 * dpr);
        ctx.fillStyle = '#ef4444';
        ctx.fillText(`УГОЛ КОНУСА МАХА μ = ${muDeg.toFixed(1)}°`, cx - 240 * dpr, cy - 125 * dpr);

        ctx.restore();
      }

      // =====================================================================
      // DOMAIN 9: UAV GUIDANCE & PROPORTIONAL NAVIGATION (PNG)
      // =====================================================================
      else if (activeDomain === 'uav_guidance') {
        const cx = width / 2;
        const cy = height / 2;

        ctx.save();
        // Target & UAV Trajectory Trails
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        fs.targetTrail.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x * dpr, pt.y * dpr);
          else ctx.lineTo(pt.x * dpr, pt.y * dpr);
        });
        ctx.stroke();

        ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
        ctx.lineWidth = 2.5 * dpr;
        ctx.beginPath();
        fs.uavTrail.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x * dpr, pt.y * dpr);
          else ctx.lineTo(pt.x * dpr, pt.y * dpr);
        });
        ctx.stroke();

        // Target Aircraft Symbol
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(fs.targetPos.x * dpr, fs.targetPos.y * dpr, 12 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${11 * dpr}px monospace`;
        ctx.fillText('ЦЕЛЬ', (fs.targetPos.x - 16) * dpr, (fs.targetPos.y - 16) * dpr);

        // Pursuer UAV Symbol
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(fs.uavPos.x * dpr, fs.uavPos.y * dpr, 10 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('БПЛА', (fs.uavPos.x - 16) * dpr, (fs.uavPos.y + 22) * dpr);

        // Dynamic Line-of-Sight (LOS) Vector
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.85)';
        ctx.lineWidth = 2 * dpr;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(fs.uavPos.x * dpr, fs.uavPos.y * dpr);
        ctx.lineTo(fs.targetPos.x * dpr, fs.targetPos.y * dpr);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#38bdf8';
        ctx.font = `bold ${13 * dpr}px monospace`;
        ctx.fillText('ЗАКОН НАВЕДЕНИЯ: a_n = N · V_c · dλ/dt', cx - 220 * dpr, cy + 200 * dpr);

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
    rudder,
    sweepAngle,
    aspectRatio,
    taperRatio,
    rotorRpm,
    rotorBlades,
    rotorDiameter,
    rotorPitchDeg,
    isDuctedRotor,
    rotorColormap,
    bendingStiffnessKh,
    torsionStiffnessKa,
    structuralDamping,
    showPressureIso,
    showWireframe,
    showShockWaves,
    showStreamlines,
    showVortices,
    showVectors,
    telemetry,
  ]);

  if (!isOpen) return null;

  const currentDomainMeta = COCKPIT_DOMAINS.find((d) => d.id === activeDomain) || COCKPIT_DOMAINS[0];
  const IconComponent = currentDomainMeta.icon;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/98 text-slate-100 font-mono backdrop-blur-xl animate-fadeIn select-none overflow-hidden">
      {/* ========================================================================= */}
      {/* COCKPIT TOP HEADER & UNIVERSAL DOMAIN SWITCHER (ALL 9 SIMULATIONS)        */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between px-3 py-2 bg-slate-900/95 border-b border-cyan-500/40 shadow-lg gap-2 shrink-0">
        <div className="flex items-center justify-between md:justify-start gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-300">
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider text-cyan-400 uppercase">
                  {currentDomainMeta.category}
                </span>
                <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700 px-1.5 py-0.2 rounded font-mono">
                  LIVE HUD
                </span>
              </div>
              <h2 className="text-sm font-bold text-white leading-none mt-0.5">
                {currentDomainMeta.label}
              </h2>
            </div>
          </div>
        </div>

        {/* Universal Horizontal Simulation Switcher Tabs (All 9 Domains) */}
        <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={handlePrevDomain}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer shrink-0"
            title="Предыдущая симуляция"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Desktop Full Simulation Tabs */}
          <div className="hidden xl:flex items-center gap-1">
            {COCKPIT_DOMAINS.map((dom) => {
              const DomIcon = dom.icon;
              return (
                <button
                  key={dom.id}
                  type="button"
                  onClick={() => setActiveDomain(dom.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
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

          {/* Tablet & Mobile Dropdown Switcher */}
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
            title="Следующая симуляция"
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
              setRotorRpm(4600);
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

          {/* 1. Primary Flow Sliders (Mach, Alpha, Alt) */}
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
                max="25000"
                step="500"
                value={altitude}
                onChange={(e) => setAltitude(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>
          </div>

          {/* 2. Domain-Specific Control Regulators */}
          {activeDomain === 'bem_rotor' && (
            <div className="space-y-2.5 bg-slate-950/60 p-2.5 rounded-xl border border-cyan-800/60">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                Параметры Винта & Ротора (BEM)
              </span>
              <div>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-slate-400">Частота вращения (RPM):</span>
                  <strong className="text-cyan-300 font-bold">{rotorRpm.toLocaleString()} RPM</strong>
                </div>
                <input
                  type="range"
                  min="200"
                  max="14000"
                  step="100"
                  value={rotorRpm}
                  onChange={(e) => setRotorRpm(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-slate-400">Количество лопастей (B):</span>
                  <strong className="text-purple-300 font-bold">{rotorBlades} лоп.</strong>
                </div>
                <div className="flex items-center gap-1.5">
                  {[2, 3, 4, 5, 6].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setRotorBlades(b)}
                      className={`flex-1 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                        rotorBlades === b ? 'bg-purple-600 text-white font-black' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-slate-400">Диаметр винта (D):</span>
                  <strong className="text-emerald-300">{(rotorDiameter * 1000).toFixed(0)} мм</strong>
                </div>
                <input
                  type="range"
                  min="0.12"
                  max="1.80"
                  step="0.02"
                  value={rotorDiameter}
                  onChange={(e) => setRotorDiameter(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-slate-400">Шаг / Угол установки ($\theta_0$):</span>
                  <strong className="text-amber-300">{rotorPitchDeg}°</strong>
                </div>
                <input
                  type="range"
                  min="4"
                  max="45"
                  step="1"
                  value={rotorPitchDeg}
                  onChange={(e) => setRotorPitchDeg(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              <div className="pt-1 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs text-cyan-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDuctedRotor}
                    onChange={(e) => setIsDuctedRotor(e.target.checked)}
                    className="rounded accent-cyan-400"
                  />
                  <span>Кольцевой канал (Импеллер)</span>
                </label>
              </div>
            </div>
          )}

          {activeDomain === 'flight_6dof' && (
            <div className="space-y-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">
                Рули & Органы Управления
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
                  step="1"
                  value={elevator}
                  onChange={(e) => setElevator(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-slate-400">Элероны (Ailerons):</span>
                  <strong className="text-slate-200">{aileron}°</strong>
                </div>
                <input
                  type="range"
                  min="-25"
                  max="25"
                  step="1"
                  value={aileron}
                  onChange={(e) => setAileron(parseInt(e.target.value))}
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

          {/* Key Metrics Cards (Changes conditionally if BEM rotor or wing) */}
          {activeDomain === 'bem_rotor' ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Тяга Винта $T$</span>
                <strong className="text-base font-black text-cyan-300">{telemetry.rotorThrustN} Н</strong>
                <div className="text-[9px] text-slate-500 mt-0.5">{telemetry.rotorThrustKg} кгс</div>
              </div>

              <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Момент $Q$</span>
                <strong className="text-base font-black text-rose-300">{telemetry.rotorTorqueNm} Н·м</strong>
                <div className="text-[9px] text-slate-500 mt-0.5">{telemetry.rotorPowerHp} л.с.</div>
              </div>

              <div className="bg-slate-950/80 p-2 rounded-xl border border-cyan-500/30">
                <span className="text-[10px] text-cyan-400 font-bold block">Поступь $J$</span>
                <strong className="text-lg font-black text-emerald-400">{telemetry.advanceRatio_J}</strong>
                <div className="text-[9px] text-emerald-500/80 mt-0.5">Полетный режим</div>
              </div>

              <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Концевой $M_{`{tip}`}$</span>
                <strong className="text-lg font-black text-amber-300">{telemetry.tipMach} M</strong>
                <div className="text-[9px] text-slate-500 mt-0.5">{telemetry.tipSpeedMs} м/с</div>
              </div>
            </div>
          ) : (
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
          )}

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

          {/* Quick Switcher Help */}
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-indigo-900/40 text-[10px] text-slate-300 space-y-1">
            <div className="flex items-center gap-1 text-indigo-400 font-bold">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Быстрое Переключение Анимаций</span>
            </div>
            <p className="text-[9px] text-slate-400 leading-relaxed">
              Вы можете мгновенно переключаться между всеми 9 физическими симуляциями (3D крыло, CFD, 6-DoF, VLM, Винты BEM, Флаттер, Cp, Сверхзвук, GNC)
              в верхнем меню или кнопками ‹ и › без выхода из полноэкранного режима.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
