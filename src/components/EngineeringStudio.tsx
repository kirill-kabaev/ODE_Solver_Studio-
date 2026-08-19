import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Rocket,
  Wind,
  Cpu,
  Compass,
  Zap,
  Activity,
  Layers,
  ShieldCheck,
  Flame,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Sliders,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Info,
  Radio,
  FileCode2,
  BookOpen,
} from 'lucide-react';
import { MathText } from './MathView';
import { AerodynamicsModule } from './aerodynamics/AerodynamicsModule';
import { EngineeringHandbookModal, HandbookTopicId } from './EngineeringHandbookModal';

export type EngineeringDomain = 'aero' | 'space' | 'eda';

export const EngineeringStudio: React.FC = () => {
  const [activeDomain, setActiveDomain] = useState<EngineeringDomain>('aero');
  const [activeAeroTab, setActiveAeroTab] = useState<string>('presets');
  const [isHandbookOpen, setIsHandbookOpen] = useState<boolean>(false);
  const [handbookTopicId, setHandbookTopicId] = useState<HandbookTopicId>('presets');

  const handleAeroTabChange = useCallback((tab: string) => {
    setActiveAeroTab((prev) => (prev !== tab ? tab : prev));
  }, []);

  const getActiveTopic = (): { topicId: HandbookTopicId; label: string } => {
    if (activeDomain === 'space') {
      return { topicId: 'space_gnc', label: 'Космос & GNC' };
    }
    if (activeDomain === 'eda') {
      return { topicId: 'eda_avionics', label: 'EDA & Авионика' };
    }
    // Aero domain:
    switch (activeAeroTab) {
      case 'presets':
        return { topicId: 'presets', label: 'Каталог Пресетов' };
      case 'vlm':
        return { topicId: 'vlm', label: '3D Метод Вихревой Решетки (VLM)' };
      case 'status_monitor':
        return { topicId: 'status_monitor', label: 'Монитор Сил & 3D' };
      case 'wind_tunnel':
        return { topicId: 'wind_tunnel', label: 'Аэродинамическая Труба' };
      case 'flutter':
        return { topicId: 'flutter', label: 'Флаттер (FSI)' };
      case '6dof':
        return { topicId: '6dof', label: 'Динамика 6-DoF' };
      case 'architecture':
        return { topicId: 'architecture', label: 'Архитектура Солвера' };
      default:
        return { topicId: 'overview', label: 'Обзор' };
    }
  };

  const handleOpenCurrentHandbook = () => {
    const current = getActiveTopic();
    setHandbookTopicId(current.topicId);
    setIsHandbookOpen(true);
  };

  const activeTopicInfo = getActiveTopic();

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 space-y-6 animate-fadeIn">
      {/* Top Banner: Engineering Mission & Mathematical Backing */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 p-4 sm:p-6 shadow-xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <Rocket className="w-3 h-3" /> Прикладной Модуль Инжиниринга
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-mono">
                Aerospace & Microelectronics
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Инженерная Вычислительная Студия</span>
              <span className="text-sm font-normal text-slate-400 hidden sm:inline">|</span>
              <span className="text-sm font-normal text-cyan-400 hidden sm:inline">CFD • GNC • EDA</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Прямое применение 3-х стадийного разреженного солвера, параллельных крыловских конвейеров и интеграторов Рунге-Кутты к задачам аэродинамики полета, космической навигации и проектирования радиационно-стойкой авионики.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
            {/* Single Unified Info & Handbook Trigger Button with Active Section Detection */}
            <button
              type="button"
              onClick={handleOpenCurrentHandbook}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-950/60 transition-all cursor-pointer border border-cyan-400/40"
              title={`Открыть научно-технический справочник: ${activeTopicInfo.label}`}
            >
              <Info className="w-4 h-4 text-slate-950" />
              <span>Инфо & Справочник</span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-950/25 text-[10px] font-mono font-bold tracking-tight">
                [{activeTopicInfo.label}]
              </span>
            </button>

            <div className="flex items-center gap-2 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800">
              <div className="flex flex-col text-right pr-2 hidden lg:flex">
                <span className="text-[10px] text-slate-400 font-mono">Вычислительное Ядро</span>
                <span className="text-xs font-bold text-cyan-300 font-mono">CSR + AMG + RK4</span>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Domain Navigation Tabs */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-slate-800/80 pt-4">
          <button
            onClick={() => setActiveDomain('aero')}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer ${
              activeDomain === 'aero'
                ? 'bg-cyan-950/60 border-cyan-500/60 text-white shadow-lg shadow-cyan-950/50'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className={`p-2 rounded-lg ${activeDomain === 'aero' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <span>1. Аэродинамика и CFD</span>
                {activeDomain === 'aero' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
              </div>
              <div className="text-[11px] text-slate-400 line-clamp-1">Навье-Стокс, Флаттер, 6-DoF, Пограничный слой</div>
            </div>
          </button>

          <button
            onClick={() => setActiveDomain('space')}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer ${
              activeDomain === 'space'
                ? 'bg-indigo-950/60 border-indigo-500/60 text-white shadow-lg shadow-indigo-950/50'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className={`p-2 rounded-lg ${activeDomain === 'space' ? 'bg-indigo-500 text-white font-bold' : 'bg-slate-800 text-slate-400'}`}>
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <span>2. Космология и GNC</span>
                {activeDomain === 'space' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
              </div>
              <div className="text-[11px] text-slate-400 line-clamp-1">Орбиты Ламберта, TVC, Калман, Теплозащита</div>
            </div>
          </button>

          <button
            onClick={() => setActiveDomain('eda')}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer ${
              activeDomain === 'eda'
                ? 'bg-purple-950/60 border-purple-500/60 text-white shadow-lg shadow-purple-950/50'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className={`p-2 rounded-lg ${activeDomain === 'eda' ? 'bg-purple-500 text-white font-bold' : 'bg-slate-800 text-slate-400'}`}>
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <span>3. EDA, Чипы и Авионика</span>
                {activeDomain === 'eda' && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
              </div>
              <div className="text-[11px] text-slate-400 line-clamp-1">Place & Route, Максвелл, TMR, Rad-Hard</div>
            </div>
          </button>
        </div>
      </div>

      {/* Main Active Domain Module */}
      {activeDomain === 'aero' && (
        <AerodynamicsModule
          onTabChange={handleAeroTabChange}
        />
      )}
      {activeDomain === 'space' && <OrbitalGNCModule />}
      {activeDomain === 'eda' && <MicroelectronicsEDAModule />}

      {/* Full Interactive Engineering Handbook Modal */}
      <EngineeringHandbookModal
        isOpen={isHandbookOpen}
        onClose={() => setIsHandbookOpen(false)}
        initialTopicId={handbookTopicId}
      />
    </div>
  );
};

// ============================================================================
// 2. КОСМОЛОГИЯ, АСТРОДИНАМИКА И GNC (ОРБИТЫ ЛАМБЕРТА, ТЕПЛОЗАЩИТА, TVC)
// ============================================================================
interface DomainModuleProps {
  onOpenHandbook?: (topicId: HandbookTopicId) => void;
}

const OrbitalGNCModule: React.FC<DomainModuleProps> = ({ onOpenHandbook }) => {
  const [mission, setMission] = useState<'earth_mars' | 'earth_moon' | 'gto_geo'>('earth_mars');
  const [gimbalAngle, setGimbalAngle] = useState<number>(2.5); // Thrust vector control angle
  const [kalmanNoise, setKalmanNoise] = useState<number>(0.35);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mission parameters
  const missionInfo = {
    earth_mars: { name: 'Земля → Марс (Hohmann / Lambert)', deltaV1: 3.6, deltaV2: 2.1, tofDays: 259, c3: 15.2 },
    earth_moon: { name: 'Земля → Луна (Транслунный инжект)', deltaV1: 3.1, deltaV2: 0.8, tofDays: 3.8, c3: -1.8 },
    gto_geo: { name: 'ГПО → ГСО (Геостационарный апогей)', deltaV1: 1.5, deltaV2: 1.5, tofDays: 0.5, c3: -4.5 },
  }[mission];

  // Orbital Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    const render = () => {
      angle += 0.015;
      const w = canvas.width;
      const h = canvas.height;

      // Dark space background
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, w, h);

      // Starfield background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let s = 0; s < 40; s++) {
        const sx = (s * 37) % w;
        const sy = (s * 59) % h;
        ctx.fillRect(sx, sy, 1, 1);
      }

      const cx = w * 0.5;
      const cy = h * 0.5;

      // Sun
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Earth Orbit
      const rEarth = 85;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, rEarth, 0, Math.PI * 2);
      ctx.stroke();

      // Mars / Target Orbit
      const rMars = 135;
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
      ctx.beginPath();
      ctx.arc(cx, cy, rMars, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Lambert Transfer Ellipse
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const a = (rEarth + rMars) / 2;
      const c = a - rEarth;
      ctx.ellipse(cx - c * 0.5, cy, a, (rEarth + rMars) * 0.42, 0, 0, Math.PI);
      ctx.stroke();

      // Earth position
      const xEarth = cx + Math.cos(angle) * rEarth;
      const yEarth = cy + Math.sin(angle) * rEarth;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(xEarth, yEarth, 6, 0, Math.PI * 2);
      ctx.fill();

      // Mars position
      const xMars = cx + Math.cos(angle * 0.53 + 1.2) * rMars;
      const yMars = cy + Math.sin(angle * 0.53 + 1.2) * rMars;
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(xMars, yMars, 5, 0, Math.PI * 2);
      ctx.fill();

      // Spacecraft on Lambert Trajectory
      const shipT = (angle % Math.PI) / Math.PI; // 0 to 1
      const shipX = cx - c * 0.5 + Math.cos(Math.PI - shipT * Math.PI) * a;
      const shipY = cy - Math.sin(shipT * Math.PI) * (rEarth + rMars) * 0.42;

      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(shipX, shipY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Thrust vector flame
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(shipX, shipY);
      ctx.lineTo(shipX - 10, shipY + 5);
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [mission]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Orbital Canvas */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-bold text-white">Межпланетный Навигатор (Задача Ламберта & GNC)</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700">
                Δv Общий: {(missionInfo.deltaV1 + missionInfo.deltaV2).toFixed(1)} км/с
              </span>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 h-72 sm:h-80">
            <canvas ref={canvasRef} width={640} height={320} className="w-full h-full object-cover" />
          </div>

          {/* Mission Switcher */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: 'earth_mars', label: 'Земля → Марс' },
              { id: 'earth_moon', label: 'Земля → Луна' },
              { id: 'gto_geo', label: 'ГПО → ГСО' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMission(m.id as any)}
                className={`py-2 px-3 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                  mission === m.id
                    ? 'bg-indigo-950 border-indigo-500 text-indigo-300 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: GNC & Kalman Telemetry */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-xl">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <Compass className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Параметры Перелета (Lambert)</h3>
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Импульс отлета (Δv₁):</span>
                <span className="font-bold text-indigo-300">+{missionInfo.deltaV1} км/с</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Импульс захвата (Δv₂):</span>
                <span className="font-bold text-purple-300">+{missionInfo.deltaV2} км/с</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Время перелета (ToF):</span>
                <span className="font-bold text-cyan-300">{missionInfo.tofDays} суток</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Угол кардана TVC (δ):</span>
                <span className="font-bold text-amber-300">{gimbalAngle.toFixed(1)}°</span>
              </div>
            </div>

            {/* Live TVC Angle Slider */}
            <div className="space-y-1 pt-2">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>Коррекция вектора тяги (TVC):</span>
                <span className="text-white font-bold">{gimbalAngle.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="-8"
                max="8"
                step="0.2"
                value={gimbalAngle}
                onChange={(e) => setGimbalAngle(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-[11px] text-slate-300 space-y-1">
            <div className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Интегратор траекторий
            </div>
            <p className="text-[10px] text-slate-400">
              Гравитационная задача $N$ тел интегрируется методом <strong className="text-white">Рунге-Кутты RK4</strong> с адаптивным шагом, а фильтр Калмана EKF сглаживает шумы IMU.
            </p>
          </div>
        </div>
      </div>

      {/* Theoretical Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
            <Compass className="w-4 h-4" /> 2.1 Краевая Задача Ламберта
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            <MathText text="Вычисление орбитальной связки между положениями $\mathbf{r}_1$ и $\mathbf{r}_2$ за время $\Delta t$:" />
          </p>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
            <MathText text="\sqrt{\mu}\Delta t = a^{3/2}(\alpha - \beta - (\sin\alpha - \sin\beta))" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
            <Activity className="w-4 h-4" /> 2.2 Расширенный Фильтр Калмана (EKF)
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Очистка телеметрии от шумов датчиков и предсказание истинного вектора состояния аппарата:
          </p>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
            <MathText text="\mathbf{K}_k = \mathbf{P}_k^- \mathbf{H}_k^T (\mathbf{H}_k \mathbf{P}_k^- \mathbf{H}_k^T + \mathbf{R}_k)^{-1}" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
            <Flame className="w-4 h-4" /> 2.3 Тепловые Нагрузки Спуска
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            <MathText text="Расчет нагрева абляционного экрана при гиперзвуковом входе в атмосферу ($M > 20$):" />
          </p>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
            <MathText text="q_{\text{stag}} = C \sqrt{\frac{\rho_\infty}{R_{\text{nose}}}} V_\infty^3" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. МИКРОЭЛЕКТРОНИКА, EDA, ЧИПЫ И АВИОНИКА (PLACE & ROUTE, TMR, RAD-HARD)
// ============================================================================
const MicroelectronicsEDAModule: React.FC<DomainModuleProps> = ({ onOpenHandbook }) => {
  const [coreErrors, setCoreErrors] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [injectedCount, setInjectedCount] = useState<number>(0);
  const [isOptimizedEDA, setIsOptimizedEDA] = useState<boolean>(true);

  // Inject cosmic radiation particle (Single Event Upset - SEU)
  const handleInjectSEU = () => {
    setInjectedCount((prev) => prev + 1);
    // Randomly flip a bit in Core A, B or C
    const targetCore = Math.floor(Math.random() * 3);
    const newErrors: [boolean, boolean, boolean] = [...coreErrors];
    newErrors[targetCore] = true;
    setCoreErrors(newErrors);

    // Auto-heal / self-correct by TMR majority voter after 1.5s
    setTimeout(() => {
      setCoreErrors([false, false, false]);
    }, 1600);
  };

  const hasAnyError = coreErrors.some((e) => e);
  const voterOutput = '100% ВАЛИДНО (Мажоритарное решение 2:1)';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: TMR 3-Core Fault-Tolerant Simulator */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              <h2 className="text-sm font-bold text-white">Тройное Резервирование Авионики (TMR Fault-Tolerance)</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInjectSEU}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold font-mono transition-all cursor-pointer shadow-md"
              >
                <Zap className="w-3.5 h-3.5" /> Инжектировать SEU
              </button>
            </div>
          </div>

          {/* 3 Processors Visual Layout */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
            {[
              { id: 'A', name: 'Процессор А (Core 0)', error: coreErrors[0] },
              { id: 'B', name: 'Процессор B (Core 1)', error: coreErrors[1] },
              { id: 'C', name: 'Процессор C (Core 2)', error: coreErrors[2] },
            ].map((core, idx) => (
              <div
                key={core.id}
                className={`p-3 rounded-xl border transition-all flex flex-col items-center justify-center text-center gap-2 ${
                  core.error
                    ? 'bg-rose-950/60 border-rose-500 shadow-lg shadow-rose-950/50 animate-pulse'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <Cpu className={`w-8 h-8 ${core.error ? 'text-rose-400' : 'text-purple-400'}`} />
                <div>
                  <div className="text-xs font-bold text-white font-mono">{core.name}</div>
                  <div className={`text-[10px] font-mono mt-0.5 ${core.error ? 'text-rose-300 font-bold' : 'text-emerald-400'}`}>
                    {core.error ? '⚠️ СБОЙ БИТА (SEU)' : '✅ РАСЧЕТ ВЕРЕН'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Majority Voter Logic Block */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${hasAnyError ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'}`}>
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Мажоритарный Вентиль (Voter)</div>
                <div className="text-[11px] text-slate-400">
                  {hasAnyError ? 'Обнаружен сбойный поток — ошибка нивелирована голосованием 2:1' : 'Все 3 вычислительных ядра синхронизированы'}
                </div>
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs font-mono font-bold">
              ВЫХОД БОРТОВОЙ ЭВМ: 100% OK
            </div>
          </div>
        </div>

        {/* Right: EDA Place & Route Matrix Link */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-xl">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">EDA Трассировка Кристалла</h3>
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Вентилей на чипе:</span>
                <span className="font-bold text-purple-300">12 400 000</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Оптимизация AMD/METIS:</span>
                <span className="font-bold text-emerald-300">-64.2% длины трасс</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Паразитная емкость:</span>
                <span className="font-bold text-cyan-300">0.14 пФ (Норма)</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Радиационная доза (TID):</span>
                <span className="font-bold text-amber-300">300 krad(Si) Rad-Hard</span>
              </div>
            </div>

            <button
              onClick={() => setIsOptimizedEDA(!isOptimizedEDA)}
              className="w-full py-2 px-3 rounded-xl bg-purple-950/70 hover:bg-purple-900/70 text-purple-300 border border-purple-700/60 text-xs font-mono font-bold transition-all cursor-pointer text-center"
            >
              {isOptimizedEDA ? '⚡ Графовая оптимизация активна' : 'Включить графовый Place & Route'}
            </button>
          </div>

          <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 text-[11px] text-slate-300 space-y-1">
            <div className="font-bold text-purple-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Математика EDA и Максвелла
            </div>
            <p className="text-[10px] text-slate-400">
              Размещение транзисторов оптимизируется алгоритмами <strong className="text-white">AMD / RCM</strong>, а электромагнитные наводки плат решаются уравнениями Максвелла на GPU CUDA.
            </p>
          </div>
        </div>
      </div>

      {/* Theoretical Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
            <Cpu className="w-4 h-4" /> 3.1 Топология Place & Route
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Минимизация длины межсоединений методом спектральной графовой кластеризации матрицы смежности:
          </p>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
            <MathText text="\min_{\mathbf{x}} \sum_{(u,v)\in E} w_{uv} (x_u - x_v)^2 \quad \text{s.t.} \quad \mathbf{x}^T \mathbf{1} = 0" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
            <Activity className="w-4 h-4" /> 3.2 Целостность Сигналов (Signal Integrity)
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Численное моделирование паразитных наводок на СВЧ-платах по трехмерным уравнениям Максвелла:
          </p>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
            <MathText text="\nabla \times \mathbf{E} = -\frac{\partial \mathbf{B}}{\partial t}, \quad \nabla \times \mathbf{H} = \mathbf{J} + \frac{\partial \mathbf{D}}{\partial t}" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <ShieldCheck className="w-4 h-4" /> 3.3 Надежность Авионики (TMR)
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Вероятность безотказной работы системы тройного резервирования с мажоритарным органом:
          </p>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
            <MathText text="R_{\text{TMR}}(t) = 3 R_{\text{core}}^2(t) - 2 R_{\text{core}}^3(t)" />
          </div>
        </div>
      </div>
    </div>
  );
};
