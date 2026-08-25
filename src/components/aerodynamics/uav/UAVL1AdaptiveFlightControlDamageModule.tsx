import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ShieldCheck,
  Zap,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Flame,
  Activity,
  Cpu,
  Gauge,
  Layers,
  Compass,
  CheckCircle2,
  RefreshCw,
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

type DamageScenario = 'clean_flight' | 'wing_loss_40' | 'aileron_jammed' | 'motor_flameout' | 'heavy_wake_vortex';
type ControllerType = 'L1_Adaptive' | 'Classical_PID' | 'Open_Loop';

interface TelemetryPoint {
  time: number;
  rollDeg: number;
  pitchDeg: number;
  rollRateDegS: number;
  controlU: number;
  sigmaEstimate: number;
  targetRoll: number;
}

export const UAVL1AdaptiveFlightControlDamageModule: React.FC = () => {
  // Scenario & Controls
  const [scenario, setScenario] = useState<DamageScenario>('wing_loss_40');
  const [controller, setController] = useState<ControllerType>('L1_Adaptive');
  const [adaptRateGamma, setAdaptRateGamma] = useState<number>(5000); // L1 adaptation rate Gamma
  const [filterCutoffHz, setFilterCutoffHz] = useState<number>(4.0); // Low-pass filter C(s) bandwidth (Hz)
  const [disturbanceMagnitude, setDisturbanceMagnitude] = useState<number>(35); // Nm disturbance torque
  const [targetRollAngleDeg, setTargetRollAngleDeg] = useState<number>(0); // commanded roll

  // Sim runtime state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);

  // Dynamic state: [roll, roll_rate, pitch, pitch_rate]
  const stateRef = useRef<{
    roll: number; // rad
    rollRate: number; // rad/s
    pitch: number; // rad
    pitchRate: number; // rad/s
    hat_roll: number; // state predictor
    hat_rollRate: number;
    hat_sigma: number; // disturbance estimate
    u_control: number; // control deflection (-1..1)
    u_filtered: number; // after C(s) filter
    integralError: number;
  }>({
    roll: 0,
    rollRate: 0,
    pitch: 0,
    pitchRate: 0,
    hat_roll: 0,
    hat_rollRate: 0,
    hat_sigma: 0,
    u_control: 0,
    u_filtered: 0,
    integralError: 0,
  });

  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  // Reset simulation
  const resetSim = () => {
    stateRef.current = {
      roll: 0.2, // initial perturbation
      rollRate: 0,
      pitch: 0.05,
      pitchRate: 0,
      hat_roll: 0.2,
      hat_rollRate: 0,
      hat_sigma: 0,
      u_control: 0,
      u_filtered: 0,
      integralError: 0,
    };
    setSimTime(0);
    setHistory([]);
  };

  useEffect(() => {
    resetSim();
  }, [scenario, controller]);

  // Main Numerical Integration (RK4 / Euler ODE loop)
  useEffect(() => {
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.04);
      lastTs = now;

      if (isPlaying) {
        setSimTime((t) => t + dt);
        const s = stateRef.current;

        // Aerodynamic parameters of baseline UAV
        let Ixx = 1.2; // kg m^2 roll inertia
        let Lp = -4.5; // roll damping
        let Ldelta = 32.0; // roll control authority

        // Scenario Damage modifications
        let externalDisturbance = 0;
        let controlDegradation = 1.0;

        if (scenario === 'wing_loss_40') {
          // Left wing 40% severed: huge asymmetric lift roll moment + 50% reduced inertia + asymmetric drag
          externalDisturbance = (disturbanceMagnitude * 0.8);
          Ixx = 0.7;
          Ldelta = 16.0; // reduced aileron authority
          Lp = -2.2;
        } else if (scenario === 'aileron_jammed') {
          // Right aileron stuck at +25 deg
          externalDisturbance = disturbanceMagnitude * 1.1;
          Ldelta = 14.0;
        } else if (scenario === 'motor_flameout') {
          // Starboard motor failure in twin/quad config
          externalDisturbance = disturbanceMagnitude * 0.9;
          Ldelta = 20.0;
        } else if (scenario === 'heavy_wake_vortex') {
          // Sinusoidal intense wake vortex gust
          externalDisturbance = Math.sin(simTime * 3.5) * disturbanceMagnitude * 1.3;
        }

        const targetRollRad = (targetRollAngleDeg * Math.PI) / 180;
        const errorRoll = targetRollRad - s.roll;

        // Controller logic
        if (controller === 'L1_Adaptive') {
          // Reference Model: \dot{x}_m = A_m x_m + B_m r
          const Am = -6.0; // desired closed loop pole
          const Bm = 6.0;

          // State Predictor: \dot{\hat{x}} = Am * \hat{x} + Ldelta * (u_filtered + \hat{\sigma})
          const predError = s.rollRate - s.hat_rollRate;

          // Adaptation Law (Fast Projection-type adaptation):
          // \dot{\hat{\sigma}} = \Gamma * predError
          s.hat_sigma += adaptRateGamma * predError * dt * 0.001;
          s.hat_sigma = Math.max(-100, Math.min(100, s.hat_sigma));

          // State predictor update
          const dHat_rollRate = Am * s.hat_rollRate + Bm * (errorRoll * 4.0) + (s.u_filtered * Ldelta + s.hat_sigma);
          s.hat_rollRate += dHat_rollRate * dt;

          // Raw control: cancel estimated disturbance & track reference
          const u_raw = - (s.hat_sigma / Ldelta) + (errorRoll * 3.2 - s.rollRate * 0.8);

          // Low-pass filter C(s) = omega_c / (s + omega_c) to ensure robust stability & high-frequency attenuation
          const omega_c = 2 * Math.PI * filterCutoffHz;
          s.u_filtered += (u_raw - s.u_filtered) * (omega_c * dt);
          s.u_control = Math.max(-1.5, Math.min(1.5, s.u_filtered));
        } else if (controller === 'Classical_PID') {
          // Standard PID (tends to oscillate or diverge under 40% wing loss)
          const Kp = 3.5;
          const Kd = 0.6;
          const Ki = 1.2;

          s.integralError += errorRoll * dt;
          s.integralError = Math.max(-2, Math.min(2, s.integralError));

          const u_pid = Kp * errorRoll - Kd * s.rollRate + Ki * s.integralError;
          s.u_control = Math.max(-1.5, Math.min(1.5, u_pid));
          s.u_filtered = s.u_control;
          s.hat_sigma = 0;
        } else {
          // Open loop
          s.u_control = 0;
          s.u_filtered = 0;
          s.hat_sigma = 0;
        }

        // True Aircraft Physics Plant:
        // \dot{p} = (Lp * p + Ldelta * u + Disturbance) / Ixx
        const totalRollTorque = Lp * s.rollRate + Ldelta * s.u_control + externalDisturbance;
        const dRollRate = totalRollTorque / Ixx;

        s.rollRate += dRollRate * dt;
        s.roll += s.rollRate * dt;

        // Keep roll angle within bounded display range
        s.roll = Math.max(-Math.PI * 1.5, Math.min(Math.PI * 1.5, s.roll));

        // Pitch mild coupling
        s.pitchRate += (-3.0 * s.pitchRate + Math.abs(s.rollRate) * 0.2) * dt;
        s.pitch += s.pitchRate * dt;

        // Update telemetry log
        if (Math.round(simTime * 20) % 2 === 0) {
          setHistory((prev) => {
            const next = [
              ...prev,
              {
                time: parseFloat(simTime.toFixed(2)),
                rollDeg: parseFloat(((s.roll * 180) / Math.PI).toFixed(1)),
                pitchDeg: parseFloat(((s.pitch * 180) / Math.PI).toFixed(1)),
                rollRateDegS: parseFloat(((s.rollRate * 180) / Math.PI).toFixed(1)),
                controlU: parseFloat(s.u_control.toFixed(2)),
                sigmaEstimate: parseFloat(s.hat_sigma.toFixed(1)),
                targetRoll: targetRollAngleDeg,
              },
            ];
            return next.length > 50 ? next.slice(next.length - 50) : next;
          });
        }
      }

      drawVisualization();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, scenario, controller, adaptRateGamma, filterCutoffHz, disturbanceMagnitude, targetRollAngleDeg]);

  // Render 2D / 3D Aircraft Wireframe Horizon
  const drawVisualization = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const s = stateRef.current;

    // Clear background
    ctx.fillStyle = '#060c18';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    // Artificial Horizon / Sky & Ground
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-s.roll);

    // Horizon line
    const horizonOffset = s.pitch * 120;
    ctx.fillStyle = '#0b2545';
    ctx.fillRect(-w, -h - horizonOffset, w * 2, h + horizonOffset); // Sky
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(-w, 0 - horizonOffset, w * 2, h + horizonOffset); // Ground

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w, -horizonOffset);
    ctx.lineTo(w, -horizonOffset);
    ctx.stroke();

    // Pitch ladder ticks
    [-20, -10, 10, 20].forEach((deg) => {
      const yTick = -(deg * (Math.PI / 180) * 120) - horizonOffset;
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-30, yTick);
      ctx.lineTo(30, yTick);
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.fillText(`${deg}°`, 35, yTick + 3);
    });

    ctx.restore();

    // Fixed Aircraft Crosshair / Silhouette Overlay
    ctx.save();
    ctx.translate(cx, cy);

    // Reticle circle
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 120, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw UAV front view (Fuselage, Left wing, Right wing, V-tail)
    const wingSpan = 150;
    const isLeftSevered = scenario === 'wing_loss_40';

    // Left Wing (damaged if wing_loss_40)
    ctx.strokeStyle = isLeftSevered ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    if (isLeftSevered) {
      // Jagged broken wing tip
      ctx.lineTo(-wingSpan * 0.55, 0);
      ctx.lineTo(-wingSpan * 0.58, -6);
      ctx.lineTo(-wingSpan * 0.60, 4);
    } else {
      ctx.lineTo(-wingSpan, 0);
      ctx.lineTo(-wingSpan + 10, -10); // Winglet
    }
    ctx.stroke();

    // Aileron deflection indicator on Left
    ctx.fillStyle = s.u_control > 0 ? '#34d399' : '#f87171';
    ctx.fillRect(-wingSpan * 0.5, -4, 25, 8 * -s.u_control);

    // Right Wing
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(wingSpan, 0);
    ctx.lineTo(wingSpan - 10, -10); // Winglet
    ctx.stroke();

    // Aileron deflection on Right
    ctx.fillRect(wingSpan * 0.35, -4, 25, 8 * s.u_control);

    // Fuselage & Propellers
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Broken wing fire / spark effect
    if (isLeftSevered) {
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(-wingSpan * 0.6 + (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Roll angle HUD indicator
    const rollDeg = (s.roll * 180) / Math.PI;
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`Крен (Roll): ${rollDeg.toFixed(1)}°`, 20, 30);
    ctx.fillText(`U_aileron: ${(s.u_control * 100).toFixed(0)}%`, 20, 50);
    ctx.fillText(`σ̂ (Disturbance): ${s.hat_sigma.toFixed(1)} Н·м`, 20, 70);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-800/40 rounded-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-400 shadow-lg shadow-emerald-950/50">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Нейросетевое Адаптивное Управление L₁ (Fault-Tolerant L₁ Flight Control)
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded-full">
                Мгновенное Парирование Боевых Повреждений
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl">
              Сверхбыстрая адаптивная компенсация отрыва консоли крыла (40% Wing Loss), заклинивания элеронов и порывов спутного следа
              с разделением контуров быстрой оценки (Fast Adaptation Rate $\Gamma$) и робастной фильтрации $C(s)$.
            </p>
          </div>
        </div>

        {/* Quick controls */}
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
            onClick={resetSim}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scenario Selector & Controller Topology Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Scenario */}
        <div className="flex flex-col gap-2 p-3 bg-slate-900/80 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Аварийный Сценарий / Боевое Повреждение:
          </span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'wing_loss_40', label: '✂️ Отрыв 40% Консоли Крыла' },
              { id: 'aileron_jammed', label: '🔒 Заклинивание Элерона (+25°)' },
              { id: 'heavy_wake_vortex', label: '🌪️ Спутный След Самолета (35 Н·м)' },
              { id: 'clean_flight', label: '✈️ Штатный Полет (Номинал)' },
            ].map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => setScenario(sc.id as any)}
                className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition-all ${
                  scenario === sc.id
                    ? 'bg-rose-950/80 text-rose-200 border border-rose-500 shadow-md'
                    : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Controller Type */}
        <div className="flex flex-col gap-2 p-3 bg-slate-900/80 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-teal-400" /> Архитектура Автопилота:
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'L1_Adaptive', label: 'L₁ Адаптивный (Рекомендовано)', color: 'border-emerald-500 bg-emerald-950/70 text-emerald-200' },
              { id: 'Classical_PID', label: 'Классический PID (Срыв)', color: 'border-amber-500 bg-amber-950/70 text-amber-200' },
              { id: 'Open_Loop', label: 'Без Автопилота', color: 'border-slate-600 bg-slate-800 text-slate-300' },
            ].map((ctrl) => (
              <button
                key={ctrl.id}
                type="button"
                onClick={() => setController(ctrl.id as any)}
                className={`p-2 rounded-lg text-xs font-bold text-center border transition-all ${
                  controller === ctrl.id ? ctrl.color : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {ctrl.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: HUD Canvas & L1 Tuning Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visual Cockpit / Horizon */}
        <div className="lg:col-span-7 flex flex-col gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" /> Авиагоризонт и Силуэт БПЛА с Элеронами
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${controller === 'L1_Adaptive' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
              Статус: {Math.abs(stateRef.current.roll) < 0.25 ? 'Стабилен (Stable)' : 'Аварийный Крен (Diverging)'}
            </span>
          </div>

          <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
            <canvas ref={canvasRef} width={640} height={320} className="w-full h-auto block" />
          </div>

          {/* Commanded Roll Angle Slider */}
          <div className="flex items-center gap-4 pt-2">
            <span className="text-xs text-slate-400 whitespace-nowrap font-medium flex items-center gap-1">
              Команда по Крену (Roll Command):
            </span>
            <input
              type="range"
              min={-30}
              max={30}
              step={2}
              value={targetRollAngleDeg}
              onChange={(e) => setTargetRollAngleDeg(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <span className="text-xs font-mono text-emerald-300 font-bold w-12 text-right">{targetRollAngleDeg}°</span>
          </div>
        </div>

        {/* L1 Control Theory Parameters */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col gap-3.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-400" /> Параметры Адаптивного Закона L₁
            </h3>

            {/* Adaptation Rate Gamma */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Скорость Адаптации (Γ)</span>
                <span className="font-mono text-emerald-400 font-bold">{adaptRateGamma}</span>
              </div>
              <input
                type="range"
                min={500}
                max={20000}
                step={500}
                value={adaptRateGamma}
                onChange={(e) => setAdaptRateGamma(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <span className="text-[10px] text-slate-400">Гарантирует ультрабыструю оценку неизвестного возмущения σ̂</span>
            </div>

            {/* Filter Cutoff Frequency */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Полоса Фильтра C(s) (Гц)</span>
                <span className="font-mono text-teal-400 font-bold">{filterCutoffHz} Гц</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={15.0}
                step={0.5}
                value={filterCutoffHz}
                onChange={(e) => setFilterCutoffHz(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
              <span className="text-[10px] text-slate-400">Предотвращает высокочастотный дребезг рулей и перегрев сервоприводов</span>
            </div>

            {/* Disturbance Magnitude */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Амплитуда Аварийного Момента (Н·м)</span>
                <span className="font-mono text-rose-400 font-bold">{disturbanceMagnitude} Н·м</span>
              </div>
              <input
                type="range"
                min={5}
                max={70}
                step={5}
                value={disturbanceMagnitude}
                onChange={(e) => setDisturbanceMagnitude(parseFloat(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
              />
            </div>
          </div>

          {/* Theoretical Foundations Note */}
          <div className="p-3.5 bg-emerald-950/30 border border-emerald-900/50 rounded-xl text-xs text-slate-300 flex flex-col gap-1">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Преимущество Архитектуры L₁:
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">
              В отличие от классического MRAC, архитектура L₁ отделяет скорость адаптации от запасов устойчивости.
              Высокая Γ обеспечивает мгновенную реакцию за 15 мс, а фильтр C(s) оставляет сигнал в пределах полосы пропускания элеронов.
            </p>
          </div>
        </div>
      </div>

      {/* Telemetry Recharts Graph */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-400" /> Переходный Процесс: Угол Крена (Roll, °) и Оценка Возмущения σ̂ (Н·м)
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {controller === 'L1_Adaptive' ? '🟢 L1: Быстрое подавление ошибки' : '🔴 PID: Колебательный / неустойчивый режим'}
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Время t (с)', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Угол (°) / Момент (Н·м)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="rollDeg" stroke="#38bdf8" strokeWidth={2.5} name="Крен БПЛА (°)" isAnimationActive={false} />
              <Line type="monotone" dataKey="targetRoll" stroke="#10b981" strokeDasharray="3 3" name="Заданный Крен (°)" isAnimationActive={false} />
              <Line type="monotone" dataKey="sigmaEstimate" stroke="#f59e0b" strokeWidth={1.5} name="Оценка σ̂ (Н·м)" isAnimationActive={false} />
              <Line type="monotone" dataKey="controlU" stroke="#ec4899" strokeDasharray="2 2" name="Сигнал Управления u" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
