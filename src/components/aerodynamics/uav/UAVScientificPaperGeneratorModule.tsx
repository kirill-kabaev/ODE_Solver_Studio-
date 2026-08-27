import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  FileText,
  FileCode,
  Download,
  Copy,
  Check,
  Printer,
  Sparkles,
  Sliders,
  Layers,
  Atom,
  Cpu,
  Wind,
  ShieldCheck,
  Zap,
  Activity,
  Award,
  Globe,
  Share2,
  Bookmark,
  ChevronRight,
  Code,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  Eye,
  Settings,
  Scale,
  GraduationCap,
  ExternalLink,
  Flame,
  Search,
  CheckSquare
} from 'lucide-react';
import { UAVScientificPaperGenerator, PaperTopicConfig, JournalStandard, AcademicRigorLevel } from './pipeline/UAVScientificPaperGenerator';
import { DigitalTwinBusState } from './pipeline/UAVDigitalTwinHub';
import { UAV_AIRFOIL_LIBRARY } from './pipeline/UAVAirfoilPolarDatabase';

export const UAVScientificPaperGeneratorModule: React.FC = () => {
  // Configurable Digital Twin bus state for the dedicated module view
  const [wingspan_m, setWingspan_m] = useState<number>(2.4);
  const [totalMass_kg, setTotalMass_kg] = useState<number>(4.8);
  const [aspectRatio, setAspectRatio] = useState<number>(7.8);
  const [sweep_deg, setSweep_deg] = useState<number>(18.5);
  const [cruiseSpeed_kmh, setCruiseSpeed_kmh] = useState<number>(85);
  const [v_stall_kmh, setV_stall_kmh] = useState<number>(38);
  const [liftToDragRatio, setLiftToDragRatio] = useState<number>(17.4);
  const [staticMargin_percent, setStaticMargin_percent] = useState<number>(8.5);
  const [batteryCap_mAh, setBatteryCap_mAh] = useState<number>(16000);
  const [batteryCells, setBatteryCells] = useState<number>(6);
  const [selectedAirfoil, setSelectedAirfoil] = useState<string>('MH60 Reflexed (Tailless)');
  const [activeDomainFilter, setActiveDomainFilter] = useState<string>('all');

  // Dynamic calculations for the Digital Twin State
  const busState: DigitalTwinBusState = useMemo(() => {
    const wingArea_m2 = (wingspan_m * wingspan_m) / aspectRatio;
    const chordMean = wingArea_m2 / wingspan_m;
    const taperRatio = 0.55;
    const chordRoot_m = (2 * chordMean) / (1 + taperRatio);
    const chordTip_m = chordRoot_m * taperRatio;
    const calculatedRange_km = Math.round(cruiseSpeed_kmh * ((batteryCap_mAh * 0.8 * 22.2) / (120 * 1000)));
    const flightTime_min = Math.round(((batteryCap_mAh * 0.8 * 22.2) / 135) * 60);

    return {
      wingspan_m,
      chordRoot_m,
      chordTip_m,
      sweep_deg,
      wingArea_m2,
      aspectRatio,
      taperRatio,
      mac_m: chordMean,
      payload_kg: 0.8,
      batteryMass_kg: 1.6,
      avionicsMass_kg: 0.5,
      structuralMass_kg: 1.9,
      totalMass_kg,
      x_cg_m: 0.28,
      x_np_m: 0.32,
      staticMargin_percent,
      isStable: staticMargin_percent > 5,
      airfoil: UAV_AIRFOIL_LIBRARY[0],
      cl_cruise: 0.42,
      cd_total: 0.024,
      liftToDragRatio,
      v_stall_kmh,
      thrustRequired_N: (totalMass_kg * 9.81) / liftToDragRatio,
      batteryCells,
      batteryCap_mAh,
      motorKv: 620,
      propDiameter_in: 13,
      propPitch_in: 8,
      cruiseSpeed_kmh,
      cruiseCurrent_A: 14.5,
      flightTime_min,
      calculatedRange_km,
      maxG_limit: 4.5,
      v_a_kmh: 95,
      v_dive_kmh: 160,
      v_flutter_kmh: 210,
      rfFrequency_MHz: 915,
      txPower_W: 1.5,
      radioHorizon_km: 45,
      ewJammingSafeRange_km: 22
    };
  }, [
    wingspan_m,
    totalMass_kg,
    aspectRatio,
    sweep_deg,
    cruiseSpeed_kmh,
    v_stall_kmh,
    liftToDragRatio,
    staticMargin_percent,
    batteryCap_mAh,
    batteryCells,
    selectedAirfoil
  ]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Academic Dossier Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 border border-emerald-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <GraduationCap className="w-64 h-64 text-emerald-400" />
        </div>

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold">
              <Award className="w-3.5 h-3.5" />
              МОДУЛЬ НАУЧНЫХ ПУБЛИКАЦИЙ & СТАТЕЙ (IEEE / AIAA / SCOPUS Q1 / ВАК)
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-emerald-400" />
              Генератор Научных & Инженерных Статей по БПЛА
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Автоматизированный синтез рецензируемых академических статей, докторских разделов и научно-технических отчетов на актуальные темы беспилотной авиации. Генерация математических выводов (LaTeX), эмпирических валидационных таблиц на основе цифрового двойника (Digital Twin Bus), форматирования по стандартам IEEE, AIAA, Elsevier, ВАК ГОСТ и экспорта BibTeX.
            </p>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex flex-col sm:flex-row gap-2 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
            <div className="text-center sm:text-left pr-3 sm:border-r border-slate-800">
              <span className="text-[10px] text-slate-500 block">АКТУАЛЬНЫХ ТЕМ:</span>
              <span className="text-sm font-bold text-emerald-400">8 Научных Областей</span>
            </div>
            <div className="text-center sm:text-left px-3 sm:border-r border-slate-800">
              <span className="text-[10px] text-slate-500 block">СТАНДАРТЫ:</span>
              <span className="text-sm font-bold text-teal-300">IEEE / AIAA / ВАК</span>
            </div>
            <div className="text-center sm:text-left pl-3">
              <span className="text-[10px] text-slate-500 block">ФОРМАТЫ ЭКСПОРТА:</span>
              <span className="text-sm font-bold text-cyan-300">.TEX / .BIB / .MD / PDF</span>
            </div>
          </div>
        </div>
      </div>

      {/* Digital Twin Parameter Controls Strip for Live Synthesis */}
      <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              Параметры Цифрового Двойника (Digital Twin Live Feeder):
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400/90">
            Значения мгновенно внедряются в математические модели и таблицы статьи
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs font-mono">
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">Размах (b):</span>
            <div className="flex items-center gap-1 mt-1">
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="10.0"
                value={wingspan_m}
                onChange={(e) => setWingspan_m(parseFloat(e.target.value) || 2.4)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-emerald-300 font-bold text-center"
              />
              <span className="text-[10px] text-slate-400">м</span>
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">Взлетная масса:</span>
            <div className="flex items-center gap-1 mt-1">
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="50.0"
                value={totalMass_kg}
                onChange={(e) => setTotalMass_kg(parseFloat(e.target.value) || 4.8)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-indigo-300 font-bold text-center"
              />
              <span className="text-[10px] text-slate-400">кг</span>
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">Удлинение (AR):</span>
            <div className="flex items-center gap-1 mt-1">
              <input
                type="number"
                step="0.1"
                min="2.0"
                max="25.0"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(parseFloat(e.target.value) || 7.8)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 font-bold text-center"
              />
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">Качество (L/D):</span>
            <div className="flex items-center gap-1 mt-1">
              <input
                type="number"
                step="0.5"
                min="5.0"
                max="35.0"
                value={liftToDragRatio}
                onChange={(e) => setLiftToDragRatio(parseFloat(e.target.value) || 17.4)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-emerald-400 font-bold text-center"
              />
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">Крейсер. V:</span>
            <div className="flex items-center gap-1 mt-1">
              <input
                type="number"
                step="1"
                min="30"
                max="350"
                value={cruiseSpeed_kmh}
                onChange={(e) => setCruiseSpeed_kmh(parseFloat(e.target.value) || 85)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-teal-300 font-bold text-center"
              />
              <span className="text-[10px] text-slate-400">км/ч</span>
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">Стреловидность:</span>
            <div className="flex items-center gap-1 mt-1">
              <input
                type="number"
                step="0.5"
                min="0"
                max="55"
                value={sweep_deg}
                onChange={(e) => setSweep_deg(parseFloat(e.target.value) || 18.5)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 font-bold text-center"
              />
              <span className="text-[10px] text-slate-400">°</span>
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">Запас уст. (SM):</span>
            <div className="flex items-center gap-1 mt-1">
              <input
                type="number"
                step="0.5"
                min="1.0"
                max="25.0"
                value={staticMargin_percent}
                onChange={(e) => setStaticMargin_percent(parseFloat(e.target.value) || 8.5)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-cyan-300 font-bold text-center"
              />
              <span className="text-[10px] text-slate-400">%</span>
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">АКБ Емкость:</span>
            <div className="flex items-center gap-1 mt-1">
              <input
                type="number"
                step="500"
                min="1000"
                max="60000"
                value={batteryCap_mAh}
                onChange={(e) => setBatteryCap_mAh(parseInt(e.target.value) || 16000)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-amber-300 font-bold text-center"
              />
              <span className="text-[10px] text-slate-400">мАч</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Scientific Paper Generator Core */}
      <UAVScientificPaperGenerator busState={busState} />
    </div>
  );
};
