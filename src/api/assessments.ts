import { api, buildQuery } from "./client";

export interface AssessmentPayload {
  groupId: number;
  title: string;
  type: string;
  deliveryMode: string;
  date: string;
  maxScore?: number;
  notes?: string;
  instructions?: string;
  availableFrom?: string;
  availableTo?: string;
}

export interface AssessmentItem extends AssessmentPayload {
  id: string | number;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
  group?: { id: string | number; name: string };
  scores?: Array<{ studentId: string | number; score: number; note?: string }>;
}

export function listAssessments(params: Record<string, unknown> = {}) {
  return api<{
    data: AssessmentItem[];
    meta?: { page: number; limit: number; total: number; totalPages: number };
  }>(`/assessments${buildQuery(params)}`);
}

export function getAssessment(id: number | string) {
  return api<{ data: AssessmentItem }>(`/assessments/${id}`);
}

export function createAssessment(body: AssessmentPayload) {
  return api<{ data: AssessmentItem }>("/assessments", {
    method: "POST",
    body,
  });
}

export function updateAssessment(
  id: number | string,
  body: Partial<AssessmentPayload>,
) {
  return api<{ data: AssessmentItem }>(`/assessments/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteAssessment(id: number | string) {
  return api<{ message: string }>(`/assessments/${id}`, { method: "DELETE" });
}

export function upsertScores(
  id: number | string,
  scores: Array<{ studentId: number; score: number; note?: string }>,
) {
  return api<{ message: string }>(`/assessments/${id}/scores`, {
    method: "PUT",
    body: { scores },
  });
}

export function getStudentPerformance(studentId: number | string) {
  return api<{ data: unknown }>(
    `/assessments/students/${studentId}/performance`,
  );
}

export function putQuestions(id: number | string, questions: unknown[]) {
  return api<{ message: string }>(`/assessments/${id}/questions`, {
    method: "PUT",
    body: { questions },
  });
}

export function getQuestions(id: number | string) {
  return api<{ data: unknown }>(`/assessments/${id}/questions`);
}

export function publishAssessment(id: number | string) {
  return api<{ message: string }>(`/assessments/${id}/publish`, {
    method: "POST",
  });
}

export function getAssessmentResults(id: number | string) {
  return api<{ data: unknown }>(`/assessments/${id}/results`);
}

export function getLeaderboard(
  id: number | string,
  params: Record<string, unknown> = {},
) {
  return api<{ data: unknown }>(
    `/assessments/${id}/leaderboard${buildQuery(params)}`,
  );
}

export function gradeSubmissionAnswer(
  assessmentId: number | string,
  submissionId: number | string,
  answerId: number | string,
  body: { pointsAwarded: number },
) {
  return api<{ message: string }>(
    `/assessments/${assessmentId}/submissions/${submissionId}/answers/${answerId}`,
    { method: "PATCH", body },
  );
}
