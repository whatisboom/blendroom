"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Toast, ToastContainer, ToastType } from "./Toast";
import { nanoid } from "nanoid";

interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  success: (message: string, description?: string, duration?: number) => void;
  error: (message: string, description?: string, duration?: number) => void;
  info: (message: string, description?: string, duration?: number) => void;
  warning: (message: string, description?: string, duration?: number) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * Toast provider component
 * Manages toast state and provides methods to show/dismiss toasts
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback(
    (type: ToastType, message: string, description?: string, duration?: number) => {
      const id = nanoid();
      const toast: ToastData = {
        id,
        type,
        message,
        description,
        duration,
      };

      setToasts((prev) => [...prev, toast]);

      return id;
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback(
    (message: string, description?: string, duration = 5000) => {
      return addToast("success", message, description, duration);
    },
    [addToast]
  );

  const error = useCallback(
    (message: string, description?: string, duration = 7000) => {
      return addToast("error", message, description, duration);
    },
    [addToast]
  );

  const info = useCallback(
    (message: string, description?: string, duration = 5000) => {
      return addToast("info", message, description, duration);
    },
    [addToast]
  );

  const warning = useCallback(
    (message: string, description?: string, duration = 6000) => {
      return addToast("warning", message, description, duration);
    },
    [addToast]
  );

  const value: ToastContextValue = {
    success,
    error,
    info,
    warning,
    dismiss,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            message={toast.message}
            description={toast.description}
            duration={toast.duration}
            onClose={dismiss}
          />
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}

/**
 * Custom hook to access toast methods
 * @example
 * const toast = useToast();
 * toast.success("Track added to queue");
 * toast.error("Failed to play track");
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}
