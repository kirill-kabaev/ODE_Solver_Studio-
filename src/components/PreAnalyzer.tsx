import React from 'react';
import {
  Cpu,
  Zap,
  Bot,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Info,
  Layers,
  Wrench,
  Compass,
} from 'lucide-react';
import { PreAnalysisResult, SolverEngine } from '../types';

interface PreAnalyzerProps {
  analysis: PreAnalysisResult;
  selectedEngine: SolverEngine;
  onSelectEngine: (engine: SolverEngine) => void;
  compact?: boolean;
}

export const PreAnalyzer: React.FC<PreAnalyzerProps> = ({
  analysis,
  selectedEngine,
  onSelectEngine,
  compact = false,
}) => {
  const engineCards = [
    {
      id: 'cpu' as SolverEngine,
      name: 'CPU Ядро (Local)',
      icon: <Cpu className="w-4 h-4" />,
      capable: analysis.cpuCapable,
      speed: 'Мгновенно (< 5 мс)',
      desc: 'Точные символьные формулы для линейных ОДУ 1 и 2 порядка с постоянными коэффициентами. Офлайн без сети.',
      color: 'amber',
      accentBg: 'bg-amber-500/10 border-amber-500/40 text-amber-300',
    },
    {
      id: 'gpu' as SolverEngine,
      name: 'GPU Шейдеры (WebGL)',
      icon: <Zap className="w-4 h-4" />,
      capable: analysis.gpuCapable,
      speed: 'Ультра-быстро 60 FPS',
      desc: 'Интегрирование Рунге-Кутты 4-го порядка, векторные поля направлений, автоколебания и предельные циклы.',
      color: 'emerald',
      accentBg: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300',
    },
    {
      id: 'ai' as SolverEngine,
      name: 'AI Gemini CAS',
      icon: <Bot className="w-4 h-4" />,
      capable: analysis.aiCapable,
      speed: 'Аналитически ~1-2 сек',
      desc: 'Универсальное символьное ядро: любые порядки, нелинейные системы, Бернулли, Эйлер, точный вывод в LaTeX.',
      color: 'cyan',
      accentBg: 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300',
    },
  ];

  return (
    <div className="flex flex-col gap-3 text-slate-200">
      {/* Header Recommendation Banner */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col gap-2 shadow-md">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Преданализ уравнения
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-cyan-800/40 font-mono">
                  {analysis.detectedType}
                </span>
              </div>
            </div>
          </div>

          {/* Engine recommendation tag */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-950/80 to-indigo-950/80 border border-cyan-500/40 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Рекомендуется:</span>
            <span className="font-bold text-cyan-300 uppercase">
              {analysis.recommendedEngine === 'cpu' && 'CPU (Local)'}
              {analysis.recommendedEngine === 'gpu' && 'GPU (Шейдеры)'}
              {analysis.recommendedEngine === 'ai' && 'AI Gemini CAS'}
            </span>
          </div>
        </div>

        {/* Detailed recommendation explanation */}
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
          {analysis.engineRecommendationReason}
        </p>
      </div>

      {/* 3 Engine Cards: Capability breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {engineCards.map((card) => {
          const isSelected = selectedEngine === card.id;
          const isRecommended = analysis.recommendedEngine === card.id;

          return (
            <div
              key={card.id}
              onClick={() => onSelectEngine(card.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative ${
                isSelected
                  ? 'bg-slate-900 border-cyan-400/80 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400/30'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              {isRecommended && (
                <div className="absolute -top-2 right-2 px-1.5 py-0.2 bg-cyan-500 text-slate-950 rounded text-[9px] font-extrabold uppercase tracking-tight shadow">
                  Оптимально
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={isSelected ? 'text-cyan-400' : 'text-slate-400'}>
                      {card.icon}
                    </span>
                    <span className="text-xs font-bold text-slate-200">{card.name}</span>
                  </div>

                  {card.capable ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      Поддерживается
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-amber-400/90 font-medium">
                      <AlertCircle className="w-3 h-3" />
                      Ограничено
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-snug mb-2">{card.desc}</p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                <span className="text-slate-500">{card.speed}</span>
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {isSelected ? 'Выбрано' : 'Выбрать'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Properties & Real-world Physical Applications (if not compact) */}
      {!compact && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          {/* Mathematical Properties */}
          <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/80">
            <h5 className="font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5 text-xs">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Математические свойства:
            </h5>
            <ul className="flex flex-col gap-1 text-slate-400">
              {analysis.properties.map((prop, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-indigo-400 font-mono text-[10px] mt-0.5">•</span>
                  <span>{prop}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Physical & Engineering Applications */}
          <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/80">
            <h5 className="font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5 text-xs">
              <Wrench className="w-3.5 h-3.5 text-emerald-400" />
              Физический смысл и применение:
            </h5>
            <ul className="flex flex-col gap-1 text-slate-400">
              {analysis.physicalApplications.map((app, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-mono text-[10px] mt-0.5">•</span>
                  <span>{app}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
