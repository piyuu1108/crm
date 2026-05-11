import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithTimeout } from "@/app/lib/http";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DivisionListItem {
  id: number;
  displayName: string;
  specialization: string;
  batchYear: number;
  semesterNo: number;
  divisionNo: number;
  courseCode: string;
  courseName: string;
  maxCapacity: number;
  createdAt: string;
  studentCount: number;
  counselorName: string | null;
  assignments: {
    subjectName: string;
    facultyName: string;
    subjectShortCode: string;
    facultyCode: string;
    subjectCode: string;
    subjectType: string;
    subjectCredit: number;
  }[];
}

export interface DivisionPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DivisionListResponse {
  divisions: DivisionListItem[];
  pagination: DivisionPagination;
}

export interface DivisionDetail extends DivisionListItem {
  students: DivisionStudent[];
}

export interface DivisionStudent {
  id: number;
  studentId: string | null;
  fullName: string;
  email: string;
  status: string;
}

export interface StudentVerificationDetail {
  id: number;
  studentId: string | null;
  fullName: string;
  email: string;
  mobile: string | null;
  parentMobile: string | null;
  status: string;
  profileStatus: string;
  profileStep: number;
  currentDivisionName: string | null;
  currentSemesterNo: number | null;
}

export interface CreateDivisionPayload {
  batchYear: number;
  semesterNo: number;
  specialization: string;
}

export interface DivisionListParams {
  page: number;
  limit?: number;
}

export interface NextStudentIdResponse {
  nextNumber: number;
  nextFormatted: string;
  yearPrefix: string;
}

export interface CsvUploadResult {
  total: number;
  inserted: number;
  errors: number;
  results: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
    reason?: string;
  }>;
}

export interface EmailJobProgress {
  jobId: string;
  total: number;
  sent: number;
  failed: number;
  status: "processing" | "completed";
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

export async function fetchDivisionList(
  params: DivisionListParams
): Promise<DivisionListResponse> {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));

  const res = await fetchWithTimeout(`/api/admin/divisions?${qs.toString()}`, {
    credentials: "include",
    cache: "no-store",
    timeoutMs: 6000,
    timeoutMessage: "Division list request timed out. Please retry.",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Request failed: ${res.status}`
    );
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error ?? "Unknown error from /api/admin/divisions");
  }

  return json.data as DivisionListResponse;
}

export async function fetchDivisionDetail(id: number): Promise<DivisionDetail> {
  const res = await fetchWithTimeout(`/api/admin/divisions/${id}`, {
    credentials: "include",
    cache: "no-store",
    timeoutMs: 6000,
    timeoutMessage: "Division detail request timed out. Please retry.",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Request failed: ${res.status}`
    );
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error ?? "Unknown error");
  }

  return json.data as DivisionDetail;
}

export async function createDivision(
  payload: CreateDivisionPayload
): Promise<DivisionListItem> {
  const res = await fetchWithTimeout("/api/admin/divisions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
    timeoutMs: 8000,
    timeoutMessage: "Division creation timed out. Please retry.",
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    const error = new Error(json.error ?? `Request failed: ${res.status}`);
    (error as Error & { errors?: Record<string, string> }).errors = json.errors;
    throw error;
  }

  return json.data as DivisionListItem;
}

export async function fetchNextStudentId(year: number): Promise<NextStudentIdResponse> {
  const res = await fetchWithTimeout(`/api/admin/students/next-id?year=${year}`, {
    credentials: "include",
    cache: "no-store",
    timeoutMs: 4000,
    timeoutMessage: "Next student ID request timed out.",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Request failed: ${res.status}`
    );
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error ?? "Unknown error");
  }

  return json.data as NextStudentIdResponse;
}

export async function uploadStudentsCsv(
  divisionId: number,
  students: Array<{ id: string; name: string; email: string }>
): Promise<CsvUploadResult> {
  const res = await fetchWithTimeout(`/api/admin/divisions/${divisionId}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ students }),
    timeoutMs: 30000, // CSV uploads can be large
    timeoutMessage: "Student upload timed out. Please retry.",
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Upload failed: ${res.status}`);
  }

  return json.data as CsvUploadResult;
}

export async function sendSinglePasswordEmail(
  divisionId: number,
  studentDbId: number
): Promise<{ sent: true }> {
  const res = await fetchWithTimeout(
    `/api/admin/divisions/${divisionId}/students/send-password-email`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ studentDbId }),
      timeoutMs: 10000,
    }
  );

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to send password email");
  }
  return json.data as { sent: true };
}

export async function enqueueBulkPasswordEmails(
  divisionId: number,
  studentDbIds: number[]
): Promise<{ jobId: string; total: number; queuedBatches: number }> {
  const res = await fetchWithTimeout(
    `/api/admin/divisions/${divisionId}/students/send-password-email/bulk`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ studentDbIds }),
      timeoutMs: 10000,
    }
  );

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to enqueue bulk password emails");
  }
  return json.data as { jobId: string; total: number; queuedBatches: number };
}

export async function fetchAdminEmailJobProgress(jobId: string): Promise<EmailJobProgress> {
  const res = await fetchWithTimeout(`/api/admin/email-jobs/${jobId}`, {
    credentials: "include",
    cache: "no-store",
    timeoutMs: 5000,
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to fetch email job progress");
  }
  return json.data as EmailJobProgress;
}

export async function fetchAdminStudentDetail(
  studentDbId: number
): Promise<StudentVerificationDetail> {
  const res = await fetchWithTimeout(`/api/admin/students/${studentDbId}`, {
    credentials: "include",
    cache: "no-store",
    timeoutMs: 5000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to fetch student detail");
  }
  return json.data as StudentVerificationDetail;
}

export async function updateAdminStudentVerification(
  studentDbId: number,
  action: "approve" | "reject"
): Promise<{ id: number; status: string }> {
  const res = await fetchWithTimeout(`/api/admin/students/${studentDbId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action }),
    timeoutMs: 8000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to update student verification");
  }
  return json.data as { id: number; status: string };
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const divisionListKey = (params: DivisionListParams) =>
  ["divisions", params.page] as const;

export const divisionDetailKey = (id: number) =>
  ["divisions", "detail", id] as const;

export const nextStudentIdKey = (year: number) =>
  ["students", "next-id", year] as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useDivisionListQuery(params: DivisionListParams) {
  return useQuery({
    queryKey: divisionListKey(params),
    queryFn: () => fetchDivisionList(params),
    staleTime: 2 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
  });
}

export function useDivisionDetailQuery(id: number) {
  return useQuery({
    queryKey: divisionDetailKey(id),
    queryFn: () => fetchDivisionDetail(id),
    staleTime: 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: id > 0,
  });
}

export function useNextStudentIdQuery(year: number) {
  return useQuery({
    queryKey: nextStudentIdKey(year),
    queryFn: () => fetchNextStudentId(year),
    staleTime: 30 * 1000,
    retry: 1,
    enabled: year > 0,
  });
}

export function useCreateDivisionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDivision,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["divisions"] });
    },
  });
}

export function useUploadStudentsMutation(divisionId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (students: Array<{ id: string; name: string; email: string }>) =>
      uploadStudentsCsv(divisionId, students),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["divisions"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useSinglePasswordEmailMutation(divisionId: number) {
  return useMutation({
    mutationFn: (studentDbId: number) => sendSinglePasswordEmail(divisionId, studentDbId),
  });
}

export function useBulkPasswordEmailMutation(divisionId: number) {
  return useMutation({
    mutationFn: (studentDbIds: number[]) => enqueueBulkPasswordEmails(divisionId, studentDbIds),
  });
}

export function useAdminEmailJobProgressQuery(jobId: string | null) {
  return useQuery({
    queryKey: ["admin", "email-jobs", jobId],
    queryFn: () => fetchAdminEmailJobProgress(jobId as string),
    enabled: Boolean(jobId),
    refetchInterval: (query) =>
      query.state.data?.status === "completed" ? false : 2500,
    staleTime: 0,
  });
}

export function useAdminStudentDetailQuery(studentDbId: number) {
  return useQuery({
    queryKey: ["admin", "students", "detail", studentDbId],
    queryFn: () => fetchAdminStudentDetail(studentDbId),
    enabled: studentDbId > 0,
    staleTime: 30 * 1000,
  });
}

export function useAdminStudentVerificationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      studentDbId,
      action,
    }: {
      studentDbId: number;
      action: "approve" | "reject";
    }) => updateAdminStudentVerification(studentDbId, action),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["divisions"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "students", "detail", variables.studentDbId],
      });
    },
  });
}
