import React, { useState, useEffect, useMemo } from 'react';
import {
  Rocket,
  Plane,
  Crosshair,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  AlertTriangle,
  Flame,
  Zap,
  Layers,
  Search,
  Filter,
  Plus,
  Trash2,
  RotateCcw,
  Download,
  Share2,
  X,
  Compass,
  Wind,
  Shield,
  Gauge,
  Cpu,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  FileSpreadsheet,
  Eye,
  Palette,
  GraduationCap,
  HelpCircle,
  Wrench,
  FileText,
  Boxes,
  Scale,
  Monitor,
  Sliders,
  BookOpen,
  Maximize2,
  FileCode2,
} from 'lucide-react';
import { MathView, MathText } from './MathView';

export type PriorityLevel = 'p0_urgent' | 'p1_high' | 'p2_medium' | 'p3_rnd';
export type VehicleClass = 'all' | 'uav' | 'light_crop' | 'airliner' | 'supersonic' | 'rocket_space' | 'app_platform';
export type FeatureCategory =
  | 'Аэродинамика'
  | 'Двигатели & Пропульсия'
  | 'Динамика & СУ'
  | 'Прочность & Вес'
  | 'Космос & Авионика'
  | 'Интерфейс & Юзер-Френдли (UX/UI)'
  | 'Визуальное Восприятие & 3D Графика'
  | 'Инженерная Полезность & САПР'
  | 'Обучение & Инженерная Ясность';

export type FeatureStatus = 'completed' | 'in_progress' | 'planned';

export interface RoadmapFeatureItem {
  id: string;
  title: string;
  category: FeatureCategory;
  vehicleClass: 'uav' | 'light_crop' | 'airliner' | 'supersonic' | 'rocket_space' | 'universal' | 'app_platform';
  vehicleClassLabel: string;
  priority: PriorityLevel;
  priorityLabel: string;
  description: string;
  engineeringImpact: string;
  autoDetected?: boolean;
  defaultStatus: FeatureStatus;
  targetMilestone: string;
  mathBasis?: string;
}

export const INITIAL_ROADMAP_FEATURES: RoadmapFeatureItem[] = [
  // ==========================================
  // P0 — СРОЧНЫЕ И КРИТИЧЕСКИ ВАЖНЫЕ (URGENT & CRITICAL FOR AIRCRAFT BUILD)
  // ==========================================
  {
    id: 'feat_naca_generator',
    title: '1. Генератор профилей NACA 4/5-digit и импорт .DAT / Selig',
    category: 'Аэродинамика',
    vehicleClass: 'universal',
    vehicleClassLabel: 'Универсально (Все ЛА)',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Математическая генерация аналитических координат профилей NACA (симметричные 00xx, несущие 24xx, 44xx, 230xx) и парсинг внешних файлов сечений .DAT (UIUC / Selig Airfoil Database).',
    engineeringImpact: 'Позволяет инженеру мгновенно загрузить точную хордовую геометрию реального крыла для продувки.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'Базовая Аэродинамика',
    mathBasis: 'y_t = 5t c (0.2969\\sqrt{x/c} - 0.1260(x/c) - 0.3516(x/c)^2 + 0.2843(x/c)^3 - 0.1015(x/c)^4)',
  },
  {
    id: 'feat_viscous_xfoil',
    title: '2. Интегратор панельного метода с пограничным слоем (XFoil e^N Transition)',
    category: 'Аэродинамика',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА / Дроны / Планеры',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Расчет ламинарно-турбулентного перехода вязкого пограничного слоя и ламинарного пузыря отрыва (Laminar Separation Bubble) на малых числах Рейнольдса (Re = 50,000 ... 500,000).',
    engineeringImpact: 'Критично для беспилотников и планеров: без учета отрывного пузыря ошибка расчета лобового сопротивления достигает 300%.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'БПЛА & Малые Re',
    mathBasis: 'e^N = \\exp\\left(\\int_{x_0}^x -\\alpha_i \\, dx\\right), \\quad N_{\\text{crit}} \\approx 9',
  },
  {
    id: 'feat_wing_mechanization',
    title: '3. Расчет механизации крыла: предкрылки Крюгера, закрылки Фаулера и щелевые закрылки',
    category: 'Аэродинамика',
    vehicleClass: 'light_crop',
    vehicleClassLabel: 'Кукурузник / Ан-2 / STOL',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Вычисление прироста подъемной силы $\\Delta C_L$, сдвига угла срыва $\\Delta \\alpha_{\\text{stall}}$ и момента тангажа $\\Delta C_m$ при отклонении механизации передней и задней кромок.',
    engineeringImpact: 'Позволяет спроектировать взлетно-посадочные режимы для самолетов короткого взлета (STOL / «Кукурузник») и посадки на неподготовленные грунтовые полосы.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: 'Легкая & Сельхозавиация',
    mathBasis: '\\Delta C_{L,\\max} = k_1 k_2 k_3 (\\Delta C_L)_{\\text{theory}} \\cdot \\cos(\\Lambda_{\\text{hinge}})',
  },
  {
    id: 'feat_induced_drag_oswald',
    title: '4. Индуктивное сопротивление и фактор Освальда для произвольных форм крыла в плане',
    category: 'Аэродинамика',
    vehicleClass: 'universal',
    vehicleClassLabel: 'Универсально (Все ЛА)',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Интеграл циркуляции Прандтля-Глауэрта для трапециевидных, эллиптических, стреловидных крыльев с круткой (washout). Расчет коэффициента эффективности Освальда $e$ и поляры $C_{Di} = C_L^2 / (\\pi A R e)$.',
    engineeringImpact: 'Определяет крейсерский расход топлива и дальность полета на этапе компоновки формы консоли крыла.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'Базовая Аэродинамика',
    mathBasis: 'C_{Di} = \\frac{C_L^2}{\\pi \\cdot AR \\cdot e}, \\quad e = \\frac{1}{1 + \\delta}',
  },
  {
    id: 'feat_propeller_bem',
    title: '5. Теория элементов лопасти воздушного винта (BEM — Blade Element Momentum)',
    category: 'Двигатели & Пропульсия',
    vehicleClass: 'light_crop',
    vehicleClassLabel: 'Кукурузник / БПЛА / Cessna',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Численный расчет тяги $T(V)$, потребной мощности $P(V)$ и КПД $\\eta_p(V)$ воздушного винта фиксированного и изменяемого шага (ВИШ) с учетом скоса потока и крутки лопасти.',
    engineeringImpact: 'Позволяет инженеру подобрать двигатель (BLDC / поршневой ДВС / ТВД) и согласовать винт с аэродинамикой планера.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: 'Винтомоторные Группы',
    mathBasis: 'dT = 4\\pi r \\rho V_\\infty^2 (1+a) a F \\, dr = \\frac{1}{2} \\rho W^2 (C_L \\cos\\phi - C_D \\sin\\phi) c B \\, dr',
  },
  {
    id: 'feat_neutral_point_stability',
    title: '6. Калькулятор нейтральной точки фокуса ($x_F$) и запаса статической устойчивости',
    category: 'Динамика & СУ',
    vehicleClass: 'universal',
    vehicleClassLabel: 'Универсально (Все ЛА)',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Определение суммарного аэродинамического фокуса самолета с учетом влияния фюзеляжа, скоса потока от крыла на ГО $(\\partial \\epsilon / \\partial \\alpha)$ и расчет статического запаса $\\Delta x_{\\text{sm}} = (x_F - x_{cg}) / c$.',
    engineeringImpact: 'Гарантирует, что созданный самолет или БПЛА не перевернется в воздухе при первом же полете.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'Балансировка & Безопасность',
    mathBasis: 'K_n = \\frac{x_F - x_{cg}}{c} = -\\frac{dC_m}{dC_L} > 0.05 ... 0.15',
  },

  // ==========================================
  // P1 — ВЫСОКИЙ ПРИОРИТЕТ (IMPORTANT FOR COMPLETE AIRFRAME & FLIGHT ENVELOPE)
  // ==========================================
  {
    id: 'feat_vlm_full_aircraft',
    title: '7. 3D VLM расчет полного планера: крыло + фюзеляж + ГО + ВО + винглеты',
    category: 'Аэродинамика',
    vehicleClass: 'airliner',
    vehicleClassLabel: 'Магистральные Лайнеры / БПЛА',
    priority: 'p1_high',
    priorityLabel: 'P1: Высокий приоритет',
    description: 'Трехмерный расчет вихревой решетки полного планера в сборе: взаимная индуктивная интерференция, влияние концевых шайб/винглетов, скос потока и боковая аэродинамика при скольжении $\\beta$.',
    engineeringImpact: 'Позволяет спроектировать полноценный самолет с вертикальным и горизонтальным оперением без дорогой продувки в натурной трубе.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: '3D Аэродинамика',
    mathBasis: '\\mathbf{A}_{ij} \\boldsymbol{\\Gamma}_j = -\\mathbf{V}_\\infty \\cdot \\mathbf{n}_i',
  },
  {
    id: 'feat_biplane_interference',
    title: '8. Аэродинамика бипланных коробок и тандемных схем (для Кукурузника / Ан-2)',
    category: 'Аэродинамика',
    vehicleClass: 'light_crop',
    vehicleClassLabel: 'Кукурузник / Бипланы / Ан-2',
    priority: 'p1_high',
    priorityLabel: 'P1: Высокий приоритет',
    description: 'Расчет аэродинамической интерференции верхнего и нижнего крыла биплана (коэффициент Мюнка, вынос крыльев Stagger, расстояние между крыльями Gap/Chord $h/c$).',
    engineeringImpact: 'Необходимо для построения классических сельскохозяйственных и учебных бипланов типа Ан-2 с высокой грузоподъемностью на малых скоростях.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: 'Бипланы & STOL',
    mathBasis: 'C_{Di,\\text{biplane}} = \\frac{C_{L1}^2}{\\pi AR_1} + 2\\sigma \\frac{C_{L1} C_{L2}}{\\pi b_1 b_2} + \\frac{C_{L2}^2}{\\pi AR_2}',
  },
  {
    id: 'feat_supersonic_shock_polar',
    title: '9. Сверхзвуковые профили: теория волн расширения Прандтля-Майера и косые скачки',
    category: 'Аэродинамика',
    vehicleClass: 'supersonic',
    vehicleClassLabel: 'Сверхзвук / Истребители',
    priority: 'p1_high',
    priorityLabel: 'P1: Высокий приоритет',
    description: 'Точный термодинамический расчет давления за косыми ударными волнами (уравнение $\\theta$-$\\beta$-$M$) и центрированными волнами разрежения Прандтля-Майера для клиновидных и двояковыпуклых профилей на $M = 1.2 ... 4.0$.',
    engineeringImpact: 'Позволяет спроектировать сверхзвуковой планер, воздухозаборник и рассчитать волновое сопротивление $C_{Dw}$.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'Сверхзвуковая Авиация',
    mathBasis: '\\tan \\theta = 2 \\cot \\beta \\frac{M_1^2 \\sin^2 \\beta - 1}{M_1^2 (\\gamma + \\cos 2\\beta) + 2}',
  },
  {
    id: 'feat_stability_derivatives_matrix',
    title: '10. Матрица аэродинамических производных устойчивости и демпфирования',
    category: 'Динамика & СУ',
    vehicleClass: 'universal',
    vehicleClassLabel: 'Универсально (Все ЛА)',
    priority: 'p1_high',
    priorityLabel: 'P1: Высокий приоритет',
    description: 'Автоматическое вычисление безразмерных коэффициентов: продольных ($C_{L\\alpha}, C_{mq}, C_{L\\dot{\\alpha}}$) и боковых ($C_{y\\beta}, C_{l\\beta}, C_{nr}, C_{lp}$) производных.',
    engineeringImpact: 'Необходимо для настройки ПИД/LQR автопилотов БПЛА (ArduPilot/PX4) и сертификации управляемости самолета.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'Автопилоты & Динамика',
    mathBasis: '\\mathbf{\\dot{x}} = \\mathbf{A}\\mathbf{x} + \\mathbf{B}\\mathbf{u}, \\quad C_{mq} = \\frac{\\partial C_m}{\\partial (q c / 2V)}',
  },
  {
    id: 'feat_takeoff_landing_calculator',
    title: '11. Калькулятор взлетно-посадочных характеристик (ВПХ): разбег, отрыв и пробег',
    category: 'Динамика & СУ',
    vehicleClass: 'light_crop',
    vehicleClassLabel: 'Кукурузник / Лайнер / STOL',
    priority: 'p1_high',
    priorityLabel: 'P1: Высокий приоритет',
    description: 'Интегрирование уравнения движения по ВПП с учетом трения колес (бетон/грунт $\\mu_r$), тяги винта/двигателя при разгоне, экрана земли и аэродинамического торможения при пробеге.',
    engineeringImpact: 'Определяет требуемую длину взлетно-посадочной полосы (ВРП) по нормам АП-23 / АП-25 / FAR-23.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: 'Летные Испытания',
    mathBasis: 'S_{\\text{ground}} = \\frac{1}{2g} \\int_0^{V_{\\text{LOF}}} \\frac{V \\, dV}{\\frac{T - D}{m g} - \\mu_r \\left(1 - \\frac{L}{mg}\\right)}',
  },
  {
    id: 'feat_flutter_aeroelasticity',
    title: '12. Аэроупругий анализ: изгибно-крутильный флаттер и реверс элеронов крыла',
    category: 'Прочность & Вес',
    vehicleClass: 'airliner',
    vehicleClassLabel: 'Магистральные Лайнеры / Сверхзвук',
    priority: 'p1_high',
    priorityLabel: 'P1: Высокий приоритет',
    description: 'Решение задачи на собственные значения аэроупругой системы (Theodorsen unsteady aerodynamics). Построение $V-g$ диаграммы демпфирования и поиск критической скорости флаттера $V_{\\text{flutter}}$.',
    engineeringImpact: 'Предотвращает катастрофическое разрушение крыла от автоколебаний на высоких скоростях полета.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'Аэроупругость & Прочность',
    mathBasis: '\\mathbf{M}\\mathbf{\\ddot{q}} + \\mathbf{C}\\mathbf{\\dot{q}} + \\mathbf{K}\\mathbf{q} = \\mathbf{Q}_{\\text{aero}}(V, \\omega, \\mathbf{q})',
  },

  // ==========================================
  // P2 — СРЕДНИЙ ПРИОРИТЕТ (ADVANCED AEROSPACE PROPULSION & AIRFRAME INTEGRATION)
  // ==========================================
  {
    id: 'feat_whitcomb_area_rule',
    title: '13. Расчет правила площадей Уиткомба (Area Ruling) для околозвуковых аппаратов',
    category: 'Аэродинамика',
    vehicleClass: 'airliner',
    vehicleClassLabel: 'Лайнеры / Сверхзвук',
    priority: 'p2_medium',
    priorityLabel: 'P2: Средний приоритет',
    description: 'График распределения площадей поперечных сечений планера $S(x)$ вдоль продольной оси. Выявление зон локальных скачков и оптимизация «талии» фюзеляжа (Coke-bottle fuselage).',
    engineeringImpact: 'Снижает трансзвуковое волновое сопротивление на 30-50% в диапазоне $M = 0.85 ... 1.15$.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: 'Трансзвук & Лайнеры',
    mathBasis: 'C_{Dw} = -\\frac{1}{2\\pi q} \\int_0^L \\int_0^L S\'\'(x_1) S\'\'(x_2) \\ln|x_1 - x_2| \\, dx_1 dx_2',
  },
  {
    id: 'feat_gas_turbine_cycle',
    title: '14. Термогазодинамический цикл ТРД/ТРДД (Турбовентиляторные и ТВД двигатели)',
    category: 'Двигатели & Пропульсия',
    vehicleClass: 'airliner',
    vehicleClassLabel: 'Лайнеры / Сверхзвук',
    priority: 'p2_medium',
    priorityLabel: 'P2: Средний приоритет',
    description: 'Расчет параметров цикла Брайтона в характерных сечениях (диффузор, компрессор КНД/КВД, камера сгорания, турбина ТВД/ТНД, сопло). Вычисление удельного расхода топлива $C_R$ и тяги $P_{\\text{уд}}$.',
    engineeringImpact: 'Позволяет смоделировать тяговооруженность и автономность реактивного самолета на любых эшелонах полета.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: 'Реактивная Пропульсия',
    mathBasis: '\\eta_{\\text{th}} = 1 - \\frac{1}{\\pi_c^{(\\gamma-1)/\\gamma}}, \\quad C_{\\text{sp}} = \\frac{\\dot{m}_{\\text{fuel}}}{F_{\\text{thrust}}}',
  },
  {
    id: 'feat_ground_effect_wig',
    title: '15. Аэродинамика экранного эффекта (Ground Effect / Экранопланы)',
    category: 'Аэродинамика',
    vehicleClass: 'light_crop',
    vehicleClassLabel: 'Экранопланы / STOL / Посадка',
    priority: 'p2_medium',
    priorityLabel: 'P2: Средний приоритет',
    description: 'Моделирование подстилающей поверхности методом зеркальных отражений вихрей. Расчет резкого падения индуктивного сопротивления $C_{Di}$ и роста подъемной силы при приближении к земле $h/c < 0.5$.',
    engineeringImpact: 'Необходимо для расчета поведения самолета на глиссаде выравнивания и для проектирования экранопланов типа «Орленок» / «Лунь».',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: 'Экранный Эффект',
    mathBasis: '\\sigma_{\\text{ground}}(h/b) = \\frac{1}{1 + 16 (h/b)^2}',
  },
  {
    id: 'feat_rocket_base_drag',
    title: '16. Донное сопротивление ракетных корпусов и сопловых блоков (Base Drag)',
    category: 'Космос & Авионика',
    vehicleClass: 'rocket_space',
    vehicleClassLabel: 'Ракеты & Космос',
    priority: 'p2_medium',
    priorityLabel: 'P2: Средний приоритет',
    description: 'Расчет разрежения в донной области ракеты за счет эжекции струй двигателей и отрывного течения на сверхзвуковых скоростях.',
    engineeringImpact: 'Донное сопротивление составляет до 40% полного сопротивления ракеты на участке выведения первой ступени.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: 'Ракетостроение',
    mathBasis: 'C_{D,\\text{base}} \\approx 0.029 \\left(\\frac{d_{\\text{base}}}{d_{\\text{ref}}}\\right)^2 \\frac{1}{\\sqrt{M^2 - 1}}',
  },
  {
    id: 'feat_weight_balance_gost',
    title: '17. Весовая сводка и центровочный график по ГОСТ 21890 / FAR-25',
    category: 'Прочность & Вес',
    vehicleClass: 'universal',
    vehicleClassLabel: 'Универсально (Все ЛА)',
    priority: 'p2_medium',
    priorityLabel: 'P2: Средний приоритет',
    description: 'Интерактивная весовая ведомость: конструкция планера, силовая установка, оборудование, топливо, полезная нагрузка. Построение конверта центровок $x_{cg}(m)$ по мере выработки топлива.',
    engineeringImpact: 'Главный документ эскизного проектирования: гарантирует, что самолет останется отбалансированным во всех фазах полета.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: 'Весовая Инженерия',
    mathBasis: 'x_{cg} = \\frac{\\sum m_i x_i}{\\sum m_i}, \\quad I_{yy} = \\sum m_i (x_i - x_{cg})^2',
  },

  // ==========================================
  // P3 — ПЕРСПЕКТИВНЫЕ РАЗРАБОТКИ & КОСМИЧЕСКИЙ КЛАСС (R&D & SPACE LAUNCH VEHICLES)
  // ==========================================
  {
    id: 'feat_rocket_trajectory_gravity_turn',
    title: '18. Моделирование вывода РН на орбиту с гравитационным разворотом (Gravity Turn)',
    category: 'Космос & Авионика',
    vehicleClass: 'rocket_space',
    vehicleClassLabel: 'Ракеты & Космос',
    priority: 'p3_rnd',
    priorityLabel: 'P3: Перспективно & R&D',
    description: '3D/2D интегрирование траектории активного участка выведения многоступенчатой ракеты-носителя с расходом топлива по формуле Циолковского и потерями на гравитацию $\\Delta V_{\\text{grav}}$ и аэродинамику $\\Delta V_{\\text{drag}}$.',
    engineeringImpact: 'Позволяет рассчитать массу выводимого на опорную орбиту полезного груза (LEO / ГПО).',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'Орбитальная Механика',
    mathBasis: 'm \\frac{dV}{dt} = F_{\\text{thrust}} \\cos\\alpha - D - m g \\sin\\theta, \\quad m V \\frac{d\\theta}{dt} = F_{\\text{thrust}} \\sin\\alpha + L - m g \\cos\\theta',
  },
  {
    id: 'feat_hypersonic_heat_aerothermo',
    title: '19. Гиперзвуковая аэротермодинамика и абляционная теплозащита (Fay-Riddell)',
    category: 'Космос & Авионика',
    vehicleClass: 'rocket_space',
    vehicleClassLabel: 'Сверхзвук & Космос',
    priority: 'p3_rnd',
    priorityLabel: 'P3: Перспективно & R&D',
    description: 'Расчет конвективного и радиационного теплового потока $\\dot{q}(t)$ в критической точке затупленного тела при входе в плотные слои атмосферы на скоростях $M = 5 ... 25$ (первая/вторая космическая скорость).',
    engineeringImpact: 'Необходимо для проектирования спускаемых аппаратов, космических челноков и гиперзвуковых глайдеров.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'Гиперзвуковой Вход',
    mathBasis: '\\dot{q}_s = 0.763 \\, Pr^{-0.6} (\\rho_w \\mu_w)^{0.1} (\\rho_s \\mu_s)^{0.4} \\left(2 \\frac{p_s - p_\\infty}{\\rho_s}\\right)^{0.25} (h_s - h_w)',
  },
  {
    id: 'feat_lambert_orbital_transfer',
    title: '20. Решатель краевой задачи Ламбера для межорбитальных маневров и сближения',
    category: 'Космос & Авионика',
    vehicleClass: 'rocket_space',
    vehicleClassLabel: 'Ракеты & Космос',
    priority: 'p3_rnd',
    priorityLabel: 'P3: Перспективно & R&D',
    description: 'Определение кеплеровской орбиты по двум радиус-векторам $\\mathbf{r}_1, \\mathbf{r}_2$ и заданному времени перелета $\\Delta t$. Расчет характеристических импульсов $\\Delta V_1, \\Delta V_2$ для стыковки и межпланетных перелетов.',
    engineeringImpact: 'Ключевой алгоритм бортового навигационного комплекса космического аппарата для коррекций орбиты.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'Межорбитальная Навигация',
    mathBasis: '\\Delta t = \\sqrt{\\frac{a^3}{\\mu}} ((\\alpha - \\sin\\alpha) - (\\beta - \\sin\\beta))',
  },
  {
    id: 'feat_radiation_hardened_avionics',
    title: '21. Радиационная стойкость БЦВМ и мажоритарное резервирование (TMR 2-of-3)',
    category: 'Космос & Авионика',
    vehicleClass: 'rocket_space',
    vehicleClassLabel: 'Космос & Авионика',
    priority: 'p3_rnd',
    priorityLabel: 'P3: Перспективно & R&D',
    description: 'Моделирование одиночных радиационных сбоев (Single Event Upsets / Latchup) от тяжелых ионов космоса и автоматическое парирование ошибок трехканальным голосованием $Y = AB + BC + AC$.',
    engineeringImpact: 'Обеспечивает надежность бортового компьютера ракеты-носителя и спутника в условиях космической радиации.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'Космическая Авионика',
    mathBasis: 'R_{\\text{TMR}}(t) = 3 R(t)^2 - 2 R(t)^3, \\quad \\text{MTTF} = \\int_0^\\infty R_{\\text{TMR}}(t) \\, dt',
  },
  {
    id: 'feat_ai_shape_optimization',
    title: '22. Генеративная оптимизация формы планера нейросетевыми суррогатами (PINNs)',
    category: 'Аэродинамика',
    vehicleClass: 'universal',
    vehicleClassLabel: 'Перспективный R&D',
    priority: 'p3_rnd',
    priorityLabel: 'P3: Перспективно & R&D',
    description: 'Автоматический поиск аэродинамической формы крыла и фюзеляжа с максимальным качеством $(L/D)_{\\max}$ при заданных ограничениях по объему с использованием генетических алгоритмов и физически-информированных нейросетей.',
    engineeringImpact: 'Сокращает цикл эскизного проектирования летательного аппарата с нескольких месяцев до нескольких минут.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: 'Искусственный Интеллект & AI CAE',
    mathBasis: '\\mathcal{L}_{\\text{PINN}} = \\|\\mathbf{u} \\cdot \\nabla \\mathbf{u} + \\frac{1}{\\rho} \\nabla p - \\nu \\nabla^2 \\mathbf{u}\\|^2 + \\|\\nabla \\cdot \\mathbf{u}\\|^2',
  },
  {
    id: 'feat_uav_propulsion_thermal_flight_envelope',
    title: '23. Комплексный расчет пропульсии БПЛА, полетной огибающей и теплового баланса BLDC',
    category: 'Двигатели & Пропульсия',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА / Дроны / VTOL',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Полный инженерный модуль согласования винтомоторной группы (ВМГ: BLDC мотор, пропеллер, регулятор ESC, LiPo/Li-Ion батарея). Расчет времени зависания, дальности и потребной мощности от поступательной скорости с учетом скоса потока (Glauert), ветроустойчивости (углов балансировки) и стационарной температуры обмоток моторов.',
    engineeringImpact: 'Критично для беспилотных систем, VTOL-конвертопланов и FPV-комплексов: гарантирует предотвращение перегрева магнитов моторов и точный расчет автономности с учетом ветра.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'БПЛА & Силовые Установки',
    mathBasis: 'P_{\\text{hover}} = \\frac{T^{3/2}}{\\sqrt{2 \\rho A} \\cdot \\text{FM} \\cdot \\eta_{\\text{BLDC}} \\cdot \\eta_{\\text{ESC}}}, \\quad T_{\\text{motor}} = T_{\\text{amb}} + (I^2 R_m + P_{\\text{core}}) R_{\\text{th}}',
  },
  {
    id: 'feat_uav_gnss_denied_ekf3_ew_jamming',
    title: '24. Навигация БПЛА в условиях РЭБ: 24-состоятельный EKF3, оптический поток и защита от спуфинга',
    category: 'Космос & Авионика',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА / Дроны / VTOL',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Моделирование радиоэлектронного подавления (РЭБ GPS L1/L2) и спуфинга координат. Комплексирование ИНС тактического класса с оптическим потоком (Optical Flow PMW3901), визуальной одометрией (VIO) и 4-лучевой CRPA-антенной. Фильтрация аномалий по критерию хи-квадрат (Chi-Square gating).',
    engineeringImpact: 'Критически важно для выживаемости и точного возврата домой (RTH) БПЛА и FPV-дронов при полном отключении спутниковой навигации в зонах активного радиоэлектронного подавления.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'БПЛА & РЭБ-Навигация',
    mathBasis: '\\mathbf{x}_{k} = f(\\mathbf{x}_{k-1}, \\mathbf{u}_k) + \\mathbf{w}_k, \\quad \\mathbf{K}_k = \\mathbf{P}_k^- \\mathbf{H}_k^T (\\mathbf{H}_k \\mathbf{P}_k^- \\mathbf{H}_k^T + \\mathbf{R}_k)^{-1}, \\quad d_{\\chi^2} = \\mathbf{y}_k^T \\mathbf{S}_k^{-1} \\mathbf{y}_k < \\gamma',
  },
  {
    id: 'feat_uav_rf_link_fresnel_relay',
    title: '25. Радиолиния БПЛА, Зона Френеля, Бюджет Канала (RF Link Budget) & Дроны-Ретрансляторы',
    category: 'Космос & Авионика',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА / Дроны / VTOL',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Расчет бюджета радиолинии (RF Link Budget) ExpressLRS 868/2.4G, видеолинков 5.8G/1.2G и тактического COFDM Mesh. Расчет 1-й зоны Френеля, огибания складок рельефа, дифракционных потерь ножевого края (Knife-Edge) и оптимизация высоты и позиции дрона-ретранслятора.',
    engineeringImpact: 'Обеспечивает предотвращение внезапного срыва радиоуправления и видеопотока БПЛА в складках местности и кратно расширяет радиус боевого/поискового применения за счет воздушных ретрансляторов.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'БПЛА & Радиосвязь',
    mathBasis: 'r_1 = \\sqrt{\\frac{\\lambda d_1 d_2}{d_1 + d_2}}, \\quad \\text{FSPL} = 20\\log_{10}(d) + 20\\log_{10}(f) + 32.45, \\quad P_{\\text{rx}} = P_{\\text{tx}} + G_{\\text{tx}} + G_{\\text{rx}} - L',
  },
  {
    id: 'feat_uav_guidance_tracking_pro_nav',
    title: '26. Самонаведение БПЛА, Пропорциональная Навигация (PN/APN) & Оптический Автозахват Целей',
    category: 'Космос & Авионика',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА / Дроны / VTOL',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Моделирование законов самонаведения (PN, Augmented PN с компенсацией ускорения цели a_T, Lead Pursuit). Расчет угловой скорости линии визирования (LOS Rate), компенсация задержки видеопотока и нейросетевого трекера через фильтр Калмана, ветровой снос и ограничения по перегрузке ny.',
    engineeringImpact: 'Позволяет рассчитывать высокоточные алгоритмы терминального наведения дронов-перехватчиков и FPV-комплексов на маневрирующие наземные и воздушные цели в условиях помех и задержек видеоканала.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'БПЛА & Самонаведение',
    mathBasis: 'a_n = N V_c \\dot{\\lambda} + \\frac{N}{2} a_{T\\perp}, \\quad \\dot{\\lambda} = \\frac{x_r v_{yr} - y_r v_{xr}}{R^2}, \\quad \\hat{\\mathbf{x}}_{k+\\tau} = \\hat{\\mathbf{x}}_k + \\hat{\\mathbf{v}}_k \\tau + \\frac{1}{2} \\hat{\\mathbf{a}}_k \\tau^2',
  },
  {
    id: 'feat_uav_vtol_transition_dynamics',
    title: '27. Аэродинамика Переходных Режимов VTOL, Конвертопланов & Коридор Сваливания',
    category: 'Аэродинамика',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА / Дроны / VTOL',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Комплексный расчет переходных режимов (Transition Phase) для QuadPlane, Tiltrotor, Tilt-Wing и Tailsitter. Определение коридора сваливания V_stall(theta), безопасной скорости подхвата крылом V_safe, замещения подъемной тяги роторов аэродинамической подъемной силой крыла и потребной энергии фазы ускорения.',
    engineeringImpact: 'Критически важно для предотвращения катастрофической потери высоты (просадки) и срыва потока при переходе тяжелых VTOL БПЛА из режима вертолетного висения в скоростной самолетный полет.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'БПЛА & VTOL Аэродинамика',
    mathBasis: 'V_{\\text{stall}} = \\sqrt{\\frac{2(mg - T_z)}{\\rho S C_{L\\max}}}, \\quad L(V) + T_z(\\theta) = mg, \\quad E_{\\text{trans}} = \\int_0^{T_{\\text{trans}}} P(t) dt',
  },
  {
    id: 'feat_uav_swarm_flocking_mesh',
    title: '28. Динамика Роя БПЛА: Формации Рейнольдса (Boids), Upwash-Экономия & Mesh-Топология',
    category: 'Динамика & СУ',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА / Дроны / VTOL',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Моделирование децентрализованного группового управления роем (Reynolds Flocking: Cohesion, Separation, Alignment). Расчет аэродинамической интерференции и экономии энергии в V-клине (Upwash-вихри до 18%), перестроения топологий и устойчивости Mesh-радиосети при потере узлов.',
    engineeringImpact: 'Обеспечивает синхронное автономное выполнение групповых миссий (поиск, прикрытие, картографирование) с сохранением связности сети и снижением расхода аккумуляторов/топлива ведомых аппаратов.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'БПЛА & Роевой Интеллект',
    mathBasis: '\\mathbf{F}_i = W_{\\text{sep}} \\mathbf{F}_{i,\\text{sep}} + W_{\\text{coh}} \\mathbf{F}_{i,\\text{coh}} + W_{\\text{ali}} \\mathbf{F}_{i,\\text{ali}}, \\quad \\lambda_2(L) > 0, \\quad \\Delta C_{Di} = -\\eta_{\\text{upwash}} \\frac{C_L^2}{\\pi e AR}',
  },
  {
    id: 'feat_uav_octomap_vfh_avoidance',
    title: '29. Автономное 3D-Картографирование (OctoMap) & Избегание Препятствий (VFH+/A*)',
    category: 'Космос & Авионика',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА / Дроны / VTOL',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Вероятностное 3D воксельное картографирование OctoMap по данным LiDAR/Stereo-Vision, векторно-полевые полярные гистограммы VFH+ и локально-глобальный планировщик траекторий огибания (A*/ESDF) в лесу, городской застройке и вблизи ЛЭП.',
    engineeringImpact: 'Обеспечивает безаварийный автономный полет БПЛА в условиях полного отсутствия спутниковой навигации (GPS-denied) и при наличии динамических и сверхтонких препятствий.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'БПЛА & Sense-and-Avoid',
    mathBasis: 'l(m_i \\mid z_{1:t}) = l(m_i \\mid z_{1:t-1}) + l(m_i \\mid z_t) - l_0, \\quad G(\\theta) = c_1 |\\theta - \\theta_{\\text{tgt}}| + c_2 \\frac{1}{d_{\\text{clear}}}, \\quad \\text{TTC} = \\frac{d_{\\min}}{V}',
  },
  {
    id: 'feat_uav_aeroacoustics_fwh_detection',
    title: '30. Аэроакустическая Заметность БПЛА, Шумовой След Винтов (FW-H) & Обнаружение Микрофонами',
    category: 'Аэродинамика',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА / Дроны / VTOL',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Расчет спектра шума вращающихся винтов на основе уравнения Фоукса Вильямса — Хокингса (FW-H), тонального шума лопастей (BPF), затухания в атмосфере по ISO 9613-1 и дальности обнаружения наземными акустическими пеленгаторами.',
    engineeringImpact: 'Позволяет рассчитывать безопасные высоты и режимы полета БПЛА для исключения акустического демаскирования над заданными районами и проектировать малошумные геометрии винтов.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'БПЛА & Акустическая Скрытность',
    mathBasis: '\\square^2 p\'(\\mathbf{x}, t) = \\frac{\\partial}{\\partial t}[\\rho_0 v_n \\delta(f)] - \\frac{\\partial}{\\partial x_i}[L_i \\delta(f)] + \\frac{\\partial^2 T_{ij}}{\\partial x_i \\partial x_j}, \\quad f_{\\text{BPF}} = \\frac{B \\cdot \\text{RPM}}{60}',
  },
  {
    id: 'feat_uav_fault_tolerant_control',
    title: '31. Отказоустойчивое управление БПЛА при отказе моторов (Control Allocation QP & Fault-Tolerant Control)',
    category: 'Динамика & СУ',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА / Дроны / Мультироторы',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Математическое перераспределение тяги оставшихся моторов через квадратичное программирование (Quadratic Programming Control Allocation) при внезапном отказе 1 или 2 двигателей на Hexa/Octo/X8/Quad. Режим управляемой спиральной посадки (Controlled Yaw Spin) для квадрокоптеров при потере одного пропеллера.',
    engineeringImpact: 'Предотвращает крушение и потерю дорогостоящей полезной нагрузки (LiDAR, оптоэлектроника) при отказе мотора или обрыве лопасти в полете.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'БПЛА & Отказоустойчивость',
    mathBasis: '\\min_{\\mathbf{u}} \\|\\mathbf{W}_v (\\mathbf{B}\\mathbf{u} - \\mathbf{v}_{\\text{des}})\\|^2 + \\|\\mathbf{W}_u (\\mathbf{u} - \\mathbf{u}_0)\\|^2 \\quad \\text{s.t.} \\quad \\mathbf{u}_{\\min} \\le \\mathbf{u} \\le \\mathbf{u}_{\\max}',
  },
  {
    id: 'feat_uav_ducted_fan_edf',
    title: '32. Аэродинамика кольцевых импеллеров и винтов в кольце (Ducted Fan / EDF Lip Suction Multiplier)',
    category: 'Аэродинамика',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА / EDF / VTOL',
    priority: 'p1_high',
    priorityLabel: 'P1: Высокий приоритет',
    description: 'Расчет аэродинамического экрана кольца (Duct Shroud), профилирования губы воздухозаборника (Lip Suction) и диффузора. Определение прироста тяги T_duct / T_open до 26% на режиме висения и изменения коэффициента расхода при поступательной скорости.',
    engineeringImpact: 'Позволяет проектировать компактные защищенные дроны для инспекции труб, помещений и высокоскоростные БПЛА с импеллерными установками.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'БПЛА & Импеллеры',
    mathBasis: 'T_{\\text{total}} = T_{\\text{rotor}} + T_{\\text{duct}} = \\dot{m}(V_e - V_0) + (p_e - p_0)A_e, \\quad \\frac{T_{\\text{ducted}}}{T_{\\text{open}}} = \\sqrt[3]{2 \\frac{A_d}{A_0}} \\approx 1.26',
  },
  {
    id: 'feat_uav_hybrid_ice_powertrain',
    title: '33. Гибридные бензо-электрические СУ БПЛА (ICE Generator & Specific Fuel Consumption BSFC)',
    category: 'Двигатели & Пропульсия',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА Дальнего Действия',
    priority: 'p1_high',
    priorityLabel: 'P1: Высокий приоритет',
    description: 'Математическое моделирование гибридной силовой установки: 2-тактный/4-тактный ДВС-генератор постоянного тока, буферная LiPo батарея высокой токоотдачи, энергобаланс пиковых нагрузок и удельный расход топлива BSFC (г/кВт·ч). Увеличение длительности полета с 40 минут до 6–10 часов.',
    engineeringImpact: 'Обеспечивает проектирование стратегических разведывательных и мониторинговых БПЛА большой дальности без необходимости применения тяжелых и медленно заряжаемых АКБ.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'БПЛА & Гибридные СУ',
    mathBasis: 'P_{\\text{gen}} = \\eta_{\\text{gen}} P_{\\text{ICE}}, \\quad m_{\\text{fuel}}(t) = m_0 - \\int_0^t \\text{BSFC} \\cdot P_{\\text{ICE}}(\\tau) \\, d\\tau, \\quad P_{\\text{bat}} = P_{\\text{prop}} - P_{\\text{gen}}',
  },
  {
    id: 'feat_uav_in_flight_icing',
    title: '34. Моделирование высотного обледенения БПЛА и деградации поляр (In-Flight Rime/Glaze Icing & Anti-Ice)',
    category: 'Аэродинамика',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА Всепогодные',
    priority: 'p1_high',
    priorityLabel: 'P1: Высокий приоритет',
    description: 'Расчет улавливания переохлажденных капель воды (LWC, MVD) передними кромками крыла и лопастями винтов. Расчет падения C_Lmax до 40%, роста C_D0 до 180%, деградации тяги винтов и требуемой мощности электротермического противообледенительного обогрева (Вт/дм²).',
    engineeringImpact: 'Критически необходимо для предотвращения внезапных срывов потока и падений БПЛА при полетах в облачности и при отрицательных температурах.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'БПЛА & Всепогодность',
    mathBasis: '\\frac{dM_{\\text{ice}}}{dt} = \\beta_c \\cdot \\text{LWC} \\cdot V_\\infty \\cdot S_{\\text{proj}}, \\quad q_{\\text{anti-ice}} = h_c (T_{\\text{surface}} - T_{\\text{amb}}) + \\dot{m}_{\\text{evap}} L_v',
  },
  {
    id: 'feat_uav_loitering_munition_dive',
    title: '35. Аэродинамика пикирования и баллистика барражирующих боеприпасов (Terminal Dive & Aeroelastic Folding)',
    category: 'Аэродинамика',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА / Барражирующие Боеприпасы',
    priority: 'p1_high',
    priorityLabel: 'P1: Высокий приоритет',
    description: 'Расчет аэродинамической устойчивости, балансировочных углов рулей и аэроупругости складных Х-образных крыльев при крутом терминальном пикировании на скоростях 180–300 км/ч под углами до 90°. Расчет аэродинамического сопротивления воздушного винта в режиме авторотации/торможения.',
    engineeringImpact: 'Гарантирует высокоточную стабилизацию и отсутствие флагманского разрушения консолей дронов-камикадзе на финальном участке наведения на цель.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'БПЛА & Высокоскоростное Пикирование',
    mathBasis: 'm \\frac{dV}{dt} = -D + mg \\sin\\gamma - T_{\\text{windmilling}}, \\quad n_y = \\frac{L}{mg} + \\cos\\gamma \\le n_{y,\\max}',
  },
  {
    id: 'feat_uav_dsmac_tercom_navigation',
    title: '36. Оптическая корреляционная навигация рельефа DSMAC/TERCOM при подавлении РЭБ',
    category: 'Космос & Авионика',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА Автономные',
    priority: 'p2_medium',
    priorityLabel: 'P2: Средний приоритет',
    description: 'Алгоритмы сопоставления эталонных спутниковых и высотных цифровых матриц рельефа (DEM) с бортовыми снимками камеры БПЛА (Digital Scene Matching Area Correlator). Двумерная нормализованная взаимная корреляция (NCC) и фильтр позиционирования с субпиксельной точностью.',
    engineeringImpact: 'Позволяет автономному БПЛА продолжать полет по маршруту длиной сотни километров при 100% подавлении GPS и отсутствии радиосвязи.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'БПЛА & Автономная Навигация',
    mathBasis: '\\text{NCC}(u,v) = \\frac{\\sum_{x,y} [I(x,y) - \\bar{I}][T(x-u, y-v) - \\bar{T}]}{\\sqrt{\\sum [I(x,y)-\\bar{I}]^2 \\sum [T(x-u, y-v)-\\bar{T}]^2}}',
  },
  {
    id: 'feat_uav_dubins_path_wind_routing',
    title: '37. Оптимальное планирование маршрутов огибания рельефа с учетом радиуса виража (Dubins & Reeds-Shepp Paths)',
    category: 'Динамика & СУ',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА Самолетного Типа',
    priority: 'p2_medium',
    priorityLabel: 'P2: Средний приоритет',
    description: 'Построение кинематически гладких $G^1$/$G^2$-траекторий минимальной длины (кривые Дубинса: RSR, RSL, LSR, LSL, RLR, LRL) с учетом минимального радиуса виража $R_{\\min} = V^2 / (g \\tan \\phi_{\\max})$, ветра $V_w$ и коридоров безопасности рельефа.',
    engineeringImpact: 'Исключает сваливание самолетных БПЛА в крутом вираже и минимизирует время облета заданных зон патрулирования.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'БПЛА & Траекторное Планирование',
    mathBasis: 'R_{\\min} = \\frac{V_{\\text{air}}^2}{g \\tan \\phi_{\\max}}, \\quad L_{\\text{Dubins}} = d_{\\text{arc1}} + d_{\\text{line}} + d_{\\text{arc2}}',
  },
  {
    id: 'feat_uav_rcs_ir_stealth_signature',
    title: '38. Моделирование инфракрасной и радарной заметности БПЛА (IR Signature Suppression & RCS)',
    category: 'Прочность & Вес',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА Малозаметные',
    priority: 'p2_medium',
    priorityLabel: 'P2: Средний приоритет',
    description: 'Расчет эффективной площади рассеяния (ЭПР / RCS) планера в X/Ku-диапазонах радиоволн методом физической оптики (PO) и расчет инфракрасного излучения нагретых моторов/выхлопных газов по закону Стефана-Больцмана.',
    engineeringImpact: 'Позволяет оптимизировать углы граней планера и геометрию экранирования выхлопа для снижения дальности обнаружения радарами и тепловизорами ПВО.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: 'БПЛА & Сигнатурная Скрытность',
    mathBasis: '\\sigma = \\lim_{R \\to \\infty} 4\\pi R^2 \\frac{|\\mathbf{E}_s|^2}{|\\mathbf{E}_i|^2}, \\quad E_{\\text{rad}} = \\epsilon \\sigma_{\\text{SB}} T^4 S_{\\text{emitter}}',
  },
  {
    id: 'feat_uav_mavlink_dds_telemetry_bus',
    title: '39. Интеграция протоколов телеметрии и бортовой шины MAVLink 2.0 / Micro-XRCE-DDS',
    category: 'Космос & Авионика',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА / Бортовое ПО',
    priority: 'p3_rnd',
    priorityLabel: 'P3: Перспективно & R&D',
    description: 'Анализатор пропускной способности и джиттера пакетов MAVLink 2.0 (HEARTBEAT, ATTITUDE, HIGHRES_IMU, GLOBAL_POSITION_INT) и ROS2 / Micro-XRCE-DDS для бортовых вычислителей (Companion Computer: Raspberry Pi / Jetson). Оптимизация частоты опроса датчиков под узкополосные радиоканалы 915 МГц.',
    engineeringImpact: 'Предотвращает переполнение буферов UART/CAN-шины автопилота и гарантирует отсутствие задержек телеметрии на наземной станции управления (GCS).',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: 'БПЛА & Бортовые Сети',
    mathBasis: '\\text{BW}_{\\text{req}} = \\sum_{m=1}^M f_m \\cdot (S_m + \\text{Header}_{\\text{MAVLink}} + 2) \\cdot 8 \\le \\text{BaudRate} \\cdot \\eta_{\\text{channel}}',
  },
  {
    id: 'feat_uav_blade_flapping_aero',
    title: '40. Нестационарная аэродинамика махового движения гибких лопастей БПЛА (Blade Flapping & Rotor-Arm)',
    category: 'Аэродинамика',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА / Мультироторы',
    priority: 'p3_rnd',
    priorityLabel: 'P3: Перспективно & R&D',
    description: 'Моделирование гармонических колебаний гибких углепластиковых лопастей мультиротора при полете вперед со скосом набегающего потока (коэффициент опережения $\\mu = V / (\\Omega R)$). Расчет аэродинамического момента сопротивления крену H-force и интерференции струи винта с трубчатыми лучами рамы (Rotor-Arm drag penalty).',
    engineeringImpact: 'Повышает точность полетной динамики скоростных квадрокоптеров и исключает паразитную раскачку автопилота на скоростях свыше 100 км/ч.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: 'БПЛА & Нестационарная Аэродинамика',
    mathBasis: '\\beta(\\psi) = a_0 - a_1 \\cos\\psi - b_1 \\sin\\psi, \\quad H = \\frac{1}{2} \\rho (\\Omega R)^2 A \\left( \\frac{\\sigma C_{d0}}{8} \\mu + \\frac{\\sigma a}{8} \\frac{\\mu \\theta_0}{1 + \\dots} \\right)',
  },
  // ==========================================
  // САПР, ИИ-ГЕНЕРАТИВНЫЙ ДИЗАЙН & 3D КОНСТРУКТОР СБОРКИ БПЛА
  // ==========================================
  {
    id: 'feat_uav_generative_mdo_optimizer',
    title: '41. Автоматический Генеративный Дизайн & Многокритериальная Оптимизация БПЛА по ТЗ (MDO / Genetic Pareto Optimizer)',
    category: 'Динамика & СУ',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА / Генеративный Дизайн',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Автоматический синтез оптимальной геометрии планера (размах, хорда, профиль, удлинение AR) и силовой установки по входному ТЗ (полезная нагрузка, дальность, время барражирования, лимит MTOW). Построение фронта Парето и выбор оптимального компромисса между дальностью и массой.',
    engineeringImpact: 'Устраняет необходимость ручного перебора параметров: инженер за секунды получает 3 оптимальных варианта планера под конкретную задачу.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'САПР: Фаза 1 (Генеративный ИИ)',
    mathBasis: '\\min_{\\mathbf{x}} \\{ -R(\\mathbf{x}), m_{\\text{tot}}(\\mathbf{x}) \\} \\quad \\text{s.t.} \\quad V_{\\text{stall}} \\le 45 \\text{ км/ч}, \\, 10\\% \\le \\text{SM} \\le 15\\%',
  },
  {
    id: 'feat_uav_3d_cad_assembly_gizmo',
    title: '42. Интерактивный 3D CAD-Конструктор Сборочного Узла БПЛА (Three.js TransformControls & Drag-and-Drop)',
    category: 'Прочность & Вес',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА / САПР Сборки',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Интерактивная 3D-среда компоновки узлов дрона (аккумуляторы, автопилот, моторы, подвес камеры, парашют) с манипуляторами перемещения Gizmo (оси X, Y, Z), привязкой к направляющим фюзеляжа и визуализацией каркаса планера.',
    engineeringImpact: 'Позволяет компоновать реальный беспилотник внутри прозрачного фюзеляжа в браузере так же удобно, как в SolidWorks или Fusion 360.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'САПР: Фаза 2 (3D Сборка)',
    mathBasis: '\\mathbf{r}_{\\text{world}} = \\mathbf{T}_{\\text{assembly}} \\cdot \\mathbf{r}_{\\text{local}}, \\quad \\text{RaycastIntersect}(x,y) \\to \\text{SnapToGrid}',
  },
  {
    id: 'feat_uav_dynamic_cg_inertia_tensor',
    title: '43. Динамический расчет Центра Тяжести (CG) и Тензора Инерции (Huygens-Steiner Tensor Ixx, Iyy, Izz)',
    category: 'Динамика & СУ',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА / Масс-Инерция',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Мгновенный пересчет пространственного центра масс и полного тензора инерции 3x3 при любом перемещении компонентов сборки по формулам параллельного переноса осей Гюйгенса-Штейнера. Визуализация красной сферы CG и эллипсоида инерции.',
    engineeringImpact: 'Исключает аварии из-за неверной центровки и формирует точные массово-инерционные параметры для настройки полетного контроллера.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'САПР: Фаза 2 (3D Сборка)',
    mathBasis: '\\mathbf{R}_{\\text{cg}} = \\frac{\\sum m_i \\mathbf{r}_i}{\\sum m_i}, \\quad I_{xx} = \\sum [I_{xx,i} + m_i(y_i^2 + z_i^2)]',
  },
  {
    id: 'feat_uav_static_margin_autotuning',
    title: '44. Авто-балансировщик Продольной Статической Устойчивости (Neutral Point x_np & Static Margin Auto-Tuning)',
    category: 'Динамика & СУ',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА Самолетного Типа',
    priority: 'p1_high',
    priorityLabel: 'P1: Высокий приоритет',
    description: 'Алгоритм автоматического сдвига батарейного отсека и полезной нагрузки вдоль фюзеляжа для удержания запаса статической устойчивости (Static Margin) строго в диапазоне 10–14% от средней аэродинамической хорды (MAC) относительно нейтральной точки.',
    engineeringImpact: 'Гарантирует устойчивый и предсказуемый полет без склонности к клевкам носом или неуправляемому кабрированию/штопору.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'САПР: Фаза 1 (Генеративный ИИ)',
    mathBasis: '\\text{SM} = \\frac{x_{\\text{np}} - x_{\\text{cg}}}{\\bar{c}} \\times 100\\%, \\quad x_{\\text{np}} = x_{\\text{ac,w}} + \\frac{C_{L\\alpha,h}}{C_{L\\alpha,w}} \\eta_h \\frac{S_h}{S_w} l_h',
  },
  {
    id: 'feat_uav_vmg_prop_motor_match_solver',
    title: '45. Автоматический подбор ВМГ по кривым эффективности (Motor-Prop Matching & Cruise Efficiency Global Min)',
    category: 'Двигатели & Пропульсия',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА / ВМГ Оптимизатор',
    priority: 'p1_high',
    priorityLabel: 'P1: Высокий приоритет',
    description: 'Автоматический подбор оптимальной связки «Бесколлекторный Мотор (KV, $R_i, I_0$) + Пропеллер (диаметр D, шаг P, дисковое заполнение) + Регулятор ESC» из базы данных (T-Motor, Sunnysky, APC) под крейсерскую скорость с КПД силовой установки свыше 82%.',
    engineeringImpact: 'Максимизирует дальность полета за счет исключения перегрева моторов и работы пропеллера в зоне пиковой тяговой отдачи.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'САПР: Фаза 1 (Генеративный ИИ)',
    mathBasis: '\\eta_{\\text{sys}} = \\eta_{\\text{motor}}(I) \\cdot \\eta_{\\text{prop}}(J), \\quad J = \\frac{V_\\infty}{n \\cdot D}, \\quad P_{\\text{elec}} = U \\cdot I',
  },
  {
    id: 'feat_uav_collision_wiring_harness',
    title: '46. Проверка Коллизий, Зазоров и Трассировка Силовой Проводки (Collision Detection & AWG Voltage Drop)',
    category: 'Прочность & Вес',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА / САПР Сборки',
    priority: 'p1_high',
    priorityLabel: 'P1: Высокий приоритет',
    description: 'Пространственная проверка пересечений 3D-тел компонентов (Axis-Aligned Bounding Box / OBB collision), расчет зазоров между кончиками винтов и фюзеляжем (минимум 15 мм), автоматический расчет сечения силовых проводов (AWG) и падения напряжения $\\Delta U = 2 I L \\rho / S$.',
    engineeringImpact: 'Предотвращает механические заклинивания и прогары бортовой проводки дрона под высокими токами.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'САПР: Фаза 2 (3D Сборка)',
    mathBasis: '\\Delta U = I_{\\max} \\cdot \\frac{2 \\cdot L \\cdot \\rho_{\\text{Cu}}}{S_{\\text{AWG}}} \\le 0.03 \\cdot U_{\\text{bat}}, \\quad \\text{OBB}_A \\cap \\text{OBB}_B = \\emptyset',
  },
  {
    id: 'feat_uav_dxf_stl_production_export',
    title: '47. Сквозной Экспорт для ЧПУ & 3D-Печати (DXF Ribs/Spars Laser Cut & STL Motor-Mount / Fuselage Shells)',
    category: 'Прочность & Вес',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА / Производство',
    priority: 'p2_medium',
    priorityLabel: 'P2: Средний приоритет',
    description: 'Автоматическая генерация векторных чертежей сечений нервюр и лонжеронов с пазами под сборку в формате `.DXF` для лазерного ЧПУ-раскроя фанеры/бальзы/карбона, а также экспорт оболочек моторам и носовых обтекателей в формат `.STL` для 3D-печати.',
    engineeringImpact: 'Сокращает путь от виртуального проекта до готового физического планера на столе до 1–2 дней.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'САПР: Фаза 3 (Производство)',
    mathBasis: '\\mathbf{P}_{\\text{rib}}(x) = \\text{Airfoil}(x) \\times c_i + \\text{JointNotch}(w_{\\text{spar}}, h_{\\text{spar}})',
  },
  {
    id: 'feat_uav_ardupilot_px4_param_generator',
    title: '48. Генератор Конфигураций Автопилотов ArduPilot / PX4 (.param Mixer Matrix & PID Tuning Seeds)',
    category: 'Космос & Авионика',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА / Авионика',
    priority: 'p2_medium',
    priorityLabel: 'P2: Средний приоритет',
    description: 'Автоматический расчет начальных коэффициентов ПИД-регуляторов ($P, I, D, FF$), матрицы микширования моторов и сервоприводов на основе рассчитанного тензора инерции и площадей элевонов. Экспорт готового файла параметров `.param` для QGroundControl и Mission Planner.',
    engineeringImpact: 'Позволяет безопасно поднять спроектированный БПЛА в первый полет без опасной раскачки по осям.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'САПР: Фаза 4 (Автопилоты & HIL)',
    mathBasis: 'K_p = \\frac{2 \\zeta \\omega_n I_{xx}}{K_{\\text{actuator}}}, \\quad \\mathbf{u}_{\\text{motors}} = \\mathbf{B}^{\\dagger} \\cdot \\mathbf{\\tau}_{\\text{cmd}}',
  },
  {
    id: 'feat_uav_hil_sitl_virtual_windtunnel',
    title: '49. Виртуальный Полетный Симулятор HIL / SITL в Аэродинамической Трубе (WebHID Gamepad RC-Control)',
    category: 'Динамика & СУ',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА / HIL Симулятор',
    priority: 'p3_rnd',
    priorityLabel: 'P3: Перспективно & R&D',
    description: 'Интеграция виртуального полета спроектированного БПЛА в браузере с управлением от реального пульта радиоуправления (через USB Gamepad / WebHID API). 6-DoF нелинейная динамика с визуализацией срыва потока и ветровых порывов.',
    engineeringImpact: 'Обеспечивает виртуальный облет дрона инженером-испытателем еще до изготовления физического прототипа.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'САПР: Фаза 4 (Автопилоты & HIL)',
    mathBasis: '\\dot{\\mathbf{v}} = \\frac{\\mathbf{F}_{\\text{aero}} + \\mathbf{F}_{\\text{prop}}}{m} - \\mathbf{\\omega} \\times \\mathbf{v} + \\mathbf{g}, \\quad \\dot{\\mathbf{\\omega}} = \\mathbf{I}^{-1}(\\mathbf{M} - \\mathbf{\\omega} \\times \\mathbf{I}\\mathbf{\\omega})',
  },
  {
    id: 'feat_uav_cloud_fea_spar_buckling',
    title: '50. Параметрический FEA-Анализ Прочности Лонжерона и Обшивки (Bending Moment & Skin Buckling)',
    category: 'Прочность & Вес',
    vehicleClass: 'uav',
    vehicleClassLabel: 'БПЛА / Прочность',
    priority: 'p3_rnd',
    priorityLabel: 'P3: Перспективно & R&D',
    description: 'Расчет эпюр перерезывающих сил $Q(z)$ и изгибающих моментов $M(z)$ консоли крыла при расчетной перегрузке $n_y = +6g$. Расчет толщины карбоновой трубки лонжерона и критических напряжений потери устойчивости тонкой обшивки (Skin Buckling).',
    engineeringImpact: 'Гарантирует прочность крыла при резких маневрах и выходе из пикирования с минимальной массой конструкции.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: 'САПР: Фаза 3 (Производство)',
    mathBasis: '\\sigma_{\\max} = \\frac{M(z) \\cdot y_{\\max}}{I_z} \\le [\\sigma_{\\text{allow}}], \\quad \\tau_{\\text{cr}} = k_s \\frac{\\pi^2 E}{12(1-\\nu^2)} \\left(\\frac{t}{b}\\right)^2',
  },

  // ==========================================
  // РАЗДЕЛ I: ИНТЕРФЕЙС, ЮЗЕР-ФРЕНДЛИ & ЭРГОНОМИКА ИНЖЕНЕРА (UX/UI ECOSYSTEM)
  // ==========================================
  {
    id: 'feat_ux_design_wizard_5steps',
    title: '51. Интерактивный Пошаговый Мастер Проектирования «Design Wizard» (От Идеи до 3D-Модели за 5 Шагов)',
    category: 'Интерфейс & Юзер-Френдли (UX/UI)',
    vehicleClass: 'app_platform',
    vehicleClassLabel: 'Платформа & Юзер-Френдли',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Интуитивный мастер с понятными карточками и визуальными подсказками: Шаг 1 (Назначение и полезная нагрузка) → Шаг 2 (Выбор аэродинамической схемы) → Шаг 3 (Подбор профиля и размаха) → Шаг 4 (Силовая установка и АКБ) → Шаг 5 (Сводный паспорт и 3D-просмотр). Сопровождается визуальными анимациями и рекомендациями.',
    engineeringImpact: 'Снижает порог входа для молодых инженеров и студентов в 5 раз, позволяя спроектировать физически корректный аппарат без штудирования сотен страниц формул.',
    autoDetected: false,
    defaultStatus: 'in_progress',
    targetMilestone: 'Юзер-Френдли Платформа v3.1',
    mathBasis: '\\text{Workflow} = \\{ \\text{Payload} \\to \\text{AeroLayout} \\to \\text{WingGeometry} \\to \\text{Propulsion} \\to \\text{Validation} \\}',
  },
  {
    id: 'feat_ux_command_palette_ctrl_k',
    title: '52. Командная Палитра Быстрого Доступа & Горячие Клавиши (Command Palette Ctrl+K / ⌘K)',
    category: 'Интерфейс & Юзер-Френдли (UX/UI)',
    vehicleClass: 'app_platform',
    vehicleClassLabel: 'Платформа & Юзер-Френдли',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Мгновенный вызов всплывающей командной строки (Ctrl+K) с нечетким поиском (Fuzzy Search), быстрым прыжком к любому графику, пресету, переключением тем, запуском решателя и вычислением формул прямо в строке ввода без мыши.',
    engineeringImpact: 'Ускоряет ежедневную работу опытного инженера-расчетчика на 40% за счет быстрой навигации без блуждания по вкладкам.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'Инженерная Эргономика',
    mathBasis: '\\text{SearchScore} = \\text{LevenshteinDistance}(q, \\text{Keyword}) + \\text{TagWeight}',
  },
  {
    id: 'feat_ux_realtime_sanity_check_hints',
    title: '53. Контекстные Подсказки & Автопроверка на Инженерные Ошибки (Real-Time Physics Sanity Check)',
    category: 'Интерфейс & Юзер-Френдли (UX/UI)',
    vehicleClass: 'app_platform',
    vehicleClassLabel: 'Платформа & Юзер-Френдли',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Интеллектуальный страж физической корректности: при вводе параметров в реальном времени анализирует физику и подсвечивает критические несоответствия («Внимание: Удельная нагрузка на крыло W/S > 120 кг/м² — скорость сваливания превысит 110 км/ч», «Лонжерон толще строительной высоты профиля!», «Отрицательный статический запас — ЛА неустойчив»).',
    engineeringImpact: 'Предотвращает грубые проектные ошибки и дорогостоящие аварии прототипов еще на стадии эскизного ввода чисел.',
    autoDetected: false,
    defaultStatus: 'in_progress',
    targetMilestone: 'Инженерная Безопасность',
    mathBasis: '\\text{AlertFlag} = (\\text{SM} < 0.05) \\lor (t_{\\text{spar}} > c \\cdot (t/c)) \\lor (P_{\\text{req}} > P_{\\text{max}})',
  },
  {
    id: 'feat_ux_blueprint_engineering_theme',
    title: '54. Чертежный Инженерный Режим «Blueprint Engineering Mode & ГОСТ-Сетка»',
    category: 'Интерфейс & Юзер-Френдли (UX/UI)',
    vehicleClass: 'app_platform',
    vehicleClassLabel: 'Платформа & Юзер-Френдли',
    priority: 'p1_high',
    priorityLabel: 'P1: Высокий приоритет',
    description: 'Специальная высококонтрастная чертежная тема (глубокий технический синий / Blueprint-сетка с миллиметровыми делениями, технические моноширинные шрифты, выноски размеров с допусками и посадочными размерами, удобный экспорт скриншотов для проекторов и цеховой документации).',
    engineeringImpact: 'Обеспечивает идеальную читаемость графиков и моделей при демонстрациях на проекторах, печать на плоттерах и работу в условиях производственного цеха.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: 'Инженерная Эргономика',
    mathBasis: '\\text{ContrastRatio} \\ge 7:1 \\text{ (WCAG AAA)}, \\quad \\text{GridStep} = 10\\text{ мм} / 50\\text{ мм}',
  },
  {
    id: 'feat_ux_adaptive_density_multimonitor',
    title: '55. Адаптивная Плотность Интерфейса & Многооконный Режим (Compact Density & Multi-Window Dock)',
    category: 'Интерфейс & Юзер-Френдли (UX/UI)',
    vehicleClass: 'app_platform',
    vehicleClassLabel: 'Платформа & Юзер-Френдли',
    priority: 'p2_medium',
    priorityLabel: 'P2: Средний приоритет',
    description: 'Переключение плотности отображения между режимом обучения (просторные карточки с пояснениями) и ультра-компактным режимом профи-инженера (высокая плотность таблиц, открепляемые плавающие панели графиков, поддержка многомониторных конфигураций 4K).',
    engineeringImpact: 'Позволяет эффективно разместить на одном или двух экранах одновременно 3D-модель, эпюры давлений, полярные кривые и окно параметров без лишнего скроллинга.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: 'Интерфейс & Продуктивность',
    mathBasis: '\\text{GridDensity} \\in \\{ \\text{Spacious (Mobile/Study)}, \\text{Standard}, \\text{UltraDense (Pro 4K)} \\}',
  },

  // ==========================================
  // РАЗДЕЛ II: ВИЗУАЛЬНОЕ ВОСПРИЯТИЕ & 3D ГРАФИКА (VISUAL IMMERSION & 3D CFD)
  // ==========================================
  {
    id: 'feat_vis_volumetric_particle_streamlines',
    title: '56. Анимированные Линии Тока Частиц (Volumetric 3D Particle Streamlines & Streaklines)',
    category: 'Визуальное Восприятие & 3D Графика',
    vehicleClass: 'universal',
    vehicleClassLabel: '3D Визуализация & CFD',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Трехмерная интерактивная анимация тысяч светящихся частиц воздушного потока, обтекающих крыло, фюзеляж и винты в реальном времени с цветовой дифференциацией по числу Маха, местному коэффициенту давления $C_p$ и турбулентной кинетической энергии $k$.',
    engineeringImpact: 'Делает невидимые аэродинамические явления (скос потока, зоны разрежения, перетекание через законцовку) наглядными и понятными с первого взгляда.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: '3D Визуальная Лаборатория',
    mathBasis: '\\frac{d\\mathbf{x}_p}{dt} = \\mathbf{u}(\\mathbf{x}_p, t), \\quad \\text{Color} = \\text{Colormap}(C_p, \\text{min}=-3.0, \\text{max}=1.0)',
  },
  {
    id: 'feat_vis_dynamic_section_clipping_planes',
    title: '57. Интерактивные Секущие Плоскости (Dynamic 3D Section Clipping X/Y/Z with Live Cp Profiles)',
    category: 'Визуальное Восприятие & 3D Графика',
    vehicleClass: 'universal',
    vehicleClassLabel: '3D Визуализация & CFD',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Интерактивный срез 3D-модели планера и поля давлений плоскостями X, Y, Z с помощью трехмерного ползунка. Мгновенный вывод плоской эпюры распределения давления $C_p(x/c)$ и толщины пограничного слоя в выбранном сечении.',
    engineeringImpact: 'Позволяет инженеру мгновенно исследовать внутреннюю структуру потока в любом сечении крыла или стыка фюзеляжа без экспорта в тяжелые внешние постпроцессоры.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: '3D Визуальная Лаборатория',
    mathBasis: '\\mathbf{n} \\cdot (\\mathbf{r} - \\mathbf{r}_0) = 0, \\quad C_p(x/c) = 1 - \\left(\\frac{V(x/c)}{V_\\infty}\\right)^2',
  },
  {
    id: 'feat_vis_q_criterion_vortex_cores',
    title: '58. Изоповерхности Вихревых Жгутов (Q-Criterion & Lambda-2 Vortex Core Identification)',
    category: 'Визуальное Восприятие & 3D Графика',
    vehicleClass: 'universal',
    vehicleClassLabel: '3D Визуализация & CFD',
    priority: 'p1_high',
    priorityLabel: 'P1: Высокий приоритет',
    description: 'Автоматическое выделение и полупрозрачный 3D-рендеринг вихревых ядер (концевые вихри крыла, наплывы LEX, вихревые следы от лопастей винтов и стоек шасси) на основе второго инварианта тензора градиента скорости $Q = \\frac{1}{2}(\\|\\boldsymbol{\\Omega}\\|^2 - \\|\\mathbf{S}\\|^2) > 0$.',
    engineeringImpact: 'Критично для анализа эффективности винглетов, скоса потока на оперение и обеспечения вихревой безопасности в строю и при посадке.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: '3D Визуальная Лаборатория',
    mathBasis: 'Q = \\frac{1}{2} (\\Omega_{ij} \\Omega_{ij} - S_{ij} S_{ij}) > Q_{\\text{threshold}}, \\quad S_{ij} = \\frac{1}{2}(\\partial_j u_i + \\partial_i u_j)',
  },
  {
    id: 'feat_vis_pbr_materials_studio_lighting',
    title: '59. Фотореалистичный PBR-Рендеринг Материалов (Three.js Physically Based Materials & SSAO)',
    category: 'Визуальное Восприятие & 3D Графика',
    vehicleClass: 'universal',
    vehicleClassLabel: '3D Визуализация & Графика',
    priority: 'p1_high',
    priorityLabel: 'P1: Высокий приоритет',
    description: 'Высококачественные шейдеры материалов летательного аппарата: фактура плетения углеткани 3K Twill, матовый и полированный авиационный дюралюминий Д16Т, стеклопластик, полупрозрачный фонарь кабины с отражениями неба и мягкие контактные тени SSAO.',
    engineeringImpact: 'Позволяет презентовать проект инвесторам и заказчикам в кинематографическом качестве прямо из браузера без необходимости рендера в Blender или KeyShot.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: '3D Визуальная Лаборатория',
    mathBasis: 'f_r(\\mathbf{\\omega}_i, \\mathbf{\\omega}_o) = \\frac{D(h) F(\\mathbf{\\omega}_i, h) G(\\mathbf{\\omega}_i, \\mathbf{\\omega}_o, h)}{4 (\\mathbf{n} \\cdot \\mathbf{\\omega}_i)(\\mathbf{n} \\cdot \\mathbf{\\omega}_o)}',
  },
  {
    id: 'feat_vis_slowmo_flow_separation_stall',
    title: '60. Режим Замедленной Съемки Срыва Потока & Динамического Сваливания (Slow-Mo Flow Separation)',
    category: 'Визуальное Восприятие & 3D Графика',
    vehicleClass: 'universal',
    vehicleClassLabel: '3D Визуализация & CFD',
    priority: 'p2_medium',
    priorityLabel: 'P2: Средний приоритет',
    description: 'Интерактивная покадровая визуализация развития срыва потока при плавном увеличении угла атаки $\\alpha$: от зарождения ламинарного пузыря отрыва до прогрессирующего отрыва с задней кромки и полного сваливания с вибрацией планера.',
    engineeringImpact: 'Дает инженеру и летчику-испытателю глубокое визуальное понимание предвестников сваливания и эффективности противосрывных гребней и генераторов вихрей (Vortex Generators).',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: '3D Визуальная Лаборатория',
    mathBasis: '\\tau_w = \\mu \\left(\\frac{\\partial u}{\\partial y}\\right)_{y=0} \\le 0 \\implies \\text{Flow Separation Onset}',
  },
  {
    id: 'feat_vis_3d_stress_heatmap_projection',
    title: '61. 3D Проекция Эпюр Напряжений и Деформаций по Мизесу на Планер (Stress Heatmap Mapping)',
    category: 'Визуальное Восприятие & 3D Графика',
    vehicleClass: 'universal',
    vehicleClassLabel: '3D Визуализация & Прочность',
    priority: 'p2_medium',
    priorityLabel: 'P2: Средний приоритет',
    description: 'Наложение цветовой тепловой карты эквивалентных механических напряжений по фон Мизесу $\\sigma_{\\text{vM}}$ и упругого прогиба консоли $w(z)$ непосредственно на 3D-сетку крыла при маневрах с перегрузкой от $+6g$ до $-3g$.',
    engineeringImpact: 'Позволяет мгновенно локализовать концентраторы напряжений в корне крыла и вокруг вырезов под элероны.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: '3D Визуальная Лаборатория',
    mathBasis: '\\sigma_{\\text{vM}} = \\sqrt{\\frac{1}{2}\\left[(\\sigma_{xx}-\\sigma_{yy})^2 + (\\sigma_{yy}-\\sigma_{zz})^2 + (\\sigma_{zz}-\\sigma_{xx})^2 + 6(\\tau_{xy}^2+\\tau_{yz}^2+\\tau_{zx}^2)\\right]}',
  },

  // ==========================================
  // РАЗДЕЛ III: ИНЖЕНЕРНАЯ ПОЛЕЗНОСТЬ & САПР ЭКОСИСТЕМА (ENGINEERING UTILITY & CAD)
  // ==========================================
  {
    id: 'feat_util_gost_report_pdf_generator',
    title: '62. Генератор Пояснительных Записок и Отчетов по ГОСТ 2.105-95 / ЕСКД (PDF/Word Экспорт)',
    category: 'Инженерная Полезность & САПР',
    vehicleClass: 'app_platform',
    vehicleClassLabel: 'Инструменты Инженера & САПР',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Автоматическое формирование полного инженерного отчета (пояснительной записки) в один клик: титульный лист с основной надписью по ГОСТ, техническое задание, таблица геометрических параметров, сводные поляры $C_L(C_D)$, графики устойчивости, весовая сводка, эпюры лонжерона и выводы с подписью исполнителя.',
    engineeringImpact: 'Экономит до 80% времени инженера на оформление курсовых, дипломных и производственных научно-технических отчетов (НТО).',
    autoDetected: false,
    defaultStatus: 'in_progress',
    targetMilestone: 'Инженерная Документация & Экспорт',
    mathBasis: '\\text{ReportDoc} = \\text{GenerateGOST}(\\text{AeroData}, \\text{MassProperties}, \\text{PolarCharts}, \\text{Formulas})',
  },
  {
    id: 'feat_util_unit_converter_flight_computer',
    title: '63. Инженерный Калькулятор & Конвертер Авиационных Единиц (Engineering Units & Flight Computer)',
    category: 'Инженерная Полезность & САПР',
    vehicleClass: 'app_platform',
    vehicleClassLabel: 'Инструменты Инженера & САПР',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Встроенный интерактивный конвертер величин с поддержкой СИ, имперской и международной авиационной систем: скорость (узлы, Мах, км/ч, м/с, mph), высота (футы, метры, эшелоны FL), давление (гПа, мм рт. ст., psi, дюймы рт. ст. inHg), тяга/сила (Н, кгс, lbf), удельная плотность и динамическая вязкость стандартной атмосферы СА-73 / ISA.',
    engineeringImpact: 'Исключает фатальные ошибки пересчета единиц измерения (как потеря Mars Climate Orbiter) при работе с зарубежными чертежами и моторами.',
    autoDetected: false,
    defaultStatus: 'in_progress',
    targetMilestone: 'Инженерный Инструментарий',
    mathBasis: '1\\text{ kt} = 1.852\\text{ км/ч} = 0.5144\\text{ м/с}, \\quad 1\\text{ lbf} = 4.44822\\text{ Н}, \\quad 1\\text{ psi} = 6894.76\\text{ Па}',
  },
  {
    id: 'feat_util_materials_structural_database',
    title: '64. Интерактивная База Данных Авиационных Материалов (Aerospace Materials Library)',
    category: 'Инженерная Полезность & САПР',
    vehicleClass: 'app_platform',
    vehicleClassLabel: 'Инструменты Инженера & САПР',
    priority: 'p1_high',
    priorityLabel: 'P1: Высокий приоритет',
    description: 'Библиотека физико-механических свойств конструкционных материалов: Дюралюминий Д16Т/2024-T3, Высокопрочный сплав В95/7075-T6, Титан ВТ6/Ti-6Al-4V, Хромансиль 30ХГСА, Углепластик T700/T800 (продольный/поперечный модуль), Бальза, Авиационная фанера БС-1, Пеноплекс XPS с пределами текучести $\\sigma_{0.2}$, плотностью $\\rho$ и коэффициентами Пуассона $\\nu$.',
    engineeringImpact: 'Позволяет моментально выбирать материал для лонжеронов, обшивки и моторам с автоматическим подтягиванием механических констант в прочностные расчеты.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: 'Инженерный Инструментарий',
    mathBasis: '\\sigma_{\\text{allow}} = \\frac{\\sigma_{0.2}}{f_{\\text{safety}}}, \\quad E_{\\text{eff}} = \\sum V_i E_i, \\quad \\rho_{\\text{eff}} = \\sum V_i \\rho_i',
  },
  {
    id: 'feat_util_industry_cae_mesh_export',
    title: '65. Пакетный Экспорт в Промышленные САПР/CAE Пакеты (OpenFOAM, ANSYS Fluent, AVL & MATLAB)',
    category: 'Инженерная Полезность & САПР',
    vehicleClass: 'app_platform',
    vehicleClassLabel: 'Инструменты Инженера & САПР',
    priority: 'p1_high',
    priorityLabel: 'P1: Высокий приоритет',
    description: 'Сквозной экспорт рассчитанных сеток и геометрии: генератор блоков сетки `blockMeshDict` / `snappyHexMesh` для OpenFOAM, файлы сетки `.msh` для ANSYS Fluent, конфигурационные файлы `.avl` для Drela AVL, базы профилей `.dat` для XFLR5 и S-функции нелинейной динамики для MATLAB/Simulink.',
    engineeringImpact: 'Интегрирует легкую веб-студию в рабочий процесс крупных авиационных КБ и исследовательских институтов.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: 'САПР Экосистема',
    mathBasis: '\\text{CAEBridge} \\to \\{ \\text{OpenFOAM: snappyHexMesh}, \\text{ANSYS: .msh}, \\text{AVL: .avl}, \\text{Simulink: S-Function} \\}',
  },
  {
    id: 'feat_util_splitscreen_comparison_ab_diff',
    title: '66. Режим Сравнительного Анализа «Split-Screen Design Comparison & A/B Diff»',
    category: 'Инженерная Полезность & САПР',
    vehicleClass: 'app_platform',
    vehicleClassLabel: 'Инструменты Инженера & САПР',
    priority: 'p1_high',
    priorityLabel: 'P1: Высокий приоритет',
    description: 'Инструмент сравнения двух версий летательного аппарата или двух профилей в режиме разделенного экрана (Split-Screen): наложение поляр $C_L(\\alpha)$ и $C_L(C_D)$, прямое вычисление разницы аэродинамического качества $\\Delta (L/D)$, весовой разницы $\\Delta m$ и подсвечивание геометрических изменений.',
    engineeringImpact: 'Позволяет наглядно оценить эффект от установки винглетов, изменения стреловидности или перехода на новый профиль.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: 'Инженерный Инструментарий',
    mathBasis: '\\Delta (L/D) = (L/D)_B - (L/D)_A, \\quad \\text{DiffMap}(x,y,z) = \\|\\mathbf{r}_B(u,v) - \\mathbf{r}_A(u,v)\\|',
  },
  {
    id: 'feat_util_cloud_history_project_versioning',
    title: '67. Облачное Сохранение, Версионирование Проектов & Экспорт JSON/ZIP (Project Workspace Sync)',
    category: 'Инженерная Полезность & САПР',
    vehicleClass: 'app_platform',
    vehicleClassLabel: 'Инструменты Инженера & САПР',
    priority: 'p2_medium',
    priorityLabel: 'P2: Средний приоритет',
    description: 'Полный менеджер проектов с историей изменений (версионирование Git-style), возможностью делиться расчетом по уникальной ссылке (Share Link), автоматическим автосохранением в браузере и экспортом/импортом всего проекта в структурированный архив JSON/ZIP.',
    engineeringImpact: 'Обеспечивает сохранность инженерных наработок и удобство совместной работы в распределенных студенческих и конструкторских командах.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: 'Облачная Платформа',
    mathBasis: '\\text{ProjectArchive} = \\{ \\text{Metadata}, \\text{Geometry3D}, \\text{AeroPolars}, \\text{MassBalance}, \\text{VersionHistory} \\}',
  },

  // ==========================================
  // РАЗДЕЛ IV: ОБУЧЕНИЕ, ПОНЯТНОСТЬ & ИНЖЕНЕРНАЯ ЯСНОСТЬ (CLARITY & EDUCATION)
  // ==========================================
  {
    id: 'feat_edu_physics_with_fingers_interactive_atlas',
    title: '68. Интерактивный Атлас «Аэродинамика на Пальцах» с Живыми Ползунками (Live Physics Sliders)',
    category: 'Обучение & Инженерная Ясность',
    vehicleClass: 'app_platform',
    vehicleClassLabel: 'Обучение & Понятность',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Интерактивный визуальный задачник с живыми демонстрациями фундаментальных понятий: почему самолет летит (разница давлений Бернулли + импульс Ньютона), откуда берется скос потока и индуктивное сопротивление, почему стреловидное крыло отодвигает волновой кризис и как крутка предотвращает сваливание на крыло.',
    engineeringImpact: 'Превращает сложную теоретическую аэродинамику в наглядные осязаемые визуальные модели с регулировкой параметров в реальном времени.',
    autoDetected: false,
    defaultStatus: 'in_progress',
    targetMilestone: 'Обучающий Модуль & Понятность',
    mathBasis: 'L = \\oint_C -p \\, \\mathbf{n} \\cdot \\mathbf{k} \\, ds = \\rho_\\infty V_\\infty \\Gamma \\quad (\\text{Теорема Жуковского})',
  },
  {
    id: 'feat_edu_aerodynamic_diagnostic_wizard',
    title: '69. Интеллектуальный Диагностический Ассистент «Aerodynamic Diagnostic Wizard»',
    category: 'Обучение & Инженерная Ясность',
    vehicleClass: 'app_platform',
    vehicleClassLabel: 'Обучение & Понятность',
    priority: 'p0_urgent',
    priorityLabel: 'P0: Срочно & Критично',
    description: 'Экспертная система поиска и исправления проблем: пользователь выбирает симптом («Самолет клюет носом на взлете», «Расход топлива выше расчетного», «Появилась раскачка по крену (Dutch Roll)»), а ассистент анализирует модель и предлагает конкретные инженерные решения с формулами.',
    engineeringImpact: 'Помогает инженеру быстро найти оптимальный способ исправления дефекта управляемости без дорогостоящих натурных переделок.',
    autoDetected: false,
    defaultStatus: 'in_progress',
    targetMilestone: 'Обучающий Модуль & Понятность',
    mathBasis: '\\text{Diagnosis}(\\text{Issue}) \\to \\{ \\text{Cause}: \\frac{dC_m}{d\\alpha} > 0, \\, \\text{Fix}: \\text{Увеличить } S_h \\text{ или сдвинуть крыло назад} \\}',
  },
  {
    id: 'feat_edu_formula_inspector_dimensional_breakdown',
    title: '70. Математический Инспектор Формул & Расшифровщик Размерностей (Formula Inspector)',
    category: 'Обучение & Инженерная Ясность',
    vehicleClass: 'app_platform',
    vehicleClassLabel: 'Обучение & Понятность',
    priority: 'p1_high',
    priorityLabel: 'P1: Высокий приоритет',
    description: 'Интерактивный разбор любой формулы в приложении: при наведении курсора на любой математический символ (например, $\\Gamma, \\rho, AR, \\eta_p, \\mu$) открывается всплывающее окно с физическим смыслом, размерностью в СИ, типовым диапазоном значений и живым текущим численным значением в текущем расчете.',
    engineeringImpact: 'Устраняет эффект «черного ящика»: инженер всегда видит, из каких физических величин складывается итоговое число.',
    autoDetected: false,
    defaultStatus: 'in_progress',
    targetMilestone: 'Обучающий Модуль & Понятность',
    mathBasis: '[\\Gamma] = \\text{м}^2/\\text{с}, \\quad [\\rho] = \\text{кг}/\\text{м}^3, \\quad [C_L] = 1 \\text{ (безразмерный)}',
  },
  {
    id: 'feat_edu_living_benchmark_aircraft_library',
    title: '71. Живой Бенчмарк-Каталог Исторических и Современных ЛА (Living Benchmark Aircraft Library)',
    category: 'Обучение & Инженерная Ясность',
    vehicleClass: 'app_platform',
    vehicleClassLabel: 'Обучение & Понятность',
    priority: 'p1_high',
    priorityLabel: 'P1: Высокий приоритет',
    description: 'Интерактивная коллекция эталонных моделей с полными верифицированными продувками ЦАГИ/NASA: «Флайер 1» Братьев Райт, Ан-2 «Кукурузник», Cessna 172, Су-27, Bayraktar TB2, Boeing 787 Dreamliner, X-15 и Starship. Возможность загрузить любой аппарат как основу для собственного проекта в один клик.',
    engineeringImpact: 'Позволяет инженеру сопоставлять свои расчетные полярные кривые и весовую сводку с проверенными летающими прототипами мирового уровня.',
    autoDetected: true,
    defaultStatus: 'completed',
    targetMilestone: 'Библиотека Пресетов',
    mathBasis: '\\text{BenchmarkValidation} = \\frac{\\|C_{L,\\text{calc}} - C_{L,\\text{tunnel}}\\|}{\\|C_{L,\\text{tunnel}}\\|} \\le 3.5\\%',
  },
  {
    id: 'feat_edu_visual_physics_glossary',
    title: '72. Иллюстрированный Авиационный Глоссарий с Векторными Схемами (Interactive Aero Glossary)',
    category: 'Обучение & Инженерная Ясность',
    vehicleClass: 'app_platform',
    vehicleClassLabel: 'Обучение & Понятность',
    priority: 'p2_medium',
    priorityLabel: 'P2: Средний приоритет',
    description: 'Свыше 200 иллюстрированных авиационных терминов (САХ, фокус, центровка, скос потока, интерференция, демпфирование, флаттер, кавитация, угол стреловидности, угол установки крыла, V-образность) с краткими определениями и векторными поясняющими диаграммами.',
    engineeringImpact: 'Служит настольной энциклопедией авиационного инженера, помогая быстро вспомнить терминологию при подготовке публикаций и патентов.',
    autoDetected: false,
    defaultStatus: 'in_progress',
    targetMilestone: 'Обучающий Модуль & Понятность',
    mathBasis: '\\bar{c} = \\frac{2}{S} \\int_0^{b/2} c(y)^2 \\, dy \\quad (\\text{Средняя Аэродинамическая Хорда САХ})',
  },
  {
    id: 'feat_edu_ai_aerospace_co_pilot',
    title: '73. Встроенный Инженерный ИИ-Копилот & Экспертный Консультант (AI Aero Co-Pilot & Formula Explainer)',
    category: 'Обучение & Инженерная Ясность',
    vehicleClass: 'app_platform',
    vehicleClassLabel: 'Инструменты Инженера & ИИ',
    priority: 'p2_medium',
    priorityLabel: 'P2: Средний приоритет',
    description: 'Интегрированный в интерфейс локальный/облачный ИИ-ассистент, обученный на отечественных и мировых учебниках по аэродинамике (ЦАГИ, Прандтль, Краснов, Андерсон). Отвечает на вопросы по аэродинамике, рекомендует профили под заданный диапазон чисел Рейнольдса и помогает с балансировкой.',
    engineeringImpact: 'Предоставляет каждому инженеру персонального консультанта уровня ведущего конструктора КБ прямо в окне браузера.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: 'Искусственный Интеллект & AI CAE',
    mathBasis: '\\mathbf{y}_{\\text{advice}} = \\text{LLM}(\\text{AeroState}, \\text{Prompt: How to increase L/D at Re=300k})',
  },
  {
    id: 'feat_edu_gamified_aerodynamic_challenges',
    title: '74. Инженерный Тренажер & Обучающие Задачи «Aero Challenges» (Оптимизируй Планер под Миссию)',
    category: 'Обучение & Инженерная Ясность',
    vehicleClass: 'app_platform',
    vehicleClassLabel: 'Обучение & Понятность',
    priority: 'p3_rnd',
    priorityLabel: 'P3: Перспективно & R&D',
    description: 'Интерактивные инженерные квесты: «Построй БПЛА для дальности 100 км при массе до 5 кг», «Устрани флаттер крыла на скорости 250 км/ч с минимальным весом», «Спроектируй самолет STOL с разбегом менее 50 метров». Таблица лидеров и автоматическая оценка инженерной эффективности решения.',
    engineeringImpact: 'Увлекательный игровой формат для подготовки студентов авиационных вузов, кружков авиамоделирования и проверки квалификации конструкторов.',
    autoDetected: false,
    defaultStatus: 'planned',
    targetMilestone: 'Обучающий Модуль & Понятность',
    mathBasis: '\\text{Score} = \\frac{\\text{Payload} \\times \\text{Range}}{\\text{Cost} \\times \\text{EmptyMass}} \\times \\text{StabilityBonus}',
  },
];

interface FutureRoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FutureRoadmapModal: React.FC<FutureRoadmapModalProps> = ({ isOpen, onClose }) => {
  const STORAGE_KEY = 'aero_studio_future_roadmap_state_v1';

  // Load custom check states from localStorage or defaults
  const [featureStatuses, setFeatureStatuses] = useState<Record<string, FeatureStatus>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    const init: Record<string, FeatureStatus> = {};
    INITIAL_ROADMAP_FEATURES.forEach((f) => {
      init[f.id] = f.defaultStatus;
    });
    return init;
  });

  // Custom user added features
  const [customFeatures, setCustomFeatures] = useState<RoadmapFeatureItem[]>(() => {
    try {
      const saved = localStorage.getItem('aero_studio_custom_features_v1');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return [];
  });

  // Filters
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedVehicleClass, setSelectedVehicleClass] = useState<VehicleClass>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'matrix' | 'ux_visual_ecosystem' | 'cad_constructor' | 'features_list' | 'add_feature'>('matrix');

  // New feature form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<FeatureCategory>('Интерфейс & Юзер-Френдли (UX/UI)');
  const [newVehicle, setNewVehicle] = useState<'uav' | 'light_crop' | 'airliner' | 'supersonic' | 'rocket_space' | 'universal' | 'app_platform'>('app_platform');
  const [newPriority, setNewPriority] = useState<PriorityLevel>('p0_urgent');
  const [newDesc, setNewDesc] = useState('');
  const [newImpact, setNewImpact] = useState('');
  const [newMath, setNewMath] = useState('');

  // Interactive Live Showcase states for UX & Engineering Tools Tab
  const [demoAoA, setDemoAoA] = useState<number>(12);
  const [demoStaticMargin, setDemoStaticMargin] = useState<number>(8);
  const [demoWingLoading, setDemoWingLoading] = useState<number>(45);

  const [unitSpeedVal, setUnitSpeedVal] = useState<number>(50); // m/s
  const [unitAltVal, setUnitAltVal] = useState<number>(1000); // meters
  const [unitPressVal, setUnitPressVal] = useState<number>(101325); // Pa

  const [selectedFormulaKey, setSelectedFormulaKey] = useState<'lift' | 'drag' | 'reynolds' | 'efficiency'>('lift');
  const [activeCfdLayers, setActiveCfdLayers] = useState<{
    streamlines: boolean;
    pressureSlices: boolean;
    vortexCores: boolean;
    pbrMaterial: boolean;
  }>({
    streamlines: true,
    pressureSlices: true,
    vortexCores: false,
    pbrMaterial: true,
  });

  // Persist status changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(featureStatuses));
    } catch (e) {
      console.error('Failed to save roadmap status to localStorage', e);
    }
  }, [featureStatuses]);

  // Persist custom features
  useEffect(() => {
    try {
      localStorage.setItem('aero_studio_custom_features_v1', JSON.stringify(customFeatures));
    } catch (e) {
      console.error('Failed to save custom features', e);
    }
  }, [customFeatures]);

  const allFeatures = useMemo(() => {
    return [...INITIAL_ROADMAP_FEATURES, ...customFeatures];
  }, [customFeatures]);

  const handleToggleStatus = (id: string) => {
    setFeatureStatuses((prev) => {
      const current = prev[id] || 'planned';
      let next: FeatureStatus = 'planned';
      if (current === 'planned') next = 'in_progress';
      else if (current === 'in_progress') next = 'completed';
      else if (current === 'completed') next = 'planned';
      return { ...prev, [id]: next };
    });
  };

  const handleSetExactStatus = (id: string, status: FeatureStatus) => {
    setFeatureStatuses((prev) => ({ ...prev, [id]: status }));
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Сбросить все отметки к значениям по умолчанию?')) {
      const init: Record<string, FeatureStatus> = {};
      INITIAL_ROADMAP_FEATURES.forEach((f) => {
        init[f.id] = f.defaultStatus;
      });
      setFeatureStatuses(init);
    }
  };

  const handleAddCustomFeature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: RoadmapFeatureItem = {
      id: `custom_${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      vehicleClass: newVehicle,
      vehicleClassLabel:
        newVehicle === 'uav'
          ? 'БПЛА / Дроны'
          : newVehicle === 'light_crop'
          ? 'Кукурузник / Ан-2'
          : newVehicle === 'airliner'
          ? 'Магистральный Самолет'
          : newVehicle === 'supersonic'
          ? 'Сверхзвук'
          : newVehicle === 'rocket_space'
          ? 'Ракета & Космос'
          : 'Универсально',
      priority: newPriority,
      priorityLabel:
        newPriority === 'p0_urgent'
          ? 'P0: Срочно & Критично'
          : newPriority === 'p1_high'
          ? 'P1: Высокий'
          : newPriority === 'p2_medium'
          ? 'P2: Средний'
          : 'P3: R&D',
      description: newDesc.trim() || 'Пользовательская инженерная фича',
      engineeringImpact: newImpact.trim() || 'Повышение точности и полноты проектирования летательного аппарата.',
      defaultStatus: 'planned',
      targetMilestone: 'Пользовательский План',
      mathBasis: newMath.trim(),
    };

    setCustomFeatures((prev) => [newItem, ...prev]);
    setFeatureStatuses((prev) => ({ ...prev, [newItem.id]: 'planned' }));

    // Reset form
    setNewTitle('');
    setNewDesc('');
    setNewImpact('');
    setNewMath('');
    setActiveTab('features_list');
  };

  const handleDeleteCustomFeature = (id: string) => {
    setCustomFeatures((prev) => prev.filter((f) => f.id !== id));
    setFeatureStatuses((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  // Filtered features
  const filteredFeatures = useMemo(() => {
    return allFeatures.filter((f) => {
      const matchPrio = selectedPriority === 'all' || f.priority === selectedPriority;
      const matchVeh =
        selectedVehicleClass === 'all' ||
        f.vehicleClass === selectedVehicleClass ||
        f.vehicleClass === 'universal';
      const matchCat = selectedCategory === 'all' || f.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        q === '' ||
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.engineeringImpact.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q);

      return matchPrio && matchVeh && matchCat && matchSearch;
    });
  }, [allFeatures, selectedPriority, selectedVehicleClass, selectedCategory, searchQuery]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = allFeatures.length;
    let completed = 0;
    let inProgress = 0;
    let planned = 0;

    allFeatures.forEach((f) => {
      const s = featureStatuses[f.id] || 'planned';
      if (s === 'completed') completed++;
      else if (s === 'in_progress') inProgress++;
      else planned++;
    });

    const p0Total = allFeatures.filter((f) => f.priority === 'p0_urgent').length;
    const p0Completed = allFeatures.filter(
      (f) => f.priority === 'p0_urgent' && featureStatuses[f.id] === 'completed'
    ).length;

    return {
      total,
      completed,
      inProgress,
      planned,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      p0Total,
      p0Completed,
      p0Percent: p0Total > 0 ? Math.round((p0Completed / p0Total) * 100) : 0,
    };
  }, [allFeatures, featureStatuses]);

  // Vehicle Stage Progress Matrix
  const vehicleProgress = useMemo(() => {
    const stages: Array<{
      id: VehicleClass;
      name: string;
      icon: any;
      subtitle: string;
      color: string;
      accent: string;
      desc: string;
    }> = [
      {
        id: 'uav',
        name: 'Класс 1: БПЛА & Дроны',
        icon: Crosshair,
        subtitle: 'Микро-БПЛА, FPV, Летающее Крыло, Re < 500k',
        color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
        accent: 'bg-emerald-500',
        desc: 'Низкие числа Рейнольдса, ламинарный пузырь отрыва, интеграция с автопилотами PX4/ArduPilot, электрические бесколлекторные ВМГ.',
      },
      {
        id: 'light_crop',
        name: 'Класс 2: Сельхозавиация («Кукурузник» Ан-2 & STOL)',
        icon: Plane,
        subtitle: 'Бипланы, предкрылки, грунтовые ВПП, винты ВИШ',
        color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400',
        accent: 'bg-amber-500',
        desc: 'Мощная механизация (щелевые закрылки Фаулера, предкрылки), интерференция бипланной коробки, посадочные дистанции на грунт.',
      },
      {
        id: 'airliner',
        name: 'Класс 3: Магистральные Самолеты (Лайнеры)',
        icon: Plane,
        subtitle: 'Трансзвук, M=0.85, стреловидные крылья, ТРДД',
        color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400',
        accent: 'bg-blue-500',
        desc: 'Сверхкритические профили NASA SC, правило площадей Уиткомба, подавление изгибно-крутильного флаттера, дальность и расход топлива.',
      },
      {
        id: 'supersonic',
        name: 'Класс 4: Сверхзвуковая Авиация (M=1.2...3.5)',
        icon: Zap,
        subtitle: 'Ударные волны, треугольные крылья, косые скачки',
        color: 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400',
        accent: 'bg-purple-500',
        desc: 'Ударная поляра $\\theta$-$\\beta$-$M$, расширение Прандтля-Майера, наплывы LEX для вихревой подъемной силы, аэродинамический нагрев.',
      },
      {
        id: 'rocket_space',
        name: 'Класс 5: Ракеты-Носители & Космос',
        icon: Rocket,
        subtitle: 'Вывод на орбиту, ЖРД/РДТТ, ТЗП спуска, TMR авионика',
        color: 'from-rose-500/20 to-orange-500/10 border-rose-500/30 text-rose-400',
        accent: 'bg-rose-500',
        desc: 'Гравитационный поворот (Gravity Turn), формула Циолковского, тепловой поток Фэя-Ридделла, перелеты Ламберта, радиационная стойкость.',
      },
      {
        id: 'app_platform',
        name: 'Класс 6: Экосистема Платформы, UX/UI & Инструменты',
        icon: Sparkles,
        subtitle: 'Юзер-френдли, 3D CFD, Отчеты ГОСТ, Конвертер, Обучение',
        color: 'from-cyan-500/20 to-indigo-500/10 border-cyan-500/30 text-cyan-400',
        accent: 'bg-cyan-500',
        desc: 'Пошаговый мастер Design Wizard, командная палитра Ctrl+K, линии тока частиц, генератор отчетов по ГОСТ 2.105, конвертер единиц и обучающий атлас.',
      },
    ];

    return stages.map((st) => {
      const stageFeatures = allFeatures.filter(
        (f) => f.vehicleClass === st.id || (st.id !== 'app_platform' && f.vehicleClass === 'universal')
      );
      const completed = stageFeatures.filter(
        (f) => featureStatuses[f.id] === 'completed'
      ).length;
      const total = stageFeatures.length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const p0Total = stageFeatures.filter((f) => f.priority === 'p0_urgent').length;
      const p0Done = stageFeatures.filter(
        (f) => f.priority === 'p0_urgent' && featureStatuses[f.id] === 'completed'
      ).length;
      return {
        ...st,
        total,
        completed,
        percent: pct,
        p0Total,
        p0Done,
        features: stageFeatures,
      };
    });
  }, [allFeatures, featureStatuses]);

  const handleExportMarkdown = () => {
    let md = `# ПЛАН РАЗВИТИЯ ИНЖЕНЕРНОЙ СТУДИИ: ОТ БПЛА ДО КОСМИЧЕСКИХ РАКЕТ\n\n`;
    md += `**Общий прогресс:** ${stats.completed}/${stats.total} фич (${stats.percent}% готовности)\n`;
    md += `**Срочные фичи (P0):** ${stats.p0Completed}/${stats.p0Total} (${stats.p0Percent}%)\n\n`;

    md += `## 🚀 Матрица готовности летательных аппаратов\n`;
    vehicleProgress.forEach((v) => {
      md += `- **${v.name}**: ${v.completed}/${v.total} (${v.percent}%)\n`;
    });

    md += `\n## 📋 Полный перечень аэродинамических и инженерных фич\n\n`;

    const prios: Array<{ id: PriorityLevel; label: string }> = [
      { id: 'p0_urgent', label: '🔥 Срочные & Критически Важные (P0)' },
      { id: 'p1_high', label: '⚡ Высокий Приоритет (P1)' },
      { id: 'p2_medium', label: '🛠️ Средний Приоритет (P2)' },
      { id: 'p3_rnd', label: '🔭 Перспективные & R&D (P3)' },
    ];

    prios.forEach((p) => {
      md += `### ${p.label}\n\n`;
      const list = allFeatures.filter((f) => f.priority === p.id);
      list.forEach((f) => {
        const s = featureStatuses[f.id] || 'planned';
        const check = s === 'completed' ? '[x]' : s === 'in_progress' ? '[-]' : '[ ]';
        const statusText = s === 'completed' ? 'ГОТОВО' : s === 'in_progress' ? 'В РАЗРАБОТКЕ' : 'ПЛАНИРУЕТСЯ';
        md += `- ${check} **${f.title}** \`[${statusText}]\` (${f.vehicleClassLabel})\n`;
        md += `  *Описание:* ${f.description}\n`;
        md += `  *Инженерный вклад:* ${f.engineeringImpact}\n\n`;
      });
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Aero_Studio_Future_Roadmap_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-6xl h-[94vh] bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/95 gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-cyan-500/20 text-amber-400 border border-amber-500/30">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  План Развития Проекта & Инженерный Roadmap
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold uppercase">
                  Этап: БПЛА $\to$ Кукурузник $\to$ Самолет $\to$ Ракета
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Полный перечень приоритетных аэродинамических модулей, необходимых инженеру для проектирования и постройки ЛА любого класса
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handleExportMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition-colors cursor-pointer"
              title="Экспорт плана в Markdown"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Экспорт MD</span>
            </button>

            <button
              type="button"
              onClick={handleResetToDefaults}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="Сбросить чекбоксы к значениям по умолчанию"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 transition-colors cursor-pointer"
              title="Закрыть план разработки"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="bg-slate-950/70 border-b border-slate-800 px-4 sm:px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">Общая готовность:</span>
              <span className="text-sm font-black text-cyan-400 font-mono">
                {stats.completed}/{stats.total} ({stats.percent}%)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">Срочные (P0):</span>
              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
                stats.p0Percent >= 80
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {stats.p0Completed}/{stats.p0Total} ({stats.p0Percent}%)
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Готово: {stats.completed}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> В разработке: {stats.inProgress}
              </span>
              <span className="flex items-center gap-1">
                <Circle className="w-3.5 h-3.5 text-slate-500" /> Запланировано: {stats.planned}
              </span>
            </div>
          </div>

          {/* Quick Tab Switcher */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'matrix'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Матрица Классов ЛА
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ux_visual_ecosystem')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'ux_visual_ecosystem'
                  ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950 font-bold shadow-md'
                  : 'text-cyan-400 hover:text-cyan-200 bg-cyan-500/10 border border-cyan-500/20'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>🎨 UX/UI, 3D Графика & Инструменты</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cad_constructor')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'cad_constructor'
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-bold shadow-md'
                  : 'text-amber-400 hover:text-amber-200 bg-amber-500/10 border border-amber-500/20'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>🛠️ 3D САПР & ИИ (4 Фазы)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('features_list')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'features_list'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Полный Список ({filteredFeatures.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('add_feature')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'add_feature'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-amber-400 hover:text-amber-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить</span>
            </button>
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* TAB 1: VEHICLE EVOLUTION MATRIX */}
          {activeTab === 'matrix' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-2">
                  <Rocket className="w-4 h-4 text-cyan-400" />
                  <span>Инженерная Лестница Развития Проекта: От Пропеллера до Орбиты</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-4xl">
                  Для каждого класса летательного аппарата сформирован строгий набор аэродинамических, прочностных и динамических инструментов. Кликните по любому классу, чтобы отфильтровать список задач конкретно под этот тип аппарата.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicleProgress.map((v) => {
                  const Icon = v.icon;
                  const isSelected = selectedVehicleClass === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => {
                        setSelectedVehicleClass(v.id);
                        setActiveTab('features_list');
                      }}
                      className={`group p-4 sm:p-5 rounded-2xl border bg-gradient-to-br transition-all cursor-pointer hover:scale-[1.01] hover:shadow-xl ${
                        isSelected
                          ? 'border-cyan-400 ring-2 ring-cyan-500/40 bg-slate-900 shadow-cyan-950/40'
                          : `${v.color} hover:border-slate-600 bg-slate-950/60`
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl border ${isSelected ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                              {v.name}
                            </h4>
                            <p className="text-[11px] text-slate-400 font-mono">{v.subtitle}</p>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-cyan-400 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800">
                          {v.completed}/{v.total}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        {v.desc}
                      </p>

                      <div className="space-y-1.5 font-mono text-xs">
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Готовность дисциплины:</span>
                          <span className="font-bold text-slate-200">{v.percent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${v.accent} transition-all duration-500`}
                            style={{ width: `${v.percent}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>P0 задачи: <strong className="text-amber-300">{v.p0Done}/{v.p0Total}</strong></span>
                        <span className="flex items-center gap-1 text-cyan-400 group-hover:translate-x-1 transition-transform">
                          Открыть задачи <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Design-to-Fly principle banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-purple-950/60 border border-indigo-500/30">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0 mt-0.5">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-indigo-300 mb-1">
                      Принцип Полноты Инженерного Цикла (Design-to-Fly)
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Чтобы летательный аппарат поднялся в воздух и успешно выполнил миссию, студия закрывает 5 критических инженерных фаз:{' '}
                      <strong className="text-cyan-300">Геометрия & Профили</strong> <span className="text-indigo-400 font-bold">→</span>{' '}
                      <strong className="text-cyan-300">3D Несущие Силы & Моменты</strong> <span className="text-indigo-400 font-bold">→</span>{' '}
                      <strong className="text-cyan-300">Продольная/Боковая Устойчивость & Центровка</strong> <span className="text-indigo-400 font-bold">→</span>{' '}
                      <strong className="text-cyan-300">Тяговооруженность ВМГ / ЖРД</strong> <span className="text-indigo-400 font-bold">→</span>{' '}
                      <strong className="text-cyan-300">Прочность & Флаттер</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: UX/UI, 3D VISUALS, CAD ECOSYSTEM & ENGINEERING UTILITY */}
          {activeTab === 'ux_visual_ecosystem' && (
            <div className="space-y-6 animate-fadeIn font-mono">
              {/* Header Hero Banner */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-cyan-950/90 via-slate-900 to-indigo-950/80 border border-cyan-500/40 shadow-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
                      <Eye className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                        <span>Экосистема Развития: UX/UI, 3D Графика & Инструменты Инженера</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          24 Новые Фичи (#51–#74)
                        </span>
                      </h3>
                      <p className="text-xs text-slate-300 font-sans mt-0.5">
                        Комплексная модернизация платформы: от интуитивного пошагового мастера и фотореалистичной визуализации вихрей до генерации ГОСТ-отчетов и обучающего интерактивного атласа.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVehicleClass('app_platform');
                        setSelectedCategory('all');
                        setActiveTab('features_list');
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-950/50"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Открыть все 24 задачи в списке</span>
                    </button>
                  </div>
                </div>

                {/* 4 Pillars Summary Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  <div 
                    onClick={() => {
                      setSelectedCategory('Интерфейс & Юзер-Френдли (UX/UI)');
                      setActiveTab('features_list');
                    }}
                    className="p-3 rounded-2xl bg-slate-900/90 border border-cyan-500/20 hover:border-cyan-400 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs mb-1">
                      <Monitor className="w-4 h-4" />
                      <span>1. UX/UI & Эргономика</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans line-clamp-2">
                      Пошаговый мастер Wizard, палитра Ctrl+K, Sanity Check подсказки, чертежный Blueprint режим.
                    </p>
                    <div className="mt-2 text-[10px] text-cyan-400 flex items-center gap-1 font-bold group-hover:translate-x-1 transition-transform">
                      6 фич (#51–#56) <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>

                  <div 
                    onClick={() => {
                      setSelectedCategory('Визуальное Восприятие & 3D Графика');
                      setActiveTab('features_list');
                    }}
                    className="p-3 rounded-2xl bg-slate-900/90 border border-purple-500/20 hover:border-purple-400 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 text-purple-300 font-bold text-xs mb-1">
                      <Palette className="w-4 h-4" />
                      <span>2. 3D CFD Графика</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans line-clamp-2">
                      Линии тока частиц, секущие плоскости X/Y/Z, Q-критерий вихрей, PBR-композит, замедленный срыв потока.
                    </p>
                    <div className="mt-2 text-[10px] text-purple-400 flex items-center gap-1 font-bold group-hover:translate-x-1 transition-transform">
                      6 фич (#57–#62) <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>

                  <div 
                    onClick={() => {
                      setSelectedCategory('Инженерная Полезность & САПР');
                      setActiveTab('features_list');
                    }}
                    className="p-3 rounded-2xl bg-slate-900/90 border border-amber-500/20 hover:border-amber-400 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs mb-1">
                      <Wrench className="w-4 h-4" />
                      <span>3. САПР & Инструменты</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans line-clamp-2">
                      Генератор отчетов ГОСТ 2.105, конвертер единиц, база авиаматериалов (Д16Т/Карбон), экспорт OpenFOAM.
                    </p>
                    <div className="mt-2 text-[10px] text-amber-400 flex items-center gap-1 font-bold group-hover:translate-x-1 transition-transform">
                      6 фич (#63–#68) <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>

                  <div 
                    onClick={() => {
                      setSelectedCategory('Обучение & Инженерная Ясность');
                      setActiveTab('features_list');
                    }}
                    className="p-3 rounded-2xl bg-slate-900/90 border border-emerald-500/20 hover:border-emerald-400 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs mb-1">
                      <GraduationCap className="w-4 h-4" />
                      <span>4. Обучение & Ясность</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans line-clamp-2">
                      Атлас «Аэродинамика на пальцах», диагностика сваливания, инспектор формул в СИ, каталог эталонов (Ан-2/Су-27).
                    </p>
                    <div className="mt-2 text-[10px] text-emerald-400 flex items-center gap-1 font-bold group-hover:translate-x-1 transition-transform">
                      6 фич (#69–#74) <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>

              {/* PILLAR 1: INTERFACE & USER-FRIENDLY (UX/UI) */}
              <div className="space-y-4 bg-slate-950/70 border border-cyan-500/30 rounded-3xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      <Monitor className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Направление 1: Интерфейс & Юзер-Френдли (UX/UI & Эргономика)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          Фичи #51–#56
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400 font-sans">
                        Устранение барьеров входа: интерактивные подсказки, командная палитра и пошаговый мастер проектирования.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('Интерфейс & Юзер-Френдли (UX/UI)');
                      setActiveTab('features_list');
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Задачи направления</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Interactive Live Demo: Physics Sanity Check Inspector */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Интерактивный Демонстратор: Physics Sanity Check & Real-time Diagnostic Engine</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Попробуйте изменить параметры для теста подсказок</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Угол атаки $\alpha$:</span>
                        <span className="font-bold text-cyan-400">{demoAoA}°</span>
                      </div>
                      <input
                        type="range"
                        min="-5"
                        max="25"
                        step="1"
                        value={demoAoA}
                        onChange={(e) => setDemoAoA(Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Запас стат. устойчивости:</span>
                        <span className={`font-bold ${demoStaticMargin < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {demoStaticMargin}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-10"
                        max="25"
                        step="1"
                        value={demoStaticMargin}
                        onChange={(e) => setDemoStaticMargin(Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Удельная нагрузка $W/S$:</span>
                        <span className="font-bold text-amber-400">{demoWingLoading} кг/м²</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="140"
                        step="5"
                        value={demoWingLoading}
                        onChange={(e) => setDemoWingLoading(Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Diagnostic Alert Box */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5 text-xs font-sans">
                    {demoStaticMargin < 0 ? (
                      <div className="flex items-start gap-2 text-rose-300">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <strong>🚨 Критическая ошибка центровки (SM = {demoStaticMargin}%):</strong> Аппарат статически неустойчив по тангажу (Cmα &gt; 0). Центр тяжести X_CG лежит позади фокуса X_F. Требуется сместить аккумулятор вперед или увеличить площадь стабилизатора!
                        </div>
                      </div>
                    ) : demoAoA >= 16 ? (
                      <div className="flex items-start gap-2 text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong>⚠️ Опасность срыва потока (α = {demoAoA}° ≥ α_crit):</strong> Превышен критический угол атаки. Происходит отрыв пограничного слоя, резкое падение CL и рост CD. Рекомендуется включить отклонение щелевых предкрылков.
                        </div>
                      </div>
                    ) : demoWingLoading > 100 ? (
                      <div className="flex items-start gap-2 text-yellow-300">
                        <Clock className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                        <div>
                          <strong>⚡ Высокая нагрузка на крыло (W/S = {demoWingLoading} кг/м²):</strong> Посадочная скорость превысит 130 км/ч. Потребуется удлиненная ВПП или мощная механизация Фаулера.
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong>✅ Параметры в безопасном диапазоне:</strong> Статическая устойчивость положительна (SM = +{demoStaticMargin}%), безотрывное обтекание (α = {demoAoA}°), комфортная посадочная скорость (W/S = {demoWingLoading} кг/м²).
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Feature Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allFeatures.filter((f) => f.category === 'Интерфейс & Юзер-Френдли (UX/UI)').map((f) => {
                    const status = featureStatuses[f.id] || 'planned';
                    return (
                      <div
                        key={f.id}
                        className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-2"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="text-xs font-bold text-white font-sans">{f.title}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(f.id)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                                status === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : status === 'in_progress'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {status === 'completed' ? 'ГОТОВО' : status === 'in_progress' ? 'В РАБОТЕ' : 'ПЛАН'}
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400 font-sans line-clamp-3">{f.description}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-800/80 text-[10px] text-cyan-400 font-sans">
                          <strong>Польза:</strong> {f.engineeringImpact}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PILLAR 2: 3D CFD GRAPHICS & VISUAL PERCEPTION */}
              <div className="space-y-4 bg-slate-950/70 border border-purple-500/30 rounded-3xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      <Palette className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Направление 2: Визуальное Восприятие & 3D CFD Графика</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Фичи #57–#62
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400 font-sans">
                        Наглядное представление сложных физических полей: линии тока, секущие плоскости и динамика пограничного слоя.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('Визуальное Восприятие & 3D Графика');
                      setActiveTab('features_list');
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Задачи направления</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Interactive Live Demo: 3D CFD Layer Controller */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-purple-400" />
                      <span>Интерактивный Демонстратор: Контроллер Слоев CFD 3D Визуализации</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Переключайте слои рендеринга аэродинамического обтекания</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveCfdLayers(prev => ({ ...prev, streamlines: !prev.streamlines }))}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        activeCfdLayers.streamlines
                          ? 'bg-purple-500/20 border-purple-500/60 text-purple-200 shadow-md shadow-purple-950/40'
                          : 'bg-slate-950 border-slate-800 text-slate-500'
                      }`}
                    >
                      <span className="font-sans">Линии тока (Streamlines)</span>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${activeCfdLayers.streamlines ? 'text-purple-400' : 'text-slate-600'}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveCfdLayers(prev => ({ ...prev, pressureSlices: !prev.pressureSlices }))}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        activeCfdLayers.pressureSlices
                          ? 'bg-purple-500/20 border-purple-500/60 text-purple-200 shadow-md shadow-purple-950/40'
                          : 'bg-slate-950 border-slate-800 text-slate-500'
                      }`}
                    >
                      <span className="font-sans">Сечения Давления (Slice)</span>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${activeCfdLayers.pressureSlices ? 'text-purple-400' : 'text-slate-600'}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveCfdLayers(prev => ({ ...prev, vortexCores: !prev.vortexCores }))}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        activeCfdLayers.vortexCores
                          ? 'bg-purple-500/20 border-purple-500/60 text-purple-200 shadow-md shadow-purple-950/40'
                          : 'bg-slate-950 border-slate-800 text-slate-500'
                      }`}
                    >
                      <span className="font-sans">Вихревой Q-критерий</span>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${activeCfdLayers.vortexCores ? 'text-purple-400' : 'text-slate-600'}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveCfdLayers(prev => ({ ...prev, pbrMaterial: !prev.pbrMaterial }))}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        activeCfdLayers.pbrMaterial
                          ? 'bg-purple-500/20 border-purple-500/60 text-purple-200 shadow-md shadow-purple-950/40'
                          : 'bg-slate-950 border-slate-800 text-slate-500'
                      }`}
                    >
                      <span className="font-sans">PBR Композит / Карбон</span>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${activeCfdLayers.pbrMaterial ? 'text-purple-400' : 'text-slate-600'}`} />
                    </button>
                  </div>

                  {/* Interactive Palette Bar Indicator */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex justify-between text-[11px] text-slate-400 font-sans">
                      <span>Шкала градиента $C_p$ (Коэффициент давления):</span>
                      <span className="text-cyan-400 font-mono">-3.5 (Разрежение) $\to$ +1.0 (Торможение)</span>
                    </div>
                    <div className="h-3.5 rounded-lg w-full bg-gradient-to-r from-blue-600 via-cyan-400 via-emerald-400 via-amber-400 to-rose-600 shadow-inner" />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>Верхняя поверхность (Lift)</span>
                      <span>Критическая точка торможения</span>
                    </div>
                  </div>
                </div>

                {/* Feature Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allFeatures.filter((f) => f.category === 'Визуальное Восприятие & 3D Графика').map((f) => {
                    const status = featureStatuses[f.id] || 'planned';
                    return (
                      <div
                        key={f.id}
                        className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-2"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="text-xs font-bold text-white font-sans">{f.title}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(f.id)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                                status === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : status === 'in_progress'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {status === 'completed' ? 'ГОТОВО' : status === 'in_progress' ? 'В РАБОТЕ' : 'ПЛАН'}
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400 font-sans line-clamp-3">{f.description}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-800/80 text-[10px] text-purple-400 font-sans">
                          <strong>Польза:</strong> {f.engineeringImpact}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PILLAR 3: CAD ECOSYSTEM & ENGINEERING UTILITY */}
              <div className="space-y-4 bg-slate-950/70 border border-amber-500/30 rounded-3xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Направление 3: Инженерная Полезность & САПР Экосистема</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Фичи #63–#68
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400 font-sans">
                        Интеграция с профессиональными CAD/CAE системами, конвертация единиц, база материалов и ГОСТ-отчеты.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('Инженерная Полезность & САПР');
                      setActiveTab('features_list');
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Задачи направления</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Interactive Live Demo: Aerospace Unit Converter */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-amber-400" />
                      <span>Интерактивный Демонстратор: Авиационный Калькулятор & Конвертер Единиц</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Мгновенный перевод величин в стандартные системы мер</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {/* Speed conversion */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between text-slate-300">
                        <span className="font-bold text-amber-300">Скорость полета ($V$):</span>
                        <span className="font-mono text-cyan-400">{unitSpeedVal} м/с</span>
                      </div>
                      <input
                        type="number"
                        min="1"
                        max="800"
                        value={unitSpeedVal}
                        onChange={(e) => setUnitSpeedVal(Math.max(1, Number(e.target.value)))}
                        className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs"
                      />
                      <div className="space-y-1 text-[11px] font-mono text-slate-300 pt-1 border-t border-slate-800">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Км/ч:</span>
                          <strong className="text-amber-300">{(unitSpeedVal * 3.6).toFixed(1)} км/ч</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Узлы (Knots):</span>
                          <strong className="text-cyan-300">{(unitSpeedVal * 1.94384).toFixed(1)} kts</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Число Маха ($M$):</span>
                          <strong className="text-purple-300">M = {(unitSpeedVal / 340.29).toFixed(3)}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Altitude conversion */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between text-slate-300">
                        <span className="font-bold text-amber-300">Высота ($H$):</span>
                        <span className="font-mono text-cyan-400">{unitAltVal} м</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="30000"
                        step="100"
                        value={unitAltVal}
                        onChange={(e) => setUnitAltVal(Math.max(0, Number(e.target.value)))}
                        className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs"
                      />
                      <div className="space-y-1 text-[11px] font-mono text-slate-300 pt-1 border-t border-slate-800">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Футы (Feet):</span>
                          <strong className="text-amber-300">{(unitAltVal * 3.28084).toFixed(0)} ft</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Эшелон (Flight Level):</span>
                          <strong className="text-cyan-300">FL{Math.round((unitAltVal * 3.28084) / 100)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Атм. давление $P(H)$:</span>
                          <strong className="text-purple-300">
                            {(101.325 * Math.pow(1 - 0.0000225577 * unitAltVal, 5.25588)).toFixed(1)} кПа
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Pressure conversion */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between text-slate-300">
                        <span className="font-bold text-amber-300">Давление ($P$):</span>
                        <span className="font-mono text-cyan-400">{unitPressVal} Па</span>
                      </div>
                      <input
                        type="number"
                        min="100"
                        max="200000"
                        step="500"
                        value={unitPressVal}
                        onChange={(e) => setUnitPressVal(Math.max(100, Number(e.target.value)))}
                        className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs"
                      />
                      <div className="space-y-1 text-[11px] font-mono text-slate-300 pt-1 border-t border-slate-800">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Мм рт. ст. (Torr):</span>
                          <strong className="text-amber-300">{(unitPressVal * 0.00750062).toFixed(1)} мм</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">PSI (фунт/кв. дюйм):</span>
                          <strong className="text-cyan-300">{(unitPressVal * 0.000145038).toFixed(3)} psi</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Бар (Atm/Bar):</span>
                          <strong className="text-purple-300">{(unitPressVal / 100000).toFixed(4)} bar</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feature Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allFeatures.filter((f) => f.category === 'Инженерная Полезность & САПР').map((f) => {
                    const status = featureStatuses[f.id] || 'planned';
                    return (
                      <div
                        key={f.id}
                        className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-2"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="text-xs font-bold text-white font-sans">{f.title}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(f.id)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                                status === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : status === 'in_progress'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {status === 'completed' ? 'ГОТОВО' : status === 'in_progress' ? 'В РАБОТЕ' : 'ПЛАН'}
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400 font-sans line-clamp-3">{f.description}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-800/80 text-[10px] text-amber-400 font-sans">
                          <strong>Польза:</strong> {f.engineeringImpact}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PILLAR 4: EDUCATION & ENGINEERING CLARITY */}
              <div className="space-y-4 bg-slate-950/70 border border-emerald-500/30 rounded-3xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Направление 4: Обучение, Понятность & Инженерная Ясность</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Фичи #69–#74
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400 font-sans">
                        Пояснение физики «на пальцах», расшифровка формул с единицами СИ, каталог эталонов авиации и тренажер.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('Обучение & Инженерная Ясность');
                      setActiveTab('features_list');
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Задачи направления</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Interactive Live Demo: Formula Inspector */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Интерактивный Демонстратор: Инспектор Физических Формул & Анатомия Величин</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Кликните на формулу для физической расшифровки</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedFormulaKey('lift')}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                        selectedFormulaKey === 'lift'
                          ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      Подъемная сила ($L$)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFormulaKey('drag')}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                        selectedFormulaKey === 'drag'
                          ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      Поляра сопротивления ($C_D$)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFormulaKey('reynolds')}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                        selectedFormulaKey === 'reynolds'
                          ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      Число Рейнольдса ($Re$)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFormulaKey('efficiency')}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                        selectedFormulaKey === 'efficiency'
                          ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      Аэродинамическое качество ($K$)
                    </button>
                  </div>

                  {/* Formula Breakdown Card */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    {selectedFormulaKey === 'lift' && (
                      <div>
                        <div className="text-center py-2 bg-slate-900/80 rounded-xl border border-slate-800 mb-2">
                          <MathView math="L = C_L \cdot \frac{1}{2} \rho V^2 \cdot S" className="text-emerald-300 text-base" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans text-slate-300">
                          <div><strong>L [Ньютоны, Н]:</strong> Результирующая подъемная сила крыла.</div>
                          <div><strong>CL [безразмерный]:</strong> Коэффициент подъемной силы профиля при угле атаки α.</div>
                          <div><strong>ρ [кг/м³]:</strong> Плотность воздуха (на уровне моря ρ₀ = 1.225 кг/м³).</div>
                          <div><strong>V [м/с]:</strong> Истинная воздушная скорость набегающего потока (TAS).</div>
                          <div><strong>S [м²]:</strong> Несущая площадь крыла в плане.</div>
                          <div className="col-span-full text-[11px] text-emerald-400 font-mono pt-1 border-t border-slate-800">
                            💡 <em>Инженерный инсайт:</em> При удвоении скорости V подъемная сила возрастает в 4 раза (квадратичная зависимость).
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedFormulaKey === 'drag' && (
                      <div>
                        <div className="text-center py-2 bg-slate-900/80 rounded-xl border border-slate-800 mb-2">
                          <MathView math="C_D = C_{D0} + \frac{C_L^2}{\pi \cdot AR \cdot e}" className="text-emerald-300 text-base" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans text-slate-300">
                          <div><strong>CD0 [безразмерный]:</strong> Профильное и паразитное сопротивление трения и формы.</div>
                          <div><strong>AR = b²/S [удлинение]:</strong> Удлинение крыла (отношение размаха к хорде).</div>
                          <div><strong>e [фактор Освальда, ≈ 0.8...0.95]:</strong> Коэффициент эффективности формы крыла в плане.</div>
                          <div><strong>Индуктивное слагаемое [CL²/(π·AR·e)]:</strong> Сопротивление скоса потока, вызванное концевыми вихрями.</div>
                          <div className="col-span-full text-[11px] text-emerald-400 font-mono pt-1 border-t border-slate-800">
                            💡 <em>Инженерный инсайт:</em> Чтобы снизить сопротивление на крейсерском режиме, увеличивайте удлинение крыла AR или устанавливайте винглеты.
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedFormulaKey === 'reynolds' && (
                      <div>
                        <div className="text-center py-2 bg-slate-900/80 rounded-xl border border-slate-800 mb-2">
                          <MathView math="Re = \frac{\rho \cdot V \cdot c}{\mu}" className="text-emerald-300 text-base" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans text-slate-300">
                          <div><strong>c [метры]:</strong> Средняя аэродинамическая хорда крыла (САХ).</div>
                          <div><strong>μ [Па·с]:</strong> Динамическая вязкость воздуха (≈ 1.81 × 10⁻⁵ Па·с).</div>
                          <div><strong>Re &lt; 500 000:</strong> Режим БПЛА, склонный к образованию ламинарных пузырей отрыва.</div>
                          <div><strong>Re &gt; 3 000 000:</strong> Развитое турбулентное обтекание магистральных самолетов.</div>
                          <div className="col-span-full text-[11px] text-emerald-400 font-mono pt-1 border-t border-slate-800">
                            💡 <em>Инженерный инсайт:</em> Профиль, отлично работающий на лайнере (Re=10M), будет сваливаться на микродроне (Re=100k) из-за вязкостного отрыва.
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedFormulaKey === 'efficiency' && (
                      <div>
                        <div className="text-center py-2 bg-slate-900/80 rounded-xl border border-slate-800 mb-2">
                          <MathView math="K = \frac{C_L}{C_D} = \frac{L}{D} = \frac{X_{\text{планирования}}}{H_{\text{высота}}}" className="text-emerald-300 text-base" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans text-slate-300">
                          <div><strong>K [качество]:</strong> Аэродинамическое качество аппарата.</div>
                          <div><strong>Ан-2:</strong> K_max ≈ 10 (надежный биплан с мощным сопротивлением).</div>
                          <div><strong>Планер-паритель:</strong> K_max ≈ 40...60 (тончайшее длинное крыло).</div>
                          <div><strong>FPV-дрон / квадрокоптер:</strong> K_max ≈ 2...4.</div>
                          <div className="col-span-full text-[11px] text-emerald-400 font-mono pt-1 border-t border-slate-800">
                            💡 <em>Инженерный инсайт:</em> Качество K=15 означает, что с высоты 1 км при отказе двигателя аппарат сможет спланировать на 15 км вперед.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Feature Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allFeatures.filter((f) => f.category === 'Обучение & Инженерная Ясность').map((f) => {
                    const status = featureStatuses[f.id] || 'planned';
                    return (
                      <div
                        key={f.id}
                        className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-2"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="text-xs font-bold text-white font-sans">{f.title}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(f.id)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                                status === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : status === 'in_progress'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {status === 'completed' ? 'ГОТОВО' : status === 'in_progress' ? 'В РАБОТЕ' : 'ПЛАН'}
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400 font-sans line-clamp-3">{f.description}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-800/80 text-[10px] text-emerald-400 font-sans">
                          <strong>Польза:</strong> {f.engineeringImpact}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Quick Switcher */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white">Управление приоритетами и статусами разработки</h4>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Перейдите к полному списку, чтобы фильтровать, искать и отмечать выполненные задачи.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedVehicleClass('app_platform');
                    setSelectedCategory('all');
                    setActiveTab('features_list');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 font-bold text-xs hover:from-cyan-400 hover:to-indigo-400 cursor-pointer shadow-lg shadow-cyan-950/40"
                >
                  <span>Открыть полный перечень задач (#51–#74)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: 3D CAD & GENERATIVE CONSTRUCTOR 4-PHASE ROADMAP */}
          {activeTab === 'cad_constructor' && (
            <div className="space-y-6 animate-fadeIn font-mono">
              {/* Header Hero Banner */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-950/90 via-slate-900 to-rose-950/80 border border-amber-500/40 shadow-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                        <span>Генеративный 3D CAD & Конструктор Сборочного Узла БПЛА</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Digital Twin & CAE
                        </span>
                      </h3>
                      <p className="text-xs text-slate-300">
                        Поэтапная дорожная карта: от автоматического синтеза по ТЗ до 3D-компоновки, генерации файлов для ЧПУ и полетной симуляции ArduPilot
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 text-xs font-bold">
                      10 Специализированных Фич (#41–#50)
                    </span>
                  </div>
                </div>

                {/* Visual End-to-End Pipeline */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-center leading-5 text-[10px] border border-amber-500/40">1</span>
                    <span>Входное ТЗ</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 hidden sm:block" />
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-center leading-5 text-[10px] border border-cyan-500/40">2</span>
                    <span>MDO-Оптимизатор</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 hidden sm:block" />
                  <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-center leading-5 text-[10px] border border-emerald-500/40">3</span>
                    <span>3D CAD Сборка & CG</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 hidden sm:block" />
                  <div className="flex items-center gap-1.5 text-purple-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-center leading-5 text-[10px] border border-purple-500/40">4</span>
                    <span>ЧПУ / 3D-Печать DXF/STL</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 hidden sm:block" />
                  <div className="flex items-center gap-1.5 text-rose-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-rose-500/20 text-center leading-5 text-[10px] border border-rose-500/40">5</span>
                    <span>ArduPilot SITL / Fly</span>
                  </div>
                </div>
              </div>

              {/* 4 PHASES BREAKDOWN GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* PHASE 1: GENERATIVE AI & MDO */}
                <div className="p-5 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">ФАЗА 1: Генеративный ИИ-Синтез по ТЗ</h4>
                        <span className="text-[10px] text-amber-400 font-bold">MDO & Оптимизация Бреге (P0 Срочно)</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Фичи #41, #44, #45
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Инженер вводит только целевые требования (полезная нагрузка, дальность, время барражирования, лимит MTOW), а генетический алгоритм автоматически синтезирует оптимальный планер и ВМГ:
                  </p>

                  <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                    <li><strong className="text-amber-300">#41 MDO Pareto Optimizer:</strong> Многокритериальный поиск глобального минимума массы и максимума дальности полета.</li>
                    <li><strong className="text-amber-300">#44 Auto-CG & Static Margin:</strong> Автоматический сдвиг батареи и полезной нагрузки для строгого запаса центровки <MathView math="\text{SM} = 10\dots14\%" />.</li>
                    <li><strong className="text-amber-300">#45 Motor-Prop Matcher:</strong> Подбор связки мотор (KV, <MathView math="R_i" />) + пропеллер (<MathView math="D, P" />) из базы под КПД &gt;82%.</li>
                  </ul>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <span className="text-amber-400 font-bold">Математический фундамент:</span>
                    <div className="py-1 text-slate-100 overflow-x-auto">
                      <MathView math="R = \frac{E_{\text{bat}}}{m_{\text{tot}} \cdot g} \cdot \left(\frac{L}{D}\right) \cdot \eta_{\text{sys}}, \quad \text{SM} = \frac{x_{\text{np}} - x_{\text{cg}}}{\bar{c}} \times 100\%" block />
                    </div>
                  </div>
                </div>

                {/* PHASE 2: INTERACTIVE 3D CAD ASSEMBLY */}
                <div className="p-5 rounded-3xl bg-slate-900 border border-cyan-500/30 shadow-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">ФАЗА 2: Интерактивный 3D CAD Сборки</h4>
                        <span className="text-[10px] text-cyan-400 font-bold">Three.js Gizmo & Масс-Инерция (P0-P1)</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      Фичи #42, #43, #46
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Полноценная САПР-среда компоновки узлов внутри прозрачного каркаса фюзеляжа с динамическим контролем физических параметров:
                  </p>

                  <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                    <li><strong className="text-cyan-300">#42 3D Gizmo Drag-and-Drop:</strong> Перемещение АКБ, автопилота, моторов и ОЭС с привязкой по направляющим.</li>
                    <li><strong className="text-cyan-300">#43 Динамический Тензор Инерции:</strong> Мгновенный пересчет <MathView math="I_{xx}, I_{yy}, I_{zz}" /> по теореме Гюйгенса-Штейнера при сдвиге любого узла.</li>
                    <li><strong className="text-cyan-300">#46 Проверка Коллизий & AWG Проводка:</strong> Контроль зазоров винтов (OBB) и падения напряжения в кабелях питания.</li>
                  </ul>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <span className="text-cyan-400 font-bold">Математический фундамент:</span>
                    <div className="py-1 text-slate-100 overflow-x-auto">
                      <MathView math="\mathbf{R}_{\text{cg}} = \frac{\sum m_i \mathbf{r}_i}{\sum m_i}, \quad I_{xx} = \sum [I_{xx,i} + m_i(y_i^2 + z_i^2)]" block />
                    </div>
                  </div>
                </div>

                {/* PHASE 3: DIGITAL MANUFACTURING & CNC EXPORT */}
                <div className="p-5 rounded-3xl bg-slate-900 border border-purple-500/30 shadow-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">ФАЗА 3: Производство & ЧПУ / 3D-Печать</h4>
                        <span className="text-[10px] text-purple-400 font-bold">DXF, STL, Спецификация BOM (P2)</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      Фичи #47, #50
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Сквозной экспорт геометрии для физического изготовления планера на станках с ЧПУ и 3D-принтерах:
                  </p>

                  <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                    <li><strong className="text-purple-300">#47 Экспорт DXF & STL:</strong> Генерация чертежей нервюр и лонжеронов с замками под лазерный раскрой фанеры/карбона и STL моторам.</li>
                    <li><strong className="text-purple-300">#50 Параметрический FEA-Анализ:</strong> Расчет прочности карбонового лонжерона и обшивки при перегрузках <MathView math="n_y = +6g" />.</li>
                    <li><strong className="text-purple-300">Интерактивный BOM (Спецификация):</strong> Список покупных изделий с артикулами, массами и ценами.</li>
                  </ul>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                    <span className="text-purple-400 font-bold">Инженерный результат:</span>
                    <p className="mt-0.5 text-[11px] text-slate-300">
                      Готовые производственные файлы для отправки на лазерный станок и 3D-принтер за 1 клик.
                    </p>
                  </div>
                </div>

                {/* PHASE 4: DIGITAL TWIN & AUTOPILOT HIL */}
                <div className="p-5 rounded-3xl bg-slate-900 border border-rose-500/30 shadow-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">ФАЗА 4: Цифровой Двойник & ArduPilot/PX4</h4>
                        <span className="text-[10px] text-rose-400 font-bold">HIL / SITL & WebHID RC-Пульт (P2-P3)</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      Фичи #48, #49
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Замыкание виртуального планера с реальной авионикой и полетным симулятором:
                  </p>

                  <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                    <li><strong className="text-rose-300">#48 Генератор ArduPilot/PX4 `.param`:</strong> Расчет ПИД-коэффициентов и матрицы микширования моторов под рассчитанный тензор инерции.</li>
                    <li><strong className="text-rose-300">#49 HIL/SITL Симулятор в Трубе:</strong> Виртуальный облет БПЛА с подключением реального пульта управления через USB Gamepad / WebHID.</li>
                  </ul>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                    <span className="text-rose-400 font-bold">Инженерный результат:</span>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-300">
                      Безопасный первый вылет без крашей за счет предварительной калибровки коэффициентов регулятора.
                    </p>
                  </div>
                </div>

              </div>

              {/* Action Button to switch to filtered features list */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white">Готовы приступить к реализации?</h4>
                  <p className="text-[11px] text-slate-400">Перейдите к полному списку, чтобы отслеживать прогресс выполнения каждой из 10 фич САПР.</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedVehicleClass('uav');
                    setActiveTab('features_list');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-bold text-xs hover:from-amber-400 hover:to-rose-400 cursor-pointer shadow-lg shadow-amber-950/40"
                >
                  <span>Открыть задачи САПР (#41–#50)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: FULL FEATURES LIST WITH INTERACTIVE CHECKBOXES */}
          {activeTab === 'features_list' && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* Search & Filter Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск фич, формул..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                {/* Priority filter */}
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="all">Все Приоритеты</option>
                  <option value="p0_urgent">🔥 P0: Срочные & Критичные</option>
                  <option value="p1_high">⚡ P1: Высокий Приоритет</option>
                  <option value="p2_medium">🛠️ P2: Средний Приоритет</option>
                  <option value="p3_rnd">🔭 P3: Перспективный R&D</option>
                </select>

                {/* Vehicle class filter */}
                <select
                  value={selectedVehicleClass}
                  onChange={(e) => setSelectedVehicleClass(e.target.value as VehicleClass)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="all">Все Классы ЛА (6)</option>
                  <option value="uav">Класс 1: БПЛА & Дроны</option>
                  <option value="light_crop">Класс 2: Кукурузник / Ан-2 / STOL</option>
                  <option value="airliner">Класс 3: Магистральные Лайнеры</option>
                  <option value="supersonic">Класс 4: Сверхзвук</option>
                  <option value="rocket_space">Класс 5: Ракеты & Космос</option>
                  <option value="app_platform">Класс 6: Платформа & UX/UI Инструменты</option>
                </select>

                {/* Category filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="all">Все Дисциплины (9)</option>
                  <option value="Аэродинамика">Аэродинамика</option>
                  <option value="Двигатели & Пропульсия">Двигатели & Пропульсия</option>
                  <option value="Динамика & СУ">Динамика & СУ</option>
                  <option value="Прочность & Вес">Прочность & Вес</option>
                  <option value="Космос & Авионика">Космос & Авионика</option>
                  <option value="Интерфейс & Юзер-Френдли (UX/UI)">🎨 Интерфейс & Юзер-Френдли (UX/UI)</option>
                  <option value="Визуальное Восприятие & 3D Графика">👁️ Визуальное Восприятие & 3D Графика</option>
                  <option value="Инженерная Полезность & САПР">🛠️ Инженерная Полезность & САПР</option>
                  <option value="Обучение & Инженерная Ясность">🎓 Обучение & Инженерная Ясность</option>
                </select>
              </div>

              {/* Features List */}
              <div className="space-y-3">
                {filteredFeatures.length === 0 ? (
                  <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-slate-800">
                    <p className="text-sm text-slate-400 font-mono">
                      По заданным критериям фичи не найдены.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPriority('all');
                        setSelectedVehicleClass('all');
                        setSelectedCategory('all');
                        setSearchQuery('');
                      }}
                      className="mt-3 px-3 py-1.5 rounded-xl bg-slate-800 text-xs text-cyan-400 font-mono hover:bg-slate-700"
                    >
                      Сбросить фильтры
                    </button>
                  </div>
                ) : (
                  filteredFeatures.map((f) => {
                    const status = featureStatuses[f.id] || 'planned';
                    const isCompleted = status === 'completed';
                    const isInProgress = status === 'in_progress';

                    return (
                      <div
                        key={f.id}
                        className={`rounded-2xl border p-4 sm:p-5 transition-all bg-slate-950/80 ${
                          isCompleted
                            ? 'border-emerald-500/40 bg-emerald-950/10'
                            : isInProgress
                            ? 'border-amber-500/40 bg-amber-950/10'
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          
                          {/* Left: Interactive Checkbox & Title */}
                          <div className="flex items-start gap-3 flex-1">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(f.id)}
                              className="mt-0.5 cursor-pointer shrink-0 transition-transform active:scale-90"
                              title={`Статус: ${status}. Кликните для переключения`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
                              ) : isInProgress ? (
                                <Clock className="w-5 h-5 text-amber-400" />
                              ) : (
                                <Circle className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                              )}
                            </button>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4
                                  className={`text-sm font-bold tracking-tight ${
                                    isCompleted
                                      ? 'text-emerald-300 line-through opacity-90'
                                      : 'text-white'
                                  }`}
                                >
                                  {f.title}
                                </h4>

                                {f.autoDetected && (
                                  <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 text-[9px] font-mono font-bold">
                                    АВТО-ВНЕДРЕНО В СТУДИЮ
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-300 leading-relaxed">
                                {f.description}
                              </p>

                              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 text-[11px] text-slate-300 mt-2 space-y-1">
                                <div className="text-cyan-300 font-bold">
                                  🎯 Зачем это инженеру:
                                </div>
                                <div className="text-slate-300">
                                  {f.engineeringImpact}
                                </div>
                                {f.mathBasis && (
                                  <div className="text-[10px] font-mono text-indigo-300 pt-1 border-t border-slate-800">
                                    <span className="font-bold text-indigo-400">📐 Мат. базис: </span>
                                    <MathText text={f.mathBasis} />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Badges & Status Switcher */}
                          <div className="flex flex-col sm:items-end gap-2 shrink-0">
                            <div className="flex items-center gap-1.5 flex-wrap sm:justify-end">
                              {/* Priority Badge */}
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                  f.priority === 'p0_urgent'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : f.priority === 'p1_high'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : f.priority === 'p2_medium'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                }`}
                              >
                                {f.priorityLabel}
                              </span>

                              {/* Vehicle Class Badge */}
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                                {f.vehicleClassLabel}
                              </span>

                              {/* Category Badge */}
                              <span className="px-2 py-0.5 rounded-full bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 text-[10px] font-mono">
                                {f.category}
                              </span>
                            </div>

                            {/* Status Segmented Buttons */}
                            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[11px] font-mono">
                              <button
                                type="button"
                                onClick={() => handleSetExactStatus(f.id, 'planned')}
                                className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                                  status === 'planned'
                                    ? 'bg-slate-700 text-white font-bold'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                План
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetExactStatus(f.id, 'in_progress')}
                                className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                                  status === 'in_progress'
                                    ? 'bg-amber-500 text-slate-950 font-bold'
                                    : 'text-amber-400 hover:text-amber-200'
                                }`}
                              >
                                В работе
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetExactStatus(f.id, 'completed')}
                                className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                                  status === 'completed'
                                    ? 'bg-emerald-500 text-slate-950 font-bold'
                                    : 'text-emerald-400 hover:text-emerald-200'
                                }`}
                              >
                                Готово
                              </button>

                              {f.id.startsWith('custom_') && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomFeature(f.id)}
                                  className="p-1 text-rose-400 hover:text-rose-200 ml-1 rounded hover:bg-rose-500/20"
                                  title="Удалить пользовательскую фичу"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ADD CUSTOM FEATURE FORM */}
          {activeTab === 'add_feature' && (
            <div className="max-w-2xl mx-auto bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Plus className="w-4 h-4" />
                <span>Добавить Инженерную Задачу / Фичу в План</span>
              </div>
              <p className="text-xs text-slate-400">
                Создайте собственную расчетную фичу или требование к летательному аппарату. Она будет сохранена в локальной базе и снабжена интерактивным чекбоксом.
              </p>

              <form onSubmit={handleAddCustomFeature} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Название инженерной фичи *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Например: Расчет интерференции гондолы двигателя и крыла"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Дисциплина
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    >
                      <option value="Интерфейс & Юзер-Френдли (UX/UI)">🎨 Интерфейс & Юзер-Френдли (UX/UI)</option>
                      <option value="Визуальное Восприятие & 3D Графика">👁️ Визуальное Восприятие & 3D Графика</option>
                      <option value="Инженерная Полезность & САПР">🛠️ Инженерная Полезность & САПР</option>
                      <option value="Обучение & Инженерная Ясность">🎓 Обучение & Инженерная Ясность</option>
                      <option value="Аэродинамика">Аэродинамика</option>
                      <option value="Двигатели & Пропульсия">Двигатели & Пропульсия</option>
                      <option value="Динамика & СУ">Динамика & СУ</option>
                      <option value="Прочность & Вес">Прочность & Вес</option>
                      <option value="Космос & Авионика">Космос & Авионика</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Класс аппарата
                    </label>
                    <select
                      value={newVehicle}
                      onChange={(e) => setNewVehicle(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    >
                      <option value="app_platform">Платформа & Инструменты</option>
                      <option value="universal">Универсально для ЛА</option>
                      <option value="uav">БПЛА / Дроны</option>
                      <option value="light_crop">Кукурузник / Ан-2</option>
                      <option value="airliner">Магистральный Лайнер</option>
                      <option value="supersonic">Сверхзвук</option>
                      <option value="rocket_space">Ракета & Космос</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Приоритет
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    >
                      <option value="p0_urgent">🔥 P0: Срочно & Критично</option>
                      <option value="p1_high">⚡ P1: Высокий</option>
                      <option value="p2_medium">🛠️ P2: Средний</option>
                      <option value="p3_rnd">🔭 P3: R&D</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Подробное описание задачи
                  </label>
                  <textarea
                    rows={2}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Какая физическая или вычислительная задача должна быть решена..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Инженерный результат (Зачем это нужно для постройки аппарата)
                  </label>
                  <input
                    type="text"
                    value={newImpact}
                    onChange={(e) => setNewImpact(e.target.value)}
                    placeholder="Например: Позволяет избежать срыва потока в стыке крыла с фюзеляжем"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Математическая база / Формула (опционально)
                  </label>
                  <input
                    type="text"
                    value={newMath}
                    onChange={(e) => setNewMath(e.target.value)}
                    placeholder="LaTeX формула, например: L = C_L * 0.5 * rho * V^2 * S"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('features_list')}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs font-mono hover:from-amber-400 hover:to-orange-400 cursor-pointer shadow-lg shadow-amber-950/50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Сохранить в План</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal Bottom Status Footer */}
        <div className="px-4 sm:px-6 py-2.5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-xs text-slate-400 font-mono shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Инженерный Roadmap v2.0 • Все изменения сохраняются автоматически в LocalStorage</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs cursor-pointer"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};
