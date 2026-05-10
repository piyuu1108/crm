import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import {
  attendance,
  attendanceSessions,
  facultySubjectAssignments,
  timetableEntries,
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

/**
 * POST /api/attendance/save
 *
 * Batch upsert attendance records for a session.
 * Body: { sessionId, records: [{ studentId, status }] }
 *
 * Uses ON CONFLICT for upsert — sends only changed records (diff-based from client).
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return err("Unauthorized", 401);

    const payload = await verifyToken(token);
    if (!payload) return err("Unauthorized: invalid session", 401);

    const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];
    const activeRole =
      req.headers.get("X-Active-Role") ?? null;
    const ROLE_PRIORITY = ["hod", "counselor", "faculty"];
    const resolvedRole =
      activeRole && rolesArray.includes(activeRole)
        ? activeRole
        : ROLE_PRIORITY.find((r) => rolesArray.includes(r)) ?? rolesArray[0];

    if (!["faculty", "counselor", "hod"].includes(resolvedRole)) {
      return err("Forbidden", 403);
    }

    const body = await req.json();
    const { sessionId, records } = body;

    if (!sessionId || !Array.isArray(records) || records.length === 0) {
      return err("sessionId and non-empty records array are required", 400);
    }

    // Validate each record
    for (const r of records) {
      if (!r.studentId || !["present", "absent"].includes(r.status)) {
        return err("Each record must have studentId and status (present|absent)", 400);
      }
    }

    // Fetch session to validate ownership
    const [session] = await db
      .select({
        id: attendanceSessions.id,
        timetableId: attendanceSessions.timetableId,
        divisionId: attendanceSessions.divisionId,
      })
      .from(attendanceSessions)
      .where(eq(attendanceSessions.id, sessionId))
      .limit(1);

    if (!session) return err("Session not found", 404);

    // RBAC checks
    if (resolvedRole === "faculty") {
      if (!session.timetableId) {
        return err("Forbidden: session is not linked to a timetable entry", 403);
      }
      // Faculty must own the timetable entry's assignment
      const [entry] = await db
        .select({ assignmentId: timetableEntries.assignmentId })
        .from(timetableEntries)
        .where(eq(timetableEntries.id, session.timetableId))
        .limit(1);

      if (entry) {
        const [assignment] = await db
          .select({ facultyId: facultySubjectAssignments.facultyId })
          .from(facultySubjectAssignments)
          .where(eq(facultySubjectAssignments.id, entry.assignmentId))
          .limit(1);

        if (!assignment || assignment.facultyId !== payload.userId) {
          return err("Forbidden: not assigned to this subject", 403);
        }
      } else {
        return err("Forbidden: timetable entry not found", 403);
      }
    }

    if (resolvedRole === "counselor") {
      const counselorAssignments = await db
        .select({ divisionId: counselorDivisionAssignments.divisionId })
        .from(counselorDivisionAssignments)
        .where(eq(counselorDivisionAssignments.facultyId, payload.userId));

      if (!counselorAssignments.some((a) => a.divisionId === session.divisionId)) {
        return err("Forbidden: not assigned to this division", 403);
      }
    }

    // HOD bypasses — no extra check needed

    // Batch upsert using raw SQL for ON CONFLICT
    const values = records.map(
      (r: { studentId: number; status: string }) =>
        sql`(${sessionId}, ${r.studentId}, ${r.status})`
    );

    await db.execute(sql`
      INSERT INTO attendance (attendance_session_id, student_id, status)
      VALUES ${sql.join(values, sql`, `)}
      ON CONFLICT (attendance_session_id, student_id)
      DO UPDATE SET status = EXCLUDED.status
    `);

    // Update the markedByFacultyId on the session
    await db
      .update(attendanceSessions)
      .set({ markedByFacultyId: payload.userId })
      .where(eq(attendanceSessions.id, sessionId));

    return ok({ saved: records.length });
  } catch (error) {
    console.error("[POST /api/attendance/save]", error);
    return err("Internal server error", 500);
  }
}
