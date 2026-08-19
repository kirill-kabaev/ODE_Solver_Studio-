import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  X,
  Search,
  Wind,
  Rocket,
  Cpu,
  Activity,
  Compass,
  Zap,
  Layers,
  ShieldCheck,
  Flame,
  AlertTriangle,
  Sliders,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Sparkles,
  Info,
  ChevronRight,
  BarChart2,
  Share2,
} from 'lucide-react';
import { MathText, MathView } from './MathView';

export type HandbookTopicId =
  | 'overview'
  | 'presets'
  | 'status_monitor'
  | 'wind_tunnel'
  | 'flutter'
  | '6dof'
  | 'architecture'
  | 'space_gnc'
  | 'eda_avionics';

interface HandbookTopic {
  id: HandbookTopicId;
  title: string;
  category: 'aero' | 'space' | 'eda' | 'general';
  categoryLabel: string;
  icon: React.ElementType;
  badge: string;
  summary: string;
  purpose: string;
  uiWalkthrough: {
    title: string;
    description: string;
    controls: Array<{ name: string; type: string; role: string; recommended?: string }>;
    readouts: Array<{ name: string; unit: string; interpretation: string }>;
  };
  mathematics: {
    governingEquationLatex: string;
    description: string;
    derivationSteps: string[];
    boundaryConditions?: string[];
  };
  physicalSignificance: string[];
  references: Array<{ authors: string; year: string; title: string; publisher: string }>;
}

export const HANDBOOK_TOPICS: HandbookTopic[] = [
  {
    id: 'overview',
    title: 'Обзор Комплекса Инжиниринга',
    category: 'general',
    categoryLabel: 'Архитектура',
    icon: Sparkles,
    badge: 'v3.0 PRO',
    summary: 'Единая экосистема вычислительной аэрогидродинамики (CFD), космической баллистики (GNC) и радиационно-стойкой микроэлектроники (EDA).',
    purpose: 'Предоставить инженерам и исследователям прямой доступ к параллельному 3-х стадийному разреженному солверу на базе FVM, предобуславливателю AMG V-cycle и интеграторам Рунге-Кутты для сквозного численного проектирования летательных аппаратов и космических систем.',
    uiWalkthrough: {
      title: 'Навигация по Инженерной Студии',
      description: 'Главное окно разделено на три фундаментальных домена (Аэродинамика, Космонавтика, EDA) с глубокими подсистемами в каждом.',
      controls: [
        { name: 'Переключатель доменов', type: 'Tabs', role: 'Выбор прикладной инженерной дисциплины: Аэродинамика / Космонавтика / EDA.' },
        { name: 'Кнопка Справочника (Инфо)', type: 'Button', role: 'Открывает настоящее научно-техническое руководство с формулами и описанием интерфейса.' },
      ],
      readouts: [
        { name: 'Вычислительное Ядро', unit: 'CSR + AMG + RK4', interpretation: 'Статус параллельного матричного решателя на CPU/GPU.' },
      ],
    },
    mathematics: {
      governingEquationLatex: '\\mathbf{A}\\mathbf{x} = \\mathbf{b}, \\quad \\mathbf{M}\\ddot{\\mathbf{q}} + \\mathbf{C}\\dot{\\mathbf{q}} + \\mathbf{K}\\mathbf{q} = \\mathbf{F}_{\\text{ext}}(t)',
      description: 'Обобщенная формулировка фундаментальных законов сохранения механики сплошных сред и систем твердых тел.',
      derivationSteps: [
        'Дискретизация пространственных операторов методом конечных объемов (FVM).',
        'Аппроксимация нестационарных членов явными и неявными схемами Рунге-Кутты 4-го порядка.',
        'Редукция разреженных линейных систем с помощью параллельных Крыловских методов GMRES/BiCGStab.',
      ],
    },
    physicalSignificance: [
      'Единое расчетное ядро исключает ошибки несогласованности форматов между аэродинамикой, механикой и авионикой.',
      'Возможность сквозного междисциплинарного анализа (Multiphysics) от профиля крыла до устойчивости бортовой микросхемы.',
    ],
    references: [
      { authors: 'Anderson, J. D.', year: '2016', title: 'Fundamentals of Aerodynamics (6th ed.)', publisher: 'McGraw-Hill' },
      { authors: 'Saad, Y.', year: '2003', title: 'Iterative Methods for Sparse Linear Systems', publisher: 'SIAM' },
    ],
  },
  {
    id: 'presets',
    title: 'Каталог Инженерных Пресетов NASA / AGARD',
    category: 'aero',
    categoryLabel: 'Аэродинамика',
    icon: Layers,
    badge: '8 Профилей',
    summary: 'Библиотека эталонных аэродинамических профилей с валидированными экспериментальными данными из трубок NASA и AGARD.',
    purpose: 'Мгновенная загрузка проверенных профилей (NACA 0012, NACA 4412, NASA SC(2)-0714, ромб Diamond, оживал Ogive) с автоматической генерацией адаптированной сетки и калибровкой солвера.',
    uiWalkthrough: {
      title: 'Работа с каталогом пресетов',
      description: 'Карточки профилей классифицированы по скоростным режимам (дозвуковые, трансзвуковые, сверхзвуковые).',
      controls: [
        { name: 'Карточки пресетов', type: 'Interactive Card', role: 'Клик выбирает конфигурацию и показывает детальную спецификацию геометрии.' },
        { name: 'Кнопка «Применить Пресет»', type: 'Button', role: 'Переносит параметры ($M, \\alpha, N_{\\text{cells}}$) в монитор сил и сразу открывает окно расчета.' },
      ],
      readouts: [
        { name: '$C_L$ эталонный', unit: 'б/р', interpretation: 'Экспериментальный коэффициент подъемной силы при контрольном угле атаки.' },
        { name: '$C_D$ эталонный', unit: 'б/р', interpretation: 'Коэффициент полного лобового сопротивления.' },
        { name: 'Качество $L/D$', unit: 'б/р', interpretation: 'Аэродинамическое качество эталонной конфигурации.' },
      ],
    },
    mathematics: {
      governingEquationLatex: 'y_t = 5t \\left(0.2969\\sqrt{\\bar{x}} - 0.1260\\bar{x} - 0.3516\\bar{x}^2 + 0.2843\\bar{x}^3 - 0.1015\\bar{x}^4\\right)',
      description: 'Уравнение аналитической образующей поверхности классических 4-значных профилей NACA.',
      derivationSteps: [
        'Параметр $\\bar{x} = x/c \\in [0, 1]$ представляет относительную хорду.',
        'Коэффициент $t = 0.12$ задает максимальную толщину в 12% от хорды.',
        'Для несимметричного NACA 4412 добавляется средняя линия кривизны $y_c(\\bar{x})$ с максимальным прогибом 4% на 40% хорды.',
      ],
      boundaryConditions: [
        'Передняя кромка: радиус скругления $r_{\\text{le}} = 1.1019 t^2$.',
        'Задняя кромка: нулевая или конечная толщина замыкания.',
      ],
    },
    physicalSignificance: [
      'Симметричные профили (NACA 0012) обладают нулевым $C_{L0} = 0$ при $\\alpha = 0^\\circ$ и идеальны для рулей и оперения.',
      'Несущие профили (NACA 4412) создают положительную подъемную силу даже при отрицательных углах атаки до угла нулевой подъемной силы $\\alpha_0 = -4^\\circ$.',
      'Сверхкритические профили NASA SC(2) смещают волновой кризис за счет уплощенной спинки.',
    ],
    references: [
      { authors: 'Abbott, I. H., & Von Doenhoff, A. E.', year: '1959', title: 'Theory of Wing Sections', publisher: 'Dover Publications' },
      { authors: 'Harris, C. D.', year: '1981', title: 'NASA Supercritical Airfoils', publisher: 'NASA TP-1901' },
    ],
  },
  {
    id: 'status_monitor',
    title: 'Монитор Сил, Сходимости и Спарклайнов',
    category: 'aero',
    categoryLabel: 'Аэродинамика',
    icon: Activity,
    badge: 'GMRES(30) + Telemetry',
    summary: 'Потоковый вывод гидродинамических сил ($L, D, M_y$), спарклайнов, невязки крыловского решателя и векторной розы сил.',
    purpose: 'Дает инженеру немедленную обратную связь о текущем процессе интегрирования сил $p(x) \\vec{n}$ и устойчивости расчета еще до построения тяжелого 3D графика поля давлений.',
    uiWalkthrough: {
      title: 'Интерфейс Монитора Сил',
      description: 'Состоит из панели управления, 4-х карточек аэродинамических сил со спарклайнами, потокового осциллографа и векторной розы сил.',
      controls: [
        { name: 'Кнопка «Запустить CFD Солвер»', type: 'Primary Button', role: 'Запускает 5-стадийный расчет (AMD $\\to$ AMG $\\to$ GMRES $\\to$ Силы $\\to$ 3D График).' },
        { name: 'Ползунок Число Маха (M)', type: 'Slider (0.1 - 2.5)', role: 'Задает скорость набегающего потока $V_\\infty = M \\cdot a$.', recommended: '0.78 для крейсерского режима' },
        { name: 'Ползунок Угол Атаки ($\\alpha$)', type: 'Slider (-10° ... +25°)', role: 'Задает угол между хордой профиля и вектором набегающей скорости.', recommended: '3.0° ... 5.0°' },
        { name: 'Выбор Предобуславливателя', type: 'Dropdown', role: 'AMG V-cycle (быстрый) / ILU(0) / Якоби.' },
      ],
      readouts: [
        { name: 'Подъемная сила $L$', unit: 'кН и $C_L$', interpretation: 'Вертикальная аэродинамическая несущая сила.' },
        { name: 'Сопротивление $D$', unit: 'кН и $C_D$', interpretation: 'Полная сила гидродинамического трения и волнового давления.' },
        { name: 'Момент тангажа $M_y$', unit: 'кН·м и $C_m$', interpretation: 'Отрицательное значение ($C_m < 0$) подтверждает статическую устойчивость.' },
        { name: 'Невязка $||r_k||$', unit: 'б/р', interpretation: 'Норма остаточного несовпадения матрицы. Сходимость достигается при $\\le 10^{-7}$.' },
        { name: 'Спарклайн (Микрографик)', unit: 'Тренд', interpretation: 'Показывает динамику затухания колебаний величины за последние 20 шагов.' },
      ],
    },
    mathematics: {
      governingEquationLatex: 'L = C_L \\cdot \\frac{\\rho_\\infty V_\\infty^2}{2} S, \\quad D = C_D \\cdot \\frac{\\rho_\\infty V_\\infty^2}{2} S, \\quad ||\\mathbf{r}_k||_2 = ||\\mathbf{b} - \\mathbf{A}\\mathbf{x}_k||_2 \\le 10^{-7}',
      description: 'Интегральное определение гидроаэродинамических сил через поверхностные интегралы тензора напряжений.',
      derivationSteps: [
        'Поверхностное интегрирование: $\\vec{F} = \\oint (-p\\vec{n} + \\boldsymbol{\\tau}_w\\vec{t}) dA$.',
        'Проекция на оси потока: $L = -F_z \\cos\\alpha + F_x \\sin\\alpha$, $D = F_x \\cos\\alpha + F_z \\sin\\alpha$.',
        'Продольный момент относительно четверти хорды: $M_y = \\oint (\\vec{r} - \\vec{r}_{c/4}) \\times d\\vec{F}$.',
      ],
      boundaryConditions: [
        'Условие прилипания на стенке (No-slip): $\\vec{u}_{\\text{wall}} = 0$.',
        'Дальняя граница (Far-field): свободный невозмущенный поток $(\\rho_\\infty, \\vec{u}_\\infty, p_\\infty)$.',
      ],
    },
    physicalSignificance: [
      'Градиент подъемной силы $dC_L/d\\alpha \\approx 2\\pi / \\sqrt{1-M^2}$ определяет чувствительность крыла к маневрам.',
      'Векторная роза сил наглядно иллюстрирует угол отклонения полной силы $|R| = \\sqrt{L^2 + D^2}$ от хорды.',
    ],
    references: [
      { authors: 'Anderson, J. D.', year: '2016', title: 'Fundamentals of Aerodynamics', publisher: 'McGraw-Hill' },
      { authors: 'Hirsch, C.', year: '2007', title: 'Numerical Computation of Internal and External Flows', publisher: 'Elsevier' },
    ],
  },
  {
    id: 'wind_tunnel',
    title: 'Виртуальная Аэродинамическая Труба и Поле $C_p$',
    category: 'aero',
    categoryLabel: 'Аэродинамика',
    icon: Wind,
    badge: '2D CFD + Скачки Маха',
    summary: 'Интерактивная аэродинамическая труба с отображением линий тока, разрежения на спинке, ударных волн и графика $C_p(x/c)$.',
    purpose: 'Визуализация фундаментальных газодинамических эффектов: ускорение потока над спинкой по закону Бернулли, срыв потока при больших $\\alpha$ и формирование скачков уплотнения при сверхзвуке.',
    uiWalkthrough: {
      title: 'Интерфейс Аэродинамической Трубы',
      description: 'Центральный холст отображает обтекаемый профиль, а нижний блок выводит эпюру коэффициента давления $C_p$.',
      controls: [
        { name: 'Выбор Профиля', type: 'Dropdown', role: 'NACA 0012, NACA 4412, Сверхкритический, Diamond, Ogive.' },
        { name: 'Высота полета $H$', type: 'Slider (0 - 20 000 м)', role: 'Пересчитывает стандартную атмосферу (ISA): давление $p(H)$, плотность $\\rho(H)$, температуру $T(H)$.' },
        { name: 'Переключатели слоев', type: 'Checkboxes', role: 'Линии тока / Сетка ячеек / Изобары давления / Пограничный слой / Скачки волн.' },
      ],
      readouts: [
        { name: 'Коэффициент давления $C_p$', unit: 'б/р', interpretation: 'Отрицательные значения на графике (направлены вверх) соответствуют разрежению на верхней поверхности.' },
        { name: 'Скоростной напор $q$', unit: 'кПа', interpretation: 'Динамическое давление набегающего потока $q = \\frac{1}{2}\\rho V^2$.' },
        { name: 'Угол конуса Маха $\\mu$', unit: 'градусы', interpretation: 'Угол наклона ударных волн при $M > 1$: $\\mu = \\arcsin(1/M)$.' },
      ],
    },
    mathematics: {
      governingEquationLatex: 'C_p(\\bar{x}) = \\frac{p(\\bar{x}) - p_\\infty}{\\frac{1}{2}\\rho_\\infty V_\\infty^2}, \\quad C_L = \\int_{0}^{1} \\left(C_{p,\\text{lower}} - C_{p,\\text{upper}}\\right) d\\bar{x}',
      description: 'Уравнение связи распределения поверхностного давления с результирующей подъемной силой крыла.',
      derivationSteps: [
        'По закону Бернулли для несжимаемого потока: $p + \\frac{1}{2}\\rho V^2 = p_0 = \\text{const}$.',
        'Ускорение потока над спинкой ($V > V_\\infty$) приводит к падению статического давления ($p < p_\\infty \\implies C_p < 0$).',
        'Площадь петли между кривой спинки ($C_{p,\\text{upper}}$) и корыта ($C_{p,\\text{lower}}$) на графике строго равна коэффициенту $C_L$.',
      ],
    },
    physicalSignificance: [
      'Положение пика разрежения у передней кромки определяет склонность профиля к переднекромочному срыву потока.',
      'При трансзвуковом обтекании ($M \\approx 0.85$) на верхней дужке возникает резкий скачок давления (Shock Wave Recovery), визуализируемый разрывом кривой $C_p$.',
    ],
    references: [
      { authors: 'Shapiro, A. H.', year: '1953', title: 'The Dynamics and Thermodynamics of Compressible Fluid Flow', publisher: 'Ronald Press' },
      { authors: 'Prandtl, L.', year: '1928', title: 'General Considerations on the Flow of Compressible Fluids', publisher: 'NACA TM-498' },
    ],
  },
  {
    id: 'flutter',
    title: 'Аэроупругость и Флаттер Крыла',
    category: 'aero',
    categoryLabel: 'Аэродинамика',
    icon: AlertTriangle,
    badge: '2-DoF Теодорсен',
    summary: 'Численный симулятор изгибно-крутильного флаттера крыла летательного аппарата с матрицей устойчивости.',
    purpose: 'Определение критической скорости флаттера $V_{\\text{flutter}}$, при превышении которой аэродинамические силы начинают накачивать энергию в упругие деформации крыла, приводя к мгновенному разрушению за доли секунды.',
    uiWalkthrough: {
      title: 'Интерфейс Симулятора Флаттера',
      description: 'Интерактивный холст показывает колебания сечения крыла, траекторию фазового портрета и матрицу жесткости.',
      controls: [
        { name: 'Скорость потока $V$', type: 'Slider (50 - 400 м/с)', role: 'Скорость полета. Приближение к $V_{\\text{flutter}}$ переводит систему в автоколебания.' },
        { name: 'Смещение центра масс ($x_{\\text{cg}}$)', type: 'Slider', role: 'Расстояние между осью жесткости (Elastic Axis) и центром тяжести сечения.' },
        { name: 'Крутильная жесткость ($K_\\theta$)', type: 'Slider', role: 'Жесткость кессона крыла на кручение. Главный фактор повышения скорости флаттера.' },
        { name: 'Конструкционное демпфирование ($\\zeta$)', type: 'Slider', role: 'Коэффициент рассеяния энергии материалом конструкции.' },
      ],
      readouts: [
        { name: 'Индикатор Режима', unit: 'Статус', interpretation: 'Безопасная зона (зеленый) / Предел устойчивости (желтый) / Катастрофический флаттер (красный).' },
        { name: 'Критическая скорость $V_{\\text{flutter}}$', unit: 'м/с', interpretation: 'Теоретический порог аэроупругой неустойчивости.' },
        { name: 'Коэффициент $V / V_{\\text{flutter}}$', unit: 'б/р', interpretation: 'Запас по скорости. Значения $\\ge 1.0$ означают катастрофический резонанс.' },
      ],
    },
    mathematics: {
      governingEquationLatex: '\\begin{bmatrix} m & m x_\\alpha b \\\\ m x_\\alpha b & I_\\alpha \\end{bmatrix} \\begin{pmatrix} \\ddot{h} \\\\ \\ddot{\\theta} \\end{pmatrix} + \\begin{bmatrix} c_h & 0 \\\\ 0 & c_\\theta \\end{bmatrix} \\begin{pmatrix} \\dot{h} \\\\ \\dot{\\theta} \\end{pmatrix} + \\begin{bmatrix} K_h & 0 \\\\ 0 & K_\\theta \\end{bmatrix} \\begin{pmatrix} h \\\\ \\theta \\end{pmatrix} = \\begin{pmatrix} -L_{\\text{aero}}(t) \\\\ M_{\\text{aero}}(t) \\end{pmatrix}',
      description: 'Уравнение Лагранжа 2-го рода для связанных изгибных ($h$) и крутильных ($\\theta$) колебаний крыльевого профиля.',
      derivationSteps: [
        'Кинетическая энергия сечения: $T = \\frac{1}{2}m\\dot{h}^2 + m x_\\alpha b \\dot{h}\\dot{\\theta} + \\frac{1}{2}I_\\alpha \\dot{\\theta}^2$.',
        'Потенциальная энергия упругой деформации: $U = \\frac{1}{2}K_h h^2 + \\frac{1}{2}K_\\theta \\theta^2$.',
        'Нестационарные аэродинамические силы Теодорсена: $L_{\\text{aero}} = \\pi \\rho b^2 (\\ddot{h} + V\\dot{\\theta}) + 2\\pi\\rho V b C(k) (\\dot{h} + V\\theta)$, где $C(k)$ — функция Ханкеля.',
      ],
    },
    physicalSignificance: [
      'Смещение центра масс вперед от оси жесткости ($x_{\\text{cg}} < x_{\\text{ea}}$) кардинально повышает критическую скорость флаттера (принцип весовой балансировки рулей).',
      'Крутильная жесткость $K_\\theta$ является первостепенным параметром при проектировании композитных кессонов крыла.',
    ],
    references: [
      { authors: 'Theodorsen, T.', year: '1935', title: 'General Theory of Aerodynamic Instability and the Mechanism of Flutter', publisher: 'NACA TR-496' },
      { authors: 'Bisplinghoff, R. L., Ashley, H., & Halfman, R. L.', year: '1955', title: 'Aeroelasticity', publisher: 'Addison-Wesley' },
    ],
  },
  {
    id: '6dof',
    title: 'Пространственная Динамика Полета 6-DoF',
    category: 'aero',
    categoryLabel: 'Динамика полета',
    icon: Compass,
    badge: 'Кватернионы + Рунге-Кутта',
    summary: 'Интегрирование 12 нелинейных уравнений движения твердого тела в связанной и скоростной системах координат.',
    purpose: 'Моделирование пространственного движения самолета или ракеты во времени под действием аэродинамических сил, тяги двигателей, гравитации и отклонения органов управления (рули высоты, направления, элероны).',
    uiWalkthrough: {
      title: 'Интерфейс 6-DoF Полета',
      description: 'Визуализирует 3D модель летательного аппарата с векторами ориентации, тангажа, крена и рыскания.',
      controls: [
        { name: 'Отклонение Элеронов ($\\delta_a$)', type: 'Slider', role: 'Создает момент крена $L = C_{l\\delta a} q S b \\delta_a$.' },
        { name: 'Отклонение Руля Высоты ($\\delta_e$)', type: 'Slider', role: 'Создает момент тангажа $M = C_{m\\delta e} q S c \\delta_e$.' },
        { name: 'Отклонение Руля Направления ($\\delta_r$)', type: 'Slider', role: 'Создает момент рыскания $N = C_{n\\delta r} q S b \\delta_r$.' },
        { name: 'Тяга двигателей ($T$)', type: 'Slider', role: 'Продольная сила вдоль связанной оси $X_b$.' },
      ],
      readouts: [
        { name: 'Углы Эйлера ($\\psi, \\theta, \\gamma$)', unit: 'градусы', interpretation: 'Рыскание, тангаж и крен относительно Земли.' },
        { name: 'Угловые скорости ($p, q, r$)', unit: 'рад/с', interpretation: 'Скорости вращения вокруг продольной, поперечной и нормальной осей.' },
        { name: 'Кватернион ориентации $\\mathbf{q}$', unit: 'Нормированный вектор', interpretation: 'Вектор из 4 компонент без кинематической сингулярности («замка кардана»).' },
      ],
    },
    mathematics: {
      governingEquationLatex: 'm \\left( \\frac{d\\vec{V}}{dt} + \\vec{\\omega} \\times \\vec{V} \\right) = \\vec{F}_{\\text{ext}}, \\quad \\mathbf{I} \\frac{d\\vec{\\omega}}{dt} + \\vec{\\omega} \\times (\\mathbf{I}\\vec{\\omega}) = \\vec{M}_{\\text{ext}}',
      description: 'Система уравнений динамики твердого тела Эйлера-Ньютона в неинерциальной связанной системе координат.',
      derivationSteps: [
        'Кинематика кватернионов: $\\dot{\\mathbf{q}} = \\frac{1}{2} \\boldsymbol{\\Omega}(\\vec{\\omega}) \\mathbf{q}$.',
        'Уравнения моментов: $\\dot{p} = \\frac{(I_{yy} - I_{zz})qr + M_x}{I_{xx}}$, $\\dot{q} = \\frac{(I_{zz} - I_{xx})pr + M_y}{I_{yy}}$, $\\dot{r} = \\frac{(I_{xx} - I_{yy})pq + M_z}{I_{zz}}$.',
        'Численное интегрирование методом Рунге-Кутты 4-го порядка (RK4) с шагом $\\Delta t = 0.01$ с.',
      ],
    },
    physicalSignificance: [
      'Использование кватернионов позволяет безопасно моделировать высший пилотаж (петли Нестерова, бочки, штопор) без ошибок деления на ноль при $\\theta = \\pm 90^\\circ$.',
      'Перекрестные инерционные связи $(I_{yy}-I_{zz})qr$ объясняют явление инерционного самовращения на сверхзвуковых скоростях.',
    ],
    references: [
      { authors: 'Stevens, B. L., Lewis, F. L., & Johnson, E. N.', year: '2015', title: 'Aircraft Control and Simulation (3rd ed.)', publisher: 'Wiley' },
      { authors: 'Куропатенков М. С.', year: '2020', title: 'Динамика полета и управление летательными аппаратами', publisher: 'МГТУ им. Н.Э. Баумана' },
    ],
  },
  {
    id: 'architecture',
    title: 'Архитектура Параллельного Солвера CFD',
    category: 'aero',
    categoryLabel: 'Численные методы',
    icon: Cpu,
    badge: 'CSR + AMD + AMG + GMRES',
    summary: '3-х стадийный параллельный вычислительный конвейер для решения уравнений в частных производных.',
    purpose: 'Обеспечение максимальной скорости решения разреженных СЛАУ размерностью до $10^6$ неизвестных на современных многоядерных процессорах и GPU за счет сжатого формата CSR, симметричной перенумерации AMD/RCM и многосеточного предобуславливания AMG.',
    uiWalkthrough: {
      title: 'Интерфейс Архитектуры Солвера',
      description: 'Демонстрирует 3 стадии преобразования матрицы: исходная топология $\\to$ сжатый формат CSR $\\to$ AMG V-Cycle $\\to$ GMRES итерации.',
      controls: [
        { name: 'Выбор алгоритма перенумерации', type: 'Selector', role: 'AMD (Approximate Minimum Degree) / RCM (Reverse Cuthill-McKee).' },
        { name: 'Число уровней AMG', type: 'Slider (2 - 5)', role: 'Глубина иерархии сеток для гашения низкочастотных гармоник ошибки.' },
        { name: 'Размерность подпространства Крылова $m$', type: 'Selector', role: 'Число векторов Арнольди до рестарта GMRES($m$).' },
      ],
      readouts: [
        { name: 'Fill-in (Заполнение)', unit: '%', interpretation: 'Процент появления новых ненулевых элементов при факторизации (минимизируется алгоритмом AMD).' },
        { name: 'Speedup (Ускорение)', unit: 'X раз', interpretation: 'Эффективность относительно базового метода Якоби.' },
      ],
    },
    mathematics: {
      governingEquationLatex: '\\mathbf{x}_{k+1} = \\mathbf{x}_k + \\mathbf{M}^{-1} \\mathbf{r}_k, \\quad \\min_{\\mathbf{x} \\in \\mathcal{K}_m} ||\\mathbf{b} - \\mathbf{A}\\mathbf{x}||_2',
      description: 'Минимизация нормы невязки в пространстве Крылова $\\mathcal{K}_m(\\mathbf{A}, \\mathbf{r}_0) = \\text{span}\\{\\mathbf{r}_0, \\mathbf{A}\\mathbf{r}_0, \\dots, \\mathbf{A}^{m-1}\\mathbf{r}_0\\}$.',
      derivationSteps: [
        'Сжатый строчный формат CSR: массивы `values`, `col_indices`, `row_ptr`.',
        'Ортогонализация Арнольди с модифицированным методом Грама-Шмидта (MGS).',
        'Решение задачи наименьших квадратов через QR-разложение матрицы Хессенберга размера $(m+1) \\times m$.',
      ],
    },
    physicalSignificance: [
      'Предобуславливатель AMG снижает число обусловленности $\\kappa(\\mathbf{M}^{-1}\\mathbf{A}) \\ll \\kappa(\\mathbf{A})$, сокращая число итераций с тысяч до десятков.',
      'Экономия оперативной памяти в 10-50 раз по сравнению с плотными матрицами.',
    ],
    references: [
      { authors: 'Saad, Y.', year: '2003', title: 'Iterative Methods for Sparse Linear Systems (2nd ed.)', publisher: 'SIAM' },
      { authors: 'Stüben, K.', year: '2001', title: 'A Review of Algebraic Multigrid', publisher: 'Journal of Computational and Applied Mathematics' },
    ],
  },
  {
    id: 'space_gnc',
    title: 'Космонавтика: Задача Ламберта и Фильтр Калмана',
    category: 'space',
    categoryLabel: 'Космонавтика & GNC',
    icon: Rocket,
    badge: 'Орбитальная механика',
    summary: 'Межпланетные траектории полета, сближение на орбите, расширенная фильтрация Калмана (EKF) и теплозащита входа.',
    purpose: 'Решение двухточечной краевой задачи астродинамики для расчета характеристической скорости $\\Delta V$ межпланетных маневров и оптимальной оценки координат аппарата по зашумленным измерениям датчиков.',
    uiWalkthrough: {
      title: 'Интерфейс Космического Модуля',
      description: 'Позволяет задавать параметры целевых планет, начальной и конечной орбиты, время перелета и уровень шума датчиков.',
      controls: [
        { name: 'Время перелета $\\Delta t$', type: 'Slider (дней/часов)', role: 'Длительность трансферной траектории.' },
        { name: 'Радиусы орбит $r_1, r_2$', type: 'Input/Slider', role: 'Апогей и перигей начальной и конечной орбит.' },
        { name: 'Дисперсия шума измерений $\\mathbf{R}$', type: 'Slider', role: 'Уровень помех в оптических и радиометрических датчиках.' },
      ],
      readouts: [
        { name: 'Суммарный импульс $\\Delta V_{\\text{total}}$', unit: 'км/с', interpretation: 'Характеристическая скорость $\\Delta V_1 + \\Delta V_2$, определяющая требуемый запас топлива по формуле Циолковского.' },
        { name: 'Тепловой поток Фэя-Ридделла $\\dot{q}$', unit: 'МВт/м²', interpretation: 'Максимальный конвективный тепловой поток в лобовой точке при входе в атмосферу.' },
      ],
    },
    mathematics: {
      governingEquationLatex: '\\sqrt{\\mu} \\Delta t = \\frac{a^{3/2}}{2} \\left[ (\\alpha - \\sin\\alpha) - (\\beta - \\sin\\beta) \\right], \\quad \\mathbf{K}_k = \\mathbf{P}_k^- \\mathbf{H}_k^T (\\mathbf{H}_k \\mathbf{P}_k^- \\mathbf{H}_k^T + \\mathbf{R}_k)^{-1}',
      description: 'Трансцендентное уравнение Ламберта и уравнения матрицы коэффициентов усиления Калмана (Kalman Gain).',
      derivationSteps: [
        'Вычисление хорды $c = ||\\vec{r}_2 - \\vec{r}_1||$ и полупериметра $s = \\frac{r_1 + r_2 + c}{2}$.',
        'Численное нахождение большой полуоси $a$ методом Ньютона-Рафсона.',
        'Определение векторов скоростей $\\vec{v}_1, \\vec{v}_2$ через функции Лагранжа $f$ и $g$.',
      ],
    },
    physicalSignificance: [
      'Формула Циолковского $M_0 / M_{\\text{final}} = \\exp(\\Delta V / I_{\\text{sp}} g_0)$ связывает найденный $\\Delta V$ с массой ракеты.',
      'Фильтр Калмана обеспечивает миллиметровую точность стыковки космических кораблей даже при частичном отказе датчиков.',
    ],
    references: [
      { authors: 'Battin, R. H.', year: '1999', title: 'An Introduction to the Mathematics and Methods of Astrodynamics', publisher: 'AIAA' },
      { authors: 'Bryson, A. E., & Ho, Y. C.', year: '1975', title: 'Applied Optimal Control', publisher: 'Hemisphere Publishing' },
    ],
  },
  {
    id: 'eda_avionics',
    title: 'Микроэлектроника, TMR и Радиационная Стойкость',
    category: 'eda',
    categoryLabel: 'Авионика & EDA',
    icon: Zap,
    badge: 'Rad-Hard & Timing',
    summary: 'Анализ задержек сигналов Элмора, целостность сигналов (SI), парирование сбоев SEU и мажоритарное резервирование TMR.',
    purpose: 'Проектирование бортовых цифровых вычислительных машин (БЦВМ), способных безотказно работать в условиях космической радиации и тяжелых заряженных частиц за счет схемотехнического резервирования.',
    uiWalkthrough: {
      title: 'Интерфейс Модуля EDA',
      description: 'Позволяет моделировать трассировку межсоединений, глазковую диаграмму сигналов и мажоритарную логику TMR.',
      controls: [
        { name: 'Длина межсоединения $L$', type: 'Slider (мкм / мм)', role: 'Длина металлической дорожки на кристалле.' },
        { name: 'Поток тяжелых ионов (Flux)', type: 'Slider', role: 'Интенсивность космического излучения для генерации одиночных сбоев (SEU).' },
        { name: 'Режим резервирования', type: 'Selector', role: 'Без резервирования / TMR (Тройное) / TMR с самовосстановлением.' },
      ],
      readouts: [
        { name: 'Задержка Элмора $\\tau_D$', unit: 'пкс', interpretation: 'Время распространения фронта импульса по RC-цепи.' },
        { name: 'Надежность $R_{\\text{TMR}}(t)$', unit: '%', interpretation: 'Вероятность безотказной работы системы с 3 каналами и мажоритарным элементом.' },
      ],
    },
    mathematics: {
      governingEquationLatex: '\\tau_D = \\sum_{k} R_k \\left( \\sum_{j \\in \\text{Downstream}(k)} C_j \\right), \\quad Y_{\\text{voter}} = (A \\cdot B) + (B \\cdot C) + (A \\cdot C)',
      description: 'Модель распределенных RC-цепей Элмора и булева функция мажоритарного клапана.',
      derivationSteps: [
        'Интегрирование передаточной функции по первому моменту импульсного отклика: $\\tau_D = \\int_0^\\infty t h(t) dt$.',
        'Вероятность безотказности TMR: $R_{\\text{TMR}}(t) = 3 R^2(t) - 2 R^3(t)$, где $R(t) = e^{-\\lambda t}$.',
      ],
    },
    physicalSignificance: [
      'Тройное модульное резервирование позволяет процессору продолжать полетные вычисления даже при повреждении ячейки памяти космическим ионом.',
      'Согласование волнового сопротивления $Z_0 = 50\\,\\Omega$ устраняет паразитные отражения на тактовых частотах выше 1 ГГц.',
    ],
    references: [
      { authors: 'Pozar, D. M.', year: '2011', title: 'Microwave Engineering (4th ed.)', publisher: 'Wiley' },
      { authors: 'Velazco, R., et al.', year: '2007', title: 'Radiation Effects on Embedded Systems', publisher: 'Springer' },
    ],
  },
];

interface EngineeringHandbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopicId?: HandbookTopicId;
}

export const EngineeringHandbookModal: React.FC<EngineeringHandbookModalProps> = ({
  isOpen,
  onClose,
  initialTopicId = 'overview',
}) => {
  const [selectedTopicId, setSelectedTopicId] = useState<HandbookTopicId>(initialTopicId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Sync initial topic when modal opens
  React.useEffect(() => {
    if (initialTopicId) {
      setSelectedTopicId(initialTopicId);
    }
  }, [initialTopicId, isOpen]);

  // Filter topics by category and search
  const filteredTopics = useMemo(() => {
    return HANDBOOK_TOPICS.filter((topic) => {
      const matchCategory = selectedCategory === 'all' || topic.category === selectedCategory;
      const matchQuery =
        searchQuery.trim() === '' ||
        topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchQuery;
    });
  }, [searchQuery, selectedCategory]);

  const activeTopic = useMemo(() => {
    return HANDBOOK_TOPICS.find((t) => t.id === selectedTopicId) || HANDBOOK_TOPICS[0];
  }, [selectedTopicId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-6xl h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 text-cyan-400 border border-cyan-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Научно-Техническое Руководство & Справочник Инженера
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold">
                  STUDIO v3.0 PRO
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Полное математическое обоснование, краевые условия, физика формул и руководство по интерфейсу
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
            title="Закрыть руководство"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2-Column Sidebar + Content View */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Sidebar: Topic Selector & Search */}
          <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/60 p-3 sm:p-4 flex flex-col gap-3 shrink-0 overflow-y-auto">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск формул, терминов..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono scrollbar-none">
              {[
                { id: 'all', label: 'Все' },
                { id: 'aero', label: 'CFD/Аэро' },
                { id: 'space', label: 'GNC/Космос' },
                { id: 'eda', label: 'EDA/Авионика' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Topics List */}
            <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
              {filteredTopics.map((topic) => {
                const IconComp = topic.icon;
                const isSelected = topic.id === selectedTopicId;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setSelectedTopicId(topic.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-950/80 to-slate-900 border-cyan-500/70 text-white shadow-md ring-1 ring-cyan-500/30'
                        : 'bg-slate-900/40 hover:bg-slate-800/60 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isSelected ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold truncate">{topic.title}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 shrink-0">
                          {topic.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {topic.summary}
                      </p>
                    </div>
                  </button>
                );
              })}

              {filteredTopics.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-500 font-mono">
                  По запросу ничего не найдено
                </div>
              )}
            </div>
          </div>

          {/* Right Main Panel: Comprehensive Technical Content */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6 bg-slate-900/50">
            
            {/* Topic Header Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/60 border border-slate-800 space-y-2 relative overflow-hidden shadow-lg">
              <div className="absolute right-0 top-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold uppercase tracking-wider">
                  {activeTopic.categoryLabel}
                </span>
                <span className="text-xs font-mono text-slate-400 font-bold">
                  Спецификация: {activeTopic.badge}
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                {activeTopic.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {activeTopic.summary}
              </p>
            </div>

            {/* 1. Инженерное Назначение & Физическая Роль */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                <Info className="w-4 h-4" />
                <span>1. Инженерное Назначение и Физическая Роль</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {activeTopic.purpose}
              </p>

              {/* Physical Significance Bullet Points */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {activeTopic.physicalSignificance.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Математическое Обоснование & Уравнения */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  <Activity className="w-4 h-4" />
                  <span>2. Математическое Обоснование & Уравнения</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold">
                  KaTeX LaTeX Engine
                </span>
              </div>

              {/* Formula Callout Block */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 overflow-x-auto shadow-inner text-center">
                <MathView math={activeTopic.mathematics.governingEquationLatex} block={true} className="text-cyan-300 text-sm sm:text-base font-bold" />
              </div>

              <p className="text-xs sm:text-sm text-slate-300">
                {activeTopic.mathematics.description}
              </p>

              {/* Derivation Steps */}
              <div className="space-y-1.5 pt-1">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Численные этапы и аппроксимации:
                </h4>
                <ul className="space-y-1 text-xs text-slate-300">
                  {activeTopic.mathematics.derivationSteps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-cyan-400 font-mono font-bold">{idx + 1}.</span>
                      <MathText text={step} />
                    </li>
                  ))}
                </ul>
              </div>

              {/* Boundary Conditions if present */}
              {activeTopic.mathematics.boundaryConditions && (
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 mt-2">
                  <h5 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider font-mono">
                    Краевые и Граничные Условия (Boundary Conditions):
                  </h5>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {activeTopic.mathematics.boundaryConditions.map((bc, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                        <MathText text={bc} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 3. Руководство по Интерфейсу и Элементам Управления */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <Sliders className="w-4 h-4" />
                <span>3. Руководство по Интерфейсу (Как Управлять и Читать Графики)</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300">
                {activeTopic.uiWalkthrough.description}
              </p>

              {/* Controls Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Элементы управления и входные параметры:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeTopic.uiWalkthrough.controls.map((ctrl, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-cyan-400" />
                          <MathText text={ctrl.name} />
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {ctrl.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        <MathText text={ctrl.role} />
                      </p>
                      {ctrl.recommended && (
                        <div className="text-[10px] font-mono text-cyan-400/90 pt-0.5">
                          Рекомендация: {ctrl.recommended}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Readouts & Indicators Table */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Выходные индикаторы, графики и метрики:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeTopic.uiWalkthrough.readouts.map((ro, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-300">
                          <MathText text={ro.name} />
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {ro.unit}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        <MathText text={ro.interpretation} />
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Академические Первоисточники и Литература */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
                <BookOpen className="w-4 h-4" />
                <span>4. Академические Первоисточники и Стандарты</span>
              </div>
              <div className="space-y-2">
                {activeTopic.references.map((ref, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-200">
                        {ref.authors} ({ref.year})
                      </div>
                      <div className="text-slate-400 italic mt-0.5">
                        «{ref.title}» — {ref.publisher}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 shrink-0">
                      Standard
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Modal Bottom Status Bar */}
        <div className="px-4 sm:px-6 py-2.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400 font-mono shrink-0">
          <span>Студия Инжиниринга v3.0 PRO | Документация верифицирована</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            Понятно, вернуться в Студию
          </button>
        </div>

      </div>
    </div>
  );
};
