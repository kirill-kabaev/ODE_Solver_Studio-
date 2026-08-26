import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Wind,
  Rocket,
  Cpu,
  Radio,
  Plane,
  Flame,
  Globe,
  Compass,
  Zap,
  Activity,
  Grid,
  Disc,
  FileText,
  Crosshair,
  Boxes,
  Volume2,
  Shield,
  ShieldCheck,
  BookOpen,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  CornerDownLeft,
  Filter,
  CheckCircle2,
  GitFork,
} from 'lucide-react';
import {
  ENGINEERING_SEARCH_ITEMS,
  EngineeringSearchItem,
  SearchGroupType,
} from './engineeringSearchIndex';
import { MathText } from './MathView';
import { HandbookTopicId } from './EngineeringHandbookModal';
import { EngineeringDomain } from './EngineeringStudio';
import { AeroDomainCategory, AeroSubTab } from './aerodynamics/AerodynamicsModule';

interface EngineeringGlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (item: EngineeringSearchItem) => void;
  onOpenHandbookTopic?: (topicId: HandbookTopicId) => void;
}

const ICONS_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Wind,
  Rocket,
  Cpu,
  Radio,
  Plane,
  Flame,
  Globe,
  Compass,
  Zap,
  Activity,
  Grid,
  Disc,
  FileText,
  Crosshair,
  Boxes,
  Volume2,
  Shield,
  ShieldCheck,
  BookOpen,
  Sparkles,
  AlertTriangle,
  GitFork,
};

const POPULAR_QUICK_TAGS = [
  'DSMAC',
  'TERCOM',
  'РЭБ / Спуфинг',
  'Ан-2 Кукурузник',
  'Флаттер FSI',
  'VLM Решетка',
  'BEM Пропеллеры',
  'Ланцет Пикирование',
  'Pro-Nav',
  'Задача Ламберта',
  'TMR Авионика',
  'OctoMap 3D',
  'Max-Q',
  'FW-H Шум',
  '6-DoF',
  'Airbus A350',
  'F-22 Raptor',
];

export const EngineeringGlobalSearchModal: React.FC<EngineeringGlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenHandbookTopic,
}) => {
  const [query, setQuery] = useState<string>('');
  const [activeGroup, setActiveGroup] = useState<SearchGroupType>('all');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Filter & Search Logic
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ENGINEERING_SEARCH_ITEMS.filter((item) => {
      // Group filter
      if (activeGroup !== 'all' && item.group !== activeGroup) {
        return false;
      }
      if (!q) return true;

      // Match query
      const inTitle = item.title.toLowerCase().includes(q);
      const inShortTitle = item.shortTitle.toLowerCase().includes(q);
      const inDesc = item.description.toLowerCase().includes(q);
      const inBadge = item.badge.toLowerCase().includes(q);
      const inKeywords = item.keywords.some((k) => k.toLowerCase().includes(q));
      const inFormula = item.formulaLatex ? item.formulaLatex.toLowerCase().includes(q) : false;

      return inTitle || inShortTitle || inDesc || inBadge || inKeywords || inFormula;
    });
  }, [query, activeGroup]);

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeGroup]);

  // Handle keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems.length > 0 && selectedIndex < filteredItems.length) {
          handleSelect(filteredItems[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (resultsContainerRef.current) {
      const activeEl = resultsContainerRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const handleSelect = (item: EngineeringSearchItem) => {
    onNavigate(item);
    onClose();
  };

  const handleHandbookJump = (e: React.MouseEvent, item: EngineeringSearchItem) => {
    e.stopPropagation();
    if (item.handbookTopicId && onOpenHandbookTopic) {
      onOpenHandbookTopic(item.handbookTopicId);
      onClose();
    } else {
      handleSelect(item);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-14 px-3 sm:px-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      {/* Modal Container */}
      <div
        className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] font-mono border-cyan-500/30 ring-1 ring-cyan-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Search Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                <Search className="w-5 h-5 text-cyan-300" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <span>Глобальный Поиск по Инжинирингу</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold hidden sm:inline">
                    CFD • GNC • EDA • UAV
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Мгновенный переход к модулям, алгоритмам, физическим формулам и пресетам
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Закрыть (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Input Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по названию, формуле, БПЛА, пресету или алгоритму (например: DSMAC, Флаттер, Ламберт, Ан-2, 6-DoF, BEM, РЭБ)..."
              className="w-full bg-slate-900 border border-cyan-500/40 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                title="Очистить"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] text-slate-400 font-bold pr-1 shrink-0 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-500" /> Фильтр:
            </span>
            {[
              { id: 'all', label: 'Все' },
              { id: 'uav_systems', label: '🚁 БПЛА и Дроны' },
              { id: 'general_aero', label: '💨 Аэродинамика' },
              { id: 'aircraft_supersonic', label: '✈️ Самолеты & Сверхзвук' },
              { id: 'space_gnc', label: '🚀 Космос & GNC' },
              { id: 'eda_avionics', label: '⚡ EDA & Чипы' },
              { id: 'presets', label: '★ Пресеты ЛА' },
              { id: 'solvers', label: '⚙️ Солверы' },
            ].map((grp) => (
              <button
                key={grp.id}
                type="button"
                onClick={() => setActiveGroup(grp.id as SearchGroupType)}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeGroup === grp.id
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-black scale-[1.02]'
                    : 'bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {grp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        <div
          ref={resultsContainerRef}
          className="p-3 sm:p-4 overflow-y-auto space-y-2.5 flex-1 divide-y divide-slate-800/40"
        >
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-white">Ничего не найдено по запросу «{query}»</div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Попробуйте изменить запрос или выберите один из быстрых тегов ниже:
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 max-w-xl mx-auto">
                {POPULAR_QUICK_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag.split(' ')[0])}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 border border-slate-700 hover:border-cyan-700 text-xs text-slate-300 transition-colors cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = selectedIndex === index;
              const IconComp = ICONS_MAP[item.iconName] || Wind;

              return (
                <div
                  key={item.id}
                  data-index={index}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500/70 shadow-lg shadow-cyan-950/40 scale-[1.005] ring-1 ring-cyan-500/40'
                      : 'bg-slate-950/50 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  {/* Left Column: Icon + Titles + Description + Formula */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl border shrink-0 transition-transform group-hover:scale-105 ${
                        isSelected
                          ? 'bg-gradient-to-br from-cyan-500 to-indigo-600 text-slate-950 font-bold border-cyan-400'
                          : 'bg-slate-900 text-cyan-400 border-slate-700'
                      }`}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-gradient-to-r ${item.badgeColor}`}
                        >
                          {item.badge}
                        </span>

                        <span className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                          {item.title}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                        {item.description}
                      </p>

                      {/* Formula Preview if available */}
                      {item.formulaLatex && (
                        <div className="p-1.5 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px] font-mono text-cyan-300 inline-block max-w-full overflow-x-auto">
                          <MathText text={`$${item.formulaLatex}$`} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 self-stretch sm:self-auto justify-between sm:justify-center border-t sm:border-t-0 border-slate-800/80 pt-2 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950 font-black'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500 hover:text-slate-950'
                      }`}
                    >
                      <span>Перейти</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    {item.handbookTopicId && onOpenHandbookTopic && (
                      <button
                        type="button"
                        onClick={(e) => handleHandbookJump(e, item)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer"
                        title="Открыть главу справочника с формулами"
                      >
                        <BookOpen className="w-3 h-3 text-indigo-400" />
                        <span>Справочник</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info & keyboard tips */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span>
              Найдено: <strong className="text-white">{filteredItems.length}</strong> элементов
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-300 text-[10px]">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-300 text-[10px]">
                ↓
              </kbd>{' '}
              Навигация
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-300 text-[10px]">
                Enter
              </kbd>{' '}
              Перейти
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-300 text-[10px]">
                Esc
              </kbd>{' '}
              Закрыть
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
