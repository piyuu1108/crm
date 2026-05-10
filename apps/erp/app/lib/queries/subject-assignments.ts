import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithTimeout } from "@/app/lib/http";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubjectAssignmentRow {
  id: number;
  divisionId: number;
  subjectId: number;
  facultyId: number;
  divisionName: string;
  subjectName: string;
  subjectType: string;
  facultyName: string;
  courseCode: string;
}

export interface SubjectAssignmentDivision {
  id: number;
  displayName: string;
  specialization: string;
  semesterNo: number;
  batchYear: number;
}

export interface SubjectAssignmentFaculty {
  id: number;
  name: string;
  designation: string | null;
}

export interface SubjectAssignmentSubject {
  id: number;
  name: string;
  code: string;
  subjectType: string;
}

export interface SubjectAssignmentsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SubjectAssignmentsResponse {
  assignments: SubjectAssignmentRow[];
  pagination: SubjectAssignmentsPagination;
  allDivisions: SubjectAssignmentDivision[];
  allFaculty: SubjectAssignmentFaculty[];
  allSubjects: SubjectAssignmentSubject[];
}

export interface SubjectAssignmentsParams {
  page: number;
  limit?: number;
  divisionId?: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const subjectAssignmentsKeys = {
  all: ["subject-assignments"] as const,
  list: (params: SubjectAssignmentsParams) =>
    ["subject-assignments", "list", params.page, params.divisionId ?? ""] as const,
};

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchSubjectAssignments(
  params: SubjectAssignmentsParams
): Promise<SubjectAssignmentsResponse> {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.divisionId) qs.set("divisionId", params.divisionId);

  const res = await fetchWithTimeout(
    `/api/admin/subject-assignments?${qs.toString()}`,
    {
      credentials: "include",
      cache: "no-store",
      timeoutMs: 6000,
      timeoutMessage: "Subject assignments request timed out. Please retry.",
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Request failed: ${res.status}`
    );
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error ?? "Unknown error from /api/admin/subject-assignments");
  }

  return json.data as SubjectAssignmentsResponse;
}

// ─── Create Assignment ────────────────────────────────────────────────────────

async function createSubjectAssignment(payload: {
  divisionId: number;
  subjectId: number;
  facultyId: number;
}): Promise<SubjectAssignmentRow> {
  const res = await fetchWithTimeout("/api/admin/subject-assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
    timeoutMs: 8000,
    timeoutMessage: "Assignment creation timed out. Please retry.",
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Request failed: ${res.status}`);
  }

  return json.data as SubjectAssignmentRow;
}

// ─── List Hook ────────────────────────────────────────────────────────────────

export function useSubjectAssignmentsQuery(params: SubjectAssignmentsParams) {
  return useQuery({
    queryKey: subjectAssignmentsKeys.list(params),
    queryFn: () => fetchSubjectAssignments(params),
    staleTime: 2 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
  });
}

// ─── Create Mutation ──────────────────────────────────────────────────────────

export function useCreateSubjectAssignmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSubjectAssignment,
    onSuccess: () => {
      // Invalidate all subject-assignments queries to refresh the table
      queryClient.invalidateQueries({ queryKey: subjectAssignmentsKeys.all });
    },
  });
}
