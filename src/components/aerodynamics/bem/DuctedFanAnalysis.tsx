// ============================================================================
// Ducted Fan (EDF) & Impeller Internal Aerodynamics Component
// Models shroud diffusion, lip suction, tip clearance penalties, and nozzle exit flow.
// ============================================================================

import React from 'react';
import { Disc, Gauge, ArrowRight, Activity, Percent } from 'lucide-react';
import { RotorBEMResults, RotorGeometryConfig, FlowOperatingCondition } from './bemTypes';

interface DuctedFanAnalysisProps {
  bemResults: RotorBEMResults;
  config: RotorGeometryConfig;
  flow: FlowOperatingCondition;
  onConfigChange: (newConfig: RotorGeometryConfig) => void;
}

export const DuctedFanAnalysis: React.FC<DuctedFanAnalysisProps> = ({
  bemResults,
  config,
  flow,
  onConfigChange,
}) => {
  const R = config.diameterMeters / 2;
  const diskArea = Math.PI * R * R;
  const massFlowRateKgS = flow.airDensity * diskArea * (flow.airspeedMs + bemResults.exitJetVelocityMs * 0.5);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Disc className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Аэродинамика Кольцевого Канала & Импеллера (Ducted Fan / EDF)
            </h3>
            <p className="text-xs text-slate-400">
              Эффект разгрузки законцовок (zero tip vortex), разрежение на губе обечайки и расширение диффузора
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
            Вклад Обечайки в Тягу: {bemResults.ductThrustRatio.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Internal Aero Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Тяга Корпуса (Duct):</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-cyan-400">
            {bemResults.ductThrustNewtons.toFixed(1)} Н
          </div>
          <span className="text-[10px] text-slate-500 block">
            Ротор: {bemResults.rotorThrustNewtons.toFixed(1)} Н
          </span>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Скорость Струи Сопла:</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">
            {bemResults.exitJetVelocityMs.toFixed(1)} м/с
          </div>
          <span className="text-[10px] text-slate-500 block">
            {(bemResults.exitJetVelocityMs * 3.6).toFixed(0)} км/ч на срезе сопла
          </span>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Перепад Давления $\Delta P$:</span>
            <Gauge className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-400">
            {bemResults.pressureRisePascals.toFixed(0)} Па
          </div>
          <span className="text-[10px] text-slate-500 block">
            {(bemResults.pressureRisePascals / 98.0665).toFixed(1)} мм вод. ст.
          </span>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Секундный Расход mass flow:</span>
            <Percent className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400">
            {massFlowRateKgS.toFixed(2)} кг/с
          </div>
          <span className="text-[10px] text-slate-500 block">Массовый поток воздуха</span>
        </div>
      </div>

      {/* Duct Geometry Tuning Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
        <div className="space-y-1">
          <div className="flex justify-between text-slate-300">
            <span>Расширение (A_exit / A_rotor):</span>
            <span className="text-cyan-400 font-bold">{config.ductAreaRatio.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.85}
            max={1.45}
            step={0.02}
            value={config.ductAreaRatio}
            onChange={(e) =>
              onConfigChange({ ...config, ductAreaRatio: parseFloat(e.target.value) })
            }
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0.85 (Сужающееся)</span>
            <span>1.45 (Диффузор)</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-slate-300">
            <span>Зазор законцовки (δ_tip):</span>
            <span className="text-purple-400 font-bold">{config.tipClearanceMm.toFixed(1)} мм</span>
          </div>
          <input
            type="range"
            min={0.2}
            max={5.0}
            step={0.1}
            value={config.tipClearanceMm}
            onChange={(e) =>
              onConfigChange({ ...config, tipClearanceMm: parseFloat(e.target.value) })
            }
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0.2 мм (Прецизионный)</span>
            <span>5.0 мм (Большой зазор)</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-slate-300">
            <span>Фактор тяги обечайки:</span>
            <span className="text-emerald-400 font-bold">{(config.ductThrustFactor * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={0.8}
            step={0.05}
            value={config.ductThrustFactor}
            onChange={(e) =>
              onConfigChange({ ...config, ductThrustFactor: parseFloat(e.target.value) })
            }
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>10%</span>
            <span>80%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
