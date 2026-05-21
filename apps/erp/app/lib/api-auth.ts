import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";

export interface AuthContext {
  userId: number;
  roles: string[];
  activeRole: string;
  isRoleForbidden: boolean;
  forbiddenRole?: string;
  facultyCode?: string;

  // Student
  divisionId?: number;
  semesterId?: number;

  // Counselor
  counselorDivisionIds?: readonly number[];

  // Shared
  academicYearId?: number;
}

const ROLE_PRIORITY = ["hod", "counselor", "faculty", "student"] as const;

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
    divisionId,
    semesterId,
    counselorDivisionIds,
    academicYearId,
  } = payload;

  if (userId === undefined || !Array.isArray(roles) || roles.length === 0) {
    return null;
  }

  // Structural validation of enriched academic fields
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

  return {
    userId,
    roles,
    activeRole,
    isRoleForbidden,
    forbiddenRole,
    facultyCode,
    divisionId,
    semesterId,
    counselorDivisionIds,
    academicYearId,
  };
}
