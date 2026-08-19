// ============================================================================
// Master Blade Element Momentum (BEM) Aerodynamics Suite
// Covers Propellers, Impellers/Ducted Fans, and Multirotor Drone Rotors.
// ============================================================================

import React, { useMemo, useState } from 'react';
import {
  Disc,
  Bookmark,
  Sliders,
  TrendingUp,
  Activity,
  Zap,
  BookOpen,
  Layers,
  Compass,
  RotateCcw,
} from 'lucide-react';
import {
  BEM_PRESETS,
  solveBladeElementMomentum,
  AIRFOIL_POLARS,
} from './bemSolver';
import {
  BemPreset,
  DroneFlightProfile,
  FlowOperatingCondition,
  RotorGeometryConfig,
} from './bemTypes';
import { Rotor3DVisualizer } from './Rotor3DVisualizer';
import { RadialPlotsCanvas } from './RadialPlotsCanvas';
import { PerformanceCurvesCanvas } from './PerformanceCurvesCanvas';
import { DroneFlightEnvelope } from './DroneFlightEnvelope';
import { DuctedFanAnalysis } from './DuctedFanAnalysis';
import { BladeGeometryCanvas } from './BladeGeometryCanvas';

export const BladeElementMomentumModule: React.FC = () => {
  // Preset Selection State
  const [selectedPresetId, setSelectedPresetId] = useState<string>(BEM_PRESETS[0].id);

  // Active Rotor Geometry Configuration
  const [config, setConfig] = useState<RotorGeometryConfig>(BEM_PRESETS[0].config);

  // Active Flow State
  const [flow, setFlow] = useState<FlowOperatingCondition>(BEM_PRESETS[0].defaultFlow);

  // Drone Flight Profile State
  const [droneProfile, setDroneProfile] = useState<DroneFlightProfile>(
    BEM_PRESETS[0].defaultDroneProfile || {
      numRotors: 4,
      allUpWeightKg: 0.8,
      batteryVoltageVolts: 22.2,
      batteryCapacityMah: 1500,
      batteryEnergyWh: 33.3,
      motorKv: 1900,
      motorInternalResistanceOhms: 0.045,
      escEfficiency: 0.95,
      payloadMassKg: 0.15,
    }
  );

  // Active Analysis Workspace Tab
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<
    'radial_plots' | 'performance_polars' | 'drone_flight' | 'ducted_fan' | 'blade_cad' | 'theory'
  >('radial_plots');

  // Apply Selected Preset
  const handleApplyPreset = (preset: BemPreset) => {
    setSelectedPresetId(preset.id);
    setConfig(preset.config);
    setFlow(preset.defaultFlow);
    if (preset.defaultDroneProfile) {
      setDroneProfile(preset.defaultDroneProfile);
    }
  };

  // Run BEM Physics Numerical Solver
  const bemResults = useMemo(() => {
    return solveBladeElementMomentum(config, flow);
  }, [config, flow]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner: BEM Theory & Executive Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-800/60 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-md">
                <Disc className="w-5 h-5 animate-spin-slow" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>BEM: Винты, Импеллеры и Дроны (Blade Element Momentum)</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
                  Теория Лопасти & Импульса
                </span>
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Аэродинамический расчет воздушных винтов, импеллеров в кольцевом канале (EDF) и несущих роторов БПЛА.
              Учет осевой и тангенциальной индукции $(a, a')$, концевых потерь Прандтля $F$, поправки Глауэрта на турбулентный след и сжимаемости потока.
            </p>
          </div>

          {/* Quick Real-Time Solver Telemetry */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="bg-slate-950/80 px-3.5 py-2 rounded-xl border border-indigo-800/80 text-xs font-mono">
              <span className="text-slate-400">Тяга $T$: </span>
              <span className="text-cyan-400 font-bold text-sm">
                {bemResults.totalThrustNewtons.toFixed(1)} Н
              </span>
            </div>
            <div className="bg-slate-950/80 px-3.5 py-2 rounded-xl border border-indigo-800/80 text-xs font-mono">
              <span className="text-slate-400">Мощность $P$: </span>
              <span className="text-amber-400 font-bold text-sm">
                {bemResults.shaftPowerWatts < 1000
                  ? `${bemResults.shaftPowerWatts.toFixed(0)} Вт`
                  : `${(bemResults.shaftPowerWatts / 1000).toFixed(2)} кВт`}
              </span>
            </div>
            <div className="bg-slate-950/80 px-3.5 py-2 rounded-xl border border-indigo-800/80 text-xs font-mono">
              <span className="text-slate-400">КПД / FM: </span>
              <span className="text-emerald-400 font-bold text-sm">
                {flow.airspeedMs > 1.0
                  ? `η=${(bemResults.propulsiveEfficiency * 100).toFixed(0)}%`
                  : `FM=${(bemResults.figureOfMerit_FM * 100).toFixed(0)}%`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Selector Carousel */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold font-mono text-slate-400 flex items-center gap-1.5 uppercase">
            <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
            <span>Каталог Пресетов: FPV Дроны, VTOL, Авиация, Импеллеры & Соосные Винты</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Выберите для быстрой загрузки геометрии и режима</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {BEM_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 relative overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-br from-indigo-950/90 via-slate-900 to-cyan-950/90 border-cyan-400/80 shadow-lg shadow-indigo-950/50 ring-1 ring-cyan-400/40'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold border ${
                        isSelected
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {preset.badge}
                    </span>
                    <span className="text-[10px] font-mono text-purple-400 font-bold">
                      {preset.config.numBlades} лоп.
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{preset.name}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                    {preset.description}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5 mt-1">
                  <span>D={(preset.config.diameterMeters * 1000).toFixed(0)} мм</span>
                  <span className="text-cyan-400 font-bold">{preset.defaultFlow.rpm.toLocaleString()} RPM</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Analysis Workspace: 3D Visualizer (Left) + Parameter Controls (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3D Interactive Rotor & Slipstream Stage (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Disc className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white">
                3D Динамическая Сцена: Вращение & Спутная Струя
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              $V_{`{tip}`} = {bemResults.tipSpeedMs.toFixed(0)}$ м/с (M = {bemResults.tipMachNumber.toFixed(2)})
            </span>
          </div>

          {/* Interactive 3D Visualizer Component */}
          <Rotor3DVisualizer config={config} flow={flow} results={bemResults} />

          {/* Global Rotor Dimensional Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Ометаемая Площадь $A$:</span>
              <span className="text-cyan-400 font-bold text-sm">
                {bemResults.diskArea.toFixed(3)} м²
              </span>
            </div>
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Крутящий Момент $Q$:</span>
              <span className="text-rose-400 font-bold text-sm">
                {bemResults.totalTorqueNm.toFixed(3)} Н·м
              </span>
            </div>
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Густота Решетки $\sigma$:</span>
              <span className="text-purple-400 font-bold text-sm">
                {bemResults.meanSolidity.toFixed(3)}
              </span>
            </div>
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Поступь $J$:</span>
              <span className="text-emerald-400 font-bold text-sm">
                {bemResults.advanceRatio_J.toFixed(3)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Rotor Geometry & Flow Control Sliders (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Sliders className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white">Параметры Винта & Режима</h3>
            </div>
            <button
              type="button"
              onClick={() => handleApplyPreset(BEM_PRESETS[0])}
              className="text-[11px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Сброс</span>
            </button>
          </div>

          <div className="space-y-3.5 text-xs font-mono">
            {/* RPM Slider */}
            <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <div className="flex justify-between text-slate-300">
                <span className="font-bold text-cyan-400">Частота вращения (RPM):</span>
                <span className="text-cyan-400 font-black text-sm">{flow.rpm.toLocaleString()} об/мин</span>
              </div>
              <input
                type="range"
                min={500}
                max={50000}
                step={100}
                value={flow.rpm}
                onChange={(e) => setFlow({ ...flow, rpm: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>500 (Крупный винт)</span>
                <span>50,000 (EDF / Микро)</span>
              </div>
            </div>

            {/* Flight Airspeed V_inf Slider */}
            <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <div className="flex justify-between text-slate-300">
                <span className="font-bold text-indigo-400">Скорость полета ($V_\infty$):</span>
                <span className="text-indigo-300 font-black text-sm">
                  {flow.airspeedMs.toFixed(1)} м/с ({(flow.airspeedMs * 3.6).toFixed(0)} км/ч)
                </span>
              </div>
              <input
                type="range"
                min={0.0}
                max={120.0}
                step={1.0}
                value={flow.airspeedMs}
                onChange={(e) => setFlow({ ...flow, airspeedMs: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.0 (Статика / Hover)</span>
                <span>120 м/с (432 км/ч)</span>
              </div>
            </div>

            {/* Diameter & Number of Blades */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>Диаметр (D):</span>
                  <span className="text-white font-bold">
                    {(config.diameterMeters * 1000).toFixed(0)} мм ({(config.diameterMeters * 39.37).toFixed(1)}")
                  </span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={2.5}
                  step={0.01}
                  value={config.diameterMeters}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      diameterMeters: parseFloat(e.target.value),
                      hubRadiusMeters: parseFloat(e.target.value) * 0.1,
                    })
                  }
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>Число лопастей (B):</span>
                  <span className="text-white font-bold">{config.numBlades} лоп.</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={14}
                  step={1}
                  value={config.numBlades}
                  onChange={(e) =>
                    setConfig({ ...config, numBlades: parseInt(e.target.value, 10) })
                  }
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-400"
                />
              </div>
            </div>

            {/* Twist: Root Twist & Tip Twist */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>Крутка в корне $\theta_{`{root}`}$:</span>
                  <span className="text-white font-bold">{config.rootTwistDeg.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min={10.0}
                  max={55.0}
                  step={0.5}
                  value={config.rootTwistDeg}
                  onChange={(e) =>
                    setConfig({ ...config, rootTwistDeg: parseFloat(e.target.value) })
                  }
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>Крутка на конце $\theta_{`{tip}`}$:</span>
                  <span className="text-white font-bold">{config.tipTwistDeg.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={40.0}
                  step={0.5}
                  value={config.tipTwistDeg}
                  onChange={(e) =>
                    setConfig({ ...config, tipTwistDeg: parseFloat(e.target.value) })
                  }
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-400"
                />
              </div>
            </div>

            {/* Chords: Root Chord & Tip Chord */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>Корневая хорда $c_{`{root}`}$:</span>
                  <span className="text-white font-bold">
                    {(config.rootChordMeters * 1000).toFixed(0)} мм
                  </span>
                </div>
                <input
                  type="range"
                  min={0.005}
                  max={0.3}
                  step={0.002}
                  value={config.rootChordMeters}
                  onChange={(e) =>
                    setConfig({ ...config, rootChordMeters: parseFloat(e.target.value) })
                  }
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>Концевая хорда $c_{`{tip}`}$:</span>
                  <span className="text-white font-bold">
                    {(config.tipChordMeters * 1000).toFixed(0)} мм
                  </span>
                </div>
                <input
                  type="range"
                  min={0.003}
                  max={0.2}
                  step={0.002}
                  value={config.tipChordMeters}
                  onChange={(e) =>
                    setConfig({ ...config, tipChordMeters: parseFloat(e.target.value) })
                  }
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-400"
                />
              </div>
            </div>

            {/* Collective Pitch & Airfoil Selection */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>Общий шаг (Коллектив):</span>
                  <span className="text-emerald-400 font-bold">{flow.pitchControlDeg.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min={-10.0}
                  max={15.0}
                  step={0.5}
                  value={flow.pitchControlDeg}
                  onChange={(e) =>
                    setFlow({ ...flow, pitchControlDeg: parseFloat(e.target.value) })
                  }
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-400"
                />
              </div>

              <div className="space-y-1">
                <span className="text-slate-300 text-[11px] block">Профиль Лопасти:</span>
                <select
                  value={config.airfoilType}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      airfoilType: e.target.value as any,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded p-1 text-[11px] font-mono cursor-pointer"
                >
                  <option value="NACA_4412">NACA 4412 (Винтовой)</option>
                  <option value="Clark_Y">Clark Y (Авиационный)</option>
                  <option value="NACA_0012">NACA 0012 (Симметричный)</option>
                  <option value="Eppler_E387">Eppler E387 (Low Re)</option>
                  <option value="DJI_Prop_Profile">DJI Blade (Дрон)</option>
                  <option value="High_Camber_Fan">High Camber Fan (EDF)</option>
                </select>
              </div>
            </div>

            {/* Ducted & Coaxial Architecture Toggles */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfig({ ...config, isDucted: !config.isDucted })}
                className={`py-2 px-3 rounded-xl border text-left font-bold transition-all cursor-pointer flex items-center justify-between ${
                  config.isDucted
                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700 shadow-md'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <span>Кольцевой канал (EDF)</span>
                <span className="text-[10px]">{config.isDucted ? 'ВКЛ' : 'ВЫКЛ'}</span>
              </button>

              <button
                type="button"
                onClick={() => setConfig({ ...config, isCoaxial: !config.isCoaxial })}
                className={`py-2 px-3 rounded-xl border text-left font-bold transition-all cursor-pointer flex items-center justify-between ${
                  config.isCoaxial
                    ? 'bg-purple-950/80 text-purple-300 border-purple-700 shadow-md'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <span>Соосная схема (Twin)</span>
                <span className="text-[10px]">{config.isCoaxial ? 'ВКЛ' : 'ВЫКЛ'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Tab Deep Analysis Workspace */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 flex items-center justify-start gap-1.5 overflow-x-auto shadow-lg">
          <button
            type="button"
            onClick={() => setActiveAnalysisTab('radial_plots')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeAnalysisTab === 'radial_plots'
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>1. Эпюры по Размаху ($dT, dQ, c_l, \alpha$)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAnalysisTab('performance_polars')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeAnalysisTab === 'performance_polars'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>2. Поляры Винта $\eta(J), C_T, C_P$</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAnalysisTab('drone_flight')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeAnalysisTab === 'drone_flight'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>3. Летный Конверт Дрона & АКБ</span>
          </button>

          {config.isDucted && (
            <button
              type="button"
              onClick={() => setActiveAnalysisTab('ducted_fan')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeAnalysisTab === 'ducted_fan'
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Disc className="w-4 h-4" />
              <span>4. Анализ Кольцевого Канала (EDF)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveAnalysisTab('blade_cad')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeAnalysisTab === 'blade_cad'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>5. Геометрия Лопасти & Профиль</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAnalysisTab('theory')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeAnalysisTab === 'theory'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>6. Научная Теория BEM (LaTeX)</span>
          </button>
        </div>

        {/* Tab 1: Radial Loading Plots */}
        {activeAnalysisTab === 'radial_plots' && (
          <RadialPlotsCanvas results={bemResults} />
        )}

        {/* Tab 2: Performance Polars */}
        {activeAnalysisTab === 'performance_polars' && (
          <PerformanceCurvesCanvas results={bemResults} />
        )}

        {/* Tab 3: Drone Flight Envelope */}
        {activeAnalysisTab === 'drone_flight' && (
          <DroneFlightEnvelope
            bemResults={bemResults}
            config={config}
            flow={flow}
            profile={droneProfile}
            onProfileChange={setDroneProfile}
          />
        )}

        {/* Tab 4: Ducted Fan Internal Aero */}
        {activeAnalysisTab === 'ducted_fan' && config.isDucted && (
          <DuctedFanAnalysis
            bemResults={bemResults}
            config={config}
            flow={flow}
            onConfigChange={setConfig}
          />
        )}

        {/* Tab 5: Blade CAD Planform & Airfoil */}
        {activeAnalysisTab === 'blade_cad' && (
          <BladeGeometryCanvas config={config} />
        )}

        {/* Tab 6: Scientific Handbook & LaTeX Formulas */}
        {activeAnalysisTab === 'theory' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                Математическая Модель Blade Element Momentum (BEM)
              </h3>
              <p className="text-xs text-slate-400">
                Полная формулировка уравнений импульса, аэродинамики элементов лопасти и поправок
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-cyan-400 font-bold text-sm block">1. Дисковая Теория Импульса (1D)</span>
                <p className="text-slate-300 leading-relaxed">
                  Тяга $dT$ и крутящий момент $dQ$ на кольцевом элементе радиуса $r$ шириной $dr$:
                </p>
                <div className="bg-slate-900 p-2.5 rounded-lg text-emerald-300 text-[11px] overflow-x-auto whitespace-pre">
                  {"$$dT_{mom} = 4 \\pi \\rho r V_\\infty^2 (1 + a) a F \\, dr$$\n$$dQ_{mom} = 4 \\pi \\rho r^3 V_\\infty \\Omega (1 + a) a' F \\, dr$$"}
                </div>
                <p className="text-slate-400 text-[11px]">
                  где $a$ — коэффициент осевой индукции, $a'$ — коэффициент тангенциальной закрутки струи, $F$ — суммарный фактор потерь Прандтля.
                </p>
              </div>

              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-purple-400 font-bold text-sm block">2. Аэродинамика Элемента Лопасти</span>
                <p className="text-slate-300 leading-relaxed">
                  Треугольник скоростей в сечении $r$ и аэродинамические силы на $B$ лопастях:
                </p>
                <div className="bg-slate-900 p-2.5 rounded-lg text-purple-300 text-[11px] overflow-x-auto whitespace-pre">
                  {"$$\\tan\\phi = \\frac{V_\\infty (1 + a)}{\\Omega r (1 - a')}, \\quad \\alpha = \\theta(r) - \\phi$$\n$$dT_{be} = \\frac{1}{2} \\rho V_{rel}^2 B c(r) (C_l \\cos\\phi - C_d \\sin\\phi) \\, dr$$"}
                </div>
                <p className="text-slate-400 text-[11px]">
                  где $\phi$ — угол скоса набегающего потока, $\alpha$ — эффективный угол атаки профиля, $c(r)$ — локальная хорда.
                </p>
              </div>

              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-amber-400 font-bold text-sm block">3. Поправка Глауэрта на Турбулентный След</span>
                <p className="text-slate-300 leading-relaxed">
                  При высокой нагрузке на винт ($a &gt; 0.33$) теория импульса расходится. Применяется квадратичная аппроксимация Глауэрта–Бюля:
                </p>
                <div className="bg-slate-900 p-2.5 rounded-lg text-amber-300 text-[11px] overflow-x-auto whitespace-pre">
                  {"$$C_T = 4 F \\left[ a_c^2 + (1 - 2 a_c) a \\right], \\quad a_c \\approx 0.33$$"}
                </div>
              </div>

              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-emerald-400 font-bold text-sm block">4. Концевые Потери Прандтля (Tip Loss)</span>
                <p className="text-slate-300 leading-relaxed">
                  Учет утечки давления через законцовки и перетекания вихрей:
                </p>
                <div className="bg-slate-900 p-2.5 rounded-lg text-cyan-300 text-[11px] overflow-x-auto whitespace-pre">
                  {"$$F_{tip} = \\frac{2}{\\pi} \\arccos\\left(\\exp\\left(-\\frac{B (R - r)}{2 R \\sin\\phi}\\right)\\right)$$\n$$F = F_{tip} \\cdot F_{hub}$$"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
