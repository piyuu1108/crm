import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithTimeout } from "@/app/lib/http";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InternalExam {
  id: number;
  semesterId: number;
  examName: string;
  examNumber: number;
  targetType: string;
  targetYear: number | null;
  targetDivisionId: number | null;
  createdByFacultyId: number;
  createdAt: string;
}

export interface InternalExamMark {
  id: number;
  internalExamId: number;
  assignmentId: number;
  studentId: number;
  theoryMarks: string | null;
  practicalMarks: string | null;
  isDraft: boolean;
  isVisible: boolean;
  studentName: string;
  subjectName: string;
  divisionName: string;
  updatedByFacultyId: number | null;
  updatedAt: string;
}

export interface InternalEvaluation {
  id: number;
  assignmentId: number;
  studentId: number;
  semesterId: number;
  finalTheoryMarks: string | null;
  finalPracticalMarks: string | null;
  isFinalized: boolean;
  studentName: string;
  subjectName: string;
  subjectType: string;
  divisionName: string;
  finalizedByFacultyId: number | null;
  finalizedAt: string | null;
  updatedByFacultyId: number | null;
  updatedAt: string;
}

export interface StudentInfo {
  id: number;
  fullName: string;
  studentId: string | null;
  enrollmentId: string | null;
}

export interface MaxMarks {
  theory: number | null;
  practical: number | null;
}

export interface AssignmentInfo {
  id: number;
  subjectId: number;
  subjectName: string;
  subjectType: string;
  divisionId: number;
  divisionName: string;
}

export interface StudentVisibleMark {
  id: number;
  examId: number;
  subjectName: string;
  theoryMarks: string | null;
  practicalMarks: string | null;
  divisionName: string;
  assignmentId: number;
  examName: string;
  examNumber: number;
  maxTheory: number | null;
  maxPractical: number | null;
  subjectType: string;
}

export interface ExportRow {
  [key: string]: unknown;
}

export interface ExportPreview {
  rows: ExportRow[];
  errors: string[];
  validCount: number;
  totalCount: number;
  exams: { id: number; examName: string; examNumber: number }[];
  subjectType: string;
  subjectCode: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const internalExamKeys = {
  all: ["internal-exams"] as const,
  list: ["internal-exams", "list"] as const,
  marks: (examId: number, assignmentId: number) =>
    ["internal-exams", "marks", examId, assignmentId] as const,
  studentMarks: ["internal-exams", "student-marks"] as const,
  evaluation: (assignmentId: number) =>
    ["internal-evaluation", assignmentId] as const,
  exportPreview: (assignmentId: number) =>
    ["internal-evaluation", "export", assignmentId] as const,
};

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchExams() {
  const res = await fetchWithTimeout(
    `/api/internal-exams`,
    { credentials: "include", cache: "no-store", timeoutMs: 6000 }
  );
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to fetch exams");
  return json.data as { exams: InternalExam[]; semesterId: number };
}

async function fetchMarks(examId: number, assignmentId: number) {
  const res = await fetchWithTimeout(
    `/api/internal-exams/marks?examId=${examId}&assignmentId=${assignmentId}`,
    { credentials: "include", cache: "no-store", timeoutMs: 8000 }
  );
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to fetch marks");
  return json.data as {
    marks: InternalExamMark[];
    students: StudentInfo[];
    assignment: AssignmentInfo;
    maxMarks: MaxMarks;
  };
}

async function fetchStudentMarks() {
  const res = await fetchWithTimeout(
    `/api/internal-exams/student-marks`,
    { credentials: "include", cache: "no-store", timeoutMs: 6000 }
  );
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to fetch marks");
  return json.data as { marks: StudentVisibleMark[] };
}

async function fetchEvaluation(assignmentId: number) {
  const res = await fetchWithTimeout(
    `/api/internal-evaluation?assignmentId=${assignmentId}`,
    { credentials: "include", cache: "no-store", timeoutMs: 8000 }
  );
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to fetch evaluation");
  return json.data as {
    assignment: AssignmentInfo;
    exams: InternalExam[];
    rawMarks: InternalExamMark[];
    evaluations: InternalEvaluation[];
    students: StudentInfo[];
    maxMarks: MaxMarks;
    semesterId: number;
  };
}

async function fetchExportPreview(assignmentId: number) {
  const res = await fetchWithTimeout(
    `/api/internal-evaluation/export?assignmentId=${assignmentId}`,
    { credentials: "include", cache: "no-store", timeoutMs: 10000 }
  );
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to fetch export preview");
  return json.data as ExportPreview;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

async function createExam(data: {
  examName: string;
  examNumber: number;
  targetType: string;
  targetYear?: number;
  targetDivisionId?: number;
  semesterId?: number;
}) {
  const res = await fetchWithTimeout("/api/internal-exams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
    timeoutMs: 8000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to create exam");
  return json.data as InternalExam;
}

async function updateExam(id: number, data: Partial<InternalExam>) {
  const res = await fetchWithTimeout(`/api/internal-exams/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
    timeoutMs: 8000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to update exam");
  return json.data as InternalExam;
}

async function deleteExam(id: number) {
  const res = await fetchWithTimeout(`/api/internal-exams/${id}`, {
    method: "DELETE",
    credentials: "include",
    timeoutMs: 8000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to delete exam");
  return json.data;
}

async function saveMarks(data: {
  examId: number;
  assignmentId: number;
  isDraft: boolean;
  records: {
    studentId: number;
    theoryMarks: number | null;
    practicalMarks: number | null;
    studentName: string;
    subjectName: string;
    divisionName: string;
  }[];
}) {
  const res = await fetchWithTimeout("/api/internal-exams/marks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
    timeoutMs: 15000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to save marks");
  return json.data as { saved: number };
}

async function toggleVisibility(data: {
  examId: number;
  assignmentId: number;
  isVisible: boolean;
}) {
  const res = await fetchWithTimeout("/api/internal-exams/marks/visibility", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
    timeoutMs: 8000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to toggle visibility");
  return json.data;
}

async function saveEvaluation(data: {
  assignmentId: number;
  semesterId: number;
  records: {
    studentId: number;
    finalTheoryMarks: number | null;
    finalPracticalMarks: number | null;
    studentName: string;
    subjectName: string;
    subjectType: string;
    divisionName: string;
  }[];
}) {
  const res = await fetchWithTimeout("/api/internal-evaluation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
    timeoutMs: 15000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to save evaluation");
  return json.data as { saved: number };
}

async function toggleFinalize(data: {
  assignmentId: number;
  semesterId: number;
  finalize: boolean;
}) {
  const res = await fetchWithTimeout("/api/internal-evaluation/finalize", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
    timeoutMs: 8000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to update finalization");
  return json.data;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** List all internal exams (API resolves active semester) */
export function useInternalExamsQuery() {
  return useQuery({
    queryKey: internalExamKeys.list,
    queryFn: fetchExams,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

/** Fetch marks for a specific exam + assignment */
export function useExamMarksQuery(examId: number, assignmentId: number) {
  return useQuery({
    queryKey: internalExamKeys.marks(examId, assignmentId),
    queryFn: () => fetchMarks(examId, assignmentId),
    staleTime: 30 * 1000,
    retry: 1,
    enabled: examId > 0 && assignmentId > 0,
  });
}

/** Student self-view marks */
export function useStudentMarksQuery() {
  return useQuery({
    queryKey: internalExamKeys.studentMarks,
    queryFn: fetchStudentMarks,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

/** Evaluation data for an assignment */
export function useEvaluationQuery(assignmentId: number) {
  return useQuery({
    queryKey: internalExamKeys.evaluation(assignmentId),
    queryFn: () => fetchEvaluation(assignmentId),
    staleTime: 30 * 1000,
    retry: 1,
    enabled: assignmentId > 0,
  });
}

/** CSV export preview */
export function useExportPreviewQuery(assignmentId: number) {
  return useQuery({
    queryKey: internalExamKeys.exportPreview(assignmentId),
    queryFn: () => fetchExportPreview(assignmentId),
    staleTime: 30 * 1000,
    retry: 1,
    enabled: assignmentId > 0,
  });
}

/** Create exam */
export function useCreateExamMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createExam,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: internalExamKeys.all });
    },
  });
}

/** Update exam */
export function useUpdateExamMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<InternalExam>) =>
      updateExam(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: internalExamKeys.all });
    },
  });
}

/** Delete exam */
export function useDeleteExamMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteExam,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: internalExamKeys.all });
    },
  });
}

/** Save marks */
export function useSaveMarksMutation(examId: number, assignmentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveMarks,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: internalExamKeys.marks(examId, assignmentId) });
    },
  });
}

/** Toggle visibility */
export function useToggleVisibilityMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: toggleVisibility,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: internalExamKeys.marks(variables.examId, variables.assignmentId),
      });
    },
  });
}

/** Save evaluation */
export function useSaveEvaluationMutation(assignmentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveEvaluation,
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: internalExamKeys.evaluation(assignmentId),
      });
    },
  });
}

/** Finalize / un-finalize */
export function useFinalizeMutation(assignmentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: toggleFinalize,
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: internalExamKeys.evaluation(assignmentId),
      });
    },
  });
}
