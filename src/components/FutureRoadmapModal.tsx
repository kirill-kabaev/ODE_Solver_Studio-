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
} from 'lucide-react';

export type PriorityLevel = 'p0_urgent' | 'p1_high' | 'p2_medium' | 'p3_rnd';
export type VehicleClass = 'all' | 'uav' | 'light_crop' | 'airliner' | 'supersonic' | 'rocket_space';
export type FeatureStatus = 'completed' | 'in_progress' | 'planned';

export interface RoadmapFeatureItem {
  id: string;
  title: string;
  category: 'Аэродинамика' | 'Двигатели & Пропульсия' | 'Динамика & СУ' | 'Прочность & Вес' | 'Космос & Авионика';
  vehicleClass: 'uav' | 'light_crop' | 'airliner' | 'supersonic' | 'rocket_space' | 'universal';
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
  const [activeTab, setActiveTab] = useState<'matrix' | 'features_list' | 'add_feature'>('matrix');

  // New feature form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'Аэродинамика' | 'Двигатели & Пропульсия' | 'Динамика & СУ' | 'Прочность & Вес' | 'Космос & Авионика'>('Аэродинамика');
  const [newVehicle, setNewVehicle] = useState<'uav' | 'light_crop' | 'airliner' | 'supersonic' | 'rocket_space' | 'universal'>('universal');
  const [newPriority, setNewPriority] = useState<PriorityLevel>('p0_urgent');
  const [newDesc, setNewDesc] = useState('');
  const [newImpact, setNewImpact] = useState('');
  const [newMath, setNewMath] = useState('');

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
    ];

    return stages.map((st) => {
      const stageFeatures = allFeatures.filter(
        (f) => f.vehicleClass === st.id || f.vehicleClass === 'universal'
      );
      const completed = stageFeatures.filter(
        (f) => featureStatuses[f.id] === 'completed'
      ).length;
      const total = stageFeatures.length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        ...st,
        total,
        completed,
        percent: pct,
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
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'matrix'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Матрица 5 Классов ЛА
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
              Полный Список Фич ({filteredFeatures.length})
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
              <span>Добавить Фичу</span>
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
                        setSelectedVehicleClass(isSelected ? 'all' : v.id);
                        setActiveTab('features_list');
                      }}
                      className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer group hover:scale-[1.01] bg-slate-950/80 ${
                        isSelected
                          ? 'border-cyan-400 ring-2 ring-cyan-500/20 shadow-xl'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2.5 rounded-xl border ${v.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                              {v.name}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {v.subtitle}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded-full">
                          {v.percent}%
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mb-4 line-clamp-3 leading-relaxed">
                        {v.desc}
                      </p>

                      {/* Progress bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span>Готовность модулей</span>
                          <span>{v.completed} из {v.total}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${v.accent} transition-all duration-500`}
                            style={{ width: `${v.percent}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 group-hover:text-cyan-300">
                        <span className="font-mono text-[11px]">Посмотреть {v.total} фич</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Engineering Synthesis Box */}
              <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-950 to-slate-900 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-indigo-300 mb-1">
                      Принцип Полноты Инженерного Цикла (Design-to-Fly)
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Чтобы летательный аппарат поднялся в воздух и успешно выполнил миссию, студия закрывает 5 критических инженерных фаз:
                      <strong className="text-cyan-300"> Геометрия & Профили</strong> $\to$
                      <strong className="text-cyan-300"> 3D Несущие Силы & Моменты</strong> $\to$
                      <strong className="text-cyan-300"> Продольная/Боковая Устойчивость & Центровка</strong> $\to$
                      <strong className="text-cyan-300"> Тяговооруженность ВМГ / ЖРД</strong> $\to$
                      <strong className="text-cyan-300"> Прочность & Флаттер</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FULL FEATURES LIST WITH INTERACTIVE CHECKBOXES */}
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
                  <option value="all">Все Классы ЛА</option>
                  <option value="uav">Класс 1: БПЛА & Дроны</option>
                  <option value="light_crop">Класс 2: Кукурузник / Ан-2 / STOL</option>
                  <option value="airliner">Класс 3: Магистральные Лайнеры</option>
                  <option value="supersonic">Класс 4: Сверхзвук</option>
                  <option value="rocket_space">Класс 5: Ракеты & Космос</option>
                </select>

                {/* Category filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="all">Все Дисциплины</option>
                  <option value="Аэродинамика">Аэродинамика</option>
                  <option value="Двигатели & Пропульсия">Двигатели & Пропульсия</option>
                  <option value="Динамика & СУ">Динамика & СУ</option>
                  <option value="Прочность & Вес">Прочность & Вес</option>
                  <option value="Космос & Авионика">Космос & Авионика</option>
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
                                    📐 Мат. базис: {f.mathBasis}
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
                      <option value="universal">Универсально</option>
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
