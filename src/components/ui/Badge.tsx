import React from "react";
import { cn } from "@/utils/cn";

export type BadgeTone =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}

const toneMap: Record<BadgeTone, string> = {
  default: "bg-slate-800/80 text-slate-300 border-slate-700/60",
  primary: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  danger: "bg-red-500/10 text-red-400 border-red-500/30",
  info: "bg-sky-500/10 text-sky-400 border-sky-500/30",
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  tone = "default",
  className,
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-bold transition-colors",
      toneMap[tone] || toneMap.default,
      className,
    )}
  >
    {children}
  </span>
);

export default Badge;
