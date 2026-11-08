"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "@/components/ui/StateBlock";
import { getStudentAssessments, StudentAssessmentRow } from "@/api/student";
import { getErrorMessage } from "@/api/errors";
import {
  STUDENT_ASSESSMENT_KIND,
  STUDENT_ASSESSMENT_STATUS,
} from "@/constants/app";
import { asList, pickLabel } from "@/utils/apiData";
import { formatDate } from "@/utils/format";

const statusTone: Record<string, "warning" | "success" | "info" | "default"> = {
  upcoming: "warning",
  available: "success",
  submitted: "info",
  closed: "default",
};

export default function StudentAssessmentsPage() {
  const router = useRouter();

  const [rows, setRows] = useState<StudentAssessmentRow[]>([]);
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
        const res = await getStudentAssessments();
        if (cancelled) return;
        const resData = res.data;
        const rawList =
          typeof resData === "object" && resData !== null && "items" in resData
            ? resData.items
            : typeof resData === "object" &&
                resData !== null &&
                "assessments" in resData
              ? resData.assessments
              : resData;

        setRows(asList(rawList) as StudentAssessmentRow[]);
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

  const kindLabel = (kind: string) =>
    STUDENT_ASSESSMENT_KIND.find((k) => k.value === kind)?.label ||
    (kind === "ONLINE" || kind === "online" ? "إلكتروني" : "يدوي");

  const statusLabel = (status: string) =>
    STUDENT_ASSESSMENT_STATUS.find((s) => s.value === status)?.label ||
    status ||
    "—";

  return (
    <div className="space-y-6 animate-fade dir-rtl" dir="rtl">
      <div>
        <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">
          التقييمات
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          اختبارات إلكترونية ودرجات مرصودة يدويًا عبر كل المعلمين.
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
          icon={FileText}
          title="لا توجد تقييمات"
          description="ستظهر الاختبارات والدرجات عند توفرها."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => {
            const id = row.id ?? row.assessmentId;
            const kind = (
              row.kind ||
              row.deliveryMode ||
              "manual"
            ).toLowerCase();
            const status = (row.status || "").toLowerCase();
            const online = kind === "online";
            const rowRecord = row as unknown as Record<string, unknown>;
            const title = pickLabel(rowRecord, ["title", "name"]);

            return (
              <div
                key={String(id ?? i)}
                className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-100">{title}</p>
                    <Badge tone={online ? "info" : "primary"}>
                      {kindLabel(kind)}
                    </Badge>
                    {status ? (
                      <Badge tone={statusTone[status] || "default"}>
                        {statusLabel(status)}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    {formatDate(row.date || row.availableFrom)}
                    {row.teacher?.name || row.teacherName
                      ? ` · ${row.teacher?.name || row.teacherName}`
                      : ""}
                    {row.score != null || row.totalScore != null
                      ? ` · ${row.totalScore ?? row.score}${
                          row.maxScore != null ? ` / ${row.maxScore}` : ""
                        }`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {online && status === "available" ? (
                    <Button
                      size="sm"
                      onClick={() => router.push(`/student/assessments/${id}`)}
                    >
                      ابدأ
                    </Button>
                  ) : null}
                  {online && (status === "submitted" || status === "closed") ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        router.push(`/student/assessments/${id}/result`)
                      }
                    >
                      النتيجة
                    </Button>
                  ) : null}
                  {online && status === "upcoming" ? (
                    <Button size="sm" variant="outline" disabled>
                      قريبًا
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
