import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithTimeout } from "@/app/lib/http";

export interface Notification {
  id: number;
  title: string;
  message: string;
  notificationType: string;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  createdBy: number | null;
  receiverUserId: number;
  receiverRole: string;
  priority: "low" | "medium" | "high";
  isRead: boolean;
  createdAt: string;
  metadata: string | null;
}

export interface NotificationsParams {
  isRead?: string;
  priority?: string;
  notificationType?: string;
  search?: string;
  dateRange?: string;
  limit?: number;
  offset?: number;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    totalPages: number;
  };
  metrics: {
    total: number;
    unread: number;
    read: number;
    highPriority: number;
    today: number;
    recentActivitySummary: string;
  };
}

export async function fetchNotifications(
  params: NotificationsParams,
  activeRole: string | null
): Promise<NotificationsResponse> {
  const headers: Record<string, string> = {};
  if (activeRole) {
    headers["X-Active-Role"] = activeRole;
  }

  const queryParams = new URLSearchParams();
  if (params.isRead !== undefined) queryParams.set("isRead", params.isRead);
  if (params.priority) queryParams.set("priority", params.priority);
  if (params.notificationType) queryParams.set("notificationType", params.notificationType);
  if (params.search) queryParams.set("search", params.search);
  if (params.dateRange) queryParams.set("dateRange", params.dateRange);
  if (params.limit !== undefined) queryParams.set("limit", String(params.limit));
  if (params.offset !== undefined) queryParams.set("offset", String(params.offset));

  const queryString = queryParams.toString();
  const url = `/api/notifications${queryString ? `?${queryString}` : ""}`;

  const res = await fetchWithTimeout(url, {
    headers,
    credentials: "include",
    cache: "no-store",
    timeoutMs: 6000,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }

  return body.data;
}

export function useNotificationsQuery(params: NotificationsParams, activeRole: string | null) {
  return useQuery({
    queryKey: ["notifications", activeRole, params],
    queryFn: () => fetchNotifications(params, activeRole),
  });
}

export function useMarkNotificationsReadMutation(activeRole: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { ids?: number[]; all?: boolean }) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (activeRole) {
        headers["X-Active-Role"] = activeRole;
      }

      const res = await fetchWithTimeout("/api/notifications", {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to mark notifications as read");
      }
      return body.data;
    },
    onSuccess: () => {
      // Invalidate notifications queries to fetch updated read states
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      // Also invalidate dashboard since dashboard count metrics might depend on it
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCreateNotificationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      title: string;
      message: string;
      notificationType: string;
      receiverUserId: string | number;
      receiverRole: string;
      priority?: string;
      relatedEntityType?: string;
      relatedEntityId?: number;
      metadata?: any;
    }) => {
      const res = await fetchWithTimeout("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to trigger notification");
      }
      return body.data;
    },
    onSuccess: () => {
      // Invalidate notifications query to load the simulated notification immediately
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
