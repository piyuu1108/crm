import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithTimeout } from "@/app/lib/http";
import type { DivisionListItem, DivisionDetail, CsvUploadResult, NextStudentIdResponse } from "./divisions";

export interface EmailJobProgress {
  jobId: string;
  total: number;
  sent: number;
  failed: number;
  status: "processing" | "completed";
  failedEmails?: string[];
}

export interface CounselorStudentVerificationDetail {
  id: number;
  studentId: string | null;
  fullName: string;
  email: string;
  mobile: string | null;
  parentMobile: string | null;
  status: string;
  profileStatus: string;
  profileStep: number;
  currentDivisionId: number | null;
  currentDivisionName: string | null;
  currentSemesterNo: number | null;
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

export async function fetchCounselorDivisions(): Promise<DivisionListItem[]> {
  const res = await fetchWithTimeout("/api/counselor/divisions", {
    credentials: "include",
    cache: "no-store",
    timeoutMs: 6000,
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to fetch assigned divisions");
  }

  return json.data as DivisionListItem[];
}

export async function fetchCounselorDivisionDetail(id: number): Promise<DivisionDetail> {
  const res = await fetchWithTimeout(`/api/counselor/divisions/${id}`, {
    credentials: "include",
    cache: "no-store",
    timeoutMs: 6000,
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to fetch division detail");
  }

  return json.data as DivisionDetail;
}

export async function fetchCounselorNextStudentId(year: number): Promise<NextStudentIdResponse> {
  const res = await fetchWithTimeout(`/api/counselor/students/next-id?year=${year}`, {
    credentials: "include",
    cache: "no-store",
    timeoutMs: 4000,
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to fetch next student ID");
  }

  return json.data as NextStudentIdResponse;
}

export async function uploadCounselorStudentsCsv(
  divisionId: number,
  students: Array<{ id: string; name: string; email: string }>
): Promise<CsvUploadResult> {
  const res = await fetchWithTimeout(`/api/counselor/divisions/${divisionId}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ students }),
    timeoutMs: 30000,
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Upload failed");
  }

  return json.data as CsvUploadResult;
}

export async function sendCounselorSinglePasswordEmail(
  divisionId: number,
  studentDbId: number
): Promise<{ sent: true }> {
  const res = await fetchWithTimeout(
    `/api/counselor/divisions/${divisionId}/students/send-password-email`,
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

export async function enqueueCounselorBulkPasswordEmails(
  divisionId: number,
  studentDbIds: number[]
): Promise<{ jobId: string; total: number; queuedBatches: number }> {
  const res = await fetchWithTimeout(
    `/api/counselor/divisions/${divisionId}/students/send-password-email/bulk`,
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

export async function fetchCounselorEmailJobProgress(jobId: string): Promise<EmailJobProgress> {
  const res = await fetchWithTimeout(`/api/counselor/email-jobs/${jobId}`, {
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

export async function fetchCounselorStudentDetail(
  studentDbId: number
): Promise<CounselorStudentVerificationDetail> {
  const res = await fetchWithTimeout(`/api/counselor/students/${studentDbId}`, {
    credentials: "include",
    cache: "no-store",
    timeoutMs: 5000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to fetch student detail");
  }
  return json.data as CounselorStudentVerificationDetail;
}

export async function updateCounselorStudentVerification(
  studentDbId: number,
  action: "approve" | "reject"
): Promise<{ id: number; status: string }> {
  const res = await fetchWithTimeout(`/api/counselor/students/${studentDbId}`, {
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

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useCounselorDivisionsQuery() {
  return useQuery({
    queryKey: ["counselor", "divisions"],
    queryFn: fetchCounselorDivisions,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCounselorDivisionDetailQuery(id: number) {
  return useQuery({
    queryKey: ["counselor", "divisions", "detail", id],
    queryFn: () => fetchCounselorDivisionDetail(id),
    staleTime: 60 * 1000,
    enabled: id > 0,
  });
}

export function useCounselorNextStudentIdQuery(year: number) {
  return useQuery({
    queryKey: ["counselor", "students", "next-id", year],
    queryFn: () => fetchCounselorNextStudentId(year),
    staleTime: 30 * 1000,
    enabled: year > 0,
  });
}

export function useCounselorUploadStudentsMutation(divisionId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (students: Array<{ id: string; name: string; email: string }>) =>
      uploadCounselorStudentsCsv(divisionId, students),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["counselor", "divisions", "detail", divisionId] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useCounselorSinglePasswordEmailMutation(divisionId: number) {
  return useMutation({
    mutationFn: (studentDbId: number) =>
      sendCounselorSinglePasswordEmail(divisionId, studentDbId),
  });
}

export function useCounselorBulkPasswordEmailMutation(divisionId: number) {
  return useMutation({
    mutationFn: (studentDbIds: number[]) =>
      enqueueCounselorBulkPasswordEmails(divisionId, studentDbIds),
  });
}

export function useCounselorEmailJobProgressQuery(jobId: string | null) {
  return useQuery({
    queryKey: ["counselor", "email-jobs", jobId],
    queryFn: () => fetchCounselorEmailJobProgress(jobId as string),
    enabled: Boolean(jobId),
    refetchInterval: (query) =>
      query.state.data?.status === "completed" ? false : 2500,
    staleTime: 0,
  });
}

export function useCounselorStudentDetailQuery(studentDbId: number) {
  return useQuery({
    queryKey: ["counselor", "students", "detail", studentDbId],
    queryFn: () => fetchCounselorStudentDetail(studentDbId),
    enabled: studentDbId > 0,
    staleTime: 30 * 1000,
  });
}

export function useCounselorStudentVerificationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      studentDbId,
      action,
    }: {
      studentDbId: number;
      action: "approve" | "reject";
    }) => updateCounselorStudentVerification(studentDbId, action),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["counselor", "divisions"] });
      queryClient.invalidateQueries({
        queryKey: ["counselor", "students", "detail", variables.studentDbId],
      });
    },
  });
}
