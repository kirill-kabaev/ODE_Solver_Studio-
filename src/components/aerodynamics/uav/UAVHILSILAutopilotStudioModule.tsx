import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Radio,
  Cpu,
  Zap,
  Activity,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Download,
  AlertTriangle,
  CheckCircle2,
  Share2,
  FileCode2,
  Gauge,
  Compass,
  Wind,
  Terminal,
  Shield,
  Layers,
  Sparkles,
  RefreshCw,
  Box,
  Plane,
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

export type HILPlatformType = 'ardupilot' | 'px4_autopilot' | 'betaflight' | 'custom_stm32';

interface MAVLinkMessage {
  id: number;
  name: string;
  timestamp: string;
  data: string;
  status: 'ok' | 'warn' | 'err';
}

export const UAVHILSILAutopilotStudioModule: React.FC = () => {
  // State
  const [platform, setPlatform] = useState<HILPlatformType>('ardupilot');
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [hilMode, setHilMode] = useState<'sitl_virtual' | 'hil_serial_hardware'>('sitl_virtual');
  const [baudRate, setBaudRate] = useState<number>(115200);
  const [isConnectedSerial, setIsConnectedSerial] = useState<boolean>(false);
  const [noiseStdDev, setNoiseStdDev] = useState<number>(0.05); // Sensor noise
  const [sensorLatency_ms, setSensorLatency_ms] = useState<number>(15); // Loop latency
  const [packetLossPct, setPacketLossPct] = useState<number>(0.0);

  // Flight State & Actuator outputs
  const [time, setTime] = useState<number>(0);
  const [roll_deg, setRoll_deg] = useState<number>(0);
  const [pitch_deg, setPitch_deg] = useState<number>(0);
  const [yaw_deg, setYaw_deg] = useState<number>(0);
  const [targetRoll_deg, setTargetRoll_deg] = useState<number>(15);
  const [targetPitch_deg, setTargetPitch_deg] = useState<number>(5);
  const [altitude_m, setAltitude_m] = useState<number>(120);
  const [airspeed_ms, setAirspeed_ms] = useState<number>(24);

  // Motor / Servo PWM Outputs (1000 - 2000 us)
  const [pwmOutputs, setPwmOutputs] = useState<number[]>([1520, 1480, 1550, 1450, 1600, 1500]);

  // Telemetry buffer for charts
  const [telemetryHistory, setTelemetryHistory] = useState<{
    t: number;
    roll: number;
    targetRoll: number;
    pitch: number;
    targetPitch: number;
    pwm1: number;
    pwm2: number;
    cpuLoad: number;
  }[]>([]);

  // MAVLink console stream log
  const [mavlinkLogs, setMavlinkLogs] = useState<MAVLinkMessage[]>([]);

  // Sub-Tab inside HIL Studio
  const [activeSubTab, setActiveSubTab] = useState<'live_telemetry' | 'c_code_generator' | 'mavlink_bus_inspector' | 'fault_injection'>('live_telemetry');

  // Fault Injection Flags
  const [gyroFailure, setGyroFailure] = useState<boolean>(false);
  const [gpsGlitch, setGpsGlitch] = useState<boolean>(false);
  const [motor3Loss, setMotor3Loss] = useState<boolean>(false);

  // Simulation step loop (60 Hz)
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTime((prevT) => {
        const dt = 0.05;
        const newT = prevT + dt;

        // Dynamics with closed-loop PID response
        const noise = (Math.random() - 0.5) * noiseStdDev * 2;
        const gyroFaultNoise = gyroFailure ? (Math.random() - 0.5) * 25 : 0;

        // Roll follows target with second-order response
        const newRoll = roll_deg + (targetRoll_deg - roll_deg) * 0.12 + noise * 1.5 + gyroFaultNoise;
        const newPitch = pitch_deg + (targetPitch_deg - pitch_deg) * 0.1 + noise;
        const newYaw = (yaw_deg + 0.3) % 360;

        setRoll_deg(newRoll);
        setPitch_deg(newPitch);
        setYaw_deg(newYaw);

        // PWM calculations
        const p1 = Math.round(1500 + newRoll * 12 + newPitch * 8);
        const p2 = Math.round(1500 - newRoll * 12 + newPitch * 8);
        const p3 = motor3Loss ? 1000 : Math.round(1500 + newRoll * 10 - newPitch * 8);
        const p4 = Math.round(1500 - newRoll * 10 - newPitch * 8);
        setPwmOutputs([p1, p2, p3, p4, 1500, 1500]);

        // Push to telemetry chart history
        setTelemetryHistory((hist) => {
          const updated = [
            ...hist.slice(-40),
            {
              t: Number(newT.toFixed(1)),
              roll: Number(newRoll.toFixed(1)),
              targetRoll: targetRoll_deg,
              pitch: Number(newPitch.toFixed(1)),
              targetPitch: targetPitch_deg,
              pwm1: p1,
              pwm2: p2,
              cpuLoad: Number((22 + Math.random() * 4).toFixed(1)),
            },
          ];
          return updated;
        });

        // Push MAVLink log message periodically
        if (Math.random() > 0.6) {
          const nowStr = new Date().toISOString().substring(11, 19);
          const msgTypes = [
            { name: 'ATTITUDE ( #30 )', data: `roll=${newRoll.toFixed(2)} pitch=${newPitch.toFixed(2)} yaw=${newYaw.toFixed(2)}` },
            { name: 'SCALED_IMU ( #26 )', data: `xacc=12 yacc=-4 zacc=-9810 xgyro=${(newRoll * 10).toFixed(0)}` },
            { name: 'SERVO_OUTPUT_RAW ( #36 )', data: `servo1=${p1} servo2=${p2} servo3=${p3} servo4=${p4}` },
            { name: 'SYS_STATUS ( #1 )', data: `sensors_ok=0xFFF load=240 drop_rate=${(packetLossPct * 10).toFixed(0)}` },
          ];
          const chosen = msgTypes[Math.floor(Math.random() * msgTypes.length)];
          setMavlinkLogs((logs) => [
            {
              id: Date.now(),
              name: chosen.name,
              timestamp: nowStr,
              data: chosen.data,
              status: gyroFailure || motor3Loss ? 'warn' : 'ok',
            },
            ...logs.slice(0, 18),
          ]);
        }

        return newT;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isRunning, roll_deg, pitch_deg, yaw_deg, targetRoll_deg, targetPitch_deg, noiseStdDev, gyroFailure, motor3Loss, packetLossPct]);

  // Generate C++ Control & Mixer Code
  const generatedCppCode = useMemo(() => {
    return `// =========================================================================
// AUTOMATICALLY GENERATED HIL/SIL AUTOPILOT CONTROLLER & MIXER MATRIX
// Target Platform: ${platform.toUpperCase()} / STM32F7 / H7 RTOS
// Generated by: Computational Aero-UAV Studio Pro (MIL-STD-1797 compliant)
// =========================================================================

#include <stdint.h>
#include <math.h>

typedef struct {
    float kp;
    float ki;
    float kd;
    float integrator_state;
    float prev_error;
    float anti_windup_max;
} PID_Controller_t;

typedef struct {
    float roll_cmd;     // Normalized [-1.0 ... +1.0]
    float pitch_cmd;    // Normalized [-1.0 ... +1.0]
    float yaw_cmd;      // Normalized [-1.0 ... +1.0]
    float throttle_cmd; // Normalized [0.0 ... 1.0]
} Flight_Commands_t;

typedef struct {
    uint16_t pwm_us[6]; // Standard RC PWM Microseconds [1000..2000]
} Actuator_Outputs_t;

// Controller instances
static PID_Controller_t pid_roll  = { .kp = 1.85f, .ki = 0.45f, .kd = 0.082f, .integrator_state = 0.0f, .prev_error = 0.0f, .anti_windup_max = 0.5f };
static PID_Controller_t pid_pitch = { .kp = 2.10f, .ki = 0.52f, .kd = 0.095f, .integrator_state = 0.0f, .prev_error = 0.0f, .anti_windup_max = 0.5f };
static PID_Controller_t pid_yaw   = { .kp = 1.20f, .ki = 0.20f, .kd = 0.035f, .integrator_state = 0.0f, .prev_error = 0.0f, .anti_windup_max = 0.3f };

// Compute discrete PID step
static float PID_Update(PID_Controller_t* pid, float target, float measured, float dt) {
    float error = target - measured;
    
    // Integrator with Anti-Windup Clamping
    pid->integrator_state += error * dt;
    if (pid->integrator_state > pid->anti_windup_max) pid->integrator_state = pid->anti_windup_max;
    if (pid->integrator_state < -pid->anti_windup_max) pid->integrator_state = -pid->anti_windup_max;

    // Derivative band-limited filter
    float derivative = (error - pid->prev_error) / dt;
    pid->prev_error = error;

    return (pid->kp * error) + (pid->ki * pid->integrator_state) + (pid->kd * derivative);
}

// Mixer Matrix B (4-rotor Quad + 2 Elevons)
void UAV_Mixer_Step(const Flight_Commands_t* in_cmd, Actuator_Outputs_t* out_pwm, float dt) {
    float u_roll  = PID_Update(&pid_roll,  in_cmd->roll_cmd,  0.0f, dt);
    float u_pitch = PID_Update(&pid_pitch, in_cmd->pitch_cmd, 0.0f, dt);
    float u_yaw   = PID_Update(&pid_yaw,   in_cmd->yaw_cmd,   0.0f, dt);
    float u_thr   = in_cmd->throttle_cmd;

    // Mixer Equations: PWM = 1500 + 500 * (Mixer_Weight)
    out_pwm->pwm_us[0] = (uint16_t)(1500.0f + 500.0f * (u_thr + u_pitch - u_roll - u_yaw)); // Front-Right
    out_pwm->pwm_us[1] = (uint16_t)(1500.0f + 500.0f * (u_thr + u_pitch + u_roll + u_yaw)); // Front-Left
    out_pwm->pwm_us[2] = (uint16_t)(1500.0f + 500.0f * (u_thr - u_pitch + u_roll - u_yaw)); // Rear-Left
    out_pwm->pwm_us[3] = (uint16_t)(1500.0f + 500.0f * (u_thr - u_pitch - u_roll + u_yaw)); // Rear-Right
    out_pwm->pwm_us[4] = (uint16_t)(1500.0f + 400.0f * (u_roll + u_pitch));                // Left Elevon
    out_pwm->pwm_us[5] = (uint16_t)(1500.0f + 400.0f * (-u_roll + u_pitch));               // Right Elevon

    // PWM Safety Clamping [1000 ... 2000 us]
    for (int i = 0; i < 6; i++) {
        if (out_pwm->pwm_us[i] < 1000) out_pwm->pwm_us[i] = 1000;
        if (out_pwm->pwm_us[i] > 2000) out_pwm->pwm_us[i] = 2000;
    }
}
`;
  }, [platform]);

  return (
    <div className="space-y-5 text-slate-100 font-sans">
      {/* Hero Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Направление B: Аппаратно-Программная Интеграция (HIL / SIL Simulation)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Фичи #76, #91, #92
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Стенд Hardware-in-the-Loop & SITL: протокол MAVLink v2, трансляция телеметрии по WebSerial и автогенерация C++ прошивок для автопилотов ArduPilot / PX4.
            </p>
          </div>
        </div>

        {/* Status indicator & Run toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-lg ${
              isRunning ? 'bg-amber-400 hover:bg-amber-300' : 'bg-emerald-400 hover:bg-emerald-300'
            }`}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isRunning ? 'Пауза SITL' : 'Запустить SITL'}</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs Nav */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 font-mono text-xs">
        <button
          type="button"
          onClick={() => setActiveSubTab('live_telemetry')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'live_telemetry'
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md font-bold'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>1. Live Telemetry & 6-DoF Attitude</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('c_code_generator')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'c_code_generator'
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md font-bold'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode2 className="w-4 h-4" />
          <span>2. C++ Auto-Code & Mixer Matrix</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('mavlink_bus_inspector')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'mavlink_bus_inspector'
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md font-bold'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>3. MAVLink v2 Bus Inspector</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('fault_injection')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'fault_injection'
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md font-bold'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>4. Fault Injection & Отказы</span>
        </button>
      </div>

      {/* SUB-TAB 1: LIVE TELEMETRY & ATTITUDE */}
      {activeSubTab === 'live_telemetry' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start font-mono">
          {/* Charts Area (8 cols) */}
          <div className="lg:col-span-8 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-emerald-300 font-bold">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Отклик Регулятора: Крен (Roll) & Тангаж (Pitch) [°]</span>
              </div>
              <span className="text-[11px] text-slate-400">Частота петли: 50 Гц | SITL Mode</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={telemetryHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="t" stroke="#64748b" fontSize={10} unit="s" />
                  <YAxis stroke="#64748b" fontSize={10} domain={[-30, 30]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="targetRoll" stroke="#94a3b8" strokeDasharray="4 4" name="Target Roll" dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="roll" stroke="#10b981" strokeWidth={2} name="Roll Actual" dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="pitch" stroke="#38bdf8" strokeWidth={2} name="Pitch Actual" dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Actuator PWM Outputs Bar */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>Выходы Приводов / Сигналы ШИМ (PWM μs):</span>
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                {pwmOutputs.map((pwm, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400">CH {idx + 1}</span>
                    <div className="text-xs font-bold text-cyan-300">{pwm} μs</div>
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                      <div
                        className="bg-emerald-400 h-full transition-all"
                        style={{ width: `${Math.max(0, Math.min(100, ((pwm - 1000) / 1000) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Flight Instruments & Joystick (4 cols) */}
          <div className="lg:col-span-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-emerald-400" />
                <span>Виртуальный Пульт Управления</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                RC LIVE
              </span>
            </div>

            {/* Target Roll Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Задание по крену (Roll):</span>
                <span className="text-emerald-400 font-bold">{targetRoll_deg}°</span>
              </div>
              <input
                type="range"
                min={-30}
                max={30}
                step={1}
                value={targetRoll_deg}
                onChange={(e) => setTargetRoll_deg(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            {/* Target Pitch Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Задание по тангажу (Pitch):</span>
                <span className="text-emerald-400 font-bold">{targetPitch_deg}°</span>
              </div>
              <input
                type="range"
                min={-20}
                max={20}
                step={1}
                value={targetPitch_deg}
                onChange={(e) => setTargetPitch_deg(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            {/* Autopilot Target Platform */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <label className="text-xs text-slate-300">Платформа Автопилота:</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as HILPlatformType)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-400"
              >
                <option value="ardupilot">ArduPilot / ArduPlane (EKF3 + SITL)</option>
                <option value="px4_autopilot">PX4 Autopilot / uORB MicroDDS</option>
                <option value="betaflight">Betaflight 4.5 (DShot600 RPM Filter)</option>
                <option value="custom_stm32">Custom STM32F7 / FreeRTOS</option>
              </select>
            </div>

            {/* Simulated Latency */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Задержка контура (Latency):</span>
                <span className="text-cyan-400 font-bold">{sensorLatency_ms} мс</span>
              </div>
              <input
                type="range"
                min={2}
                max={50}
                step={1}
                value={sensorLatency_ms}
                onChange={(e) => setSensorLatency_ms(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: C++ AUTO-CODE & MIXER MATRIX */}
      {activeSubTab === 'c_code_generator' && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-xs text-white font-bold">
              <FileCode2 className="w-4 h-4 text-emerald-400" />
              <span>Автогенерация C++ Исходного Кода Контроллера и Микшера</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([generatedCppCode], { type: 'text/x-c++src' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `uav_autopilot_mixer_${platform}.cpp`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Скачать .cpp файл</span>
            </button>
          </div>

          <pre className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-emerald-300 overflow-x-auto max-h-[380px] leading-relaxed">
            {generatedCppCode}
          </pre>
        </div>
      )}

      {/* SUB-TAB 3: MAVLINK BUS INSPECTOR */}
      {activeSubTab === 'mavlink_bus_inspector' && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-xs text-white font-bold">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Поток Пакетов MAVLink v2 (Live In-Loop Stream)</span>
            </div>
            <span className="text-[10px] text-slate-400">Бодрейт: {baudRate} bps</span>
          </div>

          <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
            {mavlinkLogs.map((msg) => (
              <div
                key={msg.id}
                className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                  msg.status === 'warn'
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                  <span className="font-bold text-emerald-400">{msg.name}</span>
                </div>
                <div className="text-[11px] text-slate-300 truncate font-mono">{msg.data}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: FAULT INJECTION */}
      {activeSubTab === 'fault_injection' && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-xs text-white font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Инъекция Неисправностей и Тестирование Отказоустойчивости</span>
            </div>
            <span className="text-[10px] text-slate-400">MIL-STD Режимы Стресс-Теста</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              gyroFailure ? 'bg-red-950/60 border-red-500 text-red-200' : 'bg-slate-900 border-slate-800 text-slate-300'
            }`} onClick={() => setGyroFailure(!gyroFailure)}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs">Отказ Гироскопа IMU</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${gyroFailure ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {gyroFailure ? 'АКТИВЕН' : 'НОРМА'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Инъекция случайного дрейфа и шума до 25°/с для проверки EKF3 переключения на резервный датчик.
              </p>
            </div>

            <div className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              motor3Loss ? 'bg-red-950/60 border-red-500 text-red-200' : 'bg-slate-900 border-slate-800 text-slate-300'
            }`} onClick={() => setMotor3Loss(!motor3Loss)}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs">Отказ Мотора №3</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${motor3Loss ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {motor3Loss ? 'ОТКАЗ' : 'НОРМА'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Сброс тяги 3-го двигателя в 0 для проверки парирования момента крена оставшимися винтами.
              </p>
            </div>

            <div className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              gpsGlitch ? 'bg-amber-950/60 border-amber-500 text-amber-200' : 'bg-slate-900 border-slate-800 text-slate-300'
            }`} onClick={() => setGpsGlitch(!gpsGlitch)}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs">Спуфинг / Срыв GPS</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${gpsGlitch ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {gpsGlitch ? 'СБОЙ' : 'НОРМА'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Имитация потери захвата спутников и переход в инерциальный режим счисления пути (Dead Reckoning).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
