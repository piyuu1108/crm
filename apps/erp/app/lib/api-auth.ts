import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { hasPermission, type Permission } from "@/app/lib/permissions";

export interface AuthContext {
  userId: number;
  roles: string[];
  activeRole: string;
  isRoleForbidden: boolean;
  forbiddenRole?: string;
  facultyCode?: string;
  isGlobal?: boolean;
  activeCourseId?: number | "all";

  // Faculty / HOD — course they belong to (undefined for students)
  courseId?: number;

  // Student
  divisionId?: number;
  semesterId?: number;

  // Counselor
  counselorDivisionIds?: readonly number[];

  // Shared
  academicYearId?: number;
}

const ROLE_PRIORITY = ["principal", "vice_principal", "hod", "counselor", "faculty", "student"] as const;

/**
 * Asserts that courseId is present in the auth context.
 * Use in HOD/faculty-only routes to ensure course isolation is enforced.
 * Throws if courseId is missing (indicates a broken JWT or misconfigured account).
 */
export function requireCourseId(auth: AuthContext): number {
  if (!auth.courseId) {
    throw new Error("courseId missing from auth context — faculty account may not be linked to a course");
  }
  return auth.courseId;
}

/**
 * Extracts and validates the authentication context by verifying the JWT directly from cookies.
 * Resolves the client-requested active role, tracking if a requested role was invalid.
 */
export async function getAuthContext(req: NextRequest): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return null;
  }

  const {
    userId,
    roles,
    facultyCode,
    courseId,
    divisionId,
    semesterId,
    counselorDivisionIds,
    academicYearId,
    isGlobal,
  } = payload;

  if (userId === undefined || !Array.isArray(roles) || roles.length === 0) {
    return null;
  }

  // Structural validation of enriched academic fields
  if (courseId !== undefined && typeof courseId !== "number") {
    return null;
  }
  if (divisionId !== undefined && typeof divisionId !== "number") {
    return null;
  }
  if (semesterId !== undefined && typeof semesterId !== "number") {
    return null;
  }
  if (academicYearId !== undefined && typeof academicYearId !== "number") {
    return null;
  }
  if (
    counselorDivisionIds !== undefined &&
    (!Array.isArray(counselorDivisionIds) ||
      counselorDivisionIds.some((id) => typeof id !== "number"))
  ) {
    return null;
  }

  // Retrieve requested active role from client-provided headers, query parameters, or active_role cookie
  const requestedRole = (
    req.headers.get("x-active-role") ||
    req.headers.get("X-Active-Role") ||
    req.nextUrl.searchParams.get("role") ||
    cookieStore.get("active_role")?.value ||
    ""
  ).toLowerCase().trim();

  let activeRole: string;
  let isRoleForbidden = false;
  let forbiddenRole: string | undefined;

  if (requestedRole) {
    if (roles.includes(requestedRole)) {
      activeRole = requestedRole;
    } else {
      isRoleForbidden = true;
      forbiddenRole = requestedRole;
      // Priority-based default fallback
      activeRole = ROLE_PRIORITY.find((r) => roles.includes(r)) ?? roles[0];
    }
  } else {
    // Default fallback
    activeRole = ROLE_PRIORITY.find((r) => roles.includes(r)) ?? roles[0];
  }

  // Retrieve requested active course context (Principal/Vice Principal only)
  let activeCourseId: number | "all" | undefined;
  if (isGlobal === true) {
    const cookieActiveCourseId = cookieStore.get("active_course_id")?.value;
    const headerActiveCourseId = req.headers.get("x-active-course-id") || req.headers.get("X-Active-Course-Id");
    const rawCourseId = headerActiveCourseId || cookieActiveCourseId || payload.activeCourseId || "all";
    activeCourseId = rawCourseId === "all" ? "all" : Number(rawCourseId);
  }

  return {
    userId,
    roles,
    activeRole,
    isRoleForbidden,
    forbiddenRole,
    facultyCode,
    courseId,
    divisionId,
    semesterId,
    counselorDivisionIds,
    academicYearId,
    isGlobal: isGlobal === true,
    activeCourseId,
  };
}

/**
 * Asserts that the authenticated user's activeRole has the given permission.
 * Returns the AuthContext if authorized, or a JSON error response if not.
 *
 * Usage in API routes:
 *   const result = await requirePermission(req, "circulars.create");
 *   if (result instanceof NextResponse) return result; // 401 or 403
 *   const auth = result; // AuthContext
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
