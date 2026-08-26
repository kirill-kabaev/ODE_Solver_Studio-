import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  Radio,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Shield,
  Activity,
  TrendingDown,
  Gauge,
  CheckCircle2,
  Mic,
  Disc,
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

export const UAVAcousticCloakingAntiDetectionModule: React.FC = () => {
  // Acoustic & Rotor Parameters
  const [rotorRPM, setRotorRPM] = useState<number>(4200); // Propeller RPM
  const [bladeCount, setBladeCount] = useState<number>(3); // 3-bladed toroidal quiet prop
  const [propRadius_m, setPropRadius_m] = useState<number>(0.25); // 25 cm (10-inch) prop
  const [observerDistance_m, setObserverDistance_m] = useState<number>(250); // Observer distance (m)
  const [ancSpeakerPower_W, setAncSpeakerPower_W] = useState<number>(4.5); // Micro-speaker active cancellation power
  const [ancPhaseAccuracy_deg, setAncPhaseAccuracy_deg] = useState<number>(2.5); // Adaptive filter phase tracking error
  const [trailingEdgeSerrations, setTrailingEdgeSerrations] = useState<boolean>(true); // Owl feather bio-serrated edges
  const [isAncActive, setIsAncActive] = useState<boolean>(true); // Active Noise Cancellation toggle

  // Simulation Runtime
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  // Aeroacoustics & Psychoacoustics Physics
  // Gutin & Ffowcs Williams-Hawkings (FW-H) tonal & broadband noise model
  const acoustics = useMemo(() => {
    // Blade Passage Frequency BPF = B * (RPM / 60)
    const BPF_Hz = bladeCount * (rotorRPM / 60);

    // Tip Mach number M_tip
    const c_sound = 340.29; // m/s
    const omega = (rotorRPM * 2 * Math.PI) / 60;
    const v_tip = omega * propRadius_m;
    const Mach_tip = v_tip / c_sound;

    // Baseline Sound Pressure Level (SPL in dB at 1m distance)
    // Gutin dipole/monopole approximation: SPL ~ 20*log10(Thrust) + 50*log10(M_tip)
    const baseSPL_1m_dB = 78 + 42 * Math.log10(Math.max(0.1, Mach_tip / 0.35));

    // Passive Serrations reduction (attenuates high frequency vortex shedding by ~ 4.5 dB)
    const serrationAtten_dB = trailingEdgeSerrations ? 4.8 : 0;

    // Active Noise Cancellation (Destructive Interference):
    // Residual SPL attenuation = -10 * log10(1 + 1 - 2 * cos(pi - DeltaPhi))
    const phaseErrorRad = (ancPhaseAccuracy_deg * Math.PI) / 180;
    const maxAncAtten_dB = 18.5; // hardware limit of micro-speakers
    const ancAtten_dB = isAncActive ? Math.min(maxAncAtten_dB, -10 * Math.log10(Math.max(0.015, 2 - 2 * Math.cos(phaseErrorRad)))) : 0;

    // Total Noise at 1m
    const totalSPL_1m_dB = baseSPL_1m_dB - serrationAtten_dB - ancAtten_dB;

    // Geometric spherical spreading + atmospheric absorption to observer distance:
    // SPL(r) = SPL(1m) - 20*log10(r) - alpha_atm * r
    const atmAbsorb_dB = 0.005 * observerDistance_m; // ~ 5 dB/km
    const splAtObserver_dBA = Math.max(12, totalSPL_1m_dB - 20 * Math.log10(observerDistance_m) - atmAbsorb_dB);
    const splBaselineAtObserver_dBA = Math.max(12, baseSPL_1m_dB - 20 * Math.log10(observerDistance_m) - atmAbsorb_dB);

    // Ambient background noise threshold (e.g. quiet rural night ~ 32 dBA, urban ~ 45 dBA)
    const backgroundNoise_dBA = 35.0;

    // Acoustic Detection Range: distance where drone SPL matches background noise
    // r_detect = 10^((SPL_1m - Bkg) / 20)
    const baselineDetectRange_m = Math.pow(10, (baseSPL_1m_dB - backgroundNoise_dBA) / 20);
    const stealthDetectRange_m = Math.pow(10, (totalSPL_1m_dB - backgroundNoise_dBA) / 20);
    const detectionRadiusReduction_pct = ((baselineDetectRange_m - stealthDetectRange_m) / baselineDetectRange_m) * 100;

    // Psychoacoustic Loudness (Sones) = 2^((dBA - 40) / 10)
    const loudnessSones = Math.pow(2, (splAtObserver_dBA - 40) / 10);

    return {
      BPF_Hz: BPF_Hz.toFixed(1),
      Mach_tip: Mach_tip.toFixed(2),
      baseSPL_1m_dB: baseSPL_1m_dB.toFixed(1),
      ancAtten_dB: ancAtten_dB.toFixed(1),
      serrationAtten_dB: serrationAtten_dB.toFixed(1),
      splAtObserver_dBA: splAtObserver_dBA.toFixed(1),
      splBaselineAtObserver_dBA: splBaselineAtObserver_dBA.toFixed(1),
      baselineDetectRange_m: baselineDetectRange_m.toFixed(0),
      stealthDetectRange_m: stealthDetectRange_m.toFixed(0),
      detectionRadiusReduction_pct: Math.min(96, Math.max(0, detectionRadiusReduction_pct)).toFixed(1),
      loudnessSones: Math.max(0.05, loudnessSones).toFixed(2),
      isUndetectable: splAtObserver_dBA <= backgroundNoise_dBA,
    };
  }, [rotorRPM, bladeCount, propRadius_m, observerDistance_m, ancPhaseAccuracy_deg, trailingEdgeSerrations, isAncActive]);

  // Animation Loop
  useEffect(() => {
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      if (isPlaying) {
        setSimTime((t) => t + dt);
      }

      drawAcousticWaveCanvas();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, acoustics, simTime, isAncActive]);

  // Canvas Drawing: Dual Acoustic Wave Superposition (Propeller Wave + Anti-Phase ANC Wave = Quenched)
  const drawAcousticWaveCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dark acoustic chamber background
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    const sourceX = 75;
    const midY = h * 0.48;

    // Draw UAV Drone Propeller Source on the left
    ctx.save();
    ctx.translate(sourceX, midY);

    // Propeller hub
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // Rotating quiet blades
    const rotAng = simTime * ((rotorRPM / 60) * 2 * Math.PI) * 0.1;
    ctx.rotate(rotAng);
    ctx.fillStyle = '#38bdf8';
    for (let b = 0; b < bladeCount; b++) {
      ctx.save();
      ctx.rotate((b * 2 * Math.PI) / bladeCount);
      ctx.fillRect(-3, -35, 6, 35);
      if (trailingEdgeSerrations) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(3, -30, 3, 25);
      }
      ctx.restore();
    }
    ctx.restore();

    // ANC Anti-Phase Speaker Icon below hub
    ctx.fillStyle = isAncActive ? '#10b981' : '#64748b';
    ctx.beginPath();
    ctx.arc(sourceX, midY + 45, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '9px monospace';
    ctx.fillText('ANC АКТИВНЫЙ ДИНАМИК (π)', sourceX - 50, midY + 65);

    // Acoustic Wave Propagation Streamlines
    const waveStartX = sourceX + 40;
    const waveEndX = w - 40;

    // Draw Primary Rotor Noise Wave (Red)
    ctx.strokeStyle = '#ef444466';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = waveStartX; x <= waveEndX; x += 3) {
      const dist = x - waveStartX;
      const wave = Math.sin((dist * 0.08) - (simTime * 20)) * 28;
      const y = midY - 35 + wave;
      if (x === waveStartX) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw ANC Anti-Phase Wave (Green, phase shifted by 180 deg)
    if (isAncActive) {
      ctx.strokeStyle = '#10b98166';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = waveStartX; x <= waveEndX; x += 3) {
        const dist = x - waveStartX;
        // Anti-phase + small phase error
        const phaseErr = (ancPhaseAccuracy_deg * Math.PI) / 180;
        const wave = Math.sin((dist * 0.08) - (simTime * 20) + Math.PI + phaseErr) * 26;
        const y = midY + 35 + wave;
        if (x === waveStartX) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Draw Resultant Superposition Acoustic Pressure Wave (Cyan/Quenched Center Wave)
    const attenFactor = isAncActive ? 0.18 : 1.0;
    ctx.strokeStyle = isAncActive ? '#22c55e' : '#f87171';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = waveStartX; x <= waveEndX; x += 3) {
      const dist = x - waveStartX;
      const primWave = Math.sin((dist * 0.08) - (simTime * 20)) * 32;
      const ancWave = isAncActive ? Math.sin((dist * 0.08) - (simTime * 20) + Math.PI) * 30 : 0;
      const resWave = (primWave + ancWave) * (attenFactor);
      const y = midY + resWave;
      if (x === waveStartX) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Wavefront Rings propagating outward
    for (let r = 0; r < 5; r++) {
      const ringR = ((simTime * 45 + r * 50) % 240) + 15;
      const ringAlpha = Math.max(0, 1 - ringR / 240) * (isAncActive ? 0.15 : 0.45);
      ctx.strokeStyle = isAncActive ? `rgba(34, 197, 94, ${ringAlpha})` : `rgba(239, 68, 68, ${ringAlpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sourceX, midY, ringR, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();
    }

    // Observer Hearing Target on Right
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(waveEndX, midY, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = acoustics.isUndetectable ? '#22c55e' : '#f59e0b';
    ctx.font = '10px monospace';
    ctx.fillText(`Наблюдатель (${observerDistance_m} м): ${acoustics.splAtObserver_dBA} дБА`, waveEndX - 130, midY - 14);
  };

  // Acoustic Frequency Spectrum (Harmonics of BPF: 1x, 2x, 3x, 4x BPF)
  const spectrumChartData = useMemo(() => {
    const data = [];
    const bpf = parseFloat(acoustics.BPF_Hz);

    for (let f = 50; f <= 1500; f += 25) {
      // Harmonic peaks near BPF multiples
      let tonalPeak = 0;
      for (let h = 1; h <= 4; h++) {
        const harmFreq = bpf * h;
        const diff = Math.abs(f - harmFreq);
        if (diff < 35) {
          tonalPeak += (40 / h) * Math.exp(-Math.pow(diff / 15, 2));
        }
      }
      // Broadband vortex noise
      const broadband = 25 - 0.01 * f;
      const rawSPL = broadband + tonalPeak;

      const ancAtten = isAncActive && f < 900 ? (parseFloat(acoustics.ancAtten_dB) * Math.exp(-Math.pow(f / 700, 2))) : 0;
      const serrationAtten = trailingEdgeSerrations && f > 300 ? parseFloat(acoustics.serrationAtten_dB) : 0;
      const quietSPL = Math.max(10, rawSPL - ancAtten - serrationAtten);

      data.push({
        freq_Hz: f,
        raw_SPL_dB: parseFloat(rawSPL.toFixed(1)),
        quiet_SPL_dB: parseFloat(quietSPL.toFixed(1)),
      });
    }
    return data;
  }, [acoustics, isAncActive, trailingEdgeSerrations]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-cyan-950/80 border border-emerald-800/40 rounded-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-400 shadow-lg shadow-emerald-950/50">
            <VolumeX className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Акустическая Маскировка & Активное Шумоподавление БПЛА (Active Noise Cancellation)
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full">
                Деструктивная Интерференция (Δφ = π) + Шевроны
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl">
              Снижение акустической заметности дронов на 88%: генерация противофазной звуковой волны в диапазоне лопастных частот (BPF = {acoustics.BPF_Hz} Гц) и совиные шевроны задней кромки.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAncActive(!isAncActive)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              isAncActive
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {isAncActive ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            {isAncActive ? 'ANC АКТИВЕН' : 'ANC ВЫКЛЮЧЕН'}
          </button>

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
              setRotorRPM(4200);
              setBladeCount(3);
              setObserverDistance_m(250);
              setIsAncActive(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Canvas Visualizer */}
        <div className="lg:col-span-7 flex flex-col gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Mic className="w-4 h-4 text-emerald-400" /> Наложение Звуковых Волн: Ротор (Красный) + Противофаза (Зеленый) = Подавление
            </span>
            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${acoustics.isUndetectable ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'}`}>
              {acoustics.isUndetectable ? '🤫 НИЖЕ ФОНОВОГО ШУМА' : '🔊 СЛЫШИМЫЙ'}
            </span>
          </div>

          <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
            <canvas ref={canvasRef} width={640} height={320} className="w-full h-auto block" />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Лопастная частота BPF: {acoustics.BPF_Hz} Гц | Снижение шума ANC: -{acoustics.ancAtten_dB} дБ</span>
            <span className="font-mono text-emerald-400 font-bold">
              Громкость: {acoustics.loudnessSones} Сон
            </span>
          </div>
        </div>

        {/* Sliders */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" /> Параметры Винтомоторной Группы
            </h3>

            {/* Rotor RPM */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Обороты Винта (RPM)</span>
                <span className="font-mono text-cyan-400 font-bold">{rotorRPM} об/мин (BPF = {acoustics.BPF_Hz} Гц)</span>
              </div>
              <input
                type="range"
                min={1800}
                max={7500}
                step={100}
                value={rotorRPM}
                onChange={(e) => setRotorRPM(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Observer Distance */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Дистанция до Наблюдателя (м)</span>
                <span className="font-mono text-emerald-400 font-bold">{observerDistance_m} м</span>
              </div>
              <input
                type="range"
                min={50}
                max={1000}
                step={25}
                value={observerDistance_m}
                onChange={(e) => setObserverDistance_m(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

            {/* ANC Phase Tracking Accuracy */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Погрешность Слежения Фазы ANC (Δφ)</span>
                <span className="font-mono text-purple-400 font-bold">±{ancPhaseAccuracy_deg}°</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={15.0}
                step={0.5}
                value={ancPhaseAccuracy_deg}
                onChange={(e) => setAncPhaseAccuracy_deg(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
            </div>

            {/* Passive Serrations Toggle */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-300">Шевроны Задней Кромки (Совиное Перо)</span>
              <input
                type="checkbox"
                checked={trailingEdgeSerrations}
                onChange={(e) => setTrailingEdgeSerrations(e.target.checked)}
                className="w-4 h-4 accent-emerald-400 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Шум у Наблюдателя</div>
              <div className={`text-lg font-black font-mono mt-0.5 ${acoustics.isUndetectable ? 'text-emerald-400' : 'text-amber-400'}`}>
                {acoustics.splAtObserver_dBA} дБА
              </div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Снижение Радиуса Засечки</div>
              <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">-{acoustics.detectionRadiusReduction_pct}%</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Дистанция Обнаружения</div>
              <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">{acoustics.stealthDetectRange_m} м (было {acoustics.baselineDetectRange_m} м)</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Число Маха Конца Лопасти</div>
              <div className="text-lg font-black text-purple-400 font-mono mt-0.5">M = {acoustics.Mach_tip}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Acoustic Spectrum Chart */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-emerald-400" /> Акустический Спектр Шума: Исходный Шум vs Активное Шумоподавление ANC
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Пики гармоник BPF ({acoustics.BPF_Hz} Гц, {(parseFloat(acoustics.BPF_Hz)*2).toFixed(0)} Гц) срезаются активными противофазными волнами
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={spectrumChartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="freq_Hz" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Частота Звука (Гц)', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Уровень Шума (дБ)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="raw_SPL_dB" stroke="#ef4444" strokeWidth={2} strokeDasharray="3 3" name="Без маскировки (Обычный дрон)" />
              <Line type="monotone" dataKey="quiet_SPL_dB" stroke="#10b981" strokeWidth={3} name="Стелс режим: ANC + Шевроны" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
