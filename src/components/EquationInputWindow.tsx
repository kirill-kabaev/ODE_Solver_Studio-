import React, { useState } from 'react';
import {
  Play,
  Sparkles,
  Trash2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Zap,
  Bot,
  X,
  Compass,
  History,
  Layers,
  Wrench,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Flame,
  Activity,
  Box,
} from 'lucide-react';
import { CauchyCondition, SolverEngine, PreAnalysisResult, DimensionMode } from '../types';
import { PreAnalyzer } from './PreAnalyzer';

interface EquationInputWindowProps {
  dimensionMode: DimensionMode;
  onChangeDimensionMode: (mode: DimensionMode) => void;
  equation: string;
  onChangeEquation: (eq: string) => void;
  cauchy: CauchyCondition;
  onChangeCauchy: (c: CauchyCondition) => void;
  hasCauchy: boolean;
  onToggleCauchy: (enabled: boolean) => void;
  engine: SolverEngine;
  onChangeEngine: (engine: SolverEngine) => void;
  onSolve: () => void;
  isSolving: boolean;
  onCancel?: () => void;
  currentRequestText?: string;
  attempt?: number;
  maxAttempts?: number;
  onLoadPreset: (eq: string, cauchy?: CauchyCondition) => void;
  preAnalysis?: PreAnalysisResult | null;
  onOpenHistory?: () => void;
  onOpenAnalyzer?: () => void;
}

export const EquationInputWindow: React.FC<EquationInputWindowProps> = ({
  dimensionMode,
  onChangeDimensionMode,
  equation,
  onChangeEquation,
  cauchy,
  onChangeCauchy,
  hasCauchy,
  onToggleCauchy,
  engine,
  onChangeEngine,
  onSolve,
  isSolving,
  onCancel,
  currentRequestText,
  attempt = 1,
  maxAttempts = 3,
  onLoadPreset,
  preAnalysis,
  onOpenHistory,
  onOpenAnalyzer,
}) => {
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [showEmbeddedAnalyzer, setShowEmbeddedAnalyzer] = useState(true);

  const mathSymbols2D = [
    { label: "y'", insert: "y'" },
    { label: "y''", insert: "y''" },
    { label: "dy/dx", insert: "dy/dx" },
    { label: "e^x", insert: "e^x" },
    { label: "sin(x)", insert: "sin(x)" },
    { label: "cos(x)", insert: "cos(x)" },
    { label: "ln(x)", insert: "ln(x)" },
    { label: "√x", insert: "sqrt(x)" },
    { label: "x²", insert: "x^2" },
    { label: "y²", insert: "y^2" },
    { label: "y/x", insert: "y/x" },
    { label: "+", insert: " + " },
    { label: "-", insert: " - " },
    { label: "*", insert: " * " },
    { label: "/", insert: " / " },
    { label: "=", insert: " = " },
  ];

  const mathSymbols3D = [
    { label: "∂T/∂t", insert: "∂T/∂t" },
    { label: "∇²T", insert: "∇²T" },
    { label: "∂²u/∂t²", insert: "∂²u/∂t²" },
    { label: "∇²u", insert: "∇²u" },
    { label: "∇²Φ", insert: "∇²Φ" },
    { label: "dx/dt", insert: "dx/dt" },
    { label: "dy/dt", insert: "dy/dt" },
    { label: "dz/dt", insert: "dz/dt" },
    { label: "y'''", insert: "y'''" },
    { label: "x²", insert: "x^2" },
    { label: "y²", insert: "y^2" },
    { label: "z²", insert: "z^2" },
    { label: "r²", insert: "(x^2+y^2+z^2)" },
    { label: "+", insert: " + " },
    { label: "-", insert: " - " },
    { label: "=", insert: " = " },
  ];

  const symbolsToDisplay = dimensionMode === '3D' ? mathSymbols3D : mathSymbols2D;

  const handleInsert = (sym: string) => {
    onChangeEquation(equation + sym);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSolve();
    }
  };

  const quickSamples2D = [
    { label: "Осциллятор с затуханием", eq: "y'' + 2*y' + 10*y = 5*cos(2*x)", cauchy: { x0: "0", y0: "3", yp0: "0" } },
    { label: "Свободные гармонические", eq: "y'' + 9*y = 0", cauchy: { x0: "0", y0: "2", yp0: "1" } },
    { label: "Экспоненциальный рост", eq: "y' = 2*x*y", cauchy: { x0: "0", y0: "1", yp0: "0" } },
    { label: "Ван дер Поль (GPU)", eq: "y'' - 2*(1 - y^2)*y' + y = 0", cauchy: { x0: "0", y0: "0.5", yp0: "0" } },
    { label: "Линейное неоднородное", eq: "y' + 2*y = 4*x", cauchy: { x0: "0", y0: "1", yp0: "0" } },
  ];

  const quickSamples3D = [
    { label: "3D Теплопроводность Фурье", eq: "∂T/∂t = a² · (∂²T/∂x² + ∂²T/∂y² + ∂²T/∂z²)", cauchy: { x0: "0", y0: "0", z0: "0", t0: "0.5" } },
    { label: "3D Волновое (Д'Аламбер)", eq: "∂²u/∂t² = c² · (∂²u/∂x² + ∂²u/∂y² + ∂²u/∂z²)", cauchy: { x0: "0", y0: "0", z0: "0", t0: "1.5" } },
    { label: "3D Аттрактор Лоренца (Хаос)", eq: "dx/dt = σ(y - x), dy/dt = x(ρ - z) - y, dz/dt = xy - βz", cauchy: { x0: "1", y0: "1", z0: "20" } },
    { label: "3D Лаплас & Пуассон", eq: "∇²Φ = -ρ(x,y,z)/ε₀", cauchy: { x0: "1", y0: "0", z0: "0" } },
    { label: "3D ОДУ 3-го порядка (Балка)", eq: "y''' + 2*y'' + y' + 2*y = 0", cauchy: { x0: "0", y0: "1", yp0: "0", zp0: "-1" } },
  ];

  const activeSamples = dimensionMode === '3D' ? quickSamples3D : quickSamples2D;

  return (
    <div className="flex flex-col gap-3.5 text-slate-200">
      {/* 2D vs 3D Dimension Mode Switcher Tab */}
      <div className="flex items-center justify-between bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-1.5 w-full">
          <button
            type="button"
            onClick={() => onChangeDimensionMode('2D')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              dimensionMode === '2D'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20 border border-cyan-400/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2D Режим (Обыкновенные ДУ)</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeDimensionMode('3D')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              dimensionMode === '3D'
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-slate-950 shadow-lg shadow-orange-500/25 border border-orange-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Flame className="w-4 h-4 fill-current" />
            <span>3D Режим (Физика, Поля & Тепловая Карта)</span>
          </button>
        </div>
      </div>

      {/* Primary Input Card */}
      <div className="flex flex-col gap-2 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 focus-within:border-cyan-500/80 transition-colors shadow-sm">
        <div className="flex items-center justify-between">
          <label htmlFor="ode-input" className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            {dimensionMode === '3D' ? '3D Дифференциальное уравнение / Уравнение матфизики:' : 'Дифференциальное уравнение (2D):'}
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChangeEquation('')}
              title="Очистить поле"
              className="text-slate-500 hover:text-rose-400 text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Очистить</span>
            </button>
          </div>
        </div>

        <div className="relative">
          <input
            id="ode-input"
            type="text"
            value={equation}
            onChange={(e) => onChangeEquation(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSolving}
            placeholder={
              dimensionMode === '3D'
                ? "например: ∂T/∂t = a² · (∂²T/∂x² + ∂²T/∂y² + ∂²T/∂z²) или dx/dt = σ(y - x)"
                : "например: y'' + 2*y' + 10*y = 5*cos(2*x)"
            }
            className="w-full bg-slate-950 px-4 py-3 rounded-xl border border-slate-700/80 text-cyan-300 font-mono text-base focus:outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-inner placeholder:text-slate-600 disabled:opacity-60"
          />
        </div>

        {/* Quick Math Keyboard */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="text-[11px] text-slate-500">
              {dimensionMode === '3D' ? '3D Символьная клавиатура частных производных и операторов:' : 'Символьная клавиатура быстрой вставки:'}
            </span>
            <button
              type="button"
              onClick={() => setShowKeyboard(!showKeyboard)}
              className="text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center gap-0.5 cursor-pointer"
            >
              {showKeyboard ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>{showKeyboard ? 'Свернуть' : 'Развернуть'}</span>
            </button>
          </div>

          {showKeyboard && (
            <div className="grid grid-cols-8 gap-1.5 pt-1">
              {symbolsToDisplay.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleInsert(item.insert)}
                  disabled={isSolving}
                  className="py-1.5 px-2 bg-slate-800/80 hover:bg-slate-700 active:bg-cyan-600 text-slate-200 hover:text-white rounded-lg text-xs font-mono font-semibold border border-slate-700/60 hover:border-cyan-500/40 transition-all text-center cursor-pointer disabled:opacity-40"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pre-Analyzer Live Component */}
      {preAnalysis && (
        <div className="flex flex-col gap-2 bg-slate-900/60 p-4 rounded-2xl border border-cyan-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Преданализатор ДУ
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                {preAnalysis.detectedType}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowEmbeddedAnalyzer(!showEmbeddedAnalyzer)}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              {showEmbeddedAnalyzer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{showEmbeddedAnalyzer ? 'Скрыть детали' : 'Показать разбор'}</span>
            </button>
          </div>

          {showEmbeddedAnalyzer && (
            <div className="pt-1">
              <PreAnalyzer
                analysis={preAnalysis}
                selectedEngine={engine}
                onSelectEngine={onChangeEngine}
                compact={false}
              />
            </div>
          )}
        </div>
      )}

      {/* Cauchy Initial Conditions Panel */}
      <div className="flex flex-col gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasCauchy}
              onChange={(e) => onToggleCauchy(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950 accent-cyan-500 cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-200">
              {dimensionMode === '3D' ? 'Начальные / Граничные условия (Задача Коши 3D)' : 'Задача Коши (Начальные условия для частного решения)'}
            </span>
          </label>
        </div>

        {hasCauchy && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1 border-t border-slate-800/60">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-400 font-mono">Точка x₀:</span>
              <input
                type="text"
                value={cauchy.x0}
                onChange={(e) => onChangeCauchy({ ...cauchy, x0: e.target.value })}
                placeholder="0"
                className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono text-cyan-300 focus:border-cyan-500 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-400 font-mono">Значение y(x₀) / y₀:</span>
              <input
                type="text"
                value={cauchy.y0}
                onChange={(e) => onChangeCauchy({ ...cauchy, y0: e.target.value })}
                placeholder="1"
                className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono text-cyan-300 focus:border-cyan-500 outline-none"
              />
            </div>
            {dimensionMode === '3D' ? (
              <>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400 font-mono">Координата z₀:</span>
                  <input
                    type="text"
                    value={cauchy.z0 || ''}
                    onChange={(e) => onChangeCauchy({ ...cauchy, z0: e.target.value })}
                    placeholder="0"
                    className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono text-cyan-300 focus:border-cyan-500 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400 font-mono">Время t₀:</span>
                  <input
                    type="text"
                    value={cauchy.t0 || ''}
                    onChange={(e) => onChangeCauchy({ ...cauchy, t0: e.target.value })}
                    placeholder="0.5"
                    className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono text-cyan-300 focus:border-cyan-500 outline-none"
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs text-slate-400 font-mono">Производная y'(x₀):</span>
                <input
                  type="text"
                  value={cauchy.yp0 || ''}
                  onChange={(e) => onChangeCauchy({ ...cauchy, yp0: e.target.value })}
                  placeholder="для 2-го порядка (напр. 0)"
                  className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono text-cyan-300 focus:border-cyan-500 outline-none"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Solve Button & In-Flight Status Area */}
      <div className="flex flex-col gap-3 pt-1">
        {isSolving ? (
          <div className="flex flex-col gap-2 p-3 bg-slate-900/90 rounded-2xl border border-cyan-500/40 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 rounded-full border-2 border-slate-700 border-t-cyan-400 animate-spin" />
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-cyan-300 truncate">
                    {currentRequestText || (engine === 'ai' ? 'Символьный расчет в AI Gemini...' : 'Вычисление решения...')}
                  </span>
                  {engine === 'ai' && (
                    <span className="text-[10px] text-slate-400">
                      Попытка {attempt} из {maxAttempts} • Обращение к CAS API
                    </span>
                  )}
                </div>
              </div>

              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 hover:text-white border border-rose-700/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Отмена</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={onSolve}
            disabled={!equation.trim()}
            className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all duration-200 shadow-lg ${
              !equation.trim()
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : dimensionMode === '3D'
                ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 shadow-orange-500/25 active:scale-[0.99] cursor-pointer'
                : engine === 'cpu'
                ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/25 active:scale-[0.99] cursor-pointer'
                : engine === 'gpu'
                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-slate-950 shadow-emerald-500/25 active:scale-[0.99] cursor-pointer'
                : 'bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 hover:from-cyan-400 hover:via-sky-400 hover:to-indigo-500 text-slate-950 shadow-cyan-500/25 active:scale-[0.99] cursor-pointer'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>
              {dimensionMode === '3D'
                ? `РАССЧИТАТЬ 3D ДУ & ПОСТРОИТЬ ТЕПЛОВУЮ КАРТУ (${engine.toUpperCase()})`
                : `РЕШИТЬ 2D ОДУ (${engine === 'cpu' ? 'CPU Offline' : engine === 'gpu' ? 'GPU WebGL' : 'AI Gemini CAS'})`}
            </span>
          </button>
        )}

        {/* Quick presets row */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>{dimensionMode === '3D' ? 'Распространенные физические 3D системы:' : 'Быстрые примеры 2D:'}</span>
            {onOpenHistory && (
              <button
                type="button"
                onClick={onOpenHistory}
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-xs cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>Открыть Историю</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeSamples.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onLoadPreset(s.eq, s.cauchy)}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-600/50 rounded-lg text-xs font-mono transition-colors cursor-pointer"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
