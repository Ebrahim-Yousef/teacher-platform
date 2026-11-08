import { api, ApiError } from "./client";

export async function downloadExport(
  pathWithQuery: string,
  token?: string,
  fallbackName?: string,
): Promise<void> {
  const res = await api<Response>(pathWithQuery, { token, raw: true });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const errorMsg =
      typeof json.error === "string"
        ? json.error
        : (json.error as { message?: string })?.message || "فشل التحميل";
    throw new ApiError(res.status, errorMsg);
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") || "";
  const match = cd.match(/filename="?([^"]+)"?/);
  const name = match?.[1] || fallbackName || "export";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
