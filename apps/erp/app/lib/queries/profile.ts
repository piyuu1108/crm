/**
 * TanStack Query hooks for student profile completion.
 *
 * Per AGENTS.md: mandatory for all API interactions,
 * no direct fetch in components.
 */
import type { StudentAddressData } from "@/app/lib/validations/profile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProfileData {
  id: number;
  tempId: string | null;
  studentId: string | null;
  spid: string | null;
  enrollmentId: string | null;
  abcId: string | null;
  fullName: string;
  dob: string | null;
  gender: string | null;
  bloodGroup: string | null;
  email: string;
  mobile: string | null;
  parentMobile: string | null;
  optionalMobile: string | null;
  address: StudentAddressData | null;
  aadhaarStudent: string | null;
  aadhaarParent: string | null;
  courseId: number;
  category: string | null;
  board: string | null;
  twelfthPercent: string | null;
  twelfthStream: string | null;
  schoolName: string | null;
  udiseCode: string | null;
  entryType: string;
  entrySemesterNo: number;
  currentSemesterNo: number | null;
  currentDivisionName: string | null;
  status: string;
  profilePhoto: string | null;
  profileStep: number;
  profileStatus: string;
  courseName: string;
  courseCode: string;
  documents: Record<string, string>;
}

export interface StepSaveResult {
  profileStep: number;
}

export interface UploadUrlResult {
  uploadUrl: string;
  fileKey: string;
}

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const profileQueryKey = ["student", "profile"] as const;

// ─── Fetchers ───────────────────────────────────────────────────────────────

async function fetchProfile(): Promise<ProfileData> {
  const res = await fetch("/api/student/profile", {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error ?? "Failed to fetch profile");
  }

  return json.data as ProfileData;
}

async function saveStepData(step: number, data: Record<string, unknown>): Promise<StepSaveResult> {
  const res = await fetch("/api/student/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ step, data }),
  });

  const json = await res.json();
  if (!json.success) {
    // Attach validation errors if present
    const err = new Error(json.error ?? "Failed to save step data") as Error & { errors?: unknown[] };
    if (json.errors) err.errors = json.errors;
    throw err;
  }

  return json.data as StepSaveResult;
}

async function submitProfile(): Promise<{ profileStatus: string }> {
  const res = await fetch("/api/student/profile/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  const json = await res.json();
  if (!json.success) {
    const err = new Error(json.error ?? "Failed to submit profile") as Error & { errors?: unknown[] };
    if (json.errors) err.errors = json.errors;
    throw err;
  }

  return json.data;
}

async function requestUploadUrl(
  docType: string,
  contentType: string,
  fileSize: number
): Promise<UploadUrlResult> {
  const res = await fetch("/api/student/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ docType, contentType, fileSize }),
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error ?? "Failed to get upload URL");
  }

  return json.data as UploadUrlResult;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Fetch the student's full profile data.
 * Used on mount to hydrate the stepper and resume from last step.
 */
export function useProfileQuery() {
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: fetchProfile,
    staleTime: 30_000, // 30 seconds — profile data doesn't change externally
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Save data for a specific step (1-4).
 * Invalidates the profile cache on success.
 */
export function useSaveStepMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ step, data }: { step: number; data: Record<string, unknown> }) =>
      saveStepData(step, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileQueryKey });
    },
  });
}

/**
 * Final submit — marks profile as complete.
 * Invalidates both profile and auth caches.
 */
export function useSubmitProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileQueryKey });
      // Also invalidate auth/me so navbar can reflect updated status
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

/**
 * Request a presigned upload URL for a document.
 */
export function useUploadUrlMutation() {
  return useMutation({
    mutationFn: ({ docType, contentType, fileSize }: { docType: string; contentType: string; fileSize: number }) =>
      requestUploadUrl(docType, contentType, fileSize),
  });
}

/**
 * Upload a file directly to S3/R2 using a presigned URL.
 * This is a standalone helper, not a TanStack mutation — it's used
 * imperatively inside the document step component.
 */
export async function uploadFileToStorage(
  file: File,
  uploadUrl: string
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
      "Content-Length": String(file.size),
    },
    body: file,
  });

  if (!res.ok) {
    throw new Error(`Upload failed with status ${res.status}`);
  }
}
