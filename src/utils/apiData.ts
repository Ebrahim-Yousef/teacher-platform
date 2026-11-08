/**
 * Normalizes API list payloads: supports flat array or nested common keys.
 */
export function asList<T = unknown>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (!data || typeof data !== "object") return [];

  const record = data as Record<string, unknown>;

  const keys = [
    "items",
    "rows",
    "teachers",
    "subscriptions",
    "groups",
    "sessions",
    "assessments",
    "fees",
    "records",
    "events",
    "notifications",
  ];

  for (const key of keys) {
    if (Array.isArray(record[key])) {
      return record[key] as T[];
    }
  }

  return [];
}

/**
 * Picks a display label from a row item based on fallback keys.
 */
export function pickLabel(
  row: Record<string, unknown> | null | undefined,
  keys: string[] = ["name", "title", "username"],
): string {
  if (!row || typeof row !== "object") return "—";
  for (const key of keys) {
    if (row[key]) return String(row[key]);
  }
  return row.id != null ? `#${row.id}` : "—";
}
