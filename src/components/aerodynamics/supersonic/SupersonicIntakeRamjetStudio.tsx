import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Flame,
  Activity,
  Sliders,
  RotateCcw,
  Zap,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  RefreshCw,
  Info,
  Shield,
  Gauge,
} from 'lucide-react';

export interface RampStage {
  thetaDeg: number; // Wedge deflection angle
  betaDeg: number; // Oblique shock angle
  M_downstream: number;
  P0_recovery: number;
}

export const SupersonicIntakeRamjetStudio: React.FC = () => {
  // Flight & Engine Parameters
  const [machFlight, setMachFlight] = useState<number>(2.8); // Mach 1.4 to 5.5
  const [altitudeKm, setAltitudeKm] = useState<number>(18.0); // 10 to 30 km
  const [ramp1ThetaDeg, setRamp1ThetaDeg] = useState<number>(10.0);
  const [ramp2ThetaDeg, setRamp2ThetaDeg] = useState<number>(12.0);
  const [numRamps, setNumRamps] = useState<1 | 2 | 3>(2);
  const [ramp3ThetaDeg, setRamp3ThetaDeg] = useState<number>(8.0);
  const [combustorFuelEquivRatio, setCombustorFuelEquivRatio] = useState<number>(0.85); // phi (0.4 to 1.5)
  const [cowlCaptureHeightM, setCowlCaptureHeightM] = useState<number>(0.8);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Standard Atmosphere at altitude h (km)
  const atmosphere = useMemo(() => {
    const h = Math.max(0, Math.min(30, altitudeKm));
    let T_K = 288.15;
    let P_Pa = 101325;
    if (h <= 11) {
      T_K = 288.15 - 6.5 * h;
      P_Pa = 101325 * Math.pow(T_K / 288.15, 5.25588);
    } else if (h <= 20) {
      T_K = 216.65;
      P_Pa = 22632 * Math.exp(-9.80665 * (h - 11) * 1000 / (287.05 * 216.65));
    } else {
      T_K = 216.65 + 1.0 * (h - 20);
      P_Pa = 5474.87 * Math.pow(216.65 / T_K, 34.163);
    }
    const gamma = 1.4;
    const R = 287.05;
    const soundSpeedM_s = Math.sqrt(gamma * R * T_K);
    const airVelocityM_s = machFlight * soundSpeedM_s;
    const rho_kg_m3 = P_Pa / (R * T_K);

    return {
      T_K,
      P_Pa,
      soundSpeedM_s,
      airVelocityM_s,
      rho_kg_m3,
    };
  }, [altitudeKm, machFlight]);

  // Oblique Shock Solver using Newton-Raphson for theta-beta-M equation
  // tan(theta) = 2 * cot(beta) * (M1^2 * sin^2(beta) - 1) / (M1^2 * (gamma + cos(2*beta)) + 2)
  const solveObliqueShock = (M1: number, thetaDeg: number): { betaDeg: number; M2: number; P0_ratio: number; isDetached: boolean } => {
    const gamma = 1.4;
    const theta = (thetaDeg * Math.PI) / 180;
    const mu = Math.asin(1.0 / Math.max(1.001, M1)); // Mach angle (lower bound)

    // Check maximum deflection theta_max for attached shock
    let beta = mu + 0.15;
    let isDetached = false;

    // Newton-Raphson iteration
    for (let iter = 0; iter < 40; iter++) {
      const sinB = Math.sin(beta);
      const cosB = Math.cos(beta);
      const tanB = Math.tan(beta);
      const cos2B = Math.cos(2 * beta);

      const num = M1 * M1 * sinB * sinB - 1;
      const den = M1 * M1 * (gamma + cos2B) + 2;

      if (den <= 0 || isNaN(den)) {
        isDetached = true;
        break;
      }

      const tanThetaCalc = 2 * (1 / tanB) * (num / den);
      const f = tanThetaCalc - Math.tan(theta);

      if (Math.abs(f) < 1e-6) break;

      // Numerical derivative
      const dBeta = 1e-4;
      const sinB2 = Math.sin(beta + dBeta);
      const cos2B2 = Math.cos(2 * (beta + dBeta));
      const tanThetaCalc2 = 2 * (1 / Math.tan(beta + dBeta)) * ((M1 * M1 * sinB2 * sinB2 - 1) / (M1 * M1 * (gamma + cos2B2) + 2));
      const df = (tanThetaCalc2 - tanThetaCalc) / dBeta;

      if (Math.abs(df) < 1e-8) {
        isDetached = true;
        break;
      }

      beta = beta - f / df;
      if (beta <= mu || beta >= Math.PI / 2) {
        beta = (mu + Math.PI / 2) / 2;
      }
    }

    const betaDeg = (beta * 180) / Math.PI;
    const M1n = M1 * Math.sin(beta);

    if (M1n < 1.0 || isDetached || isNaN(betaDeg)) {
      return { betaDeg: 90, M2: 0.8, P0_ratio: 0.5, isDetached: true };
    }

    // Downstream Mach M2
    const M2nSq = (1 + ((gamma - 1) / 2) * M1n * M1n) / (gamma * M1n * M1n - (gamma - 1) / 2);
    const M2 = Math.sqrt(Math.max(0.1, M2nSq)) / Math.sin(beta - theta);

    // Stagnation pressure recovery P02 / P01
    const pTerm1 = ((gamma + 1) / 2 * M1n * M1n) / (1 + ((gamma - 1) / 2) * M1n * M1n);
    const pTerm2 = (2 * gamma * M1n * M1n - (gamma - 1)) / (gamma + 1);
    const P0_ratio = Math.pow(pTerm1, gamma / (gamma - 1)) * Math.pow(pTerm2, -1 / (gamma - 1));

    return {
      betaDeg,
      M2,
      P0_ratio: Math.max(0.01, Math.min(1.0, P0_ratio)),
      isDetached: false,
    };
  };

  // Compute multi-shock inlet aerodynamics
  const intakePerformance = useMemo(() => {
    const gamma = 1.4;
    const stages: RampStage[] = [];
    let currentMach = machFlight;
    let totalP0Recovery = 1.0;
    let hasDetachedShock = false;

    const thetas = [ramp1ThetaDeg];
    if (numRamps >= 2) thetas.push(ramp2ThetaDeg);
    if (numRamps >= 3) thetas.push(ramp3ThetaDeg);

    for (let i = 0; i < thetas.length; i++) {
      const res = solveObliqueShock(currentMach, thetas[i]);
      if (res.isDetached) hasDetachedShock = true;
      stages.push({
        thetaDeg: thetas[i],
        betaDeg: res.betaDeg,
        M_downstream: res.M2,
        P0_recovery: res.P0_ratio,
      });
      totalP0Recovery *= res.P0_ratio;
      currentMach = res.M2;
    }

    // Terminal Normal Shock at inlet throat (if Mach > 1.0)
    let throatMach = currentMach;
    let normalShockP0 = 1.0;
    if (throatMach > 1.0) {
      const M1n = throatMach;
      const pTerm1 = ((gamma + 1) / 2 * M1n * M1n) / (1 + ((gamma - 1) / 2) * M1n * M1n);
      const pTerm2 = (2 * gamma * M1n * M1n - (gamma - 1)) / (gamma + 1);
      normalShockP0 = Math.pow(pTerm1, gamma / (gamma - 1)) * Math.pow(pTerm2, -1 / (gamma - 1));
      throatMach = Math.sqrt((1 + ((gamma - 1) / 2) * M1n * M1n) / (gamma * M1n * M1n - (gamma - 1) / 2));
      totalP0Recovery *= normalShockP0;
    }

    // Combustor & Ramjet Thrust Physics (Rayleigh Line Heat Addition)
    const airMassFlowKg_s = atmosphere.rho_kg_m3 * atmosphere.airVelocityM_s * cowlCaptureHeightM * 1.0;
    const fuelLHV_MJ_kg = 43.1; // Kerosene / JP-10 (43.1 MJ/kg)
    const stoichAFR = 14.7;
    const actualFuelMassFlowKg_s = (airMassFlowKg_s / stoichAFR) * combustorFuelEquivRatio;

    // Stagnation temperature rise
    const cp = 1005; // J/(kg*K)
    const T0_inlet = atmosphere.T_K * (1 + ((gamma - 1) / 2) * machFlight * machFlight);
    const combustionEfficiency = 0.95;
    const deltaT0 = (actualFuelMassFlowKg_s * fuelLHV_MJ_kg * 1e6 * combustionEfficiency) / ((airMassFlowKg_s + actualFuelMassFlowKg_s) * cp);
    const T0_combustor = T0_inlet + deltaT0;

    // Nozzle expansion velocity V_exit
    const nozzleP0Recovery = 0.96;
    const P0_nozzle = atmosphere.P_Pa * Math.pow(1 + ((gamma - 1) / 2) * machFlight * machFlight, gamma / (gamma - 1)) * totalP0Recovery * nozzleP0Recovery;
    const PR_nozzle = Math.max(1.0, P0_nozzle / atmosphere.P_Pa);
    const M_exit = Math.sqrt(Math.max(0, (2 / (gamma - 1)) * (Math.pow(PR_nozzle, (gamma - 1) / gamma) - 1)));
    const T_exit = T0_combustor / (1 + ((gamma - 1) / 2) * M_exit * M_exit);
    const V_exit = M_exit * Math.sqrt(gamma * 287.05 * T_exit);

    // Thrust F = m_dot * (V_exit - V_flight)
    const netThrustN = Math.max(0, (airMassFlowKg_s + actualFuelMassFlowKg_s) * V_exit - airMassFlowKg_s * atmosphere.airVelocityM_s);
    const specificImpulseSec = actualFuelMassFlowKg_s > 0 ? netThrustN / (actualFuelMassFlowKg_s * 9.80665) : 0;
    const isShockOnLip = Math.abs(stages[0].betaDeg - 28.5) < 3.0; // Optimal shock capture

    return {
      stages,
      hasDetachedShock,
      totalP0Recovery,
      normalShockP0,
      throatMach,
      T0_inletK: T0_inlet,
      T0_combustorK: T0_combustor,
      netThrustKN: netThrustN / 1000,
      specificImpulseSec,
      airMassFlowKg_s,
      actualFuelMassFlowKg_s,
      V_exitM_s: V_exit,
      isShockOnLip,
    };
  }, [
    machFlight,
    atmosphere,
    ramp1ThetaDeg,
    ramp2ThetaDeg,
    ramp3ThetaDeg,
    numRamps,
    combustorFuelEquivRatio,
    cowlCaptureHeightM,
  ]);

  // 2D Supersonic Air Intake & Shock Wave Pattern Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, width, height);

    // Grid Lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 30; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 30; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const originX = 80;
    const originY = height - 80;

    // Draw multi-ramp spike geometry
    const rampLength = 90;
    let currentX = originX;
    let currentY = originY;
    let currentAngleDeg = 0;

    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(originX - 50, originY);
    ctx.lineTo(originX, originY);

    const rampPoints: { x: number; y: number }[] = [{ x: originX, y: originY }];

    for (let i = 0; i < intakePerformance.stages.length; i++) {
      const st = intakePerformance.stages[i];
      currentAngleDeg += st.thetaDeg;
      const rad = (currentAngleDeg * Math.PI) / 180;
      currentX += rampLength * Math.cos(rad);
      currentY -= rampLength * Math.sin(rad);
      ctx.lineTo(currentX, currentY);
      rampPoints.push({ x: currentX, y: currentY });
    }

    // Throat & Subsonic Diffuser continuation
    const throatX = currentX + 70;
    const throatY = currentY;
    ctx.lineTo(throatX, throatY);
    ctx.lineTo(throatX + 160, throatY + 20); // Combustor duct
    ctx.lineTo(width - 20, throatY + 20);
    ctx.lineTo(width - 20, height - 20);
    ctx.lineTo(originX - 50, height - 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cowl Lip (Upper intake cowl)
    const cowlLipX = originX + 220;
    const cowlLipY = originY - 140;

    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(cowlLipX, cowlLipY);
    ctx.lineTo(cowlLipX + 240, cowlLipY);
    ctx.lineTo(cowlLipX + 240, cowlLipY - 20);
    ctx.lineTo(cowlLipX - 20, cowlLipY - 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw Oblique Shock Waves (Glowing Orange/Cyan Rays)
    for (let i = 0; i < intakePerformance.stages.length; i++) {
      const p = rampPoints[i];
      const betaDeg = intakePerformance.stages[i].betaDeg;
      const betaRad = (betaDeg * Math.PI) / 180;
      const shockLen = 220;

      const shockEndX = p.x + shockLen * Math.cos(betaRad);
      const shockEndY = p.y - shockLen * Math.sin(betaRad);

      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(shockEndX, shockEndY);
      ctx.stroke();

      // Shock Wave Label
      ctx.fillStyle = '#fb923c';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`Скачок ${i + 1}: β=${betaDeg.toFixed(1)}°`, p.x + 35, p.y - 25 * (i + 1));
    }

    // Normal Terminal Shock at Cowl Lip
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cowlLipX, cowlLipY);
    ctx.lineTo(currentX + 20, currentY);
    ctx.stroke();

    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('Прямой скачок (Горло)', cowlLipX - 60, cowlLipY + 40);

    // Free Stream Mach Arrows
    ctx.strokeStyle = '#38bdf8';
    ctx.fillStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    for (let py = originY - 120; py <= originY - 30; py += 30) {
      ctx.beginPath();
      ctx.moveTo(15, py);
      ctx.lineTo(70, py);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(63, py - 4);
      ctx.lineTo(70, py);
      ctx.lineTo(63, py + 4);
      ctx.fill();
    }

    // HUD Text
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText(`Набегающий поток: M∞ = ${machFlight.toFixed(2)} (${atmosphere.airVelocityM_s.toFixed(0)} м/с)`, 20, 25);
    ctx.fillText(`Коэффициент восстановления полного давления σ = ${(intakePerformance.totalP0Recovery * 100).toFixed(1)}%`, 20, 45);
    ctx.fillText(`Температура в камере сгорания T0 = ${intakePerformance.T0_combustorK.toFixed(0)} K`, 20, 65);
  }, [intakePerformance, machFlight, atmosphere]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border border-rose-500/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Сверхзвуковой Воздухозаборник & ПВРД / ГПВРД Решатель
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-rose-950 text-rose-300 border border-rose-700">
                  Rankine-Hugoniot & Ramjet Thermodynamics
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Газодинамический расчет многоскачковых воздухозаборников внешнего сжатия, условия «скачок на кромке» (Shock-on-Lip) и тяги прямоточного двигателя.
              </p>
            </div>
          </div>
        </div>

        {/* Shock-on-lip Tag */}
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold border ${
            intakePerformance.hasDetachedShock
              ? 'bg-rose-950/80 border-rose-500 text-rose-300'
              : 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
          }`}
        >
          {intakePerformance.hasDetachedShock ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{intakePerformance.hasDetachedShock ? 'ОТОШЕДШИЙ СКАЧОК (Срыв Потока)' : 'ПРИСОЕДИНЕННЫЕ СКАЧКИ (Норма)'}</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5 shadow-xl">
            <span className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider border-b border-slate-800 pb-2">
              <Sliders className="w-4 h-4 text-rose-400" /> Параметры Полета и Диффузора
            </span>

            {/* Flight Mach */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Число Маха полета (M∞):</span>
                <strong className="font-mono text-rose-400">M = {machFlight.toFixed(2)}</strong>
              </div>
              <input
                type="range"
                min="1.4"
                max="5.0"
                step="0.1"
                value={machFlight}
                onChange={(e) => setMachFlight(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
            </div>

            {/* Flight Altitude */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Высота полета (H):</span>
                <strong className="font-mono text-sky-400">{altitudeKm.toFixed(1)} км</strong>
              </div>
              <input
                type="range"
                min="8.0"
                max="28.0"
                step="1.0"
                value={altitudeKm}
                onChange={(e) => setAltitudeKm(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>

            {/* Number of Ramps */}
            <div className="space-y-1">
              <span className="text-xs text-slate-300">Число ступеней сжатия (клиньев):</span>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => setNumRamps(n as 1 | 2 | 3)}
                    className={`py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                      numRamps === n
                        ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {n} {n === 1 ? 'Ступень' : 'Ступени'}
                  </button>
                ))}
              </div>
            </div>

            {/* Ramp 1 Angle */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Угол клина 1 (θ₁):</span>
                <strong className="font-mono text-amber-300">{ramp1ThetaDeg.toFixed(1)}°</strong>
              </div>
              <input
                type="range"
                min="4.0"
                max="22.0"
                step="0.5"
                value={ramp1ThetaDeg}
                onChange={(e) => setRamp1ThetaDeg(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Ramp 2 Angle */}
            {numRamps >= 2 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Угол клина 2 (θ₂):</span>
                  <strong className="font-mono text-orange-300">{ramp2ThetaDeg.toFixed(1)}°</strong>
                </div>
                <input
                  type="range"
                  min="4.0"
                  max="20.0"
                  step="0.5"
                  value={ramp2ThetaDeg}
                  onChange={(e) => setRamp2ThetaDeg(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
            )}

            {/* Fuel Equivalence Ratio */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Коэффициент избытка топлива (ϕ):</span>
                <strong className="font-mono text-purple-300">{combustorFuelEquivRatio.toFixed(2)}</strong>
              </div>
              <input
                type="range"
                min="0.3"
                max="1.3"
                step="0.05"
                value={combustorFuelEquivRatio}
                onChange={(e) => setCombustorFuelEquivRatio(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Right 2D Diagram & Gas Dynamics HUD (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex justify-between items-center text-xs font-mono text-slate-400 flex-wrap gap-2">
              <span className="text-rose-400 font-bold flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" /> 2D Геометрия Воздухозаборника & Система Косых Скачков
              </span>
              <span className="text-slate-400 text-[11px]">
                Расход воздуха: <strong>{intakePerformance.airMassFlowKg_s.toFixed(1)} кг/с</strong>
              </span>
            </div>

            {/* Canvas */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 h-72 sm:h-80 flex items-center justify-center">
              <canvas ref={canvasRef} width={680} height={320} className="w-full h-full object-contain" />
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono">Восстановление Давления</span>
                <div className="text-sm font-bold font-mono text-emerald-400">
                  {(intakePerformance.totalP0Recovery * 100).toFixed(1)}%
                </div>
                <span className="text-[10px] text-slate-400">σ_вз = P0_вх / P0_∞</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono">Тяга Двигателя F_net</span>
                <div className="text-sm font-bold font-mono text-rose-400">
                  {intakePerformance.netThrustKN.toFixed(1)} кН
                </div>
                <span className="text-[10px] text-slate-400">Скорость истечения: {intakePerformance.V_exitM_s.toFixed(0)} м/с</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono">Удельный Импульс Isp</span>
                <div className="text-sm font-bold font-mono text-amber-300">
                  {intakePerformance.specificImpulseSec.toFixed(0)} с
                </div>
                <span className="text-[10px] text-slate-400">Топливо: Керосин JP-10</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono">Мах в Горле Диффузора</span>
                <div className="text-sm font-bold font-mono text-cyan-300">
                  M_th = {intakePerformance.throatMach.toFixed(2)}
                </div>
                <span className="text-[10px] text-slate-400">
                  {intakePerformance.throatMach < 1.0 ? 'Дозвуковое горение (Ramjet)' : 'Сверхзвук (Scramjet)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
