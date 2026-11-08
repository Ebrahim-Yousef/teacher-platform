import { getHomePath } from "@/constants/app";

export interface NotificationItem {
  type?: string;
  data?: Record<string, unknown>;
}

/**
 * Map a notification to a deep-link path for the given role.
 */
export function resolveNotificationPath(
  notification?: NotificationItem | null,
  role?: string,
): string {
  const data = notification?.data || {};
  const type = notification?.type || "";
  const home = getHomePath(role);

  if (data.assessmentId != null) {
    if (role === "student" || role === "STUDENT") {
      if (type === "GRADE_RELEASED") {
        return `/student/assessments/${data.assessmentId}/result`;
      }
      return `/student/assessments/${data.assessmentId}`;
    }
    if (
      role === "teacher" ||
      role === "assistant" ||
      role === "TEACHER" ||
      role === "ASSISTANT"
    ) {
      return `/assessments?assessmentId=${data.assessmentId}`;
    }
  }

  if (
    data.studentId != null &&
    (role === "teacher" ||
      role === "assistant" ||
      role === "TEACHER" ||
      role === "ASSISTANT")
  ) {
    return `/students/${data.studentId}`;
  }

  if (
    type === "FEE_OVERDUE" ||
    data.feeId != null ||
    data.monthlyFeeId != null
  ) {
    if (role === "student" || role === "STUDENT") return "/student/finance";
    if (role === "teacher" || role === "TEACHER") return "/finance";
  }

  if (
    type === "SUBSCRIPTION_EXPIRING" ||
    type === "SUBSCRIPTION_STATUS" ||
    data.subscriptionId != null
  ) {
    if (role === "super_admin" || role === "SUPER_ADMIN")
      return "/admin/subscriptions";
    if (role === "teacher" || role === "TEACHER") return "/dashboard";
  }

  if (type === "ATTENDANCE_MARKED") {
    if (role === "student" || role === "STUDENT") return "/student/attendance";
    if (
      role === "teacher" ||
      role === "assistant" ||
      role === "TEACHER" ||
      role === "ASSISTANT"
    ) {
      return "/attendance";
    }
  }

  return home;
}
