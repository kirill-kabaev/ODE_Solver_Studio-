export interface SparseMatrixCOO {
  rows: number;
  cols: number;
  nnz: number;
  rowIndices: Int32Array | number[];
  colIndices: Int32Array | number[];
  values: Float64Array | number[];
  isSymmetric: boolean;
  name?: string;
  group?: string;
  kind?: string;
}

export interface SparseMatrixCSR {
  rows: number;
  cols: number;
  nnz: number;
  rowPtr: Int32Array | number[]; // length rows + 1
  colInd: Int32Array | number[]; // length nnz
  values: Float64Array | number[]; // length nnz
  isSymmetric: boolean;
  name: string;
  group?: string;
  kind?: string;
  density?: number;
  bandwidth?: number;
  isDiagonallyDominant?: boolean;
  originalRows?: number;
  originalCols?: number;
  originalNnz?: number;
  isScaledForBrowser?: boolean;
}

export interface SuiteSparseMeta {
  id: string;
  name: string;
  group: string;
  rows: number;
  cols: number;
  nnz: number;
  isSymmetric: boolean;
  isSPD: boolean; // Symmetric positive definite
  kind: string; // e.g. 'Structural Problem', 'Circuit Simulation', 'Power Grid', '2D/3D CFD'
  year?: number;
  density: number; // percentage
  description: string;
  downloadUrl?: string;
  matrixData?: {
    coo?: { r: number[]; c: number[]; v: number[] };
    generator?: string;
    params?: Record<string, number>;
  };
}

export type LinearSolverType =
  | 'cg' // Conjugate Gradient (SPD)
  | 'pcg_jacobi' // Preconditioned CG (Jacobi / Diagonal)
  | 'pcg_ssor' // Preconditioned CG (SSOR)
  | 'bicgstab' // Bi-Conjugate Gradient Stabilized (Non-symmetric)
  | 'gmres' // GMRES(m) (Restarted GMRES)
  | 'jacobi' // Classical Jacobi iteration
  | 'gauss_seidel' // Gauss-Seidel iteration
  | 'sor' // Successive Over-Relaxation
  | 'direct_lu'; // Banded Direct LU / Gaussian Elimination

export type RhsType =
  | 'ones' // b = [1, 1, ..., 1]^T
  | 'exact_ones' // b = A * [1, ..., 1]^T (allows measuring exact error)
  | 'sin_harmonic' // b_i = sin(2*pi*i / N)
  | 'impulse' // b = [1, 0, ..., 0]^T
  | 'random' // random uniform [0, 1]
  | 'linear_gradient'; // b_i = i / N

export type ComputeDevice = 'cpu' | 'cuda_gpu';
export type CudaPrecision = 'fp64' | 'fp32';
export type CpuParallelScheduling = 'static_chunking' | 'dynamic_rows' | 'simd_avx';

export interface CpuParallelConfig {
  threads: number; // 1, 2, 4, 8, 16, 32
  scheduling: CpuParallelScheduling;
  chunkSize?: number;
  simdEnabled?: boolean;
}

export interface CudaKernelConfig {
  blockSize: number; // e.g. 64, 128, 256, 512
  warpSize: number; // 32
  useSharedMemory: boolean;
  precision: CudaPrecision;
  gpuAdapterName?: string;
  isDiscreteGPU?: boolean;
  nvidiaModelKey?: string;
}

export interface ParallelTelemetry {
  device: ComputeDevice;
  parallelMode: 'cpu_multithreading' | 'cuda_gpu_parallel';
  threadsOrCoresCount: number;
  parallelSpeedup: number;
  parallelEfficiency: number; // e.g. 88%
  domainDecomposition: string;
  gflops: number;
}

export interface SolverOptions {
  solverType: LinearSolverType;
  maxIterations: number;
  tolerance: number; // e.g. 1e-6 or 1e-9
  rhsType: RhsType;
  sorOmega?: number; // relaxation factor (1.0 to 1.95)
  gmresRestart?: number; // restart dimension m (default 30)
  initialGuess?: 'zeros' | 'random' | 'ones';
  computeDevice?: ComputeDevice;
  cpuConfig?: CpuParallelConfig;
  cudaConfig?: CudaKernelConfig;
  nvidiaModelKey?: string;
}

export interface ConvergenceStep {
  iteration: number;
  residualNorm: number;
  relativeResidual: number;
  trueError?: number; // if exact solution is known
  timeMs: number;
}

export interface LinearSolverResult {
  matrixName: string;
  matrixSize: number;
  nnz: number;
  solverType: LinearSolverType;
  computeDevice: ComputeDevice;
  cpuParallelInfo?: {
    threads: number;
    scheduling: CpuParallelScheduling;
    speedupVsSingleThread: number;
    efficiencyPercent: number;
  };
  gpuInfo?: {
    renderer: string;
    vendor: string;
    isDiscrete: boolean;
    cudaCoresActive?: number;
    memoryBandwidthGBs?: number;
    speedupVsCpu?: number;
    kernelTimeMs?: number;
    transferTimeMs?: number;
    blocksCount?: number;
    threadsPerBlock?: number;
  };
  parallelTelemetry?: ParallelTelemetry;
  converged: boolean;
  wasCancelled?: boolean;
  status?: 'converged' | 'max_iter' | 'cancelled' | 'error';
  iterations: number;
  finalResidual: number;
  finalRelativeResidual: number;
  exactError?: number;
  elapsedTimeMs: number;
  gflops: number;
  history: ConvergenceStep[];
  solutionVector: number[]; // x
  rhsVector: number[]; // b
  conditionNumberEstimate?: number;
  spectralRadiusEstimate?: number;
  notes: string[];
}

export interface GershgorinDisk {
  row: number;
  centerReal: number;
  centerImag: number;
  radius: number;
  diagonalValue: number;
}

export interface PhysicalDomainInfo {
  domainKey: string;
  title: string;
  field: string; // e.g. "Теплофизика и термодинамика", "Механика деформируемого твердого тела", "Электротехника & SPICE"
  governingEquation: string; // LaTeX format
  description: string;
  physicalSignificance: string;
  practicalApplication: string;
}

export interface MatrixComplexityMetrics {
  size: number;
  nnz: number;
  densityPercent: number;
  memoryBytes: number;
  formattedMemory: string;
  isSymmetric: boolean;
  isDiagonallyDominant: boolean;
  bandwidth: number;
  avgNnzPerRow: number;
  conditionNumberEstimate?: number;
  difficultyRating: 'easy' | 'medium' | 'hard' | 'ill_conditioned';
  difficultyLabel: string;
  difficultyExplanation: string;
}

export interface MatrixSolverRecommendation {
  recommendedSolver: LinearSolverType;
  solverName: string;
  solverShortName: string;
  recommendedDevice: ComputeDevice;
  recommendedTolerance: number;
  recommendedMaxIterations: number;
  recommendedOmega?: number;
  recommendedGmresRestart?: number;
  confidence: 'very_high' | 'high' | 'moderate';
  matrixProperties: {
    isSymmetric: boolean;
    isSPD: boolean;
    isDiagonallyDominant: boolean;
    hasZeroDiagonal: boolean;
    scaleLabel: string;
    densityFormatted: string;
    conditionEstimateFormatted: string;
    physicalField: string;
  };
  mathematicalJustification: string;
  performanceBenefit: string;
  hardwareRecommendation: {
    device: ComputeDevice;
    reason: string;
  };
  comparativeAnalysis: {
    solver: LinearSolverType;
    name: string;
    verdict: 'optimal' | 'good_alternative' | 'slow_suboptimal' | 'mathematically_invalid';
    explanation: string;
  }[];
}

export interface LinearSolverHistoryRecord {
  id: string;
  timestamp: number;
  formattedDate: string;
  matrixName: string;
  matrixSize: number;
  nnz: number;
  density: number;
  bandwidth: number;
  isSymmetric: boolean;
  isDiagonallyDominant: boolean;
  conditionEstimate?: number;
  difficultyLevel: 'easy' | 'medium' | 'hard' | 'ill_conditioned';
  difficultyLabel: string;
  
  physicalDomain: PhysicalDomainInfo;
  
  solverType: LinearSolverType;
  computeDevice: ComputeDevice;
  threadsOrCoresCount: number;
  hardwareLabel: string;
  cpuScheduling?: CpuParallelScheduling;
  cudaBlockSize?: number;
  
  iterations: number;
  maxIterations: number;
  elapsedTimeMs: number;
  formattedTime: string;
  finalResidual: number;
  finalRelativeResidual: number;
  converged: boolean;
  wasCancelled: boolean;
  status: 'converged' | 'max_iter' | 'cancelled' | 'error';
  gflops: number;
  speedup: number;
  
  historySample: ConvergenceStep[];
}
