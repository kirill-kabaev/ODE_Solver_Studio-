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
    id: 'tool_uav_visual_graph',
    title: 'Визуальная Схема Связей БПЛА (Интерактивный D3.js Граф Взаимозависимостей)',
    shortTitle: 'D3.js Граф Связей Узлов БПЛА',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_visual_graph',
    handbookTopicId: 'aero_cad_mdo',
    iconName: 'GitFork',
    badge: 'D3.js Force Граф',
    badgeColor: 'from-teal-400 to-cyan-500 text-slate-950',
    description: 'Интерактивная карта системных взаимозависимостей узлов БПЛА: влияние изменения параметров крыла (размах, хорда, профиль, стреловидность) на массу, аэродинамику (L/D, поляра), прочность (лонжерон лопнет/выдержит), ВМГ (тяга, RPM) и динамику полета (время виража, устойчивость). Матрица чувствительности Якобиана и симуляция 6-DoF.',
    formulaLatex: 'J_{ij} = \\frac{\\partial Y_i}{\\partial X_j}, \\quad L/D = \\frac{C_L}{C_{D0} + \\frac{C_L^2}{\\pi AR e}}, \\quad \\sigma = \\frac{M_{bend} \\cdot y}{I_z}',
    keywords: [
      'граф связей', 'визуальная схема', 'd3', 'd3.js', 'взаимозависимости', 'узел', 'крыло', 'параметры крыла',
      'чувствительность', 'якобиан', 'динамика', 'система', 'бпла', 'дрон', 'матрица', 'лонжерон', 'аккумулятор'
    ],
  },
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
  {
    id: 'uav_pid_autopilot_tool',
    title: 'САУ & PID Автопилот БПЛА (БФЧХ / ЛАЧХ / Диаграмма Найквиста / Рунге-Кутта 4)',
    shortTitle: 'САУ & PID Автопилот БПЛА',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_pid_autopilot',
    handbookTopicId: 'uav_navigation_ew',
    iconName: 'Activity',
    badge: 'PID Автопилот / САУ',
    badgeColor: 'from-indigo-500 via-purple-500 to-pink-500 text-white',
    description: 'Интерактивный тренажер настройки регуляторов САУ: численная интеграция RK4 для FPV, гексакоптеров, самолетов и VTOL, построение ЛАЧХ/ФЧХ Боде, годографа Найквиста, расчет запасов устойчивости по фазе и амплитуде.',
    formulaLatex: 'u(t) = K_p e(t) + K_i \\int_0^t e(\\tau) d\\tau + K_d \\frac{d e(t)}{dt}, \\quad W(s) = \\frac{K_p s + K_i + K_d s^2}{s (J s^2 + D s)}',
    keywords: [
      'pid', 'пид', 'автопилот', 'сау', 'боде', 'найквист', 'рунге кутта', 'rk4', 'fpv', 'дрон', 'квадрокоптер',
      'vtol', 'акро', 'угол тангажа', 'крен', 'перерегулирование', 'маржа устойчивости', 'частотный анализ'
    ],
  },
  {
    id: 'rocket_staging_optimizer_tool',
    title: 'Оптимизатор Многоступенчатых Ракет (Циолковский / Гравитационный Разворот / Max-Q / Траектория)',
    shortTitle: 'Многоступенчатая Ракетодинамика',
    group: 'general_aero',
    domain: 'aero',
    category: 'general_aero',
    subTab: 'rocket_staging_optimizer',
    handbookTopicId: 'space_gnc',
    iconName: 'Rocket',
    badge: 'Ракетодинамика Δv',
    badgeColor: 'from-purple-500 via-indigo-500 to-rose-500 text-white',
    description: 'Расчет многоступенчатых ракет-носителей (1-3 ступени) по уравнению Мещерского-Циолковского, гравитационный разворот (Gravity Turn), распределение масс, плотность динамического напора Max-Q и 2D орбитальная траектория.',
    formulaLatex: '\\Delta v = I_{sp} \\cdot g_0 \\cdot \\ln\\left(\\frac{m_0}{m_f}\\right), \\quad q_{max} = \\frac{1}{2} \\rho v^2',
    keywords: [
      'ракета', 'циолковский', 'дельта v', 'delta v', 'ступени', 'удельный импульс', 'isp',
      'гравитационный разворот', 'max-q', 'орбита', 'кпд', 'сухая масса', 'тяговооруженность', 'twr', 'космос'
    ],
  },
  {
    id: 'pde_acoustic_wave_tool',
    title: '2D Волновой PDE Решатель & Аэроакустическая Лаборатория (Finite Difference / Конус Маха)',
    shortTitle: '2D Волновой PDE Решатель',
    group: 'general_aero',
    domain: 'aero',
    category: 'general_aero',
    subTab: 'pde_acoustic_wave',
    handbookTopicId: 'vlm',
    iconName: 'Volume2',
    badge: 'PDE Решатель 2D',
    badgeColor: 'from-cyan-500 via-teal-500 to-indigo-500 text-slate-950',
    description: 'Интерактивное конечно-разностное моделирование волнового уравнения давления в реальном времени: эффект Доплера при сверхзвуковом движении M > 1, образование конуса Маха, дифракция на профиле крыла и акустический глушитель.',
    formulaLatex: '\\frac{\\partial^2 u}{\\partial t^2} = c^2 \\nabla^2 u - \\gamma \\frac{\\partial u}{\\partial t}, \\quad \\sin\\mu = \\frac{1}{M}',
    keywords: [
      'pde', 'дифракция', 'волна', 'звук', 'аэроакустика', 'доплер', 'конус маха', 'махи',
      'двойная щель', 'интерференция', 'профиль', 'глушитель', 'уравнение волны', 'курант', 'fdtd'
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
    id: 'uav_ai_constructor',
    title: 'AI Генеративный Конструктор БПЛА: Синтез MDO, 3D CAD Сборка, Центровка & Экспорт',
    shortTitle: 'AI Конструктор БПЛА',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_ai_constructor',
    handbookTopicId: 'aero_cad_mdo',
    iconName: 'Sparkles',
    badge: 'AI Генератор САПР',
    badgeColor: 'from-teal-400 via-emerald-400 to-cyan-400 text-slate-950 font-black',
    description: 'Полный сквозной цикл проектирования: генетический MDO синтез по ТЗ, фронт Парето, интерактивная 3D CAD компоновка, расчет CG и тензора инерции Гюйгенса-Штейнера, статический запас устойчивости, расчет ВМГ, экспорт DXF/STL/ArduPilot .param и 6-DoF HIL симулятор.',
    formulaLatex: '\\min_{\\mathbf{x}} \\{-R(\\mathbf{x}), m_{\\text{tot}}(\\mathbf{x})\\}, \\quad \\mathbf{I}_{\\text{tensor}} = \\sum [\\mathbf{I}_i + m_i(\\mathbf{r}_i^T\\mathbf{r}_i\\mathbf{E} - \\mathbf{r}_i\\mathbf{r}_i^T)]',
    keywords: [
      'ai конструктор', 'конструктор бпла', 'mdo', 'парето', 'генеративный дизайн', 'сапр', 'cad',
      '3d сборка', 'центровка', 'тензор инерции', 'гюйгенс штейнер', 'статический запас', 'static margin',
      'вмг', 'ardupilot', 'dxf', 'stl', 'чпу', 'hil', 'симулятор', 'виртуальное создание бпла'
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
  {
    id: 'uav_dynamic_soaring',
    title: 'Динамический Парящий Полет БПЛА (Wind Shear Albatross Cycle)',
    shortTitle: 'Динамическое Парение БПЛА',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_dynamic_soaring',
    handbookTopicId: 'aero_cad_mdo',
    iconName: 'Wind',
    badge: 'Сдвиг Ветра 0-Расход',
    badgeColor: 'from-sky-400 to-teal-400 text-slate-950',
    description: 'Бестопливный автономный полет БПЛА в атмосферном градиенте ветра (Wind Shear dU/dz): 4-фазный цикл Рэлея (Downwind dive, Bottom turn, Upwind climb, Top turn) с извлечением кинетической энергии.',
    formulaLatex: '\\frac{dE}{dt} = -m V_a \\left(\\frac{dW}{dz} \\dot{z}\\right) \\cos(\\psi)',
    keywords: [
      'парение', 'динамический полет', 'градиент ветра', 'сдвиг ветра', 'альбатрос', 'рэлей', 'планер', 'бестопливный'
    ],
  },
  {
    id: 'uav_laser_power_beaming',
    title: 'Беспроводная Лазерная Передача Энергии & Зарядка БПЛА в Полете',
    shortTitle: 'Лазерная Зарядка БПЛА',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_laser_power_beaming',
    handbookTopicId: 'bem_propulsion',
    iconName: 'Zap',
    badge: 'Лазерная Подпитка',
    badgeColor: 'from-amber-400 to-orange-400 text-slate-950',
    description: 'Непрерывное беспосадочное электропитание БПЛА на дистанциях до 2.5 км: волоконный лазер 1070 нм, GaAs матрица с КПД 52%, FSM слежение с точностью до мкрад, тепловой баланс.',
    formulaLatex: 'P_{\\text{elec}} = P_{\\text{laser}} \\cdot e^{-\\alpha R} \\cdot \\eta_{\\text{interception}} \\cdot \\eta_{\\text{GaAs}}',
    keywords: [
      'лазер', 'беспроводная зарядка', 'laser beaming', 'gaas', 'фотоэлементы', 'подзарядка в полете', 'турбулентность', 'fsm'
    ],
  },
  {
    id: 'uav_miniature_sar',
    title: 'Миниатюрная РЛС с Синтезированной Апертурой (Miniature FMCW SAR & InSAR)',
    shortTitle: 'Бортовой SAR & InSAR Радар',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_miniature_sar',
    handbookTopicId: 'aero_cad_mdo',
    iconName: 'Scan',
    badge: 'SAR Радар 11 см',
    badgeColor: 'from-emerald-400 to-teal-400 text-slate-950',
    description: 'Всепогодная радиолокационная съемка сквозь облака и листву: Ka-диапазон 24 ГГц, ЛЧМ девиация 1.2 ГГц, независимое от дальности азимутальное разрешение delta_az = La / 2 и цифровая интерферометрия высоты рельефа InSAR.',
    formulaLatex: '\\delta r = \\frac{c}{2B}, \\quad \\delta r_{\\text{az}} = \\frac{L_a}{2}, \\quad z_{2\\pi} = \\frac{\\lambda R_0 \\sin\\theta}{2 B_\\perp}',
    keywords: [
      'sar', 'рсa', 'радар', 'синтезированная апертура', 'интерферометрия', 'insar', 'fmcw', 'лчм', 'радиолокация', 'рельеф'
    ],
  },
  {
    id: 'uav_hlfc_suction',
    title: 'Гибридное Управление Ламинарным Обтеканием Крыла (HLFC Suction Micro-Perforation)',
    shortTitle: 'HLFC Отсос Погранслоя',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_hlfc_suction',
    handbookTopicId: 'uav_hlfc_suction',
    iconName: 'Wind',
    badge: 'HLFC Ламинаризация -42%',
    badgeColor: 'from-teal-400 to-cyan-400 text-slate-950',
    description: 'Активная стабилизация ламинарного пограничного слоя микроперфорированным отсосом (Cq = v_w / U_inf), подавление волн Толлмина-Шлихтинга и сдвиг турбулентного перехода до 72% хорды.',
    formulaLatex: 'C_q = \\frac{v_w}{U_\\infty}, \\quad C_f^{\\text{lam}} = \\frac{1.328}{\\sqrt{Re_x}}, \\quad N < 9',
    keywords: [
      'hlfc', 'ламинарный слой', 'отсос', 'пограничный слой', 'трение', 'сопротивление', 'толлмин-шлихтинг', 'микроперфорация'
    ],
  },
  {
    id: 'uav_mhd_plasma',
    title: 'Магнитогидродинамический (МГД) Плазменный Двигатель БПЛА (MHD Solid-State)',
    shortTitle: 'МГД Плазменный Двигатель',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_mhd_plasma',
    handbookTopicId: 'uav_mhd_plasma',
    iconName: 'Atom',
    badge: 'МГД Тяга Без Винтов',
    badgeColor: 'from-purple-400 to-indigo-400 text-slate-950',
    description: 'Бесшумное прямое электромагнитное ускорение ионизированного воздуха силой Лоренца (F = J × B) в скрещенных полях без подвижных механических лопаток и турбин.',
    formulaLatex: '\\mathbf{F}_{\\text{Lorentz}} = \\int (\\mathbf{J} \\times \\mathbf{B}) dV = \\sigma (\\mathbf{E} - \\mathbf{v} \\times \\mathbf{B}) \\times \\mathbf{B} \\cdot V',
    keywords: [
      'мгд', 'плазма', 'лоренц', 'mhd', 'ионный двигатель', 'магнитное поле', 'бесшумный полет', 'твердотельный двигатель'
    ],
  },
  {
    id: 'uav_acoustic_cloaking',
    title: 'Акустическая Маскировка & Активное Шумоподавление БПЛА (Active Noise Cancellation)',
    shortTitle: 'Акустический Стелс ANC',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_acoustic_cloaking',
    handbookTopicId: 'uav_acoustic_cloaking',
    iconName: 'VolumeX',
    badge: 'ANC Стелс -88% Засечки',
    badgeColor: 'from-emerald-400 to-green-400 text-slate-950',
    description: 'Подавление шума лопастных гармоник (BPF) дронов деструктивной интерференцией противофазных звуковых волн (Δφ = π) и совиными шевронами задней кромки.',
    formulaLatex: '\\Delta SPL_{\\text{ANC}} = -10 \\log_{10}(2 - 2\\cos(\\Delta\\phi)), \\quad r_{\\text{detect}} = 10^{\\frac{SPL - L_{\\text{bkg}}}{20}}',
    keywords: [
      'anc', 'шум', 'шумоподавление', 'акустика', 'маскировка', 'стелс', 'противофаза', 'шевроны', 'bpf', 'дба'
    ],
  },
  {
    id: 'uav_mavlink_bus',
    title: 'MAVLink 2.0 & Micro-XRCE-DDS Телеметрия, Буферизация и QoS Оптимизатор',
    shortTitle: 'MAVLink & DDS Телеметрия',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_mavlink_bus',
    handbookTopicId: 'uav_navigation_ew',
    iconName: 'Wifi',
    badge: 'MAVLink 2.0 & QoS',
    badgeColor: 'from-teal-400 to-cyan-400 text-slate-950',
    description: 'Анализ пропускной способности, очередей буферов FIFO, джиттера, загрузки UART/CAN-FD шин и сериализации пакетов телеметрии между ArduPilot/PX4 и бортовым компьютером ROS2.',
    formulaLatex: 'B_{\\text{total}} = \\sum_{i} f_i \\cdot (L_{\\text{payload},i} + L_{\\text{header}}) \\cdot 8, \\quad T_{\\text{lat}} = \\frac{L_{\\text{avg}} \\cdot 8}{R_{\\text{baud}}} \\cdot Q_{\\text{mult}}',
    keywords: [
      'mavlink', 'mavlink 2', 'telemetry', 'qos', 'джиттер', 'задержка', 'uart', 'can-fd', 'dronecan', 'ros2', 'micro-xrce-dds', 'ardupilot', 'px4'
    ],
  },
  {
    id: 'uav_blade_flapping',
    title: 'Маховое Движение Лопастей Винта & Аэродинамика Обдува Лучей Рамы БПЛА',
    shortTitle: 'Маховое Движение Лопастей',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_blade_flapping',
    handbookTopicId: 'aero_cad_mdo',
    iconName: 'Wind',
    badge: 'Blade Flapping & Arm Drag',
    badgeColor: 'from-emerald-400 to-teal-400 text-slate-950',
    description: 'Гармонические уравнения махового движения гибких лопастей beta(psi) = a0 - a1 cos(psi) - b1 sin(psi), коэффициент опережения mu, паразитная H-сила и аэродинамические потери тяги от затенения лучами рамы.',
    formulaLatex: '\\beta(\\psi) = a_0 - a_1 \\cos\\psi - b_1 \\sin\\psi, \\quad \\mu = \\frac{V_\\infty}{\\Omega R}, \\quad F_{\\text{arm}} = \\frac{1}{2}\\rho v_i^2 C_{D,\\text{arm}} A_{\\text{arm}}',
    keywords: [
      'flapping', 'маховое движение', 'лопасть', 'винт', 'advance ratio', 'коэффициент опережения', 'h-сила', 'луч рамы', 'обдув', 'скос потока'
    ],
  },
  {
    id: 'uav_spar_fea',
    title: 'Параметрический FEA Лонжерона, Эпюры Q(z)/M(z) & Устойчивость Обшивки',
    shortTitle: 'FEA Прочность Лонжерона',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_spar_fea',
    handbookTopicId: 'aero_cad_mdo',
    iconName: 'Layers',
    badge: 'FEA Прочность Лонжерона',
    badgeColor: 'from-indigo-400 to-purple-400 text-white',
    description: 'Расчет эпюр перерезывающих сил Q(z), изгибающих моментов M(z), нормальных напряжений в карбоновом трубчатом лонжероне и критических касательных напряжений потери устойчивости обшивки tau_cr при перегрузках до +6g.',
    formulaLatex: 'M(z) = \\int_z^{b/2} Q(\\zeta) d\\zeta, \\quad \\sigma_{\\max} = \\frac{M \\cdot y_{\\max}}{I_{\\text{spar}}} \\le [\\sigma], \\quad \\tau_{\\text{cr}} = k_s \\frac{\\pi^2 E}{12(1-\\nu^2)}\\left(\\frac{t}{b}\\right)^2',
    keywords: [
      'fea', 'лонжерон', 'прочность', 'изгибающий момент', 'эпюра', 'нормальные напряжения', 'buckling', 'потеря устойчивости', 'обшивка', 'перегрузка'
    ],
  },
  {
    id: 'uav_deck_landing',
    title: 'Посадка БПЛА на Качающуюся Палубу Корабля (LQP Wave Motion Predictor)',
    shortTitle: 'Посадка на Палубу в Качку',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_deck_landing',
    handbookTopicId: 'aero_cad_mdo',
    iconName: 'Anchor',
    badge: 'LQP Посадка на Палубу',
    badgeColor: 'from-cyan-400 to-teal-400 text-slate-950',
    description: 'Компенсация 6-DoF качки судна (Heave, Pitch, Roll) по спектру Пирсона-Московица, вычисление интервалов затишья волнения (Landing Quiescent Period) и расчет динамических касаний стойками шасси.',
    formulaLatex: 'S(\\omega) = \\frac{A}{\\omega^5} \\exp\\left(-\\frac{B}{\\omega^4}\\right), \\quad z_{\\text{deck}}(t) = z_{\\text{cg}} - x_d \\sin\\theta + y_d \\sin\\phi',
    keywords: [
      'палуба', 'корабль', 'качка', 'lqp', 'quiescent', 'вертолет', 'посадка', 'пирсон-московиц', 'волна', 'волнение', 'судно', 'морской бпла'
    ],
  },
  {
    id: 'uav_glide_bomb',
    title: 'Аэробаллистика Планирующих Модулей УМПК (Winged Glide Munition K=15, 75 км)',
    shortTitle: 'УМПК Планирующая Бомба',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_glide_bomb',
    handbookTopicId: 'aero_cad_mdo',
    iconName: 'Rocket',
    badge: 'УМПК Дальность 75 км',
    badgeColor: 'from-amber-400 to-rose-400 text-slate-950',
    description: 'Численное моделирование высотно-скоростной траектории сброса с Су-34/35 (H=12 км, M=0.95), динамика раскрытия крыла, аэродинамическое качество K=15, учет ветра и терминальное пикирование.',
    formulaLatex: 'L_{\\text{glide}} = H \\cdot \\left(\\frac{C_L}{C_D}\\right)_{\\max} + \\frac{V_0^2}{2g} \\cdot K, \\quad C_D = C_{D0} + \\frac{C_L^2}{\\pi AR e}',
    keywords: [
      'умпк', 'бомба', 'планирующая', 'glide bomb', 'фаб-500', 'качество', 'дальность', 'сброс', 'крыло', 'баллистика', 'пикирование', 'gps', 'комета'
    ],
  },
  {
    id: 'uav_emc_antenna',
    title: 'ЭМС Бортовой Авионики & Взаимная Развязка Антенн БПЛА (S21, GNSS L1/L2 Desense)',
    shortTitle: 'ЭМС Авионики & Антенны',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_emc_antenna',
    handbookTopicId: 'uav_navigation_ew',
    iconName: 'Radio',
    badge: 'ЭМС Развязка Антенн S21',
    badgeColor: 'from-violet-400 to-indigo-400 text-white',
    description: 'Матрица взаимовлияния антенн S21 (дБ), десенситизация навигационных приемников GNSS L1/L2 под воздействием VTX мощностью до 5 Вт, гармоники, ПАВ-фильтрация и экранирование углепластиком (CFRP).',
    formulaLatex: 'S_{21} = 20 \\log_{10}\\left(\\frac{\\lambda}{4\\pi d}\\right) - A_{\\text{shield}} - A_{\\text{pol}}, \\quad C/N_0 = P_{\\text{sat}} - N_{\\text{eff}} + 10\\log_{10}(B)',
    keywords: [
      'эмс', 'emc', 'антенна', 'развязка', 's21', 'vtx', 'видеопередатчик', 'десенситизация', 'gnss', 'gps', 'шумовой фон', 'фильтр', 'пав', 'saw', 'rtk'
    ],
  },
  {
    id: 'uav_swarm_cbba',
    title: 'Распределенное Целераспределение Роя БПЛА (CBBA Consensus & Auction Engine)',
    shortTitle: 'Рой БПЛА CBBA & Аукционы',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_swarm_cbba',
    handbookTopicId: 'uav_swarm_control',
    iconName: 'Users',
    badge: 'CBBA Консенсус Роя',
    badgeColor: 'from-cyan-500 to-blue-500 text-white',
    description: 'Децентрализованный алгоритм CBBA (Consensus-Based Bundle Algorithm) распределения пакетов боевых и разведывательных задач, аукционный протокол и разрешение конфликтов в условиях задержек Mesh-сети.',
    formulaLatex: 'y_{ij} = \\max_{k} c_{ij}(b_i), \\quad z_{ij} = \\arg\\max_k c_{ij}(b_i), \\quad s_i \\leftarrow s_i \\cup \\{j^*\\}',
    keywords: [
      'cbba', 'рой', 'целераспределение', 'аукцион', 'консенсус', 'пакет задач', 'децентрализованный', 'mesh', 'пво', 'sead', 'конфликты', 'многоагентный'
    ],
  },
  {
    id: 'uav_toroidal_aeroacoustics',
    title: 'Тороидальные Бесшумные Пропеллеры & Аэроакустическая Модель BPM (Toroidal Loop)',
    shortTitle: 'Тороидальные Пропеллеры',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_toroidal_aeroacoustics',
    handbookTopicId: 'aeroacoustics',
    iconName: 'VolumeX',
    badge: 'Шум -10 дБА & BPM',
    badgeColor: 'from-emerald-500 to-teal-500 text-white',
    description: 'Замкнутая петлевая геометрия винта, устранение концевых вихрей BVI, расчет спектра звукового давления SPL (дБА) по модели Брукса–Поупа–Марколини (BPM) и тяговое качество (Figure of Merit).',
    formulaLatex: '\\text{SPL}(f) = 10\\log_{10}\\left(\\frac{p_{\\text{rms}}^2}{p_{\\text{ref}}^2}\\right), \\quad \\text{FM} = \\frac{T^{3/2}}{\\sqrt{2\\rho A} \\cdot P_{\\text{aero}}}',
    keywords: [
      'тороидальный', 'пропеллер', 'винт', 'шум', 'акустика', 'bpm', 'лопасть', 'кольцевой', 'бпла', 'дрон', 'дба', 'spl', 'вихрь', 'bvi', 'тихий'
    ],
  },
  {
    id: 'uav_vision_georeg',
    title: 'Оптическая Геопривязка БПЛА Без GPS (SuperGlue Orthophoto Map Matching & EKF)',
    shortTitle: 'Оптическая Геопривязка Без GPS',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_vision_georeg',
    handbookTopicId: 'uav_navigation_ew',
    iconName: 'Camera',
    badge: 'КВО < 1.5м Без GPS',
    badgeColor: 'from-amber-500 to-yellow-500 text-slate-950',
    description: 'Нейросетевое сопоставление кадров бортовой камеры со спутниковыми ортофотопланами (SuperPoint/SuperGlue), подавление квадратичного дрейфа БИНС расширенным фильтром Калмана EKF и удержание КВО < 1.5 м.',
    formulaLatex: '\\mathbf{x}_{k|k} = \\mathbf{x}_{k|k-1} + \\mathbf{K}_k (\\mathbf{z}_{\\text{ortho}} - h(\\mathbf{x}_{k|k-1})), \\quad \\text{CEP}_{50} \\approx 0.589(\\sigma_x + \\sigma_y)',
    keywords: [
      'геопривязка', 'ортофотоплан', 'superglue', 'superpoint', 'gps-denied', 'рэб', 'бинс', 'инс', 'дрейф', 'калман', 'кво', 'cep', 'зрение', 'камера'
    ],
  },
  {
    id: 'uav_fiber_optic',
    title: 'FPV БПЛА на Оптоволокне & Динамика Размотки Катушки (Fiber-Optic Spool 10-20 км)',
    shortTitle: 'FPV Дрон на Оптоволокне',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_fiber_optic',
    handbookTopicId: 'uav_navigation_ew',
    iconName: 'Cable',
    badge: '100% РЭБ Иммунитет',
    badgeColor: 'from-cyan-500 to-blue-600 text-white',
    description: 'Расчет натяжения микроволокна T (Н) при сходе с бобины, аэродинамическое трение подвешенной нити, оптический бюджет затухания SFP+ (дБ) и нулевая задержка 4K видеопотока без радиоизлучения.',
    formulaLatex: 'T(t) = \\frac{M_{\\text{brake}}}{R_{\\text{spool}}} + \\frac{1}{2}\\rho V^2 d_{\\text{fiber}} C_d L_{\\text{susp}}, \\quad A_{\\text{loss}} = L \\cdot \\alpha_{\\text{fiber}} + A_0',
    keywords: [
      'оптоволокно', 'катушка', 'нить', 'fpv', 'дрон', 'бпла', 'рэб', 'радиомолчание', 'натяжение', 'обрыв', 'сброс', 'видео', '10g', 'sfp'
    ],
  },
  {
    id: 'uav_gust_alleviation',
    title: 'Активное Гашение Порывов Ветра & Турбулентности (GLAS & LIDAR Feedforward)',
    shortTitle: 'Активное Гашение Порывов GLAS',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_gust_alleviation',
    handbookTopicId: '6dof',
    iconName: 'Wind',
    badge: '-45% Нагрузки Крыла',
    badgeColor: 'from-sky-500 to-teal-500 text-white',
    description: 'Система активной разгрузки планера GLAS: опережающее лидарное детектирование профиля порыва 1-cosine, скоростное отклонение закрылков и снижение изгибающего момента лонжерона крыла Mb(t) на 30-50%.',
    formulaLatex: '\\delta_f(t) = -K_p \\frac{w_g(t+\\tau)}{V_{\\infty}} \\frac{C_{L\\alpha}}{C_{L\\delta_f}}, \\quad M_b(t) = M_{b0} \\cdot n_y(t)',
    keywords: [
      'порыв', 'ветер', 'glas', 'турбулентность', 'разгрузка', 'крыло', 'лонжерон', 'перегрузка', 'лидар', 'lookahead', 'закрылок', 'vtol', 'бпла'
    ],
  },
  {
    id: 'uav_munition_bay',
    title: 'Аэродинамика Бомбоотсека & Безопасное Отделение Грузов (Rossiter Open Cavity)',
    shortTitle: 'Бомбоотсек & Сброс Грузов',
    group: 'uav_systems',
    domain: 'aero',
    category: 'uav_systems',
    subTab: 'uav_munition_bay',
    handbookTopicId: 'supersonic_hypersonic',
    iconName: 'Crosshair',
    badge: 'Акустика Росситера 150 дБ',
    badgeColor: 'from-rose-500 to-amber-500 text-white',
    description: 'Расчет акустических резонансных мод открытой полости Росситера fn, подавление пульсаций давления передним спойлером и моделирование безопасного выхода сбрасываемого боеприпаса через слой смешения.',
    formulaLatex: 'f_n = \\frac{U_{\\infty}}{L} \\frac{n - \\alpha}{M + 1/k}, \\quad z(t) = \\iint \\left(g + \\frac{F_{\\text{eject}} - F_{\\text{suction}}}{m}\\right) dt^2',
    keywords: [
      'бомбоотсек', 'росситер', 'rossiter', 'полость', 'сброс', 'отделение', 'выталкиватель', 'суббоеприпас', 'акустика', 'спойлер', 'резонанс', 'бпла'
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
