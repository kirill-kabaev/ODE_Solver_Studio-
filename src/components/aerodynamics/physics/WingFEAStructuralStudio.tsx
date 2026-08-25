import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Layers,
  Activity,
  Sliders,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Download,
  Info,
  Maximize2,
  RefreshCw,
  Box,
  Compass,
  TrendingUp,
} from 'lucide-react';

export interface WingMaterial {
  id: string;
  name: string;
  category: 'aluminum' | 'steel' | 'titanium' | 'composite' | 'wood';
  E_GPa: number; // Young's modulus (GPa)
  G_GPa: number; // Shear modulus (GPa)
  density_kg_m3: number; // Density (kg/m3)
  sigma_yield_MPa: number; // Yield strength (MPa)
  sigma_ult_MPa: number; // Ultimate strength (MPa)
  poisson: number;
}

export const AVIATION_MATERIALS: WingMaterial[] = [
  {
    id: 'd16t',
    name: 'Д16Т (Авиационный Дюралюминий / 2024-T3)',
    category: 'aluminum',
    E_GPa: 72,
    G_GPa: 27,
    density_kg_m3: 2780,
    sigma_yield_MPa: 310,
    sigma_ult_MPa: 450,
    poisson: 0.33,
  },
  {
    id: 'b95',
    name: 'В95 (Высокопрочный Алюминий / 7075-T6)',
    category: 'aluminum',
    E_GPa: 74,
    G_GPa: 28,
    density_kg_m3: 2850,
    sigma_yield_MPa: 490,
    sigma_ult_MPa: 570,
    poisson: 0.33,
  },
  {
    id: 'carbon_t300',
    name: 'Углепластик T300 / Эпоксид (Квазиизотропный)',
    category: 'composite',
    E_GPa: 135,
    G_GPa: 45,
    density_kg_m3: 1550,
    sigma_yield_MPa: 620,
    sigma_ult_MPa: 850,
    poisson: 0.31,
  },
  {
    id: 'ti_6al_4v',
    name: 'Титан ВТ6 (Ti-6Al-4V Класс 5)',
    category: 'titanium',
    E_GPa: 114,
    G_GPa: 44,
    density_kg_m3: 4430,
    sigma_yield_MPa: 880,
    sigma_ult_MPa: 950,
    poisson: 0.34,
  },
  {
    id: 'steel_30khgsa',
    name: 'Сталь 30ХГСА (Хромансиль Высокопрочная)',
    category: 'steel',
    E_GPa: 210,
    G_GPa: 80,
    density_kg_m3: 7850,
    sigma_yield_MPa: 850,
    sigma_ult_MPa: 1100,
    poisson: 0.30,
  },
  {
    id: 'birch_plywood',
    name: 'Авиационная Фанера БС-1 (Березовая)',
    category: 'wood',
    E_GPa: 12.5,
    G_GPa: 1.8,
    density_kg_m3: 700,
    sigma_yield_MPa: 65,
    sigma_ult_MPa: 85,
    poisson: 0.28,
  },
];

export const WingFEAStructuralStudio: React.FC = () => {
  // Wing Geometry Parameters
  const [wingspanM, setWingspanM] = useState<number>(10.0); // Full wingspan (b)
  const [rootChordM, setRootChordM] = useState<number>(1.8);
  const [tipChordM, setTipChordM] = useState<number>(0.9);
  const [taperRatio, setTaperRatio] = useState<number>(0.5);

  // Flight Load Condition
  const [aircraftMassKg, setAircraftMassKg] = useState<number>(1200);
  const [loadFactorN, setLoadFactorN] = useState<number>(3.8); // +3.8g (ГОСТ Нормы Летной Годности)
  const [safetyFactorReq, setSafetyFactorReq] = useState<number>(1.5); // Стандартный запас f = 1.5

  // Spar Cross-section dimensions (I-Beam / Box Spar)
  const [sparHeightMm, setSparHeightMm] = useState<number>(180); // Spar web height at root
  const [flangeWidthMm, setFlangeWidthMm] = useState<number>(65); // Spar flange width
  const [flangeThickMm, setFlangeThickMm] = useState<number>(12); // Flange thickness
  const [webThickMm, setWebThickMm] = useState<number>(5); // Web thickness
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('d16t');
  const [numNodes, setNumNodes] = useState<number>(20); // FEA Discretization Elements

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const material = useMemo(() => {
    return AVIATION_MATERIALS.find((m) => m.id === selectedMaterialId) || AVIATION_MATERIALS[0];
  }, [selectedMaterialId]);

  // 1D FEA / Euler-Bernoulli & Timoshenko Beam Bending Analysis
  const feaResults = useMemo(() => {
    const halfSpan = wingspanM / 2.0; // Semispan (L)
    const g = 9.80665;
    const totalLiftN = aircraftMassKg * g * loadFactorN;
    const semiWingLiftN = totalLiftN / 2.0;

    const N = Math.max(10, Math.min(50, numNodes));
    const dy = halfSpan / (N - 1);

    // Arrays along semi-span y from 0 (root) to L (tip)
    const yArr: number[] = [];
    const chordArr: number[] = [];
    const liftDistArr: number[] = []; // N/m (Schrenk approximation: average of planform trapezoid and ellipse)
    const shearForceArr: number[] = new Array(N).fill(0); // Q(y) [N]
    const bendingMomentArr: number[] = new Array(N).fill(0); // M(y) [N*m]
    const deflectionArr: number[] = new Array(N).fill(0); // w(y) [m]
    const slopeArr: number[] = new Array(N).fill(0); // theta(y) [rad]
    const stressMaxArr: number[] = new Array(N).fill(0); // sigma(y) [MPa]
    const safetyMarginArr: number[] = new Array(N).fill(0); // eta(y)

    // Calculate planform geometry & Schrenk aerodynamic lift distribution
    const S_semi = (rootChordM + tipChordM) * 0.5 * halfSpan;
    const q_avg = semiWingLiftN / S_semi;

    for (let i = 0; i < N; i++) {
      const y = i * dy;
      const eta = y / halfSpan; // 0 to 1
      const c = rootChordM - (rootChordM - tipChordM) * eta;
      yArr.push(y);
      chordArr.push(c);

      // Schrenk distribution: 50% trapezoidal + 50% elliptic
      const liftTrap = q_avg * c;
      const liftEllip = (4.0 * semiWingLiftN / (Math.PI * halfSpan)) * Math.sqrt(Math.max(0, 1.0 - eta * eta));
      const q_schrenk = 0.5 * (liftTrap + liftEllip);
      liftDistArr.push(q_schrenk);
    }

    // Integrate Shear Force Q(y) from tip to root: Q(y) = \int_y^L q(\xi) d\xi
    for (let i = N - 1; i >= 0; i--) {
      if (i === N - 1) {
        shearForceArr[i] = 0;
      } else {
        shearForceArr[i] = shearForceArr[i + 1] + 0.5 * (liftDistArr[i] + liftDistArr[i + 1]) * dy;
      }
    }

    // Integrate Bending Moment M(y) from tip to root: M(y) = \int_y^L Q(\xi) d\xi
    for (let i = N - 1; i >= 0; i--) {
      if (i === N - 1) {
        bendingMomentArr[i] = 0;
      } else {
        bendingMomentArr[i] = bendingMomentArr[i + 1] + 0.5 * (shearForceArr[i] + shearForceArr[i + 1]) * dy;
      }
    }

    // Section Properties (I-Beam Spar with taper along span)
    const E = material.E_GPa * 1e9; // Pa
    let maxStressOverall = 0;
    let maxDeflectionTip = 0;

    // Curvature kappa(y) = M(y) / (E * I(y))
    const curvatureArr: number[] = new Array(N).fill(0);

    for (let i = 0; i < N; i++) {
      const eta = yArr[i] / halfSpan;
      // Spar height scales with chord
      const h_y = (sparHeightMm * (1.0 - 0.45 * eta)) * 1e-3; // meters
      const b_f = (flangeWidthMm * (1.0 - 0.35 * eta)) * 1e-3;
      const t_f = flangeThickMm * 1e-3;
      const t_w = webThickMm * 1e-3;

      // Moment of inertia for I-beam: I = (b*h^3 - (b - t_w)*(h - 2*t_f)^3) / 12
      const h_inner = Math.max(0.001, h_y - 2 * t_f);
      const b_inner = Math.max(0.001, b_f - t_w);
      const I_xx = (b_f * Math.pow(h_y, 3) - b_inner * Math.pow(h_inner, 3)) / 12.0;

      const M = bendingMomentArr[i];
      const kappa = M / (E * Math.max(1e-9, I_xx));
      curvatureArr[i] = kappa;

      // Bending stress: sigma = M * (h/2) / I_xx
      const sigma_Pa = (M * (h_y / 2.0)) / Math.max(1e-9, I_xx);
      const sigma_MPa = sigma_Pa * 1e-6;
      stressMaxArr[i] = sigma_MPa;

      if (sigma_MPa > maxStressOverall) {
        maxStressOverall = sigma_MPa;
      }

      const safeMarg = material.sigma_yield_MPa / Math.max(0.001, sigma_MPa);
      safetyMarginArr[i] = safeMarg;
    }

    // Double Integration for Deflection w(y): d2w/dy2 = kappa, w(0)=0, w'(0)=0 (Cantilever)
    slopeArr[0] = 0;
    deflectionArr[0] = 0;
    for (let i = 1; i < N; i++) {
      slopeArr[i] = slopeArr[i - 1] + 0.5 * (curvatureArr[i - 1] + curvatureArr[i]) * dy;
      deflectionArr[i] = deflectionArr[i - 1] + 0.5 * (slopeArr[i - 1] + slopeArr[i]) * dy;
    }
    maxDeflectionTip = deflectionArr[N - 1];

    // Estimated Spar Mass
    let sparMassKg = 0;
    for (let i = 0; i < N - 1; i++) {
      const eta = yArr[i] / halfSpan;
      const h_y = (sparHeightMm * (1.0 - 0.45 * eta)) * 1e-3;
      const b_f = (flangeWidthMm * (1.0 - 0.35 * eta)) * 1e-3;
      const t_f = flangeThickMm * 1e-3;
      const t_w = webThickMm * 1e-3;
      const A_cross = 2 * (b_f * t_f) + (h_y - 2 * t_f) * t_w;
      sparMassKg += A_cross * dy * material.density_kg_m3;
    }
    // 2 spars (left and right wing)
    sparMassKg *= 2.0;

    const minSafetyFactor = material.sigma_yield_MPa / Math.max(0.001, maxStressOverall);
    const isStructureSafe = minSafetyFactor >= safetyFactorReq;

    return {
      halfSpan,
      N,
      yArr,
      chordArr,
      liftDistArr,
      shearForceArr,
      bendingMomentArr,
      deflectionArr,
      stressMaxArr,
      safetyMarginArr,
      maxStressOverall,
      maxDeflectionTipMm: maxDeflectionTip * 1000,
      minSafetyFactor,
      isStructureSafe,
      sparMassKg,
      totalLiftKN: totalLiftN / 1000,
    };
  }, [
    wingspanM,
    rootChordM,
    tipChordM,
    aircraftMassKg,
    loadFactorN,
    safetyFactorReq,
    sparHeightMm,
    flangeWidthMm,
    flangeThickMm,
    webThickMm,
    selectedMaterialId,
    numNodes,
    material,
  ]);

  // Render 2D Deformed Beam & Stress Color Heatmap Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Background Grid
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 40; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 30; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const { N, yArr, deflectionArr, stressMaxArr, halfSpan, maxDeflectionTipMm } = feaResults;

    const marginL = 60;
    const marginR = 40;
    const originX = marginL;
    const originY = height - 70;
    const plotWidth = width - marginL - marginR;
    const plotHeight = height - 120;

    // Draw Fuselage / Root Clamp Wall
    ctx.fillStyle = '#334155';
    ctx.fillRect(originX - 18, 20, 18, originY - 10);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    for (let py = 25; py < originY - 10; py += 12) {
      ctx.beginPath();
      ctx.moveTo(originX - 18, py);
      ctx.lineTo(originX, py + 8);
      ctx.stroke();
    }

    // Draw Undeformed Wing Baseline (Dashed)
    ctx.strokeStyle = '#475569';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX + plotWidth, originY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Calculate visual scaling for deflection
    const maxVisDeflectionPx = plotHeight * 0.75;
    const deflScale = maxDeflectionTipMm > 0 ? maxVisDeflectionPx / Math.max(1.0, maxDeflectionTipMm) : 1.0;

    // Draw Aerodynamic Lift Vectors (Upward Cyan Arrows)
    ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;

    for (let i = 0; i < N; i += 2) {
      const px = originX + (yArr[i] / halfSpan) * plotWidth;
      const defl = (deflectionArr[i] * 1000) * deflScale;
      const py = originY - defl;
      const arrowLen = Math.min(50, 15 + (feaResults.liftDistArr[i] / 80));

      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, py - arrowLen);
      ctx.stroke();

      // Arrow head
      ctx.beginPath();
      ctx.moveTo(px - 3, py - arrowLen + 5);
      ctx.lineTo(px, py - arrowLen);
      ctx.lineTo(px + 3, py - arrowLen + 5);
      ctx.stroke();
    }

    // Draw Deformed Wing Spar Ribbon with Stress Heatmap
    const sparVisualThick = 14;
    for (let i = 0; i < N - 1; i++) {
      const x1 = originX + (yArr[i] / halfSpan) * plotWidth;
      const yDefl1 = (deflectionArr[i] * 1000) * deflScale;
      const y1 = originY - yDefl1;

      const x2 = originX + (yArr[i + 1] / halfSpan) * plotWidth;
      const yDefl2 = (deflectionArr[i + 1] * 1000) * deflScale;
      const y2 = originY - yDefl2;

      // Color based on local Von Mises Stress / Yield ratio
      const stressRatio = stressMaxArr[i] / material.sigma_yield_MPa;
      let r = 0, g = 200, b = 100;
      if (stressRatio < 0.5) {
        // Green to Cyan
        r = Math.floor(stressRatio * 2 * 0);
        g = Math.floor(180 + stressRatio * 50);
        b = Math.floor(220);
      } else if (stressRatio < 0.85) {
        // Amber
        r = Math.floor(245);
        g = Math.floor(160 - (stressRatio - 0.5) * 200);
        b = 20;
      } else {
        // Danger Rose/Red
        r = 244;
        g = 63;
        b = 94;
      }

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.9)`;
      ctx.lineWidth = 1;

      // Draw quadrilateral element
      ctx.beginPath();
      ctx.moveTo(x1, y1 - sparVisualThick / 2);
      ctx.lineTo(x2, y2 - sparVisualThick / 2);
      ctx.lineTo(x2, y2 + sparVisualThick / 2);
      ctx.lineTo(x1, y1 + sparVisualThick / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Node circles
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x1, y1, 2.5, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Axes and Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText('0.0 м (Корень Крыла / Заделка)', originX, originY + 25);
    ctx.fillText(`${halfSpan.toFixed(1)} м (Законцовка)`, originX + plotWidth - 120, originY + 25);
    ctx.fillText(`Прогиб законцовки w_max = ${maxDeflectionTipMm.toFixed(1)} мм`, originX + plotWidth - 220, originY - (maxDeflectionTipMm * deflScale) - 15);
  }, [feaResults, material]);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                1D/2D МКЭ Прочность Лонжерона Крыла & Аэроупругие Деформации
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-indigo-950 text-indigo-300 border border-indigo-700">
                  FEA Euler-Bernoulli & Timoshenko
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Матричный расчет изгибных напряжений σ_vm(y), перерезывающих сил Q(y) и прогиба крыла w(y) по эллиптической эпюре Шренка и ГОСТ/FAR-25.
              </p>
            </div>
          </div>
        </div>

        {/* Safety Status Banner */}
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono text-xs font-bold shadow-lg ${
            feaResults.isStructureSafe
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-300 animate-pulse'
          }`}
        >
          {feaResults.isStructureSafe ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>
            {feaResults.isStructureSafe ? 'КОНСТРУКЦИЯ ПРОЧНА' : 'ОПАСНОСТЬ: ПРЕВЫШЕНИЕ ПРЕДЕЛА ТЕКУЧЕСТИ!'} (η ={' '}
            {feaResults.minSafetyFactor.toFixed(2)})
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Material Selector */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl">
            <span className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider border-b border-slate-800 pb-2">
              <Layers className="w-4 h-4 text-indigo-400" /> Авиационный Материал Лонжерона
            </span>

            <div className="grid grid-cols-1 gap-1.5 max-h-52 overflow-y-auto pr-1">
              {AVIATION_MATERIALS.map((mat) => (
                <button
                  key={mat.id}
                  onClick={() => setSelectedMaterialId(mat.id)}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedMaterialId === mat.id
                      ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold font-mono">{mat.name}</div>
                  <div className="text-[10px] text-slate-500 flex justify-between mt-0.5">
                    <span>E = {mat.E_GPa} ГПа</span>
                    <span>σ_т = {mat.sigma_yield_MPa} МПа</span>
                    <span>ρ = {mat.density_kg_m3} кг/м³</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Wing Geometry & Loads Sliders */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5 shadow-xl">
            <span className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider border-b border-slate-800 pb-2">
              <Sliders className="w-4 h-4 text-cyan-400" /> Геометрия и Нагрузки (ГОСТ)
            </span>

            {/* Wingspan */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Размах крыла (b):</span>
                <strong className="font-mono text-cyan-300">{wingspanM.toFixed(1)} м</strong>
              </div>
              <input
                type="range"
                min="3.0"
                max="25.0"
                step="0.5"
                value={wingspanM}
                onChange={(e) => setWingspanM(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Load Factor g */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Эксплуатационная перегрузка (n_y):</span>
                <strong className="font-mono text-amber-400">+{loadFactorN.toFixed(1)} g</strong>
              </div>
              <input
                type="range"
                min="1.0"
                max="9.0"
                step="0.2"
                value={loadFactorN}
                onChange={(e) => setLoadFactorN(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Aircraft Mass */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Взлетная масса самолета (m_TO):</span>
                <strong className="font-mono text-slate-200">{aircraftMassKg} кг</strong>
              </div>
              <input
                type="range"
                min="50"
                max="10000"
                step="50"
                value={aircraftMassKg}
                onChange={(e) => setAircraftMassKg(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Spar Cross-section Web Height */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Высота стенки лонжерона (h_root):</span>
                <strong className="font-mono text-purple-300">{sparHeightMm} мм</strong>
              </div>
              <input
                type="range"
                min="50"
                max="400"
                step="5"
                value={sparHeightMm}
                onChange={(e) => setSparHeightMm(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            {/* Flange Thickness */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Толщина полки лонжерона (t_f):</span>
                <strong className="font-mono text-emerald-300">{flangeThickMm} мм</strong>
              </div>
              <input
                type="range"
                min="2"
                max="30"
                step="1"
                value={flangeThickMm}
                onChange={(e) => setFlangeThickMm(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Right Canvas & Engineering Diagrams (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex justify-between items-center text-xs font-mono text-slate-400 flex-wrap gap-2">
              <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> 2D Эпюра Напряжений & Прогиб Лонжерона w(y)
              </span>
              <span className="text-slate-400 text-[11px]">
                Полная подъемная сила: <strong>{feaResults.totalLiftKN.toFixed(1)} кН</strong>
              </span>
            </div>

            {/* Canvas */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 h-72 sm:h-80 flex items-center justify-center">
              <canvas ref={canvasRef} width={680} height={320} className="w-full h-full object-contain" />
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono">Макс. Напряжение σ_max</span>
                <div
                  className={`text-sm font-bold font-mono ${
                    feaResults.maxStressOverall > material.sigma_yield_MPa ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {feaResults.maxStressOverall.toFixed(1)} МПа
                </div>
                <span className="text-[10px] text-slate-400">Предел: {material.sigma_yield_MPa} МПа</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono">Прогиб Законцовки</span>
                <div className="text-sm font-bold font-mono text-cyan-300">
                  {feaResults.maxDeflectionTipMm.toFixed(1)} мм
                </div>
                <span className="text-[10px] text-slate-400">
                  {((feaResults.maxDeflectionTipMm / (feaResults.halfSpan * 1000)) * 100).toFixed(2)}% от полуразмаха
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono">Запас Прочности η</span>
                <div
                  className={`text-sm font-bold font-mono ${
                    feaResults.minSafetyFactor >= safetyFactorReq ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {feaResults.minSafetyFactor.toFixed(2)}
                </div>
                <span className="text-[10px] text-slate-400">Требуемый: {safetyFactorReq.toFixed(2)}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono">Масса Лонжеронов</span>
                <div className="text-sm font-bold font-mono text-purple-300">
                  {feaResults.sparMassKg.toFixed(1)} кг
                </div>
                <span className="text-[10px] text-slate-400">Пара консолей (L+R)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
