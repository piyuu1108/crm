import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithTimeout } from "@/app/lib/http";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimetableEntry {
  id: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  facultyName: string;
  assignmentId: number;
  color: string | null;
  isLab: boolean;
  labId: string | null;
}

export interface TimetableAssignment {
  id: number;
  facultyId: number;
  subjectId: number;
  facultyName: string;
  subjectName: string;
  subjectType: string;
}

export interface FacultyConflictEntry {
  facultyId: number;
  facultyName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  divisionId: number;
  divisionName: string;
  subjectName: string;
  assignmentId: number;
}

export interface LabConflictEntry {
  labId: string | null;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  divisionId: number;
  divisionName: string;
  subjectName: string;
}

export interface ReadonlyTimetableResponse {
  role: "student" | "faculty" | "counselor" | "hod";
  isPublished?: boolean;
  entries: TimetableSlot[];
  divisionName?: string;
}

export interface TimetableDivision {
  id: number;
  displayName: string;
  specialization: string;
  semesterNo: number;
  batchYear: number;
  semesterId: number;
  publishStatus: "draft" | "published";
}

export interface TimetableDivisionListItem {
  id: number;
  displayName: string;
  specialization: string;
  semesterNo: number;
  batchYear: number;
  publishStatus: "draft" | "published";
}

export interface TimetableResponse {
  division: TimetableDivision;
  entries: TimetableEntry[];
  assignments: TimetableAssignment[];
  facultyConflicts: FacultyConflictEntry[];
  labConflicts: LabConflictEntry[];
  allDivisions: TimetableDivisionListItem[];
}

/** An entry prepared for saving (no server-assigned id yet). */
export interface TimetableSlot {
  /** Only set for pre-existing entries from the DB */
  id?: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  assignmentId: number;
  color: string;
  isLab?: boolean;
  labId?: string | null;
  /** Derived from assignment — not sent to the server */
  subjectName: string;
  facultyName: string;
  facultyId: number;
  divisionName?: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const timetableKeys = {
  all: ["timetable"] as const,
  divisions: ["timetable", "divisions"] as const,
  grid: (divisionId: number) => ["timetable", "grid", divisionId] as const,
  readonly: (role?: string) => ["timetable", "readonly", role] as const,
};

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchTimetableDivisions(): Promise<TimetableDivisionListItem[]> {
  const res = await fetchWithTimeout("/api/admin/timetable/divisions", {
    credentials: "include",
    cache: "no-store",
    timeoutMs: 6000,
    timeoutMessage: "Divisions request timed out. Please retry.",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error ?? "Unknown error fetching divisions");
  }

  return json.data as TimetableDivisionListItem[];
}

async function fetchTimetableGrid(divisionId: number): Promise<TimetableResponse> {
  const res = await fetchWithTimeout(`/api/admin/timetable?divisionId=${divisionId}`, {
    credentials: "include",
    cache: "no-store",
    timeoutMs: 8000,
    timeoutMessage: "Timetable request timed out. Please retry.",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error ?? "Unknown error from /api/admin/timetable");
  }

  return json.data as TimetableResponse;
}

async function saveTimetableEntries(
  divisionId: number,
  entries: Array<{
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    assignmentId: number;
    color: string;
    isLab?: boolean;
    labId?: string | null;
  }>
): Promise<{ saved: number; status: string }> {
  const res = await fetchWithTimeout("/api/admin/timetable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ divisionId, entries }),
    timeoutMs: 15000,
    timeoutMessage: "Timetable save timed out. Please retry.",
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Save failed: ${res.status}`);
  }

  return json.data as { saved: number; status: string };
}

async function updatePublishStatus(
  divisionId: number,
  status: "draft" | "published"
): Promise<{ divisionId: number; publishStatus: string }> {
  const res = await fetchWithTimeout("/api/admin/timetable/publish", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ divisionId, status }),
    timeoutMs: 8000,
    timeoutMessage: "Publish toggle timed out. Please retry.",
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Publish toggle failed: ${res.status}`);
  }

  return json.data as { divisionId: number; publishStatus: string };
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useTimetableDivisionsQuery() {
  return useQuery({
    queryKey: timetableKeys.divisions,
    queryFn: fetchTimetableDivisions,
    staleTime: 2 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useTimetableGridQuery(divisionId: number) {
  return useQuery({
    queryKey: timetableKeys.grid(divisionId),
    queryFn: () => fetchTimetableGrid(divisionId),
    staleTime: 0,
    retry: 1,
    refetchOnWindowFocus: true,
    enabled: divisionId > 0,
  });
}

export function useSaveTimetableMutation(divisionId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entries: Array<{
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      assignmentId: number;
      color: string;
      isLab?: boolean;
      labId?: string | null;
    }>) => saveTimetableEntries(divisionId, entries),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timetableKeys.grid(divisionId) });
    },
  });
}

export function usePublishTimetableMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ divisionId, status }: { divisionId: number; status: "draft" | "published" }) =>
      updatePublishStatus(divisionId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: timetableKeys.grid(variables.divisionId) });
    },
  });
}

// ─── Fetch Readonly Timetable ───────────────────────────────────────────────

export async function fetchReadonlyTimetable(role?: string): Promise<ReadonlyTimetableResponse> {
  const url = role ? `/api/academics/timetable?role=${encodeURIComponent(role)}` : `/api/academics/timetable`;
  const res = await fetchWithTimeout(url, {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch timetable");
  }

  const json = await res.json();
  return json.data;
}

// ─── Query Hook: Readonly ───────────────────────────────────────────────────

export function useReadonlyTimetableQuery(role?: string) {
  return useQuery({
    queryKey: timetableKeys.readonly(role),
    queryFn: () => fetchReadonlyTimetable(role),
    staleTime: 0,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}
