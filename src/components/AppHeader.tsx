import React from 'react';
import {
  Sparkles,
  History,
  BookOpen,
  CheckCircle2,
  Database,
  Calculator,
  Grid,
} from 'lucide-react';
import { SolverEngine } from '../types';

export type StudioMainMode = 'ode' | 'sparse_linear';

interface AppHeaderProps {
  studioMode: StudioMainMode;
  onChangeStudioMode: (mode: StudioMainMode) => void;
  activeSection?: string;
  onScrollToSection?: (sectionId: string) => void;
  onOpenHistory: () => void;
  onOpenCatalog: () => void;
  onOpenVerification: () => void;
  onOpenShowcase?: () => void;
  historyCount: number;
  isSolving: boolean;
  hasSolution: boolean;
  engine: SolverEngine;
  onChangeEngine: (engine: SolverEngine) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  studioMode,
  onChangeStudioMode,
  onOpenHistory,
  onOpenCatalog,
  onOpenVerification,
  onOpenShowcase,
  historyCount,
  isSolving,
  hasSolution,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand Logo & Main Studio Mode Switcher */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => {
              if (onOpenShowcase) onOpenShowcase();
              else window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2 cursor-pointer select-none shrink-0 group"
            title="Открыть интерактивную визитку и возможности платформы"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-slate-950 font-bold shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300 bg-clip-text text-transparent tracking-wide group-hover:text-cyan-200 transition-colors">
                  МАТЕМАТИЧЕСКАЯ СТУДИЯ
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-mono">
                  v3.0 PRO
                </span>
              </div>
            </div>
          </div>

          {/* Core Mode Switcher: ODEs vs Sparse Linear Systems */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => onChangeStudioMode('ode')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                studioMode === 'ode'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Решатель ДУ</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeStudioMode('sparse_linear')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                studioMode === 'sparse_linear'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Решатель СЛАУ (Ax = b)</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-mono hidden md:inline">
                SuiteSparse
              </span>
            </button>
          </div>
        </div>

        {/* Right Controls based on Mode */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenShowcase && (
            <button
              onClick={onOpenShowcase}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 hover:from-cyan-500/20 hover:to-indigo-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="Открыть интерактивную визитку и презентацию возможностей"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Визитка</span>
            </button>
          )}

          {studioMode === 'ode' ? (
            <>
              <button
                onClick={onOpenHistory}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 text-xs transition-colors cursor-pointer"
                title="Открыть историю решенных уравнений"
              >
                <History className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">История</span>
                {historyCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-cyan-500 text-slate-950">
                    {historyCount}
                  </span>
                )}
              </button>

              <button
                onClick={onOpenCatalog}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 text-xs transition-colors cursor-pointer"
                title="Каталог классических типов и примеров ДУ"
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden xl:inline">Каталог</span>
              </button>

              {hasSolution && (
                <button
                  onClick={onOpenVerification}
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 text-xs transition-colors cursor-pointer"
                  title="Символьная проверка тождества"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Проверка</span>
                </button>
              )}

              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                {isSolving ? (
                  <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-[11px]">Решение...</span>
                  </div>
                ) : hasSolution ? (
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[11px]">Готово</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-slate-600" />
                    <span className="text-[11px]">Ожидание</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  const el = document.getElementById('solution-history-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 text-xs transition-colors cursor-pointer"
                title="Перейти к истории решений СЛАУ и физике матриц"
              >
                <History className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">История</span>
              </button>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-300 font-medium hidden sm:inline">SuiteSparse:</span>
                <a
                  href="https://sparse.tamu.edu/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:text-cyan-200 font-mono underline text-[11px]"
                >
                  41.2M+
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
