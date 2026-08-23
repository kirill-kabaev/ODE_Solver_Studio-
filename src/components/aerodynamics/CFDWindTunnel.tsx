import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Wind,
  Layers,
  Gauge,
  Zap,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Info,
  Maximize2,
  RotateCcw,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { MathText, MathView } from '../MathView';
import { HandbookTopicId } from '../EngineeringHandbookModal';
import { createHardware2DContext } from '../../utils/gpuHardwareEnforcer';
import { VirtualJoystick, JoystickMode, JoystickValue } from '../telemetry/VirtualJoystick';
import { UniversalCockpitHUDModal } from '../telemetry/UniversalCockpitHUDModal';

export type AirfoilId = 'naca0012' | 'naca4412' | 'supercritical' | 'diamond' | 'ogive';

interface AirfoilMetadata {
  id: AirfoilId;
  name: string;
  category: string;
  description: string;
  optimalMach: string;
  cl0: number; // Lift coefficient at alpha = 0
  maxCl: number;
  stallAngle: number;
}

const AIRFOIL_CATALOG: Record<AirfoilId, AirfoilMetadata> = {
  naca0012: {
    id: 'naca0012',
    name: 'NACA 0012 (Симметричный)',
    category: 'Дозвуковой / Рулевой',
    description: 'Классический симметричный профиль толщиной 12%. Нулевая подъемная сила при нулевом угле атаки. Идеален для хвостового оперения, рулей высоты и лопастей вертолетов.',
    optimalMach: '0.1 – 0.65',
    cl0: 0.0,
    maxCl: 1.45,
    stallAngle: 15.0,
  },
  naca4412: {
    id: 'naca4412',
    name: 'NACA 4412 (Несущий крыльевой)',
    category: 'Основное крыло (Кривизна 4%)',
    description: 'Асимметричный несущий профиль с 4% максимальной кривизной на 40% хорды. Создает положительную подъемную силу даже при нулевом угле атаки ($C_{L_0} = 0.41$).',
    optimalMach: '0.2 – 0.75',
    cl0: 0.41,
    maxCl: 1.68,
    stallAngle: 14.0,
  },
  supercritical: {
    id: 'supercritical',
    name: 'SC(2)-0714 (Сверхкритический)',
    category: 'Околозвуковой лайнер',
    description: 'Современный сверхкритический профиль с уплощенной верхней поверхностью и изогнутым хвостиком. Затягивает волновой кризис до $M = 0.85$, уменьшая расход топлива.',
    optimalMach: '0.75 – 0.88',
    cl0: 0.55,
    maxCl: 1.52,
    stallAngle: 13.5,
  },
  diamond: {
    id: 'diamond',
    name: 'Diamond Wedge (Острый клин)',
    category: 'Сверхзвуковой / Ракетный',
    description: 'Ромбовидный профиль с острыми кромками. Образует присоединенные косые ударные волны на передней кромке и веер разрежения в центре, минимизируя волновое сопротивление.',
    optimalMach: '1.4 – 3.5',
    cl0: 0.0,
    maxCl: 0.95,
    stallAngle: 18.0,
  },
  ogive: {
    id: 'ogive',
    name: 'Von Kármán Ogive (Оживало)',
    category: 'Носовой конус / Ракеты',
    description: 'Оживальная форма минимального волнового сопротивления, полученная Теодором фон Карманом аналитическим вариационным методом для сверхзвуковых тел вращения.',
    optimalMach: '1.5 – 5.0',
    cl0: 0.0,
    maxCl: 0.80,
    stallAngle: 20.0,
  },
};

interface CFDWindTunnelProps {}

export const CFDWindTunnel: React.FC<CFDWindTunnelProps> = () => {
  // Primary Aerodynamic Controls
  const [mach, setMach] = useState<number>(0.72);
  const [alpha, setAlpha] = useState<number>(4.5); // Angle of attack (deg)
  const [altitude, setAltitude] = useState<number>(5000); // Altitude in meters (0 to 20,000)
  const [reynoldsExp, setReynoldsExp] = useState<number>(6.2); // log10(Re) => 1.58 * 10^6
  const [airfoilId, setAirfoilId] = useState<AirfoilId>('naca4412');
  
  // Visual Display Flags
  const [showStreamlines, setShowStreamlines] = useState<boolean>(true);
  const [showPressureHeatmap, setShowPressureHeatmap] = useState<boolean>(true);
  const [showShockwaves, setShowShockwaves] = useState<boolean>(true);
  const [showBoundaryLayer, setShowBoundaryLayer] = useState<boolean>(true);
  const [showGridMesh, setShowGridMesh] = useState<boolean>(true);
  const [selectedTooltip, setSelectedTooltip] = useState<string | null>(null);
  const [showVirtualJoystick, setShowVirtualJoystick] = useState<boolean>(false);
  const [isCockpitOpen, setIsCockpitOpen] = useState<boolean>(false);
  const [joystickMode, setJoystickMode] = useState<JoystickMode>('aero_flow');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingCanvasRef = useRef<boolean>(false);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleJoystickChange = (val: JoystickValue) => {
    if (!val.active && val.distance === 0) return;
    setAlpha((prev) => parseFloat(Math.max(-5, Math.min(25, prev - val.y * 0.2)).toFixed(2)));
    setMach((prev) => parseFloat(Math.max(0.05, Math.min(3.0, prev + val.x * 0.015)).toFixed(3)));
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingCanvasRef.current = true;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingCanvasRef.current) return;
    const dx = e.clientX - dragStartPosRef.current.x;
    const dy = e.clientY - dragStartPosRef.current.y;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };

    // dy changes alpha, dx changes Mach
    setAlpha((prev) => parseFloat(Math.max(-5, Math.min(25, prev - dy * 0.1)).toFixed(2)));
    setMach((prev) => parseFloat(Math.max(0.05, Math.min(3.0, prev + dx * 0.005)).toFixed(3)));
  };

  const handleCanvasMouseUp = () => {
    isDraggingCanvasRef.current = false;
  };

  // Standard Atmosphere (ISA) Calculations at Altitude H
  const isa = useMemo(() => {
    const H = altitude;
    // Sea level constants
    const T0 = 288.15; // K
    const p0 = 101325; // Pa
    const rho0 = 1.225; // kg/m^3
    const L = 0.0065; // K/m temperature lapse rate in troposphere (0-11km)
    const R = 287.05; // J/(kg*K)
    const gamma = 1.4;

    let T: number;
    let p: number;
    let rho: number;

    if (H <= 11000) {
      T = T0 - L * H;
      p = p0 * Math.pow(1 - (L * H) / T0, 5.25588);
      rho = p / (R * T);
    } else {
      // Stratosphere (11km - 20km)
      const T11 = T0 - L * 11000;
      const p11 = p0 * Math.pow(1 - (L * 11000) / T0, 5.25588);
      T = T11;
      p = p11 * Math.exp((-9.80665 * (H - 11000)) / (R * T11));
      rho = p / (R * T);
    }

    const speedOfSound = Math.sqrt(gamma * R * T); // m/s
    const trueAirspeed = mach * speedOfSound; // m/s
    const dynamicPressure = 0.5 * rho * trueAirspeed * trueAirspeed; // Pa (q = 1/2 rho V^2)

    return {
      altitudeMeters: H,
      temperatureC: (T - 273.15).toFixed(1),
      pressureKPa: (p / 1000).toFixed(2),
      densityKgM3: rho.toFixed(3),
      speedOfSoundMs: speedOfSound.toFixed(1),
      trueAirspeedKmh: (trueAirspeed * 3.6).toFixed(0),
      trueAirspeedMs: trueAirspeed.toFixed(1),
      dynamicPressureKPa: (dynamicPressure / 1000).toFixed(2),
    };
  }, [altitude, mach]);

  const activeAirfoil = AIRFOIL_CATALOG[airfoilId];

  // Aerodynamic Regime Detection
  const flowRegime = useMemo(() => {
    if (mach < 0.8) return { label: 'Дозвуковой поток (Subsonic)', color: 'text-cyan-400', badge: 'bg-cyan-950 text-cyan-300 border-cyan-700' };
    if (mach <= 1.2) return { label: 'Околозвуковой кризис (Transonic)', color: 'text-amber-400', badge: 'bg-amber-950 text-amber-300 border-amber-700' };
    if (mach <= 3.0) return { label: 'Сверхзвуковой режим (Supersonic)', color: 'text-rose-400', badge: 'bg-rose-950 text-rose-300 border-rose-700' };
    return { label: 'Гиперзвуковой режим (Hypersonic)', color: 'text-purple-400', badge: 'bg-purple-950 text-purple-300 border-purple-700' };
  }, [mach]);

  // Stall & Aerodynamic Coefficients Calculation
  const isStall = Math.abs(alpha) > activeAirfoil.stallAngle;
  const isSupersonic = mach > 1.0;
  const isTransonic = mach >= 0.8 && mach <= 1.2;

  // Prandtl-Glauert compressibility correction: beta = sqrt(|1 - M^2|)
  const beta = Math.sqrt(Math.max(0.12, Math.abs(1 - mach * mach)));

  // Calculated Aerodynamic Coefficients
  const liftCoeff = useMemo(() => {
    if (isStall) {
      // Post-stall separation decay
      const sign = Math.sign(alpha);
      return sign * (0.8 + Math.sin((alpha * Math.PI) / 180) * 0.45);
    }
    // Pre-stall linear slope dCl/dAlpha = 2*pi / beta (with profile baseline)
    const baseSlope = (2 * Math.PI * (alpha * Math.PI)) / 180;
    const cl = (activeAirfoil.cl0 + baseSlope) / (mach < 1.0 ? beta : 2.0 * beta);
    return Math.max(-1.8, Math.min(2.4, cl));
  }, [alpha, mach, isStall, beta, activeAirfoil]);

  const dragCoeff = useMemo(() => {
    // Parasitic drag + Induced drag (Cl^2 / (pi * AR * e)) + Wave drag at transonic/supersonic
    const cD0 = activeAirfoil.id === 'diamond' ? 0.008 : 0.012;
    const inducedDrag = (liftCoeff * liftCoeff) / (Math.PI * 8.0 * 0.85); // AR=8, e=0.85
    let waveDrag = 0;
    if (mach > 0.8) {
      if (mach < 1.2) {
        // Transonic drag rise (wave drag peak)
        const dM = mach - 0.8;
        waveDrag = 0.08 * Math.pow(dM / 0.4, 2.5);
      } else {
        // Supersonic wave drag: 4 * alpha^2 / sqrt(M^2 - 1) + 4 * (t/c)^2 / sqrt(M^2 - 1)
        const tOverC = activeAirfoil.id === 'diamond' ? 0.06 : 0.12;
        waveDrag = (4 * Math.pow((alpha * Math.PI) / 180, 2) + 4 * tOverC * tOverC) / beta;
      }
    }
    const stallDrag = isStall ? 0.25 * Math.abs(Math.sin((alpha * Math.PI) / 180)) : 0;
    return Math.max(0.005, cD0 + inducedDrag + waveDrag + stallDrag);
  }, [mach, alpha, liftCoeff, beta, isStall, activeAirfoil]);

  const glideRatio = useMemo(() => {
    return liftCoeff / Math.max(0.001, dragCoeff);
  }, [liftCoeff, dragCoeff]);

  // Center of pressure position (x_cp / chord from leading edge)
  const centerOfPressure = useMemo(() => {
    if (isSupersonic) return 0.50; // ACDC shifts to 50% chord in supersonic
    if (isStall) return 0.42;
    return 0.25 + 0.03 * (activeAirfoil.cl0 / Math.max(0.2, Math.abs(liftCoeff)));
  }, [isSupersonic, isStall, liftCoeff, activeAirfoil]);

  // Real-time Canvas CFD Fluid Simulation Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = createHardware2DContext(canvas);
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.035 * Math.max(0.4, mach * 1.8);
      const w = canvas.width;
      const h = canvas.height;

      // Dark CFD Tunnel Canvas background
      ctx.fillStyle = '#060911';
      ctx.fillRect(0, 0, w, h);

      // 1. Grid Mesh (FVM Cells Representation)
      if (showGridMesh) {
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
        ctx.lineWidth = 0.75;
        const stepX = 24;
        const stepY = 20;
        for (let x = 0; x < w; x += stepX) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += stepY) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
      }

      // Airfoil coordinates in canvas
      const cx = w * 0.46;
      const cy = h * 0.52;
      const chord = w * 0.42;
      const radAlpha = (-alpha * Math.PI) / 180;

      // 2. Pressure Field Heatmap Background (Iso-pressure zones)
      if (showPressureHeatmap) {
        const grad = ctx.createRadialGradient(cx, cy - (alpha > 0 ? 35 : -35), 10, cx, cy, chord * 0.75);
        if (alpha > 0) {
          // Suction zone (Low pressure / High speed) above wing
          grad.addColorStop(0, 'rgba(14, 165, 233, 0.22)');
          grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.08)');
          grad.addColorStop(1, 'rgba(6, 9, 17, 0)');
        } else {
          grad.addColorStop(0, 'rgba(239, 68, 68, 0.22)');
          grad.addColorStop(1, 'rgba(6, 9, 17, 0)');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Stagnation High Pressure zone under the nose
        const stagGrad = ctx.createRadialGradient(cx - chord * 0.45, cy + 10, 5, cx - chord * 0.45, cy + 10, 45);
        stagGrad.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
        stagGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = stagGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // 3. Supersonic Shockwaves & Mach Lines
      if (isSupersonic && showShockwaves) {
        const mu = Math.asin(1 / Math.max(1.01, mach)); // Mach cone half-angle
        ctx.save();
        ctx.translate(cx - chord * 0.48, cy);
        ctx.rotate(radAlpha);

        // Bow / Oblique Shock Waves from leading edge
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.9)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 4]);

        // Upper shock
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-Math.cos(mu) * 220, -Math.sin(mu) * 220);
        ctx.stroke();

        // Lower shock
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-Math.cos(mu) * 220, Math.sin(mu) * 220);
        ctx.stroke();

        // Trailing edge expansion fan
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(chord, 0);
        ctx.lineTo(chord - Math.cos(mu) * 180, -Math.sin(mu) * 180);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(chord, 0);
        ctx.lineTo(chord - Math.cos(mu) * 180, Math.sin(mu) * 180);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.restore();
      }

      // 4. Streamlines & Animated Fluid Particles
      if (showStreamlines) {
        const numLines = 28;
        for (let i = 0; i < numLines; i++) {
          const yBase = (h / (numLines + 1)) * (i + 1);
          ctx.beginPath();
          ctx.lineWidth = 1.4;

          // Color coded: Blue/Cyan for suction, Indigo/Violet for pressure side
          const isUpper = yBase < cy;
          ctx.strokeStyle = isUpper ? 'rgba(56, 189, 248, 0.75)' : 'rgba(129, 140, 248, 0.75)';

          for (let x = 0; x < w; x += 5) {
            const dx = x - cx;
            const dy = yBase - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            let dyFlow = 0;

            // Fluid deflection around profile
            if (dist < chord * 0.95) {
              const envelope = Math.exp(-(dist * dist) / (chord * chord * 0.15));
              // Lifting deflection + stall vortex shedding
              const stallTurbulence = isStall && dx > 0 ? Math.sin(dx * 0.08 + time * 3) * (dx / chord) * 26 : 0;
              dyFlow = -Math.sin(radAlpha) * envelope * 42 + stallTurbulence;
            }

            const yPos = yBase + dyFlow;
            if (x === 0) ctx.moveTo(x, yPos);
            else ctx.lineTo(x, yPos);
          }
          ctx.stroke();
        }

        // Animated particles moving along streamlines
        const numParticles = 32;
        ctx.fillStyle = '#ffffff';
        for (let p = 0; p < numParticles; p++) {
          const pSeed = (p * 47) % numLines;
          const yBase = (h / (numLines + 1)) * (pSeed + 1);
          const pSpeed = (mach * 2.2 + 0.6) * 120;
          const pX = (time * pSpeed + (p * 73)) % (w + 40) - 20;

          const dx = pX - cx;
          const dy = yBase - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          let dyFlow = 0;
          if (dist < chord * 0.95) {
            const envelope = Math.exp(-(dist * dist) / (chord * chord * 0.15));
            dyFlow = -Math.sin(radAlpha) * envelope * 42;
          }

          ctx.beginPath();
          ctx.arc(pX, yBase + dyFlow, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 5. Draw Selected Airfoil Profile
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(radAlpha);

      // Boundary layer shadow
      if (showBoundaryLayer) {
        ctx.strokeStyle = isStall ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.35)';
        ctx.lineWidth = isStall ? 16 : 6;
        ctx.stroke();
      }

      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = isStall ? '#ef4444' : isSupersonic ? '#f43f5e' : '#38bdf8';
      ctx.lineWidth = 2.8;

      ctx.beginPath();
      const pts = 80;
      for (let p = 0; p <= pts; p++) {
        const xNorm = p / pts; // 0 to 1 along chord
        const xPos = (xNorm - 0.5) * chord;

        let yt = 0;
        let yc = 0;

        if (airfoilId === 'naca0012' || airfoilId === 'naca4412') {
          yt = 0.12 * 5 * (0.2969 * Math.sqrt(xNorm) - 0.126 * xNorm - 0.3516 * xNorm * xNorm + 0.2843 * Math.pow(xNorm, 3) - 0.1015 * Math.pow(xNorm, 4));
          if (airfoilId === 'naca4412') {
            yc = xNorm < 0.4 ? (0.04 / 0.16) * (0.8 * xNorm - xNorm * xNorm) : (0.04 / 0.36) * (0.2 + 0.8 * xNorm - xNorm * xNorm);
          }
        } else if (airfoilId === 'supercritical') {
          // Flattened top, aft camber
          yt = 0.14 * (0.28 * Math.sqrt(xNorm) - 0.11 * xNorm - 0.32 * xNorm * xNorm + 0.22 * Math.pow(xNorm, 3));
          yc = 0.03 * Math.sin(Math.PI * Math.pow(xNorm, 1.4));
        } else if (airfoilId === 'diamond') {
          // Sharp supersonic diamond
          yt = xNorm < 0.5 ? 0.06 * (xNorm / 0.5) : 0.06 * (1 - (xNorm - 0.5) / 0.5);
          yc = 0;
        } else if (airfoilId === 'ogive') {
          // Karman Ogive
          const theta = Math.acos(1 - 2 * xNorm);
          yt = 0.10 * (Math.sqrt(theta - Math.sin(2 * theta) / 2) / Math.sqrt(Math.PI));
          yc = 0;
        }

        const yUpper = -(yc + yt) * chord;
        if (p === 0) ctx.moveTo(xPos, yUpper);
        else ctx.lineTo(xPos, yUpper);
      }

      for (let p = pts; p >= 0; p--) {
        const xNorm = p / pts;
        const xPos = (xNorm - 0.5) * chord;

        let yt = 0;
        let yc = 0;

        if (airfoilId === 'naca0012' || airfoilId === 'naca4412') {
          yt = 0.12 * 5 * (0.2969 * Math.sqrt(xNorm) - 0.126 * xNorm - 0.3516 * xNorm * xNorm + 0.2843 * Math.pow(xNorm, 3) - 0.1015 * Math.pow(xNorm, 4));
          if (airfoilId === 'naca4412') {
            yc = xNorm < 0.4 ? (0.04 / 0.16) * (0.8 * xNorm - xNorm * xNorm) : (0.04 / 0.36) * (0.2 + 0.8 * xNorm - xNorm * xNorm);
          }
        } else if (airfoilId === 'supercritical') {
          yt = 0.14 * (0.28 * Math.sqrt(xNorm) - 0.11 * xNorm - 0.32 * xNorm * xNorm + 0.22 * Math.pow(xNorm, 3));
          yc = 0.03 * Math.sin(Math.PI * Math.pow(xNorm, 1.4));
        } else if (airfoilId === 'diamond') {
          yt = xNorm < 0.5 ? 0.06 * (xNorm / 0.5) : 0.06 * (1 - (xNorm - 0.5) / 0.5);
          yc = 0;
        } else if (airfoilId === 'ogive') {
          const theta = Math.acos(1 - 2 * xNorm);
          yt = 0.10 * (Math.sqrt(theta - Math.sin(2 * theta) / 2) / Math.sqrt(Math.PI));
          yc = 0;
        }

        const yLower = -(yc - yt) * chord;
        ctx.lineTo(xPos, yLower);
      }

      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw Center of Pressure Marker & Resultant Lift Vector
      const cpX = (centerOfPressure - 0.5) * chord;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(cpX, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Lift Vector (Arrow pointing up perpendicular to chord)
      const liftVectorLength = Math.max(10, Math.min(90, liftCoeff * 45));
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cpX, 0);
      ctx.lineTo(cpX, -liftVectorLength);
      ctx.stroke();

      // Arrowhead
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(cpX, -liftVectorLength - 6);
      ctx.lineTo(cpX - 4, -liftVectorLength + 2);
      ctx.lineTo(cpX + 4, -liftVectorLength + 2);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // 6. HUD Telemetry Box on Canvas
      ctx.fillStyle = 'rgba(10, 15, 29, 0.88)';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.fillRect(12, 12, 230, 85);
      ctx.strokeRect(12, 12, 230, 85);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`РЕЖИМ ПОТОКА: M = ${mach.toFixed(2)}`, 20, 28);
      ctx.fillStyle = isStall ? '#ef4444' : '#38bdf8';
      ctx.fillText(`СТАТУС: ${isStall ? 'ОТРЫВ ПОТОКА (STALL)' : 'ПРИСОЕДИНЕННЫЙ ПОТОК'}`, 20, 44);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(`ПОДЪЕМНАЯ СИЛА C_L: ${liftCoeff.toFixed(3)}`, 20, 60);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`СОЛВЕР: FVM + AMD + AMG + GMRES`, 20, 76);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [
    mach,
    alpha,
    airfoilId,
    showStreamlines,
    showPressureHeatmap,
    showShockwaves,
    showBoundaryLayer,
    showGridMesh,
    isStall,
    isSupersonic,
    liftCoeff,
    centerOfPressure,
  ]);

  return (
    <div className="space-y-6">
      {/* 1. Top Section: Interactive Tunnel Canvas & Real-time Sliders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Main CFD Virtual Tunnel Canvas */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Wind className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Виртуальная Аэродинамическая Труба (CFD FVM 2D/3D)</span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Численное моделирование поля давлений, линий тока и ударных волн
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowVirtualJoystick(!showVirtualJoystick)}
                className={`text-[10px] px-2.5 py-1 rounded-full font-mono font-bold border transition-colors cursor-pointer ${
                  showVirtualJoystick ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black' : 'bg-slate-800 text-cyan-300 border-slate-700'
                }`}
                title="Включить наэкранный виртуальный джойстик"
              >
                🕹️ Джойстик
              </button>
              <button
                type="button"
                onClick={() => setIsCockpitOpen(true)}
                className="text-[10px] px-2.5 py-1 rounded-full font-mono font-black bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 border border-cyan-300 shadow hover:brightness-110 cursor-pointer"
                title="Открыть полноэкранный кокпит со всеми характеристиками"
              >
                Кокпит HUD ↗
              </button>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-mono font-bold border ${flowRegime.badge}`}>
                {flowRegime.label}
              </span>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-mono font-bold border ${
                isStall ? 'bg-rose-950 text-rose-300 border-rose-700' : 'bg-emerald-950 text-emerald-300 border-emerald-700'
              }`}>
                {isStall ? '⚠️ СВАЛИВАНИЕ (STALL)' : '✅ ОБТЕКАНИЕ СТАБИЛЬНО'}
              </span>
            </div>
          </div>

          {/* Interactive Flow Canvas */}
          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 h-80 sm:h-96 shadow-inner">
            <canvas
              ref={canvasRef}
              width={800}
              height={420}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              className="w-full h-full object-cover cursor-crosshair active:cursor-grabbing"
              title="Перетягивайте мышью для изменения угла атаки и скорости потока"
            />

            {/* Mouse Dragging Helper Label */}
            <div className="absolute bottom-2 left-3 bg-slate-950/75 backdrop-blur-sm px-2 py-1 rounded border border-slate-800 text-[9px] font-mono text-slate-400 pointer-events-none">
              🖱️ Зажмите мышь на трубе: перетягивание по Y изменяет угол атаки $\alpha$, по X — число Маха $M$.
            </div>

            {/* Canvas Layers Overlay Toggles */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setShowStreamlines(!showStreamlines)}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  showStreamlines ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Включить/выключить линии тока"
              >
                Линии тока
              </button>
              <button
                type="button"
                onClick={() => setShowPressureHeatmap(!showPressureHeatmap)}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  showPressureHeatmap ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Поле градиента давлений"
              >
                Давление (C_p)
              </button>
              <button
                type="button"
                onClick={() => setShowShockwaves(!showShockwaves)}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  showShockwaves ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Скачки уплотнения (конусы Маха)"
              >
                Ударные волны
              </button>
              <button
                type="button"
                onClick={() => setShowGridMesh(!showGridMesh)}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  showGridMesh ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Сетка конечных объемов FVM"
              >
                Сетка FVM
              </button>
            </div>

            {/* Virtual Joystick Overlay on Wind Tunnel */}
            {showVirtualJoystick && (
              <div className="absolute bottom-3 right-3 z-30 animate-slideUp">
                <VirtualJoystick
                  mode={joystickMode}
                  onModeChange={setJoystickMode}
                  onChange={handleJoystickChange}
                  size={110}
                  showThrottle={false}
                />
              </div>
            )}
          </div>

          {/* Interactive Aerodynamic Parameter Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            {/* Slider 1: Mach Number */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <div className="flex items-center gap-1 text-slate-300">
                  <span>Число Маха (M):</span>
                  <button
                    onClick={() => setSelectedTooltip(selectedTooltip === 'mach' ? null : 'mach')}
                    className="text-slate-500 hover:text-cyan-400 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className={`font-bold text-sm ${flowRegime.color}`}>{mach.toFixed(2)} M</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3.5"
                step="0.02"
                value={mach}
                onChange={(e) => setMach(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.1 (Дозвук)</span>
                <span>1.0 (Звуковой барьер)</span>
                <span>3.5 (Сверхзвук)</span>
              </div>
              {selectedTooltip === 'mach' && (
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-300 space-y-1 mt-1 animate-fadeIn">
                  <p className="font-bold text-cyan-300">
                    <MathText text="Физический смысл Числа Маха ($M$):" />
                  </p>
                  <p>
                    <MathText text="Отношение скорости набегающего потока $V$ к локальной скорости звука $a = \sqrt{\gamma R T}$. При $M > 1$ возмущения не успевают распространяться вперед, образуя конус Маха с углом $\mu = \arcsin(1/M)$." />
                  </p>
                </div>
              )}
            </div>

            {/* Slider 2: Angle of Attack */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <div className="flex items-center gap-1 text-slate-300">
                  <span>Угол атаки (α):</span>
                  <button
                    onClick={() => setSelectedTooltip(selectedTooltip === 'alpha' ? null : 'alpha')}
                    className="text-slate-500 hover:text-cyan-400 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className={`font-bold text-sm ${isStall ? 'text-rose-400' : 'text-cyan-300'}`}>{alpha.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="-10"
                max="25"
                step="0.5"
                value={alpha}
                onChange={(e) => setAlpha(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>-10° (Пикирование)</span>
                <span>0° (Нейтраль)</span>
                <span>+25° (Кабрирование)</span>
              </div>
              {selectedTooltip === 'alpha' && (
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-300 space-y-1 mt-1 animate-fadeIn">
                  <p className="font-bold text-cyan-300">
                    <MathText text="Угол атаки ($\alpha$) и срыв потока:" />
                  </p>
                  <p>
                    <MathText text="Угол между хордой профиля и вектором скорости потока. При превышении критического угла ($\alpha_{\text{крит}} \approx 14^\circ$) пограничный слой отрывается от верхней поверхности крыла — подъемная сила падает, а сопротивление резко возрастает." />
                  </p>
                </div>
              )}
            </div>

            {/* Slider 3: Altitude H */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300">Высота полета (H):</span>
                <span className="font-bold text-slate-200">{(altitude / 1000).toFixed(1)} км ({altitude} м)</span>
              </div>
              <input
                type="range"
                min="0"
                max="20000"
                step="500"
                value={altitude}
                onChange={(e) => setAltitude(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0 м (Уровень моря)</span>
                <span>11 000 м (Тропопауза)</span>
                <span>20 000 м (Стратосфера)</span>
              </div>
            </div>

            {/* Slider 4: Reynolds Number */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300">Число Рейнольдса (Re):</span>
                <span className="font-bold text-slate-200">10^{reynoldsExp.toFixed(1)} ({(Math.pow(10, reynoldsExp) / 1e6).toFixed(2)} × 10⁶)</span>
              </div>
              <input
                type="range"
                min="4.0"
                max="7.5"
                step="0.1"
                value={reynoldsExp}
                onChange={(e) => setReynoldsExp(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>10⁴ (Ламинарный)</span>
                <span>10⁶ (Переходный)</span>
                <span>10⁷ (Развитая турбулентность)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Aerodynamic Telemetry & Profile Selector */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Телеметрия Полета & Аэродинамика</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">ISA модель</span>
            </div>

            {/* 4 Big Metric Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                  <span>Подъемная сила (C_L)</span>
                </div>
                <div className="text-xl font-black text-cyan-400 font-mono mt-0.5">{liftCoeff.toFixed(3)}</div>
                <div className="text-[9px] text-slate-500">Безразмерный коэфф.</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                  <span>Сопротивление (C_D)</span>
                </div>
                <div className="text-xl font-black text-amber-400 font-mono mt-0.5">{dragCoeff.toFixed(3)}</div>
                <div className="text-[9px] text-slate-500">Профиль + волновое</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                  <span>Качество (K = L/D)</span>
                </div>
                <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">{glideRatio.toFixed(2)}</div>
                <div className="text-[9px] text-slate-500">Дальность планирования</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                  <span>Центр давления (x_cp)</span>
                </div>
                <div className="text-xl font-black text-indigo-400 font-mono mt-0.5">{(centerOfPressure * 100).toFixed(1)}%</div>
                <div className="text-[9px] text-slate-500">От передней кромки</div>
              </div>
            </div>

            {/* Atmospheric Parameters at Altitude H */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
              <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                <span>Параметры Стандартной Атмосферы:</span>
                <span className="text-cyan-400 font-mono">{isa.altitudeMeters} м</span>
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 text-[11px] font-mono text-slate-400">
                <div><MathText text="Плотность $\rho$:" /> <span className="text-slate-200 font-bold">{isa.densityKgM3} кг/м³</span></div>
                <div><MathText text="Давление $p$:" /> <span className="text-slate-200 font-bold">{isa.pressureKPa} кПа</span></div>
                <div><MathText text="Температура $T$:" /> <span className="text-slate-200 font-bold">{isa.temperatureC} °C</span></div>
                <div><MathText text="Скорость звука $a$:" /> <span className="text-slate-200 font-bold">{isa.speedOfSoundMs} м/с</span></div>
                <div><MathText text="Истинная скор. $V$:" /> <span className="text-slate-200 font-bold">{isa.trueAirspeedKmh} км/ч</span></div>
                <div><MathText text="Динам. напор $q$:" /> <span className="text-slate-200 font-bold">{isa.dynamicPressureKPa} кПа</span></div>
              </div>
            </div>

            {/* Airfoil Profile Selector */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                <span>Геометрический Профиль:</span>
                <span className="text-[10px] text-cyan-400 font-mono">{activeAirfoil.category}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.values(AIRFOIL_CATALOG).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setAirfoilId(p.id)}
                    className={`py-2 px-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      airfoilId === p.id
                        ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="text-xs font-bold font-mono">{p.name.split(' ')[0]} {p.name.split(' ')[1]}</div>
                    <div className="text-[10px] text-slate-500 line-clamp-1">{p.category}</div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <MathText text={activeAirfoil.description} />
              </p>
            </div>
          </div>

          {/* Mathematical Pipeline Connection Badge */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 border border-cyan-800/40 text-[11px] text-slate-300 space-y-1.5">
            <div className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>Вычислительный конвейер солвера</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              <MathText text="Уравнение Пуассона для давления $\nabla^2 p = S$ на 45 200 ячейках FVM решается с помощью предобусловливания AMG V-cycle и крыловского итератора GMRES(30) за 14.8 мс." />
            </p>
          </div>
        </div>
      </div>

      {/* Universal Telemetry & Joystick Cockpit */}
      <UniversalCockpitHUDModal
        isOpen={isCockpitOpen}
        onClose={() => setIsCockpitOpen(false)}
        initialDomain="cfd_wind_tunnel"
        initialMach={mach}
        initialAlpha={alpha}
      />
    </div>
  );
};
