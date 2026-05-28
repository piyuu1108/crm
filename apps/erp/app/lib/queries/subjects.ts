import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SubjectInput as SubjectFormData } from "@/app/lib/validations/schemas/subject";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SubjectAssignment {
  subjectId?: number;
  facultyName: string;
  divisionName: string;
  courseCode: string;
  divisionId?: number;
  facultyId?: number;
}

export interface SubjectListItem {
  id: number;
  code: string;
  name: string;
  subjectType: string;
  // Student-specific flat fields
  facultyName?: string;
  divisionName?: string;
  // Marking scheme
  internalTheoryMax: number | null;
  externalTheoryMax: number | null;
  theoryPassingMarks: number | null;
  internalPracticalMax: number | null;
  externalPracticalMax: number | null;
  practicalPassingMarks: number | null;
  // Assignments (for non-student roles)
  assignments?: SubjectAssignment[];
}

export interface SubjectsListResponse {
  role: string;
  subjects: SubjectListItem[];
  /** Explicit message when no data is available (e.g. counselor not assigned) */
  emptyMessage?: string;
}

export interface SubjectDetailAssignment {
  id: number;
  facultyName: string;
  divisionName: string;
  courseCode: string;
}

export interface SubjectDetail {
  id: number;
  code: string;
  name: string;
  subjectType: string;
  internalTheoryMax: number | null;
  externalTheoryMax: number | null;
  theoryPassingMarks: number | null;
  internalPracticalMax: number | null;
  externalPracticalMax: number | null;
  practicalPassingMarks: number | null;
}

export interface StudentMarks {
  internalTheory: string | null;
  externalTheory: string | null;
  internalPractical: string | null;
  externalPractical: string | null;
  maxInternalTheory: string | null;
  maxExternalTheory: string | null;
  maxInternalPractical: string | null;
  maxExternalPractical: string | null;
}

export interface SubjectDetailResponse {
  role: string;
  subject: SubjectDetail;
  assignments: SubjectDetailAssignment[];
  marks?: StudentMarks | null;
}

export interface CreatedSubject {
  id: number;
  code: string;
  name: string;
  subjectType: string;
  createdAt: string;
}

// ─── Fetchers ───────────────────────────────────────────────────────────────

async function fetchSubjectsList(
  activeRole: string | null
): Promise<SubjectsListResponse> {
  const headers: Record<string, string> = {};
  if (activeRole) {
    headers["X-Active-Role"] = activeRole;
  }

  const res = await fetch("/api/subjects", {
    credentials: "include",
    cache: "no-store",
    headers,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to fetch subjects");
  }
  return json.data;
}

async function fetchSubjectDetail(
  code: string,
  activeRole: string | null
): Promise<SubjectDetailResponse> {
  const headers: Record<string, string> = {};
  if (activeRole) {
    headers["X-Active-Role"] = activeRole;
  }

  const res = await fetch(`/api/subjects/${encodeURIComponent(code)}`, {
    credentials: "include",
    cache: "no-store",
    headers,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to fetch subject detail");
  }
  return json.data;
}

async function createSubject(data: SubjectFormData): Promise<CreatedSubject> {
  const res = await fetch("/api/admin/subjects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    const err = new Error(json.error ?? "Failed to create subject") as Error & {
      errors?: Record<string, string>;
    };
    if (json.errors) err.errors = json.errors;
    throw err;
  }
  return json.data as CreatedSubject;
}

// ─── Query Keys ─────────────────────────────────────────────────────────────
// activeRole is part of the key so switching modes triggers automatic refetch.

export const subjectsListKey = (activeRole: string | null) =>
  ["subjects", "list", activeRole ?? "default"] as const;

export const subjectDetailKey = (code: string, activeRole: string | null) =>
  ["subjects", "detail", code, activeRole ?? "default"] as const;

// ─── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Fetches the subject list filtered by the user's current mode.
 * Re-fetches automatically when activeRole changes (key includes mode).
 */
export function useSubjectsListQuery(activeRole: string | null) {
  return useQuery({
    queryKey: subjectsListKey(activeRole),
    queryFn: () => fetchSubjectsList(activeRole),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * Fetches subject detail scoped to the user's current mode.
 */
export function useSubjectDetailQuery(code: string, activeRole: string | null) {
  return useQuery({
    queryKey: subjectDetailKey(code, activeRole),
    queryFn: () => fetchSubjectDetail(code, activeRole),
    enabled: !!code,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useCreateSubjectMutation() {
  return useMutation({
    mutationFn: createSubject,
  });
}

// ─── Admin Subject List ──────────────────────────────────────────────────────

export interface SubjectAdminListItem {
  id: number;
  code: string;
  name: string;
  shortCode: string | null;
  subjectType: string;
  credit: number | null;
  semester: number | null;
  internalTheoryMax: number | null;
  externalTheoryMax: number | null;
  theoryPassingMarks: number | null;
  internalPracticalMax: number | null;
  externalPracticalMax: number | null;
  practicalPassingMarks: number | null;
  createdAt: string;
  assignments: { divisionName: string; facultyName: string }[];
}

async function fetchAdminSubjects(): Promise<SubjectAdminListItem[]> {
  const res = await fetch("/api/admin/subjects", {
    credentials: "include",
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to fetch subjects");
  }
  return json.data as SubjectAdminListItem[];
}

export const adminSubjectsListKey = ["admin", "subjects", "list"] as const;

export function useAdminSubjectsListQuery() {
  return useQuery({
    queryKey: adminSubjectsListKey,
    queryFn: fetchAdminSubjects,
    staleTime: 2 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
  });
}

// ─── Update Subject ──────────────────────────────────────────────────────────

export interface UpdateSubjectPayload {
  id: number;
  code: string;
  name: string;
  shortCode?: string;
  subjectType: string;
  credit?: number | null;
  semester?: number | null;
  internalTheoryMax?: number | null;
  externalTheoryMax?: number | null;
  theoryPassingMarks?: number | null;
  internalPracticalMax?: number | null;
  externalPracticalMax?: number | null;
  practicalPassingMarks?: number | null;
}

async function updateSubject(
  payload: UpdateSubjectPayload
): Promise<{ subject: SubjectAdminListItem; affectedAssignments: number }> {
  const { id, ...data } = payload;
  const res = await fetch(`/api/admin/subjects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    const error = new Error(json.error ?? `Request failed: ${res.status}`) as Error & {
      errors?: Record<string, string>;
    };
    if (json.errors) error.errors = json.errors;
    throw error;
  }
  return json.data;
}

export function useUpdateSubjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminSubjectsListKey });
    },
  });
}

// ─── Delete Subject ──────────────────────────────────────────────────────────

async function deleteSubject(id: number): Promise<{ id: number; code: string; name: string }> {
  const res = await fetch(`/api/admin/subjects/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Delete failed: ${res.status}`);
  }
  return json.data;
}

export function useDeleteSubjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminSubjectsListKey });
    },
  });
}

