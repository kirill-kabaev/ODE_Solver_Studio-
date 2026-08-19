// ============================================================================
// Drone / Multirotor Flight Envelope & Battery Endurance Matcher Component
// Matches BEM rotor characteristics to drone weight, battery, and motors.
// ============================================================================

import React, { useMemo } from 'react';
import { Battery, Zap, Clock, ShieldCheck, AlertCircle, Weight, ArrowUpCircle } from 'lucide-react';
import { DroneFlightProfile, FlowOperatingCondition, RotorBEMResults, RotorGeometryConfig } from './bemTypes';
import { computeDroneFlightEnvelope } from './bemSolver';

interface DroneFlightEnvelopeProps {
  bemResults: RotorBEMResults;
  config: RotorGeometryConfig;
  flow: FlowOperatingCondition;
  profile: DroneFlightProfile;
  onProfileChange: (newProfile: DroneFlightProfile) => void;
}

export const DroneFlightEnvelope: React.FC<DroneFlightEnvelopeProps> = ({
  bemResults,
  config,
  flow,
  profile,
  onProfileChange,
}) => {
  const flightResults = useMemo(() => {
    return computeDroneFlightEnvelope(bemResults, profile, config, flow);
  }, [bemResults, profile, config, flow]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Расчет Летных Характеристик Дрона & Время Зависания (Endurance)
            </h3>
            <p className="text-xs text-slate-400">
              Согласование аэродинамики винта с весом БПЛА, тяговооруженностью и емкостью АКБ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold border flex items-center gap-1.5 ${
              flightResults.isHoverFeasible
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                : 'bg-rose-950 text-rose-300 border-rose-700'
            }`}
          >
            {flightResults.isHoverFeasible ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Тяговооруженность TWR ≥ 1.3: Полет Возможен</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Недостаточная Тяга: Перегруз!</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Flight Telemetry Dashboard Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Время Зависания:</span>
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">
            {flightResults.hoverFlightTimeMinutes.toFixed(1)} мин
          </div>
          <span className="text-[10px] text-slate-500 block">80% DOD разряд АКБ</span>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Тяговооруженность:</span>
            <Weight className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-cyan-400">
            {flightResults.thrustToWeightRatioMax.toFixed(2)} : 1
          </div>
          <span className="text-[10px] text-slate-500 block">
            {flightResults.thrustToWeightRatioMax >= 2.0 ? 'Акро/Спорт' : 'Крейсер/Стабильный'}
          </span>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Обороты Зависания:</span>
            <Zap className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-400">
            {flightResults.hoverRpm.toLocaleString()} RPM
          </div>
          <span className="text-[10px] text-slate-500 block">
            Газ: {flightResults.hoverThrottlePercent.toFixed(0)}% Throttle
          </span>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Потребляемый Ток:</span>
            <Battery className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400">
            {flightResults.hoverCurrentAmps.toFixed(1)} A
          </div>
          <span className="text-[10px] text-slate-500 block">
            {(flightResults.hoverTotalElectricalPowerWatts).toFixed(0)} Вт суммарно
          </span>
        </div>
      </div>

      {/* Interactive Drone Parameters Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
        {/* Column 1: Frame & Mass */}
        <div className="space-y-3">
          <span className="text-slate-300 font-bold block border-b border-slate-800 pb-1">
            Конфигурация Рамы & Масса
          </span>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Количество моторов:</span>
              <span className="text-white font-bold">{profile.numRotors}x</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[4, 6, 8].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onProfileChange({ ...profile, numRotors: n as 4 | 6 | 8 })}
                  className={`py-1 rounded-lg text-center font-bold cursor-pointer transition-colors ${
                    profile.numRotors === n
                      ? 'bg-cyan-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {n === 4 ? 'Квадро (4)' : n === 6 ? 'Гекса (6)' : 'Окто (8)'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Полная масса (AUW):</span>
              <span className="text-cyan-400 font-bold">{profile.allUpWeightKg.toFixed(2)} кг</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={60.0}
              step={0.1}
              value={profile.allUpWeightKg}
              onChange={(e) =>
                onProfileChange({ ...profile, allUpWeightKg: parseFloat(e.target.value) })
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Полезная нагрузка:</span>
              <span className="text-white font-bold">{profile.payloadMassKg.toFixed(2)} кг</span>
            </div>
            <input
              type="range"
              min={0.0}
              max={30.0}
              step={0.1}
              value={profile.payloadMassKg}
              onChange={(e) =>
                onProfileChange({ ...profile, payloadMassKg: parseFloat(e.target.value) })
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>

        {/* Column 2: Battery System */}
        <div className="space-y-3">
          <span className="text-slate-300 font-bold block border-b border-slate-800 pb-1">
            Аккумуляторная Батарея (LiPo / Li-Ion)
          </span>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Напряжение АКБ:</span>
              <span className="text-amber-400 font-bold">{profile.batteryVoltageVolts.toFixed(1)} В</span>
            </div>
            <div className="grid grid-cols-4 gap-1 pt-1">
              {[
                { label: '4S (14.8V)', val: 14.8 },
                { label: '6S (22.2V)', val: 22.2 },
                { label: '12S (44.4V)', val: 44.4 },
                { label: '14S (51.8V)', val: 51.8 },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => onProfileChange({ ...profile, batteryVoltageVolts: s.val })}
                  className={`py-1 text-[10px] rounded text-center font-bold cursor-pointer transition-colors ${
                    profile.batteryVoltageVolts === s.val
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Емкость батареи:</span>
              <span className="text-amber-400 font-bold">{profile.batteryCapacityMah.toLocaleString()} мАч</span>
            </div>
            <input
              type="range"
              min={1000}
              max={60000}
              step={500}
              value={profile.batteryCapacityMah}
              onChange={(e) =>
                onProfileChange({
                  ...profile,
                  batteryCapacityMah: parseInt(e.target.value, 10),
                  batteryEnergyWh: (parseInt(e.target.value, 10) * profile.batteryVoltageVolts) / 1000,
                })
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          <div className="bg-slate-900 p-2 rounded-lg text-[11px] text-slate-400">
            Запас энергии: <span className="text-white font-bold">{((profile.batteryCapacityMah * profile.batteryVoltageVolts) / 1000).toFixed(1)} Вт·ч</span>
          </div>
        </div>

        {/* Column 3: Motor & ESC Parameters */}
        <div className="space-y-3">
          <span className="text-slate-300 font-bold block border-b border-slate-800 pb-1">
            Моторы & КПД Регуляторов (ESC)
          </span>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Мотор KV:</span>
              <span className="text-purple-400 font-bold">{profile.motorKv} об/В</span>
            </div>
            <input
              type="range"
              min={80}
              max={3000}
              step={10}
              value={profile.motorKv}
              onChange={(e) =>
                onProfileChange({ ...profile, motorKv: parseInt(e.target.value, 10) })
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>КПД Регулятора ESC:</span>
              <span className="text-white font-bold">{(profile.escEfficiency * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0.85}
              max={0.98}
              step={0.01}
              value={profile.escEfficiency}
              onChange={(e) =>
                onProfileChange({ ...profile, escEfficiency: parseFloat(e.target.value) })
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
          </div>

          <div className="bg-slate-900 p-2 rounded-lg text-[11px] text-slate-400 flex items-center justify-between">
            <span>Скороподъемность $V_y$:</span>
            <span className="text-emerald-400 font-bold">{flightResults.maxClimbRateMs.toFixed(1)} м/с</span>
          </div>
        </div>
      </div>
    </div>
  );
};
