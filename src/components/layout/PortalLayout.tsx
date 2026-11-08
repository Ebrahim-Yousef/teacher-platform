"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_LABELS } from "@/constants/app";
import { getInitials } from "@/utils/format";
import SidebarItem from "@/components/ui/SidebarItem";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SubscriptionLockScreen from "@/components/ui/SubscriptionLockScreen";
import NotificationBell from "@/components/NotificationBell";

export interface NavItem {
  icon: React.ElementType;
  label: string;
  to: string;
}

export interface PortalLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  brand?: string;
  navItems?: NavItem[];
  lockOnSubscription?: boolean;
}

export const PortalLayout: React.FC<PortalLayoutProps> = ({
  children,
  title,
  subtitle = "",
  brand = "منصة التعليم",
  navItems = [],
  lockOnSubscription = false,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const { user, logout, subscriptionLocked, isBooting } = useAuth();
  const router = useRouter();

  // منع الرسوم والرندر لوحة التحكم خلال مرحلة الإقلاع لتفادي الوميض (Flash)
  if (isBooting) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (lockOnSubscription && subscriptionLocked) {
    return <SubscriptionLockScreen />;
  }

  const initials = getInitials(user?.name).toUpperCase();
  const roleLabel = user?.role
    ? ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || "مستخدم"
    : "مستخدم";

  const handleConfirmLogout = async () => {
    setIsLogoutDialogOpen(false);
    await logout();
    router.replace("/login");
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-5">
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 px-2 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <GraduationCap size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight text-slate-100">
                {title}
              </h2>
              {subtitle ? (
                <p className="text-xs font-medium text-slate-400">{subtitle}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>
        <nav
          className="flex flex-col gap-2"
          onClick={() => setIsSidebarOpen(false)}
        >
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
      <div className="space-y-2 border-t border-slate-800 pt-4">
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
    <div
      className="flex h-screen overflow-hidden bg-slate-950 font-sans text-slate-100 dir-rtl"
      dir="rtl"
    >
      {/* Sidebar Desktop */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-l border-slate-800 bg-slate-900 shadow-xl lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-xs transition-opacity lg:hidden"
        />
      )}

      {/* Sidebar Mobile */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-64 bg-slate-900 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main Content Viewport */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 shadow-md backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-800 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white lg:hidden"
              title="القائمة"
            >
              <Menu size={20} />
            </button>
            <div className="hidden items-center gap-2 text-base font-bold text-indigo-400 sm:flex">
              <GraduationCap size={22} className="text-indigo-400" />
              <span>{brand}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="flex h-10 w-10 select-none items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/20">
              {initials}
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-slate-100">{user?.name}</p>
              <p className="text-[11px] font-medium text-slate-400">
                {roleLabel}
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
        onConfirm={handleConfirmLogout}
        title="تسجيل الخروج"
        message="هل أنت متأكد من رغبتك في تسجيل الخروج من النظام؟"
        confirmText="تسجيل الخروج"
        cancelText="تراجع"
        variant="danger"
      />
    </div>
  );
};

export default PortalLayout;
