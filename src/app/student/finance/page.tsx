"use client";

import React, { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import Badge from "@/components/ui/Badge";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "@/components/ui/StateBlock";
import { getErrorMessage } from "@/api/errors";
import { getStudentFinance, StudentFinanceFeeItem } from "@/api/student";
import { BILLING_WINDOW_STATUS, FEE_STATUS } from "@/constants/app";
import { asList, pickLabel } from "@/utils/apiData";
import { formatMoney } from "@/utils/format";

const tone: Record<string, "danger" | "warning" | "success" | "default"> = {
  UNPAID: "danger",
  PARTIAL: "warning",
  PAID: "success",
};

const windowTone: Record<
  string,
  "warning" | "success" | "info" | "danger" | "default"
> = {
  UNPAID: "warning",
  WITHIN_WINDOW: "success",
  AFTER_WINDOW: "info",
  OVERDUE: "danger",
};

export default function StudentFinancePage() {
  const [rows, setRows] = useState<StudentFinanceFeeItem[]>([]);
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
        const res = await getStudentFinance();
        if (cancelled) return;
        const resData = res.data;
        const rawList =
          typeof resData === "object" &&
          resData !== null &&
          !Array.isArray(resData)
            ? resData.fees || resData.items || resData.subscriptions || resData
            : resData;

        setRows(asList(rawList) as StudentFinanceFeeItem[]);
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
          المالية
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          عرض المستحق والمدفوع فقط — بدون تسجيل دفعات.
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
          icon={Wallet}
          title="لا توجد رسوم"
          description="ستظهر الرسوم الشهرية هنا عند توفرها."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-right text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-bold text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">الشهر / البند</th>
                  <th className="px-5 py-3.5">المعلم</th>
                  <th className="px-5 py-3.5">المستحق</th>
                  <th className="px-5 py-3.5">المدفوع</th>
                  <th className="px-5 py-3.5">الحالة</th>
                  <th className="px-5 py-3.5">نافذة الدفع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((row, i) => {
                  const due =
                    row.effectiveAmountDue ??
                    row.amountDue ??
                    row.due ??
                    row.amount ??
                    0;
                  const paid = row.amountPaid ?? row.paid ?? 0;
                  const windowStatus = row.billingWindowStatus;
                  const statusKey = String(row.status || "").toUpperCase();
                  const rowRecord = row as unknown as Record<string, unknown>;

                  return (
                    <tr
                      key={String(row.id ?? i)}
                      className="transition-colors hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4 font-bold text-slate-100">
                        {row.month ||
                          pickLabel(rowRecord, ["title", "name", "month"])}
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        {row.teacher?.name || row.teacherName || "—"}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-200">
                        {formatMoney(due)}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-200">
                        {formatMoney(paid)}
                      </td>
                      <td className="px-5 py-4">
                        <Badge tone={tone[statusKey] || "default"}>
                          {FEE_STATUS.find((s) => s.value === statusKey)
                            ?.label ||
                            row.status ||
                            "—"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        {windowStatus ? (
                          <Badge tone={windowTone[windowStatus] || "default"}>
                            {BILLING_WINDOW_STATUS.find(
                              (s) => s.value === windowStatus,
                            )?.label || windowStatus}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-800 md:hidden">
            {rows.map((row, i) => {
              const due =
                row.effectiveAmountDue ??
                row.amountDue ??
                row.due ??
                row.amount ??
                0;
              const paid = row.amountPaid ?? row.paid ?? 0;
              const windowStatus = row.billingWindowStatus;
              const statusKey = String(row.status || "").toUpperCase();
              const rowRecord = row as unknown as Record<string, unknown>;

              return (
                <div key={String(row.id ?? i)} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-100">
                        {row.month ||
                          pickLabel(rowRecord, ["title", "name", "month"])}
                      </p>
                      <p className="text-xs text-slate-400">
                        {row.teacher?.name || row.teacherName || "—"}
                      </p>
                    </div>
                    <Badge tone={tone[statusKey] || "default"}>
                      {FEE_STATUS.find((s) => s.value === statusKey)?.label ||
                        row.status ||
                        "—"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <p>المستحق: {formatMoney(due)}</p>
                    <p>المدفوع: {formatMoney(paid)}</p>
                  </div>
                  {windowStatus && (
                    <div className="pt-1">
                      <Badge tone={windowTone[windowStatus] || "default"}>
                        {BILLING_WINDOW_STATUS.find(
                          (s) => s.value === windowStatus,
                        )?.label || windowStatus}
                      </Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
