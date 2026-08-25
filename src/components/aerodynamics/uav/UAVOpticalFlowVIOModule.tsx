// ============================================================================
// UAV Optical Flow & Visual-Inertial Odometry (VIO / V-SLAM) Module
// GPS-Denied Precision Navigation, Lucas-Kanade Feature Tracking & EKF Fusion
// ============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Eye,
  Camera,
  Layers,
  Compass,
  Cpu,
  Zap,
  Activity,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Navigation,
  Lock,
  Unlock,
  Crosshair,
  TrendingUp,
  Sparkles,
  Sun,
  Moon,
  Wind,
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
  ScatterChart,
  Scatter,
} from 'recharts';
import { FullscreenGraphButton } from '../../telemetry/FullscreenGraphButton';

export type SurfaceTextureType = 'concrete_urban' | 'grass_field' | 'water_snow' | 'indoor_tiles';
export type VIOPipelineType = 'pure_imu' | 'optical_flow_range' | 'vio_stereo_ekf' | 'orb_slam3_loop_closure';
export type ComputeHardwareType = 'stm32h7_mcu' | 'rpi5_companion' | 'jetson_orin_nano';

export interface VIOFeaturePoint {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  confidence: number;
}

export const UAVOpticalFlowVIOModule: React.FC = () => {
  // Navigation & Flight Settings
  const [pipeline, setPipeline] = useState<VIOPipelineType>('vio_stereo_ekf');
  const [surface, setSurface] = useState<SurfaceTextureType>('concrete_urban');
  const [hardware, setHardware] = useState<ComputeHardwareType>('jetson_orin_nano');

  const [flightAltitudeM, setFlightAltitudeM] = useState<number>(2.5); // 0.5 - 25m
  const [flightSpeedMs, setFlightSpeedMs] = useState<number>(3.5); // 0 - 15 m/s
  const [ambientLightLux, setAmbientLightLux] = useState<number>(350); // 5 - 1500 lux
  const [gyroAngularRateDps, setGyroAngularRateDps] = useState<number>(15); // 0 - 120 deg/s rotation
  const [lidarRangeAccuracyMm, setLidarRangeAccuracyMm] = useState<number>(15); // 5 - 50 mm
  const [imuNoiseDensityUg, setImuNoiseDensityUg] = useState<number>(80); // 20 - 300 ug/sqrt(Hz)

  // Interactive Live Animation
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simTimeSec, setSimTimeSec] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Surface texture quality map
  const surfaceMeta = useMemo(() => {
    switch (surface) {
      case 'concrete_urban':
        return {
          name: 'Городской бетон / асфальт',
          featureDensity: 0.95,
          contrast: 0.88,
          desc: 'Высокая плотность контрастных текстурных граней, идеальный трекинг FAST/ORB.',
        };
      case 'grass_field':
        return {
          name: 'Травяной покров / поле',
          featureDensity: 0.72,
          contrast: 0.65,
          desc: 'Умеренная контрастность, периодическое смещение травинок от спутной струи винтов.',
        };
      case 'water_snow':
        return {
          name: 'Водная гладь / свежий снег',
          featureDensity: 0.18,
          contrast: 0.15,
          desc: 'Критически низкий контраст, дефицит ключевых точек, риск срыва оптического потока.',
        };
      case 'indoor_tiles':
        return {
          name: 'Интерьерная плитка / ангар',
          featureDensity: 0.85,
          contrast: 0.92,
          desc: 'Четкая сетка швов и отражений, отличная применимость для Lucas-Kanade.',
        };
    }
  }, [surface]);

  // Hardware computation budget
  const hardwareMeta = useMemo(() => {
    switch (hardware) {
      case 'stm32h7_mcu':
        return {
          name: 'STM32H7 (480 MHz ARM Cortex-M7)',
          maxFps: 45,
          maxFeatures: 60,
          powerWatts: 0.8,
          resolution: '64x64 (PMW3901 Flow)',
        };
      case 'rpi5_companion':
        return {
          name: 'Raspberry Pi 5 (Quad Cortex-A76)',
          maxFps: 60,
          maxFeatures: 250,
          powerWatts: 6.5,
          resolution: '640x480 (VIO Monocular)',
        };
      case 'jetson_orin_nano':
        return {
          name: 'NVIDIA Jetson Orin Nano (40 TOPS GPU)',
          maxFps: 90,
          maxFeatures: 800,
          powerWatts: 10.0,
          resolution: '1280x720 (Stereo VIO + Loop Closure)',
        };
    }
  }, [hardware]);

  // Mathematical Calculations & EKF Error Propagation
  const calculations = useMemo(() => {
    // 1. Lighting factor (0 to 1)
    const luxFactor = Math.min(1.0, Math.max(0.1, ambientLightLux / 400));
    
    // 2. Usable tracked features count
    const baseFeatures = hardwareMeta.maxFeatures;
    const activeFeaturesCount = Math.round(
      baseFeatures * surfaceMeta.featureDensity * luxFactor * (1 - Math.min(0.6, gyroAngularRateDps / 200))
    );

    // 3. Optical Flow measurement validity
    // Lucas-Kanade velocity equation: v_flow = (dx/dt) * (altitude / focal_length) - gyro_comp
    const flowReliability = activeFeaturesCount >= 20 ? Math.min(0.99, 0.5 + activeFeaturesCount / (baseFeatures * 1.2)) : 0.25;

    // 4. Position drift per minute (meters)
    let driftPerMinM = 0;
    let cepError10minM = 0;
    let confidenceScore = 0;

    switch (pipeline) {
      case 'pure_imu':
        // Dead Reckoning: error = 0.5 * noise * t^2 + bias_drift * t
        driftPerMinM = (imuNoiseDensityUg / 50) * 18.5; // High drift ~30-60 m/min
        cepError10minM = driftPerMinM * 10 * 2.8;
        confidenceScore = 15;
        break;
      case 'optical_flow_range':
        // Optical Flow + ToF LiDAR: bounded linear drift
        driftPerMinM = (flightSpeedMs * 0.08 + (1 - flowReliability) * 3.5) * (1 + (lidarRangeAccuracyMm / 50) * 0.3);
        cepError10minM = driftPerMinM * 4.2;
        confidenceScore = flowReliability * 75;
        break;
      case 'vio_stereo_ekf':
        // Stereo Visual-Inertial Odometry: tight EKF fusion
        driftPerMinM = (0.25 + (1 - flowReliability) * 1.2) * (flightSpeedMs / 5 + 0.5);
        cepError10minM = driftPerMinM * 2.2;
        confidenceScore = Math.max(20, flowReliability * 92);
        break;
      case 'orb_slam3_loop_closure':
        // V-SLAM with global bundle adjustment & loop closing
        driftPerMinM = 0.06 + (1 - flowReliability) * 0.4;
        cepError10minM = 0.45 + (1 - flowReliability) * 1.5; // Bounded error
        confidenceScore = Math.max(30, flowReliability * 98);
        break;
    }

    // 5. Angular Gyro Compensation Quality
    const gyroCompQualityPercent = Math.max(40, 100 - (gyroAngularRateDps / 120) * 45);

    // 6. Max Safe Groundspeed without blur
    const maxSafeAirspeedMs = Math.min(18, (flightAltitudeM * hardwareMeta.maxFps * 0.12) * (ambientLightLux > 100 ? 1.0 : 0.5));

    return {
      activeFeaturesCount,
      flowReliability,
      driftPerMinM,
      cepError10minM,
      confidenceScore,
      gyroCompQualityPercent,
      maxSafeAirspeedMs,
      luxFactor,
    };
  }, [pipeline, surface, hardwareMeta, surfaceMeta, flightAltitudeM, flightSpeedMs, ambientLightLux, gyroAngularRateDps, lidarRangeAccuracyMm, imuNoiseDensityUg]);

  // Simulation loop
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSimTimeSec((prev) => prev + 0.1);
    }, 100);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Canvas visual rendering of Feature Tracks & Optical Flow Vectors
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background with dark military HUD tone
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Draw textured ground grid or surface simulation
    ctx.strokeStyle = surface === 'water_snow' ? 'rgba(56, 189, 248, 0.08)' : 'rgba(52, 211, 153, 0.12)';
    ctx.lineWidth = 1;
    const gridSize = 30;
    const offsetX = (simTimeSec * flightSpeedMs * 15) % gridSize;
    const offsetY = (simTimeSec * 10) % gridSize;

    for (let x = -gridSize + offsetX; x < width + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = -gridSize + offsetY; y < height + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Generate pseudo feature points
    const numPoints = Math.min(120, Math.max(6, calculations.activeFeaturesCount));
    const flowMagnitude = (flightSpeedMs / 10) * 28 + (gyroAngularRateDps / 60) * 10;

    for (let i = 0; i < numPoints; i++) {
      const seedX = (Math.sin(i * 997 + 1) * 0.5 + 0.5) * width;
      const seedY = (Math.cos(i * 433 + 2) * 0.5 + 0.5) * height;

      // Motion drift
      const currentX = (seedX - (simTimeSec * flightSpeedMs * 30) % width + width) % width;
      const currentY = (seedY + Math.sin(simTimeSec * 2 + i) * 6) % height;

      // Optical flow vector
      const vecX = -flowMagnitude * (1 + (i % 3) * 0.2);
      const vecY = Math.sin(simTimeSec * 1.5 + i) * 4;

      // Feature marker (FAST / Harris corner box)
      const isConfident = calculations.flowReliability > 0.6;
      ctx.strokeStyle = isConfident ? '#10b981' : '#f59e0b';
      ctx.fillStyle = isConfident ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)';
      ctx.lineWidth = 1.5;

      const boxSize = 8;
      ctx.strokeRect(currentX - boxSize / 2, currentY - boxSize / 2, boxSize, boxSize);
      ctx.fillRect(currentX - boxSize / 2, currentY - boxSize / 2, boxSize, boxSize);

      // Flow Vector line
      ctx.beginPath();
      ctx.moveTo(currentX, currentY);
      ctx.lineTo(currentX + vecX, currentY + vecY);
      ctx.strokeStyle = '#06b6d4';
      ctx.stroke();

      // Vector head
      ctx.beginPath();
      ctx.arc(currentX + vecX, currentY + vecY, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
    }

    // Camera Crosshair Center
    const cx = width / 2;
    const cy = height / 2;
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.7)';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(cx - 20, cy);
    ctx.lineTo(cx + 20, cy);
    ctx.moveTo(cx, cy - 20);
    ctx.lineTo(cx, cy + 20);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // HUD Text overlay inside canvas
    ctx.fillStyle = '#38bdf8';
    ctx.font = '10px monospace';
    ctx.fillText(`FLOW FPS: ${hardwareMeta.maxFps} Hz | FEATURES: ${calculations.activeFeaturesCount}`, 12, 20);
    ctx.fillText(`ALTITUDE: ${flightAltitudeM.toFixed(2)} m (ToF LiDAR) | SPEED: ${flightSpeedMs.toFixed(1)} m/s`, 12, 36);
    ctx.fillText(`CONFIDENCE: ${calculations.confidenceScore.toFixed(0)}% [${pipeline.toUpperCase()}]`, 12, 52);
  }, [simTimeSec, flightSpeedMs, gyroAngularRateDps, flightAltitudeM, calculations, hardwareMeta, pipeline, surface]);

  // Trajectory Comparison Time-Series Data (10 minutes drift)
  const trajectoryChartData = useMemo(() => {
    const data = [];
    for (let t = 0; t <= 10; t += 0.5) {
      const imuDrift = (imuNoiseDensityUg / 50) * 1.8 * Math.pow(t, 2);
      const flowDrift = ((flightSpeedMs * 0.08 + (1 - calculations.flowReliability) * 3.5) * t) / Math.sqrt(Math.max(1, t));
      const vioDrift = (0.25 + (1 - calculations.flowReliability) * 1.2) * Math.sqrt(t) * 1.4;
      const slamDrift = Math.min(1.2, 0.2 + 0.1 * Math.log(t + 1));

      data.push({
        timeMin: t,
        pureImu: parseFloat(imuDrift.toFixed(2)),
        opticalFlow: parseFloat(flowDrift.toFixed(2)),
        vioStereo: parseFloat(vioDrift.toFixed(2)),
        orbSlam3: parseFloat(slamDrift.toFixed(2)),
        currentSelected:
          pipeline === 'pure_imu'
            ? parseFloat(imuDrift.toFixed(2))
            : pipeline === 'optical_flow_range'
            ? parseFloat(flowDrift.toFixed(2))
            : pipeline === 'vio_stereo_ekf'
            ? parseFloat(vioDrift.toFixed(2))
            : parseFloat(slamDrift.toFixed(2)),
      });
    }
    return data;
  }, [imuNoiseDensityUg, flightSpeedMs, calculations.flowReliability, pipeline]);

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-teal-900/50 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-2xl border border-teal-500/40 text-teal-400">
              <Eye className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Оптический Поток & VIO/V-SLAM Навигация (GPS-Denied)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  Lucas-Kanade & EKF
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Автономное удержание позиции и одометрия БПЛА в условиях полного подавления спутниковой навигации РЭБ.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsRunning(!isRunning)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isRunning
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRunning ? 'Пауза' : 'Пуск'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSimTimeSec(0)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
              title="Сброс таймера"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Активные Точки</span>
            <Camera className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400">
            {calculations.activeFeaturesCount} <span className="text-xs text-slate-400">pts</span>
          </div>
          <div className="text-[10px] text-slate-500">
            {calculations.activeFeaturesCount > 30 ? 'Надежный захват' : 'Дефицит контраста'}
          </div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Дрейф Позиции</span>
            <Navigation className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {calculations.driftPerMinM.toFixed(2)} <span className="text-xs text-slate-400">м/мин</span>
          </div>
          <div className="text-[10px] text-slate-500">Скорость накопления ошибки</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>CEP За 10 Мин</span>
            <Crosshair className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {calculations.cepError10minM.toFixed(2)} <span className="text-xs text-slate-400">м</span>
          </div>
          <div className="text-[10px] text-slate-500">Вероятный радиус погрешности</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>EKF Доверие</span>
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {calculations.confidenceScore.toFixed(0)}%
          </div>
          <div className="text-[10px] text-slate-500">
            {calculations.confidenceScore > 75 ? 'Высокая точность' : 'Внимание: дрейф'}
          </div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Частота Кадров</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">
            {hardwareMeta.maxFps} <span className="text-xs text-slate-400">FPS</span>
          </div>
          <div className="text-[10px] text-slate-500">{hardwareMeta.resolution}</div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs flex items-center justify-between">
            <span>Макс. Скорость</span>
            <TrendingUp className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-2xl font-black text-pink-400">
            {calculations.maxSafeAirspeedMs.toFixed(1)} <span className="text-xs text-slate-400">м/с</span>
          </div>
          <div className="text-[10px] text-slate-500">Без смаза оптического потока</div>
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Algorithm Pipeline Selection */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-teal-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-400" />
              <span>Архитектура Навигационного Комплекса</span>
            </h3>

            <div className="grid grid-cols-1 gap-2">
              {[
                {
                  id: 'pure_imu',
                  name: '1. Чистая Инерциалка (Dead Reckoning IMU)',
                  desc: 'Только акселерометры и гироскопы. Катастрофический квадратичный дрейф t² без внешних датчиков.',
                },
                {
                  id: 'optical_flow_range',
                  name: '2. Оптический Поток + ToF Лазер (PMW3901 + VL53L1X)',
                  desc: 'Линейный дрейф, удержание точки на малых высотах до 5 метров, компенсация гироскопом.',
                },
                {
                  id: 'vio_stereo_ekf',
                  name: '3. Stereo Visual-Inertial Odometry (VIO EKF)',
                  desc: 'Стереокамера 6-DoF + IMU на частоте 60-90 Гц. Субметровая точность без спутников.',
                },
                {
                  id: 'orb_slam3_loop_closure',
                  name: '4. Полный V-SLAM (ORB-SLAM3 / Loop Closure)',
                  desc: 'Построение 3D-карты ориентиров, распознавание ранее посещенных зон и сброс ошибки дрейфа до нуля.',
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPipeline(item.id as VIOPipelineType)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer text-xs flex flex-col gap-1 ${
                    pipeline === item.id
                      ? 'bg-gradient-to-r from-teal-950/90 to-slate-900 border-teal-400 text-white shadow-lg ring-1 ring-teal-400/40'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="font-bold text-teal-300 flex items-center justify-between">
                    <span>{item.name}</span>
                    {pipeline === item.id && <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Environmental & Surface Settings */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Параметры Среды & Подстилающей Поверхности</span>
            </h3>

            {/* Surface Type */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Тип Поверхности под Дроном</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'concrete_urban', label: 'Бетон / Город' },
                  { id: 'grass_field', label: 'Трава / Поле' },
                  { id: 'indoor_tiles', label: 'Плитка / Ангар' },
                  { id: 'water_snow', label: 'Вода / Снег (Срыв)' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSurface(s.id as SurfaceTextureType)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      surface === s.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 italic mt-1">{surfaceMeta.desc}</p>
            </div>

            {/* Ambient Lighting */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-400" /> Освещенность
                </span>
                <span className="text-amber-300 font-bold">{ambientLightLux} Lux</span>
              </div>
              <input
                type="range"
                min="5"
                max="1500"
                step="25"
                value={ambientLightLux}
                onChange={(e) => setAmbientLightLux(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>5 Lux (Ночь/Сумерки)</span>
                <span>400 Lux (Пасмурно)</span>
                <span>1500 Lux (Яркое солнце)</span>
              </div>
            </div>

            {/* Flight Altitude */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Высота Полета (ToF LiDAR)</span>
                <span className="text-cyan-300 font-bold">{flightAltitudeM.toFixed(1)} м</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="25"
                step="0.5"
                value={flightAltitudeM}
                onChange={(e) => setFlightAltitudeM(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Flight Speed */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Путевая Скорость БПЛА</span>
                <span className="text-indigo-300 font-bold">{flightSpeedMs.toFixed(1)} м/с</span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                step="0.5"
                value={flightSpeedMs}
                onChange={(e) => setFlightSpeedMs(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
            </div>

            {/* Angular Rate (Gyro rotation) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Угловая Скорость Вращения (Рыскание/Крен)</span>
                <span className="text-pink-300 font-bold">{gyroAngularRateDps} °/с</span>
              </div>
              <input
                type="range"
                min="0"
                max="120"
                step="5"
                value={gyroAngularRateDps}
                onChange={(e) => setGyroAngularRateDps(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-400"
              />
              <div className="text-[10px] text-slate-500">
                Качество гирокомпенсации: {calculations.gyroCompQualityPercent.toFixed(0)}%
              </div>
            </div>
          </div>
        </div>

        {/* Right Dynamic Visual Canvas & Charts (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Live Feature Tracking HUD Viewport */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-teal-300 flex items-center gap-2">
                <Camera className="w-4 h-4 text-teal-400" />
                <span>Оптический Видоискатель & Векторы Потока (Lucas-Kanade)</span>
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
                Live Sensor Feed
              </span>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-teal-900/40 aspect-[16/9] w-full bg-slate-950">
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                className="w-full h-full object-cover"
              />

              {calculations.flowReliability < 0.4 && (
                <div className="absolute inset-0 bg-red-950/40 backdrop-blur-[2px] flex items-center justify-center p-4">
                  <div className="bg-slate-900/90 border border-red-500 p-3 rounded-2xl flex items-center gap-3 text-red-300 font-mono text-xs shadow-2xl">
                    <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse flex-shrink-0" />
                    <div>
                      <div className="font-bold">ВНИМАНИЕ: СРЫВ ОПТИЧЕСКОГО ПОТОКА</div>
                      <div className="text-[11px] text-slate-400">Недостаток текстурных признаков или экстремальная темнота.</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-slate-400 pt-1">
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-500">Плотность признаков</div>
                <div className="text-teal-300 font-bold">{(surfaceMeta.featureDensity * 100).toFixed(0)}%</div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-500">Освещенность</div>
                <div className="text-amber-300 font-bold">{(calculations.luxFactor * 100).toFixed(0)}%</div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-500">Надежность Потока</div>
                <div className="text-emerald-300 font-bold">{(calculations.flowReliability * 100).toFixed(0)}%</div>
              </div>
            </div>
          </div>

          {/* Drift Over Time Chart */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>Накопление Ошибки Позиции (Дрейф) за 10 Минут Полета (м)</span>
              </h3>
              <FullscreenGraphButton
                domain="uav_guidance"
                title="Накопление ошибки навигации без GNSS (м)"
              />
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trajectoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="timeMin" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="pureImu" name="Чистая IMU" stroke="#f43f5e" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="opticalFlow" name="Оптический поток" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="vioStereo" name="Stereo VIO" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="orbSlam3" name="ORB-SLAM3" stroke="#10b981" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-slate-400">
              В отличие от чистой инерциалки, накапливающей ошибку по закону $t^2$, алгоритм V-SLAM с распознаванием замкнутых контуров (Loop Closure) связывает погрешность в пределах субметра.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
