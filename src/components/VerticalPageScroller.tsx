import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronUp, ChevronDown, Compass, CheckCircle2 } from 'lucide-react';
import { StudioMainMode } from './AppHeader';

interface VerticalPageScrollerProps {
  studioMode: StudioMainMode;
  activeSection?: string;
  onScrollToSection?: (sectionId: string) => void;
}

interface SectionMarker {
  id: string;
  num: string;
  title: string;
  shortTitle: string;
}

export const VerticalPageScroller: React.FC<VerticalPageScrollerProps> = ({
  studioMode,
  activeSection,
  onScrollToSection,
}) => {
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);

  const sections: SectionMarker[] = studioMode === 'ode'
    ? [
        { id: 'input-section', num: '1', title: '1. Параметры и ввод ДУ', shortTitle: 'Ввод ДУ' },
        { id: 'formula-section', num: '2', title: '2. Аналитическое решение', shortTitle: 'Решение' },
        { id: 'steps-section', num: '3', title: '3. Пошаговый вывод', shortTitle: 'Шаги' },
        { id: 'graph-section', num: '4', title: '4. Интерактивный 2D/3D график', shortTitle: 'График' },
      ]
    : [
        { id: 'sparse-matrix-section', num: '1', title: '1. Разреженная матрица TAMU', shortTitle: 'Матрица TAMU' },
        { id: 'sparse-solver-section', num: '2', title: '2. Параметры решателя Ax=b', shortTitle: 'Параметры Ax=b' },
        { id: 'sparse-convergence-section', num: '3', title: '3. Сходимость и телеметрия', shortTitle: 'Сходимость' },
      ];

  // Calculate current scroll progress (0 to 1)
  const updateScrollProgress = useCallback(() => {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (totalHeight <= 0) {
      setScrollProgress(0);
      return;
    }
    const current = Math.min(Math.max(window.scrollY / totalHeight, 0), 1);
    setScrollProgress(current);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    window.addEventListener('resize', updateScrollProgress);
    updateScrollProgress();

    return () => {
      window.removeEventListener('scroll', updateScrollProgress);
      window.removeEventListener('resize', updateScrollProgress);
    };
  }, [updateScrollProgress, studioMode]);

  // Handle Dragging / Clicking on Track
  const handleMoveToClientY = useCallback((clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const relativeY = clientY - rect.top;
    const fraction = Math.min(Math.max(relativeY / rect.height, 0), 1);

    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    const targetScrollY = fraction * totalHeight;

    window.scrollTo({
      top: targetScrollY,
      behavior: 'auto',
    });
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    isDraggingRef.current = true;
    handleMoveToClientY(e.clientY);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (isDraggingRef.current) {
        moveEvent.preventDefault();
        handleMoveToClientY(moveEvent.clientY);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    isDraggingRef.current = true;
    if (e.touches.length > 0) {
      handleMoveToClientY(e.touches[0].clientY);
    }

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (isDraggingRef.current && moveEvent.touches.length > 0) {
        handleMoveToClientY(moveEvent.touches[0].clientY);
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      isDraggingRef.current = false;
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
  };

  // Scroll to section helper
  const handleWaypointClick = (e: React.MouseEvent, sectionId: string) => {
    e.stopPropagation();
    if (onScrollToSection) {
      onScrollToSection(sectionId);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        const headerOffset = 70;
        const elementPosition = el.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      }
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  };

  const currentPercent = Math.round(scrollProgress * 100);

  return (
    <aside
      aria-label="Вертикальный навигатор и ползунок прокрутки"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setHoveredSection(null);
      }}
      className={`fixed right-2 sm:right-4 top-20 bottom-8 z-40 flex flex-col items-center select-none transition-all duration-300 ${
        isHovered || isDragging ? 'opacity-100 translate-x-0' : 'opacity-80 hover:opacity-100'
      }`}
    >
      {/* Container Card for Scroller */}
      <div className="flex flex-col items-center justify-between h-full py-2 px-1 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-800/90 shadow-2xl shadow-black/60 group w-9 sm:w-10">
        {/* Top Scroll Button */}
        <button
          type="button"
          onClick={scrollToTop}
          className="p-1 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 transition-all active:scale-90 cursor-pointer"
          title="В самый верх"
        >
          <ChevronUp className="w-4 h-4" />
        </button>

        {/* Interactive Track Area */}
        <div
          ref={trackRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="relative flex-1 w-full flex items-center justify-center my-2 cursor-pointer touch-none"
          title="Потяните ползунок или нажмите для быстрого перемещения по странице"
        >
          {/* Vertical Track Line */}
          <div className="absolute top-0 bottom-0 w-1.5 rounded-full bg-slate-800/90 overflow-hidden shadow-inner">
            {/* Filled Progress Bar inside track */}
            <div
              className="w-full bg-gradient-to-b from-cyan-500 to-indigo-500 transition-[height] duration-75 rounded-full"
              style={{ height: `${scrollProgress * 100}%` }}
            />
          </div>

          {/* Section Markers / Waypoints */}
          <div className="absolute inset-y-0 w-full flex flex-col justify-between py-3 pointer-events-none">
            {sections.map((sec, idx) => {
              const isActive = activeSection === sec.id;
              return (
                <div
                  key={sec.id}
                  className="relative flex items-center justify-center pointer-events-auto"
                >
                  <button
                    type="button"
                    onClick={(e) => handleWaypointClick(e, sec.id)}
                    onMouseEnter={() => setHoveredSection(sec.id)}
                    onMouseLeave={() => setHoveredSection(null)}
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-mono font-bold transition-all cursor-pointer shadow-md ${
                      isActive
                        ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-400/50 scale-110'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white hover:scale-110'
                    }`}
                  >
                    {sec.num}
                  </button>

                  {/* Tooltip on Hover */}
                  {hoveredSection === sec.id && (
                    <div className="absolute right-7 px-2.5 py-1 rounded-lg bg-slate-950/95 border border-slate-700 text-cyan-300 text-xs font-medium whitespace-nowrap shadow-xl backdrop-blur-md pointer-events-none animate-fadeIn flex items-center gap-1.5">
                      <span className="font-mono text-cyan-400 font-bold">{sec.num}.</span>
                      <span>{sec.shortTitle}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Draggable Handle / Thumb */}
          <div
            className="absolute left-1/2 -translate-x-1/2 transition-transform pointer-events-auto"
            style={{
              top: `calc(${scrollProgress * 100}% - 14px)`,
            }}
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shadow-lg transition-all cursor-grab active:cursor-grabbing ${
                isDragging
                  ? 'bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950 scale-125 ring-2 ring-cyan-300 shadow-cyan-500/50'
                  : 'bg-gradient-to-br from-cyan-500 to-indigo-600 text-slate-950 hover:scale-110 shadow-cyan-500/30'
              }`}
            >
              <div className="flex flex-col gap-0.5 items-center">
                <div className="w-3 h-0.5 bg-slate-950/70 rounded-full" />
                <div className="w-3 h-0.5 bg-slate-950/70 rounded-full" />
                <div className="w-3 h-0.5 bg-slate-950/70 rounded-full" />
              </div>
            </div>

            {/* Percentage Tooltip when dragging */}
            {(isDragging || isHovered) && (
              <div className="absolute right-9 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-cyan-950/90 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-bold shadow-lg whitespace-nowrap backdrop-blur-md pointer-events-none">
                {currentPercent}%
              </div>
            )}
          </div>
        </div>

        {/* Bottom Scroll Button */}
        <button
          type="button"
          onClick={scrollToBottom}
          className="p-1 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 transition-all active:scale-90 cursor-pointer"
          title="В самый низ"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
