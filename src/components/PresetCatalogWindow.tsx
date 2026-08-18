import React, { useState } from 'react';
import { Search, BookOpen, ArrowRight, Sparkles, Filter, Flame, Layers, Tag } from 'lucide-react';
import { ODE_PRESETS } from '../data/presets';
import { CauchyCondition, DimensionMode } from '../types';

interface PresetCatalogWindowProps {
  onSelectPreset: (equation: string, cauchy?: CauchyCondition, dimension?: DimensionMode) => void;
  activeDimension?: DimensionMode;
}

export const PresetCatalogWindow: React.FC<PresetCatalogWindowProps> = ({
  onSelectPreset,
  activeDimension,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDimension, setSelectedDimension] = useState<string>(activeDimension || 'Все');
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');

  const categories = ['Все', ...Array.from(new Set(ODE_PRESETS.map((p) => p.category)))];

  const filtered = ODE_PRESETS.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.equation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesDim = selectedDimension === 'Все' || p.dimension === selectedDimension;
    const matchesCat = selectedCategory === 'Все' || p.category === selectedCategory;

    return matchesSearch && matchesDim && matchesCat;
  });

  return (
    <div className="flex flex-col gap-3.5 text-xs text-slate-200">
      {/* 2D vs 3D Quick Dimension Filter Switcher */}
      <div className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
        <button
          type="button"
          onClick={() => {
            setSelectedDimension('Все');
            setSelectedCategory('Все');
          }}
          className={`flex-1 py-1.5 px-3 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
            selectedDimension === 'Все'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Все ({ODE_PRESETS.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedDimension('3D');
            setSelectedCategory('Все');
          }}
          className={`flex-1 py-1.5 px-3 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            selectedDimension === '3D'
              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          <span>3D Физика ({ODE_PRESETS.filter((p) => p.dimension === '3D').length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedDimension('2D');
            setSelectedCategory('Все');
          }}
          className={`flex-1 py-1.5 px-3 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            selectedDimension === '2D'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>2D ОДУ ({ODE_PRESETS.filter((p) => p.dimension === '2D').length})</span>
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию, тегам (Теплопроводность, Волны, Лоренц...)..."
            className="w-full bg-slate-950/80 text-slate-200 pl-8 pr-3 py-2 rounded-xl border border-slate-800 focus:border-cyan-500 outline-none text-xs"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full sm:w-auto bg-slate-950/80 text-slate-300 px-3 py-2 rounded-xl border border-slate-800 focus:border-cyan-500 outline-none text-xs cursor-pointer"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Presets Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[480px] overflow-y-auto pr-1">
        {filtered.map((preset) => (
          <div
            key={preset.id}
            onClick={() => onSelectPreset(preset.equation, preset.cauchy, preset.dimension)}
            className="p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-800/90 hover:border-cyan-500/50 transition-all cursor-pointer flex flex-col justify-between gap-2.5 group shadow-sm"
          >
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                  {preset.name}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                    preset.dimension === '3D'
                      ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  }`}
                >
                  {preset.dimension}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal line-clamp-2">
                {preset.description}
              </p>

              {preset.tags && preset.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {preset.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400 font-mono"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
              <span className="font-mono text-cyan-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 text-[11px] truncate max-w-[240px]">
                {preset.equation}
              </span>
              <button
                type="button"
                className="text-[11px] font-medium text-slate-400 group-hover:text-cyan-300 flex items-center gap-1 transition-colors shrink-0"
              >
                <span>Загрузить</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
