"use client";

import React from "react";
import ReactPhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { X } from "lucide-react";
import Label from "./Label";

export interface PhoneInputProps {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  label,
  value = "",
  onChange,
  onClear,
  error,
  required = false,
  disabled = false,
}) => {
  const showClearButton = Boolean(value && onClear && !disabled);

  // لضمان التوافق مع طرق الاستيراد المختلفة في Next.js (CJS vs ESM)
  const PhoneComponent =
    (ReactPhoneInput as unknown as { default: typeof ReactPhoneInput })
      .default || ReactPhoneInput;

  return (
    <div className="space-y-1.5 w-full dir-rtl">
      {label && <Label required={required}>{label}</Label>}

      <div className="relative w-full">
        <PhoneComponent
          country="eg"
          onlyCountries={["eg"]}
          disableDropdown
          value={value}
          onChange={(phone: string) => onChange(phone)}
          disabled={disabled}
          inputProps={{
            dir: "ltr", // لضمان ظهور كود الدولة (+20) من اليسار لليمين
          }}
          containerClass="!w-full"
          inputClass="!w-full !h-11 !rounded-xl !bg-slate-900/90 !border-slate-800 !text-slate-100 !text-sm !font-medium focus:!border-indigo-500 focus:!ring-2 focus:!ring-indigo-500/20 text-left"
          buttonClass="!hidden"
        />

        {showClearButton && (
          <button
            type="button"
            onClick={onClear}
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors cursor-pointer"
            title="مسح"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs font-medium text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
};

export default PhoneInput;
