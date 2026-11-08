"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";

export interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  to?: string;
  onClick?: () => void;
  danger?: boolean;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  label,
  to,
  onClick,
  danger = false,
}) => {
  const pathname = usePathname();
  const isActive = to
    ? pathname === to || pathname.startsWith(`${to}/`)
    : false;

  const baseClasses =
    "flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 cursor-pointer select-none w-full dir-rtl";

  const content = (
    <>
      <Icon className="shrink-0" size={20} />
      <span>{label}</span>
    </>
  );

  if (to) {
    return (
      <Link
        href={to}
        className={cn(
          baseClasses,
          isActive
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 font-bold"
            : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100",
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        baseClasses,
        danger
          ? "text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100",
      )}
    >
      {content}
    </button>
  );
};

export default SidebarItem;
