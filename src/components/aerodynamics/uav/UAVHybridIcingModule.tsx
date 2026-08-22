// ============================================================================
// UAV Advanced Systems: Hybrid ICE Powertrain, In-Flight Icing & Ducted Fans
// State-of-the-art Hybrid Range Extender, Supercooled Droplet Icing & EDF Shroud Aerodynamics
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Flame,
  Zap,
  Battery,
  Wind,
  Layers,
  Thermometer,
  Shield,
  Activity,
  Compass,
  Gauge,
  Sliders,
  Sparkles,
  Info,
  Clock,
  TrendingUp,
  Disc,
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
  BarChart,
  Bar,
} from 'recharts';

export type HybridSubTab = 'hybrid_ice' | 'icing_antiice' | 'ducted_fans';

export const UAVHybridIcingModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HybridSubTab>('hybrid_ice');

  // =========================================================================
  // 1. HYBRID ICE POWERTRAIN STATE
  // =========================================================================
  const [icePowerKw, setIcePowerKw] = useState<number>(3.5); // 3.5 kW ICE
  const [genEfficiency, setGenEfficiency] = useState<number>(0.92); // 92% generator
  const [fuelCapacityLiters, setFuelCapacityLiters] = useState<number>(8.0); // 8 L fuel tank
  const [bsfcGramsPerKwh, setBsfcGramsPerKwh] = useState<number>(380); // 380 g/kWh
  const [bufferBatteryWh, setBufferBatteryWh] = useState<number>(600); // 600 Wh LiPo buffer
  const [cruisePowerDemandWatts, setCruisePowerDemandWatts] = useState<number>(1800); // 1.8 kW cruise power
  const [climbPowerDemandWatts, setClimbPowerDemandWatts] = useState<number>(3200); // 3.2 kW climb power
  const [uavAirspeedKmh, setUavAirspeedKmh] = useState<number>(95); // 95 km/h cruise

  // =========================================================================
  // 2. IN-FLIGHT ICING & ANTI-ICE STATE
  // =========================================================================
  const [ambientTempC, setAmbientTempC] = useState<number>(-8.0); // -8 °C
  const [liquidWaterContentLwc, setLiquidWaterContentLwc] = useState<number>(0.45); // 0.45 g/m³
  const [dropletMvdUm, setDropletMvdUm] = useState<number>(25); // 25 microns MVD
  const [flightAirspeedMs, setFlightAirspeedMs] = useState<number>(28); // 28 m/s airspeed
  const [wingSpanM, setWingSpanM] = useState<number>(2.4); // 2.4 m wing
  const [wingChordM, setWingChordM] = useState<number>(0.28); // 0.28 m chord
  const [antiIceHeaterActive, setAntiIceHeaterActive] = useState<boolean>(false);

  // =========================================================================
  // 3. DUCTED FAN / EDF AERODYNAMICS STATE
  // =========================================================================
  const [fanDiameterMm, setFanDiameterMm] = useState<number>(120); // 120 mm EDF
  const [rotorRpm, setRotorRpm] = useState<number>(28000); // 28k RPM
  const [ductLipRadiusRatio, setDuctLipRadiusRatio] = useState<number>(0.12); // r_lip / D
  const [diffuserAreaRatio, setDiffuserAreaRatio] = useState<number>(1.08); // A_exit / A_throat

  // =========================================================================
  // CALCULATIONS: 1. HYBRID POWERTRAIN
  // =========================================================================
  const hybridCalculations = useMemo(() => {
    const fuelDensityKgPerL = 0.74; // Petrol density
    const totalFuelMassKg = fuelCapacityLiters * fuelDensityKgPerL;
    const electricalPowerGeneratedWatts = icePowerKw * 1000 * genEfficiency;

    // Power balance in cruise
    const netCruisePowerWatts = electricalPowerGeneratedWatts - cruisePowerDemandWatts;
    const isChargingBufferInCruise = netCruisePowerWatts >= 0;

    // Fuel consumption rate
    // ICE actual electrical output in kW
    const fuelFlowKgPerHour = (icePowerKw * bsfcGramsPerKwh) / 1000;
    const fuelFlowLitersPerHour = fuelFlowKgPerHour / fuelDensityKgPerL;

    // Endurance in hours
    const enduranceHours = fuelCapacityLiters / Math.max(0.01, fuelFlowLitersPerHour);
    const rangeKm = enduranceHours * uavAirspeedKmh;

    // Compare with pure electric battery equivalent (220 Wh/kg)
    const pureElectricEquivalentMassKg = (cruisePowerDemandWatts * enduranceHours) / 220;

    // Time-series simulation data
    const timeProfile = [];
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = (enduranceHours / steps) * i;
      const remFuelKg = Math.max(0, totalFuelMassKg - fuelFlowKgPerHour * t);
      const remEnergyWh = (remFuelKg / fuelDensityKgPerL) * (icePowerKw / fuelFlowLitersPerHour) * 1000;
      timeProfile.push({
        timeHours: parseFloat(t.toFixed(1)),
        remainingFuelKg: parseFloat(remFuelKg.toFixed(2)),
        distanceKm: Math.round(t * uavAirspeedKmh),
      });
    }

    return {
      totalFuelMassKg,
      electricalPowerGeneratedWatts,
      netCruisePowerWatts,
      isChargingBufferInCruise,
      fuelFlowLitersPerHour,
      enduranceHours,
      rangeKm,
      pureElectricEquivalentMassKg,
      timeProfile,
    };
  }, [icePowerKw, genEfficiency, fuelCapacityLiters, bsfcGramsPerKwh, cruisePowerDemandWatts, uavAirspeedKmh]);

  // =========================================================================
  // CALCULATIONS: 2. ICING & ANTI-ICE
  // =========================================================================
  const icingCalculations = useMemo(() => {
    // Air density
    const rhoAir = 1.225;
    // Collection efficiency beta based on MVD and chord
    const kInertia = (rhoAir * (dropletMvdUm * 1e-6) ** 2 * flightAirspeedMs) / (18 * 1.8e-5 * wingChordM);
    const collectionEfficiencyBeta = Math.min(0.85, Math.max(0.05, 0.45 * Math.log10(kInertia + 1.2)));

    // Water catch rate per meter of span (g / (m * s))
    const projectedFrontalHeightM = wingChordM * 0.12; // 12% thickness profile
    const waterCatchRateGramsPerSecPerMeter =
      collectionEfficiencyBeta * liquidWaterContentLwc * flightAirspeedMs * projectedFrontalHeightM;

    // Total ice accumulation rate for the whole wing in kg/h
    const iceAccRateKgPerHour = (waterCatchRateGramsPerSecPerMeter * wingSpanM * 3600) / 1000;

    // Aerodynamic degradation without anti-ice
    // After 15 minutes of icing:
    const iceThicknessMm = (iceAccRateKgPerHour * 0.25 * 1000) / (917 * (wingSpanM * projectedFrontalHeightM));
    const clMaxDropPercent = Math.min(45, iceThicknessMm * 6.5);
    const cdIncreasePercent = Math.min(180, iceThicknessMm * 28.0);

    // Required Anti-Ice thermal power (evaporation + sensible heat)
    // q = h_c * (T_surf - T_amb) + m_dot * L_v
    const surfaceAreaToHeatM2 = wingSpanM * (wingChordM * 0.15); // Leading 15% heated
    const requiredHeatWattsPerDm2 = antiIceHeaterActive ? 0 : Math.max(12, 18 + Math.abs(ambientTempC) * 1.4 + liquidWaterContentLwc * 22);
    const totalAntiIcePowerWatts = requiredHeatWattsPerDm2 * (surfaceAreaToHeatM2 * 100);

    return {
      collectionEfficiencyBeta,
      waterCatchRateGramsPerSecPerMeter,
      iceAccRateKgPerHour,
      iceThicknessMm,
      clMaxDropPercent,
      cdIncreasePercent,
      requiredHeatWattsPerDm2,
      totalAntiIcePowerWatts,
    };
  }, [ambientTempC, liquidWaterContentLwc, dropletMvdUm, flightAirspeedMs, wingSpanM, wingChordM, antiIceHeaterActive]);

  // =========================================================================
  // CALCULATIONS: 3. DUCTED FAN / EDF
  // =========================================================================
  const ductedFanCalculations = useMemo(() => {
    const areaM2 = Math.PI * (fanDiameterMm / 2000) ** 2;
    const airDensity = 1.225;
    const tipSpeedMs = ((rotorRpm / 60) * Math.PI * fanDiameterMm) / 1000;

    // Open propeller baseline static thrust
    const openThrustN = 0.5 * airDensity * areaM2 * (tipSpeedMs * 0.22) ** 2;

    // Ducted fan thrust multiplier due to lip suction and shroud
    const lipSuctionMultiplier = 1.0 + Math.min(0.22, ductLipRadiusRatio * 1.4);
    const diffuserMultiplier = Math.min(1.12, Math.sqrt(diffuserAreaRatio));
    const totalDuctedThrustMultiplier = lipSuctionMultiplier * diffuserMultiplier;

    const ductedThrustN = openThrustN * totalDuctedThrustMultiplier;
    const thrustGainPercent = ((ductedThrustN - openThrustN) / openThrustN) * 100;

    // Electric power required
    const shaftPowerWatts = (ductedThrustN ** 1.5) / (Math.sqrt(2 * airDensity * areaM2) * 0.72);

    return {
      areaM2,
      tipSpeedMs,
      openThrustN,
      ductedThrustN,
      thrustGainPercent,
      shaftPowerWatts,
      lipSuctionMultiplier,
    };
  }, [fanDiameterMm, rotorRpm, ductLipRadiusRatio, diffuserAreaRatio]);

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-teal-950/80 via-slate-900 to-indigo-950/80 border border-teal-500/40 shadow-2xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-teal-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>Передовые Системы БПЛА: Гибридная СУ, Обледенение & Импеллеры</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Advanced Avionics & Aero
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Генераторные установки Range Extender, физика нароста льда в облаках и аэродинамика кольцевых импеллеров
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('hybrid_ice')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'hybrid_ice'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-lg ring-1 ring-amber-400'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>1. Гибридная Бензо-Электро СУ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('icing_antiice')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'icing_antiice'
                ? 'bg-gradient-to-r from-cyan-400 to-teal-500 text-slate-950 font-black shadow-lg ring-1 ring-cyan-400'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5" />
            <span>2. Высотное Обледенение & Обогрев</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ducted_fans')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'ducted_fans'
                ? 'bg-gradient-to-r from-indigo-400 to-purple-500 text-white font-black shadow-lg ring-1 ring-indigo-400'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            <span>3. Кольцевые Импеллеры (EDF)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. HYBRID ICE POWERTRAIN TAB                                              */}
      {/* ========================================================================= */}
      {activeTab === 'hybrid_ice' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Параметры ДВС-Генератора & Бака</span>
              </h3>

              {/* ICE Power Slider */}
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Мощность ДВС (P_ICE):</span>
                  <span className="text-amber-400 font-bold">{icePowerKw.toFixed(1)} кВт ({(icePowerKw * 1.36).toFixed(1)} л.с.)</span>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={15.0}
                  step={0.5}
                  value={icePowerKw}
                  onChange={(e) => setIcePowerKw(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Fuel Tank Capacity */}
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Запас бензина в баке (V_fuel):</span>
                  <span className="text-cyan-400 font-bold">{fuelCapacityLiters.toFixed(1)} л ({hybridCalculations.totalFuelMassKg.toFixed(2)} кг)</span>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={30.0}
                  step={0.5}
                  value={fuelCapacityLiters}
                  onChange={(e) => setFuelCapacityLiters(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* BSFC */}
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Удельный расход топлива (BSFC):</span>
                  <span className="text-rose-400 font-bold">{bsfcGramsPerKwh} г/(кВт·ч)</span>
                </div>
                <input
                  type="range"
                  min={280}
                  max={550}
                  step={10}
                  value={bsfcGramsPerKwh}
                  onChange={(e) => setBsfcGramsPerKwh(parseInt(e.target.value))}
                  className="w-full accent-rose-400 cursor-pointer"
                />
              </div>

              {/* Cruise Power Demand */}
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Потребная мощность крейсера:</span>
                  <span className="text-emerald-400 font-bold">{cruisePowerDemandWatts} Вт ({(cruisePowerDemandWatts / 1000).toFixed(2)} кВт)</span>
                </div>
                <input
                  type="range"
                  min={500}
                  max={8000}
                  step={100}
                  value={cruisePowerDemandWatts}
                  onChange={(e) => setCruisePowerDemandWatts(parseInt(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              {/* Speed */}
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Крейсерская скорость БПЛА:</span>
                  <span className="text-purple-400 font-bold">{uavAirspeedKmh} км/ч ({(uavAirspeedKmh / 3.6).toFixed(1)} м/с)</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={180}
                  step={5}
                  value={uavAirspeedKmh}
                  onChange={(e) => setUavAirspeedKmh(parseInt(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Visualization (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Профиль Выработки Топлива & Дальности Полета</span>
              </h3>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hybridCalculations.timeProfile} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="timeHours" stroke="#64748b" tick={{ fontSize: 11 }} unit=" ч" />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }} />
                    <Area type="monotone" dataKey="remainingFuelKg" name="Остаток Топлива (кг)" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Время полета:</span>
                  <span className="text-emerald-400 font-black text-base">{hybridCalculations.enduranceHours.toFixed(1)} ч</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Дальность полета:</span>
                  <span className="text-cyan-400 font-black text-base">{Math.round(hybridCalculations.rangeKm)} км</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Расход топлива:</span>
                  <span className="text-amber-400 font-bold">{hybridCalculations.fuelFlowLitersPerHour.toFixed(2)} л/ч</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Эквивалент АКБ:</span>
                  <span className="text-purple-400 font-bold">{hybridCalculations.pureElectricEquivalentMassKg.toFixed(1)} кг</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ICING & ANTI-ICE TAB                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'icing_antiice' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Метеоусловия в Облачности & Геометрия Крыла</span>
              </h3>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Температура воздуха (T_amb):</span>
                  <span className="text-cyan-400 font-bold">{ambientTempC.toFixed(1)} °C</span>
                </div>
                <input
                  type="range"
                  min={-25.0}
                  max={2.0}
                  step={0.5}
                  value={ambientTempC}
                  onChange={(e) => setAmbientTempC(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Водность облака (LWC):</span>
                  <span className="text-teal-400 font-bold">{liquidWaterContentLwc.toFixed(2)} г/м³</span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={1.5}
                  step={0.05}
                  value={liquidWaterContentLwc}
                  onChange={(e) => setLiquidWaterContentLwc(parseFloat(e.target.value))}
                  className="w-full accent-teal-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Диаметр капель (MVD):</span>
                  <span className="text-blue-400 font-bold">{dropletMvdUm} мкм</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={50}
                  step={1}
                  value={dropletMvdUm}
                  onChange={(e) => setDropletMvdUm(parseInt(e.target.value))}
                  className="w-full accent-blue-400 cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs text-white font-bold block">Электрообогрев Кромок (Anti-Ice)</span>
                  <span className="text-[10px] text-slate-400 block">
                    Предотвращает образование ледяного барьера
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={antiIceHeaterActive}
                  onChange={(e) => setAntiIceHeaterActive(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>Деградация Аэродинамики & Потребная Мощность Обогрева</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-500 block text-[10px]">Падение CL_max:</span>
                  <div className="text-2xl font-black text-rose-400">
                    -{antiIceHeaterActive ? 0 : icingCalculations.clMaxDropPercent.toFixed(1)}%
                  </div>
                  <span className="text-[10px] text-slate-400">Снижение потолка и подъемной силы</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-500 block text-[10px]">Рост сопротивления CD:</span>
                  <div className="text-2xl font-black text-amber-400">
                    +{antiIceHeaterActive ? 0 : icingCalculations.cdIncreasePercent.toFixed(1)}%
                  </div>
                  <span className="text-[10px] text-slate-400">Перегрузка моторов и расход батареи</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-500 block text-[10px]">Скорость намерзания:</span>
                  <div className="text-xl font-bold text-cyan-300">
                    {icingCalculations.iceAccRateKgPerHour.toFixed(2)} кг/ч
                  </div>
                  <span className="text-[10px] text-slate-400">Масса льда на передней кромке</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-500 block text-[10px]">Мощность нагревателей:</span>
                  <div className="text-xl font-bold text-emerald-400">
                    {Math.round(icingCalculations.totalAntiIcePowerWatts)} Вт
                  </div>
                  <span className="text-[10px] text-slate-400">({icingCalculations.requiredHeatWattsPerDm2.toFixed(1)} Вт/дм²)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DUCTED FANS / EDF TAB                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'ducted_fans' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Геометрия Кольца & Обороты Ротора</span>
              </h3>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Диаметр импеллера (D):</span>
                  <span className="text-indigo-400 font-bold">{fanDiameterMm} мм</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={250}
                  step={5}
                  value={fanDiameterMm}
                  onChange={(e) => setFanDiameterMm(parseInt(e.target.value))}
                  className="w-full accent-indigo-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Обороты ротора:</span>
                  <span className="text-purple-400 font-bold">{rotorRpm} RPM</span>
                </div>
                <input
                  type="range"
                  min={10000}
                  max={45000}
                  step={1000}
                  value={rotorRpm}
                  onChange={(e) => setRotorRpm(parseInt(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Радиус губы воздухозаборника (r_lip / D):</span>
                  <span className="text-teal-400 font-bold">{ductLipRadiusRatio.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.02}
                  max={0.25}
                  step={0.01}
                  value={ductLipRadiusRatio}
                  onChange={(e) => setDuctLipRadiusRatio(parseFloat(e.target.value))}
                  className="w-full accent-teal-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <Disc className="w-4 h-4 text-indigo-400" />
                <span>Эффект Экрана Кольца (Lip Suction) & Сравнение с Открытым Винтом</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-500 block text-[10px]">Тяга в кольце (EDF):</span>
                  <div className="text-2xl font-black text-indigo-400">
                    {ductedFanCalculations.ductedThrustN.toFixed(1)} Н
                  </div>
                  <span className="text-[10px] text-slate-400">({(ductedFanCalculations.ductedThrustN / 9.81 * 1000).toFixed(0)} г)</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-500 block text-[10px]">Тяга открытого винта:</span>
                  <div className="text-2xl font-black text-slate-400">
                    {ductedFanCalculations.openThrustN.toFixed(1)} Н
                  </div>
                  <span className="text-[10px] text-slate-400">({(ductedFanCalculations.openThrustN / 9.81 * 1000).toFixed(0)} г)</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-500 block text-[10px]">Прирост тяги от кольца:</span>
                  <div className="text-2xl font-black text-emerald-400">
                    +{ductedFanCalculations.thrustGainPercent.toFixed(1)}%
                  </div>
                  <span className="text-[10px] text-slate-400">За счет всасывания на губе</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
