import { api, buildQuery } from "./client";

// ==========================================
// 1. Profile & Account Types & Services
// ==========================================
export interface StudentProfileData {
  id?: string | number;
  name?: string;
  fullName?: string;
  studentPhone?: string;
  phone?: string;
  stage?: string;
  grade?: string;
  parentPhone?: string;
  teachers?: Array<{
    id?: string | number;
    name?: string;
    teacherName?: string;
  }>;
  enrollments?: Array<{
    id?: string | number;
    teacher?: { id?: string | number; name?: string };
  }>;
}

export interface StudentMeResponse {
  data: {
    student?: StudentProfileData;
    profile?: StudentProfileData;
    teachers?: Array<{ id?: string | number; name?: string }>;
    enrollments?: Array<{
      id?: string | number;
      teacher?: { id?: string | number; name?: string };
    }>;
  } & StudentProfileData;
}

export function getStudentMe() {
  return api<StudentMeResponse>("/student/me");
}

// ==========================================
// 2. Groups Types & Services
// ==========================================
export interface StudentGroupItem {
  id: string | number;
  name?: string;
  title?: string;
  teacher?: { id?: string | number; name?: string };
  teacherName?: string;
  subject?: { name?: string };
  subjectBranch?: { name?: string };
  subjectName?: string;
}

export function listStudentGroups(params: Record<string, unknown> = {}) {
  return api<{ data: StudentGroupItem[] }>(
    `/student/groups${buildQuery(params)}`,
  );
}

// ==========================================
// 3. Attendance Types & Services
// ==========================================
export interface StudentAttendanceItem {
  id?: string | number;
  date?: string;
  status?: string;
  teacherName?: string;
  teacher?: { id?: string | number; name?: string };
  session?: { date?: string; title?: string; name?: string };
  group?: { title?: string; name?: string };
}

export interface StudentAttendanceSummary {
  present?: number;
  absent?: number;
  late?: number;
  PRESENT?: number;
  ABSENT?: number;
  LATE?: number;
  attendanceRate?: number;
  rate?: number;
}

export interface StudentAttendanceResponse {
  data: {
    records?: StudentAttendanceItem[];
    history?: StudentAttendanceItem[];
    items?: StudentAttendanceItem[];
    summary?: StudentAttendanceSummary;
  };
}

export function getStudentAttendance(params: Record<string, unknown> = {}) {
  return api<StudentAttendanceResponse>(
    `/student/attendance${buildQuery(params)}`,
  );
}

// ==========================================
// 4. Assessments Types & Services
// ==========================================
export interface StudentAssessmentRow {
  id: string | number;
  assessmentId?: string | number;
  title?: string;
  name?: string;
  kind?: string;
  deliveryMode?: string;
  status?: string;
  date?: string;
  availableFrom?: string;
  availableTo?: string;
  score?: number | null;
  totalScore?: number | null;
  maxScore?: number | null;
  teacher?: { id: string | number; name: string };
  teacherName?: string;
}

export interface StudentAssessmentsResponse {
  data:
    | StudentAssessmentRow[]
    | { items?: StudentAssessmentRow[]; assessments?: StudentAssessmentRow[] };
}

export function getStudentAssessments(params: Record<string, unknown> = {}) {
  return api<StudentAssessmentsResponse>(
    `/student/assessments${buildQuery(params)}`,
  );
}

export function getStudentAssessmentDetail(id: string | number) {
  return api<{ data: unknown }>(`/student/assessments/${id}`);
}

export function submitStudentAssessment(
  id: string | number,
  body: { answers: unknown[] },
) {
  return api<{ message: string }>(`/student/assessments/${id}/submit`, {
    method: "POST",
    body,
  });
}

export function getStudentAssessmentResult(id: string | number) {
  return api<{ data: unknown }>(`/student/assessments/${id}/result`);
}

// ==========================================
// 5. Calendar Types & Services
// ==========================================
export interface StudentCalendarEvent {
  id?: string | number;
  title?: string;
  name?: string;
  type?: string;
  kind?: string;
  date?: string;
  startDate?: string;
  from?: string;
  startTime?: string;
  endTime?: string;
  start?: string;
  hasConflict?: boolean;
  conflict?: boolean;
  isConflict?: boolean;
  teacher?: { name?: string };
  teacherName?: string;
  group?: { name?: string };
  groupName?: string;
}

export interface StudentCalendarConflict {
  message?: string;
  date?: string;
  from?: string;
}

export interface StudentCalendarResponse {
  data: {
    events?: StudentCalendarEvent[];
    items?: StudentCalendarEvent[];
    sessions?: StudentCalendarEvent[];
    conflicts?: StudentCalendarConflict[];
    hasConflict?: boolean;
  };
}

export function getStudentCalendar(params: Record<string, unknown> = {}) {
  return api<StudentCalendarResponse>(`/student/calendar${buildQuery(params)}`);
}

// ==========================================
// 6. Finance Types & Services
// ==========================================
export interface StudentFinanceFeeItem {
  id?: string | number;
  month?: string;
  title?: string;
  name?: string;
  effectiveAmountDue?: number;
  amountDue?: number;
  due?: number;
  amount?: number;
  amountPaid?: number;
  paid?: number;
  status?: string;
  billingWindowStatus?: string;
  teacher?: { name?: string };
  teacherName?: string;
}

export interface StudentFinanceResponse {
  data:
    | {
        fees?: StudentFinanceFeeItem[];
        items?: StudentFinanceFeeItem[];
        subscriptions?: StudentFinanceFeeItem[];
      }
    | StudentFinanceFeeItem[];
}

export function getStudentFinance(params: Record<string, unknown> = {}) {
  return api<StudentFinanceResponse>(`/student/finance${buildQuery(params)}`);
}
