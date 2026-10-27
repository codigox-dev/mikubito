"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastContext = createContext(null);

const toastStyles = {
  success: {
    icon: CheckCircle2,
    className: "border-sage-200 bg-sage-50 text-sage-800",
    iconClass: "text-sage-600",
  },
  error: {
    icon: AlertCircle,
    className: "border-red-200 bg-red-50 text-red-800",
    iconClass: "text-red-500",
  },
  info: {
    icon: Info,
    className: "border-sky-200 bg-sky-50 text-sky-800",
    iconClass: "text-sky-600",
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);
  const timers = useRef(new Set());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (message, type = "success") => {
      counter.current += 1;
      const id = counter.current;

      setToasts((current) => [...current.slice(-3), { id, message, type }]);

      const timer = setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
        timers.current.delete(timer);
      }, 4200);

      timers.current.add(timer);
    },
    []
  );

  useEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();
    },
    []
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-24 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-6 lg:bottom-6"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((item) => {
          const style = toastStyles[item.type] || toastStyles.info;
          const Icon = style.icon;

          return (
            <div
              key={item.id}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lift animate-toast-in",
                style.className
              )}
            >
              <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", style.iconClass)} />
              <p className="flex-1 text-sm font-medium leading-5">{item.message}</p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="focus-ring rounded-lg p-0.5 opacity-60 transition hover:opacity-100"
                aria-label="Cerrar notificación"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }

  return context;
}
