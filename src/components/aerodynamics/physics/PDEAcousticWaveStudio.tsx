import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Activity,
  Zap,
  Sliders,
  RotateCcw,
  Play,
  Pause,
  Layers,
  Sparkles,
  Volume2,
  Maximize2,
  RefreshCw,
  Info,
  Shield,
  Radio,
} from 'lucide-react';

export type SimulationObstacle = 'none' | 'airfoil' | 'supersonic_wedge' | 'acoustic_duct' | 'double_slit';

export const PDEAcousticWaveStudio: React.FC = () => {
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [waveSpeedC, setWaveSpeedC] = useState<number>(1.2);
  const [dampingGamma, setDampingGamma] = useState<number>(0.003);
  const [sourceFrequencyHz, setSourceFrequencyHz] = useState<number>(3.5);
  const [sourceMach, setSourceMach] = useState<number>(0.0); // 0 to 1.8 Mach
  const [obstacleType, setObstacleType] = useState<SimulationObstacle>('airfoil');
  const [colorPalette, setColorPalette] = useState<'cyan_fire' | 'navy_neon' | 'monochrome'>('cyan_fire');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Grid dimensions for high-performance 2D PDE Solver
  const GRID_W = 160;
  const GRID_H = 100;

  // State buffers for 2D wave equation: u_prev, u_curr, u_next, obstacles
  const buffersRef = useRef<{
    uPrev: Float32Array;
    uCurr: Float32Array;
    uNext: Float32Array;
    walls: Uint8Array;
  }>({
    uPrev: new Float32Array(GRID_W * GRID_H),
    uCurr: new Float32Array(GRID_W * GRID_H),
    uNext: new Float32Array(GRID_W * GRID_H),
    walls: new Uint8Array(GRID_W * GRID_H),
  });

  // Re-generate obstacles on obstacleType change
  useEffect(() => {
    const { walls, uPrev, uCurr, uNext } = buffersRef.current;
    walls.fill(0);
    uPrev.fill(0);
    uCurr.fill(0);
    uNext.fill(0);

    const cx = Math.floor(GRID_W / 2);
    const cy = Math.floor(GRID_H / 2);

    if (obstacleType === 'airfoil') {
      // Draw NACA airfoil shape inside grid
      for (let x = -25; x <= 25; x++) {
        const xc = (x + 25) / 50; // 0 to 1
        const yt = 5 * 0.15 * (0.2969 * Math.sqrt(Math.max(0, xc)) - 0.126 * xc - 0.3516 * xc * xc + 0.2843 * Math.pow(xc, 3) - 0.1015 * Math.pow(xc, 4));
        const halfThick = Math.floor(yt * 25);
        for (let y = -halfThick; y <= halfThick; y++) {
          const gx = cx + x;
          const gy = cy + y;
          if (gx >= 0 && gx < GRID_W && gy >= 0 && gy < GRID_H) {
            walls[gy * GRID_W + gx] = 1;
          }
        }
      }
    } else if (obstacleType === 'supersonic_wedge') {
      // Symmetrical wedge
      for (let x = -20; x <= 30; x++) {
        const halfThick = Math.max(0, Math.floor((x + 20) * 0.35));
        for (let y = -halfThick; y <= halfThick; y++) {
          const gx = cx + x;
          const gy = cy + y;
          if (gx >= 0 && gx < GRID_W && gy >= 0 && gy < GRID_H) {
            walls[gy * GRID_W + gx] = 1;
          }
        }
      }
    } else if (obstacleType === 'acoustic_duct') {
      // Sound baffle acoustic muffler
      for (let x = cx - 35; x <= cx + 35; x++) {
        const gy1 = cy - 20;
        const gy2 = cy + 20;
        walls[gy1 * GRID_W + x] = 1;
        walls[gy2 * GRID_W + x] = 1;
      }
      // Internal acoustic baffles
      for (let y = cy - 20; y <= cy - 5; y++) walls[y * GRID_W + (cx - 15)] = 1;
      for (let y = cy + 5; y <= cy + 20; y++) walls[y * GRID_W + (cx + 15)] = 1;
    } else if (obstacleType === 'double_slit') {
      // Young double slit diffraction barrier
      for (let y = 0; y < GRID_H; y++) {
        // Leave 2 slits
        if (Math.abs(y - (cy - 12)) > 3 && Math.abs(y - (cy + 12)) > 3) {
          walls[y * GRID_W + (cx - 10)] = 1;
        }
      }
    }
  }, [obstacleType]);

  // Main 2D Wave PDE Finite Difference Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let simTime = 0;
    let sourcePosX = 25;

    const imgData = ctx.createImageData(GRID_W, GRID_H);
    const data32 = new Uint32Array(imgData.data.buffer);

    const render = () => {
      if (isRunning) {
        simTime += 0.05;

        const { uPrev, uCurr, uNext, walls } = buffersRef.current;
        const c2 = waveSpeedC * waveSpeedC;
        const dt = 0.5;
        const dx = 1.0;
        const cour = (c2 * dt * dt) / (dx * dx); // CFL stability parameter

        // Update moving wave source
        if (sourceMach > 0) {
          sourcePosX += sourceMach * 0.45;
          if (sourcePosX > GRID_W - 20) sourcePosX = 20;
        } else {
          sourcePosX = obstacleType === 'double_slit' ? 20 : 35;
        }

        const srcX = Math.floor(sourcePosX);
        const srcY = Math.floor(GRID_H / 2);
        const srcVal = Math.sin(simTime * sourceFrequencyHz) * 2.5;

        // PDE Step: u_next = 2*u_curr - u_prev + Courant * Laplacian(u_curr) - Damping
        for (let y = 1; y < GRID_H - 1; y++) {
          const row = y * GRID_W;
          for (let x = 1; x < GRID_W - 1; x++) {
            const idx = row + x;

            if (walls[idx] === 1) {
              uNext[idx] = 0;
              continue;
            }

            // 5-point discrete Laplace operator: (u[x+1] + u[x-1] + u[y+1] + u[y-1] - 4*u)
            const laplacian =
              uCurr[idx + 1] +
              uCurr[idx - 1] +
              uCurr[idx + GRID_W] +
              uCurr[idx - GRID_W] -
              4.0 * uCurr[idx];

            let val = 2.0 * uCurr[idx] - uPrev[idx] + cour * laplacian - dampingGamma * (uCurr[idx] - uPrev[idx]);

            // Dirichlet / Absorbing boundary damping at grid edges
            if (x <= 4 || x >= GRID_W - 5 || y <= 4 || y >= GRID_H - 5) {
              val *= 0.92;
            }

            uNext[idx] = val;
          }
        }

        // Apply Source
        if (srcX >= 0 && srcX < GRID_W && srcY >= 0 && srcY < GRID_H) {
          uNext[srcY * GRID_W + srcX] = srcVal;
          uNext[srcY * GRID_W + srcX + 1] = srcVal * 0.8;
          uNext[(srcY + 1) * GRID_W + srcX] = srcVal * 0.8;
        }

        // Swap state buffers: prev = curr, curr = next
        uPrev.set(uCurr);
        uCurr.set(uNext);

        // Render buffer to Canvas ImageData
        for (let i = 0; i < GRID_W * GRID_H; i++) {
          if (walls[i] === 1) {
            // Obstacle color (slate-300 / white border)
            data32[i] = 0xffe2e8f0;
            continue;
          }

          const amp = uCurr[i];
          const clamped = Math.max(-2.0, Math.min(2.0, amp));
          const norm = (clamped + 2.0) / 4.0; // 0 to 1

          let r = 0, g = 0, b = 0;

          if (colorPalette === 'cyan_fire') {
            if (amp >= 0) {
              // Positive pressure: cyan to white
              const p = Math.min(1.0, amp / 1.5);
              r = Math.floor(56 + p * 199);
              g = Math.floor(189 + p * 66);
              b = Math.floor(248 + p * 7);
            } else {
              // Negative pressure: deep indigo to purple
              const p = Math.min(1.0, -amp / 1.5);
              r = Math.floor(168 * p);
              g = Math.floor(85 * p);
              b = Math.floor(247 * p + 40);
            }
          } else if (colorPalette === 'navy_neon') {
            const p = Math.floor(norm * 255);
            r = p > 128 ? (p - 128) * 2 : 0;
            g = p;
            b = 255 - p;
          } else {
            const p = Math.floor(norm * 255);
            r = p;
            g = p;
            b = p;
          }

          // ABGR pack for little-endian canvas
          data32[i] = 0xff000000 | (b << 16) | (g << 8) | r;
        }

        ctx.putImageData(imgData, 0, 0);

        // Scale and draw to display
        ctx.drawImage(canvas, 0, 0, GRID_W, GRID_H, 0, 0, canvas.width, canvas.height);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isRunning, waveSpeedC, dampingGamma, sourceFrequencyHz, sourceMach, obstacleType, colorPalette]);

  // Click on canvas to drop wave impulse
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = Math.floor(((e.clientX - rect.left) / rect.width) * GRID_W);
    const clickY = Math.floor(((e.clientY - rect.top) / rect.height) * GRID_H);

    const { uCurr } = buffersRef.current;
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const gx = clickX + dx;
        const gy = clickY + dy;
        if (gx >= 0 && gx < GRID_W && gy >= 0 && gy < GRID_H) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= 4) {
            uCurr[gy * GRID_W + gx] += 3.5 * Math.cos((dist / 4) * (Math.PI / 2));
          }
        }
      }
    }
  };

  const handleReset = () => {
    const { uPrev, uCurr, uNext } = buffersRef.current;
    uPrev.fill(0);
    uCurr.fill(0);
    uNext.fill(0);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                2D Волновой PDE Решатель & Аэроакустическая Лаборатория
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-cyan-950 text-cyan-300 border border-cyan-700">
                  Finite Difference 2D
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Численное решение двумерного волнового уравнения ∂²u/∂t² = c²∇²u, эффект Доплера (M &gt; 1), конус Маха и дифракция на профилях.
              </p>
            </div>
          </div>
        </div>

        {/* Play/Pause & Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer shadow-md ${
              isRunning
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-amber-950/80 border-amber-500 text-amber-300'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? 'Пауза' : 'Пуск'}
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-mono transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Сброс Поля
          </button>
        </div>
      </div>

      {/* Main Grid Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Obstacle Geometry Selector */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl">
            <span className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider border-b border-slate-800 pb-2">
              <Layers className="w-4 h-4 text-cyan-400" /> Геометрия Препятствия
            </span>

            <div className="grid grid-cols-1 gap-1.5">
              {[
                { id: 'airfoil', label: 'Аэродинамический Профиль NACA', desc: 'Обтекание и дифракция акустических волн на кромках' },
                { id: 'supersonic_wedge', label: 'Сверхзвуковой Клин (Mach Cone)', desc: 'Формирование конической ударной волны' },
                { id: 'acoustic_duct', label: 'Акустический Глушитель (Duct)', desc: 'Интерференция и затухание в лабиринтном канале' },
                { id: 'double_slit', label: 'Двойная Щель (Интерференция)', desc: 'Классический опыт Юнга с дифракционными максимумами' },
                { id: 'none', label: 'Свободное Поле (Free Field)', desc: 'Идеальное бесконечное пространство без отражений' },
              ].map((obs) => (
                <button
                  key={obs.id}
                  onClick={() => setObstacleType(obs.id as SimulationObstacle)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    obstacleType === obs.id
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold font-mono">{obs.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{obs.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Physical Parameters Slider Box */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5 shadow-xl">
            <span className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider border-b border-slate-800 pb-2">
              <Sliders className="w-4 h-4 text-indigo-400" /> Параметры Среды и Источника
            </span>

            {/* Source Mach Number (Doppler Effect) */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Число Маха источника (M):</span>
                <strong className={`font-mono ${sourceMach >= 1.0 ? 'text-rose-400' : 'text-cyan-400'}`}>
                  M = {sourceMach.toFixed(2)} {sourceMach >= 1.0 ? '(Сверхзвук!)' : ''}
                </strong>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.6"
                step="0.1"
                value={sourceMach}
                onChange={(e) => setSourceMach(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <p className="text-[10px] text-slate-500">При M &gt; 1 источник обгоняет звуковые волны, формируя конус Маха.</p>
            </div>

            {/* Frequency Hz */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Частота излучения (f0):</span>
                <strong className="font-mono text-purple-300">{sourceFrequencyHz.toFixed(1)} Гц</strong>
              </div>
              <input
                type="range"
                min="1.0"
                max="8.0"
                step="0.5"
                value={sourceFrequencyHz}
                onChange={(e) => setSourceFrequencyHz(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            {/* Damping Gamma */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Вязкое затухание среды (γ):</span>
                <strong className="font-mono text-slate-300">{dampingGamma.toFixed(4)}</strong>
              </div>
              <input
                type="range"
                min="0.0005"
                max="0.015"
                step="0.0005"
                value={dampingGamma}
                onChange={(e) => setDampingGamma(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Right 2D Simulation Canvas & Interactive HUD (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex justify-between items-center text-xs font-mono text-slate-400 flex-wrap gap-2">
              <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse" /> Интерактивное 2D Поле Давления P(x, y, t)
              </span>
              <span className="text-[11px] text-slate-400">Кликните по полю для создания волны</span>
            </div>

            {/* Canvas Container */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 h-80 sm:h-96 flex items-center justify-center cursor-crosshair">
              <canvas
                ref={canvasRef}
                width={GRID_W}
                height={GRID_H}
                onClick={handleCanvasClick}
                className="w-full h-full object-cover rendering-pixelated"
                style={{ imageRendering: 'pixelated' }}
              />

              {/* Physical Overlay HUD Tag */}
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-slate-300 backdrop-blur-md">
                PDE: <span className="text-cyan-300">∂²u/∂t² = c²∇²u - γ·∂u/∂t</span>
              </div>

              {sourceMach >= 1.0 && (
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-500/50 text-[10px] font-mono text-rose-300 backdrop-blur-md animate-pulse">
                  ⚠️ Ударная волна Маха (sin μ = 1/M = {(1 / sourceMach).toFixed(2)})
                </div>
              )}
            </div>

            {/* Bottom Insight Footer */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-slate-400">
              <div>
                Разрешение сетки: <strong className="text-slate-200">160 × 100 узлов</strong>
              </div>
              <div>
                Условие устойчивости Куранта: <strong className="text-emerald-400">CFL &lt; 0.5 (Устойчив)</strong>
              </div>
              <div>
                Угол конуса Маха (μ): <strong className="text-amber-300">{sourceMach >= 1.0 ? `${((Math.asin(1 / sourceMach) * 180) / Math.PI).toFixed(1)}°` : '—'}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
