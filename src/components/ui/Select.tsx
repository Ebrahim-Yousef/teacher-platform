"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  components,
  DropdownIndicatorProps,
  StylesConfig,
  Props as ReactSelectProps,
} from "react-select";
import Label from "./Label";

// تحميل مكتبة react-select حصرياً على جهة العميل لمنع أي تضارب في الـ SSR والـ IDs
const ReactSelect = dynamic(() => import("react-select"), {
  ssr: false,
  loading: () => (
    <div className="min-h-11 rounded-xl border border-slate-800 bg-slate-900/90 flex items-center px-3 text-slate-500 text-sm">
      جاري التحميل...
    </div>
  ),
}) as unknown as React.ComponentType<ReactSelectProps<SelectOption, false>>;

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps {
  label?: string;
  name?: string;
  value?: string | number | null;
  onChange?: (e: { target: { name?: string; value: string } }) => void;
  options?: ReadonlyArray<SelectOption | string | number>;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const CustomDropdownIndicator = (
  props: DropdownIndicatorProps<SelectOption, false>,
) => {
  const { selectProps } = props;
  return (
    <components.DropdownIndicator {...props}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
          selectProps.menuIsOpen ? "rotate-180 text-indigo-400" : ""
        }`}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 8.25l-7.5 7.5-7.5-7.5"
        />
      </svg>
    </components.DropdownIndicator>
  );
};

export const Select: React.FC<SelectProps> = ({
  label,
  name,
  value,
  onChange,
  options = [],
  error,
  required = false,
  disabled = false,
  placeholder = "اختر...",
}) => {
  const [menuIsOpen, setMenuIsOpen] = useState(false);

  const selectOptions: SelectOption[] = options.map((option) =>
    typeof option === "object" && option !== null
      ? (option as SelectOption)
      : { value: option, label: String(option) },
  );

  const selectedValue =
    selectOptions.find((opt) => String(opt.value) === String(value)) || null;

  const handleChange = (selectedOption: SelectOption | null) => {
    if (onChange) {
      onChange({
        target: {
          name,
          value: selectedOption ? String(selectedOption.value) : "",
        },
      });
    }
  };

  const customStyles: StylesConfig<SelectOption, false> = {
    control: (base, state) => ({
      ...base,
      minHeight: "44px",
      borderRadius: "0.75rem",
      borderColor: error
        ? "rgba(239, 68, 68, 0.8)"
        : state.isFocused
          ? "#6366f1"
          : "#1e293b",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(99, 102, 241, 0.2)" : "none",
      direction: "rtl",
      backgroundColor: disabled ? "#020617" : "rgba(15, 23, 42, 0.9)",
      cursor: disabled ? "not-allowed" : "pointer",
      "&:hover": {
        borderColor: error ? "rgba(239, 68, 68, 0.8)" : "#334155",
      },
      transition: "all 0.2s ease",
    }),
    menu: (base) => ({
      ...base,
      direction: "rtl",
      borderRadius: "0.75rem",
      backgroundColor: "#0f172a",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
      border: "1px solid #1e293b",
      zIndex: 100,
      overflow: "hidden",
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 100,
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "#4f46e5"
        : state.isFocused
          ? "rgba(99, 102, 241, 0.15)"
          : "transparent",
      color: state.isSelected
        ? "#ffffff"
        : state.isFocused
          ? "#818cf8"
          : "#cbd5e1",
      cursor: "pointer",
      fontSize: "0.875rem",
      fontWeight: state.isSelected ? "600" : "400",
      padding: "10px 14px",
    }),
    placeholder: (base) => ({
      ...base,
      color: "#64748b",
      fontSize: "0.875rem",
    }),
    singleValue: (base) => ({
      ...base,
      color: "#f8fafc",
      fontSize: "0.875rem",
      fontWeight: "500",
    }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (base) => ({
      ...base,
      paddingLeft: "10px",
      paddingRight: "10px",
    }),
  };

  return (
    <div className="space-y-1.5 w-full dir-rtl">
      {label && (
        <Label htmlFor={name} required={required}>
          {label}
        </Label>
      )}

      <ReactSelect
        instanceId={name || "platform-select"}
        id={name}
        name={name}
        value={selectedValue}
        onChange={handleChange}
        options={selectOptions}
        styles={customStyles}
        isDisabled={disabled}
        placeholder={placeholder}
        isClearable
        noOptionsMessage={() => "لا توجد اختيارات"}
        menuIsOpen={menuIsOpen}
        onMenuOpen={() => setMenuIsOpen(true)}
        onMenuClose={() => setMenuIsOpen(false)}
        menuPortalTarget={
          typeof document !== "undefined" ? document.body : null
        }
        menuPosition="fixed"
        components={{
          DropdownIndicator: CustomDropdownIndicator,
        }}
      />

      {error && (
        <p className="text-xs font-medium text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
};

export default Select;
