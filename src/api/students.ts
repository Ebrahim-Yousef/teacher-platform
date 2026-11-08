import { api, buildQuery } from "./client";

export interface StudentPayload {
  name: string;
  studentPhone: string;
  parentPhone: string;
  stage: string;
  grade: string;
  teacherId?: string;
}

export interface StudentItem extends StudentPayload {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedStudentsResponse {
  data: StudentItem[];
  meta?: {
    totalPages: number;
    currentPage: number;
    total?: number;
    limit?: number;
  };
}

export function listStudents(params: Record<string, unknown> = {}) {
  return api<PaginatedStudentsResponse>(`/students${buildQuery(params)}`);
}

export function getStudent(id: number | string) {
  return api<{ data: StudentItem }>(`/students/${id}`);
}

export function createStudent(body: StudentPayload) {
  return api<{ data: StudentItem }>("/students", { method: "POST", body });
}

export function updateStudent(
  id: number | string,
  body: Partial<StudentPayload>,
) {
  return api<{ data: StudentItem }>(`/students/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteStudent(id: number | string) {
  return api<{ message: string }>(`/students/${id}`, { method: "DELETE" });
}
