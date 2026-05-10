import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import {
  attendance,
  attendanceSessions,
  students,
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
 * Student self-view: fetch own attendance records.
 * Query params:
 *   - dateFrom (YYYY-MM-DD, optional)
 *   - dateTo (YYYY-MM-DD, optional)
 *   - subject (subject name filter, optional)
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return err("Unauthorized", 401);

    const payload = await verifyToken(token);
    if (!payload) return err("Unauthorized: invalid session", 401);

    const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];
    if (!rolesArray.includes("student")) {
      return err("Forbidden: student role required", 403);
    }

    const dateFrom = req.nextUrl.searchParams.get("dateFrom");
    const dateTo = req.nextUrl.searchParams.get("dateTo");
    const subjectFilter = req.nextUrl.searchParams.get("subject");

    // Build conditions
    const conditions = [eq(attendance.studentId, payload.userId)];

    if (dateFrom) {
      conditions.push(gte(attendanceSessions.date, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(attendanceSessions.date, dateTo));
    }
    if (subjectFilter) {
      conditions.push(eq(attendanceSessions.subjectName, subjectFilter));
    }

    const records = await db
      .select({
        id: attendance.id,
        status: attendance.status,
        date: attendanceSessions.date,
        subjectName: attendanceSessions.subjectName,
        facultyName: attendanceSessions.facultyName,
        startTime: attendanceSessions.startTime,
        endTime: attendanceSessions.endTime,
      })
      .from(attendance)
      .innerJoin(
        attendanceSessions,
        eq(attendanceSessions.id, attendance.attendanceSessionId)
      )
      .where(and(...conditions))
      .orderBy(sql`${attendanceSessions.date} DESC, ${attendanceSessions.startTime} ASC`);

    // Get unique subjects for filter dropdown
    const subjectsResult = await db
      .select({ subjectName: attendanceSessions.subjectName })
      .from(attendance)
      .innerJoin(
        attendanceSessions,
        eq(attendanceSessions.id, attendance.attendanceSessionId)
      )
      .where(eq(attendance.studentId, payload.userId))
      .groupBy(attendanceSessions.subjectName);

    const subjects = subjectsResult.map((s) => s.subjectName);

    // Summary stats
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
