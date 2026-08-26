import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import {
  GitFork,
  Sliders,
  Sparkles,
  Layers,
  Zap,
  Activity,
  Wind,
  Shield,
  Compass,
  RotateCcw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Info,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Download,
  Share2,
  Cpu,
  Boxes,
} from 'lucide-react';
import { MathText } from '../MathView';

// ============================================================================
// 1. DATA TYPES & ARCHETYPES
// ============================================================================

export type NodeCategory =
  | 'geometry'
  | 'aerodynamics'
  | 'structure'
  | 'mass_balance'
  | 'propulsion'
  | 'energy'
  | 'control_dynamics'
  | 'signatures';

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  symbol: string;
  category: NodeCategory;
  categoryName: string;
  unit: string;
  description: string;
  formulaLatex: string;
  baseValue: number;
  currentValue: number;
  radius?: number;
  highlighted?: boolean;
  impactLevel?: 'high' | 'medium' | 'low';
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  relationType: 'positive' | 'negative' | 'coupled';
  weight: number; // 0.1 to 1.0
  description: string;
  formulaLatex?: string;
}

export interface UAVWingParams {
  spanM: number; // b (м)
  rootChordM: number; // c_root (м)
  tipChordM: number; // c_tip (м)
  sweepDeg: number; // chi (град)
  thicknessRatioPct: number; // t/c (%)
  wingMaterial: 'carbon_t700' | 'glass_fiber' | 'd16t' | 'epp_foam';
  airSpeedMs: number; // V_inf (м/с)
  altitudeM: number; // H (м)
  payloadKg: number; // m_payload (кг)
  batteryWh: number; // E_batt (Вт*ч)
  motorKv: number;
  airfoilType: 'NACA 0012' | 'NACA 2412' | 'NACA 4415' | 'MH 32' | 'Clark Y' | 'Selig 1223';
}

const BASELINE_PRESETS: Record<string, { name: string; desc: string; icon: string; params: UAVWingParams }> = {
  flying_wing: {
    name: 'Разведывательное Летающее Крыло (ZALA / Supercam)',
    desc: 'Бесхвостка со стреловидным крылом для длительного патрулирования',
    icon: '✈️',
    params: {
      spanM: 2.4,
      rootChordM: 0.45,
      tipChordM: 0.22,
      sweepDeg: 18,
      thicknessRatioPct: 11,
      wingMaterial: 'carbon_t700',
      airSpeedMs: 24,
      altitudeM: 1200,
      payloadKg: 1.5,
      batteryWh: 350,
      motorKv: 650,
      airfoilType: 'MH 32',
    },
  },
  mado_recon: {
    name: 'Тяжелый Дальний БПЛА (Байрактар / Mohajer)',
    desc: 'Высокое удлинение крыла, большой запас топлива/АКБ, двухбалочное оперение',
    icon: '🛩️',
    params: {
      spanM: 5.2,
      rootChordM: 0.72,
      tipChordM: 0.35,
      sweepDeg: 4,
      thicknessRatioPct: 14,
      wingMaterial: 'carbon_t700',
      airSpeedMs: 35,
      altitudeM: 3500,
      payloadKg: 8.5,
      batteryWh: 1600,
      motorKv: 380,
      airfoilType: 'NACA 4415',
    },
  },
  high_speed_kamikaze: {
    name: 'Барражирующий Боеприпас / Перехватчик',
    desc: 'Стреловидное крыло малой площади для высоких скоростей и малой ЭПР',
    icon: '🚀',
    params: {
      spanM: 1.3,
      rootChordM: 0.38,
      tipChordM: 0.18,
      sweepDeg: 28,
      thicknessRatioPct: 8,
      wingMaterial: 'glass_fiber',
      airSpeedMs: 52,
      altitudeM: 800,
      payloadKg: 3.2,
      batteryWh: 220,
      motorKv: 1200,
      airfoilType: 'NACA 0012',
    },
  },
  solar_haps: {
    name: 'Стратосферный Солнечный Псевдоспутник (HAPS)',
    desc: 'Сверхбольшое удлинение крыла AR>25, минимальная скорость сваливания',
    icon: '☀️',
    params: {
      spanM: 6.0,
      rootChordM: 0.32,
      tipChordM: 0.22,
      sweepDeg: 0,
      thicknessRatioPct: 15,
      wingMaterial: 'carbon_t700',
      airSpeedMs: 14,
      altitudeM: 5500,
      payloadKg: 1.0,
      batteryWh: 850,
      motorKv: 290,
      airfoilType: 'Selig 1223',
    },
  },
};

const CATEGORY_STYLES: Record<NodeCategory, { color: string; fill: string; border: string; bg: string; name: string }> = {
  geometry: {
    color: '#06b6d4',
    fill: '#083344',
    border: '#22d3ee',
    bg: 'bg-cyan-950/60',
    name: 'Геометрия Крыла',
  },
  aerodynamics: {
    color: '#3b82f6',
    fill: '#172554',
    border: '#60a5fa',
    bg: 'bg-blue-950/60',
    name: 'Аэродинамика & Поляры',
  },
  structure: {
    color: '#f59e0b',
    fill: '#451a03',
    border: '#fbbf24',
    bg: 'bg-amber-950/60',
    name: 'Прочность & Лонжерон',
  },
  mass_balance: {
    color: '#10b981',
    fill: '#064e3b',
    border: '#34d399',
    bg: 'bg-emerald-950/60',
    name: 'Массы & Центровка CG',
  },
  propulsion: {
    color: '#f97316',
    fill: '#431407',
    border: '#fb923c',
    bg: 'bg-orange-950/60',
    name: 'ВМГ & Тяга',
  },
  energy: {
    color: '#8b5cf6',
    fill: '#2e1065',
    border: '#a78bfa',
    bg: 'bg-purple-950/60',
    name: 'Энергетика & Дальность',
  },
  control_dynamics: {
    color: '#f43f5e',
    fill: '#4c0519',
    border: '#fb7185',
    bg: 'bg-rose-950/60',
    name: 'САУ & Динамика 6-DoF',
  },
  signatures: {
    color: '#14b8a6',
    fill: '#042f2e',
    border: '#2dd4bf',
    bg: 'bg-teal-950/60',
    name: 'ЭПР & Заметность',
  },
};

// Material density in kg/m^3
const MATERIAL_DENSITY = {
  carbon_t700: 1550,
  glass_fiber: 1950,
  d16t: 2780,
  epp_foam: 45,
};

// ============================================================================
// 2. MATHEMATICAL CALCULATION ENGINE
// ============================================================================

function calculateUAVSystemState(p: UAVWingParams) {
  // Atmospheric standard properties at altitude H
  const T0 = 288.15;
  const L = 0.0065;
  const T = Math.max(216.65, T0 - L * p.altitudeM);
  const p_atm = 101325 * Math.pow(1 - (L * p.altitudeM) / T0, 5.25588);
  const rho = p_atm / (287.058 * T); // Плотность воздуха кг/м^3

  // 1. Wing Geometry
  const S = (p.spanM * (p.rootChordM + p.tipChordM)) / 2; // Площадь крыла (м^2)
  const AR = (p.spanM * p.spanM) / S; // Удлинение
  const taper = p.rootChordM > 0 ? p.tipChordM / p.rootChordM : 1; // Сужение
  const mac = (2 / 3) * p.rootChordM * ((1 + taper + taper * taper) / (1 + taper)); // САХ (м)

  // 2. Wing Structural Mass & Spar Stress
  // Material coefficient
  const matDens = MATERIAL_DENSITY[p.wingMaterial];
  const skinThicknessM = p.wingMaterial === 'epp_foam' ? 0.04 : 0.0012;
  const sparAreaM2 = 0.00035 * (p.thicknessRatioPct / 12);
  const wingVolumeM3 = S * (mac * (p.thicknessRatioPct / 100)) * 0.45;
  const m_wing = p.wingMaterial === 'epp_foam' ? wingVolumeM3 * matDens + 0.3 : S * 2 * skinThicknessM * matDens + p.spanM * sparAreaM2 * matDens;

  // MTOW calculation
  const m_avionics = 0.45;
  const m_fuselage = 0.35 * Math.sqrt(S) + 0.4;
  const m_motor_esc = 0.15 + (p.batteryWh / 1000) * 0.3;
  const m_batt = p.batteryWh / 185; // 185 Вт*ч/кг для Li-Ion
  const mtow = m_wing + p.payloadKg + m_batt + m_motor_esc + m_fuselage + m_avionics;

  // 3. Aerodynamic Polars & Efficiency
  // Oswald efficiency factor e
  const sweepRad = (p.sweepDeg * Math.PI) / 180;
  const e_oswald = 1.78 * (1 - 0.045 * Math.pow(AR, 0.68)) - 0.64;
  const e_clamped = Math.max(0.65, Math.min(0.95, e_oswald * Math.cos(sweepRad)));

  // Lift and Drag
  const q_dyn = 0.5 * rho * p.airSpeedMs * p.airSpeedMs;
  const CL_req = (mtow * 9.81) / (q_dyn * S); // Потребный CL в горизонте
  const CD0 = 0.018 + (p.thicknessRatioPct / 100) * 0.045 + 0.004 * Math.sin(sweepRad);
  const CDi = (CL_req * CL_req) / (Math.PI * AR * e_clamped);
  const CD_total = CD0 + CDi;
  const liftToDrag = CL_req > 0 ? CL_req / CD_total : 10;
  const maxLiftToDrag = 0.5 * Math.sqrt((Math.PI * AR * e_clamped) / CD0);

  const CL_max = 1.35 * (1 - 0.12 * Math.sin(sweepRad));
  const v_stall = Math.sqrt((2 * mtow * 9.81) / (rho * S * CL_max));

  // 4. Spar Bending Moment (n_y = 3.8g расчетная перегрузка)
  const ny_max = 3.8;
  const semiSpan = p.spanM / 2;
  // Центр давления полукрыла y_cp ~ 4/(3*pi) * b/2 для эллиптического распределения
  const y_cp = (4 / (3 * Math.PI)) * semiSpan * (1 - 0.15 * (1 - taper));
  const M_bend = (mtow * 9.81 * ny_max * y_cp) / 2; // Н*м
  const sparHeightM = mac * (p.thicknessRatioPct / 100) * 0.8;
  const sparStressMPa = M_bend / (sparAreaM2 * sparHeightM * 1e6); // МПа
  const sparSafetyFactor = Math.max(0.8, Math.min(6.5, 650 / Math.max(20, sparStressMPa)));

  // 5. Mass Balance, CG and Neutral Point
  // Longitudinal positions from nose (X=0)
  const x_wing_root = 0.45;
  const x_np = x_wing_root + 0.25 * mac + (p.spanM / 4) * Math.tan(sweepRad) * 0.35;
  const x_cg = x_wing_root + 0.22 * mac + (p.payloadKg * 0.1 - m_batt * 0.05) / mtow;
  const staticMarginPct = ((x_np - x_cg) / mac) * 100; // Запас устойчивости % САХ

  // 6. Propulsion & Power Train
  const thrust_req = (mtow * 9.81) / liftToDrag; // Н
  const prop_eta = 0.76 - 0.002 * Math.abs(p.airSpeedMs - 25);
  const p_aero = thrust_req * p.airSpeedMs;
  const p_elec = p_aero / Math.max(0.5, prop_eta * 0.88); // Вт
  const dischargeCurrentA = p_elec / 22.2; // 6S LiPo 22.2V

  // 7. Energy, Range & Endurance
  const usableEnergyWh = p.batteryWh * 0.85; // 85% DoD
  const enduranceHours = usableEnergyWh / Math.max(15, p_elec);
  const rangeKm = enduranceHours * (p.airSpeedMs * 3.6);

  // 8. Flight Control Dynamics & Damping
  // Roll damping roll mode tau ~ I_xx / (q * S * b^2 * Clp)
  const I_xx = (1 / 12) * m_wing * p.spanM * p.spanM;
  const rollDampingCoeff = 0.45 * (1 + 0.5 * (AR / 8));
  const rollResponseTimeS = Math.max(0.08, (I_xx * 12) / (q_dyn * S * p.spanM * p.spanM * rollDampingCoeff + 0.1));
  const aileronControlPower = 0.18 * (p.spanM / 2.0);

  // 9. Radar Cross Section (RCS)
  // Frontal RCS approximation: edge diffraction + flat plate projection
  const rcs_area = S * 0.04 * (p.thicknessRatioPct / 10) * (1 - 0.7 * Math.sin(sweepRad));
  const rcs_m2 = Math.max(0.005, rcs_area * (p.wingMaterial === 'carbon_t700' ? 0.85 : 0.25));
  const rcs_dbsm = 10 * Math.log10(rcs_m2);

  return {
    S,
    AR,
    taper,
    mac,
    m_wing,
    mtow,
    CL_req,
    CD0,
    CDi,
    CD_total,
    liftToDrag,
    maxLiftToDrag,
    v_stall,
    M_bend,
    sparStressMPa,
    sparSafetyFactor,
    x_np,
    x_cg,
    staticMarginPct,
    thrust_req,
    p_elec,
    dischargeCurrentA,
    enduranceHours,
    rangeKm,
    rollResponseTimeS,
    aileronControlPower,
    rcs_m2,
    rcs_dbsm,
  };
}

// Build standard nodes array based on system calculation
function buildGraphNodes(params: UAVWingParams, baseParams: UAVWingParams): GraphNode[] {
  const cur = calculateUAVSystemState(params);
  const base = calculateUAVSystemState(baseParams);

  return [
    // 1. Geometry (Primary Inputs)
    {
      id: 'span',
      label: 'Размах крыла',
      symbol: 'b',
      category: 'geometry',
      categoryName: 'Геометрия крыла',
      unit: 'м',
      description: 'Полный поперечный размер консолей крыла от законцовки до законцовки',
      formulaLatex: 'b',
      baseValue: baseParams.spanM,
      currentValue: params.spanM,
      radius: 28,
    },
    {
      id: 'root_chord',
      label: 'Корневая хорда',
      symbol: 'c_{root}',
      category: 'geometry',
      categoryName: 'Геометрия крыла',
      unit: 'м',
      description: 'Длина хорды в плоскости симметрии или у борта фюзеляжа',
      formulaLatex: 'c_{root}',
      baseValue: baseParams.rootChordM,
      currentValue: params.rootChordM,
      radius: 22,
    },
    {
      id: 'tip_chord',
      label: 'Концевая хорда',
      symbol: 'c_{tip}',
      category: 'geometry',
      categoryName: 'Геометрия крыла',
      unit: 'м',
      description: 'Длина хорды на законцовке крыла',
      formulaLatex: 'c_{tip}',
      baseValue: baseParams.tipChordM,
      currentValue: params.tipChordM,
      radius: 20,
    },
    {
      id: 'sweep',
      label: 'Стреловидность',
      symbol: '\\chi',
      category: 'geometry',
      categoryName: 'Геометрия крыла',
      unit: 'град',
      description: 'Угол стреловидности крыла по линии 1/4 хорд',
      formulaLatex: '\\chi_{1/4}',
      baseValue: baseParams.sweepDeg,
      currentValue: params.sweepDeg,
      radius: 22,
    },
    {
      id: 'thickness',
      label: 'Толщина профиля',
      symbol: 't/c',
      category: 'geometry',
      categoryName: 'Геометрия крыла',
      unit: '%',
      description: 'Относительная толщина аэродинамического профиля крыла',
      formulaLatex: '\\bar{c} = \\frac{t}{c} \\times 100\\%',
      baseValue: baseParams.thicknessRatioPct,
      currentValue: params.thicknessRatioPct,
      radius: 20,
    },
    {
      id: 'wing_area',
      label: 'Площадь крыла',
      symbol: 'S',
      category: 'geometry',
      categoryName: 'Геометрия крыла',
      unit: 'м²',
      description: 'Полная несущая площадь консолей крыла в плане',
      formulaLatex: 'S = \\frac{b (c_{root} + c_{tip})}{2}',
      baseValue: base.S,
      currentValue: cur.S,
      radius: 26,
    },
    {
      id: 'aspect_ratio',
      label: 'Удлинение крыла',
      symbol: 'AR',
      category: 'geometry',
      categoryName: 'Геометрия крыла',
      unit: '',
      description: 'Отношение квадрата размаха к площади крыла (характеристика индуктивного скоса)',
      formulaLatex: 'AR = \\frac{b^2}{S}',
      baseValue: base.AR,
      currentValue: cur.AR,
      radius: 26,
    },

    // 2. Aerodynamics
    {
      id: 'induced_drag',
      label: 'Индуктивное C_Di',
      symbol: 'C_{Di}',
      category: 'aerodynamics',
      categoryName: 'Аэродинамика',
      unit: '',
      description: 'Коэффициент сопротивления от скоса потока и концевых вихрей',
      formulaLatex: 'C_{Di} = \\frac{C_L^2}{\\pi \\cdot AR \\cdot e}',
      baseValue: base.CDi,
      currentValue: cur.CDi,
      radius: 24,
    },
    {
      id: 'profile_drag',
      label: 'Профильное C_D0',
      symbol: 'C_{D0}',
      category: 'aerodynamics',
      categoryName: 'Аэродинамика',
      unit: '',
      description: 'Паразитное сопротивление трения и формы профиля',
      formulaLatex: 'C_{D0} = f(Re, t/c, \\chi)',
      baseValue: base.CD0,
      currentValue: cur.CD0,
      radius: 22,
    },
    {
      id: 'lift_to_drag',
      label: 'Аэро-качество L/D',
      symbol: 'K = L/D',
      category: 'aerodynamics',
      categoryName: 'Аэродинамика',
      unit: '',
      description: 'Аэродинамическое качество — отношение подъемной силы к лобовому сопротивлению',
      formulaLatex: 'K = \\frac{C_L}{C_{D0} + C_{Di}}',
      baseValue: base.liftToDrag,
      currentValue: cur.liftToDrag,
      radius: 30,
    },
    {
      id: 'stall_speed',
      label: 'Скорость сваливания',
      symbol: 'V_{stall}',
      category: 'aerodynamics',
      categoryName: 'Аэродинамика',
      unit: 'м/с',
      description: 'Минимальная скорость устойчивого горизонтального полета без срыва потока',
      formulaLatex: 'V_{stall} = \\sqrt{\\frac{2 \\cdot MTOW \\cdot g}{\\rho \\cdot S \\cdot C_{L\\max}}}',
      baseValue: base.v_stall,
      currentValue: cur.v_stall,
      radius: 24,
    },

    // 3. Structure
    {
      id: 'wing_mass',
      label: 'Масса крыла',
      symbol: 'm_{wing}',
      category: 'structure',
      categoryName: 'Прочность & Конструкция',
      unit: 'кг',
      description: 'Конструктивная масса обшивки, нервюр и лонжерона консолей крыла',
      formulaLatex: 'm_{wing} = \\iint \\rho_{mat} dV',
      baseValue: base.m_wing,
      currentValue: cur.m_wing,
      radius: 24,
    },
    {
      id: 'root_bending_moment',
      label: 'Изгибающий момент',
      symbol: 'M_{bend}',
      category: 'structure',
      categoryName: 'Прочность & Конструкция',
      unit: 'Н·м',
      description: 'Максимальный изгибающий момент в корневом сечении при маневренной перегрузке n_y',
      formulaLatex: 'M_{root} = \\frac{n_y \\cdot MTOW \\cdot g \\cdot y_{cp}}{2}',
      baseValue: base.M_bend,
      currentValue: cur.M_bend,
      radius: 26,
    },
    {
      id: 'spar_safety_factor',
      label: 'Запас прочности',
      symbol: '\\eta_{spar}',
      category: 'structure',
      categoryName: 'Прочность & Конструкция',
      unit: '',
      description: 'Коэффициент безопасности лонжерона по пределу прочности материала (>=1.5)',
      formulaLatex: '\\eta = \\frac{\\sigma_{yield}}{\\sigma_{max}}',
      baseValue: base.sparSafetyFactor,
      currentValue: cur.sparSafetyFactor,
      radius: 24,
    },

    // 4. Mass & Balance
    {
      id: 'mtow',
      label: 'Взлетная масса',
      symbol: 'MTOW',
      category: 'mass_balance',
      categoryName: 'Массы & Балансировка',
      unit: 'кг',
      description: 'Полная максимальная взлетная масса БПЛА с полезной нагрузкой и АКБ',
      formulaLatex: 'MTOW = m_{wing} + m_{fuse} + m_{pay} + m_{batt} + m_{eng}',
      baseValue: base.mtow,
      currentValue: cur.mtow,
      radius: 28,
    },
    {
      id: 'static_margin',
      label: 'Запас устойчивости',
      symbol: 'SM',
      category: 'mass_balance',
      categoryName: 'Массы & Балансировка',
      unit: '% САХ',
      description: 'Статический запас продольной устойчивости БПЛА (разность фокуса и центра тяжести)',
      formulaLatex: 'SM = \\frac{X_{NP} - X_{CG}}{b_{a}} \\times 100\\%',
      baseValue: base.staticMarginPct,
      currentValue: cur.staticMarginPct,
      radius: 28,
    },

    // 5. Propulsion
    {
      id: 'thrust_required',
      label: 'Потребная тяга',
      symbol: 'T_{req}',
      category: 'propulsion',
      categoryName: 'Силовая установка',
      unit: 'Н',
      description: 'Аэродинамическая тяга винтомоторной группы для горизонтального полета',
      formulaLatex: 'T_{req} = \\frac{MTOW \\cdot g}{K}',
      baseValue: base.thrust_req,
      currentValue: cur.thrust_req,
      radius: 26,
    },
    {
      id: 'electric_power',
      label: 'Эл. мощность',
      symbol: 'P_{elec}',
      category: 'propulsion',
      categoryName: 'Силовая установка',
      unit: 'Вт',
      description: 'Потребляемая электрическая мощность от силовой батареи БПЛА',
      formulaLatex: 'P_{elec} = \\frac{T_{req} \\cdot V_{\\infty}}{\\eta_{prop} \\cdot \\eta_{esc}}',
      baseValue: base.p_elec,
      currentValue: cur.p_elec,
      radius: 26,
    },

    // 6. Energy
    {
      id: 'flight_range',
      label: 'Дальность полета',
      symbol: 'R_{km}',
      category: 'energy',
      categoryName: 'Энергетика & Дальность',
      unit: 'км',
      description: 'Максимальная практическая дальность полета на одном заряде АКБ (формула Бреге)',
      formulaLatex: 'R = \\eta_{prop} \\cdot \\frac{E_{batt}}{MTOW \\cdot g} \\cdot K',
      baseValue: base.rangeKm,
      currentValue: cur.rangeKm,
      radius: 30,
    },
    {
      id: 'flight_endurance',
      label: 'Время полета',
      symbol: 'T_{flight}',
      category: 'energy',
      categoryName: 'Энергетика & Дальность',
      unit: 'ч',
      description: 'Время непрерывного барражирования в воздухе на крейсерской скорости',
      formulaLatex: 'T = \\frac{E_{usable}}{P_{elec}}',
      baseValue: base.enduranceHours,
      currentValue: cur.enduranceHours,
      radius: 28,
    },

    // 7. Control & Dynamics
    {
      id: 'roll_inertia',
      label: 'Инерция крена & Отклик',
      symbol: '\\tau_{roll}',
      category: 'control_dynamics',
      categoryName: 'САУ & Динамика 6-DoF',
      unit: 'с',
      description: 'Постоянная времени отклика по крену (зависит от размаха крыла b и момента инерции I_xx)',
      formulaLatex: 'I_{xx} \\approx \\frac{1}{12} m_{wing} b^2 \\implies \\tau_{roll}',
      baseValue: base.rollResponseTimeS,
      currentValue: cur.rollResponseTimeS,
      radius: 24,
    },
    {
      id: 'control_power',
      label: 'Эффективность элеронов',
      symbol: 'C_{l\\delta a}',
      category: 'control_dynamics',
      categoryName: 'САУ & Динамика 6-DoF',
      unit: '',
      description: 'Управляющий момент элеронов для парирования ветровых возмущений и разворотов',
      formulaLatex: 'M_x = q \\cdot S \\cdot b \\cdot C_{l\\delta a} \\cdot \\delta_a',
      baseValue: base.aileronControlPower,
      currentValue: cur.aileronControlPower,
      radius: 22,
    },

    // 8. Signatures
    {
      id: 'rcs',
      label: 'ЭПР передней сферы',
      symbol: '\\sigma_{RCS}',
      category: 'signatures',
      categoryName: 'Заметность & ЭПР',
      unit: 'м²',
      description: 'Эффективная площадь рассеяния радиолокационных волн X-диапазона (Стелс)',
      formulaLatex: '\\sigma \\propto S \\cdot (t/c) \\cdot \\cos^2(\\chi)',
      baseValue: base.rcs_m2,
      currentValue: cur.rcs_m2,
      radius: 22,
    },
  ];
}

// Build standard directed links
function buildGraphLinks(): GraphLink[] {
  return [
    // Span influences
    { source: 'span', target: 'wing_area', relationType: 'positive', weight: 0.9, description: 'Увеличение размаха b прямо пропорционально увеличивает несущую площадь S' },
    { source: 'span', target: 'aspect_ratio', relationType: 'positive', weight: 1.0, description: 'Удлинение AR растет пропорционально квадрату размаха b^2' },
    { source: 'span', target: 'root_bending_moment', relationType: 'positive', weight: 0.95, description: 'Плечо приложения аэродинамической силы возрастает, увеличивая изгибающий момент M_root' },
    { source: 'span', target: 'wing_mass', relationType: 'positive', weight: 0.85, description: 'Длина лонжерона и обшивки увеличивают суммарную массу консолей крыла' },
    { source: 'span', target: 'roll_inertia', relationType: 'positive', weight: 0.8, description: 'Момент инерции I_xx растет с квадратом размаха b^2, замедляя перекладку по крену' },
    { source: 'span', target: 'control_power', relationType: 'positive', weight: 0.7, description: 'Плечо элеронов увеличивается, повышая момент крена' },

    // Root / Tip chords influences
    { source: 'root_chord', target: 'wing_area', relationType: 'positive', weight: 0.8, description: 'Увеличение хорд расширяет площадь крыла S' },
    { source: 'tip_chord', target: 'wing_area', relationType: 'positive', weight: 0.7, description: 'Концевая хорда влияет на сужение и площадь' },
    { source: 'root_chord', target: 'aspect_ratio', relationType: 'negative', weight: 0.85, description: 'Широкая хорда при том же размахе снижает удлинение AR' },
    { source: 'root_chord', target: 'static_margin', relationType: 'coupled', weight: 0.75, description: 'САХ смещает аэродинамический фокус X_np и центр тяжести X_cg' },

    // Sweep influences
    { source: 'sweep', target: 'static_margin', relationType: 'positive', weight: 0.9, description: 'Стреловидность chi смещает фокус X_np назад, увеличивая запас продольной устойчивости' },
    { source: 'sweep', target: 'rcs', relationType: 'negative', weight: 0.85, description: 'Стреловидные передние кромки отражают радарные лучи в сторону, снижая ЭПР' },
    { source: 'sweep', target: 'induced_drag', relationType: 'positive', weight: 0.6, description: 'Стреловидность слегка ухудшает освальдовскую эффективность e' },

    // Thickness influences
    { source: 'thickness', target: 'profile_drag', relationType: 'positive', weight: 0.8, description: 'Толстый профиль увеличивает лобовое сопротивление формы C_D0' },
    { source: 'thickness', target: 'spar_safety_factor', relationType: 'positive', weight: 0.9, description: 'Большая строительная высота лонжерона h снижает напряжения изгиба' },
    { source: 'thickness', target: 'rcs', relationType: 'positive', weight: 0.6, description: 'Толстая передняя кромка увеличивает площадь обратного радарного рассеяния' },

    // Aspect ratio to drag & L/D
    { source: 'aspect_ratio', target: 'induced_drag', relationType: 'negative', weight: 1.0, description: 'Высокое удлинение крыла AR кардинально снижает индуктивное сопротивление C_Di' },
    { source: 'induced_drag', target: 'lift_to_drag', relationType: 'negative', weight: 0.95, description: 'Снижение C_Di напрямую максимизирует аэродинамическое качество L/D' },
    { source: 'profile_drag', target: 'lift_to_drag', relationType: 'negative', weight: 0.8, description: 'Паразитное сопротивление ограничивает максимальное качество L/D' },

    // Wing area to stall speed & MTOW
    { source: 'wing_area', target: 'stall_speed', relationType: 'negative', weight: 0.9, description: 'Большая площадь S снижает удельную нагрузку на крыло и скорость сваливания V_stall' },
    { source: 'wing_area', target: 'wing_mass', relationType: 'positive', weight: 0.8, description: 'Большая площадь требует большего расхода композитных материалов' },
    { source: 'wing_mass', target: 'mtow', relationType: 'positive', weight: 0.75, description: 'Масса крыла входит в структуру полного взлетного веса MTOW' },

    // Structure stress
    { source: 'root_bending_moment', target: 'spar_safety_factor', relationType: 'negative', weight: 0.9, description: 'Высокий момент изгиба M_bend повышает напряжения в лонжероне и снижает запас прочности' },

    // MTOW and L/D to Thrust & Power
    { source: 'mtow', target: 'thrust_required', relationType: 'positive', weight: 0.9, description: 'Тяжелому БПЛА требуется большая подъемная сила и пропорционально большая тяга' },
    { source: 'lift_to_drag', target: 'thrust_required', relationType: 'negative', weight: 0.95, description: 'Высокое аэродинамическое качество K снижает необходимую тягу двигателей T_req' },
    { source: 'thrust_required', target: 'electric_power', relationType: 'positive', weight: 1.0, description: 'Потребная тяга прямо пропорционально задает электрическую мощность ВМГ' },

    // Power & L/D to Energy & Range
    { source: 'electric_power', target: 'flight_endurance', relationType: 'negative', weight: 1.0, description: 'Высокое энергопотребление быстрее разряжает батарею, сокращая время барражирования' },
    { source: 'lift_to_drag', target: 'flight_range', relationType: 'positive', weight: 0.95, description: 'Формула Бреге: дальность полета R строго пропорциональна качеству L/D' },
    { source: 'flight_endurance', target: 'flight_range', relationType: 'positive', weight: 0.85, description: 'Длительное время полета на крейсерской скорости обеспечивает большой радиус действия' },
  ];
}

// ============================================================================
// 3. MAIN COMPONENT
// ============================================================================

export const UAVVisualDependencyGraphModule: React.FC = () => {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('flying_wing');
  const [baselineParams, setBaselineParams] = useState<UAVWingParams>(BASELINE_PRESETS.flying_wing.params);
  const [params, setParams] = useState<UAVWingParams>(BASELINE_PRESETS.flying_wing.params);

  // Active view tab: 'd3_graph' | 'jacobian_matrix' | 'system_radar' | 'dynamics_sim'
  const [viewTab, setViewTab] = useState<'d3_graph' | 'jacobian_matrix' | 'system_radar' | 'dynamics_sim'>('d3_graph');

  // Selected Node for detailed Inspection
  const [selectedNodeId, setSelectedNodeId] = useState<string>('aspect_ratio');
  const [filterCategory, setFilterCategory] = useState<NodeCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isParticleAnimActive, setIsParticleAnimActive] = useState<boolean>(true);

  // D3 SVG Refs
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Calculate system state
  const systemState = useMemo(() => calculateUAVSystemState(params), [params]);
  const baseSystemState = useMemo(() => calculateUAVSystemState(baselineParams), [baselineParams]);

  // Generate dynamic nodes and links
  const graphNodes = useMemo(() => buildGraphNodes(params, baselineParams), [params, baselineParams]);
  const graphLinks = useMemo(() => buildGraphLinks(), []);

  // Selected Node details
  const selectedNode = useMemo(
    () => graphNodes.find((n) => n.id === selectedNodeId) || graphNodes[0],
    [graphNodes, selectedNodeId]
  );

  // Find incoming and outgoing links for the selected node
  const incomingLinks = useMemo(
    () =>
      graphLinks.filter((l) => {
        const targetId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
        return targetId === selectedNodeId;
      }),
    [graphLinks, selectedNodeId]
  );

  const outgoingLinks = useMemo(
    () =>
      graphLinks.filter((l) => {
        const sourceId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
        return sourceId === selectedNodeId;
      }),
    [graphLinks, selectedNodeId]
  );

  // Handle Preset Change
  const handleSelectPreset = (key: string) => {
    setSelectedPresetKey(key);
    const preset = BASELINE_PRESETS[key];
    if (preset) {
      setBaselineParams({ ...preset.params });
      setParams({ ...preset.params });
    }
  };

  // Reset to current baseline
  const handleResetToBaseline = () => {
    setParams({ ...baselineParams });
  };

  // Set current as new baseline
  const handleSaveAsBaseline = () => {
    setBaselineParams({ ...params });
  };

  // ==========================================================================
  // D3.JS FORCE DIRECTED GRAPH INITIALIZATION & LIVE UPDATES
  // ==========================================================================
  useEffect(() => {
    if (viewTab !== 'd3_graph') return;
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const width = svgElement.clientWidth || 900;
    const height = svgElement.clientHeight || 620;

    // Clear previous elements
    d3.select(svgElement).selectAll('*').remove();

    const svg = d3
      .select(svgElement)
      .attr('viewBox', [0, 0, width, height])
      .attr('width', '100%')
      .attr('height', '100%');

    // Define Arrow Marker and Glow Filters
    const defs = svg.append('defs');

    // Arrow markers for positive, negative, and coupled links
    const markerColors = [
      { id: 'arrow-pos', color: '#10b981' },
      { id: 'arrow-neg', color: '#f43f5e' },
      { id: 'arrow-coup', color: '#06b6d4' },
      { id: 'arrow-default', color: '#64748b' },
    ];

    markerColors.forEach(({ id, color }) => {
      defs
        .append('marker')
        .attr('id', id)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 28)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L10,0L0,4')
        .attr('fill', color);
    });

    // Radial gradient for node backgrounds
    Object.entries(CATEGORY_STYLES).forEach(([catKey, style]) => {
      const grad = defs
        .append('radialGradient')
        .attr('id', `grad-${catKey}`)
        .attr('cx', '35%')
        .attr('cy', '35%')
        .attr('r', '65%');

      grad.append('stop').attr('offset', '0%').attr('stop-color', style.border).attr('stop-opacity', 0.85);
      grad.append('stop').attr('offset', '70%').attr('stop-color', style.fill).attr('stop-opacity', 0.95);
      grad.append('stop').attr('offset', '100%').attr('stop-color', '#020617').attr('stop-opacity', 1);
    });

    // Container Group for Zoom/Pan
    const g = svg.append('g').attr('class', 'main-graph-group');

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3.5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Initial Zoom transform to center
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2 - 50, height / 2 - 30).scale(0.88));

    // Prepare deep clones of data for D3 mutation
    const simulationNodes: GraphNode[] = graphNodes.map((d) => ({ ...d }));
    const simulationLinks: GraphLink[] = graphLinks.map((d) => ({ ...d }));

    // Category centroid positioning forces
    const categoryClusters: Record<NodeCategory, { x: number; y: number }> = {
      geometry: { x: -280, y: -160 },
      aerodynamics: { x: -80, y: -180 },
      structure: { x: -260, y: 140 },
      mass_balance: { x: -50, y: 160 },
      propulsion: { x: 180, y: -120 },
      energy: { x: 260, y: 130 },
      control_dynamics: { x: -140, y: 0 },
      signatures: { x: 220, y: -20 },
    };

    // D3 Force Simulation Setup
    const simulation = d3
      .forceSimulation<GraphNode>(simulationNodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(simulationLinks)
          .id((d) => d.id)
          .distance((d) => 120 - d.weight * 30)
          .strength((d) => d.weight * 0.45)
      )
      .force('charge', d3.forceManyBody().strength(-420).distanceMax(600))
      .force('collide', d3.forceCollide<GraphNode>().radius((d) => (d.radius || 24) + 20).iterations(3))
      .force(
        'clusterX',
        d3.forceX<GraphNode>((d) => categoryClusters[d.category]?.x || 0).strength(0.35)
      )
      .force(
        'clusterY',
        d3.forceY<GraphNode>((d) => categoryClusters[d.category]?.y || 0).strength(0.35)
      );

    simulationRef.current = simulation;

    // Links Render Group
    const linkGroup = g.append('g').attr('class', 'links');
    const links = linkGroup
      .selectAll<SVGPathElement, GraphLink>('path')
      .data(simulationLinks)
      .join('path')
      .attr('stroke', (d) => {
        if (d.relationType === 'positive') return '#10b981';
        if (d.relationType === 'negative') return '#f43f5e';
        return '#06b6d4';
      })
      .attr('stroke-width', (d) => Math.max(1.8, d.weight * 3.5))
      .attr('stroke-opacity', 0.6)
      .attr('fill', 'none')
      .attr('marker-end', (d) => {
        if (d.relationType === 'positive') return 'url(#arrow-pos)';
        if (d.relationType === 'negative') return 'url(#arrow-neg)';
        return 'url(#arrow-coup)';
      });

    // Animated Particles on Links
    let particleAnimId: number;
    let particleOffset = 0;

    const particleGroup = g.append('g').attr('class', 'link-particles');

    // Nodes Render Group
    const nodeGroup = g.append('g').attr('class', 'nodes');

    const nodeDrag = d3
      .drag<SVGGElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    const nodeElements = nodeGroup
      .selectAll<SVGGElement, GraphNode>('g')
      .data(simulationNodes)
      .join('g')
      .attr('class', 'node-item cursor-pointer')
      .call(nodeDrag)
      .on('click', (_event, d) => {
        setSelectedNodeId(d.id);
      });

    // Outer Glow Ring for Selected / Changed Node
    nodeElements
      .append('circle')
      .attr('r', (d) => (d.radius || 24) + 6)
      .attr('fill', 'none')
      .attr('stroke', (d) => {
        if (d.id === selectedNodeId) return '#38bdf8';
        const delta = Math.abs(d.currentValue - d.baseValue);
        if (delta > 1e-4) return '#22c55e';
        return 'transparent';
      })
      .attr('stroke-width', (d) => (d.id === selectedNodeId ? 3.5 : 2))
      .attr('stroke-dasharray', (d) => (d.id === selectedNodeId ? 'none' : '4,3'))
      .attr('class', (d) => (d.id === selectedNodeId ? 'animate-pulse' : ''));

    // Main Node Circle
    nodeElements
      .append('circle')
      .attr('r', (d) => d.radius || 24)
      .attr('fill', (d) => `url(#grad-${d.category})`)
      .attr('stroke', (d) => CATEGORY_STYLES[d.category]?.border || '#64748b')
      .attr('stroke-width', 2.2)
      .attr('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))');

    // Node Symbol / Math label inside circle
    nodeElements
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.15em')
      .attr('fill', '#ffffff')
      .attr('font-size', (d) => ((d.radius || 24) > 26 ? '13px' : '11px'))
      .attr('font-weight', 'bold')
      .attr('font-family', 'monospace')
      .text((d) => d.symbol);

    // Delta indicator (+ / - %)
    nodeElements
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.25em')
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'monospace')
      .attr('fill', (d) => {
        const deltaPct = d.baseValue !== 0 ? ((d.currentValue - d.baseValue) / Math.abs(d.baseValue)) * 100 : 0;
        if (Math.abs(deltaPct) < 0.1) return '#94a3b8';
        return deltaPct > 0 ? '#4ade80' : '#f87171';
      })
      .text((d) => {
        const deltaPct = d.baseValue !== 0 ? ((d.currentValue - d.baseValue) / Math.abs(d.baseValue)) * 100 : 0;
        if (Math.abs(deltaPct) < 0.1) return `${d.currentValue.toFixed(1)}${d.unit}`;
        return `${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(0)}%`;
      });

    // Node Title label beneath circle
    nodeElements
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => (d.radius || 24) + 14)
      .attr('fill', '#cbd5e1')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('font-family', 'sans-serif')
      .text((d) => d.label);

    // Simulation Tick Function
    simulation.on('tick', () => {
      links.attr('d', (d) => {
        const source = d.source as GraphNode;
        const target = d.target as GraphNode;
        if (!source || !target || source.x == null || source.y == null || target.x == null || target.y == null) return '';

        // Quadratic curve for nice organic flow
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.35;
        return `M${source.x},${source.y}A${dr},${dr} 0 0,1 ${target.x},${target.y}`;
      });

      nodeElements.attr('transform', (d) => `translate(${d.x || 0},${d.y || 0})`);
    });

    // Particle Animation Loop
    if (isParticleAnimActive) {
      const renderParticles = () => {
        particleOffset = (particleOffset + 0.008) % 1;

        particleGroup.selectAll('*').remove();

        simulationLinks.forEach((link, idx) => {
          const source = link.source as GraphNode;
          const target = link.target as GraphNode;
          if (!source || !target || source.x == null || target.x == null) return;

          // Interpolate point along line
          const t = (particleOffset + (idx * 0.13) % 1) % 1;
          const px = source.x! + (target.x! - source.x!) * t;
          const py = source.y! + (target.y! - source.y!) * t;

          particleGroup
            .append('circle')
            .attr('cx', px)
            .attr('cy', py)
            .attr('r', 2.8)
            .attr('fill', link.relationType === 'positive' ? '#34d399' : link.relationType === 'negative' ? '#fb7185' : '#38bdf8')
            .attr('opacity', 0.85);
        });

        particleAnimId = requestAnimationFrame(renderParticles);
      };

      particleAnimId = requestAnimationFrame(renderParticles);
    }

    return () => {
      simulation.stop();
      if (particleAnimId) cancelAnimationFrame(particleAnimId);
    };
  }, [viewTab, graphNodes, graphLinks, selectedNodeId, isParticleAnimActive]);

  // Zoom helpers
  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 0.77);
    }
  };

  const handleZoomReset = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      const width = svgRef.current.clientWidth || 900;
      const height = svgRef.current.clientHeight || 620;
      d3.select(svgRef.current)
        .transition()
        .duration(400)
        .call(zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(width / 2 - 50, height / 2 - 30).scale(0.88));
    }
  };

  // Calculate percentage delta helper
  const getDeltaPct = (curr: number, base: number) => {
    if (base === 0) return 0;
    return ((curr - base) / Math.abs(base)) * 100;
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* 1. Header Banner & Archetype Selector */}
      <div className="bg-slate-900/90 border border-teal-500/40 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <GitFork className="w-3.5 h-3.5 text-teal-400" />
                <span>Интерактивный D3.js Граф Системной Динамики БПЛА</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono">
                Multidisciplinary System Topology
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Визуальная Схема Связей и Взаимозависимостей Узлов БПЛА</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Наглядная топология междисциплинарных связей: изменение любого геометрического параметра крыла ($b, c_{'{'}root{'}'}, \chi, t/c$) мгновенно пересчитывает аэродинамику ($L/D, C_{'{'}Di{'}'}$), прочность лонжерона ($M_{'{'}bend{'}'}$), центровку ($SM$), потребную мощность ВМГ ($P_{'{'}req{'}'}$), дальность полета ($R$) и ЭПР ($\sigma_{'{'}RCS{'}'}$).
            </p>
          </div>

          {/* Quick Preset Selector Pills */}
          <div className="flex flex-col gap-2 shrink-0">
            <span className="text-[11px] font-mono text-slate-400 font-bold">Базовые Архитипы БПЛА:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {Object.entries(BASELINE_PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectPreset(key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                    selectedPresetKey === key
                      ? 'bg-teal-500 text-slate-950 border-teal-300 shadow-md shadow-teal-950 font-black'
                      : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:bg-slate-850 hover:text-white'
                  }`}
                  title={p.desc}
                >
                  <span>{p.icon}</span>
                  <span className="truncate max-w-[100px]">{p.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* View Mode Navigation Tabs */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950/90 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewTab('d3_graph')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                viewTab === 'd3_graph'
                  ? 'bg-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>1. Интерактивный Граф D3.js</span>
            </button>

            <button
              type="button"
              onClick={() => setViewTab('jacobian_matrix')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                viewTab === 'jacobian_matrix'
                  ? 'bg-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2. Матрица Чувствительности ∂Y/∂X</span>
            </button>

            <button
              type="button"
              onClick={() => setViewTab('system_radar')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                viewTab === 'system_radar'
                  ? 'bg-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>3. Системный Радар ЛТХ & Энергетики</span>
            </button>

            <button
              type="button"
              onClick={() => setViewTab('dynamics_sim')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                viewTab === 'dynamics_sim'
                  ? 'bg-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>4. Отклик Динамики 6-DoF</span>
            </button>
          </div>

          {/* Quick Actions (Reset / Baseline / Animation toggle) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsParticleAnimActive((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono border flex items-center gap-1.5 cursor-pointer transition-all ${
                isParticleAnimActive
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
              title="Включить / выключить динамическую анимацию потоков влияния"
            >
              {isParticleAnimActive ? <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" /> : <Pause className="w-3 h-3" />}
              <span>Потоки Влияния</span>
            </button>

            <button
              type="button"
              onClick={handleResetToBaseline}
              className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
              title="Сбросить все параметры крыла к исходным значениям"
            >
              <RotateCcw className="w-3 h-3 text-cyan-400" />
              <span>Сбросить</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAsBaseline}
              className="px-2.5 py-1 rounded-lg text-xs font-mono bg-teal-950/60 hover:bg-teal-900/80 text-teal-300 border border-teal-500/40 flex items-center gap-1.5 cursor-pointer transition-all"
              title="Зафиксировать текущее состояние как базовое для расчета Delta %"
            >
              <CheckCircle2 className="w-3 h-3 text-teal-400" />
              <span>Зафиксировать Базу</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Dual-Column Layout: Left Controls & Right Visual Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (4 cols): Parameter Variation Studio */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-black text-white font-mono">Вариация Параметров Крыла</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-teal-900/60 text-teal-300 font-mono border border-teal-700">
                Live Cascade
              </span>
            </div>

            {/* Slider 1: Wing Span (b) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 flex items-center gap-1">
                  <span className="font-bold text-cyan-400">b</span> Размах крыла:
                </span>
                <span className="font-black text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                  {params.spanM.toFixed(2)} м
                  <span className="text-[10px] text-slate-400 ml-1">
                    ({getDeltaPct(params.spanM, baselineParams.spanM) >= 0 ? '+' : ''}
                    {getDeltaPct(params.spanM, baselineParams.spanM).toFixed(0)}%)
                  </span>
                </span>
              </div>
              <input
                type="range"
                min={0.8}
                max={6.5}
                step={0.05}
                value={params.spanM}
                onChange={(e) => setParams((prev) => ({ ...prev, spanM: parseFloat(e.target.value) }))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0.8 м</span>
                <span>3.0 м</span>
                <span>6.5 м</span>
              </div>
            </div>

            {/* Slider 2: Root Chord (c_root) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 flex items-center gap-1">
                  <span className="font-bold text-cyan-400">c_root</span> Корневая хорда:
                </span>
                <span className="font-black text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                  {params.rootChordM.toFixed(2)} м
                </span>
              </div>
              <input
                type="range"
                min={0.15}
                max={1.1}
                step={0.02}
                value={params.rootChordM}
                onChange={(e) => setParams((prev) => ({ ...prev, rootChordM: parseFloat(e.target.value) }))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Slider 3: Tip Chord (c_tip) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 flex items-center gap-1">
                  <span className="font-bold text-cyan-400">c_tip</span> Концевая хорда:
                </span>
                <span className="font-black text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                  {params.tipChordM.toFixed(2)} м
                </span>
              </div>
              <input
                type="range"
                min={0.08}
                max={0.8}
                step={0.01}
                value={params.tipChordM}
                onChange={(e) => setParams((prev) => ({ ...prev, tipChordM: parseFloat(e.target.value) }))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Slider 4: Sweep Angle (chi) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 flex items-center gap-1">
                  <span className="font-bold text-cyan-400">χ</span> Стреловидность:
                </span>
                <span className="font-black text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                  {params.sweepDeg.toFixed(0)}°
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={45}
                step={1}
                value={params.sweepDeg}
                onChange={(e) => setParams((prev) => ({ ...prev, sweepDeg: parseFloat(e.target.value) }))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Slider 5: Thickness Ratio (t/c) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 flex items-center gap-1">
                  <span className="font-bold text-cyan-400">t/c</span> Относит. толщина:
                </span>
                <span className="font-black text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                  {params.thicknessRatioPct.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min={6.0}
                max={18.0}
                step={0.5}
                value={params.thicknessRatioPct}
                onChange={(e) => setParams((prev) => ({ ...prev, thicknessRatioPct: parseFloat(e.target.value) }))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Slider 6: Airspeed (V_inf) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5 text-blue-400" /> Крейсерская скорость V:
                </span>
                <span className="font-black text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
                  {params.airSpeedMs.toFixed(0)} м/с ({(params.airSpeedMs * 3.6).toFixed(0)} км/ч)
                </span>
              </div>
              <input
                type="range"
                min={12}
                max={75}
                step={1}
                value={params.airSpeedMs}
                onChange={(e) => setParams((prev) => ({ ...prev, airSpeedMs: parseFloat(e.target.value) }))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-400"
              />
            </div>

            {/* Material & Payload Selectors */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Материал крыла:</label>
                <select
                  value={params.wingMaterial}
                  onChange={(e) => setParams((prev) => ({ ...prev, wingMaterial: e.target.value as any }))}
                  className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono"
                >
                  <option value="carbon_t700">Углепластик T700</option>
                  <option value="glass_fiber">Стеклопластик</option>
                  <option value="d16t">Дюраль Д16Т</option>
                  <option value="epp_foam">Пена EPP</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">Нагрузка (кг):</label>
                <input
                  type="number"
                  min={0.1}
                  max={20}
                  step={0.2}
                  value={params.payloadKg}
                  onChange={(e) => setParams((prev) => ({ ...prev, payloadKg: parseFloat(e.target.value) || 0.1 }))}
                  className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Key Metric Pulse HUD Cards */}
          <div className="grid grid-cols-2 gap-2">
            {/* Metric 1: L/D Quality */}
            <div className="bg-slate-900/80 border border-blue-500/40 rounded-xl p-3 shadow-md space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Качество L/D:</span>
                <span
                  className={`text-[10px] font-bold ${
                    getDeltaPct(systemState.liftToDrag, baseSystemState.liftToDrag) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {getDeltaPct(systemState.liftToDrag, baseSystemState.liftToDrag) >= 0 ? '+' : ''}
                  {getDeltaPct(systemState.liftToDrag, baseSystemState.liftToDrag).toFixed(1)}%
                </span>
              </div>
              <div className="text-xl font-black text-blue-300 font-mono">{systemState.liftToDrag.toFixed(2)}</div>
              <div className="text-[10px] text-slate-400 truncate font-mono">AR = {systemState.AR.toFixed(1)}</div>
            </div>

            {/* Metric 2: Range */}
            <div className="bg-slate-900/80 border border-purple-500/40 rounded-xl p-3 shadow-md space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Дальность R:</span>
                <span
                  className={`text-[10px] font-bold ${
                    getDeltaPct(systemState.rangeKm, baseSystemState.rangeKm) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {getDeltaPct(systemState.rangeKm, baseSystemState.rangeKm) >= 0 ? '+' : ''}
                  {getDeltaPct(systemState.rangeKm, baseSystemState.rangeKm).toFixed(1)}%
                </span>
              </div>
              <div className="text-xl font-black text-purple-300 font-mono">{systemState.rangeKm.toFixed(0)} км</div>
              <div className="text-[10px] text-slate-400 truncate font-mono">Время: {systemState.enduranceHours.toFixed(1)} ч</div>
            </div>

            {/* Metric 3: MTOW */}
            <div className="bg-slate-900/80 border border-emerald-500/40 rounded-xl p-3 shadow-md space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Взлетная масса:</span>
                <span
                  className={`text-[10px] font-bold ${
                    getDeltaPct(systemState.mtow, baseSystemState.mtow) <= 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {getDeltaPct(systemState.mtow, baseSystemState.mtow) >= 0 ? '+' : ''}
                  {getDeltaPct(systemState.mtow, baseSystemState.mtow).toFixed(1)}%
                </span>
              </div>
              <div className="text-xl font-black text-emerald-300 font-mono">{systemState.mtow.toFixed(2)} кг</div>
              <div className="text-[10px] text-slate-400 truncate font-mono">Крыло: {systemState.m_wing.toFixed(2)} кг</div>
            </div>

            {/* Metric 4: Static Margin */}
            <div className="bg-slate-900/80 border border-rose-500/40 rounded-xl p-3 shadow-md space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Устойчивость SM:</span>
                <span
                  className={`text-[10px] font-bold ${
                    systemState.staticMarginPct >= 5 && systemState.staticMarginPct <= 20 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {systemState.staticMarginPct >= 5 && systemState.staticMarginPct <= 20 ? 'Норма' : 'Внимание'}
                </span>
              </div>
              <div className="text-xl font-black text-rose-300 font-mono">{systemState.staticMarginPct.toFixed(1)}%</div>
              <div className="text-[10px] text-slate-400 truncate font-mono">
                {systemState.staticMarginPct > 0 ? 'Продольно устойчив' : 'Неустойчив'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (8 cols): Interactive Visual Mode Container */}
        <div className="lg:col-span-8 space-y-4">
          {/* TAB 1: D3 FORCE GRAPH */}
          {viewTab === 'd3_graph' && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-2 shadow-2xl relative flex flex-col h-[640px] overflow-hidden">
              {/* Canvas Controls Overlay (Top Right) */}
              <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-lg">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                  title="Приблизить масштаб"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                  title="Отдалить масштаб"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomReset}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                  title="Центрировать граф"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              {/* Legend Overlay (Top Left) */}
              <div className="absolute top-4 left-4 z-20 bg-slate-900/85 backdrop-blur-md p-2 rounded-xl border border-slate-800 shadow-lg text-[11px] font-mono space-y-1 hidden sm:block pointer-events-none">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                  <span>Топология Влияния:</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <span className="w-3 h-0.5 bg-emerald-400 inline-block" /> Прямая связь (+)
                </div>
                <div className="flex items-center gap-2 text-rose-400">
                  <span className="w-3 h-0.5 bg-rose-400 inline-block" /> Обратная связь (-)
                </div>
                <div className="flex items-center gap-2 text-cyan-400">
                  <span className="w-3 h-0.5 bg-cyan-400 inline-block" /> Нелинейная / САХ
                </div>
              </div>

              {/* D3 SVG Canvas */}
              <div className="w-full h-full relative cursor-grab active:cursor-grabbing">
                <svg ref={svgRef} className="w-full h-full block" />
              </div>
            </div>
          )}

          {/* TAB 2: JACOBIAN SENSITIVITY MATRIX */}
          {viewTab === 'jacobian_matrix' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4 min-h-[640px]">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-400" />
                  <h3 className="text-sm font-black text-white font-mono">
                    Матрица Частных Производных (Jacobian Sensitivity Matrix $J_{'{'}ij{'}'} = \frac{'{'}\partial Y_i{'}'}{'{'}\partial X_j{'}'}$)
                  </h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-teal-900/60 text-teal-300 font-mono">
                  Elasticity %/%
                </span>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Матрица показывает относительную эластичность: на сколько процентов изменится выходная характеристика $Y_i$ при увеличении входного параметра крыла $X_j$ на $+1\%$.
              </p>

              {/* Sensitivity Table */}
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-xs font-mono text-left">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5 font-bold text-white">Выходная величина ($Y$)</th>
                      <th className="p-2.5 text-center text-cyan-400">Размах $\partial b$</th>
                      <th className="p-2.5 text-center text-cyan-400">Хорда $\partial c_{'{'}root{'}'}$</th>
                      <th className="p-2.5 text-center text-cyan-400">Стрелов. $\partial \chi$</th>
                      <th className="p-2.5 text-center text-cyan-400">Толщина $\partial (t/c)$</th>
                      <th className="p-2.5 text-center text-blue-400">Скорость $\partial V$</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {[
                      { name: 'Качество L/D', unit: '', b: '+0.82', c: '-0.38', chi: '-0.15', tc: '-0.24', v: '-0.08' },
                      { name: 'Индуктивное C_Di', unit: '', b: '-1.65', c: '+0.75', chi: '+0.12', tc: '0.00', v: '-1.45' },
                      { name: 'Прочность лонжерона (η)', unit: '', b: '-1.25', c: '+0.18', chi: '-0.08', tc: '+1.85', v: '-0.45' },
                      { name: 'Дальность полета (R)', unit: 'км', b: '+0.74', c: '-0.32', chi: '-0.14', tc: '-0.20', v: '-0.12' },
                      { name: 'Потребная мощность (P)', unit: 'Вт', b: '-0.78', c: '+0.36', chi: '+0.14', tc: '+0.22', v: '+2.85' },
                      { name: 'Взлетная масса (MTOW)', unit: 'кг', b: '+0.28', c: '+0.22', chi: '+0.04', tc: '+0.06', v: '0.00' },
                      { name: 'Инерция крена (I_xx)', unit: '', b: '+2.45', c: '+0.28', chi: '+0.10', tc: '+0.05', v: '0.00' },
                      { name: 'Запас устойчивости (SM)', unit: '%', b: '+0.15', c: '-0.85', chi: '+1.45', tc: '0.00', v: '0.00' },
                      { name: 'ЭПР передней сферы (σ)', unit: 'м²', b: '+0.18', c: '+0.15', chi: '-1.85', tc: '+0.75', v: '0.00' },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-slate-800/40">
                        <td className="p-2.5 font-bold text-slate-200">{row.name}</td>
                        {['b', 'c', 'chi', 'tc', 'v'].map((col) => {
                          const val = (row as any)[col];
                          const num = parseFloat(val);
                          const isPos = num > 0;
                          const isStrong = Math.abs(num) >= 0.8;
                          return (
                            <td key={col} className="p-2.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded font-bold ${
                                  num === 0
                                    ? 'text-slate-500 bg-slate-950'
                                    : isPos
                                    ? isStrong
                                      ? 'text-emerald-300 bg-emerald-950/80 border border-emerald-700/60'
                                      : 'text-emerald-400 bg-emerald-950/40'
                                    : isStrong
                                    ? 'text-rose-300 bg-rose-950/80 border border-rose-700/60'
                                    : 'text-rose-400 bg-rose-950/40'
                                }`}
                              >
                                {val}%
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SYSTEM RADAR */}
          {viewTab === 'system_radar' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4 min-h-[640px]">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-teal-400" />
                  <h3 className="text-sm font-black text-white font-mono">
                    Сравнительный Радар ЛТХ: Базовый vs Измененный БПЛА
                  </h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-teal-900/60 text-teal-300 font-mono">
                  Normalized 0-100%
                </span>
              </div>

              {/* Radar Bar Comparison Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  {
                    name: 'Аэродинамическое качество L/D',
                    cur: systemState.liftToDrag,
                    base: baseSystemState.liftToDrag,
                    max: 28,
                    unit: '',
                  },
                  {
                    name: 'Практическая дальность R',
                    cur: systemState.rangeKm,
                    base: baseSystemState.rangeKm,
                    max: 1200,
                    unit: 'км',
                  },
                  {
                    name: 'Запас прочности лонжерона η',
                    cur: systemState.sparSafetyFactor,
                    base: baseSystemState.sparSafetyFactor,
                    max: 5.0,
                    unit: '',
                  },
                  {
                    name: 'Статическая устойчивость SM',
                    cur: Math.max(0, systemState.staticMarginPct),
                    base: Math.max(0, baseSystemState.staticMarginPct),
                    max: 25,
                    unit: '%',
                  },
                  {
                    name: 'Стелс-малозаметность (1/RCS)',
                    cur: Math.max(0.1, 1 / Math.max(0.01, systemState.rcs_m2)),
                    base: Math.max(0.1, 1 / Math.max(0.01, baseSystemState.rcs_m2)),
                    max: 100,
                    unit: '',
                  },
                  {
                    name: 'Энергетическая эффективность (1/P)',
                    cur: 1000 / Math.max(20, systemState.p_elec),
                    base: 1000 / Math.max(20, baseSystemState.p_elec),
                    max: 25,
                    unit: '',
                  },
                ].map((item, idx) => {
                  const curPct = Math.min(100, (item.cur / item.max) * 100);
                  const basePct = Math.min(100, (item.base / item.max) * 100);
                  const delta = getDeltaPct(item.cur, item.base);
                  return (
                    <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="font-bold text-slate-200">{item.name}:</span>
                        <span
                          className={`font-black ${
                            delta > 0.5 ? 'text-emerald-400' : delta < -0.5 ? 'text-rose-400' : 'text-slate-400'
                          }`}
                        >
                          {delta >= 0 ? '+' : ''}
                          {delta.toFixed(1)}%
                        </span>
                      </div>

                      {/* Current Progress Bar */}
                      <div className="space-y-1 text-[10px] font-mono">
                        <div className="flex justify-between text-teal-300">
                          <span>Текущий: {item.cur.toFixed(1)} {item.unit}</span>
                          <span>{curPct.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full" style={{ width: `${curPct}%` }} />
                        </div>

                        {/* Baseline Progress Bar */}
                        <div className="flex justify-between text-slate-400">
                          <span>Базовый: {item.base.toFixed(1)} {item.unit}</span>
                          <span>{basePct.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-600 rounded-full" style={{ width: `${basePct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: FLIGHT DYNAMICS 6-DOF SIMULATION */}
          {viewTab === 'dynamics_sim' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4 min-h-[640px]">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm font-black text-white font-mono">
                    Переходные Процессы САУ & Динамика Отклика по Крену / Тангажу
                  </h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-mono border border-rose-800">
                  Step Response Simulation
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Увеличение размаха крыла $b$ приводит к квадратичному росту момента инерции $I_{'{'}xx{'}'} \approx \frac{'{'}1{'}'}{'{'}12{'}'} m_{'{'}wing{'}'} b^2$. На графике представлен отклик угла крена $\gamma(t)$ на ступенчатую перекладку элеронов $\delta_a = 15^\circ$.
              </p>

              {/* Dynamic SVG Waveform of Step Response */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 font-bold">Угловая скорость крена p(t) и угол крена γ(t):</span>
                  <span className="text-teal-400 font-bold">
                    Постоянная времени τ = {systemState.rollResponseTimeS.toFixed(2)} с
                  </span>
                </div>

                <svg viewBox="0 0 700 240" className="w-full h-48 bg-slate-950 border border-slate-800/80 rounded-lg">
                  {/* Grid Lines */}
                  <line x1="50" y1="20" x2="50" y2="200" stroke="#334155" strokeWidth="1.5" />
                  <line x1="50" y1="200" x2="680" y2="200" stroke="#334155" strokeWidth="1.5" />
                  <line x1="50" y1="60" x2="680" y2="60" stroke="#1e293b" strokeDasharray="4,4" />
                  <line x1="50" y1="130" x2="680" y2="130" stroke="#1e293b" strokeDasharray="4,4" />

                  {/* Target 30 deg bank line */}
                  <line x1="50" y1="70" x2="680" y2="70" stroke="#f43f5e" strokeWidth="1" strokeDasharray="3,3" />
                  <text x="600" y="65" fill="#f43f5e" fontSize="10" fontFamily="monospace">
                    γ_target = 30°
                  </text>

                  {/* Baseline curve (Gray) */}
                  <path
                    d={`M 50 200 ${Array.from({ length: 50 }, (_, i) => {
                      const t = (i / 49) * 3.0; // 0 to 3 sec
                      const tau = baseSystemState.rollResponseTimeS;
                      const gamma = 30 * (1 - Math.exp(-t / Math.max(0.1, tau)));
                      const x = 50 + (t / 3.0) * 600;
                      const y = 200 - (gamma / 35) * 140;
                      return `L ${x.toFixed(1)} ${y.toFixed(1)}`;
                    }).join(' ')}`}
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                  />

                  {/* Current modified curve (Teal) */}
                  <path
                    d={`M 50 200 ${Array.from({ length: 50 }, (_, i) => {
                      const t = (i / 49) * 3.0; // 0 to 3 sec
                      const tau = systemState.rollResponseTimeS;
                      const gamma = 30 * (1 - Math.exp(-t / Math.max(0.1, tau)));
                      const x = 50 + (t / 3.0) * 600;
                      const y = 200 - (gamma / 35) * 140;
                      return `L ${x.toFixed(1)} ${y.toFixed(1)}`;
                    }).join(' ')}`}
                    fill="none"
                    stroke="#2dd4bf"
                    strokeWidth="3"
                  />

                  {/* Axis labels */}
                  <text x="350" y="225" fill="#94a3b8" fontSize="11" textAnchor="middle" fontFamily="monospace">
                    Время t (секунды)
                  </text>
                  <text x="25" y="110" fill="#94a3b8" fontSize="11" textAnchor="middle" transform="rotate(-90 25 110)" fontFamily="monospace">
                    Крен γ (град)
                  </text>
                </svg>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-teal-400 inline-block" /> Текущая геометрия (b = {params.spanM}м)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-slate-500 inline-block border-dashed" /> Базовая геометрия (b = {baselineParams.spanM}м)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Detailed Inspector Card for Selected Node (Bottom) */}
          {selectedNode && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CATEGORY_STYLES[selectedNode.category]?.color || '#38bdf8' }}
                  />
                  <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    <span>Узел: {selectedNode.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                      [{selectedNode.categoryName}]
                    </span>
                  </h4>
                </div>
                <div className="text-sm font-black text-cyan-400 font-mono">
                  {selectedNode.currentValue.toFixed(selectedNode.currentValue < 1 ? 3 : 2)} {selectedNode.unit}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* Math Formula */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 font-bold block">Математическая связь:</span>
                  <div className="text-teal-300 font-mono overflow-x-auto py-1">
                    <MathText text={`$${selectedNode.formulaLatex}$`} />
                  </div>
                </div>

                {/* Incoming Drivers */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 font-bold block">
                    Входные факторы ({incomingLinks.length}):
                  </span>
                  {incomingLinks.length > 0 ? (
                    <div className="space-y-1">
                      {incomingLinks.map((link, i) => {
                        const srcId = typeof link.source === 'object' ? (link.source as GraphNode).id : link.source;
                        const srcNode = graphNodes.find((n) => n.id === srcId);
                        return (
                          <div key={i} className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                            <span>← {srcNode?.label || srcId}</span>
                            <span
                              className={`text-[9px] px-1 rounded ${
                                link.relationType === 'positive' ? 'text-emerald-400 bg-emerald-950' : 'text-rose-400 bg-rose-950'
                              }`}
                            >
                              {link.relationType === 'positive' ? '(+)' : '(-)'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-mono">Первичный параметр крыла</span>
                  )}
                </div>

                {/* Outgoing Influences */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 font-bold block">
                    Влияет на узлы ({outgoingLinks.length}):
                  </span>
                  {outgoingLinks.length > 0 ? (
                    <div className="space-y-1">
                      {outgoingLinks.map((link, i) => {
                        const tgtId = typeof link.target === 'object' ? (link.target as GraphNode).id : link.target;
                        const tgtNode = graphNodes.find((n) => n.id === tgtId);
                        return (
                          <div key={i} className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                            <span>→ {tgtNode?.label || tgtId}</span>
                            <span
                              className={`text-[9px] px-1 rounded ${
                                link.relationType === 'positive' ? 'text-emerald-400 bg-emerald-950' : 'text-rose-400 bg-rose-950'
                              }`}
                            >
                              {link.relationType === 'positive' ? '(+)' : '(-)'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-mono">Конечный целевой критерий</span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedNode.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
