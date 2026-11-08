"use client";

import React, { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import Badge from "@/components/ui/Badge";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "@/components/ui/StateBlock";
import { getErrorMessage } from "@/api/errors";
import {
  getStudentAttendance,
  StudentAttendanceItem,
  StudentAttendanceSummary,
} from "@/api/student";
import { ATTENDANCE_STATUS } from "@/constants/app";
import { asList, pickLabel } from "@/utils/apiData";
import { formatDate } from "@/utils/format";

const tone: Record<string, "success" | "danger" | "warning" | "default"> = {
  PRESENT: "success",
  ABSENT: "danger",
  LATE: "warning",
};

export default function StudentAttendancePage() {
  const [records, setRecords] = useState<StudentAttendanceItem[]>([]);
  const [summary, setSummary] = useState<StudentAttendanceSummary | null>(null);
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
        const res = await getStudentAttendance();
        if (cancelled) return;
        const resData = res.data;
        const rawList =
          resData?.records || resData?.history || resData?.items || resData;

        setRecords(asList(rawList) as StudentAttendanceItem[]);
        setSummary(resData?.summary || null);
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

  const summaryRecord = summary as Record<string, number | undefined> | null;

  return (
    <div className="space-y-6 animate-fade dir-rtl" dir="rtl">
      <div>
        <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">الحضور</h1>
        <p className="mt-1 text-sm text-slate-400">سجل الحضور المجمّع.</p>
      </div>

      {summaryRecord && Object.keys(summaryRecord).length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["present", "PRESENT"],
            ["absent", "ABSENT"],
            ["late", "LATE"],
          ].map(([lower, upper]) => (
            <div
              key={upper}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl"
            >
              <p className="text-xs font-bold text-slate-400">
                {ATTENDANCE_STATUS.find((s) => s.value === upper)?.label ||
                  upper}
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-100">
                {summaryRecord[lower] ?? summaryRecord[upper] ?? "—"}
              </p>
            </div>
          ))}
          {summaryRecord.attendanceRate != null ||
          summaryRecord.rate != null ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl sm:col-span-3">
              <p className="text-xs font-bold text-slate-400">نسبة الحضور</p>
              <p className="mt-2 text-2xl font-bold text-slate-100">
                {summaryRecord.attendanceRate ?? summaryRecord.rate}%
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {isLoading ? (
        <LoadingBlock isSlow={isSlow} />
      ) : error ? (
        <ErrorBlock
          message={getErrorMessage(error)}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      ) : records.length === 0 ? (
        <EmptyBlock
          icon={ClipboardCheck}
          title="لا سجلات حضور"
          description="سيظهر الحضور بعد تسجيل الحصص."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-right text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-bold text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">التاريخ</th>
                  <th className="px-5 py-3.5">الحصة / المجموعة</th>
                  <th className="px-5 py-3.5">المعلم</th>
                  <th className="px-5 py-3.5">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {records.map((row, i) => {
                  const targetObj = (row.session || row.group || row) as Record<
                    string,
                    unknown
                  >;
                  const statusKey = String(row.status || "").toUpperCase();

                  return (
                    <tr
                      key={String(row.id ?? i)}
                      className="transition-colors hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4 font-medium text-slate-300">
                        {formatDate(row.date || row.session?.date)}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-100">
                        {pickLabel(targetObj, ["title", "name"])}
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        {row.teacher?.name || row.teacherName || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <Badge tone={tone[statusKey] || "default"}>
                          {ATTENDANCE_STATUS.find((s) => s.value === statusKey)
                            ?.label ||
                            row.status ||
                            "—"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-800 md:hidden">
            {records.map((row, i) => {
              const targetObj = (row.session || row.group || row) as Record<
                string,
                unknown
              >;
              const statusKey = String(row.status || "").toUpperCase();

              return (
                <div key={String(row.id ?? i)} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-slate-100">
                      {pickLabel(targetObj, ["title", "name"])}
                    </p>
                    <Badge tone={tone[statusKey] || "default"}>
                      {ATTENDANCE_STATUS.find((s) => s.value === statusKey)
                        ?.label ||
                        row.status ||
                        "—"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    {formatDate(row.date || row.session?.date)}
                    {row.teacher?.name || row.teacherName
                      ? ` · المعلم: ${row.teacher?.name || row.teacherName}`
                      : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
