import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Zap,
  Radio,
  ShieldCheck,
  Target,
  Sliders,
  Activity,
  CloudRain,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Play,
  Pause,
  Layers,
  Lock,
  Wifi,
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

interface WeatherPreset {
  name: string;
  cn2: number; // m^-2/3
  extinctionCoeff: number; // dB/km
  visibility: number; // km
  desc: string;
}

const ATMOSPHERE_PRESETS: Record<string, WeatherPreset> = {
  clear_sky: {
    name: 'Чистое Небо / Высокогорье (Stratosphere Clear)',
    cn2: 1e-16,
    extinctionCoeff: 0.25,
    visibility: 25.0,
    desc: 'Минимальное затухание, идеальный канал для HAPS и межбортовой связи до 50 км.',
  },
  mild_turbulence: {
    name: 'Умеренная Приземная Турбулентность',
    cn2: 5e-14,
    extinctionCoeff: 0.8,
    visibility: 15.0,
    desc: 'Тепловые восходящие потоки создают мерцание пучка (Scintillation) и дрожание луча.',
  },
  light_haze: {
    name: 'Легкая Дымка & Пыль (Haze / Aerosol)',
    cn2: 1e-14,
    extinctionCoeff: 2.8,
    visibility: 6.0,
    desc: 'Аэрозольное рассеяние Ми, повышенное затухание оптической мощности.',
  },
  thick_fog: {
    name: 'Плотный Туман & Низкая Облачность (Fog / Clouds)',
    cn2: 1e-15,
    extinctionCoeff: 18.5,
    visibility: 0.8,
    desc: 'Критическое затухание по закону Кима-Круппа, дальность ограничена 1.5-3 км.',
  },
};

export const UAVFreeSpaceOpticalLasercomModule: React.FC = () => {
  // Config & Atmosphere
  const [selectedWeather, setSelectedWeather] = useState<string>('clear_sky');
  const [distanceKm, setDistanceKm] = useState<number>(12.0); // km
  const [laserPowerMw, setLaserPowerMw] = useState<number>(500); // mW (27 dBm)
  const [wavelengthNm, setWavelengthNm] = useState<number>(1550); // 1550 nm (C-band) or 850 nm
  const [txApertureMm, setTxApertureMm] = useState<number>(50); // mm
  const [rxApertureMm, setRxApertureMm] = useState<number>(80); // mm
  const [beamDivergenceUrad, setBeamDivergenceUrad] = useState<number>(120); // microradians
  const [fsmBandwidthHz, setFsmBandwidthHz] = useState<number>(450); // Fast Steering Mirror loop Hz
  const [customExtinction, setCustomExtinction] = useState<number>(0.25); // dB/km
  const [cn2, setCn2] = useState<number>(1e-16);

  // Tracking Simulation
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);
  const [beamSpotX, setBeamSpotX] = useState<number>(0); // mm offset on QPD
  const [beamSpotY, setBeamSpotY] = useState<number>(0); // mm offset on QPD
  const [trackingLock, setTrackingLock] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Handle Preset Select
  const handleWeatherSelect = (key: string) => {
    const w = ATMOSPHERE_PRESETS[key];
    if (!w) return;
    setSelectedWeather(key);
    setCn2(w.cn2);
    setCustomExtinction(w.extinctionCoeff);
  };

  // Optical Physics Computations
  const wavelengthM = wavelengthNm * 1e-9;
  const k_wave = (2 * Math.PI) / wavelengthM;
  const distM = distanceKm * 1000;

  // Beam waist radius at distance R: w(R) = w0 * sqrt(1 + (R / zR)^2)
  const thetaDivRad = beamDivergenceUrad * 1e-6;
  const spotDiameterAtRxM = Math.max(rxApertureMm * 1e-3, (txApertureMm * 1e-3) + (distM * thetaDivRad));
  const spotAreaAtRx = Math.PI * Math.pow(spotDiameterAtRxM / 2, 2);
  const rxArea = Math.PI * Math.pow((rxApertureMm * 1e-3) / 2, 2);

  // Geometric Collection Efficiency
  const geometricEfficiency = Math.min(1.0, rxArea / spotAreaAtRx);
  const geometricLossDb = -10 * Math.log10(Math.max(1e-12, geometricEfficiency));

  // Atmospheric Extinction Loss (Beer-Lambert Law)
  const atmosphericLossDb = customExtinction * distanceKm;

  // Scintillation Index (Rytov Variance for spherical wave)
  const rytovVariance = 0.563 * Math.pow(k_wave, 7 / 6) * cn2 * Math.pow(distM, 11 / 6);
  const scintillationIndex = Math.min(3.5, rytovVariance);

  // Total Optical Loss & Received Power
  const txPowerDbm = 10 * Math.log10(laserPowerMw);
  const totalLossDb = geometricLossDb + atmosphericLossDb + (scintillationIndex * 1.5);
  const rxPowerDbm = txPowerDbm - totalLossDb;
  const rxPowerMw = Math.pow(10, rxPowerDbm / 10);

  // Data rate & Link Margin (Sensitivity threshold ~ -38 dBm for 10 Gbps NRZ-OOK)
  const rxSensitivityDbm = -36.0; // dBm for 10 Gbps with APD receiver
  const linkMarginDb = rxPowerDbm - rxSensitivityDbm;
  const isLinkEstablished = linkMarginDb >= 3.0 && trackingLock;

  // Max Data Rate (Gbps) scaling with SNR / Link Margin
  const achievedDataRateGbps = isLinkEstablished
    ? Math.min(100.0, Math.max(0.1, 10.0 * Math.pow(10, Math.min(1.5, linkMarginDb / 15))))
    : 0.0;

  // Bit Error Rate (BER)
  const qFactor = Math.max(0.1, Math.sqrt(Math.max(0.01, Math.pow(10, linkMarginDb / 10))));
  const ber = isLinkEstablished ? 0.5 * Math.exp(-Math.pow(qFactor, 2) / 2) : 1.0;

  // Simulation Loop for Beam Jitter & PAT Tracking
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSimTime((prev) => prev + 0.02);

      // Atmospheric Jitter + UAV vibration
      const jitterAmp = (Math.sqrt(Math.max(0.01, scintillationIndex)) * 8 + (distanceKm * 0.4)) * (1 / (1 + fsmBandwidthHz / 150));
      const vibrationX = Math.sin(simTime * 14) * 2.5 + Math.cos(simTime * 35) * 1.2;
      const vibrationY = Math.cos(simTime * 12) * 2.2 + Math.sin(simTime * 28) * 1.0;

      const rawSpotX = (Math.sin(simTime * 3.7) * jitterAmp * 4) + vibrationX;
      const rawSpotY = (Math.cos(simTime * 4.3) * jitterAmp * 4) + vibrationY;

      // FSM Fast Steering Mirror Correction
      const fsmFactor = Math.min(0.96, fsmBandwidthHz / 500);
      const correctedX = rawSpotX * (1 - fsmFactor);
      const correctedY = rawSpotY * (1 - fsmFactor);

      setBeamSpotX(correctedX);
      setBeamSpotY(correctedY);

      // Check if spot stays within active receiver area (radius < 15 mm)
      const spotDist = Math.sqrt(correctedX * correctedX + correctedY * correctedY);
      setTrackingLock(spotDist < 12.0);
    }, 20);

    return () => clearInterval(interval);
  }, [isRunning, simTime, scintillationIndex, distanceKm, fsmBandwidthHz]);

  // QPD Canvas Tracker Visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;
    const radius = 110;

    // Background
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    // QPD 4-Quadrant Photodiode Background
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#090d16';
    ctx.fill();
    ctx.stroke();

    // Crosshair Lines (Dividing into Quadrants A, B, C, D)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();
    ctx.setLineDash([]);

    // Quadrant Labels
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('Q1 (A)', centerX + 45, centerY - 45);
    ctx.fillText('Q2 (B)', centerX - 75, centerY - 45);
    ctx.fillText('Q3 (C)', centerX - 75, centerY + 55);
    ctx.fillText('Q4 (D)', centerX + 45, centerY + 55);

    // Target Acceptance Window Circle (Green)
    ctx.strokeStyle = trackingLock ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 45, 0, Math.PI * 2);
    ctx.stroke();

    // Draw Laser Spot on QPD
    const spotPixelX = centerX + beamSpotX * 6.5;
    const spotPixelY = centerY + beamSpotY * 6.5;
    const spotRadius = Math.max(14, (spotDiameterAtRxM * 100) / 4);

    // Gaussian Laser Spot Glow
    const spotGrad = ctx.createRadialGradient(spotPixelX, spotPixelY, 2, spotPixelX, spotPixelY, spotRadius);
    if (trackingLock) {
      spotGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      spotGrad.addColorStop(0.3, 'rgba(239, 68, 68, 0.85)'); // Red laser 1550nm false color
      spotGrad.addColorStop(0.7, 'rgba(244, 63, 94, 0.35)');
      spotGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
    } else {
      spotGrad.addColorStop(0, 'rgba(251, 146, 60, 0.9)');
      spotGrad.addColorStop(0.7, 'rgba(239, 68, 68, 0.3)');
      spotGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    }

    ctx.fillStyle = spotGrad;
    ctx.beginPath();
    ctx.arc(spotPixelX, spotPixelY, spotRadius, 0, Math.PI * 2);
    ctx.fill();

    // Spot Centroid Dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(spotPixelX, spotPixelY, 3, 0, Math.PI * 2);
    ctx.fill();

    // FSM Steering Vector Line (From center to spot)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(spotPixelX, spotPixelY);
    ctx.stroke();

    // Top HUD
    ctx.fillStyle = trackingLock ? '#22c55e' : '#ef4444';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText(
      trackingLock ? '● PAT ЗАХВАТ УДЕРЖАН (FSM LOCKED)' : '⚠ СРЫВ СЛЕЖЕНИЯ ПУЧКА (BEAM DRIFT)',
      14,
      22
    );

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText(`ΔX: ${beamSpotX.toFixed(2)} мм | ΔY: ${beamSpotY.toFixed(2)} мм`, 14, 38);
    ctx.fillText(`FSM отклик: ${fsmBandwidthHz} Гц`, 14, 52);
  }, [beamSpotX, beamSpotY, trackingLock, fsmBandwidthHz, spotDiameterAtRxM]);

  // Distance Sweep Chart Data
  const distanceChartData = useMemo(() => {
    const pts = [];
    for (let d = 1; d <= 40; d += 2) {
      const distMeters = d * 1000;
      const spotDiamM = Math.max(rxApertureMm * 1e-3, (txApertureMm * 1e-3) + (distMeters * thetaDivRad));
      const geomEff = Math.min(1.0, rxArea / (Math.PI * Math.pow(spotDiamM / 2, 2)));
      const geomL = -10 * Math.log10(Math.max(1e-12, geomEff));
      const atmosL = customExtinction * d;
      const totalL = geomL + atmosL;
      const rxP = txPowerDbm - totalL;
      const margin = rxP - rxSensitivityDbm;
      const speed = margin > 3 ? Math.min(100, Math.max(0.1, 10 * Math.pow(10, Math.min(1.5, margin / 15)))) : 0;

      pts.push({
        distance: `${d} км`,
        RxPower: parseFloat(rxP.toFixed(1)),
        DataRate: parseFloat(speed.toFixed(1)),
        TotalLoss: parseFloat(totalL.toFixed(1)),
      });
    }
    return pts;
  }, [
    txApertureMm,
    rxApertureMm,
    thetaDivRad,
    rxArea,
    customExtinction,
    txPowerDbm,
    rxSensitivityDbm,
  ]);

  return (
    <div className="space-y-6 text-slate-100 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 border border-blue-500/30 p-6 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/30 ring-1 ring-white/20">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Спутниковая & Межбортовая Лазерная Связь БПЛА (FSO Lasercom)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-500/40 font-mono">
                  100 Gbps & Anti-EW Stealth
                </span>
              </h2>
              <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl">
                Беспроводная оптическая связь в открытом пространстве (Free-Space Optics, 1550 нм), быстродействующие
                зеркала наведения (FSM PAT), компенсация атмосферной турбулентности ($C_n^2$), мерцания и 100%
                помехоустойчивость к средствам РЭБ противника.
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 bg-slate-900/80 border border-blue-500/30 px-4 py-2 rounded-xl backdrop-blur-md">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Скорость Передачи</div>
              <div className={`text-base font-black ${isLinkEstablished ? 'text-cyan-300' : 'text-rose-400'}`}>
                {isLinkEstablished ? `${achievedDataRateGbps.toFixed(1)} Гбит/с` : 'НЕТ ЛИНКА'}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Запас Линии (Margin)</div>
              <div className={`text-base font-black ${linkMarginDb >= 3 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {linkMarginDb.toFixed(1)} дБ
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Atmospheric Presets Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(ATMOSPHERE_PRESETS).map(([key, w]) => (
          <button
            key={key}
            onClick={() => handleWeatherSelect(key)}
            className={`p-3.5 rounded-xl text-left transition-all border ${
              selectedWeather === key
                ? 'bg-gradient-to-br from-blue-900/60 via-indigo-950/60 to-slate-900 border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg'
                : 'bg-slate-900/70 border-slate-800 hover:border-blue-700/50 hover:bg-slate-850'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300">{w.name.split(' (')[0]}</span>
              {selectedWeather === key && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{w.desc}</p>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-2 pt-2 border-t border-slate-800/80">
              <span>Затухание: {w.extinctionCoeff} дБ/км</span>
              <span>Видимость: {w.visibility} км</span>
            </div>
          </button>
        ))}
      </div>

      {/* Interactive Grid: Canvas Tracking & Optics Sliders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 4-Quadrant Photodiode PAT Tracker Canvas (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-200">
                4-Квадрантный Фотодиод (QPD) & FSM Зеркала Слежения Лазера
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isRunning
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                }`}
              >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isRunning ? 'Пауза' : 'Пуск'}</span>
              </button>
              <button
                onClick={() => {
                  setSimTime(0);
                  setBeamSpotX(0);
                  setBeamSpotY(0);
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Сброс положения"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-cyan-900/40 bg-slate-950 flex items-center justify-center">
            <canvas ref={canvasRef} width={580} height={300} className="w-full h-auto max-h-[340px] block" />
          </div>

          {/* Optical Diagnostic Metrics */}
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Диаметр Пятна на RX</div>
              <div className="text-sm font-black text-cyan-300 mt-0.5">{(spotDiameterAtRxM * 100).toFixed(1)} см</div>
              <div className="text-[9px] text-slate-400 mt-1">D_TX: {txApertureMm}мм | D_RX: {rxApertureMm}мм</div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Мощность на Приемнике</div>
              <div className="text-sm font-black text-emerald-400 mt-0.5">{rxPowerDbm.toFixed(1)} дБм</div>
              <div className="text-[9px] text-slate-400 mt-1">
                {(rxPowerMw * 1000).toFixed(1)} мкВт (Порог: {rxSensitivityDbm} дБм)
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Коэффициент Ошибок BER</div>
              <div className="text-sm font-black text-purple-300 mt-0.5">
                {ber < 1e-12 ? '< 10⁻¹² (Идеал)' : ber.toExponential(2)}
              </div>
              <div className="text-[9px] text-slate-400 mt-1">Индекс мерцания: {scintillationIndex.toFixed(3)}</div>
            </div>
          </div>
        </div>

        {/* Right: Optical Channel Sliders (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Параметры Оптического Тракта & Лазера</h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* Distance */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Дальность прямой видимости (R):</span>
                <span className="font-mono text-cyan-400 font-bold">{distanceKm.toFixed(1)} км</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={40.0}
                step={0.5}
                value={distanceKm}
                onChange={(e) => setDistanceKm(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Laser Power */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Мощность передающего лазера:</span>
                <span className="font-mono text-cyan-400 font-bold">{laserPowerMw} мВт ({txPowerDbm.toFixed(1)} дБм)</span>
              </div>
              <input
                type="range"
                min={50}
                max={2000}
                step={50}
                value={laserPowerMw}
                onChange={(e) => setLaserPowerMw(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Beam Divergence */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Расходимость пучка (Divergence θ):</span>
                <span className="font-mono text-sky-400 font-bold">{beamDivergenceUrad} мкрад</span>
              </div>
              <input
                type="range"
                min={30}
                max={400}
                step={10}
                value={beamDivergenceUrad}
                onChange={(e) => setBeamDivergenceUrad(parseInt(e.target.value, 10))}
                className="w-full accent-sky-400 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* FSM Loop Bandwidth */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Полоса контура слежения зеркал FSM:</span>
                <span className="font-mono text-emerald-400 font-bold">{fsmBandwidthHz} Гц</span>
              </div>
              <input
                type="range"
                min={50}
                max={1000}
                step={25}
                value={fsmBandwidthHz}
                onChange={(e) => setFsmBandwidthHz(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-400 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Custom Extinction */}
            <div>
              <div className="flex justify-between font-medium text-slate-300 mb-1">
                <span>Коэффициент затухания атмосферы:</span>
                <span className="font-mono text-amber-400 font-bold">{customExtinction.toFixed(2)} дБ/км</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={25.0}
                step={0.1}
                value={customExtinction}
                onChange={(e) => setCustomExtinction(parseFloat(e.target.value))}
                className="w-full accent-amber-400 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-950/40 border border-blue-800/50 rounded-xl text-[11px] text-blue-200/90 leading-relaxed">
            <span className="font-bold text-cyan-300">🛡️ Неуязвимость к РЭБ:</span> Лазерный пучок 1550 нм шириной в
            микрорадианы невозможно подавить радиоэлектронными помехами (РЭБ/Jamming). Перехват трафика требует физического
            попадания в узкий луч, что мгновенно регистрируется фотодетектором квантового распределения ключей (QKD).
          </div>
        </div>
      </div>

      {/* Chart: Link Budget & Data Rate vs Distance */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">
              Энергетический Бюджет FSO Линии & Скорость Канала от Дальности (1 - 40 км)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">λ = {wavelengthNm} нм | P_TX = {laserPowerMw} мВт</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={distanceChartData}>
              <defs>
                <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="distance" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Area
                type="monotone"
                dataKey="DataRate"
                name="Пропускная способность (Гбит/с)"
                stroke="#06b6d4"
                fillOpacity={1}
                fill="url(#colorSpeed)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="RxPower"
                name="Мощность RX (дБм)"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="TotalLoss"
                name="Суммарные потери (дБ)"
                stroke="#f43f5e"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
