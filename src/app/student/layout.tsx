"use client";

import React from "react";
import PortalLayout, { NavItem } from "@/components/layout/PortalLayout";
import {
  User,
  UsersRound,
  ClipboardCheck,
  FileText,
  CalendarDays,
  Wallet,
} from "lucide-react";

const STUDENT_NAV_ITEMS: NavItem[] = [
  { icon: User, label: "ملفي الشخصي", to: "/student" },
  { icon: UsersRound, label: "مجموعاتي", to: "/student/groups" },
  { icon: ClipboardCheck, label: "سجل الحضور", to: "/student/attendance" },
  { icon: FileText, label: "التقييمات والاختبارات", to: "/student/assessments" },
  { icon: CalendarDays, label: "الجدول الزمني", to: "/student/calendar" },
  { icon: Wallet, label: "المالية والاشتراكات", to: "/student/finance" },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalLayout
      title="بوابة الطالب"
      subtitle="متابعة الحصص والاختبارات"
      brand="منصة التعليم"
      navItems={STUDENT_NAV_ITEMS}
      lockOnSubscription={false}
    >
      {children}
    </PortalLayout>
  );
}
