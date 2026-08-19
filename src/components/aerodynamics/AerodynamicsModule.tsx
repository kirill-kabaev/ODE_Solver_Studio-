import React, { useState } from 'react';
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
} from 'lucide-react';
import { CFDWindTunnel } from './CFDWindTunnel';
import { PressureDistributionGraph } from './PressureDistributionGraph';
import { FlutterSimulator } from './FlutterSimulator';
import { FlightDynamics6DoF } from './FlightDynamics6DoF';
import { CFDSolverArchitecture } from './CFDSolverArchitecture';

export type AeroSubTab = 'wind_tunnel' | 'flutter' | '6dof' | 'architecture';

export const AerodynamicsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AeroSubTab>('wind_tunnel');

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Aerodynamics Sub-Navigation Bar */}
      <div className="bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 flex items-center gap-1.5 overflow-x-auto shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab('wind_tunnel')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'wind_tunnel'
              ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Wind className="w-4 h-4" />
          <span>1. Аэродинамическая Труба & Поле Давлений ($C_p$)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('flutter')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'flutter'
              ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>2. Аэроупругость & Флаттер (FSI)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('6dof')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === '6dof'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>3. Динамика 6-DoF & Управление</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('architecture')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'architecture'
              ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>4. Связь с Солвером (FVM + AMG + GMRES)</span>
        </button>
      </div>

      {/* Sub-tab 1: Wind Tunnel + Pressure Distribution */}
      {activeTab === 'wind_tunnel' && (
        <div className="space-y-6">
          <CFDWindTunnel />
          <PressureDistributionGraph />
        </div>
      )}

      {/* Sub-tab 2: Aeroelasticity & Flutter Simulator */}
      {activeTab === 'flutter' && (
        <div className="space-y-6">
          <FlutterSimulator />
        </div>
      )}

      {/* Sub-tab 3: 6-DoF Flight Dynamics */}
      {activeTab === '6dof' && (
        <div className="space-y-6">
          <FlightDynamics6DoF />
        </div>
      )}

      {/* Sub-tab 4: CFD Solver Pipeline */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          <CFDSolverArchitecture />
        </div>
      )}
    </div>
  );
};
