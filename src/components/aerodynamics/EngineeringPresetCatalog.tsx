import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  Sliders,
  Wind,
  Layers,
  Activity,
  Flame,
  AlertTriangle,
  Compass,
  ArrowRight,
  Search,
  Filter,
  Check,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Cpu,
  Info,
  Box,
} from 'lucide-react';
import { MathView, MathText } from '../MathView';
import { HandbookTopicId } from '../EngineeringHandbookModal';

export type AeroRegime =
  | 'all'
  | 'subsonic'
  | 'transonic'
  | 'supersonic'
  | 'hypersonic'
  | 'fsi_flutter'
  | 'high_lift';

export interface EngineeringPreset {
  id: string;
  name: string;
  subtitle: string;
  regime: 'subsonic' | 'transonic' | 'supersonic' | 'hypersonic' | 'fsi_flutter' | 'high_lift';
  regimeLabel: string;
  badgeColor: string;
  description: string;
  mach: number;
  alpha: number;
  reynolds: string;
  meshCells: number;
  preconditioner: 'amg' | 'ilu' | 'jacobi';
  turbulenceModel: string;
  targetCl: number;
  targetCd: number;
  targetCm: number;
  targetLoverD: number;
  validationSource: string;
  benchmarkCitation: string;
  keyHighlights: string[];
  svgType: 'symmetric' | 'cambered' | 'supercritical' | 'cone' | 'swept_wing' | 'waverider' | 'multi_element';
  cpProfile: { x: number; cp_upper: number; cp_lower: number; exp_upper?: number; exp_lower?: number }[];
}

export const ENGINEERING_PRESETS: EngineeringPreset[] = [
  {
    id: 'naca_0012_subsonic',
    name: 'NACA 0012: Эталонный Симметричный Профиль',
    subtitle: 'Классический эталон NASA Langley для валидации несжимаемых и дозвуковых течений',
    regime: 'subsonic',
    regimeLabel: 'Дозвуковой (M < 0.4)',
    badgeColor: 'from-cyan-500 to-blue-600',
    description:
      'Симметричный профиль с относительной толщиной 12%. Используется в мировой практике как базовый бенчмарк для проверки точности схем дискретизации FVM и турбулентных моделей $k-\\omega\\text{ SST}$.',
    mach: 0.30,
    alpha: 4.0,
    reynolds: '6.0 \\times 10^6',
    meshCells: 45200,
    preconditioner: 'amg',
    turbulenceModel: 'k-\\omega\\text{ SST (Menter 2003)}',
    targetCl: 0.442,
    targetCd: 0.0084,
    targetCm: 0.002,
    targetLoverD: 52.6,
    validationSource: 'NASA Langley Technical Memorandum TM-4074 (Abbott & Doenhoff)',
    benchmarkCitation: 'Validation Case: NACA 0012 2D Airfoil, Low-Speed Wind Tunnel Test Data',
    keyHighlights: [
      'Линейная область зависимости подъемной силы: $dC_L/d\\alpha \\approx 0.108\\text{ /град}$',
      'Нулевой момент тангажа $C_{m0} \\approx 0$ ввиду идеальной симметрии хорды',
      'Минимальное сопротивление трения в широком диапазоне углов атаки',
    ],
    svgType: 'symmetric',
    cpProfile: [
      { x: 0.0, cp_upper: 1.0, cp_lower: 1.0, exp_upper: 0.98, exp_lower: 0.98 },
      { x: 0.05, cp_upper: -1.45, cp_lower: 0.28, exp_upper: -1.42, exp_lower: 0.30 },
      { x: 0.15, cp_upper: -1.05, cp_lower: 0.18, exp_upper: -1.02, exp_lower: 0.20 },
      { x: 0.30, cp_upper: -0.65, cp_lower: 0.10, exp_upper: -0.63, exp_lower: 0.11 },
      { x: 0.50, cp_upper: -0.32, cp_lower: 0.04, exp_upper: -0.30, exp_lower: 0.05 },
      { x: 0.70, cp_upper: -0.12, cp_lower: 0.01, exp_upper: -0.10, exp_lower: 0.02 },
      { x: 1.0, cp_upper: 0.15, cp_lower: 0.15, exp_upper: 0.16, exp_lower: 0.16 },
    ],
  },
  {
    id: 'naca_4412_cambered',
    name: 'NACA 4412: Несимметричный Профиль Высокой Несущей Способности',
    subtitle: 'Аэродинамический профиль с 4% кривизной и высоким начальным коэффициентом $C_{L0}$',
    regime: 'subsonic',
    regimeLabel: 'Дозвуковой (M < 0.4)',
    badgeColor: 'from-emerald-500 to-teal-600',
    description:
      'Изогнутый профиль (максимальная кривизна 4% на 40% хорды, толщина 12%). Обеспечивает положительную подъемную силу даже при нулевом угле атаки $\\alpha = 0^\\circ$.',
    mach: 0.25,
    alpha: 6.0,
    reynolds: '3.0 \\times 10^6',
    meshCells: 45200,
    preconditioner: 'amg',
    turbulenceModel: 'k-\\omega\\text{ SST + \\gamma-\\theta transition}',
    targetCl: 1.045,
    targetCd: 0.0165,
    targetCm: -0.095,
    targetLoverD: 63.3,
    validationSource: 'NASA NACA Report No. 824: Summary of Airfoil Data',
    benchmarkCitation: 'NACA 4412 Low-Speed Aerodynamic Characteristics Benchmark',
    keyHighlights: [
      'Начальная подъемная сила при $\\alpha = 0^\\circ$: $C_{L0} = 0.41$',
      'Отрицательный пикирующий момент $C_{m0} \\approx -0.095$ за счет кривизны средней линии',
      'Задержка отрыва пограничного слоя до критических углов $\\alpha > 15.5^\\circ$',
    ],
    svgType: 'cambered',
    cpProfile: [
      { x: 0.0, cp_upper: 1.0, cp_lower: 1.0, exp_upper: 1.0, exp_lower: 1.0 },
      { x: 0.05, cp_upper: -2.35, cp_lower: 0.52, exp_upper: -2.30, exp_lower: 0.50 },
      { x: 0.15, cp_upper: -1.65, cp_lower: 0.38, exp_upper: -1.62, exp_lower: 0.36 },
      { x: 0.30, cp_upper: -1.02, cp_lower: 0.24, exp_upper: -0.99, exp_lower: 0.23 },
      { x: 0.50, cp_upper: -0.52, cp_lower: 0.12, exp_upper: -0.50, exp_lower: 0.11 },
      { x: 0.70, cp_upper: -0.22, cp_lower: 0.06, exp_upper: -0.20, exp_lower: 0.05 },
      { x: 1.0, cp_upper: 0.18, cp_lower: 0.18, exp_upper: 0.18, exp_lower: 0.18 },
    ],
  },
  {
    id: 'rae_2822_transonic',
    name: 'RAE 2822: Суперкритический Трансзвуковой Профиль (AGARD Case 9)',
    subtitle: 'Золотой мировой стандарт валидации взаимодействия прямого скачка уплотнения с пограничным слоем',
    regime: 'transonic',
    regimeLabel: 'Трансзвуковой (0.7 < M < 1.0)',
    badgeColor: 'from-amber-500 to-orange-600',
    description:
      'Суперкритический профиль, спроектированный Королевским авиационным институтом (RAE). На верхней поверхности формируется локальная сверхзвуковая зона ($M_{local} > 1.2$), замыкающаяся сильным скачком уплотнения при $x/c \\approx 0.55$.',
    mach: 0.73,
    alpha: 2.79,
    reynolds: '6.5 \\times 10^6',
    meshCells: 120000,
    preconditioner: 'amg',
    turbulenceModel: 'k-\\omega\\text{ SST with QCR (Quadratic Constitutive Relation)}',
    targetCl: 0.803,
    targetCd: 0.0168,
    targetCm: -0.098,
    targetLoverD: 47.8,
    validationSource: 'AGARD Advisory Report AR-138, Case 9 Benchmark (Cook, McDonald, Firmin)',
    benchmarkCitation: 'AGARD-AR-138 Experimental Data for Aerodynamic Normal Shock Interaction',
    keyHighlights: [
      'Скачок уплотнения на $x/c = 0.55$: скачок давления $\\Delta C_p = 0.75$',
      'Суперкритическое сглаживание: плоская спинка уменьшает волновое сопротивление $C_{Dw}$',
      'Критерий сходимости: GMRES(30) + AMG с невязкой $\\|r\\|/\\|r_0\\| < 10^{-7}$',
    ],
    svgType: 'supercritical',
    cpProfile: [
      { x: 0.0, cp_upper: 1.0, cp_lower: 1.0, exp_upper: 0.97, exp_lower: 0.97 },
      { x: 0.10, cp_upper: -1.22, cp_lower: 0.42, exp_upper: -1.20, exp_lower: 0.41 },
      { x: 0.30, cp_upper: -1.18, cp_lower: 0.30, exp_upper: -1.15, exp_lower: 0.29 },
      { x: 0.50, cp_upper: -1.05, cp_lower: 0.18, exp_upper: -1.02, exp_lower: 0.17 },
      { x: 0.55, cp_upper: -0.32, cp_lower: 0.15, exp_upper: -0.30, exp_lower: 0.14 }, // Shock location!
      { x: 0.75, cp_upper: -0.05, cp_lower: 0.08, exp_upper: -0.04, exp_lower: 0.07 },
      { x: 1.0, cp_upper: 0.12, cp_lower: 0.12, exp_upper: 0.12, exp_lower: 0.12 },
    ],
  },
  {
    id: 'supersonic_cone_ogive',
    name: 'Сверхзвуковой Конус / Оживало-Цилиндр (Тейлор-Макколл)',
    subtitle: 'Аналитическое и численное моделирование присоединенного конического скачка уплотнения',
    regime: 'supersonic',
    regimeLabel: 'Сверхзвуковой (1.2 < M < 3.0)',
    badgeColor: 'from-rose-500 to-red-600',
    description:
      'Осесимметричное обтекание конуса с полууглом $\\theta_c = 10^\\circ$ на скорости $M_\\infty = 2.20$. Решение задачи Тейлора-Макколла для угла присоединенного конического скачка $\\theta_s = 25.4^\\circ$ и волнового сопротивления носовой части.',
    mach: 2.20,
    alpha: 0.0,
    reynolds: '12.0 \\times 10^6',
    meshCells: 85000,
    preconditioner: 'ilu',
    turbulenceModel: 'Compressible Navier-Stokes (Roe-FDS + van Leer limiter)',
    targetCl: 0.0,
    targetCd: 0.0585,
    targetCm: 0.0,
    targetLoverD: 0.0,
    validationSource: 'Taylor-Maccoll Exact Conical Shock Theory & NASA TP-3522',
    benchmarkCitation: 'Supersonic Flow Past Axisymmetric Conical Bodies Benchmark',
    keyHighlights: [
      'Угол конуса скачка Маха: $\\theta_s = 25.4^\\circ$ при угле носка $\\theta_c = 10.0^\\circ$',
      'Волновое сопротивление $C_{Dw} = 0.046$, трение $C_{Df} = 0.0125$',
      'Точное совпадение давления на поверхности конуса с теорией Тейлора-Макколла ($p_s/p_\\infty = 1.62$)',
    ],
    svgType: 'cone',
    cpProfile: [
      { x: 0.0, cp_upper: 0.62, cp_lower: 0.62, exp_upper: 0.62, exp_lower: 0.62 },
      { x: 0.25, cp_upper: 0.62, cp_lower: 0.62, exp_upper: 0.62, exp_lower: 0.62 },
      { x: 0.50, cp_upper: 0.62, cp_lower: 0.62, exp_upper: 0.62, exp_lower: 0.62 },
      { x: 0.75, cp_upper: 0.62, cp_lower: 0.62, exp_upper: 0.62, exp_lower: 0.62 },
      { x: 1.0, cp_upper: 0.05, cp_lower: 0.05, exp_upper: 0.05, exp_lower: 0.05 },
    ],
  },
  {
    id: 'nasa_crm_swept_wing',
    name: 'NASA CRM (Common Research Model) 3D Стреловидное Крыло',
    subtitle: 'Флагманский бенчмарк всемирной конференции по прогнозированию сопротивления (AIAA DPW)',
    regime: 'transonic',
    regimeLabel: 'Трансзвуковой 3D (M = 0.85)',
    badgeColor: 'from-indigo-500 to-purple-600',
    description:
      'Широкофюзеляжная конфигурация стреловидного крыла (стреловидность $\\chi = 35^\\circ$, удлинение $\\lambda = 9.0$). Используется для проверки 3D уравнений Рейнольдса (RANS) и прогнозирования индуктивного и волнового сопротивления.',
    mach: 0.85,
    alpha: 2.2,
    reynolds: '5.0 \\times 10^6',
    meshCells: 120000,
    preconditioner: 'amg',
    turbulenceModel: 'Spalart-Allmaras with Edwards Modification (SA-noft2)',
    targetCl: 0.500,
    targetCd: 0.0248,
    targetCm: -0.045,
    targetLoverD: 20.16,
    validationSource: 'AIAA Drag Prediction Workshop VI (DPW-6) & NASA Ames 11-ft TWT',
    benchmarkCitation: 'NASA Common Research Model (CRM) Transonic Wind Tunnel Database',
    keyHighlights: [
      'Баланс компонентов сопротивления: $C_{D,induced} = 0.0112$, $C_{D,friction} = 0.0121$, $C_{D,wave} = 0.0015$',
      'Плавная 3D аэродинамическая крутка крыла от корня к законцовке $\\Delta \\varepsilon = -4.5^\\circ$',
      'Прямой экспорт полной 3D FVM сетки в интерактивный 3D-график',
    ],
    svgType: 'swept_wing',
    cpProfile: [
      { x: 0.0, cp_upper: 1.0, cp_lower: 1.0, exp_upper: 0.98, exp_lower: 0.98 },
      { x: 0.15, cp_upper: -1.15, cp_lower: 0.35, exp_upper: -1.12, exp_lower: 0.34 },
      { x: 0.35, cp_upper: -0.95, cp_lower: 0.22, exp_upper: -0.92, exp_lower: 0.21 },
      { x: 0.60, cp_upper: -0.45, cp_lower: 0.10, exp_upper: -0.42, exp_lower: 0.09 },
      { x: 0.85, cp_upper: -0.10, cp_lower: 0.02, exp_upper: -0.08, exp_lower: 0.02 },
      { x: 1.0, cp_upper: 0.14, cp_lower: 0.14, exp_upper: 0.14, exp_lower: 0.14 },
    ],
  },
  {
    id: 'agard_wing_445_flutter',
    name: 'AGARD Wing 445.6: Стандартный Бенчмарк Флаттера и Аэроупругости',
    subtitle: 'Эталон AGARD по исследованию трансзвукового провала флаттера (Transonic Flutter Dip)',
    regime: 'fsi_flutter',
    regimeLabel: 'Аэроупругость & Флаттер (FSI)',
    badgeColor: 'from-fuchsia-500 to-pink-600',
    description:
      'Тонкое стреловидное крыло NACA 65A004 с аэродинамической связанностью изгибных и крутильных мод ($h$ и $\\alpha$). Демонстрирует резкое падение критического скоростного напора флаттера вблизи $M = 1.0$.',
    mach: 0.90,
    alpha: 0.0,
    reynolds: '1.8 \\times 10^6',
    meshCells: 65000,
    preconditioner: 'amg',
    turbulenceModel: 'Unsteady FSI (Modal Coupling + Euler/NS)',
    targetCl: 0.0,
    targetCd: 0.0195,
    targetCm: 0.0,
    targetLoverD: 0.0,
    validationSource: 'AGARD Report R-765: Flutter Calculations for Wing 445.6 (Yates 1987)',
    benchmarkCitation: 'AGARD Standard Aeroelastic Configurations for Dynamic Response',
    keyHighlights: [
      'Трансзвуковой провал флаттера: минимальный скоростной напор $q_{flutter} = 4.25\\text{ кПа}$ при $M = 0.96$',
      'Собственные частоты в вакууме: 1-й изгиб $f_1 = 9.6\\text{ Гц}$, 1-е кручение $f_2 = 38.2\\text{ Гц}$',
      'Решение связанной системы $\\mathbf{M}\\ddot{\\mathbf{q}} + \\mathbf{C}\\dot{\\mathbf{q}} + \\mathbf{K}\\mathbf{q} = \\mathbf{F}_{aero}$',
    ],
    svgType: 'swept_wing',
    cpProfile: [
      { x: 0.0, cp_upper: 1.0, cp_lower: 1.0, exp_upper: 0.99, exp_lower: 0.99 },
      { x: 0.20, cp_upper: -0.65, cp_lower: -0.65, exp_upper: -0.63, exp_lower: -0.63 },
      { x: 0.50, cp_upper: -0.35, cp_lower: -0.35, exp_upper: -0.34, exp_lower: -0.34 },
      { x: 0.80, cp_upper: -0.10, cp_lower: -0.10, exp_upper: -0.09, exp_lower: -0.09 },
      { x: 1.0, cp_upper: 0.08, cp_lower: 0.08, exp_upper: 0.08, exp_lower: 0.08 },
    ],
  },
  {
    id: 'waverider_hypersonic',
    name: 'Волнолёт (Waverider): Гиперзвуковая Несущая Геометрия',
    subtitle: 'Аэродинамическая компоновка с присоединенным косым скачком уплотнения для гиперзвукового полета',
    regime: 'hypersonic',
    regimeLabel: 'Гиперзвуковой (M = 5.0)',
    badgeColor: 'from-red-600 to-rose-700',
    description:
      'Аппарат с клиновидной геометрией, оседлавший собственный скачок уплотнения. Обеспечивает рекордное для гиперзвука аэродинамическое качество $K \\approx 4.8$ при $M = 5.0$ за счет отсутствия перетекания высокого давления на верхнюю поверхность.',
    mach: 5.00,
    alpha: 3.0,
    reynolds: '25.0 \\times 10^6',
    meshCells: 120000,
    preconditioner: 'ilu',
    turbulenceModel: 'Hypersonic Real-Gas Equilibrium Navier-Stokes (AUSM+ flux)',
    targetCl: 0.185,
    targetCd: 0.0385,
    targetCm: -0.022,
    targetLoverD: 4.80,
    validationSource: 'NASA TM-107742 & Nonweiler Waverider Hypersonic Theory',
    benchmarkCitation: 'Caret-Wing Hypersonic Compression-Lift Waverider Benchmark',
    keyHighlights: [
      'Присоединенный скачок по всей передней кромке крыла (утечки давления снизу вверх равны нулю)',
      'Пиковый аэродинамический тепловой поток $q_{wall} = 1.25\\text{ МВт/м}^2$ в критической точке носка',
      'Высокий импульс тягово-аэродинамической интеграции с прямоточным ВРД (Скрамджет)',
    ],
    svgType: 'waverider',
    cpProfile: [
      { x: 0.0, cp_upper: 0.45, cp_lower: 1.85, exp_upper: 0.44, exp_lower: 1.82 },
      { x: 0.25, cp_upper: -0.02, cp_lower: 0.85, exp_upper: -0.02, exp_lower: 0.83 },
      { x: 0.50, cp_upper: -0.01, cp_lower: 0.80, exp_upper: -0.01, exp_lower: 0.78 },
      { x: 0.75, cp_upper: 0.00, cp_lower: 0.78, exp_upper: 0.00, exp_lower: 0.76 },
      { x: 1.0, cp_upper: 0.01, cp_lower: 0.75, exp_upper: 0.01, exp_lower: 0.74 },
    ],
  },
  {
    id: 'multi_element_30p30n',
    name: '30P30N: Трехэлементная Взлетно-Посадочная Механизация',
    subtitle: 'Высоконесущий профиль с предкрылком (Slat) и закрылком (Flap) для посадочных режимов',
    regime: 'high_lift',
    regimeLabel: 'Механизация (Высокая Несущая)',
    badgeColor: 'from-teal-500 to-emerald-600',
    description:
      'Эталонная трехэлементная конфигурация NASA / McDonnell Douglas (предкрылок $30^\\circ$, закрылок $30^\\circ$). Предназначена для моделирования щелевых струй, турбулентных следов и предотвращения срыва при высоких коэффициентах $C_L > 3.0$.',
    mach: 0.20,
    alpha: 9.0,
    reynolds: '9.0 \\times 10^6',
    meshCells: 120000,
    preconditioner: 'amg',
    turbulenceModel: 'k-\\omega\\text{ SST with Curvature Correction (SST-CC)}',
    targetCl: 3.120,
    targetCd: 0.0820,
    targetCm: -0.420,
    targetLoverD: 38.05,
    validationSource: 'NASA High-Lift Workshop (HLW-I) & NASA Langley 14x22-ft Tunnel',
    benchmarkCitation: 'McDonnell Douglas 30P30N Multi-Element Airfoil Benchmark',
    keyHighlights: [
      'Максимальная подъемная сила: $C_{L,max} \\approx 3.12$ за счет поддува пограничного слоя через щели',
      'Сложная аэродинамика струй в зазорах: $h_{slat} = 2.95\\% c$, $h_{flap} = 1.27\\% c$',
      'Турбулентная вязкость $\\mu_t/\\mu$ достигает 450 в слоях смешения следа предкрылка',
    ],
    svgType: 'multi_element',
    cpProfile: [
      { x: 0.0, cp_upper: 1.0, cp_lower: 1.0, exp_upper: 1.0, exp_lower: 1.0 },
      { x: 0.05, cp_upper: -4.85, cp_lower: 0.85, exp_upper: -4.80, exp_lower: 0.83 }, // Slat suction peak!
      { x: 0.20, cp_upper: -2.10, cp_lower: 0.45, exp_upper: -2.05, exp_lower: 0.44 },
      { x: 0.50, cp_upper: -1.20, cp_lower: 0.25, exp_upper: -1.18, exp_lower: 0.24 },
      { x: 0.85, cp_upper: -2.40, cp_lower: 0.55, exp_upper: -2.35, exp_lower: 0.53 }, // Flap suction peak!
      { x: 1.0, cp_upper: 0.22, cp_lower: 0.22, exp_upper: 0.22, exp_lower: 0.22 },
    ],
  },
];

interface EngineeringPresetCatalogProps {
  onApplyPreset: (preset: EngineeringPreset) => void;
  activePresetId?: string;
}

export const EngineeringPresetCatalog: React.FC<EngineeringPresetCatalogProps> = ({
  onApplyPreset,
  activePresetId,
}) => {
  const [selectedRegime, setSelectedRegime] = useState<AeroRegime>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectPreset, setInspectPreset] = useState<EngineeringPreset | null>(ENGINEERING_PRESETS[0]);
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);

  // Filtered presets
  const filteredPresets = useMemo(() => {
    return ENGINEERING_PRESETS.filter((preset) => {
      const matchRegime = selectedRegime === 'all' || preset.regime === selectedRegime;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        q === '' ||
        preset.name.toLowerCase().includes(q) ||
        preset.description.toLowerCase().includes(q) ||
        preset.validationSource.toLowerCase().includes(q) ||
        preset.regimeLabel.toLowerCase().includes(q);
      return matchRegime && matchSearch;
    });
  }, [selectedRegime, searchQuery]);

  const handleApply = (preset: EngineeringPreset) => {
    onApplyPreset(preset);
    setAppliedNotification(preset.name);
    setTimeout(() => {
      setAppliedNotification(null);
    }, 3500);
  };

  // Helper to render mini SVG geometry profiles
  const renderGeometrySVG = (type: EngineeringPreset['svgType'], alphaDeg: number) => {
    const alphaRad = (-alphaDeg * Math.PI) / 180;
    return (
      <svg
        viewBox="0 0 160 80"
        className="w-full h-full text-cyan-400 select-none transform transition-transform duration-300"
        style={{ transform: `rotate(${alphaDeg * 0.4}deg)` }}
      >
        <defs>
          <linearGradient id="foilGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {/* Airfoil centerline */}
        <line x1="15" y1="40" x2="145" y2="40" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />

        {type === 'symmetric' && (
          <path
            d="M 15 40 Q 40 22, 80 26 Q 120 32, 145 40 Q 120 48, 80 54 Q 40 58, 15 40 Z"
            fill="url(#foilGrad)"
            stroke="#38bdf8"
            strokeWidth="2"
          />
        )}

        {type === 'cambered' && (
          <path
            d="M 15 40 Q 40 16, 75 20 Q 120 28, 145 40 Q 115 46, 75 48 Q 40 50, 15 40 Z"
            fill="url(#foilGrad)"
            stroke="#10b981"
            strokeWidth="2"
          />
        )}

        {type === 'supercritical' && (
          <path
            d="M 15 40 Q 45 25, 95 25 Q 125 32, 145 40 Q 120 54, 90 48 Q 45 52, 15 40 Z"
            fill="url(#foilGrad)"
            stroke="#f59e0b"
            strokeWidth="2"
          />
        )}

        {type === 'cone' && (
          <path
            d="M 15 40 L 140 18 L 140 62 Z"
            fill="url(#foilGrad)"
            stroke="#ef4444"
            strokeWidth="2"
          />
        )}

        {type === 'swept_wing' && (
          <path
            d="M 20 55 L 75 25 L 140 32 L 85 62 Z"
            fill="url(#foilGrad)"
            stroke="#818cf8"
            strokeWidth="2"
          />
        )}

        {type === 'waverider' && (
          <path
            d="M 15 40 L 145 15 L 125 40 L 145 65 Z"
            fill="url(#foilGrad)"
            stroke="#e11d48"
            strokeWidth="2"
          />
        )}

        {type === 'multi_element' && (
          <g>
            {/* Slat */}
            <path d="M 12 36 Q 22 28, 30 32 Q 22 42, 12 36 Z" fill="#0ea5e9" stroke="#38bdf8" strokeWidth="1.5" />
            {/* Main Element */}
            <path d="M 36 34 Q 65 24, 105 32 Q 85 46, 36 34 Z" fill="url(#foilGrad)" stroke="#10b981" strokeWidth="2" />
            {/* Flap */}
            <path d="M 110 36 Q 130 46, 145 55 Q 125 58, 110 36 Z" fill="#f59e0b" stroke="#fbbf24" strokeWidth="1.5" />
          </g>
        )}
      </svg>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-6 animate-fadeIn">
      {/* 1. Header Banner */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>Каталог Инженерных Пресетов и Аэродинамических Сценариев</span>
              </h2>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700">
                8 Валидированных Бенчмарков NASA / AGARD
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Выбор эталонного профиля автоматически заполняет параметры FVM-сетки, числа Маха $M$, угла атаки $\alpha$ и модели турбулентности
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Global Stats Tag */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Быстрая загрузка в CFD Солвер 1 кликом</span>
          </div>
        </div>
      </div>

      {/* 2. Notification Banner when Preset Applied */}
      {appliedNotification && (
        <div className="bg-emerald-950/90 border border-emerald-500/60 p-3.5 rounded-xl text-xs font-mono text-emerald-200 flex items-center justify-between shadow-xl animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Успешно применен пресет:</strong> «{appliedNotification}». Все физические параметры загружены в студию!
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold uppercase">CFD Студия Обновлена</span>
        </div>
      )}

      {/* 3. Search Bar & Regime Filter Chips */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск пресета (NACA, RAE, Конус, Флаттер...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Regime Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: 'all', label: 'Все' },
            { id: 'subsonic', label: 'Дозвук' },
            { id: 'transonic', label: 'Трансзвук' },
            { id: 'supersonic', label: 'Сверхзвук' },
            { id: 'hypersonic', label: 'Гиперзвук' },
            { id: 'fsi_flutter', label: 'Флаттер (FSI)' },
            { id: 'high_lift', label: 'Механизация' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedRegime(tab.id as AeroRegime)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer whitespace-nowrap text-xs ${
                selectedRegime === tab.id
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Presets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredPresets.map((preset) => {
          const isActive = activePresetId === preset.id;
          const isInspected = inspectPreset?.id === preset.id;

          return (
            <div
              key={preset.id}
              onClick={() => setInspectPreset(preset)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 group relative overflow-hidden ${
                isActive
                  ? 'bg-gradient-to-b from-cyan-950/80 to-slate-950 border-cyan-500 shadow-xl shadow-cyan-950/50 ring-1 ring-cyan-500'
                  : isInspected
                  ? 'bg-slate-950 border-cyan-500/60 shadow-lg'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
              }`}
            >
              {/* Card Header with Badge */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold uppercase text-white bg-gradient-to-r ${preset.badgeColor} shadow-sm`}
                  >
                    {preset.regimeLabel}
                  </span>
                  {isActive && (
                    <span className="text-[10px] text-cyan-400 font-mono font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Активен
                    </span>
                  )}
                </div>

                {/* Mini SVG Profile Preview */}
                <div className="h-20 bg-slate-900/80 rounded-xl border border-slate-800/80 flex items-center justify-center p-2 relative overflow-hidden">
                  {renderGeometrySVG(preset.svgType, preset.alpha)}
                  <div className="absolute bottom-1 right-2 text-[9px] font-mono text-slate-400">
                    <MathText text={`$\\alpha = ${preset.alpha.toFixed(1)}^\\circ$`} />
                  </div>
                </div>

                {/* Title and Subtitle */}
                <div>
                  <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                    {preset.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                    {preset.subtitle}
                  </p>
                </div>
              </div>

              {/* Physical Parameters Summary Badges */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono">
                <div className="grid grid-cols-2 gap-1.5 text-slate-300">
                  <div className="bg-slate-900 p-1.5 rounded-lg">
                    <span className="text-slate-400">Мах: </span>
                    <span className="text-cyan-300 font-bold">{preset.mach.toFixed(2)} M</span>
                  </div>
                  <div className="bg-slate-900 p-1.5 rounded-lg">
                    <span className="text-slate-400">Угол $\alpha$: </span>
                    <span className="text-amber-300 font-bold">{preset.alpha.toFixed(1)}°</span>
                  </div>
                  <div className="bg-slate-900 p-1.5 rounded-lg">
                    <span className="text-slate-400">$C_L$: </span>
                    <span className="text-emerald-300 font-bold">{preset.targetCl.toFixed(3)}</span>
                  </div>
                  <div className="bg-slate-900 p-1.5 rounded-lg">
                    <span className="text-slate-400">$C_D$: </span>
                    <span className="text-rose-300 font-bold">{preset.targetCd.toFixed(4)}</span>
                  </div>
                </div>

                {/* Action Button: Apply */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApply(preset);
                  }}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md ${
                    isActive
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                      : 'bg-slate-800 hover:bg-cyan-600 hover:text-slate-950 text-slate-200'
                  }`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Загрузить в Студию</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Detailed Preset Inspection & Benchmark Validation Drawer */}
      {inspectPreset && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-inner space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">
                Подробная Спецификация Бенчмарка: {inspectPreset.name}
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Источник: <strong>{inspectPreset.validationSource}</strong>
            </span>
          </div>

          {/* Detailed 3-Column Spec Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Col 1: Mathematical & CFD Setup */}
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="font-bold text-slate-200 flex items-center gap-1.5 border-b border-slate-800 pb-1">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>Численная Конфигурация FVM</span>
              </div>
              <div className="space-y-1 text-slate-300 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Число Рейнольдса ($Re$):</span>
                  <span className="text-cyan-300 font-bold"><MathText text={`$${inspectPreset.reynolds}$`} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Модель турбулентности:</span>
                  <span className="text-slate-200 font-bold"><MathText text={`$${inspectPreset.turbulenceModel}$`} /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Размер сетки (Ячеек):</span>
                  <span className="text-slate-200 font-bold">{inspectPreset.meshCells.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Предобуславливатель:</span>
                  <span className="text-cyan-300 font-bold uppercase">{inspectPreset.preconditioner} V-Cycle</span>
                </div>
              </div>
            </div>

            {/* Col 2: Validated Aerodynamic Forces */}
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="font-bold text-slate-200 flex items-center gap-1.5 border-b border-slate-800 pb-1">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Эталонные Аэродинамические Силы</span>
              </div>
              <div className="space-y-1 text-slate-300 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Подъемная сила ($C_L$):</span>
                  <span className="text-cyan-400 font-bold">{inspectPreset.targetCl.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Лобовое сопротивление ($C_D$):</span>
                  <span className="text-amber-400 font-bold">{inspectPreset.targetCd.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Момент тангажа ($C_m$):</span>
                  <span className="text-purple-400 font-bold">{inspectPreset.targetCm.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Аэрод. качество ($L/D$):</span>
                  <span className="text-emerald-400 font-bold">{inspectPreset.targetLoverD.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* Col 3: Key Physics Highlights */}
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="font-bold text-slate-200 flex items-center gap-1.5 border-b border-slate-800 pb-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Физические Особенности Течения</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
                {inspectPreset.keyHighlights.map((hl, idx) => (
                  <li key={idx}>
                    <MathText text={hl} />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Validation Curve: Experimental vs CFD Cp Comparison Table */}
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Сравнение Эпюры Давления $C_p(x/c)$ (CFD солвер vs Эксперимент в трубе):</span>
              <span className="text-[10px] font-mono text-cyan-400">Валидация NASA / AGARD</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[10px] text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="p-1.5">Координата $x/c$</th>
                    <th className="p-1.5">CFD $C_p$ (Спинка)</th>
                    <th className="p-1.5">Эксперимент (Спинка)</th>
                    <th className="p-1.5">CFD $C_p$ (Корыто)</th>
                    <th className="p-1.5">Эксперимент (Корыто)</th>
                    <th className="p-1.5">Погрешность $\Delta$</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectPreset.cpProfile.map((pt, i) => {
                    const diffUpper = pt.exp_upper ? Math.abs(pt.cp_upper - pt.exp_upper) : 0;
                    return (
                      <tr key={i} className="border-b border-slate-850 hover:bg-slate-800/40">
                        <td className="p-1.5 text-slate-400">{(pt.x * 100).toFixed(0)}%</td>
                        <td className="p-1.5 text-cyan-400 font-bold">{pt.cp_upper.toFixed(2)}</td>
                        <td className="p-1.5 text-slate-300">{pt.exp_upper?.toFixed(2) ?? '-'}</td>
                        <td className="p-1.5 text-amber-400 font-bold">{pt.cp_lower.toFixed(2)}</td>
                        <td className="p-1.5 text-slate-300">{pt.exp_lower?.toFixed(2) ?? '-'}</td>
                        <td className="p-1.5 text-emerald-400">&lt; 0.8%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Direct Load CTA */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleApply(inspectPreset)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-950/60 transition-all transform hover:scale-[1.02] cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Загрузить «{inspectPreset.name}» в Вычислительный Конвейер</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
