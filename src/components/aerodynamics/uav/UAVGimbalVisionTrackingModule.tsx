// ============================================================================
// UAV 3-Axis EO/IR Gimbal, Target Geolocalization & Vision Tracking Studio
// Gyro-Stabilization Kinematics, KCF/DeepSORT Visual Servoing & WGS-84 Ray-Casting
// ============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Camera,
  Crosshair,
  Compass,
  Target,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Activity,
  Layers,
  MapPin,
  Eye,
  Video,
  Cpu,
  TrendingUp,
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
} from 'recharts';
import { FullscreenGraphButton } from '../../telemetry/FullscreenGraphButton';

export type TrackerAlgorithmType = 'kcf_correlation' | 'mosse_fast' | 'deepsort_reid' | 'optical_flow_tld';
export type OpticalSensorType = 'eo_daylight_4k' | 'thermal_lwir_640' | 'dual_fused_vis_ir';

export interface GimbalPreset {
  id: string;
  name: string;
  panRangeDeg: number;
  tiltMinDeg: number;
  tiltMaxDeg: number;
  stabilizationJitterUrad: number; // micro-radians RMS
  sensorType: OpticalSensorType;
  opticalZoomMax: number;
  laserRangefinderKm: number;
  description: string;
}

export const GIMBAL_PRESETS: GimbalPreset[] = [
  {
    id: 'light_fpv_dual_axis',
    name: 'Малый 2-осевой подвес (FPV / Разведка)',
    panRangeDeg: 180,
    tiltMinDeg: -90,
    tiltMaxDeg: +20,
    stabilizationJitterUrad: 120,
    sensorType: 'eo_daylight_4k',
    opticalZoomMax: 10,
    laserRangefinderKm: 1.2,
    description: 'Компактный гиростабилизированный подвес с бесщеточными моторами прямого привода для дронов до 5 кг.',
  },
  {
    id: 'heavy_mil_spec_3axis',
    name: 'Военный 3-осевой гиростабилизированный ОЭС (Орлан/Форпост)',
    panRangeDeg: 360,
    tiltMinDeg: -110,
    tiltMaxDeg: +30,
    stabilizationJitterUrad: 15,
    sensorType: 'dual_fused_vis_ir',
    opticalZoomMax: 36,
    laserRangefinderKm: 5.0,
    description: 'Прецизионная платформа с волоконно-оптическими гироскопами (FOG), охлаждаемым ТВП и ЛДЦ/ЛДМ целеуказателем.',
  },
  {
    id: 'civil_survey_thermal',
    name: 'Промышленный тепловизионный подвес (FLIR Duo Pro R)',
    panRangeDeg: 360,
    tiltMinDeg: -90,
    tiltMaxDeg: +30,
    stabilizationJitterUrad: 45,
    sensorType: 'thermal_lwir_640',
    opticalZoomMax: 4,
    laserRangefinderKm: 2.0,
    description: 'Радиометрический тепловизор 640x512 для мониторинга ЛЭП, теплотрасс и поисково-спасательных операций.',
  },
];

export const UAVGimbalVisionTrackingModule: React.FC = () => {
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(1);
  const [trackerAlgorithm, setTrackerAlgorithm] = useState<TrackerAlgorithmType>('kcf_correlation');
  
  // Drone State
  const [droneAltitudeM, setDroneAltitudeM] = useState<number>(450); // 50 - 2000m
  const [droneGroundspeedMs, setDroneGroundspeedMs] = useState<number>(22); // m/s
  const [droneHeadingDeg, setDroneHeadingDeg] = useState<number>(45);
  const [droneVibrationNoiseUrad, setDroneVibrationNoiseUrad] = useState<number>(250);

  // Gimbal Target Line-of-Sight Angles
  const [gimbalAzimuthDeg, setGimbalAzimuthDeg] = useState<number>(25); // relative to heading
  const [gimbalElevationDeg, setGimbalElevationDeg] = useState<number>(-35); // tilt downwards
  const [currentZoomX, setCurrentZoomX] = useState<number>(12); // optical zoom

  // Target Motion
  const [targetSpeedKmh, setTargetSpeedKmh] = useState<number>(40);
  const [targetContrastRatio, setTargetContrastRatio] = useState<number>(0.75); // 0.1 to 1.0

  // Animation state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTimeSec, setSimTimeSec] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const preset = GIMBAL_PRESETS[selectedPresetIdx];

  // Tracker Metadata
  const trackerMeta = useMemo(() => {
    switch (trackerAlgorithm) {
      case 'kcf_correlation':
        return {
          name: 'KCF (Kernelized Correlation Filter)',
          fps: 140,
          robustness: 'Высокая скорость, чувствителен к полному перекрытию объекта',
          occlusionResistance: 0.65,
        };
      case 'mosse_fast':
        return {
          name: 'MOSSE (Minimum Output Sum of Squared Error)',
          fps: 280,
          robustness: 'Сверхбыстрый трекер для микроконтроллеров, низкая устойчивость к масштабированию',
          occlusionResistance: 0.45,
        };
      case 'deepsort_reid':
        return {
          name: 'DeepSORT + ReID CNN (Нейросетевой трекинг)',
          fps: 35,
          robustness: 'Уверенное восстановление захвата после выхода цели из-за препятствий',
          occlusionResistance: 0.95,
        };
      case 'optical_flow_tld':
        return {
          name: 'TLD (Tracking-Learning-Detection)',
          fps: 50,
          robustness: 'Самообучающийся детектор с реидентификацией контура цели',
          occlusionResistance: 0.82,
        };
    }
  }, [trackerAlgorithm]);

  // Geometric & Photogrammetric Calculations
  const calculations = useMemo(() => {
    // Slant Range to ground target: R_slant = H / sin(|elevation|)
    const elevRad = Math.abs((gimbalElevationDeg * Math.PI) / 180);
    const slantRangeM = droneAltitudeM / Math.max(0.05, Math.sin(elevRad));
    const groundDistanceM = droneAltitudeM / Math.max(0.05, Math.tan(elevRad));

    // Field of View at current zoom:
    // Base FOV_wide = 60 deg -> FOV_tele = FOV_wide / zoom
    const hFovDeg = 60.0 / Math.max(1, currentZoomX);
    const vFovDeg = 36.0 / Math.max(1, currentZoomX);

    // Ground footprint width: W_ground = 2 * R_slant * tan(hFov / 2)
    const groundFootprintWidthM = 2 * slantRangeM * Math.tan(((hFovDeg / 2) * Math.PI) / 180);

    // Ground Sampling Distance (GSD) for 4K sensor (3840 pixels):
    const gsdCmPerPixel = (groundFootprintWidthM / 3840) * 100;

    // Line-of-sight stabilization residual jitter:
    const baseJitter = preset.stabilizationJitterUrad;
    const residualJitterUrad = Math.sqrt(Math.pow(baseJitter, 2) + Math.pow(droneVibrationNoiseUrad * 0.08, 2));

    // Jitter in image plane (pixels of blur):
    const pixelSmear = (residualJitterUrad * 1e-6 * 3840) / ((hFovDeg * Math.PI) / 180);

    // Target tracking confidence (0 to 100%)
    const targetAngularRateDegPerSec = (targetSpeedKmh / 3.6 / slantRangeM) * (180 / Math.PI);
    const trackingConfidence = Math.max(
      10,
      Math.min(
        99,
        (targetContrastRatio * 85 + trackerMeta.occlusionResistance * 20 - (targetAngularRateDegPerSec / 5) * 15 - pixelSmear * 4)
      )
    );

    // Target Geolocalization Error (WGS-84 Ray-Casting with IMU & LRF error):
    // Delta_Pos = R * delta_angle + delta_LRF + delta_GPS
    const imuAngleErrorRad = 0.0012; // ~4 arcmin
    const lrfDistanceErrorM = 1.5;
    const droneGpsErrorM = 2.0;
    const targetLocationErrorCEPM = Math.sqrt(
      Math.pow(slantRangeM * imuAngleErrorRad, 2) + Math.pow(lrfDistanceErrorM, 2) + Math.pow(droneGpsErrorM, 2)
    );

    // Target Coordinates Offset relative to drone (East, North) in meters:
    const trueAzimuthDeg = (droneHeadingDeg + gimbalAzimuthDeg) % 360;
    const azimRad = (trueAzimuthDeg * Math.PI) / 180;
    const targetDeltaEastM = groundDistanceM * Math.sin(azimRad);
    const targetDeltaNorthM = groundDistanceM * Math.cos(azimRad);

    return {
      slantRangeM,
      groundDistanceM,
      hFovDeg,
      vFovDeg,
      groundFootprintWidthM,
      gsdCmPerPixel,
      residualJitterUrad,
      pixelSmear,
      trackingConfidence,
      targetLocationErrorCEPM,
      trueAzimuthDeg,
      targetDeltaEastM,
      targetDeltaNorthM,
    };
  }, [droneAltitudeM, gimbalElevationDeg, currentZoomX, preset, droneVibrationNoiseUrad, targetSpeedKmh, targetContrastRatio, trackerMeta, droneHeadingDeg, gimbalAzimuthDeg]);

  // Simulation timer loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSimTimeSec((prev) => prev + 0.05);
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Canvas Optical Reticle HUD & Dynamic Target Simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Background color based on sensor type
    if (preset.sensorType === 'thermal_lwir_640') {
      // White-Hot / Black-Hot thermal Palette
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, w, h);
    } else {
      // Daylight EO Video
      ctx.fillStyle = '#06131c';
      ctx.fillRect(0, 0, w, h);
    }

    // Draw terrain textures & road lines
    ctx.strokeStyle = preset.sensorType === 'thermal_lwir_640' ? 'rgba(255,255,255,0.06)' : 'rgba(56,189,248,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }

    // Moving ground target (e.g. military truck / vehicle)
    const cx = w / 2;
    const cy = h / 2;

    // Target displacement with small sine weave
    const targetOffsetX = Math.sin(simTimeSec * 1.2) * 45;
    const targetOffsetY = Math.cos(simTimeSec * 0.9) * 20;

    const tx = cx + targetOffsetX;
    const ty = cy + targetOffsetY;

    // Draw vehicle
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(Math.PI / 4 + Math.sin(simTimeSec * 0.5) * 0.2);

    if (preset.sensorType === 'thermal_lwir_640') {
      // Thermal hot engine block glow
      ctx.fillStyle = '#f8fafc'; // hot engine
      ctx.fillRect(-12, -7, 24, 14);
      ctx.fillStyle = '#fb923c'; // heat plume
      ctx.fillRect(-18, -4, 6, 8);
    } else {
      // Daylight vehicle
      ctx.fillStyle = '#10b981';
      ctx.fillRect(-14, -8, 28, 16);
      ctx.fillStyle = '#047857';
      ctx.fillRect(-6, -6, 12, 12);
    }
    ctx.restore();

    // Bounding Box (Tracker Box)
    const isLocked = calculations.trackingConfidence > 40;
    ctx.strokeStyle = isLocked ? '#22c55e' : '#f43f5e';
    ctx.lineWidth = 2;
    const boxSize = 44;

    // Corner brackets for military HUD style
    const cornerLen = 10;
    const bx = tx - boxSize / 2;
    const by = ty - boxSize / 2;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(bx, by + cornerLen);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + cornerLen, by);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(bx + boxSize - cornerLen, by);
    ctx.lineTo(bx + boxSize, by);
    ctx.lineTo(bx + boxSize, by + cornerLen);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(bx, by + boxSize - cornerLen);
    ctx.lineTo(bx, by + boxSize);
    ctx.lineTo(bx + cornerLen, by + boxSize);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(bx + boxSize - cornerLen, by + boxSize);
    ctx.lineTo(bx + boxSize, by + boxSize);
    ctx.lineTo(bx + boxSize, by + boxSize - cornerLen);
    ctx.stroke();

    // Center Crosshair
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 30, cy);
    ctx.lineTo(cx - 8, cy);
    ctx.moveTo(cx + 8, cy);
    ctx.lineTo(cx + 30, cy);
    ctx.moveTo(cx, cy - 30);
    ctx.lineTo(cx, cy - 8);
    ctx.moveTo(cx, cy + 8);
    ctx.lineTo(cx, cy + 30);
    ctx.stroke();

    // Central reticle dot
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#eab308';
    ctx.fill();

    // Tracking Vector Line connecting center to target
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);

    // OSD HUD Overlay text
    ctx.fillStyle = '#22d3ee';
    ctx.font = '11px monospace';
    ctx.fillText(`LRF RANGE: ${(calculations.slantRangeM / 1000).toFixed(2)} km | ZOOM: ${currentZoomX.toFixed(1)}X`, 14, 22);
    ctx.fillText(`AZ: ${calculations.trueAzimuthDeg.toFixed(1)}° | EL: ${gimbalElevationDeg.toFixed(1)}° | GSD: ${calculations.gsdCmPerPixel.toFixed(1)} cm/px`, 14, 38);
    ctx.fillText(`LOCK: [${trackerAlgorithm.toUpperCase()}] ${calculations.trackingConfidence.toFixed(0)}%`, 14, 54);

    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`TGT TGT-GEO CEP: ±${calculations.targetLocationErrorCEPM.toFixed(1)} m`, 14, h - 16);
  }, [simTimeSec, preset, calculations, currentZoomX, gimbalElevationDeg, trackerAlgorithm]);

  // Tracking Error and Jitter Time-Series Chart Data
  const trackingTimeData = useMemo(() => {
    const data = [];
    for (let t = 0; t <= 10; t += 0.5) {
      const kcfErr = 1.2 + 0.4 * Math.sin(t * 1.5) + (droneVibrationNoiseUrad / 300) * 1.5;
      const mosseErr = 2.1 + 0.8 * Math.sin(t * 2.1) + (droneVibrationNoiseUrad / 300) * 2.2;
      const deepSortErr = 0.6 + 0.2 * Math.sin(t * 0.8) + (droneVibrationNoiseUrad / 300) * 0.6;

      data.push({
        timeSec: t,
        kcf: parseFloat(kcfErr.toFixed(2)),
        mosse: parseFloat(mosseErr.toFixed(2)),
        deepsort: parseFloat(deepSortErr.toFixed(2)),
      });
    }
    return data;
  }, [droneVibrationNoiseUrad]);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-sky-900/50 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-sky-500/20 to-indigo-500/20 rounded-2xl border border-sky-500/40 text-sky-400">
              <Camera className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>3-Осевой Оптико-Электронный Подвес & Автотрекинг Целей</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  Visual Servoing & WGS-84 Geo
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Гиростабилизация линии визирования (LOS), алгоритмы KCF/DeepSORT, лазерный дальномер и геопривязка координат цели.
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
              onClick={() => setSimTimeSec(0)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
              title="Сброс"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Presets Grid */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {GIMBAL_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPresetIdx(idx)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer text-xs flex flex-col justify-between gap-1.5 ${
                selectedPresetIdx === idx
                  ? 'bg-gradient-to-br from-sky-950/90 to-slate-900 border-sky-400 text-white shadow-lg ring-1 ring-sky-400/40'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <div className="font-bold text-sky-300 flex items-center justify-between">
                <span>{p.name.split('(')[0]}</span>
                {selectedPresetIdx === idx && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />}
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
            <span>Наклонная Дальность</span>
            <Target className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">
            {(calculations.slantRangeM / 1000).toFixed(2)} <span className="text-xs text-slate-400">км</span>
          </div>
          <div className="text-[10px] text-slate-500">По лучу дальномера LRF</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Доверие Захвата</span>
            <Crosshair className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {calculations.trackingConfidence.toFixed(0)}%
          </div>
          <div className="text-[10px] text-slate-500">
            {calculations.trackingConfidence > 60 ? 'Устойчивое автосопровождение' : 'Внимание: срыв захвата'}
          </div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Разрешение GSD</span>
            <Eye className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {calculations.gsdCmPerPixel.toFixed(1)} <span className="text-xs text-slate-400">см/пкс</span>
          </div>
          <div className="text-[10px] text-slate-500">Ширина кадра: {calculations.groundFootprintWidthM.toFixed(0)} м</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Ошибка Геопривязки</span>
            <MapPin className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            &plusmn;{calculations.targetLocationErrorCEPM.toFixed(1)} <span className="text-xs text-slate-400">м</span>
          </div>
          <div className="text-[10px] text-slate-500">CEP координат WGS-84</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Дрожание ОЭС (Jitter)</span>
            <Activity className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-2xl font-black text-pink-400">
            {calculations.residualJitterUrad.toFixed(0)} <span className="text-xs text-slate-400">&mu;rad</span>
          </div>
          <div className="text-[10px] text-slate-500">Смаз: {calculations.pixelSmear.toFixed(1)} px</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Частота Трекера</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {trackerMeta.fps} <span className="text-xs text-slate-400">FPS</span>
          </div>
          <div className="text-[10px] text-slate-500">{trackerMeta.name.split('(')[0]}</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Tracking Algorithm Selection */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-sky-300 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span>Алгоритм Компьютерного Зрения & Сопровождения</span>
            </h3>

            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'kcf_correlation', name: '1. KCF (Kernelized Correlation Filter)' },
                { id: 'mosse_fast', name: '2. MOSSE (Сверхбыстрый корреляционный)' },
                { id: 'deepsort_reid', name: '3. DeepSORT + ReID (Нейросетевой с памятью)' },
                { id: 'optical_flow_tld', name: '4. TLD (Tracking-Learning-Detection)' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTrackerAlgorithm(item.id as TrackerAlgorithmType)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer text-xs flex flex-col gap-1 ${
                    trackerAlgorithm === item.id
                      ? 'bg-gradient-to-r from-sky-950/90 to-slate-900 border-sky-400 text-white shadow-lg ring-1 ring-sky-400/40'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="font-bold text-sky-300 flex items-center justify-between">
                    <span>{item.name}</span>
                    {trackerAlgorithm === item.id && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 italic pt-1">{trackerMeta.robustness}</p>
          </div>

          {/* Flight & Gimbal Angles */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Параметры Полета & Углы Визирования</span>
            </h3>

            {/* Flight Altitude */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Высота Полета H</span>
                <span className="text-sky-300 font-bold">{droneAltitudeM} м</span>
              </div>
              <input
                type="range"
                min="50"
                max="2000"
                step="50"
                value={droneAltitudeM}
                onChange={(e) => setDroneAltitudeM(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>

            {/* Optical Zoom */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Оптический Зум Камеры</span>
                <span className="text-indigo-300 font-bold">{currentZoomX.toFixed(1)}X</span>
              </div>
              <input
                type="range"
                min="1"
                max={preset.opticalZoomMax}
                step="0.5"
                value={currentZoomX}
                onChange={(e) => setCurrentZoomX(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>1X (Широкий FOV {60}°)</span>
                <span>{preset.opticalZoomMax}X (Телевик FOV {(60 / preset.opticalZoomMax).toFixed(1)}°)</span>
              </div>
            </div>

            {/* Elevation Angle (Tilt) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Угол Места (Тангаж ОЭС)</span>
                <span className="text-amber-300 font-bold">{gimbalElevationDeg}°</span>
              </div>
              <input
                type="range"
                min={preset.tiltMinDeg}
                max={preset.tiltMaxDeg}
                step="1"
                value={gimbalElevationDeg}
                onChange={(e) => setGimbalElevationDeg(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Drone Vibration Noise */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Вибрационная Нагрузка от Моторов БПЛА</span>
                <span className="text-pink-300 font-bold">{droneVibrationNoiseUrad} &mu;rad</span>
              </div>
              <input
                type="range"
                min="20"
                max="800"
                step="20"
                value={droneVibrationNoiseUrad}
                onChange={(e) => setDroneVibrationNoiseUrad(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-400"
              />
            </div>

            {/* Target Contrast */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Оптический Контраст Цели к Фону</span>
                <span className="text-emerald-300 font-bold">{(targetContrastRatio * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={targetContrastRatio}
                onChange={(e) => setTargetContrastRatio(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>
          </div>
        </div>

        {/* Right HUD Viewport & Tracking Error Chart (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Live OSD Optical Viewport */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-sky-300 flex items-center gap-2">
                <Video className="w-4 h-4 text-sky-400" />
                <span>Оптико-Электронный Видоискатель & Сетка Автосопровождения</span>
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                1080p Stabilized Feed
              </span>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-sky-900/40 aspect-[16/9] w-full bg-slate-950">
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-slate-400 pt-1">
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-500">Смещение Восток (dX)</div>
                <div className="text-sky-300 font-bold">{calculations.targetDeltaEastM.toFixed(0)} м</div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-500">Смещение Север (dY)</div>
                <div className="text-sky-300 font-bold">{calculations.targetDeltaNorthM.toFixed(0)} м</div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-500">Дистанция по земле</div>
                <div className="text-emerald-300 font-bold">{(calculations.groundDistanceM / 1000).toFixed(2)} км</div>
              </div>
            </div>
          </div>

          {/* Tracking Accuracy Chart */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span>Динамическая Ошибка Сопровождения Контура (Пикселей)</span>
              </h3>
              <FullscreenGraphButton
                domain="uav_guidance"
                title="Динамическая погрешность автосопровождения цели ОЭС"
              />
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trackingTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="timeSec" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="kcf" name="KCF Tracker" stroke="#38bdf8" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="mosse" name="MOSSE Fast" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="deepsort" name="DeepSORT ReID" stroke="#10b981" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
