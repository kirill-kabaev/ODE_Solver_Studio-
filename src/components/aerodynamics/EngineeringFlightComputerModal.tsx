import React, { useState } from 'react';
import {
  X,
  Calculator,
  Compass,
  Wind,
  Gauge,
  Layers,
  Scale,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Copy,
  Info,
  TrendingUp,
  Flame,
  ShieldAlert,
} from 'lucide-react';
import { MathView } from '../MathView';

interface FlightComputerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EngineeringFlightComputerModal: React.FC<FlightComputerProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'atmosphere' | 'speed_units' | 'reynolds' | 'wing_loading' | 'stability'>('atmosphere');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // 1. Atmosphere ISA inputs
  const [altitudeMeters, setAltitudeMeters] = useState<number>(2000); // 0 to 30000 m
  const [deltaISA, setDeltaISA] = useState<number>(0); // ISA +/- temperature offset in Kelvin/Celsius

  // 2. Speed Unit converter inputs
  const [inputSpeedVal, setInputSpeedVal] = useState<number>(120);
  const [inputSpeedUnit, setInputSpeedUnit] = useState<'mps' | 'kmh' | 'kts' | 'mach' | 'mph'>('kmh');
  const [speedAltitude, setSpeedAltitude] = useState<number>(2000);

  // 3. Reynolds Number inputs
  const [reySpeedMps, setReySpeedMps] = useState<number>(45); // m/s
  const [reyChordMeters, setReyChordMeters] = useState<number>(0.35); // m
  const [reyAltitude, setReyAltitude] = useState<number>(1000); // m

  // 4. Wing Loading & Takeoff / Stall inputs
  const [planeMassKg, setPlaneMassKg] = useState<number>(12.5); // kg
  const [wingAreaM2, setWingAreaM2] = useState<number>(0.65); // m2
  const [clMaxStall, setClMaxStall] = useState<number>(1.4); // max CL
  const [thrustNewtons, setThrustNewtons] = useState<number>(85); // N

  // 5. Static Margin & Stability inputs
  const [cgPositionPct, setCgPositionPct] = useState<number>(25); // % MAC
  const [npPositionPct, setNpPositionPct] = useState<number>(33); // Neutral point % MAC
  const [macLengthMeters, setMacLengthMeters] = useState<number>(0.32); // m

  if (!isOpen) return null;

  // ICAO Standard Atmosphere Calculations (ГОСТ 4401-81 / ICAO ISA)
  const calculateISA = (h: number, dT: number = 0) => {
    const g0 = 9.80665;
    const R = 287.05287; // J/(kg*K)
    const T0 = 288.15; // K (15 C)
    const P0 = 101325; // Pa
    const rho0 = 1.225; // kg/m3

    let T = T0;
    let P = P0;
    let rho = rho0;
    let a = 340.294; // speed of sound m/s

    if (h <= 11000) {
      // Troposphere: lapse rate L = -0.0065 K/m
      const L = -0.0065;
      const T_std = T0 + L * h;
      T = T_std + dT;
      P = P0 * Math.pow(T_std / T0, -g0 / (L * R));
      rho = P / (R * T);
    } else if (h <= 20000) {
      // Tropopause (isothermal layer)
      const T11 = T0 - 0.0065 * 11000; // 216.65 K
      const P11 = P0 * Math.pow(T11 / T0, -g0 / (-0.0065 * R)); // ~22632 Pa
      T = T11 + dT;
      P = P11 * Math.exp(-g0 * (h - 11000) / (R * T11));
      rho = P / (R * T);
    } else {
      // Lower Stratosphere: lapse rate L = +0.001 K/m
      const T11 = 216.65;
      const P11 = 22632.06;
      const P20 = P11 * Math.exp(-g0 * (9000) / (R * T11));
      const L = 0.001;
      const T_std = T11 + L * (h - 20000);
      T = T_std + dT;
      P = P20 * Math.pow(T_std / T11, -g0 / (L * R));
      rho = P / (R * T);
    }

    // Speed of sound a = sqrt(gamma * R * T)
    const gamma = 1.4;
    a = Math.sqrt(gamma * R * T);

    // Dynamic viscosity Sutherland law: mu = mu0 * (T/T0)^(3/2) * (T0 + S)/(T + S)
    const S = 110.4;
    const mu0 = 1.7894e-5; // Pa*s
    const mu = mu0 * Math.pow(T / T0, 1.5) * ((T0 + S) / (T + S));

    // Kinematic viscosity nu = mu / rho
    const nu = mu / rho;

    return {
      altitudeM: h,
      altitudeFt: h * 3.28084,
      tempK: T,
      tempC: T - 273.15,
      pressurePa: P,
      pressureKPa: P / 1000,
      pressureMmHg: P * 0.00750062,
      pressureInHg: P * 0.0002953,
      densityKgM3: rho,
      densityRatioSigma: rho / rho0,
      speedOfSoundMps: a,
      speedOfSoundKmh: a * 3.6,
      dynamicViscosity: mu,
      kinematicViscosity: nu,
    };
  };

  const currentAtm = calculateISA(altitudeMeters, deltaISA);

  // Speed converter
  const convertSpeed = () => {
    const atmAtSpeed = calculateISA(speedAltitude);
    let tasMps = 0;

    if (inputSpeedUnit === 'mps') tasMps = inputSpeedVal;
    else if (inputSpeedUnit === 'kmh') tasMps = inputSpeedVal / 3.6;
    else if (inputSpeedUnit === 'kts') tasMps = inputSpeedVal * 0.514444;
    else if (inputSpeedUnit === 'mph') tasMps = inputSpeedVal * 0.44704;
    else if (inputSpeedUnit === 'mach') tasMps = inputSpeedVal * atmAtSpeed.speedOfSoundMps;

    const tasKmh = tasMps * 3.6;
    const tasKts = tasMps / 0.514444;
    const tasMph = tasMps / 0.44704;
    const mach = tasMps / atmAtSpeed.speedOfSoundMps;
    // Equivalent Airspeed EAS = TAS * sqrt(rho / rho0)
    const easMps = tasMps * Math.sqrt(atmAtSpeed.densityRatioSigma);
    const easKmh = easMps * 3.6;
    const easKts = easMps / 0.514444;
    // Dynamic pressure q = 0.5 * rho * V^2
    const qDynamicPa = 0.5 * atmAtSpeed.densityKgM3 * tasMps * tasMps;

    return {
      tasMps,
      tasKmh,
      tasKts,
      tasMph,
      mach,
      easMps,
      easKmh,
      easKts,
      qDynamicPa,
      qDynamicKPa: qDynamicPa / 1000,
    };
  };

  const convertedSpeeds = convertSpeed();

  // Reynolds calculation
  const calcReynolds = () => {
    const atm = calculateISA(reyAltitude);
    const Re = (atm.densityKgM3 * reySpeedMps * reyChordMeters) / atm.dynamicViscosity;
    let regime = 'Низкие Re (микро-БПЛА, склонность к ламинарному отрыву)';
    let regimeColor = 'text-amber-400';
    if (Re < 100000) {
      regime = 'Критически низкие Re: доминирование сил вязкости, ламинарные пузыри';
      regimeColor = 'text-rose-400';
    } else if (Re < 500000) {
      regime = 'Умеренные Re (дроны и планеры): переходное обтекание';
      regimeColor = 'text-yellow-400';
    } else if (Re < 3000000) {
      regime = 'Стандартные Re (легкая авиация, Ан-2): турбулентный погранслой';
      regimeColor = 'text-emerald-400';
    } else {
      regime = 'Высокие Re (магистральные лайнеры): развитый турбулентный пограничный слой';
      regimeColor = 'text-cyan-400';
    }
    return { Re, regime, regimeColor, density: atm.densityKgM3, mu: atm.dynamicViscosity };
  };

  const reynoldsData = calcReynolds();

  // Wing loading & stall speed
  const calcWingLoading = () => {
    const g = 9.80665;
    const weightNewtons = planeMassKg * g;
    const wingLoadingKgM2 = planeMassKg / Math.max(0.001, wingAreaM2);
    const wingLoadingNm2 = weightNewtons / Math.max(0.001, wingAreaM2);
    const rhoSeaLevel = 1.225;

    // Vstall = sqrt(2 * W / (rho * S * CLmax))
    const vStallMps = Math.sqrt((2 * weightNewtons) / (rhoSeaLevel * Math.max(0.001, wingAreaM2) * Math.max(0.1, clMaxStall)));
    const vStallKmh = vStallMps * 3.6;
    const vStallKts = vStallMps / 0.514444;

    // Approach speed (1.3 * Vstall)
    const vAppKmh = vStallKmh * 1.3;

    // Thrust-to-weight ratio T/W
    const twRatio = thrustNewtons / weightNewtons;

    // Approx Ground roll distance S_roll ~ 1.44 * (W/S) / (rho * g * CLmax * (T/W - mu_friction))
    const muFriction = 0.04;
    const accelEff = Math.max(0.05, twRatio - muFriction);
    const groundRollM = (vStallMps * 1.15 * (vStallMps * 1.15)) / (2 * g * accelEff);

    return {
      weightNewtons,
      wingLoadingKgM2,
      wingLoadingNm2,
      vStallMps,
      vStallKmh,
      vStallKts,
      vAppKmh,
      twRatio,
      groundRollM: Math.max(2, groundRollM),
    };
  };

  const wingData = calcWingLoading();

  // Static margin
  const calcStability = () => {
    const staticMarginPct = npPositionPct - cgPositionPct;
    const staticMarginMeters = (staticMarginPct / 100) * macLengthMeters;
    let status = 'Статически устойчив (норма)';
    let statusColor = 'text-emerald-400';
    let recommendation = 'Оптимальный диапазон для большинства самолетов (5%...15% САХ).';

    if (staticMarginPct < 0) {
      status = 'КРИТИЧЕСКИ НЕУСТОЙЧИВ (C_m_alpha > 0)';
      statusColor = 'text-rose-400';
      recommendation = 'ЦТ лежит позади фокуса (нейтральной точки)! Самолет склонен к самопроизвольному задиранию носа и сваливанию. Сместите аккумулятор вперед.';
    } else if (staticMarginPct < 5) {
      status = 'Нейтральная устойчивость (пилотажный режим)';
      statusColor = 'text-amber-400';
      recommendation = 'Высокая маневренность, но требует постоянной работы рулями или активного автопилота fly-by-wire.';
    } else if (staticMarginPct > 20) {
      status = 'Чрезмерно устойчив (тугое управление)';
      statusColor = 'text-yellow-400';
      recommendation = 'ЦТ слишком сильно сдвинут вперед. Потребуются большие отклонения руля высоты для взлета и посадки, повышенное балансировочное сопротивление.';
    }

    return {
      staticMarginPct,
      staticMarginMeters,
      status,
      statusColor,
      recommendation,
    };
  };

  const stabData = calcStability();

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(label);
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn font-mono">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-cyan-500/40 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/60 border-b border-cyan-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-950/50">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Авиационный Бортовой Компьютер & Инженерный Калькулятор</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  ГОСТ 4401 / ISA
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Высокоточные аэродинамические формулы, стандартная атмосфера, перевод скоростей и анализ устойчивости
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-950 border-b border-slate-800 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('atmosphere')}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'atmosphere'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold shadow-md shadow-cyan-950/50'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
            <span>1. Атмосфера ISA (H = 0...30 км)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('speed_units')}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'speed_units'
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 font-bold shadow-md shadow-indigo-950/50'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-indigo-400" />
            <span>2. Скорости (TAS / EAS / Mach / Knots)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reynolds')}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'reynolds'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 font-bold shadow-md shadow-purple-950/50'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>3. Число Рейнольдса (Re)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('wing_loading')}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'wing_loading'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold shadow-md shadow-amber-950/50'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-amber-400" />
            <span>4. Нагрузка на крыло & Сваливание</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stability')}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'stability'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold shadow-md shadow-emerald-950/50'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>5. Запас Устойчивости (Static Margin)</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: STANDARD ATMOSPHERE ISA */}
          {activeTab === 'atmosphere' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Inputs Left Column */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-cyan-300">Входные Параметры Атмосферы</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAltitudeMeters(0);
                        setDeltaISA(0);
                      }}
                      className="text-[10px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Уровень моря</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Высота над уровнем моря $H$:</span>
                      <strong className="text-cyan-400 font-mono">{altitudeMeters} м ({Math.round(altitudeMeters * 3.28084)} ft)</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30000"
                      step="100"
                      value={altitudeMeters}
                      onChange={(e) => setAltitudeMeters(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>0 м (Sea Level)</span>
                      <span>11 000 м (Тропопауза)</span>
                      <span>30 000 м (Стратосфера)</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Отклонение температуры ΔT_ISA:</span>
                      <strong className="text-cyan-400 font-mono">{deltaISA > 0 ? `+${deltaISA}` : deltaISA} °C</strong>
                    </div>
                    <input
                      type="range"
                      min="-30"
                      max="30"
                      step="1"
                      value={deltaISA}
                      onChange={(e) => setDeltaISA(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  {/* Preset Altitude Pills */}
                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    <span className="text-[11px] text-slate-400 font-sans">Типовые эшелоны и высоты:</span>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setAltitudeMeters(0)}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-left text-[11px] cursor-pointer"
                      >
                        0 м: Уровень моря
                      </button>
                      <button
                        type="button"
                        onClick={() => setAltitudeMeters(1000)}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-left text-[11px] cursor-pointer"
                      >
                        1 000 м: Полеты БПЛА
                      </button>
                      <button
                        type="button"
                        onClick={() => setAltitudeMeters(3000)}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-left text-[11px] cursor-pointer"
                      >
                        3 000 м: Ан-2 / Cessna
                      </button>
                      <button
                        type="button"
                        onClick={() => setAltitudeMeters(10600)}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-left text-[11px] cursor-pointer"
                      >
                        10 600 м: Лайнеры FL350
                      </button>
                    </div>
                  </div>
                </div>

                {/* Output Data Grid Right Columns */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-1">
                    <span className="text-[11px] text-slate-400 font-sans">Температура Воздуха $T$:</span>
                    <div className="text-xl font-bold text-cyan-300">
                      {currentAtm.tempC.toFixed(2)} °C <span className="text-xs text-slate-400 font-normal">({currentAtm.tempK.toFixed(2)} K)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans">
                      Градиент падения в тропосфере: -6.5 °C на 1000 м.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-1">
                    <span className="text-[11px] text-slate-400 font-sans">Плотность Воздуха $\rho$:</span>
                    <div className="text-xl font-bold text-cyan-300">
                      {currentAtm.densityKgM3.toFixed(4)} кг/м³
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans">
                      Относительная плотность $\sigma = {(currentAtm.densityRatioSigma * 100).toFixed(1)}\%$ от уровня моря.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-1">
                    <span className="text-[11px] text-slate-400 font-sans">Статическое Давление $P$:</span>
                    <div className="text-xl font-bold text-cyan-300">
                      {currentAtm.pressureKPa.toFixed(2)} кПа
                    </div>
                    <div className="flex gap-2 text-[10px] text-slate-400 font-mono">
                      <span>{currentAtm.pressureMmHg.toFixed(1)} мм рт. ст.</span>
                      <span>•</span>
                      <span>{currentAtm.pressureInHg.toFixed(2)} inHg</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-1">
                    <span className="text-[11px] text-slate-400 font-sans">Скорость Звука $a$:</span>
                    <div className="text-xl font-bold text-cyan-300">
                      {currentAtm.speedOfSoundMps.toFixed(1)} м/с <span className="text-xs text-slate-400 font-normal">({currentAtm.speedOfSoundKmh.toFixed(1)} км/ч)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans">
                      Зависит исключительно от температуры: a = √(γ · R · T).
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 sm:col-span-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-slate-400 font-sans">Динамическая вязкость воздуха $\mu$ (Закон Сазерленда):</span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(`${currentAtm.densityKgM3.toFixed(4)} kg/m3, ${currentAtm.pressurePa.toFixed(0)} Pa, ${currentAtm.tempC.toFixed(1)} C`, 'ISA Data')}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Скопировать все параметры</span>
                      </button>
                    </div>
                    <div className="text-sm font-bold text-slate-200">
                      {currentAtm.dynamicViscosity.toExponential(4)} Па·с <span className="text-xs text-slate-400 font-normal">(Кинематическая $\nu = {currentAtm.kinematicViscosity.toExponential(4)}$ м²/с)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPEED & AIRSPEED CONVERTER */}
          {activeTab === 'speed_units' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Inputs */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                  <span className="text-xs font-bold text-indigo-300 block border-b border-slate-800 pb-2">
                    Задание Исходной Скорости
                  </span>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300">Значение скорости:</label>
                    <input
                      type="number"
                      min="0.1"
                      step="1"
                      value={inputSpeedVal}
                      onChange={(e) => setInputSpeedVal(Math.max(0.1, Number(e.target.value)))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300">Единица измерения:</label>
                    <select
                      value={inputSpeedUnit}
                      onChange={(e) => setInputSpeedUnit(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs cursor-pointer"
                    >
                      <option value="kmh">Километры в час (км/ч)</option>
                      <option value="mps">Метры в секунду (м/с)</option>
                      <option value="kts">Авиационные узлы (Knots, kts)</option>
                      <option value="mach">Число Маха (Mach, M)</option>
                      <option value="mph">Мили в час (mph)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Высота полета (для плотности):</span>
                      <strong className="text-indigo-400 font-mono">{speedAltitude} м</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20000"
                      step="200"
                      value={speedAltitude}
                      onChange={(e) => setSpeedAltitude(Number(e.target.value))}
                      className="w-full accent-indigo-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Converted Speeds Display */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-1">
                    <span className="text-[11px] text-slate-400 font-sans">Истинная Воздушная Скорость (TAS):</span>
                    <div className="text-xl font-bold text-indigo-300">
                      {convertedSpeeds.tasKmh.toFixed(1)} км/ч
                    </div>
                    <div className="flex justify-between text-xs text-slate-300 font-mono pt-1">
                      <span>{convertedSpeeds.tasMps.toFixed(2)} м/с</span>
                      <span>{convertedSpeeds.tasKts.toFixed(1)} узлов</span>
                      <span>{convertedSpeeds.tasMph.toFixed(1)} mph</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-1">
                    <span className="text-[11px] text-slate-400 font-sans">Число Маха Полета (Mach $M$):</span>
                    <div className="text-xl font-bold text-indigo-300">
                      M = {convertedSpeeds.mach.toFixed(3)}
                    </div>
                    <p className="text-[10px] text-slate-400 font-sans">
                      {convertedSpeeds.mach < 0.3
                        ? 'Несжимаемый дозвук (M < 0.3)'
                        : convertedSpeeds.mach < 0.8
                        ? 'Сжимаемый дозвуковой поток'
                        : convertedSpeeds.mach < 1.2
                        ? 'Трансзвуковой режим (скачки уплотнения)'
                        : 'Сверхзвуковой полет (конус Маха)'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-1">
                    <span className="text-[11px] text-slate-400 font-sans">Эквивалентная Скорость (EAS / CAS):</span>
                    <div className="text-xl font-bold text-indigo-300">
                      {convertedSpeeds.easKmh.toFixed(1)} км/ч <span className="text-xs text-slate-400 font-normal">({convertedSpeeds.easKts.toFixed(1)} kts)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans">
                      Скорость, которую показывает указатель приборной скорости (УС) на высоте.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-1">
                    <span className="text-[11px] text-slate-400 font-sans">Скоростной Напор $q = \frac{1}{2}\rho V^2$:</span>
                    <div className="text-xl font-bold text-indigo-300">
                      {convertedSpeeds.qDynamicPa.toFixed(1)} Па <span className="text-xs text-slate-400 font-normal">({convertedSpeeds.qDynamicKPa.toFixed(3)} кПа)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans">
                      Силовое давление набегающего потока на конструкцию.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REYNOLDS NUMBER CALCULATOR */}
          {activeTab === 'reynolds' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                  <span className="text-xs font-bold text-purple-300 block border-b border-slate-800 pb-2">
                    Входные Величины для $Re$
                  </span>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Скорость потока $V$:</span>
                      <strong className="text-purple-400 font-mono">{reySpeedMps} м/с ({(reySpeedMps * 3.6).toFixed(0)} км/ч)</strong>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="300"
                      step="1"
                      value={reySpeedMps}
                      onChange={(e) => setReySpeedMps(Number(e.target.value))}
                      className="w-full accent-purple-400 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Хорда профиля (САХ) $c$:</span>
                      <strong className="text-purple-400 font-mono">{reyChordMeters.toFixed(3)} м ({(reyChordMeters * 1000).toFixed(0)} мм)</strong>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="6.0"
                      step="0.05"
                      value={reyChordMeters}
                      onChange={(e) => setReyChordMeters(Number(e.target.value))}
                      className="w-full accent-purple-400 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Высота $H$:</span>
                      <strong className="text-purple-400 font-mono">{reyAltitude} м</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15000"
                      step="500"
                      value={reyAltitude}
                      onChange={(e) => setReyAltitude(Number(e.target.value))}
                      className="w-full accent-purple-400 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-3">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400 font-sans">Рассчитанное Число Рейнольдса:</span>
                      <span className="text-xs font-mono text-purple-300">Формула: Re = (ρ · V · c) / μ</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-purple-300 font-mono">
                      Re = {Math.round(reynoldsData.Re).toLocaleString()}
                    </div>
                    <div className={`text-xs font-sans font-bold flex items-center gap-1.5 ${reynoldsData.regimeColor}`}>
                      <Info className="w-4 h-4 shrink-0" />
                      <span>{reynoldsData.regime}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-sans text-slate-300 space-y-1.5">
                    <strong className="text-white">Инженерные рекомендации по выбору профиля крыла:</strong>
                    <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                      <li><strong>Re &lt; 200 000:</strong> Рекомендуются тонкие профили с вогнутой нижней поверхностью (Selig S1223, Eppler E387, Drela AG-series) для предотвращения ламинарного отрыва.</li>
                      <li><strong>Re = 500 000...2 000 000:</strong> Профили NACA 4412, Clark-Y, Wortmann FX 63-137. Высокое качество K_max ≈ 25...35.</li>
                      <li><strong>Re &gt; 5 000 000:</strong> Сверхкритические профили NASA SC(2), профили NACA 6-й серии с ламинарным обтеканием носка.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: WING LOADING & STALL SPEED */}
          {activeTab === 'wing_loading' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                  <span className="text-xs font-bold text-amber-300 block border-b border-slate-800 pb-2">
                    Масса и Геометрия Планера
                  </span>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Взлетная масса $MTOW$:</span>
                      <strong className="text-amber-400 font-mono">{planeMassKg} кг</strong>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="150"
                      step="0.5"
                      value={planeMassKg}
                      onChange={(e) => setPlaneMassKg(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Площадь крыла $S$:</span>
                      <strong className="text-amber-400 font-mono">{wingAreaM2.toFixed(2)} м²</strong>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="10.0"
                      step="0.05"
                      value={wingAreaM2}
                      onChange={(e) => setWingAreaM2(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Макс. подъемная сила C_L_max:</span>
                      <strong className="text-amber-400 font-mono">{clMaxStall.toFixed(2)}</strong>
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="2.6"
                      step="0.05"
                      value={clMaxStall}
                      onChange={(e) => setClMaxStall(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>0.9 (Гладкое)</span>
                      <span>1.5 (Закрылки)</span>
                      <span>2.4 (Фаулер + Предкрылок)</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Статическая тяга ВМГ T:</span>
                      <strong className="text-amber-400 font-mono">{thrustNewtons} Н ({((thrustNewtons / 9.81)).toFixed(1)} кгс)</strong>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="1500"
                      step="5"
                      value={thrustNewtons}
                      onChange={(e) => setThrustNewtons(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-1">
                    <span className="text-[11px] text-slate-400 font-sans">Удельная нагрузка на крыло (W/S):</span>
                    <div className="text-xl font-bold text-amber-300">
                      {wingData.wingLoadingKgM2.toFixed(1)} кг/м² <span className="text-xs text-slate-400 font-normal">({wingData.wingLoadingNm2.toFixed(0)} Па)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans">
                      {wingData.wingLoadingKgM2 < 15
                        ? 'Парящий планер / Легкий БПЛА (малая скорость)'
                        : wingData.wingLoadingKgM2 < 60
                        ? 'Средний самолет / Тяжелый БПЛА'
                        : 'Скоростной самолет (требует высокой скорости захода)'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-1">
                    <span className="text-[11px] text-slate-400 font-sans">Скорость сваливания (V_stall):</span>
                    <div className="text-xl font-bold text-rose-300">
                      {wingData.vStallKmh.toFixed(1)} км/ч <span className="text-xs text-slate-400 font-normal">({wingData.vStallMps.toFixed(1)} м/с)</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Безопасная скорость захода на посадку V_app = 1.3 · V_stall ≈ {wingData.vAppKmh.toFixed(1)} км/ч.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-1">
                    <span className="text-[11px] text-slate-400 font-sans">Тяговооруженность (T/W):</span>
                    <div className={`text-xl font-bold ${wingData.twRatio >= 1 ? 'text-emerald-300' : 'text-amber-300'}`}>
                      T/W = {wingData.twRatio.toFixed(2)}
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans">
                      {wingData.twRatio >= 1.0 ? 'Вертикальный набор высоты возможен (3D пилотаж / Ракета)' : wingData.twRatio > 0.35 ? 'Уверенный набор высоты и маневр' : 'Минимальная тяга для горизонтального полета'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-1">
                    <span className="text-[11px] text-slate-400 font-sans">Оценочная длина разбега ВПП (L_roll):</span>
                    <div className="text-xl font-bold text-amber-300">
                      ≈ {wingData.groundRollM.toFixed(1)} м
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans">
                      При коэффициенте трения колес о грунт μ = 0.04.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: STATIC MARGIN & STABILITY */}
          {activeTab === 'stability' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                  <span className="text-xs font-bold text-emerald-300 block border-b border-slate-800 pb-2">
                    Центровка и Фокус (X_CG и X_F)
                  </span>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Положение Центра Тяжести X_CG:</span>
                      <strong className="text-emerald-400 font-mono">{cgPositionPct}% САХ</strong>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="45"
                      step="1"
                      value={cgPositionPct}
                      onChange={(e) => setCgPositionPct(Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Нейтральная точка (фокус) X_F:</span>
                      <strong className="text-cyan-400 font-mono">{npPositionPct}% САХ</strong>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="45"
                      step="1"
                      value={npPositionPct}
                      onChange={(e) => setNpPositionPct(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Длина хорды САХ b_MAC:</span>
                      <strong className="text-slate-200 font-mono">{macLengthMeters} м</strong>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="2.0"
                      step="0.02"
                      value={macLengthMeters}
                      onChange={(e) => setMacLengthMeters(Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-3">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400 font-sans">Запас статической устойчивости (SM):</span>
                      <span className="text-xs font-mono text-emerald-300">
                        Формула: SM = (X_F - X_CG) / b_MAC · 100%
                      </span>
                    </div>
                    <div className={`text-2xl sm:text-3xl font-black font-mono ${stabData.statusColor}`}>
                      SM = {stabData.staticMarginPct > 0 ? `+${stabData.staticMarginPct}` : stabData.staticMarginPct}% ({Math.round(stabData.staticMarginMeters * 1000)} мм)
                    </div>
                    <div className={`text-xs font-sans font-bold flex items-start gap-2 ${stabData.statusColor}`}>
                      {stabData.staticMarginPct < 0 ? (
                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div>{stabData.status}</div>
                        <div className="font-normal text-slate-400 mt-0.5">{stabData.recommendation}</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-sans text-slate-300">
                    <strong className="text-white">Физический смысл продольной статической устойчивости:</strong>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      При случайном порыве ветра вверх (увеличение Δα) на крыле возникает дополнительная подъемная сила в точке фокуса X_F. Если фокус лежит <strong>позади</strong> центра тяжести (X_F &gt; X_CG), эта сила создает пикирующий восстанавливающий момент (C_m_α &lt; 0), возвращающий самолет в исходное положение без вмешательства летчика.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-950 border-t border-slate-800 text-xs">
          <div className="text-[11px] text-slate-400 font-sans flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Все расчеты соответствуют стандартам ГОСТ 4401-81, ICAO Doc 7488 и теории устойчивости Н.Е. Жуковского.</span>
          </div>

          {copiedNotification && (
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold animate-fadeIn">
              ✓ {copiedNotification} скопировано в буфер
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
