import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Disc,
  Radio,
  Volume2,
  Box,
  Users,
  Keyboard,
  Move,
  RotateCw,
  ZoomIn,
  Crosshair,
  Clock,
  Target,
  Filter,
  Check,
  Copy,
  ListChecks,
  Bookmark,
  ArrowLeft,
  ArrowRight,
  CornerDownLeft,
  Hash,
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
  | 'eda_avionics'
  | 'bem_propulsion'
  | 'uav_navigation_ew'
  | 'aero_cad_mdo'
  | 'supersonic_hypersonic'
  | 'aeroacoustics'
  | 'uav_swarm_control';

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
  category: 'input' | 'aero_output' | 'visual_3d' | 'space' | 'eda' | 'uav_cad';
  categoryName: string;
  location: string;
  meaning: string;
  howToConfigure: string;
  howToObtain: string;
  badge: string;
}

export interface SOPRecipe {
  id: string;
  recipeNumber: number;
  title: string;
  tag: string;
  targetDomain:
    | 'CFD & Аэро'
    | '3D Лаборатория'
    | 'Флаттер & Динамика'
    | 'Космос & GNC'
    | 'EDA & Авионика'
    | 'Экспорт & CAE'
    | 'БПЛА & Роторы'
    | 'САПР & MDO'
    | 'Математика & СЛАУ';
  goal: string;
  estimatedTime: string;
  difficulty: 'Базовый' | 'Средний' | 'Продвинутый' | 'Экспертный';
  category: 'aero' | 'uav' | 'flight' | 'space' | 'eda' | 'cad' | 'math';
  categoryName: string;
  prerequisites?: string[];
  verificationCriteria?: string;
  relatedTopicId?: HandbookTopicId;
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
  category: 'aero' | 'space' | 'eda' | 'general' | 'uav' | 'cad';
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
  {
    id: 'bem_propulsion',
    title: 'Винтомоторные Группы: Теория BEM, Импеллеры и Энергетика',
    category: 'uav',
    categoryLabel: 'Винты & Импеллеры',
    icon: Disc,
    badge: 'BEM + Ducted Fan',
    summary: 'Дисковая теория импульса Ренкина-Фруда, теория элементов лопасти Беца-Прандтля, концевые потери $F_{\\text{tip}}$, поправка Глауэрта $a > 0.33$ и импеллеры Ducted Fan.',
    purpose: 'Аэродинамический расчет тяги $T$, потребной мощности $P$, крутящего момента $Q$ и коэффициента полезного действия $\\eta$ воздушных винтов и импеллеров БПЛА с учетом крутки лопасти $\\theta(r)$, хорды $c(r)$ и поляр профиля.',
    engineeringWorkflow: {
      title: 'Инструкция по Расчету Винтомоторной Группы (BEM & Ducted Fan)',
      goal: 'Рассчитать тягу, КПД и время автономного зависания БПЛА с учетом крутки лопастей и профилированного кольцевого канала.',
      steps: [
        {
          stepNumber: 1,
          title: 'Геометрическая параметризация лопасти',
          action: 'Задайте радиус винта $R$, число лопастей $B$, профиль сечений NACA 4412/Clark-Y и закон крутки $\\theta(r) = \\arctan(P / (2\\pi r))$.',
          uiTarget: 'Слайдеры «Диаметр», «Шаг» и «Число лопастей»',
          expectedResult: 'Построение 3D геометрии лопасти и распределения хорды $c(r)$ вдоль относительного радиуса $r/R$.',
        },
        {
          stepNumber: 2,
          title: 'Итерационный расчет осевой и тангенциальной индукции',
          action: 'Запустите итерационный решатель уравнений баланса импульса и аэродинамических сил в сечениях.',
          uiTarget: 'Кнопка «Рассчитать BEM»',
          expectedResult: 'Сходимость коэффициентов осевой $a(r)$ и тангенциальной $a\'(r)$ индукции с невязкой $< 10^{-6}$.',
        },
        {
          stepNumber: 3,
          title: 'Учет концевых потерь Прандтля и поправки Глауэрта',
          action: 'Проверьте значение фактора $F = F_{\\text{tip}} \\cdot F_{\\text{hub}}$ и активацию квадратичной поправки Глауэрта-Бюля при $a > 0.33$.',
          uiTarget: 'График фактора потерь $F(r)$ и эпюра тяги $dT/dr$',
          expectedResult: 'Устранение нефизичной сингулярности одномерной теории импульса при высокой удельной нагрузке на диск.',
        },
        {
          stepNumber: 4,
          title: 'Активация режима кольцевого импеллера (Ducted Fan)',
          action: 'Включите тумблер «Кольцевой канал» и задайте коэффициент диффузорности обечайки $A_e/A_d$.',
          uiTarget: 'Тумблер «Кольцевой канал (Ducted Fan)»',
          expectedResult: 'Прирост суммарной тяги на 15–28% за счет разрежения на входной губе обечайки и экранирования концевых вихрей.',
        },
        {
          stepNumber: 5,
          title: 'Расчет энергобаланса и времени висения',
          action: 'Введите емкость аккумулятора $C_{\\text{bat}}$, напряжение $V_{\\text{nom}}$ и массу аппарата $m_{\\text{tot}}$.',
          uiTarget: 'Блок телеметрии «Энергетика & Аккумулятор»',
          expectedResult: 'Вывод механической мощности $P_{\\text{mech}}$, тока $I_{\\text{hover}}$ и предельного времени зависания $t_{\\text{hover}}$.',
        },
      ],
      pitfallsAndTroubleshooting: [
        {
          issue: 'Расходимость итераций BEM в режиме нулевой скорости набегающего потока $V_\\infty = 0$',
          resolution: 'Используйте релаксационный множитель $\\omega_{\\text{relax}} = 0.25$ для плавного обновления шага по индукции $a_{n+1} = (1-\\omega)a_n + \\omega a_{\\text{new}}$.',
        },
        {
          issue: 'Кавитация или срыв потока на корневых сечениях при $P/D > 0.8$',
          resolution: 'Уменьшите угол установки лопасти в комле $\\theta_{\\text{root}}$ или используйте профиль с большей относительной толщиной $t/c = 15-18\\%$.',
        },
      ],
      bestPractices: [
        'Для мультироторных БПЛА оптимальное отношение шага к диаметру составляет $P/D = 0.45 - 0.65$ для максимального КПД зависания (Figure of Merit $FM > 0.72$).',
        'При установке импеллера обеспечивайте радиальный зазор между законцовкой лопасти и обечайкой не более $0.005 D$ для максимального подавления концевых вихрей.',
      ],
    },
    uiWalkthrough: {
      title: 'Интерфейс Модуля BEM & Винтомоторных Групп',
      description: 'Позволяет настраивать геометрию винта, крутку, число лопастей, обечайку и анализировать полетную энергетику.',
      controls: [
        { name: 'Диаметр винта $D$', type: 'Slider (дюймы/метры)', role: 'Определяет площадь ометаемого диска $A = \\pi D^2 / 4$.' },
        { name: 'Обороты мотора $\\Omega$', type: 'Slider (RPM)', role: 'Угловая скорость вращения ротора $\\Omega = 2\\pi n / 60$.' },
        { name: 'Геометрический шаг $P$', type: 'Slider (дюймы)', role: 'Теоретическое осевое перемещение винта за один полный оборот.' },
        { name: 'Тумблер «Кольцевой канал»', type: 'Toggle', role: 'Активирует моделирование обечайки импеллера Ducted Fan.' },
      ],
      readouts: [
        { name: 'Тяга винта $T$', unit: 'Н / кгс', interpretation: 'Результирующая аэродинамическая сила тяги, создаваемая лопастями и обечайкой.' },
        { name: 'Механическая мощность $P_{\\text{mech}}$', unit: 'Вт', interpretation: 'Потребная мощность мотора $P = Q \\cdot \\Omega$ для вращения ротора.' },
        { name: 'Качество висения $FM$', unit: 'Figure of Merit', interpretation: 'Отношение идеальной мощности теории импульса к реальной мощности $FM = T^{3/2} / (P \\sqrt{2\\rho A})$.' },
      ],
    },
    mathematics: {
      governingEquationLatex: 'dT = 4\\pi\\rho r V_\\infty^2 (1+a)a F \\, dr = \\frac{1}{2}\\rho V_{\\text{rel}}^2 B c(r)(C_l\\cos\\phi - C_d\\sin\\phi)\\,dr, \\quad F = \\frac{2}{\\pi}\\arccos\\left(\\exp\\left(-\\frac{B(R-r)}{2R\\sin\\phi}\\right)\\right)',
      description: 'Уравнения баланса импульса в кольцевом элементе струи и аэродинамических сил на сечении лопасти с фактором концевых потерь Прандтля.',
      derivationSteps: [
        'Расчет угла набегающего скоса: $\\tan\\phi = \\frac{V_\\infty(1+a)}{\\Omega r(1-a\')}$, эффективный угол атаки сечения: $\\alpha = \\theta(r) - \\phi$.',
        'Квадратичная поправка Глауэрта при $a > a_c \\approx 0.33$: $C_T = 4F [a_c^2 + (1 - 2a_c)a]$.',
        'Тяга кольцевого импеллера: $T_{\\text{total}} = T_{\\text{rotor}} + \\Delta p_{\\text{lip}} A_{\\text{duct}}$, где градиент разрежения на губе обечайки дает дополнительную тягу.',
      ],
    },
    physicalSignificance: [
      'BEM-метод рассчитывает полную аэродинамику воздушного винта за миллисекунды, ускоряя подбор мотора в 1000 раз по сравнению с 3D CFD.',
      'Обечайка Ducted Fan экранирует акустическое излучение законцовок и увеличивает удельную тягу при компактных габаритах БПЛА.',
    ],
    references: [
      { authors: 'Leishman, J. G.', year: '2006', title: 'Principles of Helicopter Aerodynamics (2nd ed.)', publisher: 'Cambridge University Press' },
      { authors: 'Glauert, H.', year: '1935', title: 'Airplane Propellers (Aerodynamic Theory, Vol. 4)', publisher: 'Springer Berlin' },
    ],
  },
  {
    id: 'uav_navigation_ew',
    title: 'БПЛА & РЭБ: Навигация в Условиях Спуфинга и Подавления ГНСС',
    category: 'uav',
    categoryLabel: 'БПЛА & РЭБ',
    icon: Radio,
    badge: 'РЭБ & БИНС + EKF',
    summary: 'Комплексирование бескарданной ИНС с EKF/UKF, радиовысотомером, оптическим потоком и алгоритмами парирования спуфинга ГНСС (RAIM/Mahalanobis distance).',
    purpose: 'Обеспечение автономного высокоточного полета БПЛА в зонах активного радиоэлектронного подавления (Jamming) и координатного обмана (Spoofing) с автоматическим переходом на счисление пути (Dead Reckoning).',
    engineeringWorkflow: {
      title: 'Инструкция по Настройке Навигации БПЛА в Условиях РЭБ',
      goal: 'Обеспечить помехоустойчивость навигационного контура, детекцию спуфинга и автономное возвращение дрона при потере спутников.',
      steps: [
        {
          stepNumber: 1,
          title: 'Калибровка нулей и шумов датчиков БИНС',
          action: 'Выполните статическую юстировку МЭМС-акселерометров и гироскопов, задав матрицы дисперсий шума процесса $\\mathbf{Q}$ и смещений нулей $\\mathbf{b}_a, \\mathbf{b}_g$.',
          uiTarget: 'Панель «Калибровка ИНС / MEMS IMU»',
          expectedResult: 'Фиксация начальной кватернионной ориентации $\\mathbf{q}_0$ и дрейфа гироскопов $< 0.1^\\circ/\\text{с}$.',
        },
        {
          stepNumber: 2,
          title: 'Интеграция уравнений навигации Пуассона и EKF',
          action: 'Запустите контур расширенного фильтра Калмана (16-мерный вектор состояния: координаты, скорости, кватернион, дрейфы).',
          uiTarget: 'Селектор «Режим EKF / Навигация»',
          expectedResult: 'Непрерывное счисление траектории полета с обновлением ковариации ошибки $\\mathbf{P}_k$.',
        },
        {
          stepNumber: 3,
          title: 'Активация статистического детектора спуфинга (RAIM)',
          action: 'Включите контроль расстояния Махаланобиса по невязкам спутниковых измерений $d^2_{\\text{Mahal}} = \\mathbf{r}_k^T \\mathbf{S}_k^{-1} \\mathbf{r}_k > \\chi^2_{3, 0.999}$.',
          uiTarget: 'Тумблер «Антиспуфинг RAIM / $\\chi^2$-контроль»',
          expectedResult: 'Мгновенная отбраковка фальшивых координат при резком расхождении вектора инновации.',
        },
        {
          stepNumber: 4,
          title: 'Переход на резервное счисление (Dead Reckoning + Optical Flow)',
          action: 'При обнаружении подавления ГНСС активируйте связку оптического потока, барометра и магнитного компаса.',
          uiTarget: 'Тумблер «Оптический поток & Барометр»',
          expectedResult: 'Ограничение нарастания погрешности координат до $< 1.5\\,\\text{м}$ на 100 метров пройденного пути.',
        },
        {
          stepNumber: 5,
          title: 'Инициация протокола безопасного возврата (RTH)',
          action: 'Проверьте автоматическое формирование обратного маршрута по точкам зафиксированного коридора безопасности.',
          uiTarget: 'Кнопка «Тест RTH в условиях РЭБ»',
          expectedResult: 'Автономный полет в точку старта без использования радиокоманд управления и ГНСС.',
        },
      ],
      pitfallsAndTroubleshooting: [
        {
          issue: 'Квадратичный рост ошибки координат $\\Delta r \\sim \\frac{1}{2} b_a t^2$ при отключении спутников',
          resolution: 'Используйте коррекцию по визуальной одометрии (VIO) или радиовысотомеру с картой рельефа TERCOM для обнуления накапливаемой ошибки скорости.',
        },
        {
          issue: 'Магнитные помехи от силовых кабелей двигателей искажают курс',
          resolution: 'Проведите калибровку эллипсоида Hard/Soft Iron и вынесите модуль магнитометра на диэлектрическую стойку.',
        },
      ],
      bestPractices: [
        'Всегда используйте многочастотные приемники L1/L2/L5 с фазовой автоподстройкой частоты и направленными экранами против наземных глушилок.',
        'При полете в гористой местности активируйте радиовысотомер для гарантированного огибания рельефа в режиме автопилота.',
      ],
    },
    uiWalkthrough: {
      title: 'Интерфейс Навигационного Модуля БПЛА & РЭБ',
      description: 'Позволяет симулировать воздействие станций радиоэлектронного подавления, спуфинг-атаки и оценивать работу фильтра EKF.',
      controls: [
        { name: 'Мощность помехи РЭБ', type: 'Slider (дБм)', role: 'Уровень спектральной плотности шума подавления диапазона GPS/ГЛОНАСС.' },
        { name: 'Тип спуфинга', type: 'Selector', role: 'Смещение координат (Offset) / Ложный захват скорости (Velocity Walk-off).' },
        { name: 'Тумблер «Антиспуфинг RAIM»', type: 'Toggle', role: 'Активирует отбраковку измерений по критерию $\\chi^2$-Махаланобиса.' },
      ],
      readouts: [
        { name: 'Невязка инновации $\\|\\mathbf{r}_k\\|_2$', unit: 'м', interpretation: 'Расхождение между предсказанным положением по ИНС и спутниковыми измерениями.' },
        { name: 'Ковариация ошибки $\\mathrm{tr}(\\mathbf{P})$', unit: 'м²', interpretation: 'Суммарная дисперсия неопределенности оценки координат и скоростей.' },
        { name: 'Статус ГНСС', unit: 'Lock / Jammed / Spoofed', interpretation: 'Текущее состояние спутникового навигационного тракта.' },
      ],
    },
    mathematics: {
      governingEquationLatex: 'd^2_{\\text{Mahal}} = (\\mathbf{z}_k - \\mathbf{H}\\hat{\\mathbf{x}}_k^{-})^T \\mathbf{S}_k^{-1} (\\mathbf{z}_k - \\mathbf{H}\\hat{\\mathbf{x}}_k^{-}) > \\chi^2_{\\alpha}, \\quad \\mathbf{S}_k = \\mathbf{H}\\mathbf{P}_k^{-}\\mathbf{H}^T + \\mathbf{R}_k',
      description: 'Критерий статистической проверки гипотез о достоверности измерений по распределению хи-квадрат и уравнения фильтра EKF.',
      derivationSteps: [
        'Кинематика кватерниона ориентации: $\\dot{\\mathbf{q}} = \\frac{1}{2} \\mathbf{q} \\otimes \\boldsymbol{\\omega}_{\\text{gyro}}$, где $\\boldsymbol{\\omega}$ — угловая скорость в связанных осях.',
        'Интегрирование ускорений в навигационной СК: $\\dot{\\mathbf{v}} = \\mathbf{C}_b^n \\mathbf{f}^b + \\mathbf{g}^n - (2\\boldsymbol{\\Omega}_{ie}^n + \\boldsymbol{\\omega}_{en}^n) \\times \\mathbf{v}$.',
        'Коррекция EKF при достоверных измерениях: $\\mathbf{K}_k = \\mathbf{P}_k^{-} \\mathbf{H}^T \\mathbf{S}_k^{-1}, \\quad \\hat{\\mathbf{x}}_k = \\hat{\\mathbf{x}}_k^{-} + \\mathbf{K}_k \\mathbf{r}_k$.',
      ],
    },
    physicalSignificance: [
      'Антиспуфинг гарантирует защиту автономных дронов от перехвата управления и принудительной посадки на чужую территорию.',
      'Комплексирование ИНС + EKF позволяет сохранять сантиметровую точность траектории даже при кратковременных пропаданиях спутникового сигнала.',
    ],
    references: [
      { authors: 'Groves, P. D.', year: '2013', title: 'Principles of GNSS, Inertial, and Multisensor Integrated Navigation Systems (2nd ed.)', publisher: 'Artech House' },
      { authors: 'Titterton, D., & Weston, J.', year: '2004', title: 'Strapdown Inertial Navigation Technology (2nd ed.)', publisher: 'IET' },
    ],
  },
  {
    id: 'aero_cad_mdo',
    title: 'Параметрический САПР: MDO-Оптимизация и Design-to-Fly',
    category: 'cad',
    categoryLabel: 'САПР & MDO',
    icon: Box,
    badge: 'CAD + Парето MDO',
    summary: 'Принцип сквозного проектирования Design-to-Fly, многокритериальная оптимизация Парето NSGA-II, динамическая центровка $SM$, тензор инерции Гюйгенса-Штейнера и экспорт STL/DXF.',
    purpose: 'Автоматизированный синтез аэродинамической компоновки БПЛА, расчет запаса статической устойчивости $SM$, подбор мотоустановки и генерация производственных файлов в 1 клик.',
    engineeringWorkflow: {
      title: 'Инструкция по Сквозному Проектированию в Aero CAD Studio',
      goal: 'Спроектировать аэродинамический планер БПЛА, сбалансировать центр масс, оптимизировать дальность полета и экспортировать чертежи.',
      steps: [
        {
          stepNumber: 1,
          title: 'Геометрическая параметризация планера',
          action: 'Задайте размах крыла $b$, корневую $c_r$ и концевую $c_t$ хорды, угол стреловидности $\\chi$ и V-образность $\\Gamma$.',
          uiTarget: 'Слайдеры геометрии крыла в САПР-модуле',
          expectedResult: 'Интерактивная 3D перестройка крыла, фюзеляжа и хвостового оперения в реальном времени.',
        },
        {
          stepNumber: 2,
          title: 'Расстановка оборудования и весовой баланс',
          action: 'Разместите компоненты (аккумулятор LiPo, мотор, сервоприводы, автопилот, полезная нагрузка) вдоль продольной оси $x$.',
          uiTarget: 'Ползунки координат компонентов $x_{\\text{bat}}, x_{\\text{motor}}$',
          expectedResult: 'Автоматический пересчет суммарной массы $m_{\\text{tot}}$ и 3D положения центра масс $\\mathbf{R}_{\\text{cg}}$.',
        },
        {
          stepNumber: 3,
          title: 'Расчет аэродинамического фокуса и запаса устойчивости (SM)',
          action: 'Проверьте расчетное положение нейтральной точки $x_{\\text{np}}$ и значение запаса устойчивости $SM = \\frac{x_{\\text{np}} - x_{\\text{cg}}}{\\bar{c}} \\times 100\\%$.',
          uiTarget: 'Индикатор запаса статической устойчивости (Static Margin)',
          expectedResult: 'Подтверждение попадания в безопасный диапазон $10\\% \\le SM \\le 14\\%$ для продольной устойчивости.',
        },
        {
          stepNumber: 4,
          title: 'Многокритериальная оптимизация Парето (MDO)',
          action: 'Запустите эволюционный алгоритм NSGA-II по критериям максимума дальности Бреге $R$, минимума массы $m_{\\text{tot}}$ и прочности лонжерона при $+6g$.',
          uiTarget: 'Кнопка «Синтез Парето MDO»',
          expectedResult: 'Генерация Парето-фронта оптимальных проектных решений с подбором винтомоторной пары.',
        },
        {
          stepNumber: 5,
          title: 'Экспорт производственных файлов (DXF & STL)',
          action: 'Сгенерируйте векторные раскрои нервюр/лонжеронов для лазерного станка (DXF) и 3D модели моторам/законцовок (STL).',
          uiTarget: 'Кнопка «Экспорт DXF / STL / BOM»',
          expectedResult: 'Мгновенное скачивание готового пакета производственных файлов и интерактивной спецификации BOM.',
        },
      ],
      pitfallsAndTroubleshooting: [
        {
          issue: 'Отрицательный запас устойчивости $SM < 0$ (самолет статически неустойчив)',
          resolution: 'Сдвиньте тяжелый аккумулятор вперед по фюзеляжу или увеличьте плечо и площадь горизонтального оперения $S_t \\cdot l_t$.',
        },
        {
          issue: 'Превышение допустимых напряжений в карбоновом лонжероне $\\sigma > [\\sigma]$ при перегрузке $+6g$',
          resolution: 'Увеличьте высоту сечения лонжерона (перейдите на профиль большей относительной толщины $t/c$) или добавьте карбоновые полки.',
        },
      ],
      bestPractices: [
        'Для схемы «Летающее крыло» используйте профили с S-образной средней линией (MH 45 / Fauvel) и отрицательную геометрическую крутку $\\varepsilon = -2^\\circ...-3^\\circ$ на законцовках.',
        'Всегда проверяйте тензор инерции Гюйгенса-Штейнера перед экспортом модели в симулятор динамики полета 6DoF.',
      ],
    },
    uiWalkthrough: {
      title: 'Интерфейс САПР-Студии Aero CAD & MDO',
      description: 'Позволяет проектировать 3D планер, настраивать весовую сводку, оптимизировать по Парето и получать производственные чертежи.',
      controls: [
        { name: 'Размах крыла $b$', type: 'Slider (м)', role: 'Полный геометрический размах несущих плоскостей.' },
        { name: 'Положение аккумулятора $x_{\\text{bat}}$', type: 'Slider (мм)', role: 'Продольная координата батареи для тонкой регулировки центровки.' },
        { name: 'Стреловидность крыла $\\chi$', type: 'Slider ($^\\circ$)', role: 'Угол стреловидности по линии 1/4 хорд.' },
        { name: 'Кнопка экспорта DXF/STL', type: 'Button', role: 'Генерация векторных чертежей деталей и 3D полигональных сеток.' },
      ],
      readouts: [
        { name: 'Запас устойчивости $SM$', unit: '%', interpretation: 'Запас статической устойчивости: положителен при центровке впереди фокуса.' },
        { name: 'Дальность полета Бреге $R$', unit: 'км', interpretation: 'Максимальная теоретическая дальность электролета на одном заряде батареи.' },
        { name: 'Тензор инерции $I_{xx}, I_{yy}, I_{zz}$', unit: 'кг·м²', interpretation: 'Главные моменты инерции аппарата в связанных осях координат.' },
      ],
    },
    mathematics: {
      governingEquationLatex: 'R = \\frac{E_{\\text{bat}}}{m_{\\text{tot}} \\cdot g} \\left(\\frac{L}{D}\\right) \\eta_{\\text{sys}}, \\quad \\mathbf{I} = \\sum_{i} \\left[ \\mathbf{I}_{i,0} + m_i (\\|\\mathbf{r}_i\\|^2 \\mathbf{E} - \\mathbf{r}_i \\otimes \\mathbf{r}_i) \\right]',
      description: 'Формула дальности полета электролета Бреге и тензор инерции системы твердых тел по теореме Гюйгенса-Штейнера.',
      derivationSteps: [
        'Расчет нейтральной точки фокуса планера: $x_{\\text{np}} = x_{\\text{ac,w}} + \\frac{S_t}{S_w} \\frac{l_t}{\\bar{c}} \\frac{a_t}{a_w} (1 - \\frac{d\\varepsilon}{d\\alpha})$.',
        'Тензор инерции в связанных осях: $I_{xx} = \\sum m_i (y_i^2 + z_i^2)$, $I_{yy} = \\sum m_i (x_i^2 + z_i^2)$, $I_{zz} = \\sum m_i (x_i^2 + y_i^2)$.',
        'Критерий прочности лонжерона на изгиб: $\\sigma_{\\text{max}} = \\frac{n_y m_{\\text{tot}} g \\cdot (b/4) \\cdot y_{\\text{outer}}}{I_z} \\le [\\sigma]_{\\text{carbon}}$.',
      ],
    },
    physicalSignificance: [
      'Концепция Design-to-Fly устраняет разрыв между математическим моделированием аэродинамики и реальным производством аппарата.',
      'Точная балансировка центра масс и фокуса исключает аварии на первом испытательном вылете из-за продольной неустойчивости.',
    ],
    references: [
      { authors: 'Raymer, D. P.', year: '2018', title: 'Aircraft Design: A Conceptual Approach (6th ed.)', publisher: 'AIAA Education Series' },
      { authors: 'Deb, K.', year: '2001', title: 'Multi-Objective Optimization using Evolutionary Algorithms', publisher: 'John Wiley & Sons' },
    ],
  },
  {
    id: 'supersonic_hypersonic',
    title: 'Сверхзвуковая и Гиперзвуковая Аэротермодинамика',
    category: 'aero',
    categoryLabel: 'Сверхзвук & Гиперзвук',
    icon: Flame,
    badge: 'Mach 1.2 – 25+',
    summary: 'Косые скачки уплотнения (уравнение $\\theta-\\beta-M$), волны расширения Прандтля-Майера, волновое сопротивление Кармана-Мура, закон площадей Уиткомба и конвективный тепловой нагрев.',
    purpose: 'Анализ ударно-волновой структуры течения, скачков уплотнения, волнового сопротивления и температурного режима носовых обтекателей и кромок летательных аппаратов на числах Маха от $1.2$ до $25+$.',
    engineeringWorkflow: {
      title: 'Инструкция по Расчету Сверхзвукового и Гиперзвукового Обтекания',
      goal: 'Определить углы скачков уплотнения, волновое сопротивление профиля и пиковый конвективный тепловой поток.',
      steps: [
        {
          stepNumber: 1,
          title: 'Определение газодинамического режима полета',
          action: 'Задайте крейсерское число Маха $M_\\infty$ (сверхзвук $1.2-5$ или гиперзвук $>5$) и высоту полета $H$.',
          uiTarget: 'Слайдеры числа Маха $M_\\infty$ и высоты $H$',
          expectedResult: 'Расчет статического давления $p_\\infty$, температуры $T_\\infty$ и скорости звука $a(H)$.',
        },
        {
          stepNumber: 2,
          title: 'Расчет угла косого скачка уплотнения ($\\theta-\\beta-M$)',
          action: 'Задайте полуугол раствора клина/носка $\\theta$ и проверьте решение нелинейного уравнения скачка.',
          uiTarget: 'Интерактивная диаграмма $\\theta-\\beta-M$',
          expectedResult: 'Вычисление угла скачка $\\beta$, падения полного давления $p_{02}/p_{01}$ и числа Маха за скачком $M_2$.',
        },
        {
          stepNumber: 3,
          title: 'Проверка критерия присоединенного скачка',
          action: 'Убедитесь, что угол клина не превышает предельный $\\theta < \\theta_{\\text{max}}(M)$.',
          uiTarget: 'Индикатор статуса скачка (Attached / Detached Bow Shock)',
          expectedResult: 'Предупреждение о возникновении отсоединенного прямого скачка при превышении $\\theta_{\\text{max}}$.',
        },
        {
          stepNumber: 4,
          title: 'Расчет волнового сопротивления и оптимизация сечений',
          action: 'Примените закон площадей Уиткомба (Whitcomb Area Rule) для сглаживания градиента продольного сечения $S\'\'(x)$.',
          uiTarget: 'График распределения площадей $S(x)$',
          expectedResult: 'Снижение волнового сопротивления $C_{Dw}$ на околозвуковых скоростях на 35–45%.',
        },
        {
          stepNumber: 5,
          title: 'Гиперзвуковой расчет критической точки (Фэй-Ридделл)',
          action: 'Задайте радиус затупления носового обтекателя $R_{\\text{nose}}$ для расчета теплового потока.',
          uiTarget: 'Панель «Аэротермодинамика & Теплозащита»',
          expectedResult: 'Вычисление конвективного теплового потока $\\dot{q}_{\\text{stag}}$ и выбор толщины абляционного экрана.',
        },
      ],
      pitfallsAndTroubleshooting: [
        {
          issue: 'Отрыв пограничного слоя перед скачком уплотнения (Shock-Boundary Layer Interaction)',
          resolution: 'Используйте профилированные щелевые отсосы пограничного слоя или генераторы вихрей перед зоной падения косого скачка.',
        },
        {
          issue: 'Катастрофический перегрев острой передней кромки на гиперзвуке ($M > 8$)',
          resolution: 'Примените концепцию затупленного тела Аллена-Эггерса: увеличение радиуса $R_{\\text{nose}}$ снижает удельный тепловой поток обратно пропорционально $\\sqrt{R_{\\text{nose}}}$.',
        },
      ],
      bestPractices: [
        'Для сверхзвуковых профилей применяйте ромбовидные (Diamond) или двояковыпуклые симметричные профили малой относительной толщины $t/c = 3-5\\%$.',
        'На гиперзвуковых скоростях учитывайте термохимическую диссоциацию молекул $O_2$ и $N_2$ при температурах торможения выше $2500\\,\\text{K}$.',
      ],
    },
    uiWalkthrough: {
      title: 'Интерфейс Сверхзвукового и Гиперзвукового Модуля',
      description: 'Позволяет моделировать косые скачки, волны Прандтля-Майера, закон площадей и аэродинамический нагрев.',
      controls: [
        { name: 'Число Маха $M_\\infty$', type: 'Slider (1.2 – 25.0)', role: 'Отношение скорости полета к местной скорости звука.' },
        { name: 'Угол полураствора клина $\\theta$', type: 'Slider ($^\\circ$)', role: 'Геометрический угол отклонения потока на передней кромке.' },
        { name: 'Радиус затупления носка $R_{\\text{nose}}$', type: 'Slider (мм / м)', role: 'Радиус скругления кромки для перераспределения ударной волны.' },
      ],
      readouts: [
        { name: 'Угол косого скачка $\\beta$', unit: '$^\\circ$', interpretation: 'Пространственный угол наклона фронта ударной волны к направлению потока.' },
        { name: 'Скачок давления $p_2/p_1$', unit: 'отн. ед.', interpretation: 'Отношение статического давления за скачком к давлению в невозмущенном потоке.' },
        { name: 'Тепловой поток Фэя-Ридделла $\\dot{q}$', unit: 'МВт/м²', interpretation: 'Пиковый конвективный тепловой поток в критической лобовой точке.' },
      ],
    },
    mathematics: {
      governingEquationLatex: '\\tan\\theta = 2\\cot\\beta \\left[ \\frac{M_1^2 \\sin^2\\beta - 1}{M_1^2 (\\gamma + \\cos 2\\beta) + 2} \\right], \\quad \\dot{q}_{\\text{stag}} = C \\sqrt{\\frac{\\rho_\\infty}{R_{\\text{nose}}}} V_\\infty^3',
      description: 'Классическое трансцендентное уравнение косого скачка уплотнения $\\theta-\\beta-M$ и эмпирическая формула конвективного теплового потока Фэя-Ридделла.',
      derivationSteps: [
        'Законы сохранения массы, импульса и энергии на поверхности разрыва Рэнкина-Гюгонио.',
        'Функция волны расширения Прандтля-Майера: $\\nu(M) = \\sqrt{\\frac{\\gamma+1}{\\gamma-1}}\\arctan\\sqrt{\\frac{\\gamma-1}{\\gamma+1}(M^2-1)} - \\arctan\\sqrt{M^2-1}$.',
        'Волновое сопротивление тонкого тела Кармана-Мура: $C_{Dw} = -\\frac{1}{2\\pi}\\int_0^L \\int_0^L S\'\'(x_1) S\'\'(x_2) \\ln|x_1 - x_2| dx_1 dx_2$.',
      ],
    },
    physicalSignificance: [
      'Теория скачков уплотнения критически важна для расчета сверхзвуковых воздухозаборников и устойчивости сверхзвуковых самолетов.',
      'Затупление носовой части экранирует летательный аппарат подушкой сжатого газа, предохраняя конструкцию от прогара при гиперзвуковом входе.',
    ],
    references: [
      { authors: 'Anderson, J. D.', year: '2006', title: 'Hypersonic and High-Temperature Gas Dynamics (2nd ed.)', publisher: 'AIAA Education Series' },
      { authors: 'Liepmann, H. W., & Roshko, A.', year: '2001', title: 'Elements of Gasdynamics', publisher: 'Dover Publications' },
    ],
  },
  {
    id: 'aeroacoustics',
    title: 'Аэроакустика и Волновой Шум Летательных Аппаратов',
    category: 'aero',
    categoryLabel: 'Акустика & Шум',
    icon: Volume2,
    badge: 'Шум & FW-H',
    summary: 'Акустическая аналогия Лайтхилла $T_{ij}$, закон 8-й степени скорости, шум вращения винтов Гутина, широкополосный шум кромки Амие и звуковой удар (Sonic Boom).',
    purpose: 'Численное прогнозирование уровней звукового давления (SPL, dBA), спектрального состава шума и диаграмм направленности акустического излучения воздушных винтов, струй и обтекаемых кромок крыла.',
    engineeringWorkflow: {
      title: 'Инструкция по Аэроакустическому Расчету и Снижению Шума',
      goal: 'Рассчитать спектр акустического излучения, диаграмму направленности и оптимизировать геометрию лопастей под нормы ICAO / FAA.',
      steps: [
        {
          stepNumber: 1,
          title: 'Идентификация основных источников акустического излучения',
          action: 'Разделите источники на тональный шум вращения винта (дипольный/монопольный) и широкополосный шум турбулентного пограничного слоя (квадрупольный).',
          uiTarget: 'Панель классификации источников шума',
          expectedResult: 'Определение доминирующего механизма шума для заданного режима полета.',
        },
        {
          stepNumber: 2,
          title: 'Расчет тензора турбулентных напряжений Лайтхилла ($T_{ij}$)',
          action: 'Вычислите квадрупольные источники шума $T_{ij} = \\rho u_i u_j + (p - c_0^2 \\rho)\\delta_{ij} - \\tau_{ij}$ на основе поля скоростей CFD.',
          uiTarget: 'Окно «Акустическая аналогия Лайтхилла»',
          expectedResult: 'Карта объемного распределения акустических источников в ближней зоне.',
        },
        {
          stepNumber: 3,
          title: 'Интеграл Фокса Уильямса–Хокингса (FW-H 1A)',
          action: 'Выполните интегрирование по движущимся поверхностям лопастей винта для нахождения давления в дальней зоне.',
          uiTarget: 'Кнопка «Запустить акустический солвер FW-H»',
          expectedResult: 'Построение волновой формы акустического давления $p\'(t)$ в точке наблюдателя.',
        },
        {
          stepNumber: 4,
          title: 'Спектральный анализ БПФ и гармоники следования лопастей (BPF)',
          action: 'Рассчитайте узкополосный спектр звукового давления $SPL(f)$ и гармоники $f_m = m \\cdot B \\cdot \\Omega / 60$.',
          uiTarget: 'Спектрограмма $SPL(f)$ с A-взвешиванием (дБА)',
          expectedResult: 'Выделение тональных пиков BPF и оценка интегрального уровня шума $OASPL$.',
        },
        {
          stepNumber: 5,
          title: 'Акустическая оптимизация формы лопасти и кромок',
          action: 'Примените серповидную стреловидность законцовок (Scimitar) или шевроны задней кромки для десинхронизации вихревого срыва.',
          uiTarget: 'Селектор «Форма законцовки / Шевроны»',
          expectedResult: 'Снижение суммарного уровня звукового давления на 4–8 dBA.',
        },
      ],
      pitfallsAndTroubleshooting: [
        {
          issue: 'Превышение нормативного порога шума дрона при пролете над жилой застройкой (> 65 dBA на 50 м)',
          resolution: 'Уменьшите окружную скорость конца лопасти $M_{\\text{tip}} < 0.45$, увеличьте число лопастей $B$ или примените винты увеличенного диаметра с меньшими RPM.',
        },
        {
          issue: 'Высокочастотный тональный свист ламинарного пограничного слоя (Laminar Boundary Layer Vortex Shedding)',
          resolution: 'Установите турбулизаторы (Tripping tape) на 10% хорды для предотвращения образования когерентных вихрей Толлмина-Шлихтинга.',
        },
      ],
      bestPractices: [
        'Для снижения шума взаимодействия винта с крылом располагайте толкающий винт на расстоянии не менее 1.5 хорд позади задней кромки.',
        'Используйте акустическое экранирование: размещение двигателей над крылом (Over-Wing Nacelle) снижает шум на земле на 6–10 dBA.',
      ],
    },
    uiWalkthrough: {
      title: 'Интерфейс Аэроакустического Модуля',
      description: 'Позволяет рассчитывать диаграммы направленности шума, узкополосные спектры SPL и применять методы шумоглушения.',
      controls: [
        { name: 'Окружная скорость лопасти $M_{\\text{tip}}$', type: 'Slider (0.2 – 0.9)', role: 'Маховое число законцовки вращающейся лопасти.' },
        { name: 'Расстояние до наблюдателя $r$', type: 'Slider (м)', role: 'Дистанция от летательного аппарата до точки замера шума.' },
        { name: 'Азимутальный угол $\\theta_{\\text{obs}}$', type: 'Slider ($^\\circ$)', role: 'Угол визирования относительно оси вращения винта.' },
      ],
      readouts: [
        { name: 'Суммарный шум $OASPL$', unit: 'дБА', interpretation: 'Общий уровень звукового давления с учетом физиологической кривой слуха человека A.' },
        { name: 'Частота BPF', unit: 'Гц', interpretation: 'Фундаментальная частота следования лопастей винта $f_1 = B \\cdot \\Omega / 60$.' },
        { name: 'Акустическая мощность $W_{\\text{acoust}}$', unit: 'Вт', interpretation: 'Полная звуковая энергия, излучаемая аппаратом в окружающую среду.' },
      ],
    },
    mathematics: {
      governingEquationLatex: '\\left( \\frac{1}{c_0^2}\\frac{\\partial^2}{\\partial t^2} - \\nabla^2 \\right) p\' = \\frac{\\partial^2 T_{ij}}{\\partial x_i \\partial x_j}, \\quad W_{\\text{acoust}} \\propto \\frac{\\rho_\\infty U_\\infty^8 L^2}{c_0^5}',
      description: 'Волновое уравнение акустической аналогии Лайтхилла и фундаментальный закон восьмой степени скорости для квадрупольных источников турбулентности.',
      derivationSteps: [
        'Преобразование уравнений Навье-Стокса к неоднородному волновому уравнению для возмущений плотности $\\rho\' = \\rho - \\rho_0$.',
        'Интегральное представление Кирхгофа-Гельмгольца для запаздывающих потенциалов излучения движущихся поверхностей (FW-H 1A).',
        'Модель широкополосного шума задней кромки Амие: $S_{pp}(\\omega) \\propto \\rho^2 u_\\tau^4 c \\cdot M^5 \\left( 1 + \\frac{\\omega c}{U_\\infty} \\right)^{-5/3}$.',
      ],
    },
    physicalSignificance: [
      'Аэроакустический расчет необходим для сертификации городской аэромобильности (eVTOL), БПЛА доставки и малошумной авиации.',
      'Закон 8-й степени объясняет, почему даже 10% снижение скорости законцовки снижает излучаемую звуковую энергию более чем в 2.3 раза.',
    ],
    references: [
      { authors: 'Lighthill, M. J.', year: '1952', title: 'On Sound Generated Aerodynamically. I. General Theory', publisher: 'Proc. R. Soc. Lond. A' },
      { authors: 'Ffowcs Williams, J. E., & Hawkings, D. L.', year: '1969', title: 'Sound Generation by Turbulence and Surfaces in Arbitrary Motion', publisher: 'Phil. Trans. R. Soc. Lond. A' },
    ],
  },
  {
    id: 'uav_swarm_control',
    title: 'Роевой Интеллект и Аэродинамика Полета в Строю',
    category: 'uav',
    categoryLabel: 'Рой & Строевой полет',
    icon: Users,
    badge: 'Swarm & V-Строение',
    summary: 'Модели Рейнольдса (Flocking), графовый консенсус Олфати-Сабера, вихревое взаимодействие спутных следов (экономия топлива до 20%) и избегание препятствий через искусственные потенциальные поля (APF).',
    purpose: 'Моделирование крупномасштабных автономных групп БПЛА, скоординированного полета в аэродинамически оптимальном клине (V-formation) и робастного перестроения при отказах отдельных узлов.',
    engineeringWorkflow: {
      title: 'Инструкция по Моделированию Роя БПЛА и Полета в Строю',
      goal: 'Настроить алгоритмы стайного взаимодействия, минимизировать аэродинамическое сопротивление группы и протестировать отказоустойчивость.',
      steps: [
        {
          stepNumber: 1,
          title: 'Формирование графа топологии связи роя',
          action: 'Задайте число агентов $N$, радиус радиовидимости $R_{\\text{comm}}$ и проверьте связность графа $\\lambda_2(\\mathcal{L}) > 0$.',
          uiTarget: 'Слайдер «Число агентов в рое $N$» и граф топологии',
          expectedResult: 'Построение матрицы смежности $\\mathcal{A}$ и лапласиана связности $\\mathcal{L} = \\mathcal{D} - \\mathcal{A}$.',
        },
        {
          stepNumber: 2,
          title: 'Настройка коэффициентов стайного поведения Рейнольдса',
          action: 'Отрегулируйте веса сил разделения (Separation), выравнивания (Alignment) и сплочения (Cohesion).',
          uiTarget: 'Слайдеры параметров стаи Boids',
          expectedResult: 'Устойчивое синхронное движение роя без столкновений между дронами.',
        },
        {
          stepNumber: 3,
          title: 'Оптимизация V-образного клина для вихревого подсоса',
          action: 'Переключите строй на режим «V-клин» и совместите законцовки ведомых аппаратов с зоной восходящего скоса (Upwash) ведущих.',
          uiTarget: 'Селектор формаций: «Клин (V-formation)»',
          expectedResult: 'Снижение индуцированного сопротивления ведомых аппаратов на 15–20% и отображение экономии энергии $\\Delta E$.',
        },
        {
          stepNumber: 4,
          title: 'Обход препятствий с помощью искусственных потенциальных полей (APF)',
          action: 'Добавьте статические и подвижные зоны запрета полетов (No-Fly Zones) и наблюдайте за огибанием по градиенту $\\nabla U_{\\text{rep}}$.',
          uiTarget: 'Кнопка «Добавить препятствие»',
          expectedResult: 'Плавное синхронное разделение и последующее объединение строя роя.',
        },
        {
          stepNumber: 5,
          title: 'Стресс-тест отказоустойчивости при потере лидера',
          action: 'Инициируйте мгновенный отказ головного аппарата и проконтролируйте автоматический выбор нового лидера по алгоритму консенсуса.',
          uiTarget: 'Кнопка «Симулировать отказ лидера»',
          expectedResult: 'Бесшовное перестроение формации за время $< 0.8\\,\\text{с}$ без потери устойчивости роя.',
        },
      ],
      pitfallsAndTroubleshooting: [
        {
          issue: 'Колебания и потеря устойчивости строя (String Instability) при резком маневре ведущего',
          resolution: 'Используйте прогнозирующее управление с обратной связью (Distributed MPC) и увеличьте вес демпфирования скоростной невязки.',
        },
        {
          issue: 'Попадание ведомого аппарата в зону нисходящего скоса (Downwash core) с потерей высоты',
          resolution: 'Обеспечивайте положительное поперечное смещение законцовки ведомого $\\Delta y > 0.1 b$ наружу от следа ведущего.',
        },
      ],
      bestPractices: [
        'Для дальних перелетов групп БПЛА всегда используйте ротацию ведущего аппарата, так как лидер расходует на 15% больше энергии, чем ведомые в клине.',
        'Для распределения целеуказаний внутри роя применяйте распределенный аукционный алгоритм CBBA (Consensus-Based Bundle Algorithm).',
      ],
    },
    uiWalkthrough: {
      title: 'Интерфейс Роевого Модуля БПЛА',
      description: 'Позволяет моделировать кинематику сотен дронов, исследовать аэродинамику строя и проверять отказоустойчивость.',
      controls: [
        { name: 'Число БПЛА в рое $N$', type: 'Slider (3 – 64)', role: 'Количество автономных агентов в симуляции.' },
        { name: 'Тип формации', type: 'Selector', role: 'V-клин / Эшелон / Ромб / Хаотический рой.' },
        { name: 'Радиус связи $R_{\\text{comm}}$', type: 'Slider (м)', role: 'Дальность прямой радиовидимости между соседними аппаратами.' },
      ],
      readouts: [
        { name: 'Экономия энергии строя $\\Delta E$', unit: '%', interpretation: 'Процент снижения расхода батареи за счет полета в восходящем скосе спутных вихрей.' },
        { name: 'Алгебраическая связность $\\lambda_2(\\mathcal{L})$', unit: 'ед.', interpretation: 'Второе наименьшее собственное число лапласиана, мера робастности сети связи роя.' },
        { name: 'Минимальная дистанция $d_{\\text{min}}$', unit: 'м', interpretation: 'Фактический зазор между ближайшими аппаратами для контроля безопасности.' },
      ],
    },
    mathematics: {
      governingEquationLatex: '\\dot{\\mathbf{v}}_i = -\\sum_{j \\in \\mathcal{N}_i} a_{ij} \\nabla \\psi(\\|\\mathbf{q}_i - \\mathbf{q}_j\\|) - \\sum_{j \\in \\mathcal{N}_i} a_{ij} (\\mathbf{v}_i - \\mathbf{v}_j) + \\mathbf{f}_{\\text{upwash}}(\\Delta x_{ij}, \\Delta y_{ij})',
      description: 'Уравнения протокола консенсуса второго порядка Олфати-Сабера с учетом нелинейного аэродинамического подсоса от спутных вихрей.',
      derivationSteps: [
        'Анализ устойчивости через функцию Ляпунова роя: $V(\\mathbf{q}, \\mathbf{v}) = \\frac{1}{2}\\sum_i \\|\\mathbf{v}_i\\|^2 + \\sum_i \\sum_{j \\neq i} \\psi(\\|\\mathbf{q}_i - \\mathbf{q}_j\\|)$.',
        'Индуцированное снижение сопротивления ведомого в строю: $\\Delta C_{Di} = - C_{Li} \\frac{w_{\\text{upwash}}}{V_\\infty} < 0$.',
        'Скорость сходимости консенсуса ограничена спектральным зазором Лапласиана: $\\|\\mathbf{v}(t) - \\bar{\\mathbf{v}}\\| \\le e^{-\\lambda_2(\\mathcal{L}) t}$.',
      ],
    },
    physicalSignificance: [
      'Полет клином повторяет эволюционную механику перелетных птиц, повышая общую дальность всей группы БПЛА на 15–20%.',
      'Децентрализованный роевой интеллект исключает критические единые точки отказа: потеря любого аппарата мгновенно компенсируется роем.',
    ],
    references: [
      { authors: 'Olfati-Saber, R.', year: '2006', title: 'Flocking for Multi-Agent Dynamic Systems: Algorithms and Theory', publisher: 'IEEE Trans. Autom. Control' },
      { authors: 'Lissaman, P. B. S., & Shollenberger, C. A.', year: '1970', title: 'Formation Flight of Birds', publisher: 'Science' },
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

  // --- БПЛА, САПР, Роторы & Акустика ---
  {
    id: 'uav_bem_thrust',
    name: 'Тяга винта и фактор потерь Прандтля',
    symbolLatex: 'T = \\int_0^R dL \\cos\\phi - dD \\sin\\phi, \\quad F = \\frac{2}{\\pi}\\arccos(e^{-f})',
    category: 'uav_cad',
    categoryName: 'БПЛА & Роторы',
    location: 'БПЛА & Роторы -> BEM Калькулятор (Табло сил)',
    meaning: 'Осевая тяга воздушного винта или импеллера с учетом вихревых потерь на концевых кромках лопасти (Prandtl Tip-Loss).',
    howToConfigure: 'Задайте диаметр винта, шаг (Pitch), число лопастей $B$ и обороты RPM. Для мультироторов оптимизируйте тяговооруженность $> 2.0$.',
    howToObtain: 'Нажмите «Рассчитать BEM» $\\to$ получите тягу $T$ (Н), крутящий момент $Q$ (Н·м), фигуру качества $FM$ и потребляемую мощность $P_{\\text{aero}}$.',
    badge: 'Аэродинамика движителей',
  },
  {
    id: 'uav_raim_residual',
    name: 'Невязка RAIM & Махаланобис Антиспуфинга',
    symbolLatex: 'd_{\\text{Mahal}}^2 = \\mathbf{r}^T \\mathbf{S}^{-1} \\mathbf{r} > \\chi_{k, 1-\\alpha}^2',
    category: 'uav_cad',
    categoryName: 'БПЛА & Навигация',
    location: 'БПЛА & РЭБ -> Монитор Спуфинга (Индикатор целостности)',
    meaning: 'Квадратичное статистическое расстояние невязки измерений спутниковых псевдодальностей относительно ковариационной матрицы фильтра Калмана.',
    howToConfigure: 'Установите порог $\\chi^2$-критерия для обнаружения преднамеренной имитационной помехи (GPS/GLONASS spoofing).',
    howToObtain: 'При атаке РЭБ индикатор загорится красным, переключая навигационную систему БПЛА в автономный ИНС-режим (Dead Reckoning).',
    badge: 'Анти-РЭБ Защита',
  },
  {
    id: 'cad_mdo_pareto',
    name: 'Парето-Фронт Массы и Аэрокачества',
    symbolLatex: '\\min_{\\mathbf{x}} \\left( -\\frac{L}{D}(\\mathbf{x}), \\, m_{\\text{struct}}(\\mathbf{x}) \\right)',
    category: 'uav_cad',
    categoryName: 'САПР & MDO',
    location: 'САПР & Оптимизация -> Pareto Front View',
    meaning: 'Множество Парето-оптимальных компоновок планера, где невозможно улучшить качество $L/D$ без утяжеления конструкции лонжеронов.',
    howToConfigure: 'Задайте диапазон удлинения крыла $AR \\in [6, 14]$, стреловидности $\\chi$ и сужения $\\eta$.',
    howToObtain: 'Кликните на любую точку Парето-фронта $\\to$ 3D модель планера мгновенно перестроится с точными нервюрами и лонжеронами.',
    badge: 'Design-to-Fly САПР',
  },
  {
    id: 'supersonic_theta_beta',
    name: 'Угол Косого Скачка Уплотнения',
    symbolLatex: '\\tan\\theta = 2 \\cot\\beta \\frac{M_1^2 \\sin^2\\beta - 1}{M_1^2(\\gamma + \\cos 2\\beta) + 2}',
    category: 'uav_cad',
    categoryName: 'Сверхзвук',
    location: 'Сверхзвук & Гиперзвук -> Калькулятор Скачков',
    meaning: 'Фундаментальное соотношение угла клина $\\theta$, угла наклона скачка $\\beta$ и числа Маха набегающего потока $M_1$.',
    howToConfigure: 'При $\\theta > \\theta_{\\max}$ регулярный косой скачок отходит от носка, превращаясь в отошедшую головную ударную волну (Bow Shock).',
    howToObtain: 'Задайте число Маха $M=2.5$ и полуугол конуса $\\theta=15^\\circ$ $\\to$ получите угол $\\beta$, падение полного давления $P_{02}/P_{01}$ и температуру $T_2$.',
    badge: 'Газодинамика сжимаемости',
  },
  {
    id: 'acoustics_oaspl',
    name: 'Суммарный Уровень Звукового Давления (OASPL)',
    symbolLatex: 'p\'(\\mathbf{x}, t) = \\frac{1}{4\\pi} \\frac{\\partial}{\\partial t} \\left[ \\frac{\\rho_0 v_n}{r |1 - M_r|} \\right] + \\frac{1}{4\\pi c_0} \\frac{\\partial}{\\partial t} \\left[ \\frac{l_r}{r |1 - M_r|} \\right]',
    category: 'uav_cad',
    categoryName: 'Аэроакустика',
    location: 'Акустика & Шум -> Диаграмма Направленности (дБА)',
    meaning: 'Уровень шума лопастей в дБ (Acoustic Footprint), рассчитанный по акустической аналогии Фокса Вильямса — Хокингса (FW-H).',
    howToConfigure: 'Снижайте окружную скорость законцовки $M_{\\text{tip}} < 0.65$ и применяйте шевронные/саблевидные законцовки лопастей.',
    howToObtain: 'Диаграмма направленности шума в виде 3D тора отображает зоны максимального излучения звука под винтом.',
    badge: 'Акустическая малозаметность',
  },
  {
    id: 'swarm_laplacian_lambda2',
    name: 'Алгебраическая Связность Роя (Спектральный Зазор)',
    symbolLatex: '\\lambda_2(\\mathcal{L}) > 0, \\quad \\mathcal{L} = \\mathcal{D} - \\mathcal{A}',
    category: 'uav_cad',
    categoryName: 'Роевой Интеллект',
    location: 'Роевое Управление -> Матрица Связности',
    meaning: 'Второе наименьшее собственное число матрицы Лапласиана графа связи группы БПЛА, определяющее скорость сходимости роя и отказоустойчивость.',
    howToConfigure: 'Поддерживайте $\\lambda_2 > 0.5$ для гарантированного сохранения строя даже при радиоэлектронном подавлении отдельных узлов.',
    howToObtain: 'Граф связи роя в реальном времени визуализирует топологию mesh-сети и энергосбережение от интерференции концевых вихрей.',
    badge: 'Консенсус и строй',
  },
  {
    id: 'input_sweep_angle',
    name: 'Стреловидность крыла по передней кромке',
    symbolLatex: '\\chi_{\\text{LE}} \\quad (^\\circ)',
    category: 'input',
    categoryName: 'Входные Параметры',
    location: 'VLM Крыло, САПР Геометрии, Пресеты ЛА (Слайдер)',
    meaning: 'Угол отклонения передней кромки крыла назад относительно перпендикуляра к строительной оси фюзеляжа.',
    howToConfigure: 'Для трансзвуковых и сверхзвуковых аппаратов $\\chi = 25^\\circ...45^\\circ$ для снижения эффективного числа Маха $M_n = M \\cos\\chi$.',
    howToObtain: 'Изменяйте стреловидность $\\to$ 3D каркас крыла и распределение циркуляции $\\Gamma(y)$ перестраиваются в реальном времени.',
    badge: 'Стреловидность крыла',
  },
  {
    id: 'input_aspect_ratio',
    name: 'Удлинение крыла',
    symbolLatex: 'AR = \\frac{b^2}{S} = \\frac{b}{c_{\\text{mean}}}',
    category: 'input',
    categoryName: 'Входные Параметры',
    location: 'VLM Крыло, САПР Геометрии, Пресеты ЛА (Слайдер)',
    meaning: 'Отношение квадрата размаха крыла $b^2$ к его несущей площади $S$. Ключевой параметр индуктивного сопротивления.',
    howToConfigure: 'Планеры и БПЛА большой дальности (HALE): $AR = 18...28$; Истребители: $AR = 2.5...4.5$; Пассажирские лайнеры: $AR = 9...12$.',
    howToObtain: 'Увеличение $AR$ снижает индуктивное сопротивление $C_{Di}$ обратно пропорционально $\\pi AR e$.',
    badge: 'Геометрия крыла',
  },
  {
    id: 'out_static_margin',
    name: 'Запас статической устойчивости',
    symbolLatex: 'SM = \\frac{x_{\\text{NP}} - x_{\\text{CG}}}{c} \\times 100\\%',
    category: 'aero_output',
    categoryName: 'Выходные Метрики',
    location: '6-DoF Полет, Монитор Балансировки (Табло)',
    meaning: 'Расстояние между нейтральной точкой $x_{\\text{NP}}$ (фокусом ЛА) и центром тяжести $x_{\\text{CG}}$, выраженное в долях хорды.',
    howToConfigure: 'Гражданская авиация: $SM = +5\\%...+12\\%$ (устойчив); Сверхманевренные истребители: $SM = -2\\%...-5\\%$ (статически неустойчив, ЭДСУ).',
    howToObtain: 'Индикатор горит зеленым при $SM > 0$ и предупреждает красным при задней центровке $SM < 0$.',
    badge: 'Балансировка & Фокус',
  },
  {
    id: 'out_induced_drag',
    name: 'Индуктивное сопротивление',
    symbolLatex: 'C_{Di} = \\frac{C_L^2}{\\pi \\cdot AR \\cdot e}',
    category: 'aero_output',
    categoryName: 'Выходные Метрики',
    location: 'Монитор Сил, VLM Распределение (Табло)',
    meaning: 'Сопротивление, вызванное скосом потока (downwash) от концевых вихрей крыла конечного размаха.',
    howToConfigure: 'Снижается за счет увеличения удлинения $AR$, эллиптического распределения циркуляции ($e \\to 1.0$) и законцовок-винглетов (Winglets).',
    howToObtain: 'Составляет до 40–50% от суммарного сопротивления самолета на взлете и наборе высоты.',
    badge: 'Индуктивный скос',
  },
  {
    id: 'uav_link_margin',
    name: 'Энергетический Запас Радиолинии',
    symbolLatex: 'M_{\\text{link}} = P_{\\text{rx}} - S_{\\text{rx}} \\ge 10 \\text{ дБ}',
    category: 'uav_cad',
    categoryName: 'БПЛА & Связь',
    location: 'БПЛА & Радиолиния -> Link Budget Monitor',
    meaning: 'Превышение мощности принимаемого радиосигнала $P_{\\text{rx}}$ над порогом чувствительности приемника $S_{\\text{rx}}$ с учетом затухания FSPL.',
    howToConfigure: 'Поддерживайте $M_{\\text{link}} > 10$ дБ для устойчивого управления БПЛА в условиях городской застройки и атмосферных осадков.',
    howToObtain: 'Карта радиовидимости показывает предельную дальность телеметрии и видеолинка при текущей высоте и мощности передатчика.',
    badge: 'Радиолиния БПЛА',
  },
];

export interface WorkspaceZoneInfo {
  id: number;
  numberBadge: string;
  title: string;
  shortDomain: string;
  location: string;
  role: string;
  keyControls: string[];
  inputsAndOutputs: {
    inputs: string;
    outputs: string;
  };
  solversConnected: string[];
  proTip: string;
  colorTheme: {
    border: string;
    bgActive: string;
    badge: string;
    text: string;
    ring: string;
  };
}

export const WORKSPACE_ZONES: WorkspaceZoneInfo[] = [
  {
    id: 1,
    numberBadge: '1',
    title: 'Верхняя Навигационная Панель Доменов и Режимов',
    shortDomain: 'GLOBAL NAVIGATION',
    location: 'Верхняя фиксированная шапка экрана (Sticky Header)',
    role: 'Переключение глобальных инженерных дисциплин платформы (✈️ Аэродинамика & CFD, 🚀 Космонавтика & GNC, 🛰️ Микроэлектроника & EDA), а также переход в общие решатели СЛАУ и ДУ.',
    keyControls: [
      'Селекторы дисциплин: Аэродинамика / Космонавтика / Микроэлектроника',
      'Кнопки перехода в Решатель СЛАУ (Sparse Linear) и Решатель ДУ (ODE/PDE)',
      'Индикатор авторизации SuperAdmin и кнопка инженерной консоли',
      'Вызов Научно-технического Справочника (Engineering Handbook) и Дорожной Карты',
      'Переключатель вычислительного движка (CPU Multi-thread / NVIDIA WebGPU)',
    ],
    inputsAndOutputs: {
      inputs: 'Выбор активной инженерной задачи, загрузка профильных пресетов.',
      outputs: 'Мгновенная реконфигурация интерфейса студии, загрузка специализированных 3D моделей и солверов.',
    },
    solversConnected: [
      'Диспетчер вычислительных модулей (Core Architecture Dispatcher)',
      'Менеджер профилей пользователей и прав доступа SuperAdmin',
      'Служба аппаратной телеметрии WebGPU & Web Workers',
    ],
    proTip: 'При переключении между доменами все текущие расчетные сетки и результаты сохраняются в оперативной сессии, позволяя мгновенно сопоставлять смежные дисциплины.',
    colorTheme: {
      border: 'border-cyan-500/50',
      bgActive: 'bg-cyan-950/80',
      badge: 'bg-cyan-500 text-slate-950',
      text: 'text-cyan-300',
      ring: 'ring-cyan-500/40',
    },
  },
  {
    id: 2,
    numberBadge: '2',
    title: 'Дека Параметров Полета, Профилей и Геометрии',
    shortDomain: 'FLIGHT & GEOMETRY DECK',
    location: 'Левая колонка / Верхняя панель параметров в модулях',
    role: 'Задание граничных условий набегающего потока (угол атаки $\\alpha$, скольжение $\\beta$, число Маха $M$, высота полета $H$, плотность $\\rho$), выбор формы профиля (библиотека NACA/ЦАГИ) и геометрических параметров крыла.',
    keyControls: [
      'Ползунки кинематики полета: Угол атаки $\\alpha \\in [-10^\\circ, +25^\\circ]$, Число Маха $M \\in [0.05, 3.5]$, Высота $H \\in [0, 30]$ км',
      'Параметризация крыла: Размах $b$, корневая хорда $c_r$, сужение $\\eta$, стреловидность $\\chi$, крутка $\\theta$',
      'Каталог аэродинамических пресетов ЛА (Су-27, Ан-2, F-16, БПЛА Орлан, Квадрокоптер, Камикадзе)',
      'Тумблеры поправок сжимаемости (Прандтль-Глауэрт, Карман-Тзян, Ван Дайк)',
    ],
    inputsAndOutputs: {
      inputs: 'Физические и кинематические параметры среды и геометрии.',
      outputs: 'Сформированный вектор граничных условий для решателей сетки и расчетные безразмерные критерии ($Re, M, CFL$).',
    },
    solversConnected: [
      'FVM 2D/3D CFD Solver',
      'Vortex Lattice Method (VLM)',
      'Blade Element Momentum (BEM)',
      'Стандартная Атмосфера ГОСТ 4401-81 / ICAO',
    ],
    proTip: 'Для дозвуковых профилей удерживайте $M < 0.7$; при $M > 0.8$ активируйте трансзвуковую поправку Кармана-Тзяна для корректного учета скачков уплотнения.',
    colorTheme: {
      border: 'border-indigo-500/50',
      bgActive: 'bg-indigo-950/80',
      badge: 'bg-indigo-500 text-slate-950',
      text: 'text-indigo-300',
      ring: 'ring-indigo-500/40',
    },
  },
  {
    id: 3,
    numberBadge: '3',
    title: 'Интерактивный 3D/2D Вычислительный Вьюпорт',
    shortDomain: 'INTERACTIVE 3D VIEWPORT',
    location: 'Центральная рабочая область (Three.js WebGL Canvas)',
    role: 'Полнофункциональная пространственная 3D визуализация обтекания летательного аппарата, изоповерхностей завихренности $Q$-критерия, секущих срезов поля давлений $C_p$, динамических лагранжевых линий тока и векторных эпюр скоростей.',
    keyControls: [
      'Манипуляция камерой: Орбитальное вращение (ЛКМ), Панорамирование (ПКМ/Shift), Зум (Колесо)',
      'Тумблеры слоев: Каркасная сетка (Wireframe), Изоповерхности вихрей Q, Линии тока частиц',
      'Секущие плоскости Cut Planes: Перемещение срезов по осям $X$ (хорда), $Y$ (высота), $Z$ (размах)',
      'A/B Сплит-компаратор для одновременного сравнения двух режимов полета',
      'Кнопки быстрой ориентации камеры: Вид сверху (Top), Сбоку (Side), Спереди (Front), Изометрия (ISO)',
    ],
    inputsAndOutputs: {
      inputs: '3D полигональная сетка крыла/планера и поле гидродинамических параметров из солвера.',
      outputs: 'Фотореалистичный интерактивный рендеринг с аппаратным затенением, картой Маха и визуализацией концевых вихрей.',
    },
    solversConnected: [
      'Three.js WebGL/WebGPU Rendering Pipeline',
      'Интерполятор вихревых полей $Q = \\frac{1}{2}(\\|\\Omega\\|^2 - \\|S\\|^2)$',
      'Генератор лагранжевых трассеров дыма (Particle Streamline Tracer)',
    ],
    proTip: 'Активируйте секущую плоскость $XZ$ по центру полуразмаха крыла $Z = 0.5b$, чтобы в реальном времени наблюдать замыкающий скачок уплотнения и толщину турбулентного пограничного слоя.',
    colorTheme: {
      border: 'border-emerald-500/50',
      bgActive: 'bg-emerald-950/80',
      badge: 'bg-emerald-500 text-slate-950',
      text: 'text-emerald-300',
      ring: 'ring-emerald-500/40',
    },
  },
  {
    id: 4,
    numberBadge: '4',
    title: 'Телеметрия Сил, Моментов и Сходимости',
    shortDomain: 'FORCES & CONVERGENCE TELEMETRY',
    location: 'Нижняя / Правая информационная панель',
    role: 'Мгновенный вывод фундаментальных аэродинамических сил и моментов ($C_L, C_D, C_M, L/D$), размерных сил в Ньютонах, графика поляры Лилиенталя $C_L(C_D)$ и логарифмического спарклайна невязки решения GMRES/LUSGS.',
    keyControls: [
      'Числовые табло: Подъемная сила $C_L$, Лобовое сопротивление $C_D$, Момент тангажа $C_M$, Аэродинамическое качество $K = L/D$',
      'График эпюры распределения давления $C_p(x/c)$ вдоль верхней (спинка) и нижней (корыто) дужки',
      'Поляра крыла с автоматическим лучом касания максимального аэродинамического качества $(L/D)_{\\max}$',
      'Спарклайн мониторинга сходимости невязок $\\|r_k\\|_2 / \\|r_0\\|_2$ с индикатором статуса сходимости',
    ],
    inputsAndOutputs: {
      inputs: 'Тензор давлений и касательных напряжений с поверхности расчетной сетки.',
      outputs: 'Суммарные интегральные векторы подъемной силы, сопротивления, положение аэродинамического фокуса $x_{\\text{ac}}$.',
    },
    solversConnected: [
      'Интегратор поверхностных сил Гаусса $\\oint (p \\mathbf{n} + \\tau_w \\mathbf{t}) ds$',
      'Монитор сходимости GMRES / LUSGS / RK4',
      'Калькулятор статической устойчивости и балансировки',
    ],
    proTip: 'Строгая сходимость считается достигнутой, когда спарклайн невязки опускается ниже $10^{-6}$, а интегральные коэффициенты $C_L, C_D$ стабилизируются с точностью до 4-го знака.',
    colorTheme: {
      border: 'border-amber-500/50',
      bgActive: 'bg-amber-950/80',
      badge: 'bg-amber-500 text-slate-950',
      text: 'text-amber-300',
      ring: 'ring-amber-500/40',
    },
  },
  {
    id: 5,
    numberBadge: '5',
    title: 'Специализированные Лаборатории БПЛА, Роторов & Сверхзвука',
    shortDomain: 'ADVANCED UAV & SUPERSONIC LABS',
    location: 'Вкладки в блоке «Аэродинамика БПЛА & Спецмодули»',
    role: 'Комплекс из 12 глубоких инженерных лабораторий: расчет винтомоторных групп (BEM), навигация в условиях помех РЭБ и антиспуфинг с фильтром EKF2, радиолинии ретрансляции, VTOL-конвертопланы, роевой строй (V-Formation), аэроакустика FW-H, отказ моторов, обледенение, сверхзвуковые скачки $\\theta$-$\\beta$-$M$.',
    keyControls: [
      'BEM Роторы: Диаметр винта, шаг, профиль лопасти, обороты RPM, расчет тяги $T$ и мощности $P$',
      'РЭБ & Навигация: Симуляция глушения GNSS, контроль невязки Махаланобиса RAIM, режим Safe RTH',
      'Роевое управление: Выбор строя (Клин, Пеленг, Фронт), спектральный зазор $\\lambda_2(\\mathcal{L})$, экономия энергии',
      'Аэроакустика FW-H: Расчет шума в дБА (OASPL), гармоники BPF, саблевидные законцовки',
      'Сверхзвук: Расчет косых скачков $\\theta$-$\\beta$-$M$, волновое сопротивление по Area Rule, нагрев Фэя-Ридделла',
    ],
    inputsAndOutputs: {
      inputs: 'Геометрические, акустические, радиочастотные и роевые параметры миссии БПЛА.',
      outputs: 'Тяговооруженность, диаграммы направленности шума, зоны покрытия связи, Парето-фронт САПР.',
    },
    solversConnected: [
      'Blade Element Momentum Theory с поправками Прандтля и Глауэрта',
      '15-состояний Расширенный Фильтр Калмана (EKF2) + RAIM $\\chi^2$',
      'Акустическая аналогия Фокса Вильямса — Хокингса (FW-H)',
      'Газодинамические соотношения косых скачков и волн Прандтля-Майера',
    ],
    proTip: 'При проектировании мультироторов и БПЛА используйте совместный расчет BEM и Аэроакустики: применение саблевидных законцовок лопастей снижает шум на 4 дБА без потери статической тяги.',
    colorTheme: {
      border: 'border-rose-500/50',
      bgActive: 'bg-rose-950/80',
      badge: 'bg-rose-500 text-slate-950',
      text: 'text-rose-300',
      ring: 'ring-rose-500/40',
    },
  },
  {
    id: 6,
    numberBadge: '6',
    title: 'Центр Экспорта Отчетов & CAE Форматов',
    shortDomain: 'CAE & REPORT EXPORT STUDIO',
    location: 'Вкладка «Экспорт и Отчеты» в панели аэродинамики',
    role: 'Сквозной экспорт результатов расчетов, геометрии и сеток в промышленные форматы САПР/CAE и автоматическая генерация официального PDF-отчета по ГОСТ 2.105 с формулами, графиками и сводными таблицами.',
    keyControls: [
      'Генератор PDF: Выбор разделов отчета, включение графиков $C_p$, поляр, параметров сходимости, экспорт по ГОСТ',
      'Экспорт 3D сетки в ParaView Legacy (.VTK) для внешней пост-обработки',
      'Экспорт расчетного конфигурационного файла SU2 (.cfg) для HPC-кластеров',
      'Экспорт 2D лекал нервюр и лонжеронов в AutoCAD (.DXF) для лазерной резки',
      'Экспорт твердотельной 3D модели планера и винтов в формат .STL для 3D-печати',
    ],
    inputsAndOutputs: {
      inputs: 'Сгенерированные поля давлений, сетка крыла, интегральные коэффициенты и параметры геометрии.',
      outputs: 'Готовые к печати PDF-документы и CAD/CAE файлы в стандартных форматах обмена данными.',
    },
    solversConnected: [
      'Движок генерации векторных документов PDF',
      'VTK Unstructured Grid Mesh Serializer',
      'Конвертер профилей в DXF Polyline & STL Facet Mesh',
    ],
    proTip: 'Экспортируемый файл SU2 содержит полностью настроенные граничные условия (Euler/RANS Farfield + Inviscid Wall), готовые к запуску командой `SU2_CFD config.cfg` на суперкомпьютере.',
    colorTheme: {
      border: 'border-purple-500/50',
      bgActive: 'bg-purple-950/80',
      badge: 'bg-purple-500 text-slate-950',
      text: 'text-purple-300',
      ring: 'ring-purple-500/40',
    },
  },
  {
    id: 7,
    numberBadge: '7',
    title: 'Аппаратный Ускоритель & NVIDIA GPU Inspector',
    shortDomain: 'HARDWARE & GPU ACCELERATION',
    location: 'Верхняя полоса аппаратного статуса / Модальный инспектор GPU',
    role: 'Управление аппаратным ускорением расчетов, выбор вычислительного бэкенда (Многопоточный Web Workers CPU против аппаратного WebGPU / NVIDIA CUDA) и мониторинг утилизации ресурсов.',
    keyControls: [
      'Переключатель вычислительного бэкенда: CPU (SIMD Web Workers) / GPU (WebGPU Shaders)',
      'Индикатор доступной видеопамяти VRAM, количества тензорных ядер и пиковой производительности TFLOPS',
      'Журнал времени итераций и факторизации разреженных матриц в миллисекундах',
      'Автоматический fallback на высокооптимизированный CPU-движок при отсутствии WebGPU',
    ],
    inputsAndOutputs: {
      inputs: 'Вычислительные ядра решателей СЛАУ (Krylov/GMRES) и сеточных CFD-солверов.',
      outputs: 'Аппаратное ускорение факторизации матриц в 10–30 раз и плавная 3D визуализация с 60 FPS.',
    },
    solversConnected: [
      'WebGPU Compute Pipeline (WGSL Compute Shaders)',
      'Web Workers Parallel Sparse Matrix Accelerator',
      'Диспетчер аппаратных ресурсов платформы',
    ],
    proTip: 'При решении сеток размерностью свыше $50\\,000$ ячеек или систем уравнений размерностью $N > 10\\,000$ включение WebGPU сокращает время расчета с секунд до десятков миллисекунд.',
    colorTheme: {
      border: 'border-sky-500/50',
      bgActive: 'bg-sky-950/80',
      badge: 'bg-sky-500 text-slate-950',
      text: 'text-sky-300',
      ring: 'ring-sky-500/40',
    },
  },
];

export const SOP_RECIPES: SOPRecipe[] = [
  {
    id: 'recipe_aero_forces',
    recipeNumber: 1,
    title: 'Рецепт 1: Расчет Поляр и Несущих Свойств Профиля (C_L, C_D, C_m)',
    tag: 'Аэродинамика & CFD',
    targetDomain: 'CFD & Аэро',
    difficulty: 'Базовый',
    category: 'aero',
    categoryName: 'Аэродинамика & CFD',
    prerequisites: ['Базовые геометрические параметры хорды', 'Режим полета (H, M, alpha)'],
    verificationCriteria: 'Невязка ||r_k||_2 < 10^-6, плавный вид эпюры давлений Cp(x/c) без осцилляций.',
    relatedTopicId: 'physics_solvers',
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
    recipeNumber: 2,
    title: 'Рецепт 2: Построение и Анализ 3D Вихревого Следа (Q-критерий + Срезы)',
    tag: '3D Визуализация',
    targetDomain: '3D Лаборатория',
    difficulty: 'Средний',
    category: 'aero',
    categoryName: 'Аэродинамика & CFD',
    prerequisites: ['Активированная 3D сцена', 'Заданный угол атаки alpha > 4 deg'],
    verificationCriteria: 'Наличие непрерывного вихревого жгута за законцовкой с пиком завихренности |omega|.',
    relatedTopicId: 'visual_studio',
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
    recipeNumber: 3,
    title: 'Рецепт 3: Поиск Критической Скорости Изгибно-Крутильного Флаттера',
    tag: 'Аэроупругость',
    targetDomain: 'Флаттер & Динамика',
    difficulty: 'Продвинутый',
    category: 'flight',
    categoryName: 'Динамика & Флаттер',
    prerequisites: ['Массово-инерционные характеристики сечения', 'Парциальные жесткости Kh, Ktheta'],
    verificationCriteria: 'Коэффициент демпфирования g(V) пересекает 0 снизу вверх; запас eta_safe >= 1.20.',
    relatedTopicId: 'flutter',
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
    recipeNumber: 4,
    title: 'Рецепт 4: Моделирование 6-DoF Полета и Продольной Балансировки',
    tag: 'Динамика Полета',
    targetDomain: 'Флаттер & Динамика',
    difficulty: 'Средний',
    category: 'flight',
    categoryName: 'Динамика & Флаттер',
    prerequisites: ['Тензор инерции J', 'Производные устойчивости C_m_alpha, C_m_q'],
    verificationCriteria: 'Период короткопериодических колебаний T_sp < 3 с, степень затухания xi > 0.35.',
    relatedTopicId: '6dof',
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
      {
        stepNumber: 3,
        title: 'Контроль перегрузки и балансировки',
        description: 'Проконтролируйте установившуюся перегрузку $n_y$ и триммерный угол $\\delta_{e,\\text{trim}}$.',
        whereToClick: 'Прибор PFD -> Шкала $n_y$',
        expectedOutcome: 'Стабилизация продольного момента $C_M = 0$ и удержание постоянного угла тангажа.',
      },
    ],
    proTip: 'Следите за шкалой перегрузки $n_y$. Нормативный предел для пассажирских самолетов составляет $+2.5g / -1.0g$.',
  },
  {
    id: 'recipe_space_lambert',
    recipeNumber: 5,
    title: 'Рецепт 5: Расчет Межпланетного Перелета Ламберта и Входа в Атмосферу',
    tag: 'Космонавтика & GNC',
    targetDomain: 'Космос & GNC',
    difficulty: 'Экспертный',
    category: 'space',
    categoryName: 'Космонавтика & GNC',
    prerequisites: ['Параметры орбиты отправления r1', 'Параметры целевой орбиты r2', 'Время полета dt'],
    verificationCriteria: 'Суммарный характеристический импульс Delta V <= Delta V_budget, тепловой поток q_dot < q_dot_allowable.',
    relatedTopicId: 'space_gnc',
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
    recipeNumber: 6,
    title: 'Рецепт 6: Стресс-Тест Авионики под Радиацией и Верификация TMR',
    tag: 'Микроэлектроника & EDA',
    targetDomain: 'EDA & Авионика',
    difficulty: 'Продвинутый',
    category: 'eda',
    categoryName: 'Микроэлектроника & EDA',
    prerequisites: ['Модель цифрового блока ALU', 'Интенсивность радиационного потока Phi_ion'],
    verificationCriteria: 'Вероятность неисправности P_fail(TMR) < 10^-5 при потоке 10^5 ион/см2*с.',
    relatedTopicId: 'eda_avionics',
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
    recipeNumber: 7,
    title: 'Рецепт 7: Генерация Инженерного Отчета по ГОСТ и Экспорт в ParaView / SU2',
    tag: 'Экспорт & Документация',
    targetDomain: 'Экспорт & CAE',
    difficulty: 'Базовый',
    category: 'cad',
    categoryName: 'САПР & Экспорт',
    prerequisites: ['Завершенный расчет CFD/Аэро', 'Стабилизированные невязки'],
    verificationCriteria: 'Валидный синтаксис файлов .vtk, .cfg и корректная верстка PDF ГОСТ 7.32.',
    relatedTopicId: 'export_report',
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
        title: 'Выгрузка сетки ParaView (.vtk) и конфига SU2',
        description: 'Нажмите кнопку «Скачать ParaView Legacy (.vtk)» для экспорта 3D структурированной сетки и «Конфиг SU2 (.cfg)».',
        whereToClick: 'Секция CAE-экспорта -> Кнопка «ParaView VTK» / «SU2 Config»',
        expectedOutcome: 'Скачивание текстовых файлов, готовых к открытию в ParaView, ANSYS Fluent или OpenFOAM.',
      },
    ],
    proTip: 'Файлы конфигурации SU2 (`.cfg`) можно использовать для прямого запуска высокопроизводительного RANS-расчета на суперкомпьютерных кластерах.',
  },
  {
    id: 'recipe_bem_ducted_fan',
    recipeNumber: 8,
    title: 'Рецепт 8: Расчет и Оптимизация Винта/Импеллера БПЛА (BEM & Ducted Fan)',
    tag: 'БПЛА & Роторы',
    targetDomain: 'БПЛА & Роторы',
    difficulty: 'Средний',
    category: 'uav',
    categoryName: 'БПЛА & Роторы',
    prerequisites: ['Радиус винта R, обороты RPM', 'Профиль лопасти Clark-Y/NACA'],
    verificationCriteria: 'Фигура качества висения FM = 0.65..0.82, сходимость индукции a < 0.5.',
    relatedTopicId: 'bem_propulsion',
    goal: 'Рассчитать аэродинамическую тягу $T$, крутящий момент $Q$, потребляемую мощность и фигуру качества $FM$ воздушного винта или импеллера с учетом потерь на концах лопастей.',
    estimatedTime: '1.5 минуты',
    steps: [
      {
        stepNumber: 1,
        title: 'Геометрия винта и закон крутки',
        description: 'Задайте радиус винта $R$, число лопастей $B=2..4$, корневой и концевой углы установки лопасти $\\beta(r)$, хорду $c(r)$ и выберите аэродинамический профиль (например, Clark-Y или NACA 4412).',
        whereToClick: 'Модуль «БПЛА & Роторы» -> Вкладка «Геометрия Лопасти»',
        expectedOutcome: '3D интерактивная модель винта перестраивается с непрерывным распределением хорды и крутки.',
      },
      {
        stepNumber: 2,
        title: 'Кинематика и режим работы',
        description: 'Установите обороты двигателя RPM (например, 6000 об/мин) и скорость набегающего потока $V_\\infty$ (0 м/с для режима висения Hover или 15 м/с для крейсерского полета).',
        whereToClick: 'Панель «Рабочая Точка & Кинематика» -> Слайдеры RPM и $V_\\infty$',
        expectedOutcome: 'Автоматический расчет коэффициента поступи $J = V_\\infty / (n D)$ и окружной скорости законцовки $M_{\\text{tip}}$.',
      },
      {
        stepNumber: 3,
        title: 'Запуск BEM-солвера & Оценка Кольцевого Насадка (Duct)',
        description: 'Нажмите «Рассчитать BEM». При необходимости активируйте тумблер «Кольцевой насадок (Ducted Fan)» с диффузорным расширением.',
        whereToClick: 'Кнопка «Запустить BEM Анализ»',
        expectedOutcome: 'Схождение итераций индукции $a, a\'$, вывод тяги $T$, КПД $\\eta$, момента $Q$ и прироста тяги от насадка $\\Delta T_{\\text{duct}} = 15..25\%$.',
      },
    ],
    proTip: 'При $M_{\\text{tip}} > 0.65$ включайте поправку на сжимаемость Прандтля-Глауэрта, чтобы избежать недооценки крутящего момента из-за волновых эффектов.',
  },
  {
    id: 'recipe_uav_anti_jamming_rth',
    recipeNumber: 9,
    title: 'Рецепт 9: Навигация БПЛА в Условиях РЭБ & Возврат Домой (Anti-Jamming)',
    tag: 'БПЛА & Навигация',
    targetDomain: 'БПЛА & Роторы',
    difficulty: 'Продвинутый',
    category: 'uav',
    categoryName: 'БПЛА & Роторы',
    prerequisites: ['Сенсорный пул (IMU, Baro, Mag, GPS)', 'Калиброванные шумы ковариации R, Q'],
    verificationCriteria: 'Детектор RAIM изолирует спуфинг за t < 200 мс; дрейф координат RTH < 3% пути.',
    relatedTopicId: 'uav_navigation_ew',
    goal: 'Настроить многосенсорный фильтр Калмана (EKF2) для парирования спуфинга GNSS, фильтрации помех РЭБ и безопасного возврата аппарата на точку старта (RTH).',
    estimatedTime: '2 минуты',
    steps: [
      {
        stepNumber: 1,
        title: 'Конфигурация датчикового пула',
        description: 'Активируйте датчики: 3-осевой акселерометр/гироскоп IMU (100 Гц), барометр высоты, магнитометр и модуль GNSS.',
        whereToClick: 'Модуль «БПЛА & РЭБ» -> Панель «Сенсорный Пул»',
        expectedOutcome: 'Запуск многоуровневой фильтрации EKF2, индикация шумов измерений $\\mathbf{R}$ и дисперсии процесса $\\mathbf{Q}$.',
      },
      {
        stepNumber: 2,
        title: 'Активация RAIM & Детектора Спуфинга',
        description: 'Включите контроль целостности измерений RAIM по $\\chi^2$-критерию расстояния Махаланобиса.',
        whereToClick: 'Тумблер «RAIM & GNSS Spoofing Detection»',
        expectedOutcome: 'При искусственном скачке координат GNSS невязка превышает порог, EKF мгновенно изолирует спутник и переходит в автономное счисление пути (Dead Reckoning).',
      },
      {
        stepNumber: 3,
        title: 'Тест алгоритма RTH (Return-to-Home)',
        description: 'Инициируйте тест потери связи «Jamming Strike» $\\to$ проверьте удержание курса по оптическому потоку (Optical Flow) и возврат по инерциальным координатам.',
        whereToClick: 'Кнопка «Симуляция Атаки РЭБ»',
        expectedOutcome: 'Траектория БПЛА разворачивается на точку Home, дрейф координат не превышает 2.5% от пройденной дистанции.',
      },
    ],
    proTip: 'Калибруйте масштабный коэффициент акселерометра перед полетом — это снижает накопленную квадратичную ошибку положения $\\frac{1}{2} a t^2$ в автономном режиме в 4 раза.',
  },
  {
    id: 'recipe_aero_cad_design_to_fly',
    recipeNumber: 10,
    title: 'Рецепт 10: Сквозное Проектирование Планера (CAD -> MDO -> STL/DXF)',
    tag: 'САПР & Оптимизация',
    targetDomain: 'САПР & MDO',
    difficulty: 'Продвинутый',
    category: 'cad',
    categoryName: 'САПР & Экспорт',
    prerequisites: ['Геометрические границы планера', 'Ограничения по массе и устойчивости'],
    verificationCriteria: 'Коэффициент устойчивости Static Margin SM >= 10%, гладкий Парето-фронт NSGA-II.',
    relatedTopicId: 'aero_cad_mdo',
    goal: 'Сгенерировать параметрический планер летательного аппарата, провести многодисциплинарную оптимизацию формы и выгрузить лекала нервюр в DXF и STL.',
    estimatedTime: '2 минуты',
    steps: [
      {
        stepNumber: 1,
        title: 'Параметризация крыла и фюзеляжа',
        description: 'Задайте размах $b$, корневую и концевую хорды $c_r, c_t$, стреловидность $\\chi$, крутку $\\theta_{\\text{twist}}$ и профиль.',
        whereToClick: 'Модуль «Аэро САПР & MDO» -> Редактор Планера',
        expectedOutcome: 'Автоматическая генерация B-Spline поверхностей и 3D твердотельного каркаса (лонжероны, нервюры, обшивка).',
      },
      {
        stepNumber: 2,
        title: 'Многокритериальная MDO-оптимизация (NSGA-II)',
        description: 'Задайте целевые функции: максимизация аэрокачества $(L/D)$ и минимизация массы конструкции $m_{\\text{struct}}$ при ограничении запаса устойчивости $SM \\ge 10\%$. Нажмите «Запустить MDO».',
        whereToClick: 'Панель MDO -> Кнопка «Поиск Парето-Фронта»',
        expectedOutcome: 'Эволюционный алгоритм строит облако Парето-оптимальных решений. Выберите компромиссную точку на графике.',
      },
      {
        stepNumber: 3,
        title: 'Экспорт лекал и 3D модели',
        description: 'Нажмите «Экспорт лекал нервюр (.DXF)» для лазерной резки и «Экспорт сборки (.STL)» для 3D печати.',
        whereToClick: 'Секция экспорта САПР -> Кнопки «Экспорт DXF» и «Экспорт STL»',
        expectedOutcome: 'Генерация файлов векторных контуров нервюр с пазами под лонжероны и триангулированной 3D сетки.',
      },
    ],
    proTip: 'При экспорте DXF всегда проверяйте толщину пазов под фанеру/карбон с учетом керфа (ширины реза) лазерного станка (обычно 0.15–0.20 мм).',
  },
  {
    id: 'recipe_supersonic_shock_wave',
    recipeNumber: 11,
    title: 'Рецепт 11: Сверхзвуковой Расчет Скачков & Теплозащиты (Mach 1.5 - 5.0)',
    tag: 'Сверхзвук & Газодинамика',
    targetDomain: 'CFD & Аэро',
    difficulty: 'Экспертный',
    category: 'aero',
    categoryName: 'Аэродинамика & CFD',
    prerequisites: ['Число Маха M > 1.2', 'Угол клина theta < theta_max'],
    verificationCriteria: 'Решение уравнения тета-бета-M существует; угол скачка бета > arcsin(1/M).',
    relatedTopicId: 'supersonic_hypersonic',
    goal: 'Рассчитать систему косых скачков уплотнения, веер волн разрежения Прандтля-Майера, волновое сопротивление по Правилу Площадей Уиткомба и температуру торможения $T_0$.',
    estimatedTime: '1.5 минуты',
    steps: [
      {
        stepNumber: 1,
        title: 'Задание сверхзвукового режима полета',
        description: 'Установите число Маха $M_\\infty = 2.2$ и полуугол конуса/клина $\\theta = 12^\\circ$.',
        whereToClick: 'Модуль «Сверхзвук & Гиперзвук» -> Панель параметров Маха',
        expectedOutcome: 'Решение трансцендентного уравнения $\\theta$-$\\beta$-$M$, построение линии косого скачка под углом $\\beta = 36.4^\\circ$.',
      },
      {
        stepNumber: 2,
        title: 'Анализ распределения площадей (Area Rule)',
        description: 'Проверьте график гладкости эквивалентной площади поперечных сечений $S(x)$ вдоль продольной оси.',
        whereToClick: 'Вкладка «Whitcomb Area Rule»',
        expectedOutcome: 'Оценка градиента $S\'\'(x)$ и пика волнового сопротивления $C_{Dw}$ при переходе звукового барьера.',
      },
      {
        stepNumber: 3,
        title: 'Оценка аэродинамического нагрева (Фэй-Риддел)',
        description: 'Проанализируйте равновесную температуру стенки $T_w$ и тепловой поток $q_w$ в критической точке носового конуса.',
        whereToClick: 'Вкладка «Аэротермодинамика & Нагрев»',
        expectedOutcome: 'Вывод температуры торможения $T_0 = T_\\infty (1 + \\frac{\\gamma-1}{2} M^2)$ и рекомендации по выбору термостойких композитов/титана.',
      },
    ],
    proTip: 'При $M > 3.0$ применяйте затупление носовой кромки $R_n > 5$ мм: это снижает тепловой поток в критической точке пропорционально $1/\\sqrt{R_n}$.',
  },
  {
    id: 'recipe_drone_noise_mitigation',
    recipeNumber: 12,
    title: 'Рецепт 12: Аэроакустический Анализ и Снижение Шумности БПЛА (FW-H)',
    tag: 'Аэроакустика',
    targetDomain: 'CFD & Аэро',
    difficulty: 'Средний',
    category: 'aero',
    categoryName: 'Аэродинамика & CFD',
    prerequisites: ['Расчет нестационарных сил на лопасти', 'Координаты микрофонного приемника'],
    verificationCriteria: 'Снижение интегрального уровня шума Delta OASPL >= 3.5 дБА при сохранении тяги.',
    relatedTopicId: 'aeroacoustics',
    goal: 'Рассчитать уровень шума лопастей $OASPL$ (дБА), выявить доминирующие гармоники BPF и применить геометрические методы снижения акустической заметности.',
    estimatedTime: '1 минута',
    steps: [
      {
        stepNumber: 1,
        title: 'Ввод параметров акустического приемника',
        description: 'Укажите координаты наблюдателя на земле (дистанция $r=25$ м, угол места $\\psi=45^\\circ$) и скорость вращения ротора.',
        whereToClick: 'Модуль «Аэроакустика» -> Панель «Микрофонный Приемник»',
        expectedOutcome: 'Расчет запаздывающего времени $t_{\\text{ret}} = t - r/c_0$ и эффекта Доплера.',
      },
      {
        stepNumber: 2,
        title: 'Запуск решения акустической аналогии FW-H',
        description: 'Нажмите «Рассчитать Акустику». Солвер интегрирует поверхностные источники шума вытеснения (монополи) и шума нагрузки (диполи).',
        whereToClick: 'Кнопка «Запуск FW-H Солвера»',
        expectedOutcome: 'Построение 1/3-октавного спектра частот с пиками на частотах $f_m = m \\cdot B \\cdot n$, расчет суммарного шума $OASPL$ в дБА.',
      },
      {
        stepNumber: 3,
        title: 'Акустическая оптимизация лопасти',
        description: 'Активируйте шевронные зубчатые кромки (Serrated Trailing Edge) и саблевидную форму законцовки.',
        whereToClick: 'Чекбоксы «Зубчатая задняя кромка» и «Саблевидная законцовка»',
        expectedOutcome: 'Рассеяние когерентных вихрей и снижение интегрального уровня шума на $3.5 - 6.0$ дБА.',
      },
    ],
    proTip: 'Снижение уровня шума на 3 дБА эквивалентно двукратному уменьшению излучаемой акустической энергии в окружающее пространство.',
  },
  {
    id: 'recipe_swarm_v_formation',
    recipeNumber: 13,
    title: 'Рецепт 13: Построение Энергоэффективного Строя Роя БПЛА (V-Formation)',
    tag: 'Роевое Управление',
    targetDomain: 'БПЛА & Роторы',
    difficulty: 'Продвинутый',
    category: 'uav',
    categoryName: 'БПЛА & Роторы',
    prerequisites: ['Число аппаратов N >= 3', 'Спектральный зазор Лапласиана lambda_2 > 0'],
    verificationCriteria: 'Экономия энергии ведомых >= 15%; устойчивое удержание дистанций Delta x, Delta y.',
    relatedTopicId: 'uav_swarm_control',
    goal: 'Сформировать клин (V-строй) группы БПЛА для утилизации скоса потока от концевых вихрей лидера и снижения расхода энергии ведомых на 15–20%.',
    estimatedTime: '1.5 минуты',
    steps: [
      {
        stepNumber: 1,
        title: 'Задание топологии роя и числа агентов',
        description: 'Установите размер группы $N=5..9$ БПЛА и выберите топологию строя «V-Formation (Клин)» или «Echelon (Пеленг)».',
        whereToClick: 'Модуль «Роевое Управление» -> Панель конфигурации агентов',
        expectedOutcome: 'Построение матрицы смежности $\\mathcal{A}$ и расчет алгебраической связности $\\lambda_2(\\mathcal{L})$.',
      },
      {
        stepNumber: 2,
        title: 'Настройка аэродинамического позиционирования',
        description: 'Установите оптимальный боковой вынос $\\Delta y = 0.85 b$ и продольное эшелонирование $\\Delta x = 1.5 b$ для попадания законцовки крыла ведомого в восходящий скос потока $w_{\\text{upwash}}$.',
        whereToClick: 'Слайдеры позиционирования в строю',
        expectedOutcome: 'Визуализация спутного следа Хорсшу-вихрей и индикация снижения индуктивного сопротивления $\\Delta C_{Di} < 0$.',
      },
      {
        stepNumber: 3,
        title: 'Запуск консенсус-симуляции полета',
        description: 'Нажмите «Запустить Полет Роя». Наблюдайте динамику удержания строя, реакцию на порывы ветра и перестроение при выходе одного из ведомых.',
        whereToClick: 'Кнопка «Запуск Роевой Симуляции»',
        expectedOutcome: 'Схождение скоростей к общему вектору $\\mathbf{v}_0$, индикатор суммарной экономии батареи группы показывает $+18.4\%$.',
      },
    ],
    proTip: 'Периодическая ротация лидера строя позволяет равномерно расходовать аккумуляторы всех БПЛА миссии, увеличивая общую дальность полета группы на 25%.',
  },
  {
    id: 'recipe_ice_accretion_stall',
    recipeNumber: 14,
    title: 'Рецепт 14: Моделирование Обледенения Профиля и Оценка Падения C_Lmax',
    tag: 'Безопасность & Обледенение',
    targetDomain: 'CFD & Аэро',
    difficulty: 'Продвинутый',
    category: 'aero',
    categoryName: 'Аэродинамика & CFD',
    prerequisites: ['Температура воздуха T < 0 deg C', 'Водность облака LWC, диаметр капель MVD'],
    verificationCriteria: 'Фиксация критического угла атаки срыва alpha_stall(ice) < alpha_stall(clean) на 4..6 градусов.',
    relatedTopicId: 'physics_solvers',
    goal: 'Смоделировать нарост льда рогообразного типа (Horn Ice) на передней кромке и рассчитать ранний срыв потока и рост лобового сопротивления.',
    estimatedTime: '2 минуты',
    steps: [
      {
        stepNumber: 1,
        title: 'Включение метеорологического модуля обледенения',
        description: 'В параметрах атмосферы активируйте режим «Обледенение» и задайте температуру $T = -5^\\circ\\text{C}$ и водность $LWC = 0.5\\text{ г/м}^3$.',
        whereToClick: 'Панель «Условия Полета» -> Чекбокс «Моделирование Обледенения»',
        expectedOutcome: 'Расчет траекторий переохлажденных капель воды и коэффициента улавливания $\\beta(s)$.',
      },
      {
        stepNumber: 2,
        title: 'Генерация ледяного нароста',
        description: 'Установите время экспозиции $t = 10$ минут. Профиль передней кромки деформируется с образованием характерных ледяных рогов.',
        whereToClick: 'Слайдер «Время в зоне обледенения»',
        expectedOutcome: 'Перестроение расчетной сетки с учетом шероховатости льда $k_s = 0.5$ мм.',
      },
      {
        stepNumber: 3,
        title: 'Оценка деградации поляр',
        description: 'Запустите аэродинамический свип по углу атаки. Сравните полярную кривую чистого крыла и обледеневшего.',
        whereToClick: 'Кнопка «Построить Сравнительную Поляру»',
        expectedOutcome: 'Падение несущей способности $C_{L\\max}$ на 30–45% и рост профильного сопротивления $C_{D0}$ в 2.5 раза.',
      },
    ],
    proTip: 'При первых признаках обледенения немедленно увеличивайте индикаторную скорость на 15–20 узлов для парирования уменьшенного запаса по срыву.',
  },
  {
    id: 'recipe_uav_engine_failure_glide',
    recipeNumber: 15,
    title: 'Рецепт 15: Аварийное Планирование БПЛА при Отказе Ротора (Safe Emergency)',
    tag: 'Отказоустойчивость & Flight Control',
    targetDomain: 'БПЛА & Роторы',
    difficulty: 'Продвинутый',
    category: 'uav',
    categoryName: 'БПЛА & Роторы',
    prerequisites: ['Аэродинамическое качество планера L/D', 'Аэронавигационная карта безопасных зон посадки'],
    verificationCriteria: 'Конус достижимости Reachable Footprint гарантирует достижение безопасной зоны с высоты H.',
    relatedTopicId: '6dof',
    goal: 'Рассчитать конус планирования при внезапном отказе силовой установки, стабилизировать аппарат на наивыгоднейшей скорости $V_{\\text{bg}}$ и проложить траекторию к безопасной площадке.',
    estimatedTime: '1.5 минуты',
    steps: [
      {
        stepNumber: 1,
        title: 'Симуляция отказа двигателя',
        description: 'В панели управления 6-DoF или БПЛА нажмите кнопку «Отказ Мотора #1 (Engine Flameout)».',
        whereToClick: 'Модуль отказов -> Кнопка «Flameout Test»',
        expectedOutcome: 'Тяга двигателей обнуляется ($T=0$), автопилот переходит в аварийный режим «Best Glide».',
      },
      {
        stepNumber: 2,
        title: 'Удержание наивыгоднейшего угла атаки',
        description: 'Автопилот фиксирует угол атаки $\\alpha_{\\text{opt}}$, соответствующий $(L/D)_{\\max}$, для минимизации угла планирования $\\theta_{\\text{glide}} = \\arctan(1/K)$.',
        whereToClick: 'Индикатор телеметрии -> График скорости снижения $V_y$',
        expectedOutcome: 'Установившаяся вертикальная скорость снижения стабилизируется на минимальном уровне.',
      },
      {
        stepNumber: 3,
        title: 'Построение конуса достижимости (Footprint)',
        description: 'На геокарте строится эллиптический конус дальности с учетом текущего направления и скорости ветра $W$.',
        whereToClick: 'Вкладка геопозиционирования -> Слой «Glide Cone Footprint»',
        expectedOutcome: 'Выбор точки аварийной посадки внутри радиуса $R_{\\text{glide}} = H \\cdot (L/D) + W \\cdot t_{\\text{glide}}$.',
      },
    ],
    proTip: 'При планировании против ветра наивыгоднейшую скорость $V$ следует увеличить на четверть скорости встречного ветра ($V = V_{\\text{bg}} + 0.25 W$).',
  },
  {
    id: 'recipe_webgpu_sparse_solver',
    recipeNumber: 16,
    title: 'Рецепт 16: Аппаратное Ускорение Решения СЛАУ на WebGPU / GPU Tensor',
    tag: 'HPC & Вычислительная Математика',
    targetDomain: 'Математика & СЛАУ',
    difficulty: 'Экспертный',
    category: 'math',
    categoryName: 'Математика & СЛАУ',
    prerequisites: ['Поддержка браузером стандарта WebGPU', 'Разреженная матрица CSR/ELLPACK'],
    verificationCriteria: 'Фактор ускорения Speedup > 12x по сравнению с однопоточным CPU JS движком.',
    relatedTopicId: 'physics_solvers',
    goal: 'Задействовать вычислительные шейдеры WGSL для параллельного решения сеточных уравнений Пуассона и Навье-Стокса с ускорением в 15–30 раз.',
    estimatedTime: '1 минута',
    steps: [
      {
        stepNumber: 1,
        title: 'Проверка доступности WebGPU бэкенда',
        description: 'Посмотрите на нижнюю статусную строку или аппаратный монитор. Убедитесь в наличии зеленого индикатора «WebGPU Ready».',
        whereToClick: 'Нижний тулбар -> Индикатор аппаратного бэкенда',
        expectedOutcome: 'Инициализация контекста WebGPU Compute Device и шейдерного конвейера.',
      },
      {
        stepNumber: 2,
        title: 'Выбор решателя Krylov/GMRES на GPU',
        description: 'В окне настройки солвера переключите бэкенд на «GPU Tensor / WGSL Parallel».',
        whereToClick: 'Окно «Расширенные Солверы» -> Селектор «Вычислительный Движок»',
        expectedOutcome: 'Загрузка матриц в память VRAM и запуск параллельных редукций скалярных произведений.',
      },
      {
        stepNumber: 3,
        title: 'Контроль времени факторизации и сходимости',
        description: 'Запустите решение задачи высокого разрешения (сетка $100\\times 100$ ячеек).',
        whereToClick: 'Кнопка «Запустить Итерации GMRES»',
        expectedOutcome: 'Время выполнения итерации снижается с 120 мс до 4.2 мс с графиком невязки в реальном времени.',
      },
    ],
    proTip: 'Использование формата разреженных матриц ELLPACK на GPU обеспечивает коалесцированный доступ к глобальной видеопамяти без просадки пропускной способности.',
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
  const [activeWorkspaceZone, setActiveWorkspaceZone] = useState<number>(1);

  // Recipes State
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(SOP_RECIPES[0].id);
  const [recipeCategory, setRecipeCategory] = useState<string>('all');
  const [recipeDifficulty, setRecipeDifficulty] = useState<string>('all');
  const [recipeSearch, setRecipeSearch] = useState<string>('');
  const [completedSteps, setCompletedSteps] = useState<Record<string, number[]>>({});
  const [copiedRecipeId, setCopiedRecipeId] = useState<string | null>(null);

  // Global Search State & Highlighting
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [globalSearchTab, setGlobalSearchTab] = useState<string>('all');
  const [highlightedElementId, setHighlightedElementId] = useState<string | null>(null);
  const [isQuickDropdownOpen, setIsQuickDropdownOpen] = useState<boolean>(false);
  const [quickLineSelectedIndex, setQuickLineSelectedIndex] = useState<number>(0);
  const globalSearchInputRef = useRef<HTMLInputElement>(null);

  // Reset selected quick line index when query changes
  useEffect(() => {
    setQuickLineSelectedIndex(0);
  }, [globalSearchQuery]);

  // Keyboard shortcut for Global Search (Ctrl+K or /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        globalSearchInputRef.current?.focus();
        setIsQuickDropdownOpen(true);
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        globalSearchInputRef.current?.focus();
        setIsQuickDropdownOpen(true);
      } else if (e.key === 'Escape') {
        if (globalSearchQuery) {
          setGlobalSearchQuery('');
        }
        setIsQuickDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, globalSearchQuery]);

  const toggleStepCompleted = (recipeId: string, stepNum: number) => {
    setCompletedSteps((prev) => {
      const current = prev[recipeId] || [];
      const updated = current.includes(stepNum)
        ? current.filter((s) => s !== stepNum)
        : [...current, stepNum];
      return { ...prev, [recipeId]: updated };
    });
  };

  const handleCopyRecipeProtocol = (recipe: SOPRecipe) => {
    const text = `SOP РЕЦЕПТ: ${recipe.title}\nЦель: ${recipe.goal}\nДомен: ${recipe.targetDomain}\nСложность: ${recipe.difficulty}\nВремя: ${recipe.estimatedTime}\n\nПРЕДВАРИТЕЛЬНЫЕ ТРЕБОВАНИЯ:\n${recipe.prerequisites?.map(p => `- ${p}`).join('\n') || 'Не требуются'}\n\nШАГИ:\n${recipe.steps.map(s => `${s.stepNumber}. ${s.title}\n   Где кликать: ${s.whereToClick}\n   Действие: ${s.description}\n   Ожидаемый результат: ${s.expectedOutcome}`).join('\n\n')}\n\nКРИТЕРИЙ ПРИЕМКИ:\n${recipe.verificationCriteria || 'Визуальная и численная сходимость'}\n\nPRO TIP:\n${recipe.proTip}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedRecipeId(recipe.id);
    setTimeout(() => setCopiedRecipeId(null), 2500);
  };

  // Sync initial topic when modal opens
  React.useEffect(() => {
    if (initialTopicId) {
      setSelectedTopicId(initialTopicId);
    }
  }, [initialTopicId, isOpen]);

  // Direct Jump to a specific Line/Element in the Handbook
  const handleJumpToLine = (
    targetTab: 'chapters' | 'ui_guide' | 'recipes',
    targetItemId: string,
    domElementId: string
  ) => {
    // 1. Switch Tab
    setActiveHandbookTab(targetTab);

    // 2. Select appropriate Item and reset filtering that might hide the target
    if (targetTab === 'chapters') {
      setSelectedTopicId(targetItemId as HandbookTopicId);
      setSelectedCategory('all');
      setSearchQuery('');
    } else if (targetTab === 'recipes') {
      setSelectedRecipeId(targetItemId);
      setRecipeCategory('all');
      setRecipeDifficulty('all');
      setRecipeSearch('');
    } else if (targetTab === 'ui_guide') {
      setUiGuideSearch('');
      setUiGuideCategory('all');
      if (domElementId.startsWith('section-zone')) {
        const zoneNum = parseInt(targetItemId, 10) || 1;
        setActiveWorkspaceZone(zoneNum);
      }
    }

    // 3. Clear global search to exit the search results screen
    setGlobalSearchQuery('');
    setIsQuickDropdownOpen(false);
    setHighlightedElementId(domElementId);

    // 4. Robust multi-stage scroll to ensure exact element alignment
    const delays = [40, 120, 250, 450, 750, 1100];
    delays.forEach((delay) => {
      setTimeout(() => {
        const el = document.getElementById(domElementId);
        if (el) {
          try {
            el.scrollIntoView({ behavior: delay <= 120 ? 'auto' : 'smooth', block: 'center', inline: 'nearest' });
          } catch (e) {
            // fallback
          }

          // Direct scroll container calculation to guarantee centering in overflow element
          let parent = el.parentElement;
          while (parent && parent !== document.body) {
            const style = window.getComputedStyle(parent);
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
              const parentRect = parent.getBoundingClientRect();
              const elRect = el.getBoundingClientRect();
              const relativeTop = elRect.top - parentRect.top;
              const targetScrollTop = parent.scrollTop + relativeTop - (parentRect.height / 2) + (elRect.height / 2);
              parent.scrollTo({
                top: Math.max(0, targetScrollTop),
                behavior: delay <= 120 ? 'auto' : 'smooth',
              });
              break;
            }
            parent = parent.parentElement;
          }
        }
      }, delay);
    });

    // 5. Fade out highlight after 5 seconds
    setTimeout(() => {
      setHighlightedElementId((prev) => (prev === domElementId ? null : prev));
    }, 5000);
  };

  // Global Search Indexer & Match Engine with Line-Level Discovery
  const { globalSearchResults, allMatchedLines, topQuickLines } = useMemo(() => {
    const rawQuery = globalSearchQuery.trim().toLowerCase();
    if (!rawQuery) {
      return { globalSearchResults: [], allMatchedLines: [], topQuickLines: [] };
    }

    const rawNormalized = rawQuery.replace(/[_\\{}$]/g, '');
    const terms = rawQuery.split(/\s+/).filter(Boolean);

    interface MatchedLineItem {
      lineId: string;
      typeLabel: string;
      typeColor: string;
      snippet: string;
      itemTitle: string;
      locationPath: string;
      domElementId: string;
      isExact: boolean;
      score: number;
      onSelectLine: () => void;
    }

    const results: Array<{
      id: string;
      category: 'chapter' | 'decoder' | 'recipe' | 'zone';
      categoryBadge: string;
      categoryBadgeColor: string;
      title: string;
      symbol?: string;
      locationPath: string;
      snippet: string;
      proTip?: string;
      score: number;
      matchedLines: MatchedLineItem[];
      onSelect: () => void;
    }> = [];

    const isExactMatch = (text?: string): boolean => {
      if (!text || !rawQuery) return false;
      const lower = text.toLowerCase();
      const lowerNorm = lower.replace(/[_\\{}$]/g, '');
      return lower.includes(rawQuery) || (rawNormalized.length > 1 && lowerNorm.includes(rawNormalized));
    };

    const calcScore = (text: string, weight: number): number => {
      if (!text) return 0;
      const lower = text.toLowerCase();
      const lowerNorm = lower.replace(/[_\\{}$]/g, '');
      const exact = lower.includes(rawQuery) || (rawNormalized.length > 1 && lowerNorm.includes(rawNormalized));
      let matchCount = 0;
      for (const t of terms) {
        const tNorm = t.replace(/[_\\{}$]/g, '');
        if (lower.includes(t) || (tNorm.length > 1 && lowerNorm.includes(tNorm))) {
          matchCount += 1;
        }
      }
      if (exact) {
        return weight * 4 + matchCount * weight;
      }
      return matchCount > 0 ? matchCount * weight : 0;
    };

    const isMatch = (text?: string): boolean => {
      if (!text) return false;
      const lower = text.toLowerCase();
      const lowerNorm = lower.replace(/[_\\{}$]/g, '');
      if (lower.includes(rawQuery) || (rawNormalized.length > 1 && lowerNorm.includes(rawNormalized))) {
        return true;
      }
      return terms.some((t) => {
        const tNorm = t.replace(/[_\\{}$]/g, '');
        return lower.includes(t) || (tNorm.length > 1 && lowerNorm.includes(tNorm));
      });
    };

    // 1. Index Chapters (HANDBOOK_TOPICS)
    for (const topic of HANDBOOK_TOPICS) {
      let score = 0;
      score += calcScore(topic.title, 60);
      score += calcScore(topic.categoryLabel, 25);
      score += calcScore(topic.purpose, 30);
      score += calcScore(topic.summary, 25);
      score += calcScore(topic.physicalSignificance?.join(' ') || '', 20);

      const matchedLines: MatchedLineItem[] = [];

      // Check Title
      if (isMatch(topic.title)) {
        const exact = isExactMatch(topic.title);
        matchedLines.push({
          lineId: `${topic.id}-title`,
          typeLabel: exact ? '⚡ Точный заголовок' : 'Заголовок главы',
          typeColor: 'bg-indigo-950 text-indigo-300 border-indigo-700',
          snippet: topic.title,
          itemTitle: `Глава: ${topic.title}`,
          locationPath: `Справочник → ${topic.categoryLabel}`,
          domElementId: `section-topic-${topic.id}-header`,
          isExact: exact,
          score: exact ? 200 : 80,
          onSelectLine: () => handleJumpToLine('chapters', topic.id, `section-topic-${topic.id}-header`),
        });
      }

      // Check Purpose
      if (isMatch(topic.purpose)) {
        const exact = isExactMatch(topic.purpose);
        matchedLines.push({
          lineId: `${topic.id}-purpose`,
          typeLabel: exact ? '⚡ Точное назначение' : 'Назначение & Смысл',
          typeColor: 'bg-cyan-950 text-cyan-300 border-cyan-700',
          snippet: topic.purpose,
          itemTitle: `Глава: ${topic.title}`,
          locationPath: `Справочник → ${topic.categoryLabel}`,
          domElementId: `section-topic-${topic.id}-purpose`,
          isExact: exact,
          score: exact ? 180 : 70,
          onSelectLine: () => handleJumpToLine('chapters', topic.id, `section-topic-${topic.id}-purpose`),
        });
      }

      // Check Physical Significance
      topic.physicalSignificance?.forEach((item, idx) => {
        if (isMatch(item)) {
          const exact = isExactMatch(item);
          matchedLines.push({
            lineId: `${topic.id}-phys-${idx}`,
            typeLabel: exact ? `⚡ Точная роль #${idx + 1}` : `Физическая роль #${idx + 1}`,
            typeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700',
            snippet: item,
            itemTitle: `Глава: ${topic.title}`,
            locationPath: `Справочник → ${topic.categoryLabel}`,
            domElementId: `section-topic-${topic.id}-phys-${idx}`,
            isExact: exact,
            score: exact ? 170 : 60,
            onSelectLine: () => handleJumpToLine('chapters', topic.id, `section-topic-${topic.id}-phys-${idx}`),
          });
        }
      });

      // Check Mathematics & Equations
      if (topic.mathematics) {
        score += calcScore(topic.mathematics.governingEquationLatex || '', 35);
        score += calcScore(topic.mathematics.description || '', 20);
        score += calcScore(topic.mathematics.derivationSteps?.join(' ') || '', 15);

        if (isMatch(topic.mathematics.governingEquationLatex) || isMatch(topic.mathematics.description)) {
          const exact = isExactMatch(topic.mathematics.governingEquationLatex) || isExactMatch(topic.mathematics.description);
          matchedLines.push({
            lineId: `${topic.id}-math`,
            typeLabel: exact ? '⚡ Точное уравнение (LaTeX)' : 'Уравнение & Математика',
            typeColor: 'bg-indigo-950 text-indigo-300 border-indigo-700',
            snippet: `${topic.mathematics.governingEquationLatex} — ${topic.mathematics.description}`,
            itemTitle: `Глава: ${topic.title}`,
            locationPath: `Справочник → ${topic.categoryLabel}`,
            domElementId: `section-topic-${topic.id}-math`,
            isExact: exact,
            score: exact ? 190 : 75,
            onSelectLine: () => handleJumpToLine('chapters', topic.id, `section-topic-${topic.id}-math`),
          });
        }

        topic.mathematics.derivationSteps?.forEach((step, idx) => {
          if (isMatch(step)) {
            const exact = isExactMatch(step);
            matchedLines.push({
              lineId: `${topic.id}-derivation-${idx}`,
              typeLabel: exact ? `⚡ Точный шаг #${idx + 1}` : `Численный шаг #${idx + 1}`,
              typeColor: 'bg-purple-950 text-purple-300 border-purple-700',
              snippet: step,
              itemTitle: `Глава: ${topic.title}`,
              locationPath: `Справочник → ${topic.categoryLabel}`,
              domElementId: `section-topic-${topic.id}-derivation-${idx}`,
              isExact: exact,
              score: exact ? 160 : 55,
              onSelectLine: () => handleJumpToLine('chapters', topic.id, `section-topic-${topic.id}-derivation-${idx}`),
            });
          }
        });

        topic.mathematics.boundaryConditions?.forEach((bc, idx) => {
          if (isMatch(bc)) {
            const exact = isExactMatch(bc);
            matchedLines.push({
              lineId: `${topic.id}-bc-${idx}`,
              typeLabel: exact ? `⚡ Точное гран. условие #${idx + 1}` : `Граничное условие #${idx + 1}`,
              typeColor: 'bg-amber-950 text-amber-300 border-amber-700',
              snippet: bc,
              itemTitle: `Глава: ${topic.title}`,
              locationPath: `Справочник → ${topic.categoryLabel}`,
              domElementId: `section-topic-${topic.id}-bc-${idx}`,
              isExact: exact,
              score: exact ? 160 : 55,
              onSelectLine: () => handleJumpToLine('chapters', topic.id, `section-topic-${topic.id}-bc-${idx}`),
            });
          }
        });
      }

      // Check Controls
      if (topic.uiWalkthrough) {
        score += calcScore(topic.uiWalkthrough.title + ' ' + topic.uiWalkthrough.description, 15);
        topic.uiWalkthrough.controls?.forEach((c, idx) => {
          score += calcScore(c.name + ' ' + c.role + ' ' + (c.recommended || ''), 20);
          if (isMatch(c.name) || isMatch(c.role) || isMatch(c.recommended || '')) {
            const exact = isExactMatch(c.name) || isExactMatch(c.role) || isExactMatch(c.recommended || '');
            matchedLines.push({
              lineId: `${topic.id}-ctrl-${idx}`,
              typeLabel: exact ? `⚡ Ползунок: ${c.name}` : `Ползунок UI: ${c.name}`,
              typeColor: 'bg-cyan-950 text-cyan-300 border-cyan-700',
              snippet: `${c.role} (Рекомендация: ${c.recommended || 'штатный диапазон'})`,
              itemTitle: `Глава: ${topic.title}`,
              locationPath: `Справочник → ${topic.categoryLabel}`,
              domElementId: `section-topic-${topic.id}-control-${idx}`,
              isExact: exact,
              score: exact ? 175 : 65,
              onSelectLine: () => handleJumpToLine('chapters', topic.id, `section-topic-${topic.id}-control-${idx}`),
            });
          }
        });

        topic.uiWalkthrough.readouts?.forEach((r, idx) => {
          score += calcScore(r.name + ' ' + r.unit + ' ' + r.interpretation, 20);
          if (isMatch(r.name) || isMatch(r.unit) || isMatch(r.interpretation)) {
            const exact = isExactMatch(r.name) || isExactMatch(r.interpretation);
            matchedLines.push({
              lineId: `${topic.id}-readout-${idx}`,
              typeLabel: exact ? `⚡ Индикатор: ${r.name}` : `Индикатор: ${r.name} [${r.unit}]`,
              typeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700',
              snippet: r.interpretation,
              itemTitle: `Глава: ${topic.title}`,
              locationPath: `Справочник → ${topic.categoryLabel}`,
              domElementId: `section-topic-${topic.id}-readout-${idx}`,
              isExact: exact,
              score: exact ? 175 : 65,
              onSelectLine: () => handleJumpToLine('chapters', topic.id, `section-topic-${topic.id}-readout-${idx}`),
            });
          }
        });
      }

      // Check Engineering Workflow
      if (topic.engineeringWorkflow) {
        score += calcScore(topic.engineeringWorkflow.title + ' ' + topic.engineeringWorkflow.goal, 20);
        topic.engineeringWorkflow.steps?.forEach((st) => {
          score += calcScore(st.title + ' ' + st.action + ' ' + st.uiTarget + ' ' + st.expectedResult, 20);
          if (isMatch(st.title) || isMatch(st.action) || isMatch(st.uiTarget) || isMatch(st.expectedResult)) {
            const exact = isExactMatch(st.title) || isExactMatch(st.action) || isExactMatch(st.expectedResult);
            matchedLines.push({
              lineId: `${topic.id}-workflow-step-${st.stepNumber}`,
              typeLabel: exact ? `⚡ Шаг ${st.stepNumber}: ${st.title}` : `Шаг ${st.stepNumber}: ${st.title}`,
              typeColor: 'bg-amber-950 text-amber-300 border-amber-700',
              snippet: `Действие: ${st.action} → Результат: ${st.expectedResult}`,
              itemTitle: `Глава: ${topic.title}`,
              locationPath: `Справочник → ${topic.categoryLabel}`,
              domElementId: `section-topic-${topic.id}-step-${st.stepNumber}`,
              isExact: exact,
              score: exact ? 170 : 60,
              onSelectLine: () => handleJumpToLine('chapters', topic.id, `section-topic-${topic.id}-step-${st.stepNumber}`),
            });
          }
        });

        topic.engineeringWorkflow.pitfallsAndTroubleshooting?.forEach((pf, idx) => {
          score += calcScore(pf.issue + ' ' + pf.resolution, 15);
          if (isMatch(pf.issue) || isMatch(pf.resolution)) {
            const exact = isExactMatch(pf.issue) || isExactMatch(pf.resolution);
            matchedLines.push({
              lineId: `${topic.id}-trouble-${idx}`,
              typeLabel: exact ? `⚡ Отказ: ${pf.issue}` : `Отказ & Решение #${idx + 1}`,
              typeColor: 'bg-rose-950 text-rose-300 border-rose-700',
              snippet: `Проблема: ${pf.issue} | Решение: ${pf.resolution}`,
              itemTitle: `Глава: ${topic.title}`,
              locationPath: `Справочник → ${topic.categoryLabel}`,
              domElementId: `section-topic-${topic.id}-trouble-${idx}`,
              isExact: exact,
              score: exact ? 165 : 55,
              onSelectLine: () => handleJumpToLine('chapters', topic.id, `section-topic-${topic.id}-trouble-${idx}`),
            });
          }
        });

        topic.engineeringWorkflow.bestPractices?.forEach((bp, idx) => {
          score += calcScore(bp, 10);
          if (isMatch(bp)) {
            const exact = isExactMatch(bp);
            matchedLines.push({
              lineId: `${topic.id}-bestpractice-${idx}`,
              typeLabel: exact ? `⚡ Best Practice #${idx + 1}` : `Best Practice #${idx + 1}`,
              typeColor: 'bg-cyan-950 text-cyan-300 border-cyan-700',
              snippet: bp,
              itemTitle: `Глава: ${topic.title}`,
              locationPath: `Справочник → ${topic.categoryLabel}`,
              domElementId: `section-topic-${topic.id}-bestpractice-${idx}`,
              isExact: exact,
              score: exact ? 155 : 50,
              onSelectLine: () => handleJumpToLine('chapters', topic.id, `section-topic-${topic.id}-bestpractice-${idx}`),
            });
          }
        });
      }

      // Check Academic References
      topic.references?.forEach((ref, idx) => {
        score += calcScore(ref.authors + ' ' + ref.title + ' ' + ref.publisher, 15);
        if (isMatch(ref.authors) || isMatch(ref.title) || isMatch(ref.publisher)) {
          const exact = isExactMatch(ref.authors) || isExactMatch(ref.title) || isExactMatch(ref.publisher);
          matchedLines.push({
            lineId: `${topic.id}-ref-${idx}`,
            typeLabel: exact ? `⚡ Источник: ${ref.authors}` : `Источник: ${ref.authors} (${ref.year})`,
            typeColor: 'bg-purple-950 text-purple-300 border-purple-700',
            snippet: `«${ref.title}» — ${ref.publisher}`,
            itemTitle: `Глава: ${topic.title}`,
            locationPath: `Справочник → ${topic.categoryLabel}`,
            domElementId: `section-topic-${topic.id}-reference-${idx}`,
            isExact: exact,
            score: exact ? 150 : 45,
            onSelectLine: () => handleJumpToLine('chapters', topic.id, `section-topic-${topic.id}-reference-${idx}`),
          });
        }
      });

      if (score > 0 || matchedLines.length > 0) {
        matchedLines.sort((a, b) => b.score - a.score);
        const topTargetDom = matchedLines.length > 0 ? matchedLines[0].domElementId : `section-topic-${topic.id}-header`;
        results.push({
          id: `chapter_${topic.id}`,
          category: 'chapter',
          categoryBadge: 'Научная Глава',
          categoryBadgeColor: 'bg-indigo-950 text-indigo-300 border-indigo-700/60',
          title: topic.title,
          locationPath: `Справочник → ${topic.categoryLabel}`,
          snippet: topic.summary || topic.purpose,
          proTip: topic.physicalSignificance?.[0] || topic.engineeringWorkflow?.goal,
          matchedLines,
          score: Math.max(score, matchedLines.reduce((acc, m) => acc + m.score, 0)),
          onSelect: () => handleJumpToLine('chapters', topic.id, topTargetDom),
        });
      }
    }

    // 2. Index Decoder Items (PARAMETER_DECODER_ITEMS)
    for (const item of PARAMETER_DECODER_ITEMS) {
      let score = 0;
      score += calcScore(item.name, 60);
      score += calcScore(item.symbolLatex, 50);
      score += calcScore(item.meaning, 30);
      score += calcScore(item.categoryName, 20);
      score += calcScore(item.location, 20);
      score += calcScore(item.howToConfigure, 20);
      score += calcScore(item.howToObtain, 20);

      const matchedLines: MatchedLineItem[] = [];

      if (isMatch(item.name)) {
        const exact = isExactMatch(item.name);
        matchedLines.push({
          lineId: `${item.id}-name`,
          typeLabel: exact ? `⚡ Параметр UI: ${item.name}` : `Параметр: ${item.name}`,
          typeColor: 'bg-cyan-950 text-cyan-300 border-cyan-700',
          snippet: `${item.name} (${item.symbolLatex}) — ${item.meaning}`,
          itemTitle: `Параметр UI: ${item.name}`,
          locationPath: `Гид по Интерфейсу → ${item.categoryName}`,
          domElementId: `section-decoder-${item.id}`,
          isExact: exact,
          score: exact ? 200 : 80,
          onSelectLine: () => handleJumpToLine('ui_guide', item.id, `section-decoder-${item.id}`),
        });
      }

      if (isMatch(item.meaning)) {
        const exact = isExactMatch(item.meaning);
        matchedLines.push({
          lineId: `${item.id}-meaning`,
          typeLabel: exact ? '⚡ Физический смысл' : 'Физический смысл',
          typeColor: 'bg-cyan-950 text-cyan-300 border-cyan-700',
          snippet: item.meaning,
          itemTitle: `Параметр UI: ${item.name}`,
          locationPath: `Гид по Интерфейсу → ${item.categoryName}`,
          domElementId: `section-decoder-${item.id}-meaning`,
          isExact: exact,
          score: exact ? 180 : 70,
          onSelectLine: () => handleJumpToLine('ui_guide', item.id, `section-decoder-${item.id}-meaning`),
        });
      }

      if (isMatch(item.howToConfigure)) {
        const exact = isExactMatch(item.howToConfigure);
        matchedLines.push({
          lineId: `${item.id}-configure`,
          typeLabel: exact ? '⚡ Как настраивать' : 'Как настраивать',
          typeColor: 'bg-amber-950 text-amber-300 border-amber-700',
          snippet: item.howToConfigure,
          itemTitle: `Параметр UI: ${item.name}`,
          locationPath: `Гид по Интерфейсу → ${item.categoryName}`,
          domElementId: `section-decoder-${item.id}-configure`,
          isExact: exact,
          score: exact ? 175 : 65,
          onSelectLine: () => handleJumpToLine('ui_guide', item.id, `section-decoder-${item.id}-configure`),
        });
      }

      if (isMatch(item.howToObtain)) {
        const exact = isExactMatch(item.howToObtain);
        matchedLines.push({
          lineId: `${item.id}-obtain`,
          typeLabel: exact ? '⚡ Как получить результат' : 'Как получить результат',
          typeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700',
          snippet: item.howToObtain,
          itemTitle: `Параметр UI: ${item.name}`,
          locationPath: `Гид по Интерфейсу → ${item.categoryName}`,
          domElementId: `section-decoder-${item.id}-obtain`,
          isExact: exact,
          score: exact ? 175 : 65,
          onSelectLine: () => handleJumpToLine('ui_guide', item.id, `section-decoder-${item.id}-obtain`),
        });
      }

      if (score > 0 || matchedLines.length > 0) {
        matchedLines.sort((a, b) => b.score - a.score);
        const topTargetDom = matchedLines.length > 0 ? matchedLines[0].domElementId : `section-decoder-${item.id}`;
        results.push({
          id: `decoder_${item.id}`,
          category: 'decoder',
          categoryBadge: 'Параметр UI',
          categoryBadgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-700/60',
          title: item.name,
          symbol: item.symbolLatex,
          locationPath: `Гид по Интерфейсу → ${item.categoryName} (${item.location})`,
          snippet: item.meaning,
          matchedLines,
          score: Math.max(score, matchedLines.reduce((acc, m) => acc + m.score, 0)),
          onSelect: () => handleJumpToLine('ui_guide', item.id, topTargetDom),
        });
      }
    }

    // 3. Index SOP Recipes (SOP_RECIPES)
    for (const recipe of SOP_RECIPES) {
      let score = 0;
      score += calcScore(recipe.title, 60);
      score += calcScore(recipe.goal, 35);
      score += calcScore(recipe.targetDomain, 25);
      score += calcScore(recipe.categoryName, 20);
      score += calcScore(recipe.tag, 20);
      score += calcScore(recipe.verificationCriteria || '', 25);
      score += calcScore(recipe.proTip, 15);

      const matchedLines: MatchedLineItem[] = [];

      if (isMatch(recipe.title)) {
        const exact = isExactMatch(recipe.title);
        matchedLines.push({
          lineId: `${recipe.id}-title`,
          typeLabel: exact ? `⚡ Заголовок рецепта #${recipe.recipeNumber}` : `Рецепт #${recipe.recipeNumber}`,
          typeColor: 'bg-amber-950 text-amber-300 border-amber-700',
          snippet: recipe.title,
          itemTitle: recipe.title,
          locationPath: `SOP Рецепты → #${recipe.recipeNumber} [${recipe.targetDomain}]`,
          domElementId: `section-recipe-${recipe.id}-header`,
          isExact: exact,
          score: exact ? 200 : 80,
          onSelectLine: () => handleJumpToLine('recipes', recipe.id, `section-recipe-${recipe.id}-header`),
        });
      }

      if (isMatch(recipe.goal)) {
        const exact = isExactMatch(recipe.goal);
        matchedLines.push({
          lineId: `${recipe.id}-goal`,
          typeLabel: exact ? '⚡ Цель регламента' : 'Цель регламента',
          typeColor: 'bg-cyan-950 text-cyan-300 border-cyan-700',
          snippet: recipe.goal,
          itemTitle: recipe.title,
          locationPath: `SOP Рецепты → #${recipe.recipeNumber}`,
          domElementId: `section-recipe-${recipe.id}-header`,
          isExact: exact,
          score: exact ? 180 : 70,
          onSelectLine: () => handleJumpToLine('recipes', recipe.id, `section-recipe-${recipe.id}-header`),
        });
      }

      recipe.steps.forEach((st) => {
        score += calcScore(st.title + ' ' + st.description + ' ' + st.whereToClick + ' ' + st.expectedOutcome, 20);
        if (isMatch(st.title) || isMatch(st.description) || isMatch(st.whereToClick) || isMatch(st.expectedOutcome)) {
          const exact = isExactMatch(st.title) || isExactMatch(st.description) || isExactMatch(st.whereToClick) || isExactMatch(st.expectedOutcome);
          matchedLines.push({
            lineId: `${recipe.id}-step-${st.stepNumber}`,
            typeLabel: exact ? `⚡ Шаг ${st.stepNumber}: ${st.title}` : `Шаг ${st.stepNumber}: ${st.title}`,
            typeColor: 'bg-amber-950 text-amber-300 border-amber-700',
            snippet: `Кликать: ${st.whereToClick} → ${st.description} [Результат: ${st.expectedOutcome}]`,
            itemTitle: recipe.title,
            locationPath: `SOP Рецепты → #${recipe.recipeNumber}`,
            domElementId: `section-recipe-${recipe.id}-step-${st.stepNumber}`,
            isExact: exact,
            score: exact ? 175 : 65,
            onSelectLine: () => handleJumpToLine('recipes', recipe.id, `section-recipe-${recipe.id}-step-${st.stepNumber}`),
          });
        }
      });

      if (isMatch(recipe.verificationCriteria)) {
        const exact = isExactMatch(recipe.verificationCriteria);
        matchedLines.push({
          lineId: `${recipe.id}-criteria`,
          typeLabel: exact ? '⚡ Критерий приемки' : 'Критерий приемки',
          typeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700',
          snippet: recipe.verificationCriteria,
          itemTitle: recipe.title,
          locationPath: `SOP Рецепты → #${recipe.recipeNumber}`,
          domElementId: `section-recipe-${recipe.id}-criteria`,
          isExact: exact,
          score: exact ? 170 : 60,
          onSelectLine: () => handleJumpToLine('recipes', recipe.id, `section-recipe-${recipe.id}-criteria`),
        });
      }

      if (isMatch(recipe.proTip)) {
        const exact = isExactMatch(recipe.proTip);
        matchedLines.push({
          lineId: `${recipe.id}-protip`,
          typeLabel: exact ? '⚡ Pro Tip инженера' : 'Совет инженера (Pro Tip)',
          typeColor: 'bg-purple-950 text-purple-300 border-purple-700',
          snippet: recipe.proTip,
          itemTitle: recipe.title,
          locationPath: `SOP Рецепты → #${recipe.recipeNumber}`,
          domElementId: `section-recipe-${recipe.id}-protip`,
          isExact: exact,
          score: exact ? 160 : 55,
          onSelectLine: () => handleJumpToLine('recipes', recipe.id, `section-recipe-${recipe.id}-protip`),
        });
      }

      if (score > 0 || matchedLines.length > 0) {
        matchedLines.sort((a, b) => b.score - a.score);
        const topTargetDom = matchedLines.length > 0 ? matchedLines[0].domElementId : `section-recipe-${recipe.id}-header`;
        results.push({
          id: `recipe_${recipe.id}`,
          category: 'recipe',
          categoryBadge: 'SOP Рецепт',
          categoryBadgeColor: 'bg-amber-950 text-amber-300 border-amber-700/60',
          title: recipe.title,
          locationPath: `SOP Рецепты → #${recipe.recipeNumber} [${recipe.targetDomain}] (${recipe.difficulty})`,
          snippet: recipe.goal,
          proTip: recipe.proTip,
          matchedLines,
          score: Math.max(score, matchedLines.reduce((acc, m) => acc + m.score, 0)),
          onSelect: () => handleJumpToLine('recipes', recipe.id, topTargetDom),
        });
      }
    }

    // 4. Index Workspace Zones (WORKSPACE_ZONES)
    for (const zone of WORKSPACE_ZONES) {
      let score = 0;
      score += calcScore(zone.title, 60);
      score += calcScore(zone.role, 35);
      score += calcScore(zone.shortDomain, 30);
      score += calcScore(zone.location, 25);
      score += calcScore(zone.proTip, 15);
      score += calcScore(zone.inputsAndOutputs?.inputs + ' ' + zone.inputsAndOutputs?.outputs, 15);

      const matchedLines: MatchedLineItem[] = [];

      if (isMatch(zone.title)) {
        const exact = isExactMatch(zone.title);
        matchedLines.push({
          lineId: `${zone.id}-title`,
          typeLabel: exact ? `⚡ Зона ${zone.id}: ${zone.title}` : `Зона ${zone.id}`,
          typeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700',
          snippet: `Зона ${zone.id}: ${zone.title} (${zone.role})`,
          itemTitle: `Зона ${zone.id}: ${zone.title}`,
          locationPath: `Гид по Интерфейсу → Архитектура экрана`,
          domElementId: `section-zone-${zone.id}`,
          isExact: exact,
          score: exact ? 190 : 75,
          onSelectLine: () => handleJumpToLine('ui_guide', String(zone.id), `section-zone-${zone.id}`),
        });
      }

      if (isMatch(zone.role)) {
        const exact = isExactMatch(zone.role);
        matchedLines.push({
          lineId: `${zone.id}-role`,
          typeLabel: exact ? '⚡ Назначение зоны' : 'Назначение зоны',
          typeColor: 'bg-cyan-950 text-cyan-300 border-cyan-700',
          snippet: zone.role,
          itemTitle: `Зона ${zone.id}: ${zone.title}`,
          locationPath: `Гид по Интерфейсу → Архитектура экрана`,
          domElementId: `section-zone-${zone.id}-passport`,
          isExact: exact,
          score: exact ? 175 : 65,
          onSelectLine: () => handleJumpToLine('ui_guide', String(zone.id), `section-zone-${zone.id}-passport`),
        });
      }

      zone.keyControls?.forEach((ctrl, idx) => {
        score += calcScore(ctrl, 15);
        if (isMatch(ctrl)) {
          const exact = isExactMatch(ctrl);
          matchedLines.push({
            lineId: `${zone.id}-ctrl-${idx}`,
            typeLabel: exact ? `⚡ Элемент управления #${idx + 1}` : `Элемент управления #${idx + 1}`,
            typeColor: 'bg-amber-950 text-amber-300 border-amber-700',
            snippet: ctrl,
            itemTitle: `Зона ${zone.id}: ${zone.title}`,
            locationPath: `Гид по Интерфейсу → Архитектура экрана`,
            domElementId: `section-zone-${zone.id}-controls`,
            isExact: exact,
            score: exact ? 165 : 55,
            onSelectLine: () => handleJumpToLine('ui_guide', String(zone.id), `section-zone-${zone.id}-controls`),
          });
        }
      });

      if (isMatch(zone.proTip)) {
        const exact = isExactMatch(zone.proTip);
        matchedLines.push({
          lineId: `${zone.id}-protip`,
          typeLabel: exact ? '⚡ Совет инженера' : 'Совет инженера',
          typeColor: 'bg-purple-950 text-purple-300 border-purple-700',
          snippet: zone.proTip,
          itemTitle: `Зона ${zone.id}: ${zone.title}`,
          locationPath: `Гид по Интерфейсу → Архитектура экрана`,
          domElementId: `section-zone-${zone.id}-protip`,
          isExact: exact,
          score: exact ? 160 : 50,
          onSelectLine: () => handleJumpToLine('ui_guide', String(zone.id), `section-zone-${zone.id}-protip`),
        });
      }

      if (score > 0 || matchedLines.length > 0) {
        matchedLines.sort((a, b) => b.score - a.score);
        const topTargetDom = matchedLines.length > 0 ? matchedLines[0].domElementId : `section-zone-${zone.id}`;
        results.push({
          id: `zone_${zone.id}`,
          category: 'zone',
          categoryBadge: 'Зона Экрана',
          categoryBadgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700/60',
          title: `Зона ${zone.id}: ${zone.title}`,
          locationPath: `Гид по Интерфейсу → Архитектура экрана [${zone.shortDomain}]`,
          snippet: zone.role,
          proTip: zone.proTip,
          matchedLines,
          score: Math.max(score, matchedLines.reduce((acc, m) => acc + m.score, 0)),
          onSelect: () => handleJumpToLine('ui_guide', String(zone.id), topTargetDom),
        });
      }
    }

    // 5. Index 3D Viewport Controls & Shortcuts
    const shortcutMouseTerms = 'мышь mouse orbit controls панорамирование pan zoom лкм пкм колесо вращение камеры 3d клик';
    const shortcutKeyTerms = 'горячие клавиши shortcuts r reset сброс камеры x y z cut planes space пауза линии тока c snapshot экспорт 4k';
    const shortcutScaleTerms = 'шкалы слои cp давление мах mach q-критерий вихри сверхзвуковой звуковой карман цвета градиент';

    if (isMatch(shortcutMouseTerms)) {
      const exact = isExactMatch('мышь') || isExactMatch('вращение') || isExactMatch('панорамирование') || isExactMatch('zoom');
      const mouseLines: MatchedLineItem[] = [
        {
          lineId: 'shortcut-mouse-1',
          typeLabel: exact ? '⚡ 3D Мышь & Тач' : '3D Мышь & Тач',
          typeColor: 'bg-cyan-950 text-cyan-300 border-cyan-700',
          snippet: 'ЛКМ — вращение, ПКМ/Shift — панорамирование, Колесо — масштабирование',
          itemTitle: '3D Управление (Orbit & Pan)',
          locationPath: 'Гид по Интерфейсу → 3D Вьюпорт',
          domElementId: 'section-shortcuts-mouse',
          isExact: exact,
          score: exact ? 170 : 60,
          onSelectLine: () => handleJumpToLine('ui_guide', 'shortcuts', 'section-shortcuts-mouse'),
        },
      ];
      results.push({
        id: 'shortcuts_mouse',
        category: 'decoder',
        categoryBadge: '3D Управление',
        categoryBadgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-700/60',
        title: 'Манипуляция Мышью & Тачем (3D Orbit & Pan)',
        locationPath: 'Гид по Интерфейсу → 3D Вьюпорт',
        snippet: 'ЛКМ: Вращение | ПКМ/Shift: Панорамирование | Колесо: Zoom | 2x Клик: Фокус на крыле',
        score: 65,
        matchedLines: mouseLines,
        onSelect: () => handleJumpToLine('ui_guide', 'shortcuts', 'section-shortcuts-mouse'),
      });
    }

    if (isMatch(shortcutKeyTerms)) {
      const exact = isExactMatch('горячие') || isExactMatch('клавиши') || isExactMatch('shortcuts');
      const keyLines: MatchedLineItem[] = [
        {
          lineId: 'shortcut-keys-1',
          typeLabel: exact ? '⚡ Горячие клавиши' : 'Горячие клавиши',
          typeColor: 'bg-amber-950 text-amber-300 border-amber-700',
          snippet: 'Клавиши R (Сброс), X/Y/Z (Сечения), Space (Пауза тока), C (Снимок)',
          itemTitle: 'Быстрые Клавиши (R, X/Y/Z, Space, C)',
          locationPath: 'Гид по Интерфейсу → Горячие Клавиши 3D',
          domElementId: 'section-shortcuts-keys',
          isExact: exact,
          score: exact ? 175 : 65,
          onSelectLine: () => handleJumpToLine('ui_guide', 'shortcuts', 'section-shortcuts-keys'),
        },
      ];
      results.push({
        id: 'shortcuts_keys',
        category: 'decoder',
        categoryBadge: 'Горячие Клавиши',
        categoryBadgeColor: 'bg-amber-950 text-amber-300 border-amber-700/60',
        title: 'Быстрые Клавиши (Shortcuts R, X/Y/Z, Space, C)',
        locationPath: 'Гид по Интерфейсу → Горячие Клавиши 3D',
        snippet: 'R: Сброс камеры | X/Y/Z: Плоскости Cut Planes | Space: Пауза линий тока | C: 4K Снимок',
        score: 70,
        matchedLines: keyLines,
        onSelect: () => handleJumpToLine('ui_guide', 'shortcuts', 'section-shortcuts-keys'),
      });
    }

    if (isMatch(shortcutScaleTerms)) {
      const exact = isExactMatch('шкалы') || isExactMatch('слои') || isExactMatch('cp') || isExactMatch('мах') || isExactMatch('вихри');
      const scaleLines: MatchedLineItem[] = [
        {
          lineId: 'shortcut-scales-1',
          typeLabel: exact ? '⚡ Шкалы Cp, Mach, Q' : 'Шкалы Cp, Mach, Q',
          typeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700',
          snippet: 'Цветовые шкалы: Cp (давление), Мах (сжимаемость), Q-критерий (вихри)',
          itemTitle: 'Цветовые Шкалы & Физические Поля',
          locationPath: 'Гид по Интерфейсу → Физические Слои',
          domElementId: 'section-shortcuts-scales',
          isExact: exact,
          score: exact ? 170 : 60,
          onSelectLine: () => handleJumpToLine('ui_guide', 'shortcuts', 'section-shortcuts-scales'),
        },
      ];
      results.push({
        id: 'shortcuts_scales',
        category: 'decoder',
        categoryBadge: 'Цветовые Шкалы',
        categoryBadgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700/60',
        title: 'Цветовые Шкалы & Физические Поля (Cp, Mach, Q)',
        locationPath: 'Гид по Интерфейсу → Физические Слои',
        snippet: 'Cp: Поле давлений | Мах: Сверхзвуковой карман | Q-критерий: Жгуты вихрей',
        score: 65,
        matchedLines: scaleLines,
        onSelect: () => handleJumpToLine('ui_guide', 'shortcuts', 'section-shortcuts-scales'),
      });
    }

    // Sort sections by score descending
    const sortedResults = results.sort((a, b) => b.score - a.score);

    // Flatten all unique matched lines across all results and sort: exact matches first, then by score
    const allLinesMap = new Map<string, MatchedLineItem>();
    for (const res of sortedResults) {
      for (const ml of res.matchedLines) {
        if (!allLinesMap.has(ml.lineId)) {
          allLinesMap.set(ml.lineId, ml);
        }
      }
    }
    const allLinesList = Array.from(allLinesMap.values());
    allLinesList.sort((a, b) => {
      if (a.isExact && !b.isExact) return -1;
      if (!a.isExact && b.isExact) return 1;
      return b.score - a.score;
    });

    const topLines = allLinesList.slice(0, 10);

    return {
      globalSearchResults: sortedResults,
      allMatchedLines: allLinesList,
      topQuickLines: topLines,
    };
  }, [globalSearchQuery]);

  const filteredGlobalResults = useMemo(() => {
    if (globalSearchTab === 'all') return globalSearchResults;
    return globalSearchResults.filter((r) => r.category === globalSearchTab);
  }, [globalSearchResults, globalSearchTab]);

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

  const filteredRecipes = useMemo(() => {
    return SOP_RECIPES.filter((r) => {
      const matchCat = recipeCategory === 'all' || r.category === recipeCategory;
      const matchDiff = recipeDifficulty === 'all' || r.difficulty === recipeDifficulty;
      const q = recipeSearch.toLowerCase().trim();
      const matchSearch =
        q === '' ||
        r.title.toLowerCase().includes(q) ||
        r.goal.toLowerCase().includes(q) ||
        r.targetDomain.toLowerCase().includes(q) ||
        r.tag.toLowerCase().includes(q) ||
        r.verificationCriteria.toLowerCase().includes(q) ||
        r.prerequisites.some((p) => p.toLowerCase().includes(q)) ||
        r.steps.some((s) => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
      return matchCat && matchDiff && matchSearch;
    });
  }, [recipeCategory, recipeDifficulty, recipeSearch]);

  const activeRecipe = useMemo(() => {
    return SOP_RECIPES.find((r) => r.id === selectedRecipeId) || SOP_RECIPES[0];
  }, [selectedRecipeId]);

  const activeZoneInfo = useMemo(() => {
    return WORKSPACE_ZONES.find((z) => z.id === activeWorkspaceZone) || WORKSPACE_ZONES[0];
  }, [activeWorkspaceZone]);

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
                onClick={() => {
                  setActiveHandbookTab('chapters');
                  setGlobalSearchQuery('');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeHandbookTab === 'chapters' && !globalSearchQuery.trim()
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{HANDBOOK_TOPICS.length} Научных Глав</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveHandbookTab('ui_guide');
                  setGlobalSearchQuery('');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeHandbookTab === 'ui_guide' && !globalSearchQuery.trim()
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
                onClick={() => {
                  setActiveHandbookTab('recipes');
                  setGlobalSearchQuery('');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeHandbookTab === 'recipes' && !globalSearchQuery.trim()
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

        {/* Global Search Bar Strip */}
        <div className="relative px-4 sm:px-6 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 shrink-0 z-30">
          <div className="relative flex-1 max-w-3xl">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={globalSearchInputRef}
              type="text"
              value={globalSearchQuery}
              onFocus={() => setIsQuickDropdownOpen(true)}
              onChange={(e) => {
                setGlobalSearchQuery(e.target.value);
                setIsQuickDropdownOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (topQuickLines.length > 0) {
                    setQuickLineSelectedIndex((prev) => (prev + 1) % topQuickLines.length);
                  }
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (topQuickLines.length > 0) {
                    setQuickLineSelectedIndex((prev) => (prev - 1 + topQuickLines.length) % topQuickLines.length);
                  }
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (topQuickLines.length > 0) {
                    const selected = topQuickLines[quickLineSelectedIndex] || topQuickLines[0];
                    selected.onSelectLine();
                    setIsQuickDropdownOpen(false);
                  } else if (filteredGlobalResults.length > 0) {
                    filteredGlobalResults[0].onSelect();
                    setIsQuickDropdownOpen(false);
                  }
                } else if (e.key === 'Escape') {
                  setIsQuickDropdownOpen(false);
                  setGlobalSearchQuery('');
                }
              }}
              placeholder="Глобальный поиск по формулам, строкам, параметрам UI и SOP-рецептам..."
              className="w-full pl-10 pr-24 py-2 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 font-mono transition-all shadow-inner"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {globalSearchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setGlobalSearchQuery('');
                    setIsQuickDropdownOpen(false);
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-mono cursor-pointer transition-colors"
                  title="Очистить поиск (Esc)"
                >
                  <X className="w-3 h-3" />
                </button>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-800/90 border border-slate-700 text-slate-400 text-[10px] font-mono">
                  <span>Ctrl+K</span>
                  <span className="text-slate-600">/</span>
                  <span>/</span>
                </span>
              )}
              {globalSearchQuery && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/60 text-[10px] font-mono font-bold">
                  {globalSearchResults.length}
                </span>
              )}
            </div>

            {/* Quick Dropdown with Instant Line-Level Jumps */}
            {isQuickDropdownOpen && topQuickLines.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900/95 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden z-50 p-2 space-y-1 backdrop-blur-xl animate-fadeIn">
                <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-mono text-slate-400 border-b border-slate-800">
                  <span className="text-cyan-300 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    Совпадающие строки (стрелки ↑↓ и Enter или кнопка «Переход»):
                  </span>
                  <span className="text-slate-500 hidden sm:inline">({topQuickLines.length} строк)</span>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                  {topQuickLines.map((item, idx) => {
                    const isSelected = idx === quickLineSelectedIndex;
                    return (
                      <div
                        key={`${item.lineId}-${idx}`}
                        onClick={() => {
                          item.onSelectLine();
                          setIsQuickDropdownOpen(false);
                        }}
                        onMouseEnter={() => setQuickLineSelectedIndex(idx)}
                        className={`w-full text-left p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                          isSelected
                            ? 'bg-cyan-950/60 border-cyan-400 shadow-md ring-1 ring-cyan-400/40'
                            : 'bg-slate-950/70 hover:bg-cyan-950/30 border-slate-800 hover:border-cyan-500/50'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono mb-0.5">
                            <span className={`px-1.5 py-0.2 rounded font-bold border ${item.typeColor}`}>
                              {item.typeLabel}
                            </span>
                            {item.isExact && (
                              <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-700 text-[9px]">
                                ⚡ 100%
                              </span>
                            )}
                            <span className="text-slate-400 truncate max-w-[220px]">
                              {item.locationPath}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-200 truncate font-mono">
                            <MathText text={item.snippet} />
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            item.onSelectLine();
                            setIsQuickDropdownOpen(false);
                          }}
                          className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-400 text-slate-950 shadow-md'
                              : 'bg-cyan-950 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-800'
                          }`}
                        >
                          <span>Переход</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Keywords Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] font-mono scrollbar-none text-slate-400 shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Топ:
            </span>
            {[
              { label: 'C_L / C_D', query: 'C_L' },
              { label: 'Флаттер', query: 'флаттер' },
              { label: 'Q-критерий', query: 'Q-критерий' },
              { label: 'BEM Винт', query: 'BEM' },
              { label: 'РЭБ / EKF2', query: 'РЭБ' },
              { label: 'ГОСТ 7.32', query: 'ГОСТ' },
              { label: 'WebGPU', query: 'WebGPU' },
              { label: 'Мах / Скачок', query: 'Мах' },
              { label: 'Horn Ice', query: 'Horn Ice' },
              { label: 'TMR', query: 'TMR' },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => {
                  setGlobalSearchQuery(chip.query);
                  setIsQuickDropdownOpen(false);
                }}
                className={`px-2 py-0.5 rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                  globalSearchQuery.toLowerCase().includes(chip.query.toLowerCase())
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-bold'
                    : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* GLOBAL SEARCH RESULTS HUB (When globalSearchQuery has text)               */}
        {/* ========================================================================= */}
        {globalSearchQuery.trim() !== '' ? (
          <div className="flex-1 flex flex-col overflow-hidden p-4 sm:p-6 bg-slate-950/40 gap-4 animate-fadeIn">
            {/* Header with Categories Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Результаты поиска: «<span className="text-cyan-300 font-mono">{globalSearchQuery}</span>»
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold">
                  {globalSearchResults.length} разделов найдено
                </span>
              </div>

              {/* Sub-Category Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
                {[
                  { id: 'all', label: `Все (${globalSearchResults.length})` },
                  { id: 'chapter', label: `Научные Главы (${globalSearchResults.filter(r => r.category === 'chapter').length})` },
                  { id: 'decoder', label: `Параметры UI (${globalSearchResults.filter(r => r.category === 'decoder').length})` },
                  { id: 'recipe', label: `SOP Рецепты (${globalSearchResults.filter(r => r.category === 'recipe').length})` },
                  { id: 'zone', label: `Зоны Экрана (${globalSearchResults.filter(r => r.category === 'zone').length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setGlobalSearchTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                      globalSearchTab === tab.id
                        ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Grid / List with Direct Line-Level Selection */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {/* Highlighted Exact-Matched Lines Quick Jump Grid */}
              {allMatchedLines.length > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-500/40 space-y-3 shrink-0 shadow-lg animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Варианты точно совпадающих строк и формул</span>
                        <span className="px-2 py-0.2 rounded-full bg-cyan-900 text-cyan-300 text-[10px] font-mono border border-cyan-700 font-bold">
                          {allMatchedLines.filter((l) => l.isExact).length || allMatchedLines.length} строк
                        </span>
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      Нажмите «Переход», чтобы мгновенно прокрутить к строке
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                    {allMatchedLines.slice(0, 9).map((ml, idx) => (
                      <div
                        key={`${ml.lineId}-${idx}`}
                        className={`p-3 rounded-xl bg-slate-950/90 border transition-all flex flex-col justify-between gap-2.5 group/card ${
                          ml.isExact ? 'border-cyan-500/60 shadow-sm shadow-cyan-500/10' : 'border-slate-800 hover:border-cyan-500/50'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                            <span className={`px-1.5 py-0.2 rounded font-bold border ${ml.typeColor}`}>
                              {ml.typeLabel}
                            </span>
                            {ml.isExact && (
                              <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-700">
                                ⚡ 100% совпадение
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-mono text-slate-400 truncate">
                            {ml.locationPath}
                          </p>
                          <p className="text-xs text-slate-200 leading-snug line-clamp-2 group-hover/card:text-cyan-200 font-mono">
                            <MathText text={ml.snippet} />
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={ml.onSelectLine}
                          className="w-full py-1.5 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                        >
                          <span>Переход</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredGlobalResults.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
                  <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
                  <h4 className="text-base font-bold text-white mb-1">Ничего не найдено по данному запросу</h4>
                  <p className="text-xs text-slate-400 max-w-md mb-4">
                    Попробуйте изменить формулировку, использовать латинские обозначения (например, <span className="font-mono text-cyan-300">C_L, Q, BEM, EKF2, TMR, SU2, STL</span>) или выберите готовый тег.
                  </p>
                  <button
                    type="button"
                    onClick={() => setGlobalSearchQuery('')}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-300 border border-slate-700 cursor-pointer transition-colors"
                  >
                    Сбросить глобальный поиск
                  </button>
                </div>
              ) : (
                filteredGlobalResults.map((item) => (
                  <div
                    key={item.id}
                    className="group p-4 rounded-2xl bg-slate-900/85 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 transition-all shadow-md hover:shadow-cyan-500/10 space-y-3"
                  >
                    {/* Top Row: Category, Title & Jump to Top */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                          <span className={`px-2 py-0.5 rounded-md font-bold border ${item.categoryBadgeColor}`}>
                            {item.categoryBadge}
                          </span>
                          <span className="text-slate-400">
                            {item.locationPath}
                          </span>
                          {item.symbol && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                              <MathText text={item.symbol} />
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                          <MathText text={item.title} />
                        </h4>

                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                          <MathText text={item.snippet} />
                        </p>

                        {item.proTip && (
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-300/90 font-mono pt-0.5">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="line-clamp-1"><MathText text={item.proTip} /></span>
                          </div>
                        )}
                      </div>

                      {/* Main Jump Button */}
                      <button
                        type="button"
                        onClick={item.onSelect}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-cyan-500 text-slate-300 hover:text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 transition-all shrink-0 border border-slate-700 hover:border-cyan-400 cursor-pointer self-start sm:self-center"
                        title="Перейти к началу раздела"
                      >
                        <span>В раздел</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Matched Specific Lines & Options Sub-List */}
                    {item.matchedLines && item.matchedLines.length > 0 && (
                      <div className="space-y-1.5 pt-0.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-300 font-bold">
                          <Target className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Найдено совпадений в строчках и шагах ({item.matchedLines.length}):</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {item.matchedLines.map((line) => (
                            <button
                              key={line.lineId}
                              type="button"
                              onClick={line.onSelectLine}
                              className="text-left p-2.5 rounded-xl bg-slate-950/80 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/60 transition-all cursor-pointer flex items-start justify-between gap-2 group/line"
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <span className={`inline-block px-1.5 py-0.2 rounded font-mono text-[9px] font-bold border ${line.typeColor}`}>
                                  {line.typeLabel}
                                </span>
                                <p className="text-[11px] text-slate-200 group-hover/line:text-cyan-200 line-clamp-2 leading-tight">
                                  <MathText text={line.snippet} />
                                </p>
                              </div>
                              <span className="p-1 rounded-lg bg-slate-900 group-hover/line:bg-cyan-500 text-slate-400 group-hover/line:text-slate-950 transition-colors shrink-0 mt-0.5">
                                <ArrowRight className="w-3.5 h-3.5" />
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Normal Tabs Rendering When Global Search is Empty */}
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
                  { id: 'all', label: 'Все главы' },
                  { id: 'aero', label: 'CFD/Аэро' },
                  { id: 'uav', label: 'БПЛА & Роторы' },
                  { id: 'cad', label: 'САПР & MDO' },
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
                          <span className="text-xs font-bold truncate">
                            <MathText text={topic.title} />
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 shrink-0">
                            {topic.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          <MathText text={topic.summary} />
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
              <div
                id={`section-topic-${activeTopic.id}-header`}
                className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/60 border space-y-2 relative overflow-hidden shadow-lg transition-all duration-500 ${
                  highlightedElementId === `section-topic-${activeTopic.id}-header`
                    ? 'border-cyan-400 ring-4 ring-cyan-500/30 scale-[1.005]'
                    : 'border-slate-800'
                }`}
              >
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
                  <MathText text={activeTopic.title} />
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  <MathText text={activeTopic.summary} />
                </p>
              </div>

              {/* 1. Инженерное Назначение & Физическая Роль */}
              <div
                id={`section-topic-${activeTopic.id}-purpose`}
                className={`p-4 sm:p-5 rounded-2xl bg-slate-950 border space-y-3 shadow-sm transition-all duration-500 ${
                  highlightedElementId === `section-topic-${activeTopic.id}-purpose`
                    ? 'border-cyan-400 ring-4 ring-cyan-500/30 bg-cyan-950/20 scale-[1.005]'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  <Info className="w-4 h-4" />
                  <span>1. Инженерное Назначение и Физическая Роль</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  <MathText text={activeTopic.purpose} />
                </p>

                {/* Physical Significance Bullet Points */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {activeTopic.physicalSignificance.map((item, idx) => (
                    <div
                      key={idx}
                      id={`section-topic-${activeTopic.id}-phys-${idx}`}
                      className={`flex items-start gap-2 p-2.5 rounded-xl border text-xs transition-all duration-500 ${
                        highlightedElementId === `section-topic-${activeTopic.id}-phys-${idx}`
                          ? 'border-emerald-400 ring-2 ring-emerald-500/40 bg-emerald-950/40 text-emerald-200 scale-[1.02]'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><MathText text={item} /></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Математическое Обоснование & Уравнения */}
              <div
                id={`section-topic-${activeTopic.id}-math`}
                className={`p-4 sm:p-5 rounded-2xl bg-slate-950 border space-y-3 shadow-sm transition-all duration-500 ${
                  highlightedElementId === `section-topic-${activeTopic.id}-math`
                    ? 'border-indigo-400 ring-4 ring-indigo-500/40 bg-indigo-950/30 scale-[1.005]'
                    : 'border-slate-800'
                }`}
              >
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
                  <MathText text={activeTopic.mathematics.description} />
                </p>

                {/* Derivation Steps */}
                <div className="space-y-1.5 pt-1">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Численные этапы и аппроксимации:
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {activeTopic.mathematics.derivationSteps.map((step, idx) => (
                      <li
                        key={idx}
                        id={`section-topic-${activeTopic.id}-derivation-${idx}`}
                        className={`flex items-start gap-2 p-1.5 rounded-lg transition-all duration-500 ${
                          highlightedElementId === `section-topic-${activeTopic.id}-derivation-${idx}`
                            ? 'bg-purple-950/60 border border-purple-400 ring-2 ring-purple-500/40 text-purple-200'
                            : ''
                        }`}
                      >
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
                        <li
                          key={idx}
                          id={`section-topic-${activeTopic.id}-bc-${idx}`}
                          className={`flex items-start gap-2 p-1.5 rounded-lg transition-all duration-500 ${
                            highlightedElementId === `section-topic-${activeTopic.id}-bc-${idx}`
                              ? 'bg-amber-950/60 border border-amber-400 ring-2 ring-amber-500/40 text-amber-200'
                              : ''
                          }`}
                        >
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
                  <MathText text={activeTopic.uiWalkthrough.description} />
                </p>

                {/* Controls Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Элементы управления и входные параметры:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeTopic.uiWalkthrough.controls.map((ctrl, idx) => (
                      <div
                        key={idx}
                        id={`section-topic-${activeTopic.id}-control-${idx}`}
                        className={`p-3 rounded-xl border space-y-1 transition-all duration-500 ${
                          highlightedElementId === `section-topic-${activeTopic.id}-control-${idx}`
                            ? 'border-cyan-400 ring-2 ring-cyan-500/40 bg-cyan-950/50 scale-[1.02]'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                      >
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
                            <span className="text-slate-400">Рекомендация: </span>
                            <MathText text={ctrl.recommended} />
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
                      <div
                        key={idx}
                        id={`section-topic-${activeTopic.id}-readout-${idx}`}
                        className={`p-3 rounded-xl border space-y-1 transition-all duration-500 ${
                          highlightedElementId === `section-topic-${activeTopic.id}-readout-${idx}`
                            ? 'border-emerald-400 ring-2 ring-emerald-500/40 bg-emerald-950/50 scale-[1.02]'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                      >
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
                      <MathText text={activeTopic.engineeringWorkflow.title} />
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
                          id={`section-topic-${activeTopic.id}-step-${step.stepNumber}`}
                          className={`p-3 rounded-xl border space-y-2 transition-all duration-500 ${
                            highlightedElementId === `section-topic-${activeTopic.id}-step-${step.stepNumber}`
                              ? 'border-amber-400 ring-2 ring-amber-500/40 bg-amber-950/40 scale-[1.01]'
                              : 'bg-slate-900/90 border-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                {step.stepNumber}
                              </span>
                              <span className="text-xs font-bold text-slate-100">
                                <MathText text={step.title} />
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
                          <div
                            key={idx}
                            id={`section-topic-${activeTopic.id}-trouble-${idx}`}
                            className={`p-3 rounded-xl border text-xs space-y-1 transition-all duration-500 ${
                              highlightedElementId === `section-topic-${activeTopic.id}-trouble-${idx}`
                                ? 'border-rose-400 ring-2 ring-rose-500/40 bg-rose-950/50 scale-[1.01]'
                                : 'bg-rose-950/20 border-rose-900/40'
                            }`}
                          >
                            <div className="font-bold text-rose-300 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                              <span>Проблема: <MathText text={tip.issue} /></span>
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
                          <li
                            key={idx}
                            id={`section-topic-${activeTopic.id}-bestpractice-${idx}`}
                            className={`flex items-start gap-2 p-2 rounded-lg border transition-all duration-500 ${
                              highlightedElementId === `section-topic-${activeTopic.id}-bestpractice-${idx}`
                                ? 'border-cyan-400 ring-2 ring-cyan-500/40 bg-cyan-950/50 text-cyan-200'
                                : 'bg-slate-900/60 border-slate-800'
                            }`}
                          >
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
                    <div
                      key={idx}
                      id={`section-topic-${activeTopic.id}-reference-${idx}`}
                      className={`p-2.5 rounded-xl border text-xs text-slate-300 flex items-start justify-between gap-3 transition-all duration-500 ${
                        highlightedElementId === `section-topic-${activeTopic.id}-reference-${idx}`
                          ? 'border-purple-400 ring-2 ring-purple-500/40 bg-purple-950/50 scale-[1.01]'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    >
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
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-bold border border-slate-700">
                    7 Функциональных Зон
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-bold border border-slate-700">
                    30+ Параметров
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-bold border border-slate-700">
                    3D Hotkeys
                  </span>
                </div>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Что к Чему, Что Значит и Как Получить Результат
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-4xl leading-relaxed">
                Наглядное инженерное руководство по архитектуре рабочей области студии, физическому смыслу каждого ползунка и числового табло, правилам управления трехмерной сценой и сквозному экспорту данных.
              </p>
            </div>

            {/* A. Интерактивная Схема Рабочей Области Студии (7 Главных Зон) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
                  <Layers className="w-4 h-4" />
                  <span>А. Архитектурная Карта Экрана Студии (7 Функциональных Зон)</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Кликните на карточку зоны для открытия ее подробного паспорта
                </span>
              </div>

              {/* Visual Mockup Grid (7 Zones) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                {WORKSPACE_ZONES.map((zone) => {
                  const isSelected = activeWorkspaceZone === zone.id;
                  
                  // Layout span helper
                  let colSpan = 'md:col-span-6';
                  if (zone.id === 1) colSpan = 'md:col-span-12';
                  if (zone.id === 2) colSpan = 'md:col-span-4';
                  if (zone.id === 3) colSpan = 'md:col-span-8';
                  if (zone.id === 7) colSpan = 'md:col-span-12';

                  return (
                    <button
                      key={zone.id}
                      id={`section-zone-${zone.id}`}
                      type="button"
                      onClick={() => setActiveWorkspaceZone(zone.id)}
                      className={`${colSpan} p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        highlightedElementId === `section-zone-${zone.id}`
                          ? 'border-cyan-400 ring-4 ring-cyan-500/40 bg-cyan-950/50 scale-[1.02]'
                          : isSelected
                          ? `${zone.colorTheme.bgActive} ${zone.colorTheme.border} ring-2 ${zone.colorTheme.ring} shadow-lg scale-[1.005]`
                          : 'bg-slate-950 hover:bg-slate-900/90 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-bold flex items-center gap-1.5 ${isSelected ? zone.colorTheme.text : 'text-slate-200'}`}>
                          <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[10px] ${zone.colorTheme.badge}`}>
                            {zone.numberBadge}
                          </span>
                          <span>{zone.title}</span>
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          {zone.shortDomain}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                        {zone.role}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Selected Zone Deep Dive Passport */}
              {activeZoneInfo && (
                <div
                  id={`section-zone-${activeZoneInfo.id}-passport`}
                  className={`mt-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border space-y-4 animate-fadeIn shadow-lg transition-all duration-500 ${
                    highlightedElementId === `section-zone-${activeZoneInfo.id}-passport`
                      ? 'border-cyan-400 ring-4 ring-cyan-500/40'
                      : 'border-slate-700/80'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded-lg font-mono font-bold text-xs ${activeZoneInfo.colorTheme.badge}`}>
                        Зона {activeZoneInfo.numberBadge}
                      </span>
                      <h3 className="text-base font-bold text-white tracking-tight">
                        Паспорт Зоны: {activeZoneInfo.title}
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {activeZoneInfo.location}
                    </span>
                  </div>

                  {/* Zone Role & Controls */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                    {/* Left: Role and Inputs/Outputs */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <span className="text-slate-400 font-bold uppercase tracking-wider font-mono text-[10px] text-cyan-400">
                          🎯 Назначение & Роль в Проектировании:
                        </span>
                        <p className="text-slate-200 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                          {activeZoneInfo.role}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
                          <span className="text-emerald-400 font-bold uppercase tracking-wider font-mono text-[9px] flex items-center gap-1">
                            📥 Входные Данные:
                          </span>
                          <p className="text-[11px] text-slate-300">
                            {activeZoneInfo.inputsAndOutputs.inputs}
                          </p>
                        </div>
                        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
                          <span className="text-cyan-400 font-bold uppercase tracking-wider font-mono text-[9px] flex items-center gap-1">
                            📤 Выходные Результаты:
                          </span>
                          <p className="text-[11px] text-slate-300">
                            {activeZoneInfo.inputsAndOutputs.outputs}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right: Key Controls & Solvers */}
                    <div
                      id={`section-zone-${activeZoneInfo.id}-controls`}
                      className={`space-y-3 p-2 rounded-xl transition-all duration-500 ${
                        highlightedElementId === `section-zone-${activeZoneInfo.id}-controls`
                          ? 'bg-amber-950/40 border border-amber-400 ring-2 ring-amber-500/40'
                          : ''
                      }`}
                    >
                      <div className="space-y-1.5">
                        <span className="text-slate-400 font-bold uppercase tracking-wider font-mono text-[10px] text-amber-400">
                          🎛️ Ключевые Органы Управления & Кнопки:
                        </span>
                        <ul className="space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-[11px] text-slate-200">
                          {activeZoneInfo.keyControls.map((control, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-cyan-400 font-bold shrink-0">•</span>
                              <span><MathText text={control} /></span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-1">
                        <span className="text-slate-400 font-bold uppercase tracking-wider font-mono text-[10px] text-purple-400">
                          ⚡ Связанные Вычислительные Модули & Солверы:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {activeZoneInfo.solversConnected.map((solver, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/50 text-purple-300 border border-purple-800/60"
                            >
                              <MathText text={solver} />
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pro Tip Box */}
                  <div
                    id={`section-zone-${activeZoneInfo.id}-protip`}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs transition-all duration-500 ${
                      highlightedElementId === `section-zone-${activeZoneInfo.id}-protip`
                        ? 'border-amber-400 ring-2 ring-amber-500/40 bg-amber-950/50 scale-[1.01]'
                        : 'bg-amber-950/20 border-amber-800/40 text-amber-200/90'
                    }`}
                  >
                    <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300 mr-1 font-mono text-[11px]">
                        СОВЕТ ИНЖЕНЕРА:
                      </span>
                      <MathText text={activeZoneInfo.proTip} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* B. Большой Декодер Параметров & Терминов («Что к чему и что значит») */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                  <Sliders className="w-4 h-4" />
                  <span>Б. Декодер Параметров: Что Это Значит, Где Искать & Как Получить ({filteredDecoderItems.length})</span>
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
                  { id: 'uav_cad', label: 'БПЛА, САПР & Роторы' },
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
                    id={`section-decoder-${item.id}`}
                    className={`p-4 rounded-2xl border space-y-3 shadow-md transition-all duration-500 ${
                      highlightedElementId === `section-decoder-${item.id}`
                        ? 'border-cyan-400 ring-4 ring-cyan-500/40 bg-cyan-950/40 scale-[1.01]'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }`}
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
                    <div
                      id={`section-decoder-${item.id}-meaning`}
                      className={`space-y-1 text-xs p-1 rounded-lg transition-all duration-500 ${
                        highlightedElementId === `section-decoder-${item.id}-meaning`
                          ? 'bg-cyan-950/60 border border-cyan-400 ring-2 ring-cyan-500/40'
                          : ''
                      }`}
                    >
                      <span className="text-slate-400 font-bold uppercase tracking-wider font-mono text-[10px] text-cyan-400">
                        💡 Что это значит (Физический смысл):
                      </span>
                      <p className="text-slate-200 leading-relaxed">
                        <MathText text={item.meaning} />
                      </p>
                    </div>

                    {/* How to configure */}
                    <div
                      id={`section-decoder-${item.id}-configure`}
                      className={`space-y-1 text-xs p-2.5 rounded-xl border transition-all duration-500 ${
                        highlightedElementId === `section-decoder-${item.id}-configure`
                          ? 'bg-amber-950/60 border-amber-400 ring-2 ring-amber-500/40 text-amber-200'
                          : 'bg-slate-950/60 border-slate-800/80'
                      }`}
                    >
                      <span className="text-slate-400 font-bold uppercase tracking-wider font-mono text-[10px] text-amber-400">
                        ⚙️ Как настраивать & Рекомендуемые диапазоны:
                      </span>
                      <p className="text-slate-300">
                        <MathText text={item.howToConfigure} />
                      </p>
                    </div>

                    {/* How to obtain */}
                    <div
                      id={`section-decoder-${item.id}-obtain`}
                      className={`space-y-1 text-xs p-2.5 rounded-xl border transition-all duration-500 ${
                        highlightedElementId === `section-decoder-${item.id}-obtain`
                          ? 'bg-emerald-950/60 border-emerald-400 ring-2 ring-emerald-500/40 text-emerald-200'
                          : 'bg-emerald-950/20 border-emerald-900/40'
                      }`}
                    >
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

            {/* C. Шпаргалка по Управлению 3D Сценой & Горячие Клавиши (3D Viewport Controls & Shortcuts) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono">
                <Keyboard className="w-4 h-4" />
                <span>В. Интерактивная Панель Управления 3D Вьюпортом & Горячие Клавиши</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Быстрые команды для комфортной пространственной навигации, управления камерой Three.js и анализа вихревых структур.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Mouse & Touch Navigation */}
                <div
                  id="section-shortcuts-mouse"
                  className={`p-3.5 rounded-xl border space-y-2.5 transition-all duration-500 ${
                    highlightedElementId === 'section-shortcuts-mouse'
                      ? 'border-cyan-400 ring-2 ring-cyan-500/40 bg-cyan-950/40'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-cyan-300 font-mono text-xs border-b border-slate-800 pb-2">
                    <MousePointer className="w-4 h-4 text-cyan-400" />
                    <span>Манипуляция Мышью & Тачем</span>
                  </div>
                  <ul className="space-y-2 text-slate-300 text-[11px]">
                    <li className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-cyan-300 font-bold shrink-0">ЛКМ</span>
                      <span>Вращение 3D сцены (Orbit Controls) вокруг центра модели.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-cyan-300 font-bold shrink-0">ПКМ / Shift</span>
                      <span>Панорамирование (Pan) и сдвиг плоскости взгляда.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-cyan-300 font-bold shrink-0">Колесо</span>
                      <span>Плавное масштабирование (Zoom In/Out) к курсору.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-cyan-300 font-bold shrink-0">2x Клик</span>
                      <span>Фокусировка камеры на выбранном элементе крыла.</span>
                    </li>
                  </ul>
                </div>

                {/* Hotkeys & Shortcuts */}
                <div
                  id="section-shortcuts-keys"
                  className={`p-3.5 rounded-xl border space-y-2.5 transition-all duration-500 ${
                    highlightedElementId === 'section-shortcuts-keys'
                      ? 'border-amber-400 ring-2 ring-amber-500/40 bg-amber-950/40'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-amber-300 font-mono text-xs border-b border-slate-800 pb-2">
                    <Keyboard className="w-4 h-4 text-amber-400" />
                    <span>Быстрые Клавиши (Shortcuts)</span>
                  </div>
                  <ul className="space-y-2 text-slate-300 text-[11px]">
                    <li className="flex items-start gap-2">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-amber-300 font-bold border border-slate-700 shrink-0">R</kbd>
                      <span>Сброс камеры в исходную изометрическую проекцию.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-amber-300 font-bold border border-slate-700 shrink-0">X / Y / Z</kbd>
                      <span>Быстрое переключение секущих плоскостей Cut Planes.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-amber-300 font-bold border border-slate-700 shrink-0">Space</kbd>
                      <span>Пауза / возобновление анимации лагранжевых линий тока.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-amber-300 font-bold border border-slate-700 shrink-0">C</kbd>
                      <span>Экспорт снимка высокого разрешения (4K Snapshot).</span>
                    </li>
                  </ul>
                </div>

                {/* Color Scales & Visual Modes */}
                <div
                  id="section-shortcuts-scales"
                  className={`p-3.5 rounded-xl border space-y-2.5 transition-all duration-500 ${
                    highlightedElementId === 'section-shortcuts-scales'
                      ? 'border-emerald-400 ring-2 ring-emerald-500/40 bg-emerald-950/40'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-emerald-300 font-mono text-xs border-b border-slate-800 pb-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <span>Цветовые Шкалы & Физические Слои</span>
                  </div>
                  <ul className="space-y-2 text-slate-300 text-[11px]">
                    <li className="flex items-start gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 mt-0.5" />
                      <span><strong>Поле Давлений Cp:</strong> Синий — зона разрежения/тяги; Красный — торможение потока.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 mt-0.5" />
                      <span><strong>Число Маха M:</strong> Желтый — переход через критический Мах (<MathText text="$M_{\text{cr}}$" />); Красный — сверхзвуковой карман.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0 mt-0.5" />
                      <span><strong>Q-Критерий:</strong> Зелено-фиолетовые жгуты — концевые вихри и турбулентный след.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: ГОТОВЫЕ РЕЦЕПТЫ («КАК ПОЛУЧИТЬ РЕЗУЛЬТАТ» — ПОШАГОВЫЕ SOP)        */}
        {/* ========================================================================= */}
        {activeHandbookTab === 'recipes' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden animate-fadeIn">
            {/* Left Sidebar: Recipe Filter & List */}
            <div className="w-full md:w-80 lg:w-[410px] border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/70 p-3 sm:p-4 flex flex-col gap-2.5 shrink-0 overflow-hidden">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                  <Workflow className="w-4 h-4" />
                  <span>16 Экспресс-Сценариев (SOP)</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800">
                  {filteredRecipes.length} из {SOP_RECIPES.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 px-1">
                Пошаговые протоколы инженера: от ввода геометрии до валидации и экспорта
              </p>

              {/* Recipe Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                  placeholder="Поиск по рецептам, формулам, тегам..."
                  className="w-full pl-8.5 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                />
                {recipeSearch && (
                  <button
                    type="button"
                    onClick={() => setRecipeSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category Pills Filter */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar shrink-0 text-[10px] font-mono">
                {[
                  { id: 'all', label: 'Все' },
                  { id: 'aero', label: 'Аэро & CFD' },
                  { id: 'flight', label: 'Полет & Флаттер' },
                  { id: 'uav', label: 'БПЛА & Роторы' },
                  { id: 'cad', label: 'САПР & Экспорт' },
                  { id: 'space', label: 'Космос & GNC' },
                  { id: 'eda', label: 'EDA' },
                  { id: 'math', label: 'СЛАУ & GPU' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setRecipeCategory(c.id)}
                    className={`px-2 py-1 rounded-lg shrink-0 transition-all cursor-pointer ${
                      recipeCategory === c.id
                        ? 'bg-amber-500 text-slate-950 font-bold shadow'
                        : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Difficulty Filter */}
              <div className="flex items-center gap-1 text-[10px] font-mono shrink-0">
                <span className="text-slate-500 text-[9px] uppercase px-1">Уровень:</span>
                {[
                  { id: 'all', label: 'Все' },
                  { id: 'Базовый', label: 'Базовый' },
                  { id: 'Средний', label: 'Средний' },
                  { id: 'Продвинутый', label: 'Продвинутый' },
                  { id: 'Экспертный', label: 'Экспертный' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setRecipeDifficulty(d.id)}
                    className={`px-1.5 py-0.5 rounded text-[10px] transition-all cursor-pointer ${
                      recipeDifficulty === d.id
                        ? 'bg-slate-700 text-amber-300 font-bold border border-amber-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Recipe Cards List */}
              <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                {filteredRecipes.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 border border-slate-800/80 rounded-xl bg-slate-900/30">
                    Рецепты по запросу не найдены
                  </div>
                ) : (
                  filteredRecipes.map((recipe) => {
                    const isSelected = recipe.id === selectedRecipeId;
                    const doneSteps = completedSteps[recipe.id] || [];
                    const totalSteps = recipe.steps.length;
                    const isCompleted = doneSteps.length === totalSteps && totalSteps > 0;

                    const difficultyBadgeColor =
                      recipe.difficulty === 'Базовый'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800/60'
                        : recipe.difficulty === 'Средний'
                        ? 'bg-blue-950 text-blue-300 border-blue-800/60'
                        : recipe.difficulty === 'Продвинутый'
                        ? 'bg-amber-950 text-amber-300 border-amber-800/60'
                        : 'bg-purple-950 text-purple-300 border-purple-800/60';

                    return (
                      <button
                        key={recipe.id}
                        type="button"
                        onClick={() => setSelectedRecipeId(recipe.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                          isSelected
                            ? 'bg-gradient-to-r from-amber-950/90 to-slate-900 border-amber-500/80 text-white shadow-lg ring-1 ring-amber-500/40'
                            : 'bg-slate-900/50 hover:bg-slate-800/70 border-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs gap-1.5">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-5 h-5 rounded-md bg-slate-800 text-amber-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 border border-slate-700">
                              #{recipe.recipeNumber}
                            </span>
                            <span className="font-bold truncate text-slate-100">
                              <MathText text={recipe.title.replace(/^Рецепт \d+:\s*/, '')} />
                            </span>
                          </div>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                            {recipe.estimatedTime}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold ${difficultyBadgeColor}`}>
                              {recipe.difficulty}
                            </span>
                            <span className="text-amber-400/90 truncate">
                              [{recipe.targetDomain}]
                            </span>
                          </div>

                          {/* Progress indicator */}
                          <div className="flex items-center gap-1 text-[9px]">
                            {isCompleted ? (
                              <span className="flex items-center gap-0.5 text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-700/50">
                                <Check className="w-2.5 h-2.5" /> Выполнен
                              </span>
                            ) : doneSteps.length > 0 ? (
                              <span className="text-amber-300 font-mono">
                                {doneSteps.length}/{totalSteps} шагов
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          <MathText text={recipe.goal} />
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Main Panel: Recipe Execution Details */}
            <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6 bg-slate-900/50">
              
              {/* Recipe Header Card */}
              <div
                id={`section-recipe-${activeRecipe.id}-header`}
                className={`p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border space-y-3 relative overflow-hidden shadow-lg transition-all duration-500 ${
                  highlightedElementId === `section-recipe-${activeRecipe.id}-header`
                    ? 'border-amber-400 ring-4 ring-amber-500/40 scale-[1.005]'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-mono font-black text-xs flex items-center justify-center shadow">
                      #{activeRecipe.recipeNumber}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold uppercase tracking-wider">
                      {activeRecipe.targetDomain}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono">
                      Сложность: <strong className="text-white">{activeRecipe.difficulty}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      ~{activeRecipe.estimatedTime}
                    </span>
                    
                    {/* Copy Protocol Button */}
                    <button
                      type="button"
                      onClick={() => handleCopyRecipeProtocol(activeRecipe)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Скопировать текстовый протокол SOP в буфер обмена"
                    >
                      {copiedRecipeId === activeRecipe.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Скопировано!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Копировать SOP</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                  <MathText text={activeRecipe.title} />
                </h1>
                
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  <strong className="text-cyan-400">Целевой инженерный результат: </strong>
                  <MathText text={activeRecipe.goal} />
                </p>

                {/* Chapter jump link if available */}
                {activeRecipe.relatedTopicId && (
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTopicId(activeRecipe.relatedTopicId!);
                        setActiveHandbookTab('chapters');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900/90 text-indigo-300 hover:text-indigo-100 border border-indigo-700/60 text-xs font-mono transition-all cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Открыть теоретическую главу руководства</span>
                      <ArrowRight className="w-3 h-3 text-indigo-400" />
                    </button>
                  </div>
                )}
              </div>

              {/* Prerequisites & Verification Criteria Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Prerequisites Card */}
                <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
                    <ListChecks className="w-4 h-4" />
                    <span>Предварительные Требования & Вход:</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300 pl-1">
                    {activeRecipe.prerequisites.map((p, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                        <span><MathText text={p} /></span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Verification Criteria Card */}
                <div
                  id={`section-recipe-${activeRecipe.id}-criteria`}
                  className={`p-4 rounded-xl border space-y-2 transition-all duration-500 ${
                    highlightedElementId === `section-recipe-${activeRecipe.id}-criteria`
                      ? 'border-emerald-400 ring-2 ring-emerald-500/40 bg-emerald-950/50 scale-[1.01]'
                      : 'bg-slate-950/90 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                    <Target className="w-4 h-4" />
                    <span>Критерий Приемки & Верификации:</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed pl-1">
                    <MathText text={activeRecipe.verificationCriteria} />
                  </p>
                </div>
              </div>

              {/* Steps Detailed Flow with Interactive Checkbox */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-sm">
                <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" />
                    <span>Пошаговый Протокол Действий Инженера ({activeRecipe.steps.length} шага):</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 lowercase font-normal">
                    отмечайте шаги по мере выполнения
                  </span>
                </div>

                <div className="space-y-3">
                  {activeRecipe.steps.map((st) => {
                    const isStepDone = (completedSteps[activeRecipe.id] || []).includes(st.stepNumber);

                    return (
                      <div
                        key={st.stepNumber}
                        id={`section-recipe-${activeRecipe.id}-step-${st.stepNumber}`}
                        className={`p-4 rounded-xl border transition-all duration-500 ${
                          highlightedElementId === `section-recipe-${activeRecipe.id}-step-${st.stepNumber}`
                            ? 'border-amber-400 ring-4 ring-amber-500/40 bg-amber-950/60 scale-[1.01]'
                            : isStepDone
                            ? 'bg-slate-900/50 border-emerald-800/60 shadow-sm opacity-90'
                            : 'bg-slate-900/90 border-slate-800 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            {/* Interactive Step Checkbox */}
                            <button
                              type="button"
                              onClick={() => toggleStepCompleted(activeRecipe.id, st.stepNumber)}
                              className={`w-6 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                                isStepDone
                                  ? 'bg-emerald-600 border-emerald-400 text-slate-950'
                                  : 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                              }`}
                              title={isStepDone ? 'Отметить как невыполненный' : 'Отметить шаг как выполненный'}
                            >
                              {isStepDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : st.stepNumber}
                            </button>
                            <h3 className={`text-xs sm:text-sm font-bold ${isStepDone ? 'text-emerald-300 line-through' : 'text-white'}`}>
                              <MathText text={st.title} />
                            </h3>
                          </div>

                          <div className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 shrink-0">
                            <MousePointer className="w-3 h-3 text-cyan-400" />
                            <span><MathText text={st.whereToClick} /></span>
                          </div>
                        </div>

                        <div className="text-xs text-slate-300 pl-8 space-y-2 pt-2">
                          <p className="leading-relaxed">
                            <MathText text={st.description} />
                          </p>
                          <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/40 text-[11px] text-emerald-300 flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">Что покажет экран / Что ожидать: </span>
                              <MathText text={st.expectedOutcome} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pro Tip Callout */}
                <div
                  id={`section-recipe-${activeRecipe.id}-protip`}
                  className={`p-3.5 sm:p-4 rounded-xl border text-xs space-y-1 transition-all duration-500 ${
                    highlightedElementId === `section-recipe-${activeRecipe.id}-protip`
                      ? 'border-amber-400 ring-2 ring-amber-500/40 bg-amber-950/60 scale-[1.01]'
                      : 'bg-gradient-to-r from-cyan-950/40 to-slate-900 border-cyan-500/30'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-cyan-300 font-mono uppercase tracking-wider text-[11px]">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    <span>Инженерная Рекомендация & Лайфхак (Pro Tip):</span>
                  </div>
                  <p className="text-slate-300 pl-5 leading-relaxed">
                    <MathText text={activeRecipe.proTip} />
                  </p>
                </div>
              </div>

              {/* Quick Navigation Between Recipes */}
              <div className="flex items-center justify-between pt-2">
                {(() => {
                  const currentIndex = SOP_RECIPES.findIndex((r) => r.id === activeRecipe.id);
                  const prevRecipe = currentIndex > 0 ? SOP_RECIPES[currentIndex - 1] : null;
                  const nextRecipe = currentIndex < SOP_RECIPES.length - 1 ? SOP_RECIPES[currentIndex + 1] : null;

                  return (
                    <>
                      {prevRecipe ? (
                        <button
                          type="button"
                          onClick={() => setSelectedRecipeId(prevRecipe.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                          <span>#{prevRecipe.recipeNumber} Предыдущий</span>
                        </button>
                      ) : <div />}

                      {nextRecipe ? (
                        <button
                          type="button"
                          onClick={() => setSelectedRecipeId(nextRecipe.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <span>#{nextRecipe.recipeNumber} Следующий</span>
                          <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                      ) : <div />}
                    </>
                  );
                })()}
              </div>

            </div>
          </div>
        )}
        </>
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

