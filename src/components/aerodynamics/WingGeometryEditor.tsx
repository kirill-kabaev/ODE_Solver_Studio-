import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Sliders,
  Sparkles,
  Maximize2,
  RotateCcw,
  Box,
  Layers,
  Info,
  CheckCircle2,
  ChevronRight,
  Eye,
  Download,
  Upload,
  Compass,
  ArrowRight,
  Grid,
  Zap,
  Activity,
  Bookmark,
} from 'lucide-react';
import { MathText, MathView } from '../MathView';
import { WingGeometryConfig } from './VortexLatticeModule';

// ==========================================
// GEOMETRY DATA STRUCTURES & EXTENDED CONFIG
// ==========================================

export interface ExtendedWingGeometryConfig extends WingGeometryConfig {
  rootTwist: number;             // Root twist angle (deg)
  twistLaw: 'linear' | 'aerodynamic' | 'bell'; // Twist distribution law
  chordLaw: 'trapezoidal' | 'elliptical' | 'cranked'; // Chord distribution law
  kinkSpanRatio: number;         // Spanwise location of break/kink (0.1..0.8)
  kinkChordRatio: number;        // Local chord factor at kink (0.8..1.6)
  airfoilFamily: 'naca4' | 'supercritical' | 'symmetric' | 'custom';
  camberPercent: number;         // Max camber m (% of chord)
  camberLocPercent: number;      // Max camber location p (% of chord)
  thicknessPercent: number;      // Max thickness t/c (% of chord)
  meshSpacing: 'uniform' | 'cosine_span' | 'cosine_both';
}

export const DEFAULT_WING_GEOMETRY: ExtendedWingGeometryConfig = {
  span: 12.0,
  rootChord: 2.2,
  tipChord: 0.88,
  sweepLE: 18.0,
  dihedral: 3.5,
  washout: -2.5,
  rootTwist: 0.0,
  twistLaw: 'linear',
  chordLaw: 'trapezoidal',
  kinkSpanRatio: 0.35,
  kinkChordRatio: 1.15,
  hasWinglets: true,
  wingletHeight: 0.75,
  wingletCant: 78.0,
  numSpanPanels: 14,
  numChordPanels: 5,
  airfoilFamily: 'naca4',
  camberPercent: 2.0,
  camberLocPercent: 40.0,
  thicknessPercent: 12.0,
  meshSpacing: 'cosine_span',
};

export interface GeometryPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  config: Partial<ExtendedWingGeometryConfig>;
}

export const GEOMETRY_PRESETS: GeometryPreset[] = [
  {
    id: 'nasa_crm',
    name: 'NASA Common Research Model (CRM)',
    category: 'Транспортный лайнер',
    description: 'Современное околозвуковое крыло умеренного удлинения с отрицательной круткой и стреловидностью 35°.',
    config: {
      span: 14.0,
      rootChord: 2.8,
      tipChord: 0.78,
      sweepLE: 35.0,
      dihedral: 4.0,
      washout: -3.5,
      rootTwist: 0.0,
      twistLaw: 'aerodynamic',
      chordLaw: 'cranked',
      kinkSpanRatio: 0.37,
      kinkChordRatio: 1.18,
      hasWinglets: true,
      wingletHeight: 0.85,
      wingletCant: 80.0,
      numSpanPanels: 16,
      numChordPanels: 6,
      camberPercent: 2.2,
      thicknessPercent: 11.5,
    },
  },
  {
    id: 'spitfire',
    name: 'Supermarine Spitfire (Эллиптическое)',
    category: 'Классическое эллиптическое',
    description: 'Легендарное эллиптическое крыло с минимальным индуктивным сопротивлением (фактор Освальда e ≈ 0.99).',
    config: {
      span: 11.2,
      rootChord: 2.4,
      tipChord: 0.45,
      sweepLE: 8.0,
      dihedral: 5.5,
      washout: -1.5,
      rootTwist: 0.0,
      twistLaw: 'linear',
      chordLaw: 'elliptical',
      hasWinglets: false,
      wingletHeight: 0.0,
      wingletCant: 90.0,
      numSpanPanels: 16,
      numChordPanels: 5,
      camberPercent: 2.0,
      thicknessPercent: 13.0,
    },
  },
  {
    id: 'glider',
    name: 'Высокоэффективный Планер (AR=22)',
    category: 'Спортивный планер',
    description: 'Крыло экстремально высокого удлинения с ламинарным обтеканием и минимальным индуктивным скосом.',
    config: {
      span: 20.0,
      rootChord: 1.1,
      tipChord: 0.42,
      sweepLE: 2.0,
      dihedral: 2.5,
      washout: -1.2,
      rootTwist: 0.0,
      twistLaw: 'linear',
      chordLaw: 'trapezoidal',
      hasWinglets: true,
      wingletHeight: 0.6,
      wingletCant: 85.0,
      numSpanPanels: 18,
      numChordPanels: 5,
      camberPercent: 2.8,
      thicknessPercent: 14.0,
    },
  },
  {
    id: 'concorde',
    name: 'Concorde (Оживальное Дельта)',
    category: 'Сверхзвуковое',
    description: 'Низкое удлинение, стреловидность передней кромки 55° и выраженная 3D крутка для формирования вихревого срыва.',
    config: {
      span: 10.0,
      rootChord: 5.2,
      tipChord: 0.35,
      sweepLE: 55.0,
      dihedral: -1.5,
      washout: -4.5,
      rootTwist: 1.0,
      twistLaw: 'aerodynamic',
      chordLaw: 'cranked',
      kinkSpanRatio: 0.55,
      kinkChordRatio: 0.95,
      hasWinglets: false,
      numSpanPanels: 16,
      numChordPanels: 7,
      camberPercent: 1.5,
      thicknessPercent: 7.0,
    },
  },
  {
    id: 'su47',
    name: 'Су-47 Беркут (Обратная стреловидность)',
    category: 'Маневренная авиация',
    description: 'Крыло обратной стреловидности (-20°) с повышенной подъемной силой в корневой зоне и нестандартным распределением крутки.',
    config: {
      span: 12.5,
      rootChord: 3.2,
      tipChord: 1.1,
      sweepLE: -20.0,
      dihedral: 0.0,
      washout: 2.0,
      rootTwist: -1.5,
      twistLaw: 'linear',
      chordLaw: 'trapezoidal',
      hasWinglets: false,
      numSpanPanels: 16,
      numChordPanels: 6,
      camberPercent: 1.8,
      thicknessPercent: 9.0,
    },
  },
  {
    id: 'horten_uav',
    name: 'Horten UAV (Летающее крыло)',
    category: 'Бесхвостка / БПЛА',
    description: 'Бесхвостое крыло с колоколообразным распределением подъемной силы (Bell-shaped Lift) и нелинейной круткой.',
    config: {
      span: 14.5,
      rootChord: 2.6,
      tipChord: 0.5,
      sweepLE: 25.0,
      dihedral: 1.5,
      washout: -5.5,
      rootTwist: 1.5,
      twistLaw: 'bell',
      chordLaw: 'trapezoidal',
      hasWinglets: false,
      numSpanPanels: 18,
      numChordPanels: 6,
      camberPercent: 1.8,
      thicknessPercent: 12.0,
    },
  },
];

export interface WingGeometryEditorProps {
  initialConfig?: Partial<ExtendedWingGeometryConfig>;
  onApplyGeometry?: (config: ExtendedWingGeometryConfig) => void;
  onCancel?: () => void;
  isEmbedded?: boolean;
}

export type PreviewCanvasMode = 'planform' | 'isometric' | 'front' | 'airfoil_sections';

export const WingGeometryEditor: React.FC<WingGeometryEditorProps> = ({
  initialConfig,
  onApplyGeometry,
  onCancel,
  isEmbedded = false,
}) => {
  // State for all parameters
  const [config, setConfig] = useState<ExtendedWingGeometryConfig>({
    ...DEFAULT_WING_GEOMETRY,
    ...initialConfig,
  });

  const [activeCanvasMode, setActiveCanvasMode] = useState<PreviewCanvasMode>('planform');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('nasa_crm');
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showVlmMesh, setShowVlmMesh] = useState<boolean>(true);
  const [showMac, setShowMac] = useState<boolean>(true);
  const [showQuarterChord, setShowQuarterChord] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<'planform' | 'sweep_dihedral' | 'twist_camber' | 'mesh'>('planform');

  // Compute CAD & Aerodynamic Metrics
  const metrics = useMemo(() => {
    const b = config.span;
    const cr = config.rootChord;
    const ct = config.tipChord;
    const lambda = ct / cr;
    const sweepRad = (config.sweepLE * Math.PI) / 180;

    // Planform Area S (trapezoidal base or modified)
    let area = 0;
    if (config.chordLaw === 'elliptical') {
      area = (Math.PI / 4) * b * cr;
    } else if (config.chordLaw === 'cranked') {
      const yKink = (b / 2) * config.kinkSpanRatio;
      const cKink = (cr + (ct - cr) * config.kinkSpanRatio) * config.kinkChordRatio;
      const innerArea = ((cr + cKink) / 2) * yKink * 2;
      const outerArea = ((cKink + ct) / 2) * (b / 2 - yKink) * 2;
      area = innerArea + outerArea;
    } else {
      area = ((cr + ct) / 2) * b;
    }

    const AR = (b * b) / (area > 0 ? area : 1);
    
    // Mean Aerodynamic Chord (MAC)
    const mac = (2 / 3) * cr * ((1 + lambda + lambda * lambda) / (1 + lambda));
    
    // Spanwise location of MAC (y_mac)
    const yMac = (b / 6) * ((1 + 2 * lambda) / (1 + lambda));
    
    // X leading edge of MAC
    const xMacLE = yMac * Math.tan(sweepRad);
    
    // Sweep at quarter-chord (c/4)
    const tanSweepQuarter = Math.tan(sweepRad) - (cr * (1 - lambda)) / (2 * b);
    const sweepQuarterDeg = (Math.atan(tanSweepQuarter) * 180) / Math.PI;

    // Sweep at trailing edge (TE)
    const tanSweepTE = Math.tan(sweepRad) - (2 * cr * (1 - lambda)) / b;
    const sweepTEDeg = (Math.atan(tanSweepTE) * 180) / Math.PI;

    // Wetted area estimate (m^2)
    const wettedArea = area * 2.05 * (1 + 0.2 * (config.thicknessPercent / 100));

    // Zero-lift angle estimation based on camber
    const alpha0Deg = -config.camberPercent * 0.95;

    // Total panels in half-wing and full wing
    const halfPanels = config.numSpanPanels * config.numChordPanels + (config.hasWinglets ? 4 * config.numChordPanels : 0);
    const totalPanels = halfPanels * 2;

    return {
      area,
      AR,
      lambda,
      mac,
      yMac,
      xMacLE,
      sweepQuarterDeg,
      sweepTEDeg,
      wettedArea,
      alpha0Deg,
      totalPanels,
    };
  }, [config]);

  // Update a single config parameter
  const updateParam = useCallback(<K extends keyof ExtendedWingGeometryConfig>(
    key: K,
    value: ExtendedWingGeometryConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Preset loader
  const handleSelectPreset = (preset: GeometryPreset) => {
    setSelectedPresetId(preset.id);
    setConfig((prev) => ({
      ...prev,
      ...preset.config,
    }));
  };

  // Export geometry as JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `wing_geometry_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import geometry from JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setConfig((prev) => ({ ...prev, ...parsed }));
      } catch (err) {
        console.error('Invalid JSON file', err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Sliders className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>Инженерный Редактор Геометрии Крыла (CAD & VLM Parametric Editor)</span>
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700">
              Параметрический САПР
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Интерактивное проектирование пространственной формы крыла: размах, распределение хорд, стреловидность, крутка и винглеты с прямым экспортом в 3D VLM солвер.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <label className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Импорт</span>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handleExportJSON}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Экспорт JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setConfig(DEFAULT_WING_GEOMETRY)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 text-xs font-mono transition-all flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Сброс</span>
          </button>

          {onApplyGeometry && (
            <button
              type="button"
              onClick={() => onApplyGeometry(config)}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-xs font-mono shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Применить в VLM Солвер</span>
            </button>
          )}
        </div>
      </div>

      {/* Geometry Preset Quick Strip */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
            <span>Каталог референсных геометрий:</span>
          </span>
          <span className="text-[10px] text-slate-500">Нажмите для мгновенной загрузки параметров</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {GEOMETRY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                selectedPresetId === preset.id
                  ? 'bg-indigo-950/80 border-cyan-500 text-white shadow-md shadow-cyan-500/10'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800/60'
              }`}
            >
              <div>
                <span className="text-[9px] uppercase font-mono text-cyan-400 block truncate">{preset.category}</span>
                <span className="text-xs font-bold text-slate-200 block truncate">{preset.name}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1">
                {preset.config.span ? `b=${preset.config.span}м` : ''} | {preset.config.sweepLE !== undefined ? `Λ=${preset.config.sweepLE}°` : ''}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Split: Left Interactive Canvas (7 cols), Right Sliders / Parameters (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Multi-View Preview Canvas (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Canvas Mode Tabs & HUD toggles */}
          <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1 text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveCanvasMode('planform')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                  activeCanvasMode === 'planform'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                План (X-Y)
              </button>

              <button
                type="button"
                onClick={() => setActiveCanvasMode('isometric')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                  activeCanvasMode === 'isometric'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                3D Изометрия
              </button>

              <button
                type="button"
                onClick={() => setActiveCanvasMode('front')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                  activeCanvasMode === 'front'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                Фронт (Y-Z)
              </button>

              <button
                type="button"
                onClick={() => setActiveCanvasMode('airfoil_sections')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                  activeCanvasMode === 'airfoil_sections'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                Профиль & Крутка
              </button>
            </div>

            {/* Overlay Toggles */}
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <label className="flex items-center gap-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showDimensions}
                  onChange={(e) => setShowDimensions(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 w-3.5 h-3.5"
                />
                <span>Размеры</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showVlmMesh}
                  onChange={(e) => setShowVlmMesh(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 w-3.5 h-3.5"
                />
                <span>Сетка VLM</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showMac}
                  onChange={(e) => setShowMac(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 w-3.5 h-3.5"
                />
                <span>САХ (MAC)</span>
              </label>
            </div>
          </div>

          {/* Interactive Canvas Rendering Box */}
          <div className="relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center p-2 min-h-[380px] sm:min-h-[460px]">
            <InteractiveGeometryCanvas
              config={config}
              metrics={metrics}
              mode={activeCanvasMode}
              showDimensions={showDimensions}
              showVlmMesh={showVlmMesh}
              showMac={showMac}
              showQuarterChord={showQuarterChord}
              onUpdateSpan={(newSpan) => updateParam('span', newSpan)}
              onUpdateRootChord={(newRoot) => updateParam('rootChord', newRoot)}
              onUpdateTipChord={(newTip) => updateParam('tipChord', newTip)}
              onUpdateSweep={(newSweep) => updateParam('sweepLE', newSweep)}
            />
          </div>

          {/* Computed Geometric Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Площадь крыла $S$</span>
              <span className="text-cyan-400 font-bold text-sm">{metrics.area.toFixed(2)} м²</span>
              <span className="text-[9px] text-slate-500 block">($S_&#123;wet&#125; \approx {metrics.wettedArea.toFixed(1)}$ м²)</span>
            </div>

            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Удлинение $AR$</span>
              <span className="text-indigo-400 font-bold text-sm">{metrics.AR.toFixed(2)}</span>
              <span className="text-[9px] text-slate-500 block">(Сужение $\lambda = {metrics.lambda.toFixed(2)}$)</span>
            </div>

            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">САХ (MAC $\bar&#123;c&#125;$)</span>
              <span className="text-emerald-400 font-bold text-sm">{metrics.mac.toFixed(2)} м</span>
              <span className="text-[9px] text-slate-500 block">($y_&#123;MAC&#125; = {metrics.yMac.toFixed(2)}$ м)</span>
            </div>

            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Стреловидность $\Lambda_&#123;c/4&#125;$</span>
              <span className="text-purple-400 font-bold text-sm">{metrics.sweepQuarterDeg.toFixed(1)}°</span>
              <span className="text-[9px] text-slate-500 block">($\Lambda_&#123;TE&#125; = {metrics.sweepTEDeg.toFixed(1)}°$)</span>
            </div>
          </div>
        </div>

        {/* Right: Parameter Sliders & Interactive Input Modules (5 cols) */}
        <div className="lg:col-span-5 bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
          {/* Sub-Tabs for Controls */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1 text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveSubTab('planform')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                  activeSubTab === 'planform'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                1. План & Хорды
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('sweep_dihedral')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                  activeSubTab === 'sweep_dihedral'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                2. Стрела & V
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('twist_camber')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                  activeSubTab === 'twist_camber'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                3. Крутка & Профиль
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('mesh')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                  activeSubTab === 'mesh'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                4. Сетка VLM
              </button>
            </div>
          </div>

          {/* Sub-Tab 1: Planform & Chord Distribution */}
          {activeSubTab === 'planform' && (
            <div className="space-y-4 text-xs font-mono">
              {/* Wingspan (b) */}
              <div className="space-y-1.5 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-bold text-cyan-400 flex items-center gap-1">
                    <span>Размах крыла (b):</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={2.0}
                      max={45.0}
                      step={0.1}
                      value={config.span}
                      onChange={(e) => updateParam('span', parseFloat(e.target.value) || 2.0)}
                      className="w-16 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-right text-cyan-400 font-black text-xs"
                    />
                    <span className="text-slate-500">м</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={2.0}
                  max={35.0}
                  step={0.2}
                  value={config.span}
                  onChange={(e) => updateParam('span', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>2.0 м (БПЛА)</span>
                  <span>14.0 м (Истребитель)</span>
                  <span>35.0 м (Лайнер)</span>
                </div>
              </div>

              {/* Root & Tip Chords */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-indigo-300 font-bold">Корневая хорда ($c_r$):</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <input
                      type="range"
                      min={0.5}
                      max={8.0}
                      step={0.1}
                      value={config.rootChord}
                      onChange={(e) => updateParam('rootChord', parseFloat(e.target.value))}
                      className="w-24 h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-400"
                    />
                    <span className="text-white font-bold text-xs">{config.rootChord.toFixed(2)} м</span>
                  </div>
                </div>

                <div className="space-y-1.5 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-indigo-300 font-bold">Концевая хорда ($c_t$):</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <input
                      type="range"
                      min={0.1}
                      max={4.0}
                      step={0.05}
                      value={config.tipChord}
                      onChange={(e) => updateParam('tipChord', parseFloat(e.target.value))}
                      className="w-24 h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-400"
                    />
                    <span className="text-white font-bold text-xs">{config.tipChord.toFixed(2)} м</span>
                  </div>
                </div>
              </div>

              {/* Chord Distribution Law */}
              <div className="space-y-1.5 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-slate-300 block">Закон распределения хорд $c(y)$:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['trapezoidal', 'elliptical', 'cranked'] as const).map((law) => (
                    <button
                      key={law}
                      type="button"
                      onClick={() => updateParam('chordLaw', law)}
                      className={`p-1.5 rounded-lg text-center border text-[11px] font-mono transition-all cursor-pointer ${
                        config.chordLaw === law
                          ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {law === 'trapezoidal' ? 'Трапеция' : law === 'elliptical' ? 'Эллипс' : 'Излом (Cranked)'}
                    </button>
                  ))}
                </div>

                {config.chordLaw === 'cranked' && (
                  <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-slate-400">Позиция излома: {(config.kinkSpanRatio * 100).toFixed(0)}% b/2</span>
                      <input
                        type="range"
                        min={0.15}
                        max={0.75}
                        step={0.05}
                        value={config.kinkSpanRatio}
                        onChange={(e) => updateParam('kinkSpanRatio', parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-400"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400">Фактор хорды: {config.kinkChordRatio.toFixed(2)}</span>
                      <input
                        type="range"
                        min={0.8}
                        max={1.5}
                        step={0.05}
                        value={config.kinkChordRatio}
                        onChange={(e) => updateParam('kinkChordRatio', parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-400"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Sweep, Dihedral & Winglets */}
          {activeSubTab === 'sweep_dihedral' && (
            <div className="space-y-4 text-xs font-mono">
              {/* Sweep Angle LE */}
              <div className="space-y-1.5 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-bold text-purple-400">Стреловидность по передней кромке ($\Lambda_&#123;LE&#125;$):</span>
                  <span className="text-purple-300 font-bold text-sm">{config.sweepLE.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min={-30.0}
                  max={65.0}
                  step={0.5}
                  value={config.sweepLE}
                  onChange={(e) => updateParam('sweepLE', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>-30° (Обратная)</span>
                  <span>0° (Прямое)</span>
                  <span>35° (Трансзвук)</span>
                  <span>60° (Дельта)</span>
                </div>
              </div>

              {/* Dihedral Angle */}
              <div className="space-y-1.5 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-bold text-emerald-400">Поперечное V крыла (Dihedral $\Gamma$):</span>
                  <span className="text-emerald-300 font-bold text-sm">{config.dihedral.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min={-8.0}
                  max={12.0}
                  step={0.5}
                  value={config.dihedral}
                  onChange={(e) => updateParam('dihedral', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>-8° (Отрицательное V)</span>
                  <span>0° (Плоское)</span>
                  <span>+6° (Положительное V)</span>
                </div>
              </div>

              {/* Winglets Module */}
              <div className="space-y-2 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={config.hasWinglets}
                      onChange={(e) => updateParam('hasWinglets', e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0 h-4 w-4"
                    />
                    <span className="text-xs text-white font-bold">Концевые аэродинамические шайбы (Винглеты)</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {config.hasWinglets ? 'Активны' : 'Выключены'}
                  </span>
                </div>

                {config.hasWinglets && (
                  <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-3 text-[11px]">
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Высота ($h_w$):</span>
                        <span className="text-cyan-400 font-bold">{config.wingletHeight.toFixed(2)} м</span>
                      </div>
                      <input
                        type="range"
                        min={0.2}
                        max={2.0}
                        step={0.05}
                        value={config.wingletHeight}
                        onChange={(e) => updateParam('wingletHeight', parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Угол отклонения (Cant):</span>
                        <span className="text-cyan-400 font-bold">{config.wingletCant.toFixed(0)}°</span>
                      </div>
                      <input
                        type="range"
                        min={45.0}
                        max={90.0}
                        step={1.0}
                        value={config.wingletCant}
                        onChange={(e) => updateParam('wingletCant', parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub-Tab 3: Twist, Washout & Airfoil Camber */}
          {activeSubTab === 'twist_camber' && (
            <div className="space-y-4 text-xs font-mono">
              {/* Washout / Geometric Twist at Tip */}
              <div className="space-y-1.5 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-bold text-amber-400">Геометрическая крутка законцовки ($\theta_&#123;tip&#125;$):</span>
                  <span className="text-amber-300 font-bold text-sm">{config.washout.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min={-8.0}
                  max={5.0}
                  step={0.2}
                  value={config.washout}
                  onChange={(e) => updateParam('washout', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>-8° (Сильный Washout)</span>
                  <span>-2° (Оптимум CRM)</span>
                  <span>0° (Без крутки)</span>
                  <span>+4° (Wash-in)</span>
                </div>
              </div>

              {/* Twist Distribution Law */}
              <div className="space-y-1.5 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-slate-300 block">Закон изменения крутки $\theta(y)$:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['linear', 'aerodynamic', 'bell'] as const).map((law) => (
                    <button
                      key={law}
                      type="button"
                      onClick={() => updateParam('twistLaw', law)}
                      className={`p-1.5 rounded-lg text-center border text-[11px] font-mono transition-all cursor-pointer ${
                        config.twistLaw === law
                          ? 'bg-amber-600 text-white border-amber-500 font-bold'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {law === 'linear' ? 'Линейный' : law === 'aerodynamic' ? 'Аэродин. (e=1)' : 'Колокол (Horten)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Airfoil Camber & Thickness */}
              <div className="space-y-2 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-cyan-300 block">Параметры профиля крыла (NACA 4-Digit):</span>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <span className="text-slate-400">Вогнутость $m$:</span>
                    <div className="text-white font-bold">{config.camberPercent.toFixed(1)}%</div>
                    <input
                      type="range"
                      min={0.0}
                      max={6.0}
                      step={0.2}
                      value={config.camberPercent}
                      onChange={(e) => updateParam('camberPercent', parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  <div>
                    <span className="text-slate-400">Позиция $p$:</span>
                    <div className="text-white font-bold">{config.camberLocPercent.toFixed(0)}%</div>
                    <input
                      type="range"
                      min={20.0}
                      max={60.0}
                      step={5.0}
                      value={config.camberLocPercent}
                      onChange={(e) => updateParam('camberLocPercent', parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  <div>
                    <span className="text-slate-400">Толщина $t/c$:</span>
                    <div className="text-white font-bold">{config.thicknessPercent.toFixed(1)}%</div>
                    <input
                      type="range"
                      min={6.0}
                      max={20.0}
                      step={0.5}
                      value={config.thicknessPercent}
                      onChange={(e) => updateParam('thicknessPercent', parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 4: VLM Mesh Discretization */}
          {activeSubTab === 'mesh' && (
            <div className="space-y-4 text-xs font-mono">
              {/* Spanwise Panels */}
              <div className="space-y-1.5 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-bold text-cyan-400">Панелей по полуразмаху ($N_&#123;span&#125;$):</span>
                  <span className="text-cyan-300 font-bold text-sm">{config.numSpanPanels}</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={24}
                  step={1}
                  value={config.numSpanPanels}
                  onChange={(e) => updateParam('numSpanPanels', parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Chordwise Panels */}
              <div className="space-y-1.5 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-bold text-indigo-400">Панелей по хорде ($N_&#123;chord&#125;$):</span>
                  <span className="text-indigo-300 font-bold text-sm">{config.numChordPanels}</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={10}
                  step={1}
                  value={config.numChordPanels}
                  onChange={(e) => updateParam('numChordPanels', parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                />
              </div>

              {/* Mesh Clustering Spacing */}
              <div className="space-y-1.5 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-slate-300 block">Закон сгущения сетки:</span>
                <div className="grid grid-cols-2 gap-2">
                  {(['uniform', 'cosine_span'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => updateParam('meshSpacing', mode)}
                      className={`p-2 rounded-lg text-center border text-[11px] font-mono transition-all cursor-pointer ${
                        config.meshSpacing === mode
                          ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {mode === 'uniform' ? 'Равномерная' : 'Косинусное сгущение к законцовке'}
                    </button>
                  ))}
                </div>
              </div>

              {/* SLAU Size Badge */}
              <div className="bg-slate-950 p-3 rounded-xl border border-indigo-800/80 flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Размерность матрицы влияния (AIC):</span>
                <span className="text-cyan-400 font-black text-sm font-mono">
                  {metrics.totalPanels} × {metrics.totalPanels}
                </span>
              </div>
            </div>
          )}

          {/* Physical Guidelines Box */}
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
            <span className="text-cyan-400 font-bold flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              <span>Правило Прандтля-Джонса:</span>
            </span>
            <p className="leading-relaxed text-[10px]">
              Для стреловидного крыла при околозвуковых скоростях линия постоянной циркуляции смещается назад, что требует уменьшения крутки законцовки для предотвращения преждевременного срыва потока по элеронам.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// INTERACTIVE GEOMETRY CANVAS (2D / 3D / SECTIONS)
// ==========================================

interface InteractiveGeometryCanvasProps {
  config: ExtendedWingGeometryConfig;
  metrics: {
    area: number;
    AR: number;
    lambda: number;
    mac: number;
    yMac: number;
    xMacLE: number;
    sweepQuarterDeg: number;
    sweepTEDeg: number;
  };
  mode: PreviewCanvasMode;
  showDimensions: boolean;
  showVlmMesh: boolean;
  showMac: boolean;
  showQuarterChord: boolean;
  onUpdateSpan: (span: number) => void;
  onUpdateRootChord: (root: number) => void;
  onUpdateTipChord: (tip: number) => void;
  onUpdateSweep: (sweep: number) => void;
}

const InteractiveGeometryCanvas: React.FC<InteractiveGeometryCanvasProps> = ({
  config,
  metrics,
  mode,
  showDimensions,
  showVlmMesh,
  showMac,
  showQuarterChord,
  onUpdateSpan,
  onUpdateRootChord,
  onUpdateTipChord,
  onUpdateSweep,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3D rotation state for isometric view
  const [rotX, setRotX] = useState<number>(32);
  const [rotY, setRotY] = useState<number>(-45);
  const isDraggingRef = useRef<boolean>(false);
  const lastMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Handle direct 3D mouse interaction
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || mode !== 'isometric') return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    setRotY((prev) => prev + dx * 0.5);
    setRotX((prev) => Math.max(5, Math.min(85, prev - dy * 0.5)));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 600;
    const height = canvas.clientHeight || 420;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Background Clear
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, width, height);

    // CAD Grid background
    drawCadGrid(ctx, width, height);

    if (mode === 'planform') {
      renderPlanformView(ctx, width, height, config, metrics, {
        showDimensions,
        showVlmMesh,
        showMac,
        showQuarterChord,
      });
    } else if (mode === 'isometric') {
      renderIsometric3DView(ctx, width, height, config, metrics, rotX, rotY, showVlmMesh);
    } else if (mode === 'front') {
      renderFrontElevationView(ctx, width, height, config, metrics, showDimensions);
    } else if (mode === 'airfoil_sections') {
      renderAirfoilSectionsView(ctx, width, height, config);
    }
  }, [config, metrics, mode, showDimensions, showVlmMesh, showMac, showQuarterChord, rotX, rotY]);

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`w-full h-full block select-none ${
        mode === 'isometric' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
      }`}
      style={{ minHeight: '380px' }}
    />
  );
};

// ==========================================
// CAD CANVAS DRAWING HELPERS
// ==========================================

function drawCadGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;
  const gridSize = 24;

  ctx.beginPath();
  for (let x = 0; x <= width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
}

function renderPlanformView(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: ExtendedWingGeometryConfig,
  metrics: {
    area: number;
    AR: number;
    lambda: number;
    mac: number;
    yMac: number;
    xMacLE: number;
    sweepQuarterDeg: number;
    sweepTEDeg: number;
  },
  toggles: {
    showDimensions: boolean;
    showVlmMesh: boolean;
    showMac: boolean;
    showQuarterChord: boolean;
  }
) {
  const b = config.span;
  const cr = config.rootChord;
  const ct = config.tipChord;
  const sweepRad = (config.sweepLE * Math.PI) / 180;

  const tipX = (b / 2) * Math.tan(sweepRad);
  const totalLengthX = Math.max(cr, tipX + ct) - Math.min(0, tipX);
  const totalSpanY = b;

  // Auto-scale to fit canvas
  const padding = 60;
  const scale = Math.min(
    (width - padding * 2) / (totalSpanY * 1.05),
    (height - padding * 2) / (totalLengthX * 1.3)
  );

  const originX = width / 2;
  const originY = padding + 20 - Math.min(0, tipX) * scale;

  // Coordinate transforms: Wing is oriented with X pointing Down (or Right), Y pointing Right/Left
  // We'll draw top-down view: X is vertical (streamwise, flow goes Top->Bottom), Y is horizontal (spanwise)
  const toCanvas = (x: number, y: number): [number, number] => {
    return [originX + y * scale, originY + x * scale];
  };

  // Centerline Symmetry Axis
  ctx.strokeStyle = '#38bdf8';
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(originX, originY - 30);
  ctx.lineTo(originX, originY + (totalLengthX + 1.5) * scale);
  ctx.stroke();
  ctx.setLineDash([]);

  // Wing Planform Vertices
  // Right Wing
  const [pRootLE] = [toCanvas(0, 0)];
  const [pTipLE_R] = [toCanvas(tipX, b / 2)];
  const [pTipTE_R] = [toCanvas(tipX + ct, b / 2)];
  const [pRootTE] = [toCanvas(cr, 0)];
  // Left Wing
  const [pTipLE_L] = [toCanvas(tipX, -b / 2)];
  const [pTipTE_L] = [toCanvas(tipX + ct, -b / 2)];

  // Fill Wing Planform Surface
  ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
  ctx.beginPath();
  ctx.moveTo(pRootLE[0], pRootLE[1]);
  ctx.lineTo(pTipLE_R[0], pTipLE_R[1]);
  ctx.lineTo(pTipTE_R[0], pTipTE_R[1]);
  ctx.lineTo(pRootTE[0], pRootTE[1]);
  ctx.lineTo(pTipTE_L[0], pTipTE_L[1]);
  ctx.lineTo(pTipLE_L[0], pTipLE_L[1]);
  ctx.closePath();
  ctx.fill();

  // Draw Outline
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // VLM Mesh Discretization Overlay
  if (toggles.showVlmMesh) {
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.45)';
    ctx.lineWidth = 1;
    const nSpan = config.numSpanPanels;
    const nChord = config.numChordPanels;

    for (let is = 0; is <= nSpan; is++) {
      const eta = is / nSpan;
      const yR = (b / 2) * eta;
      const yL = -yR;
      const xLE = yR * Math.tan(sweepRad);
      const chord = cr + (ct - cr) * eta;

      const [pLE_R] = [toCanvas(xLE, yR)];
      const [pTE_R] = [toCanvas(xLE + chord, yR)];
      const [pLE_L] = [toCanvas(xLE, yL)];
      const [pTE_L] = [toCanvas(xLE + chord, yL)];

      ctx.beginPath();
      ctx.moveTo(pLE_R[0], pLE_R[1]);
      ctx.lineTo(pTE_R[0], pTE_R[1]);
      ctx.moveTo(pLE_L[0], pLE_L[1]);
      ctx.lineTo(pTE_L[0], pTE_L[1]);
      ctx.stroke();
    }

    for (let ic = 1; ic < nChord; ic++) {
      const xi = ic / nChord;
      ctx.beginPath();
      for (let is = -nSpan; is <= nSpan; is++) {
        const eta = Math.abs(is) / nSpan;
        const sign = is >= 0 ? 1 : -1;
        const y = (b / 2) * eta * sign;
        const xLE = Math.abs(y) * Math.tan(sweepRad);
        const chord = cr + (ct - cr) * eta;
        const x = xLE + chord * xi;
        const [px, py] = toCanvas(x, y);
        if (is === -nSpan) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }

  // Quarter-chord line (c/4)
  if (toggles.showQuarterChord) {
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    const [pQRoot] = [toCanvas(cr * 0.25, 0)];
    const [pQTip_R] = [toCanvas(tipX + ct * 0.25, b / 2)];
    const [pQTip_L] = [toCanvas(tipX + ct * 0.25, -b / 2)];

    ctx.beginPath();
    ctx.moveTo(pQTip_L[0], pQTip_L[1]);
    ctx.lineTo(pQRoot[0], pQRoot[1]);
    ctx.lineTo(pQTip_R[0], pQTip_R[1]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Mean Aerodynamic Chord (MAC) Highlight
  if (toggles.showMac) {
    const yMac = metrics.yMac;
    const xMacLE = metrics.xMacLE;
    const mac = metrics.mac;

    const [pMacLE_R] = [toCanvas(xMacLE, yMac)];
    const [pMacTE_R] = [toCanvas(xMacLE + mac, yMac)];
    const [pMacLE_L] = [toCanvas(xMacLE, -yMac)];
    const [pMacTE_L] = [toCanvas(xMacLE + mac, -yMac)];

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pMacLE_R[0], pMacLE_R[1]);
    ctx.lineTo(pMacTE_R[0], pMacTE_R[1]);
    ctx.moveTo(pMacLE_L[0], pMacLE_L[1]);
    ctx.lineTo(pMacTE_L[0], pMacTE_L[1]);
    ctx.stroke();

    // MAC Label
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`MAC (${mac.toFixed(2)}м)`, pMacTE_R[0] + 5, pMacTE_R[1] - 5);
  }

  // Dimension Annotations
  if (toggles.showDimensions) {
    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.font = '11px monospace';

    // Span dimension b
    const dimY = originY + (totalLengthX + 0.4) * scale + 15;
    ctx.beginPath();
    ctx.moveTo(originX - (b / 2) * scale, dimY);
    ctx.lineTo(originX + (b / 2) * scale, dimY);
    ctx.stroke();

    // Arrow ticks
    ctx.beginPath();
    ctx.moveTo(originX - (b / 2) * scale, dimY - 4);
    ctx.lineTo(originX - (b / 2) * scale, dimY + 4);
    ctx.moveTo(originX + (b / 2) * scale, dimY - 4);
    ctx.lineTo(originX + (b / 2) * scale, dimY + 4);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillText(`Размах b = ${b.toFixed(1)} м`, originX, dimY - 4);

    // Root chord dimension cr
    ctx.textAlign = 'right';
    ctx.fillText(`c_root = ${cr.toFixed(2)} м`, pRootTE[0] - 10, (pRootLE[1] + pRootTE[1]) / 2);

    // Tip chord dimension ct
    ctx.textAlign = 'left';
    ctx.fillText(`c_tip = ${ct.toFixed(2)} м`, pTipTE_R[0] + 10, (pTipLE_R[1] + pTipTE_R[1]) / 2);

    // Sweep LE annotation arc
    ctx.strokeStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(originX, originY, 40, 0, sweepRad);
    ctx.stroke();
    ctx.fillStyle = '#c084fc';
    ctx.fillText(`Λ = ${config.sweepLE.toFixed(0)}°`, originX + 45, originY + 15);
  }
}

function renderIsometric3DView(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: ExtendedWingGeometryConfig,
  metrics: { area: number; AR: number },
  rotXDeg: number,
  rotYDeg: number,
  showMesh: boolean
) {
  const b = config.span;
  const cr = config.rootChord;
  const ct = config.tipChord;
  const sweepRad = (config.sweepLE * Math.PI) / 180;
  const dihedralRad = (config.dihedral * Math.PI) / 180;
  const washoutRad = (config.washout * Math.PI) / 180;

  const nSpan = config.numSpanPanels;
  const nChord = config.numChordPanels;

  // 3D Isometric projection angles
  const phi = (rotXDeg * Math.PI) / 180;
  const theta = (rotYDeg * Math.PI) / 180;

  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);

  const scale = (Math.min(width, height) / (b * 1.2)) * 0.95;
  const centerX = width / 2;
  const centerY = height / 2;

  // 3D to 2D projection function
  const project3D = (x: number, y: number, z: number): [number, number, number] => {
    // Center wing origin at half-chord
    const xRel = x - cr * 0.4;
    const yRel = y;
    const zRel = z;

    // Rotation around Z (yaw theta)
    const x1 = xRel * cosTheta - yRel * sinTheta;
    const y1 = xRel * sinTheta + yRel * cosTheta;
    const z1 = zRel;

    // Rotation around X (pitch phi)
    const x2 = x1;
    const y2 = y1 * cosPhi - z1 * sinPhi;
    const z2 = y1 * sinPhi + z1 * cosPhi;

    const screenX = centerX + y2 * scale;
    const screenY = centerY - z2 * scale + x2 * scale * 0.25;

    return [screenX, screenY, x2]; // return depth as well
  };

  // Draw 3D coordinate triad at origin
  const [origX, origY] = project3D(0, 0, 0);
  const [axisXx, axisXy] = project3D(1.5, 0, 0);
  const [axisYx, axisYy] = project3D(0, 2.5, 0);
  const [axisZx, axisZy] = project3D(0, 0, 1.5);

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(origX, origY);
  ctx.lineTo(axisXx, axisXy);
  ctx.stroke();

  ctx.strokeStyle = '#22c55e';
  ctx.beginPath();
  ctx.moveTo(origX, origY);
  ctx.lineTo(axisYx, axisYy);
  ctx.stroke();

  ctx.strokeStyle = '#3b82f6';
  ctx.beginPath();
  ctx.moveTo(origX, origY);
  ctx.lineTo(axisZx, axisZy);
  ctx.stroke();

  // Generate 3D Panel Surface Grid
  const panels: {
    pts: [number, number][];
    depth: number;
    isRight: boolean;
  }[] = [];

  for (const isRight of [true, false]) {
    for (let is = 0; is < nSpan; is++) {
      const eta1 = is / nSpan;
      const eta2 = (is + 1) / nSpan;

      const y1 = (b / 2) * eta1 * (isRight ? 1 : -1);
      const y2 = (b / 2) * eta2 * (isRight ? 1 : -1);

      const z1 = Math.abs(y1) * Math.tan(dihedralRad);
      const z2 = Math.abs(y2) * Math.tan(dihedralRad);

      const twist1 = config.rootTwist + (washoutRad * 180) / Math.PI * eta1;
      const twist2 = config.rootTwist + (washoutRad * 180) / Math.PI * eta2;

      const chord1 = cr + (ct - cr) * eta1;
      const chord2 = cr + (ct - cr) * eta2;

      const xLE1 = Math.abs(y1) * Math.tan(sweepRad);
      const xLE2 = Math.abs(y2) * Math.tan(sweepRad);

      for (let ic = 0; ic < nChord; ic++) {
        const xi1 = ic / nChord;
        const xi2 = (ic + 1) / nChord;

        const x11 = xLE1 + chord1 * xi1;
        const x12 = xLE1 + chord1 * xi2;
        const x21 = xLE2 + chord2 * xi1;
        const x22 = xLE2 + chord2 * xi2;

        // Apply twist rotation around quarter chord
        const zOff11 = -(x11 - (xLE1 + chord1 * 0.25)) * Math.sin((twist1 * Math.PI) / 180);
        const zOff12 = -(x12 - (xLE1 + chord1 * 0.25)) * Math.sin((twist1 * Math.PI) / 180);
        const zOff21 = -(x21 - (xLE2 + chord2 * 0.25)) * Math.sin((twist2 * Math.PI) / 180);
        const zOff22 = -(x22 - (xLE2 + chord2 * 0.25)) * Math.sin((twist2 * Math.PI) / 180);

        const [p1x, p1y, d1] = project3D(x11, y1, z1 + zOff11);
        const [p2x, p2y, d2] = project3D(x21, y2, z2 + zOff21);
        const [p3x, p3y, d3] = project3D(x22, y2, z2 + zOff22);
        const [p4x, p4y, d4] = project3D(x12, y1, z1 + zOff12);

        const avgDepth = (d1 + d2 + d3 + d4) / 4;
        panels.push({
          pts: [
            [p1x, p1y],
            [p2x, p2y],
            [p3x, p3y],
            [p4x, p4y],
          ],
          depth: avgDepth,
          isRight,
        });
      }
    }
  }

  // Painter's Algorithm: Sort by depth (farthest first)
  panels.sort((a, b) => b.depth - a.depth);

  // Render 3D Panels
  for (const panel of panels) {
    ctx.beginPath();
    ctx.moveTo(panel.pts[0][0], panel.pts[0][1]);
    ctx.lineTo(panel.pts[1][0], panel.pts[1][1]);
    ctx.lineTo(panel.pts[2][0], panel.pts[2][1]);
    ctx.lineTo(panel.pts[3][0], panel.pts[3][1]);
    ctx.closePath();

    ctx.fillStyle = panel.isRight ? 'rgba(14, 116, 144, 0.75)' : 'rgba(2, 132, 199, 0.75)';
    ctx.fill();

    if (showMesh) {
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.4)';
      ctx.lineWidth = 0.75;
      ctx.stroke();
    }
  }

  // HUD Text in 3D View
  ctx.fillStyle = '#64748b';
  ctx.font = '10px monospace';
  ctx.fillText('Зажмите ЛКМ для свободного 3D вращения', 15, height - 15);
}

function renderFrontElevationView(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: ExtendedWingGeometryConfig,
  metrics: { area: number },
  showDimensions: boolean
) {
  const b = config.span;
  const dihedralRad = (config.dihedral * Math.PI) / 180;
  const tipZ = (b / 2) * Math.tan(dihedralRad);

  const scale = (width - 100) / (b * 1.1);
  const originX = width / 2;
  const originY = height / 2 + 20;

  // Front View: Y is horizontal, Z is vertical (up is negative canvas Y)
  const toCanvasYZ = (y: number, z: number): [number, number] => {
    return [originX + y * scale, originY - z * scale];
  };

  // Centerline
  ctx.strokeStyle = '#38bdf8';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(originX, originY - 120);
  ctx.lineTo(originX, originY + 60);
  ctx.stroke();
  ctx.setLineDash([]);

  // Right & Left Wing Beams
  const [pRoot] = [toCanvasYZ(0, 0)];
  const [pTip_R] = [toCanvasYZ(b / 2, tipZ)];
  const [pTip_L] = [toCanvasYZ(-b / 2, tipZ)];

  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(pTip_L[0], pTip_L[1]);
  ctx.lineTo(pRoot[0], pRoot[1]);
  ctx.lineTo(pTip_R[0], pTip_R[1]);
  ctx.stroke();

  // Winglets in Front View
  if (config.hasWinglets) {
    const cantRad = (config.wingletCant * Math.PI) / 180;
    const h = config.wingletHeight;
    const wingletTipZ = tipZ + h * Math.sin(cantRad);
    const wingletTipYR = b / 2 + h * Math.cos(cantRad);
    const wingletTipYL = -b / 2 - h * Math.cos(cantRad);

    const [pW_R] = [toCanvasYZ(wingletTipYR, wingletTipZ)];
    const [pW_L] = [toCanvasYZ(wingletTipYL, wingletTipZ)];

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(pTip_R[0], pTip_R[1]);
    ctx.lineTo(pW_R[0], pW_R[1]);
    ctx.moveTo(pTip_L[0], pTip_L[1]);
    ctx.lineTo(pW_L[0], pW_L[1]);
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.font = '10px monospace';
    ctx.fillText(`Винглет h=${h.toFixed(2)}м, Cant=${config.wingletCant}°`, pW_R[0] + 5, pW_R[1] - 5);
  }

  // Dihedral Dimension Arc
  if (showDimensions) {
    ctx.strokeStyle = '#10b981';
    ctx.fillStyle = '#10b981';
    ctx.font = '11px monospace';
    ctx.fillText(`V-образность Γ = ${config.dihedral.toFixed(1)}°`, originX + 50, originY - 15);

    // Horizontal Reference Line
    ctx.strokeStyle = '#475569';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(originX - (b / 2) * scale, originY);
    ctx.lineTo(originX + (b / 2) * scale, originY);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function renderAirfoilSectionsView(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: ExtendedWingGeometryConfig
) {
  const cr = config.rootChord;
  const ct = config.tipChord;
  const washout = config.washout;
  const m = config.camberPercent / 100;
  const p = config.camberLocPercent / 100;
  const t = config.thicknessPercent / 100;

  // Split canvas into two rows: Top = Airfoil Camber & Twist Overlay, Bottom = Twist Distribution Along Span
  const topH = height * 0.55;
  const bottomH = height * 0.45;

  // Top Section: Superimposed Root vs Tip Profile
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('Наложение профилей (Корень vs Законцовка с круткой θ):', 20, 25);

  const scaleChord = (width - 120) / cr;
  const startX = 60;
  const centerY = topH / 2 + 10;

  // Function to compute NACA 4-Digit coordinates
  const getNacaCoord = (xFrac: number): { yc: number; yt: number } => {
    let yc = 0;
    if (p > 0) {
      if (xFrac < p) {
        yc = (m / (p * p)) * (2 * p * xFrac - xFrac * xFrac);
      } else {
        yc = (m / ((1 - p) * (1 - p))) * ((1 - 2 * p) + 2 * p * xFrac - xFrac * xFrac);
      }
    }
    const yt =
      5 *
      t *
      (0.2969 * Math.sqrt(Math.max(0, xFrac)) -
        0.126 * xFrac -
        0.3516 * xFrac * xFrac +
        0.2843 * xFrac * xFrac * xFrac -
        0.1015 * xFrac * xFrac * xFrac * xFrac);
    return { yc, yt };
  };

  // Draw Root Airfoil (Cyan, Twist 0°)
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const numPts = 60;
  for (let i = 0; i <= numPts; i++) {
    const xFrac = i / numPts;
    const { yc, yt } = getNacaCoord(xFrac);
    const px = startX + xFrac * cr * scaleChord;
    const py = centerY - (yc + yt) * cr * scaleChord;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = numPts; i >= 0; i--) {
    const xFrac = i / numPts;
    const { yc, yt } = getNacaCoord(xFrac);
    const px = startX + xFrac * cr * scaleChord;
    const py = centerY - (yc - yt) * cr * scaleChord;
    ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  // Draw Tip Airfoil with Washout Rotation (Amber)
  const tipScale = (ct / cr) * scaleChord;
  const twistRad = (washout * Math.PI) / 180;
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.beginPath();

  for (let i = 0; i <= numPts; i++) {
    const xFrac = i / numPts;
    const { yc, yt } = getNacaCoord(xFrac);
    const xRel = xFrac * ct;
    const yRel = yc + yt;

    // Rotate around quarter chord
    const xRot = (xRel - ct * 0.25) * Math.cos(twistRad) - yRel * ct * Math.sin(twistRad) + ct * 0.25;
    const yRot = (xRel - ct * 0.25) * Math.sin(twistRad) + yRel * ct * Math.cos(twistRad);

    const px = startX + xRot * scaleChord;
    const py = centerY - yRot * scaleChord;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = numPts; i >= 0; i--) {
    const xFrac = i / numPts;
    const { yc, yt } = getNacaCoord(xFrac);
    const xRel = xFrac * ct;
    const yRel = yc - yt;

    const xRot = (xRel - ct * 0.25) * Math.cos(twistRad) - yRel * ct * Math.sin(twistRad) + ct * 0.25;
    const yRot = (xRel - ct * 0.25) * Math.sin(twistRad) + yRel * ct * Math.cos(twistRad);

    const px = startX + xRot * scaleChord;
    const py = centerY - yRot * scaleChord;
    ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  // Legend
  ctx.fillStyle = '#06b6d4';
  ctx.font = '10px monospace';
  ctx.fillText(`— Корень: c = ${cr.toFixed(2)}м, θ = 0°`, width - 200, 30);
  ctx.fillStyle = '#f59e0b';
  ctx.fillText(`— Кончик: c = ${ct.toFixed(2)}м, θ = ${washout.toFixed(1)}°`, width - 200, 45);

  // Bottom Section: Twist Distribution along semi-span 2y/b
  const plotY0 = topH + 20;
  const plotH = bottomH - 40;
  const plotW = width - 120;
  const plotX0 = 60;

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.strokeRect(plotX0, plotY0, plotW, plotH);

  // Zero-degree line
  const zeroY = plotY0 + plotH / 2;
  ctx.strokeStyle = '#475569';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(plotX0, zeroY);
  ctx.lineTo(plotX0 + plotW, zeroY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Plot theta(eta) curve
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 50; i++) {
    const eta = i / 50;
    let localTwist = config.rootTwist + washout * eta;
    if (config.twistLaw === 'aerodynamic') {
      localTwist = config.rootTwist + washout * (1 - Math.sqrt(1 - eta * eta));
    } else if (config.twistLaw === 'bell') {
      localTwist = config.rootTwist + washout * (1 - Math.pow(1 - eta * eta, 1.5));
    }

    const px = plotX0 + eta * plotW;
    const py = zeroY - (localTwist / 10) * (plotH / 2);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px monospace';
  ctx.fillText('Эпюра геометрической крутки θ(2y/b):', plotX0, plotY0 - 6);
  ctx.fillText('Корень (2y/b = 0)', plotX0, plotY0 + plotH + 12);
  ctx.fillText('Законцовка (2y/b = 1)', plotX0 + plotW - 90, plotY0 + plotH + 12);
}
