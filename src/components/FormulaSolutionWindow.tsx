import React, { useState } from 'react';
import { Copy, Check, Sigma, Sparkles, BookCheck, ExternalLink, Info, Award } from 'lucide-react';
import { ODESolution, SolverEngine } from '../types';
import { MathView } from './MathView';
import { SolvingSpinner } from './SolvingSpinner';

interface FormulaSolutionWindowProps {
  solution: ODESolution | null;
  isSolving: boolean;
  engine?: SolverEngine;
  currentRequestText?: string;
  attempt?: number;
  maxAttempts?: number;
  onCancel?: () => void;
}

export const FormulaSolutionWindow: React.FC<FormulaSolutionWindowProps> = ({
  solution,
  isSolving,
  engine = 'ai',
  currentRequestText,
  attempt = 1,
  maxAttempts = 3,
  onCancel,
}) => {
  const [copiedType, setCopiedType] = useState<'latex' | 'plain' | 'sympy' | null>(null);

  const handleCopy = (text: string, type: 'latex' | 'plain' | 'sympy') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  if (isSolving) {
    return (
      <SolvingSpinner
        engine={engine}
        currentRequestText={currentRequestText || 'Синтез формулы и проверка тождества...'}
        attempt={attempt}
        maxAttempts={maxAttempts}
        onCancel={onCancel}
        className="h-full min-h-[220px]"
      />
    );
  }

  if (!solution) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-center p-6 text-slate-500">
        <Sigma className="w-12 h-12 mb-3 text-slate-700 stroke-1" />
        <p className="text-sm font-medium text-slate-400 mb-1">Итоговая формула пока не вычислена</p>
        <p className="text-xs text-slate-600 max-w-xs">
          После нажатия «Решить» здесь появится точное аналитическое решение уравнения.
        </p>
      </div>
    );
  }

  const hasParticular = Boolean(solution.particularSolutionLatex && solution.particularSolutionLatex.trim());

  return (
    <div className="flex flex-col gap-4 text-slate-200">
      {/* Top Banner: General Solution */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/80 border border-cyan-500/40 p-5 shadow-2xl shadow-cyan-950/30">
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide text-white">ОБЩЕЕ АНАЛИТИЧЕСКОЕ РЕШЕНИЕ</h3>
              <p className="text-[11px] text-slate-400">Замкнутая формула для семейства интегральных кривых</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => handleCopy(solution.generalSolutionLatex, 'latex')}
              title="Копировать LaTeX формулу"
              className="px-2.5 py-1 text-xs font-mono rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-colors flex items-center gap-1"
            >
              {copiedType === 'latex' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>LaTeX</span>
            </button>
            <button
              onClick={() => handleCopy(solution.generalSolutionPlain, 'plain')}
              title="Копировать в текстовом формате"
              className="px-2.5 py-1 text-xs font-mono rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-colors flex items-center gap-1"
            >
              {copiedType === 'plain' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Plain</span>
            </button>
          </div>
        </div>

        {/* Formula Math Render */}
        <div className="py-4 px-5 bg-slate-950/90 rounded-xl border border-slate-800 flex items-center justify-center overflow-x-auto min-h-[70px]">
          <MathView math={solution.generalSolutionLatex} block className="text-lg md:text-xl font-medium text-cyan-200" />
        </div>

        {/* Plain copy preview */}
        <div className="mt-3 flex items-center justify-between text-xs font-mono text-slate-400 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800/60">
          <span className="truncate">{solution.generalSolutionPlain}</span>
        </div>
      </div>

      {/* Particular Solution (Cauchy Initial Value Problem) if provided */}
      {hasParticular && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/70 border border-emerald-500/40 p-5 shadow-2xl shadow-emerald-950/30">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <BookCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-wide text-white">ЧАСТНОЕ РЕШЕНИЕ (ЗАДАЧА КОШИ)</h3>
                <p className="text-[11px] text-slate-400">Единственная интегральная кривая с фиксированными константами</p>
              </div>
            </div>

            <button
              onClick={() => handleCopy(solution.particularSolutionLatex || '', 'latex')}
              title="Копировать частное решение LaTeX"
              className="px-2.5 py-1 text-xs font-mono rounded bg-slate-950/70 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 border border-slate-800 transition-colors flex items-center gap-1"
            >
              {copiedType === 'latex' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Копировать</span>
            </button>
          </div>

          <div className="py-4 px-5 bg-slate-950/90 rounded-xl border border-slate-800 flex items-center justify-center overflow-x-auto min-h-[70px]">
            <MathView math={solution.particularSolutionLatex || ''} block className="text-lg md:text-xl font-medium text-emerald-300" />
          </div>

          {/* Constants Values Grid */}
          {solution.constantsValues && Object.keys(solution.constantsValues).length > 0 && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(solution.constantsValues).map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-center justify-between bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono"
                >
                  <span className="text-slate-400">{key}:</span>
                  <span className="text-emerald-300 font-semibold">{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Meta Properties Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-1">
          <span className="text-slate-500 font-medium">Каноническая форма уравнения:</span>
          <div className="overflow-x-auto py-1">
            <MathView math={solution.equationNormalizedLatex} className="text-slate-200" />
          </div>
        </div>

        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-1">
          <span className="text-slate-500 font-medium">Примененный математический метод:</span>
          <span className="text-cyan-300 font-medium">{solution.methodUsed}</span>
        </div>
      </div>
    </div>
  );
};
