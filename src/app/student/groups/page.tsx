"use client";

import React, { useEffect, useState } from "react";
import { UsersRound } from "lucide-react";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "@/components/ui/StateBlock";
import { getErrorMessage } from "@/api/errors";
import { listStudentGroups, StudentGroupItem } from "@/api/student";
import { asList, pickLabel } from "@/utils/apiData";

export default function StudentGroupsPage() {
  const [rows, setRows] = useState<StudentGroupItem[]>([]);
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
        const res = await listStudentGroups();
        if (cancelled) return;
        setRows(asList(res.data) as StudentGroupItem[]);
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

  return (
    <div className="space-y-6 animate-fade dir-rtl" dir="rtl">
      <div>
        <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">
          المجموعات
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          مجموعاتك الدراسية عبر كل المعلمين.
        </p>
      </div>

      {isLoading ? (
        <LoadingBlock isSlow={isSlow} />
      ) : error ? (
        <ErrorBlock
          message={getErrorMessage(error)}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      ) : rows.length === 0 ? (
        <EmptyBlock
          icon={UsersRound}
          title="لا توجد مجموعات"
          description="ستظهر المجموعات عند تسجيلك فيها."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-right text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-bold text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">المجموعة</th>
                  <th className="px-5 py-3.5">المعلم</th>
                  <th className="px-5 py-3.5">المادة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((row) => {
                  const rowRecord = row as unknown as Record<string, unknown>;
                  const subjectName =
                    row.subject?.name ||
                    row.subjectBranch?.name ||
                    row.subjectName ||
                    "—";

                  return (
                    <tr
                      key={String(row.id)}
                      className="transition-colors hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4 font-bold text-slate-100">
                        {pickLabel(rowRecord)}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {row.teacher?.name || row.teacherName || "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        {subjectName}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-800 md:hidden">
            {rows.map((row) => {
              const rowRecord = row as unknown as Record<string, unknown>;
              const subjectName =
                row.subject?.name ||
                row.subjectBranch?.name ||
                row.subjectName ||
                "—";

              return (
                <div key={String(row.id)} className="p-4 space-y-2">
                  <p className="font-bold text-slate-100">
                    {pickLabel(rowRecord)}
                  </p>
                  <p className="text-xs text-slate-400">
                    المعلم: {row.teacher?.name || row.teacherName || "—"}
                  </p>
                  <p className="text-xs text-slate-400">
                    المادة: {subjectName}
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
