"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Download, Plus, Wallet } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import MonthField from "@/components/ui/MonthField";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import FormError from "@/components/ui/FormError";
import PaginationControls from "@/components/ui/PaginationControls";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "@/components/ui/StateBlock";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import {
  getFinanceSummary,
  listSubscriptions,
  listFees,
  createFee,
  createPayment,
  FinanceSummary,
  FinanceSubscriptionItem,
  FinanceFeeItem,
} from "@/api/finance";
import { fetchAllGroups, getGroup, updateGroupMember } from "@/api/groups";
import { downloadExport } from "@/api/exports";
import { getErrorMessage, mapApiError } from "@/api/errors";
import { FEE_STATUS, BILLING_WINDOW_STATUS, PAGE_SIZES } from "@/constants/app";
import { currentMonthISO, formatMoney } from "@/utils/format";
import {
  validateFeeForm,
  validatePaymentForm,
  validateMonthlyFeeOverride,
} from "@/utils/validations/formValidation";

const statusTone: Record<string, "danger" | "warning" | "success" | "default"> =
  {
    UNPAID: "danger",
    PARTIAL: "warning",
    PAID: "success",
  };

const windowTone: Record<string, "danger" | "warning" | "success" | "default"> =
  {
    UNPAID: "default",
    WITHIN_WINDOW: "success",
    AFTER_WINDOW: "warning",
    OVERDUE: "danger",
  };

const statusLabel = (value: string) =>
  FEE_STATUS.find((s) => s.value === value)?.label || value || "—";

const windowLabel = (value: string) =>
  BILLING_WINDOW_STATUS.find((s) => s.value === value)?.label || value || "—";

const effectivePrice = (row: FinanceSubscriptionItem | FinanceFeeItem) =>
  row.effectiveMonthlyFee ?? row.effectiveAmountDue ?? row.amountDue ?? 0;

const remainingOf = (row: FinanceSubscriptionItem | FinanceFeeItem) => {
  if (row.remaining != null) return Number(row.remaining);
  const due = Number(row.amountDue ?? 0);
  const paid = Number(row.amountPaid ?? 0);
  return Math.max(0, due - paid);
};

const feeIdOf = (row: FinanceSubscriptionItem) => row.monthlyFeeId ?? row.id;

const hasCustomPrice = (row: FinanceSubscriptionItem | FinanceFeeItem) =>
  row.hasCustomPrice === true ||
  (row.monthlyFeeOverride != null && row.monthlyFeeOverride !== "");

interface PriceEditState {
  studentId: string | number;
  name: string;
  value: string;
  groupDefault?: number;
}

export default function FinancePage() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [month, setMonth] = useState(currentMonthISO());
  const [groupId, setGroupId] = useState("");
  const [status, setStatus] = useState("");
  const [billingWindowStatus, setBillingWindowStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [groups, setGroups] = useState<
    Array<{ id: number | string; name: string; stage?: string; grade?: string }>
  >([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [subscriptions, setSubscriptions] = useState<FinanceSubscriptionItem[]>(
    [],
  );
  const [fees, setFees] = useState<FinanceFeeItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, page: 1 });
  const [groupMembers, setGroupMembers] = useState<
    Array<{
      id?: number | string;
      studentId?: number | string;
      name?: string;
      studentName?: string;
    }>
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSlow, setIsSlow] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const [isFeeOpen, setIsFeeOpen] = useState(false);
  const [feeForm, setFeeForm] = useState({
    studentId: "",
    groupId: "",
    month: currentMonthISO(),
    amountDue: "",
    notes: "",
  });
  const [feeErrors, setFeeErrors] = useState<Record<string, string>>({});
  const [feeGeneral, setFeeGeneral] = useState<string | null>(null);
  const [isFeeSaving, setIsFeeSaving] = useState(false);

  const [isPayOpen, setIsPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    studentId: "",
    monthlyFeeId: "",
    amount: "",
    method: "cash",
    notes: "",
  });
  const [payErrors, setPayErrors] = useState<Record<string, string>>({});
  const [payGeneral, setPayGeneral] = useState<string | null>(null);
  const [isPaySaving, setIsPaySaving] = useState(false);
  const [selectedFee, setSelectedFee] = useState<
    FinanceSubscriptionItem | FinanceFeeItem | null
  >(null);

  const [feeMembers, setFeeMembers] = useState<
    Array<{
      id?: number | string;
      studentId?: number | string;
      name?: string;
      studentName?: string;
    }>
  >([]);

  const [priceEdit, setPriceEdit] = useState<PriceEditState | null>(null);
  const [priceEditError, setPriceEditError] = useState<string | null>(null);
  const [isPriceSaving, setIsPriceSaving] = useState(false);

  const groupOptions = useMemo(
    () =>
      groups.map((g) => ({
        value: String(g.id),
        label: `${g.name} — ${g.stage || ""}/${g.grade || ""}`,
      })),
    [groups],
  );

  useEffect(() => {
    let cancelled = false;
    const loadGroups = async () => {
      try {
        const all = await fetchAllGroups({ isActive: true });
        if (!cancelled) setGroups(all as typeof groups);
      } catch {
        if (!cancelled) setGroups([]);
      }
    };
    loadGroups();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadGroupDetail = async () => {
      if (!groupId) {
        setGroupMembers([]);
        return;
      }
      try {
        const res = (await getGroup(groupId)) as {
          data?: {
            members?: Array<Record<string, unknown>>;
            students?: Array<Record<string, unknown>>;
          };
        };
        if (cancelled) return;
        const members = res.data?.members || res.data?.students || [];
        setGroupMembers(
          Array.isArray(members) ? (members as typeof groupMembers) : [],
        );
      } catch {
        if (!cancelled) setGroupMembers([]);
      }
    };
    loadGroupDetail();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  useEffect(() => {
    let cancelled = false;
    const slowTimer = window.setTimeout(() => {
      if (!cancelled) setIsSlow(true);
    }, 8000);

    const loadFinanceData = async () => {
      setIsLoading(true);
      setIsSlow(false);
      setError(null);
      try {
        const filters = { month, groupId: groupId || undefined };
        const [summaryRes, subsRes, feesRes] = await Promise.all([
          getFinanceSummary(filters),
          groupId
            ? listSubscriptions({
                ...filters,
                status: status || undefined,
                billingWindowStatus: billingWindowStatus || undefined,
              }).catch(() => ({ data: [] }))
            : Promise.resolve({ data: [] }),
          listFees({
            ...filters,
            status: status || undefined,
            billingWindowStatus: billingWindowStatus || undefined,
            page,
            limit,
          }),
        ]);
        if (cancelled) return;
        setSummary(summaryRes.data);
        setSubscriptions(Array.isArray(subsRes.data) ? subsRes.data : []);
        setFees(Array.isArray(feesRes.data) ? feesRes.data : []);
        setMeta({
          page: feesRes.meta?.page || page,
          total: feesRes.meta?.total || 0,
          totalPages: feesRes.meta?.totalPages || 1,
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

    loadFinanceData();

    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
    };
  }, [month, groupId, status, billingWindowStatus, page, limit, reloadKey]);

  const openFee = () => {
    setFeeForm({
      studentId: "",
      groupId: groupId || "",
      month,
      amountDue: "",
      notes: "",
    });
    setFeeMembers(groupId ? groupMembers : []);
    setFeeErrors({});
    setFeeGeneral(null);
    setIsFeeOpen(true);
  };

  const openPayment = (row: FinanceSubscriptionItem | FinanceFeeItem) => {
    setSelectedFee(row);
    const remaining = remainingOf(row);
    const monthlyFeeId = "monthlyFeeId" in row ? feeIdOf(row) : row.id;
    setPayForm({
      studentId: String(row.studentId),
      monthlyFeeId: monthlyFeeId != null ? String(monthlyFeeId) : "",
      amount: remaining > 0 ? String(remaining) : "",
      method: "cash",
      notes: "",
    });
    setPayErrors({});
    setPayGeneral(null);
    setIsPayOpen(true);
  };

  const openPriceEdit = (row: FinanceSubscriptionItem) => {
    if (!groupId) return;
    setPriceEdit({
      studentId: row.studentId,
      name: row.studentName || row.student?.name || `طالب #${row.studentId}`,
      value:
        row.monthlyFeeOverride != null && row.monthlyFeeOverride !== ""
          ? String(row.monthlyFeeOverride)
          : "",
      groupDefault: row.groupDefaultMonthlyFee,
    });
    setPriceEditError(null);
  };

  const savePriceEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceEdit || !groupId) return;
    const check = validateMonthlyFeeOverride(priceEdit.value);
    if (!check.isValid) {
      setPriceEditError(check.message || "خطأ في القيمة المُدخلة");
      return;
    }
    setPriceEditError(null);
    setIsPriceSaving(true);
    try {
      const monthlyFeeOverride =
        priceEdit.value === "" ? null : Number(priceEdit.value);
      await updateGroupMember(groupId, priceEdit.studentId, {
        monthlyFeeOverride,
      });
      toast.success("تم تحديث السعر");
      setPriceEdit(null);
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      setPriceEditError(getErrorMessage(err));
    } finally {
      setIsPriceSaving(false);
    }
  };

  const saveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateFeeForm(feeForm);
    setFeeErrors(validation.errors || {});
    setFeeGeneral(validation.message || null);
    if (!validation.isValid) return;

    setIsFeeSaving(true);
    try {
      const body: Record<string, unknown> = {
        studentId: Number(feeForm.studentId),
        groupId: Number(feeForm.groupId),
        month: feeForm.month,
      };
      if (feeForm.amountDue !== "") {
        body.amountDue = Number(feeForm.amountDue);
      }
      if (feeForm.notes.trim()) body.notes = feeForm.notes.trim();

      await createFee(body);
      toast.success("تم إنشاء الرسوم");
      setIsFeeOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      const mapped = mapApiError(err);
      setFeeErrors(mapped.fieldErrors);
      setFeeGeneral(mapped.generalMessage || getErrorMessage(err));
    } finally {
      setIsFeeSaving(false);
    }
  };

  const savePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validatePaymentForm(payForm);
    setPayErrors(validation.errors || {});
    setPayGeneral(validation.message || null);
    if (!validation.isValid) return;

    setIsPaySaving(true);
    try {
      const body: Record<string, unknown> = {
        studentId: Number(payForm.studentId),
        amount: Number(payForm.amount),
        monthlyFeeId: Number(payForm.monthlyFeeId),
        method: payForm.method || undefined,
      };
      if (payForm.notes.trim()) body.notes = payForm.notes.trim();

      await createPayment(body);
      toast.success("تم تسجيل الدفعة");
      setIsPayOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      const mapped = mapApiError(err);
      setPayErrors(mapped.fieldErrors);
      setPayGeneral(mapped.generalMessage || getErrorMessage(err));
    } finally {
      setIsPaySaving(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const q = new URLSearchParams({ format: "csv" });
      if (month) q.set("month", month);
      await downloadExport(
        `/exports/finance?${q}`,
        token ?? undefined,
        "finance.csv",
      );
      toast.success("تم تنزيل ملف المالية");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  };

  const summaryCards = [
    { key: "expected", label: "المتوقع", value: summary?.expected },
    { key: "collected", label: "المحصّل", value: summary?.collected },
    { key: "remaining", label: "المتبقي", value: summary?.remaining },
  ];

  return (
    <div className="space-y-6 animate-fade dir-rtl" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">
            المالية
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            سجل من دفع / من عليه — مع متابعة أول 5 أيام والمتأخرين.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            loading={isExporting}
            onClick={handleExport}
          >
            <Download size={16} />
            تصدير CSV
          </Button>
          <Button variant="outline" onClick={openFee} disabled={!groups.length}>
            <Plus size={18} />
            إضافة رسوم يدويًا
          </Button>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl sm:grid-cols-2 lg:grid-cols-4">
        <MonthField
          label="الشهر"
          name="month"
          value={month}
          required
          onChange={(e) => {
            setPage(1);
            setMonth(e.target.value);
          }}
        />
        <Select
          label="المجموعة"
          name="groupId"
          value={groupId}
          options={groupOptions}
          onChange={(e) => {
            setPage(1);
            setGroupId(e.target.value);
          }}
          placeholder="اختر مجموعة..."
        />
        <Select
          label="حالة الدفع"
          name="status"
          value={status}
          options={FEE_STATUS}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        />
        <Select
          label="نافذة الدفع"
          name="billingWindowStatus"
          value={billingWindowStatus}
          options={BILLING_WINDOW_STATUS}
          onChange={(e) => {
            setPage(1);
            setBillingWindowStatus(e.target.value);
          }}
          placeholder="الكل"
        />
      </div>

      {isLoading ? (
        <LoadingBlock isSlow={isSlow} />
      ) : error ? (
        <ErrorBlock
          message={getErrorMessage(error)}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {summaryCards.map((card) => (
              <div
                key={card.key}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl"
              >
                <p className="text-xs font-bold text-slate-400">{card.label}</p>
                <p className="mt-1 text-xl font-bold text-slate-100">
                  {formatMoney(card.value ?? 0)}
                </p>
              </div>
            ))}
          </div>

          {summary?.byBillingWindow && (
            <div className="flex flex-wrap gap-2">
              {BILLING_WINDOW_STATUS.map((w) => (
                <Badge key={w.value} tone={windowTone[w.value]}>
                  {w.label}: {summary.byBillingWindow?.[w.value] ?? 0}
                </Badge>
              ))}
            </div>
          )}

          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-100">
              سجل الاشتراكات — من دفع / من عليه
            </h2>
            {!groupId ? (
              <EmptyBlock
                icon={Wallet}
                title="اختر مجموعة لعرض سجل الاشتراكات"
                description="الرسوم تُنشأ تلقائيًا عند التسجيل أو عند فتح الشهر. اختر مجموعة لعرض الأعضاء."
              />
            ) : subscriptions.length === 0 ? (
              <EmptyBlock
                icon={Wallet}
                title="لا توجد اشتراكات لهذا الشهر"
                description="عند فتح الشهر تُنشأ صفوف الرسوم للأعضاء المسجّلين تلقائيًا إن وُجد سعر فعّال."
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-right text-sm">
                    <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-bold text-slate-400">
                      <tr>
                        <th className="px-5 py-3.5">الطالب</th>
                        <th className="px-5 py-3.5">المستحق</th>
                        <th className="px-5 py-3.5">المدفوع</th>
                        <th className="px-5 py-3.5">الحالة</th>
                        <th className="px-5 py-3.5">نافذة الدفع</th>
                        <th className="px-5 py-3.5 text-center">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {subscriptions.map((row) => {
                        const id = feeIdOf(row);
                        return (
                          <tr
                            key={String(id || `${row.studentId}-${row.month}`)}
                            className="transition-colors hover:bg-slate-800/40"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-100">
                                  {row.studentName ||
                                    row.student?.name ||
                                    `طالب #${row.studentId}`}
                                </p>
                                {hasCustomPrice(row) && (
                                  <Badge tone="primary">سعر خاص</Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-slate-300">
                              {formatMoney(effectivePrice(row))}
                            </td>
                            <td className="px-5 py-4 text-slate-300">
                              {formatMoney(row.amountPaid)}
                            </td>
                            <td className="px-5 py-4">
                              <Badge tone={statusTone[row.status] || "default"}>
                                {statusLabel(row.status)}
                              </Badge>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex flex-col gap-1 items-start">
                                <Badge
                                  tone={
                                    windowTone[row.billingWindowStatus] ||
                                    "default"
                                  }
                                >
                                  {windowLabel(row.billingWindowStatus)}
                                </Badge>
                                {row.paidWithinFirstFiveDays && (
                                  <span className="text-[11px] font-medium text-emerald-400">
                                    ضمن أول 5 أيام
                                  </span>
                                )}
                                {row.isOverdue && (
                                  <span className="text-[11px] font-medium text-rose-400">
                                    متأخر
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openPriceEdit(row)}
                                >
                                  تعديل السعر
                                </Button>
                                {row.status !== "PAID" && id != null && (
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => openPayment(row)}
                                  >
                                    تسجيل دفعة
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-slate-800 md:hidden">
                  {subscriptions.map((row) => {
                    const id = feeIdOf(row);
                    return (
                      <div
                        key={String(id || `${row.studentId}-${row.month}`)}
                        className="p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-slate-100">
                              {row.studentName ||
                                row.student?.name ||
                                `طالب #${row.studentId}`}
                            </p>
                            {hasCustomPrice(row) && (
                              <Badge tone="primary" className="mt-1">
                                سعر خاص
                              </Badge>
                            )}
                          </div>
                          <Badge tone={statusTone[row.status] || "default"}>
                            {statusLabel(row.status)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                          <div>
                            <span>المستحق: </span>
                            <span className="font-bold text-slate-200">
                              {formatMoney(effectivePrice(row))}
                            </span>
                          </div>
                          <div>
                            <span>المدفوع: </span>
                            <span className="font-bold text-slate-200">
                              {formatMoney(row.amountPaid)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => openPriceEdit(row)}
                          >
                            تعديل السعر
                          </Button>
                          {row.status !== "PAID" && id != null && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="flex-1"
                              onClick={() => openPayment(row)}
                            >
                              تسجيل دفعة
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {fees.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-slate-100">
                قائمة الرسوم (تفصيلي)
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {fees.map((fee) => (
                  <div
                    key={String(fee.id)}
                    className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl transition-all hover:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-slate-100">
                            {fee.studentName ||
                              fee.student?.name ||
                              `طالب #${fee.studentId}`}
                          </p>
                          {hasCustomPrice(fee) && (
                            <Badge tone="primary">سعر خاص</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{fee.month}</p>
                        {hasCustomPrice(fee) &&
                        fee.groupDefaultMonthlyFee != null ? (
                          <p className="mt-1 text-[11px] text-slate-400">
                            افتراضي المجموعة:{" "}
                            {formatMoney(fee.groupDefaultMonthlyFee)}
                          </p>
                        ) : null}
                      </div>
                      <Badge tone={statusTone[fee.status] || "default"}>
                        {statusLabel(fee.status)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2">
                        <p className="text-slate-400">مستحق</p>
                        <p className="font-bold text-slate-100">
                          {formatMoney(effectivePrice(fee))}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2">
                        <p className="text-slate-400">مدفوع</p>
                        <p className="font-bold text-slate-100">
                          {formatMoney(fee.amountPaid)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2">
                        <p className="text-slate-400">متبقي</p>
                        <p className="font-bold text-slate-100">
                          {formatMoney(remainingOf(fee))}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {fee.billingWindowStatus ? (
                        <Badge
                          tone={
                            windowTone[fee.billingWindowStatus] || "default"
                          }
                        >
                          {windowLabel(fee.billingWindowStatus)}
                        </Badge>
                      ) : null}
                    </div>
                    {fee.status !== "PAID" && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => openPayment(fee)}
                      >
                        تسجيل دفعة
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <PaginationControls
                currentPage={meta.page}
                totalPages={meta.totalPages}
                onPageChange={setPage}
                pageSize={limit}
                onPageSizeChange={(n) => {
                  setLimit(n);
                  setPage(1);
                }}
                totalItems={meta.total}
                pageSizes={PAGE_SIZES}
              />
            </section>
          )}
        </>
      )}

      <Modal
        isOpen={isFeeOpen}
        onClose={() => setIsFeeOpen(false)}
        title="إضافة رسوم يدويًا"
      >
        <form onSubmit={saveFee} className="space-y-4">
          <FormError message={feeGeneral} />
          <p className="text-sm text-slate-400">
            عادةً تُنشأ الرسوم تلقائيًا عند التسجيل أو عند فتح الشهر. استخدم هذا
            النموذج فقط عند الحاجة.
          </p>
          <Select
            label="المجموعة"
            name="groupId"
            value={feeForm.groupId}
            required
            options={groupOptions}
            error={feeErrors.groupId}
            onChange={async (e) => {
              const value = e.target.value;
              setFeeForm((f) => ({ ...f, groupId: value, studentId: "" }));
              if (value) {
                try {
                  const res = (await getGroup(value)) as {
                    data?: {
                      members?: Array<Record<string, unknown>>;
                      students?: Array<Record<string, unknown>>;
                    };
                  };
                  const members = res.data?.members || res.data?.students || [];
                  setFeeMembers(
                    Array.isArray(members)
                      ? (members as typeof feeMembers)
                      : [],
                  );
                } catch {
                  setFeeMembers([]);
                }
              } else {
                setFeeMembers([]);
              }
            }}
          />
          <Select
            label="الطالب"
            name="studentId"
            value={feeForm.studentId}
            required
            options={feeMembers.map((s) => ({
              value: String(s.id ?? s.studentId),
              label: String(s.name || s.studentName),
            }))}
            error={feeErrors.studentId}
            disabled={!feeForm.groupId}
            onChange={(e) =>
              setFeeForm((f) => ({ ...f, studentId: e.target.value }))
            }
          />
          <MonthField
            label="الشهر"
            name="month"
            value={feeForm.month}
            required
            error={feeErrors.month}
            onChange={(e) =>
              setFeeForm((f) => ({ ...f, month: e.target.value }))
            }
          />
          <Input
            label="المبلغ المستحق"
            name="amountDue"
            type="number"
            min="0"
            step="0.01"
            value={feeForm.amountDue}
            error={feeErrors.amountDue}
            onChange={(e) =>
              setFeeForm((f) => ({ ...f, amountDue: e.target.value }))
            }
            placeholder="اتركه فارغًا لاستخدام السعر الفعّال"
          />
          <Textarea
            label="ملاحظات"
            name="notes"
            value={feeForm.notes}
            rows={2}
            onChange={(e) =>
              setFeeForm((f) => ({ ...f, notes: e.target.value }))
            }
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFeeOpen(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" loading={isFeeSaving}>
              حفظ
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(priceEdit)}
        onClose={() => setPriceEdit(null)}
        title={`تعديل السعر — ${priceEdit?.name || ""}`}
      >
        <form onSubmit={savePriceEdit} className="space-y-4">
          <FormError message={priceEditError} />
          {priceEdit?.groupDefault != null ? (
            <p className="text-sm text-slate-400">
              افتراضي المجموعة: {formatMoney(priceEdit.groupDefault)}
            </p>
          ) : null}
          <Input
            label="الرسوم الشهرية المخصصة"
            name="monthlyFeeOverride"
            type="number"
            min="0"
            step="0.01"
            value={priceEdit?.value ?? ""}
            onChange={(e) =>
              setPriceEdit((f) => (f ? { ...f, value: e.target.value } : null))
            }
            placeholder="اتركه فارغًا لاستخدام رسوم المجموعة"
          />
          <p className="text-xs text-slate-400">
            تفريغ الحقل يزيل التخصيص ويعود للافتراضي.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPriceEdit(null)}
            >
              إلغاء
            </Button>
            <Button type="submit" loading={isPriceSaving}>
              حفظ
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isPayOpen}
        onClose={() => setIsPayOpen(false)}
        title="تسجيل دفعة"
      >
        <form onSubmit={savePayment} className="space-y-4">
          <FormError message={payGeneral || payErrors.monthlyFeeId} />
          {selectedFee && (
            <p className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
              المتبقي: <strong>{formatMoney(remainingOf(selectedFee))}</strong>
            </p>
          )}
          <Input
            label="المبلغ"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={payForm.amount}
            required
            error={payErrors.amount}
            onChange={(e) =>
              setPayForm((f) => ({ ...f, amount: e.target.value }))
            }
          />
          <Select
            label="طريقة الدفع"
            name="method"
            value={payForm.method}
            options={[
              { value: "cash", label: "نقدي" },
              { value: "transfer", label: "تحويل" },
              { value: "other", label: "أخرى" },
            ]}
            onChange={(e) =>
              setPayForm((f) => ({ ...f, method: e.target.value }))
            }
          />
          <Textarea
            label="ملاحظات"
            name="notes"
            value={payForm.notes}
            rows={2}
            onChange={(e) =>
              setPayForm((f) => ({ ...f, notes: e.target.value }))
            }
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPayOpen(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" loading={isPaySaving}>
              تسجيل
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
