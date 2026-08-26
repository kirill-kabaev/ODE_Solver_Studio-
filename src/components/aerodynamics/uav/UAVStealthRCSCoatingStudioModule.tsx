import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Shield,
  Radio,
  Sparkles,
  Layers,
  Activity,
  Sliders,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Download,
  Share2,
  Gauge,
  Compass,
  Cpu,
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { MathText } from '../../MathView';

export type RadarBandType = 'L_band' | 'S_band' | 'C_band' | 'X_band' | 'Ku_band';

export const UAVStealthRCSCoatingStudioModule: React.FC = () => {
  // Radar Settings
  const [radarBand, setRadarBand] = useState<RadarBandType>('X_band');
  const [ramThickness_mm, setRamThickness_mm] = useState<number>(2.5); // 0.5 to 8.0 mm
  const [hasSDuctIntake, setHasSDuctIntake] = useState<boolean>(true);
  const [hasChineFuselage, setHasChineFuselage] = useState<boolean>(true);
  const [wingLeadingEdgeSweep_deg, setWingLeadingEdgeSweep_deg] = useState<number>(38); // 15 to 55 deg
  const [internalWeaponsBay, setInternalWeaponsBay] = useState<boolean>(true);

  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Radar Band Properties
  const bandSpec = useMemo(() => {
    const specs: Record<RadarBandType, { name: string; freq_GHz: number; lambda_cm: number; desc: string }> = {
      L_band: { name: 'L-диапазон (ДРЛО / РЛС ПВО)', freq_GHz: 1.5, lambda_cm: 20.0, desc: 'Высокая проникающая способность, сложнее экранировать RAM' },
      S_band: { name: 'S-диапазон (ЗРК С-300 / Patriot)', freq_GHz: 3.0, lambda_cm: 10.0, desc: 'Многофункциональные обзорные радары ПВО' },
      C_band: { name: 'C-диапазон (Корабельные РЛС)', freq_GHz: 6.0, lambda_cm: 5.0, desc: 'Средняя дальность, точное сопровождение' },
      X_band: { name: 'X-диапазон (Головки самонаведения / БРЛС)', freq_GHz: 10.0, lambda_cm: 3.0, desc: 'Основной диапазон ракетного наведения и истребителей' },
      Ku_band: { name: 'Ku-диапазон (РЛС высокого разрешения)', freq_GHz: 16.0, lambda_cm: 1.87, desc: 'Высокоточное наведение на конечном участке' },
    };
    return specs[radarBand];
  }, [radarBand]);

  // Electromagnetic Scattering & RCS Physics
  const rcsCalc = useMemo(() => {
    const lambda_m = bandSpec.lambda_cm / 100;
    const k = (2 * Math.PI) / lambda_m;

    // RAM absorption loss (dB): Salisbury screen resonance around d = lambda / (4 * sqrt(eps*mu))
    const eps_r = 14.5;
    const mu_r = 2.2;
    const n_refract = Math.sqrt(eps_r * mu_r);
    const optimalRamThickness_mm = (bandSpec.lambda_cm * 10) / (4 * n_refract);
    const ramDetuning = Math.abs(ramThickness_mm - optimalRamThickness_mm) / optimalRamThickness_mm;
    const ramAbsorption_dB = Math.max(3.0, 24.0 - ramDetuning * 18.0);

    // Frontal RCS baseline for conventional drone ~ 0.8 m^2 (-1 dBsm)
    let frontalRCS_m2 = 0.85;

    // Reductions from shaping & stealth tech
    if (hasChineFuselage) frontalRCS_m2 *= 0.18; // Edge alignment & blended chine
    if (hasSDuctIntake) frontalRCS_m2 *= 0.12;   // S-duct hides compressor blades
    if (internalWeaponsBay) frontalRCS_m2 *= 0.35; // No external weapon pylons

    // Apply RAM coating damping
    const ramReductionFactor = 10 ** (-ramAbsorption_dB / 10);
    const stealthFrontalRCS_m2 = frontalRCS_m2 * ramReductionFactor;
    const stealthFrontalRCS_dBsm = 10 * Math.log10(Math.max(0.00001, stealthFrontalRCS_m2));

    // Conventional Drone frontal RCS
    const standardFrontalRCS_m2 = 0.85;
    const standardFrontalRCS_dBsm = 10 * Math.log10(standardFrontalRCS_m2);

    // Detection Range Reduction (R ~ sigma^(1/4))
    const detectionRangeReduction_pct = (1 - (stealthFrontalRCS_m2 / standardFrontalRCS_m2) ** 0.25) * 100;

    return {
      optimalRamThickness_mm: optimalRamThickness_mm.toFixed(2),
      ramAbsorption_dB: ramAbsorption_dB.toFixed(1),
      stealthFrontalRCS_m2: stealthFrontalRCS_m2 < 0.001 ? stealthFrontalRCS_m2.toExponential(2) : stealthFrontalRCS_m2.toFixed(4),
      stealthFrontalRCS_dBsm: stealthFrontalRCS_dBsm.toFixed(1),
      standardFrontalRCS_dBsm: standardFrontalRCS_dBsm.toFixed(1),
      detectionRangeReduction_pct: detectionRangeReduction_pct.toFixed(1),
    };
  }, [bandSpec, ramThickness_mm, hasSDuctIntake, hasChineFuselage, internalWeaponsBay]);

  // 360-Degree Azimuth Polar RCS Chart
  const polarRcsData = useMemo(() => {
    const points = [];
    const sweepRad = (wingLeadingEdgeSweep_deg * Math.PI) / 180;

    for (let az = 0; az < 360; az += 15) {
      const azRad = (az * Math.PI) / 180;

      // Base shape lobe pattern (Spikes perpendicular to leading edges: 90 - sweep)
      const spikeAngle1 = (Math.PI / 2) - sweepRad;
      const spikeAngle2 = (Math.PI / 2) + sweepRad;

      let shapeFactor = 0.05 + 0.15 * Math.abs(Math.sin(azRad)); // Beam is naturally higher

      // Spikes at specular edge reflections
      const diff1 = Math.abs(Math.cos(azRad - spikeAngle1));
      const diff2 = Math.abs(Math.cos(azRad - spikeAngle2));
      const specularSpike = Math.exp(-((diff1 - 1) ** 2) / 0.02) + Math.exp(-((diff2 - 1) ** 2) / 0.02);

      // S-duct and RAM reduction
      const ramFactor = 10 ** (-parseFloat(rcsCalc.ramAbsorption_dB) / 10);
      const stealthVal = Math.max(0.0005, (shapeFactor + specularSpike * 0.4) * ramFactor * (hasSDuctIntake ? 0.3 : 1.0));
      const standardVal = Math.max(0.02, (shapeFactor * 4 + specularSpike * 2.5 + (Math.abs(Math.cos(azRad)) > 0.8 ? 1.2 : 0.4)));

      points.push({
        angle: `${az}°`,
        stealthRCS: Number((10 * Math.log10(stealthVal)).toFixed(1)),
        standardRCS: Number((10 * Math.log10(standardVal)).toFixed(1)),
      });
    }
    return points;
  }, [wingLeadingEdgeSweep_deg, rcsCalc.ramAbsorption_dB, hasSDuctIntake]);

  // Visual Wave Scattering Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let t = 0;

    const render = () => {
      t += 0.04;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Dark radar background
      ctx.fillStyle = '#080d1a';
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2 + 50;
      const cy = h / 2;

      // Radar Source (Left)
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(60, cy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '10px monospace';
      ctx.fillStyle = '#f87171';
      ctx.fillText(`EM RADAR (${bandSpec.name.substring(0, 8)})`, 20, cy - 14);

      // Incident Radar Waves (Red spherical expanding arcs)
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 1.5;
      for (let r = 20; r < 360; r += 35) {
        const rad = (r + (t * 60)) % 360;
        ctx.beginPath();
        ctx.arc(60, cy, rad, -Math.PI / 4, Math.PI / 4);
        ctx.stroke();
      }

      // Draw Stealth Drone Airframe (Center)
      ctx.save();
      ctx.translate(cx, cy);

      // Blended Stealth Delta Shape
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = hasSDuctIntake ? '#38bdf8' : '#64748b';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(-70, 0); // Nose pointing left towards radar
      ctx.lineTo(20, -55); // Left Wingtip
      ctx.lineTo(35, -25);
      ctx.lineTo(15, 0);   // Trailing V-notch
      ctx.lineTo(35, 25);
      ctx.lineTo(20, 55);  // Right Wingtip
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // RAM Coating Highlight Layer (Amber edge border)
      if (ramThickness_mm > 1.0) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // S-Duct Intake visual
      if (hasSDuctIntake) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(-20, 0, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.stroke();
      }

      ctx.restore();

      // Scattered Reflected Weak Waves (Cyan / Amber redirected away)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 1;
      [-1, 1].forEach((dir) => {
        ctx.beginPath();
        ctx.moveTo(cx - 30, cy);
        ctx.lineTo(cx + 80, cy + dir * 110);
        ctx.stroke();
      });

      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animFrame);
  }, [bandSpec, hasSDuctIntake, ramThickness_mm]);

  return (
    <div className="space-y-5 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Стелс-Оптимизация ЭПР & Радиопоглощающие Покрытия RAM (Stealth RCS Studio)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Фича #99
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Физическая оптика (PO/PTD), расчет круговой диаграммы обратного рассеяния $\sigma(\theta)$ в диапазонах L..Ku, интерференционные экраны Солсбери и S-образные воздухозаборники.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Visual Wave scattering & Polar Radar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start font-mono">
        {/* Left Visual Wave Canvas (6 cols) */}
        <div className="lg:col-span-6 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-indigo-300 font-bold">
              <Radio className="w-4 h-4 text-indigo-400" />
              <span>Поле Падающих и Отраженных ЭМ Волн РЛС</span>
            </div>
            <span className="text-[11px] text-slate-400">
              {bandSpec.name} ({bandSpec.freq_GHz} ГГц)
            </span>
          </div>

          <div className="w-full h-72 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 relative">
            <canvas ref={canvasRef} width={580} height={300} className="w-full h-full object-cover" />
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-sans space-y-1">
            <div className="font-bold text-indigo-300 font-mono">📐 Формула физической оптики плоской грани и экрана Солсбери:</div>
            <MathText text="\sigma_{\text{PO}} = \frac{4\pi A^2}{\lambda^2} \left(\frac{\sin(ka\sin\theta)}{ka\sin\theta}\right)^2, \quad Z_{\text{in}} = \sqrt{\frac{\mu_r}{\varepsilon_r}} \tanh\left(j \frac{2\pi d}{\lambda} \sqrt{\varepsilon_r \mu_r}\right)" />
          </div>
        </div>

        {/* Right Polar Radar Diagram (6 cols) */}
        <div className="lg:col-span-6 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-xs text-white font-bold">
              <Compass className="w-4 h-4 text-indigo-400" />
              <span>Круговая Диаграмма ЭПР $\sigma(\theta)$ [дБм²] (360° Азимут)</span>
            </div>
            <span className="text-xs text-emerald-400 font-bold">
              Нос: {rcsCalc.stealthFrontalRCS_dBsm} дБм²
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={polarRcsData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="angle" stroke="#94a3b8" fontSize={9} />
                <PolarRadiusAxis stroke="#64748b" domain={[-35, 10]} fontSize={9} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Radar name="Обычный БПЛА (без стелс)" dataKey="standardRCS" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} />
                <Radar name="Стелс-БПЛА с RAM" dataKey="stealthRCS" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Control Sliders & Configuration Bar */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 font-mono">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Параметры Стелс-Конфигурации и Частотного Диапазона РЛС</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
            MIL-STD-2169 STEALTH
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Radar Band Selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300">Диапазон частот РЛС:</label>
            <select
              value={radarBand}
              onChange={(e) => setRadarBand(e.target.value as RadarBandType)}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-400"
            >
              <option value="L_band">L-диапазон (1.5 ГГц / &lambda;=20 см)</option>
              <option value="S_band">S-диапазон (3.0 ГГц / &lambda;=10 см)</option>
              <option value="C_band">C-диапазон (6.0 ГГц / &lambda;=5 см)</option>
              <option value="X_band">X-диапазон (10.0 ГГц / &lambda;=3 см)</option>
              <option value="Ku_band">Ku-диапазон (16.0 ГГц / &lambda;=1.87 см)</option>
            </select>
          </div>

          {/* RAM Thickness Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Толщина слоя RAM:</span>
              <span className="text-indigo-400 font-bold">{ramThickness_mm} мм</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={6.0}
              step={0.1}
              value={ramThickness_mm}
              onChange={(e) => setRamThickness_mm(parseFloat(e.target.value))}
              className="w-full accent-indigo-400 cursor-pointer"
            />
          </div>

          {/* S-Duct Intake Toggle */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300">S-образный воздухозаборник:</label>
            <button
              type="button"
              onClick={() => setHasSDuctIntake(!hasSDuctIntake)}
              className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                hasSDuctIntake
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              {hasSDuctIntake ? 'ЭКРАНИРОВАН (-14 дБ)' : 'ПРЯМОЙ КАНАЛ'}
            </button>
          </div>

          {/* Internal Weapons Bay Toggle */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300">Внутрифюзеляжный отсек АСП:</label>
            <button
              type="button"
              onClick={() => setInternalWeaponsBay(!internalWeaponsBay)}
              className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                internalWeaponsBay
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              {internalWeaponsBay ? 'ВНУТРЕННИЙ ОТСЕК' : 'ВНЕШНЯЯ ПОДВЕСКА'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Performance Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400">Фронтальная ЭПР (&sigma;):</span>
          <div className="text-sm font-bold text-emerald-400">{rcsCalc.stealthFrontalRCS_m2} м²</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400">Фронтальная ЭПР [дБм²]:</span>
          <div className="text-sm font-bold text-cyan-300">{rcsCalc.stealthFrontalRCS_dBsm} дБм²</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400">Поглощение RAM покрытия:</span>
          <div className="text-sm font-bold text-amber-400">-{rcsCalc.ramAbsorption_dB} дБ</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400">Снижение дальности обнаружения:</span>
          <div className="text-sm font-bold text-emerald-300">-{rcsCalc.detectionRangeReduction_pct}%</div>
        </div>
      </div>
    </div>
  );
};
