import React from 'react';
import {
  SquareTerminal,
  ListOrdered,
  Sigma,
  LineChart,
  BookOpen,
  CheckCircle2,
  LayoutGrid,
  RotateCcw,
  Sparkles,
  Layers,
  History,
  Compass,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  LogOut,
} from 'lucide-react';
import { WindowId, WindowState } from '../types';
import { AuthUser } from '../utils/securityManager';

interface DesktopHeaderProps {
  windows: Record<WindowId, WindowState>;
  onToggleWindow: (id: WindowId) => void;
  onApplyLayout: (layout: 'default' | 'analytical' | 'graphical' | 'history' | 'reset') => void;
  isSolving: boolean;
  hasSolution: boolean;
  historyCount?: number;
  currentUser?: AuthUser | null;
  onOpenAuthGate?: () => void;
  onOpenSuperAdminConsole?: () => void;
  onLogout?: () => void;
  onOpenShowcase?: () => void;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  windows,
  onToggleWindow,
  onApplyLayout,
  isSolving,
  hasSolution,
  historyCount = 0,
  currentUser,
  onOpenAuthGate,
  onOpenSuperAdminConsole,
  onLogout,
  onOpenShowcase,
}) => {
  const windowButtons: { id: WindowId; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    { id: 'input', label: 'Ввод ДУ', icon: <SquareTerminal className="w-3.5 h-3.5" /> },
    { id: 'steps', label: 'Шаги вывода', icon: <ListOrdered className="w-3.5 h-3.5" /> },
    { id: 'formula', label: 'Формула решения', icon: <Sigma className="w-3.5 h-3.5" /> },
    { id: 'graph', label: 'Поле & График', icon: <LineChart className="w-3.5 h-3.5" /> },
    {
      id: 'history',
      label: 'История решений',
      icon: <History className="w-3.5 h-3.5 text-cyan-400" />,
      badge: historyCount > 0 ? historyCount : undefined,
    },
    { id: 'analyzer', label: 'Преданализатор', icon: <Compass className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'verification', label: 'Проверка', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { id: 'presets', label: 'Каталог', icon: <BookOpen className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 h-12 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 flex items-center justify-between z-50 select-none shadow-md">
      {/* Brand Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 via-cyan-500 to-teal-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300 bg-clip-text text-transparent tracking-wide">
              СИМВОЛЬНЫЙ РЕШАТЕЛЬ ДУ
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-mono">
              v3.0 PRO
            </span>
          </div>
        </div>
      </div>

      {/* Center Window Dock Tabs */}
      <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-inner max-w-3xl overflow-x-auto">
        {windowButtons.map((btn) => {
          const win = windows[btn.id];
          const isActive = win?.isOpen && !win?.isMinimized;
          return (
            <button
              key={btn.id}
              onClick={() => onToggleWindow(btn.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 relative cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : win?.isOpen
                  ? 'bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'
              }`}
              title={btn.label}
            >
              <span className={isActive ? 'text-cyan-400' : 'text-slate-400'}>{btn.icon}</span>
              <span className="hidden sm:inline">{btn.label}</span>
              {btn.badge !== undefined && (
                <span className="px-1 py-0.2 rounded-full text-[9px] font-bold bg-cyan-500 text-slate-950">
                  {btn.badge}
                </span>
              )}
              {win?.isOpen && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isActive ? 'bg-cyan-400 shadow-sm shadow-cyan-400' : 'bg-amber-400/80'
                  }`}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Right Controls: Layout, Auth & Status */}
      <div className="flex items-center gap-2">
        {onOpenShowcase && (
          <button
            type="button"
            onClick={onOpenShowcase}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 text-cyan-200 border border-cyan-500/40 text-xs font-bold transition-all cursor-pointer"
            title="Выйти в приветственную панель и выбрать модуль"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
            <span>Выйти в меню</span>
          </button>
        )}

        {currentUser?.isSuperAdmin && onOpenSuperAdminConsole && (
          <button
            type="button"
            onClick={onOpenSuperAdminConsole}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold hover:bg-amber-500/30 transition-all cursor-pointer"
            title="Панель суперпользователя: 100 ключей"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">100 Ключей</span>
          </button>
        )}

        {currentUser && onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
            title="Выйти"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Layout presets dropdown / buttons */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800 text-xs text-slate-400">
          <button
            onClick={() => onApplyLayout('default')}
            className="px-2 py-1 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors flex items-center gap-1 cursor-pointer"
            title="Расположить окна плиткой (2x2)"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
            <span>Сетка</span>
          </button>
          <button
            onClick={() => onApplyLayout('history')}
            className="px-2 py-1 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors flex items-center gap-1 cursor-pointer text-cyan-300"
            title="Фокус на Историю решений"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span>История</span>
          </button>
          <button
            onClick={() => onApplyLayout('analytical')}
            className="px-2 py-1 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors flex items-center gap-1 cursor-pointer"
            title="Раскладка: фокус на формулы и построчные шаги"
          >
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Аналитика</span>
          </button>
          <button
            onClick={() => onApplyLayout('reset')}
            className="px-1.5 py-1 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Сбросить позиции всех окон"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          {isSolving ? (
            <div className="flex items-center gap-1.5 text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Решение...</span>
            </div>
          ) : hasSolution ? (
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Решение готово</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span>Ожидание</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
