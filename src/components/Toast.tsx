'use client';

import { useEffect, useState, useRef } from 'react';

export interface ToastMessage {
  id: string;
  type: 'warning' | 'error' | 'success' | 'info';
  message: string;
  duration?: number;
}

interface ToastProps {
  messages: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function Toast({ messages, onRemove }: ToastProps) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {messages.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef<number>(0);
  const duration = toast.duration || 5000;

  useEffect(() => {
    startTimeRef.current = Date.now();
    const exitTimer = setTimeout(() => setIsExiting(true), duration - 200);
    const removeTimer = setTimeout(() => onRemove(toast.id), duration);

    // Progress bar animation
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
    }, 50);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
      clearInterval(progressInterval);
    };
  }, [toast.id, duration, onRemove]);

  const styles = {
    warning: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
      icon: 'text-amber-500',
      progress: 'bg-amber-500',
      label: 'Warning',
    },
    error: {
      border: 'border-destructive/30',
      bg: 'bg-destructive/10',
      icon: 'text-destructive',
      progress: 'bg-destructive',
      label: 'Error',
    },
    success: {
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
      icon: 'text-emerald-500',
      progress: 'bg-emerald-500',
      label: 'Success',
    },
    info: {
      border: 'border-primary/30',
      bg: 'bg-primary/10',
      icon: 'text-primary',
      progress: 'bg-primary',
      label: 'Info',
    },
  }[toast.type];

  const icons = {
    warning: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    error: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div
      className={`
        pointer-events-auto
        relative overflow-hidden
        min-w-[280px] max-w-[360px]
        bg-card/95 backdrop-blur-sm
        border ${styles.border}
        rounded-lg shadow-lg shadow-black/10
        transition-all duration-200 ease-out
        ${isExiting ? 'opacity-0 translate-x-2 scale-95' : 'opacity-100 translate-x-0 scale-100'}
      `}
    >
      {/* Content */}
      <div className="flex items-start gap-3 px-3 py-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-md ${styles.bg} flex items-center justify-center ${styles.icon}`}>
          {icons[toast.type]}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className={`text-[10px] font-medium uppercase tracking-wider ${styles.icon} mb-0.5`}>
            {styles.label}
          </p>
          <p className="text-sm text-foreground leading-snug">
            {toast.message}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-border/50">
        <div
          className={`h-full ${styles.progress} transition-all duration-100 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Hook to manage toasts
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastMessage['type'], message: string, duration?: number) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message, duration }]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    toasts,
    addToast,
    removeToast,
    warning: (msg: string, duration?: number) => addToast('warning', msg, duration),
    error: (msg: string, duration?: number) => addToast('error', msg, duration),
    success: (msg: string, duration?: number) => addToast('success', msg, duration),
    info: (msg: string, duration?: number) => addToast('info', msg, duration),
  };
}
