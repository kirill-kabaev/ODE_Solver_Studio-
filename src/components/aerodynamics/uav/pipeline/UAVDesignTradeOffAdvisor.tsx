import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Scale,
  Zap,
  ShieldAlert,
  ArrowRight,
  Battery,
  Wind,
  Layers,
  Cpu,
  ChevronRight,
  Sliders,
  RefreshCw,
  HelpCircle,
  BarChart3,
  Flame,
  Plane,
  Crosshair,
  Gauge
} from 'lucide-react';
import { DigitalTwinBusState } from './UAVDigitalTwinHub';

interface UAVDesignTradeOffAdvisorProps {
  busState: DigitalTwinBusState;
  onApplyFix?: (paramKey: string, newValue: number) => void;
  onNavigateToStage?: (stageId: string) => void;
}

export interface DesignConflict {
  id: string;
  category: 'aerodynamics' | 'propulsion' | 'structures' | 'stability' | 'operations';
  severity: 'critical' | 'warning' | 'optimal';
  title: string;
  description: string;
  rootCause: string;
  recommendation: string;
  actionParam?: string;
  actionTargetValue?: number;
  actionLabel?: string;
  impactSummary: string;
}

export const UAVDesignTradeOffAdvisor: React.FC<UAVDesignTradeOffAdvisorProps> = ({
  busState,
  onApplyFix,
  onNavigateToStage,
}) => {
  const [activeTab, setActiveTab] = useState<'conflicts' | 'sensitivity' | 'matrix' | 'chemistry'>('conflicts');
  const [hypotheticalBatteryMassDelta, setHypotheticalBatteryMassDelta] = useState<number>(0);
  const [hypotheticalPayloadDelta, setHypotheticalPayloadDelta] = useState<number>(0);
  const [hypotheticalSpanDelta, setHypotheticalSpanDelta] = useState<number>(0);

  // 1. Comprehensive Conflict & Bottleneck Detector Engine
  const detectedConflicts: DesignConflict[] = useMemo(() => {
    const conflicts: DesignConflict[] = [];

    // Check 1: Hand-Launch vs Stall Speed / MTOW
    const isHandLaunchable = busState.v_stall_kmh <= 42 && busState.totalMass_kg <= 3.5;
    if (!isHandLaunchable && busState.totalMass_kg <= 5.0) {
      if (busState.v_stall_kmh > 45) {
        conflicts.push({
          id: 'launch_stall_high',
          category: 'operations',
          severity: 'warning',
          title: 'Высокая скорость сваливания для ручного старта',
          description: `Текущая скорость сваливания ${busState.v_stall_kmh.toFixed(1)} км/ч превышает порог безопасного броска рукой (42 км/ч). Высокий риск падения на взлете.`,
          rootCause: `Высокая удельная нагрузка на крыло (${(busState.totalMass_kg / Math.max(0.01, busState.wingArea_m2)).toFixed(1)} кг/м²) при текущей площади крыла.`,
          recommendation: 'Увеличьте размах крыла на 150-250 мм или используйте профиль с повышенным Cl_max, либо предусмотрите катапультный старт.',
          actionParam: 'wingspan_m',
          actionTargetValue: Number((busState.wingspan_m * 1.15).toFixed(2)),
          actionLabel: `Увеличить размах до ${(busState.wingspan_m * 1.15).toFixed(2)} м`,
          impactSummary: 'Снизит V_stall до безопасных 38-40 км/ч и уменьшит индуктивное сопротивление.',
        });
      }
    }

    // Check 2: Static Margin & Longitudinal Stability Balance
    if (busState.staticMargin_percent < 5) {
      conflicts.push({
        id: 'stability_low_sm',
        category: 'stability',
        severity: 'critical',
        title: 'Критический дефицит статической устойчивости (SM < 5%)',
        description: `Запас устойчивости составляет всего ${busState.staticMargin_percent.toFixed(1)}%. БПЛА близок к нейтральной или отрицательной устойчивости (склонен к раскачке по тангажу).`,
        rootCause: 'Центр тяжести (CG) расположен слишком близко к фокусу нейтральной точки (NP).',
        recommendation: 'Сдвиньте полезную нагрузку или батарею вперед по фюзеляжу, либо увеличьте стреловидность / хорду консоли.',
        actionParam: 'payload_kg',
        actionLabel: 'Скорректировать центровку (сместить CG вперед)',
        impactSummary: 'Обеспечит демпфирование короткопериодических колебаний и автовыравнивание в ветреную погоду.',
      });
    } else if (busState.staticMargin_percent > 18) {
      conflicts.push({
        id: 'stability_high_sm',
        category: 'stability',
        severity: 'warning',
        title: 'Избыточная статическая устойчивость (SM > 18%)',
        description: `Запас устойчивости ${busState.staticMargin_percent.toFixed(1)}% приводит к чрезмерной «носовой тяжести» и высокому балансировочному сопротивлению.`,
        rootCause: 'Перегрузка носовой части или чрезмерно передняя центровка.',
        recommendation: 'Сдвиньте батарейный отсек ближе к лонжерону для снижения потерь на балансировку.',
        impactSummary: 'Снизит потребную тягу на 6-9% и увеличит дальность полета.',
      });
    } else {
      conflicts.push({
        id: 'stability_optimal',
        category: 'stability',
        severity: 'optimal',
        title: 'Оптимальная продольная устойчивость',
        description: `Запас статической устойчивости ${busState.staticMargin_percent.toFixed(1)}% находится в «золотом диапазоне» 8–14%, обеспечивая отличную управляемость и минимальное сопротивление.`,
        rootCause: 'Гармоничное взаимное расположение X_cg и X_np.',
        recommendation: 'Сохраняйте данную весовую компоновку при установке сменных модулей целевой нагрузки.',
        impactSummary: 'Идеальный баланс между чувствительностью автопилота и расходом энергии.',
      });
    }

    // Check 3: Battery Mass Fraction Trade-off
    const batteryFraction = (busState.batteryMass_kg / Math.max(0.1, busState.totalMass_kg)) * 100;
    if (batteryFraction > 46) {
      conflicts.push({
        id: 'battery_overload',
        category: 'propulsion',
        severity: 'warning',
        title: 'Эффект насыщения массы батареи (M_bat > 46% MTOW)',
        description: `Батарея занимает ${batteryFraction.toFixed(1)}% взлетной массы. Начинает действовать закон убывающей отдачи Бреге: каждый лишний грамм АКБ тратит сам себя на преодоление своего же веса.`,
        rootCause: 'Чрезмерное наращивание емкости без оптимизации аэродинамического качества (L/D).',
        recommendation: 'Перейдите на высокоплотную химию Li-Ion (типа Samsung 50S / Molicel P45B) либо увеличьте удлинение крыла AR.',
        impactSummary: 'Позволит облегчить планер на 15-20% без потери дальности.',
      });
    } else if (batteryFraction < 20) {
      conflicts.push({
        id: 'battery_underutilized',
        category: 'propulsion',
        severity: 'warning',
        title: 'Недоиспользованный резерв энергоемкости',
        description: `Доля АКБ составляет всего ${batteryFraction.toFixed(1)}% от взлетного веса. Планер способен нести значительно большую емкость.`,
        rootCause: 'Консервативный выбор емкости батареи относительно грузоподъемности крыла.',
        recommendation: 'Увеличьте количество параллельных ячеек (например, перейдите с 4S1P на 4S2P).',
        actionParam: 'batteryCap_mAh',
        actionTargetValue: Math.round(busState.batteryCap_mAh * 1.5),
        actionLabel: `Увеличить АКБ до ${Math.round(busState.batteryCap_mAh * 1.5)} мАч`,
        impactSummary: 'Увеличит продолжительность полета на 40-50% при минимальном росте скорости сваливания.',
      });
    }

    // Check 4: Aeroelastic Aspect Ratio & Spar Bending
    if (busState.aspectRatio > 11.5) {
      conflicts.push({
        id: 'high_aspect_ratio_flutter',
        category: 'structures',
        severity: 'warning',
        title: 'Высокое удлинение крыла (AR > 11.5) — Риск флаттера',
        description: `Удлинение крыла AR=${busState.aspectRatio.toFixed(1)} дает высокое аэродинамическое качество, но создает критический изгибающий момент в корневом сечении.`,
        rootCause: 'Большой размах при узкой хорде консоли.',
        recommendation: 'Используйте замкнутый D-box кессон из высокомодульного углеткани и двойной карбоновый лонжерон диаметром не менее 12 мм.',
        impactSummary: 'Предотвратит дивергенцию и крутильный флаттер на скоростях пикирования.',
      });
    }

    // Check 5: Speed Gap (V_cruise vs V_stall vs V_dive)
    const speedRatio = busState.cruiseSpeed_kmh / Math.max(1, busState.v_stall_kmh);
    if (speedRatio < 1.25) {
      conflicts.push({
        id: 'speed_stall_margin_too_close',
        category: 'aerodynamics',
        severity: 'critical',
        title: 'Опасная близость крейсерской скорости к скорости сваливания',
        description: `Крейсерская скорость (${busState.cruiseSpeed_kmh} км/ч) всего в ${speedRatio.toFixed(2)} раз превышает скорость сваливания (${busState.v_stall_kmh.toFixed(1)} км/ч).`,
        rootCause: 'Любой порыв ветра или крен свыше 30° вызовет срыв потока и штопор.',
        recommendation: 'Повысьте крейсерскую скорость до ' + Math.round(busState.v_stall_kmh * 1.45) + ' км/ч либо увеличьте площадь крыла.',
        actionParam: 'cruiseSpeed_kmh',
        actionTargetValue: Math.round(busState.v_stall_kmh * 1.45),
        actionLabel: `Установить V_cruise = ${Math.round(busState.v_stall_kmh * 1.45)} км/ч`,
        impactSummary: 'Обеспечит запас по углам атаки в турбулентной атмосфере.',
      });
    }

    return conflicts;
  }, [busState]);

  // 2. Sensitivity Gradient Calculator
  const sensitivityAnalysis = useMemo(() => {
    const baseEndurance = busState.flightTime_min;
    const baseRange = busState.calculatedRange_km;
    const baseStall = busState.v_stall_kmh;
    const baseLtoD = busState.liftToDragRatio;

    // Delta 1: +100g Payload
    const payloadEffectEndurance = -((100 / 1000) / Math.max(0.5, busState.totalMass_kg)) * baseEndurance * 0.7;
    const payloadEffectStall = Math.sqrt((busState.totalMass_kg + 0.1) / busState.totalMass_kg) * baseStall - baseStall;

    // Delta 2: +200mm Wingspan
    const newSpan = busState.wingspan_m + 0.2;
    const newAR = Math.pow(newSpan, 2) / (busState.wingArea_m2 + 0.2 * busState.mac_m);
    const spanEffectLD = (newAR / busState.aspectRatio - 1) * 0.6 * baseLtoD;
    const spanEffectRange = (spanEffectLD / baseLtoD) * baseRange;

    // Delta 3: Switch Battery to Li-Ion 21700 (+45% energy per kg)
    const liIonEnergyWh = (busState.batteryMass_kg * 240); // 240 Wh/kg vs 150 Wh/kg LiPo
    const currentBattEnergyWh = (busState.batteryCap_mAh / 1000) * (busState.batteryCells * 3.7);
    const liIonRangeBoostKm = ((liIonEnergyWh - currentBattEnergyWh) / Math.max(1, currentBattEnergyWh)) * baseRange;

    return {
      payloadEffectEndurance,
      payloadEffectStall,
      spanEffectLD,
      spanEffectRange,
      liIonRangeBoostKm,
      liIonEnduranceBoostMin: (liIonRangeBoostKm / Math.max(1, busState.cruiseSpeed_kmh)) * 60,
    };
  }, [busState]);

  // 3. Multi-Domain Radar Metrics Score (0-100)
  const radarScores = useMemo(() => {
    // 1. Range score (0-150 km)
    const rangeScore = Math.min(100, (busState.calculatedRange_km / 120) * 100);
    // 2. Payload efficiency
    const payloadScore = Math.min(100, (busState.payload_kg / Math.max(0.5, busState.totalMass_kg * 0.35)) * 100);
    // 3. Gust tolerance (Wing loading kg/m2: 6 to 18 is good for penetration)
    const wingLoading = busState.totalMass_kg / Math.max(0.01, busState.wingArea_m2);
    const gustScore = Math.min(100, Math.max(20, (wingLoading / 14) * 90));
    // 4. Handling & Stability (Static Margin 8-12 is 100%)
    const smDist = Math.abs(busState.staticMargin_percent - 11);
    const handlingScore = Math.max(10, 100 - smDist * 9);
    // 5. Aerodynamic Efficiency (L/D: 8 to 18)
    const aeroScore = Math.min(100, (busState.liftToDragRatio / 16) * 100);
    // 6. Launch Simplicity (lower stall speed & lighter MTOW is higher score)
    const launchScore = Math.max(10, Math.min(100, (55 - busState.v_stall_kmh) * 2.5 + (6 - busState.totalMass_kg) * 8));

    return [
      { label: 'Дальность', score: Math.round(rangeScore), val: `${busState.calculatedRange_km.toFixed(0)} км` },
      { label: 'Грузоподъёмность', score: Math.round(payloadScore), val: `${busState.payload_kg.toFixed(2)} кг` },
      { label: 'Ветроустойчивость', score: Math.round(gustScore), val: `${wingLoading.toFixed(1)} кг/м²` },
      { label: 'Устойчивость (SM)', score: Math.round(handlingScore), val: `${busState.staticMargin_percent.toFixed(1)}%` },
      { label: 'Качество (L/D)', score: Math.round(aeroScore), val: `${busState.liftToDragRatio.toFixed(1)} ед` },
      { label: 'Простота старта', score: Math.round(launchScore), val: `V_ст ${busState.v_stall_kmh.toFixed(0)} км/ч` },
    ];
  }, [busState]);

  return (
    <div className="bg-slate-900/90 border border-teal-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-md space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-teal-500/20 border border-amber-500/40 rounded-xl text-amber-400">
            <Scale className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                Интеллектуальный Советник Компромиссов & Матрица Конфликтов
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                TRADE-OFF AI ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Эвристический поиск конструктивных противоречий, градиенты чувствительности и автоматические инженерные рекомендации
            </p>
          </div>
        </div>

        {/* Global Health Indicator */}
        <div className="flex items-center gap-3 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
          <span className="text-slate-400">Статус баланса:</span>
          {detectedConflicts.filter(c => c.severity === 'critical').length > 0 ? (
            <span className="text-rose-400 font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Есть критические конфликты ({detectedConflicts.filter(c => c.severity === 'critical').length})
            </span>
          ) : detectedConflicts.filter(c => c.severity === 'warning').length > 0 ? (
            <span className="text-amber-400 font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Требует балансировки ({detectedConflicts.filter(c => c.severity === 'warning').length})
            </span>
          ) : (
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Гармоничная компоновка
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('conflicts')}
          className={`pb-2.5 px-3 font-semibold transition-all flex items-center gap-1.5 border-b-2 ${
            activeTab === 'conflicts'
              ? 'border-amber-500 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Выявленные Конфликты ({detectedConflicts.length})
        </button>
        <button
          onClick={() => setActiveTab('sensitivity')}
          className={`pb-2.5 px-3 font-semibold transition-all flex items-center gap-1.5 border-b-2 ${
            activeTab === 'sensitivity'
              ? 'border-teal-500 text-teal-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-teal-400" />
          Градиенты Чувствительности
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`pb-2.5 px-3 font-semibold transition-all flex items-center gap-1.5 border-b-2 ${
            activeTab === 'matrix'
              ? 'border-cyan-500 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          Лепестковая Диаграмма Баланса
        </button>
        <button
          onClick={() => setActiveTab('chemistry')}
          className={`pb-2.5 px-3 font-semibold transition-all flex items-center gap-1.5 border-b-2 ${
            activeTab === 'chemistry'
              ? 'border-purple-500 text-purple-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Battery className="w-4 h-4 text-purple-400" />
          Сравнение Химии АКБ (LiPo vs Li-Ion)
        </button>
      </div>

      {/* TAB 1: DETECTED CONFLICTS & AUTOMATIC FIXES */}
      {activeTab === 'conflicts' && (
        <div className="space-y-3">
          {detectedConflicts.map((conflict) => (
            <div
              key={conflict.id}
              className={`p-4 rounded-xl border transition-all ${
                conflict.severity === 'critical'
                  ? 'bg-rose-950/20 border-rose-500/50'
                  : conflict.severity === 'warning'
                  ? 'bg-amber-950/20 border-amber-500/50'
                  : 'bg-emerald-950/20 border-emerald-500/40'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {conflict.severity === 'critical' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                  {conflict.severity === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                  {conflict.severity === 'optimal' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  <h4 className="text-xs font-bold text-white font-mono">{conflict.title}</h4>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-900/80 border border-slate-700 text-slate-300">
                    {conflict.category}
                  </span>
                  {conflict.actionParam && onApplyFix && (
                    <button
                      onClick={() => onApplyFix(conflict.actionParam!, conflict.actionTargetValue!)}
                      className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-[11px] font-mono flex items-center gap-1 shadow transition-all"
                    >
                      <Sparkles className="w-3 h-3" />
                      {conflict.actionLabel || 'Применить исправление'}
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-300 mb-2 leading-relaxed">{conflict.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500 block">ПРИЧИНА КОНФЛИКТА:</span>
                  <span className="text-slate-300">{conflict.rootCause}</span>
                </div>
                <div>
                  <span className="text-teal-400 block">РЕКОМЕНДАЦИЯ АВТОРА:</span>
                  <span className="text-slate-300">{conflict.recommendation}</span>
                </div>
              </div>

              <div className="mt-2 text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                <ArrowRight className="w-3 h-3 text-teal-400" />
                <span>Эффект: {conflict.impactSummary}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: SENSITIVITY GRADIENT EXPLORER */}
      {activeTab === 'sensitivity' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Payload Gradient */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-400" />
                  +100 г Полезной нагрузки
                </span>
                <span className="text-[10px] font-mono text-purple-400">Градиент &part;</span>
              </div>
              <div className="space-y-1.5 text-xs font-mono pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Время полета:</span>
                  <span className="text-rose-400 font-bold">{sensitivityAnalysis.payloadEffectEndurance.toFixed(1)} мин</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Скорость сваливания:</span>
                  <span className="text-amber-400 font-bold">+{sensitivityAnalysis.payloadEffectStall.toFixed(2)} км/ч</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Удельный расход:</span>
                  <span className="text-rose-400 font-bold">+1.8% Вт·ч/км</span>
                </div>
              </div>
            </div>

            {/* Wingspan Gradient */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Plane className="w-4 h-4 text-teal-400" />
                  +200 мм Размаха крыла
                </span>
                <span className="text-[10px] font-mono text-teal-400">Градиент &part;</span>
              </div>
              <div className="space-y-1.5 text-xs font-mono pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Аэродин. качество L/D:</span>
                  <span className="text-emerald-400 font-bold">+{sensitivityAnalysis.spanEffectLD.toFixed(1)} ед</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Прирост дальности:</span>
                  <span className="text-emerald-400 font-bold">+{sensitivityAnalysis.spanEffectRange.toFixed(1)} км</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Изгибающий момент:</span>
                  <span className="text-amber-400 font-bold">+14% в корне</span>
                </div>
              </div>
            </div>

            {/* Battery Chemistry Gradient */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Battery className="w-4 h-4 text-emerald-400" />
                  Переход на Li-Ion 21700
                </span>
                <span className="text-[10px] font-mono text-emerald-400">Градиент &part;</span>
              </div>
              <div className="space-y-1.5 text-xs font-mono pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Прирост дальности:</span>
                  <span className="text-emerald-400 font-bold">+{sensitivityAnalysis.liIonRangeBoostKm.toFixed(0)} км</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Прирост времени:</span>
                  <span className="text-emerald-400 font-bold">+{sensitivityAnalysis.liIonEnduranceBoostMin.toFixed(0)} мин</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Пиковая токоотдача:</span>
                  <span className="text-amber-400 font-bold">Снижение с 50C до 10C</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SPIDER / RADAR MULTI-DOMAIN BALANCE */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* SVG Radar Chart */}
            <div className="relative flex items-center justify-center">
              <svg viewBox="0 0 300 260" className="w-64 h-64">
                {/* Radar Grid Circles */}
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

                {/* Dynamic Data Polygon */}
                {(() => {
                  const pts = radarScores.map((s, idx) => {
                    const angle = (idx * 60 - 90) * (Math.PI / 180);
                    const radius = (s.score / 100) * 110;
                    const x = 150 + radius * Math.cos(angle);
                    const y = 150 + radius * Math.sin(angle);
                    return `${x},${y}`;
                  }).join(' ');

                  return (
                    <polygon
                      points={pts}
                      fill="rgba(20, 184, 166, 0.25)"
                      stroke="#14b8a6"
                      strokeWidth="2.5"
                    />
                  );
                })()}

                {/* Point Dots & Labels */}
                {radarScores.map((s, idx) => {
                  const angle = (idx * 60 - 90) * (Math.PI / 180);
                  const radius = (s.score / 100) * 110;
                  const x = 150 + radius * Math.cos(angle);
                  const y = 150 + radius * Math.sin(angle);
                  return (
                    <g key={idx}>
                      <circle cx={x} cy={y} r="4" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Radar Score Bars */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-300 block font-mono">
                Количественная Оценка Баланса Концепции (0-100%):
              </span>
              {radarScores.map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">{item.label}:</span>
                    <span className="text-teal-300 font-bold">{item.val} ({item.score}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.score >= 70 ? 'bg-teal-500' : item.score >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BATTERY CHEMISTRY COMPARISON */}
      {activeTab === 'chemistry' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            {/* LiPo Standard */}
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-teal-400 font-bold">
                <span>LiPo (Высокотоковые)</span>
                <span className="text-[10px] bg-teal-500/10 px-1.5 py-0.5 rounded">150-170 Вт·ч/кг</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Идеально для динамичных стартов и тяжелых скоростных планеров. Токоотдача до 60C, но меньшая дальность.
              </p>
              <div className="pt-1 text-slate-300 border-t border-slate-800 space-y-1">
                <div>Расчетная дальность: <b className="text-white">{busState.calculatedRange_km.toFixed(0)} км</b></div>
                <div>Нагрев под нагрузкой: <b className="text-emerald-400">Минимальный (40°C)</b></div>
              </div>
            </div>

            {/* Li-Ion 21700 */}
            <div className="p-3.5 bg-slate-950 rounded-xl border border-indigo-500/40 bg-indigo-950/20 space-y-2">
              <div className="flex justify-between items-center text-indigo-400 font-bold">
                <span>Li-Ion 21700 (Molicel / Samsung)</span>
                <span className="text-[10px] bg-indigo-500/20 px-1.5 py-0.5 rounded">240-260 Вт·ч/кг</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Золотой стандарт для дальних разведывательных БПЛА. Прирост времени полета +40-55%.
              </p>
              <div className="pt-1 text-slate-300 border-t border-indigo-900/50 space-y-1">
                <div>Расчетная дальность: <b className="text-emerald-400">{(busState.calculatedRange_km * 1.48).toFixed(0)} км</b></div>
                <div>Ограничение: <b className="text-amber-400">Ток разряда &le; 10C</b></div>
              </div>
            </div>

            {/* Solid-State Future */}
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-purple-400 font-bold">
                <span>Solid-State (Твердотельные)</span>
                <span className="text-[10px] bg-purple-500/10 px-1.5 py-0.5 rounded">350-400 Вт·ч/кг</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Перспективные элементы питания нового поколения с максимальной безопасностью при простреле/повреждении.
              </p>
              <div className="pt-1 text-slate-300 border-t border-slate-800 space-y-1">
                <div>Расчетная дальность: <b className="text-purple-300">{(busState.calculatedRange_km * 2.1).toFixed(0)} км</b></div>
                <div>Готовность: <b className="text-slate-500">Мелкосерийное пр-во</b></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
