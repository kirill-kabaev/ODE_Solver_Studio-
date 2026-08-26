// ============================================================================
// UAV Parametric Spar FEA Bending & Skin Buckling Studio
// Shear Force Q(z), Bending Moment M(z), Carbon Tube Stresses & Skin Stability
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Activity,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Zap,
  TrendingDown,
  Sparkles,
  Shield,
  Maximize2,
  Box,
  Scale,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { FullscreenGraphButton } from '../../telemetry/FullscreenGraphButton';

export interface SparMaterialDef {
  id: string;
  name: string;
  sigmaAllowMpa: number;
  youngsModulusGpa: number;
  densityKgM3: number;
  poissonRatio: number;
}

export const SPAR_MATERIALS: SparMaterialDef[] = [
  { id: 'carbon_t700', name: 'Углепластик T700 Pultruded (Карбоновая трубка)', sigmaAllowMpa: 1450, youngsModulusGpa: 135, densityKgM3: 1550, poissonRatio: 0.32 },
  { id: 'carbon_twill_3k', name: 'Углепластик 3K Twill Woven Prepreg', sigmaAllowMpa: 850, youngsModulusGpa: 70, densityKgM3: 1500, poissonRatio: 0.30 },
  { id: 'd16t_aluminum', name: 'Авиационный дюралюминий Д16Т / 2024-T3', sigmaAllowMpa: 420, youngsModulusGpa: 72, densityKgM3: 2780, poissonRatio: 0.33 },
  { id: 'aviation_balsa_pine', name: 'Авиационная сосна / Бальзовый лонжерон', sigmaAllowMpa: 85, youngsModulusGpa: 12, densityKgM3: 520, poissonRatio: 0.38 },
];

export const UAVParametricSparFEABucklingModule: React.FC = () => {
  // Geometric & Maneuver inputs
  const [wingspanM, setWingspanM] = useState<number>(2.4); // Wingspan b (meters)
  const [rootChordM, setRootChordM] = useState<number>(0.32); // Root chord c_root (m)
  const [tipChordM, setTipChordM] = useState<number>(0.18); // Tip chord c_tip (m)
  const [mtowKg, setMtowKg] = useState<number>(7.5); // MTOW (kg)
  const [loadFactorNy, setLoadFactorNy] = useState<number>(6.0); // +6g maneuver
  const [sparOuterDiaMm, setSparOuterDiaMm] = useState<number>(18.0); // Spar outer diameter (mm)
  const [sparWallThickMm, setSparWallThickMm] = useState<number>(1.5); // Spar wall thickness (mm)
  const [ribSpacingMm, setRibSpacingMm] = useState<number>(100); // Distance between ribs (mm)
  const [skinThicknessMm, setSkinThicknessMm] = useState<number>(0.8); // Skin thickness (mm)
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('carbon_t700');

  const activeMaterial = useMemo(() => {
    return SPAR_MATERIALS.find((m) => m.id === selectedMaterialId) || SPAR_MATERIALS[0];
  }, [selectedMaterialId]);

  // Structural Calculations along wing half-span
  const structuralAnalysis = useMemo(() => {
    const halfSpanM = wingspanM / 2;
    const numStations = 21;
    const dz = halfSpanM / (numStations - 1);

    // Total lift on half-wing required = (MTOW * g * loadFactorNy) / 2
    const totalHalfLiftN = (mtowKg * 9.81 * loadFactorNy) / 2;

    // Carbon tube cross-sectional inertia
    const dOutM = sparOuterDiaMm / 1000;
    const tM = sparWallThickMm / 1000;
    const dInM = Math.max(0.001, dOutM - 2 * tM);
    // I = pi/64 * (D_out^4 - D_in^4)
    const momentOfInertiaM4 = (Math.PI / 64) * (Math.pow(dOutM, 4) - Math.pow(dInM, 4));
    const crossSectionAreaM2 = (Math.PI / 4) * (Math.pow(dOutM, 2) - Math.pow(dInM, 2));
    const sparMassKg = +(crossSectionAreaM2 * wingspanM * activeMaterial.densityKgM3).toFixed(3);

    // Trapezoidal wing planform area & local chord distribution
    const planformAreaM2 = ((rootChordM + tipChordM) / 2) * wingspanM;

    const stationsData = [];
    let accumulatedShear = 0;
    let accumulatedMoment = 0;

    // Integration from tip (z = halfSpan) to root (z = 0)
    for (let i = numStations - 1; i >= 0; i--) {
      const z = i * dz;
      const zNorm = +(z / halfSpanM).toFixed(2);
      const chordZ = rootChordM - (rootChordM - tipChordM) * (z / halfSpanM);

      // Elliptic/Trapezoidal aerodynamic lift distribution
      const liftDensity = (totalHalfLiftN / (halfSpanM * (Math.PI / 4))) * Math.sqrt(Math.max(0, 1 - Math.pow(z / halfSpanM, 2)));

      // Shear force Q(z) = integral from z to tip of q(zeta) d_zeta
      accumulatedShear += liftDensity * dz;
      // Bending moment M(z) = integral from z to tip of Q(zeta) d_zeta
      accumulatedMoment += accumulatedShear * dz;

      // Normal bending stress sigma_max = M * y_max / I
      const yMaxM = dOutM / 2;
      const sigmaBendingMpa = (accumulatedMoment * yMaxM) / momentOfInertiaM4 / 1e6;
      const safetyFactor = +(activeMaterial.sigmaAllowMpa / Math.max(1, sigmaBendingMpa)).toFixed(2);

      // Skin shear buckling critical stress: tau_cr = ks * pi^2 * E / (12(1-nu^2)) * (t/b)^2
      const ks = 5.35; // simply supported panel buckling coefficient
      const skinEMpa = activeMaterial.youngsModulusGpa * 1000 * 0.4; // composite skin modulus
      const bRibM = ribSpacingMm / 1000;
      const tSkinM = skinThicknessMm / 1000;
      const tauCriticalBucklingMpa = +(
        ((ks * Math.pow(Math.PI, 2) * skinEMpa) / (12 * (1 - Math.pow(activeMaterial.poissonRatio, 2)))) *
        Math.pow(tSkinM / bRibM, 2)
      ).toFixed(1);

      // Local skin shear stress tau_skin = Q / (2 * h_spar * t_skin)
      const sparHeightM = chordZ * 0.12; // 12% thickness airfoil
      const tauAppliedMpa = +(accumulatedShear / (2 * sparHeightM * tSkinM * 1e6)).toFixed(2);
      const skinBucklingMargin = +(tauCriticalBucklingMpa / Math.max(0.1, tauAppliedMpa)).toFixed(1);

      stationsData.push({
        z: +z.toFixed(2),
        zNorm,
        chordMm: +(chordZ * 1000).toFixed(0),
        qLiftNPerM: +liftDensity.toFixed(1),
        shearForceN: +accumulatedShear.toFixed(1),
        bendingMomentNm: +accumulatedMoment.toFixed(1),
        sigmaBendingMpa: +sigmaBendingMpa.toFixed(1),
        safetyFactor,
        tauAppliedMpa,
        tauCriticalBucklingMpa,
        skinBucklingMargin,
      });
    }

    // Sort from root (z = 0) to tip (z = halfSpan)
    stationsData.reverse();

    const rootBendingMomentNm = stationsData[0].bendingMomentNm;
    const rootSigmaMpa = stationsData[0].sigmaBendingMpa;
    const minSafetyFactor = stationsData[0].safetyFactor;
    const rootSkinBucklingMargin = stationsData[0].skinBucklingMargin;

    // Wing tip elastic deflection w_tip approx: delta = (q * L^4) / (8 * E * I)
    const tipDeflectionMm = +(
      ((totalHalfLiftN * Math.pow(halfSpanM, 3)) / (3 * (activeMaterial.youngsModulusGpa * 1e9) * momentOfInertiaM4)) *
      1000 *
      0.65
    ).toFixed(1);

    return {
      stationsData,
      totalHalfLiftN: +totalHalfLiftN.toFixed(1),
      rootBendingMomentNm,
      rootSigmaMpa,
      minSafetyFactor,
      tipDeflectionMm,
      sparMassKg,
      rootSkinBucklingMargin,
      isOverstressed: minSafetyFactor < 1.5,
      isBucklingRisk: rootSkinBucklingMargin < 1.2,
    };
  }, [
    wingspanM,
    rootChordM,
    tipChordM,
    mtowKg,
    loadFactorNy,
    sparOuterDiaMm,
    sparWallThickMm,
    ribSpacingMm,
    skinThicknessMm,
    activeMaterial,
  ]);

  return (
    <div className="bg-slate-900 border border-teal-800/50 rounded-2xl p-6 shadow-2xl space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-teal-800/40 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md text-xs font-black tracking-wider bg-gradient-to-r from-teal-500 to-indigo-500 text-slate-950 uppercase shadow-md">
              Прочность & САПР Конструкций
            </span>
            <span className="text-xs text-teal-400 font-mono flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> FEA Spar Bending & Skin Buckling
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            <Box className="w-6 h-6 text-cyan-400" />
            Параметрический FEA-Анализ Прочности Лонжерона и Устойчивости Обшивки
          </h2>
          <p className="text-slate-400 text-sm max-w-3xl mt-1">
            Построение эпюр перерезывающих сил Q(z), изгибающих моментов M(z), нормальных напряжений в карбоновом трубчатом лонжероне и критических касательных напряжений потери устойчивости обшивки при перегрузках до +6g.
          </p>
        </div>

        {/* Material Quick Select */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-2 rounded-xl border border-teal-900/50">
          <Shield className="w-4 h-4 text-teal-400" />
          <select
            value={selectedMaterialId}
            onChange={(e) => setSelectedMaterialId(e.target.value)}
            className="bg-slate-900 text-teal-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-teal-700/60 focus:outline-none focus:ring-1 focus:ring-teal-400"
          >
            {SPAR_MATERIALS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className={`p-4 rounded-xl border backdrop-blur-md transition-all ${
          structuralAnalysis.isOverstressed
            ? 'bg-rose-950/40 border-rose-500/60 text-rose-300'
            : 'bg-slate-950/60 border-teal-900/50 text-emerald-300'
        }`}>
          <div className="text-xs uppercase font-bold text-slate-400 flex items-center justify-between">
            <span>Запас Прочности Лонжерона</span>
            {structuralAnalysis.isOverstressed ? <AlertTriangle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>
          <div className="text-2xl font-black mt-1 font-mono">k = {structuralAnalysis.minSafetyFactor}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Норма: k ≥ 1.50 (Корень σ = {structuralAnalysis.rootSigmaMpa} МПа)
          </div>
        </div>

        <div className="p-4 rounded-xl border border-teal-900/50 bg-slate-950/60 text-teal-300">
          <div className="text-xs uppercase font-bold text-slate-400">Корневой Момент M(max)</div>
          <div className="text-2xl font-black mt-1 font-mono text-cyan-300">{structuralAnalysis.rootBendingMomentNm} <span className="text-xs font-normal">Н·м</span></div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Перегрузка: ny = +{loadFactorNy}g ({structuralAnalysis.totalHalfLiftN} Н / консоль)
          </div>
        </div>

        <div className="p-4 rounded-xl border border-teal-900/50 bg-slate-950/60 text-teal-300">
          <div className="text-xs uppercase font-bold text-slate-400">Упругий Прогиб Конца Крыла</div>
          <div className="text-2xl font-black mt-1 font-mono text-indigo-300">{structuralAnalysis.tipDeflectionMm} <span className="text-xs font-normal">мм</span></div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Масса лонжерона: {structuralAnalysis.sparMassKg} кг
          </div>
        </div>

        <div className={`p-4 rounded-xl border backdrop-blur-md transition-all ${
          structuralAnalysis.isBucklingRisk
            ? 'bg-amber-950/40 border-amber-500/60 text-amber-300'
            : 'bg-slate-950/60 border-teal-900/50 text-teal-300'
        }`}>
          <div className="text-xs uppercase font-bold text-slate-400 flex items-center justify-between">
            <span>Устойчивость Обшивки (Buckling)</span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black mt-1 font-mono">k = {structuralAnalysis.rootSkinBucklingMargin}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Шаг нервюр: {ribSpacingMm} мм, t(skin) = {skinThicknessMm} мм
          </div>
        </div>
      </div>

      {/* Main Grid: Controls & Diagrams */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-950/70 p-4 rounded-xl border border-teal-900/40 space-y-3.5">
            <h3 className="text-sm font-bold text-teal-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Геометрия Крыла & Нагрузочный Режим
            </h3>

            {/* Wingspan & MTOW */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Размах (b)</span>
                  <span className="font-mono text-cyan-300">{wingspanM} м</span>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={6.0}
                  step={0.1}
                  value={wingspanM}
                  onChange={(e) => setWingspanM(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Взлетный Вес (MTOW)</span>
                  <span className="font-mono text-cyan-300">{mtowKg} кг</span>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={45.0}
                  step={0.5}
                  value={mtowKg}
                  onChange={(e) => setMtowKg(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
              </div>
            </div>

            {/* Load factor */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Расчетная Перегрузка ($n_y$)</span>
                <span className="font-mono text-amber-300 font-bold">+{loadFactorNy}g</span>
              </div>
              <input
                type="range"
                min={2.0}
                max={12.0}
                step={0.5}
                value={loadFactorNy}
                onChange={(e) => setLoadFactorNy(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
            </div>

            {/* Spar Outer Diameter & Wall Thickness */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Диаметр Трубы (Ø)</span>
                  <span className="font-mono text-indigo-300">{sparOuterDiaMm} мм</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={40}
                  step={1}
                  value={sparOuterDiaMm}
                  onChange={(e) => setSparOuterDiaMm(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Толщина Стенки ($t$)</span>
                  <span className="font-mono text-indigo-300">{sparWallThickMm} мм</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={4.0}
                  step={0.1}
                  value={sparWallThickMm}
                  onChange={(e) => setSparWallThickMm(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
              </div>
            </div>

            {/* Rib spacing & skin thickness */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Шаг Нервюр</span>
                  <span className="font-mono text-emerald-300">{ribSpacingMm} мм</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={250}
                  step={10}
                  value={ribSpacingMm}
                  onChange={(e) => setRibSpacingMm(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Толщина Обшивки</span>
                  <span className="font-mono text-emerald-300">{skinThicknessMm} мм</span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={2.5}
                  step={0.1}
                  value={skinThicknessMm}
                  onChange={(e) => setSkinThicknessMm(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: FEA Moment & Stress Diagrams */}
        <div className="lg:col-span-7 space-y-4">
          {/* Bending Moment & Stress Diagram along Span */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-teal-900/40">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-teal-400" />
                Эпюра Изгибающего Момента M(z) и Напряжений σ(z)
              </h4>
              <FullscreenGraphButton domain="3d_aero_studio" />
            </div>

            <div className="h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={structuralAnalysis.stationsData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="z" stroke="#64748b" tick={{ fontSize: 9 }} unit=" м" />
                  <YAxis yAxisId="left" stroke="#38bdf8" tick={{ fontSize: 9 }} unit=" Н·м" />
                  <YAxis yAxisId="right" orientation="right" stroke="#f43f5e" tick={{ fontSize: 9 }} unit=" МПа" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#0d9488', fontSize: '11px' }} />
                  <Line yAxisId="left" type="monotone" dataKey="bendingMomentNm" name="Момент M(z) (Н·м)" stroke="#38bdf8" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="sigmaBendingMpa" name="Напряжение σ (МПа)" stroke="#f43f5e" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
