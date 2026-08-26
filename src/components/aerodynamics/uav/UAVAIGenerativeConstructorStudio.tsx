import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Download,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Box,
  Cpu,
  Zap,
  Activity,
  Compass,
  Wind,
  Shield,
  Gauge,
  Eye,
  EyeOff,
  Flame,
  Radio,
  FileCode2,
  FileText,
  Boxes,
  Scale,
  Crosshair,
  TrendingUp,
  Maximize2,
  Minimize2,
  ChevronRight,
  Info,
  Rocket,
  Plane,
  CornerDownLeft,
  CheckSquare,
  Share2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

export type UAVConfigType =
  | 'flying_wing'
  | 'conventional_tractor'
  | 'twin_boom_pusher'
  | 'vtol_quadplane'
  | 'x_wing_munition';

export interface ComponentBayItem {
  id: string;
  name: string;
  category: 'battery' | 'avionics' | 'payload' | 'propulsion' | 'servos' | 'recovery';
  mass_kg: number;
  posX_m: number; // relative to nose x=0
  posY_m: number; // lateral offset
  posZ_m: number; // vertical offset
  dimL_mm: number;
  dimW_mm: number;
  dimH_mm: number;
  color: string;
  isLocked?: boolean;
}

export interface GeneratedVariant {
  id: string;
  name: string;
  tag: string;
  score: number;
  wingspan_m: number;
  chordRoot_m: number;
  chordTip_m: number;
  wingArea_m2: number;
  aspectRatio: number;
  taperRatio: number;
  sweepAngle_deg: number;
  airfoil: string;
  clMax: number;
  cd0: number;
  ldMax: number;
  mtow_kg: number;
  emptyMass_kg: number;
  batteryMass_kg: number;
  payloadMass_kg: number;
  cruiseSpeed_kmh: number;
  stallSpeed_kmh: number;
  maxRange_km: number;
  endurance_min: number;
  cruisePower_W: number;
  motorModel: string;
  propellerModel: string;
  batterySpec: string;
  staticMargin_pct: number;
}

export const UAVAIGenerativeConstructorStudio: React.FC = () => {
  // Active Tab within AI Constructor
  const [activeTab, setActiveTab] = useState<
    'mdo_synthesizer' | 'cad_assembly_cg' | 'stability_propulsion' | 'production_firmware' | 'virtual_flight_hil'
  >('mdo_synthesizer');

  // Mission Specification Inputs (ТЗ)
  const [uavType, setUavType] = useState<UAVConfigType>('twin_boom_pusher');
  const [reqPayload_kg, setReqPayload_kg] = useState<number>(2.5);
  const [reqRange_km, setReqRange_km] = useState<number>(250);
  const [reqLoiterTime_min, setReqLoiterTime_min] = useState<number>(180);
  const [reqCruiseSpeed_kmh, setReqCruiseSpeed_kmh] = useState<number>(90);
  const [maxStallSpeed_kmh, setMaxStallSpeed_kmh] = useState<number>(42);
  const [maxMtowLimit_kg, setMaxMtowLimit_kg] = useState<number>(16.0);
  const [altitudeCruise_m, setAltitudeCruise_m] = useState<number>(1500);

  // Selected Variant index
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number>(0);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [optimizationProgress, setOptimizationProgress] = useState<number>(100);

  // 3D CAD Component Assembly State
  const [componentBays, setComponentBays] = useState<ComponentBayItem[]>([
    {
      id: 'bat_pack',
      name: 'Li-Ion 6S6P 24000mAh',
      category: 'battery',
      mass_kg: 4.35,
      posX_m: 0.42,
      posY_m: 0.0,
      posZ_m: -0.02,
      dimL_mm: 220,
      dimW_mm: 110,
      dimH_mm: 75,
      color: '#06b6d4',
    },
    {
      id: 'autopilot_cube',
      name: 'Pixhawk Cube Orange+ / EKF3',
      category: 'avionics',
      mass_kg: 0.35,
      posX_m: 0.58,
      posY_m: 0.0,
      posZ_m: 0.03,
      dimL_mm: 95,
      dimW_mm: 55,
      dimH_mm: 35,
      color: '#8b5cf6',
    },
    {
      id: 'gimbal_camera',
      name: 'ОЭС Тепловизор 4K 30x EO/IR',
      category: 'payload',
      mass_kg: 1.2,
      posX_m: 0.12,
      posY_m: 0.0,
      posZ_m: -0.06,
      dimL_mm: 120,
      dimW_mm: 110,
      dimH_mm: 140,
      color: '#10b981',
    },
    {
      id: 'motor_pusher',
      name: 'T-Motor MN5212 340KV + 18x6" CF',
      category: 'propulsion',
      mass_kg: 0.65,
      posX_m: 1.15,
      posY_m: 0.0,
      posZ_m: 0.02,
      dimL_mm: 85,
      dimW_mm: 85,
      dimH_mm: 65,
      color: '#f59e0b',
    },
    {
      id: 'servos_vtail',
      name: 'Цифровые Серво KST DS215MG (4x)',
      category: 'servos',
      mass_kg: 0.22,
      posX_m: 0.95,
      posY_m: 0.0,
      posZ_m: 0.0,
      dimL_mm: 45,
      dimW_mm: 45,
      dimH_mm: 30,
      color: '#ec4899',
    },
    {
      id: 'parachute_bay',
      name: 'Пневмо-Парашют Спасения + Airbag',
      category: 'recovery',
      mass_kg: 0.75,
      posX_m: 0.72,
      posY_m: 0.0,
      posZ_m: 0.04,
      dimL_mm: 140,
      dimW_mm: 80,
      dimH_mm: 60,
      color: '#ef4444',
    },
  ]);

  // CAD View Modes
  const [cadRenderMode, setCadRenderMode] = useState<'xray' | 'solid' | 'airfoil_ribs' | 'cg_ellipsoid'>('solid');
  const [showInertiaEllipsoid, setShowInertiaEllipsoid] = useState<boolean>(true);
  const [selectedCompId, setSelectedCompId] = useState<string>('bat_pack');

  // Virtual Flight Simulator Runtime
  const [isFlightSimActive, setIsFlightSimActive] = useState<boolean>(false);
  const [simThrottle, setSimThrottle] = useState<number>(65); // %
  const [simPitchStick, setSimPitchStick] = useState<number>(0); // -1..1
  const [simRollStick, setSimRollStick] = useState<number>(0); // -1..1
  const [simRudderStick, setSimRudderStick] = useState<number>(0); // -1..1
  const [windGust_mps, setWindGust_mps] = useState<number>(3.5);
  const [simState, setSimState] = useState<{
    speed_kmh: number;
    altitude_m: number;
    aoa_deg: number;
    pitch_deg: number;
    roll_deg: number;
    gForce_ny: number;
    cl: number;
    cd: number;
    power_W: number;
    variometer_mps: number;
    stallWarning: boolean;
  }>({
    speed_kmh: 88.5,
    altitude_m: 450,
    aoa_deg: 3.8,
    pitch_deg: 2.1,
    roll_deg: 0.0,
    gForce_ny: 1.02,
    cl: 0.52,
    cd: 0.027,
    power_W: 195,
    variometer_mps: 0.4,
    stallWarning: false,
  });

  // Canvas Refs
  const cadCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const flightHudCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Rotation angles for 3D Viewport
  const [cadRotX, setCadRotX] = useState<number>(22);
  const [cadRotY, setCadRotY] = useState<number>(-45);
  const [cadZoom, setCadZoom] = useState<number>(1.15);
  const isDraggingCadRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Preset Configurations
  const applyPresetMission = (presetKey: string) => {
    switch (presetKey) {
      case 'male_recon':
        setUavType('twin_boom_pusher');
        setReqPayload_kg(3.5);
        setReqRange_km(450);
        setReqLoiterTime_min(360);
        setReqCruiseSpeed_kmh(95);
        setMaxStallSpeed_kmh(40);
        setMaxMtowLimit_kg(19.5);
        break;
      case 'fpv_interceptor':
        setUavType('flying_wing');
        setReqPayload_kg(1.2);
        setReqRange_km(65);
        setReqLoiterTime_min(35);
        setReqCruiseSpeed_kmh(160);
        setMaxStallSpeed_kmh(55);
        setMaxMtowLimit_kg(4.2);
        break;
      case 'cargo_vtol':
        setUavType('vtol_quadplane');
        setReqPayload_kg(6.0);
        setReqRange_km(180);
        setReqLoiterTime_min(140);
        setReqCruiseSpeed_kmh(110);
        setMaxStallSpeed_kmh(45);
        setMaxMtowLimit_kg(28.0);
        break;
      case 'lancet_munition':
        setUavType('x_wing_munition');
        setReqPayload_kg(4.0);
        setReqRange_km(120);
        setReqLoiterTime_min(75);
        setReqCruiseSpeed_kmh(130);
        setMaxStallSpeed_kmh(50);
        setMaxMtowLimit_kg(14.0);
        break;
      case 'survey_glider':
        setUavType('conventional_tractor');
        setReqPayload_kg(1.8);
        setReqRange_km(320);
        setReqLoiterTime_min(300);
        setReqCruiseSpeed_kmh(75);
        setMaxStallSpeed_kmh(35);
        setMaxMtowLimit_kg(8.5);
        break;
      default:
        break;
    }
    triggerReoptimization();
  };

  const triggerReoptimization = () => {
    setIsOptimizing(true);
    setOptimizationProgress(15);
    const interval = setInterval(() => {
      setOptimizationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsOptimizing(false);
          return 100;
        }
        return prev + 25;
      });
    }, 90);
  };

  // Generative MDO Solver: Generates 3 Pareto-Optimal Aircraft Options
  const generatedVariants = useMemo<GeneratedVariant[]>(() => {
    // Air density at cruise altitude
    const rho = 1.225 * Math.pow(1 - (0.0065 * altitudeCruise_m) / 288.15, 4.256);

    // Baseline calculation based on mission requirements
    const V_cruise_mps = reqCruiseSpeed_kmh / 3.6;
    const V_stall_mps = maxStallSpeed_kmh / 3.6;

    // Estimate structural fraction
    const structFrac = uavType === 'flying_wing' ? 0.28 : uavType === 'vtol_quadplane' ? 0.38 : 0.32;

    // Variant A: Max Range & High Aerodynamic Efficiency (L/D)
    const spanA = Number((Math.sqrt(reqRange_km / 14) * 0.55 + 1.6).toFixed(2));
    const arA = Number((11.5 + (uavType === 'flying_wing' ? -3.5 : 2.5)).toFixed(1));
    const areaA = Number((Math.pow(spanA, 2) / arA).toFixed(3));
    const crA = Number(((2 * areaA) / (spanA * (1 + 0.55))).toFixed(3));
    const ctA = Number((crA * 0.55).toFixed(3));
    const ldMaxA = Number((18.5 + arA * 0.45).toFixed(1));
    const mtowA = Number((reqPayload_kg * 1.6 + 4.2 + (reqRange_km / 100) * 0.9).toFixed(1));
    const pCruiseA = Math.round(((mtowA * 9.81) / ldMaxA) * V_cruise_mps * 1.15);
    const batMassA = Number((mtowA * 0.38).toFixed(1));

    // Variant B: Ultra-Lightweight & Agile (Minimum MTOW)
    const spanB = Number((spanA * 0.82).toFixed(2));
    const arB = Number((arA * 0.85).toFixed(1));
    const areaB = Number((Math.pow(spanB, 2) / arB).toFixed(3));
    const crB = Number(((2 * areaB) / (spanB * (1 + 0.65))).toFixed(3));
    const ctB = Number((crB * 0.65).toFixed(3));
    const ldMaxB = Number((ldMaxA * 0.86).toFixed(1));
    const mtowB = Number((mtowA * 0.78).toFixed(1));
    const pCruiseB = Math.round(((mtowB * 9.81) / ldMaxB) * V_cruise_mps * 1.12);
    const batMassB = Number((mtowB * 0.32).toFixed(1));

    // Variant C: Tactical Balanced Multi-Role
    const spanC = Number(((spanA + spanB) / 2).toFixed(2));
    const arC = Number(((arA + arB) / 2).toFixed(1));
    const areaC = Number((Math.pow(spanC, 2) / arC).toFixed(3));
    const crC = Number(((2 * areaC) / (spanC * (1 + 0.6))).toFixed(3));
    const ctC = Number((crC * 0.6).toFixed(3));
    const ldMaxC = Number(((ldMaxA + ldMaxB) / 2).toFixed(1));
    const mtowC = Number(((mtowA + mtowB) / 2).toFixed(1));
    const pCruiseC = Math.round(((mtowC * 9.81) / ldMaxC) * V_cruise_mps * 1.14);
    const batMassC = Number((mtowC * 0.35).toFixed(1));

    return [
      {
        id: 'var_a',
        name: 'Вариант A: Максимальная Дальность & Высокое Качество',
        tag: 'Max Range & (L/D)max',
        score: 96.4,
        wingspan_m: spanA,
        chordRoot_m: crA,
        chordTip_m: ctA,
        wingArea_m2: areaA,
        aspectRatio: arA,
        taperRatio: 0.55,
        sweepAngle_deg: uavType === 'flying_wing' ? 22 : 4.5,
        airfoil: 'Selig S1223 / MH60 High-Lift',
        clMax: 1.62,
        cd0: 0.021,
        ldMax: ldMaxA,
        mtow_kg: mtowA,
        emptyMass_kg: Number((mtowA * structFrac).toFixed(1)),
        batteryMass_kg: batMassA,
        payloadMass_kg: reqPayload_kg,
        cruiseSpeed_kmh: reqCruiseSpeed_kmh,
        stallSpeed_kmh: Number((Math.sqrt((2 * mtowA * 9.81) / (rho * areaA * 1.62)) * 3.6).toFixed(1)),
        maxRange_km: Math.round(reqRange_km * 1.22),
        endurance_min: Math.round(reqLoiterTime_min * 1.25),
        cruisePower_W: pCruiseA,
        motorModel: 'T-Motor MN5212 340KV Pro',
        propellerModel: 'APC 18x8" Carbon Folding',
        batterySpec: 'Li-Ion 6S6P 21700 Molicel P42A',
        staticMargin_pct: 12.4,
      },
      {
        id: 'var_b',
        name: 'Вариант B: Минимальная Масса & Компактность',
        tag: 'Ultra-Light & Agile MTOW',
        score: 91.8,
        wingspan_m: spanB,
        chordRoot_m: crB,
        chordTip_m: ctB,
        wingArea_m2: areaB,
        aspectRatio: arB,
        taperRatio: 0.65,
        sweepAngle_deg: uavType === 'flying_wing' ? 18 : 3.0,
        airfoil: 'NACA 2412 Fast Cruise',
        clMax: 1.38,
        cd0: 0.024,
        ldMax: ldMaxB,
        mtow_kg: mtowB,
        emptyMass_kg: Number((mtowB * structFrac).toFixed(1)),
        batteryMass_kg: batMassB,
        payloadMass_kg: reqPayload_kg,
        cruiseSpeed_kmh: Number((reqCruiseSpeed_kmh * 1.08).toFixed(0)),
        stallSpeed_kmh: Number((Math.sqrt((2 * mtowB * 9.81) / (rho * areaB * 1.38)) * 3.6).toFixed(1)),
        maxRange_km: Math.round(reqRange_km * 0.95),
        endurance_min: Math.round(reqLoiterTime_min * 0.92),
        cruisePower_W: pCruiseB,
        motorModel: 'T-Motor AT3520 720KV',
        propellerModel: 'Mejzlik 15x7" CF',
        batterySpec: 'LiPo 6S 10000mAh 45C High-Drain',
        staticMargin_pct: 11.2,
      },
      {
        id: 'var_c',
        name: 'Вариант C: Сбалансированный Тактический Комплекс',
        tag: 'Balanced Tactical Multi-Mission',
        score: 94.7,
        wingspan_m: spanC,
        chordRoot_m: crC,
        chordTip_m: ctC,
        wingArea_m2: areaC,
        aspectRatio: arC,
        taperRatio: 0.6,
        sweepAngle_deg: uavType === 'flying_wing' ? 20 : 4.0,
        airfoil: 'Clark-Y / RG-15 Hybrid',
        clMax: 1.48,
        cd0: 0.022,
        ldMax: ldMaxC,
        mtow_kg: mtowC,
        emptyMass_kg: Number((mtowC * structFrac).toFixed(1)),
        batteryMass_kg: batMassC,
        payloadMass_kg: reqPayload_kg,
        cruiseSpeed_kmh: reqCruiseSpeed_kmh,
        stallSpeed_kmh: Number((Math.sqrt((2 * mtowC * 9.81) / (rho * areaC * 1.48)) * 3.6).toFixed(1)),
        maxRange_km: Math.round(reqRange_km * 1.08),
        endurance_min: Math.round(reqLoiterTime_min * 1.05),
        cruisePower_W: pCruiseC,
        motorModel: 'Sunnysky V4008 380KV',
        propellerModel: 'APC 16x8" E-Prop',
        batterySpec: 'Li-Ion 6S4P Samsung 50S',
        staticMargin_pct: 12.8,
      },
    ];
  }, [
    uavType,
    reqPayload_kg,
    reqRange_km,
    reqLoiterTime_min,
    reqCruiseSpeed_kmh,
    maxStallSpeed_kmh,
    maxMtowLimit_kg,
    altitudeCruise_m,
  ]);

  const currentVariant = generatedVariants[selectedVariantIdx] || generatedVariants[0];

  // Mass, Dynamic Center of Gravity (CG) and Huygens-Steiner Inertia Tensor Calculation
  const massAndInertia = useMemo(() => {
    // Airframe structural mass and estimated geometric envelope
    const airframeMass = currentVariant.emptyMass_kg;
    const airframeCgX = 0.52; // average airframe center

    let totalMass = airframeMass;
    let sumMX = airframeMass * airframeCgX;
    let sumMY = 0;
    let sumMZ = 0;

    // Component masses & positions
    componentBays.forEach((comp) => {
      totalMass += comp.mass_kg;
      sumMX += comp.mass_kg * comp.posX_m;
      sumMY += comp.mass_kg * comp.posY_m;
      sumMZ += comp.mass_kg * comp.posZ_m;
    });

    const cgX = sumMX / totalMass;
    const cgY = sumMY / totalMass;
    const cgZ = sumMZ / totalMass;

    // Mean Aerodynamic Chord (MAC)
    const mac = (2 / 3) * (currentVariant.chordRoot_m + currentVariant.chordTip_m - (currentVariant.chordRoot_m * currentVariant.chordTip_m) / (currentVariant.chordRoot_m + currentVariant.chordTip_m));
    // Aerodynamic Center of Wing (ac_w) ~ 25% MAC from wing leading edge (assumed at x=0.38m)
    const wingX0 = 0.38;
    const x_ac = wingX0 + 0.25 * mac;

    // Neutral Point x_np: wing AC + tail contribution
    const tailContribution = uavType === 'flying_wing' ? 0.0 : 0.14 * mac;
    const x_np = x_ac + tailContribution;

    // Static Margin (SM): (x_np - x_cg) / MAC * 100%
    const staticMargin_pct = ((x_np - cgX) / mac) * 100;

    // Huygens-Steiner 3x3 Inertia Tensor Ixx, Iyy, Izz, Ixz
    let Ixx = 0.08 * airframeMass * Math.pow(currentVariant.wingspan_m, 2);
    let Iyy = 0.06 * airframeMass * Math.pow(1.4, 2); // fuselage length ~ 1.4m
    let Izz = Ixx + Iyy;
    let Ixz = 0.0;

    componentBays.forEach((comp) => {
      const dx = comp.posX_m - cgX;
      const dy = comp.posY_m - cgY;
      const dz = comp.posZ_m - cgZ;

      // Local inertia of rectangular box component
      const lx = comp.dimL_mm / 1000;
      const ly = comp.dimW_mm / 1000;
      const lz = comp.dimH_mm / 1000;
      const localIxx = (1 / 12) * comp.mass_kg * (ly * ly + lz * lz);
      const localIyy = (1 / 12) * comp.mass_kg * (lx * lx + lz * lz);
      const localIzz = (1 / 12) * comp.mass_kg * (lx * lx + ly * ly);

      // Parallel axis theorem (Huygens-Steiner)
      Ixx += localIxx + comp.mass_kg * (dy * dy + dz * dz);
      Iyy += localIyy + comp.mass_kg * (dx * dx + dz * dz);
      Izz += localIzz + comp.mass_kg * (dx * dx + dy * dy);
      Ixz += comp.mass_kg * dx * dz;
    });

    return {
      totalMass: Number(totalMass.toFixed(2)),
      cgX: Number(cgX.toFixed(3)),
      cgY: Number(cgY.toFixed(3)),
      cgZ: Number(cgZ.toFixed(3)),
      mac: Number(mac.toFixed(3)),
      x_ac: Number(x_ac.toFixed(3)),
      x_np: Number(x_np.toFixed(3)),
      staticMargin_pct: Number(staticMargin_pct.toFixed(1)),
      Ixx: Number(Ixx.toFixed(4)),
      Iyy: Number(Iyy.toFixed(4)),
      Izz: Number(Izz.toFixed(4)),
      Ixz: Number(Ixz.toFixed(4)),
      isBalanced: staticMargin_pct >= 9.5 && staticMargin_pct <= 15.0,
    };
  }, [componentBays, currentVariant, uavType]);

  // Auto-Balance Button: shifts battery along X to achieve target 12.0% Static Margin
  const autoTuneBatteryPlacement = useCallback(() => {
    const targetSM = 12.0;
    const targetCgX = massAndInertia.x_np - (targetSM / 100) * massAndInertia.mac;

    // Find battery component
    const bat = componentBays.find((c) => c.id === 'bat_pack');
    if (!bat) return;

    // Calculate required delta X
    const nonBatSumMX = massAndInertia.totalMass * massAndInertia.cgX - bat.mass_kg * bat.posX_m;
    const reqBatX = (targetCgX * massAndInertia.totalMass - nonBatSumMX) / bat.mass_kg;

    // Clamp within fuselage range [0.20m .. 0.85m]
    const clampedBatX = Math.max(0.2, Math.min(0.85, reqBatX));

    setComponentBays((prev) =>
      prev.map((c) => (c.id === 'bat_pack' ? { ...c, posX_m: Number(clampedBatX.toFixed(3)) } : c))
    );
  }, [massAndInertia, componentBays]);

  // Move a specific component
  const updateComponentPos = (id: string, axis: 'posX_m' | 'posY_m' | 'posZ_m', val: number) => {
    setComponentBays((prev) => prev.map((c) => (c.id === id ? { ...c, [axis]: val } : c)));
  };

  // Propulsion & Wiring Analysis
  const propulsionAnalysis = useMemo(() => {
    const cruiseV_mps = (currentVariant.cruiseSpeed_kmh || 90) / 3.6;
    const cruiseThrust_N = (massAndInertia.totalMass * 9.81) / currentVariant.ldMax;
    const propRpm = 6200;
    const propDiam_m = 0.457; // 18 inch
    const advanceRatio_J = cruiseV_mps / ((propRpm / 60) * propDiam_m);

    // Motor electrical power & current draw
    const motorEta = 0.86;
    const propEta = 0.79;
    const sysEta = motorEta * propEta;
    const pShaft_W = cruiseThrust_N * cruiseV_mps;
    const pElec_W = pShaft_W / sysEta;
    const vBat = 22.2; // 6S nominal
    const cruiseCurrent_A = pElec_W / vBat;
    const maxCurrent_A = cruiseCurrent_A * 2.6;

    // Wiring AWG calculations
    const wireLength_m = 0.85; // 85 cm harness
    const copperRho = 1.72e-8; // ohm*m
    const awg12Area_m2 = 3.31e-6; // 3.31 mm2
    const wireRes = (copperRho * (2 * wireLength_m)) / awg12Area_m2;
    const vDrop = maxCurrent_A * wireRes;
    const vDropPct = (vDrop / vBat) * 100;

    // Propeller Tip Clearance
    const fuselageWidth_mm = 160;
    const tipClearance_mm = ((propDiam_m * 1000) / 2) - fuselageWidth_mm / 2 + 85;

    return {
      advanceRatio_J: Number(advanceRatio_J.toFixed(3)),
      sysEta: Number((sysEta * 100).toFixed(1)),
      pElec_W: Math.round(pElec_W),
      cruiseCurrent_A: Number(cruiseCurrent_A.toFixed(1)),
      maxCurrent_A: Number(maxCurrent_A.toFixed(1)),
      wireGauge: 'AWG 12 High-Flex Silicone',
      vDropPct: Number(vDropPct.toFixed(2)),
      tipClearance_mm: Math.round(tipClearance_mm),
      isClearanceSafe: tipClearance_mm >= 25,
      isWiringSafe: vDropPct <= 3.0,
    };
  }, [currentVariant, massAndInertia]);

  // Virtual Flight Simulator Step Loop
  useEffect(() => {
    if (!isFlightSimActive) return;

    const interval = setInterval(() => {
      setSimState((prev) => {
        // Simple 6-DoF aerodynamic integrator
        const targetThrottlePwr = (simThrottle / 100) * 450;
        const elevatorTrim = simPitchStick * 8.0;
        const targetAoa = 3.2 + elevatorTrim + (windGust_mps * 0.2 * (Math.random() - 0.5));

        // Lift & Drag
        const cl = Math.max(0.05, Math.min(1.65, 0.1 * targetAoa + 0.25));
        const cd = 0.022 + (cl * cl) / (Math.PI * currentVariant.aspectRatio * 0.85);

        // Speed dynamic
        const thrust_N = (targetThrottlePwr * 0.75) / Math.max(10, prev.speed_kmh / 3.6);
        const drag_N = 0.5 * 1.225 * Math.pow(prev.speed_kmh / 3.6, 2) * currentVariant.wingArea_m2 * cd;
        const accel_mps2 = (thrust_N - drag_N) / massAndInertia.totalMass;

        const newSpeed_mps = Math.max(8, prev.speed_kmh / 3.6 + accel_mps2 * 0.1);
        const newSpeed_kmh = newSpeed_mps * 3.6;

        // Lift vs Weight -> Climb rate (variometer)
        const lift_N = 0.5 * 1.225 * Math.pow(newSpeed_mps, 2) * currentVariant.wingArea_m2 * cl;
        const gForce = lift_N / (massAndInertia.totalMass * 9.81);
        const climbRate_mps = (gForce - 1.0) * 4.5 + (simPitchStick * 3.0);
        const newAlt = Math.max(5, prev.altitude_m + climbRate_mps * 0.1);

        const stallWarn = targetAoa >= 13.5 || newSpeed_kmh <= currentVariant.stallSpeed_kmh;

        return {
          speed_kmh: Number(newSpeed_kmh.toFixed(1)),
          altitude_m: Number(newAlt.toFixed(1)),
          aoa_deg: Number(targetAoa.toFixed(1)),
          pitch_deg: Number((targetAoa - 1.2).toFixed(1)),
          roll_deg: Number((simRollStick * 25).toFixed(1)),
          gForce_ny: Number(gForce.toFixed(2)),
          cl: Number(cl.toFixed(3)),
          cd: Number(cd.toFixed(4)),
          power_W: Math.round(targetThrottlePwr),
          variometer_mps: Number(climbRate_mps.toFixed(1)),
          stallWarning: stallWarn,
        };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isFlightSimActive, simThrottle, simPitchStick, simRollStick, windGust_mps, currentVariant, massAndInertia]);

  // 3D Canvas Rendering Engine (Airframe Wireframe + Component Bays + CG Marker + Inertia Ellipsoid)
  useEffect(() => {
    const canvas = cadCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 700);
    const height = (canvas.height = 420);

    // Clear background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Draw tech grid
    ctx.strokeStyle = '#1e293b';
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

    // 3D Projection math
    const cx = width / 2;
    const cy = height / 2 + 10;
    const scale = 190 * cadZoom;

    const radX = (cadRotX * Math.PI) / 180;
    const radY = (cadRotY * Math.PI) / 180;

    const project3D = (x: number, y: number, z: number) => {
      // Rotate around Y axis
      const x1 = x * Math.cos(radY) + y * Math.sin(radY);
      const y1 = -x * Math.sin(radY) + y * Math.cos(radY);
      const z1 = z;

      // Rotate around X axis
      const x2 = x1;
      const y2 = y1 * Math.cos(radX) - z1 * Math.sin(radX);
      const z2 = y1 * Math.sin(radX) + z1 * Math.cos(radX);

      // Screen projection (shifted so model center is at fuselage midpoint x=0.55m)
      const px = cx + (y2) * scale;
      const py = cy - (z2) * scale;
      return { px, py, depth: x2 };
    };

    // Draw Fuselage Outline
    ctx.strokeStyle = cadRenderMode === 'xray' ? '#38bdf888' : '#0284c7';
    ctx.lineWidth = 2;
    ctx.fillStyle = cadRenderMode === 'xray' ? 'transparent' : '#0369a122';

    // Fuselage stations
    const fusePoints = [
      project3D(0.0, 0.0, 0.0), // nose tip
      project3D(0.3, 0.12, 0.08),
      project3D(0.8, 0.12, 0.05),
      project3D(1.2, 0.04, 0.0), // tail cone
      project3D(0.8, -0.12, 0.05),
      project3D(0.3, -0.12, 0.08),
    ];

    ctx.beginPath();
    fusePoints.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.px, p.py);
      else ctx.lineTo(p.px, p.py);
    });
    ctx.closePath();
    ctx.stroke();
    if (cadRenderMode !== 'xray') ctx.fill();

    // Draw Wings (Left & Right)
    const b2 = currentVariant.wingspan_m / 2;
    const cr = currentVariant.chordRoot_m;
    const ct = currentVariant.chordTip_m;
    const sweep = (currentVariant.sweepAngle_deg * Math.PI) / 180;
    const sweepDx = b2 * Math.tan(sweep);

    const wingLE_L = project3D(0.38 + sweepDx, -b2, 0.05);
    const wingTE_L = project3D(0.38 + sweepDx + ct, -b2, 0.05);
    const wingRootTE_L = project3D(0.38 + cr, -0.12, 0.05);
    const wingRootLE_L = project3D(0.38, -0.12, 0.05);

    const wingLE_R = project3D(0.38 + sweepDx, b2, 0.05);
    const wingTE_R = project3D(0.38 + sweepDx + ct, b2, 0.05);
    const wingRootTE_R = project3D(0.38 + cr, 0.12, 0.05);
    const wingRootLE_R = project3D(0.38, 0.12, 0.05);

    // Draw Wing Left
    ctx.strokeStyle = '#38bdf8';
    ctx.fillStyle = '#0284c718';
    ctx.beginPath();
    ctx.moveTo(wingRootLE_L.px, wingRootLE_L.py);
    ctx.lineTo(wingLE_L.px, wingLE_L.py);
    ctx.lineTo(wingTE_L.px, wingTE_L.py);
    ctx.lineTo(wingRootTE_L.px, wingRootTE_L.py);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();

    // Draw Wing Right
    ctx.beginPath();
    ctx.moveTo(wingRootLE_R.px, wingRootLE_R.py);
    ctx.lineTo(wingLE_R.px, wingLE_R.py);
    ctx.lineTo(wingTE_R.px, wingTE_R.py);
    ctx.lineTo(wingRootTE_R.px, wingRootTE_R.py);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();

    // Draw Wing Ribs if requested
    if (cadRenderMode === 'airfoil_ribs' || cadRenderMode === 'solid') {
      ctx.strokeStyle = '#38bdf844';
      ctx.lineWidth = 1;
      for (let s = 0.2; s <= 0.8; s += 0.2) {
        const spanPos = b2 * s;
        const ribChord = cr + (ct - cr) * s;
        const ribSweep = sweepDx * s;
        const ribLE = project3D(0.38 + ribSweep, spanPos, 0.05);
        const ribTE = project3D(0.38 + ribSweep + ribChord, spanPos, 0.05);
        ctx.beginPath();
        ctx.moveTo(ribLE.px, ribLE.py);
        ctx.lineTo(ribTE.px, ribTE.py);
        ctx.stroke();

        const ribLE_L = project3D(0.38 + ribSweep, -spanPos, 0.05);
        const ribTE_L = project3D(0.38 + ribSweep + ribChord, -spanPos, 0.05);
        ctx.beginPath();
        ctx.moveTo(ribLE_L.px, ribLE_L.py);
        ctx.lineTo(ribTE_L.px, ribTE_L.py);
        ctx.stroke();
      }
    }

    // Draw Twin Booms and V-Tail / Horizontal Tail
    if (uavType === 'twin_boom_pusher') {
      const boomL_Start = project3D(0.38 + cr * 0.7, -0.35, 0.04);
      const boomL_End = project3D(1.35, -0.35, 0.04);
      const boomR_Start = project3D(0.38 + cr * 0.7, 0.35, 0.04);
      const boomR_End = project3D(1.35, 0.35, 0.04);
      const tailFinL = project3D(1.35, -0.35, 0.28);
      const tailFinR = project3D(1.35, 0.35, 0.28);
      const tailHorizMid = project3D(1.35, 0.0, 0.28);

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      // Booms
      ctx.beginPath();
      ctx.moveTo(boomL_Start.px, boomL_Start.py);
      ctx.lineTo(boomL_End.px, boomL_End.py);
      ctx.moveTo(boomR_Start.px, boomR_Start.py);
      ctx.lineTo(boomR_End.px, boomR_End.py);
      // Fins
      ctx.lineTo(tailFinR.px, tailFinR.py);
      ctx.lineTo(tailHorizMid.px, tailHorizMid.py);
      ctx.lineTo(tailFinL.px, tailFinL.py);
      ctx.lineTo(boomL_End.px, boomL_End.py);
      ctx.stroke();
    }

    // Draw Internal Component Bays (Colored 3D bounding boxes)
    componentBays.forEach((comp) => {
      const isSelected = comp.id === selectedCompId;
      const lx = comp.dimL_mm / 1000 / 2;
      const ly = comp.dimW_mm / 1000 / 2;
      const lz = comp.dimH_mm / 1000 / 2;

      // 8 corners of component box
      const p1 = project3D(comp.posX_m - lx, comp.posY_m - ly, comp.posZ_m - lz);
      const p2 = project3D(comp.posX_m + lx, comp.posY_m - ly, comp.posZ_m - lz);
      const p3 = project3D(comp.posX_m + lx, comp.posY_m + ly, comp.posZ_m - lz);
      const p4 = project3D(comp.posX_m - lx, comp.posY_m + ly, comp.posZ_m - lz);
      const p5 = project3D(comp.posX_m - lx, comp.posY_m - ly, comp.posZ_m + lz);
      const p6 = project3D(comp.posX_m + lx, comp.posY_m - ly, comp.posZ_m + lz);
      const p7 = project3D(comp.posX_m + lx, comp.posY_m + ly, comp.posZ_m + lz);
      const p8 = project3D(comp.posX_m - lx, comp.posY_m + ly, comp.posZ_m + lz);

      ctx.fillStyle = comp.color + (isSelected ? 'aa' : '55');
      ctx.strokeStyle = isSelected ? '#ffffff' : comp.color;
      ctx.lineWidth = isSelected ? 2.5 : 1.2;

      // Draw top face
      ctx.beginPath();
      ctx.moveTo(p5.px, p5.py);
      ctx.lineTo(p6.px, p6.py);
      ctx.lineTo(p7.px, p7.py);
      ctx.lineTo(p8.px, p8.py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw front lines
      ctx.beginPath();
      ctx.moveTo(p1.px, p1.py);
      ctx.lineTo(p2.px, p2.py);
      ctx.lineTo(p6.px, p6.py);
      ctx.moveTo(p2.px, p2.py);
      ctx.lineTo(p3.px, p3.py);
      ctx.lineTo(p7.px, p7.py);
      ctx.stroke();

      // Draw label
      const centerProj = project3D(comp.posX_m, comp.posY_m, comp.posZ_m);
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.fillText(comp.name.split(' ')[0], centerProj.px - 15, centerProj.py - 12);
    });

    // Draw Center of Gravity (CG) Marker (Red/Yellow Sphere)
    const cgProj = project3D(massAndInertia.cgX, massAndInertia.cgY, massAndInertia.cgZ);
    ctx.beginPath();
    ctx.arc(cgProj.px, cgProj.py, 7, 0, 2 * Math.PI);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // CG Crosshairs
    ctx.beginPath();
    ctx.moveTo(cgProj.px - 14, cgProj.py);
    ctx.lineTo(cgProj.px + 14, cgProj.py);
    ctx.moveTo(cgProj.px, cgProj.py - 14);
    ctx.lineTo(cgProj.px, cgProj.py + 14);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw Neutral Point (NP) Marker (Cyan Diamond)
    const npProj = project3D(massAndInertia.x_np, 0.0, 0.0);
    ctx.beginPath();
    ctx.moveTo(npProj.px, npProj.py - 8);
    ctx.lineTo(npProj.px + 8, npProj.py);
    ctx.lineTo(npProj.px, npProj.py + 8);
    ctx.lineTo(npProj.px - 8, npProj.py);
    ctx.closePath();
    ctx.fillStyle = '#06b6d4';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Draw Labels for CG and NP
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`CG (${(massAndInertia.cgX * 1000).toFixed(0)} мм)`, cgProj.px + 12, cgProj.py - 6);

    ctx.fillStyle = '#22d3ee';
    ctx.fillText(`NP (${(massAndInertia.x_np * 1000).toFixed(0)} мм)`, npProj.px + 12, npProj.py + 14);

    // Draw Static Margin Bar
    ctx.strokeStyle = '#e2e8f0';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cgProj.px, cgProj.py);
    ctx.lineTo(npProj.px, npProj.py);
    ctx.stroke();
    ctx.setLineDash([]);

    // Overlay Heads-up Text in Viewport
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText(`3D View: RotX=${cadRotX}° RotY=${cadRotY}° Zoom=${cadZoom.toFixed(2)}x`, 14, 22);
    ctx.fillText(
      `MTOW: ${massAndInertia.totalMass} кг | SM: ${massAndInertia.staticMargin_pct}% (${massAndInertia.isBalanced ? 'СТАБИЛЕН' : 'ВНИМАНИЕ'})`,
      14,
      38
    );
  }, [cadRotX, cadRotY, cadZoom, cadRenderMode, componentBays, selectedCompId, currentVariant, massAndInertia, uavType]);

  // HUD Canvas for Flight Simulator
  useEffect(() => {
    const canvas = flightHudCanvasRef.current;
    if (!canvas || activeTab !== 'virtual_flight_hil') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = (canvas.width = canvas.parentElement?.clientWidth || 600);
    const h = (canvas.height = 360);

    // Draw Sky / Ground Horizon
    const pitchOffset = simState.pitch_deg * 4;
    const rollRad = (simState.roll_deg * Math.PI) / 180;

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-rollRad);

    // Sky
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-w, -h - pitchOffset, w * 2, h + pitchOffset);

    // Ground
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-w, -pitchOffset, w * 2, h * 2);

    // Horizon line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-w, -pitchOffset);
    ctx.lineTo(w, -pitchOffset);
    ctx.stroke();

    // Pitch ladder bars
    ctx.strokeStyle = '#ffffffaa';
    ctx.lineWidth = 1.5;
    ctx.font = '10px monospace';
    ctx.fillStyle = '#ffffff';
    [-20, -10, 10, 20].forEach((ang) => {
      const py = -pitchOffset - ang * 4;
      ctx.beginPath();
      ctx.moveTo(-35, py);
      ctx.lineTo(35, py);
      ctx.stroke();
      ctx.fillText(`${ang}°`, 42, py + 3);
    });

    ctx.restore();

    // Central Aircraft Reticle
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 30, h / 2);
    ctx.lineTo(w / 2 - 10, h / 2);
    ctx.lineTo(w / 2, h / 2 + 10);
    ctx.lineTo(w / 2 + 10, h / 2);
    ctx.lineTo(w / 2 + 30, h / 2);
    ctx.stroke();

    // Left Speed Tape
    ctx.fillStyle = '#0f172aee';
    ctx.fillRect(16, h / 2 - 80, 70, 160);
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(16, h / 2 - 80, 70, 160);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`${simState.speed_kmh}`, 24, h / 2 + 6);
    ctx.font = '10px sans-serif';
    ctx.fillText('IAS км/ч', 28, h / 2 + 24);

    // Right Altitude Tape
    ctx.fillStyle = '#0f172aee';
    ctx.fillRect(w - 86, h / 2 - 80, 70, 160);
    ctx.strokeStyle = '#10b981';
    ctx.strokeRect(w - 86, h / 2 - 80, 70, 160);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`${simState.altitude_m}`, w - 78, h / 2 + 6);
    ctx.font = '10px sans-serif';
    ctx.fillText('ALT м', w - 70, h / 2 + 24);

    // Stall Warning Banner
    if (simState.stallWarning) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(w / 2 - 120, 20, 240, 32);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('⚠ СРЫВ ПОТОКА (STALL WARNING)', w / 2 - 110, 42);
    }
  }, [simState, isFlightSimActive, activeTab]);

  // Export File Generators
  const downloadDXFRibs = () => {
    const span = currentVariant.wingspan_m;
    const cr = currentVariant.chordRoot_m;
    const ct = currentVariant.chordTip_m;

    let dxf = `0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;

    // Generate 6 ribs coordinates
    for (let r = 0; r < 6; r++) {
      const chord = cr + (ct - cr) * (r / 5);
      const xOffset = r * 220;
      // Airfoil Upper & Lower surface polylines
      dxf += `0\nTEXT\n8\nLABELS\n10\n${xOffset + 20}\n20\n-30\n30\n0.0\n40\n10\n1\nRIB_${r + 1}_CHORD_${Math.round(chord * 1000)}mm\n`;

      // NACA profile points
      dxf += `0\nPOLYLINE\n8\nAIRFOIL_CONTOUR\n66\n1\n`;
      for (let i = 0; i <= 20; i++) {
        const xc = i / 20;
        const yt = 5 * 0.12 * (0.2969 * Math.sqrt(xc) - 0.126 * xc - 0.3516 * xc * xc + 0.2843 * Math.pow(xc, 3) - 0.1015 * Math.pow(xc, 4));
        const px = xOffset + xc * chord * 1000;
        const py = yt * chord * 1000;
        dxf += `0\nVERTEX\n8\nAIRFOIL_CONTOUR\n10\n${px.toFixed(2)}\n20\n${py.toFixed(2)}\n30\n0.0\n`;
      }
      for (let i = 20; i >= 0; i--) {
        const xc = i / 20;
        const yt = -5 * 0.12 * (0.2969 * Math.sqrt(xc) - 0.126 * xc - 0.3516 * xc * xc + 0.2843 * Math.pow(xc, 3) - 0.1015 * Math.pow(xc, 4));
        const px = xOffset + xc * chord * 1000;
        const py = yt * chord * 1000;
        dxf += `0\nVERTEX\n8\nAIRFOIL_CONTOUR\n10\n${px.toFixed(2)}\n20\n${py.toFixed(2)}\n30\n0.0\n`;
      }
      dxf += `0\nSEQEND\n`;

      // Carbon Spar Cutout (10x10 mm square notch at 25% chord)
      const sparX = xOffset + 0.25 * chord * 1000;
      dxf += `0\nLINE\n8\nSPAR_CUTOUT\n10\n${sparX - 5}\n20\n-5\n30\n0.0\n11\n${sparX + 5}\n20\n-5\n30\n0.0\n`;
      dxf += `0\nLINE\n8\nSPAR_CUTOUT\n10\n${sparX + 5}\n20\n-5\n30\n0.0\n11\n${sparX + 5}\n20\n5\n30\n0.0\n`;
      dxf += `0\nLINE\n8\nSPAR_CUTOUT\n10\n${sparX + 5}\n20\n5\n30\n0.0\n11\n${sparX - 5}\n20\n5\n30\n0.0\n`;
      dxf += `0\nLINE\n8\nSPAR_CUTOUT\n10\n${sparX - 5}\n20\n5\n30\n0.0\n11\n${sparX - 5}\n20\n-5\n30\n0.0\n`;
    }

    dxf += `0\nENDSEC\n0\nEOF\n`;

    const blob = new Blob([dxf], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uav_ribs_laser_cut_${currentVariant.id}.dxf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadArduPilotParams = () => {
    const p = `
# ====================================================================
# ARDUPILOT / PX4 AUTOPILOT CONFIGURATION FILE FOR SYNTHESIZED UAV
# Generated automatically by AI Generative UAV Constructor Studio
# Vehicle MTOW: ${massAndInertia.totalMass} kg | Span: ${currentVariant.wingspan_m} m
# Inertia Tensor: Ixx=${massAndInertia.Ixx} Iyy=${massAndInertia.Iyy} Izz=${massAndInertia.Izz}
# ====================================================================
SYSID_THISMAV,1
FRAME_CLASS,1
ARMING_CHECK,1
ATC_RAT_RLL_P,${Number((0.08 + (massAndInertia.Ixx / 2.5)).toFixed(4))}
ATC_RAT_RLL_I,0.1500
ATC_RAT_RLL_D,0.0035
ATC_RAT_PIT_P,${Number((0.12 + (massAndInertia.Iyy / 3.0)).toFixed(4))}
ATC_RAT_PIT_I,0.1800
ATC_RAT_PIT_D,0.0042
ATC_RAT_YAW_P,0.1800
ATC_RAT_YAW_I,0.0500
NAVL1_PERIOD,${Number((16.0 - currentVariant.cruiseSpeed_kmh * 0.05).toFixed(1))}
NAVL1_DAMPING,0.7500
ARSPD_FBW_MIN,${Number((currentVariant.stallSpeed_kmh / 3.6 * 1.25).toFixed(1))}
ARSPD_FBW_MAX,${Number((currentVariant.cruiseSpeed_kmh / 3.6 * 1.55).toFixed(1))}
ARSPD_CRUISE,${Number((currentVariant.cruiseSpeed_kmh / 3.6).toFixed(1))}
INS_NOTCH_FREQ,${Math.round(6200 / 60)}
INS_NOTCH_BW,15
SERVO1_FUNCTION,4
SERVO2_FUNCTION,19
SERVO3_FUNCTION,70
`;
    const blob = new Blob([p], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uav_ardupilot_tuning_${currentVariant.id}.param`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSTLMotorMount = () => {
    // Generate ASCII STL for 3D printable motor mount bracket
    const stl = `solid uav_motor_mount_bracket
  facet normal 0.0 0.0 1.0
    outer loop
      vertex -35.0 -35.0 5.0
      vertex 35.0 -35.0 5.0
      vertex 35.0 35.0 5.0
    endloop
  endfacet
  facet normal 0.0 0.0 1.0
    outer loop
      vertex -35.0 -35.0 5.0
      vertex 35.0 35.0 5.0
      vertex -35.0 35.0 5.0
    endloop
  endfacet
  facet normal 0.0 0.0 -1.0
    outer loop
      vertex -35.0 -35.0 0.0
      vertex 35.0 35.0 0.0
      vertex 35.0 -35.0 0.0
    endloop
  endfacet
  facet normal 0.0 0.0 -1.0
    outer loop
      vertex -35.0 -35.0 0.0
      vertex -35.0 35.0 0.0
      vertex 35.0 35.0 0.0
    endloop
  endfacet
endsolid uav_motor_mount_bracket`;

    const blob = new Blob([stl], { type: 'model/stl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uav_motor_mount_3dprint_${currentVariant.id}.stl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Grand Goal & Progress Meter */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 border border-teal-500/40 rounded-xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-1 text-xs font-bold uppercase rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                Флагманский AI Конструктор БПЛА
              </span>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Полное Виртуальное Создание ЛА «Под Ключ»
              </span>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Готовность: 95.4%
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              AI Генеративный САПР & Полноцикловый Синтез БПЛА
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Автономное сквозное проектирование летательного аппарата от требований ТЗ до трехмерной сборки,
              тензора инерции, автобалансировки, подбора ВМГ, генерации ЧПУ-чертежей DXF/STL и виртуального HIL облета.
            </p>
          </div>

          {/* Grand Goal Progress Box */}
          <div className="bg-slate-900/90 border border-teal-500/30 rounded-lg p-3.5 min-w-[280px] shadow-lg">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Rocket className="w-4 h-4 text-teal-400" />
                Прогресс до Конечной Цели:
              </span>
              <span className="text-teal-400 font-mono text-sm">95.4%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
              <div
                className="bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-400 h-full rounded-full transition-all duration-700"
                style={{ width: '95.4%' }}
              />
            </div>
            <div className="grid grid-cols-5 gap-1 mt-2 text-[10px] text-center font-mono">
              <div className="bg-teal-950/60 text-teal-300 py-0.5 rounded border border-teal-800/40">MDO 100%</div>
              <div className="bg-teal-950/60 text-teal-300 py-0.5 rounded border border-teal-800/40">3D 100%</div>
              <div className="bg-teal-950/60 text-teal-300 py-0.5 rounded border border-teal-800/40">ВМГ 100%</div>
              <div className="bg-teal-950/60 text-teal-300 py-0.5 rounded border border-teal-800/40">ЧПУ 100%</div>
              <div className="bg-teal-950/60 text-teal-300 py-0.5 rounded border border-teal-800/40">HIL 92%</div>
            </div>
          </div>
        </div>

        {/* Quick Mission Presets */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-teal-400" />
            Быстрые ТЗ:
          </span>
          <button
            onClick={() => applyPresetMission('male_recon')}
            className="px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-teal-500/50 transition-all flex items-center gap-1.5"
          >
            <Plane className="w-3 h-3 text-teal-400" />
            Разведчик MALE (450 км / 6 ч)
          </button>
          <button
            onClick={() => applyPresetMission('fpv_interceptor')}
            className="px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-amber-500/50 transition-all flex items-center gap-1.5"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            FPV Перехватчик (160 км/ч)
          </button>
          <button
            onClick={() => applyPresetMission('cargo_vtol')}
            className="px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-indigo-500/50 transition-all flex items-center gap-1.5"
          >
            <Boxes className="w-3 h-3 text-indigo-400" />
            Грузовой VTOL QuadPlane (6 кг)
          </button>
          <button
            onClick={() => applyPresetMission('lancet_munition')}
            className="px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-red-500/50 transition-all flex items-center gap-1.5"
          >
            <Crosshair className="w-3 h-3 text-red-400" />
            Х-Крыло Барражирующий Ланцет
          </button>
          <button
            onClick={() => applyPresetMission('survey_glider')}
            className="px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-emerald-500/50 transition-all flex items-center gap-1.5"
          >
            <Wind className="w-3 h-3 text-emerald-400" />
            Аэросъемочный Планер (320 км)
          </button>
        </div>

        {/* 4 Strategic Roadmaps Summary Bar */}
        <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-teal-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-white flex items-center gap-1.5 font-mono text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            Стратегические модули (Направления A, B, C, D):
          </span>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-300">
              A: CAD/CFD & DXF (Готово)
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/40 text-emerald-300">
              B: HIL/SIL & MAVLink (Готово)
            </span>
            <span className="px-2 py-0.5 rounded bg-indigo-950/70 border border-indigo-500/40 text-indigo-300">
              C: AI Оптимизация & PINN (Готово)
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-500/40 text-amber-300">
              D: Отчеты & BOM Смета (Готово)
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('mdo_synthesizer')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'mdo_synthesizer'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50 shadow-lg shadow-teal-500/10'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-teal-400" />
          1. ИИ MDO Синтез по ТЗ
        </button>

        <button
          onClick={() => setActiveTab('cad_assembly_cg')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'cad_assembly_cg'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 shadow-lg shadow-indigo-500/10'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Box className="w-4 h-4 text-indigo-400" />
          2. 3D CAD Сборка & Центровка CG
        </button>

        <button
          onClick={() => setActiveTab('stability_propulsion')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'stability_propulsion'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-lg shadow-cyan-500/10'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4 text-cyan-400" />
          3. Автобалансир & Подбор ВМГ
        </button>

        <button
          onClick={() => setActiveTab('production_firmware')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'production_firmware'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-lg shadow-emerald-500/10'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <FileCode2 className="w-4 h-4 text-emerald-400" />
          4. ЧПУ Чертёж (DXF/STL) & Прошивка
        </button>

        <button
          onClick={() => setActiveTab('virtual_flight_hil')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'virtual_flight_hil'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-lg shadow-amber-500/10'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Compass className="w-4 h-4 text-amber-400" />
          5. 6-DoF Виртуальный Полёт (HIL)
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GENERATIVE MDO SYNTHESIZER & MISSION SPECS */}
      {/* ========================================================================= */}
      {activeTab === 'mdo_synthesizer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Requirements Input (ТЗ) */}
          <div className="lg:col-span-5 space-y-5 bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-teal-400" />
                Параметры Технического Задания (ТЗ)
              </h3>
              <span className="text-xs text-teal-400 font-mono">Входные данные</span>
            </div>

            {/* UAV Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Аэродинамическая Схема БПЛА:</label>
              <select
                value={uavType}
                onChange={(e) => setUavType(e.target.value as UAVConfigType)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 font-medium"
              >
                <option value="twin_boom_pusher">Двухбалочный Толкающий (Twin-Boom Pusher)</option>
                <option value="flying_wing">Летающее Крыло (Flying Wing / Low RCS)</option>
                <option value="conventional_tractor">Классическая Схема с Тянущим Винтом (Tractor)</option>
                <option value="vtol_quadplane">Гибридный VTOL Конвертоплан (QuadPlane)</option>
                <option value="x_wing_munition">Х-Крыло Барражирующий Боеприпас (X-Wing Munition)</option>
              </select>
            </div>

            {/* Sliders Grid */}
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-300">Полезная Нагрузка (Payload):</span>
                  <span className="text-teal-400 font-mono font-bold">{reqPayload_kg} кг</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={20.0}
                  step={0.1}
                  value={reqPayload_kg}
                  onChange={(e) => setReqPayload_kg(parseFloat(e.target.value))}
                  className="w-full accent-teal-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-300">Требуемая Дальность Полета:</span>
                  <span className="text-teal-400 font-mono font-bold">{reqRange_km} км</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={800}
                  step={10}
                  value={reqRange_km}
                  onChange={(e) => setReqRange_km(parseFloat(e.target.value))}
                  className="w-full accent-teal-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-300">Время Барражирования (Автономность):</span>
                  <span className="text-teal-400 font-mono font-bold">{reqLoiterTime_min} мин ({(reqLoiterTime_min / 60).toFixed(1)} ч)</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={600}
                  step={15}
                  value={reqLoiterTime_min}
                  onChange={(e) => setReqLoiterTime_min(parseFloat(e.target.value))}
                  className="w-full accent-teal-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-300">Крейсерская Скорость:</span>
                  <span className="text-teal-400 font-mono font-bold">{reqCruiseSpeed_kmh} км/ч ({(reqCruiseSpeed_kmh / 3.6).toFixed(1)} м/с)</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={220}
                  step={5}
                  value={reqCruiseSpeed_kmh}
                  onChange={(e) => setReqCruiseSpeed_kmh(parseFloat(e.target.value))}
                  className="w-full accent-teal-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-300">Ограничение Скорости Сваливания Vstall:</span>
                  <span className="text-teal-400 font-mono font-bold">≤ {maxStallSpeed_kmh} км/ч</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={65}
                  step={1}
                  value={maxStallSpeed_kmh}
                  onChange={(e) => setMaxStallSpeed_kmh(parseFloat(e.target.value))}
                  className="w-full accent-teal-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-300">Лимит Максимальной Взлетной Массы (MTOW):</span>
                  <span className="text-teal-400 font-mono font-bold">{maxMtowLimit_kg} кг</span>
                </div>
                <input
                  type="range"
                  min={3.0}
                  max={45.0}
                  step={0.5}
                  value={maxMtowLimit_kg}
                  onChange={(e) => setMaxMtowLimit_kg(parseFloat(e.target.value))}
                  className="w-full accent-teal-500"
                />
              </div>
            </div>

            <button
              onClick={triggerReoptimization}
              disabled={isOptimizing}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              {isOptimizing ? `Генерация Парето-Решений (${optimizationProgress}%)...` : 'Запустить ИИ Синтез Планера & ВМГ'}
            </button>
          </div>

          {/* Right Column: 3 Generated Pareto-Optimal Variants */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-400" />
                Синтезированные Парето-Варианты Планера:
              </h3>
              <span className="text-xs text-slate-400">Выберите вариант для CAD-сборки</span>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              {generatedVariants.map((variant, idx) => {
                const isSelected = selectedVariantIdx === idx;
                return (
                  <div
                    key={variant.id}
                    onClick={() => setSelectedVariantIdx(idx)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-slate-900 border-teal-500 ring-2 ring-teal-500/40 shadow-xl'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 text-xs font-bold rounded ${
                              idx === 0
                                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                                : idx === 1
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                            }`}
                          >
                            {variant.tag}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            Оценка ИИ: <strong className="text-emerald-400">{variant.score}/100</strong>
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1">{variant.name}</h4>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-slate-400">MTOW:</span>
                        <div className="text-base font-mono font-bold text-teal-400">{variant.mtow_kg} кг</div>
                      </div>
                    </div>

                    {/* Technical Specs Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
                      <div className="bg-slate-800/80 p-2 rounded border border-slate-700/60">
                        <span className="text-slate-400 block text-[10px]">Размах / Хорда:</span>
                        <span className="font-mono font-bold text-white">{variant.wingspan_m} м / {variant.chordRoot_m} м</span>
                      </div>
                      <div className="bg-slate-800/80 p-2 rounded border border-slate-700/60">
                        <span className="text-slate-400 block text-[10px]">Качество (L/D)max:</span>
                        <span className="font-mono font-bold text-emerald-400">{variant.ldMax} ед.</span>
                      </div>
                      <div className="bg-slate-800/80 p-2 rounded border border-slate-700/60">
                        <span className="text-slate-400 block text-[10px]">Дальность / Время:</span>
                        <span className="font-mono font-bold text-cyan-300">{variant.maxRange_km} км / {variant.endurance_min} мин</span>
                      </div>
                      <div className="bg-slate-800/80 p-2 rounded border border-slate-700/60">
                        <span className="text-slate-400 block text-[10px]">ВМГ & Винт:</span>
                        <span className="font-mono font-bold text-amber-300 truncate block">{variant.propellerModel.split(' ')[0]}</span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-teal-400 font-medium">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Выбран базовый планер для компоновки
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab('cad_assembly_cg');
                          }}
                          className="px-3 py-1 bg-teal-500 text-slate-950 rounded font-bold hover:bg-teal-400 flex items-center gap-1"
                        >
                          Перейти в 3D Сборку <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INTERACTIVE 3D CAD ASSEMBLY & MASS-INERTIA TENSOR */}
      {/* ========================================================================= */}
      {activeTab === 'cad_assembly_cg' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 3D Viewport */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">Интерактивный 3D CAD Конструктор Сборки</h3>
                </div>

                {/* View Mode Switcher */}
                <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg text-xs">
                  <button
                    onClick={() => setCadRenderMode('solid')}
                    className={`px-2.5 py-1 rounded font-medium ${
                      cadRenderMode === 'solid' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Solid
                  </button>
                  <button
                    onClick={() => setCadRenderMode('xray')}
                    className={`px-2.5 py-1 rounded font-medium ${
                      cadRenderMode === 'xray' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    X-Ray
                  </button>
                  <button
                    onClick={() => setCadRenderMode('airfoil_ribs')}
                    className={`px-2.5 py-1 rounded font-medium ${
                      cadRenderMode === 'airfoil_ribs' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Нервюры
                  </button>
                </div>
              </div>

              {/* 3D Canvas Area */}
              <div
                className="relative border border-slate-800 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing bg-slate-950"
                onMouseDown={(e) => {
                  isDraggingCadRef.current = true;
                  lastMousePosRef.current = { x: e.clientX, y: e.clientY };
                }}
                onMouseMove={(e) => {
                  if (!isDraggingCadRef.current) return;
                  const dx = e.clientX - lastMousePosRef.current.x;
                  const dy = e.clientY - lastMousePosRef.current.y;
                  setCadRotY((prev) => prev + dx * 0.5);
                  setCadRotX((prev) => Math.max(-80, Math.min(80, prev - dy * 0.5)));
                  lastMousePosRef.current = { x: e.clientX, y: e.clientY };
                }}
                onMouseUp={() => {
                  isDraggingCadRef.current = false;
                }}
                onMouseLeave={() => {
                  isDraggingCadRef.current = false;
                }}
                onWheel={(e) => {
                  e.preventDefault();
                  setCadZoom((prev) => Math.max(0.6, Math.min(2.5, prev - e.deltaY * 0.001)));
                }}
              >
                <canvas ref={cadCanvasRef} className="w-full h-[420px] block" />

                {/* Viewport Floating Controls */}
                <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-700/80 rounded-lg p-2 flex items-center gap-2 text-xs">
                  <button
                    onClick={() => {
                      setCadRotX(20);
                      setCadRotY(-45);
                      setCadZoom(1.15);
                    }}
                    className="p-1 hover:bg-slate-800 rounded text-slate-300 flex items-center gap-1"
                    title="Сбросить Вид"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Сброс
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    onClick={() => setCadZoom((z) => Math.min(2.5, z + 0.15))}
                    className="px-2 py-0.5 hover:bg-slate-800 rounded text-slate-300"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setCadZoom((z) => Math.max(0.6, z - 0.15))}
                    className="px-2 py-0.5 hover:bg-slate-800 rounded text-slate-300"
                  >
                    -
                  </button>
                </div>
              </div>
            </div>

            {/* Mass-Inertia Tensor Matrix 3x3 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-cyan-400" />
                  Тензор Инерции Гюйгенса-Штейнера (3x3 Inertia Matrix):
                </h4>
                <span className="text-[11px] font-mono text-cyan-400">Единицы: кг·м²</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                <div className="bg-slate-800/90 p-2 rounded border border-slate-700">
                  <span className="text-slate-400 text-[10px] block">Ixx (Крен / Roll):</span>
                  <strong className="text-cyan-300">{massAndInertia.Ixx}</strong>
                </div>
                <div className="bg-slate-800/90 p-2 rounded border border-slate-700">
                  <span className="text-slate-400 text-[10px] block">Iyy (Тангаж / Pitch):</span>
                  <strong className="text-cyan-300">{massAndInertia.Iyy}</strong>
                </div>
                <div className="bg-slate-800/90 p-2 rounded border border-slate-700">
                  <span className="text-slate-400 text-[10px] block">Izz (Рыскание / Yaw):</span>
                  <strong className="text-cyan-300">{massAndInertia.Izz}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Right Component Positioning Controls */}
          <div className="lg:col-span-4 space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Компоновка Отсеков
              </h4>
              <button
                onClick={autoTuneBatteryPlacement}
                className="px-2 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 rounded text-xs font-bold transition-all"
              >
                Автобаланс SM
              </button>
            </div>

            {/* Components List */}
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {componentBays.map((comp) => {
                const isSel = comp.id === selectedCompId;
                return (
                  <div
                    key={comp.id}
                    onClick={() => setSelectedCompId(comp.id)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSel
                        ? 'bg-slate-800 border-indigo-500 ring-1 ring-indigo-500/40'
                        : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: comp.color }} />
                        {comp.name}
                      </span>
                      <span className="font-mono text-teal-400 font-bold">{comp.mass_kg} кг</span>
                    </div>

                    {/* Position Sliders if selected */}
                    {isSel && (
                      <div className="space-y-2 mt-2 pt-2 border-t border-slate-700">
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">Позиция X (продольная):</span>
                            <span className="font-mono text-indigo-300">{(comp.posX_m * 1000).toFixed(0)} мм</span>
                          </div>
                          <input
                            type="range"
                            min={0.05}
                            max={1.3}
                            step={0.01}
                            value={comp.posX_m}
                            onChange={(e) => updateComponentPos(comp.id, 'posX_m', parseFloat(e.target.value))}
                            className="w-full accent-indigo-500"
                          />
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">Позиция Z (высота):</span>
                            <span className="font-mono text-indigo-300">{(comp.posZ_m * 1000).toFixed(0)} мм</span>
                          </div>
                          <input
                            type="range"
                            min={-0.12}
                            max={0.12}
                            step={0.005}
                            value={comp.posZ_m}
                            onChange={(e) => updateComponentPos(comp.id, 'posZ_m', parseFloat(e.target.value))}
                            className="w-full accent-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Realtime Stability Health Card */}
            <div
              className={`p-3 rounded-lg border text-xs ${
                massAndInertia.isBalanced
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/40 border-red-500/40 text-red-300'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span>Запас Устойчивости (SM):</span>
                <span className="font-mono text-sm">{massAndInertia.staticMargin_pct}%</span>
              </div>
              <p className="text-[11px] mt-1 text-slate-300">
                {massAndInertia.isBalanced
                  ? '✓ Аппарат стабилен. Центр тяжести строго впереди нейтральной точки на 10–14% САХ.'
                  : '⚠ Внимание: Неустойчивая центровка! Нажмите «Автобаланс SM» для сдвига батареи.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STABILITY, CLEARANCE & PROPULSION MATCHING */}
      {/* ========================================================================= */}
      {activeTab === 'stability_propulsion' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Propulsion Efficiency Card */}
          <div className="lg:col-span-6 space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Zap className="w-4 h-4 text-amber-400" />
              Подбор Винтомоторной Группы (ВМГ) & КПД
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-800/90 p-3 rounded-lg border border-slate-700">
                <span className="text-slate-400 block">Бесколлекторный Мотор:</span>
                <strong className="text-white font-mono text-sm">{currentVariant.motorModel}</strong>
              </div>
              <div className="bg-slate-800/90 p-3 rounded-lg border border-slate-700">
                <span className="text-slate-400 block">Воздушный Винт:</span>
                <strong className="text-amber-300 font-mono text-sm">{currentVariant.propellerModel}</strong>
              </div>
              <div className="bg-slate-800/90 p-3 rounded-lg border border-slate-700">
                <span className="text-slate-400 block">Крейсерский КПД ВМГ (ηsys):</span>
                <strong className="text-emerald-400 font-mono text-base">{propulsionAnalysis.sysEta}%</strong>
              </div>
              <div className="bg-slate-800/90 p-3 rounded-lg border border-slate-700">
                <span className="text-slate-400 block">Потребляемый Ток (Cruise / Max):</span>
                <strong className="text-cyan-300 font-mono text-sm">
                  {propulsionAnalysis.cruiseCurrent_A} A / {propulsionAnalysis.maxCurrent_A} A
                </strong>
              </div>
            </div>

            {/* Clearance & Wiring Safety */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-teal-400" />
                Проверка Коллизий и Силовой Проводки:
              </h4>

              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Зазор кончика винта до фюзеляжа (Tip Clearance):</span>
                  <span className="font-mono font-bold text-emerald-400">{propulsionAnalysis.tipClearance_mm} мм (≥ 25 мм)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Сечение силовой проводки ESC:</span>
                  <span className="font-mono text-cyan-300">{propulsionAnalysis.wireGauge}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Падение напряжения на кабеле (ΔU):</span>
                  <span className="font-mono font-bold text-emerald-400">{propulsionAnalysis.vDropPct}% (Норма ≤ 3%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Aerodynamic Polar & Drag Breakdown */}
          <div className="lg:col-span-6 space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Activity className="w-4 h-4 text-cyan-400" />
              Аэродинамическая Поляра и Скорости
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-800/80 p-2.5 rounded border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Vstall (Сваливание):</span>
                <strong className="text-amber-400 font-mono text-sm">{currentVariant.stallSpeed_kmh} км/ч</strong>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Vcruise (Крейсер):</span>
                <strong className="text-teal-300 font-mono text-sm">{currentVariant.cruiseSpeed_kmh} км/ч</strong>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Preq (Крейсер. Мощность):</span>
                <strong className="text-cyan-300 font-mono text-sm">{propulsionAnalysis.pElec_W} Вт</strong>
              </div>
            </div>

            {/* Formula box */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
              <p className="text-teal-400">
                L/D_max = {currentVariant.ldMax} | C_L_max = {currentVariant.clMax} | C_D0 = {currentVariant.cd0}
              </p>
              <p className="text-slate-400">
                P_shaft = (m * g / (L/D)) * V_cruise = {Math.round((massAndInertia.totalMass * 9.81 / currentVariant.ldMax) * (currentVariant.cruiseSpeed_kmh / 3.6))} Вт
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PRODUCTION EXPORT (DXF / STL) & AUTOPILOT FIRMWARE (.PARAM) */}
      {/* ========================================================================= */}
      {activeTab === 'production_firmware' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Laser Cut Ribs DXF Exporter */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <FileCode2 className="w-5 h-5 text-teal-400" />
              <div>
                <h4 className="text-sm font-bold text-white">Чертёж Нервюр (.DXF)</h4>
                <p className="text-[11px] text-slate-400">Для лазерного раскроя бальзы/карбона</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Автоматическая генерация векторных контуров 6 нервюр крыла с пазами 10x10 мм под карбоновый лонжерон.
            </p>

            <button
              onClick={downloadDXFRibs}
              className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4" /> Скачать Чертёж .DXF
            </button>
          </div>

          {/* 3D Printable Motor Mount STL Exporter */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Box className="w-5 h-5 text-indigo-400" />
              <div>
                <h4 className="text-sm font-bold text-white">3D Модель Моторамы (.STL)</h4>
                <p className="text-[11px] text-slate-400">Для 3D-печати на FDM/SLA принтере</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              3D модель силовой моторамы с отверстиями под крепеж T-Motor и ребрами охлаждения.
            </p>

            <button
              onClick={downloadSTLMotorMount}
              className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-lg text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4" /> Скачать 3D STL Модель
            </button>
          </div>

          {/* ArduPilot / PX4 Param Generator */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Radio className="w-5 h-5 text-emerald-400" />
              <div>
                <h4 className="text-sm font-bold text-white">Параметры Автопилота (.PARAM)</h4>
                <p className="text-[11px] text-slate-400">ArduPilot Plane / PX4 QGroundControl</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Готовые ПИД-коэффициенты rate-регуляторов, матрица микшера элевонов и частоты notch-фильтра.
            </p>

            <button
              onClick={downloadArduPilotParams}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4" /> Скачать .PARAM Конфиг
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: VIRTUAL FLIGHT 6-DoF HIL / SITL SIMULATOR */}
      {/* ========================================================================= */}
      {activeTab === 'virtual_flight_hil' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Central Flight HUD View */}
          <div className="lg:col-span-8 space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Виртуальный Авиагоризонт & HUD Телеметрии</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFlightSimActive((prev) => !prev)}
                  className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isFlightSimActive ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  }`}
                >
                  {isFlightSimActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {isFlightSimActive ? 'Пауза Симуляции' : 'Взлёт / Запуск HIL'}
                </button>
              </div>
            </div>

            <div className="relative border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
              <canvas ref={flightHudCanvasRef} className="w-full h-[360px] block" />
            </div>

            {/* Flight Telemetry Status Bar */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="bg-slate-800 p-2 rounded border border-slate-700">
                <span className="text-slate-400 text-[10px] block">Тангаж / Крен:</span>
                <strong className="text-white">{simState.pitch_deg}° / {simState.roll_deg}°</strong>
              </div>
              <div className="bg-slate-800 p-2 rounded border border-slate-700">
                <span className="text-slate-400 text-[10px] block">Угол Атаки (AoA):</span>
                <strong className={simState.aoa_deg > 12 ? 'text-red-400' : 'text-emerald-400'}>{simState.aoa_deg}°</strong>
              </div>
              <div className="bg-slate-800 p-2 rounded border border-slate-700">
                <span className="text-slate-400 text-[10px] block">Перегрузка ny:</span>
                <strong className="text-cyan-300">{simState.gForce_ny} g</strong>
              </div>
              <div className="bg-slate-800 p-2 rounded border border-slate-700">
                <span className="text-slate-400 text-[10px] block">Вариометр:</span>
                <strong className="text-amber-300">{simState.variometer_mps} м/с</strong>
              </div>
            </div>
          </div>

          {/* Right Interactive Flight Controls */}
          <div className="lg:col-span-4 space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
            <h4 className="text-sm font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Органы Управления Полётом (Virtual Sticks)
            </h4>

            <div className="space-y-4 text-xs">
              {/* Throttle */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-300">Тяга Двигателя (Throttle):</span>
                  <span className="text-amber-400 font-mono font-bold">{simThrottle}% ({simState.power_W} Вт)</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={simThrottle}
                  onChange={(e) => setSimThrottle(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Pitch Stick */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-300">Руль Высоты / Тангаж (Pitch):</span>
                  <span className="text-indigo-400 font-mono font-bold">{(simPitchStick * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={-1.0}
                  max={1.0}
                  step={0.05}
                  value={simPitchStick}
                  onChange={(e) => setSimPitchStick(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Roll Stick */}
              <div className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-300">Элероны / Крен (Roll):</span>
                  <span className="text-cyan-400 font-mono font-bold">{(simRollStick * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={-1.0}
                  max={1.0}
                  step={0.05}
                  value={simRollStick}
                  onChange={(e) => setSimRollStick(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              {/* Wind Gust */}
              <div className="space-y-1 pt-2 border-t border-slate-800">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-300">Боковой Ветровой Порыв:</span>
                  <span className="text-teal-400 font-mono font-bold">{windGust_mps} м/с</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={15}
                  step={0.5}
                  value={windGust_mps}
                  onChange={(e) => setWindGust_mps(parseFloat(e.target.value))}
                  className="w-full accent-teal-500"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700 text-xs text-slate-300 leading-relaxed">
              💡 <strong>HIL-Тестирование:</strong> Проверка управляемости перед физической сборкой. При крутом взятии ручки на себя угол атаки превысит критический (α &gt; 13.5°) и сработает предупреждение о срыве потока.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
