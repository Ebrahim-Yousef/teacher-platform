// توحيد الـ API Base URL ليكون متوافقاً مع App Router المباشر
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export interface ApiErrorDetail {
  field?: string;
  message?: string;
  [key: string]: unknown;
}

export interface ApiErrorResponse {
  code?: string;
  message?: string;
  details?: ApiErrorDetail[];
  [key: string]: unknown;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details: ApiErrorDetail[];

  constructor(status: number, error?: ApiErrorResponse | string) {
    const message =
      typeof error === "string" ? error : error?.message || "حدث خطأ في النظام";
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = typeof error === "object" ? error?.code : undefined;
    this.details = typeof error === "object" ? error?.details || [] : [];
  }
}

export interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
  skipAuth?: boolean;
  raw?: boolean;
}

export async function api<T = unknown>(
  path: string,
  { method = "GET", body, token, raw = false }: ApiOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};

  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    const fullPath = path.startsWith("/") ? path : `/${path}`;
    res = await fetch(`${API_URL}${fullPath}`, {
      method,
      headers,
      credentials: "same-origin", // يضمن نقل الهيدرز والـ Cookies تلقائياً
      body:
        body !== undefined && !(body instanceof FormData)
          ? JSON.stringify(body)
          : (body as BodyInit | null),
    });
  } catch {
    throw new ApiError(0, {
      code: "NETWORK_ERROR",
      message: "تعذر الاتصال بالخادم. تحقق من الاتصال وحاول مرة أخرى.",
    });
  }

  if (raw) return res as unknown as T;

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    // دعم كافة أشكال مخرجات الأخطاء من السيرفر
    const errorObj = json.error as ApiErrorResponse | string | undefined;
    const errorMessage =
      typeof errorObj === "object"
        ? errorObj?.message
        : typeof errorObj === "string"
          ? errorObj
          : (json.message as string) || "حدث خطأ غير متوقع";

    throw new ApiError(res.status, {
      message: typeof errorMessage === "string" ? errorMessage : "حدث خطأ",
      code: json.code as string | undefined,
      details: json.details as ApiErrorDetail[] | undefined,
    });
  }

  return json as T;
}

export function buildQuery(params: Record<string, unknown> = {}): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
