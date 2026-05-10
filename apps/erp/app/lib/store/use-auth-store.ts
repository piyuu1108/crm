/**
 * Auth store — Zustand store with cookie + localStorage persistence.
 *
 * Per AGENTS.md: Zustand is for UI state only. Auth state (user, roles,
 * activeRole) is treated as UI-binding state that mirrors server truth.
 * The actual source of truth is the JWT cookie validated by middleware.
 *
 * Persistence strategy:
 * - `active_role` cookie: read by middleware for SSR/edge, httpOnly=false
 * - `erp-auth` localStorage: hydrates user object on client mount
 */
import { create } from "zustand";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
  facultyCode?: string;
  profilePhoto?: string;
}

interface AuthState {
  /** Current user object (null until hydrated) */
  user: User | null;
  /** Currently active role selection */
  activeRole: string | null;
  /** Whether the store has been hydrated from persistence */
  isHydrated: boolean;

  /** Hydrate from server response. Preserves activeRole if valid. */
  hydrateUser: (user: User) => void;
  /** Set user and pick first role as active */
  setUser: (user: User | null) => void;
  /** Switch active role — persists to cookie + localStorage */
  setActiveRole: (role: string) => void;
  /** Clear all auth state + persistence */
  logout: () => void;
  /** Attempt to hydrate from localStorage (called once on mount) */
  hydrateFromStorage: () => void;
}

// ─── Cookie helpers ─────────────────────────────────────────────────────────

function setActiveRoleCookie(role: string) {
  if (typeof document === "undefined") return;
  // Set a non-httpOnly cookie so middleware can read it
  // Same expiry as auth_token (7 days)
  document.cookie = `active_role=${encodeURIComponent(role)}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
}

function clearActiveRoleCookie() {
  if (typeof document === "undefined") return;
  document.cookie = "active_role=; path=/; max-age=0; SameSite=Lax";
}

function getActiveRoleCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)active_role=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ─── localStorage helpers ───────────────────────────────────────────────────

const STORAGE_KEY = "erp-auth";

function persistToStorage(user: User, activeRole: string) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user, activeRole, timestamp: Date.now() })
    );
  } catch {
    // localStorage unavailable — degrade gracefully
  }
}

function readFromStorage(): { user: User; activeRole: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    // Validate structure
    if (
      !parsed?.user?.id ||
      !parsed?.user?.roles?.length ||
      !parsed?.activeRole
    ) {
      return null;
    }

    // Expire after 7 days (matches JWT expiry)
    const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
    if (parsed.timestamp && Date.now() - parsed.timestamp > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return { user: parsed.user, activeRole: parsed.activeRole };
  } catch {
    return null;
  }
}

function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  activeRole: null,
  isHydrated: false,

  hydrateFromStorage: () => {
    const { isHydrated } = get();
    if (isHydrated) return;

    const stored = readFromStorage();
    const cookieRole = getActiveRoleCookie();

    if (stored) {
      // Prefer cookie role if it's valid for this user
      const validRole =
        cookieRole && stored.user.roles.includes(cookieRole)
          ? cookieRole
          : stored.activeRole && stored.user.roles.includes(stored.activeRole)
            ? stored.activeRole
            : stored.user.roles[0];

      set({
        user: stored.user,
        activeRole: validRole,
        isHydrated: true,
      });

      // Sync cookie if it diverged
      if (validRole) {
        setActiveRoleCookie(validRole);
      }
    } else {
      set({ isHydrated: true });
    }
  },

  hydrateUser: (user) => {
    const { activeRole } = get();
    const cookieRole = getActiveRoleCookie();

    // Priority: current activeRole > cookie role > first available role
    const validRole =
      activeRole && user.roles.includes(activeRole)
        ? activeRole
        : cookieRole && user.roles.includes(cookieRole)
          ? cookieRole
          : user.roles[0] ?? null;

    set({ user, activeRole: validRole, isHydrated: true });

    // Persist
    if (validRole) {
      setActiveRoleCookie(validRole);
      persistToStorage(user, validRole);
    }
  },

  setUser: (user) => {
    if (!user) {
      set({ user: null, activeRole: null });
      clearActiveRoleCookie();
      clearStorage();
      return;
    }
    const activeRole = user.roles.length > 0 ? user.roles[0] : null;
    set({ user, activeRole });
    if (activeRole) {
      setActiveRoleCookie(activeRole);
      persistToStorage(user, activeRole);
    }
  },

  setActiveRole: (role) => {
    const { user } = get();

    // Validate against actual user roles
    if (user && !user.roles.includes(role)) {
      console.warn(
        `[AuthStore] Attempted to set invalid role "${role}". Valid: ${user.roles.join(", ")}`
      );
      return;
    }

    set({ activeRole: role });
    setActiveRoleCookie(role);

    if (user) {
      persistToStorage(user, role);
    }
  },

  logout: () => {
    // Keep isHydrated: true — the store IS hydrated, just empty.
    // Setting false would re-trigger AuthHydrator's loading state,
    // causing a deadlock (tries to fetch from expired session).
    set({ user: null, activeRole: null, isHydrated: true });
    clearActiveRoleCookie();
    clearStorage();
  },
}));
