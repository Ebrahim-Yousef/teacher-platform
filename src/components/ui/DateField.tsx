"use client";

import React from "react";
import { Calendar } from "lucide-react";
import { DayPicker, Matcher } from "react-day-picker";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import "react-day-picker/style.css";
import PickerPopover from "./PickerPopover";
import { emitChange, parseISODate, toISODate } from "@/utils/datePicker";

export interface DateFieldProps {
  label?: string;
  name?: string;
  value?: string;
  onChange?: (e: { target: { name?: string; value: string } }) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
  className?: string;
}

/**
 * Professional day calendar picker.
 * Stores / emits YYYY-MM-DD; displays Arabic long date.
 */
export const DateField: React.FC<DateFieldProps> = ({
  label,
  name,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  min,
  max,
  placeholder = "اختر التاريخ",
  className,
}) => {
  const selected = parseISODate(value);
  const minDate = parseISODate(min);
  const maxDate = parseISODate(max);

  const displayValue = selected
    ? format(selected, "d MMMM yyyy", { locale: ar })
    : "";

  const disabledMatchers: Matcher[] = [];
  if (minDate) disabledMatchers.push({ before: minDate });
  if (maxDate) disabledMatchers.push({ after: maxDate });

  return (
    <PickerPopover
      label={label}
      name={name}
      required={required}
      disabled={disabled}
      error={error}
      icon={Calendar}
      displayValue={displayValue}
      placeholder={placeholder}
      hasValue={Boolean(value)}
      onClear={() => emitChange(name, "", onChange)}
      panelClassName="w-[min(100vw-2rem,20.5rem)]"
      className={className}
    >
      {({ close }) => (
        <div className="dir-rtl text-slate-100">
          <DayPicker
            mode="single"
            animate
            dir="rtl"
            locale={ar}
            selected={selected}
            defaultMonth={selected || minDate || new Date()}
            disabled={disabledMatchers.length ? disabledMatchers : undefined}
            onSelect={(date) => {
              if (!date) return;
              emitChange(name, toISODate(date), onChange);
              close();
            }}
          />
        </div>
      )}
    </PickerPopover>
  );
};

export default DateField;
