import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Zap,
  Activity,
  Gauge,
  Info,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ReferenceLine,
} from 'recharts';

export interface FlightEnvelopeProps {
  mtow_kg: number;
  wingArea_m2: number;
  wingspan_m: number;
  cl_max: number;
  cl_min_inverted?: number;
  cruiseSpeed_kmh: number;
  limitGPositive?: number;
  limitGNegative?: number;
}

export const UAVFlightEnvelopeDiagram: React.FC<FlightEnvelopeProps> = ({
  mtow_kg,
  wingArea_m2,
  wingspan_m,
  cl_max,
  cl_min_inverted = -0.85,
  cruiseSpeed_kmh,
  limitGPositive = 4.0,
  limitGNegative = -2.0,
}) => {
  // Test Flight Point State
  const [testSpeedKmh, setTestSpeedKmh] = useState<number>(cruiseSpeed_kmh);
  const [testGForce, setTestGForce] = useState<number>(1.0);
  const [gustVelocityMs, setGustVelocityMs] = useState<number>(15); // standard FAR/STANAG 15 m/s gust
  const [altitudeM, setAltitudeM] = useState<number>(500);

  // Air density by altitude (ISA standard)
  const rho = useMemo(() => {
    const T0 = 288.15;
    const L = 0.0065;
    const p0 = 101325;
    const T = T0 - L * altitudeM;
    const p = p0 * Math.pow(1 - (L * altitudeM) / T0, 5.2561);
    return p / (287.05 * T);
  }, [altitudeM]);

  // Speeds and Load Factors Calculation
  const envelopeMetrics = useMemo(() => {
    const W_N = mtow_kg * 9.80665;
    const wingLoading_Npm2 = W_N / Math.max(0.05, wingArea_m2);
    const meanChord = wingArea_m2 / Math.max(0.1, wingspan_m);

    // 1G stall speed (m/s & km/h)
    const v_s1_ms = Math.sqrt((2 * wingLoading_Npm2) / (rho * cl_max));
    const v_s1_kmh = v_s1_ms * 3.6;

    // Corner / Maneuvering speed Va (speed where max aerodynamic lift equals limit load factor)
    const v_a_ms = v_s1_ms * Math.sqrt(limitGPositive);
    const v_a_kmh = v_a_ms * 3.6;

    // Design cruise speed Vc
    const v_c_kmh = Math.max(v_a_kmh * 1.1, cruiseSpeed_kmh);
    const v_c_ms = v_c_kmh / 3.6;

    // Design dive speed Vd
    const v_d_kmh = v_c_kmh * 1.25;
    const v_d_ms = v_d_kmh / 3.6;

    // Flutter boundary speed Vf
    const v_flutter_kmh = v_d_kmh * 1.20;

    // Inverted 1G stall speed
    const v_s_inv_ms = Math.sqrt((2 * wingLoading_Npm2) / (rho * Math.abs(cl_min_inverted)));
    const v_s_inv_kmh = v_s_inv_ms * 3.6;

    // Inverted corner speed
    const v_a_inv_ms = v_s_inv_ms * Math.sqrt(Math.abs(limitGNegative));
    const v_a_inv_kmh = v_a_inv_ms * 3.6;

    // Gust factor calculation (Pratt method)
    const cl_alpha = (2 * Math.PI) / (1 + (2 * Math.PI) / (Math.PI * (Math.pow(wingspan_m, 2) / wingArea_m2) * 0.9));
    const massRatio_mu_g = (2 * wingLoading_Npm2) / (rho * meanChord * cl_alpha * 9.80665);
    const gustAlleviationFactor_Kg = (0.88 * massRatio_mu_g) / (5.3 + massRatio_mu_g);

    // Ultimate load factors (safety factor 1.5)
    const ultGPositive = limitGPositive * 1.5;
    const ultGNegative = limitGNegative * 1.5;

    // Dynamic Pressure at Vd
    const q_max_Pa = 0.5 * rho * Math.pow(v_d_ms, 2);

    return {
      v_s1_kmh,
      v_a_kmh,
      v_c_kmh,
      v_d_kmh,
      v_flutter_kmh,
      v_s_inv_kmh,
      v_a_inv_kmh,
      wingLoading_Npm2,
      ultGPositive,
      ultGNegative,
      cl_alpha,
      gustAlleviationFactor_Kg,
      q_max_Pa,
    };
  }, [mtow_kg, wingArea_m2, wingspan_m, cl_max, cl_min_inverted, cruiseSpeed_kmh, limitGPositive, limitGNegative, rho]);

  // Generate V-n Curve Data for Recharts
  const vnCurveData = useMemo(() => {
    const data: Array<{
      speed_kmh: number;
      posAeroStall: number | null;
      posLimitG: number | null;
      posUltG: number | null;
      negAeroStall: number | null;
      negLimitG: number | null;
      negUltG: number | null;
      gustPositive: number | null;
      gustNegative: number | null;
    }> = [];

    const maxSpeed = Math.round(envelopeMetrics.v_flutter_kmh * 1.08);
    const step = 4;

    const W_N = mtow_kg * 9.80665;
    const S = wingArea_m2;

    for (let v_kmh = 0; v_kmh <= maxSpeed; v_kmh += step) {
      const v_ms = v_kmh / 3.6;
      const q = 0.5 * rho * Math.pow(v_ms, 2);

      // Max possible aerodynamic G
      const n_pos_aero = (q * S * cl_max) / W_N;
      const n_neg_aero = -(q * S * Math.abs(cl_min_inverted)) / W_N;

      // Positive envelope boundary
      let posLimit: number | null = null;
      let posAero: number | null = null;
      let posUlt: number | null = null;

      if (v_kmh <= envelopeMetrics.v_a_kmh) {
        posAero = Math.min(envelopeMetrics.ultGPositive, n_pos_aero);
      } else if (v_kmh <= envelopeMetrics.v_d_kmh) {
        posLimit = limitGPositive;
        posUlt = envelopeMetrics.ultGPositive;
      }

      // Negative envelope boundary
      let negLimit: number | null = null;
      let negAero: number | null = null;
      let negUlt: number | null = null;

      if (v_kmh <= envelopeMetrics.v_a_inv_kmh) {
        negAero = Math.max(envelopeMetrics.ultGNegative, n_neg_aero);
      } else if (v_kmh <= envelopeMetrics.v_d_kmh) {
        negLimit = limitGNegative;
        negUlt = envelopeMetrics.ultGNegative;
      }

      // Gust Load Lines (STANAG 4703 / FAR-23 gust line)
      // Delta n = (Kg * rho * U_de * V * a) / (2 * W/S)
      const delta_n_gust =
        (envelopeMetrics.gustAlleviationFactor_Kg *
          rho *
          gustVelocityMs *
          v_ms *
          envelopeMetrics.cl_alpha) /
        (2 * envelopeMetrics.wingLoading_Npm2);

      const gustPos = 1.0 + delta_n_gust;
      const gustNeg = 1.0 - delta_n_gust;

      data.push({
        speed_kmh: v_kmh,
        posAeroStall: v_kmh <= envelopeMetrics.v_a_kmh ? Number(n_pos_aero.toFixed(2)) : null,
        posLimitG: v_kmh >= envelopeMetrics.v_a_kmh && v_kmh <= envelopeMetrics.v_d_kmh ? limitGPositive : null,
        posUltG: v_kmh >= envelopeMetrics.v_a_kmh && v_kmh <= envelopeMetrics.v_d_kmh ? envelopeMetrics.ultGPositive : null,
        negAeroStall: v_kmh <= envelopeMetrics.v_a_inv_kmh ? Number(n_neg_aero.toFixed(2)) : null,
        negLimitG: v_kmh >= envelopeMetrics.v_a_inv_kmh && v_kmh <= envelopeMetrics.v_d_kmh ? limitGNegative : null,
        negUltG: v_kmh >= envelopeMetrics.v_a_inv_kmh && v_kmh <= envelopeMetrics.v_d_kmh ? envelopeMetrics.ultGNegative : null,
        gustPositive: v_kmh <= envelopeMetrics.v_d_kmh ? Number(gustPos.toFixed(2)) : null,
        gustNegative: v_kmh <= envelopeMetrics.v_d_kmh ? Number(gustNeg.toFixed(2)) : null,
      });
    }

    return data;
  }, [envelopeMetrics, mtow_kg, wingArea_m2, cl_max, cl_min_inverted, limitGPositive, limitGNegative, rho, gustVelocityMs]);

  // Current Flight Point Structural Evaluation
  const flightPointStatus = useMemo(() => {
    const v_ms = testSpeedKmh / 3.6;
    const q = 0.5 * rho * Math.pow(v_ms, 2);
    const maxAeroG = (q * wingArea_m2 * cl_max) / (mtow_kg * 9.80665);
    const minAeroG = -(q * wingArea_m2 * Math.abs(cl_min_inverted)) / (mtow_kg * 9.80665);

    if (testSpeedKmh > envelopeMetrics.v_flutter_kmh) {
      return {
        level: 'critical',
        label: 'Катастрофический Флаттер',
        desc: `Скорость ${testSpeedKmh} км/ч превышает критическую скорость дивергенции/флаттера ${envelopeMetrics.v_flutter_kmh.toFixed(0)} км/ч! Разрушение консолей крыла.`,
        color: 'text-rose-400',
        bg: 'bg-rose-950/40 border-rose-500/50',
      };
    }

    if (testSpeedKmh > envelopeMetrics.v_d_kmh) {
      return {
        level: 'danger',
        label: 'Превышение V_D (Dive Speed)',
        desc: `Скоростной напор q=${q.toFixed(0)} Па превышает расчетный предел прочности обшивки и рулевых поверхностей.`,
        color: 'text-amber-400',
        bg: 'bg-amber-950/40 border-amber-500/50',
      };
    }

    if (testGForce > maxAeroG) {
      return {
        level: 'warning',
        label: 'Аэродинамический срыв (Stall)',
        desc: `Для создания перегрузки +${testGForce.toFixed(1)}g требуется угол атаки α > α_крит. Крыло сваливается в штопор.`,
        color: 'text-sky-400',
        bg: 'bg-sky-950/40 border-sky-500/50',
      };
    }

    if (testGForce < minAeroG) {
      return {
        level: 'warning',
        label: 'Отрицательный срыв (Inverted Stall)',
        desc: `Превышен отрицательный C_L_min. Срыв потока с нижней поверхности.`,
        color: 'text-sky-400',
        bg: 'bg-sky-950/40 border-sky-500/50',
      };
    }

    if (testGForce > envelopeMetrics.ultGPositive || testGForce < envelopeMetrics.ultGNegative) {
      return {
        level: 'critical',
        label: 'Разрушение конструкции (Ultimate Load)',
        desc: `Перегрузка ${testGForce.toFixed(1)}g превышает расчетный предел разрушения лонжерона ${envelopeMetrics.ultGPositive.toFixed(1)}g. Разлом центроплана.`,
        color: 'text-rose-400',
        bg: 'bg-rose-950/40 border-rose-500/50',
      };
    }

    if (testGForce > limitGPositive || testGForce < limitGNegative) {
      return {
        level: 'danger',
        label: 'Остаточная деформация (Limit Exceeded)',
        desc: `Превышена эксплуатационная перегрузка ${limitGPositive.toFixed(1)}g. Риск остаточной пластической деформации лонжерона.`,
        color: 'text-amber-400',
        bg: 'bg-amber-950/40 border-amber-500/50',
      };
    }

    return {
      level: 'safe',
      label: 'Штатный эксплуатационный режим',
      desc: `Точка находится внутри конверта летной годности (FAR 23 / STANAG 4703). Конструкция работает в упругой зоне.`,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/40 border-emerald-500/50',
    };
  }, [testSpeedKmh, testGForce, rho, wingArea_m2, cl_max, cl_min_inverted, mtow_kg, envelopeMetrics, limitGPositive, limitGNegative]);

  return (
    <div id="uav-flight-envelope-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Диаграмма Летных Ограничений V-n (Маневр & Порывы)
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                STANAG 4703 / АП-23
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Границы прочности конструкции, срыва потока, маневренной скорости $V_A$, пикирования $V_D$ и флаттера $V_F$
            </p>
          </div>
        </div>

        {/* Altitude & Gust selector */}
        <div className="flex items-center gap-2 text-xs">
          <div className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5 text-slate-300 font-mono">
            <span className="text-slate-500 text-[10px]">H:</span>
            <span>{altitudeM} м</span>
            <span className="text-slate-500 text-[10px]">({rho.toFixed(3)} кг/м³)</span>
          </div>
          <div className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5 text-slate-300 font-mono">
            <span className="text-slate-500 text-[10px]">Порыв U_de:</span>
            <span className="text-amber-400">±{gustVelocityMs} м/с</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Chart + Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* V-n Chart */}
        <div className="lg:col-span-8 bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 px-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-0.5 bg-emerald-400 inline-block"></span> Эксплуатационный предел n_lim
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2.5 h-0.5 bg-rose-400 inline-block border-dashed"></span> Разрушающий n_ult (1.5x)
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2.5 h-0.5 bg-amber-400 inline-block"></span> Порыв U_de
              </span>
            </div>
            <span className="font-mono text-slate-500 text-[10px]">
              q_max = {envelopeMetrics.q_max_Pa.toFixed(0)} Па
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={vnCurveData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis
                  dataKey="speed_kmh"
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  unit=" км/ч"
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  domain={[envelopeMetrics.ultGNegative - 0.5, envelopeMetrics.ultGPositive + 0.5]}
                  unit=" g"
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', fontSize: '11px', borderRadius: '8px' }}
                  formatter={(value: any, name: string) => [`${value} g`, name]}
                  labelFormatter={(label) => `Приборная скорость V_IAS: ${label} км/ч`}
                />
                <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
                <ReferenceLine y={1} stroke="#38bdf8" strokeDasharray="3 3" opacity={0.5} />
                <ReferenceLine x={envelopeMetrics.v_s1_kmh} stroke="#94a3b8" strokeDasharray="2 2" label={{ value: `Vs1 (${envelopeMetrics.v_s1_kmh.toFixed(0)})`, fill: '#94a3b8', fontSize: 9 }} />
                <ReferenceLine x={envelopeMetrics.v_a_kmh} stroke="#38bdf8" strokeDasharray="2 2" label={{ value: `Va (${envelopeMetrics.v_a_kmh.toFixed(0)})`, fill: '#38bdf8', fontSize: 9 }} />
                <ReferenceLine x={envelopeMetrics.v_c_kmh} stroke="#34d399" strokeDasharray="2 2" label={{ value: `Vc (${envelopeMetrics.v_c_kmh.toFixed(0)})`, fill: '#34d399', fontSize: 9 }} />
                <ReferenceLine x={envelopeMetrics.v_d_kmh} stroke="#f59e0b" strokeDasharray="2 2" label={{ value: `Vd (${envelopeMetrics.v_d_kmh.toFixed(0)})`, fill: '#f59e0b', fontSize: 9 }} />
                <ReferenceLine x={envelopeMetrics.v_flutter_kmh} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: `Vf (${envelopeMetrics.v_flutter_kmh.toFixed(0)})`, fill: '#f43f5e', fontSize: 9 }} />

                {/* Positive Aerodynamic Stall Curve */}
                <Line type="monotone" dataKey="posAeroStall" stroke="#38bdf8" strokeWidth={2.5} dot={false} name="Аэродинамический срыв (+)" />
                {/* Positive Limit G */}
                <Line type="monotone" dataKey="posLimitG" stroke="#10b981" strokeWidth={2} dot={false} name="Эксплуатационный предел (+G)" />
                {/* Positive Ultimate G */}
                <Line type="monotone" dataKey="posUltG" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Разрушающий предел (+G)" />

                {/* Negative Aerodynamic Stall Curve */}
                <Line type="monotone" dataKey="negAeroStall" stroke="#38bdf8" strokeWidth={2.5} dot={false} name="Отрицательный срыв (-)" />
                {/* Negative Limit G */}
                <Line type="monotone" dataKey="negLimitG" stroke="#10b981" strokeWidth={2} dot={false} name="Эксплуатационный предел (-G)" />
                {/* Negative Ultimate G */}
                <Line type="monotone" dataKey="negUltG" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Разрушающий предел (-G)" />

                {/* Gust Lines */}
                <Line type="monotone" dataKey="gustPositive" stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="2 2" dot={false} name={`Порыв +${gustVelocityMs} м/с`} />
                <Line type="monotone" dataKey="gustNegative" stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="2 2" dot={false} name={`Порыв -${gustVelocityMs} м/с`} />

                {/* Test Flight Point Dot */}
                <ReferenceDot
                  x={testSpeedKmh}
                  y={testGForce}
                  r={6}
                  fill="#f43f5e"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Flight Point Test & Limits Inspector */}
        <div className="lg:col-span-4 space-y-3 flex flex-col justify-between">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-sky-400" />
                Тест Режима Полета (В-н Точка)
              </span>
              <span className="font-mono text-rose-400 text-[11px]">
                {testSpeedKmh} км/ч @ {testGForce >= 0 ? `+${testGForce.toFixed(1)}` : testGForce.toFixed(1)}g
              </span>
            </div>

            {/* Speed slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Скорость V_IAS</span>
                <span className="text-sky-300 font-bold">{testSpeedKmh} км/ч ({(testSpeedKmh / 3.6).toFixed(1)} м/с)</span>
              </div>
              <input
                type="range"
                min={20}
                max={Math.round(envelopeMetrics.v_flutter_kmh * 1.05)}
                step={1}
                value={testSpeedKmh}
                onChange={(e) => setTestSpeedKmh(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>

            {/* G-Force slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Перегрузка $n$</span>
                <span className="text-amber-300 font-bold">{testGForce >= 0 ? `+${testGForce.toFixed(1)}` : testGForce.toFixed(1)} g</span>
              </div>
              <input
                type="range"
                min={limitGNegative * 1.6}
                max={limitGPositive * 1.6}
                step={0.1}
                value={testGForce}
                onChange={(e) => setTestGForce(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Altitude & Gust Sliders */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] text-slate-500">Высота H (м)</label>
                <input
                  type="number"
                  min={0}
                  max={8000}
                  step={100}
                  value={altitudeM}
                  onChange={(e) => setAltitudeM(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500">Порыв (м/с)</label>
                <input
                  type="number"
                  min={5}
                  max={25}
                  step={1}
                  value={gustVelocityMs}
                  onChange={(e) => setGustVelocityMs(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                />
              </div>
            </div>

            {/* Flight Point Status Result Card */}
            <div className={`p-2.5 rounded-lg border text-xs ${flightPointStatus.bg} transition-all`}>
              <div className="flex items-center gap-1.5 font-bold mb-0.5">
                {flightPointStatus.level === 'safe' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : flightPointStatus.level === 'warning' ? (
                  <Info className="w-4 h-4 text-sky-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span className={flightPointStatus.color}>{flightPointStatus.label}</span>
              </div>
              <p className="text-[10px] text-slate-300 leading-tight">
                {flightPointStatus.desc}
              </p>
            </div>
          </div>

          {/* Key Engineering Speeds table */}
          <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="text-[9px] text-slate-500 block">Vs1 (Срыв)</span>
              <span className="font-mono text-sky-400 text-[11px] font-bold">{envelopeMetrics.v_s1_kmh.toFixed(0)}</span>
              <span className="text-[8px] text-slate-600 block">км/ч</span>
            </div>
            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="text-[9px] text-slate-500 block">Va (Манёвр)</span>
              <span className="font-mono text-emerald-400 text-[11px] font-bold">{envelopeMetrics.v_a_kmh.toFixed(0)}</span>
              <span className="text-[8px] text-slate-600 block">км/ч</span>
            </div>
            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="text-[9px] text-slate-500 block">Vd (Пике)</span>
              <span className="font-mono text-amber-400 text-[11px] font-bold">{envelopeMetrics.v_d_kmh.toFixed(0)}</span>
              <span className="text-[8px] text-slate-600 block">км/ч</span>
            </div>
            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="text-[9px] text-slate-500 block">Vf (Флаттер)</span>
              <span className="font-mono text-rose-400 text-[11px] font-bold">{envelopeMetrics.v_flutter_kmh.toFixed(0)}</span>
              <span className="text-[8px] text-slate-600 block">км/ч</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
