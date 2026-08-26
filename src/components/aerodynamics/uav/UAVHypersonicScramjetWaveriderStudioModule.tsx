import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Flame,
  Activity,
  Wind,
  Gauge,
  ShieldAlert,
  Layers,
  Sparkles,
  Zap,
  TrendingUp,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Compass,
  FileText,
  CheckCircle2,
  ChevronRight,
  Maximize2,
  Cpu,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface WaveriderPreset {
  id: string;
  name: string;
  mach: number;
  altitude_km: number;
  wedgeAngle_deg: number;
  leadingEdgeRadius_mm: number;
  tpsMaterial: string;
  combustorLength_m: number;
  fuelType: 'H2' | 'Methane' | 'JP-10';
  equivalenceRatio: number;
  description: string;
}

const PRESETS: WaveriderPreset[] = [
  {
    id: 'x43_waverider',
    name: 'Гиперзвуковой X-43A Hypersoar Waverider',
    mach: 7.2,
    altitude_km: 29.5,
    wedgeAngle_deg: 12.5,
    leadingEdgeRadius_mm: 1.5,
    tpsMaterial: 'C/C-SiC Matrix Composite',
    combustorLength_m: 1.8,
    fuelType: 'H2',
    equivalenceRatio: 1.05,
    description: 'Классический волнолет с интеграцией ГПВРД на жидком водороде и острой передней кромкой.',
  },
  {
    id: 'recon_mach6',
    name: 'БПЛА Глобальной Разведки Mach 6.0',
    mach: 6.0,
    altitude_km: 26.0,
    wedgeAngle_deg: 9.8,
    leadingEdgeRadius_mm: 3.0,
    tpsMaterial: 'Ultra-High Temp Ceramics (ZrB2-SiC)',
    combustorLength_m: 2.4,
    fuelType: 'JP-10',
    equivalenceRatio: 0.95,
    description: 'Длительный крейсерский гиперзвуковой полет на эндотермическом тяжелом топливе JP-10.',
  },
  {
    id: 'strike_mach9',
    name: 'Ударный ГПВРД Планер Mach 9.5',
    mach: 9.5,
    altitude_km: 34.0,
    wedgeAngle_deg: 15.0,
    leadingEdgeRadius_mm: 0.8,
    tpsMaterial: 'Hafnium Diboride (HfB2) Aerogel',
    combustorLength_m: 2.1,
    fuelType: 'H2',
    equivalenceRatio: 1.15,
    description: 'Экстремальные тепловые потоки, плазменный экран и сверхзвуковое горение при $M > 9$.',
  },
];

export const UAVHypersonicScramjetWaveriderStudioModule: React.FC = () => {
  // Config state
  const [selectedPreset, setSelectedPreset] = useState<string>('x43_waverider');
  const [mach, setMach] = useState<number>(7.2);
  const [altitude_km, setAltitudeKm] = useState<number>(29.5);
  const [wedgeAngle_deg, setWedgeAngle] = useState<number>(12.5);
  const [leadingEdgeRadius_mm, setLeadingEdgeRadius] = useState<number>(1.5);
  const [combustorLength_m, setCombustorLength] = useState<number>(1.8);
  const [fuelType, setFuelType] = useState<'H2' | 'Methane' | 'JP-10'>('H2');
  const [equivalenceRatio, setEquivalenceRatio] = useState<number>(1.05);
  const [tpsMaterial, setTpsMaterial] = useState<string>('C/C-SiC Matrix Composite');

  // Animation & view
  const [isSimRunning, setIsSimRunning] = useState<boolean>(true);
  const [displayMode, setDisplayMode] = useState<'shocks' | 'temperature' | 'pressure' | 'species'>('shocks');
  const [activeTab, setActiveTab] = useState<'cfd_render' | 'scramjet_cycle' | 'tps_thermal' | 'aerodynamics'>('cfd_render');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const simTimeRef = useRef<number>(0);

  // Apply preset
  const handleApplyPreset = (presetId: string) => {
    const p = PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    setSelectedPreset(presetId);
    setMach(p.mach);
    setAltitudeKm(p.altitude_km);
    setWedgeAngle(p.wedgeAngle_deg);
    setLeadingEdgeRadius(p.leadingEdgeRadius_mm);
    setCombustorLength(p.combustorLength_m);
    setFuelType(p.fuelType);
    setEquivalenceRatio(p.equivalenceRatio);
    setTpsMaterial(p.tpsMaterial);
  };

  // Atmospheric properties at altitude (US Standard Atmosphere 1976 approximation)
  const atmo = useMemo(() => {
    const h = altitude_km * 1000;
    let T_inf = 288.15 - 0.0065 * Math.min(h, 11000);
    if (h > 11000 && h <= 20000) {
      T_inf = 216.65;
    } else if (h > 20000 && h <= 32000) {
      T_inf = 216.65 + 0.001 * (h - 20000);
    } else if (h > 32000) {
      T_inf = 228.65 + 0.0028 * (h - 32000);
    }
    const P_inf = 101325 * Math.exp(-h / 7200); // Pa
    const gamma = 1.4;
    const R_gas = 287.05;
    const rho_inf = P_inf / (R_gas * T_inf);
    const speedOfSound = Math.sqrt(gamma * R_gas * T_inf);
    const V_inf = mach * speedOfSound;
    const q_inf = 0.5 * rho_inf * V_inf * V_inf; // Dynamic pressure

    return { T_inf, P_inf, rho_inf, speedOfSound, V_inf, q_inf };
  }, [altitude_km, mach]);

  // Oblique shock wave calculations (Theta-Beta-Mach relation)
  const shockData = useMemo(() => {
    const thetaRad = (wedgeAngle_deg * Math.PI) / 180;
    const gamma = 1.4;
    const M1 = mach;

    // Approximate shock angle Beta using Newton-Raphson approximation for weak shock
    let beta = Math.asin(1 / M1) + thetaRad * 1.1; // initial guess
    for (let i = 0; i < 8; i++) {
      const sinB = Math.sin(beta);
      const cosB = Math.cos(beta);
      const cotB = 1 / Math.tan(beta);
      const tanThetaTarget = Math.tan(thetaRad);
      const num = 2 * cotB * (M1 * M1 * sinB * sinB - 1);
      const den = 2 + M1 * M1 * (gamma + Math.cos(2 * beta));
      const fVal = num / den - tanThetaTarget;
      beta = beta - fVal * 0.5;
    }
    const betaDeg = (beta * Math.PI) / 180;

    // Post-shock properties
    const Mn1 = M1 * Math.sin(beta);
    const P2_P1 = 1 + ((2 * gamma) / (gamma + 1)) * (Mn1 * Mn1 - 1);
    const T2_T1 =
      (1 + ((2 * gamma) / (gamma + 1)) * (Mn1 * Mn1 - 1)) *
      (((gamma - 1) * Mn1 * Mn1 + 2) / ((gamma + 1) * Mn1 * Mn1));
    const Mn2_sq =
      (2 + (gamma - 1) * Mn1 * Mn1) / (2 * gamma * Mn1 * Mn1 - (gamma - 1));
    const M2 = Math.sqrt(Mn2_sq) / Math.sin(beta - thetaRad);

    const P2 = atmo.P_inf * P2_P1;
    const T2 = atmo.T_inf * T2_T1;

    // Stagnation Temperature T0 (Isentropic)
    const T0 = atmo.T_inf * (1 + ((gamma - 1) / 2) * M1 * M1);

    // Stagnation point heat flux (Fay-Riddell simplified formula for nose radius)
    // q_stag ~ C * sqrt(rho_inf / R_nose) * V^3
    const R_nose_m = Math.max(0.0005, leadingEdgeRadius_mm / 1000);
    const q_stag_MW_m2 =
      1.83e-4 *
      Math.pow(atmo.rho_inf / R_nose_m, 0.5) *
      Math.pow(atmo.V_inf / 1000, 3) *
      10; // MW/m^2

    // TPS Equilibrium Radiation Temperature (Stefan-Boltzmann: q = epsilon * sigma * T_eq^4)
    const emissivity = 0.88;
    const sigma_sb = 5.67e-8;
    const T_eq_K = Math.pow((q_stag_MW_m2 * 1e6) / (emissivity * sigma_sb), 0.25);

    return {
      betaDeg,
      P2_P1,
      T2_T1,
      M2,
      P2,
      T2,
      T0,
      q_stag_MW_m2,
      T_eq_K,
    };
  }, [mach, wedgeAngle_deg, atmo, leadingEdgeRadius_mm]);

  // Scramjet combustor performance
  const scramjetCycle = useMemo(() => {
    // Specific impulse Isp & thrust calculations
    const heatingValues = { H2: 120e6, Methane: 50e6, 'JP-10': 42.1e6 }; // J/kg
    const LHV = heatingValues[fuelType];
    const inletCaptureArea = 0.35; // m^2
    const airMassFlow = atmo.rho_inf * atmo.V_inf * inletCaptureArea; // kg/s

    const stoichAFR = { H2: 34.3, Methane: 17.2, 'JP-10': 14.6 }[fuelType];
    const fuelMassFlow = (airMassFlow / stoichAFR) * equivalenceRatio;

    // Combustor exit velocity with supersonic heat addition (Rayleigh flow)
    const M_comb_in = Math.max(1.8, shockData.M2 * 0.75);
    const combustionEfficiency = 0.92;
    const q_heat = (fuelMassFlow * LHV * combustionEfficiency) / airMassFlow; // J/kg air
    const Cp = 1005; // J/kg*K
    const T_comb_out = shockData.T2 + q_heat / Cp;

    // Nozzle exit velocity
    const V_exit = Math.sqrt(
      Math.max(100, 2 * Cp * (T_comb_out - atmo.T_inf) + Math.pow(atmo.V_inf * 0.85, 2))
    );
    const netThrust_kN =
      (airMassFlow * (V_exit - atmo.V_inf) + fuelMassFlow * V_exit) / 1000;
    const Isp_sec =
      netThrust_kN > 0
        ? (netThrust_kN * 1000) / (fuelMassFlow * 9.80665)
        : 0;

    // Vehicle L/D calculation based on waverider caret wing theory
    const Cl =
      ((2 * Math.sin(shockData.betaDeg * (Math.PI / 180))) /
        Math.tan(wedgeAngle_deg * (Math.PI / 180))) *
      0.15;
    const Cd_wave = 2 * Math.pow(Math.sin((wedgeAngle_deg * Math.PI) / 180), 3) * 1.8;
    const Cd_skin = 0.0018 * Math.pow(mach, -0.4);
    const Cd_total = Cd_wave + Cd_skin;
    const liftToDrag = Cl / Math.max(0.005, Cd_total);

    return {
      airMassFlow,
      fuelMassFlow,
      M_comb_in,
      T_comb_out,
      V_exit,
      netThrust_kN,
      Isp_sec,
      liftToDrag,
      Cl,
      Cd_total,
    };
  }, [fuelType, equivalenceRatio, atmo, shockData, wedgeAngle_deg, mach]);

  // Distribution chart data along vehicle length
  const distributionData = useMemo(() => {
    const data = [];
    const length_m = 6.0;
    for (let x = 0; x <= length_m; x += 0.25) {
      const normX = x / length_m;
      // Static pressure profile
      let p_ratio = 1.0;
      let temp_K = atmo.T_inf;
      let mach_local = mach;

      if (normX < 0.25) {
        // Forebody compression ramp
        p_ratio = 1.0 + (shockData.P2_P1 - 1.0) * (normX / 0.25);
        temp_K = atmo.T_inf + (shockData.T2 - atmo.T_inf) * (normX / 0.25);
        mach_local = mach - (mach - shockData.M2) * (normX / 0.25);
      } else if (normX >= 0.25 && normX <= 0.65) {
        // Scramjet isolator and combustor
        const combProgress = (normX - 0.25) / 0.4;
        p_ratio = shockData.P2_P1 * (1 + 0.6 * Math.sin(combProgress * Math.PI));
        temp_K = shockData.T2 + (scramjetCycle.T_comb_out - shockData.T2) * combProgress;
        mach_local = shockData.M2 * (1.0 - 0.25 * combProgress);
      } else {
        // Expansion nozzle / aftbody
        const expProgress = (normX - 0.65) / 0.35;
        p_ratio = shockData.P2_P1 * (1.6 * Math.exp(-expProgress * 2.2));
        temp_K = scramjetCycle.T_comb_out - (scramjetCycle.T_comb_out - 850) * expProgress;
        mach_local = 1.5 + 3.8 * expProgress;
      }

      data.push({
        station_m: Number(x.toFixed(2)),
        pressure_kPa: Number(((p_ratio * atmo.P_inf) / 1000).toFixed(1)),
        temperature_K: Number(temp_K.toFixed(0)),
        mach: Number(mach_local.toFixed(2)),
        heatFlux_kW_m2: Number(
          ((shockData.q_stag_MW_m2 * 1000) / (1 + x * 2.5)).toFixed(1)
        ),
      });
    }
    return data;
  }, [atmo, shockData, scramjetCycle, mach]);

  // Interactive CFD Rendering Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      simTimeRef.current += 0.03;
      const t = simTimeRef.current;

      const w = canvas.width;
      const h = canvas.height;

      // Dark space-atmosphere gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#030712');
      bgGrad.addColorStop(0.5, '#090d1a');
      bgGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Grid mesh
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Origin of Waverider Nose
      const noseX = w * 0.22;
      const noseY = h * 0.52;
      const lengthPx = w * 0.58;
      const tailX = noseX + lengthPx;

      // Waverider Geometry Points
      const upperAngleRad = 0.05; // slight upper camber
      const wedgeRad = (wedgeAngle_deg * Math.PI) / 180;
      const shockRad = (shockData.betaDeg * Math.PI) / 180;

      const upperTailY = noseY - lengthPx * Math.tan(upperAngleRad);
      const lowerInletX = noseX + lengthPx * 0.3;
      const lowerInletY = noseY + lengthPx * 0.3 * Math.tan(wedgeRad * 0.6);
      const combustorEndColX = noseX + lengthPx * 0.68;
      const combustorEndColY = lowerInletY + 12;
      const nozzleTailY = noseY + lengthPx * Math.tan(wedgeRad * 0.3);

      // 1. FREE-STREAM FLOW PARTICLES (Mach vector arrows)
      ctx.fillStyle = 'rgba(125, 211, 252, 0.4)';
      for (let i = 0; i < 35; i++) {
        const px = ((i * 47 + t * 450) % (noseX - 10));
        const py = 30 + (i * 29) % (h - 60);
        ctx.fillRect(px, py, 14, 1.5);
      }

      // 2. SHOCK WAVE CONE (Oblique bow shock & attached shock)
      const shockLength = lengthPx * 1.35;
      const shockUpperEndX = noseX + shockLength;
      const shockUpperEndY = noseY - shockLength * Math.sin(Math.asin(1 / mach));
      const shockLowerEndX = noseX + shockLength;
      const shockLowerEndY = noseY + shockLength * Math.sin(shockRad);

      // Shock glow
      ctx.save();
      const shockGlow = ctx.createLinearGradient(noseX, noseY, shockLowerEndX, shockLowerEndY);
      shockGlow.addColorStop(0, 'rgba(239, 68, 68, 0.9)');
      shockGlow.addColorStop(0.4, 'rgba(249, 115, 22, 0.7)');
      shockGlow.addColorStop(1, 'rgba(234, 179, 8, 0.2)');

      ctx.strokeStyle = shockGlow;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(noseX, noseY);
      ctx.lineTo(shockLowerEndX, shockLowerEndY);
      ctx.stroke();

      // Upper weak shock
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(noseX, noseY);
      ctx.lineTo(shockUpperEndX, shockUpperEndY);
      ctx.stroke();
      ctx.restore();

      // High pressure shock layer (Waverider captured compression zone)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(noseX, noseY);
      ctx.lineTo(shockLowerEndX, shockLowerEndY);
      ctx.lineTo(tailX, nozzleTailY);
      ctx.lineTo(combustorEndColX, combustorEndColY);
      ctx.lineTo(lowerInletX, lowerInletY);
      ctx.closePath();

      const shockLayerGrad = ctx.createLinearGradient(noseX, noseY, tailX, lowerInletY + 40);
      if (displayMode === 'temperature') {
        shockLayerGrad.addColorStop(0, 'rgba(239, 68, 68, 0.45)');
        shockLayerGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.35)');
        shockLayerGrad.addColorStop(1, 'rgba(59, 130, 246, 0.15)');
      } else if (displayMode === 'pressure') {
        shockLayerGrad.addColorStop(0, 'rgba(217, 70, 239, 0.5)');
        shockLayerGrad.addColorStop(0.4, 'rgba(168, 85, 247, 0.35)');
        shockLayerGrad.addColorStop(1, 'rgba(59, 130, 246, 0.1)');
      } else {
        shockLayerGrad.addColorStop(0, 'rgba(249, 115, 22, 0.3)');
        shockLayerGrad.addColorStop(0.5, 'rgba(234, 179, 8, 0.2)');
        shockLayerGrad.addColorStop(1, 'rgba(14, 165, 233, 0.08)');
      }
      ctx.fillStyle = shockLayerGrad;
      ctx.fill();
      ctx.restore();

      // 3. SCRAMJET INTERNAL DUCT & SUPERSONIC COMBUSTION FLAME
      ctx.save();
      const flameGrad = ctx.createLinearGradient(lowerInletX, lowerInletY, tailX + 120, nozzleTailY);
      flameGrad.addColorStop(0, 'rgba(56, 189, 248, 0.8)'); // supersonic inlet shock train
      flameGrad.addColorStop(0.3, 'rgba(239, 68, 68, 0.95)'); // combustion zone
      flameGrad.addColorStop(0.6, 'rgba(249, 115, 22, 0.85)');
      flameGrad.addColorStop(1, 'rgba(234, 179, 8, 0.0)');

      // Scramjet plume
      ctx.beginPath();
      ctx.moveTo(combustorEndColX, combustorEndColY);
      ctx.lineTo(tailX + 140 + Math.sin(t * 15) * 10, nozzleTailY + 15 + Math.cos(t * 12) * 4);
      ctx.lineTo(tailX, nozzleTailY);
      ctx.closePath();
      ctx.fillStyle = flameGrad;
      ctx.fill();

      // Mach diamonds in scramjet plume
      for (let d = 0; d < 4; d++) {
        const mdX = tailX + 25 + d * 28;
        const mdY = nozzleTailY + 7;
        ctx.fillStyle = 'rgba(254, 240, 138, 0.9)';
        ctx.beginPath();
        ctx.arc(mdX, mdY, 3.5 - d * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 4. WAVERIDER AIRFRAME (C/C composite solid body)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(noseX, noseY);
      ctx.lineTo(tailX, upperTailY); // Upper surface
      ctx.lineTo(tailX, nozzleTailY); // Trailing edge
      ctx.lineTo(combustorEndColX, combustorEndColY); // Nozzle ramp
      ctx.lineTo(lowerInletX, lowerInletY); // Combustor cavity
      ctx.lineTo(noseX, noseY); // Lower forebody ramp
      ctx.closePath();

      const bodyGrad = ctx.createLinearGradient(noseX, noseY, tailX, nozzleTailY);
      bodyGrad.addColorStop(0, '#1e293b');
      bodyGrad.addColorStop(0.4, '#0f172a');
      bodyGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Leading edge glow (Stagnation Heating)
      const stagRadius = Math.max(4, leadingEdgeRadius_mm * 2.5);
      const stagGlow = ctx.createRadialGradient(noseX, noseY, 1, noseX, noseY, stagRadius * 3);
      stagGlow.addColorStop(0, 'rgba(255, 255, 255, 1)');
      stagGlow.addColorStop(0.3, 'rgba(249, 115, 22, 0.8)');
      stagGlow.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = stagGlow;
      ctx.beginPath();
      ctx.arc(noseX, noseY, stagRadius * 3, 0, Math.PI * 2);
      ctx.fill();

      // Forebody expansion lines & structural ribs
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 1;
      for (let r = 1; r <= 4; r++) {
        const rx = noseX + (lengthPx / 5) * r;
        ctx.beginPath();
        ctx.moveTo(rx, noseY - (rx - noseX) * Math.tan(upperAngleRad));
        ctx.lineTo(rx, noseY + (rx - noseX) * Math.tan(wedgeRad * 0.45));
        ctx.stroke();
      }

      // HUD Telemetry Overlays on Canvas
      ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
      ctx.fillRect(15, 15, 210, 110);
      ctx.strokeStyle = '#0284c7';
      ctx.strokeRect(15, 15, 210, 110);

      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`HYPERSONIC AERO CFD [${mach} M]`, 25, 33);
      ctx.font = '10px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Высота (Alt): ${altitude_km.toFixed(1)} км`, 25, 50);
      ctx.fillText(`Скорость: ${atmo.V_inf.toFixed(0)} м/с (${(atmo.V_inf * 3.6).toFixed(0)} км/ч)`, 25, 66);
      ctx.fillText(`Тепловой поток: ${shockData.q_stag_MW_m2.toFixed(2)} МВт/м²`, 25, 82);
      ctx.fillText(`T_stagnation: ${shockData.T_eq_K.toFixed(0)} K (${(shockData.T_eq_K - 273.15).toFixed(0)} °C)`, 25, 98);
      ctx.fillText(`Угол скачка β: ${shockData.betaDeg.toFixed(1)}°`, 25, 114);

      ctx.restore();

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
    mach,
    altitude_km,
    wedgeAngle_deg,
    leadingEdgeRadius_mm,
    shockData,
    atmo,
    displayMode,
  ]);

  return (
    <div className="w-full bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 p-4 md:p-6 shadow-2xl font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-red-500/20 border border-amber-500/40 text-amber-400 shadow-inner">
            <Flame className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-950/80 border border-red-500/40 text-red-300">
                #101 Hypersonic Scramjet
              </span>
              <h2 className="text-xl font-black text-white tracking-tight font-mono">
                Гиперзвуковые ПВРД/ГПВРД БПЛА & Волнолеты Waverider
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Моделирование газодинамики гиперзвуковых ударных волн ($M = 5.0 \dots 12.0$), сверхзвукового горения в ГПВРД, тепловых потоков Фэя-Ридделла и экранирования TPS.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSimRunning(!isSimRunning)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isSimRunning
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                : 'bg-slate-800 text-amber-400 hover:bg-slate-700 border border-amber-500/30'
            }`}
          >
            {isSimRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isSimRunning ? 'Пауза CFD' : 'Запуск CFD'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset(selectedPreset)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Сброс</span>
          </button>
        </div>
      </div>

      {/* Presets Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => handleApplyPreset(p.id)}
            className={`p-3 rounded-xl text-left transition-all border cursor-pointer ${
              selectedPreset === p.id
                ? 'bg-amber-950/40 border-amber-500 text-amber-200 shadow-md ring-1 ring-amber-500/40'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
              <span className="font-mono">{p.name}</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                M={p.mach}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
              {p.description}
            </p>
          </button>
        ))}
      </div>

      {/* KPI Metrics Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Число Маха</span>
            <Wind className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-xl font-black text-white font-mono mt-1">
            {mach.toFixed(1)} M
          </div>
          <div className="text-[10px] text-sky-400 mt-0.5">
            {atmo.V_inf.toFixed(0)} м/с ({(atmo.V_inf * 3.6).toFixed(0)} км/ч)
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Тепловой поток</span>
            <Flame className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="text-xl font-black text-red-400 font-mono mt-1">
            {shockData.q_stag_MW_m2.toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-400">МВт/м²</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            T_eq: {shockData.T_eq_K.toFixed(0)} K ({(shockData.T_eq_K - 273.15).toFixed(0)} °C)
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Угол скачка β</span>
            <Compass className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400 font-mono mt-1">
            {shockData.betaDeg.toFixed(1)}°
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            ΔP/P∞: x{shockData.P2_P1.toFixed(1)}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Тяга ГПВРД</span>
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono mt-1">
            {scramjetCycle.netThrust_kN.toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-400">кН</span>
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5">
            Уд. импульс: {scramjetCycle.Isp_sec.toFixed(0)} сек
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Аэродинам. L/D</span>
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-black text-purple-400 font-mono mt-1">
            {scramjetCycle.liftToDrag.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Cl: {scramjetCycle.Cl.toFixed(3)} | Cd: {scramjetCycle.Cd_total.toFixed(3)}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Скоростной напор q</span>
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-black text-cyan-400 font-mono mt-1">
            {(atmo.q_inf / 1000).toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-400">кПа</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            ρ∞: {atmo.rho_inf.toFixed(4)} кг/м³
          </div>
        </div>
      </div>

      {/* Main Interactive CFD Canvas */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              Интерактивная 2D CFD Газодинамика Волнолета & Сверхзвукового Горения:
            </span>
          </div>

          {/* Display Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setDisplayMode('shocks')}
              className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                displayMode === 'shocks'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Конус Ударных Волн
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('temperature')}
              className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                displayMode === 'temperature'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Поле Температур
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('pressure')}
              className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                displayMode === 'pressure'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Давление Сжатия
            </button>
          </div>
        </div>

        <div className="relative w-full h-[360px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
          <canvas
            ref={canvasRef}
            width={900}
            height={360}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Control Sliders & Configuration Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column 1: Flight Trajectory & Aerodynamics */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            Параметры Полета & Геометрии
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-400 mb-1 font-mono">
                <span>Число Маха (M):</span>
                <span className="text-sky-300 font-bold">{mach.toFixed(1)} M</span>
              </div>
              <input
                type="range"
                min={5.0}
                max={12.0}
                step={0.1}
                value={mach}
                onChange={(e) => setMach(parseFloat(e.target.value))}
                className="w-full accent-sky-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1 font-mono">
                <span>Высота полета (H):</span>
                <span className="text-sky-300 font-bold">{altitude_km.toFixed(1)} км</span>
              </div>
              <input
                type="range"
                min={20.0}
                max={45.0}
                step={0.5}
                value={altitude_km}
                onChange={(e) => setAltitudeKm(parseFloat(e.target.value))}
                className="w-full accent-sky-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1 font-mono">
                <span>Угол клина сжатия (θ):</span>
                <span className="text-amber-300 font-bold">{wedgeAngle_deg.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min={6.0}
                max={20.0}
                step={0.5}
                value={wedgeAngle_deg}
                onChange={(e) => setWedgeAngle(parseFloat(e.target.value))}
                className="w-full accent-amber-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1 font-mono">
                <span>Радиус передней кромки (R_nose):</span>
                <span className="text-red-300 font-bold">{leadingEdgeRadius_mm.toFixed(1)} мм</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={10.0}
                step={0.1}
                value={leadingEdgeRadius_mm}
                onChange={(e) => setLeadingEdgeRadius(parseFloat(e.target.value))}
                className="w-full accent-red-400"
              />
            </div>
          </div>
        </div>

        {/* Controls Column 2: Scramjet Combustor */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            Камера Сгорания ГПВРД (Scramjet)
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 mb-1 block font-mono">Тип гиперзвукового топлива:</label>
              <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
                {(['H2', 'Methane', 'JP-10'] as const).map((fuel) => (
                  <button
                    key={fuel}
                    type="button"
                    onClick={() => setFuelType(fuel)}
                    className={`py-1.5 px-2 rounded-lg border transition-all cursor-pointer ${
                      fuelType === fuel
                        ? 'bg-orange-500/20 border-orange-500 text-orange-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {fuel}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1 font-mono">
                <span>Коэффициент избытка топлива (Φ):</span>
                <span className="text-orange-300 font-bold">{equivalenceRatio.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.6}
                max={1.8}
                step={0.05}
                value={equivalenceRatio}
                onChange={(e) => setEquivalenceRatio(parseFloat(e.target.value))}
                className="w-full accent-orange-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1 font-mono">
                <span>Длина камеры сгорания:</span>
                <span className="text-orange-300 font-bold">{combustorLength_m.toFixed(1)} м</span>
              </div>
              <input
                type="range"
                min={0.8}
                max={3.5}
                step={0.1}
                value={combustorLength_m}
                onChange={(e) => setCombustorLength(parseFloat(e.target.value))}
                className="w-full accent-orange-400"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-orange-500/30 text-[11px] text-slate-300 font-mono space-y-1">
              <div className="flex justify-between">
                <span>Расход воздуха:</span>
                <span className="text-sky-300 font-bold">{scramjetCycle.airMassFlow.toFixed(2)} кг/с</span>
              </div>
              <div className="flex justify-between">
                <span>Расход топлива:</span>
                <span className="text-orange-300 font-bold">{(scramjetCycle.fuelMassFlow * 1000).toFixed(1)} г/с</span>
              </div>
              <div className="flex justify-between">
                <span>T сгорания (Combustor):</span>
                <span className="text-red-300 font-bold">{scramjetCycle.T_comb_out.toFixed(0)} K</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Column 3: Thermal Protection System (TPS) */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            Теплозащита TPS & Керамика
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 mb-1 block font-mono">Материал обшивки / TPS:</label>
              <select
                value={tpsMaterial}
                onChange={(e) => setTpsMaterial(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs font-mono focus:border-red-500 focus:outline-none"
              >
                <option value="C/C-SiC Matrix Composite">C/C-SiC Matrix Composite (T_max ~ 1950 K)</option>
                <option value="Ultra-High Temp Ceramics (ZrB2-SiC)">ZrB2-SiC UHTC (T_max ~ 2400 K)</option>
                <option value="Hafnium Diboride (HfB2) Aerogel">HfB2 High-Temp Aerogel (T_max ~ 2800 K)</option>
                <option value="Carbon-Phenolic Ablative Shield">Carbon-Phenolic Ablative (Абляционный)</option>
              </select>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/80 border border-red-500/30 space-y-2 text-[11px] font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Формула Фэя-Ридделла:</span>
                <span className="text-red-400 font-bold">q_ws ~ √(ρ/Rn)·V³</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Равновесная T_eq:</span>
                <span className="text-amber-300 font-bold">{shockData.T_eq_K.toFixed(0)} K</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Статус теплостойкости:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> В норме (Запас +320 K)
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-900/50 text-[10px] text-red-300 font-sans leading-relaxed">
              ⚠️ Острая передняя кромка (R = {leadingEdgeRadius_mm} мм) формирует присоединенный скачок волнолета с малым волновым сопротивлением, но генерирует экстремальный конвективный тепловой поток до {shockData.q_stag_MW_m2.toFixed(1)} МВт/м².
            </div>
          </div>
        </div>
      </div>

      {/* Physics Charts: Gas Dynamics & Heat Flux Distribution */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            Продольное Распределение Газодинамических Параметров Вдоль Фюзеляжа (0 .. 6.0 м):
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Ramp Inlet → Isolator → Combustor → Expansion Nozzle
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={distributionData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis
                dataKey="station_m"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                label={{ value: 'Координата X (м)', position: 'insideBottomRight', offset: -5, fill: '#64748b', fontSize: 10 }}
              />
              <YAxis
                yAxisId="left"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                label={{ value: 'Давление (кПа) / T (K)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                label={{ value: 'Локальное Число Маха M', angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pressure_kPa"
                name="Давление P (кПа)"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="temperature_K"
                name="Температура T (K)"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="mach"
                name="Число Маха (M)"
                stroke="#eab308"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
