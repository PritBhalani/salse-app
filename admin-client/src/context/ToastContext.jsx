import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'success', title = '', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    
    const defaultTitle = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Notice',
    }[type] || 'Notice';

    const newToast = {
      id,
      message,
      type,
      title: title || defaultTitle,
      duration,
    };

    setToasts((prev) => [...prev.slice(-4), newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const toast = {
    success: (msg, title, duration) => showToast(msg, 'success', title, duration),
    error: (msg, title, duration) => showToast(msg, 'error', title, duration),
    warning: (msg, title, duration) => showToast(msg, 'warning', title, duration),
    info: (msg, title, duration) => showToast(msg, 'info', title, duration),
    dismiss: removeToast,
  };

  return (
    <ToastContext.Provider value={{ toast, showToast }}>
      {children}

      {/* Floating Toast Notification Container */}
      <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          const isWarning = t.type === 'warning';
          const isInfo = t.type === 'info';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-2xl p-3.5 shadow-2xl border flex items-start gap-3 backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 ${
                isSuccess
                  ? 'bg-slate-900/95 border-emerald-500/50 shadow-emerald-950/40 text-slate-200'
                  : isError
                  ? 'bg-slate-900/95 border-rose-500/50 shadow-rose-950/40 text-slate-200'
                  : isWarning
                  ? 'bg-slate-900/95 border-amber-500/50 shadow-amber-950/40 text-slate-200'
                  : 'bg-slate-900/95 border-sky-500/50 shadow-sky-950/40 text-slate-200'
              }`}
            >
              {/* Icon Container */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isSuccess
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : isError
                    ? 'bg-rose-500/20 text-rose-400'
                    : isWarning
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-sky-500/20 text-sky-400'
                }`}
              >
                {isSuccess && <CheckCircle2 className="w-5 h-5" />}
                {isError && <AlertCircle className="w-5 h-5" />}
                {isWarning && <AlertTriangle className="w-5 h-5" />}
                {isInfo && <Info className="w-5 h-5" />}
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0 pr-1">
                <h4
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isSuccess
                      ? 'text-emerald-400'
                      : isError
                      ? 'text-rose-400'
                      : isWarning
                      ? 'text-amber-400'
                      : 'text-sky-400'
                  }`}
                >
                  {t.title}
                </h4>
                <p className="text-xs text-slate-300 mt-0.5 font-medium leading-relaxed break-words">
                  {t.message}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
