import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

interface SanityCheckProps {
  staticMarginPct?: number;
  currentAoADeg?: number;
  wingLoadingKgM2?: number;
  thrustToWeightRatio?: number;
  onOpenFlightComputer?: () => void;
}

export const RealtimeSanityCheckBadge: React.FC<SanityCheckProps> = ({
  staticMarginPct = 12.0,
  currentAoADeg = 4.0,
  wingLoadingKgM2 = 24.5,
  thrustToWeightRatio = 0.65,
  onOpenFlightComputer,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Compute status
  const isUnstable = staticMarginPct < 0;
  const isStalled = currentAoADeg >= 15;
  const isHighWingLoading = wingLoadingKgM2 > 90;
  const isLowThrust = thrustToWeightRatio < 0.25;

  let overallStatus: 'safe' | 'warning' | 'critical' = 'safe';
  if (isUnstable || currentAoADeg > 18) {
    overallStatus = 'critical';
  } else if (isStalled || isHighWingLoading || isLowThrust || staticMarginPct < 5) {
    overallStatus = 'warning';
  }

  return (
    <div className="font-mono text-xs">
      {/* Compact Status Chip */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 cursor-pointer select-none transition-all shadow-md ${
          overallStatus === 'critical'
            ? 'bg-rose-950/80 border-rose-500/60 text-rose-300 shadow-rose-950/40 animate-pulse'
            : overallStatus === 'warning'
            ? 'bg-amber-950/80 border-amber-500/60 text-amber-300 shadow-amber-950/40'
            : 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-emerald-950/40'
        }`}
      >
        {overallStatus === 'critical' ? (
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
        ) : overallStatus === 'warning' ? (
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        ) : (
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        )}

        <div className="flex items-center gap-2">
          <span className="font-bold">
            {overallStatus === 'critical'
              ? '🚨 Аварийная центровка'
              : overallStatus === 'warning'
              ? '⚠️ Внимание: пограничный режим'
              : '✅ Конфигурация устойчива'}
          </span>
          <span className="text-[10px] opacity-75 hidden sm:inline">
            (SM: {staticMarginPct > 0 ? `+${staticMarginPct}` : staticMarginPct}%, α: {currentAoADeg}°)
          </span>
        </div>

        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 opacity-70 ml-1" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 opacity-70 ml-1" />
        )}
      </div>

      {/* Expanded Diagnostic Dropdown Card */}
      {isExpanded && (
        <div className="mt-2 p-3.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-2.5 max-w-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[11px] font-bold text-white font-sans">Physics Sanity Check Диагностика:</span>
            {onOpenFlightComputer && (
              <button
                type="button"
                onClick={onOpenFlightComputer}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                Борткомпьютер →
              </button>
            )}
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Продольная устойчивость:</span>
              <strong className={isUnstable ? 'text-rose-400' : 'text-emerald-400'}>
                SM = {staticMarginPct > 0 ? `+${staticMarginPct}` : staticMarginPct}% САХ
              </strong>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Угол атаки (срыв потока):</span>
              <strong className={isStalled ? 'text-rose-400' : 'text-slate-200'}>
                α = {currentAoADeg}° {isStalled ? '(Срыв потока!)' : '(Безопасно)'}
              </strong>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Нагрузка на крыло:</span>
              <strong className="text-slate-200">
                W/S = {wingLoadingKgM2} кг/м²
              </strong>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Тяговооруженность:</span>
              <strong className={isLowThrust ? 'text-amber-400' : 'text-emerald-400'}>
                T/W = {thrustToWeightRatio}
              </strong>
            </div>
          </div>

          {/* Actionable recommendation */}
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-sans text-slate-300">
            {isUnstable ? (
              <span className="text-rose-300 font-semibold">
                🚨 Центр тяжести позади фокуса. Сдвиньте аккумулятор вперед или увеличьте ГО.
              </span>
            ) : isStalled ? (
              <span className="text-amber-300 font-semibold">
                ⚠️ Закритический угол атаки. Уменьшите тангаж или включите отклонение предкрылков.
              </span>
            ) : (
              <span className="text-emerald-300">
                ✅ Компоновка сбалансирована. Аппарат имеет положительный демпфирующий момент.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
