# RBAC Centralization — Implementation Plan

> Migrate from ~30+ scattered `roles.includes()` / `activeRole === "..."` checks to a centralized **Permission Matrix** architecture.

---

## Executive Summary

The ERP currently has **6 distinct role-check patterns** duplicated across **~35 files** (APIs, pages, components, hooks). This plan introduces a single `permissions.ts` module that maps roles → permissions, a `hasPermission()` utility for both server and client, and a phased file-by-file migration.

**Estimated effort:** 4 phases, ~3-4 days of focused work.

---

## Architecture Design

### Target State

```
┌──────────────────────────────────────────────────┐
│              app/lib/permissions.ts               │
│                                                   │
│  ROLE_PERMISSIONS: Record<Role, Permission[]>     │
│  hasPermission(roles, activeRole, permission)     │
│  hasAnyPermission(roles, activeRole, perms[])     │
│  ROLE_GROUPS (isFacultyLike, isGlobalAdmin, etc.) │
└──────────────┬───────────────────┬────────────────┘
               │                   │
     ┌─────────▼──────┐  ┌────────▼─────────┐
     │  Server (API)  │  │  Client (React)  │
     │                │  │                   │
     │ requirePerm()  │  │ usePermission()   │
     │ in api-auth.ts │  │ hook wrapping     │
     │                │  │ useAuthStore +    │
     │                │  │ hasPermission()   │
     └────────────────┘  └──────────────────┘
```

### Permission Naming Convention

```
<domain>.<action>

Examples:
  dashboard.view
  circulars.create
  circulars.delete_any
  requests.review
  timetable.manage
  attendance.mark
  admin.divisions
  profile.edit_faculty
  s3.view_student_files
```

---

## Phase 0: Foundation — `permissions.ts` Module
**Risk: None (additive only, no existing code changed)**

### Task 0.1 — Create `app/lib/permissions.ts`

```typescript
// app/lib/permissions.ts

export const ROLES = [
  "student", "faculty", "counselor", "hod",
  "principal", "vice_principal"
] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  // ── Dashboard ──
  "dashboard.view",
  "dashboard.view_admin",

  // ── Circulars ──
  "circulars.view",
  "circulars.create",
  "circulars.delete_own",
  "circulars.delete_any",

  // ── Requests ──
  "requests.create",
  "requests.view_own",
  "requests.view_assigned",
  "requests.view_all",
  "requests.review",

  // ── Timetable ──
  "timetable.view_own",
  "timetable.view_any",
  "timetable.manage",
  "timetable.publish",

  // ── Attendance ──
  "attendance.view",
  "attendance.mark",
  "attendance.view_division",

  // ── Subjects ──
  "subjects.view_own",
  "subjects.view_course",

  // ── Profile ──
  "profile.edit_student",
  "profile.edit_faculty",

  // ── Admin ──
  "admin.divisions",
  "admin.faculty",
  "admin.subjects",
  "admin.assignments",

  // ── S3 / Files ──
  "s3.view_own_files",
  "s3.view_student_files",
  "s3.view_faculty_files",
  "s3.view_any_files",
  "s3.upload_faculty",

  // ── Internal Exams ──
  "exams.view",
  "exams.evaluate",
  "exams.export",
  "exams.reports",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/**
 * The single source of truth: Role → Permission mapping.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  student: [
    "dashboard.view",
    "circulars.view",
    "requests.create",
    "requests.view_own",
    "timetable.view_own",
    "attendance.view",
    "subjects.view_own",
    "profile.edit_student",
    "s3.view_own_files",
    "exams.view",
  ],
  faculty: [
    "dashboard.view",
    "circulars.view",
    "circulars.create",
    "circulars.delete_own",
    "requests.view_assigned",
    "requests.review",
    "timetable.view_own",
    "attendance.mark",
    "subjects.view_own",
    "profile.edit_faculty",
    "s3.view_student_files",
    "s3.upload_faculty",
    "exams.view",
    "exams.evaluate",
  ],
  counselor: [
    "dashboard.view",
    "circulars.view",
    "circulars.create",
    "circulars.delete_own",
    "requests.view_assigned",
    "requests.review",
    "timetable.view_own",
    "attendance.mark",
    "attendance.view_division",
    "subjects.view_own",
    "profile.edit_faculty",
    "s3.view_student_files",
    "s3.upload_faculty",
    "exams.view",
    "exams.evaluate",
    "exams.export",
    "exams.reports",
  ],
  hod: [
    "dashboard.view",
    "circulars.view",
    "circulars.create",
    "circulars.delete_any",
    "requests.view_assigned",
    "requests.view_all",
    "requests.review",
    "timetable.view_own",
    "timetable.manage",
    "timetable.publish",
    "attendance.mark",
    "attendance.view_division",
    "subjects.view_course",
    "profile.edit_faculty",
    "admin.divisions",
    "admin.faculty",
    "admin.subjects",
    "admin.assignments",
    "s3.view_student_files",
    "s3.view_faculty_files",
    "s3.upload_faculty",
    "exams.view",
    "exams.evaluate",
    "exams.export",
    "exams.reports",
  ],
  principal: [
    "dashboard.view",
    "dashboard.view_admin",
    "circulars.view",
    "circulars.create",
    "circulars.delete_any",
    "requests.view_all",
    "requests.review",
    "timetable.view_any",
    "attendance.view_division",
    "profile.edit_faculty",
    "admin.divisions",
    "admin.faculty",
    "admin.subjects",
    "s3.view_any_files",
    "s3.upload_faculty",
    "exams.reports",
  ],
  vice_principal: [
    "dashboard.view",
    "dashboard.view_admin",
    "circulars.view",
    "circulars.create",
    "circulars.delete_any",
    "requests.view_all",
    "requests.review",
    "timetable.view_any",
    "attendance.view_division",
    "profile.edit_faculty",
    "admin.divisions",
    "admin.faculty",
    "admin.subjects",
    "s3.view_any_files",
    "s3.upload_faculty",
    "exams.reports",
  ],
};

// ─── Role Group Helpers ───────────────────────────────────────────
// Replace scattered `isFaculty || isHod || isPrincipal` patterns.

/** Roles that use the faculty table or administrators table for profile */
export const FACULTY_LIKE_ROLES: readonly Role[] = [
  "faculty", "counselor", "hod", "principal", "vice_principal",
];

/** Roles that use the administrators table instead of faculty */
export const ADMIN_TABLE_ROLES: readonly Role[] = [
  "principal", "vice_principal",
];

export function isFacultyLikeRole(role: string): boolean {
  return FACULTY_LIKE_ROLES.includes(role as Role);
}

export function isAdminTableRole(role: string): boolean {
  return ADMIN_TABLE_ROLES.includes(role as Role);
}

// ─── Core Permission Checker ──────────────────────────────────────

/**
 * Check if the given activeRole has a specific permission.
 * This is the ONLY function that should be used for authorization.
 */
export function hasPermission(
  activeRole: string,
  permission: Permission
): boolean {
  const perms = ROLE_PERMISSIONS[activeRole as Role];
  if (!perms) return false;
  return perms.includes(permission);
}

/**
 * Check if activeRole has ANY of the given permissions.
 */
export function hasAnyPermission(
  activeRole: string,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(activeRole, p));
}

/**
 * Check if the user holds any role that has the given permission.
 * Useful when activeRole is not set and you need a fallback check.
 */
export function anyRoleHasPermission(
  roles: string[],
  permission: Permission
): boolean {
  return roles.some((r) => hasPermission(r, permission));
}
```

### Task 0.2 — Create `app/lib/hooks/use-permission.ts` (Client Hook)

```typescript
// app/lib/hooks/use-permission.ts
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import {
  hasPermission,
  hasAnyPermission,
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

/** Check if activeRole is a faculty-like role */
export function useIsFacultyLike(): boolean {
  const { activeRole } = useAuthStore();
  if (!activeRole) return false;
  return isFacultyLikeRole(activeRole);
}

/** Check if activeRole uses the administrators table */
export function useIsAdminTable(): boolean {
  const { activeRole } = useAuthStore();
  if (!activeRole) return false;
  return isAdminTableRole(activeRole);
}
```

### Task 0.3 — Add `requirePermission()` to `app/lib/api-auth.ts`

Add a new helper alongside `getAuthContext()`:

```typescript
import { hasPermission, type Permission } from "@/app/lib/permissions";

/**
 * Asserts that the authenticated user's activeRole has the given permission.
 * Returns the AuthContext if authorized, or a 403 NextResponse if not.
 */
export async function requirePermission(
  req: NextRequest,
  permission: Permission
): Promise<AuthContext | NextResponse> {
  const auth = await getAuthContext(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  if (!hasPermission(auth.activeRole, permission)) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }
  return auth;
}
```

### Task 0.4 — Add unit tests for the permission matrix

Create `app/lib/__tests__/permissions.test.ts` to verify:
- Every role has `dashboard.view`
- Only `student` has `requests.create`
- Only `hod` has `timetable.manage`
- `principal` and `vice_principal` have identical permissions
- `isFacultyLikeRole` returns true for 5 roles, false for `student`

---

## Phase 1: Server-Side API Migration
**Risk: Medium — changes authorization logic on live endpoints**

> [!IMPORTANT]
> Each file migration follows the same pattern: replace manual `roles.includes()` / `roles.some()` with `hasPermission(auth.activeRole, "...")` or `requirePermission(req, "...")`. Test each endpoint after migration.

### Batch 1A — Profile & Upload Routes (Low complexity)

| # | File | Current Pattern | Replace With |
|---|------|----------------|--------------|
| 1 | `api/faculty/profile/route.ts` | `roles.some(r => r === "faculty" \|\| ...)` (L21-29) + `isAdmin` (L48, L130) | `requirePermission(req, "profile.edit_faculty")` + `isAdminTableRole(auth.activeRole)` |
| 2 | `api/faculty/profile/submit/route.ts` | Duplicate of above (L21-29, L48) | Same as above |
| 3 | `api/faculty/upload-url/route.ts` | `roles.some(...)` (L34-41) | `requirePermission(req, "s3.upload_faculty")` |
| 4 | `api/student/profile-photo/route.ts` | Complex nested `roles.some()` + `roles.includes()` (L29-62) | `hasPermission()` checks using `s3.view_*` permissions |

### Batch 1B — Requests Routes

| # | File | Current Pattern | Replace With |
|---|------|----------------|--------------|
| 5 | `api/requests/faculty/route.ts` | `roles.includes("faculty") \|\| ...` 5-way OR (L24-29), separate `isAdmin` (L45) | `requirePermission(req, "requests.view_assigned")` + `hasPermission(activeRole, "requests.view_all")` |
| 6 | `api/requests/[id]/route.ts` | Multiple `roles.includes(...)` checks per method | `requirePermission` per HTTP method with appropriate permission |

### Batch 1C — Circulars Routes

| # | File | Current Pattern | Replace With |
|---|------|----------------|--------------|
| 7 | `api/circulars/route.ts` | `isStudent`, `isFaculty`, `isGlobalAdmin` manual booleans | `hasPermission(activeRole, "circulars.view")` + permission-based query scoping |
| 8 | `api/circulars/[slug]/route.ts` | Hardcoded role checks for visibility | `hasPermission` checks |
| 9 | `api/faculty/circulars/route.ts` | `isGlobalAdmin` + `roles.some(...)` (L21-23) | `requirePermission(req, "circulars.create")` + `isAdminTableRole()` |
| 10 | `api/faculty/circulars/[slug]/route.ts` | `roles.some(...)` + `isHod` (L23, L30) | `requirePermission(req, "circulars.delete_own")` + `hasPermission("circulars.delete_any")` |

### Batch 1D — Admin & Timetable Routes

| # | File | Current Pattern | Replace With |
|---|------|----------------|--------------|
| 11 | `api/admin/timetable/route.ts` | `requireHod()` helper checking `hod \|\| admin` (L28-30) | `requirePermission(req, "timetable.manage")` |
| 12 | `api/admin/timetable/publish/route.ts` | `roles.includes("hod") && !roles.includes("admin")` (L32) | `requirePermission(req, "timetable.publish")` |
| 13 | `api/admin/timetable/divisions/route.ts` | Same as above (L31) | `requirePermission(req, "timetable.manage")` |
| 14 | `api/admin/assignments/route.ts` | `auth.roles.includes("hod")` × 3 methods (L19, L103, L168) | `requirePermission(req, "admin.assignments")` |
| 15 | `api/academics/timetable/route.ts` | `isGlobalAdmin` (L34) + `activeRole === "student"` switch (L110-267) | `hasPermission` for `timetable.view_any` vs `timetable.view_own` |
| 16 | `api/subjects/route.ts` | `activeRole === "hod"` / `"counselor"` / `"faculty"` / `"student"` switch (L119-321) | Permission-based branching: `subjects.view_course` vs `subjects.view_own` |

### Batch 1E — Attendance & Dashboard Routes

| # | File | Current Pattern | Replace With |
|---|------|----------------|--------------|
| 17 | `api/attendance/sessions/route.ts` | Local `ROLE_PRIORITY` (L82) + `resolvedRole` logic + `["faculty","counselor","hod"].includes()` (L289) | `hasPermission` for `attendance.mark` / `attendance.view_division` |
| 18 | `api/dashboard/route.ts` | `switch(role)` with separate `ROLE_PRIORITY` (duplicate) | `hasPermission` for `dashboard.view_admin` vs `dashboard.view` |

---

## Phase 2: Client-Side Component Migration
**Risk: Low — UI-only visibility changes, no security impact**

### Batch 2A — Layout Components

| # | File | Current Pattern | Replace With |
|---|------|----------------|--------------|
| 1 | `components/layout/sidebar.tsx` | `activeRole` filtering against `navigationConfig.roles[]` | No change needed — `navigation.ts` already uses `roles[]` array. **Consider**: converting `roles[]` in nav config to `permissions[]` in a future iteration |
| 2 | `components/layout/course-switcher.tsx` | `isGlobalAdmin` computed from roles (L~30) | `usePermission("dashboard.view_admin")` or `useIsFacultyLike()` |
| 3 | `app/app/profile/page.tsx` | 10-line `isFacultyRole` check (L20-34) | `useIsFacultyLike()` — single function call |

### Batch 2B — Feature Pages

| # | File | Current Pattern | Replace With |
|---|------|----------------|--------------|
| 4 | `app/app/workflows/requests/page.tsx` | `isFaculty = activeRole === "faculty" \|\| ...` 5-way OR (L103-108) | `usePermission("requests.view_assigned")` for faculty view, `usePermission("requests.create")` for student button |
| 5 | `app/app/workflows/requests/[id]/page.tsx` | Duplicate `isFaculty` 5-way OR (L66-71) | `usePermission("requests.review")` |
| 6 | `app/app/circulars/page.tsx` | `canCreate` 5-way OR (L100-105) | `usePermission("circulars.create")` |
| 7 | `app/app/circulars/create/page.tsx` | Duplicate `canCreate` (L64-69) + `isAdmin` (L71) | `usePermission("circulars.create")` + `useIsAdminTable()` |
| 8 | `app/app/circulars/[slug]/page.tsx` | `isHod` + `canDelete` logic (L93-95) | `usePermission("circulars.delete_any")` for HOD, ownership check for others |
| 9 | `app/app/academics/timetable/page.tsx` | `isAdmin = activeRole === "principal" \|\| ...` (L89) | `usePermission("timetable.view_any")` |
| 10 | `app/app/admin/timetable/page.tsx` | `activeRole === "principal" \|\| "vice_principal"` redirect (L79-82, L84) | `usePermission("timetable.manage")` — if false, redirect |

---

## Phase 3: Cleanup & Unification
**Risk: Low**

### Task 3.1 — Remove Duplicate `ROLE_PRIORITY` Constants

| File | Line | Action |
|------|------|--------|
| `app/lib/api-auth.ts` | L29 | Keep as canonical (used for role resolution, not authorization) |
| `api/attendance/sessions/route.ts` | L82, L284 | Remove local copy, import from `api-auth.ts` |
| `api/dashboard/route.ts` | (internal) | Remove local copy, import from `api-auth.ts` |
| `middleware.ts` | (if present) | Remove local copy, import from `api-auth.ts` |

### Task 3.2 — Remove Dead `"admin"` Role References

The `navigation.ts` config references a role called `"admin"` that does **not** exist in the JWT or in `ROLE_PRIORITY`. It appears to be a leftover alias.

**Action:** Audit all `"admin"` references and either:
- Remove them (if `hod` covers the intent), or
- Map them explicitly in the permission matrix

| File | Lines | Current | Fix |
|------|-------|---------|-----|
| `config/navigation.ts` | L46, L52, L58, L77, L83, L89, L107, L120, L126, L132, L137, L142, L148, L155 | `"admin"` in roles arrays | Replace with appropriate actual roles |
| `api/admin/timetable/route.ts` | L29 | `requireHod` checks `"admin"` | Remove `"admin"` check |
| `api/admin/timetable/publish/route.ts` | L32 | `roles.includes("admin")` | Remove |
| `api/admin/timetable/divisions/route.ts` | L31 | `roles.includes("admin")` | Remove |

### Task 3.3 — Export `ROLE_PRIORITY` from `permissions.ts`

Move the canonical `ROLE_PRIORITY` into `permissions.ts` so it lives alongside the permission matrix:

```typescript
export const ROLE_PRIORITY: readonly Role[] = [
  "principal", "vice_principal", "hod",
  "counselor", "faculty", "student",
];
```

### Task 3.4 — Update `navigation.ts` to Use Permissions (Optional)

Convert `roles: Role[]` to `permissions: Permission[]` in navigation config so sidebar visibility is driven by the same matrix:

```typescript
// Before
{ title: "Timetable Management", roles: ["hod", "admin"] }

// After  
{ title: "Timetable Management", permission: "timetable.manage" }
```

> [!TIP]
> This is optional for Phase 3 but strongly recommended. It eliminates the last remaining place where roles are used directly for UI gating.

---

## Migration Checklist Per File

For each file being migrated, follow this checklist:

- [ ] Identify all `roles.includes()`, `roles.some()`, `activeRole === "..."` patterns
- [ ] Map each pattern to the correct `Permission` from the matrix
- [ ] Replace the check with `hasPermission()` / `requirePermission()` / `usePermission()`
- [ ] Replace `isAdmin` booleans with `isAdminTableRole()` (for table-routing logic)
- [ ] Verify the behavior is **identical** to the original (no permission change)
- [ ] Test the endpoint/page with each applicable role
- [ ] Remove any local helper functions that are now redundant (e.g., `requireHod()`, `getAuthenticatedFacultyId()`)

---

## Conflict Detection Cheat Sheet

These are the **inconsistencies** discovered during the audit that must be resolved during migration:

| Conflict | Location | Issue | Resolution |
|----------|----------|-------|------------|
| Ghost `"admin"` role | `navigation.ts`, `admin/timetable/*.ts` | Role `"admin"` is never issued by JWT | Remove — `hod` covers this intent |
| Circular delete asymmetry | `faculty/circulars/[slug]` vs `circulars/[slug]/page.tsx` | API allows `faculty \|\| counselor \|\| hod` to delete; UI only shows delete for `isHod \|\| ownCircular` | Align: UI should also show delete for `counselor` if they own it |
| `isGlobalAdmin` inconsistency | Various | Some files define it as `principal \|\| vice_principal`, others implicitly include `hod` | Standardize: `isGlobalAdmin` = `principal \|\| vice_principal` only. `hod` is course-scoped admin. |
| Timetable page redirect | `admin/timetable/page.tsx` L79-90 | Admins are forcefully redirected but the nav still shows the link | Fix: either hide the nav item for admins or remove the redirect |
| Double `getAuthContext` calls | `faculty/profile/route.ts` L38+L46, `faculty/profile/submit/route.ts` L38+L46 | `getAuthContext` is called twice per request (once in helper, once in handler) | Refactor: call once, pass result down |

---

## Testing Strategy

### Unit Tests
- `permissions.test.ts`: Validate matrix completeness, no missing permissions
- Snapshot test: `ROLE_PERMISSIONS` object to catch accidental changes

### Integration Tests  
- For each API route: call with each role and verify 200/403 responses match the old behavior exactly
- **Critical**: Test `student` cannot access `requests.view_assigned`
- **Critical**: Test `faculty` cannot access `timetable.manage`
- **Critical**: Test `principal`/`vice_principal` cannot access `timetable.manage` (HOD-only)

### Regression Testing
- Run the full app with each role and verify sidebar items, page access, and API responses are unchanged

---

## File Impact Summary

| Phase | Files Changed | New Files | Risk |
|-------|--------------|-----------|------|
| Phase 0 | 1 (`api-auth.ts`) | 3 (`permissions.ts`, `use-permission.ts`, `permissions.test.ts`) | None |
| Phase 1 | 18 API routes | 0 | Medium |
| Phase 2 | 10 components/pages | 0 | Low |
| Phase 3 | 6 files (cleanup) | 0 | Low |
| **Total** | **35 files** | **3 files** | — |

---

## Priority Order

1. **Phase 0** — Do first. Zero risk, creates the foundation.
2. **Phase 1, Batch 1A** — Profile routes. Low traffic, easy to verify.
3. **Phase 1, Batch 1C** — Circulars. Has the most inconsistencies to fix.
4. **Phase 1, Batch 1B** — Requests. Medium complexity.
5. **Phase 1, Batch 1D-1E** — Admin + Dashboard. Highest complexity.
6. **Phase 2** — Client-side. Can be done in parallel with Phase 1.
7. **Phase 3** — Cleanup. Do last after everything is stable.
