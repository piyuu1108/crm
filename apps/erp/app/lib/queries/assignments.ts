import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithTimeout } from "@/app/lib/http";

// --- Types ---

export interface AssignedCounselor {
  facultyId: number;
  facultyName: string;
}

export interface AssignmentDivision {
  id: number;
  displayName: string;
  specialization: string;
  semesterNo: number;
  batchYear: number;
  counselors: AssignedCounselor[];
}

export interface FacultyBasic {
  id: number;
  fullName: string;
  designation: string | null;
}

export interface DivisionBasic {
  id: number;
  displayName: string;
  specialization: string;
  semesterNo: number;
  batchYear: number;
}

export interface AssignmentsResponse {
  divisions: AssignmentDivision[];
  allFaculty: FacultyBasic[];
  allDivisions: DivisionBasic[];
}

// --- Query Keys ---

export const assignmentsKeys = {
  all: ["assignments"] as const,
};

// --- Hooks ---

export function useAssignmentsQuery() {
  return useQuery<AssignmentsResponse>({
    queryKey: assignmentsKeys.all,
    queryFn: async () => {
      const res = await fetchWithTimeout("/api/admin/assignments");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch assignments");
      }
      const data = await res.json();
      return data.data;
    },
  });
}

export function useCreateAssignmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { facultyId: number; divisionId: number }) => {
      const res = await fetchWithTimeout("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to assign counselor");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentsKeys.all });
    },
  });
}

export function useDeleteAssignmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { facultyId: number; divisionId: number }) => {
      const res = await fetchWithTimeout("/api/admin/assignments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to remove assignment");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentsKeys.all });
    },
  });
}
