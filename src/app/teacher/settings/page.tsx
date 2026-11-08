"use client";

import React, { useEffect, useState } from "react";
import {
  Save,
  MessageSquareText,
  CheckCircle2,
  RotateCcw,
  BookMarked,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import Checkbox from "@/components/ui/Checkbox";
import FormError from "@/components/ui/FormError";
import {
  ColdStartNotice,
  ErrorBlock,
  LoadingBlock,
} from "@/components/ui/StateBlock";
import { useToast } from "@/hooks/useToast";
import {
  getWhatsAppTemplate,
  saveWhatsAppTemplate,
  getActiveSubjects,
  saveActiveSubjects,
} from "@/api/settings";
import {
  getTeacherSubjects,
  saveTeacherSubjects,
  SubjectItem,
} from "@/api/subjects";
import { getErrorMessage, mapApiError } from "@/api/errors";
import { DEFAULT_WHATSAPP_TEMPLATE } from "@/constants/app";
import { validateWhatsAppTemplate } from "@/utils/validations/formValidation";

const MAX_LEN = 1000;

export default function SettingsPage() {
  const { toast } = useToast();

  const [template, setTemplate] = useState("");
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [activeIds, setActiveIds] = useState<number[]>([]);
  const [savedActiveIds, setSavedActiveIds] = useState<number[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSlow, setIsSlow] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isSavingSubjects, setIsSavingSubjects] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [subjectsSaved, setSubjectsSaved] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const slowTimer = window.setTimeout(() => {
      if (!cancelled) setIsSlow(true);
    }, 8000);

    const loadSettings = async () => {
      setIsLoading(true);
      setIsSlow(false);
      setError(null);
      try {
        const [tplRes, subjectsRes] = await Promise.all([
          getWhatsAppTemplate(),
          getTeacherSubjects().catch(() => getActiveSubjects()),
        ]);
        if (cancelled) return;

        const fetchedTpl =
          tplRes.data?.template || tplRes.template || DEFAULT_WHATSAPP_TEMPLATE;
        setTemplate(fetchedTpl);

        const resData = subjectsRes.data;
        let list: SubjectItem[] = [];
        let ids: (number | string)[] = [];

        if (Array.isArray(resData)) {
          list = resData;
          ids = list.filter((s) => s.isActive).map((s) => s.id);
        } else if (resData && typeof resData === "object") {
          const container = resData as {
            subjects?: SubjectItem[];
            activeSubjectIds?: (number | string)[];
          };
          list = container.subjects || [];
          ids =
            container.activeSubjectIds ||
            list.filter((s) => s.isActive).map((s) => s.id);
        }

        setSubjects(list);
        const numericIds = ids.map(Number);
        setActiveIds(numericIds);
        setSavedActiveIds(numericIds);
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

    loadSettings();

    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
    };
  }, [reloadKey]);

  const toggleSubject = (id: number) => {
    setActiveIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setSubjectsSaved(false);
    setSubjectsError(null);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateWhatsAppTemplate(template);
    if (!check.isValid) {
      setFieldError(check.message || "الرسالة غير صالحة");
      return;
    }

    setIsSavingTemplate(true);
    setFieldError(null);
    try {
      const res = await saveWhatsAppTemplate(template.trim());
      setTemplate(res.data?.template || template.trim());
      setSavedSuccess(true);
      toast.success("تم حفظ قالب الواتساب");
      window.setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: unknown) {
      const mapped = mapApiError(err);
      setFieldError(
        mapped.fieldErrors.template ||
          mapped.generalMessage ||
          getErrorMessage(err),
      );
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSaveSubjects = async () => {
    setIsSavingSubjects(true);
    setSubjectsError(null);
    try {
      try {
        await saveTeacherSubjects(activeIds);
      } catch {
        await saveActiveSubjects(activeIds);
      }
      setSavedActiveIds([...activeIds]);
      setSubjectsSaved(true);
      toast.success("تم حفظ المواد المفعّلة");
      window.setTimeout(() => setSubjectsSaved(false), 3000);
    } catch (err: unknown) {
      setSubjectsError(getErrorMessage(err));
      toast.error(getErrorMessage(err));
    } finally {
      setIsSavingSubjects(false);
    }
  };

  const subjectsDirty =
    JSON.stringify([...activeIds].sort()) !==
    JSON.stringify([...savedActiveIds].sort());

  if (isLoading) {
    return <LoadingBlock isSlow={isSlow} label="جاري تحميل الإعدادات..." />;
  }

  if (error) {
    return (
      <ErrorBlock
        message={getErrorMessage(error)}
        onRetry={() => setReloadKey((k) => k + 1)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade dir-rtl" dir="rtl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
          الإعدادات
        </h1>
        <p className="mt-1 text-xs font-medium text-slate-400 sm:text-sm">
          قالب واتساب والمواد النشطة المستخدمة في المجموعات والحصص.
        </p>
      </div>

      {isSlow && <ColdStartNotice />}

      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl">
        <div className="border-b border-slate-800 bg-slate-950/60 p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <BookMarked size={22} />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-100 sm:text-xl">
                المواد المفعّلة
              </h2>
              <p className="text-xs font-medium leading-relaxed text-slate-400 sm:text-sm">
                اختر المواد التي يمكن استخدامها عند إنشاء المجموعات والحصص.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-4 p-6 sm:p-7">
          <FormError message={subjectsError} />
          {subjects.length === 0 ? (
            <p className="text-sm text-slate-400">
              لا توجد مواد بعد. أضف موادًا من صفحة المواد أولاً.
            </p>
          ) : (
            <div className="space-y-2.5">
              {subjects.map((subject) => (
                <Checkbox
                  key={subject.id}
                  label={subject.name}
                  checked={activeIds.includes(Number(subject.id))}
                  onChange={() => toggleSubject(Number(subject.id))}
                />
              ))}
            </div>
          )}
          <div className="flex flex-col-reverse items-center justify-between gap-3 border-t border-slate-800 pt-4 sm:flex-row">
            <Button
              type="button"
              loading={isSavingSubjects}
              disabled={!subjectsDirty}
              onClick={handleSaveSubjects}
            >
              <Save size={18} />
              حفظ المواد المفعّلة
            </Button>
            {subjectsSaved && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-400">
                <CheckCircle2 size={16} />
                تم الحفظ
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl">
        <div className="border-b border-slate-800 bg-slate-950/60 p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <MessageSquareText size={22} />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-100 sm:text-xl">
                تخصيص رسالة الواتساب
              </h2>
              <p className="text-xs font-medium leading-relaxed text-slate-400 sm:text-sm">
                النص الافتراضي عند فتح واتساب مع ولي الأمر.
              </p>
            </div>
          </div>
        </div>
        <form onSubmit={handleSaveTemplate} className="space-y-6 p-6 sm:p-7">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-200">
                قالب الرسالة
              </span>
              {template !== DEFAULT_WHATSAPP_TEMPLATE && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTemplate(DEFAULT_WHATSAPP_TEMPLATE)}
                >
                  <RotateCcw size={13} />
                  استعادة الافتراضي
                </Button>
              )}
            </div>
            <Textarea
              name="template"
              rows={6}
              value={template}
              maxLength={MAX_LEN}
              error={fieldError || undefined}
              onChange={(e) => {
                setTemplate(e.target.value);
                setFieldError(null);
              }}
              placeholder="اكتب نص الرسالة هنا..."
            />
            <p className="text-left text-xs font-medium text-slate-500">
              {template.length}/{MAX_LEN}
            </p>
          </div>
          <div className="flex flex-col-reverse items-center justify-between gap-4 border-t border-slate-800 pt-5 sm:flex-row">
            <Button
              type="submit"
              loading={isSavingTemplate}
              className="w-full sm:w-auto"
            >
              <Save size={18} />
              حفظ التعديلات
            </Button>
            {savedSuccess && (
              <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-400 sm:w-auto">
                <CheckCircle2 size={16} />
                تم حفظ القالب بنجاح!
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
