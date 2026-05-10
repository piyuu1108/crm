import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithTimeout } from "@/app/lib/http";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FacultyListItem {
  id: number;
  facultyCode: string;
  name: string;
  email: string;
  mobile: string;
  gender: string | null;
  designation: string | null;
  qualification: string | null;
  specialization: string | null;
  experienceYears: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface FacultyPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FacultyListResponse {
  faculty: FacultyListItem[];
  pagination: FacultyPagination;
}

export interface FacultyEmailJobProgress {
  jobId: string;
  total: number;
  sent: number;
  failed: number;
  status: "processing" | "completed";
}

export interface CreateFacultyPayload {
  name: string;
  email: string;
  mobile: string;
  facultyCode: string;
  designation?: string;
}

export interface FacultyListParams {
  page: number;
  limit?: number;
  search?: string;
  status?: "" | "active" | "inactive";
  sortBy?: "name" | "facultyCode" | "createdAt";
  sortOrder?: "asc" | "desc";
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

export async function fetchFacultyList(
  params: FacultyListParams
): Promise<FacultyListResponse> {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder);

  const res = await fetchWithTimeout(`/api/admin/faculty?${qs.toString()}`, {
    credentials: "include",
    cache: "no-store",
    timeoutMs: 6000,
    timeoutMessage: "Faculty list request timed out. Please retry.",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Request failed: ${res.status}`
    );
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error ?? "Unknown error from /api/admin/faculty");
  }

  return json.data as FacultyListResponse;
}

// ─── Create faculty ───────────────────────────────────────────────────────────

export async function createFaculty(
  payload: CreateFacultyPayload
): Promise<FacultyListItem> {
  const res = await fetchWithTimeout("/api/admin/faculty", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
    timeoutMs: 8000,
    timeoutMessage: "Faculty creation timed out. Please retry.",
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    // Attach field-level errors if present
    const error = new Error(json.error ?? `Request failed: ${res.status}`);
    (error as Error & { errors?: Record<string, string> }).errors = json.errors;
    throw error;
  }

  return json.data as FacultyListItem;
}

// ─── Query Key ────────────────────────────────────────────────────────────────

export const facultyListKey = (params: FacultyListParams) =>
  ["faculty", params.page, params.search ?? "", params.status ?? "", params.sortBy ?? "name", params.sortOrder ?? "asc"] as const;

// ─── List Hook ────────────────────────────────────────────────────────────────

export function useFacultyListQuery(params: FacultyListParams) {
  return useQuery({
    queryKey: facultyListKey(params),
    queryFn: () => fetchFacultyList(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
  });
}

// ─── Create Mutation ──────────────────────────────────────────────────────────

export function useCreateFacultyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFaculty,
    onSuccess: () => {
      // Invalidate all faculty list queries so the table refreshes
      queryClient.invalidateQueries({ queryKey: ["faculty"] });
    },
  });
}
export async function sendFacultyPasswordEmail(
  facultyDbId: number
): Promise<{ sent: true }> {
  const res = await fetchWithTimeout(
    "/api/admin/faculty/send-password-email",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ facultyDbId }),
      timeoutMs: 10000,
    }
  );

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to send password email");
  }
  return json.data as { sent: true };
}

export function useFacultyPasswordEmailMutation() {
  return useMutation({
    mutationFn: (facultyDbId: number) => sendFacultyPasswordEmail(facultyDbId),
  });
}

export async function enqueueBulkFacultyPasswordEmails(
  facultyDbIds: number[]
): Promise<{ jobId: string; total: number; queuedBatches: number }> {
  const res = await fetchWithTimeout(
    "/api/admin/faculty/send-password-email/bulk",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ facultyDbIds }),
      timeoutMs: 10000,
    }
  );

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to enqueue bulk password emails");
  }
  return json.data as { jobId: string; total: number; queuedBatches: number };
}

export function useBulkFacultyPasswordEmailMutation() {
  return useMutation({
    mutationFn: (facultyDbIds: number[]) => enqueueBulkFacultyPasswordEmails(facultyDbIds),
  });
}

export async function fetchFacultyEmailJobProgress(jobId: string): Promise<FacultyEmailJobProgress> {
  const res = await fetchWithTimeout(`/api/admin/email-jobs/${jobId}`, {
    credentials: "include",
    cache: "no-store",
    timeoutMs: 5000,
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to fetch email job progress");
  }
  return json.data as FacultyEmailJobProgress;
}

export function useFacultyEmailJobProgressQuery(jobId: string | null) {
  return useQuery({
    queryKey: ["admin", "faculty-email-jobs", jobId],
    queryFn: () => fetchFacultyEmailJobProgress(jobId as string),
    enabled: Boolean(jobId),
    refetchInterval: (query) =>
      query.state.data?.status === "completed" ? false : 2500,
    staleTime: 0,
  });
}
