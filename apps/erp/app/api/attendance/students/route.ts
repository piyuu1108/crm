import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
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
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return err("Unauthorized", 401);

    const payload = await verifyToken(token);
    if (!payload) return err("Unauthorized: invalid session", 401);

    const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];
    const activeRole = req.headers.get("X-Active-Role") ?? null;
    const ROLE_PRIORITY = ["hod", "counselor", "faculty"];
    const resolvedRole = activeRole && rolesArray.includes(activeRole)
      ? activeRole
      : ROLE_PRIORITY.find((r) => rolesArray.includes(r)) ?? rolesArray[0];

    if (!["faculty", "counselor", "hod"].includes(resolvedRole)) {
      return err("Forbidden", 403);
    }

    const divisionIdParam = req.nextUrl.searchParams.get("divisionId");
    if (!divisionIdParam) return err("divisionId is required", 400);
    const divisionId = parseInt(divisionIdParam, 10);
    if (isNaN(divisionId)) return err("Invalid divisionId", 400);

    if (resolvedRole === "faculty") {
      const assignments = await db
        .select({ id: facultySubjectAssignments.id })
        .from(facultySubjectAssignments)
        .where(and(
          eq(facultySubjectAssignments.facultyId, payload.userId),
          eq(facultySubjectAssignments.divisionId, divisionId)
        ))
        .limit(1);
      if (assignments.length === 0) return err("Forbidden: no assignment", 403);
    }

    if (resolvedRole === "counselor") {
      const assignments = await db
        .select({ divisionId: counselorDivisionAssignments.divisionId })
        .from(counselorDivisionAssignments)
        .where(eq(counselorDivisionAssignments.facultyId, payload.userId));
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
      .where(and(
        eq(students.currentDivisionId, divisionId),
        eq(students.status, "approved")
      ))
      .orderBy(students.fullName);

    return ok({ students: studentList, divisionId });
  } catch (error) {
    console.error("[GET /api/attendance/students]", error);
    return err("Internal server error", 500);
  }
}
