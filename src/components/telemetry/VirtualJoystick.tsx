import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Compass,
  Move,
  RotateCcw,
  Maximize2,
  Lock,
  Unlock,
  Zap,
  Sliders,
  Crosshair,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

export type JoystickMode =
  | 'camera_orbit'
  | 'flight_yoke'
  | 'aero_flow'
  | 'drone_vector'
  | 'target_guidance';

export interface JoystickValue {
  x: number; // Normalized [-1.0, 1.0]
  y: number; // Normalized [-1.0, 1.0]
  angleDeg: number; // 0 to 360 deg
  distance: number; // 0.0 to 1.0
  active: boolean;
}

interface VirtualJoystickProps {
  mode?: JoystickMode;
  onModeChange?: (mode: JoystickMode) => void;
  onChange: (value: JoystickValue) => void;
  onThrottleChange?: (throttle: number) => void;
  throttle?: number;
  showThrottle?: boolean;
  className?: string;
  size?: number;
  label?: string;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  mode = 'camera_orbit',
  onModeChange,
  onChange,
  onThrottleChange,
  throttle = 75,
  showThrottle = true,
  className = '',
  size = 150,
  label,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [sensitivity, setSensitivity] = useState<number>(1.0);

  const radius = size / 2;
  const maxKnobRadius = radius * 0.65;

  const updateJoystick = useCallback(
    (clientX: number, clientY: number, lockCenter = false) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = clientX - centerX;
      let dy = clientY - centerY;

      const dist = Math.sqrt(dx * dx + dy * dy);
      const angleRad = Math.atan2(dy, dx);
      let angleDeg = (angleRad * 180) / Math.PI;
      if (angleDeg < 0) angleDeg += 360;

      let clampedDist = dist;
      if (clampedDist > maxKnobRadius) {
        clampedDist = maxKnobRadius;
        dx = Math.cos(angleRad) * maxKnobRadius;
        dy = Math.sin(angleRad) * maxKnobRadius;
      }

      const normX = parseFloat(((dx / maxKnobRadius) * sensitivity).toFixed(3));
      const normY = parseFloat(((-dy / maxKnobRadius) * sensitivity).toFixed(3)); // Up is positive
      const normDist = parseFloat((clampedDist / maxKnobRadius).toFixed(3));

      setKnobPos({ x: dx, y: dy });

      onChange({
        x: Math.max(-1, Math.min(1, normX)),
        y: Math.max(-1, Math.min(1, normY)),
        angleDeg: Math.round(angleDeg),
        distance: normDist,
        active: true,
      });
    },
    [maxKnobRadius, sensitivity, onChange]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsInteracting(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateJoystick(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isInteracting) return;
    e.preventDefault();
    updateJoystick(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsInteracting(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (!isLocked) {
      setKnobPos({ x: 0, y: 0 });
      onChange({
        x: 0,
        y: 0,
        angleDeg: 0,
        distance: 0,
        active: false,
      });
    }
  };

  const resetToCenter = () => {
    setKnobPos({ x: 0, y: 0 });
    onChange({
      x: 0,
      y: 0,
      angleDeg: 0,
      distance: 0,
      active: false,
    });
  };

  // Keyboard navigation support for Joystick when focused
  const handleKeyDown = (e: React.KeyboardEvent) => {
    let dx = 0;
    let dy = 0;
    const step = 0.35 * maxKnobRadius;

    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') dy = -step;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') dy = step;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dx = -step;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dx = step;

    if (dx !== 0 || dy !== 0) {
      e.preventDefault();
      const newX = Math.max(-maxKnobRadius, Math.min(maxKnobRadius, knobPos.x + dx));
      const newY = Math.max(-maxKnobRadius, Math.min(maxKnobRadius, knobPos.y + dy));
      setKnobPos({ x: newX, y: newY });
      const normX = parseFloat((newX / maxKnobRadius).toFixed(3));
      const normY = parseFloat((-newY / maxKnobRadius).toFixed(3));
      onChange({
        x: normX,
        y: normY,
        angleDeg: Math.round(((Math.atan2(newY, newX) * 180) / Math.PI + 360) % 360),
        distance: Math.min(1, Math.sqrt(normX * normX + normY * normY)),
        active: true,
      });
    }
  };

  const getModeTitle = () => {
    switch (mode) {
      case 'camera_orbit':
        return 'Обзор Камеры (3D Orbit)';
      case 'flight_yoke':
        return 'Штурвал (Pitch / Roll)';
      case 'aero_flow':
        return 'Поток (Alpha / Mach)';
      case 'drone_vector':
        return 'Вектор БПЛА (Yaw / Speed)';
      case 'target_guidance':
        return 'Наведение (LOS Визирование)';
      default:
        return 'Управление';
    }
  };

  return (
    <div
      className={`flex flex-col items-center gap-2 p-3 bg-slate-950/90 rounded-2xl border border-cyan-500/40 shadow-2xl backdrop-blur-md select-none font-mono ${className}`}
    >
      {/* Header with Mode Switcher & Lock */}
      <div className="w-full flex items-center justify-between gap-1 text-[11px] pb-1 border-b border-slate-800">
        <div className="flex items-center gap-1 text-cyan-300 font-bold">
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
          <span className="truncate max-w-[110px]">{label || getModeTitle()}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsLocked(!isLocked)}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              isLocked
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
            title={isLocked ? 'Позиция зафиксирована (Hold)' : 'Автовозврат в центр'}
          >
            {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          </button>

          <button
            type="button"
            onClick={resetToCenter}
            className="p-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Сброс в центр (0, 0)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Joystick Stage + Optional Throttle Bar */}
      <div className="flex items-center justify-center gap-3">
        {/* Analog 2D Circular Joystick Pad */}
        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ width: size, height: size }}
          className="relative rounded-full bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-cyan-500/50 shadow-inner flex items-center justify-center cursor-crosshair touch-none focus:ring-2 focus:ring-cyan-400/50 outline-none group"
        >
          {/* Radial Grid & Crosshairs */}
          <div className="absolute inset-0 rounded-full border border-cyan-500/10 pointer-events-none" />
          <div className="absolute w-full h-[1px] bg-cyan-500/25 top-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="absolute h-full w-[1px] bg-cyan-500/25 left-1/2 -translate-x-1/2 pointer-events-none" />

          {/* Inner Safety Rings */}
          <div
            style={{ width: size * 0.66, height: size * 0.66 }}
            className="absolute rounded-full border border-dashed border-cyan-500/30 pointer-events-none"
          />
          <div
            style={{ width: size * 0.33, height: size * 0.33 }}
            className="absolute rounded-full border border-cyan-500/20 pointer-events-none"
          />

          {/* Directional Labels */}
          <span className="absolute top-1 text-[9px] font-bold text-cyan-400/70 pointer-events-none">
            +Y
          </span>
          <span className="absolute bottom-1 text-[9px] font-bold text-cyan-400/70 pointer-events-none">
            -Y
          </span>
          <span className="absolute left-1.5 text-[9px] font-bold text-cyan-400/70 pointer-events-none">
            -X
          </span>
          <span className="absolute right-1.5 text-[9px] font-bold text-cyan-400/70 pointer-events-none">
            +X
          </span>

          {/* Active Vector Line from Center */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line
              x1={radius}
              y1={radius}
              x2={radius + knobPos.x}
              y2={radius + knobPos.y}
              stroke="rgba(6, 182, 212, 0.8)"
              strokeWidth="2.5"
              strokeDasharray={isInteracting ? undefined : '2,2'}
            />
          </svg>

          {/* Floating Knob Head */}
          <div
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              width: size * 0.34,
              height: size * 0.34,
            }}
            className={`absolute rounded-full border-2 transition-transform duration-75 flex items-center justify-center shadow-lg ${
              isInteracting
                ? 'bg-gradient-to-br from-cyan-400 to-indigo-600 border-white shadow-cyan-500/80 scale-110'
                : isLocked
                ? 'bg-gradient-to-br from-amber-400 to-rose-600 border-amber-200 shadow-amber-500/50'
                : 'bg-gradient-to-br from-cyan-500 to-indigo-700 border-cyan-300 shadow-cyan-950/60'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm pointer-events-none" />
          </div>
        </div>

        {/* Optional Vertical Throttle Stick */}
        {showThrottle && onThrottleChange && (
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[9px] font-bold text-slate-400">ТЯГА</span>
            <div className="relative h-[130px] w-7 bg-slate-900 rounded-lg border border-slate-700 p-1 flex flex-col justify-end overflow-hidden shadow-inner">
              <div
                style={{ height: `${throttle}%` }}
                className="w-full rounded bg-gradient-to-t from-cyan-500 via-teal-400 to-emerald-400 transition-all shadow-md"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={throttle}
                onChange={(e) => onThrottleChange(Number(e.target.value))}
                className="absolute inset-0 opacity-0 cursor-ns-resize h-full w-full"
              />
            </div>
            <span className="text-[10px] font-bold text-cyan-300">{throttle}%</span>
          </div>
        )}
      </div>

      {/* Telemetry Footer of Stick Offsets */}
      <div className="w-full flex items-center justify-between text-[10px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800">
        <div>
          X:{' '}
          <strong className={knobPos.x !== 0 ? 'text-cyan-300' : 'text-slate-400'}>
            {(knobPos.x / maxKnobRadius).toFixed(2)}
          </strong>
        </div>
        <div>
          Y:{' '}
          <strong className={knobPos.y !== 0 ? 'text-cyan-300' : 'text-slate-400'}>
            {(-knobPos.y / maxKnobRadius).toFixed(2)}
          </strong>
        </div>
        <div>
          R:{' '}
          <strong className="text-indigo-300">
            {(Math.sqrt(knobPos.x * knobPos.x + knobPos.y * knobPos.y) / maxKnobRadius).toFixed(2)}
          </strong>
        </div>
      </div>

      {/* Mode Buttons */}
      {onModeChange && (
        <div className="w-full grid grid-cols-2 gap-1 pt-1">
          {[
            { id: 'camera_orbit', label: '🎥 Камера' },
            { id: 'flight_yoke', label: '🕹️ Рули' },
            { id: 'aero_flow', label: '💨 Поток' },
            { id: 'drone_vector', label: '🚁 Вектор' },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => onModeChange(btn.id as JoystickMode)}
              className={`px-1.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer truncate ${
                mode === btn.id
                  ? 'bg-cyan-500 text-slate-950 shadow font-black'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
