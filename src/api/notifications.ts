import { api, buildQuery } from "./client";

export interface NotificationItem {
  id: string | number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function listNotifications(params: Record<string, unknown> = {}) {
  return api<{ data: NotificationItem[] }>(
    `/notifications${buildQuery(params)}`,
  );
}

export function getUnreadCount() {
  return api<{ count: number }>("/notifications/unread-count");
}

export function markNotificationRead(id: number | string) {
  return api<{ message: string }>(`/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export function markAllNotificationsRead() {
  return api<{ message: string }>("/notifications/read-all", {
    method: "POST",
  });
}

export function deleteNotification(id: number | string) {
  return api<{ message: string }>(`/notifications/${id}`, { method: "DELETE" });
}

export function clearAllNotifications() {
  return api<{ message: string }>("/notifications/clear-all", {
    method: "POST",
  });
}
