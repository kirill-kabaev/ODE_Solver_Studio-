import React from 'react';
import { Maximize2, Compass, Crosshair } from 'lucide-react';

export interface FullscreenGraphButtonProps {
  onClick: () => void;
  label?: string;
  subLabel?: string;
  className?: string;
  showIconOnlyOnMobile?: boolean;
  onToggleJoystick?: () => void;
  isJoystickActive?: boolean;
}

export const FullscreenGraphButton: React.FC<FullscreenGraphButtonProps> = ({
  onClick,
  label = 'Во весь экран',
  subLabel,
  className = '',
  showIconOnlyOnMobile = true,
  onToggleJoystick,
  isJoystickActive = false,
}) => {
  return (
    <div
      className={`absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1.5 select-none pointer-events-auto ${className}`}
    >
      {onToggleJoystick && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleJoystick();
          }}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold shadow-lg backdrop-blur-md transition-all duration-200 cursor-pointer active:scale-95 ${
            isJoystickActive
              ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black shadow-cyan-950/60'
              : 'bg-slate-900/90 text-cyan-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
          }`}
          title="Включить наэкранный виртуальный джойстик"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Джойстик</span>
        </button>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/95 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-indigo-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/50 hover:border-cyan-300 text-xs font-black shadow-xl shadow-slate-950/80 backdrop-blur-md transition-all duration-200 cursor-pointer active:scale-95 group"
        title="Развернуть график/анимацию во весь экран с полными характеристиками, регуляторами и телеметрией"
      >
        <Maximize2 className="w-3.5 h-3.5 text-cyan-400 group-hover:text-slate-950 transition-colors shrink-0" />
        <span className={showIconOnlyOnMobile ? 'hidden sm:inline' : 'inline'}>{label}</span>
        {subLabel && <span className="text-[10px] opacity-75 hidden lg:inline">({subLabel})</span>}
      </button>
    </div>
  );
};
