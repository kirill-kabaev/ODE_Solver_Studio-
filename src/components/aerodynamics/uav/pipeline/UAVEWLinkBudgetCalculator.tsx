import React, { useState, useMemo } from 'react';
import {
  Radio,
  Wifi,
  Shield,
  ShieldAlert,
  Zap,
  Activity,
  Maximize2,
  Signal,
  Satellite,
  Compass,
  AlertOctagon,
  CheckCircle2,
  Lock,
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
} from 'recharts';

export interface EWLinkBudgetProps {
  calculatedRange_km: number;
  altitude_m?: number;
}

export const UAVEWLinkBudgetCalculator: React.FC<EWLinkBudgetProps> = ({
  calculatedRange_km,
  altitude_m = 500,
}) => {
  // RF Parameters State
  const [rfFrequencyMHz, setRfFrequencyMHz] = useState<number>(868); // 868 MHz / 2.4 GHz / 5.8 GHz
  const [txPower_mW, setTxPower_mW] = useState<number>(1000); // 1 Watt (30 dBm)
  const [txAntennaGain_dBi, setTxAntennaGain_dBi] = useState<number>(3.0); // UAV dipole / patch
  const [rxAntennaGain_dBi, setRxAntennaGain_dBi] = useState<number>(14.0); // GCS tracker / directional helix
  const [receiverSensitivity_dBm, setReceiverSensitivity_dBm] = useState<number>(-115); // Semtech LoRa / ExpressLRS / COFDM
  const [targetDistance_km, setTargetDistance_km] = useState<number>(Math.min(30, Math.round(calculatedRange_km * 0.8)));
  const [gcsElevation_m, setGcsElevation_m] = useState<number>(15); // GCS mast height

  // EW Jammer (РЭБ) Parameters
  const [isJammerActive, setIsJammerActive] = useState<boolean>(false);
  const [jammerPower_W, setJammerPower_W] = useState<number>(50); // 50W tactical barrage jammer
  const [jammerDistance_km, setJammerDistance_km] = useState<number>(15);
  const [antiJamGain_dB, setAntiJamGain_dB] = useState<number>(12); // CRPA array / FHSS / DSSS processing gain

  // Derived RF calculations
  const txPower_dBm = 10 * Math.log10(Math.max(1, txPower_mW));
  const jammerPower_dBm = 10 * Math.log10(Math.max(1, jammerPower_W * 1000));

  // Radio Horizon calculation with 4/3 Earth refraction radius
  const radioHorizon_km = useMemo(() => {
    return 4.12 * (Math.sqrt(Math.max(1, altitude_m)) + Math.sqrt(Math.max(1, gcsElevation_m)));
  }, [altitude_m, gcsElevation_m]);

  // First Fresnel Zone Radius at midpoint
  const fresnelMidpoint_m = useMemo(() => {
    const d_km = targetDistance_km;
    const f_GHz = rfFrequencyMHz / 1000;
    return 17.32 * Math.sqrt(d_km / (4 * f_GHz));
  }, [targetDistance_km, rfFrequencyMHz]);

  // Dynamic Range Sweep Data for Recharts
  const linkRangeSweepData = useMemo(() => {
    const data: Array<{
      range_km: number;
      signalLevel_dBm: number;
      jammerLevel_dBm: number | null;
      snr_dB: number;
      fadeMargin_dB: number;
    }> = [];

    const maxSweepRange = Math.min(Math.round(radioHorizon_km * 1.05), 80);
    const step = Math.max(1, Math.round(maxSweepRange / 40));

    for (let d = 1; d <= maxSweepRange; d += step) {
      // Free Space Path Loss (FSPL)
      const fspl_dB = 20 * Math.log10(d) + 20 * Math.log10(rfFrequencyMHz) + 32.44;
      const cableLoss_dB = 1.5;
      const atmosLoss_dB = (d * 0.015);

      const prx_dBm = txPower_dBm + txAntennaGain_dBi + rxAntennaGain_dBi - fspl_dB - cableLoss_dB - atmosLoss_dB;
      const fadeMargin = prx_dBm - receiverSensitivity_dBm;

      // Jammer received power at UAV receiver
      let pJam_dBm: number | null = null;
      let js_ratio = 0;

      if (isJammerActive) {
        // Distance from Jammer to UAV (assuming geometry)
        const d_jam_eff = Math.max(0.5, Math.sqrt(Math.pow(jammerDistance_km, 2) + Math.pow(d * 0.5, 2)));
        const fspl_jam_dB = 20 * Math.log10(d_jam_eff) + 20 * Math.log10(rfFrequencyMHz) + 32.44;
        pJam_dBm = jammerPower_dBm + 6.0 - fspl_jam_dB - antiJamGain_dB;
        js_ratio = pJam_dBm - prx_dBm;
      }

      data.push({
        range_km: d,
        signalLevel_dBm: Number(prx_dBm.toFixed(1)),
        jammerLevel_dBm: pJam_dBm !== null ? Number(pJam_dBm.toFixed(1)) : null,
        snr_dB: Number(fadeMargin.toFixed(1)),
        fadeMargin_dB: Number(fadeMargin.toFixed(1)),
      });
    }

    return data;
  }, [
    rfFrequencyMHz,
    txPower_dBm,
    txAntennaGain_dBi,
    rxAntennaGain_dBi,
    receiverSensitivity_dBm,
    isJammerActive,
    jammerPower_dBm,
    jammerDistance_km,
    antiJamGain_dB,
    radioHorizon_km,
  ]);

  // Evaluation of Current Target Distance
  const targetMetrics = useMemo(() => {
    const fspl_dB = 20 * Math.log10(targetDistance_km) + 20 * Math.log10(rfFrequencyMHz) + 32.44;
    const cableLoss_dB = 1.5;
    const atmosLoss_dB = (targetDistance_km * 0.015);
    const rxPower_dBm = txPower_dBm + txAntennaGain_dBi + rxAntennaGain_dBi - fspl_dB - cableLoss_dB - atmosLoss_dB;
    const linkMargin_dB = rxPower_dBm - receiverSensitivity_dBm;

    let jammerRxPower_dBm = -150;
    let jsRatio_dB = -50;
    let isJammed = false;

    if (isJammerActive) {
      const fspl_jam_dB = 20 * Math.log10(Math.max(0.5, jammerDistance_km)) + 20 * Math.log10(rfFrequencyMHz) + 32.44;
      jammerRxPower_dBm = jammerPower_dBm + 6.0 - fspl_jam_dB - antiJamGain_dB;
      jsRatio_dB = jammerRxPower_dBm - rxPower_dBm;
      // If J/S is greater than 6 dB, lock is lost
      if (jsRatio_dB > 6.0) {
        isJammed = true;
      }
    }

    const isBeyondHorizon = targetDistance_km > radioHorizon_km;

    return {
      fspl_dB,
      rxPower_dBm,
      linkMargin_dB,
      jammerRxPower_dBm,
      jsRatio_dB,
      isJammed,
      isBeyondHorizon,
    };
  }, [
    targetDistance_km,
    rfFrequencyMHz,
    txPower_dBm,
    txAntennaGain_dBi,
    rxAntennaGain_dBi,
    receiverSensitivity_dBm,
    isJammerActive,
    jammerPower_dBm,
    jammerDistance_km,
    antiJamGain_dB,
    radioHorizon_km,
  ]);

  return (
    <div id="uav-ew-link-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Анализатор Радиолинии С2 & Стойкости к Помехам (РЭБ)
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                Friis Link / EW Jamming J/S
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Энергетический бюджет канала связи, радиогоризонт, зона Френеля F1, отношение Помеха/Сигнал (J/S)
            </p>
          </div>
        </div>

        {/* EW Jammer Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsJammerActive(!isJammerActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isJammerActive
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 ring-2 ring-rose-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isJammerActive ? <ShieldAlert className="w-4 h-4 text-white" /> : <Shield className="w-4 h-4 text-slate-400" />}
            {isJammerActive ? 'РЭБ Активен (Помехи)' : 'Включить РЭБ Постановщик'}
          </button>
        </div>
      </div>

      {/* Main Grid: Graph + Link Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* RF Signal vs Distance Chart */}
        <div className="lg:col-span-8 bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span className="font-semibold flex items-center gap-1.5">
              <Signal className="w-3.5 h-3.5 text-cyan-400" />
              Уровень мощности сигнала P_rx(D) vs Порог чувствительности
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Радиогоризонт: <span className="text-emerald-400">{radioHorizon_km.toFixed(1)} км</span>
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={linkRangeSweepData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="range_km" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} unit=" км" />
                <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} unit=" dBm" domain={[-130, -30]} />
                <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', fontSize: '10px', borderRadius: '8px' }} />
                <ReferenceLine y={receiverSensitivity_dBm} stroke="#ef4444" strokeDasharray="3 3" label={{ value: `Чувствительность (${receiverSensitivity_dBm} dBm)`, fill: '#ef4444', fontSize: 9 }} />
                <ReferenceLine x={radioHorizon_km} stroke="#10b981" strokeDasharray="4 4" label={{ value: `Горизонт (${radioHorizon_km.toFixed(0)} км)`, fill: '#10b981', fontSize: 9 }} />
                <ReferenceLine x={targetDistance_km} stroke="#38bdf8" strokeDasharray="2 2" />

                <Line type="monotone" dataKey="signalLevel_dBm" stroke="#38bdf8" strokeWidth={2.5} dot={false} name="Полезный сигнал P_rx (dBm)" />
                {isJammerActive && (
                  <Line type="monotone" dataKey="jammerLevel_dBm" stroke="#f43f5e" strokeWidth={2} strokeDasharray="2 2" dot={false} name="Шум помехи РЭБ P_jam (dBm)" />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Link Budget Controls & Margin Card */}
        <div className="lg:col-span-4 space-y-3 flex flex-col justify-between">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-2.5">
            <span className="text-xs font-semibold text-slate-200 block border-b border-slate-800 pb-1.5">
              Параметры Радиоканала C2
            </span>

            {/* Target Distance Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Дальность БПЛА:</span>
                <span className="text-cyan-400 font-bold">{targetDistance_km} км</span>
              </div>
              <input
                type="range"
                min={1}
                max={Math.min(70, Math.round(radioHorizon_km * 1.1))}
                value={targetDistance_km}
                onChange={(e) => setTargetDistance_km(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Frequency & Power */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500">Частота</label>
                <select
                  value={rfFrequencyMHz}
                  onChange={(e) => setRfFrequencyMHz(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                >
                  <option value={433}>433 МГц (UHF)</option>
                  <option value={868}>868 МГц (LoRa/ELRS)</option>
                  <option value={915}>915 МГц (US ISM)</option>
                  <option value={2400}>2.4 ГГц (Wi-Fi/C2)</option>
                  <option value={5800}>5.8 ГГц (Video HD)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-500">Мощность Tx</label>
                <select
                  value={txPower_mW}
                  onChange={(e) => setTxPower_mW(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                >
                  <option value={100}>100 мВт (20 dBm)</option>
                  <option value={500}>500 мВт (27 dBm)</option>
                  <option value={1000}>1.0 Вт (30 dBm)</option>
                  <option value={2000}>2.0 Вт (33 dBm)</option>
                  <option value={5000}>5.0 Вт (37 dBm)</option>
                </select>
              </div>
            </div>

            {/* Anti-Jamming Option if Jammer is Active */}
            {isJammerActive && (
              <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/40 space-y-1.5 text-xs">
                <div className="flex justify-between text-[10px] text-rose-300">
                  <span>Мощность РЭБ: <b>{jammerPower_W} Вт</b></span>
                  <span>Дистанция РЭБ: <b>{jammerDistance_km} км</b></span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>ППРЧ/CRPA подавление:</span>
                  <span className="text-emerald-400 font-bold">+{antiJamGain_dB} dB</span>
                </div>
              </div>
            )}

            {/* Link Status summary */}
            <div
              className={`p-2 rounded-lg border text-xs ${
                targetMetrics.isJammed
                  ? 'bg-rose-950/50 border-rose-500/50 text-rose-300'
                  : targetMetrics.isBeyondHorizon
                  ? 'bg-amber-950/50 border-amber-500/50 text-amber-300'
                  : targetMetrics.linkMargin_dB < 10
                  ? 'bg-amber-950/50 border-amber-500/50 text-amber-300'
                  : 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold mb-0.5">
                {targetMetrics.isJammed ? (
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                ) : targetMetrics.isBeyondHorizon ? (
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>
                  {targetMetrics.isJammed
                    ? 'КАНАЛ ПОДАВЛЕН РЭБ (J/S > +6 dB)'
                    : targetMetrics.isBeyondHorizon
                    ? 'ЗАКРЫТ РАДИОГОРИЗОНТОМ'
                    : 'СВЯЗЬ НАДЁЖНА (Запас > 10 dB)'}
                </span>
              </div>
              <p className="text-[10px] opacity-90">
                {targetMetrics.isJammed
                  ? `Помеха превышает сигнал на +${targetMetrics.jsRatio_dB.toFixed(1)} dB. Требуется режим радиомолчания/ИНС.`
                  : targetMetrics.isBeyondHorizon
                  ? `Дистанция ${targetDistance_km} км превышает прямую видимость антенн (${radioHorizon_km.toFixed(0)} км).`
                  : `Запас по затуханию: +${targetMetrics.linkMargin_dB.toFixed(1)} dB. Радиус 1-й зоны Френеля: ${fresnelMidpoint_m.toFixed(1)} м.`}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="text-[9px] text-slate-500 block">Уровень P_rx</span>
              <span className="font-mono text-cyan-400 text-[11px] font-bold">{targetMetrics.rxPower_dBm.toFixed(1)}</span>
              <span className="text-[8px] text-slate-600 block">dBm</span>
            </div>
            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="text-[9px] text-slate-500 block">Запас Fade</span>
              <span className={`font-mono text-[11px] font-bold ${targetMetrics.linkMargin_dB > 10 ? 'text-emerald-400' : 'text-rose-400'}`}>
                +{targetMetrics.linkMargin_dB.toFixed(1)}
              </span>
              <span className="text-[8px] text-slate-600 block">dB</span>
            </div>
            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="text-[9px] text-slate-500 block">1-я Зона F1</span>
              <span className="font-mono text-amber-400 text-[11px] font-bold">{fresnelMidpoint_m.toFixed(1)}</span>
              <span className="text-[8px] text-slate-600 block">м</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
