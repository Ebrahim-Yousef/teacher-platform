"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, AlertTriangle } from "lucide-react";
import DateField from "@/components/ui/DateField";
import Badge from "@/components/ui/Badge";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
} from "@/components/ui/StateBlock";
import { getErrorMessage } from "@/api/errors";
import {
  getStudentCalendar,
  StudentCalendarEvent,
  StudentCalendarConflict,
} from "@/api/student";
import { asList, pickLabel } from "@/utils/apiData";
import { formatDate, todayISO } from "@/utils/format";
import { formatTime12h } from "@/utils/datePicker";

function monthRange(isoDay: string) {
  const d = isoDay ? new Date(`${isoDay}T12:00:00`) : new Date();
  const y = d.getFullYear();
  const m = d.getMonth();
  const from = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const last = new Date(y, m + 1, 0).getDate();
  const to = `${y}-${String(m + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

export default function StudentCalendarPage() {
  const [anchor, setAnchor] = useState(todayISO());
  const range = useMemo(() => monthRange(anchor), [anchor]);

  const [events, setEvents] = useState<StudentCalendarEvent[]>([]);
  const [conflicts, setConflicts] = useState<StudentCalendarConflict[]>([]);
  const [hasConflict, setHasConflict] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSlow, setIsSlow] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const slowTimer = window.setTimeout(() => {
      if (!cancelled) setIsSlow(true);
    }, 8000);

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await getStudentCalendar(range);
        if (cancelled) return;
        const payload = res.data;
        const loadedEvents = asList(
          payload?.events || payload?.items || payload?.sessions || payload,
        ) as StudentCalendarEvent[];
        const loadedConflicts = asList(
          payload?.conflicts || [],
        ) as StudentCalendarConflict[];

        setEvents(loadedEvents);
        setConflicts(loadedConflicts);
        setHasConflict(
          Boolean(payload?.hasConflict) || loadedConflicts.length > 0,
        );
      } catch (err: unknown) {
        if (!cancelled) setError(err);
      } finally {
        window.clearTimeout(slowTimer);
        if (!cancelled) {
          setIsLoading(false);
          setIsSlow(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
    };
  }, [range, reloadKey]);

  return (
    <div className="space-y-6 animate-fade dir-rtl" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">
            التقويم
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            الحصص والتقييمات الموحدة — من {range.from} إلى {range.to}
          </p>
        </div>
        <div className="w-full max-w-xs">
          <DateField
            label="يوم داخل الشهر"
            value={anchor}
            onChange={(e) => setAnchor(e.target.value)}
          />
        </div>
      </div>

      {hasConflict ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-300">
          <AlertTriangle className="mt-0.5 shrink-0" size={20} />
          <div>
            <p className="text-sm font-bold">يوجد تعارض في المواعيد</p>
            {conflicts.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pr-5 text-xs font-medium">
                {conflicts.map((c, i) => (
                  <li key={i}>
                    {typeof c === "string"
                      ? c
                      : c.message ||
                        `${formatDate(c.date || c.from)} — ${pickLabel(c as unknown as Record<string, unknown>)}`}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs">
                راجع الأحداث المميزة بالتعارض أدناه.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <LoadingBlock isSlow={isSlow} />
      ) : error ? (
        <ErrorBlock
          message={getErrorMessage(error)}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      ) : events.length === 0 ? (
        <EmptyBlock
          icon={CalendarDays}
          title="لا أحداث في هذا الشهر"
          description="جرّب شهرًا آخر."
        />
      ) : (
        <div className="space-y-3">
          {events.map((ev, i) => {
            const conflicted = Boolean(
              ev.hasConflict || ev.conflict || ev.isConflict,
            );
            const evRecord = ev as unknown as Record<string, unknown>;

            return (
              <div
                key={String(ev.id ?? i)}
                className={`rounded-2xl border bg-slate-900 p-4 shadow-xl transition-colors ${
                  conflicted
                    ? "border-amber-500/50 ring-1 ring-amber-500/30"
                    : "border-slate-800"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-slate-100">
                    {pickLabel(evRecord, ["title", "name", "type"])}
                  </p>
                  <Badge tone={ev.type === "ASSESSMENT" ? "info" : "primary"}>
                    {ev.type === "ASSESSMENT" || ev.kind === "assessment"
                      ? "تقييم"
                      : "حصة"}
                  </Badge>
                  {conflicted ? <Badge tone="warning">تعارض</Badge> : null}
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {formatDate(ev.date || ev.startDate || ev.from)}
                  {ev.startTime
                    ? ` · ${formatTime12h(ev.startTime)}`
                    : ev.start
                      ? ` · ${ev.start}`
                      : ""}
                  {ev.endTime ? ` — ${formatTime12h(ev.endTime)}` : ""}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {ev.teacher?.name || ev.teacherName || ""}
                  {ev.group?.name || ev.groupName
                    ? ` · ${ev.group?.name || ev.groupName}`
                    : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
