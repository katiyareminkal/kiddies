import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
  }

  private handleReload = () => {
    try {
      // Clear offline rentals cache if corrupted
      localStorage.removeItem('kiddies_offline_rentals');
    } catch (e) {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4 font-sans text-slate-900">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-xl border border-slate-100 text-center space-y-4">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle size={32} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Application Recovered</h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                An unexpected state occurred. Click below to refresh and restore your workspace safely.
              </p>
            </div>
            {this.state.error && (
              <div className="p-3 bg-slate-50 rounded-xl text-left border border-slate-100 max-h-32 overflow-auto">
                <p className="text-[10px] font-mono text-rose-600 break-all">{this.state.error.toString()}</p>
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full py-3.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold rounded-2xl shadow-lg shadow-[#8B5CF6]/20 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider active:scale-[0.98]"
            >
              <RefreshCw size={14} /> Refresh Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
