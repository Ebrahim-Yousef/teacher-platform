import React from "react";
import { cn } from "@/utils/cn";

export interface SpinnerProps {
  size?: number;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 18, className }) => {
  return (
    <span
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent text-indigo-500",
        className,
      )}
      style={{
        width: size,
        height: size,
      }}
      role="status"
      aria-label="جاري التحميل"
    />
  );
};

export default Spinner;
