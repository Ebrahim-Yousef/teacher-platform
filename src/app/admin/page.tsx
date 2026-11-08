"use client";

import React, { useEffect, useState } from "react";
import { Users, UserCheck, ShieldCheck } from "lucide-react";
import { ErrorBlock, LoadingBlock } from "@/components/ui/StateBlock";
import { listAdminTeachers, listSubscriptions } from "@/api/admin";
import { getErrorMessage } from "@/api/errors";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    teachersCount: 0,
    activeSubscriptionsCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSlow, setIsSlow] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const slowTimer = window.setTimeout(() => {
      if (!cancelled) setIsSlow(true);
    }, 8000);

    const loadStats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [teachersRes, subsRes] = await Promise.all([
          listAdminTeachers(),
          listSubscriptions(),
        ]);

        if (cancelled) return;

        const teachers = Array.isArray(teachersRes.data)
          ? teachersRes.data
          : [];
        const subs = Array.isArray(subsRes.data) ? subsRes.data : [];
        const activeSubs = subs.filter(
          (s) => String(s.status).toUpperCase() === "ACTIVE",
        );

        setStats({
          teachersCount: teachers.length,
          activeSubscriptionsCount: activeSubs.length,
        });
      } catch (err: unknown) {
        if (!cancelled) setError(err);
      } finally {
        window.clearTimeout(slowTimer);
        if (!cancelled) {
          setIsLoading(false);
          setIsSlow(false);
        }
      }
    };

    loadStats();

    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
    };
  }, [reloadKey]);

  if (isLoading) return <LoadingBlock isSlow={isSlow} />;
  if (error) {
    return (
      <ErrorBlock
        message={getErrorMessage(error)}
        onRetry={() => setReloadKey((k) => k + 1)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade dir-rtl" dir="rtl">
      <div>
        <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">
          لوحة تحكم المشرف الرئيسي
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          متابعة إحصائيات المعلمين والاشتراكات عبر المنصة.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              إجمالي المعلمين
            </span>
            <span className="rounded-xl bg-indigo-500/10 p-2.5 text-indigo-400 border border-indigo-500/20">
              <Users size={20} />
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-100">
            {stats.teachersCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              الاشتراكات النشطة
            </span>
            <span className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400 border border-emerald-500/20">
              <UserCheck size={20} />
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-100">
            {stats.activeSubscriptionsCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl transition-all hover:border-slate-700 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              حالة النظام
            </span>
            <span className="rounded-xl bg-blue-500/10 p-2.5 text-blue-400 border border-blue-500/20">
              <ShieldCheck size={20} />
            </span>
          </div>
          <p className="mt-3 text-lg font-bold tracking-tight text-emerald-400">
            مستقر ومفعل
          </p>
        </div>
      </div>
    </div>
  );
}
