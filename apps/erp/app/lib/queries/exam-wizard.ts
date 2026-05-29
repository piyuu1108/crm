import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithTimeout } from "@/app/lib/http";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExamDraft {
  id: number;
  semesterId: number;
  academicYearId: number | null;
  examName: string;
  examNumber: number;
  description: string | null;
  examType: string;
  status: string;
  completedStep: number;
  targetType: string;
  createdByFacultyId: number;
  createdAt: string;
  updatedAt: string;
  divisionCount?: number;
  subjectCount?: number;
}

export interface ExamScope {
  id: number;
  examId: number;
  divisionId: number;
  yearLabel: number;
  displayName: string;
  semesterNo: number;
  batchYear: number;
  specialization: string;
  studentCount: number;
}

export interface ExamEligibilityRule {
  id: number;
  examId: number;
  yearLabel: number;
  minAttendancePercent: number;
  allowApprovalOverride: boolean;
  approvalDeadline: string | null;
}

export interface ExamSubjectItem {
  id: number;
  examId: number;
  subjectId: number;
  durationMinutes: number;
  subjectName: string;
  subjectCode: string;
  shortCode: string;
  subjectType: string;
  credit: number;
  semester: number;
}

export interface ExamScheduleItem {
  id: number;
  examId: number;
  examDate: string;
  startTime: string;
  endTime: string;
  examSubjectId: number;
}

export interface ExamHallItem {
  id: number;
  examId: number;
  classroomId: number;
  sequenceOrder: number;
  roomCode: string;
  floor: string;
  lectureCapacity: number;
  totalBenches: number;
  benchCapacity: number;
}

export interface ExamSummary {
  totalStudents: number;
  divisionCount: number;
  subjectCount: number;
  years: number[];
  scheduledCount: number;
  hallCount: number;
}

export interface ExamDraftDetail {
  exam: ExamDraft;
  scopes: ExamScope[];
  eligibility: ExamEligibilityRule[];
  subjects: ExamSubjectItem[];
  schedules: ExamScheduleItem[];
  halls: ExamHallItem[];
  summary: ExamSummary;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const examWizardKeys = {
  all: ["exam-wizard"] as const,
  list: ["exam-wizard", "list"] as const,
  detail: (id: number) => ["exam-wizard", "detail", id] as const,
  scopeData: ["exam-wizard", "scope-data"] as const,
};

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchExamList() {
  const res = await fetchWithTimeout("/api/exam-wizard", {
    credentials: "include",
    cache: "no-store",
    timeoutMs: 8000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to fetch exams");
  return json.data as { exams: ExamDraft[]; semesterId: number };
}

async function fetchExamDetail(id: number) {
  const res = await fetchWithTimeout(`/api/exam-wizard/${id}`, {
    credentials: "include",
    cache: "no-store",
    timeoutMs: 10000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to fetch exam");
  return json.data as ExamDraftDetail;
}

async function createDraft(data: {
  examName: string;
  examNumber: number;
  description?: string;
  examType?: string;
}) {
  const res = await fetchWithTimeout("/api/exam-wizard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
    timeoutMs: 8000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to create draft");
  return json.data as ExamDraft;
}

async function updateStep1(id: number, data: {
  examName: string;
  examNumber: number;
  description?: string;
  examType?: string;
}) {
  const res = await fetchWithTimeout(`/api/exam-wizard/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
    timeoutMs: 8000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to save");
  return json.data as ExamDraft;
}

async function saveStep(id: number, step: string, data: unknown) {
  const res = await fetchWithTimeout(`/api/exam-wizard/${id}/${step}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
    timeoutMs: 10000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to save");
  return json.data;
}

async function publishExam(id: number) {
  const res = await fetchWithTimeout(`/api/exam-wizard/${id}/publish`, {
    method: "POST",
    credentials: "include",
    timeoutMs: 10000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    const err = new Error(json.error ?? "Failed to publish") as Error & { errors?: string[] };
    if (json.errors) err.errors = json.errors;
    throw err;
  }
  return json.data as ExamDraft;
}

async function deleteDraft(id: number) {
  const res = await fetchWithTimeout(`/api/exam-wizard/${id}`, {
    method: "DELETE",
    credentials: "include",
    timeoutMs: 8000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to delete");
  return json.data;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useExamWizardListQuery() {
  return useQuery({
    queryKey: examWizardKeys.list,
    queryFn: fetchExamList,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function useExamWizardDetailQuery(id: number) {
  return useQuery({
    queryKey: examWizardKeys.detail(id),
    queryFn: () => fetchExamDetail(id),
    staleTime: 30 * 1000,
    retry: 1,
    enabled: id > 0,
  });
}

export function useCreateDraftMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createDraft,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: examWizardKeys.all });
    },
  });
}

export function useUpdateStep1Mutation(examId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof updateStep1>[1]) => updateStep1(examId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: examWizardKeys.detail(examId) });
    },
  });
}

export function useSaveStepMutation(examId: number, step: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => saveStep(examId, step, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: examWizardKeys.detail(examId) });
    },
  });
}

export function usePublishExamMutation(examId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => publishExam(examId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: examWizardKeys.all });
    },
  });
}

export function useDeleteDraftMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteDraft,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: examWizardKeys.all });
    },
  });
}
