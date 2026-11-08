"use client";

import React, { useEffect, useState } from "react";
import { CreditCard, Pencil } from "lucide-react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import DateField from "@/components/ui/DateField";
import Textarea from "@/components/ui/Textarea";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import FormError from "@/components/ui/FormError";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "@/components/ui/StateBlock";
import { useToast } from "@/hooks/useToast";
import {
  listSubscriptions,
  updateSubscription,
  AdminSubscriptionItem,
} from "@/api/admin";
import { getErrorMessage, mapApiError } from "@/api/errors";
import { PLATFORM_SUBSCRIPTION_STATUS } from "@/constants/app";
import { asList, pickLabel } from "@/utils/apiData";
import { formatDate } from "@/utils/format";

const statusTone: Record<string, "success" | "warning" | "danger" | "default"> =
  {
    ACTIVE: "success",
    UNPAID: "warning",
    EXPIRED: "danger",
  };

export default function AdminSubscriptionsPage() {
  const { toast } = useToast();

  const [rows, setRows] = useState<AdminSubscriptionItem[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSlow, setIsSlow] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [editing, setEditing] = useState<AdminSubscriptionItem | null>(null);
  const [status, setStatus] = useState("ACTIVE");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const slowTimer = window.setTimeout(() => {
      if (!cancelled) setIsSlow(true);
    }, 8000);

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await listSubscriptions({
          status: filterStatus || undefined,
        });
        if (cancelled) return;
        setRows(asList(res.data) as AdminSubscriptionItem[]);
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
  }, [reloadKey, filterStatus]);

  const openEdit = (row: AdminSubscriptionItem) => {
    setEditing(row);
    setStatus(row.status || "ACTIVE");
    const raw = row.expiresAt || "";
    setExpiresAt(typeof raw === "string" ? raw.slice(0, 10) : "");
    setNotes(row.notes || "");
    setFormErrors({});
    setGeneralError(null);
  };

  const toExpiresAtIso = (dateOnly: string) => {
    if (!dateOnly) return undefined;
    if (String(dateOnly).includes("T")) return dateOnly;
    const d = new Date(`${dateOnly}T23:59:59.000Z`);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setIsSaving(true);
    setGeneralError(null);
    try {
      const expiresAtIso = toExpiresAtIso(expiresAt);
      await updateSubscription(editing.id, {
        status,
        ...(expiresAtIso ? { expiresAt: expiresAtIso } : {}),
        notes: notes.trim() || null,
      });
      toast.success("تم تحديث الاشتراك");
      setEditing(null);
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      const mapped = mapApiError(err);
      setFormErrors(mapped.fieldErrors);
      setGeneralError(mapped.generalMessage || getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  // دالة محسنة لاستخراج اسم المعلم الحقيقي أو اسم المستخدم بدلاً من الـ ID
  const ownerLabel = (row: AdminSubscriptionItem) => {
    const rowRecord = row as unknown as Record<string, unknown>;

    // 1. فحص كائن المستخدم المرتبط (user) من قاعدة البيانات
    const userObj = (rowRecord.user || {}) as Record<string, unknown>;
    const userNameFromUser = pickLabel(userObj, ["name", "username", "email"]);
    if (userNameFromUser && userNameFromUser !== "—") return userNameFromUser;

    // 2. فحص كائن المعلم (teacher)
    const teacherObj = (row.teacher || {}) as Record<string, unknown>;
    const teacherName = pickLabel(teacherObj, ["name", "username", "email"]);
    if (teacherName && teacherName !== "—") return teacherName;

    // 3. البحث في الحقول المباشرة أو إرجاع قيمة افتراضية واضحة
    return (
      pickLabel(rowRecord, ["teacherName", "ownerName", "username", "name"]) ||
      "معلم غير معروف"
    );
  };

  return (
    <div className="space-y-6 animate-fade dir-rtl" dir="rtl">
      <div>
        <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">
          اشتراكات المنصة
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          تحديث حالة الاشتراك وتاريخ الانتهاء والملاحظات.
        </p>
      </div>

      <div className="w-full sm:w-56">
        <Select
          label="الحالة"
          name="statusFilter"
          value={filterStatus}
          options={[
            { value: "", label: "الكل" },
            ...PLATFORM_SUBSCRIPTION_STATUS,
          ]}
          onChange={(e) => setFilterStatus(e.target.value)}
        />
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
          icon={CreditCard}
          title="لا توجد اشتراكات"
          description="ستظهر الاشتراكات هنا عند إنشائها."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-right text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-bold text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">المعلم</th>
                  <th className="px-5 py-3.5">الحالة</th>
                  <th className="px-5 py-3.5">ينتهي في</th>
                  <th className="px-5 py-3.5">ملاحظات</th>
                  <th className="px-5 py-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((row) => {
                  const statusKey = String(row.status || "").toUpperCase();

                  return (
                    <tr
                      key={String(row.id)}
                      className="transition-colors hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4 font-bold text-slate-100">
                        {ownerLabel(row)}
                      </td>
                      <td className="px-5 py-4">
                        <Badge tone={statusTone[statusKey] || "default"}>
                          {PLATFORM_SUBSCRIPTION_STATUS.find(
                            (s) => s.value === statusKey,
                          )?.label ||
                            row.status ||
                            "—"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        {formatDate(row.expiresAt)}
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        {row.notes ? (
                          <span className="line-clamp-2">{row.notes}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil size={16} />
                          تعديل
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-800 md:hidden">
            {rows.map((row) => {
              const statusKey = String(row.status || "").toUpperCase();

              return (
                <div key={String(row.id)} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-100">
                        {ownerLabel(row)}
                      </p>
                      <p className="text-xs text-slate-400">
                        ينتهي في: {formatDate(row.expiresAt)}
                      </p>
                    </div>
                    <Badge tone={statusTone[statusKey] || "default"}>
                      {PLATFORM_SUBSCRIPTION_STATUS.find(
                        (s) => s.value === statusKey,
                      )?.label ||
                        row.status ||
                        "—"}
                    </Badge>
                  </div>
                  {row.notes && (
                    <p className="text-xs text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      {row.notes}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => openEdit(row)}
                  >
                    <Pencil size={14} />
                    تعديل الاشتراك
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="تحديث الاشتراك"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="الحالة"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={PLATFORM_SUBSCRIPTION_STATUS}
            error={formErrors.status}
          />
          <DateField
            label="تاريخ الانتهاء"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            error={formErrors.expiresAt}
          />
          <Textarea
            label="ملاحظات"
            name="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            error={formErrors.notes}
          />
          <FormError message={generalError} />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(null)}
            >
              إلغاء
            </Button>
            <Button type="submit" loading={isSaving}>
              حفظ
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
