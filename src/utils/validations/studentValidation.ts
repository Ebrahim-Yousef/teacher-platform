import { ValidationResult } from "./formValidation";

export const validateStudentName = (name?: string): ValidationResult => {
  const value = name?.trim() || "";
  if (!value) {
    return {
      isValid: false,
      message: "اسم الطالب مطلوب",
      errors: { name: "اسم الطالب مطلوب" },
    };
  }
  if (value.length < 3) {
    return {
      isValid: false,
      message: "اسم الطالب يجب أن يكون 3 أحرف على الأقل",
      errors: { name: "اسم الطالب يجب أن يكون 3 أحرف على الأقل" },
    };
  }
  if (value.length > 60) {
    return {
      isValid: false,
      message: "اسم الطالب يجب ألا يتجاوز 60 حرفًا",
      errors: { name: "اسم الطالب يجب ألا يتجاوز 60 حرفًا" },
    };
  }

  const nameRegex =
    /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z\s]+$/;
  if (!nameRegex.test(value)) {
    return {
      isValid: false,
      message: "اسم الطالب يحتوي على رموز غير مسموح بها",
      errors: { name: "اسم الطالب يحتوي على رموز غير مسموح بها" },
    };
  }

  return { isValid: true, message: "", errors: {} };
};

/** Accepts 01xxxxxxxxx, 20xxxxxxxxx, or +20xxxxxxxxx */
export const validateEgyptianPhone = (phone?: string): ValidationResult => {
  if (!phone) {
    return {
      isValid: false,
      message: "رقم الهاتف مطلوب",
      errors: { phone: "رقم الهاتف مطلوب" },
    };
  }
  const digits = String(phone).replace(/\D/g, "");
  const isValid =
    /^01(0|1|2|5)\d{8}$/.test(digits) || /^201(0|1|2|5)\d{8}$/.test(digits);

  if (!isValid) {
    return {
      isValid: false,
      message: "رقم الهاتف المصري غير صحيح",
      errors: { phone: "رقم الهاتف المصري غير صحيح" },
    };
  }

  return { isValid: true, message: "", errors: {} };
};

export const cleanPhoneNumber = (phone?: string): string => {
  if (!phone) return "";
  let cleaned = String(phone).replace(/\D/g, "");

  if (cleaned.startsWith("20") && cleaned.length === 12) {
    cleaned = "0" + cleaned.slice(2);
  } else if (!cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "0" + cleaned;
  }
  return cleaned;
};

export const formatPhoneForInput = (phone?: string): string => {
  if (!phone) return "";
  return cleanPhoneNumber(phone);
};
