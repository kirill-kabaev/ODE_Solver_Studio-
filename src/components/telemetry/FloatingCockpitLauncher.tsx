import React, { useState } from 'react';
import {
  Compass,
  Maximize2,
  Sliders,
  Crosshair,
  Activity,
  Zap,
  Radio,
} from 'lucide-react';
import { UniversalCockpitHUDModal, CockpitSystemDomain } from './UniversalCockpitHUDModal';
import { VirtualJoystick, JoystickMode, JoystickValue } from './VirtualJoystick';

interface FloatingCockpitLauncherProps {
  currentDomain?: CockpitSystemDomain;
  mach?: number;
  alpha?: number;
  onJoystickChange?: (val: JoystickValue) => void;
}

export const FloatingCockpitLauncher: React.FC<FloatingCockpitLauncherProps> = ({
  currentDomain = '3d_aero_studio',
  mach = 0.82,
  alpha = 4.5,
  onJoystickChange,
}) => {
  const [isCockpitOpen, setIsCockpitOpen] = useState<boolean>(false);
  const [isMiniJoystickOpen, setIsMiniJoystickOpen] = useState<boolean>(false);
  const [joystickMode, setJoystickMode] = useState<JoystickMode>('camera_orbit');

  return (
    <>
      {/* Floating HUD Launcher Bar in Bottom-Right */}
      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 font-mono">
        {/* Toggle Mini Floating Joystick */}
        <button
          type="button"
          onClick={() => setIsMiniJoystickOpen(!isMiniJoystickOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-black shadow-2xl transition-all border cursor-pointer ${
            isMiniJoystickOpen
              ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-cyan-500/40 ring-2 ring-cyan-400'
              : 'bg-slate-950/90 text-cyan-300 border-cyan-500/40 hover:bg-slate-900 hover:border-cyan-400 backdrop-blur-md'
          }`}
          title="Открыть / скрыть визуальный плавающий джойстик на экране"
        >
          <Crosshair className="w-4 h-4 text-cyan-400 animate-spin-slow" />
          <span className="hidden sm:inline">🕹️ Визуальный Джойстик</span>
        </button>

        {/* Fullscreen Master Cockpit Button */}
        <button
          type="button"
          onClick={() => setIsCockpitOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 text-slate-950 hover:brightness-110 shadow-2xl shadow-cyan-500/30 transition-all border border-cyan-300 cursor-pointer"
          title="Открыть полноэкранный экран характеристик, регуляторов и навигации"
        >
          <Compass className="w-4 h-4 text-slate-950" />
          <span>Экран Телеметрии & HUD</span>
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Mini Joystick Overlay if activated */}
      {isMiniJoystickOpen && (
        <div className="fixed bottom-20 right-5 z-40 animate-slideUp">
          <VirtualJoystick
            mode={joystickMode}
            onModeChange={setJoystickMode}
            onChange={(val) => {
              onJoystickChange?.(val);
            }}
            size={135}
            showThrottle={true}
          />
        </div>
      )}

      {/* Fullscreen Cockpit HUD Modal */}
      <UniversalCockpitHUDModal
        isOpen={isCockpitOpen}
        onClose={() => setIsCockpitOpen(false)}
        initialDomain={currentDomain}
        initialMach={mach}
        initialAlpha={alpha}
      />
    </>
  );
};
