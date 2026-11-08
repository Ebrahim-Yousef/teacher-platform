"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, ArrowRight, Send } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Checkbox from "@/components/ui/Checkbox";
import FormError from "@/components/ui/FormError";
import { LoadingBlock } from "@/components/ui/StateBlock";
import { useToast } from "@/hooks/useToast";
import {
  getQuestions,
  putQuestions,
  publishAssessment,
  AssessmentItem,
} from "@/api/assessments";
import { getErrorMessage, mapApiError } from "@/api/errors";
import { QUESTION_TYPES } from "@/constants/app";
import { validateOnlineQuestions } from "@/utils/validations/formValidation";
import { asList } from "@/utils/apiData";

interface OnlineQuestionBuilderProps {
  assessment: AssessmentItem;
  onBack: () => void;
  onPublished?: () => void;
}

export interface OptionItem {
  text: string;
  isCorrect: boolean;
}

export interface QuestionBuilderState {
  type: string;
  prompt: string;
  points: string;
  isMandatory: boolean;
  options?: OptionItem[];
  correctBoolean?: boolean;
  minLength?: string;
  maxLength?: string;
}

const emptyQuestion = (type = "MCQ"): QuestionBuilderState => {
  const base = {
    prompt: "",
    points: "5",
    isMandatory: true,
  };
  if (type === "TRUE_FALSE") {
    return { ...base, type: "TRUE_FALSE", correctBoolean: true };
  }
  if (type === "SHORT_TEXT") {
    return { ...base, type: "SHORT_TEXT", minLength: "", maxLength: "" };
  }
  return {
    ...base,
    type: "MCQ",
    options: [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
    ],
  };
};

const toApiQuestions = (questions: QuestionBuilderState[]) =>
  questions.map((q) => {
    const base = {
      type: q.type,
      prompt: q.prompt.trim(),
      points: Number(q.points),
      isMandatory: q.isMandatory !== false,
    };
    if (q.type === "MCQ") {
      return {
        ...base,
        options: (q.options || []).map((o) => ({
          text: String(o.text || "").trim(),
          isCorrect: Boolean(o.isCorrect),
        })),
      };
    }
    if (q.type === "TRUE_FALSE") {
      return { ...base, correctBoolean: Boolean(q.correctBoolean) };
    }
    const body: Record<string, unknown> = { ...base };
    if (q.minLength !== "" && q.minLength != null) {
      body.minLength = Number(q.minLength);
    }
    if (q.maxLength !== "" && q.maxLength != null) {
      body.maxLength = Number(q.maxLength);
    }
    return body;
  });

const normalizeLoaded = (raw: unknown): QuestionBuilderState[] => {
  const rawObj = raw as { questions?: unknown };
  const list = asList(rawObj?.questions || raw);
  return list.map((qItem) => {
    const q = qItem as Record<string, unknown>;
    const shared = {
      prompt: String(q.prompt || ""),
      points: String(q.points ?? 5),
      isMandatory: q.isMandatory !== false,
    };
    if (q.type === "MCQ") {
      const opts = (q.options as Array<Record<string, unknown>>) || [];
      return {
        ...shared,
        type: "MCQ",
        options: opts.map((o) => ({
          text: String(o.text || ""),
          isCorrect: Boolean(o.isCorrect),
        })),
      };
    }
    if (q.type === "TRUE_FALSE") {
      return {
        ...shared,
        type: "TRUE_FALSE",
        correctBoolean: Boolean(q.correctBoolean),
      };
    }
    return {
      ...shared,
      type: "SHORT_TEXT",
      minLength: q.minLength != null ? String(q.minLength) : "",
      maxLength: q.maxLength != null ? String(q.maxLength) : "",
    };
  });
};

export default function OnlineQuestionBuilder({
  assessment,
  onBack,
  onPublished,
}: OnlineQuestionBuilderProps) {
  const { toast } = useToast();

  const [questions, setQuestions] = useState<QuestionBuilderState[]>([
    emptyQuestion("MCQ"),
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchQ = async () => {
      setIsLoading(true);
      try {
        const res = await getQuestions(assessment.id);
        if (cancelled) return;
        const loaded = normalizeLoaded(res.data);
        setQuestions(loaded.length ? loaded : [emptyQuestion("MCQ")]);
      } catch {
        if (!cancelled) setQuestions([emptyQuestion("MCQ")]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchQ();
    return () => {
      cancelled = true;
    };
  }, [assessment.id]);

  const updateQuestion = (
    index: number,
    patch: Partial<QuestionBuilderState>,
  ) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
    setErrors({});
  };

  const changeType = (index: number, type: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index
          ? {
              ...emptyQuestion(type),
              prompt: q.prompt,
              points: q.points,
              isMandatory: q.isMandatory !== false,
            }
          : q,
      ),
    );
    setErrors({});
  };

  const addOption = (qIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              options: [...(q.options || []), { text: "", isCorrect: false }],
            }
          : q,
      ),
    );
  };

  const setCorrectOption = (qIndex: number, optIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              options: (q.options || []).map((o, oi) => ({
                ...o,
                isCorrect: oi === optIndex,
              })),
            }
          : q,
      ),
    );
  };

  const saveQuestions = async () => {
    const result = validateOnlineQuestions(questions);
    setErrors(result.errors);
    setGeneralError(result.message || null);
    if (!result.isValid) return false;

    setIsSaving(true);
    setGeneralError(null);
    try {
      await putQuestions(assessment.id, toApiQuestions(questions));
      toast.success("تم حفظ الأسئلة");
      return true;
    } catch (err: unknown) {
      const mapped = mapApiError(err);
      setGeneralError(mapped.generalMessage || getErrorMessage(err));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    const saved = await saveQuestions();
    if (!saved) return;
    setIsPublishing(true);
    try {
      await publishAssessment(assessment.id);
      toast.success("تم نشر الاختبار للطلاب");
      onPublished?.();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) return <LoadingBlock />;

  return (
    <div className="space-y-6 animate-fade dir-rtl" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowRight size={16} />
            العودة
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-100">بناء الأسئلة</h1>
            <p className="text-sm text-slate-400">
              {assessment.title}
              {assessment.isPublished ? " · منشور" : " · مسودة"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            loading={isSaving}
            onClick={saveQuestions}
          >
            حفظ الأسئلة
          </Button>
          <Button
            type="button"
            loading={isPublishing}
            onClick={handlePublish}
            disabled={assessment.isPublished}
          >
            <Send size={16} />
            {assessment.isPublished ? "منشور" : "نشر للطلاب"}
          </Button>
        </div>
      </div>

      <FormError message={generalError} />

      <div className="space-y-4">
        {questions.map((q, index) => (
          <div
            key={index}
            className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-200">
                سؤال {index + 1}
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                disabled={questions.length <= 1}
                onClick={() =>
                  setQuestions((prev) => prev.filter((_, i) => i !== index))
                }
              >
                <Trash2 size={14} />
                حذف
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="النوع"
                value={q.type}
                options={QUESTION_TYPES}
                onChange={(e) => changeType(index, e.target.value)}
              />
              <Input
                label="الدرجة"
                type="number"
                min="1"
                step="1"
                value={q.points}
                error={errors[`q${index}.points`]}
                onChange={(e) =>
                  updateQuestion(index, { points: e.target.value })
                }
              />
            </div>

            <Textarea
              label="نص السؤال"
              value={q.prompt}
              rows={2}
              error={errors[`q${index}.prompt`]}
              onChange={(e) =>
                updateQuestion(index, { prompt: e.target.value })
              }
            />

            <Checkbox
              label="سؤال إجباري"
              description="إذا ألغيت التحديد، يمكن للطالب تخطي هذا السؤال"
              checked={q.isMandatory !== false}
              onChange={(e) =>
                updateQuestion(index, { isMandatory: e.target.checked })
              }
            />

            {q.type === "MCQ" && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400">
                  الخيارات (اختر الإجابة الصحيحة)
                </p>
                {errors[`q${index}.options`] || errors[`q${index}.correct`] ? (
                  <FormError
                    message={
                      errors[`q${index}.options`] || errors[`q${index}.correct`]
                    }
                  />
                ) : null}
                {(q.options || []).map((opt, oi) => (
                  <div key={oi} className="flex items-start gap-2">
                    <Checkbox
                      label="صحيحة"
                      checked={Boolean(opt.isCorrect)}
                      onChange={() => setCorrectOption(index, oi)}
                      className="shrink-0"
                    />
                    <Input
                      value={opt.text}
                      placeholder={`خيار ${oi + 1}`}
                      error={errors[`q${index}.opt${oi}`]}
                      onChange={(e) => {
                        const next = [...(q.options || [])];
                        next[oi] = { ...next[oi], text: e.target.value };
                        updateQuestion(index, { options: next });
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={(q.options || []).length <= 2}
                      onClick={() => {
                        const next = (q.options || []).filter(
                          (_, i) => i !== oi,
                        );
                        if (!next.some((o) => o.isCorrect) && next[0]) {
                          next[0] = { ...next[0], isCorrect: true };
                        }
                        updateQuestion(index, { options: next });
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addOption(index)}
                >
                  <Plus size={14} />
                  خيار
                </Button>
              </div>
            )}

            {q.type === "TRUE_FALSE" && (
              <Select
                label="الإجابة الصحيحة"
                value={q.correctBoolean ? "true" : "false"}
                error={errors[`q${index}.correctBoolean`]}
                options={[
                  { value: "true", label: "صح" },
                  { value: "false", label: "خطأ" },
                ]}
                onChange={(e) =>
                  updateQuestion(index, {
                    correctBoolean: e.target.value === "true",
                  })
                }
              />
            )}

            {q.type === "SHORT_TEXT" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  يُصحَّح يدويًا بعد تسليم الطلاب (الدرجة التلقائية 0).
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="الحد الأدنى للأحرف (اختياري)"
                    type="number"
                    min="1"
                    max="5000"
                    value={q.minLength ?? ""}
                    error={errors[`q${index}.minLength`]}
                    onChange={(e) =>
                      updateQuestion(index, { minLength: e.target.value })
                    }
                  />
                  <Input
                    label="الحد الأقصى للأحرف (اختياري)"
                    type="number"
                    min="1"
                    max="5000"
                    value={q.maxLength ?? ""}
                    error={errors[`q${index}.maxLength`]}
                    onChange={(e) =>
                      updateQuestion(index, { maxLength: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => setQuestions((prev) => [...prev, emptyQuestion("MCQ")])}
      >
        <Plus size={16} />
        إضافة سؤال
      </Button>
    </div>
  );
}
