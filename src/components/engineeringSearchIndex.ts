import React from 'react';
import {
  Wind,
  Rocket,
  Cpu,
  Radio,
  Plane,
  Flame,
  Globe,
  Compass,
  Zap,
  Activity,
  Sliders,
  Grid,
  Disc,
  FileText,
  Crosshair,
  Boxes,
  Volume2,
  Shield,
  ShieldCheck,
  BookOpen,
  Sparkles,
  Layers,
  AlertTriangle,
  FileCode2,
} from 'lucide-react';
import { AeroDomainCategory, AeroSubTab } from './aerodynamics/AerodynamicsModule';
import { HandbookTopicId } from './EngineeringHandbookModal';
import { EngineeringDomain } from './EngineeringStudio';

export type SearchGroupType =
  | 'all'
  | 'general_aero'
  | 'uav_systems'
  | 'aircraft_supersonic'
  | 'space_gnc'
  | 'eda_avionics'
  | 'presets'
  | 'solvers';

export interface EngineeringSearchItem {
  id: string;
  title: string;
  shortTitle: string;
  group: SearchGroupType;
  domain: EngineeringDomain;
  category?: AeroDomainCategory;
  subTab?: AeroSubTab;
  handbookTopicId?: HandbookTopicId;
  presetId?: string;
  iconName: string;
  badge: string;
  badgeColor: string;
  description: string;
  formulaLatex?: string;
  keywords: string[];
}

export const ENGINEERING_SEARCH_ITEMS: EngineeringSearchItem[] = [
  // ============================================================================
  // 0. НОВЫЕ ПРИКЛАДНЫЕ ИНСТРУМЕНТЫ & КАЛЬКУЛЯТОРЫ (TOOLS & WIZARDS)
  // ============================================================================
  {
    id: 'tool_flight_computer',
    title: 'Авиационный Бортовой Компьютер & Инженерный Калькулятор (ГОСТ 4401 / ISA)',
    shortTitle: 'Борткомпьютер & Атмосфера ISA',
    group: 'general_aero',
    domain: 'aero',
    category: 'general_aero',
    subTab: 'visual_studio',
    handbookTopicId: 'overview',
    iconName: 'Wind',
    badge: 'Калькулятор ISA',
    badgeColor: 'from-cyan-500 to-sky-500 text-slate-950',
    description: 'Расчет параметров стандартной атмосферы ICAO/ГОСТ 4401 до 30 км (T, P, rho, a, mu), конвертер скоростей (TAS, EAS, Mach, kts), расчет числа Рейнольдса Re, нагрузки на крыло W/S и запаса устойчивости SM.',
    formulaLatex: 'P(h) = P_0 \\cdot \\left(1 - \\frac{L \\cdot h}{T_0}\\right)^{\\frac{g}{L \\cdot R}}, \\quad Re = \\frac{\\rho V c}{\\mu}',
    keywords: [
      'борткомпьютер', 'калькулятор', 'isa', 'атмосфера', 'гост 4401', 'высота', 'плотность', 'давление',
      'температура', 'вязкость', 'рейнольдс', 'махи', 'узлы', 'tas', 'eas', 'скорость звука', 'центровка', 'sm'
    ],
  },
  {
    id: 'tool_aircraft_wizard',
    title: 'Пошаговый Мастер Проектирования ЛА (Aircraft Design Wizard)',
    shortTitle: 'Мастер Проектирования ЛА',
    group: 'general_aero',
    domain: 'aero',
    category: 'general_aero',
    subTab: 'presets',
    handbookTopicId: 'presets',
    iconName: 'Compass',
    badge: 'САПР Wizard',
    badgeColor: 'from-indigo-500 to-purple-500 text-white',
    description: 'Интерактивный пошаговый конфигуратор от ТЗ до 3D: синтез геометрии трапециевидного крыла, выбор профиля, подбор ВМГ, расчет запаса устойчивости, поляры и дальности.',
    formulaLatex: 'C_{Di} = \\frac{C_L^2}{\\pi \\cdot AR \\cdot e}, \\quad SM = \\frac{X_F - X_{CG}}{b_{MAC}} \\times 100\\%',
    keywords: [
      'мастер', 'wizard', 'проектирование', 'сапр', 'синтез', 'размах', 'сах', 'удлинение', 'стреловидность',
      'мотор', 'винт', 'аккумулятор', 'центровка', 'устойчивость', 'поляра', 'компоновка'
    ],
  },
  {
    id: 'tool_aero_atlas',
    title: 'Интерактивный Атлас «Аэродинамика на пальцах» & Инспектор Формул',
    shortTitle: 'Атлас «Аэродинамика на пальцах»',
    group: 'general_aero',
    domain: 'aero',
    category: 'general_aero',
    subTab: 'visual_studio',
    handbookTopicId: 'architecture',
    iconName: 'BookOpen',
    badge: 'Обучение & Теория',
    badgeColor: 'from-teal-500 to-emerald-500 text-slate-950',
    description: 'Наглядный разбор физических явлений (Бернулли vs Ньютон, скос потока, концевые вихри, погранслой, сжимаемость) с интерактивными микро-песочницами и анатомией величин в СИ.',
    formulaLatex: 'L = \\rho \\cdot V_\\infty \\cdot \\Gamma, \\quad K = \\frac{C_L}{C_D}',
    keywords: [
      'атлас', 'теория', 'формулы', 'бернулли', 'ньютон', 'жуковский', 'циркуляция', 'вихри', 'погранслой',
      'качество', 'индуктивное сопротивление', 'освальд', 'сжимаемость', 'стреловидность'
    ],
  },
  {
    id: 'tool_gost_report',
    title: 'Автогенератор Пояснительной Записки по ГОСТ 2.105-95 (ЕСКД)',
    shortTitle: 'Пояснительная Записка ГОСТ',
    group: 'general_aero',
    domain: 'aero',
    category: 'general_aero',
    subTab: 'visual_studio',
    handbookTopicId: 'export_report',
    iconName: 'FileText',
    badge: 'ЕСКД / ГОСТ Отчет',
    badgeColor: 'from-sky-500 to-cyan-500 text-slate-950',
    description: 'Формирование официального научно-технического отчета с титульным листом по ГОСТ 2.105-95, исходными данными, таблицами аэродинамических коэффициентов, проверкой устойчивости и печатью в PDF.',
    formulaLatex: '\\text{ГОСТ 2.105-95 / ЕСКД}',
    keywords: [
      'гост', 'гост 2.105', 'ескд', 'пояснительная записка', 'отчет', 'pdf', 'печать', 'документация',
      'титульный лист', 'расчетно-графическая работа', 'ргр', 'диплом', 'инженерный отчет'
    ],
  },
  {
    id: 'tool_materials_db',
    title: 'База Авиационных Материалов & Калькулятор Прочности Лонжерона',
    shortTitle: 'База Материалов & Лонжерон',
    group: 'general_aero',
    domain: 'aero',
    category: 'general_aero',
    subTab: 'visual_studio',
    handbookTopicId: 'flutter',
    iconName: 'Layers',
    badge: 'Материалы ВИАМ',
    badgeColor: 'from-emerald-500 to-teal-500 text-slate-950',
    description: 'Инженерная база сплавов и композитов (Д16Т, В95, ВТ6 Титан, Carbon T700, бальза, фанера) с модулями упругости E, плотностью и расчетом массы лонжерона при изгибе.',
    formulaLatex: 'W_{\\text{треб}} = \\frac{M_{\\text{изг}}}{[\\sigma]}, \\quad m = A \\cdot L \\cdot \\rho',
    keywords: [
      'материалы', 'д16т', 'в95', 'титан', 'вт6', 'карбон', 'углепластик', 'стеклопластик', 'бальза',
      'фанера', 'лонжерон', 'прочность', 'модуль юнга', 'виам', 'сплавы'
    ],
  },
  // ============================================================================
  // 1. БПЛА, ДРОНЫ И РОЙ (UAV SYSTEMS)
  // ============================================================================
  {
    id: 'uav_dsmac_tercom',
    title: 'Автономная Навигация DSMAC (2D NCC) & TERCOM & Кривые Дубинса',
    shortTitle: 'DSMAC / TERCOM & Дубинс',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_dsmac_tercom',
    handbookTopicId: 'uav_navigation_ew',
    iconName: 'Compass',
    badge: 'БПЛА Навигация',
    badgeColor: 'from-emerald-500 to-teal-500 text-slate-950',
    description: 'Оптический коррелятор DSMAC с 2D NCC и субпиксельным пиком, профилемер высот TERCOM по DEM с сопоставлением рельефа и сбросом дрейфа ИНС, планирование траекторий Дубинса (RSR, LSL, RSL, LSR) с учетом ветрового сноса.',
    formulaLatex: '\\gamma(u,v) = \\frac{\\sum_{x,y} [I(x,y) - \\bar{I}][T(x-u,y-v) - \\bar{T}]}{\\sqrt{\\sum [I(x,y)-\\bar{I}]^2 \\sum [T-\\bar{T}]^2}}',
    keywords: [
      'dsmac', 'tercom', 'дубинс', 'dubins', 'ncc', 'оптическая навигация', 'корреляция',
      'рельеф', 'dem', 'инс', 'дрейф гироскопов', 'ветер', 'снос', 'gps denied', 'радиомолчание',
      'субпиксельный', 'пик', 'камера', 'ориентир', 'траектория'
    ],
  },
  {
    id: 'uav_ew_nav',
    title: 'РЭБ, Спуфинг GNSS & ИНС Счисление с фильтром EKF3',
    shortTitle: 'РЭБ-Навигация & EKF3',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_ew_nav',
    handbookTopicId: 'uav_navigation_ew',
    iconName: 'Radio',
    badge: 'РЭБ & GNSS',
    badgeColor: 'from-teal-500 to-emerald-500 text-slate-950',
    description: 'Моделирование подавления спутниковых сигналов GPS/ГЛОНАСС, обнаружение спуфинга (Jump/Drift), счисление координат по акселерометрам и гироскопам, расширенный фильтр Калмана EKF3.',
    formulaLatex: '\\mathbf{x}_{k} = \\mathbf{F}_k \\mathbf{x}_{k-1} + \\mathbf{B}_k \\mathbf{u}_k + \\mathbf{w}_k',
    keywords: [
      'рэб', 'подавление', 'глушилка', 'спуфинг', 'gnss', 'gps', 'глонасс', 'инс', 'imu',
      'акселерометр', 'гироскоп', 'дрейф', 'ekf', 'ekf3', 'фильтр калмана', 'бпла'
    ],
  },
  {
    id: 'uav_guidance',
    title: 'Самонаведение Pro-Nav (Пропорциональная Навигация) & Перегрузки',
    shortTitle: 'Самонаведение Pro-Nav',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_guidance',
    handbookTopicId: 'uav_navigation_ew',
    iconName: 'Crosshair',
    badge: 'Наведение & GNC',
    badgeColor: 'from-rose-500 to-red-500 text-white',
    description: 'Закон пропорционального сближения (Proportional Navigation), угловая скорость линии визирования (LOS), поперечные перегрузки Nz, захват движущейся цели с упреждением.',
    formulaLatex: 'a_c = N \\cdot V_c \\cdot \\dot{\\lambda}',
    keywords: [
      'pronav', 'pro-nav', 'пропорциональная навигация', 'самонаведение', 'головка самонаведения',
      'гсн', 'перегрузка', 'nz', 'линия визирования', 'los', 'упреждение', 'перехват', 'дрон'
    ],
  },
  {
    id: 'uav_rf_link',
    title: 'Радиолиния, Уравнение Фрииса, Зоны Френеля & БПЛА-Ретранслятор',
    shortTitle: 'Радиолиния & Френель',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_rf_link',
    handbookTopicId: 'uav_navigation_ew',
    iconName: 'Radio',
    badge: 'Связь & RF',
    badgeColor: 'from-indigo-500 to-cyan-500 text-slate-950',
    description: 'Расчет бюджета радиолинии по формуле Фрииса, клиренс 1-й зоны Френеля над холмами и лесом, расчет точки барражирования БПЛА-ретранслятора для связи за горизонтом.',
    formulaLatex: 'P_r = P_t + G_t + G_r + 20\\log_{10}\\left(\\frac{c}{4\\pi d f}\\right) - L_p',
    keywords: [
      'радиолинк', 'фриис', 'радиолиния', 'френель', 'зона френеля', 'ретранслятор', 'связь',
      'дальность', 'дбм', 'затухание', 'клиренс', 'частота', 'антенна', 'горизонт'
    ],
  },
  {
    id: 'uav_vtol',
    title: 'VTOL & Конвертопланы: Переходный Режим & Аэродинамика',
    shortTitle: 'VTOL & Конвертопланы',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_vtol',
    handbookTopicId: 'aero_cad_mdo',
    iconName: 'Plane',
    badge: 'VTOL & Конвертоплан',
    badgeColor: 'from-indigo-500 to-teal-400 text-slate-950',
    description: 'Физика поворотного крыла и поворотных гондол (Tiltrotor / Tailsitter), баланс подъемной силы крыла и тяги винтов в переходном коридоре скоростей (Transition Corridor).',
    formulaLatex: 'L_{\\text{total}} = \\frac{1}{2}\\rho V^2 S C_L + T \\sin(\\theta_{\\text{tilt}})',
    keywords: [
      'vtol', 'конвертоплан', 'тилтротор', 'tiltrotor', 'вертикальный взлет', 'переходный режим',
      'поворотный винт', 'крыло', 'зависание', 'тяга'
    ],
  },
  {
    id: 'uav_swarm',
    title: 'Рой Дронов Рейнольдса (Flocking Boids) & Децентрализованная Mesh-Сеть',
    shortTitle: 'Рой Дронов & Flocking',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_swarm',
    handbookTopicId: 'uav_swarm_control',
    iconName: 'Radio',
    badge: 'Рой & Boids',
    badgeColor: 'from-teal-400 to-emerald-400 text-slate-950',
    description: 'Симуляция стаи летательных аппаратов по трем правилам Рейнольдса: сплоченность (Cohesion), выравнивание курса (Alignment) и предотвращение столкновений (Separation) с лидером.',
    formulaLatex: '\\mathbf{F}_{i} = w_{\\text{sep}}\\mathbf{F}_{\\text{sep}} + w_{\\text{align}}\\mathbf{F}_{\\text{align}} + w_{\\text{coh}}\\mathbf{F}_{\\text{coh}}',
    keywords: [
      'рой', 'swarm', 'flocking', 'boids', 'рейнольдс', 'стая дронов', 'mesh', 'лидер',
      'координация', 'коллизии', 'сплоченность', 'выравнивание'
    ],
  },
  {
    id: 'uav_avoidance',
    title: '3D Воксельная OctoMap & Огибание Препятствий (A*, RRT*, APF)',
    shortTitle: '3D OctoMap & Огибание',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_avoidance',
    handbookTopicId: 'uav_navigation_ew',
    iconName: 'Boxes',
    badge: '3D САПР & Навигация',
    badgeColor: 'from-indigo-500 to-sky-400 text-slate-950',
    description: 'Построение воксельного дерева занятости OctoMap по данным Лидара/глубины, поиск бесколлизионных траекторий алгоритмами A*, RRT* и градиентными потенциальными полями APF.',
    formulaLatex: 'U_{\\text{total}}(\\mathbf{q}) = U_{\\text{att}}(\\mathbf{q}) + \\sum U_{\\text{rep},i}(\\mathbf{q})',
    keywords: [
      'octomap', 'огибание', 'препятствия', 'лидар', 'lidar', 'rrt', 'rrt*', 'a*', 'apf',
      'потенциальные поля', 'воксели', '3d карта', 'траектория', 'безопасность'
    ],
  },
  {
    id: 'uav_acoustics',
    title: 'Аэроакустика Дронов & Шум Винтов (Формула Фокса Уильямса-Хокингса FW-H)',
    shortTitle: 'FW-H Аэроакустика',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_acoustics',
    handbookTopicId: 'aeroacoustics',
    iconName: 'Volume2',
    badge: 'Акустика & Шум',
    badgeColor: 'from-rose-500 to-amber-500 text-slate-950',
    description: 'Расчет акустического давления и диаграммы направленности шума лопастей пропеллера: шум толщины (Thickness Noise), шум нагружения (Loading Noise) и квадрупольные вихревые шумы.',
    formulaLatex: '4\\pi p\'(\\mathbf{x},t) = \\frac{\\partial}{\\partial t} \\int \\left[ \\frac{\\rho_0 v_n}{r|1-M_r|} \\right] dS - \\frac{\\partial}{\\partial x_i} \\int \\left[ \\frac{l_i}{r|1-M_r|} \\right] dS',
    keywords: [
      'акустика', 'fw-h', 'шум', 'пропеллер', 'дб', 'dba', 'фокс уильямс хокингс', 'звук',
      'малошумный', 'вихри', 'лопасть', 'гармоники bpf'
    ],
  },
  {
    id: 'uav_fault_tolerance',
    title: 'Отказоустойчивость Мультикоптеров (FTC & QP Распределение Тяги)',
    shortTitle: 'Отказ Моторов (FTC)',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_fault_tolerance',
    handbookTopicId: '6dof',
    iconName: 'Shield',
    badge: 'Отказоустойчивость',
    badgeColor: 'from-amber-400 to-rose-500 text-slate-950',
    description: 'Управление гексакоптером и октокоптером при внезапном отказе 1 или 2 двигателей: перераспределение матриц смешивания (Mixer Matrix) и переход в режим контролируемого вращения.',
    formulaLatex: '\\min_{\\mathbf{u}} \\|\\mathbf{B}\\mathbf{u} - \\mathbf{\\nu}_{\\text{des}}\\|^2 + \\lambda \\|\\mathbf{u}\\|^2 \\quad \\text{s.t.} \\; \\mathbf{u}_{\\min} \\le \\mathbf{u} \\le \\mathbf{u}_{\\max}',
    keywords: [
      'отказ мотора', 'гексакоптер', 'октокоптер', 'авария', 'ftc', 'qp', 'fault tolerance',
      'квадрокоптер', 'вращение', 'микшер', 'безопасная посадка'
    ],
  },
  {
    id: 'uav_hybrid_icing',
    title: 'Гибридные Силовые Установки (ДВС+LiPo) & Обледенение в Полете',
    shortTitle: 'Гибриды & Обледенение',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_hybrid_icing',
    handbookTopicId: 'aero_cad_mdo',
    iconName: 'Flame',
    badge: 'Гибрид & Лед',
    badgeColor: 'from-teal-400 to-indigo-500 text-slate-950',
    description: 'Моделирование гибридного привода (ДВС-генератор + LiPo буфер) для увеличения дальности полета и расчет нарастания льда на передней кромке крыла (LWC, капли воды, срыв потока).',
    formulaLatex: '\\frac{dM_{\\text{ice}}}{dt} = \\beta \\cdot \\text{LWC} \\cdot V_{\\infty} \\cdot S_{\\text{proj}}',
    keywords: [
      'гибрид', 'двс', 'генератор', 'обледенение', 'лед', 'lwc', 'lipo', 'edf', 'дальность',
      'потеря подъемной силы', 'зимний полет'
    ],
  },
  {
    id: 'uav_loitering_dive',
    title: 'Барражирующие Боеприпасы & Аэродинамика Пикирования (Ланцет)',
    shortTitle: 'Пикирование Ланцетов',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_loitering_dive',
    handbookTopicId: 'aero_cad_mdo',
    iconName: 'Crosshair',
    badge: 'X-Крыло & Пике',
    badgeColor: 'from-rose-500 to-red-600 text-white',
    description: 'Аэродинамика X-образного тандемного крыла (X-Wing), балансировка на высоких скоростях пикирования, устойчивость по тангажу при переходе от барражирования к атаке цели.',
    formulaLatex: 'm \\frac{dV}{dt} = T - D - mg \\sin(\\theta_{\\text{dive}})',
    keywords: [
      'ланцет', 'барражирующий боеприпас', 'пикирование', 'x-крыло', 'x-wing', 'тандемное крыло',
      'атака', 'камикадзе', 'дрон', 'баллистика', 'скорость пике'
    ],
  },
  {
    id: 'uav_studio',
    title: 'Студия Проектирования БПЛА & Винтомоторной Группы (ВМГ)',
    shortTitle: 'Студия БПЛА & ВМГ',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_studio',
    handbookTopicId: 'bem_propulsion',
    iconName: 'Radio',
    badge: 'САПР БПЛА',
    badgeColor: 'from-teal-400 to-cyan-500 text-slate-950',
    description: 'Инженерный расчет квадрокоптеров и дронов: тяговооруженность T/W, время висения, выбор моторов KV, шага пропеллера, емкости LiPo аккумулятора и аэродинамики рамы.',
    formulaLatex: 'T_{\\text{hover}} = m \\cdot g, \\quad P_{\\text{elec}} = \\frac{T \\cdot v_i}{\\eta_{\\text{total}}}',
    keywords: [
      'вмг', 'квадрокоптер', 'дрон', 'мотор', 'пропеллер', 'kv', 'lipo', 'висение', 'время полета',
      'тяговооруженность', 'аккумулятор', 'бпла'
    ],
  },

  // ============================================================================
  // 2. ОБЩАЯ АЭРОДИНАМИКА И ФУНДАМЕНТАЛЬНЫЕ СОЛВЕРЫ (GENERAL AERO)
  // ============================================================================
  {
    id: 'aero_presets',
    title: 'Каталог Инженерных Пресетов Летательных Аппаратов',
    shortTitle: 'Каталог Пресетов',
    group: 'presets',
    domain: 'aero',
    category: 'general_aero',
    subTab: 'presets',
    handbookTopicId: 'presets',
    iconName: 'BookOpen',
    badge: 'Пресеты ЛА',
    badgeColor: 'from-indigo-500 via-purple-500 to-pink-500 text-white',
    description: 'Готовые аэродинамические модели с верифицированными сетками и коэффициентами: Airbus A350, F-22 Raptor, Ан-2 «Кукурузник», Поезд Сапсан, БПЛА Летающее Крыло, Лопасть Ветрогенератора, РН Союз-ФГ.',
    formulaLatex: 'C_L = \\frac{L}{\\frac{1}{2}\\rho V^2 S}, \\quad C_D = \\frac{D}{\\frac{1}{2}\\rho V^2 S}',
    keywords: [
      'пресеты', 'каталог', 'модели', 'airbus', 'a350', 'f-22', 'raptor', 'ан-2', 'кукурузник',
      'сапсан', 'ракета', 'союз', 'ветрогенератор', 'бпла крыло', 'naca'
    ],
  },
  {
    id: 'aero_visual_studio',
    title: '3D Визуальная Лаборатория Аэродинамики Крыла & Скачков Уплотнения',
    shortTitle: '3D Визуальная Лаборатория',
    group: 'general_aero',
    domain: 'aero',
    category: 'general_aero',
    subTab: 'visual_studio',
    handbookTopicId: 'visual_studio',
    iconName: 'Sparkles',
    badge: '3D Лаборатория',
    badgeColor: 'from-cyan-400 to-blue-500 text-slate-950',
    description: 'Интерактивный 3D рендеринг крыла с регулировкой профилей NACA, угла стреловидности, сужения, крутки, угла атаки, полей давлений Cp и отображением скачков уплотнения Маха.',
    formulaLatex: 'C_p = \\frac{p - p_\\infty}{\\frac{1}{2}\\rho_\\infty V_\\infty^2} = 1 - \\left(\\frac{V}{V_\\infty}\\right)^2',
    keywords: [
      '3d', 'визуализация', 'лаборатория', 'крыло', 'профиль', 'стреловидность', 'naca',
      'поле давлений', 'cp', 'скачок уплотнения', 'обтекание', 'угол атаки', 'мах'
    ],
  },
  {
    id: 'aero_vlm',
    title: '3D Метод Вихревой Решетки (Vortex Lattice Method - VLM)',
    shortTitle: '3D VLM Солвер',
    group: 'solvers',
    domain: 'aero',
    category: 'general_aero',
    subTab: 'vlm',
    handbookTopicId: 'vlm',
    iconName: 'Grid',
    badge: 'VLM Солвер',
    badgeColor: 'from-indigo-500 to-emerald-400 text-slate-950',
    description: 'Расчет пространственного обтекания тонкого несущего крыла произвольной формы: П-образные вихри Хорсшу, вихревые кольца, индукция Био-Савара, распределение циркуляции $\\Gamma(y)$ и скос потока.',
    formulaLatex: '\\mathbf{w}(\\mathbf{r}) = \\frac{\\Gamma}{4\\pi} \\oint \\frac{d\\mathbf{l} \\times (\\mathbf{r} - \\mathbf{r}_0)}{|\\mathbf{r} - \\mathbf{r}_0|^3}',
    keywords: [
      'vlm', 'вихревая решетка', 'метод вихревой решетки', 'биот савар', 'био-савара',
      'циркуляция', 'гамма', 'индуцированное сопротивление', 'скос потока', 'подъемная сила'
    ],
  },
  {
    id: 'aero_bem',
    title: 'Теория Элемента Лопасти (BEM) & Аэродинамика Пропеллеров',
    shortTitle: 'BEM: Винты & Импеллеры',
    group: 'solvers',
    domain: 'aero',
    category: 'general_aero',
    subTab: 'bem',
    handbookTopicId: 'bem_propulsion',
    iconName: 'Disc',
    badge: 'BEM Теория',
    badgeColor: 'from-cyan-400 to-purple-500 text-slate-950',
    description: 'Интеграция теории импульса диска и теории элемента лопасти (Blade Element Momentum): осевая и тангенциальная индукция $a$ и $a\'$, концевые потери Прандтля, расчет тяги $T$, мощности $P$ и КПД $\\eta$.',
    formulaLatex: 'dT = 4\\pi r \\rho V_\\infty^2 (1 - a) a F dr, \\quad dQ = 4\\pi r^3 \\rho V_\\infty \\Omega (1 - a) a\' F dr',
    keywords: [
      'bem', 'blade element momentum', 'пропеллер', 'винт', 'лопасть', 'импеллер',
      'индукция', 'шаг винта', 'кпд', 'тяга', 'крутящий момент', 'прандтль'
    ],
  },
  {
    id: 'aero_wind_tunnel',
    title: 'Виртуальная Аэродинамическая Труба (CFD 2D Wind Tunnel)',
    shortTitle: 'Аэродинамическая Труба',
    group: 'general_aero',
    domain: 'aero',
    category: 'general_aero',
    subTab: 'wind_tunnel',
    handbookTopicId: 'wind_tunnel',
    iconName: 'Wind',
    badge: 'CFD Труба',
    badgeColor: 'from-cyan-500 to-indigo-600 text-slate-950',
    description: 'Численная аэродинамическая труба для продувки профилей крыла: векторное поле скоростей, линии тока, срыв потока, распределение давления Cp по хорде и график $C_L(\\alpha)$.',
    formulaLatex: '\\nabla \\cdot \\mathbf{u} = 0, \\quad \\rho (\\mathbf{u} \\cdot \\nabla) \\mathbf{u} = -\\nabla p + \\mu \\nabla^2 \\mathbf{u}',
    keywords: [
      'труба', 'аэродинамическая труба', 'продувка', 'cfd', 'навье стокс', 'линии тока',
      'векторы скорости', 'срыв потока', 'хорда', 'профиль'
    ],
  },
  {
    id: 'aero_flutter',
    title: 'Моделирование Флаттера & Аэроупругости Крыла (FSI)',
    shortTitle: 'Флаттер (FSI)',
    group: 'general_aero',
    domain: 'aero',
    category: 'general_aero',
    subTab: 'flutter',
    handbookTopicId: 'flutter',
    iconName: 'AlertTriangle',
    badge: 'FSI & Флаттер',
    badgeColor: 'from-rose-500 to-amber-500 text-slate-950',
    description: 'Анализ взаимодействия потока и конструкции крыла: совмещенные изгибно-крутильные автоколебания, расчет критической скорости флаттера $V_f$, фазовый сдвиг, декремент затухания и дивергенция.',
    formulaLatex: '\\mathbf{M} \\ddot{\\mathbf{q}} + \\mathbf{C} \\dot{\\mathbf{q}} + \\mathbf{K} \\mathbf{q} = \\mathbf{Q}_{\\text{aero}}(\\mathbf{q}, \\dot{\\mathbf{q}}, V)',
    keywords: [
      'флаттер', 'flutter', 'аэроупругость', 'fsi', 'автоколебания', 'кручение', 'изгиб',
      'критическая скорость', 'дивергенция', 'разрушение крыла', 'затухание'
    ],
  },
  {
    id: 'aero_6dof',
    title: 'Динамика 6-DoF Полета & Пространственная Устойчивость',
    shortTitle: 'Динамика 6-DoF',
    group: 'general_aero',
    domain: 'aero',
    category: 'general_aero',
    subTab: '6dof',
    handbookTopicId: '6dof',
    iconName: 'Compass',
    badge: '6-DoF Динамика',
    badgeColor: 'from-emerald-500 to-teal-500 text-slate-950',
    description: 'Полная 6-степенная система уравнений динамики твердого тела в связной системе координат: крен ($p$), тангаж ($q$), рыскание ($r$), отклонение элеронов, рулей высоты и направления.',
    formulaLatex: '\\mathbf{I} \\dot{\\boldsymbol{\\omega}} + \\boldsymbol{\\omega} \\times (\\mathbf{I}\\boldsymbol{\\omega}) = \\mathbf{M}_{\\text{aero}} + \\mathbf{M}_{\\text{thrust}}',
    keywords: [
      '6dof', '6-dof', 'динамика полета', 'устойчивость', 'тангаж', 'крен', 'рыскание',
      'руль высоты', 'элероны', 'руль направления', 'уравнения эйлера', 'кватернионы'
    ],
  },
  {
    id: 'aero_physics_solvers',
    title: 'Продвинутые Аэродинамические Солверы (RANS, Погранслой, Газодинамика)',
    shortTitle: 'Расширенные Солверы',
    group: 'solvers',
    domain: 'aero',
    category: 'general_aero',
    subTab: 'physics_solvers',
    handbookTopicId: 'physics_solvers',
    iconName: 'Cpu',
    badge: 'Солверы & PDE',
    badgeColor: 'from-cyan-500 via-blue-500 to-indigo-600 text-slate-950',
    description: 'Лаборатория физических солверов: интегратор пограничного слоя Прандтля, сжимаемость Прандтля-Глауэрта, косые скачки уплотнения, теория Годунова и уравнения Навье-Стокса.',
    formulaLatex: 'C_{p,\\text{comp}} = \\frac{C_{p,\\text{incomp}}}{\\sqrt{1 - M_\\infty^2}}, \\quad \\delta(x) = \\frac{5.0 x}{\\sqrt{Re_x}}',
    keywords: [
      'солверы', 'пограничный слой', 'прандтль глауэрт', 'rans', 'годунов', 'скачки',
      'сжимаемость', 'газодинамика', 'вязкость', 'рейнольдс'
    ],
  },
  {
    id: 'aero_status_monitor',
    title: 'Монитор Сил, Сходимости Сетки & 3D Графики Аэродинамики',
    shortTitle: 'Монитор Сил & 3D',
    group: 'general_aero',
    domain: 'aero',
    category: 'general_aero',
    subTab: 'status_monitor',
    handbookTopicId: 'status_monitor',
    iconName: 'Activity',
    badge: 'Монитор & 3D',
    badgeColor: 'from-cyan-500 to-purple-500 text-slate-950',
    description: 'Панель телеметрии аэродинамических сил: $C_L$, $C_D$, $C_M$, аэродинамическое качество $K = L/D$, невязки уравнений, число итераций и трехмерный интерактивный график изоповерхностей.',
    formulaLatex: 'K = \\frac{C_L}{C_D} = \\frac{L}{D}, \\quad \\text{Residual} = \\|\\mathbf{A}\\mathbf{x} - \\mathbf{b}\\|_2 < 10^{-6}',
    keywords: [
      'монитор', 'силы', 'cl', 'cd', 'cm', 'качество', 'невязка', 'сходимость',
      '3d график', 'телеметрия', 'сетка'
    ],
  },
  {
    id: 'aero_architecture',
    title: 'Архитектура Высокопроизводительного Солвера (CSR, AMG, GPU CUDA)',
    shortTitle: 'Архитектура Солвера',
    group: 'solvers',
    domain: 'aero',
    category: 'general_aero',
    subTab: 'architecture',
    handbookTopicId: 'architecture',
    iconName: 'Cpu',
    badge: 'Архитектура HPC',
    badgeColor: 'from-indigo-500 to-purple-500 text-white',
    description: 'Конвейер параллельных вычислений: разреженный формат CSR (Compressed Sparse Row), многосеточный предобуславливатель AMG (Algebraic Multigrid), крыловские солверы BiCGStab/GMRES и GPU OpenMP.',
    formulaLatex: '\\mathbf{x}_{k+1} = \\mathbf{x}_k + \\alpha_k \\mathbf{p}_k, \\quad \\mathbf{M}^{-1}\\mathbf{A}\\mathbf{x} = \\mathbf{M}^{-1}\\mathbf{b}',
    keywords: [
      'архитектура', 'csr', 'amg', 'мультигрид', 'bicgstab', 'gmres', 'крылов',
      'cuda', 'openmp', 'параллельные вычисления', 'память'
    ],
  },
  {
    id: 'aero_export_report',
    title: 'Студия Экспорта Инженерных Отчетов (PDF, LaTeX, CSV, JSON)',
    shortTitle: 'Экспорт и Отчётность',
    group: 'general_aero',
    domain: 'aero',
    category: 'general_aero',
    subTab: 'export_report',
    handbookTopicId: 'export_report',
    iconName: 'FileText',
    badge: 'Экспорт & CAE',
    badgeColor: 'from-emerald-500 via-teal-500 to-cyan-500 text-slate-950',
    description: 'Генерация полных инженерных протоколов аэродинамических испытаний, экспорт матриц в формате MatrixMarket, выгрузка сырых полей давлений в CSV/JSON и верстка статей в LaTeX/PDF.',
    formulaLatex: '\\text{Report} \\to \\{\\text{PDF, LaTeX, CSV, JSON, MatrixMarket}\\}',
    keywords: [
      'экспорт', 'отчет', 'pdf', 'latex', 'csv', 'json', 'протокол', 'печать',
      'документация', 'выгрузка данных'
    ],
  },

  // ============================================================================
  // 3. САМОЛЕТЫ, КУКУРУЗНИК, СВЕРХЗВУК И КОСМИЧЕСКИЕ СТУПЕНИ
  // ============================================================================
  {
    id: 'biplane_an2',
    title: '«Кукурузник» Ан-2 & STOL (Бипланная Коробка Мюнка & Бессрывность)',
    shortTitle: 'Кукурузник / Ан-2',
    group: 'aircraft_supersonic',
    domain: 'aero',
    category: 'biplane_an2',
    subTab: 'biplane_an2',
    handbookTopicId: 'presets',
    presetId: 'an2_biplane',
    iconName: 'Plane',
    badge: 'Ан-2 & STOL',
    badgeColor: 'from-amber-500 to-yellow-500 text-slate-950',
    description: 'Аэродинамика биплана Ан-2: расчет взаимной индукции крыльев по формуле Мюнка (Munk Biplane Factor), автоматические щелевые предкрылки, бессрывное парашютирование при срыве и взлет с 150м.',
    formulaLatex: 'D_i = \\frac{L_1^2}{\\pi q b_1^2} + 2\\sigma \\frac{L_1 L_2}{\\pi q b_1 b_2} + \\frac{L_2^2}{\\pi q b_2^2}',
    keywords: [
      'ан-2', 'ан2', 'кукурузник', 'биплан', 'stol', 'мюнк', 'предкрылки', 'бессрывный',
      'парашютирование', 'грунтовый аэродром', 'короткий взлет', 'сельхоз'
    ],
  },
  {
    id: 'commercial_airliners',
    title: 'Магистральные Лайнеры & Трансзвуковой Крейсер (Бреге & ETOPS)',
    shortTitle: 'Лайнеры & Крейсер',
    group: 'aircraft_supersonic',
    domain: 'aero',
    category: 'commercial_airliners',
    subTab: 'commercial_airliners',
    handbookTopicId: 'presets',
    presetId: 'airbus_a350',
    iconName: 'Plane',
    badge: 'Трансзвук & ETOPS',
    badgeColor: 'from-sky-500 to-indigo-500 text-white',
    description: 'Аэродинамика дальнемагистральных лайнеров (Airbus A350, Boeing 777): сверхкритические профили крыла, число Маха волнового кризиса $M_{\\text{div}}$, стреловидность, формула дальности Бреге и нормы ETOPS-330.',
    formulaLatex: 'R = \\frac{V}{c_t} \\frac{C_L}{C_D} \\ln\\left(\\frac{W_{\\text{initial}}}{W_{\\text{final}}}\\right), \\quad M_{\\text{div}} \\approx M_{\\text{crit}} + 0.08',
    keywords: [
      'лайнер', 'аэробус', 'airbus', 'a350', 'boeing', 'бреге', 'дальность', 'etops',
      'сверхкритическое крыло', 'стреловидность', 'волновой кризис', 'm_div', 'пассажирский'
    ],
  },
  {
    id: 'supersonic_aviation',
    title: 'Сверхзвуковая Авиация & Mach 2.0+ (Рэнкин-Гюгонио & Правило Площадей)',
    shortTitle: 'Сверхзвук & Mach+',
    group: 'aircraft_supersonic',
    domain: 'aero',
    category: 'supersonic_aviation',
    subTab: 'supersonic_aviation',
    handbookTopicId: 'supersonic_hypersonic',
    presetId: 'f22_raptor',
    iconName: 'Flame',
    badge: 'Mach 1.2 – 6.0+',
    badgeColor: 'from-rose-500 to-red-600 text-white',
    description: 'Сверхзвуковая и гиперзвуковая аэродинамика: косые и прямые скачки уплотнения (уравнения Рэнкина-Гюгонио), правило площадей Уиткомба (Area Rule), аэродинамический нагрев кромок и звуковой удар (Sonic Boom).',
    formulaLatex: '\\frac{p_2}{p_1} = 1 + \\frac{2\\gamma}{\\gamma + 1}(M_1^2 \\sin^2\\beta - 1), \\quad T_{\\text{recovery}} = T_\\infty \\left(1 + r \\frac{\\gamma - 1}{2} M_\\infty^2\\right)',
    keywords: [
      'сверхзвук', 'мах', 'f-22', 'истребитель', 'рэнкин гюгонио', 'уиткомб', 'правило площадей',
      'area rule', 'звуковой удар', 'нагрев', 'скачок уплотнения', 'конус маха'
    ],
  },
  {
    id: 'space_launch_aerodynamics',
    title: 'Ракеты-Носители & Аэродинамика Спуска (Max-Q & Аллен-Эггерс)',
    shortTitle: 'Ракеты & Космос',
    group: 'aircraft_supersonic',
    domain: 'aero',
    category: 'space_launch_reentry',
    subTab: 'space_launch_reentry',
    handbookTopicId: 'presets',
    presetId: 'soyuz_rocket',
    iconName: 'Rocket',
    badge: 'Max-Q & Reentry',
    badgeColor: 'from-indigo-500 to-purple-600 text-white',
    description: 'Аэродинамика взлета ракет-носителей и гиперзвукового спуска: профиль динамического напора $q_{\\max}$ (Max-Q), теория затупленного тела Аллена-Эггерса для снижения теплового потока в корпус.',
    formulaLatex: 'q_{\\max} = \\max_t \\left( \\frac{1}{2}\\rho(h(t)) V(t)^2 \\right), \\quad q_{\\text{heat}} \\propto \\frac{1}{\\sqrt{R_{\\text{nose}}}}',
    keywords: [
      'ракета', 'союз', 'взлет', 'max-q', 'динамический напор', 'аллен эггерс', 'спуск',
      'атмосфера', 'теплозащита', 'космос', 'головной обтекатель'
    ],
  },

  // ============================================================================
  // 4. КОСМОЛОГИЯ, АСТРОДИНАМИКА И GNC (SPACE DOMAIN)
  // ============================================================================
  {
    id: 'space_gnc_lambert',
    title: 'Межпланетная Астродинамика (Краевая Задача Ламберта & Перелет на Марс)',
    shortTitle: 'Задача Ламберта & GNC',
    group: 'space_gnc',
    domain: 'space',
    handbookTopicId: 'space_gnc',
    iconName: 'Rocket',
    badge: 'Космос & GNC',
    badgeColor: 'from-indigo-500 to-purple-500 text-white',
    description: 'Орбитальные маневры Земля-Марс, Земля-Луна и ГПО-ГСО: расчет характеристической скорости $\\Delta v$, времени перелета ToF, гиперболического избытка скорости $C_3$ и траекторий Ламберта.',
    formulaLatex: '\\sqrt{\\mu}\\Delta t = a^{3/2}(\\alpha - \\beta - (\\sin\\alpha - \\sin\\beta))',
    keywords: [
      'космос', 'ламберт', 'гоман', 'орбита', 'марс', 'луна', 'гсо', 'дельта v',
      'вектор тяги', 'tvc', 'гнс', 'астродинамика', 'перелет'
    ],
  },
  {
    id: 'space_tvc_kalman',
    title: 'Управление Вектором Тяги (TVC Gimbal) & Фильтр Калмана (EKF)',
    shortTitle: 'TVC Вектор Тяги & EKF',
    group: 'space_gnc',
    domain: 'space',
    handbookTopicId: 'space_gnc',
    iconName: 'Compass',
    badge: 'TVC & Калман',
    badgeColor: 'from-indigo-600 to-cyan-400 text-slate-950',
    description: 'Управление ориентацией ракеты отклонением сопла двигателя (Thrust Vector Control) и фильтрация зашумленных данных звездных датчиков и IMU расширенным фильтром Калмана EKF.',
    formulaLatex: '\\mathbf{K}_k = \\mathbf{P}_k^- \\mathbf{H}_k^T (\\mathbf{H}_k \\mathbf{P}_k^- \\mathbf{H}_k^T + \\mathbf{R}_k)^{-1}',
    keywords: [
      'tvc', 'вектор тяги', 'кардан', 'сопло', 'калман', 'ekf', 'ориентация',
      'звездный датчик', 'акселерометр', 'космический аппарат'
    ],
  },

  // ============================================================================
  // 5. МИКРОЭЛЕКТРОНИКА, EDA, ЧИПЫ И АВИОНИКА (EDA DOMAIN)
  // ============================================================================
  {
    id: 'eda_tmr_avionics',
    title: 'Тройное Модульное Резервирование Авионики (TMR Fault-Tolerance & SEU)',
    shortTitle: 'TMR Резервирование',
    group: 'eda_avionics',
    domain: 'eda',
    handbookTopicId: 'eda_avionics',
    iconName: 'ShieldCheck',
    badge: 'EDA & TMR',
    badgeColor: 'from-purple-500 to-pink-500 text-white',
    description: 'Защита бортовых компьютеров от сбоев космической радиации (SEU / Single Event Upset): трехъядерная синхронная архитектура, мажоритарное голосование 2:1 и автоматическое самоисцеление.',
    formulaLatex: 'Y = (A \\land B) \\lor (B \\land C) \\lor (A \\land C)',
    keywords: [
      'tmr', 'авионика', 'резервирование', 'seu', 'сбой бита', 'мажоритарный', 'вентиль',
      'радиация', 'космические лучи', 'процессор', 'отказоустойчивость'
    ],
  },
  {
    id: 'eda_place_and_route',
    title: 'EDA Трассировка Кристалла, Графы METIS/AMD & Уравнения Максвелла',
    shortTitle: 'EDA Place & Route',
    group: 'eda_avionics',
    domain: 'eda',
    handbookTopicId: 'eda_avionics',
    iconName: 'Cpu',
    badge: 'EDA & Чипы',
    badgeColor: 'from-purple-600 to-indigo-500 text-white',
    description: 'Оптимизация топологии СБИС (Place & Route): минимизация длины проводников графовыми разбиениями AMD/RCM, расчет паразитной емкости и решение электродинамики Максвелла на кристалле.',
    formulaLatex: '\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}, \\quad \\nabla \\times \\mathbf{H} = \\mathbf{J} + \\frac{\\partial \\mathbf{D}}{\\partial t}',
    keywords: [
      'eda', 'чипы', 'микроэлектроника', 'place and route', 'трассировка', 'максвелл',
      'паразитная емкость', 'сбис', 'интегральная схема', 'metis', 'rad-hard'
    ],
  },
];
