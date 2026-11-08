"use client";

import React, { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/utils/cn";
import PickerPopover from "./PickerPopover";
import { emitChange, parseISOMonth, toISOMonth } from "@/utils/datePicker";

export interface MonthFieldProps {
  label?: string;
  name?: string;
  value?: string;
  onChange?: (e: { target: { name?: string; value: string } }) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const MONTH_INDEXES = Array.from({ length: 12 }, (_, i) => i);

export const MonthField: React.FC<MonthFieldProps> = ({
  label,
  name,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  placeholder = "اختر الشهر",
  className,
}) => {
  const parsed = parseISOMonth(value);
  const now = new Date();
  const [overrideYear, setOverrideYear] = useState<number | null>(null);
  const viewYear = overrideYear ?? parsed?.year ?? now.getFullYear();

  const displayValue = parsed
    ? format(new Date(parsed.year, parsed.monthIndex, 1), "MMMM yyyy", {
        locale: ar,
      })
    : "";

  return (
    <PickerPopover
      label={label}
      name={name}
      required={required}
      disabled={disabled}
      error={error}
      icon={CalendarDays}
      displayValue={displayValue}
      placeholder={placeholder}
      hasValue={Boolean(value)}
      onClear={() => {
        setOverrideYear(null);
        emitChange(name, "", onChange);
      }}
      panelClassName="w-[min(100vw-2rem,18rem)]"
      className={className}
    >
      {({ close }) => (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setOverrideYear(viewYear + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 text-slate-400 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white cursor-pointer"
              title="السنة التالية"
            >
              <ChevronRight size={16} />
            </button>
            <p className="text-sm font-bold text-slate-100 tabular-nums">
              {viewYear}
            </p>
            <button
              type="button"
              onClick={() => setOverrideYear(viewYear - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 text-slate-400 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white cursor-pointer"
              title="السنة السابقة"
            >
              <ChevronLeft size={16} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_INDEXES.map((monthIndex) => {
              const isSelected =
                parsed?.year === viewYear && parsed?.monthIndex === monthIndex;
              const isCurrent =
                now.getFullYear() === viewYear && now.getMonth() === monthIndex;
              const labelText = format(
                new Date(viewYear, monthIndex, 1),
                "MMM",
                { locale: ar },
              );

              return (
                <button
                  key={monthIndex}
                  type="button"
                  onClick={() => {
                    setOverrideYear(null);
                    emitChange(
                      name,
                      toISOMonth(viewYear, monthIndex),
                      onChange,
                    );
                    close();
                  }}
                  className={cn(
                    "rounded-xl px-2 py-2.5 text-sm font-bold transition-all cursor-pointer",
                    isSelected
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : isCurrent
                        ? "bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/30"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  )}
                >
                  {labelText}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </PickerPopover>
  );
};

export default MonthField;
