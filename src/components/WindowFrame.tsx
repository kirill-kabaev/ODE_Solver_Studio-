import React, { useRef, useState, useEffect } from 'react';
import { Minus, Square, X, Maximize2, Minimize2 } from 'lucide-react';
import { WindowState } from '../types';

interface WindowFrameProps {
  window: WindowState;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onFocus: () => void;
  onUpdatePosition: (pos: { x: number; y: number }) => void;
  icon?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const WindowFrame: React.FC<WindowFrameProps> = ({
  window,
  onClose,
  onMinimize,
  onMaximize,
  onFocus,
  onUpdatePosition,
  icon,
  headerActions,
  children,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; winX: number; winY: number }>({
    mouseX: 0,
    mouseY: 0,
    winX: 0,
    winY: 0,
  });

  const handleMouseDownHeader = (e: React.MouseEvent) => {
    if (window.isMaximized) return;
    onFocus();
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      winX: window.position.x,
      winY: window.position.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.mouseX;
      const deltaY = e.clientY - dragStartRef.current.mouseY;
      const newX = Math.max(10, dragStartRef.current.winX + deltaX);
      const newY = Math.max(50, dragStartRef.current.winY + deltaY);
      onUpdatePosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onUpdatePosition]);

  if (!window.isOpen || window.isMinimized) {
    return null;
  }

  const isMax = window.isMaximized;

  return (
    <div
      id={`window-${window.id}`}
      onMouseDown={onFocus}
      style={{
        zIndex: window.zIndex,
        left: isMax ? 0 : `${window.position.x}px`,
        top: isMax ? 48 : `${window.position.y}px`,
        width: isMax ? '100vw' : `${window.size.width}px`,
        height: isMax ? 'calc(100vh - 48px)' : `${window.size.height}px`,
        maxWidth: isMax ? '100vw' : '96vw',
        maxHeight: isMax ? 'calc(100vh - 48px)' : '92vh',
      }}
      className={`fixed flex flex-col bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden transition-shadow duration-200 select-none ${
        isDragging ? 'opacity-90 shadow-cyan-500/20' : ''
      } ${className}`}
    >
      {/* Window Titlebar */}
      <div
        onMouseDown={handleMouseDownHeader}
        className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/80 cursor-move text-xs font-medium text-slate-200 select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* OS-style dot buttons */}
          <div className="flex items-center gap-1.5 mr-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onClose}
              title="Закрыть окно"
              className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 transition-colors flex items-center justify-center group"
            >
              <X className="w-2 h-2 text-rose-950 opacity-0 group-hover:opacity-100" />
            </button>
            <button
              onClick={onMinimize}
              title="Свернуть"
              className="w-3 h-3 rounded-full bg-amber-500 hover:bg-amber-600 transition-colors flex items-center justify-center group"
            >
              <Minus className="w-2 h-2 text-amber-950 opacity-0 group-hover:opacity-100" />
            </button>
            <button
              onClick={onMaximize}
              title={isMax ? "Восстановить" : "Развернуть на весь экран"}
              className="w-3 h-3 rounded-full bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center group"
            >
              {isMax ? (
                <Minimize2 className="w-2 h-2 text-emerald-950 opacity-0 group-hover:opacity-100" />
              ) : (
                <Maximize2 className="w-2 h-2 text-emerald-950 opacity-0 group-hover:opacity-100" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 truncate pl-1">
            {icon && <span className="text-cyan-400 shrink-0">{icon}</span>}
            <span className="font-semibold text-slate-100 tracking-wide truncate">{window.title}</span>
          </div>
        </div>

        {/* Right side custom actions */}
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {headerActions}
        </div>
      </div>

      {/* Window Body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 text-slate-200 select-text font-sans">
        {children}
      </div>
    </div>
  );
};
