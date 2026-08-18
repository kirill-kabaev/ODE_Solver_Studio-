import { SparseMatrixCSR, SuiteSparseMeta, PhysicalDomainInfo, MatrixComplexityMetrics } from '../types/sparse';

/**
 * Maps matrices to their exact physical problem description, governing PDEs,
 * physical significance, and real-world engineering application.
 */
export function getMatrixPhysicalDomain(
  matrix: SparseMatrixCSR | SuiteSparseMeta | string
): PhysicalDomainInfo {
  const name = typeof matrix === 'string' ? matrix : matrix.name || '';
  const group = typeof matrix === 'string' ? '' : (matrix as any).group || '';
  const kind = typeof matrix === 'string' ? '' : (matrix as any).kind || '';
  const lower = `${name} ${group} ${kind}`.toLowerCase();

  // 1. 2D Poisson Grid (Diffusion, Heat transfer, Electrostatics)
  if (lower.includes('poisson') && lower.includes('2d') || lower.includes('laplacian 2d') || lower.includes('5-point')) {
    return {
      domainKey: 'poisson2d',
      title: 'Уравнение Пуассона 2D (Теплопроводность и Электростатика)',
      field: 'Теплофизика, Электростатика и Теория потенциала',
      governingEquation: '-\\nabla^2 u(x,y) = -\\left(\\frac{\\partial^2 u}{\\partial x^2} + \\frac{\\partial^2 u}{\\partial y^2}\\right) = f(x,y)',
      description: 'Моделирует стационарное распределение температуры в твердой 2D пластине, электростатический потенциал между электродами или поле давлений несжимаемой жидкости.',
      physicalSignificance: 'Каждый внутренний узел сетки усредняет значения 4 соседних узлов (5-точечный шаблон). Матрица является симметричной положительно определенной (SPD) и строго обусловленной.',
      practicalApplication: 'Расчет теплоотвода радиаторов микропроцессоров, моделирование полупроводниковых структур и изоляторов высокого напряжения.',
    };
  }

  // 2. 3D Poisson Cube
  if (lower.includes('poisson') && lower.includes('3d') || lower.includes('laplacian 3d') || lower.includes('7-point')) {
    return {
      domainKey: 'poisson3d',
      title: 'Уравнение Пуассона 3D в объеме (Объемный теплообмен)',
      field: 'Вычислительная физика и 3D моделирование полей',
      governingEquation: '-\\nabla^2 u(x,y,z) = -\\left(\\frac{\\partial^2 u}{\\partial x^2} + \\frac{\\partial^2 u}{\\partial y^2} + \\frac{\\partial^2 u}{\\partial z^2}\\right) = \\frac{\\rho}{\\varepsilon_0}',
      description: 'Трехмерное уравнение Пуассона для объемных тел. Моделирует гравитационный потенциал массивных скоплений, распределение электрического заряда в плазме или 3D нагрев композитов.',
      physicalSignificance: 'Связывает каждый 3D воксель с 6 пространственными соседями (7-точечный 3D шаблон). Имеет блочно-тридиагональную структуру с высокой локальностью.',
      practicalApplication: 'Аэрокосмическое моделирование нагрева обшивки летательных аппаратов, медицинская томография и ядерные реакторы.',
    };
  }

  // 3. Structural Mechanics / Elastic Beam Stiffness
  if (lower.includes('structural') || lower.includes('beam') || lower.includes('bcsstk') || lower.includes('elastic') || lower.includes('nos') || lower.includes('cantilever') || lower.includes('frame')) {
    return {
      domainKey: 'structural',
      title: 'Механика деформируемого твердого тела (МКЭ Упругости)',
      field: 'Строительная механика, FEA и Прочность конструкций',
      governingEquation: 'E I \\frac{d^4 w(x)}{dx^4} = q(x) \\quad \\Longleftrightarrow \\quad \\mathbf{K} \\cdot \\mathbf{u} = \\mathbf{F}',
      description: 'Глобальная матрица жесткости $\\mathbf{K}$ конструкции при статическом нагружении. Определяет узловые смещения $\\mathbf{u}$ под действием приложенных сил $\\mathbf{F}$.',
      physicalSignificance: 'Симметричная положительно определенная матрица (SPD). Отражает закон Гука и баланс упругих сил в узлах ферм, балок Эйлера-Бернулли и пластин.',
      practicalApplication: 'Анализ прочности мостов, фюзеляжей самолетов, строительных конструкций при ветровых и сейсмических нагрузках (ANSYS / Nastran).',
    };
  }

  // 4. Circuit Simulation & SPICE MNA (VLSI)
  if (lower.includes('circuit') || lower.includes('transistor') || lower.includes('add') || lower.includes('memp') || lower.includes('spice') || lower.includes('vlsi') || lower.includes('bcircuit')) {
    return {
      domainKey: 'circuit',
      title: 'Моделирование интегральных схем (SPICE Modified Nodal Analysis)',
      field: 'Микроэлектроника, СБИС и Схемотехнический анализ',
      governingEquation: '\\mathbf{G} \\cdot \\mathbf{v} + \\mathbf{C} \\cdot \\frac{d\\mathbf{v}}{dt} = \\mathbf{i}(t) \\quad \\Longleftrightarrow \\quad \\sum I_{node} = 0',
      description: 'Уравнения законов Кирхгофа (KCL) для узловых потенциалов и токов в интегральной микросхеме с миллиардами транзисторов и RC-связей.',
      physicalSignificance: 'Несимметричная разреженная матрица с сильной асимметрией проводимостей из-за коэффициентов усиления транзисторов (активные источники тока).',
      practicalApplication: 'Проектирование процессоров, GPU, оперативной памяти и ВЧ-микросхем в САПР Cadence, Synopsys и SPICE.',
    };
  }

  // 5. Convection-Diffusion CFD (Navier-Stokes / Fluid dynamics)
  if (lower.includes('convection') || lower.includes('diffusion') || lower.includes('cfd') || lower.includes('navier') || lower.includes('driven') || lower.includes('cavity') || lower.includes('wind')) {
    return {
      domainKey: 'cfd',
      title: 'Гидродинамика и Перенос примеси (Конвекция-Диффузия)',
      field: 'Вычислительная гидрогазодинамика (CFD)',
      governingEquation: '-\\varepsilon \\nabla^2 c + \\mathbf{v} \\cdot \\nabla c = f \\quad (Pe = \\frac{\\|\\mathbf{v}\\| L}{\\varepsilon})',
      description: 'Моделирует перенос тепла или концентрации загрязняющего вещества потоком жидкости или газа с учетом диффузионного рассеяния и числа Пекле (Pe).',
      physicalSignificance: 'Сильно несимметричная матрица. Конвективный член $\\mathbf{v} \\cdot \\nabla c$ создает направленный снос (wind advection), вызывая осцилляции при простых схемах.',
      practicalApplication: 'Аэродинамика автомобилей и крыльев самолетов, прогнозирование погоды, моделирование течений в турбинах и трубах.',
    };
  }

  // 6. Power Grid & Energy Networks
  if (lower.includes('power') || lower.includes('grid') || lower.includes('ieee') || lower.includes('bus') || lower.includes('energy') || lower.includes('psmig')) {
    return {
      domainKey: 'power_grid',
      title: 'Энергетические системы и Баланс мощностей (IEEE Power Flow)',
      field: 'Электроэнергетика и Управление энергосетями',
      governingEquation: '\\mathbf{I}_{bus} = \\mathbf{Y}_{bus} \\cdot \\mathbf{V}_{bus} \\quad \\Longleftrightarrow \\quad P_i + j Q_i = V_i \\sum Y_{ik}^* V_k^*',
      description: 'Матрица узловых проводимостей $\\mathbf{Y}_{bus}$ высоковольтной энергосистемы для расчета перетоков активной и реактивной мощности.',
      physicalSignificance: 'Симметричная комплексная структура с высокой разреженностью (каждая подстанция связана лишь с 2–4 соседними ЛЭП).',
      practicalApplication: 'Оптимизация режимов работы национальных энергосетей, предотвращение блэкаутов и интеграция ветровых/солнечных электростанций.',
    };
  }

  // 7. Graph Laplacian & Network Clustering
  if (lower.includes('graph') || lower.includes('laplacian') || lower.includes('network') || lower.includes('minnesota') || lower.includes('delaunay')) {
    return {
      domainKey: 'graph',
      title: 'Спектральная теория графов (Матрица Кирхгофа / Лапласиан)',
      field: 'Теория сетей, Анализ графов и Data Science',
      governingEquation: '\\mathbf{L} = \\mathbf{D} - \\mathbf{A}, \\quad L_{ii} = \\text{deg}(v_i), \\quad L_{ij} = -1',
      description: 'Дискретный оператор Лапласа на графе. Описывает диффузионные процессы, распространение информации и спектральное разбиение сетей.',
      physicalSignificance: 'Симметричная положительно полуопределенная матрица со строгим диагональным балансом $\\sum_j L_{ij} = 0$. Нулевое собственное число соответствует связным компонентам.',
      practicalApplication: 'Кластеризация социальных сетей, маршрутизация пакетов в Интернете и спектральное встраивание многообразий в ML.',
    };
  }

  // 8. Wathen Finite Element Matrix
  if (lower.includes('wathen') || lower.includes('fem') || lower.includes('element')) {
    return {
      domainKey: 'wathen',
      title: 'Метод Конечных Элементов (МКЭ Матрица Ватена)',
      field: 'Вычислительная математика и Метод конечных элементов',
      governingEquation: 'M_{ij} = \\int_\\Omega \\rho(x) \\, \\phi_i(x) \\, \\phi_j(x) \\, d\\Omega',
      description: 'Матрица масс/жесткости для двумерных 8-узловых биквадратичных четырехугольных конечных элементов Serendipity со случайной плотностью материала $\\rho(x)$.',
      physicalSignificance: 'Симметричная положительно определенная матрица с постоянным спектральным диапазоном, идеальный эталон для проверки предобуславливателей.',
      practicalApplication: 'Численное решение уравнений волновой динамики, теплопроводности и акустики в средах со сложной геометрией.',
    };
  }

  // 9. Toeplitz / Signal processing
  if (lower.includes('toeplitz') || lower.includes('banded') || lower.includes('signal') || lower.includes('filter')) {
    return {
      domainKey: 'toeplitz',
      title: 'Теплицевы операторы и Цифровая фильтрация (DSP)',
      field: 'Цифровая обработка сигналов и Временные ряды',
      governingEquation: 'y[n] = \\sum_{k} h[k] \\, x[n-k] \\quad \\Longleftrightarrow \\quad \\mathbf{T} \\cdot \\mathbf{x} = \\mathbf{y}',
      description: 'Матрица с постоянными диагоналями $A_{i,j} = a_{i-j}$. Моделирует линейную дискретную свертку, авторегрессионные фильтры и обратные задачи деконволюции.',
      physicalSignificance: 'Ленточная диагональная структура, отражающая инвариантность физического процесса во времени или пространстве.',
      practicalApplication: 'Обработка сейсмических сигналов, шумоподавление аудио, реконструкция изображений и радарная интерферометрия.',
    };
  }

  // Default fallback for general sparse matrices
  return {
    domainKey: 'general_pde',
    title: 'Дискретная дифференциальная система (Краевая задача МКЭ/МКР)',
    field: 'Прикладная математика и Математическая физика',
    governingEquation: '\\mathcal{L}[u] = f(x) \\quad \\xrightarrow{\\text{дискретизация}} \\quad \\mathbf{A} \\cdot \\mathbf{x} = \\mathbf{b}',
    description: 'Система линейных алгебраических уравнений высокого порядка, полученная при дискретизации дифференциальных уравнений в частных производных.',
    physicalSignificance: 'Разреженная структура отражает локальное взаимодействие узлов физической расчетной сетки без дальнодействующих связей.',
    practicalApplication: 'Численное моделирование сложных физических явлений, гидродинамики, геофизики и прочностных расчетов.',
  };
}

/**
 * Calculates matrix size, memory usage, sparsity density, conditioning,
 * and difficulty rating.
 */
export function computeMatrixComplexity(
  matrix: SparseMatrixCSR,
  conditionEstimate?: number
): MatrixComplexityMetrics {
  const { rows, cols, nnz, isSymmetric, bandwidth = 0, isDiagonallyDominant = false } = matrix;
  const size = rows;
  const totalEntries = rows * cols;
  const densityPercent = totalEntries > 0 ? (nnz / totalEntries) * 100 : 0;
  const avgNnzPerRow = rows > 0 ? nnz / rows : 0;

  // CSR Memory calculation:
  // rowPtr: (rows + 1) * 4 bytes (Int32)
  // colInd: nnz * 4 bytes (Int32)
  // values: nnz * 8 bytes (Float64)
  const memoryBytes = (rows + 1) * 4 + nnz * 4 + nnz * 8;
  const formattedMemory = formatBytes(memoryBytes);

  // Evaluate difficulty rating
  let difficultyRating: 'easy' | 'medium' | 'hard' | 'ill_conditioned' = 'medium';
  let difficultyLabel = 'Средняя сложность';
  let difficultyExplanation = '';

  const cond = conditionEstimate || (matrix.isDiagonallyDominant ? 15 : isSymmetric ? 250 : 2500);

  if (isDiagonallyDominant && isSymmetric) {
    difficultyRating = 'easy';
    difficultyLabel = 'Низкая сложность (Высокая устойчивость)';
    difficultyExplanation = 'Матрица симметрична (SPD) и строго диагонально доминирует. Итерационные методы CG и Jacobi сходятся быстро и гарантированно без численных осцилляций.';
  } else if (cond > 50000 || (!isSymmetric && !isDiagonallyDominant && avgNnzPerRow > 15)) {
    difficultyRating = 'ill_conditioned';
    difficultyLabel = 'Критическая сложность (Плохо обусловленная система)';
    difficultyExplanation = 'Матрица имеет высокое число обусловленности или существенную несимметрию. Требуется сильное предобуславливание (PCG/ILU) или алгоритм BiCGSTAB/GMRES.';
  } else if (!isSymmetric || cond > 2000) {
    difficultyRating = 'hard';
    difficultyLabel = 'Повышенная сложность (Несимметричная / Жесткая)';
    difficultyExplanation = 'Несимметричный спектр или жесткая связь узлов. Классический метод сопряженных градиентов неприменим; требуются стабилизированные решатели BiCGSTAB/GMRES.';
  } else {
    difficultyRating = 'medium';
    difficultyLabel = 'Умеренная сложность';
    difficultyExplanation = 'Стандартная разреженная сеточная система. Отлично параллелится на CPU (OpenMP) и GPU (NVIDIA CUDA), обеспечивая сходимость за несколько десятков итераций.';
  }

  return {
    size,
    nnz,
    densityPercent,
    memoryBytes,
    formattedMemory,
    isSymmetric,
    isDiagonallyDominant,
    bandwidth,
    avgNnzPerRow,
    conditionNumberEstimate: conditionEstimate,
    difficultyRating,
    difficultyLabel,
    difficultyExplanation,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatSolverTime(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)} мкс`;
  if (ms < 1000) return `${ms.toFixed(1)} мс`;
  return `${(ms / 1000).toFixed(3)} с (${ms.toFixed(0)} мс)`;
}
