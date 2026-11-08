"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, UserCog } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FormError from "@/components/ui/FormError";
import Badge from "@/components/ui/Badge";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "@/components/ui/StateBlock";
import { useToast } from "@/hooks/useToast";
import {
  listAssistants,
  createAssistant,
  updateAssistant,
  deleteAssistant,
  AssistantItem,
} from "@/api/assistants";
import { getErrorMessage, mapApiError } from "@/api/errors";
import { validateAssistantForm } from "@/utils/validations/formValidation";

const emptyForm = { username: "", password: "", name: "" };

export default function AssistantsPage() {
  const { toast } = useToast();

  const [assistants, setAssistants] = useState<AssistantItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSlow, setIsSlow] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [toDelete, setToDelete] = useState<AssistantItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const slowTimer = window.setTimeout(() => {
      if (!cancelled) setIsSlow(true);
    }, 8000);

    const loadData = async () => {
      setIsLoading(true);
      setIsSlow(false);
      setError(null);
      try {
        const res = await listAssistants();
        if (cancelled) return;
        setAssistants(Array.isArray(res.data) ? res.data : []);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err);
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateAssistantForm(formData);
    setFormErrors(result.errors);
    setGeneralError(result.message || null);
    if (!result.isValid) return;

    setIsSaving(true);
    setGeneralError(null);
    try {
      await createAssistant({
        username: formData.username.trim(),
        password: formData.password,
        name: formData.name.trim(),
      });
      toast.success("تم إضافة المساعد بنجاح");
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

  const handleToggle = async (assistant: AssistantItem) => {
    setTogglingId(assistant.id);
    try {
      await updateAssistant(assistant.id, {
        isActive: !assistant.isActive,
      });
      toast.success(
        assistant.isActive ? "تم تعطيل حساب المساعد" : "تم تفعيل حساب المساعد",
      );
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    try {
      await deleteAssistant(toDelete.id);
      toast.success("تم حذف المساعد");
      setToDelete(null);
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade dir-rtl" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
            المساعدون
          </h1>
          <p className="mt-1 text-xs font-medium text-slate-400 sm:text-sm">
            إدارة حسابات المساعدين وصلاحيات الدخول.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus size={18} />
          إضافة مساعد
        </Button>
      </div>

      {isLoading ? (
        <LoadingBlock isSlow={isSlow} />
      ) : error ? (
        <ErrorBlock
          message={getErrorMessage(error)}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      ) : assistants.length === 0 ? (
        <EmptyBlock
          icon={UserCog}
          title="لا يوجد مساعدون"
          description="أضف مساعدًا لمساعدتك في إدارة الطلاب والحضور."
          action={
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus size={16} />
              إضافة مساعد
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-950/60 text-xs font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">الاسم</th>
                  <th className="px-5 py-3.5">اسم المستخدم</th>
                  <th className="px-5 py-3.5">الحالة</th>
                  <th className="px-5 py-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {assistants.map((assistant) => (
                  <tr
                    key={assistant.id}
                    className="transition-colors hover:bg-slate-800/40"
                  >
                    <td className="px-5 py-4 font-bold text-slate-100">
                      {assistant.name}
                    </td>
                    <td
                      className="px-5 py-4 font-mono text-slate-300"
                      dir="ltr"
                    >
                      {assistant.username}
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={assistant.isActive ? "success" : "default"}>
                        {assistant.isActive ? "نشط" : "معطّل"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          loading={togglingId === assistant.id}
                          onClick={() => handleToggle(assistant)}
                        >
                          {assistant.isActive ? "تعطيل" : "تفعيل"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          onClick={() => setToDelete(assistant)}
                          title="حذف"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-800 md:hidden">
            {assistants.map((assistant) => (
              <div key={assistant.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-100">{assistant.name}</p>
                    <p className="text-xs font-mono text-slate-400" dir="ltr">
                      {assistant.username}
                    </p>
                  </div>
                  <Badge tone={assistant.isActive ? "success" : "default"}>
                    {assistant.isActive ? "نشط" : "معطّل"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    loading={togglingId === assistant.id}
                    onClick={() => handleToggle(assistant)}
                  >
                    {assistant.isActive ? "تعطيل" : "تفعيل"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    onClick={() => setToDelete(assistant)}
                  >
                    <Trash2 size={14} />
                    حذف
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title="إضافة مساعد جديد"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <FormError message={generalError} />

          <Input
            label="الاسم"
            name="name"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            error={formErrors.name}
            required
            placeholder="اسم المساعد الثلاثي"
          />
          <Input
            label="اسم المستخدم"
            name="username"
            value={formData.username}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, username: e.target.value }))
            }
            error={formErrors.username}
            required
            placeholder="username"
          />
          <Input
            label="كلمة المرور"
            name="password"
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, password: e.target.value }))
            }
            error={formErrors.password}
            required
            placeholder="••••••••"
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
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

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onClose={() => !isDeleting && setToDelete(null)}
        onConfirm={handleDelete}
        loading={isDeleting}
        title="حذف المساعد"
        message={`هل أنت متأكد من حذف «${toDelete?.name}»؟`}
        confirmText="حذف"
        cancelText="تراجع"
        variant="danger"
      />
    </div>
  );
}
