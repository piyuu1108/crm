/**
 * Client-side permission hooks — wraps the centralized permission matrix
 * with Zustand auth store for reactive React components.
 *
 * Usage:
 *   const canCreate = usePermission("circulars.create");
 *   const isFaculty = useIsFacultyLike();
 */
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import {
  hasPermission,
  hasAnyPermission,
  anyRoleHasPermission,
  isFacultyLikeRole,
  isAdminTableRole,
  type Permission,
} from "@/app/lib/permissions";

/** Check a single permission against the active role */
export function usePermission(permission: Permission): boolean {
  const { activeRole } = useAuthStore();
  if (!activeRole) return false;
  return hasPermission(activeRole, permission);
}

/** Check if activeRole has ANY of the given permissions */
export function useAnyPermission(permissions: Permission[]): boolean {
  const { activeRole } = useAuthStore();
  if (!activeRole) return false;
  return hasAnyPermission(activeRole, permissions);
}

/**
 * Fallback check: does any role in the user's role list grant this permission?
 * Useful when activeRole may not be set yet (e.g. profile page initial load).
 */
export function useAnyRolePermission(permission: Permission): boolean {
  const { user, activeRole } = useAuthStore();
  if (activeRole) return hasPermission(activeRole, permission);
  if (!user) return false;
  return anyRoleHasPermission(user.roles, permission);
}

/** Check if activeRole is a faculty-like role (faculty, counselor, hod, principal, vice_principal) */
export function useIsFacultyLike(): boolean {
  const { activeRole } = useAuthStore();
  if (!activeRole) return false;
  return isFacultyLikeRole(activeRole);
}

/** Check if activeRole uses the administrators table (principal, vice_principal) */
export function useIsAdminTable(): boolean {
  const { activeRole } = useAuthStore();
  if (!activeRole) return false;
  return isAdminTableRole(activeRole);
}
