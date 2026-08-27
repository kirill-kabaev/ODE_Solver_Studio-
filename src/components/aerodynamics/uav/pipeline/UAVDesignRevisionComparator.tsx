import React, { useState, useMemo } from 'react';
import {
  GitCompare,
  Layers,
  Save,
  Trash2,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Download,
  Copy,
  Check,
  RotateCcw,
  Scale,
  ShieldAlert,
  Plane,
  Battery,
  Gauge,
  Wind,
  Plus,
  Edit3
} from 'lucide-react';
import { DigitalTwinBusState } from './UAVDigitalTwinHub';

export interface UAVRevision {
  id: string;
  name: string;
  tag: string;
  timestamp: string;
  color: string;
  notes: string;
  state: {
    wingspan_m: number;
    chordRoot_m: number;
    chordTip_m: number;
    sweep_deg: number;
    wingArea_m2: number;
    aspectRatio: number;
    totalMass_kg: number;
    payload_kg: number;
    batteryMass_kg: number;
    batteryCap_mAh: number;
    batteryCells: number;
    staticMargin_percent: number;
    liftToDragRatio: number;
    v_stall_kmh: number;
    cruiseSpeed_kmh: number;
    calculatedRange_km: number;
    flightTime_min: number;
    thrustRequired_N: number;
    specificEnergy_WhPerKm: number;
  };
}

interface UAVDesignRevisionComparatorProps {
  currentBusState: DigitalTwinBusState;
  onApplyRevision?: (revisionState: Partial<DigitalTwinBusState>) => void;
}

export const UAVDesignRevisionComparator: React.FC<UAVDesignRevisionComparatorProps> = ({
  currentBusState,
  onApplyRevision,
}) => {
  // Built-in presets + user custom saved revisions
  const [revisions, setRevisions] = useState<UAVRevision[]>([
    {
      id: 'rev_current',
      name: 'Ревизия 1: Текущая сборка (Active)',
      tag: 'ACTIVE BASELINE',
      timestamp: 'Только что',
      color: '#14b8a6', // Teal
      notes: 'Текущее рабочее состояние Цифрового Двойника планера',
      state: {
        wingspan_m: currentBusState.wingspan_m,
        chordRoot_m: currentBusState.chordRoot_m,
        chordTip_m: currentBusState.chordTip_m,
        sweep_deg: currentBusState.sweep_deg,
        wingArea_m2: currentBusState.wingArea_m2,
        aspectRatio: currentBusState.aspectRatio,
        totalMass_kg: currentBusState.totalMass_kg,
        payload_kg: currentBusState.payload_kg,
        batteryMass_kg: currentBusState.batteryMass_kg,
        batteryCap_mAh: currentBusState.batteryCap_mAh,
        batteryCells: currentBusState.batteryCells,
        staticMargin_percent: currentBusState.staticMargin_percent,
        liftToDragRatio: currentBusState.liftToDragRatio,
        v_stall_kmh: currentBusState.v_stall_kmh,
        cruiseSpeed_kmh: currentBusState.cruiseSpeed_kmh,
        calculatedRange_km: currentBusState.calculatedRange_km,
        flightTime_min: currentBusState.flightTime_min,
        thrustRequired_N: currentBusState.thrustRequired_N,
        specificEnergy_WhPerKm: Number(
          (
            ((currentBusState.batteryCap_mAh / 1000) * (currentBusState.batteryCells * 3.7) * 0.85) /
            Math.max(1, currentBusState.calculatedRange_km)
          ).toFixed(1)
        ),
      },
    },
    {
      id: 'rev_long_range',
      name: 'Ревизия 2: Long-Range Recon (Li-Ion 6S)',
      tag: 'MAX ENDURANCE',
      timestamp: 'Предустановка',
      color: '#6366f1', // Indigo
      notes: 'Высокое удлинение крыла AR=12.5, батарея Li-Ion 21700 24Ah, максимальная дальность',
      state: {
        wingspan_m: 2.5,
        chordRoot_m: 0.26,
        chordTip_m: 0.14,
        sweep_deg: 8,
        wingArea_m2: 0.5,
        aspectRatio: 12.5,
        totalMass_kg: 4.6,
        payload_kg: 0.8,
        batteryMass_kg: 2.1,
        batteryCap_mAh: 24000,
        batteryCells: 6,
        staticMargin_percent: 10.5,
        liftToDragRatio: 16.8,
        v_stall_kmh: 44.5,
        cruiseSpeed_kmh: 75.0,
        calculatedRange_km: 195.0,
        flightTime_min: 156.0,
        thrustRequired_N: 2.68,
        specificEnergy_WhPerKm: 2.3,
      },
    },
    {
      id: 'rev_tactical_speed',
      name: 'Ревизия 3: Tactical Strike (LiPo 4S Delta)',
      tag: 'FAST PENETRATION',
      timestamp: 'Предустановка',
      color: '#f59e0b', // Amber
      notes: 'Стреловидное крыло, мощный двигатель, повышенная ветроустойчивость и скорость броска',
      state: {
        wingspan_m: 1.6,
        chordRoot_m: 0.38,
        chordTip_m: 0.16,
        sweep_deg: 26,
        wingArea_m2: 0.43,
        aspectRatio: 5.95,
        totalMass_kg: 3.4,
        payload_kg: 1.4,
        batteryMass_kg: 0.9,
        batteryCap_mAh: 8000,
        batteryCells: 4,
        staticMargin_percent: 8.2,
        liftToDragRatio: 10.5,
        v_stall_kmh: 49.0,
        cruiseSpeed_kmh: 110.0,
        calculatedRange_km: 58.0,
        flightTime_min: 31.6,
        thrustRequired_N: 3.17,
        specificEnergy_WhPerKm: 3.8,
      },
    },
    {
      id: 'rev_cargo_sar',
      name: 'Ревизия 4: Heavy Cargo / SAR Platform',
      tag: 'MAX PAYLOAD',
      timestamp: 'Предустановка',
      color: '#ec4899', // Pink
      notes: 'Увеличенная площадь крыла для подъема полезной нагрузки до 2.2 кг',
      state: {
        wingspan_m: 2.2,
        chordRoot_m: 0.34,
        chordTip_m: 0.20,
        sweep_deg: 10,
        wingArea_m2: 0.59,
        aspectRatio: 8.2,
        totalMass_kg: 5.4,
        payload_kg: 2.2,
        batteryMass_kg: 1.5,
        batteryCap_mAh: 16000,
        batteryCells: 6,
        staticMargin_percent: 11.8,
        liftToDragRatio: 13.2,
        v_stall_kmh: 46.2,
        cruiseSpeed_kmh: 70.0,
        calculatedRange_km: 110.0,
        flightTime_min: 94.0,
        thrustRequired_N: 4.01,
        specificEnergy_WhPerKm: 3.2,
      },
    },
  ]);

  const [baselineRevId, setBaselineRevId] = useState<string>('rev_current');
  const [selectedForDetailId, setSelectedForDetailId] = useState<string>('rev_long_range');
  const [newRevName, setNewRevName] = useState<string>('');
  const [isSavingSnapshot, setIsSavingSnapshot] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // Sync rev_current with live bus state if user hasn't explicitly overwritten
  const activeRevisions = useMemo(() => {
    return revisions.map((rev) => {
      if (rev.id === 'rev_current') {
        return {
          ...rev,
          state: {
            wingspan_m: currentBusState.wingspan_m,
            chordRoot_m: currentBusState.chordRoot_m,
            chordTip_m: currentBusState.chordTip_m,
            sweep_deg: currentBusState.sweep_deg,
            wingArea_m2: currentBusState.wingArea_m2,
            aspectRatio: currentBusState.aspectRatio,
            totalMass_kg: currentBusState.totalMass_kg,
            payload_kg: currentBusState.payload_kg,
            batteryMass_kg: currentBusState.batteryMass_kg,
            batteryCap_mAh: currentBusState.batteryCap_mAh,
            batteryCells: currentBusState.batteryCells,
            staticMargin_percent: currentBusState.staticMargin_percent,
            liftToDragRatio: currentBusState.liftToDragRatio,
            v_stall_kmh: currentBusState.v_stall_kmh,
            cruiseSpeed_kmh: currentBusState.cruiseSpeed_kmh,
            calculatedRange_km: currentBusState.calculatedRange_km,
            flightTime_min: currentBusState.flightTime_min,
            thrustRequired_N: currentBusState.thrustRequired_N,
            specificEnergy_WhPerKm: Number(
              (
                ((currentBusState.batteryCap_mAh / 1000) * (currentBusState.batteryCells * 3.7) * 0.85) /
                Math.max(1, currentBusState.calculatedRange_km)
              ).toFixed(1)
            ),
          },
        };
      }
      return rev;
    });
  }, [revisions, currentBusState]);

  const baselineRev = useMemo(() => {
    return activeRevisions.find((r) => r.id === baselineRevId) || activeRevisions[0];
  }, [activeRevisions, baselineRevId]);

  const detailRev = useMemo(() => {
    return activeRevisions.find((r) => r.id === selectedForDetailId) || activeRevisions[1] || activeRevisions[0];
  }, [activeRevisions, selectedForDetailId]);

  // Handle saving a new snapshot
  const handleSaveSnapshot = () => {
    const name = newRevName.trim() || `Снимок Конфигурации #${revisions.length + 1}`;
    const newRev: UAVRevision = {
      id: `snapshot_${Date.now()}`,
      name,
      tag: 'USER SNAPSHOT',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      color: '#38bdf8', // Sky
      notes: `Пользовательский снимок параметров планера (Размах ${currentBusState.wingspan_m}м, MTOW ${currentBusState.totalMass_kg}кг)`,
      state: {
        wingspan_m: currentBusState.wingspan_m,
        chordRoot_m: currentBusState.chordRoot_m,
        chordTip_m: currentBusState.chordTip_m,
        sweep_deg: currentBusState.sweep_deg,
        wingArea_m2: currentBusState.wingArea_m2,
        aspectRatio: currentBusState.aspectRatio,
        totalMass_kg: currentBusState.totalMass_kg,
        payload_kg: currentBusState.payload_kg,
        batteryMass_kg: currentBusState.batteryMass_kg,
        batteryCap_mAh: currentBusState.batteryCap_mAh,
        batteryCells: currentBusState.batteryCells,
        staticMargin_percent: currentBusState.staticMargin_percent,
        liftToDragRatio: currentBusState.liftToDragRatio,
        v_stall_kmh: currentBusState.v_stall_kmh,
        cruiseSpeed_kmh: currentBusState.cruiseSpeed_kmh,
        calculatedRange_km: currentBusState.calculatedRange_km,
        flightTime_min: currentBusState.flightTime_min,
        thrustRequired_N: currentBusState.thrustRequired_N,
        specificEnergy_WhPerKm: Number(
          (
            ((currentBusState.batteryCap_mAh / 1000) * (currentBusState.batteryCells * 3.7) * 0.85) /
            Math.max(1, currentBusState.calculatedRange_km)
          ).toFixed(1)
        ),
      },
    };

    setRevisions((prev) => [...prev, newRev]);
    setNewRevName('');
    setIsSavingSnapshot(false);
  };

  const handleDeleteRevision = (id: string) => {
    if (id === 'rev_current') return;
    setRevisions((prev) => prev.filter((r) => r.id !== id));
    if (baselineRevId === id) setBaselineRevId('rev_current');
    if (selectedForDetailId === id) setSelectedForDetailId('rev_current');
  };

  // Export Matrix to JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activeRevisions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `uav_revision_comparison_matrix_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Copy Markdown Table
  const handleCopyMarkdown = () => {
    let md = `| Параметр | ${activeRevisions.map((r) => r.name).join(' | ')} |\n`;
    md += `|:---|${activeRevisions.map(() => ':---:|').join('')}\n`;
    md += `| Размах крыла (м) | ${activeRevisions.map((r) => r.state.wingspan_m.toFixed(2)).join(' | ')} |\n`;
    md += `| Взлетная масса MTOW (кг) | ${activeRevisions.map((r) => r.state.totalMass_kg.toFixed(2)).join(' | ')} |\n`;
    md += `| Полезная нагрузка (кг) | ${activeRevisions.map((r) => r.state.payload_kg.toFixed(2)).join(' | ')} |\n`;
    md += `| Аэродинамическое качество L/D | ${activeRevisions.map((r) => r.state.liftToDragRatio.toFixed(1)).join(' | ')} |\n`;
    md += `| Скорость сваливания (км/ч) | ${activeRevisions.map((r) => r.state.v_stall_kmh.toFixed(1)).join(' | ')} |\n`;
    md += `| Крейсерская скорость (км/ч) | ${activeRevisions.map((r) => r.state.cruiseSpeed_kmh.toFixed(0)).join(' | ')} |\n`;
    md += `| Расчетная дальность (км) | ${activeRevisions.map((r) => r.state.calculatedRange_km.toFixed(0)).join(' | ')} |\n`;
    md += `| Время полета (мин) | ${activeRevisions.map((r) => r.state.flightTime_min.toFixed(0)).join(' | ')} |\n`;
    md += `| Удельный расход (Вт·ч/км) | ${activeRevisions.map((r) => r.state.specificEnergy_WhPerKm.toFixed(1)).join(' | ')} |\n`;

    navigator.clipboard.writeText(md);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  // Radar Scores Function for each Revision
  const getRadarScores = (rev: UAVRevision) => {
    const s = rev.state;
    const rangeScore = Math.min(100, (s.calculatedRange_km / 180) * 100);
    const payloadScore = Math.min(100, (s.payload_kg / 2.5) * 100);
    const wingLoading = s.totalMass_kg / Math.max(0.01, s.wingArea_m2);
    const gustScore = Math.min(100, Math.max(20, (wingLoading / 15) * 90));
    const smDist = Math.abs(s.staticMargin_percent - 11);
    const handlingScore = Math.max(10, 100 - smDist * 9);
    const aeroScore = Math.min(100, (s.liftToDragRatio / 18) * 100);
    const launchScore = Math.max(10, Math.min(100, (55 - s.v_stall_kmh) * 2.5 + (6 - s.totalMass_kg) * 8));

    return [
      { axis: 'Дальность', score: Math.round(rangeScore) },
      { axis: 'Полезная нагрузка', score: Math.round(payloadScore) },
      { axis: 'Ветроустойчивость', score: Math.round(gustScore) },
      { axis: 'Устойчивость (SM)', score: Math.round(handlingScore) },
      { axis: 'Качество (L/D)', score: Math.round(aeroScore) },
      { axis: 'Простота старта', score: Math.round(launchScore) },
    ];
  };

  // Differential Metrics Table Definition
  const metricRows = [
    {
      label: 'Размах крыла (Wingspan)',
      unit: 'м',
      getValue: (r: UAVRevision) => r.state.wingspan_m,
      format: (v: number) => v.toFixed(2),
      isBetter: (val: number, base: number) => val > base ? 'neutral' : 'neutral',
    },
    {
      label: 'Взлетная масса (MTOW)',
      unit: 'кг',
      getValue: (r: UAVRevision) => r.state.totalMass_kg,
      format: (v: number) => v.toFixed(2),
      isBetter: (val: number, base: number) => val < base ? 'good' : 'bad',
    },
    {
      label: 'Полезная нагрузка (Payload)',
      unit: 'кг',
      getValue: (r: UAVRevision) => r.state.payload_kg,
      format: (v: number) => v.toFixed(2),
      isBetter: (val: number, base: number) => val > base ? 'good' : val < base ? 'bad' : 'neutral',
    },
    {
      label: 'Емкость батареи',
      unit: 'мАч',
      getValue: (r: UAVRevision) => r.state.batteryCap_mAh,
      format: (v: number) => `${v}`,
      isBetter: (val: number, base: number) => val > base ? 'good' : 'neutral',
    },
    {
      label: 'Аэродинамическое качество (L/D)',
      unit: 'ед',
      getValue: (r: UAVRevision) => r.state.liftToDragRatio,
      format: (v: number) => v.toFixed(1),
      isBetter: (val: number, base: number) => val > base ? 'good' : val < base ? 'bad' : 'neutral',
    },
    {
      label: 'Скорость сваливания (V_stall)',
      unit: 'км/ч',
      getValue: (r: UAVRevision) => r.state.v_stall_kmh,
      format: (v: number) => v.toFixed(1),
      isBetter: (val: number, base: number) => val < base ? 'good' : val > base ? 'bad' : 'neutral',
    },
    {
      label: 'Крейсерская скорость (V_cruise)',
      unit: 'км/ч',
      getValue: (r: UAVRevision) => r.state.cruiseSpeed_kmh,
      format: (v: number) => v.toFixed(0),
      isBetter: (val: number, base: number) => val > base ? 'neutral' : 'neutral',
    },
    {
      label: 'Запас устойчивости (Static Margin)',
      unit: '%',
      getValue: (r: UAVRevision) => r.state.staticMargin_percent,
      format: (v: number) => `${v.toFixed(1)}%`,
      isBetter: (val: number, base: number) => {
        const valDist = Math.abs(val - 11);
        const baseDist = Math.abs(base - 11);
        return valDist < baseDist ? 'good' : valDist > baseDist ? 'bad' : 'neutral';
      },
    },
    {
      label: 'Расчетная дальность (Range)',
      unit: 'км',
      getValue: (r: UAVRevision) => r.state.calculatedRange_km,
      format: (v: number) => v.toFixed(0),
      isBetter: (val: number, base: number) => val > base ? 'good' : val < base ? 'bad' : 'neutral',
    },
    {
      label: 'Время в воздухе (Endurance)',
      unit: 'мин',
      getValue: (r: UAVRevision) => r.state.flightTime_min,
      format: (v: number) => v.toFixed(0),
      isBetter: (val: number, base: number) => val > base ? 'good' : val < base ? 'bad' : 'neutral',
    },
    {
      label: 'Удельный расход энергии',
      unit: 'Вт·ч/км',
      getValue: (r: UAVRevision) => r.state.specificEnergy_WhPerKm,
      format: (v: number) => v.toFixed(1),
      isBetter: (val: number, base: number) => val < base ? 'good' : val > base ? 'bad' : 'neutral',
    },
  ];

  return (
    <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-md space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-teal-500/20 border border-indigo-500/40 rounded-xl text-indigo-400">
            <GitCompare className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                Мульти-Конфигурационный Компаратор & A/B Матрица Ревизий
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                A/B REVISION MATRIX
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Сквозное сопоставление альтернативных компоновок планера, расчет дифференциальных дельт (&Delta;) и экспорт инженерного отчета
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsSavingSnapshot(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs font-mono flex items-center gap-1.5 shadow-lg transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Сохранить снимок
          </button>
          <button
            onClick={handleCopyMarkdown}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-mono flex items-center gap-1.5 border border-slate-700 transition-all"
          >
            {copiedNotification ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedNotification ? 'Скопировано!' : 'Копировать MD'}
          </button>
          <button
            onClick={handleExportJSON}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-all"
            title="Экспорт в JSON"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Snapshot Modal / Input Bar */}
      {isSavingSnapshot && (
        <div className="p-4 bg-indigo-950/40 border border-indigo-500/50 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-300 font-mono flex items-center gap-1.5">
              <Save className="w-4 h-4" />
              Фиксация текущей сборки как контрольной точки (Snapshot)
            </span>
            <button onClick={() => setIsSavingSnapshot(false)} className="text-slate-400 hover:text-white text-xs">
              ✕ Отмена
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newRevName}
              onChange={(e) => setNewRevName(e.target.value)}
              placeholder="Например: Вариант с Li-Ion 6S и размахом 2.4м"
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-400 font-mono"
            />
            <button
              onClick={handleSaveSnapshot}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs font-mono transition-all"
            >
              Зафиксировать
            </button>
          </div>
        </div>
      )}

      {/* Revision Selection Chips & Baseline Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Выберите базовую ревизию для расчета дельт (&Delta;):</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">База:</span>
            <select
              value={baselineRevId}
              onChange={(e) => setBaselineRevId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-teal-300 font-mono focus:outline-none focus:border-teal-500"
            >
              {activeRevisions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cards row for quick inspection & loading */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {activeRevisions.map((rev) => {
            const isBase = rev.id === baselineRevId;
            const isSelected = rev.id === selectedForDetailId;

            return (
              <div
                key={rev.id}
                onClick={() => setSelectedForDetailId(rev.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all relative space-y-2 ${
                  isSelected
                    ? 'bg-slate-800/90 border-indigo-400 ring-1 ring-indigo-400/50 shadow-lg'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <span
                      className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase mb-1"
                      style={{ backgroundColor: `${rev.color}20`, color: rev.color, borderColor: `${rev.color}40`, borderWidth: 1 }}
                    >
                      {rev.tag}
                    </span>
                    <h4 className="text-xs font-bold text-white leading-tight">{rev.name}</h4>
                  </div>
                  {rev.id !== 'rev_current' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRevision(rev.id);
                      }}
                      className="text-slate-600 hover:text-rose-400 p-1 transition-colors"
                      title="Удалить ревизию"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">{rev.notes}</p>

                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] font-mono border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block text-[9px]">ДАЛЬНОСТЬ:</span>
                    <span className="text-emerald-400 font-bold">{rev.state.calculatedRange_km.toFixed(0)} км</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">MTOW / ПН:</span>
                    <span className="text-slate-200">{rev.state.totalMass_kg.toFixed(1)} / {rev.state.payload_kg.toFixed(1)} кг</span>
                  </div>
                </div>

                {onApplyRevision && rev.id !== 'rev_current' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onApplyRevision({
                        wingspan_m: rev.state.wingspan_m,
                        chordRoot_m: rev.state.chordRoot_m,
                        chordTip_m: rev.state.chordTip_m,
                        sweep_deg: rev.state.sweep_deg,
                        batteryCap_mAh: rev.state.batteryCap_mAh,
                        batteryCells: rev.state.batteryCells,
                        cruiseSpeed_kmh: rev.state.cruiseSpeed_kmh,
                      });
                    }}
                    className="w-full mt-2 py-1 px-2 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all border border-indigo-500/30"
                  >
                    <Sparkles className="w-3 h-3" />
                    Применить в Digital Twin
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* A/B COMPARATIVE DIFFERENTIAL TABLE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-200 font-mono flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Дифференциальная Матрица Параметров относительно: <span className="text-teal-300 font-bold">{baselineRev.name}</span>
          </h4>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/90">
          <table className="w-full text-xs font-mono text-left">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                <th className="py-2.5 px-3 font-semibold">Параметр планера</th>
                <th className="py-2.5 px-3 font-semibold text-teal-300 bg-teal-950/20">
                  База: {baselineRev.tag}
                </th>
                {activeRevisions
                  .filter((r) => r.id !== baselineRev.id)
                  .map((r) => (
                    <th key={r.id} className="py-2.5 px-3 font-semibold" style={{ color: r.color }}>
                      {r.tag}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {metricRows.map((row, idx) => {
                const baseVal = row.getValue(baselineRev);

                return (
                  <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-2 px-3 text-slate-300 font-medium">
                      {row.label}
                    </td>
                    <td className="py-2 px-3 text-teal-300 font-bold bg-teal-950/10">
                      {row.format(baseVal)} {row.unit}
                    </td>
                    {activeRevisions
                      .filter((r) => r.id !== baselineRev.id)
                      .map((r) => {
                        const val = row.getValue(r);
                        const delta = val - baseVal;
                        const pct = baseVal !== 0 ? (delta / baseVal) * 100 : 0;
                        const rating = row.isBetter(val, baseVal);

                        return (
                          <td key={r.id} className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-200">
                                {row.format(val)} {row.unit}
                              </span>
                              {Math.abs(delta) > 0.01 && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                    rating === 'good'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : rating === 'bad'
                                      ? 'bg-rose-500/20 text-rose-400'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {delta > 0 ? '+' : ''}
                                  {pct.toFixed(0)}%
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MULTI-POLYGON OVERLAID RADAR COMPARISON */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
        {/* Overlaid Radar SVG */}
        <div className="flex flex-col items-center justify-center space-y-2">
          <span className="text-xs font-bold text-slate-300 font-mono">
            Совмещенный Мульти-Радар Всех Ревизий:
          </span>
          <svg viewBox="0 0 300 260" className="w-72 h-72">
            {/* Background Hexagon Rings */}
            <polygon points="150,30 254,90 254,210 150,270 46,210 46,90" fill="none" stroke="#1e293b" strokeWidth="1" />
            <polygon points="150,60 228,105 228,195 150,240 72,195 72,105" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
            <polygon points="150,90 202,120 202,180 150,210 98,180 98,120" fill="none" stroke="#334155" strokeWidth="1" />

            {/* Axes */}
            <line x1="150" y1="150" x2="150" y2="30" stroke="#334155" strokeWidth="1" />
            <line x1="150" y1="150" x2="254" y2="90" stroke="#334155" strokeWidth="1" />
            <line x1="150" y1="150" x2="254" y2="210" stroke="#334155" strokeWidth="1" />
            <line x1="150" y1="150" x2="150" y2="270" stroke="#334155" strokeWidth="1" />
            <line x1="150" y1="150" x2="46" y2="210" stroke="#334155" strokeWidth="1" />
            <line x1="150" y1="150" x2="46" y2="90" stroke="#334155" strokeWidth="1" />

            {/* Render Each Revision Polygon */}
            {activeRevisions.map((rev) => {
              const scores = getRadarScores(rev);
              const pts = scores
                .map((s, idx) => {
                  const angle = (idx * 60 - 90) * (Math.PI / 180);
                  const radius = (s.score / 100) * 110;
                  const x = 150 + radius * Math.cos(angle);
                  const y = 150 + radius * Math.sin(angle);
                  return `${x},${y}`;
                })
                .join(' ');

              const isHighlighted = rev.id === selectedForDetailId;

              return (
                <g key={rev.id}>
                  <polygon
                    points={pts}
                    fill={`${rev.color}${isHighlighted ? '35' : '15'}`}
                    stroke={rev.color}
                    strokeWidth={isHighlighted ? 3 : 1.5}
                    strokeDasharray={rev.id === 'rev_current' ? 'none' : isHighlighted ? 'none' : '3 2'}
                  />
                </g>
              );
            })}

            {/* Axis Labels */}
            <text x="150" y="20" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">Дальность</text>
            <text x="260" y="88" fill="#94a3b8" fontSize="9" textAnchor="start" fontFamily="monospace">Полезная нагр.</text>
            <text x="260" y="215" fill="#94a3b8" fontSize="9" textAnchor="start" fontFamily="monospace">Ветроустойчив.</text>
            <text x="150" y="285" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">Устойчивость SM</text>
            <text x="40" y="215" fill="#94a3b8" fontSize="9" textAnchor="end" fontFamily="monospace">Качество L/D</text>
            <text x="40" y="88" fill="#94a3b8" fontSize="9" textAnchor="end" fontFamily="monospace">Простота старта</text>
          </svg>
        </div>

        {/* Trade-off Decision Insight Box */}
        <div className="flex flex-col justify-between space-y-3 text-xs font-mono">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-white uppercase">
                Инженерное заключение: {detailRev.name}
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800">
              {detailRev.id === 'rev_long_range' && (
                <>
                  Ревизия <b>Long-Range</b> превосходит базовую сборку по дальности на{' '}
                  <span className="text-emerald-400 font-bold">
                    +{Math.max(0, detailRev.state.calculatedRange_km - baselineRev.state.calculatedRange_km).toFixed(0)} км
                  </span>
                  {' '}за счет сверхвысокого удлинения крыла ($AR=12.5$) и перехода на ячейки Li-Ion 21700 (240 Вт·ч/кг). Однако требует катапультного старта из-за скорости сваливания {detailRev.state.v_stall_kmh.toFixed(1)} км/ч.
                </>
              )}
              {detailRev.id === 'rev_tactical_speed' && (
                <>
                  Ревизия <b>Tactical Speed</b> обеспечивает быстрый прорыв зон ПВО/РЭБ со скоростью до 110 км/ч при высокой ветроустойчивости. Платой является сокращение дальности до {detailRev.state.calculatedRange_km.toFixed(0)} км и повышенный удельный расход энергии (3.8 Вт·ч/км).
                </>
              )}
              {detailRev.id === 'rev_cargo_sar' && (
                <>
                  Ревизия <b>Heavy Cargo</b> поднимает максимальную полезную нагрузку до 2.2 кг (тепловизоры высокой кратности, ретрансляторы или медикаменты) при сохранении стабильного 90-минутного патрулирования.
                </>
              )}
              {detailRev.id === 'rev_current' && (
                <>
                  Текущая активная сборка Цифрового Двойника планера. Используется как эталон для проектирования и верификации в аэродинамической трубе.
                </>
              )}
              {detailRev.tag === 'USER SNAPSHOT' && (
                <>
                  Пользовательский снимок параметров. Сохранен для истории версий и архивирования промежуточных этапов расчета.
                </>
              )}
            </p>
          </div>

          {/* Legend */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <span className="text-slate-500 text-[10px] block">ЛЕГЕНДА РЕВИЗИЙ:</span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {activeRevisions.map((r) => (
                <div key={r.id} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                  <span className="text-slate-300 truncate">{r.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
