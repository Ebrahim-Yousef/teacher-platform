"use client";

import React from "react";
import PortalLayout, { NavItem } from "@/components/layout/PortalLayout";
import {
  Users,
  BookOpen,
  UsersRound,
  ClipboardCheck,
  FileText,
  Wallet,
  UserCog,
  Settings,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// قائمة التنقل الموحدة الخاصة ببوابة المعلم والمساعد
const TEACHER_NAV_ITEMS: NavItem[] = [
  { icon: Users, label: "إدارة الطلاب", to: "/teacher/dashboard" },
  { icon: BookOpen, label: "المواد", to: "/teacher/subjects" },
  { icon: UsersRound, label: "المجموعات", to: "/teacher/groups" },
  { icon: ClipboardCheck, label: "الحضور", to: "/teacher/attendance" },
  { icon: FileText, label: "التقييمات", to: "/teacher/assessments" },
  { icon: Wallet, label: "المالية", to: "/teacher/finance" },
  { icon: UserCog, label: "المساعدون", to: "/teacher/assistants" },
  { icon: Settings, label: "الإعدادات", to: "/teacher/settings" },
];

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  // التحقق من صلاحيات المعلم وتصفية الأقسام الخاصة به فقط
  const isTeacherRole =
    user?.role === "TEACHER" || user?.role === "SUPER_ADMIN";

  const teacherOnlyPaths = [
    "/teacher/finance",
    "/teacher/assistants",
    "/teacher/settings",
  ];

  const navItems = TEACHER_NAV_ITEMS.filter(
    (item) => isTeacherRole || !teacherOnlyPaths.includes(item.to),
  );

  return (
    <PortalLayout
      title="لوحة التحكم"
      subtitle="نظام المدرس"
      brand="منصة المعلم"
      navItems={navItems}
      lockOnSubscription={true}
    >
      {children}
    </PortalLayout>
  );
}
