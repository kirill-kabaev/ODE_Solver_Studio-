import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ListRestart,
  Eye,
  CheckCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { ODESolution, SolverEngine } from '../types';
import { MathView } from './MathView';
import { SolvingSpinner } from './SolvingSpinner';

interface StepByStepWindowProps {
  solution: ODESolution | null;
  isSolving: boolean;
  engine?: SolverEngine;
  currentRequestText?: string;
  attempt?: number;
  maxAttempts?: number;
  onCancel?: () => void;
}

export const StepByStepWindow: React.FC<StepByStepWindowProps> = ({
  solution,
  isSolving,
  engine = 'ai',
  currentRequestText,
  attempt = 1,
  maxAttempts = 3,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [revealAll, setRevealAll] = useState<boolean>(true);

  const steps = solution?.steps || [];

  // Reset steps when a new solution arrives
  useEffect(() => {
    if (solution && solution.steps.length > 0) {
      setCurrentStep(solution.steps.length - 1); // default reveal all
      setRevealAll(true);
      setIsPlaying(false);
    }
  }, [solution]);

  // Autoplay step playback timer
  useEffect(() => {
    if (!isPlaying || !solution || steps.length === 0) return;

    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          setIsPlaying(false);
          return prev;
        }
      });
    }, 1800);

    return () => clearInterval(timer);
  }, [isPlaying, solution, steps.length]);

  if (isSolving) {
    return (
      <SolvingSpinner
        engine={engine}
        currentRequestText={currentRequestText || 'Символьный анализ и построчный вывод решения...'}
        attempt={attempt}
        maxAttempts={maxAttempts}
        onCancel={onCancel}
        className="h-full min-h-[300px]"
      />
    );
  }

  if (!solution) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[260px] text-center p-6 text-slate-500">
        <BookOpen className="w-12 h-12 mb-3 text-slate-700 stroke-1" />
        <p className="text-sm font-medium text-slate-400 mb-1">Ожидание ввода дифференциального уравнения</p>
        <p className="text-xs text-slate-600 max-w-sm">
          Введите уравнение в окне «Ввод ДУ» и нажмите «Решить». Здесь появится подробное пошаговое математическое решение.
        </p>
      </div>
    );
  }

  const visibleSteps = revealAll ? steps : steps.slice(0, currentStep + 1);

  return (
    <div className="flex flex-col gap-4">
      {/* Header Info Banner */}
      <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-cyan-400">{solution.equationType}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-mono">
              Порядок: {solution.order}
            </span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-0.5">
            <span className="text-slate-500">Метод:</span>
            <span className="text-slate-300 font-medium">{solution.methodUsed}</span>
          </div>
        </div>

        {/* Step Playback Controls */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => {
              setRevealAll(false);
              setCurrentStep(0);
              setIsPlaying(false);
            }}
            title="С начала"
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ListRestart className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setRevealAll(false);
              setCurrentStep((p) => Math.max(0, p - 1));
              setIsPlaying(false);
            }}
            disabled={currentStep === 0 && !revealAll}
            title="Назад"
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (revealAll) {
                setRevealAll(false);
                setCurrentStep(0);
                setIsPlaying(true);
              } else {
                setIsPlaying(!isPlaying);
              }
            }}
            title={isPlaying ? "Пауза" : "Воспроизведение"}
            className="px-2 py-1 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 text-xs font-medium transition-colors"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3 fill-current" />
                <span>Пауза</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>Авто-шаги</span>
              </>
            )}
          </button>
          <button
            onClick={() => {
              setRevealAll(false);
              setCurrentStep((p) => Math.min(steps.length - 1, p + 1));
              setIsPlaying(false);
            }}
            disabled={currentStep >= steps.length - 1 && !revealAll}
            title="Вперед"
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setRevealAll(true);
              setIsPlaying(false);
            }}
            title="Показать все шаги"
            className={`px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
              revealAll
                ? 'bg-slate-800 text-slate-200 border-slate-700'
                : 'bg-transparent text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Eye className="w-3.5 h-3.5 inline mr-1" />
            Все шаги
          </button>
        </div>
      </div>

      {/* Steps List */}
      <div className="flex flex-col gap-3">
        {visibleSteps.map((st, idx) => {
          const isLastRevealed = !revealAll && idx === currentStep;

          return (
            <div
              key={st.stepNumber || idx}
              className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                isLastRevealed
                  ? 'bg-slate-900/90 border-cyan-500/60 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                  : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Step Header */}
              <div className="p-3.5 flex items-start gap-3">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                    isLastRevealed
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {st.stepNumber || idx + 1}
                </div>

                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-slate-200">{st.title}</h4>
                    {st.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 text-cyan-300 border border-cyan-900/40 font-mono">
                        {st.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed pt-0.5">
                    {st.explanation}
                  </p>
                </div>
              </div>

              {/* LaTeX mathematical transformation box */}
              {st.latex && (
                <div className="bg-slate-950/90 px-4 py-3 border-t border-slate-800/60 overflow-x-auto flex items-center justify-start">
                  <MathView math={st.latex} block className="text-sm text-cyan-200" />
                </div>
              )}

              {/* Extra detailed breakdown if available */}
              {st.details && (
                <div className="p-3 bg-slate-950/40 border-t border-slate-800/40 text-xs text-slate-400 font-mono">
                  {st.details}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Indicator */}
      {!revealAll && steps.length > 0 && (
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1">
          <span>
            Шаг {currentStep + 1} из {steps.length}
          </span>
          <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
