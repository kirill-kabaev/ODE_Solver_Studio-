import React, { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, error: null, errorInfo: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[GlobalErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-900 border border-rose-500/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center font-bold text-lg">
                ⚠️
              </div>
              <div>
                <h1 className="text-base font-bold text-white">Произошла ошибка при загрузке интерфейса</h1>
                <p className="text-xs text-slate-400">React обнаружил исключение во время рендеринга</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-rose-300 overflow-x-auto max-h-48 mb-4">
              <div className="font-bold text-rose-200 mb-1">{this.state.error?.name}: {this.state.error?.message}</div>
              <div className="text-slate-400 whitespace-pre-wrap">{this.state.error?.stack}</div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Перезагрузить страницу
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Сбросить кэш и хранилище
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
);

