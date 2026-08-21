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
  Grid,
  Wrench,
  Lightbulb,
  Workflow,
  CheckSquare,
  PlayCircle,
  Eye,
  MapPin,
  FileText,
  Download,
  Gauge,
  Terminal,
  MousePointer,
  Maximize2,
  SlidersHorizontal,
  FolderGit2,
} from 'lucide-react';
import { MathText, MathView } from './MathView';

export type HandbookTopicId =
  | 'overview'
  | 'presets'
  | 'visual_studio'
  | 'physics_solvers'
  | 'export_report'
  | 'vlm'
  | 'status_monitor'
  | 'wind_tunnel'
  | 'flutter'
  | '6dof'
  | 'architecture'
  | 'space_gnc'
  | 'eda_avionics';

export interface EngineerWorkflowStep {
  stepNumber: number;
  title: string;
  action: string;
  uiTarget: string;
  expectedResult: string;
}

export interface ParameterDecoderItem {
  id: string;
  name: string;
  symbolLatex: string;
  category: 'input' | 'aero_output' | 'visual_3d' | 'space' | 'eda';
  categoryName: string;
  location: string;
  meaning: string;
  howToConfigure: string;
  howToObtain: string;
  badge: string;
}

export interface SOPRecipe {
  id: string;
  title: string;
  tag: string;
  targetDomain: 'CFD & Аэро' | '3D Лаборатория' | 'Флаттер & Динамика' | 'Космос & GNC' | 'EDA & Авионика' | 'Экспорт & CAE';
  goal: string;
  estimatedTime: string;
  steps: Array<{
    stepNumber: number;
    title: string;
    description: string;
    whereToClick: string;
    expectedOutcome: string;
  }>;
  proTip: string;
}

export interface PracticalTip {
  title: string;
  description: string;
  type?: 'tip' | 'warning' | 'recommendation';
}

interface HandbookTopic {
  id: HandbookTopicId;
  title: string;
  category: 'aero' | 'space' | 'eda' | 'general';
  categoryLabel: string;
  icon: React.ElementType;
  badge: string;
  summary: string;
  purpose: string;
  engineeringWorkflow: {
    title: string;
    goal: string;
    steps: EngineerWorkflowStep[];
    pitfallsAndTroubleshooting?: Array<{ issue: string; resolution: string }>;
    bestPractices?: string[];
  };
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
    engineeringWorkflow: {
      title: 'Типовой Инженерный Маршрут Проектирования (End-to-End Workflow)',
      goal: 'Выполнить полный цикл численного исследования: от выбора геометрии профиля/крыла до получения интегральных аэродинамических поляр и экспорта отчета.',
      steps: [
        {
          stepNumber: 1,
          title: 'Выбор Инженерного Домена и Модуля',
          action: 'Переключите верхнюю вкладку между «Аэродинамика & CFD», «Космонавтика & GNC» и «Микроэлектроника & EDA».',
          uiTarget: 'Верхняя навигационная панель Доменов',
          expectedResult: 'Загрузка специализированного расчетного окружения с контекстными пресетами и 3D сценой.',
        },
        {
          stepNumber: 2,
          title: 'Инициализация Геометрии из Пресетов',
          action: 'Во вкладке «Пресеты NASA» выберите эталонную конфигурацию (напр., NACA 0012 для симметричного профиля или NASA SC(2)-0714 для околозвукового полета) и нажмите «Применить».',
          uiTarget: 'Вкладка «Пресеты Профилей» -> Карточка профиля',
          expectedResult: 'Автоматическая генерация адаптированной сетки, перенос хорды, толщины и начального числа Маха в солвер.',
        },
        {
          stepNumber: 3,
          title: 'Настройка Граничных Условий и Запуск Солвера',
          action: 'В «Мониторе Сил» задайте скорость набегающего потока $M_\\infty$, угол атаки $\\alpha$ и высоту полета $H$, после чего нажмите кнопку «Запустить Расчет».',
          uiTarget: 'Панель управления «Монитор Сил & Сходимости»',
          expectedResult: 'Активация параллельного конвейера (CSR -> AMG -> GMRES), вывод невязок $< 10^{-7}$ и расчет коэффициентов $C_L, C_D, C_m$.',
        },
        {
          stepNumber: 4,
          title: 'Глубокий 3D Постпроцессинг в Визуальной Лаборатории',
          action: 'Перейдите в «3D Лабораторию», активируйте секущие плоскости (Cut Planes), $Q$-критерий вихревых ядер или лагранжеву дымовую визуализацию.',
          uiTarget: 'Вкладка «3D Визуальная Лаборатория»',
          expectedResult: '3D интерактивное исследование отрывных зон, скоса потока на законцовках и скачков уплотнения.',
        },
        {
          stepNumber: 5,
          title: 'Генерация Официального Отчета и Экспорт в CAE',
          action: 'В модуле «Экспорт & Отчёты» сгенерируйте и распечатайте PDF-отчет ГОСТ/AIAA либо скачайте 3D сетку в формате ParaView Legacy VTK (.vtk) и кейс для SU2 (.cfg).',
          uiTarget: 'Вкладка «Экспорт и Отчеты»',
          expectedResult: 'Получение готового комплекта документации и файлов для межплатформенной верификации.',
        },
      ],
      pitfallsAndTroubleshooting: [
        {
          issue: 'Невязка солвера не падает ниже $10^{-3}$ (расхождение расчета)',
          resolution: 'Уменьшите число Куранта $CFL$ до $1.0 - 2.5$, проверьте наличие сверхкритического срыва потока при $\\alpha > 16^\\circ$ или переключите предобуславливатель на AMG V-Cycle.',
        },
        {
          issue: 'Торможение 3D визуализации на мобильных устройствах',
          resolution: 'Отключите отображение объемных частиц дыма и уменьшите разрешение секущей сетки (Cut Plane Res) до $40 \\times 40$.',
        },
      ],
      bestPractices: [
        'Всегда начинайте расчет с малых углов атаки $\\alpha = 0^\\circ...2^\\circ$ для быстрой инициализации поля скоростей перед маневрами на закритических углах.',
        'Используйте встроенный A/B компаратор для наглядного сопоставления дозвукового и трансзвукового режимов обтекания.',
      ],
    },
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
    engineeringWorkflow: {
      title: 'Инструкция по Работе с Каталогом Пресетов',
      goal: 'Быстро загрузить геометрическую модель и откалибровать расчетные параметры под верифицированные продувочные данные.',
      steps: [
        {
          stepNumber: 1,
          title: 'Выбор аэродинамического профиля',
          action: 'Ознакомьтесь с карточками каталога. Обратите внимание на назначение: NACA 0012 (рули, симметрия), NACA 4412 (высокая несущая способность), NASA SC(2) (крейсерский полет $M=0.78$), Diamond / Ogive (сверхзвук $M>1.2$).',
          uiTarget: 'Сетка карточек пресетов',
          expectedResult: 'Отображение геометрического абриса профиля и справочной сводки $C_{L,\\text{ref}}, C_{D,\\text{ref}}, L/D$.',
        },
        {
          stepNumber: 2,
          title: 'Применение параметров в солвер',
          action: 'Нажмите синюю кнопку «Применить Пресет» на выбранной карточке.',
          uiTarget: 'Кнопка «Применить Пресет» внутри карточки',
          expectedResult: 'Мгновенная запись хорды, относительной толщины $t/c$, кривизны $y_c$ и перевод интерфейса во вкладку «Монитор Сил» с генерацией расчетной сетки.',
        },
      ],
      pitfallsAndTroubleshooting: [
        {
          issue: 'Сверхкритический профиль теряет подъемную силу на сверхзвуке $M > 1.2$',
          resolution: 'Сверхкритические профили NASA SC(2) оптимизированы исключительно для трансзвука ($M = 0.72 - 0.85$). Для сверхзвуковых скоростей переключитесь на профиль Diamond (ромб) или Ogive (оживальный).',
        },
      ],
      bestPractices: [
        'Для калибровки точности численной схемы сверяйте получаемое значение $C_L$ с эталонным $C_{L,\\text{ref}}$, указанным на карточке пресета.',
      ],
    },
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
    id: 'visual_studio',
    title: '3D Визуальная Лаборатория (UX & Сечения)',
    category: 'aero',
    categoryLabel: 'Аэродинамика',
    icon: Sparkles,
    badge: '3D CFD Post-Processing',
    summary: 'Полнофункциональный 3D постпроцессор аэрогидродинамики: секущие плоскости (Cut Planes), $Q$-критерий вихрей, струйная 3D дымовая визуализация (Smoke Streamlines), виртуальный датчик (Probes) и сравнительный сплит-экран (A/B Comparator).',
    purpose: 'Предоставить инженеру интерактивный визуальный инструментарий исследовательского уровня (аналог ParaView и Tecplot 360) прямо в браузере с аппаратным ускорением для выявления пространственных вихревых жгутов, зон отрыва пограничного слоя и структуры скачков уплотнения.',
    engineeringWorkflow: {
      title: 'Инструкция Инженера по Работе с 3D Визуализатором',
      goal: 'Локализовать зоны вихреобразования, визуализировать структуру пограничного слоя и точно замерить газодинамические параметры в любой точке пространства.',
      steps: [
        {
          stepNumber: 1,
          title: 'Орбитальная навигация камеры',
          action: 'Зажмите левую кнопку мыши (ЛКМ) для вращения 3D сцены вокруг объекта, правую кнопку мыши (ПКМ) для панорамирования, колесико мыши для плавного масштабирования.',
          uiTarget: '3D Viewport',
          expectedResult: 'Свободный пространственный осмотр крыла и поля течения с любого ракурса.',
        },
        {
          stepNumber: 2,
          title: 'Активация и перемещение Секущей Плоскости (Cut Plane)',
          action: 'В верхней панели режимов выберите кнопку «Секущая плоскость». Выберите ось среза (X, Y или Z) и перемещайте слайдер положения среза.',
          uiTarget: 'Панель режимов -> Секущая плоскость -> Слайдер позиции',
          expectedResult: 'Отображение динамического 2D среза с градиентной заливкой скалярного поля ($C_p, M, \\omega, TKE$).',
        },
        {
          stepNumber: 3,
          title: 'Выделение Вихревых Ядер по $Q$-Критерию',
          action: 'Переключите режим на «$Q$-Критерий (Vortices)». Отрегулируйте порог изоповерхности слайдером.',
          uiTarget: 'Панель режимов -> $Q$-Критерий',
          expectedResult: 'Появление объемных 3D трубчатых структур, локализующих концевые вихри и срывные жгуты.',
        },
        {
          stepNumber: 4,
          title: 'Точечные замеры Виртуальным Зондом (Probe)',
          action: 'Включите режим «Виртуальный Зонд». Перемещайте 3D маркер по осям X, Y, Z.',
          uiTarget: 'Панель режимов -> Зонд (Probe)',
          expectedResult: 'Мгновенное считывание давления $C_p$, местного числа Маха $M_{\\text{loc}}$, завихренности $\\omega$ и динамического напора в цифровом табло.',
        },
        {
          stepNumber: 5,
          title: 'Сравнительный A/B Сплит-Экран (Comparator)',
          action: 'Активируйте режим «A/B Сравнение». Слева отобразится базовый режим (например, дозвук), справа — модифицированный (трансзвук/сверхзвук) с синхронной камерой.',
          uiTarget: 'Панель режимов -> A/B Split Screen',
          expectedResult: 'Параллельное сравнение ударно-волновой картины и распределения давления без необходимости перезапуска.',
        },
      ],
      pitfallsAndTroubleshooting: [
        {
          issue: 'Цветовая шкала перенасыщена (один сплошной цвет)',
          resolution: 'Смените палитру на «CoolWarm» или «Viridis» либо переключите скалярное поле с $C_p$ на местное число Маха $M$.',
        },
        {
          issue: 'Линии тока частиц пропадают за крылом',
          resolution: 'Отрегулируйте положение граблины впрыска (Rake Position) ближе к передней кромке профиля.',
        },
      ],
      bestPractices: [
        'Для анализа срыва потока используйте палитру Schlieren: она подчеркивает градиенты плотности, четко проявляя линию отрыва пограничного слоя.',
      ],
    },
    uiWalkthrough: {
      title: 'Навигация и Инструменты 3D Лаборатории',
      description: 'Центральный 3D вьюпорт поддерживает свободную орбитальную камеру, панорамирование и зум. Верхняя панель режимов переключает функциональные инструменты анализа.',
      controls: [
        { name: 'Режим «Секущая плоскость (Cut Plane)»', type: 'Mode Selector', role: 'Активирует динамический срез по осям X, Y или Z со слайдером положения среза и выбором цветовой шкалы (Turbo, CoolWarm, Viridis, Jet, Schlieren).' },
        { name: 'Режим «$Q$-Критерий (Vortex Structures)»', type: 'Mode Selector', role: 'Изоповерхности второго инварианта тензора градиента скорости $Q > 0$ с регулировкой порога изоповерхности.' },
        { name: 'Режим «Дымовые струи (Smoke/Particles)»', type: 'Mode Selector', role: 'Интерактивная граблина частиц (Rake) с генерацией 3D траекторий частиц с учетом местного поля скоростей.' },
        { name: 'Режим «Виртуальный Зонд (Probe)»', type: 'Mode Selector', role: 'Перемещаемый 3D датчик полного давления, местного числа Маха, завихренности и динамического напора в точке пространства $(x,y,z)$.' },
        { name: 'Режим «A/B Компаратор (Split View)»', type: 'Mode Selector', role: 'Сравнительный сплит-экран двух режимов (например, $M=0.78$ vs $M=1.4$ или $\\alpha=2^\\circ$ vs $\\alpha=14^\\circ$) с единой синхронизированной камерой.' },
        { name: 'Выбор Скалярного Поля', type: 'Dropdown', role: 'Коэффициент давления $C_p$, Скорость $V$, Число Маха $M$, Завихренность $\\omega$, Кинетическая энергия турбулентности TKE.' },
      ],
      readouts: [
        { name: 'Показания зонда $(C_p, M_{loc}, \\omega)$', unit: 'SI / б.р.', interpretation: 'Точечные значения физических величин в фокусе курсора или перекрестия зонда.' },
        { name: 'Цветовая шкала (Colorbar)', unit: 'Min / Max шкала', interpretation: 'Диапазон скалярной величины с динамической калибровкой легенды.' },
        { name: 'Число активных частиц', unit: 'шт. (N ~ 400)', interpretation: 'Текущий размер буфера траекторий дымовой визуализации.' },
      ],
    },
    mathematics: {
      governingEquationLatex: 'Q = \\frac{1}{2} \\left( ||\\boldsymbol{\\Omega}||_F^2 - ||\\mathbf{S}||_F^2 \\right) > 0, \\quad \\frac{d\\vec{x}_p}{dt} = \\vec{V}(\\vec{x}_p, t)',
      description: '$Q$-критерий Ханта выделения когерентных вихревых ядер и уравнение переноса лагранжевых частиц.',
      derivationSteps: [
        'Разложение тензора градиента скорости: $\\nabla \\vec{V} = \\mathbf{S} + \\boldsymbol{\\Omega}$, где $\\mathbf{S} = \\frac{1}{2}(\\nabla \\vec{V} + \\nabla \\vec{V}^T)$ — тензор скоростей деформаций, $\\boldsymbol{\\Omega} = \\frac{1}{2}(\\nabla \\vec{V} - \\nabla \\vec{V}^T)$ — тензор завихренности.',
        'Изоповерхность $Q > 0$ соответствует областям, где вращательное движение жидкости преобладает над сдвиговыми деформациями (вихревые ядра на законцовках и кромках).',
        'Интегрирование траекторий частиц методом предиктор-корректор (Хейн / RK2) для построения линий тока и дымовых шлейфов.',
        'Синтетический градиент плотности (Schlieren): $\\mathcal{I} = ||\\nabla \\rho|| = \\sqrt{(\\partial \\rho / \\partial x)^2 + (\\partial \\rho / \\partial y)^2}$, выявляющий ударные волны и конусы Маха.',
      ],
      boundaryConditions: [
        'Условие непротекания на твердой границе: $\\vec{V} \\cdot \\vec{n} = 0$.',
        'Свободный сход вихревых жгутов с острых задних и боковых кромок.',
      ],
    },
    physicalSignificance: [
      'Визуализация $Q$-критерия позволяет обнаружить и оптимизировать концевые вихри крыла, снижая индуцированное сопротивление $C_{Di}$.',
      'Секущие плоскости (Cut Planes) дают возможность детально изучить толщину пограничного слоя $\\delta(x)$ и положение точки ламинарно-турбулентного перехода.',
      'A/B компаратор ускоряет валидацию проектных изменений при варьировании геометрических параметров или скоростных режимов полета.',
    ],
    references: [
      { authors: 'Hunt, J. C. R., Wray, A. A., & Moin, P.', year: '1988', title: 'Eddies, stream, and convergence zones in turbulent flows', publisher: 'Center for Turbulence Research Report CTR-S88' },
      { authors: 'Schlichting, H., & Gersten, K.', year: '2016', title: 'Boundary-Layer Theory (9th ed.)', publisher: 'Springer' },
    ],
  },
  {
    id: 'physics_solvers',
    title: 'Расширенные Физические Солверы (RANS, Euler, Riemann)',
    category: 'aero',
    categoryLabel: 'Аэродинамика',
    icon: Cpu,
    badge: 'CFD Solvers Matrix',
    summary: 'Многорежимный комплекс аэродинамических солверов: RANS ($k$-$\\omega$ SST & Spalart-Allmaras), Сжимаемый Эйлер (Compressible Euler), Несжимаемый Навье-Стокс (SIMPLE/PISO), Потенциальный Полно-Потенциальный (Full Potential FP3D) и Римановский Решатель Роэ (Roe MUSCL).',
    purpose: 'Предоставить выбор математической модели, оптимальной для конкретного физического диапазона скоростей — от тихоходных БПЛА до гиперзвуковых аппаратов с разрывными ударными волнами.',
    engineeringWorkflow: {
      title: 'Инструкция по Выбору и Настройке CFD Солвера',
      goal: 'Выбрать класс уравнений, обеспечивающий максимальную физическую достоверность при минимальных вычислительных затратах.',
      steps: [
        {
          stepNumber: 1,
          title: 'Определение физического режима течения',
          action: 'Оцените число Маха $M_\\infty$ и число Рейнольдса $Re$. Для дозвуковых БПЛА ($M < 0.3$) выберите Incompressible Navier-Stokes; для трансзвука с сильным срывом — RANS $k$-$\\omega$ SST; для сверхзвуковых конусов ($M > 1.5$) — Euler / Riemann Roe.',
          uiTarget: 'Карточки выбора решателя (Solver Selector)',
          expectedResult: 'Активация соответствующей системы уравнений в частных производных.',
        },
        {
          stepNumber: 2,
          title: 'Настройка числа Куранта ($CFL$)',
          action: 'Установите $CFL = 1.0 - 5.0$ для явных схем Роэ при сверхзвуке, либо $CFL = 10.0 - 50.0$ для псевдонеявных стационарных итераций RANS.',
          uiTarget: 'Слайдер $CFL$ Number',
          expectedResult: 'Оптимизация скорости шага по времени $\\Delta t$ без потери численной устойчивости.',
        },
        {
          stepNumber: 3,
          title: 'Выбор схемы аппроксимации потоков',
          action: 'Для ударных волн выберите Roe MUSCL 2-го порядка с лимитером van Leer, устраняющим осцилляции Гиббса на фронте скачка.',
          uiTarget: 'Выпадающий список Flux Scheme',
          expectedResult: 'Четкое монотонное разрешение разрывов плотности и давления.',
        },
      ],
      pitfallsAndTroubleshooting: [
        {
          issue: 'Появление NaN в невязках на первом же шаге',
          resolution: 'Снизьте начальное число $CFL$ до 0.5 на первых 50 итерациях (фаза разогрева / ramp-up), затем плавно увеличивайте.',
        },
      ],
      bestPractices: [
        'Для тонких профилей без отрыва схема Сжимаемого Эйлера сходится в 4-6 раз быстрее RANS при практически идентичном распределении $C_p$.',
      ],
    },
    uiWalkthrough: {
      title: 'Интерфейс Панели Солверов',
      description: 'Позволяет выбирать класс решателя, настраивать параметры схемы дискретизации, число Куранта ($CFL$), модель турбулентности и производить запуск расчетного цикла.',
      controls: [
        { name: 'Селектор Архитектуры Солвера', type: 'Solver Cards', role: 'Выбор между RANS $k$-$\\omega$ SST, Euler, Incompressible Navier-Stokes, Full Potential и Riemann Roe.' },
        { name: 'Число Куранта ($CFL$)', type: 'Slider (0.5 - 20.0)', role: 'Управляет шагом по времени $\\Delta t = CFL \\cdot \\Delta x / (|u| + a)$ для обеспечения устойчивости Куранта-Фридрихса-Леви.' },
        { name: 'Пространственная Схема (Flux Scheme)', type: 'Selector', role: 'Roe MUSCL (2-й порядок с лимитерами потоков van Leer/minmod), HLLC, Jameson-Schmidt-Turkel (JST).' },
        { name: 'Модель Турбулентности', type: 'Dropdown', role: '$k$-$\\omega$ SST (Ментер), Spalart-Allmaras (1-уравнение), Ламинарный режим.' },
      ],
      readouts: [
        { name: 'Невязка непрерывности $||R_\\rho||$', unit: 'Log10', interpretation: 'Скорость убывания невязки массы; критерий сходимости $< 10^{-6}$.' },
        { name: 'Локальное число $y^+$', unit: 'б.р.', interpretation: 'Безразмерное расстояние первой пристеночной ячейки: $y^+ = y u_\\tau / \\nu$. Для $k$-$\\omega$ SST рекомендуется $y^+ \\approx 1$.' },
        { name: 'Баланс импульса и энергии', unit: '%', interpretation: 'Консервативное сохранение полной энтальпии $H_0 = \\text{const}$.' },
      ],
    },
    mathematics: {
      governingEquationLatex: '\\frac{\\partial \\mathbf{U}}{\\partial t} + \\nabla \\cdot \\mathbf{F}(\\mathbf{U}) = \\nabla \\cdot \\mathbf{F}_v(\\mathbf{U}) + \\mathbf{S}, \\quad \\mathbf{F}_{\\text{Roe}} = \\frac{1}{2}(\\mathbf{F}_L + \\mathbf{F}_R) - \\frac{1}{2} |\\mathbf{\\tilde{A}}| (\\mathbf{U}_R - \\mathbf{U}_L)',
      description: 'Консервативная векторная форма уравнений Навье-Стокса с осреднением по Рейнольдсу (RANS) и схема приближенного распада разрыва Роэ.',
      derivationSteps: [
        'Вектор консервативных переменных: $\\mathbf{U} = [\\rho, \\rho u, \\rho v, \\rho w, \\rho E, \\rho k, \\rho \\omega]^T$.',
        'Турбулентная вязкость Буссинеска: $\\mu_t = \\rho k / \\omega$ с лимитером сдвиговых напряжений Ментера $F_2$.',
        'Реконструкция значений на гранях ячеек методом MUSCL с лимитером ван Лира: $\\mathbf{U}_{L,R} = \\mathbf{U}_i \\pm \\frac{1}{2} \\phi(r) \\Delta \\mathbf{U}$.',
        'Вычисление матрицы Якоби потока $\\mathbf{\\tilde{A}} = \\partial \\mathbf{F} / \\partial \\mathbf{U}$ на средних по Роэ параметрах $(\\tilde{u}, \\tilde{v}, \\tilde{H})$.',
      ],
      boundaryConditions: [
        'Стенка: $u=v=w=0$, $k=0$, $\\omega_{\\text{wall}} = 10 \\cdot \\frac{6\\nu}{\\beta_1 y_1^2}$.',
        'Входная граница (Inlet): сверхзвуковой $(\\rho_\\infty, \\vec{u}_\\infty, p_\\infty)$ или дозвуковой с фиксацией полного давления $p_0$ и температуры $T_0$.',
        'Выходная граница (Outlet): свободное истечение при $M > 1$ или фиксация статического давления $p_{\\text{back}}$ при $M < 1$.',
      ],
    },
    physicalSignificance: [
      'Схема Роэ второго порядка точности разрешает скачки уплотнения (косые и прямые ударные волны) без паразитных нефизических осцилляций благодаря монотонным TVD-лимитерам.',
      'Модель Ментера $k$-$\\omega$ SST идеально сочетает точность уравнения Вилкокса в пристеночной зоне с нечувствительностью $k$-$\\varepsilon$ в свободном потоке, надежно предсказывая срыв потока при больших углах атаки $\\alpha$.',
    ],
    references: [
      { authors: 'Roe, P. L.', year: '1981', title: 'Approximate Riemann solvers, parameter vectors, and difference schemes', publisher: 'Journal of Computational Physics, 43(2), 357-372' },
      { authors: 'Menter, F. R.', year: '1994', title: 'Two-equation eddy-viscosity turbulence models for engineering applications', publisher: 'AIAA Journal, 32(8), 1598-1605' },
    ],
  },
  {
    id: 'export_report',
    title: 'Экспорт и Автоматическая Отчётность (PDF, VTK, LaTeX)',
    category: 'aero',
    categoryLabel: 'Отчетность & CAE',
    icon: BarChart2,
    badge: 'Aero Reports & CAE Export',
    summary: 'Автоматическая генерация инженерных заключений ГОСТ/AIAA, экспорт расчетных 3D сеток в ParaView Legacy VTK (.vtk/.vtp), таблиц поляр в CSV, научных статей в AMS-LaTeX (.tex) и расчетных кейсов для CFD солвера SU2 (.cfg).',
    purpose: 'Обеспечить бесшовную интеграцию расчетного комплекса в существующий цикл авиационного проектирования, создание официальной отчетности для сертификации и экспорт данных в сторонние CAE пакеты (ParaView, Tecplot, MATLAB/Simulink, ANSYS).',
    engineeringWorkflow: {
      title: 'Инструкция по Экспорту и Созданию Документации',
      goal: 'Сформировать официальное инженерное заключение и передать результаты в смежные CAE/CAD среды.',
      steps: [
        {
          stepNumber: 1,
          title: 'Контроль аэродинамических коэффициентов в сводке',
          action: 'Проверьте значения $C_L, C_D, C_m, K=L/D$, положение аэродинамического фокуса $X_{np}$ и запас продольной устойчивости $K_c$.',
          uiTarget: 'Сводная карточка результатов',
          expectedResult: 'Подтверждение аэродинамической эффективности и статической устойчивости крыла.',
        },
        {
          stepNumber: 2,
          title: 'Генерация и печать отчета в PDF',
          action: 'Нажмите «Печать / Экспорт PDF». В диалоговом окне браузера выберите «Сохранить как PDF».',
          uiTarget: 'Кнопка «Печать / Экспорт PDF»',
          expectedResult: 'Формирование векторного документа со штампом ГОСТ, графиками поляр и таблицами данных.',
        },
        {
          stepNumber: 3,
          title: 'Экспорт расчетной 3D сетки в ParaView (.vtk)',
          action: 'Нажмите кнопку «Скачать ParaView VTK». Откройте полученный файл в ParaView и примените фильтр Warp by Vector или Contour.',
          uiTarget: 'Кнопка «Скачать ParaView VTK»',
          expectedResult: 'Загрузка 3D полигональной сетки крыла со скалярными массивами $C_p$ и завихренности.',
        },
        {
          stepNumber: 4,
          title: 'Генерация кейса для решателя SU2 (.cfg)',
          action: 'Нажмите «Скачать SU2 Case». Файл готов к запуску командой `SU2_CFD config.cfg`.',
          uiTarget: 'Кнопка «Скачать SU2 Case»',
          expectedResult: 'Создание эталонного конфигурационного файла с граничными условиями RANS SST.',
        },
      ],
      pitfallsAndTroubleshooting: [
        {
          issue: 'В PDF обрезаются широкие таблицы данных',
          resolution: 'В настройках печати браузера установите масштаб «По ширине страницы» или альбомную ориентацию.',
        },
      ],
      bestPractices: [
        'Для публикации в научных журналах используйте экспорт LaTeX (.tex): в нем уже сверстаны таблицы `booktabs` и формулы в استاندارد AMS-LaTeX.',
      ],
    },
    uiWalkthrough: {
      title: 'Интерфейс Экспорта и Генерации Отчетов',
      description: 'Состоит из панели выбора форматов экспорта, генератора официального отчета с предпросмотром и блока интеграции с открытыми солверами.',
      controls: [
        { name: 'Кнопка «Экспорт в PDF / Печать»', type: 'Primary Action', role: 'Формирует стандартизированный PDF документ через оптимизированную верстку @media print.' },
        { name: 'Кнопка «Скачать ParaView VTK (.vtk)»', type: 'Button', role: 'Генерирует 3D полигональную поверхность крыла с распределением скалярных полей ($C_p, M, \\omega$).' },
        { name: 'Кнопка «Скачать LaTeX (.tex)»', type: 'Button', role: 'Генерирует готовый исходник научной статьи со сводными таблицами booktabs и формулами.' },
        { name: 'Кнопка «Скачать SU2 Case (.cfg)»', type: 'Button', role: 'Создает рабочий конфигурационный файл для свободного CFD солвера SU2 с граничными условиями RANS SST.' },
        { name: 'Кнопка «Экспорт CSV & JSON»', type: 'Button', role: 'Скачивание численных массивов $C_p(x/c)$ и поляр $C_L(\\alpha), C_D(\\alpha)$ для MATLAB/Python.' },
      ],
      readouts: [
        { name: 'Инженерный Штамп Отчета', unit: 'Метаданные', interpretation: 'Имя инженера, организация, статус верификации и временная метка.' },
        { name: 'Сводка Аэродинамических Коэффициентов', unit: 'Таблица', interpretation: 'Значения $C_L, C_D, C_m, K=L/D$, запас статической устойчивости $K_c$, фокус $X_{np}$.' },
        { name: 'Декомпозиция Лобового Сопротивления', unit: 'График / %', interpretation: 'Разделение $C_D$ на индуктивное ($C_{Di}$), профильное трение ($C_{Df}$) и волновое ($C_{Dw}$).' },
      ],
    },
    mathematics: {
      governingEquationLatex: 'K_c = -\\frac{\\partial C_m}{\\partial C_L} = \\frac{X_{np} - X_{cg}}{c_{\\text{MAC}}}, \\quad C_D = C_{D0} + C_{D,\\text{wave}} + \\frac{C_L^2}{\\pi AR e}',
      description: 'Критерий статической продольной устойчивости летательного аппарата и трехчленная декомпозиция коэффициента сопротивления.',
      derivationSteps: [
        'Положение нейтральной точки (аэродинамического фокуса крыла): $X_{np} = X_{cg} - c_{\\text{MAC}} \\frac{dC_m/d\\alpha}{dC_L/d\\alpha}$.',
        'Условие статической устойчивости: запас устойчивости $K_c > 0$ (фокус расположен позади центра тяжести аппарата).',
        'Формирование структуры данных VTK PolyData: запись вершин `POINTS`, полигонов `POLYGONS` и атрибутов `POINT_DATA` для визуализации в ParaView.',
      ],
      boundaryConditions: [
        'Стандарты оформления документации: ГОСТ 2.105-95 / AIAA Recommended Practice.',
        'Форматирование числовых данных: IEEE-754 с гарантированной точностью до 6 значащих цифр.',
      ],
    },
    physicalSignificance: [
      'Автоматический расчет запаса центровки $K_c$ предупреждает инженера о риске продольной неустойчивости самолета при смещении полезной нагрузки.',
      'Прямой экспорт в открытые форматы (VTK, SU2, CSV) устраняет необходимость ручного переформатирования расчетных сеток и ускоряет междисциплинарный анализ.',
    ],
    references: [
      { authors: 'AIAA Committee on Standards', year: '1998', title: 'Guide for the Verification and Validation of Computational Fluid Dynamics Simulations', publisher: 'AIAA S-071A-1998' },
      { authors: 'Economon, T. D., et al.', year: '2016', title: 'SU2: An open-source suite for multiphysics simulation and design', publisher: 'AIAA Journal, 54(3), 828-846' },
    ],
  },
  {
    id: 'vlm',
    title: '3D Метод Вихревой Решетки (VLM)',
    category: 'aero',
    categoryLabel: 'Аэродинамика',
    icon: Grid,
    badge: '3D Vortex Lattice Method',
    summary: 'Численный расчет обтекания пространственного крыла 3D методом подковообразных вихрей Хорсшу на основе закона Био-Савара и решения СЛАУ потенциального течения.',
    purpose: 'Позволяет рассчитывать трехмерные эффекты крыла конечного размаха: индуктивное сопротивление $C_{Di}$, скос потока $w(y)$, влияние стреловидности $\\Lambda$, геометрической крутки (washout), сужения $\\lambda$ и законцовок (winglets).',
    engineeringWorkflow: {
      title: 'Инструкция по Расчету Крыла в 3D VLM Солвере',
      goal: 'Смоделировать 3D пространственное крыло, оптимизировать распределение циркуляции по размаху и минимизировать индуктивное сопротивление $C_{Di}$.',
      steps: [
        {
          stepNumber: 1,
          title: 'Инициализация плановой формы крыла',
          action: 'Выберите пресет (напр., Планер AR=18 для минимизации индуктивного сопротивления или Concorde Delta для сверхзвуковой стреловидности) либо настройте размах $b$, сужение $\\lambda$ и стреловидность $\\Lambda$.',
          uiTarget: 'Панель «Геометрия Крыла VLM»',
          expectedResult: 'Построение 3D дискретизированной срединной поверхности крыла с подковообразными вихревыми панелями.',
        },
        {
          stepNumber: 2,
          title: 'Анализ аэродинамического совершенства $e$ (Освальд)',
          action: 'Варьируйте геометрическую крутку (washout $\\theta$) от корня к законцовкам в диапазоне $-2^\\circ...-4^\\circ$.',
          uiTarget: 'Слайдер «Крутка (Washout)»',
          expectedResult: 'Приближение эпюры циркуляции $c_l(y) c(y)$ к идеальному эллипсу Прандтля, рост коэффициента Освальда $e \\to 0.98$.',
        },
        {
          stepNumber: 3,
          title: 'Оценка влияния законцовок (Винглетов)',
          action: 'Включите тумблер «Винглеты / Законцовки».',
          uiTarget: 'Тумблер «Винглеты»',
          expectedResult: 'Снижение индуктивного сопротивления $C_{Di}$ на 4-8% за счет смещения и рассеяния концевого вихревого жгута вверх.',
        },
      ],
      pitfallsAndTroubleshooting: [
        {
          issue: 'Резкий рост $C_{Di}$ при высоких $\\alpha > 12^\\circ$',
          resolution: 'VLM базируется на теории потенциального безотрывного течения. Для углов атаки с развитым срывом используйте модуль RANS SST.',
        },
      ],
      bestPractices: [
        'Используйте сужение $\\lambda = 0.45$ для прямых трапециевидных крыльев — это обеспечивает естественное эллиптическое распределение подъемной силы без сложной аэродинамической крутки.',
      ],
    },
    uiWalkthrough: {
      title: 'Интерфейс 3D VLM Солвера',
      description: 'Включает 3D интерактивный холст сетки крыла с вихревыми нитями, панель геометрических параметров крыла и 2D эпюры распределения нагрузок по размаху.',
      controls: [
        { name: 'Каталог пресетов крыльев', type: 'Buttons', role: 'Быстрая загрузка геометрий (NASA CRM, Supermarine Spitfire, Планер AR=18, Concorde Delta, Су-47).' },
        { name: 'Угол атаки ($\\alpha$)', type: 'Slider (-4° ... +16°)', role: 'Управляет углом между хордой и вектором набегающего потока $V_\\infty$.' },
        { name: 'Размах (b) и Сужение ($\\lambda$)', type: 'Sliders', role: 'Задают удлинение $AR = b^2/S$ и отношение концевой хорды к корневой $\\lambda = c_{tip}/c_{root}$.' },
        { name: 'Стреловидность ($\\Lambda$) и Крутка ($\\theta$)', type: 'Sliders', role: 'Управляют перераспределением циркуляции от корня к законцовкам.' },
        { name: 'Тумблер «Винглеты / Законцовки»', type: 'Toggle', role: 'Включает концевые аэродинамические поверхности, ослабляющие вихревой жгут.' },
      ],
      readouts: [
        { name: 'Коэффициент $C_L$', unit: 'б/р', interpretation: 'Полная подъемная сила крыла: $L = C_L \\cdot q_\\infty S$.' },
        { name: 'Индуктивное сопротивление $C_{Di}$', unit: 'б/р', interpretation: 'Сопротивление, вызванное скосом потока и сходящими с законцовок вихрями.' },
        { name: 'Коэффициент Освальда $e$', unit: 'б/р (0...1.0)', interpretation: 'Аэродинамическое совершенство формы крыла. Для эллиптического крыла $e = 1.0$.' },
        { name: 'Эпюра $c_l(y) \\cdot c(y)$', unit: 'График', interpretation: 'Сравнение фактической циркуляции с теоретической эллиптической кривой Прандтля.' },
      ],
    },
    mathematics: {
      governingEquationLatex: '\\mathbf{A} \\vec{\\Gamma} = \\vec{b}, \\quad A_{ij} = \\vec{v}_{ind, ij} \\cdot \\vec{n}_i, \\quad b_i = -\\vec{V}_\\infty \\cdot \\vec{n}_i, \\quad C_{Di} = \\frac{C_L^2}{\\pi AR e}',
      description: 'Решение уравнения Лапласа $\\nabla^2 \\Phi = 0$ через дискретизацию срединной поверхности крыла на вихревые четырехугольные панели.',
      derivationSteps: [
        'Размещение присоединенного вихря: на $1/4$ местной хорды панели ($x_{1/4}$).',
        'Размещение контрольной точки (collocation point): на $3/4$ местной хорды ($x_{3/4}$, $y_{mid}$), где ставится граничное условие непротекания $(\\vec{V}_\\infty + \\vec{v}_{ind}) \\cdot \\vec{n} = 0$.',
        'Индуцированная скорость от отрезка вихря (Закон Био-Савара): $\\vec{v} = \\frac{\\Gamma}{4\\pi} \\frac{\\vec{r}_1 \\times \\vec{r}_2}{|\\vec{r}_1 \\times \\vec{r}_2|^2} \\left[ \\vec{r}_0 \\cdot \\left(\\frac{\\vec{r}_1}{r_1} - \\frac{\\vec{r}_2}{r_2}\\right) \\right]$.',
        'Свободные вихревые нити: продолжаются от концов присоединенного вихря в бесконечность по направлению потока $+X$.',
        'Теорема Жуковского: вычисление локальной силы $\\Delta \\vec{F}_i = \\rho_\\infty \\vec{V}_\\infty \\times \\vec{\\Gamma}_i \\Delta \\vec{l}_i$.',
      ],
      boundaryConditions: [
        'Граничное условие непротекания: $\\vec{v}_{total} \\cdot \\vec{n} = 0$ в каждой контрольной точке.',
        'Условие Кутты-Жуковского: сход вихревой пелены с задней кромки крыла.',
      ],
    },
    physicalSignificance: [
      'Теорема Прандтля: минимум индуктивного сопротивления достигается при эллиптическом законе циркуляции $\\Gamma(y) = \\Gamma_0 \\sqrt{1 - (2y/b)^2}$ и постоянном скосе $w(y) = \\text{const}$.',
      'Геометрическая крутка (washout) позволяет избежать преждевременного концевого срыва крыла при маневрах и сваливании, сохраняя управляемость по элеронам.',
    ],
    references: [
      { authors: 'Katz, J., & Plotkin, A.', year: '2001', title: 'Low-Speed Aerodynamics: From Wing Theory to Panel Methods', publisher: 'Cambridge University Press' },
      { authors: 'Bertin, J. J., & Cummings, R. M.', year: '2013', title: 'Aerodynamics for Engineers (6th Edition)', publisher: 'Pearson' },
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
    engineeringWorkflow: {
      title: 'Инструкция по Мониторингу Сходимости и Сил',
      goal: 'Контролировать падение невязок решателя в реальном времени и оценивать векторную розу сил.',
      steps: [
        {
          stepNumber: 1,
          title: 'Запуск итерационного процесса',
          action: 'Нажмите зеленую кнопку «Запустить CFD Солвер».',
          uiTarget: 'Кнопка «Запустить CFD Солвер»',
          expectedResult: 'Запуск конвейера AMD $\\to$ AMG $\\to$ GMRES, оживление спарклайнов и графика невязок.',
        },
        {
          stepNumber: 2,
          title: 'Контроль критерия останова',
          action: 'Следите за графиком невязки $||r_k||_2$. Сходимость считается достигнутой при падении ниже $10^{-7}$.',
          uiTarget: 'Табло невязки $||r_k||$ и осциллограф',
          expectedResult: 'Зеленый индикатор завершения сходимости и стабилизация значений $C_L, C_D$.',
        },
        {
          stepNumber: 3,
          title: 'Анализ векторной розы сил',
          action: 'Оцените ориентацию вектора полной аэродинамической силы $|R|$ и угол отклонения от хорды.',
          uiTarget: 'Круговая диаграмма «Векторная Роза Сил»',
          expectedResult: 'Быстрая визуальная проверка направления подъемной силы и величины лобового сопротивления.',
        },
      ],
      pitfallsAndTroubleshooting: [
        {
          issue: 'Спарклайн момента $M_y$ колеблется без затухания',
          resolution: 'Это признак вихревой дорожки Кармана (нестационарного отрыва). Переключите солвер в нестационарный режим (Unsteady) с меньшим шагом по времени.',
        },
      ],
      bestPractices: [
        'Всегда используйте предобуславливатель AMG V-Cycle для плотных сеток ($>1000$ ячеек): он ускоряет время сходимости в 4-7 раз по сравнению с классическим ILU(0).',
      ],
    },
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
    engineeringWorkflow: {
      title: 'Инструкция по Работе в Виртуальной Аэродинамической Трубе',
      goal: 'Исследовать структуру поля давлений, форму скачков уплотнения и эпюру $C_p(x/c)$ вдоль хорды профиля.',
      steps: [
        {
          stepNumber: 1,
          title: 'Конфигурация параметров полета в стандартной атмосфере (ISA)',
          action: 'Задайте высоту $H$ слайдером (0 - 20 000 м) и число Маха $M$.',
          uiTarget: 'Слайдер «Высота полета H» и «Число Маха»',
          expectedResult: 'Автоматический пересчет плотности $\\rho(H)$, давления $p(H)$ и скорости звука $a(H)$.',
        },
        {
          stepNumber: 2,
          title: 'Управление визуальными слоями',
          action: 'Включайте и отключайте чекбоксы «Линии тока», «Изобары», «Пограничный слой» и «Скачки волн».',
          uiTarget: 'Панель переключателей слоев',
          expectedResult: 'Послойное отображение вихрей, линий тока и сверхзвуковых конусов Маха $\\mu = \\arcsin(1/M)$.',
        },
        {
          stepNumber: 3,
          title: 'Интегрирование эпюры $C_p(x/c)$',
          action: 'Оцените площадь между верхней и нижней кривыми $C_p$ на 2D графике.',
          uiTarget: 'Нижний график эпюры $C_p$',
          expectedResult: 'Наглядное подтверждение подъемной силы $C_L = \\oint C_p d(x/c)$.',
        },
      ],
      pitfallsAndTroubleshooting: [
        {
          issue: 'При $M > 1$ исчезают линии тока перед профилем',
          resolution: 'При сверхзвуке возмущения не распространяются навстречу потоку; перед телом формируется головной скачок уплотнения (Bow Shock Wave), что полностью соответствует физике газодинамики.',
        },
      ],
      bestPractices: [
        'Для визуализации ламинарно-турбулентного перехода активируйте слой «Пограничный слой» совместно со шкалой градиента Schlieren.',
      ],
    },
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
    engineeringWorkflow: {
      title: 'Инструкция по Анализу Аэроупругой Устойчивости (Флаттера)',
      goal: 'Рассчитать критическую скорость $V_{\\text{flutter}}$ и оптимизировать центровку и жесткость кессона для предотвращения автоколебаний.',
      steps: [
        {
          stepNumber: 1,
          title: 'Определение базовой скорости потока',
          action: 'Плавно повышайте слайдер скорости потока $V$ от 100 до 350 м/с.',
          uiTarget: 'Слайдер «Скорость потока V»',
          expectedResult: 'Наблюдение за изменением затухания фазовой траектории $(h, \\dot{h})$ на фазовом портрете.',
        },
        {
          stepNumber: 2,
          title: 'Фиксация порога неустойчивости',
          action: 'Следите за индикатором режима. Переход индикатора из зеленого в красный цвет означает превышение $V > V_{\\text{flutter}}$.',
          uiTarget: 'Индикатор Режима Флаттера',
          expectedResult: 'Возникновение незатухающих предельных циклов автоколебаний с фазовым сдвигом между изгибом $h$ и кручением $\\theta$.',
        },
        {
          stepNumber: 3,
          title: 'Парирование флаттера весовой балансировкой',
          action: 'Сместите центр масс $x_{\\text{cg}}$ вперед (ближе к передней кромке) и увеличьте крутильную жесткость кессона $K_\\theta$.',
          uiTarget: 'Слайдеры $x_{\\text{cg}}$ и $K_\\theta$',
          expectedResult: 'Резкий рост критической скорости $V_{\\text{flutter}}$ на 40-70% и возврат системы в устойчивое состояние.',
        },
      ],
      pitfallsAndTroubleshooting: [
        {
          issue: 'Разрушение конструкции при малых скоростях ($V < 150$ м/с)',
          resolution: 'Проверьте положение центра масс $x_{\\text{cg}}$: если он смещен назад за ось жесткости ($x_{\\text{cg}} > x_{\\text{ea}}$), крыло становится аэроупруго неустойчивым.',
        },
      ],
      bestPractices: [
        'Всегда обеспечивайте нормативный запас по флаттеру: максимальная скорость пикирования $V_{NE}$ самолета должна быть не более $0.85 \\cdot V_{\\text{flutter}}$.',
      ],
    },
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
    engineeringWorkflow: {
      title: 'Инструкция по Моделированию Динамики Полета 6-DoF',
      goal: 'Провести численное интегрирование маневров летательного аппарата с контролем углов Эйлера и устойчивости.',
      steps: [
        {
          stepNumber: 1,
          title: 'Установка исходного триммированного состояния',
          action: 'Задайте начальную тягу $T$ и скорость полета для достижения горизонтального полета $L = mg$.',
          uiTarget: 'Слайдер «Тяга двигателей»',
          expectedResult: 'Стабилизация вертикальной скорости $\\dot{z} \\approx 0$ и тангажа $\\theta$.',
        },
        {
          stepNumber: 2,
          title: 'Выполнение маневра органами управления',
          action: 'Отклоните руль высоты $\\delta_e$ для кабрирования или элероны $\\delta_a$ для ввода в крен.',
          uiTarget: 'Слайдеры отклонения рулей $\\delta_e, \\delta_a, \\delta_r$',
          expectedResult: 'Генерация аэродинамических моментов $(L, M, N)$ и отклик угловых скоростей $(p, q, r)$.',
        },
        {
          stepNumber: 3,
          title: 'Мониторинг кватерниона ориентации',
          action: 'Наблюдайте за вектором кватерниона $\\mathbf{q} = [q_0, q_1, q_2, q_3]^T$ в реальном времени.',
          uiTarget: 'Телеметрическая панель кватернионов',
          expectedResult: 'Полная непрерывность ориентации без вырождения при вертикальном наборе высоты $\\theta = 90^\\circ$.',
        },
      ],
      pitfallsAndTroubleshooting: [
        {
          issue: 'Раскрутка по крену и рысканию на околозвуковых скоростях',
          resolution: 'Проверьте влияние инерционной связи $(I_{yy} - I_{zz})qr$. Увеличьте демпфирование по рысканию $C_{nr}$ отклонением руля направления.',
        },
      ],
      bestPractices: [
        'Всегда используйте кватернионное интегрирование вместо классических углов Эйлера для предотвращения кинематического заклинивания (Gimbal Lock).',
      ],
    },
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
    engineeringWorkflow: {
      title: 'Инструкция по Оптимизации Линейного Решателя',
      goal: 'Настроить многосеточный предобуславливатель и Крыловское подпространство для максимальной скорости сходимости.',
      steps: [
        {
          stepNumber: 1,
          title: 'Выбор топологической перенумерации',
          action: 'Установите алгоритм AMD (Approximate Minimum Degree) для минимизации заполнения (fill-in) матрицы при факторизации.',
          uiTarget: 'Селектор «Алгоритм перенумерации»',
          expectedResult: 'Сужение профиля разреженной матрицы и снижение расхода оперативной памяти.',
        },
        {
          stepNumber: 2,
          title: 'Настройка V-цикла AMG',
          action: 'Задайте глубину уровней AMG (2 - 4 уровня) и число сглаживаний Гаусса-Зейделя на уровень.',
          uiTarget: 'Слайдер «Число уровней AMG»',
          expectedResult: 'Эффективное гашение как высокочастотных, так и длинноволновых компонент погрешности.',
        },
        {
          stepNumber: 3,
          title: 'Контроль размерности рестарта GMRES(m)',
          action: 'Установите $m = 30$ векторов Арнольди.',
          uiTarget: 'Селектор $m$ Krylov Subspace',
          expectedResult: 'Баланс между скоростью минимизации невязки и затратами памяти на хранение базисных векторов.',
        },
      ],
      pitfallsAndTroubleshooting: [
        {
          issue: 'GMRES зацикливается (стагнация невязки)',
          resolution: 'Увеличьте число уровней AMG или переключите алгоритм ортогонализации на MGS (Modified Gram-Schmidt).',
        },
      ],
      bestPractices: [
        'Для сильно анизотропных сеток используйте агрегацию с направленным огрублением по линиям максимальной связи.',
      ],
    },
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
    engineeringWorkflow: {
      title: 'Инструкция по Расчету Межпланетного Маневра и Навигации',
      goal: 'Рассчитать оптимальный трансфер Ламберта между орбитами и оценить фильтрацию зашумленных телеметрических данных.',
      steps: [
        {
          stepNumber: 1,
          title: 'Постановка двухточечной краевой задачи',
          action: 'Задайте радиусы начальной и конечной орбит ($r_1, r_2$) и желаемое время перелета $\\Delta t$.',
          uiTarget: 'Слайдеры орбитальных радиусов и времени $\\Delta t$',
          expectedResult: 'Численное нахождение большой полуоси $a$ и вывод импульсов $\\Delta V_1, \\Delta V_2$.',
        },
        {
          stepNumber: 2,
          title: 'Оценка теплозащиты при гиперзвуковом входе',
          action: 'Ознакомьтесь с показателем теплового потока Фэя-Ридделла $\\dot{q}$.',
          uiTarget: 'Табло «Тепловой поток Фэя-Ридделла»',
          expectedResult: 'Определение пикового теплового режима для выбора абляционного материала экрана.',
        },
        {
          stepNumber: 3,
          title: 'Фильтрация шума датчиков (EKF)',
          action: 'Увеличьте уровень шума $\\mathbf{R}$ и наблюдайте за сходимостью ковариационной матрицы $\\mathbf{P}$.',
          uiTarget: 'Слайдер шума $\\mathbf{R}$ и график Калмана',
          expectedResult: 'Восстановление истинной траектории космического аппарата с точностью до миллиметров.',
        },
      ],
      pitfallsAndTroubleshooting: [
        {
          issue: 'Уравнение Ламберта расходится при $\\Delta t$, близком к полупериоду',
          resolution: 'Это особая точка 180-градусного трансфера. Скорректируйте время перелета на $\\pm 2$ часа для обхода сингулярности плоскости.',
        },
      ],
      bestPractices: [
        'Используйте гравитационные маневры (Gravity Assist) у промежуточных планет для снижения суммарного характеристического импульса $\\Delta V$.',
      ],
    },
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
    engineeringWorkflow: {
      title: 'Инструкция по Проектированию Радиационно-Стойкой Авионики',
      goal: 'Рассчитать задержки сигналов на кристалле и обеспечить 99.999% надежность БЦВМ при космическом облучении.',
      steps: [
        {
          stepNumber: 1,
          title: 'Анализ задержки распространения импульса (Elmore Timing)',
          action: 'Задайте длину межсоединения $L$ и сопротивление драйвера.',
          uiTarget: 'Слайдер «Длина межсоединения L»',
          expectedResult: 'Расчет задержки Элмора $\\tau_D$ и контроль тактовой частоты кристалла.',
        },
        {
          stepNumber: 2,
          title: 'Моделирование радиационного потока тяжелых ионов',
          action: 'Увеличьте интенсивность радиационного потока (Flux) для генерации случайных битовых сбоев (SEU).',
          uiTarget: 'Слайдер «Поток тяжелых ионов (Flux)»',
          expectedResult: 'Отображение единичных сбоев в регистрах процессора.',
        },
        {
          stepNumber: 3,
          title: 'Активация мажоритарного резервирования TMR',
          action: 'Переключите режим на «TMR с самовосстановлением (Triple Modular Redundancy)».',
          uiTarget: 'Селектор «Режим резервирования»',
          expectedResult: 'Мгновенное мажоритарное исправление битовых ошибок ($2$ из $3$) без остановки вычислительного конвейера.',
        },
      ],
      pitfallsAndTroubleshooting: [
        {
          issue: 'Появление множественных сбоев (MBU) в соседних ячейках',
          resolution: 'Используйте пространственное разделение ячеек (Bit Interleaving) в сочетании с кодами Хэмминга / Рида-Соломона (ECC).',
        },
      ],
      bestPractices: [
        'Для сигналов синхронизации (Clock Tree) всегда применяйте экранированные шины и буферные повторители через каждые $500\\,\\mu\\text{m}$ для снижения джиттера.',
      ],
    },
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

export const PARAMETER_DECODER_ITEMS: ParameterDecoderItem[] = [
  // --- Входные параметры ---
  {
    id: 'input_alpha',
    name: 'Угол атаки',
    symbolLatex: '\\alpha',
    category: 'input',
    categoryName: 'Входные Параметры',
    location: 'Монитор Сил, Аэротруба, VLM крыло (Слайдер)',
    meaning: 'Угол между хордой аэродинамического профиля / строительной осью крыла и вектором скорости набегающего потока $V_\\infty$.',
    howToConfigure: 'Для крейсерского полета задавайте $2^\\circ...5^\\circ$. Срыв потока (Stall) наступает при $\\alpha > 12^\\circ...16^\\circ$.',
    howToObtain: 'Перемещайте ползунок $\\alpha$ в окне «Монитор Сил» или «Аэротруба» $\\to$ значение передается в решатель сетки FVM в реальном времени.',
    badge: 'Диапазон: -10° ... +25°',
  },
  {
    id: 'input_mach',
    name: 'Число Маха',
    symbolLatex: 'M = V / a',
    category: 'input',
    categoryName: 'Входные Параметры',
    location: 'Монитор Сил, Пресеты, Расширенные Солверы (Слайдер)',
    meaning: 'Отношение истинной скорости полета к местной скорости звука в атмосфере.',
    howToConfigure: '$M < 0.7$ — несжимаемый дозвук; $0.75 \\le M \\le 1.15$ — трансзвуковой режим с местными скачками; $M > 1.2$ — сверхзвук.',
    howToObtain: 'Установите желаемое число $M$ ползунком $\\to$ в 3D Лаборатории появится сверхзвуковой карман и конус Маха $\\mu = \\arcsin(1/M)$.',
    badge: 'Диапазон: M = 0.05 ... 3.50',
  },
  {
    id: 'input_altitude',
    name: 'Высота полета в атмосфере ISA',
    symbolLatex: 'H \\quad (\\text{км})',
    category: 'input',
    categoryName: 'Входные Параметры',
    location: 'Монитор Сил, 6-DoF Полет (Слайдер)',
    meaning: 'Геопотенциальная высота в Международной Стандартной Атмосфере (ГОСТ 4401-81 / ICAO).',
    howToConfigure: 'Уровень моря: $H=0$ км ($\\rho=1.225$ кг/м³); Крейсерская высота лайнера: $H=10...12$ км; Стратосфера: $H > 20$ км.',
    howToObtain: 'Слайдер пересчитывает барометрическое давление $p(H)$, плотность $\\rho(H)$ и динамическую вязкость $\\mu(T)$ для вычисления $Re$.',
    badge: 'Диапазон: 0 ... 30 км',
  },
  {
    id: 'input_cfl',
    name: 'Число Куранта-Фридрихса-Леви',
    symbolLatex: 'CFL = \\frac{u \\Delta t}{\\Delta x}',
    category: 'input',
    categoryName: 'Входные Параметры',
    location: 'Расширенные Солверы (Слайдер)',
    meaning: 'Безразмерный критерий устойчивости численной схемы, определяющий, сколько ячеек сетки информация пересекает за один временной шаг $\\Delta t$.',
    howToConfigure: 'Для явных схем (Explicit RK4) строго держите $CFL \\le 1.0$. Для неявных предобусловленных схем (LUSGS, GMRES) задавайте $CFL = 5.0...20.0$.',
    howToObtain: 'Увеличивайте $CFL$ во вкладке солверов для ускорения сходимости. Если невязка начинает расти (NaN/Inf), снизьте $CFL$.',
    badge: 'Критерий устойчивости',
  },
  {
    id: 'input_yplus',
    name: 'Параметр пристеночной сетки',
    symbolLatex: 'y^+ = \\frac{y u_\\tau}{\\nu}',
    category: 'input',
    categoryName: 'Входные Параметры',
    location: 'Расширенные Солверы (Слайдер/Селектор)',
    meaning: 'Безразмерное расстояние от стенки профиля до первого узла сетки. Определяет разрешение вязкого подслоя.',
    howToConfigure: 'Для прямого разрешения вязкого подслоя в моделях $k$-$\\omega$ SST цель: $y^+ \\le 1.0$. Для пристеночных функций (Wall Functions): $y^+ \\in [30, 300]$.',
    howToObtain: 'В блоке «Расширенные солверы» выберите тип пристеночной функции $\\to$ сетка автоматически скорректирует толщину первого слоя $\\Delta y_1$.',
    badge: 'Турбулентный подслой',
  },
  {
    id: 'input_flutter_stiffness',
    name: 'Крутильная жесткость крыла',
    symbolLatex: 'K_\\theta \\quad (\\text{кН}\\cdot\\text{м/рад})',
    category: 'input',
    categoryName: 'Входные Параметры',
    location: 'Аэроупругость & Флаттер (Слайдер)',
    meaning: 'Жесткость упругой связи профиля крыла на кручение относительно оси жесткости $x_f$.',
    howToConfigure: 'Уменьшение $K_\\theta$ снижает критическую скорость флаттера $V_{\\text{flutter}}$, приводя к автоколебаниям на меньших скоростях.',
    howToObtain: 'Регулируйте ползунок $K_\\theta$ во вкладке Флаттера $\\to$ смотрите сдвиг собственных частот $\\omega_h, \\omega_\\theta$ на диаграмме $V-g$.',
    badge: 'Аэроупругая жесткость',
  },
  {
    id: 'input_cg_pos',
    name: 'Центровка (Положение Ц.М.)',
    symbolLatex: 'x_{cg} / c',
    category: 'input',
    categoryName: 'Входные Параметры',
    location: '6-DoF Динамика & Балансировка (Слайдер)',
    meaning: 'Положение центра тяжести летательного аппарата относительно начала САХ (средней аэродинамической хорды).',
    howToConfigure: 'Передняя центровка ($x_{cg} < 0.25c$) дает высокую статическую устойчивость ($dC_m/d\\alpha < 0$), но требует отклонения рулей. Задняя ($>0.30c$) — маневренность, но риск неустойчивости.',
    howToObtain: 'Изменяйте $x_{cg}$ во вкладке «6-DoF Полет» $\\to$ индикатор продольного запаса устойчивости $\\Delta x_{\\text{sm}}$ изменит цвет с зеленого на красный.',
    badge: 'Устойчивость и центровка',
  },
  {
    id: 'input_ion_flux',
    name: 'Поток тяжелых ионов космоса',
    symbolLatex: '\\Phi_{\\text{ion}} \\quad (\\text{ион}/\\text{см}^2\\cdot\\text{с})',
    category: 'input',
    categoryName: 'Входные Параметры',
    location: 'Микроэлектроника & EDA (Слайдер)',
    meaning: 'Плотность потока галактических космических лучей (ГКЛ) и протонов радиационных поясов Земли (Van Allen Belts).',
    howToConfigure: 'Фоновая орбита: $10^2 - 10^3$; Солнечная вспышка (SPE): $10^5 - 10^7$ ион/см²·с.',
    howToObtain: 'Двигайте ползунок потока $\\to$ график генерации сбоев SEU покажет частоту переворота бит в памяти бортового процессора.',
    badge: 'Радиационная стойкость',
  },

  // --- Выходные аэродинамические метрики ---
  {
    id: 'out_cl',
    name: 'Коэффициент подъемной силы',
    symbolLatex: 'C_L = \\frac{L}{\\frac{1}{2}\\rho V_\\infty^2 S}',
    category: 'aero_output',
    categoryName: 'Выходные Метрики',
    location: 'Монитор Сил, 3D Лаборатория, VLM, PDF-Отчет (Табло)',
    meaning: 'Безразмерный коэффициент, определяющий полную подъемную силу $L$, действующую перпендикулярно вектору набегающего потока.',
    howToConfigure: 'Зависит от угла $\\alpha$, кривизны профиля и числа Маха $M$. Для NACA 0012 $C_{L\\alpha} \\approx 2\\pi$ рад⁻¹ ($0.11$ град⁻¹).',
    howToObtain: 'Нажмите «Запустить CFD Солвер» во вкладке «Монитор Сил» $\\to$ значение $C_L$ отобразится крупным шрифтом на зеленом табло и в таблице поляр.',
    badge: 'Ключевая несущая метрика',
  },
  {
    id: 'out_cd',
    name: 'Коэффициент полного сопротивления',
    symbolLatex: 'C_D = C_{D0} + C_{Dw} + C_{Di}',
    category: 'aero_output',
    categoryName: 'Выходные Метрики',
    location: 'Монитор Сил, 3D Лаборатория, VLM (Табло)',
    meaning: 'Безразмерная аэродинамическая сила торможения потока, складывающаяся из профильного трения, волнового скачка и индуктивного скоса.',
    howToConfigure: 'Для гладкого профиля NACA 0012 на $M=0.3$ минимальное $C_{D0} \\approx 0.008$. При трансзвуковом скачке $C_D$ резко возрастает в 3-8 раз.',
    howToObtain: 'Вычисляется интегралом давления и касательных напряжений $\\oint (C_p \\mathbf{n} + c_f \\mathbf{t}) \\cdot \\mathbf{i}_\\infty ds$.',
    badge: 'Лобовое сопротивление',
  },
  {
    id: 'out_ld',
    name: 'Аэродинамическое качество',
    symbolLatex: 'K = L / D = C_L / C_D',
    category: 'aero_output',
    categoryName: 'Выходные Метрики',
    location: 'Монитор Сил, Пресеты NASA, Отчет (Табло)',
    meaning: 'Показывает, сколько единиц подъемной силы создает профиль/крыло на единицу силы лобового сопротивления.',
    howToConfigure: 'Высокое качество $K=18...24$ достигается при углах атаки наивыгоднейшего режима $\\alpha = 3^\\circ...4^\\circ$.',
    howToObtain: 'Индикатор качества находится рядом с $C_L$ и $C_D$. Поляра $C_L(C_D)$ наглядно показывает точку касания луча максимума $(L/D)_{\\max}$.',
    badge: 'Крейсерская эффективность',
  },
  {
    id: 'out_cm',
    name: 'Коэффициент момента тангажа',
    symbolLatex: 'C_m = \\frac{M_z}{\\frac{1}{2}\\rho V_\\infty^2 S c}',
    category: 'aero_output',
    categoryName: 'Выходные Метрики',
    location: 'Монитор Сил, 6-DoF Полет (Табло)',
    meaning: 'Момент вокруг поперечной оси $Z$, приложенный в точке фокуса $0.25c$. Отрицательный момент стремится опустить нос аппарата (пикирование).',
    howToConfigure: 'Для продольной статической устойчивости производная должна быть отрицательной: $\\frac{\\partial C_m}{\\partial \\alpha} < 0$.',
    howToObtain: 'Отображается на табло в «Мониторе Сил». При смене угла $\\alpha$ следите за знаком $C_m$.',
    badge: 'Продольная балансировка',
  },
  {
    id: 'out_cp',
    name: 'Эпюра распределения давления',
    symbolLatex: 'C_p(x/c) = \\frac{p - p_\\infty}{\\frac{1}{2}\\rho V_\\infty^2}',
    category: 'aero_output',
    categoryName: 'Выходные Метрики',
    location: 'Монитор Сил, 3D Лаборатория (Интерактивный График)',
    meaning: 'График распределения местного статического давления вдоль хорды профиля от передней кромки $x/c=0$ до задней $x/c=1$.',
    howToConfigure: 'Верхняя ветвь (отрицательные $C_p$) — разрежение на спинке (создает подъемную силу); нижняя (положительные $C_p$) — подпор на корыте.',
    howToObtain: 'График $C_p$ рисуется автоматически в нижней половине «Монитора Сил». Площадь между верхней и нижней кривыми в точности равна $C_L$.',
    badge: 'Эпюра давлений по хорде',
  },
  {
    id: 'out_residual',
    name: 'L2 Невязка Решателя FVM',
    symbolLatex: '\\|r_k\\|_2 = \\sqrt{\\sum r_i^2}',
    category: 'aero_output',
    categoryName: 'Выходные Метрики',
    location: 'Монитор Сходимости & Расширенные Солверы (Спарклайн)',
    meaning: 'Количественная мера ошибки дискретизации и выполнения законов сохранения массы и импульса на текущей итерации.',
    howToConfigure: 'Сходимость считается строгой при $\\|r_k\\|_2 < 10^{-6}...10^{-7}$. Зеленый спарклайн указывает на идеальное решение.',
    howToObtain: 'Смотрите окно «Сходимость и Невязка» во время итераций GMRES/LUSGS. График в логарифмической шкале $\\log_{10}(\\|r\\|)$ падает вниз.',
    badge: 'Точность и сходимость',
  },

  // --- 3D Инструменты ---
  {
    id: 'v3d_cutplane',
    name: 'Секущие Плоскости (Cut Planes)',
    symbolLatex: '\\Pi_{XY}, \\Pi_{YZ}, \\Pi_{XZ}',
    category: 'visual_3d',
    categoryName: '3D Инструменты',
    location: '3D Визуальная Лаборатория (Тумблеры + Слайдеры координат)',
    meaning: 'Ортогональные сечения трехмерного векторного поля течения с интерполяцией локальных чисел Маха, давления $p$ или завихренности $\\omega$.',
    howToConfigure: 'Активируйте тумблер плоскости и перемещайте ползунок координаты (например, срез по размаху $Z/b$ или по хорде $X/c$).',
    howToObtain: 'Перейдите во вкладку «3D Лаборатория» $\\to$ включите «Секущая плоскость XZ» $\\to$ на срезе крыла появится цветовая карта Маха с замыкающим скачком.',
    badge: '3D Анализ поля',
  },
  {
    id: 'v3d_qcriterion',
    name: 'Изоповерхности Q-критерия вихрей',
    symbolLatex: 'Q = \\frac{1}{2}(\\|\\mathbf{\\Omega}\\|^2 - \\|\\mathbf{S}\\|^2) > 0',
    category: 'visual_3d',
    categoryName: '3D Инструменты',
    location: '3D Лаборатория, VLM Крыло (Тумблер + Слайдер порога Q)',
    meaning: 'Метод локализации пространственных вихревых ядер (Hunt et al.), выделяющий области, где вращение тензора деформаций доминирует над сдвигом.',
    howToConfigure: 'Включите тумблер «Q-критерий вихрей». Регулируйте порог $Q_{\\text{iso}}$ для фильтрации мелких турбулентных структур.',
    howToObtain: 'Позволяет четко увидеть сходящие с законцовок крыла вихревые жгуты (Wingtip Vortices) и вихри отрыва передней кромки (LEX/Strake).',
    badge: 'Вихревые трубки',
  },
  {
    id: 'v3d_streamlines',
    name: 'Лагранжевы Дымовые Линии Тока',
    symbolLatex: '\\frac{d\\mathbf{x}_p}{dt} = \\mathbf{u}(\\mathbf{x}_p, t)',
    category: 'visual_3d',
    categoryName: '3D Инструменты',
    location: '3D Лаборатория (Тумблер «Дымовые струи»)',
    meaning: 'Траектории безынерционных частиц дыма, выпускаемых из виртуального гребня генераторов перед крылом.',
    howToConfigure: 'Тумблер включает анимированный пучок цветных трассеров, искривляющихся в поле градиента давлений.',
    howToObtain: 'Наглядно показывает скос потока (Downwash) за задней кромкой и перетекание воздуха с нижней поверхности крыла на верхнюю на законцовках.',
    badge: 'Дымовая визуализация',
  },
  {
    id: 'v3d_ab_compare',
    name: 'A/B Компаратор Режимов',
    symbolLatex: '\\Delta = \\text{Mode A} - \\text{Mode B}',
    category: 'visual_3d',
    categoryName: '3D Инструменты',
    location: '3D Лаборатория (Тумблер «A/B Сравнение»)',
    meaning: 'Сплит-экран (Split-View) для одновременного визуального сопоставления двух различных конфигураций (например, дозвук $M=0.3$ против трансзвука $M=0.82$).',
    howToConfigure: 'Включите тумблер A/B $\\to$ задайте параметры для левого и правого окон $\\to$ проведите разделитель сплит-экрана.',
    howToObtain: 'Позволяет визуально сопоставить положение скачка уплотнения и толщину пограничного слоя в двух разных режимах.',
    badge: 'Сравнительный анализ',
  },

  // --- Космос и Навигация ---
  {
    id: 'space_deltav',
    name: 'Характеристическая скорость',
    symbolLatex: '\\Delta V = I_{\\text{sp}} g_0 \\ln\\left(\\frac{m_0}{m_f}\\right)',
    category: 'space',
    categoryName: 'Космос & GNC',
    location: 'Космонавтика & GNC -> Перелет Ламбера (Табло)',
    meaning: 'Полный запас характеристической скорости, требуемый для маневров перелета с начальной орбиты на целевую.',
    howToConfigure: 'Задайте начальную высоту орбиты $r_1$, целевую $r_2$ и длительность перелета $\\Delta t$ $\\to$ решатель Ламбера оптимизирует импульсы $\\Delta V_1, \\Delta V_2$.',
    howToObtain: 'Смотрите итоговый бюджет $\\Delta V_{\\text{total}}$ на карточке маневра. Сравнивайте его с запасом топлива на борту.',
    badge: 'Формула Циолковского',
  },
  {
    id: 'space_heatflux',
    name: 'Пиковый тепловой поток входа',
    symbolLatex: '\\dot{q} = \\frac{C}{\\sqrt{R_N}} \\left(\\frac{\\rho}{\\rho_0}\\right)^{0.5} \\left(\\frac{V}{10^4}\\right)^{3.05}',
    category: 'space',
    categoryName: 'Космос & GNC',
    location: 'Космонавтика & GNC -> Гиперзвуковой вход (Табло & График)',
    meaning: 'Конвективный тепловой поток в критической точке затупленного носка космического аппарата при спуске в атмосфере (модель Фэя-Ридделла).',
    howToConfigure: 'Увеличение радиуса затупления $R_N$ снижает удельный тепловой поток за счет отжатия ударной волны.',
    howToObtain: 'График $\\dot{q}(t)$ и суммарной дозы тепла $Q_{\\text{total}}$ строится вдоль всей баллистической траектории спуска.',
    badge: 'Теплозащита ТЗП',
  },
  {
    id: 'space_ekf',
    name: 'Оценка Расширенного Фильтра Калмана',
    symbolLatex: '\\hat{\\mathbf{x}}_{k|k} = \\hat{\\mathbf{x}}_{k|k-1} + \\mathbf{K}_k (\\mathbf{z}_k - h(\\hat{\\mathbf{x}}_{k|k-1}))',
    category: 'space',
    categoryName: 'Космос & GNC',
    location: 'Космонавтика & GNC -> Фильтр EKF (График траектории)',
    meaning: 'Оптимальная статистическая оценка истинного вектора состояния (координаты, скорости, углы) по зашумленным измерениям датчиков IMU/GPS.',
    howToConfigure: 'Задайте дисперсии шума процесса $\\mathbf{Q}$ и шума измерений $\\mathbf{R}$.',
    howToObtain: 'График сравнивает истинную траекторию (синяя линия), зашумленные замеры (красные точки) и сглаженную оценку EKF (зеленая линия).',
    badge: 'Навигационная фильтрация',
  },

  // --- Микроэлектроника & EDA ---
  {
    id: 'eda_elmore',
    name: 'Задержка Элмора по RC-цепи',
    symbolLatex: '\\tau_D = \\sum_{k} R_k \\sum_{j \\in \\text{Downstream}(k)} C_j',
    category: 'eda',
    categoryName: 'Микроэлектроника',
    location: 'Микроэлектроника & EDA -> Топология RC (Табло)',
    meaning: 'Аналитическая оценка времени задержки распространения фронта логического сигнала по распределенной шине межсоединений кристалла СБИС.',
    howToConfigure: 'Зависит от ширины проводника $w$, шага металлизации и длины линии $L$. Применение буферов (Repeater Insertion) снижает квадратичный рост $\\mathcal{O}(L^2)$ до линейного.',
    howToObtain: 'Табло задержки в пикосекундах (пкс) пересчитывается при изменении длины шины и сопротивления металлизации.',
    badge: 'Тайминг СБИС',
  },
  {
    id: 'eda_tmr',
    name: 'Надежность Мажоритарного Канала TMR',
    symbolLatex: 'R_{\\text{TMR}}(t) = 3 R(t)^2 - 2 R(t)^3',
    category: 'eda',
    categoryName: 'Микроэлектроника',
    location: 'Микроэлектроника & EDA -> Радиационная Стойкость (Индикатор)',
    meaning: 'Вероятность безотказной работы вычислительного ядра с тройным модульным резервированием (Triple Modular Redundancy) и схемой голосования 2-из-3.',
    howToConfigure: 'Включите переключатель «Активировать TMR» для парирования одиночных сбоев SEU (Single Event Upsets) от тяжелых ионов.',
    howToObtain: 'При попадании иона индикатор покажет фиксацию ошибки в поврежденном канале и ее мгновенное мажоритарное исправление на выходе.',
    badge: 'Отказоустойчивость БЦВМ',
  },
];

export const SOP_RECIPES: SOPRecipe[] = [
  {
    id: 'recipe_aero_forces',
    title: 'Рецепт 1: Расчет Поляр и Несущих Свойств Профиля (C_L, C_D, C_m)',
    tag: 'Аэродинамика & CFD',
    targetDomain: 'CFD & Аэро',
    goal: 'Получить точные значения подъемной силы, сопротивления, качества и эпюры распределения давления для заданного профиля и режима полета.',
    estimatedTime: '1 минута',
    steps: [
      {
        stepNumber: 1,
        title: 'Выбор геометрии профиля',
        description: 'Перейдите во вкладку «Пресеты NASA» и выберите нужный профиль (например, NACA 0012 для вертолетной лопасти/руля или NASA SC(2)-0714 для крейсерского лайнера). Нажмите «Применить Пресет».',
        whereToClick: 'Вкладка «Пресеты NASA» -> Карточка профиля -> Кнопка «Применить»',
        expectedOutcome: 'Параметры профиля переносятся в солвер, автоматически открывается окно «Монитор Сил».',
      },
      {
        stepNumber: 2,
        title: 'Установка кинематики полета',
        description: 'С помощью ползунков задайте угол атаки $\\alpha = 4^\\circ$, крейсерское число Маха $M = 0.78$ и высоту полета $H = 11$ км.',
        whereToClick: 'Монитор Сил -> Панель параметров потока',
        expectedOutcome: 'Пересчет плотности воздуха $\\rho(H)$, скорости звука $a(H)$ и числа Рейнольдса $Re$.',
      },
      {
        stepNumber: 3,
        title: 'Запуск FVM CFD Солвера',
        description: 'Нажмите кнопку «Запустить Расчет». Следите за индикатором сходимости невязок.',
        whereToClick: 'Монитор Сил -> Большая синяя кнопка «Запустить Расчет»',
        expectedOutcome: 'Невязка $\|r_k\|_2$ падает ниже $10^{-7}$, на табло появляются $C_L$, $C_D$, $C_m$, строится эпюра давлений $C_p(x/c)$.',
      },
    ],
    proTip: 'Для околозвуковых скоростей ($M > 0.75$) сверхкритический профиль NASA SC(2) демонстрирует на 40% меньшее волновое сопротивление $C_{Dw}$ по сравнению с классическим NACA 0012 за счет уплощенной формы спинки.',
  },
  {
    id: 'recipe_3d_vortices',
    title: 'Рецепт 2: Построение и Анализ 3D Вихревого Следа (Q-критерий + Срезы)',
    tag: '3D Визуализация',
    targetDomain: '3D Лаборатория',
    goal: 'Визуализировать трехмерный скос потока, сходящие вихревые жгуты с законцовок крыла и локализовать положение скачка уплотнения в пространстве.',
    estimatedTime: '1.5 минуты',
    steps: [
      {
        stepNumber: 1,
        title: 'Переход в 3D Лабораторию',
        description: 'В блоке вкладок Аэродинамики выберите «3D Визуальная Лаборатория».',
        whereToClick: 'Вкладка «3D Лаборатория»',
        expectedOutcome: 'Инициализация интерактивной сцены Three.js/WebGL с трехмерной геометрией несущей поверхности.',
      },
      {
        stepNumber: 2,
        title: 'Активация изоповерхностей Q-критерия',
        description: 'В панели визуальных слоев справа включите тумблер «Q-критерий вихрей». Ползунком отрегулируйте порог изоповерхности.',
        whereToClick: '3D Лаборатория -> Панель слоев -> Тумблер «Q-критерий»',
        expectedOutcome: 'В пространстве за законцовками крыла формируются закрученные вихревые трубки, окрашенные по градиенту давления.',
      },
      {
        stepNumber: 3,
        title: 'Включение секущей плоскости (Cut Plane)',
        description: 'Включите тумблер «Плоскость XZ» и с помощью слайдера координаты $Z/b$ проведите срез вдоль размаха крыла.',
        whereToClick: '3D Лаборатория -> Секция «Секущие плоскости» -> Слайдер координаты',
        expectedOutcome: 'Отображение двумерного цветового поля местных чисел Маха с резкой границей прямого скачка уплотнения.',
      },
    ],
    proTip: 'Вращайте трехмерную модель зажатой левой кнопкой мыши, используйте колесо мыши для зума и правую кнопку для панорамирования.',
  },
  {
    id: 'recipe_flutter_analysis',
    title: 'Рецепт 3: Поиск Критической Скорости Изгибно-Крутильного Флаттера',
    tag: 'Аэроупругость',
    targetDomain: 'Флаттер & Динамика',
    goal: 'Определить критическую скорость динамической неустойчивости $V_{\\text{flutter}}$ и проверить запас безопасности конструкции крыла.',
    estimatedTime: '2 минуты',
    steps: [
      {
        stepNumber: 1,
        title: 'Открытие модуля Аэроупругости',
        description: 'Переключитесь на вкладку «Аэроупругость & Флаттер».',
        whereToClick: 'Вкладка «Аэроупругость & Флаттер»',
        expectedOutcome: 'Загрузка 2-степенной динамической модели упругого профиля (изгиб $h(t)$ + кручение $\\theta(t)$).',
      },
      {
        stepNumber: 2,
        title: 'Задание жесткостных параметров',
        description: 'Задайте крутильную жесткость $K_\\theta$, изгибную жесткость $K_h$ и расстояние между центром масс и осью жесткости $x_\\alpha$.',
        whereToClick: 'Панель жесткостных параметров флаттера',
        expectedOutcome: 'Вычисление базовых парциальных частот $\\omega_h, \\omega_\\theta$.',
      },
      {
        stepNumber: 3,
        title: 'Свип по скорости и анализ V-g диаграммы',
        description: 'Нажмите «Запустить Свип по Скорости». Следите за точкой слияния частот и моментом, когда коэффициент демпфирования $g$ пересекает ноль снизу вверх.',
        whereToClick: 'Кнопка «Запустить Свип по Скорости»',
        expectedOutcome: 'На диаграмме $V-g$ фиксируется точная скорость $V_{\\text{flutter}}$. Система выдает нормативный запас по скорости $\\eta_{\\text{safe}} = V_{\\text{flutter}} / V_{\\text{cruise}}$.',
      },
    ],
    proTip: 'Смещение центра тяжести вперед перед осью жесткости ($x_\\alpha < 0$) полностью устраняет классический изгибно-крутильный флаттер при любых скоростях.',
  },
  {
    id: 'recipe_6dof_flight',
    title: 'Рецепт 4: Моделирование 6-DoF Полета и Продольной Балансировки',
    tag: 'Динамика Полета',
    targetDomain: 'Флаттер & Динамика',
    goal: 'Провести численную симуляцию пространственного маневрирования ЛА с учетом уравнений Эйлера, тяги двигателей и балансировочных отклонений рулей.',
    estimatedTime: '2 минуты',
    steps: [
      {
        stepNumber: 1,
        title: 'Инициализация 6-DoF симулятора',
        description: 'Перейдите во вкладку «6-DoF Динамика Полета».',
        whereToClick: 'Вкладка «6-DoF Динамика Полета»',
        expectedOutcome: 'Загрузка трехмерного авиагоризонта PFD, графиков углов Эйлера $(\\psi, \\theta, \\gamma)$ и траектории.',
      },
      {
        stepNumber: 2,
        title: 'Отклонение рулей высоты и элеронов',
        description: 'Используйте интерактивный джойстик или слайдеры отклонения руля высоты $\\delta_e$ для ввода самолета в кабрирование/вираж.',
        whereToClick: 'Интерактивный штурвал / Слайдер $\\delta_e$',
        expectedOutcome: 'Интегратор Рунге-Кутты 4-го порядка рассчитывает переходный процесс короткопериодического и фугоидного движения.',
      },
    ],
    proTip: 'Следите за шкалой перегрузки $n_y$. Нормативный предел для пассажирских самолетов составляет $+2.5g / -1.0g$.',
  },
  {
    id: 'recipe_space_lambert',
    title: 'Рецепт 5: Расчет Межпланетного Перелета Ламберта и Входа в Атмосферу',
    tag: 'Космонавтика & GNC',
    targetDomain: 'Космос & GNC',
    goal: 'Рассчитать траекторию трансфера между круговыми орбитами, импульсы $\\Delta V$ и пиковый конвективный тепловой поток ТЗП при гиперзвуковом спуске.',
    estimatedTime: '2.5 минуты',
    steps: [
      {
        stepNumber: 1,
        title: 'Переход в домен Космонавтики',
        description: 'В самом верху приложения нажмите вкладку «Космонавтика & GNC».',
        whereToClick: 'Верхняя панель доменов -> Кнопка «Космонавтика & GNC»',
        expectedOutcome: 'Открытие специализированного космического окружения (орбитальная механика, гиперзвуковой вход, EKF).',
      },
      {
        stepNumber: 2,
        title: 'Решение краевой задачи Ламберта',
        description: 'Задайте радиусы начальной и целевой орбит, нажмите «Рассчитать Трансфер Ламберта».',
        whereToClick: 'Модуль перелета Ламберта -> Кнопка расчета',
        expectedOutcome: 'Построение эллиптической траектории трансфера и расчет импульсов $\\Delta V_1, \\Delta V_2$.',
      },
      {
        stepNumber: 3,
        title: 'Анализ гиперзвукового нагрева ТЗП',
        description: 'В секции «Гиперзвуковой Вход» запустите расчет профиля торможения в атмосфере.',
        whereToClick: 'Секция «Вход в атмосферу» -> Кнопка симуляции',
        expectedOutcome: 'График теплового потока Фэя-Ридделла $\\dot{q}(t)$ и расчет необходимой толщины абляционной теплозащиты.',
      },
    ],
    proTip: 'Оптимизация времени перелета $\\Delta t$ по свипу свинг-бай гравитационных маневров позволяет снизить суммарный бюджет $\\Delta V$ на 20-35%.',
  },
  {
    id: 'recipe_eda_avionics',
    title: 'Рецепт 6: Стресс-Тест Авионики под Радиацией и Верификация TMR',
    tag: 'Микроэлектроника & EDA',
    targetDomain: 'EDA & Авионика',
    goal: 'Оценить устойчивость бортовой ЭВМ к одиночным радиационным сбоям (SEU) и проверить безотказность мажоритарного резервирования.',
    estimatedTime: '1.5 минуты',
    steps: [
      {
        stepNumber: 1,
        title: 'Переход в домен EDA',
        description: 'В верхнем селекторе доменов выберите «Микроэлектроника & EDA».',
        whereToClick: 'Верхняя панель доменов -> Кнопка «Микроэлектроника & EDA»',
        expectedOutcome: 'Загрузка топологического симулятора RC-цепей, глазковой диаграммы и модели радиационных эффектов.',
      },
      {
        stepNumber: 2,
        title: 'Включение радиационного потока и TMR',
        description: 'Увеличьте ползунок потока космических ионов $\\Phi_{\\text{ion}}$ и активируйте тумблер «Тройное Модульное Резервирование (TMR)».',
        whereToClick: 'Панель радиационной стойкости -> Слайдер потока + Тумблер TMR',
        expectedOutcome: 'Визуализация попадания ионов в память процессора и мгновенное мажоритарное исправление бита клапаном $Y = AB + BC + AC$.',
      },
    ],
    proTip: 'Без TMR при потоке $10^5$ ион/см²·с вероятность фатального сбоя процессора достигает 90% за первые 48 часов полета.',
  },
  {
    id: 'recipe_export_cae',
    title: 'Рецепт 7: Генерация Инженерного Отчета по ГОСТ и Экспорт в ParaView',
    tag: 'Экспорт & Документация',
    targetDomain: 'Экспорт & CAE',
    goal: 'Сформировать официальный структурированный отчет в формате PDF/ГОСТ и выгрузить расчетную сетку в ParaView Legacy VTK для внешней верификации.',
    estimatedTime: '1 минута',
    steps: [
      {
        stepNumber: 1,
        title: 'Переход в модуль Экспорта',
        description: 'Во вкладках Аэродинамики откройте модуль «Экспорт и Отчеты».',
        whereToClick: 'Вкладка «Экспорт и Отчеты»',
        expectedOutcome: 'Открытие центра генерации документации и экспорта расчетных данных.',
      },
      {
        stepNumber: 2,
        title: 'Печать официального PDF-отчета',
        description: 'Нажмите зеленую кнопку «Сгенерировать и Распечатать PDF (ГОСТ)».',
        whereToClick: 'Кнопка «Сгенерировать PDF»',
        expectedOutcome: 'Формирование отчета с титульным листом по ГОСТ 7.32, таблицами сил, графиками $C_p$ и параметрами сходимости солвера.',
      },
      {
        stepNumber: 3,
        title: 'Выгрузка сетки ParaView (.vtk)',
        description: 'Нажмите кнопку «Скачать ParaView Legacy (.vtk)» для экспорта 3D структурированной сетки.',
        whereToClick: 'Секция CAE-экспорта -> Кнопка «ParaView VTK»',
        expectedOutcome: 'Скачивание текстового файла `.vtk`, готового к открытию в ParaView, ANSYS Fluent или Tecplot.',
      },
    ],
    proTip: 'Файлы конфигурации SU2 (`.cfg`) можно использовать для прямого запуска высокопроизводительного RANS-расчета на суперкомпьютерных кластерах.',
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
  const [activeHandbookTab, setActiveHandbookTab] = useState<'chapters' | 'ui_guide' | 'recipes'>('chapters');
  const [selectedTopicId, setSelectedTopicId] = useState<HandbookTopicId>(initialTopicId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // UI Guide State
  const [uiGuideCategory, setUiGuideCategory] = useState<string>('all');
  const [uiGuideSearch, setUiGuideSearch] = useState<string>('');
  const [activeWorkspaceZone, setActiveWorkspaceZone] = useState<number | null>(null);

  // Recipes State
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(SOP_RECIPES[0].id);

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

  // Filter UI parameters
  const filteredDecoderItems = useMemo(() => {
    return PARAMETER_DECODER_ITEMS.filter((item) => {
      const matchCat = uiGuideCategory === 'all' || item.category === uiGuideCategory;
      const q = uiGuideSearch.toLowerCase().trim();
      const matchSearch =
        q === '' ||
        item.name.toLowerCase().includes(q) ||
        item.meaning.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.howToConfigure.toLowerCase().includes(q) ||
        item.howToObtain.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [uiGuideCategory, uiGuideSearch]);

  const activeRecipe = useMemo(() => {
    return SOP_RECIPES.find((r) => r.id === selectedRecipeId) || SOP_RECIPES[0];
  }, [selectedRecipeId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-6xl h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Modal Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/90 gap-3 shrink-0">
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
                Полная архитектура интерфейса, декодер параметров («Что к чему и что значит»), физика формул и регламенты
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Top Navigation Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveHandbookTab('chapters')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeHandbookTab === 'chapters'
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>13 Научных Глав</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveHandbookTab('ui_guide')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeHandbookTab === 'ui_guide'
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Гид по Интерфейсу</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 font-mono hidden md:inline">
                  Что к чему
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveHandbookTab('recipes')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeHandbookTab === 'recipes'
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Workflow className="w-3.5 h-3.5" />
                <span>Как Получить (Рецепты)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700 ml-1"
              title="Закрыть руководство"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: 13 СПЕЦИАЛИЗИРОВАННЫХ НАУЧНЫХ ГЛАВ                               */}
        {/* ========================================================================= */}
        {activeHandbookTab === 'chapters' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden animate-fadeIn">
            {/* Left Sidebar: Topic Selector & Search */}
            <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/60 p-3 sm:p-4 flex flex-col gap-3 shrink-0 overflow-y-auto">
              
              {/* Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск формул, модулей..."
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

              {/* 4. Пошаговые Инструкции & Инженерный Workflow */}
              {activeTopic.engineeringWorkflow && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>4. Инженерный Рабочий Процесс (Workflow & Best Practices)</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                      Standard Operating Procedure (SOP)
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">
                      {activeTopic.engineeringWorkflow.title}
                    </h3>
                    <p className="text-xs text-slate-300">
                      <strong className="text-cyan-400">Цель операции: </strong>
                      <MathText text={activeTopic.engineeringWorkflow.goal} />
                    </p>
                  </div>

                  {/* Steps Timeline / Cards */}
                  <div className="space-y-2.5 pt-1">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Пошаговый регламент действий:
                    </h4>
                    <div className="space-y-2">
                      {activeTopic.engineeringWorkflow.steps.map((step) => (
                        <div
                          key={step.stepNumber}
                          className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                {step.stepNumber}
                              </span>
                              <span className="text-xs font-bold text-slate-100">
                                {step.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                              {step.uiTarget}
                            </span>
                          </div>

                          <div className="text-xs text-slate-300 pl-7 space-y-1">
                            <p>
                              <span className="text-slate-400 font-medium">Действие: </span>
                              <MathText text={step.action} />
                            </p>
                            <p className="text-emerald-400/90 text-[11px] bg-emerald-950/30 p-1.5 rounded-lg border border-emerald-900/40">
                              <span className="font-bold">Ожидаемый результат: </span>
                              <MathText text={step.expectedResult} />
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pitfalls & Troubleshooting */}
                  {activeTopic.engineeringWorkflow.pitfallsAndTroubleshooting && activeTopic.engineeringWorkflow.pitfallsAndTroubleshooting.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Диагностика ошибок & Решение проблем (Troubleshooting):</span>
                      </h4>
                      <div className="space-y-2">
                        {activeTopic.engineeringWorkflow.pitfallsAndTroubleshooting.map((tip, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/40 text-xs space-y-1">
                            <div className="font-bold text-rose-300 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              <span>Проблема: {tip.issue}</span>
                            </div>
                            <p className="text-slate-300 pl-3">
                              <span className="text-emerald-400 font-bold">Решение: </span>
                              <MathText text={tip.resolution} />
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Best Practices */}
                  {activeTopic.engineeringWorkflow.bestPractices && activeTopic.engineeringWorkflow.bestPractices.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Инженерные рекомендации & Best Practices:</span>
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {activeTopic.engineeringWorkflow.bestPractices.map((bp, idx) => (
                          <li key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                            <span className="text-cyan-400 font-bold">★</span>
                            <MathText text={bp} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* 5. Академические Первоисточники и Литература */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
                  <BookOpen className="w-4 h-4" />
                  <span>5. Академические Первоисточники и Стандарты</span>
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
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: ИНТЕРАКТИВНЫЙ ГИД ПО ИНТЕРФЕЙСУ («ЧТО К ЧЕМУ & ЧТО ЗНАЧИТ»)       */}
        {/* ========================================================================= */}
        {activeHandbookTab === 'ui_guide' && (
          <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6 bg-slate-900/60 animate-fadeIn">
            
            {/* Master Banner */}
            <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 space-y-3 shadow-xl">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3 h-3" /> Интерактивная Карта Интерфейса
                </span>
                <span className="text-xs font-mono text-cyan-400 font-bold">
                  25+ Параметров & Органов Управления
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Что к Чему, Что Значит и Как Получить Результат
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-4xl leading-relaxed">
                Наглядное руководство по структуре экрана студии, физическому смыслу каждого ползунка и числового табло, а также точным правилам настройки для различных режимов полета и вычислений.
              </p>
            </div>

            {/* A. Интерактивная Схема Рабочей Области Студии (5 Главных Зон) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
                  <Layers className="w-4 h-4" />
                  <span>А. Архитектурная Карта Экрана Студии (5 Функциональных Зон)</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Нажмите на зону, чтобы увидеть ее роль
                </span>
              </div>

              {/* Visual Mockup Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                {/* Zone 1: Header */}
                <button
                  type="button"
                  onClick={() => setActiveWorkspaceZone(1)}
                  className={`md:col-span-12 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    activeWorkspaceZone === 1
                      ? 'bg-cyan-950/80 border-cyan-400 ring-2 ring-cyan-500/40'
                      : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded bg-cyan-500 text-slate-950 font-mono font-bold text-[10px]">1</span>
                      <span>Верхняя Панель Доменов (Domain Selector Bar)</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">CFD • GNC • EDA</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Переключение глобальной дисциплины: «✈️ Аэродинамика», «🚀 Космонавтика», «🛰️ Микроэлектроника & EDA».
                  </p>
                </button>

                {/* Zone 2: Control Deck */}
                <button
                  type="button"
                  onClick={() => setActiveWorkspaceZone(2)}
                  className={`md:col-span-4 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    activeWorkspaceZone === 2
                      ? 'bg-indigo-950/80 border-indigo-400 ring-2 ring-indigo-500/40'
                      : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded bg-indigo-500 text-slate-950 font-mono font-bold text-[10px]">2</span>
                      <span>Входные Параметры & Пресеты</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Угол атаки $\alpha$, Мах $M$, высота $H$, профили NASA, тумблеры солверов.
                  </p>
                </button>

                {/* Zone 3: Visual Canvas */}
                <button
                  type="button"
                  onClick={() => setActiveWorkspaceZone(3)}
                  className={`md:col-span-8 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    activeWorkspaceZone === 3
                      ? 'bg-emerald-950/80 border-emerald-400 ring-2 ring-emerald-500/40'
                      : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 font-mono font-bold text-[10px]">3</span>
                      <span>Интерактивный 3D/2D Вычислительный Холст (Viewport)</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    3D вращение крыла, изоповерхности $Q$-вихрей, секущие срезы Cut Planes, дымовые линии тока, эпюры $C_p$.
                  </p>
                </button>

                {/* Zone 4: Forces & Telemetry */}
                <button
                  type="button"
                  onClick={() => setActiveWorkspaceZone(4)}
                  className={`md:col-span-6 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    activeWorkspaceZone === 4
                      ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-500/40'
                      : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-mono font-bold text-[10px]">4</span>
                      <span>Телеметрия Сил & Сходимости ($C_L, C_D, L/D, \|r_k\|_2$)</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Числовые табло интегральных коэффициентов, поляры, логарифмический спарклайн невязки GMRES.
                  </p>
                </button>

                {/* Zone 5: Export & Reports */}
                <button
                  type="button"
                  onClick={() => setActiveWorkspaceZone(5)}
                  className={`md:col-span-6 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    activeWorkspaceZone === 5
                      ? 'bg-purple-950/80 border-purple-400 ring-2 ring-purple-500/40'
                      : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-300 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded bg-purple-500 text-slate-950 font-mono font-bold text-[10px]">5</span>
                      <span>Экспорт Отчетов & CAE Форматов (PDF, VTK, SU2)</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Генерация официального PDF-отчета по ГОСТ, экспорт 3D сетки в ParaView Legacy (.vtk) и конфига SU2.
                  </p>
                </button>
              </div>
            </div>

            {/* B. Большой Декодер Параметров & Терминов («Что к чему и что значит») */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                  <Sliders className="w-4 h-4" />
                  <span>Б. Декодер Параметров: Что Это Значит, Где Искать & Как Получить</span>
                </div>
                
                {/* Search in Decoder */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={uiGuideSearch}
                    onChange={(e) => setUiGuideSearch(e.target.value)}
                    placeholder="Фильтр терминов (Mach, Cl, Q...)"
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono scrollbar-none">
                {[
                  { id: 'all', label: 'Все Параметры' },
                  { id: 'input', label: 'Входные Ползунки' },
                  { id: 'aero_output', label: 'Выходные Силы (Cl, Cd, Cp)' },
                  { id: 'visual_3d', label: '3D Инструменты & Вихри' },
                  { id: 'space', label: 'Космос & Навигация' },
                  { id: 'eda', label: 'EDA & Микроэлектроника' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setUiGuideCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      uiGuideCategory === cat.id
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Cards Grid: Parameter by Parameter Detailed Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {filteredDecoderItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-md hover:border-slate-700 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white tracking-tight">
                            {item.name}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono font-bold text-xs border border-cyan-800">
                            <MathText text={`$${item.symbolLatex}$`} />
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span className="font-mono">{item.location}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                        {item.badge}
                      </span>
                    </div>

                    {/* What it means */}
                    <div className="space-y-1 text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-wider font-mono text-[10px] text-cyan-400">
                        💡 Что это значит (Физический смысл):
                      </span>
                      <p className="text-slate-200 leading-relaxed">
                        <MathText text={item.meaning} />
                      </p>
                    </div>

                    {/* How to configure */}
                    <div className="space-y-1 text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                      <span className="text-slate-400 font-bold uppercase tracking-wider font-mono text-[10px] text-amber-400">
                        ⚙️ Как настраивать & Рекомендуемые диапазоны:
                      </span>
                      <p className="text-slate-300">
                        <MathText text={item.howToConfigure} />
                      </p>
                    </div>

                    {/* How to obtain */}
                    <div className="space-y-1 text-xs bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-900/40">
                      <span className="text-emerald-400 font-bold uppercase tracking-wider font-mono text-[10px]">
                        🎯 Как получить результат и что покажет:
                      </span>
                      <p className="text-emerald-200/90">
                        <MathText text={item.howToObtain} />
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {filteredDecoderItems.length === 0 && (
                <div className="text-center py-12 text-xs text-slate-500 font-mono">
                  По данному запросу параметры не найдены.
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: ГОТОВЫЕ РЕЦЕПТЫ («КАК ПОЛУЧИТЬ РЕЗУЛЬТАТ» — ПОШАГОВЫЕ SOP)        */}
        {/* ========================================================================= */}
        {activeHandbookTab === 'recipes' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden animate-fadeIn">
            {/* Left Sidebar: Recipe List */}
            <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/60 p-3 sm:p-4 flex flex-col gap-2 shrink-0 overflow-y-auto">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider font-mono px-1">
                <Workflow className="w-4 h-4" />
                <span>7 Экспресс-Сценариев (SOP)</span>
              </div>
              <p className="text-[11px] text-slate-400 px-1 pb-1">
                Пошаговые алгоритмы действий инженера от запуска до экспорта
              </p>

              <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
                {SOP_RECIPES.map((recipe) => {
                  const isSelected = recipe.id === selectedRecipeId;
                  return (
                    <button
                      key={recipe.id}
                      type="button"
                      onClick={() => setSelectedRecipeId(recipe.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-950/80 to-slate-900 border-amber-500/70 text-white shadow-md ring-1 ring-amber-500/30'
                          : 'bg-slate-900/40 hover:bg-slate-800/60 border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold truncate">{recipe.title}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 shrink-0">
                          {recipe.estimatedTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400/90">
                        <span>[{recipe.targetDomain}]</span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {recipe.goal}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Main Panel: Recipe Execution Details */}
            <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6 bg-slate-900/50">
              
              {/* Recipe Header */}
              <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border border-slate-800 space-y-2 relative overflow-hidden shadow-lg">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold uppercase tracking-wider">
                    {activeRecipe.targetDomain}
                  </span>
                  <span className="text-xs font-mono text-slate-400 font-bold">
                    Время выполнения: ~{activeRecipe.estimatedTime}
                  </span>
                </div>
                <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                  {activeRecipe.title}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  <strong className="text-cyan-400">Целевой результат: </strong>
                  <MathText text={activeRecipe.goal} />
                </p>
              </div>

              {/* Steps Detailed Flow */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                  <CheckSquare className="w-4 h-4" />
                  <span>Пошаговый Протокол Действий Инженера:</span>
                </div>

                <div className="space-y-3">
                  {activeRecipe.steps.map((st) => (
                    <div
                      key={st.stepNumber}
                      className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                            {st.stepNumber}
                          </span>
                          <h3 className="text-xs sm:text-sm font-bold text-white">
                            {st.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 shrink-0">
                          <MousePointer className="w-3 h-3 text-cyan-400" />
                          <span>{st.whereToClick}</span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-300 pl-8 space-y-2">
                        <p className="leading-relaxed">
                          <MathText text={st.description} />
                        </p>
                        <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/40 text-[11px] text-emerald-300 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Что покажет экран: </span>
                            <MathText text={st.expectedOutcome} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pro Tip Callout */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 to-slate-900 border border-cyan-500/30 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-cyan-300 font-mono uppercase tracking-wider text-[11px]">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    <span>Инженерная Рекомендация (Pro Tip):</span>
                  </div>
                  <p className="text-slate-300 pl-5 leading-relaxed">
                    <MathText text={activeRecipe.proTip} />
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Modal Bottom Status Bar */}
        <div className="px-4 sm:px-6 py-2.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400 font-mono shrink-0">
          <span>Студия Инжиниринга v3.0 PRO | Интерактивное руководство верифицировано</span>
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

