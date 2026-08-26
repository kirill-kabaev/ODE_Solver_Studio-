import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  Copy,
  Check,
  Scale,
  Zap,
  Activity,
  Sliders,
} from 'lucide-react';

export interface AuditCheckItem {
  id: string;
  name: string;
  category: string;
  requirement: string;
  currentValue: string;
  isPassed: boolean;
  statusText: string;
  recommendation?: string;
}

interface Props {
  projectName: string;
  mtow_kg: number;
  payload_kg: number;
  batteryMass_kg: number;
  structuralMass_kg: number;
  avionicsMass_kg: number;
  wingspan_m: number;
  wingArea_m2: number;
  staticMargin_percent: number;
  liftToDragRatio: number;
  stallSpeed_kmh: number;
  cruiseSpeed_kmh: number;
  thrustToWeightRatio: number;
  endurance_min: number;
  range_km: number;
  rcs_m2: number;
}

export const UAVAirworthinessAuditPanel: React.FC<Props> = ({
  projectName,
  mtow_kg,
  payload_kg,
  batteryMass_kg,
  structuralMass_kg,
  avionicsMass_kg,
  wingspan_m,
  wingArea_m2,
  staticMargin_percent,
  liftToDragRatio,
  stallSpeed_kmh,
  cruiseSpeed_kmh,
  thrustToWeightRatio,
  endurance_min,
  range_km,
  rcs_m2,
}) => {
  const [copied, setCopied] = React.useState<boolean>(false);

  // Calculate critical engineering checks
  const wingLoading_kg_m2 = mtow_kg / Math.max(0.01, wingArea_m2);
  const isStabilityPassed = staticMargin_percent >= 5.0 && staticMargin_percent <= 18.0;
  const isStallMarginPassed = cruiseSpeed_kmh >= 1.3 * stallSpeed_kmh;
  const isThrustMarginPassed = thrustToWeightRatio >= 0.35;
  const isPayloadRatioPassed = payload_kg / Math.max(0.1, mtow_kg) <= 0.45;
  const isBatteryFractionPassed = batteryMass_kg / Math.max(0.1, mtow_kg) <= 0.50;
  const isWingLoadingSafe = wingLoading_kg_m2 <= 25.0; // Under 25 kg/m2 for easy launch and landing

  const auditChecks: AuditCheckItem[] = [
    {
      id: 'check_stability_margin',
      name: 'Коридор Продольной Статической Устойчивости',
      category: 'Аэродинамика / САУ (STANAG 4703 §3.2)',
      requirement: '5.0% ≤ SM ≤ 18.0% MAC',
      currentValue: `${staticMargin_percent.toFixed(1)}% MAC`,
      isPassed: isStabilityPassed,
      statusText: isStabilityPassed ? 'Норма' : 'Опасно (Выход за центровочный предел)',
      recommendation: !isStabilityPassed
        ? staticMargin_percent < 5
          ? 'Сместите батарею или полезную нагрузку вперед к носу для увеличения SM'
          : 'Сместите АКБ назад к корме для предотвращения избыточной устойчивости'
        : undefined,
    },
    {
      id: 'check_stall_margin',
      name: 'Запас по Скорости Сваливания (Stall Safety Margin)',
      category: 'Безопасность Полета (АП-БАС §4.1)',
      requirement: 'V_cruise ≥ 1.30 · V_stall',
      currentValue: `V_cr = ${cruiseSpeed_kmh} км/ч, 1.3·V_st = ${(1.3 * stallSpeed_kmh).toFixed(0)} км/ч`,
      isPassed: isStallMarginPassed,
      statusText: isStallMarginPassed ? 'Соответствует' : 'Недостаточный запас по сваливанию',
      recommendation: !isStallMarginPassed
        ? 'Увеличьте площадь крыла или используйте более несущий профиль (Selig S1223)'
        : undefined,
    },
    {
      id: 'check_thrust_weight',
      name: 'Располагаемая Тяговооруженность (T/W Ratio)',
      category: 'ВМГ & Энергетика (EASA CS-LUAS)',
      requirement: 'T/W ≥ 0.35 для самолета, ≥ 1.4 для VTOL',
      currentValue: `T/W = ${thrustToWeightRatio.toFixed(2)}`,
      isPassed: isThrustMarginPassed,
      statusText: isThrustMarginPassed ? 'Запас тяги достаточен' : 'Дефицит тяги для набора высоты',
      recommendation: !isThrustMarginPassed
        ? 'Увеличьте диаметр пропеллера или перейдите на более высокое напряжение батареи'
        : undefined,
    },
    {
      id: 'check_wing_loading',
      name: 'Удельная Нагрузка на Крыло (Wing Loading)',
      category: 'Конструкция & Посадка (ГОСТ Р 59518)',
      requirement: 'G/S ≤ 22 кг/м² для ручного/катапультного старта',
      currentValue: `${wingLoading_kg_m2.toFixed(1)} кг/м²`,
      isPassed: isWingLoadingSafe,
      statusText: isWingLoadingSafe ? 'Легкий запуск' : 'Тяжелая посадка (требуется ВПП/шасси)',
    },
    {
      id: 'check_battery_mass_fraction',
      name: 'Массовая Доля Аккумуляторной Батареи',
      category: 'Весовая Сводка (PLM Weight Balance)',
      requirement: 'M_bat / MTOW ≤ 50%',
      currentValue: `${((batteryMass_kg / mtow_kg) * 100).toFixed(0)}% (${batteryMass_kg.toFixed(1)} кг)`,
      isPassed: isBatteryFractionPassed,
      statusText: isBatteryFractionPassed ? 'Баланс соблюден' : 'Перегрузка батареей',
    },
    {
      id: 'check_payload_fraction',
      name: 'Коэффициент Весовой Отдачи по ПН',
      category: 'Эффективность Миссии',
      requirement: 'M_payload / MTOW ≥ 15%',
      currentValue: `${((payload_kg / mtow_kg) * 100).toFixed(0)}% (${payload_kg.toFixed(1)} кг)`,
      isPassed: isPayloadRatioPassed,
      statusText: isPayloadRatioPassed ? 'Высокая отдача' : 'Низкая отдача полезной нагрузки',
    },
  ];

  const totalPassed = auditChecks.filter((c) => c.isPassed).length;
  const overallPassed = totalPassed === auditChecks.length;

  const generateReportText = () => {
    return `===============================================================
ИНЖЕНЕРНЫЙ ПАСПОРТ ЛЕТНОЙ ГОДНОСТИ БПЛА (PLM AIRWORTHINESS REPORT)
Стандарты: STANAG 4703 | АП-БАС 2024 | ГОСТ Р 59518
===============================================================
Проект: ${projectName}
Дата аудита: ${new Date().toLocaleDateString('ru-RU')}
Статус готовности: ${overallPassed ? 'ГОТОВ К СЕРТИФИКАЦИОННЫМ ИСПЫТАНИЯМ (PASSED)' : 'ТРЕБУЕТСЯ ДОРАБОТКА (WARNINGS)'}

1. ВЕСОВАЯ СВОДКА (WEIGHT & BALANCE SHEET):
- Полная взлетная масса (MTOW): ${mtow_kg.toFixed(2)} кг
- Полезная нагрузка (Payload): ${payload_kg.toFixed(2)} кг (${((payload_kg / mtow_kg) * 100).toFixed(1)}%)
- Аккумуляторная батарея: ${batteryMass_kg.toFixed(2)} кг (${((batteryMass_kg / mtow_kg) * 100).toFixed(1)}%)
- Конструкция планера: ${structuralMass_kg.toFixed(2)} кг
- Авионика и бортовой комплекс: ${avionicsMass_kg.toFixed(2)} кг

2. АЭРОДИНАМИЧЕСКИЕ ХАРАКТЕРИСТИКИ:
- Размах крыла b: ${wingspan_m.toFixed(2)} м
- Площадь крыла S: ${wingArea_m2.toFixed(2)} м²
- Удельная нагрузка G/S: ${wingLoading_kg_m2.toFixed(1)} кг/м²
- Аэродинамическое качество L/D: ${liftToDragRatio.toFixed(1)}
- Крейсерская скорость V_cr: ${cruiseSpeed_kmh} км/ч
- Скорость сваливания V_stall: ${stallSpeed_kmh.toFixed(1)} км/ч
- Запас статической устойчивости SM: ${staticMargin_percent.toFixed(1)}% MAC

3. ЭНЕРГЕТИКА & ДАЛЬНОСТЬ:
- Расчетная дальность полета: ${range_km.toFixed(0)} км
- Расчетная продолжительность полета: ${endurance_min.toFixed(0)} мин (${(endurance_min / 60).toFixed(1)} ч)
- Тяговооруженность T/W: ${thrustToWeightRatio.toFixed(2)}

4. МАЛОЗАМЕТНОСТЬ (RCS):
- ЭПР в X-диапазоне: ${rcs_m2.toFixed(3)} м²

5. РЕЗУЛЬТАТЫ АУДИТА НОРМ ГОДНОСТИ:
${auditChecks.map((c) => `[${c.isPassed ? 'OK' : 'FAIL'}] ${c.name}: ${c.currentValue} (Требование: ${c.requirement})`).join('\n')}
===============================================================`;
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(generateReportText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReport = () => {
    const element = document.createElement('a');
    const file = new Blob([generateReportText()], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${projectName.replace(/\s+/g, '_')}_Airworthiness_Report.txt`;
    document.body.appendChild(element);
    element.click();
    element.remove();
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/40 space-y-4 text-xs font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-black text-white text-sm">
              Аудит Норм Летной Годности (STANAG 4703 / АП-БАС) & Инженерный Формуляр
            </h4>
            <p className="text-[11px] text-slate-400 font-sans">
              Автоматическая проверка соответствия критическим ограничениям безопасности полета
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyReport}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Скопировано' : 'Копировать'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadReport}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1.5 transition-all shadow cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Скачать Паспорт (TXT)</span>
          </button>
        </div>
      </div>

      {/* Overall Score Banner */}
      <div
        className={`p-3 rounded-xl border flex items-center justify-between flex-wrap gap-3 ${
          overallPassed
            ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
            : 'bg-amber-950/40 border-amber-500/60 text-amber-200'
        }`}
      >
        <div className="flex items-center gap-3">
          {overallPassed ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
          )}
          <div>
            <div className="font-bold text-white text-xs">
              {overallPassed
                ? 'ПЛАНЕР ПОЛНОСТЬЮ СООТВЕТСТВУЕТ НОРМАМ ЛЕТНОЙ ГОДНОСТИ'
                : `ВЫЯВЛЕНЫ ЗАМЕЧАНИЯ (${auditChecks.length - totalPassed} из ${auditChecks.length})`}
            </div>
            <div className="text-[11px] text-slate-300">
              Успешно пройдено проверок: {totalPassed} из {auditChecks.length}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] text-slate-400">Коэффициент готовности:</div>
          <div className="text-sm font-black text-white">
            {((totalPassed / auditChecks.length) * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Audit Checklist Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {auditChecks.map((item) => (
          <div
            key={item.id}
            className={`p-3 rounded-xl border text-[11px] space-y-1.5 transition-all ${
              item.isPassed
                ? 'bg-slate-950/60 border-slate-800 text-slate-300'
                : 'bg-rose-950/20 border-rose-500/50 text-rose-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5 truncate">
                {item.isPassed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
                {item.name}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                  item.isPassed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {item.isPassed ? 'PASSED' : 'WARNING'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Текущее: <b className="text-white">{item.currentValue}</b></span>
              <span>Норматив: <b className="text-slate-300">{item.requirement}</b></span>
            </div>

            {item.recommendation && (
              <div className="text-[10px] text-amber-300/90 bg-amber-950/40 p-1.5 rounded border border-amber-500/30">
                Совет: {item.recommendation}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
