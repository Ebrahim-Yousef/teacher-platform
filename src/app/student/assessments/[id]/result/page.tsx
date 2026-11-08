"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowRight, CheckCircle2, XCircle, Clock3 } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "@/components/ui/StateBlock";
import { getErrorMessage } from "@/api/errors";
import { getStudentAssessmentResult } from "@/api/student";
import { QUESTION_TYPES } from "@/constants/app";
import { asList } from "@/utils/apiData";

export interface StudentQuestionItem {
  id?: string | number;
  type?: string;
  prompt?: string;
  points?: number;
}

export interface StudentAnswerItem {
  id?: string | number;
  type?: string;
  prompt?: string;
  points?: number;
  booleanAnswer?: boolean;
  selectedOption?: { text?: string };
  optionText?: string;
  selectedOptionText?: string;
  selectedOptionId?: string | number;
  textAnswer?: string;
  pointsAwarded?: number;
  score?: number;
  isCorrect?: boolean;
  question?: StudentQuestionItem;
}

export interface StudentAssessmentResultData {
  title?: string;
  autoScore?: number;
  totalScore?: number;
  maxScore?: number;
  percentage?: number;
  pendingTextQuestions?: number;
  pendingShortText?: number;
  answers?: StudentAnswerItem[];
  questions?: StudentAnswerItem[];
  assessment?: { title?: string };
}

const questionTypeLabel = (type?: string) =>
  QUESTION_TYPES.find((t) => t.value === type)?.label || type || "سؤال";

function formatStudentAnswer(
  ans: StudentAnswerItem,
  question?: StudentQuestionItem | StudentAnswerItem,
) {
  const type = question?.type || ans?.type;
  if (type === "TRUE_FALSE" || typeof ans?.booleanAnswer === "boolean") {
    if (typeof ans.booleanAnswer === "boolean") {
      return ans.booleanAnswer ? "صح" : "خطأ";
    }
    return null;
  }
  if (type === "MCQ") {
    return (
      ans.selectedOption?.text ||
      ans.optionText ||
      ans.selectedOptionText ||
      (ans.selectedOptionId != null ? `خيار #${ans.selectedOptionId}` : null)
    );
  }
  if (type === "SHORT_TEXT") {
    const text = String(ans.textAnswer ?? "").trim();
    return text || null;
  }
  if (ans.textAnswer != null && String(ans.textAnswer).trim()) {
    return String(ans.textAnswer).trim();
  }
  if (typeof ans.booleanAnswer === "boolean") {
    return ans.booleanAnswer ? "صح" : "خطأ";
  }
  if (ans.selectedOption?.text) return ans.selectedOption.text;
  return null;
}

function answerVerdict(
  ans: StudentAnswerItem,
  question?: StudentQuestionItem | StudentAnswerItem,
) {
  const type = question?.type || ans?.type;
  const awarded = Number(ans.pointsAwarded ?? ans.score);
  const max = Number(question?.points);
  const hasPoints = ans.pointsAwarded != null || ans.score != null;

  if (type === "SHORT_TEXT") {
    if (!hasPoints || Number.isNaN(awarded)) {
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

export default function StudentAssessmentResultPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [data, setData] = useState<StudentAssessmentResultData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSlow, setIsSlow] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const slowTimer = window.setTimeout(() => {
      if (!cancelled) setIsSlow(true);
    }, 8000);

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await getStudentAssessmentResult(id);
        if (cancelled) return;
        setData(res.data as StudentAssessmentResultData);
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
  }, [id]);

  if (isLoading) return <LoadingBlock isSlow={isSlow} />;
  if (error) {
    return (
      <ErrorBlock
        message={getErrorMessage(error)}
        onRetry={() => window.location.reload()}
      />
    );
  }
  if (!data) {
    return (
      <EmptyBlock title="لا نتيجة" description="تعذر تحميل نتيجة الاختبار." />
    );
  }

  const answers = asList(data.answers || data.questions) as StudentAnswerItem[];
  const pending = data.pendingTextQuestions ?? data.pendingShortText ?? 0;
  const title = data.title || data.assessment?.title || "الاختبار";

  return (
    <div className="space-y-6 animate-fade dir-rtl" dir="rtl">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/student/assessments")}
        >
          <ArrowRight size={16} />
          العودة
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">
            نتيجة {title}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-400">
            ملخص درجتك وإجاباتك بعد التسليم.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 shadow-xl">
          <p className="text-xs font-bold text-slate-400">الدرجة التلقائية</p>
          <p className="mt-2 text-2xl font-bold text-slate-100">
            {data.autoScore ?? "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-5 py-4 shadow-xl sm:col-span-1">
          <p className="text-xs font-bold text-indigo-400">الإجمالي</p>
          <p className="mt-2 text-2xl font-bold text-indigo-200">
            {data.totalScore ?? "—"}
            {data.maxScore != null ? (
              <span className="text-base font-semibold text-indigo-400">
                {" "}
                / {data.maxScore}
              </span>
            ) : null}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 shadow-xl">
          <p className="text-xs font-bold text-slate-400">من</p>
          <p className="mt-2 text-2xl font-bold text-slate-100">
            {data.maxScore ?? "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 shadow-xl">
          <p className="text-xs font-bold text-emerald-400">النسبة</p>
          <p className="mt-2 text-2xl font-bold text-emerald-200">
            {data.percentage != null ? `${data.percentage}%` : "—"}
          </p>
        </div>
      </div>

      {pending > 0 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-300">
          يوجد {pending} سؤال نصي بانتظار تصحيح المعلم. الدرجة النهائية قد
          تتغير.
        </div>
      ) : null}

      {answers.length === 0 ? (
        <EmptyBlock
          title="لا إجابات"
          description="لا توجد تفاصيل أسئلة لهذه النتيجة."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
          <div className="border-b border-slate-800 bg-slate-950/60 px-5 py-3">
            <p className="text-sm font-bold text-slate-300">
              تفاصيل الإجابات ({answers.length})
            </p>
          </div>
          <ul className="divide-y divide-slate-800">
            {answers.map((ans, i) => {
              const question = ans.question || ans;
              const type = question.type || ans.type;
              const displayAnswer = formatStudentAnswer(ans, question);
              const verdict = answerVerdict(ans, question);
              const VerdictIcon = verdict.Icon;
              const awarded = ans.pointsAwarded ?? ans.score;
              const qMax = question.points;

              return (
                <li
                  key={String(ans.id ?? question.id ?? i)}
                  className="px-4 py-4 sm:px-5"
                >
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px] lg:items-start">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">
                          سؤال {i + 1}
                        </span>
                        <Badge tone="primary">{questionTypeLabel(type)}</Badge>
                        <Badge tone={verdict.tone}>
                          {VerdictIcon ? (
                            <VerdictIcon size={12} className="ml-1 inline" />
                          ) : null}
                          {verdict.label}
                        </Badge>
                      </div>
                      <p className="text-sm font-bold leading-relaxed text-slate-100 sm:text-base">
                        {question.prompt || `سؤال ${i + 1}`}
                      </p>
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5">
                        <p className="text-[11px] font-bold text-slate-400">
                          إجابتك
                        </p>
                        <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-200">
                          {displayAnswer || (
                            <span className="text-slate-500">لم يُجب</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 lg:flex-col lg:items-end lg:justify-center lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
                      <p className="text-xs font-bold text-slate-400 lg:hidden">
                        الدرجة
                      </p>
                      <p className="text-lg font-bold text-slate-100">
                        {awarded != null ? awarded : "—"}
                        {qMax != null ? (
                          <span className="text-sm font-semibold text-slate-400">
                            {" "}
                            / {qMax}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
