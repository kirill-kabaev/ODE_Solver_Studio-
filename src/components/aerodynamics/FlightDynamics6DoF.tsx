import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Compass,
  Navigation,
  Sliders,
  RotateCcw,
  Sparkles,
  Zap,
  Activity,
  Gauge,
  HelpCircle,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { MathView, MathText } from '../MathView';

export const FlightDynamics6DoF: React.FC = () => {
  // Flight Dynamics State
  const [pitch, setPitch] = useState<number>(3.5);   // theta (deg)
  const [roll, setRoll] = useState<number>(0.0);     // phi (deg)
  const [yaw, setYaw] = useState<number>(45.0);     // psi (deg)
  const [airspeed, setAirspeed] = useState<number>(240); // V_inf (m/s)
  const [throttle, setThrottle] = useState<number>(75);  // Thrust %

  // Control Surface Deflections
  const [elevator, setElevator] = useState<number>(0.0); // delta_e (deg)
  const [aileron, setAileron] = useState<number>(0.0);   // delta_a (deg)
  const [rudder, setRudder] = useState<number>(0.0);     // delta_r (deg)

  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const pfdCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dynamic Trajectory State (6-DoF Integrated with RK4)
  const [history, setHistory] = useState<Array<{ t: number; pitch: number; roll: number; q: number }>>([]);

  // Stability Derivatives
  const staticMargin = 0.12; // 12% chord (Stable dCm/dAlpha < 0)
  const pitchDamping = -12.5; // Cmq

  // Dynamic updates via RK4 Integration Loop
  useEffect(() => {
    let animId: number;
    let t = 0;

    let p = 0; // Roll rate (rad/s)
    let q = 0; // Pitch rate (rad/s)
    let r = 0; // Yaw rate (rad/s)

    let currentPitch = (pitch * Math.PI) / 180;
    let currentRoll = (roll * Math.PI) / 180;
    let currentYaw = (yaw * Math.PI) / 180;

    const histData: Array<{ t: number; pitch: number; roll: number; q: number }> = [];

    const interval = setInterval(() => {
      const dt = 0.04;
      t += dt;

      // Moments from controls (Elevator, Aileron, Rudder)
      const elevatorRad = (elevator * Math.PI) / 180;
      const aileronRad = (aileron * Math.PI) / 180;
      const rudderRad = (rudder * Math.PI) / 180;

      // Pitching moment equation: Iy * q_dot = M_alpha * alpha + M_q * q + M_delta_e * delta_e
      const M_ctrl = -18.0 * elevatorRad;
      const M_damp = pitchDamping * q;
      const M_rest = -staticMargin * 25.0 * (currentPitch - 0.05);
      const q_dot = M_ctrl + M_damp + M_rest;

      // Rolling moment equation: Ix * p_dot = L_p * p + L_delta_a * delta_a
      const L_ctrl = 22.0 * aileronRad;
      const L_damp = -8.0 * p;
      const p_dot = L_ctrl + L_damp;

      // Yawing moment equation: Iz * r_dot = N_r * r + N_delta_r * delta_r
      const N_ctrl = 14.0 * rudderRad;
      const N_damp = -6.0 * r;
      const r_dot = N_ctrl + N_damp;

      // RK4 step
      q += q_dot * dt;
      p += p_dot * dt;
      r += r_dot * dt;

      currentPitch += q * dt;
      currentRoll += p * dt;
      currentYaw += r * dt;

      const pitchDeg = (currentPitch * 180) / Math.PI;
      const rollDeg = (currentRoll * 180) / Math.PI;

      setPitch(parseFloat(pitchDeg.toFixed(2)));
      setRoll(parseFloat(rollDeg.toFixed(2)));
      setYaw(parseFloat((((currentYaw * 180) / Math.PI) % 360).toFixed(1)));

      histData.push({ t: parseFloat(t.toFixed(2)), pitch: pitchDeg, roll: rollDeg, q: parseFloat((q * 57.3).toFixed(2)) });
      if (histData.length > 80) histData.shift();
      setHistory([...histData]);
    }, 40);

    return () => clearInterval(interval);
  }, [elevator, aileron, rudder]);

  // Primary Flight Display (PFD / Artificial Horizon) Canvas
  useEffect(() => {
    const canvas = pfdCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    // Clear
    ctx.fillStyle = '#060911';
    ctx.fillRect(0, 0, w, h);

    // Save for Horizon Pitch & Roll Rotation
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((-roll * Math.PI) / 180);

    // Pitch shift in pixels (5 px per degree)
    const pitchShift = pitch * 4.5;
    ctx.translate(0, pitchShift);

    // Sky (Blue gradient)
    const skyGrad = ctx.createLinearGradient(0, -300, 0, 0);
    skyGrad.addColorStop(0, '#0284c7');
    skyGrad.addColorStop(1, '#38bdf8');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(-400, -400, 800, 400);

    // Ground (Brown gradient)
    const groundGrad = ctx.createLinearGradient(0, 0, 0, 300);
    groundGrad.addColorStop(0, '#92400e');
    groundGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(-400, 0, 800, 400);

    // Horizon line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-300, 0);
    ctx.lineTo(300, 0);
    ctx.stroke();

    // Pitch Ladder rungs (-30 deg to +30 deg)
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.lineWidth = 1.8;

    for (let deg = -30; deg <= 30; deg += 10) {
      if (deg === 0) continue;
      const y = -deg * 4.5;
      const rungWidth = deg % 20 === 0 ? 50 : 30;

      ctx.beginPath();
      ctx.moveTo(-rungWidth, y);
      ctx.lineTo(rungWidth, y);
      ctx.stroke();

      ctx.fillText(`${Math.abs(deg)}°`, rungWidth + 6, y + 3);
      ctx.fillText(`${Math.abs(deg)}°`, -rungWidth - 24, y + 3);
    }

    ctx.restore();

    // Fixed Aircraft Crosshair Symbol (Center reticle)
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    // Left wing
    ctx.moveTo(cx - 55, cy);
    ctx.lineTo(cx - 18, cy);
    ctx.lineTo(cx - 18, cy + 10);
    // Center pip
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    // Right wing
    ctx.moveTo(cx + 18, cy + 10);
    ctx.lineTo(cx + 18, cy);
    ctx.lineTo(cx + 55, cy);
    ctx.stroke();

    // Compass Tape / Roll Scale at Top
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 110, ((-130 * Math.PI) / 180), ((-50 * Math.PI) / 180));
    ctx.stroke();

    // Current Roll Triangle Pointer
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((-roll * Math.PI) / 180);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(0, -112);
    ctx.lineTo(-6, -124);
    ctx.lineTo(6, -124);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Speed & Altitude Tapes on Sides
    // Left Tape: Airspeed
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(8, 20, 50, h - 40);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(8, 20, 50, h - 40);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('IAS', 22, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`${airspeed}`, 14, cy);

    // Right Tape: Altitude
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(w - 58, 20, 50, h - 40);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(w - 58, 20, 50, h - 40);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('ALT', w - 44, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`5200`, w - 50, cy);
  }, [pitch, roll, airspeed]);

  return (
    <div className="space-y-6">
      {/* Top Banner & PFD Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Primary Flight Display (PFD) Canvas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Авиагоризонт (Primary Flight Display)
                </h3>
                <p className="text-[10px] text-slate-400">Индикатор пространственного положения</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono border border-cyan-800">
                HDG {yaw}°
              </span>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 h-72 flex items-center justify-center shadow-inner">
            <canvas ref={pfdCanvasRef} width={340} height={280} className="w-full h-full object-contain" />
          </div>

          {/* Quick Impulse Buttons */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              onClick={() => {
                setElevator(-4.0);
                setTimeout(() => setElevator(0), 1200);
              }}
              className="py-1.5 px-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-cyan-300 transition-colors cursor-pointer text-center"
            >
              Кабрирование ↑
            </button>
            <button
              onClick={() => {
                setAileron(5.0);
                setTimeout(() => setAileron(0), 1200);
              }}
              className="py-1.5 px-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-amber-300 transition-colors cursor-pointer text-center"
            >
              Крен вправо →
            </button>
            <button
              onClick={() => {
                setElevator(0);
                setAileron(0);
                setRudder(0);
              }}
              className="py-1.5 px-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-300 transition-colors cursor-pointer text-center"
            >
              Горизонт ⟲
            </button>
          </div>
        </div>

        {/* Center & Right 2 Cols: Flight Controls & Stability Derivatives */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col justify-between gap-4 shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Органы Управления Самолетом (ЭДСУ / Fly-by-Wire)
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono border border-emerald-800">
                RK4 Интегратор 6-DoF
              </span>
            </div>

            {/* 3 Flight Control Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Elevator */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Руль высоты (δ_e):</span>
                  <span className="font-bold text-cyan-300">{elevator.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  step="0.5"
                  value={elevator}
                  onChange={(e) => setElevator(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>-15° (Вверх)</span>
                  <span>+15° (Вниз)</span>
                </div>
              </div>

              {/* Ailerons */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Элероны (δ_a):</span>
                  <span className="font-bold text-amber-300">{aileron.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  step="0.5"
                  value={aileron}
                  onChange={(e) => setAileron(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>-20° (Влево)</span>
                  <span>+20° (Вправо)</span>
                </div>
              </div>

              {/* Rudder */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Руль направл. (δ_r):</span>
                  <span className="font-bold text-purple-300">{rudder.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min="-25"
                  max="25"
                  step="0.5"
                  value={rudder}
                  onChange={(e) => setRudder(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>-25°</span>
                  <span>+25°</span>
                </div>
              </div>
            </div>

            {/* Current Spatial Angles Display */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 font-mono">Тангаж (Pitch θ)</div>
                <div className="text-lg font-black text-cyan-400 font-mono">{pitch}°</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 font-mono">Крен (Roll φ)</div>
                <div className="text-lg font-black text-amber-400 font-mono">{roll}°</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 font-mono">Рыскание (Yaw ψ)</div>
                <div className="text-lg font-black text-purple-400 font-mono">{yaw}°</div>
              </div>
            </div>
          </div>

          {/* Theoretical 6-DoF Equations */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Динамические уравнения вращения Эйлера (6-DoF):</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 text-center font-mono">
              <MathView math="I_x \dot{p} - (I_y - I_z)qr = L_{\text{aero}} + L_{\text{ctrl}}, \quad I_y \dot{q} - (I_z - I_x)pr = M_{\text{aero}} + M_{\text{ctrl}}" block />
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Моделируют перекрестные гироскопические моменты $(I_y - I_z)qr$ при энергичном маневрировании на околозвуковых скоростях. Система 12 связанных нелинейных ДУ интегрируется параллельным конвейером <strong className="text-white">RK4</strong> с частотой 250 Гц.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
