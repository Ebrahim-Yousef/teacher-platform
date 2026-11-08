"use client";

import React, { useState } from "react";
import Input from "../ui/Input";
import PhoneInput from "../ui/PhoneInput";
import Select, { SelectOption } from "../ui/Select";
import Button from "../ui/Button";
import FormError from "../ui/FormError";

export interface StudentFormData {
  id?: string;
  name: string;
  studentPhone: string;
  parentPhone: string;
  stage: string;
  grade: string;
}

export interface StudentFormProps {
  student?: StudentFormData | null;
  stagesOptions: SelectOption[];
  getGradesForStage: (stage: string) => SelectOption[];
  onSubmit: (data: StudentFormData) => Promise<void>;
  onCancel: () => void;
}

export const StudentForm: React.FC<StudentFormProps> = ({
  student,
  stagesOptions,
  getGradesForStage,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<StudentFormData>({
    id: student?.id,
    name: student?.name || "",
    studentPhone: student?.studentPhone || "",
    parentPhone: student?.parentPhone || "",
    stage: student?.stage || "",
    grade: student?.grade || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "stage") {
      setFormData((prev) => ({ ...prev, stage: value, grade: "" }));
      setErrors((prev) => ({ ...prev, stage: "", grade: "" }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setGeneralError(null);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "اسم الطالب مطلوب";
    if (!formData.studentPhone)
      newErrors.studentPhone = "رقم هاتف الطالب مطلوب";
    if (!formData.parentPhone)
      newErrors.parentPhone = "رقم هاتف ولي الأمر مطلوب";
    if (!formData.stage) newErrors.stage = "المرحلة الدراسية مطلوبة";
    if (!formData.grade) newErrors.grade = "الصف الدراسي مطلوب";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSaving(true);
      setGeneralError(null);
      await onSubmit(formData);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setGeneralError(errorObj?.message || "حدث خطأ أثناء حفظ بيانات الطالب");
    } finally {
      setIsSaving(false);
    }
  };

  const availableGrades = formData.stage
    ? getGradesForStage(formData.stage)
    : [];

  return (
    <form dir="rtl" onSubmit={handleSubmit} className="space-y-4 text-right">
      <FormError message={generalError} />

      <Input
        label="اسم الطالب ثلاثي أو رباعي"
        name="name"
        value={formData.name}
        onChange={handleChange}
        onClear={() => setFormData((prev) => ({ ...prev, name: "" }))}
        error={errors.name}
        placeholder="أدخل اسم الطالب..."
        required
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PhoneInput
          label="رقم هاتف الطالب"
          value={formData.studentPhone}
          onChange={(val) => {
            setFormData((prev) => ({ ...prev, studentPhone: val }));
            setErrors((prev) => ({ ...prev, studentPhone: "" }));
          }}
          onClear={() => setFormData((prev) => ({ ...prev, studentPhone: "" }))}
          error={errors.studentPhone}
          required
        />

        <PhoneInput
          label="رقم هاتف ولي الأمر"
          value={formData.parentPhone}
          onChange={(val) => {
            setFormData((prev) => ({ ...prev, parentPhone: val }));
            setErrors((prev) => ({ ...prev, parentPhone: "" }));
          }}
          onClear={() => setFormData((prev) => ({ ...prev, parentPhone: "" }))}
          error={errors.parentPhone}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="المرحلة الدراسية"
          name="stage"
          value={formData.stage}
          onChange={(e) => {
            const val = String(e.target.value);
            setFormData((prev) => ({ ...prev, stage: val, grade: "" }));
            setErrors((prev) => ({ ...prev, stage: "", grade: "" }));
          }}
          options={stagesOptions}
          error={errors.stage}
          placeholder="اختر المرحلة..."
          required
        />

        <Select
          label="الصف الدراسي"
          name="grade"
          value={formData.grade}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, grade: String(e.target.value) }));
            setErrors((prev) => ({ ...prev, grade: "" }));
          }}
          options={availableGrades}
          error={errors.grade}
          required
          disabled={!formData.stage}
          placeholder="اختر الصف..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          إلغاء
        </Button>
        <Button type="submit" variant="primary" loading={isSaving}>
          {student ? "تحديث البيانات" : "حفظ الطالب"}
        </Button>
      </div>
    </form>
  );
};

export default StudentForm;
