import { z } from "zod";

// 1. تعريف Zod Schema للتحقق اللحظي
export const loginSchema = z.object({
  username: z
    .string()
    .min(1, { message: "اسم المستخدم أو البريد الإلكتروني مطلوب" })
    .min(3, { message: "اسم المستخدم يجب أن يكون 3 أحرف على الأقل" })
    .max(30, { message: "اسم المستخدم يجب ألا يتجاوز 30 حرفًا" }),
  password: z
    .string()
    .min(1, { message: "كلمة المرور مطلوبة" })
    .min(6, { message: "كلمة المرور يجب أن لا تقل عن 6 أحرف" }),
});

export type LoginInput = z.infer<typeof loginSchema>;

// 2. دالة مساعدة متوافقة لمن يحتاجها (تستفيد من الـ Zod Schema لتوحيد المنطق)
export const validateLoginForm = (formData: {
  username?: string;
  password?: string;
}): Record<string, string> => {
  const result = loginSchema.safeParse({
    username: formData.username || "",
    password: formData.password || "",
  });

  if (result.success) return {};

  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const fieldName = issue.path[0] as string;
    errors[fieldName] = issue.message;
  });

  return errors;
};
