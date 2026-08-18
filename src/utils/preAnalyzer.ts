import { PreAnalysisResult, DimensionMode } from '../types';

/**
 * Universal local math pre-analyzer:
 * Analyzes the differential equation structure, identifies 2D vs 3D dimension,
 * order, linearity, special terms (partial derivatives, vector fields, systems, chaos),
 * and determines which engines (CPU, GPU, AI Gemini) can solve or simulate it,
 * with recommended engine, physical properties, and applications.
 */
export function analyzeDifferentialEquation(equation: string): PreAnalysisResult {
  const raw = equation.trim();
  const cleaned = raw.replace(/\s+/g, '').replace(/\\cdot/g, '*');

  // Detect Dimension (2D vs 3D)
  const is3D =
    cleaned.includes('∂') ||
    cleaned.includes('\\nabla') ||
    cleaned.includes('∇') ||
    cleaned.includes('dx/dt') ||
    cleaned.includes('dy/dt') ||
    cleaned.includes('dz/dt') ||
    cleaned.includes("y'''") ||
    cleaned.includes('y^{(3)}') ||
    cleaned.includes('d3y') ||
    cleaned.includes('d²r') ||
    cleaned.includes('d2r') ||
    cleaned.includes('r³') ||
    cleaned.includes('r^3') ||
    cleaned.includes('g*m') ||
    cleaned.includes('гравитац') ||
    cleaned.includes('кеплер') ||
    cleaned.includes('kepler') ||
    cleaned.includes('шрёдинг') ||
    cleaned.includes('schrodinger') ||
    cleaned.includes('тьюринг') ||
    cleaned.includes('turing') ||
    cleaned.includes('гельмгольц') ||
    cleaned.includes('helmholtz') ||
    cleaned.includes('рёсслер') ||
    cleaned.includes('rossler') ||
    cleaned.includes('лоренц') ||
    cleaned.includes('lorentz') ||
    /z\b/.test(cleaned) ||
    (/t\b/.test(cleaned) && (cleaned.includes('x') && cleaned.includes('y')));

  const dimension: DimensionMode = is3D ? '3D' : '2D';

  let order = 1;
  if (cleaned.includes("y'''") || cleaned.includes("y^{(3)}") || cleaned.includes("d3y/dx3") || cleaned.includes("d³y")) {
    order = 3;
  } else if (
    cleaned.includes("y''") ||
    cleaned.includes("y^{(2)}") ||
    cleaned.includes("d2y/dx2") ||
    cleaned.includes("d²r") ||
    cleaned.includes("d2r") ||
    cleaned.includes("∂²") ||
    cleaned.includes("∇²")
  ) {
    order = 2;
  } else if (cleaned.includes("y'") || cleaned.includes("dy/dx") || cleaned.includes("∂")) {
    order = 1;
  }

  // Detect non-linear terms in y / z / r
  const isNonLinear =
    /y\^[2-9]/.test(cleaned) ||
    /z\^[2-9]/.test(cleaned) ||
    /r\^[2-9]/.test(cleaned) ||
    /y\*y|z\*z|x\*y\*z|x\*z/.test(cleaned) ||
    /sin\(y\)|cos\(y\)|exp\(y\)|e\^y|ln\(y\)|sqrt\(y\)/.test(cleaned) ||
    /\(1-y\^2\)/.test(cleaned) ||
    cleaned.includes('r³') ||
    cleaned.includes('r^3');

  // Detect 3D Physics models
  const isKepler =
    cleaned.includes('d²r') ||
    cleaned.includes('d2r') ||
    cleaned.includes('r³') ||
    cleaned.includes('r^3') ||
    cleaned.includes('g*m') ||
    cleaned.includes('гравитац') ||
    cleaned.includes('кеплер') ||
    cleaned.includes('kepler');
  const isHeat = cleaned.includes('∂T/∂t') || (cleaned.includes('T') && cleaned.includes('∇²'));
  const isWave = cleaned.includes('∂²u/∂t²') || (cleaned.includes('u') && cleaned.includes('∇²') && cleaned.includes('c'));
  const isLaplace = cleaned.includes('∇²Φ') || cleaned.includes('∇²u') || cleaned.includes('∇²ψ');
  const isLorenz = cleaned.includes('σ') || (cleaned.includes('dx/dt') && cleaned.includes('xy'));
  const isRossler = cleaned.includes('рёсслер') || cleaned.includes('rossler') || (cleaned.includes('dz/dt') && cleaned.includes('z(x-c)'));
  const isLorentzForce = cleaned.includes('q*(e+v') || cleaned.includes('v×b') || cleaned.includes('силылоренца') || cleaned.includes('винтов');
  const isQuantum = cleaned.includes('Ψ') || cleaned.includes('ℏ') || cleaned.includes('шрёдинг') || cleaned.includes('schrodinger');
  const isTuring = cleaned.includes('тьюринг') || cleaned.includes('turing') || cleaned.includes('реакция-диффузия');
  const isHelmholtz = cleaned.includes('гельмгольц') || cleaned.includes('helmholtz') || cleaned.includes('k²·ψ') || cleaned.includes('k^2*ψ');

  // Detect variable coefficients
  const hasVariableCoefficients =
    /x\*?y''|x\^2\*?y''|x\*?y'|t\*?y'/.test(cleaned) && !/sin\(x\)|cos\(x\)|exp\(x\)/.test(cleaned);

  const isOscillator =
    order === 2 &&
    (cleaned.includes("cos(") || cleaned.includes("sin(") || /y''\s*[\+\-]\s*\d*\*?y/.test(cleaned));

  const isVanDerPol =
    cleaned.includes("1-y^2") || cleaned.includes("1-y*y");

  // Determine capabilities of CPU, GPU, and AI
  const cpuCapable =
    (!is3D && order === 2 && !isNonLinear && !hasVariableCoefficients) ||
    (!is3D && order === 1 && !cleaned.includes("ln(x)") && !cleaned.includes("tan(") && !isNonLinear) ||
    (is3D && (isKepler || isHeat || isWave || isLaplace || isLorenz || isQuantum || isRossler || isLorentzForce || isTuring || isHelmholtz || order === 3));

  const gpuCapable = true; // GPU shader / canvas engine simulates both 2D and 3D heatmaps, phase spaces and fields
  const aiCapable = true;

  let recommendedEngine: 'cpu' | 'gpu' | 'ai' = 'cpu';
  let engineRecommendationReason = '';

  if (is3D) {
    if (isLorenz || isRossler || isVanDerPol) {
      recommendedEngine = 'gpu';
      engineRecommendationReason =
        '3D Нелинейная динамическая система (Хаос / Странный аттрактор). GPU движок обеспечивает мгновенное аппаратное интегрирование фазовых траекторий RK4 и тепловой карты скоростей.';
    } else if (isKepler) {
      recommendedEngine = 'cpu';
      engineRecommendationReason =
        '3D Гравитационное поле Ньютона и орбитальная динамика Кеплера. Локальное ядро рассчитывает 3D потенциальную яму, силовые линии гравитации и эллиптические орбиты мгновенно.';
    } else if (isHeat || isWave || isLaplace || isQuantum || isHelmholtz || isTuring || isLorentzForce) {
      recommendedEngine = 'cpu';
      engineRecommendationReason =
        '3D Уравнение математической физики. Локальное ядро рассчитывает скалярное поле, тепловые срезы и градиенты мгновенно.';
    } else {
      recommendedEngine = 'ai';
      engineRecommendationReason =
        '3D Дифференциальное уравнение в частных производных. Рекомендуется символьный анализ через AI Gemini CAS.';
    }
  } else {
    if (isVanDerPol) {
      recommendedEngine = 'gpu';
      engineRecommendationReason =
        'Нелинейное ОДУ 2-го порядка (предельные циклы / автоколебания). Рекомендуется GPU для фазового портрета.';
    } else if (order >= 3 || hasVariableCoefficients || isNonLinear) {
      recommendedEngine = 'ai';
      engineRecommendationReason =
        'Сложное/нелинейное уравнение высшего порядка. Рекомендуется мощный символьный движок AI Gemini CAS.';
    } else {
      recommendedEngine = 'cpu';
      engineRecommendationReason =
        'Линейное ДУ с постоянными коэффициентами. Локальное ядро CPU решает его мгновенно и офлайн.';
    }
  }

  // Type classification
  let detectedType = is3D ? '3D Дифференциальное уравнение / Поле матфизики' : 'Обыкновенное дифференциальное уравнение (2D)';
  let linearity = isNonLinear ? 'Нелинейное' : 'Линейное';
  let properties: string[] = [];
  let physicalApplications: string[] = [];

  if (is3D) {
    if (isKepler) {
      detectedType = '3D Гравитационное поле Кеплера (Задача двух тел / Закон всемирного тяготения)';
      properties = [
        'Размерность: 3D Пространство (x, y, z) + время t',
        'Центральное гравитационное поле: F = -G·M·m/r³ · r = -∇Φ_G',
        'Гравитационный потенциал Ньютона: Φ_G(r) = -G·M / r',
        'Законы Кеплера: 1) Эллиптические орбиты, 2) dS/dt = const, 3) T²/a³ = const',
        'Интегралы движения: Полная энергия E = v²/2 - GM/r, Момент импульса L = r × v',
      ];
      physicalApplications = [
        'Орбитальная механика, космические полеты и спутниковая навигация',
        'Движение планет и астероидов вокруг Солнца (Задача Кеплера)',
        'Гравитационные маневры и межпланетные траектории',
        'Астрофизика сверхмассивных объектов и галактические потенциалы',
      ];
    } else if (isHeat) {
      detectedType = '3D Уравнение теплопроводности Фурье (Параболический тип PDE)';
      properties = [
        'Размерность: 3D (Пространство x, y, z + время t)',
        'Тип: Параболическое уравнение в частных производных 2-го порядка',
        'Оператор Лапласа: ∇²T = ∂²T/∂x² + ∂²T/∂y² + ∂²T/∂z²',
        'Фундаментальное решение: 3D Гауссов тепловой пакет',
      ];
      physicalApplications = [
        'Термодинамика и теплопередача в 3D материалах',
        'Диффузия газов и примесей в атмосфере и полупроводниках',
        'Финансовая математика (Уравнение Блэка-Шоулза)',
      ];
    } else if (isWave) {
      detectedType = '3D Волновое уравнение Д\'Аламбера (Гиперболический тип PDE)';
      properties = [
        'Размерность: 3D (Пространство x, y, z + время t)',
        'Тип: Гиперболическое волновое уравнение',
        'Скорость фазы: c, закон затухания амплитуды: ~ 1/r',
        'Принцип Гюйгенса-Френеля в 3D',
      ];
      physicalApplications = [
        'Распространение звуковых и сейсмических 3D волн',
        'Электромагнитные волны и радиосвязь (Уравнения Максвелла)',
        'Оптика и лазерная интерферометрия',
      ];
    } else if (isLorenz) {
      detectedType = '3D Аттрактор Лоренца (Система ОДУ 3-го порядка, Детерминированный Хаос)';
      properties = [
        'Размерность: 3D Фазовое пространство (x, y, z)',
        'Нелинейные перекрестные члены: x·z и x·y',
        'Дробная фрактальная размерность аттрактора: D ≈ 2.06',
        'Чувствительность к начальным условиям (Эффект бабочки)',
      ];
      physicalApplications = [
        'Атмосферная конвекция и метеорология',
        'Теория турбулентности и гидродинамический хаос',
        'Криптография и генераторы псевдослучайных чисел',
      ];
    } else if (isLaplace) {
      detectedType = '3D Уравнение Лапласа и Пуассона (Эллиптический тип PDE)';
      properties = [
        'Размерность: 3D Пространство (x, y, z)',
        'Гармонические функции: ∇²Φ = 0',
        'Принцип максимума: экстремумы только на границах области',
        'Ортогональность силовых линий и эквипотенциальных поверхностей',
      ];
      physicalApplications = [
        'Электростатика и расчет потенциалов конденсаторов',
        'Гравитационные поля массивных астрофизических тел',
        'Потенциальные течения идеальной несжимаемой жидкости',
      ];
    } else {
      detectedType = '3D Дифференциальная система / Уравнение матфизики';
      properties = [
        'Размерность: 3D',
        'Анализ распределения в пространстве (x, y, z)',
        'Градиенты и векторные потоки',
      ];
      physicalApplications = [
        'Теоретическая и математическая физика',
        'Численное гидродинамическое моделирование',
      ];
    }
  } else {
    // 2D classification
    if (order === 2) {
      if (isVanDerPol) {
        detectedType = 'Нелинейное уравнение Ван дер Поля / Релаксационный осциллятор';
        properties = [
          'Порядок: 2',
          'Нелинейное демпфирование: (1 - y²)y\'',
          'Наличие устойчивого предельного цикла (автоколебания)',
        ];
        physicalApplications = [
          'Радиотехника (генераторы колебаний)',
          'Биофизика (пейсмейкерные клетки сердца)',
        ];
      } else if (isOscillator) {
        detectedType = 'Линейное ОДУ 2-го порядка (Колебательная система / Осциллятор)';
        properties = [
          'Порядок: 2',
          'Линейное с постоянными коэффициентами',
          'Гармонические/затухающие колебания',
        ];
        physicalApplications = [
          'Механический пружинный маятник',
          'Электрический RLC-контур',
        ];
      } else {
        detectedType = 'Линейное ОДУ 2-го порядка с постоянными коэффициентами';
        properties = ['Порядок: 2', 'Линейное', 'Решается через характеристический полином'];
        physicalApplications = ['Динамика сплошных сред', 'Теория колебаний'];
      }
    } else {
      detectedType = 'ОДУ 1-го порядка';
      properties = ['Порядок: 1', 'Интегральные кривые на плоскости (x, y)'];
      physicalApplications = ['Закон радиоактивного распада', 'Закон остывания Ньютона'];
    }
  }

  return {
    equation: raw,
    dimension,
    order,
    linearity,
    detectedType,
    cpuCapable,
    gpuCapable,
    aiCapable,
    recommendedEngine,
    engineRecommendationReason,
    properties,
    physicalApplications,
  };
}
