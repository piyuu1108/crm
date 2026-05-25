/**
 * Centralized Permission Matrix — Single source of truth for RBAC.
 *
 * Instead of scattering `roles.includes("hod")` across 30+ files,
 * every authorization check now goes through `hasPermission()`.
 *
 * Usage:
 *   Server:  hasPermission(auth.activeRole, "timetable.manage")
 *   Client:  usePermission("circulars.create")   (via use-permission hook)
 */

// ─── Roles ────────────────────────────────────────────────────────────────────

export const ROLES = [
  "student",
  "faculty",
  "counselor",
  "hod",
  "principal",
  "vice_principal",
] as const;
export type Role = (typeof ROLES)[number];

/**
 * Role resolution priority — when no activeRole is set, the first matching
 * role in this list is used. Kept here as the single canonical definition.
 */
export const ROLE_PRIORITY: readonly Role[] = [
  "principal",
  "vice_principal",
  "hod",
  "counselor",
  "faculty",
  "student",
];

// ─── Permissions ──────────────────────────────────────────────────────────────

export const PERMISSIONS = [
  // Dashboard
  "dashboard.view",
  "dashboard.view_admin",

  // Circulars
  "circulars.view",
  "circulars.create",
  "circulars.delete_own",
  "circulars.delete_any",

  // Requests
  "requests.create",
  "requests.view_own",
  "requests.view_assigned",
  "requests.view_all",
  "requests.review",

  // Timetable
  "timetable.view_own",
  "timetable.view_any",
  "timetable.manage",
  "timetable.publish",

  // Attendance
  "attendance.view",
  "attendance.mark",
  "attendance.view_division",

  // Subjects
  "subjects.view_own",
  "subjects.view_course",

  // Profile
  "profile.edit_student",
  "profile.edit_faculty",

  // Administration
  "admin.divisions",
  "admin.faculty",
  "admin.subjects",
  "admin.assignments",
  "admin.students",
  "admin.email",
  "admin.promotion",

  // Counselor
  "counselor.divisions",
  "counselor.students",
  "counselor.email",

  // S3 / Files
  "s3.view_own_files",
  "s3.view_student_files",
  "s3.view_faculty_files",
  "s3.view_any_files",
  "s3.upload_faculty",

  // Internal Exams
  "exams.view",
  "exams.manage",
  "exams.evaluate",
  "exams.export",
  "exams.reports",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

// ─── Role → Permission Matrix ─────────────────────────────────────────────────

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
    "counselor.divisions",
    "counselor.students",
    "counselor.email",
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
    "admin.students",
    "admin.email",
    "admin.promotion",
    "counselor.divisions",
    "counselor.students",
    "counselor.email",
    "s3.view_student_files",
    "s3.view_faculty_files",
    "s3.upload_faculty",
    "exams.view",
    "exams.manage",
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

// ─── Role Group Helpers ───────────────────────────────────────────────────────

/** Roles that have a faculty-type profile (faculty stepper, not student stepper) */
export const FACULTY_LIKE_ROLES: readonly Role[] = [
  "faculty",
  "counselor",
  "hod",
  "principal",
  "vice_principal",
];

/** Roles that use the `administrators` table instead of `faculty` */
export const ADMIN_TABLE_ROLES: readonly Role[] = [
  "principal",
  "vice_principal",
];

export function isFacultyLikeRole(role: string): boolean {
  return FACULTY_LIKE_ROLES.includes(role as Role);
}

export function isAdminTableRole(role: string): boolean {
  return ADMIN_TABLE_ROLES.includes(role as Role);
}

// ─── Core Permission Checkers ─────────────────────────────────────────────────

/**
 * Check if the given activeRole has a specific permission.
 * This is the ONLY function that should be used for authorization decisions.
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
 * Check if the user holds any role in their roles array that grants the
 * given permission. Useful as a fallback when activeRole is not yet set.
 */
export function anyRoleHasPermission(
  roles: string[],
  permission: Permission
): boolean {
  return roles.some((r) => hasPermission(r, permission));
}
