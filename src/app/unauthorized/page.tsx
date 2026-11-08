"use client";

import React from "react";
import { ShieldAlert, Home } from "lucide-react";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

export default function UnauthorizedPage() {
  const { homePath } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-slate-100 dir-rtl text-center" dir="rtl">
      <div className="mx-auto max-w-md space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <ShieldAlert size={36} />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-100">
            غير مصرح لك بالوصول
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            عذراً، ليس لديك الصلاحيات الكافية للوصول إلى هذه الصفحة أو هذا القسم في المنصة.
          </p>
        </div>

        <div className="pt-2">
          <Button
            onClick={() => {
              window.location.href = homePath || "/login";
            }}
            className="w-full flex items-center justify-center gap-2"
          >
            <Home size={18} />
            العودة إلى لوحة التحكم الرئيسية
          </Button>
        </div>
      </div>
    </div>
  );
}
