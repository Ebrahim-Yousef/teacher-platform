import React from "react";
import { cn } from "@/utils/cn";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label: React.FC<LabelProps> = ({
  children,
  htmlFor,
  required = false,
  className,
  ...props
}) => {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "block text-sm font-semibold text-slate-200 select-none",
        className,
      )}
      {...props}
    >
      {children}
      {required && <span className="mr-1 text-red-400 font-bold">*</span>}
    </label>
  );
};

export default Label;
