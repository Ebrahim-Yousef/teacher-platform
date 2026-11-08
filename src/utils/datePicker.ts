export interface ParsedMonth {
  year: number;
  monthIndex: number;
}

export interface Time12HourParts {
  hour12: number;
  minutes: number;
  period: "AM" | "PM";
}

/** Parse YYYY-MM-DD as local date (avoids UTC shift) */
export function parseISODate(value?: string | null): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

/** Format Date → YYYY-MM-DD */
export function toISODate(date?: Date | null): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM → { year, monthIndex (0-11) } */
export function parseISOMonth(value?: string | null): ParsedMonth | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [y, m] = value.split("-").map(Number);
  if (m < 1 || m > 12) return null;
  return { year: y, monthIndex: m - 1 };
}

export function toISOMonth(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

/** Parse HH:mm */
export function parseHHMM(
  value?: string | null,
): { hours: number; minutes: number } | null {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [h, m] = value.split(":").map(Number);
  return { hours: h, minutes: m };
}

export function toHHMM(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Convert 24h hours → 12h parts. period is "AM" | "PM". */
export function to12HourParts(
  hours24: number,
  minutes: number = 0,
): Time12HourParts {
  const h = Number(hours24);
  const m = Number(minutes) || 0;
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minutes: m, period };
}

/** Convert 12h + period → 24h hours (0–23). */
export function from12Hour(
  hour12: number,
  minutes: number,
  period: "AM" | "PM",
): { hours: number; minutes: number } {
  let h = Number(hour12);
  const m = Number(minutes) || 0;
  if (h < 1 || h > 12) h = 12;
  if (period === "AM") {
    h = h === 12 ? 0 : h;
  } else {
    h = h === 12 ? 12 : h + 12;
  }
  return { hours: h, minutes: m };
}

export const PERIOD_LABELS = { AM: "ص", PM: "م" } as const;

/** Format HH:mm (24h) as 12h display, e.g. "4:00 م". */
export function formatTime12h(hhmm?: string | null): string {
  const parsed = parseHHMM(hhmm);
  if (!parsed) return hhmm || "—";
  const { hour12, minutes, period } = to12HourParts(
    parsed.hours,
    parsed.minutes,
  );
  return `${hour12}:${String(minutes).padStart(2, "0")} ${PERIOD_LABELS[period]}`;
}

export function emitChange(
  name?: string,
  value: string = "",
  onChange?: (e: { target: { name?: string; value: string } }) => void,
): void {
  onChange?.({
    target: { name, value },
  });
}
