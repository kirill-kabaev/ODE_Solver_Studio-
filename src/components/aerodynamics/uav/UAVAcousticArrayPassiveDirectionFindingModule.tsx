import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic,
  Volume2,
  Radio,
  Activity,
  Compass,
  Zap,
  Layers,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Target,
  Shield,
  Filter,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface TargetSoundSource {
  id: string;
  name: string;
  trueAzimuth_deg: number;
  trueElevation_deg: number;
  distance_m: number;
  freq_Hz: number;
  spl_dB: number;
  type: 'gunshot' | 'drone_rotor' | 'artillery' | 'ground_vehicle';
}

const DEFAULT_TARGETS: TargetSoundSource[] = [
  {
    id: 'src_gunshot',
    name: 'Снайперский выстрел (Muzzle Blast + Shockwave)',
    trueAzimuth_deg: 42.0,
    trueElevation_deg: -12.0,
    distance_m: 850,
    freq_Hz: 850,
    spl_dB: 128,
    type: 'gunshot',
  },
  {
    id: 'src_enemy_drone',
    name: 'Вражеский FPV / Shahed-136 (Винты 2-тактный)',
    trueAzimuth_deg: 135.0,
    trueElevation_deg: 18.0,
    distance_m: 1400,
    freq_Hz: 210,
    spl_dB: 92,
    type: 'drone_rotor',
  },
  {
    id: 'src_artillery',
    name: 'Гаубичный залп 152/155-мм (Низкочастотный)',
    trueAzimuth_deg: 265.0,
    trueElevation_deg: -4.0,
    distance_m: 4200,
    freq_Hz: 45,
    spl_dB: 145,
    type: 'artillery',
  },
];

export const UAVAcousticArrayPassiveDirectionFindingModule: React.FC = () => {
  // Array parameters
  const [micArrayType, setMicArrayType] = useState<'tetrahedron_4' | 'circular_8' | 'cross_5'>('circular_8');
  const [arrayRadius_cm, setArrayRadiusCm] = useState<number>(14.5);
  const [samplingRate_kHz, setSamplingRateKhz] = useState<number>(96); // 96 kHz for precise TDOA
  const [selectedTargetId, setSelectedTargetId] = useState<string>('src_gunshot');
  const [snr_dB, setSnrDb] = useState<number>(12.0);
  const [uavRpmNoise, setUavRpmNoise] = useState<number>(5400); // UAV own motor noise
  const [ancEnabled, setAncEnabled] = useState<boolean>(true);
  const [windSpeed_mps, setWindSpeedMps] = useState<number>(4.2);
  const [airTemp_C, setAirTempC] = useState<number>(18.0);

  // Realtime simulation state
  const [isSimRunning, setIsSimRunning] = useState<boolean>(true);
  const [doaEstimate, setDoaEstimate] = useState<{
    azimuth_deg: number;
    elevation_deg: number;
    confidence_pct: number;
    error_deg: number;
  }>({
    azimuth_deg: 41.8,
    elevation_deg: -11.6,
    confidence_pct: 98.4,
    error_deg: 0.45,
  });

  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const simTimeRef = useRef<number>(0);

  const activeTarget = useMemo(
    () => DEFAULT_TARGETS.find((t) => t.id === selectedTargetId) || DEFAULT_TARGETS[0],
    [selectedTargetId]
  );

  // Speed of sound c = 331.3 * sqrt(1 + T/273.15)
  const speedOfSound = useMemo(() => {
    return 331.3 * Math.sqrt(1 + airTemp_C / 273.15);
  }, [airTemp_C]);

  // Own propeller blade pass frequency (BPF) = (RPM * blades) / 60
  const uavBladePassFreq = useMemo(() => {
    return (uavRpmNoise * 2) / 60; // 2-blade prop
  }, [uavRpmNoise]);

  // Array mic coordinates [x, y, z] in meters
  const micPositions = useMemo(() => {
    const r = arrayRadius_cm / 100;
    if (micArrayType === 'circular_8') {
      const positions = [];
      for (let i = 0; i < 8; i++) {
        const angle = (i * 2 * Math.PI) / 8;
        positions.push({
          id: i + 1,
          x: r * Math.cos(angle),
          y: r * Math.sin(angle),
          z: (i % 2 === 0 ? 1 : -1) * (r * 0.25),
        });
      }
      return positions;
    } else if (micArrayType === 'tetrahedron_4') {
      // 3D regular tetrahedron
      return [
        { id: 1, x: 0, y: 0, z: r },
        { id: 2, x: (2 * Math.SQRT2 * r) / 3, y: 0, z: -r / 3 },
        { id: 3, x: -Math.SQRT2 * r / 3, y: (Math.sqrt(6) * r) / 3, z: -r / 3 },
        { id: 4, x: -Math.SQRT2 * r / 3, y: -(Math.sqrt(6) * r) / 3, z: -r / 3 },
      ];
    } else {
      // Cross 5
      return [
        { id: 1, x: 0, y: 0, z: 0 },
        { id: 2, x: r, y: 0, z: 0 },
        { id: 3, x: -r, y: 0, z: 0 },
        { id: 4, x: 0, y: r, z: 0 },
        { id: 5, x: 0, y: -r, z: 0 },
      ];
    }
  }, [micArrayType, arrayRadius_cm]);

  // MUSIC / GCC-PHAT Spectrum calculation
  const spatialSpectrumData = useMemo(() => {
    const data = [];
    const targetAz = activeTarget.trueAzimuth_deg;
    const targetEl = activeTarget.trueElevation_deg;

    // Effective SNR after ANC filter
    const effSnr = ancEnabled ? snr_dB + 18.5 : Math.max(-5, snr_dB - 12);
    const noiseStd = Math.max(0.2, 10 / Math.max(0.1, effSnr));

    for (let az = 0; az <= 360; az += 5) {
      const azDiff = Math.abs((az - targetAz + 180) % 360 - 180);
      // Pseudo-spectrum beam peak using steered response power
      const beamWidth = 14.0 * (340 / (speedOfSound * (arrayRadius_cm / 15)));
      const power_dB =
        Math.max(
          0,
          35 * Math.exp(-Math.pow(azDiff / beamWidth, 2)) +
            (Math.sin((az * Math.PI) / 30) * 2 - 5) +
            (1 / noiseStd) * 2
        );

      data.push({
        azimuth_deg: az,
        music_power_dB: Number(power_dB.toFixed(2)),
        baseline_noise_dB: Number((Math.random() * 4 + 2).toFixed(1)),
      });
    }
    return data;
  }, [activeTarget, ancEnabled, snr_dB, speedOfSound, arrayRadius_cm]);

  // Update real-time DOA estimator
  useEffect(() => {
    const timer = setInterval(() => {
      const noise = (Math.random() - 0.5) * (ancEnabled ? 0.6 : 3.5);
      const estAz = (activeTarget.trueAzimuth_deg + noise + 360) % 360;
      const estEl = activeTarget.trueElevation_deg + noise * 0.5;
      const err = Math.hypot(estAz - activeTarget.trueAzimuth_deg, estEl - activeTarget.trueElevation_deg);
      const conf = Math.max(60, Math.min(99.8, 100 - err * 3.5));

      setDoaEstimate({
        azimuth_deg: Number(estAz.toFixed(1)),
        elevation_deg: Number(estEl.toFixed(1)),
        confidence_pct: Number(conf.toFixed(1)),
        error_deg: Number(err.toFixed(2)),
      });
    }, 200);

    return () => clearInterval(timer);
  }, [activeTarget, ancEnabled]);

  // Interactive Radar & Beamforming Canvas
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      simTimeRef.current += 0.035;
      const t = simTimeRef.current;

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(w, h) * 0.44;

      // Dark tactical radar background
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, w, h);

      // Radar range rings (Distance / DOA rings)
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.lineWidth = 1;
      for (let r = 1; r <= 4; r++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (maxR / 4) * r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Crosshairs & azimuth angles
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - maxR);
      ctx.lineTo(cx, cy + maxR);
      ctx.moveTo(cx - maxR, cy);
      ctx.lineTo(cx + maxR, cy);
      ctx.stroke();

      // Azimuth cardinal labels
      ctx.font = '10px monospace';
      ctx.fillStyle = '#10b981';
      ctx.textAlign = 'center';
      ctx.fillText('000° N', cx, cy - maxR - 6);
      ctx.fillText('090° E', cx + maxR + 24, cy + 3);
      ctx.fillText('180° S', cx, cy + maxR + 14);
      ctx.fillText('270° W', cx - maxR - 24, cy + 3);

      // Rotating Radar Beam Sweep
      const sweepAngle = (t * 1.5) % (Math.PI * 2);
      ctx.save();
      const sweepGrad = ctx.createConicGradient(sweepAngle, cx, cy);
      sweepGrad.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
      sweepGrad.addColorStop(0.12, 'rgba(16, 185, 129, 0.05)');
      sweepGrad.addColorStop(0.15, 'rgba(16, 185, 129, 0)');
      sweepGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');

      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Microphone Array Physical Geometry in Center
      ctx.save();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
      micPositions.forEach((m) => {
        const mx = cx + m.x * 260;
        const my = cy + m.y * 260;
        ctx.beginPath();
        ctx.arc(mx, my, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = '9px monospace';
        ctx.fillStyle = '#7dd3fc';
        ctx.fillText(`M${m.id}`, mx + 6, my - 4);
      });
      ctx.restore();

      // Target Acoustic Signal Bearing Line & Marker
      const tgtAzRad = ((doaEstimate.azimuth_deg - 90) * Math.PI) / 180;
      const tgtDistPx = maxR * 0.82;
      const tgtX = cx + Math.cos(tgtAzRad) * tgtDistPx;
      const tgtY = cy + Math.sin(tgtAzRad) * tgtDistPx;

      // Acoustic wavefronts coming from target
      ctx.save();
      for (let wf = 0; wf < 4; wf++) {
        const wfPhase = (t * 3 + wf * 0.8) % 3.5;
        const wfR = wfPhase * 45;
        ctx.strokeStyle = `rgba(239, 68, 68, ${Math.max(0, 0.8 - wfPhase * 0.2)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tgtX, tgtY, wfR, tgtAzRad + Math.PI - 0.7, tgtAzRad + Math.PI + 0.7);
        ctx.stroke();
      }

      // Target Bearing Strobe Vector
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tgtX, tgtY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Target Icon & Target Reticle
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(tgtX, tgtY, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(tgtX, tgtY, 12 + Math.sin(t * 8) * 3, 0, Math.PI * 2);
      ctx.stroke();

      // Text Callout on Radar
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'left';
      ctx.fillText(
        `TARGET: ${activeTarget.name.split(' ')[0]} [${doaEstimate.azimuth_deg}° Az, ${doaEstimate.elevation_deg}° El]`,
        tgtX + 16,
        tgtY - 8
      );
      ctx.font = '10px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Dist ~ ${activeTarget.distance_m}m | Conf: ${doaEstimate.confidence_pct}%`, tgtX + 16, tgtY + 6);
      ctx.restore();

      // HUD Status Overlay
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.fillRect(15, 15, 230, 95);
      ctx.strokeStyle = '#10b981';
      ctx.strokeRect(15, 15, 230, 95);

      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#34d399';
      ctx.fillText(`ACOUSTIC DF ARRAY [${micArrayType}]`, 25, 32);
      ctx.font = '10px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`C_sound: ${speedOfSound.toFixed(1)} м/с (T = ${airTemp_C}°C)`, 25, 48);
      ctx.fillText(`Собственный шум моторов: ${uavBladePassFreq.toFixed(0)} Гц`, 25, 64);
      ctx.fillText(`ANC Фильтр: ${ancEnabled ? 'АКТИВЕН (-18 дБ)' : 'ВЫКЛЮЧЕН'}`, 25, 80);
      ctx.fillText(`Ошибка пеленга: ±${doaEstimate.error_deg}°`, 25, 96);

      if (isSimRunning) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [
    isSimRunning,
    micPositions,
    doaEstimate,
    activeTarget,
    micArrayType,
    speedOfSound,
    airTemp_C,
    uavBladePassFreq,
    ancEnabled,
  ]);

  return (
    <div className="w-full bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 p-4 md:p-6 shadow-2xl font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border border-emerald-500/40 text-emerald-400 shadow-inner">
            <Mic className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                #102 Acoustic DF & Beamforming
              </span>
              <h2 className="text-xl font-black text-white tracking-tight font-mono">
                Акустическая Пеленгация Выстрелов & TDOA Beamforming
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Микрофонная решетка MEMS на борту БПЛА, алгоритмы MUSIC / GCC-PHAT, подавление собственного шума винтов ANC и 3D триангуляция огневых позиций.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSimRunning(!isSimRunning)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isSimRunning
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                : 'bg-slate-800 text-emerald-400 hover:bg-slate-700 border border-emerald-500/30'
            }`}
          >
            {isSimRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isSimRunning ? 'Пауза Пеленгатора' : 'Запуск Пеленгатора'}</span>
          </button>
        </div>
      </div>

      {/* Target Sources Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {DEFAULT_TARGETS.map((tgt) => (
          <button
            key={tgt.id}
            type="button"
            onClick={() => setSelectedTargetId(tgt.id)}
            className={`p-3 rounded-xl text-left transition-all border cursor-pointer ${
              selectedTargetId === tgt.id
                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 shadow-md ring-1 ring-emerald-500/40'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
              <span className="font-mono">{tgt.name}</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                {tgt.spl_dB} дБ
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-1">
              <span>Азимут: {tgt.trueAzimuth_deg}°</span>
              <span>Дистанция: {tgt.distance_m} м</span>
              <span>Частота: {tgt.freq_Hz} Гц</span>
            </div>
          </button>
        ))}
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Пеленг (Azimuth)</span>
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono mt-1">
            {doaEstimate.azimuth_deg}°
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Угол места: {doaEstimate.elevation_deg}°
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Точность DOA</span>
            <Target className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-xl font-black text-white font-mono mt-1">
            ±{doaEstimate.error_deg}°
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5">
            Доверие: {doaEstimate.confidence_pct}%
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Скорость звука c</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-black text-cyan-400 font-mono mt-1">
            {speedOfSound.toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-400">м/с</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            T_air = {airTemp_C}°C
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Шум моторов UAV</span>
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400 font-mono mt-1">
            {uavBladePassFreq.toFixed(0)}{' '}
            <span className="text-xs font-normal text-slate-400">Гц</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {uavRpmNoise} RPM (2 лопасти)
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>ANC Фильтрация</span>
            <Filter className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="text-xl font-black text-teal-400 font-mono mt-1">
            {ancEnabled ? '-18.5 дБ' : '0.0 дБ'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            LMS адаптивный фильтр
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>TDOA дискретизация</span>
            <Zap className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-black text-purple-400 font-mono mt-1">
            {samplingRate_kHz} кГц
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            dt_res = {(1000 / samplingRate_kHz).toFixed(2)} мкс
          </div>
        </div>
      </div>

      {/* Radar & Acoustic DF Canvas */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-emerald-400" />
            Круговой Радар Пространственной Пеленгации (Acoustic MUSIC Spectrum):
          </span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
            Array Config: {micArrayType} (R = {arrayRadius_cm} см)
          </span>
        </div>

        <div className="relative w-full h-[360px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
          <canvas
            ref={radarCanvasRef}
            width={850}
            height={360}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Sliders & Configuration Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel 1: Array Geometry */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            Геометрия Микрофонной Решетки
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 mb-1 block font-mono">Конфигурация решетки:</label>
              <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
                {[
                  { id: 'circular_8', name: 'Кольцо 8' },
                  { id: 'tetrahedron_4', name: 'Тетраэдр 4' },
                  { id: 'cross_5', name: 'Крест 5' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMicArrayType(item.id as any)}
                    className={`py-1.5 px-2 rounded-lg border transition-all cursor-pointer ${
                      micArrayType === item.id
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1 font-mono">
                <span>Базовый радиус решетки:</span>
                <span className="text-emerald-300 font-bold">{arrayRadius_cm.toFixed(1)} см</span>
              </div>
              <input
                type="range"
                min={5.0}
                max={35.0}
                step={0.5}
                value={arrayRadius_cm}
                onChange={(e) => setArrayRadiusCm(parseFloat(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1 font-mono">
                <span>Частота дискретизации АЦП:</span>
                <span className="text-emerald-300 font-bold">{samplingRate_kHz} кГц</span>
              </div>
              <input
                type="range"
                min={48}
                max={192}
                step={24}
                value={samplingRate_kHz}
                onChange={(e) => setSamplingRateKhz(parseInt(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>
          </div>
        </div>

        {/* Panel 2: Acoustic Noise & Motor Cancellation */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-amber-400" />
            Шумоподавление ВМГ (ANC / LMS)
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-400 mb-1 font-mono">
                <span>Обороты винтов БПЛА (RPM):</span>
                <span className="text-amber-300 font-bold">{uavRpmNoise} RPM</span>
              </div>
              <input
                type="range"
                min={2000}
                max={9000}
                step={100}
                value={uavRpmNoise}
                onChange={(e) => setUavRpmNoise(parseInt(e.target.value))}
                className="w-full accent-amber-400"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono">
              <span className="text-slate-300">Адаптивный фильтр шума винтов:</span>
              <button
                type="button"
                onClick={() => setAncEnabled(!ancEnabled)}
                className={`px-3 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                  ancEnabled
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-red-950 border border-red-500/50 text-red-300'
                }`}
              >
                {ancEnabled ? 'ANC ВКЛ' : 'ANC ВЫКЛ'}
              </button>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1 font-mono">
                <span>Отношение Сигнал/Шум (SNR):</span>
                <span className="text-sky-300 font-bold">{snr_dB.toFixed(1)} дБ</span>
              </div>
              <input
                type="range"
                min={-10.0}
                max={30.0}
                step={1.0}
                value={snr_dB}
                onChange={(e) => setSnrDb(parseFloat(e.target.value))}
                className="w-full accent-sky-400"
              />
            </div>
          </div>
        </div>

        {/* Panel 3: Atmosphere & Sound Propagation */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Атмосферное Распространение Звука
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-400 mb-1 font-mono">
                <span>Температура воздуха:</span>
                <span className="text-cyan-300 font-bold">{airTemp_C.toFixed(1)} °C</span>
              </div>
              <input
                type="range"
                min={-30.0}
                max={45.0}
                step={1.0}
                value={airTemp_C}
                onChange={(e) => setAirTempC(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1 font-mono">
                <span>Скорость ветра на эшелоне:</span>
                <span className="text-cyan-300 font-bold">{windSpeed_mps.toFixed(1)} м/с</span>
              </div>
              <input
                type="range"
                min={0.0}
                max={20.0}
                step={0.5}
                value={windSpeed_mps}
                onChange={(e) => setWindSpeedMps(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-cyan-500/30 text-[11px] text-slate-300 font-mono space-y-1">
              <div className="flex justify-between">
                <span>Формула задержки TDOA:</span>
                <span className="text-cyan-400 font-bold">Δt = (d_i - d_j) / c</span>
              </div>
              <div className="flex justify-between">
                <span>Алгоритм пеленгации:</span>
                <span className="text-emerald-300 font-bold">MUSIC + GCC-PHAT</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MUSIC Power Spectrum Chart */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            Пространственный Спектр Мощности MUSIC Beamforming (0° .. 360° Азимут):
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Пик на азимуте: {doaEstimate.azimuth_deg}°
          </span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spatialSpectrumData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="musicGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis
                dataKey="azimuth_deg"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                label={{ value: 'Азимут (°)', position: 'insideBottomRight', offset: -5, fill: '#64748b', fontSize: 10 }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                label={{ value: 'Мощность (дБ)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
              />
              <Area
                type="monotone"
                dataKey="music_power_dB"
                name="MUSIC Спектр (дБ)"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#musicGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
