import React, { useState, useMemo } from 'react';
import {
  FileText,
  FileCode2,
  Download,
  Printer,
  Share2,
  DollarSign,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Sparkles,
  Package,
  Cpu,
  Zap,
  Radio,
  Plane,
  TrendingDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export interface BOMItem {
  id: string;
  category: 'airframe' | 'propulsion' | 'avionics' | 'power' | 'payload' | 'hardware';
  name: string;
  partNumber: string;
  qty: number;
  unitCostUSD: number;
  supplier: string;
  weight_g: number;
}

export const UAVAutomatedReportBOMModule: React.FC = () => {
  // Production batch quantity
  const [batchQty, setBatchQty] = useState<number>(50); // 1 to 1000 units
  const [uavModelName, setUavModelName] = useState<string>('AeroEagle-2400 Recon Pro');
  const [leadEngineer, setLeadEngineer] = useState<string>('К. Кабаев');
  const [complianceStandard, setComplianceStandard] = useState<'GOST_V' | 'MIL_STD_1797' | 'STANAG_4671'>('STANAG_4671');
  const [activeTab, setActiveTab] = useState<'report_dossier' | 'bom_cost_estimator' | 'latex_source'>('report_dossier');

  // Interactive BOM Items
  const [bomItems, setBomItems] = useState<BOMItem[]>([
    { id: '1', category: 'airframe', name: 'Карбоновый фюзеляж + мотогондолы', partNumber: 'AE-CF-BODY-01', qty: 1, unitCostUSD: 420, supplier: 'AeroCarbon Composite', weight_g: 1450 },
    { id: '2', category: 'airframe', name: 'Консоли крыла (размах 2.4м, NACA 2412)', partNumber: 'AE-WING-240-L/R', qty: 2, unitCostUSD: 280, supplier: 'AeroCarbon Composite', weight_g: 1100 },
    { id: '3', category: 'propulsion', name: 'Бесколлекторный мотор T-Motor AT4120 500KV', partNumber: 'TM-AT4120-KV500', qty: 2, unitCostUSD: 115, supplier: 'T-Motor Official', weight_g: 310 },
    { id: '4', category: 'propulsion', name: 'Регулятор скорости ESC Flame 80A 6-12S', partNumber: 'TM-ESC-FLAME-80A', qty: 2, unitCostUSD: 85, supplier: 'T-Motor Official', weight_g: 85 },
    { id: '5', category: 'propulsion', name: 'Складные карбоновые винты 15x5.5" (пара)', partNumber: 'TM-PROP-1555-CF', qty: 2, unitCostUSD: 45, supplier: 'T-Motor Official', weight_g: 48 },
    { id: '6', category: 'avionics', name: 'Полетный контроллер Pixhawk Cube Orange+ / EKF3', partNumber: 'CUBE-ORANGE-PLUS', qty: 1, unitCostUSD: 390, supplier: 'Hex Technology', weight_g: 75 },
    { id: '7', category: 'avionics', name: 'GNSS Модуль Here3+ (RTK Dual Band)', partNumber: 'HERE-3-PLUS-GPS', qty: 1, unitCostUSD: 195, supplier: 'Hex Technology', weight_g: 49 },
    { id: '8', category: 'avionics', name: 'Цифровой модем телеметрии & HD видео 2.4/5.8GHz', partNumber: 'SIYI-HM30-AIR', qty: 1, unitCostUSD: 310, supplier: 'SIYI Tech', weight_g: 145 },
    { id: '9', category: 'power', name: 'Аккумуляторная сборка Li-Ion 6S6P 21700 Molicel P42A', partNumber: 'BAT-6S6P-25AH', qty: 1, unitCostUSD: 260, supplier: 'In-House Assembly', weight_g: 2650 },
    { id: '10', category: 'payload', name: 'Двухосевой гиростабилизированный подвес EO/IR 4K 30x', partNumber: 'GIMBAL-EOIR-30X-PRO', qty: 1, unitCostUSD: 1850, supplier: 'Optics Aero Pro', weight_g: 680 },
    { id: '11', category: 'hardware', name: 'Цифровые сервоприводы с металлическим редуктором KST', partNumber: 'KST-DS215MG', qty: 4, unitCostUSD: 38, supplier: 'KST Servo', weight_g: 22 },
  ]);

  // Derived Cost Computations
  const singleUnitBOMCost = useMemo(() => {
    return bomItems.reduce((sum, item) => sum + item.unitCostUSD * item.qty, 0);
  }, [bomItems]);

  const totalEmptyWeight_g = useMemo(() => {
    return bomItems.reduce((sum, item) => sum + item.weight_g * item.qty, 0);
  }, [bomItems]);

  // Batch Economy of Scale Discount Curve
  const batchDiscountFactor = useMemo(() => {
    if (batchQty === 1) return 1.0;
    if (batchQty <= 10) return 0.92;
    if (batchQty <= 50) return 0.84;
    if (batchQty <= 200) return 0.76;
    return 0.68; // 1000 pcs: -32% discount
  }, [batchQty]);

  const unitCostInBatch = singleUnitBOMCost * batchDiscountFactor;
  const totalBatchCostUSD = unitCostInBatch * batchQty;

  // Cost by Category Pie Chart Data
  const categoryCostData = useMemo(() => {
    const map: Record<string, number> = {};
    bomItems.forEach((item) => {
      map[item.category] = (map[item.category] || 0) + item.unitCostUSD * item.qty;
    });
    return Object.keys(map).map((cat) => ({
      name: cat === 'payload' ? 'Полезная нагрузка' : cat === 'airframe' ? 'Планер' : cat === 'avionics' ? 'Авионика' : cat === 'propulsion' ? 'ВМГ' : cat === 'power' ? 'Питание' : 'Фурнитура',
      value: map[cat],
    }));
  }, [bomItems]);

  const PIE_COLORS = ['#38bdf8', '#818cf8', '#34d399', '#f59e0b', '#ec4899', '#94a3b8'];

  // LaTeX Report Source Generator
  const latexSourceCode = useMemo(() => {
    return `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[russian,english]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{graphicx,booktabs,hyperref}
\\usepackage{geometry}
\\geometry{top=2cm,bottom=2cm,left=2.5cm,right=2cm}

\\title{\\textbf{Научно-Технический Отчет и Паспорт Летной Годности БПЛА \\\\ \\large ${uavModelName}}}
\\author{Инженерный отдел: ${leadEngineer} \\\\ Соответствие стандарту: \\texttt{${complianceStandard}}}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Введение и Назначение Комплекса}
Настоящий отчет содержит результаты аэродинамического, прочностного и весового расчета беспилотной авиационной системы (БАС) \\textbf{${uavModelName}}.
Комплекс спроектирован по многодисциплинарной оптимизационной схеме MDO с размахом крыла 2.40 м и максимальной взлетной массой MTOW 8.50 кг.

\\section{Сводные Летно-Технические Характеристики (ЛТХ)}
\\begin{table}[h!]
\\centering
\\begin{tabular}{llr}
\\toprule
\\textbf{Параметр} & \\textbf{Обозначение} & \\textbf{Значение} \\\\
\\midrule
Размах крыла & $L$ & 2.40 м \\\\
Площадь крыла & $S$ & 0.648 м$^2$ \\\\
Удлинение крыла & $\\lambda$ & 8.89 \\\\
Аэродинамический профиль & Airfoil & NACA 2412 \\\\
Максимальное качество & $(L/D)_{\\max}$ & 18.6 \\\\
Крейсерская скорость & $V_{\\text{cruise}}$ & 95.0 км/ч \\\\
Скорость сваливания & $V_{\\text{stall}}$ & 42.0 км/ч \\\\
Продолжительность полета & $T_{\\text{endurance}}$ & 210 мин \\\\
Радиус действия & $R_{\\text{action}}$ & 180 км \\\\
\\bottomrule
\\end{tabular}
\\caption{Расчетные летно-технические характеристики БПЛА}
\\end{table}

\\section{Спецификация Оборудования и Себестоимость (BOM)}
Суммарная стоимость покупных комплектующих на 1 борт при серии ${batchQty} шт. составляет \\textbf{\\$${unitCostInBatch.toFixed(0)}} (общая сумма контракта: \\$${totalBatchCostUSD.toLocaleString()}).

\\end{document}
`;
  }, [uavModelName, leadEngineer, complianceStandard, batchQty, unitCostInBatch, totalBatchCostUSD]);

  return (
    <div className="space-y-5 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Направление D: Автоматическая Генерация Комплексных Отчетов & BOM
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Фичи #95, #96
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Верстка научно-технического досье БПЛА по ГОСТ/MIL-STD, экспорт в PDF/LaTeX и интерактивная смета материалов (Bill of Materials) для серии 1..1000 шт.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-bold text-xs hover:from-amber-300 hover:to-orange-400 transition-all cursor-pointer shadow-lg shadow-amber-950/40"
          >
            <Printer className="w-4 h-4" />
            <span>Печать PDF Отчета</span>
          </button>
        </div>
      </div>

      {/* Mode Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 font-mono text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('report_dossier')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'report_dossier'
              ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md font-bold'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>1. Паспорт Летной Годности (Dossier)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bom_cost_estimator')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'bom_cost_estimator'
              ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md font-bold'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>2. Ведомость Материалов BOM & Себестоимость</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('latex_source')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'latex_source'
              ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md font-bold'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode2 className="w-4 h-4" />
          <span>3. Исходный Код LaTeX (.tex)</span>
        </button>
      </div>

      {/* TAB 1: REPORT DOSSIER */}
      {activeTab === 'report_dossier' && (
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-5 font-sans">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">{uavModelName}</h3>
              <p className="text-xs text-slate-400">
                Официальный паспорт научно-исследовательских и опытно-конструкторских работ (НИОКР)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
                Стандарт: {complianceStandard}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px]">Макс. качество (L/D):</span>
              <div className="text-sm font-bold text-cyan-400">18.6 единиц</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px]">Взлетная масса MTOW:</span>
              <div className="text-sm font-bold text-white">8.50 кг</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px]">Дальность действия:</span>
              <div className="text-sm font-bold text-emerald-400">180 км</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px]">Время барражирования:</span>
              <div className="text-sm font-bold text-amber-400">210 минут</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BOM COST ESTIMATOR */}
      {activeTab === 'bom_cost_estimator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start font-mono">
          <div className="lg:col-span-8 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs text-white font-bold">
                <Package className="w-4 h-4 text-amber-400" />
                <span>Ведомость Материалов и Покупных Изделий (BOM)</span>
              </div>
              <span className="text-xs text-amber-300 font-bold">
                Себестоимость 1 шт: ${unitCostInBatch.toFixed(0)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-2">Наименование</th>
                    <th className="py-2">Артикул</th>
                    <th className="py-2 text-center">Кол-во</th>
                    <th className="py-2 text-right">Масса</th>
                    <th className="py-2 text-right">Цена ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {bomItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-900/60">
                      <td className="py-2 font-sans font-medium text-white">{item.name}</td>
                      <td className="py-2 text-slate-400 text-[11px]">{item.partNumber}</td>
                      <td className="py-2 text-center text-cyan-400 font-bold">{item.qty}</td>
                      <td className="py-2 text-right text-slate-300">{item.weight_g * item.qty} г</td>
                      <td className="py-2 text-right text-emerald-400 font-bold">${item.unitCostUSD * item.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-xs text-white font-bold border-b border-slate-800 pb-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Объем Производственной Серии</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Размер партии (тираж):</span>
                <span className="text-amber-400 font-bold">{batchQty} шт</span>
              </div>
              <input
                type="range"
                min={1}
                max={500}
                step={1}
                value={batchQty}
                onChange={(e) => setBatchQty(parseInt(e.target.value, 10))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Скидка за объем серии:</span>
                <span className="text-emerald-400 font-bold">-{Math.round((1 - batchDiscountFactor) * 100)}%</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Себестоимость 1 борта:</span>
                <span className="text-white font-bold">${unitCostInBatch.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-2">
                <span>Бюджет всей партии:</span>
                <span className="text-amber-400 font-bold text-sm">${totalBatchCostUSD.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LATEX SOURCE CODE */}
      {activeTab === 'latex_source' && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-xs text-white font-bold">
              <FileCode2 className="w-4 h-4 text-amber-400" />
              <span>LaTeX Исходный Текст (.tex) для Научных Публикаций</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([latexSourceCode], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'uav_technical_dossier.tex';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Скачать .tex</span>
            </button>
          </div>

          <pre className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-amber-300 overflow-x-auto max-h-[380px] leading-relaxed">
            {latexSourceCode}
          </pre>
        </div>
      )}
    </div>
  );
};
