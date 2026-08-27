import React, { useState, useMemo, useEffect } from 'react';
import {
  Compass,
  Navigation,
  Wind,
  Activity,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Cpu,
  Layers,
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
  ReferenceLine,
} from 'recharts';

export interface FlightDynamicsProps {
  staticMargin_percent: number;
  liftToDragRatio: number;
  wingspan_m: number;
  cruiseSpeed_kmh: number;
  mtow_kg: number;
}

export const UAVFlightDynamicsSimulationPanel: React.FC<FlightDynamicsProps> = ({
  staticMargin_percent,
  liftToDragRatio,
  wingspan_m,
  cruiseSpeed_kmh,
  mtow_kg,
}) => {
  // Test Maneuver Selection
  const [maneuverType, setManeuverType] = useState<'pitch_step' | 'roll_bank_turn' | 'dryden_gust' | 'phugoid_oscillation'>('pitch_step');
  const [stepMagnitude, setStepMagnitude] = useState<number>(5.0); // degrees or m/s
  const [turbulenceIntensity, setTurbulenceIntensity] = useState<'light' | 'moderate' | 'severe'>('moderate');
  const [bankAngleDeg, setBankAngleDeg] = useState<number>(25);

  const speed_ms = cruiseSpeed_kmh / 3.6;

  // Eigenmodes analysis (Phugoid, Short Period, Dutch Roll)
  const dynamicModes = useMemo(() => {
    // Phugoid Mode (Траекторное длиннопериодическое колебание)
    const omega_ph = (Math.SQRT2 * 9.80665) / Math.max(5, speed_ms);
    const period_ph_s = (2 * Math.PI) / omega_ph;
    const damping_ph = 1 / (Math.SQRT2 * Math.max(2, liftToDragRatio)); // ~1/(sqrt(2)*K)

    // Short Period Mode (Короткопериодическое продольное колебание)
    const sm_ratio = Math.max(0.01, staticMargin_percent / 100);
    const omega_sp = Math.sqrt((sm_ratio * 45 * Math.pow(speed_ms, 2)) / (wingspan_m * 10));
    const damping_sp = 0.55 + sm_ratio * 0.8;
    const period_sp_s = (2 * Math.PI) / Math.max(0.5, omega_sp);

    // Dutch Roll Mode (Голландский шаг - боковое рыскание/крен)
    const omega_dr = (speed_ms / wingspan_m) * 0.9;
    const damping_dr = 0.18;

    // Coordinated Turn Parameters
    const phi_rad = (bankAngleDeg * Math.PI) / 180;
    const turnRadius_m = Math.pow(speed_ms, 2) / (9.80665 * Math.max(0.05, Math.tan(phi_rad)));
    const turnRate_deg_s = ((9.80665 * Math.tan(phi_rad)) / Math.max(1, speed_ms)) * (180 / Math.PI);
    const turnLoadFactor_g = 1 / Math.max(0.1, Math.cos(phi_rad));

    return {
      omega_ph,
      period_ph_s,
      damping_ph,
      omega_sp,
      damping_sp,
      period_sp_s,
      omega_dr,
      damping_dr,
      turnRadius_m,
      turnRate_deg_s,
      turnLoadFactor_g,
    };
  }, [staticMargin_percent, liftToDragRatio, wingspan_m, speed_ms, bankAngleDeg]);

  // Simulation Time Series Data Generation
  const timeSeriesData = useMemo(() => {
    const data: Array<{
      time_s: number;
      response_deg: number;
      target_deg: number;
      pitchRate_deg_s: number;
      gForce_g: number;
    }> = [];

    const totalTime_s = maneuverType === 'phugoid_oscillation' ? 40 : 12;
    const dt = 0.1;

    for (let t = 0; t <= totalTime_s; t += dt) {
      let resp = 0;
      let target = 0;
      let rate = 0;
      let g = 1.0;

      if (maneuverType === 'pitch_step') {
        target = t >= 1.0 ? stepMagnitude : 0;
        if (t < 1.0) {
          resp = 0;
          rate = 0;
        } else {
          const tau = t - 1.0;
          const wn = dynamicModes.omega_sp;
          const zeta = dynamicModes.damping_sp;
          const wd = wn * Math.sqrt(Math.max(0.01, 1 - zeta * zeta));
          // standard 2nd order underdamped step response
          const stepResp = 1 - Math.exp(-zeta * wn * tau) * (Math.cos(wd * tau) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(wd * tau));
          resp = stepMagnitude * stepResp;
          rate = (resp - (stepMagnitude * (1 - Math.exp(-zeta * wn * Math.max(0, tau - dt)) * (Math.cos(wd * Math.max(0, tau - dt)))))) / dt;
          g = 1.0 + (resp / 10) * 0.4;
        }
      } else if (maneuverType === 'roll_bank_turn') {
        target = t >= 1.0 ? bankAngleDeg : 0;
        if (t < 1.0) {
          resp = 0;
        } else {
          const tau = t - 1.0;
          // Roll response has a time constant tau_roll ~ 0.3s
          resp = bankAngleDeg * (1 - Math.exp(-tau / 0.35));
          g = 1.0 + (dynamicModes.turnLoadFactor_g - 1.0) * (resp / Math.max(1, bankAngleDeg));
        }
      } else if (maneuverType === 'dryden_gust') {
        target = 0;
        // Dryden continuous gust simulation with filtered random noise
        const turbSigma = turbulenceIntensity === 'light' ? 1.0 : turbulenceIntensity === 'moderate' ? 2.5 : 4.5;
        const gust_w = turbSigma * (Math.sin(1.8 * t) * 0.6 + Math.sin(3.5 * t) * 0.3 + Math.cos(5.2 * t) * 0.1);
        resp = (gust_w / speed_ms) * (180 / Math.PI) * (dynamicModes.damping_sp > 0.5 ? 0.7 : 1.2);
        rate = gust_w * 2.2;
        g = 1.0 + (gust_w / 9.80665) * 1.5;
      } else if (maneuverType === 'phugoid_oscillation') {
        target = 0;
        // Phugoid mode oscillation triggered by a 2m/s gust
        const wn = dynamicModes.omega_ph;
        const zeta = dynamicModes.damping_ph;
        const envelope = Math.exp(-zeta * wn * t);
        resp = 6.0 * envelope * Math.cos(wn * t);
        g = 1.0 + (resp / 8.0) * 0.25;
      }

      data.push({
        time_s: Number(t.toFixed(1)),
        response_deg: Number(resp.toFixed(2)),
        target_deg: Number(target.toFixed(2)),
        pitchRate_deg_s: Number(rate.toFixed(2)),
        gForce_g: Number(g.toFixed(2)),
      });
    }

    return data;
  }, [maneuverType, stepMagnitude, turbulenceIntensity, bankAngleDeg, dynamicModes, speed_ms]);

  return (
    <div id="uav-flight-dynamics-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              6-DoF Динамика Полета, Устойчивость & Моделирование Ветровых Порывов (Dryden)
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                MIL-F-8785C / 6-DoF
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Собственные моды колебаний (Short Period & Phugoid), координированный вираж, демпфирование и реакция автопилота
            </p>
          </div>
        </div>

        {/* Maneuver Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          {(
            [
              { id: 'pitch_step', label: 'Ступень по Тангажу (Step Δα)' },
              { id: 'roll_bank_turn', label: 'Координированный Вираж' },
              { id: 'dryden_gust', label: 'Турбулентность Dryden' },
              { id: 'phugoid_oscillation', label: 'Фугоида (Phugoid)' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setManeuverType(m.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                maneuverType === m.id
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Grid: Chart + Stability Spectrum */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Step Response / Turbulence Chart */}
        <div className="lg:col-span-8 bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span className="font-semibold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              Переходной процесс: Реакция планера во времени t (с)
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">
              Демпфирование ζ_sp = {dynamicModes.damping_sp.toFixed(2)} ({dynamicModes.damping_sp >= 0.5 ? 'Устойчив' : 'Слабо демпфирован'})
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="time_s" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} unit=" с" />
                <YAxis yAxisId="deg" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} unit="°" />
                <YAxis yAxisId="g" orientation="right" stroke="#f43f5e" tick={{ fontSize: 10, fill: '#f43f5e' }} unit=" g" domain={[0.5, 2.5]} />
                <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', fontSize: '10px', borderRadius: '8px' }} />
                <ReferenceLine yAxisId="deg" y={0} stroke="#475569" />

                {maneuverType !== 'phugoid_oscillation' && maneuverType !== 'dryden_gust' && (
                  <Line yAxisId="deg" type="stepAfter" dataKey="target_deg" stroke="#94a3b8" strokeDasharray="4 2" dot={false} name="Заданное значение (°)" />
                )}
                <Line yAxisId="deg" type="monotone" dataKey="response_deg" stroke="#38bdf8" strokeWidth={2.5} dot={false} name="Угол планера (°)" />
                <Line yAxisId="g" type="monotone" dataKey="gForce_g" stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="2 2" dot={false} name="Перегрузка n (g)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Maneuver Controls & Eigenmodes Box */}
        <div className="lg:col-span-4 space-y-3 flex flex-col justify-between">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-2.5">
            <span className="text-xs font-semibold text-slate-200 block border-b border-slate-800 pb-1.5">
              Настройки Моделирования 6-DoF
            </span>

            {maneuverType === 'pitch_step' && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Ступень руля высоты Δδ_e:</span>
                  <span className="text-indigo-400 font-bold">{stepMagnitude}°</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={stepMagnitude}
                  onChange={(e) => setStepMagnitude(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            )}

            {maneuverType === 'roll_bank_turn' && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Угол крена на вираже φ:</span>
                  <span className="text-indigo-400 font-bold">{bankAngleDeg}°</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={60}
                  value={bankAngleDeg}
                  onChange={(e) => setBankAngleDeg(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            )}

            {maneuverType === 'dryden_gust' && (
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">Интенсивность ветра (Dryden):</label>
                <div className="grid grid-cols-3 gap-1 pt-1">
                  {(['light', 'moderate', 'severe'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setTurbulenceIntensity(level)}
                      className={`py-1 text-[10px] rounded border ${
                        turbulenceIntensity === level
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {level === 'light' ? 'Слабая' : level === 'moderate' ? 'Умеренная' : 'Шторм'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Stability Criteria (MIL-F-8785C) */}
            <div className="p-2 rounded-lg bg-indigo-950/30 border border-indigo-500/30 space-y-1.5 text-xs">
              <div className="flex justify-between text-[10px] text-indigo-200 font-mono">
                <span>Короткопериодическое:</span>
                <span className="text-emerald-400 font-bold">
                  T_sp = {dynamicModes.period_sp_s.toFixed(2)} с (ζ = {dynamicModes.damping_sp.toFixed(2)})
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-indigo-200 font-mono">
                <span>Длиннопериодическое (Phugoid):</span>
                <span className="text-sky-400 font-bold">
                  T_ph = {dynamicModes.period_ph_s.toFixed(1)} с (ζ = {dynamicModes.damping_ph.toFixed(3)})
                </span>
              </div>
              {maneuverType === 'roll_bank_turn' && (
                <div className="border-t border-indigo-500/20 pt-1 flex justify-between text-[10px] text-amber-300 font-mono">
                  <span>Радиус виража R:</span>
                  <span className="font-bold">{dynamicModes.turnRadius_m.toFixed(0)} м @ {dynamicModes.turnRate_deg_s.toFixed(1)}°/с</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Turn & Maneuver Stats */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="text-[9px] text-slate-500 block">Радиус R</span>
              <span className="font-mono text-indigo-400 text-[11px] font-bold">{dynamicModes.turnRadius_m.toFixed(0)}</span>
              <span className="text-[8px] text-slate-600 block">м</span>
            </div>
            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="text-[9px] text-slate-500 block">Скорость виража</span>
              <span className="font-mono text-emerald-400 text-[11px] font-bold">{dynamicModes.turnRate_deg_s.toFixed(1)}</span>
              <span className="text-[8px] text-slate-600 block">°/с</span>
            </div>
            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="text-[9px] text-slate-500 block">Перегрузка n</span>
              <span className="font-mono text-amber-400 text-[11px] font-bold">+{dynamicModes.turnLoadFactor_g.toFixed(2)}</span>
              <span className="text-[8px] text-slate-600 block">g</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
