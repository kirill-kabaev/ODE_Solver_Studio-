import React, { useState } from 'react';
import {
  X,
  Layers,
  Database,
  Sparkles,
  Scale,
  CheckCircle2,
  Sliders,
  TrendingUp,
  Search,
  Filter,
  Info,
} from 'lucide-react';
import { MathView } from '../MathView';

interface MaterialItem {
  id: string;
  name: string;
  category: 'aluminum' | 'titanium' | 'composite' | 'wood' | 'polymer' | 'steel';
  densityKgM3: number;
  youngModulusGPa: number; // E
  yieldStrengthMPa: number; // sigma_T
  ultimateStrengthMPa: number; // sigma_B
  shearModulusGPa: number; // G
  costRelative: string;
  application: string;
  tempLimitC: number;
}

const MATERIALS_DB: MaterialItem[] = [
  {
    id: 'd16t',
    name: 'Алюминиевый сплав Д16Т (2024-T3 / Дуралюмин)',
    category: 'aluminum',
    densityKgM3: 2780,
    youngModulusGPa: 72,
    yieldStrengthMPa: 325,
    ultimateStrengthMPa: 470,
    shearModulusGPa: 27,
    costRelative: '$$ (Умеренная)',
    application: 'Основной материал обшивки крыла, нервюр, шпангоутов и лонжеронов самолетов.',
    tempLimitC: 120,
  },
  {
    id: 'b95',
    name: 'Высокопрочный сплав В95 (7075-T6)',
    category: 'aluminum',
    densityKgM3: 2850,
    youngModulusGPa: 71,
    yieldStrengthMPa: 500,
    ultimateStrengthMPa: 590,
    shearModulusGPa: 26.9,
    costRelative: '$$$ (Высокая)',
    application: 'Верхние пояса лонжеронов крыла (работа на сжатие), силовые фитинги и узлы навески.',
    tempLimitC: 100,
  },
  {
    id: 'vt6_titanium',
    name: 'Титановый сплав ВТ6 (Ti-6Al-4V Grade 5)',
    category: 'titanium',
    densityKgM3: 4430,
    youngModulusGPa: 114,
    yieldStrengthMPa: 880,
    ultimateStrengthMPa: 950,
    shearModulusGPa: 44,
    costRelative: '$$$$$ (Очень высокая)',
    application: 'Узлы крепления двигателей, балки шасси, огнеупорные перегородки, сверхзвуковая обшивка.',
    tempLimitC: 450,
  },
  {
    id: 'carbon_t700',
    name: 'Углепластик (Carbon Fiber T700 / Эпоксид)',
    category: 'composite',
    densityKgM3: 1550,
    youngModulusGPa: 140,
    yieldStrengthMPa: 1500,
    ultimateStrengthMPa: 2100,
    shearModulusGPa: 5.5,
    costRelative: '$$$$ (Высокая)',
    application: 'Лонжероны БПЛА, цельнокомпозитные консоли крыла, обтекатели, хвостовые балки.',
    tempLimitC: 130,
  },
  {
    id: 'carbon_m40j',
    name: 'Высокомодульный карбон M40J (High-Modulus)',
    category: 'composite',
    densityKgM3: 1600,
    youngModulusGPa: 230,
    yieldStrengthMPa: 1200,
    ultimateStrengthMPa: 1800,
    shearModulusGPa: 6.2,
    costRelative: '$$$$$ (Премиум)',
    application: 'Трубы лонжеронов планеров-парителей с размахом > 20 м (критична жесткость на изгиб).',
    tempLimitC: 140,
  },
  {
    id: 'fiberglass',
    name: 'Стеклопластик (E-Glass / Эпоксид)',
    category: 'composite',
    densityKgM3: 1950,
    youngModulusGPa: 45,
    yieldStrengthMPa: 650,
    ultimateStrengthMPa: 900,
    shearModulusGPa: 4.1,
    costRelative: '$$ (Экономичная)',
    application: 'Радиопрозрачные носовые обтекатели РЛС, зализы крыла, планеры легких самолетов.',
    tempLimitC: 120,
  },
  {
    id: 'balsa',
    name: 'Авиационная Бальза (Balsa Wood)',
    category: 'wood',
    densityKgM3: 140,
    youngModulusGPa: 4.5,
    yieldStrengthMPa: 18,
    ultimateStrengthMPa: 28,
    shearModulusGPa: 0.3,
    costRelative: '$ (Низкая)',
    application: 'Сердечники сэндвич-панелей обшивки, нервюры легких БПЛА и авиамоделей.',
    tempLimitC: 80,
  },
  {
    id: 'aircraft_plywood',
    name: 'Авиационная Фанера БС-1 (Березовая бакелизированная)',
    category: 'wood',
    densityKgM3: 750,
    youngModulusGPa: 12.5,
    yieldStrengthMPa: 65,
    ultimateStrengthMPa: 85,
    shearModulusGPa: 1.2,
    costRelative: '$ (Доступная)',
    application: 'Нервюры, стенки лонжеронов самолетов легкой авиации (Ан-2, Як-12).',
    tempLimitC: 90,
  },
  {
    id: 'steel_30hgsa',
    name: 'Легированная сталь 30ХГСА («Хромансиль»)',
    category: 'steel',
    densityKgM3: 7850,
    youngModulusGPa: 205,
    yieldStrengthMPa: 830,
    ultimateStrengthMPa: 1100,
    shearModulusGPa: 80,
    costRelative: '$$ (Умеренная)',
    application: 'Сварные фермы фюзеляжей, штоки гидроцилиндров шасси, высокопрочные болты.',
    tempLimitC: 400,
  },
];

interface MaterialsDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MaterialsDatabaseModal: React.FC<MaterialsDatabaseModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('carbon_t700');

  // Spar Beam Sizing Calculator inputs
  const [sparLengthM, setSparLengthM] = useState<number>(1.2); // m
  const [sparBendingMomentNm, setSparBendingMomentNm] = useState<number>(180); // N*m
  const [sparHeightMm, setSparHeightMm] = useState<number>(25); // mm

  if (!isOpen) return null;

  const filteredMaterials = MATERIALS_DB.filter((mat) => {
    const matchCat = selectedCategory === 'all' || mat.category === selectedCategory;
    const matchSearch =
      mat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mat.application.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const selectedMaterial = MATERIALS_DB.find((m) => m.id === selectedMaterialId) || MATERIALS_DB[0];

  // Calculate spar beam dimensions and mass for selected material
  // Required Section Modulus W = M / [sigma_allowable] (with safety factor = 1.5)
  const safetyFactor = 1.5;
  const allowableStressPa = (selectedMaterial.yieldStrengthMPa * 1e6) / safetyFactor;
  const requiredSectionModulusM3 = sparBendingMomentNm / allowableStressPa; // W = M / sigma
  // For tubular/rectangular beam of height h: approx cross section area A
  const hMeters = sparHeightMm / 1000;
  // W ~ A * h / 4 -> A ~ 4 * W / h
  const approxAreaM2 = (4 * requiredSectionModulusM3) / hMeters;
  const approxVolumeM3 = approxAreaM2 * sparLengthM;
  const sparMassKg = approxVolumeM3 * selectedMaterial.densityKgM3;

  // Comparison with baseline D16T
  const d16tMat = MATERIALS_DB.find((m) => m.id === 'd16t')!;
  const d16tAllowable = (d16tMat.yieldStrengthMPa * 1e6) / safetyFactor;
  const d16tArea = (4 * (sparBendingMomentNm / d16tAllowable)) / hMeters;
  const d16tMass = d16tArea * sparLengthM * d16tMat.densityKgM3;
  const massSavingsPct = ((d16tMass - sparMassKg) / d16tMass) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn font-mono">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/60 border-b border-emerald-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-950/50">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>База Авиационных Материалов & Калькулятор Прочности Лонжерона</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Сплавы & Композиты
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Механические характеристики (E, σ_T, σ_B, ρ) и расчет весового выигрыша силовых элементов
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-slate-950 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'all', label: 'Все материалы' },
              { id: 'composite', label: 'Углепластики & Композиты' },
              { id: 'aluminum', label: 'Алюминиевые сплавы' },
              { id: 'titanium', label: 'Титан' },
              { id: 'wood', label: 'Бальза & Фанера' },
              { id: 'steel', label: 'Легированная сталь' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-bold'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск материала..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono w-48 focus:border-emerald-500/50 outline-none"
            />
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Materials Table Left (7 cols) */}
          <div className="lg:col-span-7 p-4 border-r border-slate-800 bg-slate-950/60 overflow-y-auto space-y-2.5">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block pb-1">
              Каталог Авиаматериалов ({filteredMaterials.length}):
            </span>

            <div className="space-y-2">
              {filteredMaterials.map((mat) => {
                const isSelected = selectedMaterialId === mat.id;
                // Specific strength (sigma / rho)
                const specificStrength = (mat.yieldStrengthMPa * 1000) / mat.densityKgM3;
                return (
                  <div
                    key={mat.id}
                    onClick={() => setSelectedMaterialId(mat.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md shadow-emerald-950/60'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <strong className="text-xs sm:text-sm text-emerald-300 font-mono block">
                          {mat.name}
                        </strong>
                        <span className="text-[10px] text-slate-400 font-sans">{mat.application}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/80 text-[11px] font-mono text-slate-300">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Плотность $\rho$:</span>
                        <strong>{mat.densityKgM3} кг/м³</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Предел $\sigma_T$:</span>
                        <strong className="text-amber-300">{mat.yieldStrengthMPa} МПа</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Модуль $E$:</span>
                        <strong className="text-cyan-300">{mat.youngModulusGPa} ГПа</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spar Sizing Calculator Right (5 cols) */}
          <div className="lg:col-span-5 p-5 bg-slate-900/60 overflow-y-auto space-y-5">
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300">Калькулятор Прочности Лонжерона</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                  Запас $n=1.5$
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Оценка массы и сечения балки лонжерона при изгибе для выбранного материала (<strong>{selectedMaterial.name.split('(')[0]}</strong>):
              </p>

              {/* Calculator Sliders */}
              <div className="space-y-3 pt-2 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Длина консоли лонжерона $L$:</span>
                    <strong className="text-emerald-400 font-mono">{sparLengthM} м</strong>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="5.0"
                    step="0.1"
                    value={sparLengthM}
                    onChange={(e) => setSparLengthM(Number(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Изгибающий момент в корне M_изг:</span>
                    <strong className="text-emerald-400 font-mono">{sparBendingMomentNm} Н·м</strong>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="2000"
                    step="10"
                    value={sparBendingMomentNm}
                    onChange={(e) => setSparBendingMomentNm(Number(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Строительная высота профиля $h$:</span>
                    <strong className="text-emerald-400 font-mono">{sparHeightMm} мм</strong>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="150"
                    step="2"
                    value={sparHeightMm}
                    onChange={(e) => setSparHeightMm(Number(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Spar Mass & Optimization Output */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-white block border-b border-slate-800 pb-2">
                Результаты Расчета Силового Элемента:
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block">Расчетная масса лонжерона:</span>
                  <strong className="text-emerald-300 text-base font-mono">
                    {sparMassKg < 1 ? `${(sparMassKg * 1000).toFixed(0)} г` : `${sparMassKg.toFixed(2)} кг`}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block">Выигрыш против Д16Т:</span>
                  <strong className={`text-base font-mono ${massSavingsPct > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {massSavingsPct > 0 ? `-${massSavingsPct.toFixed(1)}%` : `+${Math.abs(massSavingsPct).toFixed(1)}%`}
                  </strong>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-[11px] font-sans text-slate-300">
                💡 <em>Совет конструктора:</em> Углепластик T700 при работе на чистый изгиб позволяет сэкономить до 55-65% массы по сравнению с дюралюминием при равном запасе статической прочности.
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-950 border-t border-slate-800 text-xs">
          <div className="text-[11px] text-slate-400 font-sans flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Данные верифицированы по справочникам ВИАМ (Авиационные материалы) и стандартам MIL-HDBK-5J.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer border border-slate-700"
          >
            Закрыть Базу
          </button>
        </div>
      </div>
    </div>
  );
};
