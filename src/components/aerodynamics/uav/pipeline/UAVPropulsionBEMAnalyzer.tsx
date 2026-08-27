import React, { useState, useMemo } from 'react';
import {
  Flame,
  Zap,
  Gauge,
  Thermometer,
  BatteryCharging,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  RotateCw,
  Wind,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';

export interface PropulsionBEMProps {
  batteryCap_mAh: number;
  batteryS_count: number;
  motorKv: number;
  propDiameter_in: number;
  propPitch_in: number;
  cruiseSpeed_kmh: number;
  cruiseThrustReq_N: number;
  mtow_kg: number;
}

export const UAVPropulsionBEMAnalyzer: React.FC<PropulsionBEMProps> = ({
  batteryCap_mAh,
  batteryS_count,
  motorKv,
  propDiameter_in,
  propPitch_in,
  cruiseSpeed_kmh,
  cruiseThrustReq_N,
  mtow_kg,
}) => {
  // Operating Flight Phase State
  const [selectedPhase, setSelectedPhase] = useState<'cruise' | 'climb' | 'sprint' | 'hover'>('cruise');
  const [ambientTempC, setAmbientTempC] = useState<number>(25);
  const [batteryType, setBatteryType] = useState<'lipo_highc' | 'li_ion_21700'>('li_ion_21700');
  const [throttlePercent, setThrottlePercent] = useState<number>(65);

  // Derived dimensions in SI
  const propDiameter_m = (propDiameter_in * 2.54) / 100;
  const propPitch_m = (propPitch_in * 2.54) / 100;
  const pitchToDia = propPitch_in / Math.max(1, propDiameter_in);
  const nominalVoltage = batteryS_count * (batteryType === 'li_ion_21700' ? 3.6 : 3.7);

  // Motor internal parameters
  const motorInternalR = useMemo(() => {
    // typical motor resistance depends inversely on Kv & size
    return 0.035 + (200 / Math.max(100, motorKv)) * 0.02;
  }, [motorKv]);

  // Propeller BEM Advance Ratio (J) Curve Data
  const bemPropellerData = useMemo(() => {
    const data: Array<{
      advanceRatio_J: number;
      thrustCoeff_Ct: number;
      powerCoeff_Cp: number;
      efficiency_eta: number;
    }> = [];

    const J_max = pitchToDia * 1.25;
    const Ct0 = 0.12 * pitchToDia;
    const Cp0 = 0.05 * Math.pow(pitchToDia, 1.4);

    for (let J = 0; J <= J_max * 1.15; J += 0.03) {
      const ct = Math.max(0, Ct0 * (1 - Math.pow(J / J_max, 1.8)));
      const cp = Cp0 + 0.04 * Math.pow(J, 1.6);
      const eta = cp > 0.001 ? Math.min(0.88, Math.max(0, (J * ct) / cp)) : 0;

      data.push({
        advanceRatio_J: Number(J.toFixed(2)),
        thrustCoeff_Ct: Number(ct.toFixed(4)),
        powerCoeff_Cp: Number(cp.toFixed(4)),
        efficiency_eta: Number((eta * 100).toFixed(1)),
      });
    }

    return data;
  }, [pitchToDia]);

  // Dynamic Phase Conditions
  const phaseMetrics = useMemo(() => {
    let speed_kmh = cruiseSpeed_kmh;
    let throttle = throttlePercent;

    if (selectedPhase === 'climb') {
      speed_kmh = cruiseSpeed_kmh * 0.85;
      throttle = 90;
    } else if (selectedPhase === 'sprint') {
      speed_kmh = cruiseSpeed_kmh * 1.4;
      throttle = 100;
    } else if (selectedPhase === 'hover') {
      speed_kmh = 0;
      throttle = 75;
    }

    const speed_ms = speed_kmh / 3.6;
    const effectiveVoltage = nominalVoltage * (throttle / 100);
    const rpm = motorKv * effectiveVoltage * 0.82; // loaded RPM
    const n_rev_s = rpm / 60;

    const J = n_rev_s > 0 ? speed_ms / (n_rev_s * propDiameter_m) : 0;
    const J_max = pitchToDia * 1.25;
    const Ct0 = 0.12 * pitchToDia;
    const Cp0 = 0.05 * Math.pow(pitchToDia, 1.4);

    const Ct = Math.max(0, Ct0 * (1 - Math.pow(Math.min(J, J_max) / J_max, 1.8)));
    const Cp = Cp0 + 0.04 * Math.pow(J, 1.6);
    const propEta = Cp > 0.001 ? Math.min(0.88, Math.max(0.1, (J * Ct) / Cp)) : 0.4;

    const rho = 1.225;
    const thrust_N = Ct * rho * Math.pow(n_rev_s, 2) * Math.pow(propDiameter_m, 4);
    const mechPower_W = Cp * rho * Math.pow(n_rev_s, 3) * Math.pow(propDiameter_m, 5);

    const motorEta = 0.84;
    const escEta = 0.96;
    const elecPower_W = mechPower_W / (motorEta * escEta);
    const current_A = elecPower_W / Math.max(1, effectiveVoltage);

    // Thermal dissipation calculation
    const jouleLoss_W = Math.pow(current_A, 2) * motorInternalR + 0.04 * elecPower_W;
    const motorArea_m2 = Math.PI * 0.045 * 0.05; // ~45mm diameter x 50mm length motor
    const convCooling_h = 10.45 - speed_ms + 10 * Math.sqrt(Math.max(1, speed_ms));
    const deltaT_ss = jouleLoss_W / (convCooling_h * motorArea_m2 * 25);
    const steadyTemp_C = ambientTempC + deltaT_ss;

    // Battery cell internal resistance
    const cellR_mOhm = batteryType === 'li_ion_21700' ? 14 : 3.5;
    const packR_Ohm = (cellR_mOhm * batteryS_count) / 1000;
    const voltageSag_V = current_A * packR_Ohm;
    const terminalVoltage = nominalVoltage - voltageSag_V;

    // Battery discharge time in hours at this current
    const cRate = (current_A * 1000) / batteryCap_mAh;
    const dischargeTime_min = cRate > 0 ? (60 / cRate) * 0.9 : 0; // 90% usable DoD

    return {
      speed_kmh,
      rpm,
      J,
      thrust_N,
      mechPower_W,
      elecPower_W,
      current_A,
      cRate,
      propEta: propEta * 100,
      steadyTemp_C,
      jouleLoss_W,
      voltageSag_V,
      terminalVoltage,
      dischargeTime_min,
    };
  }, [
    selectedPhase,
    throttlePercent,
    cruiseSpeed_kmh,
    nominalVoltage,
    motorKv,
    propDiameter_m,
    pitchToDia,
    motorInternalR,
    ambientTempC,
    batteryType,
    batteryS_count,
    batteryCap_mAh,
  ]);

  // Transient Thermal Buildup Data (0 to 20 minutes of flight)
  const transientThermalData = useMemo(() => {
    const data: Array<{
      time_min: number;
      motorTemp_C: number;
      escTemp_C: number;
      battVoltage_V: number;
    }> = [];

    const tau_motor = 4.5; // thermal time constant in minutes
    const tau_esc = 2.8;

    for (let t = 0; t <= 20; t += 1) {
      const tMotor =
        ambientTempC + (phaseMetrics.steadyTemp_C - ambientTempC) * (1 - Math.exp(-t / tau_motor));
      const tEsc =
        ambientTempC + (phaseMetrics.steadyTemp_C * 0.75 - ambientTempC) * (1 - Math.exp(-t / tau_esc));

      // Battery voltage degradation over time
      const dod = Math.min(1.0, (t / Math.max(1, phaseMetrics.dischargeTime_min)));
      const ocv = batteryS_count * (4.15 - 0.9 * Math.pow(dod, 1.2));
      const vBatt = Math.max(batteryS_count * 3.0, ocv - phaseMetrics.voltageSag_V);

      data.push({
        time_min: t,
        motorTemp_C: Number(tMotor.toFixed(1)),
        escTemp_C: Number(tEsc.toFixed(1)),
        battVoltage_V: Number(vBatt.toFixed(2)),
      });
    }

    return data;
  }, [ambientTempC, phaseMetrics, batteryS_count]);

  return (
    <div id="uav-propulsion-bem-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Анализ ВМГ: Дисковая BEM-Теория, КПД & Тепловой Баланс
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-mono">
                BEM / Electro-Thermal
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Поляра винта $C_T(J)$, $\eta_p(J)$, токовая нагрузка ESC, нагрев статора двигателя и просадка напряжения АКБ
            </p>
          </div>
        </div>

        {/* Phase selector tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          {(['cruise', 'climb', 'sprint', 'hover'] as const).map((phase) => (
            <button
              key={phase}
              onClick={() => setSelectedPhase(phase)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                selectedPhase === phase
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {phase === 'cruise' && 'Крейсерский'}
              {phase === 'climb' && 'Набор высоты'}
              {phase === 'sprint' && 'Спринт (100%)'}
              {phase === 'hover' && 'Висение (VTOL)'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: BEM Chart + Thermal Chart + Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* BEM Propeller Curves */}
        <div className="lg:col-span-6 bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span className="font-semibold flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5 text-sky-400" />
              Аэродинамическая карта винта $J = V/(nD)$
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">
              Текущий $\eta_p = {phaseMetrics.propEta.toFixed(1)}\%$ @ $J={phaseMetrics.J.toFixed(2)}$
            </span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={bemPropellerData} margin={{ top: 5, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="advanceRatio_J" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} unit=" J" />
                <YAxis yAxisId="left" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 0.2]} />
                <YAxis yAxisId="right" orientation="right" stroke="#34d399" tick={{ fontSize: 10, fill: '#34d399' }} unit="%" domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', fontSize: '10px', borderRadius: '8px' }} />
                <Line yAxisId="left" type="monotone" dataKey="thrustCoeff_Ct" stroke="#38bdf8" strokeWidth={2} dot={false} name="Коэф. тяги C_T" />
                <Line yAxisId="left" type="monotone" dataKey="powerCoeff_Cp" stroke="#f59e0b" strokeWidth={2} dot={false} name="Коэф. мощности C_P" />
                <Line yAxisId="right" type="monotone" dataKey="efficiency_eta" stroke="#34d399" strokeWidth={2.5} dot={false} name="КПД винта η_p (%)" />
                <ReferenceLine yAxisId="left" x={phaseMetrics.J} stroke="#f43f5e" strokeDasharray="3 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Transient Thermal & Battery Sag Chart */}
        <div className="lg:col-span-6 bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span className="font-semibold flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-rose-400" />
              Тепловой нагрев мотора & разряд АКБ (20 мин)
            </span>
            <span className={`text-[10px] font-mono font-bold ${phaseMetrics.steadyTemp_C > 85 ? 'text-rose-400' : 'text-amber-400'}`}>
              T_уст = {phaseMetrics.steadyTemp_C.toFixed(0)}°C
            </span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={transientThermalData} margin={{ top: 5, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="time_min" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} unit=" мин" />
                <YAxis yAxisId="temp" stroke="#f43f5e" tick={{ fontSize: 10, fill: '#f43f5e' }} unit="°C" domain={[20, 110]} />
                <YAxis yAxisId="volt" orientation="right" stroke="#38bdf8" tick={{ fontSize: 10, fill: '#38bdf8' }} unit=" В" domain={[batteryS_count * 2.9, batteryS_count * 4.3]} />
                <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', fontSize: '10px', borderRadius: '8px' }} />
                <ReferenceLine yAxisId="temp" y={85} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Предел T_max 85°C', fill: '#ef4444', fontSize: 9 }} />
                <Line yAxisId="temp" type="monotone" dataKey="motorTemp_C" stroke="#f43f5e" strokeWidth={2.5} dot={false} name="Темп. Мотора (°C)" />
                <Line yAxisId="temp" type="monotone" dataKey="escTemp_C" stroke="#fbbf24" strokeWidth={1.5} dot={false} name="Темп. ESC (°C)" />
                <Line yAxisId="volt" type="monotone" dataKey="battVoltage_V" stroke="#38bdf8" strokeWidth={2} dot={false} name="Напряжение АКБ (В)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Engineering Stats & Operational Margins */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
          <span className="text-[10px] text-slate-500 block">Развиваемая тяга</span>
          <span className="font-mono text-sm font-bold text-sky-400">{phaseMetrics.thrust_N.toFixed(2)} Н</span>
          <span className="text-[9px] text-slate-600 block">({(phaseMetrics.thrust_N / 9.80665).toFixed(2)} кгс)</span>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
          <span className="text-[10px] text-slate-500 block">Эл. Мощность (P_in)</span>
          <span className="font-mono text-sm font-bold text-orange-400">{phaseMetrics.elecPower_W.toFixed(0)} Вт</span>
          <span className="text-[9px] text-slate-600 block">({phaseMetrics.current_A.toFixed(1)} А)</span>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
          <span className="text-[10px] text-slate-500 block">Токоотдача (C-Rate)</span>
          <span className={`font-mono text-sm font-bold ${phaseMetrics.cRate > 15 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {phaseMetrics.cRate.toFixed(2)} C
          </span>
          <span className="text-[9px] text-slate-600 block">макс 25C</span>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
          <span className="text-[10px] text-slate-500 block">Просадка ΔV_sag</span>
          <span className="font-mono text-sm font-bold text-amber-400">-{phaseMetrics.voltageSag_V.toFixed(2)} В</span>
          <span className="text-[9px] text-slate-600 block">(V_term = {phaseMetrics.terminalVoltage.toFixed(1)} В)</span>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
          <span className="text-[10px] text-slate-500 block">Обороты мотора</span>
          <span className="font-mono text-sm font-bold text-purple-400">{phaseMetrics.rpm.toFixed(0)}</span>
          <span className="text-[9px] text-slate-600 block">RPM</span>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
          <span className="text-[10px] text-slate-500 block">Время в режиме</span>
          <span className="font-mono text-sm font-bold text-emerald-400">{phaseMetrics.dischargeTime_min.toFixed(0)} мин</span>
          <span className="text-[9px] text-slate-600 block">до 10% DoD</span>
        </div>
      </div>
    </div>
  );
};
