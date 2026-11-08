import React from "react";
import { LucideIcon, X } from "lucide-react";
import { cn } from "@/utils/cn";
import Label from "./Label";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  onClear?: () => void;
  icon?: LucideIcon;
  rightActions?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      type = "text",
      name,
      value,
      onChange,
      onClear,
      placeholder,
      icon: Icon,
      error,
      required = false,
      disabled = false,
      className,
      rightActions,
      ...rest
    },
    ref,
  ) => {
    const showClearButton = Boolean(value && onClear && !disabled);

    const getPaddingClass = () => {
      const rightPadding = Icon ? "pr-10" : "pr-4";
      const leftPadding = rightActions
        ? "pl-20"
        : showClearButton
          ? "pl-10"
          : "pl-4";
      return `${rightPadding} ${leftPadding}`;
    };

    return (
      <div className="space-y-1.5 w-full dir-rtl">
        {label && (
          <Label htmlFor={name} required={required}>
            {label}
          </Label>
        )}

        <div className="relative flex items-center">
          {Icon && (
            <Icon
              size={18}
              className={cn(
                "absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors",
                error ? "text-red-400" : "text-slate-400",
              )}
            />
          )}

          <input
            ref={ref}
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "w-full rounded-xl border bg-slate-900/90 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all duration-200",
              getPaddingClass(),
              error
                ? "border-red-500/80 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                : "border-slate-800 hover:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
              disabled &&
                "cursor-not-allowed bg-slate-950 text-slate-500 opacity-60",
              className,
            )}
            {...rest}
          />

          {showClearButton && !rightActions && (
            <button
              type="button"
              onClick={onClear}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors cursor-pointer"
              title="مسح"
            >
              <X size={15} />
            </button>
          )}

          {rightActions && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-400">
              {rightActions}
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs font-medium text-red-400 mt-1">{error}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
export default Input;
