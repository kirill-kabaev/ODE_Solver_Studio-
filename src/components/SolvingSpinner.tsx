import React from 'react';
import { X, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { SolverEngine } from '../types';

interface SolvingSpinnerProps {
  engine: SolverEngine;
  currentRequestText?: string;
  attempt?: number;
  maxAttempts?: number;
  onCancel?: () => void;
  className?: string;
}

export const SolvingSpinner: React.FC<SolvingSpinnerProps> = ({
  engine,
  currentRequestText = 'Символьный анализ дифференциального уравнения...',
  attempt = 1,
  maxAttempts = 1,
  onCancel,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-6 ${className}`}>
      {/* Central Animated Spinner Ring with Cancel Button inside */}
      <div className="relative w-28 h-28 flex items-center justify-center mb-5">
        {/* Outer glowing orbital ring */}
        <div className="absolute inset-0 rounded-full border-[3px] border-slate-800/80 border-t-cyan-400 border-r-indigo-500 animate-spin" />
        {/* Counter-rotating inner ring */}
        <div
          className="absolute inset-2.5 rounded-full border-[3px] border-slate-800/60 border-b-cyan-300 border-l-emerald-400 animate-spin"
          style={{ animationDirection: 'reverse', animationDuration: '2.5s' }}
        />
        {/* Soft pulse glow backdrop */}
        <div className="absolute inset-4 rounded-full bg-cyan-500/10 blur-md pointer-events-none animate-pulse" />

        {/* Center CANCEL button */}
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            title="Отменить текущий запрос"
            className="group relative z-10 w-14 h-14 rounded-full bg-slate-900/95 hover:bg-rose-950 border border-slate-700 hover:border-rose-500/80 text-slate-300 hover:text-rose-200 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 shadow-xl hover:shadow-rose-950/50 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-400 group-hover:text-rose-400 transition-colors" />
            <span className="text-[9px] font-bold tracking-tight uppercase group-hover:text-rose-300">
              Отмена
            </span>
          </button>
        ) : (
          <div className="relative z-10 w-12 h-12 rounded-full bg-slate-900/90 border border-slate-800 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
        )}
      </div>

      {/* Engine & Status Badges */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${
            engine === 'cpu'
              ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
              : engine === 'gpu'
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
              : 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60 animate-pulse'
          }`}
        >
          {engine === 'cpu' && 'Ядро: CPU Local'}
          {engine === 'gpu' && 'Ядро: GPU Shaders'}
          {engine === 'ai' && 'Ядро: AI Gemini CAS'}
        </span>

        {engine === 'ai' && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800 font-mono">
            Попытка {attempt} из {maxAttempts}
          </span>
        )}
      </div>

      {/* Dynamic Request Information Message */}
      <h4 className="text-sm font-semibold text-slate-200 mb-1.5 max-w-md line-clamp-2 px-2">
        {currentRequestText}
      </h4>

      <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-3">
        {engine === 'ai'
          ? 'Нейросетевая декомпозиция, поиск интегрирующего множителя, вычисление общего решения и проверка в LaTeX.'
          : 'Символьное вычисление корней характеристического уравнения и построение фазовых траекторий.'}
      </p>

      {/* Quick Cancel text shortcut if user prefers */}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-500 hover:text-rose-400 underline underline-offset-4 decoration-slate-700 hover:decoration-rose-500 transition-colors cursor-pointer"
        >
          Прервать вычисление и сменить уравнение
        </button>
      )}
    </div>
  );
};
