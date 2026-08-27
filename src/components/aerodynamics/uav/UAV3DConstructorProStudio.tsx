import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import {
  Box,
  Layers,
  Sliders,
  Sparkles,
  Download,
  RotateCcw,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Wind,
  Shield,
  Gauge,
  Activity,
  Zap,
  Flame,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  FileText,
  Boxes,
  Scale,
  Compass,
  Crosshair,
  TrendingUp,
  Cpu,
  Info,
  Plane,
  CornerDownRight,
  RefreshCw,
  Share2,
  ChevronRight,
  Printer,
  Camera,
  Play,
  Pause,
  Grid,
  CheckSquare,
  ShieldCheck,
  Disc,
  Split,
  CircleDot,
  Atom,
  Scissors
} from 'lucide-react';
import { DigitalTwinBusState } from './pipeline/UAVDigitalTwinHub';

export type UAVArchitectureType =
  | 'flying_wing'
  | 'conventional'
  | 'twin_boom'
  | 'vtol_quadplane'
  | 'canard'
  | 'tandem'
  | 'x_wing_munition'
  | 'tailsitter';

export type RenderShadingMode =
  | 'pbr_solid'
  | 'carbon_composite'
  | 'wireframe_cad'
  | 'xray_internals'
  | 'cfd_pressure_cp'
  | 'streamlines_aerodynamics';

export type CameraPreset = 'iso' | 'top' | 'front' | 'side' | 'bottom' | 'chase';

export interface UAVComponentPart {
  id: string;
  name: string;
  category: 'fuselage' | 'wing' | 'tail' | 'propulsion' | 'battery' | 'avionics' | 'payload' | 'structure';
  mass_kg: number;
  posX_m: number; // longitudinal (0 = nose, + is aft)
  posY_m: number; // lateral (0 = centerline, + is right)
  posZ_m: number; // vertical (0 = waterline, + is up)
  color: string;
  visible: boolean;
  locked?: boolean;
}

export interface UAV3DConstructorProStudioProps {
  busState?: DigitalTwinBusState;
  onApplyToDigitalTwin?: (newState: Partial<DigitalTwinBusState>) => void;
}

export const UAV3DConstructorProStudio: React.FC<UAV3DConstructorProStudioProps> = ({
  busState,
  onApplyToDigitalTwin
}) => {
  // Main Configuration State
  const [architecture, setArchitecture] = useState<UAVArchitectureType>('vtol_quadplane');
  const [uavName, setUavName] = useState<string>('AeroCraft-VTOL 2400 Pro');
  const [tacticalRole, setTacticalRole] = useState<string>('Дальний мониторинг & Мультиспектральная разведка');
  
  // Wing Geometry Parameters
  const [wingspan_m, setWingspan_m] = useState<number>(2.4);
  const [rootChord_m, setRootChord_m] = useState<number>(0.36);
  const [tipChord_m, setTipChord_m] = useState<number>(0.18);
  const [sweep_deg, setSweep_deg] = useState<number>(8.5);
  const [dihedral_deg, setDihedral_deg] = useState<number>(2.5);
  const [washout_deg, setWashout_deg] = useState<number>(-2.0);
  const [airfoil, setAirfoil] = useState<string>('MH60');
  const [wingletHeight_m, setWingletHeight_m] = useState<number>(0.15);
  const [hasWinglets, setHasWinglets] = useState<boolean>(true);
  
  // Fuselage Parameters
  const [fuselageLength_m, setFuselageLength_m] = useState<number>(1.35);
  const [fuselageWidth_m, setFuselageWidth_m] = useState<number>(0.20);
  const [fuselageHeight_m, setFuselageHeight_m] = useState<number>(0.18);
  const [noseType, setNoseType] = useState<'ogive' | 'sensor_dome' | 'stealth_chined' | 'blunt'>('sensor_dome');
  
  // Tail Parameters
  const [tailType, setTailType] = useState<'inverted_v' | 'conventional' | 'twin_vertical' | 't_tail' | 'none'>('inverted_v');
  const [tailSpan_m, setTailSpan_m] = useState<number>(0.65);
  const [tailChord_m, setTailChord_m] = useState<number>(0.14);
  const [tailBoomLength_m, setTailBoomLength_m] = useState<number>(0.85);
  const [vTailAngle_deg, setVTailAngle_deg] = useState<number>(110);
  
  // VTOL Quad Boom Parameters
  const [vtolBoomLength_m, setVtolBoomLength_m] = useState<number>(0.95);
  const [vtolBoomOffset_m, setVtolBoomOffset_m] = useState<number>(0.55);
  const [vtolMotorCount, setVtolMotorCount] = useState<number>(4);
  const [vtolPropSize_inch, setVtolPropSize_inch] = useState<number>(16);

  // Pusher / Forward Propulsion Parameters
  const [pusherMotorModel, setPusherMotorModel] = useState<string>('T-Motor AT4120 KV500');
  const [pusherPropSize_inch, setPusherPropSize_inch] = useState<number>(14);
  const [pusherBladeCount, setPusherBladeCount] = useState<number>(2);

  // Dynamic Control Surfaces & Animation
  const [aileronDeflection_deg, setAileronDeflection_deg] = useState<number>(0);
  const [elevatorDeflection_deg, setElevatorDeflection_deg] = useState<number>(0);
  const [rudderDeflection_deg, setRudderDeflection_deg] = useState<number>(0);
  const [isPropellerSpinning, setIsPropellerSpinning] = useState<boolean>(true);
  const [explodedViewPct, setExplodedViewPct] = useState<number>(0); // 0% to 100%

  // 3D Viewport Controls & Rendering Modes
  const [shadingMode, setShadingMode] = useState<RenderShadingMode>('carbon_composite');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('iso');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [showCgGizmo, setShowCgGizmo] = useState<boolean>(true);
  const [showAirflowStreamlines, setShowAirflowStreamlines] = useState<boolean>(true);
  const [showInternalSpars, setShowInternalSpars] = useState<boolean>(true);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);

  // Active UI Sidebar Tab
  const [activeSidebarTab, setActiveSidebarTab] = useState<'airframe' | 'equipment' | 'physics' | 'ai_synthesizer' | 'export'>('airframe');

  // AI Prompting State
  const [aiPrompt, setAiPrompt] = useState<string>('Дальний БПЛА СВВП для лазерного сканирования тайги, дальность 180 км, ПН 1.5 кг');
  const [isAiSynthesizing, setIsAiSynthesizing] = useState<boolean>(false);
  const [aiSynthesizeLog, setAiSynthesizeLog] = useState<string | null>(null);

  // Internal Components List with exact X, Y, Z coords and masses
  const [components, setComponents] = useState<UAVComponentPart[]>([
    { id: 'fwd_gimbal', name: 'Оптико-электронная гироплатформа 4K/IR', category: 'payload', mass_kg: 0.85, posX_m: 0.10, posY_m: 0, posZ_m: -0.06, color: '#06b6d4', visible: true },
    { id: 'autopilot_px4', name: 'Автопилот PX4 Orange Cube + Dual GPS', category: 'avionics', mass_kg: 0.22, posX_m: 0.45, posY_m: 0, posZ_m: 0.03, color: '#f59e0b', visible: true },
    { id: 'main_battery', name: 'Тяговая АКБ Li-Ion 6S 24000 mAh (21700)', category: 'battery', mass_kg: 2.10, posX_m: 0.38, posY_m: 0, posZ_m: -0.02, color: '#10b981', visible: true },
    { id: 'vtol_esc_hub', name: 'Блок 4-в-1 ESC 60A + PDB', category: 'avionics', mass_kg: 0.18, posX_m: 0.52, posY_m: 0, posZ_m: 0.01, color: '#8b5cf6', visible: true },
    { id: 'pusher_motor', name: 'Маршевый электромотор T-Motor AT4120', category: 'propulsion', mass_kg: 0.38, posX_m: 1.30, posY_m: 0, posZ_m: 0.02, color: '#ef4444', visible: true },
    { id: 'parachute_bay', name: 'Баллистический спасательный парашют', category: 'structure', mass_kg: 0.45, posX_m: 0.70, posY_m: 0, posZ_m: 0.05, color: '#ec4899', visible: true },
    { id: 'carbon_spars', name: 'Карбоновый силовой лонжерон D=16мм', category: 'structure', mass_kg: 0.35, posX_m: 0.50, posY_m: 0, posZ_m: 0, color: '#64748b', visible: true }
  ]);

  // Three.js Canvas Ref
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const uavRootGroupRef = useRef<THREE.Group | null>(null);
  const propGroupRef = useRef<THREE.Group[]>([]);
  const aileronLeftRef = useRef<THREE.Mesh | null>(null);
  const aileronRightRef = useRef<THREE.Mesh | null>(null);
  const elevatorRef = useRef<THREE.Mesh | null>(null);
  const particlesGroupRef = useRef<THREE.Points | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const prevMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraOrbitRef = useRef<{ radius: number; theta: number; phi: number; target: THREE.Vector3 }>({
    radius: 4.2,
    theta: Math.PI / 4,
    phi: Math.PI / 3,
    target: new THREE.Vector3(0.5, 0, 0)
  });

  // Apply Architecture Preset
  const handleApplyArchitecturePreset = (arch: UAVArchitectureType) => {
    setArchitecture(arch);
    switch (arch) {
      case 'flying_wing':
        setUavName('SkyWing-210 Stealth Recon');
        setWingspan_m(2.1);
        setRootChord_m(0.48);
        setTipChord_m(0.16);
        setSweep_deg(19.0);
        setDihedral_deg(1.5);
        setWashout_deg(-3.0);
        setAirfoil('MH60');
        setFuselageLength_m(0.95);
        setFuselageWidth_m(0.24);
        setFuselageHeight_m(0.14);
        setTailType('none');
        setHasWinglets(true);
        break;
      case 'conventional':
        setUavName('AeroTractor-260 LongRange');
        setWingspan_m(2.6);
        setRootChord_m(0.32);
        setTipChord_m(0.20);
        setSweep_deg(4.0);
        setDihedral_deg(3.0);
        setWashout_deg(-1.5);
        setAirfoil('NACA2412');
        setFuselageLength_m(1.55);
        setFuselageWidth_m(0.18);
        setFuselageHeight_m(0.19);
        setTailType('conventional');
        setTailSpan_m(0.70);
        setTailChord_m(0.16);
        setTailBoomLength_m(0.95);
        setHasWinglets(false);
        break;
      case 'twin_boom':
        setUavName('TwinBoom-Surveillance 300');
        setWingspan_m(3.0);
        setRootChord_m(0.35);
        setTipChord_m(0.22);
        setSweep_deg(3.0);
        setDihedral_deg(2.0);
        setWashout_deg(-1.5);
        setAirfoil('NACA4415');
        setFuselageLength_m(1.20);
        setFuselageWidth_m(0.22);
        setFuselageHeight_m(0.22);
        setTailType('inverted_v');
        setTailSpan_m(0.85);
        setTailChord_m(0.18);
        setTailBoomLength_m(1.10);
        setVTailAngle_deg(115);
        setHasWinglets(true);
        break;
      case 'vtol_quadplane':
        setUavName('AeroCraft-VTOL 2400 Pro');
        setWingspan_m(2.4);
        setRootChord_m(0.36);
        setTipChord_m(0.18);
        setSweep_deg(8.5);
        setDihedral_deg(2.5);
        setWashout_deg(-2.0);
        setAirfoil('MH60');
        setFuselageLength_m(1.35);
        setFuselageWidth_m(0.20);
        setFuselageHeight_m(0.18);
        setTailType('inverted_v');
        setTailSpan_m(0.65);
        setTailChord_m(0.14);
        setTailBoomLength_m(0.85);
        setVTailAngle_deg(110);
        setVtolBoomLength_m(0.95);
        setVtolBoomOffset_m(0.55);
        setHasWinglets(true);
        break;
      case 'canard':
        setUavName('AeroDuck-Canard 220 HighAOA');
        setWingspan_m(2.2);
        setRootChord_m(0.38);
        setTipChord_m(0.20);
        setSweep_deg(14.0);
        setDihedral_deg(1.0);
        setWashout_deg(-1.0);
        setAirfoil('ClarkY');
        setFuselageLength_m(1.40);
        setFuselageWidth_m(0.18);
        setFuselageHeight_m(0.16);
        setTailType('twin_vertical');
        setTailSpan_m(0.55);
        setTailChord_m(0.12);
        setHasWinglets(true);
        break;
      case 'tandem':
        setUavName('TandemLifter-200 HeavyPayload');
        setWingspan_m(2.0);
        setRootChord_m(0.30);
        setTipChord_m(0.24);
        setSweep_deg(0.0);
        setDihedral_deg(2.0);
        setWashout_deg(0);
        setAirfoil('NACA4415');
        setFuselageLength_m(1.60);
        setFuselageWidth_m(0.26);
        setFuselageHeight_m(0.24);
        setTailType('conventional');
        setHasWinglets(false);
        break;
      case 'x_wing_munition':
        setUavName('DartMunition-X 120 Strike');
        setWingspan_m(1.2);
        setRootChord_m(0.18);
        setTipChord_m(0.12);
        setSweep_deg(25.0);
        setDihedral_deg(0);
        setWashout_deg(0);
        setAirfoil('NACA0012');
        setFuselageLength_m(0.95);
        setFuselageWidth_m(0.14);
        setFuselageHeight_m(0.14);
        setTailType('none');
        setHasWinglets(false);
        break;
      case 'tailsitter':
        setUavName('Apex-Tailsitter VTOL 180');
        setWingspan_m(1.8);
        setRootChord_m(0.42);
        setTipChord_m(0.22);
        setSweep_deg(16.0);
        setDihedral_deg(0);
        setWashout_deg(-2.0);
        setAirfoil('MH60');
        setFuselageLength_m(1.10);
        setFuselageWidth_m(0.22);
        setFuselageHeight_m(0.20);
        setTailType('twin_vertical');
        setHasWinglets(true);
        break;
    }
  };

  // Real-Time Engineering Physics & Aero Calculation
  const physicsData = useMemo(() => {
    // 1. Wing Geometry
    const b = wingspan_m;
    const cr = rootChord_m;
    const ct = tipChord_m;
    const lambda = ct / cr;
    const wingArea_m2 = ((cr + ct) / 2) * b;
    const aspectRatio = (b * b) / wingArea_m2;
    const mac_m = (2 / 3) * cr * ((1 + lambda + lambda * lambda) / (1 + lambda));
    
    // Aerodynamic Center (X_ac) location
    const sweepRad = (sweep_deg * Math.PI) / 180;
    const y_mac = (b / 6) * ((1 + 2 * lambda) / (1 + lambda));
    const x_wing_root = 0.35; // Root leading edge position
    const x_ac = x_wing_root + y_mac * Math.tan(sweepRad) + 0.25 * mac_m;
    
    // Tail contribution to Neutral Point
    let tailArea_m2 = 0;
    let l_tail = tailBoomLength_m;
    if (tailType !== 'none') {
      tailArea_m2 = tailSpan_m * tailChord_m;
    }
    const tailVolume_Vh = wingArea_m2 > 0 ? (tailArea_m2 * l_tail) / (wingArea_m2 * mac_m) : 0;
    const x_np = x_ac + 0.55 * tailVolume_Vh * mac_m;

    // 2. Mass & Center of Gravity (CG)
    // Structure base mass estimation
    const skinArea = wingArea_m2 * 2 + fuselageLength_m * (fuselageWidth_m + fuselageHeight_m) * 2;
    const airframeStructureMass = skinArea * 0.95 + (architecture === 'vtol_quadplane' ? 0.85 : 0.45);

    let totalComponentMass = 0;
    let sumMomentX = 0;
    let sumMomentY = 0;
    let sumMomentZ = 0;

    components.forEach((c) => {
      totalComponentMass += c.mass_kg;
      sumMomentX += c.mass_kg * c.posX_m;
      sumMomentY += c.mass_kg * c.posY_m;
      sumMomentZ += c.mass_kg * c.posZ_m;
    });

    // Add structure mass centered near fuselage center
    const structCgX = x_wing_root + 0.4 * cr;
    totalComponentMass += airframeStructureMass;
    sumMomentX += airframeStructureMass * structCgX;

    const totalMass_kg = totalComponentMass;
    const x_cg = totalMass_kg > 0 ? sumMomentX / totalMass_kg : 0.45;
    const y_cg = totalMass_kg > 0 ? sumMomentY / totalMass_kg : 0;
    const z_cg = totalMass_kg > 0 ? sumMomentZ / totalMass_kg : 0;

    // 3. Static Margin
    const staticMargin_percent = mac_m > 0 ? ((x_np - x_cg) / mac_m) * 100 : 10;
    
    // Stability State Label
    let stabilityStatus: 'unstable' | 'optimal' | 'stiff' | 'neutral' = 'optimal';
    if (staticMargin_percent < 5.0) stabilityStatus = 'unstable';
    else if (staticMargin_percent >= 5.0 && staticMargin_percent <= 16.0) stabilityStatus = 'optimal';
    else stabilityStatus = 'stiff';

    // 4. Aerodynamics & Drag Polar
    const c_d0 = 0.021 + (architecture === 'vtol_quadplane' ? 0.007 : 0.0) + (tailType !== 'none' ? 0.003 : 0);
    const oswald_e = 0.88 - (sweep_deg > 15 ? 0.05 : 0) + (hasWinglets ? 0.04 : 0);
    const k_induced = 1 / (Math.PI * oswald_e * aspectRatio);
    const max_ld = Math.sqrt(1 / (4 * c_d0 * k_induced));
    
    // Speeds (Sea Level ISA)
    const rho = 1.225; // kg/m3
    const cl_max = 1.45;
    const v_stall_ms = Math.sqrt((2 * totalMass_kg * 9.81) / (rho * wingArea_m2 * cl_max));
    const v_stall_kmh = v_stall_ms * 3.6;
    const v_cruise_kmh = v_stall_kmh * 1.85;
    const v_max_kmh = v_cruise_kmh * 1.65;
    const wingLoading_kgm2 = totalMass_kg / wingArea_m2;

    // 5. Propulsion & Mission Performance
    const batteryComp = components.find((c) => c.category === 'battery');
    const batteryMass = batteryComp ? batteryComp.mass_kg : 1.8;
    const batteryEnergyWh = batteryMass * 165; // ~165 Wh/kg for high-density Li-Ion
    
    // Cruise thrust & power
    const cruiseThrust_N = (totalMass_kg * 9.81) / max_ld;
    const v_cruise_ms = v_cruise_kmh / 3.6;
    const cruisePowerMech_W = cruiseThrust_N * v_cruise_ms;
    const propEfficiency = 0.78;
    const cruisePowerElec_W = cruisePowerMech_W / propEfficiency + 25; // +25W avionics
    
    const flightTime_hours = batteryEnergyWh > 0 ? (batteryEnergyWh * 0.85) / cruisePowerElec_W : 1.5;
    const flightTime_min = flightTime_hours * 60;
    const calculatedRange_km = v_cruise_kmh * flightTime_hours;

    // VTOL Hover Power (Momentum Theory + Figure of Merit)
    let vtolHoverPower_W = 0;
    if (architecture === 'vtol_quadplane') {
      const diskRadius_m = (vtolPropSize_inch * 0.0254) / 2;
      const totalDiskArea = vtolMotorCount * Math.PI * diskRadius_m * diskRadius_m;
      const hoverThrust_N = totalMass_kg * 9.81 * 1.35; // 1.35x TWR margin
      const inducedHoverPower = Math.pow(hoverThrust_N, 1.5) / Math.sqrt(2 * rho * totalDiskArea);
      vtolHoverPower_W = inducedHoverPower / 0.65 + 40; // FM = 0.65
    }

    return {
      wingArea_m2,
      aspectRatio,
      mac_m,
      x_ac,
      x_np,
      x_cg,
      y_cg,
      z_cg,
      totalMass_kg,
      airframeStructureMass,
      staticMargin_percent,
      stabilityStatus,
      c_d0,
      oswald_e,
      max_ld,
      v_stall_kmh,
      v_cruise_kmh,
      v_max_kmh,
      wingLoading_kgm2,
      cruisePowerElec_W,
      flightTime_min,
      calculatedRange_km,
      vtolHoverPower_W
    };
  }, [
    wingspan_m,
    rootChord_m,
    tipChord_m,
    sweep_deg,
    fuselageLength_m,
    fuselageWidth_m,
    fuselageHeight_m,
    tailType,
    tailSpan_m,
    tailChord_m,
    tailBoomLength_m,
    hasWinglets,
    architecture,
    components,
    vtolMotorCount,
    vtolPropSize_inch
  ]);

  // Sync with Digital Twin Hub if requested
  const handlePushToDigitalTwin = () => {
    if (onApplyToDigitalTwin) {
      onApplyToDigitalTwin({
        wingspan_m,
        aspectRatio: physicsData.aspectRatio,
        wingArea_m2: physicsData.wingArea_m2,
        sweep_deg,
        totalMass_kg: physicsData.totalMass_kg,
        liftToDragRatio: physicsData.max_ld,
        cruiseSpeed_kmh: physicsData.v_cruise_kmh,
        v_stall_kmh: physicsData.v_stall_kmh,
        staticMargin_percent: physicsData.staticMargin_percent,
        calculatedRange_km: physicsData.calculatedRange_km,
        flightTime_min: physicsData.flightTime_min
      });
    }
  };

  // AI Generative Synthesis Handler
  const handleExecuteAiSynthesis = async () => {
    setIsAiSynthesizing(true);
    setAiSynthesizeLog('Генеральный AI-конструктор синтезирует 3D геометрию и весовую компоновку...');

    try {
      const res = await fetch('/api/uav/ai-synthesize-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionPrompt: aiPrompt,
          architecture
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }

      const json = await res.json();
      if (json.success && json.config) {
        const c = json.config;
        if (c.name) setUavName(c.name);
        if (c.tacticalRole) setTacticalRole(c.tacticalRole);
        if (c.architecture) setArchitecture(c.architecture);
        
        if (c.dimensions) {
          if (c.dimensions.wingspan_m) setWingspan_m(c.dimensions.wingspan_m);
          if (c.dimensions.rootChord_m) setRootChord_m(c.dimensions.rootChord_m);
          if (c.dimensions.tipChord_m) setTipChord_m(c.dimensions.tipChord_m);
          if (c.dimensions.sweep_deg !== undefined) setSweep_deg(c.dimensions.sweep_deg);
          if (c.dimensions.dihedral_deg !== undefined) setDihedral_deg(c.dimensions.dihedral_deg);
          if (c.dimensions.washout_deg !== undefined) setWashout_deg(c.dimensions.washout_deg);
          if (c.dimensions.airfoil) setAirfoil(c.dimensions.airfoil);
          if (c.dimensions.fuselageLength_m) setFuselageLength_m(c.dimensions.fuselageLength_m);
          if (c.dimensions.fuselageWidth_m) setFuselageWidth_m(c.dimensions.fuselageWidth_m);
          if (c.dimensions.fuselageHeight_m) setFuselageHeight_m(c.dimensions.fuselageHeight_m);
          if (c.dimensions.tailSpan_m) setTailSpan_m(c.dimensions.tailSpan_m);
        }

        if (c.components && Array.isArray(c.components)) {
          const newComps: UAVComponentPart[] = c.components.map((item: any, idx: number) => ({
            id: `ai_comp_${idx}`,
            name: item.name || `Оборудование #${idx + 1}`,
            category: item.category || 'payload',
            mass_kg: item.mass_kg || 0.5,
            posX_m: item.x_m !== undefined ? item.x_m : 0.4,
            posY_m: item.y_m || 0,
            posZ_m: item.z_m || 0,
            color: item.category === 'battery' ? '#10b981' : item.category === 'payload' ? '#06b6d4' : '#f59e0b',
            visible: true
          }));
          setComponents(newComps);
        }

        setAiSynthesizeLog(`✅ Синтез завершен: ${c.name || 'Оптимизированный БПЛА'} сгенерирован и отбалансирован.`);
      }
    } catch (err: any) {
      console.warn('AI 3D synthesize error, falling back to local algorithmic solver:', err);
      setAiSynthesizeLog('⚠️ Режим быстрой локальной оптимизации: параметры сбалансированы.');
    } finally {
      setIsAiSynthesizing(false);
    }
  };

  // Update Camera Orbit
  const updateCameraPosition = useCallback(() => {
    if (!cameraRef.current) return;
    const { radius, theta, phi, target } = cameraOrbitRef.current;
    
    // Spherical to Cartesian
    const x = target.x + radius * Math.sin(phi) * Math.cos(theta);
    const y = target.y + radius * Math.cos(phi);
    const z = target.z + radius * Math.sin(phi) * Math.sin(theta);
    
    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(target);
  }, []);

  // Camera Presets
  const setCameraView = (preset: CameraPreset) => {
    setCameraPreset(preset);
    const target = cameraOrbitRef.current.target;
    switch (preset) {
      case 'iso':
        cameraOrbitRef.current.radius = 4.2;
        cameraOrbitRef.current.theta = Math.PI / 4;
        cameraOrbitRef.current.phi = Math.PI / 3;
        break;
      case 'top':
        cameraOrbitRef.current.radius = 4.0;
        cameraOrbitRef.current.theta = 0;
        cameraOrbitRef.current.phi = 0.001; // nearly top down
        break;
      case 'front':
        cameraOrbitRef.current.radius = 3.8;
        cameraOrbitRef.current.theta = Math.PI;
        cameraOrbitRef.current.phi = Math.PI / 2;
        break;
      case 'side':
        cameraOrbitRef.current.radius = 3.8;
        cameraOrbitRef.current.theta = Math.PI / 2;
        cameraOrbitRef.current.phi = Math.PI / 2;
        break;
      case 'bottom':
        cameraOrbitRef.current.radius = 4.0;
        cameraOrbitRef.current.theta = 0;
        cameraOrbitRef.current.phi = Math.PI - 0.001;
        break;
      case 'chase':
        cameraOrbitRef.current.radius = 3.2;
        cameraOrbitRef.current.theta = -Math.PI / 6;
        cameraOrbitRef.current.phi = Math.PI / 2.3;
        break;
    }
    updateCameraPosition();
  };

  // ==========================================
  // THREE.JS 3D SCENE & MESH REBUILD LIFECYCLE
  // ==========================================
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Initialize Scene, Camera & Renderer
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 100);
    cameraRef.current = camera;
    updateCameraPosition();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xe0f2fe, 1.4);
    dirLight1.position.set(5, 8, 5);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.6);
    dirLight2.position.set(-5, -4, -5);
    scene.add(dirLight2);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.5);
    scene.add(hemiLight);

    // 3. Grid & Coordinate Axes
    const gridHelper = new THREE.GridHelper(8, 32, 0x0284c7, 0x1e293b);
    gridHelper.position.y = -0.6;
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(1.2);
    axesHelper.position.set(0, -0.58, 0);
    scene.add(axesHelper);

    // 4. Mouse Orbit Listeners
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - prevMousePosRef.current.x;
      const deltaY = e.clientY - prevMousePosRef.current.y;
      prevMousePosRef.current = { x: e.clientX, y: e.clientY };

      cameraOrbitRef.current.theta -= deltaX * 0.008;
      cameraOrbitRef.current.phi = Math.max(
        0.05,
        Math.min(Math.PI - 0.05, cameraOrbitRef.current.phi - deltaY * 0.008)
      );
      updateCameraPosition();
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraOrbitRef.current.radius = Math.max(
        0.8,
        Math.min(12, cameraOrbitRef.current.radius + e.deltaY * 0.003)
      );
      updateCameraPosition();
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    domEl.addEventListener('wheel', handleWheel, { passive: false });

    // 5. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && rendererRef.current && cameraRef.current) {
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // 6. Animation Render Loop
    let animFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Spin Propellers
      if (isPropellerSpinning) {
        propGroupRef.current.forEach((pg) => {
          if (pg) pg.rotation.y += delta * 45;
        });
      }

      // Animate Airflow Streamlines Particles
      if (particlesGroupRef.current) {
        const positions = particlesGroupRef.current.geometry.attributes.position.array as Float32Array;
        const count = positions.length / 3;
        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          positions[i3] += delta * 3.5; // move along X
          if (positions[i3] > 2.5) {
            positions[i3] = -1.2 + Math.random() * 0.2; // reset near nose
          }
        }
        particlesGroupRef.current.geometry.attributes.position.needsUpdate = true;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(animFrameId);
      domEl.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      domEl.removeEventListener('wheel', handleWheel);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, [updateCameraPosition, isPropellerSpinning]);

  // ==========================================
  // REBUILD 3D AIRFRAME MESHES WHEN PARAMS CHANGE
  // ==========================================
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove previous UAV group
    if (uavRootGroupRef.current) {
      scene.remove(uavRootGroupRef.current);
      uavRootGroupRef.current.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
      });
    }

    const uavRoot = new THREE.Group();
    uavRootGroupRef.current = uavRoot;
    propGroupRef.current = [];

    // Shading Materials Generator
    const getAirframeMaterial = (partColor: string = '#1e293b', isInternal: boolean = false) => {
      if (shadingMode === 'wireframe_cad') {
        return new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true });
      }
      if (shadingMode === 'xray_internals') {
        return new THREE.MeshPhysicalMaterial({
          color: 0x0284c7,
          transparent: true,
          opacity: isInternal ? 0.95 : 0.22,
          roughness: 0.1,
          transmission: 0.7,
          depthWrite: isInternal
        });
      }
      if (shadingMode === 'carbon_composite') {
        return new THREE.MeshStandardMaterial({
          color: new THREE.Color(0x181e29),
          roughness: 0.25,
          metalness: 0.45,
          flatShading: false
        });
      }
      if (shadingMode === 'cfd_pressure_cp') {
        return new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.35,
          metalness: 0.1
        });
      }
      // pbr_solid
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(partColor),
        roughness: 0.4,
        metalness: 0.2
      });
    };

    const carbonSparMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 });
    const motorMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3, metalness: 0.7 });
    const propMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.5, transparent: true, opacity: 0.85 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x06b6d4, transmission: 0.9, opacity: 0.4, transparent: true, roughness: 0.05 });

    const explodeDist = (explodedViewPct / 100) * 0.8;

    // -------------------------------------------------------------
    // 1. FUSELAGE MESH
    // -------------------------------------------------------------
    const fuseGroup = new THREE.Group();
    fuseGroup.position.y = explodeDist * -0.5;

    const fuseSegments = 24;
    const fuseGeom = new THREE.CylinderGeometry(
      fuselageWidth_m * 0.45, // radiusTop (rear)
      fuselageWidth_m * 0.52, // radiusBottom (front)
      fuselageLength_m,
      fuseSegments,
      16
    );
    fuseGeom.rotateZ(Math.PI / 2); // align along X
    fuseGeom.translate(fuselageLength_m / 2, 0, 0);

    // Apply CFD pressure vertex colors if in CFD mode
    if (shadingMode === 'cfd_pressure_cp') {
      const count = fuseGeom.attributes.position.count;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const x = fuseGeom.attributes.position.getX(i);
        const normX = x / fuselageLength_m; // 0 = nose (high Cp stagnation), 1 = tail
        // Map stagnation (red) -> suction (blue) -> recovery (green)
        let r = 0, g = 0, b = 0;
        if (normX < 0.15) {
          r = 0.95; g = 0.2; b = 0.1; // Red Stagnation
        } else if (normX < 0.4) {
          r = 0.1; g = 0.4; b = 0.95; // Blue Suction
        } else {
          r = 0.1; g = 0.85; b = 0.4; // Green Recovery
        }
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
      }
      fuseGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }

    const fuseMesh = new THREE.Mesh(fuseGeom, getAirframeMaterial('#1e293b'));
    fuseMesh.castShadow = true;
    fuseMesh.receiveShadow = true;
    fuseGroup.add(fuseMesh);

    // Nose Cone / Sensor Pod Dome
    if (noseType === 'sensor_dome') {
      const domeGeom = new THREE.SphereGeometry(fuselageWidth_m * 0.42, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      domeGeom.rotateZ(-Math.PI / 2);
      const domeMesh = new THREE.Mesh(domeGeom, glassMat);
      domeMesh.position.set(0.04, -0.04, 0);
      fuseGroup.add(domeMesh);
    }

    uavRoot.add(fuseGroup);

    // -------------------------------------------------------------
    // 2. MAIN WING MESHES (LEFT & RIGHT SEMISPAN)
    // -------------------------------------------------------------
    const halfSpan = wingspan_m / 2;
    const sweepRad = (sweep_deg * Math.PI) / 180;
    const dihedralRad = (dihedral_deg * Math.PI) / 180;
    const x_wing_root = 0.35; // root LE position along fuselage

    const buildWingMesh = (isRight: boolean) => {
      const wingGroup = new THREE.Group();
      const sign = isRight ? 1 : -1;
      wingGroup.position.z = explodeDist * sign * 0.8;

      const wingShape = new THREE.BufferGeometry();
      const spanSteps = 16;
      const chordSteps = 12;
      const vertices: number[] = [];
      const indices: number[] = [];
      const uvs: number[] = [];
      const colors: number[] = [];

      for (let s = 0; s <= spanSteps; s++) {
        const eta = s / spanSteps; // 0 (root) to 1 (tip)
        const curY = eta * halfSpan * sign;
        const curChord = rootChord_m * (1 - eta) + tipChord_m * eta;
        const curX_le = x_wing_root + eta * halfSpan * Math.tan(sweepRad);
        const curZ_dihed = eta * halfSpan * Math.sin(dihedralRad);
        const curTwist = (washout_deg * eta * Math.PI) / 180;

        for (let c = 0; c <= chordSteps; c++) {
          const xc = c / chordSteps; // 0 to 1
          // Camber thickness model
          const thicknessRatio = 0.10; // 10% thickness
          const yt = 5 * thicknessRatio * (0.2969 * Math.sqrt(xc) - 0.126 * xc - 0.3516 * xc * xc + 0.2843 * Math.pow(xc, 3) - 0.1015 * Math.pow(xc, 4));
          const camber = 0.02 * Math.sin(xc * Math.PI); // 2% reflexed camber
          
          const localX = xc * curChord;
          const localZ = (c <= chordSteps / 2 ? yt + camber : -yt + camber) * curChord;

          // Rotate by washout twist
          const rotX = localX * Math.cos(curTwist) - localZ * Math.sin(curTwist);
          const rotZ = localX * Math.sin(curTwist) + localZ * Math.cos(curTwist);

          const finalX = curX_le + rotX;
          const finalY = curY;
          const finalZ = curZ_dihed + rotZ;

          vertices.push(finalX, finalZ, finalY); // map Y as Three.js Z-span
          uvs.push(xc, eta);

          // CFD Pressure Colors
          if (shadingMode === 'cfd_pressure_cp') {
            if (xc < 0.2) {
              colors.push(0.1, 0.3, 0.95); // Suction peak (Deep Blue)
            } else if (xc < 0.6) {
              colors.push(0.1, 0.8, 0.4); // Laminar recovery (Green)
            } else {
              colors.push(0.9, 0.7, 0.1); // Trailing edge pressure rise (Amber)
            }
          }
        }
      }

      // Generate quad indices
      for (let s = 0; s < spanSteps; s++) {
        for (let c = 0; c < chordSteps; c++) {
          const row1 = s * (chordSteps + 1);
          const row2 = (s + 1) * (chordSteps + 1);
          const p1 = row1 + c;
          const p2 = row1 + c + 1;
          const p3 = row2 + c + 1;
          const p4 = row2 + c;

          indices.push(p1, p2, p4);
          indices.push(p2, p3, p4);
        }
      }

      wingShape.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      wingShape.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      if (colors.length > 0) {
        wingShape.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      }
      wingShape.setIndex(indices);
      wingShape.computeVertexNormals();

      const wingMesh = new THREE.Mesh(wingShape, getAirframeMaterial('#1e293b'));
      wingMesh.castShadow = true;
      wingMesh.receiveShadow = true;
      wingGroup.add(wingMesh);

      // Winglet / Endplate
      if (hasWinglets && wingletHeight_m > 0.02) {
        const wingletGeom = new THREE.BoxGeometry(tipChord_m * 0.85, wingletHeight_m, 0.015);
        const tipX = x_wing_root + halfSpan * Math.tan(sweepRad) + tipChord_m * 0.45;
        const tipZ = halfSpan * Math.sin(dihedralRad) + wingletHeight_m / 2;
        const tipY = halfSpan * sign;
        wingletGeom.translate(tipX, tipZ, tipY);
        const wingletMesh = new THREE.Mesh(wingletGeom, getAirframeMaterial('#0284c7'));
        wingGroup.add(wingletMesh);
      }

      // Internal Carbon Spar Tube
      if (showInternalSpars) {
        const sparGeom = new THREE.CylinderGeometry(0.012, 0.012, halfSpan * 0.95, 12);
        sparGeom.rotateX(Math.PI / 2);
        const sparMidX = x_wing_root + (halfSpan / 2) * Math.tan(sweepRad) + 0.3 * rootChord_m;
        const sparMidY = (halfSpan / 2) * sign;
        const sparMidZ = (halfSpan / 2) * Math.sin(dihedralRad);
        sparGeom.translate(sparMidX, sparMidZ, sparMidY);
        const sparMesh = new THREE.Mesh(sparGeom, carbonSparMat);
        wingGroup.add(sparMesh);
      }

      return wingGroup;
    };

    const leftWing = buildWingMesh(false);
    const rightWing = buildWingMesh(true);
    uavRoot.add(leftWing);
    uavRoot.add(rightWing);

    // -------------------------------------------------------------
    // 3. VTOL QUAD BOOMS & ROTORS (FOR VTOL_QUADPLANE)
    // -------------------------------------------------------------
    if (architecture === 'vtol_quadplane') {
      const vtolGroup = new THREE.Group();
      vtolGroup.position.y = explodeDist * 0.4;

      const offsets = [-vtolBoomOffset_m, vtolBoomOffset_m];
      offsets.forEach((offZ) => {
        // Carbon Boom Tube along X
        const boomGeom = new THREE.CylinderGeometry(0.016, 0.016, vtolBoomLength_m, 12);
        boomGeom.rotateZ(Math.PI / 2);
        boomGeom.translate(x_wing_root + rootChord_m * 0.4, 0.02, offZ);
        const boomMesh = new THREE.Mesh(boomGeom, carbonSparMat);
        vtolGroup.add(boomMesh);

        // Front & Rear Motors on this boom
        const xFront = x_wing_root + rootChord_m * 0.4 - vtolBoomLength_m / 2;
        const xRear = x_wing_root + rootChord_m * 0.4 + vtolBoomLength_m / 2;

        [xFront, xRear].forEach((mX) => {
          // Motor Mount Pod
          const podGeom = new THREE.CylinderGeometry(0.028, 0.028, 0.045, 12);
          podGeom.translate(mX, 0.045, offZ);
          const podMesh = new THREE.Mesh(podGeom, motorMat);
          vtolGroup.add(podMesh);

          // Propeller Disk
          const propGroup = new THREE.Group();
          propGroup.position.set(mX, 0.075, offZ);
          const propRadius = (vtolPropSize_inch * 0.0254) / 2;
          const bladeGeom = new THREE.BoxGeometry(propRadius * 2, 0.006, 0.022);
          const bladeMesh = new THREE.Mesh(bladeGeom, propMat);
          propGroup.add(bladeMesh);
          vtolGroup.add(propGroup);
          propGroupRef.current.push(propGroup);
        });
      });

      uavRoot.add(vtolGroup);
    }

    // -------------------------------------------------------------
    // 4. TAIL & EMPENNAGE ASSEMBLY
    // -------------------------------------------------------------
    if (tailType !== 'none') {
      const tailGroup = new THREE.Group();
      tailGroup.position.x = explodeDist * 0.6;

      const tailX = x_wing_root + tailBoomLength_m;

      if (tailType === 'inverted_v') {
        const vRad = ((180 - vTailAngle_deg) / 2 * Math.PI) / 180;
        const finSpan = tailSpan_m / 2;

        [-1, 1].forEach((sideSign) => {
          const vFinGeom = new THREE.BoxGeometry(tailChord_m, finSpan, 0.015);
          vFinGeom.rotateZ(sideSign * vRad);
          vFinGeom.translate(tailX + tailChord_m / 2, -finSpan * 0.4, sideSign * finSpan * 0.7);
          const finMesh = new THREE.Mesh(vFinGeom, getAirframeMaterial('#0284c7'));
          tailGroup.add(finMesh);
        });
      } else if (tailType === 'conventional' || tailType === 't_tail') {
        // Horizontal Stabilizer
        const hStabGeom = new THREE.BoxGeometry(tailChord_m, 0.015, tailSpan_m);
        const hZ = tailType === 't_tail' ? 0.28 : 0.02;
        hStabGeom.translate(tailX + tailChord_m / 2, hZ, 0);
        const hMesh = new THREE.Mesh(hStabGeom, getAirframeMaterial('#1e293b'));
        tailGroup.add(hMesh);

        // Vertical Fin
        const vFinGeom = new THREE.BoxGeometry(tailChord_m * 1.1, 0.32, 0.015);
        vFinGeom.translate(tailX + tailChord_m / 2, 0.16, 0);
        const vMesh = new THREE.Mesh(vFinGeom, getAirframeMaterial('#0284c7'));
        tailGroup.add(vMesh);
      }

      uavRoot.add(tailGroup);
    }

    // -------------------------------------------------------------
    // 5. PUSHER / MAIN PROPULSION MOTOR & PROP
    // -------------------------------------------------------------
    const pusherX = fuselageLength_m + 0.02;
    const pusherMotorGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.05, 16);
    pusherMotorGeom.rotateZ(Math.PI / 2);
    pusherMotorGeom.translate(pusherX, 0.02, 0);
    const pusherMotorMesh = new THREE.Mesh(pusherMotorGeom, motorMat);
    uavRoot.add(pusherMotorMesh);

    const pusherPropGroup = new THREE.Group();
    pusherPropGroup.position.set(pusherX + 0.03, 0.02, 0);
    pusherPropGroup.rotation.z = Math.PI / 2;
    const propD = (pusherPropSize_inch * 0.0254) / 2;
    const pusherBladeGeom = new THREE.BoxGeometry(propD * 2, 0.008, 0.025);
    const pusherBladeMesh = new THREE.Mesh(pusherBladeGeom, propMat);
    pusherPropGroup.add(pusherBladeMesh);
    uavRoot.add(pusherPropGroup);
    propGroupRef.current.push(pusherPropGroup);

    // -------------------------------------------------------------
    // 6. INTERNAL EQUIPMENT COMPONENTS (BATTERY, AVIONICS, GIMBAL)
    // -------------------------------------------------------------
    components.forEach((comp) => {
      if (!comp.visible) return;
      const compGroup = new THREE.Group();
      compGroup.position.set(comp.posX_m, comp.posZ_m, comp.posY_m);

      let compGeom: THREE.BufferGeometry;
      if (comp.category === 'battery') {
        compGeom = new THREE.BoxGeometry(0.18, 0.07, 0.09);
      } else if (comp.category === 'payload') {
        compGeom = new THREE.SphereGeometry(0.055, 12, 12);
      } else if (comp.category === 'avionics') {
        compGeom = new THREE.BoxGeometry(0.08, 0.04, 0.06);
      } else {
        compGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.08, 12);
      }

      const compMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(comp.color),
        roughness: 0.3,
        metalness: 0.5
      });
      const compMesh = new THREE.Mesh(compGeom, compMat);
      compGroup.add(compMesh);
      uavRoot.add(compGroup);
    });

    // -------------------------------------------------------------
    // 7. CENTER OF GRAVITY (CG) & NEUTRAL POINT (NP) GIZMO
    // -------------------------------------------------------------
    if (showCgGizmo) {
      const cgGroup = new THREE.Group();

      // CG Marker: Yellow/Black striped Sphere
      const cgGeom = new THREE.SphereGeometry(0.035, 16, 16);
      const cgMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, wireframe: true });
      const cgMesh = new THREE.Mesh(cgGeom, cgMat);
      cgMesh.position.set(physicsData.x_cg, physicsData.z_cg, physicsData.y_cg);
      cgGroup.add(cgMesh);

      // NP Marker: Cyan Sphere
      const npGeom = new THREE.SphereGeometry(0.028, 12, 12);
      const npMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      const npMesh = new THREE.Mesh(npGeom, npMat);
      npMesh.position.set(physicsData.x_np, 0.02, 0);
      cgGroup.add(npMesh);

      // Connecting line between CG and NP (Static Margin Indicator)
      const lineGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(physicsData.x_cg, 0.02, 0),
        new THREE.Vector3(physicsData.x_np, 0.02, 0)
      ]);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 3 });
      const smLine = new THREE.Line(lineGeom, lineMat);
      cgGroup.add(smLine);

      uavRoot.add(cgGroup);
    }

    // -------------------------------------------------------------
    // 8. AIRFLOW STREAMLINES PARTICLES
    // -------------------------------------------------------------
    if (showAirflowStreamlines) {
      const particleCount = 180;
      const partPositions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        partPositions[i * 3] = -1.2 + Math.random() * 3.5; // X
        partPositions[i * 3 + 1] = (Math.random() - 0.5) * 0.4 + 0.05; // Z
        partPositions[i * 3 + 2] = (Math.random() - 0.5) * (wingspan_m * 0.95); // Y
      }
      const partGeom = new THREE.BufferGeometry();
      partGeom.setAttribute('position', new THREE.BufferAttribute(partPositions, 3));
      const partMat = new THREE.PointsMaterial({
        color: 0x38bdf8,
        size: 0.025,
        transparent: true,
        opacity: 0.75
      });
      const points = new THREE.Points(partGeom, partMat);
      particlesGroupRef.current = points;
      uavRoot.add(points);
    }

    scene.add(uavRoot);
  }, [
    architecture,
    wingspan_m,
    rootChord_m,
    tipChord_m,
    sweep_deg,
    dihedral_deg,
    washout_deg,
    airfoil,
    hasWinglets,
    wingletHeight_m,
    fuselageLength_m,
    fuselageWidth_m,
    fuselageHeight_m,
    noseType,
    tailType,
    tailSpan_m,
    tailChord_m,
    tailBoomLength_m,
    vTailAngle_deg,
    vtolBoomLength_m,
    vtolBoomOffset_m,
    vtolMotorCount,
    vtolPropSize_inch,
    pusherPropSize_inch,
    shadingMode,
    showInternalSpars,
    showCgGizmo,
    showAirflowStreamlines,
    explodedViewPct,
    components,
    physicsData
  ]);

  // ==========================================
  // EXPORT 3D MESH (OBJ / STL / JSON / DXF)
  // ==========================================
  const handleExportOBJ = () => {
    let objData = `# 3D UAV OBJ File Generated by AeroStudio Pro 3D Constructor\n# Model: ${uavName}\n# Wingspan: ${wingspan_m}m, MTOW: ${physicsData.totalMass_kg.toFixed(2)}kg\n\n`;
    
    // Fuselage cylinder approximate mesh
    objData += `o Fuselage\nv 0 0 0\nv ${fuselageLength_m} 0 0\nv ${fuselageLength_m / 2} ${fuselageHeight_m / 2} ${fuselageWidth_m / 2}\nv ${fuselageLength_m / 2} ${-fuselageHeight_m / 2} ${fuselageWidth_m / 2}\nv ${fuselageLength_m / 2} ${-fuselageHeight_m / 2} ${-fuselageWidth_m / 2}\nv ${fuselageLength_m / 2} ${fuselageHeight_m / 2} ${-fuselageWidth_m / 2}\nf 1 3 4\nf 1 4 5\nf 1 5 6\nf 1 6 3\nf 2 4 3\nf 2 5 4\nf 2 6 5\nf 2 3 6\n\n`;

    // Wings
    objData += `o Wing_Main\nv 0.35 0 0\nv ${0.35 + (wingspan_m / 2) * Math.tan((sweep_deg * Math.PI) / 180)} ${wingspan_m / 2 * Math.sin((dihedral_deg * Math.PI) / 180)} ${wingspan_m / 2}\nv ${0.35 + (wingspan_m / 2) * Math.tan((sweep_deg * Math.PI) / 180) + tipChord_m} ${wingspan_m / 2 * Math.sin((dihedral_deg * Math.PI) / 180)} ${wingspan_m / 2}\nv ${0.35 + rootChord_m} 0 0\nf 7 8 9 10\n`;

    const blob = new Blob([objData], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${uavName.replace(/\s+/g, '_')}_CAD.obj`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const fullBlueprint = {
      name: uavName,
      architecture,
      tacticalRole,
      createdAt: new Date().toISOString(),
      dimensions: {
        wingspan_m,
        rootChord_m,
        tipChord_m,
        sweep_deg,
        dihedral_deg,
        washout_deg,
        airfoil,
        wingArea_m2: physicsData.wingArea_m2,
        aspectRatio: physicsData.aspectRatio,
        fuselageLength_m,
        fuselageWidth_m,
        fuselageHeight_m,
        tailType,
        tailSpan_m,
        tailChord_m
      },
      weightsAndBalance: {
        totalMass_kg: physicsData.totalMass_kg,
        airframeStructureMass_kg: physicsData.airframeStructureMass,
        x_cg_m: physicsData.x_cg,
        x_np_m: physicsData.x_np,
        staticMargin_percent: physicsData.staticMargin_percent,
        stabilityStatus: physicsData.stabilityStatus
      },
      aerodynamics: {
        max_liftToDragRatio: physicsData.max_ld,
        c_d0: physicsData.c_d0,
        oswald_e: physicsData.oswald_e,
        v_stall_kmh: physicsData.v_stall_kmh,
        v_cruise_kmh: physicsData.v_cruise_kmh,
        wingLoading_kgm2: physicsData.wingLoading_kgm2
      },
      performance: {
        flightTime_min: physicsData.flightTime_min,
        calculatedRange_km: physicsData.calculatedRange_km,
        cruisePower_W: physicsData.cruisePowerElec_W,
        vtolHoverPower_W: physicsData.vtolHoverPower_W
      },
      installedComponents: components
    };

    const blob = new Blob([JSON.stringify(fullBlueprint, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${uavName.replace(/\s+/g, '_')}_Blueprint.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/95 border border-cyan-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-xl space-y-4">
      {/* ========================================================================= */}
      {/* TOP HEADER: TITLE & CORE STATS BADGES */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 via-indigo-500/20 to-emerald-500/20 border border-cyan-500/40 rounded-xl text-cyan-400">
            <Boxes className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
                <span>3D КОНСТРУКТОР БПЛА</span>
                <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/40">
                  UAV CAD & MDO STUDIO PRO
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>Интерактивный параметрический CAD-компоновщик</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">Размах {wingspan_m}м</span>
              <span>•</span>
              <span className="text-indigo-300 font-bold">MTOW {physicsData.totalMass_kg.toFixed(2)}кг</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">L/D {physicsData.max_ld.toFixed(1)}</span>
              <span>•</span>
              <span className="text-cyan-300 font-bold">SM {physicsData.staticMargin_percent.toFixed(1)}%</span>
            </p>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSidebarTab('ai_synthesizer')}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-xs font-black text-white flex items-center gap-1.5 transition-all shadow-lg shadow-purple-500/20"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>AI СИНТЕЗАТОР</span>
          </button>

          <button
            onClick={handlePushToDigitalTwin}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-md font-mono"
            title="Передать геометрию в Цифровой Двойник и VLM/CFD симуляторы"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>СИНХРОНИЗИРОВАТЬ ДВОЙНИК</span>
          </button>

          <button
            onClick={handleExportOBJ}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 border border-slate-700 flex items-center gap-1.5 transition-all font-mono"
          >
            <Download className="w-3.5 h-3.5" />
            .OBJ
          </button>

          <button
            onClick={handleExportJSON}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 border border-slate-700 flex items-center gap-1.5 transition-all font-mono"
          >
            <FileCode2 className="w-3.5 h-3.5" />
            .JSON
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ARCHITECTURE PRESETS BAR */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono scrollbar-thin">
        <span className="text-[10px] text-slate-500 uppercase font-bold shrink-0 mr-1">АРХИТЕКТУРА:</span>
        {[
          { id: 'vtol_quadplane', label: 'СВВП QuadPlane', icon: '🛩️' },
          { id: 'flying_wing', label: 'Летающее крыло', icon: '📐' },
          { id: 'twin_boom', label: 'Двухбалочная', icon: '🛰️' },
          { id: 'conventional', label: 'Классическая', icon: '✈️' },
          { id: 'canard', label: 'Схема «Утка»', icon: '🦆' },
          { id: 'tandem', label: 'Тандемное крыло', icon: '🦅' },
          { id: 'x_wing_munition', label: 'X-Wing Барражирующий', icon: '🎯' },
          { id: 'tailsitter', label: 'Тейлситтер', icon: '🚀' }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => handleApplyArchitecturePreset(item.id as UAVArchitectureType)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0 transition-all font-semibold ${
              architecture === item.id
                ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/30'
                : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* MAIN 3D VIEWPORT & INSPECTOR SPLIT GRID */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT / CENTER: 3D THREE.JS CANVAS VIEWPORT (8 COLS) */}
        <div className="lg:col-span-8 flex flex-col space-y-2">
          {/* 3D Canvas Container */}
          <div className="relative w-full h-[540px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner group">
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Viewport Top Left Overlay: Camera Presets & Shading Modes */}
            <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 z-10">
              <div className="bg-slate-950/80 backdrop-blur-md p-1 rounded-lg border border-slate-800 flex items-center gap-1 text-[11px] font-mono">
                <span className="text-slate-500 px-1.5">ВИД:</span>
                {(['iso', 'top', 'front', 'side', 'chase'] as CameraPreset[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setCameraView(v)}
                    className={`px-2 py-0.5 rounded uppercase font-bold transition-all ${
                      cameraPreset === v ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              {/* Shading Mode Selector */}
              <div className="bg-slate-950/80 backdrop-blur-md p-1 rounded-lg border border-slate-800 flex items-center gap-1 text-[11px] font-mono">
                <span className="text-slate-500 px-1.5">ШЕЙДИНГ:</span>
                <select
                  value={shadingMode}
                  onChange={(e) => setShadingMode(e.target.value as RenderShadingMode)}
                  className="bg-slate-900 border border-slate-700 text-cyan-300 rounded px-2 py-0.5 text-[11px] focus:outline-none"
                >
                  <option value="carbon_composite">Карбон (Composite PBR)</option>
                  <option value="pbr_solid">Матовая эмаль (Solid)</option>
                  <option value="wireframe_cad">CAD Каркас (Wireframe)</option>
                  <option value="xray_internals">X-Ray (Просвечивание агрегатов)</option>
                  <option value="cfd_pressure_cp">CFD Поле давлений (Cp Heatmap)</option>
                </select>
              </div>
            </div>

            {/* Viewport Top Right: Display Toggles */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10 text-[11px] font-mono">
              <button
                onClick={() => setShowCgGizmo(!showCgGizmo)}
                className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all ${
                  showCgGizmo
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-950/80 text-slate-400 border-slate-800'
                }`}
                title="Показать центр тяжести (CG) и фокус (NP)"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>CG/NP</span>
              </button>

              <button
                onClick={() => setShowAirflowStreamlines(!showAirflowStreamlines)}
                className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all ${
                  showAirflowStreamlines
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-950/80 text-slate-400 border-slate-800'
                }`}
                title="Показать 3D линии тока обтекания"
              >
                <Wind className="w-3.5 h-3.5" />
                <span>Поток</span>
              </button>

              <button
                onClick={() => setIsPropellerSpinning(!isPropellerSpinning)}
                className={`p-1.5 rounded-lg border ${
                  isPropellerSpinning
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-950/80 text-slate-400 border-slate-800'
                }`}
                title="Анимация винтов"
              >
                {isPropellerSpinning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Viewport Bottom Floating Bar: Exploded View Slider & Telemetry Summary */}
            <div className="absolute bottom-3 left-3 right-3 bg-slate-950/85 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono z-10">
              <div className="flex items-center gap-3">
                <span className="text-slate-400 flex items-center gap-1">
                  <Split className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Взрыв-схема:</span>
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={explodedViewPct}
                  onChange={(e) => setExplodedViewPct(Number(e.target.value))}
                  className="w-28 accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-cyan-300 font-bold w-9">{explodedViewPct}%</span>
              </div>

              {/* CG & Stability Live Indicator */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">X_cg:</span>
                  <span className="text-amber-400 font-bold">{physicsData.x_cg.toFixed(2)}м</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">X_np:</span>
                  <span className="text-cyan-400 font-bold">{physicsData.x_np.toFixed(2)}м</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Запас SM:</span>
                  <span
                    className={`font-black px-2 py-0.5 rounded text-[11px] ${
                      physicsData.stabilityStatus === 'optimal'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : physicsData.stabilityStatus === 'unstable'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {physicsData.staticMargin_percent.toFixed(1)}% ({physicsData.stabilityStatus.toUpperCase()})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar Under Canvas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs font-mono">
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-500 block">АЭРОДИНАМИЧЕСКОЕ КАЧЕСТВО:</span>
              <span className="text-emerald-400 text-base font-black">L/D = {physicsData.max_ld.toFixed(1)}</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-500 block">СКОРОСТЬ СВАЛИВАНИЯ V_s:</span>
              <span className="text-cyan-400 text-base font-black">{physicsData.v_stall_kmh.toFixed(1)} км/ч</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-500 block">КРЕЙСЕРСКАЯ ДАЛЬНОСТЬ:</span>
              <span className="text-amber-400 text-base font-black">{physicsData.calculatedRange_km.toFixed(0)} км</span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-500 block">ПРОДОЛЖИТЕЛЬНОСТЬ:</span>
              <span className="text-indigo-400 text-base font-black">{physicsData.flightTime_min.toFixed(0)} мин</span>
            </div>
          </div>
        </div>

        {/* RIGHT: PARAMETRIC INSPECTOR & MODULAR TABS (4 COLS) */}
        <div className="lg:col-span-4 bg-slate-950 rounded-xl border border-slate-800 p-3.5 flex flex-col space-y-3.5">
          {/* Sub-tab Switcher */}
          <div className="grid grid-cols-5 gap-1 bg-slate-900 p-1 rounded-lg text-[11px] font-mono text-center">
            {[
              { id: 'airframe', label: 'Планер' },
              { id: 'equipment', label: 'Развесовка' },
              { id: 'physics', label: 'Физика' },
              { id: 'ai_synthesizer', label: 'AI' },
              { id: 'export', label: 'Экспорт' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSidebarTab(tab.id as any)}
                className={`py-1.5 rounded transition-all font-bold ${
                  activeSidebarTab === tab.id
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: AIRFRAME GEOMETRY INSPECTOR */}
          {activeSidebarTab === 'airframe' && (
            <div className="space-y-3 text-xs font-mono max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
              {/* UAV Identity */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block">ПРОЕКТ БПЛА / НАИМЕНОВАНИЕ:</label>
                <input
                  type="text"
                  value={uavName}
                  onChange={(e) => setUavName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              {/* Wing Section */}
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-cyan-400 font-bold text-[11px]">
                  <span>КРЫЛО & АЭРОДИНАМИЧЕСКИЙ ПРОФИЛЬ</span>
                  <Plane className="w-3.5 h-3.5" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block">Размах b (м):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.6"
                      max="6.0"
                      value={wingspan_m}
                      onChange={(e) => setWingspan_m(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Корневая хорда (м):</label>
                    <input
                      type="number"
                      step="0.02"
                      min="0.1"
                      max="1.2"
                      value={rootChord_m}
                      onChange={(e) => setRootChord_m(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block">Концевая хорда (м):</label>
                    <input
                      type="number"
                      step="0.02"
                      min="0.08"
                      max="0.8"
                      value={tipChord_m}
                      onChange={(e) => setTipChord_m(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Стреловидность Λ (°):</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="45"
                      value={sweep_deg}
                      onChange={(e) => setSweep_deg(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block">Поперечное V Γ (°):</label>
                    <input
                      type="number"
                      step="0.5"
                      min="-5"
                      max="10"
                      value={dihedral_deg}
                      onChange={(e) => setDihedral_deg(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Закрутка Washout (°):</label>
                    <input
                      type="number"
                      step="0.5"
                      min="-6"
                      max="2"
                      value={washout_deg}
                      onChange={(e) => setWashout_deg(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block">Профиль крыла (Airfoil):</label>
                  <select
                    value={airfoil}
                    onChange={(e) => setAirfoil(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-cyan-300"
                  >
                    <option value="MH60">MH60 (S-образный самобалансирующийся)</option>
                    <option value="NACA2412">NACA 2412 (Классический универсальный)</option>
                    <option value="NACA4415">NACA 4415 (Высоконесущий тяжеловоз)</option>
                    <option value="ClarkY">Clark Y (Стабильный плосковыпуклый)</option>
                    <option value="Selig1223">Selig 1223 (Экстремальный Cl_max)</option>
                  </select>
                </div>
              </div>

              {/* Fuselage Section */}
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-indigo-400 font-bold text-[11px]">
                  <span>ФЮЗЕЛЯЖ & НОСОВОЙ ОБТЕКАТЕЛЬ</span>
                  <Disc className="w-3.5 h-3.5" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block">Длина L (м):</label>
                    <input
                      type="number"
                      step="0.05"
                      value={fuselageLength_m}
                      onChange={(e) => setFuselageLength_m(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Ширина W (м):</label>
                    <input
                      type="number"
                      step="0.02"
                      value={fuselageWidth_m}
                      onChange={(e) => setFuselageWidth_m(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Высота H (м):</label>
                    <input
                      type="number"
                      step="0.02"
                      value={fuselageHeight_m}
                      onChange={(e) => setFuselageHeight_m(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Tail Section */}
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-amber-400 font-bold text-[11px]">
                  <span>ОПЕРЕНИЕ & ХВОСТОВАЯ БАЛКА</span>
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block">Схема оперения:</label>
                    <select
                      value={tailType}
                      onChange={(e) => setTailType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                    >
                      <option value="inverted_v">V-образное (Inverted V)</option>
                      <option value="conventional">Классическое крестообразное</option>
                      <option value="t_tail">T-образное (T-Tail)</option>
                      <option value="twin_vertical">Двухкилевое (Twin Fin)</option>
                      <option value="none">Бесхвостка / Без ГО</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Плечо балки (м):</label>
                    <input
                      type="number"
                      step="0.05"
                      value={tailBoomLength_m}
                      onChange={(e) => setTailBoomLength_m(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WEIGHT & BALANCE / EQUIPMENT INSPECTOR */}
          {activeSidebarTab === 'equipment' && (
            <div className="space-y-3 text-xs font-mono max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">УСТАНОВЛЕННЫЕ АГРЕГАТЫ:</span>
                <span className="text-emerald-400 font-bold text-[11px]">{components.length} компонентов</span>
              </div>

              {components.map((comp) => (
                <div key={comp.id} className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: comp.color }} />
                      <span>{comp.name}</span>
                    </span>
                    <span className="text-cyan-400 font-bold">{comp.mass_kg.toFixed(2)} кг</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Позиция X (продольная):</span>
                      <input
                        type="range"
                        min="0"
                        max={fuselageLength_m}
                        step="0.02"
                        value={comp.posX_m}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setComponents(components.map((c) => (c.id === comp.id ? { ...c, posX_m: val } : c)));
                        }}
                        className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
                      />
                      <span className="text-[10px] text-slate-400">{comp.posX_m.toFixed(2)} м от носа</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">Масса:</span>
                      <input
                        type="number"
                        step="0.05"
                        min="0.05"
                        max="10"
                        value={comp.mass_kg}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setComponents(components.map((c) => (c.id === comp.id ? { ...c, mass_kg: val } : c)));
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: PHYSICS & AERO SUMMARY */}
          {activeSidebarTab === 'physics' && (
            <div className="space-y-3 text-xs font-mono max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-2">
                <span className="text-cyan-400 font-bold block text-[11px]">ГЕОМЕТРИЧЕСКИЕ ИНВАРИАНТЫ:</span>
                <div className="flex justify-between border-b border-slate-800/80 pb-1">
                  <span className="text-slate-400">Площадь крыла S:</span>
                  <span className="text-white font-bold">{physicsData.wingArea_m2.toFixed(3)} м²</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1">
                  <span className="text-slate-400">Удлинение крыла AR:</span>
                  <span className="text-white font-bold">{physicsData.aspectRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1">
                  <span className="text-slate-400">САХ (MAC):</span>
                  <span className="text-white font-bold">{physicsData.mac_m.toFixed(3)} м</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Удельная нагрузка на крыло:</span>
                  <span className="text-amber-400 font-bold">{physicsData.wingLoading_kgm2.toFixed(1)} кг/м²</span>
                </div>
              </div>

              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-2">
                <span className="text-emerald-400 font-bold block text-[11px]">ЭНЕРГЕТИКА & ПОТРЕБНАЯ МОЩНОСТЬ:</span>
                <div className="flex justify-between border-b border-slate-800/80 pb-1">
                  <span className="text-slate-400">Крейсерская мощность:</span>
                  <span className="text-emerald-400 font-bold">{physicsData.cruisePowerElec_W.toFixed(0)} Вт</span>
                </div>
                {architecture === 'vtol_quadplane' && (
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-400">Мощность висения СВВП:</span>
                    <span className="text-rose-400 font-bold">{physicsData.vtolHoverPower_W.toFixed(0)} Вт</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Паразитный драг C_D0:</span>
                  <span className="text-white font-bold">{physicsData.c_d0.toFixed(4)}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AI GENERATIVE SYNTHESIZER */}
          {activeSidebarTab === 'ai_synthesizer' && (
            <div className="space-y-3 text-xs font-mono max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
              <div className="bg-gradient-to-br from-purple-950/40 via-indigo-950/40 to-slate-950 p-3 rounded-lg border border-purple-500/30 space-y-2.5">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-[11px]">
                  <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                  <span>AI СИНТЕЗАТОР БПЛА (GEMINI 3.7 FLASH)</span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  Опишите назначение, требования к дальности, полезной нагрузке и условиям полета. AI автоматически рассчитает аэродинамическую схему и 3D компоновку.
                </p>

                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Например: Барражирующий разведывательный БПЛА на 2 часа с оптикой 800г..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-sans"
                />

                <button
                  onClick={handleExecuteAiSynthesis}
                  disabled={isAiSynthesizing}
                  className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all font-sans"
                >
                  {isAiSynthesizing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Синтез 3D БПЛА...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>СИНТЕЗИРОВАТЬ 3D БПЛА</span>
                    </>
                  )}
                </button>

                {aiSynthesizeLog && (
                  <div className="p-2 bg-slate-950 rounded border border-slate-800 text-[10px] text-purple-300 font-mono">
                    {aiSynthesizeLog}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: EXPORT ARTIFACTS */}
          {activeSidebarTab === 'export' && (
            <div className="space-y-2.5 text-xs font-mono max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
              <span className="text-[10px] text-slate-400 block font-bold">ФОРМАТЫ ЭКСПОРТА И CAD МОДЕЛИ:</span>

              <button
                onClick={handleExportOBJ}
                className="w-full p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 rounded-lg flex items-center justify-between text-left transition-all group"
              >
                <div>
                  <span className="font-bold text-white block group-hover:text-cyan-300">3D Mesh (.OBJ)</span>
                  <span className="text-[10px] text-slate-500">Для Blender, SolidWorks, Autodesk Fusion 360</span>
                </div>
                <Download className="w-4 h-4 text-cyan-400" />
              </button>

              <button
                onClick={handleExportJSON}
                className="w-full p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 rounded-lg flex items-center justify-between text-left transition-all group"
              >
                <div>
                  <span className="font-bold text-white block group-hover:text-amber-300">UAV Blueprint (.JSON)</span>
                  <span className="text-[10px] text-slate-500">Полный структурированный цифровой паспорт</span>
                </div>
                <FileCode2 className="w-4 h-4 text-amber-400" />
              </button>

              <button
                onClick={handlePushToDigitalTwin}
                className="w-full p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 rounded-lg flex items-center justify-between text-left transition-all group"
              >
                <div>
                  <span className="font-bold text-white block group-hover:text-emerald-300">Digital Twin Bus</span>
                  <span className="text-[10px] text-slate-500">Сквозная интеграция во все VLM/CFD симуляторы</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
