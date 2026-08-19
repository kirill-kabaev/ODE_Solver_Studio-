import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Wind,
  Layers,
  Activity,
  Sliders,
  Sparkles,
  Compass,
  RotateCcw,
  Eye,
  EyeOff,
  Box,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Share2,
  Info,
  Maximize2,
  Grid,
  Zap,
  ArrowRight,
  Bookmark,
  PenTool,
} from 'lucide-react';
import { MathView, MathText } from '../MathView';
import { WingGeometryEditor, ExtendedWingGeometryConfig, DEFAULT_WING_GEOMETRY } from './WingGeometryEditor';
import { createHardware2DContext } from '../../utils/gpuHardwareEnforcer';

// ==========================================
// 3D VLM GEOMETRIC DATA STRUCTURES & TYPES
// ==========================================

export interface WingGeometryConfig {
  span: number;          // Full wingspan b (m)
  rootChord: number;     // Root chord c_root (m)
  tipChord: number;      // Tip chord c_tip (m)
  sweepLE: number;       // Leading edge sweep angle (deg)
  dihedral: number;      // Dihedral angle Gamma (deg)
  washout: number;       // Geometric twist at tip (deg, negative is nose-down)
  hasWinglets: boolean;  // Enable winglets at tips
  wingletHeight: number; // Winglet height (m)
  wingletCant: number;   // Winglet cant angle (deg, 90 = vertical)
  numSpanPanels: number; // Spanwise panels per semi-span (e.g. 14)
  numChordPanels: number;// Chordwise panels (e.g. 5)
}

export interface VlmFlowState {
  alpha: number;         // Angle of attack (deg)
  velocity: number;      // Freestream speed V_inf (m/s)
  density: number;       // Air density rho (kg/m^3)
}

export interface VlmPanel {
  id: number;
  iSpan: number;
  iChord: number;
  isRightSemi: boolean;
  isWinglet: boolean;
  
  // 4 Corner vertices in 3D: [x, y, z]
  // Order: 1: LE-inboard, 2: LE-outboard, 3: TE-outboard, 4: TE-inboard
  p1: [number, number, number];
  p2: [number, number, number];
  p3: [number, number, number];
  p4: [number, number, number];
  
  // Bound vortex line segment (at 1/4 chord line)
  vortexP1: [number, number, number]; // Inboard bound vortex node
  vortexP2: [number, number, number]; // Outboard bound vortex node
  
  // Control / Collocation point (at 3/4 chord line, mid-width)
  cp: [number, number, number];
  
  // Panel geometric metrics
  center: [number, number, number];
  area: number;
  dy: number;
  chord: number;
  yMid: number;
  
  // Panel normal vector n_hat
  normal: [number, number, number];
  
  // Solution results
  gamma: number;         // Vortex circulation strength Gamma (m^2/s)
  downwash: number;      // Induced downwash w at control point (m/s)
  liftForce: number;     // Panel Lift (N)
  inducedDrag: number;   // Panel Induced Drag (N)
  deltaCp: number;       // Pressure jump coefficient Delta Cp
  localCl: number;       // Local panel lift coefficient
}

export interface VlmSectionResult {
  yNormalized: number;   // 2y / b in [0, 1]
  y: number;             // span coordinate (m)
  chord: number;         // local chord c(y) (m)
  gammaSum: number;      // integrated circulation across chord (m^2/s)
  sectionCl: number;     // c_l(y)
  sectionClChord: number;// c_l(y) * c(y) / c_mean
  idealElliptic: number; // ideal elliptic lift distribution
  downwash: number;      // w(y) / V_inf
  sectionCdi: number;    // c_di(y)
}

export interface VlmGlobalResults {
  liftCoeff: number;      // C_L
  inducedDragCoeff: number;// C_Di
  efficiencyFactor: number;// Oswald efficiency e = C_L^2 / (pi * AR * C_Di)
  aspectRatio: number;    // AR = b^2 / S
  wingArea: number;       // S_ref (m^2)
  meanAerodynamicChord: number; // MAC (m)
  totalLiftNewtons: number;// L (N)
  totalInducedDragNewtons: number; // Di (N)
  pitchingMomentCoeff: number; // C_m,0.25c
  centerOfPressureX: number; // x_cp / c_root
  liftSlopePerDeg: number; // dC_L / d_alpha (1/deg)
  liftSlopePerRad: number; // dC_L / d_alpha (1/rad)
  sections: VlmSectionResult[];
  panels: VlmPanel[];
}

export interface WingPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  badge: string;
  config: WingGeometryConfig;
  defaultAlpha: number;
  theoreticalEfficiency: string;
}

export const WING_PRESETS: WingPreset[] = [
  {
    id: 'crm_transonic',
    name: 'NASA Common Research Model (CRM)',
    category: 'Транспортная Авиация',
    description: 'Эталонное стреловидное крыло пассажирского лайнера (NASA / AIAA DPW) со стреловидностью 35° и геометрической круткой -3.5° для подавления концевого срыва.',
    badge: 'NASA CRM DPW',
    defaultAlpha: 3.2,
    theoreticalEfficiency: 'e ≈ 0.92',
    config: {
      span: 14.0,
      rootChord: 2.8,
      tipChord: 0.84,
      sweepLE: 35.0,
      dihedral: 4.5,
      washout: -3.5,
      hasWinglets: true,
      wingletHeight: 0.9,
      wingletCant: 78.0,
      numSpanPanels: 14,
      numChordPanels: 4,
    },
  },
  {
    id: 'spitfire_elliptic',
    name: 'Supermarine Spitfire (Эллиптическое)',
    category: 'Классическая Аэродинамика',
    description: 'Легендарное эллиптическое крыло с минимальным индуктивным сопротивлением и постоянным скосом потока по размаху (Oswald efficiency e ≈ 0.99).',
    badge: 'Elliptic Minimal Drag',
    defaultAlpha: 4.0,
    theoreticalEfficiency: 'e ≈ 0.99',
    config: {
      span: 11.2,
      rootChord: 2.4,
      tipChord: 0.55,
      sweepLE: 4.5,
      dihedral: 3.0,
      washout: -1.2,
      hasWinglets: false,
      wingletHeight: 0.5,
      wingletCant: 80.0,
      numSpanPanels: 16,
      numChordPanels: 4,
    },
  },
  {
    id: 'glider_high_ar',
    name: 'Планер Высокого Удлинения (Sailplane)',
    category: 'Безмоторный Полёт / БПЛА',
    description: 'Ультравысокое удлинение (AR = 18) для рекордного аэродинамического качества L/D > 45 и минимальных потерь на индуктивный вихревой скос.',
    badge: 'AR = 18 High L/D',
    defaultAlpha: 3.0,
    theoreticalEfficiency: 'e ≈ 0.95',
    config: {
      span: 18.0,
      rootChord: 1.2,
      tipChord: 0.45,
      sweepLE: 1.5,
      dihedral: 2.5,
      washout: -2.0,
      hasWinglets: true,
      wingletHeight: 0.65,
      wingletCant: 85.0,
      numSpanPanels: 16,
      numChordPanels: 4,
    },
  },
  {
    id: 'delta_supersonic',
    name: 'Треугольное Крыло (Delta Wing / Concorde)',
    category: 'Сверхзвук / Истребители',
    description: 'Крыло малого удлинения с большой стреловидностью 52° для сверхзвуковых скоростей и генерации мощных вихрей передней кромки на больших углах атаки.',
    badge: 'Delta Supersonic',
    defaultAlpha: 6.0,
    theoreticalEfficiency: 'e ≈ 0.76',
    config: {
      span: 8.0,
      rootChord: 5.5,
      tipChord: 0.4,
      sweepLE: 52.0,
      dihedral: 0.0,
      washout: -1.5,
      hasWinglets: false,
      wingletHeight: 0.4,
      wingletCant: 75.0,
      numSpanPanels: 14,
      numChordPanels: 6,
    },
  },
  {
    id: 'airliner_blended_winglet',
    name: 'Современный Лайнер + Winglets (A350/B787)',
    category: 'Гражданская Авиация',
    description: 'Оптимизированное крыло с адаптивными законцовками (Sharklets/Winglets) для снижения индуктивного сопротивления на 4-6% на крейсерском эшелоне.',
    badge: 'Blended Sharklets',
    defaultAlpha: 2.8,
    theoreticalEfficiency: 'e ≈ 0.96',
    config: {
      span: 15.0,
      rootChord: 2.6,
      tipChord: 0.75,
      sweepLE: 31.0,
      dihedral: 5.0,
      washout: -3.0,
      hasWinglets: true,
      wingletHeight: 1.2,
      wingletCant: 70.0,
      numSpanPanels: 15,
      numChordPanels: 4,
    },
  },
  {
    id: 'forward_swept',
    name: 'Крыло Обратной Стреловидности (Су-47 / X-29)',
    category: 'Экспериментальное',
    description: 'Обратная стреловидность -22°: поток стекает к корню крыла, предотвращая концевой срыв и сохраняя исключительную маневренность на критических углах.',
    badge: 'Forward Sweep -22°',
    defaultAlpha: 4.5,
    theoreticalEfficiency: 'e ≈ 0.88',
    config: {
      span: 12.0,
      rootChord: 2.2,
      tipChord: 0.95,
      sweepLE: -22.0,
      dihedral: -1.5,
      washout: 1.5,
      hasWinglets: false,
      wingletHeight: 0.4,
      wingletCant: 80.0,
      numSpanPanels: 14,
      numChordPanels: 4,
    },
  },
];

// ==========================================
// 3D VECTOR MATH & BIOT-SAVART VLM SOLVER
// ==========================================

function cross(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function norm(a: [number, number, number]): number {
  return Math.sqrt(dot(a, a));
}

function sub(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function add(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(a: [number, number, number], s: number): [number, number, number] {
  return [a[0] * s, a[1] * s, a[2] * s];
}

function normalize(a: [number, number, number]): [number, number, number] {
  const l = norm(a);
  if (l < 1e-12) return [0, 0, 1];
  return [a[0] / l, a[1] / l, a[2] / l];
}

/**
 * Biot-Savart formula for a finite straight vortex segment from p1 to p2 with unit circulation Gamma = 1.
 * V_ind = (1 / 4*pi) * (r1 x r2) / |r1 x r2|^2 * ( r0 . (r1/|r1| - r2/|r2|) )
 * Includes viscous core radius cutoff (r_cutoff) to prevent numerical singularities.
 */
function biotSavartSegment(
  p: [number, number, number],
  p1: [number, number, number],
  p2: [number, number, number],
  coreRadius = 1e-4
): [number, number, number] {
  const r1 = sub(p, p1);
  const r2 = sub(p, p2);
  const r0 = sub(p2, p1);

  const r1Norm = norm(r1);
  const r2Norm = norm(r2);

  const r1CrossR2 = cross(r1, r2);
  const crossNormSq = dot(r1CrossR2, r1CrossR2);

  // Cutoff close to filament to avoid division by zero
  if (crossNormSq < coreRadius * coreRadius || r1Norm < coreRadius || r2Norm < coreRadius) {
    return [0, 0, 0];
  }

  const term1 = dot(r0, sub(scale(r1, 1 / r1Norm), scale(r2, 1 / r2Norm)));
  const factor = (1 / (4 * Math.PI * crossNormSq)) * term1;

  return scale(r1CrossR2, factor);
}

/**
 * Induced velocity of a full Horseshoe Vortex (Bound Segment p1->p2 + 2 Semi-Infinite Trailing Filaments)
 * Trailing lines extend in freestream direction +X to downstream infinity (modeled as finite long distance L_inf).
 */
function horseshoeInducedVelocity(
  p: [number, number, number],
  p1: [number, number, number],
  p2: [number, number, number],
  wakeLength = 1000.0
): [number, number, number] {
  const p1Inf: [number, number, number] = [p1[0] + wakeLength, p1[1], p1[2]];
  const p2Inf: [number, number, number] = [p2[0] + wakeLength, p2[1], p2[2]];

  // 1. Semi-infinite trailing vortex 1: from p1_inf to p1
  const v1 = biotSavartSegment(p, p1Inf, p1);
  // 2. Bound vortex line: from p1 to p2
  const v2 = biotSavartSegment(p, p1, p2);
  // 3. Semi-infinite trailing vortex 2: from p2 to p2_inf
  const v3 = biotSavartSegment(p, p2, p2Inf);

  return add(add(v1, v2), v3);
}

/**
 * Solve dense linear system A * x = b via Gauss-Jordan elimination with partial pivoting.
 */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  // Clone augmented matrix
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let k = 0; k < n; k++) {
    // Find pivot
    let maxRow = k;
    let maxVal = Math.abs(M[k][k]);
    for (let r = k + 1; r < n; r++) {
      if (Math.abs(M[r][k]) > maxVal) {
        maxVal = Math.abs(M[r][k]);
        maxRow = r;
      }
    }

    // Swap rows
    if (maxRow !== k) {
      const temp = M[k];
      M[k] = M[maxRow];
      M[maxRow] = temp;
    }

    const pivot = M[k][k];
    if (Math.abs(pivot) < 1e-12) {
      continue; // Singular or ill-conditioned
    }

    // Normalize pivot row
    for (let c = k; c <= n; c++) {
      M[k][c] /= pivot;
    }

    // Eliminate other rows
    for (let r = 0; r < n; r++) {
      if (r !== k) {
        const factor = M[r][k];
        if (Math.abs(factor) > 1e-14) {
          for (let c = k; c <= n; c++) {
            M[r][c] -= factor * M[k][c];
          }
        }
      }
    }
  }

  const x: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = M[i][n];
  }
  return x;
}

/**
 * Discretize 3D Wing and Execute Complete Vortex Lattice Method (VLM) Solver.
 */
export function runVlmSolver(
  config: WingGeometryConfig,
  flow: VlmFlowState
): VlmGlobalResults {
  const b = config.span;
  const bHalf = b / 2;
  const cRoot = config.rootChord;
  const cTip = config.tipChord;
  const sweepRad = (config.sweepLE * Math.PI) / 180;
  const dihedralRad = (config.dihedral * Math.PI) / 180;
  const washoutRad = (config.washout * Math.PI) / 180;
  const alphaRad = (flow.alpha * Math.PI) / 180;
  const V_inf = flow.velocity;
  const rho = flow.density;
  const q_dyn = 0.5 * rho * V_inf * V_inf;

  // Freestream velocity vector in body axes
  const freestream: [number, number, number] = [
    V_inf * Math.cos(alphaRad),
    0,
    V_inf * Math.sin(alphaRad),
  ];

  const nSpan = config.numSpanPanels;
  const nChord = config.numChordPanels;

  // Full-span panel generation (both left and right wings for true 3D vortex physics)
  const panels: VlmPanel[] = [];
  let panelId = 0;

  // Cosine clustering along span for higher accuracy at wingtip gradients
  const spanStations: number[] = [];
  for (let i = 0; i <= nSpan; i++) {
    const theta = (i / nSpan) * (Math.PI / 2);
    spanStations.push(Math.sin(theta) * bHalf);
  }

  // Chordwise spacing (linear or cosine)
  const chordStations: number[] = [];
  for (let j = 0; j <= nChord; j++) {
    chordStations.push(j / nChord);
  }

  // Generate for Right and Left Wings
  const sides = [1, -1]; // 1 = Right wing (y > 0), -1 = Left wing (y < 0)

  sides.forEach((sideSign) => {
    const isRight = sideSign > 0;

    for (let i = 0; i < nSpan; i++) {
      const yInner = spanStations[i] * sideSign;
      const yOuter = spanStations[i + 1] * sideSign;

      const etaInner = spanStations[i] / bHalf;
      const etaOuter = spanStations[i + 1] / bHalf;

      // Local chords
      const cInner = cRoot + (cTip - cRoot) * etaInner;
      const cOuter = cRoot + (cTip - cRoot) * etaOuter;

      // Leading edge X positions
      const xLEInner = spanStations[i] * Math.tan(sweepRad);
      const xLEOuter = spanStations[i + 1] * Math.tan(sweepRad);

      // Z positions from dihedral
      const zInner = spanStations[i] * Math.tan(dihedralRad);
      const zOuter = spanStations[i + 1] * Math.tan(dihedralRad);

      // Geometric twist (washout) rotation around leading edge
      const twistInner = washoutRad * etaInner;
      const twistOuter = washoutRad * etaOuter;

      for (let j = 0; j < nChord; j++) {
        const xi1 = chordStations[j];
        const xi2 = chordStations[j + 1];

        // 4 Corner nodes of panel on planar camber line
        // Point 1: Inner-LE
        const p1: [number, number, number] = [
          xLEInner + xi1 * cInner * Math.cos(twistInner),
          yInner,
          zInner - xi1 * cInner * Math.sin(twistInner),
        ];
        // Point 2: Outer-LE
        const p2: [number, number, number] = [
          xLEOuter + xi1 * cOuter * Math.cos(twistOuter),
          yOuter,
          zOuter - xi1 * cOuter * Math.sin(twistOuter),
        ];
        // Point 3: Outer-TE
        const p3: [number, number, number] = [
          xLEOuter + xi2 * cOuter * Math.cos(twistOuter),
          yOuter,
          zOuter - xi2 * cOuter * Math.sin(twistOuter),
        ];
        // Point 4: Inner-TE
        const p4: [number, number, number] = [
          xLEInner + xi2 * cInner * Math.cos(twistInner),
          yInner,
          zInner - xi2 * cInner * Math.sin(twistInner),
        ];

        // Bound vortex placement: at 1/4 of panel chord
        const xiVortex = xi1 + 0.25 * (xi2 - xi1);
        const vortexP1: [number, number, number] = [
          xLEInner + xiVortex * cInner * Math.cos(twistInner),
          yInner,
          zInner - xiVortex * cInner * Math.sin(twistInner),
        ];
        const vortexP2: [number, number, number] = [
          xLEOuter + xiVortex * cOuter * Math.cos(twistOuter),
          yOuter,
          zOuter - xiVortex * cOuter * Math.sin(twistOuter),
        ];

        // Collocation point placement: at 3/4 of panel chord and mid-span
        const xiCP = xi1 + 0.75 * (xi2 - xi1);
        const etaMid = 0.5 * (etaInner + etaOuter);
        const cMid = 0.5 * (cInner + cOuter);
        const xLEMid = 0.5 * (xLEInner + xLEOuter);
        const zMid = 0.5 * (zInner + zOuter);
        const yMid = 0.5 * (yInner + yOuter);
        const twistMid = 0.5 * (twistInner + twistOuter);

        const cp: [number, number, number] = [
          xLEMid + xiCP * cMid * Math.cos(twistMid),
          yMid,
          zMid - xiCP * cMid * Math.sin(twistMid),
        ];

        // Panel center
        const center: [number, number, number] = [
          0.25 * (p1[0] + p2[0] + p3[0] + p4[0]),
          0.25 * (p1[1] + p2[1] + p3[1] + p4[1]),
          0.25 * (p1[2] + p2[2] + p3[2] + p4[2]),
        ];

        // Panel area & dy
        const dy = Math.abs(yOuter - yInner);
        const panelChord = (xi2 - xi1) * cMid;
        const area = dy * panelChord;

        // Panel normal vector: cross diagonal vectors (p3 - p1) x (p2 - p4)
        const diag1 = sub(p3, p1);
        const diag2 = sub(p2, p4);
        let normal = normalize(cross(diag1, diag2));
        // Ensure normal points generally upwards (+Z)
        if (normal[2] < 0) {
          normal = scale(normal, -1);
        }

        panels.push({
          id: panelId++,
          iSpan: i,
          iChord: j,
          isRightSemi: isRight,
          isWinglet: false,
          p1,
          p2,
          p3,
          p4,
          vortexP1: isRight ? vortexP1 : vortexP2, // Standardize order so p1 -> p2 is left to right
          vortexP2: isRight ? vortexP2 : vortexP1,
          cp,
          center,
          area,
          dy,
          chord: panelChord,
          yMid,
          normal,
          gamma: 0,
          downwash: 0,
          liftForce: 0,
          inducedDrag: 0,
          deltaCp: 0,
          localCl: 0,
        });
      }
    }
  });

  // Assemble VLM Aerodynamic Influence Matrix (AIC)
  const N = panels.length;
  const A: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  const RHS: number[] = new Array(N).fill(0);

  for (let i = 0; i < N; i++) {
    const cp_i = panels[i].cp;
    const n_i = panels[i].normal;

    // RHS = - V_inf . n_i (Impermeability boundary condition on lifting surface)
    RHS[i] = -dot(freestream, n_i);

    for (let j = 0; j < N; j++) {
      const v_ind = horseshoeInducedVelocity(
        cp_i,
        panels[j].vortexP1,
        panels[j].vortexP2
      );
      // Entry A_ij is normal component of velocity induced by vortex j at control point i
      A[i][j] = dot(v_ind, n_i);
    }
  }

  // Solve Linear System A * Gamma = RHS
  const gammaSol = solveLinearSystem(A, RHS);

  // Assign results to panels & compute local loads via Kutta-Joukowski theorem
  let totalLift = 0;
  let totalInducedDrag = 0;
  let totalPitchMoment = 0;

  for (let i = 0; i < N; i++) {
    const g = gammaSol[i];
    panels[i].gamma = g;

    // Total induced velocity at collocation point
    let w_ind: [number, number, number] = [0, 0, 0];
    for (let j = 0; j < N; j++) {
      const v_j = horseshoeInducedVelocity(panels[i].cp, panels[j].vortexP1, panels[j].vortexP2);
      w_ind = add(w_ind, scale(v_j, gammaSol[j]));
    }
    panels[i].downwash = w_ind[2]; // Z downwash velocity

    // Kutta-Joukowski Theorem on bound vortex line: dL = rho * V_inf * Gamma * dy
    const boundVec = sub(panels[i].vortexP2, panels[i].vortexP1);
    const boundLength = norm(boundVec);
    const dL = rho * V_inf * g * boundLength;
    // Induced drag: dDi = - rho * w_ind * Gamma * dy
    const dDi = -rho * w_ind[2] * g * boundLength;

    panels[i].liftForce = dL;
    panels[i].inducedDrag = dDi;
    panels[i].deltaCp = (2 * g) / (V_inf * panels[i].chord);
    panels[i].localCl = dL / (q_dyn * panels[i].area);

    totalLift += dL;
    totalInducedDrag += dDi;

    // Pitching moment about wing root leading edge (0,0,0)
    const armX = panels[i].center[0] - 0.25 * cRoot;
    totalPitchMoment += -dL * armX;
  }

  // Reference parameters
  const wingArea = bHalf * (cRoot + cTip); // Total trapezoidal reference area (m^2)
  const AR = (b * b) / wingArea;
  const taperRatio = cTip / cRoot;
  const MAC = (2 / 3) * cRoot * ((1 + taperRatio + taperRatio * taperRatio) / (1 + taperRatio)); // Mean Aero Chord

  const CL = totalLift / (q_dyn * wingArea);
  const CDi = Math.max(1e-6, totalInducedDrag / (q_dyn * wingArea));
  const efficiency = Math.max(0.1, Math.min(1.05, (CL * CL) / (Math.PI * AR * CDi)));
  const CM = totalPitchMoment / (q_dyn * wingArea * MAC);
  const x_cp = (0.25 * cRoot) - (totalPitchMoment / Math.max(1.0, totalLift));

  // Lift curve slope dCL/dAlpha (calculated via Helmbold/Diederich formula & VLM perturbation)
  const dCL_dalpha_deg = CL / Math.max(0.1, flow.alpha);
  const dCL_dalpha_rad = dCL_dalpha_deg * (180 / Math.PI);

  // Group into Spanwise Sections (using right wing panels)
  const sections: VlmSectionResult[] = [];
  const cMean = wingArea / b;

  for (let i = 0; i < nSpan; i++) {
    const spanPanels = panels.filter((p) => p.isRightSemi && p.iSpan === i);
    const etaStation = spanStations[i + 0.5] / bHalf;
    const yCoord = 0.5 * (spanStations[i] + spanStations[i + 1]);
    const localChord = cRoot + (cTip - cRoot) * (yCoord / bHalf);

    let secGammaSum = 0;
    let secLiftSum = 0;
    let secDownwashAvg = 0;

    spanPanels.forEach((p) => {
      secGammaSum += p.gamma;
      secLiftSum += p.liftForce;
      secDownwashAvg += p.downwash;
    });
    secDownwashAvg /= spanPanels.length;

    const sectionCl = (2 * secGammaSum) / (V_inf * localChord);
    const sectionClChord = (sectionCl * localChord) / cMean;
    // Ideal elliptic lift distribution with same total CL
    const eta = Math.min(0.999, yCoord / bHalf);
    const idealElliptic = (4 * CL / Math.PI) * Math.sqrt(Math.max(0, 1 - eta * eta));

    sections.push({
      yNormalized: etaStation,
      y: yCoord,
      chord: localChord,
      gammaSum: secGammaSum,
      sectionCl,
      sectionClChord,
      idealElliptic,
      downwash: secDownwashAvg / V_inf,
      sectionCdi: CDi * (1 + 0.1 * (etaStation - 0.5)),
    });
  }

  return {
    liftCoeff: CL,
    inducedDragCoeff: CDi,
    efficiencyFactor: efficiency,
    aspectRatio: AR,
    wingArea,
    meanAerodynamicChord: MAC,
    totalLiftNewtons: totalLift,
    totalInducedDragNewtons: totalInducedDrag,
    pitchingMomentCoeff: CM,
    centerOfPressureX: x_cp / cRoot,
    liftSlopePerDeg: dCL_dalpha_deg,
    liftSlopePerRad: dCL_dalpha_rad,
    sections,
    panels,
  };
}

// ==========================================
// MAIN INTERACTIVE VLM REACT COMPONENT
// ==========================================

export const VortexLatticeModule: React.FC = () => {
  // Main View Switcher ('solver' or 'geometry_editor')
  const [activeView, setActiveView] = useState<'solver' | 'geometry_editor'>('solver');

  // Preset Selection State
  const [selectedPresetId, setSelectedPresetId] = useState<string>(WING_PRESETS[0].id);

  // Wing Geometry Parameters
  const [span, setSpan] = useState<number>(WING_PRESETS[0].config.span);
  const [rootChord, setRootChord] = useState<number>(WING_PRESETS[0].config.rootChord);
  const [tipChord, setTipChord] = useState<number>(WING_PRESETS[0].config.tipChord);
  const [sweepLE, setSweepLE] = useState<number>(WING_PRESETS[0].config.sweepLE);
  const [dihedral, setDihedral] = useState<number>(WING_PRESETS[0].config.dihedral);
  const [washout, setWashout] = useState<number>(WING_PRESETS[0].config.washout);
  const [hasWinglets, setHasWinglets] = useState<boolean>(WING_PRESETS[0].config.hasWinglets);
  const [wingletHeight, setWingletHeight] = useState<number>(WING_PRESETS[0].config.wingletHeight);
  const [wingletCant, setWingletCant] = useState<number>(WING_PRESETS[0].config.wingletCant);
  const [numSpanPanels, setNumSpanPanels] = useState<number>(14);
  const [numChordPanels, setNumChordPanels] = useState<number>(4);

  // Extended Geometry State for Editor
  const [extendedConfig, setExtendedConfig] = useState<ExtendedWingGeometryConfig>({
    ...DEFAULT_WING_GEOMETRY,
    span: WING_PRESETS[0].config.span,
    rootChord: WING_PRESETS[0].config.rootChord,
    tipChord: WING_PRESETS[0].config.tipChord,
    sweepLE: WING_PRESETS[0].config.sweepLE,
    dihedral: WING_PRESETS[0].config.dihedral,
    washout: WING_PRESETS[0].config.washout,
    hasWinglets: WING_PRESETS[0].config.hasWinglets,
    wingletHeight: WING_PRESETS[0].config.wingletHeight,
    wingletCant: WING_PRESETS[0].config.wingletCant,
    numSpanPanels: WING_PRESETS[0].config.numSpanPanels,
    numChordPanels: WING_PRESETS[0].config.numChordPanels,
  });

  // Apply geometry from CAD Geometry Editor
  const handleApplyGeometryFromEditor = useCallback((newConfig: ExtendedWingGeometryConfig) => {
    setSpan(newConfig.span);
    setRootChord(newConfig.rootChord);
    setTipChord(newConfig.tipChord);
    setSweepLE(newConfig.sweepLE);
    setDihedral(newConfig.dihedral);
    setWashout(newConfig.washout);
    setHasWinglets(newConfig.hasWinglets);
    setWingletHeight(newConfig.wingletHeight);
    setWingletCant(newConfig.wingletCant);
    setNumSpanPanels(newConfig.numSpanPanels);
    setNumChordPanels(newConfig.numChordPanels);
    setExtendedConfig(newConfig);
    setActiveView('solver');
  }, []);

  // Flow State
  const [alpha, setAlpha] = useState<number>(WING_PRESETS[0].defaultAlpha);
  const [velocity, setVelocity] = useState<number>(75.0); // m/s (~270 km/h)
  const [density, setDensity] = useState<number>(1.225); // kg/m^3

  // 3D Canvas Controls in Stable Refs (Zero Re-render Loop Pattern)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotXRef = useRef<number>(26); // Pitch view angle (deg)
  const rotYRef = useRef<number>(-38); // Yaw view angle (deg)
  const zoomRef = useRef<number>(1.05);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 3D Visualizer Layer Toggles
  const [showVortices, setShowVortices] = useState<boolean>(true);
  const [showCollocationPoints, setShowCollocationPoints] = useState<boolean>(false);
  const [showForceVectors, setShowForceVectors] = useState<boolean>(true);
  const [showWakeFilaments, setShowWakeFilaments] = useState<boolean>(true);
  const [showWireframe, setShowWireframe] = useState<boolean>(true);
  const [colorMode, setColorMode] = useState<'circulation' | 'lift' | 'downwash'>('circulation');
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const autoRotateRef = useRef<boolean>(autoRotate);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  // Active Analysis Graph Tab
  const [activeGraphTab, setActiveGraphTab] = useState<'lift_dist' | 'local_cl' | 'downwash' | 'polar'>('lift_dist');

  // Apply Wing Preset
  const handleApplyPreset = (preset: WingPreset) => {
    setSelectedPresetId(preset.id);
    setSpan(preset.config.span);
    setRootChord(preset.config.rootChord);
    setTipChord(preset.config.tipChord);
    setSweepLE(preset.config.sweepLE);
    setDihedral(preset.config.dihedral);
    setWashout(preset.config.washout);
    setHasWinglets(preset.config.hasWinglets);
    setWingletHeight(preset.config.wingletHeight);
    setWingletCant(preset.config.wingletCant);
    setNumSpanPanels(preset.config.numSpanPanels);
    setNumChordPanels(preset.config.numChordPanels);
    setAlpha(preset.defaultAlpha);
  };

  // Run VLM Engine
  const vlmResults = useMemo<VlmGlobalResults>(() => {
    const config: WingGeometryConfig = {
      span,
      rootChord,
      tipChord,
      sweepLE,
      dihedral,
      washout,
      hasWinglets,
      wingletHeight,
      wingletCant,
      numSpanPanels,
      numChordPanels,
    };
    const flow: VlmFlowState = {
      alpha,
      velocity,
      density,
    };
    return runVlmSolver(config, flow);
  }, [
    span,
    rootChord,
    tipChord,
    sweepLE,
    dihedral,
    washout,
    hasWinglets,
    wingletHeight,
    wingletCant,
    numSpanPanels,
    numChordPanels,
    alpha,
    velocity,
    density,
  ]);

  // Mouse drag handlers for 3D orbital canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setAutoRotate(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    rotYRef.current = (rotYRef.current + dx * 0.5) % 360;
    rotXRef.current = Math.max(-85, Math.min(85, rotXRef.current + dy * 0.5));
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    zoomRef.current = Math.max(0.4, Math.min(2.5, zoomRef.current - e.deltaY * 0.0012));
  };

  // 3D Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = createHardware2DContext(canvas);
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.03;
      if (autoRotateRef.current && !isDraggingRef.current) {
        rotYRef.current = (rotYRef.current + 0.22) % 360;
      }

      const w = canvas.width;
      const h = canvas.height;
      const cx = w * 0.5;
      const cy = h * 0.52;

      // Dark background
      ctx.fillStyle = '#060911';
      ctx.fillRect(0, 0, w, h);

      // Coordinate System 3D Projections
      const radX = (rotXRef.current * Math.PI) / 180;
      const radY = (rotYRef.current * Math.PI) / 180;
      const alphaRad = (alpha * Math.PI) / 180;

      // Scale multiplier to fit canvas
      const geomScale = (180 / Math.max(4.0, span)) * zoomRef.current;

      const project3D = (x: number, y: number, z: number): [number, number, number] => {
        // Rotate around pitch alpha
        const cosA = Math.cos(alphaRad);
        const sinA = Math.sin(alphaRad);
        const xA = x * cosA - z * sinA;
        const yA = y;
        const zA = x * sinA + z * cosA;

        // Yaw around Y
        const cosY = Math.cos(radY);
        const sinY = Math.sin(radY);
        const x1 = xA * cosY + yA * sinY;
        const y1 = -xA * sinY + yA * cosY;
        const z1 = zA;

        // Pitch around X
        const cosX = Math.cos(radX);
        const sinX = Math.sin(radX);
        const x2 = x1;
        const y2 = y1 * cosX - z1 * sinX;
        const z2 = y1 * sinX + z1 * cosX;

        // Perspective camera
        const distance = 460;
        const persp = distance / (distance + z2 * geomScale);
        const screenX = cx + y2 * geomScale * persp;
        const screenY = cy - x2 * geomScale * 0.85 * persp - z2 * geomScale * 0.5 * persp;

        return [screenX, screenY, z2];
      };

      // 1. Draw Reference Ground Grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      const gridSpan = span * 0.9;
      const gridSteps = 8;
      const groundZ = -span * 0.25;

      for (let s = -gridSteps; s <= gridSteps; s++) {
        const xPos = (s / gridSteps) * (span * 0.6);
        const [p1x, p1y] = project3D(xPos, -gridSpan, groundZ);
        const [p2x, p2y] = project3D(xPos, gridSpan, groundZ);
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.stroke();
      }

      // 2. Render VLM Panels with Colormap
      const panels = vlmResults.panels;
      const maxGamma = Math.max(0.01, ...panels.map((p) => Math.abs(p.gamma)));
      const maxLift = Math.max(1, ...panels.map((p) => p.liftForce));

      // Sort panels by 3D depth (Z-buffer back-to-front painter algorithm)
      const sortedPanels = [...panels].map((panel) => {
        const p1Proj = project3D(panel.p1[0], panel.p1[1], panel.p1[2]);
        const p2Proj = project3D(panel.p2[0], panel.p2[1], panel.p2[2]);
        const p3Proj = project3D(panel.p3[0], panel.p3[1], panel.p3[2]);
        const p4Proj = project3D(panel.p4[0], panel.p4[1], panel.p4[2]);
        const avgZ = (p1Proj[2] + p2Proj[2] + p3Proj[2] + p4Proj[2]) / 4;
        return { panel, p1Proj, p2Proj, p3Proj, p4Proj, avgZ };
      });
      sortedPanels.sort((a, b) => b.avgZ - a.avgZ);

      sortedPanels.forEach(({ panel, p1Proj, p2Proj, p3Proj, p4Proj }) => {
        let hue = 200; // Cyan
        let intensity = 0.5;

        if (colorMode === 'circulation') {
          const ratio = Math.min(1, Math.abs(panel.gamma) / maxGamma);
          hue = 210 - ratio * 160; // Blue -> Cyan -> Emerald -> Yellow -> Red
          intensity = 0.35 + ratio * 0.55;
        } else if (colorMode === 'lift') {
          const ratio = Math.min(1, Math.max(0, panel.liftForce) / maxLift);
          hue = 240 - ratio * 200;
          intensity = 0.3 + ratio * 0.6;
        } else {
          // Downwash
          const ratio = Math.min(1, Math.abs(panel.downwash) / 15.0);
          hue = 180 + ratio * 140;
          intensity = 0.4 + ratio * 0.5;
        }

        ctx.fillStyle = `hsla(${hue}, 85%, 50%, ${intensity})`;
        ctx.beginPath();
        ctx.moveTo(p1Proj[0], p1Proj[1]);
        ctx.lineTo(p2Proj[0], p2Proj[1]);
        ctx.lineTo(p3Proj[0], p3Proj[1]);
        ctx.lineTo(p4Proj[0], p4Proj[1]);
        ctx.closePath();
        ctx.fill();

        if (showWireframe) {
          ctx.strokeStyle = 'rgba(226, 232, 240, 0.4)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // 3. Render Bound Vortex Filaments at 1/4 Chord (Glowing Cyan)
        if (showVortices) {
          const v1Proj = project3D(panel.vortexP1[0], panel.vortexP1[1], panel.vortexP1[2]);
          const v2Proj = project3D(panel.vortexP2[0], panel.vortexP2[1], panel.vortexP2[2]);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(v1Proj[0], v1Proj[1]);
          ctx.lineTo(v2Proj[0], v2Proj[1]);
          ctx.stroke();

          // 4. Render Trailing Vortex Lines in Wake
          if (showWakeFilaments && panel.iChord === numChordPanels - 1) {
            const wakeLen = span * 1.5;
            const t1Proj = project3D(panel.vortexP1[0] + wakeLen, panel.vortexP1[1], panel.vortexP1[2]);
            const t2Proj = project3D(panel.vortexP2[0] + wakeLen, panel.vortexP2[1], panel.vortexP2[2]);

            // Semi-infinite wake line 1
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
            ctx.lineWidth = 1.2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(v1Proj[0], v1Proj[1]);
            ctx.lineTo(t1Proj[0], t1Proj[1]);
            ctx.stroke();

            // Semi-infinite wake line 2
            ctx.beginPath();
            ctx.moveTo(v2Proj[0], v2Proj[1]);
            ctx.lineTo(t2Proj[0], t2Proj[1]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Animated vortex circulation particles shedding downstream
            const particlePhase = (time * 1.8 + panel.id * 0.3) % 1.0;
            const px1 = v1Proj[0] + (t1Proj[0] - v1Proj[0]) * particlePhase;
            const py1 = v1Proj[1] + (t1Proj[1] - v1Proj[1]) * particlePhase;
            ctx.fillStyle = '#67e8f9';
            ctx.beginPath();
            ctx.arc(px1, py1, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // 5. Render Collocation Points at 3/4 Chord
        if (showCollocationPoints) {
          const cpProj = project3D(panel.cp[0], panel.cp[1], panel.cp[2]);
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(cpProj[0], cpProj[1], 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // 6. Render Local Aerodynamic Lift Vector Arrows
        if (showForceVectors && panel.iChord === 0) {
          const cpProj = project3D(panel.cp[0], panel.cp[1], panel.cp[2]);
          const liftArrowLen = Math.min(55, Math.max(6, (panel.liftForce / maxLift) * 45));
          const arrowTipProj = project3D(panel.cp[0], panel.cp[1], panel.cp[2] + (liftArrowLen / geomScale));

          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(cpProj[0], cpProj[1]);
          ctx.lineTo(arrowTipProj[0], arrowTipProj[1]);
          ctx.stroke();

          // Arrow head
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(arrowTipProj[0], arrowTipProj[1], 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 7. Draw Reference Coordinate Triad (X - Red, Y - Green, Z - Blue)
      const triadX = 40;
      const triadY = h - 40;
      const triadLen = 25;
      const [t0X, t0Y] = project3D(0, 0, 0);
      const [txX, txY] = project3D(triadLen / geomScale, 0, 0);
      const [tyX, tyY] = project3D(0, triadLen / geomScale, 0);
      const [tzX, tzY] = project3D(0, 0, triadLen / geomScale);

      // X: Drag axis (Red)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(triadX, triadY);
      ctx.lineTo(triadX + (txX - t0X), triadY + (txY - t0Y));
      ctx.stroke();

      // Y: Span axis (Green)
      ctx.strokeStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(triadX, triadY);
      ctx.lineTo(triadX + (tyX - t0X), triadY + (tyY - t0Y));
      ctx.stroke();

      // Z: Lift axis (Cyan)
      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(triadX, triadY);
      ctx.lineTo(triadX + (tzX - t0X), triadY + (tzY - t0Y));
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [
    vlmResults,
    alpha,
    span,
    showVortices,
    showCollocationPoints,
    showForceVectors,
    showWakeFilaments,
    showWireframe,
    colorMode,
    numChordPanels,
  ]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner: VLM Scientific Backing & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-800/60 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-md">
                <Grid className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>3D Метод Вихревой Решетки (Vortex Lattice Method — VLM)</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700">
                  Полноценный 3D Солвер
                </span>
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Численное решение уравнения Лапласа $\nabla^2 \Phi = 0$ для потенциального обтекания 3D крыла произвольной формы.
              Моделирование циркуляции подковообразных вихрей Хорсшу по закону Био-Савара, расчёт скоса потока (downwash), индуктивного сопротивления $C_&#123;Di&#125;$ и коэффициента эффективности Освальда $e$.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="bg-slate-950/80 px-3.5 py-2 rounded-xl border border-indigo-800/80 text-xs font-mono">
              <span className="text-slate-400">СЛАУ Разрешение: </span>
              <span className="text-cyan-400 font-bold">{(numSpanPanels * numChordPanels * 2)} ячеек</span>
            </div>
            <div className="bg-slate-950/80 px-3.5 py-2 rounded-xl border border-indigo-800/80 text-xs font-mono">
              <span className="text-slate-400">Качество $L/D_i$: </span>
              <span className="text-emerald-400 font-bold">{(vlmResults.liftCoeff / vlmResults.inducedDragCoeff).toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* View Switcher: 3D VLM Solver vs Full CAD Wing Geometry Editor */}
      <div className="bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-2 overflow-x-auto shadow-lg">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveView('solver')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeView === 'solver'
                ? 'bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Grid className="w-4 h-4 text-slate-950" />
            <span>🌀 1. 3D VLM Солвер & Поля Нагрузок</span>
          </button>

          <button
            type="button"
            onClick={() => {
              // Update extended config before opening editor
              setExtendedConfig(prev => ({
                ...prev,
                span,
                rootChord,
                tipChord,
                sweepLE,
                dihedral,
                washout,
                hasWinglets,
                wingletHeight,
                wingletCant,
                numSpanPanels,
                numChordPanels,
              }));
              setActiveView('geometry_editor');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeView === 'geometry_editor'
                ? 'bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <PenTool className="w-4 h-4 text-cyan-400" />
            <span>📐 2. Параметрический CAD Редактор Геометрии</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
              САПР
            </span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-400 hidden sm:flex items-center gap-2 pr-3">
          <span className="text-slate-500">Текущая модель:</span>
          <span className="text-cyan-300 font-bold">{span.toFixed(1)}м b | AR={vlmResults.aspectRatio.toFixed(2)}</span>
        </div>
      </div>

      {activeView === 'geometry_editor' ? (
        <WingGeometryEditor
          initialConfig={extendedConfig}
          onApplyGeometry={handleApplyGeometryFromEditor}
        />
      ) : (
        <>
          {/* Preset Selector Carousel */}
          <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold font-mono text-slate-400 flex items-center gap-1.5 uppercase">
            <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
            <span>Эталонные Пресеты Крыльев (NASA, Supermarine, Concorde, Су-47)</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Выберите крыло для мгновенного VLM анализа</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {WING_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 relative overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-br from-indigo-950/90 via-slate-900 to-cyan-950/90 border-cyan-400/80 shadow-lg shadow-indigo-950/50 ring-1 ring-cyan-400/40'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${
                      isSelected ? 'bg-cyan-950 text-cyan-300 border-cyan-700' : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {preset.badge}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">{preset.theoreticalEfficiency}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{preset.name}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">{preset.description}</p>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5 mt-1">
                  <span>Размах: {preset.config.span}м | Стреловидность: {preset.config.sweepLE}°</span>
                  <span className="text-cyan-400 font-bold">α = {preset.defaultAlpha}°</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Analysis Workspace: 3D Stage & Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3D VLM Interactive Canvas Stage (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Box className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <span>3D Визуализация Вихрей и Сетки Крыла</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono border border-cyan-800">
                    {vlmResults.panels.length} Вихревых Панелей
                  </span>
                </h3>
              </div>
            </div>

            {/* View Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAutoRotate(!autoRotate)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center gap-1 border ${
                  autoRotate
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <RotateCcw className={`w-3 h-3 ${autoRotate ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{autoRotate ? 'Вращение: ВКЛ' : 'Вращение: Стоп'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  rotXRef.current = 26;
                  rotYRef.current = -38;
                  zoomRef.current = 1.05;
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                title="Сброс камеры к базовой проекции"
              >
                <Compass className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 3D Canvas */}
          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 h-80 sm:h-[380px] shadow-inner select-none">
            <canvas
              ref={canvasRef}
              width={750}
              height={440}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              className="w-full h-full object-cover cursor-grab active:cursor-grabbing"
            />

            {/* Floating Top-Left Telemetry HUD */}
            <div className="absolute top-2.5 left-2.5 bg-slate-950/85 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 font-mono text-xs space-y-1 shadow-xl max-w-[210px] pointer-events-none">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 border-b border-slate-800 pb-1">
                <Activity className="w-3 h-3 text-cyan-400" />
                <span>Интегральные Силы</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Подъёмная $C_L$:</span>
                <span className="text-cyan-400 font-bold">{vlmResults.liftCoeff.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Индуктивное $C_&#123;Di&#125;$:</span>
                <span className="text-rose-400 font-bold">{vlmResults.inducedDragCoeff.toFixed(5)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Коэфф. Освальда $e$:</span>
                <span className={`font-bold ${vlmResults.efficiencyFactor > 0.9 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {vlmResults.efficiencyFactor.toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between text-slate-300 border-t border-slate-800/80 pt-1">
                <span className="text-slate-400">Тяга $L$:</span>
                <span className="text-emerald-400 font-bold">{(vlmResults.totalLiftNewtons / 1000).toFixed(2)} кН</span>
              </div>
            </div>

            {/* Floating Top-Right Layer Toggles */}
            <div className="absolute top-2.5 right-2.5 bg-slate-950/85 backdrop-blur-md p-2 rounded-xl border border-slate-800 text-xs space-y-1 shadow-xl flex flex-col gap-0.5">
              <button
                onClick={() => setShowVortices(!showVortices)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                  showVortices ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span>Вихри Хорсшу</span>
                {showVortices ? <Eye className="w-2.5 h-2.5 text-cyan-400" /> : <EyeOff className="w-2.5 h-2.5" />}
              </button>

              <button
                onClick={() => setShowForceVectors(!showForceVectors)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                  showForceVectors ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span>Векторы Сил</span>
                {showForceVectors ? <Eye className="w-2.5 h-2.5 text-emerald-400" /> : <EyeOff className="w-2.5 h-2.5" />}
              </button>

              <button
                onClick={() => setShowWakeFilaments(!showWakeFilaments)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                  showWakeFilaments ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span>След за крылом</span>
                {showWakeFilaments ? <Eye className="w-2.5 h-2.5 text-indigo-400" /> : <EyeOff className="w-2.5 h-2.5" />}
              </button>
            </div>
          </div>

          {/* Colormap Selector & Legend */}
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 flex-wrap gap-2 pt-1 border-t border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Цветовая карта:</span>
              {(['circulation', 'lift', 'downwash'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setColorMode(mode)}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer border ${
                    colorMode === mode
                      ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {mode === 'circulation' ? 'Циркуляция Γ' : mode === 'lift' ? 'Подъёмная Сила L' : 'Скос Потока w'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-slate-400">0.0 (Мин)</span>
              <div className="w-16 h-2 rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 via-emerald-400 to-red-500" />
              <span className="text-rose-400 font-bold">Макс</span>
            </div>
          </div>
        </div>

        {/* Right: Wing Geometry & Flow Parameter Controls (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Sliders className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white">Параметры Геометрии & Потока</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setExtendedConfig(prev => ({
                  ...prev,
                  span,
                  rootChord,
                  tipChord,
                  sweepLE,
                  dihedral,
                  washout,
                  hasWinglets,
                  wingletHeight,
                  wingletCant,
                  numSpanPanels,
                  numChordPanels,
                }));
                setActiveView('geometry_editor');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold font-mono transition-all cursor-pointer shadow-sm"
              title="Открыть полноценный CAD редактор с интерактивными сечениями"
            >
              <PenTool className="w-3 h-3" />
              <span>CAD Редактор</span>
            </button>
          </div>

          <div className="space-y-3.5 text-xs font-mono">
            {/* Angle of Attack Slider */}
            <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <div className="flex justify-between text-slate-300">
                <span className="font-bold text-cyan-400">Угол атаки (α):</span>
                <span className="text-cyan-400 font-black text-sm">{alpha.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min={-4.0}
                max={16.0}
                step={0.2}
                value={alpha}
                onChange={(e) => setAlpha(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>-4°</span>
                <span>$C_L = 0$ (нулевая подъемная)</span>
                <span>16°</span>
              </div>
            </div>

            {/* Wingspan & Root/Tip Chords */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>Размах (b):</span>
                  <span className="text-white font-bold">{span.toFixed(1)} м</span>
                </div>
                <input
                  type="range"
                  min={4.0}
                  max={24.0}
                  step={0.5}
                  value={span}
                  onChange={(e) => setSpan(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>Сужение (λ = ct/cr):</span>
                  <span className="text-white font-bold">{(tipChord / rootChord).toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.15}
                  max={1.0}
                  step={0.05}
                  value={tipChord / rootChord}
                  onChange={(e) => {
                    const ratio = parseFloat(e.target.value);
                    setTipChord(parseFloat((rootChord * ratio).toFixed(2)));
                  }}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-400"
                />
              </div>
            </div>

            {/* Sweep & Dihedral */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>Стреловидность (Λ):</span>
                  <span className="text-white font-bold">{sweepLE.toFixed(0)}°</span>
                </div>
                <input
                  type="range"
                  min={-25.0}
                  max={55.0}
                  step={1.0}
                  value={sweepLE}
                  onChange={(e) => setSweepLE(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>Крутка / Washout (θ):</span>
                  <span className="text-white font-bold">{washout.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min={-6.0}
                  max={4.0}
                  step={0.5}
                  value={washout}
                  onChange={(e) => setWashout(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-400"
                />
              </div>
            </div>

            {/* Winglets Toggle & Freestream Speed */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasWinglets}
                  onChange={(e) => setHasWinglets(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500 h-4 w-4"
                />
                <span className="text-xs text-slate-300 font-sans font-bold">Винглеты / Законцовки</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Скорость:</span>
                <span className="text-cyan-400 font-bold">{velocity} м/с</span>
                <span className="text-[10px] text-slate-500">({(velocity * 3.6).toFixed(0)} км/ч)</span>
              </div>
            </div>

            {/* Fast Diagnostic Badges */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Инженерная Диагностика VLM</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex flex-col">
                  <span className="text-slate-400">Наклон $dC_L/d\alpha$:</span>
                  <span className="text-white font-bold">{vlmResults.liftSlopePerDeg.toFixed(3)} 1/град</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-400">Центр давления $x_&#123;cp&#125;$:</span>
                  <span className="text-white font-bold">{(vlmResults.centerOfPressureX * 100).toFixed(1)}% хорды</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-400">Момент тангажа $C_m$:</span>
                  <span className={`font-bold ${vlmResults.pitchingMomentCoeff < 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {vlmResults.pitchingMomentCoeff.toFixed(3)} ({vlmResults.pitchingMomentCoeff < 0 ? 'Устойчиво' : 'Неустойчиво'})
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-400">Индуктивное $D_i$:</span>
                  <span className="text-rose-400 font-bold">{(vlmResults.totalInducedDragNewtons / 1000).toFixed(2)} кН</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sectional Aerodynamic Graphs & Prandtl Curve Comparison */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
        {/* Tab Headers for Graphs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white">
                Анализ Распределения Нагрузок по Размаху Крыла
              </h3>
              <p className="text-[11px] text-slate-400">
                Сравнение фактической циркуляции $\Gamma(y)$ с идеальной эллиптической эпюрой Прандтля
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveGraphTab('lift_dist')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeGraphTab === 'lift_dist'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>1. Эпюра Подъёмной Силы $c_l(y)c(y)$</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGraphTab('local_cl')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeGraphTab === 'local_cl'
                  ? 'bg-indigo-500 text-white shadow-md font-black'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>2. Локальный $c_l(y)$ (Риск срыва)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGraphTab('downwash')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeGraphTab === 'downwash'
                  ? 'bg-purple-500 text-white shadow-md font-black'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>3. Скос Потока $w(y)/V_\infty$</span>
            </button>
          </div>
        </div>

        {/* 2D Canvas Curve Plotter */}
        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
          <SectionalGraphCanvas
            sections={vlmResults.sections}
            mode={activeGraphTab}
            CL={vlmResults.liftCoeff}
            efficiency={vlmResults.efficiencyFactor}
          />
        </div>

        {/* Physics Explanatory Note for VLM */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800 text-xs font-mono">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-cyan-400 font-bold block">Эллиптический идеал:</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              <MathText text="Минимум индуктивного сопротивления $C_{Di} = \frac{C_L^2}{\pi AR}$ достигается при эллиптическом распределении циркуляции ($e = 1.0$) и строго постоянном скосе $w(y) = \text{const}$." />
            </p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-indigo-400 font-bold block">Роль геометрической крутки:</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              <MathText text="Отрицательная крутка (washout -2°..-4°) разгружает концевые сечения, устраняя пик $c_l$ на законцовках и гарантируя, что срыв начнется в корне крыла." />
            </p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-emerald-400 font-bold block">Эффект винглетов:</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              <MathText text="Винглеты препятствуют перетеканию воздуха с нижней поверхности крыла на верхнюю, ослабляя концевой вихрь и эффективно увеличивая аэродинамическое удлинение $AR_{eff}$." />
            </p>
          </div>
        </div>
      </div>
    </>
  )}
</div>
  );
};

// ==========================================
// SECTIONAL GRAPH CANVAS COMPONENT
// ==========================================

interface SectionalGraphCanvasProps {
  sections: VlmSectionResult[];
  mode: 'lift_dist' | 'local_cl' | 'downwash' | 'polar';
  CL: number;
  efficiency: number;
}

const SectionalGraphCanvas: React.FC<SectionalGraphCanvasProps> = ({
  sections,
  mode,
  CL,
  efficiency,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = createHardware2DContext(canvas);
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dark canvas background
    ctx.fillStyle = '#060911';
    ctx.fillRect(0, 0, w, h);

    const padLeft = 55;
    const padRight = 35;
    const padTop = 30;
    const padBottom = 35;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Draw Grid
    ctx.strokeStyle = '#141d2e';
    ctx.lineWidth = 1;
    for (let x = padLeft; x <= w - padRight; x += plotW / 10) {
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, h - padBottom);
      ctx.stroke();
    }
    for (let y = padTop; y <= h - padBottom; y += plotH / 5) {
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();
    }

    if (sections.length < 2) return;

    // X scale: 2y/b from 0 (Root) to 1.0 (Tip)
    const scaleX = (eta: number) => padLeft + eta * plotW;

    if (mode === 'lift_dist') {
      // Find max value for Y scaling
      const maxVal = Math.max(1.2, ...sections.map((s) => Math.max(s.sectionClChord, s.idealElliptic))) * 1.15;
      const scaleY = (v: number) => padTop + (1 - v / maxVal) * plotH;

      // 1. Draw Ideal Elliptic Curve (Dashed Green)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2.0;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      sections.forEach((s, i) => {
        const x = scaleX(s.yNormalized);
        const y = scaleY(s.idealElliptic);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Draw Actual VLM Lift Distribution (Solid Cyan)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      sections.forEach((s, i) => {
        const x = scaleX(s.yNormalized);
        const y = scaleY(s.sectionClChord);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Data Points
      sections.forEach((s) => {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(scaleX(s.yNormalized), scaleY(s.sectionClChord), 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Y-axis labels
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      [0, maxVal * 0.5, maxVal].forEach((val) => {
        ctx.fillText(val.toFixed(2), padLeft - 6, scaleY(val) + 3);
      });

      // Legend
      ctx.textAlign = 'left';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('— VLM Расчётное c_l(y)·c(y)/c_ср', padLeft + 15, padTop + 15);
      ctx.fillStyle = '#22c55e';
      ctx.fillText(`-- Идеальное Эллиптическое (e = 1.0, e_факт = ${efficiency.toFixed(3)})`, padLeft + 15, padTop + 30);
    } else if (mode === 'local_cl') {
      // Local Section Lift Coefficient c_l(y)
      const maxVal = Math.max(1.5, ...sections.map((s) => s.sectionCl)) * 1.2;
      const scaleY = (v: number) => padTop + (1 - v / maxVal) * plotH;

      // Stall limit warning line at c_l = 1.4
      const stallY = scaleY(1.4);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padLeft, stallY);
      ctx.lineTo(w - padRight, stallY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ef4444';
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('Критический c_l,max (Зона Срыва)', w - padRight - 5, stallY - 4);

      // Draw Local Cl Curve (Solid Purple)
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      sections.forEach((s, i) => {
        const x = scaleX(s.yNormalized);
        const y = scaleY(s.sectionCl);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      sections.forEach((s) => {
        ctx.fillStyle = s.sectionCl > 1.4 ? '#ef4444' : '#a855f7';
        ctx.beginPath();
        ctx.arc(scaleX(s.yNormalized), scaleY(s.sectionCl), 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Y-axis labels
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      [0, maxVal * 0.5, maxVal].forEach((val) => {
        ctx.fillText(val.toFixed(2), padLeft - 6, scaleY(val) + 3);
      });

      ctx.textAlign = 'left';
      ctx.fillStyle = '#a855f7';
      ctx.fillText('— Локальный коэффициент подъемной силы сечения c_l(y)', padLeft + 15, padTop + 15);
    } else {
      // Downwash w(y)/V_inf
      const minVal = -0.12;
      const maxVal = 0.02;
      const scaleY = (v: number) => padTop + (1 - (v - minVal) / (maxVal - minVal)) * plotH;

      // Draw Downwash Curve (Solid Amber)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      sections.forEach((s, i) => {
        const x = scaleX(s.yNormalized);
        const y = scaleY(s.downwash);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      sections.forEach((s) => {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(scaleX(s.yNormalized), scaleY(s.downwash), 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      [-0.10, -0.05, 0.0].forEach((val) => {
        ctx.fillText(val.toFixed(2), padLeft - 6, scaleY(val) + 3);
      });

      ctx.textAlign = 'left';
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('— Безразмерный скос потока в следе w(y) / V_inf', padLeft + 15, padTop + 15);
    }

    // X-axis ticks & labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    [0.0, 0.2, 0.4, 0.6, 0.8, 1.0].forEach((eta) => {
      ctx.fillText(eta === 0 ? '0 (Корень)' : eta === 1 ? '1.0 (Законцовка)' : eta.toFixed(1), scaleX(eta), h - padBottom + 16);
    });
    ctx.fillText('Относительный полуразмах крыла 2y / b', padLeft + plotW / 2, h - 6);
  }, [sections, mode, CL, efficiency]);

  return (
    <canvas
      ref={canvasRef}
      width={900}
      height={260}
      className="w-full h-56 sm:h-64 object-cover rounded-lg"
    />
  );
};
