"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <div
      dir="rtl"
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-4 text-center text-slate-100"
    >
      <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-500 shadow-lg shadow-amber-500/10 border border-amber-500/20">
        <AlertTriangle size={48} />
      </div>
      <div className="space-y-2">
        <h1 className="text-5xl sm:text-6xl font-extrabold text-white">404</h1>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-200">
          الصفحة غير موجودة
        </h2>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          عذرًا، الصفحة التي تحاول الوصول إليها غير موجودة أو تم نقلها.
        </p>
      </div>
      <Button onClick={() => router.push("/")} variant="primary" size="lg">
        العودة للرئيسية
      </Button>
    </div>
  );
}
