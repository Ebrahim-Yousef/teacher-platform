"use client";

import React, { useEffect, useState, use } from "react";
import { MessageCircle, Phone, ClipboardCheck, FileText } from "lucide-react";
import StudentInfoCard from "@/components/students/StudentInfoCard";
import StudentModal from "@/components/students/StudentModal";
import BackButton from "@/components/ui/BackButton";
import Button from "@/components/ui/Button";
import {
  ColdStartNotice,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "@/components/ui/StateBlock";
import { useToast } from "@/hooks/useToast";
import {
  getStudent,
  updateStudent,
  StudentItem,
  StudentPayload,
} from "@/api/students";
import {
  getStudentAttendance,
  getWhatsAppLink as fetchWhatsAppLink,
} from "@/api/attendance";
import { getStudentPerformance } from "@/api/assessments";
import { getErrorMessage } from "@/api/errors";
import { ATTENDANCE_STATUS, ASSESSMENT_TYPES } from "@/constants/app";
import { STAGES, STAGES_GRADES } from "@/constants/stages";
import { formatDate } from "@/utils/format";
import { formatTime12h } from "@/utils/datePicker";
import { getWhatsAppLink } from "@/utils/whatsapp";

const statusLabel = (value: string) =>
  ATTENDANCE_STATUS.find((s) => s.value === value)?.label || value || "—";

const typeLabel = (value: string) =>
  ASSESSMENT_TYPES.find((t) => t.value === value)?.label || value || "—";

const statusClass: Record<string, string> = {
  PRESENT: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  ABSENT: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  LATE: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

interface AttendanceRecord {
  id?: string | number;
  sessionId?: string | number;
  status: string;
  title?: string;
  sessionTitle?: string;
  date?: string;
  sessionDate?: string;
  session?: {
    id?: string | number;
    title?: string;
    date?: string;
    startTime?: string;
  };
}

interface AttendanceSummary {
  attendanceRate?: number;
  total?: number;
  present?: number;
  absent?: number;
  late?: number;
}

interface AssessmentRecord {
  id?: string | number;
  assessmentId?: string | number;
  title?: string;
  type?: string;
  date?: string;
  score?: number | null;
  maxScore?: number;
  percentage?: number;
}

interface PerformanceData {
  averagePercentage?: number;
  assessments?: AssessmentRecord[];
}

type SelectOption = { value: string; label: string };

// إعداد خيارات المراحل بما يتوافق مع SelectOption[]
const stagesOptions: SelectOption[] = Array.isArray(STAGES)
  ? (STAGES as unknown[]).map((s) => {
      if (typeof s === "string") return { value: s, label: s };
      return s as SelectOption;
    })
  : [];

const getGradesForStage = (stageValue: string): SelectOption[] => {
  if (!stageValue) return [];
  const grades = (STAGES_GRADES as unknown as Record<string, unknown>)[
    stageValue
  ];
  if (!Array.isArray(grades)) return [];
  return grades.map((g) => {
    if (typeof g === "string") return { value: g, label: g };
    return g as SelectOption;
  });
};

export default function StudentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const { toast } = useToast();

  const [student, setStudent] = useState<StudentItem | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] =
    useState<AttendanceSummary | null>(null);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSlow, setIsSlow] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSendingWa, setIsSendingWa] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const slowTimer = window.setTimeout(() => {
      if (!cancelled) setIsSlow(true);
    }, 8000);

    const loadStudentData = async () => {
      setIsLoading(true);
      setIsSlow(false);
      setError(null);
      try {
        const [studentRes, attendanceRes, performanceRes] = await Promise.all([
          getStudent(id),
          getStudentAttendance(id).catch(() => ({
            data: [] as AttendanceRecord[],
          })),
          getStudentPerformance(id).catch(() => ({ data: null })),
        ]);
        if (cancelled) return;

        setStudent(studentRes.data);

        const attendanceData = (attendanceRes as { data?: unknown }).data;

        if (Array.isArray(attendanceData)) {
          setAttendance(attendanceData as AttendanceRecord[]);
          setAttendanceSummary(null);
        } else if (attendanceData && typeof attendanceData === "object") {
          const container = attendanceData as {
            records?: AttendanceRecord[];
            sessions?: AttendanceRecord[];
            summary?: AttendanceSummary;
          };
          setAttendance(container.records || container.sessions || []);
          setAttendanceSummary(container.summary || null);
        }

        setPerformance(performanceRes.data as PerformanceData);
      } catch (err: unknown) {
        if (!cancelled) setError(err);
        setStudent(null);
      } finally {
        window.clearTimeout(slowTimer);
        if (!cancelled) {
          setIsLoading(false);
          setIsSlow(false);
        }
      }
    };

    loadStudentData();

    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
    };
  }, [id, reloadKey]);

  const handleParentWhatsApp = async () => {
    if (!student) return;
    setIsSendingWa(true);
    try {
      const res = await fetchWhatsAppLink({ studentId: student.id });
      const url = res.data?.url;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        window.open(
          getWhatsAppLink(student.parentPhone),
          "_blank",
          "noopener,noreferrer",
        );
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "تعذر إنشاء رابط واتساب"));
    } finally {
      setIsSendingWa(false);
    }
  };

  const handleStudentSubmit = async (payload: StudentPayload) => {
    if (!student) return;
    try {
      await updateStudent(student.id, payload);
      toast.success("تم تحديث بيانات الطالب");
      setIsEditOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "تعذر تحديث البيانات"));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 dir-rtl" dir="rtl">
        <BackButton to="/dashboard" />
        <LoadingBlock isSlow={isSlow} label="جاري تحميل بيانات الطالب..." />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="space-y-4 dir-rtl" dir="rtl">
        <BackButton to="/dashboard" />
        <ErrorBlock
          message={
            (error as { status?: number })?.status === 404
              ? "الطالب غير موجود"
              : getErrorMessage(error, "تعذر تحميل بيانات الطالب")
          }
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      </div>
    );
  }

  const assessments = performance?.assessments || [];

  return (
    <div className="space-y-6 animate-fade dir-rtl" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackButton to="/dashboard" />
        <div className="flex flex-wrap gap-2">
          <a href={`tel:${student.parentPhone}`}>
            <Button type="button" variant="outline" size="sm">
              <Phone size={16} />
              اتصال بولي الأمر
            </Button>
          </a>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={isSendingWa}
            onClick={handleParentWhatsApp}
          >
            <MessageCircle size={16} />
            واتساب ولي الأمر
          </Button>
        </div>
      </div>

      {isSlow && <ColdStartNotice />}

      <StudentInfoCard student={student} onEdit={() => setIsEditOpen(true)} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={18} className="text-indigo-400" />
              <h2 className="text-base font-bold text-slate-100">سجل الحضور</h2>
            </div>
            {attendanceSummary?.attendanceRate != null && (
              <span className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-400">
                نسبة الحضور:{" "}
                {Number(attendanceSummary.attendanceRate).toFixed(1)}%
              </span>
            )}
          </div>

          {attendanceSummary && (
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {[
                { label: "الكل", value: attendanceSummary.total },
                { label: "حاضر", value: attendanceSummary.present },
                { label: "غائب", value: attendanceSummary.absent },
                { label: "متأخر", value: attendanceSummary.late },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 px-2 py-2"
                >
                  <p className="font-bold text-slate-100">{stat.value ?? 0}</p>
                  <p className="text-slate-400 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {attendance.length === 0 ? (
            <EmptyBlock
              title="لا يوجد حضور مسجّل"
              description="سيظهر هنا سجل جلسات الحضور لهذا الطالب."
            />
          ) : (
            <ul className="divide-y divide-slate-800">
              {attendance.slice(0, 10).map((row, index) => {
                const session = row.session || {};
                const title =
                  row.title || row.sessionTitle || session.title || "جلسة حضور";
                const date = row.date || row.sessionDate || session.date;
                return (
                  <li
                    key={String(row.id || row.sessionId || session.id || index)}
                    className="flex items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div>
                      <p className="font-bold text-slate-100">{title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatDate(date)}
                        {session.startTime
                          ? ` · ${formatTime12h(session.startTime)}`
                          : ""}
                      </p>
                    </div>
                    <span
                      className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${
                        statusClass[row.status] ||
                        "bg-slate-800 text-slate-300 border-slate-700"
                      }`}
                    >
                      {statusLabel(row.status)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-indigo-400" />
              <h2 className="text-base font-bold text-slate-100">الأداء</h2>
            </div>
            {performance?.averagePercentage != null && (
              <span className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-400">
                المتوسط: {Number(performance.averagePercentage).toFixed(1)}%
              </span>
            )}
          </div>

          {assessments.length === 0 ? (
            <EmptyBlock
              title="لا توجد تقييمات"
              description="سيظهر هنا أداء الطالب في الاختبارات والواجبات."
            />
          ) : (
            <ul className="divide-y divide-slate-800">
              {assessments.slice(0, 10).map((row, index) => (
                <li
                  key={String(row.id || row.assessmentId || index)}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-bold text-slate-100">
                      {row.title || "تقييم"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {typeLabel(row.type || "")} · {formatDate(row.date)}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-100">
                      {row.score ?? "—"}
                      {row.maxScore != null ? ` / ${row.maxScore}` : ""}
                    </p>
                    {row.percentage != null && (
                      <p className="text-xs text-slate-400">
                        {Number(row.percentage).toFixed(0)}%
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <StudentModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setReloadKey((k) => k + 1);
        }}
        student={student}
        stagesOptions={stagesOptions}
        getGradesForStage={getGradesForStage}
        onSubmit={handleStudentSubmit}
      />
    </div>
  );
}
