export const TOKEN_KEY = "td_token";
export const USER_KEY = "td_user";
export const SUBSCRIPTION_LOCK_KEY = "td_sub_locked";

export const LEGACY_KEYS = ["user", "students", "whatsapp_template"];

export const PAGE_SIZES: number[] = [5, 10, 20, 50];

export const ATTENDANCE_STATUS = [
  { value: "PRESENT", label: "حاضر" },
  { value: "ABSENT", label: "غائب" },
  { value: "LATE", label: "متأخر" },
] as const;

export const ASSESSMENT_TYPES = [
  { value: "QUIZ", label: "اختبار قصير" },
  { value: "EXAM", label: "امتحان" },
  { value: "ASSIGNMENT", label: "واجب" },
  { value: "OTHER", label: "أخرى" },
] as const;

export const DELIVERY_MODES = [
  { value: "MANUAL", label: "رصد يدوي" },
  { value: "ONLINE", label: "إلكتروني" },
] as const;

export const QUESTION_TYPES = [
  { value: "MCQ", label: "اختيار من متعدد" },
  { value: "TRUE_FALSE", label: "صح / خطأ" },
  { value: "SHORT_TEXT", label: "إجابة قصيرة" },
] as const;

export const STUDENT_ASSESSMENT_KIND = [
  { value: "online", label: "إلكتروني" },
  { value: "manual", label: "يدوي" },
] as const;

export const STUDENT_ASSESSMENT_STATUS = [
  { value: "upcoming", label: "قريبًا" },
  { value: "available", label: "متاح" },
  { value: "submitted", label: "مُسلَّم" },
  { value: "closed", label: "مغلق" },
] as const;

export const FEE_STATUS = [
  { value: "UNPAID", label: "غير مدفوع" },
  { value: "PARTIAL", label: "مدفوع جزئيًا" },
  { value: "PAID", label: "مدفوع" },
] as const;

export const BILLING_WINDOW_STATUS = [
  { value: "UNPAID", label: "لم يُدفع (داخل المهلة)" },
  { value: "WITHIN_WINDOW", label: "دفع خلال أول 5 أيام" },
  { value: "AFTER_WINDOW", label: "دفع بعد أول 5 أيام" },
  { value: "OVERDUE", label: "متأخر — لم يُدفع بعد المهلة" },
] as const;

export const NOTIFICATION_TYPES = [
  { value: "ASSESSMENT_PUBLISHED", label: "نشر اختبار" },
  { value: "GRADE_RELEASED", label: "درجة جديدة" },
  { value: "ATTENDANCE_MARKED", label: "حضور" },
  { value: "EXAM_SUBMITTED", label: "تسليم اختبار" },
  { value: "FEE_OVERDUE", label: "رسوم متأخرة" },
  { value: "SUBSCRIPTION_EXPIRING", label: "اشتراك ينتهي قريباً" },
  { value: "SUBSCRIPTION_STATUS", label: "حالة الاشتراك" },
  { value: "SYSTEM", label: "نظام" },
] as const;

/** dayOfWeek: 0 Sunday … 6 Saturday (API) */
export const WEEKDAYS = [
  { value: 0, label: "الأحد" },
  { value: 1, label: "الإثنين" },
  { value: 2, label: "الثلاثاء" },
  { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" },
  { value: 5, label: "الجمعة" },
  { value: 6, label: "السبت" },
] as const;

export const DEFAULT_WHATSAPP_TEMPLATE =
  "أهلاً بك، نود تذكيرك بموعد الحصة القادمة.";

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "مشرف المنصة",
  TEACHER: "معلم",
  ASSISTANT: "مساعد",
  STUDENT: "طالب",
};

export const PLATFORM_SUBSCRIPTION_STATUS = [
  { value: "ACTIVE", label: "فعّال" },
  { value: "UNPAID", label: "غير مدفوع" },
  { value: "EXPIRED", label: "منتهي" },
] as const;

/** Home path after login / wrong-role redirect */
export function getHomePath(role?: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/admin";
    case "STUDENT":
      return "/student";
    case "TEACHER":
    case "ASSISTANT":
      return "/teacher";
    default:
      return "/login";
  }
}

export const SUBSCRIPTION_LOCKABLE_ROLES = ["TEACHER", "ASSISTANT"];
