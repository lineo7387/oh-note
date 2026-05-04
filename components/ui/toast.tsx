"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { X, AlertCircle, CheckCircle, Info } from "lucide-react";

type ToastType = "error" | "success" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  error: (message: string) => void;
  success: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  const error = useCallback((message: string) => toast(message, "error"), [toast]);
  const success = useCallback((message: string) => toast(message, "success"), [toast]);

  const icons: Record<ToastType, React.ReactNode> = {
    error: <AlertCircle size={16} strokeWidth={2.5} />,
    success: <CheckCircle size={16} strokeWidth={2.5} />,
    info: <Info size={16} strokeWidth={2.5} />,
  };

  const styles: Record<ToastType, string> = {
    error: "border-accent bg-accent/10 text-accent",
    success: "border-green-600 bg-green-50 text-green-700",
    info: "border-pen-blue bg-pen-blue/10 text-pen-blue",
  };

  return (
    <ToastContext.Provider value={{ toast, error, success }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex min-w-[280px] max-w-md items-start gap-2 border-2 px-4 py-3 shadow-sketch wobbly-sm ${styles[t.type]}`}
          >
            {icons[t.type]}
            <span className="flex-1 text-sm font-bold">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="mt-0.5 text-current opacity-60 hover:opacity-100"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
