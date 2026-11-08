import React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/utils/cn";

export interface FormErrorProps {
  message?: string | null;
  className?: string;
}

export const FormError: React.FC<FormErrorProps> = ({ message, className }) => {
  if (!message) return null;
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400 dir-rtl",
        className,
      )}
      role="alert"
    >
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
};

export default FormError;
