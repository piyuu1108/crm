import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithTimeout } from "@/app/lib/http";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AttendanceSlot {
  timetableId: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  divisionName: string;
  divisionId: number;
  semesterId: number;
  isLab: boolean;
  sessionId: number | null;
  sessionExists: boolean;
  isCancelled: boolean;
}

export interface AttendanceSlotsResponse {
  role: string;
  date: string;
  slots: AttendanceSlot[];
}

export interface AttendanceRecord {
  studentId: number;
  status: "present" | "absent";
}

export interface SessionCreateResponse {
  sessionId: number;
  isNew: boolean;
  records: AttendanceRecord[];
}

export interface StudentListItem {
  id: number;
  fullName: string;
  studentId: string | null;
  enrollmentId: string | null;
}

export interface BrowseDivision {
  id: number;
  displayName: string;
  semesterId: number;
}

export interface BrowseSession {
  id: number;
  timetableId: number;
  date: string;
  subjectName: string;
  facultyName: string;
  divisionName: string;
  isCancelled: boolean;
  startTime: string;
  endTime: string;
  totalStudents: number;
  presentCount: number;
}

export interface BrowseSessionsResponse {
  role: string;
  date: string;
  divisions: BrowseDivision[];
  sessions: BrowseSession[];
}

export interface StudentAttendanceRecord {
  id: number;
  status: string;
  date: string;
  subjectName: string;
  facultyName: string;
  startTime: string;
  endTime: string;
}

export interface StudentAttendanceResponse {
  records: StudentAttendanceRecord[];
  subjects: string[];
  summary: {
    total: number;
    present: number;
    absent: number;
    percentage: number;
  };
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const attendanceKeys = {
  all: ["attendance"] as const,
  slots: (date: string) => ["attendance", "slots", date] as const,
  session: (sessionId: number) => ["attendance", "session", sessionId] as const,
  students: (divisionId: number) => ["attendance", "students", divisionId] as const,
  browse: (divisionId: number, date: string) =>
    ["attendance", "browse", divisionId, date] as const,
  browseDivisions: ["attendance", "browse-divisions"] as const,
  myAttendance: (filters: { dateFrom?: string; dateTo?: string; subject?: string }) =>
    ["attendance", "my", filters] as const,
};

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchFacultySlots(date: string): Promise<AttendanceSlotsResponse> {
  const res = await fetchWithTimeout(
    `/api/attendance/sessions?date=${encodeURIComponent(date)}`,
    { credentials: "include", cache: "no-store", timeoutMs: 6000 }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Unknown error");
  return json.data;
}

async function fetchBrowseSessions(
  divisionId: number,
  date: string
): Promise<BrowseSessionsResponse> {
  const params = new URLSearchParams({ date });
  if (divisionId > 0) params.set("divisionId", divisionId.toString());
  const res = await fetchWithTimeout(
    `/api/attendance/sessions?${params.toString()}`,
    { credentials: "include", cache: "no-store", timeoutMs: 8000 }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Unknown error");
  return json.data;
}

async function createSession(
  timetableEntryId: number,
  date: string
): Promise<SessionCreateResponse> {
  const res = await fetchWithTimeout("/api/attendance/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ timetableEntryId, date }),
    timeoutMs: 8000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Create session failed: ${res.status}`);
  }
  return json.data;
}

async function fetchStudentsForDivision(
  divisionId: number
): Promise<{ students: StudentListItem[]; divisionId: number }> {
  const res = await fetchWithTimeout(
    `/api/attendance/students?divisionId=${divisionId}`,
    { credentials: "include", cache: "no-store", timeoutMs: 6000 }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Unknown error");
  return json.data;
}

async function saveAttendance(
  sessionId: number,
  records: { studentId: number; status: string }[]
): Promise<{ saved: number }> {
  const res = await fetchWithTimeout("/api/attendance/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ sessionId, records }),
    timeoutMs: 15000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Save failed: ${res.status}`);
  }
  return json.data;
}

async function fetchMyAttendance(filters: {
  dateFrom?: string;
  dateTo?: string;
  subject?: string;
}): Promise<StudentAttendanceResponse> {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.subject) params.set("subject", filters.subject);

  const res = await fetchWithTimeout(
    `/api/attendance/my?${params.toString()}`,
    { credentials: "include", cache: "no-store", timeoutMs: 8000 }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Unknown error");
  return json.data;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Faculty: today's timetable slots with session status */
export function useFacultySlotsQuery(date: string) {
  return useQuery({
    queryKey: attendanceKeys.slots(date),
    queryFn: () => fetchFacultySlots(date),
    staleTime: 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}

/** Counselor/HOD: browse sessions by division + date */
export function useBrowseSessionsQuery(divisionId: number, date: string) {
  return useQuery({
    queryKey: attendanceKeys.browse(divisionId, date),
    queryFn: () => fetchBrowseSessions(divisionId, date),
    staleTime: 30 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}

/** Create or get a session */
export function useCreateSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ timetableEntryId, date }: { timetableEntryId: number; date: string }) =>
      createSession(timetableEntryId, date),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.slots(variables.date) });
    },
  });
}

/** Student list for a division (cached — rarely changes) */
export function useDivisionStudentsQuery(divisionId: number) {
  return useQuery({
    queryKey: attendanceKeys.students(divisionId),
    queryFn: () => fetchStudentsForDivision(divisionId),
    staleTime: 10 * 60 * 1000, // 10 min
    retry: 1,
    enabled: divisionId > 0,
  });
}

/** Batch save attendance */
export function useSaveAttendanceMutation(sessionId: number, date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (records: { studentId: number; status: string }[]) =>
      saveAttendance(sessionId, records),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.slots(date) });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
  });
}

/** Student self-view */
export function useMyAttendanceQuery(filters: {
  dateFrom?: string;
  dateTo?: string;
  subject?: string;
}) {
  return useQuery({
    queryKey: attendanceKeys.myAttendance(filters),
    queryFn: () => fetchMyAttendance(filters),
    staleTime: 2 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}
