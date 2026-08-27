import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Compass,
  Play,
  Pause,
  RotateCcw,
  Navigation,
  Battery,
  Zap,
  Activity,
  Layers,
  Flame,
  Radio,
  Clock,
  MapPin,
  TrendingUp,
  Wind,
  ShieldAlert,
  Download,
  Copy,
  Check,
  Cpu,
  Plus,
  Trash2,
  Sliders,
  Settings,
  Tv,
  Eye,
  Crosshair,
  Gauge
} from 'lucide-react';
import { DigitalTwinBusState } from './UAVDigitalTwinHub';

export interface MissionWaypoint {
  id: string;
  name: string;
  type: 'takeoff' | 'climb' | 'cruise' | 'loiter' | 'dash_ew' | 'descent' | 'landing';
  distance_km: number;
  altitude_m: number;
  targetSpeed_kmh: number;
  windSpeed_ms: number;
  windDirection_deg: number; // 0 = headwind, 180 = tailwind
  ewJammingActive: boolean;
  duration_min?: number;
}

interface UAVHILMissionSimulatorProps {
  busState: DigitalTwinBusState;
}

export const UAVHILMissionSimulator: React.FC<UAVHILMissionSimulatorProps> = ({
  busState,
}) => {
  // Simulator State
  const [isPlaying, setIsPlaying] = useState(false);
  const [simSpeed, setSimSpeed] = useState<1 | 2 | 5 | 10>(2);
  const [currentProgressPct, setCurrentProgressPct] = useState(0);
  const [activeTab, setActiveTab] = useState<'profile' | 'hil_stream' | 'energy_audit'>('profile');
  const [selectedWaypointId, setSelectedWaypointId] = useState<string>('wp-1');

  // Hardware in the Loop (HIL) MAVLink Stream Mock State
  const [hilSerialPort, setHilSerialPort] = useState('/dev/ttyACM0 (115200 baud)');
  const [hilProtocol, setHilProtocol] = useState<'mavlink_v2' | 'msp_v2' | 'dronecan'>('mavlink_v2');
  const [hilConnected, setHilConnected] = useState(true);
  const [mavlinkLog, setMavlinkLog] = useState<string[]>([]);

  // Default Mission Flight Plan
  const [waypoints, setWaypoints] = useState<MissionWaypoint[]>([
    {
      id: 'wp-1',
      name: 'Взлет & Разгон',
      type: 'takeoff',
      distance_km: 1.5,
      altitude_m: 100,
      targetSpeed_kmh: Math.round(busState.v_stall_kmh * 1.25),
      windSpeed_ms: 3,
      windDirection_deg: 0,
      ewJammingActive: false,
    },
    {
      id: 'wp-2',
      name: 'Набор Высоты',
      type: 'climb',
      distance_km: 6.0,
      altitude_m: 800,
      targetSpeed_kmh: Math.round(busState.cruiseSpeed_kmh * 0.9),
      windSpeed_ms: 6,
      windDirection_deg: 45,
      ewJammingActive: false,
    },
    {
      id: 'wp-3',
      name: 'Крейсерский Транзит',
      type: 'cruise',
      distance_km: 25.0,
      altitude_m: 800,
      targetSpeed_kmh: busState.cruiseSpeed_kmh,
      windSpeed_ms: 7,
      windDirection_deg: 30,
      ewJammingActive: false,
    },
    {
      id: 'wp-4',
      name: 'РЭБ Спринт (Зона помех)',
      type: 'dash_ew',
      distance_km: 8.0,
      altitude_m: 450,
      targetSpeed_kmh: Math.round(busState.cruiseSpeed_kmh * 1.35),
      windSpeed_ms: 5,
      windDirection_deg: 90,
      ewJammingActive: true,
    },
    {
      id: 'wp-5',
      name: 'Барражирование / Разведка',
      type: 'loiter',
      distance_km: 12.0,
      altitude_m: 600,
      targetSpeed_kmh: Math.round(busState.cruiseSpeed_kmh * 0.85),
      windSpeed_ms: 4,
      windDirection_deg: 0,
      ewJammingActive: true,
      duration_min: 15,
    },
    {
      id: 'wp-6',
      name: 'Возврат & Снижение',
      type: 'descent',
      distance_km: 22.0,
      altitude_m: 150,
      targetSpeed_kmh: busState.cruiseSpeed_kmh,
      windSpeed_ms: 6,
      windDirection_deg: 180,
      ewJammingActive: false,
    },
    {
      id: 'wp-7',
      name: 'Заход & Посадка',
      type: 'landing',
      distance_km: 1.5,
      altitude_m: 0,
      targetSpeed_kmh: Math.round(busState.v_stall_kmh * 1.15),
      windSpeed_ms: 2,
      windDirection_deg: 0,
      ewJammingActive: false,
    },
  ]);

  // Total Mission Statistics Calculation
  const missionSummary = useMemo(() => {
    let totalDist_km = 0;
    let totalEnergy_Wh = 0;
    let totalTime_min = 0;

    const nominalVoltage = busState.batteryCells * 3.7;
    const totalBatteryEnergy_Wh = (busState.batteryCap_mAh / 1000) * nominalVoltage;

    const segmentProfiles = waypoints.map((wp) => {
      // Aerodynamic thrust & power for segment
      const speed_ms = wp.targetSpeed_kmh / 3.6;
      const q = 0.5 * 1.225 * Math.pow(speed_ms, 2);
      const drag_N = q * busState.wingArea_m2 * busState.cd_total;
      
      let climbPower_W = 0;
      let duration_s = 0;

      if (wp.type === 'climb') {
        const climbRate_ms = 4.5;
        climbPower_W = (busState.totalMass_kg * 9.81 * climbRate_ms) / 0.75;
        duration_s = (wp.distance_km * 1000) / Math.max(10, speed_ms);
      } else if (wp.type === 'dash_ew') {
        duration_s = (wp.distance_km * 1000) / Math.max(10, speed_ms);
      } else if (wp.type === 'loiter') {
        duration_s = (wp.duration_min || 10) * 60;
      } else {
        duration_s = (wp.distance_km * 1000) / Math.max(10, speed_ms);
      }

      // Propulsive Electrical Power Requirement
      const aeroPower_W = (drag_N * speed_ms) / 0.65 + climbPower_W;
      const avionicsPower_W = 25 + (wp.ewJammingActive ? 40 : 0); // Video TX + Jammer Resistance
      const totalSegPower_W = aeroPower_W + avionicsPower_W;

      const segCurrent_A = totalSegPower_W / nominalVoltage;
      const segTime_min = duration_s / 60;
      const segEnergy_Wh = (totalSegPower_W * duration_s) / 3600;

      totalDist_km += wp.distance_km;
      totalEnergy_Wh += segEnergy_Wh;
      totalTime_min += segTime_min;

      return {
        ...wp,
        duration_min: segTime_min,
        power_W: totalSegPower_W,
        current_A: segCurrent_A,
        energy_Wh: segEnergy_Wh,
      };
    });

    const batteryRemPct = Math.max(0, 100 - (totalEnergy_Wh / Math.max(1, totalBatteryEnergy_Wh)) * 100);

    return {
      totalDist_km,
      totalEnergy_Wh,
      totalBatteryEnergy_Wh,
      totalTime_min,
      batteryRemPct,
      segmentProfiles,
      isFeasible: batteryRemPct >= 15,
    };
  }, [waypoints, busState]);

  // Animation Loop for HIL Simulation
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentProgressPct((prev) => {
        if (prev >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return prev + 0.3 * simSpeed;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, simSpeed]);

  // Current Instantaneous Mission Status based on progress %
  const currentSimStatus = useMemo(() => {
    const totalDist = missionSummary.totalDist_km;
    const currentDist_km = (currentProgressPct / 100) * totalDist;

    let accumDist = 0;
    let activeSeg = missionSummary.segmentProfiles[0];

    for (const seg of missionSummary.segmentProfiles) {
      if (currentDist_km <= accumDist + seg.distance_km) {
        activeSeg = seg;
        break;
      }
      accumDist += seg.distance_km;
    }

    const spentEnergy_Wh = (currentProgressPct / 100) * missionSummary.totalEnergy_Wh;
    const currentBattPct = Math.max(0, 100 - (spentEnergy_Wh / Math.max(1, missionSummary.totalBatteryEnergy_Wh)) * 100);
    const instantaneousVoltage = (busState.batteryCells * (3.5 + (currentBattPct / 100) * 0.7)).toFixed(2);

    return {
      currentDist_km,
      activeSeg,
      currentBattPct,
      instantaneousVoltage,
      currentAltitude_m: activeSeg.altitude_m,
      currentSpeed_kmh: activeSeg.targetSpeed_kmh,
      currentPower_W: activeSeg.power_W,
      currentCurrent_A: activeSeg.current_A,
    };
  }, [currentProgressPct, missionSummary, busState]);

  // Generate Simulated Realtime MAVLink Heartbeat Packets
  useEffect(() => {
    if (!isPlaying) return;

    const msg = `[MAVLINK] #SYS_STATUS: V_BAT=${currentSimStatus.instantaneousVoltage}V, CURR=${currentSimStatus.currentCurrent_A.toFixed(1)}A | #ATTITUDE: ROLL=${(Math.sin(currentProgressPct * 0.2) * 12).toFixed(1)}°, PITCH=${(activeSegPitch(currentSimStatus.activeSeg.type)).toFixed(1)}° | #ALT=${currentSimStatus.currentAltitude_m.toFixed(0)}m, GS=${currentSimStatus.currentSpeed_kmh}km/h`;
    
    setMavlinkLog((prev) => [msg, ...prev.slice(0, 15)]);
  }, [currentProgressPct, isPlaying, currentSimStatus]);

  function activeSegPitch(type: string): number {
    if (type === 'climb') return 8.5;
    if (type === 'takeoff') return 12.0;
    if (type === 'descent' || type === 'landing') return -4.5;
    return 1.2;
  }

  return (
    <div className="bg-slate-900/90 border border-teal-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-md space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 rounded-xl text-emerald-400">
            <Navigation className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                HIL-Симулятор & Генератор Профиля Миссии (Hardware-in-the-Loop)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                HIL STREAMING ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Моделирование расхода энергии на маршруте, эмуляция полетного плана и стриминг телеметрии MAVLink в реальный автопилот
            </p>
          </div>
        </div>

        {/* Simulation Playback Controls */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Пауза' : 'Пуск HIL'}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentProgressPct(0);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
            title="Сброс симуляции"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 pl-1 border-l border-slate-800">
            <span>x{simSpeed}</span>
            <button
              onClick={() => setSimSpeed(simSpeed === 1 ? 2 : simSpeed === 2 ? 5 : simSpeed === 5 ? 10 : 1)}
              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-teal-300 font-bold"
            >
              Скор.
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-2.5 px-3 font-semibold transition-all flex items-center gap-1.5 border-b-2 ${
            activeTab === 'profile'
              ? 'border-teal-500 text-teal-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Профиль Высоты & Энергии
        </button>
        <button
          onClick={() => setActiveTab('hil_stream')}
          className={`pb-2.5 px-3 font-semibold transition-all flex items-center gap-1.5 border-b-2 ${
            activeTab === 'hil_stream'
              ? 'border-teal-500 text-teal-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Tv className="w-4 h-4 text-cyan-400" />
          HIL MAVLink Телеметрия
        </button>
        <button
          onClick={() => setActiveTab('energy_audit')}
          className={`pb-2.5 px-3 font-semibold transition-all flex items-center gap-1.5 border-b-2 ${
            activeTab === 'energy_audit'
              ? 'border-teal-500 text-teal-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Battery className="w-4 h-4 text-emerald-400" />
          Энергобаланс Миссии
        </button>
      </div>

      {/* LIVE FLIGHT TELEMETRY HUD BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono">
        <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-500 block">ТЕКУЩАЯ ТОЧКА</span>
          <span className="text-teal-400 font-bold truncate block">{currentSimStatus.activeSeg.name}</span>
        </div>
        <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-500 block">ВЫСОТА (ALT)</span>
          <span className="text-cyan-300 font-bold">{currentSimStatus.currentAltitude_m.toFixed(0)} м</span>
        </div>
        <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-500 block">СКОРОСТЬ (IAS)</span>
          <span className="text-emerald-300 font-bold">{currentSimStatus.currentSpeed_kmh} км/ч</span>
        </div>
        <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-500 block">ТОК & МОЩНОСТЬ</span>
          <span className="text-amber-300 font-bold">{currentSimStatus.currentCurrent_A.toFixed(1)}A / {currentSimStatus.currentPower_W.toFixed(0)}W</span>
        </div>
        <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-500 block">БАТАРЕЯ (SOC)</span>
          <span className={`font-bold ${currentSimStatus.currentBattPct > 25 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {currentSimStatus.currentBattPct.toFixed(1)}% ({currentSimStatus.instantaneousVoltage}V)
          </span>
        </div>
        <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-500 block">ПРОЙДЕНО / ВСЕГО</span>
          <span className="text-purple-300 font-bold">{currentSimStatus.currentDist_km.toFixed(1)} / {missionSummary.totalDist_km.toFixed(1)} км</span>
        </div>
      </div>

      {/* TAB 1: MISSION PROFILE & ALTITUDE GRAPH */}
      {activeTab === 'profile' && (
        <div className="space-y-4">
          {/* Mission Altitude & Threat Visualizer */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-teal-400" />
                Профиль высоты и зоны радиоэлектронного подавления (РЭБ)
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                Дистанция: {missionSummary.totalDist_km.toFixed(1)} км | Расчетное время: {missionSummary.totalTime_min.toFixed(0)} мин
              </span>
            </div>

            {/* SVG Profile Chart */}
            <div className="relative">
              <svg viewBox="0 0 600 160" className="w-full h-44 bg-slate-900/70 rounded-lg border border-slate-800">
                {/* Altitude Grid Lines */}
                <line x1="40" y1="130" x2="580" y2="130" stroke="#334155" strokeWidth="1" />
                <line x1="40" y1="80" x2="580" y2="80" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="40" y1="30" x2="580" y2="30" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                <text x="35" y="133" fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">0m</text>
                <text x="35" y="83" fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">500m</text>
                <text x="35" y="33" fill="#64748b" fontSize="8" textAnchor="end" fontFamily="monospace">1000m</text>

                {/* EW Jamming Zone Polygon Highlighting */}
                <rect x="230" y="20" width="160" height="110" fill="rgba(244, 63, 94, 0.12)" stroke="rgba(244, 63, 94, 0.3)" strokeDasharray="4 4" />
                <text x="310" y="32" fill="#fda4af" fontSize="8" textAnchor="middle" fontFamily="monospace">ЗОНА РЭБ ПОДАВЛЕНИЯ</text>

                {/* Mission Flight Path Line */}
                <path
                  d="M 50 130 L 70 115 L 140 45 L 280 45 L 340 85 L 430 70 L 530 115 L 570 130"
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="2.5"
                />

                {/* Waypoint Nodes */}
                <circle cx="50" cy="130" r="3.5" fill="#38bdf8" />
                <circle cx="70" cy="115" r="3.5" fill="#38bdf8" />
                <circle cx="140" cy="45" r="3.5" fill="#38bdf8" />
                <circle cx="280" cy="45" r="3.5" fill="#f43f5e" />
                <circle cx="340" cy="85" r="3.5" fill="#f43f5e" />
                <circle cx="430" cy="70" r="3.5" fill="#38bdf8" />
                <circle cx="530" cy="115" r="3.5" fill="#38bdf8" />
                <circle cx="570" cy="130" r="3.5" fill="#38bdf8" />

                {/* Live UAV Marker in Simulation */}
                {(() => {
                  const x = 50 + (currentProgressPct / 100) * 520;
                  // Interpolated Y
                  let y = 45;
                  if (currentProgressPct < 15) y = 130 - (currentProgressPct / 15) * 85;
                  else if (currentProgressPct > 80) y = 45 + ((currentProgressPct - 80) / 20) * 85;
                  return (
                    <g transform={`translate(${x}, ${y})`}>
                      <circle cx="0" cy="0" r="6" fill="#10b981" className="animate-ping" opacity="0.75" />
                      <circle cx="0" cy="0" r="4" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* Simulation Progress Scrubber */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>Прогресс симуляции миссии:</span>
                <span className="text-teal-400 font-bold">{currentProgressPct.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={currentProgressPct}
                onChange={(e) => setCurrentProgressPct(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>
          </div>

          {/* Waypoints Table */}
          <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">Таблица Навигационных Точек Миссии</span>
              <span className="text-[10px] text-slate-500 font-mono">7 этапов маршрута</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="p-2.5">Этап</th>
                    <th className="p-2.5">Тип</th>
                    <th className="p-2.5">Дистанция</th>
                    <th className="p-2.5">Высота</th>
                    <th className="p-2.5">Скорость</th>
                    <th className="p-2.5">Мощность</th>
                    <th className="p-2.5">РЭБ Угроза</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {missionSummary.segmentProfiles.map((wp, idx) => (
                    <tr key={wp.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="p-2.5 font-bold text-white flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-800 text-teal-400 text-[10px] flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        {wp.name}
                      </td>
                      <td className="p-2.5 uppercase text-slate-400 text-[10px]">{wp.type}</td>
                      <td className="p-2.5">{wp.distance_km} км</td>
                      <td className="p-2.5 text-cyan-300">{wp.altitude_m} м</td>
                      <td className="p-2.5 text-emerald-300">{wp.targetSpeed_kmh} км/ч</td>
                      <td className="p-2.5 text-amber-300">{wp.power_W.toFixed(0)} Вт</td>
                      <td className="p-2.5">
                        {wp.ewJammingActive ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px]">
                            JAMMING ACTIVE
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Норма</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HIL TELEMETRY & HARDWARE BRIDGE */}
      {activeTab === 'hil_stream' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">Аппаратный Порт Autopilot HIL</span>
              <select
                value={hilSerialPort}
                onChange={(e) => setHilSerialPort(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 font-mono"
              >
                <option value="/dev/ttyACM0 (115200 baud)">/dev/ttyACM0 (115200 baud) - Pixhawk 6X</option>
                <option value="/dev/ttyUSB0 (921600 baud)">/dev/ttyUSB0 (921600 baud) - FTDI High Speed</option>
                <option value="UDP: 127.0.0.1:14550 (SITL)">UDP: 127.0.0.1:14550 (QGroundControl / SITL)</option>
              </select>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">Протокол Передачи HIL</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setHilProtocol('mavlink_v2')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    hilProtocol === 'mavlink_v2' ? 'bg-teal-600 text-white' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  MAVLink v2
                </button>
                <button
                  onClick={() => setHilProtocol('msp_v2')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    hilProtocol === 'msp_v2' ? 'bg-teal-600 text-white' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  MSP v2 (INAV)
                </button>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">Статус Шлюза HIL Bridge</span>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  CONNECTED (50 Hz)
                </span>
                <span className="text-slate-500">Loss: 0.0%</span>
              </div>
            </div>
          </div>

          {/* MAVLink Packet Live Console Stream */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
            <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-300 flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-teal-400" />
                Live HIL MAVLink Heartbeat & Sensor Stream
              </span>
              <span className="text-[10px] font-mono text-emerald-400">50 Hz Streaming</span>
            </div>
            <pre className="p-4 text-[11px] font-mono text-emerald-400/90 overflow-x-auto max-h-60 leading-relaxed bg-slate-950 space-y-1">
              {mavlinkLog.length === 0 ? (
                <div className="text-slate-600">Нажмите «Пуск HIL» для начала генерации потока пакетов телеметрии...</div>
              ) : (
                mavlinkLog.map((line, i) => (
                  <div key={i} className="hover:text-white transition-colors">
                    {line}
                  </div>
                ))
              )}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 3: ENERGY BALANCE AUDIT */}
      {activeTab === 'energy_audit' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className={`p-4 rounded-xl border ${missionSummary.isFeasible ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-rose-950/30 border-rose-500/40'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-200">Остаток Батареи на Посадке</span>
                <Battery className={`w-4 h-4 ${missionSummary.isFeasible ? 'text-emerald-400' : 'text-rose-400'}`} />
              </div>
              <div className="text-2xl font-bold font-mono text-white mb-1">
                {missionSummary.batteryRemPct.toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-400">
                {missionSummary.isFeasible
                  ? 'Миссия выполнима: запас энергии превышает безопасный резерв 15%.'
                  : 'Критическая ошибка: энергии недостаточно, требуется снизить крейсерскую скорость или уменьшить дальность!'}
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-slate-950 border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-200">Потребление Энергии</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-300 mb-1">
                {missionSummary.totalEnergy_Wh.toFixed(1)} Вт·ч
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Емкость батареи: {missionSummary.totalBatteryEnergy_Wh.toFixed(1)} Вт·ч ({busState.batteryCells}S {busState.batteryCap_mAh / 1000}Ah)
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-slate-950 border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-200">Удельный Расход</span>
                <Activity className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-teal-300 mb-1">
                {(missionSummary.totalEnergy_Wh / Math.max(1, missionSummary.totalDist_km)).toFixed(1)} Вт·ч/км
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Аэродинамическое качество L/D: {busState.liftToDragRatio.toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
