import React from 'react';
import {
  ShieldCheck,
  FileText,
  Lock,
  Cpu,
  Fingerprint,
  Mail,
  CheckCircle2,
  X,
  AlertTriangle,
  Scale,
  Send,
  Database,
} from 'lucide-react';
import { SUPER_USER_EMAILS } from '../config/securityConfig';

interface UserLicenseAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export const UserLicenseAgreementModal: React.FC<UserLicenseAgreementModalProps> = ({
  isOpen,
  onClose,
  onAccept,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              <Scale className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Пользовательское Лицензионное Соглашение</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-bold uppercase">
                  EULA & Telemetry Consent
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Регламент использования ПО «Aero-Studio Pro» и согласие на передачу аппаратно-технической информации
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Legal Document Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans divide-y divide-slate-800/80">
          
          {/* Important Notice Box */}
          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300 text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>ЮРИДИЧЕСКИ ОБЯЗЫВАЮЩИЙ РЕГЛАМЕНТ ПРИ АКТИВАЦИИ КЛЮЧА</span>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              Настоящий документ является официальным соглашением между Конечным Пользователем (Лицензиатом) и Правообладателем Программного Комплекса (Кабаев К., e-mail: {SUPER_USER_EMAILS.join(', ')}). Нажатие отметки о согласии и ввод лицензионного ключа влечет возникновение юридических обязательств.
            </p>
          </div>

          {/* Section 1: Subject */}
          <div className="pt-5 space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <span className="text-cyan-400">1.</span> ПРЕДМЕТ СОГЛАШЕНИЯ И АВТОРСКИЕ ПРАВА
            </h3>
            <p>
              1.1. Программный комплекс <strong>«Aero-Studio Pro v3.0»</strong> (включая модули символьного решения дифференциальных уравнений, разреженных систем СЛАУ SuiteSparse, аэродинамики 3D VLM/BEM, орбитальной баллистики GNC и схемотехники EDA) является объектом исключительного авторского права.
            </p>
            <p>
              1.2. Пользователю предоставляется ограниченное, персональное, неисключительное право (лицензия) на запуск и использование вычислительных мощностей программного комплекса на <strong>одном конкретном аппаратно верифицированном рабочем месте</strong> (рабочей станции).
            </p>
          </div>

          {/* Section 2: Key & Hardware Telemetry Transmission */}
          <div className="pt-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <span className="text-cyan-400">2.</span> АКТИВАЦИЯ КЛЮЧА И ПЕРЕДАЧА АППАРАТНЫХ ДАННЫХ УСТРОЙСТВА
            </h3>
            <p>
              2.1. Доступ к функционалу программного комплекса открывается исключительно после ввода уникального 16-значного криптографического лицензионного ключа формата <code className="text-cyan-300 font-mono">AERO-PRO-XXXX-XXXX-XXXX</code>.
            </p>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="font-bold text-cyan-300 flex items-center gap-2 text-xs">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>2.2. ПЕРЕЧЕНЬ ПЕРЕДАВАЕМЫХ АППАРАТНО-ТЕХНИЧЕСКИХ ДАННЫХ:</span>
              </div>
              <p className="text-xs text-slate-300">
                В момент активации ключа Пользователь <strong>в явном виде соглашается и разрешает</strong> автоматический сбор и немедленную защищенную передачу Правообладателю следующих телеметрических параметров своего устройства:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-400 pl-2 font-mono">
                <li>
                  <strong className="text-slate-200">Физический MAC-адрес</strong> сетевого адаптера или его HMAC-SHA256 криптографический хэш-отпечаток;
                </li>
                <li>
                  <strong className="text-slate-200">Цифровой идентификатор устройства (Hardware Fingerprint / Device ID)</strong>;
                </li>
                <li>
                  <strong className="text-slate-200">Параметры графической и вычислительной подсистемы</strong> (WebGL/GPU вендор, рендерер, поддержка WebGPU/CUDA);
                </li>
                <li>
                  <strong className="text-slate-200">Сведения о вычислительной платформе</strong> (количество логических ядер CPU, архитектура OS, User-Agent браузера/приложения);
                </li>
                <li>
                  <strong className="text-slate-200">Сетевой IP-адрес</strong>, гео-часовой пояс и точная метка времени активации (МСК / UTC);
                </li>
                <li>
                  <strong className="text-slate-200">Регистрационный Email</strong> пользователя и сопоставленный номер лицензионного ключа.
                </li>
              </ul>
            </div>
          </div>

          {/* Section 3: Delivery to SuperUser */}
          <div className="pt-5 space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <span className="text-cyan-400">3.</span> КАНАЛЫ ДОСТАВКИ И ХРАНЕНИЯ ТЕЛЕМЕТРИИ
            </h3>
            <p>
              3.1. Указанные аппаратно-технические данные в момент нажатия кнопки активации автоматически направляются по защищенному каналу API на сервер и почтовые адреса Правообладателя:
            </p>
            <div className="flex flex-wrap gap-2 py-1">
              <span className="px-3 py-1 rounded-lg bg-slate-950 text-emerald-300 border border-emerald-700/60 font-mono text-xs font-bold">
                ✉️ k.kabaev94@gmail.com
              </span>
              <span className="px-3 py-1 rounded-lg bg-slate-950 text-cyan-300 border border-cyan-700/60 font-mono text-xs font-bold">
                ✉️ k_kaba@mail.ru
              </span>
            </div>
            <p>
              3.2. На основании полученных данных формируется неразрывная аппаратная привязка <em>«Ключ — Email — Рабочая станция»</em>. Попытка использования одного и того же ключа на других неавторизованных устройствах блокируется сервером.
            </p>
          </div>

          {/* Section 4: Restrictions */}
          <div className="pt-5 space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <span className="text-cyan-400">4.</span> ОГРАНИЧЕНИЯ И ЗАПРЕТЫ
            </h3>
            <p>
              4.1. Пользователю категорически запрещается:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs text-slate-400 pl-2">
              <li>Передавать, продавать или публиковать полученный индивидуальный лицензионный ключ третьим лицам;</li>
              <li>Осуществлять декомпиляцию, модификацию или взлом модуля криптографической защиты и MAC-привязки;</li>
              <li>Фальсифицировать или подменять передаваемые аппаратно-технические параметры оборудования.</li>
            </ul>
          </div>

          {/* Section 5: Acceptance statement */}
          <div className="pt-5 space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <span className="text-cyan-400">5.</span> БЕЗОГОВОРОЧНОЕ ПРИНЯТИЕ УСЛОВИЙ (АКЦЕПТ)
            </h3>
            <p>
              5.1. Установка галочки <em>«Я принимаю условия соглашения и даю согласие на передачу аппаратно-технических данных»</em> является полным и безоговорочным акцептом (принятием) условий настоящего договора в соответствии со статьями 434 и 438 Гражданского кодекса РФ.
            </p>
            <p>
              5.2. Если Пользователь не согласен с передачей аппаратно-технических данных своего устройства, он обязан немедленно прекратить процедуру активации и закрыть приложение.
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Шифрование телеметрии: AES-256-GCM / PBKDF2</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Закрыть
            </button>
            {onAccept && (
              <button
                type="button"
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/40 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Принять Соглашение</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
