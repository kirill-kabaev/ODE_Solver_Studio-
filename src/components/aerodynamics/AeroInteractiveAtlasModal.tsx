import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Sparkles,
  Wind,
  Layers,
  Compass,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  Info,
  Sliders,
  Scale,
  Zap,
} from 'lucide-react';
import { MathView } from '../MathView';

interface AeroAtlasProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AtlasTopic {
  id: string;
  title: string;
  shortDesc: string;
  category: string;
  formula: string;
  variables: { sym: string; name: string; unit: string; desc: string }[];
  insight: string;
}

const ATLAS_TOPICS: AtlasTopic[] = [
  {
    id: 'lift_origin',
    title: '1. Природа Подъемной Силы: Бернулли vs Ньютон',
    shortDesc: 'Циркуляция скорости Жуковского Г, скос потока и разность давлений верх/низ.',
    category: 'Фундаментальная Теория',
    formula: 'L = \\rho \\cdot V_\\infty \\cdot \\Gamma = C_L \\cdot \\frac{1}{2} \\rho V^2 S',
    variables: [
      { sym: 'L', name: 'Подъемная сила', unit: 'Ньютоны (Н)', desc: 'Результирующая сила, перпендикулярная набегающему потоку.' },
      { sym: 'Γ', name: 'Циркуляция скорости (Теорема Жуковского)', unit: 'м²/с', desc: 'Интеграл вектора скорости по замкнутому контуру вокруг профиля.' },
      { sym: 'ρ', name: 'Плотность воздуха', unit: 'кг/м³', desc: '1.225 кг/м³ на уровне моря.' },
      { sym: 'V', name: 'Истинная воздушная скорость', unit: 'м/с', desc: 'Скорость набегающего потока (TAS).' },
      { sym: 'S', name: 'Площадь крыла в плане', unit: 'м²', desc: 'Проекция несущей поверхности.' },
    ],
    insight: 'Подъемная сила создается не "разницей путей" частиц (школьный миф), а скосом потока вниз (3-й закон Ньютона) и сопутствующим разрежением над верхней кромкой крыла по закону Бернулли.',
  },
  {
    id: 'induced_drag',
    title: '2. Индуктивное Сопротивление и Концевые Вихри',
    shortDesc: 'Перетекание воздуха с нижней поверхности (высокое давление) на верхнюю (разрежение).',
    category: 'Аэродинамическое Сопротивление',
    formula: 'C_{Di} = \\frac{C_L^2}{\\pi \\cdot AR \\cdot e}, \\quad AR = \\frac{b^2}{S}',
    variables: [
      { sym: 'C_Di', name: 'Коэффициент индуктивного сопротивления', unit: 'безразмерный', desc: 'Плата за создание подъемной силы конечноразмерным крылом.' },
      { sym: 'AR', name: 'Удлинение крыла (Aspect Ratio)', unit: 'ед.', desc: 'Отношение квадрата размаха к площади крыла (b²/S).' },
      { sym: 'e', name: 'Фактор эффективности Освальда', unit: '0.75...0.95', desc: 'Характеризует близость формы крыла к идеальному эллипсу.' },
    ],
    insight: 'Для минимизации индуктивного сопротивления на взлете и в наборе высоты увеличивают удлинение крыла (как у планеров AR=30) или устанавливают законцовки-винглеты.',
  },
  {
    id: 'reynolds_physics',
    title: '3. Физика Пограничного Слоя и Число Рейнольдса',
    shortDesc: 'Борьба сил инерции и сил молекулярной вязкости в тонком слое воздуха у обшивки.',
    category: 'Пограничный Слой & Вязкость',
    formula: 'Re = \\frac{\\rho \\cdot V \\cdot c}{\\mu} = \\frac{\\text{Силы Инерции}}{\\text{Силы Вязкости}}',
    variables: [
      { sym: 'Re', name: 'Число Рейнольдса', unit: 'безразмерный', desc: 'Ключевой критерий гидроаэродинамического подобия течений.' },
      { sym: 'c', name: 'Средняя аэродинамическая хорда (САХ)', unit: 'метры (м)', desc: 'Характерный линейный размер крыла.' },
      { sym: 'μ', name: 'Динамическая вязкость воздуха', unit: 'Па·с', desc: '≈ 1.81 × 10⁻⁵ Па·с при 15 °C.' },
    ],
    insight: 'При малых Re (< 100k, FPV-дроны) пограничный слой ламинарен и легко отрывается даже на малых углах атаки. При высоких Re (> 5M) развитая турбулентность удерживает поток прижатым к крылу.',
  },
  {
    id: 'static_stability',
    title: '4. Статическая Устойчивость и Фокус Крыла (Нейтральная Точка)',
    shortDesc: 'Почему центр тяжести самолета ОБЯЗАН находиться впереди фокуса нейтральной точки.',
    category: 'Динамика & Устойчивость',
    formula: 'C_m = C_{m0} + C_{m\\alpha} \\cdot \\alpha, \\quad C_{m\\alpha} = -C_{L\\alpha} \\cdot \\frac{X_F - X_{CG}}{b_{MAC}} < 0',
    variables: [
      { sym: 'Cm', name: 'Коэффициент момента тангажа', unit: 'безразмерный', desc: 'Знак плюс — кабрирование (задирание носа), минус — пикирование.' },
      { sym: 'X_F', name: 'Аэродинамический фокус (нейтральная точка)', unit: 'м (% САХ)', desc: 'Точка приложения приращения подъемной силы при изменении α.' },
      { sym: 'X_CG', name: 'Центр тяжести планера', unit: 'м (% САХ)', desc: 'Точка приложения силы тяжести всего ЛА.' },
      { sym: 'SM', name: 'Запас устойчивости (Static Margin)', unit: '% САХ', desc: 'Расстояние между фокусом и ЦТ: SM = (X_F - X_CG)/MAC.' },
    ],
    insight: 'Если ЦТ уйдет за фокус (SM < 0), самолет при случайном порыве ветра начнет бесконтрольно задирать нос до полного сваливания (Cm_alpha > 0).',
  },
  {
    id: 'polar_glide',
    title: '5. Скоростная Поляра и Максимальное Качество Планирования',
    shortDesc: 'Определение наивыгоднейшего угла атаки для преодоления максимальной дальности без мотора.',
    category: 'Аэродинамическое Качество',
    formula: 'K = \\frac{C_L}{C_D} = \\frac{X_{\\text{планирования}}}{H_{\\text{высота}}}, \\quad K_{\\max} = \\frac{1}{2 \\sqrt{C_{D0} \\cdot k}}',
    variables: [
      { sym: 'K', name: 'Аэродинамическое качество', unit: 'ед.', desc: 'Отношение подъемной силы к лобовому сопротивлению (L/D).' },
      { sym: 'C_D0', name: 'Паразитное сопротивление нулевой подъемной силы', unit: 'ед.', desc: 'Трение обшивки, сопротивление формы фюзеляжа, антенн и стоек.' },
    ],
    insight: 'При K = 20 самолет с высоты 1 км может без двигателя пролететь 20 км по горизонту. Точка касательной из начала координат к поляре дает угол атаки наивыгоднейшего планирования.',
  },
  {
    id: 'transonic_sweep',
    title: '6. Волновое Сопротивление и Стреловидность Крыла',
    shortDesc: 'Как стреловидность отодвигает критическое число Маха и спасает от скачков уплотнения.',
    category: 'Сверхзвук & Газодинамика',
    formula: 'M_{\\text{эфф}} = M_\\infty \\cdot \\cos(\\chi), \\quad C_{D\\text{волновое}} \\propto \\frac{(M^2 - 1)^2}{\\sqrt{M^2 - 1}}',
    variables: [
      { sym: 'χ', name: 'Угол стреловидности крыла по 1/4 хорд', unit: 'градусы (°)', desc: 'Наклон консолей крыла назад относительно фюзеляжа.' },
      { sym: 'M_эфф', name: 'Эффективное число Маха поперек профиля', unit: 'Mach', desc: 'Скорость обтекания, воспринимаемая нормальным сечением крыла.' },
    ],
    insight: 'Стреловидность крыла обманывает физику: профиль "чувствует" только нормальную составляющую скорости V*cos(χ), что позволяет летать на околозвуковых скоростях M=0.85 без резкого волнового удара.',
  },
];

export const AeroInteractiveAtlasModal: React.FC<AeroAtlasProps> = ({ isOpen, onClose }) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string>('lift_origin');

  // Interactive Live Demonstrator State
  const [demoAoA, setDemoAoA] = useState<number>(4); // deg
  const [demoSpeedKmh, setDemoSpeedKmh] = useState<number>(100); // km/h
  const [demoAR, setDemoAR] = useState<number>(8); // Aspect ratio
  const [demoWingArea, setDemoWingArea] = useState<number>(0.8); // m2

  if (!isOpen) return null;

  const currentTopic = ATLAS_TOPICS.find((t) => t.id === selectedTopicId) || ATLAS_TOPICS[0];

  // Interactive Physics Simulator values
  const rho = 1.225;
  const speedMps = demoSpeedKmh / 3.6;
  const q = 0.5 * rho * speedMps * speedMps;

  // Cl approximation for flat/cambered airfoil: Cl ~ 0.3 + 0.1 * AoA (linear before stall)
  let cl = 0.25 + 0.095 * demoAoA;
  let isStalled = false;
  if (demoAoA > 15) {
    isStalled = true;
    cl = 1.6 - (demoAoA - 15) * 0.12;
  }

  const cd0 = 0.022;
  const oswaldE = 0.85;
  const kInduced = 1 / (Math.PI * demoAR * oswaldE);
  const cdInduced = kInduced * (cl * cl);
  const cdTotal = cd0 + (isStalled ? 0.15 + (demoAoA - 15) * 0.03 : cdInduced);

  const liftNewtons = cl * q * demoWingArea;
  const dragNewtons = cdTotal * q * demoWingArea;
  const ldRatio = liftNewtons / Math.max(0.1, dragNewtons);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn font-mono">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-teal-500/40 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950/60 border-b border-teal-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-md shadow-teal-950/50">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Интерактивный Атлас «Аэродинамика на Пальцах»</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Теория & Инспектор Формул
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Физическая природа явлений, математическая анатомия уравнений и интерактивная лаборатория
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Left Topic Selector, Right Interactive Viewer */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Left Column: Topics (5 cols) */}
          <div className="lg:col-span-5 p-4 border-r border-slate-800 bg-slate-950/70 space-y-2.5 overflow-y-auto">
            <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider block px-1 pb-1">
              Разделы Аэродинамики:
            </span>

            {ATLAS_TOPICS.map((tpc) => {
              const isSelected = selectedTopicId === tpc.id;
              return (
                <div
                  key={tpc.id}
                  onClick={() => setSelectedTopicId(tpc.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-1 ${
                    isSelected
                      ? 'bg-teal-950/40 border-teal-500 text-white shadow-md shadow-teal-950/60'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs font-bold text-teal-300 font-mono">
                    <span>{tpc.title}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
                  </div>
                  <div className="text-[10px] text-slate-500 font-sans">{tpc.category}</div>
                  <p className="text-[11px] text-slate-400 font-sans line-clamp-2 leading-relaxed">{tpc.shortDesc}</p>
                </div>
              );
            })}
          </div>

          {/* Right Column: Deep Formula & Physics Explainer (7 cols) */}
          <div className="lg:col-span-7 p-5 space-y-5 overflow-y-auto bg-slate-900/50">
            {/* Topic Header & Formula */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-teal-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-400 font-sans font-bold">{currentTopic.category}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                  Фундаментальный Закон
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white font-mono">{currentTopic.title}</h3>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center flex items-center justify-center overflow-x-auto">
                <MathView math={currentTopic.formula} className="text-teal-300 text-base sm:text-lg" />
              </div>
            </div>

            {/* Variable Anatomy Breakdown */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 font-sans flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-teal-400" />
                <span>Анатомия Величин в Формуле (Размерности в СИ):</span>
              </span>

              <div className="space-y-1.5">
                {currentTopic.variables.map((v) => (
                  <div
                    key={v.sym}
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                  >
                    <div className="flex items-center gap-2">
                      <strong className="font-mono text-teal-400 text-sm">{v.sym}</strong>
                      <span className="text-white font-sans font-semibold">{v.name}:</span>
                      <span className="text-[10px] font-mono text-slate-400">[{v.unit}]</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-sans sm:text-right">{v.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Engineering Insight Banner */}
            <div className="p-3.5 rounded-2xl bg-teal-950/30 border border-teal-500/40 text-xs font-sans text-teal-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-teal-300">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>Инженерный Инсайт & Практическое Применение:</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">{currentTopic.insight}</p>
            </div>

            {/* Interactive Realtime Micro-Simulator */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5 font-sans">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Интерактивная Микро-Песочница (Живая Физика)</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDemoAoA(4);
                    setDemoSpeedKmh(100);
                    setDemoAR(8);
                  }}
                  className="text-[10px] text-slate-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Сброс</span>
                </button>
              </div>

              {/* Slider Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>Угол атаки $\alpha$:</span>
                    <strong className={isStalled ? 'text-rose-400 font-mono' : 'text-teal-400 font-mono'}>{demoAoA}°</strong>
                  </div>
                  <input
                    type="range"
                    min="-4"
                    max="22"
                    step="1"
                    value={demoAoA}
                    onChange={(e) => setDemoAoA(Number(e.target.value))}
                    className="w-full accent-teal-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>Скорость $V$:</span>
                    <strong className="text-teal-400 font-mono">{demoSpeedKmh} км/ч</strong>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="250"
                    step="5"
                    value={demoSpeedKmh}
                    onChange={(e) => setDemoSpeedKmh(Number(e.target.value))}
                    className="w-full accent-teal-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>Удлинение $AR$:</span>
                    <strong className="text-teal-400 font-mono">{demoAR}</strong>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="24"
                    step="1"
                    value={demoAR}
                    onChange={(e) => setDemoAR(Number(e.target.value))}
                    className="w-full accent-teal-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Dynamic Live Outputs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block">Подъемная сила $L$:</span>
                  <strong className="text-teal-300 text-sm font-mono">{liftNewtons.toFixed(1)} Н</strong>
                  <span className="text-[9px] text-slate-500 block">({(liftNewtons / 9.81).toFixed(2)} кгс)</span>
                </div>

                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block">Сопротивление $D$:</span>
                  <strong className="text-indigo-300 text-sm font-mono">{dragNewtons.toFixed(1)} Н</strong>
                  <span className="text-[9px] text-slate-500 block">({(dragNewtons / 9.81).toFixed(2)} кгс)</span>
                </div>

                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block">Качество $K = L/D$:</span>
                  <strong className="text-emerald-300 text-sm font-mono">{ldRatio.toFixed(1)} ед.</strong>
                  <span className="text-[9px] text-slate-500 block">Дальность планирования</span>
                </div>

                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block">Режим Потока:</span>
                  <strong className={`text-xs font-mono font-bold ${isStalled ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {isStalled ? '🚨 СРЫВ ПОТОКА' : 'Безотрывное'}
                  </strong>
                  <span className="text-[9px] text-slate-500 block">{isStalled ? 'Падение Cl' : 'Линейный режим'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-950 border-t border-slate-800 text-xs">
          <div className="text-[11px] text-slate-400 font-sans flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            <span>Учебный атлас предназначен для инженеров, конструкторов БПЛА и студентов авиационных специальностей.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer border border-slate-700"
          >
            Закрыть Атлас
          </button>
        </div>
      </div>
    </div>
  );
};
