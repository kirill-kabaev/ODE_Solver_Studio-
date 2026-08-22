import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Mail,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Cpu,
  Fingerprint,
  Download,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
  Server,
  Zap,
  FileText,
  Scale,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  ExternalLink,
} from 'lucide-react';
import {
  authenticateWithCredentials,
  activateWithLicenseKey,
  generateDeviceHardwareFingerprint,
  isSuperUserEmail,
  AuthUser,
} from '../utils/securityManager';
import { SUPER_USER_EMAILS, ENCRYPTED_HARDWARE_CONFIG } from '../config/securityConfig';
import { UserLicenseAgreementModal } from './UserLicenseAgreementModal';

interface AuthGateModalProps {
  isOpen: boolean;
  onAuthenticated: (user: AuthUser) => void;
  onClose?: () => void;
  allowClose?: boolean;
}

export const AuthGateModal: React.FC<AuthGateModalProps> = ({
  isOpen,
  onAuthenticated,
  onClose,
  allowClose = true,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'activate'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Activation complete detailed summary state
  const [activationSummary, setActivationSummary] = useState<{
    user: AuthUser;
    emailSent: boolean;
    emailStatusMessage: string;
    recipients: string[];
    keyNumber?: number;
    hwFingerprint?: string;
    displayMac?: string;
  } | null>(null);

  // Legal agreement state
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);
  const [showTelemetryDetails, setShowTelemetryDetails] = useState(false);

  const hwInfo = generateDeviceHardwareFingerprint();

  if (!isOpen) return null;

  const handleQuickSuperUserSelect = (superEmail: string) => {
    setEmail(superEmail);
    setPassword('aeropro2026');
    setAuthMode('login');
    setErrorMessage(null);
    setActivationSummary(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await authenticateWithCredentials(email, password);
      if (res.success && res.user) {
        setSuccessMessage(
          res.user.isSuperAdmin
            ? 'Абсолютный доступ суперпользователя подтвержден! Привязка MAC-адреса верифицирована.'
            : 'Успешный вход в систему!'
        );
        setTimeout(() => {
          onAuthenticated(res.user!);
        }, 600);
      } else {
        setErrorMessage(res.error || 'Ошибка входа. Проверьте данные.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Системная ошибка аутентификации.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setActivationSummary(null);

    if (!agreementAccepted) {
      setErrorMessage('Для активации ключа необходимо принять условия Пользовательского соглашения и дать согласие на передачу данных устройства.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await activateWithLicenseKey(email, password, licenseKey);
      if (res.success && res.user) {
        // DO NOT automatically close window! Show detailed summary view
        setActivationSummary({
          user: res.user,
          emailSent: Boolean(res.emailSent),
          emailStatusMessage: res.emailStatusMessage || 'Уведомление зафиксировано в реестре сервера.',
          recipients: res.recipients || SUPER_USER_EMAILS,
          keyNumber: res.keyNumber,
          hwFingerprint: res.hwFingerprint || hwInfo.fingerprint,
          displayMac: res.displayMac || hwInfo.displayMac,
        });
      } else {
        setErrorMessage(res.error || 'Ошибка активации ключа.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ошибка проверки лицензионного ключа.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[92vh] overflow-y-auto">
        
        {/* Glow Header Banner */}
        <div className="relative px-6 pt-6 pb-5 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 via-indigo-600 to-purple-600 text-slate-950 shadow-lg shadow-cyan-500/20 border border-cyan-400/40">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white tracking-tight">
                    Авторизация & Защита Системы
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/60 text-[10px] font-mono font-bold uppercase">
                    PRO v3.0
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Математическая & Аэрокосмическая Вычислительная Студия
                </p>
              </div>
            </div>

            {/* Exit button */}
            <button
              type="button"
              onClick={() => {
                if (onClose) {
                  onClose();
                } else {
                  setActivationSummary(null);
                  setErrorMessage(null);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
              title="Закрыть окно / Выход"
            >
              <span>✕ Выход</span>
            </button>
          </div>

          {/* SuperUser Fast-Pass Card */}
          {!activationSummary && (
            <div className="mt-4 p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                    <span>Суперпользователь с абсолютными правами</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                      ROOT
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-300/80 mt-0.5 font-mono">
                    k.kabaev94@gmail.com • k_kaba@mail.ru
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleQuickSuperUserSelect('k.kabaev94@gmail.com')}
                  className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-bold transition-all cursor-pointer"
                  title="Быстрый вход суперпользователя"
                >
                  Войти как Кабаев К.
                </button>
              </div>
            </div>
          )}

          {/* Hardware & MAC Encrypted Status Bar */}
          <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] font-mono flex items-center justify-between text-slate-400">
            <div className="flex items-center gap-1.5">
              <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
              <span>MAC & Аппаратный ID:</span>
              <span className="text-cyan-300 font-bold">{hwInfo.displayMac}</span>
            </div>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Зашифрован (AES-256)
            </span>
          </div>
        </div>

        {/* Activation Summary View OR Input Forms */}
        {activationSummary ? (
          <div className="p-6 space-y-4 animate-fadeIn">
            {/* Big Success Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/50 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-emerald-300">
                    Лицензионный Ключ Успешно Активирован!
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Учетная запись привязана к устройству. Окно НЕ закрывается автоматически.
                  </p>
                </div>
              </div>

              {/* Email Telemetry Dispatch Status Box */}
              <div className={`p-3 rounded-xl border text-xs font-mono space-y-1.5 ${
                activationSummary.emailSent
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                  : 'bg-amber-950/50 border-amber-500/50 text-amber-200'
              }`}>
                <div className="font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    Статус Уведомления Правообладателя:
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    activationSummary.emailSent ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {activationSummary.emailSent ? '✓ ОТПРАВЛЕНО НА 2 ПОЧТЫ' : 'СОХРАНЕНО В ЖУРНАЛ СЕРВЕРА'}
                  </span>
                </div>
                <div className="text-[11px] leading-relaxed text-slate-300">
                  {activationSummary.emailStatusMessage}
                </div>
                <div className="text-[10px] text-slate-400 pt-0.5 border-t border-slate-800">
                  Адресаты копий: <span className="text-cyan-300 font-bold">{SUPER_USER_EMAILS.join(', ')}</span>
                </div>
              </div>

              {/* Hardware Parameters Table */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono space-y-1 text-slate-300">
                <div className="text-cyan-300 font-bold border-b border-slate-800 pb-1 flex items-center justify-between">
                  <span>ПЕРЕДАННЫЕ ПАРАМЕТРЫ СИСТЕМЫ:</span>
                  <span className="text-emerald-400">ПРИВЯЗКА ЗАВЕРШЕНА</span>
                </div>
                <div className="grid grid-cols-1 gap-1 text-slate-400 pt-1">
                  <div><span className="text-slate-200">Email:</span> <span className="text-white font-bold">{activationSummary.user.email}</span></div>
                  <div><span className="text-slate-200">Ключ:</span> <span className="text-amber-300 font-bold">{activationSummary.user.licenseKey}</span> {activationSummary.keyNumber ? `(Ключ #${activationSummary.keyNumber})` : ''}</div>
                  <div><span className="text-slate-200">MAC / HW-ID:</span> <span className="text-cyan-300">{activationSummary.displayMac} / {activationSummary.hwFingerprint}</span></div>
                  <div><span className="text-slate-200">CPU / Платформа:</span> {hwInfo.platform.cores} логических ядер ({hwInfo.platform.platform})</div>
                  <div><span className="text-slate-200">Согласие EULA:</span> <span className="text-emerald-400 font-bold">ПОДТВЕРЖДЕНО (v3.0)</span></div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onClose) onClose();
                  setActivationSummary(null);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-mono text-xs font-bold transition-all cursor-pointer text-center"
              >
                Закрыть / Выход
              </button>

              <button
                type="button"
                onClick={() => onAuthenticated(activationSummary.user)}
                className="flex-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <UserCheck className="w-4 h-4" />
                <span>Приступить к работе в Студии</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="flex border-b border-slate-800 bg-slate-950/50 p-1.5 gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 shadow-md shadow-cyan-950/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>1. Вход в Систему (Email + Пароль)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('activate');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  authMode === 'activate'
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 shadow-md shadow-cyan-950/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>2. Активация по Ключу (100 ключей)</span>
              </button>
            </div>

            {/* Form Body */}
            <div className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2 animate-shake">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div>{errorMessage}</div>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  <div>{successMessage}</div>
                </div>
              )}

              {authMode === 'login' ? (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-cyan-400" />
                        Электронная почта (Email)
                      </span>
                      {isSuperUserEmail(email) && (
                        <span className="text-[10px] text-amber-300 font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/40">
                          ★ Суперпользователь
                        </span>
                      )}
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="k.kabaev94@gmail.com или ваш email"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-slate-100 placeholder-slate-500 outline-none font-mono transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-cyan-400" />
                        Пароль доступа
                      </span>
                      {isSuperUserEmail(email) && (
                        <span className="text-[10px] text-slate-400">
                          (Для суперпользователя: любой пароль / PIN)
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Введите пароль"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-slate-100 placeholder-slate-500 outline-none font-mono transition-colors pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-black text-sm shadow-lg shadow-cyan-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Проверка учетных данных...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Войти в Вычислительную Студию</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleActivateSubmit} className="space-y-3.5">
                  <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-cyan-300">
                      <Zap className="w-3.5 h-3.5" />
                      Активация одного из 100 уникальных ключей
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Ключ выдается суперпользователем (К. Кабаев). После активации ключ навсегда привязывается к вашему Email и устройству.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-cyan-400" />
                      Ваш Email (будет привязан к лицензии)
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="engineer@company.com"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-500 text-sm text-slate-100 placeholder-slate-500 outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-cyan-400" />
                      Задайте пароль для будущих входов
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Минимум 4 символа"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-500 text-sm text-slate-100 placeholder-slate-500 outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        Лицензионный Ключ (Формат: AERO-PRO-XXXX-XXXX-XXXX)
                      </span>
                    </label>
                    <input
                      type="text"
                      required
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                      placeholder="AERO-PRO-7K9A-4M2X-88QP"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-500/50 focus:border-amber-400 text-sm text-amber-200 placeholder-slate-600 outline-none font-mono tracking-wider"
                    />
                  </div>

                  {/* Legal Consent & Telemetry Accordion */}
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => setAgreementAccepted(!agreementAccepted)}
                        className="mt-0.5 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer shrink-0"
                      >
                        {agreementAccepted ? (
                          <CheckSquare className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                        )}
                      </button>

                      <div className="text-[11px] text-slate-300 leading-snug space-y-1">
                        <label
                          onClick={() => setAgreementAccepted(!agreementAccepted)}
                          className="cursor-pointer select-none font-medium block"
                        >
                          Я подтверждаю согласие с{' '}
                          <span className="text-cyan-400 font-bold underline">
                            Пользовательским Лицензионным Соглашением
                          </span>{' '}
                          и даю безоговорочное согласие на передачу аппаратно-технических параметров моего устройства (MAC/HW-ID, CPU/GPU, IP, время) Правообладателю (К. Кабаев) для привязки лицензии.
                        </label>

                        <div className="flex items-center gap-3 pt-0.5 text-[10px] font-mono">
                          <button
                            type="button"
                            onClick={() => setIsAgreementModalOpen(true)}
                            className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Читать полный текст EULA</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>

                          <span className="text-slate-600">•</span>

                          <button
                            type="button"
                            onClick={() => setShowTelemetryDetails(!showTelemetryDetails)}
                            className="text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Cpu className="w-3 h-3 text-indigo-400" />
                            <span>Состав передаваемых данных</span>
                            {showTelemetryDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Telemetry live inspection drawer */}
                    {showTelemetryDetails && (
                      <div className="mt-2 p-3 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 space-y-1.5 animate-fadeIn">
                        <div className="font-bold text-cyan-300 flex items-center justify-between border-b border-slate-800 pb-1">
                          <span>ПАРАМЕТРЫ ТЕЛЕМЕТРИИ ВАШЕГО ПК:</span>
                          <span className="text-emerald-400 font-bold">✓ ГОТОВЫ К ОТПРАВКЕ</span>
                        </div>
                        <div className="grid grid-cols-1 gap-1 text-slate-400">
                          <div><span className="text-slate-200">MAC / HW-ID:</span> <span className="text-indigo-300">{hwInfo.displayMac} / {hwInfo.fingerprint}</span></div>
                          <div><span className="text-slate-200">Процессор (Ядер):</span> {hwInfo.platform.cores} логических потоков CPU</div>
                          <div><span className="text-slate-200">Платформа/ОС:</span> {hwInfo.platform.platform} ({hwInfo.platform.architecture})</div>
                          <div><span className="text-slate-200">GPU Renderer:</span> {hwInfo.platform.gpuRenderer}</div>
                          <div><span className="text-slate-200">Получатели:</span> {SUPER_USER_EMAILS.join(', ')}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !agreementAccepted}
                    className={`w-full py-3 rounded-xl font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 ${
                      agreementAccepted
                        ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-cyan-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-950/60 active:scale-95'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Активация & Передача данных...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Активировать Ключ и Передать Данные</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </>
        )}

        {/* Footer Security Note */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex items-center justify-between shrink-0">
          <span>Криптографическая защита & MAC Binding</span>
          <span>© 2026 K. Kabaev. All Rights Reserved.</span>
        </div>
      </div>

      {/* User License Agreement Modal */}
      <UserLicenseAgreementModal
        isOpen={isAgreementModalOpen}
        onClose={() => setIsAgreementModalOpen(false)}
        onAccept={() => setAgreementAccepted(true)}
      />
    </div>
  );
};
