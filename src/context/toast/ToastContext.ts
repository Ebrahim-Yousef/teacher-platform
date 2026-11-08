import { createContext } from "react";

export interface ToastMethods {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

export interface ToastContextType {
  toast: ToastMethods;
  dismiss: (id: number) => void;
}

export const ToastContext = createContext<ToastContextType | null>(null);
