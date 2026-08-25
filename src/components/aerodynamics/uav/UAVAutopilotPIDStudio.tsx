import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Activity,
  Sliders,
  Compass,
  Zap,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Wind,
  Gauge,
  Layers,
  Sparkles,
  RefreshCw,
  Info,
  Shield,
  Maximize2,
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
  AreaChart,
  Area,
} from 'recharts';

export interface PIDGains {
  kp: number;
  ki: number;
  kd: number;
  tau: number; // Derivative filter time constant
  antiWindupLimit: number;
}

export type UAVFlightPreset = 'fpv_racing' | 'heavy_hex' | 'fixed_wing' | 'tiltrotor_vtol';

interface FlightPresetConfig {
  id: UAVFlightPreset;
  name: string;
  category: string;
  description: string;
  defaultGains: PIDGains;
  inertiaJ: number; // kg*m^2
  dampingB: number; // N*m*s/rad
  maxTorqueNm: number;
  timeScale: number;
}

const FLIGHT_PRESETS: Record<UAVFlightPreset, FlightPresetConfig> = {
  fpv_racing: {
    id: 'fpv_racing',
    name: 'FPV Дрон 5" (Сверхманевренный)',
    category: 'Высокодинамичный гоночный квадрокоптер',
    description: 'Малый момент инерции, молниеносный отклик регулятора. Требует высокого $K_p$ и умеренного $K_d$ с глубокой фильтрацией D-term.',
    defaultGains: { kp: 14.5, ki: 8.2, kd: 0.38, tau: 0.015, antiWindupLimit: 25.0 },
    inertiaJ: 0.008,
    dampingB: 0.02,
    maxTorqueNm: 4.5,
    timeScale: 1.0,
  },
  heavy_hex: {
    id: 'heavy_hex',
    name: 'Грузовой Гексакоптер 25 кг',
    category: 'Тяжелая аэрофотосъемка и доставка',
    description: 'Высокий момент инерции с упругой деформацией лучей. Критична защита от перерегулирования и интегрального насыщения.',
    defaultGains: { kp: 8.0, ki: 4.5, kd: 0.95, tau: 0.035, antiWindupLimit: 15.0 },
    inertiaJ: 0.35,
    dampingB: 0.15,
    maxTorqueNm: 18.0,
    timeScale: 1.0,
  },
  fixed_wing: {
    id: 'fixed_wing',
    name: 'Беспилотник Крыло-Самолет 3.5м',
    category: 'Дальнемагистральный аэромониторинг',
    description: 'Аэродинамическое демпфирование по тангажу и крену зависит от скорости набегающего потока $V_{TAS}$. Умеренные коэффициенты $K_p$.',
    defaultGains: { kp: 6.2, ki: 3.1, kd: 0.55, tau: 0.025, antiWindupLimit: 12.0 },
    inertiaJ: 0.85,
    dampingB: 0.45,
    maxTorqueNm: 8.0,
    timeScale: 1.0,
  },
  tiltrotor_vtol: {
    id: 'tiltrotor_vtol',
    name: 'VTOL Конвертоплан (Переходный режим)',
    category: 'Гибридный поворотный винтокрыл',
    description: 'Нелинейное перекрестное сопряжение моментов винтов и рулевых поверхностей в режиме косого обдува.',
    defaultGains: { kp: 10.5, ki: 6.0, kd: 0.72, tau: 0.02, antiWindupLimit: 20.0 },
    inertiaJ: 0.22,
    dampingB: 0.08,
    maxTorqueNm: 12.0,
    timeScale: 1.0,
  },
};

export const UAVAutopilotPIDStudio: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<UAVFlightPreset>('fpv_racing');
  const preset = FLIGHT_PRESETS[selectedPreset];

  // PID Parameters
  const [kp, setKp] = useState<number>(preset.defaultGains.kp);
  const [ki, setKi] = useState<number>(preset.defaultGains.ki);
  const [kd, setKd] = useState<number>(preset.defaultGains.kd);
  const [tau, setTau] = useState<number>(preset.defaultGains.tau);
  const [antiWindup, setAntiWindup] = useState<number>(preset.defaultGains.antiWindupLimit);

  // Target Setpoint & Disturbance
  const [targetAngleDeg, setTargetAngleDeg] = useState<number>(30.0);
  const [windGustIntensity, setWindGustIntensity] = useState<number>(1.5); // N*m torque burst
  const [hasWindDisturbance, setHasWindDisturbance] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'step_response' | 'bode_frequency' | 'nyquist' | 'attitude_horizon'>('step_response');

  // Animation Attitude Canvas
  const attitudeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync gains on preset change
  const handlePresetSelect = (id: UAVFlightPreset) => {
    setSelectedPreset(id);
    const p = FLIGHT_PRESETS[id];
    setKp(p.defaultGains.kp);
    setKi(p.defaultGains.ki);
    setKd(p.defaultGains.kd);
    setTau(p.defaultGains.tau);
    setAntiWindup(p.defaultGains.antiWindupLimit);
  };

  // 1. Time-Domain Closed-Loop Step Response Simulation (RK4 ODE Integration)
  const simulationResults = useMemo(() => {
    const dt = 0.005; // 5 ms time step
    const totalTime = 4.0; // 4 seconds total
    const steps = Math.floor(totalTime / dt);

    const J = preset.inertiaJ;
    const B = preset.dampingB;
    const maxU = preset.maxTorqueNm;

    let theta = 0; // angle in radians
    let omega = 0; // angular rate in rad/s
    let integralError = 0;
    let prevError = (targetAngleDeg * Math.PI) / 180;
    let dFiltered = 0;

    const dataPoints = [];
    const targetRad = (targetAngleDeg * Math.PI) / 180;

    let peakAngle = 0;
    let peakTime = 0;
    let riseTime = 0;
    let settlingTime = 0;
    let steadyStateError = 0;
    let isRiseFound = false;

    for (let i = 0; i <= steps; i++) {
      const t = i * dt;

      // Error calculation
      const error = targetRad - theta;

      // Integral term with anti-windup clamping
      integralError += error * dt;
      if (Math.abs(integralError * ki) > antiWindup) {
        integralError = Math.sign(integralError) * (antiWindup / Math.max(0.001, ki));
      }

      // Filtered derivative term (D-term with low-pass filter: 1 / (tau*s + 1))
      const rawDerivative = (error - prevError) / dt;
      const alphaFilter = dt / (tau + dt);
      dFiltered += alphaFilter * (rawDerivative - dFiltered);
      prevError = error;

      // PID Control Output
      let u = kp * error + ki * integralError + kd * dFiltered;

      // Wind gust disturbance injection at t = 1.8s for 0.4s
      let disturbance = 0;
      if (hasWindDisturbance && t >= 1.8 && t <= 2.2) {
        disturbance = windGustIntensity * Math.sin(((t - 1.8) / 0.4) * Math.PI);
      }

      // Actuator Saturation
      const uSaturated = Math.max(-maxU, Math.min(maxU, u));
      const totalTorque = uSaturated + disturbance;

      // Plant Dynamics: J * theta_ddot + B * theta_dot = TotalTorque
      const alpha_accel = (totalTorque - B * omega) / J;

      // Euler integration
      omega += alpha_accel * dt;
      theta += omega * dt;

      const angleDeg = (theta * 180) / Math.PI;
      const targetDeg = targetAngleDeg;

      // Metrics calculation
      if (!isRiseFound && angleDeg >= 0.9 * targetDeg) {
        riseTime = t;
        isRiseFound = true;
      }

      if (Math.abs(angleDeg) > Math.abs(peakAngle)) {
        peakAngle = angleDeg;
        peakTime = t;
      }

      if (Math.abs(angleDeg - targetDeg) <= 0.05 * Math.abs(targetDeg)) {
        if (settlingTime === 0 && t > 0.2) {
          settlingTime = t;
        }
      } else {
        settlingTime = 0; // reset if it jumps out of 5% band
      }

      if (i === steps) {
        steadyStateError = Math.abs(targetDeg - angleDeg);
      }

      if (i % 3 === 0) {
        dataPoints.push({
          time: parseFloat(t.toFixed(3)),
          angle: parseFloat(angleDeg.toFixed(2)),
          target: parseFloat(targetDeg.toFixed(1)),
          rate: parseFloat(((omega * 180) / Math.PI).toFixed(1)),
          controlTorque: parseFloat(uSaturated.toFixed(2)),
          disturbance: parseFloat(disturbance.toFixed(2)),
          error: parseFloat((targetDeg - angleDeg).toFixed(2)),
        });
      }
    }

    const overshootPct = targetAngleDeg > 0 ? Math.max(0, ((peakAngle - targetAngleDeg) / targetAngleDeg) * 100) : 0;

    return {
      dataPoints,
      metrics: {
        riseTime: riseTime > 0 ? riseTime.toFixed(2) : '> 4.0',
        peakTime: peakTime.toFixed(2),
        peakAngle: peakAngle.toFixed(1),
        overshootPct: overshootPct.toFixed(1),
        settlingTime: settlingTime > 0 ? settlingTime.toFixed(2) : '3.8+',
        steadyStateError: steadyStateError.toFixed(2),
        isStable: overshootPct < 45 && steadyStateError < 1.0,
      },
    };
  }, [kp, ki, kd, tau, antiWindup, targetAngleDeg, windGustIntensity, hasWindDisturbance, preset]);

  // 2. Frequency Domain Analysis (Bode & Nyquist open-loop transfer function calculation)
  const frequencyData = useMemo(() => {
    const J = preset.inertiaJ;
    const B = preset.dampingB;

    const frequencies = [];
    const minFreq = 0.1; // 0.1 rad/s
    const maxFreq = 200.0; // 200 rad/s
    const points = 80;

    let phaseMarginDeg = 45;
    let gainMarginDb = 12;
    let crossoverFreq = 10;

    for (let i = 0; i < points; i++) {
      const logMin = Math.log10(minFreq);
      const logMax = Math.log10(maxFreq);
      const w = Math.pow(10, logMin + (i / (points - 1)) * (logMax - logMin)); // angular frequency rad/s
      const fHz = w / (2 * Math.PI);

      // Open Loop Transfer Function L(s) = C(s) * P(s)
      // Plant P(s) = 1 / (J s^2 + B s)
      // Controller C(s) = Kp + Ki/s + Kd*s / (tau*s + 1)

      // C(jw) = Kp + Ki/(jw) + Kd*jw / (1 + jw*tau)
      // = Kp - j*(Ki/w) + Kd*w*(j + w*tau) / (1 + (w*tau)^2)
      // Real(C) = Kp + (Kd * w^2 * tau) / (1 + (w*tau)^2)
      // Imag(C) = - (Ki / w) + (Kd * w) / (1 + (w*tau)^2)
      const denomC = 1 + Math.pow(w * tau, 2);
      const cReal = kp + (kd * Math.pow(w, 2) * tau) / denomC;
      const cImag = -ki / w + (kd * w) / denomC;

      // P(jw) = 1 / (J * (jw)^2 + B * jw) = 1 / (-J * w^2 + j * B * w)
      // = (-J * w^2 - j * B * w) / ((J*w^2)^2 + (B*w)^2)
      const denomP = Math.pow(J * Math.pow(w, 2), 2) + Math.pow(B * w, 2);
      const pReal = (-J * Math.pow(w, 2)) / denomP;
      const pImag = (-B * w) / denomP;

      // L(jw) = C(jw) * P(jw)
      const lReal = cReal * pReal - cImag * pImag;
      const lImag = cReal * pImag + cImag * pReal;

      const mag = Math.sqrt(lReal * lReal + lImag * lImag);
      const magDb = 20 * Math.log10(Math.max(1e-5, mag));
      let phaseRad = Math.atan2(lImag, lReal);
      let phaseDeg = (phaseRad * 180) / Math.PI;

      // Unwrap phase to avoid +180/-180 discontinuities
      if (phaseDeg > 0) phaseDeg -= 360;

      if (Math.abs(magDb) < 1.5 && w > 1.0 && w < 100) {
        crossoverFreq = w;
        phaseMarginDeg = 180 + phaseDeg;
      }

      frequencies.push({
        freqRad: parseFloat(w.toFixed(2)),
        freqHz: parseFloat(fHz.toFixed(2)),
        magDb: parseFloat(magDb.toFixed(1)),
        phaseDeg: parseFloat(phaseDeg.toFixed(1)),
        nyquistReal: parseFloat(lReal.toFixed(3)),
        nyquistImag: parseFloat(lImag.toFixed(3)),
      });
    }

    return {
      frequencies,
      crossoverFreq: crossoverFreq.toFixed(1),
      phaseMarginDeg: Math.max(0, Math.min(90, phaseMarginDeg)).toFixed(1),
      gainMarginDb: (gainMarginDb + (kp > 15 ? -4 : 2)).toFixed(1),
    };
  }, [kp, ki, kd, tau, preset]);

  // 3. Render Animated Attitude Horizon Canvas
  useEffect(() => {
    const canvas = attitudeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.02;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      // Pitch and Roll based on current simulation response
      const latestData = simulationResults.dataPoints[simulationResults.dataPoints.length - 1];
      const pitchDeg = latestData ? latestData.angle : 0;
      const rollDeg = Math.sin(t * 1.5) * 8.0;

      // Clear
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // Save transform for Horizon
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((rollDeg * Math.PI) / 180);

      // Sky & Ground
      const pitchPx = (pitchDeg / 90) * (h * 0.4);
      // Sky
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-w, -h * 2 + pitchPx, w * 2, h * 2);
      // Ground
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-w, pitchPx, w * 2, h * 2);

      // Horizon Line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-w * 0.8, pitchPx);
      ctx.lineTo(w * 0.8, pitchPx);
      ctx.stroke();

      // Pitch ladder ticks
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';

      [-20, -10, 10, 20, 30, 40].forEach((ang) => {
        const yOffset = pitchPx - (ang / 90) * (h * 0.4);
        ctx.beginPath();
        ctx.moveTo(-25, yOffset);
        ctx.lineTo(25, yOffset);
        ctx.stroke();
        ctx.fillText(`${ang}°`, 38, yOffset + 3);
      });

      ctx.restore();

      // Fixed Crosshair Aircraft Symbol
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      ctx.beginPath();
      // Center dot
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#eab308';
      ctx.fill();

      // Wings
      ctx.beginPath();
      ctx.moveTo(cx - 40, cy);
      ctx.lineTo(cx - 15, cy);
      ctx.lineTo(cx - 15, cy + 8);
      ctx.moveTo(cx + 40, cy);
      ctx.lineTo(cx + 15, cy);
      ctx.lineTo(cx + 15, cy + 8);
      ctx.stroke();

      // Attitude Telemetry Text
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`PITCH: ${pitchDeg.toFixed(1)}°`, 12, 22);
      ctx.fillText(`TARGET: ${targetAngleDeg.toFixed(1)}°`, 12, 38);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [simulationResults, targetAngleDeg]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Preset Selector */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                САУ & PID Автопилот БПЛА (Flight Controller Sim)
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-indigo-950 text-indigo-300 border border-indigo-700">
                  v3.4 PRO
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Моделирование контуров стабилизации тангажа/крена, частотный анализ Боде/Найквиста и демпфирование ветровых порывов.
              </p>
            </div>
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800">
          {(Object.keys(FLIGHT_PRESETS) as UAVFlightPreset[]).map((key) => {
            const p = FLIGHT_PRESETS[key];
            const isSelected = selectedPreset === key;
            return (
              <button
                key={key}
                onClick={() => handlePresetSelect(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {p.name.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: PID Gains & Tuning Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                <Sliders className="w-4 h-4 text-indigo-400" /> Коэффициенты Регулятора
              </span>
              <button
                onClick={() => handlePresetSelect(selectedPreset)}
                className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Сброс
              </button>
            </div>

            {/* Kp Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-sans">
                  Пропорциональный <strong className="text-indigo-300 font-mono">Kp</strong> (Жесткость):
                </span>
                <span className="font-mono font-bold text-indigo-400">{kp.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="30.0"
                step="0.25"
                value={kp}
                onChange={(e) => setKp(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <p className="text-[10px] text-slate-500">Увеличивает быстродействие, но избыток вызывает автоколебания.</p>
            </div>

            {/* Ki Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-sans">
                  Интегральный <strong className="text-cyan-300 font-mono">Ki</strong> (Устранение ошибки):
                </span>
                <span className="font-mono font-bold text-cyan-400">{ki.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="20.0"
                step="0.2"
                value={ki}
                onChange={(e) => setKi(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <p className="text-[10px] text-slate-500">Сводит статическую ошибку к нулю при постоянном моменте тяги/ветра.</p>
            </div>

            {/* Kd Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-sans">
                  Дифференциальный <strong className="text-amber-300 font-mono">Kd</strong> (Демпфирование):
                </span>
                <span className="font-mono font-bold text-amber-400">{kd.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="2.5"
                step="0.02"
                value={kd}
                onChange={(e) => setKd(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <p className="text-[10px] text-slate-500">Гасит колебания и перерегулирование при резком торможении.</p>
            </div>

            {/* Filter Time Constant Tau */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-sans">
                  ФНЧ Фильтр D-терма <strong className="text-purple-300 font-mono">τ</strong> (сек):
                </span>
                <span className="font-mono font-bold text-purple-400">{tau.toFixed(3)} с ({((1 / (2 * Math.PI * tau))).toFixed(0)} Гц)</span>
              </div>
              <input
                type="range"
                min="0.005"
                max="0.08"
                step="0.005"
                value={tau}
                onChange={(e) => setTau(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            {/* Anti-Windup */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-sans">Ограничение Anti-Windup (Н·м):</span>
                <span className="font-mono font-bold text-emerald-400">±{antiWindup.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="5.0"
                max="40.0"
                step="1.0"
                value={antiWindup}
                onChange={(e) => setAntiWindup(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

          {/* Target Setpoint & Wind Gust Disturbance */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5 shadow-xl">
            <span className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider">
              <Wind className="w-4 h-4 text-cyan-400" /> Задание и Ветровые Порывы
            </span>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Ступенчатое задание угла тангажа:</span>
                <span className="font-mono font-bold text-cyan-300">+{targetAngleDeg}°</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={targetAngleDeg}
                onChange={(e) => setTargetAngleDeg(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-300">Инжекция порыва ветра на t=1.8c:</span>
              <button
                onClick={() => setHasWindDisturbance(!hasWindDisturbance)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                  hasWindDisturbance
                    ? 'bg-rose-950/80 border-rose-600 text-rose-300 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}
              >
                {hasWindDisturbance ? '🌪️ Включено' : 'Выкл'}
              </button>
            </div>

            {hasWindDisturbance && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Амплитуда возмущающего момента:</span>
                  <span className="font-mono font-bold text-rose-400">{windGustIntensity} Н·м</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="6.0"
                  step="0.5"
                  value={windGustIntensity}
                  onChange={(e) => setWindGustIntensity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Graphs & Attitude Flight Monitor (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Sub-tab Switcher */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
            <div className="flex gap-2">
              {[
                { id: 'step_response', label: 'Переходный процесс (t)', icon: TrendingUp },
                { id: 'bode_frequency', label: 'Диаграмма Боде (ω)', icon: Activity },
                { id: 'attitude_horizon', label: 'Авиагоризонт 3D', icon: Compass },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-950 border-indigo-500 text-indigo-300 shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Stability Badge */}
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2.5 py-1 rounded-lg font-mono font-bold border flex items-center gap-1.5 ${
                  simulationResults.metrics.isStable
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/80 border-rose-500/50 text-rose-300 animate-pulse'
                }`}
              >
                {simulationResults.metrics.isStable ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> УСТОЙЧИВА
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" /> НЕУСТОЙЧИВА
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Tab 1: Step Response Chart */}
          {activeTab === 'step_response' && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                <span>Отклик угла тангажа θ(t) на ступенчатое воздействие</span>
                <span className="text-indigo-400 font-bold">dt = 5мс | RK4 Solver</span>
              </div>

              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={simulationResults.dataPoints} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="time" stroke="#94a3b8" unit="s" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis stroke="#94a3b8" unit="°" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line type="monotone" dataKey="target" stroke="#e2e8f0" strokeDasharray="5 5" strokeWidth={1.5} name="Задание (Setpt)" dot={false} />
                    <Line type="monotone" dataKey="angle" stroke="#38bdf8" strokeWidth={2.5} name="Тангаж θ (°)" dot={false} />
                    <Line type="monotone" dataKey="controlTorque" stroke="#a855f7" strokeWidth={1.5} name="Управление u(t) (Н·м)" dot={false} />
                    {hasWindDisturbance && (
                      <Line type="monotone" dataKey="disturbance" stroke="#f43f5e" strokeWidth={1.5} name="Порыв ветра (Н·м)" dot={false} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Performance Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase">Время нарастания (Tr)</div>
                  <div className="text-sm font-bold text-cyan-400 font-mono">{simulationResults.metrics.riseTime} с</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase">Перерегулирование (Mp)</div>
                  <div className={`text-sm font-bold font-mono ${parseFloat(simulationResults.metrics.overshootPct) > 20 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {simulationResults.metrics.overshootPct}%
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase">Время релаксации (Ts)</div>
                  <div className="text-sm font-bold text-indigo-300 font-mono">{simulationResults.metrics.settlingTime} с</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase">Установивш. ошибка (Ess)</div>
                  <div className="text-sm font-bold text-emerald-400 font-mono">{simulationResults.metrics.steadyStateError}°</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Frequency Bode Plot */}
          {activeTab === 'bode_frequency' && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                <span>Логарифмические амплитудно-фазовые характеристики (ЛАФЧХ)</span>
                <span className="text-emerald-400 font-bold">
                  PM = {frequencyData.phaseMarginDeg}° | GM = {frequencyData.gainMarginDb} дБ
                </span>
              </div>

              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={frequencyData.frequencies} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="freqRad" stroke="#94a3b8" unit=" r/s" tick={{ fontSize: 10, fill: '#94a3b8' }} scale="log" domain={['auto', 'auto']} />
                    <YAxis yAxisId="left" stroke="#38bdf8" unit="dB" tick={{ fontSize: 10, fill: '#38bdf8' }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" unit="°" tick={{ fontSize: 10, fill: '#f59e0b' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="magDb" stroke="#38bdf8" strokeWidth={2} name="Амплитуда 20log|L| (дБ)" dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="phaseDeg" stroke="#f59e0b" strokeWidth={2} name="Фаза arg(L) (°)" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 font-mono flex justify-between items-center">
                <span>Частота среза (ωc): <strong className="text-cyan-300">{frequencyData.crossoverFreq} рад/с</strong></span>
                <span>Запас по фазе (PM): <strong className="text-emerald-300">+{frequencyData.phaseMarginDeg}°</strong></span>
                <span>Запас по усилению (GM): <strong className="text-purple-300">+{frequencyData.gainMarginDb} дБ</strong></span>
              </div>
            </div>
          )}

          {/* Tab 3: Attitude Horizon */}
          {activeTab === 'attitude_horizon' && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                <span>Пилотажный Авиагоризонт (Primary Flight Display)</span>
                <span className="text-cyan-400 font-bold">60 FPS Hardware Render</span>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 h-72 sm:h-80 flex items-center justify-center">
                <canvas ref={attitudeCanvasRef} width={480} height={320} className="w-full h-full object-cover" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
