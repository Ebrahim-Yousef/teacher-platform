"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Download,
  MessageCircle,
  Trash2,
  ClipboardCheck,
  ArrowRight,
  CalendarDays,
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
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import {
  listSessions,
  getSession,
  createSession,
  deleteSession,
  upsertRecords,
  getWhatsAppLink,
  getAttendanceCalendar,
  AttendanceSession,
  AttendanceCalendarEvent,
} from "@/api/attendance";
import { fetchAllGroups, getGroup } from "@/api/groups";
import { fetchActiveSubjects } from "@/api/subjects";
import { downloadExport } from "@/api/exports";
import { getErrorMessage, mapApiError } from "@/api/errors";
import { ATTENDANCE_STATUS, PAGE_SIZES } from "@/constants/app";
import { formatDate, todayISO } from "@/utils/format";
import { formatTime12h } from "@/utils/datePicker";
import { validateSessionForm } from "@/utils/validations/formValidation";
import { asList, pickLabel } from "@/utils/apiData";

function currentMonthRange() {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth();
  const from = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const last = new Date(y, m + 1, 0).getDate();
  const to = `${y}-${String(m + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

const statusStyles: Record<string, string> = {
  PRESENT:
    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
  ABSENT:
    "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20",
  LATE: "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
};

const activeStyles: Record<string, string> = {
  PRESENT: "bg-emerald-600 text-white border-emerald-600 shadow-md",
  ABSENT: "bg-rose-600 text-white border-rose-600 shadow-md",
  LATE: "bg-amber-500 text-white border-amber-500 shadow-md",
};

const emptyCreate = {
  groupId: "",
  date: todayISO(),
  startTime: "16:00",
  endTime: "18:00",
  title: "",
  subjectBranchId: "",
  notes: "",
};

interface RosterMember {
  id: number;
  name: string;
  parentPhone?: string | null;
}

interface WhatsAppLinkItem {
  studentId?: number;
  studentName?: string;
  parentPhone?: string;
  url?: string;
}

export default function AttendancePage() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [view, setView] = useState<"list" | "mark">("list");
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [groups, setGroups] = useState<
    Array<{
      id: number | string;
      name: string;
      stage?: string;
      grade?: string;
      subjectId?: number | string;
    }>
  >([]);
  const [subjects, setSubjects] = useState<
    Array<{
      id: number | string;
      branches?: Array<{ id: number | string; name: string }>;
    }>
  >([]);
  const [filterGroupId, setFilterGroupId] = useState("");
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
  const [toDelete, setToDelete] = useState<AttendanceSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(
    null,
  );
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [records, setRecords] = useState<
    Record<string, { status: string; note: string }>
  >({});
  const [savedSnapshot, setSavedSnapshot] = useState("{}");
  const [isMarkLoading, setIsMarkLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sendingWaId, setSendingWaId] = useState<number | null>(null);
  const [waLinks, setWaLinks] = useState<WhatsAppLinkItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<
    AttendanceCalendarEvent[]
  >([]);
  const [mode, setMode] = useState<"list" | "calendar">("list");

  const calendarRange = useMemo(() => {
    const defaults = currentMonthRange();
    return { from: from || defaults.from, to: to || defaults.to };
  }, [from, to]);

  const groupOptions = useMemo(
    () =>
      groups.map((g) => ({
        value: String(g.id),
        label: `${g.name} — ${g.stage || ""}/${g.grade || ""}`,
      })),
    [groups],
  );

  const branchOptions = useMemo(() => {
    const group = groups.find((g) => String(g.id) === createForm.groupId);
    if (!group?.subjectId) return [];
    const subject =
      subjects.find((s) => s.id === group.subjectId) ||
      subjects.find((s) => String(s.id) === String(group.subjectId));
    return (subject?.branches || []).map((b) => ({
      value: String(b.id),
      label: b.name,
    }));
  }, [groups, subjects, createForm.groupId]);

  const isDirty = useMemo(
    () => JSON.stringify(records) !== savedSnapshot,
    [records, savedSnapshot],
  );

  useEffect(() => {
    let cancelled = false;
    const loadInitData = async () => {
      try {
        const [allGroups, activeSubjects] = await Promise.all([
          fetchAllGroups({ isActive: true }),
          fetchActiveSubjects(),
        ]);
        if (cancelled) return;
        setGroups(
          allGroups as Array<{
            id: number | string;
            name: string;
            stage?: string;
            grade?: string;
            subjectId?: number | string;
          }>,
        );
        setSubjects(
          activeSubjects as Array<{
            id: number | string;
            branches?: Array<{ id: number | string; name: string }>;
          }>,
        );
      } catch {
        if (!cancelled) {
          setGroups([]);
          setSubjects([]);
        }
      }
    };
    loadInitData();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (view !== "list" || mode !== "list") return;

    let cancelled = false;
    const slowTimer = window.setTimeout(() => {
      if (!cancelled) setIsSlow(true);
    }, 8000);

    const loadData = async () => {
      setIsLoading(true);
      setIsSlow(false);
      setError(null);
      try {
        const res = await listSessions({
          page,
          limit,
          groupId: filterGroupId || undefined,
          from: from || undefined,
          to: to || undefined,
        });
        if (cancelled) return;
        setSessions(Array.isArray(res.data) ? res.data : []);
        setMeta({
          page: res.meta?.page || page,
          limit: res.meta?.limit || limit,
          total: res.meta?.total || 0,
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
  }, [view, mode, page, limit, filterGroupId, from, to, reloadKey]);

  useEffect(() => {
    if (view !== "list" || mode !== "calendar") return;

    let cancelled = false;
    const slowTimer = window.setTimeout(() => {
      if (!cancelled) setIsSlow(true);
    }, 8000);

    const loadCalendar = async () => {
      setIsLoading(true);
      setIsSlow(false);
      setError(null);
      try {
        const res = await getAttendanceCalendar({
          from: calendarRange.from,
          to: calendarRange.to,
          groupId: filterGroupId || undefined,
        });
        if (cancelled) return;
        const resData = res.data;
        setCalendarEvents(
          asList(
            (resData as unknown as Record<string, unknown>)?.events ||
              (resData as unknown as Record<string, unknown>)?.items ||
              (resData as unknown as Record<string, unknown>)?.sessions ||
              resData,
          ) as AttendanceCalendarEvent[],
        );
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

    loadCalendar();

    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
    };
  }, [view, mode, calendarRange, filterGroupId, reloadKey]);

  const openCreate = () => {
    setCreateForm({ ...emptyCreate, groupId: filterGroupId || "" });
    setCreateErrors({});
    setCreateGeneral(null);
    setIsCreateOpen(true);
  };

  const handleCreateChange = (e: {
    target: { name?: string; value: string };
  }) => {
    const name = e.target.name || "";
    const value = e.target.value;
    if (!name) return;

    setCreateForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "groupId") next.subjectBranchId = "";
      return next;
    });
    setCreateErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateSessionForm(createForm);
    setCreateErrors(validation.errors || {});
    if (!validation.isValid) return;
    setCreateGeneral(null);

    setIsCreating(true);
    try {
      const body: Record<string, unknown> = {
        groupId: Number(createForm.groupId),
        date: createForm.date,
        startTime: createForm.startTime,
        endTime: createForm.endTime,
        title: createForm.title.trim(),
      };
      if (createForm.subjectBranchId) {
        body.subjectBranchId = Number(createForm.subjectBranchId);
      }
      if (createForm.notes.trim()) body.notes = createForm.notes.trim();

      await createSession(body);
      toast.success("تم إنشاء الحصة");
      setIsCreateOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      const mapped = mapApiError(err);
      setCreateErrors(mapped.fieldErrors);
      setCreateGeneral(mapped.generalMessage || getErrorMessage(err));
    } finally {
      setIsCreating(false);
    }
  };

  const openMark = async (session: AttendanceSession) => {
    setView("mark");
    setActiveSession(session);
    setIsMarkLoading(true);
    try {
      const [sessionRes, groupRes] = await Promise.all([
        getSession(session.id),
        getGroup(session.groupId || session.group?.id || "").catch(
          () => null,
        ) as Promise<{
          data?: {
            members?: Array<Record<string, unknown>>;
            students?: Array<Record<string, unknown>>;
          };
        } | null>,
      ]);
      const detail = sessionRes.data || session;
      setActiveSession(detail);

      const existing: Record<string, { status: string; note: string }> = {};
      (detail.records || []).forEach((r) => {
        existing[String(r.studentId)] = {
          status: r.status || "PRESENT",
          note: r.note || "",
        };
      });

      const members =
        groupRes?.data?.members ||
        groupRes?.data?.students ||
        detail.members ||
        [];
      const nextRecords: Record<string, { status: string; note: string }> = {};
      const rosterList: RosterMember[] = (
        Array.isArray(members) ? members : []
      ).map((m: Record<string, unknown>) => {
        const id = Number(m.id ?? m.studentId);
        const name = String(m.name || m.studentName || `طالب #${id}`);
        nextRecords[id] = existing[id] || { status: "PRESENT", note: "" };
        return { id, name, parentPhone: m.parentPhone as string | null };
      });

      Object.keys(existing).forEach((idStr) => {
        const id = Number(idStr);
        if (!nextRecords[id]) {
          nextRecords[id] = existing[id];
          rosterList.push({ id, name: `طالب #${id}`, parentPhone: null });
        }
      });

      setRoster(rosterList);
      setRecords(nextRecords);
      setSavedSnapshot(JSON.stringify(nextRecords));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
      setView("list");
    } finally {
      setIsMarkLoading(false);
    }
  };

  const setStatus = (studentId: number, status: string) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  };

  const saveRecords = async () => {
    if (!activeSession) return;
    setIsSaving(true);
    try {
      const payload = Object.entries(records).map(([studentId, r]) => ({
        studentId: Number(studentId),
        status: r.status,
        ...(r.note ? { note: r.note } : {}),
      }));
      const res = await upsertRecords(activeSession.id, payload);
      setSavedSnapshot(JSON.stringify(records));
      toast.success("تم حفظ الحضور");
      const links = Array.isArray(res.data?.whatsappLinks)
        ? res.data.whatsappLinks
        : Array.isArray(res.whatsappLinks)
          ? res.whatsappLinks
          : [];
      if (links.length) setWaLinks(links as WhatsAppLinkItem[]);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const sendWhatsApp = async (studentId: number) => {
    if (!activeSession) return;
    setSendingWaId(studentId);
    try {
      const res = await getWhatsAppLink({
        studentId,
        sessionId: activeSession.id,
      });
      const url = res.data?.url;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else toast.error("تعذر إنشاء رابط الواتساب");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSendingWaId(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    try {
      await deleteSession(toDelete.id);
      toast.success("تم حذف الحصة");
      setToDelete(null);
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const q = new URLSearchParams({ format: "csv" });
      if (from) q.set("from", from);
      if (to) q.set("to", to);
      await downloadExport(
        `/exports/attendance?${q}`,
        token ?? undefined,
        "attendance.csv",
      );
      toast.success("تم تنزيل ملف الحضور");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  };

  const groupLabel = (session: AttendanceSession) => {
    const g =
      session.group?.name ||
      groups.find((x) => String(x.id) === String(session.groupId))?.name;
    return g || "—";
  };

  if (view === "mark") {
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
                تسجيل الحضور
              </h1>
              <p className="text-sm text-slate-400">
                {activeSession?.title} — {formatDate(activeSession?.date)} ·{" "}
                {formatTime12h(activeSession?.startTime)}–
                {formatTime12h(activeSession?.endTime)} ·{" "}
                {groupLabel(activeSession || ({} as AttendanceSession))}
              </p>
            </div>
          </div>
          <Button onClick={saveRecords} loading={isSaving} disabled={!isDirty}>
            حفظ الحضور
          </Button>
        </div>

        {isMarkLoading ? (
          <LoadingBlock />
        ) : roster.length === 0 ? (
          <EmptyBlock
            icon={ClipboardCheck}
            title="لا يوجد أعضاء في المجموعة"
            description="سجّل طلابًا في المجموعة أولاً من صفحة المجموعات."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
            <ul className="divide-y divide-slate-800">
              {roster.map((student) => {
                const rec = records[student.id] || {
                  status: "PRESENT",
                  note: "",
                };
                return (
                  <li
                    key={student.id}
                    className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-100">{student.name}</p>
                      {rec.status === "ABSENT" && (
                        <Input
                          name={`note-${student.id}`}
                          value={rec.note || ""}
                          placeholder="ملاحظة الغياب (اختياري)"
                          className="mt-2"
                          onChange={(e) =>
                            setRecords((prev) => ({
                              ...prev,
                              [student.id]: {
                                ...prev[student.id],
                                note: e.target.value,
                              },
                            }))
                          }
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {ATTENDANCE_STATUS.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setStatus(student.id, s.value)}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                            rec.status === s.value
                              ? activeStyles[s.value]
                              : statusStyles[s.value]
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                      {rec.status === "ABSENT" && (
                        <Button
                          size="sm"
                          variant="outline"
                          loading={sendingWaId === student.id}
                          onClick={() => sendWhatsApp(student.id)}
                        >
                          <MessageCircle size={14} />
                          ولي الأمر
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <Modal
          isOpen={waLinks.length > 0}
          onClose={() => setWaLinks([])}
          title="إرسال واتساب لأولياء الأمور"
        >
          <div className="space-y-3">
            <p className="text-sm text-slate-400">
              روابط جاهزة لفتح محادثة واتساب مع ولي الأمر.
            </p>
            <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/60">
              {waLinks.map((link, i) => (
                <li
                  key={`${link.parentPhone || i}-${i}`}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-100">
                      {link.studentName ||
                        roster.find((s) => s.id === link.studentId)?.name ||
                        `طالب #${link.studentId || ""}`}
                    </p>
                    <p className="text-xs text-slate-400">
                      {link.parentPhone || "—"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!link.url}
                    onClick={() =>
                      window.open(link.url, "_blank", "noopener,noreferrer")
                    }
                  >
                    <MessageCircle size={14} />
                    فتح
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setWaLinks([])}
              >
                إغلاق
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade dir-rtl" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">
            الحضور
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            أنشئ حصصًا لمجموعة بموعد زمني وسجّل حضور الأعضاء.
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
          <Button onClick={openCreate} disabled={!groups.length}>
            <Plus size={18} />
            حصة جديدة
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "list" ? "primary" : "outline"}
          onClick={() => setMode("list")}
        >
          <ClipboardCheck size={16} />
          الحصص
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "calendar" ? "primary" : "outline"}
          onClick={() => {
            if (!from || !to) {
              const range = currentMonthRange();
              if (!from) setFrom(range.from);
              if (!to) setTo(range.to);
            }
            setMode("calendar");
          }}
        >
          <CalendarDays size={16} />
          التقويم
        </Button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl sm:grid-cols-2 lg:grid-cols-4">
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
      ) : mode === "calendar" ? (
        calendarEvents.length === 0 ? (
          <EmptyBlock
            icon={CalendarDays}
            title="لا أحداث في الفترة"
            description="حدّد نطاق تاريخ أو مجموعة لعرض الحصص والتقييمات."
          />
        ) : (
          <div className="space-y-3">
            {calendarEvents.map((ev, i) => {
              const evRecord = ev as unknown as Record<string, unknown>;

              return (
                <div
                  key={String(ev.id ?? i)}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl transition-colors hover:border-slate-700"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-100">
                      {pickLabel(evRecord, ["title", "name", "type"])}
                    </p>
                    <Badge
                      tone={
                        ev.type === "ASSESSMENT" || ev.kind === "assessment"
                          ? "info"
                          : "primary"
                      }
                    >
                      {ev.type === "ASSESSMENT" || ev.kind === "assessment"
                        ? "تقييم"
                        : "حصة"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    {formatDate(ev.date || ev.startDate || ev.from)}
                    {ev.startTime ? ` · ${formatTime12h(ev.startTime)}` : ""}
                    {ev.endTime ? ` — ${formatTime12h(ev.endTime)}` : ""}
                    {ev.group?.name || ev.groupName
                      ? ` · ${ev.group?.name || ev.groupName}`
                      : ""}
                  </p>
                </div>
              );
            })}
          </div>
        )
      ) : sessions.length === 0 ? (
        <EmptyBlock
          icon={ClipboardCheck}
          title="لا توجد حصص"
          description="أنشئ حصة مرتبطة بمجموعة وحدد وقت البداية والنهاية."
          action={
            groups.length ? (
              <Button onClick={openCreate}>
                <Plus size={16} />
                حصة جديدة
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
            <ul className="divide-y divide-slate-800">
              {sessions.map((session) => (
                <li
                  key={String(session.id)}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 hover:bg-slate-800/40 transition-colors"
                >
                  <div>
                    <p className="font-bold text-slate-100">{session.title}</p>
                    <p className="text-sm text-slate-400">
                      {formatDate(session.date)} ·{" "}
                      {formatTime12h(session.startTime)}–
                      {formatTime12h(session.endTime)} · {groupLabel(session)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openMark(session)}
                    >
                      تسجيل الحضور
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-400 hover:bg-rose-500/10"
                      onClick={() => setToDelete(session)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
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
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="حصة جديدة"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <FormError message={createGeneral} />
          <Select
            label="المجموعة"
            name="groupId"
            value={createForm.groupId}
            required
            options={groupOptions}
            error={createErrors.groupId}
            onChange={handleCreateChange}
          />
          <Input
            label="عنوان الحصة"
            name="title"
            value={createForm.title}
            required
            error={createErrors.title}
            onChange={handleCreateChange}
            placeholder="مثال: حصة النحو"
          />
          <DateField
            label="التاريخ"
            name="date"
            value={createForm.date}
            required
            error={createErrors.date}
            onChange={handleCreateChange}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TimeField
              label="وقت البداية"
              name="startTime"
              value={createForm.startTime}
              required
              error={createErrors.startTime}
              onChange={handleCreateChange}
            />
            <TimeField
              label="وقت النهاية"
              name="endTime"
              value={createForm.endTime}
              required
              error={createErrors.endTime}
              onChange={handleCreateChange}
            />
          </div>
          <Select
            label="فرع المادة (اختياري)"
            name="subjectBranchId"
            value={createForm.subjectBranchId}
            options={branchOptions}
            disabled={!createForm.groupId || !branchOptions.length}
            onChange={handleCreateChange}
            placeholder={
              branchOptions.length ? "اختر فرعًا..." : "لا توجد فروع"
            }
          />
          <Textarea
            label="ملاحظات"
            name="notes"
            value={createForm.notes}
            rows={2}
            onChange={handleCreateChange}
            placeholder="اختياري"
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" loading={isCreating}>
              إنشاء
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={isDeleting}
        title="حذف الحصة"
        message={`هل أنت متأكد من حذف «${toDelete?.title}»؟`}
        confirmText="حذف"
        cancelText="تراجع"
        variant="danger"
      />
    </div>
  );
}
