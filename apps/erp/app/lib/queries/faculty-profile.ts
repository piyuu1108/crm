import type { FacultyAddress } from "@/app/lib/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authMeQueryKey } from "./auth";

export interface FacultyProfileData {
  id: number;
  facultyCode: string;
  email: string;
  fullName: string;
  dob: string | null;
  gender: string | null;
  mobile: string | null;
  alternateMobile: string | null;
  address: FacultyAddress | null;
  qualification: string | null;
  experienceYears: number | null;
  specialization: string | null;
  designation: string | null;
  profilePhotoUrl: string | null;
  profileStep: number;
  profileCompletion: string;
}

export const facultyProfileQueryKey = ["faculty", "profile"] as const;

interface StepSaveResult {
  profileStep: number;
}

interface UploadUrlResult {
  uploadUrl: string;
  fileKey: string;
}

async function fetchFacultyProfile(): Promise<FacultyProfileData> {
  const res = await fetch("/api/faculty/profile", {
    credentials: "include",
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to fetch faculty profile");
  }
  return json.data as FacultyProfileData;
}

async function saveFacultyStepData(
  step: number,
  data: Record<string, unknown>
): Promise<StepSaveResult> {
  console.log(`[saveFacultyStepData] Step ${step} payload:`, data);
  const res = await fetch("/api/faculty/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ step, data }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    console.error(`[saveFacultyStepData] Step ${step} failed:`, json);
    const err = new Error(json.error ?? "Failed to save step data") as Error & {
      errors?: unknown[];
    };
    if (json.errors) err.errors = json.errors;
    throw err;
  }
  return json.data as StepSaveResult;
}

async function submitFacultyProfile(): Promise<{ profileCompletion: string }> {
  const res = await fetch("/api/faculty/profile/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    console.error("[submitFacultyProfile] Submit failed:", json);
    const err = new Error(json.error ?? "Failed to submit profile") as Error & {
      errors?: unknown[];
    };
    if (json.errors) err.errors = json.errors;
    throw err;
  }
  return json.data;
}

async function requestFacultyUploadUrl(
  docType: string,
  contentType: string,
  fileSize: number
): Promise<UploadUrlResult> {
  const res = await fetch("/api/faculty/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ docType, contentType, fileSize }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Failed to get upload URL");
  }
  return json.data as UploadUrlResult;
}

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

export function useFacultyProfileQuery() {
  return useQuery({
    queryKey: facultyProfileQueryKey,
    queryFn: fetchFacultyProfile,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useSaveFacultyStepMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ step, data }: { step: number; data: Record<string, unknown> }) =>
      saveFacultyStepData(step, data),
    onSuccess: (result, variables) => {
      // Optimistically update cache with new profileStep so the UI doesn't flash
      queryClient.setQueryData<FacultyProfileData>(
        facultyProfileQueryKey,
        (old) => {
          if (!old) return old;
          const updated = { ...old, profileStep: result.profileStep };
          // Merge the step data into the cache to reflect changes immediately
          if (variables.step === 1) {
            const d = variables.data as { fullName?: string; dob?: string; gender?: string };
            updated.fullName = d.fullName ?? old.fullName;
            updated.dob = d.dob ?? old.dob;
            updated.gender = d.gender ?? old.gender;
          } else if (variables.step === 2) {
            const d = variables.data as {
              mobile?: string;
              alternateMobile?: string;
              address?: FacultyAddress;
            };
            updated.mobile = d.mobile ?? old.mobile;
            updated.alternateMobile = d.alternateMobile ?? old.alternateMobile;
            updated.address = d.address ?? old.address;
          } else if (variables.step === 3) {
            const d = variables.data as {
              qualification?: string;
              experienceYears?: string | number;
              specialization?: string;
              designation?: string;
            };
            updated.qualification = d.qualification ?? old.qualification;
            updated.experienceYears =
              d.experienceYears != null ? Number(d.experienceYears) : old.experienceYears;
            updated.specialization = d.specialization ?? old.specialization;
            updated.designation = d.designation ?? old.designation;
          } else if (variables.step === 4) {
            const d = variables.data as { profilePhotoUrl?: string };
            updated.profilePhotoUrl = d.profilePhotoUrl ?? old.profilePhotoUrl;
          }
          return updated;
        }
      );
      // Background refetch to ensure cache matches server
      queryClient.invalidateQueries({ queryKey: facultyProfileQueryKey });
      // After step 4 (photo upload), also refresh auth/me so navbar picks up the new photo
      if (variables.step === 4) {
        queryClient.invalidateQueries({ queryKey: authMeQueryKey });
      }
    },
  });
}

export function useSubmitFacultyProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitFacultyProfile,
    onSuccess: () => {
      // Mark profile as complete in cache immediately
      queryClient.setQueryData<FacultyProfileData>(
        facultyProfileQueryKey,
        (old) => {
          if (!old) return old;
          return { ...old, profileCompletion: "complete", profileStep: 5 };
        }
      );
      queryClient.invalidateQueries({ queryKey: facultyProfileQueryKey });
      queryClient.invalidateQueries({ queryKey: authMeQueryKey });
    },
  });
}

export function useFacultyUploadUrlMutation() {
  return useMutation({
    mutationFn: ({
      docType,
      contentType,
      fileSize,
    }: {
      docType: string;
      contentType: string;
      fileSize: number;
    }) => requestFacultyUploadUrl(docType, contentType, fileSize),
  });
}
