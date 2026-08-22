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
} from 'lucide-react';
import {
  authenticateWithCredentials,
  activateWithLicenseKey,
  generateDeviceHardwareFingerprint,
  isSuperUserEmail,
  AuthUser,
} from '../utils/securityManager';
import { SUPER_USER_EMAILS, ENCRYPTED_HARDWARE_CONFIG } from '../config/securityConfig';

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
  allowClose = false,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'activate'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const hwInfo = generateDeviceHardwareFingerprint();

  if (!isOpen) return null;

  const handleQuickSuperUserSelect = (superEmail: string) => {
    setEmail(superEmail);
    setPassword('aeropro2026');
    setAuthMode('login');
    setErrorMessage(null);
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
    setIsLoading(true);

    try {
      const res = await activateWithLicenseKey(email, password, licenseKey);
      if (res.success && res.user) {
        setSuccessMessage('Ключ успешно активирован! Ваша учетная запись создана.');
        setTimeout(() => {
          onAuthenticated(res.user!);
        }, 700);
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
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        
        {/* Glow Header Banner */}
        <div className="relative px-6 pt-6 pb-5 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 border-b border-slate-800">
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

            {allowClose && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* SuperUser Fast-Pass Card */}
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 p-1.5 gap-1.5">
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-cyan-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Активация лицензии...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Активировать Ключ и Войти</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer Security Note */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex items-center justify-between">
          <span>Криптографическая защита & MAC Binding</span>
          <span>© 2026 K. Kabaev. All Rights Reserved.</span>
        </div>
      </div>
    </div>
  );
};
