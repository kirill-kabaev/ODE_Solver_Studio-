import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
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
  CheckSquare,
  Share2,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Download,
  CheckCircle2,
  AlertTriangle,
  Radio,
  ExternalLink,
  ArrowRight,
  Flame,
  Feather,
  Anchor,
  Navigation,
  FolderGit2,
  Printer,
  FileDown,
  Network,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { UAVMDOParetoOptimizer, ParetoCandidate } from './pipeline/UAVMDOParetoOptimizer';
import { UAVAirfoilPolarDatabase, AirfoilSpec, UAV_AIRFOIL_LIBRARY } from './pipeline/UAVAirfoilPolarDatabase';
import { UAVAirworthinessAuditPanel } from './pipeline/UAVAirworthinessAuditPanel';
import { UAVFlightEnvelopeDiagram } from './pipeline/UAVFlightEnvelopeDiagram';
import { UAVPropulsionBEMAnalyzer } from './pipeline/UAVPropulsionBEMAnalyzer';
import { UAVEWLinkBudgetCalculator } from './pipeline/UAVEWLinkBudgetCalculator';
import { UAVFlightDynamicsSimulationPanel } from './pipeline/UAVFlightDynamicsSimulationPanel';
import { UAVDigitalTwinHub, DigitalTwinBusState } from './pipeline/UAVDigitalTwinHub';
import { UAVEngineeringArtifactsExporter } from './pipeline/UAVEngineeringArtifactsExporter';
import { UAVHILMissionSimulator } from './pipeline/UAVHILMissionSimulator';

export type PipelineStageId =
  | 'stage1_concept'
  | 'stage2_aerodynamics'
  | 'stage3_mass_cg'
  | 'stage4_propulsion'
  | 'stage5_avionics_ew'
  | 'stage6_stealth_ops'
  | 'stage7_fabrication_bom';

export interface UAVArchetypePreset {
  id: string;
  name: string;
  category: string;
  scheme: 'flying_wing' | 'conventional' | 'vtol_quadplane' | 'twin_boom' | 'x_wing_munition' | 'tailsitter';
  description: string;
  wingspan_m: number;
  length_m: number;
  mtow_kg: number;
  payload_kg: number;
  targetRange_km: number;
  targetEndurance_min: number;
  cruiseSpeed_kmh: number;
  propulsionType: 'electric' | 'hybrid' | 'gasoline' | 'hydrogen';
  airfoil: string;
  batteryCells: number;
  batteryCap_mAh: number;
  motorKv: number;
  propDiameter_in: number;
  rcsTarget_m2: number;
}

const UAV_ARCHETYPES: UAVArchetypePreset[] = [
  {
    id: 'recon_wing_longrange',
    name: 'Дальний Разведчик «Око-Стратос»',
    category: 'Разведывательные БПЛА',
    scheme: 'flying_wing',
    description: 'Аэродинамическая схема «Летающее крыло» с высоким качеством L/D=19, композитный планер, низкая ЭПР и время полета до 4 часов.',
    wingspan_m: 2.4,
    length_m: 0.95,
    mtow_kg: 7.5,
    payload_kg: 1.5,
    targetRange_km: 180,
    targetEndurance_min: 240,
    cruiseSpeed_kmh: 75,
    propulsionType: 'electric',
    airfoil: 'MH60 (Reflexed Flying Wing)',
    batteryCells: 6,
    batteryCap_mAh: 26000,
    motorKv: 380,
    propDiameter_in: 14,
    rcsTarget_m2: 0.03,
  },
  {
    id: 'vtol_heavy_bomber',
    name: 'VTOL Тяжелый Бомбер «Грифон-V»',
    category: 'Ударно-транспортные БПЛА',
    scheme: 'vtol_quadplane',
    description: 'Гибридный QuadPlane с 4 подъемными электромоторами и 1 толкающим маршевым ДВС/электро. Безаэродромный вертикальный взлет/посадка.',
    wingspan_m: 3.2,
    length_m: 1.85,
    mtow_kg: 22.0,
    payload_kg: 6.0,
    targetRange_km: 120,
    targetEndurance_min: 90,
    cruiseSpeed_kmh: 95,
    propulsionType: 'hybrid',
    airfoil: 'Clark-Y / NACA 4412 Hybrid',
    batteryCells: 12,
    batteryCap_mAh: 32000,
    motorKv: 180,
    propDiameter_in: 22,
    rcsTarget_m2: 0.15,
  },
  {
    id: 'loitering_fpv_kamikaze',
    name: 'Барражирующий Боеприпас «Ланцет-Х»',
    category: 'FPV & Loitering Munitions',
    scheme: 'x_wing_munition',
    description: 'Двойное Х-образное крыло с высокой маневренностью на углах атаки до 30°, оптико-электронный автозахват и скорость пикирования до 220 км/ч.',
    wingspan_m: 1.6,
    length_m: 1.4,
    mtow_kg: 12.0,
    payload_kg: 3.5,
    targetRange_km: 65,
    targetEndurance_min: 45,
    cruiseSpeed_kmh: 110,
    propulsionType: 'electric',
    airfoil: 'NACA 0009 Symmetrical',
    batteryCells: 6,
    batteryCap_mAh: 16000,
    motorKv: 550,
    propDiameter_in: 12,
    rcsTarget_m2: 0.02,
  },
  {
    id: 'stealth_tailsitter_interceptor',
    name: 'Стелс-Тейлситтер «Коршун-С»',
    category: 'Перехватчики & ПВО',
    scheme: 'tailsitter',
    description: 'Вертикальный взлет на хвосте, обдув элевонов струей соосных винтов, переход в скоростной горизонтальный полет до 180 км/ч.',
    wingspan_m: 1.8,
    length_m: 1.2,
    mtow_kg: 8.2,
    payload_kg: 1.8,
    targetRange_km: 90,
    targetEndurance_min: 60,
    cruiseSpeed_kmh: 135,
    propulsionType: 'electric',
    airfoil: 'NACA 64A010 Laminar',
    batteryCells: 6,
    batteryCap_mAh: 18000,
    motorKv: 620,
    propDiameter_in: 11,
    rcsTarget_m2: 0.008,
  },
];

interface ConnectedModuleInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  badge: string;
  color: string;
}

const PIPELINE_CONNECTED_MODULES: Record<PipelineStageId, ConnectedModuleInfo[]> = {
  stage1_concept: [
    {
      id: 'uav_ai_constructor',
      name: 'AI Конструктор БПЛА (MDO & Синтез)',
      category: 'Синтез ТТЗ',
      description: 'Многокритериальная оптимизация геометрии, масс и аэродинамических качеств по ТТЗ.',
      badge: '#MDO-Core',
      color: 'teal',
    },
    {
      id: 'uav_studio',
      name: 'Параметрическая Студия Дронов',
      category: 'Аналитика',
      description: 'Экспресс-расчет аэродинамической компоновки и летных ограничений.',
      badge: '#AeroBase',
      color: 'sky',
    },
    {
      id: 'uav_ai_generative_design',
      name: 'AI Оптимизация & PINN Нейро-CFD',
      category: 'AI-CFD',
      description: 'Генеративный синтез формы фюзеляжа и крыла на основе нейросетей PINN.',
      badge: '#PINN-CFD',
      color: 'indigo',
    },
  ],
  stage2_aerodynamics: [
    {
      id: 'wing_fea_structural',
      name: '1D/2D МКЭ Прочность Лонжерона',
      category: 'Конструкция',
      description: 'Расчет изгибающих моментов, деформаций и запасов прочности силового набора.',
      badge: '#FEA-Spar',
      color: 'purple',
    },
    {
      id: 'uav_spar_fea',
      name: 'Параметрический FEA Расчет Лонжерона',
      category: 'Прочность',
      description: 'Анализ устойчивости стенки лонжерона и критических нагрузок флаттера.',
      badge: '#Buckling',
      color: 'indigo',
    },
    {
      id: 'uav_hlfc_suction',
      name: 'Ламинаризация Крыла (HLFC Отсос)',
      category: 'Аэродинамика',
      description: 'Снижение профильного сопротивления на 35% за счет перфорированного отсоса ПС.',
      badge: '#HLFC-Laminar',
      color: 'cyan',
    },
    {
      id: 'uav_plasma_actuator_flow',
      name: 'Плазменные Актуаторы Управления Срывом',
      category: 'Активное Управление',
      description: 'Диэлектрический барьерный разряд (DBD) для затягивания срыва на больших углах атаки.',
      badge: '#Plasma-Flow',
      color: 'pink',
    },
  ],
  stage3_mass_cg: [
    {
      id: 'uav_battery_bms',
      name: 'Тепловой Режим АКБ & Smart BMS',
      category: 'Массы & Тепло',
      description: 'Размещение аккумуляторов в фюзеляже с учетом теплоотвода и токоотдачи.',
      badge: '#BMS-Thermal',
      color: 'amber',
    },
    {
      id: 'uav_munition_bay',
      name: 'Отсек Полезной Нагрузки & Сброс',
      category: 'Компоновка',
      description: 'Аэродинамика раскрытия створок и сохранение центровки при отделении груза.',
      badge: '#Payload-Bay',
      color: 'rose',
    },
    {
      id: 'uav_fiber_optic',
      name: 'Катушка Оптоволокна FPV',
      category: 'Спецнагрузка',
      description: 'Динамика разматывания микрокабеля до 20 км и смещение центра масс.',
      badge: '#Tether-Optic',
      color: 'emerald',
    },
  ],
  stage4_propulsion: [
    {
      id: 'uav_toroidal_aeroacoustics',
      name: 'Тороидальные Винты & Акустика',
      category: 'ВМГ',
      description: 'Замкнутые законцовки лопастей: сниженный уровень шума на 8 дБА и КПД +14%.',
      badge: '#Toroidal-Prop',
      color: 'sky',
    },
    {
      id: 'uav_ducted_fan_thrust_vector',
      name: 'Коаксиальный Импеллер & Вектор Тяги',
      category: 'Тяга',
      description: 'Импеллерные кольцевые движители с управляемым вектором тяги для БПЛА.',
      badge: '#Ducted-Fan',
      color: 'teal',
    },
    {
      id: 'uav_hydrogen_cryo_fuelcell',
      name: 'Водородные Топливные Элементы',
      category: 'Энергетика',
      description: 'Криогенный $LH_2$ и мембранные ТЭ (PEMFC) для рекорда продолжительности полета.',
      badge: '#H2-CryoCell',
      color: 'blue',
    },
    {
      id: 'uav_solar_haps',
      name: 'Солнечный Атмосферный Спутник HAPS',
      category: 'Псевдоспутники',
      description: 'Суточный энергобаланс: солнечные панели GaAs и беспосадочный полет месяцами.',
      badge: '#HAPS-Solar',
      color: 'amber',
    },
  ],
  stage5_avionics_ew: [
    {
      id: 'uav_autopilot_pid',
      name: 'Синтез Автопилота & PID/LQR Студия',
      category: 'САУ',
      description: 'Настройка контуров крена, тангажа, рыскания и высоты для PX4/ArduPilot.',
      badge: '#PID-Tuning',
      color: 'emerald',
    },
    {
      id: 'uav_ew_nav',
      name: 'Навигация в Условиях РЭБ & Спуфинга',
      category: 'РЭБ-Защита',
      description: 'Комплексирование ИНС + CRPA антенны + VIO для полетов без спутникового сигнала GNSS.',
      badge: '#CRPA-AntiJam',
      color: 'purple',
    },
    {
      id: 'uav_vision_georeg',
      name: 'Визуальная Геопривязка без GPS',
      category: 'Навигация VIO',
      description: 'Сопоставление спутниковой карты высот со снимками курсовой камеры дрона.',
      badge: '#GeoReg-VIO',
      color: 'cyan',
    },
    {
      id: 'uav_dsmac_tercom',
      name: 'DSMAC & TERCOM Экстремальная Коррекция',
      category: 'Корреляционная Нав.',
      description: 'Коррекция траектории по рельефу местности и оптическим контрастным ориентирам.',
      badge: '#DSMAC-Map',
      color: 'blue',
    },
    {
      id: 'uav_quantum_gravimetric_nav',
      name: 'Квантовая Гравиметрическая Навигация',
      category: 'Quantum-Nav',
      description: 'Абсолютная автономная навигация по аномалиям гравитационного поля Земли.',
      badge: '#Quantum-Grav',
      color: 'rose',
    },
    {
      id: 'uav_emc_antenna',
      name: 'Электромагнитная Совместимость Антенн',
      category: 'Бортовой ЭМС',
      description: 'Устранение взаимных наводок передатчиков видео, телеметрии и GPS-приемников.',
      badge: '#EMC-CoSite',
      color: 'amber',
    },
  ],
  stage6_stealth_ops: [
    {
      id: 'uav_stealth_rcs_studio',
      name: 'Стелс-Оптимизация ЭПР & Радиопоглощение (RAM)',
      category: 'Малозаметность',
      description: 'Расчет диаграмм ЭПР в диапазонах X/S/Ku, подбор поглощающих покрытий и скосов кромок.',
      badge: '#Stealth-RCS',
      color: 'indigo',
    },
    {
      id: 'uav_acoustic_df_array',
      name: 'Акустическая Пеленгация TDOA Beamforming',
      category: 'Пассивная Локация',
      description: 'Обнаружение выстрелов и наземных целей по микрофонной решетке на борту БПЛА.',
      badge: '#Acoustic-DF',
      color: 'teal',
    },
    {
      id: 'uav_swarm_co_slam',
      name: 'Децентрализованный Co-SLAM Роя в Зоне РЭБ',
      category: 'Роевой ИИ',
      description: 'Совместное 3D-картирование зданий и поиск целей группой автономных дронов.',
      badge: '#Co-SLAM-Swarm',
      color: 'sky',
    },
    {
      id: 'uav_catapult_launcher',
      name: 'Пневмокатапульта & Динамика Старта',
      category: 'Старт & Запуск',
      description: 'Расчет перегрузок ускорения $n_x$ и длины направляющей рельсы катапульты.',
      badge: '#Catapult',
      color: 'orange',
    },
    {
      id: 'uav_parachute_recovery',
      name: 'Баллистический Парашют Спасения',
      category: 'Посадка',
      description: 'Пиропатрон выброса купола, расчет скорости снижения $V_{\\text{sink}}$ и амортизации.',
      badge: '#Parachute',
      color: 'rose',
    },
  ],
  stage7_fabrication_bom: [
    {
      id: 'uav_cad_mesh_dxf',
      name: 'CAD/CFD Сетка & DXF Раскрой ЧПУ',
      category: 'CAD / ЧПУ',
      description: 'Генерация 3D твердотельной геометрии и развертка нервюр/шпангоутов под лазерный раскрой.',
      badge: '#CAD-DXF-CNC',
      color: 'cyan',
    },
    {
      id: 'uav_hil_sil_autopilot',
      name: 'HIL/SIL Стенд & MAVLink v2 Симуляция',
      category: 'Верификация',
      description: 'Аппаратно-программная верификация автопилота с реальным контроллером в контуре.',
      badge: '#HIL-SIL-Bench',
      color: 'emerald',
    },
    {
      id: 'uav_automated_report_bom',
      name: 'Отчеты Летной Годности & BOM Спецификация',
      category: 'PLM / Документация',
      description: 'Генерация инженерного паспорта БПЛА, ведомости покупных изделий и калькуляции стоимости.',
      badge: '#BOM-PLM-Doc',
      color: 'amber',
    },
  ],
};

interface Props {
  onNavigateToModule?: (moduleId: string) => void;
}

export const UAVUnifiedMasterEngineeringPipelineModule: React.FC<Props> = ({ onNavigateToModule }) => {
  // Current active stage
  const [activeStage, setActiveStage] = useState<PipelineStageId>('stage1_concept');

  // Selected Drone Project / Digital Twin Configuration
  const [selectedArchetypeId, setSelectedArchetypeId] = useState<string>('recon_wing_longrange');
  const [projectName, setProjectName] = useState<string>('БПЛА «Око-Стратос» Mk-IV');
  const [selectedAirfoilId, setSelectedAirfoilId] = useState<string>('mh60');

  // Core Digital Twin State (shared variables across all pipeline steps)
  const [wingspan_m, setWingspanM] = useState<number>(2.4);
  const [chordRoot_m, setChordRootM] = useState<number>(0.45);
  const [chordTip_m, setChordTipM] = useState<number>(0.22);
  const [sweep_deg, setSweepDeg] = useState<number>(18);
  const [dihedral_deg, setDihedralDeg] = useState<number>(2.5);

  const [mtow_kg, setMtowKg] = useState<number>(7.5);
  const [payload_kg, setPayloadKg] = useState<number>(1.5);
  const [batteryMass_kg, setBatteryMassKg] = useState<number>(2.4);
  const [avionicsMass_kg, setAvionicsMassKg] = useState<number>(0.65);
  const [structuralMass_kg, setStructuralMassKg] = useState<number>(2.95);

  // Component Positions X along fuselage (from nose x=0 to tail)
  const [payloadX_m, setPayloadXM] = useState<number>(0.15);
  const [batteryX_m, setBatteryXM] = useState<number>(0.38);
  const [avionicsX_m, setAvionicsXM] = useState<number>(0.52);
  const [motorX_m, setMotorXM] = useState<number>(0.85);

  // Propulsion settings
  const [batteryCells, setBatteryCells] = useState<number>(6);
  const [batteryCap_mAh, setBatteryCapMah] = useState<number>(26000);
  const [motorKv, setMotorKv] = useState<number>(380);
  const [propDiameter_in, setPropDiameterIn] = useState<number>(14);
  const [propPitch_in, setPropPitchIn] = useState<number>(8);

  // Target flight requirements
  const [targetRange_km, setTargetRangeKm] = useState<number>(180);
  const [targetEndurance_min, setTargetEnduranceMin] = useState<number>(240);
  const [cruiseSpeed_kmh, setCruiseSpeedKmh] = useState<number>(75);

  // Simulation & 3D Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const rotationAngleRef = useRef<number>(0);

  const selectedAirfoil = useMemo(() => {
    return UAV_AIRFOIL_LIBRARY.find((a) => a.id === selectedAirfoilId) || UAV_AIRFOIL_LIBRARY[0];
  }, [selectedAirfoilId]);

  // Apply Pareto optimal candidate to Digital Twin
  const handleApplyParetoCandidate = (candidate: ParetoCandidate) => {
    setWingspanM(candidate.wingspan_m);
    setChordRootM(candidate.chordRoot_m);
    setChordTipM(candidate.chordTip_m);
    setSweepDeg(candidate.sweep_deg);
    setBatteryCapMah(candidate.batteryCap_mAh);
    setBatteryMassKg((candidate.batteryCap_mAh / 1000) * 0.085);
    const wingArea = candidate.wingspan_m * ((candidate.chordRoot_m + candidate.chordTip_m) / 2);
    setStructuralMassKg(1.1 + wingArea * 1.6 + candidate.wingspan_m * 0.4);
  };

  // Apply archetype preset
  const handleSelectArchetype = (archId: string) => {
    const arch = UAV_ARCHETYPES.find((a) => a.id === archId);
    if (!arch) return;
    setSelectedArchetypeId(archId);
    setProjectName(arch.name);
    setWingspanM(arch.wingspan_m);
    setMtowKg(arch.mtow_kg);
    setPayloadKg(arch.payload_kg);
    setTargetRangeKm(arch.targetRange_km);
    setTargetEnduranceMin(arch.targetEndurance_min);
    setCruiseSpeedKmh(arch.cruiseSpeed_kmh);
    setBatteryCells(arch.batteryCells);
    setBatteryCapMah(arch.batteryCap_mAh);
    setMotorKv(arch.motorKv);
    setPropDiameterIn(arch.propDiameter_in);

    // derive chords and masses
    if (arch.scheme === 'flying_wing') {
      setSelectedAirfoilId('mh60');
      setChordRootM(0.48);
      setChordTipM(0.20);
      setSweepDeg(20);
      setBatteryMassKg(arch.mtow_kg * 0.35);
      setStructuralMassKg(arch.mtow_kg * 0.38);
    } else if (arch.scheme === 'vtol_quadplane') {
      setSelectedAirfoilId('selig_s1223');
      setChordRootM(0.38);
      setChordTipM(0.26);
      setSweepDeg(4);
      setBatteryMassKg(arch.mtow_kg * 0.40);
      setStructuralMassKg(arch.mtow_kg * 0.35);
    } else {
      setSelectedAirfoilId('clark_y');
      setChordRootM(0.32);
      setChordTipM(0.22);
      setSweepDeg(10);
      setBatteryMassKg(arch.mtow_kg * 0.32);
      setStructuralMassKg(arch.mtow_kg * 0.38);
    }
  };

  // Aerodynamic & Flight Physics Calculations (The Central Digital Twin Engine)
  const digitalTwinMetrics = useMemo(() => {
    // Wing geometry
    const wingArea_m2 = wingspan_m * ((chordRoot_m + chordTip_m) / 2);
    const aspectRatio = Math.pow(wingspan_m, 2) / Math.max(0.01, wingArea_m2);
    const taperRatio = chordTip_m / Math.max(0.01, chordRoot_m);
    const mac_m = (2 / 3) * chordRoot_m * ((1 + taperRatio + taperRatio * taperRatio) / (1 + taperRatio)); // Mean Aerodynamic Chord

    // Center of Gravity (CG) Calculation
    const totalMass = payload_kg + batteryMass_kg + avionicsMass_kg + structuralMass_kg;
    const structureX_m = 0.45; // average structural center
    const momentSum =
      payload_kg * payloadX_m +
      batteryMass_kg * batteryX_m +
      avionicsMass_kg * avionicsX_m +
      structuralMass_kg * structureX_m;
    const x_cg_m = momentSum / Math.max(0.01, totalMass);

    // Aerodynamic Center (Neutral Point) Approximation
    // For swept wing: Neutral point x_np ≈ 0.25*MAC + 0.5*b/2*tan(sweep)
    const sweepRad = (sweep_deg * Math.PI) / 180;
    const x_ac_root = 0.25 * chordRoot_m;
    const x_np_m = x_ac_root + (wingspan_m / 6) * Math.tan(sweepRad) + 0.05;

    // Static Margin (SM)
    const staticMargin_percent = ((x_np_m - x_cg_m) / Math.max(0.01, mac_m)) * 100;
    const isStable = staticMargin_percent >= 5.0 && staticMargin_percent <= 18.0;

    // Aerodynamics (Polar & Lift/Drag)
    const V_cruise_ms = cruiseSpeed_kmh / 3.6;
    const rho = 1.225; // kg/m^3
    const q_dyn = 0.5 * rho * Math.pow(V_cruise_ms, 2);
    const weight_N = totalMass * 9.80665;
    const C_L_cruise = weight_N / Math.max(1, q_dyn * wingArea_m2);

    // Drag: Cd = Cd0 + Cl^2 / (pi * AR * e)
    const e_oswald = 0.82;
    const Cd0 = selectedAirfoil.cd0; // calibrated from airfoil DB
    const C_Di = Math.pow(C_L_cruise, 2) / (Math.PI * aspectRatio * e_oswald);
    const Cd_total = Cd0 + C_Di;
    const liftToDragRatio = C_L_cruise / Math.max(0.001, Cd_total);

    // Stall Speed
    const Cl_max = selectedAirfoil.cl_max;
    const V_stall_ms = Math.sqrt((2 * weight_N) / (rho * wingArea_m2 * Cl_max));
    const V_stall_kmh = V_stall_ms * 3.6;

    // Power & Energy
    const Drag_N = Cd_total * q_dyn * wingArea_m2;
    const thrustRequired_N = Drag_N;
    const aeroPower_W = Drag_N * V_cruise_ms;
    const propEfficiency = 0.78;
    const motorEfficiency = 0.88;
    const escEfficiency = 0.95;
    const totalPowertrainEff = propEfficiency * motorEfficiency * escEfficiency;
    const electricalPowerCruise_W = aeroPower_W / Math.max(0.1, totalPowertrainEff) + 25; // +25W onboard avionics & payload

    // Battery Energy & Endurance
    const nominalVoltage = batteryCells * 3.7;
    const batteryEnergy_Wh = (batteryCap_mAh / 1000) * nominalVoltage;
    const usableEnergy_Wh = batteryEnergy_Wh * 0.82; // 80% DoD safety margin
    const calculatedEndurance_hours = usableEnergy_Wh / Math.max(10, electricalPowerCruise_W);
    const calculatedEndurance_min = calculatedEndurance_hours * 60;
    const calculatedRange_km = calculatedEndurance_hours * cruiseSpeed_kmh;

    // Max Thrust Estimation from Propeller
    // Thrust_max_N ≈ 0.5 * rho * pi/4 * D^2 * (V_pitch^2 - V^2)
    const D_prop_m = (propDiameter_in * 25.4) / 1000;
    const maxRpm = (motorKv * nominalVoltage * 0.85);
    const maxStaticThrust_N = 0.00000004392 * Math.pow(maxRpm, 2) * Math.pow(propDiameter_in, 3.5) / Math.sqrt(propPitch_in);
    const thrustToWeightRatio = maxStaticThrust_N / Math.max(1, weight_N);

    // Radar Cross Section & Stealth Estimate
    const baseRcs = (wingArea_m2 * 0.05) * Math.cos(sweepRad);
    const rcs_dBsm = 10 * Math.log10(Math.max(1e-4, baseRcs));

    return {
      wingArea_m2,
      aspectRatio,
      taperRatio,
      mac_m,
      totalMass,
      x_cg_m,
      x_np_m,
      staticMargin_percent,
      isStable,
      weight_N,
      C_L_cruise,
      Cd_total,
      liftToDragRatio,
      V_stall_kmh,
      thrustRequired_N,
      electricalPowerCruise_W,
      batteryEnergy_Wh,
      calculatedEndurance_min,
      calculatedRange_km,
      maxStaticThrust_N,
      thrustToWeightRatio,
      baseRcs,
      rcs_dBsm,
    };
  }, [
    wingspan_m,
    chordRoot_m,
    chordTip_m,
    sweep_deg,
    payload_kg,
    batteryMass_kg,
    avionicsMass_kg,
    structuralMass_kg,
    payloadX_m,
    batteryX_m,
    avionicsX_m,
    cruiseSpeed_kmh,
    batteryCells,
    batteryCap_mAh,
    motorKv,
    propDiameter_in,
    propPitch_in,
    selectedAirfoil,
  ]);

  // Radar chart performance comparison data
  const radarData = useMemo(() => {
    return [
      {
        subject: 'Аэрод. Качество L/D',
        value: Math.min(100, (digitalTwinMetrics.liftToDragRatio / 22) * 100),
        fullMark: 100,
      },
      {
        subject: 'Дальность полета',
        value: Math.min(100, (digitalTwinMetrics.calculatedRange_km / Math.max(1, targetRange_km)) * 100),
        fullMark: 100,
      },
      {
        subject: 'Время в воздухе',
        value: Math.min(100, (digitalTwinMetrics.calculatedEndurance_min / Math.max(1, targetEndurance_min)) * 100),
        fullMark: 100,
      },
      {
        subject: 'Тяговооруженность T/W',
        value: Math.min(100, (digitalTwinMetrics.thrustToWeightRatio / 1.5) * 100),
        fullMark: 100,
      },
      {
        subject: 'Устойчивость SM',
        value: digitalTwinMetrics.isStable ? 95 : 30,
        fullMark: 100,
      },
      {
        subject: 'Малозаметность (ЭПР)',
        value: Math.max(20, Math.min(100, 100 - digitalTwinMetrics.baseRcs * 300)),
        fullMark: 100,
      },
    ];
  }, [digitalTwinMetrics, targetRange_km, targetEndurance_min]);

  // Polar Curve Data
  const polarCurveData = useMemo(() => {
    const data = [];
    for (let alpha = -2; alpha <= 14; alpha += 1) {
      const cl = 0.25 + 0.095 * alpha;
      const cd = 0.022 + Math.pow(cl, 2) / (Math.PI * digitalTwinMetrics.aspectRatio * 0.82);
      const ld = cl / Math.max(0.001, cd);
      data.push({
        alpha_deg: alpha,
        C_L: Number(cl.toFixed(3)),
        C_D: Number(cd.toFixed(4)),
        LD_ratio: Number(ld.toFixed(1)),
      });
    }
    return data;
  }, [digitalTwinMetrics.aspectRatio]);

  // Interactive 3D/2D Canvas Airframe & Balance Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      if (isRotating) {
        rotationAngleRef.current += 0.01;
      }
      const rot = rotationAngleRef.current;

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      // Dark background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      // Grid background
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(cx, cy + 20);

      // Scale factor (pixels per meter)
      const scale = Math.min(w / (wingspan_m * 1.3), h / 1.6);

      // Draw Wing Planform (Swept wing / Flying Wing)
      const rootChordPx = chordRoot_m * scale;
      const tipChordPx = chordTip_m * scale;
      const semiSpanPx = (wingspan_m / 2) * scale;
      const sweepOffsetPx = Math.tan((sweep_deg * Math.PI) / 180) * semiSpanPx;

      // Wing fill & gradient
      const wingGrad = ctx.createLinearGradient(0, -rootChordPx / 2, 0, rootChordPx / 2);
      wingGrad.addColorStop(0, '#0284c7');
      wingGrad.addColorStop(0.5, '#0369a1');
      wingGrad.addColorStop(1, '#075985');

      ctx.fillStyle = wingGrad;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;

      // Left & Right Wings
      ctx.beginPath();
      // Nose / Root leading edge
      ctx.moveTo(0, -rootChordPx * 0.4);
      // Right wing tip leading edge
      ctx.lineTo(semiSpanPx, -rootChordPx * 0.4 + sweepOffsetPx);
      // Right wing tip trailing edge
      ctx.lineTo(semiSpanPx, -rootChordPx * 0.4 + sweepOffsetPx + tipChordPx);
      // Root trailing edge
      ctx.lineTo(0, rootChordPx * 0.6);
      // Left wing tip trailing edge
      ctx.lineTo(-semiSpanPx, -rootChordPx * 0.4 + sweepOffsetPx + tipChordPx);
      // Left wing tip leading edge
      ctx.lineTo(-semiSpanPx, -rootChordPx * 0.4 + sweepOffsetPx);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wing Ribs / Structural Spars
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.setLineDash([4, 4]);
      // Main Spar at 25% chord
      ctx.beginPath();
      ctx.moveTo(-semiSpanPx, -rootChordPx * 0.4 + sweepOffsetPx + tipChordPx * 0.25);
      ctx.lineTo(0, -rootChordPx * 0.4 + rootChordPx * 0.25);
      ctx.lineTo(semiSpanPx, -rootChordPx * 0.4 + sweepOffsetPx + tipChordPx * 0.25);
      ctx.stroke();
      ctx.setLineDash([]);

      // Fuselage Pod
      const fuseLengthPx = rootChordPx * 1.15;
      const fuseWidthPx = 48;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, fuseWidthPx / 2, fuseLengthPx / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Component Bays inside Fuselage
      // 1. Payload (Camera/Gimbal) - Green
      const pY = -fuseLengthPx * 0.35;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(0, pY, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ПН', 0, pY + 3);

      // 2. Battery Bay - Amber
      const bY = -fuseLengthPx * 0.05;
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-16, bY - 20, 32, 40);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('АКБ', 0, bY + 3);

      // 3. Autopilot & Avionics - Purple
      const aY = fuseLengthPx * 0.22;
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(-12, aY - 10, 24, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('PX4', 0, aY + 3);

      // 4. Motor & Propeller at tail
      const mY = fuseLengthPx * 0.52;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-8, mY - 6, 16, 12);
      // Propeller disk
      const propRadiusPx = (propDiameter_in * 2.54 * scale) / 100;
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, mY + 6, propRadiusPx, 6, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Center of Gravity (CG) Marker - Black & Yellow Target
      const cgY = -fuseLengthPx * 0.5 + digitalTwinMetrics.x_cg_m * scale;
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(0, cgY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, cgY);
      ctx.lineTo(10, cgY);
      ctx.moveTo(0, cgY - 10);
      ctx.lineTo(0, cgY + 10);
      ctx.stroke();

      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`CG: ${(digitalTwinMetrics.x_cg_m * 1000).toFixed(0)} мм`, 14, cgY + 3);

      // Neutral Point (NP) / Aerodynamic Focus Marker - Cyan
      const npY = -fuseLengthPx * 0.5 + digitalTwinMetrics.x_np_m * scale;
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(0, npY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#06b6d4';
      ctx.fillText(`Фокус NP: ${(digitalTwinMetrics.x_np_m * 1000).toFixed(0)} мм`, 14, npY + 3);

      // Static Margin Span Bar
      ctx.strokeStyle = digitalTwinMetrics.isStable ? '#10b981' : '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-28, cgY);
      ctx.lineTo(-28, npY);
      ctx.stroke();
      ctx.fillStyle = digitalTwinMetrics.isStable ? '#10b981' : '#ef4444';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`SM: ${digitalTwinMetrics.staticMargin_percent.toFixed(1)}%`, -32, (cgY + npY) / 2 + 3);

      ctx.restore();

      // Top HUD Overlay
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.fillRect(15, 15, 260, 85);
      ctx.strokeStyle = '#38bdf8';
      ctx.strokeRect(15, 15, 260, 85);

      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'left';
      ctx.fillText('UAV DIGITAL TWIN CAD OVERVIEW', 25, 32);
      ctx.font = '10px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Размах b: ${wingspan_m.toFixed(2)} м | Площадь: ${digitalTwinMetrics.wingArea_m2.toFixed(2)} м²`, 25, 48);
      ctx.fillText(`MTOW: ${digitalTwinMetrics.totalMass.toFixed(2)} кг | L/D: ${digitalTwinMetrics.liftToDragRatio.toFixed(1)}`, 25, 64);
      ctx.fillText(`Стат. Устойчивость: ${digitalTwinMetrics.isStable ? 'УСТОЙЧИВ (OK)' : 'НЕУСТОЙЧИВ (CRITICAL)'}`, 25, 80);

      if (isRotating) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [
    isRotating,
    wingspan_m,
    chordRoot_m,
    chordTip_m,
    sweep_deg,
    digitalTwinMetrics,
    payload_kg,
    batteryMass_kg,
    propDiameter_in,
  ]);

  // Stage Navigation Info
  const STAGES_LIST: { id: PipelineStageId; num: string; title: string; subtitle: string; icon: any }[] = [
    {
      id: 'stage1_concept',
      num: '1',
      title: 'ТТЗ & Синтез Схемы',
      subtitle: 'Миссия, дальность, полезная нагрузка и архитектура',
      icon: TargetIconWrapper,
    },
    {
      id: 'stage2_aerodynamics',
      num: '2',
      title: 'Аэродинамика & Крыло',
      subtitle: 'Профили, VLM/CFD, поляры и прочность лонжерона',
      icon: Wind,
    },
    {
      id: 'stage3_mass_cg',
      num: '3',
      title: 'Массы & Центровка (CG)',
      subtitle: 'Балансировка отсеков, запас устойчивости SM',
      icon: Scale,
    },
    {
      id: 'stage4_propulsion',
      num: '4',
      title: 'ВМГ & Энергетика',
      subtitle: 'Мотор, винт, АКБ/BMS, располагаемая тяга',
      icon: Zap,
    },
    {
      id: 'stage5_avionics_ew',
      num: '5',
      title: 'Авионика, САУ & РЭБ',
      subtitle: 'PX4/PID, GNSS-Denied VIO/DSMAC, CRPA антенны',
      icon: Cpu,
    },
    {
      id: 'stage6_stealth_ops',
      num: '6',
      title: 'Стелс, ЭПР & Старт/Посадка',
      subtitle: 'ЭПР диаграммы, акустика, катапульта/парашют',
      icon: Shield,
    },
    {
      id: 'stage7_fabrication_bom',
      num: '7',
      title: 'Производство (CAD/DXF & BOM)',
      subtitle: 'DXF ЧПУ раскрой, BOM спецификация, экспорт',
      icon: FileCode2,
    },
  ];

  function TargetIconWrapper(props: any) {
    return <Compass {...props} />;
  }

  // Master Digital Twin Bus State Assembly
  const digitalTwinBusState: DigitalTwinBusState = useMemo(() => {
    const rho = 1.225;
    const v_s1_ms = Math.sqrt((2 * digitalTwinMetrics.totalMass * 9.81) / (rho * digitalTwinMetrics.wingArea_m2 * selectedAirfoil.cl_max));
    const v_a_kmh = v_s1_ms * Math.sqrt(3.8) * 3.6;
    const v_dive_kmh = cruiseSpeed_kmh * 1.55;
    const v_flutter_kmh = v_dive_kmh * 1.25;

    const nominalVoltage = batteryCells * 3.7;
    const cruiseCurrent_A = digitalTwinMetrics.electricalPowerCruise_W / Math.max(1, nominalVoltage);

    const rfFrequency_MHz = 868;
    const txPower_W = 1.0;
    const h_tx = 15;
    const h_rx = 500;
    const radioHorizon_km = 3.57 * (Math.sqrt(h_tx) + Math.sqrt(h_rx));
    const ewJammingSafeRange_km = 12.5;

    return {
      wingspan_m,
      chordRoot_m,
      chordTip_m,
      sweep_deg,
      wingArea_m2: digitalTwinMetrics.wingArea_m2,
      aspectRatio: digitalTwinMetrics.aspectRatio,
      taperRatio: digitalTwinMetrics.taperRatio,
      mac_m: digitalTwinMetrics.mac_m,
      payload_kg,
      batteryMass_kg,
      avionicsMass_kg,
      structuralMass_kg,
      totalMass_kg: digitalTwinMetrics.totalMass,
      x_cg_m: digitalTwinMetrics.x_cg_m,
      x_np_m: digitalTwinMetrics.x_np_m,
      staticMargin_percent: digitalTwinMetrics.staticMargin_percent,
      isStable: digitalTwinMetrics.isStable,
      airfoil: selectedAirfoil,
      cl_cruise: digitalTwinMetrics.C_L_cruise,
      cd_total: digitalTwinMetrics.Cd_total,
      liftToDragRatio: digitalTwinMetrics.liftToDragRatio,
      v_stall_kmh: digitalTwinMetrics.V_stall_kmh,
      thrustRequired_N: digitalTwinMetrics.thrustRequired_N,
      batteryCells,
      batteryCap_mAh,
      motorKv,
      propDiameter_in,
      propPitch_in,
      cruiseSpeed_kmh,
      cruiseCurrent_A,
      flightTime_min: digitalTwinMetrics.calculatedEndurance_min,
      calculatedRange_km: digitalTwinMetrics.calculatedRange_km,
      maxG_limit: 3.8,
      v_a_kmh,
      v_dive_kmh,
      v_flutter_kmh,
      rfFrequency_MHz,
      txPower_W,
      radioHorizon_km,
      ewJammingSafeRange_km,
    };
  }, [
    wingspan_m,
    chordRoot_m,
    chordTip_m,
    sweep_deg,
    digitalTwinMetrics,
    selectedAirfoil,
    payload_kg,
    batteryMass_kg,
    avionicsMass_kg,
    structuralMass_kg,
    batteryCells,
    batteryCap_mAh,
    motorKv,
    propDiameter_in,
    propPitch_in,
    cruiseSpeed_kmh,
  ]);

  return (
    <div className="w-full bg-slate-950 text-slate-100 rounded-3xl border border-teal-500/40 p-4 md:p-6 shadow-2xl font-sans space-y-6">
      {/* Top Banner: Master System Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-teal-900/50 pb-5 bg-gradient-to-r from-teal-950/40 via-slate-900/60 to-cyan-950/40 p-4 rounded-2xl border">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500/20 via-cyan-500/20 to-emerald-500/20 border border-teal-500/50 text-teal-400 shadow-inner">
            <Sparkles className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-teal-950 border border-teal-500/60 text-teal-300">
                MASTER UAV PLM PIPELINE
              </span>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight font-mono">
                Единая Сквозная САПР/PLM Система Проектирования БПЛА
              </h1>
            </div>
            <p className="text-xs text-slate-300 mt-1 font-sans">
              Инженерная интеграционная среда: сквозной цикл от ТТЗ и MDO-синтеза до VLM-аэродинамики, балансировки CG, силовой установки, авионики, РЭБ-устойчивости, CAD/DXF раскроя и ведомости BOM.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] uppercase font-mono text-slate-400">Проект Цифрового Двойника</div>
            <div className="text-xs font-black text-teal-300 font-mono">{projectName}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
                projectName,
                wingspan_m,
                mtow_kg,
                digitalTwinMetrics,
                targetRange_km,
                targetEndurance_min,
              }, null, 2));
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute("href", dataStr);
              downloadAnchor.setAttribute("download", `${projectName.replace(/\s+/g, '_')}_DigitalTwin_Export.json`);
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
            className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Экспорт Цифрового Двойника</span>
          </button>
        </div>
      </div>

      {/* One-Click Digital Twin Master Engineering State Bus */}
      <UAVDigitalTwinHub
        busState={digitalTwinBusState}
        onUpdateBusParam={(key, val) => {
          if (key === 'wingspan_m') setWingspanM(val);
          if (key === 'cruiseSpeed_kmh') setCruiseSpeedKmh(val);
        }}
        onNavigateToStage={(stageId) => setActiveStage(stageId as PipelineStageId)}
      />

      {/* Archetype Quick Switcher */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-300">
          <span className="font-bold flex items-center gap-1.5">
            <Boxes className="w-4 h-4 text-teal-400" />
            Базовый Архетип / Типовая Концепция Миссии:
          </span>
          <span className="text-slate-400 text-[11px]">
            Синхронизирует параметры между всеми 104+ подсистемами
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {UAV_ARCHETYPES.map((arch) => (
            <button
              key={arch.id}
              type="button"
              onClick={() => handleSelectArchetype(arch.id)}
              className={`p-3.5 rounded-2xl text-left transition-all border cursor-pointer ${
                selectedArchetypeId === arch.id
                  ? 'bg-teal-950/60 border-teal-400 text-teal-100 shadow-lg ring-2 ring-teal-500/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                <span className="font-mono">{arch.name}</span>
                <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[10px] font-mono">
                  {arch.mtow_kg} кг
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {arch.description}
              </p>
              <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-teal-400/90">
                <span>b: {arch.wingspan_m}м</span>
                <span>•</span>
                <span>R: {arch.targetRange_km}км</span>
                <span>•</span>
                <span>T: {arch.targetEndurance_min}мин</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 7-Stage Interactive Pipeline Navigation Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-300">
          <span className="font-bold flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-cyan-400" />
            7-Этапный Сквозной Инженерный Маршрут Проектирования:
          </span>
          <span className="text-teal-400 font-bold text-[11px]">
            Этап {STAGES_LIST.findIndex((s) => s.id === activeStage) + 1} из 7
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {STAGES_LIST.map((stage, idx) => {
            const IconComp = stage.icon;
            const isActive = activeStage === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setActiveStage(stage.id)}
                className={`p-2.5 rounded-xl text-left transition-all border cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'bg-gradient-to-br from-teal-500/30 via-slate-900 to-cyan-950/80 border-teal-400 text-white shadow-md ring-2 ring-teal-500/50'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black font-mono ${
                      isActive ? 'bg-teal-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {stage.num}
                  </span>
                  <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-teal-300' : 'text-slate-500'}`} />
                </div>
                <div className="text-[11px] font-bold font-mono text-slate-200 truncate">
                  {stage.title}
                </div>
                <div className="text-[9px] text-slate-400 line-clamp-1 mt-0.5">
                  {stage.subtitle}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Working Area: Stage Controls + 3D/2D Digital Twin Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stage-Specific Controls & Connected Sub-Modules (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Stage 1: Requirements & Concept */}
          {activeStage === 'stage1_concept' && (
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-mono font-bold text-xs">
                    1
                  </span>
                  <h3 className="text-sm font-bold text-white font-mono">
                    Этап 1: Синтез ТТЗ & Целевых Летно-Технических Характеристик
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-500/30">
                  Concept & MDO
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <label className="text-slate-400 block mb-1">Название проекта БПЛА:</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Крейсерская скорость (V_cruise):</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={40}
                      max={220}
                      step={5}
                      value={cruiseSpeed_kmh}
                      onChange={(e) => setCruiseSpeedKmh(parseInt(e.target.value))}
                      className="w-full accent-teal-400"
                    />
                    <span className="text-teal-300 font-bold w-16 text-right">{cruiseSpeed_kmh} км/ч</span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Целевой радиус действия:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={10}
                      max={500}
                      step={10}
                      value={targetRange_km}
                      onChange={(e) => setTargetRangeKm(parseInt(e.target.value))}
                      className="w-full accent-teal-400"
                    />
                    <span className="text-teal-300 font-bold w-16 text-right">{targetRange_km} км</span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Целевая продолжительность:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={20}
                      max={480}
                      step={10}
                      value={targetEndurance_min}
                      onChange={(e) => setTargetEnduranceMin(parseInt(e.target.value))}
                      className="w-full accent-teal-400"
                    />
                    <span className="text-teal-300 font-bold w-16 text-right">{targetEndurance_min} мин</span>
                  </div>
                </div>
              </div>

              {/* MDO Pareto Front Multi-Objective Optimization Tool */}
              <div className="pt-2">
                <UAVMDOParetoOptimizer
                  currentWingspan={wingspan_m}
                  currentMtow={digitalTwinMetrics.totalMass}
                  currentPayload={payload_kg}
                  currentCruiseSpeed={cruiseSpeed_kmh}
                  onApplyCandidate={handleApplyParetoCandidate}
                />
              </div>
            </div>
          )}

          {/* Stage 2: Aerodynamics & Wing */}
          {activeStage === 'stage2_aerodynamics' && (
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-mono font-bold text-xs">
                    2
                  </span>
                  <h3 className="text-sm font-bold text-white font-mono">
                    Этап 2: Параметрическая Геометрия Крыла & VLM/Поляры
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-950 text-sky-300 border border-sky-500/30">
                  Aero & Spar
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <label className="text-slate-400 block mb-1">Размах крыла (Wingspan b):</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0.8}
                      max={4.5}
                      step={0.1}
                      value={wingspan_m}
                      onChange={(e) => setWingspanM(parseFloat(e.target.value))}
                      className="w-full accent-sky-400"
                    />
                    <span className="text-sky-300 font-bold w-16 text-right">{wingspan_m.toFixed(2)} м</span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Корневая хорда (c_root):</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0.15}
                      max={0.8}
                      step={0.02}
                      value={chordRoot_m}
                      onChange={(e) => setChordRootM(parseFloat(e.target.value))}
                      className="w-full accent-sky-400"
                    />
                    <span className="text-sky-300 font-bold w-16 text-right">{chordRoot_m.toFixed(2)} м</span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Концевая хорда (c_tip):</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0.08}
                      max={0.5}
                      step={0.02}
                      value={chordTip_m}
                      onChange={(e) => setChordTipM(parseFloat(e.target.value))}
                      className="w-full accent-sky-400"
                    />
                    <span className="text-sky-300 font-bold w-16 text-right">{chordTip_m.toFixed(2)} м</span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Угол стреловидности (Sweep &Chi;):</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={35}
                      step={1}
                      value={sweep_deg}
                      onChange={(e) => setSweepDeg(parseInt(e.target.value))}
                      className="w-full accent-sky-400"
                    />
                    <span className="text-sky-300 font-bold w-16 text-right">{sweep_deg}&deg;</span>
                  </div>
                </div>
              </div>

              {/* Airfoil Library & Polar Database */}
              <div className="pt-2">
                <UAVAirfoilPolarDatabase
                  selectedAirfoilId={selectedAirfoilId}
                  onSelectAirfoil={(af) => setSelectedAirfoilId(af.id)}
                />
              </div>
            </div>
          )}

          {/* Stage 3: Mass & CG Balancing */}
          {activeStage === 'stage3_mass_cg' && (
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono font-bold text-xs">
                    3
                  </span>
                  <h3 className="text-sm font-bold text-white font-mono">
                    Этап 3: Массово-Инерционная Сводка & Центровка (CG)
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-500/30">
                  Mass & Stability
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <label className="text-slate-400 block mb-1">Полезная нагрузка (Payload):</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0.2}
                      max={10.0}
                      step={0.1}
                      value={payload_kg}
                      onChange={(e) => setPayloadKg(parseFloat(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                    <span className="text-amber-300 font-bold w-16 text-right">{payload_kg.toFixed(2)} кг</span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Масса аккумулятора Li-Ion/Li-Po:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0.5}
                      max={12.0}
                      step={0.1}
                      value={batteryMass_kg}
                      onChange={(e) => setBatteryMassKg(parseFloat(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                    <span className="text-amber-300 font-bold w-16 text-right">{batteryMass_kg.toFixed(2)} кг</span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Положение АКБ по оси X (от носа):</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0.1}
                      max={0.9}
                      step={0.02}
                      value={batteryX_m}
                      onChange={(e) => setBatteryXM(parseFloat(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                    <span className="text-amber-300 font-bold w-16 text-right">{(batteryX_m * 1000).toFixed(0)} мм</span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Положение полезной нагрузки X:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0.05}
                      max={0.5}
                      step={0.02}
                      value={payloadX_m}
                      onChange={(e) => setPayloadXM(parseFloat(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                    <span className="text-amber-300 font-bold w-16 text-right">{(payloadX_m * 1000).toFixed(0)} мм</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-slate-400">Полная взлетная масса (MTOW): </span>
                  <span className="text-white font-bold">{digitalTwinMetrics.totalMass.toFixed(2)} кг</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Запас стат. устойчивости (SM): </span>
                  <span className={`font-black ${digitalTwinMetrics.isStable ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {digitalTwinMetrics.staticMargin_percent.toFixed(1)}% {digitalTwinMetrics.isStable ? '(В НОРМЕ 5..18%)' : '(ОПАСНО!)'}
                  </span>
                </div>
              </div>

              {/* Flight Envelope V-n Diagram & Gust Margins */}
              <div className="pt-2">
                <UAVFlightEnvelopeDiagram
                  mtow_kg={digitalTwinMetrics.totalMass}
                  wingArea_m2={digitalTwinMetrics.wingArea_m2}
                  wingspan_m={wingspan_m}
                  cl_max={selectedAirfoil.cl_max}
                  cruiseSpeed_kmh={cruiseSpeed_kmh}
                />
              </div>
            </div>
          )}

          {/* Stage 4: Propulsion & Powertrain */}
          {activeStage === 'stage4_propulsion' && (
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs">
                    4
                  </span>
                  <h3 className="text-sm font-bold text-white font-mono">
                    Этап 4: Силовая Установка, Винтомоторная Группа & Энергобаланс
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                  Propulsion & BMS
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <label className="text-slate-400 block mb-1">Конфигурация АКБ (Кол-во ячеек S):</label>
                  <select
                    value={batteryCells}
                    onChange={(e) => setBatteryCells(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-bold"
                  >
                    <option value={4}>4S Li-Po (14.8V)</option>
                    <option value={6}>6S Li-Ion / Li-Po (22.2V)</option>
                    <option value={12}>12S Heavy HV (44.4V)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Емкость батареи (Capacity):</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={5000}
                      max={45000}
                      step={1000}
                      value={batteryCap_mAh}
                      onChange={(e) => setBatteryCapMah(parseInt(e.target.value))}
                      className="w-full accent-emerald-400"
                    />
                    <span className="text-emerald-300 font-bold w-20 text-right">{batteryCap_mAh} мАч</span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Диаметр пропеллера (Prop Diameter):</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={7}
                      max={26}
                      step={1}
                      value={propDiameter_in}
                      onChange={(e) => setPropDiameterIn(parseInt(e.target.value))}
                      className="w-full accent-emerald-400"
                    />
                    <span className="text-emerald-300 font-bold w-16 text-right">{propDiameter_in}"</span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">KV мотора (Об/В):</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={120}
                      max={1200}
                      step={20}
                      value={motorKv}
                      onChange={(e) => setMotorKv(parseInt(e.target.value))}
                      className="w-full accent-emerald-400"
                    />
                    <span className="text-emerald-300 font-bold w-16 text-right">{motorKv} KV</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Потребная мощность</div>
                  <div className="text-base font-black text-emerald-400 mt-0.5">
                    {digitalTwinMetrics.electricalPowerCruise_W.toFixed(0)} Вт
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Расчетное время</div>
                  <div className="text-base font-black text-teal-400 mt-0.5">
                    {digitalTwinMetrics.calculatedEndurance_min.toFixed(0)} мин
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Дальность полета</div>
                  <div className="text-base font-black text-cyan-400 mt-0.5">
                    {digitalTwinMetrics.calculatedRange_km.toFixed(0)} км
                  </div>
                </div>
              </div>

              {/* Propulsion BEM & Thermal Dynamics */}
              <div className="pt-2">
                <UAVPropulsionBEMAnalyzer
                  batteryCap_mAh={batteryCap_mAh}
                  batteryS_count={batteryCells}
                  motorKv={motorKv}
                  propDiameter_in={propDiameter_in}
                  propPitch_in={Math.round(propDiameter_in * 0.55)}
                  cruiseSpeed_kmh={cruiseSpeed_kmh}
                  cruiseThrustReq_N={digitalTwinMetrics.thrustRequired_N}
                  mtow_kg={digitalTwinMetrics.totalMass}
                />
              </div>
            </div>
          )}

          {/* Stage 5: Avionics & EW */}
          {activeStage === 'stage5_avionics_ew' && (
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-mono font-bold text-xs">
                    5
                  </span>
                  <h3 className="text-sm font-bold text-white font-mono">
                    Этап 5: Авионика, САУ (PX4/ArduPilot), Навигация VIO/РЭБ & ЭМС
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-500/30">
                  Avionics & EW
                </span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-purple-300 font-bold flex items-center justify-between">
                    <span>Стек Автономной Навигации в Зоне РЭБ (GNSS-Denied):</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px]">Активно</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Комплексирование 3-осевого ИНС (IMU) с оптическим потоком (Optical Flow VIO), визуальной геопривязкой (DSMAC/TERCOM) и помехоустойчивой 4-элементной CRPA антенной.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Коэффициенты ПИД САУ</div>
                    <div className="text-xs text-white font-mono mt-1">
                      Roll Kp: 0.14 | Pitch Kp: 0.18
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-slate-400 text-[10px]">Шина данных телеметрии</div>
                    <div className="text-xs text-emerald-400 font-mono mt-1">
                      MAVLink v2 @ 921600 baud (CAN)
                    </div>
                  </div>
                </div>
              </div>

              {/* C2 Link Budget & EW Jamming Resistance */}
              <div className="pt-2">
                <UAVEWLinkBudgetCalculator
                  calculatedRange_km={digitalTwinMetrics.calculatedRange_km}
                  altitude_m={500}
                />
              </div>
            </div>
          )}

          {/* Stage 6: Stealth & Recovery */}
          {activeStage === 'stage6_stealth_ops' && (
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-mono font-bold text-xs">
                    6
                  </span>
                  <h3 className="text-sm font-bold text-white font-mono">
                    Этап 6: Стелс-Оптимизация ЭПР, Акустика & Старт/Посадка
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-500/30">
                  Stealth & Ops
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Эквивалентная ЭПР (RCS):</div>
                  <div className="text-xl font-black text-rose-400 mt-1">
                    {digitalTwinMetrics.baseRcs.toFixed(3)} м²
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    ({digitalTwinMetrics.rcs_dBsm.toFixed(1)} dBsm в X-диапазоне)
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Способ Старта & Спасения:</div>
                  <div className="text-xs font-bold text-white mt-1">
                    Пневмокатапульта / Парашют
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">
                    Перегрузка старта: n_x &le; 6.5 g
                  </div>
                </div>
              </div>

              {/* 6-DoF Flight Dynamics, Dryden Gust & Stability */}
              <div className="pt-2">
                <UAVFlightDynamicsSimulationPanel
                  staticMargin_percent={digitalTwinMetrics.staticMargin_percent}
                  liftToDragRatio={digitalTwinMetrics.liftToDragRatio}
                  wingspan_m={wingspan_m}
                  cruiseSpeed_kmh={cruiseSpeed_kmh}
                  mtow_kg={digitalTwinMetrics.totalMass}
                />
              </div>

              {/* Hardware-In-The-Loop (HIL) & Mission Flight Profile Simulator */}
              <div className="pt-2">
                <UAVHILMissionSimulator
                  busState={digitalTwinBusState}
                />
              </div>
            </div>
          )}

          {/* Stage 7: Fabrication & BOM */}
          {activeStage === 'stage7_fabrication_bom' && (
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono font-bold text-xs">
                    7
                  </span>
                  <h3 className="text-sm font-bold text-white font-mono">
                    Этап 7: Производственный Пакет (CAD DXF, ЧПУ & BOM Спецификация)
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  Fabrication & BOM
                </span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-cyan-300 font-bold flex items-center justify-between">
                    <span>Генерация DXF-развертки под лазерную резку / ЧПУ фрезерование:</span>
                    <button
                      type="button"
                      onClick={() => onNavigateToModule?.('uav_cad_mesh_dxf')}
                      className="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 cursor-pointer"
                    >
                      Открыть в CAD/DXF Модуле &rarr;
                    </button>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    18 нервюр с облегчениями, 4 шпангоута фюзеляжа, посадочные места под сервоприводы и мотораму.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400">Ориентировочная себестоимость (BOM): </span>
                    <span className="text-emerald-400 font-bold">~ 185 000 ₽ ($1,980)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateToModule?.('uav_automated_report_bom')}
                    className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 cursor-pointer"
                  >
                    Спецификация BOM &rarr;
                  </button>
                </div>
              </div>

              {/* Engineering Artifacts Generator & Autopilot Exporter */}
              <div className="pt-2">
                <UAVEngineeringArtifactsExporter
                  busState={digitalTwinBusState}
                />
              </div>

              {/* Airworthiness Certification & Compliance Audit */}
              <div className="pt-2">
                <UAVAirworthinessAuditPanel
                  projectName={projectName}
                  mtow_kg={digitalTwinMetrics.totalMass}
                  payload_kg={payload_kg}
                  batteryMass_kg={batteryMass_kg}
                  structuralMass_kg={structuralMass_kg}
                  avionicsMass_kg={avionicsMass_kg}
                  wingspan_m={wingspan_m}
                  wingArea_m2={digitalTwinMetrics.wingArea_m2}
                  staticMargin_percent={digitalTwinMetrics.staticMargin_percent}
                  liftToDragRatio={digitalTwinMetrics.liftToDragRatio}
                  stallSpeed_kmh={digitalTwinMetrics.V_stall_kmh}
                  cruiseSpeed_kmh={cruiseSpeed_kmh}
                  thrustToWeightRatio={digitalTwinMetrics.thrustToWeightRatio}
                  endurance_min={digitalTwinMetrics.calculatedEndurance_min}
                  range_km={digitalTwinMetrics.calculatedRange_km}
                  rcs_m2={digitalTwinMetrics.baseRcs}
                />
              </div>
            </div>
          )}

          {/* Connected Subsystems for this Stage */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-teal-400" />
                Связанные Специализированные Подсистемы (Subsystems Hub):
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Кликните для перехода в углубленный модуль
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PIPELINE_CONNECTED_MODULES[activeStage].map((mod) => (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => onNavigateToModule?.(mod.id)}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-teal-500/60 hover:bg-slate-900 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white group-hover:text-teal-300 font-mono flex items-center gap-1">
                      {mod.name}
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-300">
                      {mod.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2">
                    {mod.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: 3D/2D Digital Twin Interactive Viewport & Performance Radar (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Digital Twin Viewport */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1.5">
                <Plane className="w-4 h-4 text-teal-400" />
                Интерактивный Холст Цифрового Двойника (CAD 2D/3D):
              </span>
              <button
                type="button"
                onClick={() => setIsRotating(!isRotating)}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                {isRotating ? 'Анимация Вкл' : 'Статика'}
              </button>
            </div>

            <div className="relative w-full h-[320px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={520}
                height={320}
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Performance Radar Matrix */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                Радарный Инженерный Паспорт (Многокритериальная оценка):
              </span>
              <span className="text-[10px] text-teal-300 font-mono">
                {digitalTwinMetrics.liftToDragRatio.toFixed(1)} L/D
              </span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                  <PolarGrid stroke="#334155" opacity={0.5} />
                  <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 10, fontFamily: 'monospace' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" tick={{ fontSize: 8 }} />
                  <Radar name="Цифровой Двойник" dataKey="value" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.4} />
                  <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px', fontSize: '10px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
