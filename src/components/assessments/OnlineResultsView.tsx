"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Trophy,
  CheckCircle2,
  XCircle,
  Clock3,
  UserRound,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "@/components/ui/StateBlock";
import { useToast } from "@/hooks/useToast";
import {
  getAssessmentResults,
  getLeaderboard,
  gradeSubmissionAnswer,
  AssessmentItem,
} from "@/api/assessments";
import { getErrorMessage } from "@/api/errors";
import { QUESTION_TYPES } from "@/constants/app";
import { asList, pickLabel } from "@/utils/apiData";

interface OnlineResultsViewProps {
  assessment: AssessmentItem;
  onBack: () => void;
}

export interface AnswerItem {
  id?: string | number;
  answerId?: string | number;
  type?: string;
  booleanAnswer?: boolean;
  selectedOption?: { text?: string };
  optionText?: string;
  selectedOptionText?: string;
  selectedOptionId?: string | number;
  textAnswer?: string;
  pointsAwarded?: number;
  score?: number;
  isCorrect?: boolean;
  question?: {
    id?: string | number;
    type?: string;
    prompt?: string;
    points?: number;
  };
}

export interface StudentRow {
  student: { id: string | number; name: string };
  submissionId: string | number | null;
  status: string;
  answers: AnswerItem[];
  earned: number | null;
  maxScore: number | null;
  hasSubmitted: boolean;
}

const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  not_started: "لم يبدأ",
  in_progress: "قيد التنفيذ",
  started: "بدأ",
  submitted: "مُسلَّم",
  graded: "مُصحَّح",
  completed: "مكتمل",
};

const SUBMISSION_STATUS_TONES: Record<
  string,
  "default" | "warning" | "success" | "info" | "danger"
> = {
  not_started: "default",
  in_progress: "warning",
  started: "warning",
  submitted: "success",
  graded: "success",
  completed: "success",
};

const questionTypeLabel = (type?: string) =>
  QUESTION_TYPES.find((t) => t.value === type)?.label || type || "سؤال";

function formatStudentAnswer(
  ans: AnswerItem,
  question?: AnswerItem["question"],
) {
  const type = question?.type || ans.type;
  if (type === "TRUE_FALSE" || typeof ans.booleanAnswer === "boolean") {
    if (typeof ans.booleanAnswer === "boolean") {
      return ans.booleanAnswer ? "صح" : "خطأ";
    }
    return "—";
  }
  if (type === "MCQ") {
    return (
      ans.selectedOption?.text ||
      ans.optionText ||
      ans.selectedOptionText ||
      (ans.selectedOptionId != null ? `خيار #${ans.selectedOptionId}` : "—")
    );
  }
  if (type === "SHORT_TEXT") {
    const text = String(ans.textAnswer ?? "").trim();
    return text || "—";
  }
  if (ans.textAnswer != null && String(ans.textAnswer).trim()) {
    return String(ans.textAnswer).trim();
  }
  return "—";
}

function answerVerdict(ans: AnswerItem, question?: AnswerItem["question"]) {
  const type = question?.type || ans.type;
  const awarded = Number(ans.pointsAwarded ?? ans.score);
  const max = Number(question?.points);
  const hasPoints = !Number.isNaN(awarded);

  if (type === "SHORT_TEXT") {
    if (!hasPoints || ans.pointsAwarded == null) {
      return {
        label: "بانتظار التصحيح",
        tone: "warning" as const,
        Icon: Clock3,
      };
    }
    if (!Number.isNaN(max) && awarded >= max) {
      return {
        label: "درجة كاملة",
        tone: "success" as const,
        Icon: CheckCircle2,
      };
    }
    if (awarded <= 0) {
      return { label: "بدون درجة", tone: "danger" as const, Icon: XCircle };
    }
    return { label: "درجة جزئية", tone: "info" as const, Icon: CheckCircle2 };
  }

  if (ans.isCorrect === true) {
    return { label: "صحيحة", tone: "success" as const, Icon: CheckCircle2 };
  }
  if (ans.isCorrect === false) {
    return { label: "خاطئة", tone: "danger" as const, Icon: XCircle };
  }
  if (hasPoints && !Number.isNaN(max)) {
    if (awarded >= max) {
      return { label: "صحيحة", tone: "success" as const, Icon: CheckCircle2 };
    }
    if (awarded <= 0) {
      return { label: "خاطئة", tone: "danger" as const, Icon: XCircle };
    }
  }
  return { label: "—", tone: "default" as const, Icon: null };
}

function normalizeRow(rowItem: unknown): StudentRow {
  const row = rowItem as Record<string, unknown>;
  const studentObj = (row.student as Record<string, unknown>) || {
    id: row.studentId,
    name: row.studentName || row.name,
  };

  const student = {
    id: (studentObj.id ?? "") as string | number,
    name: String(studentObj.name || "طالب"),
  };

  const submission = (row.submission as Record<string, unknown>) || row;
  const submissionId = (submission.id ?? row.submissionId ?? null) as
    | string
    | number
    | null;
  const status = String(
    submission.status ||
      row.status ||
      (submissionId ? "submitted" : "not_started"),
  ).toLowerCase();

  const answers = asList(
    submission.answers || row.answers || [],
  ) as AnswerItem[];
  const earned = Number(
    submission.totalScore ?? row.totalScore ?? row.score ?? row.autoScore,
  );

  const maxFromAnswers = answers.reduce((sum, ans) => {
    const pts = Number(ans.question?.points);
    return sum + (Number.isNaN(pts) ? 0 : pts);
  }, 0);

  return {
    student,
    submissionId,
    status,
    answers,
    earned: Number.isNaN(earned) ? null : earned,
    maxScore:
      (submission.maxScore as number) ??
      (row.maxScore as number) ??
      (maxFromAnswers > 0 ? maxFromAnswers : null),
    hasSubmitted:
      Boolean(submissionId) ||
      ["submitted", "graded", "completed"].includes(status) ||
      answers.length > 0,
  };
}

export default function OnlineResultsView({
  assessment,
  onBack,
}: OnlineResultsViewProps) {
  const { toast } = useToast();

  const [tab, setTab] = useState<"results" | "leaderboard">("results");
  const [filter, setFilter] = useState("all");
  const [resultsData, setResultsData] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [leaderboard, setLeaderboard] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSlow, setIsSlow] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [gradingKey, setGradingKey] = useState<string | null>(null);
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const slowTimer = window.setTimeout(() => {
      if (!cancelled) setIsSlow(true);
    }, 8000);

    const loadResults = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [resultsRes, boardRes] = await Promise.all([
          getAssessmentResults(assessment.id),
          getLeaderboard(assessment.id, { limit: 10 }),
        ]);
        if (cancelled) return;
        setResultsData(resultsRes.data as Record<string, unknown>);
        const boardData = boardRes.data as { entries?: unknown[] };
        setLeaderboard(
          asList(boardData?.entries || boardRes.data) as Array<
            Record<string, unknown>
          >,
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

    loadResults();

    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
    };
  }, [assessment.id, reloadKey]);

  const rows = useMemo(() => {
    const list = asList(
      resultsData?.submissions ||
        resultsData?.students ||
        resultsData?.members ||
        resultsData,
    );
    return list.map(normalizeRow);
  }, [resultsData]);

  const summaryObj = resultsData?.summary as
    | {
        maxScore?: number;
        submissionCount?: number;
        submitted?: number;
        averageScore?: number;
        average?: number;
      }
    | undefined;

  const assessmentMax =
    summaryObj?.maxScore ??
    assessment.maxScore ??
    rows.find((r) => r.maxScore != null)?.maxScore ??
    null;

  const filteredRows = useMemo(() => {
    if (filter === "submitted") return rows.filter((r) => r.hasSubmitted);
    if (filter === "pending") return rows.filter((r) => !r.hasSubmitted);
    return rows;
  }, [rows, filter]);

  const submittedCount = rows.filter((r) => r.hasSubmitted).length;

  const handleGrade = async (
    submissionId: string | number,
    answerId: string | number,
    maxPoints?: number,
  ) => {
    const key = `${submissionId}-${answerId}`;
    const raw = gradeDrafts[key];
    const points = Number(raw);
    if (raw === "" || raw == null || Number.isNaN(points) || points < 0) {
      toast.error("أدخل درجة صحيحة");
      return;
    }
    if (maxPoints != null && points > Number(maxPoints)) {
      toast.error(`الدرجة يجب ألا تتجاوز ${maxPoints}`);
      return;
    }

    setGradingKey(key);
    try {
      await gradeSubmissionAnswer(assessment.id, submissionId, answerId, {
        pointsAwarded: points,
      });
      toast.success("تم رصد درجة الإجابة");
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setGradingKey(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade dir-rtl" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowRight size={16} />
            العودة
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">
              نتائج الاختبار الإلكتروني
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-400">
              {assessment.title}
              {assessmentMax != null ? ` · الدرجة العظمى ${assessmentMax}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={tab === "results" ? "primary" : "outline"}
            onClick={() => setTab("results")}
          >
            النتائج
          </Button>
          <Button
            size="sm"
            variant={tab === "leaderboard" ? "primary" : "outline"}
            onClick={() => setTab("leaderboard")}
          >
            <Trophy size={14} />
            المتصدرون
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          [
            "التسليمات",
            summaryObj?.submissionCount ??
              summaryObj?.submitted ??
              submittedCount,
          ],
          ["المتوسط", summaryObj?.averageScore ?? summaryObj?.average ?? "—"],
          ["الدرجة العظمى", assessmentMax ?? "—"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 shadow-xl"
          >
            <p className="text-xs font-bold text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-100">
              {value}
            </p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <LoadingBlock isSlow={isSlow} />
      ) : error ? (
        <ErrorBlock
          message={getErrorMessage(error)}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      ) : tab === "leaderboard" ? (
        leaderboard.length === 0 ? (
          <EmptyBlock
            icon={Trophy}
            title="لا يوجد متصدرون بعد"
            description="سيظهر الترتيب بعد تسليم الطلاب."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
            <div className="border-b border-slate-800 bg-slate-950/60 px-5 py-3">
              <p className="text-sm font-bold text-slate-200">لوحة المتصدرين</p>
            </div>
            <ol className="divide-y divide-slate-800">
              {leaderboard.map((row, i) => {
                const rank = (row.rank as number) ?? i + 1;
                const score = (row.totalScore ?? row.score) as number;
                const max = (row.maxScore as number) ?? assessmentMax;
                const targetObj = (row.student || row) as Record<
                  string,
                  unknown
                >;

                return (
                  <li
                    key={String(row.studentId ?? row.id ?? i)}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          rank === 1
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : rank === 2
                              ? "bg-slate-700 text-slate-200"
                              : rank === 3
                                ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                : "bg-indigo-500/10 text-indigo-400"
                        }`}
                      >
                        {rank}
                      </span>
                      <p className="truncate font-bold text-slate-100">
                        {pickLabel(targetObj, ["name", "studentName"])}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-slate-100">
                      {score != null ? score : "—"}
                      {max != null ? (
                        <span className="font-semibold text-slate-400">
                          {" "}
                          / {max}
                        </span>
                      ) : null}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        )
      ) : rows.length === 0 ? (
        <EmptyBlock
          title="لا نتائج بعد"
          description="لم يظهر أي طالب في نتائج هذا الاختبار."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { value: "all", label: `الكل (${rows.length})` },
              { value: "submitted", label: `سلّموا (${submittedCount})` },
              {
                value: "pending",
                label: `لم يبدأوا (${rows.length - submittedCount})`,
              },
            ].map((item) => (
              <Button
                key={item.value}
                size="sm"
                variant={filter === item.value ? "primary" : "outline"}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {filteredRows.length === 0 ? (
            <EmptyBlock
              title="لا طلاب في هذا التصنيف"
              description="جرّب تصفية أخرى."
            />
          ) : (
            <div className="space-y-3">
              {filteredRows.map((row, i) => {
                const key = String(row.submissionId ?? row.student.id ?? i);
                const isOpen =
                  expandedId === key ||
                  (expandedId == null && row.hasSubmitted && i === 0);
                const statusLabel =
                  SUBMISSION_STATUS_LABELS[row.status] || row.status;
                const statusTone =
                  SUBMISSION_STATUS_TONES[row.status] || "info";
                const max = row.maxScore ?? assessmentMax;
                const studentRecord = row.student as Record<string, unknown>;

                return (
                  <article
                    key={key}
                    className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-right transition-colors hover:bg-slate-800/60"
                      onClick={() =>
                        setExpandedId((prev) => (prev === key ? null : key))
                      }
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
                          <UserRound size={18} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-100">
                            {pickLabel(studentRecord, ["name", "studentName"])}
                          </p>
                          <p className="mt-0.5 text-xs font-medium text-slate-400">
                            {row.hasSubmitted
                              ? `${row.answers.length} إجابة`
                              : "لم يُسلّم بعد"}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                        <Badge tone={statusTone}>{statusLabel}</Badge>
                        <div className="rounded-xl bg-slate-950/60 px-3 py-1.5 text-sm font-bold text-slate-100 border border-slate-800">
                          {row.earned != null ? row.earned : "—"}
                          {max != null ? (
                            <span className="text-slate-400"> / {max}</span>
                          ) : null}
                        </div>
                      </div>
                    </button>

                    {isOpen ? (
                      <div className="border-t border-slate-800 bg-slate-950/40 px-5 py-5">
                        {!row.hasSubmitted || row.answers.length === 0 ? (
                          <p className="text-sm font-medium text-slate-400">
                            لا توجد إجابات لعرضها لهذا الطالب.
                          </p>
                        ) : (
                          <ul className="space-y-3">
                            {row.answers.map((ans, qi) => {
                              const question = ans.question || {};
                              const type = question.type || ans.type;
                              const isShort = type === "SHORT_TEXT";
                              const answerId = ans.id ?? ans.answerId;
                              const draftKey = `${row.submissionId}-${answerId}`;
                              const verdict = answerVerdict(ans, question);
                              const VerdictIcon = verdict.Icon;
                              const awarded = ans.pointsAwarded ?? ans.score;
                              const qMax = question.points;

                              return (
                                <li
                                  key={String(answerId || question.id || qi)}
                                  className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5"
                                >
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0 flex-1 space-y-2">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-bold text-slate-400">
                                          سؤال {qi + 1}
                                        </span>
                                        <Badge tone="primary">
                                          {questionTypeLabel(type)}
                                        </Badge>
                                      </div>
                                      <p className="text-sm font-bold leading-relaxed text-slate-100 sm:text-base">
                                        {question.prompt ||
                                          `سؤال #${question.id || qi + 1}`}
                                      </p>
                                      <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800">
                                        <p className="text-[11px] font-bold text-slate-400">
                                          إجابة الطالب
                                        </p>
                                        <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-200">
                                          {formatStudentAnswer(ans, question)}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:w-44 sm:items-end">
                                      <Badge tone={verdict.tone}>
                                        {VerdictIcon ? (
                                          <VerdictIcon
                                            size={12}
                                            className="ml-1 inline"
                                          />
                                        ) : null}
                                        {verdict.label}
                                      </Badge>
                                      <p className="text-sm font-bold text-slate-100 sm:text-left">
                                        {awarded != null ? awarded : "—"}
                                        {qMax != null ? (
                                          <span className="text-slate-400">
                                            {" "}
                                            / {qMax}
                                          </span>
                                        ) : null}
                                      </p>
                                    </div>
                                  </div>

                                  {isShort &&
                                  row.submissionId &&
                                  answerId != null ? (
                                    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-dashed border-indigo-500/30 bg-indigo-500/5 p-3 sm:flex-row sm:items-end">
                                      <div className="min-w-0 flex-1 sm:max-w-45">
                                        <Input
                                          label="درجة التصحيح اليدوي"
                                          type="number"
                                          min="0"
                                          max={qMax}
                                          step="0.5"
                                          value={
                                            gradeDrafts[draftKey] ??
                                            (awarded != null
                                              ? String(awarded)
                                              : "")
                                          }
                                          onChange={(e) =>
                                            setGradeDrafts((prev) => ({
                                              ...prev,
                                              [draftKey]: e.target.value,
                                            }))
                                          }
                                        />
                                      </div>
                                      <Button
                                        size="sm"
                                        loading={gradingKey === draftKey}
                                        onClick={() =>
                                          handleGrade(
                                            row.submissionId!,
                                            answerId,
                                            qMax,
                                          )
                                        }
                                      >
                                        حفظ الدرجة
                                      </Button>
                                    </div>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
