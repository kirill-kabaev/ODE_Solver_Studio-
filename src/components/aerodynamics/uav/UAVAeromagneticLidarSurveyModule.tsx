// ============================================================================
// UAV Airborne LiDAR & Aeromagnetic Geophysical Survey Studio
// Swath Geometry, Point Density (pts/m²), Boresight Error & Magnetic Gradiometry
// ============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Compass,
  Layers,
  Activity,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Zap,
  MapPin,
  Cpu,
  TrendingUp,
  Sparkles,
  Eye,
  Radio,
  Clock,
  HardDrive,
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

export type SurveySensorType = 'lidar_riegl_vux' | 'lidar_livox_avia' | 'mag_cesium_vapor' | 'fused_lidar_mag';

export interface SurveyMissionPreset {
  id: string;
  name: string;
  sensorType: SurveySensorType;
  recommendedAltitudeM: number;
  flightSpeedMs: number;
  laserPulseRateKhz: number;
  lineSpacingM: number;
  description: string;
}

export const SURVEY_PRESETS: SurveyMissionPreset[] = [
  {
    id: 'topo_corridor_riegl',
    name: 'Высокоточная Топография & ЛЭП (RIEGL VUX-120)',
    sensorType: 'lidar_riegl_vux',
    recommendedAltitudeM: 120,
    flightSpeedMs: 16,
    laserPulseRateKhz: 600,
    lineSpacingM: 80,
    description: 'Инженерно-геодезические изыскания, съемка рельефа под кронами деревьев (до 5 отражений/импульс).',
  },
  {
    id: 'forestry_livox_light',
    name: 'Малый БПЛА с LiDAR Livox Avia (Лесотаксация)',
    sensorType: 'lidar_livox_avia',
    recommendedAltitudeM: 70,
    flightSpeedMs: 10,
    laserPulseRateKhz: 240,
    lineSpacingM: 50,
    description: 'Неповторяющийся круговой скан для плотной съемки биомассы и цифровых моделей рельефа (DTM/DSM).',
  },
  {
    id: 'geophysics_aeromag_cesium',
    name: 'Аэромагнитная Разведка Полезных Ископаемых (Цезиевый квантовый магнитометр)',
    sensorType: 'mag_cesium_vapor',
    recommendedAltitudeM: 40,
    flightSpeedMs: 14,
    laserPulseRateKhz: 0,
    lineSpacingM: 100,
    description: 'Поиск железорудных аномалий и тектонических разломов с буксируемой магнитной гондолой (Drape Flight).',
  },
];

export const UAVAeromagneticLidarSurveyModule: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [flightAltitudeM, setFlightAltitudeM] = useState<number>(100); // 30 to 300 m
  const [groundspeedMs, setGroundspeedMs] = useState<number>(14); // 5 to 30 m/s
  const [lineSpacingM, setLineSpacingM] = useState<number>(75); // 20 to 250 m
  const [lidarScanAngleDeg, setLidarScanAngleDeg] = useState<number>(60); // 30 to 120 deg
  const [laserPrfKhz, setLaserPrfKhz] = useState<number>(400); // 100 to 1000 kHz
  const [imuRollPitchErrorArcmin, setImuRollPitchErrorArcmin] = useState<number>(1.2); // 0.2 to 5 arcmin
  const [surveyAreaKm2, setSurveyAreaKm2] = useState<number>(2.5); // 0.5 to 20 km2

  // Animation
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simStep, setSimStep] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const preset = SURVEY_PRESETS[selectedPresetIdx];

  // Photogrammetric & Geophysical Calculations
  const calculations = useMemo(() => {
    // Scan Swath Width on ground: W = 2 * H * tan(FOV / 2)
    const scanAngleRad = ((lidarScanAngleDeg / 2) * Math.PI) / 180;
    const swathWidthM = 2 * flightAltitudeM * Math.tan(scanAngleRad);

    // Swath Overlap (%): Overlap = 100 * (1 - LineSpacing / SwathWidth)
    const swathOverlapPercent = Math.max(0, Math.min(95, ((swathWidthM - lineSpacingM) / swathWidthM) * 100));

    // Area Coverage Rate (km^2 / hour): Rate = Speed * LineSpacing * 3600 / 1e6
    const coverageRateKm2PerHr = (groundspeedMs * lineSpacingM * 3600) / 1e6;

    // Total Flight Time required for target area:
    const totalFlightHours = surveyAreaKm2 / Math.max(0.01, coverageRateKm2PerHr);
    const totalFlightMinutes = totalFlightHours * 60;

    // Laser Point Density (pts/m^2): Density = PRF / (Speed * SwathWidth)
    const rawPulseRateHz = laserPrfKhz * 1000;
    const pointDensityPtsPerM2 = laserPrfKhz > 0
      ? (rawPulseRateHz / (groundspeedMs * swathWidthM)) * (1 + swathOverlapPercent / 100)
      : 0;

    // Laser Beam Footprint Diameter (m): D = D0 + H * divergence
    const beamDivergenceMrad = 0.3; // 0.3 mrad standard
    const laserBeamFootprintCm = (0.015 + flightAltitudeM * (beamDivergenceMrad / 1000)) * 100;

    // Elevation Z-Error due to IMU Boresight Misalignment:
    // Delta_Z = R * tan(angle_error)
    const imuErrorRad = (imuRollPitchErrorArcmin / 60) * (Math.PI / 180);
    const slantRangeM = flightAltitudeM / Math.cos(scanAngleRad);
    const elevationZErrorCm = slantRangeM * Math.tan(imuErrorRad) * 100;

    // Aeromagnetic Anomaly Calculations (nT / meter gradient):
    const baseGeomagneticFieldNt = 52400; // nT
    const anomalyGradientNtPerM = (18000 / Math.pow(Math.max(20, flightAltitudeM), 1.6));

    // Point Cloud Storage Data Size: ~30 bytes per point
    const totalPointsMillions = (surveyAreaKm2 * 1e6 * pointDensityPtsPerM2) / 1e6;
    const rawDataGb = (totalPointsMillions * 1e6 * 30) / (1024 * 1024 * 1024);

    return {
      swathWidthM,
      swathOverlapPercent,
      coverageRateKm2PerHr,
      totalFlightMinutes,
      pointDensityPtsPerM2,
      laserBeamFootprintCm,
      elevationZErrorCm,
      anomalyGradientNtPerM,
      baseGeomagneticFieldNt,
      totalPointsMillions,
      rawDataGb,
    };
  }, [flightAltitudeM, lidarScanAngleDeg, lineSpacingM, groundspeedMs, surveyAreaKm2, laserPrfKhz, imuRollPitchErrorArcmin]);

  // Simulation timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSimStep((prev) => (prev + 1) % 400);
    }, 40);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // 2D Swath & Terrain Point Cloud Visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dark GIS Background
    ctx.fillStyle = '#060d17';
    ctx.fillRect(0, 0, w, h);

    // Ground elevation terrain profile (rolling hills)
    const groundBaseY = h - 70;
    ctx.beginPath();
    ctx.moveTo(0, groundBaseY);
    for (let x = 0; x <= w; x += 10) {
      const hill = Math.sin(x * 0.015) * 25 + Math.cos(x * 0.03) * 12;
      ctx.lineTo(x, groundBaseY + hill);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fillStyle = '#0f1f2e';
    ctx.fill();

    // Drone flight path (top altitude)
    const droneY = 60;
    const droneX = ((simStep * 2) % (w + 100)) - 50;

    // Laser Scanning Fan / Swath Cone
    const halfSwathPix = (calculations.swathWidthM / 2) * 1.2;
    const coneGrad = ctx.createLinearGradient(droneX, droneY, droneX, groundBaseY);
    coneGrad.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
    coneGrad.addColorStop(1, 'rgba(16, 185, 129, 0.05)');

    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(droneX, droneY);
    ctx.lineTo(droneX - halfSwathPix, groundBaseY);
    ctx.lineTo(droneX + halfSwathPix, groundBaseY);
    ctx.closePath();
    ctx.fill();

    // Scanning laser beam line sweeping
    const sweepAngle = Math.sin(simStep * 0.2) * (calculations.swathWidthM / 2) * 1.2;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(droneX, droneY);
    ctx.lineTo(droneX + sweepAngle, groundBaseY + Math.sin((droneX + sweepAngle) * 0.015) * 25);
    ctx.stroke();

    // Point cloud dots along scanned terrain
    ctx.fillStyle = '#34d399';
    for (let i = 0; i < 40; i++) {
      const px = droneX - halfSwathPix + Math.random() * halfSwathPix * 2;
      if (px >= 0 && px <= w) {
        const py = groundBaseY + Math.sin(px * 0.015) * 25 + Math.cos(px * 0.03) * 12 + (Math.random() - 0.5) * 4;
        ctx.fillRect(px, py, 2, 2);
      }
    }

    // Drone Body Icon
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(droneX - 12, droneY - 4, 24, 8);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(droneX - 4, droneY - 14, 8, 28);

    // Magnetic gondola towed below if aeromag
    if (preset.sensorType === 'mag_cesium_vapor') {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(droneX, droneY + 4);
      ctx.lineTo(droneX - 25, droneY + 35);
      ctx.stroke();

      // Bird gondola
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(droneX - 25, droneY + 35, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // HUD Text
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px monospace';
    ctx.fillText(`SWATH WIDTH: ${calculations.swathWidthM.toFixed(0)} m | OVERLAP: ${calculations.swathOverlapPercent.toFixed(0)}%`, 14, 22);
    ctx.fillText(`POINT DENSITY: ${calculations.pointDensityPtsPerM2.toFixed(0)} pts/m² | BEAM SPOT: ${calculations.laserBeamFootprintCm.toFixed(1)} cm`, 14, 38);
    ctx.fillStyle = '#34d399';
    ctx.fillText(`AREA COVERAGE: ${calculations.coverageRateKm2PerHr.toFixed(2)} km²/hr | FLIGHT: ${calculations.totalFlightMinutes.toFixed(0)} min`, 14, 54);
  }, [simStep, calculations, preset]);

  // Point Density vs Altitude Trade-off Curve
  const densityTradeoffData = useMemo(() => {
    const data = [];
    for (let alt = 30; alt <= 250; alt += 20) {
      const scanRad = ((lidarScanAngleDeg / 2) * Math.PI) / 180;
      const sw = 2 * alt * Math.tan(scanRad);
      const dens = laserPrfKhz > 0 ? (laserPrfKhz * 1000) / (groundspeedMs * sw) : 0;
      const zErr = (alt / Math.cos(scanRad)) * Math.tan((imuRollPitchErrorArcmin / 60) * (Math.PI / 180)) * 100;

      data.push({
        altitudeM: alt,
        densityPts: parseFloat(dens.toFixed(0)),
        zErrorCm: parseFloat(zErr.toFixed(1)),
      });
    }
    return data;
  }, [lidarScanAngleDeg, laserPrfKhz, groundspeedMs, imuRollPitchErrorArcmin]);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-teal-900/50 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-2xl border border-teal-500/40 text-teal-400">
              <Layers className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Воздушное Лазерное Сканирование (LiDAR) & Аэромагниторазведка</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  RIEGL VUX / Livox & Cesium Magnetometry
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Расчет плотности облака точек (pts/м²), ширины захвата полосы, погрешности высоты ΔZ и геофизической съемки.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Пауза' : 'Пуск'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSimStep(0)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
              title="Сброс"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Presets Grid */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {SURVEY_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedPresetIdx(idx);
                setFlightAltitudeM(p.recommendedAltitudeM);
                setGroundspeedMs(p.flightSpeedMs);
                setLaserPrfKhz(p.laserPulseRateKhz);
                setLineSpacingM(p.lineSpacingM);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer text-xs flex flex-col justify-between gap-1.5 ${
                selectedPresetIdx === idx
                  ? 'bg-gradient-to-br from-teal-950/90 to-slate-900 border-teal-400 text-white shadow-lg ring-1 ring-teal-400/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <div className="font-bold text-teal-300 flex items-center justify-between">
                <span>{p.name.split('(')[0]}</span>
                {selectedPresetIdx === idx && <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />}
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
            <span>Плотность Облака</span>
            <Layers className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            {calculations.pointDensityPtsPerM2.toFixed(0)} <span className="text-xs text-slate-400">pts/м²</span>
          </div>
          <div className="text-[10px] text-slate-500">Ширина полосы {calculations.swathWidthM.toFixed(0)} м</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Производительность</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {calculations.coverageRateKm2PerHr.toFixed(2)} <span className="text-xs text-slate-400">км²/ч</span>
          </div>
          <div className="text-[10px] text-slate-500">Перекрытие {calculations.swathOverlapPercent.toFixed(0)}%</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Погрешность ΔZ</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            &plusmn;{calculations.elevationZErrorCm.toFixed(1)} <span className="text-xs text-slate-400">см</span>
          </div>
          <div className="text-[10px] text-slate-500">IMU Boresight {imuRollPitchErrorArcmin}&apos;</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Пятно Лазера (Spot)</span>
            <Eye className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {calculations.laserBeamFootprintCm.toFixed(1)} <span className="text-xs text-slate-400">см</span>
          </div>
          <div className="text-[10px] text-slate-500">На земле при H={flightAltitudeM}м</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Время Съемки</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {calculations.totalFlightMinutes.toFixed(0)} <span className="text-xs text-slate-400">мин</span>
          </div>
          <div className="text-[10px] text-slate-500">Площадь {surveyAreaKm2} км²</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Объем Данных LAS</span>
            <HardDrive className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-2xl font-black text-pink-400">
            {calculations.rawDataGb.toFixed(1)} <span className="text-xs text-slate-400">ГБ</span>
          </div>
          <div className="text-[10px] text-slate-500">{calculations.totalPointsMillions.toFixed(1)} млн точек</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Mission & Sensor Parameters */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-teal-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-400" />
              <span>Параметры Полетного Задания & Сенсора</span>
            </h3>

            {/* Flight Altitude */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Высота Полета H над Рельефом</span>
                <span className="text-teal-300 font-bold">{flightAltitudeM} м</span>
              </div>
              <input
                type="range"
                min="30"
                max="300"
                step="10"
                value={flightAltitudeM}
                onChange={(e) => setFlightAltitudeM(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
            </div>

            {/* Flight Speed */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Путевая Скорость БПЛА</span>
                <span className="text-cyan-300 font-bold">{groundspeedMs} м/с ({(groundspeedMs * 3.6).toFixed(0)} км/ч)</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="1"
                value={groundspeedMs}
                onChange={(e) => setGroundspeedMs(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Flight Line Spacing */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Межгалсовое Расстояние (Line Spacing)</span>
                <span className="text-amber-300 font-bold">{lineSpacingM} м</span>
              </div>
              <input
                type="range"
                min="20"
                max="250"
                step="5"
                value={lineSpacingM}
                onChange={(e) => setLineSpacingM(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Laser PRF */}
            {laserPrfKhz > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Частота Импульсов Лазера (PRF)</span>
                  <span className="text-indigo-300 font-bold">{laserPrfKhz} кГц</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1200"
                  step="50"
                  value={laserPrfKhz}
                  onChange={(e) => setLaserPrfKhz(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                />
              </div>
            )}

            {/* IMU Error */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Юстировка IMU (Boresight Angular Error)</span>
                <span className="text-rose-300 font-bold">{imuRollPitchErrorArcmin.toFixed(1)}&apos; угл. мин</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="4.0"
                step="0.2"
                value={imuRollPitchErrorArcmin}
                onChange={(e) => setImuRollPitchErrorArcmin(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
              />
            </div>

            {/* Survey Area */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Целевая Площадь Съемки</span>
                <span className="text-emerald-300 font-bold">{surveyAreaKm2.toFixed(1)} км²</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="15.0"
                step="0.5"
                value={surveyAreaKm2}
                onChange={(e) => setSurveyAreaKm2(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>
          </div>
        </div>

        {/* Right 2D Animated Canvas & Trade-off Charts (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Animated 2D Viewport */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-teal-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-400" />
                <span>2D-Визуализация Сканирующего Конуса & Облака Точек Рельефа</span>
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
                LiDAR Swath Engine
              </span>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-teal-900/40 aspect-[16/9] w-full bg-slate-950">
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Density vs Altitude Chart */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>Компромисс: Плотность Точек (pts/м²) vs Ошибка Высоты ΔZ (см)</span>
              </h3>
              <FullscreenGraphButton
                domain="uav_guidance"
                title="Параметры аэрофотосъемки и LiDAR сканирования БПЛА"
              />
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={densityTradeoffData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="altitudeM" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Высота H (м)', position: 'insideBottom', offset: -5 }} />
                  <YAxis yAxisId="dens" stroke="#2dd4bf" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="z" orientation="right" stroke="#f59e0b" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line yAxisId="dens" type="monotone" dataKey="densityPts" name="Плотность (pts/м²)" stroke="#2dd4bf" strokeWidth={2.5} dot={false} />
                  <Line yAxisId="z" type="monotone" dataKey="zErrorCm" name="Погрешность ΔZ (см)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
