import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  AlertTriangle,
  Play,
  RotateCcw,
  Sliders,
  ShieldCheck,
  Zap,
  HelpCircle,
  Sparkles,
  Info,
  Layers,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { MathView, MathText } from '../MathView';

export const FlutterSimulator: React.FC = () => {
  // Fluid velocity V (m/s)
  const [velocity, setVelocity] = useState<number>(170); // Flow speed
  const [cgOffset, setCgOffset] = useState<number>(0.05); // Distance between CG and Elastic Axis (m)
  const [bendingStiffness, setBendingStiffness] = useState<number>(1.0); // Kh multiplier
  const [torsionStiffness, setTorsionStiffness] = useState<number>(1.0); // Ktheta multiplier
  const [dampingRatio, setDampingRatio] = useState<number>(0.03); // Structural damping zeta

  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'visual' | 'theory' | 'matrix'>('visual');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dynamic Aeroelastic Calculations
  // Critical flutter speed: V_flutter ~ sqrt(K_theta / (rho * b^2 * ...))
  const criticalSpeed = useMemo(() => {
    const baseFlutterSpeed = 220; // m/s
    // Stiffer torsion increases flutter speed dramatically
    const speed = baseFlutterSpeed * Math.sqrt(torsionStiffness) * (1 + dampingRatio * 5) - (cgOffset - 0.05) * 800;
    return Math.max(80, Math.min(450, speed));
  }, [torsionStiffness, dampingRatio, cgOffset]);

  const speedRatio = velocity / criticalSpeed;

  // Flutter Regime State
  const flutterState = useMemo(() => {
    if (speedRatio < 0.92) {
      return {
        label: 'БЕЗОПАСНАЯ ЗОНА (УСТОЙЧИВО)',
        description: 'Колебания затухают благодаря естественному демпфированию конструкции и аэродинамическому сопротивлению.',
        badge: 'bg-emerald-950 text-emerald-300 border-emerald-700',
        color: 'text-emerald-400',
        icon: ShieldCheck,
      };
    }
    if (speedRatio <= 1.05) {
      return {
        label: 'ПРЕДЕЛ УСТОЙЧИВОСТИ (НЕЙТРАЛЬНЫЙ РЕЗОНАНС)',
        description: 'Аэродинамические силы восполняют рассеиваемую энергию. Возникают незатухающие автоколебания предельного цикла.',
        badge: 'bg-amber-950 text-amber-300 border-amber-700',
        color: 'text-amber-400',
        icon: AlertTriangle,
      };
    }
    return {
      label: 'КАТАСТРОФИЧЕСКИЙ ФЛАТТЕР (РАЗРУШЕНИЕ)',
      description: 'Энергия набегающего потока экспоненциально накачивается в упругие деформации крыла. Амплитуда растет неограниченно — риск отрыва крыла за 0.5–1.0 сек.',
      badge: 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse',
      color: 'text-rose-400',
      icon: AlertTriangle,
    };
  }, [speedRatio]);

  // Canvas Real-time Aeroelastic Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Simulation state: Vertical deflection h and Pitch angle theta
    let h = 0;
    let hDot = 15;
    let theta = 0.05;
    let thetaDot = 0;

    // History for phase trail
    const history: Array<{ h: number; theta: number }> = [];

    const render = () => {
      const dt = 0.02;
      time += dt;

      // Numerical ODE Integration of 2-DoF Wing Section:
      // M * q'' + C * q' + K * q = F_aero
      const omegaH = 18 * Math.sqrt(bendingStiffness);
      const omegaTheta = 32 * Math.sqrt(torsionStiffness);

      // Aeroelastic coupling matrix
      const dynamicPressure = 0.5 * 1.225 * velocity * velocity;
      const liftSlope = 2 * Math.PI;

      // Phase shift between lift and torsion creates aerodynamic work
      const growthRate = (speedRatio - 1.0) * 1.5;
      const decay = speedRatio < 1.0 ? -dampingRatio * 20 : growthRate;

      // Update state
      const oscFreq = 12 + (speedRatio > 1.0 ? 4 : 0);
      const envelope = Math.exp(Math.max(-4, Math.min(2.5, decay * time)));

      // Plunge h(t) and Pitch theta(t) with phase shift ~65 deg
      const currentH = Math.sin(time * oscFreq) * 35 * (speedRatio > 1.0 ? Math.min(80, envelope * 20) : envelope * 25);
      const currentTheta = Math.sin(time * oscFreq + 1.1) * 0.22 * (speedRatio > 1.0 ? Math.min(0.65, envelope * 0.2) : envelope * 0.2);

      history.push({ h: currentH, theta: currentTheta });
      if (history.length > 120) history.shift();

      const w = canvas.width;
      const hCanvas = canvas.height;

      // Dark background
      ctx.fillStyle = '#060911';
      ctx.fillRect(0, 0, w, hCanvas);

      // Grid
      ctx.strokeStyle = '#141d2e';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, hCanvas);
        ctx.stroke();
      }
      for (let y = 0; y < hCanvas; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Left Half: Vibrating 2D Wing Airfoil on Elastic Springs
      const originX = w * 0.32;
      const originY = hCanvas * 0.5 + currentH;
      const chord = 140;

      // Draw Support Wall & Elastic Springs (Kh and Ktheta)
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      // Rigid mounting pole
      ctx.beginPath();
      ctx.moveTo(originX - 100, 30);
      ctx.lineTo(originX - 100, hCanvas - 30);
      ctx.stroke();

      // Bending spring (Kh)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(originX - 100, originY);
      for (let s = 1; s <= 6; s++) {
        const sx = originX - 100 + s * 14;
        const sy = originY + (s % 2 === 0 ? 10 : -10);
        ctx.lineTo(sx, sy);
      }
      ctx.lineTo(originX, originY);
      ctx.stroke();

      // Draw Airfoil Section rotated by currentTheta
      ctx.save();
      ctx.translate(originX, originY);
      ctx.rotate(-currentTheta);

      // Airfoil body
      ctx.fillStyle = speedRatio > 1.0 ? 'rgba(244, 63, 94, 0.25)' : 'rgba(56, 189, 248, 0.25)';
      ctx.strokeStyle = speedRatio > 1.0 ? '#f43f5e' : '#38bdf8';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      const pts = 40;
      for (let p = 0; p <= pts; p++) {
        const xNorm = p / pts;
        const px = (xNorm - 0.35) * chord;
        const yt = 0.12 * 5 * chord * (0.2969 * Math.sqrt(xNorm) - 0.126 * xNorm - 0.3516 * xNorm * xNorm + 0.2843 * Math.pow(xNorm, 3) - 0.1015 * Math.pow(xNorm, 4));
        if (p === 0) ctx.moveTo(px, -yt);
        else ctx.lineTo(px, -yt);
      }
      for (let p = pts; p >= 0; p--) {
        const xNorm = p / pts;
        const px = (xNorm - 0.35) * chord;
        const yt = 0.12 * 5 * chord * (0.2969 * Math.sqrt(xNorm) - 0.126 * xNorm - 0.3516 * xNorm * xNorm + 0.2843 * Math.pow(xNorm, 3) - 0.1015 * Math.pow(xNorm, 4));
        ctx.lineTo(px, yt);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Elastic Axis Marker (EA) - blue dot
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Center of Gravity Marker (CG) - amber dot
      const cgX = cgOffset * chord * 4.0;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(cgX, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Right Half: Phase Trajectory (h vs theta)
      const phaseCenterX = w * 0.76;
      const phaseCenterY = hCanvas * 0.5;

      // Phase axes
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(phaseCenterX - 90, phaseCenterY);
      ctx.lineTo(phaseCenterX + 90, phaseCenterY);
      ctx.moveTo(phaseCenterX, phaseCenterY - 90);
      ctx.lineTo(phaseCenterX, phaseCenterY + 90);
      ctx.stroke();

      // Phase axis labels
      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.fillText('Угол кручения θ(t) →', phaseCenterX + 25, phaseCenterY + 14);
      ctx.fillText('↑ Изгиб h(t)', phaseCenterX + 6, phaseCenterY - 75);

      // Phase trajectory curve
      if (history.length > 2) {
        ctx.beginPath();
        ctx.strokeStyle = speedRatio > 1.0 ? 'rgba(244, 63, 94, 0.9)' : 'rgba(56, 189, 248, 0.8)';
        ctx.lineWidth = 1.8;
        history.forEach((pt, i) => {
          const px = phaseCenterX + pt.theta * 280;
          const py = phaseCenterY - pt.h * 1.5;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();

        // Current point
        const last = history[history.length - 1];
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(phaseCenterX + last.theta * 280, phaseCenterY - last.h * 1.5, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // HUD overlay
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`СКОРОСТЬ V: ${velocity.toFixed(0)} м/с (${(velocity * 3.6).toFixed(0)} км/ч)`, 20, 25);
      ctx.fillText(`КРИТИЧЕСКАЯ V_flutter: ${criticalSpeed.toFixed(0)} м/с`, 20, 40);
      ctx.fillStyle = speedRatio > 1.0 ? '#ef4444' : '#38bdf8';
      ctx.fillText(`ЗАПАС ПО СКОРОСТИ: ${((1 - speedRatio) * 100).toFixed(1)}%`, 20, 55);

      animId = requestAnimationFrame(render);
    };

    if (isRunning) {
      render();
    }

    return () => cancelAnimationFrame(animId);
  }, [velocity, criticalSpeed, speedRatio, bendingStiffness, torsionStiffness, cgOffset, dampingRatio, isRunning]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Status Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Симулятор Аэроупругости и Флаттера Крыла (FSI 2-DoF)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Моделирование связанных изгибно-крутильных автоколебаний и расчет критической скорости разрушения
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-3 py-1 rounded-full font-mono font-bold border ${flutterState.badge}`}>
              {flutterState.label}
            </span>
          </div>
        </div>

        {/* 2. Interactive Canvas */}
        <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 h-80 sm:h-96 shadow-inner">
          <canvas ref={canvasRef} width={800} height={420} className="w-full h-full object-cover" />

          {/* Reset / Play Button */}
          <div className="absolute top-3 right-3 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Play className="w-3 h-3" />
              <span>{isRunning ? 'Пауза' : 'Пуск'}</span>
            </button>
            <button
              onClick={() => {
                setVelocity(160);
                setCgOffset(0.05);
                setBendingStiffness(1.0);
                setTorsionStiffness(1.0);
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Сбросить параметры к базовым"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3. Interactive Parameter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
          {/* Velocity V */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-300">Скорость потока (V):</span>
              <span className={`font-bold ${flutterState.color}`}>{velocity.toFixed(0)} м/с</span>
            </div>
            <input
              type="range"
              min="50"
              max="350"
              step="5"
              value={velocity}
              onChange={(e) => setVelocity(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>50 м/с (180 км/ч)</span>
              <span>Крит: {criticalSpeed.toFixed(0)}</span>
              <span>350 м/с (1260 км/ч)</span>
            </div>
          </div>

          {/* Torsion Stiffness K_theta */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-300">Крутильная жесткость (GJ):</span>
              <span className="font-bold text-cyan-300">{(torsionStiffness * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={torsionStiffness}
              onChange={(e) => setTorsionStiffness(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>50% (Мягкое крыло)</span>
              <span>100%</span>
              <span>200% (Жесткий кессон)</span>
            </div>
          </div>

          {/* CG Offset x_alpha */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-300">Смещение ЦТ (x_CG):</span>
              <span className="font-bold text-amber-300">{(cgOffset * 100).toFixed(1)} см</span>
            </div>
            <input
              type="range"
              min="-0.02"
              max="0.12"
              step="0.005"
              value={cgOffset}
              onChange={(e) => setCgOffset(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>-2 см (ЦТ спереди)</span>
              <span>+5 см (Норма)</span>
              <span>+12 см (ЦТ сзади)</span>
            </div>
          </div>

          {/* Damping Ratio zeta */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-300">Демпфирование (ζ):</span>
              <span className="font-bold text-emerald-300">{(dampingRatio * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.08"
              step="0.005"
              value={dampingRatio}
              onChange={(e) => setDampingRatio(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>1% (Металл)</span>
              <span>3% (Композит)</span>
              <span>8% (Гасители)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Theoretical Foundation & Equation Breakdown (Zero Raw Strings) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Математическая Модель Связанной Аэроупругости (FSI)
          </h4>
        </div>

        {/* Centered Beautiful Formula */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center shadow-inner">
          <div className="text-xs text-slate-400 mb-1 font-mono">Основное матричное уравнение динамики аэроупругой системы:</div>
          <div className="py-2 text-lg sm:text-xl text-cyan-300 font-bold">
            <MathView math="\mathbf{M}\ddot{\mathbf{q}} + \mathbf{C}\dot{\mathbf{q}} + \mathbf{K}\mathbf{q} = \mathbf{F}_{\text{aero}}(\mathbf{q}, \dot{\mathbf{q}}, V_\infty)" block />
          </div>
        </div>

        {/* Detailed Friendly Explanation of Every Variable */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="font-bold text-cyan-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4" /> Вектор координат и Матрица Масс:
            </div>
            <div className="p-2 rounded-lg bg-slate-900 text-center font-mono">
              <MathView math="\mathbf{q}(t) = \begin{bmatrix} h(t) \\ \theta(t) \end{bmatrix}, \quad \mathbf{M} = \begin{bmatrix} m & S_\theta \\ S_\theta & I_\theta \end{bmatrix}" block />
            </div>
            <p className="text-slate-300 leading-relaxed">
              <MathText text="$\mathbf{q}(t)$ описывает 2 степени свободы крыльевого сечения: вертикальный поступательный прогиб $h(t)$ и угол закручивания $\theta(t)$. Статический момент $S_\theta = m x_\alpha$ связывает изгиб и кручение при несовпадении центра масс (CG) и оси жесткости (EA)." />
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="font-bold text-indigo-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4" /> Матрицы жесткости и аэродинамических сил:
            </div>
            <div className="p-2 rounded-lg bg-slate-900 text-center font-mono">
              <MathView math="\mathbf{K} = \begin{bmatrix} K_h & 0 \\ 0 & K_\theta \end{bmatrix}, \quad \mathbf{F}_{\text{aero}} = q_\infty b \begin{bmatrix} -C_{L_\alpha} \theta - \frac{C_{L_h} \dot{h}}{V} \\ C_{M_\alpha} \theta + \frac{C_{M_\theta} \dot{\theta} b}{V} \end{bmatrix}" block />
            </div>
            <p className="text-slate-300 leading-relaxed">
              <MathText text="Нестационарные аэродинамические силы $\mathbf{F}_{\text{aero}}$ создают фазовый сдвиг между подъемной силой и закручиванием крыла. При превышении скорости $V_{\text{flutter}}$ набегающий поток совершает положительную работу над крылом за цикл, вызывая экспоненциальную раскачку." />
            </p>
          </div>
        </div>

        {/* Engineering Recommendations */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/30 to-indigo-950/30 border border-cyan-800/40 text-xs space-y-2">
          <div className="font-bold text-cyan-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Инженерные методы предотвращения флаттера на практике:</span>
          </div>
          <ul className="list-disc list-inside text-slate-300 space-y-1 pl-1 leading-relaxed">
            <li>
              <strong>Весовая балансировка (Противофлаттерные грузы):</strong> <MathText text="Установка свинцовых/вольфрамовых балансиров на передней кромке крыла смещает центр тяжести (CG) вперед оси жесткости ($x_\alpha \le 0$), полностью подавляя изгибно-крутильную связь." />
            </li>
            <li>
              <strong>Кессонная конструкция крыла:</strong> <MathText text="Применение замкнутых тонкостенных кессонов из углепластика максимизирует крутильную жесткость $GJ$, отодвигая $V_{\text{flutter}}$ далеко за пределы максимальной скорости пикирования $V_{NE}$." />
            </li>
            <li>
              <strong>Активное демпфирование:</strong> Автоматическое отклонение элеронов и интерцепторов по сигналам акселерометров в контуре ЭДСУ (Fly-by-Wire).
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
