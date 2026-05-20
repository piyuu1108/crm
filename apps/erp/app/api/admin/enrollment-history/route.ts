import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  studentEnrollmentHistory,
  academicYears,
  semesters,
  divisions,
} from "@/app/lib/schema";
import { eq, asc } from "drizzle-orm";

// ─── Response helpers ─────────────────────────────────────────────────────────
function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { status: 200 });
}

function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// ─── Auth guard (HOD, Counselor, or Faculty) ──────────────────────────────────
async function authorizeStaff(req: NextRequest) {
  const payload = await getAuthContext(req);
  if (!payload) return { error: err("Unauthorized", 401) };

  const rolesArray = payload.roles;
  const staffRoles = ["hod", "counselor", "faculty"];
  if (!rolesArray.some((r: string) => staffRoles.includes(r))) {
    return { error: err("Forbidden: staff access required", 403) };
  }

  return { payload };
}

// ─── GET /api/admin/enrollment-history?studentId=123 ──────────────────────────
//
// Returns the complete enrollment history for a student, ordered by semester_no.
// Joins academic_years and semesters for readable output.
//
// Query params:
//   studentId (required) — the student's database ID
//
export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeStaff(req);
    if ("error" in auth && auth.error) return auth.error;

    const studentId = parseInt(
      req.nextUrl.searchParams.get("studentId") || "",
      10
    );
    if (isNaN(studentId) || studentId <= 0) {
      return err("Valid studentId query parameter is required", 400);
    }

    const rows = await db
      .select({
        id: studentEnrollmentHistory.id,
        studentId: studentEnrollmentHistory.studentId,
        semesterId: studentEnrollmentHistory.semesterId,
        divisionId: studentEnrollmentHistory.divisionId,
        semesterNo: divisions.semesterNo,
        divisionName: divisions.displayName,
        status: studentEnrollmentHistory.status,
        enrolledAt: studentEnrollmentHistory.enrolledAt,
        archivedAt: studentEnrollmentHistory.archivedAt,
        academicYearName: academicYears.name,
        semesterName: semesters.name,
      })
      .from(studentEnrollmentHistory)
      .innerJoin(
        semesters,
        eq(studentEnrollmentHistory.semesterId, semesters.id)
      )
      .innerJoin(
        academicYears,
        eq(semesters.academicYearId, academicYears.id)
      )
      .innerJoin(
        divisions,
        eq(studentEnrollmentHistory.divisionId, divisions.id)
      )
      .where(eq(studentEnrollmentHistory.studentId, studentId))
      .orderBy(asc(divisions.semesterNo));

    return ok({
      studentId,
      enrollments: rows,
      totalEnrollments: rows.length,
      currentEnrollment: rows.find((r) => r.status === "active") ?? null,
    });
  } catch (error) {
    console.error("[GET /api/admin/enrollment-history] Error:", error);
    return err("Internal server error", 500);
  }
}
