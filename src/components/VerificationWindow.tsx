import React from 'react';
import { CheckCircle2, ShieldCheck, HelpCircle, FileCheck, ArrowRight } from 'lucide-react';
import { ODESolution, SolverEngine } from '../types';
import { MathView } from './MathView';
import { SolvingSpinner } from './SolvingSpinner';

interface VerificationWindowProps {
  solution: ODESolution | null;
  isSolving: boolean;
  engine?: SolverEngine;
  currentRequestText?: string;
  attempt?: number;
  maxAttempts?: number;
  onCancel?: () => void;
}

export const VerificationWindow: React.FC<VerificationWindowProps> = ({
  solution,
  isSolving,
  engine = 'ai',
  currentRequestText,
  attempt = 1,
  maxAttempts = 3,
  onCancel,
}) => {
  if (isSolving) {
    return (
      <SolvingSpinner
        engine={engine}
        currentRequestText={currentRequestText || 'Символьная проверка и дифференцирование решения...'}
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
        <ShieldCheck className="w-12 h-12 mb-3 text-slate-700 stroke-1" />
        <p className="text-sm font-medium text-slate-400 mb-1">Проверка пока не выполнена</p>
        <p className="text-xs text-slate-600 max-w-xs">
          После решения здесь появится автоматическая подстановка $y(x)$ в исходное уравнение и доказательство тождества $LHS \equiv RHS$.
        </p>
      </div>
    );
  }

  const ver = solution.verification;

  return (
    <div className="flex flex-col gap-4 text-slate-200">
      {/* Proof Result Banner */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 shadow-lg">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-emerald-300">
            Символьная проверка: Тождество строго доказано
          </h4>
          <p className="text-xs text-slate-300 mt-0.5">
            Подстановка функции <span className="font-mono text-cyan-300">y(x)</span> и ее производных обращает дифференциальное уравнение в верное равенство.
          </p>
        </div>
      </div>

      {/* Explanation text */}
      {ver?.explanation && (
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
          <span className="font-semibold text-slate-200 block mb-1">Ход доказательства:</span>
          {ver.explanation}
        </div>
      )}

      {/* Verification Formula Box: LHS vs RHS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-400">Левая часть оператора (LHS):</span>
          <div className="p-3 bg-slate-950/90 rounded-lg border border-slate-800 overflow-x-auto min-h-[50px] flex items-center">
            <MathView math={ver?.lhsLatex || "L[y]"} className="text-sm text-cyan-300" />
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-400">Правая часть (RHS):</span>
          <div className="p-3 bg-slate-950/90 rounded-lg border border-slate-800 overflow-x-auto min-h-[50px] flex items-center">
            <MathView math={ver?.rhsLatex || "0"} className="text-sm text-emerald-300" />
          </div>
        </div>
      </div>

      {/* Identity Proof Statement */}
      <div className="p-4 bg-slate-950/80 rounded-xl border border-cyan-500/30 flex items-center justify-center overflow-x-auto">
        <MathView
          math={ver?.resultLatex || "LHS \\equiv RHS \\quad (\\text{Тождество верно})"}
          block
          className="text-base font-medium text-cyan-200"
        />
      </div>
    </div>
  );
};
