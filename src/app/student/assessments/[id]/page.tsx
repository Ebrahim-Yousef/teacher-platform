"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FileText,
  ArrowRight,
  Send,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Textarea from "@/components/ui/Textarea";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "@/components/ui/StateBlock";
import { useToast } from "@/hooks/useToast";
import {
  getStudentAssessmentDetail,
  submitStudentAssessment,
} from "@/api/student";
import { getErrorMessage } from "@/api/errors";
import { QUESTION_TYPES } from "@/constants/app";

interface QuestionOption {
  id: string | number;
  text: string;
}

interface AssessmentQuestion {
  id: string;
  type: string;
  prompt: string;
  points: number;
  options?: QuestionOption[];
}

interface AssessmentDetail {
  id: string;
  title: string;
  type: string;
  maxScore: number;
  instructions?: string;
  teacherName?: string;
  alreadySubmitted?: boolean;
  questions: AssessmentQuestion[];
}

interface StudentAnswerState {
  questionId: string;
  booleanAnswer?: boolean;
  selectedOptionId?: string;
  textAnswer?: string;
}

const typeLabel = (t: string) =>
  QUESTION_TYPES.find((q) => q.value === t)?.label || t;

export default function StudentTakeAssessmentPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { toast } = useToast();

  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, StudentAnswerState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSlow, setIsSlow] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        const res = (await getStudentAssessmentDetail(id)) as { data: AssessmentDetail };
        if (cancelled) return;
        const data = res.data;
        if (data.alreadySubmitted) {
          router.replace(`/student/assessments/${id}/result`);
          return;
        }
        setAssessment(data);
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
  }, [id, router]);

  const handleSelectOption = (questionId: string, optionText: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        questionId,
        selectedOptionId: optionText,
      },
    }));
  };

  const handleSelectBoolean = (questionId: string, value: boolean) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        questionId,
        booleanAnswer: value,
      },
    }));
  };

  const handleTextAnswerChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        questionId,
        textAnswer: text,
      },
    }));
  };

  const handleSubmitExam = async () => {
    setIsSubmitting(true);
    try {
      const answersArray = Object.values(answers);
      await submitStudentAssessment(id, { answers: answersArray });
      toast.success("تم تسليم الاختبار بنجاح!");
      setIsConfirmOpen(false);
      router.push(`/student/assessments/${id}/result`);
    } catch (err) {
      toast.error(getErrorMessage(err, "فشل في تسليم الاختبار"));
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingBlock isSlow={isSlow} />;
  if (error) {
    return (
      <ErrorBlock
        message={getErrorMessage(error)}
        onRetry={() => window.location.reload()}
      />
    );
  }
  if (!assessment) {
    return (
      <EmptyBlock
        icon={FileText}
        title="الاختبار غير موجود"
        description="تعذر تحميل تفاصيل هذا الاختبار."
      />
    );
  }

  const questions = assessment.questions || [];
  const answeredCount = questions.filter((q) => {
    const a = answers[q.id];
    if (!a) return false;
    if (q.type === "TRUE_FALSE") return typeof a.booleanAnswer === "boolean";
    if (q.type === "MCQ") return Boolean(a.selectedOptionId);
    if (q.type === "SHORT_TEXT") return Boolean(a.textAnswer?.trim());
    return false;
  }).length;

  return (
    <div className="space-y-6 animate-fade dir-rtl max-w-4xl mx-auto" dir="rtl">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/student/assessments")}
          >
            <ArrowRight size={18} />
            العودة
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100">
                {assessment.title}
              </h1>
              <Badge tone="primary">{typeLabel(assessment.type)}</Badge>
            </div>
            {assessment.teacherName && (
              <p className="text-xs text-slate-400 mt-1">
                المعلم: {assessment.teacherName} · الدرجة الكلية: {assessment.maxScore} درجة
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-400 font-medium">الأسئلة المجاب عنها</span>
            <p className="text-sm font-bold text-indigo-400">
              {answeredCount} من {questions.length}
            </p>
          </div>
          <Button
            onClick={() => setIsConfirmOpen(true)}
            disabled={questions.length === 0}
            className="flex items-center gap-2"
          >
            <Send size={16} />
            تسليم الاختبار
          </Button>
        </div>
      </div>

      {assessment.instructions && (
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-sm text-indigo-200">
          <p className="font-bold mb-1 flex items-center gap-1.5 text-indigo-300">
            <HelpCircle size={16} />
            تعليمات الاختبار:
          </p>
          <p className="whitespace-pre-line leading-relaxed">{assessment.instructions}</p>
        </div>
      )}

      {/* Questions list */}
      {questions.length === 0 ? (
        <EmptyBlock
          icon={FileText}
          title="لا توجد أسئلة بعد"
          description="لم يقم المعلم بإضافة أسئلة لهذا الاختبار بعد."
        />
      ) : (
        <div className="space-y-6">
          {questions.map((q, index) => {
            const currentAns = answers[q.id];

            return (
              <div
                key={q.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl transition-all space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 font-bold text-xs">
                      {index + 1}
                    </span>
                    <Badge tone="default">{typeLabel(q.type)}</Badge>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    {q.points} {q.points === 1 ? "درجة" : "درجات"}
                  </span>
                </div>

                <p className="text-base font-bold text-slate-100 leading-relaxed">
                  {q.prompt}
                </p>

                {/* Question Type: Multiple Choice */}
                {q.type === "MCQ" && (
                  <div className="grid gap-2.5 sm:grid-cols-2 pt-2">
                    {(q.options || []).map((opt) => {
                      const isSelected = currentAns?.selectedOptionId === opt.text;
                      return (
                        <button
                          key={String(opt.id)}
                          type="button"
                          onClick={() => handleSelectOption(q.id, opt.text)}
                          className={`flex items-center justify-between p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-500/10 text-indigo-200 font-bold ring-1 ring-indigo-500/50"
                              : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40"
                          }`}
                        >
                          <span className="text-sm">{opt.text}</span>
                          {isSelected && <CheckCircle2 size={18} className="text-indigo-400 shrink-0 mr-2" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Question Type: True / False */}
                {q.type === "TRUE_FALSE" && (
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleSelectBoolean(q.id, true)}
                      className={`flex-1 p-3 rounded-xl border text-center font-bold text-sm transition-all cursor-pointer ${
                        currentAns?.booleanAnswer === true
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/40"
                          : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40"
                      }`}
                    >
                      صح
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectBoolean(q.id, false)}
                      className={`flex-1 p-3 rounded-xl border text-center font-bold text-sm transition-all cursor-pointer ${
                        currentAns?.booleanAnswer === false
                          ? "border-rose-500 bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/40"
                          : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40"
                      }`}
                    >
                      خطأ
                    </button>
                  </div>
                )}

                {/* Question Type: Short Text */}
                {q.type === "SHORT_TEXT" && (
                  <div className="pt-2">
                    <Textarea
                      rows={3}
                      placeholder="اكتب إجابتك هنا..."
                      value={currentAns?.textAnswer || ""}
                      onChange={(e) => handleTextAnswerChange(q.id, e.target.value)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom submit button */}
      {questions.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl">
          <p className="text-sm font-medium text-slate-300">
            أجبت على <strong className="text-indigo-400">{answeredCount}</strong> من أصل{" "}
            <strong>{questions.length}</strong> سؤال
          </p>
          <Button onClick={() => setIsConfirmOpen(true)} className="flex items-center gap-2">
            <Send size={16} />
            تسليم الاختبار
          </Button>
        </div>
      )}

      {/* Confirm Submission Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleSubmitExam}
        loading={isSubmitting}
        title="تأكيد تسليم الاختبار"
        message={
          answeredCount < questions.length
            ? `لقد أجبت على ${answeredCount} فقط من أصل ${questions.length} أسئلة. هل أنت متأكد من رغبتك في تسليم الاختبار الآن؟`
            : "هل أنت متأكد من تسليم إجاباتك؟ لا يمكن تعديل الإجابات بعد التسليم."
        }
        confirmText="نعم، قم بالتسليم"
        cancelText="مراجعة الإجابات"
        variant="primary"
      />
    </div>
  );
}
