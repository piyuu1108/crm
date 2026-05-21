import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/app/lib/api-auth";
import { db } from "@/app/lib/db";
import {
  attendanceSessionLedger,
  studentEnrollmentHistory,
  students,
  faculty,
} from "@/app/lib/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}
function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * GET /api/attendance/my
 *
 * Student self-view: fetch own attendance records from session ledger.
 */
export async function GET(req: NextRequest) {
  try {
    const payload = await getAuthContext(req);
    if (!payload) return err("Unauthorized", 401);

    const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];
    if (!rolesArray.includes("student")) {
      return err("Forbidden: student role required", 403);
    }

    const dateFrom = req.nextUrl.searchParams.get("dateFrom");
    const dateTo = req.nextUrl.searchParams.get("dateTo");
    const subjectFilter = req.nextUrl.searchParams.get("subject");

    // Build query conditions
    const conditions = [];
    if (dateFrom) {
      conditions.push(gte(attendanceSessionLedger.date, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(attendanceSessionLedger.date, dateTo));
    }
    if (subjectFilter) {
      conditions.push(eq(attendanceSessionLedger.subjectName, subjectFilter));
    }

    // Query records where student is/was in the division for the session
    const records = await db
      .select({
        id: attendanceSessionLedger.id,
        status: sql<string>`case when ${payload.userId} = any(${attendanceSessionLedger.absentStudentIds}) then 'absent' else 'present' end`,
        date: attendanceSessionLedger.date,
        subjectName: attendanceSessionLedger.subjectName,
        facultyName: faculty.name,
        startTime: attendanceSessionLedger.startTime,
        endTime: attendanceSessionLedger.endTime,
      })
      .from(attendanceSessionLedger)
      .innerJoin(faculty, eq(attendanceSessionLedger.facultyId, faculty.id))
      .leftJoin(
        studentEnrollmentHistory,
        and(
          eq(studentEnrollmentHistory.studentId, payload.userId),
          eq(studentEnrollmentHistory.divisionId, attendanceSessionLedger.divisionId),
          eq(studentEnrollmentHistory.semesterId, attendanceSessionLedger.semesterId)
        )
      )
      .where(
        and(
          sql`(${studentEnrollmentHistory.id} is not null or ${payload.divisionId} = ${attendanceSessionLedger.divisionId})`,
          ...conditions
        )
      )
      .orderBy(sql`${attendanceSessionLedger.date} DESC, ${attendanceSessionLedger.startTime} ASC`);

    // Get unique subjects list for frontend filter dropdown
    const subjectsResult = await db
      .select({ subjectName: attendanceSessionLedger.subjectName })
      .from(attendanceSessionLedger)
      .leftJoin(
        studentEnrollmentHistory,
        and(
          eq(studentEnrollmentHistory.studentId, payload.userId),
          eq(studentEnrollmentHistory.divisionId, attendanceSessionLedger.divisionId),
          eq(studentEnrollmentHistory.semesterId, attendanceSessionLedger.semesterId)
        )
      )
      .where(
        and(
          sql`(${studentEnrollmentHistory.id} is not null or ${payload.divisionId} = ${attendanceSessionLedger.divisionId})`
        )
      )
      .groupBy(attendanceSessionLedger.subjectName);

    const subjects = subjectsResult.map((s) => s.subjectName).filter(Boolean);

    // Calculate summary statistics
    const totalPresent = records.filter((r) => r.status === "present").length;
    const totalAbsent = records.filter((r) => r.status === "absent").length;
    const total = records.length;
    const percentage = total > 0 ? Math.round((totalPresent / total) * 100) : 0;

    return ok({
      records,
      subjects,
      summary: { total, present: totalPresent, absent: totalAbsent, percentage },
    });
  } catch (error) {
    console.error("[GET /api/attendance/my]", error);
    return err("Internal server error", 500);
  }
}
