"use client";

import React, { useState } from "react";
import { Plus, Trash2, CalendarClock, Sparkles } from "lucide-react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select, { SelectOption } from "../ui/Select";
import Textarea from "../ui/Textarea";
import DateField from "../ui/DateField";
import TimeField from "../ui/TimeField";
import Modal from "../ui/Modal";
import FormError from "../ui/FormError";

export interface ScheduleSlot {
  dayOfWeek: number | string;
  startTime: string;
  endTime: string;
}

export interface GenerateSessionsForm {
  from: string;
  to: string;
  title: string;
  subjectBranchId: string;
  notes: string;
}

export interface GroupSchedulePanelProps {
  slots: ScheduleSlot[];
  onChangeSlots: (slots: ScheduleSlot[]) => void;
  onSave: (slots: ScheduleSlot[]) => Promise<void>;
  isSaving?: boolean;
  saveError?: string | null;
  onGenerate: (body: {
    from: string;
    to: string;
    title?: string;
    subjectBranchId?: number;
    notes?: string;
  }) => Promise<void>;
  isGenerating?: boolean;
  branchOptions?: SelectOption[];
}

const WEEKDAYS = [
  { value: "0", label: "الأحد" },
  { value: "1", label: "الإثنين" },
  { value: "2", label: "الثلاثاء" },
  { value: "3", label: "الأربعاء" },
  { value: "4", label: "الخميس" },
  { value: "5", label: "الجمعة" },
  { value: "6", label: "السبت" },
];

const emptySlot = (): ScheduleSlot => ({
  dayOfWeek: "0",
  startTime: "16:00",
  endTime: "18:00",
});

const weekdayLabel = (day: number | string): string =>
  WEEKDAYS.find((d) => d.value === String(day))?.label || String(day);

export const GroupSchedulePanel: React.FC<GroupSchedulePanelProps> = ({
  slots,
  onChangeSlots,
  onSave,
  isSaving = false,
  saveError,
  onGenerate,
  isGenerating = false,
  branchOptions = [],
}) => {
  const [slotErrors, setSlotErrors] = useState<Record<string, string>>({});
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [genForm, setGenForm] = useState<GenerateSessionsForm>({
    from: "",
    to: "",
    title: "",
    subjectBranchId: "",
    notes: "",
  });
  const [genErrors, setGenErrors] = useState<Record<string, string>>({});
  const [genGeneral, setGenGeneral] = useState<string | null>(null);

  const updateSlot = (
    index: number,
    field: keyof ScheduleSlot,
    value: string,
  ) => {
    const next = slots.map((s, i) =>
      i === index ? { ...s, [field]: value } : s,
    );
    onChangeSlots(next);
    setSlotErrors((prev) => {
      const cleaned = { ...prev };
      delete cleaned[`slot_${index}_${field}`];
      delete cleaned.general;
      return cleaned;
    });
  };

  const addSlot = () => {
    onChangeSlots([...slots, emptySlot()]);
  };

  const removeSlot = (index: number) => {
    onChangeSlots(slots.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const normalized = slots.map((s) => ({
      dayOfWeek: Number(s.dayOfWeek),
      startTime: s.startTime,
      endTime: s.endTime,
    }));

    await onSave(normalized);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenErrors({});
    setGenGeneral(null);

    const errors: Record<string, string> = {};
    if (!genForm.from) errors.from = "تاريخ البداية مطلوب";
    if (!genForm.to) errors.to = "تاريخ النهاية مطلوب";

    if (Object.keys(errors).length > 0) {
      setGenErrors(errors);
      return;
    }

    try {
      const body: {
        from: string;
        to: string;
        title?: string;
        subjectBranchId?: number;
        notes?: string;
      } = {
        from: genForm.from,
        to: genForm.to,
      };

      if (genForm.title.trim()) body.title = genForm.title.trim();
      if (genForm.subjectBranchId) {
        body.subjectBranchId = Number(genForm.subjectBranchId);
      }
      if (genForm.notes.trim()) body.notes = genForm.notes.trim();

      await onGenerate(body);
      setIsGenerateOpen(false);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setGenGeneral(errorObj?.message || "تعذر توليد الحصص");
    }
  };

  return (
    <div className="space-y-4 text-right dir-rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100">
            الجدول الأسبوعي
          </h2>
          <p className="text-sm text-slate-400">
            حدّد مواعيد المجموعة ثم ولّد الحصص لفترة زمنية محددة.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setGenForm({
                from: "",
                to: "",
                title: "",
                subjectBranchId: "",
                notes: "",
              });
              setGenErrors({});
              setGenGeneral(null);
              setIsGenerateOpen(true);
            }}
            disabled={!slots.length}
          >
            <Sparkles size={14} />
            توليد حصص
          </Button>
          <Button type="button" size="sm" onClick={addSlot}>
            <Plus size={14} />
            إضافة موعد
          </Button>
        </div>
      </div>

      <FormError message={saveError || slotErrors.general} />

      {slots.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 px-4 py-10 text-center">
          <CalendarClock className="mx-auto mb-2 text-slate-600" size={32} />
          <p className="text-sm font-medium text-slate-400">
            لا يوجد جدول محدد بعد. اضغط على إضافة موعد لإنشاء مواعيد أسبوعية.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {slots.map((slot, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl sm:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <Select
                label="اليوم"
                name={`day-${index}`}
                value={String(slot.dayOfWeek)}
                options={WEEKDAYS}
                error={slotErrors[`slot_${index}_dayOfWeek`]}
                onChange={(e) =>
                  updateSlot(index, "dayOfWeek", String(e.target.value))
                }
              />
              <TimeField
                label="من"
                name={`start-${index}`}
                value={slot.startTime}
                error={slotErrors[`slot_${index}_startTime`]}
                onChange={(e) => updateSlot(index, "startTime", e.target.value)}
              />
              <TimeField
                label="إلى"
                name={`end-${index}`}
                value={slot.endTime}
                error={slotErrors[`slot_${index}_endTime`]}
                onChange={(e) => updateSlot(index, "endTime", e.target.value)}
              />
              <div className="flex items-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  onClick={() => removeSlot(index)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
              <p className="sm:col-span-4 text-xs text-slate-400 border-t border-slate-800/80 pt-2 mt-1">
                {weekdayLabel(slot.dayOfWeek)} · من {slot.startTime} إلى{" "}
                {slot.endTime}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button type="button" loading={isSaving} onClick={handleSave}>
          حفظ الجدول
        </Button>
      </div>

      <Modal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        title="توليد حصص من الجدول"
      >
        <form onSubmit={handleGenerate} className="space-y-4">
          <FormError message={genGeneral} />
          <p className="text-sm text-slate-400 leading-relaxed">
            سيتم إنشاء حصة لكل موعد أسبوعي ضمن الفترة المحددة. المواعيد
            المتداخلة سيتم تخطيها تلقائياً.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <DateField
              label="من تاريخ"
              name="from"
              value={genForm.from}
              required
              error={genErrors.from}
              onChange={(e) =>
                setGenForm((f) => ({ ...f, from: e.target.value }))
              }
            />
            <DateField
              label="إلى تاريخ"
              name="to"
              value={genForm.to}
              required
              error={genErrors.to}
              onChange={(e) =>
                setGenForm((f) => ({ ...f, to: e.target.value }))
              }
            />
          </div>
          <Input
            label="عنوان الحصة (اختياري)"
            name="title"
            value={genForm.title}
            error={genErrors.title}
            onChange={(e) =>
              setGenForm((f) => ({ ...f, title: e.target.value }))
            }
            placeholder="يُطبق على جميع الحصص المولدة"
          />
          {branchOptions.length > 0 && (
            <Select
              label="فرع المادة (اختياري)"
              name="subjectBranchId"
              value={genForm.subjectBranchId}
              options={branchOptions}
              onChange={(e) =>
                setGenForm((f) => ({
                  ...f,
                  subjectBranchId: String(e.target.value),
                }))
              }
            />
          )}
          <Textarea
            label="ملاحظات"
            name="notes"
            value={genForm.notes}
            rows={2}
            onChange={(e) =>
              setGenForm((f) => ({ ...f, notes: e.target.value }))
            }
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsGenerateOpen(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" loading={isGenerating}>
              توليد الحصص
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default GroupSchedulePanel;
