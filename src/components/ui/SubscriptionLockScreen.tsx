"use client";

import React, { useState } from "react";
import { Lock, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import Button from "./Button";

export const SubscriptionLockScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      console.error("فشل تسجيل الخروج");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-100"
    >
      <div className="w-full max-w-md rounded-3xl border border-amber-500/20 bg-slate-900 p-8 shadow-2xl backdrop-blur-md">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Lock size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-100">الاشتراك غير فعال</h1>
        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-400">
          اشتراك المنصة غير مفعّل أو منتهٍ. لا يمكن استخدام لوحة التحكم حتى يتم
          تفعيل الاشتراك. تواصل مع مشرف المنصة أو مدير المركز.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-8 w-full"
          onClick={handleLogout}
          loading={loading}
        >
          <LogOut size={18} />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );
};

export default SubscriptionLockScreen;
