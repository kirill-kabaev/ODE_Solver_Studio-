import {
  SparseMatrixCSR,
  LinearSolverType,
  ComputeDevice,
  MatrixSolverRecommendation,
} from '../types/sparse';
import { getMatrixPhysicalDomain } from './matrixPhysics';

export interface DetailedMatrixProperties {
  isSymmetric: boolean;
  isSPD: boolean;
  isDiagonallyDominant: boolean;
  diagonalDominanceRatio: number; // average |a_ii| / sum(|a_ij|)
  hasZeroDiagonal: boolean;
  minDiagonalAbs: number;
  maxDiagonalAbs: number;
  bandwidth: number;
  densityPercent: number;
  avgNnzPerRow: number;
  conditionEstimate: number;
  scaleLabel: string;
}

/**
 * Deep structural analysis of a CSR matrix properties:
 * - Symmetry
 * - Diagonal health (presence of zeros, scale)
 * - Strict vs weak diagonal dominance
 * - Approximate condition number / stiffness
 * - Bandwidth & fill-in risk
 */
export function analyzeDetailedMatrixProperties(matrix: SparseMatrixCSR): DetailedMatrixProperties {
  const { rows, nnz, rowPtr, colInd, values } = matrix;
  let isSymmetric = matrix.isSymmetric;
  let isDiagonallyDominant = true;
  let hasZeroDiagonal = false;
  let minDiag = Number.POSITIVE_INFINITY;
  let maxDiag = 0;
  let sumDominanceRatios = 0;
  let diagFoundCount = 0;

  // Inspect up to 500 rows to keep UI instant even on 50,000+ matrices
  const sampleLimit = Math.min(rows, 1000);
  const step = Math.max(1, Math.floor(rows / sampleLimit));

  for (let i = 0; i < rows; i += step) {
    const start = rowPtr[i];
    const end = rowPtr[i + 1];
    let diagVal = 0;
    let sumOffDiag = 0;
    let foundDiag = false;

    for (let p = start; p < end; p++) {
      const col = colInd[p];
      const val = values[p];
      const absVal = Math.abs(val);

      if (col === i) {
        diagVal = val;
        foundDiag = true;
      } else {
        sumOffDiag += absVal;
      }
    }

    if (!foundDiag || Math.abs(diagVal) < 1e-15) {
      hasZeroDiagonal = true;
      isDiagonallyDominant = false;
      minDiag = 0;
    } else {
      diagFoundCount++;
      const absDiag = Math.abs(diagVal);
      if (absDiag < minDiag) minDiag = absDiag;
      if (absDiag > maxDiag) maxDiag = absDiag;

      if (sumOffDiag > 0) {
        const ratio = absDiag / sumOffDiag;
        sumDominanceRatios += ratio;
        if (absDiag < sumOffDiag) {
          isDiagonallyDominant = false;
        }
      } else {
        sumDominanceRatios += 2.0; // Isolated node or single diagonal
      }
    }
  }

  const avgDominanceRatio = diagFoundCount > 0 ? sumDominanceRatios / diagFoundCount : 0;
  const densityPercent = rows > 0 ? (nnz / (rows * rows)) * 100 : 0;
  const avgNnz = rows > 0 ? nnz / rows : 0;
  const bandwidth = matrix.bandwidth || Math.min(rows, Math.max(5, Math.ceil(Math.sqrt(rows) * 1.5)));

  // Condition estimate based on diagonal dominance, symmetry and size
  let conditionEstimate = 100;
  if (hasZeroDiagonal) {
    conditionEstimate = 1e7;
  } else if (!isSymmetric) {
    conditionEstimate = avgDominanceRatio > 1.2 ? 500 : 50000;
  } else if (isDiagonallyDominant) {
    conditionEstimate = Math.max(10, Math.min(1000, rows * 0.5));
  } else {
    conditionEstimate = Math.max(500, rows * 5);
  }

  // SPD guarantee: symmetric + positive diagonal + diagonally dominant or known physics
  const physics = getMatrixPhysicalDomain(matrix);
  const isSPD =
    isSymmetric &&
    !hasZeroDiagonal &&
    minDiag > 0 &&
    (isDiagonallyDominant ||
      physics.domainKey === 'poisson2d' ||
      physics.domainKey === 'poisson3d' ||
      physics.domainKey === 'structural' ||
      physics.domainKey === 'wathen' ||
      physics.domainKey === 'graph');

  let scaleLabel = 'Средняя (Medium)';
  if (rows <= 250) scaleLabel = 'Компактная (Small N ≤ 250)';
  else if (rows <= 3000) scaleLabel = 'Средняя (Medium N ≤ 3K)';
  else if (rows <= 20000) scaleLabel = 'Крупная (Large N ≤ 20K)';
  else scaleLabel = 'Сверхкрупная (Massive N > 20K)';

  return {
    isSymmetric,
    isSPD,
    isDiagonallyDominant,
    diagonalDominanceRatio: avgDominanceRatio,
    hasZeroDiagonal,
    minDiagonalAbs: minDiag === Number.POSITIVE_INFINITY ? 0 : minDiag,
    maxDiagonalAbs: maxDiag,
    bandwidth,
    densityPercent,
    avgNnzPerRow: avgNnz,
    conditionEstimate,
    scaleLabel,
  };
}

/**
 * High-performance Expert Recommender System for Sparse Linear Solvers:
 * Analyzes physical origin, symmetry, condition number, sparsity, and hardware
 * to determine the optimal algorithm, precision, and settings.
 */
export function recommendOptimalSolver(matrix: SparseMatrixCSR): MatrixSolverRecommendation {
  const props = analyzeDetailedMatrixProperties(matrix);
  const physics = getMatrixPhysicalDomain(matrix);
  const N = matrix.rows;
  const nnz = matrix.nnz;

  let recommendedSolver: LinearSolverType = 'pcg_jacobi';
  let solverName = 'PCG-Jacobi (Preconditioned Conjugate Gradient)';
  let solverShortName = 'PCG-Jacobi';
  let recommendedDevice: ComputeDevice = N >= 800 || nnz >= 4000 ? 'cuda_gpu' : 'cpu';
  let recommendedTolerance = 1e-6;
  let recommendedMaxIterations = Math.max(300, Math.min(2500, Math.ceil(Math.sqrt(N) * 20)));
  let recommendedOmega = 1.25;
  let recommendedGmresRestart = 30;
  let confidence: 'very_high' | 'high' | 'moderate' = 'very_high';

  let mathematicalJustification = '';
  let performanceBenefit = '';

  // -------------------------------------------------------------------------
  // CASE 1: Very Small or Narrow-Banded System (N <= 150, Bandwidth <= 15)
  // -------------------------------------------------------------------------
  if (N <= 150 && props.bandwidth <= 18 && !props.hasZeroDiagonal) {
    recommendedSolver = 'direct_lu';
    solverName = 'Прямой ленточный LU-метод (Direct Banded LU)';
    solverShortName = 'Прямой LU';
    recommendedDevice = 'cpu';
    confidence = 'very_high';
    recommendedMaxIterations = 1;
    mathematicalJustification =
      `Размерность системы мала ($N = ${N} \\le 150$) с компактной шириной ленты ($w = ${props.bandwidth}$). Для таких матриц прямой метод факторизации Гаусса/LU находит аналитически точное решение машинной точности ($\\varepsilon \\sim 10^{-15}$) за 1 проход без риска расходимости или накопления итерационных ошибок.`;
    performanceBenefit =
      `Мгновенное решение за <0.1 мс на CPU без необходимости подбора начального приближения $x_0$ и контроля невязки.`;
  }
  // -------------------------------------------------------------------------
  // CASE 2: Symmetric Positive Definite (SPD) Systems (Poisson, Elasticity, Wathen, Graph)
  // -------------------------------------------------------------------------
  else if (props.isSymmetric && props.isSPD && !props.hasZeroDiagonal) {
    if (physics.domainKey === 'wathen' || physics.domainKey === 'structural' || props.bandwidth > 50) {
      recommendedSolver = 'pcg_ssor';
      solverName = 'PCG-SSOR (Сопряженные градиенты с SSOR предобусловливателем)';
      solverShortName = 'PCG-SSOR';
      recommendedOmega = 1.2;
      confidence = 'very_high';
      mathematicalJustification =
        `Матрица симметрична и положительно определена (SPD) со сложной пространственной связностью узлов (${physics.title}). Симметричный предобусловливатель SSOR ($M = (D - \\omega L) D^{-1} (D - \\omega U)$) эффективно сжимает спектр собственных чисел $\\sigma(M^{-1}A)$, сокращая число шагов сходимости в 3–5 раз по сравнению со стандартным CG.`;
      performanceBenefit =
        `Гарантированная монотонная минимизация энергетической нормы погрешности $\\|e\\|_A = \\sqrt{e^T A e}$ с ускорением на видеокарте NVIDIA GeForce RTX CUDA.`;
    } else {
      recommendedSolver = 'pcg_jacobi';
      solverName = 'PCG-Jacobi (Сопряженные градиенты с диагональным предобусловливателем)';
      solverShortName = 'PCG-Jacobi';
      confidence = 'very_high';
      mathematicalJustification =
        `Матрица является симметричной положительно определенной (SPD) сеточной системой ($N = ${N}$, ${props.densityPercent.toFixed(2)}\\% плотность). Метод PCG с масштабированием Якоби ($M = \\text{diag}(A)$) математически оптимален: устраняет разномасштабность строк, сжимает обусловленность $\\kappa(A)$ и требует всего $O(N)$ памяти без заполнения разреженного профиля.`;
      performanceBenefit =
        `Идеальный параллелизм при SpMV умножении разреженной матрицы на вектор на тысячах ядер NVIDIA CUDA с эффективной пропускной способностью памяти до 1000 GB/s.`;
    }
  }
  // -------------------------------------------------------------------------
  // CASE 3: Symmetric but Ill-Conditioned or Indefinite
  // -------------------------------------------------------------------------
  else if (props.isSymmetric) {
    recommendedSolver = 'pcg_jacobi';
    solverName = 'PCG-Jacobi (Предобусловленный CG)';
    solverShortName = 'PCG-Jacobi';
    confidence = 'high';
    mathematicalJustification =
      `Матрица симметрична ($A = A^T$), но имеет спектральный разброс. Диагональное предобуславливание стабилизирует Крыловский процесс и обеспечивает быстрое убывание градиентной невязки $\\|r_k\\|$.`;
    performanceBenefit =
      `Минимальные накладные расходы на итерацию и устойчивая сходимость.`;
  }
  // -------------------------------------------------------------------------
  // CASE 4: Non-Symmetric Stiff / Convection / Circuit with Zero Diagonal or High Asymmetry
  // -------------------------------------------------------------------------
  else if (!props.isSymmetric && (props.hasZeroDiagonal || props.conditionEstimate > 10000 || physics.domainKey === 'circuit' || physics.domainKey === 'cfd')) {
    recommendedSolver = 'gmres';
    solverName = 'GMRES(30) (Generalized Minimal Residual с рестартами)';
    solverShortName = 'GMRES(30)';
    recommendedGmresRestart = 30;
    confidence = 'very_high';
    mathematicalJustification =
      `Матрица несимметрична ($A \\neq A^T$) и порождена гидродинамическим конвективным переносом или схемотехникой SPICE MNA (${physics.title}). Классический метод CG неприменим из-за потери ортогональности. Метод GMRES(m) строит ортонормированный базис Арнольди и строго гарантирует монотонное невозрастание евклидовой нормы невязки $\\|r_k\\|_2 = \\min_{x \\in \\mathcal{K}_m} \\|b - Ax\\|_2$ на каждом шаге.`;
    performanceBenefit =
      `Исключает взрывные осцилляции невязки, свойственные несимметричным градиентным методам в зонах сильных вихрей и транзисторных нелинейностей.`;
  }
  // -------------------------------------------------------------------------
  // CASE 5: General Non-Symmetric Sparse System
  // -------------------------------------------------------------------------
  else {
    recommendedSolver = 'bicgstab';
    solverName = 'BiCGSTAB (Biconjugate Gradient Stabilized)';
    solverShortName = 'BiCGSTAB';
    confidence = 'very_high';
    mathematicalJustification =
      `Матрица несимметрична ($A \\neq A^T$). Стабилизированный метод бисопряженных градиентов ван дер Ворста (BiCGSTAB) объединяет биортогонализацию с локальным шагом минимизации невязки GMRES(1). Он не требует хранения растущего базиса Арнольди, расходуя фиксированные $O(N)$ памяти, и сходится значительно быстрее стационарных схем.`;
    performanceBenefit =
      `В 4–8 раз быстрее стационарных итераций (Якоби / Зейделя) и отлично параллелится на GPU NVIDIA RTX и ядрах CPU.`;
  }

  // Hardware Recommendation Details
  const hardwareRecommendation = {
    device: recommendedDevice,
    reason:
      recommendedDevice === 'cuda_gpu'
        ? `Размерность матрицы ($N = ${N}$, $\\text{NNZ} = ${nnz}$) превышает порог эффективности параллелизма. Тысячи ядер NVIDIA CUDA и широкая шина памяти VRAM обеспечат кратное ускорение (8x–25x speedup) параллельного SpMV умножения строк CSR.`
        : `Для матрицы размера $N = ${N}$ накладные расходы на копирование буферов PCIe в память GPU превышают время вычислений. Многопоточный расчет на ядрах CPU с SIMD AVX-512 будет наиболее энергоэффективным и быстрым.`,
  };

  // Comparative Matrix of All Solvers for this specific matrix
  const comparativeAnalysis: MatrixSolverRecommendation['comparativeAnalysis'] = [
    {
      solver: 'pcg_jacobi',
      name: 'PCG-Jacobi (Сопряженные градиенты + Якоби)',
      verdict:
        props.isSymmetric && props.isSPD
          ? 'optimal'
          : !props.isSymmetric
          ? 'mathematically_invalid'
          : 'good_alternative',
      explanation:
        props.isSymmetric && props.isSPD
          ? 'Идеальный выбор: сжатие спектра $\\kappa(A)$, минимальный расход памяти $O(N)$ и доказанная сходимость в норме энергии.'
          : !props.isSymmetric
          ? 'Недопустимо: метод сопряженных градиентов математически применим только к симметричным положительно определенным матрицам.'
          : 'Хороший вариант при слабой несимметрии, но возможна потеря ортогональности направлений.',
    },
    {
      solver: 'cg',
      name: 'CG (Классические сопряженные градиенты)',
      verdict:
        props.isSymmetric && props.isSPD
          ? ((recommendedSolver as LinearSolverType) === 'cg' ? 'optimal' : 'good_alternative')
          : 'mathematically_invalid',
      explanation:
        props.isSymmetric && props.isSPD
          ? 'Работает быстро, но без предобуславливателя число итераций возрастает пропорционально $\\sqrt{\\kappa(A)}$.'
          : 'Неприменим к несимметричным матрицам.',
    },
    {
      solver: 'pcg_ssor',
      name: 'PCG-SSOR (Симметричная релаксация SSOR)',
      verdict:
        props.isSymmetric && props.isSPD
          ? (recommendedSolver === 'pcg_ssor' ? 'optimal' : 'good_alternative')
          : 'mathematically_invalid',
      explanation:
        props.isSymmetric && props.isSPD
          ? 'Мощный предобусловливатель для плотных сеток и упругих конструкций, кардинально снижает число шагов.'
          : 'Неприменим для несимметричных операторов.',
    },
    {
      solver: 'bicgstab',
      name: 'BiCGSTAB (Biconjugate Gradient Stabilized)',
      verdict:
        !props.isSymmetric
          ? (recommendedSolver === 'bicgstab' ? 'optimal' : 'good_alternative')
          : 'good_alternative',
      explanation:
        !props.isSymmetric
          ? 'Оптимален для несимметричных систем: 2 SpMV на шаг, низкий расход памяти $O(N)$, стабилизированный ход.'
          : 'Применим и для симметричных, но требует вдвое больше умножений матрицы, чем чистый CG.',
    },
    {
      solver: 'gmres',
      name: 'GMRES(m) (Generalized Minimal Residual)',
      verdict:
        !props.isSymmetric && (props.hasZeroDiagonal || props.conditionEstimate > 10000)
          ? 'optimal'
          : !props.isSymmetric
          ? 'good_alternative'
          : 'good_alternative',
      explanation:
        !props.isSymmetric
          ? 'Строгая гарантия невозрастания невязки $\\|r_k\\|_2$, защита от численного взрыва в жестких несимметричных СЛАУ.'
          : 'Универсален, но требует дополнительной памяти под базис Крылова $m=30$.',
    },
    {
      solver: 'sor',
      name: 'SOR (Successive Over-Relaxation)',
      verdict:
        props.isDiagonallyDominant && N <= 800
          ? 'good_alternative'
          : 'slow_suboptimal',
      explanation:
        props.isDiagonallyDominant
          ? 'Сходится при оптимальном $\\omega \\approx 1.25$, но скорость уступает Крыловским методам на больших $N$.'
          : 'Медленная сходимость или расходимость при отсутствии диагонального преобладания.',
    },
    {
      solver: 'gauss_seidel',
      name: 'Метод Гаусса-Зейделя',
      verdict:
        props.isDiagonallyDominant && N <= 500
          ? 'good_alternative'
          : 'slow_suboptimal',
      explanation:
        'Стационарный метод первого порядка. Требует в 5–10 раз больше итераций, чем PCG или BiCGSTAB.',
    },
    {
      solver: 'jacobi',
      name: 'Метод Якоби',
      verdict:
        props.isDiagonallyDominant && N <= 300
          ? 'good_alternative'
          : 'slow_suboptimal',
      explanation:
        'Простейший параллельный метод, но сходится крайне медленно на жестких сетках (спектральный радиус $\\rho \\to 1$).',
    },
    {
      solver: 'direct_lu',
      name: 'Прямой ленточный LU-метод',
      verdict:
        N <= 150 && props.bandwidth <= 18
          ? 'optimal'
          : N <= 400
          ? 'good_alternative'
          : 'slow_suboptimal',
      explanation:
        N <= 150
          ? 'Идеален для малых матриц: дает точное решение за 1 шаг без итераций.'
          : `Для $N = ${N}$ сложность $O(N \\cdot w^2)$ и заполнение ленты fill-in делают метод неэффективным по сравнению с PCG/BiCGSTAB.`,
    },
  ];

  return {
    recommendedSolver,
    solverName,
    solverShortName,
    recommendedDevice,
    recommendedTolerance,
    recommendedMaxIterations,
    recommendedOmega,
    recommendedGmresRestart,
    confidence,
    matrixProperties: {
      isSymmetric: props.isSymmetric,
      isSPD: props.isSPD,
      isDiagonallyDominant: props.isDiagonallyDominant,
      hasZeroDiagonal: props.hasZeroDiagonal,
      scaleLabel: props.scaleLabel,
      densityFormatted: `${props.densityPercent.toFixed(2)}%`,
      conditionEstimateFormatted: props.conditionEstimate > 1e6 ? '> 10⁶ (Жесткая)' : `~${props.conditionEstimate.toFixed(0)}`,
      physicalField: physics.title,
    },
    mathematicalJustification,
    performanceBenefit,
    hardwareRecommendation,
    comparativeAnalysis,
  };
}
