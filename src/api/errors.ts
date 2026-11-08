import { ApiError } from "./client";

export interface MappedApiError {
  fieldErrors: Record<string, string>;
  generalMessage: string | null;
}

export function mapApiError(error: unknown): MappedApiError {
  if (!(error instanceof ApiError)) {
    return {
      fieldErrors: {},
      generalMessage: (error as Error)?.message || "حدث خطأ غير متوقع",
    };
  }

  const fieldErrors: Record<string, string> = {};
  if (Array.isArray(error.details)) {
    error.details.forEach((detail) => {
      if (detail?.field && detail?.message) {
        fieldErrors[detail.field] = detail.message;
      }
    });
  }

  const hasFields = Object.keys(fieldErrors).length > 0;
  return {
    fieldErrors,
    generalMessage: hasFields ? null : error.message || "حدث خطأ",
  };
}

export function getErrorMessage(error: unknown, fallback = "حدث خطأ"): string {
  if (!error) return fallback;
  if (error instanceof ApiError) return error.message || fallback;
  return (error as Error).message || fallback;
}

export function isSubscriptionForbidden(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 403) return false;
  const message = error.message || "";
  return message.includes("اشتراك");
}
