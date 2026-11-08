"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  LogOut,
  Settings,
  GraduationCap,
  X,
  ClipboardCheck,
  FileText,
  Wallet,
  UserCog,
  BookOpen,
  UsersRound,
  LucideIcon,
} from "lucide-react";
import SidebarItem from "../ui/SidebarItem";
import ConfirmDialog from "../ui/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";

export interface SidebarProps {
  isMobileOpen?: boolean;
  onClose?: () => void;
  isTeacher?: boolean;
}

interface NavItem {
  icon: LucideIcon;
  label: string;
  to: string;
  teacherOnly?: boolean;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { icon: Users, label: "إدارة الطلاب", to: "/teacher/dashboard" },
  { icon: BookOpen, label: "المواد", to: "/teacher/subjects" },
  { icon: UsersRound, label: "المجموعات", to: "/teacher/groups" },
  { icon: ClipboardCheck, label: "الحضور", to: "/teacher/attendance" },
  { icon: FileText, label: "التقييمات", to: "/teacher/assessments" },
  { icon: Wallet, label: "المالية", to: "/teacher/finance", teacherOnly: true },
  {
    icon: UserCog,
    label: "المساعدون",
    to: "/teacher/assistants",
    teacherOnly: true,
  },
  {
    icon: Settings,
    label: "الإعدادات",
    to: "/teacher/settings",
    teacherOnly: true,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen = false,
  onClose,
  isTeacher = true,
}) => {
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { logout } = useAuth();
  const router = useRouter();

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      setIsLogoutDialogOpen(false);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("فشل تسجيل الخروج", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navItems = ALL_NAV_ITEMS.filter(
    (item) => !item.teacherOnly || isTeacher,
  );

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full p-5 dir-rtl">
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <GraduationCap size={22} />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-base leading-tight">
                لوحة التحكم
              </h2>
              <p className="text-xs text-slate-400 font-medium">نظام المدرس</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 lg:hidden cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex flex-col gap-1.5" onClick={() => onClose?.()}>
          {navItems.map((item) => (
            <SidebarItem
              key={item.to}
              icon={item.icon}
              label={item.label}
              to={item.to}
            />
          ))}
        </nav>
      </div>

      <div className="pt-4 border-t border-slate-800 space-y-2">
        <SidebarItem
          icon={LogOut}
          label="تسجيل الخروج"
          danger
          onClick={() => setIsLogoutDialogOpen(true)}
        />
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex flex-col h-screen w-64 bg-slate-900 border-l border-slate-800 shadow-xl shrink-0">
        {sidebarContent}
      </aside>

      {isMobileOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-50 w-64 bg-slate-900 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden border-l border-slate-800 ${
          isMobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
        onConfirm={handleConfirmLogout}
        loading={isLoggingOut}
        title="تسجيل الخروج"
        message="هل أنت متأكد من رغبتك في تسجيل الخروج من النظام؟"
        confirmText="تسجيل الخروج"
        cancelText="تراجع"
        variant="danger"
      />
    </>
  );
};

export default Sidebar;
