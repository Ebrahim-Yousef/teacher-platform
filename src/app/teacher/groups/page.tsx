"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  UsersRound,
  Trash2,
  Pencil,
  UserPlus,
  UserMinus,
  ArrowRight,
  CalendarClock,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Badge from "@/components/ui/Badge";
import FormError from "@/components/ui/FormError";
import Checkbox from "@/components/ui/Checkbox";
import PaginationControls from "@/components/ui/PaginationControls";
import GroupSchedulePanel from "@/components/groups/GroupSchedulePanel";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "@/components/ui/StateBlock";
import { useToast } from "@/hooks/useToast";
import {
  listGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  addGroupMember,
  updateGroupMember,
  removeGroupMember,
  getGroupSchedule,
  saveGroupSchedule,
  generateGroupSessions,
  GroupItem,
  GroupMemberItem,
  GroupScheduleSlot,
} from "@/api/groups";
import { fetchActiveSubjects, listSubjects } from "@/api/subjects";
import { listStudents } from "@/api/students";
import { getErrorMessage, mapApiError } from "@/api/errors";
import { STAGES, STAGES_GRADES } from "@/constants/stages";
import { PAGE_SIZES } from "@/constants/app";
import { formatMoney } from "@/utils/format";
import {
  validateGroupForm,
  validateMonthlyFeeOverride,
} from "@/utils/validations/formValidation";

const emptyForm = {
  name: "",
  stage: "",
  grade: "",
  subjectId: "",
  defaultMonthlyFee: "",
  isActive: true,
};

interface FeeEditState {
  studentId: string | number;
  name: string;
  value: string;
}

export default function GroupsPage() {
  const { toast } = useToast();

  const [view, setView] = useState<"list" | "members" | "schedule">("list");
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState({
    stage: "",
    grade: "",
    subjectId: "",
    isActive: "",
  });
  const [activeSubjects, setActiveSubjects] = useState<
    Array<{ id: number | string; name: string }>
  >([]);
  const [subjectsReady, setSubjectsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSlow, setIsSlow] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [modalMode, setModalMode] = useState<"create" | GroupItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toDelete, setToDelete] = useState<GroupItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activeGroup, setActiveGroup] = useState<GroupItem | null>(null);
  const [members, setMembers] = useState<GroupMemberItem[]>([]);
  const [eligibleStudents, setEligibleStudents] = useState<
    Array<{ id: number | string; name: string }>
  >([]);
  const [enrollStudentId, setEnrollStudentId] = useState("");
  const [enrollFeeOverride, setEnrollFeeOverride] = useState("");
  const [enrollFeeError, setEnrollFeeError] = useState<string | null>(null);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [removingId, setRemovingId] = useState<number | string | null>(null);
  const [feeEdit, setFeeEdit] = useState<FeeEditState | null>(null);
  const [isFeeSaving, setIsFeeSaving] = useState(false);
  const [feeEditError, setFeeEditError] = useState<string | null>(null);

  const [scheduleSlots, setScheduleSlots] = useState<GroupScheduleSlot[]>([]);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);
  const [isScheduleSaving, setIsScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [branchOptions, setBranchOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);

  const subjectOptions = useMemo(
    () => activeSubjects.map((s) => ({ value: String(s.id), label: s.name })),
    [activeSubjects],
  );

  type SelectOption = { value: string; label: string };

  const gradeOptions: SelectOption[] = form.stage
    ? (STAGES_GRADES as unknown as Record<string, SelectOption[]>)[
        form.stage
      ] || []
    : [];

  const filterGradeOptions: SelectOption[] = filters.stage
    ? (STAGES_GRADES as unknown as Record<string, SelectOption[]>)[
        filters.stage
      ] || []
    : [];

  const memberIds = useMemo(
    () => new Set(members.map((m) => String(m.id ?? m.studentId))),
    [members],
  );

  const enrollOptions = useMemo(
    () =>
      eligibleStudents
        .filter((s) => !memberIds.has(String(s.id)))
        .map((s) => ({ value: String(s.id), label: s.name })),
    [eligibleStudents, memberIds],
  );

  useEffect(() => {
    let cancelled = false;
    const loadSubjects = async () => {
      try {
        const subjects = await fetchActiveSubjects();
        if (!cancelled) setActiveSubjects(subjects as typeof activeSubjects);
      } catch {
        if (!cancelled) setActiveSubjects([]);
      } finally {
        if (!cancelled) setSubjectsReady(true);
      }
    };
    loadSubjects();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (view !== "list") return;

    let cancelled = false;
    const slowTimer = window.setTimeout(() => {
      if (!cancelled) setIsSlow(true);
    }, 8000);

    const loadData = async () => {
      setIsLoading(true);
      setIsSlow(false);
      setError(null);
      try {
        const params: Record<string, unknown> = {
          page,
          limit,
          stage: filters.stage || undefined,
          grade: filters.grade || undefined,
          subjectId: filters.subjectId || undefined,
        };
        if (filters.isActive === "true") params.isActive = true;
        if (filters.isActive === "false") params.isActive = false;

        const res = await listGroups(params);
        if (cancelled) return;
        setGroups(Array.isArray(res.data) ? res.data : []);
        setMeta({
          page: res.meta?.page || page,
          limit: limit,
          total: (res.meta as unknown as { total: number })?.total || 0,
          totalPages: res.meta?.totalPages || 1,
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

    loadData();

    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
    };
  }, [page, limit, filters, reloadKey, view]);

  const openCreate = () => {
    setForm(emptyForm);
    setFormErrors({});
    setGeneralError(null);
    setModalMode("create");
  };

  const openEdit = (group: GroupItem) => {
    setForm({
      name: group.name || "",
      stage: group.stage || "",
      grade: group.grade || "",
      subjectId: group.subjectId ? String(group.subjectId) : "",
      defaultMonthlyFee:
        group.defaultMonthlyFee != null ? String(group.defaultMonthlyFee) : "",
      isActive: group.isActive !== false,
    });
    setFormErrors({});
    setGeneralError(null);
    setModalMode(group);
  };

  const handleFormChange = (e: {
    target: { name?: string; value: string };
  }) => {
    const name = e.target.name || "";
    const value = e.target.value;
    if (!name) return;

    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "stage") next.grade = "";
      return next;
    });
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const saveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateGroupForm(form);
    setFormErrors(validation.errors || {});
    setGeneralError(validation.message || null);
    if (!validation.isValid) return;

    setIsSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        stage: form.stage,
        grade: form.grade,
        subjectId: Number(form.subjectId),
        isActive: form.isActive,
      };
      if (form.defaultMonthlyFee !== "") {
        body.defaultMonthlyFee = Number(form.defaultMonthlyFee);
      }

      if (modalMode === "create") {
        await createGroup(body);
        toast.success("تم إنشاء المجموعة");
      } else if (modalMode) {
        await updateGroup(modalMode.id, body);
        toast.success("تم تحديث المجموعة");
      }
      setModalMode(null);
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      const mapped = mapApiError(err);
      setFormErrors(mapped.fieldErrors);
      setGeneralError(mapped.generalMessage || getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    try {
      await deleteGroup(toDelete.id);
      toast.success("تم حذف المجموعة");
      setToDelete(null);
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const openMembers = async (group: GroupItem) => {
    setView("members");
    setActiveGroup(group);
    setIsMembersLoading(true);
    setEnrollStudentId("");
    setEnrollFeeOverride("");
    setEnrollFeeError(null);
    try {
      const [detailRes, studentsRes] = await Promise.all([
        getGroup(group.id),
        listStudents({
          stage: group.stage,
          grade: group.grade,
          limit: 50,
          page: 1,
        }),
      ]);
      const detail = detailRes.data;
      setActiveGroup(detail || group);
      const roster = detail?.members || detail?.students || [];
      setMembers(Array.isArray(roster) ? roster : []);

      const allEligible = Array.isArray(studentsRes.data)
        ? [...studentsRes.data]
        : [];
      const totalPages = studentsRes.meta?.totalPages || 1;
      for (let p = 2; p <= totalPages; p += 1) {
        const more = await listStudents({
          stage: group.stage,
          grade: group.grade,
          limit: 50,
          page: p,
        });
        if (Array.isArray(more.data)) allEligible.push(...more.data);
      }
      setEligibleStudents(allEligible as typeof eligibleStudents);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
      setView("list");
    } finally {
      setIsMembersLoading(false);
    }
  };

  const openSchedule = async (group: GroupItem) => {
    setView("schedule");
    setActiveGroup(group);
    setIsScheduleLoading(true);
    setScheduleError(null);
    setBranchOptions([]);
    try {
      const [detailRes, scheduleRes] = await Promise.all([
        getGroup(group.id),
        getGroupSchedule(group.id).catch(() => null),
      ]);
      const detail = detailRes.data || group;
      setActiveGroup(detail);

      const fromDetail = detail.scheduleSlots || detail.schedule || [];
      const fromApi = Array.isArray(scheduleRes?.data)
        ? scheduleRes?.data
        : scheduleRes?.data?.slots || [];
      const raw =
        Array.isArray(fromApi) && fromApi.length ? fromApi : fromDetail;
      setScheduleSlots(
        (Array.isArray(raw) ? raw : []).map((s) => ({
          dayOfWeek: String(s.dayOfWeek ?? 0),
          startTime: s.startTime || "16:00",
          endTime: s.endTime || "18:00",
        })),
      );

      if (detail.subjectId) {
        try {
          const subjectsRes = await listSubjects({ isActive: true });
          const subject = (subjectsRes.data || []).find(
            (s: { id: number | string }) =>
              String(s.id) === String(detail.subjectId),
          );
          setBranchOptions(
            (
              (
                subject as {
                  branches?: Array<{ id: number | string; name: string }>;
                }
              )?.branches || []
            ).map((b) => ({
              value: String(b.id),
              label: b.name,
            })),
          );
        } catch {
          setBranchOptions([]);
        }
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
      setView("list");
    } finally {
      setIsScheduleLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!enrollStudentId || !activeGroup) return;
    const feeCheck = validateMonthlyFeeOverride(enrollFeeOverride);
    if (!feeCheck.isValid) {
      setEnrollFeeError(feeCheck.message || "خطأ في قيمة الرسوم");
      return;
    }
    setEnrollFeeError(null);
    setIsEnrolling(true);
    try {
      const body: { studentId: number; monthlyFeeOverride?: number } = {
        studentId: Number(enrollStudentId),
      };
      if (enrollFeeOverride !== "") {
        body.monthlyFeeOverride = Number(enrollFeeOverride);
      }
      await addGroupMember(activeGroup.id, body);
      toast.success("تم تسجيل الطالب في المجموعة");
      setEnrollStudentId("");
      setEnrollFeeOverride("");
      await openMembers(activeGroup);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleSaveMemberFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeEdit || !activeGroup) return;
    const check = validateMonthlyFeeOverride(feeEdit.value);
    if (!check.isValid) {
      setFeeEditError(check.message || "خطأ في القيمة");
      return;
    }
    setFeeEditError(null);
    setIsFeeSaving(true);
    try {
      const monthlyFeeOverride =
        feeEdit.value === "" ? null : Number(feeEdit.value);
      await updateGroupMember(activeGroup.id, feeEdit.studentId, {
        monthlyFeeOverride,
      });
      toast.success("تم تحديث السعر");
      setFeeEdit(null);
      await openMembers(activeGroup);
    } catch (err: unknown) {
      setFeeEditError(getErrorMessage(err));
    } finally {
      setIsFeeSaving(false);
    }
  };

  const handleSaveSchedule = async (normalizedSlots: GroupScheduleSlot[]) => {
    if (!activeGroup) return;
    setIsScheduleSaving(true);
    setScheduleError(null);
    try {
      await saveGroupSchedule(
        activeGroup.id,
        normalizedSlots.map((s) => ({
          dayOfWeek: Number(s.dayOfWeek),
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      );
      toast.success("تم حفظ الجدول الأسبوعي");
      setScheduleSlots(normalizedSlots);
    } catch (err: unknown) {
      setScheduleError(getErrorMessage(err));
    } finally {
      setIsScheduleSaving(false);
    }
  };

  const handleGenerateSessions = async (body: {
    from: string;
    to: string;
    title?: string;
    subjectBranchId?: number;
    notes?: string;
  }) => {
    if (!activeGroup) return;
    setIsGenerating(true);
    try {
      const res = await generateGroupSessions(activeGroup.id, body);
      const created = res.data?.created ?? res.data?.sessions?.length ?? 0;
      const skipped = res.data?.skipped ?? 0;
      toast.success(
        `تم توليد ${created} حصة${skipped ? ` (تخطي ${skipped})` : ""}`,
      );
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUnenroll = async (studentId: number | string) => {
    if (!activeGroup) return;
    setRemovingId(studentId);
    try {
      await removeGroupMember(activeGroup.id, studentId);
      toast.success("تم إزالة الطالب من المجموعة");
      setMembers((prev) =>
        prev.filter((m) => String(m.id ?? m.studentId) !== String(studentId)),
      );
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setRemovingId(null);
    }
  };

  if (view === "schedule") {
    return (
      <div className="space-y-6 animate-fade dir-rtl" dir="rtl">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setView("list");
              setReloadKey((k) => k + 1);
            }}
          >
            <ArrowRight size={16} />
            العودة
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">
              جدول المجموعة
            </h1>
            <p className="text-sm text-slate-400">
              {activeGroup?.name} — {activeGroup?.stage} / {activeGroup?.grade}
            </p>
          </div>
        </div>
        {isScheduleLoading ? (
          <LoadingBlock />
        ) : (
          <GroupSchedulePanel
            slots={
              scheduleSlots as unknown as Array<{
                dayOfWeek: number | string;
                startTime: string;
                endTime: string;
              }>
            }
            onChangeSlots={(s) =>
              setScheduleSlots(s as unknown as GroupScheduleSlot[])
            }
            onSave={(slots) =>
              handleSaveSchedule(slots as unknown as GroupScheduleSlot[])
            }
            isSaving={isScheduleSaving}
            saveError={scheduleError}
            onGenerate={handleGenerateSessions}
            isGenerating={isGenerating}
            branchOptions={branchOptions}
          />
        )}
      </div>
    );
  }

  if (view === "members") {
    return (
      <div className="space-y-6 animate-fade dir-rtl" dir="rtl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setView("list");
                setReloadKey((k) => k + 1);
              }}
            >
              <ArrowRight size={16} />
              العودة
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">
                أعضاء المجموعة
              </h1>
              <p className="text-sm text-slate-400">
                {activeGroup?.name} — {activeGroup?.stage} /{" "}
                {activeGroup?.grade}
                {activeGroup?.defaultMonthlyFee != null &&
                  ` · افتراضي ${formatMoney(activeGroup.defaultMonthlyFee)}`}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openSchedule(activeGroup || ({} as GroupItem))}
          >
            <CalendarClock size={14} />
            الجدول
          </Button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl sm:p-5 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Select
                label="إضافة طالب (نفس المرحلة والصف)"
                name="enrollStudentId"
                value={enrollStudentId}
                onChange={(e) => setEnrollStudentId(e.target.value)}
                options={enrollOptions}
                placeholder={
                  enrollOptions.length
                    ? "اختر طالبًا..."
                    : "لا يوجد طلاب متاحون"
                }
                disabled={!enrollOptions.length}
              />
            </div>
            <div className="sm:w-44">
              <Input
                label="رسوم مخصصة"
                name="enrollFeeOverride"
                type="number"
                min="0"
                step="0.01"
                value={enrollFeeOverride}
                error={enrollFeeError || undefined}
                onChange={(e) => {
                  setEnrollFeeOverride(e.target.value);
                  setEnrollFeeError(null);
                }}
                placeholder="اختياري"
              />
            </div>
            <Button
              onClick={handleEnroll}
              loading={isEnrolling}
              disabled={!enrollStudentId}
            >
              <UserPlus size={16} />
              تسجيل
            </Button>
          </div>
        </div>

        {isMembersLoading ? (
          <LoadingBlock />
        ) : members.length === 0 ? (
          <EmptyBlock
            icon={UsersRound}
            title="لا يوجد أعضاء"
            description="سجّل طلابًا من نفس المرحلة والصف في هذه المجموعة."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
            <ul className="divide-y divide-slate-800">
              {members.map((m) => {
                const id = m.id ?? m.studentId ?? "";
                const name = m.name || m.studentName || `طالب #${id}`;
                const effective =
                  m.effectiveMonthlyFee ??
                  m.monthlyFeeOverride ??
                  activeGroup?.defaultMonthlyFee;
                const custom =
                  m.hasCustomPrice === true ||
                  (m.monthlyFeeOverride != null && m.monthlyFeeOverride !== 0);
                return (
                  <li
                    key={String(id)}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-100">{name}</p>
                        {custom ? <Badge tone="primary">سعر خاص</Badge> : null}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        الرسوم الفعلية:{" "}
                        {effective != null ? formatMoney(effective) : "—"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setFeeEdit({
                            studentId: id,
                            name,
                            value:
                              m.monthlyFeeOverride != null
                                ? String(m.monthlyFeeOverride)
                                : "",
                          });
                          setFeeEditError(null);
                        }}
                      >
                        تعديل الرسوم
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-400 hover:bg-rose-500/10"
                        loading={removingId === id}
                        onClick={() => handleUnenroll(id)}
                      >
                        <UserMinus size={14} />
                        إزالة
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <Modal
          isOpen={Boolean(feeEdit)}
          onClose={() => setFeeEdit(null)}
          title={`رسوم — ${feeEdit?.name || ""}`}
        >
          <form onSubmit={handleSaveMemberFee} className="space-y-4">
            <FormError message={feeEditError} />
            <Input
              label="الرسوم الشهرية المخصصة"
              name="monthlyFeeOverride"
              type="number"
              min="0"
              step="0.01"
              value={feeEdit?.value ?? ""}
              onChange={(e) =>
                setFeeEdit((f) => (f ? { ...f, value: e.target.value } : null))
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
                onClick={() => setFeeEdit(null)}
              >
                إلغاء
              </Button>
              <Button type="submit" loading={isFeeSaving}>
                حفظ
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade dir-rtl" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">
            المجموعات
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            مجموعات بمادة مفعّلة، جدول أسبوعي، رسوم لكل عضو، وتوليد الحصص.
          </p>
        </div>
        <Button onClick={openCreate} disabled={!activeSubjects.length}>
          <Plus size={18} />
          مجموعة جديدة
        </Button>
      </div>

      {!subjectsReady ? null : !activeSubjects.length ? (
        <FormError message="لا توجد مواد مفعّلة. أضف مادة وفعّلها من صفحة المواد أولاً." />
      ) : null}

      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="المرحلة"
          name="stage"
          value={filters.stage}
          options={STAGES}
          onChange={(e) => {
            setPage(1);
            setFilters((f) => ({ ...f, stage: e.target.value, grade: "" }));
          }}
        />
        <Select
          label="الصف"
          name="grade"
          value={filters.grade}
          options={filterGradeOptions}
          disabled={!filters.stage}
          onChange={(e) => {
            setPage(1);
            setFilters((f) => ({ ...f, grade: e.target.value }));
          }}
        />
        <Select
          label="المادة"
          name="subjectId"
          value={filters.subjectId}
          options={subjectOptions}
          onChange={(e) => {
            setPage(1);
            setFilters((f) => ({ ...f, subjectId: e.target.value }));
          }}
        />
        <Select
          label="الحالة"
          name="isActive"
          value={filters.isActive}
          options={[
            { value: "true", label: "مفعّلة" },
            { value: "false", label: "معطّلة" },
          ]}
          onChange={(e) => {
            setPage(1);
            setFilters((f) => ({ ...f, isActive: e.target.value }));
          }}
        />
      </div>

      {isLoading ? (
        <LoadingBlock isSlow={isSlow} />
      ) : error ? (
        <ErrorBlock
          message={getErrorMessage(error)}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      ) : groups.length === 0 ? (
        <EmptyBlock
          icon={UsersRound}
          title="لا توجد مجموعات"
          description="أنشئ مجموعة وربطها بمادة مفعّلة للبدء."
          action={
            activeSubjects.length ? (
              <Button onClick={openCreate}>
                <Plus size={16} />
                مجموعة جديدة
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-right text-sm">
                <thead className="border-b border-slate-800 bg-slate-950/60 text-xs font-bold text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">الاسم</th>
                    <th className="px-5 py-3.5">المرحلة / الصف</th>
                    <th className="px-5 py-3.5">المادة</th>
                    <th className="px-5 py-3.5">الرسوم</th>
                    <th className="px-5 py-3.5">الحالة</th>
                    <th className="px-5 py-3.5 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {groups.map((g) => (
                    <tr
                      key={String(g.id)}
                      className="transition-colors hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-4 font-bold text-slate-100">
                        {g.name}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {g.stage} / {g.grade}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {g.subject?.name ||
                          g.subjectName ||
                          subjectOptions.find(
                            (s) => s.value === String(g.subjectId),
                          )?.label ||
                          "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {g.defaultMonthlyFee != null
                          ? formatMoney(g.defaultMonthlyFee)
                          : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          tone={g.isActive !== false ? "success" : "default"}
                        >
                          {g.isActive !== false ? "مفعّلة" : "معطّلة"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openMembers(g)}
                          >
                            الأعضاء
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openSchedule(g)}
                          >
                            <CalendarClock size={14} />
                            الجدول
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(g)}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-400 hover:bg-rose-500/10"
                            onClick={() => setToDelete(g)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-800 md:hidden">
              {groups.map((g) => (
                <div key={String(g.id)} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-100">{g.name}</p>
                      <p className="text-xs text-slate-400">
                        {g.stage} / {g.grade}
                      </p>
                    </div>
                    <Badge tone={g.isActive !== false ? "success" : "default"}>
                      {g.isActive !== false ? "مفعّلة" : "معطّلة"}
                    </Badge>
                  </div>

                  <div className="text-xs text-slate-400 space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <p>
                      المادة:{" "}
                      <span className="text-slate-200">
                        {g.subject?.name ||
                          g.subjectName ||
                          subjectOptions.find(
                            (s) => s.value === String(g.subjectId),
                          )?.label ||
                          "—"}
                      </span>
                    </p>
                    <p>
                      الرسوم الافتراضية:{" "}
                      <span className="text-slate-200">
                        {g.defaultMonthlyFee != null
                          ? formatMoney(g.defaultMonthlyFee)
                          : "—"}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openMembers(g)}
                    >
                      الأعضاء
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openSchedule(g)}
                    >
                      الجدول
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(g)}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-400 hover:bg-rose-500/10"
                      onClick={() => setToDelete(g)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <PaginationControls
            currentPage={meta.page}
            totalPages={meta.totalPages}
            totalItems={meta.total}
            pageSize={limit}
            pageSizes={PAGE_SIZES}
            onPageChange={setPage}
            onPageSizeChange={(v) => {
              setLimit(v);
              setPage(1);
            }}
          />
        </>
      )}

      <Modal
        isOpen={Boolean(modalMode)}
        onClose={() => setModalMode(null)}
        title={modalMode === "create" ? "مجموعة جديدة" : "تعديل المجموعة"}
      >
        <form onSubmit={saveGroup} className="space-y-4">
          <FormError message={generalError} />
          <Input
            label="اسم المجموعة"
            name="name"
            value={form.name}
            required
            error={formErrors.name}
            onChange={handleFormChange}
            placeholder="مثال: مجموعة الأحد مساءً"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="المرحلة"
              name="stage"
              value={form.stage}
              required
              options={STAGES}
              error={formErrors.stage}
              onChange={handleFormChange}
            />
            <Select
              label="الصف"
              name="grade"
              value={form.grade}
              required
              options={gradeOptions}
              disabled={!form.stage}
              error={formErrors.grade}
              onChange={handleFormChange}
            />
          </div>
          <Select
            label="المادة (مفعّلة فقط)"
            name="subjectId"
            value={form.subjectId}
            required
            options={subjectOptions}
            error={formErrors.subjectId}
            onChange={handleFormChange}
            placeholder={
              subjectOptions.length ? "اختر مادة..." : "لا توجد مواد مفعّلة"
            }
          />
          <Input
            label="الرسوم الشهرية الافتراضية"
            name="defaultMonthlyFee"
            type="number"
            min="0"
            step="0.01"
            value={form.defaultMonthlyFee}
            error={formErrors.defaultMonthlyFee}
            onChange={handleFormChange}
            placeholder="اختياري"
          />
          <Checkbox
            label="المجموعة مفعّلة"
            checked={form.isActive}
            onChange={(e) =>
              setForm((f) => ({ ...f, isActive: e.target.checked }))
            }
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalMode(null)}
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
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={isDeleting}
        title="حذف المجموعة"
        message={`هل أنت متأكد من حذف المجموعة «${toDelete?.name}»؟`}
        confirmText="حذف"
        cancelText="تراجع"
        variant="danger"
      />
    </div>
  );
}
