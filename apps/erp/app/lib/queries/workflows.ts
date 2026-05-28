import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithTimeout } from "@/app/lib/http";

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const workflowKeys = {
  all: ["workflows"] as const,
  requestsList: (role: string | null, statusFilter: string, page: number) => ["workflows", "requests", "list", role, statusFilter, page] as const,
  requestDetail: (id: number) => ["workflows", "requests", "detail", id] as const,
  facultySearch: () => ["workflows", "faculty-search"] as const,
  approvalsList: (role: string | null) => ["workflows", "approvals", "list", role] as const,
  approvalDetail: (id: number | null) => ["workflows", "approvals", "detail", id] as const,
  availableProxies: (date: string, slotId: number) =>
    ["workflows", "approvals", "proxies", date, slotId] as const,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RequestData {
  id: number;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  targetFacultyName: string;
  studentName?: string;
  divisionName?: string;
  requestType?: string;
  attachmentUrl?: string;
  attachmentType?: string;
  attachmentSize?: number;
  targetFacultyId?: number;
  remarks?: string;
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchRequestsList(role: string | null, statusFilter: string, page: number, limit: number = 15) {
  const isStudent = role === "student";
  const apiUrl = isStudent ? "/api/requests" : "/api/requests/faculty";

  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String((page - 1) * limit));
  if (statusFilter !== "all") params.set("status", statusFilter);

  const res = await fetchWithTimeout(`${apiUrl}?${params}`, {
    credentials: "include",
    cache: "no-store",
    timeoutMs: 8000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to fetch requests");
  return json as any;
}

async function fetchRequestDetail(id: number) {
  const res = await fetchWithTimeout(`/api/requests/${id}`, {
    credentials: "include",
    cache: "no-store",
    timeoutMs: 8000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to fetch request detail");
  return json as any;
}

async function fetchFacultySearch() {
  const res = await fetchWithTimeout("/api/requests/faculty-search", {
    credentials: "include",
    cache: "no-store",
    timeoutMs: 8000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to fetch faculty list");
  return json as any;
}

async function updateRequestStatus(id: number, status: "approved" | "rejected") {
  const res = await fetchWithTimeout(`/api/requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status }),
    timeoutMs: 8000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to update status");
  return json as any;
}

async function createRequestWithUpload(payload: {
  subject: string;
  description: string;
  targetFacultyId: number | null;
  file: File | null;
}) {
  let attachmentUrl = null;
  let attachmentType = null;
  let attachmentSize = null;

  // 1. Handle file upload if present
  if (payload.file) {
    const urlRes = await fetchWithTimeout("/api/student/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        docType: "request_attachment",
        contentType: payload.file.type,
        fileSize: payload.file.size,
      }),
      timeoutMs: 10000,
    });
    
    const urlJson = await urlRes.json();
    if (!urlRes.ok || !urlJson.success) {
      throw new Error(urlJson.error ?? "Failed to get upload URL");
    }

    const { uploadUrl, fileKey } = urlJson.data;

    // Direct PUT to S3/MinIO (we bypass JSON unpacking here)
    const uploadRes = await fetchWithTimeout(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": payload.file.type },
      body: payload.file,
      timeoutMs: 60000, // 60s timeout for large uploads
    });

    if (!uploadRes.ok) {
      throw new Error("Failed to upload file to storage server");
    }

    attachmentUrl = fileKey;
    attachmentType = payload.file.type;
    attachmentSize = payload.file.size;
  }

  // 2. Create actual request
  const res = await fetchWithTimeout("/api/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      subject: payload.subject.trim(),
      description: payload.description.trim(),
      targetFacultyId: payload.targetFacultyId,
      requestType: "general",
      attachmentUrl,
      attachmentType,
      attachmentSize,
    }),
    timeoutMs: 10000,
  });

  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to create request");
  return json as any;
}

// ─── Approvals Fetchers ───────────────────────────────────────────────────────

async function fetchApprovalsList() {
  const res = await fetchWithTimeout("/api/approvals/list", {
    credentials: "include",
    cache: "no-store",
    timeoutMs: 8000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to fetch approvals list");
  return json as any;
}

async function fetchApprovalDetail(id: number) {
  const res = await fetchWithTimeout(`/api/approvals/list?id=${id}`, {
    credentials: "include",
    cache: "no-store",
    timeoutMs: 8000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to fetch request detail");
  return json as any;
}

async function fetchAvailableProxies(date: string, slotId: number) {
  const res = await fetchWithTimeout(`/api/approvals/proxies/available?date=${date}&slotId=${slotId}`, {
    credentials: "include",
    cache: "no-store",
    timeoutMs: 8000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to fetch available proxies");
  return json as any;
}

async function executeApprovalAction(payload: {
  requestId: number;
  action: "approve" | "reject";
  remarks: string;
  proxyOverrides: { proxyId: number; newProxyFacultyId: number }[];
}) {
  const res = await fetchWithTimeout("/api/approvals/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
    timeoutMs: 15000,
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? "Approval action failed");
  return json as any;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useRequestsQuery(role: string | null, statusFilter: string, page: number) {
  return useQuery({
    queryKey: workflowKeys.requestsList(role, statusFilter, page),
    queryFn: () => fetchRequestsList(role, statusFilter, page),
    staleTime: 60 * 1000,
    enabled: !!role,
  });
}

export function useRequestDetailQuery(id: number) {
  return useQuery({
    queryKey: workflowKeys.requestDetail(id),
    queryFn: () => fetchRequestDetail(id),
    staleTime: 60 * 1000,
    enabled: !isNaN(id) && id > 0,
  });
}

export function useFacultySearchQuery() {
  return useQuery({
    queryKey: workflowKeys.facultySearch(),
    queryFn: fetchFacultySearch,
    staleTime: 5 * 60 * 1000, // Cache faculty list for 5 minutes
  });
}

export function useCreateRequestMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createRequestWithUpload,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows", "requests"] });
    },
  });
}

export function useUpdateRequestStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: "approved" | "rejected" }) =>
      updateRequestStatus(id, status),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: workflowKeys.requestDetail(variables.id) });
      qc.invalidateQueries({ queryKey: ["workflows", "requests", "list"] });
    },
  });
}

export function useApprovalsListQuery(role: string | null, isHydrated: boolean) {
  return useQuery({
    queryKey: workflowKeys.approvalsList(role),
    queryFn: fetchApprovalsList,
    staleTime: 60 * 1000,
    enabled: isHydrated && !!role,
  });
}

export function useApprovalDetailQuery(requestId: number | null) {
  return useQuery({
    queryKey: workflowKeys.approvalDetail(requestId),
    queryFn: () => fetchApprovalDetail(requestId!),
    staleTime: 60 * 1000,
    enabled: !!requestId,
  });
}

export function useAvailableProxiesQuery(date: string, slotId: number) {
  return useQuery({
    queryKey: workflowKeys.availableProxies(date, slotId),
    queryFn: () => fetchAvailableProxies(date, slotId),
    staleTime: 60 * 1000,
    enabled: !!date && !!slotId,
  });
}

export function useApprovalActionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: executeApprovalAction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows", "approvals"] });
    },
  });
}
