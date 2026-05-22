import { useQuery } from "@tanstack/react-query";
import { fetchWithTimeout } from "@/app/lib/http";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardUser {
  id: number;
  name: string;
  email: string;
  roles: string[];
  activeRole: string;
  facultyCode?: string;
}

// Student-specific data
export interface StudentDashboardData {
  profile: {
    studentId: string | null;
    divisionName: string | null;
    currentSemesterNo: number | null;
    status: string;
    profileStatus: "incomplete" | "complete" | "completed";
    profileStep: number;
  };
  attendance: {
    totalSessions: number;
    presentCount: number;
    percentage: number;
  };
  pendingRequestsCount: number;
  todayTimetable: TimetableEntry[];
  recentRequests: StudentRequest[];
}

// Faculty-specific data
export interface FacultyDashboardData {
  assignedSubjectsCount: number;
  assignedDivisionsCount: number;
  pendingRequestsCount: number;
  todayTimetable: TimetableEntry[];
  assignments: SubjectAssignment[];
  pendingRequests: StudentRequest[];
}

// Counselor-specific data
export interface CounselorDashboardData {
  assignedDivisions: DivisionSummary[];
  pendingRequestsCount: number;
  totalStudentsCount: number;
  pendingRequests: StudentRequest[];
}

// HOD-specific data
export interface HodDashboardData {
  totalStudents: number;
  activeStudents: number;
  approvedStudents: number;
  unapprovedStudents: number;
  totalFaculty: number;
  pendingRequestsCount: number;
  pendingRequests: StudentRequest[];
}

// Shared sub-types
export interface TimetableEntry {
  id: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  facultyName: string;
  divisionName: string;
}

export interface SubjectAssignment {
  id: number;
  subjectName: string;
  subjectType: string;
  divisionName: string;
  courseCode: string;
}

export interface DivisionSummary {
  id: number;
  displayName: string;
  semesterNo: number;
  courseCode: string;
}

export interface StudentRequest {
  id: number;
  requestType: string;
  subject: string;
  status: string;
  studentName: string;
  divisionName: string;
  createdAt: string;
}

export interface ActiveSemester {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
}

export type DashboardData =
  | StudentDashboardData
  | FacultyDashboardData
  | CounselorDashboardData
  | HodDashboardData;

export interface DashboardResponse {
  user: DashboardUser;
  dashboard: DashboardData;
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

export async function fetchDashboard(
  activeRole: string | null
): Promise<DashboardResponse> {
  // Only send header when we have a role — otherwise API picks default from JWT
  const headers: Record<string, string> = {};
  if (activeRole) {
    headers["X-Active-Role"] = activeRole;
  }

  const res = await fetchWithTimeout("/api/dashboard", {
    headers,
    credentials: "include", // ensures cookie is always sent
    cache: "no-store",
    timeoutMs: 6000,
    timeoutMessage: "Dashboard request timed out. Please retry.",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Request failed: ${res.status}`
    );
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error ?? "Unknown error from /api/dashboard");
  }

  return json.data as DashboardResponse;
}

// ─── Query Key ────────────────────────────────────────────────────────────────

export const dashboardQueryKey = (role: string | null) =>
  ["dashboard", role ?? "__init__"] as const;

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetches dashboard data for the current active role.
 *
 * IMPORTANT: This hook is ALWAYS enabled (no activeRole guard).
 * On first load activeRole is null — the API picks the default role from JWT.
 * After hydrateUser sets activeRole, the key changes and refetches with the
 * explicit role header. The page pre-populates the new key's cache to avoid
 * a second network request.
 */
export function useDashboardQuery(activeRole: string | null) {
  return useQuery({
    queryKey: dashboardQueryKey(activeRole),
    queryFn: () => fetchDashboard(activeRole),
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
  });
}
