import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, AuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  facultySubjectAssignments,
  counselorDivisionAssignments,
  divisions,
  subjects,
  faculty,
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
    const auth = await getAuthContext(req);
    if (!auth) return err("Unauthorized", 401);

    const { userId, roles: rolesArray, activeRole: resolvedRole } = auth;

    if (!["faculty", "counselor", "hod"].includes(resolvedRole)) {
      return err("Forbidden", 403);
    }

    const { searchParams } = new URL(req.url);
    const divisionIdParam = searchParams.get("divisionId");

    // Base select shape
    const selectCols = {
      id: facultySubjectAssignments.id,
      subjectId: facultySubjectAssignments.subjectId,
      subjectName: subjects.name,
      subjectType: facultySubjectAssignments.subjectType,
      divisionId: facultySubjectAssignments.divisionId,
      divisionName: divisions.displayName,
      facultyId: facultySubjectAssignments.facultyId,
      facultyName: faculty.name,
      courseCode: divisions.courseCode,
    };

    let assignments;

    if (resolvedRole === "hod") {
      // HOD sees all, optionally filtered by division
      if (divisionIdParam) {
        assignments = await db
          .select(selectCols)
          .from(facultySubjectAssignments)
          .innerJoin(divisions, eq(facultySubjectAssignments.divisionId, divisions.id))
          .innerJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
          .innerJoin(faculty, eq(facultySubjectAssignments.facultyId, faculty.id))
          .where(
            and(
              eq(facultySubjectAssignments.divisionId, parseInt(divisionIdParam)),
              eq(facultySubjectAssignments.semesterId, divisions.semesterId)
            )
          )
          .orderBy(subjects.name);
      } else {
        assignments = await db
          .select(selectCols)
          .from(facultySubjectAssignments)
          .innerJoin(divisions, eq(facultySubjectAssignments.divisionId, divisions.id))
          .innerJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
          .innerJoin(faculty, eq(facultySubjectAssignments.facultyId, faculty.id))
          .where(eq(facultySubjectAssignments.semesterId, divisions.semesterId))
          .orderBy(divisions.displayName, subjects.name);
      }
    } else if (resolvedRole === "faculty") {
      // Faculty sees only their own assignments
      assignments = await db
        .select(selectCols)
        .from(facultySubjectAssignments)
        .innerJoin(divisions, eq(facultySubjectAssignments.divisionId, divisions.id))
        .innerJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
        .innerJoin(faculty, eq(facultySubjectAssignments.facultyId, faculty.id))
        .where(
          and(
            eq(facultySubjectAssignments.facultyId, userId),
            eq(facultySubjectAssignments.semesterId, divisions.semesterId)
          )
        )
        .orderBy(subjects.name);
    } else {
      // Counselor sees assignments for their assigned divisions
      const divIds = auth.counselorDivisionIds ?? [];

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
        .innerJoin(subjects, eq(facultySubjectAssignments.subjectId, subjects.id))
        .innerJoin(faculty, eq(facultySubjectAssignments.facultyId, faculty.id))
        .where(
          and(
            eq(facultySubjectAssignments.semesterId, divisions.semesterId),
            // Filter to counselor's divisions
            ...targetDivIds.length === 1
              ? [eq(facultySubjectAssignments.divisionId, targetDivIds[0])]
              : [] // if multiple, no extra filter — all counselor divs
          )
        )
        .orderBy(divisions.displayName, subjects.name);

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
