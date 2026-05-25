import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  students,
  facultySubjectAssignments,
  counselorDivisionAssignments,
} from "@/app/lib/schema";
import { eq, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}
function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "attendance.mark");
    if (auth instanceof NextResponse) return auth;

    const { userId, activeRole: resolvedRole } = auth;

    const divisionIdParam = req.nextUrl.searchParams.get("divisionId");
    if (!divisionIdParam) return err("divisionId is required", 400);
    const divisionId = parseInt(divisionIdParam, 10);
    if (isNaN(divisionId)) return err("Invalid divisionId", 400);

    if (resolvedRole === "faculty") {
      const assignments = await db
        .select({ id: facultySubjectAssignments.id })
        .from(facultySubjectAssignments)
        .where(and(
          eq(facultySubjectAssignments.facultyId, userId),
          eq(facultySubjectAssignments.divisionId, divisionId)
        ))
        .limit(1);
      if (assignments.length === 0) return err("Forbidden: no assignment", 403);
    }

    if (resolvedRole === "counselor") {
      const assignments = await db
        .select({ divisionId: counselorDivisionAssignments.divisionId })
        .from(counselorDivisionAssignments)
        .where(eq(counselorDivisionAssignments.facultyId, userId));
      if (!assignments.some((a) => a.divisionId === divisionId)) {
        return err("Forbidden: not assigned to this division", 403);
      }
    }

    const studentList = await db
      .select({
        id: students.id,
        fullName: students.fullName,
        studentId: students.studentId,
        enrollmentId: students.enrollmentId,
      })
      .from(students)
      .where(eq(students.currentDivisionId, divisionId))
      .orderBy(students.fullName);

    return ok({ students: studentList, divisionId });
  } catch (error) {
    console.error("[GET /api/attendance/students]", error);
    return err("Internal server error", 500);
  }
}
