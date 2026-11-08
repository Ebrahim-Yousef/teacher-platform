export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  message?: string;
  [key: string]: unknown;
}

const buildResult = (errors: Record<string, string>): ValidationResult => ({
  isValid: Object.keys(errors).length === 0,
  errors,
  message: Object.values(errors)[0] || "",
});

export function validateSubjectForm(data: { name?: string }): ValidationResult {
  const errors: Record<string, string> = {};
  if (!data?.name || !data.name.trim()) errors.name = "اسم المادة مطلوب";
  return buildResult(errors);
}

export function validateBranchForm(data: { name?: string }): ValidationResult {
  const errors: Record<string, string> = {};
  if (!data?.name || !data.name.trim()) errors.name = "اسم الفرع مطلوب";
  return buildResult(errors);
}

export function validateAssistantForm(data: {
  name?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  if (!data?.name || !data.name.trim()) errors.name = "اسم المساعد مطلوب";
  return buildResult(errors);
}

export function validateAssessmentForm(data: {
  title?: string;
  type?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  if (!data?.title || !data.title.trim()) errors.title = "عنوان التقييم مطلوب";
  if (!data?.type) errors.type = "نوع التقييم مطلوب";
  return buildResult(errors);
}

export function validateOnlineQuestions(
  questions: unknown[],
): ValidationResult {
  const errors: Record<string, string> = {};
  if (!Array.isArray(questions) || questions.length === 0) {
    errors.questions = "يجب إضافة سؤال واحد على الأقل";
  }
  return buildResult(errors);
}

export function validateGroupForm(data: { name?: string }): ValidationResult {
  const errors: Record<string, string> = {};
  if (!data?.name || !data.name.trim()) errors.name = "اسم المجموعة مطلوب";
  return buildResult(errors);
}

export function validateSessionForm(data: {
  groupId?: unknown;
  date?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  if (!data?.groupId) errors.groupId = "اختيار المجموعة مطلوب";
  if (!data?.date) errors.date = "تاريخ الحصة مطلوب";
  return buildResult(errors);
}

export function validateFeeForm(data: {
  title?: string;
  studentId?: unknown;
}): ValidationResult {
  const errors: Record<string, string> = {};
  if (!data?.title && !data?.studentId) errors.fee = "بيانات الرسم غير مكتملة";
  return buildResult(errors);
}

export function validatePaymentForm(data: {
  amount?: number | string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  if (!data?.amount || Number(data.amount) <= 0) {
    errors.amount = "المبلغ يجب أن يكون أكبر من 0";
  }
  return buildResult(errors);
}

export function validateMonthlyFeeOverride(data: unknown): ValidationResult {
  const errors: Record<string, string> = {};
  const amount =
    typeof data === "object" && data !== null
      ? (data as { amount?: number }).amount
      : data;
  if (amount !== undefined && Number(amount) < 0) {
    errors.amount = "المبلغ لا يمكن أن يكون بالسالب";
  }
  return buildResult(errors);
}

export function validateWhatsAppTemplate(template: string): ValidationResult {
  const errors: Record<string, string> = {};
  if (!template || !template.trim()) {
    errors.template = "قالب الرسالة لا يمكن أن يكون فارغاً";
  }
  return buildResult(errors);
}

export function validateScore(score: number | string, maxScore = 100): boolean {
  if (score === "" || score === null || score === undefined) return false;
  const num = Number(score);
  return !isNaN(num) && num >= 0 && num <= maxScore;
}
