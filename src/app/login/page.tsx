"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Lock, User as UserIcon } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import { loginSchema } from "@/utils/validations/authValidation"; // المسار لديك لملف الـ validation
import { getErrorMessage } from "@/api/errors";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // التحقق الفوري أثناء الكتابة (Real-time Validation)
  const validateField = (field: string, value: string) => {
    const currentValues = {
      username: field === "username" ? value : username,
      password: field === "password" ? value : password,
    };

    const result = loginSchema.safeParse(currentValues);

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as string;
        errors[fieldName] = issue.message;
      });
      setFieldErrors((prev) => ({
        ...prev,
        [field]: errors[field] || "",
      }));
    } else {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUsername(val);
    if (serverError) setServerError(null);
    validateField("username", val);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (serverError) setServerError(null);
    validateField("password", val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const result = loginSchema.safeParse({ username, password });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as string;
        errors[fieldName] = issue.message;
      });
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const message = getErrorMessage(
        err,
        "بيانات الدخول غير صحيحة، تحقق من اسم المستخدم وكلمة المرور",
      );
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4 dir-rtl">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            منصة التعليم الذكية
          </h1>
          <p className="text-sm text-slate-400">
            أدخل بيانات حسابك للوصول إلى لوحة التحكم
          </p>
        </div>

        <FormError message={serverError} className="mb-6" />

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <Input
            label="اسم المستخدم أو البريد الإلكتروني"
            type="text"
            name="username"
            value={username}
            onChange={handleUsernameChange}
            placeholder="اسم المستخدم أو البريد"
            error={fieldErrors.username}
            icon={UserIcon}
            required
          />

          <Input
            label="كلمة المرور"
            type="password"
            name="password"
            value={password}
            onChange={handlePasswordChange}
            placeholder="••••••••"
            error={fieldErrors.password}
            icon={Lock}
            required
          />

          <Button
            type="submit"
            loading={isSubmitting}
            className="w-full justify-center shadow-lg shadow-indigo-600/20 py-3 text-sm font-medium mt-2"
          >
            تسجيل الدخول
          </Button>
        </form>
      </div>
    </div>
  );
}
