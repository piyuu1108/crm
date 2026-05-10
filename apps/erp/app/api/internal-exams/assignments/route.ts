import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import {
  facultySubjectAssignments,
  counselorDivisionAssignments,
  divisions,
} from "@/app/lib/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}
function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * GET /api/internal-exams/assignments
 * Returns subject assignments that the authenticated user can access,
 * scoped by role:
 *   - Faculty: only their own subject assignments
 *   - Counselor: all assignments in their assigned divisions
 *   - HOD: all assignments
 *
 * Query: ?divisionId=... (optional, for scoping)
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return err("Unauthorized", 401);

    const payload = await verifyToken(token);
    if (!payload) return err("Unauthorized: invalid session", 401);

    const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];
    const activeRole = req.headers.get("X-Active-Role") ?? null;
    const ROLE_PRIORITY = ["hod", "counselor", "faculty"];
    const resolvedRole =
      activeRole && rolesArray.includes(activeRole)
        ? activeRole
        : ROLE_PRIORITY.find((r) => rolesArray.includes(r)) ?? rolesArray[0];

    if (!["faculty", "counselor", "hod"].includes(resolvedRole)) {
      return err("Forbidden", 403);
    }

    const { searchParams } = new URL(req.url);
    const divisionIdParam = searchParams.get("divisionId");

    // Base select shape
    const selectCols = {
      id: facultySubjectAssignments.id,
      subjectId: facultySubjectAssignments.subjectId,
      subjectName: facultySubjectAssignments.subjectName,
      subjectType: facultySubjectAssignments.subjectType,
      divisionId: facultySubjectAssignments.divisionId,
      divisionName: facultySubjectAssignments.divisionName,
      facultyId: facultySubjectAssignments.facultyId,
      facultyName: facultySubjectAssignments.facultyName,
      courseCode: facultySubjectAssignments.courseCode,
    };

    let assignments;

    if (resolvedRole === "hod") {
      // HOD sees all, optionally filtered by division
      if (divisionIdParam) {
        assignments = await db
          .select(selectCols)
          .from(facultySubjectAssignments)
          .innerJoin(divisions, eq(facultySubjectAssignments.divisionId, divisions.id))
          .where(
            and(
              eq(facultySubjectAssignments.divisionId, parseInt(divisionIdParam)),
              eq(facultySubjectAssignments.semesterId, divisions.semesterId)
            )
          )
          .orderBy(facultySubjectAssignments.subjectName);
      } else {
        assignments = await db
          .select(selectCols)
          .from(facultySubjectAssignments)
          .innerJoin(divisions, eq(facultySubjectAssignments.divisionId, divisions.id))
          .where(eq(facultySubjectAssignments.semesterId, divisions.semesterId))
          .orderBy(facultySubjectAssignments.divisionName, facultySubjectAssignments.subjectName);
      }
    } else if (resolvedRole === "faculty") {
      // Faculty sees only their own assignments
      assignments = await db
        .select(selectCols)
        .from(facultySubjectAssignments)
        .innerJoin(divisions, eq(facultySubjectAssignments.divisionId, divisions.id))
        .where(
          and(
            eq(facultySubjectAssignments.facultyId, payload.userId),
            eq(facultySubjectAssignments.semesterId, divisions.semesterId)
          )
        )
        .orderBy(facultySubjectAssignments.subjectName);
    } else {
      // Counselor sees assignments for their assigned divisions
      const counselorDivs = await db
        .select({ divisionId: counselorDivisionAssignments.divisionId })
        .from(counselorDivisionAssignments)
        .innerJoin(
          divisions,
          and(
            eq(counselorDivisionAssignments.divisionId, divisions.id),
            eq(counselorDivisionAssignments.semesterId, divisions.semesterId)
          )
        )
        .where(eq(counselorDivisionAssignments.facultyId, payload.userId));

      const divIds = counselorDivs.map((d) => d.divisionId);

      if (divIds.length === 0) {
        return ok([]);
      }

      // Filter by specific division if requested
      const filterDivId = divisionIdParam ? parseInt(divisionIdParam) : null;
      const targetDivIds = filterDivId && divIds.includes(filterDivId) ? [filterDivId] : divIds;

      assignments = await db
        .select(selectCols)
        .from(facultySubjectAssignments)
        .innerJoin(divisions, eq(facultySubjectAssignments.divisionId, divisions.id))
        .where(
          and(
            eq(facultySubjectAssignments.semesterId, divisions.semesterId),
            // Filter to counselor's divisions
            ...targetDivIds.length === 1
              ? [eq(facultySubjectAssignments.divisionId, targetDivIds[0])]
              : [] // if multiple, no extra filter — all counselor divs
          )
        )
        .orderBy(facultySubjectAssignments.divisionName, facultySubjectAssignments.subjectName);

      // Filter in JS for multiple div IDs (SQL IN not easy with Drizzle without raw SQL)
      if (targetDivIds.length > 1) {
        assignments = assignments.filter((a) => targetDivIds.includes(a.divisionId));
      }
    }

    return ok(assignments);
  } catch (error) {
    console.error("[GET /api/internal-exams/assignments]", error);
    return err("Internal server error", 500);
  }
}
