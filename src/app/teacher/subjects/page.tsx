"use client";

import React, { useEffect, useState } from "react";
import { Plus, BookOpen, Trash2, Pencil, GitBranch, Power } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Badge from "@/components/ui/Badge";
import FormError from "@/components/ui/FormError";
import Checkbox from "@/components/ui/Checkbox";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "@/components/ui/StateBlock";
import { useToast } from "@/hooks/useToast";
import {
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  createBranch,
  updateBranch,
  deleteBranch,
  SubjectItem,
  BranchItem,
} from "@/api/subjects";
import { getErrorMessage, mapApiError } from "@/api/errors";
import {
  validateSubjectForm,
  validateBranchForm,
} from "@/utils/validations/formValidation";

interface BranchModalState {
  subject: SubjectItem;
  branch: BranchItem | null;
}

type DeleteTarget =
  | { type: "subject"; subject: SubjectItem }
  | { type: "branch"; subject: SubjectItem; branch: BranchItem };

export default function SubjectsPage() {
  const { toast } = useToast();

  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [filterActive, setFilterActive] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSlow, setIsSlow] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [subjectModal, setSubjectModal] = useState<
    "create" | SubjectItem | null
  >(null);
  const [subjectForm, setSubjectForm] = useState({ name: "", isActive: true });
  const [subjectErrors, setSubjectErrors] = useState<Record<string, string>>(
    {},
  );
  const [subjectGeneral, setSubjectGeneral] = useState<string | null>(null);
  const [isSubjectSaving, setIsSubjectSaving] = useState(false);

  const [branchModal, setBranchModal] = useState<BranchModalState | null>(null);
  const [branchForm, setBranchForm] = useState({ name: "" });
  const [branchErrors, setBranchErrors] = useState<Record<string, string>>({});
  const [branchGeneral, setBranchGeneral] = useState<string | null>(null);
  const [isBranchSaving, setIsBranchSaving] = useState(false);

  const [toDelete, setToDelete] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const slowTimer = window.setTimeout(() => {
      if (!cancelled) setIsSlow(true);
    }, 8000);

    const loadSubjects = async () => {
      setIsLoading(true);
      setIsSlow(false);
      setError(null);
      try {
        const params: Record<string, unknown> = {};
        if (filterActive === "true") params.isActive = true;
        if (filterActive === "false") params.isActive = false;

        const res = await listSubjects(params);
        if (cancelled) return;
        setSubjects(Array.isArray(res.data) ? res.data : []);
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

    loadSubjects();

    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
    };
  }, [filterActive, reloadKey]);

  const openCreateSubject = () => {
    setSubjectForm({ name: "", isActive: true });
    setSubjectErrors({});
    setSubjectGeneral(null);
    setSubjectModal("create");
  };

  const openEditSubject = (subject: SubjectItem) => {
    setSubjectForm({
      name: subject.name || "",
      isActive: subject.isActive !== false,
    });
    setSubjectErrors({});
    setSubjectGeneral(null);
    setSubjectModal(subject);
  };

  const saveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateSubjectForm(subjectForm);
    setSubjectErrors(validation.errors || {});
    setSubjectGeneral(validation.message || null);
    if (!validation.isValid) return;

    setIsSubjectSaving(true);
    try {
      const body = {
        name: subjectForm.name.trim(),
        isActive: subjectForm.isActive,
      };
      if (subjectModal === "create") {
        await createSubject(body);
        toast.success("تم إضافة المادة");
      } else if (subjectModal) {
        await updateSubject(subjectModal.id, body);
        toast.success("تم تحديث المادة");
      }
      setSubjectModal(null);
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      const mapped = mapApiError(err);
      setSubjectErrors(mapped.fieldErrors);
      setSubjectGeneral(mapped.generalMessage || getErrorMessage(err));
    } finally {
      setIsSubjectSaving(false);
    }
  };

  const toggleActive = async (subject: SubjectItem) => {
    setTogglingId(subject.id);
    try {
      await updateSubject(subject.id, {
        isActive: !subject.isActive,
      });
      toast.success(subject.isActive ? "تم تعطيل المادة" : "تم تفعيل المادة");
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  const openBranch = (
    subject: SubjectItem,
    branch: BranchItem | null = null,
  ) => {
    setBranchForm({ name: branch?.name || "" });
    setBranchErrors({});
    setBranchGeneral(null);
    setBranchModal({ subject, branch });
  };

  const saveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateBranchForm(branchForm);
    setBranchErrors(validation.errors || {});
    setBranchGeneral(validation.message || null);
    if (!validation.isValid || !branchModal) return;

    setIsBranchSaving(true);
    try {
      const { subject, branch } = branchModal;
      const body = { name: branchForm.name.trim() };
      if (branch && branch.id != null) {
        await updateBranch(subject.id, branch.id, body);
        toast.success("تم تحديث الفرع");
      } else {
        await createBranch(subject.id, body);
        toast.success("تم إضافة الفرع");
      }
      setBranchModal(null);
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      const mapped = mapApiError(err);
      setBranchErrors(mapped.fieldErrors);
      setBranchGeneral(mapped.generalMessage || getErrorMessage(err));
    } finally {
      setIsBranchSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    try {
      if (toDelete.type === "subject") {
        await deleteSubject(toDelete.subject.id);
        toast.success("تم حذف المادة");
      } else if (toDelete.branch.id != null) {
        await deleteBranch(toDelete.subject.id, toDelete.branch.id);
        toast.success("تم حذف الفرع");
      }
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
          <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">
            المواد والفروع
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            أدر المواد الدراسية وفروعها. فقط المواد المفعّلة تُستخدم في
            المجموعات والحصص.
          </p>
        </div>
        <Button onClick={openCreateSubject}>
          <Plus size={18} />
          إضافة مادة
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { value: "", label: "الكل" },
          { value: "true", label: "مفعّلة" },
          { value: "false", label: "معطّلة" },
        ].map((opt) => (
          <button
            key={opt.value || "all"}
            type="button"
            onClick={() => setFilterActive(opt.value)}
            className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition-all ${
              filterActive === opt.value
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingBlock isSlow={isSlow} />
      ) : error ? (
        <ErrorBlock
          message={getErrorMessage(error)}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      ) : subjects.length === 0 ? (
        <EmptyBlock
          icon={BookOpen}
          title="لا توجد مواد"
          description="أضف أول مادة دراسية للبدء في إنشاء المجموعات."
          action={
            <Button onClick={openCreateSubject}>
              <Plus size={16} />
              إضافة مادة
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {subjects.map((subject) => (
            <div
              key={String(subject.id)}
              className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl"
            >
              <div className="flex flex-col gap-3 border-b border-slate-800 bg-slate-950/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                    <BookOpen size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-bold text-slate-100">
                        {subject.name}
                      </h2>
                      <Badge tone={subject.isActive ? "success" : "default"}>
                        {subject.isActive ? "مفعّلة" : "معطّلة"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {(subject.branches || []).length} فرع
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openBranch(subject)}
                    disabled={!subject.isActive}
                    title={
                      !subject.isActive
                        ? "فعّل المادة أولاً لإضافة فروع"
                        : undefined
                    }
                  >
                    <GitBranch size={14} />
                    فرع
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditSubject(subject)}
                  >
                    <Pencil size={14} />
                    تعديل
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={togglingId === subject.id}
                    onClick={() => toggleActive(subject)}
                  >
                    <Power size={14} />
                    {subject.isActive ? "تعطيل" : "تفعيل"}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setToDelete({ type: "subject", subject })}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              <div className="px-4 py-3 sm:px-5">
                {(subject.branches || []).length === 0 ? (
                  <p className="py-2 text-sm text-slate-500">
                    لا توجد فروع لهذه المادة بعد.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-800">
                    {(subject.branches || []).map((branch) => (
                      <li
                        key={String(branch.id || branch.name)}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <span className="text-sm font-medium text-slate-200">
                          {branch.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openBranch(subject, branch)}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-400 hover:bg-rose-500/10"
                            onClick={() =>
                              setToDelete({
                                type: "branch",
                                subject,
                                branch,
                              })
                            }
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={Boolean(subjectModal)}
        onClose={() => setSubjectModal(null)}
        title={subjectModal === "create" ? "إضافة مادة" : "تعديل المادة"}
      >
        <form onSubmit={saveSubject} className="space-y-4">
          <FormError message={subjectGeneral} />
          <Input
            label="اسم المادة"
            name="name"
            value={subjectForm.name}
            required
            error={subjectErrors.name}
            onChange={(e) =>
              setSubjectForm((f) => ({ ...f, name: e.target.value }))
            }
            placeholder="مثال: اللغة العربية"
          />
          <Checkbox
            label="المادة مفعّلة"
            description="يمكن إنشاء مجموعات وحصص للمادة المفعّلة فقط"
            checked={subjectForm.isActive}
            onChange={(e) =>
              setSubjectForm((f) => ({
                ...f,
                isActive: e.target.checked,
              }))
            }
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSubjectModal(null)}
            >
              إلغاء
            </Button>
            <Button type="submit" loading={isSubjectSaving}>
              حفظ
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(branchModal)}
        onClose={() => setBranchModal(null)}
        title={
          branchModal?.branch
            ? "تعديل الفرع"
            : `إضافة فرع — ${branchModal?.subject?.name || ""}`
        }
      >
        <form onSubmit={saveBranch} className="space-y-4">
          <FormError message={branchGeneral} />
          <Input
            label="اسم الفرع"
            name="name"
            value={branchForm.name}
            required
            error={branchErrors.name}
            onChange={(e) => setBranchForm({ name: e.target.value })}
            placeholder="مثال: النحو"
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBranchModal(null)}
            >
              إلغاء
            </Button>
            <Button type="submit" loading={isBranchSaving}>
              حفظ
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={isDeleting}
        title={toDelete?.type === "branch" ? "حذف الفرع" : "حذف المادة"}
        message={
          toDelete?.type === "branch"
            ? `هل أنت متأكد من حذف الفرع «${toDelete?.branch?.name}»؟`
            : `هل أنت متأكد من حذف المادة «${toDelete?.subject?.name}»؟ إذا كانت مرتبطة بمجموعات قد يُرفض الحذف — عطّلها بدلًا من ذلك.`
        }
        confirmText="حذف"
        cancelText="تراجع"
        variant="danger"
      />
    </div>
  );
}
