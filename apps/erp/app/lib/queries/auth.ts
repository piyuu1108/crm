import { useQuery } from "@tanstack/react-query";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MeResponse {
  id: number;
  name: string;
  email: string;
  roles: string[];
  facultyCode?: string;
  profilePhoto?: string;
}

// ─── Fetcher ────────────────────────────────────────────────────────────────

async function fetchMe(): Promise<MeResponse> {
  // AbortController for fetch timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s network timeout

  try {
    const res = await fetch("/api/auth/me", {
      credentials: "include",
      cache: "no-store", // Never use browser HTTP cache for auth
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        (body as { error?: string }).error ?? `Request failed: ${res.status}`
      );
    }

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error ?? "Failed to fetch user info");
    }

    return json.data as MeResponse;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Session validation timed out. Please retry.");
    }
    throw err;
  }
}

// ─── Query Key ──────────────────────────────────────────────────────────────

export const authMeQueryKey = ["auth", "me"] as const;

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * TanStack Query hook for /api/auth/me.
 *
 * Used by AuthHydrator to fetch user info on mount.
 *
 * Key design decisions:
 * - staleTime: 0 — always revalidate on mount (prevents back-nav stale data)
 * - gcTime: 5min — keep in cache for dedup within same session
 * - retry: 1 — one retry, then fail fast
 * - refetchOnWindowFocus: false — hydrator handles this
 * - cache: "no-store" on fetch — prevents HTTP-level caching
 */
export function useAuthMeQuery() {
  return useQuery({
    queryKey: authMeQueryKey,
    queryFn: fetchMe,
    staleTime: 0, // Always revalidate — critical for back-navigation
    gcTime: 5 * 60 * 1000, // Keep in memory for 5 min (dedup)
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: "always", // Force refetch even if data exists in cache
  });
}
