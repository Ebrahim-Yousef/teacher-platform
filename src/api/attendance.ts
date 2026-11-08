import { api, buildQuery } from "./client";

export interface AttendanceRecord {
  studentId: number | string;
  status: "PRESENT" | "ABSENT" | "LATE" | string;
  note?: string;
}

export interface AttendanceSession {
  id: number | string;
  groupId: number | string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
  subjectBranchId?: number | string;
  group?: { id?: number | string; name?: string };
  records?: AttendanceRecord[];
  members?: Array<{
    id?: number | string;
    studentId?: number | string;
    name?: string;
    parentPhone?: string;
  }>;
}

export interface AttendanceCalendarEvent {
  id?: number | string;
  title?: string;
  name?: string;
  type?: string;
  kind?: string;
  date?: string;
  startDate?: string;
  from?: string;
  startTime?: string;
  endTime?: string;
  group?: { name?: string };
  groupName?: string;
}

export function listSessions(params: Record<string, unknown> = {}) {
  return api<{
    data: AttendanceSession[];
    meta?: { page: number; limit: number; total: number; totalPages: number };
  }>(`/attendance/sessions${buildQuery(params)}`);
}

export function getAttendanceCalendar(params: Record<string, unknown> = {}) {
  return api<{ data: AttendanceCalendarEvent[] }>(
    `/attendance/calendar${buildQuery(params)}`,
  );
}

export function getSession(id: number | string) {
  return api<{ data: AttendanceSession }>(`/attendance/sessions/${id}`);
}

export function createSession(body: Record<string, unknown>) {
  return api<{ data: AttendanceSession }>("/attendance/sessions", {
    method: "POST",
    body,
  });
}

export function updateSession(
  id: number | string,
  body: Record<string, unknown>,
) {
  return api<{ data: AttendanceSession }>(`/attendance/sessions/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteSession(id: number | string) {
  return api<{ message: string }>(`/attendance/sessions/${id}`, {
    method: "DELETE",
  });
}

export function upsertRecords(id: number | string, records: unknown[]) {
  return api<{
    data?: {
      whatsappLinks?: Array<{
        studentId?: number;
        studentName?: string;
        parentPhone?: string;
        url?: string;
      }>;
    };
    whatsappLinks?: Array<{
      studentId?: number;
      studentName?: string;
      parentPhone?: string;
      url?: string;
    }>;
  }>(`/attendance/sessions/${id}/records`, {
    method: "PUT",
    body: { records },
  });
}

export function getStudentAttendance(
  studentId: number | string,
  params: Record<string, unknown> = {},
) {
  return api(`/attendance/students/${studentId}${buildQuery(params)}`);
}

export function getWhatsAppLink(body: Record<string, unknown>) {
  return api<{ data?: { url?: string } }>("/attendance/whatsapp-link", {
    method: "POST",
    body,
  });
}
