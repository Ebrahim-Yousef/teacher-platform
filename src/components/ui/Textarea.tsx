import React from "react";
import { cn } from "@/utils/cn";
import Label from "./Label";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  required?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      name,
      value,
      onChange,
      placeholder,
      error,
      required = false,
      disabled = false,
      rows = 4,
      maxLength,
      className,
      ...rest
    },
    ref,
  ) => {
    return (
      <div className="space-y-1.5 w-full dir-rtl text-right">
        {label && (
          <Label htmlFor={name} required={required}>
            {label}
          </Label>
        )}
        <textarea
          ref={ref}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          className={cn(
            "w-full resize-y rounded-xl border bg-slate-900/90 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all duration-200",
            error
              ? "border-red-500/80 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              : "border-slate-800 hover:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
            disabled &&
              "cursor-not-allowed bg-slate-950 text-slate-500 opacity-60",
            className,
          )}
          {...rest}
        />
        {error && (
          <p className="mt-1 text-xs font-medium text-red-400">{error}</p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
export default Textarea;
