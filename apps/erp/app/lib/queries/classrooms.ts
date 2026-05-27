import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithTimeout } from "@/app/lib/http";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClassroomListItem {
  id: number;
  roomCode: string;
  buildingName: string;
  floor: string;
  lectureCapacity: number;
  description: string;
  isActive: boolean;
  courseId: number;
  createdAt: string;
  totalBenches: number;
  activeBenches: number;
  physicalCapacity: number;
  hasLayout: boolean;
}

export interface ClassroomKPI {
  totalClasses: number;
  totalPhysicalCapacity: number;
  totalActiveBenches: number;
  configuredLayouts: number;
  unconfiguredLayouts: number;
}

export interface ClassroomListResponse {
  classrooms: ClassroomListItem[];
  kpi: ClassroomKPI;
}

export interface BenchItem {
  id: number;
  label: string;
  gridX: number;
  gridY: number;
  maxStudents: number;
  isActive: boolean;
  notes: string;
}

export interface ClassroomDetail {
  classroom: {
    id: number;
    roomCode: string;
    buildingName: string;
    floor: string;
    lectureCapacity: number;
    description: string;
    isActive: boolean;
    courseId: number;
    createdAt: string;
  };
  benches: BenchItem[];
  stats: {
    totalBenches: number;
    activeBenches: number;
    physicalCapacity: number;
  };
}

export interface CreateClassroomPayload {
  roomCode: string;
  buildingName?: string;
  floor: string;
  lectureCapacity: number;
  description?: string;
}

export interface SaveLayoutPayload {
  benches: {
    label: string;
    gridX: number;
    gridY: number;
    maxStudents: number;
    isActive: boolean;
  }[];
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

export async function fetchClassroomList(): Promise<ClassroomListResponse> {
  const res = await fetchWithTimeout("/api/classes", {
    credentials: "include",
    cache: "no-store",
    timeoutMs: 6000,
    timeoutMessage: "Classroom list request timed out. Please retry.",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error ?? "Unknown error from /api/classes");
  }

  return json.data as ClassroomListResponse;
}

export async function createClassroom(
  payload: CreateClassroomPayload
): Promise<ClassroomListItem> {
  const res = await fetchWithTimeout("/api/classes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
    timeoutMs: 8000,
    timeoutMessage: "Classroom creation timed out. Please retry.",
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Request failed: ${res.status}`);
  }

  return json.data as ClassroomListItem;
}

export async function fetchClassroomDetail(slug: string): Promise<ClassroomDetail> {
  const res = await fetchWithTimeout(`/api/classes/${encodeURIComponent(slug)}`, {
    credentials: "include",
    cache: "no-store",
    timeoutMs: 6000,
    timeoutMessage: "Classroom detail request timed out. Please retry.",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error ?? "Unknown error");
  }

  return json.data as ClassroomDetail;
}

export async function saveClassroomLayout(
  slug: string,
  payload: SaveLayoutPayload
): Promise<{ benches: BenchItem[]; stats: { totalBenches: number; activeBenches: number; physicalCapacity: number } }> {
  const res = await fetchWithTimeout(`/api/classes/${encodeURIComponent(slug)}/layout`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
    timeoutMs: 10000,
    timeoutMessage: "Save layout request timed out. Please retry.",
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Request failed: ${res.status}`);
  }

  return json.data;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const classroomListKey = () => ["classrooms"] as const;
export const classroomDetailKey = (slug: string) => ["classrooms", "detail", slug] as const;

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useClassroomListQuery() {
  return useQuery({
    queryKey: classroomListKey(),
    queryFn: () => fetchClassroomList(),
    staleTime: 2 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
  });
}

export function useClassroomDetailQuery(slug: string) {
  return useQuery({
    queryKey: classroomDetailKey(slug),
    queryFn: () => fetchClassroomDetail(slug),
    staleTime: 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: !!slug,
  });
}

export function useSaveLayoutMutation(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SaveLayoutPayload) => saveClassroomLayout(slug, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classroomListKey() });
      queryClient.invalidateQueries({ queryKey: classroomDetailKey(slug) });
    },
  });
}

export function useCreateClassroomMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createClassroom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classroomListKey() });
    },
  });
}
