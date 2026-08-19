import React, { useState, useCallback } from 'react';
import {
  Wind,
  Layers,
  AlertTriangle,
  Compass,
  Cpu,
  Activity,
  Sliders,
  Sparkles,
  Info,
  Box,
  BookOpen,
  Grid,
} from 'lucide-react';
import { VortexLatticeModule } from './VortexLatticeModule';
import { CFDWindTunnel } from './CFDWindTunnel';
import { PressureDistributionGraph } from './PressureDistributionGraph';
import { FlutterSimulator } from './FlutterSimulator';
import { FlightDynamics6DoF } from './FlightDynamics6DoF';
import { CFDSolverArchitecture } from './CFDSolverArchitecture';
import { SolverStatusMonitor } from './SolverStatusMonitor';
import { Full3DPlotViewer, Aerodynamic3DData } from './Full3DPlotViewer';
import { EngineeringPresetCatalog, EngineeringPreset, ENGINEERING_PRESETS } from './EngineeringPresetCatalog';
import { HandbookTopicId } from '../EngineeringHandbookModal';

export type AeroSubTab = 'presets' | 'vlm' | 'status_monitor' | 'wind_tunnel' | 'flutter' | '6dof' | 'architecture';

interface AerodynamicsModuleProps {
  onTabChange?: (tab: AeroSubTab) => void;
}

export const AerodynamicsModule: React.FC<AerodynamicsModuleProps> = ({ onTabChange }) => {
  const [activeTab, setActiveTab] = useState<AeroSubTab>('presets');
  const [selectedPreset, setSelectedPreset] = useState<EngineeringPreset>(ENGINEERING_PRESETS[0]);
  const [activeMach, setActiveMach] = useState<number>(ENGINEERING_PRESETS[0].mach);
  const [activeAlpha, setActiveAlpha] = useState<number>(ENGINEERING_PRESETS[0].alpha);

  const handleTabSelect = useCallback((tab: AeroSubTab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  }, [onTabChange]);

  const [latest3DData, setLatest3DData] = useState<Aerodynamic3DData | null>({
    mach: ENGINEERING_PRESETS[0].mach,
    alpha: ENGINEERING_PRESETS[0].alpha,
    liftCoeff: ENGINEERING_PRESETS[0].targetCl,
    dragCoeff: ENGINEERING_PRESETS[0].targetCd,
    momentCoeff: ENGINEERING_PRESETS[0].targetCm,
    cellsCount: ENGINEERING_PRESETS[0].meshCells,
    iterations: 60,
    timestamp: 'Готово к запуску',
    converged: true,
  });

  const handleApplyPreset = useCallback((preset: EngineeringPreset) => {
    setSelectedPreset(preset);
    setActiveMach(preset.mach);
    setActiveAlpha(preset.alpha);
    setLatest3DData({
      mach: preset.mach,
      alpha: preset.alpha,
      liftCoeff: preset.targetCl,
      dragCoeff: preset.targetCd,
      momentCoeff: preset.targetCm,
      cellsCount: preset.meshCells,
      iterations: 60,
      timestamp: 'Пресет применен',
      converged: true,
    });
    // Switch to status monitor to immediately see real-time streaming feedback
    setActiveTab('status_monitor');
    onTabChange?.('status_monitor');
  }, [onTabChange]);

  const handleSolutionGenerated = useCallback((data: Aerodynamic3DData) => {
    setLatest3DData(data);
  }, []);

  const handleOpenCatalog = useCallback(() => {
    setActiveTab('presets');
    onTabChange?.('presets');
  }, [onTabChange]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Aerodynamics Sub-Navigation Bar */}
      <div className="bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 flex items-center justify-start gap-1.5 overflow-x-auto shadow-lg">
        <button
          type="button"
          onClick={() => handleTabSelect('presets')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'presets'
              ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md font-black'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>★ Каталог Пресетов (NASA / AGARD)</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSelect('vlm')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'vlm'
              ? 'bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Grid className="w-4 h-4 text-cyan-400" />
          <span>1. 3D Метод Вихревой Решетки (VLM)</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSelect('status_monitor')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'status_monitor'
              ? 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>2. Монитор Сил ($L, D, M_y$) & 3D График</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSelect('wind_tunnel')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'wind_tunnel'
              ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Wind className="w-4 h-4" />
          <span>3. Аэродинамическая Труба ($C_p$)</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSelect('flutter')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'flutter'
              ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>4. Флаттер (FSI)</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSelect('6dof')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === '6dof'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>5. Динамика 6-DoF</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSelect('architecture')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'architecture'
              ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>6. Архитектура Солвера</span>
        </button>
      </div>

      {/* Sub-tab: Engineering Preset Catalog */}
      {activeTab === 'presets' && (
        <EngineeringPresetCatalog
          onApplyPreset={handleApplyPreset}
          activePresetId={selectedPreset.id}
        />
      )}

      {/* Sub-tab: 3D Vortex Lattice Method (VLM) */}
      {activeTab === 'vlm' && (
        <VortexLatticeModule />
      )}

      {/* Sub-tab 1: Real-time Status Monitor & Full 3D Plot */}
      {activeTab === 'status_monitor' && (
        <div className="space-y-6">
          <SolverStatusMonitor
            defaultMach={activeMach}
            defaultAlpha={activeAlpha}
            presetName={selectedPreset.name}
            onOpenCatalog={handleOpenCatalog}
            onSolutionGenerated={handleSolutionGenerated}
          />
          <Full3DPlotViewer data={latest3DData} />
        </div>
      )}

      {/* Sub-tab 2: Wind Tunnel + Pressure Distribution */}
      {activeTab === 'wind_tunnel' && (
        <div className="space-y-6">
          <CFDWindTunnel />
          <PressureDistributionGraph />
        </div>
      )}

      {/* Sub-tab 3: Aeroelasticity & Flutter Simulator */}
      {activeTab === 'flutter' && (
        <div className="space-y-6">
          <FlutterSimulator />
        </div>
      )}

      {/* Sub-tab 4: 6-DoF Flight Dynamics */}
      {activeTab === '6dof' && (
        <div className="space-y-6">
          <FlightDynamics6DoF />
        </div>
      )}

      {/* Sub-tab 5: CFD Solver Pipeline */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          <CFDSolverArchitecture />
        </div>
      )}
    </div>
  );
};
