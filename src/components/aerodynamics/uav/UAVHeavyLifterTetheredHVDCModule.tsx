import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Zap,
  Cable,
  Wind,
  Shield,
  Activity,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  BatteryCharging,
  Layers,
  Gauge,
  Sparkles,
  Download,
  Share2,
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

export const UAVHeavyLifterTetheredHVDCModule: React.FC = () => {
  // Operational Parameters
  const [hoverAltitude_m, setHoverAltitude_m] = useState<number>(150); // 20 to 300 m
  const [payloadMass_kg, setPayloadMass_kg] = useState<number>(45); // 0 to 120 kg
  const [windSpeed_ms, setWindSpeed_ms] = useState<number>(8.0); // 0 to 22 m/s
  const [groundVoltage_V, setGroundVoltage_V] = useState<number>(800); // 400 to 1200 V DC
  const [cableAWG, setCableAWG] = useState<number>(14); // 10, 12, 14, 16, 18
  const [rotorCount, setRotorCount] = useState<number>(8); // 6, 8, 12 (Coaxial)
  const [airTemperature_C, setAirTemperature_C] = useState<number>(20);

  // Active Simulation State
  const [isWinchActive, setIsWinchActive] = useState<boolean>(true);
  const [winchTensionCmd_N, setWinchTensionCmd_N] = useState<number>(180);

  // Canvas Ref for visual animation
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Cable Properties based on AWG
  const cableSpec = useMemo(() => {
    // Copper conductor + Kevlar reinforcement + high-dielectric fluoropolymer jacket
    const specs: Record<number, { resPerKm: number; weightPerM_g: number; diam_mm: number; maxCurrent_A: number }> = {
      10: { resPerKm: 3.28, weightPerM_g: 65, diam_mm: 5.8, maxCurrent_A: 40 },
      12: { resPerKm: 5.21, weightPerM_g: 45, diam_mm: 4.8, maxCurrent_A: 28 },
      14: { resPerKm: 8.28, weightPerM_g: 32, diam_mm: 3.9, maxCurrent_A: 20 },
      16: { resPerKm: 13.17, weightPerM_g: 22, diam_mm: 3.2, maxCurrent_A: 14 },
      18: { resPerKm: 20.95, weightPerM_g: 15, diam_mm: 2.6, maxCurrent_A: 10 },
    };
    return specs[cableAWG] || specs[14];
  }, [cableAWG]);

  // Physics Calculations
  const calc = useMemo(() => {
    const rhoAir = 1.225 * (288.15 / (273.15 + airTemperature_C));
    const airframeDryMass_kg = 28 + rotorCount * 2.2;
    const onboardConverterMass_kg = 4.5 + (payloadMass_kg > 50 ? 3.0 : 1.5);
    const totalDroneMass_kg = airframeDryMass_kg + onboardConverterMass_kg + payloadMass_kg;

    // Cable mass hanging in air
    const totalCableLength_m = Math.sqrt(hoverAltitude_m ** 2 + (windSpeed_ms * 4.5) ** 2) * 1.06;
    const cableMass_kg = (totalCableLength_m * cableSpec.weightPerM_g) / 1000;

    const allUpMass_kg = totalDroneMass_kg + cableMass_kg * 0.65; // Drone carries fraction of suspended cable
    const requiredThrust_N = allUpMass_kg * 9.81;

    // Aerodynamic Power Calculation for Multirotor (Momentum Theory + Blade profile)
    // Disk area calculation
    const rotorRadius_m = 0.45; // 36-inch propellers
    const totalDiskArea_m2 = rotorCount * Math.PI * (rotorRadius_m ** 2);
    const inducedHoverVelocity = Math.sqrt(requiredThrust_N / (2 * rhoAir * totalDiskArea_m2));
    const idealHoverPower_W = requiredThrust_N * inducedHoverVelocity;
    const figureOfMerit = 0.72; // High-efficiency carbon props
    const electricalDriveEfficiency = 0.88; // Motors + ESCs
    const mechanicalPower_W = idealHoverPower_W / figureOfMerit;
    const motorElectricalPower_W = mechanicalPower_W / electricalDriveEfficiency;
    const onboardAvionicsPayloadPower_W = 350 + payloadMass_kg * 12; // Radar/Gimbal/Sensors

    const totalOnboardPower_W = motorElectricalPower_W + onboardAvionicsPayloadPower_W;

    // Down-converter onboard step down (e.g. 800V DC to 52V DC bus)
    const dcDcEfficiency = 0.965;
    const cablePowerDelivery_W = totalOnboardPower_W / dcDcEfficiency;

    // Electrical Transmission Line Calculation
    // Total loop resistance (2 conductors)
    const loopResistance_Ohm = 2 * (cableSpec.resPerKm / 1000) * totalCableLength_m;

    // Solve: P_delivered = V_drone * I = (V_ground - I * R) * I  => R*I^2 - V_ground*I + P_del = 0
    const a = loopResistance_Ohm;
    const b = -groundVoltage_V;
    const c = cablePowerDelivery_W;
    const discriminant = b * b - 4 * a * c;

    let current_A = 0;
    let voltageDrop_V = 0;
    let powerLoss_W = 0;
    let isVoltageCollapse = false;

    if (discriminant >= 0) {
      current_A = (-b - Math.sqrt(discriminant)) / (2 * a);
      voltageDrop_V = current_A * loopResistance_Ohm;
      powerLoss_W = (current_A ** 2) * loopResistance_Ohm;
    } else {
      isVoltageCollapse = true;
      current_A = groundVoltage_V / (2 * loopResistance_Ohm);
      powerLoss_W = current_A * groundVoltage_V * 0.5;
    }

    const groundPower_W = cablePowerDelivery_W + powerLoss_W;
    const transmissionEfficiency_pct = (cablePowerDelivery_W / groundPower_W) * 100;

    // Cable Temperature rise: delta T = (I^2 * R / (pi * d * h_conv))
    const h_conv = 15 + windSpeed_ms * 4; // Convective cooling coefficient
    const cablePerimeter_m = Math.PI * (cableSpec.diam_mm / 1000);
    const heatLossPerMeter_W = (current_A ** 2) * (cableSpec.resPerKm / 1000);
    const cableTempRise_C = heatLossPerMeter_W / (cablePerimeter_m * h_conv);
    const cableCoreTemp_C = airTemperature_C + cableTempRise_C;

    // Cable Catenary Sag & Wind Tension
    const cableDragArea_m2 = totalCableLength_m * (cableSpec.diam_mm / 1000);
    const windDragForce_N = 0.5 * rhoAir * (windSpeed_ms ** 2) * 1.1 * cableDragArea_m2;
    const verticalCableWeight_N = cableMass_kg * 9.81;
    const totalCableTensionTop_N = Math.sqrt(verticalCableWeight_N ** 2 + windDragForce_N ** 2) + winchTensionCmd_N;

    const tetherSafetyFactor = (1800) / totalCableTensionTop_N; // Kevlar breaking load ~ 1800 N

    return {
      totalDroneMass_kg: totalDroneMass_kg.toFixed(1),
      allUpMass_kg: allUpMass_kg.toFixed(1),
      cableMass_kg: cableMass_kg.toFixed(2),
      totalCableLength_m: totalCableLength_m.toFixed(1),
      requiredThrust_N: requiredThrust_N.toFixed(1),
      motorElectricalPower_kW: (motorElectricalPower_W / 1000).toFixed(2),
      totalOnboardPower_kW: (totalOnboardPower_W / 1000).toFixed(2),
      groundPower_kW: (groundPower_W / 1000).toFixed(2),
      current_A: current_A.toFixed(1),
      voltageDrop_V: voltageDrop_V.toFixed(1),
      voltageAtDrone_V: (groundVoltage_V - voltageDrop_V).toFixed(1),
      powerLoss_kW: (powerLoss_W / 1000).toFixed(2),
      transmissionEfficiency_pct: transmissionEfficiency_pct.toFixed(1),
      cableCoreTemp_C: cableCoreTemp_C.toFixed(1),
      totalCableTensionTop_N: totalCableTensionTop_N.toFixed(1),
      tetherSafetyFactor: tetherSafetyFactor.toFixed(2),
      isVoltageCollapse,
      isOverheated: cableCoreTemp_C > 95,
      isOverCurrent: current_A > cableSpec.maxCurrent_A,
    };
  }, [hoverAltitude_m, payloadMass_kg, windSpeed_ms, groundVoltage_V, cableAWG, rotorCount, airTemperature_C, cableSpec, winchTensionCmd_N]);

  // Altitude vs Tension & Loss Curve
  const altitudeChartData = useMemo(() => {
    const list = [];
    for (let alt = 30; alt <= 300; alt += 30) {
      const len = alt * 1.08;
      const rLoop = 2 * (cableSpec.resPerKm / 1000) * len;
      const iEst = (parseFloat(calc.totalOnboardPower_kW) * 1000) / groundVoltage_V;
      const lossW = (iEst ** 2) * rLoop;
      const tensionN = (len * cableSpec.weightPerM_g * 0.00981) + (windSpeed_ms * 4) + winchTensionCmd_N;
      list.push({
        alt,
        tensionN: Number(tensionN.toFixed(1)),
        lossKW: Number((lossW / 1000).toFixed(2)),
        effPct: Number(Math.max(60, 100 - (lossW / (parseFloat(calc.groundPower_kW) * 1000)) * 100).toFixed(1)),
      });
    }
    return list;
  }, [cableSpec, calc.totalOnboardPower_kW, calc.groundPower_kW, groundVoltage_V, windSpeed_ms, winchTensionCmd_N]);

  // Canvas visual rendering
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

      // Sky background
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Ground station pad
      ctx.fillStyle = '#334155';
      ctx.fillRect(60, h - 35, 120, 25);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(85, h - 45, 70, 10);

      // Station text
      ctx.font = '10px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('⚡ HVDC GROUND BASE (1000V)', 40, h - 12);

      // Drone coordinates
      const droneX = w - 120 + Math.sin(t * 1.5) * 6;
      const droneY = 70 + Math.cos(t * 1.2) * 4;

      // Draw Catenary Cable
      ctx.beginPath();
      ctx.moveTo(120, h - 45);

      const sagX = (120 + droneX) / 2 + (windSpeed_ms * 5);
      const sagY = (h - 45 + droneY) / 2 + 35;

      ctx.quadraticCurveTo(sagX, sagY, droneX, droneY + 15);
      ctx.strokeStyle = calc.isOverheated ? '#ef4444' : '#38bdf8';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Tether electrical pulses
      ctx.fillStyle = '#fde047';
      const pulseCount = 6;
      for (let i = 0; i < pulseCount; i++) {
        const frac = ((t * 0.4 + i / pulseCount) % 1.0);
        const px = (1 - frac) * 120 + frac * droneX + Math.sin(frac * Math.PI) * (windSpeed_ms * 3);
        const py = (1 - frac) * (h - 45) + frac * (droneY + 15) + Math.sin(frac * Math.PI) * 25;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Drone (Coaxial / Heavy Octo)
      ctx.save();
      ctx.translate(droneX, droneY);

      // Drone Central Fuselage
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-30, -10, 60, 20, 6);
      ctx.fill();
      ctx.stroke();

      // Rotor Arms & Spinning Props
      const armLength = 55;
      [-1, 1].forEach((dir) => {
        // Arm
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(dir * armLength, -6);
        ctx.stroke();

        // Motor Hub
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(dir * armLength - 6, -16, 12, 14);

        // Blurry Spinning Prop Disk
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(dir * armLength, -16, 32 + Math.sin(t * 8) * 2, 4, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Coaxial Lower Prop Disk
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.4)';
        ctx.beginPath();
        ctx.ellipse(dir * armLength, -2, 32 - Math.sin(t * 8) * 2, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Payload Gimbal hanging below
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(0, 18, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-2, 20, 4, 6);

      ctx.restore();

      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animFrame);
  }, [windSpeed_ms, calc.isOverheated]);

  return (
    <div className="space-y-5 text-slate-100 font-sans">
      {/* Hero Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-sky-500/30 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400">
            <Cable className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Тяжелые Привязные БПЛА & Высоковольтное Питание (Tethered HVDC 1000V)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40">
                Фича #97
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Моделирование неограниченного зависания тяжелых платформ (до 150 кг): расчет цепной линии провисания троса (Catenary Sag), Джоулева нагрева, падения напряжения и КПД передачи энергии.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsWinchActive(!isWinchActive)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-500 text-slate-950 font-bold text-xs hover:from-sky-300 hover:to-cyan-400 transition-all cursor-pointer shadow-lg shadow-sky-950/40"
          >
            <Activity className="w-4 h-4" />
            <span>{isWinchActive ? 'Лебедка: АКТИВНА' : 'Лебедка: СТОП'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Visual Canvas & Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start font-mono">
        {/* Left Visual Stage (7 cols) */}
        <div className="lg:col-span-7 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-sky-300 font-bold">
              <Activity className="w-4 h-4 text-sky-400" />
              <span>Динамический Стенд Зависания и Провисания Кабель-Троса</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Высота: {hoverAltitude_m} м | Ветер: {windSpeed_ms} м/с
            </span>
          </div>

          <div className="w-full h-72 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 relative">
            <canvas ref={canvasRef} width={640} height={300} className="w-full h-full object-cover" />
          </div>

          {/* Theoretical Formula Box */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-sans space-y-1">
            <div className="font-bold text-sky-300 font-mono">📐 Уравнение цепной линии и натяжения троса с ветровым сносом:</div>
            <MathText text="y(x) = \frac{H}{w} \left( \cosh\left(\frac{w \cdot x}{H}\right) - 1 \right), \quad T_{\text{top}} = \sqrt{(m_{\text{cable}} g)^2 + \left(\frac{1}{2}\rho V_{\text{wind}}^2 d_{\text{c}} C_D L\right)^2} + T_{\text{winch}}" />
          </div>
        </div>

        {/* Right Dashboard & Controls (5 cols) */}
        <div className="lg:col-span-5 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>Параметры Комплекса Привязи</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-bold">
              HVDC 1000V READY
            </span>
          </div>

          {/* Altitude Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Рабочая высота зависания:</span>
              <span className="text-sky-400 font-bold">{hoverAltitude_m} м</span>
            </div>
            <input
              type="range"
              min={30}
              max={300}
              step={10}
              value={hoverAltitude_m}
              onChange={(e) => setHoverAltitude_m(parseInt(e.target.value, 10))}
              className="w-full accent-sky-400 cursor-pointer"
            />
          </div>

          {/* Payload Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Полезная нагрузка (ОЭ-станция / РЛС / РЭБ):</span>
              <span className="text-sky-400 font-bold">{payloadMass_kg} кг</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={payloadMass_kg}
              onChange={(e) => setPayloadMass_kg(parseInt(e.target.value, 10))}
              className="w-full accent-sky-400 cursor-pointer"
            />
          </div>

          {/* Ground Voltage Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Напряжение наземной станции (HVDC):</span>
              <span className="text-amber-400 font-bold">{groundVoltage_V} В</span>
            </div>
            <input
              type="range"
              min={400}
              max={1200}
              step={50}
              value={groundVoltage_V}
              onChange={(e) => setGroundVoltage_V(parseInt(e.target.value, 10))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Wind Speed Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Скорость ветра на высоте:</span>
              <span className="text-cyan-400 font-bold">{windSpeed_ms} м/с</span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={windSpeed_ms}
              onChange={(e) => setWindSpeed_ms(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Cable AWG Selector */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <label className="text-xs text-slate-300">Сечение жилы кабель-троса (AWG):</label>
            <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
              {[10, 12, 14, 16, 18].map((awg) => (
                <button
                  key={awg}
                  type="button"
                  onClick={() => setCableAWG(awg)}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    cableAWG === awg
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  #{awg}
                </button>
              ))}
            </div>
          </div>

          {/* Warning Banner if voltage collapse or overheat */}
          {calc.isOverheated && (
            <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-400 shrink-0 animate-bounce" />
              <span>Перегрев жилы кабеля (&gt; 95°C)! Увеличьте напряжение HVDC или сечение AWG.</span>
            </div>
          )}
        </div>
      </div>

      {/* Numerical Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400">Потребление БПЛА:</span>
          <div className="text-sm font-bold text-sky-400">{calc.totalOnboardPower_kW} кВт</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400">Ток в линии (I):</span>
          <div className={`text-sm font-bold ${calc.isOverCurrent ? 'text-rose-400' : 'text-emerald-400'}`}>
            {calc.current_A} А
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400">Падение напряжения:</span>
          <div className="text-sm font-bold text-amber-400">-{calc.voltageDrop_V} В</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400">КПД передачи линии:</span>
          <div className="text-sm font-bold text-cyan-300">{calc.transmissionEfficiency_pct}%</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400">Температура жилы:</span>
          <div className={`text-sm font-bold ${calc.isOverheated ? 'text-rose-400' : 'text-slate-200'}`}>
            {calc.cableCoreTemp_C}°C
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400">Запас прочности троса:</span>
          <div className="text-sm font-bold text-emerald-400">{calc.tetherSafetyFactor}x</div>
        </div>
      </div>

      {/* Altitude Charts */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-sky-300 font-bold">
            <Gauge className="w-4 h-4 text-sky-400" />
            <span>Зависимость Натяжения Троса [Н] и Потерь в Линии [кВт] от Высоты Зависания [м]</span>
          </div>
          <span className="text-[11px] text-slate-400">Постоянное натяжение лебедки: {winchTensionCmd_N} Н</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={altitudeChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="alt" stroke="#64748b" fontSize={10} unit="m" />
              <YAxis yAxisId="left" stroke="#38bdf8" fontSize={10} unit="N" />
              <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={10} unit="kW" />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line yAxisId="left" type="monotone" dataKey="tensionN" stroke="#38bdf8" strokeWidth={2} name="Натяжение троса T_top (Н)" dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="lossKW" stroke="#f59e0b" strokeWidth={2} name="Потери в кабеле (кВт)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
