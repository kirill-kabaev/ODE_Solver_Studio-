import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Sparkles,
  SquareTerminal,
  Sigma,
  ListOrdered,
  LineChart,
  History,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  ArrowUp,
  X,
  Compass,
  Cpu,
  Zap,
  Bot,
  Flame,
  Layers,
  Sliders,
} from 'lucide-react';
import {
  CauchyCondition,
  ODESolution,
  SolverEngine,
  HistoryRecord,
  PreAnalysisResult,
  DimensionMode,
} from './types';
import { AppHeader, StudioMainMode } from './components/AppHeader';
import { EquationInputWindow } from './components/EquationInputWindow';
import { FormulaSolutionWindow } from './components/FormulaSolutionWindow';
import { StepByStepWindow } from './components/StepByStepWindow';
import { InteractiveODEGraph } from './components/InteractiveODEGraph';
import { Interactive3DHeatmapGraph } from './components/Interactive3DHeatmapGraph';
import { VerificationWindow } from './components/VerificationWindow';
import { PresetCatalogWindow } from './components/PresetCatalogWindow';
import { HistoryWindow } from './components/HistoryWindow';
import { LinearSolverStudio } from './components/LinearSolverStudio';
import { EngineeringStudio } from './components/EngineeringStudio';
import { VerticalPageScroller } from './components/VerticalPageScroller';
import { StartupSplashLoader } from './components/StartupSplashLoader';
import { AuthGateModal } from './components/AuthGateModal';
import { SuperAdminConsoleModal } from './components/SuperAdminConsoleModal';
import { MathText } from './components/MathView';
import { analyzeDifferentialEquation } from './utils/preAnalyzer';
import { solveLocallyCPU } from './utils/cpuSolver';
import { solveLocallyGPU } from './utils/gpuSolver';
import {
  getCurrentSession,
  setCurrentSession,
  createSuperAdminUser,
  logoutUser,
  AuthUser,
} from './utils/securityManager';

const STORAGE_HISTORY_KEY = 'ode_studio_solutions_history_v1';

export default function App() {
  // Authentication & SuperUser Absolute Rights State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const session = getCurrentSession();
    if (session) return session;
    // Default to SuperAdmin root session for author k.kabaev94@gmail.com
    const masterRoot = createSuperAdminUser('k.kabaev94@gmail.com');
    setCurrentSession(masterRoot);
    return masterRoot;
  });
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showSuperAdminModal, setShowSuperAdminModal] = useState<boolean>(false);

  // Main Studio Mode: 'ode' (Differential Equations) vs 'sparse_linear' (Large Linear Systems Ax = b)
  const [studioMode, setStudioMode] = useState<StudioMainMode>('sparse_linear');

  // Dimension Mode: 2D ODEs vs 3D Math Physics PDEs & 3D Systems
  const [dimensionMode, setDimensionMode] = useState<DimensionMode>('2D');

  // ODE Input State
  const [equation, setEquation] = useState<string>("y'' + 2 * y' + 10 * y = 5 * cos(2*x)");
  const [hasCauchy, setHasCauchy] = useState<boolean>(true);
  const [cauchy, setCauchy] = useState<CauchyCondition>({ x0: '0', y0: '3', yp0: '0' });
  const [engine, setEngine] = useState<SolverEngine>('cpu');

  // Solution State
  const [solution, setSolution] = useState<ODESolution | null>(null);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentRequestText, setCurrentRequestText] = useState<string>('');
  const [attemptCount, setAttemptCount] = useState<number>(1);
  const maxAttempts = 3;

  // Active navigation section
  const [activeSection, setActiveSection] = useState<string>('input-section');
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  // Modals state
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false);
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [isReopenedSplash, setIsReopenedSplash] = useState<boolean>(false);

  // History State
  const [history, setHistory] = useState<HistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_HISTORY_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Could not save history to localStorage', e);
    }
  }, [history]);

  // Real-time pre-analysis of current equation
  const preAnalysis = useMemo<PreAnalysisResult>(() => {
    return analyzeDifferentialEquation(equation);
  }, [equation]);

  // Sync dimensionMode if pre-analyzer unequivocally detects 3D
  useEffect(() => {
    if (preAnalysis.dimension === '3D' && dimensionMode !== '3D') {
      setDimensionMode('3D');
    }
  }, [preAnalysis.dimension, dimensionMode]);

  // AbortController ref for user cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Scroll listener for section highlight and back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 160;
      setShowScrollTop(window.scrollY > 300);

      const sections =
        studioMode === 'ode'
          ? ['input-section', 'formula-section', 'steps-section', 'graph-section']
          : ['sparse-matrix-section', 'sparse-solver-section', 'sparse-convergence-section'];

      for (const secId of sections) {
        const el = document.getElementById(secId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(secId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [studioMode]);

  // Smooth scroll to target section
  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      const headerOffset = 70;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
      setActiveSection(sectionId);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Keyboard Shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowHistoryModal(false);
        setShowCatalogModal(false);
        setShowVerificationModal(false);
        return;
      }

      // F-Keys
      if (e.key === 'F1') {
        e.preventDefault();
        scrollToSection('input-section');
      } else if (e.key === 'F2') {
        e.preventDefault();
        scrollToSection('steps-section');
      } else if (e.key === 'F3') {
        e.preventDefault();
        scrollToSection('formula-section');
      } else if (e.key === 'F4') {
        e.preventDefault();
        scrollToSection('graph-section');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setShowVerificationModal((prev) => !prev);
      } else if (e.key === 'F6') {
        e.preventDefault();
        setShowCatalogModal((prev) => !prev);
      } else if (e.key === 'F7') {
        e.preventDefault();
        setShowHistoryModal((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cancel in-flight solving request
  const handleCancelSolve = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsSolving(false);
    setCurrentRequestText('');
    setErrorMessage('Запрос решения отменен пользователем.');
  }, []);

  // Add solution to history records
  const recordSolutionInHistory = useCallback(
    (sol: ODESolution, eq: string, c: CauchyCondition | null, eng: SolverEngine) => {
      const pAnalysis = analyzeDifferentialEquation(eq);
      const newRec: HistoryRecord = {
        id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        timestamp: Date.now(),
        equation: eq,
        dimension: pAnalysis.dimension || dimensionMode,
        cauchy: c,
        engine: eng,
        solution: sol,
        preAnalysis: pAnalysis,
      };

      setHistory((prev) => {
        const filtered = prev.filter(
          (h) => h.equation !== eq || JSON.stringify(h.cauchy) !== JSON.stringify(c)
        );
        return [newRec, ...filtered].slice(0, 50);
      });
    },
    [dimensionMode]
  );

  // Solve ODE via chosen engine (CPU, GPU, or AI Gemini)
  const handleSolve = async (
    customEq?: string,
    customCauchy?: CauchyCondition | null,
    customEngine?: SolverEngine
  ) => {
    const eqToSolve = customEq !== undefined ? customEq : equation;
    const cauchyToSolve = customCauchy !== undefined ? customCauchy : (hasCauchy ? cauchy : null);
    const engineToUse = customEngine !== undefined ? customEngine : engine;

    if (!eqToSolve.trim()) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSolving(true);
    setErrorMessage(null);
    setAttemptCount(1);

    // 1. Local CPU Engine Execution
    if (engineToUse === 'cpu') {
      setCurrentRequestText('Локальный расчет на CPU: факторизация оператора и корней D...');
      try {
        await new Promise((r) => setTimeout(r, 200));
        if (controller.signal.aborted) return;
        const localRes = solveLocallyCPU(eqToSolve, cauchyToSolve);
        setSolution(localRes);
        recordSolutionInHistory(localRes, eqToSolve, cauchyToSolve, engineToUse);
        // Scroll to solution after short delay
        setTimeout(() => scrollToSection('formula-section'), 150);
      } catch (err: any) {
        if (controller.signal.aborted) return;
        console.error('CPU Solve error:', err);
        setErrorMessage('Ошибка локального вычисления на CPU.');
      } finally {
        if (!controller.signal.aborted) {
          setIsSolving(false);
          setCurrentRequestText('');
        }
      }
      return;
    }

    // 2. Local GPU Shader Engine Execution
    if (engineToUse === 'gpu') {
      setCurrentRequestText('Аппаратный расчет на GPU: компиляция шейдеров и поля интегралов...');
      try {
        await new Promise((r) => setTimeout(r, 250));
        if (controller.signal.aborted) return;
        const gpuRes = solveLocallyGPU(eqToSolve, cauchyToSolve);
        setSolution(gpuRes);
        recordSolutionInHistory(gpuRes, eqToSolve, cauchyToSolve, engineToUse);
        setTimeout(() => scrollToSection('formula-section'), 150);
      } catch (err: any) {
        if (controller.signal.aborted) return;
        console.error('GPU Solve error:', err);
        setErrorMessage('Ошибка аппаратного вычисления на GPU.');
      } finally {
        if (!controller.signal.aborted) {
          setIsSolving(false);
          setCurrentRequestText('');
        }
      }
      return;
    }

    // 3. AI Gemini Cloud CAS Execution
    let solved = false;
    let attempts = 0;

    const requestStageMessages = [
      `Инициализация запроса к AI Gemini CAS для: "${eqToSolve.length > 35 ? eqToSolve.substring(0, 35) + '...' : eqToSolve}"`,
      'Классификация типа уравнения и построение характеристического полинома...',
      'Интегрирование неоднородной части и вычисление констант задачи Коши...',
    ];

    while (!solved && attempts < maxAttempts) {
      if (controller.signal.aborted) return;

      attempts++;
      setAttemptCount(attempts);
      setCurrentRequestText(requestStageMessages[Math.min(attempts - 1, requestStageMessages.length - 1)]);

      try {
        const response = await fetch('/api/solve-ode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            equation: eqToSolve,
            cauchy: cauchyToSolve,
          }),
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        const json = await response.json();

        if (response.ok && json.success && json.data) {
          setSolution(json.data);
          recordSolutionInHistory(json.data, eqToSolve, cauchyToSolve, engineToUse);
          setErrorMessage(null);
          solved = true;
          setTimeout(() => scrollToSection('formula-section'), 150);
          break;
        } else {
          if (attempts < maxAttempts) {
            setCurrentRequestText(`Повторное обращение к модели (попытка ${attempts + 1}/${maxAttempts})...`);
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || controller.signal.aborted) {
          return;
        }
        console.warn(`Solve attempt ${attempts} warning:`, err);
        if (attempts < maxAttempts) {
          setCurrentRequestText(`Связь с моделью, повтор (попытка ${attempts + 1}/${maxAttempts})...`);
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    if (!solved && !controller.signal.aborted) {
      setErrorMessage(
        'AI Gemini сейчас не ответил. Вы можете переключиться на мгновенный режим CPU или GPU для немедленного решения.'
      );
    }

    if (!controller.signal.aborted) {
      setIsSolving(false);
      setCurrentRequestText('');
    }
  };

  // Run on mount with initial default ODE
  useEffect(() => {
    handleSolve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadPreset = (eq: string, cauchyCond?: CauchyCondition, presetDim?: DimensionMode) => {
    setEquation(eq);
    const analyzed = analyzeDifferentialEquation(eq);
    const targetDim = presetDim || analyzed.dimension;
    setDimensionMode(targetDim);

    if (cauchyCond) {
      setHasCauchy(true);
      setCauchy(cauchyCond);
    } else {
      setHasCauchy(false);
    }
    const engineToUse = analyzed.recommendedEngine;
    setEngine(engineToUse);
    setShowCatalogModal(false);

    // Immediately trigger solve for selected preset so graph and formulas update instantly
    handleSolve(eq, cauchyCond || null, engineToUse);
  };

  const handleReSolveFromHistory = (
    rec: HistoryRecord,
    overrideCauchy?: CauchyCondition | null,
    overrideEngine?: SolverEngine
  ) => {
    setEquation(rec.equation);
    if (rec.preAnalysis?.dimension) {
      setDimensionMode(rec.preAnalysis.dimension);
    }

    if (overrideCauchy !== undefined) {
      if (overrideCauchy) {
        setHasCauchy(true);
        setCauchy(overrideCauchy);
      } else {
        setHasCauchy(false);
      }
    } else if (rec.cauchy) {
      setHasCauchy(true);
      setCauchy(rec.cauchy);
    } else {
      setHasCauchy(false);
    }

    const eng = overrideEngine || rec.engine;
    setEngine(eng);
    setShowHistoryModal(false);

    handleSolve(rec.equation, overrideCauchy !== undefined ? overrideCauchy : rec.cauchy, eng);
  };

  const handleSelectRecordForView = (rec: HistoryRecord) => {
    setEquation(rec.equation);
    if (rec.preAnalysis?.dimension) {
      setDimensionMode(rec.preAnalysis.dimension);
    }
    if (rec.cauchy) {
      setHasCauchy(true);
      setCauchy(rec.cauchy);
    } else {
      setHasCauchy(false);
    }
    setEngine(rec.engine);
    setSolution(rec.solution);
    setShowHistoryModal(false);
    scrollToSection('formula-section');
  };

  // Determine if the active graph should be 3D
  const is3DActive = dimensionMode === '3D' || solution?.dimensionMode === '3D';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950 flex flex-col">
      {/* Background Graphic Blueprint Mesh */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.12),rgba(255,255,255,0))] pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Sticky Header Navigation */}
      <AppHeader
        studioMode={studioMode}
        onChangeStudioMode={setStudioMode}
        activeSection={activeSection}
        onScrollToSection={scrollToSection}
        onOpenHistory={() => setShowHistoryModal(true)}
        onOpenCatalog={() => setShowCatalogModal(true)}
        onOpenVerification={() => setShowVerificationModal(true)}
        onOpenShowcase={() => {
          setIsReopenedSplash(true);
          setShowSplash(true);
        }}
        historyCount={history.length}
        isSolving={isSolving}
        hasSolution={Boolean(solution)}
        engine={engine}
        onChangeEngine={setEngine}
        currentUser={currentUser}
        onOpenAuthGate={() => setShowAuthModal(true)}
        onOpenSuperAdminConsole={() => setShowSuperAdminModal(true)}
        onLogout={() => {
          logoutUser();
          setCurrentUser(null);
          setShowAuthModal(true);
        }}
      />

      {/* Futuristic Startup Splash / Interactive Welcome Showcase */}
      {showSplash && (
        <StartupSplashLoader
          isReopened={isReopenedSplash}
          onClose={() => {
            setShowSplash(false);
            setIsReopenedSplash(false);
          }}
          onComplete={(selectedMode) => {
            if (selectedMode) {
              setStudioMode(selectedMode);
            }
            setShowSplash(false);
            setIsReopenedSplash(false);
          }}
        />
      )}

      {/* Global Error Notification */}
      {errorMessage && (
        <div className="sticky top-16 z-50 max-w-3xl mx-auto px-4 mt-2 w-full animate-fadeIn">
          <div className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-500/60 shadow-xl flex items-center justify-between gap-3 text-rose-200 text-xs backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 text-rose-400 hover:text-white rounded hover:bg-rose-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Single-Column Scrollable Container */}
      <main className="relative z-10 w-full max-w-5xl xl:max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-6 flex flex-col gap-8 flex-1">
        
        {studioMode === 'engineering' ? (
          /* ========================================================================= */
          /* РЕЖИМ 3: ПРИКЛАДНОЙ ИНЖЕНЕРНЫЙ МОДУЛЬ (AERODYNAMICS, GNC & EDA CHIPS)    */
          /* ========================================================================= */
          <EngineeringStudio />
        ) : studioMode === 'sparse_linear' ? (
          /* ========================================================================= */
          /* РЕЖИМ 2: РЕШАТЕЛЬ СЛАУ ОГРОМНЫХ СИСТЕМ (TEXAS A&M SUITESPARSE COLLECTION)   */
          /* ========================================================================= */
          <LinearSolverStudio />
        ) : (
          /* ========================================================================= */
          /* РЕЖИМ 1: СИМВОЛЬНЫЙ РЕШАТЕЛЬ ДИФФЕРЕНЦИАЛЬНЫХ УРАВНЕНИЙ (ДУ 2D / 3D)       */
          /* ========================================================================= */
          <>
            {/* ========================================================================= */}
            {/* ЧАСТЬ 1: ПАРАМЕТРЫ И ВВОД ДУ                                               */}
            {/* ========================================================================= */}
            <section id="input-section" className="scroll-mt-20">
              <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <SquareTerminal className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                        <span>1. ПАРАМЕТРЫ И ВВОД ДИФФЕРЕНЦИАЛЬНОГО УРАВНЕНИЯ</span>
                      </h2>
                      <p className="text-xs text-slate-400">
                        Символьный ввод уравнения, выбор размерности (2D / 3D), выбор движка (CPU / GPU / AI) и условия Коши
                      </p>
                    </div>
                  </div>

                  {/* Quick Engine Switcher Badge in Section Header */}
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 px-1.5 hidden sm:inline">Движок:</span>
                    {(['cpu', 'gpu', 'ai'] as SolverEngine[]).map((eng) => (
                      <button
                        key={eng}
                        type="button"
                        onClick={() => setEngine(eng)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                          engine === eng
                            ? eng === 'cpu'
                              ? 'bg-amber-500 text-slate-950 shadow-sm'
                              : eng === 'gpu'
                              ? 'bg-emerald-500 text-slate-950 shadow-sm'
                              : 'bg-cyan-500 text-slate-950 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {eng}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  <EquationInputWindow
                    dimensionMode={dimensionMode}
                    onChangeDimensionMode={setDimensionMode}
                    equation={equation}
                    onChangeEquation={setEquation}
                    cauchy={cauchy}
                    onChangeCauchy={setCauchy}
                    hasCauchy={hasCauchy}
                    onToggleCauchy={setHasCauchy}
                    engine={engine}
                    onChangeEngine={setEngine}
                    onSolve={() => handleSolve()}
                    isSolving={isSolving}
                    onCancel={handleCancelSolve}
                    currentRequestText={currentRequestText}
                    attempt={attemptCount}
                    maxAttempts={maxAttempts}
                    onLoadPreset={handleLoadPreset}
                    preAnalysis={preAnalysis}
                    onOpenHistory={() => setShowHistoryModal(true)}
                  />
                </div>
              </div>
            </section>

            {/* ========================================================================= */}
            {/* ЧАСТЬ 2: ИТОГОВОЕ АНАЛИТИЧЕСКОЕ РЕШЕНИЕ                                     */}
            {/* ========================================================================= */}
            <section id="formula-section" className="scroll-mt-20">
              <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <Sigma className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                        <span>2. ИТОГОВОЕ АНАЛИТИЧЕСКОЕ РЕШЕНИЕ</span>
                      </h2>
                      <p className="text-xs text-slate-400">
                        Общее решение и частная интегральная кривая задачи Коши в точной математической форме
                      </p>
                    </div>
                  </div>

                  {solution && (
                    <button
                      onClick={() => setShowVerificationModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-700/60 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Показать символьную проверку тождества"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Проверка тождества</span>
                    </button>
                  )}
                </div>

                <div className="p-4 sm:p-6">
                  <FormulaSolutionWindow
                    solution={solution}
                    isSolving={isSolving}
                    engine={engine}
                    currentRequestText={currentRequestText}
                    attempt={attemptCount}
                    maxAttempts={maxAttempts}
                    onCancel={handleCancelSolve}
                  />
                </div>
              </div>
            </section>

            {/* ========================================================================= */}
            {/* ЧАСТЬ 3: ПОШАГОВЫЙ СИМВОЛЬНЫЙ ВЫВОД                                         */}
            {/* ========================================================================= */}
            <section id="steps-section" className="scroll-mt-20">
              <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <ListOrdered className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                        <span>3. ПОШАГОВЫЙ СИМВОЛЬНЫЙ ВЫВОД</span>
                      </h2>
                      <p className="text-xs text-slate-400">
                        Математический разбор с заменами, характеристическим уравнением и интегрированием
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  <StepByStepWindow
                    solution={solution}
                    isSolving={isSolving}
                    engine={engine}
                    currentRequestText={currentRequestText}
                    attempt={attemptCount}
                    maxAttempts={maxAttempts}
                    onCancel={handleCancelSolve}
                  />
                </div>
              </div>
            </section>

            {/* ========================================================================= */}
            {/* ЧАСТЬ 4: УДОБНЫЙ ИНТЕРАКТИВНЫЙ ГРАФИК (2D ИЛИ 3D ТЕПЛОВАЯ КАРТА)            */}
            {/* ========================================================================= */}
            <section id="graph-section" className="scroll-mt-20 pb-10">
              <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-xl border ${
                        is3DActive
                          ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {is3DActive ? <Flame className="w-4 h-4" /> : <LineChart className="w-4 h-4" />}
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                        <span>
                          {is3DActive
                            ? '4. 3D ТЕПЛОВАЯ КАРТА ПОЛЯ & ФАЗОВОЕ ПРОСТРАНСТВО'
                            : '4. ИНТЕРАКТИВНОЕ ПОЛЕ НАПРАВЛЕНИЙ И ГРАФИК КОШИ (2D)'}
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400">
                        {is3DActive
                          ? 'Интерактивный срез распределения температуры/потенциала u(x,y,z,t), изолинии, векторы градиента и 3D поверхность'
                          : 'Векторное поле касательных, семейство интегральных кривых и траектории RK4 от произвольных точек'}
                      </p>
                    </div>
                  </div>

                  {/* Visualizer Mode Toggle */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setDimensionMode('2D')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        !is3DActive
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>2D Поле</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDimensionMode('3D')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        is3DActive
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      <span>3D Тепловая Карта</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 sm:p-6 min-h-[500px]">
                  {is3DActive ? (
                    <Interactive3DHeatmapGraph
                      solution={solution}
                      isSolving={isSolving}
                      engine={engine}
                      currentRequestText={currentRequestText}
                      attempt={attemptCount}
                      maxAttempts={maxAttempts}
                      onCancel={handleCancelSolve}
                    />
                  ) : (
                    <InteractiveODEGraph
                      solution={solution}
                      isSolving={isSolving}
                      engine={engine}
                      currentRequestText={currentRequestText}
                      attempt={attemptCount}
                      maxAttempts={maxAttempts}
                      onCancel={handleCancelSolve}
                      initialCauchy={hasCauchy ? cauchy : null}
                    />
                  )}
                </div>
              </div>
            </section>
          </>
        )}

      </main>

      {/* Right Side Vertical Interactive Scrubber & Section Navigator */}
      <VerticalPageScroller
        studioMode={studioMode}
        activeSection={activeSection}
        onScrollToSection={scrollToSection}
      />

      {/* Floating Back-To-Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-16 sm:right-20 z-40 p-2.5 rounded-full bg-cyan-500/90 hover:bg-cyan-400 text-slate-950 font-bold shadow-xl shadow-cyan-500/30 transition-all hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-sm"
          title="Наверх страницы"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ИСТОРИЯ РЕШЕНИЙ                                                  */}
      {/* ========================================================================= */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">История Решений & Анализ Свойств</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto min-h-[400px]">
              <HistoryWindow
                history={history}
                onLoadAndReSolve={handleReSolveFromHistory}
                onClearHistory={() => setHistory([])}
                onDeleteRecord={(id) => setHistory((prev) => prev.filter((r) => r.id !== id))}
                onSelectForView={handleSelectRecordForView}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: КАТАЛОГ ПРИМЕРОВ И ТИПОВ ДУ                                      */}
      {/* ========================================================================= */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Каталог Классических Типов & Физических Моделей ДУ</h3>
              </div>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto min-h-[400px]">
              <PresetCatalogWindow
                onSelectPreset={handleLoadPreset}
                activeDimension={dimensionMode}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: СИМВОЛЬНАЯ ПРОВЕРКА ТОЖДЕСТВА LHS ≡ RHS                          */}
      {/* ========================================================================= */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white"><MathText text="Символьная Проверка Тождества ($LHS \equiv RHS$)" /></h3>
              </div>
              <button
                onClick={() => setShowVerificationModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto min-h-[300px]">
              <VerificationWindow
                solution={solution}
                isSolving={isSolving}
                engine={engine}
                currentRequestText={currentRequestText}
                attempt={attemptCount}
                maxAttempts={maxAttempts}
                onCancel={handleCancelSolve}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: АВТОРИЗАЦИЯ & АКТИВАЦИЯ ПО 100 КЛЮЧАМ (AUTH GATE)                */}
      {/* ========================================================================= */}
      <AuthGateModal
        isOpen={showAuthModal || !currentUser}
        allowClose={Boolean(currentUser)}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={(user) => {
          setCurrentUser(user);
          setShowAuthModal(false);
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 5: ПАНЕЛЬ СУПЕРПОЛЬЗОВАТЕЛЯ & БАНК 100 КЛЮЧЕЙ НА ПК                 */}
      {/* ========================================================================= */}
      <SuperAdminConsoleModal
        isOpen={showSuperAdminModal}
        onClose={() => setShowSuperAdminModal(false)}
        currentUserEmail={currentUser?.email || 'k.kabaev94@gmail.com'}
      />

      {/* Footer info */}
      <footer className="w-full border-t border-slate-800/80 bg-slate-950/80 py-4 px-4 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-1.5">
        <div className="font-semibold text-slate-300">
          Computational Mathematics Studio v3.0 PRO • High-Performance Sparse Linear & ODE Computing
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          © 2026 K. Kabaev (<a href="mailto:k.kabaev94@gmail.com" className="text-cyan-400 hover:underline">k.kabaev94@gmail.com</a>). Все права защищены. Исключительная интеллектуальная собственность автора.
        </div>
      </footer>
    </div>
  );
}
