import { useMutation, useQuery } from "@tanstack/react-query";
import type { SubjectFormData } from "@/app/lib/validations/subject";

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
