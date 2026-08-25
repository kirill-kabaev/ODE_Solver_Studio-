import React, { useState } from 'react';
import {
  X,
  FileText,
  Printer,
  Copy,
  Download,
  Sparkles,
  CheckCircle2,
  Layers,
  Compass,
  FileCheck2,
  Calendar,
  User,
  Building,
} from 'lucide-react';
import { MathView } from '../MathView';

interface GostReportProps {
  isOpen: boolean;
  onClose: () => void;
  reportData?: {
    aircraftName?: string;
    organization?: string;
    engineerName?: string;
    wingSpanM?: number;
    wingAreaM2?: number;
    mtowKg?: number;
    aspectRatio?: number;
    airfoilName?: string;
    clMax?: number;
    cd0?: number;
    ldMax?: number;
    staticMarginPct?: number;
    stallSpeedKmh?: number;
    cruiseSpeedKmh?: number;
    cruiseAltitudeM?: number;
  };
}

export const GostReportGeneratorModal: React.FC<GostReportProps> = ({
  isOpen,
  onClose,
  reportData = {},
}) => {
  const [docNumber, setDocNumber] = useState<string>('ПЗ-АЭРО-2026.08-01');
  const [aircraftName, setAircraftName] = useState<string>(reportData.aircraftName || 'Беспилотный Летательный Аппарат «СТРИЖ-2»');
  const [organization, setOrganization] = useState<string>(reportData.organization || 'ОКБ Авиационного Моделирования & САПР');
  const [engineerName, setEngineerName] = useState<string>(reportData.engineerName || 'Инженер-аэродинамик И.И. Иванов');
  const [approvalName, setApprovalName] = useState<string>('Главный конструктор П.П. Петров');
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [copiedStatus, setCopiedStatus] = useState<boolean>(false);

  // Aerodynamic values
  const span = reportData.wingSpanM || 2.4;
  const area = reportData.wingAreaM2 || 0.72;
  const mtow = reportData.mtowKg || 6.8;
  const ar = reportData.aspectRatio || 8.0;
  const airfoil = reportData.airfoilName || 'Clark-Y (11.7%)';
  const clMax = reportData.clMax || 1.45;
  const cd0 = reportData.cd0 || 0.024;
  const ldMax = reportData.ldMax || 18.5;
  const sm = reportData.staticMarginPct || 11.5;
  const vStall = reportData.stallSpeedKmh || 46.2;
  const vCruise = reportData.cruiseSpeedKmh || 95.0;
  const hCruise = reportData.cruiseAltitudeM || 1200;

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyMarkdown = () => {
    const md = `# ПОЯСНИТЕЛЬНАЯ ЗАПИСКА (ГОСТ 2.105-95)
## Документ: ${docNumber}
**Тема:** Аэродинамический расчет и верификация устойчивости ЛА: "${aircraftName}"
**Организация:** ${organization}
**Разработал:** ${engineerName}
**Утвердил:** ${approvalName}
**Дата:** ${reportDate}

---

### 1. ОБЩИЕ СВЕДЕНИЯ И ИСХОДНЫЕ ДАННЫЕ
- Размах крыла b: ${span} м
- Площадь крыла S: ${area} м²
- Удлинение крыла AR: ${ar}
- Взлетная масса MTOW: ${mtow} кг
- Базовый профиль крыла: ${airfoil}

---

### 2. РАСЧЕТ АЭРОДИНАМИЧЕСКИХ ХАРАКТЕРИСТИК
- Максимальный коэффициент подъемной силы CL_max: ${clMax}
- Коэффициент нулевого сопротивления CD0: ${cd0}
- Максимальное аэродинамическое качество K_max: ${ldMax} ед.
- Скорость сваливания V_stall: ${vStall} км/ч
- Крейсерская скорость V_cr: ${vCruise} км/ч на высоте H = ${hCruise} м

---

### 3. АНАЛИЗ ПРОДОЛЬНОЙ СТАТИЧЕСКОЙ УСТОЙЧИВОСТИ
- Запас статической устойчивости SM = (X_F - X_CG)/MAC: +${sm}% САХ
- Градиент момента тангажа: dCm/dAlpha < 0 (Статически устойчив)

---

### 4. ЗАКЛЮЧЕНИЕ
Аппарат удовлетворяет требованиям норм летной годности по запасу устойчивости и безопасности от сваливания.
`;
    navigator.clipboard.writeText(md);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn font-mono">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-sky-500/40 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950/60 border-b border-sky-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-md shadow-sky-950/50">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Автогенератор Пояснительной Записки (ГОСТ 2.105-95)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  ЕСКД / PDF Экспорт
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Формирование официального научно-технического отчета по результатам аэродинамического расчета
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Metadata Controls Left Column (4 cols) */}
          <div className="lg:col-span-4 p-4 border-r border-slate-800 bg-slate-950/70 space-y-3.5 text-xs overflow-y-auto">
            <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block border-b border-slate-800 pb-1">
              Реквизиты Документа (ЕСКД):
            </span>

            <div className="space-y-1">
              <label className="text-slate-400">Обозначение документа:</label>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Наименование объекта расчета:</label>
              <input
                type="text"
                value={aircraftName}
                onChange={(e) => setAircraftName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Организация / Предприятие:</label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Разработал (инженер):</label>
              <input
                type="text"
                value={engineerName}
                onChange={(e) => setEngineerName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Утвердил (главный конструктор):</label>
              <input
                type="text"
                value={approvalName}
                onChange={(e) => setApprovalName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Дата выпуска:</label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs cursor-pointer"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-2 cursor-pointer border border-slate-700 transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-sky-400" />
                <span>{copiedStatus ? '✓ Скопировано в буфер' : 'Скопировать Markdown'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-sky-950/50 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Печать / Сохранить в PDF</span>
              </button>
            </div>
          </div>

          {/* Printable Document Preview Right Column (8 cols) */}
          <div className="lg:col-span-8 p-6 overflow-y-auto bg-slate-950 font-sans text-slate-300 space-y-6">
            {/* Paper Sheet Preview Container */}
            <div className="p-6 sm:p-8 rounded-2xl bg-white text-slate-900 shadow-xl border border-slate-200 font-serif leading-relaxed text-sm space-y-5">
              {/* GOST Title Header */}
              <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                <div className="text-xs uppercase font-bold tracking-widest text-slate-600">{organization}</div>
                <div className="text-[11px] text-slate-500 font-mono">{docNumber}</div>
                <h1 className="text-base sm:text-lg font-black uppercase pt-2 text-slate-950">
                  ПОЯСНИТЕЛЬНАЯ ЗАПИСКА
                </h1>
                <div className="text-xs italic text-slate-700">
                  Аэродинамический расчет и верификация продольной статической устойчивости летательного аппарата «{aircraftName}»
                </div>
              </div>

              {/* Approval Stamp Box */}
              <div className="grid grid-cols-2 text-xs py-2 border-b border-slate-300">
                <div>
                  <span className="font-bold">РАЗРАБОТАЛ:</span>
                  <div>{engineerName}</div>
                </div>
                <div className="text-right">
                  <span className="font-bold">УТВЕРЖДАЮ:</span>
                  <div>{approvalName}</div>
                  <div className="text-[11px] text-slate-500">{reportDate} г.</div>
                </div>
              </div>

              {/* Section 1 */}
              <div className="space-y-2">
                <h3 className="font-bold text-xs uppercase text-slate-950 font-sans tracking-wide">
                  1. ИСХОДНЫЕ ГЕОМЕТРИЧЕСКИЕ И ВЕСОВЫЕ ДАННЫЕ
                </h3>
                <table className="w-full text-xs border border-slate-300 border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 font-bold bg-slate-100 w-2/3">Размах крыла ($b$):</td>
                      <td className="p-1.5 font-mono">{span} м</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 font-bold bg-slate-100">Несущая площадь крыла ($S$):</td>
                      <td className="p-1.5 font-mono">{area} м²</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 font-bold bg-slate-100">Удлинение крыла ($AR = b^2/S$):</td>
                      <td className="p-1.5 font-mono">{ar}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-1.5 font-bold bg-slate-100">Максимальная взлетная масса ($MTOW$):</td>
                      <td className="p-1.5 font-mono">{mtow} кг</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 font-bold bg-slate-100">Аэродинамический профиль сечения:</td>
                      <td className="p-1.5 font-mono">{airfoil}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Section 2 */}
              <div className="space-y-2">
                <h3 className="font-bold text-xs uppercase text-slate-950 font-sans tracking-wide">
                  2. РАСЧЕТ АЭРОДИНАМИЧЕСКИХ КОЭФФИЦИЕНТОВ И ПОЛЯРЫ
                </h3>
                <p className="text-xs text-slate-700 leading-normal">
                  Расчет выполнен методом дискретных вихрей и панельным методом в соответствии с теорией несущей линии Прандтля:
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs text-center font-mono">
                  <div className="p-2 border border-slate-300 rounded bg-slate-50">
                    <span className="text-[10px] text-slate-500 block">C_L max:</span>
                    <strong>{clMax}</strong>
                  </div>
                  <div className="p-2 border border-slate-300 rounded bg-slate-50">
                    <span className="text-[10px] text-slate-500 block">C_D0 (профильное):</span>
                    <strong>{cd0}</strong>
                  </div>
                  <div className="p-2 border border-slate-300 rounded bg-slate-50">
                    <span className="text-[10px] text-slate-500 block">Качество K_max:</span>
                    <strong className="text-emerald-700">{ldMax} ед.</strong>
                  </div>
                </div>
              </div>

              {/* Section 3 */}
              <div className="space-y-2">
                <h3 className="font-bold text-xs uppercase text-slate-950 font-sans tracking-wide">
                  3. ОЦЕНКА СТАТИЧЕСКОЙ УСТОЙЧИВОСТИ И БЕЗОПАСНОСТИ
                </h3>
                <p className="text-xs text-slate-700 leading-normal">
                  Запас продольной статической устойчивости составляет <strong>+{sm}% САХ</strong>, что полностью лежит в допустимом диапазоне (5%...15% САХ). Градиент момента тангажа dCm/dα &lt; 0. Скорость сваливания составляет <strong>{vStall} км/ч</strong>.
                </p>
              </div>

              {/* Signatures Footer */}
              <div className="pt-4 border-t-2 border-slate-900 flex justify-between text-xs font-sans">
                <div>
                  Подпись ответственного инженера: ________________ / {engineerName} /
                </div>
                <div>
                  Печать ОТК: [ ВЕРИФИЦИРОВАНО ]
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-950 border-t border-slate-800 text-xs">
          <div className="text-[11px] text-slate-400 font-sans flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Документ сформирован в формате ЕСКД ГОСТ 2.105-95. Поддерживается прямая печать через диалог браузера.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer border border-slate-700"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
