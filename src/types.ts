export type DimensionMode = '2D' | '3D';

export interface CauchyCondition {
  x0: string;
  y0: string;
  yp0?: string; // y'(x0) for 2nd order
  z0?: string;  // for 3D systems: z(t0) or z-coord
  zp0?: string; // for 3rd order: y''(x0)
  t0?: string;  // time t0 for 3D PDEs / heat equations
}

export interface DerivationStep {
  stepNumber: number;
  title: string;
  explanation: string;
  latex: string;
  details?: string;
  badge?: string;
}

export interface Field3DConfig {
  scalarFieldJs: string; // e.g. "return Math.exp(-0.2*t)*(Math.sin(x)*Math.sin(y)*Math.cos(z));"
  vectorField3DJs?: {
    dx: string; // e.g. "10*(y - x)"
    dy: string; // e.g. "x*(28 - z) - y"
    dz: string; // e.g. "x*y - (8/3)*z"
  };
  colorMap?: 'turbo' | 'inferno' | 'viridis' | 'plasma' | 'coolwarm' | 'cyberpunk';
  xDomain: [number, number];
  yDomain: [number, number];
  zDomain: [number, number];
  tDomain?: [number, number];
  sliceZ?: number;
  timeDefault?: number;
  fieldType?: 'scalar_heatmap' | 'vector_phase' | 'quantum_orbital' | 'wave_packet';
  unitLabel?: string;
}

export interface ODESolution {
  dimensionMode?: DimensionMode;
  equationInput: string;
  equationNormalizedLatex: string;
  equationType: string;
  order: number;
  methodUsed: string;
  independentVar: string;
  dependentVar: string;
  generalSolutionLatex: string;
  generalSolutionPlain: string;
  particularSolutionLatex?: string;
  particularSolutionPlain?: string;
  constantsValues?: Record<string, string>;
  steps: DerivationStep[];
  verification: {
    isVerified: boolean;
    explanation: string;
    lhsLatex: string;
    rhsLatex: string;
    resultLatex: string;
  };
  plotConfig?: {
    derivativeJs: string; // e.g. "return y - x;" for dy/dx
    solutionCurveJs: string; // e.g. "return c * Math.exp(x) + x + 1;"
    particularCurveJs?: string; // e.g. "return 2 * Math.exp(x) + x + 1;"
    xDomain: [number, number];
    yDomain: [number, number];
    singularities?: string[];
  };
  field3DConfig?: Field3DConfig;
  notes?: string[];
}

export interface PresetODE {
  id: string;
  name: string;
  category: string;
  dimension: DimensionMode;
  equation: string;
  cauchy?: CauchyCondition;
  description: string;
  tags?: string[];
  field3DConfig?: Field3DConfig;
}

export type WindowId = 'input' | 'steps' | 'formula' | 'graph' | 'presets' | 'verification' | 'history' | 'analyzer';

export type SolverEngine = 'cpu' | 'gpu' | 'ai';

export interface WindowState {
  id: WindowId;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
}

export interface PreAnalysisResult {
  equation: string;
  dimension: DimensionMode;
  order: number;
  linearity: string;
  detectedType: string;
  cpuCapable: boolean;
  gpuCapable: boolean;
  aiCapable: boolean;
  recommendedEngine: SolverEngine;
  engineRecommendationReason: string;
  properties: string[];
  physicalApplications: string[];
}

export interface HistoryRecord {
  id: string;
  timestamp: number;
  equation: string;
  dimension: DimensionMode;
  cauchy: CauchyCondition | null;
  engine: SolverEngine;
  solution: ODESolution;
  preAnalysis?: PreAnalysisResult;
  title?: string;
  userNotes?: string;
}
