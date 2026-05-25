# Permissions Guide

> **Every authorization decision in this codebase MUST go through the centralized permission system.**
> Never write `roles.includes("hod")` or `activeRole === "faculty"` directly.

---

## Quick Reference

### Server-Side (API Routes)

```typescript
// ✅ CORRECT — Gate an entire endpoint with a single permission
import { requirePermission } from "@/app/lib/api-auth";
import { NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const result = await requirePermission(req, "circulars.create");
  if (result instanceof NextResponse) return result; // 401 or 403
  const auth = result; // AuthContext — safe to use

  // auth.userId, auth.activeRole, auth.courseId, etc.
}
```

```typescript
// ✅ CORRECT — Check a permission mid-handler (e.g. conditional logic)
import { hasPermission } from "@/app/lib/permissions";

const canViewAll = hasPermission(auth.activeRole, "requests.view_all");
if (canViewAll) {
  // show all requests
} else {
  // show only assigned requests
}
```

```typescript
// ✅ CORRECT — Check if user's role uses the administrators table
import { isAdminTableRole, isFacultyLikeRole } from "@/app/lib/permissions";

const isAdmin = isAdminTableRole(auth.activeRole);  // principal, vice_principal
const isFaculty = isFacultyLikeRole(auth.activeRole); // faculty, counselor, hod, principal, vice_principal
```

```typescript
// ❌ WRONG — Never do this
if (roles.includes("hod") || roles.includes("admin")) { ... }
if (activeRole === "principal" || activeRole === "vice_principal") { ... }
if (roles.some(r => r === "faculty" || r === "counselor")) { ... }
```

### Client-Side (React Components)

```tsx
// ✅ CORRECT — Check a permission reactively
import { usePermission, useIsFacultyLike, useIsAdminTable } from "@/app/lib/hooks/use-permission";

function MyComponent() {
  const canCreate = usePermission("circulars.create");
  const isFaculty = useIsFacultyLike();
  const isAdmin = useIsAdminTable();

  return (
    <>
      {canCreate && <Button>Create Circular</Button>}
      {isFaculty ? <FacultyProfile /> : <StudentProfile />}
    </>
  );
}
```

```tsx
// ❌ WRONG — Never do this in components
const canCreate =
  activeRole === "faculty" ||
  activeRole === "hod" ||
  activeRole === "counselor" ||
  activeRole === "principal" ||
  activeRole === "vice_principal";
```

---

## Adding a New Feature

### Step 1 — Define Permissions

Open `app/lib/permissions.ts` and add your new permissions to the `PERMISSIONS` array:

```typescript
export const PERMISSIONS = [
  // ... existing permissions ...

  // ── Your New Feature ──
  "grades.view",
  "grades.edit",
  "grades.export",
  "grades.approve",
] as const;
```

### Step 2 — Assign to Roles

In the same file, add the permissions to each role that should have them in `ROLE_PERMISSIONS`:

```typescript
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  student: [
    // ... existing ...
    "grades.view",               // students can view their own grades
  ],
  faculty: [
    // ... existing ...
    "grades.view",
    "grades.edit",               // faculty can edit grades
  ],
  counselor: [
    // ... existing ...
    "grades.view",
    "grades.edit",
    "grades.export",             // counselors can export
  ],
  hod: [
    // ... existing ...
    "grades.view",
    "grades.edit",
    "grades.export",
    "grades.approve",            // only HOD can approve final grades
  ],
  principal: [
    // ... existing ...
    "grades.view",
    "grades.export",             // principal can view and export, not edit
  ],
  vice_principal: [
    // ... existing ...
    "grades.view",
    "grades.export",
  ],
};
```

### Step 3 — Protect API Routes

```typescript
// app/api/grades/route.ts

import { requirePermission } from "@/app/lib/api-auth";
import { hasPermission } from "@/app/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Anyone with grades.view can access this endpoint
  const result = await requirePermission(req, "grades.view");
  if (result instanceof NextResponse) return result;
  const auth = result;

  // Scope the data based on additional permissions
  const canViewAll = hasPermission(auth.activeRole, "grades.export");
  // ...
}

export async function PUT(req: NextRequest) {
  // Only roles with grades.edit can modify
  const result = await requirePermission(req, "grades.edit");
  if (result instanceof NextResponse) return result;
  const auth = result;
  // ...
}
```

### Step 4 — Gate UI Elements

```tsx
// app/app/grades/page.tsx
"use client";

import { usePermission } from "@/app/lib/hooks/use-permission";

export default function GradesPage() {
  const canEdit = usePermission("grades.edit");
  const canExport = usePermission("grades.export");
  const canApprove = usePermission("grades.approve");

  return (
    <div>
      <h1>Grades</h1>
      <GradeTable editable={canEdit} />

      {canExport && <Button>Export to Excel</Button>}
      {canApprove && <Button color="success">Approve All</Button>}
    </div>
  );
}
```

### Step 5 — Add to Navigation (if needed)

In `config/navigation.ts`, add the sidebar item with the roles that should see it:

```typescript
{
  title: "Grades",
  href: "/app/grades",
  icon: BarChart3,
  roles: ["student", "faculty", "counselor", "hod", "principal", "vice_principal"],
},
```

> The sidebar still uses `roles[]` for visibility filtering. The permission system handles what users can **do** on each page.

---

## Adding a New Role

### Step 1 — Add to `ROLES` Array

```typescript
// app/lib/permissions.ts
export const ROLES = [
  "student", "faculty", "counselor", "hod",
  "principal", "vice_principal",
  "registrar",  // ← new role
] as const;
```

### Step 2 — Define Its Permissions

```typescript
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  // ... existing roles ...
  registrar: [
    "dashboard.view",
    "circulars.view",
    "requests.view_all",
    "admin.divisions",
    "admin.faculty",
    // ... whatever this role needs
  ],
};
```

### Step 3 — Update `ROLE_PRIORITY`

```typescript
export const ROLE_PRIORITY: readonly Role[] = [
  "principal", "vice_principal", "registrar", "hod",
  "counselor", "faculty", "student",
];
```

### Step 4 — Update Role Groups (if applicable)

```typescript
// Does registrar use the administrators table?
export const ADMIN_TABLE_ROLES: readonly Role[] = [
  "principal", "vice_principal", "registrar",
];

// Is registrar a faculty-like role?
export const FACULTY_LIKE_ROLES: readonly Role[] = [
  "faculty", "counselor", "hod", "principal", "vice_principal", "registrar",
];
```

### Step 5 — Add to Navigation

Update `config/navigation.ts` — add `"registrar"` to the `roles[]` arrays of every nav item it should see.

**That's it.** No other files need to change. Every `hasPermission()`, `usePermission()`, and `requirePermission()` call will automatically work with the new role based on the matrix.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│                app/lib/permissions.ts                   │
│                                                        │
│  ROLES              — all valid role strings            │
│  PERMISSIONS        — all valid permission strings      │
│  ROLE_PERMISSIONS   — the matrix (role → permissions)   │
│  ROLE_PRIORITY      — default role selection order      │
│  FACULTY_LIKE_ROLES — roles with faculty-type profiles  │
│  ADMIN_TABLE_ROLES  — roles using administrators table  │
│                                                        │
│  hasPermission(activeRole, permission) → boolean        │
│  hasAnyPermission(activeRole, perms[]) → boolean        │
│  anyRoleHasPermission(roles[], permission) → boolean    │
│  isFacultyLikeRole(role) → boolean                     │
│  isAdminTableRole(role) → boolean                      │
└───────────────┬────────────────────┬───────────────────┘
                │                    │
      ┌─────────▼────────┐  ┌───────▼──────────┐
      │  Server (API)    │  │  Client (React)  │
      │                  │  │                   │
      │  requirePerm()   │  │  usePermission()  │
      │  (api-auth.ts)   │  │  useIsFacultyLike │
      │                  │  │  useIsAdminTable   │
      │  Returns:        │  │  useAnyPermission  │
      │  AuthContext or  │  │                   │
      │  NextResponse    │  │  (hooks/           │
      │  (401/403)       │  │   use-permission)  │
      └──────────────────┘  └──────────────────┘
```

---

## Permission Naming Convention

```
<domain>.<action>

Format:   noun.verb
Examples: circulars.create
          timetable.manage
          s3.view_student_files
          grades.approve
```

| Suffix | Meaning |
|--------|---------|
| `.view` | Read-only access |
| `.view_own` | Can only view own data |
| `.view_any` | Can view data across all scopes |
| `.create` | Can create new resources |
| `.edit` | Can modify existing resources |
| `.delete_own` | Can delete resources they created |
| `.delete_any` | Can delete any resource (admin) |
| `.manage` | Full CRUD + configuration access |
| `.export` | Can export/download data |
| `.approve` | Can approve/reject workflows |

---

## Available Hooks & Utilities

### Server-Side

| Function | Import From | Usage |
|----------|-------------|-------|
| `requirePermission(req, perm)` | `@/app/lib/api-auth` | Gate an entire endpoint. Returns `AuthContext` or `NextResponse` |
| `hasPermission(role, perm)` | `@/app/lib/permissions` | Boolean check mid-handler |
| `hasAnyPermission(role, perms[])` | `@/app/lib/permissions` | True if role has any of the listed permissions |
| `isAdminTableRole(role)` | `@/app/lib/permissions` | True for `principal`, `vice_principal` |
| `isFacultyLikeRole(role)` | `@/app/lib/permissions` | True for all non-student roles |

### Client-Side

| Hook | Import From | Usage |
|------|-------------|-------|
| `usePermission(perm)` | `@/app/lib/hooks/use-permission` | Single permission check |
| `useAnyPermission(perms[])` | `@/app/lib/hooks/use-permission` | True if any permission matches |
| `useIsFacultyLike()` | `@/app/lib/hooks/use-permission` | Is the active role faculty-type? |
| `useIsAdminTable()` | `@/app/lib/hooks/use-permission` | Does the active role use administrators table? |
| `useAnyRolePermission(perm)` | `@/app/lib/hooks/use-permission` | Fallback: checks all user roles, not just active |

---

## Common Patterns

### Pattern: Different data scopes per role

```typescript
// Server-side: return different data based on permissions
const result = await requirePermission(req, "requests.view_assigned");
if (result instanceof NextResponse) return result;
const auth = result;

const canViewAll = hasPermission(auth.activeRole, "requests.view_all");

const where = canViewAll
  ? undefined  // no filter — see everything
  : eq(requests.assignedTo, auth.userId);  // only assigned
```

### Pattern: Faculty vs Administrator table routing

```typescript
import { isAdminTableRole } from "@/app/lib/permissions";

const isAdmin = isAdminTableRole(auth.activeRole);

if (isAdmin) {
  // Query from `administrators` table
  const [row] = await db.select().from(administrators).where(eq(administrators.id, auth.userId));
} else {
  // Query from `faculty` table
  const [row] = await db.select().from(faculty).where(eq(faculty.id, auth.userId));
}
```

### Pattern: Conditionally show UI based on permission

```tsx
const canCreate = usePermission("circulars.create");
const canDeleteAny = usePermission("circulars.delete_any");

// Show create button only if user can create
{canCreate && <Link href="/app/circulars/create"><Button>New Circular</Button></Link>}

// Show delete button if user can delete any, or owns the circular
const canDelete = canDeleteAny || circular.createdBy === user?.id;
{canDelete && <Button variant="danger" onPress={handleDelete}>Delete</Button>}
```

### Pattern: Page-level redirect for unauthorized roles

```tsx
const canManage = usePermission("timetable.manage");

useEffect(() => {
  if (!canManage) {
    router.replace("/app/academics/timetable"); // redirect to read-only view
  }
}, [canManage, router]);

if (!canManage) {
  return <Spinner size="lg" />;
}
```

---

## Rules

1. **Never** write `roles.includes(...)` or `activeRole === "..."` for authorization.
2. **Always** add new permissions to `permissions.ts` before using them.
3. **Always** use `requirePermission()` as the first check in API route handlers.
4. **Always** use `usePermission()` hooks in React components.
5. **Always** use `isAdminTableRole()` instead of `activeRole === "principal"` for table routing.
6. The `"admin"` role **does not exist**. Only use roles from the `ROLES` array.
7. When adding a new role, you only need to update `permissions.ts` — all checks propagate automatically.
