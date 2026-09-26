import React from 'react';
import { ToastMessage } from '../types/index.js';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
      {toasts.map((toast) => {
        let Icon = Info;
        let bgStyle = 'bg-slate-900/90 text-white border-slate-800';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          bgStyle = 'bg-emerald-950/90 text-emerald-100 border-emerald-800/80';
        } else if (toast.type === 'error') {
          Icon = AlertCircle;
          bgStyle = 'bg-rose-950/90 text-rose-100 border-rose-800/80';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          bgStyle = 'bg-amber-950/90 text-amber-100 border-amber-800/80';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${bgStyle}`}
          >
            <Icon className="w-5 h-5 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm leading-tight">{toast.title}</h4>
              <p className="text-xs mt-1 opacity-90 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
