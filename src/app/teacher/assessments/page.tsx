"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  FileText,
  Trash2,
  ArrowRight,
  ListChecks,
  BarChart3,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import DateField from "@/components/ui/DateField";
import TimeField from "@/components/ui/TimeField";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FormError from "@/components/ui/FormError";
import Badge from "@/components/ui/Badge";
import PaginationControls from "@/components/ui/PaginationControls";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "@/components/ui/StateBlock";
import { useToast } from "@/hooks/useToast";
import {
  listAssessments,
  getAssessment,
  createAssessment,
  deleteAssessment,
  upsertScores,
  AssessmentItem,
  AssessmentPayload,
} from "@/api/assessments";
import { fetchAllGroups, getGroup } from "@/api/groups";
import { getErrorMessage, mapApiError } from "@/api/errors";
import { ASSESSMENT_TYPES, DELIVERY_MODES, PAGE_SIZES } from "@/constants/app";
import { formatDate, todayISO } from "@/utils/format";
import {
  validateAssessmentForm,
  validateScore,
} from "@/utils/validations/formValidation";
import OnlineQuestionBuilder from "@/components/assessments/OnlineQuestionBuilder";
import OnlineResultsView from "@/components/assessments/OnlineResultsView";

const typeLabel = (value: string) =>
  ASSESSMENT_TYPES.find((t) => t.value === value)?.label || value || "—";

const modeLabel = (value: string) =>
  DELIVERY_MODES.find((t) => t.value === value)?.label || value || "يدوي";

const isOnline = (item?: AssessmentItem | null) =>
  (item?.deliveryMode || "MANUAL").toUpperCase() === "ONLINE";

function toIsoDateTime(dateISO?: string, timeHHMM?: string) {
  if (!dateISO) return undefined;
  const time = timeHHMM || "00:00";
  const d = new Date(`${dateISO}T${time}:00`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

const emptyCreate = {
  groupId: "",
  title: "",
  type: "QUIZ",
  deliveryMode: "MANUAL",
  maxScore: "100",
  date: todayISO(),
  notes: "",
  instructions: "",
  availableFromDate: todayISO(),
  availableFromTime: "08:00",
  availableToDate: todayISO(),
  availableToTime: "10:00",
};

interface GroupItem {
  id: string | number;
  name: string;
  stage: string;
  grade: string;
}

function AssessmentsContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkHandled = useRef(false);

  const [view, setView] = useState<"list" | "scores" | "questions" | "results">(
    "list",
  );
  const [items, setItems] = useState<AssessmentItem[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [filterGroupId, setFilterGroupId] = useState("");
  const [filterDeliveryMode, setFilterDeliveryMode] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isSlow, setIsSlow] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [createGeneral, setCreateGeneral] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [toDelete, setToDelete] = useState<AssessmentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [active, setActive] = useState<AssessmentItem | null>(null);
  const [roster, setRoster] = useState<
    Array<{ id: string | number; name: string }>
  >([]);
  const [scores, setScores] = useState<
    Record<string, { score: string; note: string }>
  >({});
  const [scoreErrors, setScoreErrors] = useState<Record<string, string>>({});
  const [isScoreLoading, setIsScoreLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const groupOptions = useMemo(
    () =>
      groups.map((g) => ({
        value: String(g.id),
        label: `${g.name} — ${g.stage}/${g.grade}`,
      })),
    [groups],
  );

  useEffect(() => {
    let cancelled = false;
    const loadG = async () => {
      try {
        const all = await fetchAllGroups({ isActive: true });
        if (!cancelled) setGroups(all as unknown as GroupItem[]);
      } catch {
        if (!cancelled) setGroups([]);
      }
    };
    loadG();
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
        const res = await listAssessments({
          page,
          limit,
          groupId: filterGroupId || undefined,
          type: type || undefined,
          deliveryMode: filterDeliveryMode || undefined,
          from: from || undefined,
          to: to || undefined,
        });
        if (cancelled) return;
        setItems(Array.isArray(res.data) ? res.data : []);
        setMeta({
          page: res.meta?.page || page,
          limit: res.meta?.limit || limit,
          total: res.meta?.total || 0,
          totalPages: res.meta?.totalPages || 1,
        });
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
  }, [
    page,
    limit,
    filterGroupId,
    filterDeliveryMode,
    type,
    from,
    to,
    reloadKey,
    view,
  ]);

  const openCreate = () => {
    setCreateForm({
      ...emptyCreate,
      groupId: filterGroupId || "",
    });
    setCreateErrors({});
    setCreateGeneral(null);
    setIsCreateOpen(true);
  };

  const handleFieldChange = (e: {
    target: { name?: string; value: string };
  }) => {
    const name = e.target.name;
    const value = e.target.value;
    if (name) {
      setCreateForm((prev) => ({ ...prev, [name]: value }));
      setCreateErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateAssessmentForm(createForm);
    setCreateErrors(result.errors);
    setCreateGeneral(result.message || null);
    if (!result.isValid) return;

    setIsCreating(true);
    try {
      const mode = createForm.deliveryMode || "MANUAL";
      const body: AssessmentPayload = {
        groupId: Number(createForm.groupId),
        title: createForm.title.trim(),
        type: createForm.type,
        deliveryMode: mode,
        date: createForm.date,
      };

      if (mode === "ONLINE") {
        if (createForm.instructions.trim()) {
          body.instructions = createForm.instructions.trim();
        }
        const availableFrom = toIsoDateTime(
          createForm.availableFromDate,
          createForm.availableFromTime,
        );
        const availableTo = toIsoDateTime(
          createForm.availableToDate,
          createForm.availableToTime,
        );
        if (availableFrom) body.availableFrom = availableFrom;
        if (availableTo) body.availableTo = availableTo;
      } else {
        body.maxScore = Number(createForm.maxScore);
        if (createForm.notes.trim()) body.notes = createForm.notes.trim();
      }

      const res = await createAssessment(body);
      const created = res.data;
      toast.success("تم إنشاء التقييم");
      setIsCreateOpen(false);

      if (mode === "ONLINE" && created?.id) {
        setActive(created);
        setView("questions");
      } else {
        setReloadKey((k) => k + 1);
      }
    } catch (err: unknown) {
      const mapped = mapApiError(err);
      setCreateErrors(mapped.fieldErrors);
      setCreateGeneral(mapped.generalMessage || getErrorMessage(err));
    } finally {
      setIsCreating(false);
    }
  };

  const openScores = useCallback(
    async (assessment: AssessmentItem) => {
      if (isOnline(assessment)) {
        toast.error("الاختبارات الإلكترونية لا تدعم رصد الدرجات اليدوي");
        return;
      }
      setView("scores");
      setActive(assessment);
      setIsScoreLoading(true);
      setScoreErrors({});
      try {
        const targetGroupId = assessment.groupId || assessment.group?.id || "";

        const [detailRes, groupRes] = await Promise.all([
          getAssessment(assessment.id),
          targetGroupId ? getGroup(targetGroupId).catch(() => null) : null,
        ]);

        const detail = detailRes.data || assessment;
        setActive(detail);

        const existing: Record<string, { score: string; note: string }> = {};
        (detail.scores || []).forEach((s) => {
          existing[s.studentId] = {
            score: s.score != null ? String(s.score) : "",
            note: s.note || "",
          };
        });

        // 🔥 فحص آمن يمنع خطأ ts(2638) تماماً
        const groupData =
          groupRes && typeof groupRes === "object" && "data" in groupRes
            ? (
                groupRes as {
                  data?: { members?: unknown[]; students?: unknown[] };
                }
              ).data
            : null;

        const members = groupData?.members || groupData?.students || [];

        const nextScores: Record<string, { score: string; note: string }> = {};
        const rosterList = (Array.isArray(members) ? members : []).map(
          (mItem) => {
            const m = mItem as Record<string, unknown>;
            const id = (m.id ?? m.studentId) as string | number;
            const name = String(m.name || m.studentName || `طالب #${id}`);
            nextScores[id] = existing[id] || { score: "", note: "" };
            return { id, name };
          },
        );

        setRoster(rosterList);
        setScores(nextScores);
      } catch (err: unknown) {
        toast.error(getErrorMessage(err));
        setView("list");
      } finally {
        setIsScoreLoading(false);
      }
    },
    [toast],
  );

  const openQuestions = async (assessment: AssessmentItem) => {
    try {
      const res = await getAssessment(assessment.id);
      setActive(res.data || assessment);
    } catch {
      setActive(assessment);
    }
    setView("questions");
  };

  const openResults = useCallback(async (assessment: AssessmentItem) => {
    try {
      const res = await getAssessment(assessment.id);
      setActive(res.data || assessment);
    } catch {
      setActive(assessment);
    }
    setView("results");
  }, []);

  useEffect(() => {
    const assessmentId = searchParams.get("assessmentId");
    if (!assessmentId || deepLinkHandled.current) return;
    deepLinkHandled.current = true;

    let cancelled = false;
    const processDeepLink = async () => {
      try {
        const res = await getAssessment(assessmentId);
        if (cancelled) return;
        const assessment =
          res.data || ({ id: Number(assessmentId) } as AssessmentItem);
        if (isOnline(assessment)) {
          await openResults(assessment);
        } else {
          await openScores(assessment);
        }
        router.replace("/teacher/assessments");
      } catch (err: unknown) {
        if (!cancelled) toast.error(getErrorMessage(err));
      }
    };
    processDeepLink();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router, openScores, openResults, toast]);

  const saveScores = async () => {
    if (!active) return;
    const max = Number(active.maxScore);
    const nextErrors: Record<string, string> = {};
    const payload: Array<{ studentId: number; score: number; note?: string }> =
      [];

    Object.entries(scores).forEach(([studentId, row]) => {
      if (row.score === "" || row.score == null) return;
      const checkValid = validateScore(row.score, max);
      if (!checkValid) {
        nextErrors[studentId] = "درجة غير صحيحة";
        return;
      }
      payload.push({
        studentId: Number(studentId),
        score: Number(row.score),
        ...(row.note ? { note: row.note } : {}),
      });
    });

    setScoreErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      toast.error("تحقق من الدرجات المدخلة");
      return;
    }
    if (!payload.length) {
      toast.error("أدخل درجة واحدة على الأقل");
      return;
    }

    setIsSaving(true);
    try {
      await upsertScores(active.id, payload);
      toast.success("تم حفظ الدرجات");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    try {
      await deleteAssessment(toDelete.id);
      toast.success("تم حذف التقييم");
      setToDelete(null);
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const groupLabel = (item?: AssessmentItem | null) =>
    item?.group?.name ||
    groups.find((g) => g.id === item?.groupId)?.name ||
    "—";

  const backToList = () => {
    setView("list");
    setActive(null);
    setReloadKey((k) => k + 1);
  };

  if (view === "questions" && active) {
    return (
      <OnlineQuestionBuilder
        assessment={active}
        onBack={backToList}
        onPublished={backToList}
      />
    );
  }

  if (view === "results" && active) {
    return <OnlineResultsView assessment={active} onBack={backToList} />;
  }

  if (view === "scores") {
    return (
      <div className="space-y-6 animate-fade dir-rtl" dir="rtl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={backToList}>
              <ArrowRight size={16} />
              العودة
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-100">رصد الدرجات</h1>
              <p className="text-sm text-slate-400">
                {active?.title} — الدرجة العظمى {active?.maxScore} ·{" "}
                {groupLabel(active)}
              </p>
            </div>
          </div>
          <Button onClick={saveScores} loading={isSaving}>
            حفظ الدرجات
          </Button>
        </div>

        {isScoreLoading ? (
          <LoadingBlock />
        ) : roster.length === 0 ? (
          <EmptyBlock
            icon={FileText}
            title="لا يوجد أعضاء في المجموعة"
            description="سجّل طلابًا في المجموعة أولاً."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
            <ul className="divide-y divide-slate-800">
              {roster.map((student) => {
                const row = scores[student.id] || { score: "", note: "" };
                return (
                  <li
                    key={student.id}
                    className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_120px_1fr] sm:items-start sm:px-5"
                  >
                    <p className="pt-2 font-bold text-slate-200">
                      {student.name}
                    </p>
                    <Input
                      name={`score-${student.id}`}
                      type="number"
                      min="0"
                      max={active?.maxScore}
                      step="0.5"
                      value={row.score}
                      error={scoreErrors[student.id]}
                      placeholder="الدرجة"
                      onChange={(e) => {
                        setScores((prev) => ({
                          ...prev,
                          [student.id]: {
                            ...prev[student.id],
                            score: e.target.value,
                          },
                        }));
                        setScoreErrors((prev) => ({
                          ...prev,
                          [student.id]: "",
                        }));
                      }}
                    />
                    <Input
                      name={`note-${student.id}`}
                      value={row.note}
                      placeholder="ملاحظة (اختياري)"
                      onChange={(e) =>
                        setScores((prev) => ({
                          ...prev,
                          [student.id]: {
                            ...prev[student.id],
                            note: e.target.value,
                          },
                        }))
                      }
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade dir-rtl" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">
            التقييمات
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            رصد يدوي أو اختبارات إلكترونية للمجموعات.
          </p>
        </div>
        <Button onClick={openCreate} disabled={!groups.length}>
          <Plus size={18} />
          تقييم جديد
        </Button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl sm:grid-cols-2 lg:grid-cols-5">
        <Select
          label="المجموعة"
          name="filterGroupId"
          value={filterGroupId}
          options={groupOptions}
          onChange={(e) => {
            setPage(1);
            setFilterGroupId(e.target.value);
          }}
          placeholder="كل المجموعات"
        />
        <Select
          label="طريقة التسليم"
          name="deliveryMode"
          value={filterDeliveryMode}
          options={DELIVERY_MODES}
          onChange={(e) => {
            setPage(1);
            setFilterDeliveryMode(e.target.value);
          }}
          placeholder="الكل"
        />
        <Select
          label="النوع"
          name="type"
          value={type}
          options={ASSESSMENT_TYPES}
          onChange={(e) => {
            setPage(1);
            setType(e.target.value);
          }}
        />
        <DateField
          label="من تاريخ"
          name="from"
          value={from}
          onChange={(e) => {
            setPage(1);
            setFrom(e.target.value);
          }}
        />
        <DateField
          label="إلى تاريخ"
          name="to"
          value={to}
          onChange={(e) => {
            setPage(1);
            setTo(e.target.value);
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
      ) : items.length === 0 ? (
        <EmptyBlock
          icon={FileText}
          title="لا توجد تقييمات"
          description="أنشئ تقييمًا يدويًا أو اختبارًا إلكترونيًا."
          action={
            groups.length ? (
              <Button onClick={openCreate}>
                <Plus size={16} />
                تقييم جديد
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
            <ul className="divide-y divide-slate-800">
              {items.map((item) => {
                const online = isOnline(item);
                return (
                  <li
                    key={item.id}
                    className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-100">{item.title}</p>
                        <Badge tone={online ? "info" : "primary"}>
                          {modeLabel(item.deliveryMode || "MANUAL")}
                        </Badge>
                        {online && item.isPublished ? (
                          <Badge tone="success">منشور</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-400">
                        {typeLabel(item.type)} · {formatDate(item.date)}
                        {item.maxScore != null
                          ? ` · العظمى ${item.maxScore}`
                          : ""}
                        {" · "}
                        {groupLabel(item)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {online ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openQuestions(item)}
                          >
                            <ListChecks size={14} />
                            الأسئلة
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openResults(item)}
                          >
                            <BarChart3 size={14} />
                            النتائج
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openScores(item)}
                        >
                          رصد الدرجات
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        onClick={() => setToDelete(item)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <PaginationControls
            currentPage={meta.page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
            pageSize={limit}
            pageSizes={PAGE_SIZES}
            onPageSizeChange={(n) => {
              setLimit(n);
              setPage(1);
            }}
            totalItems={meta.total}
          />
        </>
      )}

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="تقييم جديد"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <FormError message={createGeneral} />
          <Select
            label="طريقة التسليم"
            name="deliveryMode"
            value={createForm.deliveryMode}
            required
            options={DELIVERY_MODES}
            onChange={handleFieldChange}
          />
          <Select
            label="المجموعة"
            name="groupId"
            value={createForm.groupId}
            required
            options={groupOptions}
            error={createErrors.groupId}
            onChange={handleFieldChange}
          />
          <Input
            label="العنوان"
            name="title"
            value={createForm.title}
            required
            error={createErrors.title}
            onChange={handleFieldChange}
            placeholder="مثال: اختبار شهري"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="النوع"
              name="type"
              value={createForm.type}
              required
              options={ASSESSMENT_TYPES}
              error={createErrors.type}
              onChange={handleFieldChange}
            />
            {createForm.deliveryMode !== "ONLINE" ? (
              <Input
                label="الدرجة العظمى"
                name="maxScore"
                type="number"
                min="1"
                step="1"
                value={createForm.maxScore}
                required
                error={createErrors.maxScore}
                onChange={handleFieldChange}
              />
            ) : (
              <DateField
                label="التاريخ"
                name="date"
                value={createForm.date}
                required
                error={createErrors.date}
                onChange={handleFieldChange}
              />
            )}
          </div>
          {createForm.deliveryMode !== "ONLINE" ? (
            <>
              <DateField
                label="التاريخ"
                name="date"
                value={createForm.date}
                required
                error={createErrors.date}
                onChange={handleFieldChange}
              />
              <Textarea
                label="ملاحظات"
                name="notes"
                value={createForm.notes}
                rows={2}
                onChange={handleFieldChange}
              />
            </>
          ) : (
            <>
              <Textarea
                label="التعليمات"
                name="instructions"
                value={createForm.instructions}
                rows={2}
                onChange={handleFieldChange}
                placeholder="أجب عن جميع الأسئلة"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <DateField
                  label="يفتح في (تاريخ)"
                  name="availableFromDate"
                  value={createForm.availableFromDate}
                  onChange={handleFieldChange}
                />
                <TimeField
                  label="يفتح في (وقت)"
                  name="availableFromTime"
                  value={createForm.availableFromTime}
                  onChange={handleFieldChange}
                />
                <DateField
                  label="يغلق في (تاريخ)"
                  name="availableToDate"
                  value={createForm.availableToDate}
                  error={createErrors.availableTo}
                  onChange={handleFieldChange}
                />
                <TimeField
                  label="يغلق في (وقت)"
                  name="availableToTime"
                  value={createForm.availableToTime}
                  onChange={handleFieldChange}
                />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" loading={isCreating}>
              {createForm.deliveryMode === "ONLINE"
                ? "إنشاء والمتابعة للأسئلة"
                : "إنشاء"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={isDeleting}
        title="حذف التقييم"
        message={`هل أنت متأكد من حذف «${toDelete?.title}»؟`}
        confirmText="حذف"
        cancelText="تراجع"
        variant="danger"
      />
    </div>
  );
}

export default function AssessmentsPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <AssessmentsContent />
    </Suspense>
  );
}
