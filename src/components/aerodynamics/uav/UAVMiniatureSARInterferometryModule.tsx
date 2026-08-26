import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Radio,
  Scan,
  Compass,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Activity,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Eye,
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

export const UAVMiniatureSARInterferometryModule: React.FC = () => {
  // Radar Hardware Parameters
  const [carrierFreq_GHz, setCarrierFreq_GHz] = useState<number>(24.0); // 24 GHz (Ka-band FMCW)
  const [chirpBandwidth_MHz, setChirpBandwidth_MHz] = useState<number>(1200); // 1.2 GHz FMCW chirp
  const [antennaLength_m, setAntennaLength_m] = useState<number>(0.22); // 22 cm microstrip array
  const [insarBaseline_m, setInsarBaseline_m] = useState<number>(0.85); // Dual-antenna interferometric baseline
  const [flightAltitude_m, setFlightAltitude_m] = useState<number>(180); // UAV altitude
  const [flightSpeed_mps, setFlightSpeed_mps] = useState<number>(25); // UAV cruise speed (m/s)
  const [depressionAngle_deg, setDepressionAngle_deg] = useState<number>(45); // Look angle to swath

  // Simulation Runtime
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simStep, setSimStep] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  // Radar Mathematics
  const radarPhysics = useMemo(() => {
    const c = 2.99792458e8; // speed of light (m/s)
    const lambda_m = c / (carrierFreq_GHz * 1e9);

    // Range resolution delta_r = c / (2 * B)
    const rangeResolution_m = c / (2 * chirpBandwidth_MHz * 1e6);

    // Azimuth synthetic aperture resolution delta_az = L_a / 2 (Independent of distance!)
    const azimuthResolution_m = antennaLength_m / 2;

    // Slant range R0 to center swath
    const depRad = (depressionAngle_deg * Math.PI) / 180;
    const slantRange_m = flightAltitude_m / Math.sin(depRad);
    const groundRange_m = flightAltitude_m / Math.tan(depRad);

    // Synthetic aperture integration length L_sar = lambda * R0 / L_a
    const syntheticApertureLength_m = (lambda_m * slantRange_m) / antennaLength_m;
    const integrationTime_s = syntheticApertureLength_m / flightSpeed_mps;

    // Doppler Bandwidth B_doppler = 2 * V / L_a
    const dopplerBandwidth_Hz = (2 * flightSpeed_mps) / antennaLength_m;

    // InSAR Height Ambiguity (z_2pi = lambda * R0 * sin(theta) / (2 * B_perp))
    const insarHeightSensitivity_m = (lambda_m * slantRange_m * Math.sin(depRad)) / (2 * insarBaseline_m);

    // Theoretical number of pixels across swath (120m swath)
    const swathWidth_m = 120;
    const rangePixelCount = Math.floor(swathWidth_m / rangeResolution_m);

    return {
      lambda_cm: (lambda_m * 100).toFixed(2),
      rangeResolution_cm: (rangeResolution_m * 100).toFixed(1),
      azimuthResolution_cm: (azimuthResolution_m * 100).toFixed(1),
      slantRange_m: slantRange_m.toFixed(1),
      groundRange_m: groundRange_m.toFixed(1),
      syntheticApertureLength_m: syntheticApertureLength_m.toFixed(1),
      integrationTime_ms: (integrationTime_s * 1000).toFixed(0),
      dopplerBandwidth_Hz: dopplerBandwidth_Hz.toFixed(0),
      insarHeightSensitivity_m: insarHeightSensitivity_m.toFixed(2),
      rangePixelCount,
    };
  }, [carrierFreq_GHz, chirpBandwidth_MHz, antennaLength_m, insarBaseline_m, flightAltitude_m, flightSpeed_mps, depressionAngle_deg]);

  // Main Loop
  useEffect(() => {
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      if (isPlaying) {
        setSimStep((s) => s + dt * 1.5);
      }

      drawSARCanvas();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, radarPhysics, simStep]);

  // 2D Canvas: Radar Stripmap & 3D Terrain Backscatter
  const drawSARCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dark radar screen
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    // UAV Flight Track on the left top
    const uavTrackY = 40;
    const uavX = ((simStep * 30) % (w - 100)) + 50;

    // Flight track line
    ctx.strokeStyle = '#38bdf833';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(30, uavTrackY);
    ctx.lineTo(w - 30, uavTrackY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ground Swath on bottom
    const swathY = 150;
    const swathH = 160;

    // Radar beam illumination footprint (Yellow/Cyan trapezoid)
    ctx.fillStyle = '#065f4622';
    ctx.strokeStyle = '#10b98155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(uavX, uavTrackY);
    ctx.lineTo(uavX - 60, swathY + swathH);
    ctx.lineTo(uavX + 60, swathY + swathH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // SAR Synthetic Aperture virtual array history (Cyan glowing dots)
    const synthLenPixels = Math.min(180, parseFloat(radarPhysics.syntheticApertureLength_m) * 2.5);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(uavX - synthLenPixels, uavTrackY);
    ctx.lineTo(uavX, uavTrackY);
    ctx.stroke();

    for (let p = 0; p < 8; p++) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(uavX - (p / 7) * synthLenPixels, uavTrackY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // UAV Icon
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(uavX, uavTrackY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Render 2D SAR Stripmap Image on the swath
    // Simulated terrain radar backscatter with buildings, vehicles, foliage
    ctx.fillStyle = '#022c22';
    ctx.fillRect(40, swathY, w - 80, swathH);

    // Interferometric phase fringes (rainbow contour lines)
    for (let f = 0; f < 6; f++) {
      const fy = swathY + 20 + f * 22;
      ctx.strokeStyle = `hsl(${(f * 65 + simStep * 20) % 360}, 80%, 55%)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 40; x < w - 40; x += 10) {
        const yOff = Math.sin(x * 0.05 + f) * 6 + Math.cos(x * 0.02) * 4;
        if (x === 40) ctx.moveTo(x, fy + yOff);
        else ctx.lineTo(x, fy + yOff);
      }
      ctx.stroke();
    }

    // High backscatter Point Targets (Corner Reflectors / Vehicles)
    const targets = [
      { x: 120, y: swathY + 45, label: '🚗 Бронетранспортер (RCS +15 dBsm)' },
      { x: 260, y: swathY + 95, label: '🏗️ Здание / Бетонный ангар' },
      { x: 420, y: swathY + 60, label: '🌲 Маскировочная сетка (Penetration)' },
      { x: 520, y: swathY + 120, label: '📡 РЛС Позиция' },
    ];

    targets.forEach((t) => {
      // 2D Impulse Response / Sinc function radar cross
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Sinc lobes
      ctx.strokeStyle = '#facc1588';
      ctx.lineWidth = 1;
      ctx.strokeRect(t.x - 12, t.y - 1, 24, 2);
      ctx.strokeRect(t.x - 1, t.y - 12, 2, 24);

      // Label
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '9px monospace';
      ctx.fillText(t.label, t.x - 20, t.y - 8);
    });

    // Sub-surface radar pulse wave
    const waveR = (simStep * 40) % 70;
    ctx.strokeStyle = '#10b98188';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(uavX, uavTrackY, waveR * 2.5, Math.PI * 0.25, Math.PI * 0.75);
    ctx.stroke();
  };

  // Resolution comparison chart
  const resolutionChartData = useMemo(() => {
    const data = [];
    for (let bw = 200; bw <= 2000; bw += 200) {
      const c = 3e8;
      const d_r = (c / (2 * bw * 1e6)) * 100; // cm
      const d_az = (antennaLength_m / 2) * 100; // cm (fixed for SAR!)
      const realBeamAz = (((c / (carrierFreq_GHz * 1e9)) * 300) / antennaLength_m) * 100; // Real aperture beam spreading (cm)

      data.push({
        bandwidth_MHz: bw,
        sar_range_res_cm: parseFloat(d_r.toFixed(1)),
        sar_azimuth_res_cm: parseFloat(d_az.toFixed(1)),
        real_beam_azimuth_cm: parseFloat(realBeamAz.toFixed(0)),
      });
    }
    return data;
  }, [antennaLength_m, carrierFreq_GHz]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-800/40 rounded-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-400 shadow-lg shadow-emerald-950/50">
            <Scan className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Миниатюрная РЛС с Синтезированной Апертурой (Miniature UAV FMCW SAR & InSAR)
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full">
                24 ГГц Ka-диапазон + Разрешение 11 см
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl">
              Круглосуточная всепогодная радиолокационная разведка сквозь облака и листву: сжатие ЛЧМ-импульсов δr = c/(2B), независимое от дальности азимутальное разрешение δr_az = La/2 и интерферометрический рельеф (InSAR).
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setChirpBandwidth_MHz(1200);
              setCarrierFreq_GHz(24.0);
              setFlightAltitude_m(180);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Canvas */}
        <div className="lg:col-span-7 flex flex-col gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" /> Формирование Радиолокационного Изображения (SAR Stripmap & InSAR Phase)
            </span>
            <span className="text-xs font-mono text-cyan-300 font-bold">
              Синтезированная Апертура L_sar: {radarPhysics.syntheticApertureLength_m} м
            </span>
          </div>

          <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
            <canvas ref={canvasRef} width={640} height={340} className="w-full h-auto block" />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Цветные полосы: интерферометрические фазовые интерференции высоты | Желтые пики: точечные радиолокационные цели</span>
            <span className="font-mono text-emerald-400 font-bold">Время накопления: {radarPhysics.integrationTime_ms} мс</span>
          </div>
        </div>

        {/* Parameters */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" /> Параметры FMCW Приемопередатчика
            </h3>

            {/* Bandwidth */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Полоса Девиации ЛЧМ Chirp (МГц)</span>
                <span className="font-mono text-emerald-400 font-bold">{chirpBandwidth_MHz} МГц</span>
              </div>
              <input
                type="range"
                min={300}
                max={2000}
                step={50}
                value={chirpBandwidth_MHz}
                onChange={(e) => setChirpBandwidth_MHz(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

            {/* Carrier Frequency */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Несущая Частота (ГГц)</span>
                <span className="font-mono text-cyan-400 font-bold">{carrierFreq_GHz} ГГц (λ = {radarPhysics.lambda_cm} см)</span>
              </div>
              <input
                type="range"
                min={9.5}
                max={35.0}
                step={0.5}
                value={carrierFreq_GHz}
                onChange={(e) => setCarrierFreq_GHz(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Altitude */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Высота Полета БПЛА (м)</span>
                <span className="font-mono text-sky-400 font-bold">{flightAltitude_m} м</span>
              </div>
              <input
                type="range"
                min={50}
                max={600}
                step={10}
                value={flightAltitude_m}
                onChange={(e) => setFlightAltitude_m(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>

            {/* InSAR Baseline */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Интерферометрическая База B_perp (м)</span>
                <span className="font-mono text-purple-400 font-bold">{insarBaseline_m} м</span>
              </div>
              <input
                type="range"
                min={0.3}
                max={2.0}
                step={0.05}
                value={insarBaseline_m}
                onChange={(e) => setInsarBaseline_m(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Дальностное Разрешение δr</div>
              <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">{radarPhysics.rangeResolution_cm} см</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Азимутальное Разрешение δ_az</div>
              <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">{radarPhysics.azimuthResolution_cm} см</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">InSAR Точность Высоты Рельефа</div>
              <div className="text-lg font-black text-purple-400 font-mono mt-0.5">±{radarPhysics.insarHeightSensitivity_m} м</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Доплеровская Полоса B_d</div>
              <div className="text-lg font-black text-amber-400 font-mono mt-0.5">{radarPhysics.dopplerBandwidth_Hz} Гц</div>
            </div>
          </div>
        </div>
      </div>

      {/* Resolution Chart */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Пространственное Разрешение: Синтезированная Апертура vs Реальный Луч Антенны
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            SAR обеспечивает азимутальное разрешение {radarPhysics.azimuthResolution_cm} см независимо от дальности до цели
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={resolutionChartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="bandwidth_MHz" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Полоса ЛЧМ (МГц)', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Разрешение (см)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="sar_range_res_cm" stroke="#10b981" strokeWidth={3} name="Дальностное Разрешение SAR (см)" />
              <Line type="monotone" dataKey="sar_azimuth_res_cm" stroke="#38bdf8" strokeWidth={2} name="Азимутальное SAR Разрешение (см)" />
              <Line type="monotone" dataKey="real_beam_azimuth_cm" stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1.5} name="Реальный луч без синтеза (см)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
