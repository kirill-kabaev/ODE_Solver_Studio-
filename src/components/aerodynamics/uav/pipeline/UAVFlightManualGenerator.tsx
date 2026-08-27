import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Battery,
  Wind,
  Layers,
  Cpu,
  Compass,
  Zap,
  Activity,
  Sliders,
  Plane,
  ChevronRight,
  Sparkles,
  Info,
  Calendar,
  UserCheck,
  FileSpreadsheet,
  Radio,
  CheckCircle2
} from 'lucide-react';
import { DigitalTwinBusState } from './UAVDigitalTwinHub';

interface UAVFlightManualGeneratorProps {
  busState: DigitalTwinBusState;
}

export type ManualSection =
  | 'cover'
  | 'specs_limitations'
  | 'preflight_checklist'
  | 'flight_procedures'
  | 'emergency_procedures'
  | 'weight_balance'
  | 'maintenance_schedule';

export const UAVFlightManualGenerator: React.FC<UAVFlightManualGeneratorProps> = ({
  busState,
}) => {
  const [activeSection, setActiveSection] = useState<ManualSection>('cover');
  const [docVersion, setDocVersion] = useState('2.4-STANAG');
  const [operatorOrg, setOperatorOrg] = useState('AeroDesign Flight Test Squadron');
  const [tailNumber, setTailNumber] = useState('UAV-TX-704');
  const [copied, setCopied] = useState(false);

  // Dynamic Limitations and Performance Metrics for the Manual
  const manualData = useMemo(() => {
    const v_ne = Math.round(busState.v_dive_kmh * 0.88); // Never Exceed Speed
    const v_cruise = Math.round(busState.cruiseSpeed_kmh);
    const v_stall = Math.round(busState.v_stall_kmh);
    const v_climb = Math.round(busState.v_stall_kmh * 1.35);
    const max_wind_gust = Math.round(v_stall * 0.45);
    const max_crosswind = Math.round(v_stall * 0.3);
    const v_glide = Math.round(v_stall * 1.3);

    // Structural G Limits
    const pos_g_limit = +4.5;
    const neg_g_limit = -2.0;

    // Weight and CG
    const mtow = busState.totalMass_kg;
    const emptyWeight = Number((busState.totalMass_kg - busState.payload_kg - busState.batteryMass_kg).toFixed(2));
    const maxPayload = Number((busState.payload_kg * 1.35).toFixed(2));
    const cg_range_mac = `${(busState.mac_m * 0.22 * 1000).toFixed(0)} мм - ${(busState.mac_m * 0.32 * 1000).toFixed(0)} мм от носка САХ`;

    // Electrical Specs
    const nominalVoltage = busState.batteryCells * 3.7;
    const cutOffVoltage = (busState.batteryCells * 3.3).toFixed(1);
    const storageVoltage = (busState.batteryCells * 3.85).toFixed(1);
    const fullyChargedVoltage = (busState.batteryCells * 4.2).toFixed(1);

    return {
      v_ne,
      v_cruise,
      v_stall,
      v_climb,
      v_glide,
      max_wind_gust,
      max_crosswind,
      pos_g_limit,
      neg_g_limit,
      mtow,
      emptyWeight,
      maxPayload,
      cg_range_mac,
      nominalVoltage,
      cutOffVoltage,
      storageVoltage,
      fullyChargedVoltage,
    };
  }, [busState]);

  // Markdown / Plain Text Version for Export
  const fullDocumentMarkdown = useMemo(() => {
    return `# РУКОВОДСТВО ПО ЛЕТНОЙ ЭКСПЛУАТАЦИИ (РЛЭ / POH)
## Комплекс беспилотный авиационный: ${busState.airfoil.name} Carrier
**Бортовой номер:** ${tailNumber} | **Редакция:** ${docVersion} | **Дата:** ${new Date().toLocaleDateString()}
**Эксплуатант:** ${operatorOrg}

---

### 1. ЛЕТНО-ТЕХНИЧЕСКИЕ ОГРАНИЧЕНИЯ (OPERATING LIMITATIONS)
* **Максимальная взлетная масса (MTOW):** ${manualData.mtow.toFixed(2)} кг
* **Масса пустого снаряженного планера:** ${manualData.emptyWeight} кг
* **Максимальная масса целевой нагрузки:** ${manualData.maxPayload} кг
* **Скорость сваливания (Vs):** ${manualData.v_stall} км/ч (${(manualData.v_stall / 3.6).toFixed(1)} м/с)
* **Крейсерская скорость (Vc):** ${manualData.v_cruise} км/ч
* **Непревышаемая скорость (Vne):** ${manualData.v_ne} км/ч
* **Эксплуатационная перегрузка:** +${manualData.pos_g_limit}g / ${manualData.neg_g_limit}g
* **Максимальный допустимый боковой ветер:** ${manualData.max_crosswind} м/с (порывы до ${manualData.max_wind_gust} м/с)
* **Диапазон рабочих температур:** -20°C ... +45°C

---

### 2. АККУМУЛЯТОРНАЯ БАТАРЕЯ И ЭЛЕКТРОСИСТЕМА
* **Конфигурация батареи:** ${busState.batteryCells}S LiPo/Li-Ion (${busState.batteryCap_mAh} мАч)
* **Напряжение полного заряда:** ${manualData.fullyChargedVoltage} В (4.20 В/ячейка)
* **Напряжение возврата по аварии (RTH):** ${manualData.cutOffVoltage} В (3.40 В/ячейка)
* **Критическое напряжение отсечки:** ${(busState.batteryCells * 3.2).toFixed(1)} В

---

### 3. КОНТРОЛЬНЫЕ КАРТЫ (PRE-FLIGHT CHECKLIST)
1. [ ] Внешний осмотр планера: отсутствие трещин консолей крыла и люфтов элевонов/сервоприводов.
2. [ ] Проверка датчика воздушной скорости (Pitot tube): трубка чистая, продувка без залипания.
3. [ ] Проверка центровки: CG в пределах ${manualData.cg_range_mac}.
4. [ ] Включение наземной станции C2 и пульта управления.
5. [ ] Подключение ходовой АКБ. Контроль звуковых сигналов инициализации ESC.
6. [ ] Фиксация координат базы (Home Position) и захват >14 спутников GNSS (HDOP < 1.0).
7. [ ] Проверка отклонения плоскостей управления во всех режимах (MANUAL / FBWA / AUTO).
8. [ ] Тест радиоканала телеметрии (RSSI > 90%, Link Quality = 100%).

---

### 4. ОСОБЫЕ СЛУЧАИ В ПОЛЕТЕ (EMERGENCY PROCEDURES)
* **Отказ канала C2 (Failsafe Telemetry):** Включение режима Return-to-Home (RTH) на высоте 150м с набором крейсерской скорости ${manualData.v_cruise} км/ч.
* **Попадание в зону подавления РЭБ (GNSS Jamming):** Переход на инерциальную навигацию (Dead Reckoning) по компасу и датчику воздушной скорости с курсом на точку выхода.
* **Отказ силовой установки (Motor Flameout):** Перевод в режим планирования на наивыгоднейшей скорости ${manualData.v_glide} км/ч (аэродинамическое качество L/D = ${busState.liftToDragRatio.toFixed(1)}), поиск площадки для посадки с парашютом или на фюзеляж.

---
Документ сгенерирован автоматически в САПР AeroDesign Studio Pro UAV Master Pipeline.
`;
  }, [busState, tailNumber, docVersion, operatorOrg, manualData]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(fullDocumentMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDoc = () => {
    const blob = new Blob([fullDocumentMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `POH_UAV_${tailNumber}_${docVersion}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/90 border border-teal-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-md space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-teal-500/20 to-indigo-500/20 border border-teal-500/40 rounded-xl text-teal-400">
            <FileText className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                Генератор Эксплуатационной Документации (РЛЭ / Flight Manual)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30">
                STANAG 4703 COMPLIANT
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Автоматическое формирование Руководства по летной эксплуатации (РЛЭ / POH), контрольных карт предполетной подготовки и аварийных процедур
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyMarkdown}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all font-mono"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-teal-400" />}
            {copied ? 'Скопировано!' : 'Копировать'}
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all font-mono"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-400" />
            Печать / PDF
          </button>
          <button
            onClick={handleDownloadDoc}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-xs text-white font-medium flex items-center gap-1.5 transition-all shadow-lg font-mono"
          >
            <Download className="w-3.5 h-3.5" />
            Скачать .MD
          </button>
        </div>
      </div>

      {/* Metadata Configuration Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono">
        <div>
          <label className="text-[10px] text-slate-500 block mb-1">БОРТОВОЙ НОМЕР БПЛА:</label>
          <input
            type="text"
            value={tailNumber}
            onChange={(e) => setTailNumber(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 font-bold focus:outline-none focus:border-teal-500"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 block mb-1">РЕДАКЦИЯ / ВЕРСИЯ РЛЭ:</label>
          <input
            type="text"
            value={docVersion}
            onChange={(e) => setDocVersion(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-teal-300 font-bold focus:outline-none focus:border-teal-500"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 block mb-1">ЭКСПЛУАТИРУЮЩАЯ ОРГАНИЗАЦИЯ:</label>
          <input
            type="text"
            value={operatorOrg}
            onChange={(e) => setOperatorOrg(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Document Section Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 text-xs overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveSection('cover')}
          className={`pb-2 px-3 font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
            activeSection === 'cover'
              ? 'border-teal-500 text-teal-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Plane className="w-3.5 h-3.5" />
          Титульный лист
        </button>
        <button
          onClick={() => setActiveSection('specs_limitations')}
          className={`pb-2 px-3 font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
            activeSection === 'specs_limitations'
              ? 'border-teal-500 text-teal-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          1. Ограничения & ЛТХ
        </button>
        <button
          onClick={() => setActiveSection('preflight_checklist')}
          className={`pb-2 px-3 font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
            activeSection === 'preflight_checklist'
              ? 'border-teal-500 text-teal-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          2. Контрольные карты
        </button>
        <button
          onClick={() => setActiveSection('emergency_procedures')}
          className={`pb-2 px-3 font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
            activeSection === 'emergency_procedures'
              ? 'border-teal-500 text-teal-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          3. Особые случаи
        </button>
        <button
          onClick={() => setActiveSection('weight_balance')}
          className={`pb-2 px-3 font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
            activeSection === 'weight_balance'
              ? 'border-teal-500 text-teal-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          4. Масса & Центровка
        </button>
      </div>

      {/* SECTION 1: COVER PAGE */}
      {activeSection === 'cover' && (
        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-center space-y-6">
          <div className="space-y-2">
            <span className="text-[11px] font-mono text-teal-400 uppercase tracking-widest block">
              АВИАЦИОННАЯ СИСТЕМА БЕСПИЛОТНЫХ ЛЕТАТЕЛЬНЫХ АППАРАТОВ
            </span>
            <h2 className="text-2xl font-black text-white tracking-wide">
              РУКОВОДСТВО ПО ЛЕТНОЙ ЭКСПЛУАТАЦИИ (РЛЭ)
            </h2>
            <h3 className="text-base text-slate-400 font-mono">
              БПЛА Планерной Схемы «{busState.airfoil.name} Carrier»
            </h3>
          </div>

          {/* Airframe Badge */}
          <div className="inline-flex items-center gap-3 p-4 bg-slate-900/80 rounded-2xl border border-teal-500/30 text-left">
            <div className="p-3 bg-teal-500/10 rounded-xl text-teal-400">
              <Plane className="w-8 h-8" />
            </div>
            <div className="text-xs font-mono">
              <div className="text-white font-bold text-sm">Борт: {tailNumber}</div>
              <div className="text-slate-400">Размах: {busState.wingspan_m.toFixed(2)} м | MTOW: {busState.totalMass_kg.toFixed(2)} кг</div>
              <div className="text-teal-400">Качество L/D: {busState.liftToDragRatio.toFixed(1)} | Дальность: {busState.calculatedRange_km.toFixed(0)} км</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl mx-auto text-left text-xs font-mono pt-4 border-t border-slate-800">
            <div>
              <span className="text-slate-500 block">ЭКСПЛУАТАНТ:</span>
              <span className="text-slate-200 font-bold">{operatorOrg}</span>
            </div>
            <div>
              <span className="text-slate-500 block">СТАТУС ДОКУМЕНТА:</span>
              <span className="text-emerald-400 font-bold">УТВЕРЖДЕНО К ПОЛЕТАМ (STANAG 4703)</span>
            </div>
            <div>
              <span className="text-slate-500 block">ДАТА РЕДАКЦИИ:</span>
              <span className="text-slate-200">{new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div>
              <span className="text-slate-500 block">ВЕРСИЯ:</span>
              <span className="text-teal-300 font-bold">{docVersion}</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: SPECIFICATIONS & OPERATING LIMITATIONS */}
      {activeSection === 'specs_limitations' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Speed Limitations */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-teal-400 font-bold pb-1 border-b border-slate-800">
                <span className="flex items-center gap-1.5">
                  <Wind className="w-4 h-4" /> Скоростные Лимиты
                </span>
                <span className="text-[10px] text-slate-500">IAS</span>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Скорость сваливания (V_s):</span>
                  <span className="text-rose-400 font-bold">{manualData.v_stall} км/ч</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Крейсерская скорость (V_c):</span>
                  <span className="text-emerald-400 font-bold">{manualData.v_cruise} км/ч</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Непревышаемая (V_ne):</span>
                  <span className="text-rose-400 font-bold">{manualData.v_ne} км/ч</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Наивыгоднейшая V_glide:</span>
                  <span className="text-cyan-300 font-bold">{manualData.v_glide} км/ч</span>
                </div>
              </div>
            </div>

            {/* Weather Limitations */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-amber-400 font-bold pb-1 border-b border-slate-800">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Погодные Минимумы
                </span>
                <span className="text-[10px] text-slate-500">METAR</span>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Макс. боковой ветер:</span>
                  <span className="text-amber-300 font-bold">{manualData.max_crosswind} м/с</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Макс. порыв ветра:</span>
                  <span className="text-amber-300 font-bold">{manualData.max_wind_gust} м/с</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Температурный диапазон:</span>
                  <span className="text-slate-200 font-bold">-20°C ... +45°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Осадки:</span>
                  <span className="text-slate-200 font-bold">Слабый дождь (&le;2 мм/ч)</span>
                </div>
              </div>
            </div>

            {/* Structural G-Limits */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-indigo-400 font-bold pb-1 border-b border-slate-800">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4" /> Прочность & АКБ
                </span>
                <span className="text-[10px] text-slate-500">LIMITS</span>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Экспл. перегрузка (G):</span>
                  <span className="text-indigo-300 font-bold">+{manualData.pos_g_limit}g / {manualData.neg_g_limit}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Полный заряд АКБ:</span>
                  <span className="text-emerald-400 font-bold">{manualData.fullyChargedVoltage} В</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Порог возврата (RTH):</span>
                  <span className="text-amber-400 font-bold">{manualData.cutOffVoltage} В</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Статическая устойчивость:</span>
                  <span className="text-teal-300 font-bold">{busState.staticMargin_percent.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: PRE-FLIGHT CHECKLIST */}
      {activeSection === 'preflight_checklist' && (
        <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono">
          <span className="font-bold text-slate-200 block mb-2 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            Обязательная контрольная карта перед запуском (Pre-Flight Checklist)
          </span>

          <div className="space-y-2 divide-y divide-slate-800/80">
            <div className="pt-2 flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold shrink-0 text-[10px]">1</span>
              <div>
                <b className="text-white">Осмотр конструкции и аэродинамических плоскостей:</b>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Проверить целостность обшивки крыла, надежность фиксации консолей к фюзеляжу, отсутствие люфтов в тягах рулей высоты и элеронов.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold shrink-0 text-[10px]">2</span>
              <div>
                <b className="text-white">Калибровка датчика воздушной скорости (Pitot Tube):</b>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Снять защитный чехол трубки ПВД. Убедиться в нулевых показаниях IAS в неподвижном воздухе, провести проверку обдувом.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold shrink-0 text-[10px]">3</span>
              <div>
                <b className="text-white">Контроль центровки и фиксации полезной нагрузки:</b>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Проверить положение CG в пределах {manualData.cg_range_mac}. Убедиться в надежности крепления батареи и камеры.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold shrink-0 text-[10px]">4</span>
              <div>
                <b className="text-white">Инициализация авионики и захват GNSS:</b>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Подключить силовую АКБ. Дождаться калибровки гироскопов (не перемещать борт). Зафиксировать позицию Home (&ge;14 спутников, HDOP &lt; 1.0).
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold shrink-0 text-[10px]">5</span>
              <div>
                <b className="text-white">Тест радиоканала C2 и систем защиты:</b>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Проверить RSSI &gt; 90%, переключение режимов MANUAL / STABILIZE / AUTO и корректность направления отклонения управляющих плоскостей при наклоне борта.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: EMERGENCY PROCEDURES */}
      {activeSection === 'emergency_procedures' && (
        <div className="space-y-3">
          <div className="p-4 bg-rose-950/20 border border-rose-500/40 rounded-xl space-y-2 text-xs font-mono">
            <div className="flex items-center gap-2 text-rose-400 font-bold">
              <AlertTriangle className="w-4 h-4" />
              1. Потеря командно-телеметрической линии (C2 Link Loss Failsafe)
            </div>
            <p className="text-slate-300 leading-relaxed">
              При отсутствии сигнала управления более <b>5 секунд</b> автопилот автоматически переходит в режим <b>RTH (Return to Home)</b>:
            </p>
            <ul className="list-disc list-inside text-slate-400 space-y-1 pl-1">
              <li>Набор безопасной высоты возврата <b>150 метров</b> над точкой старта.</li>
              <li>Следование по прямой к точке Home со скоростью <b>{manualData.v_cruise} км/ч</b>.</li>
              <li>Выход в круг ожидания (радиус 60 м) над точкой старта до восстановления связи или перехода на посадку.</li>
            </ul>
          </div>

          <div className="p-4 bg-amber-950/20 border border-amber-500/40 rounded-xl space-y-2 text-xs font-mono">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Flame className="w-4 h-4" />
              2. Отказ силовой установки в воздухе (Motor Failure / In-Flight Flameout)
            </div>
            <p className="text-slate-300 leading-relaxed">
              Планер обладает аэродинамическим качеством <b>L/D = {busState.liftToDragRatio.toFixed(1)}</b>. На каждый 1 км высоты БПЛА способен спланировать на <b>{busState.liftToDragRatio.toFixed(1)} км</b>:
            </p>
            <ul className="list-disc list-inside text-slate-400 space-y-1 pl-1">
              <li>Удерживать наивыгоднейшую скорость планирования <b>{manualData.v_glide} км/ч</b>.</li>
              <li>Отключить питание ESC во избежание короткого замыкания.</li>
              <li>Развернуть борт против ветра для посадки на травянистую площадку или выпустить парашют на высоте 50м.</li>
            </ul>
          </div>

          <div className="p-4 bg-purple-950/20 border border-purple-500/40 rounded-xl space-y-2 text-xs font-mono">
            <div className="flex items-center gap-2 text-purple-400 font-bold">
              <Radio className="w-4 h-4" />
              3. Подавление сигналов спутниковой навигации (GNSS Jamming / Spoofing)
            </div>
            <ul className="list-disc list-inside text-slate-400 space-y-1 pl-1">
              <li>Автопилот немедленно переходит в режим счисления пути (Dead Reckoning по Airspeed + Магнитометр).</li>
              <li>Запрещается переход в режим LOITER (риск дрейфа по ветру). Выполнять полет по магнитному курсу в зону устойчивого приема.</li>
            </ul>
          </div>
        </div>
      )}

      {/* SECTION 5: WEIGHT & BALANCE */}
      {activeSection === 'weight_balance' && (
        <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono">
          <div className="flex items-center justify-between text-slate-200">
            <span className="font-bold text-sm">Сводка Весовой Ведомости и Допустимых Центровок</span>
            <span className="text-teal-400">MTOW = {busState.totalMass_kg.toFixed(2)} кг</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-1">
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">ПЛАНЕР (EMPTY):</span>
              <span className="text-slate-200 font-bold text-sm">{manualData.emptyWeight} кг</span>
            </div>
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">БАТАРЕЯ ({busState.batteryCells}S):</span>
              <span className="text-indigo-400 font-bold text-sm">{busState.batteryMass_kg.toFixed(2)} кг</span>
            </div>
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">ПОЛЕЗНАЯ НАГРУЗКА:</span>
              <span className="text-emerald-400 font-bold text-sm">{busState.payload_kg.toFixed(2)} кг</span>
            </div>
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">ДИАПАЗОН CG:</span>
              <span className="text-teal-300 font-bold text-sm">{manualData.cg_range_mac}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <p>
              <b>Правило центровки перед вылетом:</b> При замене полезной нагрузки (камеры/сенсоры) взвешивание и проверка положения центра тяжести являются обязательными. Смещение CG назад за предел 32% САХ приводит к сваливанию в неуправляемый плоский штопор.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
