"use client";

import { useEffect } from "react";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
  onClose: (id: string) => void;
}

/**
 * Toast notification component
 * Displays a notification with an icon, message, and optional description
 */
export function Toast({
  id,
  type,
  message,
  description,
  duration = 5000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
  };

  const styles = {
    success: {
      bg: "bg-green-900/90",
      border: "border-green-600",
      icon: "text-green-400",
    },
    error: {
      bg: "bg-red-900/90",
      border: "border-red-600",
      icon: "text-red-400",
    },
    info: {
      bg: "bg-blue-900/90",
      border: "border-blue-600",
      icon: "text-blue-400",
    },
    warning: {
      bg: "bg-yellow-900/90",
      border: "border-yellow-600",
      icon: "text-yellow-400",
    },
  };

  const style = styles[type];

  return (
    <div
      className={`${style.bg} ${style.border} border rounded-lg shadow-lg p-4 mb-3 flex items-start gap-3 min-w-[320px] max-w-md animate-slide-in`}
      role="alert"
    >
      {/* Icon */}
      <div className={style.icon}>{icons[type]}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white">{message}</div>
        {description && (
          <div className="text-sm text-gray-300 mt-1">{description}</div>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={() => onClose(id)}
        className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
        aria-label="Close notification"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

/**
 * Toast container component
 * Renders all active toasts in a fixed position
 */
export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  );
}
