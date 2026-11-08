import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/utils/cn";

export interface CheckboxProps {
  label: string;
  name?: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  description?: string;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  name,
  checked = false,
  onChange,
  disabled = false,
  description,
  className,
}) => {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 transition-all select-none dir-rtl",
        checked && "border-indigo-500/50 bg-indigo-500/5",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span className="relative mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className="peer sr-only"
        />
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all",
            checked
              ? "border-indigo-600 bg-indigo-600 text-white"
              : "border-slate-700 bg-slate-900 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/30",
          )}
        >
          {checked && <Check size={13} strokeWidth={3} />}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-200">
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs text-slate-400">
            {description}
          </span>
        )}
      </span>
    </label>
  );
};

export default Checkbox;
