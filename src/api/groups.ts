import { api, buildQuery } from "./client";

export interface GroupItem {
  id: string | number;
  name: string;
  stage?: string;
  grade?: string;
  subjectId?: string | number;
  subjectName?: string;
  subject?: { name?: string };
  defaultMonthlyFee?: number;
  isActive?: boolean;
  members?: GroupMemberItem[];
  students?: GroupMemberItem[];
  scheduleSlots?: GroupScheduleSlot[];
  schedule?: GroupScheduleSlot[];
}

export interface GroupMemberItem {
  id?: string | number;
  studentId?: string | number;
  name?: string;
  studentName?: string;
  monthlyFeeOverride?: number | null;
  effectiveMonthlyFee?: number;
  hasCustomPrice?: boolean;
}

export interface GroupScheduleSlot {
  dayOfWeek: number | string;
  startTime: string;
  endTime: string;
}

export function listGroups(params: Record<string, unknown> = {}) {
  return api<{
    data: GroupItem[];
    meta?: { page: number; limit: number; total: number; totalPages: number };
  }>(`/groups${buildQuery(params)}`);
}

export function getGroup(id: number | string) {
  return api<{ data: GroupItem }>(`/groups/${id}`);
}

export function createGroup(body: Record<string, unknown>) {
  return api<{ data: GroupItem }>("/groups", { method: "POST", body });
}

export function updateGroup(
  id: number | string,
  body: Record<string, unknown>,
) {
  return api<{ data: GroupItem }>(`/groups/${id}`, { method: "PATCH", body });
}

export function deleteGroup(id: number | string) {
  return api<{ message: string }>(`/groups/${id}`, { method: "DELETE" });
}

export function addGroupMember(
  groupId: number | string,
  body: { studentId: number; monthlyFeeOverride?: number },
) {
  return api(`/groups/${groupId}/members`, { method: "POST", body });
}

export function updateGroupMember(
  groupId: number | string,
  studentId: number | string,
  body: Record<string, unknown>,
) {
  return api(`/groups/${groupId}/members/${studentId}`, {
    method: "PATCH",
    body,
  });
}

export function removeGroupMember(
  groupId: number | string,
  studentId: number | string,
) {
  return api(`/groups/${groupId}/members/${studentId}`, { method: "DELETE" });
}

export function getGroupSchedule(groupId: number | string) {
  return api<{ data?: { slots?: GroupScheduleSlot[] } | GroupScheduleSlot[] }>(
    `/groups/${groupId}/schedule`,
  );
}

export function saveGroupSchedule(
  groupId: number | string,
  slots: { dayOfWeek: number; startTime: string; endTime: string }[],
) {
  return api(`/groups/${groupId}/schedule`, { method: "PUT", body: { slots } });
}

export function generateGroupSessions(
  groupId: number | string,
  body: {
    from: string;
    to: string;
    title?: string;
    subjectBranchId?: number;
    notes?: string;
  },
) {
  return api<{
    data?: { created?: number; sessions?: unknown[]; skipped?: number };
  }>(`/groups/${groupId}/sessions/generate`, { method: "POST", body });
}

export async function fetchAllGroups(params: Record<string, unknown> = {}) {
  const all: GroupItem[] = [];
  let page = 1;

  for (;;) {
    const res = await listGroups({ ...params, page, limit: 50 });
    const batch = Array.isArray(res.data) ? res.data : [];
    all.push(...batch);
    const totalPages = res.meta?.totalPages || 1;
    if (page >= totalPages) break;
    page += 1;
  }

  return all;
}
