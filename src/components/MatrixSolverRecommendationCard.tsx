import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Cpu,
  Server,
  Layers,
  ChevronDown,
  ChevronUp,
  Sliders,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Ban,
  Clock,
  Gauge
} from 'lucide-react';
import { MatrixSolverRecommendation, LinearSolverType, ComputeDevice } from '../types/sparse';

interface MatrixSolverRecommendationCardProps {
  recommendation: MatrixSolverRecommendation;
  currentSolver: LinearSolverType;
  currentDevice: ComputeDevice;
  autoApplyRecommendation: boolean;
  onToggleAutoApply: (enabled: boolean) => void;
  onApplyRecommendation: () => void;
}

export const MatrixSolverRecommendationCard: React.FC<MatrixSolverRecommendationCardProps> = ({
  recommendation,
  currentSolver,
  currentDevice,
  autoApplyRecommendation,
  onToggleAutoApply,
  onApplyRecommendation,
}) => {
  const [showComparisonTable, setShowComparisonTable] = useState<boolean>(false);

  const isCurrentSolverRecommended = currentSolver === recommendation.recommendedSolver;
  const isCurrentDeviceRecommended = currentDevice === recommendation.recommendedDevice;
  const isFullySynchronized = isCurrentSolverRecommended && isCurrentDeviceRecommended;

  const props = recommendation.matrixProperties;

  return (
    <div
      id="matrix-solver-recommendation-card"
      className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-cyan-950/30 border border-indigo-500/40 shadow-xl flex flex-col gap-4 relative overflow-hidden animate-fade-in"
    >
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-indigo-500/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-inner">
            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white font-mono tracking-wide">
                Система рекомендаций оптимального алгоритма СЛАУ
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                AI & Matrix Physics Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Автоматический спектральный и структурный анализ свойств матрицы для выбора наилучшего решателя
            </p>
          </div>
        </div>

        {/* Auto-Apply Default Toggle */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs select-none bg-slate-950/80 px-3 py-1.5 rounded-xl border border-indigo-500/30 text-slate-300 hover:text-white transition-all">
            <input
              type="checkbox"
              checked={autoApplyRecommendation}
              onChange={(e) => onToggleAutoApply(e.target.checked)}
              className="rounded bg-slate-900 border-indigo-500/50 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span className="font-medium">
              Автоматически включать рекомендованный алгоритм по умолчанию
            </span>
          </label>
        </div>
      </div>

      {/* Main Recommendation Hero Banner */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0 mt-0.5">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">
                Оптимальный метод для данной матрицы:
              </span>
              {isFullySynchronized ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  ВКЛЮЧЕН ПО УМОЛЧАНИЮ
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  ВЫБРАН ДРУГОЙ АЛГОРИТМ ({currentSolver.toUpperCase()})
                </span>
              )}
            </div>

            <div className="text-base sm:text-lg font-bold text-white font-mono flex items-center gap-2 flex-wrap">
              <span className="text-cyan-300">{recommendation.solverName}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-normal">
                {recommendation.recommendedDevice === 'cuda_gpu' ? '⚡ Ускорение на GPU NVIDIA' : '💻 Многопоточный CPU'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl mt-0.5">
              {recommendation.performanceBenefit}
            </p>
          </div>
        </div>

        {/* Action Button if not currently active */}
        {!isFullySynchronized && (
          <button
            onClick={onApplyRecommendation}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer shrink-0 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Применить рекомендацию ({recommendation.solverShortName})</span>
          </button>
        )}
      </div>

      {/* Grid of Extracted Matrix Properties */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 text-xs font-mono">
        {/* Symmetry & Positive Definiteness */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1">
          <span className="text-slate-500 text-[10px] uppercase">Симметрия & SPD:</span>
          {props.isSymmetric ? (
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{props.isSPD ? 'Симметричная SPD' : 'Симметричная (A = Aᵀ)'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Несимметричная (A ≠ Aᵀ)</span>
            </div>
          )}
          <span className="text-[10px] text-slate-400">
            {props.isSymmetric ? 'Применимы методы CG/PCG' : 'Требуются BiCGSTAB / GMRES'}
          </span>
        </div>

        {/* Diagonal Dominance */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1">
          <span className="text-slate-500 text-[10px] uppercase">Диагональ:</span>
          {props.hasZeroDiagonal ? (
            <div className="flex items-center gap-1.5 text-rose-400 font-bold">
              <Ban className="w-4 h-4 shrink-0" />
              <span>Нули на диагонали</span>
            </div>
          ) : props.isDiagonallyDominant ? (
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Диагональное преобладание</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-300 font-bold">
              <span>Слабая диагональ</span>
            </div>
          )}
          <span className="text-[10px] text-slate-400">
            {props.hasZeroDiagonal ? 'Якоби/Зейдель не сходятся' : 'Гарантия сходимости'}
          </span>
        </div>

        {/* Scale & Sparsity */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1">
          <span className="text-slate-500 text-[10px] uppercase">Масштаб & Плотность:</span>
          <span className="text-slate-200 font-bold text-[11px]">{props.scaleLabel}</span>
          <span className="text-[10px] text-cyan-400">
            Плотность ненулей: {props.densityFormatted}
          </span>
        </div>

        {/* Condition Estimate */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1">
          <span className="text-slate-500 text-[10px] uppercase">Обусловленность κ(A):</span>
          <span className="text-amber-300 font-bold">{props.conditionEstimateFormatted}</span>
          <span className="text-[10px] text-slate-400">
            {props.hasZeroDiagonal ? 'Критическая жесткость' : 'Спектральный разброс'}
          </span>
        </div>

        {/* Physics Domain */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1 col-span-2 sm:col-span-1">
          <span className="text-slate-500 text-[10px] uppercase">Физическая модель:</span>
          <span className="text-indigo-300 font-bold truncate" title={props.physicalField}>
            {props.physicalField}
          </span>
          <span className="text-[10px] text-slate-400">Дифференциальный оператор</span>
        </div>
      </div>

      {/* Mathematical Scientific Rationale */}
      <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 flex flex-col gap-2 text-xs leading-relaxed">
        <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          Научно-математическое обоснование выбора алгоритма:
        </span>
        <p className="text-slate-300 font-sans">
          {recommendation.mathematicalJustification}
        </p>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Рекомендуемый аппаратный ускоритель:</span>
            <strong className="text-emerald-400">
              {recommendation.hardwareRecommendation.device === 'cuda_gpu'
                ? 'NVIDIA CUDA GPU'
                : 'Многопоточный CPU'}
            </strong>
          </div>

          <button
            onClick={() => setShowComparisonTable(!showComparisonTable)}
            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer underline ml-auto"
          >
            <span>{showComparisonTable ? 'Скрыть сравнение алгоритмов' : 'Показать сравнение всех 9 алгоритмов для этой матрицы'}</span>
            {showComparisonTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Comparative Analysis Table */}
      {showComparisonTable && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3 text-xs animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-200 font-mono">
              Сравнительный вердикт применимости алгоритмов к текущей матрице:
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">
              9 алгоритмов в базе
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
            {recommendation.comparativeAnalysis.map((item) => {
              const isSelected = currentSolver === item.solver;
              const isOptimal = item.verdict === 'optimal';
              const isInvalid = item.verdict === 'mathematically_invalid';
              const isAlternative = item.verdict === 'good_alternative';

              return (
                <div
                  key={item.solver}
                  className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all ${
                    isOptimal
                      ? 'bg-emerald-950/20 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                      : isInvalid
                      ? 'bg-rose-950/10 border-rose-500/30 opacity-75'
                      : isAlternative
                      ? 'bg-slate-900/60 border-slate-700'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-slate-100 font-mono">
                      {item.name}
                    </span>
                    {isOptimal && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono shrink-0">
                        🌟 ОПТИМАЛЬНО
                      </span>
                    )}
                    {isAlternative && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono shrink-0">
                        👍 РАБОТАЕТ
                      </span>
                    )}
                    {isInvalid && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono shrink-0">
                        ❌ НЕПРИМЕНИМ
                      </span>
                    )}
                    {!isOptimal && !isAlternative && !isInvalid && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono shrink-0">
                        ⏳ МЕДЛЕННО
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    {item.explanation}
                  </p>

                  {isSelected && (
                    <div className="text-[10px] font-mono font-bold text-cyan-400 pt-1 border-t border-slate-800">
                      ▶ Выбран сейчас
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
