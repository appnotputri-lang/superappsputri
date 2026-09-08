import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface ToastState {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastNotificationProps {
  toast: ToastState | null;
  onClose: () => void;
  duration?: number;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  toast,
  onClose,
  duration = 4000
}) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, duration, onClose]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3.5 rounded-xl shadow-2xl border text-[13px] font-medium animate-slideUp bg-white text-slate-800 border-slate-200/90 min-w-[280px] max-w-md">
      {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
      {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
      {toast.type === 'info' && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors shrink-0"
        title="Tutup"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
