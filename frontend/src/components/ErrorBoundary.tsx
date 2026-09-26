import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Server } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Đã phát hiện lỗi giao diện:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.clear();
      window.location.reload();
    } catch {}
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070b12] text-slate-100 flex items-center justify-center p-4 selection:bg-amber-500/20 selection:text-amber-400">
          <div className="max-w-md w-full bg-[#0d1424] border border-[#1e2a3e] rounded-2xl p-6 sm:p-8 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center mb-5">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Đã xảy ra sự cố hiển thị</h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Ứng dụng phát hiện lỗi trong quá trình khởi tạo hoặc nạp dữ liệu. Vui lòng thử tải lại trang hoặc kiểm tra kết nối tới máy chủ.
            </p>

            {this.state.error && (
              <div className="text-left bg-[#080d18] border border-[#162132] rounded-xl p-3.5 mb-6 overflow-x-auto text-[11px] font-mono text-rose-300">
                <span className="text-slate-500 select-none">Lỗi: </span>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wide transition-all cursor-pointer shadow-lg shadow-amber-500/10 active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Tải lại trang</span>
              </button>
              <button
                onClick={this.handleResetCache}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#141d2e] hover:bg-[#1a263c] border border-[#212f47] text-slate-300 hover:text-white font-semibold text-xs tracking-wide transition-all cursor-pointer"
              >
                <Server className="w-4 h-4" />
                <span>Xóa bộ nhớ đệm</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
