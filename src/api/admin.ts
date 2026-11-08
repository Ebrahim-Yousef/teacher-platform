import { api, buildQuery } from "./client";

export interface AdminSubscriptionItem {
  id: string | number;
  status?: string;
  expiresAt?: string;
  notes?: string;
  teacher?: { id?: string | number; name?: string; username?: string };
  teacherName?: string;
  ownerName?: string;
  username?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminTeacherItem {
  id: string | number;
  name?: string;
  username?: string;
  isActive?: boolean;
  createdAt?: string;
  user?: { username?: string };
  subscription?: AdminSubscriptionItem;
  platformSubscription?: AdminSubscriptionItem;
}

export function listAdminTeachers(params: Record<string, unknown> = {}) {
  return api<{ data: AdminTeacherItem[] }>(
    `/admin/teachers${buildQuery(params)}`,
  );
}

export function createAdminTeacher(body: Record<string, unknown>) {
  return api<{ data: AdminTeacherItem }>("/admin/teachers", {
    method: "POST",
    body,
  });
}

export function listSubscriptions(params: Record<string, unknown> = {}) {
  return api<{ data: AdminSubscriptionItem[] }>(
    `/admin/subscriptions${buildQuery(params)}`,
  );
}

export function updateSubscription(
  id: number | string,
  body: Record<string, unknown>,
) {
  return api<{ data: AdminSubscriptionItem }>(`/admin/subscriptions/${id}`, {
    method: "PATCH",
    body,
  });
}
