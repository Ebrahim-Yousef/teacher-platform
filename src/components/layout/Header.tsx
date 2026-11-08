"use client";

import React from "react";
import { Menu, GraduationCap } from "lucide-react";
import NotificationBell from "../NotificationBell";

export interface HeaderUser {
  name?: string;
  email?: string;
  role?: string;
}

export interface HeaderProps {
  onMenuToggle?: () => void;
  user?: HeaderUser | null;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "المسؤول الرئيسي",
  TEACHER: "معلم",
  ASSISTANT: "مساعد",
  STUDENT: "طالب",
};

const getInitials = (name?: string): string => {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`;
  }
  return name.slice(0, 2);
};

export const Header: React.FC<HeaderProps> = ({ onMenuToggle, user }) => {
  const initials = getInitials(user?.name).toUpperCase();
  const roleLabel = user?.role ? ROLE_LABELS[user.role] || "مستخدم" : "مستخدم";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 sm:px-6 lg:px-8 shadow-sm backdrop-blur-md dir-rtl">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 text-slate-300 lg:hidden hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          title="القائمة"
        >
          <Menu size={20} />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-indigo-400 font-bold text-base">
          <GraduationCap size={22} className="text-indigo-400" />
          <span>منصة المعلم</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white shadow-md shadow-indigo-600/20 select-none ring-2 ring-indigo-500/20">
          {initials}
        </div>

        <div className="text-right hidden sm:block">
          <p className="text-xs font-semibold text-slate-100">
            {user?.name || "المستخدم"}
          </p>
          <p className="text-[11px] text-slate-400">{roleLabel}</p>
        </div>
      </div>
    </header>
  );
};

export default Header;
