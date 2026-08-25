// ============================================================================
// UAV Battery Thermal Dynamics, Low-Temperature Flight & BMS Studio
// 2-RC Thévenin Model, Arrhenius Internal Resistance, Joule Heating & Cold Sag
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Battery,
  Zap,
  Flame,
  Snowflake,
  Shield,
  Activity,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingDown,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { FullscreenGraphButton } from '../../telemetry/FullscreenGraphButton';

export type BatteryChemistryType = 'lipo_high_c' | 'li_ion_21700' | 'semi_solid_state' | 'lifepo4';

export interface BatteryPreset {
  id: string;
  name: string;
  chemistry: BatteryChemistryType;
  cellsSeries: number; // e.g. 6S
  capacityMah: number;
  continuousC_Rating: number;
  nominalCellVoltage: number;
  baseResistanceMilliOhms: number; // at 25 deg C per cell
  packMassGrams: number;
  specificEnergyWhKg: number;
  description: string;
}

export const BATTERY_PRESETS: BatteryPreset[] = [
  {
    id: 'fpv_lipo_6s',
    name: 'LiPo Graphene 6S 1500mAh (130C Пиковый ток)',
    chemistry: 'lipo_high_c',
    cellsSeries: 6,
    capacityMah: 1500,
    continuousC_Rating: 100,
    nominalCellVoltage: 3.7,
    baseResistanceMilliOhms: 2.8,
    packMassGrams: 260,
    specificEnergyWhKg: 130,
    description: 'Ультранизкое внутреннее сопротивление, способность отдавать токи до 150А для скоростных маневров.',
  },
  {
    id: 'long_range_21700_6s2p',
    name: 'Li-Ion 21700 6S2P 9000mAh (Molicel P45B)',
    chemistry: 'li_ion_21700',
    cellsSeries: 6,
    capacityMah: 9000,
    continuousC_Rating: 10,
    nominalCellVoltage: 3.6,
    baseResistanceMilliOhms: 6.5,
    packMassGrams: 890,
    specificEnergyWhKg: 220,
    description: 'Максимальная удельная энергоемкость для дальних полетов БПЛА на 30–60 минут.',
  },
  {
    id: 'solid_state_6s_heavy',
    name: 'Semi-Solid State 6S 22000mAh (300 Вт·ч/кг)',
    chemistry: 'semi_solid_state',
    cellsSeries: 6,
    capacityMah: 22000,
    continuousC_Rating: 5,
    nominalCellVoltage: 3.8,
    baseResistanceMilliOhms: 4.2,
    packMassGrams: 1650,
    specificEnergyWhKg: 305,
    description: 'Твердотельный электролит повышенной безопасности для тяжелых разведывательных и картографических БПЛА.',
  },
];

export const UAVBatteryThermalBMSModule: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(1);
  const [ambientTempC, setAmbientTempC] = useState<number>(-10); // -25 to +45 deg C
  const [dischargeCurrentAmps, setDischargeCurrentAmps] = useState<number>(25); // 5 to 120A
  const [hasPreHeater, setHasPreHeater] = useState<boolean>(true);
  const [preHeaterTargetTempC, setPreHeaterTargetTempC] = useState<number>(25);
  const [airspeedCoolingMs, setAirspeedCoolingMs] = useState<number>(14); // airflow speed
  const [thermalInsulationThicknessMm, setThermalInsulationThicknessMm] = useState<number>(3);

  const currentPreset = BATTERY_PRESETS[selectedPresetIdx];

  // Arrhenius Resistance scaling vs Temperature
  const calcInternalResistanceOhms = (tempC: number) => {
    const tempK = tempC + 273.15;
    const refTempK = 298.15; // 25 deg C
    const ea_over_r = 2800; // Arrhenius activation factor for Li-ion
    const baseR = (currentPreset.baseResistanceMilliOhms * currentPreset.cellsSeries) / 1000;
    return baseR * Math.exp(ea_over_r * (1 / tempK - 1 / refTempK));
  };

  // Thermal and Discharge Time Simulation
  const simulationResults = useMemo(() => {
    const initialTempC = hasPreHeater ? preHeaterTargetTempC : ambientTempC;
    const packMassKg = currentPreset.packMassGrams / 1000;
    const cp = 950; // J/(kg*K) specific heat capacity of battery pack
    const totalCapacityAh = currentPreset.capacityMah / 1000;
    const nominalVoltage = currentPreset.nominalCellVoltage * currentPreset.cellsSeries;

    // Simulation steps
    const dt = 10; // seconds
    let currentTempC = initialTempC;
    let consumedAh = 0;
    let timeSec = 0;

    const timeSeries = [];
    let isFailsafeTriggered = false;
    let failsafeTimeSec = 0;

    const surfaceAreaM2 = 0.04;
    // Heat transfer coefficient with airspeed & insulation
    const h_bare = 10 + 6 * Math.sqrt(airspeedCoolingMs);
    const h_effective = h_bare / (1 + (thermalInsulationThicknessMm / 1000) * 25);

    while (consumedAh < totalCapacityAh * 0.95 && timeSec < 7200) {
      const soc = 1.0 - consumedAh / totalCapacityAh;
      const currentR = calcInternalResistanceOhms(currentTempC);

      // Open circuit voltage vs SOC
      const ocvCell = 3.25 + 0.9 * Math.pow(soc, 0.7) - (soc < 0.1 ? 0.3 * (0.1 - soc) * 10 : 0);
      const ocvPack = ocvCell * currentPreset.cellsSeries;

      // Voltage under load (Voltage Sag): V = OCV - I * R_int
      const loadVoltage = ocvPack - dischargeCurrentAmps * currentR;

      // Joule heat: Q_dot_joule = I^2 * R
      const qJoule = Math.pow(dischargeCurrentAmps, 2) * currentR;
      // Convective cooling: Q_dot_conv = h * A * (T_pack - T_amb)
      const qConv = h_effective * surfaceAreaM2 * (currentTempC - ambientTempC);

      // Net thermal power:
      const qNet = qJoule - qConv;
      const dT = (qNet * dt) / (packMassKg * cp);
      currentTempC += dT;

      consumedAh += (dischargeCurrentAmps * dt) / 3600;
      timeSec += dt;

      // Cutoff voltage per cell (3.0V critical threshold)
      const cellVoltage = loadVoltage / currentPreset.cellsSeries;
      if (cellVoltage <= 3.1 && !isFailsafeTriggered) {
        isFailsafeTriggered = true;
        failsafeTimeSec = timeSec;
      }

      timeSeries.push({
        timeMin: parseFloat((timeSec / 60).toFixed(1)),
        voltagePack: parseFloat(loadVoltage.toFixed(2)),
        cellVoltage: parseFloat(cellVoltage.toFixed(2)),
        temperatureC: parseFloat(currentTempC.toFixed(1)),
        resistanceMilliOhms: parseFloat((currentR * 1000).toFixed(1)),
        socPercent: parseFloat((soc * 100).toFixed(0)),
      });

      if (cellVoltage <= 2.9) break; // Hard cutoff
    }

    const maxTempC = Math.max(...timeSeries.map((d) => d.temperatureC));
    const flightDurationMin = timeSec / 60;
    const initialSagVoltage = timeSeries[0]?.cellVoltage || 3.7;
    const initialResistanceMilliOhms = calcInternalResistanceOhms(initialTempC) * 1000;

    return {
      timeSeries,
      flightDurationMin,
      maxTempC,
      initialTempC,
      initialSagVoltage,
      initialResistanceMilliOhms,
      isFailsafeTriggered,
      failsafeTimeSec,
    };
  }, [currentPreset, ambientTempC, dischargeCurrentAmps, hasPreHeater, preHeaterTargetTempC, airspeedCoolingMs, thermalInsulationThicknessMm]);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-emerald-900/50 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl border border-emerald-500/40 text-emerald-400">
              <Battery className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Тепловая Динамика АКБ & Зимний Полет БПЛА (BMS Studio)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Thévenin 2-RC & Arrhenius Law
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Численное моделирование просадки напряжения на морозе, джоулева саморазогрева и эффекта предпускового подогрева.
              </p>
            </div>
          </div>
        </div>

        {/* Presets Grid */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {BATTERY_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPresetIdx(idx)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer text-xs flex flex-col justify-between gap-1.5 ${
                selectedPresetIdx === idx
                  ? 'bg-gradient-to-br from-emerald-950/90 to-slate-900 border-emerald-400 text-white shadow-lg ring-1 ring-emerald-400/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <div className="font-bold text-emerald-300 flex items-center justify-between">
                <span>{p.name.split('(')[0]}</span>
                {selectedPresetIdx === idx && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{p.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Время Полета</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {simulationResults.flightDurationMin.toFixed(1)} <span className="text-xs text-slate-400">мин</span>
          </div>
          <div className="text-[10px] text-slate-500">Ток {dischargeCurrentAmps} А</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Стартовая Просадка</span>
            <TrendingDown className="w-4 h-4 text-cyan-400" />
          </div>
          <div className={`text-2xl font-black ${simulationResults.initialSagVoltage >= 3.4 ? 'text-cyan-400' : 'text-rose-400'}`}>
            {simulationResults.initialSagVoltage.toFixed(2)} <span className="text-xs text-slate-400">В/эл</span>
          </div>
          <div className="text-[10px] text-slate-500">
            {simulationResults.initialSagVoltage >= 3.4 ? 'Безопасный старт' : 'Риск сброса контроллера!'}
          </div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Нач. Сопротивление R</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {simulationResults.initialResistanceMilliOhms.toFixed(1)} <span className="text-xs text-slate-400">мОм</span>
          </div>
          <div className="text-[10px] text-slate-500">При T = {simulationResults.initialTempC}°C</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Макс. Температура</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className={`text-2xl font-black ${simulationResults.maxTempC <= 55 ? 'text-orange-400' : 'text-rose-400'}`}>
            {simulationResults.maxTempC.toFixed(1)} <span className="text-xs text-slate-400">°C</span>
          </div>
          <div className="text-[10px] text-slate-500">
            {simulationResults.maxTempC <= 55 ? 'Штатный нагрев' : 'Опасность перегрева!'}
          </div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Плотность Энергии</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {currentPreset.specificEnergyWhKg} <span className="text-xs text-slate-400">Вт·ч/кг</span>
          </div>
          <div className="text-[10px] text-slate-500">Масса {currentPreset.packMassGrams} г</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Статус Преднагрева</span>
            <Activity className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            {hasPreHeater ? `+${preHeaterTargetTempC}°C` : 'ВЫКЛ'}
          </div>
          <div className="text-[10px] text-slate-500">
            {hasPreHeater ? 'Подогрев активен' : 'Холодный пуск'}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Environmental & Pre-heating Settings */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Климатические & Тепловые Условия</span>
            </h3>

            {/* Ambient Temperature */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1">
                  <Snowflake className="w-3.5 h-3.5 text-sky-400" /> Температура Воздуха
                </span>
                <span className="text-sky-300 font-bold">{ambientTempC}°C</span>
              </div>
              <input
                type="range"
                min="-25"
                max="45"
                step="1"
                value={ambientTempC}
                onChange={(e) => setAmbientTempC(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>-25°C (Арктика)</span>
                <span>0°C</span>
                <span>+45°C (Пустыня)</span>
              </div>
            </div>

            {/* Discharge Current */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Средний Ток Разряда</span>
                <span className="text-amber-300 font-bold">{dischargeCurrentAmps} А</span>
              </div>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={dischargeCurrentAmps}
                onChange={(e) => setDischargeCurrentAmps(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <div className="text-[10px] text-slate-500 font-mono">
                C-Rate: {(dischargeCurrentAmps / (currentPreset.capacityMah / 1000)).toFixed(1)}C
              </div>
            </div>

            {/* Pre-heater Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div>
                <div className="text-xs font-bold text-slate-200">Предпусковой Подогрев АКБ</div>
                <div className="text-[10px] text-slate-400">Нагрев термоэлементом перед взлетом</div>
              </div>
              <button
                type="button"
                onClick={() => setHasPreHeater(!hasPreHeater)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  hasPreHeater ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform transform ${
                  hasPreHeater ? 'translate-x-7' : 'translate-x-1'
                } top-1 absolute`} />
              </button>
            </div>

            {hasPreHeater && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Температура Преднагрева</span>
                  <span className="text-emerald-300 font-bold">+{preHeaterTargetTempC}°C</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="35"
                  step="1"
                  value={preHeaterTargetTempC}
                  onChange={(e) => setPreHeaterTargetTempC(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
              </div>
            )}

            {/* Thermal Insulation */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Толщина Термочехла / Изоляции</span>
                <span className="text-indigo-300 font-bold">{thermalInsulationThicknessMm} мм</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={thermalInsulationThicknessMm}
                onChange={(e) => setThermalInsulationThicknessMm(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* Right Charts (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Discharge Voltage & Temp Curve */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-cyan-400" />
                <span>Кривая Разряда: Напряжение Ячейки V(t) & Температура T(t)</span>
              </h3>
              <FullscreenGraphButton
                domain="uav_guidance"
                title="Динамика разряда и саморазогрева АКБ БПЛА"
              />
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={simulationResults.timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="timeMin" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="volt" stroke="#06b6d4" domain={[2.8, 4.2]} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="temp" orientation="right" stroke="#f97316" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line yAxisId="volt" type="monotone" dataKey="cellVoltage" name="Напряжение (В/эл)" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  <Line yAxisId="temp" type="monotone" dataKey="temperatureC" name="Температура (°C)" stroke="#f97316" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-slate-400">
              При отрицательных температурах без предпускового подогрева внутреннее сопротивление R_int подскакивает в 4 раза, приводя к мгновенному падению напряжения ниже 3.2 В и ложному срабатыванию аварийной посадки (RTL/Land).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
