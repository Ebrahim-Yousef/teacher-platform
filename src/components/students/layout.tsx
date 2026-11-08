"use client";

import React from "react";
import {
  User,
  UsersRound,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Wallet,
} from "lucide-react";
import PortalLayout from "@/components/layout/PortalLayout";

const NAV = [
  { icon: User, label: "ملفي", to: "/student" },
  { icon: UsersRound, label: "المجموعات", to: "/student/groups" },
  { icon: CalendarDays, label: "التقويم", to: "/student/calendar" },
  { icon: ClipboardCheck, label: "الحضور", to: "/student/attendance" },
  { icon: FileText, label: "التقييمات", to: "/student/assessments" },
  { icon: Wallet, label: "المالية", to: "/student/finance" },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalLayout
      title="بوابة الطالب"
      subtitle="عرض فقط عبر كل المعلمين"
      brand="منصة التعليم"
      navItems={NAV}
      lockOnSubscription={false}
    >
      {children}
    </PortalLayout>
  );
}
