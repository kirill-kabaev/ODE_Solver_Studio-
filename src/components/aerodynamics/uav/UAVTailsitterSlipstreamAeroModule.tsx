import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plane,
  Compass,
  RotateCcw,
  Sliders,
  Play,
  Pause,
  Activity,
  Zap,
  Layers,
  Wind,
  Shield,
  Gauge,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
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
import { MathText } from '../../MathView';

export const UAVTailsitterSlipstreamAeroModule: React.FC = () => {
  // Flight Configuration State
  const [pitchAngle_deg, setPitchAngle_deg] = useState<number>(45); // 90 = Hover, 0 = Cruise
  const [airspeed_ms, setAirspeed_ms] = useState<number>(14); // 0 to 30 m/s
  const [elevonDeflection_deg, setElevonDeflection_deg] = useState<number>(8); // -25 to +25 deg
  const [propellerThrust_N, setPropellerThrust_N] = useState<number>(38); // 0 to 70 N
  const [isCounterRotating, setIsCounterRotating] = useState<boolean>(true);
  const [propRPM, setPropRPM] = useState<number>(6200);

  // Active transition simulation
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // Sub-Tab
  const [activeTab, setActiveTab] = useState<'transition_corridor' | 'slipstream_elevon' | 'gyroscopic_moment'>('transition_corridor');

  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Aerodynamics & Slipstream Physics
  const aero = useMemo(() => {
    const rho = 1.225;
    const wingSpan_m = 1.4;
    const wingChord_m = 0.32;
    const wingArea_m2 = wingSpan_m * wingChord_m;
    const propDiameter_m = 0.38; // 15-inch prop
    const propDiskArea_m2 = Math.PI * (propDiameter_m / 2) ** 2;

    // Propeller Induced Velocity (Actuator Disk Theory)
    // T = 2 * rho * A * (V_inf + v_i) * v_i
    const vInf = airspeed_ms;
    const aCoeff = 2 * rho * propDiskArea_m2;
    const vi = (-vInf + Math.sqrt(vInf ** 2 + (2 * propellerThrust_N) / (rho * propDiskArea_m2))) / 2;
    const vSlipstream = vInf + 2 * vi; // Slipstream velocity over elevon

    // Elevon dynamic pressure (washed by propeller slipstream)
    const qSlipstream = 0.5 * rho * (vSlipstream ** 2);
    const qFreestream = 0.5 * rho * (vInf ** 2);

    // Aerodynamic coefficients as function of angle of attack (alpha = pitchAngle in transition)
    const alphaRad = (pitchAngle_deg * Math.PI) / 180;
    const elevonRad = (elevonDeflection_deg * Math.PI) / 180;

    // High alpha lift curve with post-stall
    const cL_wing = 2.0 * Math.sin(alphaRad) * Math.cos(alphaRad);
    const cD_wing = 0.03 + 1.6 * (Math.sin(alphaRad) ** 2);

    // Wing Forces
    const lift_N = qFreestream * wingArea_m2 * cL_wing;
    const drag_N = qFreestream * wingArea_m2 * cD_wing;

    // Elevon Control Moment (enhanced by slipstream)
    const elevonArea_m2 = 0.06;
    const elevonArm_m = 0.28;
    const elevonForce_N = qSlipstream * elevonArea_m2 * 2.8 * Math.sin(elevonRad);
    const elevonPitchMoment_Nm = elevonForce_N * elevonArm_m;

    // Gyroscopic Precession Moment
    const propMass_kg = 0.065;
    const propIxx = (1 / 12) * propMass_kg * (propDiameter_m ** 2);
    const omegaProp_rads = (propRPM * 2 * Math.PI) / 60;
    const pitchRate_rads = 0.35; // Typical transition pitch rate ~20 deg/s
    const gyroPrecessionMoment_Nm = isCounterRotating ? 0 : propIxx * omegaProp_rads * pitchRate_rads;

    // Total Longitudinal Force Equilibrium
    const netVerticalForce_N = propellerThrust_N * Math.sin(alphaRad) + lift_N - 3.8 * 9.81; // UAV mass ~3.8 kg
    const netHorizontalForce_N = propellerThrust_N * Math.cos(alphaRad) - drag_N;

    const controlAuthorityRatio = qSlipstream / Math.max(1, qFreestream);

    return {
      vSlipstream_ms: vSlipstream.toFixed(1),
      qSlipstream_Pa: qSlipstream.toFixed(1),
      qFreestream_Pa: qFreestream.toFixed(1),
      controlAuthorityRatio: controlAuthorityRatio.toFixed(2),
      elevonForce_N: elevonForce_N.toFixed(2),
      elevonPitchMoment_Nm: elevonPitchMoment_Nm.toFixed(2),
      gyroPrecessionMoment_Nm: gyroPrecessionMoment_Nm.toFixed(3),
      lift_N: lift_N.toFixed(1),
      drag_N: drag_N.toFixed(1),
      netVerticalForce_N: netVerticalForce_N.toFixed(1),
      netHorizontalForce_N: netHorizontalForce_N.toFixed(1),
    };
  }, [pitchAngle_deg, airspeed_ms, elevonDeflection_deg, propellerThrust_N, isCounterRotating, propRPM]);

  // Transition Curve Chart Data (from 90 deg hover to 0 deg cruise)
  const transitionChartData = useMemo(() => {
    const list = [];
    for (let angle = 0; angle <= 90; angle += 5) {
      const rad = (angle * Math.PI) / 180;
      const vTrans = (1 - angle / 90) * 22; // Speed increases as pitch flattens
      const qFreestream = 0.5 * 1.225 * (vTrans ** 2);
      const vi = Math.sqrt(Math.max(0, 38 / (2 * 1.225 * 0.11)));
      const vSlip = vTrans + vi;
      const qSlip = 0.5 * 1.225 * (vSlip ** 2);
      const lift = qFreestream * 0.44 * (2 * Math.sin(rad) * Math.cos(rad));
      const thrustReq = (3.8 * 9.81 - lift) / Math.max(0.1, Math.sin(rad));

      list.push({
        pitch: angle,
        airspeed: Number(vTrans.toFixed(1)),
        thrustReq: Number(Math.min(70, Math.max(10, thrustReq)).toFixed(1)),
        elevonPressure: Number(qSlip.toFixed(0)),
      });
    }
    return list;
  }, []);

  // Visual Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let t = 0;

    const render = () => {
      t += 0.05;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Sky Background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2 + 10;

      // Draw Tailsitter Frame rotated by pitchAngle_deg
      ctx.save();
      ctx.translate(cx, cy);
      // Coordinate orientation: 90 deg = pointing straight up
      const drawRot = -(pitchAngle_deg - 90) * (Math.PI / 180);
      ctx.rotate(drawRot);

      // Propeller Slipstream Streamlines (Cyan glowing tubes)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.5;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        const offset = i * 16;
        ctx.moveTo(offset, -90);
        ctx.lineTo(offset * 1.15, 90);
        ctx.stroke();

        // Animated particles in slipstream
        const pY = -90 + (((t * 80 + (i + 2) * 35) % 180));
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(offset * (1 + (pY + 90) * 0.001), pY, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // UAV Flying Wing Body (Delta Tailsitter)
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -60); // Nose / Motor mount
      ctx.lineTo(55, 45); // Right Wingtip
      ctx.lineTo(25, 40); // Right Elevon hinge
      ctx.lineTo(0, 35);  // Center Trailing edge
      ctx.lineTo(-25, 40);
      ctx.lineTo(-55, 45); // Left Wingtip
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dual / Single Spinning Propeller at Nose
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -62, 42 + Math.sin(t * 12) * 3, 5, 0, 0, Math.PI * 2);
      ctx.stroke();

      if (isCounterRotating) {
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.7)';
        ctx.beginPath();
        ctx.ellipse(0, -70, 42 - Math.sin(t * 12) * 3, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Deflected Elevons at the trailing edge
      const elevDef = (elevonDeflection_deg * Math.PI) / 180;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      // Right Elevon
      ctx.beginPath();
      ctx.moveTo(25, 40);
      ctx.lineTo(48 + Math.sin(elevDef) * 12, 44 + Math.cos(elevDef) * 12);
      ctx.stroke();

      // Left Elevon
      ctx.beginPath();
      ctx.moveTo(-25, 40);
      ctx.lineTo(-48 + Math.sin(elevDef) * 12, 44 + Math.cos(elevDef) * 12);
      ctx.stroke();

      // Landing Legs / Vertical Fin Stand
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(55, 45);
      ctx.lineTo(62, 65);
      ctx.moveTo(-55, 45);
      ctx.lineTo(-62, 65);
      ctx.stroke();

      ctx.restore();

      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animFrame);
  }, [pitchAngle_deg, elevonDeflection_deg, isCounterRotating]);

  return (
    <div className="space-y-5 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
            <Plane className="w-6 h-6 rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Тейлситтеры БПЛА & Аэродинамика Обдува Элевонов (Tailsitter Slipstream VTOL)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Фича #98
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Моделирование нелинейной динамики перехода висение-горизонт ($90^\circ \to 0^\circ$), обдув рулевых поверхностей струей винтов при нулевой скорости и гироскопическая прецессия.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsTransitioning(true);
              let curPitch = pitchAngle_deg;
              const step = curPitch > 45 ? -2 : 2;
              const timer = setInterval(() => {
                curPitch += step;
                if (curPitch <= 0 || curPitch >= 90) {
                  clearInterval(timer);
                  setIsTransitioning(false);
                }
                setPitchAngle_deg(Math.max(0, Math.min(90, curPitch)));
              }, 40);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-bold text-xs hover:from-amber-300 hover:to-orange-400 transition-all cursor-pointer shadow-lg shadow-amber-950/40"
          >
            <Activity className="w-4 h-4" />
            <span>{isTransitioning ? 'Переход в процессе...' : 'Авто-Переход VTOL'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Visual Viewport & Sliders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start font-mono">
        {/* Left Visual Canvas (7 cols) */}
        <div className="lg:col-span-7 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-amber-300 font-bold">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Поле Скоростей Обдува Элевонов Струей Винта (Slipstream)</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Тангаж: {pitchAngle_deg}° | Скорость: {airspeed_ms} м/с
            </span>
          </div>

          <div className="w-full h-72 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 relative">
            <canvas ref={canvasRef} width={640} height={300} className="w-full h-full object-cover" />
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-sans space-y-1">
            <div className="font-bold text-amber-300 font-mono">✨ Теория дискового движителя и скоса потока на элевонах:</div>
            <MathText text="v_i = \frac{-V_\infty + \sqrt{V_\infty^2 + \frac{2T}{\rho A}}}{2}, \quad q_{\text{slip}} = \frac{1}{2}\rho (V_\infty + 2v_i)^2, \quad M_{\text{elev}} = q_{\text{slip}} S_{\text{elev}} C_{m\delta} \delta_e" />
          </div>
        </div>

        {/* Right Sliders & Parameters (5 cols) */}
        <div className="lg:col-span-5 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Управление Тейлситтером</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
              TRANSITION 6-DOF
            </span>
          </div>

          {/* Pitch Angle Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Угол тангажа (90° = висение, 0° = горизонт):</span>
              <span className="text-amber-400 font-bold">{pitchAngle_deg}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={90}
              step={1}
              value={pitchAngle_deg}
              onChange={(e) => setPitchAngle_deg(parseInt(e.target.value, 10))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Airspeed Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Набегающая скорость полета:</span>
              <span className="text-cyan-400 font-bold">{airspeed_ms} м/с</span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={airspeed_ms}
              onChange={(e) => setAirspeed_ms(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Elevon Deflection Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Отклонение элевонов (&delta;e):</span>
              <span className="text-emerald-400 font-bold">{elevonDeflection_deg}°</span>
            </div>
            <input
              type="range"
              min={-25}
              max={25}
              step={1}
              value={elevonDeflection_deg}
              onChange={(e) => setElevonDeflection_deg(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>

          {/* Propeller Thrust Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Тяга винтомоторной группы:</span>
              <span className="text-amber-400 font-bold">{propellerThrust_N} Н</span>
            </div>
            <input
              type="range"
              min={0}
              max={65}
              step={1}
              value={propellerThrust_N}
              onChange={(e) => setPropellerThrust_N(parseInt(e.target.value, 10))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Counter-Rotating Propeller Toggle */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-300">Соосные винты противовращения:</div>
            <button
              type="button"
              onClick={() => setIsCounterRotating(!isCounterRotating)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isCounterRotating
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              {isCounterRotating ? 'АКТИВНЫ (0 N*m)' : 'ОДИНОЧНЫЙ ВИНТ'}
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400">Скорость в струе:</span>
          <div className="text-sm font-bold text-cyan-300">{aero.vSlipstream_ms} м/с</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400">Скоростной напор струи:</span>
          <div className="text-sm font-bold text-amber-400">{aero.qSlipstream_Pa} Па</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400">Эффективность рулей:</span>
          <div className="text-sm font-bold text-emerald-400">+{aero.controlAuthorityRatio}x</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400">Момент тангажа элевона:</span>
          <div className="text-sm font-bold text-white">{aero.elevonPitchMoment_Nm} Н·м</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400">Гироскопический момент:</span>
          <div className={`text-sm font-bold ${parseFloat(aero.gyroPrecessionMoment_Nm) > 0.01 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {aero.gyroPrecessionMoment_Nm} Н·м
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400">Баланс по вертикали:</span>
          <div className={`text-sm font-bold ${parseFloat(aero.netVerticalForce_N) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {aero.netVerticalForce_N} Н
          </div>
        </div>
      </div>

      {/* Transition Corridor Chart */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-amber-300 font-bold">
            <Gauge className="w-4 h-4 text-amber-400" />
            <span>Коридор Перехода: Потребная Тяга [Н] и Скорость Полета [м/с] от Угла Тангажа [°]</span>
          </div>
          <span className="text-[11px] text-slate-400">MIL-F-8785C Переходный коридор</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={transitionChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="pitch" stroke="#64748b" fontSize={10} unit="°" />
              <YAxis yAxisId="left" stroke="#f59e0b" fontSize={10} unit="N" />
              <YAxis yAxisId="right" orientation="right" stroke="#38bdf8" fontSize={10} unit="m/s" />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line yAxisId="left" type="monotone" dataKey="thrustReq" stroke="#f59e0b" strokeWidth={2} name="Потребная тяга T_req (Н)" dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="airspeed" stroke="#38bdf8" strokeWidth={2} name="Скорость полета V (м/с)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
