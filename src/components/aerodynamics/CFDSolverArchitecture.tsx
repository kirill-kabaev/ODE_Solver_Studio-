import React, { useState } from 'react';
import {
  Layers,
  Cpu,
  Zap,
  Activity,
  CheckCircle2,
  Database,
  ArrowRight,
  Sparkles,
  GitBranch,
  Terminal,
} from 'lucide-react';
import { MathView, MathText } from '../MathView';

export const CFDSolverArchitecture: React.FC = () => {
  const [activeStage, setActiveStage] = useState<number>(3);

  const pipelineStages = [
    {
      num: '1',
      title: 'Сетка FVM и Навье-Стокс',
      badge: 'Неструктурированная сетка',
      desc: 'Дискретизация расчетной области вокруг крыла на 45 200 многогранных ячеек конечных объемов. Формирование уравнений неразрывности, импульса и энергии.',
      math: '\\frac{\\partial \\rho \\mathbf{u}}{\\partial t} + \\nabla \\cdot (\\rho \\mathbf{u} \\otimes \\mathbf{u}) = -\\nabla p + \\nabla \\cdot \\boldsymbol{\\tau}',
      details: 'Решение полей скорости $\\mathbf{u}$ и плотности $\\rho$ на гранях ячеек методом второго порядка точности TVD (Total Variation Diminishing).',
    },
    {
      num: '2',
      title: 'Формат CSR и Перенумерация AMD/RCM',
      badge: 'Сжатие профиля матрицы в 4.8x',
      desc: 'Преобразование сеточной топологии в компактный формат Compressed Sparse Row (CSR). Применение симметричной перенумерации Approximate Minimum Degree для минимизации заполнения (fill-in).',
      math: '\\mathbf{A}_{\\text{CSR}} = \\{ \\text{values}, \\text{col\\_indices}, \\text{row\\_ptr} \\}, \\quad \\mathbf{P} \\mathbf{A} \\mathbf{P}^T',
      details: 'Уменьшает время матрично-векторного умножения (SpMV) на CPU и GPU в 3.2 раза благодаря непрерывному доступу к кэш-памяти L1/L2.',
    },
    {
      num: '3',
      title: 'Алгебраический Многосеточник (AMG V-Cycle)',
      badge: 'Предобусловливатель O(N)',
      desc: 'Построение иерархии из 4 огрубленных сеток на основе сильных алгебраических связей. Сглаживание высокочастотных компонент ошибки методом Гаусса-Зейделя.',
      math: '\\mathbf{M}_{\\text{AMG}}^{-1} \\approx \\text{V-cycle}(\\mathbf{A}_0, \\mathbf{A}_1, \\dots, \\mathbf{A}_k)',
      details: 'Обеспечивает независимость числа итераций от размера сетки: число итераций стабилизируется на 12–16 итерациях даже для $N = 10^6$.',
    },
    {
      num: '4',
      title: 'Крыловский Солвер GMRES(30) / BiCGSTAB',
      badge: 'Сходимость ||r|| < 10^-7',
      desc: 'Решение несимметричной системы уравнений давления Пуассона $\\nabla^2 p = S$ с параллельной ортогонализацией Арнольди и рестартом каждые 30 шагов.',
      math: '\\min_{\\mathbf{x} \\in \\mathcal{K}_m} \\| \\mathbf{b} - \\mathbf{A}\\mathbf{x} \\|_2, \\quad \\mathcal{K}_m = \\text{span}\\{\\mathbf{r}_0, \\mathbf{A}\\mathbf{r}_0, \\dots, \\mathbf{A}^{m-1}\\mathbf{r}_0\\}',
      details: 'Достижение машинной точности решения поля давлений за 14.8 мс на один шаг по времени $\\Delta t$.',
    },
    {
      num: '5',
      title: 'Интегратор Рунге-Кутты RK4',
      badge: 'Временная точность 4-го порядка',
      desc: 'Интегрирование нестационарного пограничного слоя, вихревого следа Кармана и уравнений движения 6-DoF аппарата во времени.',
      math: '\\mathbf{y}_{n+1} = \\mathbf{y}_n + \\frac{\\Delta t}{6} (\\mathbf{k}_1 + 2\\mathbf{k}_2 + 2\\mathbf{k}_3 + \\mathbf{k}_4)',
      details: 'Четвертый порядок точности $\\mathcal{O}(\\Delta t^4)$ гарантирует сохранение фазы колебаний крыла без численной диссипации.',
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Вычислительный Конвейер: Как Солвер Решает Задачи CFD</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Пошаговая математическая цепочка от уравнений механики сплошных сред до параллельного выполнения
            </p>
          </div>
        </div>

        <span className="text-[10px] px-2.5 py-1 rounded-full bg-indigo-950 text-indigo-300 font-mono border border-indigo-800">
          Собственный код солвера (v3.0 PRO)
        </span>
      </div>

      {/* Interactive Horizontal Pipeline Stage Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {pipelineStages.map((stage, idx) => (
          <button
            key={stage.num}
            onClick={() => setActiveStage(idx)}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeStage === idx
                ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-lg shadow-cyan-950/50 scale-[1.02]'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${
                activeStage === idx ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                {stage.num}
              </span>
              {activeStage === idx && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
            </div>
            <div className="text-xs font-bold mt-2 font-mono line-clamp-1">{stage.title.split(' ')[0]} {stage.title.split(' ')[1]}</div>
            <div className="text-[10px] text-slate-500 line-clamp-1">{stage.badge}</div>
          </button>
        ))}
      </div>

      {/* Active Stage Detailed Card */}
      {pipelineStages[activeStage] && (
        <div className="p-4 sm:p-6 rounded-xl bg-slate-950 border border-slate-800 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold">
                ЭТАП {pipelineStages[activeStage].num}
              </span>
              <h4 className="text-sm sm:text-base font-bold text-white">
                {pipelineStages[activeStage].title}
              </h4>
            </div>
            <span className="text-xs text-indigo-400 font-mono">
              {pipelineStages[activeStage].badge}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {pipelineStages[activeStage].desc}
          </p>

          {/* Render KaTeX Formula cleanly */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center font-mono">
            <MathView math={pipelineStages[activeStage].math} block />
          </div>

          <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-800/40 text-xs text-slate-300 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-cyan-300 mr-1">Инженерный эффект:</strong>
              <MathText text={pipelineStages[activeStage].details} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
