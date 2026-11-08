"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/utils/cn";
import PickerPopover from "./PickerPopover";
import {
  emitChange,
  parseHHMM,
  toHHMM,
  to12HourParts,
  from12Hour,
  formatTime12h,
  PERIOD_LABELS,
} from "@/utils/datePicker";

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const PERIODS = ["AM", "PM"] as const;

interface ColumnProps<T extends string | number> {
  items: readonly T[];
  selected: T;
  onSelect: (item: T) => void;
  label: string;
  formatItem?: (item: T) => string;
}

function Column<T extends string | number>({
  items,
  selected,
  onSelect,
  label,
  formatItem,
}: ColumnProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const active = el.querySelector("[data-active='true']");
    if (active) {
      active.scrollIntoView({ block: "center", behavior: "auto" });
    }
  }, [selected]);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <p className="mb-1.5 text-center text-[11px] font-bold text-slate-400">
        {label}
      </p>
      <div
        ref={listRef}
        className="h-44 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 p-1 scroll-smooth"
      >
        {items.map((item) => {
          const isActive = item === selected;
          return (
            <button
              key={item}
              type="button"
              data-active={isActive ? "true" : "false"}
              onClick={() => onSelect(item)}
              className={cn(
                "mb-0.5 flex w-full items-center justify-center rounded-lg py-2 text-sm font-bold tabular-nums transition-all cursor-pointer",
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              )}
            >
              {formatItem ? formatItem(item) : String(item).padStart(2, "0")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface TimeFieldProps {
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

export const TimeField: React.FC<TimeFieldProps> = ({
  label,
  name,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  placeholder = "اختر الوقت",
  className,
}) => {
  const parsed = parseHHMM(value);
  const [draft, setDraft] = useState<{ hours: number; minutes: number } | null>(
    null,
  );

  const hours24 = draft?.hours ?? parsed?.hours ?? 16;
  const minutes = draft?.minutes ?? parsed?.minutes ?? 0;
  const parts = to12HourParts(hours24, minutes);

  const minuteItems = useMemo(() => {
    const extra =
      parsed && !MINUTES.includes(parsed.minutes) ? [parsed.minutes] : [];
    return [...MINUTES, ...extra].sort((a, b) => a - b);
  }, [parsed]);

  const displayValue = parsed ? formatTime12h(value) : "";

  const emit24 = (
    hour12: number,
    mins: number,
    period: "AM" | "PM",
    close?: () => void,
  ) => {
    const { hours, minutes: m } = from12Hour(hour12, mins, period);
    setDraft({ hours, minutes: m });
    emitChange(name, toHHMM(hours, m), onChange);
    close?.();
  };

  const updateWithoutClose = (
    hour12: number,
    mins: number,
    period: "AM" | "PM",
  ) => {
    const { hours, minutes: m } = from12Hour(hour12, mins, period);
    setDraft({ hours, minutes: m });
    emitChange(name, toHHMM(hours, m), onChange);
  };

  return (
    <PickerPopover
      label={label}
      name={name}
      required={required}
      disabled={disabled}
      error={error}
      icon={Clock}
      displayValue={displayValue}
      placeholder={placeholder}
      hasValue={Boolean(value)}
      onClear={() => {
        setDraft(null);
        emitChange(name, "", onChange);
      }}
      panelClassName="w-[min(100vw-2rem,17rem)]"
      className={className}
    >
      {({ close }) => (
        <div className="space-y-3 dir-rtl">
          <div className="flex items-center justify-center gap-2 rounded-xl bg-indigo-500/10 py-2 text-base font-bold tabular-nums text-indigo-400 border border-indigo-500/20">
            {formatTime12h(toHHMM(hours24, minutes))}
          </div>
          <div className="flex gap-2">
            <Column
              label="ساعة"
              items={HOURS_12}
              selected={parts.hour12}
              formatItem={(h) => String(h)}
              onSelect={(h) =>
                updateWithoutClose(h, parts.minutes, parts.period)
              }
            />
            <Column
              label="دقيقة"
              items={minuteItems}
              selected={parts.minutes}
              onSelect={(m) =>
                updateWithoutClose(parts.hour12, m, parts.period)
              }
            />
            <Column
              label="ص/م"
              items={PERIODS}
              selected={parts.period}
              formatItem={(p) => PERIOD_LABELS[p]}
              onSelect={(p) => emit24(parts.hour12, parts.minutes, p, close)}
            />
          </div>
          <button
            type="button"
            onClick={() =>
              emit24(parts.hour12, parts.minutes, parts.period, close)
            }
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500 cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            تأكيد
          </button>
        </div>
      )}
    </PickerPopover>
  );
};

export default TimeField;
