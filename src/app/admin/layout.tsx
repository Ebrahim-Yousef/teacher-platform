"use client";

import React from "react";
import { LayoutDashboard, Users, CreditCard } from "lucide-react";
import PortalLayout from "@/components/layout/PortalLayout";

const NAV = [
  { icon: LayoutDashboard, label: "الرئيسية", to: "/admin" },
  { icon: Users, label: "المعلمون", to: "/admin/teachers" },
  { icon: CreditCard, label: "الاشتراكات", to: "/admin/subscriptions" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalLayout
      title="مشرف المنصة"
      subtitle="إدارة المعلمين والاشتراكات"
      brand="منصة التعليم"
      navItems={NAV}
      lockOnSubscription={false}
    >
      {children}
    </PortalLayout>
  );
}
