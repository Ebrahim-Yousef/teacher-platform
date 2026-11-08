"use client";

import React, { useEffect, useState } from "react";
import { Plus, Users } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
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
  listAdminTeachers,
  createAdminTeacher,
  AdminTeacherItem,
} from "@/api/admin";
import { getErrorMessage, mapApiError } from "@/api/errors";
import { PLATFORM_SUBSCRIPTION_STATUS } from "@/constants/app";
import { asList, pickLabel } from "@/utils/apiData";

const emptyForm = {
  username: "",
  password: "",
  name: "",
};

const subTone: Record<string, "success" | "warning" | "danger" | "default"> = {
  ACTIVE: "success",
  UNPAID: "warning",
  EXPIRED: "danger",
};

export default function AdminTeachersPage() {
  const { toast } = useToast();

  const [rows, setRows] = useState<AdminTeacherItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSlow, setIsSlow] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
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
        const teachersRes = await listAdminTeachers();
        if (cancelled) return;
        setRows(asList(teachersRes.data) as AdminTeacherItem[]);
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

  const openCreate = () => {
    setFormData(emptyForm);
    setFormErrors({});
    setGeneralError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const username = formData.username.trim();
    if (!username || username.length < 3 || username.length > 30) {
      errors.username = "اسم المستخدم 3–30 حرفًا";
    }
    if (!formData.password || formData.password.length < 6) {
      errors.password = "كلمة المرور 6 أحرف على الأقل";
    } else if (formData.password.length > 128) {
      errors.password = "كلمة المرور 128 حرفًا كحد أقصى";
    }
    if (!formData.name.trim()) errors.name = "الاسم مطلوب";
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    setIsSaving(true);
    setGeneralError(null);
    try {
      await createAdminTeacher({
        username,
        password: formData.password,
        name: formData.name.trim(),
      });
      toast.success(
        "تم إنشاء المعلم — يمكنه تسجيل الدخول من صفحة الدخول بنفس اسم المستخدم وكلمة المرور",
      );
      setIsModalOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      const mapped = mapApiError(err);
      setFormErrors((prev) => ({ ...prev, ...mapped.fieldErrors }));
      setGeneralError(mapped.generalMessage || getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const subscriptionOf = (row: AdminTeacherItem) =>
    row.subscription || row.platformSubscription || null;

  return (
    <div className="space-y-6 animate-fade dir-rtl" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">
            المعلمون
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            إنشاء معلم بحساب دخول (اسم مستخدم وكلمة مرور).
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus size={18} />
          إضافة معلم
        </Button>
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
          icon={Users}
          title="لا يوجد معلمون"
          description="أضف معلمًا جديدًا."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-right text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-bold text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">الاسم</th>
                  <th className="px-5 py-3.5">المستخدم</th>
                  <th className="px-5 py-3.5">الحساب</th>
                  <th className="px-5 py-3.5">الاشتراك</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((row) => {
                  const sub = subscriptionOf(row);
                  const subStatus = String(sub?.status || "").toUpperCase();
                  const rowRecord = row as unknown as Record<string, unknown>;

                  return (
                    <tr
                      key={String(row.id)}
                      className="transition-colors hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4 font-bold text-slate-100">
                        {pickLabel(rowRecord)}
                      </td>
                      <td
                        className="px-5 py-4 font-mono text-slate-300"
                        dir="ltr"
                      >
                        {row.username || row.user?.username || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          tone={row.isActive === false ? "danger" : "success"}
                        >
                          {row.isActive === false ? "غير نشط" : "نشط"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        {sub?.status ? (
                          <Badge tone={subTone[subStatus] || "default"}>
                            {PLATFORM_SUBSCRIPTION_STATUS.find(
                              (s) => s.value === subStatus,
                            )?.label || sub.status}
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
            {rows.map((row) => {
              const sub = subscriptionOf(row);
              const subStatus = String(sub?.status || "").toUpperCase();
              const rowRecord = row as unknown as Record<string, unknown>;

              return (
                <div key={String(row.id)} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-100">
                        {pickLabel(rowRecord)}
                      </p>
                      <p className="text-xs font-mono text-slate-400" dir="ltr">
                        {row.username || row.user?.username || "—"}
                      </p>
                    </div>
                    <Badge tone={row.isActive === false ? "danger" : "success"}>
                      {row.isActive === false ? "غير نشط" : "نشط"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>حالة الاشتراك:</span>
                    {sub?.status ? (
                      <Badge tone={subTone[subStatus] || "default"}>
                        {PLATFORM_SUBSCRIPTION_STATUS.find(
                          (s) => s.value === subStatus,
                        )?.label || sub.status}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="إضافة معلم"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="الاسم"
            value={formData.name}
            onChange={(e) =>
              setFormData((p) => ({ ...p, name: e.target.value }))
            }
            error={formErrors.name}
            required
            placeholder="اسم المعلم الثلاثي"
          />
          <Input
            label="اسم المستخدم"
            value={formData.username}
            onChange={(e) =>
              setFormData((p) => ({ ...p, username: e.target.value }))
            }
            error={formErrors.username}
            required
            placeholder="username"
          />
          <Input
            label="كلمة المرور"
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData((p) => ({ ...p, password: e.target.value }))
            }
            error={formErrors.password}
            required
            placeholder="••••••••"
          />
          <p className="text-xs text-slate-400">
            يسجّل المعلم الدخول من صفحة الدخول بنفس اسم المستخدم وكلمة المرور.
          </p>
          <FormError message={generalError} />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
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
