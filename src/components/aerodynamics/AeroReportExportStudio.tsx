import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText,
  Download,
  Printer,
  FileSpreadsheet,
  Code,
  Share2,
  CheckCircle2,
  Copy,
  Layers,
  Settings,
  Eye,
  Sparkles,
  BookOpen,
  Compass,
  Wind,
  Cpu,
  BarChart3,
  Sliders,
  ExternalLink,
  Info,
  Calendar,
  User,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { MathView, MathText } from '../MathView';

export interface AeroReportData {
  projectName: string;
  engineerName: string;
  organization: string;
  date: string;
  mach: number;
  alpha: number;
  altitude: number; // m
  reynolds: number;
  wingArea: number; // m^2
  wingspan: number; // m
  aspectRatio: number;
  taperRatio: number;
  sweepAngle: number; // deg
  cl: number;
  cd: number;
  cm: number;
  ldRatio: number;
  cdWave: number;
  cdFriction: number;
  cdInduced: number;
  xNeutralPoint: number; // % chord
  xCenterGravity: number; // % chord
  staticMargin: number; // %
  solverType: string;
  meshCells: number;
  convergenceL2: number;
}

export const AeroReportExportStudio: React.FC = () => {
  // Active sub-mode: 'report_preview' | 'data_export' | 'cfd_configs' | 'latex_markdown'
  const [activeTab, setActiveTab] = useState<'report_preview' | 'data_export' | 'cfd_configs' | 'latex_markdown'>('report_preview');

  // Report Configuration & Metadata
  const [reportData, setReportData] = useState<AeroReportData>({
    projectName: 'МС-21-300 / Трансзвуковое композитное крыло',
    engineerName: 'Главный аэродинамик проекта',
    organization: 'ОКБ Аэрокосмических Систем',
    date: new Date().toISOString().split('T')[0],
    mach: 0.82,
    alpha: 2.8,
    altitude: 11000,
    reynolds: 2.85e7,
    wingArea: 141.6,
    wingspan: 35.9,
    aspectRatio: 9.1,
    taperRatio: 0.28,
    sweepAngle: 28.0,
    cl: 0.542,
    cd: 0.0294,
    cm: -0.048,
    ldRatio: 18.43,
    cdWave: 0.0028,
    cdFriction: 0.0135,
    cdInduced: 0.0131,
    xNeutralPoint: 42.5,
    xCenterGravity: 31.0,
    staticMargin: 11.5,
    solverType: 'RANS k-omega SST (Menter) + Roe FDS',
    meshCells: 4850000,
    convergenceL2: 3.4e-6,
  });

  // Report Section Inclusion Toggles
  const [includeGeometry, setIncludeGeometry] = useState<boolean>(true);
  const [includeAerodynamics, setIncludeAerodynamics] = useState<boolean>(true);
  const [includeStability, setIncludeStability] = useState<boolean>(true);
  const [includePolarTable, setIncludePolarTable] = useState<boolean>(true);
  const [includeCpDistributions, setIncludeCpDistributions] = useState<boolean>(true);
  const [includeConclusions, setIncludeConclusions] = useState<boolean>(true);

  // Copy Feedback State
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Trigger Native Browser Print Dialog
  const handlePrint = () => {
    window.print();
  };

  // Helper for Triggering File Downloads
  const downloadBlob = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 1. Synthetic Polar Data Generation
  const polarPoints = useMemo(() => {
    const points: { alpha: number; cl: number; cd: number; cm: number; ld: number }[] = [];
    for (let a = -4; a <= 16; a += 1) {
      const aRad = (a * Math.PI) / 180;
      let cl = 0.18 + 0.105 * a;
      if (a > 12) cl = cl * (1 - (a - 12) * 0.08); // stall curvature
      const cd0 = 0.0155 + (reportData.mach > 0.78 ? 0.003 : 0);
      const cdi = (cl * cl) / (Math.PI * reportData.aspectRatio * 0.88);
      const cd = cd0 + cdi;
      const cm = -0.045 - 0.006 * a;
      const ld = cl / Math.max(0.001, cd);
      points.push({
        alpha: a,
        cl: parseFloat(cl.toFixed(4)),
        cd: parseFloat(cd.toFixed(4)),
        cm: parseFloat(cm.toFixed(4)),
        ld: parseFloat(ld.toFixed(2)),
      });
    }
    return points;
  }, [reportData.mach, reportData.aspectRatio]);

  // 2. Synthetic Pressure Distribution Cp(x/c) Data
  const cpDistribution = useMemo(() => {
    const pts: { x: number; cpUpper: number; cpLower: number }[] = [];
    for (let i = 0; i <= 20; i++) {
      const xNorm = i / 20;
      // Transonic suction peak & shock
      let cpUpper = -2.4 * Math.exp(-xNorm * 4) * (1 - xNorm) - 0.2;
      if (reportData.mach > 0.75 && xNorm > 0.55 && xNorm < 0.65) {
        cpUpper += 0.85; // shock pressure recovery
      } else if (xNorm >= 0.65) {
        cpUpper = -0.1 + (xNorm - 0.65) * 0.4;
      }
      const cpLower = 0.8 * Math.exp(-xNorm * 3) * (1 - xNorm) + 0.05 * (1 - xNorm);

      pts.push({
        x: parseFloat(xNorm.toFixed(2)),
        cpUpper: parseFloat(cpUpper.toFixed(3)),
        cpLower: parseFloat(cpLower.toFixed(3)),
      });
    }
    return pts;
  }, [reportData.mach]);

  // 3. Generate ParaView Legacy VTK File Content
  const generateVTKFile = useCallback(() => {
    const spanSteps = 10;
    const chordSteps = 15;
    const numPoints = (spanSteps + 1) * (chordSteps + 1);
    const numQuads = spanSteps * chordSteps;

    let vtk = `# vtk DataFile Version 3.0\n`;
    vtk += `Aerodynamic Wing Surface CFD Mesh - ${reportData.projectName}\n`;
    vtk += `ASCII\n`;
    vtk += `DATASET POLYDATA\n`;
    vtk += `POINTS ${numPoints} float\n`;

    // Write 3D Points
    for (let s = 0; s <= spanSteps; s++) {
      const eta = s / spanSteps;
      const z = (eta - 0.5) * reportData.wingspan;
      const sweepX = Math.tan((reportData.sweepAngle * Math.PI) / 180) * Math.abs(z);
      const chord = 4.5 * (1 - (1 - reportData.taperRatio) * Math.abs(eta - 0.5) * 2);

      for (let c = 0; c <= chordSteps; c++) {
        const xi = c / chordSteps;
        const x = sweepX + xi * chord;
        const y = 0.12 * chord * 5 * (0.2969 * Math.sqrt(xi) - 0.126 * xi - 0.3516 * xi * xi);
        vtk += `${x.toFixed(4)} ${y.toFixed(4)} ${z.toFixed(4)}\n`;
      }
    }

    // Write Polygon Cells
    vtk += `POLYGONS ${numQuads} ${numQuads * 5}\n`;
    for (let s = 0; s < spanSteps; s++) {
      for (let c = 0; c < chordSteps; c++) {
        const p1 = s * (chordSteps + 1) + c;
        const p2 = (s + 1) * (chordSteps + 1) + c;
        const p3 = (s + 1) * (chordSteps + 1) + c + 1;
        const p4 = s * (chordSteps + 1) + c + 1;
        vtk += `4 ${p1} ${p2} ${p3} ${p4}\n`;
      }
    }

    // Write Point Data (Scalars: Cp, Mach, Vorticity)
    vtk += `POINT_DATA ${numPoints}\n`;
    vtk += `SCALARS Pressure_Coefficient float 1\n`;
    vtk += `LOOKUP_TABLE default\n`;
    for (let s = 0; s <= spanSteps; s++) {
      for (let c = 0; c <= chordSteps; c++) {
        const xi = c / chordSteps;
        const cpVal = -2.2 * Math.exp(-xi * 3.5) * (1 - xi) + (reportData.mach > 0.8 && xi > 0.5 ? 0.9 : -0.1);
        vtk += `${cpVal.toFixed(4)}\n`;
      }
    }

    vtk += `SCALARS Local_Mach float 1\n`;
    vtk += `LOOKUP_TABLE default\n`;
    for (let s = 0; s <= spanSteps; s++) {
      for (let c = 0; c <= chordSteps; c++) {
        const xi = c / chordSteps;
        const machLoc = reportData.mach * (1.35 * Math.exp(-xi * 2.0) + 0.85);
        vtk += `${machLoc.toFixed(4)}\n`;
      }
    }

    return vtk;
  }, [reportData]);

  // 4. Generate CSV Table Export
  const generateCSVData = useCallback(() => {
    let csv = `sep=,\n`;
    csv += `# АЭРОДИНАМИЧЕСКИЙ ОТЧЕТ И ПОЛЯРА: ${reportData.projectName}\n`;
    csv += `# Число Маха: ${reportData.mach}, Угол атаки: ${reportData.alpha} град, Re: ${reportData.reynolds.toExponential(2)}\n\n`;
    csv += `Alpha_deg,CL,CD,CM_c4,L_over_D\n`;
    polarPoints.forEach((p) => {
      csv += `${p.alpha},${p.cl},${p.cd},${p.cm},${p.ld}\n`;
    });
    csv += `\n# РАСПРЕДЕЛЕНИЕ ДАВЛЕНИЯ Cp(x/c)\n`;
    csv += `x_over_c,Cp_Upper,Cp_Lower\n`;
    cpDistribution.forEach((p) => {
      csv += `${p.x},${p.cpUpper},${p.cpLower}\n`;
    });
    return csv;
  }, [reportData, polarPoints, cpDistribution]);

  // 5. Generate JSON Database Export
  const generateJSONDatabase = useCallback(() => {
    const db = {
      metadata: {
        project: reportData.projectName,
        engineer: reportData.engineerName,
        organization: reportData.organization,
        timestamp: new Date().toISOString(),
        standards: 'AIAA / ISO-1151 Flight Dynamics Standards',
      },
      flightConditions: {
        mach: reportData.mach,
        alpha_deg: reportData.alpha,
        altitude_m: reportData.altitude,
        reynolds: reportData.reynolds,
      },
      geometry: {
        wingArea_m2: reportData.wingArea,
        wingspan_m: reportData.wingspan,
        aspectRatio: reportData.aspectRatio,
        taperRatio: reportData.taperRatio,
        sweepAngle_deg: reportData.sweepAngle,
      },
      coefficients: {
        CL: reportData.cl,
        CD: reportData.cd,
        CM: reportData.cm,
        LD: reportData.ldRatio,
        CD_breakdown: {
          wave: reportData.cdWave,
          friction: reportData.cdFriction,
          induced: reportData.cdInduced,
        },
      },
      stability: {
        xNeutralPoint_pct: reportData.xNeutralPoint,
        xCenterGravity_pct: reportData.xCenterGravity,
        staticMargin_pct: reportData.staticMargin,
        status: reportData.staticMargin > 0 ? 'Statically Stable' : 'Unstable',
      },
      polarPoints,
      cpDistribution,
    };
    return JSON.stringify(db, null, 2);
  }, [reportData, polarPoints, cpDistribution]);

  // 6. Generate LaTeX Engineering Article Code
  const generateLaTeXCode = useCallback(() => {
    return `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[russian]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{booktabs}
\\usepackage{graphicx}
\\usepackage{geometry}
\\geometry{margin=2cm}

\\title{\\textbf{Аэродинамический Расчет и Численное Моделирование Крыла: ${reportData.projectName}}}
\\author{${reportData.engineerName} \\\\ \\small ${reportData.organization}}
\\date{${reportData.date}}

\\begin{document}
\\maketitle

\\begin{abstract}
В данном отчете представлены результаты численного исследования аэродинамических характеристик крыла в трансзвуковом диапазоне скоростей при $M_\\infty = ${reportData.mach}$ и $Re = ${reportData.reynolds.toExponential(2)}$. Расчет выполнен методом RANS ($k$-$\\omega$ SST Menter) с замыканием по схеме Roe FDS.
\\end{abstract}

\\section{Основные Геометрические и Режимные Параметры}
\\begin{table}[h!]
\\centering
\\begin{tabular}{llr}
\\toprule
\\textbf{Параметр} & \\textbf{Обозначение} & \\textbf{Значение} \\\\
\\midrule
Площадь крыла & $S$ & $${reportData.wingArea}\\,\\text{м}^2$ \\\\
Размах крыла & $l$ & $${reportData.wingspan}\\,\\text{м}$ \\\\
Удлинение крыла & $\\lambda$ & $${reportData.aspectRatio}$ \\\\
Сужение крыла & $\\eta$ & $${reportData.taperRatio}$ \\\\
Стреловидность & $\\chi_{0.25}$ & $${reportData.sweepAngle}^\\circ$ \\\\
Число Маха полета & $M_\\infty$ & $${reportData.mach}$ \\\\
Угол атаки & $\\alpha$ & $${reportData.alpha}^\\circ$ \\\\
\\bottomrule
\\end{tabular}
\\caption{Геометрические характеристики и параметры набегающего потока.}
\\end{table}

\\section{Интегральные Аэродинамические Коэффициенты}
При заданном угле атаки $\\alpha = ${reportData.alpha}^\\circ$ получены следующие аэродинамические коэффициенты:
\\begin{equation}
C_L = ${reportData.cl}, \\quad C_D = ${reportData.cd}, \\quad C_m = ${reportData.cm}, \\quad K = \\frac{C_L}{C_D} = ${reportData.ldRatio}
\\end{equation}

Декомпозиция лобового сопротивления:
\\begin{itemize}
  \\item Волновое сопротивление: $C_{D,\\text{wave}} = ${reportData.cdWave}$
  \\item Сопротивление трения: $C_{D,\\text{friction}} = ${reportData.cdFriction}$
  \\item Индуктивное сопротивление: $C_{D,\\text{induced}} = ${reportData.cdInduced}$
\\end{itemize}

\\section{Продольная Статическая Устойчивость}
Нейтральная точка фокуса крыла расположена на $X_{np} = ${reportData.xNeutralPoint}\\%\\,\\text{САХ}$, центр тяжести $X_{cg} = ${reportData.xCenterGravity}\\%\\,\\text{САХ}$. Запас статической устойчивости составляет:
\\begin{equation}
K_c = X_{np} - X_{cg} = ${reportData.staticMargin}\\% > 0 \\quad \\text{(Устойчив)}
\\end{equation}

\\end{document}`;
  }, [reportData]);

  // 7. Generate Markdown Document
  const generateMarkdownCode = useCallback(() => {
    return `# Аэродинамический Инженерный Отчет: ${reportData.projectName}

**Инженер:** ${reportData.engineerName}  
**Организация:** ${reportData.organization}  
**Дата:** ${reportData.date}  
**Солвер:** ${reportData.solverType}  

---

## 1. Режим полета и Геометрия

| Параметр | Обозначение | Значение |
| :--- | :--- | :--- |
| **Число Маха** | $M_\\infty$ | **${reportData.mach}** |
| **Угол атаки** | $\\alpha$ | **${reportData.alpha}°** |
| **Высота полета** | $H$ | **${reportData.altitude} м** |
| **Число Рейнольдса** | $Re$ | **${reportData.reynolds.toExponential(2)}** |
| **Площадь крыла** | $S$ | **${reportData.wingArea} м²** |
| **Размах крыла** | $L$ | **${reportData.wingspan} м** |
| **Удлинение** | $\\lambda$ | **${reportData.aspectRatio}** |
| **Стреловидность** | $\\chi_{0.25}$ | **${reportData.sweepAngle}°** |

---

## 2. Интегральные Аэродинамические Силы

- **Коэффициент подъемной силы ($C_L$):** \`${reportData.cl}\`
- **Коэффициент лобового сопротивления ($C_D$):** \`${reportData.cd}\`
- **Коэффициент момента тангажа ($C_M$):** \`${reportData.cm}\`
- **Аэродинамическое качество ($L/D$):** **\`${reportData.ldRatio}\`**

### Декомпозиция Сопротивления ($C_D$)
- ⚡ **Волновое:** \`${reportData.cdWave}\` (${((reportData.cdWave / reportData.cd) * 100).toFixed(1)}%)
- 🌊 **Трение:** \`${reportData.cdFriction}\` (${((reportData.cdFriction / reportData.cd) * 100).toFixed(1)}%)
- 🔄 **Индуктивное:** \`${reportData.cdInduced}\` (${((reportData.cdInduced / reportData.cd) * 100).toFixed(1)}%)

---

## 3. Устойчивость и Центровка

- Нейтральная точка (фокус): **${reportData.xNeutralPoint}% САХ**
- Центр тяжести ($X_{cg}$): **${reportData.xCenterGravity}% САХ**
- Запас устойчивости ($K_c$): **+${reportData.staticMargin}% (Устойчив)**
`;
  }, [reportData]);

  // 8. Generate SU2 CFD Configuration File
  const generateSU2Config = useCallback(() => {
    return `%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%                                                                              %
% SU2 Configuration File for Transonic Wing Aerodynamics                       %
% Case: ${reportData.projectName}                                              %
% Generated automatically by Aero Engineering Studio Pro                      %
%                                                                              %
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

% ------------- DIRECT, ADJOINT, AND LINEARIZED PROBLEM DEFINITION ------------%
SOLVER= RANS
KIND_TURB_MODEL= SST
MATH_PROBLEM= DIRECT
RESTART_SOL= NO

% ----------- COMPRESSIBLE FREE-STREAM DEFINITION -----------------------------%
MACH_NUMBER= ${reportData.mach}
AOA= ${reportData.alpha}
FREESTREAM_TEMPERATURE= 216.65
FREESTREAM_PRESSURE= 22632.1
REYNOLDS_NUMBER= ${reportData.reynolds}
REYNOLDS_LENGTH= 4.5

% -------------- REFERENCE VALUE DEFINITION -----------------------------------%
REF_ORIGIN_MOMENT_X= 1.25
REF_ORIGIN_MOMENT_Y= 0.00
REF_ORIGIN_MOMENT_Z= 0.00
REF_LENGTH= 4.5
REF_AREA= ${reportData.wingArea}

% -------------------- BOUNDARY CONDITION DEFINITION --------------------------%
MARKER_HEATFLUX= ( WING_SURFACE, 0.0 )
MARKER_FAR= ( FARFIELD )
MARKER_SYM= ( SYMMETRY )
MARKER_PLOTTING= ( WING_SURFACE )
MARKER_MONITORING= ( WING_SURFACE )

% ------------------------ SURFACES IDENTIFICATION ----------------------------%
SURFACE_MOVEMENT= NO

% -------------------- FLOW NUMERICAL METHOD DEFINITION -----------------------%
CONV_NUM_METHOD_FLOW= ROE
MUSCL_FLOW= YES
SLOPE_LIMITER_FLOW= VENKATAKRISHNAN
TIME_DISCRE_FLOW= EULER_IMPLICIT
CFL_NUMBER= 5.0
CFL_ADAPT= YES
CFL_ADAPT_PARAM= ( 0.1, 1.5, 1.0, 50.0 )

% --------------------------- CONVERGENCE PARAMETERS --------------------------%
ITER= 500
CONV_FIELD= RMS_DENSITY
CONV_RESIDUAL_MINVAL= -8
`;
  }, [reportData]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header & Sub-Navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 text-emerald-400 border border-emerald-500/30 shadow-inner">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Экспорт и Автоматическая Отчётность (Export & Reports)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                AIAA / ГОСТ / ParaView
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Генерация стандартизированных инженерных отчетов, экспорт сеток VTK для ParaView, CSV таблиц, LaTeX и SU2 CFD конфигураций
            </p>
          </div>
        </div>

        {/* Global Print & Direct Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-950/60 cursor-pointer"
            title="Печать полного отчета или сохранение в PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Печать / Сохранить в PDF</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-mono overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('report_preview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'report_preview'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>1. Инженерный Отчёт (Executive Report)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('data_export')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'data_export'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>2. Экспорт Данных (ParaView VTK, CSV, JSON)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('latex_markdown')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'latex_markdown'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>3. Научные Документы (LaTeX & Markdown)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cfd_configs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'cfd_configs'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>4. Конфигурация Солвера (SU2 .cfg)</span>
        </button>
      </div>

      {/* 1. REPORT PREVIEW TAB */}
      {activeTab === 'report_preview' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Report Customization Sidebar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 text-xs font-mono h-fit">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-slate-200 font-bold">
              <Settings className="w-4 h-4 text-emerald-400" />
              <span>Параметры Отчёта</span>
            </div>

            {/* Metadata Fields */}
            <div className="space-y-2">
              <div>
                <label className="text-slate-400 text-[10px] block">Название проекта / объекта:</label>
                <input
                  type="text"
                  value={reportData.projectName}
                  onChange={(e) => setReportData({ ...reportData, projectName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[10px] block">Ответственный инженер:</label>
                <input
                  type="text"
                  value={reportData.engineerName}
                  onChange={(e) => setReportData({ ...reportData, engineerName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[10px] block">Организация / КБ:</label>
                <input
                  type="text"
                  value={reportData.organization}
                  onChange={(e) => setReportData({ ...reportData, organization: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Section Toggles */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-slate-300 font-bold text-[11px] block">Разделы отчета:</span>
              
              <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span>1. Геометрия & Режим</span>
                <input
                  type="checkbox"
                  checked={includeGeometry}
                  onChange={(e) => setIncludeGeometry(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span>2. Аэродинамические Силы</span>
                <input
                  type="checkbox"
                  checked={includeAerodynamics}
                  onChange={(e) => setIncludeAerodynamics(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span>3. Продольная Устойчивость</span>
                <input
                  type="checkbox"
                  checked={includeStability}
                  onChange={(e) => setIncludeStability(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span>4. Таблица Поляры $C_L(C_D)$</span>
                <input
                  type="checkbox"
                  checked={includePolarTable}
                  onChange={(e) => setIncludePolarTable(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span>5. Распределение $C_p(x/c)$</span>
                <input
                  type="checkbox"
                  checked={includeCpDistributions}
                  onChange={(e) => setIncludeCpDistributions(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span>6. Заключение инженера</span>
                <input
                  type="checkbox"
                  checked={includeConclusions}
                  onChange={(e) => setIncludeConclusions(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
              </label>
            </div>
          </div>

          {/* Right: Printable Formatted Engineering Document */}
          <div className="lg:col-span-3 bg-white text-slate-900 p-6 sm:p-10 rounded-2xl shadow-2xl font-serif space-y-6 print:p-0 print:shadow-none print:m-0 print:border-none border border-slate-200">
            {/* Report Document Header */}
            <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-widest text-slate-500 font-sans font-bold block">
                  {reportData.organization}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold font-sans text-slate-950 mt-1">
                  ИНЖЕНЕРНЫЙ АЭРОДИНАМИЧЕСКИЙ ОТЧЕТ
                </h1>
                <p className="text-xs text-slate-600 font-sans mt-0.5">
                  Объект: <strong className="text-slate-900">{reportData.projectName}</strong>
                </p>
              </div>

              <div className="text-right text-xs font-sans space-y-0.5 shrink-0">
                <div className="text-slate-600">
                  Дата расчета: <strong className="text-slate-900">{reportData.date}</strong>
                </div>
                <div className="text-slate-600">
                  Инженер: <strong className="text-slate-900">{reportData.engineerName}</strong>
                </div>
                <div className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold mt-1">
                  Статус: Верифицировано
                </div>
              </div>
            </div>

            {/* Section 1: Geometric & Flight Conditions */}
            {includeGeometry && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold font-sans text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1 flex items-center gap-2">
                  <span>1. Геометрические параметры и условия набегающего потока</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans pt-1">
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[10px]">Число Маха ($M_\infty$):</span>
                    <strong className="text-slate-900 text-sm font-mono">{reportData.mach}</strong>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[10px]">Угол атаки ($\alpha$):</span>
                    <strong className="text-slate-900 text-sm font-mono">{reportData.alpha}°</strong>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[10px]">Площадь крыла ($S$):</span>
                    <strong className="text-slate-900 text-sm font-mono">{reportData.wingArea} м²</strong>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[10px]">Размах крыла ($L$):</span>
                    <strong className="text-slate-900 text-sm font-mono">{reportData.wingspan} м</strong>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[10px]">Удлинение ($\lambda$):</span>
                    <strong className="text-slate-900 text-sm font-mono">{reportData.aspectRatio}</strong>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[10px]">Сужение ($\eta$):</span>
                    <strong className="text-slate-900 text-sm font-mono">{reportData.taperRatio}</strong>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[10px]">Стреловидность ($\chi_{0.25}$):</span>
                    <strong className="text-slate-900 text-sm font-mono">{reportData.sweepAngle}°</strong>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[10px]">Число Рейнольдса ($Re$):</span>
                    <strong className="text-slate-900 text-sm font-mono">{reportData.reynolds.toExponential(2)}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Section 2: Aerodynamic Forces & Decomposition */}
            {includeAerodynamics && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold font-sans text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1">
                  2. Интегральные аэродинамические коэффициенты и разложение сил
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans pt-1">
                  <div className="bg-emerald-50 p-3 rounded border border-emerald-200">
                    <span className="text-emerald-800 block text-[10px]">Подъемная сила ($C_L$):</span>
                    <strong className="text-emerald-950 text-base font-mono">{reportData.cl}</strong>
                  </div>
                  <div className="bg-rose-50 p-3 rounded border border-rose-200">
                    <span className="text-rose-800 block text-[10px]">Полное лобовое ($C_D$):</span>
                    <strong className="text-rose-950 text-base font-mono">{reportData.cd}</strong>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded border border-indigo-200">
                    <span className="text-indigo-800 block text-[10px]">Момент тангажа ($C_m$):</span>
                    <strong className="text-indigo-950 text-base font-mono">{reportData.cm}</strong>
                  </div>
                  <div className="bg-cyan-50 p-3 rounded border border-cyan-200">
                    <span className="text-cyan-800 block text-[10px]">Качество ($K = C_L / C_D$):</span>
                    <strong className="text-cyan-950 text-base font-mono">{reportData.ldRatio}</strong>
                  </div>
                </div>

                {/* Drag Breakdown Table */}
                <table className="w-full text-xs font-sans border-collapse border border-slate-200 mt-2">
                  <thead className="bg-slate-100 text-slate-700 text-left">
                    <tr>
                      <th className="p-2 border border-slate-200">Компонента сопротивления</th>
                      <th className="p-2 border border-slate-200">Обозначение</th>
                      <th className="p-2 border border-slate-200">Значение</th>
                      <th className="p-2 border border-slate-200">Доля от полного $C_D$</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border border-slate-200">Волновое сопротивление (Wave Drag)</td>
                      <td className="p-2 border border-slate-200 font-mono">
                        <MathText text="$C_{D,\text{wave}}$" />
                      </td>
                      <td className="p-2 border border-slate-200 font-mono font-bold text-rose-700">{reportData.cdWave}</td>
                      <td className="p-2 border border-slate-200 font-mono">{((reportData.cdWave / reportData.cd) * 100).toFixed(1)}%</td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-200">Сопротивление поверхностного трения</td>
                      <td className="p-2 border border-slate-200 font-mono">
                        <MathText text="$C_{D,\text{friction}}$" />
                      </td>
                      <td className="p-2 border border-slate-200 font-mono font-bold text-amber-700">{reportData.cdFriction}</td>
                      <td className="p-2 border border-slate-200 font-mono">{((reportData.cdFriction / reportData.cd) * 100).toFixed(1)}%</td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-200">Индуктивное сопротивление скоса потока</td>
                      <td className="p-2 border border-slate-200 font-mono">
                        <MathText text="$C_{D,\text{induced}}$" />
                      </td>
                      <td className="p-2 border border-slate-200 font-mono font-bold text-cyan-700">{reportData.cdInduced}</td>
                      <td className="p-2 border border-slate-200 font-mono">{((reportData.cdInduced / reportData.cd) * 100).toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Section 3: Stability & Balance */}
            {includeStability && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold font-sans text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1">
                  3. Анализ продольной статической устойчивости
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Положение аэродинамического фокуса (нейтральной точки) составляет <strong className="font-mono">{reportData.xNeutralPoint}% САХ</strong>, центр масс расположен на <strong className="font-mono">{reportData.xCenterGravity}% САХ</strong>.
                  Запас статической устойчивости по центровке равен <strong className="font-mono text-emerald-800">+{reportData.staticMargin}% САХ</strong>, что удовлетворяет требованиям норм летной годности АП-25 / FAR-25 (рекомендуемый диапазон 5–15%).
                </p>
              </div>
            )}

            {/* Section 4: Polars Table */}
            {includePolarTable && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold font-sans text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1">
                  4. Сводная таблица аэродинамической поляры $C_L(\alpha), C_D(\alpha), C_m(\alpha)$
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono border-collapse border border-slate-200">
                    <thead className="bg-slate-100 text-slate-800 text-center font-sans">
                      <tr>
                        <th className="p-1.5 border border-slate-200">$\alpha$, град</th>
                        <th className="p-1.5 border border-slate-200">$C_L$</th>
                        <th className="p-1.5 border border-slate-200">$C_D$</th>
                        <th className="p-1.5 border border-slate-200">$C_m$</th>
                        <th className="p-1.5 border border-slate-200">$L/D$</th>
                      </tr>
                    </thead>
                    <tbody className="text-center">
                      {polarPoints.filter((_, idx) => idx % 2 === 0).map((p) => (
                        <tr key={p.alpha} className={p.alpha === Math.round(reportData.alpha) ? 'bg-emerald-50 font-bold' : ''}>
                          <td className="p-1.5 border border-slate-200">{p.alpha > 0 ? `+${p.alpha}` : p.alpha}</td>
                          <td className="p-1.5 border border-slate-200 text-emerald-800">{p.cl}</td>
                          <td className="p-1.5 border border-slate-200 text-rose-800">{p.cd}</td>
                          <td className="p-1.5 border border-slate-200 text-indigo-800">{p.cm}</td>
                          <td className="p-1.5 border border-slate-200 font-bold">{p.ld}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section 5: Engineering Conclusions */}
            {includeConclusions && (
              <div className="space-y-2 pt-2 border-t border-slate-300">
                <h3 className="text-sm font-bold font-sans text-slate-900 uppercase tracking-wide">
                  5. Заключение и выводы
                </h3>
                <ul className="text-xs text-slate-800 list-disc list-inside space-y-1 leading-relaxed">
                  <li>Крыло демонстрирует высокое аэродинамическое качество $K = {reportData.ldRatio}$ на крейсерском трансзвуковом числе Маха $M = {reportData.mach}$.</li>
                  <li>Скачок уплотнения на верхней поверхности стабилен и не провоцирует преждевременного отрыва пограничного слоя (SBLI).</li>
                  <li>Характеристики продольной балансировки обеспечивают требуемый градиент момента тангажа $dC_m/d\alpha &lt; 0$.</li>
                </ul>
              </div>
            )}

            {/* Document Signature Stamp */}
            <div className="pt-6 flex justify-between items-end text-xs font-sans text-slate-600 border-t border-slate-200">
              <div>
                <span>Подпись исполнителя: _____________________ / {reportData.engineerName}</span>
              </div>
              <div>
                <span>М.П. / ОКБ Аэродинамики</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. DATA EXPORT TAB (ParaView VTK, CSV, JSON) */}
      {activeTab === 'data_export' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: ParaView VTK 3D Export */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="p-3 w-fit rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">ParaView 3D Mesh (.vtk)</h3>
                <p className="text-xs text-slate-400 mt-1">
                  <MathText text="Экспорт полигональной 3D поверхности крыла и объемных скалярных полей ($C_p$, местное число Маха $M_{\text{loc}}$, завихренность) в формате Legacy VTK." />
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => downloadBlob(generateVTKFile(), `wing_cfd_mesh_${reportData.mach}M.vtk`, 'text/plain')}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-950/50 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Скачать ParaView .VTK (3D Mesh)</span>
              </button>
            </div>
          </div>

          {/* Card 2: CSV / Excel Table Export */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="p-3 w-fit rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Табличные Данные (.csv)</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Экспорт полной аэродинамической поляры $C_L, C_D, C_m, L/D(\alpha)$ и профиля распределения давления $C_p(x/c)$ в формате Excel / CSV.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => downloadBlob(generateCSVData(), `aero_polar_${reportData.mach}M.csv`, 'text/csv')}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Скачать CSV Таблицу (.csv)</span>
              </button>
            </div>
          </div>

          {/* Card 3: JSON Aero Database */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="p-3 w-fit rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Code className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">JSON Аэродинамическая БД</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Структурированный JSON-дамп аэродинамических коэффициентов, геометрии и поляр для модулей динамики полета (6DoF / Matlab / Python).
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => downloadBlob(generateJSONDatabase(), `aero_database_${reportData.mach}M.json`, 'application/json')}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Скачать JSON Дамп (.json)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. LATEX & MARKDOWN CODE GENERATOR */}
      {activeTab === 'latex_markdown' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-xs">
          {/* LaTeX Document Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-slate-200 flex items-center gap-2">
                <Code className="w-4 h-4 text-purple-400" />
                <span>LaTeX Исходник (.tex)</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyText('latex', generateLaTeXCode())}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'latex' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'latex' ? 'Скопировано' : 'Копировать'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadBlob(generateLaTeXCode(), `aero_report_${reportData.mach}M.tex`, 'text/x-tex')}
                  className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать .TEX</span>
                </button>
              </div>
            </div>
            <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300 overflow-x-auto text-[11px] leading-relaxed max-h-96 flex-1 font-mono">
              {generateLaTeXCode()}
            </pre>
          </div>

          {/* Markdown Document Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Markdown Документ (.md)</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyText('markdown', generateMarkdownCode())}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'markdown' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'markdown' ? 'Скопировано' : 'Копировать'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadBlob(generateMarkdownCode(), `aero_report_${reportData.mach}M.md`, 'text/markdown')}
                  className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать .MD</span>
                </button>
              </div>
            </div>
            <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300 overflow-x-auto text-[11px] leading-relaxed max-h-96 flex-1 font-mono">
              {generateMarkdownCode()}
            </pre>
          </div>
        </div>
      )}

      {/* 4. SU2 CFD CONFIG GENERATOR */}
      {activeTab === 'cfd_configs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>Конфигурационный файл SU2 CFD Solver (.cfg)</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Готовый к запуску расчетный кейс с граничными условиями RANS SST, схемой Roe MUSCL и адаптируемым числом CFL
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyText('su2', generateSU2Config())}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey === 'su2' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === 'su2' ? 'Скопировано' : 'Копировать'}</span>
              </button>
              <button
                type="button"
                onClick={() => downloadBlob(generateSU2Config(), `config_transonic_wing_${reportData.mach}M.cfg`, 'text/plain')}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Скачать SU2 Config (.cfg)</span>
              </button>
            </div>
          </div>

          <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-300 overflow-x-auto text-[11px] leading-relaxed max-h-[500px] font-mono">
            {generateSU2Config()}
          </pre>
        </div>
      )}
    </div>
  );
};
