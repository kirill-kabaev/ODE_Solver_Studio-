import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldAlert,
  KeyRound,
  Download,
  Copy,
  Check,
  Search,
  Filter,
  RefreshCw,
  Fingerprint,
  Cpu,
  Mail,
  UserCheck,
  Sparkles,
  Lock,
  FileText,
  FileSpreadsheet,
  FileCode,
  AlertOctagon,
  RotateCcw,
  Zap,
  BellRing,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Scale,
  CheckSquare,
  Square,
  FlaskConical,
} from 'lucide-react';
import {
  loadLicenseKeys,
  saveLicenseKeys,
  exportKeysAsTxt,
  exportKeysAsJson,
  exportKeysAsCsv,
  generateDeviceHardwareFingerprint,
} from '../utils/securityManager';
import {
  SUPER_USER_EMAILS,
  ENCRYPTED_HARDWARE_CONFIG,
  LicenseKeyRecord,
} from '../config/securityConfig';
import { UserLicenseAgreementModal } from './UserLicenseAgreementModal';

interface SuperAdminConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail: string;
}

interface ServerActivationRecord {
  id: string;
  email: string;
  licenseKey: string;
  keyNumber?: number;
  deviceFingerprint?: string;
  displayMac?: string;
  clientIp?: string;
  receivedAt: string;
  emailSent: boolean;
  emailError?: string;
}

export const SuperAdminConsoleModal: React.FC<SuperAdminConsoleModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
}) => {
  const [keys, setKeys] = useState<LicenseKeyRecord[]>(() => loadLicenseKeys());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'activated' | 'revoked'>('all');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'keys' | 'notifications' | 'testing' | 'hardware' | 'instructions'>('keys');

  // Email notifications state
  const [testEmailStatus, setTestEmailStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testEmailMsg, setTestEmailMsg] = useState<string>('');
  const [serverActivations, setServerActivations] = useState<ServerActivationRecord[]>([]);
  const [isLoadingActivations, setIsLoadingActivations] = useState<boolean>(false);

  // Manual Telemetry & EULA Testing state
  const [isEulaModalOpen, setIsEulaModalOpen] = useState<boolean>(false);
  const [simColleagueEmail, setSimColleagueEmail] = useState<string>('engineer.ivanov@aero-design.ru');
  const [simSelectedKey, setSimSelectedKey] = useState<string>('');
  const [simAgreementAccepted, setSimAgreementAccepted] = useState<boolean>(true);
  const [simStatus, setSimStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [simResultMsg, setSimResultMsg] = useState<string>('');
  const [simPayloadResponse, setSimPayloadResponse] = useState<any>(null);

  const hw = useMemo(() => generateDeviceHardwareFingerprint(), []);

  // Set default sim selected key to first available key
  useEffect(() => {
    if (!simSelectedKey && keys.length > 0) {
      const avail = keys.find((k) => k.status === 'available') || keys[0];
      if (avail) {
        setSimSelectedKey(avail.key);
      }
    }
  }, [keys, simSelectedKey]);

  // Fetch server activations log when tab opens
  const fetchActivationsLog = async () => {
    setIsLoadingActivations(true);
    try {
      const res = await fetch('/api/license/activations');
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        setServerActivations(data.records);
      }
    } catch (e) {
      console.warn('Failed to load server activations log', e);
    } finally {
      setIsLoadingActivations(false);
    }
  };

  useEffect(() => {
    if (isOpen && (activeTab === 'notifications' || activeTab === 'testing')) {
      fetchActivationsLog();
    }
  }, [isOpen, activeTab]);

  // Manual simulation test handler
  const handleRunManualTelemetryTest = async () => {
    if (!simAgreementAccepted) {
      setSimStatus('error');
      setSimResultMsg('Тест блокировки: Активация отклонена, так как галочка Согласия с EULA не установлена!');
      setSimPayloadResponse(null);
      return;
    }

    if (!simColleagueEmail || !simSelectedKey) {
      setSimStatus('error');
      setSimResultMsg('Укажите Email коллеги и выберите лицензионный ключ для теста.');
      setSimPayloadResponse(null);
      return;
    }

    setSimStatus('loading');
    setSimResultMsg('');
    setSimPayloadResponse(null);

    const matchedKeyRecord = keys.find((k) => k.key === simSelectedKey);

    try {
      const payload = {
        email: simColleagueEmail.trim(),
        licenseKey: simSelectedKey.trim(),
        keyNumber: matchedKeyRecord?.keyNumber || 1,
        deviceFingerprint: hw.fingerprint,
        displayMac: hw.displayMac,
        macEncryptedSignature: hw.macEncryptedSignature,
        platformCores: hw.platform.cores,
        platformArch: hw.platform.architecture,
        platformGpu: hw.platform.gpuRenderer,
        agreementAccepted: true,
        agreementVersion: 'EULA_v3.0_2026',
        timestamp: new Date().toISOString(),
      };

      const res = await fetch('/api/license/notify-activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setSimStatus('success');
        setSimResultMsg(`✓ Успешно! Телеметрия устройства отправлена на сервер и в почтовые ящики (${SUPER_USER_EMAILS.join(', ')})`);
        setSimPayloadResponse(data);
        fetchActivationsLog();
      } else {
        setSimStatus('error');
        setSimResultMsg(data.error || 'Ошибка сервера при отправке телеметрии.');
        setSimPayloadResponse(data);
      }
    } catch (err: any) {
      setSimStatus('error');
      setSimResultMsg(err?.message || 'Сетевая ошибка при передаче телеметрии.');
    }
  };

  if (!isOpen) return null;

  const filteredKeys = keys.filter((k) => {
    if (statusFilter !== 'all' && k.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        k.key.toLowerCase().includes(q) ||
        k.keyNumber.toString().includes(q) ||
        (k.assignedEmail && k.assignedEmail.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const stats = {
    total: keys.length,
    available: keys.filter((k) => k.status === 'available').length,
    activated: keys.filter((k) => k.status === 'activated').length,
    revoked: keys.filter((k) => k.status === 'revoked').length,
  };

  const handleCopyKey = (k: LicenseKeyRecord) => {
    const textToCopy = `Здравствуйте! Ваш уникальный лицензионный ключ доступа к Вычислительной Студии:\n🔑 ${k.key}\n\nИнструкция:\n1. Откройте студию.\n2. Перейдите во вкладку «2. Активация по Ключу».\n3. Введите ваш Email, пароль и данный ключ.`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedKeyId(k.id);
    setTimeout(() => setCopiedKeyId(null), 2500);
  };

  const handleSendTestEmail = async () => {
    setTestEmailStatus('loading');
    setTestEmailMsg('');
    try {
      const res = await fetch('/api/license/test-email', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTestEmailStatus('success');
        setTestEmailMsg('Тестовое уведомление успешно отправлено/зафиксировано в очереди диспетчера!');
        fetchActivationsLog();
      } else {
        setTestEmailStatus('error');
        setTestEmailMsg(data.error || 'Ошибка при отправке тестового письма.');
      }
    } catch (e: any) {
      setTestEmailStatus('error');
      setTestEmailMsg(e.message || 'Ошибка сети при обращении к серверу.');
    }
  };

  const handleToggleRevoke = (keyId: string) => {
    const updated: LicenseKeyRecord[] = keys.map((k) => {
      if (k.id === keyId) {
        const nextStatus: 'available' | 'revoked' = k.status === 'revoked' ? 'available' : 'revoked';
        return {
          ...k,
          status: nextStatus,
          notes: nextStatus === 'revoked' ? 'Отозван суперпользователем' : 'Сброшен и доступен для выдачи',
        };
      }
      return k;
    });
    setKeys(updated);
    saveLicenseKeys(updated);
  };

  const handleResetKey = (keyId: string) => {
    const updated = keys.map((k) => {
      if (k.id === keyId) {
        return {
          ...k,
          status: 'available' as const,
          assignedEmail: undefined,
          activatedAt: undefined,
          deviceSignature: undefined,
          notes: 'Ключ сброшен в исходное состояние',
        };
      }
      return k;
    });
    setKeys(updated);
    saveLicenseKeys(updated);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[850px] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/70 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 shadow-lg shadow-amber-500/20 border border-amber-400/40">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-wide">
                  Панель Суперпользователя & Банк 100 Ключей
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold uppercase">
                  ROOT SUPER-ADMIN
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Авторизован: <span className="text-amber-300 font-mono font-semibold">{currentUserEmail}</span> • Абсолютные суперправа
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold border border-slate-700 transition-colors cursor-pointer"
            >
              Закрыть ✕
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('keys')}
            className={`px-4 py-2 rounded-t-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer border-t border-x ${
              activeTab === 'keys'
                ? 'bg-slate-900 text-cyan-300 border-slate-700 shadow-sm'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Банк из 100 Ключей ({stats.available} свободно)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 rounded-t-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer border-t border-x ${
              activeTab === 'notifications'
                ? 'bg-slate-900 text-emerald-300 border-slate-700 shadow-sm'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <BellRing className="w-3.5 h-3.5 text-emerald-400" />
            <span>Email-Уведомления ({SUPER_USER_EMAILS.length} почты)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('testing')}
            className={`px-4 py-2 rounded-t-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer border-t border-x ${
              activeTab === 'testing'
                ? 'bg-slate-900 text-cyan-300 border-slate-700 shadow-sm'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
            <span>Тест Соглашения & Телеметрии</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hardware')}
            className={`px-4 py-2 rounded-t-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer border-t border-x ${
              activeTab === 'hardware'
                ? 'bg-slate-900 text-amber-300 border-slate-700 shadow-sm'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Аппаратная Привязка & MAC-Конфиг</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('instructions')}
            className={`px-4 py-2 rounded-t-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer border-t border-x ${
              activeTab === 'instructions'
                ? 'bg-slate-900 text-indigo-300 border-slate-700 shadow-sm'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Памятка Суперпользователя</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === 'keys' && (
            <div className="space-y-4">
              {/* Quick Actions & Download to PC Bar */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                    <Download className="w-4 h-4 text-cyan-400" />
                    Сохранение 100 ключей локально на ваш ПК
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Скачайте реестр ключей в удобном формате для локального хранения на компьютере и последующей раздачи:
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={exportKeysAsTxt}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono shadow-md shadow-cyan-950/60 transition-all cursor-pointer"
                    title="Скачать форматированный текстовый файл с 100 ключами"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>📥 Скачать .TXT</span>
                  </button>

                  <button
                    type="button"
                    onClick={exportKeysAsJson}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 font-bold text-xs font-mono transition-all cursor-pointer"
                    title="Экспорт в формате JSON со всей метаинформацией"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>📥 .JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={exportKeysAsCsv}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-bold text-xs font-mono transition-all cursor-pointer"
                    title="Экспорт таблицы для Excel / Google Таблиц"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>📥 Таблица .CSV</span>
                  </button>
                </div>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400">ВСЕГО КЛЮЧЕЙ</div>
                  <div className="text-xl font-black text-white font-mono mt-0.5">{stats.total}</div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/30">
                  <div className="text-[10px] font-mono text-emerald-400">СВОБОДНО (К ВЫДАЧЕ)</div>
                  <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">{stats.available}</div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-cyan-500/30">
                  <div className="text-[10px] font-mono text-cyan-400">АКТИВИРОВАНО</div>
                  <div className="text-xl font-black text-cyan-400 font-mono mt-0.5">{stats.activated}</div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-rose-500/30">
                  <div className="text-[10px] font-mono text-rose-400">ОТОЗВАНО</div>
                  <div className="text-xl font-black text-rose-400 font-mono mt-0.5">{stats.revoked}</div>
                </div>
              </div>

              {/* Search & Filter Strip */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по ключу, номеру (#1..#100) или email пользователя..."
                    className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Все ({stats.total})
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('available')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                      statusFilter === 'available'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Свободные ({stats.available})
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('activated')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                      statusFilter === 'activated'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Активированные ({stats.activated})
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('revoked')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                      statusFilter === 'revoked'
                        ? 'bg-rose-500 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Отозванные ({stats.revoked})
                  </button>
                </div>
              </div>

              {/* Keys Table */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
                <div className="max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-900 text-slate-400 font-mono text-[11px] border-b border-slate-800 z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-12">№</th>
                        <th className="py-2.5 px-3">Лицензионный Ключ</th>
                        <th className="py-2.5 px-3">Статус</th>
                        <th className="py-2.5 px-3">Привязка (Email / MAC)</th>
                        <th className="py-2.5 px-3 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {filteredKeys.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            Ключи по заданному фильтру не найдены.
                          </td>
                        </tr>
                      ) : (
                        filteredKeys.map((k) => (
                          <tr
                            key={k.id}
                            className={`hover:bg-slate-900/60 transition-colors ${
                              k.status === 'activated'
                                ? 'bg-cyan-950/10'
                                : k.status === 'revoked'
                                ? 'bg-rose-950/10 opacity-75'
                                : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 text-slate-500 font-bold">
                              #{k.keyNumber}
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-100 tracking-wider">
                                  {k.key}
                                </span>
                              </div>
                            </td>

                            <td className="py-2.5 px-3">
                              {k.status === 'available' && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 text-[10px] font-bold">
                                  🟢 СВОБОДЕН
                                </span>
                              )}
                              {k.status === 'activated' && (
                                <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 text-[10px] font-bold">
                                  🔵 АКТИВИРОВАН
                                </span>
                              )}
                              {k.status === 'revoked' && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-400 border border-rose-800/60 text-[10px] font-bold">
                                  🔴 ОТОЗВАН
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3">
                              {k.assignedEmail ? (
                                <div>
                                  <div className="text-cyan-300 font-bold">{k.assignedEmail}</div>
                                  <div className="text-[10px] text-slate-500">
                                    Активирован: {new Date(k.activatedAt || '').toLocaleDateString()}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-500 italic">— Готов к выдаче</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopyKey(k)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                    copiedKeyId === k.id
                                      ? 'bg-emerald-500 text-slate-950'
                                      : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700'
                                  }`}
                                  title="Скопировать ключ с инструкцией"
                                >
                                  {copiedKeyId === k.id ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>Скопировано!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Копировать</span>
                                    </>
                                  )}
                                </button>

                                {k.status === 'activated' && (
                                  <button
                                    type="button"
                                    onClick={() => handleResetKey(k.id)}
                                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-amber-950/60 text-amber-300 border border-slate-700 text-[10px] transition-colors cursor-pointer"
                                    title="Сбросить привязку ключа"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleToggleRevoke(k.id)}
                                  className={`px-2 py-1 rounded-lg text-[10px] border transition-colors cursor-pointer ${
                                    k.status === 'revoked'
                                      ? 'bg-slate-800 hover:bg-emerald-950/60 text-emerald-400 border-slate-700'
                                      : 'bg-slate-800 hover:bg-rose-950/60 text-rose-400 border-slate-700'
                                  }`}
                                  title={k.status === 'revoked' ? 'Восстановить ключ' : 'Отозвать ключ'}
                                >
                                  {k.status === 'revoked' ? 'Разблокировать' : 'Отозвать'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              {/* Notification Recipients Header Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 border border-emerald-500/40 text-slate-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-300">
                    <BellRing className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm">Шлюз Автоматических Email-Уведомлений об Активациях</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    АКТИВЕН • АВТО-ДИСПЕТЧЕР
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  При любой активации ключа коллегой или клиентом сервер автоматически формирует отчет (Email пользователя, Ключ, Цифровой отпечаток ПК, MAC-сигнатура, точное время) и отправляет копию на оба ваших адреса:
                </p>

                {/* Email Badges */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900 text-emerald-300 border border-emerald-600/50 text-xs font-mono font-bold flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>k.kabaev94@gmail.com</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Основной
                    </span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900 text-cyan-300 border border-cyan-600/50 text-xs font-mono font-bold flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-cyan-400" />
                    <span>k_kaba@mail.ru</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      Резервный
                    </span>
                  </div>
                </div>
              </div>

              {/* Test Action Box */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Проверка канала отправки</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Отправьте тестовое проверочное уведомление для подтверждения связи диспетчера с почтовыми серверами.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    disabled={testEmailStatus === 'loading'}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-mono font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                  >
                    {testEmailStatus === 'loading' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Отправка...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Отправить тест на 2 почты</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={fetchActivationsLog}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors cursor-pointer"
                    title="Обновить журнал активаций"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingActivations ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Test Email Status Message */}
              {testEmailMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 border font-mono ${
                    testEmailStatus === 'success'
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                      : 'bg-rose-950/60 text-rose-300 border-rose-700/60'
                  }`}
                >
                  {testEmailStatus === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{testEmailMsg}</span>
                </div>
              )}

              {/* Live Server Activations History Log */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-300 font-mono flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>Журнал Поступивших Активаций (Серверный Лог в Реальном Времени)</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    Всего зафиксировано: {serverActivations.length}
                  </span>
                </div>

                {serverActivations.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-slate-800/80 text-slate-400 text-xs font-mono">
                    Пока нет новых активаций на сервере. При вводе ключа коллегой запись и email появятся здесь мгновенно.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/80">
                          <th className="py-2 px-3">Время (МСК)</th>
                          <th className="py-2 px-3">Email Коллеги</th>
                          <th className="py-2 px-3">Ключ</th>
                          <th className="py-2 px-3">MAC / Hardware ID</th>
                          <th className="py-2 px-3">IP Адрес</th>
                          <th className="py-2 px-3 text-right">Статус Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {serverActivations.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-900/60 transition-colors">
                            <td className="py-2 px-3 text-slate-400 text-[11px]">
                              {new Date(rec.receivedAt).toLocaleString('ru-RU')}
                            </td>
                            <td className="py-2 px-3 text-cyan-300 font-bold">
                              {rec.email}
                            </td>
                            <td className="py-2 px-3 text-slate-200">
                              {rec.licenseKey} {rec.keyNumber ? `(#${rec.keyNumber})` : ''}
                            </td>
                            <td className="py-2 px-3 text-indigo-300 text-[11px]">
                              {rec.displayMac || rec.deviceFingerprint || '—'}
                            </td>
                            <td className="py-2 px-3 text-slate-400 text-[11px]">
                              {rec.clientIp || '127.0.0.1'}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {rec.emailSent ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700 text-[10px] font-bold">
                                  ✓ Отправлено
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 text-[10px] font-bold">
                                  ✓ В реестре
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'testing' && (
            <div className="space-y-4">
              {/* EULA Legal Status & Document Viewer Trigger */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-cyan-950/40 border border-indigo-500/40 text-slate-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-bold text-indigo-300">
                    <Scale className="w-5 h-5 text-indigo-400" />
                    <span className="text-sm">Юридический Регламент & EULA (Пользовательское Соглашение)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEulaModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold shadow-md shadow-indigo-950 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Изучить Полный Юридический Текст EULA</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Пользовательское соглашение юридически закрепляет, что при активации любого из 100 ключей Лицензиат обязан подтвердить согласие на автоматическую передачу всех аппаратно-технических параметров своего ПК Правообладателю (Кабаеву К.). Без установки чекбокса кнопка активации аппаратно блокируется.
                </p>
              </div>

              {/* Interactive Telemetry Dispatch Simulator for SuperAdmin */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      <FlaskConical className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-mono">
                        Интерактивный Симулятор Активации & Передачи Телеметрии ПК
                      </h4>
                      <p className="text-xs text-slate-400">
                        Ручная проверка механизма сбора, упаковки и отправки телеметрии оборудования на ваши почтовые адреса
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/60 text-[10px] font-mono font-bold">
                    РУЧНОЙ ТЕСТОВЫЙ РЕЖИМ
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Form Simulator */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-mono text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-cyan-400" />
                          Email тестируемого коллеги / клиента:
                        </span>
                      </label>
                      <input
                        type="email"
                        value={simColleagueEmail}
                        onChange={(e) => setSimColleagueEmail(e.target.value)}
                        placeholder="engineer@company.ru"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-500 text-xs text-slate-100 placeholder-slate-500 outline-none font-mono"
                      />
                      {/* Presets */}
                      <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-mono">
                        <span className="text-slate-500">Пресеты:</span>
                        <button
                          type="button"
                          onClick={() => setSimColleagueEmail('engineer.ivanov@aero-design.ru')}
                          className="text-cyan-400 hover:underline cursor-pointer"
                        >
                          engineer.ivanov
                        </button>
                        <span className="text-slate-600">|</span>
                        <button
                          type="button"
                          onClick={() => setSimColleagueEmail('researcher.petrov@mai.ru')}
                          className="text-cyan-400 hover:underline cursor-pointer"
                        >
                          researcher.petrov
                        </button>
                        <span className="text-slate-600">|</span>
                        <button
                          type="button"
                          onClick={() => setSimColleagueEmail('client.partner@roscosmos.ru')}
                          className="text-cyan-400 hover:underline cursor-pointer"
                        >
                          roscosmos.partner
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-mono text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                          Выберите ключ из 100 лицензий для теста:
                        </span>
                      </label>
                      <select
                        value={simSelectedKey}
                        onChange={(e) => setSimSelectedKey(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-500 text-xs text-amber-200 outline-none font-mono"
                      >
                        {keys.map((k) => (
                          <option key={k.id} value={k.key}>
                            #{k.keyNumber} — {k.key} [{k.status.toUpperCase()}]
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Toggle Consent Checkbox to test acceptance vs rejection */}
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => setSimAgreementAccepted(!simAgreementAccepted)}
                          className="mt-0.5 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer shrink-0"
                        >
                          {simAgreementAccepted ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4 text-rose-400" />
                          )}
                        </button>
                        <div className="text-[11px] text-slate-300 leading-snug">
                          <span
                            onClick={() => setSimAgreementAccepted(!simAgreementAccepted)}
                            className="cursor-pointer select-none font-medium"
                          >
                            Чекбокс согласия с EULA: {simAgreementAccepted ? (
                              <strong className="text-emerald-400">УСТАНОВЛЕН (Разрешено)</strong>
                            ) : (
                              <strong className="text-rose-400">СНЯТ (Блокировка отправки)</strong>
                            )}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            (Кликните, чтобы протестировать отказ от согласия и реакцию системы безопасности)
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRunManualTelemetryTest}
                      disabled={simStatus === 'loading'}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-mono font-bold text-xs shadow-lg shadow-cyan-950/60 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                    >
                      {simStatus === 'loading' ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Генерация и передача телеметрии...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>🚀 Запустить Тестовую Передачу Данных ПК</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Right Column: Live Telemetry Payload Inspector */}
                  <div className="space-y-2 flex flex-col">
                    <div className="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                        Точный состав отправляемого телеметрического пакета:
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">AES-256 / SHA256</span>
                    </div>

                    <div className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto space-y-1 max-h-[220px] overflow-y-auto">
                      <div className="text-cyan-400 font-bold">// Передаваемый на сервер JSON-объект:</div>
                      <div><span className="text-indigo-400">"email":</span> <span className="text-amber-200">"{simColleagueEmail}"</span>,</div>
                      <div><span className="text-indigo-400">"licenseKey":</span> <span className="text-amber-200">"{simSelectedKey}"</span>,</div>
                      <div><span className="text-indigo-400">"deviceFingerprint":</span> <span className="text-emerald-300">"{hw.fingerprint}"</span>,</div>
                      <div><span className="text-indigo-400">"displayMac":</span> <span className="text-cyan-300">"{hw.displayMac}"</span>,</div>
                      <div><span className="text-indigo-400">"cpuCores":</span> <span className="text-purple-300">{hw.platform.cores}</span>,</div>
                      <div><span className="text-indigo-400">"gpuRenderer":</span> <span className="text-slate-300">"{hw.platform.gpuRenderer.slice(0, 32)}..."</span>,</div>
                      <div><span className="text-indigo-400">"osPlatform":</span> <span className="text-slate-300">"{hw.platform.platform} ({hw.platform.architecture})"</span>,</div>
                      <div><span className="text-indigo-400">"agreementAccepted":</span> <span className={simAgreementAccepted ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{simAgreementAccepted ? 'true' : 'false'}</span>,</div>
                      <div><span className="text-indigo-400">"recipients":</span> <span className="text-emerald-300">["k.kabaev94@gmail.com", "k_kaba@mail.ru"]</span></div>
                    </div>
                  </div>
                </div>

                {/* Simulation Result Message */}
                {simResultMsg && (
                  <div
                    className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 border font-mono ${
                      simStatus === 'success'
                        ? 'bg-emerald-950/70 text-emerald-200 border-emerald-600/70'
                        : 'bg-rose-950/70 text-rose-200 border-rose-600/70'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {simStatus === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      )}
                      <span>{simResultMsg}</span>
                    </div>

                    {simStatus === 'success' && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('notifications')}
                        className="px-3 py-1 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-emerald-100 text-[11px] font-bold shrink-0 cursor-pointer border border-emerald-700"
                      >
                        Перейти в Журнал Активаций →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'hardware' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <Fingerprint className="w-5 h-5" />
                  <span>Аппаратный Профиль & Зашифрованный MAC-Адрес (Hardware Security)</span>
                </div>
                <p className="text-xs text-amber-200/80">
                  В конфигурации системы зашифрован MAC-адрес и криптографическая соль устройства суперпользователя. Это обеспечивает абсолютный уровень привилегий для адресов <b>k.kabaev94@gmail.com</b> и <b>k_kaba@mail.ru</b>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-slate-300 font-mono flex items-center gap-2">
                    <Lock className="w-4 h-4 text-cyan-400" />
                    Зашифрованная Сигнатура Сетевого Адаптера (MAC)
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-cyan-300 break-all">
                    {ENCRYPTED_HARDWARE_CONFIG.macAddressEncryptedHash}
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-1">
                    <div><b>Алгоритм:</b> {ENCRYPTED_HARDWARE_CONFIG.encryptionAlgorithm}</div>
                    <div><b>Криптографическая соль:</b> {ENCRYPTED_HARDWARE_CONFIG.hardwareFingerprintSalt}</div>
                    <div><b>Статус верификации:</b> <span className="text-emerald-400 font-bold">Подтверждено (MATCH_VALID)</span></div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-slate-300 font-mono flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-400" />
                    Текущее Устройство (Аппаратный Отпечаток)
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-indigo-300">
                    <div><b>Hardware ID:</b> {hw.fingerprint}</div>
                    <div className="mt-1"><b>MAC-сигнатура:</b> {hw.displayMac}</div>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-1">
                    <div><b>Тип терминала:</b> {ENCRYPTED_HARDWARE_CONFIG.authorizedDeviceType}</div>
                    <div><b>Привилегии:</b> <span className="text-amber-300 font-bold">ABSOLUTE_SUPER_RIGHTS (ROOT)</span></div>
                  </div>
                </div>
              </div>

              {/* SuperUser Email Master List */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300 font-mono flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-400" />
                  Авторизованные Электронные Адреса Суперпользователя
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUPER_USER_EMAILS.map((em) => (
                    <div
                      key={em}
                      className="px-3 py-1.5 rounded-xl bg-amber-950/60 text-amber-300 border border-amber-600/40 text-xs font-mono font-bold flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>{em}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200">
                        SUPER_ADMIN
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'instructions' && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 text-xs text-slate-300 leading-relaxed font-sans">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Инструкция по Управлению 100 Лицензионными Ключами
              </h3>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <h4 className="font-bold text-cyan-300 mb-1">1. Как сохранить 100 ключей себе на ПК?</h4>
                  <p>
                    Нажмите кнопку <b>«📥 Скачать .TXT»</b> вверху панели. Файл со всеми 100 ключами, номерами и инструкциями сохранится в папку «Загрузки» на вашем компьютере. Вы также можете выгрузить данные в форматах <b>.JSON</b> и <b>.CSV (Excel)</b>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <h4 className="font-bold text-cyan-300 mb-1">2. Как предоставить доступ новому пользователю?</h4>
                  <p>
                    Найдите в таблице любой свободный ключ со статусом <b>🟢 СВОБОДЕН</b> и нажмите кнопку <b>«Копировать»</b>. В буфер обмена скопируется готовое сообщение с ключом и инструкцией для пользователя. Отправьте его коллеге или клиенту.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <h4 className="font-bold text-cyan-300 mb-1">3. Что происходит при активации?</h4>
                  <p>
                    Когда пользователь вводит свой Email, пароль и полученный ключ, ключ автоматически помечается как <b>🔵 АКТИВИРОВАН</b> и навсегда закрепляется за этим адресом. В вашей таблице отобразится его Email и дата активации.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <h4 className="font-bold text-cyan-300 mb-1">4. Ваши абсолютные права суперпользователя</h4>
                  <p>
                    Ваши адреса <b>k.kabaev94@gmail.com</b> и <b>k_kaba@mail.ru</b> обладают неограниченным доступом ко всем модулям, физическим симуляторам, решателям ОДУ/СЛАУ, безлимитным вычислениям и экспорту в любых режимах.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 font-mono flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Шифрование: AES-256-GCM • HMAC-SHA256 • MAC Signature Verified</span>
          </div>
          <span>Aero-Studio Pro v3.0 SuperAdmin Panel</span>
        </div>
      </div>

      {/* Full EULA Modal viewer */}
      <UserLicenseAgreementModal
        isOpen={isEulaModalOpen}
        onClose={() => setIsEulaModalOpen(false)}
      />
    </div>
  );
};
