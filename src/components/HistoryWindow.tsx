import React, { useState } from 'react';
import {
  History,
  Play,
  Trash2,
  Edit3,
  Search,
  ExternalLink,
  Sigma,
  Calendar,
  Layers,
  Wrench,
  CheckCircle2,
  Bot,
  Cpu,
  Zap,
  RotateCcw,
  Sparkles,
  Sliders,
  ChevronRight,
  HelpCircle,
  Clock,
  ArrowRight,
  Maximize2,
  X,
  LineChart,
} from 'lucide-react';
import { HistoryRecord, CauchyCondition, SolverEngine } from '../types';
import { MathView } from './MathView';
import { MiniSolutionGraph } from './MiniSolutionGraph';
import { InteractiveODEGraph } from './InteractiveODEGraph';

interface HistoryWindowProps {
  history: HistoryRecord[];
  onLoadAndReSolve: (
    record: HistoryRecord,
    overrideCauchy?: CauchyCondition | null,
    overrideEngine?: SolverEngine
  ) => void;
  onClearHistory: () => void;
  onDeleteRecord: (id: string) => void;
  onSelectForView: (record: HistoryRecord) => void;
}

export const HistoryWindow: React.FC<HistoryWindowProps> = ({
  history,
  onLoadAndReSolve,
  onClearHistory,
  onDeleteRecord,
  onSelectForView,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(
    history.length > 0 ? history[0].id : null
  );

  // Fullscreen Graph Modal state
  const [isGraphModalOpen, setIsGraphModalOpen] = useState<boolean>(false);

  // Edit / Re-solve state with new coefficients / conditions
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [customEquation, setCustomEquation] = useState<string>('');
  const [customHasCauchy, setCustomHasCauchy] = useState<boolean>(false);
  const [customCauchy, setCustomCauchy] = useState<CauchyCondition>({ x0: '0', y0: '1', yp0: '0' });
  const [customEngine, setCustomEngine] = useState<SolverEngine>('cpu');

  const filteredHistory = history.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.equation.toLowerCase().includes(q) ||
      (item.solution.equationType || '').toLowerCase().includes(q) ||
      (item.solution.methodUsed || '').toLowerCase().includes(q)
    );
  });

  const selectedRecord = history.find((h) => h.id === selectedRecordId) || history[0] || null;

  const startReSolving = (rec: HistoryRecord) => {
    setEditingRecordId(rec.id);
    setCustomEquation(rec.equation);
    setCustomHasCauchy(Boolean(rec.cauchy));
    setCustomCauchy(rec.cauchy || { x0: '0', y0: '1', yp0: '0' });
    setCustomEngine(rec.engine);
  };

  const handleExecuteReSolve = () => {
    if (!editingRecordId) return;
    const rec = history.find((h) => h.id === editingRecordId);
    if (!rec) return;

    // Create modified record
    const updated: HistoryRecord = {
      ...rec,
      equation: customEquation,
      cauchy: customHasCauchy ? customCauchy : null,
      engine: customEngine,
    };

    onLoadAndReSolve(updated, customHasCauchy ? customCauchy : null, customEngine);
    setEditingRecordId(null);
  };

  return (
    <div className="relative flex flex-col h-full gap-3 text-slate-200">
      {/* Top Toolbar: Search & Clean */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по уравнению, методу или типу..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            Всего записей: <strong className="text-slate-300">{history.length}</strong>
          </span>
          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              title="Очистить всю историю"
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700/60 hover:border-rose-700/60 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Очистить</span>
            </button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 min-h-[300px] text-center p-8 text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800/60">
          <History className="w-12 h-12 mb-3 text-slate-700 stroke-1" />
          <h4 className="text-sm font-semibold text-slate-300 mb-1">История решений пуста</h4>
          <p className="text-xs text-slate-500 max-w-sm">
            Каждое решенное дифференциальное уравнение автоматически сохраняется здесь со всеми шагами, свойствами, интерактивным графиком и возможностью повторного решения с новыми параметрами.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 min-h-0 overflow-hidden">
          {/* Left List of Records (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-2 overflow-y-auto pr-1">
            {filteredHistory.map((rec) => {
              const isSelected = selectedRecord?.id === rec.id;
              const dateStr = new Date(rec.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={rec.id}
                  onClick={() => setSelectedRecordId(rec.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500/80 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          rec.engine === 'cpu'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                            : rec.engine === 'gpu'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                            : 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60'
                        }`}
                      >
                        {rec.engine}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {dateStr}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRecord(rec.id);
                      }}
                      title="Удалить из истории"
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Equation text */}
                  <div className="font-mono text-xs text-cyan-300 font-medium truncate">
                    {rec.equation}
                  </div>

                  {/* Quick badges */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate max-w-[200px] text-slate-500">
                      {rec.solution.equationType}
                    </span>
                    {rec.cauchy && (
                      <span className="text-emerald-400 font-mono text-[10px] bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/40">
                        y({rec.cauchy.x0})={rec.cauchy.y0}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Detail Card & Re-solve Form (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3 overflow-y-auto bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
            {selectedRecord && (
              <>
                {/* Header & Quick Action Buttons */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{selectedRecord.solution.equationType}</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Метод: <span className="text-cyan-300">{selectedRecord.solution.methodUsed}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectForView(selectedRecord)}
                      title="Открыть во всех основных окнах (вывод, график, аналитика)"
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Открыть в окнах</span>
                    </button>
                    <button
                      onClick={() => startReSolving(selectedRecord)}
                      title="Повторно решить с новыми коэффициентами"
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-950/50 active:scale-95 cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Изменить и перерешать</span>
                    </button>
                  </div>
                </div>

                {/* Re-solve Modal / Drawer form when editing */}
                {editingRecordId === selectedRecord.id && (
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-cyan-500/60 flex flex-col gap-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5" />
                        Повторный расчет с новыми параметрами:
                      </span>
                      <button
                        onClick={() => setEditingRecordId(null)}
                        className="text-xs text-slate-500 hover:text-slate-300"
                      >
                        Отмена
                      </button>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-400">Уравнение / Коэффициенты:</label>
                      <input
                        type="text"
                        value={customEquation}
                        onChange={(e) => setCustomEquation(e.target.value)}
                        className="bg-slate-900 px-3 py-2 rounded-lg border border-slate-700 text-cyan-300 font-mono text-xs focus:border-cyan-500 outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-2 pt-1 border-t border-slate-800">
                      <label className="flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={customHasCauchy}
                          onChange={(e) => setCustomHasCauchy(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500 accent-cyan-500 cursor-pointer"
                        />
                        <span className="font-semibold text-slate-300">
                          Задать новые начальные условия Коши
                        </span>
                      </label>

                      {customHasCauchy && (
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={customCauchy.x0}
                            onChange={(e) =>
                              setCustomCauchy({ ...customCauchy, x0: e.target.value })
                            }
                            placeholder="x0"
                            className="bg-slate-900 px-2.5 py-1.5 rounded border border-slate-700 text-xs font-mono text-cyan-300 outline-none"
                          />
                          <input
                            type="text"
                            value={customCauchy.y0}
                            onChange={(e) =>
                              setCustomCauchy({ ...customCauchy, y0: e.target.value })
                            }
                            placeholder="y0"
                            className="bg-slate-900 px-2.5 py-1.5 rounded border border-slate-700 text-xs font-mono text-cyan-300 outline-none"
                          />
                          <input
                            type="text"
                            value={customCauchy.yp0 || ''}
                            onChange={(e) =>
                              setCustomCauchy({ ...customCauchy, yp0: e.target.value })
                            }
                            placeholder="y'0"
                            className="bg-slate-900 px-2.5 py-1.5 rounded border border-slate-700 text-xs font-mono text-cyan-300 outline-none"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-400">Движок:</span>
                        {(['cpu', 'gpu', 'ai'] as SolverEngine[]).map((eng) => (
                          <button
                            key={eng}
                            type="button"
                            onClick={() => setCustomEngine(eng)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                              customEngine === eng
                                ? 'bg-cyan-500 text-slate-950'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {eng}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={handleExecuteReSolve}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow active:scale-95 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Вычислить</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Equation & Formula Preview */}
                <div className="flex flex-col gap-2">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-1">
                    <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                      Исходное уравнение:
                    </span>
                    <div className="font-mono text-xs text-cyan-300 overflow-x-auto py-1">
                      <MathView math={selectedRecord.solution.equationNormalizedLatex} />
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-cyan-500/30 flex flex-col gap-1">
                    <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                      Общее аналитическое решение:
                    </span>
                    <div className="overflow-x-auto py-1 text-slate-200">
                      <MathView
                        math={selectedRecord.solution.generalSolutionLatex}
                        block
                        className="text-base text-cyan-300"
                      />
                    </div>
                  </div>

                  {selectedRecord.solution.particularSolutionLatex && (
                    <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/30 flex flex-col gap-1">
                      <span className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider">
                        Частное решение Коши:
                      </span>
                      <div className="overflow-x-auto py-1 text-emerald-300">
                        <MathView
                          math={selectedRecord.solution.particularSolutionLatex}
                          block
                          className="text-base"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Graph + Properties Split Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Visual Graph Preview with Expand Button */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>График и поле направлений:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsGraphModalOpen(true)}
                        className="px-2 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 hover:text-cyan-200 border border-cyan-700/60 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Развернуть график на всё окно с возможностью построения линий от разных начальных условий"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>Развернуть</span>
                      </button>
                    </div>

                    <MiniSolutionGraph
                      solution={selectedRecord.solution}
                      width={280}
                      height={170}
                      className="w-full"
                      onClick={() => setIsGraphModalOpen(true)}
                    />
                    <span className="text-[10px] text-slate-500 text-center">
                      Нажмите на график, чтобы развернуть и строить линии Коши
                    </span>
                  </div>

                  {/* Properties & Real Applications */}
                  <div className="flex flex-col gap-2">
                    {/* Mathematical Properties */}
                    <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                      <span className="font-semibold text-indigo-300 block mb-1 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        Свойства уравнения:
                      </span>
                      <ul className="flex flex-col gap-1 text-slate-400 text-[11px]">
                        <li>• Порядок уравнения: <strong>{selectedRecord.solution.order}</strong></li>
                        <li>• Метод решения: <strong>{selectedRecord.solution.methodUsed}</strong></li>
                        {selectedRecord.preAnalysis?.properties?.map((p, idx) => (
                          <li key={idx}>• {p}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Applications */}
                    <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                      <span className="font-semibold text-emerald-300 block mb-1 flex items-center gap-1">
                        <Wrench className="w-3.5 h-3.5" />
                        Применение на практике:
                      </span>
                      <ul className="flex flex-col gap-1 text-slate-400 text-[11px]">
                        {selectedRecord.preAnalysis?.physicalApplications?.map((app, idx) => (
                          <li key={idx}>• {app}</li>
                        )) || (
                          <>
                            <li>• Моделирование колебательных процессов в физике</li>
                            <li>• Анализ переходных процессов в электротехнике</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Full-Window Interactive Graph Modal inside History */}
      {isGraphModalOpen && selectedRecord && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md p-4 flex flex-col gap-3 animate-fadeIn rounded-xl border border-slate-800 shadow-2xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <LineChart className="w-4 h-4 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Интерактивный график ДУ: {selectedRecord.equation}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedRecord.solution.equationType} • Построение интегральных траекторий от произвольных начальных условий
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onSelectForView(selectedRecord);
                  setIsGraphModalOpen(false);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Перейти в главное рабочее пространство с этим уравнением"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Открыть в главном окне</span>
              </button>

              <button
                type="button"
                onClick={() => setIsGraphModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Закрыть полноэкранный график"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 w-full">
            <InteractiveODEGraph
              solution={selectedRecord.solution}
              initialCauchy={selectedRecord.cauchy}
              isExpanded={true}
              onClose={() => setIsGraphModalOpen(false)}
              onOpenInDesktopGraph={() => {
                onSelectForView(selectedRecord);
                setIsGraphModalOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
