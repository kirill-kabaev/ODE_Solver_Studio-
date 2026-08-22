// ============================================================================
// UAV RF Link Budget, Fresnel Zone & Airborne Relay Communications Studio
// Physics of Radio Propagation, Antenna Gains, Free-Space Path Loss & Mesh Relaying
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Radio,
  Wifi,
  Signal,
  Antenna,
  Layers,
  Activity,
  Zap,
  Shield,
  Compass,
  ArrowRight,
  TrendingUp,
  Cpu,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  Mountain,
  Eye,
  Server,
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

export type RadioProtocolType = 'elrs_868' | 'elrs_2400' | 'fpv_5800' | 'video_1200' | 'tactical_cofdm_1400';

export interface RadioPreset {
  id: RadioProtocolType;
  name: string;
  frequencyMhz: number;
  defaultTxPowerMw: number;
  receiverSensitivityDbm: number;
  typicalBandwidthKhz: number;
  modulation: string;
  txAntennaGainDbi: number;
  rxAntennaGainDbi: number;
  description: string;
}

export const RADIO_PRESETS: RadioPreset[] = [
  {
    id: 'elrs_868',
    name: 'ExpressLRS 868 / 915 MHz (LoRa Long-Range)',
    frequencyMhz: 868,
    defaultTxPowerMw: 1000, // 1W (30 dBm)
    receiverSensitivityDbm: -115, // High sensitivity LoRa
    typicalBandwidthKhz: 250,
    modulation: 'LoRa CSS (SF7-SF9)',
    txAntennaGainDbi: 5.5, // Moxon / Diamond antenna
    rxAntennaGainDbi: 2.1, // Dipole T-antenna
    description: 'Сверхдальнобойный канал телеметрии и управления с высокой проникающей способностью и защитой от помех.',
  },
  {
    id: 'elrs_2400',
    name: 'ExpressLRS 2.4 GHz (Высокая частота пакетов 500Гц)',
    frequencyMhz: 2400,
    defaultTxPowerMw: 500, // 27 dBm
    receiverSensitivityDbm: -105,
    typicalBandwidthKhz: 500,
    modulation: 'FLRC / LoRa 2.4G',
    txAntennaGainDbi: 5.0,
    rxAntennaGainDbi: 2.1,
    description: 'Низкая задержка (до 2 мс) для скоростного пилотирования и маневрирования на дистанциях до 15 км.',
  },
  {
    id: 'fpv_5800',
    name: 'Аналог / Цифра 5.8 GHz FPV Видеолинк',
    frequencyMhz: 5800,
    defaultTxPowerMw: 2000, // 2W (33 dBm)
    receiverSensitivityDbm: -92,
    typicalBandwidthKhz: 20000, // 20 MHz wide
    modulation: 'FM / OFDM HD',
    txAntennaGainDbi: 2.5, // Cloverleaf клевер
    rxAntennaGainDbi: 14.0, // Направленный патч / Helix 14 dBi
    description: 'Широкополосный видеоканал высокого разрешения. Сильно чувствителен к закрытию 1-й зоны Френеля.',
  },
  {
    id: 'video_1200',
    name: '1.2 / 1.3 GHz Long-Range Видеопередатчик',
    frequencyMhz: 1280,
    defaultTxPowerMw: 1500,
    receiverSensitivityDbm: -96,
    typicalBandwidthKhz: 8000,
    modulation: 'FM Analog / COFDM',
    txAntennaGainDbi: 3.0,
    rxAntennaGainDbi: 9.5, // Yagi-Uda
    description: 'Оптимальный компромисс между дальностью видео и огибанием складок рельефа местности.',
  },
  {
    id: 'tactical_cofdm_1400',
    name: 'Тактический COFDM Mesh 1.4 GHz (Шифрованный)',
    frequencyMhz: 1400,
    defaultTxPowerMw: 4000, // 4W
    receiverSensitivityDbm: -100,
    typicalBandwidthKhz: 10000,
    modulation: 'QPSK / 16-QAM COFDM',
    txAntennaGainDbi: 4.5,
    rxAntennaGainDbi: 11.0,
    description: 'Помехозащищенный цифровой канал телеметрии и видео с автоматической ретрансляцией через рой.',
  },
];

export const UAVRadioLinkRelayModule: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [customTxPowerMw, setCustomTxPowerMw] = useState<number>(RADIO_PRESETS[0].defaultTxPowerMw);
  const [distanceKm, setDistanceKm] = useState<number>(12);
  const [gcsAltitudeM, setGcsAltitudeM] = useState<number>(15); // Ground Control Station antenna mast height
  const [droneAltitudeM, setDroneAltitudeM] = useState<number>(180); // UAV operating altitude
  
  // Obstacle & Terrain
  const [obstacleDistanceKm, setObstacleDistanceKm] = useState<number>(6);
  const [obstacleHeightM, setObstacleHeightM] = useState<number>(45); // Hill / forest / building

  // Airborne Relay Settings
  const [useAirborneRelay, setUseAirborneRelay] = useState<boolean>(false);
  const [relayDroneDistanceKm, setRelayDroneDistanceKm] = useState<number>(6);
  const [relayDroneAltitudeM, setRelayDroneAltitudeM] = useState<number>(350);

  const preset = RADIO_PRESETS[selectedPresetIdx];

  // RF Link Budget Calculations
  const calculations = useMemo(() => {
    const freqMhz = preset.frequencyMhz;
    const lambdaM = 300 / freqMhz; // Speed of light / freq (in MHz) = wavelength in meters

    // Transmitter power in dBm: P(dBm) = 10 * log10(P(mW))
    const txPowerDbm = 10 * Math.log10(customTxPowerMw);

    // Free Space Path Loss (FSPL) formula: FSPL(dB) = 20*log10(d_km) + 20*log10(f_MHz) + 32.45
    const calculateFSPL = (distKm: number) => {
      if (distKm <= 0.01) return 30;
      return 20 * Math.log10(distKm) + 20 * Math.log10(freqMhz) + 32.45;
    };

    // Fresnel Zone Radius at intermediate point: r1 = sqrt( (lambda * d1 * d2) / (d1 + d2) )
    const calculateFresnelRadiusM = (d1Km: number, d2Km: number) => {
      const d1M = d1Km * 1000;
      const d2M = d2Km * 1000;
      if (d1M + d2M === 0) return 0;
      return Math.sqrt((lambdaM * d1M * d2M) / (d1M + d2M));
    };

    // Maximum 1st Fresnel zone radius (at mid-point)
    const maxFresnelRadiusM = calculateFresnelRadiusM(distanceKm / 2, distanceKm / 2);

    // Line of Sight (LOS) height at obstacle position
    const losHeightAtObstacleM = gcsAltitudeM + (droneAltitudeM - gcsAltitudeM) * (obstacleDistanceKm / distanceKm);
    
    // Earth Curvature drop in meters: h_drop = (d1 * d2) / (12.74 * k_factor), k ~ 1.33
    const earthCurvatureDropM = (obstacleDistanceKm * (distanceKm - obstacleDistanceKm)) / (12.74 * 1.33);
    const effectiveObstacleHeightM = obstacleHeightM + earthCurvatureDropM;
    
    // Clearance above obstacle
    const clearanceM = losHeightAtObstacleM - effectiveObstacleHeightM;
    const fresnelRadiusAtObstacleM = calculateFresnelRadiusM(obstacleDistanceKm, distanceKm - obstacleDistanceKm);
    const fresnelClearancePercent = (clearanceM / fresnelRadiusAtObstacleM) * 100;

    // Knife-Edge Diffraction Loss (Bullington approximation)
    let diffractionLossDb = 0;
    const vParam = Math.sqrt(2) * (-clearanceM / fresnelRadiusAtObstacleM);
    if (vParam > -0.7) {
      diffractionLossDb = 6.9 + 20 * Math.log10(Math.sqrt(Math.pow(vParam - 0.1, 2) + 1) + vParam - 0.1);
      if (diffractionLossDb < 0) diffractionLossDb = 0;
    }

    // Direct Link Budget
    const directFsplDb = calculateFSPL(distanceKm);
    const cableLossDb = 1.5; // Tx + Rx RF connector & pigtail losses
    const atmosphericLossDb = 0.01 * distanceKm; // O2 and moisture attenuation

    const totalDirectLossDb = directFsplDb + diffractionLossDb + cableLossDb + atmosphericLossDb;
    const directRssiDbm = txPowerDbm + preset.txAntennaGainDbi + preset.rxAntennaGainDbi - totalDirectLossDb;
    const directLinkMarginDb = directRssiDbm - preset.receiverSensitivityDbm;

    // Relay Link Budget (if enabled)
    let relayHop1RssiDbm = 0;
    let relayHop2RssiDbm = 0;
    let relayLinkMarginDb = 0;
    let isRelayValid = false;

    if (useAirborneRelay) {
      // Hop 1: GCS -> Relay Drone
      const hop1DistKm = Math.sqrt(Math.pow(relayDroneDistanceKm, 2) + Math.pow((relayDroneAltitudeM - gcsAltitudeM) / 1000, 2));
      const hop1Fspl = calculateFSPL(hop1DistKm);
      relayHop1RssiDbm = txPowerDbm + preset.txAntennaGainDbi + preset.rxAntennaGainDbi - (hop1Fspl + cableLossDb);

      // Hop 2: Relay Drone -> Target Drone
      const hop2DistKm = Math.sqrt(Math.pow(distanceKm - relayDroneDistanceKm, 2) + Math.pow((relayDroneAltitudeM - droneAltitudeM) / 1000, 2));
      const hop2Fspl = calculateFSPL(hop2DistKm);
      relayHop2RssiDbm = txPowerDbm + preset.txAntennaGainDbi + preset.rxAntennaGainDbi - (hop2Fspl + cableLossDb);

      const bottleneckHopRssi = Math.min(relayHop1RssiDbm, relayHop2RssiDbm);
      relayLinkMarginDb = bottleneckHopRssi - preset.receiverSensitivityDbm;
      isRelayValid = relayLinkMarginDb > 10;
    }

    // Dynamic Distance vs RSSI Curve
    const profileCurve = [];
    const maxGraphDist = Math.max(25, distanceKm * 1.4);
    for (let d = 0.5; d <= maxGraphDist; d += 1) {
      const fspl = calculateFSPL(d);
      // Rough diffraction factor based on current terrain
      const curClearance = (gcsAltitudeM + (droneAltitudeM - gcsAltitudeM) * (Math.min(d, obstacleDistanceKm) / d)) - effectiveObstacleHeightM;
      let dLoss = 0;
      if (d >= obstacleDistanceKm && curClearance < 0) {
        dLoss = Math.min(35, Math.abs(curClearance) * 0.8);
      }
      const rssi = txPowerDbm + preset.txAntennaGainDbi + preset.rxAntennaGainDbi - (fspl + cableLossDb + dLoss);
      
      profileCurve.push({
        distKm: d,
        directRssiDbm: Math.round(rssi * 10) / 10,
        sensitivityFloorDbm: preset.receiverSensitivityDbm,
        marginDb: Math.round((rssi - preset.receiverSensitivityDbm) * 10) / 10,
      });
    }

    // Terrain cross-section for 2D visualization
    const terrainProfile = [];
    const numPoints = 20;
    for (let i = 0; i <= numPoints; i++) {
      const x = (distanceKm / numPoints) * i;
      const losH = gcsAltitudeM + (droneAltitudeM - gcsAltitudeM) * (x / distanceKm);
      const fR = calculateFresnelRadiusM(x, distanceKm - x);
      
      // Ground height with obstacle gaussian peak
      const distFromObstacle = Math.abs(x - obstacleDistanceKm);
      const obsGaussian = obstacleHeightM * Math.exp(-Math.pow(distFromObstacle / 1.2, 2));
      const earthCurve = (x * (distanceKm - x)) / (12.74 * 1.33);
      const groundH = obsGaussian + earthCurve;

      terrainProfile.push({
        xKm: Math.round(x * 10) / 10,
        losAltitudeM: Math.round(losH),
        fresnelTopM: Math.round(losH + fR),
        fresnelBottomM: Math.round(losH - fR),
        groundAltitudeM: Math.round(groundH),
      });
    }

    return {
      lambdaM,
      txPowerDbm,
      maxFresnelRadiusM,
      fresnelRadiusAtObstacleM,
      clearanceM,
      fresnelClearancePercent,
      diffractionLossDb,
      directFsplDb,
      directRssiDbm,
      directLinkMarginDb,
      relayHop1RssiDbm,
      relayHop2RssiDbm,
      relayLinkMarginDb,
      isRelayValid,
      profileCurve,
      terrainProfile,
    };
  }, [preset, customTxPowerMw, distanceKm, gcsAltitudeM, droneAltitudeM, obstacleDistanceKm, obstacleHeightM, useAirborneRelay, relayDroneDistanceKm, relayDroneAltitudeM]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-indigo-800/60 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden text-slate-100 font-mono">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-400 via-cyan-500 to-purple-600 text-slate-950 shadow-lg shadow-indigo-500/20 border border-indigo-400/40">
                <Antenna className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <span>Радиолиния, Зона Френеля & Дроны-Ретрансляторы (RF Link Studio)</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700">
                    RF Budget P0
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Расчет затухания FSPL, 1-й зоны Френеля, дифракции ножевого края, RSSI/SNR и воздушных ретрансляторов
                </p>
              </div>
            </div>
          </div>

          {/* Quick Status Pill */}
          <div className="flex items-center gap-2">
            <div className={`px-4 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
              (useAirborneRelay ? calculations.relayLinkMarginDb : calculations.directLinkMarginDb) >= 12
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/60'
                : (useAirborneRelay ? calculations.relayLinkMarginDb : calculations.directLinkMarginDb) >= 4
                ? 'bg-amber-950/90 text-amber-300 border-amber-600/60'
                : 'bg-rose-950/90 text-rose-300 border-rose-600/60'
            }`}>
              <Signal className="w-4 h-4" />
              <span>
                Запас Связи: {(useAirborneRelay ? calculations.relayLinkMarginDb : calculations.directLinkMarginDb).toFixed(1)} дБ
              </span>
              <span className="text-[10px] opacity-75">
                ({(useAirborneRelay ? calculations.relayLinkMarginDb : calculations.directLinkMarginDb) >= 12 ? 'Уверенный линк' : 'Риск обрыва!'})
              </span>
            </div>
          </div>
        </div>

        {/* Radio Protocol Selectors */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {RADIO_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedPresetIdx(idx);
                setCustomTxPowerMw(p.defaultTxPowerMw);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer text-xs flex flex-col justify-between gap-1.5 ${
                selectedPresetIdx === idx
                  ? 'bg-gradient-to-br from-indigo-950/90 to-slate-900 border-indigo-400 text-white shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-400/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <div className="font-bold text-indigo-300 flex items-center justify-between">
                <span>{p.name.split(' ')[0]} {p.name.split(' ')[1]}</span>
                {selectedPresetIdx === idx && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {p.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* KPI Telemetry Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Уровень Сигнала (RSSI)</span>
            <Radio className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {calculations.directRssiDbm.toFixed(1)} <span className="text-xs text-slate-400">дБм</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Порог: {preset.receiverSensitivityDbm} дБм
          </div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Радиус Зоны Френеля</span>
            <Eye className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">
            {calculations.maxFresnelRadiusM.toFixed(1)} <span className="text-xs text-slate-400">м</span>
          </div>
          <div className="text-[10px] text-slate-500">В центре трассы ($r_1$)</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Клиренс Препятствия</span>
            <Mountain className="w-4 h-4 text-amber-400" />
          </div>
          <div className={`text-2xl font-black ${calculations.clearanceM >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {calculations.clearanceM.toFixed(1)} <span className="text-xs text-slate-400">м</span>
          </div>
          <div className="text-[10px] text-slate-500">
            {calculations.fresnelClearancePercent >= 60 ? '100% открыта (0 дБ)' : `Затенение ${calculations.diffractionLossDb.toFixed(1)} дБ`}
          </div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Затухание в Пространстве</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {calculations.directFsplDb.toFixed(1)} <span className="text-xs text-slate-400">дБ</span>
          </div>
          <div className="text-[10px] text-slate-500">FSPL на {distanceKm} км</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Мощность Передатчика</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {calculations.txPowerDbm.toFixed(1)} <span className="text-xs text-slate-400">дБм</span>
          </div>
          <div className="text-[10px] text-slate-500">{customTxPowerMw} мВт</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center justify-between">
            <span>Воздушный Ретранслятор</span>
            <Server className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            {useAirborneRelay ? `+${calculations.relayLinkMarginDb.toFixed(0)} дБ` : 'ВЫКЛ'}
          </div>
          <div className="text-[10px] text-slate-500">
            {useAirborneRelay ? `Ретранслятор @ ${relayDroneAltitudeM}м` : 'Прямая связь'}
          </div>
        </div>
      </div>

      {/* Main Workspace: 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs text-slate-300">
        {/* Left Column: Radio & Terrain Configurator */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              Параметры Радиолинии & Рельефа
            </span>
            <button
              type="button"
              onClick={() => {
                setDistanceKm(12);
                setGcsAltitudeM(15);
                setDroneAltitudeM(180);
                setObstacleHeightM(45);
                setUseAirborneRelay(false);
              }}
              className="text-[10px] text-slate-500 hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Сброс
            </button>
          </div>

          {/* Distance & Altitudes */}
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Дистанция до БПЛА:</span>
                <span className="text-white font-bold">{distanceKm} км</span>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                step={0.5}
                value={distanceKm}
                onChange={(e) => setDistanceKm(parseFloat(e.target.value))}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500">Мачта НСУ (GCS):</span>
                <input
                  type="number"
                  value={gcsAltitudeM}
                  min={1}
                  max={100}
                  onChange={(e) => setGcsAltitudeM(parseFloat(e.target.value) || 2)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl p-2 text-white outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500">Высота БПЛА (м):</span>
                <input
                  type="number"
                  value={droneAltitudeM}
                  min={10}
                  max={2500}
                  step={50}
                  onChange={(e) => setDroneAltitudeM(parseFloat(e.target.value) || 50)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl p-2 text-white outline-none focus:border-indigo-400"
                />
              </div>
            </div>
          </div>

          {/* Obstacle & Terrain Settings */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-slate-400 font-bold block text-[11px] text-amber-300">
              Препятствие / Складка Рельефа:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500">Дистанция до холма ({obstacleDistanceKm} км):</span>
                <input
                  type="range"
                  min={0.5}
                  max={Math.max(1, distanceKm - 0.5)}
                  step={0.5}
                  value={obstacleDistanceKm}
                  onChange={(e) => setObstacleDistanceKm(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500">Высота холма/леса ({obstacleHeightM} м):</span>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={5}
                  value={obstacleHeightM}
                  onChange={(e) => setObstacleHeightM(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Power Slider */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex justify-between text-slate-400">
              <span>Мощность передатчика:</span>
              <span className="text-amber-400 font-bold">{customTxPowerMw} мВт ({(10 * Math.log10(customTxPowerMw)).toFixed(1)} dBm)</span>
            </div>
            <input
              type="range"
              min={25}
              max={5000}
              step={25}
              value={customTxPowerMw}
              onChange={(e) => setCustomTxPowerMw(parseInt(e.target.value, 10))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Airborne Relay Section */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
              <span className="text-teal-300 font-bold flex items-center gap-1.5">
                <Server className="w-4 h-4" />
                Включить Дрон-Ретранслятор
              </span>
              <input
                type="checkbox"
                checked={useAirborneRelay}
                onChange={(e) => setUseAirborneRelay(e.target.checked)}
                className="accent-teal-400 w-4 h-4 cursor-pointer"
              />
            </label>

            {useAirborneRelay && (
              <div className="space-y-2 p-3 rounded-2xl bg-teal-950/40 border border-teal-900/60 animate-fadeIn">
                <div>
                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span>Позиция ретранслятора:</span>
                    <span className="text-teal-300 font-bold">{relayDroneDistanceKm} км</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={distanceKm - 1}
                    step={0.5}
                    value={relayDroneDistanceKm}
                    onChange={(e) => setRelayDroneDistanceKm(parseFloat(e.target.value))}
                    className="w-full accent-teal-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span>Высота ретранслятора:</span>
                    <span className="text-teal-300 font-bold">{relayDroneAltitudeM} м</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={1000}
                    step={25}
                    value={relayDroneAltitudeM}
                    onChange={(e) => setRelayDroneAltitudeM(parseInt(e.target.value, 10))}
                    className="w-full accent-teal-400 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Graphs & Fresnel Visualization */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart 1: 2D Terrain Profile & 1st Fresnel Zone Ellipsoid */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Mountain className="w-4 h-4 text-purple-400" />
                  <span>Профиль Трассы: 1-я Зона Френеля & Препятствие Рельефа</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Фиолетовый эллипсоид: 1-я зона Френеля. Серый: профиль земли с учетом кривизны и препятствия.
                </p>
              </div>
              <span className={`text-xs px-3 py-1 rounded-xl border ${
                calculations.clearanceM >= 0
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-rose-950 text-rose-300 border-rose-800'
              }`}>
                {calculations.clearanceM >= 0 ? 'Прямая видимость (LOS)' : 'Зона затенения (NLOS)'}
              </span>
            </div>

            <div className="h-72 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={calculations.terrainProfile} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="xKm"
                    stroke="#64748b"
                    label={{ value: 'Дистанция от НСУ (км)', position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    label={{ value: 'Высота над рельефом (м)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem' }}
                    formatter={(value: any, name: string) => {
                      if (name === 'losAltitudeM') return [`${value} м`, 'Линия прямой видимости (LOS)'];
                      if (name === 'fresnelTopM') return [`${value} м`, 'Верхняя граница зоны Френеля'];
                      if (name === 'fresnelBottomM') return [`${value} м`, 'Нижняя граница зоны Френеля'];
                      if (name === 'groundAltitudeM') return [`${value} м`, 'Профиль Рельефа'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="fresnelTopM"
                    name="Зона Френеля (Верх)"
                    stroke="#a855f7"
                    fill="#a855f7"
                    fillOpacity={0.12}
                  />
                  <Line
                    type="monotone"
                    dataKey="losAltitudeM"
                    name="Ось радиолуча (LOS)"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="fresnelBottomM"
                    name="Нижняя граница Френеля"
                    stroke="#c084fc"
                    strokeWidth={1.5}
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="groundAltitudeM"
                    name="Рельеф / Препятствие (м)"
                    stroke="#64748b"
                    fill="#334155"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: RSSI vs Distance Curve & Sensitivity Threshold */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Signal className="w-4 h-4 text-cyan-400" />
                  <span>Уровень Сигнала (RSSI) от Дистанции Полета</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Красный пунктир: порог чувствительности приемника ({preset.receiverSensitivityDbm} дБм).
                </p>
              </div>
            </div>

            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calculations.profileCurve} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="distKm" stroke="#64748b" label={{ value: 'Дистанция (км)', position: 'insideBottomRight', offset: -5, fill: '#94a3b8' }} />
                  <YAxis stroke="#94a3b8" label={{ value: 'RSSI (дБм)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} domain={[-130, -30]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem' }}
                    formatter={(value: any, name: string) => {
                      if (name === 'directRssiDbm') return [`${value} дБм`, 'Уровень сигнала RSSI'];
                      if (name === 'sensitivityFloorDbm') return [`${value} дБм`, 'Порог Чувствительности'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="directRssiDbm"
                    name="Расчетный RSSI (дБм)"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="sensitivityFloorDbm"
                    name="Порог Срыва Связи (дБм)"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
