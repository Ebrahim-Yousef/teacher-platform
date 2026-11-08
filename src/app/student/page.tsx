"use client";

import React, { useEffect, useState } from "react";
import { User, GraduationCap, Phone, UserCheck, BookOpen } from "lucide-react";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "@/components/ui/StateBlock";
import { getErrorMessage } from "@/api/errors";
import {
  getStudentMe,
  StudentProfileData,
  StudentMeResponse,
} from "@/api/student";
import { asList, pickLabel } from "@/utils/apiData";

export default function StudentHomePage() {
  const [data, setData] = useState<StudentMeResponse["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSlow, setIsSlow] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const slowTimer = window.setTimeout(() => {
      if (!cancelled) setIsSlow(true);
    }, 8000);

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await getStudentMe();
        if (cancelled) return;
        setData(res.data);
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

    loadData();

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
  if (!data) {
    return (
      <EmptyBlock
        icon={User}
        title="لا توجد بيانات"
        description="تعذر تحميل ملف الطالب."
      />
    );
  }

  const profile: StudentProfileData = data.student || data.profile || data;
  const rawTeachers =
    data.teachers || data.enrollments || profile.teachers || [];
  const teachers = asList(rawTeachers);
  const profileRecord = profile as unknown as Record<string, unknown>;

  return (
    <div className="space-y-6 animate-fade dir-rtl" dir="rtl">
      <div>
        <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">ملفي</h1>
        <p className="mt-1 text-sm text-slate-400">
          الملف الشخصي والمعلمون المسجّل بهم.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <User size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              {pickLabel(profileRecord, ["name", "fullName"])}
            </h2>
            <p className="text-xs text-slate-400">طالب مسجل بالمنصة</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
          {(profile.studentPhone || profile.phone) && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <Phone size={16} className="text-slate-400 shrink-0" />
              <div>
                <p className="text-[11px] text-slate-400">الهاتف</p>
                <p className="font-semibold text-slate-200">
                  {profile.studentPhone || profile.phone}
                </p>
              </div>
            </div>
          )}
          {profile.stage && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <GraduationCap size={16} className="text-slate-400 shrink-0" />
              <div>
                <p className="text-[11px] text-slate-400">المرحلة</p>
                <p className="font-semibold text-slate-200">{profile.stage}</p>
              </div>
            </div>
          )}
          {profile.grade && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <BookOpen size={16} className="text-slate-400 shrink-0" />
              <div>
                <p className="text-[11px] text-slate-400">الصف الدراسي</p>
                <p className="font-semibold text-slate-200">{profile.grade}</p>
              </div>
            </div>
          )}
          {profile.parentPhone && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <Phone size={16} className="text-slate-400 shrink-0" />
              <div>
                <p className="text-[11px] text-slate-400">هاتف ولي الأمر</p>
                <p className="font-semibold text-slate-200">
                  {profile.parentPhone}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <UserCheck size={18} className="text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-200">المعلمون</h2>
        </div>

        {teachers.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">
            لا يوجد معلمون مرتبطون بملفك الحسابي حالياً.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {teachers.map((t, i) => {
              const teacherObj = (
                typeof t === "object" && t !== null
                  ? (t as Record<string, unknown>).teacher || t
                  : t
              ) as Record<string, unknown>;
              const id = String(teacherObj.id ?? i);
              const name = pickLabel(teacherObj, ["name", "teacherName"]);

              return (
                <li
                  key={id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-200"
                >
                  <span>{name}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
