import React from 'react';
import {
  Sparkles,
  History,
  BookOpen,
  CheckCircle2,
  Database,
  Calculator,
  Grid,
  Rocket,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  User,
  LogOut,
  Fingerprint,
  LayoutGrid,
} from 'lucide-react';
import { SolverEngine } from '../types';
import { AuthUser } from '../utils/securityManager';

export type StudioMainMode = 'ode' | 'sparse_linear' | 'engineering';

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
  currentUser: AuthUser | null;
  onOpenAuthGate: () => void;
  onOpenSuperAdminConsole: () => void;
  onLogout: () => void;
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
  currentUser,
  onOpenAuthGate,
  onOpenSuperAdminConsole,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand Logo & Current Active Section Badge + 'Выйти в меню' */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <div
            onClick={() => {
              if (onOpenShowcase) onOpenShowcase();
              else window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2 cursor-pointer select-none shrink-0 group"
            title="Открыть приветственную панель и выбрать модуль"
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

          {/* Current Active Section Indicator Badge */}
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-semibold shadow-inner">
            {studioMode === 'ode' && (
              <div className="flex items-center gap-1.5 text-purple-300">
                <Calculator className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden xs:inline">Раздел:</span>
                <span className="font-bold text-white">Решатель ДУ</span>
              </div>
            )}
            {studioMode === 'sparse_linear' && (
              <div className="flex items-center gap-1.5 text-cyan-300">
                <Grid className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden xs:inline">Раздел:</span>
                <span className="font-bold text-white">Решатель СЛАУ</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-mono hidden md:inline">
                  SuiteSparse
                </span>
              </div>
            )}
            {studioMode === 'engineering' && (
              <div className="flex items-center gap-1.5 text-indigo-300">
                <Rocket className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden xs:inline">Раздел:</span>
                <span className="font-bold text-white">Инжиниринг</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-mono hidden md:inline">
                  CFD • GNC • EDA
                </span>
              </div>
            )}
          </div>

          {/* Dedicated "Выйти в меню" Button that returns to the Welcome Tiles Screen */}
          {onOpenShowcase && (
            <button
              type="button"
              onClick={onOpenShowcase}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/15 via-indigo-500/15 to-purple-500/15 hover:from-cyan-500/25 hover:to-indigo-500/25 text-cyan-200 hover:text-white border border-cyan-500/40 hover:border-cyan-400 text-xs font-bold transition-all shadow-md shadow-cyan-950/40 cursor-pointer active:scale-95 group"
              title="Выйти в приветственную панель и выбрать другой раздел"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>Выйти в меню</span>
            </button>
          )}
        </div>

        {/* Right Controls & Auth Header Area */}
        <div className="flex items-center gap-1.5 shrink-0">
          {currentUser?.isSuperAdmin ? (
            <button
              type="button"
              onClick={onOpenSuperAdminConsole}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/50 text-xs font-mono font-bold transition-all cursor-pointer shadow-md shadow-amber-950/40 animate-pulse"
              title="Открыть панель суперпользователя и банк 100 ключей"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">100 Ключей / ROOT</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-black">
                ROOT
              </span>
            </button>
          ) : currentUser ? (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-300"
              title={`Лицензия привязана: ${currentUser.email}`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">{currentUser.email.split('@')[0]}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuthGate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-950/50 transition-all cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Войти / Ключ</span>
            </button>
          )}

          {currentUser && (
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer"
              title="Выйти из учетной записи"
            >
              <LogOut className="w-3.5 h-3.5" />
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

