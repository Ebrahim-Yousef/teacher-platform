import { api, buildQuery } from "./client";

export interface BranchItem {
  id?: string | number;
  name: string;
  code?: string;
}

export interface SubjectPayload {
  name: string;
  code?: string;
  isActive?: boolean;
}

export interface BranchPayload {
  name: string;
  code?: string;
}

export interface SubjectItem {
  id: string | number;
  name: string;
  code?: string;
  isActive?: boolean;
  branches?: BranchItem[];
}

export function listSubjects(params: Record<string, unknown> = {}) {
  return api<{ data: SubjectItem[] }>(`/subjects${buildQuery(params)}`);
}

export function getSubject(id: number | string) {
  return api<{ data: SubjectItem }>(`/subjects/${id}`);
}

export function createSubject(body: SubjectPayload) {
  return api<{ data: SubjectItem }>("/subjects", { method: "POST", body });
}

export function updateSubject(
  id: number | string,
  body: Partial<SubjectPayload>,
) {
  return api<{ data: SubjectItem }>(`/subjects/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteSubject(id: number | string) {
  return api<{ message: string }>(`/subjects/${id}`, { method: "DELETE" });
}

export function createBranch(subjectId: number | string, body: BranchPayload) {
  return api<{ data: BranchItem }>(`/subjects/${subjectId}/branches`, {
    method: "POST",
    body,
  });
}

export function updateBranch(
  subjectId: number | string,
  branchId: number | string,
  body: Partial<BranchPayload>,
) {
  return api<{ data: BranchItem }>(
    `/subjects/${subjectId}/branches/${branchId}`,
    {
      method: "PATCH",
      body,
    },
  );
}

export function deleteBranch(
  subjectId: number | string,
  branchId: number | string,
) {
  return api<{ message: string }>(
    `/subjects/${subjectId}/branches/${branchId}`,
    {
      method: "DELETE",
    },
  );
}

export function getTeacherSubjects() {
  return api<{
    data:
      | SubjectItem[]
      | { subjects?: SubjectItem[]; activeSubjectIds?: (number | string)[] };
  }>("/teacher/subjects");
}

export function saveTeacherSubjects(subjectIds: (number | string)[]) {
  return api<{ message: string }>("/teacher/subjects", {
    method: "PUT",
    body: { subjectIds },
  });
}

export async function fetchActiveSubjects(): Promise<SubjectItem[]> {
  const res = await listSubjects({ isActive: true });
  return Array.isArray(res.data) ? res.data : [];
}
