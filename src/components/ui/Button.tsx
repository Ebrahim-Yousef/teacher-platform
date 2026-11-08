import React from "react";
import { cn } from "@/utils/cn";
import Spinner from "./Spinner";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?:
    | "primary"
    | "secondary"
    | "warning"
    | "outline"
    | "ghost"
    | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button: React.FC<ButtonProps> = ({
  children,
  type = "button",
  onClick,
  disabled = false,
  loading = false,
  variant = "primary",
  size = "md",
  className,
  ...rest
}) => {
  const variants = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-lg shadow-indigo-600/20",
    secondary:
      "bg-slate-800 text-slate-200 hover:bg-slate-700 focus:ring-2 focus:ring-slate-700/20 border border-slate-700",
    warning:
      "bg-amber-600 text-white hover:bg-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-lg shadow-amber-600/20",
    outline:
      "border border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800 hover:text-white focus:ring-2 focus:ring-indigo-500/20",
    ghost:
      "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 focus:bg-slate-800/60",
    danger:
      "bg-red-600 text-white hover:bg-red-500 focus:ring-2 focus:ring-red-500/20 shadow-lg shadow-red-600/20",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs font-medium rounded-lg gap-1.5",
    md: "px-4 py-2.5 text-sm font-semibold rounded-xl gap-2",
    lg: "px-6 py-3 text-base font-bold rounded-xl gap-2.5",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center select-none cursor-pointer font-medium",
        "transition-all duration-200 focus:outline-none active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading && (
        <Spinner size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />
      )}
      {children}
    </button>
  );
};

export default Button;
